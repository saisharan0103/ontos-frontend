"use client";

import { useState, useEffect, useRef } from "react";
import { queryDeal, getQueryHistory, QueryResult } from "@/lib/api";

export default function QueryPage() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<QueryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getQueryHistory()
      .then(setHistory)
      .catch(() => [])
      .finally(() => setLoadingHistory(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    const q = question.trim();
    setQuestion("");
    setLoading(true);

    try {
      const result = await queryDeal(q);
      setHistory((prev) => [...prev, result]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      console.error("Query failed:", err);
    }
    setLoading(false);
  };

  const suggestedQuestions = [
    "What is the consolidated EBITDA from the financial model?",
    "What are the key risks in this deal?",
    "Describe the corporate structure of Desert Cab",
    "What is the Uber partnership revenue uplift?",
    "What entities are involved in the merger?",
    "What is the EV charging infrastructure plan?",
  ];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="animate-fade-up">
        <div className="flex items-center gap-2 text-ontos-muted text-xs uppercase tracking-[0.15em] mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-ontos-accent" />
          RAG Query Interface
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Ask the Deal Room</h1>
        <p className="text-ontos-muted mt-2 text-sm">
          Query the VDR documents using natural language. Answers are sourced from indexed documents with citations.
        </p>
      </div>

      {/* Suggested Questions */}
      {history.length === 0 && !loadingHistory && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-up animation-delay-150">
          {suggestedQuestions.map((sq) => (
            <button
              key={sq}
              onClick={() => setQuestion(sq)}
              className="bg-ontos-surface border border-ontos-border rounded-xl p-4 text-left hover:border-ontos-accent/30 transition-all group"
            >
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-ontos-accent mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-ontos-muted group-hover:text-ontos-text transition-colors">{sq}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Chat History */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {loadingHistory && (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-ontos-accent/30 border-t-ontos-accent rounded-full animate-spin" />
          </div>
        )}

        {history.map((item, idx) => (
          <div key={item.id || idx} className="bg-ontos-surface border border-ontos-border rounded-xl p-5 animate-fade-up">
            {/* Answer */}
            <div className="prose prose-invert prose-sm max-w-none text-xs text-ontos-text leading-relaxed whitespace-pre-wrap">
              {item.answer}
            </div>

            {/* Sources */}
            {item.sources && item.sources.length > 0 && (
              <div className="mt-4 pt-3 border-t border-ontos-border">
                <div className="text-[10px] uppercase tracking-wider text-ontos-muted mb-2">Sources ({item.sources.length})</div>
                <div className="space-y-1.5">
                  {item.sources.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-[10px] text-ontos-muted">
                      <span className="text-ontos-accent">📄</span>
                      <div>
                        <span className="font-medium">{s.document_name}</span>
                        <span className="mx-1">·</span>
                        <span>p.{s.page_number}</span>
                        <span className="mx-1">·</span>
                        <span className="font-mono text-ontos-accent">{(s.relevance * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="bg-ontos-surface border border-ontos-border rounded-xl p-5 animate-fade-up">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-ontos-accent/30 border-t-ontos-accent rounded-full animate-spin" />
              <span className="text-sm text-ontos-muted">Searching deal room documents...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="sticky bottom-0 bg-ontos-bg pt-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about the deal..."
            className="flex-1 text-sm bg-ontos-surface border border-ontos-border rounded-xl px-4 py-3 text-ontos-text placeholder-ontos-muted focus:outline-none focus:border-ontos-accent/50 transition-colors"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!question.trim() || loading}
            className="px-6 py-3 bg-ontos-accent text-white rounded-xl text-sm font-medium hover:bg-ontos-accent-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Ask"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
