# Scenes with a purpose, batch-13

Place: Brookside, Delaware (the cached played world, seed fa3bbb297a4b3ea7c25595f71a3f37a7f7fdf08dfd6801c411add18d4f9f0a45). 38 scenes of 15 situation types, composed by `composeSceneTalk` (src/director/scene-talk.ts) once per personality profile (warm, cold, stubborn, anxious, boastful); a profile is shown only where its words differ. Every scene is a **proof scene**: the director fires none of these situations in the cached year (their producers are awaited), so each is staged from the real people and records listed under it. Words come only from data/english/parts/scene-talk.json.

Grade each line 1 to 5 on naturalness, prose, sentence structure, length (too short, right, too long), creativity and trait fit.

Situations: press-interview, campaign-stop, vote-asked, vote-confirmed, bill-carry, donor-ask, party-ask, office-hours, family-filing, family-win, family-absence, rally-opponent, desk-bill, staff-news, section-bargain.

## Situations not staged

- family-loss: the cached world holds no records to stage it with

## What was stood in

- a sitting member stands in the player's seat (proof scene)
- bill names come from the government engine's records as they are
- body: State Representative
- body: State Senator
- body: county commissioner
- donors are the three largest gift records in this world ($35, $34, $29); the contribution engine sets no size at which a donor asks a favor, so these are small gifts
- the aide is the first staff record in the world, not the sponsor's own staff
- the bill has one provision, so section 1 stands for the one it bargains over
- the bill is shown before its vote, as enacted in the record
- the bill is shown before its vote, as failed in the record
- the bill is shown before its vote, as vetoed in the record
- the bill the chair names is chosen from the bill table
- the constituent is a resident whose ledger holds this moment
- the contest has one filer on record, so another filer stands in as the opponent
- the gift record names no interest, so the bill the donor cares about is chosen from the bill table
- the household member is the filer's housemate on record; the filing day's scene is not fired by the director yet
- the member's absence from home is staged; the office-day engine records the meetings but no evenings away yet
- the party's ask is staged on the filing record; the record holds no recruiting call
- the result is the voting engine's; the director does not yet fire a result scene
- the volunteer is someone the candidate knows; no volunteer record exists yet

Dropped: 64 repeated casts, 4 repeated reply sets, 16 profiles whose words matched another, 0 compositions skipped for a missing fact.

## Scene 1: press-interview (routine, ends in political) — proof scene

_Purpose press-comment. Records: interview:outlet:radio:0:jurisdiction_59500182da2857ae:filing:contest:seat:gus2025:101811:board:0:2026-11-03:person_9e002a561a4b29bc:2026-10-19:0, outlet:radio:0:jurisdiction_59500182da2857ae, person:press:outlet:radio:0:jurisdiction_59500182da2857ae:reporter:0, person_9e002a561a4b29bc._

> Michael Howell from Weom catches you on your way out.

**Profile warm** (outcome resolved)

**Michael Howell:** Got a minute for Weom?

**Michael Howell:** Can you tell me how you'll vote on "Require photo id to vote"?

You could say:

1. I'm voting for it, and you can quote me. _(the page follows this one)_
2. I'll have something to say after the vote.
3. I'm not going to talk about that.
4. Who's your source?

**Michael Howell:** What do you say to people who disagree?

You could say:

1. I'd tell them I listened, and I still disagree. _(the page follows this one)_
2. Let's not get ahead of ourselves.
3. No comment.

**Michael Howell:** That's all I needed. Thanks.

<sub>L1 narrate/narrate/scene-talk/guarded/10w1s [scene-talk.narrate-narrate.name-from-outlet-catches-you-on-your-way-out]; L2 open/greet/scene-talk/guarded/5w1s [scene-talk.open-greet.got-a-minute-for-outlet]; L3 state/ask/scene-talk/curious/13w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/proud/9w1s [scene-talk.reply-answer.i-m-voting-for-it-and-you-can-quote-me]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/confront/scene-talk/braced/3w1s [scene-talk.reply-confront.who-s-your-source]; L8 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L9 reply/answer/scene-talk/calm/9w1s [scene-talk.reply-answer.i-d-tell-them-i-listened-and-i-still-disagree]; L10 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.let-s-not-get-ahead-of-ourselves]; L11 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L12 follow/thank/scene-talk/calm/5w2s [scene-talk.follow-thank.that-s-all-i-needed-thanks]</sub>

**Profile cold** (outcome resolved)

**Michael Howell:** Got a minute for Weom?

**Michael Howell:** Can you tell me how you'll vote on "Require photo id to vote"?

You could say:

1. I'm voting for it, and you can quote me. _(the page follows this one)_
2. Let's not get ahead of ourselves.
3. No comment.
4. Who's your source?

**Michael Howell:** What do you say to people who disagree?

You could say:

1. Read the bill before you judge it. _(the page follows this one)_
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**Michael Howell:** That's all I needed. Thanks.

<sub>L1 narrate/narrate/scene-talk/guarded/10w1s [scene-talk.narrate-narrate.name-from-outlet-catches-you-on-your-way-out]; L2 open/greet/scene-talk/guarded/5w1s [scene-talk.open-greet.got-a-minute-for-outlet]; L3 state/ask/scene-talk/curious/13w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/proud/9w1s [scene-talk.reply-answer.i-m-voting-for-it-and-you-can-quote-me]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.let-s-not-get-ahead-of-ourselves]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/confront/scene-talk/braced/3w1s [scene-talk.reply-confront.who-s-your-source]; L8 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L9 reply/answer/scene-talk/braced/7w1s [scene-talk.reply-answer.read-the-bill-before-you-judge-it]; L10 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L11 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L12 follow/thank/scene-talk/calm/5w2s [scene-talk.follow-thank.that-s-all-i-needed-thanks]</sub>

**Profile stubborn** (outcome resolved)

**Michael Howell:** Got a minute for Weom?

**Michael Howell:** Can you tell me how you'll vote on "Require photo id to vote"?

You could say:

1. I'm a no, and I'll say why to anyone who asks. _(the page follows this one)_
2. Let's not get ahead of ourselves.
3. I'm not going to talk about that.
4. You've got that wrong, and you know it.

**Michael Howell:** Even if it costs you votes?

You could say:

1. Even then. It's the right call. _(the page follows this one)_
2. I'll have something to say after the vote.
3. No comment.

**Michael Howell:** Thanks for your time.

<sub>L1 narrate/narrate/scene-talk/guarded/10w1s [scene-talk.narrate-narrate.name-from-outlet-catches-you-on-your-way-out]; L2 open/greet/scene-talk/guarded/5w1s [scene-talk.open-greet.got-a-minute-for-outlet]; L3 state/ask/scene-talk/curious/13w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/braced/11w1s [scene-talk.reply-answer.i-m-a-no-and-i-ll-say-why-to-anyone-who-asks]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.let-s-not-get-ahead-of-ourselves]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-ve-got-that-wrong-and-you-know-it]; L8 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L9 reply/answer/scene-talk/calm/6w2s [scene-talk.reply-answer.even-then-it-s-the-right-call]; L10 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L11 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L12 follow/thank/scene-talk/calm/4w1s [scene-talk.follow-thank.thanks-for-your-time]</sub>

**Profile anxious** (outcome resolved)

**Michael Howell:** Got a minute for Weom?

**Michael Howell:** Can you tell me how you'll vote on "Require photo id to vote"?

You could say:

1. I'm voting for it, and you can quote me. _(the page follows this one)_
2. Let's not get ahead of ourselves.
3. I'm not going to talk about that.
4. Who's your source?

**Michael Howell:** Can I quote you on that?

You could say:

1. Go ahead. I meant every word. _(the page follows this one)_
2. I'll have something to say after the vote.
3. No comment.

**Michael Howell:** Thanks for your time.

<sub>L1 narrate/narrate/scene-talk/guarded/10w1s [scene-talk.narrate-narrate.name-from-outlet-catches-you-on-your-way-out]; L2 open/greet/scene-talk/guarded/5w1s [scene-talk.open-greet.got-a-minute-for-outlet]; L3 state/ask/scene-talk/curious/13w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/proud/9w1s [scene-talk.reply-answer.i-m-voting-for-it-and-you-can-quote-me]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.let-s-not-get-ahead-of-ourselves]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/confront/scene-talk/braced/3w1s [scene-talk.reply-confront.who-s-your-source]; L8 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L9 reply/answer/scene-talk/proud/6w2s [scene-talk.reply-answer.go-ahead-i-meant-every-word]; L10 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L11 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L12 follow/thank/scene-talk/calm/4w1s [scene-talk.follow-thank.thanks-for-your-time]</sub>

**Profile boastful** (outcome resolved)

**Michael Howell:** Mind if I ask you a few things?

**Michael Howell:** Can you tell me how you'll vote on "Require photo id to vote"?

You could say:

1. I'm voting for it, and you can quote me. _(the page follows this one)_
2. Let's not get ahead of ourselves.
3. I'm not going to talk about that.
4. Who's your source?

**Michael Howell:** Can I quote you on that?

You could say:

1. Go ahead. I meant every word. _(the page follows this one)_
2. I'll have something to say after the vote.
3. No comment.

**Michael Howell:** That's all I needed. Thanks.

<sub>L1 narrate/narrate/scene-talk/guarded/10w1s [scene-talk.narrate-narrate.name-from-outlet-catches-you-on-your-way-out]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/13w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/proud/9w1s [scene-talk.reply-answer.i-m-voting-for-it-and-you-can-quote-me]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.let-s-not-get-ahead-of-ourselves]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/confront/scene-talk/braced/3w1s [scene-talk.reply-confront.who-s-your-source]; L8 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L9 reply/answer/scene-talk/proud/6w2s [scene-talk.reply-answer.go-ahead-i-meant-every-word]; L10 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L11 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L12 follow/thank/scene-talk/calm/5w2s [scene-talk.follow-thank.that-s-all-i-needed-thanks]</sub>

## Scene 2: press-interview (routine, ends in political) — proof scene

_Purpose press-comment. Records: interview:outlet:cable:1:national:filing:contest:seat:gus2025:101811:sheriff:0:2026-11-03:person_f9be8ef45e5d143f:2026-11-02:0, outlet:cable:1:national, person:press:outlet:cable:1:national:reporter:0, person_f9be8ef45e5d143f._

> There's a knock at your door. It's Mark Wood from Beacon News Network.

**Profile warm** (outcome refused)

**Mark Wood:** Do you have a moment for a couple of questions?

**Mark Wood:** Can you tell me how you'll vote on "Clean electricity standard"?

You could say:

1. I'm a no, and I'll say why to anyone who asks.
2. Let's not get ahead of ourselves.
3. No comment. _(the page follows this one)_
4. You've got that wrong, and you know it.

**Mark Wood:** You'll be in the story either way.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. I'm not going to talk about that. _(the page follows this one)_
3. I'll have something to say after the vote.

**Mark Wood:** Voters will want to know where you stand.

**Mark Wood:** I'll be at the next meeting.

<sub>L1 narrate/narrate/scene-talk/guarded/13w2s [scene-talk.narrate-narrate.there-s-a-knock-at-your-door-it-s-name-from-outlet]; L2 open/greet/scene-talk/calm/10w1s [scene-talk.open-greet.do-you-have-a-moment-for-a-couple-of-questions]; L3 state/ask/scene-talk/curious/11w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/braced/11w1s [scene-talk.reply-answer.i-m-a-no-and-i-ll-say-why-to-anyone-who-asks]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.let-s-not-get-ahead-of-ourselves]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-ve-got-that-wrong-and-you-know-it]; L8 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.you-ll-be-in-the-story-either-way]; L9 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L10 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L11 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L12 follow/press/scene-talk/braced/8w1s [scene-talk.follow-press.voters-will-want-to-know-where-you-stand]; L13 close/warn/scene-talk/guarded/6w1s [scene-talk.close-warn.i-ll-be-at-the-next-meeting]</sub>

**Profile cold** (outcome refused)

**Mark Wood:** Do you have a moment for a couple of questions?

**Mark Wood:** Where do you stand on "Clean electricity standard"?

You could say:

1. I'm a no, and I'll say why to anyone who asks.
2. Let's not get ahead of ourselves.
3. No comment. _(the page follows this one)_
4. Who's your source?

**Mark Wood:** Voters will want to know where you stand.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. I'm not going to talk about that. _(the page follows this one)_
3. I'll have something to say after the vote.

**Mark Wood:** You'll be in the story either way.

**Mark Wood:** I'll be at the next meeting.

<sub>L1 narrate/narrate/scene-talk/guarded/13w2s [scene-talk.narrate-narrate.there-s-a-knock-at-your-door-it-s-name-from-outlet]; L2 open/greet/scene-talk/calm/10w1s [scene-talk.open-greet.do-you-have-a-moment-for-a-couple-of-questions]; L3 state/ask/scene-talk/curious/8w1s [scene-talk.state-ask.where-do-you-stand-on-bill]; L4 reply/answer/scene-talk/braced/11w1s [scene-talk.reply-answer.i-m-a-no-and-i-ll-say-why-to-anyone-who-asks]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.let-s-not-get-ahead-of-ourselves]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/confront/scene-talk/braced/3w1s [scene-talk.reply-confront.who-s-your-source]; L8 follow/press/scene-talk/braced/8w1s [scene-talk.follow-press.voters-will-want-to-know-where-you-stand]; L9 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L10 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L11 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L12 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.you-ll-be-in-the-story-either-way]; L13 close/warn/scene-talk/guarded/6w1s [scene-talk.close-warn.i-ll-be-at-the-next-meeting]</sub>

**Profile stubborn** (outcome refused)

**Mark Wood:** Mind if I ask you a few things?

**Mark Wood:** Where do you stand on "Clean electricity standard"?

You could say:

1. I'm a no, and I'll say why to anyone who asks.
2. I'll have something to say after the vote.
3. I'm not going to talk about that. _(the page follows this one)_
4. Who's your source?

**Mark Wood:** Voters will want to know where you stand.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. No comment. _(the page follows this one)_
3. Let's not get ahead of ourselves.

**Mark Wood:** You'll be in the story either way.

**Mark Wood:** I'll be at the next meeting.

<sub>L1 narrate/narrate/scene-talk/guarded/13w2s [scene-talk.narrate-narrate.there-s-a-knock-at-your-door-it-s-name-from-outlet]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/8w1s [scene-talk.state-ask.where-do-you-stand-on-bill]; L4 reply/answer/scene-talk/braced/11w1s [scene-talk.reply-answer.i-m-a-no-and-i-ll-say-why-to-anyone-who-asks]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/confront/scene-talk/braced/3w1s [scene-talk.reply-confront.who-s-your-source]; L8 follow/press/scene-talk/braced/8w1s [scene-talk.follow-press.voters-will-want-to-know-where-you-stand]; L9 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L10 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L11 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.let-s-not-get-ahead-of-ourselves]; L12 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.you-ll-be-in-the-story-either-way]; L13 close/warn/scene-talk/guarded/6w1s [scene-talk.close-warn.i-ll-be-at-the-next-meeting]</sub>

**Profile anxious** (outcome refused)

**Mark Wood:** Mind if I ask you a few things?

**Mark Wood:** Can you tell me how you'll vote on "Clean electricity standard"?

You could say:

1. I'm a no, and I'll say why to anyone who asks.
2. Let's not get ahead of ourselves.
3. I'm not going to talk about that. _(the page follows this one)_
4. You've got that wrong, and you know it.

**Mark Wood:** You'll be in the story either way.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. No comment. _(the page follows this one)_
3. I'll have something to say after the vote.

**Mark Wood:** Voters will want to know where you stand.

**Mark Wood:** I'll be at the next meeting.

<sub>L1 narrate/narrate/scene-talk/guarded/13w2s [scene-talk.narrate-narrate.there-s-a-knock-at-your-door-it-s-name-from-outlet]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/11w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/braced/11w1s [scene-talk.reply-answer.i-m-a-no-and-i-ll-say-why-to-anyone-who-asks]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.let-s-not-get-ahead-of-ourselves]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-ve-got-that-wrong-and-you-know-it]; L8 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.you-ll-be-in-the-story-either-way]; L9 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L10 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L11 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L12 follow/press/scene-talk/braced/8w1s [scene-talk.follow-press.voters-will-want-to-know-where-you-stand]; L13 close/warn/scene-talk/guarded/6w1s [scene-talk.close-warn.i-ll-be-at-the-next-meeting]</sub>

**Profile boastful** (outcome refused)

**Mark Wood:** Do you have a moment for a couple of questions?

**Mark Wood:** Can you tell me how you'll vote on "Clean electricity standard"?

You could say:

1. I'm a no, and I'll say why to anyone who asks.
2. Let's not get ahead of ourselves.
3. I'm not going to talk about that. _(the page follows this one)_
4. You've got that wrong, and you know it.

**Mark Wood:** You'll be in the story either way.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. No comment. _(the page follows this one)_
3. I'll have something to say after the vote.

**Mark Wood:** Voters will want to know where you stand.

**Mark Wood:** I'll be at the next meeting.

<sub>L1 narrate/narrate/scene-talk/guarded/13w2s [scene-talk.narrate-narrate.there-s-a-knock-at-your-door-it-s-name-from-outlet]; L2 open/greet/scene-talk/calm/10w1s [scene-talk.open-greet.do-you-have-a-moment-for-a-couple-of-questions]; L3 state/ask/scene-talk/curious/11w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/braced/11w1s [scene-talk.reply-answer.i-m-a-no-and-i-ll-say-why-to-anyone-who-asks]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.let-s-not-get-ahead-of-ourselves]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-ve-got-that-wrong-and-you-know-it]; L8 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.you-ll-be-in-the-story-either-way]; L9 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L10 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L11 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L12 follow/press/scene-talk/braced/8w1s [scene-talk.follow-press.voters-will-want-to-know-where-you-stand]; L13 close/warn/scene-talk/guarded/6w1s [scene-talk.close-warn.i-ll-be-at-the-next-meeting]</sub>

## Scene 3: press-interview (routine, ends in political) — proof scene

_Purpose press-comment. Records: interview:outlet:magazine:0:national:filing:contest:seat:gus2025:101811:treasurer:0:2026-11-03:person_6863e973f50172f8:2026-10-26:0, outlet:magazine:0:national, person:press:outlet:magazine:0:national:reporter:0, person_6863e973f50172f8._

> There's a knock at your door. It's Jimmy Reese from The Groundswell.

**Profile warm** (outcome resolved)

**Jimmy Reese:** Mind if I ask you a few things?

**Jimmy Reese:** Can you tell me how you'll vote on "Public sector collective bargaining"?

You could say:

1. I'm voting for it, and you can quote me. _(the page follows this one)_
2. I'll have something to say after the vote.
3. No comment.
4. Who's your source?

**Jimmy Reese:** Thanks for your time.

**If you push back:** (outcome resolved)

You could say:

1. I'm voting for it, and you can quote me.
2. I'll have something to say after the vote.
3. No comment.
4. Who's your source? _(the page follows this one)_

**Jimmy Reese:** We have it on the record. I'm just giving you a chance to respond.

You could say:

1. Then let me answer it on the record. _(the page follows this one)_
2. I'm not going to talk about that.
3. You've got that wrong, and you know it.

**Jimmy Reese:** That's all I needed. Thanks.

<sub>L1 narrate/narrate/scene-talk/guarded/12w2s [scene-talk.narrate-narrate.there-s-a-knock-at-your-door-it-s-name-from-outlet]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/12w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/proud/9w1s [scene-talk.reply-answer.i-m-voting-for-it-and-you-can-quote-me]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/confront/scene-talk/braced/3w1s [scene-talk.reply-confront.who-s-your-source]; L8 follow/thank/scene-talk/calm/4w1s [scene-talk.follow-thank.thanks-for-your-time]</sub>

**Profile stubborn** (outcome resolved)

**Jimmy Reese:** Mind if I ask you a few things?

**Jimmy Reese:** Can you tell me how you'll vote on "Public sector collective bargaining"?

You could say:

1. I'm a no, and I'll say why to anyone who asks. _(the page follows this one)_
2. I'll have something to say after the vote.
3. No comment.
4. You've got that wrong, and you know it.

**Jimmy Reese:** What do you say to people who disagree?

You could say:

1. Read the bill before you judge it. _(the page follows this one)_
2. Let's not get ahead of ourselves.
3. I'm not going to talk about that.

**Jimmy Reese:** Thanks for your time.

<sub>L1 narrate/narrate/scene-talk/guarded/12w2s [scene-talk.narrate-narrate.there-s-a-knock-at-your-door-it-s-name-from-outlet]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/12w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/braced/11w1s [scene-talk.reply-answer.i-m-a-no-and-i-ll-say-why-to-anyone-who-asks]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-ve-got-that-wrong-and-you-know-it]; L8 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L9 reply/answer/scene-talk/braced/7w1s [scene-talk.reply-answer.read-the-bill-before-you-judge-it]; L10 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.let-s-not-get-ahead-of-ourselves]; L11 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L12 follow/thank/scene-talk/calm/4w1s [scene-talk.follow-thank.thanks-for-your-time]</sub>

**Profile anxious** (outcome resolved)

**Jimmy Reese:** Mind if I ask you a few things?

**Jimmy Reese:** Where do you stand on "Public sector collective bargaining"?

You could say:

1. I'm voting for it, and you can quote me. _(the page follows this one)_
2. Let's not get ahead of ourselves.
3. I'm not going to talk about that.
4. Who's your source?

**Jimmy Reese:** Thanks for your time.

<sub>L1 narrate/narrate/scene-talk/guarded/12w2s [scene-talk.narrate-narrate.there-s-a-knock-at-your-door-it-s-name-from-outlet]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/9w1s [scene-talk.state-ask.where-do-you-stand-on-bill]; L4 reply/answer/scene-talk/proud/9w1s [scene-talk.reply-answer.i-m-voting-for-it-and-you-can-quote-me]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.let-s-not-get-ahead-of-ourselves]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/confront/scene-talk/braced/3w1s [scene-talk.reply-confront.who-s-your-source]; L8 follow/thank/scene-talk/calm/4w1s [scene-talk.follow-thank.thanks-for-your-time]</sub>

## Scene 4: campaign-stop (vote-wanted, ends in political) — proof scene

_Purpose rally-volunteer. Records: filing:contest:seat:gus2025:101811:treasurer:0:2026-11-03:person_6863e973f50172f8, person_565365c9720b4032, person_6863e973f50172f8._

> Your volunteers are packing up the signs. Emily Villanueva catches you before you leave.

**Profile warm** (outcome resolved)

**Emily Villanueva:** Great rally.

**Emily Villanueva:** We need more people. Can you help us find them?

You could say:

1. I'll be at the doors with you this weekend.
2. Keep them coming back. That's all I need.
3. Just keep showing up. Thank you, all of you. _(the page follows this one)_
4. Let's talk about it at the office.

**Emily Villanueva:** So what's next?

You could say:

1. Find me more people for the doors.
2. I'll come by the office tomorrow and thank everyone. _(the page follows this one)_

**Emily Villanueva:** That's all we need to hear.

<sub>L1 narrate/narrate/scene-talk/glad/14w2s [scene-talk.narrate-narrate.your-volunteers-are-packing-up-the-signs-name-catches-you-before-you-l]; L2 open/greet/scene-talk/glad/2w1s [scene-talk.open-greet.great-rally]; L3 state/request/scene-talk/eager/10w2s [scene-talk.state-request.we-need-more-people-can-you-help-us-find-them]; L4 reply/promise/scene-talk/eager/9w1s [scene-talk.reply-promise.i-ll-be-at-the-doors-with-you-this-weekend]; L5 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L8 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L9 reply/request/scene-talk/eager/7w1s [scene-talk.reply-request.find-me-more-people-for-the-doors]; L10 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L11 follow/thank/scene-talk/glad/6w1s [scene-talk.follow-thank.that-s-all-we-need-to-hear]</sub>

**Profile cold** (outcome resolved)

**Emily Villanueva:** They loved you up there.

**Emily Villanueva:** We need more people. Can you help us find them?

You could say:

1. I'll be at the doors with you this weekend.
2. Keep them coming back. That's all I need.
3. Just keep showing up. Thank you, all of you. _(the page follows this one)_
4. Let's talk about it at the office.

**Emily Villanueva:** So what's next?

You could say:

1. Find me more people for the doors.
2. I'll come by the office tomorrow and thank everyone. _(the page follows this one)_

**Emily Villanueva:** That's all we need to hear.

<sub>L1 narrate/narrate/scene-talk/glad/14w2s [scene-talk.narrate-narrate.your-volunteers-are-packing-up-the-signs-name-catches-you-before-you-l]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/10w2s [scene-talk.state-request.we-need-more-people-can-you-help-us-find-them]; L4 reply/promise/scene-talk/eager/9w1s [scene-talk.reply-promise.i-ll-be-at-the-doors-with-you-this-weekend]; L5 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L8 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L9 reply/request/scene-talk/eager/7w1s [scene-talk.reply-request.find-me-more-people-for-the-doors]; L10 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L11 follow/thank/scene-talk/glad/6w1s [scene-talk.follow-thank.that-s-all-we-need-to-hear]</sub>

**Profile stubborn** (outcome resolved)

**Emily Villanueva:** They loved you up there.

**Emily Villanueva:** We need more people. Can you help us find them?

You could say:

1. I'll be at the doors with you this weekend.
2. Keep them coming back. That's all I need.
3. Honestly? More of what you're already doing. _(the page follows this one)_
4. Let's talk about it at the office.

**Emily Villanueva:** So what's next?

You could say:

1. Find me more people for the doors.
2. I'll come by the office tomorrow and thank everyone. _(the page follows this one)_

**Emily Villanueva:** That's all we need to hear.

<sub>L1 narrate/narrate/scene-talk/glad/14w2s [scene-talk.narrate-narrate.your-volunteers-are-packing-up-the-signs-name-catches-you-before-you-l]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/10w2s [scene-talk.state-request.we-need-more-people-can-you-help-us-find-them]; L4 reply/promise/scene-talk/eager/9w1s [scene-talk.reply-promise.i-ll-be-at-the-doors-with-you-this-weekend]; L5 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L6 reply/thank/scene-talk/tender/7w2s [scene-talk.reply-thank.honestly-more-of-what-you-re-already-doing]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L8 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L9 reply/request/scene-talk/eager/7w1s [scene-talk.reply-request.find-me-more-people-for-the-doors]; L10 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L11 follow/thank/scene-talk/glad/6w1s [scene-talk.follow-thank.that-s-all-we-need-to-hear]</sub>

**Profile anxious** (outcome resolved)

**Emily Villanueva:** They loved you up there.

**Emily Villanueva:** We need more people. Can you help us find them?

You could say:

1. I'll come by the office tomorrow and thank everyone.
2. Keep them coming back. That's all I need.
3. Honestly? More of what you're already doing. _(the page follows this one)_
4. Let's talk about it at the office.

**Emily Villanueva:** So what's next?

You could say:

1. Find me more people for the doors.
2. I'll be at the doors with you this weekend. _(the page follows this one)_

**Emily Villanueva:** That's all we need to hear.

<sub>L1 narrate/narrate/scene-talk/glad/14w2s [scene-talk.narrate-narrate.your-volunteers-are-packing-up-the-signs-name-catches-you-before-you-l]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/10w2s [scene-talk.state-request.we-need-more-people-can-you-help-us-find-them]; L4 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L5 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L6 reply/thank/scene-talk/tender/7w2s [scene-talk.reply-thank.honestly-more-of-what-you-re-already-doing]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L8 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L9 reply/request/scene-talk/eager/7w1s [scene-talk.reply-request.find-me-more-people-for-the-doors]; L10 reply/promise/scene-talk/eager/9w1s [scene-talk.reply-promise.i-ll-be-at-the-doors-with-you-this-weekend]; L11 follow/thank/scene-talk/glad/6w1s [scene-talk.follow-thank.that-s-all-we-need-to-hear]</sub>

