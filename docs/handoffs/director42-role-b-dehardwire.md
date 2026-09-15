# DIRECTOR42 ROLE B — DEHARDWIRE: opening handshake and first increment

Status: **READY FOR RECEIVING REVIEW — VALIDATION PENDING**
(the checks listed below were actually run and passed; the full repository gate
and the browser lane were not run by this owner and are listed as pending.)

## Who and where

|                          |                                                                        |
| ------------------------ | ---------------------------------------------------------------------- |
| Role                     | ROLE B — DEHARDWIRE                                                    |
| Session                  | `session_01WZB6HoCjRiQHuG7TA46wKV`                                     |
| Program / model / effort | Claude Code, Opus 5, xhigh, implementation                             |
| Worktree                 | `/home/user/Political-Game-Git` (single worktree; no nested worktrees) |
| Branch                   | `claude/director42-role-b-dehardwire-c3bgvv`                           |
| Base full SHA            | `f22fd314e72bec0440044026ccdfd99e7a67600d` (== frozen public main)     |

## Transport: direct messaging attempted and unavailable

The SHARED CONTRACT requires the direct capability-first route before any
fallback. In this session it was attempted and is absent, so this file is the
permitted immutable Git handoff, not a preference:

1. `ListAgents` — "No reachable agents — no other Claude session is running on
   this machine right now." The ROLE C and ROLE D sessions run in separate cloud
   containers and are not addressable from here.
2. `SendMessage` to `DIRECTOR42 Role C player setup` — failed, _"No agent named
   … is reachable."_
3. `SendMessage` to `session_014poXuKZBnG1Gi37kZHmnDN` (ROLE C by session id) —
   failed, same error.
4. `ToolSearch` for a `claude-code-remote` send-message operation — no such tool
   is exposed to this session.

No bridge was built, no permission escalated, no payload relayed through another
account. ROLE C's own session summary records "ROLE C handshake pushed", so the
Git route appears to be what this wave is actually using.

## Ownership claimed

**Owned and written in this increment**

- `src/simulation/measure-numbering.ts` (new)
- `src/simulation/legislation-scenarios.ts`
- `src/simulation/index.ts` (one barrel export line)
- `src/presentation/legislation-world.ts`
- `src/presentation/legislative-bargaining-world.ts`
- `src/presentation/legislative-bargaining-brief.ts`
- `src/presentation/legislative-bargaining-fixture.ts` (developer fixture)
- `src/content/adapters/legislative-blueprints.ts`
- `src/presentation/legislation-world.test.ts`
- `src/presentation/dehardwire-measure-identity.test.ts` (new)
- `src/presentation/dehardwire-census.test.ts` (new)
- `tests/e2e/pr79f-production-floor.spec.ts`
- `scripts/dehardwire-census.mjs` (new)
- `docs/dehardwire/classification.json`, `docs/dehardwire/census.json` (new)

**Explicitly excluded** — not touched, and not claimed

- Player-facing copy, natural refusals, diagnostic separation — **ROLE C**
- Layout, styles, creator/appearance, scene and window presentation — **ROLE D**
- Shared-root composition, `#255` / `#256` / `#257` reconciliation — **LAND**

**Overlap ROLE C and ROLE D should know about.** No `.tsx` player surface was
edited in this increment. `src/player/PlayerGame.tsx`, `DocketWorkspace.tsx`,
`MeasurePaperWorkspace.tsx` and `MeasureFloorSurface.tsx` were read, and left
alone: they already take the measure's identity from the world record, which is
what made this fixable underneath them. Two interface facts they depend on:

- `LegislativeBlueprint.designation` is renamed to `authoredDesignation`. Any
  in-flight branch reading `blueprint.designation` will fail to compile, on
  purpose — see below.
- `FISCAL_NOTE_SUMMARY` (a constant) is now `fiscalNoteSummaryFor(designation)`
  (a function), because the note names the bill it is about.

One line for ROLE C specifically: the four
`src/simulation/judicial-gameplay-kernel-bank.ts` hits in the census are
internal `source:` provenance on judicial kernels. They are classified as
legitimate recorded provenance here. Whether any of that text currently renders
on a player surface is your separation question, not a dehardwire case.

