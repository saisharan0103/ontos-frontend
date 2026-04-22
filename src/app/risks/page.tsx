"use client";

import { useState, useEffect } from "react";
import {
  getRisks,
  getRiskSummary,
  getContradictions,
  getRuleActions,
  Risk,
  Contradiction,
  RuleAction,
  RiskSummary,
  ValidationStatus,
} from "@/lib/api";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#0284c7",
  low: "#6b7280",
};

const SEVERITY_ORDER = ["critical", "high", "medium", "low"];

const STATUS_LABELS: Record<ValidationStatus, string> = {
  real: "Real",
  thesis_feature: "Thesis Feature",
  boilerplate: "Boilerplate",
  hallucinated: "Hallucinated",
  operational_data: "Operational Data",
};

const STATUS_COLORS: Record<ValidationStatus, string> = {
  real: "#10b981",
  thesis_feature: "#8b5cf6",
  boilerplate: "#6b7280",
  hallucinated: "#ef4444",
  operational_data: "#f97316",
};

const SCOPE_LABELS: Record<string, { label: string; color: string }> = {
  deal_level: { label: "Deal-level", color: "#0ea5e9" },
  subsidiary: { label: "Subsidiary", color: "#8b5cf6" },
  counterparty: { label: "Counterparty", color: "#f59e0b" },
  real_estate: { label: "Real estate", color: "#14b8a6" },
};

function scopeBadge(scope?: string | null, entity?: string | null) {
  if (!scope) return null;
  const meta = SCOPE_LABELS[scope] ?? { label: scope, color: "#6b7280" };
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-medium"
      style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
      title={entity ? `Affected entity: ${entity}` : 'Deal-level finding'}
    >
      {entity ? `${meta.label}: ${entity}` : meta.label}
    </span>
  );
}

function classifyBadge(status?: string | null) {
  if (!status) return null;
  const s = status as ValidationStatus;
  const color = STATUS_COLORS[s] ?? "#6b7280";
  const label = STATUS_LABELS[s] ?? status;
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-medium"
      style={{ backgroundColor: `${color}15`, color }}
    >
      {label}
    </span>
  );
}

