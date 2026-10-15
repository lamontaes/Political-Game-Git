---
id: people-needs-opus-people-22
title: "Needs from other sessions listed in OPUS-PEOPLE.md (line 22): 10 lines"
area: people
kind: wiring
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: 'docs/coordination/OPUS-PEOPLE.md "Needs from other sessions" (line 22)'
---

**What.** Each line below was a request one session made of another. The asking sessions are gone, so each is a wiring job for whoever claims it. Verify against main first; skip what is already built and split off an item for any line that is large.

- Words session: an interview subject in the conversation (the reporter's questions as lines; plain, further, turn, brief and the lie as choices), and a bring-it-up row for `news.read` with lines naming the outlet, the topic and whether it ended something.
- OPUS-CORE: identity fill-in with a household and budget (stopgap SG-PEOPLE-press-staff-households).
- OPUS-WORLD: local businesses buying ads (stopgap SG-PEOPLE-press-outlet-revenue).
- OPUS-CORE: the news archive (`past-news.ts`) still writes the old news module's `outlets` table; it should read the press's outlets so there is one list of outlets.
- OPUS-WORLD (jobs): town reporters leave work by the jobs engine's own choice (Hawkins, Texas, seed 17bd8efac39cd785eceb322e1232bdfcf87b0b80: the station's in June, the paper's in September, both `left-work`), and the jobs engine reopens the position for its seekers, who are not the outlet's named people. The press no
- OPUS-PLAY: a control for the player to ask an outlet for an interview while holding a seat (the record side is `requestInterview` with a person id).
- OPUS-GOV (elections): `makeStatements` appends repeated stances and reuses promise ids (elections audit defects 31 and 32); interviews now call it once per interview.
  Questions for the owner: whether papers endorse candidates (stopgap SG-PEOPLE-press-endorsements).
  Sub-agents: none wrote code. One Sonnet research helper read the payroll and money paths (read-only).
  What the owner can play now: the town's outlets have names, owners and named people; their stories follow what the town's council and state do, slanted by who owns them, and the people who read them change their minds on those questions. A candidate can ask for an interview, and an outlet whose people dislike them can

**Rules.** Wire to the world; an effect is a read; nothing waits on another session (build the smallest registered stand-in).

**Done when.** Each line either built and read by another engine in a played year (record ids), or noted done on main. Update the status file.

**Files.** varies

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