## What actually changed for the player

Before: every Kentucky character in every save, on every seed, opened their
office on **HB 214 — Transit Access Pilot**, because production copied the
authored scenario bank's designation onto the measure it filed into the
player's world. Nebraska always got LB 88, Alaska always HB 41.

After: the bill a character is carrying is **their world's bill**.

- **Its number comes from the jurisdiction's numbering state**, not from the
  bank. `nextMeasureDesignation` takes the chamber's prefix from the same
  `designationPrefix` the player-drafting route already used, draws where that
  chamber's numbering stands from the world's seed, and counts up from there for
  each further measure filed in that chamber. HB 214 remains _possible_ — the
  way any number is, by this world's numbering arriving there.
- **Which authored measure the session opened on is drawn from the world seed**
  among the entries the bank already holds for that legislature (Kentucky has
  three, as do Nebraska and Alaska). Authored prose, vote plans, governor
  rationales and rule packs are all preserved: this moved selection, it did not
  replace content, and there is no runtime model call anywhere in it.
- **The bargaining sitting names the filed bill**, not the bank's: the floor
  refusals, the subject facts and the fiscal note all read the measure record.

Determinism holds: same seed and same filed history reproduce exactly. Two
different seeds get different bills.

## Old saves

Untouched and proved. Stable keys were deliberately **not** changed — the
measure is still at `legislative-work:<place>:measure`, and the sponsor,
advocate, guardian and analyst are still at their existing keys — so every other
route finds what it always found. A save that already filed HB 214 reopens on
HB 214, files no second bill, and recovers its authored entry (and therefore its
vote plan and governor rationale) from the filed bill's own short title.

## The census

`node scripts/dehardwire-census.mjs` walks the **runtime** import graph from
ordinary play and reports every world-instance gameplay literal on it against a
reviewed classification. Runtime matters: `import type` is erased before a
player runs anything, and counting type-only edges reports fixtures as
production dependencies that do not exist. The existing
`legislative-bargaining-no-fixture.test.ts` does count them, which is why it
reports the floor fixture chain differently.

Current result — **13 cases, 13 legitimate data/label, 0 production hardcode,
0 unclassified**, machine-readable in `docs/dehardwire/census.json`.

It is a guard, not a report: `src/presentation/dehardwire-census.test.ts` fails
the suite if a later edit puts an unclassified world-instance literal back on
the ordinary-play path. It bans nothing globally — authored content, chamber
labels, rule citations and internal provenance all pass.

## Checks actually run

| Check                                                                                                                               | Result                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `npm run typecheck`                                                                                                                 | pass                                                                 |
| `npm run lint`                                                                                                                      | pass                                                                 |
| `npm run format` (prettier --check)                                                                                                 | pass                                                                 |
| `npx vitest run src/presentation src/content src/simulation/legislation.test.ts src/simulation/legislative-provision-batch.test.ts` | **135 files, 1718 tests, all pass**                                  |
| `src/presentation/dehardwire-measure-identity.test.ts`                                                                              | 9 pass (new)                                                         |
| `src/presentation/dehardwire-census.test.ts`                                                                                        | 5 pass (new)                                                         |
| `node scripts/dehardwire-census.mjs`                                                                                                | exit 0                                                               |
| `playwright test tests/e2e/pr79f-production-floor.spec.ts` (Chromium, 1440x900)                                                     | **1 passed (51.6s)** — the production route names HB 215, not HB 214 |
| `playwright test` on the four related legislation specs                                                                             | 19 passed, 3 failed — all three also fail at base f22fd31            |

### Browser evidence — the production route, actually exercised

`tests/e2e/pr79f-production-floor.spec.ts` drives the route a player opens:
title screen, life created, candidacy filed, election reached by living the
weeks, members' room entered from the office the win opened, then a save and a
browser reload. No `?view=floor` anywhere in it.

It passed in Chromium at 1440x900: **1 passed (51.6s)**.

