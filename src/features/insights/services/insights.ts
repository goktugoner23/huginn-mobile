/**
 * Insights module — reads the same /api/insights routes huginn-external already
 * serves. The WEB module queries Postgres directly from the Next server, so its
 * services file is not the contract to copy; huginn-external's own routes and
 * types are. Shapes mirror huginn-external/src/modules/v1.0/insights/types.ts.
 */

import { api } from '@shared/services/api/httpClient';

export type InsightPeriodType = 'monthly' | 'weekly' | 'yearly';
export type InsightScope = 'transactions';

export interface InsightPeriod {
  start: string;
  end: string;
  label: string;
  previousStart: string;
  previousEnd: string;
}

export interface CurrencyTotals {
  currency: string;
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
}

export interface CategoryTotal {
  category: string;
  currency: string;
  total: number;
  pctOfExpense: number;
}

export interface NotableTransaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  reason: 'largest_expense' | 'largest_income';
}

export interface TransactionMetrics {
  period: InsightPeriod;
  byCurrency: CurrencyTotals[];
  topExpenseCategories: CategoryTotal[];
  topIncomeSources: { category: string; currency: string; total: number }[];
  dailySeries: { date: string; expense: number; income: number }[];
  comparisonToPrevious: {
    expenseChangePctByCurrency: Record<string, number>;
    incomeChangePctByCurrency: Record<string, number>;
    risingCategories: { category: string; currency: string; changePct: number; currentTotal: number }[];
    fallingCategories: { category: string; currency: string; changePct: number; currentTotal: number }[];
  };
  notableTransactions: NotableTransaction[];
  streaks: { longestNoSpendDays: number };
}

export interface NarrativeSection {
  title: string;
  body: string;
  chart: 'monthly_trend' | 'category_breakdown' | null;
}

export interface InsightNarrative {
  headline: string;
  deck: string;
  pullQuote: string;
  sections: NarrativeSection[];
  toneTags: string[];
}

export interface InsightReport {
  id: number;
  scope: InsightScope;
  periodType: InsightPeriodType;
  periodStart: string;
  periodEnd: string;
  metrics: TransactionMetrics;
  narrative: InsightNarrative;
  modelUsed: string | null;
  generatedAt: string;
}

export function listInsights(opts?: {
  scope?: InsightScope;
  periodType?: InsightPeriodType;
  limit?: number;
  offset?: number;
}) {
  return api.get<InsightReport[]>('/api/insights', {
    searchParams: {
      scope: opts?.scope,
      periodType: opts?.periodType,
      limit: opts?.limit,
      offset: opts?.offset,
    },
  });
}

export function getInsight(id: number) {
  return api.get<InsightReport>(`/api/insights/${id}`);
}

/** Generation calls an LLM server-side and can take a while. */
export function generateInsight(body?: unknown) {
  return api.post<InsightReport>('/api/insights/generate', body, { timeoutMs: 120_000 });
}
