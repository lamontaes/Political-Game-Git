---
id: play-six-list-and-detail-screens-build-their-own
title: "Six list-beside-detail screens each build their own layout, the old framed plate is still called 8 times beside 47 strip sections, and Campaign builds its own tab strip"
area: play
kind: cleanup
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on: play-six-list-and-detail-screens-build-their-own-part-1-journal-patch-notes, play-six-list-and-detail-screens-build-their-own-part-2-calendar-people, play-six-list-and-detail-screens-build-their-own-part-3-travel-guide, play-six-list-and-detail-screens-build-their-own-part-4-replace-plate-calls, play-six-list-and-detail-screens-build-their-own-part-5-one-tab-strip-guard
standard: 2
model: sonnet
effort: low
root: rc10-screens-keep-own-facts
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, "Duplicate systems worth merging", item 5, and Pillar 6)
checked: fable 2026-11-10
---

**What.** The audit found by reading code on Nov 9 that six list-beside-detail screens (Patch notes, Journal, Calendar, People, Travel and the Guide) never call the shared list-and-detail part, that the play screen still calls the older framed plate 8 times beside the newer strip section 47 times, and that the campaign screen builds its own tab strip. The owner's rule is one screen renderer per menu type, and a second one is a duplicate to delete. Fix the class with no change to what a player can do: one list-beside-detail part that every such screen calls, one section part, one tab strip, and the others deleted. The work is split into five parts; this item is done when all five are and the guard holds. Seen: the Journal, patch notes, Calendar, People, Travel and Guide screens, all in the one approved list look with the rejected framed plate gone.

**Cause.** Found in code: `rosterScreen` in src/bench/ui/roster-screen.mjs is called only by Campaign, Elections, Parties and Issues, and `splitScreen` only by Government, in src/bench/play.mjs; the six screens build their own with `patchNotesScreen` and `journalScreen` (src/bench/ui/strips.mjs, lines 365 and 423), src/bench/ui/calendar.mjs, `peopleScreen` (src/bench/ui/people-screen.mjs), `travelScreen` (src/bench/ui/travel-screen.mjs) and `guideScreen` (src/bench/ui/guide-screen.mjs); `plate(` is called 8 times in play.mjs; `debateCard` in src/bench/ui/campaign-acts.mjs (line 15) builds its own tab nav beside `tabBar` in src/bench/ui/tab.mjs. A search of the code on Nov 10, not run in the game.

**Fix.** Move the six screens onto `rosterScreen` (the one list-beside-detail part; `splitScreen` is the two-column layout Government uses and is not a second list part, which the first part's builder confirms), one section part and the shared `tabBar`, delete the old builders, styles and the `plate(` calls in the same changes, and add a guard that fails on a second such part. It ships as the five parts named in Waits on, one screen family per pull request.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: each screen moved onto the shared part loses its own builder, styles and browser-check selectors in the same change, and the PR body counts what was removed. One engine per mechanic: there is one screen renderer per menu type, and a second one is a duplicate to delete (owner, Oct 27, AGENTS.md). Owner, Nov 8 (OWNER-DECISIONS): a long list is a list beside its detail, with no arrows and no "1 of N". Read `.agents/skills/slim-down/SKILL.md` and `.agents/skills/screen-to-mock/SKILL.md` first.

**Done when.** A second session (not the builder) starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named) and takes a screenshot at 1440x900 of each of the six screens with one row chosen (Patch notes from the title, Journal, Calendar, People, Travel, the Guide) plus Campaign's debate card, each set beside a screenshot of the same screen on the commit before the five parts: same rows, same detail, same words, and every row opens its detail on a click. A search finds `plate(` nowhere in src/bench/play.mjs, no hand-built tab nav outside src/bench/ui/tab.mjs, and the six screens calling one list-and-detail part; the guard test fails when a second such part is added.

**Waits on.** The five parts: play-six-list-and-detail-screens-build-their-own-part-1-journal-patch-notes, play-six-list-and-detail-screens-build-their-own-part-2-calendar-people, play-six-list-and-detail-screens-build-their-own-part-3-travel-guide, play-six-list-and-detail-screens-build-their-own-part-4-replace-plate-calls, play-six-list-and-detail-screens-build-their-own-part-5-one-tab-strip-guard; the part that removes the `plate(` calls also waits on play-timeline-still-drawn-on-your-life-and-the-person-card, which deletes two of them.

**Files.** src/bench/ui/roster-screen.mjs, src/bench/ui/split-screen.mjs, src/bench/ui/strips.mjs, src/bench/ui/plate.mjs, src/bench/ui/campaign-acts.mjs, src/bench/ui/tab.mjs, src/bench/ui/calendar.mjs, src/bench/ui/people-screen.mjs, src/bench/ui/travel-screen.mjs, src/bench/ui/guide-screen.mjs, src/bench/play.mjs, src/bench/play.css

**Notes.** From the audit's "Duplicate systems" item 5 ("I checked each item below in the code myself") and Pillar 6 ("One renderer per menu type is not met (read)... The stylesheet carries the older framed-plate look under the newer strips look"). The third kind of tab strip, read here: the sheet's own tabs are built with `makeTab` straight into `#sheet-tabs` in `openSheet` (`play.mjs`, about line 5215). The 8 `plate(` calls are at lines 883, 1004, 3065, 3408, 3441, 3450, 3925 and 4879 of `play.mjs` on Nov 10; two of them (3441 and 3450) hold the timeline that play-timeline-still-drawn-on-your-life-and-the-person-card (filed Nov 10) deletes, so build after that item or take its lines with it. This is one M item because the shared part comes first; if moving all six does not fit the time box, land the shared part with the first two screens, set the item back to open with the list of screens left, and say so in one line. Size it as an L and split it if the CTO prefers one screen per PR (owner, Oct 27: each finished unit ships on its own). Read `.agents/skills/slim-down/SKILL.md` and `.agents/skills/screen-to-mock/SKILL.md` first. Related, filed Nov 10: play-one-person-shows-two-faces (one face part and one person card). Not verified by the audit: nothing here was checked in the running game; the counts are a search of the code.
