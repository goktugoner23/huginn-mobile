/**
 * Tyr tab — mobile port of the web workspace's "Tyr" tab
 * (huginn-webapp .../workout-workspace/TyrTab.tsx + tyr-dashboard.tsx).
 *
 * Keeps the web's three sections (Correlation, Summary, Coach notes), the same
 * 8/12/26-week window buttons, the same trend arithmetic and the same
 * "Run coach now" action. The web chart is a recharts ComposedChart; here it is
 * a react-native-chart-kit line chart for kcal and volume, with the session
 * count listed per day underneath — same three series, phone-shaped.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Card, Button, Text } from '@shared/components/ui';
import { useColors, spacing, radius, textStyles } from '@shared/theme';
import {
  getCorrelation,
  getSummary,
  getCoachNotes,
  runCoachNow,
  type CoachNote,
  type CorrelationSeries,
  type ExerciseSummary,
  type RecentSummary,
} from '@features/workout/services/tyr';

type WindowChoice = 8 | 12 | 26;
type Section = 'correlation' | 'summary' | 'coach';

const WINDOW_LABELS: Record<WindowChoice, string> = {
  8: '8 weeks',
  12: '12 weeks',
  26: '6 months',
};

function formatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Same arithmetic as the web dashboard: slope as a share of weekly volume. */
function formatTrendPct(slope: number | null, totalVolume: number): string {
  if (slope === null) return '--';
  if (totalVolume === 0) return '--';
  const sign = slope > 0 ? '+' : '';
  const pct = (slope / Math.max(totalVolume / 4, 1)) * 100;
  return `${sign}${pct.toFixed(1)}%`;
}

function trendArrow(slope: number | null): string {
  if (slope === null || Math.abs(slope) < 0.5) return '·';
  return slope > 0 ? '▲' : '▼';
}

function firstLine(content: string): string {
  const trimmed = content.trim();
  const newline = trimmed.indexOf('\n');
  const head = newline === -1 ? trimmed : trimmed.slice(0, newline);
  return head.length > 160 ? `${head.slice(0, 160)}…` : head;
}

