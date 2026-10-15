/**
 * Artifacts module — mirrors huginn-webapp/src/modules/v1.0/artifacts.
 *
 * The list comes from huginn-external. Viewing one is inherently HTML, so the
 * screen renders it in a WebView pointed at the same signed view URL the web
 * page puts in its iframe. The web build reaches it through its /api/backend
 * proxy; mobile talks to huginn-external directly, so the path here is the
 * un-proxied one.
 */

import { api, API_BASE_URL } from '@shared/services/api/httpClient';

export interface ArtifactFile {
  path: string;
  fileName: string;
  title: string;
  folder: string;
  size: number;
}

export function getArtifacts(refresh = false) {
  return api.get<ArtifactFile[]>('/api/artifacts/', {
    searchParams: refresh ? { refresh: true } : undefined,
  });
}

export function getArtifactSession() {
  return api.get<{ token: string }>('/api/artifacts/session');
}

/** Signed URL for the WebView. Each path segment is encoded separately so
 *  folder separators survive. */
export function buildArtifactViewUrl(token: string, path: string): string {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `${API_BASE_URL}/api/artifacts/view/${token}/${encoded}`;
}
