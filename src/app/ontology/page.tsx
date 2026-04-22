/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getDealThesis,
  refreshDealThesis,
  PillarEvidence,
  SupportingEvidence,
  ContradictingEvidence,
  ThesisRisk,
  ThesisMetric,
  ThesisEntity,
} from "@/lib/api";
import EntityGraphView from "./EntityGraphView";

// ── Confidence badge ───────────────────────────────────────────────

const CONFIDENCE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Strong:    { bg: "bg-emerald-500/10 border border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-400" },
  Moderate:  { bg: "bg-yellow-500/10 border border-yellow-500/30",   text: "text-yellow-400",  dot: "bg-yellow-400"  },
  Weak:      { bg: "bg-orange-500/10 border border-orange-500/30",   text: "text-orange-400",  dot: "bg-orange-400"  },
  Contested: { bg: "bg-red-500/10 border border-red-500/30",         text: "text-red-400",     dot: "bg-red-400"     },
};

function ConfidenceBadge({ verdict, score }: { verdict: string; score: number }) {
  const s = CONFIDENCE_STYLES[verdict] ?? CONFIDENCE_STYLES.Moderate;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {verdict} · {score}%
    </span>
  );
}

// ── Severity badge ─────────────────────────────────────────────────

const SEV_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high:     "#f59e0b",
  medium:   "#0284c7",
  low:      "#6b7280",
};

function SeverityBadge({ severity }: { severity: string }) {
  const color = SEV_COLORS[severity] ?? SEV_COLORS.low;
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-medium"
      style={{ backgroundColor: `${color}18`, color }}
    >
      {severity}
    </span>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────

function PillarSkeleton() {
  return (
    <div className="bg-ontos-surface border border-ontos-border rounded-2xl p-6 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-ontos-border" />
        <div className="h-5 w-48 rounded bg-ontos-border" />
        <div className="h-5 w-24 rounded-full bg-ontos-border" />
      </div>
      <div className="h-4 w-full rounded bg-ontos-border/60" />
      <div className="h-4 w-3/4 rounded bg-ontos-border/60" />
      <div className="flex gap-2 mt-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-7 w-24 rounded-lg bg-ontos-border/40" />
        ))}
      </div>
    </div>
  );
}

// ── Tab types ──────────────────────────────────────────────────────

type TabId = "evidence" | "contradictions" | "risks" | "entities";

const TABS: { id: TabId; label: string }[] = [
  { id: "evidence",       label: "Supporting Evidence" },
  { id: "contradictions", label: "Contradictions"      },
  { id: "risks",          label: "Risks"               },
  { id: "entities",       label: "Key Entities"        },
];

// ── Supporting Evidence tab ────────────────────────────────────────

function EvidenceTab({ items }: { items: SupportingEvidence[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-ontos-muted py-4">No supporting evidence found in the document corpus for this pillar.</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((ev, i) => (
        <div key={i} className="bg-ontos-card rounded-xl p-3 border border-ontos-border/50">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] text-ontos-accent font-medium truncate max-w-[260px]">
              📄 {ev.document_name}{ev.page_number ? ` · p.${ev.page_number}` : ""}
            </span>
            <span className="ml-auto text-[10px] text-ontos-muted whitespace-nowrap">
              {Math.round(ev.relevance_score * 100)}% match
            </span>
          </div>
          <p className="text-[11px] text-ontos-muted leading-relaxed line-clamp-3">{ev.snippet}</p>
        </div>
      ))}
    </div>
  );
}

// ── Contradictions tab ─────────────────────────────────────────────

