# PR85B — post-#99 reconciliation and owner-play fact-integrity repair

Authority: owner run packet `P85B — RUN NOW — PR85 POST-#99 MAIN RECONCILIATION AND OWNER-PLAY FACT-INTEGRITY REPAIR`.

Branch: `claude/campaign-first-election-rehome`

Starting PR head: `0fceb5a99a33f184cf969b2913a9ea48b87ef5a4`

Merged live main: `48e217cce3929abc1f8c848c70743f5af2a53b0f`

Merge commit: `716c50eed36c9756412c98c78e7c96c38a4d485b`

## Scope

- [x] Fetch and verify live PR #85 and live `main`.
- [x] Use a clean isolated worktree and run agent preflight.
- [x] Merge live `main` ordinarily into the same PR branch; no rebase or force-push.
- [x] Repair generated adult-history chronology with generic invariants and multi-age/multi-seed coverage while preserving authored/imported input.
- [x] Reproduce the opening camera/black-frame report, classify ownership, and fix only branch-owned mounting/state/preload behavior.
- [x] Reproduce campaign action exhaustion and prove the next-day reset; repair only stale cross-day state or missing reason disclosure.
- [x] Establish and lock the People-panel contract for discovered opponents versus deliberate pins.
- [x] Replace the Ohio-specific unsupported-state negative control with a durable accepted-pack-derived control.
- [x] Preserve life → candidacy → committee → campaign actions → election → loss/win continuation, Lexington state-office inheritance, hidden support truth, committee-owned money, keyed determinism, and fail-closed authority.
- [x] Record owner feedback about fundraising generosity and absent campaign-team depth without rebalancing or adding mechanics.

## Verification

- [x] Focused chronology properties across adult ages/seeds, including age 34.
- [x] Exact owner route in Chromium: age 34 / Male / Lexington / file candidacy.
- [x] Same-day campaign exhaustion and next-day action restoration.
- [x] Deterministic loss continuation and People-panel behavior.
- [x] Camera continuity/blank-frame regression if branch-owned; otherwise exact dependency report.
- [x] Relevant Playwright suites.
- [x] Full validation coverage. The default parallel Vitest invocation timed out 35 unrelated long-running tests under host saturation; all 136 files and 2,351 tests passed with one worker and a 120-second timeout, and every remaining `npm run validate` gate passed separately.
- [x] `npm run validate:art`, `npm run inventory:art`, and `npm run qa:art` without retaining generated noise.
- [ ] `git diff --check` and final `npm run agent:preflight`.
- [ ] Re-fetch `main`, reconcile if advanced, push the same branch, and verify exact-head GitHub CI success.
- [ ] Move this plan to `docs/plans/completed/` and leave PR #85 unmerged.

## Bounded follow-ups (not implemented here)

- Fundraising yield felt generous for a one-person/no-team afternoon.
- Explicit campaign staff/team depth remains absent.

## Findings and dispositions

- The chronology defect was canonical generation, not projection: quick history started secondary school at age seven. The generator now records elementary school at five, a distinct middle-school enrollment at eleven, secondary school at fourteen, and teen work at sixteen. The literal introduction remains record-derived.
- Authored chronology is not normalized. An intentionally off-template authored enrollment stays exact through the shared writer and JSON deserialize path.
- The black-frame defect was branch-owned React identity. On a second ambient transition, the arriving stage had a stable key but the leaving stage did not reuse it, so React replaced the decoded image and camera node. The prior cycle key now follows that same stage into the leaving slot. Per-scene camera policies and `useSceneCoverTransform` remain unchanged; any crop change between two differently authored scenes remains a shared visual-lane dependency, not a PR85 simulation fix.
- Same-day campaign exhaustion reproduced as valid schedule pressure after three sessions before the existing evening activity. Disabled actions already disclose that the day is spoken for; advancing one day restores them. No stale cross-day state or campaign arithmetic defect reproduced.
- The People rail is a relevance/recurrence surface. In-room people are held automatically; a recurring opponent may appear but retains an unpressed Pin control until the player deliberately selects it.
- The negative jurisdiction control now derives from the accepted candidacy-pack set and searchable place corpus. It no longer assumes one named state will remain unsupported.
- The post-#99 civic-prose deterministic gate and independent grounding reviewer both returned `GROUNDING: PASS` for the new middle-school grounding line. Probes passed 21/21 and hygiene passed.
- The architecture-integrity audit records contained corrections and confirms no Stage 6 reopening, Stage 7 system, broad economics rebalance, campaign rewrite, or team mechanic.

## Validation evidence

- Focused simulation/presentation: 51/51 tests.
- Exact owner-route and campaign Chromium suites: 16/16 tests, including pointer and keyboard activation.
- Complete Vitest suite: 136/136 files, 2,351/2,351 tests with `--maxWorkers=1 --testTimeout=120000`.
- Formatting, lint, typecheck, source validation, byte-identical source replay, production build, deterministic demo, and art validation passed.
- Art inventory was already current at 322 items; art QA regenerated deterministically with no tracked diff.
- The first production-build attempt exhausted local disk while writing ignored `dist` output. Repository clean-build plus clearing the recoverable npm download cache restored space; the untouched build then passed. Generated `dist` was removed afterward.

## LEARN review

- **Lesson:** A transitioning React child must keep the same key across its arriving-to-leaving role change when image decode and camera continuity are part of the visual contract.
- **Effect:** The fix and two-transition regression encode that identity rule locally; no broader architecture or reusable skill change is required.
- **Adjacent risk:** Test coverage that names a currently unsupported jurisdiction decays as source packs arrive. Negative controls should derive missing coverage from the accepted-pack registry.
- **Next owner evidence:** Human visual judgment of inter-scene crop changes remains pending because authored camera policies differ by scene. The automated proof covers black-frame/mount continuity, not aesthetic acceptance.
