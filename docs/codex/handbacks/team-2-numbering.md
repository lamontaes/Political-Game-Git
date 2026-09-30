# Bill numbers follow jurisdiction data instead of a universal increment

CTO 4:10 authorizes the existing allocator repair now. Verified patterns and explicitly unverified common arrangements will share one allocation path. This design changes displayed designations and counters, not internal measure IDs, legislative choices or law effects.

## 1. Why-chain

A newly introduced measure gets its designation because its jurisdiction, originating chamber, type and numbering session select a data rule. The rule supplies first value, step, integer/letter representation, reset, special suffix and shared/separate series. Existing introductions in that same counter determine the next available value. The chain ends at legal/procedural data and canonical filed history, not an actor roll. A filed measure's internal stable ID is independent of its displayed designation.

Before this batch, the allocator used one numeric sequence per chamber, increments by one, and infers opening offsets from annual filing averages. That cannot express Florida parity/shared types, Michigan lettered joint resolutions or Guam's numbered-legislature suffix. It also protected incorrect legacy numbering bands. CTO explicitly removes save-renumber protection and authorizes from-one common arrangements where evidence is incomplete.

## 2. Research

Team 9 packet #1174 at `b54d4c1b27fccef45fd3a9f16f416481d57c9b7d` supplies official Michigan, Florida and North Dakota records, federal type/identity references and observed Guam designations. Michigan bills start House 4001/Senate 1 per biennium; joint resolutions use letters. Florida House uses odd numbers, Senate even numbers; Senate Rule 3.10 shares its even series across types. North Dakota bills start House 1001/Senate 2001. Guam examples include 1-38(COR) and 98-38(LS). COR/LS meanings and complete special-session rules are not established by those examples.

Colorado batch #1188 at `1d9b2589ca7ed46bbbf8ae6b34ec88c12a9bb789` supports House 1001/four digits, Senate 001/three digits, session-year format and first extraordinary B since 2013. Step 1 is a supported inference; later extraordinary letters and other types remain unverified. Arkansas HB1001 is an observation only, not a first-number rule. Eight other investigated places remain unresolved.

CTO separately approves federal per-Congress reset and standard H.R./S./resolution prefixes. Constitutional January 3 turnover is distinguished from annual Congress assembly. Neither source packet nor allocator invents reserved-number ranges. Partial rule fields and the common default remain developer-unverified. The research packet's older save-preservation/full-coverage recommendations are superseded by CTO's explicit 4:10 decisions.

## 3. Revisions

Each chamber/type gets a separate default series from 1 each modeled regular session; special sessions use separate identity. Existing chamber templates and session profiles supply presentation where exact new evidence is absent, with developer-unverified status. Verified overrides supply actual first values, parity, letters and shared series. The allocator will not display its evidence flag as player-facing provenance or sourced legal fact.

Guam COR/LS is supplied as suffix metadata, separately from special-session identity; it must not imply LS means special. Federal special sessions remain within the same Congress series. No random draw is appropriate for these legal designation parameters. A correction changes new allocation only; this scope does not rewrite canonical historical acts or IDs.

## 4. Numbered built parts

1. Dedicated `data/measure-numbering-rules.json` with typed defaults/overrides and per-field verification.
2. The existing `measure-numbering.ts` selects and applies the rule, with optional type/special/suffix input. Existing writers keep calling it for bills.
3. Existing canonical numbering-session storage carries the session identity and full display. Type is inferred from the exact designation template for counters; no Team 1 schema/writer edit is planned.
4. Focused tests cover Florida parity/shared series, Michigan letters/biennium, North Dakota bands, Congress types/January 3, Guam suffix identity, defaults, special isolation and independent canonical IDs.
5. Owned proof collector captures actual filed designations over a month in Congress and three randomly selected states, logging seed, source head and exact rows. Fixture allocation alone is not the watched month.

## 5. Simulated, records, world pieces, checks

SIMULATED: existing lawmakers decide whether to file; allocator bookkeeping chooses no actor action. RECORDS: the same introduceMeasure writer appends IDs, designation, origin chamber and session. WORLD PIECES: actual jurisdiction/chamber and rule pack; no fictitious session or filed measure is created to pad proof. CHECKS: no introductions means zero recorded rows, shared series includes other types, chambers and specials remain distinct, no duplicated designation in one applicable session. Unknown research uses the CTO-approved common arrangement with a developer flag, not an authority grant.

## 6. Proof run

