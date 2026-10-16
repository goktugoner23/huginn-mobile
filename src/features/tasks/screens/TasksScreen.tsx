import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Appbar, AppbarAction } from '@shared/components/ui';
import { AddFab } from '@shared/components';
import { Task, TaskGroup, TaskStatus } from '@features/tasks/types/Task';
import { getTasks, saveTask, deleteTask as deleteTaskApi, getTaskGroups, saveTaskGroup, deleteTaskGroup as deleteGroupApi, setTaskStatus } from '@features/tasks/services/tasks';
import TaskBoard from '@features/tasks/components/TaskBoard';
import TaskCard from '@features/tasks/components/TaskCard';
import TaskGroupHeader from '@features/tasks/components/TaskGroupHeader';
import EmptyTasksState from '@features/tasks/components/EmptyTasksState';
import AddTaskDialog from '@features/tasks/components/AddTaskDialog';
import EditTaskDialog from '@features/tasks/components/EditTaskDialog';
import AddTaskGroupDialog from '@features/tasks/components/AddTaskGroupDialog';
import DeleteConfirmationDialog from '@shared/components/ui/DeleteConfirmationDialog';
import { useColors, spacing, textStyles } from '@shared/theme';

const TasksScreen: React.FC = () => {
  const colors = useColors();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskGroups, setTaskGroups] = useState<TaskGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Board is the default, matching the webapp's tasks page.
  type ViewMode = 'board' | 'grouped' | 'list';
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  type DialogType = 'none' | 'addTask' | 'addGroup' | 'editTask' | 'deleteTask' | 'deleteGroup';
  const [activeDialog, setActiveDialog] = useState<DialogType>('none');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<TaskGroup | null>(null);

  const fetchAll = useCallback(async () => {
    const [t, g] = await Promise.all([getTasks(), getTaskGroups()]);
    setTasks(t);
    setTaskGroups(g);
  }, []);

  useEffect(() => {
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // Group tasks by groupId
  const groupedTasks = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of tasks) {
      const key = task.groupId ?? 'ungrouped';
      (map[key] ??= []).push(task);
    }
    return map;
  }, [tasks]);

  // Task actions.
  //
  // The checkbox goes through the status endpoint, not saveTask: `PUT
  // /api/tasks/:id` only writes name/description/date/due_date/group_id, so
  // ticking a task used to look right on screen and never persist. The status
  // route writes `completed` too, which also keeps the board in step.
  const handleToggleTaskComplete = useCallback(async (task: Task) => {
    const next: TaskStatus = task.completed ? 'todo' : 'done';
    const updated: Task = { ...task, completed: !task.completed, status: next };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    try {
      const saved = await setTaskStatus(task.id, next);
      if (saved) setTasks((prev) => prev.map((t) => (t.id === task.id ? saved : t)));
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    }
  }, []);

  const handleEditTask = useCallback((task: Task) => {
    setSelectedTask(task);
    setActiveDialog('editTask');
  }, []);

  /** Board column move. Optimistic, rolled back if the write fails. */
  const handleMoveTask = useCallback(async (task: Task, status: TaskStatus) => {
    if (task.status === status) return;
    const moved: Task = { ...task, status, completed: status === 'done' };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? moved : t)));
    try {
      const saved = await setTaskStatus(task.id, status);
      if (saved) setTasks((prev) => prev.map((t) => (t.id === task.id ? saved : t)));
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      Alert.alert('Error', `Could not move "${task.name}".`);
    }
  }, []);

  const handleUpdateTask = useCallback(
    async (taskData: { name: string; description?: string; dueDate?: Date; groupId?: string }) => {
      if (!selectedTask) return;
      const updated: Task = {
        ...selectedTask,
        name: taskData.name,
        description: taskData.description,
        dueDate: taskData.dueDate?.toISOString(),
        groupId: taskData.groupId,
      };
      setActiveDialog('none');
      setSelectedTask(null);
      try {
        const saved = await saveTask(updated);
        setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? saved : t)));
      } catch {
        Alert.alert('Error', 'Failed to update task.');
      }
    },
    [selectedTask],
  );

  const handleDeleteTask = useCallback(async () => {
    if (!selectedTask) return;
    const id = selectedTask.id;
    setActiveDialog('none');
    setSelectedTask(null);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await deleteTaskApi(id);
  }, [selectedTask]);

  const handleAddTask = useCallback(
    async (taskData: { name: string; description?: string; dueDate?: Date; groupId?: string }) => {
      setActiveDialog('none');
      const newTask: Task = {
        id: `temp-${Date.now()}`,
        name: taskData.name,
        description: taskData.description,
        completed: false,
        status: 'todo',
        date: new Date().toISOString(),
        dueDate: taskData.dueDate?.toISOString(),
        groupId: taskData.groupId,
      };
      try {
        const saved = await saveTask(newTask);
        setTasks((prev) => [...prev, saved]);
      } catch {
        Alert.alert('Error', 'Failed to add task.');
      }
    },
    [],
  );

  // Group actions
  const handleEditGroup = useCallback((group: TaskGroup) => {
    setSelectedGroup(group);
    setActiveDialog('deleteGroup');
  }, []);

  const handleDeleteGroup = useCallback(async () => {
    if (!selectedGroup) return;
    const id = selectedGroup.id;
    setActiveDialog('none');
    setSelectedGroup(null);
    setTaskGroups((prev) => prev.filter((g) => g.id !== id));
    setTasks((prev) => prev.map((t) => (t.groupId === id ? { ...t, groupId: undefined } : t)));
    await deleteGroupApi(id);
  }, [selectedGroup]);

  const handleAddGroup = useCallback(
    async (groupData: { title: string; description?: string; color: string }) => {
      setActiveDialog('none');
      const newGroup: TaskGroup = {
        id: `temp-${Date.now()}`,
        title: groupData.title,
        description: groupData.description,
        color: groupData.color,
        createdAt: new Date().toISOString(),
        isCompleted: false,
      };
      try {
        const saved = await saveTaskGroup(newGroup);
        setTaskGroups((prev) => [...prev, saved]);
      } catch {
        Alert.alert('Error', 'Failed to add group.');
      }
    },
    [],
  );

  // Sort tasks by due date
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    });
  }, [tasks]);

  const renderTaskItem = useCallback(
    ({ item }: { item: Task }) => (
      <TaskCard task={item} onToggleComplete={handleToggleTaskComplete} onEdit={handleEditTask} />
    ),
    [handleToggleTaskComplete, handleEditTask],
  );

  const toggleCollapse = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const renderGroupedTasks = () => {
    const items: any[] = [];

    Object.entries(groupedTasks).forEach(([groupId, groupTasks]) => {
      if (groupId === 'ungrouped') {
        if (groupTasks.length > 0) {
          items.push({ type: 'header', title: 'Ungrouped Tasks', id: 'ungrouped-header', groupId: 'ungrouped' });
          if (!collapsedGroups.has('ungrouped')) {
            groupTasks.forEach((task) => {
              items.push({ type: 'task', data: task, id: `task-${task.id}` });
            });
          }
        }
      } else {
        const group = taskGroups.find((g) => g.id === groupId);
        if (group && groupTasks.length > 0) {
          items.push({
            type: 'group-header',
            data: group,
            taskCount: groupTasks.length,
            completedCount: groupTasks.filter((t) => t.completed).length,
            id: `group-${groupId}`,
            collapsed: collapsedGroups.has(groupId),
          });
          if (!collapsedGroups.has(groupId)) {
            groupTasks.forEach((task) => {
              items.push({ type: 'task', data: task, id: `task-${task.id}`, groupId });
            });
          }
        }
      }
    });

    return (
      <FlashList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (item.type === 'task') {
            return (
              <TaskCard
                task={item.data}
                onToggleComplete={handleToggleTaskComplete}
                onEdit={handleEditTask}
                style={item.groupId ? { marginLeft: 32 } : undefined}
              />
            );
          } else if (item.type === 'group-header') {
            return (
              <TaskGroupHeader
                group={item.data}
                taskCount={item.taskCount}
                completedCount={item.completedCount}
                collapsed={item.collapsed}
                onPress={() => toggleCollapse(item.data.id)}
                onLongPress={handleEditGroup}
              />
            );
          } else if (item.type === 'header') {
            return (
              <TouchableOpacity style={styles.ungroupedHeader} onPress={() => toggleCollapse('ungrouped')}>
                <Text style={[textStyles.label, { color: colors.foregroundMuted }]}>
                  {collapsedGroups.has('ungrouped') ? '▸ ' : '▾ '}{item.title}
                </Text>
              </TouchableOpacity>
            );
          }
          return null;
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        estimatedItemSize={100}
      />
    );
  };

  /** One board per group, then a "No group" board when anything is ungrouped. */
  const renderBoards = () => {
    const boards = taskGroups
      .map((group) => ({ group, items: groupedTasks[group.id] ?? [] }))
      .filter((b) => b.items.length > 0);
    const ungrouped = groupedTasks.ungrouped ?? [];

    return (
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.boardScroll}
      >
        {boards.map(({ group, items }) => (
          <TaskBoard
            key={group.id}
            group={group}
            tasks={items}
            onEdit={handleEditTask}
          />
        ))}
        {ungrouped.length > 0 ? (
          <TaskBoard
            group={null}
            tasks={ungrouped}
            onEdit={handleEditTask}
          />
        ) : null}
      </ScrollView>
    );
  };

  const renderSimpleTasks = () => (
    <FlashList
      data={sortedTasks}
      keyExtractor={(item) => item.id}
      renderItem={renderTaskItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.listContainer}
      estimatedItemSize={90}
    />
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {tasks.length === 0 ? (
        <EmptyTasksState onCreateTask={() => setActiveDialog('addTask')} />
      ) : (
        <>
          <View style={styles.viewSwitch}>
            {(['board', 'grouped', 'list'] as ViewMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => setViewMode(mode)}
                style={[
                  styles.viewChip,
                  { borderColor: colors.border },
                  viewMode === mode && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    textStyles.caption,
                    { color: viewMode === mode ? colors.primaryForeground : colors.foregroundMuted },
                  ]}
                >
                  {mode === 'board' ? 'Board' : mode === 'grouped' ? 'Groups' : 'List'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {viewMode === 'board'
            ? renderBoards()
            : viewMode === 'grouped'
              ? renderGroupedTasks()
              : renderSimpleTasks()}
        </>
      )}

      <AddFab style={styles.fab} onPress={() => setActiveDialog('addTask')} />

      <AddTaskDialog
        visible={activeDialog === 'addTask'}
        taskGroups={taskGroups}
        onDismiss={() => setActiveDialog('none')}
        onConfirm={handleAddTask}
        onCreateGroup={handleAddGroup}
      />

      <EditTaskDialog
        visible={activeDialog === 'editTask'}
        task={selectedTask}
        taskGroups={taskGroups}
        onDismiss={() => { setActiveDialog('none'); setSelectedTask(null); }}
        onConfirm={handleUpdateTask}
        onDelete={() => setActiveDialog('deleteTask')}
        onCreateGroup={handleAddGroup}
        onMove={handleMoveTask}
      />

      <AddTaskGroupDialog
        visible={activeDialog === 'addGroup'}
        onDismiss={() => setActiveDialog('none')}
        onConfirm={handleAddGroup}
      />

      <DeleteConfirmationDialog
        visible={activeDialog === 'deleteTask'}
        title="Delete Task"
        message={`Are you sure you want to delete "${selectedTask?.name}"? This action cannot be undone.`}
        onDismiss={() => setActiveDialog('none')}
        onConfirm={handleDeleteTask}
      />

      <DeleteConfirmationDialog
        visible={activeDialog === 'deleteGroup'}
        title="Delete Task Group"
        message={`Are you sure you want to delete "${selectedGroup?.title}"? All tasks in this group will become ungrouped.`}
        onDismiss={() => setActiveDialog('none')}
        onConfirm={handleDeleteGroup}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingVertical: spacing[2],
  },
  viewSwitch: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },
  viewChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  boardScroll: {
    paddingTop: spacing[1],
    paddingBottom: spacing[8],
  },
  ungroupedHeader: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  fab: {
    position: 'absolute',
    margin: spacing[4],
    right: 0,
    bottom: 0,
  },
});

export default TasksScreen;
