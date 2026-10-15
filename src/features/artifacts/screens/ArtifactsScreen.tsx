/**
 * Artifacts screen — mobile port of huginn-webapp's /artifacts page.
 *
 * Same two states as the web page: a searchable, folder-filtered list of
 * artifact files, and a full-screen viewer for the selected one. The web page
 * uses an iframe; a WebView is the direct equivalent, since the artifact itself
 * is an HTML document either way.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useColors, spacing, radius, textStyles } from '@shared/theme';
import { Card } from '@shared/components/ui';
import {
  getArtifacts,
  getArtifactSession,
  buildArtifactViewUrl,
  type ArtifactFile,
} from '../services/artifacts';

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '--';
  const units = ['B', 'KB', 'MB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function ArtifactsScreen() {
  const colors = useColors();
  const [files, setFiles] = useState<ArtifactFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [folder, setFolder] = useState('');
  const [selected, setSelected] = useState<ArtifactFile | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);

  const loadFiles = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      setFiles(await getArtifacts(refresh));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load artifacts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  // A fresh session token per opened artifact, same as the web viewer.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setViewerUrl(null);
    setViewerError(null);
    (async () => {
      try {
        const { token } = await getArtifactSession();
        if (!cancelled) setViewerUrl(buildArtifactViewUrl(token, selected.path));
      } catch (e) {
        if (!cancelled) setViewerError(e instanceof Error ? e.message : 'Unable to open artifact.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const folders = useMemo(
    () => Array.from(new Set(files.map((f) => f.folder).filter(Boolean))).sort(),
    [files],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return files.filter(
      (f) =>
        (!folder || f.folder === folder) &&
        (!q || f.title.toLowerCase().includes(q) || f.fileName.toLowerCase().includes(q)),
    );
  }, [files, query, folder]);

  const styles = makeStyles(colors);

  if (selected) {
    return (
      <View style={styles.screen}>
        <View style={styles.viewerHead}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.viewerTitle} numberOfLines={1}>
            {selected.title || selected.fileName}
          </Text>
        </View>
        {viewerError ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{viewerError}</Text>
          </View>
        ) : viewerUrl ? (
          <WebView source={{ uri: viewerUrl }} style={styles.webview} />
        ) : (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={colors.foregroundMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search artifacts"
          placeholderTextColor={colors.foregroundSubtle}
          style={styles.searchInput}
        />
        <TouchableOpacity onPress={() => loadFiles(true)}>
          <Ionicons name="refresh" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {folders.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          <TouchableOpacity
            onPress={() => setFolder('')}
            style={[styles.chip, !folder && styles.chipActive]}
          >
            <Text style={[styles.chipText, !folder && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {folders.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFolder(f === folder ? '' : f)}
              style={[styles.chip, folder === f && styles.chipActive]}
            >
              <Text style={[styles.chipText, folder === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadFiles} tintColor={colors.primary} />
        }
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!loading && visible.length === 0 && !error ? (
          <Text style={styles.subtle}>No artifacts found.</Text>
        ) : null}
        {visible.map((f) => (
          <TouchableOpacity key={f.path} onPress={() => setSelected(f)}>
            <Card style={styles.row}>
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {f.title || f.fileName}
                </Text>
                <Text style={styles.subtle} numberOfLines={1}>
                  {f.folder ? `${f.folder} · ` : ''}
                  {formatSize(f.size)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.foregroundSubtle} />
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
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      margin: spacing[4],
      paddingHorizontal: spacing[3],
      height: 42,
      borderRadius: radius.base,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    searchInput: { flex: 1, color: colors.foreground, padding: 0 },
    chipRow: { paddingHorizontal: spacing[4], maxHeight: 40 },
    chip: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginRight: spacing[2],
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { ...textStyles.caption, color: colors.foregroundMuted },
    chipTextActive: { color: colors.primaryForeground },
    list: { padding: spacing[4], paddingBottom: spacing[8] },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], padding: spacing[3], marginBottom: spacing[2] },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: { ...textStyles.label, color: colors.foreground },
    subtle: { ...textStyles.caption, color: colors.foregroundMuted },
    errorText: { ...textStyles.caption, color: '#ef4444', marginBottom: spacing[2] },
    viewerHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      padding: spacing[3],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: spacing[1] },
    viewerTitle: { ...textStyles.label, color: colors.foreground, flex: 1 },
    webview: { flex: 1, backgroundColor: colors.background },
  });

export default ArtifactsScreen;
