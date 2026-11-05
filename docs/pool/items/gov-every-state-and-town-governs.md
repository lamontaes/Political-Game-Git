---
id: gov-every-state-and-town-governs
title: "Every state legislature and every other town's council sits and passes laws, at a coarser level"
area: gov
lead: laws
kind: bug
priority: 1
size: L
status: done
claimed-by: claude/state-sessions-base
pr: #7288
blocked-on:
source: owner, Oct 29 voice note on the governing brief
claimed-at: 2026-11-05T06:48:43.586Z
---

**What.** The owner ruled Sept 26 that all 50 legislatures are seated from day one (DECISION-REGISTER 276-284), and on Oct 29 he said: "Other states and towns never sit. No, all 50 states need to. Oh my God. Why? How?" Today `world-legislating.ts` opens only the town's own state and Congress (openWorldLegislating, lines 182-192), so 48 legislatures, D.C.'s council, the territories' legislatures and every other town's council never sit and never pass a law. Other places run at a coarser level (AGENTS.md, Oct 10), so they sit on their real calendars and pass laws through the same draftBill and holdVote with members as officials, without full people beneath them.

**Rules.** One rule, all 56 places: every state, D.C. and each territory sits from its own data rows, never a named list in logic. Speed: a town's game year stays under two minutes, so other places' sittings act only on their session days and never scan the world daily. One engine per mechanic: the same legislature engine, no second background writer.

**Done when.** In a buildBenchWorld played year from a drawn place, a test names the place and seed and shows at least 40 state legislatures and three other towns' councils holding sittings and enacting laws, by law record id, through the one engine, and `npm run speed:year` stays within 20 percent of its base.

**Files.** src/core2/modules/world-legislating.ts, src/core2/data/offices/bodies.json, src/core2/data/legislature/

**Notes.** Filed by the CTO, Oct 29, from the owner's voice note on the governing brief (OWNER-DECISIONS, Oct 29 21:40 UTC). Read: OWNER-DECISIONS, DECISION-REGISTER, the governing brief's four research notes; searched the pool for twins.

Oct 29 (laws lead): mapped read-only; the plan is docs/reports/world-governing-plan-2026-10-29.md (units U1, U1b, U2, U3, U4, each one PR; about 22-34 builder hours). Speed is the hard limit: main is already about two minutes a year, so the CTO rules on the budget before U1 lands. U1 (seat every chamber, measured alone) starts Oct 29 on claude/gov-every-state-and-town-governs.

