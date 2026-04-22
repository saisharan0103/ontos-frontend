const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3100";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "ontos-dev-key-2026";
const DEAL_ID = "7cf4935e-791e-4008-9a50-c142b902d298";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
      ...options?.headers,
    },
    next: { revalidate: 30 },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json.data ?? json;
}

export interface Deal {
  id: string;
  name: string;
  client: string;
  description: string;
  sector: string;
  deal_size: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
  deal_type: string;
  stats: {
    document_count: number;
    entity_count: number;
    risk_count: number;
    contradiction_count: number;
  };
}

export interface Document {
  id: string;
  deal_id: string;
  name: string;
  file_type: string;
  status: string;
  processing_progress: number;
  page_count: number;
  created_at: string;
  metadata: Record<string, unknown>;
}

export type ValidationStatus =
  | 'real'
  | 'thesis_feature'
  | 'boilerplate'
  | 'hallucinated'
  | 'operational_data';

export interface Risk {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  evidence: Array<{
    document_name: string;
    document_id: string;
    text: string;
    page_number: number;
  }>;
  created_at: string;
  // W5.A Risk Validation fields (nullable until validator has run)
  validation_status?: ValidationStatus | null;
  original_severity?: string | null;
  adjusted_severity?: string | null;
  rationale?: string | null;
  suppressed?: boolean | null;
  validated_at?: string | null;
  // W5.B Tightening fields
  affected_entity?: string | null;
  affected_entity_scope?: 'deal_level' | 'subsidiary' | 'counterparty' | 'real_estate' | null;
  deal_implication?: string | null;
  tightening_action?: string | null;
  source?: 'llm_extraction' | 'rule_finding' | 'manual' | null;
  rule_id?: string | null;
  tightened_at?: string | null;
}

export interface RiskSummary {
  total?: number;
  total_raw?: number;
  suppressed?: number;
  by_severity: Record<string, number>;
  by_category: Record<string, number>;
  by_validation_status?: Record<string, number>;
  top_critical?: Risk[];
}

export interface Contradiction {
  id: string;
  title: string;
  description: string;
  severity: string;
  evidence: Array<{
    document_name: string;
    document_id: string;
    text: string;
    page_number: number;
  }>;
}

export interface Entity {
  id: string;
  name: string;
  type: string;
  confidence: number;
  properties: Record<string, unknown>;
  document_count: number;
  created_at: string;
}

export interface Relationship {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: string;
  properties: Record<string, unknown>;
  source_entity?: Entity;
  target_entity?: Entity;
}

export interface QueryResult {
  id: string;
  answer: string;
  sources: Array<{
    document_name: string;
    document_id: string;
    chunk_id: string;
    page_number: number;
    text: string;
    relevance: number;
  }>;
  created_at: string;
}

export interface ProcessingStats {
  documents_by_status: Record<string, number>;
  entities_by_type: Record<string, number>;
  risks_by_severity: Record<string, number>;
  risks_by_category: Record<string, number>;
  processing: {
    total_documents: number;
    completed: number;
    average_progress: number;
  };
}

// API functions
export const getDeal = () =>
  apiFetch<Deal>(`/api/deals/${DEAL_ID}`);

export const getDocuments = (limit = 50, offset = 0) =>
  apiFetch<Document[]>(`/api/deals/${DEAL_ID}/documents?limit=${limit}&offset=${offset}`).catch(() => [] as Document[]);

export const getRisks = (opts: { audit?: boolean; validated?: boolean } = {}) => {
  const qs = new URLSearchParams();
  qs.set('limit', '1000');
  if (opts.audit) qs.set('audit', 'true');
  if (opts.validated) qs.set('validated', 'true');
  return apiFetch<Risk[]>(`/api/deals/${DEAL_ID}/risks?${qs.toString()}`);
};

export const getRiskSummary = (opts: { audit?: boolean } = {}) => {
  const qs = new URLSearchParams();
  if (opts.audit) qs.set('audit', 'true');
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<RiskSummary>(`/api/deals/${DEAL_ID}/risks/summary${suffix}`);
};

export const getContradictions = () =>
  apiFetch<Contradiction[]>(`/api/deals/${DEAL_ID}/contradictions?limit=100`);

export const getEntities = () =>
  apiFetch<Entity[]>(`/api/deals/${DEAL_ID}/entities`).catch(() => [] as Entity[]);

export const getEntityTypes = () =>
  apiFetch<Record<string, number>>(`/api/deals/${DEAL_ID}/entities/types`);

export const getRelationships = () =>
  apiFetch<Relationship[]>(`/api/deals/${DEAL_ID}/relationships`);

