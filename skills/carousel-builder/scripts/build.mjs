// carousel-builder v2 — spec + config -> HTML autocontenido con QA.
// Uso: node build.mjs --config <carousel.config.json> --spec <slides.json> --out <dir-pieza>

import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  existsSync,
} from "node:fs";
import { dirname, resolve, join, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || !process.argv[i + 1]) {
    fail(`falta --${name}. Uso: node build.mjs --config <json> --spec <json> --out <dir>`);
  }
  return process.argv[i + 1];
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`no se pudo leer ${label}: ${error.message}`);
  }
}

const configPath = resolve(arg("config"));
const specPath = resolve(arg("spec"));
const outDir = resolve(arg("out"));
const cfg = readJson(configPath, configPath);
const spec = readJson(specPath, specPath);
const cfgDir = dirname(configPath);
const specDir = dirname(specPath);

function assetUrl(baseDir, value, label) {
  if (typeof value !== "string" || value.trim() === "") fail(`${label}: ruta vacía`);
  const path = isAbsolute(value) ? value : resolve(baseDir, value);
  if (!existsSync(path)) fail(`${label}: no existe ${path}`);
  return pathToFileURL(path).href;
}
const fromCfg = (value, label = "asset de configuración") => assetUrl(cfgDir, value, label);
const fromSpec = (value, label = "asset de pieza") => assetUrl(specDir, value, label);

const W = Number(cfg.canvas?.width ?? 1080);
const H = Number(cfg.canvas?.height ?? 1350);
if (!Number.isInteger(W) || !Number.isInteger(H) || W < 320 || H < 320) {
  fail("canvas.width y canvas.height deben ser enteros de al menos 320 px");
}

if (!Array.isArray(spec.slides) || spec.slides.length === 0) {
  fail("slides.json debe contener un array slides no vacío");
}

const allowedKinds = new Set(["text", "rule", "question", "photo", "closing"]);
for (const [index, slide] of spec.slides.entries()) {
  if (!slide || typeof slide !== "object") fail(`slide ${index + 1}: objeto inválido`);
  if (!allowedKinds.has(slide.kind)) {
    fail(`slide ${index + 1}: kind no admitido: ${slide.kind ?? "(vacío)"}`);
  }
  if (typeof slide.title !== "string" || slide.title.trim() === "") {
    fail(`slide ${index + 1}: title es obligatorio`);
  }
  if (slide.kind === "photo" && (typeof slide.photo !== "string" || !slide.photo)) {
    fail(`slide ${index + 1}: photo es obligatorio para kind=photo`);
  }
}

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// Primero escapa todo; después habilita únicamente **acento**.
const rich = (value) =>
  escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<span class="hl">$1</span>');

function safePosition(value) {
  const position = String(value ?? "center").trim();
  const token = "(?:center|top|bottom|left|right|(?:100|[0-9]{1,2})%)";
  if (!new RegExp(`^${token}(?:\\s+${token})?$`).test(position)) {
    fail(`posición de foto no admitida: ${position}`);
  }
  return position;
}

const C = cfg.colores ?? {};
const ACCENT = C.acento ?? C.texto ?? "#fff";
const tipo = { ...(cfg.tipografia ?? {}) };
if (!tipo.principal && Array.isArray(cfg.fuentes)) {
  tipo.principal = { archivo: cfg.fuentes };
}

let fontFaces = "";
function fontFamily(role, fallback) {
  const entry = tipo[role];
  if (!entry) return fallback;
  if (entry.archivo) {
    const family = `Marca-${role}`;
    const files = Array.isArray(entry.archivo) ? entry.archivo : [entry];
    for (const file of files) {
      if (!file.archivo) fail(`tipografia.${role}: falta archivo`);
      const weight = Number(file.peso ?? entry.peso ?? 400);
      fontFaces += `@font-face { font-family: "${family}"; src: url("${fromCfg(file.archivo, `tipografia.${role}`)}"); font-weight: ${weight}; }\n  `;
    }
    return `"${family}"`;
  }
  if (entry.familia) return `"${String(entry.familia).replaceAll('"', "")}"`;
  return fallback;
}

