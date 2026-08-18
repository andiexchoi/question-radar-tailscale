"use client";

import { useMemo, useState } from "react";
import dataset from "@/data/questions.json";

type Tab = "findings" | "opportunities" | "sample" | "methodology";
type Question = (typeof dataset.questions)[number];

const intentOrder = ["Discover", "Compare", "Evaluate", "Troubleshoot", "Adopt"];
const intentColors: Record<string, string> = {
  Discover: "#2f66ff",
  Compare: "#ff6b2c",
  Evaluate: "#7767db",
  Troubleshoot: "#141915",
  Adopt: "#91ad25",
};

const sourceCode: Record<string, string> = {
  "Hacker News": "HN",
  Reddit: "r/",
  "Stack Overflow": "SO",
  "Search suggestions": "⌕",
};

const opportunityCopy: Record<string, { title: string; angle: string; format: string }> = {
  "Tailscale with Kubernetes": {
    title: "Expose a private Kubernetes service without a public load balancer",
    angle: "A production-minded Operator tutorial covering private ingress, policy boundaries and HA.",
    format: "Technical tutorial",
  },
  "Tailscale SSH": {
    title: "Tailscale SSH vs. OpenSSH: a decision guide for platform teams",
    angle: "Explain identity, host keys, revocation, check mode and where conventional SSH still belongs.",
    format: "Decision guide",
  },
  "Remote home lab access": {
    title: "The no-port-forwarding home lab: three safe access patterns",
    angle: "Compare per-device clients, a subnet router and a private service proxy with clear diagrams.",
    format: "Architecture guide",
  },
  "Subnet routing and exit nodes": {
    title: "Subnet router or exit node? Choose the route you actually need",
    angle: "Use packet paths and concrete scenarios to end a persistent conceptual mix-up.",
    format: "Explainer + lab",
  },
  "Alternatives and self-hosting": {
    title: "Tailscale, Headscale, NetBird or ZeroTier: the operational trade-offs",
    angle: "Compare control planes, policy, relays, client management and the real cost of self-hosting.",
    format: "Comparison",
  },
  "Services without port forwarding": {
    title: "Private access, Funnel or reverse proxy? A service exposure decision tree",
    angle: "Start with who needs access, then choose the narrowest safe publishing pattern.",
    format: "Interactive decision tree",
  },
  "Enterprise access controls": {
    title: "From identity provider to least privilege: a practical tailnet access model",
    angle: "Show groups, tags, grants, lifecycle ownership and denied-path tests for a growing team.",
    format: "Enterprise playbook",
  },
  "Tailscale vs traditional VPNs": {
    title: "Tailscale vs. a traditional VPN: where the network model changes",
    angle: "Move beyond feature tables to topology, identity, routing and day-two operations.",
    format: "Category comparison",
  },
};

const opportunities = dataset.summary.clusters
  .filter((cluster) => opportunityCopy[cluster.name])
  .map((cluster) => ({ ...cluster, ...opportunityCopy[cluster.name] }))
  .slice(0, 8);

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })
    .format(new Date(value));
}

