/**
 * Tasks service — REST client against huginn-external `/api/tasks`.
 *
 * Mobile types (../types/Task) use string ids; backend uses numeric ids.
 * We coerce at the boundary: String(backendId) on read, Number(mobileId) on write.
 *
 * Exported names + signatures are preserved so screens/stores don't need changes.
 */

import { api } from '@shared/services/api/httpClient';
import { Task, TaskGroup, TaskStatus } from '@features/tasks/types/Task';
import { logger } from '@shared/utils/logger';

// ── Backend DTOs (snake_case, numeric ids) ──────────────────────────

interface BackendTask {
  id: number;
  name: string;
  description: string | null;
  completed: boolean;
  status?: TaskStatus;
  date: string;
  due_date: string | null;
  group_id: number | null;
  group_title?: string | null;
  group_color?: string | null;
}

interface BackendTaskGroup {
  id: number;
  title: string;
  color: string;
  description: string | null;
  created_at: string;
  is_completed: boolean;
}

interface TaskPayload {
  name: string;
  description: string;
  date: string;
  due_date: string;
  group_id: number | null;
}

interface TaskGroupPayload {
  title: string;
  color: string;
  description: string;
}

// ── Mappers ─────────────────────────────────────────────────────────

const fromBackendTask = (row: BackendTask): Task => ({
  id: String(row.id),
  name: row.name ?? '',
  description: row.description ?? undefined,
  completed: !!row.completed,
  // Rows written before the status column existed have none; fall back to the
  // boolean so a task never lands outside every board column.
  status:
    row.status === 'todo' || row.status === 'doing' || row.status === 'done'
      ? row.status
      : row.completed
        ? 'done'
        : 'todo',
  date: row.date ?? new Date().toISOString(),
  dueDate: row.due_date ?? undefined,
  groupId: row.group_id != null ? String(row.group_id) : undefined,
});

const toTaskPayload = (task: Task): TaskPayload => ({
  name: task.name,
  description: task.description ?? '',
  date: task.date ?? new Date().toISOString(),
  due_date: task.dueDate ?? '',
  group_id:
    task.groupId !== undefined && task.groupId !== null && task.groupId !== ''
      ? Number(task.groupId)
      : null,
});

const fromBackendGroup = (row: BackendTaskGroup): TaskGroup => ({
  id: String(row.id),
  title: row.title ?? '',
  description: row.description ?? undefined,
  color: row.color ?? '#1E40AF',
  createdAt: row.created_at ?? new Date().toISOString(),
  isCompleted: !!row.is_completed,
});

const toGroupPayload = (group: TaskGroup): TaskGroupPayload => ({
  title: group.title,
  color: group.color,
  description: group.description ?? '',
});

// A mobile id is "backend-persisted" iff it parses cleanly as a positive integer.
// Anything else (empty, uuid, Firestore auto-id) is treated as new → POST.
const isBackendId = (id: string | undefined | null): boolean => {
  if (id === undefined || id === null || id === '') return false;
  return /^\d+$/.test(id);
};

// ── Task CRUD ───────────────────────────────────────────────────────

export const getTasks = async (): Promise<Task[]> => {
  try {
    const rows = await api.get<BackendTask[]>('/api/tasks');
    return (rows ?? []).map(fromBackendTask);
  } catch (error) {
    logger.error('Error fetching tasks:', error);
    return [];
  }
};

export const saveTask = async (task: Task): Promise<Task> => {
  try {
    const payload = toTaskPayload(task);
    const row = isBackendId(task.id)
      ? await api.put<BackendTask>(`/api/tasks/${Number(task.id)}`, payload)
      : await api.post<BackendTask>('/api/tasks', payload);
    // Backend returns the persisted row (with server-assigned id on create).
    // Fall back to the input task only if the backend unexpectedly omits it.
    return row ? fromBackendTask(row) : task;
  } catch (error) {
    logger.error('Error saving task:', error);
    throw error;
  }
};

/**
 * Move a task to a board column. The API writes `completed` to match, so the
 * checklist views stay in step with the board.
 */
export const setTaskStatus = async (taskId: string, status: TaskStatus): Promise<Task | null> => {
  try {
    if (!isBackendId(taskId)) return null;
    const row = await api.patch<BackendTask>(`/api/tasks/${Number(taskId)}/status`, { status });
    return row ? fromBackendTask(row) : null;
  } catch (error) {
    logger.error('Error setting task status:', error);
    throw error;
  }
};

export const deleteTask = async (taskId: string): Promise<void> => {
  try {
    if (!isBackendId(taskId)) return;
    await api.delete<{ id: number }>(`/api/tasks/${Number(taskId)}`);
  } catch (error) {
    logger.error('Error deleting task:', error);
    throw error;
  }
};

// ── Task Group CRUD ────────────────────────────────────────────────

export const getTaskGroups = async (): Promise<TaskGroup[]> => {
  try {
    const rows = await api.get<BackendTaskGroup[]>('/api/tasks/groups');
    return (rows ?? []).map(fromBackendGroup);
  } catch (error) {
    logger.error('Error fetching task groups:', error);
    return [];
  }
};

export const saveTaskGroup = async (taskGroup: TaskGroup): Promise<TaskGroup> => {
  try {
    const payload = toGroupPayload(taskGroup);
    const row = isBackendId(taskGroup.id)
      ? await api.put<BackendTaskGroup>(`/api/tasks/groups/${Number(taskGroup.id)}`, payload)
      : await api.post<BackendTaskGroup>('/api/tasks/groups', payload);
    return row ? fromBackendGroup(row) : taskGroup;
  } catch (error) {
    logger.error('Error saving task group:', error);
    throw error;
  }
};

export const deleteTaskGroup = async (groupId: string): Promise<void> => {
  try {
    if (!isBackendId(groupId)) return;
    await api.delete<{ id: number }>(`/api/tasks/groups/${Number(groupId)}`);
  } catch (error) {
    logger.error('Error deleting task group:', error);
    throw error;
  }
};

// ── "Subscriptions" ────────────────────────────────────────────────
// TODO: replace with real-time updates (SSE/WebSocket) once huginn-external
// exposes them. For now we do a one-shot fetch and return a cancel function
// so callers can unmount safely.

export const subscribeToTasks = (callback: (tasks: Task[]) => void) => {
  let cancelled = false;
  getTasks()
    .then((rows) => {
      if (!cancelled) callback(rows);
    })
    .catch(() => {});
  return () => {
    cancelled = true;
  };
};

export const subscribeToTaskGroups = (callback: (taskGroups: TaskGroup[]) => void) => {
  let cancelled = false;
  getTaskGroups()
    .then((rows) => {
      if (!cancelled) callback(rows);
    })
    .catch(() => {});
  return () => {
    cancelled = true;
  };
};