The actual month is NOT RUN at this source checkpoint. The focused allocator tests passed 69/69 in 11.14 seconds, including all fifty state session loops and the verified counter differences. Strict scoped types cover module, test and month-runner roots with zero diagnostics. Scoped ESLint passed. The Guam contract fixture initially hit the genuine no-pack guard and was repaired as an authored reader fixture; no producer guard was weakened. Guam has no compiled legislature on current main, so its suffix support is a contract, not a watched Guam legislature.

Full release check fails on the unchanged main wave1-playtest-copy header. Zero-dice reports 0 new/3 stale allowances; the allowance is untouched. Full spelling reports four quoted examples in unchanged main plain-american-wording. Browser, full suite, actual resolutions/special-session producer proof, independent civic reviewer and five-year acceptance are NOT RUN. No extra helper is created. The month runner records actual introduced measures, rejects a dirty source, preserves zero groups and compares Save/Continue date/history counts.

## 7. Worked example

Expected fixture examples are House Bill 4001/4002 in Michigan, HJR A/B separately; Florida Senate SB 2 followed by SR 4 in the shared even series; Guam 1-38(COR) followed by 2-38(LS) in one legislature. These are required test expectations, not observed filed outcomes yet. No actor reason or law consequence is inferred from the designation.

Claim: only numbering module/test, dedicated rule data and already-owned runner/handback/release. No overlapping claim appeared in inspected coordinator claims. Team 1 types/legislation and Team 9 research remain untouched. Only Merge integrates after exact approval.

Method: same registered checkout, branch `codex/team2-measure-numbering`, base `2855854ca3537a1eacf5e1dd7591e593154c31bd`. The broad proof branch and draft #1136 are preserved at `bed4ce8e4c6fc76f0f8eee7e4491a4c4f928a832`. Released principles/continuous-strength hunks remain Team 1's. Shared authority source remains a proposal, published in the broad handback. Only Merge integrates after exact approval.

## First actual month: no new designations

The first actual month completed 31 Day presses in Wadsworth, Nevada, from January 5 through February 5, 2026. The fixed seeded selection was Ohio, South Carolina and New Mexico. Congress and all three selected states each had zero new filings. No designation observation is invented. This is a successful empty-case run and leaves the requested actual designation proof unmet.

Source `f484dc14e35175931e58457d9e3dc09bcd86b1e4`, clean; seed `team2-numbering-month-20260930`; place `3281000`. Save/Continue date/history counts matched. Elapsed 46.613 seconds; duplicate reported introductions 0; unknown rule packs 0. Generated report check: 0 errors/0 warnings.

Source finding: the existing authored state governing calendar’s first bill day is February 15, after this first watched window. It is a game scheduling default, not a legal numbering rule. Congress’s monthly intake also requires actual member backing; an intake does not promise a filing. The next bounded proof uses the same seed and states, records 35 initial Day presses separately, and watches the following calendar month containing February 15. It changes no filing choice, actor threshold or producer calendar.

# One month of actual measure designations

31 Day presses in Wadsworth, Nevada produced the following Congress and three random-state filing records. A group with no filings remains zero. The internal IDs and displayed names are both preserved.

## 1. Why-chain

Existing officials filed measures through the normal Day path. Their recorded jurisdiction, chamber and session selected the legal/data counter. This chain ends at procedural data and filed history; no actor reason is inferred from a bill number.

## 2. Research

Verified fields and explicitly unverified common arrangements share one allocator. Legal numbering constants have no effect-size draw. This observation supplies no new causal rate.

## 3. Revisions

No measure was introduced by this collector. Opening records were excluded by canonical sequence. The report does not infer a filing where none exists.

## 4. Numbered observed groups

### 1. Congress: 0 filings

No recorded introduction during this watched month.

### 2. Ohio: 0 filings

No recorded introduction during this watched month.

### 3. South Carolina: 0 filings

No recorded introduction during this watched month.

### 4. New Mexico: 0 filings

No recorded introduction during this watched month.

## 5. Simulated, records, world pieces, checks

SIMULATED: the normal observer Day path. RECORDS: actual measure designations and independent IDs. WORLD PIECES: existing jurisdictions, chambers and rule packs. CHECKS: no duplicate jurisdiction/chamber/session/designation among reported introductions; Save/Continue date and history counts agree. Unknown rule-pack records are excluded and counted, never assigned a fabricated jurisdiction.

## 6. Proof receipt

