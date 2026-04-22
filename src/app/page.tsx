/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import Link from "next/link";
import { getDeal, getStats, getRisks, getEntities, getCanonicalMetrics, getDealSummary } from "@/lib/api";

function SeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "#ef4444", high: "#f59e0b", medium: "#0284c7", low: "#6b7280",
  };
  return <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: colors[severity] || "#6b7280" }} />;
}

export default async function DealOverview() {
  const [deal, stats, risks, entities, canonicalMetrics, summary] = await Promise.all([
    getDeal().catch(() => null),
    getStats().catch(() => null),
    getRisks().catch(() => []),
    getEntities().catch(() => []),
    getCanonicalMetrics().catch(() => []),
    getDealSummary().catch(() => null),
  ]);

  const docCount = deal?.stats?.document_count ?? stats?.processing?.total_documents ?? 214;
  const riskCount = deal?.stats?.risk_count ?? risks.length ?? 0;
  const contradictionCount = deal?.stats?.contradiction_count ?? 0;
  const processingPct = stats?.processing ? Math.round(stats.processing.average_progress * 100) : 0;
  const totalDocs = stats?.processing?.total_documents ?? docCount;

  const severityCounts = stats?.risks_by_severity ?? {};


  // Phase 3: Use canonical metrics for hero display
  // Phase 5: Hero metrics come from the pipeline-computed summary
  // The pipeline decides what to display. The frontend just renders it.
  const heroMetrics = summary?.hero_metrics ?? [];
  const executiveSummary = summary?.executive_summary ?? null;
  const validationStatus = summary?.validation_status ?? 'pending';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <div className="flex items-center gap-2 text-ontos-muted text-xs uppercase tracking-[0.15em] mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-ontos-accent" />
          PE Deal Analysis Platform
        </div>
        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-ontos-text">
          Project EVON — Desert Cab Acquisition
        </h1>
        <p className="text-ontos-muted mt-2 text-sm max-w-2xl">
          Ontological intelligence analysis across {docCount} VDR documents.
          Transportation fleet and EV charging infrastructure — Las Vegas, Nevada.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {["Transportation", "EV Infrastructure", "Fleet Operations", "Las Vegas Market"].map((cat) => (
            <span key={cat} className="text-[10px] px-2.5 py-1 rounded-full bg-ontos-surface border border-ontos-border text-ontos-muted uppercase tracking-wider">
              {cat}
            </span>
          ))}
        </div>
      </div>

      {/* Executive Summary + Deal Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up animation-delay-150">
        <div className="lg:col-span-2 bg-ontos-surface border border-ontos-border rounded-xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ontos-muted mb-4">Executive Summary</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-[10px] text-ontos-muted uppercase tracking-wider mb-1">Target</div>
              <div className="text-sm font-medium">Desert Cab / EVON Technologies</div>
            </div>
            <div>
              <div className="text-[10px] text-ontos-muted uppercase tracking-wider mb-1">Sector</div>
              <div className="text-sm font-medium">Transportation & EV Infrastructure</div>
            </div>
            <div>
              <div className="text-[10px] text-ontos-muted uppercase tracking-wider mb-1">Market</div>
              <div className="text-sm font-medium">Las Vegas, NV (regulated taxi + EV charging)</div>
            </div>
            <div>
              <div className="text-[10px] text-ontos-muted uppercase tracking-wider mb-1">Total Capital Need</div>
              <div className="text-sm font-medium">${(deal?.deal_size ?? 80000000).toLocaleString()}</div>
            </div>
          </div>
          <p className="text-xs text-ontos-muted leading-relaxed">
            {executiveSummary ?? `Project EVON is an $80M 3-way merger combining regulated taxi operations (750+ medallions, 90%+ LV market share), proprietary fleet technology (Kaptyn SaaS), and EV charging infrastructure into a vertically integrated mobility platform. The business has grown consistently for over 30 years. Consolidated FY2025 proforma: $62.6M revenue / $15.0M EBITDA (Year 1 run rate), scaling significantly by 2029. Key value drivers include Uber partnership, AV/robotaxi transition, and EV charging buildout.`}
          </p>
          {executiveSummary && (
            <div className="mt-2 text-[9px] text-ontos-muted/50 italic">Pipeline-generated summary based on {summary?.parsed_documents ?? 0} analyzed documents</div>
          )}
        </div>

        {/* Pipeline Status + Validation Card */}
        <div className="bg-ontos-surface border border-ontos-border rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] text-ontos-muted uppercase tracking-wider">Pipeline Status</div>
            {validationStatus !== 'pending' && (
              <div className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                validationStatus === 'pass' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                validationStatus === 'pass_with_warnings' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {validationStatus === 'pass' ? '✓ Validated' : validationStatus === 'pass_with_warnings' ? '⚠ Warnings' : '✗ Issues Found'}
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-ontos-accent">{processingPct}%</div>
              <div className="text-xs text-ontos-muted mt-1">Processing Complete</div>
            </div>
            <div className="w-full h-2 bg-ontos-card rounded-full overflow-hidden mb-3">
              <div className="h-full bg-ontos-accent rounded-full transition-all" style={{ width: `${processingPct}%` }} />
            </div>
            <div className="space-y-2">
              {stats?.documents_by_status && Object.entries(stats.documents_by_status).map(([status, count]) => (
                <div key={status} className="flex justify-between text-xs">
                  <span className="text-ontos-muted capitalize">{status}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs pt-2 border-t border-ontos-border">
                <span className="text-ontos-muted">Total Documents</span>
                <span className="font-medium">{totalDocs}</span>
              </div>
              {summary?.validation_checks && summary.validation_checks.length > 0 && (
                <div className="pt-2 mt-2 border-t border-ontos-border">
                  <div className="text-[9px] text-ontos-muted uppercase tracking-wider mb-1.5">Validation ({summary.validation_checks.filter((c: any) => c.status === 'pass').length}/{summary.validation_checks.length} passing)</div>
                  {summary.validation_checks.slice(0, 5).map((c: any) => (
                    <div key={c.check_id} className="flex items-center gap-1.5 text-[10px] py-0.5">
                      <span>{c.status === 'pass' ? '\u2705' : c.status === 'warning' ? '\u26a0\ufe0f' : '\u274c'}</span>
                      <span className="text-ontos-muted truncate">{c.check_name}</span>
                    </div>
                  ))}
                  {summary.validation_checks.length > 5 && (
                    <div className="text-[9px] text-ontos-muted/50 mt-1">+{summary.validation_checks.length - 5} more checks</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics — Rod's corrected numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-up animation-delay-300">
        {[
            ...(heroMetrics.length > 0 
              ? heroMetrics.filter((m: any) => m.key !== 'risk_summary' && m.key !== 'doc_coverage').map((m: any) => ({
                  label: m.label,
                  value: m.formatted_value,
                  sub: 'Source: ' + m.source_doc_name,
                  color: m.key === 'revenue' || m.key === 'gross_profit' ? '#6366f1' : m.key === 'ebitda' ? '#22c55e' : m.key === 'deal_size' ? '#818cf8' : '#f59e0b',
                }))
              : [
                  { label: 'Revenue (FY2025)', value: '$62.6M', sub: 'Financial Model', color: '#6366f1' },
                  { label: 'EBITDA (Year 1)', value: '$15M+', sub: 'CIM Mar 2026', color: '#22c55e' },
                  { label: 'Fleet Size', value: '750+', sub: 'Post-acquisition', color: '#f59e0b' },
                  { label: 'Capital Ask', value: '$80M', sub: '3-way merger', color: '#818cf8' },
                ]
            ),
          ].map((metric) => (
          <div key={metric.label} className="bg-ontos-surface border border-ontos-border rounded-xl p-4 lg:p-5">
            <div className="text-[10px] uppercase tracking-[0.15em] text-ontos-muted font-medium">{metric.label}</div>
            <div className="text-2xl lg:text-3xl font-semibold mt-1 tracking-tight" style={{ color: metric.color }}>
              {metric.value}
            </div>
            <div className="text-xs text-ontos-muted mt-0.5">{metric.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="animate-fade-up animation-delay-450">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ontos-muted mb-4">Analysis Sections</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Valuation", href: "/valuation", desc: "Financial model analysis" },
            { label: "Red Flags", href: "/risks", desc: `${riskCount} findings` },
            { label: "Comparables", href: "/comps", desc: "Zoox, Waymo, Revel" },
            { label: "Due Diligence", href: "/documents", desc: `${docCount} documents` },
          ].map((section) => (
            <Link
              key={section.label}
              href={section.href}
              className="bg-ontos-surface border border-ontos-border rounded-xl p-4 hover:border-ontos-accent/30 transition-all group"
            >
              <h3 className="text-sm font-semibold group-hover:text-ontos-accent-bright transition-colors">{section.label}</h3>
              <p className="text-[10px] text-ontos-muted mt-1">{section.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Summary */}
        <div className="bg-ontos-surface border border-ontos-border rounded-xl p-5 animate-fade-up animation-delay-600">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ontos-muted">Risk Summary</h2>
            <Link href="/risks" className="text-xs text-ontos-accent hover:text-ontos-accent-bright transition-colors">View all</Link>
          </div>
          {riskCount > 0 ? (
            <div className="space-y-3">
              {(["critical", "high", "medium"] as const).map((sev) => (
                <div key={sev} className="flex items-center gap-3">
                  <SeverityDot severity={sev} />
                  <span className="text-xs text-ontos-muted flex-1 uppercase">{sev}</span>
                  <span className="text-sm font-semibold">{severityCounts[sev] ?? 0}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-ontos-border">
                <div className="flex justify-between text-xs">
                  <span className="text-ontos-muted">Contradictions</span>
                  <span className="font-medium">{contradictionCount}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="text-ontos-muted text-xs">Pipeline processing — risks will appear as documents are analyzed</div>
              <div className="w-8 h-8 mx-auto mt-3 border-2 border-ontos-accent/30 border-t-ontos-accent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Entity Summary */}
        <div className="bg-ontos-surface border border-ontos-border rounded-xl p-5 animate-fade-up animation-delay-750">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ontos-muted">Entities</h2>
            <Link href="/ontology" className="text-xs text-ontos-accent hover:text-ontos-accent-bright transition-colors">View all</Link>
          </div>
          {entities.length > 0 ? (
            <div className="space-y-2">
              {entities.slice(0, 8).map((entity) => (
                <div key={entity.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-ontos-card transition-colors">
                  <span className="w-2.5 h-2.5 rounded-full bg-ontos-accent flex-shrink-0" />
                  <span className="text-xs flex-1 truncate">{entity.name}</span>
                  <span className="text-[10px] text-ontos-muted">{entity.type}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="text-ontos-muted text-xs">Entity extraction in progress</div>
              <div className="w-8 h-8 mx-auto mt-3 border-2 border-ontos-accent/30 border-t-ontos-accent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Data Confidence */}
        <div className="bg-ontos-surface border border-ontos-border rounded-xl p-5 animate-fade-up animation-delay-900">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ontos-muted mb-4">Data Confidence</h2>
          <div className="space-y-3">
            {[
              { tier: "Sworn", range: "0.95-1.0", desc: "Tax returns, notarized", color: "#22c55e" },
              { tier: "Audited", range: "0.85-0.94", desc: "Third-party reviewed", color: "#3b82f6" },
              { tier: "Prepared", range: "0.70-0.84", desc: "Company financials", color: "#818cf8" },
              { tier: "Projected", range: "0.50-0.69", desc: "Models, budgets", color: "#f59e0b" },
              { tier: "Marketing", range: "0.30-0.49", desc: "CIM, presentations", color: "#f97316" },
              { tier: "Unclassified", range: "0.0-0.29", desc: "Scanned documents", color: "#ef4444" },
            ].map((t) => (
              <div key={t.tier} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-xs flex-1" style={{ color: t.color }}>{t.tier}</span>
                <span className="text-[10px] text-ontos-muted font-mono">{t.range}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
