---
id: world-new-game-18-and-always-registered
title: "A new game's player is 18 unless the creator picks another age, and the player is always on the rolls"
area: world
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude-world
pr: 9774
blocked-on:
after:
lead: world
model: sonnet
effort: medium
root: none
source: Owner's Desk answers, Nov 16, 2026 ("18, unless you pick another age."; "Keep it for townspeople; you are always registered."), crew line #9747 item 6d
---

**What.** A new game with no age chosen picked any adult of the town as the player, so players opened at 49 or 66. A player could also be marked never registered and turned away at the polls. The owner's answers are 18 unless another age is picked, and registration kept for townspeople with the player always registered. Seen: owner playing, Nov 16.

**Cause.** Found in code: `entrantChoice` in `src/bench/world.ts` drew a town adult by seeded unit when no birthday was given, and `onTheList` in `src/core2/electorate-registration.ts` read the player's own registration row like anyone's.

**Fix.** `buildBenchWorld` in `src/bench/world.ts` now gives a two-level new game the birthday `defaultPlayerBirthDate` (18 on the start date) when none is picked, so the existing birthday path picks the resident nearest that age; `onTheList` returns "on" for the controlled person. The player sees age 18 on their card and is never turned away.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** The `wire-to-the-world` rule applies: the player's age picks the resident through the town's own people records, and registration is read from the rolls' own record for townspeople. No dice: the age is the owner's answer and the pick is nearest age.

**Done when.** In a drawn place and a seed the builder did not choose, a new game with no age picked has an 18-year-old player and a staged never-registered player is still on the rolls, shown in `src/bench/new-game-default-age.test.ts` and `src/core2/player-always-registered.test.ts`; a second session sees age 18 on a new game's card.

**Waits on.** Nothing.

**Files.** src/bench/world.ts, src/core2/electorate-registration.ts, src/bench/new-game-default-age.test.ts, src/core2/player-always-registered.test.ts

**Notes.** Handoff's branch `claude/project-thread-dvz2zo` started the age default; this builds it through the one birthday path. "Take every count off the screens" is posted for Screens on #9747.
