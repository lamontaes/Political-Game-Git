---
id: scandal-call-relative-elsewhere-opener
title: "A reporter's call about a conflict where the firm belongs to a relative who lives elsewhere has its own opener"
area: words
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: scandal-call-says-what-the-paper-found
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Reporter's-call builder, Nov 15, from the Account lead's ruling (10:53Z) on #9482
---

**What.** When a paper exposes a conflict where the firm belongs to a relative of the official who does not live with them, the reporter's call has no opening line, so the call does not play and the story prints with no comment. Seen: in a played world where an official votes an award to a firm their sibling or grown child owns in another household, the reporter calls and says whose firm it is.

**Cause.** Found in code: data/english/parts/scene-talk.json no longer holds the opener (#9482 deleted it: "We're running a story that {contract} went to {firm}, and {relative} owns {firm}. What's your side?"), because no such pair exists in an opening world. Checked at Gilbert IA 1930630 (reporters-call-1 and -2), Alva OK 4001800 and Oakhurst OK 4053350: every firm owner's relatives outside the home are not filled in (`core.people` has no record of them), so none can hold office. The case comes only once a relative moves into a home of their own in town.

**Fix.** Once the game makes such a pair (a filled-in relative in office in another household, after a move), the Words lead writes the opener again. It is shown in a played world through the game's own path: the award in the contracts table and the paper's weekly desk.

**Time box.** 1 hour, one Opus session at medium.

**Rules.** No hand-made exposure record: the pair comes from the game's own moves.

**Done when.** A second session plays such a call at a named place and seed, and the printed story follows it.

**Waits on.** A world where an official's relative in another household in town owns a firm.

**Files.** data/english/parts/scene-talk.json, src/director/scandal-call-printed.test.ts

**Notes.**
