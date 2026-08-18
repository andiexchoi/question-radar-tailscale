# Question Radar: Tailscale demand intelligence

A small, reproducible research package that turns current public technical questions into content opportunities for Tailscale.

The package includes:

- an interactive findings site;
- a normalized dataset from Hacker News, Reddit, Stack Overflow, and search suggestions;
- deterministic intent clustering and transparent opportunity scoring;
- eight recommended content opportunities;
- a complete sample tutorial for private Kubernetes ingress with the Tailscale Operator; and
- a measurement plan from impressions through self-serve revenue.

## Current snapshot

Generated on August 18, 2026:

- 129 normalized questions
- 4 public source types
- 5 user intents: Discover, Compare, Evaluate, Troubleshoot, Adopt
- 10 topic clusters
- strongest opportunity: Tailscale with Kubernetes

The checked-in snapshot lives at [`data/questions.json`](data/questions.json). The interactive site serves the same file as a download.

## Run the site

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

Validate the production build and rendered package:

```bash
npm test
```

## Refresh the dataset

```bash
node scripts/collect.mjs
```

The collector queries public endpoints, normalizes and deduplicates records, classifies intent and topic, calculates component scores, and writes identical copies to:

- `data/questions.json` for the repository; and
- `public/questions.json` for the site download.

A scheduled GitHub Action runs the collector every six hours and commits the dataset only when it changes.

Reddit sometimes blocks automated public search requests. When that happens, the collector uses the transparent, checked-in web-indexed snapshot at `data/reddit-web-snapshot.json`. The source status is recorded in collector output rather than hidden.

## Scoring

Each question receives four component scores from 0–100:

```text
opportunity = relevance × 35%
            + technical depth × 20%
            + freshness × 20%
            + likely business value × 25%
```

Cluster scores use the mean of their questions plus a bounded volume bonus. See [`data/methodology.md`](data/methodology.md) for classification rules, limitations, and source details.

## Content sample

The highest-ranked opportunity is developed into a publishable tutorial:

[`content/tailscale-kubernetes-private-service.md`](content/tailscale-kubernetes-private-service.md)

It covers operator identity, installation, private service exposure, tailnet grants, high-availability ingress, negative-path testing, and layer-by-layer troubleshooting. Technical claims and commands are grounded in current Tailscale documentation linked in the article.

## Repository map

```text
app/                  interactive findings site
content/              complete content sample
data/                 dataset, fallback snapshot, methodology
public/                downloadable dataset and social card
scripts/collect.mjs    zero-dependency public-source collector
tests/                 rendered-package checks
.github/workflows/     scheduled dataset refresh
```

## Important limitation

This is directional demand intelligence, not a measure of total search volume. Public APIs omit private, deleted, personalized, rate-limited, and unindexed questions. Use the ranking to choose content experiments, then validate them with Search Console, product analytics, and customer conversations.
