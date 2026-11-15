---
id: words-story-lines-name-the-outlet-kind-the-record-holds
title: "Lines about a story say the paper even when it ran on television or radio"
area: words
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: words-paper-reader-accusation-gives-the-record-reason
blocked-on:
lead: words
model: opus
effort: medium
root: design-life-record
source: Found by the short-replies builder playing the paper's bribe accusation at Adams MA, Willamina OR and Kenesaw NE, Nov 15, 2026; the Account lead asked for the whole class
---

**What.** A scene caused by a story (a reader of the story, a press story naming the player, a finding the press exposed) says "the paper" and "printed" whatever the outlet was. Three of three walks named the wrong medium: Adams MA (a television story), Willamina OR (radio) and Kenesaw NE (television). Seen: in the accusation after a taken bribe reached the press, "{name} has the paper folded in one hand", "It's about what the paper printed" and "Then I'll believe what the paper printed".

**Cause.** Found in code: `src/director/purpose-scene.ts` sets `outlet` (the outlet's name) from the story's `outletId` but no fact for the outlet's kind. `src/core2/modules/press.ts` keeps the kind on the outlet row (`LocalKind` newspaper, television, radio; `NationalKind` cable, magazine, online, national-paper). The bank's medium-naming pieces need no fact. In the `bribe-reported` key alone, 9 pieces name the paper, printing or a story that "ran".

**Fix.** Where purpose-scene names a story's outlet (the `news.read` story block and the press-story block, and `press.exposed` when the reporter's-call path reads it), it also sets `outlet-print` (newspaper, magazine, national-paper, online) or `outlet-broadcast` (television, radio, cable), read from the outlet row. Every piece that names a medium on a story-caused key requires the matching fact. A broadcast sibling is listed for Story to write, and lines with no medium stay as they are. A placement check (the `data/english/placement-checks.json` family from #9357) counts medium-naming pieces with neither fact. The count may only fall.

**Time box.** 2 hours, Opus.

**Rules.** An effect is a read: the outlet row's kind is read where the words are picked. No hand-written player text in code. Lines judged by M5, never by the builder.

**Done when.** In the played world at Adams MA (seed f54fcb0fe1c46cd2:2) and one place drawn from all 56 (named with its seed), a taken bribe reaches a television or radio outlet. The reader's talk never says paper or printed, and a newspaper story still does. The placement count for medium-naming pieces with no outlet fact is 0 on story-caused keys. A second session sees it in the running game.

**Waits on.** #9357 (placement checks file) for the count; the build itself can start.

**Files.** src/director/purpose-scene.ts, data/english/parts/scene-talk.json, data/english/placement-checks.json (new), src/english/placement-checks.ts (new)

**Notes.** Filed by hand on the conflict-accuse follow-up branch, Nov 15.