export default function RisksPage() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [contradictions, setContradictions] = useState<Contradiction[]>([]);
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);
  const [ruleActions, setRuleActions] = useState<RuleAction[]>([]);
  const [auditMode, setAuditMode] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getRisks({ audit: auditMode }).catch(() => []),
      getContradictions().catch(() => []),
      getRiskSummary({ audit: auditMode }).catch(() => null),
      getRuleActions().catch(() => []),
    ]).then(([r, c, s, ra]) => {
      setRisks(r);
      setContradictions(c);
      setSummary(s);
      setRuleActions(ra);
      setLoading(false);
    });
  }, [auditMode]);

  // Sort + filter
  const filteredRisks = risks.filter((r) => {
    // Use adjusted_severity if present, else severity
    const sev = r.adjusted_severity ?? r.severity;
    if (filterSeverity && sev !== filterSeverity) return false;
    if (filterStatus && r.validation_status !== filterStatus) return false;
    return true;
  });
  const sortedRisks = [...filteredRisks].sort((a, b) => {
    const sa = a.adjusted_severity ?? a.severity;
    const sb = b.adjusted_severity ?? b.severity;
    return SEVERITY_ORDER.indexOf(sa) - SEVERITY_ORDER.indexOf(sb);
  });

  const totalRaw = summary?.total_raw ?? risks.length;
  const totalSuppressed = summary?.suppressed ?? 0;
  const validationCounts = summary?.by_validation_status ?? {};

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <div className="flex items-center gap-2 text-ontos-muted text-xs uppercase tracking-[0.15em] mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-severity-critical" />
          Risk Analysis
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Red Flags & Risk Findings</h1>
        <p className="text-ontos-muted mt-2 text-sm">
          Risk signals identified across VDR documents — validated and classified.
        </p>
      </div>

      {/* Validation Notice */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15L15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <div className="text-sm font-medium text-emerald-400">Risk Validation Layer</div>
            <p className="text-xs text-ontos-muted mt-1">
              Every risk is classified into one of five buckets — <span className="text-emerald-400">real</span>,{" "}
              <span className="text-violet-400">thesis feature</span>, <span className="text-gray-400">boilerplate</span>,{" "}
              <span className="text-red-400">hallucinated</span>, or <span className="text-orange-400">operational data</span>.
              {totalSuppressed > 0 && (
                <>
                  {" "}
                  <strong className="text-ontos-text">{totalSuppressed}</strong> of{" "}
                  <strong className="text-ontos-text">{totalRaw}</strong> raw risks were suppressed as LLM hallucinations
                  or operational noise. Toggle audit mode to see the full raw register.
                </>
              )}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => setAuditMode(!auditMode)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                  auditMode
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    : "bg-ontos-card border-ontos-border text-ontos-muted hover:text-ontos-text"
                }`}
              >
                {auditMode ? `Audit mode — showing all ${totalRaw} raw risks` : `Show all ${totalRaw} raw risks (audit mode)`}
              </button>
              {Object.keys(validationCounts).length > 0 && (
                <div className="text-[11px] text-ontos-muted">
                  Classifications:{" "}
                  {Object.entries(validationCounts)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(" · ")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto border-2 border-severity-critical/30 border-t-severity-critical rounded-full animate-spin" />
            <p className="text-ontos-muted text-sm mt-4">Loading risk analysis...</p>
          </div>
        </div>
      ) : risks.length === 0 && contradictions.length === 0 ? (
        <div className="bg-ontos-surface border border-ontos-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-ontos-accent/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-ontos-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Risk Analysis In Progress</h3>
          <p className="text-ontos-muted text-sm max-w-md mx-auto">
            The pipeline is still processing documents. Risk signals and contradictions will appear here as they are identified.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-xs text-ontos-accent">
            <div className="w-4 h-4 border-2 border-ontos-accent/30 border-t-ontos-accent rounded-full animate-spin" />
            Processing...
          </div>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {SEVERITY_ORDER.map((sev) => {
                const count = summary.by_severity[sev] ?? 0;
                return (
                  <button
                    key={sev}
                    onClick={() => setFilterSeverity(filterSeverity === sev ? null : sev)}
                    className={`bg-ontos-surface border rounded-xl p-4 text-left transition-all ${
                      filterSeverity === sev ? "border-ontos-accent" : "border-ontos-border hover:border-ontos-accent/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[sev] }} />
                      <span className="text-[10px] uppercase tracking-wider text-ontos-muted">{sev}</span>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: SEVERITY_COLORS[sev] }}>{count}</div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Validation-status filter */}
          {Object.keys(validationCounts).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_LABELS) as ValidationStatus[]).map((st) => {
                const n = validationCounts[st] ?? 0;
                if (n === 0) return null;
                const active = filterStatus === st;
                return (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(active ? null : st)}
                    className={`text-[11px] px-3 py-1.5 rounded-full border transition ${
                      active ? "border-ontos-accent" : "border-ontos-border hover:border-ontos-accent/30"
                    }`}
                    style={{
                      backgroundColor: active ? `${STATUS_COLORS[st]}20` : undefined,
                      color: STATUS_COLORS[st],
                    }}
                  >
                    {STATUS_LABELS[st]} · {n}
                  </button>
                );
              })}
              {(filterStatus || filterSeverity) && (
                <button
                  onClick={() => {
                    setFilterStatus(null);
                    setFilterSeverity(null);
                  }}
                  className="text-[11px] px-3 py-1.5 rounded-full border border-ontos-border text-ontos-muted hover:text-ontos-text"
                >
                  Clear filters ({sortedRisks.length})
                </button>
              )}
            </div>
          )}

          {/* Risk list */}
          <div className="space-y-3">
            {sortedRisks.map((risk) => {
              const sev = risk.adjusted_severity ?? risk.severity;
              const sevChanged = risk.original_severity && risk.adjusted_severity && risk.original_severity !== risk.adjusted_severity;
              return (
                <div key={risk.id} className={`bg-ontos-surface border rounded-xl overflow-hidden ${risk.suppressed ? "border-dashed border-ontos-border/40 opacity-80" : "border-ontos-border"}`}>
                  <button
                    onClick={() => setExpandedRisk(expandedRisk === risk.id ? null : risk.id)}
                    className="w-full text-left p-4 flex items-start gap-3 hover:bg-ontos-card/50 transition-colors"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: SEVERITY_COLORS[sev] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold">{risk.title}</h3>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-medium"
                          style={{ backgroundColor: `${SEVERITY_COLORS[sev]}15`, color: SEVERITY_COLORS[sev] }}
                        >
                          {sev}
                          {sevChanged && (
                            <span className="text-ontos-muted ml-1">(was {risk.original_severity})</span>
                          )}
                        </span>
                        {classifyBadge(risk.validation_status)}
                        {scopeBadge(risk.affected_entity_scope, risk.affected_entity)}
                        {risk.source === 'rule_finding' && risk.rule_id && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-mono"
                            style={{ backgroundColor: '#10b98115', color: '#10b981' }}
                            title="Sourced from deterministic rule finding (Rod-style)"
                          >
                            {risk.rule_id}
                          </span>
                        )}
                        {risk.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-ontos-card text-ontos-muted">
                            {risk.category}
                          </span>
                        )}
                        {risk.suppressed && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 uppercase tracking-wider">
                            suppressed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ontos-muted mt-1 line-clamp-2">{risk.description}</p>
                      {risk.deal_implication && (
                        <p className="text-[11px] mt-2 leading-relaxed text-amber-300/90">
                          <span className="uppercase tracking-wider text-[9px] text-amber-400/70 mr-1.5">Why it matters:</span>
                          {risk.deal_implication}
                        </p>
                      )}
                    </div>
                    <svg
                      className={`w-4 h-4 text-ontos-muted transition-transform ${expandedRisk === risk.id ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedRisk === risk.id && (
                    <div className="px-4 pb-4 border-t border-ontos-border/50">
                      <div className="pt-3">
                        <p className="text-xs text-ontos-muted leading-relaxed">{risk.description}</p>

                        {/* Deal implication */}
                        {risk.deal_implication && (
                          <div className="mt-3">
                            <div className="text-[10px] uppercase tracking-wider text-ontos-muted mb-2">
                              Deal implication
                            </div>
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-[11px] text-amber-200/90 leading-relaxed">
                              {risk.deal_implication}
                            </div>
                          </div>
                        )}

                        {/* Affected entity scoping */}
                        {(risk.affected_entity || risk.affected_entity_scope) && (
                          <div className="mt-3">
                            <div className="text-[10px] uppercase tracking-wider text-ontos-muted mb-2">
                              Affected entity
                            </div>
                            <div className="bg-ontos-card rounded-lg p-3 text-[11px] text-ontos-muted leading-relaxed flex items-center gap-2 flex-wrap">
                              {scopeBadge(risk.affected_entity_scope, risk.affected_entity)}
                              {risk.affected_entity_scope === 'real_estate' && (
                                <span className="text-ontos-muted">— finding pertains to appraised real estate, not operating-deal EBITDA.</span>
                              )}
                              {risk.affected_entity_scope === 'counterparty' && (
                                <span className="text-ontos-muted">— finding pertains to a buyer / financier counterparty under the APA.</span>
                              )}
                              {risk.affected_entity_scope === 'subsidiary' && (
                                <span className="text-ontos-muted">— finding scoped to operating subsidiary.</span>
                              )}
                              {(!risk.affected_entity_scope || risk.affected_entity_scope === 'deal_level') && (
                                <span className="text-ontos-muted">— deal-level finding (applies across the target structure).</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Validation rationale */}
                        {risk.rationale && (
                          <div className="mt-3">
                            <div className="text-[10px] uppercase tracking-wider text-ontos-muted mb-2">
                              Validation rationale
                            </div>
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 text-[11px] text-ontos-muted leading-relaxed">
                              {risk.rationale}
                            </div>
                          </div>
                        )}

                        {risk.evidence && risk.evidence.length > 0 && (
                          <div className="mt-3">
                            <div className="text-[10px] uppercase tracking-wider text-ontos-muted mb-2">Evidence</div>
                            <div className="space-y-2">
                              {risk.evidence.map((ev, i) => (
                                <div key={i} className="bg-ontos-card rounded-lg p-3 text-[11px]">
                                  <div className="font-medium text-ontos-accent mb-1">📄 {ev.document_name} (p.{ev.page_number})</div>
                                  <p className="text-ontos-muted line-clamp-3">{ev.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Rule Actions */}
                        {(() => {
                          const actions = ruleActions.filter((a: RuleAction) => a.target_id === risk.id);
                          if (actions.length === 0) return null;
                          return (
                            <div className="mt-3">
                              <div className="text-[10px] uppercase tracking-wider text-ontos-muted mb-2">Rule Actions Applied</div>
                              <div className="space-y-1">
                                {actions.map((a: RuleAction, i: number) => (
                                  <div key={i} className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2 text-[11px]">
                                    <div className="font-medium text-amber-400">ℹ️ {a.rule_id}: {a.rule_name}</div>
                                    {a.original_severity && a.new_severity && (
                                      <div className="text-ontos-muted">Severity: {a.original_severity} → {a.new_severity}</div>
                                    )}
                                    <div className="text-ontos-muted mt-1">{a.reason}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Contradictions */}
          {contradictions.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ontos-muted mb-4">Contradictions</h2>
              <div className="space-y-3">
                {contradictions.map((c) => (
                  <div key={c.id} className="bg-ontos-surface border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-semibold">{c.title}</h3>
                        <p className="text-xs text-ontos-muted mt-1">{c.description}</p>
                        {c.evidence && c.evidence.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {c.evidence.map((ev, i) => (
                              <div key={i} className="text-[10px] text-ontos-muted">
                                📄 {ev.document_name} (p.{ev.page_number})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
