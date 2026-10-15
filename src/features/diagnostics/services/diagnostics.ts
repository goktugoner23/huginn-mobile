/**
 * Diagnostics module — mirrors huginn-webapp/src/modules/v1.0/diagnostics.
 * Same endpoint and same ErrorLogEntry shape, so both clients read one contract.
 */

import { api } from '@shared/services/api/httpClient';

export interface ErrorLogEntry {
  id: number;
  created_at: string;
  service: string;
  level: 'error' | 'warn' | 'fatal';
  source: string | null;
  message: string;
  stack: string | null;
  context: Record<string, unknown> | null;
  conversation_id: string | null;
  request_id: string | null;
}

export function listErrors(opts?: { limit?: number; service?: string; level?: string }) {
  return api.get<ErrorLogEntry[]>('/api/diagnostics/errors', {
    searchParams: {
      limit: opts?.limit,
      service: opts?.service,
      level: opts?.level,
    },
  });
}

export function clearErrors(olderThanDays?: number) {
  return api.delete<{ deleted: number }>('/api/diagnostics/errors', {
    searchParams: { olderThanDays },
  });
}
