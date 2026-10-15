/**
 * Workout notes tab — mobile port of the web workspace's "Notes" tab
 * (huginn-webapp .../workout-workspace/WorkoutNotesList.tsx).
 *
 * Web shows two cards side by side: active context notes, and all notes with
 * create/edit/delete. A phone has one column, so the context notes become a
 * section above the full list. Import stays web-only — it needs a file picker
 * over local markdown, which the phone has no source for.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { BookMarked, NotebookPen, Pencil, Trash2 } from 'lucide-react-native';
import { Card, Badge, Button, Input, Dialog, Switch, EmptyState, Text } from '@shared/components/ui';
import { useColors, spacing, textStyles } from '@shared/theme';
import { workoutService, type WorkoutNote } from '@features/workout/services/workout';

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

export default function WorkoutNotes() {
  const colors = useColors();
  const styles = makeStyles(colors);

  const [notes, setNotes] = useState<WorkoutNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<WorkoutNote | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [useAsContext, setUseAsContext] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setNotes(await workoutService.getNotes());
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const contextNotes = useMemo(() => notes.filter((n) => n.useAsContext), [notes]);

  const openNew = () => {
    setEditing(null);
    setTitle('');
    setContent('');
    setUseAsContext(false);
    setFormOpen(true);
  };

  const openEdit = (note: WorkoutNote) => {
    setEditing(note);
    setTitle(note.title);
    setContent(note.content);
    setUseAsContext(note.useAsContext);
    setFormOpen(true);
  };

  const save = async () => {
    if (!title.trim()) return;
    const input = { title: title.trim(), content, useAsContext };
    if (editing) await workoutService.updateNote(editing.id, input);
    else await workoutService.createNote(input);
    setFormOpen(false);
    await load();
  };

  const remove = (note: WorkoutNote) => {
    Alert.alert('Delete note', `Delete "${note.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await workoutService.deleteNote(note.id);
          await load();
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
        }
      >
        {contextNotes.length > 0 ? (
          <>
            <View style={styles.head}>
              <BookMarked size={18} color={colors.foreground} />
              <Text style={styles.headTitle}>Active context notes</Text>
            </View>
            {contextNotes.map((note) => (
              <Card key={`ctx-${note.id}`} style={styles.noteCard}>
                <View style={styles.rowTop}>
                  <View style={styles.flex1}>
                    <Text style={styles.noteTitle}>{note.title}</Text>
                    <Text style={styles.meta}>
                      {note.sourceName ?? 'Manual note'} · {formatDateTime(note.updatedAt)}
                    </Text>
                  </View>
                  <Badge variant="secondary">{note.kind}</Badge>
                </View>
                <Text style={styles.noteBody} numberOfLines={4}>
                  {note.content}
                </Text>
              </Card>
            ))}
          </>
        ) : null}

        <View style={styles.head}>
          <Text style={styles.headTitle}>All workout notes</Text>
          <Button variant="primary" size="sm" onPress={openNew}>
            New
          </Button>
        </View>

        {!loading && notes.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No notes yet"
            description="Notes you write or import appear here."
            actionLabel="New note"
            onAction={openNew}
          />
        ) : null}

        {notes.map((note) => (
          <Card key={note.id} style={styles.noteCard}>
            <View style={styles.rowTop}>
              <View style={styles.flex1}>
                <View style={styles.titleRow}>
                  <Text style={styles.noteTitle}>{note.title}</Text>
                  {note.useAsContext ? <Badge variant="secondary">AI context</Badge> : null}
                </View>
                <Text style={styles.meta}>
                  {note.sourceName ?? 'Manual note'} · {formatDateTime(note.updatedAt)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => openEdit(note)} hitSlop={10} style={styles.iconBtn}>
                <Pencil size={16} color={colors.foregroundMuted} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(note)} hitSlop={10} style={styles.iconBtn}>
                <Trash2 size={16} color={colors.destructive} />
              </TouchableOpacity>
            </View>
            <Text style={styles.noteBody} numberOfLines={4}>
              {note.content}
            </Text>
          </Card>
        ))}
      </ScrollView>

      <Dialog
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit note' : 'New note'}
      >
        <ScrollView contentContainerStyle={styles.form}>
          <Input label="Title" value={title} onChangeText={setTitle} placeholder="Note title" />
          <Input
            label="Content"
            value={content}
            onChangeText={setContent}
            placeholder="Write the note"
            multiline
            numberOfLines={8}
            style={styles.textarea}
          />
          <View style={styles.switchRow}>
            <View style={styles.flex1}>
              <Text style={styles.noteTitle}>Use as AI context</Text>
              <Text style={styles.meta}>Muninn reads this note when coaching.</Text>
            </View>
            <Switch value={useAsContext} onChange={setUseAsContext} />
          </View>
          <View style={styles.formActions}>
            <Button variant="outline" onPress={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={save}
              leftIcon={<NotebookPen size={16} color={colors.primaryForeground} />}
            >
              Save
            </Button>
          </View>
        </ScrollView>
      </Dialog>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing[4], paddingBottom: spacing[8], gap: spacing[3] },
    head: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
    headTitle: { ...textStyles.label, color: colors.foreground, flex: 1 },
    noteCard: { padding: spacing[3], gap: spacing[2] },
    rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2] },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' },
    flex1: { flex: 1 },
    iconBtn: { padding: spacing[1] },
    noteTitle: { ...textStyles.body, color: colors.foreground, fontWeight: '600' },
    noteBody: { ...textStyles.bodySmall, color: colors.foregroundMuted },
    meta: { ...textStyles.caption, color: colors.foregroundMuted },
    form: { gap: spacing[3], paddingBottom: spacing[2] },
    textarea: { minHeight: 140, textAlignVertical: 'top' },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
    formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[2] },
  });