**Profile boastful** (outcome open)

**Emily Villanueva:** Great rally.

**Emily Villanueva:** We need more people. Can you help us find them?

You could say:

1. I'll be at the doors with you this weekend.
2. Find me more people for the doors.
3. Just keep showing up. Thank you, all of you. _(the page follows this one)_
4. Let's talk about it at the office.

**Emily Villanueva:** So what's next?

You could say:

1. Keep them coming back. That's all I need. _(the page follows this one)_
2. I'll come by the office tomorrow and thank everyone.

**Emily Villanueva:** You've got it. We'll double the list.

**Emily Villanueva:** We'll be ready Saturday.

<sub>L1 narrate/narrate/scene-talk/glad/14w2s [scene-talk.narrate-narrate.your-volunteers-are-packing-up-the-signs-name-catches-you-before-you-l]; L2 open/greet/scene-talk/glad/2w1s [scene-talk.open-greet.great-rally]; L3 state/request/scene-talk/eager/10w2s [scene-talk.state-request.we-need-more-people-can-you-help-us-find-them]; L4 reply/promise/scene-talk/eager/9w1s [scene-talk.reply-promise.i-ll-be-at-the-doors-with-you-this-weekend]; L5 reply/request/scene-talk/eager/7w1s [scene-talk.reply-request.find-me-more-people-for-the-doors]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L8 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L9 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L10 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L11 follow/promise/scene-talk/eager/7w2s [scene-talk.follow-promise.you-ve-got-it-we-ll-double-the-list]; L12 close/press/scene-talk/eager/4w1s [scene-talk.close-press.we-ll-be-ready-saturday]</sub>

## Scene 5: campaign-stop (vote-wanted, ends in political) — proof scene

_Purpose rally-volunteer. Records: filing:contest:seat:gus2025:101811:sheriff:0:2026-11-03:person_f9be8ef45e5d143f, person_9c90c550f58e121a, person_f9be8ef45e5d143f._

> The rally is over and the crowd is thinning out. Justin McCarthy, one of your volunteers, comes over.

**Profile warm** (outcome open)

**Justin McCarthy:** They loved you up there.

**Justin McCarthy:** What do you need from us this week?

You could say:

1. I'll come by the office tomorrow and thank everyone.
2. Keep them coming back. That's all I need. _(the page follows this one)_
3. Honestly? More of what you're already doing.
4. Let's talk about it at the office.

**Justin McCarthy:** You've got it. We'll double the list.

**Justin McCarthy:** We'll be ready Saturday.

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/8w1s [scene-talk.state-request.what-do-you-need-from-us-this-week]; L4 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L5 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L6 reply/thank/scene-talk/tender/7w2s [scene-talk.reply-thank.honestly-more-of-what-you-re-already-doing]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L8 follow/promise/scene-talk/eager/7w2s [scene-talk.follow-promise.you-ve-got-it-we-ll-double-the-list]; L9 close/press/scene-talk/eager/4w1s [scene-talk.close-press.we-ll-be-ready-saturday]</sub>

**Profile cold** (outcome open)

**Justin McCarthy:** They loved you up there.

**Justin McCarthy:** What do you need from us this week?

You could say:

1. I'll be at the doors with you this weekend.
2. Find me more people for the doors. _(the page follows this one)_
3. Honestly? More of what you're already doing.
4. Let's talk about it at the office.

**Justin McCarthy:** You've got it. We'll double the list.

**Justin McCarthy:** We'll be ready Saturday.

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/8w1s [scene-talk.state-request.what-do-you-need-from-us-this-week]; L4 reply/promise/scene-talk/eager/9w1s [scene-talk.reply-promise.i-ll-be-at-the-doors-with-you-this-weekend]; L5 reply/request/scene-talk/eager/7w1s [scene-talk.reply-request.find-me-more-people-for-the-doors]; L6 reply/thank/scene-talk/tender/7w2s [scene-talk.reply-thank.honestly-more-of-what-you-re-already-doing]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L8 follow/promise/scene-talk/eager/7w2s [scene-talk.follow-promise.you-ve-got-it-we-ll-double-the-list]; L9 close/press/scene-talk/eager/4w1s [scene-talk.close-press.we-ll-be-ready-saturday]</sub>

**Profile boastful** (outcome open)

**Justin McCarthy:** They loved you up there.

**Justin McCarthy:** What do you need from us this week?

You could say:

1. I'll be at the doors with you this weekend.
2. Keep them coming back. That's all I need. _(the page follows this one)_
3. Honestly? More of what you're already doing.
4. Let's talk about it at the office.

**Justin McCarthy:** You've got it. We'll double the list.

**Justin McCarthy:** We'll be ready Saturday.

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/8w1s [scene-talk.state-request.what-do-you-need-from-us-this-week]; L4 reply/promise/scene-talk/eager/9w1s [scene-talk.reply-promise.i-ll-be-at-the-doors-with-you-this-weekend]; L5 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L6 reply/thank/scene-talk/tender/7w2s [scene-talk.reply-thank.honestly-more-of-what-you-re-already-doing]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L8 follow/promise/scene-talk/eager/7w2s [scene-talk.follow-promise.you-ve-got-it-we-ll-double-the-list]; L9 close/press/scene-talk/eager/4w1s [scene-talk.close-press.we-ll-be-ready-saturday]</sub>

## Scene 6: campaign-stop (vote-wanted, ends in political) — proof scene

_Purpose rally-volunteer. Records: filing:contest:seat:gus2025:101811:clerk:0:2026-11-03:person_565365c9720b4032, person_146d3a0c39cf6345, person_565365c9720b4032._

> The rally is over and the crowd is thinning out. Chloe Villanueva, one of your volunteers, comes over.

**Profile warm** (outcome resolved)

**Chloe Villanueva:** Great rally.

**Chloe Villanueva:** What do you need from us this week?

You could say:

1. I'll come by the office tomorrow and thank everyone.
2. Find me more people for the doors.
3. Just keep showing up. Thank you, all of you. _(the page follows this one)_
4. Let's talk about it at the office.

**Chloe Villanueva:** So what's next?

You could say:

1. Keep them coming back. That's all I need.
2. I'll be at the doors with you this weekend. _(the page follows this one)_

**Chloe Villanueva:** That's all we need to hear.

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/2w1s [scene-talk.open-greet.great-rally]; L3 state/request/scene-talk/eager/8w1s [scene-talk.state-request.what-do-you-need-from-us-this-week]; L4 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L5 reply/request/scene-talk/eager/7w1s [scene-talk.reply-request.find-me-more-people-for-the-doors]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L8 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L9 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L10 reply/promise/scene-talk/eager/9w1s [scene-talk.reply-promise.i-ll-be-at-the-doors-with-you-this-weekend]; L11 follow/thank/scene-talk/glad/6w1s [scene-talk.follow-thank.that-s-all-we-need-to-hear]</sub>

**Profile cold** (outcome resolved)

**Chloe Villanueva:** They loved you up there.

**Chloe Villanueva:** What do you need from us this week?

You could say:

1. I'll be at the doors with you this weekend.
2. Find me more people for the doors.
3. Just keep showing up. Thank you, all of you. _(the page follows this one)_
4. Let's talk about it at the office.

**Chloe Villanueva:** So what's next?

You could say:

1. Keep them coming back. That's all I need.
2. I'll come by the office tomorrow and thank everyone. _(the page follows this one)_

**Chloe Villanueva:** That's all we need to hear.

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/8w1s [scene-talk.state-request.what-do-you-need-from-us-this-week]; L4 reply/promise/scene-talk/eager/9w1s [scene-talk.reply-promise.i-ll-be-at-the-doors-with-you-this-weekend]; L5 reply/request/scene-talk/eager/7w1s [scene-talk.reply-request.find-me-more-people-for-the-doors]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L8 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L9 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L10 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L11 follow/thank/scene-talk/glad/6w1s [scene-talk.follow-thank.that-s-all-we-need-to-hear]</sub>

**Profile stubborn** (outcome resolved)

**Chloe Villanueva:** They loved you up there.

**Chloe Villanueva:** What do you need from us this week?

You could say:

1. I'll come by the office tomorrow and thank everyone.
2. Find me more people for the doors.
3. Just keep showing up. Thank you, all of you. _(the page follows this one)_
4. Let's talk about it at the office.

**Chloe Villanueva:** So what's next?

You could say:

1. Keep them coming back. That's all I need.
2. I'll be at the doors with you this weekend. _(the page follows this one)_

**Chloe Villanueva:** That's all we need to hear.

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/8w1s [scene-talk.state-request.what-do-you-need-from-us-this-week]; L4 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L5 reply/request/scene-talk/eager/7w1s [scene-talk.reply-request.find-me-more-people-for-the-doors]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L8 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L9 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L10 reply/promise/scene-talk/eager/9w1s [scene-talk.reply-promise.i-ll-be-at-the-doors-with-you-this-weekend]; L11 follow/thank/scene-talk/glad/6w1s [scene-talk.follow-thank.that-s-all-we-need-to-hear]</sub>

**Profile anxious** (outcome resolved)

**Chloe Villanueva:** They loved you up there.

**Chloe Villanueva:** What do you need from us this week?

You could say:

1. I'll be at the doors with you this weekend.
2. Find me more people for the doors.
3. Honestly? More of what you're already doing. _(the page follows this one)_
4. Let's talk about it at the office.

**Chloe Villanueva:** So what's next?

You could say:

1. Keep them coming back. That's all I need.
2. I'll come by the office tomorrow and thank everyone. _(the page follows this one)_

**Chloe Villanueva:** That's all we need to hear.

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/8w1s [scene-talk.state-request.what-do-you-need-from-us-this-week]; L4 reply/promise/scene-talk/eager/9w1s [scene-talk.reply-promise.i-ll-be-at-the-doors-with-you-this-weekend]; L5 reply/request/scene-talk/eager/7w1s [scene-talk.reply-request.find-me-more-people-for-the-doors]; L6 reply/thank/scene-talk/tender/7w2s [scene-talk.reply-thank.honestly-more-of-what-you-re-already-doing]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L8 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L9 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L10 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L11 follow/thank/scene-talk/glad/6w1s [scene-talk.follow-thank.that-s-all-we-need-to-hear]</sub>

**Profile boastful** (outcome resolved)

**Chloe Villanueva:** They loved you up there.

**Chloe Villanueva:** What do you need from us this week?

You could say:

1. I'll come by the office tomorrow and thank everyone.
2. Keep them coming back. That's all I need.
3. Just keep showing up. Thank you, all of you. _(the page follows this one)_
4. Let's talk about it at the office.

**Chloe Villanueva:** So what's next?

You could say:

1. Find me more people for the doors.
2. I'll be at the doors with you this weekend. _(the page follows this one)_

**Chloe Villanueva:** That's all we need to hear.

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/8w1s [scene-talk.state-request.what-do-you-need-from-us-this-week]; L4 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L5 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L8 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L9 reply/request/scene-talk/eager/7w1s [scene-talk.reply-request.find-me-more-people-for-the-doors]; L10 reply/promise/scene-talk/eager/9w1s [scene-talk.reply-promise.i-ll-be-at-the-doors-with-you-this-weekend]; L11 follow/thank/scene-talk/glad/6w1s [scene-talk.follow-thank.that-s-all-we-need-to-hear]</sub>

## Scene 7: vote-asked (vote-wanted, ends in bill) — proof scene

_Purpose ask-vote. Records: bill:office:US-DE:legislature-lower:2027-02-03:official:term:seat:US-DE:lower:001:0:2026-10-12:26, official:term:seat:US-DE:lower:036:0:2026-10-12, official:term:seat:US-DE:lower:004:0:2026-10-12, office:US-DE:legislature-lower._

> Crystal Savage has been counting votes on "Bottle deposit" all week. Now Crystal Savage is at your door.

**Profile warm** (outcome resolved)

**Crystal Savage:** Can I talk to you?

**Crystal Savage:** Can I count on you for "Bottle deposit"?

You could say:

1. Count me in. _(the page follows this one)_
2. I'm sorry, but I'm a no on "Bottle deposit".
3. Make it smaller, and you'll have my vote.
4. I need a few days.

**Crystal Savage:** You won't regret it.

**If you push back:** (outcome open)

You could say:

1. Count me in.
2. I'm sorry, but I'm a no on "Bottle deposit".
3. Make it smaller, and you'll have my vote. _(the page follows this one)_
4. I need a few days.

**Crystal Savage:** That I can live with.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-counting-votes-on-bill-all-week-now-name-is-at-your-door]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.can-i-count-on-you-for-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/calm/8w1s [scene-talk.reply-bargain.make-it-smaller-and-you-ll-have-my-vote]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

**Profile cold** (outcome refused)

**Crystal Savage:** You got a minute?

**Crystal Savage:** "Bottle deposit" comes down to a vote or two. Yours is one of them.

You could say:

1. Fine. You have it.
2. I'm sorry, but I'm a no on "Bottle deposit". _(the page follows this one)_
3. What's in it for my district?
4. I'm still weighing it.

**Crystal Savage:** I'd think hard about that.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I've made up my mind. It's no. _(the page follows this one)_
3. Don't try that with me.
4. I'll vote yes if you help me with mine.

**Crystal Savage:** People will remember this at the next election.

**Crystal Savage:** I hope you know what you're doing.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-counting-votes-on-bill-all-week-now-name-is-at-your-door]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/braced/14w2s [scene-talk.state-request.bill-comes-down-to-a-vote-or-two-yours-is-one-of-them]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 follow/threaten/scene-talk/guarded/5w1s [scene-talk.follow-threaten.i-d-think-hard-about-that]; L9 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L10 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L11 reply/confront/scene-talk/braced/5w1s [scene-talk.reply-confront.don-t-try-that-with-me]; L12 reply/bargain/scene-talk/calm/9w1s [scene-talk.reply-bargain.i-ll-vote-yes-if-you-help-me-with-mine]; L13 follow/threaten/scene-talk/braced/8w1s [scene-talk.follow-threaten.people-will-remember-this-at-the-next-election]; L14 close/warn/scene-talk/braced/7w1s [scene-talk.close-warn.i-hope-you-know-what-you-re-doing]</sub>

**Profile stubborn** (outcome refused)

**Crystal Savage:** You got a minute?

**Crystal Savage:** I'm counting votes on "Bottle deposit", and I need you.

You could say:

1. I'm with you on "Bottle deposit".
2. I can't vote for "Bottle deposit". _(the page follows this one)_
3. What's in it for my district?
4. I'm still weighing it.

**Crystal Savage:** Yes or no?

You could say:

1. You've made your point. Count me in.
2. I've made up my mind. It's no. _(the page follows this one)_
3. Make it smaller, and you'll have my vote.

**Crystal Savage:** That's not an answer.

**Crystal Savage:** You'll need friends after this vote. I won't be one.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-counting-votes-on-bill-all-week-now-name-is-at-your-door]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/hopeful/10w1s [scene-talk.state-request.i-m-counting-votes-on-bill-and-i-need-you]; L4 reply/agree/scene-talk/calm/6w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L9 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L10 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L11 reply/bargain/scene-talk/calm/8w1s [scene-talk.reply-bargain.make-it-smaller-and-you-ll-have-my-vote]; L12 follow/press/scene-talk/braced/4w1s [scene-talk.follow-press.that-s-not-an-answer]; L13 close/warn/scene-talk/braced/10w2s [scene-talk.close-warn.you-ll-need-friends-after-this-vote-i-won-t-be-one]</sub>

**Profile anxious** (outcome open)

**Crystal Savage:** Sorry to bother you.

**Crystal Savage:** Can I count on you for "Bottle deposit"?

You could say:

1. Count me in.
2. I've made up my mind. It's no.
3. What's in it for my district?
4. I need a few days. _(the page follows this one)_

**Crystal Savage:** I really need this one.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry, but I'm a no on "Bottle deposit".
3. Make it smaller, and you'll have my vote.
4. I haven't decided yet. _(the page follows this one)_

**Crystal Savage:** I wouldn't ask if it didn't matter.

**Crystal Savage:** Don't take too long.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-counting-votes-on-bill-all-week-now-name-is-at-your-door]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.can-i-count-on-you-for-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/plea/scene-talk/nervous/5w1s [scene-talk.follow-plea.i-really-need-this-one]; L9 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L10 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L11 reply/bargain/scene-talk/calm/8w1s [scene-talk.reply-bargain.make-it-smaller-and-you-ll-have-my-vote]; L12 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L13 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.i-wouldn-t-ask-if-it-didn-t-matter]; L14 close/press/scene-talk/braced/4w1s [scene-talk.close-press.don-t-take-too-long]</sub>

**Profile boastful** (outcome open)

**Crystal Savage:** Got a second?

**Crystal Savage:** Can I count on you for "Bottle deposit"?

You could say:

1. Fine. You have it.
2. I've made up my mind. It's no.
3. Make it smaller, and you'll have my vote. _(the page follows this one)_
4. I haven't decided yet.

**Crystal Savage:** That I can live with.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-counting-votes-on-bill-all-week-now-name-is-at-your-door]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.can-i-count-on-you-for-bill]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/calm/8w1s [scene-talk.reply-bargain.make-it-smaller-and-you-ll-have-my-vote]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 follow/accept/scene-talk/calm/5w1s [scene-talk.follow-accept.that-i-can-live-with]</sub>

## Scene 8: vote-asked (vote-wanted, ends in bill) — proof scene

_Purpose ask-vote. Records: bill:office:gus2025:101811:board:2027-04-10:person_bc041df6bd9d1a47:59, person_9e002a561a4b29bc, person_bf349ec8efe6104f, office:gus2025:101811:board._

> The vote on "Inclusionary requirement" is coming up. Kelly Riggs catches you outside the chamber.

**Profile warm** (outcome resolved)

**Kelly Riggs:** Is now a bad time?

**Kelly Riggs:** I'm counting votes on "Inclusionary requirement", and I need you.

You could say:

1. Count me in. _(the page follows this one)_
2. I can't vote for "Inclusionary requirement".
3. I'll vote yes if you help me with mine.
4. I need a few days.

**Kelly Riggs:** You won't regret it.

**If you push back:** (outcome open)

You could say:

1. Count me in.
2. I can't vote for "Inclusionary requirement".
3. I'll vote yes if you help me with mine.
4. I need a few days. _(the page follows this one)_

**Kelly Riggs:** You know what this means to me.

You could say:

1. Okay. For you, I'll do it.
2. I've made up my mind. It's no.
3. Make it smaller, and you'll have my vote.
4. Let me think about it. _(the page follows this one)_

**Kelly Riggs:** I'm asking as a friend.

**Kelly Riggs:** Remember this conversation.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.the-vote-on-bill-is-coming-up-name-catches-you-outside-the-chamber]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.is-now-a-bad-time]; L3 state/request/scene-talk/hopeful/10w1s [scene-talk.state-request.i-m-counting-votes-on-bill-and-i-need-you]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/calm/9w1s [scene-talk.reply-bargain.i-ll-vote-yes-if-you-help-me-with-mine]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

**Profile cold** (outcome resolved)

**Kelly Riggs:** Got a second?

**Kelly Riggs:** Can I count on you for "Inclusionary requirement"?

You could say:

1. Fine. You have it. _(the page follows this one)_
2. I can't vote for "Inclusionary requirement".
3. Make it smaller, and you'll have my vote.
4. I need a few days.

**Kelly Riggs:** Good. I'll hold you to that.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.the-vote-on-bill-is-coming-up-name-catches-you-outside-the-chamber]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.can-i-count-on-you-for-bill]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/calm/8w1s [scene-talk.reply-bargain.make-it-smaller-and-you-ll-have-my-vote]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/thank/scene-talk/guarded/6w2s [scene-talk.follow-thank.good-i-ll-hold-you-to-that]</sub>

**Profile stubborn** (outcome resolved)

**Kelly Riggs:** Have you got a few minutes?

**Kelly Riggs:** I'm counting votes on "Inclusionary requirement", and I need you.

You could say:

1. Fine. You have it. _(the page follows this one)_
2. I've made up my mind. It's no.
3. I'll vote yes if you help me with mine.
4. Give me until the vote.

**Kelly Riggs:** I knew I could count on you.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.the-vote-on-bill-is-coming-up-name-catches-you-outside-the-chamber]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/request/scene-talk/hopeful/10w1s [scene-talk.state-request.i-m-counting-votes-on-bill-and-i-need-you]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/calm/9w1s [scene-talk.reply-bargain.i-ll-vote-yes-if-you-help-me-with-mine]; L7 reply/stall/scene-talk/guarded/5w1s [scene-talk.reply-stall.give-me-until-the-vote]; L8 follow/thank/scene-talk/glad/7w1s [scene-talk.follow-thank.i-knew-i-could-count-on-you]</sub>

**Profile anxious** (outcome open)

**Kelly Riggs:** Is now a bad time?

**Kelly Riggs:** I'm counting votes on "Inclusionary requirement", and I need you.

You could say:

1. Count me in.
2. I'm sorry, but I'm a no on "Inclusionary requirement".
3. Make it smaller, and you'll have my vote.
4. I need a few days. _(the page follows this one)_

**Kelly Riggs:** You know what this means to me.

You could say:

1. Okay. For you, I'll do it.
2. I've made up my mind. It's no.
3. What's in it for my district?
4. I haven't decided yet. _(the page follows this one)_

**Kelly Riggs:** I really need this one.

**Kelly Riggs:** Remember this conversation.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.the-vote-on-bill-is-coming-up-name-catches-you-outside-the-chamber]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.is-now-a-bad-time]; L3 state/request/scene-talk/hopeful/10w1s [scene-talk.state-request.i-m-counting-votes-on-bill-and-i-need-you]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/calm/8w1s [scene-talk.reply-bargain.make-it-smaller-and-you-ll-have-my-vote]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.you-know-what-this-means-to-me]; L9 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L10 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L11 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L12 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L13 follow/plea/scene-talk/nervous/5w1s [scene-talk.follow-plea.i-really-need-this-one]; L14 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.remember-this-conversation]</sub>

**Profile boastful** (outcome resolved)

**Kelly Riggs:** Sorry to bother you.

**Kelly Riggs:** I'm counting votes on "Inclusionary requirement", and I need you.

You could say:

1. You have my vote. _(the page follows this one)_
2. I'm sorry, but I'm a no on "Inclusionary requirement".
3. I'll vote yes if you help me with mine.
4. I need a few days.

**Kelly Riggs:** Thank you. Really.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.the-vote-on-bill-is-coming-up-name-catches-you-outside-the-chamber]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/10w1s [scene-talk.state-request.i-m-counting-votes-on-bill-and-i-need-you]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/calm/9w1s [scene-talk.reply-bargain.i-ll-vote-yes-if-you-help-me-with-mine]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

## Scene 9: vote-asked (vote-wanted, ends in bill) — proof scene

_Purpose ask-vote. Records: bill:office:US-DE:legislature-upper:2027-02-13:official:term:seat:US-DE:upper:020:0:2026-10-12:35, official:term:seat:US-DE:upper:015:0:2026-10-12, official:term:seat:US-DE:upper:011:0:2026-10-12, office:US-DE:legislature-upper._

> You're going over "Stand your ground" at your desk when Brittany Tucker knocks on the open door.

**Profile warm** (outcome resolved)

**Brittany Tucker:** Have you got a few minutes?

**Brittany Tucker:** I'm counting votes on "Stand your ground", and I need you.

You could say:

1. Count me in. _(the page follows this one)_
2. I've made up my mind. It's no.
3. I'll vote yes if you help me with mine.
4. I need a few days.

**Brittany Tucker:** Thank you. I won't forget it.

**If you push back:** (outcome open)

You could say:

1. Count me in.
2. I've made up my mind. It's no.
3. I'll vote yes if you help me with mine. _(the page follows this one)_
4. I need a few days.

**Brittany Tucker:** That I can live with.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.you-re-going-over-bill-at-your-desk-when-name-knocks-on-the-open-door]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/request/scene-talk/hopeful/11w1s [scene-talk.state-request.i-m-counting-votes-on-bill-and-i-need-you]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/calm/9w1s [scene-talk.reply-bargain.i-ll-vote-yes-if-you-help-me-with-mine]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/thank/scene-talk/glad/6w2s [scene-talk.follow-thank.thank-you-i-won-t-forget-it]</sub>

**Profile cold** (outcome refused)

**Brittany Tucker:** Do you have a minute?

**Brittany Tucker:** "Stand your ground" comes down to a vote or two. Yours is one of them.

You could say:

1. You have my vote.
2. I'm sorry, but I'm a no on "Stand your ground". _(the page follows this one)_
3. I'll vote yes if you help me with mine.
4. I'm still weighing it.

**Brittany Tucker:** Then don't expect my vote on yours.

You could say:

1. You've made your point. Count me in.
2. I've made up my mind. It's no. _(the page follows this one)_
3. Are you threatening me?
4. What's in it for my district?

**Brittany Tucker:** People will remember this at the next election.

**Brittany Tucker:** You'll need friends after this vote. I won't be one.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.you-re-going-over-bill-at-your-desk-when-name-knocks-on-the-open-door]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/braced/15w2s [scene-talk.state-request.bill-comes-down-to-a-vote-or-two-yours-is-one-of-them]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/refuse/scene-talk/guarded/10w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/calm/9w1s [scene-talk.reply-bargain.i-ll-vote-yes-if-you-help-me-with-mine]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 follow/threaten/scene-talk/braced/7w1s [scene-talk.follow-threaten.then-don-t-expect-my-vote-on-yours]; L9 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L10 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L11 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L12 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L13 follow/threaten/scene-talk/braced/8w1s [scene-talk.follow-threaten.people-will-remember-this-at-the-next-election]; L14 close/warn/scene-talk/braced/10w2s [scene-talk.close-warn.you-ll-need-friends-after-this-vote-i-won-t-be-one]</sub>

**Profile stubborn** (outcome refused)

**Brittany Tucker:** You got a minute?

**Brittany Tucker:** "Stand your ground" comes down to a vote or two. Yours is one of them.

You could say:

1. I'm with you on "Stand your ground".
2. I've made up my mind. It's no. _(the page follows this one)_
3. Make it smaller, and you'll have my vote.
4. Let me think about it.

**Brittany Tucker:** What would it take?

You could say:

1. You've made your point. Count me in.
2. I can't vote for "Stand your ground". _(the page follows this one)_
3. I'll vote yes if you help me with mine.

**Brittany Tucker:** I need to know before the vote.

**Brittany Tucker:** Remember this conversation.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.you-re-going-over-bill-at-your-desk-when-name-knocks-on-the-open-door]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/braced/15w2s [scene-talk.state-request.bill-comes-down-to-a-vote-or-two-yours-is-one-of-them]; L4 reply/agree/scene-talk/calm/7w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/calm/8w1s [scene-talk.reply-bargain.make-it-smaller-and-you-ll-have-my-vote]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 follow/press/scene-talk/calm/4w1s [scene-talk.follow-press.what-would-it-take]; L9 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L10 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L11 reply/bargain/scene-talk/calm/9w1s [scene-talk.reply-bargain.i-ll-vote-yes-if-you-help-me-with-mine]; L12 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-to-know-before-the-vote]; L13 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.remember-this-conversation]</sub>

**Profile anxious** (outcome open)

**Brittany Tucker:** Sorry to bother you.

**Brittany Tucker:** I'm counting votes on "Stand your ground", and I need you.

You could say:

1. Fine. You have it.
2. I've made up my mind. It's no.
3. I'll vote yes if you help me with mine.
4. I need a few days. _(the page follows this one)_

**Brittany Tucker:** I really need this one.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry, but I'm a no on "Stand your ground".
3. What's in it for my district?
4. Give me until the vote. _(the page follows this one)_

**Brittany Tucker:** You know what this means to me.

