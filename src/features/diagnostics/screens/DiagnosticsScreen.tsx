/**
 * Diagnostics screen — mobile port of huginn-webapp's /diagnostics page.
 *
 * Error log with level/service filters, expandable stack traces, and the same
 * destructive "clear" action the web page has. Clearing asks for confirmation
 * first: it deletes rows from error_log and there is no undo.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useColors, spacing, radius, textStyles } from '@shared/theme';
import { Card } from '@shared/components/ui';
import { listErrors, clearErrors, type ErrorLogEntry } from '../services/diagnostics';

const LEVELS = ['error', 'warn', 'fatal'] as const;

const LEVEL_COLOR: Record<string, string> = {
  error: '#ef4444',
  fatal: '#b91c1c',
  warn: '#f59e0b',
};

export function DiagnosticsScreen() {
  const colors = useColors();
  const [entries, setEntries] = useState<ErrorLogEntry[]>([]);
  const [level, setLevel] = useState<string>('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setEntries(await listErrors({ limit: 200, level: level || undefined }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load errors.');
    } finally {
      setRefreshing(false);
    }
  }, [level]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmClear = () => {
    Alert.alert(
      'Clear error log?',
      'This permanently deletes error_log rows. There is no undo.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const { deleted } = await clearErrors();
              Alert.alert('Cleared', `${deleted} entries deleted.`);
              void load();
            } catch (e) {
              Alert.alert('Failed', e instanceof Error ? e.message : 'Could not clear.');
            }
          },
        },
      ],
    );
  };

  // Counts per service, same summary the web page shows above the list.
  const services = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) counts.set(e.service, (counts.get(e.service) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const styles = makeStyles(colors);

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => setLevel('')}
            style={[styles.chip, !level && styles.chipActive]}
          >
            <Text style={[styles.chipText, !level && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {LEVELS.map((l) => (
            <TouchableOpacity
              key={l}
              onPress={() => setLevel(l === level ? '' : l)}
              style={[styles.chip, level === l && styles.chipActive]}
            >
              <Text style={[styles.chipText, level === l && styles.chipTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity onPress={confirmClear} style={styles.clearBtn}>
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />
        }
      >
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {services.length > 0 ? (
          <Text style={styles.summary}>
            {entries.length} entries ·{' '}
            {services.map(([s, n]) => `${s} ${n}`).join('  ·  ')}
          </Text>
        ) : null}

        {entries.length === 0 && !refreshing ? (
          <Text style={styles.subtle}>No errors logged.</Text>
        ) : null}

        {entries.map((e) => {
          const open = expanded === e.id;
          return (
            <TouchableOpacity key={e.id} onPress={() => setExpanded(open ? null : e.id)}>
              <Card style={styles.row}>
                <View style={styles.rowHead}>
                  <View
                    style={[
                      styles.levelPill,
                      { backgroundColor: `${LEVEL_COLOR[e.level] ?? colors.foregroundSubtle}22` },
                    ]}
                  >
                    <Text style={[styles.levelText, { color: LEVEL_COLOR[e.level] ?? colors.foregroundMuted }]}>
                      {e.level}
                    </Text>
                  </View>
                  <Text style={styles.service} numberOfLines={1}>
                    {e.service}
                    {e.source ? ` · ${e.source}` : ''}
                  </Text>
                  <Text style={styles.time}>{new Date(e.created_at).toLocaleString()}</Text>
                </View>
                <Text style={styles.message} numberOfLines={open ? undefined : 2}>
                  {e.message}
                </Text>
                {open && e.stack ? <Text style={styles.stack}>{e.stack}</Text> : null}
                {open && e.context ? (
                  <Text style={styles.stack}>{JSON.stringify(e.context, null, 2)}</Text>
                ) : null}
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      paddingHorizontal: spacing[4],
      paddingTop: spacing[3],
    },
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
    clearBtn: { padding: spacing[1] },
    list: { padding: spacing[4], paddingBottom: spacing[8] },
    summary: { ...textStyles.caption, color: colors.foregroundMuted, marginBottom: spacing[2] },
    row: { padding: spacing[3], marginBottom: spacing[2] },
    rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
    levelPill: { paddingHorizontal: spacing[2], paddingVertical: 1, borderRadius: radius.full },
    levelText: { ...textStyles.caption, fontWeight: '700' },
    service: { ...textStyles.caption, color: colors.foregroundMuted, flex: 1 },
    time: { ...textStyles.caption, color: colors.foregroundSubtle },
    message: { ...textStyles.bodySmall, color: colors.foreground, marginTop: spacing[1] },
    stack: {
      ...textStyles.caption,
      color: colors.foregroundMuted,
      fontFamily: 'Menlo',
      fontSize: 10,
      marginTop: spacing[2],
    },
    subtle: { ...textStyles.caption, color: colors.foregroundMuted },
    errorText: { ...textStyles.caption, color: '#ef4444', marginBottom: spacing[2] },
  });

export default DiagnosticsScreen;
