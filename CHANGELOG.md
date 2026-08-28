# Changelog

## Unreleased

`analizar-carrusel-referencia` 0.1.1 · `carousel-builder` 0.2.0

### Editorial gate

The render step has a QA with an explicit rule: do not disable it to force an
output. The editorial approval step had no equivalent — it asked for approval
without supplying anything to produce it. In practice that became a checklist
of ticks filled in by whoever wrote the text, including on the rules that
require judgement.

`check-editorial.mjs` runs the script against the client's rules before asking
for approval. The rules live in `<client>/brand/BRAND_RULES.json` and the
checker comes from `brand-dna-scanner`: the contact point between the two
packages is the rules contract, not the code, and each stays independently
installable.

All three states are covered by tests, because the third is the one that
matters: when the rules file or the checker is missing, the script says so and
the verification **did not run**. That gets stated in the delivery. A gate that
goes quiet when a piece is missing is worse than no gate, because the delivery
then claims a filter that never existed.

### The Instagram extractor, now verified

It was the only executable in `analizar-carrusel-referencia` and sat outside
every check, while `build.mjs` had behaviour tests including HTML injection.

Parsing is now separated from fetching so it can be verified without network
access. `test_extractor.py` covers which links are accepted — including
rejecting a domain that merely ends in `instagram.com` — the escaped context,
and resource selection by width.

It also covers the failure mode that matters: the extractor depends on the
markup of someone else's page, which can change without notice. When that
happens the error now says the format changed and the extractor needs
updating, instead of sending someone to look for the problem in the post.

### Versions that can be contradicted

`docs/versioning.md` claimed `0.1.0` for both skills while no `SKILL.md`
declared a version: the table was backed by nothing. The version now lives in
the frontmatter and the repository check fails when it stops matching the
published table.

Syntax is now checked for every skill `.mjs`, not only `build.mjs`, and CI
installs Python explicitly rather than relying on whatever the image ships.

## Initial public release

- Prepared the two skills as an independently installable public monorepo.
- Added repository validation and GitHub Actions.

## Initial skill versions

- `analizar-carrusel-referencia` 0.1.0
- `carousel-builder` 0.1.0