**Brittany Tucker:** Think it over. I'll be back tomorrow.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.you-re-going-over-bill-at-your-desk-when-name-knocks-on-the-open-door]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/11w1s [scene-talk.state-request.i-m-counting-votes-on-bill-and-i-need-you]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/calm/9w1s [scene-talk.reply-bargain.i-ll-vote-yes-if-you-help-me-with-mine]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/plea/scene-talk/nervous/5w1s [scene-talk.follow-plea.i-really-need-this-one]; L9 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L10 reply/refuse/scene-talk/guarded/10w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L11 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L12 reply/stall/scene-talk/guarded/5w1s [scene-talk.reply-stall.give-me-until-the-vote]; L13 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.you-know-what-this-means-to-me]; L14 close/press/scene-talk/braced/7w2s [scene-talk.close-press.think-it-over-i-ll-be-back-tomorrow]</sub>

**Profile boastful** (outcome open)

**Brittany Tucker:** Do you have a minute?

**Brittany Tucker:** I'm counting votes on "Stand your ground", and I need you.

You could say:

1. Count me in.
2. I've made up my mind. It's no.
3. What's in it for my district? _(the page follows this one)_
4. Give me until the vote.

**Brittany Tucker:** That I can live with.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.you-re-going-over-bill-at-your-desk-when-name-knocks-on-the-open-door]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/11w1s [scene-talk.state-request.i-m-counting-votes-on-bill-and-i-need-you]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/guarded/5w1s [scene-talk.reply-stall.give-me-until-the-vote]; L8 follow/accept/scene-talk/calm/5w1s [scene-talk.follow-accept.that-i-can-live-with]</sub>

## Scene 10: vote-confirmed (vote-wanted, ends in bill) — proof scene

_Purpose confirm-vote. Records: bill:office:gus2025:101811:board:2027-04-10:person_bc041df6bd9d1a47:59, person_bc041df6bd9d1a47, person_d3c12275ee46b085, office:gus2025:101811:board, promise:past:seat:gus2025:101811:board:6:2022-11-08:us-policy-positions:housing-land-use.inclusionary-requirement._

> Alicia Keller stops by your office. You told Alicia Keller you'd vote yes on "Inclusionary requirement".

**Profile warm** (outcome resolved)

**Alicia Keller:** Got a second?

**Alicia Keller:** You're still a yes on "Inclusionary requirement"?

You could say:

1. I'm with you on "Inclusionary requirement". _(the page follows this one)_
2. I'm really worried about this vote. I can't do it.
3. Make it smaller, and you'll have my vote.
4. Give me until the vote.

**Alicia Keller:** Thank you. Really.

**If you push back:** (outcome open)

You could say:

1. I'm with you on "Inclusionary requirement".
2. I'm really worried about this vote. I can't do it.
3. Make it smaller, and you'll have my vote.
4. Give me until the vote. _(the page follows this one)_

**Alicia Keller:** You know what this means to me.

You could say:

1. All right. You win. I'm in.
2. I've made up my mind. It's no.
3. I'll vote yes if you help me with mine.
4. Let me think about it. _(the page follows this one)_

**Alicia Keller:** Please. Think about the people this helps.

**Alicia Keller:** You'll need friends after this vote. I won't be one.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.name-stops-by-your-office-you-told-name-you-d-vote-yes-on-bill]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/ask/scene-talk/calm/7w1s [scene-talk.state-ask.you-re-still-a-yes-on-bill]; L4 reply/agree/scene-talk/calm/6w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/calm/8w1s [scene-talk.reply-bargain.make-it-smaller-and-you-ll-have-my-vote]; L7 reply/stall/scene-talk/guarded/5w1s [scene-talk.reply-stall.give-me-until-the-vote]; L8 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile cold** (outcome resolved)

**Alicia Keller:** I won't take long.

**Alicia Keller:** You're still a yes on "Inclusionary requirement"?

You could say:

1. Fine. You have it. _(the page follows this one)_
2. I'm really worried about this vote. I can't do it.
3. What's in it for my district?
4. I need a few days.

**Alicia Keller:** Thank you. Really.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.name-stops-by-your-office-you-told-name-you-d-vote-yes-on-bill]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.i-won-t-take-long]; L3 state/ask/scene-talk/calm/7w1s [scene-talk.state-ask.you-re-still-a-yes-on-bill]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile stubborn** (outcome resolved)

**Alicia Keller:** You got a minute?

**Alicia Keller:** I told the others I had your vote on "Inclusionary requirement". Do I?

You could say:

1. I'm with you on "Inclusionary requirement". _(the page follows this one)_
2. I'm really worried about this vote. I can't do it.
3. Make it smaller, and you'll have my vote.
4. Let me think about it.

**Alicia Keller:** Good. I'll hold you to that.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.name-stops-by-your-office-you-told-name-you-d-vote-yes-on-bill]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/ask/scene-talk/anxious/13w2s [scene-talk.state-ask.i-told-the-others-i-had-your-vote-on-bill-do-i]; L4 reply/agree/scene-talk/calm/6w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/calm/8w1s [scene-talk.reply-bargain.make-it-smaller-and-you-ll-have-my-vote]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 follow/thank/scene-talk/guarded/6w2s [scene-talk.follow-thank.good-i-ll-hold-you-to-that]</sub>

**Profile anxious** (outcome open)

**Alicia Keller:** I won't take long.

**Alicia Keller:** We're still good on "Inclusionary requirement", right?

You could say:

1. I'm with you on "Inclusionary requirement".
2. I know I told you yes, but I can't this time.
3. I'll vote yes if you help me with mine.
4. I need a few days. _(the page follows this one)_

**Alicia Keller:** I really need this one.

You could say:

1. All right. You win. I'm in.
2. I can't vote for "Inclusionary requirement".
3. Make it smaller, and you'll have my vote.
4. Let me think about it. _(the page follows this one)_

**Alicia Keller:** Please. Think about the people this helps.

**Alicia Keller:** You'll need friends after this vote. I won't be one.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.name-stops-by-your-office-you-told-name-you-d-vote-yes-on-bill]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.i-won-t-take-long]; L3 state/ask/scene-talk/calm/7w1s [scene-talk.state-ask.we-re-still-good-on-bill-right]; L4 reply/agree/scene-talk/calm/6w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/withdraw/scene-talk/contrite/11w1s [scene-talk.reply-withdraw.i-know-i-told-you-yes-but-i-can-t-this-time]; L6 reply/bargain/scene-talk/calm/9w1s [scene-talk.reply-bargain.i-ll-vote-yes-if-you-help-me-with-mine]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/plea/scene-talk/nervous/5w1s [scene-talk.follow-plea.i-really-need-this-one]; L9 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L10 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L11 reply/bargain/scene-talk/calm/8w1s [scene-talk.reply-bargain.make-it-smaller-and-you-ll-have-my-vote]; L12 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L13 follow/plea/scene-talk/tender/7w2s [scene-talk.follow-plea.please-think-about-the-people-this-helps]; L14 close/warn/scene-talk/braced/10w2s [scene-talk.close-warn.you-ll-need-friends-after-this-vote-i-won-t-be-one]</sub>

**Profile boastful** (outcome resolved)

**Alicia Keller:** Got a second?

**Alicia Keller:** You're still a yes on "Inclusionary requirement"?

You could say:

1. I'm with you on "Inclusionary requirement". _(the page follows this one)_
2. I'm really worried about this vote. I can't do it.
3. Make it smaller, and you'll have my vote.
4. Give me until the vote.

**Alicia Keller:** Thank you. I won't forget it.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.name-stops-by-your-office-you-told-name-you-d-vote-yes-on-bill]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/ask/scene-talk/calm/7w1s [scene-talk.state-ask.you-re-still-a-yes-on-bill]; L4 reply/agree/scene-talk/calm/6w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/calm/8w1s [scene-talk.reply-bargain.make-it-smaller-and-you-ll-have-my-vote]; L7 reply/stall/scene-talk/guarded/5w1s [scene-talk.reply-stall.give-me-until-the-vote]; L8 follow/thank/scene-talk/glad/6w2s [scene-talk.follow-thank.thank-you-i-won-t-forget-it]</sub>

## Scene 11: vote-confirmed (vote-wanted, ends in bill) — proof scene

_Purpose confirm-vote. Records: bill:office:gus2025:101811:board:2026-10-27:person_a52334a2a50177be:2, person_9e002a561a4b29bc, person_bf349ec8efe6104f, office:gus2025:101811:board, promise:person_bf349ec8efe6104f:2026-11-02:interview:outlet:cable:0:national:us-policy-positions:housing-land-use.allow-multifamily-in-single-family-zones._

> You promised Kelly Riggs your vote on "Allow multifamily in single family zones". Kelly Riggs is at your door to make sure.

**Profile warm** (outcome resolved)

**Kelly Riggs:** I won't take long.

**Kelly Riggs:** I told the others I had your vote on "Allow multifamily in single family zones". Do I?

You could say:

1. Count me in. _(the page follows this one)_
2. I'm really worried about this vote. I can't do it.
3. I'll vote yes if you help me with mine.
4. Let me think about it.

**Kelly Riggs:** I knew I could count on you.

**If you push back:** (outcome open)

You could say:

1. Count me in.
2. I'm really worried about this vote. I can't do it.
3. I'll vote yes if you help me with mine.
4. Let me think about it. _(the page follows this one)_

**Kelly Riggs:** I really need this one.

You could say:

1. Okay. For you, I'll do it.
2. I've made up my mind. It's no.
3. Make it smaller, and you'll have my vote.
4. I need a few days. _(the page follows this one)_

**Kelly Riggs:** I'm asking as a friend.

**Kelly Riggs:** Remember this conversation.

<sub>L1 narrate/narrate/scene-talk/anxious/22w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.i-won-t-take-long]; L3 state/ask/scene-talk/anxious/17w2s [scene-talk.state-ask.i-told-the-others-i-had-your-vote-on-bill-do-i]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/calm/9w1s [scene-talk.reply-bargain.i-ll-vote-yes-if-you-help-me-with-mine]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 follow/thank/scene-talk/glad/7w1s [scene-talk.follow-thank.i-knew-i-could-count-on-you]</sub>

**Profile cold** (outcome resolved)

**Kelly Riggs:** You got a minute?

**Kelly Riggs:** I told the others I had your vote on "Allow multifamily in single family zones". Do I?

You could say:

1. Count me in. _(the page follows this one)_
2. I'm really worried about this vote. I can't do it.
3. What's in it for my district?
4. I haven't decided yet.

**Kelly Riggs:** Good. I'll hold you to that.

<sub>L1 narrate/narrate/scene-talk/anxious/22w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/ask/scene-talk/anxious/17w2s [scene-talk.state-ask.i-told-the-others-i-had-your-vote-on-bill-do-i]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 follow/thank/scene-talk/guarded/6w2s [scene-talk.follow-thank.good-i-ll-hold-you-to-that]</sub>

**Profile stubborn** (outcome resolved)

**Kelly Riggs:** I won't take long.

**Kelly Riggs:** You're still a yes on "Allow multifamily in single family zones"?

You could say:

1. Count me in. _(the page follows this one)_
2. I'm really worried about this vote. I can't do it.
3. I'll vote yes if you help me with mine.
4. I'm still weighing it.

**Kelly Riggs:** Good. That's settled.

<sub>L1 narrate/narrate/scene-talk/anxious/22w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.i-won-t-take-long]; L3 state/ask/scene-talk/calm/11w1s [scene-talk.state-ask.you-re-still-a-yes-on-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/calm/9w1s [scene-talk.reply-bargain.i-ll-vote-yes-if-you-help-me-with-mine]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 follow/thank/scene-talk/calm/3w2s [scene-talk.follow-thank.good-that-s-settled]</sub>

**Profile anxious** (outcome open)

**Kelly Riggs:** Sorry to bother you.

**Kelly Riggs:** I told the others I had your vote on "Allow multifamily in single family zones". Do I?

You could say:

1. I'm with you on "Allow multifamily in single family zones".
2. I've thought it over. I can't vote for "Allow multifamily in single family zones" after all.
3. Make it smaller, and you'll have my vote.
4. I need a few days. _(the page follows this one)_

**Kelly Riggs:** I really need this one.

You could say:

1. Okay. For you, I'll do it.
2. I've made up my mind. It's no.
3. What's in it for my district?
4. Let me think about it. _(the page follows this one)_

**Kelly Riggs:** I'm asking as a friend.

**Kelly Riggs:** Remember this conversation.

<sub>L1 narrate/narrate/scene-talk/anxious/22w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/ask/scene-talk/anxious/17w2s [scene-talk.state-ask.i-told-the-others-i-had-your-vote-on-bill-do-i]; L4 reply/agree/scene-talk/calm/10w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/withdraw/scene-talk/contrite/16w2s [scene-talk.reply-withdraw.i-ve-thought-it-over-i-can-t-vote-for-bill-after-all]; L6 reply/bargain/scene-talk/calm/8w1s [scene-talk.reply-bargain.make-it-smaller-and-you-ll-have-my-vote]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/plea/scene-talk/nervous/5w1s [scene-talk.follow-plea.i-really-need-this-one]; L9 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L10 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L11 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L12 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L13 follow/plea/scene-talk/tender/5w1s [scene-talk.follow-plea.i-m-asking-as-a-friend]; L14 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.remember-this-conversation]</sub>

**Profile boastful** (outcome resolved)

**Kelly Riggs:** Do you have a minute?

**Kelly Riggs:** I told the others I had your vote on "Allow multifamily in single family zones". Do I?

You could say:

1. Count me in. _(the page follows this one)_
2. I'm really worried about this vote. I can't do it.
3. Make it smaller, and you'll have my vote.
4. I need a few days.

**Kelly Riggs:** Thank you. I won't forget it.

<sub>L1 narrate/narrate/scene-talk/anxious/22w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/ask/scene-talk/anxious/17w2s [scene-talk.state-ask.i-told-the-others-i-had-your-vote-on-bill-do-i]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/calm/8w1s [scene-talk.reply-bargain.make-it-smaller-and-you-ll-have-my-vote]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/thank/scene-talk/glad/6w2s [scene-talk.follow-thank.thank-you-i-won-t-forget-it]</sub>

## Scene 12: vote-confirmed (vote-wanted, ends in bill) — proof scene

_Purpose confirm-vote. Records: bill:office:gus2025:101811:board:2026-10-27:person_a52334a2a50177be:3, person_bf349ec8efe6104f, person_a52334a2a50177be, office:gus2025:101811:board, promise:person_a52334a2a50177be:2026-10-26:interview:outlet:cable:0:national:us-policy-positions:justice-public-safety.civilian-oversight-of-police._

> You promised Megan Nixon your vote on "Civilian oversight of police". Megan Nixon is at your door to make sure.

**Profile warm** (outcome open)

**Megan Nixon:** Do you have a minute?

**Megan Nixon:** I told the others I had your vote on "Civilian oversight of police". Do I?

You could say:

1. I'm with you on "Civilian oversight of police".
2. I gave you my word, and I'm going back on it. I'm sorry.
3. I'll vote yes if you help me with mine. _(the page follows this one)_
4. I need a few days.

**Megan Nixon:** All right. We have a deal.

<sub>L1 narrate/narrate/scene-talk/anxious/20w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/ask/scene-talk/anxious/15w2s [scene-talk.state-ask.i-told-the-others-i-had-your-vote-on-bill-do-i]; L4 reply/agree/scene-talk/calm/8w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/withdraw/scene-talk/contrite/13w2s [scene-talk.reply-withdraw.i-gave-you-my-word-and-i-m-going-back-on-it-i-m-sorry]; L6 reply/bargain/scene-talk/calm/9w1s [scene-talk.reply-bargain.i-ll-vote-yes-if-you-help-me-with-mine]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/accept/scene-talk/calm/6w2s [scene-talk.follow-accept.all-right-we-have-a-deal]</sub>

**Profile cold** (outcome open)

**Megan Nixon:** You got a minute?

**Megan Nixon:** I told the others I had your vote on "Civilian oversight of police". Do I?

You could say:

1. Fine. You have it.
2. I gave you my word, and I'm going back on it. I'm sorry.
3. What's in it for my district? _(the page follows this one)_
4. Give me until the vote.

**Megan Nixon:** All right. We have a deal.

<sub>L1 narrate/narrate/scene-talk/anxious/20w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/ask/scene-talk/anxious/15w2s [scene-talk.state-ask.i-told-the-others-i-had-your-vote-on-bill-do-i]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/withdraw/scene-talk/contrite/13w2s [scene-talk.reply-withdraw.i-gave-you-my-word-and-i-m-going-back-on-it-i-m-sorry]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/guarded/5w1s [scene-talk.reply-stall.give-me-until-the-vote]; L8 follow/accept/scene-talk/calm/6w2s [scene-talk.follow-accept.all-right-we-have-a-deal]</sub>

**Profile stubborn** (outcome open)

**Megan Nixon:** Sorry to bother you.

**Megan Nixon:** You're still a yes on "Civilian oversight of police"?

You could say:

1. Count me in.
2. I gave you my word, and I'm going back on it. I'm sorry.
3. I'll vote yes if you help me with mine. _(the page follows this one)_
4. Give me until the vote.

**Megan Nixon:** I can't make that deal.

**Megan Nixon:** Don't take too long.

<sub>L1 narrate/narrate/scene-talk/anxious/20w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/ask/scene-talk/calm/9w1s [scene-talk.state-ask.you-re-still-a-yes-on-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/withdraw/scene-talk/contrite/13w2s [scene-talk.reply-withdraw.i-gave-you-my-word-and-i-m-going-back-on-it-i-m-sorry]; L6 reply/bargain/scene-talk/calm/9w1s [scene-talk.reply-bargain.i-ll-vote-yes-if-you-help-me-with-mine]; L7 reply/stall/scene-talk/guarded/5w1s [scene-talk.reply-stall.give-me-until-the-vote]; L8 follow/refuse/scene-talk/guarded/5w1s [scene-talk.follow-refuse.i-can-t-make-that-deal]; L9 close/press/scene-talk/braced/4w1s [scene-talk.close-press.don-t-take-too-long]</sub>

**Profile anxious** (outcome open)

**Megan Nixon:** Sorry to bother you.

**Megan Nixon:** You're still a yes on "Civilian oversight of police"?

You could say:

1. Count me in.
2. I'm really worried about this vote. I can't do it.
3. Make it smaller, and you'll have my vote. _(the page follows this one)_
4. I haven't decided yet.

**Megan Nixon:** Deal.

<sub>L1 narrate/narrate/scene-talk/anxious/20w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/ask/scene-talk/calm/9w1s [scene-talk.state-ask.you-re-still-a-yes-on-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/calm/8w1s [scene-talk.reply-bargain.make-it-smaller-and-you-ll-have-my-vote]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 follow/accept/scene-talk/calm/1w1s [scene-talk.follow-accept.deal]</sub>

**Profile boastful** (outcome open)

**Megan Nixon:** You got a minute?

**Megan Nixon:** I told the others I had your vote on "Civilian oversight of police". Do I?

You could say:

1. You have my vote.
2. I gave you my word, and I'm going back on it. I'm sorry.
3. Make it smaller, and you'll have my vote. _(the page follows this one)_
4. Give me until the vote.

**Megan Nixon:** All right. We have a deal.

<sub>L1 narrate/narrate/scene-talk/anxious/20w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/ask/scene-talk/anxious/15w2s [scene-talk.state-ask.i-told-the-others-i-had-your-vote-on-bill-do-i]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/withdraw/scene-talk/contrite/13w2s [scene-talk.reply-withdraw.i-gave-you-my-word-and-i-m-going-back-on-it-i-m-sorry]; L6 reply/bargain/scene-talk/calm/8w1s [scene-talk.reply-bargain.make-it-smaller-and-you-ll-have-my-vote]; L7 reply/stall/scene-talk/guarded/5w1s [scene-talk.reply-stall.give-me-until-the-vote]; L8 follow/accept/scene-talk/calm/6w2s [scene-talk.follow-accept.all-right-we-have-a-deal]</sub>

## Scene 13: bill-carry (favor-asked, ends in bill) — proof scene

_Purpose carry-bill. Records: bill:office:gus2025:101811:board:2027-03-26:person_9e002a561a4b29bc:58, person_9e002a561a4b29bc, person_9e002b561a4b2b6f, office:gus2025:101811:board._

> Kelly Riggs has worked on "Inclusionary requirement" for months and needs someone to carry it.

**Profile warm** (outcome resolved)

**Kelly Riggs:** Sorry to bother you.

**Kelly Riggs:** Would you put your name on "Inclusionary requirement"?

You could say:

1. Of course. I'm glad you asked. _(the page follows this one)_
2. I wish I could, but I can't.
3. I'll carry it if you'll help me find the votes.
4. I haven't decided yet.

**Kelly Riggs:** Good. That's settled.

**If you push back:** (outcome open)

You could say:

1. Of course. I'm glad you asked.
2. I wish I could, but I can't.
3. I'll carry it if you'll help me find the votes. _(the page follows this one)_
4. I haven't decided yet.

**Kelly Riggs:** Deal.

<sub>L1 narrate/narrate/scene-talk/calm/15w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.would-you-put-your-name-on-bill]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L5 reply/decline/scene-talk/tender/7w1s [scene-talk.reply-decline.i-wish-i-could-but-i-can-t]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 follow/thank/scene-talk/calm/3w2s [scene-talk.follow-thank.good-that-s-settled]</sub>

**Profile cold** (outcome resolved)

**Kelly Riggs:** Sorry to bother you.

**Kelly Riggs:** Would you put your name on "Inclusionary requirement"?

You could say:

1. I'll carry it. _(the page follows this one)_
2. I can't take that on right now.
3. I'll carry it if you'll help me find the votes.
4. I haven't decided yet.

**Kelly Riggs:** Thank you. Really.

<sub>L1 narrate/narrate/scene-talk/calm/15w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.would-you-put-your-name-on-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.i-ll-carry-it]; L5 reply/decline/scene-talk/guarded/7w1s [scene-talk.reply-decline.i-can-t-take-that-on-right-now]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile stubborn** (outcome resolved)

**Kelly Riggs:** Sorry to bother you.

**Kelly Riggs:** Would you put your name on "Inclusionary requirement"?

You could say:

1. I'll carry it. _(the page follows this one)_
2. I can't take that on right now.
3. I'll carry it if you'll help me find the votes.
4. I need a few days.

**Kelly Riggs:** Thank you. Really.

<sub>L1 narrate/narrate/scene-talk/calm/15w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.would-you-put-your-name-on-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.i-ll-carry-it]; L5 reply/decline/scene-talk/guarded/7w1s [scene-talk.reply-decline.i-can-t-take-that-on-right-now]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile anxious** (outcome resolved)

**Kelly Riggs:** Sorry to bother you.

**Kelly Riggs:** Would you put your name on "Inclusionary requirement"?

You could say:

1. Of course. I'm glad you asked. _(the page follows this one)_
2. I'm not the right person to carry it.
3. I'll carry it if you'll help me find the votes.
4. Let me think about it.

**Kelly Riggs:** You won't regret it.

<sub>L1 narrate/narrate/scene-talk/calm/15w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.would-you-put-your-name-on-bill]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L5 reply/decline/scene-talk/guarded/8w1s [scene-talk.reply-decline.i-m-not-the-right-person-to-carry-it]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

**Profile boastful** (outcome resolved)

**Kelly Riggs:** You got a minute?

**Kelly Riggs:** Would you put your name on "Inclusionary requirement"?

You could say:

1. Of course. I'm glad you asked. _(the page follows this one)_
2. I can't take that on right now.
3. I'll carry it if you'll help me find the votes.
4. I need a few days.

**Kelly Riggs:** I knew I could count on you.

<sub>L1 narrate/narrate/scene-talk/calm/15w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.would-you-put-your-name-on-bill]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L5 reply/decline/scene-talk/guarded/7w1s [scene-talk.reply-decline.i-can-t-take-that-on-right-now]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/thank/scene-talk/glad/7w1s [scene-talk.follow-thank.i-knew-i-could-count-on-you]</sub>

## Scene 14: bill-carry (favor-asked, ends in bill) — proof scene

_Purpose carry-bill. Records: bill:office:US-DE:legislature-upper:2027-02-10:official:term:seat:US-DE:upper:020:0:2026-10-12:33, official:term:seat:US-DE:upper:020:0:2026-10-12, official:term:seat:US-DE:upper:017:0:2026-10-12, office:US-DE:legislature-upper._

> John Serrano comes in with a folder under one arm. It's "Legalize cannabis sales", and it needs a sponsor.

**Profile warm** (outcome resolved)

**John Serrano:** You got a minute?

**John Serrano:** I want you to carry "Legalize cannabis sales".

You could say:

1. I'll carry it. _(the page follows this one)_
2. I wish I could, but I can't.
3. I'll carry it if you'll help me find the votes.
4. I'm still weighing it.

**John Serrano:** I knew I could count on you.

**If you push back:** (outcome open)

You could say:

1. I'll carry it.
2. I wish I could, but I can't.
3. I'll carry it if you'll help me find the votes. _(the page follows this one)_
4. I'm still weighing it.

**John Serrano:** That I can live with.

<sub>L1 narrate/narrate/scene-talk/curious/19w2s [scene-talk.narrate-narrate.name-comes-in-with-a-folder-under-one-arm-it-s-bill-and-it-needs-a-spo]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.i-ll-carry-it]; L5 reply/decline/scene-talk/tender/7w1s [scene-talk.reply-decline.i-wish-i-could-but-i-can-t]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 follow/thank/scene-talk/glad/7w1s [scene-talk.follow-thank.i-knew-i-could-count-on-you]</sub>

**Profile cold** (outcome refused)

**John Serrano:** You got a minute?

**John Serrano:** I want you to carry "Legalize cannabis sales".

You could say:

1. Of course. I'm glad you asked.
2. I'm not the right person to carry it. _(the page follows this one)_
3. I'll carry it if you'll help me find the votes.
4. I'm still weighing it.

**John Serrano:** Take your time, but I need an answer.

You could say:

1. Fine. I'll do it, but this is the last time.
2. The answer is no. _(the page follows this one)_
3. I'll carry it if you'll help me find the votes.

**John Serrano:** Fair enough.

<sub>L1 narrate/narrate/scene-talk/curious/19w2s [scene-talk.narrate-narrate.name-comes-in-with-a-folder-under-one-arm-it-s-bill-and-it-needs-a-spo]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L5 reply/decline/scene-talk/guarded/8w1s [scene-talk.reply-decline.i-m-not-the-right-person-to-carry-it]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 follow/press/scene-talk/calm/8w1s [scene-talk.follow-press.take-your-time-but-i-need-an-answer]; L9 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L10 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L11 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L12 follow/accept/scene-talk/calm/2w1s [scene-talk.follow-accept.fair-enough]</sub>

**Profile stubborn** (outcome refused)

**John Serrano:** You got a minute?

**John Serrano:** I want you to carry "Legalize cannabis sales".

You could say:

1. Of course. I'm glad you asked.
2. I wish I could, but I can't. _(the page follows this one)_
3. I'll carry it if you'll help me find the votes.
4. I need a few days.

**John Serrano:** That's not an answer.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry. I just can't. _(the page follows this one)_
3. I'll carry it if you'll help me find the votes.

**John Serrano:** Please. Think about the people this helps.

**John Serrano:** Remember this conversation.

<sub>L1 narrate/narrate/scene-talk/curious/19w2s [scene-talk.narrate-narrate.name-comes-in-with-a-folder-under-one-arm-it-s-bill-and-it-needs-a-spo]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L5 reply/decline/scene-talk/tender/7w1s [scene-talk.reply-decline.i-wish-i-could-but-i-can-t]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/press/scene-talk/braced/4w1s [scene-talk.follow-press.that-s-not-an-answer]; L9 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L10 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L11 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L12 follow/plea/scene-talk/tender/7w2s [scene-talk.follow-plea.please-think-about-the-people-this-helps]; L13 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.remember-this-conversation]</sub>

