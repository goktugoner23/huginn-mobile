// ── Xikipedia corpus + feed types ────────────────────────────────────────────
// The corpus ships as tuple arrays to keep the ~120MB JSON small. We parse the
// raw tuples into named `Post` objects once on load. See `corpus.ts`.

/** A raw page tuple straight off the wire. Order is load-bearing. */
export type RawPage = [
  title: string,
  id: number,
  text: string,
  thumb: string | null,
  categories: string[],
  links: number[],
];

/** The full corpus payload returned by the signed data URL. */
export interface RawCorpus {
  pages: RawPage[];
  /** Excluded page id (as string key) -> title, for resolving link targets. */
  noPageMaps: Record<string, string>;
  /** Lowercased category -> its sub-category names. */
  subCategories: Record<string, string[]>;
}

/** A parsed page used everywhere in the feed. */
export interface Post {
  title: string;
  id: number;
  /** ≤300char snippet. */
  text: string;
  /** Commons filename, or null. */
  thumb: string | null;
  categories: string[];
  /** Linked page ids (resolve to titles via the id->title index). */
  links: number[];
}

/** Parsed corpus: posts + the id->title index built from pages ∪ noPageMaps. */
export interface Corpus {
  posts: Post[];
  /** id -> Post, for fast lookup of feed candidates. */
  byId: Map<number, Post>;
  /** id -> title, covering both real pages and excluded (noPageMaps) pages. */
  titleById: Map<number, string>;
}

/** The action a user took on a post, used to score its features. */
export type EngagementAction = "scroll" | "like" | "clickArticle" | "clickImage";
