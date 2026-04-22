/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { getDeal, getDealSummary, queryDeal, getCanonicalMetrics, Deal, QueryResult, FinancialMetric } from "@/lib/api";

// Ground-truth fallbacks from EVON Financial Model Excel (Income Statement, FY2026-FY2032)
const EXCEL_FALLBACK: Record<string, { revenue: number; ebitda: number }> = {
  FY2026: { revenue: 62629549,  ebitda: 4977749  },
  FY2027: { revenue: 75454906,  ebitda: 26746600 },
  FY2028: { revenue: 92717345,  ebitda: 45542482 },
  FY2029: { revenue: 108816655, ebitda: 58702294 },
  FY2030: { revenue: 122533652, ebitda: 67361177 },
  FY2031: { revenue: 136423291, ebitda: 76767724 },
  FY2032: { revenue: 151326113, ebitda: 86845958 },
};
const YEARS = Object.keys(EXCEL_FALLBACK);

function fmt(v: number) {
  return v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(1)}M`
    : `$${(v / 1_000).toFixed(0)}K`;
}

export default function ValuationPage() {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [canonicalMetrics, setCanonicalMetrics] = useState<FinancialMetric[]>([]);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [querying, setQuerying] = useState(false);

  useEffect(() => {
    getDeal().then(setDeal).catch(() => null);
    getDealSummary().then(setSummary).catch(() => null);
    getCanonicalMetrics().then(setCanonicalMetrics).catch(() => []);
  }, []);

  // Pull hero metrics from pipeline summary
  const heroMetrics: any[] = summary?.hero_metrics ?? [];
  const revMetric = heroMetrics.find((m: any) => m.key === "revenue" || m.key === "gross_profit");
  const ebitdaMetric = heroMetrics.find((m: any) => m.key === "ebitda");

  const revenueDisplay = revMetric?.formatted_value ?? fmt(EXCEL_FALLBACK.FY2026.revenue);
  const ebitdaDisplay = ebitdaMetric?.formatted_value ?? fmt(EXCEL_FALLBACK.FY2026.ebitda);
  const revenueRaw = revMetric?.value ?? EXCEL_FALLBACK.FY2026.revenue;
  const ebitdaRaw = ebitdaMetric?.value ?? EXCEL_FALLBACK.FY2026.ebitda;
  const revPeriod = revMetric?.period ?? "FY2026";
  const dealSize = deal?.deal_size ?? 80000000;

  // Build period → {revenue, ebitda} lookup from canonical metrics
  // Fall back to Excel ground truth for any missing period
  const byPeriod: Record<string, { revenue: FinancialMetric | null; ebitda: FinancialMetric | null }> = {};
  for (const yr of YEARS) {
    byPeriod[yr] = { revenue: null, ebitda: null };
  }
  for (const m of canonicalMetrics) {
    if (!YEARS.includes(m.period)) continue;
    if (m.metric_name === "revenue" && !byPeriod[m.period].revenue) byPeriod[m.period].revenue = m;
    if (m.metric_name === "ebitda"  && !byPeriod[m.period].ebitda)  byPeriod[m.period].ebitda  = m;
  }

  function getRevenue(yr: string): string {
    const m = byPeriod[yr]?.revenue;
    if (m) return m.formatted_value ?? fmt(m.value);
    return fmt(EXCEL_FALLBACK[yr].revenue);
  }
  function getEbitda(yr: string): string {
    const m = byPeriod[yr]?.ebitda;
    if (m) return m.formatted_value ?? fmt(m.value);
    return fmt(EXCEL_FALLBACK[yr].ebitda);
  }
  function getRevRaw(yr: string): number {
    return byPeriod[yr]?.revenue?.value ?? EXCEL_FALLBACK[yr].revenue;
  }
  function getEbitdaRaw(yr: string): number {
    return byPeriod[yr]?.ebitda?.value ?? EXCEL_FALLBACK[yr].ebitda;
  }

  const runValuationQuery = async () => {
    setQuerying(true);
    try {
      const result = await queryDeal(
        "What are the key financial metrics from the EVON financial model? Include revenue, EBITDA, margins, and projections. Focus on the proforma financial model."
      );
      setQueryResult(result);
    } catch (e) {
      console.error(e);
    }
    setQuerying(false);
  };

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <div className="flex items-center gap-2 text-ontos-muted text-xs uppercase tracking-[0.15em] mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-ontos-accent" />
          Financial Analysis
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Valuation</h1>
        <p className="text-ontos-muted mt-2 text-sm">
          Financial metrics derived from the EVON Financial Model (proforma). Tax returns are deprioritized as they reflect tax-optimized figures.
        </p>
      </div>

      {/* Important notice */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <div className="text-sm font-medium text-amber-400">Data Source Notice</div>
            <p className="text-xs text-ontos-muted mt-1">
              Financial data is sourced from the EVON Financial Model (Excel proforma).
              FY2026 is the first operating year: {revenueDisplay} revenue, {ebitdaDisplay} EBITDA.
              Tax returns reflect tax-optimized numbers and do not represent actual operating performance.
            </p>
          </div>
        </div>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: revMetric?.label ?? `Revenue (${revPeriod})`, value: revenueDisplay, color: "#6366f1", source: revMetric?.source_doc_name ?? "Financial Model" },
          { label: ebitdaMetric?.label ?? `EBITDA (${revPeriod})`, value: ebitdaDisplay, color: "#22c55e", source: ebitdaMetric?.source_doc_name ?? "Financial Model" },
          { label: "EBITDA Margin", value: revenueRaw > 0 ? `${((ebitdaRaw / revenueRaw) * 100).toFixed(0)}%` : "8%", color: "#818cf8", source: "Calculated" },
          { label: "Deal Size", value: `$${(dealSize / 1e6).toFixed(0)}M`, color: "#f59e0b", source: "Deal Terms" },
        ].map((m) => (
          <div key={m.label} className="bg-ontos-surface border border-ontos-border rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-[0.15em] text-ontos-muted font-medium">{m.label}</div>
            <div className="text-2xl font-semibold mt-1" style={{ color: m.color }}>{m.value}</div>
            <div className="text-[10px] text-ontos-muted mt-0.5">Source: {m.source}</div>
          </div>
        ))}
      </div>

      {/* Projections — dynamic from API, falls back to Excel ground truth */}
      <div className="bg-ontos-surface border border-ontos-border rounded-xl p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ontos-muted mb-4">Revenue &amp; EBITDA Projections (FY2026–FY2032)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-ontos-border">
                <th className="text-left p-3 text-ontos-muted font-medium">Metric</th>
                {YEARS.map((yr) => (
                  <th key={yr} className="text-right p-3 text-ontos-muted font-medium">{yr}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-ontos-border/50">
                <td className="p-3 font-medium">Revenue</td>
                {YEARS.map((yr) => (
                  <td key={yr} className={`p-3 text-right${yr === "FY2026" ? " text-ontos-accent font-semibold" : ""}`}>
                    {getRevenue(yr)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-ontos-border/50">
                <td className="p-3 font-medium">EBITDA</td>
                {YEARS.map((yr) => (
                  <td key={yr} className={`p-3 text-right${yr === "FY2026" ? " text-green-400 font-semibold" : ""}`}>
                    {getEbitda(yr)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-ontos-border/50">
                <td className="p-3 font-medium">Margin</td>
                {YEARS.map((yr) => {
                  const rev = getRevRaw(yr);
                  const ebt = getEbitdaRaw(yr);
                  return (
                    <td key={yr} className="p-3 text-right">
                      {rev > 0 ? `${((ebt / rev) * 100).toFixed(0)}%` : "—"}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-ontos-muted mt-3">
          Source: EVON Financial Model (EVON_Financial_Model_03.25.26.xlsx) — Income Statement, rows 9 &amp; 24. All projections are management estimates.
        </p>
      </div>

      {/* Valuation Methods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            method: "EV/EBITDA Multiple",
            value: ebitdaRaw > 0 ? `${(dealSize / ebitdaRaw).toFixed(1)}x` : "16.1x",
            detail: `$${(dealSize / 1e6).toFixed(0)}M / ${ebitdaDisplay} FY2026 EBITDA`,
            verdict: "High entry — justified by ramp"
          },
          {
            method: "Revenue Multiple",
            value: revenueRaw > 0 ? `${(dealSize / revenueRaw).toFixed(1)}x` : "1.3x",
            detail: `$${(dealSize / 1e6).toFixed(0)}M / ${revenueDisplay} Revenue`,
            verdict: "Below market avg"
          },
          {
            method: "Implied FY2029 Exit",
            value: "12–15x",
            detail: `At ${getEbitda("FY2029")} EBITDA`,
            verdict: `$${(12 * getEbitdaRaw("FY2029") / 1e9).toFixed(1)}B–$${(15 * getEbitdaRaw("FY2029") / 1e9).toFixed(1)}B EV`
          },
        ].map((v) => (
          <div key={v.method} className="bg-ontos-surface border border-ontos-border rounded-xl p-5">
            <div className="text-[10px] uppercase tracking-wider text-ontos-muted mb-2">{v.method}</div>
            <div className="text-2xl font-bold text-ontos-accent">{v.value}</div>
            <div className="text-xs text-ontos-muted mt-1">{v.detail}</div>
            <div className="mt-2 text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 w-fit">{v.verdict}</div>
          </div>
        ))}
      </div>

      {/* AI Query Section */}
      <div className="bg-ontos-surface border border-ontos-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ontos-muted">AI Financial Analysis</h2>
          <button
            onClick={runValuationQuery}
            disabled={querying}
            className="text-xs px-4 py-2 bg-ontos-accent text-white rounded-lg hover:bg-ontos-accent-bright transition-colors disabled:opacity-50"
          >
            {querying ? "Analyzing..." : "Run Analysis"}
          </button>
        </div>
        {querying && (
          <div className="flex items-center gap-3 py-8 justify-center">
            <div className="w-8 h-8 border-2 border-ontos-accent/30 border-t-ontos-accent rounded-full animate-spin" />
            <span className="text-sm text-ontos-muted">Querying financial model data...</span>
          </div>
        )}
        {queryResult && !querying && (
          <div>
            <div className="prose prose-invert prose-sm max-w-none text-xs text-ontos-muted leading-relaxed whitespace-pre-wrap">
              {queryResult.answer}
            </div>
            {queryResult.sources.length > 0 && (
              <div className="mt-4 pt-4 border-t border-ontos-border">
                <div className="text-[10px] uppercase tracking-wider text-ontos-muted mb-2">Sources</div>
                <div className="space-y-1">
                  {queryResult.sources.slice(0, 3).map((s, i) => (
                    <div key={i} className="text-[10px] text-ontos-muted">
                      📄 {s.document_name} (p.{s.page_number}) — relevance: {(s.relevance * 100).toFixed(1)}%
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {!queryResult && !querying && (
          <p className="text-xs text-ontos-muted">Click &ldquo;Run Analysis&rdquo; to query the financial model data via RAG.</p>
        )}
      </div>
    </div>
  );
}