**Profile anxious** (outcome open)

**John Serrano:** You got a minute?

**John Serrano:** I want you to carry "Legalize cannabis sales".

You could say:

1. I'll carry it.
2. I wish I could, but I can't.
3. I'll carry it if you'll help me find the votes.
4. I need a few days. _(the page follows this one)_

**John Serrano:** I really need this one.

You could say:

1. Okay. For you, I'll do it.
2. I can't do that.
3. I'll carry it if you'll help me find the votes.
4. I haven't decided yet. _(the page follows this one)_

**John Serrano:** Please. Think about the people this helps.

**John Serrano:** Think it over. I'll be back tomorrow.

<sub>L1 narrate/narrate/scene-talk/curious/19w2s [scene-talk.narrate-narrate.name-comes-in-with-a-folder-under-one-arm-it-s-bill-and-it-needs-a-spo]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.i-ll-carry-it]; L5 reply/decline/scene-talk/tender/7w1s [scene-talk.reply-decline.i-wish-i-could-but-i-can-t]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/plea/scene-talk/nervous/5w1s [scene-talk.follow-plea.i-really-need-this-one]; L9 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L10 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L11 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L12 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L13 follow/plea/scene-talk/tender/7w2s [scene-talk.follow-plea.please-think-about-the-people-this-helps]; L14 close/press/scene-talk/braced/7w2s [scene-talk.close-press.think-it-over-i-ll-be-back-tomorrow]</sub>

**Profile boastful** (outcome open)

**John Serrano:** You got a minute?

**John Serrano:** I want you to carry "Legalize cannabis sales".

You could say:

1. Yes. You can count on me.
2. I can't take that on right now.
3. I'll carry it if you'll help me find the votes. _(the page follows this one)_
4. I need a few days.

**John Serrano:** That I can live with.

<sub>L1 narrate/narrate/scene-talk/curious/19w2s [scene-talk.narrate-narrate.name-comes-in-with-a-folder-under-one-arm-it-s-bill-and-it-needs-a-spo]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L5 reply/decline/scene-talk/guarded/7w1s [scene-talk.reply-decline.i-can-t-take-that-on-right-now]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/accept/scene-talk/calm/5w1s [scene-talk.follow-accept.that-i-can-live-with]</sub>

## Scene 15: bill-carry (favor-asked, ends in bill) — proof scene

_Purpose carry-bill. Records: bill:office:US-DE:legislature-lower:2027-01-31:official:term:seat:US-DE:lower:008:0:2026-10-12:23, official:term:seat:US-DE:lower:008:0:2026-10-12, official:term:seat:US-DE:lower:013:0:2026-10-12, office:US-DE:legislature-lower._

> Patricia Hubbard has worked on "Civilian oversight of police" for months and needs someone to carry it.

**Profile warm** (outcome resolved)

**Patricia Hubbard:** Have you got a few minutes?

**Patricia Hubbard:** I want you to carry "Civilian oversight of police".

You could say:

1. All right. I'll do it. _(the page follows this one)_
2. I can't take that on right now.
3. I'll carry it if you'll help me find the votes.
4. I need a few days.

**Patricia Hubbard:** Good. That's settled.

**If you push back:** (outcome open)

You could say:

1. All right. I'll do it.
2. I can't take that on right now.
3. I'll carry it if you'll help me find the votes. _(the page follows this one)_
4. I need a few days.

**Patricia Hubbard:** That I can live with.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L5 reply/decline/scene-talk/guarded/7w1s [scene-talk.reply-decline.i-can-t-take-that-on-right-now]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/thank/scene-talk/calm/3w2s [scene-talk.follow-thank.good-that-s-settled]</sub>

**Profile cold** (outcome refused)

**Patricia Hubbard:** You got a minute?

**Patricia Hubbard:** I want you to carry "Civilian oversight of police".

You could say:

1. Yes. You can count on me.
2. I can't take that on right now. _(the page follows this one)_
3. I'll carry it if you'll help me find the votes.
4. I need a few days.

**Patricia Hubbard:** That's not an answer.

You could say:

1. All right. You win. I'm in.
2. The answer is no. _(the page follows this one)_
3. I'll carry it if you'll help me find the votes.

**Patricia Hubbard:** Suit yourself.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L5 reply/decline/scene-talk/guarded/7w1s [scene-talk.reply-decline.i-can-t-take-that-on-right-now]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/press/scene-talk/braced/4w1s [scene-talk.follow-press.that-s-not-an-answer]; L9 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L10 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L11 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L12 follow/accept/scene-talk/guarded/2w1s [scene-talk.follow-accept.suit-yourself]</sub>

**Profile stubborn** (outcome refused)

**Patricia Hubbard:** You got a minute?

**Patricia Hubbard:** I want you to carry "Civilian oversight of police".

You could say:

1. All right. I'll do it.
2. I'm not the right person to carry it. _(the page follows this one)_
3. I'll carry it if you'll help me find the votes.
4. I need a few days.

**Patricia Hubbard:** Yes or no?

You could say:

1. Fine. I'll do it, but this is the last time.
2. The answer is no. _(the page follows this one)_
3. I'll carry it if you'll help me find the votes.

**Patricia Hubbard:** Take your time, but I need an answer.

**Patricia Hubbard:** Remember this conversation.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L5 reply/decline/scene-talk/guarded/8w1s [scene-talk.reply-decline.i-m-not-the-right-person-to-carry-it]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L9 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L10 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L11 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L12 follow/press/scene-talk/calm/8w1s [scene-talk.follow-press.take-your-time-but-i-need-an-answer]; L13 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.remember-this-conversation]</sub>

**Profile anxious** (outcome open)

**Patricia Hubbard:** Sorry to bother you.

**Patricia Hubbard:** I want you to carry "Civilian oversight of police".

You could say:

1. Of course. I'm glad you asked.
2. I'm not the right person to carry it.
3. I'll carry it if you'll help me find the votes.
4. I need a few days. _(the page follows this one)_

**Patricia Hubbard:** I really need this one.

You could say:

1. You've made your point. Count me in.
2. I can't do that.
3. I'll carry it if you'll help me find the votes.
4. Let me think about it. _(the page follows this one)_

**Patricia Hubbard:** I'm asking as a friend.

**Patricia Hubbard:** I hope you know what you're doing.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L5 reply/decline/scene-talk/guarded/8w1s [scene-talk.reply-decline.i-m-not-the-right-person-to-carry-it]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/plea/scene-talk/nervous/5w1s [scene-talk.follow-plea.i-really-need-this-one]; L9 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L10 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L11 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L12 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L13 follow/plea/scene-talk/tender/5w1s [scene-talk.follow-plea.i-m-asking-as-a-friend]; L14 close/warn/scene-talk/braced/7w1s [scene-talk.close-warn.i-hope-you-know-what-you-re-doing]</sub>

**Profile boastful** (outcome open)

**Patricia Hubbard:** Do you have a minute?

**Patricia Hubbard:** I want you to carry "Civilian oversight of police".

You could say:

1. Of course. I'm glad you asked.
2. I can't take that on right now.
3. I'll carry it if you'll help me find the votes. _(the page follows this one)_
4. I need a few days.

**Patricia Hubbard:** That I can live with.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L5 reply/decline/scene-talk/guarded/7w1s [scene-talk.reply-decline.i-can-t-take-that-on-right-now]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/accept/scene-talk/calm/5w1s [scene-talk.follow-accept.that-i-can-live-with]</sub>

## Scene 16: donor-ask (favor-asked, ends in money) — proof scene

_Purpose donor-ask. Records: filing:contest:seat:US-DE:us-senate:1:2026-11-03:official:term:seat:US-DE:us-senate:1:2026-10-12|official:term:seat:US-DE:us-house:00:2026-10-12, filing:contest:seat:US-DE:us-senate:1:2026-11-03:official:term:seat:US-DE:us-senate:1:2026-10-12, official:term:seat:US-DE:us-house:00:2026-10-12, official:term:seat:US-DE:us-senate:1:2026-10-12._

> Julie Nolan gave $35 to your campaign. Now Julie Nolan is on the line.

**Profile warm** (outcome resolved)

**Julie Nolan:** Thanks for taking my call.

**Julie Nolan:** I've been a good friend to your campaign. Now I need you on "Ban discrimination in housing and work".

You could say:

1. I'll take the meeting. _(the page follows this one)_
2. The answer is no.
3. I'll take a meeting. I won't promise a vote.
4. That's not a conversation for today.

**Julie Nolan:** Thank you. Really.

**If you push back:** (outcome open)

You could say:

1. I'll take the meeting.
2. The answer is no.
3. I'll take a meeting. I won't promise a vote. _(the page follows this one)_
4. That's not a conversation for today.

**Julie Nolan:** All right. We have a deal.

<sub>L1 narrate/narrate/scene-talk/guarded/14w2s [scene-talk.narrate-narrate.name-gave-money-to-your-campaign-now-name-is-on-the-line]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.thanks-for-taking-my-call]; L3 state/request/scene-talk/braced/19w2s [scene-talk.state-request.i-ve-been-a-good-friend-to-your-campaign-now-i-need-you-on-bill]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.i-ll-take-the-meeting]; L5 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L6 reply/bargain/scene-talk/guarded/9w2s [scene-talk.reply-bargain.i-ll-take-a-meeting-i-won-t-promise-a-vote]; L7 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.that-s-not-a-conversation-for-today]; L8 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile cold** (outcome refused)

**Julie Nolan:** Thanks for taking my call.

**Julie Nolan:** I'd like a meeting about "Ban discrimination in housing and work". Just a meeting.

You could say:

1. All right. I'll do it.
2. I can't do that. _(the page follows this one)_
3. I'll take a meeting. I won't promise a vote.
4. Let's not get into that over the phone.

**Julie Nolan:** Don't count on my help next time.

You could say:

1. Fine. I'll do it, but this is the last time.
2. The answer is no. _(the page follows this one)_
3. Are you threatening me?
4. I'll take a meeting. I won't promise a vote.

**Julie Nolan:** Then I'll find a candidate who listens.

**Julie Nolan:** I hope you know what you're doing.

<sub>L1 narrate/narrate/scene-talk/guarded/14w2s [scene-talk.narrate-narrate.name-gave-money-to-your-campaign-now-name-is-on-the-line]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.thanks-for-taking-my-call]; L3 state/request/scene-talk/calm/14w2s [scene-talk.state-request.i-d-like-a-meeting-about-bill-just-a-meeting]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L5 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L6 reply/bargain/scene-talk/guarded/9w2s [scene-talk.reply-bargain.i-ll-take-a-meeting-i-won-t-promise-a-vote]; L7 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.let-s-not-get-into-that-over-the-phone]; L8 follow/threaten/scene-talk/guarded/7w1s [scene-talk.follow-threaten.don-t-count-on-my-help-next-time]; L9 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L10 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L11 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L12 reply/bargain/scene-talk/guarded/9w2s [scene-talk.reply-bargain.i-ll-take-a-meeting-i-won-t-promise-a-vote]; L13 follow/threaten/scene-talk/braced/7w1s [scene-talk.follow-threaten.then-i-ll-find-a-candidate-who-listens]; L14 close/warn/scene-talk/braced/7w1s [scene-talk.close-warn.i-hope-you-know-what-you-re-doing]</sub>

**Profile stubborn** (outcome refused)

**Julie Nolan:** Thanks for taking my call.

**Julie Nolan:** I need you to take another look at "Ban discrimination in housing and work".

You could say:

1. All right. I'll do it.
2. I can't do that. _(the page follows this one)_
3. I'll take a meeting. I won't promise a vote.
4. That's not a conversation for today.

**Julie Nolan:** That's not an answer.

You could say:

1. You've made your point. Count me in.
2. I can't do that, and you shouldn't ask me to. _(the page follows this one)_
3. I'll take a meeting. I won't promise a vote.
4. Let's not get into that over the phone.

**Julie Nolan:** Don't count on my help next time.

**Julie Nolan:** I hope you know what you're doing.

<sub>L1 narrate/narrate/scene-talk/guarded/14w2s [scene-talk.narrate-narrate.name-gave-money-to-your-campaign-now-name-is-on-the-line]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.thanks-for-taking-my-call]; L3 state/request/scene-talk/calm/14w1s [scene-talk.state-request.i-need-you-to-take-another-look-at-bill]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L5 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L6 reply/bargain/scene-talk/guarded/9w2s [scene-talk.reply-bargain.i-ll-take-a-meeting-i-won-t-promise-a-vote]; L7 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.that-s-not-a-conversation-for-today]; L8 follow/press/scene-talk/braced/4w1s [scene-talk.follow-press.that-s-not-an-answer]; L9 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L10 reply/refuse/scene-talk/braced/10w1s [scene-talk.reply-refuse.i-can-t-do-that-and-you-shouldn-t-ask-me-to]; L11 reply/bargain/scene-talk/guarded/9w2s [scene-talk.reply-bargain.i-ll-take-a-meeting-i-won-t-promise-a-vote]; L12 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.let-s-not-get-into-that-over-the-phone]; L13 follow/threaten/scene-talk/guarded/7w1s [scene-talk.follow-threaten.don-t-count-on-my-help-next-time]; L14 close/warn/scene-talk/braced/7w1s [scene-talk.close-warn.i-hope-you-know-what-you-re-doing]</sub>

**Profile anxious** (outcome open)

**Julie Nolan:** Thanks for taking my call.

**Julie Nolan:** I need you to take another look at "Ban discrimination in housing and work".

You could say:

1. Of course. I'm glad you asked.
2. The answer is no.
3. I'll take a meeting. I won't promise a vote.
4. Let's not get into that over the phone. _(the page follows this one)_

**Julie Nolan:** I really need this one.

You could say:

1. Okay. For you, I'll do it.
2. I'm sorry. I just can't.
3. I'll take a meeting. I won't promise a vote.
4. I'm still weighing it. _(the page follows this one)_

**Julie Nolan:** I'm asking as a friend.

**Julie Nolan:** Remember this conversation.

<sub>L1 narrate/narrate/scene-talk/guarded/14w2s [scene-talk.narrate-narrate.name-gave-money-to-your-campaign-now-name-is-on-the-line]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.thanks-for-taking-my-call]; L3 state/request/scene-talk/calm/14w1s [scene-talk.state-request.i-need-you-to-take-another-look-at-bill]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L5 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L6 reply/bargain/scene-talk/guarded/9w2s [scene-talk.reply-bargain.i-ll-take-a-meeting-i-won-t-promise-a-vote]; L7 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.let-s-not-get-into-that-over-the-phone]; L8 follow/plea/scene-talk/nervous/5w1s [scene-talk.follow-plea.i-really-need-this-one]; L9 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L10 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L11 reply/bargain/scene-talk/guarded/9w2s [scene-talk.reply-bargain.i-ll-take-a-meeting-i-won-t-promise-a-vote]; L12 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L13 follow/plea/scene-talk/tender/5w1s [scene-talk.follow-plea.i-m-asking-as-a-friend]; L14 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.remember-this-conversation]</sub>

**Profile boastful** (outcome refused)

**Julie Nolan:** Thanks for taking my call.

**Julie Nolan:** I've been a good friend to your campaign. Now I need you on "Ban discrimination in housing and work".

You could say:

1. Yes. You can count on me.
2. I can't do that, and you shouldn't ask me to. _(the page follows this one)_
3. I'll take a meeting. I won't promise a vote.
4. Let's not get into that over the phone.

**Julie Nolan:** I'm asking as a friend.

You could say:

1. All right. You win. I'm in.
2. I'm sorry. I just can't. _(the page follows this one)_
3. I'll take a meeting. I won't promise a vote.
4. I need a few days.

**Julie Nolan:** Then I'll find a candidate who listens.

**Julie Nolan:** Remember this conversation.

<sub>L1 narrate/narrate/scene-talk/guarded/14w2s [scene-talk.narrate-narrate.name-gave-money-to-your-campaign-now-name-is-on-the-line]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.thanks-for-taking-my-call]; L3 state/request/scene-talk/braced/19w2s [scene-talk.state-request.i-ve-been-a-good-friend-to-your-campaign-now-i-need-you-on-bill]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L5 reply/refuse/scene-talk/braced/10w1s [scene-talk.reply-refuse.i-can-t-do-that-and-you-shouldn-t-ask-me-to]; L6 reply/bargain/scene-talk/guarded/9w2s [scene-talk.reply-bargain.i-ll-take-a-meeting-i-won-t-promise-a-vote]; L7 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.let-s-not-get-into-that-over-the-phone]; L8 follow/plea/scene-talk/tender/5w1s [scene-talk.follow-plea.i-m-asking-as-a-friend]; L9 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L10 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L11 reply/bargain/scene-talk/guarded/9w2s [scene-talk.reply-bargain.i-ll-take-a-meeting-i-won-t-promise-a-vote]; L12 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L13 follow/threaten/scene-talk/braced/7w1s [scene-talk.follow-threaten.then-i-ll-find-a-candidate-who-listens]; L14 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.remember-this-conversation]</sub>

## Scene 17: party-ask (favor-asked, ends in political) — proof scene

_Purpose party-ask. Records: party:US-DE:democratic, filing:contest:seat:US-DE:attorney-general:2026-11-03:official:term:seat:US-DE:attorney-general:2026-10-12, contest:seat:US-DE:attorney-general:2026-11-03, person_a52334a2a50177be, official:term:seat:US-DE:attorney-general:2026-10-12._

> The phone rings. It's Jamie Alexander, the Democratic party chair.

**Profile warm** (outcome resolved)

**Jamie Alexander:** Can I talk to you?

**Jamie Alexander:** The party needs you to run for Attorney General.

You could say:

1. Yes. You can count on me. _(the page follows this one)_
2. I'm sorry. I just can't.
3. I'll think about it if the party backs me next time.
4. Let me think about it.

**Jamie Alexander:** Thank you. Really.

**If you push back:** (outcome open)

You could say:

1. Yes. You can count on me.
2. I'm sorry. I just can't.
3. I'll think about it if the party backs me next time. _(the page follows this one)_
4. Let me think about it.

**Jamie Alexander:** All right. We have a deal.

<sub>L1 narrate/narrate/scene-talk/braced/10w2s [scene-talk.narrate-narrate.the-phone-rings-it-s-name-the-party-party-chair]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L5 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L6 reply/bargain/scene-talk/guarded/11w1s [scene-talk.reply-bargain.i-ll-think-about-it-if-the-party-backs-me-next-time]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile cold** (outcome refused)

**Jamie Alexander:** You got a minute?

**Jamie Alexander:** The party needs you to run for Attorney General.

You could say:

1. All right. I'll do it.
2. I can't do that. _(the page follows this one)_
3. I'll think about it if the party backs me next time.
4. Let me think about it.

**Jamie Alexander:** Don't expect the party's help in the next race.

You could say:

1. Fine. I'll do it, but this is the last time.
2. The answer is no. _(the page follows this one)_
3. Don't try that with me.
4. I'll think about it if the party backs me next time.

**Jamie Alexander:** The party has a long memory.

**Jamie Alexander:** Remember this conversation.

<sub>L1 narrate/narrate/scene-talk/braced/10w2s [scene-talk.narrate-narrate.the-phone-rings-it-s-name-the-party-party-chair]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L5 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L6 reply/bargain/scene-talk/guarded/11w1s [scene-talk.reply-bargain.i-ll-think-about-it-if-the-party-backs-me-next-time]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 follow/threaten/scene-talk/guarded/9w1s [scene-talk.follow-threaten.don-t-expect-the-party-s-help-in-the-next-race]; L9 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L10 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L11 reply/confront/scene-talk/braced/5w1s [scene-talk.reply-confront.don-t-try-that-with-me]; L12 reply/bargain/scene-talk/guarded/11w1s [scene-talk.reply-bargain.i-ll-think-about-it-if-the-party-backs-me-next-time]; L13 follow/threaten/scene-talk/braced/6w1s [scene-talk.follow-threaten.the-party-has-a-long-memory]; L14 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.remember-this-conversation]</sub>

**Profile stubborn** (outcome refused)

**Jamie Alexander:** Can I talk to you?

**Jamie Alexander:** The party needs you to run for Attorney General.

You could say:

1. All right. I'll do it.
2. I can't do that. _(the page follows this one)_
3. I'll think about it if the party backs me next time.
4. Let me think about it.

**Jamie Alexander:** Take your time, but I need an answer.

You could say:

1. Fine. I'll do it, but this is the last time.
2. Not this time. _(the page follows this one)_
3. I'll think about it if the party backs me next time.

**Jamie Alexander:** The party has a long memory.

**Jamie Alexander:** Remember this conversation.

<sub>L1 narrate/narrate/scene-talk/braced/10w2s [scene-talk.narrate-narrate.the-phone-rings-it-s-name-the-party-party-chair]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L5 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L6 reply/bargain/scene-talk/guarded/11w1s [scene-talk.reply-bargain.i-ll-think-about-it-if-the-party-backs-me-next-time]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 follow/press/scene-talk/calm/8w1s [scene-talk.follow-press.take-your-time-but-i-need-an-answer]; L9 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L10 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L11 reply/bargain/scene-talk/guarded/11w1s [scene-talk.reply-bargain.i-ll-think-about-it-if-the-party-backs-me-next-time]; L12 follow/threaten/scene-talk/braced/6w1s [scene-talk.follow-threaten.the-party-has-a-long-memory]; L13 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.remember-this-conversation]</sub>

**Profile anxious** (outcome open)

**Jamie Alexander:** Sorry to bother you.

**Jamie Alexander:** The party needs you to run for Attorney General.

You could say:

1. Yes. You can count on me.
2. I can't do that.
3. I'll think about it if the party backs me next time.
4. I haven't decided yet. _(the page follows this one)_

**Jamie Alexander:** I really need this one.

You could say:

1. You've made your point. Count me in.
2. Not this time.
3. I'll think about it if the party backs me next time.
4. I need a few days. _(the page follows this one)_

**Jamie Alexander:** I wouldn't ask if it didn't matter.

**Jamie Alexander:** Think it over. I'll be back tomorrow.

<sub>L1 narrate/narrate/scene-talk/braced/10w2s [scene-talk.narrate-narrate.the-phone-rings-it-s-name-the-party-party-chair]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L5 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L6 reply/bargain/scene-talk/guarded/11w1s [scene-talk.reply-bargain.i-ll-think-about-it-if-the-party-backs-me-next-time]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 follow/plea/scene-talk/nervous/5w1s [scene-talk.follow-plea.i-really-need-this-one]; L9 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L10 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L11 reply/bargain/scene-talk/guarded/11w1s [scene-talk.reply-bargain.i-ll-think-about-it-if-the-party-backs-me-next-time]; L12 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L13 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.i-wouldn-t-ask-if-it-didn-t-matter]; L14 close/press/scene-talk/braced/7w2s [scene-talk.close-press.think-it-over-i-ll-be-back-tomorrow]</sub>

**Profile boastful** (outcome open)

**Jamie Alexander:** Have you got a few minutes?

**Jamie Alexander:** The party needs you to run for Attorney General.

You could say:

1. Yes. You can count on me.
2. Not this time.
3. I'll think about it if the party backs me next time. _(the page follows this one)_
4. I need a few days.

**Jamie Alexander:** I can give you that if you give me this.

You could say:

1. All right. I'll do it.
2. I'm sorry. I just can't.
3. I'll think about it if the party backs me next time. _(the page follows this one)_
4. I haven't decided yet.

**Jamie Alexander:** Meet me halfway, and we have a deal.

**Jamie Alexander:** Think it over. I'll be back tomorrow.

<sub>L1 narrate/narrate/scene-talk/braced/10w2s [scene-talk.narrate-narrate.the-phone-rings-it-s-name-the-party-party-chair]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L5 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L6 reply/bargain/scene-talk/guarded/11w1s [scene-talk.reply-bargain.i-ll-think-about-it-if-the-party-backs-me-next-time]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/bargain/scene-talk/calm/10w1s [scene-talk.follow-bargain.i-can-give-you-that-if-you-give-me-this]; L9 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L10 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L11 reply/bargain/scene-talk/guarded/11w1s [scene-talk.reply-bargain.i-ll-think-about-it-if-the-party-backs-me-next-time]; L12 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L13 follow/bargain/scene-talk/calm/8w1s [scene-talk.follow-bargain.meet-me-halfway-and-we-have-a-deal]; L14 close/press/scene-talk/braced/7w2s [scene-talk.close-press.think-it-over-i-ll-be-back-tomorrow]</sub>

## Scene 18: party-ask (favor-asked, ends in political) — proof scene

_Purpose party-ask. Records: party:US-DE:republican, filing:contest:seat:US-DE:us-house:00:2026-11-03:official:term:seat:US-DE:upper:019:0:2026-10-12, contest:seat:US-DE:us-house:00:2026-11-03, person_9e002a561a4b29bc, official:term:seat:US-DE:upper:019:0:2026-10-12._

> Kelly Riggs, who chairs the Republican party, has asked to see you.

**Profile warm** (outcome resolved)

**Kelly Riggs:** Can I talk to you?

**Kelly Riggs:** The party needs you to run for U.S. Representative.

You could say:

1. Yes. You can count on me. _(the page follows this one)_
2. The answer is no.
3. I'll think about it if the party backs me next time.
4. I need a few days.

**Kelly Riggs:** Good. That's settled.

**If you push back:** (outcome open)

You could say:

1. Yes. You can count on me.
2. The answer is no.
3. I'll think about it if the party backs me next time. _(the page follows this one)_
4. I need a few days.

**Kelly Riggs:** That I can live with.

<sub>L1 narrate/narrate/scene-talk/braced/12w1s [scene-talk.narrate-narrate.name-who-chairs-the-party-party-has-asked-to-see-you]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/request/scene-talk/hopeful/9w2s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L5 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L6 reply/bargain/scene-talk/guarded/11w1s [scene-talk.reply-bargain.i-ll-think-about-it-if-the-party-backs-me-next-time]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/thank/scene-talk/calm/3w2s [scene-talk.follow-thank.good-that-s-settled]</sub>

**Profile cold** (outcome refused)

**Kelly Riggs:** You got a minute?

**Kelly Riggs:** The party needs you to run for U.S. Representative.

You could say:

1. All right. I'll do it.
2. Not this time. _(the page follows this one)_
3. I'll think about it if the party backs me next time.
4. I need a few days.

**Kelly Riggs:** Suit yourself.

<sub>L1 narrate/narrate/scene-talk/braced/12w1s [scene-talk.narrate-narrate.name-who-chairs-the-party-party-has-asked-to-see-you]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/hopeful/9w2s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L5 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L6 reply/bargain/scene-talk/guarded/11w1s [scene-talk.reply-bargain.i-ll-think-about-it-if-the-party-backs-me-next-time]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/accept/scene-talk/guarded/2w1s [scene-talk.follow-accept.suit-yourself]</sub>

**Profile stubborn** (outcome refused)

**Kelly Riggs:** Do you have a minute?

**Kelly Riggs:** The party needs you to run for U.S. Representative.

You could say:

1. Yes. You can count on me.
2. I can't do that. _(the page follows this one)_
3. I'll think about it if the party backs me next time.
4. I need a few days.

**Kelly Riggs:** Yes or no?

You could say:

1. You've made your point. Count me in.
2. I'm sorry. I just can't. _(the page follows this one)_
3. I'll think about it if the party backs me next time.

**Kelly Riggs:** That's all right. I understand.

<sub>L1 narrate/narrate/scene-talk/braced/12w1s [scene-talk.narrate-narrate.name-who-chairs-the-party-party-has-asked-to-see-you]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/9w2s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L5 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L6 reply/bargain/scene-talk/guarded/11w1s [scene-talk.reply-bargain.i-ll-think-about-it-if-the-party-backs-me-next-time]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L9 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L10 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L11 reply/bargain/scene-talk/guarded/11w1s [scene-talk.reply-bargain.i-ll-think-about-it-if-the-party-backs-me-next-time]; L12 follow/accept/scene-talk/tender/5w2s [scene-talk.follow-accept.that-s-all-right-i-understand]</sub>

