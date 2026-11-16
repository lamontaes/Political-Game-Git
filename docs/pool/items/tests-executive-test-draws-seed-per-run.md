---
id: tests-executive-test-draws-seed-per-run
title: "executive.test.ts draws a new seed every run, so its play-stop-20 case is red at Merizo, Guam by draw"
area: core
lead: effects
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: none
source: "Account lead, Nov 16 00:32Z, gating #9598"
checked:
---

**What.** src/core2/executive.test.ts picks its places from a seed made from the clock, so every run plays different towns and a red cannot be repeated or called known. Seed 76b75f3aed5b787bee284633f88dcf45530c72069917b4f7da96a2a7512cb46d draws Merizo, Guam (council-manager), where the case "weighs only residents who have turned 18 by their birthday" finds no one weighed for police chief, city manager or public works (expected 0 to be greater than 0), the same on the Train at ef70819622c9bc399e73c39e928c226e1f35afee and on #9598. Seen: the merge gate's executive test goes red or green by the minute it runs, so a real fault in who is weighed for a town's department heads can pass unseen.

**Cause.** Found in code: src/core2/executive.test.ts lines 38 to 40, `const seed = process.env.GOLDEN_PATH_SEED ?? createHash("sha256").update(`executive:${Date.now()}`)`, and every case's `world(all, salt)` draws its place from that seed; the play-stop-20 case then searches up to twelve draws. Why Merizo's three posts weigh no candidate is not yet traced (`headCandidates` in src/core2/modules/executive.ts).

**Fix.** Pin the file's seed as a constant named with the places it draws (skill pinned-tests), chosen by a script outside the test so that the play-stop-20 case has its 17-year-old resident in the first draw, and drop the twelve-draw search. Trace Merizo's empty `headCandidates` with the named seed; if it is a fault in who is weighed in a council-manager territory town, it is a second item, filed with its record ids.

**Time box.** 2 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the pinned seed is chosen from draws of all 56, never a hand-picked state, and the place and seed are named in the test.

**Done when.** A second session runs src/core2/executive.test.ts twice on the pinned seed and sees the same drawn place, the same results both times and the play-stop-20 case green with its resident's id, and runs seed 76b75f3aed5b787bee284633f88dcf45530c72069917b4f7da96a2a7512cb46d (Merizo, Guam) with the cause of its empty candidate list written in this item.

**Waits on.** Nothing.

**Files.** src/core2/executive.test.ts, src/core2/modules/executive.ts
