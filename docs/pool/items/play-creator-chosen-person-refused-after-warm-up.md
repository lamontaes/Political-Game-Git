---
id: play-creator-chosen-person-refused-after-warm-up
title: "A new game with a person chosen in the creator is refused after the warm-up"
area: play
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: account-lead-skills
pr: 9454
blocked-on:
source: "found by the family life thread at train head d82bf47e, Nov 15; fixed in the same pull request"
claimed-at:
after:
lead: play
model: sonnet
effort: low
root: day-one-in-motion
---

**What.** The warm-up folded with #9366 builds the world 31 days before the start date and runs it forward, so the world is on Jan 20, 2025 and its `startedAt` is Dec 20, 2024 when the creator's choice is applied. `POST /api/newlife` with a chosen person answered 400 "An identity is chosen before the first day passes." A drawn new life still started, so nothing caught it. Seen: the New game creator, Advanced, with a name and birthday chosen, starts a game as that person on Jan 20, 2025 at a named place.

**Cause.** Found in code: `src/bench/handler.ts` (the `/api/newlife` route) applied the chosen person with `applyChosenPerson` after `buildBenchWorldInStages` returned, which calls `chooseIdentityV1` in `src/core2/state.ts`, which refuses when `core.date !== core.startedAt`. After the warm-up the world's date is the start date, not the date it was built on. The same comparison in `src/core2/state.ts` for opening cash is made only while the build runs (`opening-income.ts` and `opening-income-funding.ts` add identities with `openingLiquidMinor` before the warm-up), so it is not affected; `src/bench/creator-identity.test.ts` did not build with the warm-up.

**Fix.** The choice is made part of the build: `BuildOptions.chooseIdentity` in `src/bench/world.ts` is called right before the warm-up runs, on the day the world was built, so the player picks who they are before their first day and the weeks the world runs on its own are lived as that person. The route passes it in place of the later call. The rule in `chooseIdentityV1` stays as it is. A creator test builds with `warmUpDays` at a named place with a fixed seed, and a late choice after the warm-up is still refused.

**Time box.** 2 hours for one Sonnet session at low effort. When it runs out, write what was read in this item and stop.

**Rules.** Day one in motion (`.agents/skills/day-one-in-motion/SKILL.md`): the world is in motion on day one and the player picks who they are before their first day; replace, never layer: the later call in the route is deleted in the same change.

**Done when.** A second session, not the builder, starts a new game from the creator with a chosen name and birthday at a drawn place and seed it names, and sees the player as that person on Jan 20, 2025 with the world warmed up (a budget in force and a cabinet by record id); `src/bench/creator-identity.test.ts` passes at its pinned place.

**Waits on.** Nothing.

**Files.** src/bench/world.ts; src/bench/handler.ts; src/bench/creator-identity.test.ts