**Profile anxious** (outcome open)

**Kelly Riggs:** Do you have a minute?

**Kelly Riggs:** The party needs you to run for U.S. Representative.

You could say:

1. Yes. You can count on me.
2. I can't do that.
3. I'll think about it if the party backs me next time.
4. I haven't decided yet. _(the page follows this one)_

**Kelly Riggs:** I wouldn't ask if it didn't matter.

You could say:

1. Okay. For you, I'll do it.
2. Not this time.
3. I'll think about it if the party backs me next time.
4. Let me think about it. _(the page follows this one)_

**Kelly Riggs:** I really need this one.

**Kelly Riggs:** Remember this conversation.

<sub>L1 narrate/narrate/scene-talk/braced/12w1s [scene-talk.narrate-narrate.name-who-chairs-the-party-party-has-asked-to-see-you]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/9w2s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L5 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L6 reply/bargain/scene-talk/guarded/11w1s [scene-talk.reply-bargain.i-ll-think-about-it-if-the-party-backs-me-next-time]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.i-wouldn-t-ask-if-it-didn-t-matter]; L9 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L10 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L11 reply/bargain/scene-talk/guarded/11w1s [scene-talk.reply-bargain.i-ll-think-about-it-if-the-party-backs-me-next-time]; L12 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L13 follow/plea/scene-talk/nervous/5w1s [scene-talk.follow-plea.i-really-need-this-one]; L14 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.remember-this-conversation]</sub>

**Profile boastful** (outcome open)

**Kelly Riggs:** Do you have a minute?

**Kelly Riggs:** The party needs you to run for U.S. Representative.

You could say:

1. Of course. I'm glad you asked.
2. I'm sorry. I just can't.
3. I'll think about it if the party backs me next time. _(the page follows this one)_
4. I'm still weighing it.

**Kelly Riggs:** That I can live with.

<sub>L1 narrate/narrate/scene-talk/braced/12w1s [scene-talk.narrate-narrate.name-who-chairs-the-party-party-has-asked-to-see-you]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/9w2s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L5 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L6 reply/bargain/scene-talk/guarded/11w1s [scene-talk.reply-bargain.i-ll-think-about-it-if-the-party-backs-me-next-time]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 follow/accept/scene-talk/calm/5w1s [scene-talk.follow-accept.that-i-can-live-with]</sub>

## Scene 19: office-hours (favor-asked, ends in money) — proof scene

_Purpose constituent-help. Records: person_ad6661730b7a44c8:2027-07-01:work-relationship_44d65ba97bdb60b6, work-relationship_44d65ba97bdb60b6, person_ad6661730b7a44c8, person_9e002a561a4b29bc._

> It's office hours, and Leslie Robbins is next in line.

**Profile warm** (outcome open)

**Leslie Robbins:** Thank you for seeing me.

**Leslie Robbins:** I lost my job, and I don't know where else to go.

You could say:

1. We'll get you an answer this week.
2. Have you talked to anyone else about it? _(the page follows this one)_
3. That's not something the town handles. I'm sorry.
4. Let me have someone from my office call you tomorrow.

**Leslie Robbins:** I've called everyone I can think of.

You could say:

1. I'll make some calls today.
2. Leave me your number. We'll follow up this week. _(the page follows this one)_
3. I'm not sure my office can help with that.

**Leslie Robbins:** Thank you. That's more than anyone else has done.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.thank-you-for-seeing-me]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 follow/answer/scene-talk/anxious/7w1s [scene-talk.follow-answer.i-ve-called-everyone-i-can-think-of]; L9 reply/promise/scene-talk/tender/5w1s [scene-talk.reply-promise.i-ll-make-some-calls-today]; L10 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L11 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L12 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

**Profile cold** (outcome resolved)

**Leslie Robbins:** Thank you for seeing me.

**Leslie Robbins:** I lost my job, and I don't know where else to go.

You could say:

1. I'll see what my office can do.
2. Have you talked to anyone else about it? _(the page follows this one)_
3. I'm not sure my office can help with that.
4. Let me have someone from my office call you tomorrow.

**Leslie Robbins:** I've called everyone I can think of.

You could say:

1. We'll get you an answer this week. _(the page follows this one)_
2. Leave me your number. We'll follow up this week.
3. That's not something the town handles. I'm sorry.

**Leslie Robbins:** Thank you. That's more than anyone else has done.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.thank-you-for-seeing-me]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.i-ll-see-what-my-office-can-do]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 follow/answer/scene-talk/anxious/7w1s [scene-talk.follow-answer.i-ve-called-everyone-i-can-think-of]; L9 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L10 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L11 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L12 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

**Profile stubborn** (outcome open)

**Leslie Robbins:** Thank you for seeing me.

**Leslie Robbins:** I lost my job, and I don't know where else to go.

You could say:

1. I'll make some calls today.
2. Have you talked to anyone else about it? _(the page follows this one)_
3. That's not something the town handles. I'm sorry.
4. Let me have someone from my office call you tomorrow.

**Leslie Robbins:** I've called everyone I can think of.

You could say:

1. We'll get you an answer this week.
2. Leave me your number. We'll follow up this week. _(the page follows this one)_
3. I'm not sure my office can help with that.

**Leslie Robbins:** Thank you. That's more than anyone else has done.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.thank-you-for-seeing-me]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/tender/5w1s [scene-talk.reply-promise.i-ll-make-some-calls-today]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 follow/answer/scene-talk/anxious/7w1s [scene-talk.follow-answer.i-ve-called-everyone-i-can-think-of]; L9 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L10 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L11 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L12 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

**Profile boastful** (outcome open)

**Leslie Robbins:** Thank you for seeing me.

**Leslie Robbins:** I lost my job, and I don't know where else to go.

You could say:

1. I'll see what my office can do.
2. Have you talked to anyone else about it? _(the page follows this one)_
3. That's not something the town handles. I'm sorry.
4. Let me have someone from my office call you tomorrow.

**Leslie Robbins:** I've called everyone I can think of.

You could say:

1. We'll get you an answer this week.
2. Leave me your number. We'll follow up this week. _(the page follows this one)_
3. I'm not sure my office can help with that.

**Leslie Robbins:** Thank you. That's more than anyone else has done.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.thank-you-for-seeing-me]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.i-ll-see-what-my-office-can-do]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 follow/answer/scene-talk/anxious/7w1s [scene-talk.follow-answer.i-ve-called-everyone-i-can-think-of]; L9 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L10 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L11 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L12 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

## Scene 20: office-hours (favor-asked, ends in money) — proof scene

_Purpose constituent-help. Records: person_5df2739ae2587c09:2027-05-23:event:housing.eviction:eviction:lease:household_e3b7a1c2299a39ab:2027-05-06, event:housing.eviction:eviction:lease:household_e3b7a1c2299a39ab:2027-05-06, person_5df2739ae2587c09, person_d3c12275ee46b085._

> Andrew Robbins lives in Brookside and has come to your office for help.

**Profile warm** (outcome resolved)

**Andrew Robbins:** I didn't know who else to go to.

**Andrew Robbins:** We're being evicted, and I need help.

You could say:

1. I'll see what my office can do.
2. Have you talked to anyone else about it? _(the page follows this one)_
3. I'm not sure my office can help with that.
4. Let me have someone from my office call you tomorrow.

**Andrew Robbins:** Everyone sends me somewhere else.

You could say:

1. We'll get you an answer this week. _(the page follows this one)_
2. Leave me your number. We'll follow up this week.
3. That's not something the town handles. I'm sorry.

**Andrew Robbins:** Thank you. That's more than anyone else has done.

<sub>L1 narrate/narrate/scene-talk/calm/13w1s [scene-talk.narrate-narrate.name-lives-in-place-and-has-come-to-your-office-for-help]; L2 open/greet/scene-talk/anxious/8w1s [scene-talk.open-greet.i-didn-t-know-who-else-to-go-to]; L3 state/request/scene-talk/anxious/7w1s [scene-talk.state-request.we-re-being-evicted-and-i-need-help]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.i-ll-see-what-my-office-can-do]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 follow/answer/scene-talk/anxious/5w1s [scene-talk.follow-answer.everyone-sends-me-somewhere-else]; L9 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L10 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L11 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L12 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

**Profile cold** (outcome resolved)

**Andrew Robbins:** I didn't know who else to go to.

**Andrew Robbins:** We're being evicted, and I need help.

You could say:

1. We'll get you an answer this week. _(the page follows this one)_
2. Have you talked to anyone else about it?
3. That's not something the town handles. I'm sorry.
4. Leave me your number. We'll follow up this week.

**Andrew Robbins:** Thank you. I didn't know where else to turn.

<sub>L1 narrate/narrate/scene-talk/calm/13w1s [scene-talk.narrate-narrate.name-lives-in-place-and-has-come-to-your-office-for-help]; L2 open/greet/scene-talk/anxious/8w1s [scene-talk.open-greet.i-didn-t-know-who-else-to-go-to]; L3 state/request/scene-talk/anxious/7w1s [scene-talk.state-request.we-re-being-evicted-and-i-need-help]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L7 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L8 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-i-didn-t-know-where-else-to-turn]</sub>

**Profile stubborn** (outcome resolved)

**Andrew Robbins:** I didn't know who else to go to.

**Andrew Robbins:** We're being evicted, and I need help.

You could say:

1. I'll see what my office can do. _(the page follows this one)_
2. Have you talked to anyone else about it?
3. I'm not sure my office can help with that.
4. Leave me your number. We'll follow up this week.

**Andrew Robbins:** Thank you. I didn't know where else to turn.

<sub>L1 narrate/narrate/scene-talk/calm/13w1s [scene-talk.narrate-narrate.name-lives-in-place-and-has-come-to-your-office-for-help]; L2 open/greet/scene-talk/anxious/8w1s [scene-talk.open-greet.i-didn-t-know-who-else-to-go-to]; L3 state/request/scene-talk/anxious/7w1s [scene-talk.state-request.we-re-being-evicted-and-i-need-help]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.i-ll-see-what-my-office-can-do]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L7 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L8 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-i-didn-t-know-where-else-to-turn]</sub>

**Profile boastful** (outcome resolved)

**Andrew Robbins:** I didn't know who else to go to.

**Andrew Robbins:** We're being evicted, and I need help.

You could say:

1. I'll make some calls today. _(the page follows this one)_
2. Have you talked to anyone else about it?
3. That's not something the town handles. I'm sorry.
4. Let me have someone from my office call you tomorrow.

**Andrew Robbins:** Thank you. I didn't know where else to turn.

<sub>L1 narrate/narrate/scene-talk/calm/13w1s [scene-talk.narrate-narrate.name-lives-in-place-and-has-come-to-your-office-for-help]; L2 open/greet/scene-talk/anxious/8w1s [scene-talk.open-greet.i-didn-t-know-who-else-to-go-to]; L3 state/request/scene-talk/anxious/7w1s [scene-talk.state-request.we-re-being-evicted-and-i-need-help]; L4 reply/promise/scene-talk/tender/5w1s [scene-talk.reply-promise.i-ll-make-some-calls-today]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-i-didn-t-know-where-else-to-turn]</sub>

## Scene 21: office-hours (favor-asked, ends in money) — proof scene

_Purpose constituent-help. Records: person_b6f0d51289db799a:2027-07-01:job:position:organization_b74b9bd31243618a:2027-06-01:2:person_b6f0d61289db7b4d, job:position:organization_b74b9bd31243618a:2027-06-01:2:person_b6f0d61289db7b4d, person_b6f0d51289db799a, person_bc041df6bd9d1a47._

> It's office hours, and Zachary Shepard is next in line.

**Profile warm** (outcome resolved)

**Zachary Shepard:** Have you got a few minutes?

**Zachary Shepard:** I lost my job, and I don't know where else to go.

You could say:

1. I'll see what my office can do.
2. Have you talked to anyone else about it? _(the page follows this one)_
3. That's not something the town handles. I'm sorry.
4. Let me have someone from my office call you tomorrow.

**Zachary Shepard:** Everyone sends me somewhere else.

You could say:

1. I'll make some calls today. _(the page follows this one)_
2. Leave me your number. We'll follow up this week.
3. I'm not sure my office can help with that.

**Zachary Shepard:** Thank you. That's more than anyone else has done.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.i-ll-see-what-my-office-can-do]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 follow/answer/scene-talk/anxious/5w1s [scene-talk.follow-answer.everyone-sends-me-somewhere-else]; L9 reply/promise/scene-talk/tender/5w1s [scene-talk.reply-promise.i-ll-make-some-calls-today]; L10 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L11 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L12 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

**Profile cold** (outcome resolved)

**Zachary Shepard:** You got a minute?

**Zachary Shepard:** I lost my job, and I don't know where else to go.

You could say:

1. We'll get you an answer this week. _(the page follows this one)_
2. Have you talked to anyone else about it?
3. That's not something the town handles. I'm sorry.
4. Leave me your number. We'll follow up this week.

**Zachary Shepard:** Thank you. I didn't know where else to turn.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L7 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L8 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-i-didn-t-know-where-else-to-turn]</sub>

**Profile stubborn** (outcome resolved)

**Zachary Shepard:** Is now a bad time?

**Zachary Shepard:** I lost my job, and I don't know where else to go.

You could say:

1. We'll get you an answer this week. _(the page follows this one)_
2. Have you talked to anyone else about it?
3. I'm not sure my office can help with that.
4. Leave me your number. We'll follow up this week.

**Zachary Shepard:** Thank you. I didn't know where else to turn.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.is-now-a-bad-time]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L7 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L8 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-i-didn-t-know-where-else-to-turn]</sub>

**Profile anxious** (outcome resolved)

**Zachary Shepard:** Sorry to bother you.

**Zachary Shepard:** I lost my job, and I don't know where else to go.

You could say:

1. I'll make some calls today. _(the page follows this one)_
2. Have you talked to anyone else about it?
3. That's not something the town handles. I'm sorry.
4. Let me have someone from my office call you tomorrow.

**Zachary Shepard:** Thank you. I didn't know where else to turn.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/tender/5w1s [scene-talk.reply-promise.i-ll-make-some-calls-today]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-i-didn-t-know-where-else-to-turn]</sub>

**Profile boastful** (outcome resolved)

**Zachary Shepard:** You got a minute?

**Zachary Shepard:** I lost my job, and I don't know where else to go.

You could say:

1. I'll make some calls today. _(the page follows this one)_
2. Have you talked to anyone else about it?
3. That's not something the town handles. I'm sorry.
4. Leave me your number. We'll follow up this week.

**Zachary Shepard:** Thank you. I didn't know where else to turn.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/tender/5w1s [scene-talk.reply-promise.i-ll-make-some-calls-today]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L7 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L8 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-i-didn-t-know-where-else-to-turn]</sub>

## Scene 22: family-filing (news-received, ends in political) — proof scene

_Purpose family-filing. Records: filing:contest:seat:gus2025:101811:board:6:2026-11-03:person_d3c12275ee46b085, contest:seat:gus2025:101811:board:6:2026-11-03, person_d3c11e75ee46a9b9, person_d3c12275ee46b085._

> Word that you filed for County Commissioner got home before you did. Bentley Rivas is waiting.

**Profile warm** (outcome resolved)

**Bentley Rivas:** There you are.

**Bentley Rivas:** Why didn't you tell me you were running?

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it. _(the page follows this one)_
2. I need you with me on this.
3. Can we talk about it tomorrow?
4. Nothing has to change at home.

**Bentley Rivas:** You'd be good at it.

You could say:

1. Thank you. That means everything. _(the page follows this one)_
2. I won't let it take over our lives.
3. Will you help me?

**Bentley Rivas:** Okay. Just keep me in it.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L5 reply/request/scene-talk/tender/7w1s [scene-talk.reply-request.i-need-you-with-me-on-this]; L6 reply/deflect/scene-talk/nervous/6w1s [scene-talk.reply-deflect.can-we-talk-about-it-tomorrow]; L7 reply/comfort/scene-talk/tender/6w1s [scene-talk.reply-comfort.nothing-has-to-change-at-home]; L8 follow/comfort/scene-talk/tender/5w1s [scene-talk.follow-comfort.you-d-be-good-at-it]; L9 reply/thank/scene-talk/tender/5w2s [scene-talk.reply-thank.thank-you-that-means-everything]; L10 reply/promise/scene-talk/tender/8w1s [scene-talk.reply-promise.i-won-t-let-it-take-over-our-lives]; L11 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L12 follow/thank/scene-talk/tender/6w2s [scene-talk.follow-thank.okay-just-keep-me-in-it]</sub>

**Profile cold** (outcome resolved)

**Bentley Rivas:** There you are.

**Bentley Rivas:** Why didn't you tell me you were running?

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it.
2. Will you help me?
3. Can we talk about it tomorrow? _(the page follows this one)_
4. Nothing has to change at home.

**Bentley Rivas:** Don't shut me out of this.

You could say:

1. I'm running because somebody has to.
2. You're right. I should have told you first.
3. I won't let it take over our lives. _(the page follows this one)_

**Bentley Rivas:** Okay. Just keep me in it.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L5 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L6 reply/deflect/scene-talk/nervous/6w1s [scene-talk.reply-deflect.can-we-talk-about-it-tomorrow]; L7 reply/comfort/scene-talk/tender/6w1s [scene-talk.reply-comfort.nothing-has-to-change-at-home]; L8 follow/press/scene-talk/hurt/6w1s [scene-talk.follow-press.don-t-shut-me-out-of-this]; L9 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L10 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L11 reply/promise/scene-talk/tender/8w1s [scene-talk.reply-promise.i-won-t-let-it-take-over-our-lives]; L12 follow/thank/scene-talk/tender/6w2s [scene-talk.follow-thank.okay-just-keep-me-in-it]</sub>

**Profile stubborn** (outcome resolved)

**Bentley Rivas:** There you are.

**Bentley Rivas:** Why didn't you tell me you were running?

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it. _(the page follows this one)_
2. Will you help me?
3. Can we talk about it tomorrow?
4. It'll be all right. We'll make it work.

**Bentley Rivas:** Somebody else can do it.

You could say:

1. I'm running because somebody has to. _(the page follows this one)_
2. You're right. I should have told you first.
3. I need you with me on this.

**Bentley Rivas:** Then I'm with you.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L5 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L6 reply/deflect/scene-talk/nervous/6w1s [scene-talk.reply-deflect.can-we-talk-about-it-tomorrow]; L7 reply/comfort/scene-talk/tender/8w2s [scene-talk.reply-comfort.it-ll-be-all-right-we-ll-make-it-work]; L8 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.somebody-else-can-do-it]; L9 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L10 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L11 reply/request/scene-talk/tender/7w1s [scene-talk.reply-request.i-need-you-with-me-on-this]; L12 follow/comfort/scene-talk/tender/4w1s [scene-talk.follow-comfort.then-i-m-with-you]</sub>

**Profile anxious** (outcome resolved)

**Bentley Rivas:** There you are.

**Bentley Rivas:** Why didn't you tell me you were running?

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it.
2. Will you help me?
3. It's been a long day. _(the page follows this one)_
4. It'll be all right. We'll make it work.

**Bentley Rivas:** Just tell me the truth.

You could say:

1. I'm running because somebody has to.
2. You're right. I should have told you first.
3. I won't let it take over our lives. _(the page follows this one)_

**Bentley Rivas:** Okay. Just keep me in it.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L5 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L6 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L7 reply/comfort/scene-talk/tender/8w2s [scene-talk.reply-comfort.it-ll-be-all-right-we-ll-make-it-work]; L8 follow/plea/scene-talk/hurt/5w1s [scene-talk.follow-plea.just-tell-me-the-truth]; L9 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L10 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L11 reply/promise/scene-talk/tender/8w1s [scene-talk.reply-promise.i-won-t-let-it-take-over-our-lives]; L12 follow/thank/scene-talk/tender/6w2s [scene-talk.follow-thank.okay-just-keep-me-in-it]</sub>

**Profile boastful** (outcome resolved)

**Bentley Rivas:** There you are.

**Bentley Rivas:** Why didn't you tell me you were running?

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it. _(the page follows this one)_
2. I need you with me on this.
3. Can we talk about it tomorrow?
4. It'll be all right. We'll make it work.

**Bentley Rivas:** Somebody else can do it.

You could say:

1. I'm running because somebody has to. _(the page follows this one)_
2. You're right. I should have told you first.
3. Will you help me?

**Bentley Rivas:** Then I'm with you.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L5 reply/request/scene-talk/tender/7w1s [scene-talk.reply-request.i-need-you-with-me-on-this]; L6 reply/deflect/scene-talk/nervous/6w1s [scene-talk.reply-deflect.can-we-talk-about-it-tomorrow]; L7 reply/comfort/scene-talk/tender/8w2s [scene-talk.reply-comfort.it-ll-be-all-right-we-ll-make-it-work]; L8 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.somebody-else-can-do-it]; L9 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L10 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L11 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L12 follow/comfort/scene-talk/tender/4w1s [scene-talk.follow-comfort.then-i-m-with-you]</sub>

## Scene 23: family-filing (news-received, ends in political) — proof scene

_Purpose family-filing. Records: filing:contest:seat:gus2025:101811:assessor:0:2026-11-03:person_8875c9c2afd1ae76, contest:seat:gus2025:101811:assessor:0:2026-11-03, person_8875cac2afd1b029, person_8875c9c2afd1ae76._

> You filed today to run for County assessor. Andrew Peters has been waiting for you at home.

**Profile warm** (outcome resolved)

**Andrew Peters:** So. You did it.

**Andrew Peters:** So you're really doing this?

You could say:

1. I'm running because somebody has to. _(the page follows this one)_
2. I need you with me on this.
3. It's been a long day.
4. Nothing has to change at home.

**Andrew Peters:** Somebody else can do it.

You could say:

1. I want to do something for New Castle County. _(the page follows this one)_
2. You're right. I should have told you first.
3. Will you help me?

**Andrew Peters:** You'd be good at it.

<sub>L1 narrate/narrate/scene-talk/anxious/17w2s [scene-talk.narrate-narrate.you-filed-today-to-run-for-office-name-has-been-waiting-for-you-at-hom]; L2 open/greet/scene-talk/hurt/4w2s [scene-talk.open-greet.so-you-did-it]; L3 state/ask/scene-talk/anxious/5w1s [scene-talk.state-ask.so-you-re-really-doing-this]; L4 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L5 reply/request/scene-talk/tender/7w1s [scene-talk.reply-request.i-need-you-with-me-on-this]; L6 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L7 reply/comfort/scene-talk/tender/6w1s [scene-talk.reply-comfort.nothing-has-to-change-at-home]; L8 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.somebody-else-can-do-it]; L9 reply/tell/scene-talk/eager/9w1s [scene-talk.reply-tell.i-want-to-do-something-for-place]; L10 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L11 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L12 follow/comfort/scene-talk/tender/5w1s [scene-talk.follow-comfort.you-d-be-good-at-it]</sub>

**Profile cold** (outcome resolved)

**Andrew Peters:** So. You did it.

**Andrew Peters:** So you're really doing this?

You could say:

1. I'm running because somebody has to. _(the page follows this one)_
2. Will you help me?
3. It's been a long day.
4. Nothing has to change at home.

**Andrew Peters:** Somebody else can do it.

You could say:

1. I want to do something for New Castle County. _(the page follows this one)_
2. You're right. I should have told you first.
3. I need you with me on this.

**Andrew Peters:** You'd be good at it.

<sub>L1 narrate/narrate/scene-talk/anxious/17w2s [scene-talk.narrate-narrate.you-filed-today-to-run-for-office-name-has-been-waiting-for-you-at-hom]; L2 open/greet/scene-talk/hurt/4w2s [scene-talk.open-greet.so-you-did-it]; L3 state/ask/scene-talk/anxious/5w1s [scene-talk.state-ask.so-you-re-really-doing-this]; L4 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L5 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L6 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L7 reply/comfort/scene-talk/tender/6w1s [scene-talk.reply-comfort.nothing-has-to-change-at-home]; L8 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.somebody-else-can-do-it]; L9 reply/tell/scene-talk/eager/9w1s [scene-talk.reply-tell.i-want-to-do-something-for-place]; L10 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L11 reply/request/scene-talk/tender/7w1s [scene-talk.reply-request.i-need-you-with-me-on-this]; L12 follow/comfort/scene-talk/tender/5w1s [scene-talk.follow-comfort.you-d-be-good-at-it]</sub>

**Profile stubborn** (outcome resolved)

**Andrew Peters:** So. You did it.

**Andrew Peters:** So you're really doing this?

You could say:

1. I'm running because somebody has to. _(the page follows this one)_
2. I need you with me on this.
3. Can we talk about it tomorrow?
4. It'll be all right. We'll make it work.

**Andrew Peters:** Somebody else can do it.

You could say:

1. I want to do something for New Castle County. _(the page follows this one)_
2. You're right. I should have told you first.
3. Will you help me?

**Andrew Peters:** You'd be good at it.

<sub>L1 narrate/narrate/scene-talk/anxious/17w2s [scene-talk.narrate-narrate.you-filed-today-to-run-for-office-name-has-been-waiting-for-you-at-hom]; L2 open/greet/scene-talk/hurt/4w2s [scene-talk.open-greet.so-you-did-it]; L3 state/ask/scene-talk/anxious/5w1s [scene-talk.state-ask.so-you-re-really-doing-this]; L4 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L5 reply/request/scene-talk/tender/7w1s [scene-talk.reply-request.i-need-you-with-me-on-this]; L6 reply/deflect/scene-talk/nervous/6w1s [scene-talk.reply-deflect.can-we-talk-about-it-tomorrow]; L7 reply/comfort/scene-talk/tender/8w2s [scene-talk.reply-comfort.it-ll-be-all-right-we-ll-make-it-work]; L8 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.somebody-else-can-do-it]; L9 reply/tell/scene-talk/eager/9w1s [scene-talk.reply-tell.i-want-to-do-something-for-place]; L10 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L11 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L12 follow/comfort/scene-talk/tender/5w1s [scene-talk.follow-comfort.you-d-be-good-at-it]</sub>

**Profile anxious** (outcome resolved)

**Andrew Peters:** So. You did it.

**Andrew Peters:** So you're really doing this?

You could say:

1. I'm running because somebody has to. _(the page follows this one)_
2. I need you with me on this.
3. Can we talk about it tomorrow?
4. It'll be all right. We'll make it work.

**Andrew Peters:** Why didn't you talk to me first?

You could say:

1. I want to do something for New Castle County. _(the page follows this one)_
2. You're right. I should have told you first.
3. Will you help me?

**Andrew Peters:** Somebody else can do it.

<sub>L1 narrate/narrate/scene-talk/anxious/17w2s [scene-talk.narrate-narrate.you-filed-today-to-run-for-office-name-has-been-waiting-for-you-at-hom]; L2 open/greet/scene-talk/hurt/4w2s [scene-talk.open-greet.so-you-did-it]; L3 state/ask/scene-talk/anxious/5w1s [scene-talk.state-ask.so-you-re-really-doing-this]; L4 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L5 reply/request/scene-talk/tender/7w1s [scene-talk.reply-request.i-need-you-with-me-on-this]; L6 reply/deflect/scene-talk/nervous/6w1s [scene-talk.reply-deflect.can-we-talk-about-it-tomorrow]; L7 reply/comfort/scene-talk/tender/8w2s [scene-talk.reply-comfort.it-ll-be-all-right-we-ll-make-it-work]; L8 follow/ask/scene-talk/hurt/7w1s [scene-talk.follow-ask.why-didn-t-you-talk-to-me-first]; L9 reply/tell/scene-talk/eager/9w1s [scene-talk.reply-tell.i-want-to-do-something-for-place]; L10 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L11 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L12 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.somebody-else-can-do-it]</sub>