function Header({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  const labels: [Tab, string][] = [
    ["findings", "Findings"],
    ["opportunities", "Opportunities"],
    ["sample", "Content sample"],
    ["methodology", "Methodology"],
  ];

  return (
    <header className="site-header">
      <button className="brand" onClick={() => setTab("findings")}>
        <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
        question radar
      </button>
      <nav aria-label="Report sections">
        {labels.map(([value, label]) => (
          <button className={tab === value ? "active" : ""} onClick={() => setTab(value)} key={value}>
            {label}
          </button>
        ))}
      </nav>
      <div className="live"><i /> DATA · {formatDate(dataset.generatedAt).toUpperCase()}</div>
    </header>
  );
}

function ProjectContext() {
  return (
    <aside className="project-context">
      <p><strong>Independent application project</strong> for Tailscale&apos;s Technical Growth Content Specialist role.</p>
      <div>
        <span>Unofficial · not affiliated with Tailscale</span>
        <a href="https://andiechoi.com" target="_blank" rel="noreferrer">Built by Andie Choi ↗</a>
        <a href="https://github.com/andiexchoi" target="_blank" rel="noreferrer">GitHub ↗</a>
        <a href="https://github.com/andiexchoi/question-radar-tailscale" target="_blank" rel="noreferrer">Repository ↗</a>
      </div>
    </aside>
  );
}

function Findings() {
  const [intent, setIntent] = useState("All");
  const [source, setSource] = useState("All");
  const [query, setQuery] = useState("");

  const questions = useMemo(() => dataset.questions.filter((question) => {
    const matchesIntent = intent === "All" || question.intent === intent;
    const matchesSource = source === "All" || question.source === source;
    const haystack = `${question.title} ${question.excerpt} ${question.cluster}`.toLowerCase();
    return matchesIntent && matchesSource && haystack.includes(query.toLowerCase());
  }).slice(0, 8), [intent, source, query]);

  const intents = intentOrder.map((name) => dataset.summary.byIntent.find((item) => item.name === name) || { name, count: 0, share: 0 });
  const strongest = dataset.summary.clusters[0];
  const actionShare = intents.filter((item) => ["Adopt", "Troubleshoot"].includes(item.name)).reduce((sum, item) => sum + item.share, 0);

  return (
    <>
      <section className="intro">
        <div className="intro-copy">
          <div className="kicker">TAILSCALE DEMAND INTELLIGENCE / CURRENT SNAPSHOT</div>
          <h1>Questions are<br />public signals.</h1>
          <p>
            I tracked what technical buyers are asking about Tailscale, VPNs,
            zero-trust networking and remote access—then turned the clearest
            patterns into content hypotheses worth testing.
          </p>
          <div className="source-row">
            {dataset.summary.bySource.map((item) => <span key={item.name}>{sourceCode[item.name]} <b>{item.count}</b></span>)}
          </div>
        </div>
        <div className="headline-finding">
          <div className="finding-label">THE ONE-LINE FINDING</div>
          <blockquote>
            Within this directional sample, the strongest opportunity is content that moves users from
            <em> “can this work?”</em> to <em>“here is the exact setup.”</em>
          </blockquote>
          <div className="sample-size">
            <strong>{dataset.total}</strong>
            <span>curated public signals<br />in this snapshot</span>
          </div>
        </div>
      </section>

      <section className="findings section-wrap">
        <div className="section-title">
          <span>01 / FINDINGS</span>
          <h2>What people are trying to do</h2>
          <p>Intent is more useful than platform when deciding what to publish.</p>
        </div>
        <div className="intent-grid">
          {intents.map((item) => (
            <button
              className={`intent ${intent === item.name ? "selected" : ""}`}
              key={item.name}
              onClick={() => setIntent(intent === item.name ? "All" : item.name)}
              style={{ "--intent": intentColors[item.name] } as React.CSSProperties}
            >
              <div className="intent-top"><span>{item.name}</span><strong>{item.share}%</strong></div>
              <div className="intent-bar"><i style={{ width: `${Math.min(100, item.share * 2.4)}%` }} /></div>
              <p>{item.count} signals</p>
            </button>
          ))}
        </div>

        <div className="callout-grid">
          <article className="big-callout">
            <span className="number">01</span>
            <div>
              <div className="callout-tag">STRONGEST OPPORTUNITY</div>
              <h3>{strongest.name}</h3>
              <p>{strongest.count} related signals produce the highest hypothesis score in this directional snapshot.</p>
            </div>
          </article>
          <article className="small-callout acid">
            <div className="callout-tag">ACTION-ORIENTED DEMAND</div>
            <h3>{actionShare}% want to adopt or troubleshoot</h3>
            <span>IMPLEMENTATION CONTENT WINS</span>
          </article>
          <article className="small-callout dark">
            <div className="callout-tag">BUSINESS-RICH THEME</div>
            <h3>Private Kubernetes access</h3>
            <span>OPERATOR · POLICY · HA</span>
          </article>
        </div>
      </section>

      <section className="explorer section-wrap">
        <div className="section-title inline">
          <div><span>02 / EVIDENCE</span><h2>Signal explorer</h2></div>
          <p>Filter the checked-in dataset. Every record links back to its public source.</p>
        </div>
        <div className="filter-bar">
          <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search signals" /></label>
          <label>Intent<select value={intent} onChange={(event) => setIntent(event.target.value)}><option>All</option>{intentOrder.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label>Source<select value={source} onChange={(event) => setSource(event.target.value)}><option>All</option>{dataset.summary.bySource.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
          <a className="download" href="/questions.json" download>↓ Dataset JSON</a>
        </div>
        <div className="question-list">
          {questions.map((question: Question) => (
            <a className="question" href={question.discussionUrl || question.url} target="_blank" rel="noreferrer" key={question.id}>
              <span className={`source-badge source-${sourceCode[question.source]?.replace("/", "r")}`}>{sourceCode[question.source]}</span>
              <div>
                <div className="question-meta"><span>{question.intent}</span><span>{question.cluster}</span></div>
                <h3>{question.title}</h3>
                <p>{question.excerpt}</p>
              </div>
              <div className="q-score"><span>PRIORITY</span><strong>{question.scores.opportunity}</strong></div>
              <span className="arrow">↗</span>
            </a>
          ))}
          {!questions.length && <div className="empty">No signals match those filters.</div>}
        </div>
      </section>
    </>
  );
}

function Opportunities({ openSample }: { openSample: () => void }) {
  return (
    <section className="panel opportunities-panel">
      <div className="panel-intro">
        <div><span>CONTENT PRIORITY / 8 RECOMMENDATIONS</span><h1>Publish where<br />friction is visible.</h1></div>
        <p>Hypothesis scores combine relevance, technical depth, freshness and likely business value. They prioritize experiments; they do not estimate search volume.</p>
      </div>
      <div className="opportunity-list">
        {opportunities.map((item, index) => (
          <article className={`opportunity ${index === 0 ? "featured" : ""}`} key={item.name}>
            <span className="rank">{String(index + 1).padStart(2, "0")}</span>
            <div className="opportunity-copy">
              <div className="opportunity-tags"><span>{item.format}</span><span>{item.count} signals</span></div>
              <h2>{item.title}</h2>
              <p>{item.angle}</p>
              <div className="score-breakdown">
                <span>REL <b>{item.relevance}</b></span><span>DEPTH <b>{item.depth}</b></span><span>FRESH <b>{item.freshness}</b></span><span>VALUE <b>{item.business}</b></span>
              </div>
              {index === 0 && <button onClick={openSample}>Read the sample article →</button>}
            </div>
            <div className="score"><span>HYPOTHESIS<br />SCORE</span><strong>{item.opportunity}</strong></div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <pre><button onClick={() => navigator.clipboard?.writeText(String(children))}>COPY</button><code>{children}</code></pre>;
}

function SampleArticle() {
  return (
    <article className="article panel">
      <header className="article-hero">
        <div className="article-meta"><span>TECHNICAL SAMPLE</span><span>12 MIN READ</span><span>HYPOTHESIS SCORE {opportunities[0]?.opportunity}</span></div>
        <h1>Expose a private Kubernetes service to your tailnet—without a public load balancer</h1>
        <p>A practical Tailscale Kubernetes Operator tutorial for giving engineers private, identity-aware access to an internal HTTP service.</p>
        <div className="validation-status"><strong>Validation status</strong><span>Documentation-validated technical sample. The commands have not been executed against a live Kubernetes cluster.</span></div>
      </header>

      <div className="article-body">
        <aside className="article-aside"><span>IN THIS GUIDE</span><a href="#architecture">Architecture</a><a href="#install">Install</a><a href="#expose">Expose</a><a href="#restrict">Restrict</a><a href="#production">Production</a><a href="#troubleshoot">Troubleshoot</a></aside>
        <div className="prose">
          <p className="lede">Your internal dashboard does not need a public IP, public DNS record, or internet-facing load balancer just because engineers need to reach it from home.</p>
          <p>The Tailscale Kubernetes Operator can give a Kubernetes <code>Service</code> a private tailnet address. Authenticated devices reach an ingress proxy over Tailscale; the proxy forwards traffic to the normal cluster service. The workload stays off the public internet.</p>

          <h2 id="architecture">What you will build</h2>
          <div className="architecture" aria-label="Engineer laptop connects through Tailscale ingress to a Kubernetes service">
            <div><b>Engineer laptop</b><span>trusted tailnet identity</span></div><i>encrypted connection →</i><div><b>Tailscale ingress</b><span>proxy inside Kubernetes</span></div><i>cluster network →</i><div><b>Internal service</b><span>application Pods</span></div>
          </div>
          <p>Use this pattern for dashboards, staging tools, admin panels and APIs that should be reachable by a defined group—but not the whole internet.</p>

          <h2 id="install">1. Give the operator a constrained identity</h2>
          <p>Add an operator tag and a child tag to your tailnet policy. The separation lets you authorize workloads without treating the operator itself as an application endpoint.</p>
          <Code>{`{
  "tagOwners": {
    "tag:k8s-operator": [],
    "tag:k8s": ["tag:k8s-operator"]
  }
}`}</Code>
          <p>Create an OAuth client tagged <code>tag:k8s-operator</code>. Grant write scope only for Services, Devices and Auth Keys. Keep the secret out of Git.</p>
          <Code>{`helm repo add tailscale https://pkgs.tailscale.com/helmcharts
helm repo update

helm upgrade --install tailscale-operator tailscale/tailscale-operator \\
  --namespace=tailscale --create-namespace \\
  --set-string oauth.clientId="$TS_OAUTH_CLIENT_ID" \\
  --set-string oauth.clientSecret="$TS_OAUTH_CLIENT_SECRET" \\
  --wait`}</Code>

          <h2 id="expose">2. Expose one service privately</h2>
          <p>Assume the application listens on port 8080. Add the Tailscale expose annotation to a normal Kubernetes service and choose a stable MagicDNS hostname.</p>
          <Code>{`apiVersion: v1
kind: Service
metadata:
  name: internal-dashboard
  namespace: platform-tools
  annotations:
    tailscale.com/expose: "true"
    tailscale.com/hostname: "platform-dashboard"
spec:
  selector:
    app: internal-dashboard
  ports:
    - name: http
      port: 80
      targetPort: 8080`}</Code>
          <p>After applying the manifest, wait for the operator to create its proxy, then test from a device connected to the tailnet:</p>
          <Code>{`kubectl -n platform-tools get service internal-dashboard --watch
curl -I http://platform-dashboard`}</Code>

          <h2 id="restrict">3. Restrict who can reach it</h2>
          <p>Private is not the same as authorized. Start with a narrow grant, merge it into your existing policy, then test both an allowed and a denied identity.</p>
          <Code>{`{
  "grants": [{
    "src": ["group:platform"],
    "dst": ["tag:k8s"],
    "ip": ["tcp:80"]
  }]
}`}</Code>
          <div className="note"><strong>Test the negative path.</strong><span>“It works for me” proves routing. It does not prove the access boundary. Confirm a tailnet member outside the group cannot connect.</span></div>

          <h2 id="production">4. Upgrade the ingress path for production</h2>
          <p>The annotation pattern creates a standalone proxy. For an uptime-sensitive service, use a multi-replica <code>ProxyGroup</code> and Tailscale-managed Ingress.</p>
          <Code>{`apiVersion: tailscale.com/v1alpha1
kind: ProxyGroup
metadata:
  name: private-ingress
spec:
  type: ingress
  replicas: 2
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: internal-dashboard
  annotations:
    tailscale.com/proxy-group: private-ingress
spec:
  ingressClassName: tailscale
  tls:
    - hosts: [platform-dashboard]
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: internal-dashboard
                port: { number: 80 }`}</Code>

          <h2 id="troubleshoot">Troubleshoot by layer</h2>
          <table><thead><tr><th>Symptom</th><th>Check first</th><th>Layer</th></tr></thead><tbody>
            <tr><td>Service has no endpoints</td><td><code>EndpointSlice</code> and Pod readiness</td><td>Kubernetes</td></tr>
            <tr><td>No Tailscale address appears</td><td>Operator logs and OAuth scopes</td><td>Control plane</td></tr>
            <tr><td>Name resolves; connection times out</td><td>Tailnet grants and <code>NetworkPolicy</code></td><td>Authorization</td></tr>
            <tr><td>Works until the proxy restarts</td><td>Move to a multi-replica <code>ProxyGroup</code></td><td>Availability</td></tr>
          </tbody></table>
          <p>A subnet router and an ingress proxy solve different problems. A subnet router advertises whole private CIDRs; ingress exposes a specific Kubernetes service. Prefer the narrower service path when general cluster-network access is unnecessary.</p>

          <h2>Production checklist</h2>
          <ul><li>Use workload-specific tags instead of broad access to every <code>tag:k8s</code> device.</li><li>Manage OAuth credentials outside Git, or use workload identity federation.</li><li>Keep Kubernetes <code>NetworkPolicy</code> in place.</li><li>Test a denied identity and a non-tailnet device.</li><li>Monitor the operator and proxy Pods.</li></ul>
          <div className="article-sources"><strong>Primary references</strong><a href="https://tailscale.com/docs/kubernetes-operator/install-operator" target="_blank" rel="noreferrer">Install the Kubernetes Operator ↗</a><a href="https://tailscale.com/docs/kubernetes-operator/ingress" target="_blank" rel="noreferrer">Private cluster ingress ↗</a><a href="https://tailscale.com/docs/kubernetes-operator/ingress/expose-workload-to-tailnet-l7" target="_blank" rel="noreferrer">Layer 7 high-availability ingress ↗</a></div>
        </div>
      </div>
    </article>
  );
}

function Methodology() {
  return (
    <section className="panel methodology">
      <div className="panel-intro">
        <div><span>REPRODUCIBLE BY DESIGN</span><h1>Small dataset.<br />Visible method.</h1></div>
        <p>This is a prioritization instrument, not a claim of total search volume. The collector, raw normalized records and scoring logic live together in the repository.</p>
      </div>
      <div className="method-grid">
        <article><span>01</span><h2>Collect</h2><p>A rolling 90-day window from Hacker News, Reddit and Stack Overflow, plus a point-in-time search-suggestion snapshot.</p></article>
        <article><span>02</span><h2>Classify</h2><p>Deterministic rules assign Discover, Compare, Evaluate, Troubleshoot or Adopt intent and one topic cluster.</p></article>
        <article><span>03</span><h2>Score</h2><p>An initial weighting hypothesis: relevance 35% · business value 25% · technical depth 20% · freshness 20%, plus a bounded volume bonus.</p></article>
        <article><span>04</span><h2>Recommend</h2><p>Ideas must answer a recurring question with an angle and format that are more useful than a generic category explainer.</p></article>
      </div>

      <div className="score-hypothesis">
        <div><span>WHY THESE WEIGHTS</span><h2>A starting hypothesis,<br />not a fitted model</h2></div>
        <p><strong>Relevance receives 35%</strong> because direct audience and product fit is the first gate. <strong>Business value receives 25%</strong> to favor signals closer to adoption, production use and team rollout. <strong>Technical depth and freshness receive 20% each</strong> because specificity and timing improve usefulness, but neither alone demonstrates demand. These author-defined weights have not been calibrated against traffic or conversion data.</p>
      </div>

      <div className="internal-access">
        <div><span>NEXT VALIDATION LAYER</span><h2>What I would do with internal access</h2></div>
        <div className="internal-grid">
          <article><strong>Search Console</strong><p>Validate query volume, impressions, click-through rate and ranking gaps by cluster.</p></article>
          <article><strong>Product analytics</strong><p>Connect content visits to signup, second-node connection and first useful route.</p></article>
          <article><strong>Attribution</strong><p>Measure assisted upgrades, self-serve revenue and the paths that precede conversion.</p></article>
          <article><strong>Customer evidence</strong><p>Test the language and priorities in support logs, sales calls and user interviews.</p></article>
        </div>
      </div>

      <div className="measurement">
        <div className="measurement-title"><span>MEASUREMENT PLAN</span><h2>Follow the signal to revenue</h2><p>Use leading indicators to improve the content; use product outcomes to decide whether the topic was commercially useful.</p></div>
        <div className="funnel">
          <div><span>01</span><strong>Impressions</strong><p>Search Console visibility by query cluster</p></div><i>→</i>
          <div><span>02</span><strong>Rankings</strong><p>Top-3 and top-10 coverage, non-brand included</p></div><i>→</i>
          <div><span>03</span><strong>AI citations</strong><p>Answer-engine mentions with a cited URL</p></div><i>→</i>
          <div><span>04</span><strong>Signups</strong><p>Visitor-to-product signup conversion</p></div><i>→</i>
          <div><span>05</span><strong>Activation</strong><p>Second node connected or first useful route</p></div><i>→</i>
          <div><span>06</span><strong>Self-serve revenue</strong><p>Attributed upgrade and assisted pipeline</p></div>
        </div>
      </div>

      <div className="limitations">
        <h2>Read the caveats before the score</h2>
        <p>Public APIs omit private, deleted, personalized and unindexed demand. Reddit may block automated API requests, so this snapshot includes a transparent web-indexed fallback. Search suggestions vary by language and location. Keyword rules are reproducible, not as nuanced as human labeling. High-ranking incidental mentions are removed through a checked-in manual review list. Treat every score as a content hypothesis to validate with first-party evidence.</p>
        <div className="method-actions"><a href="/questions.json" download>Download dataset</a><a href="https://hn.algolia.com/api" target="_blank" rel="noreferrer">HN Search API ↗</a><a href="https://api.stackexchange.com/docs" target="_blank" rel="noreferrer">Stack Exchange API ↗</a></div>
      </div>
    </section>
  );
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("findings");
  return (
    <main>
      <ProjectContext />
      <Header tab={tab} setTab={setTab} />
      {tab === "findings" && <Findings />}
      {tab === "opportunities" && <Opportunities openSample={() => setTab("sample")} />}
      {tab === "sample" && <SampleArticle />}
      {tab === "methodology" && <Methodology />}
      <footer><span>BUILT BY ANDIE CHOI · INDEPENDENT, UNOFFICIAL PROJECT</span><span>{dataset.total} PUBLIC SIGNALS · 4 SOURCE TYPES · REFRESHABLE</span></footer>
    </main>
  );
}
