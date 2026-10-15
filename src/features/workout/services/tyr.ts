/**
 * Tyr — workout coach and diet correlation.
 *
 * Mirrors huginn-webapp's src/modules/v1.0/tyr/services/index.ts against the
 * same huginn-external routes (/api/tyr/correlation, /summary, /coach/run-now).
 * Coach notes are workout_notes rows whose title starts with "Tyr coach"; the
 * web client filters them the same way rather than adding a listing endpoint.
 */

import { api } from '@shared/services/api/httpClient';

export interface CorrelationDay {
  date: string;
  kcal: number;
  volumeKg: number;
  sessions: number;
  topLiftKg: number | null;
}

export interface CorrelationSeries {
  daily: CorrelationDay[];
}

export interface ExerciseSummary {
  exerciseName: string;
  muscleGroup: string | null;
  sessions: number;
  totalVolumeKg: number;
  maxWeightKg: number;
  trendSlope: number | null;
}

export interface MuscleGroupSummary {
  muscleGroup: string;
  sessions: number;
  totalVolumeKg: number;
}

export interface RecentSummary {
  weeks: number;
  windowStart: string;
  windowEnd: string;
  exercises: ExerciseSummary[];
  muscleGroups: MuscleGroupSummary[];
  totalSessions: number;
  totalVolumeKg: number;
}

export interface CoachNote {
  id: number;
  title: string;
  content: string;
  kind: 'text' | 'markdown';
  createdAt: string;
  updatedAt: string;
}

export interface CoachRunResult {
  noteId: number | null;
  skipped: boolean;
  reason?: string;
}

export function getCorrelation(weeks?: number) {
  return api.get<CorrelationSeries>('/api/tyr/correlation', {
    searchParams: weeks ? { weeks } : undefined,
  });
}

export function getSummary(weeks?: number) {
  return api.get<RecentSummary>('/api/tyr/summary', {
    searchParams: weeks ? { weeks } : undefined,
  });
}

export async function getCoachNotes(): Promise<CoachNote[]> {
  const all = await api.get<CoachNote[]>('/api/workout/notes');
  return all.filter((n) => typeof n.title === 'string' && n.title.startsWith('Tyr coach'));
}

export function runCoachNow() {
  return api.post<CoachRunResult>('/api/tyr/coach/run-now');
}
