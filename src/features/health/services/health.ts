/**
 * Health module — reads the vitals routes added to huginn-external
 * (modules/v1.0/vitals/vitals.read.routes.ts) for exactly this purpose.
 *
 * The WEB health page queries vitals_samples directly from the Next server, so
 * it has no service file to copy. Shapes here mirror those routes, which in
 * turn mirror the webapp's SQL — all three stay in sync.
 */

import { api } from '@shared/services/api/httpClient';

export interface VitalsMetric {
  metric: string;
  units: string | null;
  qty: number | null;
  data: Record<string, unknown>;
  sampledAt: string;
  samples: number;
  /** Counters only: total of the latest day with data. */
  dayTotal: { day: string; total: number } | null;
}

export interface VitalsDay {
  day: string;
  avg: number;
  min: number;
  max: number;
  sum: number;
  n: number;
}

export interface VitalsSummary {
  lastReceivedAt: string | null;
  metrics: VitalsMetric[];
}

// Counters are summed per day (steps, energy); everything else is averaged
// (heart rate, weight). Must match the backend and the webapp copy.
const COUNTERS = /step_count|energy|distance|flights_climbed|exercise_time|stand_time|workout:/;
export const isCounter = (metric: string) => COUNTERS.test(metric);

export function listVitalsPersons() {
  return api.get<string[]>('/api/vitals/persons');
}

export function getVitalsSummary(person: string) {
  return api.get<VitalsSummary>('/api/vitals/summary', { searchParams: { person } });
}

export function getVitalsSeries(person: string, metric: string, days = 30) {
  return api.get<VitalsDay[]>('/api/vitals/series', {
    searchParams: { person, metric, days },
  });
}
