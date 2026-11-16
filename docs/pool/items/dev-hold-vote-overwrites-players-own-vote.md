---
id: dev-hold-vote-overwrites-players-own-vote
title: "Dev mode's Hold the vote re-casts the player's own vote, so a No the player pressed comes out yes"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: vote-reasons thread, bench walk at Island Pond, Vermont, Nov 16; Account lead, Nov 16 03:13Z ("dev mode must not overwrite a press the player made; it is a dev fault, still a fault")
---

**What.** On the bench at Island Pond, Vermont (placeKey 5035725, seed 9144879383429625b93eb5778cf3109a49d7099a0c4451554962a94f2fefaaf0), the player stepped in as Andrew Hoffman, Essex County commissioner (person_cc732b3431b9c78b). The player pressed No on the bill paper of Ordinance 2025-1 (bill:office:gus2025:114394:board:2025-01-20:person_9811f6d690b8e604:8), and the paper showed No chosen. Then the dev card's Hold the vote was pressed at its first margin, "Passes by 5". The roll recorded the player's vote as yes (vote:…:person_cc732b3431b9c78b, vote "yes"), and the reporter's call next day said "You voted for Ordinance 2025-1". With no dev press, the same life's sitting counted the player's No (enacted 5 to 2, voted-no on the call).
Seen: walk logs in /mnt/project-files/vote-reasons/dev-reply-why/ (walk-log.md is the run without the dev press).

**Cause.** Found in code: `decideAt` in src/bench/dev-mode.ts (line 1085) treats every member not named in `votes` as free (`free = roster.filter((term) => !named[memberKey(term)])`) and casts each free member yes or no by index to fill the margin through `castMemberVote`. That overwrites the choices row `${billId}|${player}` the player's own press wrote (`chooseOwnVote` in src/bench/bill-stage.ts). The dev card's Hold the vote (src/bench/ui/dev-bill-card.mjs, `decide({})`) sends no `votes`, so the player is always free.

**Fix.** In `decideAt`, a member whose choices row already holds a vote cast by their own press counts as named with that vote: it stays as cast, and the margin fills only the members with no choice. The dev card says nothing new; the tally it returns already counts named votes.

**Time box.** 1 hour, one Sonnet session at medium.

**Rules.** Every effect can be triggered and traced in dev mode (owner, Nov 14), and dev mode's own control never overwrites a choice the player pressed (Account lead, Nov 16). Ask why: the test reads the roll's vote record for the player by id.

**Done when.** A test in a played world built by `buildBenchWorld` at the pinned place Island Pond, Vermont (5035725) has the player choose No with `chooseOwnVote` on a colleague's bill, then calls `decideAt` with margin 5, and the player's vote record on the roll is no, while the other members fill the margin. A second session presses No on a bill paper and then the dev card's Hold the vote in the running game, and sees the player's own vote stay No on the bill's dev card and in the reporter's call.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/bench/ui/dev-bill-card.mjs, src/bench/bill-stage.ts

**Notes.**
