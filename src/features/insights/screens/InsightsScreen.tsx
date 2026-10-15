/**
 * Insights screen — mobile port of huginn-webapp's /insights pages.
 *
 * List of generated reports, then a detail view showing the narrative
 * (headline, deck, pull quote, sections) over the period's currency totals and
 * top categories. The web version is two routes (/insights and /insights/[id]);
 * on mobile that is one screen with a selected state, which is the same flow at
 * phone width.
 */

import React, { useCallback, useEffect, useState } from 'react';
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
import { listInsights, type InsightReport } from '../services/insights';

export function InsightsScreen() {
  const colors = useColors();
  const [reports, setReports] = useState<InsightReport[]>([]);
  const [selected, setSelected] = useState<InsightReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setReports(await listInsights({ limit: 50 }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load insights.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const styles = makeStyles(colors);

  if (selected) {
    const n = selected.narrative;
    const m = selected.metrics;
    return (
      <View style={styles.screen}>
        <View style={styles.head}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headTitle} numberOfLines={1}>
            {m?.period?.label ?? 'Report'}
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.headline}>{n?.headline}</Text>
          {n?.deck ? <Text style={styles.deck}>{n.deck}</Text> : null}

          {n?.pullQuote ? (
            <Card style={[styles.card, styles.quoteCard]}>
              <Text style={styles.quote}>{n.pullQuote}</Text>
            </Card>
          ) : null}

          {m?.byCurrency?.length ? (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Totals</Text>
              {m.byCurrency.map((c) => (
                <Text key={c.currency} style={styles.subtle}>
                  {c.currency}: income {c.income.toLocaleString()} · expense{' '}
                  {c.expense.toLocaleString()} · net {c.net.toLocaleString()} ({c.transactionCount} tx)
                </Text>
              ))}
            </Card>
          ) : null}

          {m?.topExpenseCategories?.length ? (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Top expenses</Text>
              {m.topExpenseCategories.slice(0, 6).map((c, i) => (
                <Text key={`${c.category}-${c.currency}-${i}`} style={styles.subtle}>
                  {c.category}: {c.total.toLocaleString()} {c.currency} ({c.pctOfExpense.toFixed(0)}%)
                </Text>
              ))}
            </Card>
          ) : null}

          {n?.sections?.map((s, i) => (
            <View key={`${s.title}-${i}`}>
              <Text style={styles.sectionTitle}>{s.title}</Text>
              <Text style={styles.body}>{s.body}</Text>
            </View>
          ))}

          {m?.notableTransactions?.length ? (
            <Card style={styles.card}>
              <Text style={styles.sectionTitle}>Notable</Text>
              {m.notableTransactions.map((t) => (
                <Text key={t.id} style={styles.subtle}>
                  {t.description} — {t.amount.toLocaleString()} {t.currency} ({t.category})
                </Text>
              ))}
            </Card>
          ) : null}

          <Text style={styles.meta}>
            {selected.modelUsed ? `${selected.modelUsed} · ` : ''}
            {new Date(selected.generatedAt).toLocaleString()}
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />
      }
    >
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!refreshing && reports.length === 0 && !error ? (
        <Text style={styles.subtle}>No insight reports yet.</Text>
      ) : null}
      {reports.map((r) => (
        <TouchableOpacity key={r.id} onPress={() => setSelected(r)}>
          <Card style={styles.card}>
            <View style={styles.rowHead}>
              <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
              <Text style={styles.rowTitle} numberOfLines={2}>
                {r.narrative?.headline ?? r.metrics?.period?.label ?? `Report #${r.id}`}
              </Text>
            </View>
            <Text style={styles.subtle} numberOfLines={2}>
              {r.narrative?.deck}
            </Text>
            <Text style={styles.meta}>
              {r.periodType} · {r.periodStart} to {r.periodEnd}
            </Text>
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    list: { padding: spacing[4], paddingBottom: spacing[8] },
    card: { padding: spacing[3], marginBottom: spacing[2] },
    quoteCard: { borderLeftWidth: 3, borderLeftColor: colors.primary },
    quote: { ...textStyles.body, color: colors.foreground, fontStyle: 'italic' },
    headline: { ...textStyles.h2, color: colors.foreground, marginBottom: spacing[1] },
    deck: { ...textStyles.bodySmall, color: colors.foregroundMuted, marginBottom: spacing[3] },
    rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
    rowTitle: { ...textStyles.label, color: colors.foreground, flex: 1 },
    sectionTitle: {
      ...textStyles.h4,
      color: colors.foreground,
      marginTop: spacing[3],
      marginBottom: spacing[1],
    },
    body: { ...textStyles.bodySmall, color: colors.foregroundMuted, marginBottom: spacing[2] },
    subtle: { ...textStyles.caption, color: colors.foregroundMuted },
    meta: { ...textStyles.caption, color: colors.foregroundSubtle, marginTop: spacing[1] },
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

export default InsightsScreen;
