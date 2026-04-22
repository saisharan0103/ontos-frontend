"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Deal Overview", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/ontology", label: "Ontology", icon: "M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" },
  { href: "/valuation", label: "Valuation", icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" },
  { href: "/risks", label: "Red Flags", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  { href: "/comps", label: "Comparables", icon: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" },
  { href: "/documents", label: "Due Diligence", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/structure", label: "Corporate Structure", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
  { href: "/query", label: "Ask the Deal Room", icon: "M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/compiler", label: "Compiled .onto", icon: "M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" },
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-ontos-border bg-ontos-bg/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-md p-1.5 transition-colors hover:bg-ontos-surface lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-ontos-accent to-purple-500">
                <span className="text-sm font-bold text-white">O</span>
              </div>
              <span className="text-base font-semibold tracking-tight text-ontos-text">ontos</span>
            </Link>
            <div className="mx-1 hidden h-5 w-px bg-ontos-border sm:block" />
            <span className="hidden text-xs uppercase tracking-[0.12em] text-ontos-muted sm:block">PE Deal Analysis</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs text-ontos-muted md:flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              Pipeline Active
            </span>
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-red-400">
              Confidential
            </span>
          </div>
        </div>
      </header>

      <div className="fixed left-0 right-0 top-14 z-40 border-b border-red-500/10 bg-red-500/5">
        <div className="py-0.5 text-center">
          <span className="text-[9px] font-medium uppercase tracking-[0.3em] text-red-400/60">
            Confidential - Project EVON / Desert Cab - Do Not Distribute
          </span>
        </div>
      </div>

      <div className="flex pt-[calc(3.5rem+1.25rem)]">
        <aside className="fixed bottom-0 left-0 top-[calc(3.5rem+1.25rem)] hidden w-56 flex-col overflow-y-auto border-r border-ontos-border bg-ontos-bg lg:flex">
          <nav className="flex flex-col gap-0.5 p-3">
            <span className="px-3 py-2 text-[10px] font-medium uppercase tracking-[0.15em] text-ontos-muted">Deal Process</span>
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
                    active
                      ? "bg-ontos-accent/10 font-medium text-ontos-accent-bright"
                      : "text-ontos-muted hover:bg-ontos-surface hover:text-ontos-text"
                  }`}
                >
                  <NavIcon d={item.icon} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto border-t border-ontos-border p-4">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-ontos-muted">Target Company</div>
            <div className="text-xs font-medium text-ontos-text">Desert Cab / EVON Technologies</div>
            <div className="text-[11px] text-ontos-muted">Las Vegas, Nevada</div>
            <div className="mt-1 text-[11px] text-ontos-muted">214 VDR documents</div>
            <div className="mt-2 w-fit rounded bg-amber-500/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-amber-400">
              Phase: Initial Screening
            </div>
          </div>
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 pt-14 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
            <aside className="relative h-full w-64 overflow-y-auto border-r border-ontos-border bg-ontos-bg">
              <nav className="flex flex-col gap-0.5 p-3">
                {NAV_ITEMS.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
                        active
                          ? "bg-ontos-accent/10 font-medium text-ontos-accent-bright"
                          : "text-ontos-muted hover:bg-ontos-surface hover:text-ontos-text"
                      }`}
                    >
                      <NavIcon d={item.icon} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        <main className="min-h-[calc(100vh-3.5rem-1.25rem)] flex-1 lg:ml-56">
          <div className="mx-auto max-w-[1400px] p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </>
  );
}
