---
id: life-a-dead-persons-own-card-says-they-died
title: "A person who has died has no sentence on their own card saying so"
area: core
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-life-a-dead-persons-own-card-says-they-died
pr: #8332
after:
blocked-on:
lead: fable
model: sonnet
effort: medium
root: design-life-record
source: the life record's second session, Nov 10 (not seen; its note is on core-life-record); cause found by Fable
checked: fable 2026-11-10
claimed-at: 2026-11-10T23:38:52.639Z
branch: claude/pool-life-a-dead-persons-own-card-says-they-died
---

**What.** When someone dies, their relatives' cards and the player's My life say so ("lost his parent"), but the dead person's own card ends with whatever came before. In the second session's game a father's card said only that he "fell seriously ill in 2026". A card has to say that the person died, when, and of what where the record gives it.

**Cause.** Found in code: the life list remembers a death only for the family. src/core2/data/life/remembered.json has one row for the record `life.death` (line 114), with `who: kin-of-named` and life `loss`. There is no row for the person who died. And `rememberRow` in src/core2/person-life.ts skips anyone who is not alive (`if (!person?.alive) continue;`, line 251), so a row for the dead person would be skipped as well, because the death is recorded after they stop being alive. Measured: the second session's acceptance check on main b094bee1 (Notes on docs/pool/items/core-life-record.md): in Rock Hill, Missouri (seed 0cf1896a-28d6-4915-b0d4-7cf95baa3efd), by day 650, Daniel's death is on each relative's card and on My life, and his own card has no death.

**Fix.** Add a second row for `life.death` in remembered.json for the named person themselves: life `death`, what `died`, keeping the fact `causeOfDeath`. Give a row a flag that says the person it names keeps it even though they are no longer alive, and have `rememberRow` honor it for that row only; every other row still skips the dead. Have `lineOf` in src/bench/card.ts (line 325) turn the event into the bank key for a death on the person's own card, with the year and the cause as slots, placed last in the story. The builder writes no line: list for Story the pieces needed under data/english/parts/person-history.json (a death told about someone, in the forms the story's other pieces have: third person and they), and until they exist list the pair under `notTold` in remembered.json (line 323) with that reason, so the "nothing untold by accident" check still passes.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One life list: the card, My life and the Journal read the same events, so the death goes on the list, never into the card alone. Only the Story session writes lines under data/english/parts/. No dice. Follow .agents/skills/drawn-place-tests/SKILL.md for the test: wait in a drawn place until a full person dies, and name what was passed over.

**Done when.** A second session, on main in a drawn place (place and seed named), plays until someone whose card it can open has died, opens that card, and sees a last sentence saying they died, with the year, once; the relatives' cards still say their loss once. A test in src/core2 names the place, the seed and the event id on the dead person's own list.

**Waits on.** Nothing to build. The sentence shows in the game once Story's pieces for it are on main.

**Files.** src/core2/data/life/remembered.json, src/core2/person-life.ts, src/core2/person-life.test.ts, src/bench/card.ts, data/english/parts/person-history.json

**Notes.** Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:38 UTC) on branch claude/pool-life-a-dead-persons-own-card-says-they-died.
