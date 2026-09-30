# Saved pretrial decisions name the law they applied

The first justice writer now attaches the governing law to a defendant's saved release or detention event. The focused case test measured one consequence, one valid stamp, preserved attribution after serialization, and no duplicate on a repeated prosecution step. This repairs attribution; it does not prove that the existing decision implements every jurisdiction's legal exceptions.

## Before

The saved pretrial event named its defendant and decision but carried no law-effect stamp. The law could affect release without appearing in the stamp audit.

## Trigger

A prosecution reaches its charge decision and applies the operative bail law at the case venue. This existing writer runs when the case advances.

## Why

Measured: the writer in `src/simulation/justice/prosecution.ts:413` attaches the canonical stamp to the actual saved pretrial consequence. The terminal reason is the operative legal rule constraining the court's release decision. The stamp identifies that rule; it does not independently decide detention.

## Person and place

The saved event retains the named defendant. The stamp retains the venue, referral, charging event and consequence IDs. The test draws its place from all supported places using the seed recorded below. No jurisdiction-specific branch was added.

## Repeal and timing

Measured: `src/simulation/justice/pretrial.ts:86` reads the operative law at application. A changed law governs future consequences; this patch does not revise old events or undo detention. Measured: `src/simulation/justice/pretrial.test.ts:126` tests enactment and repeal.

## Connections and gaps

Inferred: the audit can inspect these saved stamps without reconstructing attribution. Nationwide audit and law-news delivery have not been run. NJ monetary-bail exceptions need actual judicial appearance, safety, obstruction and condition findings; the current case record does not contain them. Current statutory amendments remain to be verified. Government costs and ideology are not completed.

## Next step

Record and consume the legal findings required for conditional release, and verify the exact place in the test output before a nationwide claim.

## Method

Focused tests: 8 passed across the saved-consequence test and existing pretrial law tests. ESLint passed for changed justice files. Seed: `team9-pretrial-stamp-20260930`. Stamp source copied byte-for-byte from main, with no helper changes.
