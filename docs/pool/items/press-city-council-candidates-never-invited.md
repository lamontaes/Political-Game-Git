---
id: press-city-council-candidates-never-invited
title: "An announced candidate gets no interview: the press reads only filings on the ballot, and the screen never says the outlet's answer"
area: elections
kind: bug
priority: 3
size: S
status: merged
standard: 2
claimed-by:
pr: #10357
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: "Interview check thread, Nov 15, 2026; owner's sitting 2026-11-23-1, row P50, traced by the Dead stops tracer (lane 5), Nov 23"
milestone: play-first
merged-at: 2026-11-24T06:45:22.623Z
---

**What.** The owner, Nov 23 (P50): "Let's ask for an interview. Okay. Nothing happened." He had announced for a council seat whose filing opens later, as the Nov 17 ruling lets him ("Run now, file on the date"). Asking the town paper for an interview spends an hour and shows only the outing's name, and no outlet ever asks him either.
Seen: Ask for an interview on the campaign trail, and the reporter's invitation a candidate gets.

**Cause.** Found in code: src/core2/modules/press.ts:2314-2318, in `arrangeWith`, declines every ask whose filing is not `standing` with reason `race-over`, and `standing` (src/core2/modules/elections.ts:2059-2061) is true only for `petitioning` and `on-ballot`, so an `announced` filing (elections.ts:295) is always refused. Measured at Verdigre, Nebraska (jurisdiction_acd66a0193bcadb4), seed 3c87be06-3434-405b-afab-c219d0d1b68d, main 7f04c334: after `POST /api/announce` for the council race of Nov 3, 2026, `POST /api/campaign/day?kind=interview&outletId=outlet:newspaper:0:jurisdiction_acd66a0193bcadb4` returned interview `interview:outlet:newspaper:0:jurisdiction_acd66a0193bcadb4:filing:contest:seat:gus2025:169641:council:0:2026-11-03:person_a1af9f4c5593edae:2025-01-20:0` with status `declined`, no scene and a `complete` packet. The outlets' own asks miss him the same way: the seeking loop in `pressWeek` reads its candidates from `ballot()` (press.ts:4444-4445), and `ballot` (elections.ts:2092-2104) keeps only standing filings. On the screen, `campaignDay` returns the interview's id, outlet and status but not its reason (src/bench/campaign.ts:1136-1142), and `goOut` in src/bench/play.mjs (about 2101-2135) never reads `result.interview`: with no scene and no stop it reopens the trail with the outing's name only, so a refusal and a yes look the same.

**Fix.** In the press engine, count an announced candidate as in the race: one predicate in src/core2/modules/elections.ts beside `standing`, true for `standing` filings and for `announced` ones whose race is still ahead (`raceAhead`), used at press.ts:2316 and for the candidates the outlets' loop weighs (press.ts:4444, joined with the contests' announced filings), so the existing newsworthiness and room rules decide, never a roll. Return the interview's `reason` from `campaignDay` (campaign.ts:1136), and in `goOut` show the outlet's answer: a yes plays through the existing `press-interview` situation (its `cause:event:interview-invited` scene), a no shows the reason. The only reason label in src/bench/data/controls.json is `campaignUnavailable.interviewed`; for the others, list them in the pull request under "Lines needed, for Story" and type none. The filed big-city case below is not part of this fix.

**Time box.** 3 hours for one Sonnet session.

**Rules.** No dice: whether an outlet says yes stays its newsworthiness, its people's regard and its week's room, never a roll or a quota. No hand-written player text: a refusal's words come from controls.json or from Story, never typed in play.mjs. One rule, all 56 places: the test draws its place and names the place and seed.

**Done when.** A second session starts a new life in a drawn place on main after the merge, announces for a local race before its filing opens, and asks a paper for an interview within the first week: the screen shows the outlet's answer (a scene for a yes, its reason for a no), with the interview's record id, the place and seed and a screenshot at 1440x900. A test that announces in a drawn place and asks fails on 7f04c334 with reason `race-over` and passes on the fix.

**Waits on.** Nothing. Labels for the refusal reasons wait on Story, and the screen shows the outlet's answer as a yes or the existing label meanwhile.

**Files.** src/core2/modules/press.ts, src/core2/modules/elections.ts, src/bench/campaign.ts, src/bench/play.mjs

**You will see.** Asking a paper for an interview as an announced candidate shows the outlet's answer: an interview for a yes, its reason for a no.

**Screenshot.** The campaign trail after Ask for an interview, from a drawn place, with the place and seed under it.

**Notes.** The Nov 15 measurement this item was filed for is a different case and is not traced here: at Omaha, Nebraska (3137000), seed `omaha01`, a filed council candidate (9 on the ballot) got no `askedBy: "outlet"` interview from the city's 11 outlets before election day, on both the train base (cebf23ed) and the outlet-of-record change. If it still reads 0 after this fix, file it as its own item; read `raceTurns`, `raceAudienceShare` and `newsworthyBar` against a 9-candidate race first.