**Profile boastful** (outcome resolved)

**Andrew Peters:** So. You did it.

**Andrew Peters:** So you're really doing this?

You could say:

1. I'm running because somebody has to. _(the page follows this one)_
2. I need you with me on this.
3. It's been a long day.
4. It'll be all right. We'll make it work.

**Andrew Peters:** Somebody else can do it.

You could say:

1. I want to do something for New Castle County. _(the page follows this one)_
2. You're right. I should have told you first.
3. Will you help me?

**Andrew Peters:** You'd be good at it.

<sub>L1 narrate/narrate/scene-talk/anxious/17w2s [scene-talk.narrate-narrate.you-filed-today-to-run-for-office-name-has-been-waiting-for-you-at-hom]; L2 open/greet/scene-talk/hurt/4w2s [scene-talk.open-greet.so-you-did-it]; L3 state/ask/scene-talk/anxious/5w1s [scene-talk.state-ask.so-you-re-really-doing-this]; L4 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L5 reply/request/scene-talk/tender/7w1s [scene-talk.reply-request.i-need-you-with-me-on-this]; L6 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L7 reply/comfort/scene-talk/tender/8w2s [scene-talk.reply-comfort.it-ll-be-all-right-we-ll-make-it-work]; L8 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.somebody-else-can-do-it]; L9 reply/tell/scene-talk/eager/9w1s [scene-talk.reply-tell.i-want-to-do-something-for-place]; L10 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L11 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L12 follow/comfort/scene-talk/tender/5w1s [scene-talk.follow-comfort.you-d-be-good-at-it]</sub>

## Scene 24: family-filing (news-received, ends in political) — proof scene

_Purpose family-filing. Records: filing:contest:seat:gus2025:101811:board:0:2026-11-03:person_9e002a561a4b29bc, contest:seat:gus2025:101811:board:0:2026-11-03, person_9e002b561a4b2b6f, person_9e002a561a4b29bc._

> Word that you filed for County Commissioner got home before you did. Simon Riggs is waiting.

**Profile warm** (outcome resolved)

**Simon Riggs:** There you are.

**Simon Riggs:** Why didn't you tell me you were running?

You could say:

1. I'm running because somebody has to.
2. I need you with me on this. _(the page follows this one)_
3. It's been a long day.
4. It'll be all right. We'll make it work.

**Simon Riggs:** Of course I'll help.

You could say:

1. Thank you. That means everything. _(the page follows this one)_
2. I won't let it take over our lives.

**Simon Riggs:** Okay. Just keep me in it.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L5 reply/request/scene-talk/tender/7w1s [scene-talk.reply-request.i-need-you-with-me-on-this]; L6 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L7 reply/comfort/scene-talk/tender/8w2s [scene-talk.reply-comfort.it-ll-be-all-right-we-ll-make-it-work]; L8 follow/promise/scene-talk/tender/4w1s [scene-talk.follow-promise.of-course-i-ll-help]; L9 reply/thank/scene-talk/tender/5w2s [scene-talk.reply-thank.thank-you-that-means-everything]; L10 reply/promise/scene-talk/tender/8w1s [scene-talk.reply-promise.i-won-t-let-it-take-over-our-lives]; L11 follow/thank/scene-talk/tender/6w2s [scene-talk.follow-thank.okay-just-keep-me-in-it]</sub>

**Profile cold** (outcome resolved)

**Simon Riggs:** There you are.

**Simon Riggs:** Why didn't you tell me you were running?

You could say:

1. I'm running because somebody has to.
2. Will you help me? _(the page follows this one)_
3. It's been a long day.
4. It'll be all right. We'll make it work.

**Simon Riggs:** I can't promise that.

You could say:

1. I need you with me on this.
2. All right. I'll handle it myself. _(the page follows this one)_

**Simon Riggs:** Okay. I'm with you, then.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L5 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L6 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L7 reply/comfort/scene-talk/tender/8w2s [scene-talk.reply-comfort.it-ll-be-all-right-we-ll-make-it-work]; L8 follow/decline/scene-talk/guarded/4w1s [scene-talk.follow-decline.i-can-t-promise-that]; L9 reply/request/scene-talk/tender/7w1s [scene-talk.reply-request.i-need-you-with-me-on-this]; L10 reply/accept/scene-talk/guarded/6w2s [scene-talk.reply-accept.all-right-i-ll-handle-it-myself]; L11 follow/accept/scene-talk/tender/5w2s [scene-talk.follow-accept.okay-i-m-with-you-then]</sub>

**Profile stubborn** (outcome open)

**Simon Riggs:** There you are.

**Simon Riggs:** Why didn't you tell me you were running?

You could say:

1. I'm running because somebody has to.
2. I need you with me on this. _(the page follows this one)_
3. It's been a long day.
4. Nothing has to change at home.

**Simon Riggs:** I can't promise that.

You could say:

1. Will you help me? _(the page follows this one)_
2. All right. I'll handle it myself.

**Simon Riggs:** I don't know if I can.

**Simon Riggs:** We're not done talking about this.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L5 reply/request/scene-talk/tender/7w1s [scene-talk.reply-request.i-need-you-with-me-on-this]; L6 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L7 reply/comfort/scene-talk/tender/6w1s [scene-talk.reply-comfort.nothing-has-to-change-at-home]; L8 follow/decline/scene-talk/guarded/4w1s [scene-talk.follow-decline.i-can-t-promise-that]; L9 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L10 reply/accept/scene-talk/guarded/6w2s [scene-talk.reply-accept.all-right-i-ll-handle-it-myself]; L11 follow/decline/scene-talk/nervous/6w1s [scene-talk.follow-decline.i-don-t-know-if-i-can]; L12 close/warn/scene-talk/hurt/6w1s [scene-talk.close-warn.we-re-not-done-talking-about-this]</sub>

**Profile anxious** (outcome resolved)

**Simon Riggs:** There you are.

**Simon Riggs:** Why didn't you tell me you were running?

You could say:

1. I'm running because somebody has to.
2. I need you with me on this. _(the page follows this one)_
3. Can we talk about it tomorrow?
4. Nothing has to change at home.

**Simon Riggs:** I don't know if I can.

You could say:

1. Will you help me?
2. All right. I'll handle it myself. _(the page follows this one)_

**Simon Riggs:** Okay. I'm with you, then.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L5 reply/request/scene-talk/tender/7w1s [scene-talk.reply-request.i-need-you-with-me-on-this]; L6 reply/deflect/scene-talk/nervous/6w1s [scene-talk.reply-deflect.can-we-talk-about-it-tomorrow]; L7 reply/comfort/scene-talk/tender/6w1s [scene-talk.reply-comfort.nothing-has-to-change-at-home]; L8 follow/decline/scene-talk/nervous/6w1s [scene-talk.follow-decline.i-don-t-know-if-i-can]; L9 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L10 reply/accept/scene-talk/guarded/6w2s [scene-talk.reply-accept.all-right-i-ll-handle-it-myself]; L11 follow/accept/scene-talk/tender/5w2s [scene-talk.follow-accept.okay-i-m-with-you-then]</sub>

**Profile boastful** (outcome open)

**Simon Riggs:** There you are.

**Simon Riggs:** Why didn't you tell me you were running?

You could say:

1. I'm running because somebody has to.
2. I need you with me on this. _(the page follows this one)_
3. Can we talk about it tomorrow?
4. Nothing has to change at home.

**Simon Riggs:** I don't know if I can.

You could say:

1. Will you help me? _(the page follows this one)_
2. All right. I'll handle it myself.

**Simon Riggs:** I can't promise that.

**Simon Riggs:** We're not done talking about this.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L5 reply/request/scene-talk/tender/7w1s [scene-talk.reply-request.i-need-you-with-me-on-this]; L6 reply/deflect/scene-talk/nervous/6w1s [scene-talk.reply-deflect.can-we-talk-about-it-tomorrow]; L7 reply/comfort/scene-talk/tender/6w1s [scene-talk.reply-comfort.nothing-has-to-change-at-home]; L8 follow/decline/scene-talk/nervous/6w1s [scene-talk.follow-decline.i-don-t-know-if-i-can]; L9 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L10 reply/accept/scene-talk/guarded/6w2s [scene-talk.reply-accept.all-right-i-ll-handle-it-myself]; L11 follow/decline/scene-talk/guarded/4w1s [scene-talk.follow-decline.i-can-t-promise-that]; L12 close/warn/scene-talk/hurt/6w1s [scene-talk.close-warn.we-re-not-done-talking-about-this]</sub>

## Scene 25: family-win (honor, ends in political) — proof scene

_Purpose family-win. Records: result:contest:seat:gus2025:101811:board:0:2026-11-03, contest:seat:gus2025:101811:board:0:2026-11-03, person_9e002a561a4b29bc._

> You won. Simon Riggs is waiting at the door when you get home.

**Profile warm** (outcome resolved)

**Simon Riggs:** Look who it is!

**Simon Riggs:** County Commissioner. You really did it.

You could say:

1. Thank you for putting up with all of it. _(the page follows this one)_
2. Things will settle down now. I promise.
3. Not bad for a first run, right?
4. It hasn't sunk in yet.

**Simon Riggs:** We'll celebrate this weekend.

You could say:

1. I couldn't have done it without you. _(the page follows this one)_
2. I'm going to make this count.

**Simon Riggs:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-it-is]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/tender/9w1s [scene-talk.reply-thank.thank-you-for-putting-up-with-all-of-it]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L8 follow/promise/scene-talk/glad/4w1s [scene-talk.follow-promise.we-ll-celebrate-this-weekend]; L9 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L10 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L11 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

**Profile cold** (outcome resolved)

**Simon Riggs:** Come here.

**Simon Riggs:** You did it!

You could say:

1. I couldn't have done it without you. _(the page follows this one)_
2. I'm going to make this count.
3. Not bad for a first run, right?
4. It hasn't sunk in yet.

**Simon Riggs:** We'll celebrate this weekend.

You could say:

1. Thank you for putting up with all of it. _(the page follows this one)_
2. Things will settle down now. I promise.

