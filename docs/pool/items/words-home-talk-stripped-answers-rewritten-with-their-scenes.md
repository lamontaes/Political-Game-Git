---
id: words-home-talk-stripped-answers-rewritten-with-their-scenes
title: "The 57 home-talk answers that lost a padded name are rewritten with their scenes, each carrying an insert from the record"
area: words
kind: bug
priority: 2
size: L
status: open
standard: 2
claimed-by:
pr:
after: words-home-talk-padded-names-come-out
blocked-on:
lead: story
model: sonnet
effort: medium
root: rc4-hand-written-words
source: CTO, Nov 17, 2026, on #9988 (the condition of the baseline line); owner, Nov 14, 2026 (card): "The padded names come out."; Words lead's rule 105
checked:
claimed-at:
branch:
---

**What.** Fifty-seven home-talk answers in data/english/parts/conversation.json ended in the listener's name only to pass the insert guard. #9988 took the name out and left them with no insert, so they joined the conversation bank's no-insert count (238 to 282, approved by the CTO for that pull request alone). Each is still a line placed by nothing but its subject, and says the same thing to every household. Seen: the evening talk at home when a housemate answers the player's news, a missed school day, a rent reminder or a view.

**Cause.** Found in code: the home-talk packets (src/director/bring-it-up.ts, src/director/conversation.ts) set facts for each subject (`said`, `story`, `hours`, `employer`, `decider`, `school`, `rent_again`, `office`, `illness`, `kin`), but these 57 lines were written before the facts were and carry none; the Nov 14 excuse that let a padded name count as a tie is withdrawn (owner, Nov 14; CTO, Nov 17).

**Fix.** Rewrite each line with its scene, in the home-talk rewrite passes by subject (news-back, rent-due-back, own-view-take, own-view-back, school-missed-back, player-news-say, player-news-back, government-news-say/back, job-lost-back, own-work-new-give): a line carries an insert the subject's packet sets, or is deleted; where a subject sets no fact a line could carry (government-news with `about` excluded; own-work-new-give), the subject's packet gains the read first (an effect is a read) or the lines go. The conversation bank's no-insert count falls by each line rewritten or deleted.

