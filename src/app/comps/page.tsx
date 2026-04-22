export default function ComparablesPage() {
  const comps = [
    {
      name: "Zoox",
      sector: "Autonomous Fleet",
      description: "Amazon-owned autonomous vehicle company developing purpose-built robotaxis for ride-hailing services.",
      relevance: "Direct comparable for autonomous fleet operations and the AV transition thesis central to EVON's growth strategy.",
      metrics: {
        "Valuation": "$1.2B+ (acquired by Amazon)",
        "Fleet Strategy": "Purpose-built autonomous vehicles",
        "Market": "San Francisco, Las Vegas (testing)",
        "Relevance": "AV/robotaxi transition pathway",
      },
      tags: ["Autonomous", "Fleet", "Robotaxi"],
    },
    {
      name: "Waymo",
      sector: "Autonomous Fleet",
      description: "Alphabet's autonomous driving subsidiary operating commercial robotaxi services in multiple US cities.",
      relevance: "The leading autonomous fleet operator. EVON's medallion base and market position in Las Vegas could make it an ideal Waymo partner or acquisition target.",
      metrics: {
        "Valuation": "$45B+ (Alphabet subsidiary)",
        "Fleet Size": "700+ vehicles",
        "Market": "Phoenix, SF, LA, Austin",
        "Relevance": "Partnership/integration opportunity",
      },
      tags: ["Autonomous", "Fleet", "Scale"],
    },
    {
      name: "Revel",
      sector: "EV Charging / Mobility",
      description: "EV charging and electric rideshare company operating fast-charging hubs and an all-electric rideshare fleet.",
      relevance: "Direct comparable for EVON's IoCharge EV charging infrastructure buildout. Similar vertical integration of charging + fleet operations.",
      metrics: {
        "Funding": "$200M+ raised",
        "Charging": "Fast-charging superhubs",
        "Market": "New York City",
        "Relevance": "EV charging infrastructure comparable",
      },
      tags: ["EV Charging", "Rideshare", "Infrastructure"],
    },
  ];

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <div className="flex items-center gap-2 text-ontos-muted text-xs uppercase tracking-[0.15em] mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-ontos-accent" />
          Market Intelligence
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Comparable Companies</h1>
        <p className="text-ontos-muted mt-2 text-sm">
          Selected comparables reflecting EVON&apos;s dual thesis: autonomous fleet operations and EV charging infrastructure.
        </p>
      </div>

      {/* Comp Cards */}
      <div className="space-y-4">
        {comps.map((comp) => (
          <div key={comp.name} className="bg-ontos-surface border border-ontos-border rounded-xl p-6 animate-fade-up">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-semibold">{comp.name}</h2>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-ontos-accent/10 text-ontos-accent uppercase tracking-wider">
                    {comp.sector}
                  </span>
                </div>
                <p className="text-xs text-ontos-muted max-w-2xl">{comp.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {Object.entries(comp.metrics).map(([key, value]) => (
                <div key={key}>
                  <div className="text-[10px] uppercase tracking-wider text-ontos-muted mb-1">{key}</div>
                  <div className="text-sm font-medium">{value}</div>
                </div>
              ))}
            </div>

            <div className="bg-ontos-card rounded-lg p-3 mt-3">
              <div className="text-[10px] uppercase tracking-wider text-ontos-muted mb-1">Relevance to EVON</div>
              <p className="text-xs text-ontos-muted">{comp.relevance}</p>
            </div>

            <div className="flex gap-2 mt-3">
              {comp.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-ontos-card border border-ontos-border text-ontos-muted">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Comp Matrix */}
      <div className="bg-ontos-surface border border-ontos-border rounded-xl p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ontos-muted mb-4">Comparison Matrix</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-ontos-border">
                <th className="text-left p-3 text-ontos-muted font-medium">Factor</th>
                <th className="text-center p-3 text-ontos-muted font-medium">EVON</th>
                <th className="text-center p-3 text-ontos-muted font-medium">Zoox</th>
                <th className="text-center p-3 text-ontos-muted font-medium">Waymo</th>
                <th className="text-center p-3 text-ontos-muted font-medium">Revel</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Fleet Operations", "✅ 750+ medallions", "✅ Purpose-built", "✅ 700+ vehicles", "✅ Electric fleet"],
                ["AV/Autonomy", "🔄 Transition ready", "✅ Full stack", "✅ Full stack", "❌ Not focused"],
                ["EV Charging", "✅ IoCharge buildout", "❌ Not focused", "❌ Not focused", "✅ Superhubs"],
                ["Market Position", "✅ 90%+ LV share", "🔄 Testing phase", "✅ Multi-city leader", "🔄 NYC only"],
                ["Revenue Model", "✅ Diversified", "❌ Pre-revenue", "🔄 Early revenue", "✅ Charging + rides"],
                ["Profitability", "✅ $14M EBITDA", "❌ Net loss", "❌ Net loss", "❌ Net loss"],
              ].map(([factor, ...values]) => (
                <tr key={factor} className="border-b border-ontos-border/50">
                  <td className="p-3 font-medium">{factor}</td>
                  {values.map((v, i) => (
                    <td key={i} className="p-3 text-center text-ontos-muted">{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