Seed team2-numbering-month-20260930; place 3281000; January 5, 2026 through February 5, 2026; status completed-month.

Source `f484dc14e35175931e58457d9e3dc09bcd86b1e4`, clean. Save/Continue matched: true. Duplicate rows: 0. Unresolved rule-pack rows outside the reported groups: 0.

Stop: none.

## 7. Worked example

The canonical filed rows above are the worked examples. No synthetic example fills an empty group. This is source/runtime proof; browser interaction and person-level law effects are not established.

## Later actual month: three-state designations, Congress still empty

The same seeded Wadsworth life completed 35 separately logged initial Day presses and 28 watched presses from February 9 through March 9, 2026. Five measures were actually filed on February 15: Ohio HB 1; South Carolina H 1 and S 1; New Mexico HB 1 and SB 1. Congress recorded zero introductions. The full Congress-plus-three-state designation requirement remains unmet.

Source `a38e2dc374a1c1709b54975b85159aa922121533`, clean. Save/Continue date/history counts matched. Elapsed 92.517 seconds; duplicate reported introductions 0; unknown rule packs 0. Generated report check: 0 errors/0 warnings. The allocator source has not changed since its tested candidate. The next bounded check adds read-only closing Congress scores and actual intake-state records to identify the producer dependency without inventing a sponsor or bypassing majority backing. Closing scores are diagnostics, not recorded intake motives.

# One month of actual measure designations

28 watched-month Day presses in Wadsworth, Nevada, after 35 separately logged warmup presses, produced the following Congress and three random-state filing records. A group with no filings remains zero. The internal IDs and displayed names are both preserved.

## 1. Why-chain

Existing officials filed measures through the normal Day path. Their recorded jurisdiction, chamber and session selected the legal/data counter. This chain ends at procedural data and filed history; no actor reason is inferred from a bill number.

## 2. Research

Verified fields and explicitly unverified common arrangements share one allocator. Legal numbering constants have no effect-size draw. This observation supplies no new causal rate.

## 3. Revisions

No measure was introduced by this collector. Opening records were excluded by canonical sequence. The report does not infer a filing where none exists.

## 4. Numbered observed groups

### 1. Congress: 0 filings

No recorded introduction during this watched month.

### 2. Ohio: 1 filings

- February 15, 2026: HB 1 (2025-2026 Regular Session); house; measure legislative-measure_5d1cf6d2298a9509; jurisdiction jurisdiction_cd70b9ba3c8e7584. Saved title "Cap property tax growth".

### 3. South Carolina: 2 filings

- February 15, 2026: H 1 (2025-2026 Regular Session); house; measure legislative-measure_7910bf67663fe7d7; jurisdiction jurisdiction_e73897803685f85d. Saved title "End cash bail".
- February 15, 2026: S 1 (2025-2026 Regular Session); senate; measure legislative-measure_3040e3d86750b0f7; jurisdiction jurisdiction_e73897803685f85d. Saved title "By-right permitting".

### 4. New Mexico: 2 filings

- February 15, 2026: HB 1 (2025-2026 Regular Session); house; measure legislative-measure_e992d2ff1aa0aeba; jurisdiction jurisdiction_ca05aeb0981cd43a. Saved title "Fund pensions on schedule".
- February 15, 2026: SB 1 (2025-2026 Regular Session); senate; measure legislative-measure_af41776dfd16ae32; jurisdiction jurisdiction_ca05aeb0981cd43a. Saved title "Reduce occupational licensing".

## 5. Simulated, records, world pieces, checks

SIMULATED: the normal observer Day path. RECORDS: actual measure designations and independent IDs. WORLD PIECES: existing jurisdictions, chambers and rule packs. CHECKS: no duplicate jurisdiction/chamber/session/designation among reported introductions; Save/Continue date and history counts agree. Unknown rule-pack records are excluded and counted, never assigned a fabricated jurisdiction.

## 6. Proof receipt

Seed team2-numbering-month-20260930; place 3281000; February 9, 2026 through March 9, 2026; status completed-month.

Source `a38e2dc374a1c1709b54975b85159aa922121533`, clean. Save/Continue matched: true. Duplicate rows: 0. Unresolved rule-pack rows outside the reported groups: 0.

Stop: none.

## 7. Worked example

The canonical filed rows above are the worked examples. No synthetic example fills an empty group. This is source/runtime proof; browser interaction and person-level law effects are not established.

