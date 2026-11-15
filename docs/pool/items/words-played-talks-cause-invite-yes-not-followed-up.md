---
id: words-played-talks-cause-invite-yes-not-followed-up
title: '"Remember {school}?" answered "Yes, I do." ends the talk with no line back'
area: words
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-5efbu8
pr: 9505
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Found while gating #9440 on Train 88b5b879 (Nov 15); red the same on that Train alone
---

**What.** `src/director/played-talks.test.ts` ("fifteen talks run to their close ... follow up every answer") is red at Cumming, Iowa, seed 7952d3f3e3253ee4: a cause-invite talk on 2025-11-15 between person_141e48f6edb5fe78 and person_301ea8d02246ff01 (the cause is allowing multifamily housing in single-family zones) has 3 lines and 1 reply, and the player's "Yes, I do." gets nothing back. It was green on Train d82bf47e and came in with one of the folds between d82bf47e and 88b5b879.
Seen: a neighbor asks the player to join a cause, the player says yes, and the talk just stops.

**Cause.** Found in code: the talk opens on the school the two shared (`shared-school` in `subjectsBetween`, src/director/conversation.ts), because no subject is about the invite's cause and a scene's counterpart's shared school stands for it (`mainTopic`). After the player's answer `sayNow` looks for a give-back, but `shared-school` was not among the conversation rules' give-back kinds (src/director/data/conversation-rules.json `givesBack.kinds`). `carryOn` then found nothing related to ask, and `endConversation` stops silently after an answered question, so the talk ended on the player's "Yes, I do." Measured on Train 53e4b29f with `GOLDEN_PATH_SEED=7952d3f3e3253ee4 npx vitest run src/director/played-talks.test.ts`: "You remember Cumming Public Schools?" "Yes, I do." and nothing after, on 2026-01-06 (person_301ea8d02246ff01 to person_141e48f6edb5fe78, school record organization:public-schools:jurisdiction_2349d4ac38c142a2, year 1991). The Train traced the fold that changed the draw to #9465, which changed what relatives outside town open with; it did not touch talk.

**Fix.** `shared-school` is a give-back kind. `giveBack` (src/director/conversation.ts) returns the subject's `years` fact, from the school record's year, in stage `years`. After the player's own "That was 35 years ago." it uses stage `agree`, from `givesBack.answers`. The asker then says "It's been 35 years now." or "Seems like yesterday, and it's been 35 years.", or "Time flies." after the player already said the years. Those are three new `shared-school-give` pieces in data/english/parts/conversation.json.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** Ask why: the fix names the fold, the move and the record that left the player's yes with no line back before changing anything.

**Done when.** A second session, on the Train, plays talks in a drawn place and sees every yes to a cause invite get a line back; the test passes at 7952d3f3e3253ee4 and c55062fdf88f46ad.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/director/data/conversation-rules.json, data/english/parts/conversation.json, src/director/shared-school-give-back.test.ts (new)

**Notes.** Nov 15: built on claude/project-thread-5efbu8 after #9440. Pinned test src/director/shared-school-give-back.test.ts at Cumming, Iowa, seed 7952d3f3e3253ee4 plays the year's scene talks to their close, as the played talks do; on Train 9a5a4d2c the school questions come on Nov 15, 2025 and Jan 12, 2026. A version that waited without playing the other talks found none after the Train moved, so the year is played as the red was seen. It fails without the rules row. Two related items are left to their PRs: that a cause invite's talk is not about the cause (words-reunion-talks-the-shared-cause, #8476), and that a budget-line cause has no words (director-cause-invite-unworded-for-budget-and-illness-causes, #9407). shared-work asks ("Remember {employer}?") have the same dead end, but the subject holds no years fact; they are not changed here.
