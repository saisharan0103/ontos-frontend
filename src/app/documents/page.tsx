"use client";

import { useState, useEffect } from "react";
import { getDocuments, getStats, Document, ProcessingStats } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = {
  failed: "deprioritized",
  completed: "completed",
  pending: "pending",
  parsing: "parsing",
  chunking: "processing",
  extracting: "processing",
  deprioritized: "deprioritized",
};

function displayStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function displayStatusColor(status: string): string {
  const mapped = displayStatus(status);
  return (STATUS_COLORS as Record<string, string>)[mapped] ?? (STATUS_COLORS as Record<string, string>)[status] ?? "#6b7280";
}

const STATUS_COLORS: Record<string, string> = {
  completed: "#22c55e",
  processing: "#6366f1",
  parsing: "#f59e0b",
  chunking: "#818cf8",
  extracting: "#0284c7",
  deprioritized: "#6b7280",
  pending: "#6b7280",
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    Promise.all([
      getDocuments(200).catch(() => []),
      getStats().catch(() => null),
    ]).then(([docs, s]) => {
      setDocuments(docs);
      setStats(s);
      setLoading(false);
    });
  }, []);

  const filteredDocs = documents
    .filter((d) => !filterStatus || d.status === filterStatus)
    .filter((d) => !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const totalDocs = stats?.processing?.total_documents ?? documents.length;
  const completedDocs = stats?.processing?.completed ?? 0;
  const avgProgress = stats?.processing?.average_progress ?? 0;

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <div className="flex items-center gap-2 text-ontos-muted text-xs uppercase tracking-[0.15em] mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-ontos-accent" />
          Virtual Data Room
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Due Diligence Documents</h1>
        <p className="text-ontos-muted mt-2 text-sm">
          All VDR documents for Desert Cab, Virgin Valley, and related entities. Both entities must be represented.
        </p>
      </div>

      {/* Processing Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-ontos-surface border border-ontos-border rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-ontos-muted">Total Documents</div>
          <div className="text-2xl font-bold text-ontos-accent mt-1">{totalDocs}</div>
        </div>
        <div className="bg-ontos-surface border border-ontos-border rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-ontos-muted">Completed</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{completedDocs}</div>
        </div>
        <div className="bg-ontos-surface border border-ontos-border rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-ontos-muted">Average Progress</div>
          <div className="text-2xl font-bold text-ontos-accent-bright mt-1">{Math.round(avgProgress * 100)}%</div>
        </div>
        <div className="bg-ontos-surface border border-ontos-border rounded-xl p-4">
          <div className="text-[10px] uppercase tracking-wider text-ontos-muted">Status Breakdown</div>
          <div className="flex gap-1 mt-2">
            {stats?.documents_by_status && Object.entries(stats.documents_by_status).map(([status, count]) => (
              <div
                key={status}
                className="h-4 rounded-sm"
                style={{
                  backgroundColor: displayStatusColor(status),
                  width: `${(count / totalDocs) * 100}%`,
                  minWidth: "4px",
                }}
                title={`${displayStatus(status)}: ${count}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {stats?.documents_by_status && Object.entries(stats.documents_by_status).map(([status, count]) => (
              <span key={status} className="text-[9px] text-ontos-muted">
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: displayStatusColor(status) }} />
                {displayStatus(status)}: {count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto border-2 border-ontos-accent/30 border-t-ontos-accent rounded-full animate-spin" />
            <p className="text-ontos-muted text-sm mt-4">Loading documents...</p>
          </div>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-ontos-surface border border-ontos-border rounded-xl p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">Documents Loading</h3>
          <p className="text-ontos-muted text-sm max-w-md mx-auto">
            {totalDocs} documents are in the pipeline. The document list will populate as processing completes.
          </p>
          <div className="mt-4">
            <div className="w-full max-w-xs mx-auto h-2 bg-ontos-card rounded-full overflow-hidden">
              <div className="h-full bg-ontos-accent rounded-full transition-all" style={{ width: `${avgProgress * 100}%` }} />
            </div>
            <p className="text-xs text-ontos-muted mt-2">{Math.round(avgProgress * 100)}% processed</p>
          </div>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Search documents..."
              className="flex-1 min-w-[200px] text-sm bg-ontos-surface border border-ontos-border rounded-lg px-4 py-2 text-ontos-text placeholder-ontos-muted focus:outline-none focus:border-ontos-accent/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus(null)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all ${!filterStatus ? "bg-ontos-accent text-white" : "bg-ontos-surface border border-ontos-border text-ontos-muted"}`}
              >
                All
              </button>
              {Object.keys(STATUS_COLORS).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(filterStatus === status ? null : status)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all capitalize ${filterStatus === status ? "bg-ontos-accent text-white" : "bg-ontos-surface border border-ontos-border text-ontos-muted"}`}
                >
                  {displayStatus(status)}
                </button>
              ))}
            </div>
          </div>

          {/* Document table */}
          <div className="bg-ontos-surface border border-ontos-border rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-ontos-border">
                  <th className="text-left p-3 text-ontos-muted font-medium uppercase tracking-wider">Document</th>
                  <th className="text-left p-3 text-ontos-muted font-medium uppercase tracking-wider">Type</th>
                  <th className="text-center p-3 text-ontos-muted font-medium uppercase tracking-wider">Status</th>
                  <th className="text-center p-3 text-ontos-muted font-medium uppercase tracking-wider">Progress</th>
                  <th className="text-center p-3 text-ontos-muted font-medium uppercase tracking-wider">Pages</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.slice(0, 50).map((doc) => (
                  <tr key={doc.id} className="border-b border-ontos-border/50 hover:bg-ontos-card/50 transition-colors">
                    <td className="p-3">
                      <div className="font-medium truncate max-w-xs">{doc.name}</div>
                    </td>
                    <td className="p-3 text-ontos-muted">{doc.file_type || "—"}</td>
                    <td className="p-3 text-center">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-medium"
                        style={{
                          backgroundColor: `${STATUS_COLORS[doc.status] || "#6b7280"}15`,
                          color: STATUS_COLORS[doc.status] || "#6b7280",
                        }}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="w-16 h-1.5 bg-ontos-card rounded-full overflow-hidden mx-auto">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(doc.processing_progress ?? 0) * 100}%`,
                            backgroundColor: STATUS_COLORS[doc.status] || "#6b7280",
                          }}
                        />
                      </div>
                    </td>
                    <td className="p-3 text-center text-ontos-muted">{doc.page_count || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDocs.length > 50 && (
              <div className="p-3 text-center text-xs text-ontos-muted border-t border-ontos-border">
                Showing 50 of {filteredDocs.length} documents
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
