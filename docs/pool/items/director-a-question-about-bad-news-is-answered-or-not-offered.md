---
id: director-a-question-about-bad-news-is-answered-or-not-offered
title: "A question the player asks about bad news is answered from the record, or it is not offered"
area: director
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: opus-lr
pr: #9042
after:
blocked-on:
lead: words
model: opus
effort: medium
root: design-life-record
source: Fable A, rule 5, Nov 13, 2026, from Playtester P1's item 8 (Curtisville, Pennsylvania); filed by the Life records builder opus-lr
checked: opus-lr 2026-11-13
---

**What.** Fable A ruled on Nov 13 (rule 5) that a question the player asks is answered from the record or the reply is not offered. Playtester P1 heard the opposite in Curtisville, Pennsylvania on April 3: Vanessa Webb said they were being evicted, the player asked how long they had, and she answered that she had a few things to get done that morning. Seen: the replies offered in a talk about bad news at home (an eviction, a lost job, a death, an illness, prison, a new job), and what the other person says after one.

**Cause.** Found in code: in `offerChoices` (`src/director/conversation.ts`), a reply that ends on a question is offered only where it is `heard`, and `heard` counted every reply in a talk about bad news (`NEWS_SUBJECTS`) as heard, and counted a reply whose move has a `tells` subject as heard even when that subject could not be told. On bad news the other person then only takes the reply in or ends the talk (`say`), so the question went unanswered. Neither follow-up of the eviction (`eviction-cause`, `eviction-where`) has a raise line in the bank, and "How long do we have?" sits in the `brief` move, which tells nothing.

**Fix.** A question in a talk about bad news is heard only when the subject its move asks for (`tells`) can be told now, with words to tell it (`tellable`); otherwise it is not offered. The eviction gains a subject for how long they had (`eviction-until`, the case's removal date from the housing engine, said "today" on the day), told for a reply in an `until` move, for the lines Fable A gave ("We have until {until}, {you}." / "They gave us until {until}." / "{until}. That's the day."), which Story adds with the re-keyed "How long do we have?".

**Time box.** 3 hours, Opus.

**Rules.** One engine: the conversation engine's own offer rule. No lines are written here; the lines are Story's.

**Done when.** In three drawn places, each a drawn place played half a year with the director watching everyone the player knows, every question offered in a talk about bad news is answered by the other person with a subject of their own, never a goodbye. A second session, on main, plays a life until a talk about bad news and sees no question offered that the talk closes on.

**Waits on.** Nothing. The eviction's date answer is heard once Story adds its lines.

**Files.** src/director/conversation.ts, src/director/data/conversation-rules.json, src/director/news-question-answered.test.ts

**Notes.** Built by the Life records builder (opus-lr), Nov 13, to Fable A's 08:06Z ruling (option 3 with option 2 as its test).
