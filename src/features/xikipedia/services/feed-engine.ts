// ── Feed engine ──────────────────────────────────────────────────────────────
// Pure, dependency-free engagement-learning algorithm for the Xikipedia feed.
// No localStorage / fetch in here — persistence + corpus loading live elsewhere.
// This is unit-tested in feed-engine.test.ts.

import type { Corpus, Post } from "../types";

// ── Tunable constants (from the spec) ────────────────────────────────────────
export const SCROLL_SCORE = -5;
export const LIKE_BASE = 50;
export const LIKE_PER_POST = 4; // * postsSinceLastLike
export const CLICK_ARTICLE_SCORE = 75;
export const CLICK_IMAGE_SCORE = 100;

export const THUMB_BONUS = 5; // per-post base bonus when a thumb exists
export const SEEN_PENALTY = -5000; // multiplied by (3^seenTimes - 1)

/** Features that start heavily down-weighted so name-y pages don't dominate. */
export const SEED_FEATURES: Readonly<Record<string, number>> = {
  "given names": -1000,
  surnames: -1000,
};

const CANDIDATE_SAMPLE = 10_000;

// Next-post strategy split. Must sum to 1.
const P_WEIGHTED = 0.4;
const P_HIGHEST = 0.42;
// remaining 0.18 -> pure random

/**
 * Serializable engine state. Persisted to localStorage by the caller.
 * - featureScores: feature name -> accumulated point score.
 * - seenTimes: post id -> number of times it has been shown.
 * - postsSinceLastLike: counter feeding the escalating like reward.
 */
export interface FeedProfile {
  featureScores: Record<string, number>;
  seenTimes: Record<number, number>;
  postsSinceLastLike: number;
}

export function emptyProfile(): FeedProfile {
  return { featureScores: {}, seenTimes: {}, postsSinceLastLike: 0 };
}

/** Pluggable RNG so tests are deterministic. Defaults to Math.random. */
export type Rng = () => number;

export class FeedEngine {
  private readonly corpus: Corpus;
  private readonly rng: Rng;

  /** feature name -> current point score. */
  private readonly featureScores: Map<string, number>;
  /** post id -> times shown. */
  private readonly seenTimes: Map<number, number>;
  private postsSinceLastLike: number;

  constructor(corpus: Corpus, profile?: FeedProfile, rng: Rng = Math.random) {
    this.corpus = corpus;
    this.rng = rng;
    const p = profile ?? emptyProfile();
    this.featureScores = new Map(Object.entries(p.featureScores));
    this.seenTimes = new Map(
      Object.entries(p.seenTimes).map(([id, n]) => [Number(id), n]),
    );
    this.postsSinceLastLike = p.postsSinceLastLike;
  }

  /** The corpus this engine reads from (read-only access for callers). */
  get sourceCorpus(): Corpus {
    return this.corpus;
  }

  // ── Feature derivation ─────────────────────────────────────────────────────
  // A post's feature set = its categories ∪ the titles of its linked pages.
  featuresOf(post: Post): string[] {
    const set = new Set<string>(post.categories);
    for (const linkId of post.links) {
      const title = this.corpus.titleById.get(linkId);
      if (title) set.add(title);
    }
    return [...set];
  }

  /** Current score of a single feature, applying the seed default lazily. */
  featureScore(feature: string): number {
    const existing = this.featureScores.get(feature);
    if (existing !== undefined) return existing;
    return SEED_FEATURES[feature] ?? 0;
  }

  // ── Engagement ─────────────────────────────────────────────────────────────
  /** Add `actionScore` to every feature of the post. */
  engagePost(post: Post, actionScore: number): void {
    for (const feature of this.featuresOf(post)) {
      this.featureScores.set(feature, this.featureScore(feature) + actionScore);
    }
  }

  /** Like reward escalates with how long it's been since the last like. */
  likeScore(): number {
    return LIKE_BASE + LIKE_PER_POST * this.postsSinceLastLike;
  }

