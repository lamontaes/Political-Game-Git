# The Stable of Stuff — Owner Action Board

Overnight audit, 2026-09-05. **Live PR state at write time** (refetched): `main` = `54ec313`; **#91** OPEN/not-draft/MERGEABLE, head `2e3dc0b`, `validate` CI pass (e2e NOT proven by that job); **#89/#90** draft; **#83, #84, #85, #79 all currently CONFLICTING with main** (each needs a reconcile-to-main before more work). Nothing here has been merged; nothing deleted.

Read this first, then the deeper docs (`10`/`20`/`30`, and `40` operating-mode). Buckets are ordered so you can throw the top ones straight into coding-agent lanes.

Ownership rule in force: one writer per overlapping branch/PR. Where an item overlaps an active PR, it says so — hand it to that PR's owner or wait, don't open a second writer.

---

## 1) READY NOW / INDEPENDENT (launch immediately)

These are additive, reversible, don't overlap an active feature PR, and are useful regardless of when #91 merges.

### RN-1 — Export `formativeSituationBank()` + a static formative-bank test

- **Accomplishes:** closes the harness-enumerability gap — the 20-situation formative bank is a private `const AUTHORED_SITUATIONS` (unlike `EPISODE_FAMILIES` / `adultSituationBank()`), so it can't be walked statically for prose audit or content tests.
- **Files:** `src/simulation/character-history.ts` (add export), `src/simulation/index.ts` (barrel), new `*.test.ts`.
- **Overlap:** low; touches sim-core. If #83 (declarative content) is actively editing `character-history.ts`, coordinate; otherwise safe.
- **Size:** XS. **Validation:** typecheck + a test asserting count/shape; then it can feed a static-extraction pass in the corpus tool.

### RN-2 — Statically extract the authored banks into the corpus — **DONE during this run**

- **Done:** the corpus now walks `EPISODE_FAMILIES`, `adultSituationBank()`, and `setupQuestionnaireBank()` statically, adding **720 authored-bank templates** to the review packet (total **1163** distinct strings, filterable Played vs Template). **Remaining:** the formative bank, which is a private const — do RN-1 first, then add `formativeSituationBank()` to `staticBankInventory()` in `scripts/narrative-corpus.ts`. **Size of remainder:** XS.

### RN-3 — Docs reconciliation (additive only; delete nothing)

