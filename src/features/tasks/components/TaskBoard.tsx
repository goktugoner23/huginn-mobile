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

import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { CalendarClock } from 'lucide-react-native';
import { Text } from '@shared/components/ui';
import { useColors, spacing, radius, textStyles } from '@shared/theme';
import { stripMarkdown } from '@features/tasks/utils/markdown';
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type Task,
  type TaskGroup,
  type TaskStatus,
} from '@features/tasks/types/Task';

const COLUMN_WIDTH = 280;
const CARD_HEIGHT = 88;
// Cards a column shows before "Show more"; a long Done column otherwise made
// the screen endless. Same count as the webapp board.
const COLLAPSED_CARD_COUNT = 5;

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
  onEdit: (task: Task) => void;
}

export default function TaskBoard({ group, tasks, onEdit }: TaskBoardProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [expandedColumns, setExpandedColumns] = useState<Set<TaskStatus>>(() => new Set());

  const toggleColumn = useCallback((status: TaskStatus) => {
    setExpandedColumns((current) => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

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
      <TouchableOpacity
        key={task.id}
        style={styles.card}
        onPress={() => onEdit(task)}
        activeOpacity={0.7}
      >
        <View style={styles.cardBodyArea}>
          <Text
            style={[styles.cardTitle, task.status === 'done' && styles.cardTitleDone]}
            // Two lines on its own, one when a description follows, so every
            // card is the same height whatever it holds.
            numberOfLines={task.description ? 1 : 2}
          >
            {task.name}
          </Text>
          {task.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {stripMarkdown(task.description)}
            </Text>
          ) : null}
        </View>

        {/* Always present so the meta strip sits on the same line on every
            card, even when a task has no date. */}
        <View style={styles.metaRow}>
          {task.dueDate ? (
            <>
              <CalendarClock
                size={13}
                color={isOverdue(task) ? colors.destructive : colors.foregroundMuted}
              />
              <Text style={[styles.due, isOverdue(task) && styles.dueOverdue]}>
                {formatDue(task.dueDate)}
                {isOverdue(task) ? ' · overdue' : ''}
              </Text>
            </>
          ) : null}
        </View>
      </TouchableOpacity>
    ),
    [colors, styles, onEdit],
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
        {columns.map((column) => {
          const expanded = expandedColumns.has(column.status);
          const hiddenCount = column.items.length - COLLAPSED_CARD_COUNT;
          const visibleItems = expanded
            ? column.items
            : column.items.slice(0, COLLAPSED_CARD_COUNT);
          return (
            <View key={column.status} style={styles.column}>
              <View style={styles.columnHead}>
                <Text style={styles.columnLabel}>{column.label.toUpperCase()}</Text>
                <Text style={styles.columnCount}>{column.items.length}</Text>
              </View>
              {visibleItems.map(renderCard)}
              {hiddenCount > 0 ? (
                <TouchableOpacity
                  style={styles.showMore}
                  onPress={() => toggleColumn(column.status)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.showMoreText}>
                    {expanded ? 'Show less' : `Show ${hiddenCount} more`}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {column.items.length === 0 ? (
                <Text style={styles.emptyColumn}>Nothing here</Text>
              ) : null}
            </View>
          );
        })}
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
      // Fixed height so every card in every column matches, ClickUp-style.
      height: CARD_HEIGHT,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing[3],
      justifyContent: 'space-between',
    },
    cardBodyArea: { flex: 1, minHeight: 0 },
    metaRow: { height: 18, flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
    cardTitle: { ...textStyles.bodySmall, color: colors.foreground, fontWeight: '500' },
    cardTitleDone: { color: colors.foregroundMuted, textDecorationLine: 'line-through' },
    cardDesc: { ...textStyles.caption, color: colors.foregroundMuted, marginTop: 2 },
    due: { ...textStyles.caption, color: colors.foregroundMuted },
    dueOverdue: { color: colors.destructive, fontWeight: '600' },
    showMore: {
      alignItems: 'center',
      paddingVertical: spacing[2],
      borderRadius: radius.full,
    },
    showMoreText: { ...textStyles.caption, color: colors.foregroundMuted, fontWeight: '600' },
    emptyColumn: {
      ...textStyles.caption,
      color: colors.foregroundSubtle,
      textAlign: 'center',
      paddingVertical: spacing[5],
    },
  });
