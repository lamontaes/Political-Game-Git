---
id: director-residents-blame-a-council-member-for-federal-laws
title: "Residents stop a town council member over federal tariffs and food aid, and the replies say 'It was a hard vote'"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: director
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: "Account lead T25 playtest, Nov 13, 2026 (Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train c39bbb71)"
checked:
claimed-at:
---

**What.** A council member of a 900-person town is stopped in the street: 'You're Quinn, aren't you? I want a word about raise tariffs. Raise tariffs took effect, and I'm the one living with it.' The replies are 'It was a hard vote. I'll tell you what I weighed', 'Give me your number' and 'This isn't the place'. The same happened over 'shift highway funds to transit' (a county ordinance) and 'the maximum monthly food assistance benefit' (federal). The council voted on none of them. Seen: the 8:00 AM street scenes of a seated council member (Feb 14, Feb 28, Mar 14 and Oct 17, 2025).

**Cause.** Found in code: the constituent-stop situation in src/director/data/situation-types.json (line 2492) takes any law that reached the resident (purpose law-reaches, stakes bill) and casts the player as the one asked, with 'seat': 'any'. Nothing checks that the law came from a body the player sits on or voted in. Measured: Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train branch c39bbb71 (Account lead T25, Nov 13, 2026); Advanced start as Quinn Pugh (person_0da8a3ad92ce11a4).

**Fix.** Cast a constituent stop about a law only on an official whose body made it or who voted on it, by the law's enacting body record. A law from another level goes to the resident's talk about the news, or to an official of that level. Add a director test: a federal law that reaches a town resident stages no constituent stop on a town council member.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Ask why: a stance about a law cites the record the person learned it from. One rule, all 56 places.

**Done when.** A second session plays a seated local member on main in a drawn place, named with its seed, for three months, and every street stop about a law names a law the member's own body passed.

**Waits on.** Nothing.

**Files.** src/director/data/situation-types.json, src/director/purpose-scene.ts
