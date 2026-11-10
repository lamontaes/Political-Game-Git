---
id: play-move-out-on-screen
title: "An adult player living with their parents can choose to move out, and Who you are says what it would take"
area: play
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: Oct 25 pool audit, on-screen pass (from people-leave-parents-home)
lead: play-first
milestone: play-first
after:
model: sonnet
effort: medium
root: rc7-player-cannot-drive
checked: fable 2026-11-10
---

**What.** Young adults never leave their parents' home in play, and people-leave-parents-home builds the decision for the people the game runs. The player, who usually starts at 18 in a parent's home, has no way to move out. Offer Move out on Who you are when the player is an adult in a parent's household, listing rentals in town they could afford from their pay and savings, and say plainly what is missing when none fits.

**Cause.** Design: docs/play-first/LAW.md section 11 (the world on screen makes sense); no move-out control exists in src/bench/card.ts or src/bench/handler.ts, and the people engine's leave-home decision (people-leave-parents-home) is open.

**Fix.** Offer Move out on Who you are for an adult in a parent's household, listing rentals the player can afford from housing and cash records by the same rule other people use, sign a lease by record id, and say plainly what is missing when none fits.

**Time box.** 3 hours for one Sonnet session; if not done, push what exists, open the draft PR, write the handoff.

**Rules.** Serves LAW.md section 11. Wire to the world: the rentals and the money test read the housing and cash records, the same rule the people the game runs use. Ask why: when the screen has nothing to show, it says why in plain words, never a code or an empty box.

**Done when.** A second session, in a drawn place on the bench, sees an 18-year-old player in a parent's home get Move out on Who you are; taking it signs a lease by record id and forms the player's own household, or the screen says what money is missing, checked by a test and shown by a screenshot with the place and seed named. The owner sees it on Who you are in his own game without opening dev mode.

**Waits on.** people-leave-parents-home (open) for the engine's leave-home rule; the screen can be built against what the engine gives today.

**Files.** src/bench/card.ts, src/bench/handler.ts, src/bench/play.mjs, src/core2/modules/housing.ts

**You will see.** When you are old enough and can afford it, you can move out of your parents' home.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Notes.** Filed by the Oct 25 pool audit: people-leave-parents-home's Done when names no screen. Build the screen against what the engine gives today; when the engine side is thin, the screen says so in plain words. An engine change stays with people-leave-parents-home (needs-from in the handoff line).
