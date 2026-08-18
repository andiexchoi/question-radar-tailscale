import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`https://question-radar.test${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Tailscale demand report", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Question Radar — Tailscale demand intelligence<\/title>/i);
  assert.match(html, /Questions are/);
  assert.match(html, /129/);
  assert.match(html, /Content sample/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/i);
});

test("ships the reproducible research package", async () => {
  const [data, methodology, article] = await Promise.all([
    readFile(new URL("../data/questions.json", import.meta.url), "utf8"),
    readFile(new URL("../data/methodology.md", import.meta.url), "utf8"),
    readFile(new URL("../content/tailscale-kubernetes-private-service.md", import.meta.url), "utf8"),
  ]);

  const parsed = JSON.parse(data);
  assert.equal(parsed.total, 129);
  assert.equal(parsed.sourceStatus.length, 4);
  assert.ok(parsed.summary.clusters.length >= 8);
  assert.match(methodology, /relevance × 35%/);
  assert.match(article, /Tailscale Kubernetes Operator/);
  await access(new URL("../public/og.png", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
