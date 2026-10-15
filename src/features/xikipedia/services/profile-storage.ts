// ── Profile persistence ──────────────────────────────────────────────────────
// Mobile port of the web module's profile-storage. Same versioned, per-corpus
// key; AsyncStorage instead of localStorage, so every call is async.

import { StorageService } from '@shared/services/storage/asyncStorage';
import type { FeedProfile } from './feed-engine';
import type { CorpusSource } from './corpus';

const PROFILE_VERSION = 1;

// Per-corpus storage so the CS/math feed's engagement learning doesn't
// pollute the default Simple Wikipedia feed (different feature spaces).
function keyFor(source: CorpusSource): string {
  return `xikipedia.profile.${source}.v${PROFILE_VERSION}`;
}

export async function loadProfile(
  source: CorpusSource = 'default',
): Promise<FeedProfile | undefined> {
  try {
    const parsed = await StorageService.getItem<FeedProfile>(keyFor(source));
    // Minimal shape guard — anything off and we start fresh.
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.featureScores === 'object' &&
      typeof parsed.seenTimes === 'object'
    ) {
      return {
        featureScores: parsed.featureScores ?? {},
        seenTimes: parsed.seenTimes ?? {},
        postsSinceLastLike: parsed.postsSinceLastLike ?? 0,
      };
    }
  } catch {
    // Corrupt blob — fall through to a fresh profile.
  }
  return undefined;
}

export async function saveProfile(
  profile: FeedProfile,
  source: CorpusSource = 'default',
): Promise<void> {
  try {
    await StorageService.setItem(keyFor(source), profile);
  } catch {
    // Non-fatal: the feed still works in-memory.
  }
}

export async function clearProfile(source: CorpusSource = 'default'): Promise<void> {
  await StorageService.removeItem(keyFor(source));
}
