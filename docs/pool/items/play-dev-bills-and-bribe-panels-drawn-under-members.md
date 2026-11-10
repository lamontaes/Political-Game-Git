---
id: play-dev-bills-and-bribe-panels-drawn-under-members
title: "Dev mode's Bills and Bribe panels on the Government screen are drawn underneath the Members cards and cannot be read (Ten Broeck, Kentucky)"
area: play
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: claude/pool-play-dev-bills-and-bribe-panels-drawn-under-members
pr:
after:
blocked-on:
lead: play-first
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, Dev mode on the screen)
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
checked: fable 2026-11-10
claimed-at: 2026-11-10T23:23:43.038Z
---

**What.** With Dev mode on, the Government screen carries two dev panels, Bills and Bribe. Measured on screen by the Nov 9 audit in Ten Broeck, Kentucky (a helper drove the screens for five months of game time; no seed given): both panels are drawn underneath the Members cards, and their result lines show through in pieces, so neither can be read. These are the panels that introduce a bill, pass it at a margin, make the chair hear it and offer a bribe, so a tester cannot use the proving ground from the screen. Fix the class, not the one screen: every dev panel that is added to a sheet that does not scroll gets a place of its own in that sheet's layout, in the menu look, beside what it acts on, so no dev panel on any screen is drawn over or under the game's own cards.

**Cause.** Found in code: `government()` in src/bench/play.mjs (line 4459) builds the screen with `splitScreen` (line 4900), fits it so it never scrolls, and then appends the Bills section (`devBillsPanel`, line 4916) and the Bribe section (`devBribePanel`, line 4922) after it; src/bench/play.css has no rule for `.dev-bills`, `.dev-bribe` or `.dev-bills-row`, the classes those sections use (src/bench/ui/dev-bills.mjs line 202, src/bench/ui/dev-bribe.mjs). The exact style that puts them under the cards was not pinned to a line. Seen on screen in Ten Broeck, Kentucky (no seed).

**Fix.** Put each dev panel in its own place in the sheet's layout in the menu look, beside what it acts on, delete the old append, and add a browser check that fails when a `.dev-only` box overlaps a member card or runs past the sheet. Add no caption line under a control.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the two appended sections move into the Government screen's own layout and the old append is deleted in the same change, with no second copy of either panel left behind. Owner, Nov 8, 12:50 a.m., on dev mode: "It should be a fast track to prove whatever needs to be proved in the game in order to call it working." Owner, Nov 8, about 2:15 a.m., on the dev mode mocks: "remove all those subtexts", so the fix adds no caption line under a control. The night's screen ruling for dev mode: dev controls sit beside what they act on, in the menu look (`docs/coordination/night-2026-11-08/rulings-screens.md`).

**Done when.** A second session starts the bench (`npm run bench`, `/play`), leaves the Place field empty so the place is drawn, writes down the place and seed the title shows, and turns Dev mode on in Options. At 1440 by 900 it opens Government and sees the Bills panel and the Bribe panel whole: every field (Body, Sponsor, Law, Value, Margin, Executive, Override margin, Offerer, Official), every button (Introduce, Repeal, Pass, Defeat, Offer), both checkboxes and both result lines, with nothing drawn over or under a Members card. It checks this at the town's body and again at the state legislature, where the Members list is longest. It presses Introduce and then Pass and reads the whole result line. It saves a screenshot of each with the place and seed under it. It then does the same in Ten Broeck, Kentucky (the audit's place; no seed was given, so the seed drawn is written down) and sets its screenshot beside the audit's screenshot 05. A browser check (added to `src/bench/dev-mode.browser.mjs` or `src/bench/government-first-page.browser.mjs`) opens Government with Dev mode on and fails when the box of any `.dev-only` section overlaps the box of a member card or runs past the sheet. The owner plays it: with Dev mode on he opens Government and can read and press everything in Bills and Bribe.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/ui/dev-bills.mjs, src/bench/ui/dev-bribe.mjs, src/bench/ui/split-screen.mjs, src/bench/dev-mode.browser.mjs, src/bench/government-first-page.browser.mjs

**Notes.** From the Fable audit of Nov 9, 2026, Pillar 2, "Dev mode on the screen": a helper drove dev mode through the game's own screens in Ten Broeck, Kentucky, for five months of game time and took 136 screenshots; the lead checked the ones cited. The screenshot is `docs/audits/fable-vision-2026-11-09-screens/05-dev-bills-panel-drawn-under-members.jpg` on branch `audit/fable-vision`. The audit's words: "The Bills and Bribe panels cannot be read. On the Government screen they are drawn underneath the Members cards. Their result lines show through in pieces." It also says, under "Reported done", item 13: "on the screen the bribe panel cannot be read." The audit did not say at what window size the screenshot was taken or which body was open, and it named no cause in the code; the cause lines above were read on Nov 10 by the session that filed this. Related items found: `play-dev-bribe-offers-officials-with-no-vote-on-the-bill` (the same Bribe panel's list of officials), `play-dev-failed-bill-says-why` (the Bills panel's result line is the only place a committee hold is printed today), `dev-mode-bills-panel-policy-questions` (open, priority 3, the same panel), `play-stop-17-see-through-panels` (done; a different see-through fault, in the menu panels). No open item covered this defect.