export default function WorkoutTyr() {
  const colors = useColors();
  const styles = makeStyles(colors);

  const [section, setSection] = useState<Section>('correlation');
  const [windowChoice, setWindowChoice] = useState<WindowChoice>(8);
  const [correlation, setCorrelation] = useState<CorrelationSeries | null>(null);
  const [summary, setSummary] = useState<RecentSummary | null>(null);
  const [coachNotes, setCoachNotes] = useState<CoachNote[]>([]);
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null);
  const [loadingWindow, setLoadingWindow] = useState(false);
  const [runningCoach, setRunningCoach] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCorrelation(8), getSummary(4), getCoachNotes()])
      .then(([corr, sum, notes]) => {
        if (cancelled) return;
        setCorrelation(corr);
        setSummary(sum);
        setCoachNotes(notes);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load Tyr.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const changeWindow = useCallback(
    async (weeks: WindowChoice) => {
      if (weeks === windowChoice) return;
      setWindowChoice(weeks);
      setLoadingWindow(true);
      try {
        setCorrelation(await getCorrelation(weeks));
      } catch {
        // Leave the previous series on screen; a transient error should not blank it.
      } finally {
        setLoadingWindow(false);
      }
    },
    [windowChoice],
  );

  const refreshCoachNotes = useCallback(async () => {
    setRunningCoach(true);
    try {
      const result = await runCoachNow();
      setCoachError(result.skipped && result.reason ? `Coach skipped: ${result.reason}` : null);
      setCoachNotes(await getCoachNotes());
    } catch (err) {
      setCoachError(err instanceof Error ? err.message : 'Coach run failed');
    } finally {
      setRunningCoach(false);
    }
  }, []);

  const daily = correlation?.daily ?? [];
  const chartWidth = Dimensions.get('window').width - spacing[4] * 2 - spacing[3] * 2;

  // chart-kit wants parallel arrays; sample the labels so they stay readable.
  const chart = useMemo(() => {
    if (daily.length === 0) return null;
    const step = Math.max(1, Math.ceil(daily.length / 6));
    return {
      labels: daily.map((d, i) => (i % step === 0 ? formatDay(d.date) : '')),
      datasets: [
        { data: daily.map((d) => d.kcal), color: () => 'rgb(249, 115, 22)', strokeWidth: 2 },
        { data: daily.map((d) => d.volumeKg), color: () => 'rgb(37, 99, 235)', strokeWidth: 2 },
      ],
      legend: ['kcal', 'Volume (kg)'],
    };
  }, [daily]);

  if (error) {
    return (
      <View style={styles.screen}>
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>Couldn't load Tyr: {error}</Text>
        </Card>
      </View>
    );
  }

  if (!correlation || !summary) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.meta}>Loading Tyr…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.eyebrow}>BODY</Text>
        <Text style={styles.title}>Tyr</Text>
        <Text style={styles.meta}>
          Workout coach + diet correlation. The god of war keeps your eyes on the bar.
        </Text>
      </View>

      <View style={styles.sectionRow}>
        {(['correlation', 'summary', 'coach'] as Section[]).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setSection(s)}
            style={[styles.sectionTab, section === s && styles.sectionTabActive]}
          >
            <Text style={[styles.sectionTabText, section === s && styles.sectionTabTextActive]}>
              {s === 'correlation' ? 'Correlation' : s === 'summary' ? 'Summary' : 'Coach notes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {section === 'correlation' ? (
        <>
          <View style={styles.windowRow}>
            {([8, 12, 26] as WindowChoice[]).map((weeks) => (
              <Button
                key={weeks}
                size="sm"
                variant={windowChoice === weeks ? 'primary' : 'outline'}
                onPress={() => changeWindow(weeks)}
                disabled={loadingWindow}
              >
                {WINDOW_LABELS[weeks]}
              </Button>
            ))}
            {loadingWindow ? <Text style={styles.meta}>loading…</Text> : null}
          </View>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>kcal vs lifting volume vs session frequency</Text>
            {chart === null ? (
              <Text style={styles.placeholder}>No diet or workout data in this window.</Text>
            ) : (
              <>
                <LineChart
                  data={chart}
                  width={chartWidth}
                  height={240}
                  withDots={false}
                  withInnerLines={false}
                  chartConfig={{
                    backgroundGradientFrom: colors.surface,
                    backgroundGradientTo: colors.surface,
                    decimalPlaces: 0,
                    color: () => colors.foregroundMuted,
                    labelColor: () => colors.foregroundMuted,
                    propsForBackgroundLines: { stroke: colors.border },
                  }}
                  style={styles.chart}
                  bezier
                />
                <Text style={styles.meta}>
                  Sessions:{' '}
                  {daily.reduce((n, d) => n + d.sessions, 0)} across {daily.length} days
                </Text>
              </>
            )}
          </Card>
        </>
      ) : null}

      {section === 'summary' ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Top exercises — last {summary.weeks} weeks</Text>
          {summary.exercises.length === 0 ? (
            <Text style={styles.placeholder}>No completed exercises in this window.</Text>
          ) : (
            <>
              {summary.exercises.map((ex) => (
                <ExerciseRow key={ex.exerciseName} ex={ex} />
              ))}
              <Text style={styles.meta}>
                Total volume across all exercises: {Math.round(summary.totalVolumeKg).toLocaleString()} kg.
              </Text>
            </>
          )}
        </Card>
      ) : null}

      {section === 'coach' ? (
        <>
          <View style={styles.windowRow}>
            <Button size="sm" variant="primary" onPress={refreshCoachNotes} disabled={runningCoach}>
              {runningCoach ? 'Running…' : 'Run coach now'}
            </Button>
            {coachError ? <Text style={styles.errorText}>{coachError}</Text> : null}
          </View>
          {coachNotes.length === 0 ? (
            <Text style={styles.placeholder}>
              No coach notes yet. The Monday cron will write the first one, or tap Run coach now.
            </Text>
          ) : (
            coachNotes.map((note) => {
              const isExpanded = expandedNoteId === note.id;
              return (
                <Card key={note.id} style={styles.card}>
                  <TouchableOpacity
                    onPress={() => setExpandedNoteId(isExpanded ? null : note.id)}
                    style={styles.noteHead}
                  >
                    <View style={styles.flex1}>
                      <Text style={styles.noteTitle}>{note.title}</Text>
                      <Text style={styles.meta}>{new Date(note.createdAt).toLocaleString()}</Text>
                      {!isExpanded ? (
                        <Text style={styles.meta}>{firstLine(note.content)}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.meta}>{isExpanded ? 'collapse' : 'expand'}</Text>
                  </TouchableOpacity>
                  {isExpanded ? <Text style={styles.noteBody}>{note.content}</Text> : null}
                </Card>
              );
            })
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

function ExerciseRow({ ex }: { ex: ExerciseSummary }) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const slope = ex.trendSlope;
  const trendColor =
    slope === null || slope === 0
      ? colors.foregroundMuted
      : slope > 0
        ? colors.success
        : colors.destructive;

  return (
    <View style={styles.exRow}>
      <View style={styles.flex1}>
        <Text style={styles.noteTitle} numberOfLines={1}>
          {ex.exerciseName}
        </Text>
        <Text style={styles.meta}>
          {ex.muscleGroup ? `${ex.muscleGroup} · ` : ''}
          {ex.sessions} sessions · {Math.round(ex.totalVolumeKg).toLocaleString()} kg ·{' '}
          {ex.maxWeightKg > 0 ? `max ${ex.maxWeightKg} kg` : 'max --'}
        </Text>
      </View>
      <Text style={[styles.trend, { color: trendColor }]}>
        {trendArrow(slope)} {formatTrendPct(slope, ex.totalVolumeKg)}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
    content: { padding: spacing[4], paddingBottom: spacing[8], gap: spacing[3] },
    eyebrow: { ...textStyles.caption, color: colors.foregroundMuted, letterSpacing: 2 },
    title: { ...textStyles.h1, color: colors.foreground },
    meta: { ...textStyles.caption, color: colors.foregroundMuted },
    sectionRow: { flexDirection: 'row', gap: spacing[2] },
    sectionTab: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    sectionTabActive: { borderBottomColor: colors.primary },
    sectionTabText: { ...textStyles.bodySmall, color: colors.foregroundMuted },
    sectionTabTextActive: { color: colors.foreground, fontWeight: '600' },
    windowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' },
    card: { padding: spacing[3], gap: spacing[2] },
    cardTitle: { ...textStyles.label, color: colors.foreground },
    chart: { marginVertical: spacing[2], borderRadius: radius.lg },
    placeholder: {
      ...textStyles.caption,
      color: colors.foregroundMuted,
      textAlign: 'center',
      paddingVertical: spacing[6],
    },
    exRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      paddingVertical: spacing[2],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    flex1: { flex: 1 },
    trend: { ...textStyles.bodySmall, fontVariant: ['tabular-nums'] },
    noteHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
    noteTitle: { ...textStyles.body, color: colors.foreground, fontWeight: '600' },
    noteBody: { ...textStyles.bodySmall, color: colors.foregroundMuted, marginTop: spacing[2] },
    errorCard: { margin: spacing[4], padding: spacing[3] },
    errorText: { ...textStyles.caption, color: colors.destructive },
  });
