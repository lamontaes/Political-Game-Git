---
id: play-executive-picks-the-member-to-ask
title: "A mayor, county executive or governor cannot choose which member to ask to carry a bill: the engine picks the most inclined one, so a no happens in 0.2 percent of asks"
area: play
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/play-player-picks-the-member-to-ask
branch: claude/play-player-picks-the-member-to-ask
pr: #9216
standard: 2
after: play-bill-ask-no-is-kept-with-its-reason-and-date
blocked-on:
lead: screens
source: Carry thread, Nov 14, 2026 (the numbers from PR #9186) and the coordinator's ask
model: sonnet
effort: high
root: rc7-player-cannot-drive
checked: carrier thread 2026-11-14
---

**What.** A player who is a mayor, county executive or governor drafts a bill and the game asks one member for them, the one most inclined to say yes, so the player never chooses whom to approach, never meets a no, and never has a reason to build a relationship with a member. The player picks whom to ask from the body's members, the engine's pick offered as the likely yes, and the answer follows from that member's own position, so a no, and the reason read back, are met in ordinary play. The class is every executive's ask, not the example. Seen: Politics, Your office, Draft a bill, after choosing a policy, a list of the body's members with the likely yes marked.

**Cause.** Measured: in the nine pinned worlds of run "8341-pin" (draws p0 to p7 and Washington, D.C., seeds from drawPlace; Ridgeville, Alabama is p6, seed in the PR body), of 3,840 asks by 48 governors, 7 were turned down (0.2 percent), and a local mayor and two county executives were told no 0 times in 190 asks (PR #9186, words-lead/declined-bill-ask/lines.md). Found in code: `seatAsk` (src/bench/legislature.ts) calls `proposeAsExecutive` (src/core2/modules/legislature.ts, line 3614), which picks `best` by position total over the body's members and calls `askToCarry`, which already takes a named `memberId`.

**Fix.** Give `seatAsk` an optional member (a member of the body, never the executive); with none it keeps the engine's pick. Offer the body's members on the plate with the likely yes marked (the member `proposeAsExecutive` would pick, read from the same ranking, not a second one), and ask the chosen one through `askToCarry`, the one engine, so the record, the kept no with its reason and the ask-again rule all apply. Extract the ranking in `proposeAsExecutive` so the screen and the engine read one function.

**Time box.** 6 hours for one Sonnet session at high effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: members come from the body's own records. Replace, never layer: one ask engine, one ranking. No dice: the answer comes from the chosen member's recorded position. Words come from the English engine and control names; the Words lead reads any new line. No new stopgap.

**Done when.** A second session plays a mayor, a county executive and a governor, each in a named drawn place (names the place and seed), picks a member who is not the likely yes, and reads the answer; for at least one of the three a no is staged through the game's own path (an unlikely member asked), with the reason on the plate, the kept record by id, and the same member asked again later with the earlier no read back. A pinned test names the places.

**Waits on.** PR #9186 folding into the train.

**Files.** src/bench/legislature.ts, src/bench/play.mjs, src/bench/handler.ts, src/core2/modules/legislature.ts, src/bench/data/controls.json

**Notes.** Look-first, Nov 14: searched docs/pool/items and open PRs for choosing the member to ask; the neighbors are gov-carry-ask-player-decides (done), play-bill-menu-for-mayors-and-governors (merged on the train) and play-bill-ask-no-is-kept-with-its-reason-and-date (PR #9186).
