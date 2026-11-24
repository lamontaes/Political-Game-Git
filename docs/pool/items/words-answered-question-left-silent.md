---
id: words-answered-question-left-silent
title: "Asked how a relative is, or whether they heard the news, the player answers and the talk ends in silence"
area: words
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: words-played-talks-cause-invite-yes-not-followed-up
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: The class check behind the school-question fix (Account lead, Nov 15)
---

**What.** Two kinds of question a talk asks leave the asker with nothing to say once the player answers, and the talk ends on the player's line. The first is "How's your partner?" answered "Brenda is well, thanks for asking.", or answered with thanks ("Thanks for asking. I'll tell Frances you asked."). The second is "Did you hear about independent redistricting?" answered "I saw it." or reacted to ("Oh, my."). Every other question kind seen in played years at three seeds got a reply. Seen: talking to someone in town, they ask after the player's family or the news, the player answers, and nothing more is said.

**Cause.** Measured: a year of the director's own scenes at Cumming, Iowa (seed 7952d3f3e3253ee4), Mountain Meadows, Colorado (c55062fdf88f46ad) and North Hornell, New York (9f8e7d6c5b4a3921). Each scene's talk was played with the yes or no reply, and a plain talk with two people the player knows was played with a reply that rotates. Every question the other person asked was recorded, with what came back after the player's answer. The probe is /mnt/project-files/words-lead/played-talks/probe-answered-questions.test.ts (SEED, PICK=yesno or rand, PLAIN=1).

- Silent after the answer, with the talk closed: family "well" 29 times and "thanks" 9 times; news "yes" 55 times and "react" 144 times.
- Replied to: asked-mutual, family "gone", "ill" and "job", news "no" and "for", own-work-new, shared-school, address-point, and quiet "miss".
- Quiet "alone" ("I just need some quiet right now.") ends silently by design.
- Not asked at these seeds, so not checked: kin, school, school-missed, home-new, own-work, their-work, their-position, their-tenure, shared-work, job-lost, eviction, rent-due, and the court and prison kinds.
  The path for family and news is in src/director/conversation.ts. Neither kind is a give-back kind (`givesBack.kinds`). `answerInTalk` drops a bare taking-in, a news subject goes to its `related` kinds or ends, and `endConversation` returns without a line after the other person's own answered question.

**Fix.** Give each silent kind the asker's own answer back through the one give-back path (`giveBack` and `sayGiveBack`, with `givesBack.answers` for the stage by the player's move), as the shared-school fix does. For family "well": they are glad, and say their own family's news from the family record. For news "yes" and "react": their own view of it, which is the `own-view` subject already related to news. Then `played-talks.test.ts` judges every question the other person asked, not only yes-or-no replies.

**Time box.** 3 hours for one Opus session at medium effort.

**Rules.** Ask why: each silent kind is named with the move and record that left it silent before anything changes, and no closing line is added only to pass the test.

**Done when.** In a drawn place, a second session plays talks where the other person asks after family and asks about the news, answers each one, and sees the other person reply every time. The probe shows no silent end except quiet "alone" at the three seeds above.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/director/data/conversation-rules.json, data/english/parts/conversation.json, src/director/played-talks.test.ts
