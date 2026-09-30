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
