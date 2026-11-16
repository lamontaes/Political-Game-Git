---
id: laws-nine-links-rights-env
title: "Every rights, technology, environment, farms and parks law passes all nine wiring links in a played year"
area: laws
kind: wiring
priority: 1
size: M
status: done
standard: 2
claimed-by:
pr: #5669
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
claimed-at:
after:
lead: laws-effects
model: haiku
effort: low
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** The rights, technology, environment, farms and parks family (thirteen laws) stood at 9 of 13 wired when PR #5669 was sent back on Oct 25, with two stopgap web links and two partial reach chains left; the Notes also say five laws stay open after the bounded item laws-nine-links-rights-eight (now dropped), so which laws are still short is not settled. The family: ban-discrimination-in-housing-and-work, restrict-abortion, dedicated-parks-funding, budget-line:parks, age-verification-for-social-media, restrict-government-facial-recognition, consumer-data-privacy-law, clean-air-plan-for-polluted-counties, budget-line:naturalResources, limit-groundwater-withdrawal, protect-farmland-from-development, budget-line:highways and shift-highway-funds-to-transit. A law passes the nine links when it exists in all 56 places, a body can enact and repeal it, it reaches people and organizations, the engine it changes reads it, it moves money between real accounts, it moves its outcome-web measures, people learn of it only by a read, repeal stops it, and one code path serves every place.

**Cause.** Measured: `node --import tsx scripts/law-wiring/check.ts --seed 3f77f7d1d2688e09629641c1c0fa3cc2 --only <the family's keys>` on main 3039a3fa1d (Hettinger, North Dakota, a fresh draw), graded with `scripts/law-wiring/matrix.ts`, read with main's own `docs/reports/law-wiring-matrix.json` (25 places). All thirteen laws of the family are wired on all nine links in main's matrix. In Hettinger ten are wired. The other three read a condition the town does not have, which is correct. `clean-air-plan-for-polluted-counties` binds only a county that misses an air standard (EPA Green Book, read in `src/core2/modules/business.ts` near line 921). Lebanon, New Jersey is bound (organization_e9e175247754c32e), while Prescott's and Uehling's counties miss none, and neither does Hettinger's. `limit-groundwater-withdrawal` reaches irrigated farm output (business.ts line 1249). Prescott reached organization_4b47f062ac052d9a (journal:2025-04-22:23519), and Hettinger reached no farm. `age-verification-for-social-media` reached 8 people in Hettinger, but no business there paid the verification cost. In Prescott one did ($1,198.83, journal:2025-02-01:1969). Where nothing happens, the grader names the open stopgap row on the law (`SG-GOV-REACH-A-age-verification`, `SG-GOV-REACH-B-business-cost`), so the cell reads `stopgap` instead of not applicable. What those rows still fake (minors' account sign-up and consent; the outcome web's pumping cut standing in for each farm's irrigation) is depth no player sees.

**Fix.** Nothing to build. Proposed: the CTO closes the item (`npm run pool -- status laws-nine-links-rights-env done --by=cto`), since every law in the family is wired in main's matrix and the open stopgap rows on two of them are depth no player sees (owner, Nov 10).

**Time box.** 0.5 hours for one Haiku session, only if the CTO keeps the item.

**Rules.** An effect is a read, not a record: the engine that pays or decides reads the law and records whom it applied it to through `lawApplied`. One model, two tiers: counted groups take the same rule as full people, times the count. Ask why: a person attributes a change to the law only after news they received, a conversation, a notice or an ad. The chain is the acceptance: each law is followed to a named person and a dollar.

**Done when.** The CTO closes the item. If it is kept, a second session runs `scripts/law-wiring/check.ts` with `--only us-policy-positions:environment-energy.clean-air-plan-for-polluted-counties` in a drawn place whose county misses an air standard (drawing again until one does, and naming the places passed over, as `drawn-place-tests` says), names the place and seed, and sees the law's `lawApplied` row for a named business and its compliance cost on the journal.

**Waits on.** Nothing.

**Files.** src/core2/modules/business.ts, src/core2/data/laws/reach-group-a.json, src/core2/law-reach/group-a.ts, src/core2/law-reach/applied.ts

**Notes.** Split Oct 24 by the CTO from `laws-wiring-every-law` (the lead order: `docs/work-orders/lead-laws-2026-10-24.md`). Family PR state on Oct 23: open, #5669 (branch claude/law-wiring-rights-env), conflicting with main since Oct 22 (src/core2/modules/business.ts) and sent back to correct its removed-row count. A PR for this family names this item on line 1 (`Pool item: laws-nine-links-rights-env`) and `Lead: laws` in its body, never the umbrella: family PRs looped because the umbrella's done-when is one no single family can meet, and a bare umbrella id on line 1 closes the umbrella on merge. The discrimination ban is not a question for the owner: he ruled sex and race go on the record (OWNER-DECISIONS.md, Oct 24, "Sex and race on the record") and, on Oct 26, that discrimination is yes and is not asked again. The ban reads age, which the world already records, until `people-protected-traits-on-record` lands; the stopgap SG-GOV-REACH-A-discrimination-protected-traits (missing-mechanic) carries the gap and no owner-decision stopgap is registered for it. The bounded item `laws-nine-links-rights-eight` takes eight of the thirteen laws; this item stays open for the other five.

Sent back 2026-10-25 from PR #5669 (branch claude/law-wiring-rights-env): family Done-when still partly met at 9 of 13 laws; two stopgap web links and two partial reach/allPlaces chains cannot complete the all-laws item; complete them or bound the landed subset while retaining family open; finish on that branch, merge main into it first.

Nov 11 (cause finder for Fable B): regraded on main 3039a3fa1d in Hettinger, North Dakota (seed 3f77f7d1d2688e09629641c1c0fa3cc2) and read main's 25-place matrix. All thirteen laws are wired there. The three that Hettinger does not show (clean air, groundwater, age verification) bind a county, a farm or a business the town does not have. I propose the CTO closes the item.

Closed as done Nov 13, 2026 (Account lead T43, CTO's ruling on #8928 comment 6865473498, checked against the code on the train, draft PR #9052, eb349e5d76): its own Fix says nothing is left to build. Code check: all thirteen laws of the family grade wired on every link in the train's `docs/reports/law-wiring-matrix.json` (consumer-data-privacy-law's web link is n/a); the three that show nothing in one town bind a county, farm or business that town lacks.