const famPrincipal = fontFamily("principal", "Arial");
const famMono = fontFamily("mono", "monospace");
const header = cfg.header ?? null;
const footer = cfg.pie ?? null;
const headerH = header ? 190 : 0;
const footerReserve = Math.max(0, Number(footer?.reservaPx ?? 0));
const frameBottom = Math.max(96, footerReserve + 36);

const css = `
  ${fontFaces}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
  body { background: ${C.fondo ?? "#000"}; color: ${C.texto ?? "#fff"}; font-family: ${famPrincipal}, sans-serif; position: relative; }
  .hl { color: ${ACCENT}; }
  .header { position: absolute; z-index: 4; top: 84px; left: 96px; right: 96px; display: flex; align-items: center; gap: 30px; }
  .header img { height: 52px; mix-blend-mode: ${cfg.logo?.blend ?? "normal"}; }
  .divider { width: 5px; height: 60px; background: ${ACCENT}; }
  .brand-url { font-family: ${famMono}, monospace; font-size: 29px; letter-spacing: .14em; }
  .footer { position: absolute; z-index: 4; left: 96px; right: 96px; bottom: 58px; display: flex; justify-content: space-between; gap: 32px; font-family: ${famMono}, monospace; color: ${C.nota ?? C.textoSecundario ?? C.texto ?? "#fff"}; font-size: 24px; letter-spacing: .08em; }
  .frame { position: absolute; z-index: 3; inset: 0; padding: ${headerH + 90}px 96px ${frameBottom}px; display: flex; flex-direction: column; }
  .center { justify-content: center; }
  .bottom { justify-content: flex-end; }
  .tag { font-family: ${famMono}, monospace; color: ${ACCENT}; font-size: 28px; letter-spacing: .12em; margin-bottom: 30px; }
  h1 { font-weight: 700; font-size: 84px; line-height: ${tipo.interlineado?.titulo ?? 1.08}; letter-spacing: -.015em; max-width: ${W - 192}px; }
  .body { font-size: 45px; line-height: ${tipo.interlineado?.cuerpo ?? 1.32}; margin-top: 42px; max-width: ${W - 192}px; }
  .year { color: ${ACCENT}; font-size: 172px; font-weight: 700; line-height: .9; margin-bottom: 40px; }
  .note { color: ${C.nota ?? C.textoSecundario ?? "#aaa"}; font-family: ${famMono}, monospace; font-size: 25px; margin-top: 34px; }
  .question h1 { font-size: 96px; }
  .cta { font-weight: 700; font-size: 44px; margin-top: 58px; padding-top: 38px; border-top: 4px solid ${ACCENT}; }
  .photo-bg { position: absolute; z-index: 0; inset: 0; background-size: cover; background-position: center; filter: ${cfg.fotos?.filtro ?? "none"}; }
  .shade { position: absolute; z-index: 1; inset: 0; background: ${cfg.fotos?.velo ?? "linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.85) 100%)"}; }
  .asset-probe { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
`;

const tagHtml = (slide) => (slide.tag ? `<div class="tag">${rich(slide.tag)}</div>` : "");
const bodyHtml = (slide, key = "body") =>
  slide[key] ? `<div class="body">${rich(slide[key])}</div>` : "";

function headerHtml() {
  if (!header) return "";
  const logo = cfg.logo?.archivo
    ? `<img src="${escapeHtml(fromCfg(cfg.logo.archivo, "logo"))}" alt="">`
    : "";
  const url = header.url ?? cfg.url ?? "";
  return `<div class="header">${logo}<div class="divider"></div><span class="brand-url">${escapeHtml(url)}</span></div>`;
}

function footerHtml() {
  if (!footer) return "";
  return `<div class="footer"><span>${escapeHtml(footer.tagline ?? "")}</span><span>${escapeHtml(footer.url ?? cfg.url ?? "")}</span></div>`;
}

