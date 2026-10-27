# Scenes, batch-16

Place: Brookside, Delaware (the cached played world, seed fa3bbb297a4b3ea7c25595f71a3f37a7f7fdf08dfd6801c411add18d4f9f0a45). 19 scenes: 19 with a purpose, one for each situation type, staged as proof scenes from the world's real people and records (their producers are awaited), and 0 that the director fires in the cached year from a cause record, each of a different situation type. No two scenes share a narration, an open or a statement. Words come only from data/english/parts/scene-talk.json and the conversation bank.

Grade each line 1 to 5 on naturalness, prose, sentence structure, length (too short, right, too long), creativity and trait fit.

## What each scene tests

- Scene 1, argument (neighbor-argument): the asker is warm; push-back, walking away.
- Scene 2, apology (owed-apology): the asker is cold; push-back, walking away.
- Scene 3, reach-out (favor-job): the asker is boastful; push-back.
- Scene 4, funeral (funeral-cause): the asker is warm; walking away.
- Scene 5, betrayal (betrayal-explain): the asker is cold; a bargain, walking away.
- Scene 6, accusation (conflict-accuse): the asker is boastful; a lie, caught and believed, push-back, walking away.
- Scene 7, warning (protest-warning): the asker is cold; push-back.
- Scene 8, reconciliation (ally-return): the asker is cold; a bargain, push-back, walking away.
- Scene 9, floor-vote (floor-switch): the asker is warm; a bargain, push-back.
- Scene 10, appointment (appointment-offer): the asker is warm; a bargain, push-back.
- Scene 11, recall (recall-confront): the asker is stubborn; push-back, walking away.
- Scene 12, public-hearing (hearing-testify): the asker is warm; walking away.
- Scene 13, scandal (scandal-comment): the asker is warm; a lie, caught and believed, push-back, walking away.
- Scene 14, law-takes-effect (law-reaches): the asker is stubborn; push-back, walking away.
- Scene 15, layoff (layoff-terms): the asker is warm; a bargain, walking away.
- Scene 16, eviction-notice (eviction-terms): the asker is warm; push-back, walking away.
- Scene 17, reunion (fallback:arrival): the asker is warm; walking away.
- Scene 18, celebration (fallback:honor): the asker is cold; walking away.
- Scene 19, news-arrives (fallback:news-received): the asker is warm; walking away.

## What was stood in

- a member stands as the person who tells; the law and who it reached are the law-reach record's
- a sitting member stands in the player's seat (proof scene)
- bill names come from the government engine's records as they are
- fallback: the director fired celebration from money:job-started; no purpose or authored pieces exist for it, so it plays the generic arc for its key
- fallback: the director fired news-arrives from feeling:event:housing.eviction; no purpose or authored pieces exist for it, so it plays the generic arc for its key
- fallback: the director fired reunion from feeling:event:cause.shared; no purpose or authored pieces exist for it, so it plays the generic arc for its key
- no recall petition record exists in this world, so a resident stands in as the petitioner
- no speaking-time record exists, so `minutes` is left out
- the appointment record names a cabinet post held by a person outside the town; two members stand in as appointer and appointee
- the asker is someone still employed where the job ended; no boss record exists
- the death is the mourner's recorded moment; the asker is a housemate who is alive
- the death record names no cause, so `cause` is left out
- the hearing is a recorded town hall; the bill on the agenda is chosen from the bill table
- the notice is the household's eviction record, told by a housemate; no landlord person exists
- the recorded no vote on the sponsor's bill is the record; the promise or insult it answers is not on record
- the reporter's remark on the bill is the record; the scandal itself is staged on the sponsor's bill
- the town hall is the record; that the sheriff warns its host about the crowd is staged
- the young person is out of work on record; that the parent asks this worker is staged

## Scene 1: argument (threat, ends in personal) — proof scene

_Tests neighbor-argument; the asker is warm; push-back, walking away. Records: vote:bill:office:gus2025:101811:board:2027-03-26:person_9e002a561a4b29bc:58:person_b6f0d51289db799a, bill:office:gus2025:101811:board:2027-03-26:person_9e002a561a4b29bc:58, person_9e002a561a4b29bc, person_b6f0d51289db799a._

> You're in the cereal aisle when Kelly Riggs parks a cart across from you.

**Profile warm** (outcome open)

**Kelly Riggs:** So you're the one who voted for "Inclusionary requirement".

**Kelly Riggs:** I've lived on that street a long time, and you just made it worse.

You could say:

1. Which part of it hit you? I ask because the numbers we saw said fewer accidents, and if that's wrong on your street, I want to know.
2. You think I wanted this?
3. Come to the meeting Thursday. I'll sit next to you while you say it. _(the page follows this one)_
4. I'm just here for cereal.

**Kelly Riggs:** I've been to meetings.

