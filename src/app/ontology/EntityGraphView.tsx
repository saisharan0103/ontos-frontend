/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getOntologyGraph,
  refreshOntologyGraph,
  OntologyEntity,
  OntologyRelationship,
  OntologyGraphResponse,
  PEClassSummary,
} from "@/lib/api";

// ── Color palette (matches backend) ───────────────────────────────

const PE_COLORS: Record<string, string> = {
  TargetCompany:  "#6366f1",
  Subsidiary:     "#a855f7",
  HoldingCo:      "#8b5cf6",
  Executive:      "#ec4899",
  Shareholder:    "#f43f5e",
  KeyPerson:      "#ef4444",
  Lender:         "#22c55e",
  Organization:   "#06b6d4",
  PrimaryAsset:   "#f59e0b",
  Location:       "#14b8a6",
  Contract:       "#eab308",
  Regulator:      "#f97316",
  Other:          "#6b7280",
};

function getColor(peClass: string) {
  return PE_COLORS[peClass] ?? "#6b7280";
}

// ── Force-layout helpers ───────────────────────────────────────────

interface NodePos {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function initPositions(count: number, W: number, H: number): NodePos[] {
  const cx = W / 2;
  const cy = H / 2;
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count;
    const r = Math.min(W, H) * 0.32;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), vx: 0, vy: 0 };
  });
}

function runForce(
  positions: NodePos[],
  edges: { s: number; t: number }[],
  W: number,
  H: number,
  steps = 80,
): NodePos[] {
  const pos = positions.map(p => ({ ...p }));
  const ideal = 90;
  const repulsion = 3500;
  const attraction = 0.04;
  const damping = 0.82;
  const cx = W / 2;
  const cy = H / 2;

  for (let step = 0; step < steps; step++) {
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.1);
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        pos[i].vx += fx; pos[i].vy += fy;
        pos[j].vx -= fx; pos[j].vy -= fy;
      }
    }
    for (const e of edges) {
      const dx = pos[e.t].x - pos[e.s].x;
      const dy = pos[e.t].y - pos[e.s].y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.1);
      const delta = dist - ideal;
      const fx = (dx / dist) * delta * attraction;
      const fy = (dy / dist) * delta * attraction;
      pos[e.s].vx += fx; pos[e.s].vy += fy;
      pos[e.t].vx -= fx; pos[e.t].vy -= fy;
    }
    for (let i = 0; i < pos.length; i++) {
      pos[i].vx += (cx - pos[i].x) * 0.003;
      pos[i].vy += (cy - pos[i].y) * 0.003;
      pos[i].vx *= damping;
      pos[i].vy *= damping;
      pos[i].x = Math.max(30, Math.min(W - 30, pos[i].x + pos[i].vx));
      pos[i].y = Math.max(30, Math.min(H - 30, pos[i].y + pos[i].vy));
    }
  }
  return pos;
}

// ── Enhanced SVG graph with pan / zoom / drag / tooltips ───────────

