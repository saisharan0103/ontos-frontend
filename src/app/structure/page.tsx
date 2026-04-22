"use client";

import { useState, useEffect } from "react";
import { getEntities, getRelationships, Entity, Relationship } from "@/lib/api";

// Static corporate structure per Rod's feedback (must include both Desert Cab AND Virgin Valley)
const CORPORATE_ENTITIES = [
  {
    id: "evon-holdings",
    name: "EVON Holdings",
    type: "Parent",
    description: "Holding company for the combined entity post-merger",
    children: ["desert-cab", "virgin-valley", "kaptyn", "iocharge"],
  },
  {
    id: "desert-cab",
    name: "Desert Cab, Inc.",
    type: "Operating Entity",
    description: "Regulated taxi operations — 750+ medallions, 90%+ Las Vegas market share",
    children: ["dc-cab-mgmt", "blue-desert", "multiservice"],
  },
  {
    id: "virgin-valley",
    name: "Virgin Valley Cab Company",
    type: "Operating Entity",
    description: "Regional taxi operations — Mesquite/Virgin Valley area",
    children: [],
  },
  {
    id: "kaptyn",
    name: "Kaptyn Nevada, LLC",
    type: "Technology",
    description: "Fleet management SaaS platform and technology operations",
    children: [],
  },
  {
    id: "iocharge",
    name: "IoCharge / EV Infrastructure",
    type: "Infrastructure",
    description: "EV charging network buildout — targeting $52M revenue by 2032",
    children: [],
  },
  {
    id: "dc-cab-mgmt",
    name: "DC Cab Management, LLC",
    type: "Subsidiary",
    description: "Cab fleet management and dispatch operations",
    children: [],
  },
  {
    id: "blue-desert",
    name: "Blue Desert, LLC",
    type: "Subsidiary",
    description: "Supporting entity for Desert Cab operations",
    children: [],
  },
  {
    id: "multiservice",
    name: "Multiservice Leasing, Inc.",
    type: "Subsidiary",
    description: "Vehicle leasing operations for the fleet",
    children: [],
  },
];

const TYPE_COLORS: Record<string, string> = {
  "Parent": "#6366f1",
  "Operating Entity": "#22c55e",
  "Technology": "#818cf8",
  "Infrastructure": "#f59e0b",
  "Subsidiary": "#8888a0",
};

function EntityNode({ entity, depth = 0 }: { entity: typeof CORPORATE_ENTITIES[0]; depth?: number }) {
  const children = CORPORATE_ENTITIES.filter((e) => entity.children.includes(e.id));
  const color = TYPE_COLORS[entity.type] || "#8888a0";

  return (
    <div className={depth > 0 ? "ml-8 mt-2" : ""}>
      <div className="bg-ontos-surface border border-ontos-border rounded-xl p-4 hover:border-ontos-accent/30 transition-all">
        <div className="flex items-start gap-3">
          <div
            className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold">{entity.name}</h3>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{ backgroundColor: `${color}15`, color }}
              >
                {entity.type}
              </span>
            </div>
            <p className="text-xs text-ontos-muted mt-1">{entity.description}</p>
          </div>
        </div>
      </div>
      {children.length > 0 && (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-4 w-px bg-ontos-border" />
          {children.map((child) => (
            <div key={child.id} className="relative">
              <div className="absolute left-6 top-6 w-4 h-px bg-ontos-border" />
              <EntityNode entity={child} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StructurePage() {
  const [apiEntities, setApiEntities] = useState<Entity[]>([]);
  const [apiRelationships, setApiRelationships] = useState<Relationship[]>([]);
  useEffect(() => {
    Promise.all([
      getEntities().catch(() => []),
      getRelationships().catch(() => []),
    ]).then(([e, r]) => {
      setApiEntities(e);
      setApiRelationships(r);
    });
  }, []);

  const rootEntity = CORPORATE_ENTITIES.find((e) => e.id === "evon-holdings")!;

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <div className="flex items-center gap-2 text-ontos-muted text-xs uppercase tracking-[0.15em] mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-ontos-accent" />
          Entity Structure
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Corporate Structure</h1>
        <p className="text-ontos-muted mt-2 text-sm">
          Entity hierarchy for the EVON / Desert Cab acquisition. Includes all operating entities: Desert Cab, Virgin Valley, Kaptyn, and IoCharge.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-ontos-muted">{type}</span>
          </div>
        ))}
      </div>

      {/* Tree View */}
      <div className="animate-fade-up animation-delay-150">
        <EntityNode entity={rootEntity} />
      </div>

      {/* API entities if available */}
      {apiEntities.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ontos-muted mb-4">
            Pipeline-Extracted Entities ({apiEntities.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {apiEntities.map((entity) => (
              <div key={entity.id} className="bg-ontos-surface border border-ontos-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-ontos-accent" />
                  <span className="text-sm font-medium">{entity.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-ontos-card text-ontos-muted">{entity.type}</span>
                </div>
                <div className="text-[10px] text-ontos-muted">
                  Confidence: {Math.round(entity.confidence * 100)}% · {entity.document_count} documents
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Relationship table */}
      {apiRelationships.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ontos-muted mb-4">
            Entity Relationships
          </h2>
          <div className="bg-ontos-surface border border-ontos-border rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-ontos-border">
                  <th className="text-left p-3 text-ontos-muted font-medium">Source</th>
                  <th className="text-center p-3 text-ontos-muted font-medium">Relationship</th>
                  <th className="text-left p-3 text-ontos-muted font-medium">Target</th>
                </tr>
              </thead>
              <tbody>
                {apiRelationships.map((rel) => (
                  <tr key={rel.id} className="border-b border-ontos-border/50">
                    <td className="p-3">{rel.source_entity?.name || rel.source_entity_id}</td>
                    <td className="p-3 text-center text-ontos-accent">{rel.relationship_type}</td>
                    <td className="p-3">{rel.target_entity?.name || rel.target_entity_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
