---
id: play-stop-30-creator-age-line-says-what-it-is
title: "The creator's age line says it is your age on the day the game starts"
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by: play-first/play-stop-30-creator-age-line-says-what-it-is
pr: #6242
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T06:18:39.756Z
---

**What.** Under the birthday the creator prints a bare line, "35 · January 20, 2025", and a player cannot tell what the two numbers are. The owner: "it says 35, January 20th, 2025. Is that your age? ... It doesn't tell you that it starts on January 2025. It needs to explain that a little bit." This item makes the line say, in words, the age the character will be on the day the life begins and that day's date, and sets it in the row with the birthday instead of floating under it. The words are control names from controls.json, not new prose.

**Rules.** Serves LAW.md §1, Screens and menus and LAW.md §8, Dev-speak (nothing on a player screen reads as a record). No hand-written player text: the label is a control name in src/bench/data/controls.json, read by the page. This is a game, not a spreadsheet.

**Done when.** In the creator in a drawn place, with a birthday that makes the character 35 on the start date and again at the default birthday, a browser check reads the element data-testid creator-derived-age and finds a label that contains the word for age, the start date in words, and a word saying that is when the life begins; no bare "35 · date" remains anywhere in the creator, shown by a screenshot of both cases at 1440x900.

**Time box.** 1 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The line under the birthday reads like "Age 35 when your life begins on January 20, 2025", so you know what the numbers mean.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/play.html, src/bench/data/controls.json, src/bench/creator-fields.browser.mjs

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "It doesn't tell you that it starts on January 2025. It needs to explain that a little bit." New owner instruction in playtest; CTO to record in OWNER-DECISIONS.md. The page opened on the default birthday August 6, 1954 (age 70); the owner set 1989 so the character could run for office; no ruling on the default was asked. Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