What it showed is the point. The colleague on the floor names **HB 215** — this
world's number, arrived at by this jurisdiction's numbering, not HB 214 — the
paper on the desk names the same bill, the fiscal note about it reads
$8,000,000, and all of it survives the reload.

That spec previously asserted the literal "HB 214" and would have failed
correctly, because the literal is what moved. It now reads the designation off
the conversation and cross-checks it against the working document: a stronger
assertion than the fixed string it replaced, because it proves the room and the
page agree about one bill rather than that a literal exists.

`tests/e2e/legislation.spec.ts` asserts "HB 214" and is **unaffected**. It
drives `?view=legislation`, the developer route, which builds a standalone
scenario through `createLegislativeScenario` and legitimately keeps the
authored designation. `src/presentation/legislation-projection.test.ts` asserts
the same literal against the same builder and still passes — that is the
evidence for the claim, not an assumption about it.

### Three browser failures, and why they are not this change

Running the four related legislation specs gave **19 passed, 3 failed**:

- `legislation-docket.spec.ts:265` — keeps the docket across a save and a reload
- `legislation-docket.spec.ts:376` — new service clauses … through Work
- `legislation.spec.ts:295` — a bill survives two saves and reloads

All three are `locator.click: Test timeout of 30000ms exceeded` or
`Target page, context or browser has been closed`. No assertion about a bill, a
number or a title is involved in any of them.

They were re-run **at base f22fd31 in a separate worktree**, and all three fail
there too with the same errors. The base run additionally fails
`legislation-docket.spec.ts:118`, which passes on this branch — so this branch
fails strictly fewer of them than the base does. The cause is the 30s default
against a slow container, not anything in this diff. Recorded as a pre-existing
defect with a named owner; nothing was skipped, deleted or given a longer
timeout to make it green.

Note for whoever runs the lane next: this container ships Chromium 1194 while
the pinned `@playwright/test` expects a newer build, so these runs used an
untracked local config pointing `executablePath` at
`/opt/pw-browsers/chromium-1194`. Nothing tracked was changed to make it run,
and that file is not committed.

**Separately pending, not run by this owner:** the full repository gate, the
rest of the Playwright lane (`npm run test:e2e`), and `test:run-a/b/c`.

## One assertion was rewritten, not weakened

`src/presentation/legislation-world.test.ts` asserted
`briefing.designation === "HB 214"` — precisely the expectation the hard rule
forbids an ordinary life from having to satisfy. It now asserts that a
designation exists, that it is the origin chamber's, and that it equals the one
on the filed record. Nothing was deleted or skipped.

## Residuals, with owners

1. **Three browser specs time out, on this branch and at base alike** — the
   two `legislation-docket.spec.ts` cases and `legislation.spec.ts:295`,
   listed above with the base-commit comparison. Not caused by this change
   and not fixed by it. _Owner: the browser-lane owner, for LAND to assign._
2. **Six fixture-named modules are on the ordinary-play runtime graph**
   (`committee-room-fixture`, `office-council-staff-fixture`, `run-a-fixture`,
   `demo-jurisdiction-context`, `demo`, `portability-fixture`). They are world
   builders and scene registrations rather than gameplay instances. The set is
   **pinned by test** so a new one cannot join unnoticed; each has not been
   individually cleared. _Owner: ROLE B, follow-up._
3. **`BARGAINING_BRIEF_SCENARIO_KEY = "kentucky"`, `PLACE_LABEL = "Ashland"` and
   `BENEFICIARY_LABEL` in `legislative-bargaining-brief.ts`** still pin the one
   authored sitting to Kentucky. The measure it is about is now this world's;
   the sitting's own cast and place are not yet. _Owner: ROLE B, follow-up —
   it needs the authored-alternatives treatment, not a deletion._

None of these is a merge blocker under MERGE-FIRST: the app builds, New Game,
Save and Reopen work, no migration or identity is broken, no asset or secret is
involved, and simulation semantics moved in the direction the packet asked for.

## Receiver action

**LAND: take this branch as a successor-only delta and compose it onto actual
main after #255; nothing here depends on #256 or #257.**
