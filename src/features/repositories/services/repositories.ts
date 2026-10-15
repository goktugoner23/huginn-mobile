/**
 * Repositories module — mirrors huginn-webapp/src/modules/v1.0/repositories.
 *
 * The web build reaches huginn-external through its /api/backend proxy
 * (`/api/backend/api/repositories/...`). Mobile talks to huginn-external
 * directly, so the same routes live under /api/repositories here.
 */

import { api } from '@shared/services/api/httpClient';

export interface ForgeRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stars_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
  private: boolean;
  owner: { login: string; avatar_url: string };
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
  private: boolean;
  owner: { login: string; avatar_url: string };
}

export interface RepoCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; email: string; date: string };
  };
  html_url: string;
  author: { login: string; avatar_url: string } | null;
}

/** Forge and GitHub commits are structurally identical on the wire. */
export type ForgeCommit = RepoCommit;
export type GitHubCommit = RepoCommit;

const repoGet = <T>(path: string) => api.get<T>(`/api/repositories${path}`);

export const getForgeRepos = () => repoGet<ForgeRepo[]>('/forge/repos');
export const getGitHubRepos = () => repoGet<GitHubRepo[]>('/github/repos');

export const getForgeCommits = (owner: string, repo: string) =>
  repoGet<RepoCommit[]>(`/forge/repos/${owner}/${repo}/commits`);
export const getGitHubCommits = (owner: string, repo: string) =>
  repoGet<RepoCommit[]>(`/github/repos/${owner}/${repo}/commits`);

export const getForgeReadme = (owner: string, repo: string) =>
  repoGet<string | null>(`/forge/repos/${owner}/${repo}/readme`);
export const getGitHubReadme = (owner: string, repo: string) =>
  repoGet<string | null>(`/github/repos/${owner}/${repo}/readme`);

export const getForgeChangelog = (owner: string, repo: string) =>
  repoGet<string | null>(`/forge/repos/${owner}/${repo}/changelog`);
export const getGitHubChangelog = (owner: string, repo: string) =>
  repoGet<string | null>(`/github/repos/${owner}/${repo}/changelog`);

export const getForgeLanguages = (owner: string, repo: string) =>
  repoGet<Record<string, number>>(`/forge/repos/${owner}/${repo}/languages`);
export const getGitHubLanguages = (owner: string, repo: string) =>
  repoGet<Record<string, number>>(`/github/repos/${owner}/${repo}/languages`);

export interface RepoStats {
  commits?: number;
  languages?: Record<string, number>;
  [key: string]: unknown;
}

export function batchRepoStats(body: unknown) {
  return api.post<Record<string, RepoStats>>('/api/repositories/batch-stats', body);
}