**The 57 lines (key: old text, text after #9988).**

- `news-back-core.i-didn-t-see-a-name-on-it-you`: was "I didn't see a name on it, {you}.", now "I didn't see a name on it."
- `rent-due-back-core.we-re-okay-you-it-s-covered-and-then-some`: was "We're okay, {you}. It's covered and then some.", now "We're okay. It's covered and then some."
- `rent-due-back-core.that-helps-you-it-s-going-to-be-close-this-month`: was "That helps, {you}. It's going to be close this month.", now "That helps. It's going to be close this month."
- `rent-due-back-core.every-bit-helps-we-re-short-as-it-is-you`: was "Every bit helps. We're short as it is, {you}.", now "Every bit helps. We're short as it is."
- `rent-due-back-core.you-don-t-have-to-you-we-re-fine-for-it`: was "You don't have to, {you}. We're fine for it.", now "You don't have to. We're fine for it."
- `own-work-new-give-core.i-m-between-jobs-right-now-you`: was "I'm between jobs right now, {you}.", now "I'm between jobs right now."
- `own-work-new-give-core.nothing-steady-for-me-at-the-moment-you`: was "Nothing steady for me at the moment, {you}.", now "Nothing steady for me at the moment."
- `own-view-take-core.we-ll-just-have-to-see-how-it-comes-out-you`: was "We'll just have to see how it comes out, {you}.", now "We'll just have to see how it comes out."
- `own-view-take-core.then-we-re-on-the-same-side-you-we-ll-see`: was "Then we're on the same side, {you}. We'll see.", now "Then we're on the same side. We'll see."
- `school-missed-back-core.i-needed-the-rest-you-i-m-okay`: was "I needed the rest, {you}. I'm okay.", now "I needed the rest. I'm okay."
- `school-missed-back-core.i-wasn-t-up-to-it-you-it-was-one-day`: was "I wasn't up to it, {you}. It was one day.", now "I wasn't up to it. It was one day."
- `school-missed-back-core.it-was-one-day-you-it-won-t-become-a-habit`: was "It was one day, {you}. It won't become a habit.", now "It was one day. It won't become a habit."
- `player-news-say-closer.i-m-proud-of-you-you`: was "I'm proud of you, {you}.", now "I'm proud of you."
- `player-news-say-closer.good-for-you-you`: was "Good for you, {you}.", now "Good for you."
- `player-news-say-closer.don-t-let-it-go-to-your-head-you`: was "Don't let it go to your head, {you}.", now "Don't let it go to your head."
- `player-news-say-closer.i-worry-about-you-you`: was "I worry about you, {you}.", now "I worry about you."
- `player-news-say-closer.something-better-will-come-along-you`: was "Something better will come along, {you}.", now "Something better will come along."
- `player-news-say-closer.you-know-i-d-vote-the-other-way-you`: was "You know I'd vote the other way, {you}.", now "You know I'd vote the other way."
- `player-news-back-core.i-mean-it-you`: was "I mean it, {you}.", now "I mean it."
- `player-news-back-core.you-earned-it-you`: was "You earned it, {you}.", now "You earned it."
- `player-news-back-core.somebody-has-to-keep-you-humble-you`: was "Somebody has to keep you humble, {you}.", now "Somebody has to keep you humble."
- `player-news-back-core.i-know-you-will-you`: was "I know you will, {you}.", now "I know you will."
- `player-news-back-core.good-that-s-all-i-ask-you`: was "Good. That's all I ask, {you}.", now "Good. That's all I ask."
- `player-news-back-core.proud-of-you-anyway-you-just-not-my-vote`: was "Proud of you anyway, {you}. Just not my vote.", now "Proud of you anyway. Just not my vote."
- `player-news-back-core.not-a-mistake-you-just-a-lot-to-take-on`: was "Not a mistake, {you}. Just a lot to take on.", now "Not a mistake. Just a lot to take on."
- `player-news-back-core.against-your-side-you-never-against-you`: was "Against your side, {you}. Never against you.", now "Against your side. Never against you."
- `government-news-say-closer.i-m-all-for-it-you`: was "I'm all for it, {you}.", now "I'm all for it."
- `government-news-say-closer.we-ll-see-if-it-goes-anywhere-you`: was "We'll see if it goes anywhere, {you}.", now "We'll see if it goes anywhere."
- `government-news-say-closer.we-ll-see-what-that-does-around-here-you`: was "We'll see what that does around here, {you}.", now "We'll see what that does around here."
- `government-news-say-closer.i-m-against-it-you-and-i-ll-say-so`: was "I'm against it, {you}, and I'll say so.", now "I'm against it, and I'll say so."
- `government-news-back-core.then-we-agree-you-let-s-hope-it-sticks`: was "Then we agree, {you}. Let's hope it sticks.", now "Then we agree. Let's hope it sticks."
- `government-news-back-core.i-m-not-you-i-d-vote-it-down`: was "I'm not, {you}. I'd vote it down.", now "I'm not. I'd vote it down."
- `government-news-back-core.same-here-you-i-hope-it-doesn-t-last`: was "Same here, {you}. I hope it doesn't last.", now "Same here. I hope it doesn't last."
- `government-news-back-core.i-m-for-it-you-we-ll-see-who-s-wrong`: was "I'm for it, {you}. We'll see who's wrong.", now "I'm for it. We'll see who's wrong."
- `government-news-back-core.maybe-so-you-it-s-already-passed`: was "Maybe so, {you}. It's already passed.", now "Maybe so. It's already passed."
- `government-news-back-core.could-be-you-nobody-asked-us`: was "Could be, {you}. Nobody asked us.", now "Could be. Nobody asked us."
- `player-day-back-core.good-to-hear-you`: was "Good to hear, {you}.", now "Good to hear that."
- `player-day-back-core.keep-it-up-you`: was "Keep it up, {you}.", now "Keep it up, then."
- `illness-news-back-core.the-doctors-haven-t-said-you-we-re-waiting`: was "The doctors haven't said, {you}. We're waiting.", now "The doctors haven't said. We're waiting."
- `illness-news-back-core.not-yet-you-nothing-i-can-think-of`: was "Not yet, {you}. Nothing I can think of.", now "Not yet. Nothing I can think of."
- `death-news-back-core.not-really-you-i-keep-expecting-a-call`: was "Not really, {you}. I keep expecting a call.", now "Not really. I keep expecting a call."
- `death-news-back-core.just-be-here-you`: was "Just be here, {you}.", now "Just be here with me."
- `death-news-back-core.nothing-yet-you-just-stay-close`: was "Nothing yet, {you}. Just stay close.", now "Nothing yet. Just stay close."
- `death-news-back-core.i-keep-waiting-for-the-phone-you`: was "I keep waiting for the phone, {you}.", now "I keep waiting for the phone."
- `death-news-back-core.you-knew-he-was-sick-you`: was "You knew he was sick, {you}.", now "You knew he was sick."
- `death-news-back-core.he-never-got-better-you`: was "He never got better, {you}.", now "He never got better."
- `death-news-back-core.you-knew-she-was-sick-you`: was "You knew she was sick, {you}.", now "You knew she was sick."
- `death-news-back-core.she-never-got-better-you`: was "She never got better, {you}.", now "She never got better."
- `death-news-back-core.you-knew-they-were-sick-you`: was "You knew they were sick, {you}.", now "You knew they were sick."
- `death-news-back-core.they-never-got-better-you`: was "They never got better, {you}.", now "They never got better."
- `prison-news-back-core.the-case-is-public-you-ask-me-later`: was "The case is public, {you}. Ask me later.", now "The case is public. Ask me later."
- `prison-news-back-core.i-d-rather-not-get-into-it-you`: was "I'd rather not get into it, {you}.", now "I'd rather not get into it."
- `job-lost-back-core.they-didn-t-say-much-you-just-that-i-was-done`: was "They didn't say much, {you}. Just that I was done.", now "They didn't say much. Just that I was done."
- `job-lost-back-core.i-m-looking-you-nothing-yet`: was "I'm looking, {you}. Nothing yet.", now "I'm looking. Nothing yet."
- `job-lost-back-core.not-yet-you-i-need-a-minute-first`: was "Not yet, {you}. I need a minute first.", now "Not yet. I need a minute first."
- `job-lost-back-core.i-don-t-know-yet-you`: was "I don't know yet, {you}.", now "I don't know yet."
- `job-lost-back-core.years-years-there-you`: was "{years} years there, {you}.", now "{years} years there."

**Time box.** 6 hours over two passes by subject.

**Rules.** No hand-written player text in code. Rule 101: no figure spoken. Rule 105: the listener's name at most once a talk, where it does work. The insert-guard baseline only goes down from #9988 on.

**Done when.** A second session, in the running game on main, plays three new lives in drawn places it writes down with their seeds, and in each home talk that reaches one of these subjects the housemate's answer names the thing from the record (the story, the hours, the employer, the school, the rent, the office); none of the 57 texts above is said. The conversation bank's no-insert count in tests/guards/english/line-inserts-baseline.json is lower than 282 by the number rewritten or deleted.

**Waits on.** #9988 merging (the padded names out, the baseline at 282); nothing else.

**Files.** data/english/parts/conversation.json, src/director/bring-it-up.ts, src/director/conversation.ts, tests/guards/english/line-inserts-baseline.json, tests/guards/english/home-talk-padded-names.test.ts

**Notes.** Filed by the Story lead, Nov 17, as the condition of the CTO's line on #9988.
