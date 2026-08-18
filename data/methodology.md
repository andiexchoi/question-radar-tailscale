# Question Radar methodology

Question Radar treats public technical questions as evidence of audience demand. The collector checks four surfaces:

- Hacker News via the public Algolia HN Search API
- Reddit via its public search response when available, with a checked-in web-indexed snapshot as a transparent fallback when Reddit blocks automated requests
- Stack Overflow via the Stack Exchange API
- Google autocomplete suggestions via the public suggestion endpoint

## Collection

The dataset uses a rolling 90-day window for dated sources. Search suggestions are a point-in-time snapshot because the endpoint does not expose dates. Queries cover Tailscale, mesh VPNs, zero-trust networking, remote access, home labs, Kubernetes, SSH, subnet routing, port forwarding, and alternatives.

The collector normalizes HTML, deduplicates exact normalized titles, and keeps the higher-engagement record when duplicate titles appear. It excludes records without a direct match to a tracked product or category term.

## Intent classification

Each question receives one deterministic intent:

- **Discover:** Understand the category or a possible use case.
- **Compare:** Contrast Tailscale with another product or networking model.
- **Evaluate:** Assess security, scale, identity, performance, pricing, or production suitability.
- **Troubleshoot:** Resolve a failure, connectivity problem, or unexpected behavior.
- **Adopt:** Install, configure, deploy, expose, connect, or operationalize a use case.

## Scoring

Every record receives four 0–100 component scores and a weighted opportunity score:

`opportunity = relevance × 35% + technical depth × 20% + freshness × 20% + business value × 25%`

- **Relevance** rewards exact product, competitor, and category matches.
- **Technical depth** rewards concrete implementation concepts such as Kubernetes, subnet routes, DNS, SSH, ACLs, SSO, NAT, firewalls, and operators.
- **Freshness** decays with age for dated sources. Suggestions receive a fixed point-in-time freshness score.
- **Business value** rewards adoption, production, team, enterprise, access, security, and scaling language.

Cluster scores use the mean of their member questions plus a bounded volume bonus. This keeps a large but weak cluster from automatically outranking a smaller, technically rich one.

## Limitations

The dataset is directional, not a measure of total search volume. Public APIs can omit deleted, private, rate-limited, personalized, or unindexed questions. Keyword classification is reproducible but less nuanced than human labeling. Search suggestions are location- and language-sensitive. Use the findings to prioritize experiments, then validate with Search Console, product analytics, and customer conversations.
