---
id: words-paper-and-journal-everyday-life-part-3-letters
title: "A letter to the editor prints from a resident's recorded view"
area: words
kind: feature
priority: 2
size: M
status: dropped
claimed-by:
pr:
after:
blocked-on:
lead: words
model: haiku
effort: low
root: rc3-thin-life-record
source: split from words-paper-and-journal-everyday-life in the pool redo, Nov 10, 2026
standard: 2
checked: fable 2026-11-10
---

**What.** Letters to the editor have bank words but none printed in a played year in Newbury, Kansas, Kannat Tabla or Rote, Pennsylvania. Let a letter print from a resident's recorded view of a law, so the paper carries real voices from the town. A letter says what that resident thinks, from their record, and nothing else.

**Cause.** Measured: does not reproduce on main d64255aa (Nov 11). Rote, Pennsylvania (4266384; seed kinds:2, `drawPlace` purpose printed-words), one played year: the newspaper printed 9 letters to the editor, all worded. One was "Letter: Anthony Robinson opposes the Right to Work Act" / "In a letter to the editor, Anthony Robinson of Rote opposes the Right to Work Act." (record printed:outlet:newspaper:0:jurisdiction_0ca54c2cd25a5742:letter:person_21dd5cdd0290d1f3:2025-08-04). A fresh draw, Hillside Colony, South Dakota (4629300, seed fresh-letters-1), printed 36, none unworded. A temporary count in `letters` (src/core2/modules/press.ts, since undone) showed each of the four tests passing some followers in Rote. Of 2,067 follower checks and 46,699 stances: 881 were last moved by this paper's own fresh story, 502 were on a law to enact or repeal, 63 had a positive score as the week's best, 37 had not written lately, and 18 named a bill or law, giving 9 letters. The desk prints each one (`runDesk`, src/core2/press-desk.ts, the letters loop), and the bench words it (`letter` in src/bench/printed-words.ts). src/bench/printed-words.test.ts already checks each printed letter's shape.

**Fix.** Nothing to build. The CTO drops the item as done by main. If a played year again prints no letters in a place with a town newspaper, file a new item from that place and seed with the same count.

**Time box.** 0.5 hours for the CTO to read this and drop the item.

**Rules.** No hand-written player text: words come from the banks. Wire to the world: the story prints from a record an engine writes, cited by record id. One rule, all 56 places: no place is named in logic. No dice: whether a resident writes follows their recorded view and the paper's stance, never a roll.

**Done when.** A second session, not the builder, plays a year in a drawn place it names and reads a letter to the editor in the paper, with the letter's record id and the resident's view record id shown; a test in src/bench/printed-words.test.ts fails when no letter prints in a year where a resident's view qualifies.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts, src/bench/printed-words.ts, src/bench/printed-words.test.ts, data/english/parts/news.json

**Notes (Fable's check, Nov 10).** Once the count names the test that removes every follower, the fix is to let a resident whose recorded view of a law differs from or agrees with the paper write a letter by the existing decision, changing only that test, without adding a roll.

Nov 11 (cause finder for Fable B): not reproduced. Letters print and are worded on main in Rote (9) and in a fresh draw, Hillside Colony, South Dakota (36). I counted the letter decision's four tests in a working copy and undid it. Each test passes some followers. I propose dropping the item as done by main.

Dropped Nov 13, 2026 (Account lead T33, CTO's Nov 12 drop rule): its own Fix section says "Nothing to build. The CTO drops the item as done by main." and its Cause says the fault does not reproduce on main. The reproduce-again advice in that Fix stays the way back: file a new item from the place and seed if it returns.