**The whole exchange** (7 nodes; longest path 2 replies; ★ is the branch warm's traits lean toward):

- You: Which part of it hit you? I ask because the numbers we saw said fewer accidents, and if that's wrong on your street, I want to know.
  - Kelly Riggs: Numbers. Come stand on my corner at five.
  - _Ends: You'll stand on their corner_
- You: You think I wanted this?
  - Kelly Riggs: You voted for it, didn't you?
  - You: I did. It was that or a bigger cut somewhere else, and I'd rather answer to you in a grocery store than to the people who'd have lost more.
    - Kelly Riggs: I still don't like it. But okay.
    - _Ends: You talked it through_
  - You: Then come say that Thursday, in front of all of us. I'll put you first on the list.
    - Kelly Riggs: Okay. Thursday.
    - _Ends: They'll come to the hearing_
- You ★: Come to the meeting Thursday. I'll sit next to you while you say it.
  - Kelly Riggs: I've been to meetings.
  - _Ends: Left it there_
- You: I'm just here for cereal.
  - _Ends: You walked away: Kelly Riggs: Enjoy your cereal._

<sub>L1 narrate/narrate/scene-talk/braced/14w1s [scene-talk.narrate-narrate.you-re-in-the-cereal-aisle-when-name-parks-a-cart-across-from-you]; L2 open/greet/scene-talk/braced/9w1s [scene-talk.open-greet.so-you-re-the-one-who-voted-for-bill]; L3 state/confront/scene-talk/braced/14w1s [scene-talk.state-confront.i-ve-lived-on-that-street-a-long-time-and-you-just-made-it-worse]; L4 reply/tell/scene-talk/calm/27w2s [scene-talk.reply-tell.which-part-of-it-hit-you-i-ask-because-the-numbers-we-saw-said-fewer-a]; L5 reply/confront/scene-talk/braced/5w1s [scene-talk.reply-confront.you-think-i-wanted-this]; L6 reply/offer/scene-talk/calm/14w2s [scene-talk.reply-offer.come-to-the-meeting-thursday-i-ll-sit-next-to-you-while-you-say-it]; L7 reply/leave/scene-talk/calm/5w1s [scene-talk.reply-leave.i-m-just-here-for-cereal]; L14 follow/refuse/scene-talk/braced/4w1s [scene-talk.follow-refuse.i-ve-been-to-meetings]</sub>

## Scene 2: apology (routine, ends in personal) — proof scene

_Tests owed-apology; the asker is cold; push-back, walking away. Records: vote:bill:office:US-DE:legislature-upper:2027-01-12:official:term:seat:US-DE:upper:002:0:2026-10-12:5:official:term:seat:US-DE:lower:024:0:2026-10-12, bill:office:US-DE:legislature-upper:2027-01-12:official:term:seat:US-DE:upper:002:0:2026-10-12:5, official:term:seat:US-DE:upper:002:0:2026-10-12, official:term:seat:US-DE:lower:024:0:2026-10-12._

> After the meeting, Ryan Wagner waits until the room is nearly empty.

**Profile cold** (outcome open)

**Ryan Wagner:** Do you have a minute, or are you going to walk past me again?

**Ryan Wagner:** You made a fool of me in front of the whole council, and you never said a word after.

You could say:

1. You're right. I went after you to win a point, and it wasn't fair. I'll say so at the next meeting.
2. I went after the idea, not you. I can see it didn't come across that way.
3. It was a tense night for everybody. _(the page follows this one)_
4. You started it.

**Ryan Wagner:** A tense night. That's what you've got?

You could say:

1. I will. First thing on the agenda, in my own words.
2. I have to go. _(the page follows this one)_

**Ryan Wagner:** Good night.

**The whole exchange** (10 nodes; longest path 2 replies; ★ is the branch cold's traits lean toward):

- You: You're right. I went after you to win a point, and it wasn't fair. I'll say so at the next meeting.
  - Ryan Wagner: Say it out loud, then. At the meeting.
  - _Ends: A half apology_
- You: I went after the idea, not you. I can see it didn't come across that way.
  - Ryan Wagner: It came across exactly the way you meant it.
  - You: Fine. I'm sorry. I'll say it at the meeting.
    - Ryan Wagner: Say it out loud, then. At the meeting.
    - _Ends: You came around_
  - You: Then we're done talking.
    - Ryan Wagner: Grow up.
    - _Ends: A grudge_
  - You: I have to go.
    - _Ends: A grudge: Ryan Wagner: Good night._
- You ★: It was a tense night for everybody.
  - Ryan Wagner: A tense night. That's what you've got?
  - You: I will. First thing on the agenda, in my own words.
    - Ryan Wagner: Say it out loud, then. At the meeting.
    - _Ends: A half apology_
  - You ★: I have to go.
    - _Ends: A grudge: Ryan Wagner: Good night._
- You: You started it.
  - Ryan Wagner: Grow up.
  - _Ends: A grudge_

Other personalities: warm leans to “I went after the idea, not you. I can see it didn't come across that way.” and it ends resolved; stubborn leans to “You started it.” and it ends open; boastful leans to “I went after the idea, not you. I can see it didn't come across that way.” and it ends open.

<sub>L1 narrate/narrate/scene-talk/hurt/12w1s [scene-talk.narrate-narrate.after-the-meeting-name-waits-until-the-room-is-nearly-empty]; L2 open/greet/scene-talk/hurt/14w1s [scene-talk.open-greet.do-you-have-a-minute-or-are-you-going-to-walk-past-me-again]; L3 state/confront/scene-talk/hurt/19w1s [scene-talk.state-confront.you-made-a-fool-of-me-in-front-of-the-whole-council-and-you-never-said]; L4 reply/apologize/scene-talk/contrite/21w3s [scene-talk.reply-apologize.you-re-right-i-went-after-you-to-win-a-point-and-it-wasn-t-fair-i-ll-s]; L5 reply/tell/scene-talk/calm/16w2s [scene-talk.reply-tell.i-went-after-the-idea-not-you-i-can-see-it-didn-t-come-across-that-way]; L6 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.it-was-a-tense-night-for-everybody]; L7 reply/confront/scene-talk/braced/3w1s [scene-talk.reply-confront.you-started-it]; L16 follow/press/scene-talk/hurt/7w2s [scene-talk.follow-press.a-tense-night-that-s-what-you-ve-got]; L17 reply/apologize/scene-talk/contrite/11w2s [scene-talk.reply-apologize.i-will-first-thing-on-the-agenda-in-my-own-words]; L18 reply/leave/scene-talk/braced/4w1s [scene-talk.reply-leave.i-have-to-go]; L20 close/accept/scene-talk/hurt/2w1s [scene-talk.close-accept.good-night]</sub>

## Scene 3: reach-out (favor-asked, ends in personal) — proof scene

_Tests favor-job; the asker is boastful; push-back. Records: person_b6f0d31289db7634, person_b6f0d41289db77e7, official:seat:US-MS:governor, organization:outside-government:US-MS._

> Jeffrey Shepard catches you outside the hardware store. You've known each other a long time.

**Profile boastful** (outcome refused)

**Jeffrey Shepard:** Can I ask you something, and you tell me no if it's wrong?

**Jeffrey Shepard:** My son needs a job. Anything at city hall. He's a good kid.

You could say:

1. I can't do that. If I make that call, it's in the paper by Friday, and he's the one who pays for it.
2. Tell him to apply to the posting. I'll make sure somebody reads it.
3. Have him call my office Monday. I'll see what's open.
4. What's he done so far? _(the page follows this one)_

**Jeffrey Shepard:** He's been looking a long time. Nothing comes through.

You could say:

1. I'm sorry. I can't be the one who gets him in. _(the page follows this one)_
2. There's a posting at public works this week. Tell him to apply by Friday and use my name as a reference.
3. Have him call me. I'll see what's real.

**Jeffrey Shepard:** I figured. I had to ask.

**The whole exchange** (12 nodes; longest path 3 replies; ★ is the branch boastful's traits lean toward):

- You: I can't do that. If I make that call, it's in the paper by Friday, and he's the one who pays for it.
  - Jeffrey Shepard: I figured. I had to ask.
  - _Ends: Refused_
- You: Tell him to apply to the posting. I'll make sure somebody reads it.
  - Jeffrey Shepard: Somebody. Not you?
  - You: Not me. That's the whole point.
    - Jeffrey Shepard: I figured. I had to ask.
    - _Ends: You held to the posting_
  - You: All right. Me. Have him send it to me directly.
    - Jeffrey Shepard: That's all I'm asking.
    - _Ends: You'll make the call_
- You: Have him call my office Monday. I'll see what's open.
  - Jeffrey Shepard: That's all I'm asking.
  - _Ends: You'll make the call_
- You ★: What's he done so far?
  - Jeffrey Shepard: He's been looking a long time. Nothing comes through.
  - You ★: I'm sorry. I can't be the one who gets him in.
    - Jeffrey Shepard: I figured. I had to ask.
    - _Ends: Refused_
  - You: There's a posting at public works this week. Tell him to apply by Friday and use my name as a reference.
    - Jeffrey Shepard: Somebody. Not you?
    - You: Not me. That's the whole point.
      - Jeffrey Shepard: I figured. I had to ask.
      - _Ends: You held to the posting_
    - You: All right. Me. Have him send it to me directly.
      - Jeffrey Shepard: That's all I'm asking.
      - _Ends: You'll make the call_
  - You: Have him call me. I'll see what's real.
    - Jeffrey Shepard: That's all I'm asking.
    - _Ends: You'll make the call_

Other personalities: warm leans to “What's he done so far?” and it ends resolved; cold leans to “I can't do that. If I make that call, it's in the paper by Friday, and he's the one who pays for it.” and it ends refused.

<sub>L1 narrate/narrate/scene-talk/calm/15w2s [scene-talk.narrate-narrate.name-catches-you-outside-the-hardware-store-you-ve-known-each-other-a-]; L2 open/greet/scene-talk/nervous/13w1s [scene-talk.open-greet.can-i-ask-you-something-and-you-tell-me-no-if-it-s-wrong]; L3 state/request/scene-talk/hopeful/13w3s [scene-talk.state-request.my-son-needs-a-job-anything-at-city-hall-he-s-a-good-kid]; L4 reply/refuse/scene-talk/guarded/23w2s [scene-talk.reply-refuse.i-can-t-do-that-if-i-make-that-call-it-s-in-the-paper-by-friday-and-he]; L5 reply/offer/scene-talk/calm/13w2s [scene-talk.reply-offer.tell-him-to-apply-to-the-posting-i-ll-make-sure-somebody-reads-it]; L6 reply/promise/scene-talk/calm/10w2s [scene-talk.reply-promise.have-him-call-my-office-monday-i-ll-see-what-s-open]; L7 reply/ask/scene-talk/calm/5w1s [scene-talk.reply-ask.what-s-he-done-so-far]; L15 follow/answer/scene-talk/calm/9w2s [scene-talk.follow-answer.he-s-been-looking-a-long-time-nothing-comes-through]; L16 reply/refuse/scene-talk/guarded/11w2s [scene-talk.reply-refuse.i-m-sorry-i-can-t-be-the-one-who-gets-him-in]; L17 reply/offer/scene-talk/calm/21w2s [scene-talk.reply-offer.there-s-a-posting-at-public-works-this-week-tell-him-to-apply-by-frida]; L18 reply/promise/scene-talk/calm/8w2s [scene-talk.reply-promise.have-him-call-me-i-ll-see-what-s-real]; L19 follow/accept/scene-talk/calm/6w2s [scene-talk.follow-accept.i-figured-i-had-to-ask]</sub>

## Scene 4: funeral (loss, ends in personal) — proof scene

_Tests funeral-cause; the asker is warm; walking away. Records: person:press:outlet:online:0:national:head:0:2027-08-28:life.death:person:press:outlet:online:0:national:owner:0:2027-08-28, life.death:person:press:outlet:online:0:national:owner:0:2027-08-28, person:press:outlet:online:0:national:owner:0, person:press:outlet:online:0:national:reporter:0, person:press:outlet:online:0:national:head:0._

> The service is over. People are standing around the coffee urn, and Patricia Hutchinson makes their way over to you.

**Profile warm** (outcome resolved)

**Patricia Hutchinson:** Nancy Schneider talked about you, you know.

**Patricia Hutchinson:** Nancy Schneider had one more fight left at the council and never got to it. Somebody has to finish it. I'd like it to be you.

You could say:

1. Tell me what it was, and I'll put it on the agenda myself. I can't promise it passes. I can promise it gets a vote with Nancy Schneider's name on it.
2. Not today. Let me get through today. Call my office Monday, and we'll talk about it properly.
3. What was it, exactly? _(the page follows this one)_
4. This isn't the place for it.

**Patricia Hutchinson:** Every spring Nancy Schneider called the council about the same thing, and every spring somebody said next year.

You could say:

1. Then it goes on the agenda this spring. I'll call you when it's scheduled. _(the page follows this one)_
2. That's the state's road. I can carry it to them. I can't make them say yes.
3. I need some air.

**Patricia Hutchinson:** That's all I wanted. Thank you.

**The whole exchange** (8 nodes; longest path 2 replies; ★ is the branch warm's traits lean toward):

- You: Tell me what it was, and I'll put it on the agenda myself. I can't promise it passes. I can promise it gets a vote with Nancy Schneider's name on it.
  - Patricia Hutchinson: Nancy Schneider would have liked that.
  - _Ends: You promised to carry it on_
- You: Not today. Let me get through today. Call my office Monday, and we'll talk about it properly.
  - Patricia Hutchinson: Monday, then.
  - _Ends: Not today_
- You ★: What was it, exactly?
  - Patricia Hutchinson: Every spring Nancy Schneider called the council about the same thing, and every spring somebody said next year.
  - You ★: Then it goes on the agenda this spring. I'll call you when it's scheduled.
    - Patricia Hutchinson: That's all I wanted. Thank you.
    - _Ends: You promised to carry it on_
  - You: That's the state's road. I can carry it to them. I can't make them say yes.
    - Patricia Hutchinson: Monday, then.
    - _Ends: Not today_
  - You: I need some air.
    - _Ends: You walked off: Patricia Hutchinson: Go on. I'll find you later._
- You: This isn't the place for it.
  - Patricia Hutchinson: You're right. I'm sorry.
  - _Ends: Not today_

<sub>L1 narrate/narrate/scene-talk/solemn/20w2s [scene-talk.narrate-narrate.the-service-is-over-people-are-standing-around-the-coffee-urn-and-name]; L2 open/greet/scene-talk/solemn/7w1s [scene-talk.open-greet.deceased-talked-about-you-you-know]; L3 state/request/scene-talk/solemn/26w3s [scene-talk.state-request.deceased-had-one-more-fight-left-at-the-council-and-never-got-to-it-so]; L4 reply/promise/scene-talk/tender/31w3s [scene-talk.reply-promise.tell-me-what-it-was-and-i-ll-put-it-on-the-agenda-myself-i-can-t-promi]; L5 reply/decline/scene-talk/tender/17w3s [scene-talk.reply-decline.not-today-let-me-get-through-today-call-my-office-monday-and-we-ll-tal]; L6 reply/ask/scene-talk/tender/4w1s [scene-talk.reply-ask.what-was-it-exactly]; L7 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.this-isn-t-the-place-for-it]; L10 follow/answer/scene-talk/solemn/18w1s [scene-talk.follow-answer.every-spring-deceased-called-the-council-about-the-same-thing-and-ever]; L11 reply/promise/scene-talk/tender/14w2s [scene-talk.reply-promise.then-it-goes-on-the-agenda-this-spring-i-ll-call-you-when-it-s-schedul]; L12 reply/decline/scene-talk/guarded/16w3s [scene-talk.reply-decline.that-s-the-state-s-road-i-can-carry-it-to-them-i-can-t-make-them-say-y]; L13 reply/leave/scene-talk/solemn/4w1s [scene-talk.reply-leave.i-need-some-air]; L14 follow/thank/scene-talk/solemn/6w2s [scene-talk.follow-thank.that-s-all-i-wanted-thank-you]</sub>

## Scene 5: betrayal (threat, ends in personal) — proof scene

_Tests betrayal-explain; the asker is cold; a bargain, walking away. Records: vote:bill:office:US-DE:legislature-lower:2027-02-03:official:term:seat:US-DE:lower:001:0:2026-10-12:26:official:term:seat:US-DE:upper:015:0:2026-10-12, bill:office:US-DE:legislature-lower:2027-02-03:official:term:seat:US-DE:lower:001:0:2026-10-12:26, official:term:seat:US-DE:lower:001:0:2026-10-12, official:term:seat:US-DE:upper:015:0:2026-10-12._

> Jose Molina is waiting by your car. They don't say hello.

**Profile cold** (outcome open)

**Jose Molina:** You didn't call me back.

**Jose Molina:** I'm the one who gave the paper your memo. You should hear it from me.

You could say:

1. Why?
2. All these years, and you hand my memo to a reporter.
3. Okay. Thank you for telling me yourself.
4. I can't do this right now. _(the page follows this one)_

**Jose Molina:** I'll go.

**The whole exchange** (8 nodes; longest path 2 replies; ★ is the branch cold's traits lean toward):

- You: Why?
  - Jose Molina: Because you were going to bury it, and people on my street were going to pay for it. I didn't see another way.
  - You: You might be right. I'm still angry.
    - Jose Molina: I didn't think you'd say that.
    - _Ends: Forgiven_
  - You: So you decided for me.
    - Jose Molina: I know. I'd do it again, and I'm sorry.
    - _Ends: You cut them off_
  - You: Then you owe me one. A big one.
    - Jose Molina: Fair. I owe you one.
    - _Ends: They owe you now_
- You: All these years, and you hand my memo to a reporter.
  - Jose Molina: I know. I'd do it again, and I'm sorry.
  - _Ends: You cut them off_
- You: Okay. Thank you for telling me yourself.
  - Jose Molina: I didn't think you'd say that.
  - _Ends: Forgiven_
- You ★: I can't do this right now.
  - _Ends: You cut them off: Jose Molina: I'll go._

Other personalities: warm leans to “Why?” and it ends resolved; stubborn leans to “All these years, and you hand my memo to a reporter.” and it ends open.

<sub>L1 narrate/narrate/scene-talk/hurt/11w2s [scene-talk.narrate-narrate.name-is-waiting-by-your-car-they-don-t-say-hello]; L2 open/greet/scene-talk/hurt/5w1s [scene-talk.open-greet.you-didn-t-call-me-back]; L3 state/confess/scene-talk/contrite/15w2s [scene-talk.state-confess.i-m-the-one-who-gave-the-paper-your-memo-you-should-hear-it-from-me]; L4 reply/ask/scene-talk/hurt/1w1s [scene-talk.reply-ask.why]; L5 reply/confront/scene-talk/hurt/11w1s [scene-talk.reply-confront.all-these-years-and-you-hand-my-memo-to-a-reporter]; L6 reply/comfort/scene-talk/tender/7w2s [scene-talk.reply-comfort.okay-thank-you-for-telling-me-yourself]; L7 reply/leave/scene-talk/hurt/6w1s [scene-talk.reply-leave.i-can-t-do-this-right-now]; L17 close/warn/scene-talk/hurt/2w1s [scene-talk.close-warn.i-ll-go]</sub>

## Scene 6: accusation (threat, ends in personal) — proof scene

_Tests conflict-accuse; the asker is boastful; a lie, caught and believed, push-back, walking away. Records: vote:bill:federal:us-house:2026-10-13:official:seat:US-NJ:us-house:02:0:official:seat:US-VA:us-house:10, bill:federal:us-house:2026-10-13:official:seat:US-NJ:us-house:02:0, official:seat:US-NJ:us-house:02, official:seat:US-VA:us-house:10._

> Before the vote on "Medicaid work requirement", Tammy Kelly leans over and lowers their voice.

**Profile boastful** (outcome resolved)

**Tammy Kelly:** Can I ask you something before we vote?

**Tammy Kelly:** Is there a firm on the bid list for "Medicaid work requirement" that you have money in?

You could say:

1. There is. I reported it in writing, and counsel said I could vote. I'll get you the letter. _(the page follows this one)_
2. No. Where did you hear that?
3. Say that on the record if you believe it.
4. I'll step out on this one. Not because I've done anything, but because you asked, and others will.
5. Never heard of the firm.

**Tammy Kelly:** Then why vote at all?

You could say:

1. Because the rule says I can, and the people who sent me sent me to vote. _(the page follows this one)_
2. Fine. I'll step out.
3. We're voting.

**Tammy Kelly:** Send me the letter. That's all I need.

**The whole exchange** (14 nodes; longest path 3 replies; ★ is the branch boastful's traits lean toward):

- You ★: There is. I reported it in writing, and counsel said I could vote. I'll get you the letter.
  - Tammy Kelly: Then why vote at all?
  - You ★: Because the rule says I can, and the people who sent me sent me to vote.
    - Tammy Kelly: Send me the letter. That's all I need.
    - _Ends: You showed it was disclosed_
  - You: Fine. I'll step out.
    - Tammy Kelly: Send me the letter. That's all I need.
    - _Ends: You'll step aside on it_
  - You: We're voting.
    - _Ends: It's a feud now: Tammy Kelly: Then I'll raise it from the floor._
- You: No. Where did you hear that?
  - Tammy Kelly: It's on the list in the packet. Page four.
  - You: Fine. It's on the list. I reported it, and I'll show you.
    - Tammy Kelly: Then why vote at all?
    - You: Because the rule says I can, and the people who sent me sent me to vote.
      - Tammy Kelly: Send me the letter. That's all I need.
      - _Ends: You showed it was disclosed_
  - You: Fine. I'll step out.
    - Tammy Kelly: Send me the letter. That's all I need.
    - _Ends: You'll step aside on it_
  - You: We're voting.
    - _Ends: It's a feud now: Tammy Kelly: Then I'll raise it from the floor._
- You: Say that on the record if you believe it.
  - Tammy Kelly: I will.
  - _Ends: It's a feud now_
- You: I'll step out on this one. Not because I've done anything, but because you asked, and others will.
  - Tammy Kelly: Send me the letter. That's all I need.
  - _Ends: You'll step aside on it_
- You: Never heard of the firm.
  - _if not:_
    - Tammy Kelly: Okay. Then somebody gave me bad information.
    - _Ends: Left it there_

Other personalities: warm leans to “I'll step out on this one. Not because I've done anything, but because you asked, and others will.” and it ends resolved; cold leans to “Say that on the record if you believe it.” and it ends open.

<sub>L1 narrate/narrate/scene-talk/braced/15w1s [scene-talk.narrate-narrate.before-the-vote-on-bill-name-leans-over-and-lowers-their-voice]; L2 open/greet/scene-talk/calm/8w1s [scene-talk.open-greet.can-i-ask-you-something-before-we-vote]; L3 state/confront/scene-talk/braced/17w1s [scene-talk.state-confront.is-there-a-firm-on-the-bid-list-for-bill-that-you-have-money-in]; L4 reply/tell/scene-talk/calm/18w3s [scene-talk.reply-tell.there-is-i-reported-it-in-writing-and-counsel-said-i-could-vote-i-ll-g]; L5 reply/deny/scene-talk/braced/6w2s [scene-talk.reply-deny.no-where-did-you-hear-that]; L6 reply/confront/scene-talk/braced/9w1s [scene-talk.reply-confront.say-that-on-the-record-if-you-believe-it]; L7 reply/offer/scene-talk/calm/18w2s [scene-talk.reply-offer.i-ll-step-out-on-this-one-not-because-i-ve-done-anything-but-because-y]; L8 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.never-heard-of-the-firm]; L9 follow/ask/scene-talk/braced/5w1s [scene-talk.follow-ask.then-why-vote-at-all]; L10 reply/tell/scene-talk/braced/16w1s [scene-talk.reply-tell.because-the-rule-says-i-can-and-the-people-who-sent-me-sent-me-to-vote]; L11 reply/offer/scene-talk/guarded/4w2s [scene-talk.reply-offer.fine-i-ll-step-out]; L12 reply/leave/scene-talk/braced/2w1s [scene-talk.reply-leave.we-re-voting]; L13 follow/accept/scene-talk/calm/8w2s [scene-talk.follow-accept.send-me-the-letter-that-s-all-i-need]</sub>

## Scene 7: warning (threat, ends in personal) — proof scene

_Tests protest-warning; the asker is cold; push-back. Records: town-hall:person_a52334a2a50177be:2026-10-19, term:seat:gus2025:101811:sheriff:0:2027-01-01:elected, person_a52334a2a50177be._

> Alicia McCarthy, the police chief, asks for ten minutes. Not on the phone.

**Profile cold** (outcome open)

**Alicia McCarthy:** Sit. This won't take long.

**Alicia McCarthy:** There'll be two hundred people outside your event Saturday, maybe more, from out of town. I'd cancel it.

You could say:

1. I'm not canceling. What do you need to keep it safe?
2. How sure are you? _(the page follows this one)_
3. Then cancel it. Say it was my call.
4. Move it inside, and I'll go out and meet them before it starts.

**Alicia McCarthy:** Sure enough to be in your office on a Thursday.

You could say:

1. Put the risk in writing for me, and we go ahead.
2. Fine. We cancel.
3. Then I'll meet them at the door, not in the street. _(the page follows this one)_

**Alicia McCarthy:** Going out to them is the part I'd skip.

**The whole exchange** (14 nodes; longest path 2 replies; ★ is the branch cold's traits lean toward):

- You: I'm not canceling. What do you need to keep it safe?
  - Alicia McCarthy: Eight more officers and the south lot. That's overtime, and the council will ask.
  - You: Put the risk in writing for me, and we go ahead.
    - Alicia McCarthy: Then we'll make it work.
    - _Ends: Going ahead, with officers_
  - You: Fine. We cancel.
    - Alicia McCarthy: Good. I'll put it out.
    - _Ends: Event canceled_
  - You: Then I'll meet them at the door, not in the street.
    - Alicia McCarthy: Going out to them is the part I'd skip.
    - _Ends: You overruled the chief_
- You ★: How sure are you?
  - Alicia McCarthy: Sure enough to be in your office on a Thursday.
  - You: Put the risk in writing for me, and we go ahead.
    - Alicia McCarthy: Eight more officers and the south lot. That's overtime, and the council will ask.
    - _Ends: Going ahead, with officers_
  - You: Fine. We cancel.
    - Alicia McCarthy: Good. I'll put it out.
    - _Ends: Event canceled_
  - You ★: Then I'll meet them at the door, not in the street.
    - Alicia McCarthy: Going out to them is the part I'd skip.
    - _Ends: You overruled the chief_
- You: Then cancel it. Say it was my call.
  - Alicia McCarthy: Good. I'll put it out.
  - _Ends: Event canceled_
- You: Move it inside, and I'll go out and meet them before it starts.
  - Alicia McCarthy: Going out to them is the part I'd skip.
  - You: Put the risk in writing for me, and we go ahead.
    - Alicia McCarthy: Eight more officers and the south lot. That's overtime, and the council will ask.
    - _Ends: Going ahead, with officers_
  - You: Fine. We cancel.
    - Alicia McCarthy: Good. I'll put it out.
    - _Ends: Event canceled_
  - You: Then I'll meet them at the door, not in the street.
    - Alicia McCarthy: Then we'll make it work.
    - _Ends: You'll meet the protesters_

Other personalities: warm leans to “How sure are you?” and it ends open; stubborn leans to “How sure are you?” and it ends open; anxious leans to “How sure are you?” and it ends open; boastful leans to “How sure are you?” and it ends open.

<sub>L1 narrate/narrate/scene-talk/braced/13w2s [scene-talk.narrate-narrate.name-the-police-chief-asks-for-ten-minutes-not-on-the-phone]; L2 open/greet/scene-talk/calm/5w2s [scene-talk.open-greet.sit-this-won-t-take-long]; L3 state/warn/scene-talk/braced/18w2s [scene-talk.state-warn.there-ll-be-two-hundred-people-outside-your-event-saturday-maybe-more-]; L4 reply/refuse/scene-talk/braced/11w2s [scene-talk.reply-refuse.i-m-not-canceling-what-do-you-need-to-keep-it-safe]; L5 reply/ask/scene-talk/guarded/4w1s [scene-talk.reply-ask.how-sure-are-you]; L6 reply/agree/scene-talk/calm/8w2s [scene-talk.reply-agree.then-cancel-it-say-it-was-my-call]; L7 reply/offer/scene-talk/calm/13w1s [scene-talk.reply-offer.move-it-inside-and-i-ll-go-out-and-meet-them-before-it-starts]; L15 follow/answer/scene-talk/calm/10w1s [scene-talk.follow-answer.sure-enough-to-be-in-your-office-on-a-thursday]; L16 reply/refuse/scene-talk/calm/11w1s [scene-talk.reply-refuse.put-the-risk-in-writing-for-me-and-we-go-ahead]; L17 reply/agree/scene-talk/guarded/3w2s [scene-talk.reply-agree.fine-we-cancel]; L18 reply/offer/scene-talk/calm/11w1s [scene-talk.reply-offer.then-i-ll-meet-them-at-the-door-not-in-the-street]; L21 follow/disagree/scene-talk/guarded/9w1s [scene-talk.follow-disagree.going-out-to-them-is-the-part-i-d-skip]</sub>

## Scene 8: reconciliation (routine, ends in personal) — proof scene

_Tests ally-return; the asker is cold; a bargain, push-back, walking away. Records: vote:bill:office:US-DE:legislature-lower:2027-02-22:official:term:seat:US-DE:lower:034:0:2026-10-12:44:official:term:seat:US-DE:upper:018:0:2026-10-12, bill:office:US-DE:legislature-lower:2027-02-22:official:term:seat:US-DE:lower:034:0:2026-10-12:44, official:term:seat:US-DE:lower:034:0:2026-10-12, official:term:seat:US-DE:upper:018:0:2026-10-12._

> Gary Tran stops you on the courthouse steps. You haven't spoken since the split.

**Profile cold** (outcome refused)

**Gary Tran:** I saw your numbers.

**Gary Tran:** I was wrong to walk out on you, and I said so to my people last night. I want back in.

You could say:

1. Then come by Thursday. Bring your people.
2. Say it at Tuesday's meeting, in front of everyone. Then we'll talk.
3. You were loud about it. You can be loud somewhere else. _(the page follows this one)_
4. What changed?

**Gary Tran:** I'm asking. I don't ask much.

**The whole exchange** (8 nodes; longest path 2 replies; ★ is the branch cold's traits lean toward):

- You: Then come by Thursday. Bring your people.
  - Gary Tran: Thursday.
  - _Ends: Welcomed back_
- You: Say it at Tuesday's meeting, in front of everyone. Then we'll talk.
  - Gary Tran: Tuesday. I'll say it.
  - _Ends: Back, on your terms_
- You ★: You were loud about it. You can be loud somewhere else.
  - Gary Tran: I'm asking. I don't ask much.
  - _Ends: Turned away_
- You: What changed?
  - Gary Tran: I found out who was paying for the other side. I didn't like it.
  - You: Then I believe you. Come Thursday.
    - Gary Tran: Thursday.
    - _Ends: Welcomed back_
  - You: Then say that in public, and you're in.
    - Gary Tran: Tuesday. I'll say it.
    - _Ends: Back, on your terms_
  - You: I'll think about it.
    - _Ends: Turned away: Gary Tran: I'll see you around._

Other personalities: warm leans to “What changed?” and it ends resolved; boastful leans to “What changed?” and it ends resolved.

<sub>L1 narrate/narrate/scene-talk/guarded/14w2s [scene-talk.narrate-narrate.name-stops-you-on-the-courthouse-steps-you-haven-t-spoken-since-the-sp]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.i-saw-your-numbers]; L3 state/request/scene-talk/contrite/21w2s [scene-talk.state-request.i-was-wrong-to-walk-out-on-you-and-i-said-so-to-my-people-last-night-i]; L4 reply/agree/scene-talk/calm/7w2s [scene-talk.reply-agree.then-come-by-thursday-bring-your-people]; L5 reply/bargain/scene-talk/guarded/12w2s [scene-talk.reply-bargain.say-it-at-tuesday-s-meeting-in-front-of-everyone-then-we-ll-talk]; L6 reply/refuse/scene-talk/braced/11w2s [scene-talk.reply-refuse.you-were-loud-about-it-you-can-be-loud-somewhere-else]; L7 reply/ask/scene-talk/braced/2w1s [scene-talk.follow-press.what-changed]; L10 follow/plea/scene-talk/contrite/6w2s [scene-talk.follow-plea.i-m-asking-i-don-t-ask-much]</sub>

## Scene 9: floor-vote (vote-wanted, ends in bill) — proof scene

_Tests floor-switch; the asker is warm; a bargain, push-back. Records: vote:bill:office:US-DE:legislature-lower:2027-01-31:official:term:seat:US-DE:lower:008:0:2026-10-12:23:official:term:seat:US-DE:lower:030:0:2026-10-12, bill:office:US-DE:legislature-lower:2027-01-31:official:term:seat:US-DE:lower:008:0:2026-10-12:23, official:term:seat:US-DE:lower:008:0:2026-10-12, official:term:seat:US-DE:lower:030:0:2026-10-12._

> The roll call on "Civilian oversight of police" is halfway through when Patricia Hubbard comes down the aisle to your desk.

**Profile warm** (outcome resolved)

**Patricia Hubbard:** I need you on this one.

**Patricia Hubbard:** I'm two short. Change your vote before they call your name.

You could say:

1. Fine. You'll remember this. _(the page follows this one)_
2. Then you need somebody who isn't me. My district's against it, and I told them where I'd be.
3. Put my district's money back in the budget, and I'm yours.
4. I'll pass.

**Patricia Hubbard:** I will. Thank you.

**The whole exchange** (10 nodes; longest path 2 replies; ★ is the branch warm's traits lean toward):

- You ★: Fine. You'll remember this.
  - Patricia Hubbard: I will. Thank you.
  - _Ends: You switched; they owe you_
- You: Then you need somebody who isn't me. My district's against it, and I told them where I'd be.
  - Patricia Hubbard: Can't you go with us once?
  - You: All right. Once.
    - Patricia Hubbard: I will. Thank you.
    - _Ends: You switched; they owe you_
  - You: Not this one.
    - Patricia Hubbard: Then don't come to me in the spring.
    - _Ends: You held your vote_
- You: Put my district's money back in the budget, and I'm yours.
  - Patricia Hubbard: Done. Don't look at me when it posts.
  - _Ends: You switched for a price_
- You: I'll pass.
  - Patricia Hubbard: The roll's still open. Last chance.
  - You: All right. Once.
    - Patricia Hubbard: I will. Thank you.
    - _Ends: You switched; they owe you_
  - You: Not this one.
    - Patricia Hubbard: Then don't come to me in the spring.
    - _Ends: You held your vote_
  - You: Then I'll pass, and you can call it what you want.
    - Patricia Hubbard: Passing is a no with better manners.
    - _Ends: You passed_

Other personalities: cold leans to “Not this one.” and it ends refused; anxious leans to “I'll pass.” and it ends open; boastful leans to “Put my district's money back in the budget, and I'm yours.” and it ends resolved.

<sub>L1 narrate/narrate/scene-talk/braced/21w1s [scene-talk.narrate-narrate.the-roll-call-on-bill-is-halfway-through-when-name-comes-down-the-aisl]; L2 open/greet/scene-talk/braced/6w1s [scene-talk.open-greet.i-need-you-on-this-one]; L3 state/request/scene-talk/braced/11w2s [scene-talk.state-request.i-m-two-short-change-your-vote-before-they-call-your-name]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-ll-remember-this]; L5 reply/refuse/scene-talk/braced/18w2s [scene-talk.reply-refuse.then-you-need-somebody-who-isn-t-me-my-district-s-against-it-and-i-tol]; L6 reply/bargain/scene-talk/calm/11w1s [scene-talk.reply-bargain.put-my-district-s-money-back-in-the-budget-and-i-m-yours]; L7 reply/stall/scene-talk/guarded/2w1s [scene-talk.reply-stall.i-ll-pass]; L8 follow/thank/scene-talk/glad/4w2s [scene-talk.follow-thank.i-will-thank-you]</sub>

## Scene 10: appointment (honor, ends in political) — proof scene

_Tests appointment-offer; the asker is warm; a bargain, push-back. Records: appointment:US-DE:budget, official:term:seat:US-DE:upper:015:0:2026-10-12, person_a52334a2a50177be._

> Brittany Tucker from the governor's office calls while you're between meetings.

**Profile warm** (outcome open)

**Brittany Tucker:** It's good news, I promise.

**Brittany Tucker:** The governor would like you to serve as Budget Director / Finance Secretary. We'd like an answer by Friday.

You could say:

1. Tell the governor yes.
2. What comes with it, and who would I answer to? _(the page follows this one)_
3. Then no. Thank the governor for me.
4. I'll take it if I keep my own voice. Nobody tells me what to say.

**Brittany Tucker:** You'd answer to the governor. It's long hours, and they'd like someone who knows your part of town.

You could say:

1. Then yes.
2. Then it's not for me. Thank the governor.
3. Then I'll do it if I keep my own voice. Nobody tells me what to say. _(the page follows this one)_

**Brittany Tucker:** I can't promise that on the governor's behalf.

**The whole exchange** (8 nodes; longest path 2 replies; ★ is the branch warm's traits lean toward):

- You: Tell the governor yes.
  - Brittany Tucker: Wonderful. The paperwork comes Monday.
  - _Ends: You took the seat_
- You ★: What comes with it, and who would I answer to?
  - Brittany Tucker: You'd answer to the governor. It's long hours, and they'd like someone who knows your part of town.
  - You: Then yes.
    - Brittany Tucker: Wonderful. The paperwork comes Monday.
    - _Ends: You took the seat_
  - You: Then it's not for me. Thank the governor.
    - Brittany Tucker: Think it over. It's not offered twice.
    - _Ends: You turned it down_
  - You ★: Then I'll do it if I keep my own voice. Nobody tells me what to say.
    - Brittany Tucker: I can't promise that on the governor's behalf.
    - _Ends: Left it there_
- You: Then no. Thank the governor for me.
  - Brittany Tucker: Think it over. It's not offered twice.
  - _Ends: You turned it down_
- You: I'll take it if I keep my own voice. Nobody tells me what to say.
  - Brittany Tucker: That's understood. It's your voice.
  - _Ends: You took it on your terms_

<sub>L1 narrate/narrate/scene-talk/calm/11w1s [scene-talk.narrate-narrate.name-from-the-governor-s-office-calls-while-you-re-between-meetings]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.it-s-good-news-i-promise]; L3 state/offer/scene-talk/calm/19w2s [scene-talk.state-offer.the-governor-would-like-you-to-serve-as-office-we-d-like-an-answer-by-]; L4 reply/agree/scene-talk/glad/4w1s [scene-talk.reply-agree.tell-the-governor-yes]; L5 reply/ask/scene-talk/guarded/10w1s [scene-talk.reply-ask.what-comes-with-it-and-who-would-i-answer-to]; L6 reply/decline/scene-talk/calm/7w2s [scene-talk.reply-decline.then-no-thank-the-governor-for-me]; L7 reply/bargain/scene-talk/guarded/15w2s [scene-talk.reply-bargain.i-ll-take-it-if-i-keep-my-own-voice-nobody-tells-me-what-to-say]; L9 follow/answer/scene-talk/calm/18w2s [scene-talk.follow-answer.you-d-answer-to-the-governor-it-s-long-hours-and-they-d-like-someone-w]; L10 reply/agree/scene-talk/calm/2w1s [scene-talk.reply-agree.then-yes]; L11 reply/decline/scene-talk/calm/8w2s [scene-talk.reply-decline.then-it-s-not-for-me-thank-the-governor]; L12 reply/bargain/scene-talk/guarded/16w2s [scene-talk.reply-bargain.then-i-ll-do-it-if-i-keep-my-own-voice-nobody-tells-me-what-to-say]; L15 follow/refuse/scene-talk/guarded/8w1s [scene-talk.follow-refuse.i-can-t-promise-that-on-the-governor-s-behalf]</sub>

## Scene 11: recall (threat, ends in political) — proof scene

_Tests recall-confront; the asker is stubborn; push-back, walking away. Records: term:seat:US-DE:upper:010:0:2027-01-01:elected, official:seat:US-RI:lower:sample:Republican:0, official:term:seat:US-DE:upper:010:0:2026-10-12._

> Michelle Rice is at a folding table outside the grocery store with a clipboard and a stack of petitions. You'd have to walk right past.

**Profile stubborn** (outcome open)

**Michelle Rice:** You got a minute? I'm not here to yell.

**Michelle Rice:** We're collecting signatures to recall you. You voted for "Inclusionary requirement", and people here are paying for it.

You could say:

1. Is that the only reason on the petition?
2. You're telling people I did things I didn't do. _(the page follows this one)_
3. Go ahead. I'll win the vote.
4. It's your right. Good luck with it.

**Michelle Rice:** Then say that at the forum. In front of people.

**The whole exchange** (11 nodes; longest path 2 replies; ★ is the branch stubborn's traits lean toward):

- You: Is that the only reason on the petition?
  - Michelle Rice: That and you stopped holding office hours.
  - You: Fair. Office hours start again next week, and you can come first.
    - Michelle Rice: Then we'll set it up. I'll hold you to it.
    - _Ends: A meeting set_
  - You: Office hours never stopped. They moved to Tuesday nights, and nobody printed it.
    - Michelle Rice: Tuesday nights. Then I'll see you there, and so will everybody I bring.
    - _Ends: They'll come Tuesday night_
  - You: Have a good day.
    - _Ends: You walked away: Michelle Rice: We'll have the signatures by Friday._
- You ★: You're telling people I did things I didn't do.
  - Michelle Rice: Then say that at the forum. In front of people.
  - _Ends: You walked away_
- You: Go ahead. I'll win the vote.
  - Michelle Rice: Then say that at the forum. In front of people.
  - _Ends: You dared them to try_
- You: It's your right. Good luck with it.
  - Michelle Rice: Don't walk past. Tell me why you voted for it.
  - You: I voted for it because the other choice was a cut that hurt more people. Put me on the forum. I'll say that and take questions until they run out.
    - Michelle Rice: Then we'll set it up. I'll hold you to it.
    - _Ends: A meeting set_
  - You: I'm not debating you at a card table.
    - Michelle Rice: Then say that at the forum. In front of people.
    - _Ends: You walked away_
  - You: Have a good day.
    - _Ends: You walked away: Michelle Rice: We'll have the signatures by Friday._

Other personalities: warm leans to “Is that the only reason on the petition?” and it ends resolved; cold leans to “It's your right. Good luck with it.” and it ends open; anxious leans to “It's your right. Good luck with it.” and it ends resolved.

<sub>L1 narrate/narrate/scene-talk/braced/25w2s [scene-talk.narrate-narrate.name-is-at-a-folding-table-outside-the-grocery-store-with-a-clipboard-]; L2 open/greet/scene-talk/calm/9w2s [scene-talk.open-greet.you-got-a-minute-i-m-not-here-to-yell]; L3 state/confront/scene-talk/braced/18w2s [scene-talk.state-confront.we-re-collecting-signatures-to-recall-you-you-voted-for-bill-and-peopl]; L4 reply/ask/scene-talk/calm/8w1s [scene-talk.reply-ask.is-that-the-only-reason-on-the-petition]; L5 reply/confront/scene-talk/braced/9w1s [scene-talk.reply-confront.you-re-telling-people-i-did-things-i-didn-t-do]; L6 reply/boast/scene-talk/proud/6w2s [scene-talk.reply-boast.go-ahead-i-ll-win-the-vote]; L7 reply/deflect/scene-talk/guarded/7w2s [scene-talk.reply-deflect.it-s-your-right-good-luck-with-it]; L15 follow/confront/scene-talk/braced/10w2s [scene-talk.follow-confront.then-say-that-at-the-forum-in-front-of-people]</sub>

## Scene 12: public-hearing (routine, ends in bill) — proof scene

_Tests hearing-testify; the asker is warm; walking away. Records: town-hall:person_bc041df6bd9d1a47:2027-03-29, bill:office:US-DE:legislature-lower:2027-03-06:official:term:seat:US-DE:lower:001:0:2026-10-12:55, person_bc041df6bd9d1a47, person_1629cc78a3f713b1._

> It's public comment on "Restrict abortion". Alicia Keller calls your name, and you step up to the microphone.

**Profile warm** (outcome open)

**Alicia Keller:** You have three minutes.

**Alicia Keller:** Please state your name and address for the record.

You could say:

1. I've read "Restrict abortion" twice. The part that worries me is who it reaches first, and nobody on my street was asked. I'd like the council to hear from them before it votes.
2. Hold the vote one week, and hear from the people it reaches first.
3. You decided this before tonight. This is for show.
4. Has anybody up there talked to the people this reaches? _(the page follows this one)_

**Alicia Keller:** Staff, can you answer that?

You could say:

1. Then I'd like that in writing, please. _(the page follows this one)_
2. Thank you.
3. I'm done.

**Alicia Keller:** Staff will bring us who it reaches by the next meeting.

**The whole exchange** (13 nodes; longest path 2 replies; ★ is the branch warm's traits lean toward):

- You: I've read "Restrict abortion" twice. The part that worries me is who it reaches first, and nobody on my street was asked. I'd like the council to hear from them before it votes.
  - Alicia Keller: Is your concern the bill, or how it was done?
  - You: How it was done. Ask us first, and I'll sit down.
    - Alicia Keller: Thank you. It's in the record.
    - _Ends: Your testimony is on the record_
  - You: I'm done.
    - _Ends: You left the podium: Alicia Keller: Next speaker._
- You: Hold the vote one week, and hear from the people it reaches first.
  - Alicia Keller: Staff will bring us who it reaches by the next meeting.
  - You: Then I'd like that in writing, please.
    - Alicia Keller: We can't respond to that during public comment.
    - _Ends: Gaveled down_
  - You: Thank you.
    - Alicia Keller: Staff will follow up with you by Friday.
    - _Ends: Your testimony is on the record_
  - You: I'm done.
    - _Ends: You left the podium: Alicia Keller: Next speaker._
- You: You decided this before tonight. This is for show.
  - Alicia Keller: Please address the chair, not the members.
  - _Ends: Gaveled down_
- You ★: Has anybody up there talked to the people this reaches?
  - Alicia Keller: Staff, can you answer that?
  - You ★: Then I'd like that in writing, please.
    - Alicia Keller: Staff will bring us who it reaches by the next meeting.
    - _Ends: Your change goes to the committee_
  - You: Thank you.
    - Alicia Keller: Staff will follow up with you by Friday.
    - _Ends: Your testimony is on the record_
  - You: I'm done.
    - _Ends: You left the podium: Alicia Keller: Next speaker._

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.it-s-public-comment-on-bill-name-calls-your-name-and-you-step-up-to-th]; L2 open/call-to-order/scene-talk/calm/4w1s [scene-talk.open-call-to-order.you-have-three-minutes]; L3 state/call-to-order/scene-talk/calm/9w1s [scene-talk.state-call-to-order.please-state-your-name-and-address-for-the-record]; L4 reply/tell/scene-talk/braced/33w3s [scene-talk.reply-tell.i-ve-read-bill-twice-the-part-that-worries-me-is-who-it-reaches-first-]; L5 reply/request/scene-talk/calm/13w1s [scene-talk.reply-request.hold-the-vote-one-week-and-hear-from-the-people-it-reaches-first]; L6 reply/confront/scene-talk/braced/9w2s [scene-talk.reply-confront.you-decided-this-before-tonight-this-is-for-show]; L7 reply/ask/scene-talk/braced/10w1s [scene-talk.reply-ask.has-anybody-up-there-talked-to-the-people-this-reaches]; L21 follow/answer/scene-talk/calm/5w1s [scene-talk.follow-answer.staff-can-you-answer-that]; L22 reply/request/scene-talk/calm/7w1s [scene-talk.reply-request.then-i-d-like-that-in-writing-please]; L23 reply/thank/scene-talk/calm/2w1s [scene-talk.reply-thank.thank-you]; L24 reply/leave/scene-talk/braced/2w1s [scene-talk.reply-leave.i-m-done]; L25 follow/answer/scene-talk/calm/11w1s [scene-talk.follow-answer.staff-will-bring-us-who-it-reaches-by-the-next-meeting]</sub>

## Scene 13: scandal (threat, ends in political) — proof scene

_Tests scandal-comment; the asker is warm; a lie, caught and believed, push-back, walking away. Records: remark:bill:office:gus2025:101811:board:2027-04-10:person_bc041df6bd9d1a47:59:person:press:outlet:television:0:jurisdiction_59500182da2857ae:reporter:0, bill:office:gus2025:101811:board:2027-04-10:person_bc041df6bd9d1a47:59, outlet:television:0:jurisdiction_59500182da2857ae, person:press:outlet:television:0:jurisdiction_59500182da2857ae:reporter:0, person_bc041df6bd9d1a47._

> Your phone rings at four. It's Erin Henry from Wzvr-Tv.

**Profile warm** (outcome refused)

**Erin Henry:** I'm filing at five, so I'll be quick.

**Erin Henry:** We're running a story about the "Inclusionary requirement" bill. I want to give you a chance to respond.

You could say:

1. It's true, and I should have said so sooner. Put that in. And put in that I'm fixing it.
2. That's wrong. What's the specific claim, and who's your source on the date?
3. No comment at this time. _(the page follows this one)_
4. Who gave you this?
5. I was never there. Check the minutes.

**Erin Henry:** Then I'll say you declined to comment.

**The whole exchange** (13 nodes; longest path 2 replies; ★ is the branch warm's traits lean toward):

- You: It's true, and I should have said so sooner. Put that in. And put in that I'm fixing it.
  - Erin Henry: Fixing it how?
  - You: I'm paying it back, and I've asked the clerk to post the records. You can have them tomorrow.
    - Erin Henry: That goes in too.
    - _Ends: Story runs with your apology_
  - You: I have to go.
    - _Ends: Story runs with your apology: Erin Henry: It runs at six._
- You: That's wrong. What's the specific claim, and who's your source on the date?
  - Erin Henry: I've got it from two people. Do you want to correct anything specific?
  - You: One thing: the date's wrong. I can send you the calendar.
    - Erin Henry: Send it. If it checks out, I'll change it.
    - _Ends: Story runs with your denial_
  - You: Fine. Most of it's right. Give me until four-thirty for a statement.
    - Erin Henry: Four-thirty. I'll hold the space.
    - _Ends: Story runs with your apology_
  - You: I have to go.
    - _Ends: Story runs with your denial: Erin Henry: It runs at six._
- You ★: No comment at this time.
  - Erin Henry: Then I'll say you declined to comment.
  - _Ends: Story runs: no comment_
- You: Who gave you this?
  - Erin Henry: You know I can't tell you that.
  - _Ends: You went after the source_
- You: I was never there. Check the minutes.
  - _if Erin Henry knows:_
    - Erin Henry: The minutes have you there.
    - _Ends: Caught lying to the press_
  - _if not:_
    - Erin Henry: Then I'll put that you deny it.
    - _Ends: Your lie goes in the story_

<sub>L1 narrate/narrate/scene-talk/braced/10w2s [scene-talk.narrate-narrate.your-phone-rings-at-four-it-s-name-from-outlet]; L2 open/greet/scene-talk/calm/8w1s [scene-talk.open-greet.i-m-filing-at-five-so-i-ll-be-quick]; L3 state/ask/scene-talk/calm/18w2s [scene-talk.state-ask.we-re-running-a-story-about-story-i-want-to-give-you-a-chance-to-respo]; L4 reply/confess/scene-talk/contrite/19w3s [scene-talk.reply-confess.it-s-true-and-i-should-have-said-so-sooner-put-that-in-and-put-in-that]; L5 reply/deny/scene-talk/braced/13w2s [scene-talk.reply-deny.that-s-wrong-what-s-the-specific-claim-and-who-s-your-source-on-the-da]; L6 reply/refuse/scene-talk/guarded/5w1s [scene-talk.reply-refuse.no-comment-at-this-time]; L7 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.who-gave-you-this]; L8 reply/lie/scene-talk/calm/7w2s [scene-talk.reply-lie.i-was-never-there-check-the-minutes]; L21 follow/accept/scene-talk/calm/7w1s [scene-talk.follow-accept.then-i-ll-say-you-declined-to-comment]</sub>

## Scene 14: law-takes-effect (news-received, ends in money) — proof scene

_Tests law-reaches; the asker is stubborn; push-back, walking away. Records: us-policy-positions:fiscal.graduated-income-tax|person_101b6f28a0113031|2026-11-12, law:US-DE:state:us-policy-positions:fiscal.graduated-income-tax:general:starting, person_101b6f28a0113031, official:term:seat:US-DE:lower:029:0:2026-10-12._

> You're in line at the pharmacy when Justin Le turns around.

**Profile stubborn** (outcome resolved)

**Justin Le:** You voted for it.

**Justin Le:** "Graduated income tax" took effect this month. It's costing my family real money, and I'd like to hear you explain it.

You could say:

1. I did vote for it. It was trading against a cut that would have hit more families than this one. That's not an answer for yours, I know.
2. Give me your number. I'll call before Friday.
3. This isn't the place.
4. The state forced our hand on that. _(the page follows this one)_

**Justin Le:** That's not an answer for my kids.

You could say:

1. No, it isn't. Let me see if there's a waiver. Here's my card.
2. Tell me how much. If there's a hardship waiver, I'll find it, and I'll call you myself. _(the page follows this one)_
3. I'm sorry. I have to go.

**Justin Le:** Every month. I'll hold you to it.

**The whole exchange** (11 nodes; longest path 2 replies; ★ is the branch stubborn's traits lean toward):

- You: I did vote for it. It was trading against a cut that would have hit more families than this one. That's not an answer for yours, I know.
  - Justin Le: That's not an answer for my kids.
  - You: No, it isn't. Let me see if there's a waiver. Here's my card.
    - Justin Le: At least you said it to my face.
    - _Ends: You explained your vote_
  - You: Tell me how much. If there's a hardship waiver, I'll find it, and I'll call you myself.
    - Justin Le: Every month. I'll hold you to it.
    - _Ends: You explained your vote_
  - You: I'm sorry. I have to go.
    - _Ends: They left angry: Justin Le: I'll remember this in November._
- You: Give me your number. I'll call before Friday.
  - Justin Le: Every month. I'll hold you to it.
  - _Ends: You promised to look at it_
- You: This isn't the place.
  - Justin Le: Then where is? You don't answer email.
  - _Ends: Left it there_
- You ★: The state forced our hand on that.
  - Justin Le: That's not an answer for my kids.
  - You: No, it isn't. Let me see if there's a waiver. Here's my card.
    - Justin Le: At least you said it to my face.
    - _Ends: You explained your vote_
  - You ★: Tell me how much. If there's a hardship waiver, I'll find it, and I'll call you myself.
    - Justin Le: Every month. I'll hold you to it.
    - _Ends: You promised to look at it_
  - You: I'm sorry. I have to go.
    - _Ends: You blamed someone else: Justin Le: I'll remember this in November._

Other personalities: warm leans to “The state forced our hand on that.” and it ends resolved.

<sub>L1 narrate/narrate/scene-talk/braced/11w1s [scene-talk.narrate-narrate.you-re-in-line-at-the-pharmacy-when-name-turns-around]; L2 open/greet/scene-talk/braced/4w1s [scene-talk.open-greet.you-voted-for-it]; L3 state/tell/scene-talk/braced/21w2s [scene-talk.state-tell.bill-took-effect-this-month-it-s-costing-my-family-real-money-and-i-d-]; L4 reply/tell/scene-talk/calm/28w3s [scene-talk.reply-tell.i-did-vote-for-it-it-was-trading-against-a-cut-that-would-have-hit-mor]; L5 reply/promise/scene-talk/calm/8w2s [scene-talk.reply-promise.give-me-your-number-i-ll-call-before-friday]; L6 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.this-isn-t-the-place]; L7 reply/blame/scene-talk/guarded/7w1s [scene-talk.reply-blame.the-state-forced-our-hand-on-that]; L17 follow/disagree/scene-talk/hurt/7w1s [scene-talk.follow-disagree.that-s-not-an-answer-for-my-kids]; L18 reply/tell/scene-talk/contrite/13w3s [scene-talk.reply-tell.no-it-isn-t-let-me-see-if-there-s-a-waiver-here-s-my-card]; L19 reply/promise/scene-talk/calm/17w2s [scene-talk.reply-promise.tell-me-how-much-if-there-s-a-hardship-waiver-i-ll-find-it-and-i-ll-ca]; L20 reply/leave/scene-talk/guarded/6w2s [scene-talk.reply-leave.i-m-sorry-i-have-to-go]; L22 follow/thank/scene-talk/calm/7w2s [scene-talk.follow-thank.every-month-i-ll-hold-you-to-it]</sub>

## Scene 15: layoff (loss, ends in money) — proof scene

_Tests layoff-terms; the asker is warm; a bargain, walking away. Records: person_b6f0d51289db799a:2027-07-01:job:position:organization_b74b9bd31243618a:2027-06-01:2:person_b6f0d61289db7b4d, job:position:organization_b74b9bd31243618a:2027-06-01:2:person_b6f0d61289db7b4d, organization_b74b9bd31243618a, person_565366c9720b41e5, person_b6f0d51289db799a._

> Victor Villanueva asks you into the small office and shuts the door. There's an envelope on the desk with your name on it.

**Profile warm** (outcome open)

**Victor Villanueva:** Sit down a minute.

**Victor Villanueva:** They're cutting the second shift. Your job's one of them. Friday's your last day.

You could say:

1. Why me? I've got more years than half that shift. _(the page follows this one)_
2. Two more months of pay and you'll write me a reference. Then I go quietly.
3. You knew this last week. You let me pick up Saturday.
4. Okay. What do I sign?

**Victor Villanueva:** It wasn't my list. They went by department, not years. I argued for you. I lost.

You could say:

1. Then give me two months' pay and a reference, in writing. _(the page follows this one)_
2. You argued for me. Sure.
3. I'm going to clean out my locker.

**Victor Villanueva:** I don't have that kind of money to give out. I'm sorry.

**The whole exchange** (8 nodes; longest path 2 replies; ★ is the branch warm's traits lean toward):

- You ★: Why me? I've got more years than half that shift.
  - Victor Villanueva: It wasn't my list. They went by department, not years. I argued for you. I lost.
  - You ★: Then give me two months' pay and a reference, in writing.
    - Victor Villanueva: I don't have that kind of money to give out. I'm sorry.
    - _Ends: Left it there_
  - You: You argued for me. Sure.
    - Victor Villanueva: That's not how it went.
    - _Ends: You walked out_
  - You: I'm going to clean out my locker.
    - _Ends: You walked out: Victor Villanueva: Take your time with it._
- You: Two more months of pay and you'll write me a reference. Then I go quietly.
  - Victor Villanueva: I don't have that kind of money to give out. I'm sorry.
  - _Ends: Left it there_
- You: You knew this last week. You let me pick up Saturday.
  - Victor Villanueva: That's not how it went.
  - _Ends: You walked out_
- You: Okay. What do I sign?
  - Victor Villanueva: Sign at the bottom. And I'll write the reference myself, tonight.
  - _Ends: A reference promised_

Other personalities: stubborn leans to “Why me? I've got more years than half that shift.” and it ends open.

<sub>L1 narrate/narrate/scene-talk/braced/23w2s [scene-talk.narrate-narrate.name-asks-you-into-the-small-office-and-shuts-the-door-there-s-an-enve]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sit-down-a-minute]; L3 state/deliver-news/scene-talk/solemn/14w3s [scene-talk.state-deliver-news.they-re-cutting-the-second-shift-your-job-s-one-of-them-friday-s-your-]; L4 reply/ask/scene-talk/hurt/10w2s [scene-talk.reply-ask.why-me-i-ve-got-more-years-than-half-that-shift]; L5 reply/bargain/scene-talk/braced/15w2s [scene-talk.reply-bargain.two-more-months-of-pay-and-you-ll-write-me-a-reference-then-i-go-quiet]; L6 reply/confront/scene-talk/braced/11w2s [scene-talk.reply-confront.you-knew-this-last-week-you-let-me-pick-up-saturday]; L7 reply/accept/scene-talk/calm/5w2s [scene-talk.reply-accept.okay-what-do-i-sign]; L8 follow/answer/scene-talk/solemn/16w4s [scene-talk.follow-answer.it-wasn-t-my-list-they-went-by-department-not-years-i-argued-for-you-i]; L9 reply/bargain/scene-talk/calm/11w1s [scene-talk.reply-bargain.then-give-me-two-months-pay-and-a-reference-in-writing]; L10 reply/confront/scene-talk/braced/5w2s [scene-talk.reply-confront.you-argued-for-me-sure]; L11 reply/leave/scene-talk/hurt/7w1s [scene-talk.reply-leave.i-m-going-to-clean-out-my-locker]; L12 follow/refuse/scene-talk/guarded/12w2s [scene-talk.follow-refuse.i-don-t-have-that-kind-of-money-to-give-out-i-m-sorry]</sub>

## Scene 16: eviction-notice (loss, ends in money) — proof scene

_Tests eviction-terms; the asker is warm; push-back, walking away. Records: person_5df2739ae2587c09:2027-05-23:event:housing.eviction:eviction:lease:household_e3b7a1c2299a39ab:2027-05-06, event:housing.eviction:eviction:lease:household_e3b7a1c2299a39ab:2027-05-06, person_5df2709ae25876f0, person_5df2739ae2587c09._

> Sean Robbins is on your front step with a folded paper and doesn't come in.

**Profile warm** (outcome resolved)

**Sean Robbins:** Got a minute? It's about the rent.

**Sean Robbins:** This is a notice. You've got thirty days. I'm sorry it came to this.

You could say:

1. I can pay half now and the rest on the first. My hours got cut. They're coming back.
2. Is there a hearing date on that? _(the page follows this one)_
3. You can't just put me out. I know my rights.
4. Okay. Thirty days.

**Sean Robbins:** It's on the back. The court sends its own letter.

You could say:

1. Give me till the hearing. If I can't pay by then, I'll go. _(the page follows this one)_
2. Then I'll see you at the hearing.
3. I have to go inside.

**Sean Robbins:** Half now and the rest on the first. In writing. Miss it and we're back here.

**The whole exchange** (8 nodes; longest path 2 replies; ★ is the branch warm's traits lean toward):

- You: I can pay half now and the rest on the first. My hours got cut. They're coming back.
  - Sean Robbins: Half now and the rest on the first. In writing. Miss it and we're back here.
  - _Ends: A payment plan_
- You ★: Is there a hearing date on that?
  - Sean Robbins: It's on the back. The court sends its own letter.
  - You ★: Give me till the hearing. If I can't pay by then, I'll go.
    - Sean Robbins: Half now and the rest on the first. In writing. Miss it and we're back here.
    - _Ends: A payment plan_
  - You: Then I'll see you at the hearing.
    - Sean Robbins: Bring the rent, not a lawyer.
    - _Ends: See you at the hearing_
  - You: I have to go inside.
    - _Ends: Door closed: Sean Robbins: Thirty days._
- You: You can't just put me out. I know my rights.
  - Sean Robbins: Then I'll see you in court.
  - _Ends: See you in court_
- You: Okay. Thirty days.
  - Sean Robbins: I'll give the deposit back clean if the place is clean.
  - _Ends: You'll move out_

<sub>L1 narrate/narrate/scene-talk/braced/15w1s [scene-talk.narrate-narrate.name-is-on-your-front-step-with-a-folded-paper-and-doesn-t-come-in]; L2 open/greet/scene-talk/nervous/7w2s [scene-talk.open-greet.got-a-minute-it-s-about-the-rent]; L3 state/deliver-news/scene-talk/guarded/14w3s [scene-talk.state-deliver-news.this-is-a-notice-you-ve-got-thirty-days-i-m-sorry-it-came-to-this]; L4 reply/plea/scene-talk/anxious/18w3s [scene-talk.reply-plea.i-can-pay-half-now-and-the-rest-on-the-first-my-hours-got-cut-they-re-]; L5 reply/ask/scene-talk/anxious/7w1s [scene-talk.reply-ask.is-there-a-hearing-date-on-that]; L6 reply/confront/scene-talk/braced/10w2s [scene-talk.reply-confront.you-can-t-just-put-me-out-i-know-my-rights]; L7 reply/accept/scene-talk/hurt/3w2s [scene-talk.reply-accept.okay-thirty-days]; L9 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.it-s-on-the-back-the-court-sends-its-own-letter]; L10 reply/plea/scene-talk/anxious/13w2s [scene-talk.reply-plea.give-me-till-the-hearing-if-i-can-t-pay-by-then-i-ll-go]; L11 reply/accept/scene-talk/braced/7w1s [scene-talk.reply-accept.then-i-ll-see-you-at-the-hearing]; L12 reply/leave/scene-talk/hurt/5w1s [scene-talk.reply-leave.i-have-to-go-inside]; L13 follow/accept/scene-talk/guarded/16w3s [scene-talk.follow-accept.half-now-and-the-rest-on-the-first-in-writing-miss-it-and-we-re-back-h]</sub>

## Scene 17: reunion (arrival, ends in personal) — fallback (the generic arc for its key; fired by the director)

_Tests fallback:arrival; the asker is warm; walking away. Records: person_15ba64778a4af32c:2026-10-19:cause.shared:2026-10-19:person_6863eb73f501765e:person_15ba64778a4af32c:cause:us-policy-positions:environment-energy.clean-electricity-standard, cause.shared:2026-10-19:person_6863eb73f501765e:person_15ba64778a4af32c:cause:us-policy-positions:environment-energy.clean-electricity-standard, person_6863eb73f501765e, person_15ba64778a4af32c._

> Liam Melendez is there when you walk in.

**Profile warm** (outcome open)

**Liam Melendez:** Look who made it.

**Liam Melendez:** You settling in all right?

You could say:

1. Long. I'll tell you about it after I sit down.
2. What did I miss? _(the page follows this one)_
3. Good to see a face I know.
4. Give me ten minutes to drop my things.

**Liam Melendez:** Less than you'd think. More than you'd like.

**The whole exchange** (5 nodes; longest path 1 replies; ★ is the branch warm's traits lean toward):

- You: Long. I'll tell you about it after I sit down.
  - Liam Melendez: Take your time.
  - _Ends: Welcomed in_
- You ★: What did I miss?
  - Liam Melendez: Less than you'd think. More than you'd like.
  - _Ends: Welcomed in_
- You: Good to see a face I know.
  - Liam Melendez: Take your time.
  - _Ends: Welcomed in_
- You: Give me ten minutes to drop my things.
  - _Ends: Catch up later: Liam Melendez: Glad you're here._

Other personalities: cold leans to “Give me ten minutes to drop my things.” and it ends open.

<sub>L1 narrate/narrate/scene-talk/glad/8w1s [scene-talk.narrate-narrate.name-is-there-when-you-walk-in]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-made-it]; L3 state/ask/scene-talk/curious/5w1s [scene-talk.state-ask.you-settling-in-all-right]; L4 reply/answer/scene-talk/calm/10w2s [scene-talk.reply-answer.long-i-ll-tell-you-about-it-after-i-sit-down]; L5 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.what-did-i-miss]; L6 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.good-to-see-a-face-i-know]; L7 reply/leave/scene-talk/calm/8w1s [scene-talk.reply-leave.give-me-ten-minutes-to-drop-my-things]; L9 follow/answer/scene-talk/glad/8w2s [scene-talk.follow-answer.less-than-you-d-think-more-than-you-d-like]</sub>

## Scene 18: celebration (honor, ends in personal) — fallback (the generic arc for its key; fired by the director)

_Tests fallback:honor; the asker is cold; walking away. Records: person_02140118cffd720f:2026-12-07:job:position:organization_ba65f029aa7bc179:2026-12-01:1:person_02140018cffd705c, job:position:organization_ba65f029aa7bc179:2026-12-01:1:person_02140018cffd705c, person_02140018cffd705c, person_02140118cffd720f._

> Abigail Alexander catches you with a grin.

**Profile cold** (outcome open)

**Abigail Alexander:** There you are.

**Abigail Alexander:** Well, look at you.

You could say:

1. Thanks. I'm still getting used to it.
2. Took long enough, didn't it?
3. Honestly, I didn't think it would happen. I'd stopped checking the mail.
4. It's not that big a deal. _(the page follows this one)_

**Abigail Alexander:** It's a big deal. Let somebody be happy for you.

**The whole exchange** (7 nodes; longest path 2 replies; ★ is the branch cold's traits lean toward):

- You: Thanks. I'm still getting used to it.
  - Abigail Alexander: We're celebrating. I'm not taking no.
  - _Ends: Celebrating: Abigail Alexander: Proud of you._
- You: Took long enough, didn't it?
  - Abigail Alexander: We're celebrating. I'm not taking no.
  - _Ends: Celebrating_
- You: Honestly, I didn't think it would happen. I'd stopped checking the mail.
  - Abigail Alexander: So what happens now?
  - You: Now I find out what I actually signed up for.
    - Abigail Alexander: Then we'd better celebrate before they bury you in work.
    - _Ends: Celebrating: Abigail Alexander: Proud of you._
  - You: I should get going. Thank you, really.
    - _Ends: Brushed it off: Abigail Alexander: Go. I'm buying next time._
- You ★: It's not that big a deal.
  - Abigail Alexander: It's a big deal. Let somebody be happy for you.
  - _Ends: Brushed it off_

Other personalities: warm leans to “It's not that big a deal.” and it ends open; stubborn leans to “Took long enough, didn't it?” and it ends open; boastful leans to “Took long enough, didn't it?” and it ends open.

<sub>L1 narrate/narrate/scene-talk/glad/7w1s [scene-talk.narrate-narrate.name-catches-you-with-a-grin]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/congratulate/scene-talk/glad/4w1s [scene-talk.state-congratulate.well-look-at-you]; L4 reply/thank/scene-talk/glad/7w2s [scene-talk.reply-thank.thanks-i-m-still-getting-used-to-it]; L5 reply/boast/scene-talk/proud/5w1s [scene-talk.reply-boast.took-long-enough-didn-t-it]; L6 reply/tell/scene-talk/glad/12w2s [scene-talk.reply-tell.honestly-i-didn-t-think-it-would-happen-i-d-stopped-checking-the-mail]; L7 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.it-s-not-that-big-a-deal]; L17 follow/disagree/scene-talk/glad/10w2s [scene-talk.follow-disagree.it-s-a-big-deal-let-somebody-be-happy-for-you]</sub>

## Scene 19: news-arrives (news-received, ends in personal) — fallback (the generic arc for its key; fired by the director)

_Tests fallback:news-received; the asker is warm; walking away. Records: person_f9be8df45e5d128c:2027-02-23:event:housing.eviction:eviction:lease:household_a65000c2069a87bc:2027-02-06, event:housing.eviction:eviction:lease:household_a65000c2069a87bc:2027-02-06, person_f9be8ef45e5d143f, person_f9be8df45e5d128c._

> Alicia McCarthy comes over with news.

**Profile warm** (outcome open)

**Alicia McCarthy:** Did you hear?

**Alicia McCarthy:** I've got some news, and I wanted you to hear it from me.

You could say:

1. What happened? _(the page follows this one)_
2. I heard this morning. I'm still taking it in.
3. Thanks for telling me yourself.
4. Can it wait? I've got a lot on today.

**Alicia McCarthy:** I'll tell you what I know, which isn't much yet.

**The whole exchange** (9 nodes; longest path 2 replies; ★ is the branch warm's traits lean toward):

- You ★: What happened?
  - Alicia McCarthy: I'll tell you what I know, which isn't much yet.
  - _Ends: Left it there_
- You: I heard this morning. I'm still taking it in.
  - Alicia McCarthy: Do you need anything?
  - You: I don't know yet. Ask me tomorrow.
    - Alicia McCarthy: Tomorrow, then.
    - _Ends: Heard it from a friend_
  - You: I need to sit with this a while.
    - _Ends: Put off for later: Alicia McCarthy: I'll let you know if I hear more._
- You: Thanks for telling me yourself.
  - Alicia McCarthy: Do you need anything?
  - You: I don't know yet. Ask me tomorrow.
    - Alicia McCarthy: Tomorrow, then.
    - _Ends: Heard it from a friend_
  - You: I need to sit with this a while.
    - _Ends: Put off for later: Alicia McCarthy: I'll let you know if I hear more._
- You: Can it wait? I've got a lot on today.
  - Alicia McCarthy: It can wait. Not long, though.
  - _Ends: Put off for later_

Other personalities: cold leans to “Can it wait? I've got a lot on today.” and it ends resolved.

<sub>L1 narrate/narrate/scene-talk/curious/6w1s [scene-talk.narrate-narrate.name-comes-over-with-news]; L2 open/greet/scene-talk/curious/3w1s [scene-talk.open-greet.did-you-hear]; L3 state/deliver-news/scene-talk/calm/13w1s [scene-talk.state-deliver-news.i-ve-got-some-news-and-i-wanted-you-to-hear-it-from-me]; L4 reply/ask/scene-talk/curious/2w1s [scene-talk.reply-ask.what-happened]; L5 reply/tell/scene-talk/calm/9w2s [scene-talk.reply-tell.i-heard-this-morning-i-m-still-taking-it-in]; L6 reply/thank/scene-talk/calm/5w1s [scene-talk.reply-thank.thanks-for-telling-me-yourself]; L7 reply/deflect/scene-talk/guarded/9w2s [scene-talk.reply-deflect.can-it-wait-i-ve-got-a-lot-on-today]; L8 follow/answer/scene-talk/calm/10w1s [scene-talk.follow-answer.i-ll-tell-you-what-i-know-which-isn-t-much-yet]</sub>
