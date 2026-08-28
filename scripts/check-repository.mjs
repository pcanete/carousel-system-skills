import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
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

// --- versiones -------------------------------------------------------------
// La tabla de docs/versioning.md afirmaba versiones que ningún skill
// declaraba. Una tabla que nada puede contradecir es decorativa.
const declaredVersions = new Map();

for (const name of skillNames) {
  const skill = readFileSync(join(root, "skills", name, "SKILL.md"), "utf8");
  const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)[1];
  const version = frontmatter.match(/version:\s*"?(\d+\.\d+\.\d+)"?/)?.[1];
  assert.ok(version, `skills/${name}/SKILL.md no declara metadata.version`);
  declaredVersions.set(name, version);
}

for (const document of ["docs/versioning.md", "README.md"]) {
  const file = join(root, document);
  if (!existsSync(file)) continue;

  const rows = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trimStart().startsWith("|") && /\d+\.\d+\.\d+/.test(line));

  for (const [name, version] of declaredVersions) {
    for (const row of rows) {
      if (!row.includes(name)) continue;
      assert.ok(
        row.includes(version),
        `${document}: ${name} debería decir ${version} — ${row.trim()}`,
      );
    }
  }
}

// --- sintaxis de todo lo ejecutable ---------------------------------------
for (const name of skillNames) {
  const directory = join(root, "skills", name, "scripts");
  if (!existsSync(directory)) continue;

  for (const path of filesUnder(directory).filter((value) => value.endsWith(".mjs"))) {
    const result = spawnSync(process.execPath, ["--check", path], { encoding: "utf8" });
    assert.equal(result.status, 0, `sintaxis inválida en ${path}: ${result.stderr}`);
  }
}

// --- extractor de Instagram -----------------------------------------------
// Es el único ejecutable del analizador y estaba fuera de toda verificación,
// mientras build.mjs tenía pruebas de comportamiento. Depende del formato de
// una página ajena que puede cambiar sin aviso: lo verificable localmente es
// qué enlaces acepta y que un cambio de formato produzca un error que lo diga.
const python = ["python3", "python"].find((candidate) => {
  const probe = spawnSync(candidate, ["--version"], { encoding: "utf8" });
  return probe.status === 0;
});

assert.ok(python, "hace falta Python 3 para verificar el extractor");

const extractorTests = spawnSync(
  python,
  [join(root, "skills", "analizar-carrusel-referencia", "scripts", "test_extractor.py")],
  { encoding: "utf8" },
);

assert.equal(
  extractorTests.status,
  0,
  `pruebas del extractor fallidas:\n${extractorTests.stdout}${extractorTests.stderr}`,
);

// --- compuerta editorial ---------------------------------------------------
// Los tres estados importan por igual. Una compuerta que calla cuando le falta
// una pieza es peor que no tenerla: la entrega afirma un filtro que no corrió.
const editorial = join(root, "skills", "carousel-builder", "scripts", "check-editorial.mjs");
const gateFixture = mkdtempSync(join(tmpdir(), "carousel-editorial-"));
const piecePath = join(gateFixture, "guion.md");
writeFileSync(piecePath, "Una afirmación sin preguntas retóricas.\n");

const clientBrand = join(gateFixture, "cliente", "brand");
mkdirSync(clientBrand, { recursive: true });
writeFileSync(
  join(clientBrand, "BRAND_RULES.json"),
  JSON.stringify({
    version: "0.1.0",
    brand: { name: "fixture" },
    rules: [
      {
        id: "sin-pregunta-retorica",
        kind: "forbid",
        statement: "No abrir con pregunta retórica.",
        scope: ["opening"],
        severity: "block",
        detect: { type: "regex", pattern: "^\\s*¿", flags: "i" },
      },
    ],
  }),
);

function runGate(extra) {
  return spawnSync(process.execPath, [editorial, "--piece", piecePath, ...extra], {
    encoding: "utf8",
  });
}

const withoutRules = runGate(["--client-dir", join(gateFixture, "sin-cliente")]);
assert.equal(withoutRules.status, 0, "sin reglas no debe bloquear la producción");
assert.match(
  withoutRules.stdout,
  /Sin verificación editorial/,
  "sin reglas tiene que decir que no verificó",
);

const withoutChecker = runGate([
  "--client-dir",
  join(gateFixture, "cliente"),
  "--checker",
  join(gateFixture, "no-existe.mjs"),
]);
assert.match(
  withoutChecker.stdout,
  /no se encontró/,
  "con reglas y sin verificador tiene que decirlo",
);

const requiredRun = runGate([
  "--client-dir",
  join(gateFixture, "cliente"),
  "--checker",
  join(gateFixture, "no-existe.mjs"),
  "--require",
]);
assert.notEqual(requiredRun.status, 0, "--require debe fallar si la verificación no corrió");

console.log("repository validation OK");
