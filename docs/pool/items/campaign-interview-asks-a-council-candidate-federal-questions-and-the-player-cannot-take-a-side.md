---
id: campaign-interview-asks-a-council-candidate-federal-questions-and-the-player-cannot-take-a-side
title: "Interviews ask a town council candidate about Medicare and D.C. statehood, and the player can only point at the rival"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: medium
root: rc7-player-cannot-drive
source: "Account lead T25 playtest, Nov 13, 2026 (Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train c39bbb71)"
checked:
claimed-at:
---

**What.** A national cable reporter interviews a candidate for the Danville City Council: 'Would you vote to let Medicare negotiate drug prices?', a higher federal minimum wage, statehood for D.C., and a ban on stock trading by members of Congress. For every question, in two interviews and a TV debate, the player's only replies are '{rival} is for it. Ask them why.', 'My platform doesn't cover it' and 'Nothing to add on that'. The player cannot say for or against. Seen: the interview talks of Oct 7 and Oct 14, 2025 and the KGZU-TV debate of Oct 28, 2025.

**Cause.** Found in code: interviewQuestions in src/core2/modules/press.ts (line 1511) scores the whole PLATFORM_QUESTIONS list for every race, not the questions the seat's own body decides (the rule laws-filing-positions-are-the-seats-own-issues gave the filing panel). The replies come from the interview-question-answer-turn pieces in data/english/parts/conversation.json, which need stance-for or stance-against. The player who filed through the clerk's talk has no stated position (statedPosition reads 'no-stand'), so only the rival and decline replies are offered. Measured: Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train branch c39bbb71 (Account lead T25, Nov 13, 2026).

**Fix.** Ask an interview's and a debate's questions only from the seat's own issues, read the same way the filing positions are. Let the player answer each question for or against from their own view, and record that answer as their stated position, which later questions and the press then read. The answer lines already in the bank (stance-for, stance-against) are used; no new words are needed.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** This is a game, not a spreadsheet: the player speaks for themselves. An effect is a read: the stated position is read by the campaign engine and the press.

**Done when.** A second session runs for a town seat on main in a drawn place, named with its seed, accepts an interview, is asked only questions that body decides, answers one for and one against, and a later debate on the same question offers the player their own side.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts, src/core2/campaign-views.ts, data/english/parts/conversation.json
