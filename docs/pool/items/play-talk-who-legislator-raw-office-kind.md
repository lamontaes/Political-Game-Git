---
id: play-talk-who-legislator-raw-office-kind
title: "The talk box says a legislator colleague is 'legislature-lower at Indiana treasury.'"
lead: play-first
area: play
kind: bug
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** When the player, as a state representative, talks with another member, the talk box's who line (card.ts, talk-who.work.title) reads 'legislature-lower at Florida treasury.': the job title is the office's raw kind and the employer is the state's treasury organization the payroll runs through. Seen on Oct 27 in the bench's Advanced start as Adam Williamson (Fort Pierce South, Florida, seed f40b8d6c2e7193a5) and Allen Lynch (Grayford, Indiana, seed 7a1c3e9d0b4f2a68), with every colleague of the House. A player reads a record kind and a payroll account where a person would say 'a state representative' or 'serves with you in the House'.

**Rules.** This is a game, not a spreadsheet: the line says who the person is to the player in plain words from the office record, never a record kind or a payroll organization. One rule, all 56 places: every chamber's members are named by their office's own title.

**Done when.** In a buildBenchWorld drawn place with a seed named in the PR body, the talk box for a member of the player's chamber names their office by its title and no raw office kind or treasury, a test reads the who line for every chamber member and fails on a raw kind, and a bench screenshot at 1440x900 shows it.

**Files.** src/bench/card.ts, data/english/parts

**Notes.** Found Oct 27 by the laws-and-effects lead while taking the ask-before-the-roll screenshots (docs/play-first/shots-27/ask-before-the-roll-after-ask.png).

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): twin of `screens-talk-who-in-a-sentence`; close into it and carry any line it lacks there. (verify the legislator case)
