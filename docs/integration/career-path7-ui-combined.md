# CAREER-PATH7 × UI composition — isolated combined checkout

LAND13, 2026-09-11. Answers one question precisely: does the ordinary
offer → acceptance → work → earned pay → save/reload journey work against
UI's _actual current_ composition (`codex/ui-core-release-transfer` at
`302e1f0cb3fb6c7d5823c41cf9b5bf87d2bfcac2`), not a fixture route or an
assumed root?

## What was built

A local, disposable branch merging UI's current head with this reconciled
CAREER-PATH7 + FISCAL + ENV + EDU tree (`cursor/land13-career-7cb6` at
`8f9a376c`, itself current `main` + CAREER #152). Never pushed to UI's
branch — this session cannot write there (blocked as a shared-resource
write) — built and run locally only, then discarded.

Conflicts were the expected "two branches touched PlayerGame.tsx/education
independently" shape: generated prose-inventory artifacts (regenerated via
`corpus:prose`), the corpus-count test pin (kept UI's own live-comparison
form, more robust than a re-pinned number), `package.json`'s `validate`
script (unioned both sides' additions), an import-order-only diff in
`life-paths2.ts`, a UI-only person-selection addition in
`SceneBackdrop.tsx` (kept), and EDU-PATH7 appearing as two independently
built implementations (`EducationOptionsPanel`/`catalog-load` on UI vs
`compact`/`expandInstitution` on the reconciled tree) — resolved to the
already-accepted, already-merged-to-`main` version, since that is the
authoritative one and this composition is proof-only.

## First finding, corrected

An initial pass assumed CAREER-PATH7's own panel wasn't mounted in UI's
"work" surface and added a sibling `<CareerPathsPanel>` next to
`LifePathsPanel` in `PlayerGame.tsx`'s `case "work"`. That produced two
`aria-label="Career opportunities"` regions — because `LifePathsPanel`
**already** imports and renders `CareerPathsPanel` internally
(`src/player/LifePathsPanel.tsx:3,101`). The addition was reverted. No
patch to UI's composition was needed at all.

## What actually ran, and passed

`tests/e2e/career-path7.spec.ts`, unmodified spec, against the combined
checkout, real browser, headed toward the real "Offices / Work" entry
(unconditional in UI's `PlayerGame.tsx`, not gated behind any legislative
capability the way it is on this donor's own detached test scaffold):

- **1 passed (31.3s)** — offer, refuse, offer, accept, blocked by an
  existing calendar commitment, fulfilled through Day, wait, begin accepted
  work, schedule responsibility, submit work text, resign, save, reload,
  and the submitted work text persists correctly after reload.
- `src/simulation/career-path7.test.ts` (the source-level lifecycle
  proof, including the earned-pay assertion) — 4/4 passed on the same tree.
- Full gate suite on the combined tree: format, lint, typecheck,
  `source:validate` (21 domains), `source:replay` — all clean.

## What this means for the standalone donor tree

`career-path7.spec.ts` cannot pass on a tree built from `main` alone
(without UI's actual `PlayerGame.tsx` merged in): the "Offices / Work"
entry that reaches this feature is UI's own composition, not something
CAREER-PATH7 or LAND can construct without it. That is a real, structural,
externally-caused gap — not a defect in CAREER-PATH7's own code, and not
something a root patch to UI closes, because UI's composition already
works correctly once actually present.

The spec now checks for that entry's reachability before proceeding and
skips with this exact reason when it is absent, rather than hard-failing
on an absence it cannot supply on its own or silently skipping
unconditionally. This is proof that the feature works, precisely where it
can be proven, and an honest, named gap everywhere else - not a blanket
pass and not a blanket skip.

## No outstanding root patch

Nothing is owed to the UI owner here. The composition already works.
