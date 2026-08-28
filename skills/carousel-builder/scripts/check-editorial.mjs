#!/usr/bin/env node

// Verifica un guion contra las reglas editoriales del cliente antes de pedir
// aprobación.
//
// Sin esto, la aprobación editorial la produce quien escribió la pieza,
// interpretando las mismas reglas que tiene que cumplir. Esa verificación
// siempre pasa.
//
// Las reglas viven en la capa del cliente (`<cliente>/brand/BRAND_RULES.json`)
// y el verificador lo aporta `brand-dna-scanner`, que es un paquete aparte.
// Cuando alguna de las dos piezas falta, este script lo dice y no finge haber
// verificado.
//
// Uso:
//   node scripts/check-editorial.mjs --piece guion.md --client-dir clients/x
//
//   --rules <archivo>    reglas explícitas, en vez de buscarlas
//   --checker <archivo>  ruta a check-piece.mjs
//   --require            falla si la verificación no pudo correr
//   --json               salida legible por máquina

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1];
}

const asJson = process.argv.includes("--json");
const requireCheck = process.argv.includes("--require");

const piece = arg("piece", null);
const clientDir = arg("client-dir", ".");
const explicitRules = arg("rules", null);
const explicitChecker = arg("checker", null);

const home = process.env.HOME || process.env.USERPROFILE || "";

// El verificador pertenece a brand-dna-scanner. Se busca donde los motores
// instalan skills, sin asumir cuál está en uso.
function findChecker() {
  if (explicitChecker) {
    return fs.existsSync(explicitChecker) ? explicitChecker : null;
  }

  const candidates = [];

  for (const root of [".claude", ".codex"]) {
    if (!home) continue;
    candidates.push(
      path.join(home, root, "skills", "brand-dna-scanner", "scripts", "check-piece.mjs")
    );
  }

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function findRules() {
  if (explicitRules) {
    return fs.existsSync(explicitRules) ? explicitRules : null;
  }

  const candidate = path.join(clientDir, "brand", "BRAND_RULES.json");
  return fs.existsSync(candidate) ? candidate : null;
}

function report(outcome) {
  if (asJson) {
    console.log(JSON.stringify(outcome, null, 2));
    return;
  }

  console.log(outcome.message);

  if (outcome.output) {
    console.log("");
    console.log(outcome.output.trim());
  }
}

function main() {
  if (!piece) {
    throw new Error("Indicá la pieza con --piece <archivo>.");
  }

  if (!fs.existsSync(piece)) {
    throw new Error(`No existe la pieza: ${piece}`);
  }

  const rules = findRules();
  const checker = findChecker();

  if (!rules) {
    report({
      verified: false,
      reason: "no-rules",
      message:
        "Sin verificación editorial: este cliente no tiene BRAND_RULES.json.\n" +
        "La aprobación queda enteramente a criterio humano. Decilo en la entrega.",
    });

    process.exitCode = requireCheck ? 1 : 0;
    return;
  }

  if (!checker) {
    report({
      verified: false,
      reason: "no-checker",
      rules,
      message:
        `Sin verificación editorial: hay reglas en ${rules} pero no se encontró\n` +
        "check-piece.mjs de brand-dna-scanner. Instalá ese skill o pasá --checker.\n" +
        "No afirmes que la pieza pasó el filtro editorial.",
    });

    process.exitCode = requireCheck ? 1 : 0;
    return;
  }

  const result = spawnSync(
    process.execPath,
    [checker, "--piece", piece, "--rules", rules],
    { encoding: "utf8" }
  );

  const passed = result.status === 0;

  report({
    verified: true,
    passed,
    rules,
    checker,
    message: passed
      ? "Verificación editorial: sin violaciones que bloqueen."
      : "Verificación editorial: hay reglas violadas. No renderizar hasta corregir.",
    output: result.stdout || result.stderr,
  });

  // Las reglas marcadas como `manual` en BRAND_RULES no las resuelve nadie
  // acá: check-piece las reporta como pendientes de juicio y así deben llegar
  // a quien aprueba.
  if (!passed) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