  /** Apply a like: score the post, then reset the since-last-like counter. */
  like(post: Post): number {
    const score = this.likeScore();
    this.engagePost(post, score);
    this.postsSinceLastLike = 0;
    return score;
  }

  // ── Scoring ────────────────────────────────────────────────────────────────
  /** Per-post base: 0; +THUMB_BONUS if it has a thumb; minus the seen penalty. */
  baseScore(post: Post): number {
    let base = 0;
    if (post.thumb) base += THUMB_BONUS;
    const seen = this.seenTimes.get(post.id) ?? 0;
    if (seen > 0) base += (3 ** seen - 1) * SEEN_PENALTY;
    return base;
  }

  /** Total = base + sum of the post's current feature scores. */
  totalScore(post: Post): number {
    let total = this.baseScore(post);
    for (const feature of this.featuresOf(post)) {
      total += this.featureScore(feature);
    }
    return total;
  }

  // ── Next-post selection ─────────────────────────────────────────────────────
  /**
   * Sample up to CANDIDATE_SAMPLE random posts, score only those, and pick one
   * via one of three strategies (40% weighted / 42% highest / 18% pure random).
   * Marks the chosen post as seen (increments seenTimes) and bumps the
   * since-last-like counter.
   */
  nextPost(): Post | null {
    const { posts } = this.corpus;
    if (posts.length === 0) return null;

    const candidates = this.sampleCandidates();
    const scored = candidates.map((post) => ({
      post,
      score: this.totalScore(post),
    }));

    const roll = this.rng();
    let chosen: Post;
    if (roll < P_WEIGHTED) {
      chosen = this.weightedPick(scored);
    } else if (roll < P_WEIGHTED + P_HIGHEST) {
      chosen = this.highestPick(scored);
    } else {
      chosen = candidates[Math.floor(this.rng() * candidates.length)];
    }

    this.markSeen(chosen);
    this.postsSinceLastLike += 1;
    return chosen;
  }

  private sampleCandidates(): Post[] {
    const { posts } = this.corpus;
    if (posts.length <= CANDIDATE_SAMPLE) return posts.slice();
    // Sample with replacement — cheap, and duplicates are harmless for picking.
    const out: Post[] = new Array(CANDIDATE_SAMPLE);
    for (let i = 0; i < CANDIDATE_SAMPLE; i++) {
      out[i] = posts[Math.floor(this.rng() * posts.length)];
    }
    return out;
  }

  /** Shift all scores so min >= 0, then pick weighted by score. */
  private weightedPick(scored: { post: Post; score: number }[]): Post {
    let min = Infinity;
    for (const s of scored) if (s.score < min) min = s.score;
    const shift = min < 0 ? -min : 0;

    let total = 0;
    for (const s of scored) total += s.score + shift;

    // All-zero weights (e.g. every score identical & shifted to 0) -> uniform.
    if (total <= 0) {
      return scored[Math.floor(this.rng() * scored.length)].post;
    }

    let target = this.rng() * total;
    for (const s of scored) {
      target -= s.score + shift;
      if (target <= 0) return s.post;
    }
    return scored[scored.length - 1].post;
  }

  private highestPick(scored: { post: Post; score: number }[]): Post {
    let best = scored[0];
    for (const s of scored) if (s.score > best.score) best = s;
    return best.post;
  }

  private markSeen(post: Post): void {
    this.seenTimes.set(post.id, (this.seenTimes.get(post.id) ?? 0) + 1);
  }

  // ── Persistence ──────────────────────────────────────────────────────────────
  /** Snapshot the mutable state for localStorage. */
  toProfile(): FeedProfile {
    return {
      featureScores: Object.fromEntries(this.featureScores),
      seenTimes: Object.fromEntries(this.seenTimes),
      postsSinceLastLike: this.postsSinceLastLike,
    };
  }
}
