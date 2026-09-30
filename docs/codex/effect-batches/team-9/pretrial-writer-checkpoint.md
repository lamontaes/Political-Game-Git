# Saved pretrial decisions name the law they applied

The first justice writer now attaches the governing law to a defendant's saved release or detention event. Five focused historical-case fixtures measured five named defendants, one valid stamp per consequence, preserved attribution after canonical world reload, and no duplicate on a repeated prosecution step. This repairs attribution; it does not prove that the existing decision implements every jurisdiction's legal exceptions.

## Before

The saved pretrial event named its defendant and decision but carried no law-effect stamp. The law could affect release without appearing in the stamp audit.

## Trigger

A prosecution reaches its charge decision and applies the operative bail law at the case venue. This existing writer runs when the case advances.

## Why

Measured: the writer in `src/simulation/justice/prosecution.ts:412` attaches the canonical stamp to the actual saved pretrial consequence. The terminal reason is the operative legal rule constraining the court's release decision. The stamp identifies that rule; it does not independently decide detention.

## Person and place

The saved event retains the named defendant. The stamp retains the venue, referral, charging event and consequence IDs. The test draws its place from all supported places using the seed recorded below. No jurisdiction-specific branch was added.

## Repeal and timing

Measured: `src/simulation/justice/pretrial.ts:87` reads the operative law at application. A changed law governs future consequences; this patch does not revise old events or undo detention. Measured: `src/simulation/justice/pretrial.test.ts:126` tests enactment and repeal.

## Connections and gaps

Inferred: the audit can inspect these saved stamps without reconstructing attribution. Nationwide audit and law-news delivery have not been run. NJ monetary-bail exceptions need actual judicial appearance, safety, obstruction and condition findings; the current case record does not contain them. Current statutory amendments remain to be verified. Government costs and ideology are not completed.

## Next step

Record and consume the legal findings required for conditional release, and run the national audit after integration.

## Method

Focused tests: 12 passed across the five saved-consequence fixtures and existing pretrial law tests. ESLint passed for changed justice files. Base seed: `team9-pretrial-stamp-20260930-five`. Places: Massachusetts, Colorado, Michigan, Idaho and Arizona; exact place keys and people are in `pretrial-five-state-proof.json`. Stamp source copied byte-for-byte from main, with no helper changes.

## Current main-based batch check

The patch was transplanted onto main `e3182daa79e221604c5a328a1b6b4e055ebf648e` in `codex/team-9-justice-stamp-batch`. Both focused files passed all 12 tests in 66.27 seconds. Typecheck, scoped lint, formatting and whitespace checks passed. The first launch failed during configuration with `spawnSync git EPERM`; the retry under network-enabled execution ran the normal configuration successfully. The adjacent named receipt remains the earlier preserved source receipt; the new run independently repeats the saved-event and canonical-reload assertions.

Release checking reports the inherited malformed `wave1-playtest-copy.md` note. Zero-dice reports zero new entries and five removed entries still in the ledger, with exit 1. Speed, browser, nationwide audit and ordinary watched play were not run. Other justice stamps remain pending; this is the first completed slice of the single batch due at 3:30.
