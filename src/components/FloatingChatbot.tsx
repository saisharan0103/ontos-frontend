/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { MessageCircle, X, Trash2, Send, Sparkles } from "lucide-react";
import { queryDeal } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────

interface Source {
  document_name: string;
  document_id: string;
  chunk_id: string;
  page_number: number;
  text: string;
  relevance: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  isLoading?: boolean;
  isError?: boolean;
}

// ── Suggested questions ────────────────────────────────────────────

const SUGGESTED = [
  "What are the top risks in this deal?",
  "What's the FY2026 revenue projection?",
  "Who are the key people in Desert Cab?",
  "What contradictions did the pipeline find?",
  "What's the EV transition thesis?",
];

// ── Typing dots ────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div className="flex gap-1.5 items-center px-4 py-3.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-ontos-muted animate-bounce"
          style={{ animationDelay: `${i * 0.18}s`, animationDuration: "0.9s" }}
        />
      ))}
    </div>
  );
}

// ── Source pills ───────────────────────────────────────────────────

function SourcesList({ sources }: { sources: Source[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const top = sources.slice(0, 3);

  return (
    <div className="mt-2.5 pt-2.5 border-t border-ontos-border/50">
      <div className="text-[10px] uppercase tracking-[0.12em] text-ontos-muted font-semibold mb-1.5">
        Sources ({sources.length})
      </div>
      <div className="flex flex-col gap-1">
        {top.map(s => (
          <div key={s.chunk_id}>
            <button
              onClick={() => setExpanded(expanded === s.chunk_id ? null : s.chunk_id)}
              className="w-full text-left text-[10px] px-2 py-1.5 rounded-lg bg-ontos-card border border-ontos-border/50 hover:border-ontos-accent/40 transition-all flex items-center gap-1.5 group"
            >
              <span className="text-[11px]">📄</span>
              <span className="flex-1 truncate text-ontos-muted group-hover:text-ontos-text transition-colors">
                {s.document_name}
              </span>
              {s.page_number > 0 && (
                <span className="text-ontos-muted/70 flex-shrink-0 font-mono">p.{s.page_number}</span>
              )}
              <span
                className="flex-shrink-0 font-semibold tabular-nums"
                style={{ color: s.relevance >= 0.8 ? "#22c55e" : s.relevance >= 0.6 ? "#f59e0b" : "#6b7280" }}
              >
                {Math.round(s.relevance * 100)}%
              </span>
              <svg
                className={`w-3 h-3 text-ontos-muted transition-transform flex-shrink-0 ${expanded === s.chunk_id ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expanded === s.chunk_id && (
              <div className="mt-1 px-2.5 py-2 bg-ontos-card border border-ontos-accent/20 rounded-lg">
                <p className="text-[10px] text-ontos-muted leading-relaxed line-clamp-5">{s.text}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Single message bubble ──────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[82%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm text-white leading-relaxed"
          style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] space-y-0.5">
        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-ontos-card border border-ontos-border/60 text-sm text-ontos-text leading-relaxed">
          {msg.isLoading ? (
            <ThinkingDots />
          ) : msg.isError ? (
            <p className="text-red-400 text-sm">{msg.content}</p>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-1">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          )}
          {msg.sources && msg.sources.length > 0 && (
            <SourcesList sources={msg.sources} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty / suggested state ────────────────────────────────────────

function EmptyState({ onSuggest }: { onSuggest: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-5 py-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-ontos-accent/10 border border-ontos-accent/25 flex items-center justify-center mb-4">
        <Sparkles className="w-6 h-6 text-ontos-accent" />
      </div>
      <p className="text-sm text-ontos-text font-medium mb-1.5">Ask the Deal Room</p>
      <p className="text-[12px] text-ontos-muted leading-relaxed mb-6 max-w-[280px]">
        I can answer questions about the EVON / Desert Cab deal based on the VDR documents.
      </p>
      <div className="flex flex-col gap-2 w-full max-w-[320px]">
        {SUGGESTED.map(q => (
          <button
            key={q}
            onClick={() => onSuggest(q)}
            className="w-full text-left text-[12px] px-3.5 py-2.5 rounded-xl bg-ontos-surface border border-ontos-border hover:border-ontos-accent/40 hover:bg-ontos-accent/5 text-ontos-muted hover:text-ontos-text transition-all"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main floating chatbot ──────────────────────────────────────────

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 220);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  // ── Send ─────────────────────────────────────────────────────────

  const handleSend = useCallback(async (question?: string) => {
    const text = (question ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const loadingId = crypto.randomUUID();
    const loadingMsg: Message = { id: loadingId, role: "assistant", content: "", isLoading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);

    try {
      const result = await queryDeal(text);
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingId
            ? {
                ...m,
                content: result.answer,
                sources: result.sources ?? [],
                isLoading: false,
              }
            : m,
        ),
      );
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingId
            ? {
                ...m,
                content: "Sorry, I couldn't reach the deal room. Please try again.",
                isLoading: false,
                isError: true,
              }
            : m,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => setMessages([]);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Chat panel ── */}
      <div
        className={`fixed bottom-24 right-6 z-50 transition-all duration-200 ease-out origin-bottom-right
          sm:w-[420px] sm:h-[600px] w-[calc(100vw-24px)] h-[calc(100vh-96px)]
          bg-ontos-surface border border-ontos-border rounded-2xl shadow-2xl flex flex-col overflow-hidden
          ${isOpen
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-4 scale-95 pointer-events-none"
          }`}
        role="dialog"
        aria-modal="true"
        aria-label="Deal Room Chat"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-ontos-border/70 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold leading-tight">Ask the Deal Room</div>
            <div className="text-[10px] text-ontos-muted">Powered by RAG over 76 VDR documents</div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                title="Clear chat"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-ontos-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              title="Close"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-ontos-muted hover:text-ontos-text hover:bg-ontos-card transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <EmptyState onSuggest={(q) => handleSend(q)} />
          ) : (
            <div className="space-y-3">
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 border-t border-ontos-border/70 px-3 py-3">
          <div className="flex items-end gap-2 bg-ontos-card border border-ontos-border/60 rounded-xl px-3 py-2 focus-within:border-ontos-accent/50 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Ask anything about the deal…"
              rows={1}
              className="flex-1 bg-transparent text-sm text-ontos-text placeholder-ontos-muted resize-none outline-none leading-relaxed disabled:opacity-50"
              style={{ maxHeight: 96, overflowY: "auto" }}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
              style={{
                background: loading || !input.trim()
                  ? "transparent"
                  : "linear-gradient(135deg, #7c3aed, #4f46e5)",
              }}
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-ontos-muted/40 border-t-ontos-muted rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 text-white" />
              )}
            </button>
          </div>
          <div className="text-[10px] text-ontos-muted/50 text-right mt-1 pr-1">
            Enter to send · Shift+Enter for newline
          </div>
        </div>
      </div>

      {/* ── Floating action button ── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        title="Ask the Deal Room"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-150 hover:scale-105 hover:shadow-2xl"
        style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
        aria-label="Open deal room chat"
        aria-expanded={isOpen}
      >
        {/* Pulse ring */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-purple-500/35 animate-ping" style={{ animationDuration: "2s" }} />
        )}
        <div className="relative transition-transform duration-150" style={{ transform: isOpen ? "rotate(0deg)" : "rotate(0deg)" }}>
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <MessageCircle className="w-6 h-6 text-white" />
          )}
        </div>
      </button>
    </>
  );
}
