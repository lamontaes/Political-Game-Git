---
id: play-meeting-panel-number-speakers-and-people
title: "At a meeting an ordinance's number reads as a date, the speakers read as votes, and the panel covers the people in the room"
area: play
kind: bug
priority: 1
size: S
status: merged
standard: 2
claimed-by: claude/fable-b-meeting-says-who-spoke
pr: #8848
after:
blocked-on:
lead: screens
model: fable
effort: low
root: rc10-screens-keep-own-facts
source: the owner, Nov 11, 2026, on a picture of the council meeting from the lead's play walk (Lino Lakes, Minnesota, seed 046d2235-27df-4daa-a680-423d6f24d0d7)
checked:
claimed-at: 2026-11-11
merged-at: 2026-11-11T17:34:55.800Z
---

**What.** The owner looked at the council meeting on Nov 11 and said three things. "Don't let dates go 2025-8 like how they are in the council member thing. Like, have August 2025 or something." Under each ordinance's name the panel printed its bare number, "2025-8", which reads as a date. "I don't like the names just in a list like that. Against, it looks like against is a name every time." After a vote the panel printed each person who spoke with the word Against after their name, beside the tally, so six residents read as six votes on a five-member council. "During scenes and menus and stuff, you need to check and see what to do about the people. Like, you see the here, it's being covered up by the menu." The strip of people along the foot of the room ran under the meeting panel, and two of the four were hidden behind it. Seen: the meeting panel and the desk panel at 1440x900, where the number reads "Ordinance 2025-8", the speakers stand under "Spoke for" and "Spoke against" with a count, and nobody in the room is half covered.

**Cause.** Found in code: `billItem` in src/bench/office.ts (line 94) handed the panel `bill.number` bare, though the English engine words a number as a clerk reads it (`spokenDesignation`, src/english/bill-names.ts). `meetingItem` in src/bench/ui/meeting-item.mjs joined each remark as name, a dot and the control name For or Against, with no label that these people spoke. `#here` in src/bench/play.css is hidden for a talk, a menu and the front screens, but the side panels `#meeting` and `#desk` were not in that rule or any other, so the strip ran under them.

**Fix.**

1. src/bench/office.ts: the item's number goes through `spokenDesignation(bill.number, bill.form.kind)`. A test holds that it is never a bare year and number.
2. src/bench/ui/meeting-item.mjs: the speakers are two labeled lines, "Spoke for" and "Spoke against" (control names in src/bench/data/controls.json), each with its count and the names after it, apart from the vote.
3. src/bench/play.css: while a side panel is open the strip stands in the room the panel leaves, with three people at a smaller size and no label; the others are the faces on the panel. A bill read there takes the whole frame, and the strip is hidden as for a menu.
4. The rule goes into the skill `player-screen-text`: a bill's number is never shown bare, and a date is always in words.

**Time box.** 2 hours for the lead. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: the two new labels are control names in the controls file. Replace, never layer: the old line of names is removed, not kept beside the new ones. One rule, all 56 places: the walk draws its place and names it with its seed.

**Done when.** A second session, in the running game on main at 1440x900, steps in as a member of a local body in a drawn place it writes down with its seed and plays to a meeting. Under each item's name the number carries its word ("Ordinance 2025-6", "Resolution 2025-2"). After a vote, the people who spoke are under "Spoke for" or "Spoke against" with a count, and no name is followed by a vote word. With the panel open, every person shown at the foot of the room is whole and none is under the panel; with a bill open from the panel, the strip is gone. The test src/bench/office-bill-title.test.ts passes.

**Waits on.** Nothing.

**Files.** src/bench/office.ts, src/bench/ui/meeting-item.mjs, src/bench/data/controls.json, src/bench/play.css, src/bench/office-bill-title.test.ts

**Notes.** Built by the lead (Fable B), Nov 11, 2026, the hour the owner said it. Not in this item, and each needs its own: other screens still print a bill's bare number (the deals title, the desk's title and the seat's result line in src/bench/play.mjs, and the Bills list's aside); the people strip beside the other side panels (election day, the returns, the ballot) and during scenes was not walked; a quick second press of Yes at a meeting raises "That item is not waiting on this agenda." as a page error; and `billItem` fills in every speaker from the counts each time the panel is drawn (`personOrFillIn`), which makes facts from a screen read.
