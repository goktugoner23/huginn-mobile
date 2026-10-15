/**
 * Board view — mobile port of the webapp's task board.
 *
 * One board per task group, three columns (To do / In progress / Done), backed
 * by the same `tasks.status` column and `PATCH /api/tasks/:id/status`.
 *
 * Two deliberate differences from web, both because this is a phone:
 * - The columns scroll horizontally instead of sitting side by side; three
 *   280dp columns do not fit 390dp of screen.
 * - Cards move by tapping a column chip rather than by dragging. The web board
 *   offers the same buttons as its keyboard path; on a phone they are the
 *   primary control, which beats a drag across a horizontal scroll view.
 */

import React, { useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { CalendarClock } from 'lucide-react-native';
import { Text } from '@shared/components/ui';
import { useColors, spacing, radius, textStyles } from '@shared/theme';
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type Task,
  type TaskGroup,
  type TaskStatus,
} from '@features/tasks/types/Task';

const COLUMN_WIDTH = 280;

function isOverdue(task: Task): boolean {
  return Boolean(task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date());
}

function formatDue(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

interface TaskBoardProps {
  /** The group this board belongs to; null is the "No group" board. */
  group: TaskGroup | null;
  tasks: Task[];
  onMove: (task: Task, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
}

export default function TaskBoard({ group, tasks, onMove, onEdit }: TaskBoardProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const columns = useMemo(
    () =>
      TASK_STATUSES.map((status) => ({
        status,
        label: TASK_STATUS_LABELS[status],
        items: tasks.filter((t) => t.status === status),
      })),
    [tasks],
  );

  const done = tasks.filter((t) => t.status === 'done').length;

  const renderCard = useCallback(
    (task: Task) => (
      <View key={task.id} style={styles.card}>
        <TouchableOpacity onPress={() => onEdit(task)} activeOpacity={0.7}>
          <Text style={[styles.cardTitle, task.status === 'done' && styles.cardTitleDone]}>
            {task.name}
          </Text>
          {task.description ? (
            <Text style={styles.cardBody} numberOfLines={2}>
              {task.description}
            </Text>
          ) : null}
        </TouchableOpacity>

        {task.dueDate ? (
          <View style={styles.dueRow}>
            <CalendarClock
              size={13}
              color={isOverdue(task) ? colors.destructive : colors.foregroundMuted}
            />
            <Text style={[styles.due, isOverdue(task) && styles.dueOverdue]}>
              {formatDue(task.dueDate)}
              {isOverdue(task) ? ' · overdue' : ''}
            </Text>
          </View>
        ) : null}

        <View style={styles.moveRow}>
          {TASK_STATUSES.filter((s) => s !== task.status).map((s) => (
            <TouchableOpacity key={s} style={styles.moveChip} onPress={() => onMove(task, s)}>
              <Text style={styles.moveChipText}>{TASK_STATUS_LABELS[s]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    ),
    [colors, styles, onEdit, onMove],
  );

  return (
    <View style={styles.board}>
      <View style={styles.boardHead}>
        <View style={[styles.dot, { backgroundColor: group?.color ?? colors.foregroundSubtle }]} />
        <Text style={styles.boardTitle} numberOfLines={1}>
          {group?.title ?? 'No group'}
        </Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>
            {done}/{tasks.length}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.columns}
        // Snap so a column always lands flush rather than half off-screen.
        snapToInterval={COLUMN_WIDTH + spacing[3]}
        decelerationRate="fast"
      >
        {columns.map((column) => (
          <View key={column.status} style={styles.column}>
            <View style={styles.columnHead}>
              <Text style={styles.columnLabel}>{column.label.toUpperCase()}</Text>
              <Text style={styles.columnCount}>{column.items.length}</Text>
            </View>
            {column.items.map(renderCard)}
            {column.items.length === 0 ? (
              <Text style={styles.emptyColumn}>Nothing here</Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    board: {
      marginHorizontal: spacing[3],
      marginBottom: spacing[4],
      backgroundColor: colors.card,
      borderRadius: radius['3xl'],
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingVertical: spacing[3],
    },
    boardHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[3],
    },
    dot: { width: 10, height: 10, borderRadius: 5 },
    boardTitle: { ...textStyles.body, color: colors.foreground, fontWeight: '600', flex: 1 },
    countPill: {
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: spacing[2],
      paddingVertical: 2,
    },
    countText: { ...textStyles.caption, color: colors.foregroundMuted },
    columns: { paddingHorizontal: spacing[3], gap: spacing[3] },
    column: {
      width: COLUMN_WIDTH,
      backgroundColor: colors.surfaceHover,
      borderRadius: radius.xl,
      padding: spacing[3],
      gap: spacing[2],
    },
    columnHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing[1],
      paddingBottom: spacing[1],
    },
    columnLabel: { ...textStyles.caption, color: colors.foregroundMuted, letterSpacing: 1 },
    columnCount: { ...textStyles.caption, color: colors.foregroundMuted },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing[3],
      gap: spacing[2],
    },
    cardTitle: { ...textStyles.bodySmall, color: colors.foreground, fontWeight: '500' },
    cardTitleDone: { color: colors.foregroundMuted, textDecorationLine: 'line-through' },
    cardBody: { ...textStyles.caption, color: colors.foregroundMuted, marginTop: 2 },
    dueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
    due: { ...textStyles.caption, color: colors.foregroundMuted },
    dueOverdue: { color: colors.destructive, fontWeight: '600' },
    moveRow: { flexDirection: 'row', gap: spacing[1], flexWrap: 'wrap' },
    moveChip: {
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: spacing[2],
      paddingVertical: 4,
    },
    moveChipText: { ...textStyles.caption, color: colors.foreground },
    emptyColumn: {
      ...textStyles.caption,
      color: colors.foregroundSubtle,
      textAlign: 'center',
      paddingVertical: spacing[5],
    },
  });
