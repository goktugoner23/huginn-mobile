/**
 * Workout history tab — mobile port of the web workspace's "History" tab
 * (huginn-webapp .../workout-workspace/WorkoutHistoryList.tsx).
 *
 * Web renders a table with a sliding detail page. A table does not fit a phone,
 * so each session is a row card and the detail opens in a modal; the fields and
 * their wording stay the same.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { CheckCircle2, X } from 'lucide-react-native';
import { Card, Badge, EmptyState, Text } from '@shared/components/ui';
import { useColors, spacing, radius, textStyles } from '@shared/theme';
import { workoutService } from '@features/workout/services/workout';
import type { CompletedWorkout } from '@features/workout/types/Workout';

/** Same output as the web `_shared.formatDateTime` ("dd MMM yyyy · HH:mm"). */
function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'No data';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No data';
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = parsed.toLocaleString('en-GB', { month: 'short' });
  const hh = String(parsed.getHours()).padStart(2, '0');
  const mm = String(parsed.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${parsed.getFullYear()} · ${hh}:${mm}`;
}

/** Same output as the web `_shared.formatDuration`. */
function formatDuration(durationMs: number): string {
  const minutes = Math.round(durationMs / 60000);
  if (minutes <= 0) return 'n/a';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

export default function WorkoutHistory() {
  const colors = useColors();
  const styles = makeStyles(colors);

  const [workouts, setWorkouts] = useState<CompletedWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<CompletedWorkout | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setWorkouts(await workoutService.getHistory());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openWorkout = async (workout: CompletedWorkout) => {
    setDetailLoadingId(workout.id);
    try {
      setDetail(await workoutService.getWorkoutDetail(workout.id));
    } catch {
      setDetail(workout);
    } finally {
      setDetailLoadingId(null);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
        }
      >
        <View style={styles.head}>
          <CheckCircle2 size={18} color={colors.foreground} />
          <Text style={styles.headTitle}>Imported and recorded workout sessions</Text>
        </View>

        {!loading && workouts.length === 0 ? (
          <EmptyState
            icon="barbell-outline"
            title="No sessions yet"
            description="Completed and imported workouts appear here."
          />
        ) : null}

        {workouts.map((w) => (
          <TouchableOpacity
            key={w.id}
            onPress={() => openWorkout(w)}
            disabled={detailLoadingId === w.id}
            activeOpacity={0.7}
          >
            <Card style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={styles.program} numberOfLines={1}>
                  {w.programName ?? 'Workout'}
                </Text>
                <Badge variant="secondary">{`${w.totalSetsCompleted}/${w.totalSetsPlanned}`}</Badge>
              </View>
              <Text style={styles.meta}>
                {formatDateTime(w.startTime)} · {formatDuration(w.durationMs)}
              </Text>
              <Text style={styles.meta}>Volume {Math.round(w.totalVolume)}</Text>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={detail !== null}
        animationType="slide"
        onRequestClose={() => setDetail(null)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {detail?.programName ?? 'Workout detail'}
            </Text>
            <TouchableOpacity onPress={() => setDetail(null)} hitSlop={12}>
              <X size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {detail ? (
              <>
                <View style={styles.statGrid}>
                  <Stat label="Start" value={formatDateTime(detail.startTime)} blurb="Session timestamp" />
                  <Stat
                    label="Completion"
                    value={`${Math.round(detail.completionPercentage)}%`}
                    blurb={`${detail.totalSetsCompleted}/${detail.totalSetsPlanned} sets`}
                  />
                  <Stat label="Duration" value={formatDuration(detail.durationMs)} blurb="Imported active time" />
                  <Stat label="Volume" value={String(Math.round(detail.totalVolume))} blurb="Rep x load total" />
                </View>

                {detail.notes ? (
                  <Card style={styles.notesCard}>
                    <Text style={styles.notesText}>{detail.notes}</Text>
                  </Card>
                ) : null}

                {detail.exercises.map((ex) => (
                  <Card key={`${ex.exerciseId}-${ex.exerciseName}`} style={styles.exerciseCard}>
                    <View style={styles.rowTop}>
                      <View style={styles.flex1}>
                        <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                        <Text style={styles.meta}>{ex.muscleGroup ?? 'General'}</Text>
                      </View>
                      <Badge variant="secondary">{`${ex.sets.length} sets`}</Badge>
                    </View>
                    <View style={styles.setGrid}>
                      {ex.sets.map((s) => (
                        <View key={`${ex.exerciseId}-${s.setNumber}`} style={styles.setBox}>
                          <Text style={styles.setTitle}>Set {s.setNumber}</Text>
                          <Text style={styles.meta}>
                            {s.reps} reps · {s.weight > 0 ? `${s.weight} kg` : 'Bodyweight'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </Card>
                ))}
              </>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function Stat({ label, value, blurb }: { label: string; value: string; blurb: string }) {
  const colors = useColors();
  const styles = makeStyles(colors);
  return (
    <Card style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.meta}>{blurb}</Text>
    </Card>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing[4], paddingBottom: spacing[8], gap: spacing[3] },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
    headTitle: { ...textStyles.label, color: colors.foreground, flex: 1 },
    row: { padding: spacing[3], gap: spacing[1] },
    rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
    flex1: { flex: 1 },
    program: { ...textStyles.body, color: colors.foreground, flex: 1, fontWeight: '600' },
    meta: { ...textStyles.caption, color: colors.foregroundMuted },
    modal: { flex: 1, backgroundColor: colors.background },
    modalHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    modalTitle: { ...textStyles.h3, color: colors.foreground, flex: 1 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
    statCard: { padding: spacing[3], flexGrow: 1, flexBasis: '47%' },
    statLabel: { ...textStyles.caption, color: colors.foregroundMuted },
    statValue: { ...textStyles.h4, color: colors.foreground },
    notesCard: { padding: spacing[3] },
    notesText: { ...textStyles.bodySmall, color: colors.foregroundMuted },
    exerciseCard: { padding: spacing[3], gap: spacing[2] },
    exerciseName: { ...textStyles.body, color: colors.foreground, fontWeight: '600' },
    setGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
    setBox: {
      flexGrow: 1,
      flexBasis: '47%',
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceHover,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
    },
    setTitle: { ...textStyles.bodySmall, color: colors.foreground, fontWeight: '500' },
  });
