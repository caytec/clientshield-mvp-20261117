const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("required project files exist", () => {
  const files = [
    "index.html",
    "css/styles.css",
    "js/config.js",
    "js/app.js",
    "api/generate.js",
    "vercel.json",
    ".env.example",
    "README.md",
    "robots.txt",
    "sitemap.xml",
    "assets/favicon.svg",
    "assets/og.png"
  ];

  files.forEach((file) => {
    assert.equal(fs.existsSync(path.join(root, file)), true, file);
  });
});

test("sitemap and robots use absolute GitHub Pages URLs", () => {
  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");

  assert.match(sitemap, /<loc>https:\/\/caytec\.github\.io\/clientshield-mvp-20261117\//);
  assert.match(robots, /Sitemap: https:\/\/caytec\.github\.io\/clientshield-mvp-20261117\/sitemap\.xml/);
});

test("vercel configuration is valid JSON", () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
  assert.equal(vercel.functions["api/generate.js"].maxDuration, 10);
});

test("client API URL is configurable and defaults safely", () => {
  const config = fs.readFileSync(path.join(root, "js/config.js"), "utf8");
  assert.match(config, /window\.API_URL/);
  assert.match(config, /window\.API_URL \|\| ""/);
});

test("API uses the permitted environment variables only", () => {
  const api = fs.readFileSync(path.join(root, "api/generate.js"), "utf8");
  const envNames = [...api.matchAll(/process\.env\.([A-Z_]+)/g)].map((match) => match[1]);
  assert.deepEqual([...new Set(envNames)].sort(), [
    "AI_PROVIDER",
    "ALLOWED_ORIGINS",
    "GEMINI_API_KEY",
    "GROQ_API_KEY"
  ]);
});