function EntityGraph({
  entities,
  relationships,
  selectedId,
  filterClass,
  onSelect,
}: {
  entities: OntologyEntity[];
  relationships: OntologyRelationship[];
  selectedId: string | null;
  filterClass: string | null;
  onSelect: (id: string) => void;
}) {
  const W = 680;
  const H = 540;

  const svgRef = useRef<SVGSVGElement>(null);
  const [positions, setPositions] = useState<NodePos[]>([]);
  const posRef = useRef<NodePos[]>([]);

  // Pan / zoom transform stored in both ref (for smooth sync) and state (for render)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });

  // Hover / tooltip
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ cx: number; cy: number; entity: OntologyEntity } | null>(null);

  // Drag interaction state — refs avoid stale closure issues
  const [panActive, setPanActive] = useState(false);
  const dragMode = useRef<"none" | "pan" | "node">("none");
  const panStart = useRef({ mx: 0, my: 0, tx: 0, ty: 0 });
  const nodeDragRef = useRef({ idx: -1, startMx: 0, startMy: 0, startPx: 0, startPy: 0 });
  const hasDragged = useRef(false);

  // Edge index map (derived from entities)
  const idxMap = new Map(entities.map((e, i) => [e.id, i]));
  const edges = relationships
    .map(r => ({ s: idxMap.get(r.source_entity_id)!, t: idxMap.get(r.target_entity_id)! }))
    .filter(e => e.s !== undefined && e.t !== undefined);

  // ── Force layout (runs once when entity set changes) ───────────
  useEffect(() => {
    if (entities.length === 0) return;
    const edgesForForce = edges.map(e => ({ s: e.s, t: e.t }));
    const init = initPositions(entities.length, W, H);
    const pos = runForce(init, edgesForForce, W, H, 120);
    setPositions(pos);
    posRef.current = pos.map(p => ({ ...p }));
    const zero = { x: 0, y: 0, scale: 1 };
    transformRef.current = zero;
    setTransform(zero);
  }, [entities.length, relationships.length]); // eslint-disable-line

  // ── Non-passive wheel listener (required for preventDefault) ───
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const t = transformRef.current;
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      const newScale = Math.max(0.3, Math.min(3, t.scale * factor));
      const rect = el.getBoundingClientRect();
      const sp = {
        x: (e.clientX - rect.left) * (W / rect.width),
        y: (e.clientY - rect.top) * (H / rect.height),
      };
      const next = {
        x: sp.x - (sp.x - t.x) * (newScale / t.scale),
        y: sp.y - (sp.y - t.y) * (newScale / t.scale),
        scale: newScale,
      };
      transformRef.current = next;
      setTransform({ ...next });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Mouse handlers ─────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    // Detect if click is on a node group (data-idx attribute)
    const nodeEl = (e.target as SVGElement).closest("[data-idx]");
    if (nodeEl) {
      const idx = parseInt(nodeEl.getAttribute("data-idx")!, 10);
      dragMode.current = "node";
      hasDragged.current = false;
      const pos = posRef.current[idx];
      nodeDragRef.current = { idx, startMx: e.clientX, startMy: e.clientY, startPx: pos.x, startPy: pos.y };
    } else {
      dragMode.current = "pan";
      hasDragged.current = false;
      setPanActive(true);
      panStart.current = { mx: e.clientX, my: e.clientY, tx: transformRef.current.x, ty: transformRef.current.y };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragMode.current === "none") return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgScaleX = W / rect.width;
    const svgScaleY = H / rect.height;

    if (dragMode.current === "pan") {
      const { mx, my, tx, ty } = panStart.current;
      const next = {
        ...transformRef.current,
        x: tx + (e.clientX - mx) * svgScaleX,
        y: ty + (e.clientY - my) * svgScaleY,
      };
      transformRef.current = next;
      setTransform({ ...next });
    } else if (dragMode.current === "node") {
      if (!hasDragged.current) {
        hasDragged.current = true;
        setTooltip(null);
      }
      const { idx, startMx, startMy, startPx, startPy } = nodeDragRef.current;
      const t = transformRef.current;
      const dx = (e.clientX - startMx) * svgScaleX / t.scale;
      const dy = (e.clientY - startMy) * svgScaleY / t.scale;
      const newPos = posRef.current.map((p, i) =>
        i === idx ? { ...p, x: startPx + dx, y: startPy + dy, vx: 0, vy: 0 } : p,
      );
      posRef.current = newPos;
      setPositions([...newPos]);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (dragMode.current === "node" && !hasDragged.current) {
      const { idx } = nodeDragRef.current;
      if (entities[idx]) onSelect(entities[idx].id);
    }
    dragMode.current = "none";
    setPanActive(false);
  }, [entities, onSelect]);

  // ── Zoom helpers ───────────────────────────────────────────────

  const zoomBy = useCallback((factor: number) => {
    const t = transformRef.current;
    const newScale = Math.max(0.3, Math.min(3, t.scale * factor));
    const cx = W / 2;
    const cy = H / 2;
    const next = {
      x: cx - (cx - t.x) * (newScale / t.scale),
      y: cy - (cy - t.y) * (newScale / t.scale),
      scale: newScale,
    };
    transformRef.current = next;
    setTransform({ ...next });
  }, []);

  const resetView = useCallback(() => {
    const next = { x: 0, y: 0, scale: 1 };
    transformRef.current = next;
    setTransform(next);
  }, []);

  // ── Render ─────────────────────────────────────────────────────

  if (positions.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: H }}>
        <div className="w-8 h-8 border-2 border-ontos-accent/30 border-t-ontos-accent rounded-full animate-spin" />
      </div>
    );
  }

  const { x: tx, y: ty, scale: ts } = transform;

  return (
    <div style={{ position: "relative", width: "100%", height: H }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: "100%", height: "100%", background: "transparent", display: "block",
          cursor: panActive ? "grabbing" : "grab",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          dragMode.current = "none";
          setPanActive(false);
          setTooltip(null);
          setHoveredId(null);
        }}
      >
        <defs>
          {/* Ambient glow filter for TargetCompany */}
          <filter id="glow-tc" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform={`translate(${tx},${ty}) scale(${ts})`}>
          {/* ── Edges ── */}
          {edges.map((e, i) => {
            const sp = positions[e.s];
            const tp = positions[e.t];
            if (!sp || !tp) return null;
            const srcEnt = entities[e.s];
            const tgtEnt = entities[e.t];
            const highlighted = hoveredId
              ? (srcEnt?.id === hoveredId || tgtEnt?.id === hoveredId)
              : selectedId
              ? (srcEnt?.id === selectedId || tgtEnt?.id === selectedId)
              : false;
            const dim = filterClass
              ? (srcEnt?.pe_class !== filterClass && tgtEnt?.pe_class !== filterClass)
              : false;
            return (
              <line
                key={i}
                x1={sp.x} y1={sp.y} x2={tp.x} y2={tp.y}
                stroke={
                  dim ? "rgba(255,255,255,0.03)"
                  : highlighted ? "rgba(255,255,255,0.45)"
                  : "rgba(255,255,255,0.1)"
                }
                strokeWidth={highlighted ? 1.8 : 0.9}
                strokeLinecap="round"
              />
            );
          })}

          {/* ── Nodes ── */}
          {entities.map((ent, i) => {
            const pos = positions[i];
            if (!pos) return null;
            const color = getColor(ent.pe_class);
            const baseR = Math.max(9, Math.min(20, 7 + Math.log(ent.mention_count + 1) * 2.5));
            const r =
              ent.pe_class === "TargetCompany" ? baseR * 1.5
              : ent.pe_class === "Subsidiary" ? baseR * 1.15
              : baseR;
            const isSelected = ent.id === selectedId;
            const isHovered = ent.id === hoveredId;
            const dim = filterClass ? ent.pe_class !== filterClass : false;
            const showLabel = r >= 13 || isSelected || isHovered;

            return (
              <g
                key={ent.id}
                data-idx={i}
                style={{ opacity: dim ? 0.15 : 1 }}
                onMouseEnter={(ev) => {
                  if (dragMode.current !== "none") return;
                  setHoveredId(ent.id);
                  setTooltip({ cx: ev.clientX, cy: ev.clientY, entity: ent });
                }}
                onMouseLeave={() => { setHoveredId(null); setTooltip(null); }}
                onMouseMove={(ev) => {
                  if (dragMode.current === "none") {
                    setTooltip(prev => prev ? { ...prev, cx: ev.clientX, cy: ev.clientY } : null);
                  }
                }}
              >
                {/* Ambient glow for TargetCompany */}
                {ent.pe_class === "TargetCompany" && (
                  <circle
                    cx={pos.x} cy={pos.y} r={r + 12}
                    fill={color} fillOpacity={0.12}
                    filter="url(#glow-tc)"
                    style={{ pointerEvents: "none" }}
                  />
                )}

                {/* Selection / hover ring */}
                {(isSelected || isHovered) && (
                  <circle
                    cx={pos.x} cy={pos.y}
                    r={r + (isSelected ? 5.5 : 3.5)}
                    fill="none"
                    stroke={isSelected ? "#fff" : color}
                    strokeWidth={isSelected ? 2 : 1.5}
                    strokeOpacity={isSelected ? 0.85 : 0.55}
                    style={{ pointerEvents: "none" }}
                  />
                )}

                {/* Main circle */}
                <circle
                  cx={pos.x} cy={pos.y}
                  r={isHovered ? r * 1.09 : r}
                  fill={color}
                  fillOpacity={isSelected ? 1 : isHovered ? 0.95 : 0.82}
                  stroke={`${color}55`}
                  strokeWidth={1}
                  style={{ cursor: "pointer" }}
                />

                {/* Node label */}
                {showLabel && (
                  <text
                    x={pos.x} y={pos.y + r + 13}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={500}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    fill={isHovered || isSelected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.72)"}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {ent.name.length > 18 ? ent.name.slice(0, 17) + "…" : ent.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* ── HTML floating tooltip ── */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.cx + 16,
            top: tooltip.cy - 8,
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          <div
            className="border border-ontos-border/70 shadow-2xl rounded-xl"
            style={{ background: "#09090f", minWidth: 148, maxWidth: 210, padding: "10px 13px" }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", lineHeight: 1.35, marginBottom: 7 }}>
              {tooltip.entity.name}
            </p>
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 999, fontWeight: 500,
              backgroundColor: `${getColor(tooltip.entity.pe_class)}1e`,
              color: getColor(tooltip.entity.pe_class),
              border: `1px solid ${getColor(tooltip.entity.pe_class)}44`,
              display: "inline-block",
            }}>
              {tooltip.entity.pe_class}
            </span>
            <div style={{ display: "flex", gap: 14, marginTop: 9, fontSize: 11, color: "#6b7280" }}>
              <span>
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "#e5e7eb" }}>
                  {tooltip.entity.mention_count}
                </span>{" "}mentions
              </span>
              {tooltip.entity.document_count > 0 && (
                <span>
                  <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "#e5e7eb" }}>
                    {tooltip.entity.document_count}
                  </span>{" "}docs
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Zoom controls — bottom-right ── */}
      <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", flexDirection: "column", gap: 5 }}>
        {[
          { label: "+", fn: () => zoomBy(1.2), title: "Zoom in" },
          { label: "−", fn: () => zoomBy(0.83), title: "Zoom out" },
          { label: "⟲", fn: resetView, title: "Reset view" },
        ].map(btn => (
          <button
            key={btn.label}
            onClick={btn.fn}
            title={btn.title}
            className="bg-ontos-surface border border-ontos-border text-ontos-muted hover:text-ontos-text hover:border-ontos-accent/40 hover:-translate-y-0.5 transition-all shadow-lg"
            style={{ width: 32, height: 32, borderRadius: 8, fontSize: 15, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Entity detail panel ────────────────────────────────────────────

function EntityDetail({
  entity,
  allEntities,
  relationships,
  onSelect,
}: {
  entity: OntologyEntity | null;
  allEntities: OntologyEntity[];
  relationships: OntologyRelationship[];
  onSelect: (id: string) => void;
}) {
  if (!entity) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-12 h-12 rounded-full bg-ontos-border/40 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-ontos-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        </div>
        <p className="text-xs text-ontos-muted">Click an entity to explore its relationships</p>
      </div>
    );
  }

  const color = getColor(entity.pe_class);
  const initial = entity.name.charAt(0).toUpperCase();

  const relatedIds = new Set<string>();
  for (const r of relationships) {
    if (r.source_entity_id === entity.id) relatedIds.add(r.target_entity_id);
    if (r.target_entity_id === entity.id) relatedIds.add(r.source_entity_id);
  }
  const relatedEntities = allEntities.filter(e => relatedIds.has(e.id)).slice(0, 5);

  const props = Object.entries(entity.properties ?? {})
    .filter(([, v]) => v !== null && v !== undefined && String(v).length < 80)
    .slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          {initial}
        </div>
        <div>
          <div className="font-semibold text-sm leading-tight">{entity.name}</div>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 inline-block"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {entity.pe_class}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Mentions", value: entity.mention_count },
          { label: "Documents", value: entity.document_count || "—" },
          { label: "Confidence", value: entity.confidence ? `${Math.round(entity.confidence * 100)}%` : "—" },
        ].map(s => (
          <div key={s.label} className="bg-ontos-card border border-ontos-border/50 rounded-lg p-2 text-center">
            <div className="text-sm font-semibold tabular-nums" style={{ color }}>{s.value}</div>
            <div className="text-[9px] uppercase tracking-wider text-ontos-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Description */}
      {entity.description && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-ontos-muted font-semibold mb-1">Summary</div>
          <p className="text-[11px] text-ontos-muted leading-relaxed">{entity.description}</p>
        </div>
      )}

      {/* Properties */}
      {props.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-ontos-muted font-semibold mb-1.5">Properties</div>
          <div className="grid grid-cols-2 gap-1">
            {props.map(([k, v]) => (
              <div key={k} className="bg-ontos-card border border-ontos-border/40 rounded p-1.5">
                <div className="text-[9px] text-ontos-muted uppercase tracking-wider truncate">{k}</div>
                <div className="text-[10px] text-ontos-text truncate">{String(v)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related entities */}
      {relatedEntities.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] text-ontos-muted font-semibold mb-1.5">Related Entities</div>
          <div className="space-y-1">
            {relatedEntities.map(e => (
              <button
                key={e.id}
                onClick={() => onSelect(e.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-ontos-card hover:bg-ontos-surface border border-ontos-border/40 transition-colors text-left"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getColor(e.pe_class) }} />
                <span className="text-[11px] font-medium flex-1 truncate">{e.name}</span>
                <span className="text-[9px] text-ontos-muted">{e.pe_class}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Left sidebar ───────────────────────────────────────────────────

function LeftSidebar({
  peSummary,
  relSummary,
  filterClass,
  onFilter,
}: {
  peSummary: PEClassSummary[];
  relSummary: Array<{ type: string; count: number }>;
  filterClass: string | null;
  onFilter: (cls: string | null) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-ontos-surface border border-ontos-border rounded-xl p-4">
        <div className="text-[11px] uppercase tracking-[0.15em] text-ontos-muted font-semibold mb-3">PE Classes Used</div>
        <div className="space-y-1.5">
          {peSummary.map(cls => (
            <button
              key={cls.pe_class}
              onClick={() => onFilter(filterClass === cls.pe_class ? null : cls.pe_class)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all ${
                filterClass === cls.pe_class
                  ? "bg-ontos-accent/10 border border-ontos-accent/30"
                  : "hover:bg-ontos-card border border-transparent"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color }} />
              <span className="flex-1 text-[13px] font-medium text-ontos-text">{cls.pe_class}</span>
              <span className="text-ontos-muted tabular-nums font-semibold text-xs">{cls.count}</span>
            </button>
          ))}
        </div>
        {filterClass && (
          <button
            onClick={() => onFilter(null)}
            className="mt-2 w-full text-[10px] text-ontos-accent text-center py-1 hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>

      <div className="bg-ontos-surface border border-ontos-border rounded-xl p-4">
        <div className="text-[11px] uppercase tracking-[0.15em] text-ontos-muted font-semibold mb-3">Relationship Types</div>
        <div className="space-y-1.5">
          {relSummary.map(r => (
            <div key={r.type} className="flex items-center gap-2 px-2 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-ontos-accent/60 flex-shrink-0" />
              <span className="flex-1 text-[13px] text-ontos-muted">{r.type.replace(/_/g, " ")}</span>
              <span className="tabular-nums font-semibold text-xs text-ontos-muted">{r.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────

function GraphSkeleton() {
  return (
    <div className="grid grid-cols-[220px_1fr_260px] gap-4 animate-pulse">
      <div className="space-y-4">
        <div className="h-56 rounded-xl bg-ontos-border/30" />
        <div className="h-32 rounded-xl bg-ontos-border/30" />
      </div>
      <div className="h-[540px] rounded-xl bg-ontos-border/20" />
      <div className="h-80 rounded-xl bg-ontos-border/30" />
    </div>
  );
}

// ── Main EntityGraphView ───────────────────────────────────────────

export default function EntityGraphView() {
  const [data, setData] = useState<OntologyGraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterClass, setFilterClass] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await getOntologyGraph();
      if (!d || !d.entities) throw new Error("No data returned");
      setData(d);
    } catch (e: any) {
      setError(e.message ?? "Failed to load graph");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshOntologyGraph().catch(() => {});
    await fetch();
    setRefreshing(false);
  };

  const selectedEntity = data?.entities.find(e => e.id === selectedId) ?? null;

  if (loading) return <GraphSkeleton />;

  if (error) return (
    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-8 text-center">
      <p className="text-sm text-red-400 mb-3">{error}</p>
      <button onClick={fetch} className="text-xs px-4 py-2 bg-ontos-accent text-white rounded-lg">Retry</button>
    </div>
  );

  if (!data || data.entities.length === 0) return (
    <div className="bg-ontos-surface border border-ontos-border rounded-xl p-12 text-center">
      <p className="text-sm text-ontos-muted mb-3">No entities to display.</p>
      <button onClick={fetch} className="text-xs px-4 py-2 bg-ontos-accent text-white rounded-lg">Refresh</button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Sub-header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Corporate Entity Graph</h2>
          <p className="text-[11px] text-ontos-muted mt-0.5">
            Showing{" "}
            <span className="text-ontos-accent font-semibold tabular-nums">{data.entities.length}</span> of{" "}
            <span className="font-semibold tabular-nums">{data.total_entity_count.toLocaleString()}</span>{" "}
            entities curated by signal strength and PE relevance
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-[11px] px-3 py-1.5 bg-ontos-surface border border-ontos-border rounded-lg text-ontos-muted hover:text-ontos-text transition-all disabled:opacity-40"
        >
          {refreshing ? "…" : "↻ Refresh"}
        </button>
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-[220px_1fr_260px] gap-4">
        {/* Left sidebar */}
        <LeftSidebar
          peSummary={data.pe_classes_summary}
          relSummary={data.relationship_types_summary}
          filterClass={filterClass}
          onFilter={setFilterClass}
        />

        {/* Center — graph */}
        <div className="bg-ontos-surface border border-ontos-border rounded-xl overflow-hidden" style={{ minHeight: 540 }}>
          <EntityGraph
            entities={data.entities}
            relationships={data.relationships}
            selectedId={selectedId}
            filterClass={filterClass}
            onSelect={setSelectedId}
          />
        </div>

        {/* Right — detail panel */}
        <div className="bg-ontos-surface border border-ontos-border rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-[0.15em] text-ontos-muted font-semibold mb-3">Entity Detail</div>
          <EntityDetail
            entity={selectedEntity}
            allEntities={data.entities}
            relationships={data.relationships}
            onSelect={setSelectedId}
          />
        </div>
      </div>
    </div>
  );
}
