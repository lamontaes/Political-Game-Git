---
id: core-speech-heard-occasion
title: "A heard speech says what it was given at (campaign, meeting remark, hearing)"
area: core
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: low
root: design-life-record
lead: words
source: added with npm run pool -- add
claimed-at:
---

**What.** The item's title is the whole request: a heard speech says what it was given at (campaign, meeting remark, hearing). Every section of the original draft said TODO, so nobody has said who reads the occasion, which record carries it, or what changes for the player when it is there. src/core2/modules/speech.ts and src/core2/modules/news.ts carry no occasion field today, and docs/design/life-record.md does not mention speeches heard. This item stays unbuilt until the cause is found: someone must name the reader of a speech's occasion (a journal line, a card, a scene, a stance) first.

**Cause.** Needs cause. Looked at: the item (all fields TODO), src/core2/modules/speech.ts and src/core2/modules/news.ts (no occasion), docs/design/life-record.md and the top 120 lines of docs/coordination/OWNER-DECISIONS.md (no ruling).

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: an occasion nobody reads is an unregistered placeholder. No hand-written player text: any line that names the occasion comes from the English engine's banks. Look before you ask: search OWNER-DECISIONS.md, DECISION-REGISTER.md, prior-rulings and LAW.md before filing a question.

**Done when.** A second session, not the builder, names in a drawn place of the played world one speech heard by a person and the screen, journal line or scene that would read its occasion, by record id; this item is then rewritten with Found in code and a real Fix. If no reader can be named, the item is proposed for dropping.

**Waits on.** Nothing.

**Files.** src/core2/modules/speech.ts, src/core2/modules/news.ts, docs/design/life-record.md

**Notes.** TODO Released from idle draft #5217 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-udtiwn` (2026-10-20). Cleared from the front matter and kept here.
