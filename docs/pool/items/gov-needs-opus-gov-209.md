---
id: gov-needs-opus-gov-209
title: "Needs from other sessions listed in OPUS-GOV.md (line 209): 6 lines"
area: gov
kind: wiring
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: 'docs/coordination/OPUS-GOV.md "Needs from other sessions" (line 209)'
---

**What.** Each line below was a request one session made of another. The asking sessions are gone, so each is a wiring job for whoever claims it. Verify against main first; skip what is already built and split off an item for any line that is large.

- OPUS-GOV pillar (legislature, interest groups): background bodies propose no bill with money at stake. Only the player's minimum-wage proposal creates an employers' lobby, so the background world offers no bribes. Background proposals of amounts (minimum wage where local authority allows, budget lines with vendors) w
- OPUS-WORLD (jobs): skip people in custody when deciding who looks for work and whom an employer hires. Until then the justice engine clears a prisoner's new job before its first shift (SG-GOV-justice-prison-hiring).
- OPUS-CORE: a call for a module to take a person's own choices away for a time (custody), instead of the direct write in `justice-custody.ts` (SG-GOV-justice-custody-core-call).
- OPUS-PEOPLE (health): read the custody record (`inCustody` in `src/core2/modules/justice.ts`) for prison's effect on health; death in prison stays the health engine's call.
- OPUS-PEOPLE (words): mined-bank subjects for the `hearing` and `verdict` situation types and for the `justice.*` events.
- OPUS-PEOPLE (director's polling place) and the voting engine: a player in prison was taken to the polls (seed a454f3569122862e, Prairie Elk Colony, Montana, February 28, 2026, mid-term). Whether a prisoner may vote is each state's felony-disenfranchisement law; the polling visit and voter eligibility should read `inC

**Rules.** Wire to the world; an effect is a read; nothing waits on another session (build the smallest registered stand-in).

**Done when.** Each line either built and read by another engine in a played year (record ids), or noted done on main. Update the status file.

**Files.** varies

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