**Simon Riggs:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/3w1s [scene-talk.state-congratulate.you-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L8 follow/promise/scene-talk/glad/4w1s [scene-talk.follow-promise.we-ll-celebrate-this-weekend]; L9 reply/thank/scene-talk/tender/9w1s [scene-talk.reply-thank.thank-you-for-putting-up-with-all-of-it]; L10 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L11 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

**Profile stubborn** (outcome resolved)

**Simon Riggs:** Look who it is!

**Simon Riggs:** You did it!

You could say:

1. I couldn't have done it without you. _(the page follows this one)_
2. I'm going to make this count.
3. Not bad for a first run, right?
4. I still can't believe it.

**Simon Riggs:** You earned this.

You could say:

1. Thank you for putting up with all of it. _(the page follows this one)_
2. Things will settle down now. I promise.

**Simon Riggs:** We'll celebrate this weekend.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-it-is]; L3 state/congratulate/scene-talk/glad/3w1s [scene-talk.state-congratulate.you-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/glad/5w1s [scene-talk.reply-tell.i-still-can-t-believe-it]; L8 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L9 reply/thank/scene-talk/tender/9w1s [scene-talk.reply-thank.thank-you-for-putting-up-with-all-of-it]; L10 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L11 follow/promise/scene-talk/glad/4w1s [scene-talk.follow-promise.we-ll-celebrate-this-weekend]</sub>

**Profile anxious** (outcome resolved)

**Simon Riggs:** Come here.

**Simon Riggs:** You did it!

You could say:

1. Thank you for putting up with all of it. _(the page follows this one)_
2. Things will settle down now. I promise.
3. Not bad for a first run, right?
4. It hasn't sunk in yet.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you. _(the page follows this one)_
2. I'm going to make this count.

**Simon Riggs:** We'll celebrate this weekend.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/3w1s [scene-talk.state-congratulate.you-did-it]; L4 reply/thank/scene-talk/tender/9w1s [scene-talk.reply-thank.thank-you-for-putting-up-with-all-of-it]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L8 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L9 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L10 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L11 follow/promise/scene-talk/glad/4w1s [scene-talk.follow-promise.we-ll-celebrate-this-weekend]</sub>

**Profile boastful** (outcome resolved)

**Simon Riggs:** Come here.

**Simon Riggs:** County Commissioner. You really did it.

You could say:

1. I couldn't have done it without you. _(the page follows this one)_
2. I'm going to make this count.
3. Not bad for a first run, right?
4. It hasn't sunk in yet.

**Simon Riggs:** We'll celebrate this weekend.

You could say:

1. Thank you for putting up with all of it. _(the page follows this one)_
2. Things will settle down now. I promise.

**Simon Riggs:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L8 follow/promise/scene-talk/glad/4w1s [scene-talk.follow-promise.we-ll-celebrate-this-weekend]; L9 reply/thank/scene-talk/tender/9w1s [scene-talk.reply-thank.thank-you-for-putting-up-with-all-of-it]; L10 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L11 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

## Scene 26: family-win (honor, ends in political) — proof scene

_Purpose family-win. Records: result:contest:seat:gus2025:101811:board:6:2026-11-03, contest:seat:gus2025:101811:board:6:2026-11-03, person_d3c12275ee46b085._

> The results are in: you won the race for County Commissioner. Bentley Rivas is the first to reach you.

**Profile warm** (outcome resolved)

**Bentley Rivas:** Come here.

**Bentley Rivas:** County Commissioner. You really did it.

You could say:

1. Thank you for putting up with all of it. _(the page follows this one)_
2. I'm going to make this count.
3. Not bad for a first run, right?
4. I still can't believe it.

**Bentley Rivas:** You earned this.

You could say:

1. I couldn't have done it without you. _(the page follows this one)_
2. Things will settle down now. I promise.

**Bentley Rivas:** We'll celebrate this weekend.

<sub>L1 narrate/narrate/scene-talk/glad/19w2s [scene-talk.narrate-narrate.the-results-are-in-you-won-the-race-for-office-name-is-the-first-to-re]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/tender/9w1s [scene-talk.reply-thank.thank-you-for-putting-up-with-all-of-it]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/glad/5w1s [scene-talk.reply-tell.i-still-can-t-believe-it]; L8 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L9 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L10 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L11 follow/promise/scene-talk/glad/4w1s [scene-talk.follow-promise.we-ll-celebrate-this-weekend]</sub>

**Profile cold** (outcome resolved)

**Bentley Rivas:** Come here.

**Bentley Rivas:** County Commissioner. You really did it.

You could say:

1. I couldn't have done it without you. _(the page follows this one)_
2. I'm going to make this count.
3. Not bad for a first run, right?
4. It hasn't sunk in yet.

**Bentley Rivas:** You earned this.

You could say:

1. Thank you for putting up with all of it. _(the page follows this one)_
2. Things will settle down now. I promise.

**Bentley Rivas:** We'll celebrate this weekend.

<sub>L1 narrate/narrate/scene-talk/glad/19w2s [scene-talk.narrate-narrate.the-results-are-in-you-won-the-race-for-office-name-is-the-first-to-re]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L8 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L9 reply/thank/scene-talk/tender/9w1s [scene-talk.reply-thank.thank-you-for-putting-up-with-all-of-it]; L10 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L11 follow/promise/scene-talk/glad/4w1s [scene-talk.follow-promise.we-ll-celebrate-this-weekend]</sub>

**Profile stubborn** (outcome resolved)

**Bentley Rivas:** Come here.

**Bentley Rivas:** You did it!

You could say:

1. I couldn't have done it without you.
2. I'm going to make this count. _(the page follows this one)_
3. Not bad for a first run, right?
4. It hasn't sunk in yet.

**Bentley Rivas:** Go get some sleep. Big day tomorrow.

<sub>L1 narrate/narrate/scene-talk/glad/19w2s [scene-talk.narrate-narrate.the-results-are-in-you-won-the-race-for-office-name-is-the-first-to-re]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/3w1s [scene-talk.state-congratulate.you-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L8 follow/thank/scene-talk/glad/7w2s [scene-talk.follow-thank.go-get-some-sleep-big-day-tomorrow]</sub>

**Profile anxious** (outcome resolved)

**Bentley Rivas:** Come here.

**Bentley Rivas:** You did it!

You could say:

1. I couldn't have done it without you. _(the page follows this one)_
2. I'm going to make this count.
3. Not bad for a first run, right?
4. I still can't believe it.

**Bentley Rivas:** You earned this.

You could say:

1. Thank you for putting up with all of it. _(the page follows this one)_
2. Things will settle down now. I promise.

**Bentley Rivas:** We'll celebrate this weekend.

<sub>L1 narrate/narrate/scene-talk/glad/19w2s [scene-talk.narrate-narrate.the-results-are-in-you-won-the-race-for-office-name-is-the-first-to-re]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/3w1s [scene-talk.state-congratulate.you-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/glad/5w1s [scene-talk.reply-tell.i-still-can-t-believe-it]; L8 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L9 reply/thank/scene-talk/tender/9w1s [scene-talk.reply-thank.thank-you-for-putting-up-with-all-of-it]; L10 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L11 follow/promise/scene-talk/glad/4w1s [scene-talk.follow-promise.we-ll-celebrate-this-weekend]</sub>

**Profile boastful** (outcome resolved)

**Bentley Rivas:** Come here.

**Bentley Rivas:** You did it!

You could say:

1. I couldn't have done it without you. _(the page follows this one)_
2. I'm going to make this count.
3. Not bad for a first run, right?
4. I still can't believe it.

**Bentley Rivas:** We'll celebrate this weekend.

You could say:

1. Thank you for putting up with all of it. _(the page follows this one)_
2. Things will settle down now. I promise.

**Bentley Rivas:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/19w2s [scene-talk.narrate-narrate.the-results-are-in-you-won-the-race-for-office-name-is-the-first-to-re]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/3w1s [scene-talk.state-congratulate.you-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/glad/5w1s [scene-talk.reply-tell.i-still-can-t-believe-it]; L8 follow/promise/scene-talk/glad/4w1s [scene-talk.follow-promise.we-ll-celebrate-this-weekend]; L9 reply/thank/scene-talk/tender/9w1s [scene-talk.reply-thank.thank-you-for-putting-up-with-all-of-it]; L10 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L11 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

## Scene 27: family-win (honor, ends in political) — proof scene

_Purpose family-win. Records: result:contest:seat:gus2025:101811:sheriff:0:2026-11-03, contest:seat:gus2025:101811:sheriff:0:2026-11-03, person_f9be8ef45e5d143f._

> You won. Erin McCarthy is waiting at the door when you get home.

**Profile warm** (outcome resolved)

**Erin McCarthy:** Come here.

**Erin McCarthy:** County Sheriff. You really did it.

You could say:

1. I couldn't have done it without you.
2. I'm going to make this count.
3. Not bad for a first run, right?
4. I still can't believe it. _(the page follows this one)_

**Erin McCarthy:** You earned this.

You could say:

1. Thank you for putting up with all of it.
2. Things will settle down now. I promise. _(the page follows this one)_

**Erin McCarthy:** Go get some sleep. Big day tomorrow.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/glad/5w1s [scene-talk.reply-tell.i-still-can-t-believe-it]; L8 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L9 reply/thank/scene-talk/tender/9w1s [scene-talk.reply-thank.thank-you-for-putting-up-with-all-of-it]; L10 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L11 follow/thank/scene-talk/glad/7w2s [scene-talk.follow-thank.go-get-some-sleep-big-day-tomorrow]</sub>

**Profile cold** (outcome open)

**Erin McCarthy:** Come here.

**Erin McCarthy:** County Sheriff. You really did it.

You could say:

1. Thank you for putting up with all of it.
2. Things will settle down now. I promise.
3. Not bad for a first run, right? _(the page follows this one)_
4. I still can't believe it.

**Erin McCarthy:** Okay, okay. You won. Come inside.

You could say:

1. Okay, okay. I'll stay humble.
2. I told you I'd win. _(the page follows this one)_
3. I couldn't have done it without you.

**Erin McCarthy:** Don't let it go to your head.

**Erin McCarthy:** Your phone is going to ring all night.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/tender/9w1s [scene-talk.reply-thank.thank-you-for-putting-up-with-all-of-it]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/glad/5w1s [scene-talk.reply-tell.i-still-can-t-believe-it]; L8 follow/confront/scene-talk/glad/6w3s [scene-talk.follow-confront.okay-okay-you-won-come-inside]; L9 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L10 reply/boast/scene-talk/proud/5w1s [scene-talk.reply-boast.i-told-you-i-d-win]; L11 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L12 follow/confront/scene-talk/glad/7w1s [scene-talk.follow-confront.don-t-let-it-go-to-your-head]; L13 close/press/scene-talk/glad/8w1s [scene-talk.close-press.your-phone-is-going-to-ring-all-night]</sub>

**Profile stubborn** (outcome open)

**Erin McCarthy:** Come here.

**Erin McCarthy:** Congratulations. You earned it.

You could say:

1. I couldn't have done it without you.
2. Things will settle down now. I promise.
3. Not bad for a first run, right? _(the page follows this one)_
4. It hasn't sunk in yet.

**Erin McCarthy:** Okay, okay. You won. Come inside.

You could say:

1. Okay, okay. I'll stay humble.
2. I told you I'd win. _(the page follows this one)_
3. Thank you for putting up with all of it.

**Erin McCarthy:** Don't let it go to your head.

**Erin McCarthy:** Your phone is going to ring all night.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/4w2s [scene-talk.state-congratulate.congratulations-you-earned-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L8 follow/confront/scene-talk/glad/6w3s [scene-talk.follow-confront.okay-okay-you-won-come-inside]; L9 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L10 reply/boast/scene-talk/proud/5w1s [scene-talk.reply-boast.i-told-you-i-d-win]; L11 reply/thank/scene-talk/tender/9w1s [scene-talk.reply-thank.thank-you-for-putting-up-with-all-of-it]; L12 follow/confront/scene-talk/glad/7w1s [scene-talk.follow-confront.don-t-let-it-go-to-your-head]; L13 close/press/scene-talk/glad/8w1s [scene-talk.close-press.your-phone-is-going-to-ring-all-night]</sub>

**Profile anxious** (outcome open)

**Erin McCarthy:** Look who it is!

**Erin McCarthy:** Congratulations. You earned it.

You could say:

1. I couldn't have done it without you.
2. Things will settle down now. I promise.
3. Not bad for a first run, right? _(the page follows this one)_
4. It hasn't sunk in yet.

**Erin McCarthy:** Okay, okay. You won. Come inside.

You could say:

1. Okay, okay. I'll stay humble.
2. I told you I'd win. _(the page follows this one)_
3. Thank you for putting up with all of it.

**Erin McCarthy:** Don't let it go to your head.

**Erin McCarthy:** Your phone is going to ring all night.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-it-is]; L3 state/congratulate/scene-talk/glad/4w2s [scene-talk.state-congratulate.congratulations-you-earned-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L8 follow/confront/scene-talk/glad/6w3s [scene-talk.follow-confront.okay-okay-you-won-come-inside]; L9 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L10 reply/boast/scene-talk/proud/5w1s [scene-talk.reply-boast.i-told-you-i-d-win]; L11 reply/thank/scene-talk/tender/9w1s [scene-talk.reply-thank.thank-you-for-putting-up-with-all-of-it]; L12 follow/confront/scene-talk/glad/7w1s [scene-talk.follow-confront.don-t-let-it-go-to-your-head]; L13 close/press/scene-talk/glad/8w1s [scene-talk.close-press.your-phone-is-going-to-ring-all-night]</sub>

**Profile boastful** (outcome open)

**Erin McCarthy:** Look who it is!

**Erin McCarthy:** You did it!

You could say:

1. I couldn't have done it without you.
2. Things will settle down now. I promise.
3. Not bad for a first run, right? _(the page follows this one)_
4. It hasn't sunk in yet.

**Erin McCarthy:** Don't let it go to your head.

You could say:

1. Okay, okay. I'll stay humble.
2. I told you I'd win. _(the page follows this one)_
3. Thank you for putting up with all of it.

**Erin McCarthy:** Okay, okay. You won. Come inside.

**Erin McCarthy:** Your phone is going to ring all night.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-it-is]; L3 state/congratulate/scene-talk/glad/3w1s [scene-talk.state-congratulate.you-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L8 follow/confront/scene-talk/glad/7w1s [scene-talk.follow-confront.don-t-let-it-go-to-your-head]; L9 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L10 reply/boast/scene-talk/proud/5w1s [scene-talk.reply-boast.i-told-you-i-d-win]; L11 reply/thank/scene-talk/tender/9w1s [scene-talk.reply-thank.thank-you-for-putting-up-with-all-of-it]; L12 follow/confront/scene-talk/glad/6w3s [scene-talk.follow-confront.okay-okay-you-won-come-inside]; L13 close/press/scene-talk/glad/8w1s [scene-talk.close-press.your-phone-is-going-to-ring-all-night]</sub>

## Scene 28: family-absence (threat, ends in political) — proof scene

_Purpose family-absence. Records: term:seat:gus2025:101811:board:6:2027-01-01:elected, person_d3c11e75ee46a9b9, person_d3c12275ee46b085._

> You've been at the office late every night this week. Bentley Rivas is waiting up for you.

**Profile warm** (outcome resolved)

**Bentley Rivas:** You're home.

**Bentley Rivas:** We hardly see you since you took office.

You could say:

1. You're right. I'm sorry.
2. This weekend is ours. No calls. _(the page follows this one)_
3. It's just a busy stretch.
4. I'm doing this for us, too.

**Bentley Rivas:** Thank you. That's all I wanted to hear.

**If you push back:** (outcome resolved)

You could say:

1. You're right. I'm sorry.
2. This weekend is ours. No calls.
3. It's just a busy stretch. _(the page follows this one)_
4. I'm doing this for us, too.

**Bentley Rivas:** You said that last time.

You could say:

1. I'll be home more. I promise. _(the page follows this one)_
2. I've let things slide at home. I know.
3. This job doesn't leave much time. You know that.

**Bentley Rivas:** Thank you. That's all I wanted to hear.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/hurt/2w1s [scene-talk.open-greet.you-re-home]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L5 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L6 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-just-a-busy-stretch]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 follow/accept/scene-talk/tender/8w2s [scene-talk.follow-accept.thank-you-that-s-all-i-wanted-to-hear]</sub>

**Profile cold** (outcome resolved)

**Bentley Rivas:** You're home.

**Bentley Rivas:** We hardly see you since you took office.

You could say:

1. You're right. I'm sorry.
2. I'll be home more. I promise. _(the page follows this one)_
3. It's just a busy stretch.
4. I'm doing this for us, too.

**Bentley Rivas:** Okay. I'm holding you to that.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/hurt/2w1s [scene-talk.open-greet.you-re-home]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-just-a-busy-stretch]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 follow/accept/scene-talk/guarded/6w2s [scene-talk.follow-accept.okay-i-m-holding-you-to-that]</sub>

**Profile stubborn** (outcome resolved)

**Bentley Rivas:** You're home.

**Bentley Rivas:** We hardly see you since you took office.

You could say:

1. You're right. I'm sorry.
2. This weekend is ours. No calls. _(the page follows this one)_
3. Can we not do this tonight?
4. I'm doing this for us, too.

**Bentley Rivas:** You said that last time.

You could say:

1. I'll be home more. I promise. _(the page follows this one)_
2. I've let things slide at home. I know.
3. This job doesn't leave much time. You know that.

**Bentley Rivas:** Saying sorry isn't the same as being here.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/hurt/2w1s [scene-talk.open-greet.you-re-home]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L5 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]; L9 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L10 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L11 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L12 follow/press/scene-talk/hurt/8w1s [scene-talk.follow-press.saying-sorry-isn-t-the-same-as-being-here]</sub>

**Profile anxious** (outcome resolved)

**Bentley Rivas:** You're home.

**Bentley Rivas:** We hardly see you since you took office.

You could say:

1. You're right. I'm sorry.
2. This weekend is ours. No calls. _(the page follows this one)_
3. It's just a busy stretch.
4. This job doesn't leave much time. You know that.

**Bentley Rivas:** Okay. I'm holding you to that.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/hurt/2w1s [scene-talk.open-greet.you-re-home]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L5 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L6 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-just-a-busy-stretch]; L7 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L8 follow/accept/scene-talk/guarded/6w2s [scene-talk.follow-accept.okay-i-m-holding-you-to-that]</sub>

## Scene 29: family-absence (threat, ends in political) — proof scene

_Purpose family-absence. Records: term:seat:gus2025:101811:board:3:2026-10-12, person_bc041cf6bd9d1894, person_bc041df6bd9d1a47._

> You've been at the office late every night this week. Olivia Keller is waiting up for you.

**Profile warm** (outcome resolved)

**Olivia Keller:** Oh. You're back.

**Olivia Keller:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. This weekend is ours. No calls. _(the page follows this one)_
3. It's just a busy stretch.
4. I'm doing this for us, too.

**Olivia Keller:** Thank you. That's all I wanted to hear.

**If you push back:** (outcome resolved)

You could say:

1. I've let things slide at home. I know.
2. This weekend is ours. No calls.
3. It's just a busy stretch.
4. I'm doing this for us, too. _(the page follows this one)_

**Olivia Keller:** We miss you. That's all.

You could say:

1. I'll be home more. I promise. _(the page follows this one)_
2. You're right. I'm sorry.
3. Can we not do this tonight?

**Olivia Keller:** You said that last time.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L6 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-just-a-busy-stretch]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 follow/accept/scene-talk/tender/8w2s [scene-talk.follow-accept.thank-you-that-s-all-i-wanted-to-hear]</sub>

**Profile cold** (outcome resolved)

**Olivia Keller:** Oh. You're back.

**Olivia Keller:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise.
3. Can we not do this tonight?
4. I'm doing this for us, too. _(the page follows this one)_

**Olivia Keller:** We miss you. That's all.

You could say:

1. This weekend is ours. No calls. _(the page follows this one)_
2. You're right. I'm sorry.
3. It's just a busy stretch.

**Olivia Keller:** You said that last time.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 follow/plea/scene-talk/tender/5w2s [scene-talk.follow-plea.we-miss-you-that-s-all]; L9 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L10 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L11 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-just-a-busy-stretch]; L12 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]</sub>

**Profile stubborn** (outcome open)

**Olivia Keller:** Oh. You're back.

**Olivia Keller:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise.
3. It's just a busy stretch.
4. This job doesn't leave much time. You know that. _(the page follows this one)_

**Olivia Keller:** Don't put this on me.

You could say:

1. You're right. I'm sorry.
2. I'm doing this for us, too. _(the page follows this one)_
3. This weekend is ours. No calls.

**Olivia Keller:** That's not fair, and you know it.

**Olivia Keller:** We're not done talking about this.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-just-a-busy-stretch]; L7 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L8 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.don-t-put-this-on-me]; L9 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L10 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L11 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L12 follow/disagree/scene-talk/hurt/7w1s [scene-talk.follow-disagree.that-s-not-fair-and-you-know-it]; L13 close/warn/scene-talk/hurt/6w1s [scene-talk.close-warn.we-re-not-done-talking-about-this]</sub>

## Scene 30: family-absence (threat, ends in political) — proof scene

_Purpose family-absence. Records: term:seat:gus2025:101811:board:5:2026-10-12, person_9e002a561a4b29bc, person_9e002b561a4b2b6f._

> You've been at the office late every night this week. Kelly Riggs is waiting up for you.

**Profile warm** (outcome resolved)

**Kelly Riggs:** Oh. You're back.

**Kelly Riggs:** We hardly see you since you took office.

You could say:

1. You're right. I'm sorry.
2. This weekend is ours. No calls. _(the page follows this one)_
3. Can we not do this tonight?
4. I'm doing this for us, too.

**Kelly Riggs:** Thank you. That's all I wanted to hear.

**If you push back:** (outcome resolved)

You could say:

1. You're right. I'm sorry.
2. This weekend is ours. No calls.
3. Can we not do this tonight? _(the page follows this one)_
4. I'm doing this for us, too.

**Kelly Riggs:** We miss you. That's all.

You could say:

1. I'll be home more. I promise. _(the page follows this one)_
2. I've let things slide at home. I know.
3. It's just a busy stretch.

**Kelly Riggs:** Thank you. That's all I wanted to hear.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L5 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 follow/accept/scene-talk/tender/8w2s [scene-talk.follow-accept.thank-you-that-s-all-i-wanted-to-hear]</sub>

**Profile cold** (outcome resolved)

**Kelly Riggs:** Oh. You're back.

**Kelly Riggs:** We hardly see you since you took office.

You could say:

1. You're right. I'm sorry.
2. I'll be home more. I promise. _(the page follows this one)_
3. Can we not do this tonight?
4. This job doesn't leave much time. You know that.

**Kelly Riggs:** Okay. I'm holding you to that.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L8 follow/accept/scene-talk/guarded/6w2s [scene-talk.follow-accept.okay-i-m-holding-you-to-that]</sub>

**Profile stubborn** (outcome resolved)

**Kelly Riggs:** You're home.

**Kelly Riggs:** We hardly see you since you took office.

You could say:

1. You're right. I'm sorry.
2. This weekend is ours. No calls. _(the page follows this one)_
3. Can we not do this tonight?
4. I'm doing this for us, too.

**Kelly Riggs:** You said that last time.

You could say:

1. I'll be home more. I promise. _(the page follows this one)_
2. I've let things slide at home. I know.
3. This job doesn't leave much time. You know that.

**Kelly Riggs:** Saying sorry isn't the same as being here.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/hurt/2w1s [scene-talk.open-greet.you-re-home]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L5 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]; L9 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L10 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L11 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L12 follow/press/scene-talk/hurt/8w1s [scene-talk.follow-press.saying-sorry-isn-t-the-same-as-being-here]</sub>

**Profile anxious** (outcome resolved)

**Kelly Riggs:** Oh. You're back.

**Kelly Riggs:** We hardly see you since you took office.

You could say:

1. You're right. I'm sorry.
2. This weekend is ours. No calls. _(the page follows this one)_
3. Can we not do this tonight?
4. I'm doing this for us, too.

**Kelly Riggs:** Okay. I'm holding you to that.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L5 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 follow/accept/scene-talk/guarded/6w2s [scene-talk.follow-accept.okay-i-m-holding-you-to-that]</sub>

## Scene 31: rally-opponent (threat, ends in political) — proof scene

_Purpose rally-opponent. Records: filing:contest:seat:gus2025:101811:sheriff:0:2026-11-03:person_f9be8ef45e5d143f, official:term:seat:US-DE:treasurer:2026-10-12, person_f9be8ef45e5d143f._

> Michael Norton is working the same crowd. Now Michael Norton is walking straight toward you.

**Profile warm** (outcome open)

**Michael Norton:** I didn't expect to see you here.

**Michael Norton:** Nice speech. Too bad none of it was true.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. Enjoy the rally.
3. You're the one who has to explain yourself.
4. I've won tougher races than this one.

**Michael Norton:** Keep telling yourself that.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. Look at this crowd. People know where I stand.
3. I'm here to talk to voters, not to you.

**Michael Norton:** Say that to the voters.

**Michael Norton:** See you on election day.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/9w2s [scene-talk.state-confront.nice-speech-too-bad-none-of-it-was-true]; L4 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L5 reply/deflect/scene-talk/guarded/3w1s [scene-talk.reply-deflect.enjoy-the-rally]; L6 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L7 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L8 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L9 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L10 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L11 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L12 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L13 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

**Profile cold** (outcome open)

**Michael Norton:** Well, look who it is.

**Michael Norton:** People here know your record.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. Enjoy the rally.
3. Say that on the debate stage.
4. I've won tougher races than this one.

**Michael Norton:** Say that to the voters.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. Look at this crowd. People know where I stand.
3. I'm here to talk to voters, not to you.

**Michael Norton:** Keep telling yourself that.

**Michael Norton:** This isn't over.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/3w1s [scene-talk.reply-deflect.enjoy-the-rally]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L8 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L11 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L12 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L13 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

**Profile stubborn** (outcome open)

**Michael Norton:** Well, look who it is.

**Michael Norton:** People here know your record.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. I'm here to talk to voters, not to you.
3. Say that on the debate stage.
4. I've won tougher races than this one.

**Michael Norton:** Keep telling yourself that.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. Look at this crowd. People know where I stand.
3. Enjoy the rally.

**Michael Norton:** You'd better hope they don't look too closely.

**Michael Norton:** This isn't over.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L8 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L11 reply/deflect/scene-talk/guarded/3w1s [scene-talk.reply-deflect.enjoy-the-rally]; L12 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L13 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

**Profile anxious** (outcome open)

**Michael Norton:** I didn't expect to see you here.

**Michael Norton:** Nice speech. Too bad none of it was true.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. I'm here to talk to voters, not to you.
3. You're the one who has to explain yourself.
4. I've won tougher races than this one.

**Michael Norton:** Say that to the voters.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. Look at this crowd. People know where I stand.
3. Enjoy the rally.

**Michael Norton:** Keep telling yourself that.

**Michael Norton:** See you on election day.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/9w2s [scene-talk.state-confront.nice-speech-too-bad-none-of-it-was-true]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L6 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L7 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L8 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L11 reply/deflect/scene-talk/guarded/3w1s [scene-talk.reply-deflect.enjoy-the-rally]; L12 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L13 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

**Profile boastful** (outcome open)

**Michael Norton:** I didn't expect to see you here.

**Michael Norton:** Nice speech. Too bad none of it was true.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. I'm here to talk to voters, not to you.
3. You're the one who has to explain yourself.
4. I've won tougher races than this one.

**Michael Norton:** Say that to the voters.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. Look at this crowd. People know where I stand.
3. Enjoy the rally.

**Michael Norton:** Keep telling yourself that.

**Michael Norton:** See you on election day.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/9w2s [scene-talk.state-confront.nice-speech-too-bad-none-of-it-was-true]; L4 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L5 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L6 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L7 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L8 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L9 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L10 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L11 reply/deflect/scene-talk/guarded/3w1s [scene-talk.reply-deflect.enjoy-the-rally]; L12 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L13 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

## Scene 32: rally-opponent (threat, ends in political) — proof scene

_Purpose rally-opponent. Records: filing:contest:seat:US-DE:attorney-general:2026-11-03:official:term:seat:US-DE:upper:021:0:2026-10-12, official:term:seat:US-DE:attorney-general:2026-10-12, official:term:seat:US-DE:upper:021:0:2026-10-12._

> You're shaking hands by the stage when Julie Villegas cuts through the line.

**Profile warm** (outcome open)

**Julie Villegas:** Well, look who it is.

**Julie Villegas:** You can't win this, you know.

You could say:

1. That's not true, and you know it.
2. Enjoy the rally.
3. You're the one who has to explain yourself.
4. Look at this crowd. People know where I stand. _(the page follows this one)_

**Julie Villegas:** You'd better hope they don't look too closely.

You could say:

1. We'll let the voters decide that.
2. I've won tougher races than this one. _(the page follows this one)_
3. I'm here to talk to voters, not to you.

**Julie Villegas:** Say that to the voters.

**Julie Villegas:** This isn't over.

<sub>L1 narrate/narrate/scene-talk/braced/13w1s [scene-talk.narrate-narrate.you-re-shaking-hands-by-the-stage-when-name-cuts-through-the-line]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/6w1s [scene-talk.state-confront.you-can-t-win-this-you-know]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/3w1s [scene-talk.reply-deflect.enjoy-the-rally]; L6 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L8 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L11 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L12 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L13 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

**Profile cold** (outcome open)

**Julie Villegas:** Well, look who it is.

**Julie Villegas:** You can't win this, you know.

You could say:

1. That's not true, and you know it.
2. Enjoy the rally.
3. Say that on the debate stage. _(the page follows this one)_
4. Look at this crowd. People know where I stand.

**Julie Villegas:** I've been here longer than you have.

You could say:

1. We'll let the voters decide that.
2. You're the one who has to explain yourself. _(the page follows this one)_
3. I'm here to talk to voters, not to you.

**Julie Villegas:** Say that to the voters.

**Julie Villegas:** See you on election day.

<sub>L1 narrate/narrate/scene-talk/braced/13w1s [scene-talk.narrate-narrate.you-re-shaking-hands-by-the-stage-when-name-cuts-through-the-line]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/6w1s [scene-talk.state-confront.you-can-t-win-this-you-know]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/3w1s [scene-talk.reply-deflect.enjoy-the-rally]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L8 follow/boast/scene-talk/proud/7w1s [scene-talk.follow-boast.i-ve-been-here-longer-than-you-have]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L11 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L12 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L13 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

**Profile stubborn** (outcome open)

**Julie Villegas:** Well, look who it is.

**Julie Villegas:** People here know your record.

You could say:

1. That's not true, and you know it.
2. I'm here to talk to voters, not to you.
3. Say that on the debate stage. _(the page follows this one)_
4. Look at this crowd. People know where I stand.

**Julie Villegas:** I've been here longer than you have.

You could say:

1. We'll let the voters decide that.
2. You're the one who has to explain yourself. _(the page follows this one)_
3. Enjoy the rally.

**Julie Villegas:** Say that to the voters.

**Julie Villegas:** This isn't over.

<sub>L1 narrate/narrate/scene-talk/braced/13w1s [scene-talk.narrate-narrate.you-re-shaking-hands-by-the-stage-when-name-cuts-through-the-line]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L8 follow/boast/scene-talk/proud/7w1s [scene-talk.follow-boast.i-ve-been-here-longer-than-you-have]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L11 reply/deflect/scene-talk/guarded/3w1s [scene-talk.reply-deflect.enjoy-the-rally]; L12 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L13 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

**Profile anxious** (outcome open)

**Julie Villegas:** Well, look who it is.

**Julie Villegas:** You can't win this, you know.

You could say:

1. We'll let the voters decide that.
2. Enjoy the rally. _(the page follows this one)_
3. You're the one who has to explain yourself.
4. Look at this crowd. People know where I stand.

**Julie Villegas:** I've been here longer than you have.

You could say:

1. That's not true, and you know it.
2. Say that on the debate stage.
3. I'm here to talk to voters, not to you. _(the page follows this one)_

**Julie Villegas:** Say that to the voters.

**Julie Villegas:** This isn't over.

<sub>L1 narrate/narrate/scene-talk/braced/13w1s [scene-talk.narrate-narrate.you-re-shaking-hands-by-the-stage-when-name-cuts-through-the-line]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/6w1s [scene-talk.state-confront.you-can-t-win-this-you-know]; L4 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L5 reply/deflect/scene-talk/guarded/3w1s [scene-talk.reply-deflect.enjoy-the-rally]; L6 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L8 follow/boast/scene-talk/proud/7w1s [scene-talk.follow-boast.i-ve-been-here-longer-than-you-have]; L9 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L10 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L11 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L12 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L13 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

**Profile boastful** (outcome open)

**Julie Villegas:** Well, look who it is.

**Julie Villegas:** You can't win this, you know.

You could say:

1. That's not true, and you know it.
2. Enjoy the rally.
3. You're the one who has to explain yourself.
4. Look at this crowd. People know where I stand. _(the page follows this one)_

**Julie Villegas:** Keep telling yourself that.

You could say:

1. We'll let the voters decide that.
2. I've won tougher races than this one. _(the page follows this one)_
3. I'm here to talk to voters, not to you.

**Julie Villegas:** You'd better hope they don't look too closely.

**Julie Villegas:** This isn't over.

<sub>L1 narrate/narrate/scene-talk/braced/13w1s [scene-talk.narrate-narrate.you-re-shaking-hands-by-the-stage-when-name-cuts-through-the-line]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/6w1s [scene-talk.state-confront.you-can-t-win-this-you-know]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/3w1s [scene-talk.reply-deflect.enjoy-the-rally]; L6 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L8 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L11 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L12 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L13 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

## Scene 33: rally-opponent (threat, ends in political) — proof scene

_Purpose rally-opponent. Records: filing:contest:seat:US-DE:treasurer:2026-11-03:official:term:seat:US-DE:treasurer:2026-10-12, official:term:seat:US-DE:upper:015:0:2026-10-12, official:term:seat:US-DE:treasurer:2026-10-12._

> Brittany Tucker is working the same crowd. Now Brittany Tucker is walking straight toward you.

**Profile warm** (outcome open)

**Brittany Tucker:** I didn't expect to see you here.

**Brittany Tucker:** Nice speech. Too bad none of it was true.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. Enjoy the rally.
3. You're the one who has to explain yourself.
4. Look at this crowd. People know where I stand.

**Brittany Tucker:** Say that to the voters.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. I've won tougher races than this one.
3. I'm here to talk to voters, not to you.

**Brittany Tucker:** Keep telling yourself that.

**Brittany Tucker:** See you on election day.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/9w2s [scene-talk.state-confront.nice-speech-too-bad-none-of-it-was-true]; L4 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L5 reply/deflect/scene-talk/guarded/3w1s [scene-talk.reply-deflect.enjoy-the-rally]; L6 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L8 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L9 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L10 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L11 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L12 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L13 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

**Profile cold** (outcome open)

**Brittany Tucker:** I didn't expect to see you here.

**Brittany Tucker:** People here know your record.

You could say:

1. That's not true, and you know it.
2. I'm here to talk to voters, not to you. _(the page follows this one)_
3. You're the one who has to explain yourself.
4. Look at this crowd. People know where I stand.

**Brittany Tucker:** I've been here longer than you have.

You could say:

1. We'll let the voters decide that.
2. Say that on the debate stage.
3. Enjoy the rally. _(the page follows this one)_

**Brittany Tucker:** Keep telling yourself that.

**Brittany Tucker:** See you on election day.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L6 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L8 follow/boast/scene-talk/proud/7w1s [scene-talk.follow-boast.i-ve-been-here-longer-than-you-have]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L11 reply/deflect/scene-talk/guarded/3w1s [scene-talk.reply-deflect.enjoy-the-rally]; L12 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L13 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

**Profile stubborn** (outcome open)

**Brittany Tucker:** I didn't expect to see you here.

**Brittany Tucker:** You can't win this, you know.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. I'm here to talk to voters, not to you.
3. Say that on the debate stage.
4. Look at this crowd. People know where I stand.

**Brittany Tucker:** Say that to the voters.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. I've won tougher races than this one.
3. Enjoy the rally.

**Brittany Tucker:** You'd better hope they don't look too closely.

**Brittany Tucker:** See you on election day.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/6w1s [scene-talk.state-confront.you-can-t-win-this-you-know]; L4 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L5 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L8 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L9 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L10 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L11 reply/deflect/scene-talk/guarded/3w1s [scene-talk.reply-deflect.enjoy-the-rally]; L12 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L13 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

**Profile anxious** (outcome open)

**Brittany Tucker:** I didn't expect to see you here.

**Brittany Tucker:** Nice speech. Too bad none of it was true.

You could say:

1. That's not true, and you know it.
2. I'm here to talk to voters, not to you. _(the page follows this one)_
3. You're the one who has to explain yourself.
4. Look at this crowd. People know where I stand.

**Brittany Tucker:** I've been here longer than you have.

You could say:

1. We'll let the voters decide that.
2. Say that on the debate stage.
3. Enjoy the rally. _(the page follows this one)_

**Brittany Tucker:** Say that to the voters.

**Brittany Tucker:** See you on election day.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/9w2s [scene-talk.state-confront.nice-speech-too-bad-none-of-it-was-true]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L6 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L8 follow/boast/scene-talk/proud/7w1s [scene-talk.follow-boast.i-ve-been-here-longer-than-you-have]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L11 reply/deflect/scene-talk/guarded/3w1s [scene-talk.reply-deflect.enjoy-the-rally]; L12 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L13 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

**Profile boastful** (outcome open)

**Brittany Tucker:** I didn't expect to see you here.

**Brittany Tucker:** Nice speech. Too bad none of it was true.

You could say:

1. We'll let the voters decide that.
2. I'm here to talk to voters, not to you.
3. You're the one who has to explain yourself.
4. Look at this crowd. People know where I stand. _(the page follows this one)_

**Brittany Tucker:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it.
2. I've won tougher races than this one. _(the page follows this one)_
3. Enjoy the rally.

**Brittany Tucker:** Keep telling yourself that.

**Brittany Tucker:** See you on election day.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/9w2s [scene-talk.state-confront.nice-speech-too-bad-none-of-it-was-true]; L4 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L5 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L6 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L8 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L9 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L10 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L11 reply/deflect/scene-talk/guarded/3w1s [scene-talk.reply-deflect.enjoy-the-rally]; L12 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L13 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

## Scene 34: desk-bill (vote-wanted, ends in bill) — proof scene

_Purpose desk-bill. Records: desk:bill:office:US-DE:legislature-upper:2027-01-12:official:term:seat:US-DE:upper:002:0:2026-10-12:5, bill:office:US-DE:legislature-upper:2027-01-12:official:term:seat:US-DE:upper:002:0:2026-10-12:5, staffer:official:term:seat:US-DE:governor:2026-10-12:person:aide:official:term:seat:US-DE:governor:2026-10-12:0, official:term:seat:US-DE:governor:2026-10-12._

> Jamie Moreno sets "Right to counsel in eviction" on your desk. You can sign it or veto it.

**Profile warm** (outcome open)

**Jamie Moreno:** This one's waiting on you.

**Jamie Moreno:** "Right to counsel in eviction" passed. It needs your signature.

You could say:

1. It's a good bill. I'll sign it today.
2. I won't sign it as it is.
3. What's in it? _(the page follows this one)_
4. Let me read it tonight.

**Jamie Moreno:** The file has everything. I'll leave it with you.

You could say:

1. I'll sign it.
2. I'm going to veto it.
3. Who voted against it? _(the page follows this one)_
4. I want to sleep on it.

**Jamie Moreno:** It's all in the vote record.

**Jamie Moreno:** Let me know when you've decided.

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.name-sets-bill-on-your-desk-you-can-sign-it-or-veto-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.this-one-s-waiting-on-you]; L3 state/deliver-news/scene-talk/calm/10w2s [scene-talk.state-deliver-news.bill-passed-it-needs-your-signature]; L4 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L5 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-won-t-sign-it-as-it-is]; L6 reply/ask/scene-talk/curious/3w1s [scene-talk.reply-ask.what-s-in-it]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-read-it-tonight]; L8 follow/answer/scene-talk/calm/9w2s [scene-talk.follow-answer.the-file-has-everything-i-ll-leave-it-with-you]; L9 reply/agree/scene-talk/calm/3w1s [scene-talk.reply-agree.i-ll-sign-it]; L10 reply/refuse/scene-talk/braced/5w1s [scene-talk.reply-refuse.i-m-going-to-veto-it]; L11 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.who-voted-against-it]; L12 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L13 follow/answer/scene-talk/calm/6w1s [scene-talk.follow-answer.it-s-all-in-the-vote-record]; L14 close/press/scene-talk/calm/6w1s [scene-talk.close-press.let-me-know-when-you-ve-decided]</sub>

**Profile cold** (outcome refused)

**Jamie Moreno:** This one's waiting on you.

**Jamie Moreno:** "Right to counsel in eviction" passed. It needs your signature.

You could say:

1. It's a good bill. I'll sign it today.
2. I'm going to veto it. _(the page follows this one)_
3. What's in it?
4. Let me read it tonight.

**Jamie Moreno:** I'll send it to the clerk.

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.name-sets-bill-on-your-desk-you-can-sign-it-or-veto-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.this-one-s-waiting-on-you]; L3 state/deliver-news/scene-talk/calm/10w2s [scene-talk.state-deliver-news.bill-passed-it-needs-your-signature]; L4 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L5 reply/refuse/scene-talk/braced/5w1s [scene-talk.reply-refuse.i-m-going-to-veto-it]; L6 reply/ask/scene-talk/curious/3w1s [scene-talk.reply-ask.what-s-in-it]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-read-it-tonight]; L8 follow/accept/scene-talk/calm/6w1s [scene-talk.follow-accept.i-ll-send-it-to-the-clerk]</sub>

**Profile stubborn** (outcome refused)

**Jamie Moreno:** This one's waiting on you.

**Jamie Moreno:** "Right to counsel in eviction" is on your desk. Sign it or veto it?

You could say:

1. I'll sign it.
2. I'm going to veto it. _(the page follows this one)_
3. What's in it?
4. Let me read it tonight.

**Jamie Moreno:** I'll get the veto message drafted.

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.name-sets-bill-on-your-desk-you-can-sign-it-or-veto-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.this-one-s-waiting-on-you]; L3 state/deliver-news/scene-talk/calm/14w2s [scene-talk.state-deliver-news.bill-is-on-your-desk-sign-it-or-veto-it]; L4 reply/agree/scene-talk/calm/3w1s [scene-talk.reply-agree.i-ll-sign-it]; L5 reply/refuse/scene-talk/braced/5w1s [scene-talk.reply-refuse.i-m-going-to-veto-it]; L6 reply/ask/scene-talk/curious/3w1s [scene-talk.reply-ask.what-s-in-it]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-read-it-tonight]; L8 follow/accept/scene-talk/calm/6w1s [scene-talk.follow-accept.i-ll-get-the-veto-message-drafted]</sub>

**Profile anxious** (outcome resolved)

**Jamie Moreno:** This one's waiting on you.

**Jamie Moreno:** The council sent over "Right to counsel in eviction". It's yours now.

You could say:

1. It's a good bill. I'll sign it today.
2. I won't sign it as it is.
3. Who voted against it?
4. Let me read it tonight. _(the page follows this one)_

**Jamie Moreno:** The council's going to ask what you decided.

You could say:

1. I'll sign it. _(the page follows this one)_
2. I'm going to veto it.

**Jamie Moreno:** I'll get the veto message drafted.

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.name-sets-bill-on-your-desk-you-can-sign-it-or-veto-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.this-one-s-waiting-on-you]; L3 state/deliver-news/scene-talk/calm/12w2s [scene-talk.state-deliver-news.the-council-sent-over-bill-it-s-yours-now]; L4 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L5 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-won-t-sign-it-as-it-is]; L6 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.who-voted-against-it]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-read-it-tonight]; L8 follow/press/scene-talk/calm/8w1s [scene-talk.follow-press.the-council-s-going-to-ask-what-you-decided]; L9 reply/agree/scene-talk/calm/3w1s [scene-talk.reply-agree.i-ll-sign-it]; L10 reply/refuse/scene-talk/braced/5w1s [scene-talk.reply-refuse.i-m-going-to-veto-it]; L11 follow/accept/scene-talk/calm/6w1s [scene-talk.follow-accept.i-ll-get-the-veto-message-drafted]</sub>

**Profile boastful** (outcome open)

**Jamie Moreno:** This one's waiting on you.

**Jamie Moreno:** "Right to counsel in eviction" passed. It needs your signature.

You could say:

1. It's a good bill. I'll sign it today.
2. I won't sign it as it is.
3. Who voted against it? _(the page follows this one)_
4. Let me read it tonight.

**Jamie Moreno:** It's all in the vote record.

You could say:

1. I'll sign it.
2. I'm going to veto it.
3. What's in it? _(the page follows this one)_
4. I want to sleep on it.

**Jamie Moreno:** The file has everything. I'll leave it with you.

