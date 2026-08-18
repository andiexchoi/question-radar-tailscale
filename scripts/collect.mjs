import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT = path.resolve("data/questions.json");
const PUBLIC_OUTPUT = path.resolve("public/questions.json");
const LOOKBACK_DAYS = 90;
const now = new Date();
const cutoff = Math.floor((now.getTime() - LOOKBACK_DAYS * 864e5) / 1000);

const queries = [
  "tailscale",
  "mesh vpn",
  "zero trust networking",
  "remote access home lab",
  "vpn without port forwarding",
  "tailscale kubernetes",
  "tailscale ssh",
  "tailscale subnet router",
  "tailscale alternative",
];

const suggestionSeeds = [
  "tailscale ",
  "tailscale vs ",
  "how to use tailscale for ",
  "tailscale kubernetes ",
  "tailscale ssh ",
  "tailscale home lab ",
  "tailscale not working ",
  "remote access without port forwarding ",
  "zero trust network for ",
  "mesh vpn vs ",
];

const competitorTerms = ["zerotier", "netbird", "twingate", "cloudflare access", "teleport", "headscale", "wireguard"];
const productTerms = ["tailscale", ...competitorTerms, "mesh vpn", "zero trust", "remote access"];

const stripHtml = (value = "") => value
  .replace(/<[^>]*>/g, " ")
  .replace(/&quot;/g, '"')
  .replace(/&#x27;|&#39;/g, "'")
  .replace(/&amp;/g, "&")
  .replace(/\s+/g, " ")
  .trim();

const compact = (value = "", max = 280) => {
  const clean = stripHtml(value);
  return clean.length > max ? `${clean.slice(0, max - 1).trim()}…` : clean;
};

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(18000),
    headers: {
      accept: "application/json",
      "user-agent": "QuestionRadar/1.0 (public research collector)",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function collectHackerNews() {
  const records = [];
  for (const query of queries) {
    const params = new URLSearchParams({
      query,
      tags: "(story,comment)",
      hitsPerPage: "35",
      numericFilters: `created_at_i>${cutoff}`,
    });
    const data = await fetchJson(`https://hn.algolia.com/api/v1/search_by_date?${params}`);
    for (const hit of data.hits || []) {
      const title = compact(hit.title || hit.story_title || hit.comment_text || "");
      if (!title) continue;
      records.push({
        id: `hn-${hit.objectID}`,
        source: "Hacker News",
        title,
        excerpt: compact(hit.comment_text || hit.story_text || title),
        url: hit.url || hit.story_url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        discussionUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        author: hit.author || null,
        createdAt: hit.created_at || null,
        engagement: Number(hit.points || 0) + Number(hit.num_comments || 0),
        matchedQuery: query,
      });
    }
  }
  return records;
}

async function collectReddit() {
  const records = [];
  try {
    for (const query of queries) {
      const params = new URLSearchParams({ q: query, sort: "new", t: "year", limit: "35", raw_json: "1" });
      const data = await fetchJson(`https://www.reddit.com/search.json?${params}`);
      for (const child of data?.data?.children || []) {
        const post = child.data;
        if (!post?.title) continue;
        records.push({
          id: `reddit-${post.id}`,
          source: "Reddit",
          title: compact(post.title),
          excerpt: compact(post.selftext || post.title),
          url: post.url_overridden_by_dest || `https://www.reddit.com${post.permalink}`,
          discussionUrl: `https://www.reddit.com${post.permalink}`,
          author: post.author || null,
          community: post.subreddit_name_prefixed || null,
          createdAt: new Date(post.created_utc * 1000).toISOString(),
          engagement: Number(post.score || 0) + Number(post.num_comments || 0),
          matchedQuery: query,
        });
      }
    }
  } catch (error) {
    const snapshot = JSON.parse(await fs.readFile(path.resolve("data/reddit-web-snapshot.json"), "utf8"));
    console.warn(`Reddit API unavailable (${error.message}); using the checked-in web snapshot.`);
    return snapshot;
  }
  return records;
}

async function collectStackOverflow() {
  const records = [];
  for (const query of queries) {
    const params = new URLSearchParams({
      order: "desc",
      sort: "activity",
      q: query,
      site: "stackoverflow",
      pagesize: "35",
      fromdate: String(cutoff),
      filter: "default",
    });
    const data = await fetchJson(`https://api.stackexchange.com/2.3/search/advanced?${params}`);
    for (const item of data.items || []) {
      records.push({
        id: `stackoverflow-${item.question_id}`,
        source: "Stack Overflow",
        title: compact(item.title),
        excerpt: compact(item.title),
        url: item.link,
        discussionUrl: item.link,
        author: item.owner?.display_name || null,
        createdAt: new Date(item.creation_date * 1000).toISOString(),
        engagement: Number(item.score || 0) + Number(item.answer_count || 0) + Number(item.view_count || 0) / 100,
        matchedQuery: query,
        tags: item.tags || [],
      });
    }
  }
  return records;
}

async function collectSuggestions() {
  const records = [];
  for (const seed of suggestionSeeds) {
    const params = new URLSearchParams({ client: "firefox", q: seed });
    const data = await fetchJson(`https://suggestqueries.google.com/complete/search?${params}`);
    for (const [index, suggestion] of (data?.[1] || []).entries()) {
      records.push({
        id: `suggest-${Buffer.from(suggestion).toString("base64url")}`,
        source: "Search suggestions",
        title: compact(suggestion),
        excerpt: `Autocomplete question surfaced from the seed “${seed.trim()}”.`,
        url: `https://www.google.com/search?q=${encodeURIComponent(suggestion)}`,
        discussionUrl: null,
        author: null,
        createdAt: now.toISOString(),
        engagement: Math.max(1, 10 - index),
        matchedQuery: seed.trim(),
      });
    }
  }
  return records;
}

function inferIntent(text) {
  const t = text.toLowerCase();
  const rules = [
    ["Troubleshoot", /\b(error|issue|problem|fail|failed|failing|broken|cannot|can't|unable|not working|slow|debug|fix|why (is|does|won't)|connection refused|timeout)\b/],
    ["Compare", /\b(vs\.?|versus|alternative|comparison|compare|better than|replace|instead of|wireguard|zerotier|netbird|twingate|cloudflare|traditional vpn)\b/],
    ["Evaluate", /\b(secure|security|production|enterprise|scale|scaling|pricing|cost|audit|compliance|sso|identity provider|idp|acl|policy|performance|limitation)\b/],
    ["Adopt", /\b(set ?up|configure|install|connect|deploy|expose|access|home ?lab|subnet|kubernetes|k8s|docker|port forwarding|ssh|guide|tutorial)\b/],
  ];
  return rules.find(([, regex]) => regex.test(t))?.[0] || "Discover";
}

function inferCluster(text) {
  const t = text.toLowerCase();
  const clusters = [
    ["Tailscale vs traditional VPNs", /traditional vpn|replace.*vpn|vpn.*replace|mesh vpn vs|tailscale vs.*vpn/],
    ["Remote home lab access", /home ?lab|nas|home server|proxmox|raspberry pi|remote.*home/],
    ["Tailscale with Kubernetes", /kubernetes|\bk8s\b|operator|cluster ingress/],
    ["Services without port forwarding", /port forward|opening ports|expose.*service|public ip|cgnat|reverse proxy/],
    ["Tailscale SSH", /tailscale ssh|conventional ssh|openssh|ssh access/],
    ["Enterprise access controls", /enterprise|access control|\bacl\b|grants|identity provider|\bidp\b|\bsso\b|okta|entra/],
    ["Subnet routing and exit nodes", /subnet rout|exit node|site.to.site|lan access|route advertis/],
    ["Alternatives and self-hosting", /zerotier|netbird|twingate|headscale|alternative|self.host/],
    ["Connectivity and performance", /derp|relay|nat traversal|latency|slow|connection|firewall|dns|magicdns/],
  ];
  return clusters.find(([, regex]) => regex.test(t))?.[0] || "Core concepts and use cases";
}

function score(record) {
  const text = `${record.title} ${record.excerpt}`.toLowerCase();
  const termHits = productTerms.filter(term => text.includes(term)).length;
  const relevance = Math.min(100, 42 + termHits * 16 + (text.includes("tailscale") ? 22 : 0));
  const depthTerms = ["kubernetes", "subnet", "nat", "dns", "ssh", "acl", "sso", "identity", "docker", "route", "firewall", "linux", "api", "operator"];
  const depth = Math.min(100, 28 + depthTerms.filter(term => text.includes(term)).length * 11 + Math.min(20, record.title.length / 6));
  const daysOld = record.createdAt ? Math.max(0, (now - new Date(record.createdAt)) / 864e5) : LOOKBACK_DAYS;
  const freshness = record.source === "Search suggestions" ? 78 : Math.max(20, Math.round(100 - daysOld * 0.9));
  const businessTerms = ["enterprise", "team", "production", "pricing", "security", "sso", "access", "deploy", "kubernetes", "vpn", "remote", "scale"];
  const business = Math.min(100, 31 + businessTerms.filter(term => text.includes(term)).length * 10 + (record.intent === "Adopt" ? 13 : 0));
  const opportunity = Math.round(relevance * 0.35 + depth * 0.2 + freshness * 0.2 + business * 0.25);
  return { relevance: Math.round(relevance), depth: Math.round(depth), freshness, business: Math.round(business), opportunity };
}

function normalize(records) {
  const seen = new Map();
  for (const record of records) {
    const key = record.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const existing = seen.get(key);
    if (!existing || record.engagement > existing.engagement) seen.set(key, record);
  }
  return [...seen.values()]
    .filter(record => productTerms.some(term => `${record.title} ${record.excerpt}`.toLowerCase().includes(term)))
    .map(record => {
      const intent = inferIntent(`${record.title} ${record.excerpt}`);
      const enriched = { ...record, intent, cluster: inferCluster(`${record.title} ${record.excerpt}`) };
      return { ...enriched, scores: score(enriched) };
    })
    .sort((a, b) => b.scores.opportunity - a.scores.opportunity);
}

function summarize(records) {
  const by = (field) => Object.entries(records.reduce((acc, record) => {
    acc[record[field]] = (acc[record[field]] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count, share: Math.round(count / records.length * 100) }));

  const clusters = [...new Set(records.map(record => record.cluster))].map(name => {
    const items = records.filter(record => record.cluster === name);
    const average = (field) => Math.round(items.reduce((sum, item) => sum + item.scores[field], 0) / items.length);
    const volumeBonus = Math.min(12, Math.round(Math.log2(items.length + 1) * 3));
    return {
      name,
      count: items.length,
      relevance: average("relevance"),
      depth: average("depth"),
      freshness: average("freshness"),
      business: average("business"),
      opportunity: Math.min(99, average("opportunity") + volumeBonus),
      topQuestions: items.slice(0, 5).map(item => item.id),
    };
  }).sort((a, b) => b.opportunity - a.opportunity);

  return { bySource: by("source"), byIntent: by("intent"), clusters };
}

const tasks = [
  ["Hacker News", collectHackerNews],
  ["Reddit", collectReddit],
  ["Stack Overflow", collectStackOverflow],
  ["Search suggestions", collectSuggestions],
];

const sourceStatus = [];
const collected = [];
for (const [source, collector] of tasks) {
  try {
    const records = await collector();
    collected.push(...records);
    sourceStatus.push({ source, status: "ok", collected: records.length });
    console.log(`${source}: ${records.length}`);
  } catch (error) {
    sourceStatus.push({ source, status: "error", collected: 0, message: error.message });
    console.warn(`${source}: ${error.message}`);
  }
}

const questions = normalize(collected);
const dataset = {
  generatedAt: now.toISOString(),
  lookbackDays: LOOKBACK_DAYS,
  topics: ["Tailscale", "VPNs", "zero-trust networking", "remote access"],
  competitors: competitorTerms,
  sourceStatus,
  total: questions.length,
  summary: summarize(questions),
  questions,
};

await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
const serialized = `${JSON.stringify(dataset, null, 2)}\n`;
await fs.writeFile(OUTPUT, serialized);
await fs.mkdir(path.dirname(PUBLIC_OUTPUT), { recursive: true });
await fs.writeFile(PUBLIC_OUTPUT, serialized);
console.log(`Saved ${questions.length} normalized questions to ${OUTPUT}`);