- **Accomplishes:** removes the biggest "reader misjudges project state" traps found in the audit.
  - Add a DECISION-LOG entry recording the accepted boundary of the **narrative wave** (log ends D-074; the wave has no entry).
  - Mark `docs/agent/ACTIVE-HANDOFF.md` superseded (dated 2026-08-28, names PR #16/#18/#19 as next).
  - Add "superseded by D-056 / Stage 5 / D-Lite" notes to `ROADMAP.md` Stage 10 label and `FIRST-BUILD-SPEC.md` planned-not-implemented list.
- **Files:** `docs/decisions/DECISION-LOG.md`, `docs/agent/ACTIVE-HANDOFF.md`, `docs/ROADMAP.md`, `docs/FIRST-BUILD-SPEC.md`.
- **Overlap:** low (docs). **Size:** S. **Validation:** none needed (docs); keep it additive.

### RN-4 — Record an `EpisodeExclusion` when a role can't bind

- **Accomplishes:** observability fix. `eligibleEpisodeBeats` silently `continue`s when a beat's role can't bind (`life-episodes.ts:1225`), pushing no exclusion — so the dev report/harness can't see why a beat vanished.
- **Files:** `src/simulation/life-episodes.ts`. **Overlap:** low (sim-core; coordinate with #83 if active). **Size:** XS. **Validation:** a test asserting the exclusion is recorded.

> Best owner class for RN-1/2/4: an engineering agent comfortable in the sim/presentation TS. RN-3: a docs/reconciliation agent.

---

## 2) READY AFTER A SPECIFIC MERGE OR HEAD

### AM-1 — Kill machine-cadence + repetition in connective narration _(the #1 narrative defect)_

- **Accomplishes:** removes the "School carried on…/The house went on being…/Kentucky went on as it does…" filler that fires on ~every beat (387 of 418 lint findings). See `10-NARRATIVE-STYLE-AUTHORITY.md` §2–3 for exact rules.
- **Files:** `src/presentation/life-narration.ts` (`steadyState()`, `elapsedPhrase()`, `rotationIndex()`).
- **Dependency:** **overlaps #91** (which rewrites the presentation/story surface). Do **after #91 merges**, or hand to #91's owner. **Size:** M.
- **Validation:** re-run `npm run corpus:narrative`; the `machine-cadence`/`repeated-*` counts in `lint-summary.md` must drop sharply. Then human read.

### AM-2 — Widen the elapsed-time vocabulary

- **Accomplishes:** "A month later." ×97, "A couple of weeks on." ×42 — the time-passage phrasebook is tiny. Add varied phrasings keyed off season/age already computed.
- **Files:** `src/presentation/life-narration.ts` `elapsedPhrase()`. **Dependency:** same as AM-1 (after #91). **Size:** S. **Validation:** corpus lint `repeated-run` drop.

### AM-3 — Scene backdrop must follow the beat's location (fix "school over home")

- **Accomplishes:** `resolveLifeScene` returns home-or-null and it's painted under every beat; a school/office beat renders over the home apartment. Bind backdrop to the beat's location/family; fail closed when no released room matches.
- **Files:** `src/presentation/life-scene.ts`, `src/player/PlayerGame.tsx`, `scene-registry.ts`. **Dependency:** **overlaps #91** (presentation). After #91. **Size:** M. **Validation:** browser proof per beat kind + human visual.

### AM-4 — Add Escape / click-out / X to the shipped `PlayerGame` overlays

- **Accomplishes:** shipped game has no keyboard/click-out exits (office-fixture does). Port the `PlayerOffice` exit ladder to `PlayerGame`.
- **Files:** `src/player/PlayerGame.tsx`. **Dependency:** overlaps #91. After #91. **Size:** S–M. **Validation:** pointer+keyboard activation tests (per AGENTS rule) + human.

### AM-5 — Re-theme the plain-sheet secondary surfaces

- **Accomplishes:** `LegislationWorkspace` and the default game's secondary surfaces read as plain browser sheets; bring them to the accepted grammar.
- **Files:** `src/player/player.css`, the workspace components. **Dependency:** overlaps #91 (and #79 for legislation UI). After those settle. **Size:** M. **Validation:** human visual gate.

### AM-6 — Reconcile #83/#84/#85/#79 to current main (each is CONFLICTING)

- **Accomplishes:** unblocks each feature PR. Each is behind `main` and conflicting; the owning lane merges/rebases onto `54ec313`, re-runs CI + focused audit.
- **Dependency:** each on its own branch (one writer). **Size:** S–M each. **Validation:** `validate` green at reconciled head + focused audit; #79 also waits on #91's shell, #85 on #91's shell + Stage 8/9 direction.

---

## 3) SMALL BUG / PORK-BARREL CARGO (ride an appropriate owner lane)

These are one-to-few-line fixes; give them to whichever lane already owns the file (mostly **#83** for banks) rather than opening a new writer.

- **PB-1** — Remove the `"score check"` meter phrase written into a canonical conversation record. `conversation-subjects.ts:836` (owner: #83). _Highest-value cargo — it's a live meter-vocabulary leak into world truth._
- **PB-2** — Replace the `"Synthetic …"` dev labels/descriptions in the default incident catalog, or gate the synthetic catalog to tests + ship a production one. `incident-catalog.ts` (owner: incidents/#83).
- **PB-3** — Pick one spelling convention; the banks mix `neighbour/neighbourhood` (episode-bank, adult-situations) and `neighborhood/neighbor` (conversation-subjects). (owner: #83)
- **PB-4** — Trim the authorial-voice clause `"…and the record is allowed to say so."` (`adult-life.ts:139`) and the similar meta-framing in `formative-play.ts:118`. (owner: presentation/#91)
- **PB-5** — `useRasterTier.ts:92` swallows `image.onerror`; expose a decode-failure signal distinct from "no art registered". (owner: graphics/#91)
- **PB-6** — Surface `isPlaceholder` (computed on every `ComposedCharacterVisual`, read by nothing) so a readiness pass/UI can tell "this person has no art". `visual-integration.ts` + `OfficeScene.tsx`. (owner: graphics/#91)
- **PB-7** — Remove the `"Developer view"` anchor from the office-fixture player nav (`PermanentShell.tsx:108`) before that grammar ships. (owner: graphics/#91)
- **PB-8** — `episodeCapabilities`/`episodeFacts` discard `asOfDate` (compute from `currentLifeCutoff`) while threads use `asOfDate`; retrospective (`asOfDate != currentDate`) beat queries aren't reproducible. `life-episodes.ts:182,523`. Fix or document the constraint. (owner: sim-core)

---

## 4) RESEARCH NEEDED (exact question + source class)

- **R-1 (blocks Stage 7B/9 realism):** For the launch jurisdiction(s), the sourced, dated government structure — offices, districts, current officeholders, terms, selection method — each with `as_of`/source/URL. Source: official state/county sites + Ballotpedia/OpenStates cross-check. Lexington is still an explicit placeholder.
- **R-2 (blocks Stage 9 realism):** Ballot-access, filing, and campaign-finance rules (contribution limits, disclosure thresholds, PAC rules), effective-dated, for the launch jurisdiction. Source: state board of elections + FEC.
- **R-3 (blocks Stage 8):** A defensible, source-backed method to seed population cells + party-ID/turnout priors from ACS-PUMS + district returns _without_ a dense voter×issue matrix (Constitution 26/28).
- **R-4 (content):** Age-true formative content for ages 5–7 (early-childhood band currently has none) — what do developmental sources say a 5–7-year-old actually decides/notices? Source: child-development literature already partly cited in `90_FIRST_SESSION_LIFE…` research family.
- **R-5 (design research):** Comparable-game postmortems on "life passes without a clicking loop" pacing (how CK/RimWorld/etc. gate stops) — to inform the not-a-clicking-simulator work. Experiential reference only; copy nothing.

---

## 5) HUMAN PLAY / VISUAL GATE (cannot be signed off by CI or a model)

- **HG-1 — Age-appropriateness of the calibration (OWNER DECISION).** A 10-year-old's "Who Are You?" currently draws adult civic/policy scenes, by design (`itemAdmissible` gates only the 3 fixed openers; Packet-77 says the survey is of the _player_, not the character). This conflicts with the child-safety rule. **Decide:** band-gate non-fixed items (child-safety wins) _or_ keep the meta-survey and make its framing unmistakable + drop items that read as concrete adult lived scenes. Everything downstream waits on this call.
- **HG-2 — Name/gender display dissonance (OWNER DECISION).** "Ibrahim Rocha, your older sister … she asks you" — the name corpus is deliberately genderless. Decide: associate first-name display with stated/derived gender, or keep the anti-inference stance and accept the dissonance.
- **HG-3 — Does the shipped scene-first surface "feel like a game"?** #91's human play said "core scene-shell pass / directional win, semantic/UX repair required." The repair bar is yours.
- **HG-4 — The prose itself.** Mark up the review packet (`prose-review-packet.html`, private artifact) — GOOD/AWKWARD/BAD/WRONG-CONTEXT/REPETITIVE by speakable id — and hand the copied marks back to seed the house-style corpus.
- **HG-5 — Production character art release.** No production NPC bodies exist (`PRODUCTION_CHARACTER_LIBRARY` empty); the seated real body + wardrobe are gated on art you accept, not code.

---

## 6) BLOCKED / DO NOT START YET

- **BL-1 — Anything touching the shipped presentation shell** (`PlayerGame.tsx`, `life-narration.ts`, `life-scene.ts`, story surface): #91 is the active writer. Wait for #91 to merge (AM-1..AM-5 are queued on it).
- **BL-2 — Nationwide "Start Anywhere" gameplay:** only 4 hard-coded places exist in this checkout; "Start Anywhere" is a search-box label. A verified national place corpus is the outstanding dependency (`life-places.ts` `OUTSTANDING_DEPENDENCY`). (Note: #91 may add the seam — re-verify against #91.)
- **BL-3 — Birth/age-0 start & staged newborn opening:** `MINIMUM_START_AGE=5`; not buildable. Needs a 0–4 path + content before the AC-II-style opening can target birth.
- **BL-4 — Emergent legislator behavior / whip / bargaining as modeled system:** member votes are authored by scenarios today; the modeled version is #79's job and attaches at the relationship/leverage seam later.
- **BL-5 — Autonomous relationship/opinion dynamics, Observer Mode, branching:** designed-only future stages (8/12); don't start speculative parallel systems.

---

## Compact execution packet template (for a READY-NOW lane)

> **Read first:** `AGENTS.md`; `docs/GAME-CONSTITUTION.md`; `docs/overnight-audit/10-NARRATIVE-STYLE-AUTHORITY.md`; `docs/overnight-audit/20-FUTURE-SYSTEM-COVERAGE-MAP.md`. **Base:** `main` `54ec313` (verify live). **Branch:** new `claude/<task>` off main. **Scope:** exactly the item above — no adjacent refactors. **Forbidden overlap:** do not touch files owned by #91/#83/#79/#85/#84 (see each item's Overlap line). **Success:** the item's Accomplishes line, with the named Validation green. **Tests:** add/extend a deterministic test; run `npm run typecheck && npm run lint && npm run test`; for narrative items re-run `npm run corpus:narrative` and cite the lint delta. **PR:** open, do not merge; completion report with exact base/head, tests actually run, and remaining defects. Green CI ≠ human acceptance.
