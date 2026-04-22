"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getCompiledOnto, type CompiledOntoResponse } from "@/lib/api";

// ─── classifyLine (ported from Rod v1 + extended for our serializer) ───

// Ontology-class names that should render as a distinct class-token color.
// Covers both the PE ontology's native classes and the synthetic subtypes the
// new ontology-driven compiler emits (TargetSubsidiary, HoldingCompany, etc.).
const ONTOLOGY_CLASS_NAMES = [
  // PE ontology — Organizations
  "TargetCompany",
  "TargetSubsidiary",
  "HoldingCompany",
  "RealEstateEntity",
  "PortfolioCompany",
  "Sponsor",
  "Lender",
  "Advisor",
  "Vendor",
  // PE ontology — People
  "Executive",
  "Shareholder",
  "KeyPerson",
  // PE ontology — other
  "FinancialPeriod",
  "Addback",
  "CustomerProfile",
  "Covenant",
  "DDWorkstream",
  "DDFinding",
  "DealDocument",
  "DealRisk",
  "TransactionStructure",
  "ValueCreationLever",
  // Financial (W4.D)
  "FinancialFigure",
  "FinancialAccount",
  // Documents (W4.D)
  "TaxReturn",
  "BankStatement",
  "LegalAgreement",
  "InsurancePolicy",
  "Appraisal",
  "InvestmentMemorandum",
  "ConsolidatedFinancial",
  "DiligenceReport",
  "EngineeringReport",
  "OperatingAgreement",
  "CorporateFiling",
  "FinancialModel",
  "UnclassifiedDocument",
  // Assets (W4.D)
  "Fleet",
  "Vehicle",
  "Medallion",
  "RealEstate",
  "ChargingInfrastructure",
  "Equipment",
  "Asset",
  // Foundation
  "LegalEntity",
  "Person",
  "Organization",
  "Entity",
  "Document",
  "Location",
  "Deal",
];
const CLASS_NAME_REGEX = new RegExp(`\\b(${ONTOLOGY_CLASS_NAMES.join("|")})\\b`, "g");

