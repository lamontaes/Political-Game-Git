---
name: wiring-audit
description: >
  Audits and wires a whole family of Our Civic Duty mechanics end to end (laws,
  outcome-web links, personality decisions and similar) with a twin-world
  checker, a matrix with one row per item, and per-family fix PRs. Use when a
  lead session must prove what really reaches people, money and records, or
  when anyone is about to call a system "wired".
---

# Wiring audit

**Look first (`look-first`, owner Oct 27):** before building, fixing, filing or asking anything, run the look-first search (OWNER-DECISIONS, DECISION-REGISTER, prior-rulings, LAW, the sitting blocks, docs, the pool, Drive); a found ruling is built and cited, never asked again; a question without the reading line is sent back.

**SMART and look first (owner, Oct 26; `.agents/rules/smart-and-look-first.md`).** Each per-family fix PR and each row's `Needs` line is SMART with a time box. Laws and effects share one checker and one matrix; traits rows live in the effects matrix.

Current as of 2026-10-24, 21:30 UTC (owner, Oct 20: Opus leads with Sonnet helpers; owner, Oct 24: at most two helpers per lead, status on the channel every two hours; the lead role itself is `lead-session`)

"Wired" means a played world shows it, row by row. A unit test, a catalog entry or a session's own claim is not proof. **Wired is not seen:** the links below are measured headless. Never tell the owner a law or link is wired without also saying whether a player can see it in play, on which screen or scene, by screenshot with place and seed (Oct 26: the matrix read 55 of 89 laws wired while a player's own bill never got a vote all year and News reported no law). This is how the LAW-WIRING, EFFECT-WEB-WIRING and TRAIT-WIRING jobs work; follow it for any family.

## 1. Define wired, point by point

Write the standard before measuring. Each point is shown by record ids in a drawn place built the way the game builds it (`buildBenchWorld`, two-level, economy on). Existing standards:

- **Laws, nine links:** exists in all 56 places; can be enacted and repealed; reaches people and organizations; is read by the engine it changes; moves money between real accounts; fires its outcome-web links; is learned only through a read; stops on repeal; runs through one code path. See `docs/reports/law-wiring-2026-10-20.md`.
- **Outcome web, eight points:** cause read from a real record; researched size and spread; the owning engine multiplies its own rates; lands differently by a person's circumstances; feeds the next link through records; researched timing; noticed through a read; one rule for all places. See `docs/reports/effect-web-wiring-2026-10-20.md`.
- **Personality:** every decision runs in a played year, and its trait term turns choices at a research-calibrated rate. Trait-shaped outcomes read the trait. See `docs/reports/trait-wiring-2026-10-20.md`.

## 2. Build the checker first

Build twin worlds from one seed, with only the thing under test changed (a law enacted against a null law, a cause shifted, traits flattened or mirrored). First prove that unchanged twins match exactly; then report every record kind that moved. Existing checkers:

- `scripts/law-wiring/{catalog,check,matrix,year}.ts`;
- `src/core2/outcome-web-twins.test.ts` with `scripts/outcome-web/effect-matrix.ts`;
- `scripts/traits/trait-wiring-{audit,matrix}.ts` with `trait-calibrate.ts`.

Reuse them; don't build a parallel one.

## 3. The matrix

Commit `docs/reports/<job>-<date>.md` plus a machine-readable matrix: one row per item, each point's status, its evidence (record id or `file:line`), and why each miss happened. The counts in your channel block come from this file. Typical reasons: no handler, a handler that only records, wrong key, no money flow, no measure, the engine never reads it, counted twice. Open it as its own PR early. Report counts from the matrix file, never from memory.

## 4. Fix by family

One family per helper (Sonnet, at most two per lead), each with its own paths, branch and check. The lead (Opus) reviews every diff before it becomes a PR and sends back:

- narrowed, skipped or early-returning tests, `>= 0`, or loops over sets that can be empty;
- unexplained timeouts;
- dice;
- hand-written player text;
- imports from `src/simulation`;
- owner or date notes in data;
- claims the diff doesn't make.

Write one test per item that fails when nothing moved. When several PRs share a file such as `outcome-web-model.ts`, land them one at a time. A truly unbuildable point gets a specific stopgap row, never silence.

## 5. Finish

Rerun the checker on main after the families merge. Put a before and after played year in two drawn places (seed named) at the top of the report: items that reached people, moved money and moved measures, plus the year's run time. Then the final matrix summary: total, wired, partial, stopgapped. Never say "wired" without the row.
