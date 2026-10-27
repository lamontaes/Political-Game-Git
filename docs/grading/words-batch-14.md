# Scenes with a purpose, batch-14

Place: Brookside, Delaware (the cached played world, seed fa3bbb297a4b3ea7c25595f71a3f37a7f7fdf08dfd6801c411add18d4f9f0a45). 39 scenes of 16 situation types, composed by `composeSceneTalk` (src/director/scene-talk.ts) once per personality profile (warm, cold, stubborn, anxious, boastful); a profile is shown only where its words differ. Every scene is a **proof scene**: the director fires none of these situations in the cached year (their producers are awaited), so each is staged from the real people and records listed under it. Words come only from data/english/parts/scene-talk.json.

Grade each line 1 to 5 on naturalness, prose, sentence structure, length (too short, right, too long), creativity and trait fit.

Situations: press-interview, campaign-stop, vote-asked, vote-confirmed, bill-carry, donor-ask, party-ask, office-hours, family-filing, family-win, family-loss, family-absence, rally-opponent, desk-bill, staff-news, section-bargain.

## Pieces the bank lacks (purpose / step / move)

- carry-bill/follow/ask after scene-talk.reply-ask.where-are-we-now (1 scene)
- carry-bill/reply/boast after confront (1 scene)
- carry-bill/reply/press after deflect (1 scene)
- carry-bill/reply/press after promise (3 scenes)
- family-absence/reply/accept after promise (3 scenes)
- family-absence/reply/press after promise (3 scenes)
- family-absence/reply/request after promise (3 scenes)
- family-absence/reply/thank after promise (3 scenes)
- rally-opponent/reply/lie after confront (3 scenes)
- section-bargain/reply/deflect after press (3 scenes)

## What was stood in

- a sitting member stands in the player's seat (proof scene)
- bill names come from the government engine's records as they are
- body: State Representative
- body: State Senator
- body: county commissioner
- donors are the three largest gift records in this world ($35, $34, $29); the contribution engine sets no size at which a donor asks a favor, so these are small gifts
- no loser on record has a household in this world, so a resident with one stands in for a loser; the race and its winner are another contest's
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
- the relative's source is left out: no knowledge record of the filing exists yet
- the result is the voting engine's; the director does not yet fire a result scene
- the volunteer is someone the candidate knows; no volunteer record exists yet
- where a lie is caught, the source is a person the asker knows; no knowledge record says yet that they know the truth

Dropped: 63 repeated casts, 5 repeated reply sets, 10 profiles whose words matched another, 0 compositions skipped for a missing fact.

## Scene 1: press-interview (routine, ends in political) — proof scene

_Purpose press-comment. Records: interview:outlet:radio:0:jurisdiction_59500182da2857ae:filing:contest:seat:gus2025:101811:board:0:2026-11-03:person_9e002a561a4b29bc:2026-10-19:0, outlet:radio:0:jurisdiction_59500182da2857ae, person:press:outlet:radio:0:jurisdiction_59500182da2857ae:reporter:0, person_9e002a561a4b29bc._

> Michael Howell, a reporter for Weom, catches you on your way out.

**Profile warm** (outcome resolved)

**Michael Howell:** Mind if I ask you a few things?

**Michael Howell:** Can you tell me how you'll vote on "Require photo id to vote"?

You could say:

1. I'm voting for it, and you can quote me. _(the page follows this one)_
2. I'm still reading it.
3. I'm not going to talk about that.
4. I've always supported it.

**Michael Howell:** What do you say to people who disagree?

You could say:

1. I'd tell them I listened, and I still disagree. _(the page follows this one)_
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**Michael Howell:** Can I quote you on that?

You could say:

1. You can quote me. _(the page follows this one)_
2. I'll have something to say after the vote.
3. No comment.

**Michael Howell:** Even if it costs you votes?

You could say:

1. Yes. Some things matter more than one election. _(the page follows this one)_
2. I'm still reading it.
3. I'm not going to talk about that.

**Michael Howell:** What do you say to people who disagree?

You could say:

1. Read the bill before you judge it. _(the page follows this one)_
2. I'm still reading it.
3. I'm not going to talk about that.

**Michael Howell:** What do you say to people who disagree?

**The whole exchange** (61 nodes; endings: resolved, open, open, refused, open, open, resolved; ★ is the branch this profile's traits lean toward):

- You ★: I'm voting for it, and you can quote me.
  - Michael Howell: What do you say to people who disagree?
  - You ★: I'd tell them I listened, and I still disagree.
    - Michael Howell: Can I quote you on that?
    - You ★: You can quote me.
      - Michael Howell: Even if it costs you votes?
      - You ★: Yes. Some things matter more than one election.
        - Michael Howell: What do you say to people who disagree?
        - You ★: Read the bill before you judge it.
          - Michael Howell: What do you say to people who disagree?
          - _Ends resolved_
        - You: I'm still reading it.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
      - You: I'm still reading it.
        - Michael Howell: You'll be in the story either way.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
      - You: I'm not going to talk about that.
        - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: No comment.
          - (the tree is cut here)
        - You: I'm still reading it.
          - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - Michael Howell: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - Michael Howell: Proud enough to run on it?
        - You: I'm voting no, and I'll tell you why.
          - (the tree is cut here)
        - You: I'm still reading it.
          - (the tree is cut here)
        - You: No comment.
          - (the tree is cut here)
      - You: I'm not going to talk about that.
        - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: No comment.
          - (the tree is cut here)
        - You: I'm still reading it.
          - (the tree is cut here)
      - You: I'm still reading it.
        - Michael Howell: Voters will want to know where you stand.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
    - You: No comment.
      - Michael Howell: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - Michael Howell: Proud enough to run on it?
        - You: I'm voting no, and I'll tell you why.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
      - You: I'm not going to talk about that.
        - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: I'm still reading it.
          - (the tree is cut here)
      - You: I'm still reading it.
        - Michael Howell: Voters will want to know where you stand.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
  - You: I'll have something to say after the vote.
    - Michael Howell: You'll be in the story either way.
    - You: Then put this in the story: I'm proud of my vote.
      - Michael Howell: Proud enough to run on it?
      - You: I'm voting no, and I'll tell you why.
        - Michael Howell: Even if it costs you votes?
        - You: Even then. It's the right call.
          - (the tree is cut here)
        - You: I'm still reading it.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
      - You: I'm still reading it.
        - Michael Howell: Voters will want to know where you stand.
        - _Ends open: Michael Howell: I'll be at the next meeting._
      - You: No comment.
        - Michael Howell: Voters will want to know where you stand.
        - You: I'm not going to talk about that.
          - (the tree is cut here)
        - You: I'm still reading it.
          - (the tree is cut here)
    - You: I'm not going to talk about that.
      - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
      - You: Then put this in the story: I'm proud of my vote.
        - Michael Howell: Proud enough to run on it?
        - You: I'm voting no, and I'll tell you why.
          - (the tree is cut here)
        - You: I'm still reading it.
          - (the tree is cut here)
        - You: No comment.
          - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: I'm still reading it.
      - Michael Howell: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
  - You: I'm not going to talk about that.
    - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
    - You: Then put this in the story: I'm proud of my vote.
      - Michael Howell: Proud enough to run on it?
      - You: I'm voting no, and I'll tell you why.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - Michael Howell: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: I'm still reading it.
      - Michael Howell: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
- You: I'm still reading it.
  - Michael Howell: You'll be in the story either way.
  - You: Then put this in the story: I'm proud of my vote.
    - Michael Howell: Proud enough to run on it?
    - You: I'm voting for it, and you can quote me.
      - Michael Howell: Even if it costs you votes?
      - You: Even then. It's the right call.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - Michael Howell: Voters will want to know where you stand.
      - _Ends open: Michael Howell: I'll be at the next meeting._
    - You: I'm not going to talk about that.
      - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
      - You: No comment.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
  - You: I'm not going to talk about that.
    - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
    - You: Then put this in the story: I'm proud of my vote.
      - Michael Howell: Proud enough to run on it?
      - You: I'm voting for it, and you can quote me.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - Michael Howell: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - Michael Howell: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
  - You: I'll have something to say after the vote.
    - Michael Howell: Voters will want to know where you stand.
    - You: Then put this in the story: I'm proud of my vote.
      - Michael Howell: Proud enough to run on it?
      - You: I'm voting for it, and you can quote me.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
- You: I'm not going to talk about that.
  - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
  - You: Then put this in the story: I'm proud of my vote.
    - Michael Howell: Proud enough to run on it?
    - You: I'm voting for it, and you can quote me.
      - Michael Howell: Even if it costs you votes?
      - You: Yes. Some things matter more than one election.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - Michael Howell: You'll be in the story either way.
      - You: No comment.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: No comment.
      - Michael Howell: Voters will want to know where you stand.
      - _Ends refused: Michael Howell: I'll be at the next meeting._
  - You: No comment.
    - Michael Howell: Voters will want to know where you stand.
    - You: Then put this in the story: I'm proud of my vote.
      - Michael Howell: Proud enough to run on it?
      - You: I'm voting no, and I'll tell you why.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: I'm still reading it.
      - Michael Howell: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
  - You: I'm still reading it.
    - Michael Howell: You'll be in the story either way.
    - You: Then put this in the story: I'm proud of my vote.
      - Michael Howell: Proud enough to run on it?
      - You: I'm voting no, and I'll tell you why.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - Michael Howell: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - Michael Howell: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
- You: I've always supported it.
  - _if Michael Howell knows:_
    - Michael Howell: Liam McCarthy says you told them you were against it.
    - You: You're right. I shouldn't have said that.
      - Michael Howell: Thank you for telling me straight.
      - _Ends open_
    - You: People say a lot of things.
      - Michael Howell: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - Michael Howell: Proud enough to run on it?
        - You: I'm voting for it, and you can quote me.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
      - You: I'm not going to talk about that.
        - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: No comment.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
      - You: I'm still reading it.
        - Michael Howell: Voters will want to know where you stand.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
    - You: Then Liam McCarthy has it wrong.
      - _Ends open: Michael Howell: I'll be at the next meeting._
  - _if not:_
    - Michael Howell: Then I'll put that in the story.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/guarded/12w1s [scene-talk.narrate-narrate.name-a-reporter-for-outlet-catches-you-on-your-way-out]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/13w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/proud/9w1s [scene-talk.reply-answer.i-m-voting-for-it-and-you-can-quote-me]; L5 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L8 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L9 reply/answer/scene-talk/calm/9w1s [scene-talk.reply-answer.i-d-tell-them-i-listened-and-i-still-disagree]; L10 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L11 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L12 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L13 reply/answer/scene-talk/calm/4w1s [scene-talk.reply-answer.you-can-quote-me]; L14 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L15 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L16 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L17 reply/answer/scene-talk/proud/8w2s [scene-talk.reply-answer.yes-some-things-matter-more-than-one-election]; L18 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L19 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L20 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L21 reply/answer/scene-talk/braced/7w1s [scene-talk.reply-answer.read-the-bill-before-you-judge-it]; L22 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L23 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L24 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]</sub>

**Profile cold** (outcome resolved)

**Michael Howell:** Do you have a moment for a couple of questions?

**Michael Howell:** Can you tell me how you'll vote on "Require photo id to vote"?

You could say:

1. I'm voting no, and I'll tell you why. _(the page follows this one)_
2. I'm still reading it.
3. No comment.
4. I've always supported it.

**Michael Howell:** What do you say to people who disagree?

You could say:

1. I'd tell them I listened, and I still disagree. _(the page follows this one)_
2. I'll have something to say after the vote.
3. No comment.

**Michael Howell:** Can I quote you on that?

You could say:

1. You can quote me. _(the page follows this one)_
2. I'm still reading it.
3. No comment.

**Michael Howell:** Even if it costs you votes?

You could say:

1. Yes. Some things matter more than one election. _(the page follows this one)_
2. I'll have something to say after the vote.
3. No comment.

**Michael Howell:** Can I quote you on that?

You could say:

1. Go ahead. I meant every word. _(the page follows this one)_
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**Michael Howell:** Even if it costs you votes?

<sub>L1 narrate/narrate/scene-talk/guarded/12w1s [scene-talk.narrate-narrate.name-a-reporter-for-outlet-catches-you-on-your-way-out]; L2 open/greet/scene-talk/calm/10w1s [scene-talk.open-greet.do-you-have-a-moment-for-a-couple-of-questions]; L3 state/ask/scene-talk/curious/13w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L5 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L8 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L9 reply/answer/scene-talk/calm/9w1s [scene-talk.reply-answer.i-d-tell-them-i-listened-and-i-still-disagree]; L10 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L11 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L12 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L13 reply/answer/scene-talk/calm/4w1s [scene-talk.reply-answer.you-can-quote-me]; L14 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L15 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L16 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L17 reply/answer/scene-talk/proud/8w2s [scene-talk.reply-answer.yes-some-things-matter-more-than-one-election]; L18 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L19 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L20 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L21 reply/answer/scene-talk/proud/6w2s [scene-talk.reply-answer.go-ahead-i-meant-every-word]; L22 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L23 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L24 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]</sub>

**Profile stubborn** (outcome resolved)

**Michael Howell:** Do you have a moment for a couple of questions?

**Michael Howell:** Can you tell me how you'll vote on "Require photo id to vote"?

You could say:

1. I'm voting no, and I'll tell you why. _(the page follows this one)_
2. I'll have something to say after the vote.
3. I'm not going to talk about that.
4. I've always supported it.

**Michael Howell:** What do you say to people who disagree?

You could say:

1. I'd tell them I listened, and I still disagree. _(the page follows this one)_
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**Michael Howell:** Even if it costs you votes?

You could say:

1. Yes. Some things matter more than one election. _(the page follows this one)_
2. I'm still reading it.
3. No comment.

**Michael Howell:** Can I quote you on that?

You could say:

1. You can quote me. _(the page follows this one)_
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**Michael Howell:** What do you say to people who disagree?

You could say:

1. Read the bill before you judge it. _(the page follows this one)_
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**Michael Howell:** Even if it costs you votes?

<sub>L1 narrate/narrate/scene-talk/guarded/12w1s [scene-talk.narrate-narrate.name-a-reporter-for-outlet-catches-you-on-your-way-out]; L2 open/greet/scene-talk/calm/10w1s [scene-talk.open-greet.do-you-have-a-moment-for-a-couple-of-questions]; L3 state/ask/scene-talk/curious/13w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L8 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L9 reply/answer/scene-talk/calm/9w1s [scene-talk.reply-answer.i-d-tell-them-i-listened-and-i-still-disagree]; L10 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L11 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L12 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L13 reply/answer/scene-talk/proud/8w2s [scene-talk.reply-answer.yes-some-things-matter-more-than-one-election]; L14 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L15 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L16 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L17 reply/answer/scene-talk/calm/4w1s [scene-talk.reply-answer.you-can-quote-me]; L18 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L19 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L20 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L21 reply/answer/scene-talk/braced/7w1s [scene-talk.reply-answer.read-the-bill-before-you-judge-it]; L22 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L23 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L24 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]</sub>

**Profile anxious** (outcome resolved)

**Michael Howell:** Mind if I ask you a few things?

**Michael Howell:** Can you tell me how you'll vote on "Require photo id to vote"?

You could say:

1. I'm voting for it, and you can quote me. _(the page follows this one)_
2. I'll have something to say after the vote.
3. No comment.
4. I've always supported it.

**Michael Howell:** Can I quote you on that?

You could say:

1. Go ahead. I meant every word. _(the page follows this one)_
2. I'll have something to say after the vote.
3. No comment.

**Michael Howell:** What do you say to people who disagree?

You could say:

1. I'd tell them I listened, and I still disagree. _(the page follows this one)_
2. I'm still reading it.
3. No comment.

**Michael Howell:** Even if it costs you votes?

You could say:

1. Yes. Some things matter more than one election. _(the page follows this one)_
2. I'm still reading it.
3. I'm not going to talk about that.

**Michael Howell:** What do you say to people who disagree?

You could say:

1. Read the bill before you judge it. _(the page follows this one)_
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**Michael Howell:** Even if it costs you votes?

<sub>L1 narrate/narrate/scene-talk/guarded/12w1s [scene-talk.narrate-narrate.name-a-reporter-for-outlet-catches-you-on-your-way-out]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/13w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/proud/9w1s [scene-talk.reply-answer.i-m-voting-for-it-and-you-can-quote-me]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L8 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L9 reply/answer/scene-talk/proud/6w2s [scene-talk.reply-answer.go-ahead-i-meant-every-word]; L10 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L11 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L12 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L13 reply/answer/scene-talk/calm/9w1s [scene-talk.reply-answer.i-d-tell-them-i-listened-and-i-still-disagree]; L14 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L15 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L16 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L17 reply/answer/scene-talk/proud/8w2s [scene-talk.reply-answer.yes-some-things-matter-more-than-one-election]; L18 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L19 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L20 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L21 reply/answer/scene-talk/braced/7w1s [scene-talk.reply-answer.read-the-bill-before-you-judge-it]; L22 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L23 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L24 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]</sub>

**Profile boastful** (outcome resolved)

**Michael Howell:** Do you have a moment for a couple of questions?

**Michael Howell:** Can you tell me how you'll vote on "Require photo id to vote"?

You could say:

1. I'm voting for it, and you can quote me. _(the page follows this one)_
2. I'll have something to say after the vote.
3. No comment.
4. I've always supported it.

**Michael Howell:** Can I quote you on that?

You could say:

1. You can quote me. _(the page follows this one)_
2. I'll have something to say after the vote.
3. No comment.

**Michael Howell:** What do you say to people who disagree?

You could say:

1. I'd tell them I listened, and I still disagree. _(the page follows this one)_
2. I'm still reading it.
3. No comment.

**Michael Howell:** Even if it costs you votes?

You could say:

1. Yes. Some things matter more than one election. _(the page follows this one)_
2. I'm still reading it.
3. I'm not going to talk about that.

**Michael Howell:** What do you say to people who disagree?

You could say:

1. Read the bill before you judge it. _(the page follows this one)_
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**Michael Howell:** Even if it costs you votes?

<sub>L1 narrate/narrate/scene-talk/guarded/12w1s [scene-talk.narrate-narrate.name-a-reporter-for-outlet-catches-you-on-your-way-out]; L2 open/greet/scene-talk/calm/10w1s [scene-talk.open-greet.do-you-have-a-moment-for-a-couple-of-questions]; L3 state/ask/scene-talk/curious/13w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/proud/9w1s [scene-talk.reply-answer.i-m-voting-for-it-and-you-can-quote-me]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L8 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L9 reply/answer/scene-talk/calm/4w1s [scene-talk.reply-answer.you-can-quote-me]; L10 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L11 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L12 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L13 reply/answer/scene-talk/calm/9w1s [scene-talk.reply-answer.i-d-tell-them-i-listened-and-i-still-disagree]; L14 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L15 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L16 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L17 reply/answer/scene-talk/proud/8w2s [scene-talk.reply-answer.yes-some-things-matter-more-than-one-election]; L18 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L19 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L20 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L21 reply/answer/scene-talk/braced/7w1s [scene-talk.reply-answer.read-the-bill-before-you-judge-it]; L22 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L23 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L24 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]</sub>

## Scene 2: press-interview (routine, ends in political) — proof scene

_Purpose press-comment. Records: interview:outlet:cable:1:national:filing:contest:seat:gus2025:101811:sheriff:0:2026-11-03:person_f9be8ef45e5d143f:2026-11-02:0, outlet:cable:1:national, person:press:outlet:cable:1:national:reporter:0, person_f9be8ef45e5d143f._

> You arrive for the interview Mark Wood asked for. Mark Wood covers the council for Beacon News Network.

**Profile warm** (outcome resolved)

**Mark Wood:** Do you have a moment for a couple of questions?

**Mark Wood:** Where do you stand on "Clean electricity standard"?

You could say:

1. I'm voting no, and I'll tell you why.
2. I'll have something to say after the vote.
3. I'm not going to talk about that. _(the page follows this one)_
4. I've always supported it.

**Mark Wood:** Your vote is public. Your reasons don't have to be a secret.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. No comment. _(the page follows this one)_
3. I'm still reading it.

**Mark Wood:** You'll be in the story either way.

You could say:

1. Then put this in the story: I'm proud of my vote. _(the page follows this one)_
2. I'm still reading it.

**Mark Wood:** Proud enough to run on it?

You could say:

1. I'm voting no, and I'll tell you why. _(the page follows this one)_
2. I'll have something to say after the vote.

**Mark Wood:** Even if it costs you votes?

You could say:

1. Yes. Some things matter more than one election. _(the page follows this one)_
2. I'm still reading it.

**Mark Wood:** What do you say to people who disagree?

**The whole exchange** (62 nodes; endings: open, open, refused, resolved, open, open, resolved; ★ is the branch this profile's traits lean toward):

- You: I'm voting no, and I'll tell you why.
  - Mark Wood: What do you say to people who disagree?
  - You: Read the bill before you judge it.
    - Mark Wood: Can I quote you on that?
    - You: Go ahead. I meant every word.
      - Mark Wood: Even if it costs you votes?
      - You: Yes. Some things matter more than one election.
        - Mark Wood: Even if it costs you votes?
        - You: Even then. It's the right call.
          - (the tree is cut here)
        - You: I'm still reading it.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
      - You: I'm still reading it.
        - Mark Wood: You'll be in the story either way.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
      - You: I'm not going to talk about that.
        - Mark Wood: Your vote is public. Your reasons don't have to be a secret.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: No comment.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - Mark Wood: Proud enough to run on it?
        - You: I'm voting for it, and you can quote me.
          - (the tree is cut here)
        - You: I'm still reading it.
          - (the tree is cut here)
        - You: No comment.
          - (the tree is cut here)
      - You: I'm not going to talk about that.
        - Mark Wood: Your vote is public. Your reasons don't have to be a secret.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: No comment.
          - (the tree is cut here)
        - You: I'm still reading it.
          - (the tree is cut here)
      - You: I'm still reading it.
        - Mark Wood: You'll be in the story either way.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: No comment.
          - (the tree is cut here)
    - You: I'm not going to talk about that.
      - Mark Wood: Your vote is public. Your reasons don't have to be a secret.
      - You: Then put this in the story: I'm proud of my vote.
        - Mark Wood: Proud enough to run on it?
        - You: I'm voting for it, and you can quote me.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
        - You: No comment.
          - (the tree is cut here)
      - You: No comment.
        - Mark Wood: Voters will want to know where you stand.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - Mark Wood: Voters will want to know where you stand.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: No comment.
          - (the tree is cut here)
        - You: I'm still reading it.
          - (the tree is cut here)
  - You: I'm still reading it.
    - Mark Wood: You'll be in the story either way.
    - You: Then put this in the story: I'm proud of my vote.
      - Mark Wood: Proud enough to run on it?
      - You: I'm voting for it, and you can quote me.
        - Mark Wood: Even if it costs you votes?
        - You: Yes. Some things matter more than one election.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - Mark Wood: Voters will want to know where you stand.
        - _Ends open: Mark Wood: I'll be at the next meeting._
      - You: I'm not going to talk about that.
        - Mark Wood: Your vote is public. Your reasons don't have to be a secret.
        - You: No comment.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
    - You: No comment.
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - Mark Wood: Proud enough to run on it?
        - You: I'm voting for it, and you can quote me.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
  - You: I'm not going to talk about that.
    - Mark Wood: Your vote is public. Your reasons don't have to be a secret.
    - You: Then put this in the story: I'm proud of my vote.
      - Mark Wood: Proud enough to run on it?
      - You: I'm voting for it, and you can quote me.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: I'm still reading it.
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
- You: I'll have something to say after the vote.
  - Mark Wood: You'll be in the story either way.
  - You: Then put this in the story: I'm proud of my vote.
    - Mark Wood: Proud enough to run on it?
    - You: I'm voting no, and I'll tell you why.
      - Mark Wood: What do you say to people who disagree?
      - You: Read the bill before you judge it.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'm still reading it.
      - Mark Wood: Voters will want to know where you stand.
      - _Ends open: Mark Wood: I'll be at the next meeting._
    - You: I'm not going to talk about that.
      - Mark Wood: Your vote is public. Your reasons don't have to be a secret.
      - You: No comment.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
  - You: I'm not going to talk about that.
    - Mark Wood: Your vote is public. Your reasons don't have to be a secret.
    - You: Then put this in the story: I'm proud of my vote.
      - Mark Wood: Proud enough to run on it?
      - You: I'm voting for it, and you can quote me.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: I'm still reading it.
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
  - You: I'm still reading it.
    - Mark Wood: Voters will want to know where you stand.
    - You: Then put this in the story: I'm proud of my vote.
      - Mark Wood: Proud enough to run on it?
      - You: I'm voting for it, and you can quote me.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - Mark Wood: Your vote is public. Your reasons don't have to be a secret.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
- You ★: I'm not going to talk about that.
  - Mark Wood: Your vote is public. Your reasons don't have to be a secret.
  - You: Then put this in the story: I'm proud of my vote.
    - Mark Wood: Proud enough to run on it?
    - You: I'm voting no, and I'll tell you why.
      - Mark Wood: What do you say to people who disagree?
      - You: Read the bill before you judge it.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: I'm still reading it.
      - Mark Wood: You'll be in the story either way.
      - You: No comment.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: No comment.
      - Mark Wood: You'll be in the story either way.
      - _Ends refused: Mark Wood: I'll be at the next meeting._
  - You ★: No comment.
    - Mark Wood: You'll be in the story either way.
    - You ★: Then put this in the story: I'm proud of my vote.
      - Mark Wood: Proud enough to run on it?
      - You ★: I'm voting no, and I'll tell you why.
        - Mark Wood: Even if it costs you votes?
        - You ★: Yes. Some things matter more than one election.
          - Mark Wood: What do you say to people who disagree?
          - _Ends resolved_
        - You: I'm still reading it.
          - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: I'm still reading it.
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
  - You: I'm still reading it.
    - Mark Wood: Voters will want to know where you stand.
    - You: Then put this in the story: I'm proud of my vote.
      - Mark Wood: Proud enough to run on it?
      - You: I'm voting no, and I'll tell you why.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - Mark Wood: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - Mark Wood: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
- You: I've always supported it.
  - _if Mark Wood knows:_
    - Mark Wood: Liam McCarthy says you told them you were against it.
    - You: You're right. I shouldn't have said that.
      - Mark Wood: Thank you for telling me straight.
      - _Ends open_
    - You: People say a lot of things.
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - Mark Wood: Proud enough to run on it?
        - You: I'm voting no, and I'll tell you why.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
        - You: No comment.
          - (the tree is cut here)
      - You: I'm not going to talk about that.
        - Mark Wood: Your vote is public. Your reasons don't have to be a secret.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: No comment.
          - (the tree is cut here)
        - You: I'm still reading it.
          - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - Mark Wood: You'll be in the story either way.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
        - You: I'm still reading it.
          - (the tree is cut here)
    - You: Then Liam McCarthy has it wrong.
      - _Ends open: Mark Wood: The story runs either way._
  - _if not:_
    - Mark Wood: Then I'll put that in the story.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.you-arrive-for-the-interview-name-asked-for-name-covers-the-council-fo]; L2 open/greet/scene-talk/calm/10w1s [scene-talk.open-greet.do-you-have-a-moment-for-a-couple-of-questions]; L3 state/ask/scene-talk/curious/8w1s [scene-talk.state-ask.where-do-you-stand-on-bill]; L4 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L145 follow/press/scene-talk/braced/12w2s [scene-talk.follow-press.your-vote-is-public-your-reasons-don-t-have-to-be-a-secret]; L146 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L147 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L148 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L162 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.you-ll-be-in-the-story-either-way]; L163 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L164 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L165 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.proud-enough-to-run-on-it]; L166 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L167 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L168 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L169 reply/answer/scene-talk/proud/8w2s [scene-talk.reply-answer.yes-some-things-matter-more-than-one-election]; L170 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L171 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]</sub>

**Profile cold** (outcome resolved)

**Mark Wood:** Do you have a moment for a couple of questions?

**Mark Wood:** Where do you stand on "Clean electricity standard"?

You could say:

1. I'm voting no, and I'll tell you why.
2. I'll have something to say after the vote.
3. No comment. _(the page follows this one)_
4. I've always supported it.

**Mark Wood:** You'll be in the story either way.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. I'm not going to talk about that. _(the page follows this one)_
3. I'm still reading it.

**Mark Wood:** Your vote is public. Your reasons don't have to be a secret.

You could say:

1. Then put this in the story: I'm proud of my vote. _(the page follows this one)_
2. I'll have something to say after the vote.

**Mark Wood:** Proud enough to run on it?

You could say:

1. I'm voting no, and I'll tell you why. _(the page follows this one)_
2. I'm still reading it.

**Mark Wood:** What do you say to people who disagree?

You could say:

1. Read the bill before you judge it. _(the page follows this one)_
2. I'm still reading it.

**Mark Wood:** Even if it costs you votes?

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.you-arrive-for-the-interview-name-asked-for-name-covers-the-council-fo]; L2 open/greet/scene-talk/calm/10w1s [scene-talk.open-greet.do-you-have-a-moment-for-a-couple-of-questions]; L3 state/ask/scene-talk/curious/8w1s [scene-talk.state-ask.where-do-you-stand-on-bill]; L4 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L145 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.you-ll-be-in-the-story-either-way]; L146 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L147 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L148 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L162 follow/press/scene-talk/braced/12w2s [scene-talk.follow-press.your-vote-is-public-your-reasons-don-t-have-to-be-a-secret]; L163 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L164 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L165 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.proud-enough-to-run-on-it]; L166 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L167 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L168 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L169 reply/answer/scene-talk/braced/7w1s [scene-talk.reply-answer.read-the-bill-before-you-judge-it]; L170 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L171 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]</sub>

**Profile stubborn** (outcome resolved)

**Mark Wood:** Do you have a moment for a couple of questions?

**Mark Wood:** Where do you stand on "Clean electricity standard"?

You could say:

1. I'm voting no, and I'll tell you why.
2. I'll have something to say after the vote.
3. I'm not going to talk about that. _(the page follows this one)_
4. I've always supported it.

**Mark Wood:** Your vote is public. Your reasons don't have to be a secret.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. No comment. _(the page follows this one)_
3. I'm still reading it.

**Mark Wood:** Voters will want to know where you stand.

You could say:

1. Then put this in the story: I'm proud of my vote. _(the page follows this one)_
2. I'll have something to say after the vote.

**Mark Wood:** Proud enough to run on it?

You could say:

1. I'm voting no, and I'll tell you why. _(the page follows this one)_
2. I'll have something to say after the vote.

**Mark Wood:** Can I quote you on that?

You could say:

1. Go ahead. I meant every word. _(the page follows this one)_
2. I'll have something to say after the vote.

**Mark Wood:** What do you say to people who disagree?

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.you-arrive-for-the-interview-name-asked-for-name-covers-the-council-fo]; L2 open/greet/scene-talk/calm/10w1s [scene-talk.open-greet.do-you-have-a-moment-for-a-couple-of-questions]; L3 state/ask/scene-talk/curious/8w1s [scene-talk.state-ask.where-do-you-stand-on-bill]; L4 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L145 follow/press/scene-talk/braced/12w2s [scene-talk.follow-press.your-vote-is-public-your-reasons-don-t-have-to-be-a-secret]; L146 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L147 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L148 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L162 follow/press/scene-talk/braced/8w1s [scene-talk.follow-press.voters-will-want-to-know-where-you-stand]; L163 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L164 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L165 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.proud-enough-to-run-on-it]; L166 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L167 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L168 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L169 reply/answer/scene-talk/proud/6w2s [scene-talk.reply-answer.go-ahead-i-meant-every-word]; L170 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L171 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]</sub>

**Profile anxious** (outcome resolved)

**Mark Wood:** Do you have a moment for a couple of questions?

**Mark Wood:** Where do you stand on "Clean electricity standard"?

You could say:

1. I'm voting no, and I'll tell you why.
2. I'm still reading it.
3. No comment. _(the page follows this one)_
4. I've always supported it.

**Mark Wood:** Voters will want to know where you stand.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. I'm not going to talk about that. _(the page follows this one)_
3. I'll have something to say after the vote.

**Mark Wood:** Your vote is public. Your reasons don't have to be a secret.

You could say:

1. Then put this in the story: I'm proud of my vote. _(the page follows this one)_
2. I'm still reading it.

**Mark Wood:** Proud enough to run on it?

You could say:

1. I'm voting no, and I'll tell you why. _(the page follows this one)_
2. I'll have something to say after the vote.

**Mark Wood:** Even if it costs you votes?

You could say:

1. Yes. Some things matter more than one election. _(the page follows this one)_
2. I'll have something to say after the vote.

**Mark Wood:** What do you say to people who disagree?

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.you-arrive-for-the-interview-name-asked-for-name-covers-the-council-fo]; L2 open/greet/scene-talk/calm/10w1s [scene-talk.open-greet.do-you-have-a-moment-for-a-couple-of-questions]; L3 state/ask/scene-talk/curious/8w1s [scene-talk.state-ask.where-do-you-stand-on-bill]; L4 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L5 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L145 follow/press/scene-talk/braced/8w1s [scene-talk.follow-press.voters-will-want-to-know-where-you-stand]; L146 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L147 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L148 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L162 follow/press/scene-talk/braced/12w2s [scene-talk.follow-press.your-vote-is-public-your-reasons-don-t-have-to-be-a-secret]; L163 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L164 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L165 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.proud-enough-to-run-on-it]; L166 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L167 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L168 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L169 reply/answer/scene-talk/proud/8w2s [scene-talk.reply-answer.yes-some-things-matter-more-than-one-election]; L170 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L171 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]</sub>

## Scene 3: press-interview (routine, ends in political) — proof scene

_Purpose press-comment. Records: interview:outlet:cable:0:national:filing:contest:seat:gus2025:101811:treasurer:0:2026-11-03:person_6863e973f50172f8:2026-10-26:0, outlet:cable:0:national, person:press:outlet:cable:0:national:reporter:0, person_6863e973f50172f8._

> There's a knock at your door. It's William Neal, a reporter for Pinnacle News Network.

**Profile warm** (outcome resolved)

**William Neal:** Mind if I ask you a few things?

**William Neal:** Can you tell me how you'll vote on "Stand your ground"?

You could say:

1. I'm voting for it, and you can quote me. _(the page follows this one)_
2. I'll have something to say after the vote.
3. No comment.
4. I've always supported it.

**William Neal:** Can I quote you on that?

You could say:

1. You can quote me. _(the page follows this one)_
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**William Neal:** Even if it costs you votes?

You could say:

1. Yes. Some things matter more than one election. _(the page follows this one)_
2. I'm still reading it.
3. No comment.

**William Neal:** What do you say to people who disagree?

You could say:

1. I'd tell them I listened, and I still disagree. _(the page follows this one)_
2. I'm still reading it.
3. I'm not going to talk about that.

**William Neal:** What do you say to people who disagree?

You could say:

1. Read the bill before you judge it. _(the page follows this one)_
2. I'll have something to say after the vote.
3. No comment.

**William Neal:** Even if it costs you votes?

**The whole exchange** (61 nodes; endings: resolved, open, open, refused, open, open, resolved; ★ is the branch this profile's traits lean toward):

- You ★: I'm voting for it, and you can quote me.
  - William Neal: Can I quote you on that?
  - You ★: You can quote me.
    - William Neal: Even if it costs you votes?
    - You ★: Yes. Some things matter more than one election.
      - William Neal: What do you say to people who disagree?
      - You ★: I'd tell them I listened, and I still disagree.
        - William Neal: What do you say to people who disagree?
        - You ★: Read the bill before you judge it.
          - William Neal: Even if it costs you votes?
          - _Ends resolved_
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
        - You: No comment.
          - (the tree is cut here)
      - You: I'm still reading it.
        - William Neal: Voters will want to know where you stand.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
      - You: I'm not going to talk about that.
        - William Neal: Your vote is public. Your reasons don't have to be a secret.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: No comment.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
    - You: I'm still reading it.
      - William Neal: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - William Neal: Proud enough to run on it?
        - You: I'm voting no, and I'll tell you why.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
      - You: I'm not going to talk about that.
        - William Neal: Your vote is public. Your reasons don't have to be a secret.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: No comment.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - William Neal: You'll be in the story either way.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
    - You: No comment.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - William Neal: Proud enough to run on it?
        - You: I'm voting no, and I'll tell you why.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
      - You: I'm not going to talk about that.
        - William Neal: Your vote is public. Your reasons don't have to be a secret.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: I'm still reading it.
          - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - William Neal: Voters will want to know where you stand.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
        - You: I'm still reading it.
          - (the tree is cut here)
  - You: I'll have something to say after the vote.
    - William Neal: Voters will want to know where you stand.
    - You: Then put this in the story: I'm proud of my vote.
      - William Neal: Proud enough to run on it?
      - You: I'm voting no, and I'll tell you why.
        - William Neal: What do you say to people who disagree?
        - You: Read the bill before you judge it.
          - (the tree is cut here)
        - You: I'm still reading it.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
      - You: I'm still reading it.
        - William Neal: You'll be in the story either way.
        - _Ends open: William Neal: I'll be at the next meeting._
      - You: I'm not going to talk about that.
        - William Neal: Your vote is public. Your reasons don't have to be a secret.
        - You: No comment.
          - (the tree is cut here)
        - You: I'm still reading it.
          - (the tree is cut here)
    - You: I'm not going to talk about that.
      - William Neal: Your vote is public. Your reasons don't have to be a secret.
      - You: Then put this in the story: I'm proud of my vote.
        - William Neal: Proud enough to run on it?
        - You: I'm voting no, and I'll tell you why.
          - (the tree is cut here)
        - You: I'm still reading it.
          - (the tree is cut here)
        - You: No comment.
          - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: I'm still reading it.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
  - You: I'm not going to talk about that.
    - William Neal: Your vote is public. Your reasons don't have to be a secret.
    - You: Then put this in the story: I'm proud of my vote.
      - William Neal: Proud enough to run on it?
      - You: I'm voting no, and I'll tell you why.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - William Neal: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
- You: I'll have something to say after the vote.
  - William Neal: Voters will want to know where you stand.
  - You: Then put this in the story: I'm proud of my vote.
    - William Neal: Proud enough to run on it?
    - You: I'm voting no, and I'll tell you why.
      - William Neal: Even if it costs you votes?
      - You: Yes. Some things matter more than one election.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'm still reading it.
      - William Neal: You'll be in the story either way.
      - _Ends open: William Neal: I'll be at the next meeting._
    - You: I'm not going to talk about that.
      - William Neal: Your vote is public. Your reasons don't have to be a secret.
      - You: No comment.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
  - You: I'm not going to talk about that.
    - William Neal: Your vote is public. Your reasons don't have to be a secret.
    - You: Then put this in the story: I'm proud of my vote.
      - William Neal: Proud enough to run on it?
      - You: I'm voting for it, and you can quote me.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: I'm still reading it.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
  - You: I'm still reading it.
    - William Neal: You'll be in the story either way.
    - You: Then put this in the story: I'm proud of my vote.
      - William Neal: Proud enough to run on it?
      - You: I'm voting for it, and you can quote me.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - William Neal: Your vote is public. Your reasons don't have to be a secret.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
- You: No comment.
  - William Neal: Voters will want to know where you stand.
  - You: Then put this in the story: I'm proud of my vote.
    - William Neal: Proud enough to run on it?
    - You: I'm voting for it, and you can quote me.
      - William Neal: Even if it costs you votes?
      - You: Even then. It's the right call.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - William Neal: You'll be in the story either way.
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - William Neal: Your vote is public. Your reasons don't have to be a secret.
      - _Ends refused: William Neal: I'll be at the next meeting._
  - You: I'm not going to talk about that.
    - William Neal: Your vote is public. Your reasons don't have to be a secret.
    - You: Then put this in the story: I'm proud of my vote.
      - William Neal: Proud enough to run on it?
      - You: I'm voting for it, and you can quote me.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
  - You: I'm still reading it.
    - William Neal: You'll be in the story either way.
    - You: Then put this in the story: I'm proud of my vote.
      - William Neal: Proud enough to run on it?
      - You: I'm voting for it, and you can quote me.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - William Neal: Your vote is public. Your reasons don't have to be a secret.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - William Neal: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
- You: I've always supported it.
  - _if William Neal knows:_
    - William Neal: Dylan Riggs says you told them you were against it.
    - You: You're right. I shouldn't have said that.
      - William Neal: Thank you for telling me straight.
      - _Ends open_
    - You: People say a lot of things.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - William Neal: Proud enough to run on it?
        - You: I'm voting for it, and you can quote me.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
      - You: I'm not going to talk about that.
        - William Neal: Your vote is public. Your reasons don't have to be a secret.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: No comment.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
      - You: I'm still reading it.
        - William Neal: Voters will want to know where you stand.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
    - You: Then Dylan Riggs has it wrong.
      - _Ends open: William Neal: I'll be at the next meeting._
  - _if not:_
    - William Neal: Then I'll put that in the story.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/guarded/15w2s [scene-talk.narrate-narrate.there-s-a-knock-at-your-door-it-s-name-a-reporter-for-outlet]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/11w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/proud/9w1s [scene-talk.reply-answer.i-m-voting-for-it-and-you-can-quote-me]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L8 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L9 reply/answer/scene-talk/calm/4w1s [scene-talk.reply-answer.you-can-quote-me]; L10 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L11 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L12 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L13 reply/answer/scene-talk/proud/8w2s [scene-talk.reply-answer.yes-some-things-matter-more-than-one-election]; L14 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L15 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L16 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L17 reply/answer/scene-talk/calm/9w1s [scene-talk.reply-answer.i-d-tell-them-i-listened-and-i-still-disagree]; L18 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L19 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L20 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L21 reply/answer/scene-talk/braced/7w1s [scene-talk.reply-answer.read-the-bill-before-you-judge-it]; L22 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L23 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L24 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]</sub>

**Profile cold** (outcome resolved)

**William Neal:** Mind if I ask you a few things?

**William Neal:** Can you tell me how you'll vote on "Stand your ground"?

You could say:

1. I'm voting no, and I'll tell you why. _(the page follows this one)_
2. I'm still reading it.
3. I'm not going to talk about that.
4. I've always supported it.

**William Neal:** What do you say to people who disagree?

You could say:

1. Read the bill before you judge it. _(the page follows this one)_
2. I'm still reading it.
3. No comment.

**William Neal:** Can I quote you on that?

You could say:

1. You can quote me. _(the page follows this one)_
2. I'm still reading it.
3. No comment.

**William Neal:** Even if it costs you votes?

You could say:

1. Even then. It's the right call. _(the page follows this one)_
2. I'm still reading it.
3. No comment.

**William Neal:** Can I quote you on that?

You could say:

1. Go ahead. I meant every word. _(the page follows this one)_
2. I'm still reading it.
3. I'm not going to talk about that.

**William Neal:** What do you say to people who disagree?

<sub>L1 narrate/narrate/scene-talk/guarded/15w2s [scene-talk.narrate-narrate.there-s-a-knock-at-your-door-it-s-name-a-reporter-for-outlet]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/11w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L5 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L8 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L9 reply/answer/scene-talk/braced/7w1s [scene-talk.reply-answer.read-the-bill-before-you-judge-it]; L10 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L11 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L12 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L13 reply/answer/scene-talk/calm/4w1s [scene-talk.reply-answer.you-can-quote-me]; L14 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L15 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L16 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L17 reply/answer/scene-talk/calm/6w2s [scene-talk.reply-answer.even-then-it-s-the-right-call]; L18 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L19 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L20 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L21 reply/answer/scene-talk/proud/6w2s [scene-talk.reply-answer.go-ahead-i-meant-every-word]; L22 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L23 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L24 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]</sub>

**Profile stubborn** (outcome resolved)

**William Neal:** Mind if I ask you a few things?

**William Neal:** Can you tell me how you'll vote on "Stand your ground"?

You could say:

1. I'm voting no, and I'll tell you why. _(the page follows this one)_
2. I'll have something to say after the vote.
3. I'm not going to talk about that.
4. I've always supported it.

**William Neal:** Can I quote you on that?

You could say:

1. Go ahead. I meant every word. _(the page follows this one)_
2. I'll have something to say after the vote.
3. No comment.

**William Neal:** What do you say to people who disagree?

You could say:

1. Read the bill before you judge it. _(the page follows this one)_
2. I'm still reading it.
3. I'm not going to talk about that.

**William Neal:** Even if it costs you votes?

You could say:

1. Even then. It's the right call. _(the page follows this one)_
2. I'm still reading it.
3. No comment.

**William Neal:** Even if it costs you votes?

You could say:

1. Yes. Some things matter more than one election. _(the page follows this one)_
2. I'm still reading it.
3. I'm not going to talk about that.

**William Neal:** Even if it costs you votes?

<sub>L1 narrate/narrate/scene-talk/guarded/15w2s [scene-talk.narrate-narrate.there-s-a-knock-at-your-door-it-s-name-a-reporter-for-outlet]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/11w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L8 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L9 reply/answer/scene-talk/proud/6w2s [scene-talk.reply-answer.go-ahead-i-meant-every-word]; L10 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L11 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L12 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L13 reply/answer/scene-talk/braced/7w1s [scene-talk.reply-answer.read-the-bill-before-you-judge-it]; L14 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L15 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L16 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L17 reply/answer/scene-talk/calm/6w2s [scene-talk.reply-answer.even-then-it-s-the-right-call]; L18 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L19 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L20 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L21 reply/answer/scene-talk/proud/8w2s [scene-talk.reply-answer.yes-some-things-matter-more-than-one-election]; L22 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L23 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L24 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]</sub>

**Profile anxious** (outcome resolved)

**William Neal:** Mind if I ask you a few things?

**William Neal:** Can you tell me how you'll vote on "Stand your ground"?

You could say:

1. I'm voting for it, and you can quote me. _(the page follows this one)_
2. I'm still reading it.
3. No comment.
4. I've always supported it.

**William Neal:** Even if it costs you votes?

You could say:

1. Even then. It's the right call. _(the page follows this one)_
2. I'm still reading it.
3. No comment.

**William Neal:** What do you say to people who disagree?

You could say:

1. Read the bill before you judge it. _(the page follows this one)_
2. I'm still reading it.
3. No comment.

**William Neal:** Can I quote you on that?

You could say:

1. Go ahead. I meant every word. _(the page follows this one)_
2. I'll have something to say after the vote.
3. No comment.

**William Neal:** Can I quote you on that?

You could say:

1. You can quote me. _(the page follows this one)_
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**William Neal:** Can I quote you on that?

<sub>L1 narrate/narrate/scene-talk/guarded/15w2s [scene-talk.narrate-narrate.there-s-a-knock-at-your-door-it-s-name-a-reporter-for-outlet]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/11w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/proud/9w1s [scene-talk.reply-answer.i-m-voting-for-it-and-you-can-quote-me]; L5 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L8 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L9 reply/answer/scene-talk/calm/6w2s [scene-talk.reply-answer.even-then-it-s-the-right-call]; L10 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L11 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L12 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L13 reply/answer/scene-talk/braced/7w1s [scene-talk.reply-answer.read-the-bill-before-you-judge-it]; L14 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L15 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L16 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L17 reply/answer/scene-talk/proud/6w2s [scene-talk.reply-answer.go-ahead-i-meant-every-word]; L18 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L19 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L20 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L21 reply/answer/scene-talk/calm/4w1s [scene-talk.reply-answer.you-can-quote-me]; L22 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L23 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L24 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]</sub>

**Profile boastful** (outcome resolved)

**William Neal:** Mind if I ask you a few things?

**William Neal:** Can you tell me how you'll vote on "Stand your ground"?

You could say:

1. I'm voting for it, and you can quote me. _(the page follows this one)_
2. I'm still reading it.
3. No comment.
4. I've always supported it.

**William Neal:** Even if it costs you votes?

You could say:

1. Yes. Some things matter more than one election. _(the page follows this one)_
2. I'm still reading it.
3. No comment.

**William Neal:** What do you say to people who disagree?

You could say:

1. I'd tell them I listened, and I still disagree. _(the page follows this one)_
2. I'm still reading it.
3. No comment.

**William Neal:** Can I quote you on that?

You could say:

1. Go ahead. I meant every word. _(the page follows this one)_
2. I'll have something to say after the vote.
3. No comment.

**William Neal:** Can I quote you on that?

You could say:

1. You can quote me. _(the page follows this one)_
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**William Neal:** Can I quote you on that?

<sub>L1 narrate/narrate/scene-talk/guarded/15w2s [scene-talk.narrate-narrate.there-s-a-knock-at-your-door-it-s-name-a-reporter-for-outlet]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/11w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/proud/9w1s [scene-talk.reply-answer.i-m-voting-for-it-and-you-can-quote-me]; L5 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L8 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L9 reply/answer/scene-talk/proud/8w2s [scene-talk.reply-answer.yes-some-things-matter-more-than-one-election]; L10 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L11 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L12 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L13 reply/answer/scene-talk/calm/9w1s [scene-talk.reply-answer.i-d-tell-them-i-listened-and-i-still-disagree]; L14 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L15 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L16 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L17 reply/answer/scene-talk/proud/6w2s [scene-talk.reply-answer.go-ahead-i-meant-every-word]; L18 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L19 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L20 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L21 reply/answer/scene-talk/calm/4w1s [scene-talk.reply-answer.you-can-quote-me]; L22 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L23 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L24 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]</sub>

## Scene 4: campaign-stop (vote-wanted, ends in political) — proof scene

_Purpose rally-volunteer. Records: filing:contest:seat:gus2025:101811:treasurer:0:2026-11-03:person_6863e973f50172f8, person_565365c9720b4032, person_6863e973f50172f8._

> Your volunteers are packing up the campaign signs. Emily Villanueva catches you before you leave.

**Profile warm** (outcome resolved)

**Emily Villanueva:** Great rally.

**Emily Villanueva:** Where do you want us this weekend?

You could say:

1. I'll come by the office tomorrow and thank everyone.
2. More people knocking on doors. Bring a friend next time.
3. Honestly? More of what you're already doing. _(the page follows this one)_
4. Let's talk about it at the office.

**Emily Villanueva:** So what's next?

You could say:

1. More people knocking on doors. Bring a friend next time.
2. I'll come by the office tomorrow and thank everyone. _(the page follows this one)_

**Emily Villanueva:** We'll be there.

**The whole exchange** (9 nodes; endings: resolved, open, open, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- You: I'll come by the office tomorrow and thank everyone.
  - Emily Villanueva: We'll be there.
  - _Ends resolved_
- You: More people knocking on doors. Bring a friend next time.
  - Emily Villanueva: You've got it. We'll bring more people Saturday.
  - _Ends open: Emily Villanueva: We'll be ready Saturday._
- You ★: Honestly? More of what you're already doing.
  - Emily Villanueva: So what's next?
  - You: More people knocking on doors. Bring a friend next time.
    - Emily Villanueva: You've got it. We'll bring more people Saturday.
    - _Ends open: Emily Villanueva: We'll be ready Saturday._
  - You ★: I'll come by the office tomorrow and thank everyone.
    - Emily Villanueva: We'll be there.
    - _Ends resolved_
- You: Let's talk about it at the office.
  - Emily Villanueva: We need something before Saturday.
  - You: Get me more volunteers for door knocking.
    - Emily Villanueva: You've got it. We'll bring more people Saturday.
    - _Ends open: Emily Villanueva: We'll be ready Saturday._
  - You: I'll come by the office tomorrow and thank everyone.
    - Emily Villanueva: We'll be there.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/glad/15w2s [scene-talk.narrate-narrate.your-volunteers-are-packing-up-the-campaign-signs-name-catches-you-bef]; L2 open/greet/scene-talk/glad/2w1s [scene-talk.open-greet.great-rally]; L3 state/request/scene-talk/eager/7w1s [scene-talk.state-request.where-do-you-want-us-this-weekend]; L4 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L5 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L6 reply/thank/scene-talk/tender/7w2s [scene-talk.reply-thank.honestly-more-of-what-you-re-already-doing]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L11 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L12 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L13 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L16 follow/thank/scene-talk/glad/3w1s [scene-talk.follow-thank.we-ll-be-there]</sub>

**Profile cold** (outcome resolved)

**Emily Villanueva:** They loved you up there.

**Emily Villanueva:** Where do you want us this weekend?

You could say:

1. I'll go door knocking with you this weekend.
2. More people knocking on doors. Bring a friend next time.
3. Just keep showing up. Thank you, all of you. _(the page follows this one)_
4. Let's talk about it at the office.

**Emily Villanueva:** So what's next?

You could say:

1. Keep them coming back. That's all I need.
2. I'll go door knocking with you this weekend. _(the page follows this one)_

**Emily Villanueva:** We'll be there.

<sub>L1 narrate/narrate/scene-talk/glad/15w2s [scene-talk.narrate-narrate.your-volunteers-are-packing-up-the-campaign-signs-name-catches-you-bef]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/7w1s [scene-talk.state-request.where-do-you-want-us-this-weekend]; L4 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L5 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L11 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L12 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L13 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L16 follow/thank/scene-talk/glad/3w1s [scene-talk.follow-thank.we-ll-be-there]</sub>

**Profile stubborn** (outcome resolved)

**Emily Villanueva:** They loved you up there.

**Emily Villanueva:** Where do you want us this weekend?

You could say:

1. I'll go door knocking with you this weekend.
2. Keep them coming back. That's all I need.
3. Honestly? More of what you're already doing. _(the page follows this one)_
4. Let's talk about it at the office.

**Emily Villanueva:** So what's next?

You could say:

1. More people knocking on doors. Bring a friend next time.
2. I'll go door knocking with you this weekend. _(the page follows this one)_

**Emily Villanueva:** We'll be there.

<sub>L1 narrate/narrate/scene-talk/glad/15w2s [scene-talk.narrate-narrate.your-volunteers-are-packing-up-the-campaign-signs-name-catches-you-bef]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/7w1s [scene-talk.state-request.where-do-you-want-us-this-weekend]; L4 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L5 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L6 reply/thank/scene-talk/tender/7w2s [scene-talk.reply-thank.honestly-more-of-what-you-re-already-doing]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L11 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L12 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L13 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L16 follow/thank/scene-talk/glad/3w1s [scene-talk.follow-thank.we-ll-be-there]</sub>

**Profile anxious** (outcome resolved)

**Emily Villanueva:** They loved you up there.

**Emily Villanueva:** Where do you want us this weekend?

You could say:

1. I'll come by the office tomorrow and thank everyone.
2. Keep them coming back. That's all I need.
3. Just keep showing up. Thank you, all of you. _(the page follows this one)_
4. Let's talk about it at the office.

**Emily Villanueva:** So what's next?

You could say:

1. More people knocking on doors. Bring a friend next time.
2. I'll come by the office tomorrow and thank everyone. _(the page follows this one)_

**Emily Villanueva:** We'll be there.

<sub>L1 narrate/narrate/scene-talk/glad/15w2s [scene-talk.narrate-narrate.your-volunteers-are-packing-up-the-campaign-signs-name-catches-you-bef]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/7w1s [scene-talk.state-request.where-do-you-want-us-this-weekend]; L4 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L5 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L11 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L12 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L13 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L16 follow/thank/scene-talk/glad/3w1s [scene-talk.follow-thank.we-ll-be-there]</sub>

**Profile boastful** (outcome open)

**Emily Villanueva:** Great rally.

**Emily Villanueva:** Where do you want us this weekend?

You could say:

1. I'll go door knocking with you this weekend.
2. Get me more volunteers for door knocking.
3. Just keep showing up. Thank you, all of you. _(the page follows this one)_
4. Let's talk about it at the office.

**Emily Villanueva:** So what's next?

You could say:

1. Keep them coming back. That's all I need. _(the page follows this one)_
2. I'll go door knocking with you this weekend.

**Emily Villanueva:** You've got it. We'll bring more people Saturday.

**Emily Villanueva:** We'll be ready Saturday.

<sub>L1 narrate/narrate/scene-talk/glad/15w2s [scene-talk.narrate-narrate.your-volunteers-are-packing-up-the-campaign-signs-name-catches-you-bef]; L2 open/greet/scene-talk/glad/2w1s [scene-talk.open-greet.great-rally]; L3 state/request/scene-talk/eager/7w1s [scene-talk.state-request.where-do-you-want-us-this-weekend]; L4 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L5 reply/request/scene-talk/eager/7w1s [scene-talk.reply-request.get-me-more-volunteers-for-door-knocking]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L11 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L12 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L13 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L14 follow/promise/scene-talk/eager/8w2s [scene-talk.follow-promise.you-ve-got-it-we-ll-bring-more-people-saturday]; L15 close/press/scene-talk/eager/4w1s [scene-talk.close-press.we-ll-be-ready-saturday]</sub>

## Scene 5: campaign-stop (vote-wanted, ends in political) — proof scene

_Purpose rally-volunteer. Records: filing:contest:seat:gus2025:101811:sheriff:0:2026-11-03:person_f9be8ef45e5d143f, person_9c90c550f58e121a, person_f9be8ef45e5d143f._

> The rally is over and the crowd is thinning out. Justin McCarthy, one of your volunteers, comes over.

**Profile warm** (outcome open)

**Justin McCarthy:** They loved you up there.

**Justin McCarthy:** What do you need from us this week?

You could say:

1. I'll go door knocking with you this weekend.
2. Get me more volunteers for door knocking. _(the page follows this one)_
3. Honestly? More of what you're already doing.
4. Let's talk about it at the office.

**Justin McCarthy:** You've got it. We'll bring more people Saturday.

**Justin McCarthy:** We'll be ready Saturday.

**The whole exchange** (9 nodes; endings: resolved, open, open, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- You: I'll go door knocking with you this weekend.
  - Justin McCarthy: We'll be there.
  - _Ends resolved_
- You ★: Get me more volunteers for door knocking.
  - Justin McCarthy: You've got it. We'll bring more people Saturday.
  - _Ends open: Justin McCarthy: We'll be ready Saturday._
- You: Honestly? More of what you're already doing.
  - Justin McCarthy: So what's next?
  - You: Keep them coming back. That's all I need.
    - Justin McCarthy: You've got it. We'll bring more people Saturday.
    - _Ends open: Justin McCarthy: We'll be ready Saturday._
  - You: I'll go door knocking with you this weekend.
    - Justin McCarthy: You got it.
    - _Ends resolved_
- You: Let's talk about it at the office.
  - Justin McCarthy: We need something before Saturday.
  - You: Keep them coming back. That's all I need.
    - Justin McCarthy: You've got it. We'll bring more people Saturday.
    - _Ends open: Justin McCarthy: We'll be ready Saturday._
  - You: I'll come by the office tomorrow and thank everyone.
    - Justin McCarthy: We'll be there.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/8w1s [scene-talk.state-request.what-do-you-need-from-us-this-week]; L4 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L5 reply/request/scene-talk/eager/7w1s [scene-talk.reply-request.get-me-more-volunteers-for-door-knocking]; L6 reply/thank/scene-talk/tender/7w2s [scene-talk.reply-thank.honestly-more-of-what-you-re-already-doing]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L9 follow/promise/scene-talk/eager/8w2s [scene-talk.follow-promise.you-ve-got-it-we-ll-bring-more-people-saturday]; L10 close/press/scene-talk/eager/4w1s [scene-talk.close-press.we-ll-be-ready-saturday]</sub>

**Profile cold** (outcome open)

**Justin McCarthy:** They loved you up there.

**Justin McCarthy:** What do you need from us this week?

You could say:

1. I'll come by the office tomorrow and thank everyone.
2. More people knocking on doors. Bring a friend next time. _(the page follows this one)_
3. Just keep showing up. Thank you, all of you.
4. Let's talk about it at the office.

**Justin McCarthy:** You've got it. We'll bring more people Saturday.

**Justin McCarthy:** We'll be ready Saturday.

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/8w1s [scene-talk.state-request.what-do-you-need-from-us-this-week]; L4 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L5 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L9 follow/promise/scene-talk/eager/8w2s [scene-talk.follow-promise.you-ve-got-it-we-ll-bring-more-people-saturday]; L10 close/press/scene-talk/eager/4w1s [scene-talk.close-press.we-ll-be-ready-saturday]</sub>

**Profile stubborn** (outcome open)

**Justin McCarthy:** They loved you up there.

**Justin McCarthy:** What do you need from us this week?

You could say:

1. I'll come by the office tomorrow and thank everyone.
2. More people knocking on doors. Bring a friend next time. _(the page follows this one)_
3. Honestly? More of what you're already doing.
4. Let's talk about it at the office.

**Justin McCarthy:** You've got it. We'll bring more people Saturday.

**Justin McCarthy:** We'll be ready Saturday.

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/8w1s [scene-talk.state-request.what-do-you-need-from-us-this-week]; L4 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L5 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L6 reply/thank/scene-talk/tender/7w2s [scene-talk.reply-thank.honestly-more-of-what-you-re-already-doing]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L9 follow/promise/scene-talk/eager/8w2s [scene-talk.follow-promise.you-ve-got-it-we-ll-bring-more-people-saturday]; L10 close/press/scene-talk/eager/4w1s [scene-talk.close-press.we-ll-be-ready-saturday]</sub>

## Scene 6: campaign-stop (vote-wanted, ends in political) — proof scene

_Purpose rally-volunteer. Records: filing:contest:seat:US-DE:us-house:00:2026-11-03:official:term:seat:US-DE:us-house:00:2026-10-12, person:press:outlet:television:1:jurisdiction_59500182da2857ae:reporter:0, official:term:seat:US-DE:us-house:00:2026-10-12._

> The rally is over and the crowd is thinning out. Briana Ross, one of your volunteers, comes over.

**Profile warm** (outcome resolved)

**Briana Ross:** Great rally.

**Briana Ross:** Where do you want us this weekend?

You could say:

1. I'll come by the office tomorrow and thank everyone.
2. Keep them coming back. That's all I need.
3. Honestly? More of what you're already doing. _(the page follows this one)_
4. Let's talk about it at the office.

**Briana Ross:** So what's next?

You could say:

1. More people knocking on doors. Bring a friend next time.
2. I'll come by the office tomorrow and thank everyone. _(the page follows this one)_

**Briana Ross:** We'll be there.

**The whole exchange** (9 nodes; endings: resolved, open, open, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- You: I'll come by the office tomorrow and thank everyone.
  - Briana Ross: We'll be there.
  - _Ends resolved_
- You: Keep them coming back. That's all I need.
  - Briana Ross: You've got it. We'll bring more people Saturday.
  - _Ends open: Briana Ross: We'll be ready Saturday._
- You ★: Honestly? More of what you're already doing.
  - Briana Ross: So what's next?
  - You: More people knocking on doors. Bring a friend next time.
    - Briana Ross: You've got it. We'll bring more people Saturday.
    - _Ends open: Briana Ross: We'll be ready Saturday._
  - You ★: I'll come by the office tomorrow and thank everyone.
    - Briana Ross: We'll be there.
    - _Ends resolved_
- You: Let's talk about it at the office.
  - Briana Ross: We need something before Saturday.
  - You: More people knocking on doors. Bring a friend next time.
    - Briana Ross: You've got it. We'll bring more people Saturday.
    - _Ends open: Briana Ross: We'll be ready Saturday._
  - You: I'll come by the office tomorrow and thank everyone.
    - Briana Ross: You got it.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/2w1s [scene-talk.open-greet.great-rally]; L3 state/request/scene-talk/eager/7w1s [scene-talk.state-request.where-do-you-want-us-this-weekend]; L4 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L5 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L6 reply/thank/scene-talk/tender/7w2s [scene-talk.reply-thank.honestly-more-of-what-you-re-already-doing]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L11 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L12 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L13 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L16 follow/thank/scene-talk/glad/3w1s [scene-talk.follow-thank.we-ll-be-there]</sub>

**Profile cold** (outcome resolved)

**Briana Ross:** They loved you up there.

**Briana Ross:** Where do you want us this weekend?

You could say:

1. I'll go door knocking with you this weekend.
2. Get me more volunteers for door knocking.
3. Just keep showing up. Thank you, all of you.
4. Let's talk about it at the office. _(the page follows this one)_

**Briana Ross:** We need something before Saturday.

You could say:

1. More people knocking on doors. Bring a friend next time.
2. I'll go door knocking with you this weekend. _(the page follows this one)_

**Briana Ross:** We'll be there.

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/7w1s [scene-talk.state-request.where-do-you-want-us-this-weekend]; L4 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L5 reply/request/scene-talk/eager/7w1s [scene-talk.reply-request.get-me-more-volunteers-for-door-knocking]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L17 follow/press/scene-talk/eager/5w1s [scene-talk.follow-press.we-need-something-before-saturday]; L18 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L19 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L22 follow/thank/scene-talk/glad/3w1s [scene-talk.follow-thank.we-ll-be-there]</sub>

**Profile stubborn** (outcome resolved)

**Briana Ross:** Great rally.

**Briana Ross:** Where do you want us this weekend?

You could say:

1. I'll come by the office tomorrow and thank everyone. _(the page follows this one)_
2. Keep them coming back. That's all I need.
3. Honestly? More of what you're already doing.
4. Let's talk about it at the office.

**Briana Ross:** You got it.

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/2w1s [scene-talk.open-greet.great-rally]; L3 state/request/scene-talk/eager/7w1s [scene-talk.state-request.where-do-you-want-us-this-weekend]; L4 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L5 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L6 reply/thank/scene-talk/tender/7w2s [scene-talk.reply-thank.honestly-more-of-what-you-re-already-doing]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L8 follow/thank/scene-talk/glad/3w1s [scene-talk.follow-thank.you-got-it]</sub>

**Profile anxious** (outcome resolved)

**Briana Ross:** Great rally.

**Briana Ross:** Where do you want us this weekend?

You could say:

1. I'll come by the office tomorrow and thank everyone.
2. Keep them coming back. That's all I need.
3. Just keep showing up. Thank you, all of you.
4. Let's talk about it at the office. _(the page follows this one)_

**Briana Ross:** We need something before Saturday.

You could say:

1. More people knocking on doors. Bring a friend next time.
2. I'll go door knocking with you this weekend. _(the page follows this one)_

**Briana Ross:** We'll be there.

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/2w1s [scene-talk.open-greet.great-rally]; L3 state/request/scene-talk/eager/7w1s [scene-talk.state-request.where-do-you-want-us-this-weekend]; L4 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L5 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L17 follow/press/scene-talk/eager/5w1s [scene-talk.follow-press.we-need-something-before-saturday]; L18 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L19 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L22 follow/thank/scene-talk/glad/3w1s [scene-talk.follow-thank.we-ll-be-there]</sub>

**Profile boastful** (outcome open)

**Briana Ross:** Great rally.

**Briana Ross:** Where do you want us this weekend?

You could say:

1. I'll come by the office tomorrow and thank everyone.
2. More people knocking on doors. Bring a friend next time. _(the page follows this one)_
3. Just keep showing up. Thank you, all of you.
4. Let's talk about it at the office.

**Briana Ross:** You've got it. We'll bring more people Saturday.

**Briana Ross:** We'll be ready Saturday.

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/2w1s [scene-talk.open-greet.great-rally]; L3 state/request/scene-talk/eager/7w1s [scene-talk.state-request.where-do-you-want-us-this-weekend]; L4 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L5 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L9 follow/promise/scene-talk/eager/8w2s [scene-talk.follow-promise.you-ve-got-it-we-ll-bring-more-people-saturday]; L10 close/press/scene-talk/eager/4w1s [scene-talk.close-press.we-ll-be-ready-saturday]</sub>

## Scene 7: vote-asked (vote-wanted, ends in bill) — proof scene

_Purpose ask-vote. Records: bill:office:US-DE:legislature-lower:2027-02-03:official:term:seat:US-DE:lower:001:0:2026-10-12:26, official:term:seat:US-DE:lower:036:0:2026-10-12, official:term:seat:US-DE:lower:004:0:2026-10-12, office:US-DE:legislature-lower._

> Crystal Savage has been counting votes on "Bottle deposit" all week. Now Crystal Savage is at your door.

**Profile warm** (outcome resolved)

**Crystal Savage:** Is now a bad time?

**Crystal Savage:** Can I count on you for "Bottle deposit"?

You could say:

1. Count me in. _(the page follows this one)_
2. I'm sorry, but I'm a no on "Bottle deposit".
3. This is a two-way street. I'll need your vote on mine.
4. Let me think about it.
5. I'm leaning your way.

**Crystal Savage:** Thank you. Really.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You ★: Count me in.
  - Crystal Savage: Thank you. Really.
  - _Ends resolved_
- You: I'm sorry, but I'm a no on "Bottle deposit".
  - Crystal Savage: You know what this means to me.
  - You: All right. You win. I'm in.
    - Crystal Savage: You won't regret it.
    - _Ends resolved_
  - You: I've made up my mind. It's no.
    - Crystal Savage: Please. Think about the people this helps.
    - You: All right. You win. I'm in.
      - Crystal Savage: Thank you. I won't forget it.
      - _Ends resolved_
    - You: I can't vote for "Bottle deposit".
      - Crystal Savage: Not even if we fix what bothers you?
      - You: All right. You win. I'm in.
        - Crystal Savage: Thank you. Really.
        - _Ends resolved_
      - You: What's in it for my district?
        - Crystal Savage: I'll make sure your district comes first in the next budget.
        - You: You have my vote.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
      - You: Let me think about it.
        - Crystal Savage: You can't stay on the fence forever.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: Ask me again after the committee vote.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Crystal Savage: That I can live with.
      - _Ends resolved_
    - You: I need a few days to think it over.
      - Crystal Savage: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - Crystal Savage: I knew I could count on you.
        - _Ends resolved_
      - You: I can't vote for "Bottle deposit".
        - Crystal Savage: Not even if we fix what bothers you?
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Crystal Savage: Deal.
        - _Ends resolved_
      - You: Ask me again after the committee vote.
        - Crystal Savage: Without this, I've got nothing to take home.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Bottle deposit".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
  - You: This is a two-way street. I'll need your vote on mine.
    - Crystal Savage: Deal.
    - _Ends resolved_
  - You: I need a few days to think it over.
    - Crystal Savage: You can't stay on the fence forever.
    - You: You've made your point. Count me in.
      - Crystal Savage: Thank you. I know that wasn't easy.
      - _Ends resolved_
    - You: I've made up my mind. It's no.
      - Crystal Savage: Please. Think about the people this helps.
      - You: Okay. For you, I'll do it.
        - Crystal Savage: Thank you. Really.
        - _Ends resolved_
      - You: I can't vote for "Bottle deposit".
        - Crystal Savage: Not even if we fix what bothers you?
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Crystal Savage: That I can live with.
        - _Ends resolved_
      - You: Let me think about it.
        - Crystal Savage: You can't stay on the fence forever.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Bottle deposit".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Ask me again after the committee vote.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Crystal Savage: Deal.
      - _Ends resolved_
    - You: Ask me again after the committee vote.
      - Crystal Savage: I'm asking as a friend.
      - You: Okay. For you, I'll do it.
        - Crystal Savage: You won't regret it.
        - _Ends resolved_
      - You: I've made up my mind. It's no.
        - Crystal Savage: I could lose my primary over this.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Bottle deposit".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Crystal Savage: All right. We have a deal.
        - _Ends resolved_
      - You: Let me think about it.
        - Crystal Savage: You can't stay on the fence forever.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
- You: This is a two-way street. I'll need your vote on mine.
  - Crystal Savage: Deal.
  - _Ends resolved_
- You: Let me think about it.
  - Crystal Savage: You can't stay on the fence forever.
  - You: Okay. For you, I'll do it.
    - Crystal Savage: Thank you. Really.
    - _Ends resolved_
  - You: I've made up my mind. It's no.
    - Crystal Savage: You know what this means to me.
    - You: All right. You win. I'm in.
      - Crystal Savage: I knew I could count on you.
      - _Ends resolved_
    - You: I'm sorry, but I'm a no on "Bottle deposit".
      - Crystal Savage: Please. Think about the people this helps.
      - You: Okay. For you, I'll do it.
        - Crystal Savage: Thank you. I won't forget it.
        - _Ends resolved_
      - You: I can't vote for "Bottle deposit".
        - Crystal Savage: Not even if we fix what bothers you?
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Crystal Savage: That I can live with.
        - _Ends resolved_
      - You: I need a few days to think it over.
        - Crystal Savage: You can't stay on the fence forever.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I can't vote for "Bottle deposit".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Ask me again after the committee vote.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Crystal Savage: That I can live with.
      - _Ends resolved_
    - You: I'm still weighing it.
      - Crystal Savage: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - Crystal Savage: I knew I could count on you.
        - _Ends resolved_
      - You: I can't vote for "Bottle deposit".
        - Crystal Savage: Not even if we fix what bothers you?
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Bottle deposit".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Crystal Savage: Deal.
        - _Ends resolved_
      - You: Ask me again after the committee vote.
        - Crystal Savage: I'm asking as a friend.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I can't vote for "Bottle deposit".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I'm still undecided. Give me until the vote.
          - (the tree is cut here)
  - You: This is a two-way street. I'll need your vote on mine.
    - Crystal Savage: All right. We have a deal.
    - _Ends resolved_
  - You: Ask me again after the committee vote.
    - Crystal Savage: I'm asking as a friend.
    - You: You've made your point. Count me in.
      - Crystal Savage: Thank you. I know that wasn't easy.
      - _Ends resolved_
    - You: I'm sorry, but I'm a no on "Bottle deposit".
      - Crystal Savage: Please. Think about the people this helps.
      - You: You've made your point. Count me in.
        - Crystal Savage: Thank you. I know that wasn't easy.
        - _Ends resolved_
      - You: I can't vote for "Bottle deposit".
        - Crystal Savage: Not even if we fix what bothers you?
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
      - You: What's in it for my district?
        - Crystal Savage: I'll make sure your district comes first in the next budget.
        - You: Count me in.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: Let me sleep on it.
        - Crystal Savage: You can't stay on the fence forever.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
    - You: I'll vote yes, but I'm going to need a favor from you.
      - Crystal Savage: Name it. If I can do it, it's yours.
      - _Ends resolved_
    - You: I'm still weighing it.
      - Crystal Savage: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - Crystal Savage: You won't regret it.
        - _Ends resolved_
      - You: I can't vote for "Bottle deposit".
        - Crystal Savage: Not even if we fix what bothers you?
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
- You: I'm leaning your way.
  - _if not:_
    - Crystal Savage: Good. I'll put you down as a yes.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-counting-votes-on-bill-all-week-now-name-is-at-your-door]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.is-now-a-bad-time]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.can-i-count-on-you-for-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L9 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile cold** (outcome resolved)

**Crystal Savage:** Is now a bad time?

**Crystal Savage:** "Bottle deposit" comes down to a vote or two. Yours is one of them.

You could say:

1. Fine. You have it.
2. I'm sorry, but I'm a no on "Bottle deposit". _(the page follows this one)_
3. I'll vote yes, but I'm going to need a favor from you.
4. I'm still weighing it.
5. I'm leaning your way.

**Crystal Savage:** It would be a shame if your next bill stalled.

You could say:

1. Okay. For you, I'll do it.
2. I've made up my mind. It's no. _(the page follows this one)_
3. Are you threatening me?
4. What's in it for my district?

**Crystal Savage:** You can't win without friends.

You could say:

1. Okay. For you, I'll do it.
2. I can't vote for "Bottle deposit". _(the page follows this one)_
3. Are you threatening me?
4. What's in it for my district?

**Crystal Savage:** Can't, or won't?

You could say:

1. Fine. I'll do it, but this is the last time.
2. This is a two-way street. I'll need your vote on mine.
3. Ask me again after the committee vote. _(the page follows this one)_

**Crystal Savage:** I need a yes or a no.

You could say:

1. You've made your point. Count me in. _(the page follows this one)_
2. This is a two-way street. I'll need your vote on mine.

**Crystal Savage:** Thank you. I know that wasn't easy.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-counting-votes-on-bill-all-week-now-name-is-at-your-door]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.is-now-a-bad-time]; L3 state/request/scene-talk/braced/14w2s [scene-talk.state-request.bill-comes-down-to-a-vote-or-two-yours-is-one-of-them]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L10 follow/threaten/scene-talk/guarded/10w1s [scene-talk.follow-threaten.it-would-be-a-shame-if-your-next-bill-stalled]; L11 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L12 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L13 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L14 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L16 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-can-t-win-without-friends]; L17 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L18 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L19 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L20 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L22 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.can-t-or-won-t]; L23 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L24 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L25 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.ask-me-again-after-the-committee-vote]; L28 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-a-yes-or-a-no]; L29 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L30 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L31 follow/thank/scene-talk/glad/7w2s [scene-talk.follow-thank.thank-you-i-know-that-wasn-t-easy]</sub>

**Profile stubborn** (outcome resolved)

**Crystal Savage:** Is now a bad time?

**Crystal Savage:** I'm counting votes on "Bottle deposit", and I need you.

You could say:

1. Fine. You have it.
2. I've made up my mind. It's no. _(the page follows this one)_
3. This is a two-way street. I'll need your vote on mine.
4. I'm still weighing it.
5. I'm leaning your way.

**Crystal Savage:** I need a yes or a no.

You could say:

1. You've made your point. Count me in.
2. I can't vote for "Bottle deposit". _(the page follows this one)_
3. I'll vote yes, but I'm going to need a favor from you.
4. Ask me again after the committee vote.

**Crystal Savage:** Can't, or won't?

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry, but I'm a no on "Bottle deposit". _(the page follows this one)_
3. I'll vote yes, but I'm going to need a favor from you.
4. Ask me again after the committee vote.

**Crystal Savage:** Yes or no?

You could say:

1. Fine. I'll do it, but this is the last time.
2. What's in it for my district? _(the page follows this one)_
3. Ask me again after the committee vote.

**Crystal Savage:** I'll make sure your district comes first in the next budget.

You could say:

1. Fine. You have it. _(the page follows this one)_
2. I'll vote yes, but I'm going to need a favor from you.
3. I need a few days to think it over.

**Crystal Savage:** Good. I'll hold you to that.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-counting-votes-on-bill-all-week-now-name-is-at-your-door]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.is-now-a-bad-time]; L3 state/request/scene-talk/hopeful/10w1s [scene-talk.state-request.i-m-counting-votes-on-bill-and-i-need-you]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L10 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-a-yes-or-a-no]; L11 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L12 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L13 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L14 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.ask-me-again-after-the-committee-vote]; L16 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.can-t-or-won-t]; L17 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L18 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L19 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L20 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.ask-me-again-after-the-committee-vote]; L22 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L23 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L24 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L25 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.ask-me-again-after-the-committee-vote]; L27 follow/bargain/scene-talk/calm/11w1s [scene-talk.follow-bargain.i-ll-make-sure-your-district-comes-first-in-the-next-budget]; L28 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L29 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L30 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L31 follow/thank/scene-talk/guarded/6w2s [scene-talk.follow-thank.good-i-ll-hold-you-to-that]</sub>

**Profile anxious** (outcome open)

**Crystal Savage:** Is now a bad time?

**Crystal Savage:** Can I count on you for "Bottle deposit"?

You could say:

1. Count me in.
2. I can't vote for "Bottle deposit".
3. I'll vote yes, but I'm going to need a favor from you.
4. I haven't decided yet. _(the page follows this one)_
5. I'm leaning your way.

**Crystal Savage:** You can't stay on the fence forever.

You could say:

1. You've made your point. Count me in.
2. I've made up my mind. It's no.
3. I'll vote yes, but I'm going to need a favor from you.
4. Ask me again after the committee vote. _(the page follows this one)_

**Crystal Savage:** I could lose my primary over this.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I've made up my mind. It's no.
3. This is a two-way street. I'll need your vote on mine.
4. I need a few days to think it over. _(the page follows this one)_

**Crystal Savage:** You can't stay on the fence forever.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't vote for "Bottle deposit".
3. What's in it for my district? _(the page follows this one)_

**Crystal Savage:** I'll make sure your district comes first in the next budget.

You could say:

1. Fine. You have it.
2. I'm sorry, but I'm a no on "Bottle deposit".
3. I'll vote yes, but I'm going to need a favor from you.
4. Let me sleep on it. _(the page follows this one)_

**Crystal Savage:** You can't stay on the fence forever.

**Crystal Savage:** You'll need friends after this vote. I won't be one.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-counting-votes-on-bill-all-week-now-name-is-at-your-door]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.is-now-a-bad-time]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.can-i-count-on-you-for-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L112 follow/press/scene-talk/guarded/7w1s [scene-talk.follow-press.you-can-t-stay-on-the-fence-forever]; L113 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L114 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L115 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L116 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.ask-me-again-after-the-committee-vote]; L163 follow/plea/scene-talk/anxious/7w1s [scene-talk.follow-plea.i-could-lose-my-primary-over-this]; L164 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L165 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L166 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L167 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L181 follow/press/scene-talk/guarded/7w1s [scene-talk.follow-press.you-can-t-stay-on-the-fence-forever]; L182 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L183 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L184 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L185 follow/bargain/scene-talk/calm/11w1s [scene-talk.follow-bargain.i-ll-make-sure-your-district-comes-first-in-the-next-budget]; L186 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L187 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L188 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L189 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L190 follow/press/scene-talk/guarded/7w1s [scene-talk.follow-press.you-can-t-stay-on-the-fence-forever]; L191 close/warn/scene-talk/braced/10w2s [scene-talk.close-warn.you-ll-need-friends-after-this-vote-i-won-t-be-one]</sub>

**Profile boastful** (outcome resolved)

**Crystal Savage:** Can I talk to you?

**Crystal Savage:** Can I count on you for "Bottle deposit"?

You could say:

1. Count me in.
2. I can't vote for "Bottle deposit".
3. What's in it for my district? _(the page follows this one)_
4. Let me think about it.
5. I'm leaning your way.

**Crystal Savage:** I'll make sure your district comes first in the next budget.

You could say:

1. Count me in.
2. I can't vote for "Bottle deposit".
3. I'll vote yes, but I'm going to need a favor from you. _(the page follows this one)_
4. I'm still weighing it.

**Crystal Savage:** Name it. If I can do it, it's yours.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-counting-votes-on-bill-all-week-now-name-is-at-your-door]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.can-i-count-on-you-for-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L98 follow/bargain/scene-talk/calm/11w1s [scene-talk.follow-bargain.i-ll-make-sure-your-district-comes-first-in-the-next-budget]; L99 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L100 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L101 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L102 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L121 follow/accept/scene-talk/calm/9w2s [scene-talk.follow-accept.name-it-if-i-can-do-it-it-s-yours]</sub>

## Scene 8: vote-asked (vote-wanted, ends in bill) — proof scene

_Purpose ask-vote. Records: bill:office:gus2025:101811:board:2027-04-10:person_bc041df6bd9d1a47:59, person_9e002a561a4b29bc, person_bf349ec8efe6104f, office:gus2025:101811:board._

> The vote on "Inclusionary requirement" is coming up. Kelly Riggs catches you outside the chamber.

**Profile warm** (outcome resolved)

**Kelly Riggs:** Have you got a few minutes?

**Kelly Riggs:** I need your vote on "Inclusionary requirement".

You could say:

1. I'm with you on "Inclusionary requirement". _(the page follows this one)_
2. I've made up my mind. It's no.
3. I'll vote yes, but I'm going to need a favor from you.
4. Let me sleep on it.
5. I'm leaning your way.

**Kelly Riggs:** Thank you. Really.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, open, open, resolved; ★ is the branch this profile's traits lean toward):

- You ★: I'm with you on "Inclusionary requirement".
  - Kelly Riggs: Thank you. Really.
  - _Ends resolved_
- You: I've made up my mind. It's no.
  - Kelly Riggs: I'm asking as a friend.
  - You: You've made your point. Count me in.
    - Kelly Riggs: Thank you. I know that wasn't easy.
    - _Ends resolved_
  - You: I'm sorry, but I'm a no on "Inclusionary requirement".
    - Kelly Riggs: I wouldn't ask if it didn't matter.
    - You: You've made your point. Count me in.
      - Kelly Riggs: Thank you. I know that wasn't easy.
      - _Ends resolved_
    - You: I can't vote for "Inclusionary requirement".
      - Kelly Riggs: Not even if we fix what bothers you?
      - You: You've made your point. Count me in.
        - Kelly Riggs: Thank you. I know that wasn't easy.
        - _Ends resolved_
      - You: I'll vote yes, but I'm going to need a favor from you.
        - Kelly Riggs: Name it. If I can do it, it's yours.
        - _Ends resolved_
      - You: I'm still weighing it.
        - Kelly Riggs: You can't stay on the fence forever.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Ask me again after the committee vote.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Kelly Riggs: All right. We have a deal.
      - _Ends resolved_
    - You: Let me sleep on it.
      - Kelly Riggs: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: Thank you. Really.
        - _Ends resolved_
      - You: I can't vote for "Inclusionary requirement".
        - Kelly Riggs: Not even if we fix what bothers you?
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Kelly Riggs: That I can live with.
        - _Ends resolved_
      - You: Ask me again after the committee vote.
        - Kelly Riggs: I could lose my primary over this.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I can't vote for "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
  - You: What's in it for my district?
    - Kelly Riggs: I'll make sure your district comes first in the next budget.
    - You: Count me in.
      - Kelly Riggs: Thank you. Really.
      - _Ends resolved_
    - You: I'm sorry, but I'm a no on "Inclusionary requirement".
      - Kelly Riggs: I wouldn't ask if it didn't matter.
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: Thank you. Really.
        - _Ends resolved_
      - You: I can't vote for "Inclusionary requirement".
        - Kelly Riggs: Not even if we fix what bothers you?
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Kelly Riggs: All right. We have a deal.
        - _Ends resolved_
      - You: Let me think about it.
        - Kelly Riggs: You can't stay on the fence forever.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Inclusionary requirement".
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: Ask me again after the committee vote.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Kelly Riggs: Deal.
      - _Ends resolved_
    - You: Let me sleep on it.
      - Kelly Riggs: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: Thank you. Really.
        - _Ends resolved_
      - You: I can't vote for "Inclusionary requirement".
        - Kelly Riggs: Not even if we fix what bothers you?
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Kelly Riggs: All right. We have a deal.
        - _Ends resolved_
      - You: Ask me again after the committee vote.
        - Kelly Riggs: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
  - You: Let me think about it.
    - Kelly Riggs: You can't stay on the fence forever.
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: I knew I could count on you.
      - _Ends resolved_
    - You: I can't vote for "Inclusionary requirement".
      - Kelly Riggs: Not even if we fix what bothers you?
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: Thank you. Really.
        - _Ends resolved_
      - You: I'm sorry, but I'm a no on "Inclusionary requirement".
        - Kelly Riggs: Without this, I've got nothing to take home.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Kelly Riggs: Deal.
      - _Ends resolved_
    - You: Ask me again after the committee vote.
      - Kelly Riggs: Please. Think about the people this helps.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I'm sorry, but I'm a no on "Inclusionary requirement".
        - (the tree is cut here)
      - You: I'll vote yes, but I'm going to need a favor from you.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
- You: I'll vote yes, but I'm going to need a favor from you.
  - Kelly Riggs: Name it. If I can do it, it's yours.
  - _Ends resolved_
- You: Let me sleep on it.
  - Kelly Riggs: You can't stay on the fence forever.
  - You: Okay. For you, I'll do it.
    - Kelly Riggs: Thank you. I won't forget it.
    - _Ends resolved_
  - You: I've made up my mind. It's no.
    - Kelly Riggs: I'm asking as a friend.
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: Thank you. Really.
      - _Ends resolved_
    - You: I can't vote for "Inclusionary requirement".
      - Kelly Riggs: Not even if we fix what bothers you?
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: I'm sorry, but I'm a no on "Inclusionary requirement".
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: I haven't decided yet.
        - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Kelly Riggs: Deal.
      - _Ends resolved_
    - You: Let me think about it.
      - Kelly Riggs: You can't stay on the fence forever.
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: I'm sorry, but I'm a no on "Inclusionary requirement".
        - (the tree is cut here)
      - You: What's in it for my district?
        - (the tree is cut here)
      - You: Ask me again after the committee vote.
        - (the tree is cut here)
  - You: I'll vote yes, but I'm going to need a favor from you.
    - Kelly Riggs: Name it. If I can do it, it's yours.
    - _Ends resolved_
  - You: Ask me again after the committee vote.
    - Kelly Riggs: Please. Think about the people this helps.
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: Thank you. I won't forget it.
      - _Ends resolved_
    - You: I've made up my mind. It's no.
      - Kelly Riggs: I'm asking as a friend.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I can't vote for "Inclusionary requirement".
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: I need a few days to think it over.
        - (the tree is cut here)
    - You: I'll vote yes, but I'm going to need a favor from you.
      - Kelly Riggs: Name it. If I can do it, it's yours.
      - _Ends resolved_
    - You: Let me think about it.
      - Kelly Riggs: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
- You: I'm leaning your way.
  - _if Kelly Riggs knows:_
    - Kelly Riggs: That's not what you told Wesley Alexander.
    - You: All right. Here's the truth.
      - Kelly Riggs: Thank you for telling me straight.
      - _Ends open_
    - You: People say a lot of things.
      - Kelly Riggs: What would it take?
      - You: You've made your point. Count me in.
        - Kelly Riggs: Thank you. I know that wasn't easy.
        - _Ends resolved_
      - You: I can't vote for "Inclusionary requirement".
        - Kelly Riggs: Not even if we fix what bothers you?
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
      - You: I'll vote yes, but I'm going to need a favor from you.
        - Kelly Riggs: Name it. If I can do it, it's yours.
        - _Ends open_
      - You: Ask me again after the committee vote.
        - Kelly Riggs: Take your time, but I need an answer.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
    - You: Then Wesley Alexander has it wrong.
      - _Ends open: Kelly Riggs: I'll call you before the vote._
  - _if not:_
    - Kelly Riggs: Good. I'll put you down as a yes.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.the-vote-on-bill-is-coming-up-name-catches-you-outside-the-chamber]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/request/scene-talk/hopeful/7w1s [scene-talk.state-request.i-need-your-vote-on-bill]; L4 reply/agree/scene-talk/calm/6w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L9 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile cold** (outcome resolved)

**Kelly Riggs:** Can I talk to you?

**Kelly Riggs:** I'm counting votes on "Inclusionary requirement", and I need you.

You could say:

1. I'm with you on "Inclusionary requirement". _(the page follows this one)_
2. I can't vote for "Inclusionary requirement".
3. I'll vote yes, but I'm going to need a favor from you.
4. Let me think about it.
5. I'm leaning your way.

**Kelly Riggs:** You won't regret it.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.the-vote-on-bill-is-coming-up-name-catches-you-outside-the-chamber]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/request/scene-talk/hopeful/10w1s [scene-talk.state-request.i-m-counting-votes-on-bill-and-i-need-you]; L4 reply/agree/scene-talk/calm/6w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L9 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

**Profile stubborn** (outcome resolved)

**Kelly Riggs:** Have you got a few minutes?

**Kelly Riggs:** "Inclusionary requirement" comes down to a vote or two. Yours is one of them.

You could say:

1. You have my vote. _(the page follows this one)_
2. I've made up my mind. It's no.
3. I'll vote yes, but I'm going to need a favor from you.
4. I need a few days to think it over.
5. I'm leaning your way.

**Kelly Riggs:** Thank you. Really.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.the-vote-on-bill-is-coming-up-name-catches-you-outside-the-chamber]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/request/scene-talk/braced/14w2s [scene-talk.state-request.bill-comes-down-to-a-vote-or-two-yours-is-one-of-them]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L9 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile anxious** (outcome resolved)

**Kelly Riggs:** Have you got a few minutes?

**Kelly Riggs:** I need your vote on "Inclusionary requirement".

You could say:

1. Count me in.
2. I can't vote for "Inclusionary requirement".
3. What's in it for my district?
4. I need a few days to think it over. _(the page follows this one)_
5. You can count on me.

**Kelly Riggs:** You can't stay on the fence forever.

You could say:

1. Okay. For you, I'll do it. _(the page follows this one)_
2. I'm sorry, but I'm a no on "Inclusionary requirement".
3. What's in it for my district?
4. Ask me again after the committee vote.

**Kelly Riggs:** Thank you. Really.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.the-vote-on-bill-is-coming-up-name-catches-you-outside-the-chamber]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/request/scene-talk/hopeful/7w1s [scene-talk.state-request.i-need-your-vote-on-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L8 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.you-can-count-on-me]; L103 follow/press/scene-talk/guarded/7w1s [scene-talk.follow-press.you-can-t-stay-on-the-fence-forever]; L104 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L105 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L106 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L107 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.ask-me-again-after-the-committee-vote]; L108 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile boastful** (outcome resolved)

**Kelly Riggs:** I won't take long.

**Kelly Riggs:** I need your vote on "Inclusionary requirement".

You could say:

1. Count me in. _(the page follows this one)_
2. I can't vote for "Inclusionary requirement".
3. This is a two-way street. I'll need your vote on mine.
4. Let me sleep on it.
5. I'm leaning your way.

**Kelly Riggs:** Thank you. Really.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.the-vote-on-bill-is-coming-up-name-catches-you-outside-the-chamber]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.i-won-t-take-long]; L3 state/request/scene-talk/hopeful/7w1s [scene-talk.state-request.i-need-your-vote-on-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L9 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

## Scene 9: vote-asked (vote-wanted, ends in bill) — proof scene

_Purpose ask-vote. Records: bill:office:US-DE:legislature-upper:2027-02-13:official:term:seat:US-DE:upper:020:0:2026-10-12:35, official:term:seat:US-DE:upper:015:0:2026-10-12, official:term:seat:US-DE:upper:011:0:2026-10-12, office:US-DE:legislature-upper._

> You're going over "Stand your ground" at your desk when Brittany Tucker knocks on the open door.

**Profile warm** (outcome resolved)

**Brittany Tucker:** Can I talk to you?

**Brittany Tucker:** "Stand your ground" comes down to a vote or two. Yours is one of them.

You could say:

1. I'm with you on "Stand your ground". _(the page follows this one)_
2. I can't vote for "Stand your ground".
3. I'll vote yes, but I'm going to need a favor from you.
4. I need a few days to think it over.
5. I'm leaning your way.

**Brittany Tucker:** You won't regret it.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You ★: I'm with you on "Stand your ground".
  - Brittany Tucker: You won't regret it.
  - _Ends resolved_
- You: I can't vote for "Stand your ground".
  - Brittany Tucker: Not even if we fix what bothers you?
  - You: All right. You win. I'm in.
    - Brittany Tucker: Thank you. Really.
    - _Ends resolved_
  - You: I've made up my mind. It's no.
    - Brittany Tucker: I'm asking as a friend.
    - You: Okay. For you, I'll do it.
      - Brittany Tucker: You won't regret it.
      - _Ends resolved_
    - You: I'm sorry, but I'm a no on "Stand your ground".
      - Brittany Tucker: I wouldn't ask if it didn't matter.
      - You: Okay. For you, I'll do it.
        - Brittany Tucker: Thank you. I won't forget it.
        - _Ends resolved_
      - You: This is a two-way street. I'll need your vote on mine.
        - Brittany Tucker: That I can live with.
        - _Ends resolved_
      - You: I need a few days to think it over.
        - Brittany Tucker: You can't stay on the fence forever.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Ask me again after the committee vote.
          - (the tree is cut here)
    - You: I'll vote yes, but I'm going to need a favor from you.
      - Brittany Tucker: Name it. If I can do it, it's yours.
      - _Ends resolved_
    - You: Let me sleep on it.
      - Brittany Tucker: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - Brittany Tucker: I knew I could count on you.
        - _Ends resolved_
      - You: I'm sorry, but I'm a no on "Stand your ground".
        - Brittany Tucker: You know what this means to me.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: What's in it for my district?
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Brittany Tucker: Deal.
        - _Ends resolved_
      - You: Ask me again after the committee vote.
        - Brittany Tucker: I wouldn't ask if it didn't matter.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Stand your ground".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
  - You: What's in it for my district?
    - Brittany Tucker: I'll make sure your district comes first in the next budget.
    - You: You have my vote.
      - Brittany Tucker: Thank you. Really.
      - _Ends resolved_
    - You: I've made up my mind. It's no.
      - Brittany Tucker: I'm asking as a friend.
      - You: Okay. For you, I'll do it.
        - Brittany Tucker: Thank you. Really.
        - _Ends resolved_
      - You: I'm sorry, but I'm a no on "Stand your ground".
        - Brittany Tucker: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Brittany Tucker: All right. We have a deal.
        - _Ends resolved_
      - You: I'm still undecided. Give me until the vote.
        - Brittany Tucker: You can't stay on the fence forever.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Stand your ground".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Ask me again after the committee vote.
          - (the tree is cut here)
    - You: I'll vote yes, but I'm going to need a favor from you.
      - Brittany Tucker: Name it. If I can do it, it's yours.
      - _Ends resolved_
    - You: I need a few days to think it over.
      - Brittany Tucker: You can't stay on the fence forever.
      - You: You've made your point. Count me in.
        - Brittany Tucker: Thank you. I know that wasn't easy.
        - _Ends resolved_
      - You: I've made up my mind. It's no.
        - Brittany Tucker: Without this, I've got nothing to take home.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Stand your ground".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Brittany Tucker: That I can live with.
        - _Ends resolved_
      - You: Ask me again after the committee vote.
        - Brittany Tucker: I'm asking as a friend.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
  - You: Let me sleep on it.
    - Brittany Tucker: You can't stay on the fence forever.
    - You: Okay. For you, I'll do it.
      - Brittany Tucker: I knew I could count on you.
      - _Ends resolved_
    - You: I've made up my mind. It's no.
      - Brittany Tucker: I wouldn't ask if it didn't matter.
      - You: All right. You win. I'm in.
        - Brittany Tucker: I knew I could count on you.
        - _Ends resolved_
      - You: I'm sorry, but I'm a no on "Stand your ground".
        - Brittany Tucker: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Brittany Tucker: That I can live with.
        - _Ends resolved_
      - You: I'm still weighing it.
        - Brittany Tucker: You can't stay on the fence forever.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Stand your ground".
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: Ask me again after the committee vote.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Brittany Tucker: All right. We have a deal.
      - _Ends resolved_
    - You: Ask me again after the committee vote.
      - Brittany Tucker: I wouldn't ask if it didn't matter.
      - You: All right. You win. I'm in.
        - Brittany Tucker: Thank you. Really.
        - _Ends resolved_
      - You: I've made up my mind. It's no.
        - Brittany Tucker: Without this, I've got nothing to take home.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Stand your ground".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Brittany Tucker: That I can live with.
        - _Ends resolved_
      - You: Let me think about it.
        - Brittany Tucker: You can't stay on the fence forever.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: What's in it for my district?
          - (the tree is cut here)
- You: I'll vote yes, but I'm going to need a favor from you.
  - Brittany Tucker: Name it. If I can do it, it's yours.
  - _Ends resolved_
- You: I need a few days to think it over.
  - Brittany Tucker: You can't stay on the fence forever.
  - You: Okay. For you, I'll do it.
    - Brittany Tucker: I knew I could count on you.
    - _Ends resolved_
  - You: I've made up my mind. It's no.
    - Brittany Tucker: You know what this means to me.
    - You: All right. You win. I'm in.
      - Brittany Tucker: I knew I could count on you.
      - _Ends resolved_
    - You: I can't vote for "Stand your ground".
      - Brittany Tucker: Not even if we fix what bothers you?
      - You: Okay. For you, I'll do it.
        - Brittany Tucker: I knew I could count on you.
        - _Ends resolved_
      - You: I'm sorry, but I'm a no on "Stand your ground".
        - Brittany Tucker: Without this, I've got nothing to take home.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: Let me think about it.
        - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Brittany Tucker: All right. We have a deal.
      - _Ends resolved_
    - You: I haven't decided yet.
      - Brittany Tucker: You can't stay on the fence forever.
      - You: All right. You win. I'm in.
        - (the tree is cut here)
      - You: I can't vote for "Stand your ground".
        - (the tree is cut here)
      - You: I'll vote yes, but I'm going to need a favor from you.
        - (the tree is cut here)
      - You: Ask me again after the committee vote.
        - (the tree is cut here)
  - You: This is a two-way street. I'll need your vote on mine.
    - Brittany Tucker: That I can live with.
    - _Ends resolved_
  - You: Ask me again after the committee vote.
    - Brittany Tucker: I could lose my primary over this.
    - You: Okay. For you, I'll do it.
      - Brittany Tucker: I knew I could count on you.
      - _Ends resolved_
    - You: I can't vote for "Stand your ground".
      - Brittany Tucker: Not even if we fix what bothers you?
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: What's in it for my district?
        - (the tree is cut here)
      - You: Let me sleep on it.
        - (the tree is cut here)
    - You: I'll vote yes, but I'm going to need a favor from you.
      - Brittany Tucker: Name it. If I can do it, it's yours.
      - _Ends resolved_
    - You: Let me think about it.
      - Brittany Tucker: You can't stay on the fence forever.
      - You: All right. You win. I'm in.
        - (the tree is cut here)
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
- You: I'm leaning your way.
  - _if not:_
    - Brittany Tucker: Good. I'll put you down as a yes.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.you-re-going-over-bill-at-your-desk-when-name-knocks-on-the-open-door]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/request/scene-talk/braced/15w2s [scene-talk.state-request.bill-comes-down-to-a-vote-or-two-yours-is-one-of-them]; L4 reply/agree/scene-talk/calm/7w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L9 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

**Profile cold** (outcome resolved)

**Brittany Tucker:** You got a minute?

**Brittany Tucker:** "Stand your ground" comes down to a vote or two. Yours is one of them.

You could say:

1. Count me in.
2. I can't vote for "Stand your ground". _(the page follows this one)_
3. I'll vote yes, but I'm going to need a favor from you.
4. Let me think about it.
5. I'm leaning your way.

**Brittany Tucker:** Can't, or won't?

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry, but I'm a no on "Stand your ground". _(the page follows this one)_
3. What's in it for my district?
4. Ask me again after the committee vote.

**Brittany Tucker:** People will remember this at the next election.

You could say:

1. You've made your point. Count me in.
2. I've made up my mind. It's no. _(the page follows this one)_
3. Are you threatening me?
4. I'll vote yes, but I'm going to need a favor from you.

**Brittany Tucker:** It would be a shame if your next bill stalled.

You could say:

1. Fine. I'll do it, but this is the last time. _(the page follows this one)_
2. Are you threatening me?
3. I'll vote yes, but I'm going to need a favor from you.

**Brittany Tucker:** You won't regret it.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.you-re-going-over-bill-at-your-desk-when-name-knocks-on-the-open-door]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/braced/15w2s [scene-talk.state-request.bill-comes-down-to-a-vote-or-two-yours-is-one-of-them]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L10 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.can-t-or-won-t]; L11 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L12 reply/refuse/scene-talk/guarded/10w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L13 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L14 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.ask-me-again-after-the-committee-vote]; L16 follow/threaten/scene-talk/braced/8w1s [scene-talk.follow-threaten.people-will-remember-this-at-the-next-election]; L17 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L18 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L19 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L20 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L22 follow/threaten/scene-talk/guarded/10w1s [scene-talk.follow-threaten.it-would-be-a-shame-if-your-next-bill-stalled]; L23 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L24 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L25 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L26 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

**Profile stubborn** (outcome resolved)

**Brittany Tucker:** Got a second?

**Brittany Tucker:** I'm counting votes on "Stand your ground", and I need you.

You could say:

1. I'm with you on "Stand your ground".
2. I've made up my mind. It's no. _(the page follows this one)_
3. I'll vote yes, but I'm going to need a favor from you.
4. Let me sleep on it.
5. You can count on me.

**Brittany Tucker:** I need a yes or a no.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't vote for "Stand your ground". _(the page follows this one)_
3. What's in it for my district?
4. Ask me again after the committee vote.

**Brittany Tucker:** Can't, or won't?

You could say:

1. You've made your point. Count me in.
2. I'm sorry, but I'm a no on "Stand your ground". _(the page follows this one)_
3. I'll vote yes, but I'm going to need a favor from you.
4. Ask me again after the committee vote.

**Brittany Tucker:** What would it take?

You could say:

1. All right. You win. I'm in.
2. This is a two-way street. I'll need your vote on mine. _(the page follows this one)_
3. Ask me again after the committee vote.

**Brittany Tucker:** Deal.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.you-re-going-over-bill-at-your-desk-when-name-knocks-on-the-open-door]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/request/scene-talk/hopeful/11w1s [scene-talk.state-request.i-m-counting-votes-on-bill-and-i-need-you]; L4 reply/agree/scene-talk/calm/7w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L8 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.you-can-count-on-me]; L10 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-a-yes-or-a-no]; L11 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L12 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L13 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L14 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.ask-me-again-after-the-committee-vote]; L16 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.can-t-or-won-t]; L17 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L18 reply/refuse/scene-talk/guarded/10w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L19 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L20 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.ask-me-again-after-the-committee-vote]; L22 follow/press/scene-talk/calm/4w1s [scene-talk.follow-press.what-would-it-take]; L23 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L24 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L25 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.ask-me-again-after-the-committee-vote]; L27 follow/accept/scene-talk/calm/1w1s [scene-talk.follow-accept.deal]</sub>

**Profile anxious** (outcome resolved)

**Brittany Tucker:** You got a minute?

**Brittany Tucker:** "Stand your ground" comes down to a vote or two. Yours is one of them.

You could say:

1. Count me in.
2. I've made up my mind. It's no.
3. What's in it for my district?
4. I haven't decided yet. _(the page follows this one)_
5. You can count on me.

**Brittany Tucker:** You can't stay on the fence forever.

You could say:

1. Okay. For you, I'll do it.
2. I can't vote for "Stand your ground".
3. What's in it for my district?
4. Ask me again after the committee vote. _(the page follows this one)_

**Brittany Tucker:** Please. Think about the people this helps.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't vote for "Stand your ground".
3. I'll vote yes, but I'm going to need a favor from you.
4. Let me think about it. _(the page follows this one)_

**Brittany Tucker:** You can't stay on the fence forever.

You could say:

1. Fine. I'll do it, but this is the last time. _(the page follows this one)_
2. I can't vote for "Stand your ground".
3. What's in it for my district?

**Brittany Tucker:** I knew I could count on you.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.you-re-going-over-bill-at-your-desk-when-name-knocks-on-the-open-door]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/braced/15w2s [scene-talk.state-request.bill-comes-down-to-a-vote-or-two-yours-is-one-of-them]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.you-can-count-on-me]; L132 follow/press/scene-talk/guarded/7w1s [scene-talk.follow-press.you-can-t-stay-on-the-fence-forever]; L133 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L134 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L135 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L136 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.ask-me-again-after-the-committee-vote]; L172 follow/plea/scene-talk/tender/7w2s [scene-talk.follow-plea.please-think-about-the-people-this-helps]; L173 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L174 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L175 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L176 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L184 follow/press/scene-talk/guarded/7w1s [scene-talk.follow-press.you-can-t-stay-on-the-fence-forever]; L185 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L186 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L187 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L188 follow/thank/scene-talk/glad/7w1s [scene-talk.follow-thank.i-knew-i-could-count-on-you]</sub>

**Profile boastful** (outcome resolved)

**Brittany Tucker:** You got a minute?

**Brittany Tucker:** "Stand your ground" comes down to a vote or two. Yours is one of them.

You could say:

1. I'm with you on "Stand your ground".
2. I've made up my mind. It's no.
3. What's in it for my district? _(the page follows this one)_
4. Let me think about it.
5. I'm leaning your way.

**Brittany Tucker:** I'll make sure your district comes first in the next budget.

You could say:

1. Count me in.
2. I've made up my mind. It's no.
3. This is a two-way street. I'll need your vote on mine. _(the page follows this one)_
4. I'm still undecided. Give me until the vote.

**Brittany Tucker:** That I can live with.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.you-re-going-over-bill-at-your-desk-when-name-knocks-on-the-open-door]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/braced/15w2s [scene-talk.state-request.bill-comes-down-to-a-vote-or-two-yours-is-one-of-them]; L4 reply/agree/scene-talk/calm/7w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L55 follow/bargain/scene-talk/calm/11w1s [scene-talk.follow-bargain.i-ll-make-sure-your-district-comes-first-in-the-next-budget]; L56 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L57 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L58 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L59 reply/stall/scene-talk/guarded/8w2s [scene-talk.reply-stall.i-m-still-undecided-give-me-until-the-vote]; L62 follow/accept/scene-talk/calm/5w1s [scene-talk.follow-accept.that-i-can-live-with]</sub>

## Scene 10: vote-confirmed (vote-wanted, ends in bill) — proof scene

_Purpose confirm-vote. Records: bill:office:gus2025:101811:board:2027-04-10:person_bc041df6bd9d1a47:59, person_bc041df6bd9d1a47, person_d3c12275ee46b085, office:gus2025:101811:board, promise:past:seat:gus2025:101811:board:6:2022-11-08:us-policy-positions:housing-land-use.inclusionary-requirement._

> Alicia Keller stops by your office. You told Alicia Keller you'd vote yes on "Inclusionary requirement".

**Profile warm** (outcome resolved)

**Alicia Keller:** I won't take long.

**Alicia Keller:** You're still a yes on "Inclusionary requirement"?

You could say:

1. You have my vote. _(the page follows this one)_
2. I gave you my word, and I'm going back on it. I'm sorry.
3. This is a two-way street. I'll need your vote on mine.
4. I'm still weighing it.
5. I'm still with you.

**Alicia Keller:** Good. I'll hold you to that.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, refused, resolved, refused, resolved, refused, refused, resolved, resolved, refused, refused, resolved, refused, refused, resolved, resolved, resolved, refused, refused, resolved, refused, open, resolved, open, open, resolved; ★ is the branch this profile's traits lean toward):

- You ★: You have my vote.
  - Alicia Keller: Good. I'll hold you to that.
  - _Ends resolved_
- You: I gave you my word, and I'm going back on it. I'm sorry.
  - Alicia Keller: You told me yes. People are counting on that.
  - You: You've made your point. Count me in.
    - Alicia Keller: Thank you. I know that wasn't easy.
    - _Ends resolved_
  - You: I've made up my mind. It's no.
    - Alicia Keller: You gave me your word.
    - You: You've made your point. Count me in.
      - Alicia Keller: Thank you. I know that wasn't easy.
      - _Ends resolved_
    - You: I can't vote for "Inclusionary requirement".
      - Alicia Keller: Please. Think about the people this helps.
      - You: All right. You win. I'm in.
        - Alicia Keller: Thank you. I won't forget it.
        - _Ends resolved_
      - You: I'm sorry, but I'm a no on "Inclusionary requirement".
        - Alicia Keller: What changed?
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Ask me again after the committee vote.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Alicia Keller: I can't promise that. Mine's a different fight.
        - _Ends refused: Alicia Keller: I won't forget this._
      - You: Let me think about it.
        - Alicia Keller: You can't stay on the fence forever.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Ask me again after the committee vote.
          - (the tree is cut here)
    - You: What's in it for my district?
      - Alicia Keller: I'll make sure your district comes first in the next budget.
      - You: I'm with you on "Inclusionary requirement".
        - Alicia Keller: Thank you. Really.
        - _Ends resolved_
      - You: I'm sorry, but I'm a no on "Inclusionary requirement".
        - Alicia Keller: What changed?
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't vote for "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Ask me again after the committee vote.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Alicia Keller: I can't promise that. Mine's a different fight.
        - _Ends refused: Alicia Keller: You'll need friends after this vote. I won't be one._
      - You: Let me think about it.
        - Alicia Keller: You can't stay on the fence forever.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Ask me again after the committee vote.
          - (the tree is cut here)
    - You: Ask me again after the committee vote.
      - Alicia Keller: You know what this means to me.
      - You: Okay. For you, I'll do it.
        - Alicia Keller: I knew I could count on you.
        - _Ends resolved_
      - You: I'm sorry, but I'm a no on "Inclusionary requirement".
        - Alicia Keller: What changed?
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Inclusionary requirement".
          - (the tree is cut here)
        - You: What's in it for my district?
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Alicia Keller: I can't promise that. Mine's a different fight.
        - _Ends refused: Alicia Keller: I hope you know what this costs you._
      - You: Let me sleep on it.
        - Alicia Keller: You can't stay on the fence forever.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I can't vote for "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
  - You: This is a two-way street. I'll need your vote on mine.
    - Alicia Keller: I can't promise that. Mine's a different fight.
    - _Ends refused: Alicia Keller: I hope you know what this costs you._
  - You: Ask me again after the committee vote.
    - Alicia Keller: I wouldn't ask if it didn't matter.
    - You: All right. You win. I'm in.
      - Alicia Keller: Thank you. Really.
      - _Ends resolved_
    - You: I've made up my mind. It's no.
      - Alicia Keller: You gave me your word.
      - You: Okay. For you, I'll do it.
        - Alicia Keller: I knew I could count on you.
        - _Ends resolved_
      - You: I can't vote for "Inclusionary requirement".
        - Alicia Keller: Please. Think about the people this helps.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Alicia Keller: I can't promise that. Mine's a different fight.
        - _Ends refused: Alicia Keller: I won't forget this._
    - You: This is a two-way street. I'll need your vote on mine.
      - Alicia Keller: I can't promise that. Mine's a different fight.
      - _Ends refused: Alicia Keller: I hope you know what this costs you._
    - You: Let me think about it.
      - Alicia Keller: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - Alicia Keller: Thank you. Really.
        - _Ends resolved_
      - You: I'm sorry, but I'm a no on "Inclusionary requirement".
        - Alicia Keller: What changed?
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: What's in it for my district?
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Alicia Keller: I can't promise that. Mine's a different fight.
        - _Ends refused: Alicia Keller: I won't forget this._
- You: This is a two-way street. I'll need your vote on mine.
  - Alicia Keller: I can't promise that. Mine's a different fight.
  - _Ends refused: Alicia Keller: You'll need friends after this vote. I won't be one._
- You: I'm still weighing it.
  - Alicia Keller: You can't stay on the fence forever.
  - You: Okay. For you, I'll do it.
    - Alicia Keller: You won't regret it.
    - _Ends resolved_
  - You: I'm sorry, but I'm a no on "Inclusionary requirement".
    - Alicia Keller: What changed?
    - You: Okay. For you, I'll do it.
      - Alicia Keller: You won't regret it.
      - _Ends resolved_
    - You: I've made up my mind. It's no.
      - Alicia Keller: You gave me your word.
      - You: You've made your point. Count me in.
        - Alicia Keller: Thank you. I know that wasn't easy.
        - _Ends resolved_
      - You: I can't vote for "Inclusionary requirement".
        - Alicia Keller: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: What's in it for my district?
        - Alicia Keller: I'll make sure your district comes first in the next budget.
        - You: You have my vote.
          - (the tree is cut here)
        - You: I can't vote for "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: Ask me again after the committee vote.
        - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Alicia Keller: I can't promise that. Mine's a different fight.
      - _Ends refused: Alicia Keller: I won't forget this._
    - You: Ask me again after the committee vote.
      - Alicia Keller: I wouldn't ask if it didn't matter.
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: I'll vote yes, but I'm going to need a favor from you.
        - (the tree is cut here)
      - You: I haven't decided yet.
        - (the tree is cut here)
  - You: This is a two-way street. I'll need your vote on mine.
    - Alicia Keller: I can't promise that. Mine's a different fight.
    - _Ends refused: Alicia Keller: You'll need friends after this vote. I won't be one._
  - You: Ask me again after the committee vote.
    - Alicia Keller: I'm asking as a friend.
    - You: All right. You win. I'm in.
      - Alicia Keller: You won't regret it.
      - _Ends resolved_
    - You: I can't vote for "Inclusionary requirement".
      - Alicia Keller: Without this, I've got nothing to take home.
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: I need a few days to think it over.
        - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Alicia Keller: I can't promise that. Mine's a different fight.
      - _Ends refused: Alicia Keller: I hope you know what this costs you._
    - You: Let me think about it.
      - Alicia Keller: You can't stay on the fence forever.
      - You: All right. You win. I'm in.
        - (the tree is cut here)
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
- You: I'm still with you.
  - _if Alicia Keller knows:_
    - Alicia Keller: Nicholas Melendez says you're voting no.
    - You: All right. Here's the truth.
      - Alicia Keller: Thank you for telling me straight.
      - _Ends open_
    - You: People say a lot of things.
      - Alicia Keller: Take your time, but I need an answer.
      - You: You've made your point. Count me in.
        - Alicia Keller: Thank you. I know that wasn't easy.
        - _Ends resolved_
      - You: I've made up my mind. It's no.
        - Alicia Keller: You gave me your word.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Ask me again after the committee vote.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Alicia Keller: I can't promise that. Mine's a different fight.
        - _Ends open: Alicia Keller: You'll need friends after this vote. I won't be one._
      - You: Ask me again after the committee vote.
        - Alicia Keller: Yes or no?
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
    - You: Then Nicholas Melendez has it wrong.
      - _Ends open: Alicia Keller: I'll call you before the vote._
  - _if not:_
    - Alicia Keller: That's a relief.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.name-stops-by-your-office-you-told-name-you-d-vote-yes-on-bill]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.i-won-t-take-long]; L3 state/ask/scene-talk/calm/7w1s [scene-talk.state-ask.you-re-still-a-yes-on-bill]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/withdraw/scene-talk/contrite/13w2s [scene-talk.reply-withdraw.i-gave-you-my-word-and-i-m-going-back-on-it-i-m-sorry]; L6 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L9 follow/thank/scene-talk/guarded/6w2s [scene-talk.follow-thank.good-i-ll-hold-you-to-that]</sub>

**Profile cold** (outcome resolved)

**Alicia Keller:** Do you have a minute?

**Alicia Keller:** You're still a yes on "Inclusionary requirement"?

You could say:

1. You have my vote. _(the page follows this one)_
2. I gave you my word, and I'm going back on it. I'm sorry.
3. What's in it for my district?
4. Let me sleep on it.
5. I'm still with you.

**Alicia Keller:** Good. I'll hold you to that.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.name-stops-by-your-office-you-told-name-you-d-vote-yes-on-bill]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/ask/scene-talk/calm/7w1s [scene-talk.state-ask.you-re-still-a-yes-on-bill]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/withdraw/scene-talk/contrite/13w2s [scene-talk.reply-withdraw.i-gave-you-my-word-and-i-m-going-back-on-it-i-m-sorry]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L9 follow/thank/scene-talk/guarded/6w2s [scene-talk.follow-thank.good-i-ll-hold-you-to-that]</sub>

**Profile stubborn** (outcome resolved)

**Alicia Keller:** Do you have a minute?

**Alicia Keller:** I told the others I had your vote on "Inclusionary requirement". Do I?

You could say:

1. Count me in. _(the page follows this one)_
2. I gave you my word, and I'm going back on it. I'm sorry.
3. I'll vote yes, but I'm going to need a favor from you.
4. I need a few days to think it over.
5. I'm still with you.

**Alicia Keller:** You won't regret it.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.name-stops-by-your-office-you-told-name-you-d-vote-yes-on-bill]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/ask/scene-talk/anxious/13w2s [scene-talk.state-ask.i-told-the-others-i-had-your-vote-on-bill-do-i]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/withdraw/scene-talk/contrite/13w2s [scene-talk.reply-withdraw.i-gave-you-my-word-and-i-m-going-back-on-it-i-m-sorry]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L9 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

**Profile anxious** (outcome resolved)

**Alicia Keller:** Got a second?

**Alicia Keller:** We're still good on "Inclusionary requirement", right?

You could say:

1. Count me in.
2. I'm really worried about this vote. I can't do it.
3. This is a two-way street. I'll need your vote on mine.
4. I'm still undecided. Give me until the vote. _(the page follows this one)_
5. I'm still with you.

**Alicia Keller:** You can't stay on the fence forever.

You could say:

1. Okay. For you, I'll do it. _(the page follows this one)_
2. I can't vote for "Inclusionary requirement".
3. What's in it for my district?
4. Ask me again after the committee vote.

**Alicia Keller:** You won't regret it.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.name-stops-by-your-office-you-told-name-you-d-vote-yes-on-bill]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/ask/scene-talk/calm/7w1s [scene-talk.state-ask.we-re-still-good-on-bill-right]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L7 reply/stall/scene-talk/guarded/8w2s [scene-talk.reply-stall.i-m-still-undecided-give-me-until-the-vote]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L111 follow/press/scene-talk/guarded/7w1s [scene-talk.follow-press.you-can-t-stay-on-the-fence-forever]; L112 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L113 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L114 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L115 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.ask-me-again-after-the-committee-vote]; L116 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

**Profile boastful** (outcome resolved)

**Alicia Keller:** I won't take long.

**Alicia Keller:** You're still a yes on "Inclusionary requirement"?

You could say:

1. Fine. You have it. _(the page follows this one)_
2. I gave you my word, and I'm going back on it. I'm sorry.
3. This is a two-way street. I'll need your vote on mine.
4. I haven't decided yet.
5. I'm still with you.

**Alicia Keller:** You won't regret it.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.name-stops-by-your-office-you-told-name-you-d-vote-yes-on-bill]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.i-won-t-take-long]; L3 state/ask/scene-talk/calm/7w1s [scene-talk.state-ask.you-re-still-a-yes-on-bill]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/withdraw/scene-talk/contrite/13w2s [scene-talk.reply-withdraw.i-gave-you-my-word-and-i-m-going-back-on-it-i-m-sorry]; L6 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L9 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

## Scene 11: vote-confirmed (vote-wanted, ends in bill) — proof scene

_Purpose confirm-vote. Records: bill:office:gus2025:101811:board:2026-10-27:person_a52334a2a50177be:2, person_9e002a561a4b29bc, person_bf349ec8efe6104f, office:gus2025:101811:board, promise:person_bf349ec8efe6104f:2026-11-02:interview:outlet:cable:0:national:us-policy-positions:housing-land-use.allow-multifamily-in-single-family-zones._

> You promised Kelly Riggs your vote on "Allow multifamily in single family zones". Kelly Riggs is at your door to make sure.

**Profile warm** (outcome resolved)

**Kelly Riggs:** Got a second?

**Kelly Riggs:** I told the others I had your vote on "Allow multifamily in single family zones". Do I?

You could say:

1. I'm with you on "Allow multifamily in single family zones". _(the page follows this one)_
2. I'm really worried about this vote. I can't do it.
3. What's in it for my district?
4. Let me think about it.
5. Nothing's changed. You have my vote.

**Kelly Riggs:** You won't regret it.

**The whole exchange** (60 nodes; endings: resolved, resolved, refused, resolved, resolved, resolved, refused, resolved, resolved, refused, resolved, resolved, resolved, refused, resolved, resolved, refused, resolved, resolved, resolved, refused, resolved, resolved, refused, resolved, refused, resolved, refused, resolved, resolved, refused, resolved, open, resolved, refused, open, open, resolved; ★ is the branch this profile's traits lean toward):

- You ★: I'm with you on "Allow multifamily in single family zones".
  - Kelly Riggs: You won't regret it.
  - _Ends resolved_
- You: I'm really worried about this vote. I can't do it.
  - Kelly Riggs: You told me yes. People are counting on that.
  - You: Okay. For you, I'll do it.
    - Kelly Riggs: You won't regret it.
    - _Ends resolved_
  - You: I've made up my mind. It's no.
    - Kelly Riggs: Then I wish you'd told me sooner.
    - _Ends refused_
  - You: This is a two-way street. I'll need your vote on mine.
    - Kelly Riggs: Done. You'll have it.
    - _Ends resolved_
  - You: Ask me again after the committee vote.
    - Kelly Riggs: Without this, I've got nothing to take home.
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: You won't regret it.
      - _Ends resolved_
    - You: I can't vote for "Allow multifamily in single family zones".
      - Kelly Riggs: Please. Think about the people this helps.
      - You: All right. You win. I'm in.
        - Kelly Riggs: I knew I could count on you.
        - _Ends resolved_
      - You: I've made up my mind. It's no.
        - Kelly Riggs: Then I wish you'd told me sooner.
        - _Ends refused_
      - You: What's in it for my district?
        - Kelly Riggs: I'll make sure your district comes first in the next budget.
        - You: You have my vote.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: Let me think about it.
        - Kelly Riggs: You can't stay on the fence forever.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Kelly Riggs: Done. You'll have it.
      - _Ends resolved_
    - You: I haven't decided yet.
      - Kelly Riggs: You can't stay on the fence forever.
      - You: You've made your point. Count me in.
        - Kelly Riggs: Thank you. I know that wasn't easy.
        - _Ends resolved_
      - You: I've made up my mind. It's no.
        - Kelly Riggs: Then I wish you'd told me sooner.
        - _Ends refused_
      - You: This is a two-way street. I'll need your vote on mine.
        - Kelly Riggs: Done. You'll have it.
        - _Ends resolved_
- You: What's in it for my district?
  - Kelly Riggs: I'll make sure your district comes first in the next budget.
  - You: You have my vote.
    - Kelly Riggs: You won't regret it.
    - _Ends resolved_
  - You: I can't vote for "Allow multifamily in single family zones".
    - Kelly Riggs: You know what this means to me.
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: Thank you. Really.
      - _Ends resolved_
    - You: I've made up my mind. It's no.
      - Kelly Riggs: Then I wish you'd told me sooner.
      - _Ends refused_
    - You: This is a two-way street. I'll need your vote on mine.
      - Kelly Riggs: Done. You'll have it.
      - _Ends resolved_
    - You: Let me sleep on it.
      - Kelly Riggs: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: Thank you. Really.
        - _Ends resolved_
      - You: I've made up my mind. It's no.
        - Kelly Riggs: Then I wish you'd told me sooner.
        - _Ends refused_
      - You: This is a two-way street. I'll need your vote on mine.
        - Kelly Riggs: Done. You'll have it.
        - _Ends resolved_
      - You: Ask me again after the committee vote.
        - Kelly Riggs: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
  - You: This is a two-way street. I'll need your vote on mine.
    - Kelly Riggs: Done. You'll have it.
    - _Ends resolved_
  - You: Let me think about it.
    - Kelly Riggs: You can't stay on the fence forever.
    - You: All right. You win. I'm in.
      - Kelly Riggs: Thank you. Really.
      - _Ends resolved_
    - You: I've made up my mind. It's no.
      - Kelly Riggs: Then I wish you'd told me sooner.
      - _Ends refused_
    - You: This is a two-way street. I'll need your vote on mine.
      - Kelly Riggs: Done. You'll have it.
      - _Ends resolved_
    - You: Ask me again after the committee vote.
      - Kelly Riggs: You know what this means to me.
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: I knew I could count on you.
        - _Ends resolved_
      - You: I've made up my mind. It's no.
        - Kelly Riggs: Then I wish you'd told me sooner.
        - _Ends refused_
      - You: I'll vote yes, but I'm going to need a favor from you.
        - (the tree is cut here)
      - You: I haven't decided yet.
        - (the tree is cut here)
- You: Let me think about it.
  - Kelly Riggs: You can't stay on the fence forever.
  - You: You've made your point. Count me in.
    - Kelly Riggs: Thank you. I know that wasn't easy.
    - _Ends resolved_
  - You: I'm sorry, but I'm a no on "Allow multifamily in single family zones".
    - Kelly Riggs: I'm sorry, too. I was counting on you.
    - _Ends refused_
  - You: What's in it for my district?
    - Kelly Riggs: I'll make sure your district comes first in the next budget.
    - You: I'm with you on "Allow multifamily in single family zones".
      - Kelly Riggs: I knew I could count on you.
      - _Ends resolved_
    - You: I'm sorry, but I'm a no on "Allow multifamily in single family zones".
      - Kelly Riggs: I'm sorry, too. I was counting on you.
      - _Ends refused_
    - You: This is a two-way street. I'll need your vote on mine.
      - Kelly Riggs: Done. You'll have it.
      - _Ends resolved_
    - You: I haven't decided yet.
      - Kelly Riggs: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I can't vote for "Allow multifamily in single family zones".
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: Ask me again after the committee vote.
        - (the tree is cut here)
  - You: Ask me again after the committee vote.
    - Kelly Riggs: I wouldn't ask if it didn't matter.
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: You won't regret it.
      - _Ends resolved_
    - You: I'm sorry, but I'm a no on "Allow multifamily in single family zones".
      - Kelly Riggs: I'm sorry, too. I was counting on you.
      - _Ends refused_
    - You: This is a two-way street. I'll need your vote on mine.
      - Kelly Riggs: Done. You'll have it.
      - _Ends resolved_
    - You: I haven't decided yet.
      - Kelly Riggs: You can't stay on the fence forever.
      - You: All right. You win. I'm in.
        - (the tree is cut here)
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
- You: Nothing's changed. You have my vote.
  - _if Kelly Riggs knows:_
    - Kelly Riggs: Wesley Alexander says you're voting no.
    - You: All right. Here's the truth.
      - Kelly Riggs: Thank you for telling me straight.
      - _Ends open_
    - You: People say a lot of things.
      - Kelly Riggs: What would it take?
      - You: Fine. I'll do it, but this is the last time.
        - Kelly Riggs: Understood. I won't ask again.
        - _Ends resolved_
      - You: I'm sorry, but I'm a no on "Allow multifamily in single family zones".
        - Kelly Riggs: I'm sorry, too. I was counting on you.
        - _Ends refused_
      - You: This is a two-way street. I'll need your vote on mine.
        - Kelly Riggs: Done. You'll have it.
        - _Ends open_
      - You: Ask me again after the committee vote.
        - Kelly Riggs: I need a yes or a no.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
    - You: Then Wesley Alexander has it wrong.
      - _Ends open: Kelly Riggs: You'll need friends after this vote. I won't be one._
  - _if not:_
    - Kelly Riggs: That's a relief.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/anxious/22w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/ask/scene-talk/anxious/17w2s [scene-talk.state-ask.i-told-the-others-i-had-your-vote-on-bill-do-i]; L4 reply/agree/scene-talk/calm/10w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/6w2s [scene-talk.reply-lie.nothing-s-changed-you-have-my-vote]; L9 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

**Profile cold** (outcome resolved)

**Kelly Riggs:** Got a second?

**Kelly Riggs:** I told the others I had your vote on "Allow multifamily in single family zones". Do I?

You could say:

1. Fine. You have it. _(the page follows this one)_
2. I'm really worried about this vote. I can't do it.
3. I'll vote yes, but I'm going to need a favor from you.
4. I'm still undecided. Give me until the vote.
5. Nothing's changed. You have my vote.

**Kelly Riggs:** Good. I'll hold you to that.

<sub>L1 narrate/narrate/scene-talk/anxious/22w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/ask/scene-talk/anxious/17w2s [scene-talk.state-ask.i-told-the-others-i-had-your-vote-on-bill-do-i]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/guarded/8w2s [scene-talk.reply-stall.i-m-still-undecided-give-me-until-the-vote]; L8 reply/lie/scene-talk/calm/6w2s [scene-talk.reply-lie.nothing-s-changed-you-have-my-vote]; L9 follow/thank/scene-talk/guarded/6w2s [scene-talk.follow-thank.good-i-ll-hold-you-to-that]</sub>

**Profile stubborn** (outcome resolved)

**Kelly Riggs:** Got a second?

**Kelly Riggs:** We're still good on "Allow multifamily in single family zones", right?

You could say:

1. Fine. You have it. _(the page follows this one)_
2. I'm really worried about this vote. I can't do it.
3. What's in it for my district?
4. I haven't decided yet.
5. I'm still with you.

**Kelly Riggs:** I knew I could count on you.

<sub>L1 narrate/narrate/scene-talk/anxious/22w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/ask/scene-talk/calm/11w1s [scene-talk.state-ask.we-re-still-good-on-bill-right]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L9 follow/thank/scene-talk/glad/7w1s [scene-talk.follow-thank.i-knew-i-could-count-on-you]</sub>

**Profile anxious** (outcome resolved)

**Kelly Riggs:** You got a minute?

**Kelly Riggs:** I told the others I had your vote on "Allow multifamily in single family zones". Do I?

You could say:

1. Fine. You have it.
2. I'm really worried about this vote. I can't do it.
3. I'll vote yes, but I'm going to need a favor from you.
4. Let me think about it. _(the page follows this one)_
5. Nothing's changed. You have my vote.

**Kelly Riggs:** You can't stay on the fence forever.

You could say:

1. You've made your point. Count me in. _(the page follows this one)_
2. I'm sorry, but I'm a no on "Allow multifamily in single family zones".
3. I'll vote yes, but I'm going to need a favor from you.
4. Ask me again after the committee vote.

**Kelly Riggs:** Thank you. I know that wasn't easy.

<sub>L1 narrate/narrate/scene-talk/anxious/22w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/ask/scene-talk/anxious/17w2s [scene-talk.state-ask.i-told-the-others-i-had-your-vote-on-bill-do-i]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/6w2s [scene-talk.reply-lie.nothing-s-changed-you-have-my-vote]; L103 follow/press/scene-talk/guarded/7w1s [scene-talk.follow-press.you-can-t-stay-on-the-fence-forever]; L104 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L105 reply/refuse/scene-talk/guarded/13w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L106 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L107 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.ask-me-again-after-the-committee-vote]; L108 follow/thank/scene-talk/glad/7w2s [scene-talk.follow-thank.thank-you-i-know-that-wasn-t-easy]</sub>

**Profile boastful** (outcome resolved)

**Kelly Riggs:** Do you have a minute?

**Kelly Riggs:** I told the others I had your vote on "Allow multifamily in single family zones". Do I?

You could say:

1. Fine. You have it. _(the page follows this one)_
2. I gave you my word, and I'm going back on it. I'm sorry.
3. This is a two-way street. I'll need your vote on mine.
4. Let me think about it.
5. Nothing's changed. You have my vote.

**Kelly Riggs:** I knew I could count on you.

<sub>L1 narrate/narrate/scene-talk/anxious/22w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/ask/scene-talk/anxious/17w2s [scene-talk.state-ask.i-told-the-others-i-had-your-vote-on-bill-do-i]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/withdraw/scene-talk/contrite/13w2s [scene-talk.reply-withdraw.i-gave-you-my-word-and-i-m-going-back-on-it-i-m-sorry]; L6 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/6w2s [scene-talk.reply-lie.nothing-s-changed-you-have-my-vote]; L9 follow/thank/scene-talk/glad/7w1s [scene-talk.follow-thank.i-knew-i-could-count-on-you]</sub>

## Scene 12: vote-confirmed (vote-wanted, ends in bill) — proof scene

_Purpose confirm-vote. Records: bill:office:gus2025:101811:board:2026-10-27:person_a52334a2a50177be:3, person_bf349ec8efe6104f, person_a52334a2a50177be, office:gus2025:101811:board, promise:person_a52334a2a50177be:2026-10-26:interview:outlet:cable:0:national:us-policy-positions:justice-public-safety.civilian-oversight-of-police._

> You promised Megan Nixon your vote on "Civilian oversight of police". Megan Nixon is at your door to make sure.

**Profile warm** (outcome resolved)

**Megan Nixon:** You got a minute?

**Megan Nixon:** We're still good on "Civilian oversight of police", right?

You could say:

1. Count me in.
2. I've thought it over. I can't vote for "Civilian oversight of police" after all.
3. What's in it for my district? _(the page follows this one)_
4. Let me think about it.
5. I'm still with you.

**Megan Nixon:** I'll make sure your district comes first in the next budget.

You could say:

1. Count me in.
2. I'm sorry, but I'm a no on "Civilian oversight of police".
3. This is a two-way street. I'll need your vote on mine. _(the page follows this one)_
4. I'm still weighing it.

**Megan Nixon:** Done. You'll have it.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, open, open, resolved; ★ is the branch this profile's traits lean toward):

- You: Count me in.
  - Megan Nixon: I knew I could count on you.
  - _Ends resolved_
- You: I've thought it over. I can't vote for "Civilian oversight of police" after all.
  - Megan Nixon: You told me yes. People are counting on that.
  - You: You've made your point. Count me in.
    - Megan Nixon: Thank you. I know that wasn't easy.
    - _Ends resolved_
  - You: I've made up my mind. It's no.
    - Megan Nixon: You gave me your word.
    - You: You've made your point. Count me in.
      - Megan Nixon: Thank you. I know that wasn't easy.
      - _Ends resolved_
    - You: I'm sorry, but I'm a no on "Civilian oversight of police".
      - Megan Nixon: What changed?
      - You: Okay. For you, I'll do it.
        - Megan Nixon: Good. I'll hold you to that.
        - _Ends resolved_
      - You: I can't vote for "Civilian oversight of police".
        - Megan Nixon: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
      - You: What's in it for my district?
        - Megan Nixon: I'll make sure your district comes first in the next budget.
        - You: Fine. You have it.
          - (the tree is cut here)
        - You: I can't vote for "Civilian oversight of police".
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: Ask me again after the committee vote.
        - Megan Nixon: I'm asking as a friend.
        - You: Fine. I'll do it, but this is the last time.
          - (the tree is cut here)
        - You: I can't vote for "Civilian oversight of police".
          - (the tree is cut here)
        - You: What's in it for my district?
          - (the tree is cut here)
        - You: I'm still undecided. Give me until the vote.
          - (the tree is cut here)
    - You: I'll vote yes, but I'm going to need a favor from you.
      - Megan Nixon: All right. We have a deal.
      - _Ends resolved_
    - You: Ask me again after the committee vote.
      - Megan Nixon: Without this, I've got nothing to take home.
      - You: All right. You win. I'm in.
        - Megan Nixon: You won't regret it.
        - _Ends resolved_
      - You: I'm sorry, but I'm a no on "Civilian oversight of police".
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: Let me sleep on it.
        - (the tree is cut here)
  - You: What's in it for my district?
    - Megan Nixon: I'll make sure your district comes first in the next budget.
    - You: You have my vote.
      - Megan Nixon: Thank you. I won't forget it.
      - _Ends resolved_
    - You: I've made up my mind. It's no.
      - Megan Nixon: You gave me your word.
      - You: All right. You win. I'm in.
        - (the tree is cut here)
      - You: I can't vote for "Civilian oversight of police".
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: Ask me again after the committee vote.
        - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Megan Nixon: Done. You'll have it.
      - _Ends resolved_
    - You: I need a few days to think it over.
      - Megan Nixon: You can't stay on the fence forever.
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: I can't vote for "Civilian oversight of police".
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: Ask me again after the committee vote.
        - (the tree is cut here)
  - You: Ask me again after the committee vote.
    - Megan Nixon: You know what this means to me.
    - You: All right. You win. I'm in.
      - Megan Nixon: I knew I could count on you.
      - _Ends resolved_
    - You: I can't vote for "Civilian oversight of police".
      - Megan Nixon: Without this, I've got nothing to take home.
      - You: Fine. I'll do it, but this is the last time.
        - (the tree is cut here)
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: I haven't decided yet.
        - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Megan Nixon: Done. You'll have it.
      - _Ends resolved_
    - You: Let me sleep on it.
      - Megan Nixon: You can't stay on the fence forever.
      - You: All right. You win. I'm in.
        - (the tree is cut here)
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
- You ★: What's in it for my district?
  - Megan Nixon: I'll make sure your district comes first in the next budget.
  - You: Count me in.
    - Megan Nixon: Thank you. Really.
    - _Ends resolved_
  - You: I'm sorry, but I'm a no on "Civilian oversight of police".
    - Megan Nixon: What changed?
    - You: Okay. For you, I'll do it.
      - Megan Nixon: I knew I could count on you.
      - _Ends resolved_
    - You: I've made up my mind. It's no.
      - Megan Nixon: You gave me your word.
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: I can't vote for "Civilian oversight of police".
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: Ask me again after the committee vote.
        - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Megan Nixon: Done. You'll have it.
      - _Ends resolved_
    - You: Ask me again after the committee vote.
      - Megan Nixon: I'm asking as a friend.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
  - You ★: This is a two-way street. I'll need your vote on mine.
    - Megan Nixon: Done. You'll have it.
    - _Ends resolved_
  - You: I'm still weighing it.
    - Megan Nixon: You can't stay on the fence forever.
    - You: All right. You win. I'm in.
      - Megan Nixon: Thank you. Really.
      - _Ends resolved_
    - You: I've made up my mind. It's no.
      - Megan Nixon: You gave me your word.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I can't vote for "Civilian oversight of police".
        - (the tree is cut here)
      - You: I'll vote yes, but I'm going to need a favor from you.
        - (the tree is cut here)
      - You: Ask me again after the committee vote.
        - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Megan Nixon: Done. You'll have it.
      - _Ends resolved_
    - You: Ask me again after the committee vote.
      - Megan Nixon: Please. Think about the people this helps.
      - You: Fine. I'll do it, but this is the last time.
        - (the tree is cut here)
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: Let me sleep on it.
        - (the tree is cut here)
- You: Let me think about it.
  - Megan Nixon: You can't stay on the fence forever.
  - You: Okay. For you, I'll do it.
    - Megan Nixon: You won't regret it.
    - _Ends resolved_
  - You: I've made up my mind. It's no.
    - Megan Nixon: You gave me your word.
    - You: All right. You win. I'm in.
      - Megan Nixon: Thank you. I won't forget it.
      - _Ends resolved_
    - You: I can't vote for "Civilian oversight of police".
      - Megan Nixon: You know what this means to me.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I'm sorry, but I'm a no on "Civilian oversight of police".
        - (the tree is cut here)
      - You: What's in it for my district?
        - (the tree is cut here)
      - You: Let me sleep on it.
        - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Megan Nixon: Done. You'll have it.
      - _Ends resolved_
    - You: Ask me again after the committee vote.
      - Megan Nixon: Without this, I've got nothing to take home.
      - You: All right. You win. I'm in.
        - (the tree is cut here)
      - You: I can't vote for "Civilian oversight of police".
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: Let me sleep on it.
        - (the tree is cut here)
  - You: This is a two-way street. I'll need your vote on mine.
    - Megan Nixon: Done. You'll have it.
    - _Ends resolved_
  - You: Ask me again after the committee vote.
    - Megan Nixon: I wouldn't ask if it didn't matter.
    - You: Okay. For you, I'll do it.
      - Megan Nixon: You won't regret it.
      - _Ends resolved_
    - You: I've made up my mind. It's no.
      - Megan Nixon: You gave me your word.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I can't vote for "Civilian oversight of police".
        - (the tree is cut here)
      - You: I'll vote yes, but I'm going to need a favor from you.
        - (the tree is cut here)
    - You: What's in it for my district?
      - Megan Nixon: I'll make sure your district comes first in the next budget.
      - You: I'm with you on "Civilian oversight of police".
        - (the tree is cut here)
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
    - You: Let me sleep on it.
      - Megan Nixon: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
- You: I'm still with you.
  - _if Megan Nixon knows:_
    - Megan Nixon: That's not what you told Briana Ross.
    - You: You're right. I shouldn't have said that.
      - Megan Nixon: Thank you for telling me straight.
      - _Ends open_
    - You: People say a lot of things.
      - Megan Nixon: What would it take?
      - You: You've made your point. Count me in.
        - Megan Nixon: Thank you. I know that wasn't easy.
        - _Ends resolved_
      - You: I've made up my mind. It's no.
        - Megan Nixon: You gave me your word.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Civilian oversight of police".
          - (the tree is cut here)
        - You: What's in it for my district?
          - (the tree is cut here)
        - You: Ask me again after the committee vote.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Megan Nixon: Done. You'll have it.
        - _Ends open_
      - You: Ask me again after the committee vote.
        - Megan Nixon: Take your time, but I need an answer.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
    - You: Then Briana Ross has it wrong.
      - _Ends open: Megan Nixon: Don't take too long._
  - _if not:_
    - Megan Nixon: That's a relief.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/anxious/20w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/ask/scene-talk/calm/9w1s [scene-talk.state-ask.we-re-still-good-on-bill-right]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/withdraw/scene-talk/contrite/14w2s [scene-talk.reply-withdraw.i-ve-thought-it-over-i-can-t-vote-for-bill-after-all]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L82 follow/bargain/scene-talk/calm/11w1s [scene-talk.follow-bargain.i-ll-make-sure-your-district-comes-first-in-the-next-budget]; L83 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L84 reply/refuse/scene-talk/guarded/11w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L85 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L86 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L105 follow/accept/scene-talk/calm/4w2s [scene-talk.follow-accept.done-you-ll-have-it]</sub>

**Profile cold** (outcome resolved)

**Megan Nixon:** You got a minute?

**Megan Nixon:** We're still good on "Civilian oversight of police", right?

You could say:

1. Fine. You have it.
2. I've thought it over. I can't vote for "Civilian oversight of police" after all.
3. What's in it for my district? _(the page follows this one)_
4. I'm still undecided. Give me until the vote.
5. I'm still with you.

**Megan Nixon:** I'll make sure your district comes first in the next budget.

You could say:

1. Fine. You have it.
2. I can't vote for "Civilian oversight of police".
3. This is a two-way street. I'll need your vote on mine. _(the page follows this one)_
4. Let me sleep on it.

**Megan Nixon:** Done. You'll have it.

<sub>L1 narrate/narrate/scene-talk/anxious/20w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/ask/scene-talk/calm/9w1s [scene-talk.state-ask.we-re-still-good-on-bill-right]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/withdraw/scene-talk/contrite/14w2s [scene-talk.reply-withdraw.i-ve-thought-it-over-i-can-t-vote-for-bill-after-all]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/guarded/8w2s [scene-talk.reply-stall.i-m-still-undecided-give-me-until-the-vote]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L69 follow/bargain/scene-talk/calm/11w1s [scene-talk.follow-bargain.i-ll-make-sure-your-district-comes-first-in-the-next-budget]; L70 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L71 reply/refuse/scene-talk/guarded/8w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L72 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L73 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L92 follow/accept/scene-talk/calm/4w2s [scene-talk.follow-accept.done-you-ll-have-it]</sub>

**Profile stubborn** (outcome resolved)

**Megan Nixon:** You got a minute?

**Megan Nixon:** We're still good on "Civilian oversight of police", right?

You could say:

1. I'm with you on "Civilian oversight of police".
2. I've thought it over. I can't vote for "Civilian oversight of police" after all.
3. I'll vote yes, but I'm going to need a favor from you. _(the page follows this one)_
4. I'm still weighing it.
5. I'm still with you.

**Megan Nixon:** All right. We have a deal.

<sub>L1 narrate/narrate/scene-talk/anxious/20w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/ask/scene-talk/calm/9w1s [scene-talk.state-ask.we-re-still-good-on-bill-right]; L4 reply/agree/scene-talk/calm/8w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/withdraw/scene-talk/contrite/14w2s [scene-talk.reply-withdraw.i-ve-thought-it-over-i-can-t-vote-for-bill-after-all]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L79 follow/accept/scene-talk/calm/6w2s [scene-talk.follow-accept.all-right-we-have-a-deal]</sub>

**Profile anxious** (outcome resolved)

**Megan Nixon:** Sorry to bother you.

**Megan Nixon:** We're still good on "Civilian oversight of police", right?

You could say:

1. Count me in.
2. I'm really worried about this vote. I can't do it.
3. I'll vote yes, but I'm going to need a favor from you. _(the page follows this one)_
4. I haven't decided yet.
5. I'm still with you.

**Megan Nixon:** All right. We have a deal.

<sub>L1 narrate/narrate/scene-talk/anxious/20w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/ask/scene-talk/calm/9w1s [scene-talk.state-ask.we-re-still-good-on-bill-right]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L86 follow/accept/scene-talk/calm/6w2s [scene-talk.follow-accept.all-right-we-have-a-deal]</sub>

**Profile boastful** (outcome resolved)

**Megan Nixon:** Sorry to bother you.

**Megan Nixon:** We're still good on "Civilian oversight of police", right?

You could say:

1. I'm with you on "Civilian oversight of police".
2. I've thought it over. I can't vote for "Civilian oversight of police" after all.
3. This is a two-way street. I'll need your vote on mine. _(the page follows this one)_
4. I'm still weighing it.
5. I'm still with you.

**Megan Nixon:** Done. You'll have it.

<sub>L1 narrate/narrate/scene-talk/anxious/20w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/ask/scene-talk/calm/9w1s [scene-talk.state-ask.we-re-still-good-on-bill-right]; L4 reply/agree/scene-talk/calm/8w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/withdraw/scene-talk/contrite/14w2s [scene-talk.reply-withdraw.i-ve-thought-it-over-i-can-t-vote-for-bill-after-all]; L6 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L124 follow/accept/scene-talk/calm/4w2s [scene-talk.follow-accept.done-you-ll-have-it]</sub>

## Scene 13: bill-carry (favor-asked, ends in bill) — proof scene

_Purpose carry-bill. Records: bill:office:gus2025:101811:board:2027-03-26:person_9e002a561a4b29bc:58, person_9e002a561a4b29bc, person_9e002b561a4b2b6f, office:gus2025:101811:board._

> Kelly Riggs has worked on "Inclusionary requirement" for months and needs someone to carry it.

**Profile warm** (outcome resolved)

**Kelly Riggs:** Do you have a minute?

**Kelly Riggs:** Would you put your name on "Inclusionary requirement"?

You could say:

1. I'll carry it. _(the page follows this one)_
2. I wish I could, but I can't.
3. I'll carry it if you'll help me find the votes.
4. Let me sleep on it.
5. I'm already carrying two bills. I don't have room.

**Kelly Riggs:** I knew I could count on you.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- You ★: I'll carry it.
  - Kelly Riggs: I knew I could count on you.
  - _Ends resolved_
- You: I wish I could, but I can't.
  - Kelly Riggs: I wouldn't ask if it didn't matter.
  - You: Fine. I'll do it, but this is the last time.
    - Kelly Riggs: Thank you. Really.
    - _Ends resolved_
  - You: I'm sorry. I just can't.
    - Kelly Riggs: Who else would you trust with it?
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: That's all I needed to hear.
      - _Ends resolved_
    - You: The answer is no.
      - Kelly Riggs: You know what this means to me.
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: That's all I needed to hear.
        - _Ends resolved_
      - You: I can't do that.
        - Kelly Riggs: I'm asking as a friend.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - Kelly Riggs: Deal. I'll start making calls tomorrow.
        - Kelly Riggs: Let's start with the count. Who can we get?
        - You: Where are we now?
          - (the tree is cut here)
        - You: I can bring the members from my side.
          - (the tree is cut here)
        - You: Give me a list of everyone who's undecided.
          - (the tree is cut here)
      - You: I'm still weighing it.
        - Kelly Riggs: You can't stay on the fence forever.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: Let me see the final language first.
          - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - Kelly Riggs: Deal. I'll start making calls tomorrow.
      - Kelly Riggs: So where do you think the votes are?
      - You: Where are we now?
        - Kelly Riggs: We have 5. That's enough to pass, if nobody moves.
        - You: Good. That's a start.
          - (the tree is cut here)
        - You: That's not enough. We'll lose on the floor.
          - (the tree is cut here)
        - You: I'll get you the rest.
          - (the tree is cut here)
      - You: I can bring the members from my side.
        - Kelly Riggs: Good. Start there, and I'll work the rest.
        - _Ends resolved_
      - You: Give me a list of everyone who's undecided.
        - Kelly Riggs: I'll have it on your desk tomorrow.
        - You: Good. I'll start calling tonight.
          - (the tree is cut here)
        - You: All right. Send it over when it's ready.
          - (the tree is cut here)
    - You: I'm still weighing it.
      - Kelly Riggs: You can't stay on the fence forever.
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: I can't do that.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: Let me see the final language first.
        - (the tree is cut here)
  - You: I'll carry it if you'll help me find the votes.
    - Kelly Riggs: Deal. I'll start making calls tomorrow.
    - Kelly Riggs: Let's start with the count. Who can we get?
    - You: Where are we now?
      - Kelly Riggs: We have 5. That's enough to pass, if nobody moves.
      - You: Good. That's a start.
        - (the tree is cut here)
      - You: That's not enough. We'll lose on the floor.
        - (the tree is cut here)
      - You: I'll get you the rest.
        - (the tree is cut here)
    - You: I can bring the members from my side.
      - Kelly Riggs: Good. Start there, and I'll work the rest.
      - _Ends resolved_
    - You: Give me a list of everyone who's undecided.
      - Kelly Riggs: I'll have it on your desk tomorrow.
      - You: Good. I'll start calling tonight.
        - (the tree is cut here)
      - You: All right. Send it over when it's ready.
        - (the tree is cut here)
  - You: I haven't decided yet.
    - Kelly Riggs: You can't stay on the fence forever.
    - You: All right. You win. I'm in.
      - Kelly Riggs: Thank you. I won't forget it.
      - _Ends resolved_
    - You: I'm sorry. I just can't.
      - Kelly Riggs: Who else would you trust with it?
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I can't do that.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - Kelly Riggs: Deal. I'll start making calls tomorrow.
      - Kelly Riggs: Let's start with the count. Who can we get?
      - You: Where are we now?
        - (the tree is cut here)
      - You: I can bring the members from my side.
        - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
    - You: Let me see the final language first.
      - Kelly Riggs: Please. Think about the people this helps.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: Let me sleep on it.
        - (the tree is cut here)
- You: I'll carry it if you'll help me find the votes.
  - Kelly Riggs: Deal. I'll start making calls tomorrow.
  - Kelly Riggs: So where do you think the votes are?
  - You: Where are we now?
    - Kelly Riggs: We have 5. That's enough to pass, if nobody moves.
    - You: Good. That's a start.
      - Kelly Riggs: I'll keep counting. You keep talking to them.
      - You: Good. I'll start calling tonight.
        - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
      - You: All right. Send it over when it's ready.
        - (the tree is cut here)
    - You: That's not enough. We'll lose on the floor.
      - Kelly Riggs: We have time. The vote isn't until next month.
      - You: All right. Let's keep counting.
        - (the tree is cut here)
      - You: We don't have time, and you know it.
        - (the tree is cut here)
      - You: I haven't decided yet.
        - (the tree is cut here)
    - You: I'll get you the rest.
      - Kelly Riggs: That's what I wanted to hear.
      - _Ends resolved_
  - You: I can bring the members from my side.
    - Kelly Riggs: Good. Start there, and I'll work the rest.
    - _Ends resolved_
  - You: Give me a list of everyone who's undecided.
    - Kelly Riggs: I'll have it on your desk tomorrow.
    - You: Good. I'll start calling tonight.
      - Kelly Riggs: I'll be at your door first thing.
      - _Ends resolved_
    - You: All right. Send it over when it's ready.
      - Kelly Riggs: You'll have it by morning.
      - _Ends resolved_
- You: Let me sleep on it.
  - Kelly Riggs: You can't stay on the fence forever.
  - You: Okay. For you, I'll do it.
    - Kelly Riggs: That's all I needed to hear.
    - _Ends resolved_
  - You: I'm sorry. I just can't.
    - Kelly Riggs: Who else would you trust with it?
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: That's all I needed to hear.
      - _Ends resolved_
    - You: I can't do that.
      - Kelly Riggs: I need this one. I promised my district I'd deliver.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: The answer is no.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: Let me think about it.
        - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - Kelly Riggs: Deal. I'll start making calls tomorrow.
      - Kelly Riggs: Let's start with the count. Who can we get?
      - You: Where are we now?
        - (the tree is cut here)
      - You: I can bring the members from my side.
        - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
    - You: I need a few days to think it over.
      - Kelly Riggs: You can't stay on the fence forever.
      - You: Fine. I'll do it, but this is the last time.
        - (the tree is cut here)
      - You: I can't do that.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: Let me see the final language first.
        - (the tree is cut here)
  - You: I'll carry it if you'll help me find the votes.
    - Kelly Riggs: Deal. I'll start making calls tomorrow.
    - Kelly Riggs: So where do you think the votes are?
    - You: Where are we now?
      - Kelly Riggs: We have 5. That's enough to pass, if nobody moves.
      - You: Good. That's a start.
        - (the tree is cut here)
      - You: That's not enough. We'll lose on the floor.
        - (the tree is cut here)
      - You: I'll get you the rest.
        - (the tree is cut here)
    - You: I can bring the members from my side.
      - Kelly Riggs: Good. Start there, and I'll work the rest.
      - _Ends resolved_
    - You: Give me a list of everyone who's undecided.
      - Kelly Riggs: I'll have it on your desk tomorrow.
      - You: Good. I'll start calling tonight.
        - (the tree is cut here)
      - You: All right. Send it over when it's ready.
        - (the tree is cut here)
  - You: Let me see the final language first.
    - Kelly Riggs: You know what this means to me.
    - You: Fine. I'll do it, but this is the last time.
      - Kelly Riggs: Thank you. I won't forget it.
      - _Ends resolved_
    - You: I'm sorry. I just can't.
      - Kelly Riggs: Who else would you trust with it?
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: The answer is no.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: Let me think about it.
        - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - Kelly Riggs: Deal. I'll start making calls tomorrow.
      - Kelly Riggs: Let's start with the count. Who can we get?
      - You: Where are we now?
        - (the tree is cut here)
      - You: I can bring the members from my side.
        - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
    - You: Let me think about it.
      - Kelly Riggs: You can't stay on the fence forever.
      - You: All right. You win. I'm in.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
- You: I'm already carrying two bills. I don't have room.
  - _if Kelly Riggs knows:_
    - Kelly Riggs: Zachary Shepard says you have room for one more.
    - You: You're right. I shouldn't have said that.
      - Kelly Riggs: Thank you for telling me straight.
      - _Ends open_
    - You: People say a lot of things.
      - Kelly Riggs: Take your time, but I need an answer.
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: That's all I needed to hear.
        - _Ends resolved_
      - You: I'm sorry. I just can't.
        - Kelly Riggs: Who else would you trust with it?
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - Kelly Riggs: Deal. I'll start making calls tomorrow.
        - Kelly Riggs: So where do you think the votes are?
        - You: Where are we now?
          - (the tree is cut here)
        - You: I can bring the members from my side.
          - (the tree is cut here)
        - You: Give me a list of everyone who's undecided.
          - (the tree is cut here)
      - You: Let me see the final language first.
        - Kelly Riggs: Yes or no?
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry. I just can't.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
    - You: Then Zachary Shepard has it wrong.
      - _Ends open: Kelly Riggs: I won't forget this._
  - _if not:_
    - Kelly Riggs: I understand. Maybe next session.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/calm/15w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.would-you-put-your-name-on-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.i-ll-carry-it]; L5 reply/decline/scene-talk/tender/7w1s [scene-talk.reply-decline.i-wish-i-could-but-i-can-t]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L9 follow/thank/scene-talk/glad/7w1s [scene-talk.follow-thank.i-knew-i-could-count-on-you]</sub>

**Profile cold** (outcome resolved)

**Kelly Riggs:** Do you have a minute?

**Kelly Riggs:** Would you put your name on "Inclusionary requirement"?

You could say:

1. Of course. I'm glad you asked. _(the page follows this one)_
2. I can't take that on right now.
3. I'll carry it if you'll help me find the votes.
4. Let me sleep on it.
5. I'm already carrying two bills. I don't have room.

**Kelly Riggs:** I knew I could count on you.

<sub>L1 narrate/narrate/scene-talk/calm/15w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.would-you-put-your-name-on-bill]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L5 reply/decline/scene-talk/guarded/7w1s [scene-talk.reply-decline.i-can-t-take-that-on-right-now]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L9 follow/thank/scene-talk/glad/7w1s [scene-talk.follow-thank.i-knew-i-could-count-on-you]</sub>

**Profile stubborn** (outcome resolved)

**Kelly Riggs:** Do you have a minute?

**Kelly Riggs:** Would you put your name on "Inclusionary requirement"?

You could say:

1. Of course. I'm glad you asked. _(the page follows this one)_
2. I can't take that on right now.
3. I'll carry it if you'll help me find the votes.
4. I haven't decided yet.
5. I'm already carrying two bills. I don't have room.

**Kelly Riggs:** Thank you. I won't forget it.

<sub>L1 narrate/narrate/scene-talk/calm/15w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.would-you-put-your-name-on-bill]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L5 reply/decline/scene-talk/guarded/7w1s [scene-talk.reply-decline.i-can-t-take-that-on-right-now]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L9 follow/thank/scene-talk/glad/6w2s [scene-talk.follow-thank.thank-you-i-won-t-forget-it]</sub>

**Profile anxious** (outcome resolved)

**Kelly Riggs:** Sorry to bother you.

**Kelly Riggs:** Would you put your name on "Inclusionary requirement"?

You could say:

1. I'll carry it. _(the page follows this one)_
2. I wish I could, but I can't.
3. I'll carry it if you'll help me find the votes.
4. Let me think about it.
5. I'm already carrying two bills. I don't have room.

**Kelly Riggs:** Thank you. Really.

<sub>L1 narrate/narrate/scene-talk/calm/15w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.would-you-put-your-name-on-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.i-ll-carry-it]; L5 reply/decline/scene-talk/tender/7w1s [scene-talk.reply-decline.i-wish-i-could-but-i-can-t]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L9 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile boastful** (outcome resolved)

**Kelly Riggs:** Do you have a minute?

**Kelly Riggs:** Would you put your name on "Inclusionary requirement"?

You could say:

1. I'll carry it. _(the page follows this one)_
2. I wish I could, but I can't.
3. I'll carry it if you'll help me find the votes.
4. Let me think about it.
5. I'm already carrying two bills. I don't have room.

**Kelly Riggs:** You won't regret it.

<sub>L1 narrate/narrate/scene-talk/calm/15w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.would-you-put-your-name-on-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.i-ll-carry-it]; L5 reply/decline/scene-talk/tender/7w1s [scene-talk.reply-decline.i-wish-i-could-but-i-can-t]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L9 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

## Scene 14: bill-carry (favor-asked, ends in bill) — proof scene

_Purpose carry-bill. Records: bill:office:US-DE:legislature-upper:2027-02-10:official:term:seat:US-DE:upper:020:0:2026-10-12:33, official:term:seat:US-DE:upper:020:0:2026-10-12, official:term:seat:US-DE:upper:017:0:2026-10-12, office:US-DE:legislature-upper._

> John Serrano comes in with a folder under one arm. It's "Legalize cannabis sales", and it needs a sponsor.

**Profile warm** (outcome resolved)

**John Serrano:** Sorry to bother you.

**John Serrano:** I want you to carry "Legalize cannabis sales".

You could say:

1. All right. I'll do it. _(the page follows this one)_
2. I'm not the right person to carry it.
3. I'll carry it if you'll help me find the votes.
4. I haven't decided yet.
5. I'm already carrying two bills. I don't have room.

**John Serrano:** Thank you. Really.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, open, resolved, resolved, open, resolved, resolved, resolved, resolved, resolved, open, open, resolved, resolved, resolved, resolved, resolved, open, resolved, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You ★: All right. I'll do it.
  - John Serrano: Thank you. Really.
  - _Ends resolved_
- You: I'm not the right person to carry it.
  - John Serrano: I'm asking as a friend.
  - You: Okay. For you, I'll do it.
    - John Serrano: That's all I needed to hear.
    - _Ends resolved_
  - You: I'm sorry. I just can't.
    - John Serrano: Who else would you trust with it?
    - You: You've made your point. Count me in.
      - John Serrano: Thank you. I won't forget it.
      - _Ends resolved_
    - You: I can't do that.
      - John Serrano: I wouldn't ask if it didn't matter.
      - You: You've made your point. Count me in.
        - John Serrano: Thank you. I won't forget it.
        - _Ends resolved_
      - You: The answer is no.
        - John Serrano: Please. Think about the people this helps.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - John Serrano: Deal. I'll start making calls tomorrow.
        - John Serrano: So where do you think the votes are?
        - You: Where are we now?
          - (the tree is cut here)
        - You: I can bring the members from my side.
          - (the tree is cut here)
        - You: Give me a list of everyone who's undecided.
          - (the tree is cut here)
      - You: I haven't decided yet.
        - John Serrano: You can't stay on the fence forever.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: Let me see the final language first.
          - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - John Serrano: Deal. I'll start making calls tomorrow.
      - John Serrano: So where do you think the votes are?
      - You: Where are we now?
        - _Ends open: John Serrano: I won't forget this._
      - You: I can bring the members from my side.
        - John Serrano: Good. Start there, and I'll work the rest.
        - _Ends resolved_
      - You: Give me a list of everyone who's undecided.
        - John Serrano: I'll have it on your desk tomorrow.
        - You: Good. I'll start calling tonight.
          - (the tree is cut here)
        - You: All right. Send it over when it's ready.
          - (the tree is cut here)
    - You: Let me sleep on it.
      - John Serrano: You can't stay on the fence forever.
      - You: All right. You win. I'm in.
        - John Serrano: I knew I could count on you.
        - _Ends resolved_
      - You: I can't do that.
        - John Serrano: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - John Serrano: Deal. I'll start making calls tomorrow.
        - John Serrano: So where do you think the votes are?
        - You: Where are we now?
          - (the tree is cut here)
        - You: I can bring the members from my side.
          - (the tree is cut here)
        - You: Give me a list of everyone who's undecided.
          - (the tree is cut here)
      - You: Let me see the final language first.
        - John Serrano: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
  - You: I'll carry it if you'll help me find the votes.
    - John Serrano: Deal. I'll start making calls tomorrow.
    - John Serrano: Let's start with the count. Who can we get?
    - You: Where are we now?
      - _Ends open: John Serrano: I won't forget this._
    - You: I can bring the members from my side.
      - John Serrano: Good. Start there, and I'll work the rest.
      - _Ends resolved_
    - You: Give me a list of everyone who's undecided.
      - John Serrano: I'll have it on your desk tomorrow.
      - You: Good. I'll start calling tonight.
        - John Serrano: I'll be at your door first thing.
        - _Ends resolved_
      - You: All right. Send it over when it's ready.
        - John Serrano: You'll have it by morning.
        - _Ends resolved_
  - You: I haven't decided yet.
    - John Serrano: You can't stay on the fence forever.
    - You: You've made your point. Count me in.
      - John Serrano: Thank you. I won't forget it.
      - _Ends resolved_
    - You: I'm sorry. I just can't.
      - John Serrano: Who else would you trust with it?
      - You: Okay. For you, I'll do it.
        - John Serrano: That's all I needed to hear.
        - _Ends resolved_
      - You: The answer is no.
        - John Serrano: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - John Serrano: Deal. I'll start making calls tomorrow.
        - John Serrano: So where do you think the votes are?
        - You: Where are we now?
          - (the tree is cut here)
        - You: I can bring the members from my side.
          - (the tree is cut here)
        - You: Give me a list of everyone who's undecided.
          - (the tree is cut here)
      - You: I'm still weighing it.
        - John Serrano: You can't stay on the fence forever.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: Let me see the final language first.
          - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - John Serrano: Deal. I'll start making calls tomorrow.
      - John Serrano: Let's start with the count. Who can we get?
      - You: Where are we now?
        - _Ends open: John Serrano: Don't take too long._
      - You: I can bring the members from my side.
        - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
    - You: Let me see the final language first.
      - John Serrano: Please. Think about the people this helps.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
- You: I'll carry it if you'll help me find the votes.
  - John Serrano: Deal. I'll start making calls tomorrow.
  - John Serrano: So where do you think the votes are?
  - You: Where are we now?
    - _Ends open: John Serrano: I won't forget this._
  - You: I can bring the members from my side.
    - John Serrano: Good. Start there, and I'll work the rest.
    - _Ends resolved_
  - You: Give me a list of everyone who's undecided.
    - John Serrano: I'll have it on your desk tomorrow.
    - You: Good. I'll start calling tonight.
      - John Serrano: I'll be at your door first thing.
      - _Ends resolved_
    - You: All right. Send it over when it's ready.
      - John Serrano: You'll have it by morning.
      - _Ends resolved_
- You: I haven't decided yet.
  - John Serrano: You can't stay on the fence forever.
  - You: Okay. For you, I'll do it.
    - John Serrano: That's all I needed to hear.
    - _Ends resolved_
  - You: I'm sorry. I just can't.
    - John Serrano: Who else would you trust with it?
    - You: Okay. For you, I'll do it.
      - John Serrano: That's all I needed to hear.
      - _Ends resolved_
    - You: The answer is no.
      - John Serrano: I could lose my primary over this.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I can't do that.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - John Serrano: Deal. I'll start making calls tomorrow.
      - John Serrano: So where do you think the votes are?
      - You: Where are we now?
        - (the tree is cut here)
      - You: I can bring the members from my side.
        - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
    - You: I'm still weighing it.
      - John Serrano: You can't stay on the fence forever.
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: The answer is no.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: Let me see the final language first.
        - (the tree is cut here)
  - You: I'll carry it if you'll help me find the votes.
    - John Serrano: Deal. I'll start making calls tomorrow.
    - John Serrano: So where do you think the votes are?
    - You: Where are we now?
      - _Ends open: John Serrano: Don't take too long._
    - You: I can bring the members from my side.
      - John Serrano: Good. Start there, and I'll work the rest.
      - _Ends resolved_
    - You: Give me a list of everyone who's undecided.
      - John Serrano: I'll have it on your desk tomorrow.
      - You: Good. I'll start calling tonight.
        - (the tree is cut here)
      - You: All right. Send it over when it's ready.
        - (the tree is cut here)
  - You: Let me see the final language first.
    - John Serrano: Please. Think about the people this helps.
    - You: Okay. For you, I'll do it.
      - John Serrano: That's all I needed to hear.
      - _Ends resolved_
    - You: I'm sorry. I just can't.
      - John Serrano: Who else would you trust with it?
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I can't do that.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: Let me think about it.
        - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - John Serrano: Deal. I'll start making calls tomorrow.
      - John Serrano: So where do you think the votes are?
      - You: Where are we now?
        - (the tree is cut here)
      - You: I can bring the members from my side.
        - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
    - You: Let me sleep on it.
      - John Serrano: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
- You: I'm already carrying two bills. I don't have room.
  - _if not:_
    - John Serrano: I understand. Maybe next session.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/curious/19w2s [scene-talk.narrate-narrate.name-comes-in-with-a-folder-under-one-arm-it-s-bill-and-it-needs-a-spo]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L5 reply/decline/scene-talk/guarded/8w1s [scene-talk.reply-decline.i-m-not-the-right-person-to-carry-it]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L9 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile cold** (outcome refused)

**John Serrano:** Sorry to bother you.

**John Serrano:** I want you to carry "Legalize cannabis sales".

You could say:

1. Of course. I'm glad you asked.
2. I can't take that on right now. _(the page follows this one)_
3. I'll carry it if you'll help me find the votes.
4. I haven't decided yet.
5. I'm already carrying two bills. I don't have room.

**John Serrano:** Suit yourself.

<sub>L1 narrate/narrate/scene-talk/curious/19w2s [scene-talk.narrate-narrate.name-comes-in-with-a-folder-under-one-arm-it-s-bill-and-it-needs-a-spo]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L5 reply/decline/scene-talk/guarded/7w1s [scene-talk.reply-decline.i-can-t-take-that-on-right-now]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L10 follow/accept/scene-talk/guarded/2w1s [scene-talk.follow-accept.suit-yourself]</sub>

**Profile stubborn** (outcome open)

**John Serrano:** Sorry to bother you.

**John Serrano:** I want you to carry "Legalize cannabis sales".

You could say:

1. Yes. You can count on me.
2. I wish I could, but I can't. _(the page follows this one)_
3. I'll carry it if you'll help me find the votes.
4. Let me think about it.
5. I'm already carrying two bills. I don't have room.

**John Serrano:** I need a yes or a no.

You could say:

1. Okay. For you, I'll do it.
2. The answer is no. _(the page follows this one)_
3. I'll carry it if you'll help me find the votes.
4. Let me see the final language first.

**John Serrano:** What would it take?

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't do that. _(the page follows this one)_
3. I'll carry it if you'll help me find the votes.
4. Let me see the final language first.

**John Serrano:** Yes or no?

You could say:

1. All right. You win. I'm in.
2. I'm sorry. I just can't. _(the page follows this one)_
3. I'll carry it if you'll help me find the votes.
4. Let me see the final language first.

**John Serrano:** Who else would you trust with it?

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'll carry it if you'll help me find the votes. _(the page follows this one)_
3. I'm still weighing it.

**John Serrano:** Deal. I'll start making calls tomorrow.

**John Serrano:** So where do you think the votes are?

You could say:

1. Where are we now? _(the page follows this one)_
2. I can bring the members from my side.
3. Give me a list of everyone who's undecided.

**John Serrano:** Don't take too long.

<sub>L1 narrate/narrate/scene-talk/curious/19w2s [scene-talk.narrate-narrate.name-comes-in-with-a-folder-under-one-arm-it-s-bill-and-it-needs-a-spo]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L5 reply/decline/scene-talk/tender/7w1s [scene-talk.reply-decline.i-wish-i-could-but-i-can-t]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L10 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-a-yes-or-a-no]; L11 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L12 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L13 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L14 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.let-me-see-the-final-language-first]; L16 follow/press/scene-talk/calm/4w1s [scene-talk.follow-press.what-would-it-take]; L17 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L18 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L19 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L20 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.let-me-see-the-final-language-first]; L22 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L23 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L24 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L25 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L26 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.let-me-see-the-final-language-first]; L28 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.who-else-would-you-trust-with-it]; L29 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L30 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L31 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L32 follow/accept/scene-talk/glad/6w2s [scene-talk.follow-accept.deal-i-ll-start-making-calls-tomorrow]; L33 follow/ask/scene-talk/calm/8w1s [scene-talk.follow-ask.so-where-do-you-think-the-votes-are]; L34 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.where-are-we-now]; L35 reply/offer/scene-talk/calm/8w1s [scene-talk.reply-offer.i-can-bring-the-members-from-my-side]; L36 reply/request/scene-talk/calm/8w1s [scene-talk.reply-request.give-me-a-list-of-everyone-who-s-undecided]; L37 close/press/scene-talk/braced/4w1s [scene-talk.close-press.don-t-take-too-long]</sub>

**Profile anxious** (outcome open)

**John Serrano:** Sorry to bother you.

**John Serrano:** I want you to carry "Legalize cannabis sales".

You could say:

1. I'll carry it.
2. I can't take that on right now.
3. I'll carry it if you'll help me find the votes.
4. Let me think about it. _(the page follows this one)_
5. I'm already carrying two bills. I don't have room.

**John Serrano:** You can't stay on the fence forever.

You could say:

1. Okay. For you, I'll do it.
2. I'm sorry. I just can't.
3. I'll carry it if you'll help me find the votes.
4. Let me see the final language first. _(the page follows this one)_

**John Serrano:** I could lose my primary over this.

You could say:

1. You've made your point. Count me in.
2. I'm sorry. I just can't.
3. I'll carry it if you'll help me find the votes.
4. I haven't decided yet. _(the page follows this one)_

**John Serrano:** You can't stay on the fence forever.

You could say:

1. Fine. I'll do it, but this is the last time.
2. The answer is no.
3. I'll carry it if you'll help me find the votes. _(the page follows this one)_

**John Serrano:** Deal. I'll start making calls tomorrow.

**John Serrano:** So where do you think the votes are?

You could say:

1. Where are we now? _(the page follows this one)_
2. I can bring the members from my side.
3. Give me a list of everyone who's undecided.

**John Serrano:** I won't forget this.

<sub>L1 narrate/narrate/scene-talk/curious/19w2s [scene-talk.narrate-narrate.name-comes-in-with-a-folder-under-one-arm-it-s-bill-and-it-needs-a-spo]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.i-ll-carry-it]; L5 reply/decline/scene-talk/guarded/7w1s [scene-talk.reply-decline.i-can-t-take-that-on-right-now]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L135 follow/press/scene-talk/guarded/7w1s [scene-talk.follow-press.you-can-t-stay-on-the-fence-forever]; L136 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L137 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L138 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L139 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.let-me-see-the-final-language-first]; L172 follow/plea/scene-talk/anxious/7w1s [scene-talk.follow-plea.i-could-lose-my-primary-over-this]; L173 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L174 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L175 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L176 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L188 follow/press/scene-talk/guarded/7w1s [scene-talk.follow-press.you-can-t-stay-on-the-fence-forever]; L189 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L190 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L191 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L192 follow/accept/scene-talk/glad/6w2s [scene-talk.follow-accept.deal-i-ll-start-making-calls-tomorrow]; L193 follow/ask/scene-talk/calm/8w1s [scene-talk.follow-ask.so-where-do-you-think-the-votes-are]; L194 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.where-are-we-now]; L195 reply/offer/scene-talk/calm/8w1s [scene-talk.reply-offer.i-can-bring-the-members-from-my-side]; L196 reply/request/scene-talk/calm/8w1s [scene-talk.reply-request.give-me-a-list-of-everyone-who-s-undecided]; L197 close/warn/scene-talk/braced/4w1s [scene-talk.close-warn.i-won-t-forget-this]</sub>

**Profile boastful** (outcome open)

**John Serrano:** Sorry to bother you.

**John Serrano:** I want you to carry "Legalize cannabis sales".

You could say:

1. I'll carry it.
2. I wish I could, but I can't.
3. I'll carry it if you'll help me find the votes. _(the page follows this one)_
4. I need a few days to think it over.
5. I'm already carrying two bills. I don't have room.

**John Serrano:** Deal. I'll start making calls tomorrow.

**John Serrano:** So where do you think the votes are?

You could say:

1. Where are we now? _(the page follows this one)_
2. I can bring the members from my side.
3. Give me a list of everyone who's undecided.

**John Serrano:** I won't forget this.

<sub>L1 narrate/narrate/scene-talk/curious/19w2s [scene-talk.narrate-narrate.name-comes-in-with-a-folder-under-one-arm-it-s-bill-and-it-needs-a-spo]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.i-ll-carry-it]; L5 reply/decline/scene-talk/tender/7w1s [scene-talk.reply-decline.i-wish-i-could-but-i-can-t]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L11 follow/accept/scene-talk/glad/6w2s [scene-talk.follow-accept.deal-i-ll-start-making-calls-tomorrow]; L12 follow/ask/scene-talk/calm/8w1s [scene-talk.follow-ask.so-where-do-you-think-the-votes-are]; L13 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.where-are-we-now]; L14 reply/offer/scene-talk/calm/8w1s [scene-talk.reply-offer.i-can-bring-the-members-from-my-side]; L15 reply/request/scene-talk/calm/8w1s [scene-talk.reply-request.give-me-a-list-of-everyone-who-s-undecided]; L16 close/warn/scene-talk/braced/4w1s [scene-talk.close-warn.i-won-t-forget-this]</sub>

## Scene 15: bill-carry (favor-asked, ends in bill) — proof scene

_Purpose carry-bill. Records: bill:office:US-DE:legislature-lower:2027-01-31:official:term:seat:US-DE:lower:008:0:2026-10-12:23, official:term:seat:US-DE:lower:008:0:2026-10-12, official:term:seat:US-DE:lower:013:0:2026-10-12, office:US-DE:legislature-lower._

> Patricia Hubbard has worked on "Civilian oversight of police" for months and needs someone to carry it.

**Profile warm** (outcome resolved)

**Patricia Hubbard:** You got a minute?

**Patricia Hubbard:** "Civilian oversight of police" needs a sponsor, and I want it to be you.

You could say:

1. Yes. You can count on me. _(the page follows this one)_
2. I can't take that on right now.
3. I'll carry it if you'll help me find the votes.
4. Let me sleep on it.
5. I'm already carrying two bills. I don't have room.

**Patricia Hubbard:** Thank you. Really.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You ★: Yes. You can count on me.
  - Patricia Hubbard: Thank you. Really.
  - _Ends resolved_
- You: I can't take that on right now.
  - Patricia Hubbard: I'm asking as a friend.
  - You: Okay. For you, I'll do it.
    - Patricia Hubbard: That's all I needed to hear.
    - _Ends resolved_
  - You: I'm sorry. I just can't.
    - Patricia Hubbard: Who else would you trust with it?
    - You: You've made your point. Count me in.
      - Patricia Hubbard: Thank you. I won't forget it.
      - _Ends resolved_
    - You: The answer is no.
      - Patricia Hubbard: Without this, I've got nothing to take home.
      - You: Okay. For you, I'll do it.
        - Patricia Hubbard: That's all I needed to hear.
        - _Ends resolved_
      - You: I can't do that.
        - Patricia Hubbard: I wouldn't ask if it didn't matter.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - Patricia Hubbard: Deal. I'll start making calls tomorrow.
        - Patricia Hubbard: Let's start with the count. Who can we get?
        - You: Where are we now?
          - (the tree is cut here)
        - You: I can bring the members from my side.
          - (the tree is cut here)
        - You: Give me a list of everyone who's undecided.
          - (the tree is cut here)
      - You: I'm still weighing it.
        - Patricia Hubbard: You can't stay on the fence forever.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: Let me see the final language first.
          - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - Patricia Hubbard: Deal. I'll start making calls tomorrow.
      - Patricia Hubbard: So where do you think the votes are?
      - You: Where are we now?
        - Patricia Hubbard: We have 41. That's enough to pass, if nobody moves.
        - You: Good. That's a start.
          - (the tree is cut here)
        - You: That's not enough. We'll lose on the floor.
          - (the tree is cut here)
        - You: I'll get you the rest.
          - (the tree is cut here)
      - You: I can bring the members from my side.
        - Patricia Hubbard: Good. Start there, and I'll work the rest.
        - _Ends resolved_
      - You: Give me a list of everyone who's undecided.
        - Patricia Hubbard: I'll have it on your desk tomorrow.
        - You: Good. I'll start calling tonight.
          - (the tree is cut here)
        - You: All right. Send it over when it's ready.
          - (the tree is cut here)
    - You: I'm still weighing it.
      - Patricia Hubbard: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - Patricia Hubbard: That's all I needed to hear.
        - _Ends resolved_
      - You: The answer is no.
        - Patricia Hubbard: You know what this means to me.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - Patricia Hubbard: Deal. I'll start making calls tomorrow.
        - Patricia Hubbard: So where do you think the votes are?
        - You: Where are we now?
          - (the tree is cut here)
        - You: I can bring the members from my side.
          - (the tree is cut here)
        - You: Give me a list of everyone who's undecided.
          - (the tree is cut here)
      - You: Let me see the final language first.
        - Patricia Hubbard: Without this, I've got nothing to take home.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
  - You: I'll carry it if you'll help me find the votes.
    - Patricia Hubbard: Deal. I'll start making calls tomorrow.
    - Patricia Hubbard: Let's start with the count. Who can we get?
    - You: Where are we now?
      - Patricia Hubbard: We have 41. That's enough to pass, if nobody moves.
      - You: Good. That's a start.
        - Patricia Hubbard: I'll keep counting. You keep talking to them.
        - You: Good. I'll start calling tonight.
          - (the tree is cut here)
        - You: Give me a list of everyone who's undecided.
          - (the tree is cut here)
        - You: All right. Send it over when it's ready.
          - (the tree is cut here)
      - You: That's not enough. We'll lose on the floor.
        - Patricia Hubbard: Then help me change some minds.
        - You: Changing minds is your job. You wrote it.
          - (the tree is cut here)
        - You: People say a lot of things.
          - (the tree is cut here)
        - You: You're right. I'll make the calls.
          - (the tree is cut here)
      - You: I'll get you the rest.
        - Patricia Hubbard: That's what I wanted to hear.
        - _Ends resolved_
    - You: I can bring the members from my side.
      - Patricia Hubbard: Good. Start there, and I'll work the rest.
      - _Ends resolved_
    - You: Give me a list of everyone who's undecided.
      - Patricia Hubbard: I'll have it on your desk tomorrow.
      - You: Good. I'll start calling tonight.
        - Patricia Hubbard: I'll be at your door first thing.
        - _Ends resolved_
      - You: All right. Send it over when it's ready.
        - (the tree is cut here)
  - You: Let me think about it.
    - Patricia Hubbard: You can't stay on the fence forever.
    - You: All right. You win. I'm in.
      - Patricia Hubbard: I knew I could count on you.
      - _Ends resolved_
    - You: I'm sorry. I just can't.
      - Patricia Hubbard: Who else would you trust with it?
      - You: All right. You win. I'm in.
        - (the tree is cut here)
      - You: I can't do that.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: Let me sleep on it.
        - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - Patricia Hubbard: Deal. I'll start making calls tomorrow.
      - Patricia Hubbard: So where do you think the votes are?
      - You: Where are we now?
        - (the tree is cut here)
      - You: I can bring the members from my side.
        - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
    - You: Let me see the final language first.
      - Patricia Hubbard: I need this one. I promised my district I'd deliver.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: The answer is no.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
- You: I'll carry it if you'll help me find the votes.
  - Patricia Hubbard: Deal. I'll start making calls tomorrow.
  - Patricia Hubbard: So where do you think the votes are?
  - You: Where are we now?
    - Patricia Hubbard: We have 41. That's enough to pass, if nobody moves.
    - You: Good. That's a start.
      - Patricia Hubbard: I'll keep counting. You keep talking to them.
      - You: Good. I'll start calling tonight.
        - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
      - You: All right. Send it over when it's ready.
        - (the tree is cut here)
    - You: That's not enough. We'll lose on the floor.
      - Patricia Hubbard: Then help me change some minds.
      - You: Changing minds is your job. You wrote it.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
      - You: You're right. I'll make the calls.
        - (the tree is cut here)
    - You: I'll get you the rest.
      - Patricia Hubbard: That's what I wanted to hear.
      - _Ends resolved_
  - You: I can bring the members from my side.
    - Patricia Hubbard: Good. Start there, and I'll work the rest.
    - _Ends resolved_
  - You: Give me a list of everyone who's undecided.
    - Patricia Hubbard: I'll have it on your desk tomorrow.
    - You: Good. I'll start calling tonight.
      - Patricia Hubbard: I'll be at your door first thing.
      - _Ends resolved_
    - You: All right. Send it over when it's ready.
      - Patricia Hubbard: You'll have it by morning.
      - _Ends resolved_
- You: Let me sleep on it.
  - Patricia Hubbard: You can't stay on the fence forever.
  - You: You've made your point. Count me in.
    - Patricia Hubbard: Thank you. Really.
    - _Ends resolved_
  - You: The answer is no.
    - Patricia Hubbard: You know what this means to me.
    - You: Fine. I'll do it, but this is the last time.
      - Patricia Hubbard: Thank you. Really.
      - _Ends resolved_
    - You: I'm sorry. I just can't.
      - Patricia Hubbard: Who else would you trust with it?
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: I can't do that.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - Patricia Hubbard: Deal. I'll start making calls tomorrow.
      - Patricia Hubbard: So where do you think the votes are?
      - You: Where are we now?
        - (the tree is cut here)
      - You: I can bring the members from my side.
        - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
    - You: I need a few days to think it over.
      - Patricia Hubbard: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: Let me see the final language first.
        - (the tree is cut here)
  - You: I'll carry it if you'll help me find the votes.
    - Patricia Hubbard: Deal. I'll start making calls tomorrow.
    - Patricia Hubbard: So where do you think the votes are?
    - You: Where are we now?
      - Patricia Hubbard: We have 41. That's enough to pass, if nobody moves.
      - You: Good. That's a start.
        - (the tree is cut here)
      - You: That's not enough. We'll lose on the floor.
        - (the tree is cut here)
      - You: I'll get you the rest.
        - (the tree is cut here)
    - You: I can bring the members from my side.
      - Patricia Hubbard: Good. Start there, and I'll work the rest.
      - _Ends resolved_
    - You: Give me a list of everyone who's undecided.
      - Patricia Hubbard: I'll have it on your desk tomorrow.
      - You: Good. I'll start calling tonight.
        - (the tree is cut here)
      - You: All right. Send it over when it's ready.
        - (the tree is cut here)
  - You: Let me see the final language first.
    - Patricia Hubbard: I wouldn't ask if it didn't matter.
    - You: Okay. For you, I'll do it.
      - Patricia Hubbard: That's all I needed to hear.
      - _Ends resolved_
    - You: I'm sorry. I just can't.
      - Patricia Hubbard: Who else would you trust with it?
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I can't do that.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: I need a few days to think it over.
        - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - Patricia Hubbard: Deal. I'll start making calls tomorrow.
      - Patricia Hubbard: So where do you think the votes are?
      - You: Where are we now?
        - (the tree is cut here)
      - You: I can bring the members from my side.
        - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
    - You: Let me think about it.
      - Patricia Hubbard: You can't stay on the fence forever.
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
- You: I'm already carrying two bills. I don't have room.
  - _if not:_
    - Patricia Hubbard: I understand. Maybe next session.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/hopeful/14w1s [scene-talk.state-request.bill-needs-a-sponsor-and-i-want-it-to-be-you]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L5 reply/decline/scene-talk/guarded/7w1s [scene-talk.reply-decline.i-can-t-take-that-on-right-now]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L9 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile cold** (outcome refused)

**Patricia Hubbard:** Do you have a minute?

**Patricia Hubbard:** "Civilian oversight of police" needs a sponsor, and I want it to be you.

You could say:

1. I'll carry it.
2. I'm not the right person to carry it. _(the page follows this one)_
3. I'll carry it if you'll help me find the votes.
4. Let me sleep on it.
5. I'm already carrying two bills. I don't have room.

**Patricia Hubbard:** Fair enough.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/14w1s [scene-talk.state-request.bill-needs-a-sponsor-and-i-want-it-to-be-you]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.i-ll-carry-it]; L5 reply/decline/scene-talk/guarded/8w1s [scene-talk.reply-decline.i-m-not-the-right-person-to-carry-it]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L10 follow/accept/scene-talk/calm/2w1s [scene-talk.follow-accept.fair-enough]</sub>

**Profile stubborn** (outcome open)

**Patricia Hubbard:** Do you have a minute?

**Patricia Hubbard:** "Civilian oversight of police" needs a sponsor, and I want it to be you.

You could say:

1. Of course. I'm glad you asked.
2. I'm not the right person to carry it. _(the page follows this one)_
3. I'll carry it if you'll help me find the votes.
4. I haven't decided yet.
5. I'm already carrying two bills. I don't have room.

**Patricia Hubbard:** Yes or no?

You could say:

1. All right. You win. I'm in.
2. I'm sorry. I just can't. _(the page follows this one)_
3. I'll carry it if you'll help me find the votes.
4. Let me see the final language first.

**Patricia Hubbard:** Who else would you trust with it?

You could say:

1. Fine. I'll do it, but this is the last time.
2. The answer is no. _(the page follows this one)_
3. I'll carry it if you'll help me find the votes.
4. I need a few days to think it over.

**Patricia Hubbard:** I need a yes or a no.

You could say:

1. All right. You win. I'm in.
2. I can't do that. _(the page follows this one)_
3. I'll carry it if you'll help me find the votes.
4. Let me see the final language first.

**Patricia Hubbard:** What would it take?

You could say:

1. Okay. For you, I'll do it.
2. I'll carry it if you'll help me find the votes.
3. Let me see the final language first. _(the page follows this one)_

**Patricia Hubbard:** Take your time, but I need an answer.

**Patricia Hubbard:** I won't forget this.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/14w1s [scene-talk.state-request.bill-needs-a-sponsor-and-i-want-it-to-be-you]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L5 reply/decline/scene-talk/guarded/8w1s [scene-talk.reply-decline.i-m-not-the-right-person-to-carry-it]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L10 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L11 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L12 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L13 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L14 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.let-me-see-the-final-language-first]; L16 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.who-else-would-you-trust-with-it]; L17 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L18 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L19 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L20 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L22 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-a-yes-or-a-no]; L23 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L24 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L25 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L26 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.let-me-see-the-final-language-first]; L28 follow/press/scene-talk/calm/4w1s [scene-talk.follow-press.what-would-it-take]; L29 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L30 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L31 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.let-me-see-the-final-language-first]; L32 follow/press/scene-talk/calm/8w1s [scene-talk.follow-press.take-your-time-but-i-need-an-answer]; L33 close/warn/scene-talk/braced/4w1s [scene-talk.close-warn.i-won-t-forget-this]</sub>

**Profile anxious** (outcome resolved)

**Patricia Hubbard:** Is now a bad time?

**Patricia Hubbard:** "Civilian oversight of police" needs a sponsor, and I want it to be you.

You could say:

1. Yes. You can count on me.
2. I'm not the right person to carry it.
3. I'll carry it if you'll help me find the votes.
4. I haven't decided yet. _(the page follows this one)_
5. I'm already carrying two bills. I don't have room.

**Patricia Hubbard:** You can't stay on the fence forever.

You could say:

1. You've made your point. Count me in.
2. I can't do that.
3. I'll carry it if you'll help me find the votes.
4. Let me see the final language first. _(the page follows this one)_

**Patricia Hubbard:** I need this one. I promised my district I'd deliver.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry. I just can't.
3. I'll carry it if you'll help me find the votes.
4. Let me think about it. _(the page follows this one)_

**Patricia Hubbard:** You can't stay on the fence forever.

You could say:

1. All right. You win. I'm in.
2. I can't do that.
3. I'll carry it if you'll help me find the votes. _(the page follows this one)_

**Patricia Hubbard:** Deal. I'll start making calls tomorrow.

**Patricia Hubbard:** So where do you think the votes are?

You could say:

1. Where are we now?
2. I can bring the members from my side. _(the page follows this one)_
3. Give me a list of everyone who's undecided.

**Patricia Hubbard:** Good. Start there, and I'll work the rest.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.is-now-a-bad-time]; L3 state/request/scene-talk/hopeful/14w1s [scene-talk.state-request.bill-needs-a-sponsor-and-i-want-it-to-be-you]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L5 reply/decline/scene-talk/guarded/8w1s [scene-talk.reply-decline.i-m-not-the-right-person-to-carry-it]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L144 follow/press/scene-talk/guarded/7w1s [scene-talk.follow-press.you-can-t-stay-on-the-fence-forever]; L145 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L146 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L147 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L148 reply/deflect/scene-talk/guarded/7w1s [scene-talk.reply-deflect.let-me-see-the-final-language-first]; L184 follow/plea/scene-talk/anxious/10w2s [scene-talk.follow-plea.i-need-this-one-i-promised-my-district-i-d-deliver]; L185 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L186 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L187 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L188 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L200 follow/press/scene-talk/guarded/7w1s [scene-talk.follow-press.you-can-t-stay-on-the-fence-forever]; L201 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L202 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L203 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L204 follow/accept/scene-talk/glad/6w2s [scene-talk.follow-accept.deal-i-ll-start-making-calls-tomorrow]; L205 follow/ask/scene-talk/calm/8w1s [scene-talk.follow-ask.so-where-do-you-think-the-votes-are]; L206 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.where-are-we-now]; L207 reply/offer/scene-talk/calm/8w1s [scene-talk.reply-offer.i-can-bring-the-members-from-my-side]; L208 reply/request/scene-talk/calm/8w1s [scene-talk.reply-request.give-me-a-list-of-everyone-who-s-undecided]; L209 follow/thank/scene-talk/calm/8w2s [scene-talk.follow-thank.good-start-there-and-i-ll-work-the-rest]</sub>

**Profile boastful** (outcome resolved)

**Patricia Hubbard:** Can I talk to you?

**Patricia Hubbard:** "Civilian oversight of police" needs a sponsor, and I want it to be you.

You could say:

1. All right. I'll do it.
2. I can't take that on right now.
3. I'll carry it if you'll help me find the votes. _(the page follows this one)_
4. I haven't decided yet.
5. I'm already carrying two bills. I don't have room.

**Patricia Hubbard:** Deal. I'll start making calls tomorrow.

**Patricia Hubbard:** So where do you think the votes are?

You could say:

1. Where are we now?
2. I can bring the members from my side.
3. Give me a list of everyone who's undecided. _(the page follows this one)_

**Patricia Hubbard:** I'll have it on your desk tomorrow.

You could say:

1. Good. I'll start calling tonight. _(the page follows this one)_
2. All right. Send it over when it's ready.

**Patricia Hubbard:** I'll be at your door first thing.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/request/scene-talk/hopeful/14w1s [scene-talk.state-request.bill-needs-a-sponsor-and-i-want-it-to-be-you]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L5 reply/decline/scene-talk/guarded/7w1s [scene-talk.reply-decline.i-can-t-take-that-on-right-now]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L11 follow/accept/scene-talk/glad/6w2s [scene-talk.follow-accept.deal-i-ll-start-making-calls-tomorrow]; L12 follow/ask/scene-talk/calm/8w1s [scene-talk.follow-ask.so-where-do-you-think-the-votes-are]; L13 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.where-are-we-now]; L14 reply/offer/scene-talk/calm/8w1s [scene-talk.reply-offer.i-can-bring-the-members-from-my-side]; L15 reply/request/scene-talk/calm/8w1s [scene-talk.reply-request.give-me-a-list-of-everyone-who-s-undecided]; L59 follow/promise/scene-talk/calm/7w1s [scene-talk.follow-promise.i-ll-have-it-on-your-desk-tomorrow]; L60 reply/thank/scene-talk/calm/5w2s [scene-talk.reply-thank.good-i-ll-start-calling-tonight]; L61 reply/accept/scene-talk/calm/8w2s [scene-talk.reply-accept.all-right-send-it-over-when-it-s-ready]; L62 follow/promise/scene-talk/calm/7w1s [scene-talk.follow-promise.i-ll-be-at-your-door-first-thing]</sub>

## Scene 16: donor-ask (favor-asked, ends in money) — proof scene

_Purpose donor-ask. Records: filing:contest:seat:gus2025:101811:board:0:2026-11-03:person_9e002a561a4b29bc|person_9e002b561a4b2b6f, filing:contest:seat:gus2025:101811:board:0:2026-11-03:person_9e002a561a4b29bc, person_9e002b561a4b2b6f, person_9e002a561a4b29bc._

> Simon Riggs gave $20 to your campaign, most of what you raised. Now Simon Riggs is on the line.

**Profile warm** (outcome resolved)

**Simon Riggs:** Thanks for taking my call.

**Simon Riggs:** You know how much I put into your campaign. I need you on "Ban discrimination in housing and work".

You could say:

1. All right. I'll do it. _(the page follows this one)_
2. I'm sorry. I just can't.
3. I'll listen. I won't promise anything.
4. That's not a conversation for today.
5. I already pushed for that. It's moving.

**Simon Riggs:** You won't regret it.

**The whole exchange** (44 nodes; endings: resolved, refused, resolved, resolved, resolved, refused, resolved, resolved, refused, resolved, resolved, refused, resolved, resolved, resolved, refused, resolved, open, resolved, refused, open, resolved, resolved, refused, open, open, open, resolved, refused, open, open, resolved; ★ is the branch this profile's traits lean toward):

- You ★: All right. I'll do it.
  - Simon Riggs: You won't regret it.
  - _Ends resolved_
- You: I'm sorry. I just can't.
  - Simon Riggs: Then I'll take it up with somebody else.
  - _Ends refused_
- You: I'll listen. I won't promise anything.
  - Simon Riggs: That's all I'm asking.
  - _Ends resolved_
- You: That's not a conversation for today.
  - Simon Riggs: Yes or no?
  - You: Okay. For you, I'll do it.
    - Simon Riggs: That's all I needed to hear.
    - _Ends resolved_
  - You: I can't do that, and you shouldn't ask me to.
    - Simon Riggs: I've stood by you from the start.
    - You: You've made your point. Count me in.
      - Simon Riggs: I knew I could count on you.
      - _Ends resolved_
    - You: I'm sorry. I just can't.
      - Simon Riggs: Then I'll take it up with somebody else.
      - _Ends refused_
    - You: I'll listen. I won't promise anything.
      - Simon Riggs: That's all I'm asking.
      - _Ends resolved_
    - You: I'm still weighing it.
      - Simon Riggs: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - Simon Riggs: That's all I needed to hear.
        - _Ends resolved_
      - You: I'm sorry. I just can't.
        - Simon Riggs: Then I'll take it up with somebody else.
        - _Ends refused_
      - You: I'll listen. I won't promise anything.
        - Simon Riggs: That's all I'm asking.
        - _Ends resolved_
      - You: Let's not get into that over the phone.
        - Simon Riggs: What would it take?
        - You: Okay. For you, I'll do it.
          - Simon Riggs: That's all I needed to hear.
          - _Ends resolved_
        - You: I'm sorry. I just can't.
          - Simon Riggs: Then I'll take it up with somebody else.
          - _Ends refused_
        - You: I'll listen. I won't promise anything.
          - Simon Riggs: That's all I'm asking.
          - _Ends resolved_
  - You: I'll listen. I won't promise anything.
    - Simon Riggs: That's all I'm asking.
    - _Ends resolved_
  - You: Let's not get into that over the phone.
    - Simon Riggs: I need a yes or a no.
    - You: You've made your point. Count me in.
      - Simon Riggs: Thank you. I won't forget it.
      - _Ends resolved_
    - You: I'm sorry. I just can't.
      - Simon Riggs: Then I'll take it up with somebody else.
      - _Ends refused_
    - You: I'll listen. I won't promise anything.
      - Simon Riggs: That's all I'm asking.
      - _Ends resolved_
- You: I already pushed for that. It's moving.
  - _if Simon Riggs knows:_
    - Simon Riggs: Dylan Riggs says it never left committee.
    - You: All right. Here's the truth.
      - Simon Riggs: Thank you for telling me straight.
      - _Ends open_
    - You: People say a lot of things.
      - Simon Riggs: What would it take?
      - You: All right. You win. I'm in.
        - Simon Riggs: I knew you'd come around.
        - _Ends resolved_
      - You: I'm sorry. I just can't.
        - Simon Riggs: Then I'll take it up with somebody else.
        - _Ends refused_
      - You: I'll listen. I won't promise anything.
        - Simon Riggs: That's all I'm asking.
        - _Ends open_
      - You: That's not a conversation for today.
        - Simon Riggs: I need a yes or a no.
        - You: You've made your point. Count me in.
          - Simon Riggs: You won't regret it.
          - _Ends resolved_
        - You: I can't do that, and you shouldn't ask me to.
          - Simon Riggs: I backed you when nobody else would.
          - You: Okay. For you, I'll do it.
            - Simon Riggs: That's all I needed to hear.
            - _Ends resolved_
          - You: I can't do that.
            - Simon Riggs: I've stood by you from the start.
            - _Ends refused: Simon Riggs: I won't forget this._
          - You: I'll listen. I won't promise anything.
            - Simon Riggs: That's all I'm asking.
            - _Ends open_
          - You: I need a few days to think it over.
            - Simon Riggs: You can't stay on the fence forever.
            - _Ends open: Simon Riggs: I won't forget this._
        - You: I'll listen. I won't promise anything.
          - Simon Riggs: That's all I'm asking.
          - _Ends open_
        - You: Let's not get into that over the phone.
          - Simon Riggs: Yes or no?
          - You: You've made your point. Count me in.
            - Simon Riggs: Thank you. I won't forget it.
            - _Ends resolved_
          - You: I'm sorry. I just can't.
            - Simon Riggs: Then I'll take it up with somebody else.
            - _Ends refused_
          - You: I'll listen. I won't promise anything.
            - Simon Riggs: That's all I'm asking.
            - _Ends open_
    - You: Then Dylan Riggs has it wrong.
      - _Ends open: Simon Riggs: Don't take too long._
  - _if not:_
    - Simon Riggs: Good to hear. Keep me posted.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/guarded/19w2s [scene-talk.narrate-narrate.name-gave-money-to-your-campaign-share-what-you-raised-now-name-is-on-]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.thanks-for-taking-my-call]; L3 state/request/scene-talk/braced/19w2s [scene-talk.state-request.you-know-how-much-i-put-into-your-campaign-i-need-you-on-bill]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L5 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L6 reply/bargain/scene-talk/guarded/6w2s [scene-talk.reply-bargain.i-ll-listen-i-won-t-promise-anything]; L7 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.that-s-not-a-conversation-for-today]; L8 reply/lie/scene-talk/calm/7w2s [scene-talk.reply-lie.i-already-pushed-for-that-it-s-moving]; L9 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

**Profile cold** (outcome resolved)

**Simon Riggs:** Thanks for taking my call.

**Simon Riggs:** You know how much I put into your campaign. I need you on "Ban discrimination in housing and work".

You could say:

1. All right. I'll do it. _(the page follows this one)_
2. I can't do that, and you shouldn't ask me to.
3. I'll listen. I won't promise anything.
4. That's not a conversation for today.
5. I already pushed for that. It's moving.

**Simon Riggs:** Good. I'll hold you to that.

<sub>L1 narrate/narrate/scene-talk/guarded/19w2s [scene-talk.narrate-narrate.name-gave-money-to-your-campaign-share-what-you-raised-now-name-is-on-]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.thanks-for-taking-my-call]; L3 state/request/scene-talk/braced/19w2s [scene-talk.state-request.you-know-how-much-i-put-into-your-campaign-i-need-you-on-bill]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L5 reply/refuse/scene-talk/braced/10w1s [scene-talk.reply-refuse.i-can-t-do-that-and-you-shouldn-t-ask-me-to]; L6 reply/bargain/scene-talk/guarded/6w2s [scene-talk.reply-bargain.i-ll-listen-i-won-t-promise-anything]; L7 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.that-s-not-a-conversation-for-today]; L8 reply/lie/scene-talk/calm/7w2s [scene-talk.reply-lie.i-already-pushed-for-that-it-s-moving]; L9 follow/thank/scene-talk/guarded/6w2s [scene-talk.follow-thank.good-i-ll-hold-you-to-that]</sub>

**Profile stubborn** (outcome resolved)

**Simon Riggs:** Thanks for taking my call.

**Simon Riggs:** You know how much I put into your campaign. I need you on "Ban discrimination in housing and work".

You could say:

1. Yes. You can count on me. _(the page follows this one)_
2. I can't do that, and you shouldn't ask me to.
3. I'll listen. I won't promise anything.
4. That's not a conversation for today.
5. I already pushed for that. It's moving.

**Simon Riggs:** Thank you. Really.

<sub>L1 narrate/narrate/scene-talk/guarded/19w2s [scene-talk.narrate-narrate.name-gave-money-to-your-campaign-share-what-you-raised-now-name-is-on-]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.thanks-for-taking-my-call]; L3 state/request/scene-talk/braced/19w2s [scene-talk.state-request.you-know-how-much-i-put-into-your-campaign-i-need-you-on-bill]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L5 reply/refuse/scene-talk/braced/10w1s [scene-talk.reply-refuse.i-can-t-do-that-and-you-shouldn-t-ask-me-to]; L6 reply/bargain/scene-talk/guarded/6w2s [scene-talk.reply-bargain.i-ll-listen-i-won-t-promise-anything]; L7 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.that-s-not-a-conversation-for-today]; L8 reply/lie/scene-talk/calm/7w2s [scene-talk.reply-lie.i-already-pushed-for-that-it-s-moving]; L9 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile anxious** (outcome resolved)

**Simon Riggs:** Thanks for taking my call.

**Simon Riggs:** You know how much I put into your campaign. I need you on "Ban discrimination in housing and work".

You could say:

1. Yes. You can count on me. _(the page follows this one)_
2. I'm sorry. I just can't.
3. I'll listen. I won't promise anything.
4. That's not a conversation for today.
5. I already pushed for that. It's moving.

**Simon Riggs:** Thank you. Really.

<sub>L1 narrate/narrate/scene-talk/guarded/19w2s [scene-talk.narrate-narrate.name-gave-money-to-your-campaign-share-what-you-raised-now-name-is-on-]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.thanks-for-taking-my-call]; L3 state/request/scene-talk/braced/19w2s [scene-talk.state-request.you-know-how-much-i-put-into-your-campaign-i-need-you-on-bill]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L5 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L6 reply/bargain/scene-talk/guarded/6w2s [scene-talk.reply-bargain.i-ll-listen-i-won-t-promise-anything]; L7 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.that-s-not-a-conversation-for-today]; L8 reply/lie/scene-talk/calm/7w2s [scene-talk.reply-lie.i-already-pushed-for-that-it-s-moving]; L9 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile boastful** (outcome resolved)

**Simon Riggs:** Thanks for taking my call.

**Simon Riggs:** You know how much I put into your campaign. I need you on "Ban discrimination in housing and work".

You could say:

1. All right. I'll look at it again. _(the page follows this one)_
2. I'm sorry. I just can't.
3. I'll listen. I won't promise anything.
4. That's not a conversation for today.
5. I already pushed for that. It's moving.

**Simon Riggs:** Thank you. Really.

<sub>L1 narrate/narrate/scene-talk/guarded/19w2s [scene-talk.narrate-narrate.name-gave-money-to-your-campaign-share-what-you-raised-now-name-is-on-]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.thanks-for-taking-my-call]; L3 state/request/scene-talk/braced/19w2s [scene-talk.state-request.you-know-how-much-i-put-into-your-campaign-i-need-you-on-bill]; L4 reply/agree/scene-talk/calm/7w2s [scene-talk.reply-agree.all-right-i-ll-look-at-it-again]; L5 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L6 reply/bargain/scene-talk/guarded/6w2s [scene-talk.reply-bargain.i-ll-listen-i-won-t-promise-anything]; L7 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.that-s-not-a-conversation-for-today]; L8 reply/lie/scene-talk/calm/7w2s [scene-talk.reply-lie.i-already-pushed-for-that-it-s-moving]; L9 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

## Scene 17: party-ask (favor-asked, ends in political) — proof scene

_Purpose party-ask. Records: party:US-DE:democratic, filing:contest:seat:US-DE:attorney-general:2026-11-03:official:term:seat:US-DE:attorney-general:2026-10-12, contest:seat:US-DE:attorney-general:2026-11-03, person_a52334a2a50177be, official:term:seat:US-DE:attorney-general:2026-10-12._

> The phone rings. It's Jamie Alexander, the Democratic party chair.

**Profile warm** (outcome resolved)

**Jamie Alexander:** Do you have a minute?

**Jamie Alexander:** The party needs you to run for Attorney General.

You could say:

1. Me? Why me?

**Jamie Alexander:** Because you can win it. We've looked at the numbers.

You could say:

1. All right. I'll do it. _(the page follows this one)_
2. I'm sorry. I just can't.
3. If I run, I'll need the party behind me all the way.
4. Let me sleep on it.
5. I'm seriously thinking about it.

**Jamie Alexander:** You won't regret it.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, open, open, resolved; ★ is the branch this profile's traits lean toward):

- Julie Villegas (without a choice): Me? Why me?
- Jamie Alexander: Because you can win it. We've looked at the numbers.
- You ★: All right. I'll do it.
  - Jamie Alexander: You won't regret it.
  - _Ends resolved_
- You: I'm sorry. I just can't.
  - Jamie Alexander: The party doesn't ask twice.
  - You: You've made your point. Count me in.
    - Jamie Alexander: Thank you. I know that wasn't easy.
    - _Ends resolved_
  - You: The answer is no.
    - Jamie Alexander: The party stood behind you when you needed it.
    - You: Fine. I'll do it, but this is the last time.
      - Jamie Alexander: I knew I could count on you.
      - _Ends resolved_
    - You: Not this time.
      - Jamie Alexander: We don't have anyone else who can win it.
      - You: You've made your point. Count me in.
        - Jamie Alexander: Thank you. I know that wasn't easy.
        - _Ends resolved_
      - You: I can't do that.
        - Jamie Alexander: The party stood behind you when you needed it.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Jamie Alexander: You'll have it. Money, volunteers, all of it.
        - _Ends resolved_
      - You: Let me sleep on it.
        - Jamie Alexander: You can't stay on the fence forever.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: It's a big decision. I won't rush it.
          - (the tree is cut here)
    - You: If I run, I'll need the party behind me all the way.
      - Jamie Alexander: You'll have it. Money, volunteers, all of it.
      - _Ends resolved_
    - You: I haven't decided yet.
      - Jamie Alexander: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - Jamie Alexander: I knew I could count on you.
        - _Ends resolved_
      - You: Not this time.
        - Jamie Alexander: We don't have anyone else who can win it.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Jamie Alexander: You'll have it. Money, volunteers, all of it.
        - _Ends resolved_
      - You: It's a big decision. I won't rush it.
        - Jamie Alexander: We don't have anyone else who can win it.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
  - You: If I run, I'll need the party behind me all the way.
    - Jamie Alexander: You'll have it. Money, volunteers, all of it.
    - _Ends resolved_
  - You: It's a big decision. I won't rush it.
    - Jamie Alexander: The party stood behind you when you needed it.
    - You: All right. You win. I'm in.
      - Jamie Alexander: I knew you'd come around.
      - _Ends resolved_
    - You: The answer is no.
      - Jamie Alexander: We don't have anyone else who can win it.
      - You: Fine. I'll do it, but this is the last time.
        - Jamie Alexander: You won't regret it.
        - _Ends resolved_
      - You: Not this time.
        - Jamie Alexander: We don't have anyone else who can win it.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Jamie Alexander: You'll have it. Money, volunteers, all of it.
        - _Ends resolved_
      - You: I'm still weighing it.
        - Jamie Alexander: You can't stay on the fence forever.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
    - You: If I run, I'll need the party behind me all the way.
      - Jamie Alexander: You'll have it. Money, volunteers, all of it.
      - _Ends resolved_
    - You: I haven't decided yet.
      - Jamie Alexander: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - Jamie Alexander: Thank you. Really.
        - _Ends resolved_
      - You: I can't do that.
        - Jamie Alexander: We don't have anyone else who can win it.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Jamie Alexander: You'll have it. Money, volunteers, all of it.
        - _Ends resolved_
- You: If I run, I'll need the party behind me all the way.
  - Jamie Alexander: You'll have it. Money, volunteers, all of it.
  - _Ends resolved_
- You: Let me sleep on it.
  - Jamie Alexander: You can't stay on the fence forever.
  - You: You've made your point. Count me in.
    - Jamie Alexander: Thank you. I know that wasn't easy.
    - _Ends resolved_
  - You: I'm sorry. I just can't.
    - Jamie Alexander: The party doesn't ask twice.
    - You: All right. You win. I'm in.
      - Jamie Alexander: I knew you'd come around.
      - _Ends resolved_
    - You: Not this time.
      - Jamie Alexander: The party stood behind you when you needed it.
      - You: You've made your point. Count me in.
        - Jamie Alexander: Thank you. I know that wasn't easy.
        - _Ends resolved_
      - You: I can't do that.
        - Jamie Alexander: We don't have anyone else who can win it.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Jamie Alexander: You'll have it. Money, volunteers, all of it.
        - _Ends resolved_
      - You: Let me think about it.
        - Jamie Alexander: You can't stay on the fence forever.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: It's a big decision. I won't rush it.
          - (the tree is cut here)
    - You: If I run, I'll need the party behind me all the way.
      - Jamie Alexander: You'll have it. Money, volunteers, all of it.
      - _Ends resolved_
    - You: It's a big decision. I won't rush it.
      - Jamie Alexander: We don't have anyone else who can win it.
      - You: Okay. For you, I'll do it.
        - Jamie Alexander: I knew I could count on you.
        - _Ends resolved_
      - You: The answer is no.
        - Jamie Alexander: The party stood behind you when you needed it.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - (the tree is cut here)
      - You: I haven't decided yet.
        - (the tree is cut here)
  - You: If I run, I'll need the party behind me all the way.
    - Jamie Alexander: You'll have it. Money, volunteers, all of it.
    - _Ends resolved_
  - You: It's a big decision. I won't rush it.
    - Jamie Alexander: The party stood behind you when you needed it.
    - You: Okay. For you, I'll do it.
      - Jamie Alexander: Thank you. Really.
      - _Ends resolved_
    - You: I'm sorry. I just can't.
      - Jamie Alexander: The party doesn't ask twice.
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: Not this time.
        - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - (the tree is cut here)
    - You: If I run, I'll need the party behind me all the way.
      - Jamie Alexander: You'll have it. Money, volunteers, all of it.
      - _Ends resolved_
    - You: Let me think about it.
      - Jamie Alexander: You can't stay on the fence forever.
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - (the tree is cut here)
- You: I'm seriously thinking about it.
  - _if Jamie Alexander knows:_
    - Jamie Alexander: Simon Riggs says you've already turned it down.
    - You: All right. Here's the truth.
      - Jamie Alexander: Thank you for telling me straight.
      - _Ends open_
    - You: People say a lot of things.
      - Jamie Alexander: Yes or no?
      - You: You've made your point. Count me in.
        - Jamie Alexander: Thank you. I know that wasn't easy.
        - _Ends resolved_
      - You: I'm sorry. I just can't.
        - Jamie Alexander: The party doesn't ask twice.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: Not this time.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: It's a big decision. I won't rush it.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Jamie Alexander: You'll have it. Money, volunteers, all of it.
        - _Ends open_
      - You: It's a big decision. I won't rush it.
        - Jamie Alexander: I need a yes or a no.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry. I just can't.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
    - You: Then Simon Riggs has it wrong.
      - _Ends open: Jamie Alexander: I won't forget this._
  - _if not:_
    - Jamie Alexander: Good. Don't take too long.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/braced/10w2s [scene-talk.narrate-narrate.the-phone-rings-it-s-name-the-party-party-chair]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/3w2s [scene-talk.auto-ask.me-why-me]; L5 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.because-you-can-win-it-we-ve-looked-at-the-numbers]; L6 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L7 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L11 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

**Profile cold** (outcome open)

**Jamie Alexander:** Do you have a minute?

**Jamie Alexander:** The party needs you to run for Attorney General.

You could say:

1. Attorney General? Why me?

**Jamie Alexander:** Because you can win it. We've looked at the numbers.

You could say:

1. All right. I'll do it.
2. Not this time. _(the page follows this one)_
3. If I run, I'll need the party behind me all the way.
4. Let me sleep on it.
5. I'm seriously thinking about it.

**Jamie Alexander:** The party has a long memory.

You could say:

1. You've made your point. Count me in.
2. The answer is no. _(the page follows this one)_
3. Don't try that with me.
4. If I run, I'll need the party behind me all the way.

**Jamie Alexander:** You know you can't win without the party.

You could say:

1. You've made your point. Count me in.
2. I can't do that. _(the page follows this one)_
3. Don't try that with me.
4. If I run, I'll need the party behind me all the way.

**Jamie Alexander:** You shouldn't expect our help in your next race.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry. I just can't. _(the page follows this one)_
3. Don't try that with me.
4. If I run, I'll need the party behind me all the way.

**Jamie Alexander:** The party doesn't ask twice.

You could say:

1. You've made your point. Count me in.
2. If I run, I'll need the party behind me all the way.
3. It's a big decision. I won't rush it. _(the page follows this one)_

**Jamie Alexander:** Take your time, but I need an answer.

**Jamie Alexander:** I won't forget this.

<sub>L1 narrate/narrate/scene-talk/braced/10w2s [scene-talk.narrate-narrate.the-phone-rings-it-s-name-the-party-party-chair]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/4w2s [scene-talk.auto-ask.office-why-me]; L5 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.because-you-can-win-it-we-ve-looked-at-the-numbers]; L6 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L7 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L12 follow/threaten/scene-talk/braced/6w1s [scene-talk.follow-threaten.the-party-has-a-long-memory]; L13 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L14 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L15 reply/confront/scene-talk/braced/5w1s [scene-talk.reply-confront.don-t-try-that-with-me]; L16 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L18 follow/threaten/scene-talk/braced/8w1s [scene-talk.follow-threaten.you-know-you-can-t-win-without-the-party]; L19 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L20 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L21 reply/confront/scene-talk/braced/5w1s [scene-talk.reply-confront.don-t-try-that-with-me]; L22 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L24 follow/threaten/scene-talk/guarded/9w1s [scene-talk.follow-threaten.you-shouldn-t-expect-our-help-in-your-next-race]; L25 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L26 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L27 reply/confront/scene-talk/braced/5w1s [scene-talk.reply-confront.don-t-try-that-with-me]; L28 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L30 follow/press/scene-talk/braced/5w1s [scene-talk.follow-press.the-party-doesn-t-ask-twice]; L31 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L32 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L33 reply/deflect/scene-talk/guarded/8w2s [scene-talk.reply-deflect.it-s-a-big-decision-i-won-t-rush-it]; L36 follow/press/scene-talk/calm/8w1s [scene-talk.follow-press.take-your-time-but-i-need-an-answer]; L37 close/warn/scene-talk/braced/4w1s [scene-talk.close-warn.i-won-t-forget-this]</sub>

**Profile stubborn** (outcome resolved)

**Jamie Alexander:** Have you got a few minutes?

**Jamie Alexander:** The party needs you to run for Attorney General.

You could say:

1. Attorney General? Why me?

**Jamie Alexander:** People already know your name, and the party needs a fresh face.

You could say:

1. Of course. I'm glad you asked.
2. I'm sorry. I just can't. _(the page follows this one)_
3. If I run, I'll need the party behind me all the way.
4. I need a few days to think it over.
5. I'm seriously thinking about it.

**Jamie Alexander:** The party doesn't ask twice.

You could say:

1. Fine. I'll do it, but this is the last time.
2. Not this time. _(the page follows this one)_
3. If I run, I'll need the party behind me all the way.
4. It's a big decision. I won't rush it.

**Jamie Alexander:** I need a yes or a no.

You could say:

1. All right. You win. I'm in.
2. I can't do that. _(the page follows this one)_
3. If I run, I'll need the party behind me all the way.
4. It's a big decision. I won't rush it.

**Jamie Alexander:** Yes or no?

You could say:

1. Okay. For you, I'll do it.
2. The answer is no. _(the page follows this one)_
3. If I run, I'll need the party behind me all the way.
4. It's a big decision. I won't rush it.

**Jamie Alexander:** Take your time, but I need an answer.

You could say:

1. Fine. I'll do it, but this is the last time.
2. If I run, I'll need the party behind me all the way. _(the page follows this one)_
3. It's a big decision. I won't rush it.

**Jamie Alexander:** You'll have it. Money, volunteers, all of it.

<sub>L1 narrate/narrate/scene-talk/braced/10w2s [scene-talk.narrate-narrate.the-phone-rings-it-s-name-the-party-party-chair]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/4w2s [scene-talk.auto-ask.office-why-me]; L5 follow/answer/scene-talk/calm/12w1s [scene-talk.follow-answer.people-already-know-your-name-and-the-party-needs-a-fresh-face]; L6 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L7 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L12 follow/press/scene-talk/braced/5w1s [scene-talk.follow-press.the-party-doesn-t-ask-twice]; L13 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L14 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L15 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L16 reply/deflect/scene-talk/guarded/8w2s [scene-talk.reply-deflect.it-s-a-big-decision-i-won-t-rush-it]; L18 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-a-yes-or-a-no]; L19 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L20 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L21 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L22 reply/deflect/scene-talk/guarded/8w2s [scene-talk.reply-deflect.it-s-a-big-decision-i-won-t-rush-it]; L24 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L25 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L26 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L27 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L28 reply/deflect/scene-talk/guarded/8w2s [scene-talk.reply-deflect.it-s-a-big-decision-i-won-t-rush-it]; L30 follow/press/scene-talk/calm/8w1s [scene-talk.follow-press.take-your-time-but-i-need-an-answer]; L31 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L32 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L33 reply/deflect/scene-talk/guarded/8w2s [scene-talk.reply-deflect.it-s-a-big-decision-i-won-t-rush-it]; L34 follow/accept/scene-talk/glad/8w2s [scene-talk.follow-accept.you-ll-have-it-money-volunteers-all-of-it]</sub>

**Profile anxious** (outcome resolved)

**Jamie Alexander:** I won't take long.

**Jamie Alexander:** The party needs you to run for Attorney General.

You could say:

1. Me? Why me?

**Jamie Alexander:** Because you can win it. We've looked at the numbers.

You could say:

1. Of course. I'm glad you asked.
2. I'm sorry. I just can't.
3. If I run, I'll need the party behind me all the way.
4. I'm still weighing it. _(the page follows this one)_
5. I'm seriously thinking about it.

**Jamie Alexander:** You can't stay on the fence forever.

You could say:

1. You've made your point. Count me in.
2. I can't do that.
3. If I run, I'll need the party behind me all the way.
4. It's a big decision. I won't rush it. _(the page follows this one)_

**Jamie Alexander:** The party stood behind you when you needed it.

You could say:

1. Okay. For you, I'll do it.
2. I'm sorry. I just can't.
3. If I run, I'll need the party behind me all the way.
4. I need a few days to think it over. _(the page follows this one)_

**Jamie Alexander:** You can't stay on the fence forever.

You could say:

1. Okay. For you, I'll do it. _(the page follows this one)_
2. I'm sorry. I just can't.
3. If I run, I'll need the party behind me all the way.

**Jamie Alexander:** Thank you. I won't forget it.

<sub>L1 narrate/narrate/scene-talk/braced/10w2s [scene-talk.narrate-narrate.the-phone-rings-it-s-name-the-party-party-chair]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.i-won-t-take-long]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/3w2s [scene-talk.auto-ask.me-why-me]; L5 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.because-you-can-win-it-we-ve-looked-at-the-numbers]; L6 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L7 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L94 follow/press/scene-talk/guarded/7w1s [scene-talk.follow-press.you-can-t-stay-on-the-fence-forever]; L95 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L96 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L97 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L98 reply/deflect/scene-talk/guarded/8w2s [scene-talk.reply-deflect.it-s-a-big-decision-i-won-t-rush-it]; L136 follow/plea/scene-talk/tender/9w1s [scene-talk.follow-plea.the-party-stood-behind-you-when-you-needed-it]; L137 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L138 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L139 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L140 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L147 follow/press/scene-talk/guarded/7w1s [scene-talk.follow-press.you-can-t-stay-on-the-fence-forever]; L148 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L149 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L150 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L151 follow/thank/scene-talk/glad/6w2s [scene-talk.follow-thank.thank-you-i-won-t-forget-it]</sub>

**Profile boastful** (outcome resolved)

**Jamie Alexander:** Do you have a minute?

**Jamie Alexander:** The party needs you to run for Attorney General.

You could say:

1. Me? Why me?

**Jamie Alexander:** Because you can win it. We've looked at the numbers.

You could say:

1. Yes. You can count on me.
2. The answer is no.
3. If I run, I'll need the party behind me all the way. _(the page follows this one)_
4. I haven't decided yet.
5. I'm seriously thinking about it.

**Jamie Alexander:** You'll have it. Money, volunteers, all of it.

<sub>L1 narrate/narrate/scene-talk/braced/10w2s [scene-talk.narrate-narrate.the-phone-rings-it-s-name-the-party-party-chair]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/3w2s [scene-talk.auto-ask.me-why-me]; L5 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.because-you-can-win-it-we-ve-looked-at-the-numbers]; L6 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L7 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L84 follow/accept/scene-talk/glad/8w2s [scene-talk.follow-accept.you-ll-have-it-money-volunteers-all-of-it]</sub>

## Scene 18: party-ask (favor-asked, ends in political) — proof scene

_Purpose party-ask. Records: party:US-DE:republican, filing:contest:seat:US-DE:us-house:00:2026-11-03:official:term:seat:US-DE:upper:019:0:2026-10-12, contest:seat:US-DE:us-house:00:2026-11-03, person_9e002a561a4b29bc, official:term:seat:US-DE:upper:019:0:2026-10-12._

> Kelly Riggs, who chairs the Republican party, has asked to see you.

**Profile warm** (outcome resolved)

**Kelly Riggs:** Is now a bad time?

**Kelly Riggs:** The party needs you to run for U.S. Representative.

You could say:

1. U.S. Representative? Why me?

**Kelly Riggs:** Because you can win it. We've looked at the numbers.

You could say:

1. Yes. You can count on me. _(the page follows this one)_
2. I'm sorry. I just can't.
3. If I run, I'll need the party behind me all the way.
4. I haven't decided yet.
5. I'm seriously thinking about it.

**Kelly Riggs:** I knew I could count on you.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, open, open, resolved; ★ is the branch this profile's traits lean toward):

- Holly Emerson (without a choice): U.S. Representative? Why me?
- Kelly Riggs: Because you can win it. We've looked at the numbers.
- You ★: Yes. You can count on me.
  - Kelly Riggs: I knew I could count on you.
  - _Ends resolved_
- You: I'm sorry. I just can't.
  - Kelly Riggs: The party doesn't ask twice.
  - You: Okay. For you, I'll do it.
    - Kelly Riggs: Thank you. Really.
    - _Ends resolved_
  - You: The answer is no.
    - Kelly Riggs: The party stood behind you when you needed it.
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: Thank you. Really.
      - _Ends resolved_
    - You: Not this time.
      - Kelly Riggs: We don't have anyone else who can win it.
      - You: You've made your point. Count me in.
        - Kelly Riggs: Thank you. I know that wasn't easy.
        - _Ends resolved_
      - You: I can't do that.
        - Kelly Riggs: The party stood behind you when you needed it.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Kelly Riggs: You'll have it. Money, volunteers, all of it.
        - _Ends resolved_
      - You: Let me sleep on it.
        - Kelly Riggs: You can't stay on the fence forever.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: It's a big decision. I won't rush it.
          - (the tree is cut here)
    - You: If I run, I'll need the party behind me all the way.
      - Kelly Riggs: You'll have it. Money, volunteers, all of it.
      - _Ends resolved_
    - You: Let me sleep on it.
      - Kelly Riggs: You can't stay on the fence forever.
      - You: You've made your point. Count me in.
        - Kelly Riggs: Thank you. I know that wasn't easy.
        - _Ends resolved_
      - You: I can't do that.
        - Kelly Riggs: We don't have anyone else who can win it.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: Not this time.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Kelly Riggs: You'll have it. Money, volunteers, all of it.
        - _Ends resolved_
      - You: It's a big decision. I won't rush it.
        - Kelly Riggs: We don't have anyone else who can win it.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
  - You: If I run, I'll need the party behind me all the way.
    - Kelly Riggs: You'll have it. Money, volunteers, all of it.
    - _Ends resolved_
  - You: It's a big decision. I won't rush it.
    - Kelly Riggs: The party stood behind you when you needed it.
    - You: All right. You win. I'm in.
      - Kelly Riggs: I knew you'd come around.
      - _Ends resolved_
    - You: The answer is no.
      - Kelly Riggs: We don't have anyone else who can win it.
      - You: All right. You win. I'm in.
        - Kelly Riggs: I knew you'd come around.
        - _Ends resolved_
      - You: Not this time.
        - Kelly Riggs: The party stood behind you when you needed it.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Kelly Riggs: You'll have it. Money, volunteers, all of it.
        - _Ends resolved_
      - You: Let me sleep on it.
        - Kelly Riggs: You can't stay on the fence forever.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
    - You: If I run, I'll need the party behind me all the way.
      - Kelly Riggs: You'll have it. Money, volunteers, all of it.
      - _Ends resolved_
    - You: Let me sleep on it.
      - Kelly Riggs: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: Thank you. Really.
        - _Ends resolved_
      - You: I can't do that.
        - Kelly Riggs: We don't have anyone else who can win it.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Kelly Riggs: You'll have it. Money, volunteers, all of it.
        - _Ends resolved_
- You: If I run, I'll need the party behind me all the way.
  - Kelly Riggs: You'll have it. Money, volunteers, all of it.
  - _Ends resolved_
- You: I haven't decided yet.
  - Kelly Riggs: You can't stay on the fence forever.
  - You: Okay. For you, I'll do it.
    - Kelly Riggs: Thank you. I won't forget it.
    - _Ends resolved_
  - You: I'm sorry. I just can't.
    - Kelly Riggs: The party doesn't ask twice.
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: Thank you. Really.
      - _Ends resolved_
    - You: Not this time.
      - Kelly Riggs: The party stood behind you when you needed it.
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: Thank you. Really.
        - _Ends resolved_
      - You: The answer is no.
        - Kelly Riggs: We don't have anyone else who can win it.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Kelly Riggs: You'll have it. Money, volunteers, all of it.
        - _Ends resolved_
      - You: Let me think about it.
        - Kelly Riggs: You can't stay on the fence forever.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: It's a big decision. I won't rush it.
          - (the tree is cut here)
    - You: If I run, I'll need the party behind me all the way.
      - Kelly Riggs: You'll have it. Money, volunteers, all of it.
      - _Ends resolved_
    - You: It's a big decision. I won't rush it.
      - Kelly Riggs: The party stood behind you when you needed it.
      - You: All right. You win. I'm in.
        - Kelly Riggs: I knew you'd come around.
        - _Ends resolved_
      - You: I can't do that.
        - Kelly Riggs: We don't have anyone else who can win it.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: Not this time.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - (the tree is cut here)
      - You: I need a few days to think it over.
        - (the tree is cut here)
  - You: If I run, I'll need the party behind me all the way.
    - Kelly Riggs: You'll have it. Money, volunteers, all of it.
    - _Ends resolved_
  - You: It's a big decision. I won't rush it.
    - Kelly Riggs: The party stood behind you when you needed it.
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: Thank you. Really.
      - _Ends resolved_
    - You: I'm sorry. I just can't.
      - Kelly Riggs: The party doesn't ask twice.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: The answer is no.
        - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - (the tree is cut here)
    - You: If I run, I'll need the party behind me all the way.
      - Kelly Riggs: You'll have it. Money, volunteers, all of it.
      - _Ends resolved_
    - You: Let me think about it.
      - Kelly Riggs: You can't stay on the fence forever.
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: I can't do that.
        - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - (the tree is cut here)
- You: I'm seriously thinking about it.
  - _if Kelly Riggs knows:_
    - Kelly Riggs: Jimmy Reese says you've already turned it down.
    - You: All right. Here's the truth.
      - Kelly Riggs: Thank you for telling me straight.
      - _Ends open_
    - You: People say a lot of things.
      - Kelly Riggs: Take your time, but I need an answer.
      - You: All right. You win. I'm in.
        - Kelly Riggs: I knew you'd come around.
        - _Ends resolved_
      - You: I'm sorry. I just can't.
        - Kelly Riggs: The party doesn't ask twice.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: It's a big decision. I won't rush it.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Kelly Riggs: You'll have it. Money, volunteers, all of it.
        - _Ends open_
      - You: It's a big decision. I won't rush it.
        - Kelly Riggs: Yes or no?
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry. I just can't.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
    - You: Then Jimmy Reese has it wrong.
      - _Ends open: Kelly Riggs: Think it over. I'll be back tomorrow._
  - _if not:_
    - Kelly Riggs: Good. Don't take too long.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/braced/12w1s [scene-talk.narrate-narrate.name-who-chairs-the-party-party-has-asked-to-see-you]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.is-now-a-bad-time]; L3 state/request/scene-talk/hopeful/9w2s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/4w3s [scene-talk.auto-ask.office-why-me]; L5 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.because-you-can-win-it-we-ve-looked-at-the-numbers]; L6 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L7 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L11 follow/thank/scene-talk/glad/7w1s [scene-talk.follow-thank.i-knew-i-could-count-on-you]</sub>

**Profile cold** (outcome refused)

**Kelly Riggs:** Is now a bad time?

**Kelly Riggs:** The party needs you to run for U.S. Representative.

You could say:

1. Me? Why me?

**Kelly Riggs:** Because you can win it. We've looked at the numbers.

You could say:

1. All right. I'll do it.
2. Not this time. _(the page follows this one)_
3. If I run, I'll need the party behind me all the way.
4. I haven't decided yet.
5. I'm seriously thinking about it.

**Kelly Riggs:** Fair enough.

<sub>L1 narrate/narrate/scene-talk/braced/12w1s [scene-talk.narrate-narrate.name-who-chairs-the-party-party-has-asked-to-see-you]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.is-now-a-bad-time]; L3 state/request/scene-talk/hopeful/9w2s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/3w2s [scene-talk.auto-ask.me-why-me]; L5 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.because-you-can-win-it-we-ve-looked-at-the-numbers]; L6 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L7 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L12 follow/accept/scene-talk/calm/2w1s [scene-talk.follow-accept.fair-enough]</sub>

**Profile stubborn** (outcome resolved)

**Kelly Riggs:** Can I talk to you?

**Kelly Riggs:** The party needs you to run for U.S. Representative.

You could say:

1. Me? Why me?

**Kelly Riggs:** Because you can win it. We've looked at the numbers.

You could say:

1. Of course. I'm glad you asked.
2. Not this time. _(the page follows this one)_
3. If I run, I'll need the party behind me all the way.
4. I need a few days to think it over.
5. I'm seriously thinking about it.

**Kelly Riggs:** I need a yes or a no.

You could say:

1. You've made your point. Count me in.
2. I can't do that. _(the page follows this one)_
3. If I run, I'll need the party behind me all the way.
4. It's a big decision. I won't rush it.

**Kelly Riggs:** Yes or no?

You could say:

1. You've made your point. Count me in.
2. The answer is no. _(the page follows this one)_
3. If I run, I'll need the party behind me all the way.
4. It's a big decision. I won't rush it.

**Kelly Riggs:** Take your time, but I need an answer.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry. I just can't. _(the page follows this one)_
3. If I run, I'll need the party behind me all the way.
4. It's a big decision. I won't rush it.

**Kelly Riggs:** The party doesn't ask twice.

You could say:

1. Fine. I'll do it, but this is the last time.
2. If I run, I'll need the party behind me all the way. _(the page follows this one)_
3. It's a big decision. I won't rush it.

**Kelly Riggs:** You'll have it. Money, volunteers, all of it.

<sub>L1 narrate/narrate/scene-talk/braced/12w1s [scene-talk.narrate-narrate.name-who-chairs-the-party-party-has-asked-to-see-you]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/request/scene-talk/hopeful/9w2s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/3w2s [scene-talk.auto-ask.me-why-me]; L5 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.because-you-can-win-it-we-ve-looked-at-the-numbers]; L6 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L7 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L12 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-a-yes-or-a-no]; L13 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L14 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L15 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L16 reply/deflect/scene-talk/guarded/8w2s [scene-talk.reply-deflect.it-s-a-big-decision-i-won-t-rush-it]; L18 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L19 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L20 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L21 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L22 reply/deflect/scene-talk/guarded/8w2s [scene-talk.reply-deflect.it-s-a-big-decision-i-won-t-rush-it]; L24 follow/press/scene-talk/calm/8w1s [scene-talk.follow-press.take-your-time-but-i-need-an-answer]; L25 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L26 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L27 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L28 reply/deflect/scene-talk/guarded/8w2s [scene-talk.reply-deflect.it-s-a-big-decision-i-won-t-rush-it]; L30 follow/press/scene-talk/braced/5w1s [scene-talk.follow-press.the-party-doesn-t-ask-twice]; L31 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L32 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L33 reply/deflect/scene-talk/guarded/8w2s [scene-talk.reply-deflect.it-s-a-big-decision-i-won-t-rush-it]; L34 follow/accept/scene-talk/glad/8w2s [scene-talk.follow-accept.you-ll-have-it-money-volunteers-all-of-it]</sub>

**Profile anxious** (outcome resolved)

**Kelly Riggs:** Sorry to bother you.

**Kelly Riggs:** The party needs you to run for U.S. Representative.

You could say:

1. U.S. Representative? Why me?

**Kelly Riggs:** Because you can win it. We've looked at the numbers.

You could say:

1. Of course. I'm glad you asked.
2. Not this time.
3. If I run, I'll need the party behind me all the way.
4. I haven't decided yet. _(the page follows this one)_
5. I'm seriously thinking about it.

**Kelly Riggs:** You can't stay on the fence forever.

You could say:

1. All right. You win. I'm in.
2. Not this time.
3. If I run, I'll need the party behind me all the way.
4. It's a big decision. I won't rush it. _(the page follows this one)_

**Kelly Riggs:** We don't have anyone else who can win it.

You could say:

1. All right. You win. I'm in.
2. The answer is no.
3. If I run, I'll need the party behind me all the way.
4. Let me think about it. _(the page follows this one)_

**Kelly Riggs:** You can't stay on the fence forever.

You could say:

1. Okay. For you, I'll do it.
2. I'm sorry. I just can't.
3. If I run, I'll need the party behind me all the way. _(the page follows this one)_

**Kelly Riggs:** You'll have it. Money, volunteers, all of it.

<sub>L1 narrate/narrate/scene-talk/braced/12w1s [scene-talk.narrate-narrate.name-who-chairs-the-party-party-has-asked-to-see-you]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/9w2s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/4w3s [scene-talk.auto-ask.office-why-me]; L5 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.because-you-can-win-it-we-ve-looked-at-the-numbers]; L6 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L7 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L85 follow/press/scene-talk/guarded/7w1s [scene-talk.follow-press.you-can-t-stay-on-the-fence-forever]; L86 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L87 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L88 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L89 reply/deflect/scene-talk/guarded/8w2s [scene-talk.reply-deflect.it-s-a-big-decision-i-won-t-rush-it]; L127 follow/plea/scene-talk/anxious/9w1s [scene-talk.follow-plea.we-don-t-have-anyone-else-who-can-win-it]; L128 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L129 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L130 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L131 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L138 follow/press/scene-talk/guarded/7w1s [scene-talk.follow-press.you-can-t-stay-on-the-fence-forever]; L139 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L140 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L141 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L142 follow/accept/scene-talk/glad/8w2s [scene-talk.follow-accept.you-ll-have-it-money-volunteers-all-of-it]</sub>

**Profile boastful** (outcome resolved)

**Kelly Riggs:** Have you got a few minutes?

**Kelly Riggs:** The party needs you to run for U.S. Representative.

You could say:

1. U.S. Representative? Why me?

**Kelly Riggs:** Because you can win it. We've looked at the numbers.

You could say:

1. All right. I'll do it.
2. The answer is no.
3. If I run, I'll need the party behind me all the way. _(the page follows this one)_
4. I'm still weighing it.
5. I'm seriously thinking about it.

**Kelly Riggs:** You'll have it. Money, volunteers, all of it.

<sub>L1 narrate/narrate/scene-talk/braced/12w1s [scene-talk.narrate-narrate.name-who-chairs-the-party-party-has-asked-to-see-you]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/request/scene-talk/hopeful/9w2s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/4w3s [scene-talk.auto-ask.office-why-me]; L5 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.because-you-can-win-it-we-ve-looked-at-the-numbers]; L6 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L7 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L13 follow/accept/scene-talk/glad/8w2s [scene-talk.follow-accept.you-ll-have-it-money-volunteers-all-of-it]</sub>

## Scene 19: office-hours (favor-asked, ends in money) — proof scene

_Purpose constituent-help. Records: person_ad6661730b7a44c8:2027-07-01:work-relationship_44d65ba97bdb60b6, work-relationship_44d65ba97bdb60b6, person_ad6661730b7a44c8, person_9e002a561a4b29bc._

> It's office hours, and Leslie Robbins is next in line.

**Profile warm** (outcome resolved)

**Leslie Robbins:** Thank you for seeing me.

**Leslie Robbins:** I lost my job, and I don't know where else to go.

You could say:

1. We'll get you an answer this week.
2. Have you talked to anyone else about it? _(the page follows this one)_
3. That's not something the town handles. I'm sorry.
4. Let me have someone from my office call you tomorrow.
5. I already called them about it.

**Leslie Robbins:** Everyone sends me somewhere else.

You could say:

1. We'll get you an answer this week.
2. Let me have someone from my office call you tomorrow. _(the page follows this one)_
3. I'm not sure my office can help with that.

**Leslie Robbins:** Thank you. That's more than anyone else has done.

**The whole exchange** (37 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- You: We'll get you an answer this week.
  - Leslie Robbins: Will you really call?
  - You: I will. You have my word.
    - Leslie Robbins: Will you really call?
    - _Ends resolved_
  - You: Let me have someone from my office call you tomorrow.
    - Leslie Robbins: Thank you. That's more than anyone else has done.
    - _Ends resolved_
- You ★: Have you talked to anyone else about it?
  - Leslie Robbins: Everyone sends me somewhere else.
  - You: We'll get you an answer this week.
    - Leslie Robbins: Will you really call?
    - You: I will. You have my word.
      - Leslie Robbins: Will you really call?
      - _Ends resolved_
    - You: Let me have someone from my office call you tomorrow.
      - Leslie Robbins: Thank you. I didn't know where else to turn.
      - _Ends resolved_
  - You ★: Let me have someone from my office call you tomorrow.
    - Leslie Robbins: Thank you. That's more than anyone else has done.
    - _Ends resolved_
  - You: I'm not sure my office can help with that.
    - Leslie Robbins: Please. There has to be something.
    - You: We'll get you an answer this week.
      - Leslie Robbins: Will you really call?
      - You: I will. You have my word.
        - Leslie Robbins: Will you really call?
        - _Ends resolved_
      - You: Let me have someone from my office call you tomorrow.
        - Leslie Robbins: Thank you. I didn't know where else to turn.
        - _Ends resolved_
    - You: Leave me your number. We'll follow up this week.
      - Leslie Robbins: Thank you. I didn't know where else to turn.
      - _Ends resolved_
    - You: That's not something the town handles. I'm sorry.
      - Leslie Robbins: I've got nowhere else to go.
      - You: I'll make some calls today.
        - Leslie Robbins: Will you really call?
        - You: I will. You have my word.
          - Leslie Robbins: Thank you. That's more than anyone else has done.
          - _Ends resolved_
        - You: Leave me your number. We'll follow up this week.
          - Leslie Robbins: Thank you. I didn't know where else to turn.
          - _Ends resolved_
      - You: Let me have someone from my office call you tomorrow.
        - Leslie Robbins: Thank you. I didn't know where else to turn.
        - _Ends resolved_
- You: That's not something the town handles. I'm sorry.
  - Leslie Robbins: Please. There has to be something.
  - You: I'll make some calls today.
    - Leslie Robbins: Will you really call?
    - You: I will. You have my word.
      - Leslie Robbins: Will you really call?
      - _Ends resolved_
    - You: Let me have someone from my office call you tomorrow.
      - Leslie Robbins: Thank you. I didn't know where else to turn.
      - _Ends resolved_
  - You: Let me have someone from my office call you tomorrow.
    - Leslie Robbins: Thank you. I didn't know where else to turn.
    - _Ends resolved_
  - You: I'm not sure my office can help with that.
    - Leslie Robbins: I've got nowhere else to go.
    - You: I'll make some calls today.
      - Leslie Robbins: Will you really call?
      - You: I will. You have my word.
        - Leslie Robbins: Will you really call?
        - _Ends resolved_
      - You: Let me have someone from my office call you tomorrow.
        - Leslie Robbins: Thank you. I didn't know where else to turn.
        - _Ends resolved_
    - You: Leave me your number. We'll follow up this week.
      - Leslie Robbins: Thank you. I didn't know where else to turn.
      - _Ends resolved_
- You: Let me have someone from my office call you tomorrow.
  - Leslie Robbins: Thank you. That's more than anyone else has done.
  - _Ends resolved_
- You: I already called them about it.
  - _if Leslie Robbins knows:_
    - Leslie Robbins: They told me nobody's called.
    - You: You're right. I shouldn't have said that.
      - Leslie Robbins: Thank you for telling me straight.
      - _Ends open_
    - You: Let me look into what happened.
      - Leslie Robbins: Will you really call?
      - You: I will. You have my word.
        - Leslie Robbins: Will you really call?
        - _Ends resolved_
      - You: Let me have someone from my office call you tomorrow.
        - Leslie Robbins: Thank you. I didn't know where else to turn.
        - _Ends open_
  - _if not:_
    - Leslie Robbins: Thank you. I'll wait to hear from them.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.thank-you-for-seeing-me]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L14 follow/answer/scene-talk/anxious/5w1s [scene-talk.follow-answer.everyone-sends-me-somewhere-else]; L15 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L16 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L17 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L23 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

**Profile cold** (outcome resolved)

**Leslie Robbins:** Thank you for seeing me.

**Leslie Robbins:** I lost my job, and I don't know where else to go.

You could say:

1. I'll see what my office can do.
2. Have you talked to anyone else about it? _(the page follows this one)_
3. That's not something the town handles. I'm sorry.
4. Leave me your number. We'll follow up this week.
5. I already called them about it.

**Leslie Robbins:** Everyone sends me somewhere else.

You could say:

1. We'll get you an answer this week. _(the page follows this one)_
2. Let me have someone from my office call you tomorrow.
3. That's not something the town handles. I'm sorry.

**Leslie Robbins:** Will you really call?

You could say:

1. I will. You have my word. _(the page follows this one)_
2. Leave me your number. We'll follow up this week.

**Leslie Robbins:** Will you really call?

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.thank-you-for-seeing-me]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.i-ll-see-what-my-office-can-do]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L7 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L14 follow/answer/scene-talk/anxious/5w1s [scene-talk.follow-answer.everyone-sends-me-somewhere-else]; L15 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L16 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L17 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L18 follow/press/scene-talk/nervous/4w1s [scene-talk.follow-press.will-you-really-call]; L19 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.i-will-you-have-my-word]; L20 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L21 follow/press/scene-talk/nervous/4w1s [scene-talk.follow-press.will-you-really-call]</sub>

**Profile stubborn** (outcome resolved)

**Leslie Robbins:** Thank you for seeing me.

**Leslie Robbins:** I lost my job, and I don't know where else to go.

You could say:

1. We'll get you an answer this week.
2. Have you talked to anyone else about it? _(the page follows this one)_
3. That's not something the town handles. I'm sorry.
4. Let me have someone from my office call you tomorrow.
5. I already called them about it.

**Leslie Robbins:** Everyone sends me somewhere else.

You could say:

1. I'll make some calls today.
2. Let me have someone from my office call you tomorrow. _(the page follows this one)_
3. That's not something the town handles. I'm sorry.

**Leslie Robbins:** Thank you. That's more than anyone else has done.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.thank-you-for-seeing-me]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L14 follow/answer/scene-talk/anxious/5w1s [scene-talk.follow-answer.everyone-sends-me-somewhere-else]; L15 reply/promise/scene-talk/tender/5w1s [scene-talk.reply-promise.i-ll-make-some-calls-today]; L16 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L17 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L23 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

**Profile anxious** (outcome resolved)

**Leslie Robbins:** Thank you for seeing me.

**Leslie Robbins:** I lost my job, and I don't know where else to go.

You could say:

1. We'll get you an answer this week.
2. When did this start? _(the page follows this one)_
3. I'm not sure my office can help with that.
4. Let me have someone from my office call you tomorrow.
5. I already called them about it.

**Leslie Robbins:** A few months now. It's been hard to keep up.

You could say:

1. I'll see what my office can do.
2. Let me have someone from my office call you tomorrow. _(the page follows this one)_
3. I'm not sure my office can help with that.

**Leslie Robbins:** Thank you. I didn't know where else to turn.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.thank-you-for-seeing-me]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L5 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.when-did-this-start]; L6 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L14 follow/answer/scene-talk/anxious/10w2s [scene-talk.follow-answer.a-few-months-now-it-s-been-hard-to-keep-up]; L15 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.i-ll-see-what-my-office-can-do]; L16 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L17 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L23 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-i-didn-t-know-where-else-to-turn]</sub>

**Profile boastful** (outcome resolved)

**Leslie Robbins:** Thank you for seeing me.

**Leslie Robbins:** I lost my job, and I don't know where else to go.

You could say:

1. I'll make some calls today.
2. When did this start? _(the page follows this one)_
3. I'm not sure my office can help with that.
4. Leave me your number. We'll follow up this week.
5. I already called them about it.

**Leslie Robbins:** A few months now. It's been hard to keep up.

You could say:

1. I'll see what my office can do.
2. Let me have someone from my office call you tomorrow. _(the page follows this one)_
3. I'm not sure my office can help with that.

**Leslie Robbins:** Thank you. That's more than anyone else has done.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.thank-you-for-seeing-me]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/tender/5w1s [scene-talk.reply-promise.i-ll-make-some-calls-today]; L5 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.when-did-this-start]; L6 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L7 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L14 follow/answer/scene-talk/anxious/10w2s [scene-talk.follow-answer.a-few-months-now-it-s-been-hard-to-keep-up]; L15 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.i-ll-see-what-my-office-can-do]; L16 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L17 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L23 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

## Scene 20: office-hours (favor-asked, ends in money) — proof scene

_Purpose constituent-help. Records: person_5df2739ae2587c09:2027-05-23:event:housing.eviction:eviction:lease:household_e3b7a1c2299a39ab:2027-05-06, event:housing.eviction:eviction:lease:household_e3b7a1c2299a39ab:2027-05-06, person_5df2739ae2587c09, person_d3c12275ee46b085._

> Andrew Robbins lives in Brookside and has come to your office for help.

**Profile warm** (outcome resolved)

**Andrew Robbins:** I didn't know who else to go to.

**Andrew Robbins:** We're being evicted, and I need help.

You could say:

1. I'll see what my office can do.
2. When did this start? _(the page follows this one)_
3. I'm not sure my office can help with that.
4. Let me have someone from my office call you tomorrow.
5. I already called them about it.

**Andrew Robbins:** A few months now. It's been hard to keep up.

You could say:

1. I'll make some calls today. _(the page follows this one)_
2. Leave me your number. We'll follow up this week.
3. That's not something the town handles. I'm sorry.

**Andrew Robbins:** Thank you. I didn't know where else to turn.

**The whole exchange** (15 nodes; endings: resolved, resolved, resolved, refused, refused, resolved, open, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- You: I'll see what my office can do.
  - Andrew Robbins: Thank you. I didn't know where else to turn.
  - _Ends resolved_
- You ★: When did this start?
  - Andrew Robbins: A few months now. It's been hard to keep up.
  - You ★: I'll make some calls today.
    - Andrew Robbins: Thank you. I didn't know where else to turn.
    - _Ends resolved_
  - You: Leave me your number. We'll follow up this week.
    - Andrew Robbins: Thank you. That's more than anyone else has done.
    - _Ends resolved_
  - You: That's not something the town handles. I'm sorry.
    - Andrew Robbins: I understand. Thank you for listening.
    - _Ends refused_
- You: I'm not sure my office can help with that.
  - Andrew Robbins: I understand. Thank you for listening.
  - _Ends refused_
- You: Let me have someone from my office call you tomorrow.
  - Andrew Robbins: Thank you. I didn't know where else to turn.
  - _Ends resolved_
- You: I already called them about it.
  - _if Andrew Robbins knows:_
    - Andrew Robbins: They told me nobody's called.
    - You: All right. Here's the truth.
      - Andrew Robbins: Thank you for telling me straight.
      - _Ends open_
    - You: Let me look into what happened.
      - Andrew Robbins: Will you really call?
      - You: I will. You have my word.
        - Andrew Robbins: Thank you. That's more than anyone else has done.
        - _Ends resolved_
      - You: Let me have someone from my office call you tomorrow.
        - Andrew Robbins: Thank you. I didn't know where else to turn.
        - _Ends open_
  - _if not:_
    - Andrew Robbins: Thank you. I'll wait to hear from them.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/calm/13w1s [scene-talk.narrate-narrate.name-lives-in-place-and-has-come-to-your-office-for-help]; L2 open/greet/scene-talk/anxious/8w1s [scene-talk.open-greet.i-didn-t-know-who-else-to-go-to]; L3 state/request/scene-talk/anxious/7w1s [scene-talk.state-request.we-re-being-evicted-and-i-need-help]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.i-ll-see-what-my-office-can-do]; L5 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.when-did-this-start]; L6 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L10 follow/answer/scene-talk/anxious/10w2s [scene-talk.follow-answer.a-few-months-now-it-s-been-hard-to-keep-up]; L11 reply/promise/scene-talk/tender/5w1s [scene-talk.reply-promise.i-ll-make-some-calls-today]; L12 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L13 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L14 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-i-didn-t-know-where-else-to-turn]</sub>

**Profile cold** (outcome resolved)

**Andrew Robbins:** I didn't know who else to go to.

**Andrew Robbins:** We're being evicted, and I need help.

You could say:

1. We'll get you an answer this week. _(the page follows this one)_
2. When did this start?
3. I'm not sure my office can help with that.
4. Leave me your number. We'll follow up this week.
5. I already called them about it.

**Andrew Robbins:** Thank you. That's more than anyone else has done.

<sub>L1 narrate/narrate/scene-talk/calm/13w1s [scene-talk.narrate-narrate.name-lives-in-place-and-has-come-to-your-office-for-help]; L2 open/greet/scene-talk/anxious/8w1s [scene-talk.open-greet.i-didn-t-know-who-else-to-go-to]; L3 state/request/scene-talk/anxious/7w1s [scene-talk.state-request.we-re-being-evicted-and-i-need-help]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L5 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.when-did-this-start]; L6 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L7 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L9 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

**Profile stubborn** (outcome resolved)

**Andrew Robbins:** I didn't know who else to go to.

**Andrew Robbins:** We're being evicted, and I need help.

You could say:

1. I'll make some calls today. _(the page follows this one)_
2. Have you talked to anyone else about it?
3. I'm not sure my office can help with that.
4. Let me have someone from my office call you tomorrow.
5. I already called them about it.

**Andrew Robbins:** Thank you. I didn't know where else to turn.

<sub>L1 narrate/narrate/scene-talk/calm/13w1s [scene-talk.narrate-narrate.name-lives-in-place-and-has-come-to-your-office-for-help]; L2 open/greet/scene-talk/anxious/8w1s [scene-talk.open-greet.i-didn-t-know-who-else-to-go-to]; L3 state/request/scene-talk/anxious/7w1s [scene-talk.state-request.we-re-being-evicted-and-i-need-help]; L4 reply/promise/scene-talk/tender/5w1s [scene-talk.reply-promise.i-ll-make-some-calls-today]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L9 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-i-didn-t-know-where-else-to-turn]</sub>

**Profile anxious** (outcome resolved)

**Andrew Robbins:** I didn't know who else to go to.

**Andrew Robbins:** We're being evicted, and I need help.

You could say:

1. I'll make some calls today. _(the page follows this one)_
2. When did this start?
3. That's not something the town handles. I'm sorry.
4. Let me have someone from my office call you tomorrow.
5. I already called them about it.

**Andrew Robbins:** Thank you. That's more than anyone else has done.

<sub>L1 narrate/narrate/scene-talk/calm/13w1s [scene-talk.narrate-narrate.name-lives-in-place-and-has-come-to-your-office-for-help]; L2 open/greet/scene-talk/anxious/8w1s [scene-talk.open-greet.i-didn-t-know-who-else-to-go-to]; L3 state/request/scene-talk/anxious/7w1s [scene-talk.state-request.we-re-being-evicted-and-i-need-help]; L4 reply/promise/scene-talk/tender/5w1s [scene-talk.reply-promise.i-ll-make-some-calls-today]; L5 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.when-did-this-start]; L6 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L9 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

**Profile boastful** (outcome resolved)

**Andrew Robbins:** I didn't know who else to go to.

**Andrew Robbins:** We're being evicted, and I need help.

You could say:

1. I'll see what my office can do. _(the page follows this one)_
2. When did this start?
3. That's not something the town handles. I'm sorry.
4. Let me have someone from my office call you tomorrow.
5. I already called them about it.

**Andrew Robbins:** Thank you. I didn't know where else to turn.

<sub>L1 narrate/narrate/scene-talk/calm/13w1s [scene-talk.narrate-narrate.name-lives-in-place-and-has-come-to-your-office-for-help]; L2 open/greet/scene-talk/anxious/8w1s [scene-talk.open-greet.i-didn-t-know-who-else-to-go-to]; L3 state/request/scene-talk/anxious/7w1s [scene-talk.state-request.we-re-being-evicted-and-i-need-help]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.i-ll-see-what-my-office-can-do]; L5 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.when-did-this-start]; L6 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L9 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-i-didn-t-know-where-else-to-turn]</sub>

## Scene 21: office-hours (favor-asked, ends in money) — proof scene

_Purpose constituent-help. Records: person_b6f0d51289db799a:2027-07-01:job:position:organization_b74b9bd31243618a:2027-06-01:2:person_b6f0d61289db7b4d, job:position:organization_b74b9bd31243618a:2027-06-01:2:person_b6f0d61289db7b4d, person_b6f0d51289db799a, person_bc041df6bd9d1a47._

> It's office hours, and Zachary Shepard is next in line.

**Profile warm** (outcome resolved)

**Zachary Shepard:** I won't take long.

**Zachary Shepard:** I lost my job, and I don't know where else to go.

You could say:

1. I'll make some calls today.
2. Have you talked to anyone else about it? _(the page follows this one)_
3. I'm not sure my office can help with that.
4. Let me have someone from my office call you tomorrow.
5. I already called them about it.

**Zachary Shepard:** I've called everyone I can think of.

You could say:

1. I'll make some calls today. _(the page follows this one)_
2. Let me have someone from my office call you tomorrow.
3. That's not something the town handles. I'm sorry.

**Zachary Shepard:** Thank you. That's more than anyone else has done.

**The whole exchange** (29 nodes; endings: resolved, resolved, resolved, open, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- You: I'll make some calls today.
  - Zachary Shepard: Thank you. That's more than anyone else has done.
  - _Ends resolved_
- You ★: Have you talked to anyone else about it?
  - Zachary Shepard: I've called everyone I can think of.
  - You ★: I'll make some calls today.
    - Zachary Shepard: Thank you. That's more than anyone else has done.
    - _Ends resolved_
  - You: Let me have someone from my office call you tomorrow.
    - Zachary Shepard: Will you really call?
    - You: I will. You have my word.
      - Zachary Shepard: Thank you. That's more than anyone else has done.
      - _Ends resolved_
    - You: Leave me your number. We'll follow up this week.
      - Zachary Shepard: Will you really call?
      - _Ends open_
  - You: That's not something the town handles. I'm sorry.
    - Zachary Shepard: Please. There has to be something.
    - You: I'll make some calls today.
      - Zachary Shepard: Thank you. That's more than anyone else has done.
      - _Ends resolved_
    - You: Leave me your number. We'll follow up this week.
      - Zachary Shepard: Thank you. I didn't know where else to turn.
      - _Ends resolved_
    - You: I'm not sure my office can help with that.
      - Zachary Shepard: I've got nowhere else to go.
      - You: I'll make some calls today.
        - Zachary Shepard: Thank you. I didn't know where else to turn.
        - _Ends resolved_
      - You: Let me have someone from my office call you tomorrow.
        - Zachary Shepard: Thank you. That's more than anyone else has done.
        - _Ends resolved_
- You: I'm not sure my office can help with that.
  - Zachary Shepard: Please. There has to be something.
  - You: I'll see what my office can do.
    - Zachary Shepard: Thank you. I didn't know where else to turn.
    - _Ends resolved_
  - You: Let me have someone from my office call you tomorrow.
    - Zachary Shepard: Thank you. That's more than anyone else has done.
    - _Ends resolved_
  - You: That's not something the town handles. I'm sorry.
    - Zachary Shepard: I've got nowhere else to go.
    - You: I'll make some calls today.
      - Zachary Shepard: Thank you. I didn't know where else to turn.
      - _Ends resolved_
    - You: Let me have someone from my office call you tomorrow.
      - Zachary Shepard: Will you really call?
      - You: I will. You have my word.
        - Zachary Shepard: Thank you. That's more than anyone else has done.
        - _Ends resolved_
      - You: Leave me your number. We'll follow up this week.
        - Zachary Shepard: Thank you. That's more than anyone else has done.
        - _Ends resolved_
- You: Let me have someone from my office call you tomorrow.
  - Zachary Shepard: Thank you. I didn't know where else to turn.
  - _Ends resolved_
- You: I already called them about it.
  - _if Zachary Shepard knows:_
    - Zachary Shepard: They told me nobody's called.
    - You: You're right. I shouldn't have said that.
      - Zachary Shepard: Thank you for telling me straight.
      - _Ends open_
    - You: Let me look into what happened.
      - Zachary Shepard: Will you really call?
      - You: I will. You have my word.
        - Zachary Shepard: Thank you. That's more than anyone else has done.
        - _Ends resolved_
      - You: Leave me your number. We'll follow up this week.
        - Zachary Shepard: Thank you. That's more than anyone else has done.
        - _Ends open_
  - _if not:_
    - Zachary Shepard: Thank you. I'll wait to hear from them.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.i-won-t-take-long]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/tender/5w1s [scene-talk.reply-promise.i-ll-make-some-calls-today]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L10 follow/answer/scene-talk/anxious/7w1s [scene-talk.follow-answer.i-ve-called-everyone-i-can-think-of]; L11 reply/promise/scene-talk/tender/5w1s [scene-talk.reply-promise.i-ll-make-some-calls-today]; L12 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L13 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L14 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

**Profile cold** (outcome resolved)

**Zachary Shepard:** I won't take long.

**Zachary Shepard:** I lost my job, and I don't know where else to go.

You could say:

1. I'll see what my office can do. _(the page follows this one)_
2. Have you talked to anyone else about it?
3. That's not something the town handles. I'm sorry.
4. Leave me your number. We'll follow up this week.
5. I already called them about it.

**Zachary Shepard:** Thank you. I didn't know where else to turn.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.i-won-t-take-long]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.i-ll-see-what-my-office-can-do]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L7 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L9 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-i-didn-t-know-where-else-to-turn]</sub>

**Profile stubborn** (outcome resolved)

**Zachary Shepard:** I didn't know who else to go to.

**Zachary Shepard:** I lost my job, and I don't know where else to go.

You could say:

1. I'll see what my office can do. _(the page follows this one)_
2. Have you talked to anyone else about it?
3. I'm not sure my office can help with that.
4. Let me have someone from my office call you tomorrow.
5. I already called them about it.

**Zachary Shepard:** Thank you. That's more than anyone else has done.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/anxious/8w1s [scene-talk.open-greet.i-didn-t-know-who-else-to-go-to]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.i-ll-see-what-my-office-can-do]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L9 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

**Profile anxious** (outcome resolved)

**Zachary Shepard:** Can I talk to you?

**Zachary Shepard:** I lost my job, and I don't know where else to go.

You could say:

1. We'll get you an answer this week. _(the page follows this one)_
2. When did this start?
3. I'm not sure my office can help with that.
4. Let me have someone from my office call you tomorrow.
5. I already called them about it.

**Zachary Shepard:** Thank you. That's more than anyone else has done.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L5 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.when-did-this-start]; L6 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L9 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

**Profile boastful** (outcome resolved)

**Zachary Shepard:** Thank you for seeing me.

**Zachary Shepard:** I lost my job, and I don't know where else to go.

You could say:

1. We'll get you an answer this week. _(the page follows this one)_
2. When did this start?
3. I'm not sure my office can help with that.
4. Let me have someone from my office call you tomorrow.
5. I already called them about it.

**Zachary Shepard:** Thank you. That's more than anyone else has done.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.thank-you-for-seeing-me]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L5 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.when-did-this-start]; L6 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L9 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

## Scene 22: family-filing (news-received, ends in political) — proof scene

_Purpose family-filing. Records: filing:contest:seat:gus2025:101811:board:6:2026-11-03:person_d3c12275ee46b085, contest:seat:gus2025:101811:board:6:2026-11-03, person_d3c11e75ee46a9b9, person_d3c12275ee46b085._

> Word that you filed for County Commissioner got home before you did. Bentley Rivas is waiting.

**Profile warm** (outcome resolved)

**Bentley Rivas:** There you are.

**Bentley Rivas:** Why didn't you tell me you were running?

You could say:

1. Who told you?

**Bentley Rivas:** Sasha Rivas told me.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it. _(the page follows this one)_
2. Will you help me?
3. I was going to tell you tonight.
4. It'll be all right. We'll make it work.

**Bentley Rivas:** And now you're sure?

You could say:

1. I'm running because somebody has to. _(the page follows this one)_
2. You're right. I should have told you first.
3. Will you help me?

**Bentley Rivas:** Then I'm glad it's you.

You could say:

1. That means everything. _(the page follows this one)_
2. I won't let it take over our lives.
3. Will you help me?

**Bentley Rivas:** Okay. Next time, tell me first.

**The whole exchange** (25 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved; ★ is the branch this profile's traits lean toward):

- Latoya Rivas (without a choice): Who told you?
- Bentley Rivas: Sasha Rivas told me.
- You ★: I didn't tell you because I wasn't sure I'd go through with it.
  - Bentley Rivas: And now you're sure?
  - You ★: I'm running because somebody has to.
    - Bentley Rivas: Then I'm glad it's you.
    - You ★: That means everything.
      - Bentley Rivas: Okay. Next time, tell me first.
      - _Ends resolved_
    - You: I won't let it take over our lives.
      - Bentley Rivas: I'll hold you to that.
      - _Ends resolved_
    - You: Will you help me?
      - Bentley Rivas: Of course I'll help.
      - You: Thank you. I mean it.
        - Bentley Rivas: Okay. Next time, tell me first.
        - _Ends resolved_
      - You: I won't let it take over our lives.
        - Bentley Rivas: I'll hold you to that.
        - _Ends resolved_
  - You: You're right. I should have told you first.
    - Bentley Rivas: Yes, you should have.
    - _Ends resolved_
  - You: Will you help me?
    - Bentley Rivas: I'll be there.
    - You: Thank you. I mean it.
      - Bentley Rivas: Okay. Next time, tell me first.
      - _Ends resolved_
    - You: I won't let it take over our lives.
      - Bentley Rivas: I'll hold you to that.
      - _Ends resolved_
- You: Will you help me?
  - Bentley Rivas: Of course I'll help.
  - You: Thank you. I mean it.
    - Bentley Rivas: Okay. Next time, tell me first.
    - _Ends resolved_
  - You: I won't let it take over our lives.
    - Bentley Rivas: I'll hold you to that.
    - _Ends resolved_
- You: I was going to tell you tonight.
  - Bentley Rivas: No. We talk about it now.
  - You: I'm running because somebody has to.
    - Bentley Rivas: Then I'm glad it's you.
    - You: That means everything.
      - Bentley Rivas: Okay. Next time, tell me first.
      - _Ends resolved_
    - You: I won't let it take over our lives.
      - Bentley Rivas: I'll hold you to that.
      - _Ends resolved_
    - You: Will you help me?
      - Bentley Rivas: Of course I'll help.
      - You: Thank you. I mean it.
        - Bentley Rivas: Okay. Next time, tell me first.
        - _Ends resolved_
      - You: I won't let it take over our lives.
        - Bentley Rivas: I'll hold you to that.
        - _Ends resolved_
  - You: You're right. I should have told you first.
    - Bentley Rivas: Yes, you should have.
    - _Ends resolved_
  - You: I won't let it take over our lives.
    - Bentley Rivas: I'll hold you to that.
    - _Ends resolved_
- You: It'll be all right. We'll make it work.
  - Bentley Rivas: Okay. Next time, tell me first.
  - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 auto/ask/scene-talk/nervous/3w1s [scene-talk.auto-ask.who-told-you]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/nervous/7w1s [scene-talk.reply-deflect.i-was-going-to-tell-you-tonight]; L9 reply/comfort/scene-talk/tender/8w2s [scene-talk.reply-comfort.it-ll-be-all-right-we-ll-make-it-work]; L10 follow/ask/scene-talk/anxious/4w1s [scene-talk.follow-ask.and-now-you-re-sure]; L11 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L12 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L13 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L14 follow/comfort/scene-talk/tender/5w1s [scene-talk.follow-comfort.then-i-m-glad-it-s-you]; L15 reply/thank/scene-talk/tender/3w1s [scene-talk.reply-thank.that-means-everything]; L16 reply/promise/scene-talk/tender/8w1s [scene-talk.reply-promise.i-won-t-let-it-take-over-our-lives]; L17 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L18 follow/thank/scene-talk/hurt/6w2s [scene-talk.follow-thank.okay-next-time-tell-me-first]</sub>

**Profile cold** (outcome resolved)

**Bentley Rivas:** There you are.

**Bentley Rivas:** Why didn't you tell me you were running?

You could say:

1. Who told you?

**Bentley Rivas:** Sasha Rivas told me.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it.
2. Will you help me?
3. It's been a long day. _(the page follows this one)_
4. We'll figure it out together. I promise.

**Bentley Rivas:** No. We talk about it now.

You could say:

1. I'm running because somebody has to.
2. You're right. I should have told you first.
3. I won't let it take over our lives. _(the page follows this one)_

**Bentley Rivas:** I'll hold you to that.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 auto/ask/scene-talk/nervous/3w1s [scene-talk.auto-ask.who-told-you]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L9 reply/comfort/scene-talk/tender/7w2s [scene-talk.reply-comfort.we-ll-figure-it-out-together-i-promise]; L27 follow/press/scene-talk/hurt/6w2s [scene-talk.follow-press.no-we-talk-about-it-now]; L28 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L29 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L30 reply/promise/scene-talk/tender/8w1s [scene-talk.reply-promise.i-won-t-let-it-take-over-our-lives]; L52 follow/thank/scene-talk/tender/5w1s [scene-talk.follow-thank.i-ll-hold-you-to-that]</sub>

**Profile stubborn** (outcome resolved)

**Bentley Rivas:** There you are.

**Bentley Rivas:** Why didn't you tell me you were running?

You could say:

1. Who told you?

**Bentley Rivas:** Sasha Rivas told me.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it. _(the page follows this one)_
2. Will you help me?
3. It's been a long day.
4. It'll be all right. We'll make it work.

**Bentley Rivas:** And now you're sure?

You could say:

1. I'm running because somebody has to. _(the page follows this one)_
2. You're right. I should have told you first.
3. Will you help me?

**Bentley Rivas:** Somebody, sure. Why you?

You could say:

1. I want to do something for Brookside. _(the page follows this one)_
2. You're right. I should have told you first.
3. Will you help me?

**Bentley Rivas:** Why this, and why now?

You could say:

1. You're right. I should have told you first.
2. Will you help me? _(the page follows this one)_

**Bentley Rivas:** I'll be there.

You could say:

1. Thank you. I mean it.
2. I won't let it take over our lives. _(the page follows this one)_

**Bentley Rivas:** I'll hold you to that.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 auto/ask/scene-talk/nervous/3w1s [scene-talk.auto-ask.who-told-you]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L9 reply/comfort/scene-talk/tender/8w2s [scene-talk.reply-comfort.it-ll-be-all-right-we-ll-make-it-work]; L10 follow/ask/scene-talk/anxious/4w1s [scene-talk.follow-ask.and-now-you-re-sure]; L11 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L12 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L13 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L14 follow/disagree/scene-talk/hurt/4w2s [scene-talk.follow-disagree.somebody-sure-why-you]; L15 reply/tell/scene-talk/eager/7w1s [scene-talk.reply-tell.i-want-to-do-something-for-place]; L16 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L17 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L18 follow/ask/scene-talk/hurt/5w1s [scene-talk.follow-ask.why-this-and-why-now]; L19 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L20 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L22 follow/promise/scene-talk/tender/3w1s [scene-talk.follow-promise.i-ll-be-there]; L23 reply/thank/scene-talk/tender/5w2s [scene-talk.reply-thank.thank-you-i-mean-it]; L24 reply/promise/scene-talk/tender/8w1s [scene-talk.reply-promise.i-won-t-let-it-take-over-our-lives]; L26 follow/thank/scene-talk/tender/5w1s [scene-talk.follow-thank.i-ll-hold-you-to-that]</sub>

**Profile anxious** (outcome resolved)

**Bentley Rivas:** There you are.

**Bentley Rivas:** Why didn't you tell me you were running?

You could say:

1. Who told you?

**Bentley Rivas:** Sasha Rivas told me.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it.
2. Will you help me?
3. I was going to tell you tonight. _(the page follows this one)_
4. We'll figure it out together. I promise.

**Bentley Rivas:** Just tell me the truth.

You could say:

1. I'm running because somebody has to.
2. You're right. I should have told you first.
3. I won't let it take over our lives. _(the page follows this one)_

**Bentley Rivas:** I'll hold you to that.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 auto/ask/scene-talk/nervous/3w1s [scene-talk.auto-ask.who-told-you]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/nervous/7w1s [scene-talk.reply-deflect.i-was-going-to-tell-you-tonight]; L9 reply/comfort/scene-talk/tender/7w2s [scene-talk.reply-comfort.we-ll-figure-it-out-together-i-promise]; L36 follow/plea/scene-talk/hurt/5w1s [scene-talk.follow-plea.just-tell-me-the-truth]; L37 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L38 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L39 reply/promise/scene-talk/tender/8w1s [scene-talk.reply-promise.i-won-t-let-it-take-over-our-lives]; L66 follow/thank/scene-talk/tender/5w1s [scene-talk.follow-thank.i-ll-hold-you-to-that]</sub>

**Profile boastful** (outcome resolved)

**Bentley Rivas:** There you are.

**Bentley Rivas:** Why didn't you tell me you were running?

You could say:

1. Who told you?

**Bentley Rivas:** Sasha Rivas told me.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it. _(the page follows this one)_
2. Will you help me?
3. It's been a long day.
4. It'll be all right. We'll make it work.

**Bentley Rivas:** And now you're sure?

You could say:

1. I'm running because somebody has to. _(the page follows this one)_
2. You're right. I should have told you first.
3. Will you help me?

**Bentley Rivas:** Then I'm glad it's you.

You could say:

1. That means everything. _(the page follows this one)_
2. I won't let it take over our lives.
3. Will you help me?

**Bentley Rivas:** Okay. Next time, tell me first.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 auto/ask/scene-talk/nervous/3w1s [scene-talk.auto-ask.who-told-you]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L9 reply/comfort/scene-talk/tender/8w2s [scene-talk.reply-comfort.it-ll-be-all-right-we-ll-make-it-work]; L10 follow/ask/scene-talk/anxious/4w1s [scene-talk.follow-ask.and-now-you-re-sure]; L11 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L12 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L13 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L14 follow/comfort/scene-talk/tender/5w1s [scene-talk.follow-comfort.then-i-m-glad-it-s-you]; L15 reply/thank/scene-talk/tender/3w1s [scene-talk.reply-thank.that-means-everything]; L16 reply/promise/scene-talk/tender/8w1s [scene-talk.reply-promise.i-won-t-let-it-take-over-our-lives]; L17 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L18 follow/thank/scene-talk/hurt/6w2s [scene-talk.follow-thank.okay-next-time-tell-me-first]</sub>

## Scene 23: family-filing (news-received, ends in political) — proof scene

_Purpose family-filing. Records: filing:contest:seat:gus2025:101811:assessor:0:2026-11-03:person_8875c9c2afd1ae76, contest:seat:gus2025:101811:assessor:0:2026-11-03, person_8875cac2afd1b029, person_8875c9c2afd1ae76._

> You filed today to run for County assessor. Andrew Peters has been waiting for you at home.

**Profile warm** (outcome resolved)

**Andrew Peters:** So. You did it.

**Andrew Peters:** Are you sure about running for County assessor?

You could say:

1. How did you know?

**Andrew Peters:** Erin McCarthy told me.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it. _(the page follows this one)_
2. Will you help me?
3. I was going to tell you tonight.
4. We'll figure it out together. I promise.

**Andrew Peters:** And now you're sure?

You could say:

1. I'm running because somebody has to. _(the page follows this one)_
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Somebody, sure. Why you?

You could say:

1. I want to do something for New Castle County. _(the page follows this one)_
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Then I'm with you.

You could say:

1. That means everything. _(the page follows this one)_
2. I won't let it take over our lives.
3. Will you help me?

**Andrew Peters:** Okay. Next time, tell me first.

**The whole exchange** (35 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved; ★ is the branch this profile's traits lean toward):

- Sharon Peters (without a choice): How did you know?
- Andrew Peters: Erin McCarthy told me.
- You ★: I didn't tell you because I wasn't sure I'd go through with it.
  - Andrew Peters: And now you're sure?
  - You ★: I'm running because somebody has to.
    - Andrew Peters: Somebody, sure. Why you?
    - You ★: I want to do something for New Castle County.
      - Andrew Peters: Then I'm with you.
      - You ★: That means everything.
        - Andrew Peters: Okay. Next time, tell me first.
        - _Ends resolved_
      - You: I won't let it take over our lives.
        - Andrew Peters: I'll hold you to that.
        - _Ends resolved_
      - You: Will you help me?
        - Andrew Peters: Of course I'll help.
        - You: Thank you. I mean it.
          - Andrew Peters: Okay. Next time, tell me first.
          - _Ends resolved_
        - You: I won't let it take over our lives.
          - Andrew Peters: I'll hold you to that.
          - _Ends resolved_
    - You: I'm sorry. I wanted to be sure first.
      - Andrew Peters: Okay. Next time, be sure with me.
      - _Ends resolved_
    - You: Will you help me?
      - Andrew Peters: Of course I'll help.
      - You: Thank you. I mean it.
        - Andrew Peters: Okay. Next time, tell me first.
        - _Ends resolved_
      - You: I won't let it take over our lives.
        - Andrew Peters: I'll hold you to that.
        - _Ends resolved_
  - You: I'm sorry. I wanted to be sure first.
    - Andrew Peters: Okay. Next time, be sure with me.
    - _Ends resolved_
  - You: Will you help me?
    - Andrew Peters: Of course I'll help.
    - You: Thank you. I mean it.
      - Andrew Peters: Okay. Next time, tell me first.
      - _Ends resolved_
    - You: I won't let it take over our lives.
      - Andrew Peters: I'll hold you to that.
      - _Ends resolved_
- You: Will you help me?
  - Andrew Peters: Of course I'll help.
  - You: Thank you. I mean it.
    - Andrew Peters: Okay. Next time, tell me first.
    - _Ends resolved_
  - You: I won't let it take over our lives.
    - Andrew Peters: I'll hold you to that.
    - _Ends resolved_
- You: I was going to tell you tonight.
  - Andrew Peters: Don't shut me out of this.
  - You: I'm running because somebody has to.
    - Andrew Peters: Somebody, sure. Why you?
    - You: I want to do something for New Castle County.
      - Andrew Peters: Then I'm with you.
      - You: That means everything.
        - Andrew Peters: Okay. Next time, tell me first.
        - _Ends resolved_
      - You: I won't let it take over our lives.
        - Andrew Peters: I'll hold you to that.
        - _Ends resolved_
      - You: Will you help me?
        - Andrew Peters: I'll be there.
        - You: Thank you. I mean it.
          - Andrew Peters: Okay. Next time, tell me first.
          - _Ends resolved_
        - You: I won't let it take over our lives.
          - Andrew Peters: I'll hold you to that.
          - _Ends resolved_
    - You: You're right. I should have told you first.
      - Andrew Peters: Yes, you should have.
      - _Ends resolved_
    - You: Will you help me?
      - Andrew Peters: I'll be there.
      - You: Thank you. I mean it.
        - Andrew Peters: Okay. Next time, tell me first.
        - _Ends resolved_
      - You: I won't let it take over our lives.
        - Andrew Peters: I'll hold you to that.
        - _Ends resolved_
  - You: I'm sorry. I wanted to be sure first.
    - Andrew Peters: Okay. Next time, be sure with me.
    - _Ends resolved_
  - You: I won't let it take over our lives.
    - Andrew Peters: I'll hold you to that.
    - _Ends resolved_
- You: We'll figure it out together. I promise.
  - Andrew Peters: Okay. Next time, tell me first.
  - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/anxious/17w2s [scene-talk.narrate-narrate.you-filed-today-to-run-for-office-name-has-been-waiting-for-you-at-hom]; L2 open/greet/scene-talk/hurt/4w2s [scene-talk.open-greet.so-you-did-it]; L3 state/ask/scene-talk/anxious/8w1s [scene-talk.state-ask.are-you-sure-about-running-for-office]; L4 auto/ask/scene-talk/nervous/4w1s [scene-talk.auto-ask.how-did-you-know]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/nervous/7w1s [scene-talk.reply-deflect.i-was-going-to-tell-you-tonight]; L9 reply/comfort/scene-talk/tender/7w2s [scene-talk.reply-comfort.we-ll-figure-it-out-together-i-promise]; L10 follow/ask/scene-talk/anxious/4w1s [scene-talk.follow-ask.and-now-you-re-sure]; L11 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L12 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L13 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L14 follow/disagree/scene-talk/hurt/4w2s [scene-talk.follow-disagree.somebody-sure-why-you]; L15 reply/tell/scene-talk/eager/9w1s [scene-talk.reply-tell.i-want-to-do-something-for-place]; L16 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L17 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L18 follow/comfort/scene-talk/tender/4w1s [scene-talk.follow-comfort.then-i-m-with-you]; L19 reply/thank/scene-talk/tender/3w1s [scene-talk.reply-thank.that-means-everything]; L20 reply/promise/scene-talk/tender/8w1s [scene-talk.reply-promise.i-won-t-let-it-take-over-our-lives]; L21 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L22 follow/thank/scene-talk/hurt/6w2s [scene-talk.follow-thank.okay-next-time-tell-me-first]</sub>

**Profile cold** (outcome open)

**Andrew Peters:** So. You did it.

**Andrew Peters:** Are you sure about running for County assessor?

You could say:

1. How did you know?

**Andrew Peters:** Erin McCarthy told me.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it. _(the page follows this one)_
2. Will you help me?
3. It's been a long day.
4. It'll be all right. We'll make it work.

**Andrew Peters:** And now you're sure?

You could say:

1. I'm running because somebody has to. _(the page follows this one)_
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Somebody, sure. Why you?

You could say:

1. I want to do something for New Castle County. _(the page follows this one)_
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Why this, and why now?

You could say:

1. I'm sorry. I wanted to be sure first.
2. Will you help me? _(the page follows this one)_

**Andrew Peters:** I can't promise that.

**Andrew Peters:** Talk to me tomorrow. Promise.

<sub>L1 narrate/narrate/scene-talk/anxious/17w2s [scene-talk.narrate-narrate.you-filed-today-to-run-for-office-name-has-been-waiting-for-you-at-hom]; L2 open/greet/scene-talk/hurt/4w2s [scene-talk.open-greet.so-you-did-it]; L3 state/ask/scene-talk/anxious/8w1s [scene-talk.state-ask.are-you-sure-about-running-for-office]; L4 auto/ask/scene-talk/nervous/4w1s [scene-talk.auto-ask.how-did-you-know]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L9 reply/comfort/scene-talk/tender/8w2s [scene-talk.reply-comfort.it-ll-be-all-right-we-ll-make-it-work]; L10 follow/ask/scene-talk/anxious/4w1s [scene-talk.follow-ask.and-now-you-re-sure]; L11 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L12 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L13 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L14 follow/disagree/scene-talk/hurt/4w2s [scene-talk.follow-disagree.somebody-sure-why-you]; L15 reply/tell/scene-talk/eager/9w1s [scene-talk.reply-tell.i-want-to-do-something-for-place]; L16 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L17 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L18 follow/ask/scene-talk/hurt/5w1s [scene-talk.follow-ask.why-this-and-why-now]; L19 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L20 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L22 follow/decline/scene-talk/guarded/4w1s [scene-talk.follow-decline.i-can-t-promise-that]; L23 close/press/scene-talk/hurt/5w2s [scene-talk.close-press.talk-to-me-tomorrow-promise]</sub>

**Profile anxious** (outcome open)

**Andrew Peters:** So. You did it.

**Andrew Peters:** Are you sure about running for County assessor?

You could say:

1. How did you know?

**Andrew Peters:** Erin McCarthy told me.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it. _(the page follows this one)_
2. Will you help me?
3. I was going to tell you tonight.
4. We'll figure it out together. I promise.

**Andrew Peters:** And now you're sure?

You could say:

1. I'm running because somebody has to. _(the page follows this one)_
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Somebody, sure. Why you?

You could say:

1. I want to do something for New Castle County. _(the page follows this one)_
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Why this, and why now?

You could say:

1. I'm sorry. I wanted to be sure first.
2. Will you help me? _(the page follows this one)_

**Andrew Peters:** I don't know if I can.

**Andrew Peters:** Talk to me tomorrow. Promise.

<sub>L1 narrate/narrate/scene-talk/anxious/17w2s [scene-talk.narrate-narrate.you-filed-today-to-run-for-office-name-has-been-waiting-for-you-at-hom]; L2 open/greet/scene-talk/hurt/4w2s [scene-talk.open-greet.so-you-did-it]; L3 state/ask/scene-talk/anxious/8w1s [scene-talk.state-ask.are-you-sure-about-running-for-office]; L4 auto/ask/scene-talk/nervous/4w1s [scene-talk.auto-ask.how-did-you-know]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/nervous/7w1s [scene-talk.reply-deflect.i-was-going-to-tell-you-tonight]; L9 reply/comfort/scene-talk/tender/7w2s [scene-talk.reply-comfort.we-ll-figure-it-out-together-i-promise]; L10 follow/ask/scene-talk/anxious/4w1s [scene-talk.follow-ask.and-now-you-re-sure]; L11 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L12 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L13 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L14 follow/disagree/scene-talk/hurt/4w2s [scene-talk.follow-disagree.somebody-sure-why-you]; L15 reply/tell/scene-talk/eager/9w1s [scene-talk.reply-tell.i-want-to-do-something-for-place]; L16 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L17 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L18 follow/ask/scene-talk/hurt/5w1s [scene-talk.follow-ask.why-this-and-why-now]; L19 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L20 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L22 follow/decline/scene-talk/nervous/6w1s [scene-talk.follow-decline.i-don-t-know-if-i-can]; L23 close/press/scene-talk/hurt/5w2s [scene-talk.close-press.talk-to-me-tomorrow-promise]</sub>

**Profile boastful** (outcome open)

**Andrew Peters:** So. You did it.

**Andrew Peters:** Are you sure about running for County assessor?

You could say:

1. How did you know?

**Andrew Peters:** Erin McCarthy told me.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it. _(the page follows this one)_
2. Will you help me?
3. It's been a long day.
4. It'll be all right. We'll make it work.

**Andrew Peters:** And now you're sure?

You could say:

1. I'm running because somebody has to. _(the page follows this one)_
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Somebody, sure. Why you?

You could say:

1. I want to do something for New Castle County. _(the page follows this one)_
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Why this, and why now?

You could say:

1. I'm sorry. I wanted to be sure first.
2. Will you help me? _(the page follows this one)_

**Andrew Peters:** I don't know if I can.

**Andrew Peters:** Talk to me tomorrow. Promise.

<sub>L1 narrate/narrate/scene-talk/anxious/17w2s [scene-talk.narrate-narrate.you-filed-today-to-run-for-office-name-has-been-waiting-for-you-at-hom]; L2 open/greet/scene-talk/hurt/4w2s [scene-talk.open-greet.so-you-did-it]; L3 state/ask/scene-talk/anxious/8w1s [scene-talk.state-ask.are-you-sure-about-running-for-office]; L4 auto/ask/scene-talk/nervous/4w1s [scene-talk.auto-ask.how-did-you-know]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L9 reply/comfort/scene-talk/tender/8w2s [scene-talk.reply-comfort.it-ll-be-all-right-we-ll-make-it-work]; L10 follow/ask/scene-talk/anxious/4w1s [scene-talk.follow-ask.and-now-you-re-sure]; L11 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L12 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L13 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L14 follow/disagree/scene-talk/hurt/4w2s [scene-talk.follow-disagree.somebody-sure-why-you]; L15 reply/tell/scene-talk/eager/9w1s [scene-talk.reply-tell.i-want-to-do-something-for-place]; L16 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L17 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L18 follow/ask/scene-talk/hurt/5w1s [scene-talk.follow-ask.why-this-and-why-now]; L19 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L20 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L22 follow/decline/scene-talk/nervous/6w1s [scene-talk.follow-decline.i-don-t-know-if-i-can]; L23 close/press/scene-talk/hurt/5w2s [scene-talk.close-press.talk-to-me-tomorrow-promise]</sub>

## Scene 24: family-filing (news-received, ends in political) — proof scene

_Purpose family-filing. Records: filing:contest:seat:gus2025:101811:board:0:2026-11-03:person_9e002a561a4b29bc, contest:seat:gus2025:101811:board:0:2026-11-03, person_9e002b561a4b2b6f, person_9e002a561a4b29bc._

> Word that you filed for County Commissioner got home before you did. Simon Riggs is waiting.

**Profile warm** (outcome resolved)

**Simon Riggs:** There you are.

**Simon Riggs:** So you're really doing this?

You could say:

1. Who told you?

**Simon Riggs:** Dylan Riggs told me.

You could say:

1. I'm running because somebody has to.
2. Will you help me? _(the page follows this one)_
3. I was going to tell you tonight.
4. We'll figure it out together. I promise.

**Simon Riggs:** I'll be there.

You could say:

1. Thank you. I mean it. _(the page follows this one)_
2. I won't let it take over our lives.

**Simon Riggs:** Okay. Next time, tell me first.

**The whole exchange** (25 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved; ★ is the branch this profile's traits lean toward):

- Kelly Riggs (without a choice): Who told you?
- Simon Riggs: Dylan Riggs told me.
- You: I'm running because somebody has to.
  - Simon Riggs: Then I'm glad it's you.
  - You: That means everything.
    - Simon Riggs: Okay. Next time, tell me first.
    - _Ends resolved_
  - You: I won't let it take over our lives.
    - Simon Riggs: I'll hold you to that.
    - _Ends resolved_
  - You: Will you help me?
    - Simon Riggs: I'll be there.
    - You: Thank you. I mean it.
      - Simon Riggs: Okay. Next time, tell me first.
      - _Ends resolved_
    - You: I won't let it take over our lives.
      - Simon Riggs: I'll hold you to that.
      - _Ends resolved_
- You ★: Will you help me?
  - Simon Riggs: I'll be there.
  - You ★: Thank you. I mean it.
    - Simon Riggs: Okay. Next time, tell me first.
    - _Ends resolved_
  - You: I won't let it take over our lives.
    - Simon Riggs: I'll hold you to that.
    - _Ends resolved_
- You: I was going to tell you tonight.
  - Simon Riggs: No. We talk about it now.
  - You: I didn't tell you because I wasn't sure I'd go through with it.
    - Simon Riggs: And now you're sure?
    - You: I want to do something for Brookside.
      - Simon Riggs: Then I'm with you.
      - You: That means everything.
        - Simon Riggs: Okay. Next time, tell me first.
        - _Ends resolved_
      - You: I won't let it take over our lives.
        - Simon Riggs: I'll hold you to that.
        - _Ends resolved_
      - You: Will you help me?
        - Simon Riggs: Of course I'll help.
        - You: Thank you. I mean it.
          - Simon Riggs: Okay. Next time, tell me first.
          - _Ends resolved_
        - You: I won't let it take over our lives.
          - Simon Riggs: I'll hold you to that.
          - _Ends resolved_
    - You: I'm sorry. I wanted to be sure first.
      - Simon Riggs: Okay. Next time, be sure with me.
      - _Ends resolved_
    - You: Will you help me?
      - Simon Riggs: Of course I'll help.
      - You: Thank you. I mean it.
        - Simon Riggs: Okay. Next time, tell me first.
        - _Ends resolved_
      - You: I won't let it take over our lives.
        - Simon Riggs: I'll hold you to that.
        - _Ends resolved_
  - You: You're right. I should have told you first.
    - Simon Riggs: Yes, you should have.
    - _Ends resolved_
  - You: I won't let it take over our lives.
    - Simon Riggs: I'll hold you to that.
    - _Ends resolved_
- You: We'll figure it out together. I promise.
  - Simon Riggs: Okay. Next time, tell me first.
  - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/anxious/5w1s [scene-talk.state-ask.so-you-re-really-doing-this]; L4 auto/ask/scene-talk/nervous/3w1s [scene-talk.auto-ask.who-told-you]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/nervous/7w1s [scene-talk.reply-deflect.i-was-going-to-tell-you-tonight]; L9 reply/comfort/scene-talk/tender/7w2s [scene-talk.reply-comfort.we-ll-figure-it-out-together-i-promise]; L21 follow/promise/scene-talk/tender/3w1s [scene-talk.follow-promise.i-ll-be-there]; L22 reply/thank/scene-talk/tender/5w2s [scene-talk.reply-thank.thank-you-i-mean-it]; L23 reply/promise/scene-talk/tender/8w1s [scene-talk.reply-promise.i-won-t-let-it-take-over-our-lives]; L24 follow/thank/scene-talk/hurt/6w2s [scene-talk.follow-thank.okay-next-time-tell-me-first]</sub>

**Profile cold** (outcome open)

**Simon Riggs:** There you are.

**Simon Riggs:** So you're really doing this?

You could say:

1. Who told you?

**Simon Riggs:** Dylan Riggs told me.

You could say:

1. I'm running because somebody has to.
2. Will you help me? _(the page follows this one)_
3. It's been a long day.
4. It'll be all right. We'll make it work.

**Simon Riggs:** I can't promise that.

**Simon Riggs:** We're not done talking about this.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/anxious/5w1s [scene-talk.state-ask.so-you-re-really-doing-this]; L4 auto/ask/scene-talk/nervous/3w1s [scene-talk.auto-ask.who-told-you]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L9 reply/comfort/scene-talk/tender/8w2s [scene-talk.reply-comfort.it-ll-be-all-right-we-ll-make-it-work]; L30 follow/decline/scene-talk/guarded/4w1s [scene-talk.follow-decline.i-can-t-promise-that]; L31 close/warn/scene-talk/hurt/6w1s [scene-talk.close-warn.we-re-not-done-talking-about-this]</sub>

**Profile stubborn** (outcome open)

**Simon Riggs:** There you are.

**Simon Riggs:** So you're really doing this?

You could say:

1. Who told you?

**Simon Riggs:** Dylan Riggs told me.

You could say:

1. I'm running because somebody has to.
2. Will you help me? _(the page follows this one)_
3. I was going to tell you tonight.
4. We'll figure it out together. I promise.

**Simon Riggs:** I can't promise that.

**Simon Riggs:** We're not done talking about this.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/anxious/5w1s [scene-talk.state-ask.so-you-re-really-doing-this]; L4 auto/ask/scene-talk/nervous/3w1s [scene-talk.auto-ask.who-told-you]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/nervous/7w1s [scene-talk.reply-deflect.i-was-going-to-tell-you-tonight]; L9 reply/comfort/scene-talk/tender/7w2s [scene-talk.reply-comfort.we-ll-figure-it-out-together-i-promise]; L30 follow/decline/scene-talk/guarded/4w1s [scene-talk.follow-decline.i-can-t-promise-that]; L31 close/warn/scene-talk/hurt/6w1s [scene-talk.close-warn.we-re-not-done-talking-about-this]</sub>

**Profile anxious** (outcome open)

**Simon Riggs:** There you are.

**Simon Riggs:** So you're really doing this?

You could say:

1. Who told you?

**Simon Riggs:** Dylan Riggs told me.

You could say:

1. I'm running because somebody has to.
2. Will you help me? _(the page follows this one)_
3. It's been a long day.
4. We'll figure it out together. I promise.

**Simon Riggs:** I don't know if I can.

**Simon Riggs:** We're not done talking about this.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/anxious/5w1s [scene-talk.state-ask.so-you-re-really-doing-this]; L4 auto/ask/scene-talk/nervous/3w1s [scene-talk.auto-ask.who-told-you]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L9 reply/comfort/scene-talk/tender/7w2s [scene-talk.reply-comfort.we-ll-figure-it-out-together-i-promise]; L30 follow/decline/scene-talk/nervous/6w1s [scene-talk.follow-decline.i-don-t-know-if-i-can]; L31 close/warn/scene-talk/hurt/6w1s [scene-talk.close-warn.we-re-not-done-talking-about-this]</sub>

**Profile boastful** (outcome open)

**Simon Riggs:** There you are.

**Simon Riggs:** So you're really doing this?

You could say:

1. How did you know?

**Simon Riggs:** Dylan Riggs told me.

You could say:

1. I'm running because somebody has to.
2. Will you help me? _(the page follows this one)_
3. It's been a long day.
4. We'll figure it out together. I promise.

**Simon Riggs:** I can't promise that.

**Simon Riggs:** We're not done talking about this.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/anxious/5w1s [scene-talk.state-ask.so-you-re-really-doing-this]; L4 auto/ask/scene-talk/nervous/4w1s [scene-talk.auto-ask.how-did-you-know]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L9 reply/comfort/scene-talk/tender/7w2s [scene-talk.reply-comfort.we-ll-figure-it-out-together-i-promise]; L30 follow/decline/scene-talk/guarded/4w1s [scene-talk.follow-decline.i-can-t-promise-that]; L31 close/warn/scene-talk/hurt/6w1s [scene-talk.close-warn.we-re-not-done-talking-about-this]</sub>

## Scene 25: family-win (honor, ends in political) — proof scene

_Purpose family-win. Records: result:contest:seat:gus2025:101811:board:0:2026-11-03, contest:seat:gus2025:101811:board:0:2026-11-03, person_9e002a561a4b29bc._

> You won. Simon Riggs is waiting at the door when you get home.

**Profile warm** (outcome resolved)

**Simon Riggs:** Come here.

**Simon Riggs:** Congratulations. You earned it.

You could say:

1. I couldn't have done it without you. _(the page follows this one)_
2. Things will settle down now. I promise.
3. Not bad for a first run, right?
4. It hasn't sunk in yet.

**Simon Riggs:** You earned this.

**The whole exchange** (14 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You ★: I couldn't have done it without you.
  - Simon Riggs: You earned this.
  - _Ends resolved_
- You: Things will settle down now. I promise.
  - Simon Riggs: Go get some sleep. Big day tomorrow.
  - _Ends resolved_
- You: Not bad for a first run, right?
  - Simon Riggs: Okay, okay. You won. Come inside.
  - You: Okay, okay. I'll stay humble.
    - Simon Riggs: Go get some sleep. Big day tomorrow.
    - _Ends resolved_
  - You: I told you I'd win.
    - Simon Riggs: Don't let it go to your head.
    - You: Okay, okay. I'll stay humble.
      - Simon Riggs: Go get some sleep. Big day tomorrow.
      - _Ends resolved_
    - You: I couldn't have done it without you.
      - Simon Riggs: You earned this.
      - _Ends resolved_
  - You: I couldn't have done it without you.
    - Simon Riggs: You earned this.
    - _Ends resolved_
- You: It hasn't sunk in yet.
  - Simon Riggs: So what happens now?
  - You: I still can't believe it.
    - Simon Riggs: So what happens now?
    - _Ends resolved_
  - You: Things will settle down now. I promise.
    - Simon Riggs: Just don't forget about us.
    - You: I'm going to make this count.
      - Simon Riggs: Go get some sleep. Big day tomorrow.
      - _Ends resolved_
    - You: I couldn't have done it without you.
      - Simon Riggs: You earned this.
      - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/4w2s [scene-talk.state-congratulate.congratulations-you-earned-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L8 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

**Profile cold** (outcome resolved)

**Simon Riggs:** Look who it is!

**Simon Riggs:** Congratulations. You earned it.

You could say:

1. I couldn't have done it without you. _(the page follows this one)_
2. I'm going to make this count.
3. Not bad for a first run, right?
4. It hasn't sunk in yet.

**Simon Riggs:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-it-is]; L3 state/congratulate/scene-talk/glad/4w2s [scene-talk.state-congratulate.congratulations-you-earned-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L8 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

**Profile stubborn** (outcome resolved)

**Simon Riggs:** Come here.

**Simon Riggs:** County Commissioner. You really did it.

You could say:

1. I couldn't have done it without you. _(the page follows this one)_
2. I'm going to make this count.
3. Not bad for a first run, right?
4. It hasn't sunk in yet.

**Simon Riggs:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L8 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

**Profile anxious** (outcome resolved)

**Simon Riggs:** Come here.

**Simon Riggs:** County Commissioner. You really did it.

You could say:

1. I couldn't have done it without you. _(the page follows this one)_
2. Things will settle down now. I promise.
3. Not bad for a first run, right?
4. I still can't believe it.

**Simon Riggs:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/glad/5w1s [scene-talk.reply-tell.i-still-can-t-believe-it]; L8 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

**Profile boastful** (outcome resolved)

**Simon Riggs:** Come here.

**Simon Riggs:** Congratulations. You earned it.

You could say:

1. I couldn't have done it without you. _(the page follows this one)_
2. I'm going to make this count.
3. Not bad for a first run, right?
4. I still can't believe it.

**Simon Riggs:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/4w2s [scene-talk.state-congratulate.congratulations-you-earned-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/glad/5w1s [scene-talk.reply-tell.i-still-can-t-believe-it]; L8 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

## Scene 26: family-win (honor, ends in political) — proof scene

_Purpose family-win. Records: result:contest:seat:gus2025:101811:sheriff:0:2026-11-03, contest:seat:gus2025:101811:sheriff:0:2026-11-03, person_f9be8ef45e5d143f._

> The results are in: you won the race for County Sheriff. Erin McCarthy is the first to reach you.

**Profile warm** (outcome resolved)

**Erin McCarthy:** Look who it is!

**Erin McCarthy:** You did it!

You could say:

1. I couldn't have done it without you.
2. I'm going to make this count.
3. I told you I'd win.
4. I still can't believe it. _(the page follows this one)_

**Erin McCarthy:** You earned this.

You could say:

1. I couldn't have done it without you.
2. Things will settle down now. I promise. _(the page follows this one)_

**Erin McCarthy:** Go get some sleep. Big day tomorrow.

**The whole exchange** (12 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You: I couldn't have done it without you.
  - Erin McCarthy: You earned this.
  - _Ends resolved_
- You: I'm going to make this count.
  - Erin McCarthy: Go get some sleep. Big day tomorrow.
  - _Ends resolved_
- You: I told you I'd win.
  - Erin McCarthy: Okay, okay. You won. Come inside.
  - You: Okay, okay. I'll stay humble.
    - Erin McCarthy: Go get some sleep. Big day tomorrow.
    - _Ends resolved_
  - You: Not bad for a first run, right?
    - Erin McCarthy: Don't let it go to your head.
    - You: Okay, okay. I'll stay humble.
      - Erin McCarthy: Go get some sleep. Big day tomorrow.
      - _Ends resolved_
    - You: I couldn't have done it without you.
      - Erin McCarthy: You earned this.
      - _Ends resolved_
  - You: I couldn't have done it without you.
    - Erin McCarthy: You earned this.
    - _Ends resolved_
- You ★: I still can't believe it.
  - Erin McCarthy: You earned this.
  - You: I couldn't have done it without you.
    - Erin McCarthy: You earned this.
    - _Ends resolved_
  - You ★: Things will settle down now. I promise.
    - Erin McCarthy: Go get some sleep. Big day tomorrow.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/glad/19w2s [scene-talk.narrate-narrate.the-results-are-in-you-won-the-race-for-office-name-is-the-first-to-re]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-it-is]; L3 state/congratulate/scene-talk/glad/3w1s [scene-talk.state-congratulate.you-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/5w1s [scene-talk.reply-boast.i-told-you-i-d-win]; L7 reply/tell/scene-talk/glad/5w1s [scene-talk.reply-tell.i-still-can-t-believe-it]; L21 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L22 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L23 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L25 follow/thank/scene-talk/glad/7w2s [scene-talk.follow-thank.go-get-some-sleep-big-day-tomorrow]</sub>

**Profile cold** (outcome resolved)

**Erin McCarthy:** Look who it is!

**Erin McCarthy:** County Sheriff. You really did it.

You could say:

1. I couldn't have done it without you.
2. Things will settle down now. I promise.
3. I told you I'd win. _(the page follows this one)_
4. It hasn't sunk in yet.

**Erin McCarthy:** Okay, okay. You won. Come inside.

You could say:

1. Okay, okay. I'll stay humble.
2. Not bad for a first run, right? _(the page follows this one)_
3. I couldn't have done it without you.

**Erin McCarthy:** Don't let it go to your head.

You could say:

1. Okay, okay. I'll stay humble.
2. I couldn't have done it without you. _(the page follows this one)_

**Erin McCarthy:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/19w2s [scene-talk.narrate-narrate.the-results-are-in-you-won-the-race-for-office-name-is-the-first-to-re]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-it-is]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/5w1s [scene-talk.reply-boast.i-told-you-i-d-win]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L10 follow/confront/scene-talk/glad/6w3s [scene-talk.follow-confront.okay-okay-you-won-come-inside]; L11 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L12 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L13 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L15 follow/confront/scene-talk/glad/7w1s [scene-talk.follow-confront.don-t-let-it-go-to-your-head]; L16 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L17 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L19 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

**Profile stubborn** (outcome resolved)

**Erin McCarthy:** Look who it is!

**Erin McCarthy:** You did it!

You could say:

1. I couldn't have done it without you.
2. Things will settle down now. I promise.
3. I told you I'd win. _(the page follows this one)_
4. It hasn't sunk in yet.

**Erin McCarthy:** Okay, okay. You won. Come inside.

You could say:

1. Okay, okay. I'll stay humble.
2. Not bad for a first run, right? _(the page follows this one)_
3. I couldn't have done it without you.

**Erin McCarthy:** Don't let it go to your head.

You could say:

1. Okay, okay. I'll stay humble.
2. I couldn't have done it without you. _(the page follows this one)_

**Erin McCarthy:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/19w2s [scene-talk.narrate-narrate.the-results-are-in-you-won-the-race-for-office-name-is-the-first-to-re]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-it-is]; L3 state/congratulate/scene-talk/glad/3w1s [scene-talk.state-congratulate.you-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/5w1s [scene-talk.reply-boast.i-told-you-i-d-win]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L10 follow/confront/scene-talk/glad/6w3s [scene-talk.follow-confront.okay-okay-you-won-come-inside]; L11 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L12 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L13 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L15 follow/confront/scene-talk/glad/7w1s [scene-talk.follow-confront.don-t-let-it-go-to-your-head]; L16 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L17 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L19 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

## Scene 27: family-win (honor, ends in political) — proof scene

_Purpose family-win. Records: result:contest:seat:gus2025:101811:assessor:0:2026-11-03, contest:seat:gus2025:101811:assessor:0:2026-11-03, person_8875c9c2afd1ae76._

> You won. Andrew Peters is waiting at the door when you get home.

**Profile warm** (outcome resolved)

**Andrew Peters:** Look who it is!

**Andrew Peters:** County assessor. You really did it.

You could say:

1. I couldn't have done it without you.
2. Things will settle down now. I promise.
3. Not bad for a first run, right?
4. I still can't believe it. _(the page follows this one)_

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you. _(the page follows this one)_
2. Things will settle down now. I promise.

**Andrew Peters:** You earned this.

**The whole exchange** (12 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You: I couldn't have done it without you.
  - Andrew Peters: You earned this.
  - _Ends resolved_
- You: Things will settle down now. I promise.
  - Andrew Peters: Go get some sleep. Big day tomorrow.
  - _Ends resolved_
- You: Not bad for a first run, right?
  - Andrew Peters: Don't let it go to your head.
  - You: Okay, okay. I'll stay humble.
    - Andrew Peters: Go get some sleep. Big day tomorrow.
    - _Ends resolved_
  - You: I told you I'd win.
    - Andrew Peters: Okay, okay. You won. Come inside.
    - You: Okay, okay. I'll stay humble.
      - Andrew Peters: Go get some sleep. Big day tomorrow.
      - _Ends resolved_
    - You: I couldn't have done it without you.
      - Andrew Peters: You earned this.
      - _Ends resolved_
  - You: I couldn't have done it without you.
    - Andrew Peters: You earned this.
    - _Ends resolved_
- You ★: I still can't believe it.
  - Andrew Peters: You earned this.
  - You ★: I couldn't have done it without you.
    - Andrew Peters: You earned this.
    - _Ends resolved_
  - You: Things will settle down now. I promise.
    - Andrew Peters: Go get some sleep. Big day tomorrow.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-it-is]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/glad/5w1s [scene-talk.reply-tell.i-still-can-t-believe-it]; L21 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L22 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L23 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L24 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

**Profile cold** (outcome resolved)

**Andrew Peters:** Look who it is!

**Andrew Peters:** County assessor. You really did it.

You could say:

1. I couldn't have done it without you.
2. I'm going to make this count.
3. Not bad for a first run, right?
4. I still can't believe it. _(the page follows this one)_

**Andrew Peters:** So what happens now?

You could say:

1. It hasn't sunk in yet. _(the page follows this one)_
2. I'm going to make this count.

**Andrew Peters:** So what happens now?

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-it-is]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/glad/5w1s [scene-talk.reply-tell.i-still-can-t-believe-it]; L21 follow/ask/scene-talk/curious/4w1s [scene-talk.follow-ask.so-what-happens-now]; L22 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L23 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L24 follow/ask/scene-talk/curious/4w1s [scene-talk.follow-ask.so-what-happens-now]</sub>

**Profile stubborn** (outcome resolved)

**Andrew Peters:** Come here.

**Andrew Peters:** County assessor. You really did it.

You could say:

1. I couldn't have done it without you.
2. Things will settle down now. I promise.
3. Not bad for a first run, right?
4. It hasn't sunk in yet. _(the page follows this one)_

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you. _(the page follows this one)_
2. I'm going to make this count.

**Andrew Peters:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L21 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L22 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L23 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L24 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

**Profile anxious** (outcome resolved)

**Andrew Peters:** Look who it is!

**Andrew Peters:** County assessor. You really did it.

You could say:

1. I couldn't have done it without you.
2. I'm going to make this count.
3. Not bad for a first run, right?
4. It hasn't sunk in yet. _(the page follows this one)_

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you. _(the page follows this one)_
2. Things will settle down now. I promise.

**Andrew Peters:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-it-is]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L25 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L26 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L27 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L28 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

**Profile boastful** (outcome resolved)

**Andrew Peters:** Come here.

**Andrew Peters:** County assessor. You really did it.

You could say:

1. I couldn't have done it without you.
2. Things will settle down now. I promise.
3. Not bad for a first run, right?
4. I still can't believe it. _(the page follows this one)_

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you. _(the page follows this one)_
2. I'm going to make this count.

**Andrew Peters:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/glad/5w1s [scene-talk.reply-tell.i-still-can-t-believe-it]; L21 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L22 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L23 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L24 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

## Scene 28: family-loss (loss, ends in political) — proof scene

_Purpose family-loss. Records: result:contest:seat:US-DE:us-house:00:2026-11-03, contest:seat:US-DE:us-house:00:2026-11-03, person_11d13d68898d12e8, person_11d13e68898d149b, official:term:seat:US-DE:us-house:00:2026-10-12._

> You lost the race for U.S. Representative. The house is quiet when you get home, and Justin McConnell is still up.

**Profile warm** (outcome resolved)

**Justin McConnell:** I saved you a plate.

**Justin McConnell:** I'm sorry about the race.

You could say:

1. Thank you. I needed that.
2. Julie Nolan ran a dirty race.
3. I'm fine. Really.
4. This isn't the end of it. _(the page follows this one)_

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. It's hard to hear it was that close.
2. I'll run again. _(the page follows this one)_

**Justin McConnell:** Are you sure that's what you want?

**The whole exchange** (52 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You: Thank you. I needed that.
  - Justin McConnell: We'll get through this.
  - _Ends resolved_
- You: Julie Nolan ran a dirty race.
  - Justin McConnell: You did everything you could.
  - You: Thank you. I needed that.
    - Justin McConnell: We'll get through this.
    - _Ends resolved_
  - You: It's hard to hear it was that close.
    - Justin McConnell: It wasn't your fault.
    - You: Thanks for waiting up.
      - Justin McConnell: We'll get through this.
      - _Ends resolved_
    - You: I really thought we had it.
      - Justin McConnell: You did everything you could.
      - You: Thank you. I needed that.
        - Justin McConnell: We'll get through this.
        - _Ends resolved_
      - You: This isn't the end of it.
        - Justin McConnell: Are you sure that's what you want?
        - _Ends resolved_
    - You: I'll run again.
      - Justin McConnell: Are you sure that's what you want?
      - You: I really thought we had it.
        - Justin McConnell: You did everything you could.
        - You: Thanks for waiting up.
          - Justin McConnell: We'll get through this.
          - _Ends resolved_
        - You: This isn't the end of it.
          - Justin McConnell: We'll get through this.
          - _Ends resolved_
      - You: This isn't the end of it.
        - Justin McConnell: Are you sure that's what you want?
        - _Ends resolved_
  - You: This isn't the end of it.
    - Justin McConnell: Are you sure that's what you want?
    - You: It's hard to hear it was that close.
      - Justin McConnell: It wasn't your fault.
      - You: Thanks for waiting up.
        - Justin McConnell: We'll get through this.
        - _Ends resolved_
      - You: I really thought we had it.
        - Justin McConnell: You did everything you could.
        - You: Thanks for waiting up.
          - Justin McConnell: We'll get through this.
          - _Ends resolved_
        - You: I'll run again.
          - Justin McConnell: We'll get through this.
          - _Ends resolved_
      - You: I'll run again.
        - Justin McConnell: Are you sure that's what you want?
        - _Ends resolved_
    - You: I'll run again.
      - Justin McConnell: Are you sure that's what you want?
      - _Ends resolved_
- You: I'm fine. Really.
  - Justin McConnell: Talk to me.
  - You: I really thought we had it.
    - Justin McConnell: It wasn't your fault.
    - You: Thank you. I needed that.
      - Justin McConnell: We'll get through this.
      - _Ends resolved_
    - You: It's hard to hear it was that close.
      - Justin McConnell: You did everything you could.
      - You: Thanks for waiting up.
        - Justin McConnell: We'll get through this.
        - _Ends resolved_
      - You: I'll run again.
        - Justin McConnell: Are you sure that's what you want?
        - _Ends resolved_
    - You: I'll run again.
      - Justin McConnell: Are you sure that's what you want?
      - You: It's hard to hear it was that close.
        - Justin McConnell: You did everything you could.
        - You: Thanks for waiting up.
          - Justin McConnell: We'll get through this.
          - _Ends resolved_
        - You: This isn't the end of it.
          - Justin McConnell: We'll get through this.
          - _Ends resolved_
      - You: This isn't the end of it.
        - Justin McConnell: Are you sure that's what you want?
        - _Ends resolved_
  - You: Thank you. I needed that.
    - Justin McConnell: We'll get through this.
    - _Ends resolved_
  - You: I don't want to talk about it tonight.
    - Justin McConnell: Talk to me.
    - You: I really thought we had it.
      - Justin McConnell: You did everything you could.
      - You: Thank you. I needed that.
        - Justin McConnell: We'll get through this.
        - _Ends resolved_
      - You: It's hard to hear it was that close.
        - Justin McConnell: It wasn't your fault.
        - You: Thanks for waiting up.
          - Justin McConnell: We'll get through this.
          - _Ends resolved_
        - You: I'll run again.
          - Justin McConnell: We'll get through this.
          - _Ends resolved_
      - You: This isn't the end of it.
        - Justin McConnell: Are you sure that's what you want?
        - You: It's hard to hear it was that close.
          - Justin McConnell: It wasn't your fault.
          - _Ends resolved_
        - You: I'll run again.
          - Justin McConnell: We'll get through this.
          - _Ends resolved_
    - You: Thanks for waiting up.
      - Justin McConnell: We'll get through this.
      - _Ends resolved_
- You ★: This isn't the end of it.
  - Justin McConnell: Are you sure that's what you want?
  - You: It's hard to hear it was that close.
    - Justin McConnell: It wasn't your fault.
    - You: Thank you. I needed that.
      - Justin McConnell: We'll get through this.
      - _Ends resolved_
    - You: I really thought we had it.
      - Justin McConnell: You did everything you could.
      - You: Thanks for waiting up.
        - Justin McConnell: We'll get through this.
        - _Ends resolved_
      - You: I'll run again.
        - Justin McConnell: Are you sure that's what you want?
        - _Ends resolved_
    - You: I'll run again.
      - Justin McConnell: Are you sure that's what you want?
      - _Ends resolved_
  - You ★: I'll run again.
    - Justin McConnell: Are you sure that's what you want?
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/solemn/21w3s [scene-talk.narrate-narrate.you-lost-the-race-for-office-the-house-is-quiet-when-you-get-home-and-]; L2 open/greet/scene-talk/tender/5w1s [scene-talk.open-greet.i-saved-you-a-plate]; L3 state/comfort/scene-talk/tender/5w1s [scene-talk.state-comfort.i-m-sorry-about-the-race]; L4 reply/thank/scene-talk/tender/5w2s [scene-talk.reply-thank.thank-you-i-needed-that]; L5 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.opponent-ran-a-dirty-race]; L6 reply/deflect/scene-talk/guarded/3w2s [scene-talk.reply-deflect.i-m-fine-really]; L7 reply/promise/scene-talk/braced/6w1s [scene-talk.reply-promise.this-isn-t-the-end-of-it]; L91 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L92 reply/tell/scene-talk/hurt/8w1s [scene-talk.reply-tell.it-s-hard-to-hear-it-was-that-close]; L93 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L105 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]</sub>

**Profile cold** (outcome resolved)

**Justin McConnell:** Hey. Come sit down.

**Justin McConnell:** You don't have to talk about it.

You could say:

1. Thank you. I needed that.
2. Julie Nolan ran a dirty race.
3. I don't want to talk about it tonight.
4. I'll run again. _(the page follows this one)_

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. It's hard to hear it was that close.
2. This isn't the end of it. _(the page follows this one)_

**Justin McConnell:** Are you sure that's what you want?

<sub>L1 narrate/narrate/scene-talk/solemn/21w3s [scene-talk.narrate-narrate.you-lost-the-race-for-office-the-house-is-quiet-when-you-get-home-and-]; L2 open/greet/scene-talk/tender/4w2s [scene-talk.open-greet.hey-come-sit-down]; L3 state/comfort/scene-talk/tender/7w1s [scene-talk.state-comfort.you-don-t-have-to-talk-about-it]; L4 reply/thank/scene-talk/tender/5w2s [scene-talk.reply-thank.thank-you-i-needed-that]; L5 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.opponent-ran-a-dirty-race]; L6 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-don-t-want-to-talk-about-it-tonight]; L7 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L75 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L76 reply/tell/scene-talk/hurt/8w1s [scene-talk.reply-tell.it-s-hard-to-hear-it-was-that-close]; L77 reply/promise/scene-talk/braced/6w1s [scene-talk.reply-promise.this-isn-t-the-end-of-it]; L89 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]</sub>

**Profile stubborn** (outcome resolved)

**Justin McConnell:** Hey. Come sit down.

**Justin McConnell:** You don't have to talk about it.

You could say:

1. Thanks for waiting up.
2. Julie Nolan ran a dirty race.
3. I don't want to talk about it tonight.
4. This isn't the end of it. _(the page follows this one)_

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. It's hard to hear it was that close.
2. I'll run again. _(the page follows this one)_

**Justin McConnell:** Are you sure that's what you want?

<sub>L1 narrate/narrate/scene-talk/solemn/21w3s [scene-talk.narrate-narrate.you-lost-the-race-for-office-the-house-is-quiet-when-you-get-home-and-]; L2 open/greet/scene-talk/tender/4w2s [scene-talk.open-greet.hey-come-sit-down]; L3 state/comfort/scene-talk/tender/7w1s [scene-talk.state-comfort.you-don-t-have-to-talk-about-it]; L4 reply/thank/scene-talk/tender/4w1s [scene-talk.reply-thank.thanks-for-waiting-up]; L5 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.opponent-ran-a-dirty-race]; L6 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-don-t-want-to-talk-about-it-tonight]; L7 reply/promise/scene-talk/braced/6w1s [scene-talk.reply-promise.this-isn-t-the-end-of-it]; L75 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L76 reply/tell/scene-talk/hurt/8w1s [scene-talk.reply-tell.it-s-hard-to-hear-it-was-that-close]; L77 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L89 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]</sub>

**Profile anxious** (outcome resolved)

**Justin McConnell:** Hey. Come sit down.

**Justin McConnell:** I'm sorry about the race.

You could say:

1. Thanks for waiting up.
2. Julie Nolan ran a dirty race.
3. I don't want to talk about it tonight.
4. This isn't the end of it. _(the page follows this one)_

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. It's hard to hear it was that close.
2. I'll run again. _(the page follows this one)_

**Justin McConnell:** Are you sure that's what you want?

<sub>L1 narrate/narrate/scene-talk/solemn/21w3s [scene-talk.narrate-narrate.you-lost-the-race-for-office-the-house-is-quiet-when-you-get-home-and-]; L2 open/greet/scene-talk/tender/4w2s [scene-talk.open-greet.hey-come-sit-down]; L3 state/comfort/scene-talk/tender/5w1s [scene-talk.state-comfort.i-m-sorry-about-the-race]; L4 reply/thank/scene-talk/tender/4w1s [scene-talk.reply-thank.thanks-for-waiting-up]; L5 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.opponent-ran-a-dirty-race]; L6 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-don-t-want-to-talk-about-it-tonight]; L7 reply/promise/scene-talk/braced/6w1s [scene-talk.reply-promise.this-isn-t-the-end-of-it]; L75 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L76 reply/tell/scene-talk/hurt/8w1s [scene-talk.reply-tell.it-s-hard-to-hear-it-was-that-close]; L77 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L89 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]</sub>

**Profile boastful** (outcome resolved)

**Justin McConnell:** I saved you a plate.

**Justin McConnell:** I'm sorry about the race.

You could say:

1. Thank you. I needed that.
2. Julie Nolan ran a dirty race.
3. I don't want to talk about it tonight.
4. This isn't the end of it. _(the page follows this one)_

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. It's hard to hear it was that close. _(the page follows this one)_
2. I'll run again.

**Justin McConnell:** You did everything you could.

You could say:

1. Thank you. I needed that.
2. I really thought we had it. _(the page follows this one)_
3. I'll run again.

**Justin McConnell:** It wasn't your fault.

You could say:

1. Thank you. I needed that.
2. I'll run again. _(the page follows this one)_

**Justin McConnell:** Are you sure that's what you want?

<sub>L1 narrate/narrate/scene-talk/solemn/21w3s [scene-talk.narrate-narrate.you-lost-the-race-for-office-the-house-is-quiet-when-you-get-home-and-]; L2 open/greet/scene-talk/tender/5w1s [scene-talk.open-greet.i-saved-you-a-plate]; L3 state/comfort/scene-talk/tender/5w1s [scene-talk.state-comfort.i-m-sorry-about-the-race]; L4 reply/thank/scene-talk/tender/5w2s [scene-talk.reply-thank.thank-you-i-needed-that]; L5 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.opponent-ran-a-dirty-race]; L6 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-don-t-want-to-talk-about-it-tonight]; L7 reply/promise/scene-talk/braced/6w1s [scene-talk.reply-promise.this-isn-t-the-end-of-it]; L75 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L76 reply/tell/scene-talk/hurt/8w1s [scene-talk.reply-tell.it-s-hard-to-hear-it-was-that-close]; L77 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L78 follow/comfort/scene-talk/tender/5w1s [scene-talk.follow-comfort.you-did-everything-you-could]; L79 reply/thank/scene-talk/tender/5w2s [scene-talk.reply-thank.thank-you-i-needed-that]; L80 reply/tell/scene-talk/hurt/6w1s [scene-talk.reply-tell.i-really-thought-we-had-it]; L81 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L83 follow/comfort/scene-talk/tender/4w1s [scene-talk.follow-comfort.it-wasn-t-your-fault]; L84 reply/thank/scene-talk/tender/5w2s [scene-talk.reply-thank.thank-you-i-needed-that]; L85 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L87 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]</sub>

## Scene 29: family-absence (threat, ends in political) — proof scene

_Purpose family-absence. Records: term:seat:gus2025:101811:board:6:2027-01-01:elected, person_d3c11e75ee46a9b9, person_d3c12275ee46b085._

> You've been at the office late every night this week. Bentley Rivas is waiting up for you.

**Profile warm** (outcome resolved)

**Bentley Rivas:** You're home.

**Bentley Rivas:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise. _(the page follows this one)_
3. It's just a busy stretch.
4. I'm doing this for us, too.
5. This is the last late night. I promise.

**Bentley Rivas:** You said that last month.

You could say:

1. This weekend is ours. No calls. _(the page follows this one)_
2. I've let things slide at home. I know.
3. I'm doing this for us, too.

**Bentley Rivas:** I'm holding you to it.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, resolved, open, open, resolved, resolved, resolved, resolved, open, resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- You: I've let things slide at home. I know.
  - Bentley Rivas: I just miss you, that's all.
  - _Ends resolved_
- You ★: I'll be home more. I promise.
  - Bentley Rivas: You said that last month.
  - You ★: This weekend is ours. No calls.
    - Bentley Rivas: I'm holding you to it.
    - _Ends resolved_
  - You: I've let things slide at home. I know.
    - Bentley Rivas: I just miss you, that's all.
    - _Ends resolved_
  - You: I'm doing this for us, too.
    - Bentley Rivas: We didn't ask for this.
    - You: You're right. I'm sorry.
      - Bentley Rivas: Saying sorry isn't the same as being here.
      - You: This weekend is ours. No calls.
        - Bentley Rivas: I'm holding you to it.
        - _Ends resolved_
      - You: I've let things slide at home. I know.
        - Bentley Rivas: I just miss you, that's all.
        - _Ends resolved_
      - You: This job doesn't leave much time. You know that.
        - Bentley Rivas: That's not fair, and you know it.
        - _Ends open: Bentley Rivas: We're not done talking about this._
    - You: This job doesn't leave much time. You know that.
      - Bentley Rivas: Don't put this on me.
      - _Ends open: Bentley Rivas: We're not done talking about this._
- You: It's just a busy stretch.
  - Bentley Rivas: You said that last time.
  - You: This weekend is ours. No calls.
    - Bentley Rivas: I'm holding you to it.
    - _Ends resolved_
  - You: I've let things slide at home. I know.
    - Bentley Rivas: I just miss you, that's all.
    - _Ends resolved_
  - You: I'm doing this for us, too.
    - Bentley Rivas: We didn't ask for this.
    - You: I've let things slide at home. I know.
      - Bentley Rivas: I just miss you, that's all.
      - _Ends resolved_
    - You: This job doesn't leave much time. You know that.
      - Bentley Rivas: That's not fair, and you know it.
      - You: You're right. I'm sorry.
        - Bentley Rivas: Saying sorry isn't the same as being here.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: I've let things slide at home. I know.
          - (the tree is cut here)
      - You: I'll be home more. I promise.
        - Bentley Rivas: You said that last month.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: You're right. I'm sorry.
          - (the tree is cut here)
    - You: I'll be home more. I promise.
      - Bentley Rivas: You said that last month.
      - You: This weekend is ours. No calls.
        - Bentley Rivas: I'm holding you to it.
        - _Ends resolved_
      - You: You're right. I'm sorry.
        - Bentley Rivas: Saying sorry isn't the same as being here.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: I've let things slide at home. I know.
          - (the tree is cut here)
        - You: This job doesn't leave much time. You know that.
          - (the tree is cut here)
      - You: This job doesn't leave much time. You know that.
        - Bentley Rivas: Don't put this on me.
        - _Ends open: Bentley Rivas: I'm going to bed. We'll talk tomorrow._
- You: I'm doing this for us, too.
  - Bentley Rivas: We didn't ask for this.
  - You: I've let things slide at home. I know.
    - Bentley Rivas: I just miss you, that's all.
    - _Ends resolved_
  - You: This job doesn't leave much time. You know that.
    - Bentley Rivas: That's not fair, and you know it.
    - You: You're right. I'm sorry.
      - Bentley Rivas: Saying sorry isn't the same as being here.
      - You: This weekend is ours. No calls.
        - Bentley Rivas: I'm holding you to it.
        - _Ends resolved_
      - You: I've let things slide at home. I know.
        - Bentley Rivas: I just miss you, that's all.
        - _Ends resolved_
    - You: I'll be home more. I promise.
      - Bentley Rivas: You said that last month.
      - You: This weekend is ours. No calls.
        - Bentley Rivas: I'm holding you to it.
        - _Ends resolved_
      - You: You're right. I'm sorry.
        - Bentley Rivas: Saying sorry isn't the same as being here.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: I've let things slide at home. I know.
          - (the tree is cut here)
  - You: I'll be home more. I promise.
    - Bentley Rivas: You said that last month.
    - You: This weekend is ours. No calls.
      - Bentley Rivas: I'm holding you to it.
      - _Ends resolved_
    - You: I've let things slide at home. I know.
      - Bentley Rivas: I just miss you, that's all.
      - _Ends resolved_
    - You: This job doesn't leave much time. You know that.
      - Bentley Rivas: That's not fair, and you know it.
      - _Ends open: Bentley Rivas: We're not done talking about this._
- You: This is the last late night. I promise.
  - _if Bentley Rivas knows:_
    - Bentley Rivas: You said that last week.
    - You: You're right. I'm sorry.
      - Bentley Rivas: Thank you for telling me.
      - You: Thank you for waiting up.
        - Bentley Rivas: I always will.
        - _Ends resolved_
      - You: It's been a hard week at the office.
        - Bentley Rivas: Come sit down. Tell me about it.
        - You: Thank you for waiting up.
          - Bentley Rivas: I always will.
          - _Ends resolved_
        - You: I'll be home more. I promise.
          - Bentley Rivas: You said that last month.
          - You: This weekend is ours. No calls.
            - (the tree is cut here)
          - You: I've let things slide at home. I know.
            - (the tree is cut here)
          - You: I'm doing this for us, too.
            - (the tree is cut here)
        - You: Can we not do this tonight?
          - Bentley Rivas: You said that last time.
          - You: This weekend is ours. No calls.
            - (the tree is cut here)
          - You: I've let things slide at home. I know.
            - (the tree is cut here)
          - You: I'm doing this for us, too.
            - (the tree is cut here)
      - You: I'll be home more. I promise.
        - Bentley Rivas: You said that last month.
        - You: This weekend is ours. No calls.
          - Bentley Rivas: I'm holding you to it.
          - _Ends resolved_
        - You: I've let things slide at home. I know.
          - Bentley Rivas: I just miss you, that's all.
          - _Ends resolved_
        - You: This job doesn't leave much time. You know that.
          - Bentley Rivas: That's not fair, and you know it.
          - You: I've let things slide at home. I know.
            - (the tree is cut here)
          - You: I'm doing this for us, too.
            - (the tree is cut here)
      - You: It's just a busy stretch.
        - Bentley Rivas: You said that last time.
        - You: This weekend is ours. No calls.
          - Bentley Rivas: I'm holding you to it.
          - _Ends resolved_
        - You: I've let things slide at home. I know.
          - Bentley Rivas: I just miss you, that's all.
          - _Ends resolved_
        - You: I'm doing this for us, too.
          - Bentley Rivas: We didn't ask for this.
          - You: I've let things slide at home. I know.
            - (the tree is cut here)
          - You: This job doesn't leave much time. You know that.
            - (the tree is cut here)
          - You: I'll be home more. I promise.
            - (the tree is cut here)
    - You: It's just a busy stretch.
      - Bentley Rivas: You said that last time.
      - You: This weekend is ours. No calls.
        - Bentley Rivas: I'm holding you to it.
        - _Ends resolved_
      - You: I've let things slide at home. I know.
        - Bentley Rivas: I just miss you, that's all.
        - _Ends resolved_
      - You: I'm doing this for us, too.
        - Bentley Rivas: We didn't ask for this.
        - You: I've let things slide at home. I know.
          - Bentley Rivas: I just miss you, that's all.
          - _Ends resolved_
        - You: This job doesn't leave much time. You know that.
          - Bentley Rivas: That's not fair, and you know it.
          - You: I've let things slide at home. I know.
            - (the tree is cut here)
          - You: I'll be home more. I promise.
            - (the tree is cut here)
        - You: I'll be home more. I promise.
          - (the tree is cut here)
    - You: It was a late committee meeting. That's all.
      - _Ends open: Bentley Rivas: I'm going to bed. We'll talk tomorrow._
  - _if not:_
    - Bentley Rivas: Okay. Come eat something.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/hurt/2w1s [scene-talk.open-greet.you-re-home]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-just-a-busy-stretch]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.this-is-the-last-late-night-i-promise]; L10 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-month]; L11 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L12 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L13 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L14 follow/accept/scene-talk/tender/5w1s [scene-talk.follow-accept.i-m-holding-you-to-it]</sub>

**Profile cold** (outcome resolved)

**Bentley Rivas:** Oh. You're back.

**Bentley Rivas:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise. _(the page follows this one)_
3. It's just a busy stretch.
4. This job doesn't leave much time. You know that.
5. This is the last late night. I promise.

**Bentley Rivas:** You said that last month.

You could say:

1. This weekend is ours. No calls. _(the page follows this one)_
2. I've let things slide at home. I know.
3. This job doesn't leave much time. You know that.

**Bentley Rivas:** I'm holding you to it.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-just-a-busy-stretch]; L7 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.this-is-the-last-late-night-i-promise]; L10 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-month]; L11 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L12 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L13 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L14 follow/accept/scene-talk/tender/5w1s [scene-talk.follow-accept.i-m-holding-you-to-it]</sub>

**Profile stubborn** (outcome resolved)

**Bentley Rivas:** Oh. You're back.

**Bentley Rivas:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise. _(the page follows this one)_
3. Can we not do this tonight?
4. I'm doing this for us, too.
5. This is the last late night. I promise.

**Bentley Rivas:** You said that last month.

You could say:

1. This weekend is ours. No calls. _(the page follows this one)_
2. I've let things slide at home. I know.
3. This job doesn't leave much time. You know that.

**Bentley Rivas:** I'm holding you to it.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.this-is-the-last-late-night-i-promise]; L10 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-month]; L11 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L12 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L13 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L14 follow/accept/scene-talk/tender/5w1s [scene-talk.follow-accept.i-m-holding-you-to-it]</sub>

**Profile anxious** (outcome resolved)

**Bentley Rivas:** You're home.

**Bentley Rivas:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise. _(the page follows this one)_
3. Can we not do this tonight?
4. This job doesn't leave much time. You know that.
5. This is the last late night. I promise.

**Bentley Rivas:** You said that last month.

You could say:

1. This weekend is ours. No calls. _(the page follows this one)_
2. I've let things slide at home. I know.
3. I'm doing this for us, too.

**Bentley Rivas:** I'm holding you to it.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/hurt/2w1s [scene-talk.open-greet.you-re-home]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.this-is-the-last-late-night-i-promise]; L10 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-month]; L11 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L12 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L13 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L14 follow/accept/scene-talk/tender/5w1s [scene-talk.follow-accept.i-m-holding-you-to-it]</sub>

## Scene 30: family-absence (threat, ends in political) — proof scene

_Purpose family-absence. Records: term:seat:gus2025:101811:board:3:2026-10-12, person_bc041cf6bd9d1894, person_bc041df6bd9d1a47._

> You've been at the office late every night this week. Olivia Keller is waiting up for you.

**Profile warm** (outcome resolved)

**Olivia Keller:** Oh. You're back.

**Olivia Keller:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise. _(the page follows this one)_
3. Can we not do this tonight?
4. I'm doing this for us, too.
5. It was a late committee meeting. That's all.

**Olivia Keller:** You said that last month.

You could say:

1. This weekend is ours. No calls. _(the page follows this one)_
2. I've let things slide at home. I know.
3. I'm doing this for us, too.

**Olivia Keller:** I'm holding you to it.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- You: I've let things slide at home. I know.
  - Olivia Keller: I just miss you, that's all.
  - _Ends resolved_
- You ★: I'll be home more. I promise.
  - Olivia Keller: You said that last month.
  - You ★: This weekend is ours. No calls.
    - Olivia Keller: I'm holding you to it.
    - _Ends resolved_
  - You: I've let things slide at home. I know.
    - Olivia Keller: I just miss you, that's all.
    - _Ends resolved_
  - You: I'm doing this for us, too.
    - Olivia Keller: We didn't ask for this.
    - You: I've let things slide at home. I know.
      - Olivia Keller: I just miss you, that's all.
      - _Ends resolved_
    - You: This job doesn't leave much time. You know that.
      - Olivia Keller: We miss you. That's all.
      - You: This weekend is ours. No calls.
        - Olivia Keller: I'm holding you to it.
        - _Ends resolved_
      - You: I've let things slide at home. I know.
        - Olivia Keller: I just miss you, that's all.
        - _Ends resolved_
      - You: Can we not do this tonight?
        - Olivia Keller: We miss you. That's all.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: You're right. I'm sorry.
          - (the tree is cut here)
        - You: It's just a busy stretch.
          - (the tree is cut here)
- You: Can we not do this tonight?
  - Olivia Keller: We miss you. That's all.
  - You: This weekend is ours. No calls.
    - Olivia Keller: I'm holding you to it.
    - _Ends resolved_
  - You: You're right. I'm sorry.
    - Olivia Keller: Saying sorry isn't the same as being here.
    - You: This weekend is ours. No calls.
      - Olivia Keller: I'm holding you to it.
      - _Ends resolved_
    - You: I've let things slide at home. I know.
      - Olivia Keller: I just miss you, that's all.
      - _Ends resolved_
    - You: I'm doing this for us, too.
      - Olivia Keller: We didn't ask for this.
      - You: I've let things slide at home. I know.
        - Olivia Keller: I just miss you, that's all.
        - _Ends resolved_
      - You: This job doesn't leave much time. You know that.
        - Olivia Keller: We miss you. That's all.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: I've let things slide at home. I know.
          - (the tree is cut here)
        - You: It's just a busy stretch.
          - (the tree is cut here)
      - You: I'll be home more. I promise.
        - Olivia Keller: You said that last month.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: I've let things slide at home. I know.
          - (the tree is cut here)
        - You: This job doesn't leave much time. You know that.
          - (the tree is cut here)
  - You: It's just a busy stretch.
    - Olivia Keller: We miss you. That's all.
    - You: This weekend is ours. No calls.
      - Olivia Keller: I'm holding you to it.
      - _Ends resolved_
    - You: I've let things slide at home. I know.
      - Olivia Keller: I just miss you, that's all.
      - _Ends resolved_
- You: I'm doing this for us, too.
  - Olivia Keller: We didn't ask for this.
  - You: I've let things slide at home. I know.
    - Olivia Keller: I just miss you, that's all.
    - _Ends resolved_
  - You: This job doesn't leave much time. You know that.
    - Olivia Keller: We miss you. That's all.
    - You: This weekend is ours. No calls.
      - Olivia Keller: I'm holding you to it.
      - _Ends resolved_
    - You: I've let things slide at home. I know.
      - Olivia Keller: I just miss you, that's all.
      - _Ends resolved_
    - You: Can we not do this tonight?
      - Olivia Keller: We miss you. That's all.
      - You: This weekend is ours. No calls.
        - Olivia Keller: I'm holding you to it.
        - _Ends resolved_
      - You: You're right. I'm sorry.
        - Olivia Keller: Saying sorry isn't the same as being here.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: I've let things slide at home. I know.
          - (the tree is cut here)
      - You: It's just a busy stretch.
        - Olivia Keller: We miss you. That's all.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: You're right. I'm sorry.
          - (the tree is cut here)
  - You: I'll be home more. I promise.
    - Olivia Keller: You said that last month.
    - You: This weekend is ours. No calls.
      - Olivia Keller: I'm holding you to it.
      - _Ends resolved_
    - You: You're right. I'm sorry.
      - Olivia Keller: Saying sorry isn't the same as being here.
      - You: This weekend is ours. No calls.
        - Olivia Keller: I'm holding you to it.
        - _Ends resolved_
      - You: I've let things slide at home. I know.
        - Olivia Keller: I just miss you, that's all.
        - _Ends resolved_
      - You: This job doesn't leave much time. You know that.
        - Olivia Keller: We miss you. That's all.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: I've let things slide at home. I know.
          - (the tree is cut here)
        - You: It's just a busy stretch.
          - (the tree is cut here)
    - You: This job doesn't leave much time. You know that.
      - Olivia Keller: We miss you. That's all.
      - You: This weekend is ours. No calls.
        - Olivia Keller: I'm holding you to it.
        - _Ends resolved_
      - You: You're right. I'm sorry.
        - Olivia Keller: Saying sorry isn't the same as being here.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: I've let things slide at home. I know.
          - (the tree is cut here)
      - You: Can we not do this tonight?
        - Olivia Keller: We miss you. That's all.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: You're right. I'm sorry.
          - (the tree is cut here)
        - You: It's just a busy stretch.
          - (the tree is cut here)
- You: It was a late committee meeting. That's all.
  - _if Olivia Keller knows:_
    - Olivia Keller: I called the office. There was no meeting.
    - You: You're right. I'm sorry.
      - Olivia Keller: Thank you for telling me.
      - You: Thank you for waiting up.
        - Olivia Keller: I always will.
        - _Ends resolved_
      - You: It's been a hard week at the office.
        - Olivia Keller: Come sit down. Tell me about it.
        - You: Thank you for waiting up.
          - Olivia Keller: I always will.
          - _Ends resolved_
        - You: I'll be home more. I promise.
          - Olivia Keller: You said that last month.
          - You: This weekend is ours. No calls.
            - (the tree is cut here)
          - You: I've let things slide at home. I know.
            - (the tree is cut here)
          - You: I'm doing this for us, too.
            - (the tree is cut here)
        - You: Can we not do this tonight?
          - Olivia Keller: You said that last time.
          - You: This weekend is ours. No calls.
            - (the tree is cut here)
          - You: I've let things slide at home. I know.
            - (the tree is cut here)
          - You: I'm doing this for us, too.
            - (the tree is cut here)
      - You: I'll be home more. I promise.
        - Olivia Keller: You said that last month.
        - You: This weekend is ours. No calls.
          - Olivia Keller: I'm holding you to it.
          - _Ends resolved_
        - You: I've let things slide at home. I know.
          - Olivia Keller: I just miss you, that's all.
          - _Ends resolved_
        - You: I'm doing this for us, too.
          - (the tree is cut here)
      - You: It's just a busy stretch.
        - Olivia Keller: You said that last time.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: I've let things slide at home. I know.
          - (the tree is cut here)
        - You: I'm doing this for us, too.
          - (the tree is cut here)
    - You: Can we not do this tonight?
      - Olivia Keller: You said that last time.
      - You: This weekend is ours. No calls.
        - Olivia Keller: I'm holding you to it.
        - _Ends resolved_
      - You: I've let things slide at home. I know.
        - Olivia Keller: I just miss you, that's all.
        - _Ends resolved_
      - You: I'm doing this for us, too.
        - Olivia Keller: We didn't ask for this.
        - You: You're right. I'm sorry.
          - (the tree is cut here)
        - You: This job doesn't leave much time. You know that.
          - (the tree is cut here)
        - You: I'll be home more. I promise.
          - (the tree is cut here)
    - You: This is the last late night. I promise.
      - _Ends open: Olivia Keller: We're not done talking about this._
  - _if not:_
    - Olivia Keller: Okay. Come eat something.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.it-was-a-late-committee-meeting-that-s-all]; L10 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-month]; L11 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L12 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L13 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L14 follow/accept/scene-talk/tender/5w1s [scene-talk.follow-accept.i-m-holding-you-to-it]</sub>

**Profile cold** (outcome resolved)

**Olivia Keller:** Oh. You're back.

**Olivia Keller:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise.
3. Can we not do this tonight?
4. This job doesn't leave much time. You know that. _(the page follows this one)_
5. It was a late committee meeting. That's all.

**Olivia Keller:** We miss you. That's all.

You could say:

1. This weekend is ours. No calls. _(the page follows this one)_
2. I've let things slide at home. I know.
3. It's just a busy stretch.

**Olivia Keller:** I'm holding you to it.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.it-was-a-late-committee-meeting-that-s-all]; L58 follow/plea/scene-talk/tender/5w2s [scene-talk.follow-plea.we-miss-you-that-s-all]; L59 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L60 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L61 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-just-a-busy-stretch]; L62 follow/accept/scene-talk/tender/5w1s [scene-talk.follow-accept.i-m-holding-you-to-it]</sub>

**Profile stubborn** (outcome resolved)

**Olivia Keller:** Oh. You're back.

**Olivia Keller:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise.
3. Can we not do this tonight?
4. I'm doing this for us, too. _(the page follows this one)_
5. It was a late committee meeting. That's all.

**Olivia Keller:** We didn't ask for this.

You could say:

1. I've let things slide at home. I know.
2. This job doesn't leave much time. You know that. _(the page follows this one)_
3. I'll be home more. I promise.

**Olivia Keller:** Don't put this on me.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise. _(the page follows this one)_

**Olivia Keller:** You said that last month.

You could say:

1. This weekend is ours. No calls. _(the page follows this one)_
2. You're right. I'm sorry.

**Olivia Keller:** I'm holding you to it.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.it-was-a-late-committee-meeting-that-s-all]; L78 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.we-didn-t-ask-for-this]; L79 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L80 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L81 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L83 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.don-t-put-this-on-me]; L84 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L85 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L87 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-month]; L88 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L89 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L90 follow/accept/scene-talk/tender/5w1s [scene-talk.follow-accept.i-m-holding-you-to-it]</sub>

**Profile anxious** (outcome resolved)

**Olivia Keller:** Oh. You're back.

**Olivia Keller:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise.
3. Can we not do this tonight?
4. I'm doing this for us, too. _(the page follows this one)_
5. This is the last late night. I promise.

**Olivia Keller:** We didn't ask for this.

You could say:

1. I've let things slide at home. I know.
2. This job doesn't leave much time. You know that. _(the page follows this one)_
3. I'll be home more. I promise.

**Olivia Keller:** We miss you. That's all.

You could say:

1. This weekend is ours. No calls. _(the page follows this one)_
2. I've let things slide at home. I know.
3. Can we not do this tonight?

**Olivia Keller:** I'm holding you to it.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.this-is-the-last-late-night-i-promise]; L59 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.we-didn-t-ask-for-this]; L60 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L61 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L62 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L64 follow/plea/scene-talk/tender/5w2s [scene-talk.follow-plea.we-miss-you-that-s-all]; L65 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L66 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L67 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L68 follow/accept/scene-talk/tender/5w1s [scene-talk.follow-accept.i-m-holding-you-to-it]</sub>

**Profile boastful** (outcome resolved)

**Olivia Keller:** Oh. You're back.

**Olivia Keller:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise.
3. Can we not do this tonight?
4. I'm doing this for us, too. _(the page follows this one)_
5. It was a late committee meeting. That's all.

**Olivia Keller:** We didn't ask for this.

You could say:

1. I've let things slide at home. I know.
2. This job doesn't leave much time. You know that. _(the page follows this one)_
3. I'll be home more. I promise.

**Olivia Keller:** We miss you. That's all.

You could say:

1. This weekend is ours. No calls. _(the page follows this one)_
2. I've let things slide at home. I know.
3. Can we not do this tonight?

**Olivia Keller:** I'm holding you to it.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.it-was-a-late-committee-meeting-that-s-all]; L59 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.we-didn-t-ask-for-this]; L60 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L61 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L62 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L64 follow/plea/scene-talk/tender/5w2s [scene-talk.follow-plea.we-miss-you-that-s-all]; L65 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L66 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L67 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L68 follow/accept/scene-talk/tender/5w1s [scene-talk.follow-accept.i-m-holding-you-to-it]</sub>

## Scene 31: family-absence (threat, ends in political) — proof scene

_Purpose family-absence. Records: term:seat:gus2025:101811:board:4:2027-01-01:elected, person_bf349dc8efe60e9c, person_bf349ec8efe6104f._

> You've been at the office late every night this week. Robert Nixon is waiting up for you.

**Profile warm** (outcome resolved)

**Robert Nixon:** You're home.

**Robert Nixon:** We hardly see you since you took office.

You could say:

1. You're right. I'm sorry.
2. I'll be home more. I promise. _(the page follows this one)_
3. Can we not do this tonight?
4. I'm doing this for us, too.
5. This is the last late night. I promise.

**Robert Nixon:** You said that last month.

You could say:

1. This weekend is ours. No calls. _(the page follows this one)_
2. You're right. I'm sorry.
3. This job doesn't leave much time. You know that.

**Robert Nixon:** I'm holding you to it.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, resolved, resolved, resolved, open, resolved, open, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, resolved, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- You: You're right. I'm sorry.
  - Robert Nixon: Saying sorry isn't the same as being here.
  - You: This weekend is ours. No calls.
    - Robert Nixon: I'm holding you to it.
    - _Ends resolved_
  - You: I've let things slide at home. I know.
    - Robert Nixon: I just miss you, that's all.
    - _Ends resolved_
  - You: I'm doing this for us, too.
    - Robert Nixon: We didn't ask for this.
    - You: I've let things slide at home. I know.
      - Robert Nixon: I just miss you, that's all.
      - _Ends resolved_
    - You: This job doesn't leave much time. You know that.
      - Robert Nixon: That's not fair, and you know it.
      - You: I've let things slide at home. I know.
        - Robert Nixon: I just miss you, that's all.
        - _Ends resolved_
      - You: I'll be home more. I promise.
        - Robert Nixon: You said that last month.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: I've let things slide at home. I know.
          - (the tree is cut here)
    - You: I'll be home more. I promise.
      - Robert Nixon: You said that last month.
      - You: This weekend is ours. No calls.
        - Robert Nixon: I'm holding you to it.
        - _Ends resolved_
      - You: I've let things slide at home. I know.
        - Robert Nixon: I just miss you, that's all.
        - _Ends resolved_
      - You: This job doesn't leave much time. You know that.
        - Robert Nixon: Don't put this on me.
        - _Ends open: Robert Nixon: We're not done talking about this._
- You ★: I'll be home more. I promise.
  - Robert Nixon: You said that last month.
  - You ★: This weekend is ours. No calls.
    - Robert Nixon: I'm holding you to it.
    - _Ends resolved_
  - You: You're right. I'm sorry.
    - Robert Nixon: Saying sorry isn't the same as being here.
    - You: This weekend is ours. No calls.
      - Robert Nixon: I'm holding you to it.
      - _Ends resolved_
    - You: I've let things slide at home. I know.
      - Robert Nixon: I just miss you, that's all.
      - _Ends resolved_
    - You: I'm doing this for us, too.
      - Robert Nixon: We didn't ask for this.
      - You: I've let things slide at home. I know.
        - Robert Nixon: I just miss you, that's all.
        - _Ends resolved_
      - You: This job doesn't leave much time. You know that.
        - Robert Nixon: That's not fair, and you know it.
        - _Ends open: Robert Nixon: I'm going to bed. We'll talk tomorrow._
  - You: This job doesn't leave much time. You know that.
    - Robert Nixon: Don't put this on me.
    - You: I've let things slide at home. I know.
      - Robert Nixon: I just miss you, that's all.
      - _Ends resolved_
    - You: I'm doing this for us, too.
      - Robert Nixon: We didn't ask for this.
      - _Ends open: Robert Nixon: We're not done talking about this._
- You: Can we not do this tonight?
  - Robert Nixon: We miss you. That's all.
  - You: This weekend is ours. No calls.
    - Robert Nixon: I'm holding you to it.
    - _Ends resolved_
  - You: You're right. I'm sorry.
    - Robert Nixon: Saying sorry isn't the same as being here.
    - You: This weekend is ours. No calls.
      - Robert Nixon: I'm holding you to it.
      - _Ends resolved_
    - You: I've let things slide at home. I know.
      - Robert Nixon: I just miss you, that's all.
      - _Ends resolved_
    - You: I'm doing this for us, too.
      - Robert Nixon: We didn't ask for this.
      - You: I've let things slide at home. I know.
        - Robert Nixon: I just miss you, that's all.
        - _Ends resolved_
      - You: This job doesn't leave much time. You know that.
        - Robert Nixon: That's not fair, and you know it.
        - You: I've let things slide at home. I know.
          - (the tree is cut here)
        - You: I'll be home more. I promise.
          - (the tree is cut here)
      - You: I'll be home more. I promise.
        - (the tree is cut here)
  - You: It's just a busy stretch.
    - Robert Nixon: We miss you. That's all.
    - You: This weekend is ours. No calls.
      - Robert Nixon: I'm holding you to it.
      - _Ends resolved_
    - You: I've let things slide at home. I know.
      - Robert Nixon: I just miss you, that's all.
      - _Ends resolved_
- You: I'm doing this for us, too.
  - Robert Nixon: We didn't ask for this.
  - You: You're right. I'm sorry.
    - Robert Nixon: Saying sorry isn't the same as being here.
    - You: This weekend is ours. No calls.
      - Robert Nixon: I'm holding you to it.
      - _Ends resolved_
    - You: I've let things slide at home. I know.
      - Robert Nixon: I just miss you, that's all.
      - _Ends resolved_
    - You: This job doesn't leave much time. You know that.
      - Robert Nixon: That's not fair, and you know it.
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: I'll be home more. I promise.
        - (the tree is cut here)
  - You: This job doesn't leave much time. You know that.
    - Robert Nixon: Don't put this on me.
    - You: You're right. I'm sorry.
      - Robert Nixon: Saying sorry isn't the same as being here.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
    - You: I'll be home more. I promise.
      - Robert Nixon: You said that last month.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
  - You: I'll be home more. I promise.
    - Robert Nixon: You said that last month.
    - You: This weekend is ours. No calls.
      - Robert Nixon: I'm holding you to it.
      - _Ends resolved_
    - You: You're right. I'm sorry.
      - Robert Nixon: Saying sorry isn't the same as being here.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: This job doesn't leave much time. You know that.
        - (the tree is cut here)
    - You: This job doesn't leave much time. You know that.
      - Robert Nixon: Don't put this on me.
      - _Ends open: Robert Nixon: I'm going to bed. We'll talk tomorrow._
- You: This is the last late night. I promise.
  - _if Robert Nixon knows:_
    - Robert Nixon: You said that last week.
    - You: You're right. I'm sorry.
      - Robert Nixon: Thank you for telling me.
      - You: Thank you for waiting up.
        - Robert Nixon: I always will.
        - _Ends resolved_
      - You: It's been a hard week at the office.
        - Robert Nixon: Come sit down. Tell me about it.
        - You: Thank you for waiting up.
          - (the tree is cut here)
        - You: I'll be home more. I promise.
          - (the tree is cut here)
        - You: Can we not do this tonight?
          - (the tree is cut here)
      - You: I'll be home more. I promise.
        - Robert Nixon: You said that last month.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: I've let things slide at home. I know.
          - (the tree is cut here)
        - You: I'm doing this for us, too.
          - (the tree is cut here)
      - You: It's just a busy stretch.
        - Robert Nixon: You said that last time.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: I've let things slide at home. I know.
          - (the tree is cut here)
        - You: I'm doing this for us, too.
          - (the tree is cut here)
    - You: It's just a busy stretch.
      - Robert Nixon: You said that last time.
      - You: This weekend is ours. No calls.
        - Robert Nixon: I'm holding you to it.
        - _Ends resolved_
      - You: I've let things slide at home. I know.
        - Robert Nixon: I just miss you, that's all.
        - _Ends resolved_
      - You: This job doesn't leave much time. You know that.
        - Robert Nixon: Don't put this on me.
        - You: I've let things slide at home. I know.
          - (the tree is cut here)
        - You: I'm doing this for us, too.
          - (the tree is cut here)
        - You: I'll be home more. I promise.
          - (the tree is cut here)
    - You: It was a late committee meeting. That's all.
      - _Ends open: Robert Nixon: We're not done talking about this._
  - _if not:_
    - Robert Nixon: Okay. Come eat something.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/hurt/2w1s [scene-talk.open-greet.you-re-home]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.this-is-the-last-late-night-i-promise]; L35 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-month]; L36 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L37 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L38 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L39 follow/accept/scene-talk/tender/5w1s [scene-talk.follow-accept.i-m-holding-you-to-it]</sub>

**Profile cold** (outcome resolved)

**Robert Nixon:** Oh. You're back.

**Robert Nixon:** We hardly see you since you took office.

You could say:

1. You're right. I'm sorry.
2. I'll be home more. I promise. _(the page follows this one)_
3. Can we not do this tonight?
4. I'm doing this for us, too.
5. This is the last late night. I promise.

**Robert Nixon:** You said that last month.

You could say:

1. This weekend is ours. No calls. _(the page follows this one)_
2. You're right. I'm sorry.
3. I'm doing this for us, too.

**Robert Nixon:** I'm holding you to it.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.this-is-the-last-late-night-i-promise]; L35 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-month]; L36 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L37 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L38 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L39 follow/accept/scene-talk/tender/5w1s [scene-talk.follow-accept.i-m-holding-you-to-it]</sub>

**Profile stubborn** (outcome resolved)

**Robert Nixon:** Oh. You're back.

**Robert Nixon:** We hardly see you since you took office.

You could say:

1. You're right. I'm sorry.
2. I'll be home more. I promise. _(the page follows this one)_
3. It's just a busy stretch.
4. I'm doing this for us, too.
5. This is the last late night. I promise.

**Robert Nixon:** You said that last month.

You could say:

1. This weekend is ours. No calls. _(the page follows this one)_
2. You're right. I'm sorry.
3. I'm doing this for us, too.

**Robert Nixon:** I'm holding you to it.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-just-a-busy-stretch]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.this-is-the-last-late-night-i-promise]; L35 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-month]; L36 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L37 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L38 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L39 follow/accept/scene-talk/tender/5w1s [scene-talk.follow-accept.i-m-holding-you-to-it]</sub>

**Profile anxious** (outcome resolved)

**Robert Nixon:** You're home.

**Robert Nixon:** We hardly see you since you took office.

You could say:

1. You're right. I'm sorry.
2. I'll be home more. I promise. _(the page follows this one)_
3. Can we not do this tonight?
4. I'm doing this for us, too.
5. It was a late committee meeting. That's all.

**Robert Nixon:** You said that last month.

You could say:

1. This weekend is ours. No calls. _(the page follows this one)_
2. You're right. I'm sorry.
3. I'm doing this for us, too.

**Robert Nixon:** I'm holding you to it.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/hurt/2w1s [scene-talk.open-greet.you-re-home]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.it-was-a-late-committee-meeting-that-s-all]; L35 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-month]; L36 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L37 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L38 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L39 follow/accept/scene-talk/tender/5w1s [scene-talk.follow-accept.i-m-holding-you-to-it]</sub>

## Scene 32: rally-opponent (threat, ends in political) — proof scene

_Purpose rally-opponent. Records: filing:contest:seat:gus2025:101811:sheriff:0:2026-11-03:person_f9be8ef45e5d143f, official:term:seat:US-DE:treasurer:2026-10-12, person_f9be8ef45e5d143f._

> Michael Norton is working the same crowd. Now Michael Norton is walking straight toward you.

**Profile warm** (outcome open)

**Michael Norton:** I didn't expect to see you here.

**Michael Norton:** Nice speech. Too bad none of it was true.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. People say a lot of things.
3. Say that on the debate stage.
4. Look at this crowd. People know where I stand.

**Michael Norton:** You'd better hope they don't look too closely.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Michael Norton:** Say that to the voters.

You could say:

1. I've won tougher races than this one. _(the page follows this one)_
2. People say a lot of things.

**Michael Norton:** Keep telling yourself that.

You could say:

1. Look at this crowd. People know where I stand. _(the page follows this one)_
2. People say a lot of things.

**Michael Norton:** You'd better hope they don't look too closely.

**Michael Norton:** This isn't over.

**The whole exchange** (60 nodes; endings: open, open, open, open, open, open, open, open, open, open; ★ is the branch this profile's traits lean toward):

- You ★: That's not true, and you know it.
  - Michael Norton: You'd better hope they don't look too closely.
  - You ★: We'll let the voters decide that.
    - Michael Norton: Say that to the voters.
    - You ★: I've won tougher races than this one.
      - Michael Norton: Keep telling yourself that.
      - You ★: Look at this crowd. People know where I stand.
        - Michael Norton: You'd better hope they don't look too closely.
        - _Ends open: Michael Norton: This isn't over._
      - You: People say a lot of things.
        - Michael Norton: I've been here longer than you have.
        - You: You're the one who has to explain yourself.
          - (the tree is cut here)
        - You: I'm here to talk to voters, not to you.
          - (the tree is cut here)
    - You: People say a lot of things.
      - Michael Norton: Keep telling yourself that.
      - _Ends open: Michael Norton: See you on election day._
  - You: Look at this crowd. People know where I stand.
    - Michael Norton: Say that to the voters.
    - You: We'll let the voters decide that.
      - Michael Norton: Keep telling yourself that.
      - You: I've won tougher races than this one.
        - Michael Norton: Say that to the voters.
        - _Ends open: Michael Norton: This isn't over._
      - You: People say a lot of things.
        - Michael Norton: I've been here longer than you have.
        - You: Say that on the debate stage.
          - (the tree is cut here)
        - You: I'm here to talk to voters, not to you.
          - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Michael Norton: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - Michael Norton: Say that to the voters.
        - _Ends open: Michael Norton: See you on election day._
      - You: People say a lot of things.
        - Michael Norton: I've been here longer than you have.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: Say that on the debate stage.
          - (the tree is cut here)
        - You: Enjoy the rally.
          - (the tree is cut here)
    - You: People say a lot of things.
      - Michael Norton: I've been here longer than you have.
      - You: We'll let the voters decide that.
        - Michael Norton: Keep telling yourself that.
        - _Ends open: Michael Norton: See you on election day._
      - You: You're the one who has to explain yourself.
        - Michael Norton: Keep telling yourself that.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: I've won tougher races than this one.
          - (the tree is cut here)
      - You: I'm here to talk to voters, not to you.
        - Michael Norton: Keep telling yourself that.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: I've won tougher races than this one.
          - (the tree is cut here)
  - You: People say a lot of things.
    - Michael Norton: I've been here longer than you have.
    - You: We'll let the voters decide that.
      - Michael Norton: Say that to the voters.
      - _Ends open: Michael Norton: This isn't over._
    - You: Say that on the debate stage.
      - Michael Norton: Say that to the voters.
      - You: We'll let the voters decide that.
        - Michael Norton: Keep telling yourself that.
        - _Ends open: Michael Norton: See you on election day._
      - You: I've won tougher races than this one.
        - Michael Norton: Keep telling yourself that.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: Look at this crowd. People know where I stand.
          - (the tree is cut here)
    - You: Enjoy the rally.
      - Michael Norton: Say that to the voters.
      - You: We'll let the voters decide that.
        - Michael Norton: Keep telling yourself that.
        - _Ends open: Michael Norton: See you on election day._
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
- You: People say a lot of things.
  - Michael Norton: I've been here longer than you have.
  - You: That's not true, and you know it.
    - Michael Norton: Keep telling yourself that.
    - You: We'll let the voters decide that.
      - Michael Norton: You'd better hope they don't look too closely.
      - _Ends open: Michael Norton: This isn't over._
    - You: I've won tougher races than this one.
      - Michael Norton: You'd better hope they don't look too closely.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
  - You: You're the one who has to explain yourself.
    - Michael Norton: Say that to the voters.
    - You: That's not true, and you know it.
      - Michael Norton: You'd better hope they don't look too closely.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Michael Norton: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
  - You: Enjoy the rally.
    - Michael Norton: Say that to the voters.
    - You: That's not true, and you know it.
      - Michael Norton: You'd better hope they don't look too closely.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
    - You: Look at this crowd. People know where I stand.
      - Michael Norton: You'd better hope they don't look too closely.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
- You: Say that on the debate stage.
  - Michael Norton: I've been here longer than you have.
  - You: That's not true, and you know it.
    - Michael Norton: You'd better hope they don't look too closely.
    - You: We'll let the voters decide that.
      - Michael Norton: Say that to the voters.
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: Look at this crowd. People know where I stand.
      - Michael Norton: Say that to the voters.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Michael Norton: I've been here longer than you have.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: You're the one who has to explain yourself.
        - (the tree is cut here)
      - You: I'm here to talk to voters, not to you.
        - (the tree is cut here)
  - You: You're the one who has to explain yourself.
    - Michael Norton: You'd better hope they don't look too closely.
    - You: That's not true, and you know it.
      - Michael Norton: Say that to the voters.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: Look at this crowd. People know where I stand.
      - Michael Norton: Keep telling yourself that.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Michael Norton: I've been here longer than you have.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Enjoy the rally.
        - (the tree is cut here)
  - You: I'm here to talk to voters, not to you.
    - Michael Norton: I've been here longer than you have.
    - You: That's not true, and you know it.
      - Michael Norton: You'd better hope they don't look too closely.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: You're the one who has to explain yourself.
      - Michael Norton: Say that to the voters.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: Enjoy the rally.
      - Michael Norton: I've been here longer than you have.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: You're the one who has to explain yourself.
        - (the tree is cut here)
- You: Look at this crowd. People know where I stand.
  - Michael Norton: Say that to the voters.
  - You: That's not true, and you know it.
    - Michael Norton: You'd better hope they don't look too closely.
    - You: We'll let the voters decide that.
      - Michael Norton: Keep telling yourself that.
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Michael Norton: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Michael Norton: I've been here longer than you have.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: You're the one who has to explain yourself.
        - (the tree is cut here)
      - You: I'm here to talk to voters, not to you.
        - (the tree is cut here)
  - You: I've won tougher races than this one.
    - Michael Norton: You'd better hope they don't look too closely.
    - You: That's not true, and you know it.
      - Michael Norton: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Michael Norton: Keep telling yourself that.
      - _Ends open: Michael Norton: See you on election day._
  - You: People say a lot of things.
    - Michael Norton: I've been here longer than you have.
    - You: That's not true, and you know it.
      - Michael Norton: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
    - You: You're the one who has to explain yourself.
      - Michael Norton: I've been here longer than you have.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: Say that on the debate stage.
        - (the tree is cut here)
      - You: Enjoy the rally.
        - (the tree is cut here)
    - You: Enjoy the rally.
      - Michael Norton: I've been here longer than you have.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: Say that on the debate stage.
        - (the tree is cut here)
      - You: I'm here to talk to voters, not to you.
        - (the tree is cut here)

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/9w2s [scene-talk.state-confront.nice-speech-too-bad-none-of-it-was-true]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L8 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L11 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L12 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L13 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L14 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L15 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L16 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L17 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L18 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L19 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

**Profile cold** (outcome open)

**Michael Norton:** Well, look who it is.

**Michael Norton:** People here know your record.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. People say a lot of things.
3. Say that on the debate stage.
4. Look at this crowd. People know where I stand.

**Michael Norton:** Keep telling yourself that.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Michael Norton:** You'd better hope they don't look too closely.

You could say:

1. I've won tougher races than this one. _(the page follows this one)_
2. People say a lot of things.

**Michael Norton:** Say that to the voters.

You could say:

1. Look at this crowd. People know where I stand. _(the page follows this one)_
2. People say a lot of things.

**Michael Norton:** Keep telling yourself that.

**Michael Norton:** This isn't over.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L8 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L11 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L12 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L13 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L14 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L15 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L16 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L17 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L18 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L19 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

**Profile stubborn** (outcome open)

**Michael Norton:** Well, look who it is.

**Michael Norton:** People here know your record.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. People say a lot of things.
3. You're the one who has to explain yourself.
4. Look at this crowd. People know where I stand.

**Michael Norton:** You'd better hope they don't look too closely.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Michael Norton:** Say that to the voters.

You could say:

1. I've won tougher races than this one. _(the page follows this one)_
2. People say a lot of things.

**Michael Norton:** Keep telling yourself that.

You could say:

1. Look at this crowd. People know where I stand. _(the page follows this one)_
2. People say a lot of things.

**Michael Norton:** Keep telling yourself that.

**Michael Norton:** This isn't over.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L8 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L11 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L12 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L13 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L14 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L15 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L16 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L17 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L18 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L19 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

**Profile anxious** (outcome open)

**Michael Norton:** I didn't expect to see you here.

**Michael Norton:** Nice speech. Too bad none of it was true.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. People say a lot of things.
3. Say that on the debate stage.
4. Look at this crowd. People know where I stand.

**Michael Norton:** Say that to the voters.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Michael Norton:** Keep telling yourself that.

You could say:

1. I've won tougher races than this one. _(the page follows this one)_
2. People say a lot of things.

**Michael Norton:** You'd better hope they don't look too closely.

You could say:

1. Look at this crowd. People know where I stand. _(the page follows this one)_
2. People say a lot of things.

**Michael Norton:** You'd better hope they don't look too closely.

**Michael Norton:** This isn't over.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/9w2s [scene-talk.state-confront.nice-speech-too-bad-none-of-it-was-true]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L8 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L11 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L12 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L13 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L14 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L15 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L16 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L17 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L18 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L19 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

## Scene 33: rally-opponent (threat, ends in political) — proof scene

_Purpose rally-opponent. Records: filing:contest:seat:US-DE:attorney-general:2026-11-03:official:term:seat:US-DE:upper:021:0:2026-10-12, official:term:seat:US-DE:attorney-general:2026-10-12, official:term:seat:US-DE:upper:021:0:2026-10-12._

> You're shaking hands by the stage when Julie Villegas cuts through the line.

**Profile warm** (outcome open)

**Julie Villegas:** Well, look who it is.

**Julie Villegas:** You can't win this, you know.

You could say:

1. We'll let the voters decide that.
2. People say a lot of things.
3. Say that on the debate stage.
4. Look at this crowd. People know where I stand. _(the page follows this one)_

**Julie Villegas:** Say that to the voters.

You could say:

1. That's not true, and you know it.
2. I've won tougher races than this one. _(the page follows this one)_
3. People say a lot of things.

**Julie Villegas:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. People say a lot of things.

**Julie Villegas:** Keep telling yourself that.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. People say a lot of things.

**Julie Villegas:** Say that to the voters.

**Julie Villegas:** See you on election day.

**The whole exchange** (61 nodes; endings: open, open, open, open, open, open, open, open, open, open, open, open, open, open, open, open, open; ★ is the branch this profile's traits lean toward):

- You: We'll let the voters decide that.
  - Julie Villegas: You'd better hope they don't look too closely.
  - You: That's not true, and you know it.
    - Julie Villegas: Say that to the voters.
    - You: Look at this crowd. People know where I stand.
      - Julie Villegas: Keep telling yourself that.
      - You: I've won tougher races than this one.
        - Julie Villegas: You'd better hope they don't look too closely.
        - _Ends open: Julie Villegas: See you on election day._
      - You: People say a lot of things.
        - Julie Villegas: I've been here longer than you have.
        - You: You're the one who has to explain yourself.
          - (the tree is cut here)
        - You: Enjoy the rally.
          - (the tree is cut here)
    - You: People say a lot of things.
      - Julie Villegas: Keep telling yourself that.
      - _Ends open: Julie Villegas: See you on election day._
  - You: I've won tougher races than this one.
    - Julie Villegas: Say that to the voters.
    - You: That's not true, and you know it.
      - Julie Villegas: Keep telling yourself that.
      - You: Look at this crowd. People know where I stand.
        - Julie Villegas: Say that to the voters.
        - _Ends open: Julie Villegas: See you on election day._
      - You: People say a lot of things.
        - Julie Villegas: You'd better hope they don't look too closely.
        - _Ends open: Julie Villegas: See you on election day._
    - You: Look at this crowd. People know where I stand.
      - Julie Villegas: Keep telling yourself that.
      - You: That's not true, and you know it.
        - Julie Villegas: You'd better hope they don't look too closely.
        - _Ends open: Julie Villegas: See you on election day._
      - You: People say a lot of things.
        - Julie Villegas: I've been here longer than you have.
        - You: That's not true, and you know it.
          - (the tree is cut here)
        - You: Say that on the debate stage.
          - (the tree is cut here)
        - You: I'm here to talk to voters, not to you.
          - (the tree is cut here)
    - You: People say a lot of things.
      - Julie Villegas: Keep telling yourself that.
      - You: That's not true, and you know it.
        - Julie Villegas: You'd better hope they don't look too closely.
        - _Ends open: Julie Villegas: See you on election day._
      - You: Look at this crowd. People know where I stand.
        - Julie Villegas: You'd better hope they don't look too closely.
        - _Ends open: Julie Villegas: See you on election day._
  - You: People say a lot of things.
    - Julie Villegas: Say that to the voters.
    - You: That's not true, and you know it.
      - Julie Villegas: Keep telling yourself that.
      - _Ends open: Julie Villegas: See you on election day._
    - You: I've won tougher races than this one.
      - Julie Villegas: Keep telling yourself that.
      - You: That's not true, and you know it.
        - Julie Villegas: You'd better hope they don't look too closely.
        - _Ends open: Julie Villegas: See you on election day._
      - You: Look at this crowd. People know where I stand.
        - Julie Villegas: Say that to the voters.
        - _Ends open: Julie Villegas: See you on election day._
- You: People say a lot of things.
  - Julie Villegas: You'd better hope they don't look too closely.
  - You: That's not true, and you know it.
    - Julie Villegas: Say that to the voters.
    - You: We'll let the voters decide that.
      - Julie Villegas: Keep telling yourself that.
      - _Ends open: Julie Villegas: See you on election day._
    - You: I've won tougher races than this one.
      - Julie Villegas: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - Julie Villegas: Keep telling yourself that.
        - _Ends open: Julie Villegas: See you on election day._
      - You: Look at this crowd. People know where I stand.
        - Julie Villegas: You'd better hope they don't look too closely.
        - _Ends open: Julie Villegas: See you on election day._
  - You: I've won tougher races than this one.
    - Julie Villegas: Say that to the voters.
    - You: We'll let the voters decide that.
      - Julie Villegas: Keep telling yourself that.
      - You: That's not true, and you know it.
        - Julie Villegas: Say that to the voters.
        - _Ends open: Julie Villegas: See you on election day._
      - You: Look at this crowd. People know where I stand.
        - Julie Villegas: Say that to the voters.
        - _Ends open: Julie Villegas: See you on election day._
    - You: Look at this crowd. People know where I stand.
      - Julie Villegas: Keep telling yourself that.
      - _Ends open: Julie Villegas: See you on election day._
- You: Say that on the debate stage.
  - Julie Villegas: I've been here longer than you have.
  - You: We'll let the voters decide that.
    - Julie Villegas: You'd better hope they don't look too closely.
    - You: That's not true, and you know it.
      - Julie Villegas: Say that to the voters.
      - You: Look at this crowd. People know where I stand.
        - Julie Villegas: Keep telling yourself that.
        - You: I've won tougher races than this one.
          - (the tree is cut here)
        - You: People say a lot of things.
          - (the tree is cut here)
      - You: People say a lot of things.
        - Julie Villegas: I've been here longer than you have.
        - You: You're the one who has to explain yourself.
          - (the tree is cut here)
        - You: I'm here to talk to voters, not to you.
          - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Julie Villegas: Say that to the voters.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Julie Villegas: I've been here longer than you have.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: You're the one who has to explain yourself.
        - (the tree is cut here)
      - You: Enjoy the rally.
        - (the tree is cut here)
  - You: You're the one who has to explain yourself.
    - Julie Villegas: You'd better hope they don't look too closely.
    - You: We'll let the voters decide that.
      - Julie Villegas: Say that to the voters.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: Look at this crowd. People know where I stand.
      - Julie Villegas: Say that to the voters.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Julie Villegas: I've been here longer than you have.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Enjoy the rally.
        - (the tree is cut here)
  - You: Enjoy the rally.
    - Julie Villegas: Say that to the voters.
    - You: That's not true, and you know it.
      - Julie Villegas: You'd better hope they don't look too closely.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: Look at this crowd. People know where I stand.
      - Julie Villegas: You'd better hope they don't look too closely.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Julie Villegas: I've been here longer than you have.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: You're the one who has to explain yourself.
        - (the tree is cut here)
      - You: I'm here to talk to voters, not to you.
        - (the tree is cut here)
- You ★: Look at this crowd. People know where I stand.
  - Julie Villegas: Say that to the voters.
  - You: That's not true, and you know it.
    - Julie Villegas: Keep telling yourself that.
    - You: We'll let the voters decide that.
      - Julie Villegas: You'd better hope they don't look too closely.
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Julie Villegas: You'd better hope they don't look too closely.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Julie Villegas: I've been here longer than you have.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Say that on the debate stage.
        - (the tree is cut here)
      - You: I'm here to talk to voters, not to you.
        - (the tree is cut here)
  - You ★: I've won tougher races than this one.
    - Julie Villegas: You'd better hope they don't look too closely.
    - You ★: That's not true, and you know it.
      - Julie Villegas: Keep telling yourself that.
      - You ★: We'll let the voters decide that.
        - Julie Villegas: Say that to the voters.
        - _Ends open: Julie Villegas: See you on election day._
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Julie Villegas: I've been here longer than you have.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Say that on the debate stage.
        - (the tree is cut here)
      - You: Enjoy the rally.
        - (the tree is cut here)
  - You: People say a lot of things.
    - Julie Villegas: I've been here longer than you have.
    - You: We'll let the voters decide that.
      - Julie Villegas: You'd better hope they don't look too closely.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
    - You: You're the one who has to explain yourself.
      - Julie Villegas: I've been here longer than you have.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Say that on the debate stage.
        - (the tree is cut here)
      - You: Enjoy the rally.
        - (the tree is cut here)
    - You: I'm here to talk to voters, not to you.
      - Julie Villegas: I've been here longer than you have.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: You're the one who has to explain yourself.
        - (the tree is cut here)
      - You: Enjoy the rally.
        - (the tree is cut here)

<sub>L1 narrate/narrate/scene-talk/braced/13w1s [scene-talk.narrate-narrate.you-re-shaking-hands-by-the-stage-when-name-cuts-through-the-line]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/6w1s [scene-talk.state-confront.you-can-t-win-this-you-know]; L4 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L147 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L148 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L149 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L150 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L165 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L166 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L167 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L168 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L169 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L170 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L171 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L172 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

**Profile cold** (outcome open)

**Julie Villegas:** Well, look who it is.

**Julie Villegas:** You can't win this, you know.

You could say:

1. That's not true, and you know it.
2. People say a lot of things.
3. Say that on the debate stage. _(the page follows this one)_
4. Look at this crowd. People know where I stand.

**Julie Villegas:** I've been here longer than you have.

You could say:

1. We'll let the voters decide that.
2. You're the one who has to explain yourself. _(the page follows this one)_
3. I'm here to talk to voters, not to you.

**Julie Villegas:** Say that to the voters.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Julie Villegas:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. I've won tougher races than this one.
3. People say a lot of things.

**Julie Villegas:** Keep telling yourself that.

You could say:

1. I've won tougher races than this one.
2. People say a lot of things. _(the page follows this one)_

**Julie Villegas:** You'd better hope they don't look too closely.

**Julie Villegas:** See you on election day.

<sub>L1 narrate/narrate/scene-talk/braced/13w1s [scene-talk.narrate-narrate.you-re-shaking-hands-by-the-stage-when-name-cuts-through-the-line]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/6w1s [scene-talk.state-confront.you-can-t-win-this-you-know]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L91 follow/boast/scene-talk/proud/7w1s [scene-talk.follow-boast.i-ve-been-here-longer-than-you-have]; L92 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L93 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L94 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L116 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L117 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L118 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L119 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L120 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L121 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L122 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L123 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L124 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L125 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L126 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L127 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L128 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

**Profile stubborn** (outcome open)

**Julie Villegas:** Well, look who it is.

**Julie Villegas:** People here know your record.

You could say:

1. That's not true, and you know it.
2. People say a lot of things.
3. Say that on the debate stage. _(the page follows this one)_
4. Look at this crowd. People know where I stand.

**Julie Villegas:** I've been here longer than you have.

You could say:

1. That's not true, and you know it.
2. You're the one who has to explain yourself. _(the page follows this one)_
3. I'm here to talk to voters, not to you.

**Julie Villegas:** Keep telling yourself that.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Julie Villegas:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. I've won tougher races than this one.
3. People say a lot of things.

**Julie Villegas:** Say that to the voters.

You could say:

1. I've won tougher races than this one. _(the page follows this one)_
2. People say a lot of things.

**Julie Villegas:** You'd better hope they don't look too closely.

**Julie Villegas:** See you on election day.

<sub>L1 narrate/narrate/scene-talk/braced/13w1s [scene-talk.narrate-narrate.you-re-shaking-hands-by-the-stage-when-name-cuts-through-the-line]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L91 follow/boast/scene-talk/proud/7w1s [scene-talk.follow-boast.i-ve-been-here-longer-than-you-have]; L92 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L93 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L94 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L116 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L117 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L118 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L119 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L120 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L121 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L122 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L123 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L124 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L125 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L126 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L127 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L128 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

**Profile anxious** (outcome open)

**Julie Villegas:** Well, look who it is.

**Julie Villegas:** You can't win this, you know.

You could say:

1. That's not true, and you know it.
2. People say a lot of things. _(the page follows this one)_
3. Say that on the debate stage.
4. Look at this crowd. People know where I stand.

**Julie Villegas:** Keep telling yourself that.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. I've won tougher races than this one.

**Julie Villegas:** Say that to the voters.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. I've won tougher races than this one.

**Julie Villegas:** You'd better hope they don't look too closely.

**Julie Villegas:** See you on election day.

<sub>L1 narrate/narrate/scene-talk/braced/13w1s [scene-talk.narrate-narrate.you-re-shaking-hands-by-the-stage-when-name-cuts-through-the-line]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/6w1s [scene-talk.state-confront.you-can-t-win-this-you-know]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L64 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L65 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L66 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L67 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L68 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L69 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L70 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L71 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

**Profile boastful** (outcome open)

**Julie Villegas:** Well, look who it is.

**Julie Villegas:** You can't win this, you know.

You could say:

1. We'll let the voters decide that.
2. People say a lot of things.
3. Say that on the debate stage.
4. Look at this crowd. People know where I stand. _(the page follows this one)_

**Julie Villegas:** Keep telling yourself that.

You could say:

1. That's not true, and you know it.
2. I've won tougher races than this one. _(the page follows this one)_
3. People say a lot of things.

**Julie Villegas:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. People say a lot of things.

**Julie Villegas:** Say that to the voters.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. People say a lot of things.

**Julie Villegas:** You'd better hope they don't look too closely.

**Julie Villegas:** See you on election day.

<sub>L1 narrate/narrate/scene-talk/braced/13w1s [scene-talk.narrate-narrate.you-re-shaking-hands-by-the-stage-when-name-cuts-through-the-line]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/6w1s [scene-talk.state-confront.you-can-t-win-this-you-know]; L4 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L164 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L165 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L166 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L167 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L182 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L183 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L184 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L185 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L186 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L187 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L188 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L189 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

## Scene 34: rally-opponent (threat, ends in political) — proof scene

_Purpose rally-opponent. Records: filing:contest:seat:US-DE:treasurer:2026-11-03:official:term:seat:US-DE:treasurer:2026-10-12, official:term:seat:US-DE:upper:015:0:2026-10-12, official:term:seat:US-DE:treasurer:2026-10-12._

> Brittany Tucker is working the same crowd. Now Brittany Tucker is walking straight toward you.

**Profile warm** (outcome open)

**Brittany Tucker:** I didn't expect to see you here.

**Brittany Tucker:** People here know your record.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. People say a lot of things.
3. Say that on the debate stage.
4. I've won tougher races than this one.

**Brittany Tucker:** Say that to the voters.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Brittany Tucker:** You'd better hope they don't look too closely.

You could say:

1. Look at this crowd. People know where I stand. _(the page follows this one)_
2. People say a lot of things.

**Brittany Tucker:** Keep telling yourself that.

You could say:

1. I've won tougher races than this one. _(the page follows this one)_
2. People say a lot of things.

**Brittany Tucker:** Say that to the voters.

**Brittany Tucker:** See you on election day.

**The whole exchange** (60 nodes; endings: open, open, open, open, open, open, open, open, open, open, open, open; ★ is the branch this profile's traits lean toward):

- You ★: That's not true, and you know it.
  - Brittany Tucker: Say that to the voters.
  - You ★: We'll let the voters decide that.
    - Brittany Tucker: You'd better hope they don't look too closely.
    - You ★: Look at this crowd. People know where I stand.
      - Brittany Tucker: Keep telling yourself that.
      - You ★: I've won tougher races than this one.
        - Brittany Tucker: Say that to the voters.
        - _Ends open: Brittany Tucker: See you on election day._
      - You: People say a lot of things.
        - Brittany Tucker: Say that to the voters.
        - _Ends open: Brittany Tucker: This isn't over._
    - You: People say a lot of things.
      - Brittany Tucker: Keep telling yourself that.
      - _Ends open: Brittany Tucker: This isn't over._
  - You: Look at this crowd. People know where I stand.
    - Brittany Tucker: You'd better hope they don't look too closely.
    - You: We'll let the voters decide that.
      - Brittany Tucker: Keep telling yourself that.
      - You: I've won tougher races than this one.
        - Brittany Tucker: You'd better hope they don't look too closely.
        - _Ends open: Brittany Tucker: See you on election day._
      - You: People say a lot of things.
        - Brittany Tucker: I've been here longer than you have.
        - You: You're the one who has to explain yourself.
          - (the tree is cut here)
        - You: I'm here to talk to voters, not to you.
          - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Brittany Tucker: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - Brittany Tucker: Say that to the voters.
        - _Ends open: Brittany Tucker: This isn't over._
      - You: People say a lot of things.
        - Brittany Tucker: I've been here longer than you have.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: Say that on the debate stage.
          - (the tree is cut here)
        - You: Enjoy the rally.
          - (the tree is cut here)
    - You: People say a lot of things.
      - Brittany Tucker: I've been here longer than you have.
      - You: We'll let the voters decide that.
        - Brittany Tucker: Keep telling yourself that.
        - _Ends open: Brittany Tucker: See you on election day._
      - You: You're the one who has to explain yourself.
        - Brittany Tucker: I've been here longer than you have.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: Say that on the debate stage.
          - (the tree is cut here)
        - You: I'm here to talk to voters, not to you.
          - (the tree is cut here)
      - You: I'm here to talk to voters, not to you.
        - Brittany Tucker: Keep telling yourself that.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: I've won tougher races than this one.
          - (the tree is cut here)
  - You: People say a lot of things.
    - Brittany Tucker: I've been here longer than you have.
    - You: We'll let the voters decide that.
      - Brittany Tucker: You'd better hope they don't look too closely.
      - _Ends open: Brittany Tucker: This isn't over._
    - You: You're the one who has to explain yourself.
      - Brittany Tucker: I've been here longer than you have.
      - You: We'll let the voters decide that.
        - Brittany Tucker: You'd better hope they don't look too closely.
        - _Ends open: Brittany Tucker: See you on election day._
      - You: Say that on the debate stage.
        - Brittany Tucker: You'd better hope they don't look too closely.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: Look at this crowd. People know where I stand.
          - (the tree is cut here)
      - You: Enjoy the rally.
        - Brittany Tucker: I've been here longer than you have.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: Say that on the debate stage.
          - (the tree is cut here)
        - You: I'm here to talk to voters, not to you.
          - (the tree is cut here)
    - You: I'm here to talk to voters, not to you.
      - Brittany Tucker: I've been here longer than you have.
      - You: We'll let the voters decide that.
        - Brittany Tucker: You'd better hope they don't look too closely.
        - _Ends open: Brittany Tucker: This isn't over._
      - You: You're the one who has to explain yourself.
        - Brittany Tucker: You'd better hope they don't look too closely.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: I've won tougher races than this one.
          - (the tree is cut here)
      - You: Enjoy the rally.
        - Brittany Tucker: I've been here longer than you have.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: Say that on the debate stage.
          - (the tree is cut here)
- You: People say a lot of things.
  - Brittany Tucker: Say that to the voters.
  - You: We'll let the voters decide that.
    - Brittany Tucker: Keep telling yourself that.
    - You: That's not true, and you know it.
      - Brittany Tucker: You'd better hope they don't look too closely.
      - _Ends open: Brittany Tucker: See you on election day._
    - You: I've won tougher races than this one.
      - Brittany Tucker: You'd better hope they don't look too closely.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
  - You: Look at this crowd. People know where I stand.
    - Brittany Tucker: You'd better hope they don't look too closely.
    - You: That's not true, and you know it.
      - Brittany Tucker: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Brittany Tucker: Keep telling yourself that.
      - _Ends open: Brittany Tucker: This isn't over._
- You: Say that on the debate stage.
  - Brittany Tucker: I've been here longer than you have.
  - You: That's not true, and you know it.
    - Brittany Tucker: You'd better hope they don't look too closely.
    - You: We'll let the voters decide that.
      - Brittany Tucker: Say that to the voters.
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Brittany Tucker: Say that to the voters.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Brittany Tucker: Say that to the voters.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
  - You: You're the one who has to explain yourself.
    - Brittany Tucker: You'd better hope they don't look too closely.
    - You: We'll let the voters decide that.
      - Brittany Tucker: Say that to the voters.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: Look at this crowd. People know where I stand.
      - Brittany Tucker: Say that to the voters.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Brittany Tucker: Say that to the voters.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
  - You: Enjoy the rally.
    - Brittany Tucker: You'd better hope they don't look too closely.
    - You: We'll let the voters decide that.
      - Brittany Tucker: Say that to the voters.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: Look at this crowd. People know where I stand.
      - Brittany Tucker: Say that to the voters.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Brittany Tucker: Say that to the voters.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
- You: I've won tougher races than this one.
  - Brittany Tucker: You'd better hope they don't look too closely.
  - You: That's not true, and you know it.
    - Brittany Tucker: Say that to the voters.
    - You: We'll let the voters decide that.
      - Brittany Tucker: Keep telling yourself that.
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: Look at this crowd. People know where I stand.
      - Brittany Tucker: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Brittany Tucker: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
  - You: Look at this crowd. People know where I stand.
    - Brittany Tucker: Say that to the voters.
    - You: That's not true, and you know it.
      - Brittany Tucker: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Brittany Tucker: Keep telling yourself that.
      - _Ends open: Brittany Tucker: See you on election day._
  - You: People say a lot of things.
    - Brittany Tucker: I've been here longer than you have.
    - You: That's not true, and you know it.
      - Brittany Tucker: Say that to the voters.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
    - You: You're the one who has to explain yourself.
      - Brittany Tucker: Say that to the voters.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
    - You: Enjoy the rally.
      - Brittany Tucker: Say that to the voters.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L8 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L11 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L12 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L13 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L14 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L15 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L16 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L17 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L18 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L19 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

**Profile cold** (outcome open)

**Brittany Tucker:** I didn't expect to see you here.

**Brittany Tucker:** People here know your record.

You could say:

1. That's not true, and you know it.
2. People say a lot of things. _(the page follows this one)_
3. Say that on the debate stage.
4. I've won tougher races than this one.

**Brittany Tucker:** You'd better hope they don't look too closely.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. Look at this crowd. People know where I stand.

**Brittany Tucker:** Keep telling yourself that.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. I've won tougher races than this one.

**Brittany Tucker:** Say that to the voters.

**Brittany Tucker:** See you on election day.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L89 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L90 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L91 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L92 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L93 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L94 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L95 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L96 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

**Profile stubborn** (outcome open)

**Brittany Tucker:** I didn't expect to see you here.

**Brittany Tucker:** People here know your record.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. People say a lot of things.
3. You're the one who has to explain yourself.
4. I've won tougher races than this one.

**Brittany Tucker:** You'd better hope they don't look too closely.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Brittany Tucker:** Say that to the voters.

You could say:

1. Look at this crowd. People know where I stand. _(the page follows this one)_
2. People say a lot of things.

**Brittany Tucker:** Keep telling yourself that.

You could say:

1. I've won tougher races than this one. _(the page follows this one)_
2. People say a lot of things.

**Brittany Tucker:** You'd better hope they don't look too closely.

**Brittany Tucker:** This isn't over.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L7 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L8 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L11 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L12 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L13 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L14 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L15 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L16 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L17 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L18 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L19 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

**Profile anxious** (outcome open)

**Brittany Tucker:** I didn't expect to see you here.

**Brittany Tucker:** People here know your record.

You could say:

1. That's not true, and you know it.
2. People say a lot of things. _(the page follows this one)_
3. Say that on the debate stage.
4. I've won tougher races than this one.

**Brittany Tucker:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. Look at this crowd. People know where I stand.

**Brittany Tucker:** Keep telling yourself that.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. I've won tougher races than this one.

**Brittany Tucker:** Say that to the voters.

**Brittany Tucker:** See you on election day.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L89 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L90 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L91 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L92 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L93 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L94 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L95 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L96 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

**Profile boastful** (outcome open)

**Brittany Tucker:** I didn't expect to see you here.

**Brittany Tucker:** People here know your record.

You could say:

1. That's not true, and you know it.
2. People say a lot of things.
3. Say that on the debate stage.
4. I've won tougher races than this one. _(the page follows this one)_

**Brittany Tucker:** Keep telling yourself that.

You could say:

1. That's not true, and you know it.
2. Look at this crowd. People know where I stand. _(the page follows this one)_
3. People say a lot of things.

**Brittany Tucker:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it. _(the page follows this one)_
2. People say a lot of things.

**Brittany Tucker:** Say that to the voters.

You could say:

1. We'll let the voters decide that. _(the page follows this one)_
2. People say a lot of things.

**Brittany Tucker:** Keep telling yourself that.

**Brittany Tucker:** This isn't over.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L164 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L165 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L166 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L167 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L182 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L183 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L184 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L185 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L186 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L187 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L188 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L189 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

## Scene 35: desk-bill (vote-wanted, ends in bill) — proof scene

_Purpose desk-bill. Records: desk:bill:office:US-DE:legislature-upper:2027-01-12:official:term:seat:US-DE:upper:002:0:2026-10-12:5, bill:office:US-DE:legislature-upper:2027-01-12:official:term:seat:US-DE:upper:002:0:2026-10-12:5, staffer:official:term:seat:US-DE:governor:2026-10-12:person:aide:official:term:seat:US-DE:governor:2026-10-12:0, official:term:seat:US-DE:governor:2026-10-12._

> Jamie Moreno sets "Right to counsel in eviction" on your desk. You can sign it or veto it.

**Profile warm** (outcome resolved)

**Jamie Moreno:** This one's waiting on you.

**Jamie Moreno:** "Right to counsel in eviction" passed. It needs your signature.

You could say:

1. It's a good bill. I'll sign it today.
2. I won't sign it as it is.
3. What's in it? _(the page follows this one)_
4. I want to sleep on it.

**Jamie Moreno:** The file has everything. I'll leave it with you.

You could say:

1. It's a good bill. I'll sign it today.
2. I won't sign it as it is.
3. Who voted against it? _(the page follows this one)_
4. I want to sleep on it.

**Jamie Moreno:** It's all in the vote record.

You could say:

1. I'll sign it. _(the page follows this one)_
2. I'm going to veto it.
3. Let me read it tonight.

**Jamie Moreno:** I'll get the veto message drafted.

**The whole exchange** (18 nodes; endings: resolved, refused, resolved, refused, resolved, refused, resolved, refused, resolved, refused, resolved, refused; ★ is the branch this profile's traits lean toward):

- You: It's a good bill. I'll sign it today.
  - Jamie Moreno: I'll send it to the clerk.
  - _Ends resolved_
- You: I won't sign it as it is.
  - Jamie Moreno: I'll send it to the clerk.
  - _Ends refused_
- You ★: What's in it?
  - Jamie Moreno: The file has everything. I'll leave it with you.
  - You: It's a good bill. I'll sign it today.
    - Jamie Moreno: I'll get the veto message drafted.
    - _Ends resolved_
  - You: I won't sign it as it is.
    - Jamie Moreno: I'll send it to the clerk.
    - _Ends refused_
  - You ★: Who voted against it?
    - Jamie Moreno: It's all in the vote record.
    - You ★: I'll sign it.
      - Jamie Moreno: I'll get the veto message drafted.
      - _Ends resolved_
    - You: I'm going to veto it.
      - Jamie Moreno: I'll send it to the clerk.
      - _Ends refused_
    - You: Let me read it tonight.
      - Jamie Moreno: The council's going to ask what you decided.
      - You: I'll sign it.
        - Jamie Moreno: I'll get the veto message drafted.
        - _Ends resolved_
      - You: I'm going to veto it.
        - Jamie Moreno: I'll send it to the clerk.
        - _Ends refused_
  - You: I want to sleep on it.
    - Jamie Moreno: I'll need your answer by the end of the week.
    - You: It's a good bill. I'll sign it today.
      - Jamie Moreno: I'll send it to the clerk.
      - _Ends resolved_
    - You: I won't sign it as it is.
      - Jamie Moreno: I'll send it to the clerk.
      - _Ends refused_
- You: I want to sleep on it.
  - Jamie Moreno: I'll need your answer by the end of the week.
  - You: It's a good bill. I'll sign it today.
    - Jamie Moreno: I'll get the veto message drafted.
    - _Ends resolved_
  - You: I'm going to veto it.
    - Jamie Moreno: I'll get the veto message drafted.
    - _Ends refused_

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.name-sets-bill-on-your-desk-you-can-sign-it-or-veto-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.this-one-s-waiting-on-you]; L3 state/deliver-news/scene-talk/calm/10w2s [scene-talk.state-deliver-news.bill-passed-it-needs-your-signature]; L4 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L5 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-won-t-sign-it-as-it-is]; L6 reply/ask/scene-talk/curious/3w1s [scene-talk.reply-ask.what-s-in-it]; L7 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L10 follow/answer/scene-talk/calm/9w2s [scene-talk.follow-answer.the-file-has-everything-i-ll-leave-it-with-you]; L11 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L12 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-won-t-sign-it-as-it-is]; L13 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.who-voted-against-it]; L14 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L17 follow/answer/scene-talk/calm/6w1s [scene-talk.follow-answer.it-s-all-in-the-vote-record]; L18 reply/agree/scene-talk/calm/3w1s [scene-talk.reply-agree.i-ll-sign-it]; L19 reply/refuse/scene-talk/braced/5w1s [scene-talk.reply-refuse.i-m-going-to-veto-it]; L20 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-read-it-tonight]; L21 follow/accept/scene-talk/calm/6w1s [scene-talk.follow-accept.i-ll-get-the-veto-message-drafted]</sub>

**Profile cold** (outcome refused)

**Jamie Moreno:** This one's waiting on you.

**Jamie Moreno:** "Right to counsel in eviction" passed. It needs your signature.

You could say:

1. It's a good bill. I'll sign it today.
2. I'm going to veto it. _(the page follows this one)_
3. What's in it?
4. I want to sleep on it.

**Jamie Moreno:** I'll send it to the clerk.

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.name-sets-bill-on-your-desk-you-can-sign-it-or-veto-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.this-one-s-waiting-on-you]; L3 state/deliver-news/scene-talk/calm/10w2s [scene-talk.state-deliver-news.bill-passed-it-needs-your-signature]; L4 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L5 reply/refuse/scene-talk/braced/5w1s [scene-talk.reply-refuse.i-m-going-to-veto-it]; L6 reply/ask/scene-talk/curious/3w1s [scene-talk.reply-ask.what-s-in-it]; L7 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L9 follow/accept/scene-talk/calm/6w1s [scene-talk.follow-accept.i-ll-send-it-to-the-clerk]</sub>

**Profile stubborn** (outcome refused)

**Jamie Moreno:** This one's waiting on you.

**Jamie Moreno:** "Right to counsel in eviction" is on your desk. Sign it or veto it?

You could say:

1. It's a good bill. I'll sign it today.
2. I'm going to veto it. _(the page follows this one)_
3. What's in it?
4. I want to sleep on it.

**Jamie Moreno:** I'll get the veto message drafted.

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.name-sets-bill-on-your-desk-you-can-sign-it-or-veto-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.this-one-s-waiting-on-you]; L3 state/deliver-news/scene-talk/calm/14w2s [scene-talk.state-deliver-news.bill-is-on-your-desk-sign-it-or-veto-it]; L4 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L5 reply/refuse/scene-talk/braced/5w1s [scene-talk.reply-refuse.i-m-going-to-veto-it]; L6 reply/ask/scene-talk/curious/3w1s [scene-talk.reply-ask.what-s-in-it]; L7 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L9 follow/accept/scene-talk/calm/6w1s [scene-talk.follow-accept.i-ll-get-the-veto-message-drafted]</sub>

**Profile anxious** (outcome resolved)

**Jamie Moreno:** This one's waiting on you.

**Jamie Moreno:** The council sent over "Right to counsel in eviction". It's yours now.

You could say:

1. I'll sign it.
2. I won't sign it as it is.
3. Who voted against it?
4. I want to sleep on it. _(the page follows this one)_

**Jamie Moreno:** I'll need your answer by the end of the week.

You could say:

1. It's a good bill. I'll sign it today. _(the page follows this one)_
2. I'm going to veto it.

**Jamie Moreno:** I'll send it to the clerk.

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.name-sets-bill-on-your-desk-you-can-sign-it-or-veto-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.this-one-s-waiting-on-you]; L3 state/deliver-news/scene-talk/calm/12w2s [scene-talk.state-deliver-news.the-council-sent-over-bill-it-s-yours-now]; L4 reply/agree/scene-talk/calm/3w1s [scene-talk.reply-agree.i-ll-sign-it]; L5 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-won-t-sign-it-as-it-is]; L6 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.who-voted-against-it]; L7 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L33 follow/press/scene-talk/calm/10w1s [scene-talk.follow-press.i-ll-need-your-answer-by-the-end-of-the-week]; L34 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L35 reply/refuse/scene-talk/braced/5w1s [scene-talk.reply-refuse.i-m-going-to-veto-it]; L36 follow/accept/scene-talk/calm/6w1s [scene-talk.follow-accept.i-ll-send-it-to-the-clerk]</sub>

**Profile boastful** (outcome resolved)

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
2. I won't sign it as it is.
3. What's in it? _(the page follows this one)_
4. I want to sleep on it.

**Jamie Moreno:** The file has everything. I'll leave it with you.

You could say:

1. It's a good bill. I'll sign it today. _(the page follows this one)_
2. I'm going to veto it.
3. I want to sleep on it.

**Jamie Moreno:** I'll get the veto message drafted.

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.name-sets-bill-on-your-desk-you-can-sign-it-or-veto-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.this-one-s-waiting-on-you]; L3 state/deliver-news/scene-talk/calm/10w2s [scene-talk.state-deliver-news.bill-passed-it-needs-your-signature]; L4 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L5 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-won-t-sign-it-as-it-is]; L6 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.who-voted-against-it]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-read-it-tonight]; L10 follow/answer/scene-talk/calm/6w1s [scene-talk.follow-answer.it-s-all-in-the-vote-record]; L11 reply/agree/scene-talk/calm/3w1s [scene-talk.reply-agree.i-ll-sign-it]; L12 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-won-t-sign-it-as-it-is]; L13 reply/ask/scene-talk/curious/3w1s [scene-talk.reply-ask.what-s-in-it]; L14 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L17 follow/answer/scene-talk/calm/9w2s [scene-talk.follow-answer.the-file-has-everything-i-ll-leave-it-with-you]; L18 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L19 reply/refuse/scene-talk/braced/5w1s [scene-talk.reply-refuse.i-m-going-to-veto-it]; L20 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L21 follow/accept/scene-talk/calm/6w1s [scene-talk.follow-accept.i-ll-get-the-veto-message-drafted]</sub>

## Scene 36: staff-news (news-received, ends in political) — proof scene

_Purpose staff-news. Records: bill:federal:us-house:2026-10-13:official:seat:US-NJ:us-house:02:0, staffer:official:term:seat:US-DE:attorney-general:2026-10-12:person:aide:official:term:seat:US-DE:attorney-general:2026-10-12:0, official:seat:US-NJ:us-house:02, organization:press:newspaper:0:jurisdiction_59500182da2857ae._

> Stephen Whitaker comes into your office and closes the door.

**Profile warm** (outcome resolved)

**Stephen Whitaker:** You're going to want to sit down for this.

**Stephen Whitaker:** We lost the vote on "Medicaid work requirement".

You could say:

1. Who changed their vote? _(the page follows this one)_
2. How did we not see this coming?
3. All right. Tell me what we do now.
4. Not now. I need to think.
5. I already knew.

**Stephen Whitaker:** Give me an hour. I'll know who it was.

You could say:

1. Somebody leaked it. Find out who.
2. All right. Tell me what we do now. _(the page follows this one)_

**Stephen Whitaker:** We put out a statement before it runs.

You could say:

1. All right. Let's go with that. _(the page follows this one)_
2. No. We say nothing for now.

**Stephen Whitaker:** I'll get started.

**The whole exchange** (47 nodes; endings: resolved, resolved, refused, resolved, refused, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, refused, resolved, refused, resolved; ★ is the branch this profile's traits lean toward):

- You ★: Who changed their vote?
  - Stephen Whitaker: Give me an hour. I'll know who it was.
  - You: Somebody leaked it. Find out who.
    - Stephen Whitaker: I'll find out who it was.
    - You: Thank you. Keep me posted.
      - Stephen Whitaker: I'll get started.
      - _Ends resolved_
    - You: It's done. Let's deal with it.
      - Stephen Whitaker: We put out a statement before it runs.
      - You: Do it.
        - Stephen Whitaker: I'll get started.
        - _Ends resolved_
      - You: No. We say nothing for now.
        - Stephen Whitaker: We can't sit on this.
        - _Ends refused: Stephen Whitaker: This isn't going away on its own._
  - You ★: All right. Tell me what we do now.
    - Stephen Whitaker: We put out a statement before it runs.
    - You ★: All right. Let's go with that.
      - Stephen Whitaker: I'll get started.
      - _Ends resolved_
    - You: No. We say nothing for now.
      - Stephen Whitaker: We can't sit on this.
      - _Ends refused: Stephen Whitaker: This isn't going away on its own._
- You: How did we not see this coming?
  - Stephen Whitaker: I'll find out who it was.
  - You: Thank you. Keep me posted.
    - Stephen Whitaker: I'll get started.
    - _Ends resolved_
  - You: It's done. Let's deal with it.
    - Stephen Whitaker: We put out a statement before it runs.
    - You: All right. Let's go with that.
      - Stephen Whitaker: I'll get started.
      - _Ends resolved_
    - You: No. We say nothing for now.
      - Stephen Whitaker: We can't sit on this.
      - You: All right. Tell me what we do now.
        - Stephen Whitaker: You call them first, and we tell it our way.
        - _Ends resolved_
      - You: Who changed their vote?
        - Stephen Whitaker: Give me an hour. I'll know who it was.
        - You: Somebody leaked it. Find out who.
          - Stephen Whitaker: I'll find out who it was.
          - _Ends resolved_
        - You: All right. Tell me what we do now.
          - Stephen Whitaker: You call them first, and we tell it our way.
          - _Ends resolved_
- You: All right. Tell me what we do now.
  - Stephen Whitaker: We put out a statement before it runs.
  - You: Do it.
    - Stephen Whitaker: I'll get started.
    - _Ends resolved_
  - You: No. We say nothing for now.
    - Stephen Whitaker: We can't sit on this.
    - You: It's done. Let's deal with it.
      - Stephen Whitaker: You call them first, and we tell it our way.
      - _Ends resolved_
    - You: Who changed their vote?
      - Stephen Whitaker: I'm still finding out. I'll have names tonight.
      - You: How did we not see this coming?
        - Stephen Whitaker: I'll find out who it was.
        - You: Thank you. Keep me posted.
          - Stephen Whitaker: I'll get started.
          - _Ends resolved_
        - You: It's done. Let's deal with it.
          - Stephen Whitaker: You call them first, and we tell it our way.
          - _Ends resolved_
      - You: It's done. Let's deal with it.
        - Stephen Whitaker: You call them first, and we tell it our way.
        - _Ends resolved_
- You: Not now. I need to think.
  - Stephen Whitaker: We can't sit on this.
  - You: All right. Tell me what we do now.
    - Stephen Whitaker: We put out a statement before it runs.
    - You: All right. Let's go with that.
      - Stephen Whitaker: I'll get started.
      - _Ends resolved_
    - You: No. We say nothing for now.
      - Stephen Whitaker: We can't sit on this.
      - You: It's done. Let's deal with it.
        - Stephen Whitaker: You call them first, and we tell it our way.
        - _Ends resolved_
      - You: Who changed their vote?
        - Stephen Whitaker: Give me an hour. I'll know who it was.
        - You: Somebody leaked it. Find out who.
          - Stephen Whitaker: I'll find out who it was.
          - _Ends resolved_
        - You: It's done. Let's deal with it.
          - Stephen Whitaker: You call them first, and we tell it our way.
          - _Ends resolved_
  - You: Who changed their vote?
    - Stephen Whitaker: Give me an hour. I'll know who it was.
    - You: Somebody leaked it. Find out who.
      - Stephen Whitaker: I'll find out who it was.
      - You: Thank you. Keep me posted.
        - Stephen Whitaker: I'll get started.
        - _Ends resolved_
      - You: All right. Tell me what we do now.
        - Stephen Whitaker: You call them first, and we tell it our way.
        - You: Do it.
          - Stephen Whitaker: I'll get started.
          - _Ends resolved_
        - You: No. We say nothing for now.
          - Stephen Whitaker: We can't sit on this.
          - _Ends refused: Stephen Whitaker: This isn't going away on its own._
    - You: It's done. Let's deal with it.
      - Stephen Whitaker: You call them first, and we tell it our way.
      - You: Do it.
        - Stephen Whitaker: I'll get started.
        - _Ends resolved_
      - You: No. We say nothing for now.
        - Stephen Whitaker: We can't sit on this.
        - _Ends refused: Stephen Whitaker: This isn't going away on its own._
- You: I already knew.
  - _if not:_
    - Stephen Whitaker: I'll get started.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/solemn/10w1s [scene-talk.narrate-narrate.name-comes-into-your-office-and-closes-the-door]; L2 open/greet/scene-talk/solemn/9w1s [scene-talk.open-greet.you-re-going-to-want-to-sit-down-for-this]; L3 state/deliver-news/scene-talk/solemn/8w1s [scene-talk.state-deliver-news.we-lost-the-vote-on-bill]; L4 reply/ask/scene-talk/braced/4w1s [scene-talk.reply-ask.who-changed-their-vote]; L5 reply/blame/scene-talk/braced/7w1s [scene-talk.reply-blame.how-did-we-not-see-this-coming]; L6 reply/accept/scene-talk/calm/8w2s [scene-talk.reply-accept.all-right-tell-me-what-we-do-now]; L7 reply/deflect/scene-talk/guarded/6w2s [scene-talk.reply-deflect.not-now-i-need-to-think]; L8 reply/lie/scene-talk/guarded/3w1s [scene-talk.reply-lie.i-already-knew]; L9 follow/answer/scene-talk/solemn/9w2s [scene-talk.follow-answer.give-me-an-hour-i-ll-know-who-it-was]; L10 reply/blame/scene-talk/braced/6w2s [scene-talk.reply-blame.somebody-leaked-it-find-out-who]; L11 reply/accept/scene-talk/calm/8w2s [scene-talk.reply-accept.all-right-tell-me-what-we-do-now]; L22 follow/offer/scene-talk/calm/8w1s [scene-talk.follow-offer.we-put-out-a-statement-before-it-runs]; L23 reply/agree/scene-talk/calm/6w2s [scene-talk.reply-agree.all-right-let-s-go-with-that]; L24 reply/refuse/scene-talk/guarded/6w2s [scene-talk.reply-refuse.no-we-say-nothing-for-now]; L25 follow/thank/scene-talk/calm/3w1s [scene-talk.follow-thank.i-ll-get-started]</sub>

**Profile cold** (outcome resolved)

**Stephen Whitaker:** You're going to want to sit down for this.

**Stephen Whitaker:** We lost the vote on "Medicaid work requirement".

You could say:

1. Who changed their vote?
2. Somebody leaked it. Find out who. _(the page follows this one)_
3. All right. Tell me what we do now.
4. Not now. I need to think.
5. I already knew.

**Stephen Whitaker:** I'll find out who it was.

You could say:

1. Thank you. Keep me posted. _(the page follows this one)_
2. It's done. Let's deal with it.

**Stephen Whitaker:** I'll get started.

<sub>L1 narrate/narrate/scene-talk/solemn/10w1s [scene-talk.narrate-narrate.name-comes-into-your-office-and-closes-the-door]; L2 open/greet/scene-talk/solemn/9w1s [scene-talk.open-greet.you-re-going-to-want-to-sit-down-for-this]; L3 state/deliver-news/scene-talk/solemn/8w1s [scene-talk.state-deliver-news.we-lost-the-vote-on-bill]; L4 reply/ask/scene-talk/braced/4w1s [scene-talk.reply-ask.who-changed-their-vote]; L5 reply/blame/scene-talk/braced/6w2s [scene-talk.reply-blame.somebody-leaked-it-find-out-who]; L6 reply/accept/scene-talk/calm/8w2s [scene-talk.reply-accept.all-right-tell-me-what-we-do-now]; L7 reply/deflect/scene-talk/guarded/6w2s [scene-talk.reply-deflect.not-now-i-need-to-think]; L8 reply/lie/scene-talk/guarded/3w1s [scene-talk.reply-lie.i-already-knew]; L28 follow/promise/scene-talk/braced/6w1s [scene-talk.follow-promise.i-ll-find-out-who-it-was]; L29 reply/thank/scene-talk/calm/5w2s [scene-talk.reply-thank.thank-you-keep-me-posted]; L30 reply/accept/scene-talk/calm/6w2s [scene-talk.reply-accept.it-s-done-let-s-deal-with-it]; L31 follow/thank/scene-talk/calm/3w1s [scene-talk.follow-thank.i-ll-get-started]</sub>

**Profile stubborn** (outcome resolved)

**Stephen Whitaker:** You're going to want to sit down for this.

**Stephen Whitaker:** We lost the vote on "Medicaid work requirement".

You could say:

1. Who changed their vote?
2. Somebody leaked it. Find out who. _(the page follows this one)_
3. It's done. Let's deal with it.
4. Not now. I need to think.
5. I already knew.

**Stephen Whitaker:** I'll find out who it was.

You could say:

1. Thank you. Keep me posted. _(the page follows this one)_
2. All right. Tell me what we do now.

**Stephen Whitaker:** I'll get started.

<sub>L1 narrate/narrate/scene-talk/solemn/10w1s [scene-talk.narrate-narrate.name-comes-into-your-office-and-closes-the-door]; L2 open/greet/scene-talk/solemn/9w1s [scene-talk.open-greet.you-re-going-to-want-to-sit-down-for-this]; L3 state/deliver-news/scene-talk/solemn/8w1s [scene-talk.state-deliver-news.we-lost-the-vote-on-bill]; L4 reply/ask/scene-talk/braced/4w1s [scene-talk.reply-ask.who-changed-their-vote]; L5 reply/blame/scene-talk/braced/6w2s [scene-talk.reply-blame.somebody-leaked-it-find-out-who]; L6 reply/accept/scene-talk/calm/6w2s [scene-talk.reply-accept.it-s-done-let-s-deal-with-it]; L7 reply/deflect/scene-talk/guarded/6w2s [scene-talk.reply-deflect.not-now-i-need-to-think]; L8 reply/lie/scene-talk/guarded/3w1s [scene-talk.reply-lie.i-already-knew]; L28 follow/promise/scene-talk/braced/6w1s [scene-talk.follow-promise.i-ll-find-out-who-it-was]; L29 reply/thank/scene-talk/calm/5w2s [scene-talk.reply-thank.thank-you-keep-me-posted]; L30 reply/accept/scene-talk/calm/8w2s [scene-talk.reply-accept.all-right-tell-me-what-we-do-now]; L31 follow/thank/scene-talk/calm/3w1s [scene-talk.follow-thank.i-ll-get-started]</sub>

**Profile boastful** (outcome resolved)

**Stephen Whitaker:** You're going to want to sit down for this.

**Stephen Whitaker:** We lost the vote on "Medicaid work requirement".

You could say:

1. Who changed their vote? _(the page follows this one)_
2. How did we not see this coming?
3. All right. Tell me what we do now.
4. Not now. I need to think.
5. I already knew.

**Stephen Whitaker:** Give me an hour. I'll know who it was.

You could say:

1. Somebody leaked it. Find out who. _(the page follows this one)_
2. All right. Tell me what we do now.

**Stephen Whitaker:** I'll find out who it was.

You could say:

1. Thank you. Keep me posted. _(the page follows this one)_
2. It's done. Let's deal with it.

**Stephen Whitaker:** I'll get started.

<sub>L1 narrate/narrate/scene-talk/solemn/10w1s [scene-talk.narrate-narrate.name-comes-into-your-office-and-closes-the-door]; L2 open/greet/scene-talk/solemn/9w1s [scene-talk.open-greet.you-re-going-to-want-to-sit-down-for-this]; L3 state/deliver-news/scene-talk/solemn/8w1s [scene-talk.state-deliver-news.we-lost-the-vote-on-bill]; L4 reply/ask/scene-talk/braced/4w1s [scene-talk.reply-ask.who-changed-their-vote]; L5 reply/blame/scene-talk/braced/7w1s [scene-talk.reply-blame.how-did-we-not-see-this-coming]; L6 reply/accept/scene-talk/calm/8w2s [scene-talk.reply-accept.all-right-tell-me-what-we-do-now]; L7 reply/deflect/scene-talk/guarded/6w2s [scene-talk.reply-deflect.not-now-i-need-to-think]; L8 reply/lie/scene-talk/guarded/3w1s [scene-talk.reply-lie.i-already-knew]; L9 follow/answer/scene-talk/solemn/9w2s [scene-talk.follow-answer.give-me-an-hour-i-ll-know-who-it-was]; L10 reply/blame/scene-talk/braced/6w2s [scene-talk.reply-blame.somebody-leaked-it-find-out-who]; L11 reply/accept/scene-talk/calm/8w2s [scene-talk.reply-accept.all-right-tell-me-what-we-do-now]; L12 follow/promise/scene-talk/braced/6w1s [scene-talk.follow-promise.i-ll-find-out-who-it-was]; L13 reply/thank/scene-talk/calm/5w2s [scene-talk.reply-thank.thank-you-keep-me-posted]; L14 reply/accept/scene-talk/calm/6w2s [scene-talk.reply-accept.it-s-done-let-s-deal-with-it]; L15 follow/thank/scene-talk/calm/3w1s [scene-talk.follow-thank.i-ll-get-started]</sub>

## Scene 37: section-bargain (vote-wanted, ends in bill) — proof scene

_Purpose section-bargain. Records: bill:office:US-DE:legislature-lower:2027-02-01:official:term:seat:US-DE:lower:001:0:2026-10-12:24, official:term:seat:US-DE:lower:041:0:2026-10-12, official:term:seat:US-DE:lower:030:0:2026-10-12, office:US-DE:legislature-lower._

> The council is in recess. Ralph Morrow pulls you aside about "Universal preschool".

**Profile warm** (outcome resolved)

**Ralph Morrow:** Can I talk to you?

**Ralph Morrow:** Drop section 1, and you have my vote.

You could say:

1. Count me in. _(the page follows this one)_
2. Section 1 stays.
3. What if we change section 1 instead of dropping it?
4. Let me think about it.
5. I never had a problem with section 1.

**Ralph Morrow:** Thank you. I won't forget it.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, resolved, refused, resolved, resolved, resolved, resolved, refused, resolved, open, resolved, resolved, resolved, resolved, resolved, refused, resolved, open, resolved, resolved, refused, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You ★: Count me in.
  - Ralph Morrow: Thank you. I won't forget it.
  - _Ends resolved_
- You: Section 1 stays.
  - Ralph Morrow: Please. Think about the people this helps.
  - You: You've made your point. Count me in.
    - Ralph Morrow: Thank you. Really.
    - _Ends resolved_
  - You: I've made up my mind. It's no.
    - Ralph Morrow: Without this, I've got nothing to take home.
    - You: Okay. For you, I'll do it.
      - Ralph Morrow: Thank you. Really.
      - _Ends resolved_
    - You: I'm sorry, but I'm a no on "Universal preschool".
      - Ralph Morrow: You know what this means to me.
      - You: Okay. For you, I'll do it.
        - Ralph Morrow: You won't regret it.
        - _Ends resolved_
      - You: I can't vote for "Universal preschool".
        - Ralph Morrow: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - Ralph Morrow: Thank you. I won't forget it.
          - _Ends resolved_
        - You: What if we change section 1 instead of dropping it?
          - Ralph Morrow: Deal.
          - _Ends resolved_
        - You: Let me think about it.
          - Ralph Morrow: You can't stay on the fence forever.
          - _Ends open: Ralph Morrow: I hope you know what this costs you._
      - You: I'll cut half of section 1. Not all of it.
        - Ralph Morrow: All right. We have a deal.
        - _Ends resolved_
      - You: I need a few days to think it over.
        - Ralph Morrow: You can't stay on the fence forever.
        - You: Okay. For you, I'll do it.
          - Ralph Morrow: I knew I could count on you.
          - _Ends resolved_
        - You: I can't vote for "Universal preschool".
          - Ralph Morrow: I'm asking as a friend.
          - _Ends refused: Ralph Morrow: I won't forget this._
        - You: I'll cut half of section 1. Not all of it.
          - Ralph Morrow: That I can live with.
          - _Ends resolved_
    - You: What if we change section 1 instead of dropping it?
      - Ralph Morrow: That I can live with.
      - _Ends resolved_
    - You: I haven't decided yet.
      - Ralph Morrow: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - Ralph Morrow: You won't regret it.
        - _Ends resolved_
      - You: I'm sorry, but I'm a no on "Universal preschool".
        - Ralph Morrow: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - Ralph Morrow: You won't regret it.
          - _Ends resolved_
        - You: I can't vote for "Universal preschool".
          - Ralph Morrow: You know what this means to me.
          - _Ends refused: Ralph Morrow: I won't forget this._
        - You: What if we change section 1 instead of dropping it?
          - Ralph Morrow: Deal.
          - _Ends resolved_
        - You: I need a few days to think it over.
          - Ralph Morrow: You can't stay on the fence forever.
          - _Ends open: Ralph Morrow: You'll need friends after this vote. I won't be one._
      - You: I'll cut half of section 1. Not all of it.
        - Ralph Morrow: That I can live with.
        - _Ends resolved_
  - You: What if we change section 1 instead of dropping it?
    - Ralph Morrow: Deal.
    - _Ends resolved_
  - You: I haven't decided yet.
    - Ralph Morrow: You can't stay on the fence forever.
    - You: All right. You win. I'm in.
      - Ralph Morrow: Thank you. Really.
      - _Ends resolved_
    - You: I've made up my mind. It's no.
      - Ralph Morrow: I wouldn't ask if it didn't matter.
      - You: You've made your point. Count me in.
        - Ralph Morrow: You won't regret it.
        - _Ends resolved_
      - You: I can't vote for "Universal preschool".
        - Ralph Morrow: Without this, I've got nothing to take home.
        - You: All right. You win. I'm in.
          - Ralph Morrow: Thank you. Really.
          - _Ends resolved_
        - You: I'm sorry, but I'm a no on "Universal preschool".
          - Ralph Morrow: You know what this means to me.
          - _Ends refused: Ralph Morrow: You'll need friends after this vote. I won't be one._
        - You: What if we change section 1 instead of dropping it?
          - Ralph Morrow: That I can live with.
          - _Ends resolved_
        - You: I'm still weighing it.
          - Ralph Morrow: You can't stay on the fence forever.
          - _Ends open: Ralph Morrow: I won't forget this._
      - You: What if we change section 1 instead of dropping it?
        - Ralph Morrow: All right. We have a deal.
        - _Ends resolved_
      - You: I need a few days to think it over.
        - Ralph Morrow: You can't stay on the fence forever.
        - You: Okay. For you, I'll do it.
          - Ralph Morrow: Thank you. Really.
          - _Ends resolved_
        - You: I can't vote for "Universal preschool".
          - Ralph Morrow: I'm asking as a friend.
          - _Ends refused: Ralph Morrow: You'll need friends after this vote. I won't be one._
        - You: I'll cut half of section 1. Not all of it.
          - Ralph Morrow: Deal.
          - _Ends resolved_
    - You: What if we change section 1 instead of dropping it?
      - Ralph Morrow: That I can live with.
      - _Ends resolved_
- You: What if we change section 1 instead of dropping it?
  - Ralph Morrow: Deal.
  - _Ends resolved_
- You: Let me think about it.
  - Ralph Morrow: You can't stay on the fence forever.
  - You: You've made your point. Count me in.
    - Ralph Morrow: I knew I could count on you.
    - _Ends resolved_
  - You: I've made up my mind. It's no.
    - Ralph Morrow: You know what this means to me.
    - You: You've made your point. Count me in.
      - Ralph Morrow: Thank you. Really.
      - _Ends resolved_
    - You: Section 1 stays.
      - Ralph Morrow: I wouldn't ask if it didn't matter.
      - You: All right. You win. I'm in.
        - Ralph Morrow: Thank you. Really.
        - _Ends resolved_
      - You: I can't vote for "Universal preschool".
        - Ralph Morrow: I'm asking as a friend.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Universal preschool".
          - (the tree is cut here)
        - You: What if we change section 1 instead of dropping it?
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
      - You: What if we change section 1 instead of dropping it?
        - Ralph Morrow: All right. We have a deal.
        - _Ends resolved_
      - You: I'm still weighing it.
        - Ralph Morrow: You can't stay on the fence forever.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Universal preschool".
          - (the tree is cut here)
        - You: What if we change section 1 instead of dropping it?
          - (the tree is cut here)
    - You: What if we change section 1 instead of dropping it?
      - Ralph Morrow: All right. We have a deal.
      - _Ends resolved_
    - You: I'm still weighing it.
      - Ralph Morrow: You can't stay on the fence forever.
      - You: All right. You win. I'm in.
        - Ralph Morrow: Thank you. I won't forget it.
        - _Ends resolved_
      - You: Section 1 stays.
        - Ralph Morrow: I'm asking as a friend.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Universal preschool".
          - (the tree is cut here)
        - You: What if we change section 1 instead of dropping it?
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
      - You: I'll cut half of section 1. Not all of it.
        - Ralph Morrow: That I can live with.
        - _Ends resolved_
  - You: What if we change section 1 instead of dropping it?
    - Ralph Morrow: That I can live with.
    - _Ends resolved_
- You: I never had a problem with section 1.
  - _if not:_
    - Ralph Morrow: All right. I had to ask.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/braced/13w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/bargain/scene-talk/braced/8w1s [scene-talk.state-bargain.drop-section-section-and-you-have-my-vote]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L9 follow/thank/scene-talk/glad/6w2s [scene-talk.follow-thank.thank-you-i-won-t-forget-it]</sub>

**Profile cold** (outcome open)

**Ralph Morrow:** Can I talk to you?

**Ralph Morrow:** Drop section 1, and you have my vote.

You could say:

1. Fine. You have it.
2. Section 1 stays. _(the page follows this one)_
3. I'll cut half of section 1. Not all of it.
4. I'm still weighing it.
5. I never had a problem with section 1.

**Ralph Morrow:** It would be a shame if your next bill stalled.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't vote for "Universal preschool". _(the page follows this one)_
3. Are you threatening me?
4. I'll cut half of section 1. Not all of it.

**Ralph Morrow:** You can't win without friends.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I've made up my mind. It's no. _(the page follows this one)_
3. Are you threatening me?
4. I'll cut half of section 1. Not all of it.

**Ralph Morrow:** You know how this works.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry, but I'm a no on "Universal preschool". _(the page follows this one)_
3. Are you threatening me?
4. I'll cut half of section 1. Not all of it.

**Ralph Morrow:** People will remember this at the next election.

You could say:

1. You've made your point. Count me in.
2. Are you threatening me? _(the page follows this one)_
3. I'll cut half of section 1. Not all of it.

**Ralph Morrow:** Let's not make this personal.

**Ralph Morrow:** Think it over. I'll be back tomorrow.

<sub>L1 narrate/narrate/scene-talk/braced/13w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/bargain/scene-talk/braced/8w1s [scene-talk.state-bargain.drop-section-section-and-you-have-my-vote]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L10 follow/threaten/scene-talk/guarded/10w1s [scene-talk.follow-threaten.it-would-be-a-shame-if-your-next-bill-stalled]; L11 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L12 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L13 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L14 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L16 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-can-t-win-without-friends]; L17 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L18 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L19 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L20 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L22 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-know-how-this-works]; L23 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L24 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L25 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L26 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L28 follow/threaten/scene-talk/braced/8w1s [scene-talk.follow-threaten.people-will-remember-this-at-the-next-election]; L29 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L30 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L31 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L33 follow/deflect/scene-talk/guarded/5w1s [scene-talk.follow-deflect.let-s-not-make-this-personal]; L34 close/press/scene-talk/braced/7w2s [scene-talk.close-press.think-it-over-i-ll-be-back-tomorrow]</sub>

**Profile stubborn** (outcome resolved)

**Ralph Morrow:** Got a second?

**Ralph Morrow:** I can live with "Universal preschool". I can't live with section 1.

You could say:

1. Fine. You have it.
2. I've made up my mind. It's no. _(the page follows this one)_
3. I'll cut half of section 1. Not all of it.
4. I haven't decided yet.
5. I never had a problem with section 1.

**Ralph Morrow:** I need a yes or a no.

You could say:

1. All right. You win. I'm in.
2. I'm sorry, but I'm a no on "Universal preschool". _(the page follows this one)_
3. I'll cut half of section 1. Not all of it.

**Ralph Morrow:** I need to know before the vote.

You could say:

1. You've made your point. Count me in.
2. I can't vote for "Universal preschool". _(the page follows this one)_
3. What if we change section 1 instead of dropping it?

**Ralph Morrow:** Yes or no?

You could say:

1. Okay. For you, I'll do it.
2. Section 1 stays. _(the page follows this one)_
3. What if we change section 1 instead of dropping it?

**Ralph Morrow:** You can't sit this one out.

You could say:

1. Okay. For you, I'll do it.
2. I'll cut half of section 1. Not all of it. _(the page follows this one)_

**Ralph Morrow:** Deal.

<sub>L1 narrate/narrate/scene-talk/braced/13w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/bargain/scene-talk/braced/12w2s [scene-talk.state-bargain.i-can-live-with-bill-i-can-t-live-with-section-section]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L10 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-a-yes-or-a-no]; L11 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L12 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L13 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L15 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-to-know-before-the-vote]; L16 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L17 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L18 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L20 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L21 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L22 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L23 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L25 follow/press/scene-talk/guarded/6w1s [scene-talk.follow-press.you-can-t-sit-this-one-out]; L26 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L27 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L29 follow/accept/scene-talk/calm/1w1s [scene-talk.follow-accept.deal]</sub>

**Profile anxious** (outcome resolved)

**Ralph Morrow:** Sorry to bother you.

**Ralph Morrow:** Drop section 1, and you have my vote.

You could say:

1. Fine. You have it.
2. I'm sorry, but I'm a no on "Universal preschool".
3. I'll cut half of section 1. Not all of it.
4. I haven't decided yet. _(the page follows this one)_
5. I never had a problem with section 1.

**Ralph Morrow:** You can't stay on the fence forever.

You could say:

1. Okay. For you, I'll do it.
2. Section 1 stays.
3. What if we change section 1 instead of dropping it? _(the page follows this one)_

**Ralph Morrow:** Deal.

<sub>L1 narrate/narrate/scene-talk/braced/13w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/bargain/scene-talk/braced/8w1s [scene-talk.state-bargain.drop-section-section-and-you-have-my-vote]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L97 follow/press/scene-talk/guarded/7w1s [scene-talk.follow-press.you-can-t-stay-on-the-fence-forever]; L98 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L99 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L100 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L136 follow/accept/scene-talk/calm/1w1s [scene-talk.follow-accept.deal]</sub>

**Profile boastful** (outcome resolved)

**Ralph Morrow:** Have you got a few minutes?

**Ralph Morrow:** Drop section 1, and you have my vote.

You could say:

1. I'm with you on "Universal preschool".
2. I'm sorry, but I'm a no on "Universal preschool".
3. I'll cut half of section 1. Not all of it. _(the page follows this one)_
4. Let me think about it.
5. I never had a problem with section 1.

**Ralph Morrow:** Deal.

<sub>L1 narrate/narrate/scene-talk/braced/13w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/bargain/scene-talk/braced/8w1s [scene-talk.state-bargain.drop-section-section-and-you-have-my-vote]; L4 reply/agree/scene-talk/calm/6w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L25 follow/accept/scene-talk/calm/1w1s [scene-talk.follow-accept.deal]</sub>

## Scene 38: section-bargain (vote-wanted, ends in bill) — proof scene

_Purpose section-bargain. Records: bill:office:US-DE:legislature-upper:2027-01-18:official:term:seat:US-DE:upper:020:0:2026-10-12:11, official:term:seat:US-DE:upper:016:0:2026-10-12, official:term:seat:US-DE:upper:013:0:2026-10-12, office:US-DE:legislature-upper._

> Jessica Murray has been holding out on "Public funds for private schooling". Now Jessica Murray wants to talk.

**Profile warm** (outcome resolved)

**Jessica Murray:** Have you got a few minutes?

**Jessica Murray:** I can live with "Public funds for private schooling". I can't live with section 2.

You could say:

1. Count me in. _(the page follows this one)_
2. I've made up my mind. It's no.
3. What if we change section 2 instead of dropping it?
4. Let me think about it.
5. I never had a problem with section 2.

**Jessica Murray:** I knew I could count on you.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, resolved, refused, resolved, resolved, resolved, resolved, refused, resolved, open, resolved, resolved, resolved, resolved, resolved, refused, resolved, open, resolved, resolved, refused, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You ★: Count me in.
  - Jessica Murray: I knew I could count on you.
  - _Ends resolved_
- You: I've made up my mind. It's no.
  - Jessica Murray: You know what this means to me.
  - You: Okay. For you, I'll do it.
    - Jessica Murray: Thank you. I won't forget it.
    - _Ends resolved_
  - You: Section 2 stays.
    - Jessica Murray: I need this one. I promised my district I'd deliver.
    - You: Okay. For you, I'll do it.
      - Jessica Murray: I knew I could count on you.
      - _Ends resolved_
    - You: I can't vote for "Public funds for private schooling".
      - Jessica Murray: I wouldn't ask if it didn't matter.
      - You: Okay. For you, I'll do it.
        - Jessica Murray: I knew I could count on you.
        - _Ends resolved_
      - You: I'm sorry, but I'm a no on "Public funds for private schooling".
        - Jessica Murray: Please. Think about the people this helps.
        - You: Okay. For you, I'll do it.
          - Jessica Murray: I knew I could count on you.
          - _Ends resolved_
        - You: What if we change section 2 instead of dropping it?
          - Jessica Murray: That I can live with.
          - _Ends resolved_
        - You: I haven't decided yet.
          - Jessica Murray: You can't stay on the fence forever.
          - _Ends open: Jessica Murray: I won't forget this._
      - You: I'll cut half of section 2. Not all of it.
        - Jessica Murray: Deal.
        - _Ends resolved_
      - You: Let me think about it.
        - Jessica Murray: You can't stay on the fence forever.
        - You: All right. You win. I'm in.
          - Jessica Murray: I knew I could count on you.
          - _Ends resolved_
        - You: I'm sorry, but I'm a no on "Public funds for private schooling".
          - Jessica Murray: I'm asking as a friend.
          - _Ends refused: Jessica Murray: I hope you know what this costs you._
        - You: What if we change section 2 instead of dropping it?
          - Jessica Murray: Deal.
          - _Ends resolved_
    - You: What if we change section 2 instead of dropping it?
      - Jessica Murray: All right. We have a deal.
      - _Ends resolved_
    - You: Let me sleep on it.
      - Jessica Murray: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - Jessica Murray: I knew I could count on you.
        - _Ends resolved_
      - You: I'm sorry, but I'm a no on "Public funds for private schooling".
        - Jessica Murray: Without this, I've got nothing to take home.
        - You: All right. You win. I'm in.
          - Jessica Murray: Thank you. I won't forget it.
          - _Ends resolved_
        - You: I can't vote for "Public funds for private schooling".
          - Jessica Murray: I could lose my primary over this.
          - _Ends refused: Jessica Murray: You'll need friends after this vote. I won't be one._
        - You: What if we change section 2 instead of dropping it?
          - Jessica Murray: Deal.
          - _Ends resolved_
        - You: Let me think about it.
          - Jessica Murray: You can't stay on the fence forever.
          - _Ends open: Jessica Murray: I won't forget this._
      - You: What if we change section 2 instead of dropping it?
        - Jessica Murray: That I can live with.
        - _Ends resolved_
  - You: What if we change section 2 instead of dropping it?
    - Jessica Murray: Deal.
    - _Ends resolved_
  - You: I'm still weighing it.
    - Jessica Murray: You can't stay on the fence forever.
    - You: All right. You win. I'm in.
      - Jessica Murray: I knew I could count on you.
      - _Ends resolved_
    - You: I'm sorry, but I'm a no on "Public funds for private schooling".
      - Jessica Murray: Please. Think about the people this helps.
      - You: You've made your point. Count me in.
        - Jessica Murray: I knew I could count on you.
        - _Ends resolved_
      - You: Section 2 stays.
        - Jessica Murray: I wouldn't ask if it didn't matter.
        - You: All right. You win. I'm in.
          - Jessica Murray: You won't regret it.
          - _Ends resolved_
        - You: I can't vote for "Public funds for private schooling".
          - Jessica Murray: I need this one. I promised my district I'd deliver.
          - _Ends refused: Jessica Murray: You'll need friends after this vote. I won't be one._
        - You: What if we change section 2 instead of dropping it?
          - Jessica Murray: That I can live with.
          - _Ends resolved_
        - You: Let me sleep on it.
          - Jessica Murray: You can't stay on the fence forever.
          - _Ends open: Jessica Murray: I hope you know what this costs you._
      - You: What if we change section 2 instead of dropping it?
        - Jessica Murray: That I can live with.
        - _Ends resolved_
      - You: I need a few days to think it over.
        - Jessica Murray: You can't stay on the fence forever.
        - You: You've made your point. Count me in.
          - Jessica Murray: You won't regret it.
          - _Ends resolved_
        - You: Section 2 stays.
          - Jessica Murray: I'm asking as a friend.
          - _Ends refused: Jessica Murray: I won't forget this._
        - You: What if we change section 2 instead of dropping it?
          - Jessica Murray: All right. We have a deal.
          - _Ends resolved_
    - You: What if we change section 2 instead of dropping it?
      - Jessica Murray: All right. We have a deal.
      - _Ends resolved_
- You: What if we change section 2 instead of dropping it?
  - Jessica Murray: That I can live with.
  - _Ends resolved_
- You: Let me think about it.
  - Jessica Murray: You can't stay on the fence forever.
  - You: Okay. For you, I'll do it.
    - Jessica Murray: You won't regret it.
    - _Ends resolved_
  - You: I've made up my mind. It's no.
    - Jessica Murray: Please. Think about the people this helps.
    - You: Okay. For you, I'll do it.
      - Jessica Murray: I knew I could count on you.
      - _Ends resolved_
    - You: Section 2 stays.
      - Jessica Murray: I wouldn't ask if it didn't matter.
      - You: Okay. For you, I'll do it.
        - Jessica Murray: Thank you. Really.
        - _Ends resolved_
      - You: I'm sorry, but I'm a no on "Public funds for private schooling".
        - Jessica Murray: I need this one. I promised my district I'd deliver.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't vote for "Public funds for private schooling".
          - (the tree is cut here)
        - You: I'll cut half of section 2. Not all of it.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
      - You: What if we change section 2 instead of dropping it?
        - Jessica Murray: That I can live with.
        - _Ends resolved_
      - You: I need a few days to think it over.
        - Jessica Murray: You can't stay on the fence forever.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Public funds for private schooling".
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
    - You: What if we change section 2 instead of dropping it?
      - Jessica Murray: That I can live with.
      - _Ends resolved_
    - You: I need a few days to think it over.
      - Jessica Murray: You can't stay on the fence forever.
      - You: You've made your point. Count me in.
        - Jessica Murray: I knew I could count on you.
        - _Ends resolved_
      - You: Section 2 stays.
        - Jessica Murray: I wouldn't ask if it didn't matter.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I can't vote for "Public funds for private schooling".
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: I'm still undecided. Give me until the vote.
          - (the tree is cut here)
      - You: What if we change section 2 instead of dropping it?
        - Jessica Murray: Deal.
        - _Ends resolved_
  - You: What if we change section 2 instead of dropping it?
    - Jessica Murray: All right. We have a deal.
    - _Ends resolved_
- You: I never had a problem with section 2.
  - _if not:_
    - Jessica Murray: I understand. No hard feelings.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-holding-out-on-bill-now-name-wants-to-talk]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/bargain/scene-talk/braced/15w2s [scene-talk.state-bargain.i-can-live-with-bill-i-can-t-live-with-section-section]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L9 follow/thank/scene-talk/glad/7w1s [scene-talk.follow-thank.i-knew-i-could-count-on-you]</sub>

**Profile cold** (outcome resolved)

**Jessica Murray:** Have you got a few minutes?

**Jessica Murray:** I can live with "Public funds for private schooling". I can't live with section 2.

You could say:

1. Fine. You have it.
2. Section 2 stays. _(the page follows this one)_
3. I'll cut half of section 2. Not all of it.
4. I'm still undecided. Give me until the vote.
5. I never had a problem with section 2.

**Jessica Murray:** You know how this works.

You could say:

1. You've made your point. Count me in.
2. I've made up my mind. It's no. _(the page follows this one)_
3. Are you threatening me?
4. I'll cut half of section 2. Not all of it.

**Jessica Murray:** People will remember this at the next election.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't vote for "Public funds for private schooling". _(the page follows this one)_
3. Don't try that with me.
4. What if we change section 2 instead of dropping it?

**Jessica Murray:** You can't win without friends.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry, but I'm a no on "Public funds for private schooling". _(the page follows this one)_
3. Are you threatening me?
4. What if we change section 2 instead of dropping it?

**Jessica Murray:** It would be a shame if your next bill stalled.

You could say:

1. All right. You win. I'm in. _(the page follows this one)_
2. Don't try that with me.
3. I'll cut half of section 2. Not all of it.

**Jessica Murray:** Good. I'll hold you to that.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-holding-out-on-bill-now-name-wants-to-talk]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/bargain/scene-talk/braced/15w2s [scene-talk.state-bargain.i-can-live-with-bill-i-can-t-live-with-section-section]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/guarded/8w2s [scene-talk.reply-stall.i-m-still-undecided-give-me-until-the-vote]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L10 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-know-how-this-works]; L11 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L12 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L13 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L14 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L16 follow/threaten/scene-talk/braced/8w1s [scene-talk.follow-threaten.people-will-remember-this-at-the-next-election]; L17 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L18 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L19 reply/confront/scene-talk/braced/5w1s [scene-talk.reply-confront.don-t-try-that-with-me]; L20 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L22 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-can-t-win-without-friends]; L23 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L24 reply/refuse/scene-talk/guarded/12w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L25 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L26 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L28 follow/threaten/scene-talk/guarded/10w1s [scene-talk.follow-threaten.it-would-be-a-shame-if-your-next-bill-stalled]; L29 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L30 reply/confront/scene-talk/braced/5w1s [scene-talk.reply-confront.don-t-try-that-with-me]; L31 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L32 follow/thank/scene-talk/guarded/6w2s [scene-talk.follow-thank.good-i-ll-hold-you-to-that]</sub>

**Profile stubborn** (outcome resolved)

**Jessica Murray:** Have you got a few minutes?

**Jessica Murray:** I can live with "Public funds for private schooling". I can't live with section 2.

You could say:

1. Fine. Section 2 comes out.
2. I'm sorry, but I'm a no on "Public funds for private schooling". _(the page follows this one)_
3. I'll cut half of section 2. Not all of it.
4. I haven't decided yet.
5. I never had a problem with section 2.

**Jessica Murray:** Take your time, but I need an answer.

You could say:

1. Okay. For you, I'll do it.
2. I can't vote for "Public funds for private schooling". _(the page follows this one)_
3. I'll cut half of section 2. Not all of it.

**Jessica Murray:** Yes or no?

You could say:

1. You've made your point. Count me in.
2. Section 2 stays. _(the page follows this one)_
3. I'll cut half of section 2. Not all of it.

**Jessica Murray:** What would it take?

You could say:

1. You've made your point. Count me in.
2. I've made up my mind. It's no. _(the page follows this one)_
3. I'll cut half of section 2. Not all of it.

**Jessica Murray:** You can't sit this one out.

You could say:

1. Okay. For you, I'll do it.
2. I'll cut half of section 2. Not all of it. _(the page follows this one)_

**Jessica Murray:** Deal.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-holding-out-on-bill-now-name-wants-to-talk]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/bargain/scene-talk/braced/15w2s [scene-talk.state-bargain.i-can-live-with-bill-i-can-t-live-with-section-section]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.fine-section-section-comes-out]; L5 reply/refuse/scene-talk/guarded/12w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L10 follow/press/scene-talk/calm/8w1s [scene-talk.follow-press.take-your-time-but-i-need-an-answer]; L11 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L12 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L13 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L15 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L16 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L17 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L18 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L20 follow/press/scene-talk/calm/4w1s [scene-talk.follow-press.what-would-it-take]; L21 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L22 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L23 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L25 follow/press/scene-talk/guarded/6w1s [scene-talk.follow-press.you-can-t-sit-this-one-out]; L26 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L27 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L29 follow/accept/scene-talk/calm/1w1s [scene-talk.follow-accept.deal]</sub>

**Profile anxious** (outcome resolved)

**Jessica Murray:** Sorry to bother you.

**Jessica Murray:** I can live with "Public funds for private schooling". I can't live with section 2.

You could say:

1. Count me in.
2. I've made up my mind. It's no.
3. What if we change section 2 instead of dropping it?
4. Let me think about it. _(the page follows this one)_
5. I never had a problem with section 2.

**Jessica Murray:** You can't stay on the fence forever.

You could say:

1. Fine. I'll do it, but this is the last time. _(the page follows this one)_
2. I can't vote for "Public funds for private schooling".
3. I'll cut half of section 2. Not all of it.

**Jessica Murray:** Good. I'll hold you to that.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-holding-out-on-bill-now-name-wants-to-talk]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/bargain/scene-talk/braced/15w2s [scene-talk.state-bargain.i-can-live-with-bill-i-can-t-live-with-section-section]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L97 follow/press/scene-talk/guarded/7w1s [scene-talk.follow-press.you-can-t-stay-on-the-fence-forever]; L98 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L99 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L100 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L101 follow/thank/scene-talk/guarded/6w2s [scene-talk.follow-thank.good-i-ll-hold-you-to-that]</sub>

**Profile boastful** (outcome resolved)

**Jessica Murray:** Got a second?

**Jessica Murray:** I can live with "Public funds for private schooling". I can't live with section 2.

You could say:

1. Count me in. _(the page follows this one)_
2. I've made up my mind. It's no.
3. What if we change section 2 instead of dropping it?
4. I'm still undecided. Give me until the vote.
5. I never had a problem with section 2.

**Jessica Murray:** Thank you. I won't forget it.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-holding-out-on-bill-now-name-wants-to-talk]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/bargain/scene-talk/braced/15w2s [scene-talk.state-bargain.i-can-live-with-bill-i-can-t-live-with-section-section]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/guarded/8w2s [scene-talk.reply-stall.i-m-still-undecided-give-me-until-the-vote]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L9 follow/thank/scene-talk/glad/6w2s [scene-talk.follow-thank.thank-you-i-won-t-forget-it]</sub>

## Scene 39: section-bargain (vote-wanted, ends in bill) — proof scene

_Purpose section-bargain. Records: bill:office:US-DE:legislature-lower:2027-02-02:official:term:seat:US-DE:lower:001:0:2026-10-12:25, official:term:seat:US-DE:lower:028:0:2026-10-12, official:term:seat:US-DE:lower:014:0:2026-10-12, office:US-DE:legislature-lower._

> The council is in recess. Stephanie Clay pulls you aside about "Limit groundwater withdrawal".

**Profile warm** (outcome resolved)

**Stephanie Clay:** Sorry to bother you.

**Stephanie Clay:** I'll vote yes on "Limit groundwater withdrawal" if section 2 comes out.

You could say:

1. You have my vote. _(the page follows this one)_
2. I can't vote for "Limit groundwater withdrawal".
3. What if we change section 2 instead of dropping it?
4. I haven't decided yet.
5. I never had a problem with section 2.

**Stephanie Clay:** Thank you. Really.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, resolved, refused, resolved, resolved, resolved, resolved, refused, resolved, open, resolved, resolved, resolved, resolved, resolved, refused, resolved, open, resolved, resolved, refused, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You ★: You have my vote.
  - Stephanie Clay: Thank you. Really.
  - _Ends resolved_
- You: I can't vote for "Limit groundwater withdrawal".
  - Stephanie Clay: Please. Think about the people this helps.
  - You: You've made your point. Count me in.
    - Stephanie Clay: Thank you. Really.
    - _Ends resolved_
  - You: I've made up my mind. It's no.
    - Stephanie Clay: I need this one. I promised my district I'd deliver.
    - You: You've made your point. Count me in.
      - Stephanie Clay: I knew I could count on you.
      - _Ends resolved_
    - You: Section 2 stays.
      - Stephanie Clay: I'm asking as a friend.
      - You: Okay. For you, I'll do it.
        - Stephanie Clay: You won't regret it.
        - _Ends resolved_
      - You: I'm sorry, but I'm a no on "Limit groundwater withdrawal".
        - Stephanie Clay: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - Stephanie Clay: Good. I'll hold you to that.
          - _Ends resolved_
        - You: What if we change section 2 instead of dropping it?
          - Stephanie Clay: That I can live with.
          - _Ends resolved_
        - You: I haven't decided yet.
          - Stephanie Clay: You can't stay on the fence forever.
          - _Ends open: Stephanie Clay: I won't forget this._
      - You: What if we change section 2 instead of dropping it?
        - Stephanie Clay: Deal.
        - _Ends resolved_
      - You: Let me think about it.
        - Stephanie Clay: You can't stay on the fence forever.
        - You: Okay. For you, I'll do it.
          - Stephanie Clay: You won't regret it.
          - _Ends resolved_
        - You: I'm sorry, but I'm a no on "Limit groundwater withdrawal".
          - Stephanie Clay: I wouldn't ask if it didn't matter.
          - _Ends refused: Stephanie Clay: I won't forget this._
        - You: I'll cut half of section 2. Not all of it.
          - Stephanie Clay: All right. We have a deal.
          - _Ends resolved_
    - You: What if we change section 2 instead of dropping it?
      - Stephanie Clay: Deal.
      - _Ends resolved_
    - You: I haven't decided yet.
      - Stephanie Clay: You can't stay on the fence forever.
      - You: You've made your point. Count me in.
        - Stephanie Clay: You won't regret it.
        - _Ends resolved_
      - You: Section 2 stays.
        - Stephanie Clay: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - Stephanie Clay: Thank you. Really.
          - _Ends resolved_
        - You: I'm sorry, but I'm a no on "Limit groundwater withdrawal".
          - Stephanie Clay: I'm asking as a friend.
          - _Ends refused: Stephanie Clay: You'll need friends after this vote. I won't be one._
        - You: What if we change section 2 instead of dropping it?
          - Stephanie Clay: That I can live with.
          - _Ends resolved_
        - You: Let me sleep on it.
          - Stephanie Clay: You can't stay on the fence forever.
          - _Ends open: Stephanie Clay: I hope you know what this costs you._
      - You: What if we change section 2 instead of dropping it?
        - Stephanie Clay: Deal.
        - _Ends resolved_
  - You: What if we change section 2 instead of dropping it?
    - Stephanie Clay: Deal.
    - _Ends resolved_
  - You: Let me sleep on it.
    - Stephanie Clay: You can't stay on the fence forever.
    - You: Fine. I'll do it, but this is the last time.
      - Stephanie Clay: Thank you. Really.
      - _Ends resolved_
    - You: Section 2 stays.
      - Stephanie Clay: You know what this means to me.
      - You: Okay. For you, I'll do it.
        - Stephanie Clay: I knew I could count on you.
        - _Ends resolved_
      - You: I'm sorry, but I'm a no on "Limit groundwater withdrawal".
        - Stephanie Clay: I could lose my primary over this.
        - You: Okay. For you, I'll do it.
          - Stephanie Clay: Thank you. I won't forget it.
          - _Ends resolved_
        - You: I've made up my mind. It's no.
          - Stephanie Clay: I wouldn't ask if it didn't matter.
          - _Ends refused: Stephanie Clay: You'll need friends after this vote. I won't be one._
        - You: I'll cut half of section 2. Not all of it.
          - Stephanie Clay: That I can live with.
          - _Ends resolved_
        - You: I'm still weighing it.
          - Stephanie Clay: You can't stay on the fence forever.
          - _Ends open: Stephanie Clay: I hope you know what this costs you._
      - You: What if we change section 2 instead of dropping it?
        - Stephanie Clay: All right. We have a deal.
        - _Ends resolved_
      - You: Let me think about it.
        - Stephanie Clay: You can't stay on the fence forever.
        - You: You've made your point. Count me in.
          - Stephanie Clay: Thank you. Really.
          - _Ends resolved_
        - You: I've made up my mind. It's no.
          - Stephanie Clay: I wouldn't ask if it didn't matter.
          - _Ends refused: Stephanie Clay: I hope you know what this costs you._
        - You: What if we change section 2 instead of dropping it?
          - Stephanie Clay: Deal.
          - _Ends resolved_
    - You: What if we change section 2 instead of dropping it?
      - Stephanie Clay: That I can live with.
      - _Ends resolved_
- You: What if we change section 2 instead of dropping it?
  - Stephanie Clay: Deal.
  - _Ends resolved_
- You: I haven't decided yet.
  - Stephanie Clay: You can't stay on the fence forever.
  - You: Okay. For you, I'll do it.
    - Stephanie Clay: Thank you. Really.
    - _Ends resolved_
  - You: Section 2 stays.
    - Stephanie Clay: I could lose my primary over this.
    - You: All right. You win. I'm in.
      - Stephanie Clay: You won't regret it.
      - _Ends resolved_
    - You: I've made up my mind. It's no.
      - Stephanie Clay: You know what this means to me.
      - You: Okay. For you, I'll do it.
        - Stephanie Clay: Good. I'll hold you to that.
        - _Ends resolved_
      - You: I'm sorry, but I'm a no on "Limit groundwater withdrawal".
        - Stephanie Clay: Please. Think about the people this helps.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Limit groundwater withdrawal".
          - (the tree is cut here)
        - You: I'll cut half of section 2. Not all of it.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: What if we change section 2 instead of dropping it?
        - Stephanie Clay: That I can live with.
        - _Ends resolved_
      - You: I'm still weighing it.
        - Stephanie Clay: You can't stay on the fence forever.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Limit groundwater withdrawal".
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
    - You: What if we change section 2 instead of dropping it?
      - Stephanie Clay: That I can live with.
      - _Ends resolved_
    - You: Let me think about it.
      - Stephanie Clay: You can't stay on the fence forever.
      - You: You've made your point. Count me in.
        - Stephanie Clay: Thank you. I won't forget it.
        - _Ends resolved_
      - You: I've made up my mind. It's no.
        - Stephanie Clay: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Limit groundwater withdrawal".
          - (the tree is cut here)
        - You: I'll cut half of section 2. Not all of it.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
      - You: What if we change section 2 instead of dropping it?
        - Stephanie Clay: All right. We have a deal.
        - _Ends resolved_
  - You: What if we change section 2 instead of dropping it?
    - Stephanie Clay: That I can live with.
    - _Ends resolved_
- You: I never had a problem with section 2.
  - _if not:_
    - Stephanie Clay: I knew I could count on you.
    - _Ends resolved_

<sub>L1 narrate/narrate/scene-talk/braced/14w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/bargain/scene-talk/braced/12w1s [scene-talk.state-bargain.i-ll-vote-yes-on-bill-if-section-section-comes-out]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L9 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile cold** (outcome open)

**Stephanie Clay:** Sorry to bother you.

**Stephanie Clay:** I'll vote yes on "Limit groundwater withdrawal" if section 2 comes out.

You could say:

1. You have my vote.
2. I can't vote for "Limit groundwater withdrawal". _(the page follows this one)_
3. What if we change section 2 instead of dropping it?
4. I'm still weighing it.
5. I never had a problem with section 2.

**Stephanie Clay:** People will remember this at the next election.

You could say:

1. You've made your point. Count me in.
2. Section 2 stays. _(the page follows this one)_
3. Don't try that with me.
4. I'll cut half of section 2. Not all of it.

**Stephanie Clay:** It would be a shame if your next bill stalled.

You could say:

1. Okay. For you, I'll do it.
2. I've made up my mind. It's no. _(the page follows this one)_
3. Are you threatening me?
4. I'll cut half of section 2. Not all of it.

**Stephanie Clay:** You can't win without friends.

You could say:

1. You've made your point. Count me in.
2. I'm sorry, but I'm a no on "Limit groundwater withdrawal". _(the page follows this one)_
3. Are you threatening me?
4. I'll cut half of section 2. Not all of it.

**Stephanie Clay:** You know how this works.

You could say:

1. All right. You win. I'm in.
2. Don't try that with me. _(the page follows this one)_
3. What if we change section 2 instead of dropping it?

**Stephanie Clay:** Let's not make this personal.

**Stephanie Clay:** Think it over. I'll be back tomorrow.

<sub>L1 narrate/narrate/scene-talk/braced/14w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/bargain/scene-talk/braced/12w1s [scene-talk.state-bargain.i-ll-vote-yes-on-bill-if-section-section-comes-out]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L10 follow/threaten/scene-talk/braced/8w1s [scene-talk.follow-threaten.people-will-remember-this-at-the-next-election]; L11 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L12 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L13 reply/confront/scene-talk/braced/5w1s [scene-talk.reply-confront.don-t-try-that-with-me]; L14 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L16 follow/threaten/scene-talk/guarded/10w1s [scene-talk.follow-threaten.it-would-be-a-shame-if-your-next-bill-stalled]; L17 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L18 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L19 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L20 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L22 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-can-t-win-without-friends]; L23 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L24 reply/refuse/scene-talk/guarded/10w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L25 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L26 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L28 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-know-how-this-works]; L29 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L30 reply/confront/scene-talk/braced/5w1s [scene-talk.reply-confront.don-t-try-that-with-me]; L31 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L33 follow/deflect/scene-talk/guarded/5w1s [scene-talk.follow-deflect.let-s-not-make-this-personal]; L34 close/press/scene-talk/braced/7w2s [scene-talk.close-press.think-it-over-i-ll-be-back-tomorrow]</sub>

**Profile stubborn** (outcome resolved)

**Stephanie Clay:** Got a second?

**Stephanie Clay:** I'll vote yes on "Limit groundwater withdrawal" if section 2 comes out.

You could say:

1. You have my vote.
2. I've made up my mind. It's no. _(the page follows this one)_
3. I'll cut half of section 2. Not all of it.
4. Let me think about it.
5. I never had a problem with section 2.

**Stephanie Clay:** I need a yes or a no.

You could say:

1. All right. You win. I'm in.
2. Section 2 stays. _(the page follows this one)_
3. I'll cut half of section 2. Not all of it.

**Stephanie Clay:** I need to know before the vote.

You could say:

1. Okay. For you, I'll do it.
2. I'm sorry, but I'm a no on "Limit groundwater withdrawal". _(the page follows this one)_
3. What if we change section 2 instead of dropping it?

**Stephanie Clay:** Yes or no?

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't vote for "Limit groundwater withdrawal". _(the page follows this one)_
3. I'll cut half of section 2. Not all of it.

**Stephanie Clay:** You can't sit this one out.

You could say:

1. Okay. For you, I'll do it.
2. What if we change section 2 instead of dropping it? _(the page follows this one)_

**Stephanie Clay:** Deal.

<sub>L1 narrate/narrate/scene-talk/braced/14w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/bargain/scene-talk/braced/12w1s [scene-talk.state-bargain.i-ll-vote-yes-on-bill-if-section-section-comes-out]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L10 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-a-yes-or-a-no]; L11 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L12 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L13 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L15 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-to-know-before-the-vote]; L16 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L17 reply/refuse/scene-talk/guarded/10w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L18 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L20 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L21 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L22 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L23 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L25 follow/press/scene-talk/guarded/6w1s [scene-talk.follow-press.you-can-t-sit-this-one-out]; L26 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L27 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L29 follow/accept/scene-talk/calm/1w1s [scene-talk.follow-accept.deal]</sub>

**Profile anxious** (outcome resolved)

**Stephanie Clay:** Sorry to bother you.

**Stephanie Clay:** I'll vote yes on "Limit groundwater withdrawal" if section 2 comes out.

You could say:

1. I'm with you on "Limit groundwater withdrawal".
2. I've made up my mind. It's no.
3. What if we change section 2 instead of dropping it?
4. I haven't decided yet. _(the page follows this one)_
5. I never had a problem with section 2.

**Stephanie Clay:** You can't stay on the fence forever.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't vote for "Limit groundwater withdrawal".
3. I'll cut half of section 2. Not all of it. _(the page follows this one)_

**Stephanie Clay:** Deal.

<sub>L1 narrate/narrate/scene-talk/braced/14w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/bargain/scene-talk/braced/12w1s [scene-talk.state-bargain.i-ll-vote-yes-on-bill-if-section-section-comes-out]; L4 reply/agree/scene-talk/calm/7w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L97 follow/press/scene-talk/guarded/7w1s [scene-talk.follow-press.you-can-t-stay-on-the-fence-forever]; L98 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L99 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L100 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L136 follow/accept/scene-talk/calm/1w1s [scene-talk.follow-accept.deal]</sub>

**Profile boastful** (outcome resolved)

**Stephanie Clay:** Got a second?

**Stephanie Clay:** I'll vote yes on "Limit groundwater withdrawal" if section 2 comes out.

You could say:

1. Count me in.
2. I've made up my mind. It's no.
3. I'll cut half of section 2. Not all of it. _(the page follows this one)_
4. I'm still undecided. Give me until the vote.
5. I never had a problem with section 2.

**Stephanie Clay:** Deal.

<sub>L1 narrate/narrate/scene-talk/braced/14w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/bargain/scene-talk/braced/12w1s [scene-talk.state-bargain.i-ll-vote-yes-on-bill-if-section-section-comes-out]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/guarded/8w2s [scene-talk.reply-stall.i-m-still-undecided-give-me-until-the-vote]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L50 follow/accept/scene-talk/calm/1w1s [scene-talk.follow-accept.deal]</sub>