Nov 1 (laws lead): taken back from Codex package B, which ended at 05:20 UTC without a commit on claude/gov-every-state-and-town-governs; CTO confirmed 13:17 UTC. U1 is finished at 5d32548390 (every other place seated as named officials, governors raced through the one seat loop, a year 79.8 s against main's 97.4 s); left: one skeptic, the PR.

Nov 1, 20:00 UTC (laws lead), U2's seams agreed before building. Governing lead: U2 builds on main after `governing/phase-in-dated-steps` merges (its `sectionDates` reach the effective-date readers); no phase B unit edits `billJurisdiction`, the effective-date or power-check readers, or `lawTookEffect`, so U2 goes first on those; one exported helper `inTownChain(chain, jurisdiction)` in laws-in-force.ts serves `resolveLawInForce`, `lawTookEffect` and `billJurisdiction`; message the governing lead before touching world-legislating.ts near the co-sponsor work. Words: U2 makes the press's wireItem jurisdiction check itself, beside #7022's held-seat check, after #7022 merges, marked `Review: words`. Reads to keep: legislative-vote's personIds (the director's ledger takes a watched member's floor vote as a scene cause); office.voted for chain bodies and circle members (the Journal's own-votes row); law-took-effect only for chain laws (the Journal's law rows and the law street stop), so an outside law returns early. An outside body's vote off the wire is right for bring-it-up.ts.

Nov 1, 22:00 UTC (laws lead): U2's build spec is `docs/work-orders/world-governing-u2-spec-2026-11-01.md` (16 steps in three commit groups, the proof, the stopgaps, speed and seams), mapped by four read-only readers on main c9b60ce1ed with a completeness critic (`docs/work-orders/world-governing-u2-critique-2026-11-01.json`). It builds after #7054 (phase-in) and #7020 (U1) merge. The critic's gap on outside oaths reaching the wire once U1 seats every place is already fixed in #7020 (wireItem drops an outside office's seat, reviewed by Words).

Nov 2, 01:50 UTC (laws lead, HANDOFF, set back to open): U1 merged as #7020 (every state's chambers, governors and statewide offices seated and raced through the one seat loop). Next is U2, built from docs/work-orders/world-governing-u2-spec-2026-11-01.md (moved there by #7079; until it merges, docs/reports/) after the governing lead's #7054 merges; seams agreed in this item's Nov 1 20:00 Notes. Then U3 (every legislature sits), U4 (other towns' councils). The speed lead's fold of U1's growth is core-long-run-election-and-term-rows (answered Nov 2 00:30 in its Notes).

Nov 5 (State Sessions session): step 1 merged (#7288, speed base in `docs/reports/state-sessions-base-2026-11-05.md`), step 2 part 1 merged (#7289, each body's law key). Step 3 is built on `claude/state-sessions-sit` (draft): `openWorldLegislating` loops `sessionPlaceKeys()` (all 56 calendar rows plus Congress), `SG-GOV-other-legislatures-not-sitting` removed, the state check on question scope and settledness now takes the sitting government's key. It works: in a year from Upper Witter Gulch, most states' sessions voted bills into law (the count by law record id is not taken yet; the 40-state proof is still to write). It is not mergeable yet, for three reasons found by running it:

1. **Speed.** First 75 days cost 224 s against a 25 s base (about 9 times). Where it goes (CPU profile): a full per-member vote for every bill in 56 legislatures (`countVote` 101 s: `positionOn` 66 s, committee stage 29 s, amendments 48 s), seating about 7,500 legislators as named officials once (`seatAll` 32 s), and pairwise coworker ties (`colleagues` 20 s). Step 4 must make an outside session coarse inside the one engine, for example a chamber vote counted from members' saved positions without per-member committee and amendment rounds. A shortcut that drops the coworker ties for other states' members is wrong: votes read that closeness (sponsor weight), so it stays.
2. **Settledness was global.** `lastEnactment(series)` read every government's rows, so one state's fresh law made every other state's law look fresh (and was the slow scan). Now scoped to the body's own government (`lawKeysOf`), the town's chain plus the nation for a town body, only the state's own for an outside body.
3. **Two existing tests in `world-legislating.test.ts` assume only the player's state sits.** The trade-amendment check ("the maker votes yes") walks every bill in the world; another state's bills break it when a later bill on the same question changes the member's record weight between the committee deal and the floor vote (American Samoa's senate, HB 589, was the first). It should be scoped to the player's own state, with a separate check for outside chambers. The two Congress tests now exceed their 30 s limit because 56 more legislatures sit in the same days.
   Still to do: step 4 (coarse outside sessions), step 2's other readers (effective date, power check, filer lean, interest groups, events), step 5 (the Nation story), step 6 (Montpelier memory; lead in the base report: folded campaign causes, the durable log, relationships).

Nov 5, later (State Sessions session), step 3 and 4 work on `claude/state-sessions-sit` (draft #7290). Timed, Upper Witter Gulch, seed 5a1c0de7a11ce5e1, with every state sitting: year 1 193.6 s (base 59.5 s), year 2 316.2 s (base 172.8 s); years 3 and 4 not run. Cuts that held, each from a CPU profile: a vote index by person and question (a member's latest vote on a question was a scan of their whole record), new officials tied within their own state instead of a pass over every official, no sponsor dealing for another government's bills (`SG-GOV-outside-bills-no-dealing`, registered), and the town's interest groups organizing only over law that reaches the town. The first 75 days went from 224 s to about 98 s against a 25 s base. What is left in the profile is spread thin: the per-member vote itself, vote events (`chamberVote` emit), `members` lookups, party leadership elections for 56 chambers. The bar (no year over 5 percent slower) needs a coarse vote for another government's chamber, counted from saved positions without a per-member record and event; that is the CTO's or owner's call on how coarse a vote record may be.
