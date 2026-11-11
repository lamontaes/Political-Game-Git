---
id: elections-contested-count-record
title: "A close race recounts by its own state's rule, and a candidate can ask for one where the law allows"
area: elections
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-elections-contested-count-record
pr: #8573
after:
blocked-on:
model: opus
effort: high
root: rc9-place-facts-one-default
source: "Helper B, Oct 27, episode docs/design/scenes/from-life/concession-call-received.md"
lead: laws
claimed-at: 2026-11-11T04:39:38.658Z
checked: fable 2026-11-10
branch: claude/pool-elections-contested-count-record
---

**What.** Today a close race is counted once and that is the end of it: the elections engine keeps no record of a recount, so a loser who says he will not concede yet has nothing to wait for. The owner ruled on Nov 10, 2026: "Recount by own states rules." Build the simple version. Each state's own rule is one row of data: the margin under which a recount is automatic, whether a trailing candidate may ask for one and inside what margin, and how many days it takes. When a race's count ends inside the automatic margin, a recount record opens by itself. Where the law lets a candidate ask, the trailing candidate decides, and the player is offered that choice on election night when it is his own race. The recount runs the same count again and confirms it, the result is certified when the recount ends, and the paper and the election night scene say a recount is on. Court challenges to a count are not part of this item; they are `elections-count-challenge-in-court`, after early access. Seen: election night after the player's own close race, where a recount is called or he may ask for one, the paper's story that a recount is on, and the certified result that cites it.

**Cause.** Found in code: every race's count is kept by one function, `keepCount` in src/core2/modules/voting.ts (line 3770), which records the result and its `takesOffice` day; neither it nor src/core2/modules/elections.ts keeps a recount record, and data/research/elections has no recount-rule file. The episode is docs/design/scenes/from-life/concession-call-received.md. The owner's ruling of Nov 10, 2026 sets the size: recounts by each state's own rule now, courts after early access.

**Fix.** First, the table: research each of the 56 places' recount rule into data/research/elections/recount-rules-2026.json (the researcher skill; fetched pages with a quote), one row a place with the automatic margin if the place has one, whether a candidate may ask and inside what margin, and the days allowed. A place whose rule cannot be read starts from the most common rule, marked ESTIMATED with its source. Then change `keepCount` in src/core2/modules/voting.ts, the one place a race's count is kept, so that a count inside the place's automatic margin opens a recount record on the result, and a count inside the ask-for margin opens one when the trailing candidate decides to ask: a candidate the world runs decides from their own traits and the margin, and the player is offered the choice. The recount runs the same count again through the same function and confirms it, and the result is certified on the day the recount ends; the winner is still seated by the existing `seat-winner` calendar entry, never earlier than that day. Register one stand-in in the elections family file under src/core2/data/stopgaps/: a recount always confirms the first count, because the game records no miscounted ballot. Add no second count path and no new scheduler. The election night scene and the paper read the recount record by its id; the lines themselves are the words writer's to write, so list the pieces the scene needs on the pull request.

**Time box.** 8 hours for one Opus session: about 3 for the table and 5 for the record, the choice and the readers. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: a recount opens from the margin and the law in force, and a candidate's request follows their own traits, never a percentage. One rule, all 56 places: the recount rule is data per place and no place is named in logic. One engine per mechanic: the recount runs through `keepCount`, the one count, never a second one. Research before building: each rule comes from a fetched page with a quote. This is a game, not a spreadsheet: the player gets one choice on election night, not a filing to complete. Speed: a recount runs only after a close race, so no day's work grows.

**Done when.** A second session, not the builder, starts the bench (`npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, writes down the place and seed, and with dev mode plays to an election whose margin it sets inside the place's recount margin (dev mode's hold-vote route or a test world built with `buildBenchWorld`). It sees a recount record on the result by record id, the paper's story that a recount is on, the certified result citing the recount, and the winner seated no earlier than the day it ends. In a place where the law lets a candidate ask, it plays the player's own close loss and is offered the choice to ask. A test fails when a count inside the automatic margin opens no recount record.

**Waits on.** Nothing. The table is this item's first step.

**Files.** src/core2/modules/voting.ts (`keepCount`, line 3770; the `seat-winner` calendar entry near line 5348), data/research/elections/recount-rules-2026.json (new), src/core2/data/stopgaps/ (the elections family file), src/director/ (the election night scene's cause), src/bench/ (the choice on election night)

**Notes.** Found while building words-scene-concession-received; the not-yet-conceding replies end in the strained-tie label only.

**Notes (Fable B, Nov 10, the owner's answer).** Owner, Nov 10, 2026, about 7:16 p.m.: "Recount by own states rules. You need a 2000 to be able to happen. And sure, yeah, court after early access." This item was rewritten to the simple version that day; the court fight over a count is `elections-count-challenge-in-court`.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 04:39 UTC) on branch claude/pool-elections-contested-count-record.
