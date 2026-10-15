---
id: gov-needs-opus-gov-74
title: "Needs from other sessions listed in OPUS-GOV.md (line 74): 3 lines"
area: gov
kind: wiring
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: 'docs/coordination/OPUS-GOV.md "Needs from other sessions" (line 74)'
---

**What.** Each line below was a request one session made of another. The asking sessions are gone, so each is a wiring job for whoever claims it. Verify against main first; skip what is already built and split off an item for any line that is large.

- OPUS-PEOPLE: views and speech are theirs, and this branch changed them. A case now moves a listener by the speaker's standing (trust, closeness, party, record), not lean nearness alone, and the same case from the same speaker wears out with each repeat. A person's own act for their cause no longer moves their own sta
- OPUS-PEOPLE / CTO: #4153 deleted `src/presentation/english-composition.ts`, `english-grades.ts` and `speech-registers.ts`, which the director's opening and the newscast still import; main's played world can't load. PR #4193 restores them unchanged.
- OPUS-CORE: added `leave(personId, organizationId)` to the core API, the mirror of `join`, for group members who change sides. Done for them: candidacy and legislature now read faded closeness (`closenessBetween`); SG-CORE-closeness-gov-raw-reads resolved.

**Rules.** Wire to the world; an effect is a read; nothing waits on another session (build the smallest registered stand-in).

**Done when.** Each line either built and read by another engine in a played year (record ids), or noted done on main. Update the status file.

**Files.** varies

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
