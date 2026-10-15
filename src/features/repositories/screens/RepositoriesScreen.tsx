/**
 * Repositories screen — mobile port of huginn-webapp's /repositories page.
 *
 * Two sources (Forge and GitHub) behind a toggle, a repo list, and a detail
 * view with commits, README and language breakdown. Forge and GitHub return
 * slightly different repo shapes (stars_count vs stargazers_count), so the list
 * normalises both into one row model instead of branching in the markup.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useColors, spacing, radius, textStyles } from '@shared/theme';
import { Card } from '@shared/components/ui';
import {
  getForgeRepos,
  getGitHubRepos,
  getForgeCommits,
  getGitHubCommits,
  getForgeReadme,
  getGitHubReadme,
  getForgeLanguages,
  getGitHubLanguages,
  type RepoCommit,
} from '../services/repositories';

type Source = 'forge' | 'github';

/** One row model for both sources — the wire shapes differ only in field names. */
interface RepoRow {
  id: number;
  name: string;
  owner: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  updatedAt: string;
  private: boolean;
}

export function RepositoriesScreen() {
  const colors = useColors();
  const [source, setSource] = useState<Source>('forge');
  const [repos, setRepos] = useState<RepoRow[]>([]);
  const [selected, setSelected] = useState<RepoRow | null>(null);
  const [commits, setCommits] = useState<RepoCommit[]>([]);
  const [readme, setReadme] = useState<string | null>(null);
  const [languages, setLanguages] = useState<Record<string, number>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      if (source === 'forge') {
        const list = await getForgeRepos();
        setRepos(
          list.map((r) => ({
            id: r.id,
            name: r.name,
            owner: r.owner?.login ?? r.full_name.split('/')[0] ?? '',
            description: r.description,
            language: r.language,
            stars: r.stars_count,
            forks: r.forks_count,
            updatedAt: r.updated_at,
            private: r.private,
          })),
        );
      } else {
        const list = await getGitHubRepos();
        setRepos(
          list.map((r) => ({
            id: r.id,
            name: r.name,
            owner: r.owner?.login ?? r.full_name.split('/')[0] ?? '',
            description: r.description,
            language: r.language,
            stars: r.stargazers_count,
            forks: r.forks_count,
            updatedAt: r.updated_at,
            private: r.private,
          })),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load repositories.');
    } finally {
      setRefreshing(false);
    }
  }, [source]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setDetailLoading(true);
    setCommits([]);
    setReadme(null);
    setLanguages({});
    const { owner, name } = selected;
    const fns =
      source === 'forge'
        ? [getForgeCommits, getForgeReadme, getForgeLanguages]
        : [getGitHubCommits, getGitHubReadme, getGitHubLanguages];
    (async () => {
      // Settled, not all: a missing README must not blank the commits list.
      const [c, r, l] = await Promise.allSettled([
        (fns[0] as typeof getForgeCommits)(owner, name),
        (fns[1] as typeof getForgeReadme)(owner, name),
        (fns[2] as typeof getForgeLanguages)(owner, name),
      ]);
      if (cancelled) return;
      if (c.status === 'fulfilled') setCommits(c.value);
      if (r.status === 'fulfilled') setReadme(r.value);
      if (l.status === 'fulfilled') setLanguages(l.value ?? {});
      setDetailLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, source]);

  const langTotal = useMemo(
    () => Object.values(languages).reduce((a, b) => a + b, 0),
    [languages],
  );

  const styles = makeStyles(colors);

  if (selected) {
    return (
      <View style={styles.screen}>
        <View style={styles.head}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headTitle} numberOfLines={1}>
            {selected.owner}/{selected.name}
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          {detailLoading ? <ActivityIndicator color={colors.primary} /> : null}

          {langTotal > 0 ? (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Languages</Text>
              {Object.entries(languages)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([lang, bytes]) => (
                  <Text key={lang} style={styles.subtle}>
                    {lang} · {((bytes / langTotal) * 100).toFixed(1)}%
                  </Text>
                ))}
            </Card>
          ) : null}

          <Text style={styles.sectionTitle}>Commits</Text>
          {commits.map((c) => (
            <Card key={c.sha} style={styles.card}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {c.commit.message.split('\n')[0]}
              </Text>
              <Text style={styles.subtle}>
                {c.commit.author.name} · {new Date(c.commit.author.date).toLocaleDateString()} ·{' '}
                {c.sha.slice(0, 7)}
              </Text>
            </Card>
          ))}

          {readme ? (
            <>
              <Text style={styles.sectionTitle}>README</Text>
              <Card style={styles.card}>
                <Text style={styles.readme}>{readme}</Text>
              </Card>
            </>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        {(['forge', 'github'] as Source[]).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setSource(s)}
            style={[styles.chip, source === s && styles.chipActive]}
          >
            <Text style={[styles.chipText, source === s && styles.chipTextActive]}>
              {s === 'forge' ? 'Forge' : 'GitHub'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />
        }
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {repos.map((r) => (
          <TouchableOpacity key={`${r.owner}/${r.id}`} onPress={() => setSelected(r)}>
            <Card style={styles.card}>
              <View style={styles.rowHead}>
                <Ionicons
                  name={r.private ? 'lock-closed-outline' : 'git-branch-outline'}
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {r.name}
                </Text>
              </View>
              {r.description ? (
                <Text style={styles.subtle} numberOfLines={2}>
                  {r.description}
                </Text>
              ) : null}
              <Text style={styles.meta}>
                {r.language ?? 'n/a'} · {r.stars} stars · {r.forks} forks ·{' '}
                {new Date(r.updatedAt).toLocaleDateString()}
              </Text>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    toolbar: { flexDirection: 'row', gap: spacing[2], padding: spacing[4], paddingBottom: 0 },
    chip: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { ...textStyles.caption, color: colors.foregroundMuted },
    chipTextActive: { color: colors.primaryForeground },
    list: { padding: spacing[4], paddingBottom: spacing[8] },
    card: { padding: spacing[3], marginBottom: spacing[2] },
    rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
    rowTitle: { ...textStyles.label, color: colors.foreground, flex: 1 },
    subtle: { ...textStyles.caption, color: colors.foregroundMuted },
    meta: { ...textStyles.caption, color: colors.foregroundSubtle, marginTop: spacing[1] },
    sectionTitle: {
      ...textStyles.h4,
      color: colors.foreground,
      marginTop: spacing[3],
      marginBottom: spacing[2],
    },
    readme: { ...textStyles.caption, color: colors.foregroundMuted, fontFamily: 'Menlo', fontSize: 10 },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      padding: spacing[3],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: spacing[1] },
    headTitle: { ...textStyles.label, color: colors.foreground, flex: 1 },
    errorText: { ...textStyles.caption, color: '#ef4444', marginBottom: spacing[2] },
  });

export default RepositoriesScreen;