function ContradictionsTab({ items }: { items: ContradictingEvidence[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-ontos-muted py-4">No contradicting evidence found for this pillar.</p>;
  }
  return (
    <div className="space-y-3">
      {items.map((c) => (
        <div key={c.contradiction_id} className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
          <div className="font-medium text-sm text-red-300 mb-1">{c.title}</div>
          {c.description && <p className="text-[11px] text-ontos-muted mb-2">{c.description}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            {c.evidence_a && (
              <div className="bg-ontos-card rounded-lg p-2">
                <div className="text-[9px] uppercase tracking-wider text-ontos-muted mb-1">📄 {c.document_a_name}</div>
                <p className="text-[11px] text-ontos-muted line-clamp-2">{c.evidence_a}</p>
              </div>
            )}
            {c.evidence_b && (
              <div className="bg-ontos-card rounded-lg p-2">
                <div className="text-[9px] uppercase tracking-wider text-ontos-muted mb-1">📄 {c.document_b_name}</div>
                <p className="text-[11px] text-ontos-muted line-clamp-2">{c.evidence_b}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Risks tab ──────────────────────────────────────────────────────

function RisksTab({ items }: { items: ThesisRisk[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (items.length === 0) {
    return <p className="text-xs text-ontos-muted py-4">No risks flagged for this pillar's categories.</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((r) => (
        <div key={r.id} className="bg-ontos-card border border-ontos-border/50 rounded-xl overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === r.id ? null : r.id)}
            className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-ontos-surface transition-colors"
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SEV_COLORS[r.severity] ?? SEV_COLORS.low }} />
            <span className="text-xs font-medium flex-1 text-left">{r.title}</span>
            <SeverityBadge severity={r.severity} />
            <span className="text-[10px] px-2 py-0.5 rounded bg-ontos-border/40 text-ontos-muted">{r.category}</span>
            <svg className={`w-3.5 h-3.5 text-ontos-muted transition-transform ${expanded === r.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expanded === r.id && (
            <div className="px-3 pb-3 border-t border-ontos-border/40 pt-2 space-y-2">
              {r.description && <p className="text-[11px] text-ontos-muted leading-relaxed">{r.description}</p>}
              {r.mitigation && (
                <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-2">
                  <div className="text-[9px] uppercase tracking-wider text-emerald-400 mb-1">Mitigation</div>
                  <p className="text-[11px] text-ontos-muted">{r.mitigation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Entities tab ───────────────────────────────────────────────────

function EntitiesTab({ items }: { items: ThesisEntity[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-ontos-muted py-4">No key entities matched this pillar's keywords.</p>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {items.map((e) => (
        <div key={e.id} className="bg-ontos-card border border-ontos-border/50 rounded-xl p-3 flex items-start gap-2">
          <span className="w-2 h-2 rounded-full bg-ontos-accent mt-1.5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium">{e.name}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-ontos-border text-ontos-muted uppercase tracking-wider">{e.type}</span>
              <span className="text-[9px] text-ontos-muted ml-auto">{e.mention_count} mentions</span>
            </div>
            {e.description && (
              <p className="text-[10px] text-ontos-muted mt-0.5 line-clamp-2">{e.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Metrics strip ──────────────────────────────────────────────────

function MetricsStrip({ metrics }: { metrics: ThesisMetric[] }) {
  if (metrics.length === 0) return null;
  // Deduplicate: show one row per (metric_name, period) combo, prefer first
  const seen = new Set<string>();
  const deduped = metrics.filter(m => {
    const k = `${m.metric_name}:${m.period}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 7);

  return (
    <div className="mt-4 pt-4 border-t border-ontos-border/40">
      <div className="text-[9px] uppercase tracking-wider text-ontos-muted mb-2">Financial Metrics</div>
      <div className="flex flex-wrap gap-2">
        {deduped.map((m, i) => (
          <div key={i} className="bg-ontos-card border border-ontos-border/50 rounded-lg px-3 py-1.5">
            <div className="text-[9px] uppercase tracking-wider text-ontos-muted">{m.metric_name} · {m.period}</div>
            <div className="text-sm font-semibold text-ontos-accent">{m.formatted_value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pillar card ────────────────────────────────────────────────────

const PILLAR_ICONS = ["🏙️", "⚡", "🚀"];

function PillarCard({ data }: { data: PillarEvidence }) {
  const [activeTab, setActiveTab] = useState<TabId>("evidence");
  const { pillar, supporting_evidence, contradicting_evidence, related_risks, key_metrics, related_entities, confidence_score, confidence_verdict } = data;

  const tabCounts: Record<TabId, number> = {
    evidence:       supporting_evidence.length,
    contradictions: contradicting_evidence.length,
    risks:          related_risks.length,
    entities:       related_entities.length,
  };

  return (
    <div className="bg-ontos-surface border border-ontos-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-ontos-accent/10 border border-ontos-accent/20 flex items-center justify-center text-xl flex-shrink-0">
            {PILLAR_ICONS[pillar.pillar_number - 1] ?? "📌"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] uppercase tracking-[0.15em] text-ontos-muted font-medium">
                Pillar {pillar.pillar_number}
              </span>
              <h2 className="text-lg font-semibold tracking-tight">{pillar.title}</h2>
              <ConfidenceBadge verdict={confidence_verdict} score={confidence_score} />
            </div>
            <p className="text-sm text-ontos-muted mt-2 leading-relaxed italic">{pillar.hypothesis}</p>
          </div>
        </div>

        {/* Success criteria */}
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wider text-ontos-muted mb-2">Success Criteria</div>
          <ul className="space-y-1">
            {pillar.success_criteria.map((sc, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-ontos-muted">
                <span className="text-ontos-accent mt-0.5 flex-shrink-0">✓</span>
                {sc}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-ontos-border/60 px-6 pt-3">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-ontos-accent/15 text-ontos-accent-bright font-medium"
                  : "text-ontos-muted hover:text-ontos-text hover:bg-ontos-card"
              }`}
            >
              {tab.label}
              {tabCounts[tab.id] > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? "bg-ontos-accent/25 text-ontos-accent-bright" : "bg-ontos-border text-ontos-muted"
                }`}>
                  {tabCounts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6 pt-4">
        {activeTab === "evidence"       && <EvidenceTab       items={supporting_evidence}   />}
        {activeTab === "contradictions" && <ContradictionsTab items={contradicting_evidence} />}
        {activeTab === "risks"          && <RisksTab          items={related_risks}          />}
        {activeTab === "entities"       && <EntitiesTab       items={related_entities}       />}

        <MetricsStrip metrics={key_metrics} />
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────

type ViewMode = "thesis" | "graph";

export default function ThesisValidationPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("thesis");
  const [pillars, setPillars] = useState<PillarEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchThesis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDealThesis();
      setPillars(data);
    } catch (e: any) {
      setError(e.message ?? "Failed to load thesis data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchThesis(); }, [fetchThesis]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshDealThesis();
      await fetchThesis();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-ontos-muted text-xs uppercase tracking-[0.15em] mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-ontos-accent" />
              {viewMode === "thesis" ? "Investment Thesis" : "Entity Graph"}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {viewMode === "thesis" ? "Deal Thesis Validation" : "Ontology Entity Graph"}
            </h1>
            <p className="text-ontos-muted mt-2 text-sm max-w-2xl">
              {viewMode === "thesis"
                ? "Three investment pillars tested against 215 VDR documents — supporting evidence, contradictions, open risks, and confidence scoring derived from the deal corpus."
                : "Curated PE-relevant entity graph — 25 signal-strong nodes from 7,668 extracted entities, visualized by PE class with relationships."}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* View toggle */}
            <div className="flex items-center bg-ontos-surface border border-ontos-border rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("thesis")}
                className={`text-xs px-3 py-1.5 rounded-md transition-all ${
                  viewMode === "thesis"
                    ? "bg-ontos-accent/20 text-ontos-accent-bright font-medium"
                    : "text-ontos-muted hover:text-ontos-text"
                }`}
              >
                📋 Thesis
              </button>
              <button
                onClick={() => setViewMode("graph")}
                className={`text-xs px-3 py-1.5 rounded-md transition-all ${
                  viewMode === "graph"
                    ? "bg-ontos-accent/20 text-ontos-accent-bright font-medium"
                    : "text-ontos-muted hover:text-ontos-text"
                }`}
              >
                🕸 Entity Graph
              </button>
            </div>
            {viewMode === "thesis" && (
              <button
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className="text-xs px-4 py-2 bg-ontos-surface border border-ontos-border rounded-lg text-ontos-muted hover:text-ontos-text hover:border-ontos-accent/40 transition-all disabled:opacity-40"
              >
                {refreshing ? "Refreshing…" : "↻ Refresh Analysis"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Entity Graph view */}
      {viewMode === "graph" && <EntityGraphView />}

      {/* Thesis content — only when thesis view is active */}
      {/* Thesis statement */}
      {viewMode === "thesis" && !loading && pillars.length > 0 && (
        <div className="bg-ontos-accent/5 border border-ontos-accent/20 rounded-xl p-5 animate-fade-up">
          <div className="text-xs uppercase tracking-wider text-ontos-accent font-medium mb-3">Investment Thesis — EVON $80M Acquisition of Desert Cab</div>
          <p className="text-sm text-ontos-muted leading-relaxed mb-4">
            EVON's acquisition is predicated on three compounding value drivers:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {pillars.map((p) => (
              <div key={p.pillar.id} className="flex items-center gap-3 bg-ontos-surface border border-ontos-border rounded-lg px-3 py-2.5">
                <span className="text-lg">{PILLAR_ICONS[p.pillar.pillar_number - 1]}</span>
                <div>
                  <div className="text-xs font-semibold">{p.pillar.title}</div>
                  <ConfidenceBadge verdict={p.confidence_verdict} score={p.confidence_score} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {viewMode === "thesis" && loading && (
        <div className="space-y-6">
          <PillarSkeleton />
          <PillarSkeleton />
          <PillarSkeleton />
        </div>
      )}

      {/* Error state */}
      {viewMode === "thesis" && error && !loading && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-sm text-red-400 mb-3">{error}</p>
          <button onClick={fetchThesis} className="text-xs px-4 py-2 bg-ontos-accent text-white rounded-lg hover:bg-ontos-accent-bright transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* Pillar cards */}
      {viewMode === "thesis" && !loading && !error && pillars.length > 0 && (
        <div className="space-y-6">
          {pillars.map((p) => (
            <PillarCard key={p.pillar.id} data={p} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {viewMode === "thesis" && !loading && !error && pillars.length === 0 && (
        <div className="bg-ontos-surface border border-ontos-border rounded-xl p-12 text-center">
          <p className="text-ontos-muted text-sm">No thesis pillars found. The seed script may not have run.</p>
        </div>
      )}
    </div>
  );
}
