---
id: words-traits-middle-reads-as-a-sentence
title: 'Who you are describes each trait in words and never prints "Neither, much" three times'
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: words/traits-middle
pr:
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: words
milestone: play-first
claimed-at: 2026-10-27T21:42:15.148Z
---

**What.** Who you are lists the player's traits as "Deliberation: Neither, much", "Keeping commitments: Neither, much", "Risk: Neither, much", "Sociability: Reserved" and "Handling disagreement: Confrontational". A trait in the middle prints the same two words each time, and none of it reads as a description of a person. The owner: "traits neither much keeping commitments neither much those aren't traits social ability risk neither much why is this delineated right and look okay." The ruling is that traits and views are in words. The label "Neither, much" is a typed constant (BALANCED_TRAIT in src/core2/people-trait-definitions.ts). This item has the English engine describe a middling trait as a tendency in a phrase a person could say, or leaves it out, and keeps the layout of the character screen.

**Rules.** Serves LAW.md §2, People in rooms and figures and LAW.md §1, Screens and menus ("Who you are is a character screen ... traits and views in words," OD:248; the mock shows traits as round icons, then household, school, job, views). No hand-written player text: the words come from the English engine. This is a game, not a spreadsheet. Replace, never layer: the typed label is replaced, not kept for the middle case.

**Done when.** In a drawn place, Who you are for a player with at least two middling traits shows no "Neither, much" and no two traits share a phrase, each trait line reads as a phrase a person could say about someone, and a test over the Who you are packet fails on "Neither" and on repeated phrases, shown by a screenshot of the traits at 1440x900 with the place and seed named.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Your traits read as short descriptions of you, and a middling trait says something about you or is left out.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/core2/people-trait-definitions.ts, src/bench/card.ts, src/bench/play.mjs, src/bench/data/controls.json

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "traits neither much keeping commitments neither much those aren't traits." The constant lives in a core2 file; the item edits only its label use and flags a needs-from line if the core's traits lead owns the change. Lead: words (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).

Done on main by 31b113c0c6 (Oct 27, 20:21): Who you are shows a person sketch in sentences in place of the trait list, and a middling trait is not said, so "Neither, much" no longer reaches the screen. The words lead's PR #6416 (the list reworded) was closed as superseded, Oct 28.
