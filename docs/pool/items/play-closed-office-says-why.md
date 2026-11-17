---
id: play-closed-office-says-why
title: 'Every office the player cannot run for says only "You can''t run for this office", never why or where to run instead'
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by: claude/blockers-closed-office-why
pr:
after:
blocked-on:
lead: screens
model: fable
effort: medium
root: rc10-screens-keep-own-facts
source: owner's play of v0.112.0, Nov 16, 2026 ("I can't run for anything"), crew list issue 9747 item 3a ("closed offices show why")
checked:
---

**What.** On a new player's Elections page, every office the player cannot run for says only "You can't run for this office." The owner read that as being unable to run for anything. The page never says why the office is closed or which offices are the player's to run for instead.
Seen: Beesleys Point, New Jersey (seed 1c0c38ab-cccf-45f2-943d-b108847e2981), five county offices each with that one line on day one.

**Cause.** Found in code: src/core2/modules/elections.ts `playerFilingBar` returns one reason, `not-your-office`, for two causes of the owner's Oct 29 rule (an office no player runs for, and an office that is the player's only where the home has none of its own), and nothing tells the page which offices are the player's instead.

**Fix.**

1. `notYourOfficeWhy` beside the rule names the cause and the home's own offices the player runs for instead.
2. The page's race carries it (`barWhy` in src/bench/government.ts) and the screen says Story's line for the cause, filled with the office and those offices.
3. Story writes the two lines (`localRaces.refusalWhy`).

**Time box.** 2 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: the lines are Story's, filled only with record titles.

**Done when.** A second session starts a new life in a drawn place it writes down with its seed, opens Elections and clicks an office the player cannot run for: the line says why and names the offices the player runs for instead.

**Waits on.** Story's two lines under `localRaces.refusalWhy`.

**Files.** src/core2/modules/elections.ts, src/bench/government.ts, src/bench/play.mjs, src/bench/closed-office-why.test.ts (new)

**Notes.** Filed and built by the Blockers lane, Nov 17. Replaces the plan in #9744 for this road.
