---
id: words-paper-and-journal-everyday-life-part-3-letters
title: "A letter to the editor prints from a resident's recorded view"
area: words
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: rc3-thin-life-record
source: split from words-paper-and-journal-everyday-life in the pool redo, Nov 10, 2026
standard: 2
checked: fable 2026-11-10
---

**What.** Letters to the editor have bank words but none printed in a played year in Newbury, Kansas, Kannat Tabla or Rote, Pennsylvania. Let a letter print from a resident's recorded view of a law, so the paper carries real voices from the town. A letter says what that resident thinks, from their record, and nothing else.

**Cause.** Needs cause. Looked at: the letter decision in src/core2/modules/press.ts (`LETTER_DECISION`, line 3055; the loop at lines 3251 to 3275). A follower writes only when all four hold: they live in the town; a stance of theirs was last moved by that paper's own story within the fresh window; the stance is on a policy with a wish to enact or repeal (not a budget line); and the trait score of writing over keeping quiet, pushed by the stance's strength over the bar, is above zero. No letter printed in a played year in Newbury, Kansas, Kannat Tabla or Rote, Pennsylvania (Lane 3, Nov 4). Not yet known: which of the four tests removes every follower. To find it, count in one played year (Rote, Pennsylvania, seed kinds:2, drawPlace purpose printed-words) how many followers pass each test in turn.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: words come from the banks. Wire to the world: the story prints from a record an engine writes, cited by record id. One rule, all 56 places: no place is named in logic. No dice: whether a resident writes follows their recorded view and the paper's stance, never a roll.

**Done when.** A second session, not the builder, plays a year in a drawn place it names and reads a letter to the editor in the paper, with the letter's record id and the resident's view record id shown; a test in src/bench/printed-words.test.ts fails when no letter prints in a year where a resident's view qualifies.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts, src/bench/printed-words.ts, src/bench/printed-words.test.ts, data/english/parts/news.json

**Notes (Fable's check, Nov 10).** **Notes (Fable's check, Nov 10).** Once the count names the test that removes every follower, the fix is to let a resident whose recorded view of a law differs from or agrees with the paper write a letter by the existing decision, changing only that test, without adding a roll.
