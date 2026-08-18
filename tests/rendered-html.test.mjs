import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("ships the interactive Tailscale findings surface", async () => {
  const [page, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Questions are/);
  assert.match(page, /Signal explorer/);
  assert.match(page, /Content sample/);
  assert.match(page, /Methodology/);
  assert.match(page, /Built by Andie Choi/);
  assert.match(page, /https:\/\/andiechoi\.com/);
  assert.match(page, /Documentation-validated technical sample/);
  assert.match(layout, /Question Radar — Tailscale demand intelligence/);
  assert.doesNotMatch(page, /SkeletonPreview|react-loading-skeleton/i);
});

test("ships the reproducible research package", async () => {
  const [data, methodology, article] = await Promise.all([
    readFile(new URL("../data/questions.json", import.meta.url), "utf8"),
    readFile(new URL("../data/methodology.md", import.meta.url), "utf8"),
    readFile(new URL("../content/tailscale-kubernetes-private-service.md", import.meta.url), "utf8"),
  ]);

  const parsed = JSON.parse(data);
  assert.ok(parsed.total > 100);
  assert.equal(parsed.sourceStatus.length, 4);
  assert.ok(parsed.curation.reviewedExclusions > 0);
  assert.ok(parsed.summary.clusters.length >= 8);
  assert.match(methodology, /relevance × 35%/);
  assert.match(article, /Tailscale Kubernetes Operator/);
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/questions.json", import.meta.url));
});