function render(slide) {
  let inner;
  if (slide.kind === "photo") {
    const photoUrl = fromSpec(slide.photo, "foto de slide");
    inner = `
      <div class="photo-bg" style="background-image:url(&quot;${escapeHtml(photoUrl)}&quot;);background-position:${safePosition(slide.pos)}"></div>
      <img class="asset-probe" src="${escapeHtml(photoUrl)}" alt="">
      <div class="shade"></div>
      <div class="frame bottom">
        ${tagHtml(slide)}
        <h1>${rich(slide.title)}</h1>
        ${bodyHtml(slide, "sub")}
      </div>`;
  } else if (slide.kind === "rule") {
    inner = `<div class="frame center">
      ${tagHtml(slide)}
      ${slide.year ? `<div class="year">${rich(slide.year)}</div>` : ""}
      <h1>${rich(slide.title)}</h1>
      ${bodyHtml(slide)}
      ${slide.note ? `<div class="note">${rich(slide.note)}</div>` : ""}
    </div>`;
  } else if (slide.kind === "question") {
    inner = `<div class="frame center question">
      ${tagHtml(slide)}
      <h1>${rich(slide.title)}</h1>
      ${bodyHtml(slide)}
    </div>`;
  } else if (slide.kind === "closing") {
    inner = `<div class="frame center">
      ${tagHtml(slide)}
      <h1>${rich(slide.title)}</h1>
      ${bodyHtml(slide)}
      ${slide.cta ? `<div class="cta">${rich(slide.cta)}</div>` : ""}
    </div>`;
  } else {
    inner = `<div class="frame center">
      ${tagHtml(slide)}
      <h1>${rich(slide.title)}</h1>
      ${bodyHtml(slide)}
    </div>`;
  }

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src file: data:; font-src file: data:; style-src 'unsafe-inline'; script-src 'nonce-carousel-qa'">
  <style>${css}</style>
</head>
<body>${inner}${headerHtml()}${footerHtml()}<script nonce="carousel-qa">${qa}</script></body>
</html>`;
}

const qa = `
window.addEventListener("load", async () => {
  await document.fonts.ready;
  const problems = [];
  const W = ${W}, H = ${H};
  const header = document.querySelector(".header");
  const footer = document.querySelector(".footer");
  const hr = header ? header.getBoundingClientRect() : null;
  const fr = footer ? footer.getBoundingClientRect() : null;

  for (const img of document.querySelectorAll("img")) {
    if (!img.complete || img.naturalWidth === 0) problems.push("asset-ausente");
  }

  for (const el of document.querySelectorAll("body *")) {
    if (el.matches("script, style, .asset-probe")) continue;
    if ((header && (el === header || header.contains(el))) || (footer && (el === footer || footer.contains(el)))) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const isBackground = el.matches(".photo-bg, .shade");
    if (!isBackground && (r.right > W + 1 || r.bottom > H + 1 || r.left < -1 || r.top < -1)) {
      problems.push("overflow:" + (el.className || el.tagName));
    }
  }

  for (const el of document.querySelectorAll(".frame > *")) {
    const r = el.getBoundingClientRect();
    if (hr && r.top < hr.bottom + 20 && r.bottom > hr.top) problems.push("pisa-header");
    if (fr && r.bottom > fr.top - 20 && r.top < fr.bottom) problems.push("pisa-pie");
  }

  if (problems.length) {
    const bar = document.createElement("div");
    bar.style.cssText = "position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#ff0020;color:#fff;font:700 24px monospace;padding:12px 16px;";
    bar.textContent = "QA-FAIL " + [...new Set(problems)].join(" | ");
    document.body.appendChild(bar);
  }
  document.body.dataset.qaReady = "true";
});`;

const buildDir = join(outDir, "build");
mkdirSync(buildDir, { recursive: true });
for (const name of readdirSync(buildDir)) {
  if (/^slide-\d+\.(?:html|png)$/.test(name)) unlinkSync(join(buildDir, name));
}

spec.slides.forEach((slide, index) => {
  const file = join(buildDir, `slide-${index + 1}.html`);
  writeFileSync(file, render(slide), "utf8");
  console.log("ok", file);
});
console.log(`${spec.slides.length} slides generados en ${buildDir}`);