## Closing Congress diagnostics preserve the missing filing

The replay completed the same watched month and reproduced all five state filed rows exactly. Congress again had zero introductions. The records show a fully seated Congress and recorded nonzero principle scores; an empty chamber or wholly missing federal catalog is not the explanation. The required actual Congress designation remains missing. No majority rule, personal principle or filing threshold was changed to manufacture it.

Measured closing conditions: House 435 members, Senate 100, and 20 authority-admitted federal questions in each chamber. There were 3,248 House and 814 Senate member/question score cells at the existing filing threshold of 3. Largest absolute score was 8. Threshold-level same-direction maxima were 100 House members and 28 senators. These threshold counts are NOT the actual majority-backing predicate, which reads any positive directional score; they do not prove the intake’s reason. Closing observations are not March 1 motives.

Actual recorded mismatch: the March 1 intake `future-due-item_b1461c3e8167df4a` resolved with context “Members of Congress filed their bills.” The month contains zero Congress introductions. The smallest report-context repair is to count actual new Congress measures in `congressIntakeHandler` and write zero when none exists. Proposed shared paths: `src/simulation/governing/congress-lawmaking.ts` and its test. No edit or claim transfer for that producer is inferred. The authority repair proposal and Team 1 strength-caller measurement remain separate dependencies.

Replay source `9d5a64b4f51cb4c62bf924117b09293fc943fc38`, clean; elapsed 92.195 seconds; Save/Continue date/history counts matched. Report check 0 errors/0 warnings; duplicate reported rows and unknown rule packs both 0. NOT RUN: recorded intake-decision explanation, accepted Congress designation proof, browser/full suite and independent reviewer.

# One month of actual measure designations

28 watched-month Day presses in Wadsworth, Nevada, after 35 separately logged warmup presses, produced the following Congress and three random-state filing records. A group with no filings remains zero. The internal IDs and displayed names are both preserved.

## 1. Why-chain

Existing officials filed measures through the normal Day path. Their recorded jurisdiction, chamber and session selected the legal/data counter. This chain ends at procedural data and filed history; no actor reason is inferred from a bill number.

## 2. Research

Verified fields and explicitly unverified common arrangements share one allocator. Legal numbering constants have no effect-size draw. This observation supplies no new causal rate.

## 3. Revisions

No measure was introduced by this collector. Opening records were excluded by canonical sequence. The report does not infer a filing where none exists.

## 4. Numbered observed groups

### 1. Congress: 0 filings

No recorded introduction during this watched month.

### 2. Ohio: 1 filings

- February 15, 2026: HB 1 (2025-2026 Regular Session); house; measure legislative-measure_5d1cf6d2298a9509; jurisdiction jurisdiction_cd70b9ba3c8e7584. Saved title "Cap property tax growth".

### 3. South Carolina: 2 filings

- February 15, 2026: H 1 (2025-2026 Regular Session); house; measure legislative-measure_7910bf67663fe7d7; jurisdiction jurisdiction_e73897803685f85d. Saved title "End cash bail".
- February 15, 2026: S 1 (2025-2026 Regular Session); senate; measure legislative-measure_3040e3d86750b0f7; jurisdiction jurisdiction_e73897803685f85d. Saved title "By-right permitting".

### 4. New Mexico: 2 filings

- February 15, 2026: HB 1 (2025-2026 Regular Session); house; measure legislative-measure_e992d2ff1aa0aeba; jurisdiction jurisdiction_ca05aeb0981cd43a. Saved title "Fund pensions on schedule".
- February 15, 2026: SB 1 (2025-2026 Regular Session); senate; measure legislative-measure_af41776dfd16ae32; jurisdiction jurisdiction_ca05aeb0981cd43a. Saved title "Reduce occupational licensing".

## 5. Simulated, records, world pieces, checks

SIMULATED: the normal observer Day path. RECORDS: actual measure designations and independent IDs. WORLD PIECES: existing jurisdictions, chambers and rule packs. CHECKS: no duplicate jurisdiction/chamber/session/designation among reported introductions; Save/Continue date and history counts agree. Unknown rule-pack records are excluded and counted, never assigned a fabricated jurisdiction.

## 6. Proof receipt

Seed team2-numbering-month-20260930; place 3281000; February 9, 2026 through March 9, 2026; status completed-month.

Source `9d5a64b4f51cb4c62bf924117b09293fc943fc38`, clean. Save/Continue matched: true. Duplicate rows: 0. Unresolved rule-pack rows outside the reported groups: 0.

