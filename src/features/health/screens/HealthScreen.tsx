/**
 * Health screen — mobile port of huginn-webapp's /health page.
 *
 * Shows the Apple Health data Health Auto Export pushes into vitals_samples:
 * the latest value of every metric, and a 30-day series for the selected one.
 * A person switcher appears only when more than one person sends data, same as
 * the web page. Counters (steps, energy) show the day total; levels (heart
 * rate, weight) show the average with min/max.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useColors, spacing, radius, textStyles } from '@shared/theme';
import { Card } from '@shared/components/ui';
import {
  listVitalsPersons,
  getVitalsSummary,
  getVitalsSeries,
  isCounter,
  type VitalsMetric,
  type VitalsDay,
} from '../services/health';

/** Metric keys are raw (HKQuantityTypeIdentifier-ish); make them readable. */
function prettyMetric(metric: string): string {
  return metric.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function metricValue(m: VitalsMetric): string {
  const v = isCounter(m.metric) && m.dayTotal ? m.dayTotal.total : m.qty;
  if (v === null || v === undefined) return '--';
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '--';
}

export function HealthScreen() {
  const colors = useColors();
  const [persons, setPersons] = useState<string[]>([]);
  const [person, setPerson] = useState<string>('');
  const [metrics, setMetrics] = useState<VitalsMetric[]>([]);
  const [lastReceivedAt, setLastReceivedAt] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [series, setSeries] = useState<VitalsDay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await listVitalsPersons();
        setPersons(list);
        if (list.length > 0) setPerson((p) => p || list[0]!);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load persons.');
      }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!person) return;
    setRefreshing(true);
    try {
      const summary = await getVitalsSummary(person);
      setMetrics(summary.metrics);
      setLastReceivedAt(summary.lastReceivedAt);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load vitals.');
    } finally {
      setRefreshing(false);
    }
  }, [person]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!person || !selected) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await getVitalsSeries(person, selected, 30);
        if (!cancelled) setSeries(rows);
      } catch {
        if (!cancelled) setSeries([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [person, selected]);

  const styles = makeStyles(colors);

  // Plain min/max bar row rather than a chart library — the web page draws a
  // 30-day chart; this keeps the same information without a new dependency.
  const maxVal = series.length
    ? Math.max(...series.map((d) => (isCounter(selected) ? d.sum : d.avg)))
    : 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />
      }
    >
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {persons.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {persons.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPerson(p)}
              style={[styles.chip, person === p && styles.chipActive]}
            >
              <Text style={[styles.chipText, person === p && styles.chipTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      {lastReceivedAt ? (
        <Text style={styles.subtle}>
          Last received {new Date(lastReceivedAt).toLocaleString()}
        </Text>
      ) : null}

      {metrics.length === 0 && !refreshing ? (
        <Text style={styles.subtle}>No vitals recorded.</Text>
      ) : null}

      <View style={styles.grid}>
        {metrics.map((m) => (
          <TouchableOpacity
            key={m.metric}
            style={styles.gridItem}
            onPress={() => setSelected(m.metric === selected ? '' : m.metric)}
          >
            <Card style={[styles.metricCard, selected === m.metric && styles.metricCardActive]}>
              <Text style={styles.metricValue} numberOfLines={1}>
                {metricValue(m)}
                {m.units ? <Text style={styles.units}> {m.units}</Text> : null}
              </Text>
              <Text style={styles.metricName} numberOfLines={2}>
                {prettyMetric(m.metric)}
              </Text>
            </Card>
          </TouchableOpacity>
        ))}
      </View>

      {selected && series.length > 0 ? (
        <Card style={styles.chartCard}>
          <View style={styles.chartHead}>
            <Ionicons name="stats-chart-outline" size={16} color={colors.primary} />
            <Text style={styles.chartTitle}>
              {prettyMetric(selected)} · last {series.length} days
            </Text>
          </View>
          {series.slice(-14).map((d) => {
            const v = isCounter(selected) ? d.sum : d.avg;
            const pct = maxVal > 0 ? Math.max(2, (v / maxVal) * 100) : 0;
            return (
              <View key={d.day} style={styles.barRow}>
                <Text style={styles.barDay}>{d.day.slice(5)}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.barVal}>
                  {Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </Text>
              </View>
            );
          })}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing[4], paddingBottom: spacing[8] },
    chipRow: { maxHeight: 40, marginBottom: spacing[2] },
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
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[2] },
    gridItem: { flexGrow: 1, flexBasis: '47%' },
    metricCard: { padding: spacing[3] },
    metricCardActive: { borderColor: colors.primary, borderWidth: 1 },
    metricValue: { ...textStyles.h3, color: colors.foreground },
    units: { ...textStyles.caption, color: colors.foregroundMuted },
    metricName: { ...textStyles.caption, color: colors.foregroundMuted },
    chartCard: { padding: spacing[3], marginTop: spacing[4] },
    chartHead: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] },
    chartTitle: { ...textStyles.label, color: colors.foreground },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: 3 },
    barDay: { ...textStyles.caption, color: colors.foregroundSubtle, width: 42 },
    barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surfaceHover },
    barFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
    barVal: { ...textStyles.caption, color: colors.foregroundMuted, width: 58, textAlign: 'right' },
    subtle: { ...textStyles.caption, color: colors.foregroundMuted },
    errorText: { ...textStyles.caption, color: '#ef4444', marginBottom: spacing[2] },
  });

export default HealthScreen;