**Jamie Moreno:** Let me know when you've decided.

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.name-sets-bill-on-your-desk-you-can-sign-it-or-veto-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.this-one-s-waiting-on-you]; L3 state/deliver-news/scene-talk/calm/10w2s [scene-talk.state-deliver-news.bill-passed-it-needs-your-signature]; L4 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L5 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-won-t-sign-it-as-it-is]; L6 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.who-voted-against-it]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-read-it-tonight]; L8 follow/answer/scene-talk/calm/6w1s [scene-talk.follow-answer.it-s-all-in-the-vote-record]; L9 reply/agree/scene-talk/calm/3w1s [scene-talk.reply-agree.i-ll-sign-it]; L10 reply/refuse/scene-talk/braced/5w1s [scene-talk.reply-refuse.i-m-going-to-veto-it]; L11 reply/ask/scene-talk/curious/3w1s [scene-talk.reply-ask.what-s-in-it]; L12 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L13 follow/answer/scene-talk/calm/9w2s [scene-talk.follow-answer.the-file-has-everything-i-ll-leave-it-with-you]; L14 close/press/scene-talk/calm/6w1s [scene-talk.close-press.let-me-know-when-you-ve-decided]</sub>

## Scene 35: staff-news (news-received, ends in political) — proof scene

_Purpose staff-news. Records: bill:federal:us-house:2026-10-13:official:seat:US-NJ:us-house:02:0, staffer:official:term:seat:US-DE:attorney-general:2026-10-12:person:aide:official:term:seat:US-DE:attorney-general:2026-10-12:0, official:seat:US-NJ:us-house:02, organization:press:newspaper:0:jurisdiction_59500182da2857ae._

> Stephen Whitaker comes into your office and closes the door.

**Profile warm** (outcome open)

**Stephen Whitaker:** You're going to want to sit down for this.

**Stephen Whitaker:** We lost the vote on "Medicaid work requirement".

You could say:

1. Who changed their vote? _(the page follows this one)_
2. How did we not see this coming?
3. All right. Tell me what we do now.
4. Not now. I need to think.

**Stephen Whitaker:** Give me an hour. I'll know who it was.

You could say:

1. Who changed their vote? _(the page follows this one)_
2. Somebody leaked it. Find out who.
3. It's done. Let's deal with it.

**Stephen Whitaker:** I'm still finding out. I'll have names tonight.

**Stephen Whitaker:** This isn't going away on its own.

<sub>L1 narrate/narrate/scene-talk/solemn/10w1s [scene-talk.narrate-narrate.name-comes-into-your-office-and-closes-the-door]; L2 open/greet/scene-talk/solemn/9w1s [scene-talk.open-greet.you-re-going-to-want-to-sit-down-for-this]; L3 state/deliver-news/scene-talk/solemn/8w1s [scene-talk.state-deliver-news.we-lost-the-vote-on-bill]; L4 reply/ask/scene-talk/braced/4w1s [scene-talk.reply-ask.who-changed-their-vote]; L5 reply/blame/scene-talk/braced/7w1s [scene-talk.reply-blame.how-did-we-not-see-this-coming]; L6 reply/accept/scene-talk/calm/8w2s [scene-talk.reply-accept.all-right-tell-me-what-we-do-now]; L7 reply/deflect/scene-talk/guarded/6w2s [scene-talk.reply-deflect.not-now-i-need-to-think]; L8 follow/answer/scene-talk/solemn/9w2s [scene-talk.follow-answer.give-me-an-hour-i-ll-know-who-it-was]; L9 reply/ask/scene-talk/braced/4w1s [scene-talk.reply-ask.who-changed-their-vote]; L10 reply/blame/scene-talk/braced/6w2s [scene-talk.reply-blame.somebody-leaked-it-find-out-who]; L11 reply/accept/scene-talk/calm/6w2s [scene-talk.reply-accept.it-s-done-let-s-deal-with-it]; L12 follow/answer/scene-talk/solemn/8w2s [scene-talk.follow-answer.i-m-still-finding-out-i-ll-have-names-tonight]; L13 close/warn/scene-talk/solemn/7w1s [scene-talk.close-warn.this-isn-t-going-away-on-its-own]</sub>

**Profile cold** (outcome resolved)

**Stephen Whitaker:** You're going to want to sit down for this.

**Stephen Whitaker:** We lost the vote on "Medicaid work requirement".

You could say:

1. Who changed their vote?
2. Somebody leaked it. Find out who. _(the page follows this one)_
3. All right. Tell me what we do now.
4. Not now. I need to think.

**Stephen Whitaker:** I'll find out who it was.

You could say:

1. Thank you. Keep me posted. _(the page follows this one)_
2. It's done. Let's deal with it.

**Stephen Whitaker:** I'll get started.

<sub>L1 narrate/narrate/scene-talk/solemn/10w1s [scene-talk.narrate-narrate.name-comes-into-your-office-and-closes-the-door]; L2 open/greet/scene-talk/solemn/9w1s [scene-talk.open-greet.you-re-going-to-want-to-sit-down-for-this]; L3 state/deliver-news/scene-talk/solemn/8w1s [scene-talk.state-deliver-news.we-lost-the-vote-on-bill]; L4 reply/ask/scene-talk/braced/4w1s [scene-talk.reply-ask.who-changed-their-vote]; L5 reply/blame/scene-talk/braced/6w2s [scene-talk.reply-blame.somebody-leaked-it-find-out-who]; L6 reply/accept/scene-talk/calm/8w2s [scene-talk.reply-accept.all-right-tell-me-what-we-do-now]; L7 reply/deflect/scene-talk/guarded/6w2s [scene-talk.reply-deflect.not-now-i-need-to-think]; L8 follow/promise/scene-talk/braced/6w1s [scene-talk.follow-promise.i-ll-find-out-who-it-was]; L9 reply/thank/scene-talk/calm/5w2s [scene-talk.reply-thank.thank-you-keep-me-posted]; L10 reply/accept/scene-talk/calm/6w2s [scene-talk.reply-accept.it-s-done-let-s-deal-with-it]; L11 follow/thank/scene-talk/calm/3w1s [scene-talk.follow-thank.i-ll-get-started]</sub>

**Profile anxious** (outcome open)

**Stephen Whitaker:** You're going to want to sit down for this.

**Stephen Whitaker:** We lost the vote on "Medicaid work requirement".

You could say:

1. Who changed their vote? _(the page follows this one)_
2. How did we not see this coming?
3. It's done. Let's deal with it.
4. Not now. I need to think.

**Stephen Whitaker:** Give me an hour. I'll know who it was.

You could say:

1. Who changed their vote? _(the page follows this one)_
2. Somebody leaked it. Find out who.
3. All right. Tell me what we do now.

**Stephen Whitaker:** I'm still finding out. I'll have names tonight.

**Stephen Whitaker:** This isn't going away on its own.

<sub>L1 narrate/narrate/scene-talk/solemn/10w1s [scene-talk.narrate-narrate.name-comes-into-your-office-and-closes-the-door]; L2 open/greet/scene-talk/solemn/9w1s [scene-talk.open-greet.you-re-going-to-want-to-sit-down-for-this]; L3 state/deliver-news/scene-talk/solemn/8w1s [scene-talk.state-deliver-news.we-lost-the-vote-on-bill]; L4 reply/ask/scene-talk/braced/4w1s [scene-talk.reply-ask.who-changed-their-vote]; L5 reply/blame/scene-talk/braced/7w1s [scene-talk.reply-blame.how-did-we-not-see-this-coming]; L6 reply/accept/scene-talk/calm/6w2s [scene-talk.reply-accept.it-s-done-let-s-deal-with-it]; L7 reply/deflect/scene-talk/guarded/6w2s [scene-talk.reply-deflect.not-now-i-need-to-think]; L8 follow/answer/scene-talk/solemn/9w2s [scene-talk.follow-answer.give-me-an-hour-i-ll-know-who-it-was]; L9 reply/ask/scene-talk/braced/4w1s [scene-talk.reply-ask.who-changed-their-vote]; L10 reply/blame/scene-talk/braced/6w2s [scene-talk.reply-blame.somebody-leaked-it-find-out-who]; L11 reply/accept/scene-talk/calm/8w2s [scene-talk.reply-accept.all-right-tell-me-what-we-do-now]; L12 follow/answer/scene-talk/solemn/8w2s [scene-talk.follow-answer.i-m-still-finding-out-i-ll-have-names-tonight]; L13 close/warn/scene-talk/solemn/7w1s [scene-talk.close-warn.this-isn-t-going-away-on-its-own]</sub>

## Scene 36: section-bargain (vote-wanted, ends in bill) — proof scene

_Purpose section-bargain. Records: bill:office:US-DE:legislature-lower:2027-02-01:official:term:seat:US-DE:lower:001:0:2026-10-12:24, official:term:seat:US-DE:lower:041:0:2026-10-12, official:term:seat:US-DE:lower:030:0:2026-10-12, office:US-DE:legislature-lower._

> The council is in recess. Ralph Morrow pulls you aside about "Universal preschool".

**Profile warm** (outcome resolved)

**Ralph Morrow:** Got a second?

**Ralph Morrow:** Drop section 1, and you have my vote.

You could say:

1. Fine. Section 1 comes out. _(the page follows this one)_
2. Section 1 stays.
3. What if we change section 1 instead of dropping it?
4. Let me think about it.

**Ralph Morrow:** I knew I could count on you.

**If you push back:** (outcome open)

You could say:

1. Fine. Section 1 comes out.
2. Section 1 stays.
3. What if we change section 1 instead of dropping it? _(the page follows this one)_
4. Let me think about it.

**Ralph Morrow:** All right. We have a deal.

<sub>L1 narrate/narrate/scene-talk/braced/13w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/bargain/scene-talk/braced/8w1s [scene-talk.state-bargain.drop-section-section-and-you-have-my-vote]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.fine-section-section-comes-out]; L5 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 follow/thank/scene-talk/glad/7w1s [scene-talk.follow-thank.i-knew-i-could-count-on-you]</sub>

**Profile cold** (outcome refused)

**Ralph Morrow:** You got a minute?

**Ralph Morrow:** Drop section 1, and you have my vote.

You could say:

1. I'm with you on "Universal preschool".
2. I'm sorry, but I'm a no on "Universal preschool". _(the page follows this one)_
3. I'll cut half of section 1. Not all of it.
4. I'm still weighing it.

**Ralph Morrow:** People will remember this at the next election.

You could say:

1. All right. You win. I'm in.
2. I've made up my mind. It's no. _(the page follows this one)_
3. Are you threatening me?
4. What if we change section 1 instead of dropping it?

**Ralph Morrow:** I'd think hard about that.

**Ralph Morrow:** I hope you know what you're doing.

<sub>L1 narrate/narrate/scene-talk/braced/13w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/bargain/scene-talk/braced/8w1s [scene-talk.state-bargain.drop-section-section-and-you-have-my-vote]; L4 reply/agree/scene-talk/calm/6w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 follow/threaten/scene-talk/braced/8w1s [scene-talk.follow-threaten.people-will-remember-this-at-the-next-election]; L9 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L10 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L11 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L12 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L13 follow/threaten/scene-talk/guarded/5w1s [scene-talk.follow-threaten.i-d-think-hard-about-that]; L14 close/warn/scene-talk/braced/7w1s [scene-talk.close-warn.i-hope-you-know-what-you-re-doing]</sub>

**Profile stubborn** (outcome refused)

**Ralph Morrow:** Do you have a minute?

**Ralph Morrow:** I can live with "Universal preschool". I can't live with section 1.

You could say:

1. You have my vote.
2. Section 1 stays. _(the page follows this one)_
3. I'll cut half of section 1. Not all of it.
4. Give me until the vote.

**Ralph Morrow:** I need to know before the vote.

You could say:

1. All right. You win. I'm in.
2. I'm sorry, but I'm a no on "Universal preschool". _(the page follows this one)_
3. What if we change section 1 instead of dropping it?

**Ralph Morrow:** Take your time, but I need an answer.

**Ralph Morrow:** You'll need friends after this vote. I won't be one.

<sub>L1 narrate/narrate/scene-talk/braced/13w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/bargain/scene-talk/braced/12w2s [scene-talk.state-bargain.i-can-live-with-bill-i-can-t-live-with-section-section]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/guarded/5w1s [scene-talk.reply-stall.give-me-until-the-vote]; L8 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-to-know-before-the-vote]; L9 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L10 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L11 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L12 follow/press/scene-talk/calm/8w1s [scene-talk.follow-press.take-your-time-but-i-need-an-answer]; L13 close/warn/scene-talk/braced/10w2s [scene-talk.close-warn.you-ll-need-friends-after-this-vote-i-won-t-be-one]</sub>

**Profile anxious** (outcome open)

**Ralph Morrow:** You got a minute?

**Ralph Morrow:** Drop section 1, and you have my vote.

You could say:

1. You have my vote.
2. I'm sorry, but I'm a no on "Universal preschool".
3. I'll cut half of section 1. Not all of it.
4. I'm still weighing it. _(the page follows this one)_

**Ralph Morrow:** I'm asking as a friend.

You could say:

1. Okay. For you, I'll do it.
2. I can't vote for "Universal preschool".
3. What if we change section 1 instead of dropping it?
4. I need a few days. _(the page follows this one)_

**Ralph Morrow:** Please. Think about the people this helps.

**Ralph Morrow:** Think it over. I'll be back tomorrow.

<sub>L1 narrate/narrate/scene-talk/braced/13w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/bargain/scene-talk/braced/8w1s [scene-talk.state-bargain.drop-section-section-and-you-have-my-vote]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 follow/plea/scene-talk/tender/5w1s [scene-talk.follow-plea.i-m-asking-as-a-friend]; L9 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L10 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L11 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L12 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L13 follow/plea/scene-talk/tender/7w2s [scene-talk.follow-plea.please-think-about-the-people-this-helps]; L14 close/press/scene-talk/braced/7w2s [scene-talk.close-press.think-it-over-i-ll-be-back-tomorrow]</sub>

**Profile boastful** (outcome open)

**Ralph Morrow:** Sorry to bother you.

**Ralph Morrow:** Drop section 1, and you have my vote.

You could say:

1. You have my vote.
2. I'm sorry, but I'm a no on "Universal preschool".
3. What if we change section 1 instead of dropping it? _(the page follows this one)_
4. I haven't decided yet.

**Ralph Morrow:** I can give you that if you give me this.

You could say:

1. Fine. You have it.
2. I can't vote for "Universal preschool".
3. I'll cut half of section 1. Not all of it. _(the page follows this one)_
4. I'm still weighing it.

**Ralph Morrow:** Meet me halfway, and we have a deal.

**Ralph Morrow:** I'll call you before the vote.

<sub>L1 narrate/narrate/scene-talk/braced/13w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/bargain/scene-talk/braced/8w1s [scene-talk.state-bargain.drop-section-section-and-you-have-my-vote]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 follow/bargain/scene-talk/calm/10w1s [scene-talk.follow-bargain.i-can-give-you-that-if-you-give-me-this]; L9 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L10 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L11 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L12 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L13 follow/bargain/scene-talk/calm/8w1s [scene-talk.follow-bargain.meet-me-halfway-and-we-have-a-deal]; L14 close/press/scene-talk/calm/6w1s [scene-talk.close-press.i-ll-call-you-before-the-vote]</sub>

## Scene 37: section-bargain (vote-wanted, ends in bill) — proof scene

_Purpose section-bargain. Records: bill:office:US-DE:legislature-upper:2027-01-18:official:term:seat:US-DE:upper:020:0:2026-10-12:11, official:term:seat:US-DE:upper:016:0:2026-10-12, official:term:seat:US-DE:upper:013:0:2026-10-12, office:US-DE:legislature-upper._

> Jessica Murray has been holding out on "Public funds for private schooling". Now Jessica Murray wants to talk.

**Profile warm** (outcome resolved)

**Jessica Murray:** Sorry to bother you.

**Jessica Murray:** I'll vote yes on "Public funds for private schooling" if section 2 comes out.

You could say:

1. Fine. Section 2 comes out. _(the page follows this one)_
2. Section 2 stays.
3. What if we change section 2 instead of dropping it?
4. I need a few days.

**Jessica Murray:** You won't regret it.

**If you push back:** (outcome open)

You could say:

1. Fine. Section 2 comes out.
2. Section 2 stays.
3. What if we change section 2 instead of dropping it? _(the page follows this one)_
4. I need a few days.

**Jessica Murray:** Deal.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-holding-out-on-bill-now-name-wants-to-talk]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/bargain/scene-talk/braced/14w1s [scene-talk.state-bargain.i-ll-vote-yes-on-bill-if-section-section-comes-out]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.fine-section-section-comes-out]; L5 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

**Profile cold** (outcome refused)

**Jessica Murray:** Can I talk to you?

**Jessica Murray:** Drop section 2, and you have my vote.

You could say:

1. I'm with you on "Public funds for private schooling".
2. I can't vote for "Public funds for private schooling". _(the page follows this one)_
3. I'll cut half of section 2. Not all of it.
4. I need a few days.

**Jessica Murray:** I'd think hard about that.

You could say:

1. You've made your point. Count me in.
2. I'm sorry, but I'm a no on "Public funds for private schooling". _(the page follows this one)_
3. Don't try that with me.
4. What if we change section 2 instead of dropping it?

**Jessica Murray:** People will remember this at the next election.

**Jessica Murray:** You'll need friends after this vote. I won't be one.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-holding-out-on-bill-now-name-wants-to-talk]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/bargain/scene-talk/braced/8w1s [scene-talk.state-bargain.drop-section-section-and-you-have-my-vote]; L4 reply/agree/scene-talk/calm/9w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/threaten/scene-talk/guarded/5w1s [scene-talk.follow-threaten.i-d-think-hard-about-that]; L9 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L10 reply/refuse/scene-talk/guarded/12w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L11 reply/confront/scene-talk/braced/5w1s [scene-talk.reply-confront.don-t-try-that-with-me]; L12 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L13 follow/threaten/scene-talk/braced/8w1s [scene-talk.follow-threaten.people-will-remember-this-at-the-next-election]; L14 close/warn/scene-talk/braced/10w2s [scene-talk.close-warn.you-ll-need-friends-after-this-vote-i-won-t-be-one]</sub>

**Profile stubborn** (outcome refused)

**Jessica Murray:** Do you have a minute?

**Jessica Murray:** I can live with "Public funds for private schooling". I can't live with section 2.

You could say:

1. You have my vote.
2. I can't vote for "Public funds for private schooling". _(the page follows this one)_
3. What if we change section 2 instead of dropping it?
4. Give me until the vote.

**Jessica Murray:** That's not an answer.

You could say:

1. You've made your point. Count me in.
2. I'm sorry, but I'm a no on "Public funds for private schooling". _(the page follows this one)_
3. I'll cut half of section 2. Not all of it.

**Jessica Murray:** Take your time, but I need an answer.

**Jessica Murray:** I hope you know what you're doing.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-holding-out-on-bill-now-name-wants-to-talk]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/bargain/scene-talk/braced/15w2s [scene-talk.state-bargain.i-can-live-with-bill-i-can-t-live-with-section-section]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/guarded/5w1s [scene-talk.reply-stall.give-me-until-the-vote]; L8 follow/press/scene-talk/braced/4w1s [scene-talk.follow-press.that-s-not-an-answer]; L9 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L10 reply/refuse/scene-talk/guarded/12w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L11 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L12 follow/press/scene-talk/calm/8w1s [scene-talk.follow-press.take-your-time-but-i-need-an-answer]; L13 close/warn/scene-talk/braced/7w1s [scene-talk.close-warn.i-hope-you-know-what-you-re-doing]</sub>

**Profile anxious** (outcome open)

**Jessica Murray:** Sorry to bother you.

**Jessica Murray:** I'll vote yes on "Public funds for private schooling" if section 2 comes out.

You could say:

1. Count me in.
2. I'm sorry, but I'm a no on "Public funds for private schooling".
3. I'll cut half of section 2. Not all of it.
4. I need a few days. _(the page follows this one)_

**Jessica Murray:** I really need this one.

You could say:

1. Okay. For you, I'll do it.
2. I can't vote for "Public funds for private schooling".
3. What if we change section 2 instead of dropping it?
4. I haven't decided yet. _(the page follows this one)_

**Jessica Murray:** Please. Think about the people this helps.

**Jessica Murray:** Don't take too long.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-holding-out-on-bill-now-name-wants-to-talk]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/bargain/scene-talk/braced/14w1s [scene-talk.state-bargain.i-ll-vote-yes-on-bill-if-section-section-comes-out]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/guarded/12w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/plea/scene-talk/nervous/5w1s [scene-talk.follow-plea.i-really-need-this-one]; L9 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L10 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L11 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L12 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L13 follow/plea/scene-talk/tender/7w2s [scene-talk.follow-plea.please-think-about-the-people-this-helps]; L14 close/press/scene-talk/braced/4w1s [scene-talk.close-press.don-t-take-too-long]</sub>

**Profile boastful** (outcome resolved)

**Jessica Murray:** Got a second?

**Jessica Murray:** I'll vote yes on "Public funds for private schooling" if section 2 comes out.

You could say:

1. You have my vote. _(the page follows this one)_
2. I'm sorry, but I'm a no on "Public funds for private schooling".
3. What if we change section 2 instead of dropping it?
4. I haven't decided yet.

**Jessica Murray:** Thank you. Really.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-holding-out-on-bill-now-name-wants-to-talk]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/bargain/scene-talk/braced/14w1s [scene-talk.state-bargain.i-ll-vote-yes-on-bill-if-section-section-comes-out]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/refuse/scene-talk/guarded/12w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

## Scene 38: section-bargain (vote-wanted, ends in bill) — proof scene

_Purpose section-bargain. Records: bill:office:US-DE:legislature-lower:2027-02-02:official:term:seat:US-DE:lower:001:0:2026-10-12:25, official:term:seat:US-DE:lower:028:0:2026-10-12, official:term:seat:US-DE:lower:014:0:2026-10-12, office:US-DE:legislature-lower._

> The council is in recess. Stephanie Clay pulls you aside about "Limit groundwater withdrawal".

**Profile warm** (outcome resolved)

**Stephanie Clay:** Do you have a minute?

**Stephanie Clay:** I'll vote yes on "Limit groundwater withdrawal" if section 2 comes out.

You could say:

1. I'm with you on "Limit groundwater withdrawal". _(the page follows this one)_
2. I've made up my mind. It's no.
3. What if we change section 2 instead of dropping it?
4. I need a few days.

**Stephanie Clay:** Thank you. Really.

**If you push back:** (outcome open)

You could say:

1. I'm with you on "Limit groundwater withdrawal".
2. I've made up my mind. It's no.
3. What if we change section 2 instead of dropping it? _(the page follows this one)_
4. I need a few days.

**Stephanie Clay:** Deal.

<sub>L1 narrate/narrate/scene-talk/braced/14w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/bargain/scene-talk/braced/12w1s [scene-talk.state-bargain.i-ll-vote-yes-on-bill-if-section-section-comes-out]; L4 reply/agree/scene-talk/calm/7w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile cold** (outcome refused)

**Stephanie Clay:** Sorry to bother you.

**Stephanie Clay:** Drop section 2, and you have my vote.

You could say:

1. Fine. Section 2 comes out.
2. I can't vote for "Limit groundwater withdrawal". _(the page follows this one)_
3. I'll cut half of section 2. Not all of it.
4. I haven't decided yet.

**Stephanie Clay:** People will remember this at the next election.

You could say:

1. All right. You win. I'm in.
2. Section 2 stays. _(the page follows this one)_
3. Are you threatening me?
4. What if we change section 2 instead of dropping it?

**Stephanie Clay:** Then don't expect my vote on yours.

**Stephanie Clay:** Remember this conversation.

<sub>L1 narrate/narrate/scene-talk/braced/14w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/bargain/scene-talk/braced/8w1s [scene-talk.state-bargain.drop-section-section-and-you-have-my-vote]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.fine-section-section-comes-out]; L5 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 follow/threaten/scene-talk/braced/8w1s [scene-talk.follow-threaten.people-will-remember-this-at-the-next-election]; L9 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L10 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L11 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L12 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L13 follow/threaten/scene-talk/braced/7w1s [scene-talk.follow-threaten.then-don-t-expect-my-vote-on-yours]; L14 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.remember-this-conversation]</sub>

**Profile stubborn** (outcome refused)

**Stephanie Clay:** You got a minute?

**Stephanie Clay:** I can live with "Limit groundwater withdrawal". I can't live with section 2.

You could say:

1. I'm with you on "Limit groundwater withdrawal".
2. Section 2 stays. _(the page follows this one)_
3. What if we change section 2 instead of dropping it?
4. Give me until the vote.

**Stephanie Clay:** You can't sit this one out.

You could say:

1. All right. You win. I'm in.
2. I can't vote for "Limit groundwater withdrawal". _(the page follows this one)_
3. I'll cut half of section 2. Not all of it.

**Stephanie Clay:** You know what this means to me.

**Stephanie Clay:** You'll need friends after this vote. I won't be one.

<sub>L1 narrate/narrate/scene-talk/braced/14w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/bargain/scene-talk/braced/13w2s [scene-talk.state-bargain.i-can-live-with-bill-i-can-t-live-with-section-section]; L4 reply/agree/scene-talk/calm/7w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/guarded/5w1s [scene-talk.reply-stall.give-me-until-the-vote]; L8 follow/press/scene-talk/guarded/6w1s [scene-talk.follow-press.you-can-t-sit-this-one-out]; L9 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L10 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L11 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L12 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.you-know-what-this-means-to-me]; L13 close/warn/scene-talk/braced/10w2s [scene-talk.close-warn.you-ll-need-friends-after-this-vote-i-won-t-be-one]</sub>

**Profile anxious** (outcome open)

**Stephanie Clay:** I won't take long.

**Stephanie Clay:** I'll vote yes on "Limit groundwater withdrawal" if section 2 comes out.

You could say:

1. I'm with you on "Limit groundwater withdrawal".
2. I can't vote for "Limit groundwater withdrawal".
3. I'll cut half of section 2. Not all of it.
4. I need a few days. _(the page follows this one)_

**Stephanie Clay:** Please. Think about the people this helps.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I've made up my mind. It's no.
3. What if we change section 2 instead of dropping it?
4. Let me think about it. _(the page follows this one)_

**Stephanie Clay:** I really need this one.

**Stephanie Clay:** Remember this conversation.

<sub>L1 narrate/narrate/scene-talk/braced/14w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.i-won-t-take-long]; L3 state/bargain/scene-talk/braced/12w1s [scene-talk.state-bargain.i-ll-vote-yes-on-bill-if-section-section-comes-out]; L4 reply/agree/scene-talk/calm/7w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.i-need-a-few-days]; L8 follow/plea/scene-talk/tender/7w2s [scene-talk.follow-plea.please-think-about-the-people-this-helps]; L9 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L10 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L11 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L12 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L13 follow/plea/scene-talk/nervous/5w1s [scene-talk.follow-plea.i-really-need-this-one]; L14 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.remember-this-conversation]</sub>

**Profile boastful** (outcome open)

**Stephanie Clay:** Do you have a minute?

**Stephanie Clay:** I'll vote yes on "Limit groundwater withdrawal" if section 2 comes out.

You could say:

1. Fine. You have it.
2. I can't vote for "Limit groundwater withdrawal".
3. I'll cut half of section 2. Not all of it. _(the page follows this one)_
4. I'm still weighing it.

**Stephanie Clay:** Meet me halfway, and we have a deal.

You could say:

1. You have my vote.
2. I've made up my mind. It's no.
3. What if we change section 2 instead of dropping it? _(the page follows this one)_
4. I haven't decided yet.

**Stephanie Clay:** I can give you that if you give me this.

**Stephanie Clay:** Remember this conversation.

<sub>L1 narrate/narrate/scene-talk/braced/14w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/bargain/scene-talk/braced/12w1s [scene-talk.state-bargain.i-ll-vote-yes-on-bill-if-section-section-comes-out]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 follow/bargain/scene-talk/calm/8w1s [scene-talk.follow-bargain.meet-me-halfway-and-we-have-a-deal]; L9 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L10 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L11 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L12 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L13 follow/bargain/scene-talk/calm/10w1s [scene-talk.follow-bargain.i-can-give-you-that-if-you-give-me-this]; L14 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.remember-this-conversation]</sub>
