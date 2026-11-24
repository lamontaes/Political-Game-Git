---
id: core-chooser-equal-scores-pile-on-lowest-key
title: "When many people hold equal scores, the chooser sends them all to the same lowest key"
area: core
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: legislature-colleague-ties-stay-slight
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Found by the lying thread, Nov 15 2026, building people-colleagues-company-all-goes-to-the-player (the Account lead asked for it as its own item)
---

**What.** The general chooser picks the highest score and settles an exact tie on the lowest key. One person's tie is harmless. But wherever many people hold the same scores for the same options, every one of them picks the same option, and it is the one with the lowest id. At 4846968 (Texas) seed 8647-mason, before people-colleagues-company-all-goes-to-the-player, every senator in the class sworn in on 2023-01-10 kept company only with seat 002, and every senator in the 2025-01-14 class only with seat 001 (132 and 25 of 200 acts, Feb 1 to 14, 2025). Each class's lowest id became its closest colleague, and that feeds the sponsor term on their bills. Seen: in dev mode, one colleague or neighbor whom everybody visits, while the others are visited by no one.

**Cause.** Found in code: `decisionFromScores` in src/core2/choice.ts (the comment at about line 510 says "the highest score, ties to the lowest key") settles equal scores on the key. Places where many people can hold equal scores for the same options, and where a player would meet the pile:

- src/core2/modules/people.ts `contact-candidate`: the lowest-id untied known person stands for every untied person, so everyone's first contact with someone new goes to the lowest id they know. A player meets this as one neighbor or colleague who everybody visits.
- people.ts `weeklyContacts` ranks equal pulls by id.
- Colleagues known only through a body: people-colleagues-company-all-goes-to-the-player now orders these by the sitting reader's own order. That is the one place fixed so far.

**Fix.** Read each place above. Where equal scores come from equal records, settle them by an order the record already keeps that differs for each person, as the sitting reader's nearest-in-service order does, never a draw. Leave the chooser's last resort on the key, and say for each place why its order is the realistic one.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: an order read from a record, never a seeded pick. One rule, all 56 places. Speed: no new scan on a per-person-per-day path.

**Done when.** A test at a named place and seed, and a played year in a drawn place, shows that for each place above, no one option takes more than its share among people whose records are alike, with counts per option. A second session sees it in dev mode on main.

**Waits on.** legislature-colleague-ties-stay-slight, which makes colleagues' records differ in the first place.

**Files.** src/core2/choice.ts, src/core2/modules/people.ts