function classifyLine(line: string): string {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("# ")) return "comment";
  if (trimmed.startsWith("@")) return "annotation";
  if (/^(RULE|FINDING|CATALOG|IF|THEN|AND|OR|NOT|FOR|EACH|COMPUTE|ALERT|CREATE|SET|SUM|MAX|MIN|COUNT|ABS)\b/.test(trimmed)) return "keyword";
  if (/^\s+(RULE|FINDING|CATALOG|IF|THEN|AND|OR|NOT|FOR|EACH|COMPUTE|ALERT|CREATE|SET|SUM|MAX|MIN|COUNT|ABS)\b/.test(line)) return "keyword";
  if (trimmed.match(/^->/)) return "property";
  if (trimmed.match(/^\s*-\s+"/)) return "string";
  if (trimmed.match(/^\d+\.\d+\s*-\s*\d+\.\d+/)) return "value";
  // New: ontology-driven relationship edges like `X:TargetCompany --acquires--> Y:HoldingCompany`
  if (trimmed.match(/^[A-Z][\w]*:[A-Z][\w]*\s+--[a-zA-Z_]+-->/)) return "relationship-edge";
  if (
    trimmed.match(
      /^(parent_of|leases_to|leases_from|operates|owns|employs|manages|supplies|supports|finances|contracts_with|acquires|proposes_investment_in|guarantees|obligates|claims_revenue|files_revenue|shows_revenue|projects_revenue|covers|values_at|contradicts|references|has_change_of_control|reports_for|sourced_from|owned_by):/,
    )
  )
    return "relationship";
  if (trimmed.match(/^(sworn|audited|prepared|projected|marketing|unclassified|AuditedFinancials|QoEVerified|StructuredSystemData|ProfessionalReport|ManagementPrepared|SelfReported|Inferred|Unverified):/))
    return "tier";
  // Class declarations in @taxonomy: `class TargetSubsidiary [pe:TargetCompany ⊂ …]`
  if (trimmed.match(/^class\s+[A-Z][A-Za-z0-9]+/)) return "class-decl";
  // Entity blocks: `DesertCab: TargetCompany {`
  if (trimmed.match(/^[A-Z][A-Za-z0-9_]*:\s+[A-Z][A-Za-z0-9]+\s*\{/)) return "class-decl";
  if (trimmed.match(/^[A-Z][A-Za-z0-9]+:/) && !trimmed.includes('"')) return "type";
  if (trimmed.match(/^\s+-\s+[A-Z]/)) return "entity";
  if (
    trimmed.match(
      /^(title|version|domain|deal_name|deal_id|deal_type|deal_size|key_entities|relationships|inference_rules|smart_queries|total_documents|parsed_documents|total_risks|total_contradictions|rules_applied|pipeline_version|compiled_at|compiler|location|entities_count|document_count|compiled_from|canonical_name|ontology_class|ontology_id|ontology_version|ontology_domain|ontology_class_count|ontology_dependencies|classes_used_in_deal|synthetic_subtype|inference_rules_fired|inference_rules_defined|confidence_tiers|importance_score|mention_count|confidence|subtype|category|severity|description|condition|finding|evidence_count|affected_entities|evidence|properties|narrative|tags|classification_rationale|priority|count_in_deal|id|question|answer|sources|reasoning|natural_language|examples|priority|legalName|legal_name|ein|address|industry|revenue|ebitda|fleetSize|medallions|incorporationDate|totalAssets|netIncome|tradingNames|aliases|taxId|ownershipStructure|role|title|financial_figures|document_entities|asset_entities|non_org_relationships|metric_name|value|currency|period|period_type|entity|source_document|source_document_type|source_document_id|source_entity|tier|document_type|file_name|confidence_tier|classification_confidence|page_count|entity_count|filing_date|is_consolidated|segment|notes|reports_for_id|asset_class|count|owner|owned_by_id|fleet_average_age|jurisdiction|capex_estimate|status):/,
    )
  )
    return "meta-key";
  if (trimmed.match(/^(revenue_|fleet_|infrastructure_|lease_|top_|what_|how_|why_|which_)/) && trimmed.includes(":"))
    return "query-name";
  return "default";
}

function getLineClass(classification: string): string {
  switch (classification) {
    case "comment":
      return "onto-comment";
    case "annotation":
      return "onto-annotation";
    case "keyword":
      return "onto-keyword";
    case "relationship":
      return "text-amber-400";
    case "relationship-edge":
      return "text-amber-300";
    case "tier":
      return "text-green-400";
    case "type":
      return "text-cyan-400";
    case "class-decl":
      return "text-fuchsia-300 font-medium";
    case "entity":
      return "text-teal-300";
    case "string":
      return "onto-string";
    case "value":
      return "text-green-400";
    case "property":
      return "onto-property";
    case "meta-key":
      return "text-ontos-muted";
    case "query-name":
      return "text-cyan-400 font-medium";
    default:
      return "text-ontos-text";
  }
}

function highlightLine(line: string, classification: string): React.ReactNode {
  if (classification === "comment" || classification === "annotation") {
    return <span className={getLineClass(classification)}>{line}</span>;
  }
  if (classification === "keyword") {
    const parts = line.split(/\b(RULE|IF|THEN|AND|OR|NOT|IN|EXISTS|WHERE|EXTRAPOLATED_TO)\b/);
    return (
      <>
        {parts.map((part, i) =>
          /^(RULE|IF|THEN|AND|OR|NOT|IN|EXISTS|WHERE|EXTRAPOLATED_TO)$/.test(part) ? (
            <span key={i} className="text-purple-400 font-semibold">
              {part}
            </span>
          ) : (
            <span key={i} className="text-ontos-text">
              {part}
            </span>
          ),
        )}
      </>
    );
  }
  if (line.includes('"')) {
    const parts = line.split(/("[^"]*")/);
    return (
      <>
        {parts.map((part, i) =>
          part.startsWith('"') ? (
            <span key={i} className="text-orange-400">
              {part}
            </span>
          ) : (
            <span key={i} className={getLineClass(classification)}>
              {part}
            </span>
          ),
        )}
      </>
    );
  }
  if (line.includes("#") && classification !== "comment") {
    const idx = line.indexOf("#");
    const pre = line.slice(0, idx);
    const comment = line.slice(idx);
    return (
      <>
        {decorateClassNames(pre, getLineClass(classification))}
        <span className="onto-comment">{comment}</span>
      </>
    );
  }
  return decorateClassNames(line, getLineClass(classification));
}

// Highlight ontology class names inside a rendered line so they pop even
// when inside default lines (after other highlighters have had their turn).
function decorateClassNames(text: string, baseClass: string): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  CLASS_NAME_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CLASS_NAME_REGEX.exec(text)) !== null) {
    if (m.index > last) nodes.push(<span key={last + "-p"} className={baseClass}>{text.slice(last, m.index)}</span>);
    nodes.push(<span key={m.index + "-c"} className="text-fuchsia-300 font-medium">{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(<span key="tail" className={baseClass}>{text.slice(last)}</span>);
  return nodes.length > 0 ? <>{nodes}</> : <span className={baseClass}>{text}</span>;
}

// ─── Animated number for stats header ─────────────────────────────

function AnimatedNumber({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!Number.isFinite(target)) {
      setCurrent(0);
      return;
    }
    const start = performance.now();
    let raf = 0;
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <>{current.toLocaleString()}</>;
}

// ─── Section info for the collapsible source viewer ───────────────

const ONTO_SECTION_MARKERS: { marker: string; name: string; label: string }[] = [
  { marker: "@metadata", name: "metadata", label: "Metadata" },
  { marker: "@taxonomy", name: "taxonomy", label: "Taxonomy" },
  { marker: "@entities", name: "entities", label: "Entities" },
  { marker: "@relationships", name: "relationships", label: "Relationships" },
  { marker: "@confidence_tiers", name: "confidence_tiers", label: "Confidence Tiers" },
  { marker: "@inference_rules", name: "inference_rules", label: "Inference Rules" },
  { marker: "@queries", name: "queries", label: "Queries" },
];

// ─── The .onto source viewer ──────────────────────────────────────

function OntoSourceViewer({ source, filename }: { source: string; filename: string }) {
  const [copied, setCopied] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const lines = useMemo(() => source.split("\n"), [source]);

  const sectionRanges = useMemo(() => {
    const ranges: { name: string; start: number; end: number }[] = [];
    for (const section of ONTO_SECTION_MARKERS) {
      const startIdx = lines.findIndex((l) => l.trimStart().startsWith(section.marker));
      if (startIdx === -1) continue;
      let endIdx = lines.length - 1;
      for (const other of ONTO_SECTION_MARKERS) {
        if (other.name === section.name) continue;
        const otherIdx = lines.findIndex((l) => l.trimStart().startsWith(other.marker));
        if (otherIdx > startIdx && otherIdx < endIdx) {
          // Roll back to any preceding header/comment block (# ═══ …).
          let sectionStart = otherIdx;
          while (
            sectionStart > startIdx + 1 &&
            lines[sectionStart - 1].trim().startsWith("#")
          ) {
            sectionStart--;
          }
          if (sectionStart < endIdx) endIdx = sectionStart - 1;
        }
      }
      ranges.push({ name: section.name, start: startIdx, end: endIdx });
    }
    return ranges;
  }, [lines]);

  const toggleSection = useCallback((name: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(source);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [source]);

  const visibleLines = useMemo(() => {
    const result: {
      lineNum: number;
      content: string;
      isHeader: boolean;
      sectionName: string | null;
      isCollapsed: boolean;
    }[] = [];
    let skipUntil = -1;
    for (let i = 0; i < lines.length; i++) {
      if (i < skipUntil) continue;
      const section = sectionRanges.find((s) => s.start === i);
      if (section) {
        const isCollapsed = collapsedSections.has(section.name);
        result.push({
          lineNum: i + 1,
          content: lines[i],
          isHeader: true,
          sectionName: section.name,
          isCollapsed,
        });
        if (isCollapsed) {
          skipUntil = section.end + 1;
          continue;
        }
      } else {
        const inCollapsed = sectionRanges.find(
          (s) => i > s.start && i <= s.end && collapsedSections.has(s.name),
        );
        if (inCollapsed) continue;
        result.push({
          lineNum: i + 1,
          content: lines[i],
          isHeader: false,
          sectionName: null,
          isCollapsed: false,
        });
      }
    }
    return result;
  }, [lines, sectionRanges, collapsedSections]);

  return (
    <div className="bg-ontos-surface border border-ontos-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-ontos-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/60" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <span className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <span className="text-xs font-mono text-ontos-accent font-medium">{filename}</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-ontos-card text-ontos-muted">
            compiled
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-ontos-muted">{lines.length} lines</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-ontos-muted hover:text-ontos-accent-bright transition-colors px-2.5 py-1.5 rounded-lg hover:bg-ontos-card"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              {copied ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                />
              )}
            </svg>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[760px] overflow-y-auto">
        <pre className="p-4 text-xs leading-[1.7] font-mono">
          {visibleLines.map((item) => {
            const classification = classifyLine(item.content);
            return (
              <div
                key={item.lineNum}
                className={`flex ${
                  item.isHeader ? "cursor-pointer hover:bg-ontos-accent/5 rounded" : ""
                }`}
                onClick={
                  item.isHeader && item.sectionName
                    ? () => toggleSection(item.sectionName!)
                    : undefined
                }
              >
                <span className="text-ontos-muted/25 select-none w-10 text-right pr-4 flex-shrink-0">
                  {item.lineNum}
                </span>
                <span className="flex-1 whitespace-pre">
                  {item.isHeader ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className={`w-3 h-3 text-ontos-muted transition-transform ${
                          item.isCollapsed ? "" : "rotate-90"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                      <span className="onto-annotation font-semibold">{item.content}</span>
                      {item.isCollapsed && (
                        <span className="text-ontos-muted/40 text-[10px] ml-2">
                          (
                          {sectionRanges.find((s) => s.name === item.sectionName)!.end -
                            sectionRanges.find((s) => s.name === item.sectionName)!.start}{" "}
                          lines)
                        </span>
                      )}
                    </span>
                  ) : (
                    highlightLine(item.content, classification)
                  )}
                </span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────

export default function CompilerPage() {
  const [data, setData] = useState<CompiledOntoResponse | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getCompiledOnto().then((res) => {
      if (!cancelled) setData(res);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-2 border-ontos-accent/30 border-t-ontos-accent rounded-full animate-spin" />
          <p className="text-ontos-muted text-sm mt-4">Loading compiled ontology…</p>
        </div>
      </div>
    );
  }

  if (!data || !data.compiled_onto) {
    return (
      <div className="space-y-6">
        <div className="animate-fade-up">
          <div className="flex items-center gap-2 text-ontos-muted text-xs uppercase tracking-[0.15em] mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-ontos-accent" />
            Deal Ontology
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">Deal Intelligence Ontology</h1>
          <p className="text-ontos-muted mt-1 text-sm">
            The analysis layer has not yet produced a compiled .onto for this deal.
          </p>
        </div>
        <div className="bg-ontos-surface border border-ontos-border rounded-xl p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">Compilation in progress</h3>
          <p className="text-ontos-muted text-sm max-w-md mx-auto">
            The .onto compiler runs as the final step of the analysis-layer pipeline.
            Once upstream components finish, this page will show the full serialization.
          </p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Documents Processed", value: data.stats.documents_processed, color: "#6366f1" },
    { label: "Parsed Successfully", value: data.stats.documents_parsed, color: "#22c55e" },
    { label: "Key Entities", value: data.stats.key_entities, color: "#f59e0b" },
    {
      label: "Ontology Classes Used",
      value: data.stats.classes_used_in_deal ?? data.ontology?.classes_used_in_deal ?? 0,
      color: "#d946ef",
    },
    { label: "Inference Rules", value: data.stats.inference_rules, color: "#ef4444" },
    { label: "Smart Queries", value: data.stats.smart_queries, color: "#0ea5e9" },
    { label: "Lines", value: data.lines, color: "#a855f7" },
  ];

  const ontology = data.ontology ?? null;

  const compiledAt = data.compiled_at
    ? new Date(data.compiled_at).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  // Derive filename from header comment if present
  const firstFilenameLine = data.compiled_onto.split("\n").find((l) => l.match(/\.onto\s+—/));
  const filenameMatch = firstFilenameLine?.match(/([\w-]+\.onto)/);
  const filename = filenameMatch?.[1] ?? "deal-intelligence.onto";

  return (
    <div className="space-y-8">
      {/* Section 1: Compilation Summary */}
      <div className="space-y-6">
        <div className="animate-fade-up">
          <div className="flex items-center gap-2 text-ontos-muted text-xs uppercase tracking-[0.15em] mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-ontos-accent" />
            Deal Ontology
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">
            Deal Intelligence Ontology
          </h1>
          <p className="text-ontos-muted mt-1 text-sm">
            {data.stats.key_entities} key entities across{" "}
            {data.stats.classes_used_in_deal ?? ontology?.classes_used_in_deal ?? 0} ontology
            classes, {data.stats.inference_rules} inference rules,{" "}
            {data.stats.smart_queries} smart queries — compiled from{" "}
            {data.stats.documents_processed} VDR documents
            {compiledAt ? ` · last compiled ${compiledAt}` : ""}
            {data.pipeline_version ? ` · ${data.pipeline_version}` : ""}
          </p>
          {ontology?.id && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ontos-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
                <span className="font-mono text-fuchsia-300">{ontology.id}</span>
                <span>v{ontology.version ?? "?"}</span>
              </span>
              <span>
                domain <span className="text-ontos-text font-medium">{ontology.domain ?? "—"}</span>
              </span>
              <span>
                <span className="text-ontos-text font-medium">{ontology.class_count ?? 0}</span>{" "}
                classes defined ·{" "}
                <span className="text-ontos-text font-medium">
                  {ontology.classes_used_in_deal ?? 0}
                </span>{" "}
                used
              </span>
              <span>
                <span className="text-ontos-text font-medium">
                  {ontology.inference_rules_defined ?? 0}
                </span>{" "}
                rules ·{" "}
                <span className="text-ontos-text font-medium">{ontology.confidence_tiers ?? 0}</span>{" "}
                confidence tiers
              </span>
              {ontology.dependencies?.length ? (
                <span>
                  extends{" "}
                  <span className="font-mono text-fuchsia-300">
                    {ontology.dependencies.join(", ")}
                  </span>
                </span>
              ) : null}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-fade-up animation-delay-150">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-ontos-surface border border-ontos-border rounded-xl p-4"
            >
              <div className="text-2xl font-bold font-mono" style={{ color: stat.color }}>
                <AnimatedNumber target={stat.value} />
              </div>
              <div className="text-[10px] uppercase tracking-wider text-ontos-muted font-medium mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: The .onto Source */}
      <div className="space-y-4 animate-fade-up animation-delay-300">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{filename}</h2>
            <p className="text-xs text-ontos-muted mt-0.5">
              Full ontology specification — click section headers to collapse/expand.
              Deterministic template-based output (no LLM) — same input always produces the
              same file.
            </p>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-ontos-accent/10 text-ontos-accent-bright font-medium uppercase tracking-wider">
            Source
          </span>
        </div>
        <OntoSourceViewer source={data.compiled_onto} filename={filename} />
      </div>
    </div>
  );
}
