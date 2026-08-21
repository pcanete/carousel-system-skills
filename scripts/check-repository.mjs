import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillNames = ["analizar-carrusel-referencia", "carousel-builder"];

const required = [
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "package.json",
  "docs/architecture.md",
  "docs/installation.md",
  "docs/versioning.md",
  ".github/workflows/validate.yml",
];

for (const relative of required) {
  assert.ok(existsSync(join(root, relative)), `missing ${relative}`);
}

function filesUnder(directory) {
  const result = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) result.push(...filesUnder(path));
    else result.push(path);
  }
  return result;
}

for (const name of skillNames) {
  const directory = join(root, "skills", name);
  const skillPath = join(directory, "SKILL.md");
  const uiPath = join(directory, "agents", "openai.yaml");
  assert.ok(existsSync(skillPath), `missing skills/${name}/SKILL.md`);
  assert.ok(existsSync(uiPath), `missing skills/${name}/agents/openai.yaml`);

  const skill = readFileSync(skillPath, "utf8");
  const match = skill.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  assert.ok(match, `invalid frontmatter in ${name}`);
  assert.equal(match[1].match(/^name:\s*(.+)$/m)?.[1]?.trim(), name);
  const description = match[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
  assert.ok(description && description.length <= 1024, `invalid description in ${name}`);
  assert.ok(!/[<>]/.test(description), `description uses angle brackets in ${name}`);
  assert.ok(!/\[TODO:|TODO\b/.test(skill), `unfinished placeholder in ${name}`);

  const ui = readFileSync(uiPath, "utf8");
  assert.ok(ui.includes(`$${name}`), `default prompt must invoke $${name}`);
}

for (const path of filesUnder(root).filter((value) => value.endsWith(".md"))) {
  const content = readFileSync(path, "utf8");
  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, "");
    if (/^(?:https?:|mailto:|#)/.test(target)) continue;
    const withoutAnchor = target.split("#", 1)[0];
    assert.ok(existsSync(resolve(dirname(path), withoutAnchor)), `broken link ${target} in ${path}`);
  }
}

const publicFiles = filesUnder(root).filter(
  (path) => !path.includes("node_modules") && !path.endsWith("check-repository.mjs"),
);
const blocked = [
  /litterbox/i,
  /catbox/i,
  /~\/\.claude/i,
  /Claude Code/i,
  /vaciar la bandeja/i,
];
for (const path of publicFiles) {
  const content = readFileSync(path, "utf8");
  for (const pattern of blocked) {
    assert.ok(!pattern.test(content), `blocked pattern ${pattern} in ${path}`);
  }
}

const builder = join(root, "skills", "carousel-builder", "scripts", "build.mjs");
const syntax = spawnSync(process.execPath, ["--check", builder], { encoding: "utf8" });
assert.equal(syntax.status, 0, syntax.stderr);

const fixture = mkdtempSync(join(tmpdir(), "carousel-system-skills-"));
const configPath = join(fixture, "carousel.config.json");
const specPath = join(fixture, "slides.json");
const outDir = join(fixture, "piece");
writeFileSync(join(fixture, "photo.jpg"), "synthetic fixture");
writeFileSync(
  configPath,
  JSON.stringify({
    cliente: "fixture",
    canvas: { width: 1080, height: 1350 },
    colores: { fondo: "#111111", texto: "#ffffff", acento: "#e4ff3d" },
    tipografia: {
      principal: { familia: "Arial" },
      mono: { familia: "monospace" },
    },
    pie: { reservaPx: 160, tagline: "FIXTURE", url: "example.com" },
  }),
);

const firstSpec = {
  slug: "fixture",
  slides: [
    {
      kind: "rule",
      tag: "CAMBIO",
      year: "1992",
      title: "</h1><script>globalThis.injected=true</script><h1>",
      body: "Texto",
      note: "Fuente oficial",
    },
    { kind: "text", title: "Una **idea**" },
    { kind: "question", title: "¿Qué cambió?", body: "El ritmo." },
    { kind: "closing", title: "Cierre", cta: "Conversar" },
    { kind: "photo", title: "Foto", photo: "photo.jpg", pos: "center 35%" },
  ],
};
writeFileSync(specPath, JSON.stringify(firstSpec));

function runBuild() {
  return spawnSync(
    process.execPath,
    [builder, "--config", configPath, "--spec", specPath, "--out", outDir],
    { encoding: "utf8" },
  );
}

let build = runBuild();
assert.equal(build.status, 0, build.stderr);
const buildDir = join(outDir, "build");
assert.equal(readdirSync(buildDir).filter((name) => /^slide-\d+\.html$/.test(name)).length, 5);
const rule = readFileSync(join(buildDir, "slide-1.html"), "utf8");
assert.ok(rule.includes("1992") && rule.includes("CAMBIO") && rule.includes("Fuente oficial"));
assert.ok(rule.includes("&lt;script&gt;") && !rule.includes("<script>globalThis.injected=true</script>"));
assert.ok(rule.includes("script-src 'nonce-carousel-qa'"));

writeFileSync(specPath, JSON.stringify({ slug: "shorter", slides: [{ kind: "text", title: "Solo uno" }] }));
build = runBuild();
assert.equal(build.status, 0, build.stderr);
assert.deepEqual(
  readdirSync(buildDir).filter((name) => /^slide-\d+\.html$/.test(name)),
  ["slide-1.html"],
);

writeFileSync(specPath, JSON.stringify({ slides: [{ kind: "unknown", title: "Inválido" }] }));
build = runBuild();
assert.notEqual(build.status, 0, "unknown slide kinds must fail");

const renderScript = readFileSync(
  join(root, "skills", "carousel-builder", "scripts", "render.ps1"),
  "utf8",
);
for (const invariant of [
  "--user-data-dir=",
  "QA fallido",
  "slide-*.jpg",
  "Remove-Item -LiteralPath",
]) {
  assert.ok(renderScript.includes(invariant), `render invariant missing: ${invariant}`);
}

console.log("repository validation OK");
