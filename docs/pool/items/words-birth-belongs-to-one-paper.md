---
id: words-birth-belongs-to-one-paper
title: "A birth is printed by every outlet the wire reaches, radio and television among them, instead of one paper"
area: words
kind: bug
priority: 3
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
source: Words lead, Nov 16, read of #9726 at 6abef46a
---

**What.** A state lawmaker's new child is carried by eleven outlets on one day, four papers and seven radio and television stations, in two wordings. A birth notice belongs to one paper, the one that keeps the births column. The rest of the outlets should not run it at all.
Seen: Baldwinville, Massachusetts, seed 502259e66d651f5a88b2ad4626a91b6a9fa572c6, Eden Howard's birth on November 24, 2025, in every local outlet.

**Cause.** Found in code: src/core2/press-desk.ts prints a wire item at every outlet that picks it, and `wireItem` (src/core2/press-topics.ts) gives a birth the level of a parent's office, so every outlet that covers the state takes it. Nothing says that a birth is a paper's notice and not a station's story.

**Fix.** In the press desk's pick, a `person-birth` wire item is taken by one outlet only: the place's paper of record (`townOutlet`, the paper that carries the public record), and by no radio or television outlet. The player sees one birth notice, in the paper.

**Time box.** 1 hour, one Sonnet session at medium effort.

**Rules.** Ask why: every outlet that runs a birth says why by its record, and only the paper of record has one.

**Done when.** In a drawn place with a seed nobody chose, a played year prints each birth in one paper and no station, counted by outlet, and a second session sees one notice in News in the running game.

**Waits on.** Nothing.

**Files.** src/core2/press-desk.ts, src/core2/press-topics.ts