export const queryDeal = async (question: string): Promise<QueryResult> => {
  const url = `${API_BASE}/api/deals/${DEAL_ID}/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(`Query error: ${res.status}`);
  const json = await res.json();
  return json.data;
};

export const getQueryHistory = () =>
  apiFetch<QueryResult[]>(`/api/deals/${DEAL_ID}/query/history`).catch(() => [] as QueryResult[]);

export const getStats = () =>
  apiFetch<ProcessingStats>(`/api/deals/${DEAL_ID}/stats`);

export { DEAL_ID };

// Phase 3: Financial Metrics endpoints
export interface FinancialMetric {
  id: string;
  metric_name: string;
  value: number;
  currency: string;
  period: string;
  period_type: string;
  source_document_type: string;
  source_document_name: string | null;
  entity_name: string | null;
  is_consolidated: boolean;
  confidence: number;
  notes: string | null;
  is_canonical: boolean;
}

export const getCanonicalMetrics = () =>
  apiFetch<FinancialMetric[]>(`/api/deals/${DEAL_ID}/metrics/canonical`).catch(() => [] as FinancialMetric[]);

export const getMetricsSummary = () =>
  apiFetch<Record<string, FinancialMetric[]>>(`/api/deals/${DEAL_ID}/metrics/summary`).catch(() => ({} as Record<string, FinancialMetric[]>));

// Phase 4: Rule Actions
export interface RuleAction {
  id: string;
  rule_id: string;
  rule_name: string;
  action_type: string;
  target_id: string;
  original_severity: string | null;
  new_severity: string | null;
  reason: string;
  evidence: string | null;
}

export const getRuleActions = () =>
  apiFetch<RuleAction[]>(`/api/deals/${DEAL_ID}/metrics/rule-actions`).catch(() => [] as RuleAction[]);

// Phase 5: Deal Summary
export interface DealSummary {
  hero_metrics: Array<{
    key: string;
    label: string;
    value: number;
    formatted_value: string;
    period: string;
    source_doc_name: string;
    source_doc_type: string;
    confidence: number;
    notes: string | null;
  }>;
  executive_summary: string;
  key_entities: Array<{ name: string; type: string; role: string; description: string; mention_count: number }>;
  top_risks: Array<{ id: string; title: string; severity: string; category: string; description: string; source_doc: string }>;
  validation_status: string;
  validation_checks: Array<{ check_name: string; check_id: string; status: string; details: string; remediation: string | null }>;
  total_documents: number;
  parsed_documents: number;
  deprioritized_documents: number;
  total_risks: number;
  total_entities: number;
  rules_applied: number;
}

export const getDealSummary = () =>
  apiFetch<{ data: DealSummary } | DealSummary>(`/api/deals/${DEAL_ID}/summary`).then(r => {
    if ('data' in r && r.data && typeof r.data === 'object' && 'hero_metrics' in r.data) return r.data;
    if ('hero_metrics' in r) return r as DealSummary;
    return null;
  }).catch(() => null);

// ── Compiled Ontology (W4.A) ──────────────────────────────────────

export interface CompiledOntoResponse {
  deal_id: string;
  compiled_onto: string;
  lines: number;
  compiled_at: string | null;
  pipeline_version: string | null;
  ontology?: {
    id: string | null;
    version: string | null;
    domain: string | null;
    dependencies: string[];
    class_count: number;
    classes_used_in_deal: number;
    inference_rules_defined: number;
    confidence_tiers: number;
  } | null;
  stats: {
    documents_processed: number;
    documents_parsed: number;
    key_entities: number;
    inference_rules: number;
    smart_queries: number;
    classes_used_in_deal?: number;
    ontology_class_count?: number;
    inference_rules_defined?: number;
  };
}

export const getCompiledOnto = () =>
  apiFetch<CompiledOntoResponse | null>(`/api/deals/${DEAL_ID}/compiled-onto`).catch(
    () => null,
  );

// ── Deal Thesis Validation ────────────────────────────────────────

export interface ThesisPillar {
  id: string;
  deal_id: string;
  pillar_number: number;
  title: string;
  hypothesis: string;
  success_criteria: string[];
  search_keywords: string[];
  created_at: string;
}

export interface SupportingEvidence {
  document_name: string;
  document_id: string;
  page_number: number | null;
  snippet: string;
  relevance_score: number;
}

export interface ContradictingEvidence {
  contradiction_id: string;
  title: string;
  description: string | null;
  evidence_a: string | null;
  evidence_b: string | null;
  document_a_name: string;
  document_b_name: string;
}

export interface ThesisRisk {
  id: string;
  title: string;
  severity: string;
  category: string;
  description: string | null;
  mitigation: string | null;
}

export interface ThesisMetric {
  metric_name: string;
  period: string;
  value: number;
  formatted_value: string;
  source_doc_name: string | null;
}

export interface ThesisEntity {
  id: string;
  name: string;
  type: string;
  mention_count: number;
  description: string | null;
}

export interface PillarEvidence {
  pillar: ThesisPillar;
  supporting_evidence: SupportingEvidence[];
  contradicting_evidence: ContradictingEvidence[];
  related_risks: ThesisRisk[];
  key_metrics: ThesisMetric[];
  related_entities: ThesisEntity[];
  confidence_score: number;
  confidence_verdict: 'Strong' | 'Moderate' | 'Weak' | 'Contested';
}

export const getDealThesis = () =>
  apiFetch<PillarEvidence[]>(`/api/deals/${DEAL_ID}/thesis`).catch(() => [] as PillarEvidence[]);

export const refreshDealThesis = () =>
  fetch(`${API_BASE}/api/deals/${DEAL_ID}/thesis/refresh`, {
    method: 'POST',
    headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
  }).then(() => undefined);

// ── Ontology Graph ────────────────────────────────────────────────

export interface OntologyEntity {
  id: string;
  name: string;
  type: string;
  pe_class: string;
  mention_count: number;
  confidence: number;
  description: string | null;
  properties: Record<string, unknown>;
  document_count: number;
}

export interface OntologyRelationship {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: string;
  description: string | null;
  weight: number;
}

export interface PEClassSummary {
  pe_class: string;
  count: number;
  color: string;
}

export interface OntologyGraphResponse {
  entities: OntologyEntity[];
  relationships: OntologyRelationship[];
  pe_classes_summary: PEClassSummary[];
  relationship_types_summary: Array<{ type: string; count: number }>;
  total_entity_count: number;
  total_relationship_count: number;
}

export const getOntologyGraph = () =>
  apiFetch<OntologyGraphResponse>(`/api/deals/${DEAL_ID}/ontology-graph`).catch(
    () => null as unknown as OntologyGraphResponse,
  );

export const refreshOntologyGraph = () =>
  fetch(`${API_BASE}/api/deals/${DEAL_ID}/ontology-graph/refresh`, {
    method: 'POST',
    headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
  }).then(() => undefined);