Closing Congress conditions are read-only diagnostics, not recorded filing motives:

- house: 435 recorded members; 20 authority-admitted federal questions; 3248 member/question scores reach the existing filing threshold 3; largest absolute score 8; largest same-direction threshold backing 100 members.
- senate: 100 recorded members; 20 authority-admitted federal questions; 814 member/question scores reach the existing filing threshold 3; largest absolute score 8; largest same-direction threshold backing 28 members.

Stop: none.

## 7. Worked example

The canonical filed rows above are the worked examples. No synthetic example fills an empty group. This is source/runtime proof; browser interaction and person-level law effects are not established.

# Congress intake now reports the work actually recorded

An intake could record “Members of Congress filed their bills.” while creating zero measures. The bounded repair counts new Congress measure IDs and reports zero, one or two actual filings. Existing proposal selection and majority decisions remain unchanged. The requested before/after watched year is pending; this checkpoint is not ready for acceptance.

## 1. Why-chain

The summary was false because `congressIntakeHandler` always used the same filed-bills sentence. It used that sentence because it reported completion of an intake rather than the measures produced. An intake can produce none because `fileCongressBill` returns unchanged when no majority-backed proposal is selected. Selection requires the existing majority caucus and chamber predicates. Those predicates read each member's saved principles; their formation still includes authored seeded draws. Terminal: canonical records for reporting, own principle records and formation draws for decisions. Constituent requests, donors, groups, leadership, news and reintroductions are not all represented.

## 2. Research

This is a producer consistency repair, not a new empirical filing rate. Source inspection shows both selected filing paths call the canonical introduction writer and schedule Congress's next sitting (`governing/congress-lawmaking.ts`). The monthly intake and Tuesday/Thursday sitting cadence are authored assumptions. No research-backed frequency or authority is inferred from them.

## 3. Revisions

The repair counts IDs absent before intake and filters to Congress measures. It does not count prior bills. No member choice, proposal, threshold, majority predicate, bill writer, referral rule or calendar changes. No new effects link requires a causal size or range because the change records work already produced.

## 4. Numbered built parts

1. `src/simulation/governing/congress-lawmaking.ts`: only the intake reporting hunk.
2. `src/simulation/governing/congress-lawmaking.test.ts`: empty intake, prior bill exclusion and an explicitly authored partial Senate fixture. The selected fixture measure is introduced and the next sitting handler refers it to a committee.
3. `scripts/governance-proof/congress-year.ts`: read-only normal Day-path year, with each resolved intake linked to new measure IDs, introduction/referral/later action counts and Save/Continue date/history checks. Baseline and repaired source use the same published collector and seed.

## 5. Simulated, records, world pieces, checks

SIMULATED: existing members decide from their recorded principles. RECORDS: actual new IDs determine summary text. WORLD PIECES: jurisdiction, members, catalog, rule pack and compiled committees. CHECKS: a filed measure has a canonical introduction; its sitting can refer it; zero selected bills remain zero. No person feels a new law effect from this reporting repair. The explicit partial chamber fixture is not a watched Congress, and cannot substitute for the year.

## 6. Proof run

Focused tests passed 3/3 in 10.29 seconds, including actual fixture introduction and referral. The earlier fixture failures came from advancing an incomplete world through unrelated Congress turnover, then skipping unresolved fixture due items. The repaired fixture calls the handlers directly with the canonical date and moment aligned; no production guard was weakened. Allocator checks remain the prior 69/69 receipt because allocator code is unchanged. Final strict types cover six TypeScript roots, including the year collector, with zero diagnostics. Scoped lint, formatting and whitespace pass. The handback check reports zero errors and zero warnings. The watched before/after year is NOT RUN at this checkpoint. Browser, full suite and independent reviewer are NOT RUN under the no-new-helper constraint.

## 7. Worked example

The actual March 1 intake in the published Wadsworth month resolved with “Members of Congress filed their bills.” and zero new Congress measures. Due item `future-due-item_b1461c3e8167df4a` records that mismatch at runtime source `9d5a64b4f51cb4c62bf924117b09293fc943fc38`. The new zero-case fixture records “No bill was filed during this Congress intake.” The one-member authored fixture records “Members of Congress filed 1 bill.” and reaches committee referral. These fixture outcomes are not an invented watched sponsor story. The yearly report will preserve every actual intake and measure, including none.
