---
id: housing-counted-renters-reach-eviction-hearings
title: "Counted renters can reach an eviction hearing and its right-to-counsel lawyer, as full renters do (Clemmons, North Carolina: 0 hearings in 700 days)"
area: core
kind: wiring
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: high
root: design-one-model-two-tiers
source: added with npm run pool -- add
lead: laws
checked: fable 2026-11-10
---

**What.** Housing opens an eviction case only from a full household's lease: a contract with arrears past the grace period. In Clemmons, North Carolina (about 22,800 people; key 3712960, world seed 24811d36fe547b3e21330b24f52ba0fb17dffce7368ad148f5ae6056676ba0d6, GOLDEN_PATH_SEED=hr-fresh-9c2) housing's cases table had 0 rows in 700 days with the right-to-counsel law in force on 23 of 24 monthly checks. If counted renters, who are paid by their groups as rent: contracts, can never produce a case and only full households can, that breaks one model, two tiers. The law-wiring housing test passes such a town over; it does not answer this.

**Cause.** Measured: `node --import tsx` with a probe outside the repository, Clemmons, North Carolina (3712960, world seed 24811d36fe547b3e21330b24f52ba0fb17dffce7368ad148f5ae6056676ba0d6), one played year on main 061eda78, read every 30 days. Housing's cases table now gets 13 rows in the year, so "0 in 700 days" no longer reproduces, but every one is a full household's. Counted renters (910 households at the start, 718 at the end) had no group in arrears in any month, and `countedLate` (src/core2/housing-homeless.ts line 741) returned 0 every month. Found in code: the notice step already takes counted households (src/core2/modules/housing.ts, about line 1750, writing cases with `counted: true`), but only from a group's arrears. A counted household's rent is paid from its group's pooled fund (stopgap SG-WORLD-housing-counted-rent, src/core2/data/stopgaps/world.json). The housing branch of the counted payment in src/core2/counted-money.ts (about line 762) carries arrears only when the whole group's fund cannot cover what it asks. A group is households of one kind in one place, mixing incomes, so in a town like Clemmons it never runs dry, and no single counted household can fall behind. The stopgap's own replacement is "per-household cash for counted households, with arrears and eviction through the same legal steps"; no open item builds it.

**Fix.** Build the stopgap's replacement for rent only. (1) Keep arrears per counted household beside the group's (a map in the residents runtime by household id). (2) When the counted payment asks a group's rent (src/core2/counted-money.ts, housing branch), split it by household. Each pays up to what its own income can carry this month (`householdIncome` in src/core2/modules/residents.ts, less its share of the group's living costs), and the group's fund covers the rest only up to its pooled balance. What a household cannot pay is that household's arrears, and the landlord is paid the rest. (3) `countedLate` reads the per-household arrears instead of spreading the group's. The notice, cure, hearing and counsel steps already take counted cases unchanged. (4) Keep every dollar balanced: the group's fund, the households' arrears and the landlord's receipts add up each month. Mark the stopgap's rent part replaced, and keep its moves part open. Prove it in Clemmons and one fresh draw.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted group is read by every engine with the same rule as a full person times its count. No dice: a hearing comes from arrears and the place's steps. Wire to the world: a counted renter's unpaid rent must be able to move money, people or a place's records. Estimate, never UNKNOWN: if a rule keeps counted renters out of cases, it is registered with its source.

**Done when.** A second session, not the builder, plays Clemmons, North Carolina (seed above) and a fresh drawn place with counted renters (seed named) for a year. A counted household whose own income cannot carry its rent falls behind by household id, reaches a housing case row with `counted: true`, and with the right-to-counsel law in force its lawyer is paid through the journal by record id. The year's counted cases are printed beside the full ones and the ACS renter count. The law-wiring housing counsel case passes at hr-fresh-9c2 without passing over the town.

**Waits on.** Nothing.

**Files.** src/core2/counted-money.ts, src/core2/modules/residents.ts, src/core2/housing-homeless.ts, src/core2/modules/housing.ts, src/core2/data/stopgaps/world.json, src/core2/law-wiring-housing.test.ts

**Notes.** lead: laws. Found by red main fixer 2 (Nov 2) and raised by the laws lead. Cause of the red, test side: PR 7136. Unverified whether counted renters can reach cases; first step is to read housing.ts around the late-lease loop (about line 1455) and the counted rent path.

Nov 11 (cause finder for Fable B): read the cases and the counted arrears every 30 days in a played year of Clemmons with a probe outside the repository. Counted renters can reach a hearing in code, but their rent comes from a pooled group fund that never runs short, so none falls behind. The fix keeps each counted household's own shortfall, as the stopgap's replacement already says.
