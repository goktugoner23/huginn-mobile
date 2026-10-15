/**
 * Corpus loading for mobile.
 *
 * The web client fetches the 36MB brotli blob straight from R2 and lets the
 * browser inflate it (~120MB of JSON). React Native's fetch does not decode
 * `Content-Encoding: br`, so mobile reads a second artifact that
 * huginn-external publishes for exactly this: a gzipped random sample of pages
 * plus an id->title index covering the WHOLE original corpus.
 *
 * Scoring is therefore identical to web — only the pool of pages the feed can
 * draw from is smaller. Parsing and the feed engine itself are shared code.
 */

import { api } from '@shared/services/api/httpClient';
import type { Corpus, Post, RawPage } from '../types';

/** Tuple positions — kept explicit so a schema change is a one-line fix. */
const TITLE = 0;
const ID = 1;
const TEXT = 2;
const THUMB = 3;
const CATEGORIES = 4;
const LINKS = 5;

/** Which corpus to fetch. Must match the backend's `?corpus=` param values. */
export type CorpusSource = 'default' | 'cs';

/** Shape of the mobile artifact built by /api/xikipedia/build-mobile. */
interface MobileCorpusPayload {
  pages: RawPage[];
  /** id (as string) -> title, for every page in the original corpus. */
  titleById: Record<string, string>;
  subCategories: Record<string, string[]>;
}

function parsePage(raw: RawPage): Post {
  return {
    title: raw[TITLE],
    id: raw[ID],
    text: raw[TEXT],
    thumb: raw[THUMB],
    categories: raw[CATEGORIES] ?? [],
    links: raw[LINKS] ?? [],
  };
}

export function parseMobileCorpus(raw: MobileCorpusPayload): Corpus {
  const posts: Post[] = new Array(raw.pages.length);
  const byId = new Map<number, Post>();
  const titleById = new Map<number, string>();

  for (let i = 0; i < raw.pages.length; i++) {
    const post = parsePage(raw.pages[i]!);
    posts[i] = post;
    byId.set(post.id, post);
  }
  for (const [idStr, title] of Object.entries(raw.titleById)) {
    titleById.set(Number(idStr), title);
  }

  return { posts, byId, titleById };
}

/**
 * Fetch + parse the mobile corpus. The signed URL points at a gzipped object;
 * RN's fetch inflates gzip transparently, so `.json()` is enough.
 */
export async function loadCorpus(source: CorpusSource = 'default'): Promise<Corpus> {
  const { url } = await api.get<{ url: string; corpus: string }>('/api/xikipedia/mobile-url', {
    searchParams: { corpus: source },
  });

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Corpus download failed: ${res.status} ${res.statusText}`);
  }
  return parseMobileCorpus((await res.json()) as MobileCorpusPayload);
}
