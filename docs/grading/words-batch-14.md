# Scenes with a purpose, batch-14

Place: Brookside, Delaware (the cached played world, seed fa3bbb297a4b3ea7c25595f71a3f37a7f7fdf08dfd6801c411add18d4f9f0a45). 39 scenes of 16 situation types, composed by `composeSceneTalk` (src/director/scene-talk.ts) once per personality profile (warm, cold, stubborn, anxious, boastful); a profile is shown only where its words differ. Every scene is a **proof scene**: the director fires none of these situations in the cached year (their producers are awaited), so each is staged from the real people and records listed under it. Words come only from data/english/parts/scene-talk.json.

Grade each line 1 to 5 on naturalness, prose, sentence structure, length (too short, right, too long), creativity and trait fit.

Situations: press-interview, campaign-stop, vote-asked, vote-confirmed, bill-carry, donor-ask, party-ask, office-hours, family-filing, family-win, family-loss, family-absence, rally-opponent, desk-bill, staff-news, section-bargain.

## Pieces the bank lacks (purpose / step / move)

- ask-vote/follow/bargain after scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you (1 scene)
- ask-vote/follow/refuse after scene-talk.reply-refuse.i-can-t-vote-for-bill (1 scene)
- ask-vote/follow/relent after scene-talk.reply-relent.you-ve-made-your-point-count-me-in (1 scene)
- ask-vote/reply/deflect after press (1 scene)
- carry-bill/follow/bargain after scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes (1 scene)
- carry-bill/follow/refuse after scene-talk.reply-refuse.i-m-sorry-i-just-can-t (1 scene)
- carry-bill/follow/relent after scene-talk.reply-relent.okay-for-you-i-ll-do-it (1 scene)
- carry-bill/follow/request after scene-talk.reply-request.give-me-a-list-of-everyone-who-s-undecided (3 scenes)
- carry-bill/reply/deflect after press (3 scenes)
- carry-bill/reply/disagree after answer (3 scenes)
- carry-bill/reply/promise after answer (3 scenes)
- carry-bill/reply/thank after answer (3 scenes)
- confirm-vote/follow/bargain after scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine (3 scenes)
- confirm-vote/follow/refuse after scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill (1 scene)
- confirm-vote/follow/refuse after scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no (2 scenes)
- confirm-vote/follow/relent after scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time (1 scene)
- confirm-vote/follow/relent after scene-talk.reply-relent.you-ve-made-your-point-count-me-in (2 scenes)
- confirm-vote/reply/deflect after press (3 scenes)
- constituent-help/reply/deflect after confront (3 scenes)
- donor-ask/follow/bargain after scene-talk.reply-bargain.i-ll-listen-i-won-t-promise-anything (1 scene)
- donor-ask/follow/refuse after scene-talk.reply-refuse.i-m-sorry-i-just-can-t (1 scene)
- donor-ask/follow/relent after scene-talk.reply-relent.all-right-you-win-i-m-in (1 scene)
- donor-ask/follow/relent after scene-talk.reply-relent.okay-for-you-i-ll-do-it (1 scene)
- family-absence/follow/apologize after scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know (2 scenes)
- family-absence/follow/blame after scene-talk.reply-blame.i-m-doing-this-for-us-too (2 scenes)
- family-absence/follow/promise after scene-talk.reply-promise.i-ll-be-home-more-i-promise (3 scenes)
- family-absence/follow/promise after scene-talk.reply-promise.this-weekend-is-ours-no-calls (2 scenes)
- family-absence/reply/tell after comfort (3 scenes)
- family-absence/reply/thank after comfort (3 scenes)
- family-filing/follow/apologize after scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first (2 scenes)
- family-filing/follow/apologize after scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first (1 scene)
- family-filing/follow/promise after scene-talk.reply-promise.i-won-t-let-it-take-over-our-lives (3 scenes)
- family-filing/follow/tell after scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it (2 scenes)
- family-filing/follow/tell after scene-talk.reply-tell.i-m-running-because-somebody-has-to (1 scene)
- family-filing/reply/thank after comfort (2 scenes)
- family-filing/reply/thank after promise (3 scenes)
- party-ask/follow/bargain after scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way (2 scenes)
- party-ask/follow/refuse after scene-talk.reply-refuse.i-m-sorry-i-just-can-t (2 scenes)
- party-ask/follow/relent after scene-talk.reply-relent.all-right-you-win-i-m-in (1 scene)
- party-ask/follow/relent after scene-talk.reply-relent.you-ve-made-your-point-count-me-in (1 scene)
- party-ask/reply/deflect after press (2 scenes)
- press-comment/follow/answer after scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote (4 scenes)
- press-comment/follow/refuse after scene-talk.reply-refuse.i-m-not-going-to-talk-about-that (1 scene)
- rally-opponent/reply/lie after confront (3 scenes)

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

Dropped: 63 repeated casts, 5 repeated reply sets, 11 profiles whose words matched another, 0 compositions skipped for a missing fact.

## Scene 1: press-interview (routine, ends in political) — proof scene

*Purpose press-comment. Records: interview:outlet:radio:0:jurisdiction_59500182da2857ae:filing:contest:seat:gus2025:101811:board:0:2026-11-03:person_9e002a561a4b29bc:2026-10-19:0, outlet:radio:0:jurisdiction_59500182da2857ae, person:press:outlet:radio:0:jurisdiction_59500182da2857ae:reporter:0, person_9e002a561a4b29bc.*

> Michael Howell, a reporter for Weom, catches you on your way out.

**Profile warm** (outcome resolved)

**Michael Howell:** Mind if I ask you a few things?

**Michael Howell:** Can you tell me how you'll vote on "Require photo id to vote"?

You could say:

1. I'm voting for it, and you can quote me.  *(the page follows this one)*
2. I'm still reading it.
3. I'm not going to talk about that.
4. You've got that wrong, and you know it.
5. I've always supported it.

**Michael Howell:** What do you say to people who disagree?

You could say:

1. I'd tell them I listened, and I still disagree.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**Michael Howell:** Can I quote you on that?

You could say:

1. You can quote me.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. No comment.

**Michael Howell:** Even if it costs you votes?

You could say:

1. Yes. Some things matter more than one election.  *(the page follows this one)*
2. I'm still reading it.
3. I'm not going to talk about that.

**Michael Howell:** What do you say to people who disagree?

You could say:

1. Read the bill before you judge it.  *(the page follows this one)*
2. I'm still reading it.
3. I'm not going to talk about that.

**Michael Howell:** Thanks for your time.

**The whole exchange** (62 nodes; endings: resolved, open, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- You ★: I'm voting for it, and you can quote me.
  - Michael Howell: What do you say to people who disagree?
  - You ★: I'd tell them I listened, and I still disagree.
    - Michael Howell: Can I quote you on that?
    - You ★: You can quote me.
      - Michael Howell: Even if it costs you votes?
      - You ★: Yes. Some things matter more than one election.
        - Michael Howell: What do you say to people who disagree?
        - You ★: Read the bill before you judge it.
          - Michael Howell: Thanks for your time.
          - *Ends resolved*
        - You: I'm still reading it.
          - (the tree is cut here)
        - You: I'm not going to talk about that.
          - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - Michael Howell: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: No comment.
      - Michael Howell: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
  - You: I'll have something to say after the vote.
    - Michael Howell: You'll be in the story either way.
    - You: Then put this in the story: I'm proud of my vote.
      - Michael Howell: Even if it costs you votes?
      - You: Even then. It's the right call.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - Michael Howell: Voters will want to know where you stand.
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
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
  - You: I'm not going to talk about that.
    - Michael Howell: You'll be in the story either way.
    - You: Then put this in the story: I'm proud of my vote.
      - Michael Howell: Can I quote you on that?
      - You: You can quote me.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - Michael Howell: Voters will want to know where you stand.
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
      - You: No comment.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
- You: I'm still reading it.
  - Michael Howell: You'll be in the story either way.
  - You: Then put this in the story: I'm proud of my vote.
    - Michael Howell: What do you say to people who disagree?
    - You: Read the bill before you judge it.
      - Michael Howell: Can I quote you on that?
      - You: You can quote me.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - Michael Howell: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - Michael Howell: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
  - You: I'm not going to talk about that.
    - Michael Howell: Voters will want to know where you stand.
    - You: Then put this in the story: I'm proud of my vote.
      - Michael Howell: Can I quote you on that?
      - You: You can quote me.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - Michael Howell: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
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
        - (the tree is cut here)
  - You: I'll have something to say after the vote.
    - Michael Howell: Voters will want to know where you stand.
    - You: Then put this in the story: I'm proud of my vote.
      - Michael Howell: What do you say to people who disagree?
      - You: I'd tell them I listened, and I still disagree.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - Michael Howell: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - Michael Howell: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
- You: I'm not going to talk about that.
  - Michael Howell: Voters will want to know where you stand.
  - You: Then put this in the story: I'm proud of my vote.
    - Michael Howell: What do you say to people who disagree?
    - You: Read the bill before you judge it.
      - Michael Howell: Even if it costs you votes?
      - You: Yes. Some things matter more than one election.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - Michael Howell: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: No comment.
      - Michael Howell: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
  - You: No comment.
    - Michael Howell: You'll be in the story either way.
    - You: Then put this in the story: I'm proud of my vote.
      - Michael Howell: Even if it costs you votes?
      - You: Even then. It's the right call.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - Michael Howell: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'm still reading it.
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
      - Michael Howell: Even if it costs you votes?
      - You: Yes. Some things matter more than one election.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - Michael Howell: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
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
        - (the tree is cut here)
- You: You've got that wrong, and you know it.
  - Michael Howell: We have it on the record. I'm just giving you a chance to respond.
  - You: Then let me answer it on the record.
    - Michael Howell: Even if it costs you votes?
    - You: Even then. It's the right call.
      - Michael Howell: What do you say to people who disagree?
      - You: I'd tell them I listened, and I still disagree.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'm still reading it.
      - Michael Howell: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - Michael Howell: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
  - You: I'm not going to talk about that.
    - Michael Howell: You'll be in the story either way.
    - You: Then put this in the story: I'm proud of my vote.
      - Michael Howell: What do you say to people who disagree?
      - You: Read the bill before you judge it.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - Michael Howell: Voters will want to know where you stand.
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
      - You: No comment.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
  - You: Why are you asking me before the vote?
    - Michael Howell: Because your vote may decide it, and voters want to know.
    - You: I'm voting for it, and you can quote me.
      - Michael Howell: What do you say to people who disagree?
      - You: I'd tell them I listened, and I still disagree.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - Michael Howell: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: You've got that wrong, and you know it.
      - Michael Howell: We have it on the record. I'm just giving you a chance to respond.
      - You: Then let me answer it on the record.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: You've got that wrong, and you know it.
        - (the tree is cut here)
- You: I've always supported it.
  - *if Michael Howell knows:*
    - Michael Howell: You voted against it last year. It's in the record.
    - You: You're right. I shouldn't have said that.
      - Michael Howell: Thank you for telling me straight.
      - *Ends open*
    - You: People say a lot of things.
      - Michael Howell: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - *Ends resolved*
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: Then Erin McCarthy has it wrong.
      - *Ends open: Michael Howell: I'll be at the next meeting.*
  - *if not:*
    - Michael Howell: Then I'll write that you declined to comment.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/guarded/12w1s [scene-talk.narrate-narrate.name-a-reporter-for-outlet-catches-you-on-your-way-out]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/13w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/proud/9w1s [scene-talk.reply-answer.i-m-voting-for-it-and-you-can-quote-me]; L5 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-ve-got-that-wrong-and-you-know-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L9 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L10 reply/answer/scene-talk/calm/9w1s [scene-talk.reply-answer.i-d-tell-them-i-listened-and-i-still-disagree]; L11 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L12 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L13 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L14 reply/answer/scene-talk/calm/4w1s [scene-talk.reply-answer.you-can-quote-me]; L15 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L16 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L17 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L18 reply/answer/scene-talk/proud/8w2s [scene-talk.reply-answer.yes-some-things-matter-more-than-one-election]; L19 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L20 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L21 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L22 reply/answer/scene-talk/braced/7w1s [scene-talk.reply-answer.read-the-bill-before-you-judge-it]; L23 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L24 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L25 follow/thank/scene-talk/calm/4w1s [scene-talk.follow-thank.thanks-for-your-time]</sub>

**Profile cold** (outcome resolved)

**Michael Howell:** Do you have a moment for a couple of questions?

**Michael Howell:** Can you tell me how you'll vote on "Require photo id to vote"?

You could say:

1. I'm voting no, and I'll tell you why.  *(the page follows this one)*
2. I'm still reading it.
3. No comment.
4. You've got that wrong, and you know it.
5. I never said that.

**Michael Howell:** What do you say to people who disagree?

You could say:

1. I'd tell them I listened, and I still disagree.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. No comment.

**Michael Howell:** Can I quote you on that?

You could say:

1. You can quote me.  *(the page follows this one)*
2. I'm still reading it.
3. No comment.

**Michael Howell:** Even if it costs you votes?

You could say:

1. Yes. Some things matter more than one election.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. No comment.

**Michael Howell:** Can I quote you on that?

You could say:

1. Go ahead. I meant every word.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**Michael Howell:** Thanks for your time.

<sub>L1 narrate/narrate/scene-talk/guarded/12w1s [scene-talk.narrate-narrate.name-a-reporter-for-outlet-catches-you-on-your-way-out]; L2 open/greet/scene-talk/calm/10w1s [scene-talk.open-greet.do-you-have-a-moment-for-a-couple-of-questions]; L3 state/ask/scene-talk/curious/13w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L5 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-ve-got-that-wrong-and-you-know-it]; L8 reply/lie/scene-talk/guarded/4w1s [scene-talk.reply-lie.i-never-said-that]; L9 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L10 reply/answer/scene-talk/calm/9w1s [scene-talk.reply-answer.i-d-tell-them-i-listened-and-i-still-disagree]; L11 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L12 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L13 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L14 reply/answer/scene-talk/calm/4w1s [scene-talk.reply-answer.you-can-quote-me]; L15 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L16 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L17 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L18 reply/answer/scene-talk/proud/8w2s [scene-talk.reply-answer.yes-some-things-matter-more-than-one-election]; L19 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L20 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L21 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L22 reply/answer/scene-talk/proud/6w2s [scene-talk.reply-answer.go-ahead-i-meant-every-word]; L23 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L24 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L25 follow/thank/scene-talk/calm/4w1s [scene-talk.follow-thank.thanks-for-your-time]</sub>

**Profile stubborn** (outcome resolved)

**Michael Howell:** Do you have a moment for a couple of questions?

**Michael Howell:** Can you tell me how you'll vote on "Require photo id to vote"?

You could say:

1. I'm voting no, and I'll tell you why.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. I'm not going to talk about that.
4. Why are you asking me before the vote?
5. I've always supported it.

**Michael Howell:** What do you say to people who disagree?

You could say:

1. I'd tell them I listened, and I still disagree.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**Michael Howell:** Even if it costs you votes?

You could say:

1. Yes. Some things matter more than one election.  *(the page follows this one)*
2. I'm still reading it.
3. No comment.

**Michael Howell:** Can I quote you on that?

You could say:

1. You can quote me.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**Michael Howell:** What do you say to people who disagree?

You could say:

1. Read the bill before you judge it.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**Michael Howell:** Thanks for your time.

<sub>L1 narrate/narrate/scene-talk/guarded/12w1s [scene-talk.narrate-narrate.name-a-reporter-for-outlet-catches-you-on-your-way-out]; L2 open/greet/scene-talk/calm/10w1s [scene-talk.open-greet.do-you-have-a-moment-for-a-couple-of-questions]; L3 state/ask/scene-talk/curious/13w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.why-are-you-asking-me-before-the-vote]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L9 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L10 reply/answer/scene-talk/calm/9w1s [scene-talk.reply-answer.i-d-tell-them-i-listened-and-i-still-disagree]; L11 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L12 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L13 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L14 reply/answer/scene-talk/proud/8w2s [scene-talk.reply-answer.yes-some-things-matter-more-than-one-election]; L15 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L16 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L17 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L18 reply/answer/scene-talk/calm/4w1s [scene-talk.reply-answer.you-can-quote-me]; L19 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L20 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L21 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L22 reply/answer/scene-talk/braced/7w1s [scene-talk.reply-answer.read-the-bill-before-you-judge-it]; L23 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L24 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L25 follow/thank/scene-talk/calm/4w1s [scene-talk.follow-thank.thanks-for-your-time]</sub>

**Profile anxious** (outcome resolved)

**Michael Howell:** Mind if I ask you a few things?

**Michael Howell:** Can you tell me how you'll vote on "Require photo id to vote"?

You could say:

1. I'm voting for it, and you can quote me.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. No comment.
4. You've got that wrong, and you know it.
5. I've always supported it.

**Michael Howell:** Can I quote you on that?

You could say:

1. Go ahead. I meant every word.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. No comment.

**Michael Howell:** What do you say to people who disagree?

You could say:

1. I'd tell them I listened, and I still disagree.  *(the page follows this one)*
2. I'm still reading it.
3. No comment.

**Michael Howell:** Even if it costs you votes?

You could say:

1. Yes. Some things matter more than one election.  *(the page follows this one)*
2. I'm still reading it.
3. I'm not going to talk about that.

**Michael Howell:** What do you say to people who disagree?

You could say:

1. Read the bill before you judge it.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**Michael Howell:** Thanks for your time.

<sub>L1 narrate/narrate/scene-talk/guarded/12w1s [scene-talk.narrate-narrate.name-a-reporter-for-outlet-catches-you-on-your-way-out]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/13w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/proud/9w1s [scene-talk.reply-answer.i-m-voting-for-it-and-you-can-quote-me]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-ve-got-that-wrong-and-you-know-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L9 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L10 reply/answer/scene-talk/proud/6w2s [scene-talk.reply-answer.go-ahead-i-meant-every-word]; L11 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L12 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L13 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L14 reply/answer/scene-talk/calm/9w1s [scene-talk.reply-answer.i-d-tell-them-i-listened-and-i-still-disagree]; L15 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L16 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L17 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L18 reply/answer/scene-talk/proud/8w2s [scene-talk.reply-answer.yes-some-things-matter-more-than-one-election]; L19 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L20 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L21 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L22 reply/answer/scene-talk/braced/7w1s [scene-talk.reply-answer.read-the-bill-before-you-judge-it]; L23 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L24 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L25 follow/thank/scene-talk/calm/4w1s [scene-talk.follow-thank.thanks-for-your-time]</sub>

**Profile boastful** (outcome resolved)

**Michael Howell:** Do you have a moment for a couple of questions?

**Michael Howell:** Can you tell me how you'll vote on "Require photo id to vote"?

You could say:

1. I'm voting for it, and you can quote me.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. No comment.
4. You've got that wrong, and you know it.
5. I've always supported it.

**Michael Howell:** Can I quote you on that?

You could say:

1. You can quote me.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. No comment.

**Michael Howell:** What do you say to people who disagree?

You could say:

1. I'd tell them I listened, and I still disagree.  *(the page follows this one)*
2. I'm still reading it.
3. No comment.

**Michael Howell:** Even if it costs you votes?

You could say:

1. Yes. Some things matter more than one election.  *(the page follows this one)*
2. I'm still reading it.
3. I'm not going to talk about that.

**Michael Howell:** What do you say to people who disagree?

You could say:

1. Read the bill before you judge it.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**Michael Howell:** Thanks for your time.

<sub>L1 narrate/narrate/scene-talk/guarded/12w1s [scene-talk.narrate-narrate.name-a-reporter-for-outlet-catches-you-on-your-way-out]; L2 open/greet/scene-talk/calm/10w1s [scene-talk.open-greet.do-you-have-a-moment-for-a-couple-of-questions]; L3 state/ask/scene-talk/curious/13w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/proud/9w1s [scene-talk.reply-answer.i-m-voting-for-it-and-you-can-quote-me]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-ve-got-that-wrong-and-you-know-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L9 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L10 reply/answer/scene-talk/calm/4w1s [scene-talk.reply-answer.you-can-quote-me]; L11 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L12 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L13 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L14 reply/answer/scene-talk/calm/9w1s [scene-talk.reply-answer.i-d-tell-them-i-listened-and-i-still-disagree]; L15 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L16 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L17 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L18 reply/answer/scene-talk/proud/8w2s [scene-talk.reply-answer.yes-some-things-matter-more-than-one-election]; L19 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L20 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L21 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L22 reply/answer/scene-talk/braced/7w1s [scene-talk.reply-answer.read-the-bill-before-you-judge-it]; L23 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L24 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L25 follow/thank/scene-talk/calm/4w1s [scene-talk.follow-thank.thanks-for-your-time]</sub>

## Scene 2: press-interview (routine, ends in political) — proof scene

*Purpose press-comment. Records: interview:outlet:cable:1:national:filing:contest:seat:gus2025:101811:sheriff:0:2026-11-03:person_f9be8ef45e5d143f:2026-11-02:0, outlet:cable:1:national, person:press:outlet:cable:1:national:reporter:0, person_f9be8ef45e5d143f.*

> You arrive for the interview Mark Wood asked for. Mark Wood covers the council for Beacon News Network.

**Profile warm** (outcome refused)

**Mark Wood:** Do you have a moment for a couple of questions?

**Mark Wood:** Where do you stand on "Clean electricity standard"?

You could say:

1. I'm voting no, and I'll tell you why.
2. I'll have something to say after the vote.
3. I'm not going to talk about that.  *(the page follows this one)*
4. You've got that wrong, and you know it.
5. I've always supported it.

**Mark Wood:** Voters will want to know where you stand.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. No comment.  *(the page follows this one)*
3. I'm still reading it.

**Mark Wood:** You'll be in the story either way.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. I'm not going to talk about that.  *(the page follows this one)*
3. I'm still reading it.

**Mark Wood:** You'll be in the story either way.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. I'm not going to talk about that.  *(the page follows this one)*
3. I'm still reading it.

**Mark Wood:** Voters will want to know where you stand.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. I'm not going to talk about that.  *(the page follows this one)*
3. I'll have something to say after the vote.

**Mark Wood:** You'll be in the story either way.

**Mark Wood:** I'll be at the next meeting.

**The whole exchange** (62 nodes; endings: refused, open, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- You: I'm voting no, and I'll tell you why.
  - Mark Wood: What do you say to people who disagree?
  - You: Read the bill before you judge it.
    - Mark Wood: Can I quote you on that?
    - You: Go ahead. I meant every word.
      - Mark Wood: Even if it costs you votes?
      - You: Yes. Some things matter more than one election.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
  - You: I'm still reading it.
    - Mark Wood: You'll be in the story either way.
    - You: Then put this in the story: I'm proud of my vote.
      - Mark Wood: Can I quote you on that?
      - You: You can quote me.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: No comment.
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
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
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
  - You: I'm not going to talk about that.
    - Mark Wood: You'll be in the story either way.
    - You: Then put this in the story: I'm proud of my vote.
      - Mark Wood: Even if it costs you votes?
      - You: Yes. Some things matter more than one election.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
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
    - Mark Wood: What do you say to people who disagree?
    - You: Read the bill before you judge it.
      - Mark Wood: Even if it costs you votes?
      - You: Even then. It's the right call.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'm still reading it.
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
  - You: I'm not going to talk about that.
    - Mark Wood: Voters will want to know where you stand.
    - You: Then put this in the story: I'm proud of my vote.
      - Mark Wood: Can I quote you on that?
      - You: You can quote me.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
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
  - You: I'm still reading it.
    - Mark Wood: Voters will want to know where you stand.
    - You: Then put this in the story: I'm proud of my vote.
      - Mark Wood: Even if it costs you votes?
      - You: Even then. It's the right call.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - Mark Wood: Voters will want to know where you stand.
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
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
- You ★: I'm not going to talk about that.
  - Mark Wood: Voters will want to know where you stand.
  - You: Then put this in the story: I'm proud of my vote.
    - Mark Wood: What do you say to people who disagree?
    - You: Read the bill before you judge it.
      - Mark Wood: Even if it costs you votes?
      - You: Even then. It's the right call.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: I'm still reading it.
      - Mark Wood: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: No comment.
      - Mark Wood: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
  - You ★: No comment.
    - Mark Wood: You'll be in the story either way.
    - You: Then put this in the story: I'm proud of my vote.
      - Mark Wood: Even if it costs you votes?
      - You: Yes. Some things matter more than one election.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You ★: I'm not going to talk about that.
      - Mark Wood: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You ★: I'm not going to talk about that.
        - Mark Wood: Voters will want to know where you stand.
        - You: Then put this in the story: I'm proud of my vote.
          - (the tree is cut here)
        - You ★: I'm not going to talk about that.
          - Mark Wood: You'll be in the story either way.
          - *Ends refused: Mark Wood: I'll be at the next meeting.*
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: I'm still reading it.
      - Mark Wood: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
  - You: I'm still reading it.
    - Mark Wood: You'll be in the story either way.
    - You: Then put this in the story: I'm proud of my vote.
      - Mark Wood: What do you say to people who disagree?
      - You: I'd tell them I listened, and I still disagree.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - Mark Wood: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
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
- You: You've got that wrong, and you know it.
  - Mark Wood: We have it on the record. I'm just giving you a chance to respond.
  - You: Then let me answer it on the record.
    - Mark Wood: Can I quote you on that?
    - You: Go ahead. I meant every word.
      - Mark Wood: What do you say to people who disagree?
      - You: Read the bill before you judge it.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
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
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
  - You: I'm not going to talk about that.
    - Mark Wood: You'll be in the story either way.
    - You: Then put this in the story: I'm proud of my vote.
      - Mark Wood: Even if it costs you votes?
      - You: Yes. Some things matter more than one election.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
  - You: Why are you asking me before the vote?
    - Mark Wood: Because your vote may decide it, and voters want to know.
    - You: I'm voting for it, and you can quote me.
      - Mark Wood: Even if it costs you votes?
      - You: Yes. Some things matter more than one election.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - Mark Wood: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: Why are you asking me before the vote?
      - Mark Wood: Because your vote may decide it, and voters want to know.
      - You: I'm voting for it, and you can quote me.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: You've got that wrong, and you know it.
        - (the tree is cut here)
- You: I've always supported it.
  - *if Mark Wood knows:*
    - Mark Wood: You voted against it last year. It's in the record.
    - You: You're right. I shouldn't have said that.
      - Mark Wood: Thank you for telling me straight.
      - *Ends open*
    - You: People say a lot of things.
      - Mark Wood: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - *Ends resolved*
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: Then Amanda Nixon has it wrong.
      - *Ends open: Mark Wood: The story runs either way.*
  - *if not:*
    - Mark Wood: Then I'll write that you declined to comment.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.you-arrive-for-the-interview-name-asked-for-name-covers-the-council-fo]; L2 open/greet/scene-talk/calm/10w1s [scene-talk.open-greet.do-you-have-a-moment-for-a-couple-of-questions]; L3 state/ask/scene-talk/curious/8w1s [scene-talk.state-ask.where-do-you-stand-on-bill]; L4 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-ve-got-that-wrong-and-you-know-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L113 follow/press/scene-talk/braced/8w1s [scene-talk.follow-press.voters-will-want-to-know-where-you-stand]; L114 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L115 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L116 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L133 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.you-ll-be-in-the-story-either-way]; L134 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L135 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L136 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L141 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.you-ll-be-in-the-story-either-way]; L142 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L143 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L144 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L145 follow/press/scene-talk/braced/8w1s [scene-talk.follow-press.voters-will-want-to-know-where-you-stand]; L146 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L147 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L148 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L149 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.you-ll-be-in-the-story-either-way]; L150 close/warn/scene-talk/guarded/6w1s [scene-talk.close-warn.i-ll-be-at-the-next-meeting]</sub>

**Profile cold** (outcome refused)

**Mark Wood:** Do you have a moment for a couple of questions?

**Mark Wood:** Where do you stand on "Clean electricity standard"?

You could say:

1. I'm voting no, and I'll tell you why.
2. I'll have something to say after the vote.
3. No comment.  *(the page follows this one)*
4. You've got that wrong, and you know it.
5. I've always supported it.

**Mark Wood:** You'll be in the story either way.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. I'm not going to talk about that.  *(the page follows this one)*
3. I'm still reading it.

**Mark Wood:** Voters will want to know where you stand.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. No comment.  *(the page follows this one)*
3. I'll have something to say after the vote.

**Mark Wood:** You'll be in the story either way.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. No comment.  *(the page follows this one)*
3. I'll have something to say after the vote.

**Mark Wood:** You'll be in the story either way.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. No comment.  *(the page follows this one)*
3. I'll have something to say after the vote.

**Mark Wood:** Voters will want to know where you stand.

**Mark Wood:** I'll be at the next meeting.

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.you-arrive-for-the-interview-name-asked-for-name-covers-the-council-fo]; L2 open/greet/scene-talk/calm/10w1s [scene-talk.open-greet.do-you-have-a-moment-for-a-couple-of-questions]; L3 state/ask/scene-talk/curious/8w1s [scene-talk.state-ask.where-do-you-stand-on-bill]; L4 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-ve-got-that-wrong-and-you-know-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L113 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.you-ll-be-in-the-story-either-way]; L114 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L115 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L116 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L133 follow/press/scene-talk/braced/8w1s [scene-talk.follow-press.voters-will-want-to-know-where-you-stand]; L134 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L135 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L136 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L141 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.you-ll-be-in-the-story-either-way]; L142 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L143 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L144 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L145 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.you-ll-be-in-the-story-either-way]; L146 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L147 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L148 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L149 follow/press/scene-talk/braced/8w1s [scene-talk.follow-press.voters-will-want-to-know-where-you-stand]; L150 close/warn/scene-talk/guarded/6w1s [scene-talk.close-warn.i-ll-be-at-the-next-meeting]</sub>

**Profile stubborn** (outcome refused)

**Mark Wood:** Do you have a moment for a couple of questions?

**Mark Wood:** Where do you stand on "Clean electricity standard"?

You could say:

1. I'm voting no, and I'll tell you why.
2. I'll have something to say after the vote.
3. I'm not going to talk about that.  *(the page follows this one)*
4. You've got that wrong, and you know it.
5. I never said that.

**Mark Wood:** Voters will want to know where you stand.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. No comment.  *(the page follows this one)*
3. I'm still reading it.

**Mark Wood:** You'll be in the story either way.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. No comment.  *(the page follows this one)*
3. I'll have something to say after the vote.

**Mark Wood:** Voters will want to know where you stand.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. No comment.  *(the page follows this one)*
3. I'm still reading it.

**Mark Wood:** You'll be in the story either way.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. No comment.  *(the page follows this one)*
3. I'm still reading it.

**Mark Wood:** Voters will want to know where you stand.

**Mark Wood:** I'll be at the next meeting.

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.you-arrive-for-the-interview-name-asked-for-name-covers-the-council-fo]; L2 open/greet/scene-talk/calm/10w1s [scene-talk.open-greet.do-you-have-a-moment-for-a-couple-of-questions]; L3 state/ask/scene-talk/curious/8w1s [scene-talk.state-ask.where-do-you-stand-on-bill]; L4 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-ve-got-that-wrong-and-you-know-it]; L8 reply/lie/scene-talk/guarded/4w1s [scene-talk.reply-lie.i-never-said-that]; L113 follow/press/scene-talk/braced/8w1s [scene-talk.follow-press.voters-will-want-to-know-where-you-stand]; L114 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L115 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L116 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L133 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.you-ll-be-in-the-story-either-way]; L134 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L135 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L136 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L141 follow/press/scene-talk/braced/8w1s [scene-talk.follow-press.voters-will-want-to-know-where-you-stand]; L142 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L143 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L144 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L145 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.you-ll-be-in-the-story-either-way]; L146 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L147 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L148 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L149 follow/press/scene-talk/braced/8w1s [scene-talk.follow-press.voters-will-want-to-know-where-you-stand]; L150 close/warn/scene-talk/guarded/6w1s [scene-talk.close-warn.i-ll-be-at-the-next-meeting]</sub>

**Profile anxious** (outcome refused)

**Mark Wood:** Do you have a moment for a couple of questions?

**Mark Wood:** Where do you stand on "Clean electricity standard"?

You could say:

1. I'm voting no, and I'll tell you why.
2. I'm still reading it.
3. No comment.  *(the page follows this one)*
4. You've got that wrong, and you know it.
5. I never said that.

**Mark Wood:** Voters will want to know where you stand.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. I'm not going to talk about that.  *(the page follows this one)*
3. I'll have something to say after the vote.

**Mark Wood:** You'll be in the story either way.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. I'm not going to talk about that.  *(the page follows this one)*
3. I'm still reading it.

**Mark Wood:** You'll be in the story either way.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. No comment.  *(the page follows this one)*
3. I'm still reading it.

**Mark Wood:** Voters will want to know where you stand.

You could say:

1. Then put this in the story: I'm proud of my vote.
2. No comment.  *(the page follows this one)*
3. I'm still reading it.

**Mark Wood:** You'll be in the story either way.

**Mark Wood:** I'll be at the next meeting.

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.you-arrive-for-the-interview-name-asked-for-name-covers-the-council-fo]; L2 open/greet/scene-talk/calm/10w1s [scene-talk.open-greet.do-you-have-a-moment-for-a-couple-of-questions]; L3 state/ask/scene-talk/curious/8w1s [scene-talk.state-ask.where-do-you-stand-on-bill]; L4 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L5 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-ve-got-that-wrong-and-you-know-it]; L8 reply/lie/scene-talk/guarded/4w1s [scene-talk.reply-lie.i-never-said-that]; L113 follow/press/scene-talk/braced/8w1s [scene-talk.follow-press.voters-will-want-to-know-where-you-stand]; L114 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L115 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L116 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L133 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.you-ll-be-in-the-story-either-way]; L134 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L135 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L136 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L141 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.you-ll-be-in-the-story-either-way]; L142 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L143 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L144 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L145 follow/press/scene-talk/braced/8w1s [scene-talk.follow-press.voters-will-want-to-know-where-you-stand]; L146 reply/answer/scene-talk/proud/11w1s [scene-talk.reply-answer.then-put-this-in-the-story-i-m-proud-of-my-vote]; L147 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L148 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L149 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.you-ll-be-in-the-story-either-way]; L150 close/warn/scene-talk/guarded/6w1s [scene-talk.close-warn.i-ll-be-at-the-next-meeting]</sub>

## Scene 3: press-interview (routine, ends in political) — proof scene

*Purpose press-comment. Records: interview:outlet:cable:0:national:filing:contest:seat:gus2025:101811:treasurer:0:2026-11-03:person_6863e973f50172f8:2026-10-26:0, outlet:cable:0:national, person:press:outlet:cable:0:national:reporter:0, person_6863e973f50172f8.*

> There's a knock at your door. It's William Neal, a reporter for Pinnacle News Network.

**Profile warm** (outcome resolved)

**William Neal:** Mind if I ask you a few things?

**William Neal:** Can you tell me how you'll vote on "Stand your ground"?

You could say:

1. I'm voting for it, and you can quote me.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. No comment.
4. You've got that wrong, and you know it.
5. I've always supported it.

**William Neal:** Can I quote you on that?

You could say:

1. You can quote me.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**William Neal:** Even if it costs you votes?

You could say:

1. Yes. Some things matter more than one election.  *(the page follows this one)*
2. I'm still reading it.
3. No comment.

**William Neal:** What do you say to people who disagree?

You could say:

1. I'd tell them I listened, and I still disagree.  *(the page follows this one)*
2. I'm still reading it.
3. I'm not going to talk about that.

**William Neal:** What do you say to people who disagree?

You could say:

1. Read the bill before you judge it.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. No comment.

**William Neal:** Thanks for your time.

**The whole exchange** (62 nodes; endings: resolved, open, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- You ★: I'm voting for it, and you can quote me.
  - William Neal: Can I quote you on that?
  - You ★: You can quote me.
    - William Neal: Even if it costs you votes?
    - You ★: Yes. Some things matter more than one election.
      - William Neal: What do you say to people who disagree?
      - You ★: I'd tell them I listened, and I still disagree.
        - William Neal: What do you say to people who disagree?
        - You ★: Read the bill before you judge it.
          - William Neal: Thanks for your time.
          - *Ends resolved*
        - You: I'll have something to say after the vote.
          - (the tree is cut here)
        - You: No comment.
          - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'm still reading it.
      - William Neal: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: No comment.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
  - You: I'll have something to say after the vote.
    - William Neal: Voters will want to know where you stand.
    - You: Then put this in the story: I'm proud of my vote.
      - William Neal: Even if it costs you votes?
      - You: Even then. It's the right call.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
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
      - You: I'm still reading it.
        - (the tree is cut here)
  - You: I'm not going to talk about that.
    - William Neal: Voters will want to know where you stand.
    - You: Then put this in the story: I'm proud of my vote.
      - William Neal: What do you say to people who disagree?
      - You: I'd tell them I listened, and I still disagree.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
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
    - William Neal: What do you say to people who disagree?
    - You: I'd tell them I listened, and I still disagree.
      - William Neal: Even if it costs you votes?
      - You: Yes. Some things matter more than one election.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'm still reading it.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
  - You: I'm not going to talk about that.
    - William Neal: You'll be in the story either way.
    - You: Then put this in the story: I'm proud of my vote.
      - William Neal: Even if it costs you votes?
      - You: Yes. Some things matter more than one election.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: I'm still reading it.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
  - You: I'm still reading it.
    - William Neal: You'll be in the story either way.
    - You: Then put this in the story: I'm proud of my vote.
      - William Neal: What do you say to people who disagree?
      - You: I'd tell them I listened, and I still disagree.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - William Neal: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: I'm still reading it.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
- You: No comment.
  - William Neal: Voters will want to know where you stand.
  - You: Then put this in the story: I'm proud of my vote.
    - William Neal: What do you say to people who disagree?
    - You: I'd tell them I listened, and I still disagree.
      - William Neal: Can I quote you on that?
      - You: Go ahead. I meant every word.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
  - You: I'm not going to talk about that.
    - William Neal: You'll be in the story either way.
    - You: Then put this in the story: I'm proud of my vote.
      - William Neal: Can I quote you on that?
      - You: You can quote me.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - William Neal: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
  - You: I'm still reading it.
    - William Neal: You'll be in the story either way.
    - You: Then put this in the story: I'm proud of my vote.
      - William Neal: Even if it costs you votes?
      - You: Yes. Some things matter more than one election.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - William Neal: Voters will want to know where you stand.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
- You: You've got that wrong, and you know it.
  - William Neal: We have it on the record. I'm just giving you a chance to respond.
  - You: Then let me answer it on the record.
    - William Neal: Even if it costs you votes?
    - You: Yes. Some things matter more than one election.
      - William Neal: What do you say to people who disagree?
      - You: I'd tell them I listened, and I still disagree.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: I'll have something to say after the vote.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: I'm not going to talk about that.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
  - You: I'm not going to talk about that.
    - William Neal: Voters will want to know where you stand.
    - You: Then put this in the story: I'm proud of my vote.
      - William Neal: Even if it costs you votes?
      - You: Even then. It's the right call.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
    - You: No comment.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
    - You: I'm still reading it.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: No comment.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
  - You: Why are you asking me before the vote?
    - William Neal: Because your vote may decide it, and voters want to know.
    - You: I'm voting for it, and you can quote me.
      - William Neal: What do you say to people who disagree?
      - You: I'd tell them I listened, and I still disagree.
        - (the tree is cut here)
      - You: I'll have something to say after the vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
    - You: No comment.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: You've got that wrong, and you know it.
      - William Neal: We have it on the record. I'm just giving you a chance to respond.
      - You: Then let me answer it on the record.
        - (the tree is cut here)
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: You've got that wrong, and you know it.
        - (the tree is cut here)
- You: I've always supported it.
  - *if William Neal knows:*
    - William Neal: Amanda Nixon has you on tape saying it.
    - You: You're right. I shouldn't have said that.
      - William Neal: Thank you for telling me straight.
      - *Ends open*
    - You: People say a lot of things.
      - William Neal: You'll be in the story either way.
      - You: Then put this in the story: I'm proud of my vote.
        - *Ends resolved*
      - You: I'm not going to talk about that.
        - (the tree is cut here)
      - You: I'm still reading it.
        - (the tree is cut here)
    - You: Then Amanda Nixon has it wrong.
      - *Ends open: William Neal: I'll be at the next meeting.*
  - *if not:*
    - William Neal: Then I'll put that in the story.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/guarded/15w2s [scene-talk.narrate-narrate.there-s-a-knock-at-your-door-it-s-name-a-reporter-for-outlet]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/11w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/proud/9w1s [scene-talk.reply-answer.i-m-voting-for-it-and-you-can-quote-me]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-ve-got-that-wrong-and-you-know-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L9 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L10 reply/answer/scene-talk/calm/4w1s [scene-talk.reply-answer.you-can-quote-me]; L11 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L12 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L13 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L14 reply/answer/scene-talk/proud/8w2s [scene-talk.reply-answer.yes-some-things-matter-more-than-one-election]; L15 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L16 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L17 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L18 reply/answer/scene-talk/calm/9w1s [scene-talk.reply-answer.i-d-tell-them-i-listened-and-i-still-disagree]; L19 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L20 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L21 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L22 reply/answer/scene-talk/braced/7w1s [scene-talk.reply-answer.read-the-bill-before-you-judge-it]; L23 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L24 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L25 follow/thank/scene-talk/calm/4w1s [scene-talk.follow-thank.thanks-for-your-time]</sub>

**Profile cold** (outcome resolved)

**William Neal:** Mind if I ask you a few things?

**William Neal:** Can you tell me how you'll vote on "Stand your ground"?

You could say:

1. I'm voting no, and I'll tell you why.  *(the page follows this one)*
2. I'm still reading it.
3. I'm not going to talk about that.
4. You've got that wrong, and you know it.
5. I never said that.

**William Neal:** What do you say to people who disagree?

You could say:

1. Read the bill before you judge it.  *(the page follows this one)*
2. I'm still reading it.
3. No comment.

**William Neal:** Can I quote you on that?

You could say:

1. You can quote me.  *(the page follows this one)*
2. I'm still reading it.
3. No comment.

**William Neal:** Even if it costs you votes?

You could say:

1. Even then. It's the right call.  *(the page follows this one)*
2. I'm still reading it.
3. No comment.

**William Neal:** Can I quote you on that?

You could say:

1. Go ahead. I meant every word.  *(the page follows this one)*
2. I'm still reading it.
3. I'm not going to talk about that.

**William Neal:** Thanks for your time.

<sub>L1 narrate/narrate/scene-talk/guarded/15w2s [scene-talk.narrate-narrate.there-s-a-knock-at-your-door-it-s-name-a-reporter-for-outlet]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/11w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L5 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-ve-got-that-wrong-and-you-know-it]; L8 reply/lie/scene-talk/guarded/4w1s [scene-talk.reply-lie.i-never-said-that]; L9 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L10 reply/answer/scene-talk/braced/7w1s [scene-talk.reply-answer.read-the-bill-before-you-judge-it]; L11 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L12 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L13 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L14 reply/answer/scene-talk/calm/4w1s [scene-talk.reply-answer.you-can-quote-me]; L15 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L16 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L17 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L18 reply/answer/scene-talk/calm/6w2s [scene-talk.reply-answer.even-then-it-s-the-right-call]; L19 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L20 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L21 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L22 reply/answer/scene-talk/proud/6w2s [scene-talk.reply-answer.go-ahead-i-meant-every-word]; L23 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L24 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L25 follow/thank/scene-talk/calm/4w1s [scene-talk.follow-thank.thanks-for-your-time]</sub>

**Profile stubborn** (outcome resolved)

**William Neal:** Mind if I ask you a few things?

**William Neal:** Can you tell me how you'll vote on "Stand your ground"?

You could say:

1. I'm voting no, and I'll tell you why.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. I'm not going to talk about that.
4. Why are you asking me before the vote?
5. I've always supported it.

**William Neal:** Can I quote you on that?

You could say:

1. Go ahead. I meant every word.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. No comment.

**William Neal:** What do you say to people who disagree?

You could say:

1. Read the bill before you judge it.  *(the page follows this one)*
2. I'm still reading it.
3. I'm not going to talk about that.

**William Neal:** Even if it costs you votes?

You could say:

1. Even then. It's the right call.  *(the page follows this one)*
2. I'm still reading it.
3. No comment.

**William Neal:** Even if it costs you votes?

You could say:

1. Yes. Some things matter more than one election.  *(the page follows this one)*
2. I'm still reading it.
3. I'm not going to talk about that.

**William Neal:** That's all I needed. Thanks.

<sub>L1 narrate/narrate/scene-talk/guarded/15w2s [scene-talk.narrate-narrate.there-s-a-knock-at-your-door-it-s-name-a-reporter-for-outlet]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/11w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/braced/8w1s [scene-talk.reply-answer.i-m-voting-no-and-i-ll-tell-you-why]; L5 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L7 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.why-are-you-asking-me-before-the-vote]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L9 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L10 reply/answer/scene-talk/proud/6w2s [scene-talk.reply-answer.go-ahead-i-meant-every-word]; L11 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L12 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L13 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L14 reply/answer/scene-talk/braced/7w1s [scene-talk.reply-answer.read-the-bill-before-you-judge-it]; L15 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L16 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L17 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L18 reply/answer/scene-talk/calm/6w2s [scene-talk.reply-answer.even-then-it-s-the-right-call]; L19 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L20 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L21 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L22 reply/answer/scene-talk/proud/8w2s [scene-talk.reply-answer.yes-some-things-matter-more-than-one-election]; L23 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L24 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L25 follow/thank/scene-talk/calm/5w2s [scene-talk.follow-thank.that-s-all-i-needed-thanks]</sub>

**Profile anxious** (outcome resolved)

**William Neal:** Mind if I ask you a few things?

**William Neal:** Can you tell me how you'll vote on "Stand your ground"?

You could say:

1. I'm voting for it, and you can quote me.  *(the page follows this one)*
2. I'm still reading it.
3. No comment.
4. You've got that wrong, and you know it.
5. I never said that.

**William Neal:** Even if it costs you votes?

You could say:

1. Even then. It's the right call.  *(the page follows this one)*
2. I'm still reading it.
3. No comment.

**William Neal:** What do you say to people who disagree?

You could say:

1. Read the bill before you judge it.  *(the page follows this one)*
2. I'm still reading it.
3. No comment.

**William Neal:** Can I quote you on that?

You could say:

1. Go ahead. I meant every word.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. No comment.

**William Neal:** Can I quote you on that?

You could say:

1. You can quote me.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**William Neal:** That's all I needed. Thanks.

<sub>L1 narrate/narrate/scene-talk/guarded/15w2s [scene-talk.narrate-narrate.there-s-a-knock-at-your-door-it-s-name-a-reporter-for-outlet]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/11w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/proud/9w1s [scene-talk.reply-answer.i-m-voting-for-it-and-you-can-quote-me]; L5 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-ve-got-that-wrong-and-you-know-it]; L8 reply/lie/scene-talk/guarded/4w1s [scene-talk.reply-lie.i-never-said-that]; L9 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L10 reply/answer/scene-talk/calm/6w2s [scene-talk.reply-answer.even-then-it-s-the-right-call]; L11 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L12 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L13 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L14 reply/answer/scene-talk/braced/7w1s [scene-talk.reply-answer.read-the-bill-before-you-judge-it]; L15 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L16 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L17 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L18 reply/answer/scene-talk/proud/6w2s [scene-talk.reply-answer.go-ahead-i-meant-every-word]; L19 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L20 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L21 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L22 reply/answer/scene-talk/calm/4w1s [scene-talk.reply-answer.you-can-quote-me]; L23 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L24 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L25 follow/thank/scene-talk/calm/5w2s [scene-talk.follow-thank.that-s-all-i-needed-thanks]</sub>

**Profile boastful** (outcome resolved)

**William Neal:** Mind if I ask you a few things?

**William Neal:** Can you tell me how you'll vote on "Stand your ground"?

You could say:

1. I'm voting for it, and you can quote me.  *(the page follows this one)*
2. I'm still reading it.
3. No comment.
4. You've got that wrong, and you know it.
5. I've always supported it.

**William Neal:** Even if it costs you votes?

You could say:

1. Yes. Some things matter more than one election.  *(the page follows this one)*
2. I'm still reading it.
3. No comment.

**William Neal:** What do you say to people who disagree?

You could say:

1. I'd tell them I listened, and I still disagree.  *(the page follows this one)*
2. I'm still reading it.
3. No comment.

**William Neal:** Can I quote you on that?

You could say:

1. Go ahead. I meant every word.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. No comment.

**William Neal:** Can I quote you on that?

You could say:

1. You can quote me.  *(the page follows this one)*
2. I'll have something to say after the vote.
3. I'm not going to talk about that.

**William Neal:** Thanks for your time.

<sub>L1 narrate/narrate/scene-talk/guarded/15w2s [scene-talk.narrate-narrate.there-s-a-knock-at-your-door-it-s-name-a-reporter-for-outlet]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/11w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/proud/9w1s [scene-talk.reply-answer.i-m-voting-for-it-and-you-can-quote-me]; L5 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L6 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L7 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-ve-got-that-wrong-and-you-know-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L9 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L10 reply/answer/scene-talk/proud/8w2s [scene-talk.reply-answer.yes-some-things-matter-more-than-one-election]; L11 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L12 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L13 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L14 reply/answer/scene-talk/calm/9w1s [scene-talk.reply-answer.i-d-tell-them-i-listened-and-i-still-disagree]; L15 reply/deflect/scene-talk/guarded/4w1s [scene-talk.reply-deflect.i-m-still-reading-it]; L16 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L17 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L18 reply/answer/scene-talk/proud/6w2s [scene-talk.reply-answer.go-ahead-i-meant-every-word]; L19 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L20 reply/refuse/scene-talk/guarded/2w1s [scene-talk.reply-refuse.no-comment]; L21 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L22 reply/answer/scene-talk/calm/4w1s [scene-talk.reply-answer.you-can-quote-me]; L23 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-ll-have-something-to-say-after-the-vote]; L24 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-going-to-talk-about-that]; L25 follow/thank/scene-talk/calm/4w1s [scene-talk.follow-thank.thanks-for-your-time]</sub>

## Scene 4: campaign-stop (vote-wanted, ends in political) — proof scene

*Purpose rally-volunteer. Records: filing:contest:seat:gus2025:101811:treasurer:0:2026-11-03:person_6863e973f50172f8, person_565365c9720b4032, person_6863e973f50172f8.*

> Your volunteers are packing up the campaign signs. Emily Villanueva catches you before you leave.

**Profile warm** (outcome resolved)

**Emily Villanueva:** Great rally.

**Emily Villanueva:** Where do you want us this weekend?

You could say:

1. I'll come by the office tomorrow and thank everyone.
2. More people knocking on doors. Bring a friend next time.
3. Honestly? More of what you're already doing.  *(the page follows this one)*
4. Let's talk about it at the office.

**Emily Villanueva:** So what's next?

You could say:

1. More people knocking on doors. Bring a friend next time.
2. I'll come by the office tomorrow and thank everyone.  *(the page follows this one)*

**Emily Villanueva:** We'll be there.

**The whole exchange** (9 nodes; endings: resolved, open, open, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- You: I'll come by the office tomorrow and thank everyone.
  - Emily Villanueva: We'll be there.
  - *Ends resolved*
- You: More people knocking on doors. Bring a friend next time.
  - Emily Villanueva: You've got it. We'll bring more people Saturday.
  - *Ends open: Emily Villanueva: We'll be ready Saturday.*
- You ★: Honestly? More of what you're already doing.
  - Emily Villanueva: So what's next?
  - You: More people knocking on doors. Bring a friend next time.
    - Emily Villanueva: You've got it. We'll bring more people Saturday.
    - *Ends open: Emily Villanueva: We'll be ready Saturday.*
  - You ★: I'll come by the office tomorrow and thank everyone.
    - Emily Villanueva: We'll be there.
    - *Ends resolved*
- You: Let's talk about it at the office.
  - Emily Villanueva: We need something before Saturday.
  - You: Get me more volunteers for door knocking.
    - Emily Villanueva: You've got it. We'll bring more people Saturday.
    - *Ends open: Emily Villanueva: We'll be ready Saturday.*
  - You: I'll come by the office tomorrow and thank everyone.
    - Emily Villanueva: We'll be there.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/glad/15w2s [scene-talk.narrate-narrate.your-volunteers-are-packing-up-the-campaign-signs-name-catches-you-bef]; L2 open/greet/scene-talk/glad/2w1s [scene-talk.open-greet.great-rally]; L3 state/request/scene-talk/eager/7w1s [scene-talk.state-request.where-do-you-want-us-this-weekend]; L4 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L5 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L6 reply/thank/scene-talk/tender/7w2s [scene-talk.reply-thank.honestly-more-of-what-you-re-already-doing]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L11 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L12 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L13 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L16 follow/thank/scene-talk/glad/3w1s [scene-talk.follow-thank.we-ll-be-there]</sub>

**Profile cold** (outcome resolved)

**Emily Villanueva:** They loved you up there.

**Emily Villanueva:** Where do you want us this weekend?

You could say:

1. I'll go door knocking with you this weekend.
2. More people knocking on doors. Bring a friend next time.
3. Just keep showing up. Thank you, all of you.  *(the page follows this one)*
4. Let's talk about it at the office.

**Emily Villanueva:** So what's next?

You could say:

1. Keep them coming back. That's all I need.
2. I'll go door knocking with you this weekend.  *(the page follows this one)*

**Emily Villanueva:** We'll be there.

<sub>L1 narrate/narrate/scene-talk/glad/15w2s [scene-talk.narrate-narrate.your-volunteers-are-packing-up-the-campaign-signs-name-catches-you-bef]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/7w1s [scene-talk.state-request.where-do-you-want-us-this-weekend]; L4 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L5 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L11 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L12 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L13 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L16 follow/thank/scene-talk/glad/3w1s [scene-talk.follow-thank.we-ll-be-there]</sub>

**Profile stubborn** (outcome resolved)

**Emily Villanueva:** They loved you up there.

**Emily Villanueva:** Where do you want us this weekend?

You could say:

1. I'll go door knocking with you this weekend.
2. Keep them coming back. That's all I need.
3. Honestly? More of what you're already doing.  *(the page follows this one)*
4. Let's talk about it at the office.

**Emily Villanueva:** So what's next?

You could say:

1. More people knocking on doors. Bring a friend next time.
2. I'll go door knocking with you this weekend.  *(the page follows this one)*

**Emily Villanueva:** We'll be there.

<sub>L1 narrate/narrate/scene-talk/glad/15w2s [scene-talk.narrate-narrate.your-volunteers-are-packing-up-the-campaign-signs-name-catches-you-bef]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/7w1s [scene-talk.state-request.where-do-you-want-us-this-weekend]; L4 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L5 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L6 reply/thank/scene-talk/tender/7w2s [scene-talk.reply-thank.honestly-more-of-what-you-re-already-doing]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L11 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L12 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L13 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L16 follow/thank/scene-talk/glad/3w1s [scene-talk.follow-thank.we-ll-be-there]</sub>

**Profile anxious** (outcome resolved)

**Emily Villanueva:** They loved you up there.

**Emily Villanueva:** Where do you want us this weekend?

You could say:

1. I'll come by the office tomorrow and thank everyone.
2. Keep them coming back. That's all I need.
3. Just keep showing up. Thank you, all of you.  *(the page follows this one)*
4. Let's talk about it at the office.

**Emily Villanueva:** So what's next?

You could say:

1. More people knocking on doors. Bring a friend next time.
2. I'll come by the office tomorrow and thank everyone.  *(the page follows this one)*

**Emily Villanueva:** We'll be there.

<sub>L1 narrate/narrate/scene-talk/glad/15w2s [scene-talk.narrate-narrate.your-volunteers-are-packing-up-the-campaign-signs-name-catches-you-bef]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/7w1s [scene-talk.state-request.where-do-you-want-us-this-weekend]; L4 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L5 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L11 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L12 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L13 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L16 follow/thank/scene-talk/glad/3w1s [scene-talk.follow-thank.we-ll-be-there]</sub>

**Profile boastful** (outcome open)

**Emily Villanueva:** Great rally.

**Emily Villanueva:** Where do you want us this weekend?

You could say:

1. I'll go door knocking with you this weekend.
2. Get me more volunteers for door knocking.
3. Just keep showing up. Thank you, all of you.  *(the page follows this one)*
4. Let's talk about it at the office.

**Emily Villanueva:** So what's next?

You could say:

1. Keep them coming back. That's all I need.  *(the page follows this one)*
2. I'll go door knocking with you this weekend.

**Emily Villanueva:** You've got it. We'll bring more people Saturday.

**Emily Villanueva:** We'll be ready Saturday.

<sub>L1 narrate/narrate/scene-talk/glad/15w2s [scene-talk.narrate-narrate.your-volunteers-are-packing-up-the-campaign-signs-name-catches-you-bef]; L2 open/greet/scene-talk/glad/2w1s [scene-talk.open-greet.great-rally]; L3 state/request/scene-talk/eager/7w1s [scene-talk.state-request.where-do-you-want-us-this-weekend]; L4 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L5 reply/request/scene-talk/eager/7w1s [scene-talk.reply-request.get-me-more-volunteers-for-door-knocking]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L11 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L12 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L13 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L14 follow/promise/scene-talk/eager/8w2s [scene-talk.follow-promise.you-ve-got-it-we-ll-bring-more-people-saturday]; L15 close/press/scene-talk/eager/4w1s [scene-talk.close-press.we-ll-be-ready-saturday]</sub>

## Scene 5: campaign-stop (vote-wanted, ends in political) — proof scene

*Purpose rally-volunteer. Records: filing:contest:seat:gus2025:101811:sheriff:0:2026-11-03:person_f9be8ef45e5d143f, person_9c90c550f58e121a, person_f9be8ef45e5d143f.*

> The rally is over and the crowd is thinning out. Justin McCarthy, one of your volunteers, comes over.

**Profile warm** (outcome open)

**Justin McCarthy:** They loved you up there.

**Justin McCarthy:** What do you need from us this week?

You could say:

1. I'll go door knocking with you this weekend.
2. Get me more volunteers for door knocking.  *(the page follows this one)*
3. Honestly? More of what you're already doing.
4. Let's talk about it at the office.

**Justin McCarthy:** You've got it. We'll bring more people Saturday.

**Justin McCarthy:** We'll be ready Saturday.

**The whole exchange** (9 nodes; endings: resolved, open, open, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- You: I'll go door knocking with you this weekend.
  - Justin McCarthy: We'll be there.
  - *Ends resolved*
- You ★: Get me more volunteers for door knocking.
  - Justin McCarthy: You've got it. We'll bring more people Saturday.
  - *Ends open: Justin McCarthy: We'll be ready Saturday.*
- You: Honestly? More of what you're already doing.
  - Justin McCarthy: So what's next?
  - You: Keep them coming back. That's all I need.
    - Justin McCarthy: You've got it. We'll bring more people Saturday.
    - *Ends open: Justin McCarthy: We'll be ready Saturday.*
  - You: I'll go door knocking with you this weekend.
    - Justin McCarthy: You got it.
    - *Ends resolved*
- You: Let's talk about it at the office.
  - Justin McCarthy: We need something before Saturday.
  - You: Keep them coming back. That's all I need.
    - Justin McCarthy: You've got it. We'll bring more people Saturday.
    - *Ends open: Justin McCarthy: We'll be ready Saturday.*
  - You: I'll come by the office tomorrow and thank everyone.
    - Justin McCarthy: We'll be there.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/8w1s [scene-talk.state-request.what-do-you-need-from-us-this-week]; L4 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L5 reply/request/scene-talk/eager/7w1s [scene-talk.reply-request.get-me-more-volunteers-for-door-knocking]; L6 reply/thank/scene-talk/tender/7w2s [scene-talk.reply-thank.honestly-more-of-what-you-re-already-doing]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L9 follow/promise/scene-talk/eager/8w2s [scene-talk.follow-promise.you-ve-got-it-we-ll-bring-more-people-saturday]; L10 close/press/scene-talk/eager/4w1s [scene-talk.close-press.we-ll-be-ready-saturday]</sub>

**Profile cold** (outcome open)

**Justin McCarthy:** They loved you up there.

**Justin McCarthy:** What do you need from us this week?

You could say:

1. I'll come by the office tomorrow and thank everyone.
2. More people knocking on doors. Bring a friend next time.  *(the page follows this one)*
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
2. More people knocking on doors. Bring a friend next time.  *(the page follows this one)*
3. Honestly? More of what you're already doing.
4. Let's talk about it at the office.

**Justin McCarthy:** You've got it. We'll bring more people Saturday.

**Justin McCarthy:** We'll be ready Saturday.

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/8w1s [scene-talk.state-request.what-do-you-need-from-us-this-week]; L4 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L5 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L6 reply/thank/scene-talk/tender/7w2s [scene-talk.reply-thank.honestly-more-of-what-you-re-already-doing]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L9 follow/promise/scene-talk/eager/8w2s [scene-talk.follow-promise.you-ve-got-it-we-ll-bring-more-people-saturday]; L10 close/press/scene-talk/eager/4w1s [scene-talk.close-press.we-ll-be-ready-saturday]</sub>

## Scene 6: campaign-stop (vote-wanted, ends in political) — proof scene

*Purpose rally-volunteer. Records: filing:contest:seat:US-DE:us-house:00:2026-11-03:official:term:seat:US-DE:us-house:00:2026-10-12, person:press:outlet:television:1:jurisdiction_59500182da2857ae:reporter:0, official:term:seat:US-DE:us-house:00:2026-10-12.*

> The rally is over and the crowd is thinning out. Briana Ross, one of your volunteers, comes over.

**Profile warm** (outcome resolved)

**Briana Ross:** Great rally.

**Briana Ross:** Where do you want us this weekend?

You could say:

1. I'll come by the office tomorrow and thank everyone.
2. Keep them coming back. That's all I need.
3. Honestly? More of what you're already doing.  *(the page follows this one)*
4. Let's talk about it at the office.

**Briana Ross:** So what's next?

You could say:

1. More people knocking on doors. Bring a friend next time.
2. I'll come by the office tomorrow and thank everyone.  *(the page follows this one)*

**Briana Ross:** We'll be there.

**The whole exchange** (9 nodes; endings: resolved, open, open, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- You: I'll come by the office tomorrow and thank everyone.
  - Briana Ross: We'll be there.
  - *Ends resolved*
- You: Keep them coming back. That's all I need.
  - Briana Ross: You've got it. We'll bring more people Saturday.
  - *Ends open: Briana Ross: We'll be ready Saturday.*
- You ★: Honestly? More of what you're already doing.
  - Briana Ross: So what's next?
  - You: More people knocking on doors. Bring a friend next time.
    - Briana Ross: You've got it. We'll bring more people Saturday.
    - *Ends open: Briana Ross: We'll be ready Saturday.*
  - You ★: I'll come by the office tomorrow and thank everyone.
    - Briana Ross: We'll be there.
    - *Ends resolved*
- You: Let's talk about it at the office.
  - Briana Ross: We need something before Saturday.
  - You: More people knocking on doors. Bring a friend next time.
    - Briana Ross: You've got it. We'll bring more people Saturday.
    - *Ends open: Briana Ross: We'll be ready Saturday.*
  - You: I'll come by the office tomorrow and thank everyone.
    - Briana Ross: You got it.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/2w1s [scene-talk.open-greet.great-rally]; L3 state/request/scene-talk/eager/7w1s [scene-talk.state-request.where-do-you-want-us-this-weekend]; L4 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L5 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L6 reply/thank/scene-talk/tender/7w2s [scene-talk.reply-thank.honestly-more-of-what-you-re-already-doing]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L11 follow/ask/scene-talk/eager/3w1s [scene-talk.follow-ask.so-what-s-next]; L12 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L13 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L16 follow/thank/scene-talk/glad/3w1s [scene-talk.follow-thank.we-ll-be-there]</sub>

**Profile cold** (outcome resolved)

**Briana Ross:** They loved you up there.

**Briana Ross:** Where do you want us this weekend?

You could say:

1. I'll go door knocking with you this weekend.
2. Get me more volunteers for door knocking.
3. Just keep showing up. Thank you, all of you.
4. Let's talk about it at the office.  *(the page follows this one)*

**Briana Ross:** We need something before Saturday.

You could say:

1. More people knocking on doors. Bring a friend next time.
2. I'll go door knocking with you this weekend.  *(the page follows this one)*

**Briana Ross:** We'll be there.

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/5w1s [scene-talk.open-greet.they-loved-you-up-there]; L3 state/request/scene-talk/eager/7w1s [scene-talk.state-request.where-do-you-want-us-this-weekend]; L4 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L5 reply/request/scene-talk/eager/7w1s [scene-talk.reply-request.get-me-more-volunteers-for-door-knocking]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L17 follow/press/scene-talk/eager/5w1s [scene-talk.follow-press.we-need-something-before-saturday]; L18 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L19 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L22 follow/thank/scene-talk/glad/3w1s [scene-talk.follow-thank.we-ll-be-there]</sub>

**Profile stubborn** (outcome resolved)

**Briana Ross:** Great rally.

**Briana Ross:** Where do you want us this weekend?

You could say:

1. I'll come by the office tomorrow and thank everyone.  *(the page follows this one)*
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
4. Let's talk about it at the office.  *(the page follows this one)*

**Briana Ross:** We need something before Saturday.

You could say:

1. More people knocking on doors. Bring a friend next time.
2. I'll go door knocking with you this weekend.  *(the page follows this one)*

**Briana Ross:** We'll be there.

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/2w1s [scene-talk.open-greet.great-rally]; L3 state/request/scene-talk/eager/7w1s [scene-talk.state-request.where-do-you-want-us-this-weekend]; L4 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L5 reply/request/scene-talk/glad/8w2s [scene-talk.reply-request.keep-them-coming-back-that-s-all-i-need]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L17 follow/press/scene-talk/eager/5w1s [scene-talk.follow-press.we-need-something-before-saturday]; L18 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L19 reply/promise/scene-talk/eager/8w1s [scene-talk.reply-promise.i-ll-go-door-knocking-with-you-this-weekend]; L22 follow/thank/scene-talk/glad/3w1s [scene-talk.follow-thank.we-ll-be-there]</sub>

**Profile boastful** (outcome open)

**Briana Ross:** Great rally.

**Briana Ross:** Where do you want us this weekend?

You could say:

1. I'll come by the office tomorrow and thank everyone.
2. More people knocking on doors. Bring a friend next time.  *(the page follows this one)*
3. Just keep showing up. Thank you, all of you.
4. Let's talk about it at the office.

**Briana Ross:** You've got it. We'll bring more people Saturday.

**Briana Ross:** We'll be ready Saturday.

<sub>L1 narrate/narrate/scene-talk/glad/18w2s [scene-talk.narrate-narrate.the-rally-is-over-and-the-crowd-is-thinning-out-name-one-of-your-volun]; L2 open/greet/scene-talk/glad/2w1s [scene-talk.open-greet.great-rally]; L3 state/request/scene-talk/eager/7w1s [scene-talk.state-request.where-do-you-want-us-this-weekend]; L4 reply/promise/scene-talk/tender/9w1s [scene-talk.reply-promise.i-ll-come-by-the-office-tomorrow-and-thank-everyone]; L5 reply/request/scene-talk/eager/10w2s [scene-talk.reply-request.more-people-knocking-on-doors-bring-a-friend-next-time]; L6 reply/thank/scene-talk/glad/9w2s [scene-talk.reply-thank.just-keep-showing-up-thank-you-all-of-you]; L7 reply/deflect/scene-talk/calm/7w1s [scene-talk.reply-deflect.let-s-talk-about-it-at-the-office]; L9 follow/promise/scene-talk/eager/8w2s [scene-talk.follow-promise.you-ve-got-it-we-ll-bring-more-people-saturday]; L10 close/press/scene-talk/eager/4w1s [scene-talk.close-press.we-ll-be-ready-saturday]</sub>

## Scene 7: vote-asked (vote-wanted, ends in bill) — proof scene

*Purpose ask-vote. Records: bill:office:US-DE:legislature-lower:2027-02-03:official:term:seat:US-DE:lower:001:0:2026-10-12:26, official:term:seat:US-DE:lower:036:0:2026-10-12, official:term:seat:US-DE:lower:004:0:2026-10-12, office:US-DE:legislature-lower.*

> Crystal Savage has been counting votes on "Bottle deposit" all week. Now Crystal Savage is at your door.

**Profile warm** (outcome resolved)

**Crystal Savage:** Is now a bad time?

**Crystal Savage:** Can I count on you for "Bottle deposit"?

You could say:

1. Count me in.  *(the page follows this one)*
2. I'm sorry, but I'm a no on "Bottle deposit".
3. This is a two-way street. I'll need your vote on mine.
4. Let me think about it.
5. I'm leaning your way.

**Crystal Savage:** Thank you. Really.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, open, open, resolved, open, open, resolved, resolved, open, open, resolved, open, open, resolved, resolved, resolved, open, open, resolved, open, open, resolved, resolved, open, open, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You ★: Count me in.
  - Crystal Savage: Thank you. Really.
  - *Ends resolved*
- You: I'm sorry, but I'm a no on "Bottle deposit".
  - Crystal Savage: You know what this means to me.
  - You: All right. You win. I'm in.
    - Crystal Savage: You won't regret it.
    - *Ends resolved*
  - You: I've made up my mind. It's no.
    - Crystal Savage: Please. Think about the people this helps.
    - You: All right. You win. I'm in.
      - Crystal Savage: Thank you. I won't forget it.
      - *Ends resolved*
    - You: I can't vote for "Bottle deposit".
      - Crystal Savage: I'm asking as a friend.
      - You: All right. You win. I'm in.
        - Crystal Savage: Thank you. Really.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Bottle deposit".
        - Crystal Savage: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: What's in it for my district?
        - Crystal Savage: That I can live with.
        - *Ends open*
      - You: Let me think about it.
        - Crystal Savage: I need this one. I promised my district I'd deliver.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Crystal Savage: That I can live with.
      - *Ends open*
    - You: I need a few days to think it over.
      - Crystal Savage: I'm asking as a friend.
      - You: Okay. For you, I'll do it.
        - Crystal Savage: I knew I could count on you.
        - *Ends resolved*
      - You: I can't vote for "Bottle deposit".
        - Crystal Savage: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Crystal Savage: Deal.
        - *Ends open*
      - You: Let me sleep on it.
        - Crystal Savage: Without this, I've got nothing to take home.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Bottle deposit".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
  - You: This is a two-way street. I'll need your vote on mine.
    - Crystal Savage: Deal.
    - *Ends open*
  - You: I need a few days to think it over.
    - Crystal Savage: I wouldn't ask if it didn't matter.
    - You: You've made your point. Count me in.
      - Crystal Savage: Thank you. I won't forget it.
      - *Ends resolved*
    - You: I've made up my mind. It's no.
      - Crystal Savage: Without this, I've got nothing to take home.
      - You: Okay. For you, I'll do it.
        - Crystal Savage: Thank you. Really.
        - *Ends resolved*
      - You: I can't vote for "Bottle deposit".
        - Crystal Savage: Please. Think about the people this helps.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Crystal Savage: That I can live with.
        - *Ends open*
      - You: Let me think about it.
        - Crystal Savage: I'm asking as a friend.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Bottle deposit".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I'm still undecided. Give me until the vote.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Crystal Savage: Deal.
      - *Ends open*
    - You: I'm still weighing it.
      - Crystal Savage: Without this, I've got nothing to take home.
      - You: You've made your point. Count me in.
        - Crystal Savage: Thank you. Really.
        - *Ends resolved*
      - You: I've made up my mind. It's no.
        - Crystal Savage: I need this one. I promised my district I'd deliver.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Bottle deposit".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: What's in it for my district?
        - Crystal Savage: Deal.
        - *Ends open*
      - You: I haven't decided yet.
        - Crystal Savage: I need this one. I promised my district I'd deliver.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't vote for "Bottle deposit".
          - (the tree is cut here)
        - You: What's in it for my district?
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
- You: This is a two-way street. I'll need your vote on mine.
  - Crystal Savage: Deal.
  - *Ends open*
- You: Let me think about it.
  - Crystal Savage: You know what this means to me.
  - You: Okay. For you, I'll do it.
    - Crystal Savage: Thank you. Really.
    - *Ends resolved*
  - You: I've made up my mind. It's no.
    - Crystal Savage: I wouldn't ask if it didn't matter.
    - You: All right. You win. I'm in.
      - Crystal Savage: I knew I could count on you.
      - *Ends resolved*
    - You: I'm sorry, but I'm a no on "Bottle deposit".
      - Crystal Savage: I'm asking as a friend.
      - You: Okay. For you, I'll do it.
        - Crystal Savage: Thank you. I won't forget it.
        - *Ends resolved*
      - You: I can't vote for "Bottle deposit".
        - Crystal Savage: I could lose my primary over this.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Bottle deposit".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Crystal Savage: That I can live with.
        - *Ends open*
      - You: I need a few days to think it over.
        - Crystal Savage: I need this one. I promised my district I'd deliver.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I can't vote for "Bottle deposit".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Crystal Savage: That I can live with.
      - *Ends open*
    - You: I'm still weighing it.
      - Crystal Savage: Without this, I've got nothing to take home.
      - You: Okay. For you, I'll do it.
        - Crystal Savage: I knew I could count on you.
        - *Ends resolved*
      - You: I can't vote for "Bottle deposit".
        - Crystal Savage: I'm asking as a friend.
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
        - *Ends open*
      - You: I haven't decided yet.
        - Crystal Savage: Please. Think about the people this helps.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't vote for "Bottle deposit".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
  - You: This is a two-way street. I'll need your vote on mine.
    - Crystal Savage: All right. We have a deal.
    - *Ends open*
  - You: I'm still weighing it.
    - Crystal Savage: Please. Think about the people this helps.
    - You: Okay. For you, I'll do it.
      - Crystal Savage: Thank you. I won't forget it.
      - *Ends resolved*
    - You: I've made up my mind. It's no.
      - Crystal Savage: I'm asking as a friend.
      - You: Okay. For you, I'll do it.
        - Crystal Savage: I knew I could count on you.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Bottle deposit".
        - Crystal Savage: I wouldn't ask if it didn't matter.
        - You: Fine. I'll do it, but this is the last time.
          - (the tree is cut here)
        - You: I can't vote for "Bottle deposit".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: I'll vote yes, but I'm going to need a favor from you.
        - Crystal Savage: All right. We have a deal.
        - *Ends open*
      - You: I haven't decided yet.
        - Crystal Savage: I need this one. I promised my district I'd deliver.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't vote for "Bottle deposit".
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Crystal Savage: All right. We have a deal.
      - *Ends open*
    - You: Let me sleep on it.
      - Crystal Savage: I'm asking as a friend.
      - You: Okay. For you, I'll do it.
        - Crystal Savage: I knew I could count on you.
        - *Ends resolved*
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: I need a few days to think it over.
        - (the tree is cut here)
- You: I'm leaning your way.
  - *if not:*
    - Crystal Savage: Good. I'll put you down as a yes.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-counting-votes-on-bill-all-week-now-name-is-at-your-door]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.is-now-a-bad-time]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.can-i-count-on-you-for-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L9 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile cold** (outcome refused)

**Crystal Savage:** Is now a bad time?

**Crystal Savage:** "Bottle deposit" comes down to a vote or two. Yours is one of them.

You could say:

1. Fine. You have it.
2. I'm sorry, but I'm a no on "Bottle deposit".  *(the page follows this one)*
3. I'll vote yes, but I'm going to need a favor from you.
4. I'm still weighing it.
5. I'm leaning your way.

**Crystal Savage:** It would be a shame if your next bill stalled.

You could say:

1. Okay. For you, I'll do it.
2. I've made up my mind. It's no.  *(the page follows this one)*
3. Are you threatening me?
4. What's in it for my district?

**Crystal Savage:** You can't win without friends.

You could say:

1. Okay. For you, I'll do it.
2. I can't vote for "Bottle deposit".  *(the page follows this one)*
3. Are you threatening me?
4. What's in it for my district?

**Crystal Savage:** People will remember this at the next election.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry, but I'm a no on "Bottle deposit".  *(the page follows this one)*
3. Are you threatening me?
4. This is a two-way street. I'll need your vote on mine.

**Crystal Savage:** You know how this works.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry, but I'm a no on "Bottle deposit".  *(the page follows this one)*
3. Are you threatening me?
4. What's in it for my district?

**Crystal Savage:** You know how this works.

**Crystal Savage:** I hope you know what this costs you.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-counting-votes-on-bill-all-week-now-name-is-at-your-door]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.is-now-a-bad-time]; L3 state/request/scene-talk/braced/14w2s [scene-talk.state-request.bill-comes-down-to-a-vote-or-two-yours-is-one-of-them]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L10 follow/threaten/scene-talk/guarded/10w1s [scene-talk.follow-threaten.it-would-be-a-shame-if-your-next-bill-stalled]; L11 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L12 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L13 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L14 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L16 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-can-t-win-without-friends]; L17 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L18 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L19 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L20 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L22 follow/threaten/scene-talk/braced/8w1s [scene-talk.follow-threaten.people-will-remember-this-at-the-next-election]; L23 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L24 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L25 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L26 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L28 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-know-how-this-works]; L29 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L30 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L31 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L32 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L34 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-know-how-this-works]; L35 close/warn/scene-talk/braced/8w1s [scene-talk.close-warn.i-hope-you-know-what-this-costs-you]</sub>

**Profile stubborn** (outcome refused)

**Crystal Savage:** Is now a bad time?

**Crystal Savage:** I'm counting votes on "Bottle deposit", and I need you.

You could say:

1. Fine. You have it.
2. I've made up my mind. It's no.  *(the page follows this one)*
3. This is a two-way street. I'll need your vote on mine.
4. I'm still weighing it.
5. I'm leaning your way.

**Crystal Savage:** I need a yes or a no.

You could say:

1. You've made your point. Count me in.
2. I can't vote for "Bottle deposit".  *(the page follows this one)*
3. I'll vote yes, but I'm going to need a favor from you.

**Crystal Savage:** Take your time, but I need an answer.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry, but I'm a no on "Bottle deposit".  *(the page follows this one)*
3. I'll vote yes, but I'm going to need a favor from you.

**Crystal Savage:** Yes or no?

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry, but I'm a no on "Bottle deposit".  *(the page follows this one)*
3. What's in it for my district?

**Crystal Savage:** I need to know before the vote.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I've made up my mind. It's no.  *(the page follows this one)*
3. This is a two-way street. I'll need your vote on mine.

**Crystal Savage:** You can't win without friends.

**Crystal Savage:** I hope you know what this costs you.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-counting-votes-on-bill-all-week-now-name-is-at-your-door]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.is-now-a-bad-time]; L3 state/request/scene-talk/hopeful/10w1s [scene-talk.state-request.i-m-counting-votes-on-bill-and-i-need-you]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L10 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-a-yes-or-a-no]; L11 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L12 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L13 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L15 follow/press/scene-talk/calm/8w1s [scene-talk.follow-press.take-your-time-but-i-need-an-answer]; L16 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L17 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L18 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L20 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L21 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L22 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L23 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L25 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-to-know-before-the-vote]; L26 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L27 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L28 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L30 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-can-t-win-without-friends]; L31 close/warn/scene-talk/braced/8w1s [scene-talk.close-warn.i-hope-you-know-what-this-costs-you]</sub>

**Profile anxious** (outcome open)

**Crystal Savage:** Is now a bad time?

**Crystal Savage:** Can I count on you for "Bottle deposit"?

You could say:

1. Count me in.
2. I can't vote for "Bottle deposit".
3. I'll vote yes, but I'm going to need a favor from you.
4. I haven't decided yet.  *(the page follows this one)*
5. I'm leaning your way.

**Crystal Savage:** You know what this means to me.

You could say:

1. You've made your point. Count me in.
2. I've made up my mind. It's no.
3. I'll vote yes, but I'm going to need a favor from you.
4. I'm still undecided. Give me until the vote.  *(the page follows this one)*

**Crystal Savage:** I could lose my primary over this.

You could say:

1. All right. You win. I'm in.
2. I've made up my mind. It's no.
3. What's in it for my district?
4. I need a few days to think it over.  *(the page follows this one)*

**Crystal Savage:** I'm asking as a friend.

You could say:

1. Okay. For you, I'll do it.
2. I can't vote for "Bottle deposit".
3. What's in it for my district?
4. Let me think about it.  *(the page follows this one)*

**Crystal Savage:** I need this one. I promised my district I'd deliver.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I've made up my mind. It's no.
3. I'll vote yes, but I'm going to need a favor from you.
4. I'm still weighing it.  *(the page follows this one)*

**Crystal Savage:** I wouldn't ask if it didn't matter.

**Crystal Savage:** Don't take too long.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-counting-votes-on-bill-all-week-now-name-is-at-your-door]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.is-now-a-bad-time]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.can-i-count-on-you-for-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L100 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.you-know-what-this-means-to-me]; L101 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L102 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L103 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L104 reply/stall/scene-talk/guarded/8w2s [scene-talk.reply-stall.i-m-still-undecided-give-me-until-the-vote]; L148 follow/plea/scene-talk/anxious/7w1s [scene-talk.follow-plea.i-could-lose-my-primary-over-this]; L149 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L150 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L151 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L152 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L172 follow/plea/scene-talk/tender/5w1s [scene-talk.follow-plea.i-m-asking-as-a-friend]; L173 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L174 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L175 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L176 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L178 follow/plea/scene-talk/anxious/10w2s [scene-talk.follow-plea.i-need-this-one-i-promised-my-district-i-d-deliver]; L179 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L180 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L181 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L182 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L183 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.i-wouldn-t-ask-if-it-didn-t-matter]; L184 close/press/scene-talk/braced/4w1s [scene-talk.close-press.don-t-take-too-long]</sub>

**Profile boastful** (outcome open)

**Crystal Savage:** Can I talk to you?

**Crystal Savage:** Can I count on you for "Bottle deposit"?

You could say:

1. Count me in.
2. I can't vote for "Bottle deposit".
3. What's in it for my district?  *(the page follows this one)*
4. Let me think about it.
5. I'm leaning your way.

**Crystal Savage:** Deal.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-counting-votes-on-bill-all-week-now-name-is-at-your-door]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.can-i-count-on-you-for-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L49 follow/accept/scene-talk/calm/1w1s [scene-talk.follow-accept.deal]</sub>

## Scene 8: vote-asked (vote-wanted, ends in bill) — proof scene

*Purpose ask-vote. Records: bill:office:gus2025:101811:board:2027-04-10:person_bc041df6bd9d1a47:59, person_9e002a561a4b29bc, person_bf349ec8efe6104f, office:gus2025:101811:board.*

> The vote on "Inclusionary requirement" is coming up. Kelly Riggs catches you outside the chamber.

**Profile warm** (outcome resolved)

**Kelly Riggs:** Have you got a few minutes?

**Kelly Riggs:** I need your vote on "Inclusionary requirement".

You could say:

1. I'm with you on "Inclusionary requirement".  *(the page follows this one)*
2. I've made up my mind. It's no.
3. I'll vote yes, but I'm going to need a favor from you.
4. Let me sleep on it.
5. I'm leaning your way.

**Kelly Riggs:** Thank you. Really.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, open, open, resolved, open, open, resolved, resolved, open, open, resolved, open, open, resolved, resolved, resolved, open, open, resolved, open, resolved, open, open, resolved, refused, open, open, resolved; ★ is the branch this profile's traits lean toward):

- You ★: I'm with you on "Inclusionary requirement".
  - Kelly Riggs: Thank you. Really.
  - *Ends resolved*
- You: I've made up my mind. It's no.
  - Kelly Riggs: I'm asking as a friend.
  - You: You've made your point. Count me in.
    - Kelly Riggs: Thank you. Really.
    - *Ends resolved*
  - You: I'm sorry, but I'm a no on "Inclusionary requirement".
    - Kelly Riggs: I wouldn't ask if it didn't matter.
    - You: You've made your point. Count me in.
      - Kelly Riggs: Thank you. Really.
      - *Ends resolved*
    - You: I can't vote for "Inclusionary requirement".
      - Kelly Riggs: I could lose my primary over this.
      - You: You've made your point. Count me in.
        - Kelly Riggs: I knew I could count on you.
        - *Ends resolved*
      - You: I've made up my mind. It's no.
        - Kelly Riggs: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Inclusionary requirement".
          - (the tree is cut here)
        - You: What's in it for my district?
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
      - You: I'll vote yes, but I'm going to need a favor from you.
        - Kelly Riggs: That I can live with.
        - *Ends open*
      - You: I'm still weighing it.
        - Kelly Riggs: You know what this means to me.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I can't vote for "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Kelly Riggs: All right. We have a deal.
      - *Ends open*
    - You: Let me sleep on it.
      - Kelly Riggs: Please. Think about the people this helps.
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: Thank you. Really.
        - *Ends resolved*
      - You: I can't vote for "Inclusionary requirement".
        - Kelly Riggs: I could lose my primary over this.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Kelly Riggs: That I can live with.
        - *Ends open*
      - You: I need a few days to think it over.
        - Kelly Riggs: You know what this means to me.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't vote for "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
  - You: What's in it for my district?
    - Kelly Riggs: Deal.
    - *Ends open*
  - You: Let me think about it.
    - Kelly Riggs: Please. Think about the people this helps.
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: I knew I could count on you.
      - *Ends resolved*
    - You: I can't vote for "Inclusionary requirement".
      - Kelly Riggs: I wouldn't ask if it didn't matter.
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: Thank you. Really.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Inclusionary requirement".
        - Kelly Riggs: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Kelly Riggs: That I can live with.
        - *Ends open*
      - You: I'm still weighing it.
        - Kelly Riggs: You know what this means to me.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Kelly Riggs: Deal.
      - *Ends open*
    - You: I haven't decided yet.
      - Kelly Riggs: I need this one. I promised my district I'd deliver.
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: Thank you. Really.
        - *Ends resolved*
      - You: I can't vote for "Inclusionary requirement".
        - Kelly Riggs: You know what this means to me.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Inclusionary requirement".
          - (the tree is cut here)
        - You: What's in it for my district?
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Kelly Riggs: Deal.
        - *Ends open*
      - You: I'm still undecided. Give me until the vote.
        - Kelly Riggs: I wouldn't ask if it didn't matter.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
- You: I'll vote yes, but I'm going to need a favor from you.
  - Kelly Riggs: All right. We have a deal.
  - *Ends open*
- You: Let me sleep on it.
  - Kelly Riggs: Please. Think about the people this helps.
  - You: Okay. For you, I'll do it.
    - Kelly Riggs: Thank you. I won't forget it.
    - *Ends resolved*
  - You: I've made up my mind. It's no.
    - Kelly Riggs: You know what this means to me.
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: Thank you. Really.
      - *Ends resolved*
    - You: I can't vote for "Inclusionary requirement".
      - Kelly Riggs: I wouldn't ask if it didn't matter.
      - You: You've made your point. Count me in.
        - Kelly Riggs: Thank you. Really.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Inclusionary requirement".
        - Kelly Riggs: Without this, I've got nothing to take home.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't vote for "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Kelly Riggs: That I can live with.
        - *Ends open*
      - You: I haven't decided yet.
        - Kelly Riggs: I need this one. I promised my district I'd deliver.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Inclusionary requirement".
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Kelly Riggs: Deal.
      - *Ends open*
    - You: Let me think about it.
      - Kelly Riggs: I'm asking as a friend.
      - You: You've made your point. Count me in.
        - Kelly Riggs: Thank you. Really.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Inclusionary requirement".
        - Kelly Riggs: I wouldn't ask if it didn't matter.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I can't vote for "Inclusionary requirement".
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
      - You: What's in it for my district?
        - (the tree is cut here)
      - You: I'm still undecided. Give me until the vote.
        - (the tree is cut here)
  - You: I'll vote yes, but I'm going to need a favor from you.
    - Kelly Riggs: That I can live with.
    - *Ends open*
  - You: I'm still weighing it.
    - Kelly Riggs: I could lose my primary over this.
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: Thank you. Really.
      - *Ends resolved*
    - You: I've made up my mind. It's no.
      - Kelly Riggs: Without this, I've got nothing to take home.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I'm sorry, but I'm a no on "Inclusionary requirement".
        - (the tree is cut here)
      - You: What's in it for my district?
        - (the tree is cut here)
      - You: I need a few days to think it over.
        - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Kelly Riggs: That I can live with.
      - *Ends open*
    - You: I haven't decided yet.
      - Kelly Riggs: You know what this means to me.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: I'm still undecided. Give me until the vote.
        - (the tree is cut here)
- You: I'm leaning your way.
  - *if Kelly Riggs knows:*
    - Kelly Riggs: That's not what you told Zachary Shepard.
    - You: All right. Here's the truth.
      - Kelly Riggs: Thank you for telling me straight.
      - *Ends open*
    - You: People say a lot of things.
      - Kelly Riggs: What would it take?
      - You: You've made your point. Count me in.
        - *Ends resolved*
      - You: I can't vote for "Inclusionary requirement".
        - *Ends refused: Kelly Riggs: I won't forget this.*
      - You: I'll vote yes, but I'm going to need a favor from you.
        - *Ends open: Kelly Riggs: I won't forget this.*
    - You: Then Zachary Shepard has it wrong.
      - *Ends open: Kelly Riggs: I'll call you before the vote.*
  - *if not:*
    - Kelly Riggs: Good. I'll put you down as a yes.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.the-vote-on-bill-is-coming-up-name-catches-you-outside-the-chamber]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/request/scene-talk/hopeful/7w1s [scene-talk.state-request.i-need-your-vote-on-bill]; L4 reply/agree/scene-talk/calm/6w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L9 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile cold** (outcome resolved)

**Kelly Riggs:** Can I talk to you?

**Kelly Riggs:** I'm counting votes on "Inclusionary requirement", and I need you.

You could say:

1. I'm with you on "Inclusionary requirement".  *(the page follows this one)*
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

1. You have my vote.  *(the page follows this one)*
2. I've made up my mind. It's no.
3. I'll vote yes, but I'm going to need a favor from you.
4. I need a few days to think it over.
5. I'm leaning your way.

**Kelly Riggs:** Thank you. Really.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.the-vote-on-bill-is-coming-up-name-catches-you-outside-the-chamber]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/request/scene-talk/braced/14w2s [scene-talk.state-request.bill-comes-down-to-a-vote-or-two-yours-is-one-of-them]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L9 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile anxious** (outcome open)

**Kelly Riggs:** Have you got a few minutes?

**Kelly Riggs:** I need your vote on "Inclusionary requirement".

You could say:

1. Count me in.
2. I can't vote for "Inclusionary requirement".
3. What's in it for my district?
4. I need a few days to think it over.  *(the page follows this one)*
5. You can count on me.

**Kelly Riggs:** You know what this means to me.

You could say:

1. Okay. For you, I'll do it.
2. I'm sorry, but I'm a no on "Inclusionary requirement".
3. What's in it for my district?
4. I haven't decided yet.  *(the page follows this one)*

**Kelly Riggs:** Without this, I've got nothing to take home.

You could say:

1. Okay. For you, I'll do it.
2. I've made up my mind. It's no.
3. What's in it for my district?
4. Let me think about it.  *(the page follows this one)*

**Kelly Riggs:** I wouldn't ask if it didn't matter.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I've made up my mind. It's no.
3. What's in it for my district?
4. I'm still undecided. Give me until the vote.  *(the page follows this one)*

**Kelly Riggs:** I'm asking as a friend.

You could say:

1. You've made your point. Count me in.
2. I'm sorry, but I'm a no on "Inclusionary requirement".
3. What's in it for my district?
4. I'm still weighing it.  *(the page follows this one)*

**Kelly Riggs:** I could lose my primary over this.

**Kelly Riggs:** I'll call you before the vote.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.the-vote-on-bill-is-coming-up-name-catches-you-outside-the-chamber]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/request/scene-talk/hopeful/7w1s [scene-talk.state-request.i-need-your-vote-on-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L8 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.you-can-count-on-me]; L37 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.you-know-what-this-means-to-me]; L38 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L39 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L40 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L41 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L64 follow/plea/scene-talk/anxious/8w1s [scene-talk.follow-plea.without-this-i-ve-got-nothing-to-take-home]; L65 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L66 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L67 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L68 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L84 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.i-wouldn-t-ask-if-it-didn-t-matter]; L85 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L86 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L87 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L88 reply/stall/scene-talk/guarded/8w2s [scene-talk.reply-stall.i-m-still-undecided-give-me-until-the-vote]; L99 follow/plea/scene-talk/tender/5w1s [scene-talk.follow-plea.i-m-asking-as-a-friend]; L100 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L101 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L102 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L103 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L108 follow/plea/scene-talk/anxious/7w1s [scene-talk.follow-plea.i-could-lose-my-primary-over-this]; L109 close/press/scene-talk/calm/6w1s [scene-talk.close-press.i-ll-call-you-before-the-vote]</sub>

**Profile boastful** (outcome resolved)

**Kelly Riggs:** I won't take long.

**Kelly Riggs:** I need your vote on "Inclusionary requirement".

You could say:

1. Count me in.  *(the page follows this one)*
2. I can't vote for "Inclusionary requirement".
3. This is a two-way street. I'll need your vote on mine.
4. Let me sleep on it.
5. I'm leaning your way.

**Kelly Riggs:** Thank you. Really.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.the-vote-on-bill-is-coming-up-name-catches-you-outside-the-chamber]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.i-won-t-take-long]; L3 state/request/scene-talk/hopeful/7w1s [scene-talk.state-request.i-need-your-vote-on-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L9 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

## Scene 9: vote-asked (vote-wanted, ends in bill) — proof scene

*Purpose ask-vote. Records: bill:office:US-DE:legislature-upper:2027-02-13:official:term:seat:US-DE:upper:020:0:2026-10-12:35, official:term:seat:US-DE:upper:015:0:2026-10-12, official:term:seat:US-DE:upper:011:0:2026-10-12, office:US-DE:legislature-upper.*

> You're going over "Stand your ground" at your desk when Brittany Tucker knocks on the open door.

**Profile warm** (outcome resolved)

**Brittany Tucker:** Can I talk to you?

**Brittany Tucker:** "Stand your ground" comes down to a vote or two. Yours is one of them.

You could say:

1. I'm with you on "Stand your ground".  *(the page follows this one)*
2. I can't vote for "Stand your ground".
3. I'll vote yes, but I'm going to need a favor from you.
4. I need a few days to think it over.
5. I'm leaning your way.

**Brittany Tucker:** You won't regret it.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, open, open, resolved, open, open, resolved, resolved, open, open, resolved, open, open, resolved, resolved, resolved, open, open, resolved, open, open, resolved, resolved, open, open, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You ★: I'm with you on "Stand your ground".
  - Brittany Tucker: You won't regret it.
  - *Ends resolved*
- You: I can't vote for "Stand your ground".
  - Brittany Tucker: You know what this means to me.
  - You: All right. You win. I'm in.
    - Brittany Tucker: Thank you. Really.
    - *Ends resolved*
  - You: I've made up my mind. It's no.
    - Brittany Tucker: I wouldn't ask if it didn't matter.
    - You: Okay. For you, I'll do it.
      - Brittany Tucker: You won't regret it.
      - *Ends resolved*
    - You: I'm sorry, but I'm a no on "Stand your ground".
      - Brittany Tucker: I need this one. I promised my district I'd deliver.
      - You: Okay. For you, I'll do it.
        - Brittany Tucker: Thank you. I won't forget it.
        - *Ends resolved*
      - You: I've made up my mind. It's no.
        - Brittany Tucker: Please. Think about the people this helps.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Stand your ground".
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Brittany Tucker: That I can live with.
        - *Ends open*
      - You: I need a few days to think it over.
        - Brittany Tucker: Please. Think about the people this helps.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
    - You: I'll vote yes, but I'm going to need a favor from you.
      - Brittany Tucker: Deal.
      - *Ends open*
    - You: Let me sleep on it.
      - Brittany Tucker: I'm asking as a friend.
      - You: Okay. For you, I'll do it.
        - Brittany Tucker: I knew I could count on you.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Stand your ground".
        - Brittany Tucker: Please. Think about the people this helps.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: What's in it for my district?
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Brittany Tucker: Deal.
        - *Ends open*
      - You: I need a few days to think it over.
        - Brittany Tucker: Please. Think about the people this helps.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Stand your ground".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
  - You: What's in it for my district?
    - Brittany Tucker: Deal.
    - *Ends open*
  - You: Let me sleep on it.
    - Brittany Tucker: Without this, I've got nothing to take home.
    - You: Okay. For you, I'll do it.
      - Brittany Tucker: I knew I could count on you.
      - *Ends resolved*
    - You: I've made up my mind. It's no.
      - Brittany Tucker: Please. Think about the people this helps.
      - You: All right. You win. I'm in.
        - Brittany Tucker: I knew I could count on you.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Stand your ground".
        - Brittany Tucker: I could lose my primary over this.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Stand your ground".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Brittany Tucker: That I can live with.
        - *Ends open*
      - You: I'm still weighing it.
        - Brittany Tucker: I need this one. I promised my district I'd deliver.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Stand your ground".
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Brittany Tucker: All right. We have a deal.
      - *Ends open*
    - You: I'm still weighing it.
      - Brittany Tucker: Please. Think about the people this helps.
      - You: Fine. I'll do it, but this is the last time.
        - Brittany Tucker: Thank you. I won't forget it.
        - *Ends resolved*
      - You: I've made up my mind. It's no.
        - Brittany Tucker: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Stand your ground".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Brittany Tucker: That I can live with.
        - *Ends open*
      - You: I haven't decided yet.
        - Brittany Tucker: I could lose my primary over this.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
- You: I'll vote yes, but I'm going to need a favor from you.
  - Brittany Tucker: Deal.
  - *Ends open*
- You: I need a few days to think it over.
  - Brittany Tucker: I'm asking as a friend.
  - You: Okay. For you, I'll do it.
    - Brittany Tucker: I knew I could count on you.
    - *Ends resolved*
  - You: I've made up my mind. It's no.
    - Brittany Tucker: I need this one. I promised my district I'd deliver.
    - You: All right. You win. I'm in.
      - Brittany Tucker: I knew I could count on you.
      - *Ends resolved*
    - You: I can't vote for "Stand your ground".
      - Brittany Tucker: Please. Think about the people this helps.
      - You: Okay. For you, I'll do it.
        - Brittany Tucker: I knew I could count on you.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Stand your ground".
        - Brittany Tucker: I wouldn't ask if it didn't matter.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Stand your ground".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Brittany Tucker: Deal.
        - *Ends open*
      - You: Let me think about it.
        - Brittany Tucker: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Stand your ground".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Brittany Tucker: All right. We have a deal.
      - *Ends open*
    - You: I haven't decided yet.
      - Brittany Tucker: I could lose my primary over this.
      - You: All right. You win. I'm in.
        - Brittany Tucker: Thank you. I won't forget it.
        - *Ends resolved*
      - You: I can't vote for "Stand your ground".
        - Brittany Tucker: Please. Think about the people this helps.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Stand your ground".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: I'll vote yes, but I'm going to need a favor from you.
        - Brittany Tucker: Deal.
        - *Ends open*
      - You: Let me sleep on it.
        - Brittany Tucker: Please. Think about the people this helps.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Stand your ground".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
  - You: This is a two-way street. I'll need your vote on mine.
    - Brittany Tucker: That I can live with.
    - *Ends open*
  - You: Let me think about it.
    - Brittany Tucker: You know what this means to me.
    - You: All right. You win. I'm in.
      - Brittany Tucker: I knew I could count on you.
      - *Ends resolved*
    - You: I've made up my mind. It's no.
      - Brittany Tucker: I wouldn't ask if it didn't matter.
      - You: Okay. For you, I'll do it.
        - Brittany Tucker: I knew I could count on you.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Stand your ground".
        - Brittany Tucker: Please. Think about the people this helps.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Stand your ground".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: What's in it for my district?
        - Brittany Tucker: Deal.
        - *Ends open*
      - You: Let me sleep on it.
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
      - Brittany Tucker: Deal.
      - *Ends open*
    - You: I haven't decided yet.
      - Brittany Tucker: I could lose my primary over this.
      - You: You've made your point. Count me in.
        - Brittany Tucker: I knew I could count on you.
        - *Ends resolved*
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: Let me sleep on it.
        - (the tree is cut here)
- You: I'm leaning your way.
  - *if not:*
    - Brittany Tucker: Good. I'll put you down as a yes.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.you-re-going-over-bill-at-your-desk-when-name-knocks-on-the-open-door]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/request/scene-talk/braced/15w2s [scene-talk.state-request.bill-comes-down-to-a-vote-or-two-yours-is-one-of-them]; L4 reply/agree/scene-talk/calm/7w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L9 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

**Profile cold** (outcome refused)

**Brittany Tucker:** You got a minute?

**Brittany Tucker:** "Stand your ground" comes down to a vote or two. Yours is one of them.

You could say:

1. Count me in.
2. I can't vote for "Stand your ground".  *(the page follows this one)*
3. I'll vote yes, but I'm going to need a favor from you.
4. Let me think about it.
5. I'm leaning your way.

**Brittany Tucker:** People will remember this at the next election.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry, but I'm a no on "Stand your ground".  *(the page follows this one)*
3. Are you threatening me?
4. What's in it for my district?

**Brittany Tucker:** You can't win without friends.

You could say:

1. You've made your point. Count me in.
2. I've made up my mind. It's no.  *(the page follows this one)*
3. Are you threatening me?
4. I'll vote yes, but I'm going to need a favor from you.

**Brittany Tucker:** You know how this works.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I've made up my mind. It's no.  *(the page follows this one)*
3. Are you threatening me?
4. I'll vote yes, but I'm going to need a favor from you.

**Brittany Tucker:** It would be a shame if your next bill stalled.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't vote for "Stand your ground".  *(the page follows this one)*
3. Don't try that with me.
4. This is a two-way street. I'll need your vote on mine.

**Brittany Tucker:** It would be a shame if your next bill stalled.

**Brittany Tucker:** You'll need friends after this vote. I won't be one.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.you-re-going-over-bill-at-your-desk-when-name-knocks-on-the-open-door]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/braced/15w2s [scene-talk.state-request.bill-comes-down-to-a-vote-or-two-yours-is-one-of-them]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L10 follow/threaten/scene-talk/braced/8w1s [scene-talk.follow-threaten.people-will-remember-this-at-the-next-election]; L11 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L12 reply/refuse/scene-talk/guarded/10w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L13 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L14 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L16 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-can-t-win-without-friends]; L17 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L18 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L19 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L20 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L22 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-know-how-this-works]; L23 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L24 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L25 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L26 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L28 follow/threaten/scene-talk/guarded/10w1s [scene-talk.follow-threaten.it-would-be-a-shame-if-your-next-bill-stalled]; L29 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L30 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L31 reply/confront/scene-talk/braced/5w1s [scene-talk.reply-confront.don-t-try-that-with-me]; L32 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L34 follow/threaten/scene-talk/guarded/10w1s [scene-talk.follow-threaten.it-would-be-a-shame-if-your-next-bill-stalled]; L35 close/warn/scene-talk/braced/10w2s [scene-talk.close-warn.you-ll-need-friends-after-this-vote-i-won-t-be-one]</sub>

**Profile stubborn** (outcome refused)

**Brittany Tucker:** Got a second?

**Brittany Tucker:** I'm counting votes on "Stand your ground", and I need you.

You could say:

1. I'm with you on "Stand your ground".
2. I've made up my mind. It's no.  *(the page follows this one)*
3. I'll vote yes, but I'm going to need a favor from you.
4. Let me sleep on it.
5. You can count on me.

**Brittany Tucker:** I need a yes or a no.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't vote for "Stand your ground".  *(the page follows this one)*
3. What's in it for my district?

**Brittany Tucker:** I need to know before the vote.

You could say:

1. You've made your point. Count me in.
2. I'm sorry, but I'm a no on "Stand your ground".  *(the page follows this one)*
3. I'll vote yes, but I'm going to need a favor from you.

**Brittany Tucker:** Yes or no?

You could say:

1. All right. You win. I'm in.
2. I've made up my mind. It's no.  *(the page follows this one)*
3. This is a two-way street. I'll need your vote on mine.

**Brittany Tucker:** What would it take?

You could say:

1. You've made your point. Count me in.
2. I can't vote for "Stand your ground".  *(the page follows this one)*
3. What's in it for my district?

**Brittany Tucker:** You can't sit this one out.

**Brittany Tucker:** I hope you know what this costs you.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.you-re-going-over-bill-at-your-desk-when-name-knocks-on-the-open-door]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/request/scene-talk/hopeful/11w1s [scene-talk.state-request.i-m-counting-votes-on-bill-and-i-need-you]; L4 reply/agree/scene-talk/calm/7w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L8 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.you-can-count-on-me]; L10 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-a-yes-or-a-no]; L11 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L12 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L13 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L15 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-to-know-before-the-vote]; L16 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L17 reply/refuse/scene-talk/guarded/10w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L18 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L20 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L21 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L22 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L23 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L25 follow/press/scene-talk/calm/4w1s [scene-talk.follow-press.what-would-it-take]; L26 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L27 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L28 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L30 follow/press/scene-talk/guarded/6w1s [scene-talk.follow-press.you-can-t-sit-this-one-out]; L31 close/warn/scene-talk/braced/8w1s [scene-talk.close-warn.i-hope-you-know-what-this-costs-you]</sub>

**Profile anxious** (outcome open)

**Brittany Tucker:** You got a minute?

**Brittany Tucker:** "Stand your ground" comes down to a vote or two. Yours is one of them.

You could say:

1. Count me in.
2. I've made up my mind. It's no.
3. What's in it for my district?
4. I haven't decided yet.  *(the page follows this one)*
5. You can count on me.

**Brittany Tucker:** I'm asking as a friend.

You could say:

1. Okay. For you, I'll do it.
2. I can't vote for "Stand your ground".
3. What's in it for my district?
4. I need a few days to think it over.  *(the page follows this one)*

**Brittany Tucker:** Please. Think about the people this helps.

You could say:

1. Okay. For you, I'll do it.
2. I'm sorry, but I'm a no on "Stand your ground".
3. This is a two-way street. I'll need your vote on mine.
4. I'm still weighing it.  *(the page follows this one)*

**Brittany Tucker:** Without this, I've got nothing to take home.

You could say:

1. Okay. For you, I'll do it.
2. I can't vote for "Stand your ground".
3. I'll vote yes, but I'm going to need a favor from you.
4. Let me think about it.  *(the page follows this one)*

**Brittany Tucker:** I wouldn't ask if it didn't matter.

You could say:

1. Okay. For you, I'll do it.
2. I've made up my mind. It's no.
3. What's in it for my district?
4. I'm still undecided. Give me until the vote.  *(the page follows this one)*

**Brittany Tucker:** I need this one. I promised my district I'd deliver.

**Brittany Tucker:** I hope you know what this costs you.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.you-re-going-over-bill-at-your-desk-when-name-knocks-on-the-open-door]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/braced/15w2s [scene-talk.state-request.bill-comes-down-to-a-vote-or-two-yours-is-one-of-them]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.you-can-count-on-me]; L100 follow/plea/scene-talk/tender/5w1s [scene-talk.follow-plea.i-m-asking-as-a-friend]; L101 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L102 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L103 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L104 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L148 follow/plea/scene-talk/tender/7w2s [scene-talk.follow-plea.please-think-about-the-people-this-helps]; L149 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L150 reply/refuse/scene-talk/guarded/10w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L151 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L152 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L172 follow/plea/scene-talk/anxious/8w1s [scene-talk.follow-plea.without-this-i-ve-got-nothing-to-take-home]; L173 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L174 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L175 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L176 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L178 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.i-wouldn-t-ask-if-it-didn-t-matter]; L179 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L180 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L181 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L182 reply/stall/scene-talk/guarded/8w2s [scene-talk.reply-stall.i-m-still-undecided-give-me-until-the-vote]; L183 follow/plea/scene-talk/anxious/10w2s [scene-talk.follow-plea.i-need-this-one-i-promised-my-district-i-d-deliver]; L184 close/warn/scene-talk/braced/8w1s [scene-talk.close-warn.i-hope-you-know-what-this-costs-you]</sub>

**Profile boastful** (outcome open)

**Brittany Tucker:** You got a minute?

**Brittany Tucker:** "Stand your ground" comes down to a vote or two. Yours is one of them.

You could say:

1. I'm with you on "Stand your ground".
2. I've made up my mind. It's no.
3. What's in it for my district?  *(the page follows this one)*
4. Let me think about it.
5. I'm leaning your way.

**Brittany Tucker:** Deal.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.you-re-going-over-bill-at-your-desk-when-name-knocks-on-the-open-door]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/braced/15w2s [scene-talk.state-request.bill-comes-down-to-a-vote-or-two-yours-is-one-of-them]; L4 reply/agree/scene-talk/calm/7w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L58 follow/accept/scene-talk/calm/1w1s [scene-talk.follow-accept.deal]</sub>

## Scene 10: vote-confirmed (vote-wanted, ends in bill) — proof scene

*Purpose confirm-vote. Records: bill:office:gus2025:101811:board:2027-04-10:person_bc041df6bd9d1a47:59, person_bc041df6bd9d1a47, person_d3c12275ee46b085, office:gus2025:101811:board, promise:past:seat:gus2025:101811:board:6:2022-11-08:us-policy-positions:housing-land-use.inclusionary-requirement.*

> Alicia Keller stops by your office. You told Alicia Keller you'd vote yes on "Inclusionary requirement".

**Profile warm** (outcome resolved)

**Alicia Keller:** I won't take long.

**Alicia Keller:** You're still a yes on "Inclusionary requirement"?

You could say:

1. You have my vote.  *(the page follows this one)*
2. I gave you my word, and I'm going back on it. I'm sorry.
3. This is a two-way street. I'll need your vote on mine.
4. I'm still weighing it.
5. I'm still with you.

**Alicia Keller:** Good. I'll hold you to that.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, open, open, resolved, open, open, resolved, resolved, open, open, resolved, open, open, resolved, resolved, resolved, open, open, resolved, open, resolved, open, open, resolved, refused, open, open, resolved; ★ is the branch this profile's traits lean toward):

- You ★: You have my vote.
  - Alicia Keller: Good. I'll hold you to that.
  - *Ends resolved*
- You: I gave you my word, and I'm going back on it. I'm sorry.
  - Alicia Keller: You know what this means to me.
  - You: You've made your point. Count me in.
    - Alicia Keller: I knew I could count on you.
    - *Ends resolved*
  - You: I've made up my mind. It's no.
    - Alicia Keller: I need this one. I promised my district I'd deliver.
    - You: You've made your point. Count me in.
      - Alicia Keller: Thank you. I won't forget it.
      - *Ends resolved*
    - You: I can't vote for "Inclusionary requirement".
      - Alicia Keller: Please. Think about the people this helps.
      - You: All right. You win. I'm in.
        - Alicia Keller: Thank you. I won't forget it.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Inclusionary requirement".
        - Alicia Keller: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Alicia Keller: I can't make that deal.
        - *Ends open: Alicia Keller: Don't take too long.*
      - You: Let me think about it.
        - Alicia Keller: Without this, I've got nothing to take home.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
    - You: What's in it for my district?
      - Alicia Keller: I can't make that deal.
      - *Ends open: Alicia Keller: I won't forget this.*
    - You: Let me think about it.
      - Alicia Keller: I wouldn't ask if it didn't matter.
      - You: You've made your point. Count me in.
        - Alicia Keller: Thank you. Really.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Inclusionary requirement".
        - Alicia Keller: Please. Think about the people this helps.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Inclusionary requirement".
          - (the tree is cut here)
        - You: What's in it for my district?
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Alicia Keller: I can't make that deal.
        - *Ends open: Alicia Keller: I hope you know what this costs you.*
      - You: I'm still weighing it.
        - Alicia Keller: I'm asking as a friend.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Inclusionary requirement".
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
  - You: This is a two-way street. I'll need your vote on mine.
    - Alicia Keller: I can't make that deal.
    - *Ends open: Alicia Keller: I hope you know what this costs you.*
  - You: I'm still weighing it.
    - Alicia Keller: Please. Think about the people this helps.
    - You: Okay. For you, I'll do it.
      - Alicia Keller: You won't regret it.
      - *Ends resolved*
    - You: I've made up my mind. It's no.
      - Alicia Keller: I wouldn't ask if it didn't matter.
      - You: You've made your point. Count me in.
        - Alicia Keller: Thank you. Really.
        - *Ends resolved*
      - You: I can't vote for "Inclusionary requirement".
        - Alicia Keller: I'm asking as a friend.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Alicia Keller: I can't make that deal.
        - *Ends open: Alicia Keller: I'll call you before the vote.*
      - You: I need a few days to think it over.
        - Alicia Keller: I need this one. I promised my district I'd deliver.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Alicia Keller: I can't make that deal.
      - *Ends open: Alicia Keller: Think it over. I'll be back tomorrow.*
    - You: I need a few days to think it over.
      - Alicia Keller: I could lose my primary over this.
      - You: Okay. For you, I'll do it.
        - Alicia Keller: I knew I could count on you.
        - *Ends resolved*
      - You: I can't vote for "Inclusionary requirement".
        - Alicia Keller: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Alicia Keller: That's not on the table.
        - *Ends open: Alicia Keller: Don't take too long.*
      - You: I haven't decided yet.
        - Alicia Keller: I'm asking as a friend.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
- You: This is a two-way street. I'll need your vote on mine.
  - Alicia Keller: I can't make that deal.
  - *Ends open: Alicia Keller: You'll need friends after this vote. I won't be one.*
- You: I'm still weighing it.
  - Alicia Keller: You know what this means to me.
  - You: Okay. For you, I'll do it.
    - Alicia Keller: You won't regret it.
    - *Ends resolved*
  - You: I'm sorry, but I'm a no on "Inclusionary requirement".
    - Alicia Keller: I'm asking as a friend.
    - You: Okay. For you, I'll do it.
      - Alicia Keller: You won't regret it.
      - *Ends resolved*
    - You: I've made up my mind. It's no.
      - Alicia Keller: Please. Think about the people this helps.
      - You: You've made your point. Count me in.
        - Alicia Keller: You won't regret it.
        - *Ends resolved*
      - You: I can't vote for "Inclusionary requirement".
        - Alicia Keller: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: What's in it for my district?
        - Alicia Keller: I can't make that deal.
        - *Ends open: Alicia Keller: I won't forget this.*
      - You: I haven't decided yet.
        - Alicia Keller: I could lose my primary over this.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Alicia Keller: That's not on the table.
      - *Ends open: Alicia Keller: I won't forget this.*
    - You: Let me sleep on it.
      - Alicia Keller: I need this one. I promised my district I'd deliver.
      - You: Okay. For you, I'll do it.
        - Alicia Keller: Thank you. I won't forget it.
        - *Ends resolved*
      - You: I've made up my mind. It's no.
        - Alicia Keller: Please. Think about the people this helps.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Inclusionary requirement".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
      - You: I'll vote yes, but I'm going to need a favor from you.
        - (the tree is cut here)
      - You: I need a few days to think it over.
        - (the tree is cut here)
  - You: This is a two-way street. I'll need your vote on mine.
    - Alicia Keller: I can't make that deal.
    - *Ends open: Alicia Keller: You'll need friends after this vote. I won't be one.*
  - You: I haven't decided yet.
    - Alicia Keller: I'm asking as a friend.
    - You: All right. You win. I'm in.
      - Alicia Keller: You won't regret it.
      - *Ends resolved*
    - You: I've made up my mind. It's no.
      - Alicia Keller: Without this, I've got nothing to take home.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I'm sorry, but I'm a no on "Inclusionary requirement".
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: Let me sleep on it.
        - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Alicia Keller: That's not on the table.
      - *Ends open: Alicia Keller: I hope you know what this costs you.*
    - You: Let me think about it.
      - Alicia Keller: I need this one. I promised my district I'd deliver.
      - You: All right. You win. I'm in.
        - (the tree is cut here)
      - You: I'm sorry, but I'm a no on "Inclusionary requirement".
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: Let me sleep on it.
        - (the tree is cut here)
- You: I'm still with you.
  - *if Alicia Keller knows:*
    - Alicia Keller: Zachary Shepard says you're voting no.
    - You: All right. Here's the truth.
      - Alicia Keller: Thank you for telling me straight.
      - *Ends open*
    - You: People say a lot of things.
      - Alicia Keller: Take your time, but I need an answer.
      - You: You've made your point. Count me in.
        - *Ends resolved*
      - You: I've made up my mind. It's no.
        - *Ends refused: Alicia Keller: You'll need friends after this vote. I won't be one.*
      - You: This is a two-way street. I'll need your vote on mine.
        - *Ends open: Alicia Keller: You'll need friends after this vote. I won't be one.*
    - You: Then Zachary Shepard has it wrong.
      - *Ends open: Alicia Keller: I'll call you before the vote.*
  - *if not:*
    - Alicia Keller: That's a relief.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.name-stops-by-your-office-you-told-name-you-d-vote-yes-on-bill]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.i-won-t-take-long]; L3 state/ask/scene-talk/calm/7w1s [scene-talk.state-ask.you-re-still-a-yes-on-bill]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/withdraw/scene-talk/contrite/13w2s [scene-talk.reply-withdraw.i-gave-you-my-word-and-i-m-going-back-on-it-i-m-sorry]; L6 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L9 follow/thank/scene-talk/guarded/6w2s [scene-talk.follow-thank.good-i-ll-hold-you-to-that]</sub>

**Profile cold** (outcome resolved)

**Alicia Keller:** Do you have a minute?

**Alicia Keller:** You're still a yes on "Inclusionary requirement"?

You could say:

1. You have my vote.  *(the page follows this one)*
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

1. Count me in.  *(the page follows this one)*
2. I gave you my word, and I'm going back on it. I'm sorry.
3. I'll vote yes, but I'm going to need a favor from you.
4. I need a few days to think it over.
5. I'm still with you.

**Alicia Keller:** You won't regret it.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.name-stops-by-your-office-you-told-name-you-d-vote-yes-on-bill]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/ask/scene-talk/anxious/13w2s [scene-talk.state-ask.i-told-the-others-i-had-your-vote-on-bill-do-i]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/withdraw/scene-talk/contrite/13w2s [scene-talk.reply-withdraw.i-gave-you-my-word-and-i-m-going-back-on-it-i-m-sorry]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L9 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

**Profile anxious** (outcome open)

**Alicia Keller:** Got a second?

**Alicia Keller:** We're still good on "Inclusionary requirement", right?

You could say:

1. Count me in.
2. I'm really worried about this vote. I can't do it.
3. This is a two-way street. I'll need your vote on mine.
4. I'm still undecided. Give me until the vote.  *(the page follows this one)*
5. I'm still with you.

**Alicia Keller:** You know what this means to me.

You could say:

1. Okay. For you, I'll do it.
2. I can't vote for "Inclusionary requirement".
3. What's in it for my district?
4. Let me think about it.  *(the page follows this one)*

**Alicia Keller:** I need this one. I promised my district I'd deliver.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't vote for "Inclusionary requirement".
3. What's in it for my district?
4. I haven't decided yet.  *(the page follows this one)*

**Alicia Keller:** Without this, I've got nothing to take home.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I've made up my mind. It's no.
3. I'll vote yes, but I'm going to need a favor from you.
4. I'm still weighing it.  *(the page follows this one)*

**Alicia Keller:** Please. Think about the people this helps.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I've made up my mind. It's no.
3. What's in it for my district?
4. I need a few days to think it over.  *(the page follows this one)*

**Alicia Keller:** I wouldn't ask if it didn't matter.

**Alicia Keller:** Don't take too long.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.name-stops-by-your-office-you-told-name-you-d-vote-yes-on-bill]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/ask/scene-talk/calm/7w1s [scene-talk.state-ask.we-re-still-good-on-bill-right]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L7 reply/stall/scene-talk/guarded/8w2s [scene-talk.reply-stall.i-m-still-undecided-give-me-until-the-vote]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L50 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.you-know-what-this-means-to-me]; L51 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L52 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L53 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L54 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L87 follow/plea/scene-talk/anxious/10w2s [scene-talk.follow-plea.i-need-this-one-i-promised-my-district-i-d-deliver]; L88 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L89 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L90 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L91 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L112 follow/plea/scene-talk/anxious/8w1s [scene-talk.follow-plea.without-this-i-ve-got-nothing-to-take-home]; L113 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L114 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L115 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L116 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L125 follow/plea/scene-talk/tender/7w2s [scene-talk.follow-plea.please-think-about-the-people-this-helps]; L126 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L127 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L128 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L129 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L130 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.i-wouldn-t-ask-if-it-didn-t-matter]; L131 close/press/scene-talk/braced/4w1s [scene-talk.close-press.don-t-take-too-long]</sub>

**Profile boastful** (outcome resolved)

**Alicia Keller:** I won't take long.

**Alicia Keller:** You're still a yes on "Inclusionary requirement"?

You could say:

1. Fine. You have it.  *(the page follows this one)*
2. I gave you my word, and I'm going back on it. I'm sorry.
3. This is a two-way street. I'll need your vote on mine.
4. I haven't decided yet.
5. I'm still with you.

**Alicia Keller:** You won't regret it.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.name-stops-by-your-office-you-told-name-you-d-vote-yes-on-bill]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.i-won-t-take-long]; L3 state/ask/scene-talk/calm/7w1s [scene-talk.state-ask.you-re-still-a-yes-on-bill]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/withdraw/scene-talk/contrite/13w2s [scene-talk.reply-withdraw.i-gave-you-my-word-and-i-m-going-back-on-it-i-m-sorry]; L6 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L9 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

## Scene 11: vote-confirmed (vote-wanted, ends in bill) — proof scene

*Purpose confirm-vote. Records: bill:office:gus2025:101811:board:2026-10-27:person_a52334a2a50177be:2, person_9e002a561a4b29bc, person_bf349ec8efe6104f, office:gus2025:101811:board, promise:person_bf349ec8efe6104f:2026-11-02:interview:outlet:cable:0:national:us-policy-positions:housing-land-use.allow-multifamily-in-single-family-zones.*

> You promised Kelly Riggs your vote on "Allow multifamily in single family zones". Kelly Riggs is at your door to make sure.

**Profile warm** (outcome resolved)

**Kelly Riggs:** Got a second?

**Kelly Riggs:** I told the others I had your vote on "Allow multifamily in single family zones". Do I?

You could say:

1. I'm with you on "Allow multifamily in single family zones".  *(the page follows this one)*
2. I'm really worried about this vote. I can't do it.
3. What's in it for my district?
4. Let me think about it.
5. Nothing's changed. You have my vote.

**Kelly Riggs:** You won't regret it.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, open, open, resolved, open, open, resolved, resolved, open, open, resolved, open, open, resolved, resolved, resolved, open, open, resolved, open, resolved, open, open, resolved, refused, open, open, resolved; ★ is the branch this profile's traits lean toward):

- You ★: I'm with you on "Allow multifamily in single family zones".
  - Kelly Riggs: You won't regret it.
  - *Ends resolved*
- You: I'm really worried about this vote. I can't do it.
  - Kelly Riggs: Please. Think about the people this helps.
  - You: Okay. For you, I'll do it.
    - Kelly Riggs: You won't regret it.
    - *Ends resolved*
  - You: I've made up my mind. It's no.
    - Kelly Riggs: You know what this means to me.
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: I knew I could count on you.
      - *Ends resolved*
    - You: I'm sorry, but I'm a no on "Allow multifamily in single family zones".
      - Kelly Riggs: Without this, I've got nothing to take home.
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: I knew I could count on you.
        - *Ends resolved*
      - You: I can't vote for "Allow multifamily in single family zones".
        - Kelly Riggs: I could lose my primary over this.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Kelly Riggs: Deal.
        - *Ends open*
      - You: I need a few days to think it over.
        - Kelly Riggs: I'm asking as a friend.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't vote for "Allow multifamily in single family zones".
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
    - You: What's in it for my district?
      - Kelly Riggs: Deal.
      - *Ends open*
    - You: I need a few days to think it over.
      - Kelly Riggs: I need this one. I promised my district I'd deliver.
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: I knew I could count on you.
        - *Ends resolved*
      - You: I can't vote for "Allow multifamily in single family zones".
        - Kelly Riggs: I wouldn't ask if it didn't matter.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Allow multifamily in single family zones".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: What's in it for my district?
        - Kelly Riggs: All right. We have a deal.
        - *Ends open*
      - You: Let me think about it.
        - Kelly Riggs: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Allow multifamily in single family zones".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
  - You: This is a two-way street. I'll need your vote on mine.
    - Kelly Riggs: All right. We have a deal.
    - *Ends open*
  - You: I'm still weighing it.
    - Kelly Riggs: You know what this means to me.
    - You: All right. You win. I'm in.
      - Kelly Riggs: I knew I could count on you.
      - *Ends resolved*
    - You: I've made up my mind. It's no.
      - Kelly Riggs: I could lose my primary over this.
      - You: All right. You win. I'm in.
        - Kelly Riggs: You won't regret it.
        - *Ends resolved*
      - You: I can't vote for "Allow multifamily in single family zones".
        - Kelly Riggs: Without this, I've got nothing to take home.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Allow multifamily in single family zones".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: What's in it for my district?
        - Kelly Riggs: Deal.
        - *Ends open*
      - You: Let me think about it.
        - Kelly Riggs: I wouldn't ask if it didn't matter.
        - You: Fine. I'll do it, but this is the last time.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Allow multifamily in single family zones".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Kelly Riggs: That I can live with.
      - *Ends open*
    - You: Let me think about it.
      - Kelly Riggs: I need this one. I promised my district I'd deliver.
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: Thank you. I won't forget it.
        - *Ends resolved*
      - You: I can't vote for "Allow multifamily in single family zones".
        - Kelly Riggs: I'm asking as a friend.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Kelly Riggs: All right. We have a deal.
        - *Ends open*
      - You: Let me sleep on it.
        - Kelly Riggs: I'm asking as a friend.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
- You: What's in it for my district?
  - Kelly Riggs: That I can live with.
  - *Ends open*
- You: Let me think about it.
  - Kelly Riggs: I could lose my primary over this.
  - You: You've made your point. Count me in.
    - Kelly Riggs: You won't regret it.
    - *Ends resolved*
  - You: I'm sorry, but I'm a no on "Allow multifamily in single family zones".
    - Kelly Riggs: Please. Think about the people this helps.
    - You: Fine. I'll do it, but this is the last time.
      - Kelly Riggs: Thank you. Really.
      - *Ends resolved*
    - You: I've made up my mind. It's no.
      - Kelly Riggs: Without this, I've got nothing to take home.
      - You: All right. You win. I'm in.
        - Kelly Riggs: I knew I could count on you.
        - *Ends resolved*
      - You: I can't vote for "Allow multifamily in single family zones".
        - Kelly Riggs: I wouldn't ask if it didn't matter.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: What's in it for my district?
          - (the tree is cut here)
        - You: I'm still undecided. Give me until the vote.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Kelly Riggs: Deal.
        - *Ends open*
      - You: I haven't decided yet.
        - Kelly Riggs: I'm asking as a friend.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't vote for "Allow multifamily in single family zones".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Kelly Riggs: All right. We have a deal.
      - *Ends open*
    - You: Let me sleep on it.
      - Kelly Riggs: I wouldn't ask if it didn't matter.
      - You: You've made your point. Count me in.
        - Kelly Riggs: You won't regret it.
        - *Ends resolved*
      - You: I can't vote for "Allow multifamily in single family zones".
        - Kelly Riggs: I'm asking as a friend.
        - You: Fine. I'll do it, but this is the last time.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: I need a few days to think it over.
        - (the tree is cut here)
  - You: What's in it for my district?
    - Kelly Riggs: Deal.
    - *Ends open*
  - You: I haven't decided yet.
    - Kelly Riggs: You know what this means to me.
    - You: You've made your point. Count me in.
      - Kelly Riggs: Thank you. Really.
      - *Ends resolved*
    - You: I've made up my mind. It's no.
      - Kelly Riggs: Without this, I've got nothing to take home.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I'm sorry, but I'm a no on "Allow multifamily in single family zones".
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Kelly Riggs: All right. We have a deal.
      - *Ends open*
    - You: I need a few days to think it over.
      - Kelly Riggs: I wouldn't ask if it didn't matter.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
- You: Nothing's changed. You have my vote.
  - *if Kelly Riggs knows:*
    - Kelly Riggs: Zachary Shepard says you're voting no.
    - You: All right. Here's the truth.
      - Kelly Riggs: Thank you for telling me straight.
      - *Ends open*
    - You: People say a lot of things.
      - Kelly Riggs: What would it take?
      - You: Fine. I'll do it, but this is the last time.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Allow multifamily in single family zones".
        - *Ends refused: Kelly Riggs: You'll need friends after this vote. I won't be one.*
      - You: This is a two-way street. I'll need your vote on mine.
        - *Ends open: Kelly Riggs: I'll call you before the vote.*
    - You: Then Zachary Shepard has it wrong.
      - *Ends open: Kelly Riggs: You'll need friends after this vote. I won't be one.*
  - *if not:*
    - Kelly Riggs: That's a relief.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/anxious/22w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/ask/scene-talk/anxious/17w2s [scene-talk.state-ask.i-told-the-others-i-had-your-vote-on-bill-do-i]; L4 reply/agree/scene-talk/calm/10w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/6w2s [scene-talk.reply-lie.nothing-s-changed-you-have-my-vote]; L9 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

**Profile cold** (outcome resolved)

**Kelly Riggs:** Got a second?

**Kelly Riggs:** I told the others I had your vote on "Allow multifamily in single family zones". Do I?

You could say:

1. Fine. You have it.  *(the page follows this one)*
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

1. Fine. You have it.  *(the page follows this one)*
2. I'm really worried about this vote. I can't do it.
3. What's in it for my district?
4. I haven't decided yet.
5. I'm still with you.

**Kelly Riggs:** I knew I could count on you.

<sub>L1 narrate/narrate/scene-talk/anxious/22w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/ask/scene-talk/calm/11w1s [scene-talk.state-ask.we-re-still-good-on-bill-right]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L9 follow/thank/scene-talk/glad/7w1s [scene-talk.follow-thank.i-knew-i-could-count-on-you]</sub>

**Profile anxious** (outcome open)

**Kelly Riggs:** You got a minute?

**Kelly Riggs:** I told the others I had your vote on "Allow multifamily in single family zones". Do I?

You could say:

1. Fine. You have it.
2. I'm really worried about this vote. I can't do it.
3. I'll vote yes, but I'm going to need a favor from you.
4. Let me think about it.  *(the page follows this one)*
5. Nothing's changed. You have my vote.

**Kelly Riggs:** You know what this means to me.

You could say:

1. You've made your point. Count me in.
2. I'm sorry, but I'm a no on "Allow multifamily in single family zones".
3. I'll vote yes, but I'm going to need a favor from you.
4. I need a few days to think it over.  *(the page follows this one)*

**Kelly Riggs:** I wouldn't ask if it didn't matter.

You could say:

1. Okay. For you, I'll do it.
2. I can't vote for "Allow multifamily in single family zones".
3. This is a two-way street. I'll need your vote on mine.
4. I haven't decided yet.  *(the page follows this one)*

**Kelly Riggs:** Without this, I've got nothing to take home.

You could say:

1. Okay. For you, I'll do it.
2. I've made up my mind. It's no.
3. I'll vote yes, but I'm going to need a favor from you.
4. I'm still undecided. Give me until the vote.  *(the page follows this one)*

**Kelly Riggs:** Please. Think about the people this helps.

You could say:

1. You've made your point. Count me in.
2. I'm sorry, but I'm a no on "Allow multifamily in single family zones".
3. What's in it for my district?
4. Let me sleep on it.  *(the page follows this one)*

**Kelly Riggs:** I could lose my primary over this.

**Kelly Riggs:** I won't forget this.

<sub>L1 narrate/narrate/scene-talk/anxious/22w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/ask/scene-talk/anxious/17w2s [scene-talk.state-ask.i-told-the-others-i-had-your-vote-on-bill-do-i]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/6w2s [scene-talk.reply-lie.nothing-s-changed-you-have-my-vote]; L37 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.you-know-what-this-means-to-me]; L38 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L39 reply/refuse/scene-talk/guarded/13w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L40 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L41 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L63 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.i-wouldn-t-ask-if-it-didn-t-matter]; L64 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L65 reply/refuse/scene-talk/guarded/10w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L66 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L67 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L84 follow/plea/scene-talk/anxious/8w1s [scene-talk.follow-plea.without-this-i-ve-got-nothing-to-take-home]; L85 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L86 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L87 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L88 reply/stall/scene-talk/guarded/8w2s [scene-talk.reply-stall.i-m-still-undecided-give-me-until-the-vote]; L99 follow/plea/scene-talk/tender/7w2s [scene-talk.follow-plea.please-think-about-the-people-this-helps]; L100 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L101 reply/refuse/scene-talk/guarded/13w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L102 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L103 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L108 follow/plea/scene-talk/anxious/7w1s [scene-talk.follow-plea.i-could-lose-my-primary-over-this]; L109 close/warn/scene-talk/braced/4w1s [scene-talk.close-warn.i-won-t-forget-this]</sub>

**Profile boastful** (outcome resolved)

**Kelly Riggs:** Do you have a minute?

**Kelly Riggs:** I told the others I had your vote on "Allow multifamily in single family zones". Do I?

You could say:

1. Fine. You have it.  *(the page follows this one)*
2. I gave you my word, and I'm going back on it. I'm sorry.
3. This is a two-way street. I'll need your vote on mine.
4. Let me think about it.
5. Nothing's changed. You have my vote.

**Kelly Riggs:** I knew I could count on you.

<sub>L1 narrate/narrate/scene-talk/anxious/22w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/ask/scene-talk/anxious/17w2s [scene-talk.state-ask.i-told-the-others-i-had-your-vote-on-bill-do-i]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/withdraw/scene-talk/contrite/13w2s [scene-talk.reply-withdraw.i-gave-you-my-word-and-i-m-going-back-on-it-i-m-sorry]; L6 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/6w2s [scene-talk.reply-lie.nothing-s-changed-you-have-my-vote]; L9 follow/thank/scene-talk/glad/7w1s [scene-talk.follow-thank.i-knew-i-could-count-on-you]</sub>

## Scene 12: vote-confirmed (vote-wanted, ends in bill) — proof scene

*Purpose confirm-vote. Records: bill:office:gus2025:101811:board:2026-10-27:person_a52334a2a50177be:3, person_bf349ec8efe6104f, person_a52334a2a50177be, office:gus2025:101811:board, promise:person_a52334a2a50177be:2026-10-26:interview:outlet:cable:0:national:us-policy-positions:justice-public-safety.civilian-oversight-of-police.*

> You promised Megan Nixon your vote on "Civilian oversight of police". Megan Nixon is at your door to make sure.

**Profile warm** (outcome open)

**Megan Nixon:** You got a minute?

**Megan Nixon:** We're still good on "Civilian oversight of police", right?

You could say:

1. Count me in.
2. I've thought it over. I can't vote for "Civilian oversight of police" after all.
3. What's in it for my district?  *(the page follows this one)*
4. Let me think about it.
5. I'm still with you.

**Megan Nixon:** All right. We have a deal.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, open, open, resolved, open, open, resolved, resolved, open, open, resolved, open, open, resolved, resolved, resolved, open, open, resolved, open, resolved, open, open, resolved, refused, open, open, resolved; ★ is the branch this profile's traits lean toward):

- You: Count me in.
  - Megan Nixon: I knew I could count on you.
  - *Ends resolved*
- You: I've thought it over. I can't vote for "Civilian oversight of police" after all.
  - Megan Nixon: Please. Think about the people this helps.
  - You: You've made your point. Count me in.
    - Megan Nixon: I knew I could count on you.
    - *Ends resolved*
  - You: I've made up my mind. It's no.
    - Megan Nixon: I wouldn't ask if it didn't matter.
    - You: You've made your point. Count me in.
      - Megan Nixon: Thank you. Really.
      - *Ends resolved*
    - You: I'm sorry, but I'm a no on "Civilian oversight of police".
      - Megan Nixon: I could lose my primary over this.
      - You: Okay. For you, I'll do it.
        - Megan Nixon: Good. I'll hold you to that.
        - *Ends resolved*
      - You: I can't vote for "Civilian oversight of police".
        - Megan Nixon: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
      - You: What's in it for my district?
        - Megan Nixon: Deal.
        - *Ends open*
      - You: Let me sleep on it.
        - Megan Nixon: I'm asking as a friend.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I can't vote for "Civilian oversight of police".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
    - You: I'll vote yes, but I'm going to need a favor from you.
      - Megan Nixon: All right. We have a deal.
      - *Ends open*
    - You: I'm still weighing it.
      - Megan Nixon: You know what this means to me.
      - You: Okay. For you, I'll do it.
        - Megan Nixon: Thank you. I won't forget it.
        - *Ends resolved*
      - You: I can't vote for "Civilian oversight of police".
        - Megan Nixon: I'm asking as a friend.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Civilian oversight of police".
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Megan Nixon: That I can live with.
        - *Ends open*
      - You: Let me sleep on it.
        - Megan Nixon: I'm asking as a friend.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Civilian oversight of police".
          - (the tree is cut here)
        - You: What's in it for my district?
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
  - You: What's in it for my district?
    - Megan Nixon: That I can live with.
    - *Ends open*
  - You: Let me sleep on it.
    - Megan Nixon: Without this, I've got nothing to take home.
    - You: Okay. For you, I'll do it.
      - Megan Nixon: You won't regret it.
      - *Ends resolved*
    - You: I'm sorry, but I'm a no on "Civilian oversight of police".
      - Megan Nixon: I wouldn't ask if it didn't matter.
      - You: Okay. For you, I'll do it.
        - Megan Nixon: You won't regret it.
        - *Ends resolved*
      - You: I've made up my mind. It's no.
        - Megan Nixon: I need this one. I promised my district I'd deliver.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Civilian oversight of police".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Megan Nixon: That I can live with.
        - *Ends open*
      - You: I need a few days to think it over.
        - Megan Nixon: I'm asking as a friend.
        - You: Fine. I'll do it, but this is the last time.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: What's in it for my district?
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Megan Nixon: All right. We have a deal.
      - *Ends open*
    - You: I'm still undecided. Give me until the vote.
      - Megan Nixon: I'm asking as a friend.
      - You: Okay. For you, I'll do it.
        - Megan Nixon: Thank you. Really.
        - *Ends resolved*
      - You: I've made up my mind. It's no.
        - Megan Nixon: I could lose my primary over this.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Civilian oversight of police".
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - Megan Nixon: That I can live with.
        - *Ends open*
      - You: Let me think about it.
        - Megan Nixon: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: I'll vote yes, but I'm going to need a favor from you.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
- You ★: What's in it for my district?
  - Megan Nixon: All right. We have a deal.
  - *Ends open*
- You: Let me think about it.
  - Megan Nixon: I'm asking as a friend.
  - You: Okay. For you, I'll do it.
    - Megan Nixon: You won't regret it.
    - *Ends resolved*
  - You: I've made up my mind. It's no.
    - Megan Nixon: I wouldn't ask if it didn't matter.
    - You: All right. You win. I'm in.
      - Megan Nixon: Thank you. I won't forget it.
      - *Ends resolved*
    - You: I can't vote for "Civilian oversight of police".
      - Megan Nixon: You know what this means to me.
      - You: Okay. For you, I'll do it.
        - Megan Nixon: Thank you. Really.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Civilian oversight of police".
        - Megan Nixon: I could lose my primary over this.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: What's in it for my district?
        - Megan Nixon: All right. We have a deal.
        - *Ends open*
      - You: Let me sleep on it.
        - Megan Nixon: Please. Think about the people this helps.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Civilian oversight of police".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Megan Nixon: That I can live with.
      - *Ends open*
    - You: Let me sleep on it.
      - Megan Nixon: Please. Think about the people this helps.
      - You: Okay. For you, I'll do it.
        - Megan Nixon: Thank you. Really.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Civilian oversight of police".
        - Megan Nixon: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Civilian oversight of police".
          - (the tree is cut here)
        - You: This is a two-way street. I'll need your vote on mine.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
  - You: This is a two-way street. I'll need your vote on mine.
    - Megan Nixon: All right. We have a deal.
    - *Ends open*
  - You: I'm still weighing it.
    - Megan Nixon: I could lose my primary over this.
    - You: Okay. For you, I'll do it.
      - Megan Nixon: I knew I could count on you.
      - *Ends resolved*
    - You: I've made up my mind. It's no.
      - Megan Nixon: I need this one. I promised my district I'd deliver.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I'm sorry, but I'm a no on "Civilian oversight of police".
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: Let me sleep on it.
        - (the tree is cut here)
    - You: This is a two-way street. I'll need your vote on mine.
      - Megan Nixon: All right. We have a deal.
      - *Ends open*
    - You: Let me sleep on it.
      - Megan Nixon: I need this one. I promised my district I'd deliver.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: This is a two-way street. I'll need your vote on mine.
        - (the tree is cut here)
      - You: I need a few days to think it over.
        - (the tree is cut here)
- You: I'm still with you.
  - *if Megan Nixon knows:*
    - Megan Nixon: That's not what you told Zachary Shepard.
    - You: You're right. I shouldn't have said that.
      - Megan Nixon: Thank you for telling me straight.
      - *Ends open*
    - You: People say a lot of things.
      - Megan Nixon: What would it take?
      - You: You've made your point. Count me in.
        - *Ends resolved*
      - You: I've made up my mind. It's no.
        - *Ends refused: Megan Nixon: You'll need friends after this vote. I won't be one.*
      - You: This is a two-way street. I'll need your vote on mine.
        - *Ends open: Megan Nixon: I hope you know what this costs you.*
    - You: Then Zachary Shepard has it wrong.
      - *Ends open: Megan Nixon: Don't take too long.*
  - *if not:*
    - Megan Nixon: That's a relief.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/anxious/20w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/ask/scene-talk/calm/9w1s [scene-talk.state-ask.we-re-still-good-on-bill-right]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/withdraw/scene-talk/contrite/14w2s [scene-talk.reply-withdraw.i-ve-thought-it-over-i-can-t-vote-for-bill-after-all]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L99 follow/accept/scene-talk/calm/6w2s [scene-talk.follow-accept.all-right-we-have-a-deal]</sub>

**Profile cold** (outcome open)

**Megan Nixon:** You got a minute?

**Megan Nixon:** We're still good on "Civilian oversight of police", right?

You could say:

1. Fine. You have it.
2. I've thought it over. I can't vote for "Civilian oversight of police" after all.
3. What's in it for my district?  *(the page follows this one)*
4. I'm still undecided. Give me until the vote.
5. I'm still with you.

**Megan Nixon:** All right. We have a deal.

<sub>L1 narrate/narrate/scene-talk/anxious/20w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/ask/scene-talk/calm/9w1s [scene-talk.state-ask.we-re-still-good-on-bill-right]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/withdraw/scene-talk/contrite/14w2s [scene-talk.reply-withdraw.i-ve-thought-it-over-i-can-t-vote-for-bill-after-all]; L6 reply/bargain/scene-talk/guarded/6w1s [scene-talk.reply-bargain.what-s-in-it-for-my-district]; L7 reply/stall/scene-talk/guarded/8w2s [scene-talk.reply-stall.i-m-still-undecided-give-me-until-the-vote]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L36 follow/accept/scene-talk/calm/6w2s [scene-talk.follow-accept.all-right-we-have-a-deal]</sub>

**Profile stubborn** (outcome open)

**Megan Nixon:** You got a minute?

**Megan Nixon:** We're still good on "Civilian oversight of police", right?

You could say:

1. I'm with you on "Civilian oversight of police".
2. I've thought it over. I can't vote for "Civilian oversight of police" after all.
3. I'll vote yes, but I'm going to need a favor from you.  *(the page follows this one)*
4. I'm still weighing it.
5. I'm still with you.

**Megan Nixon:** I can't make that deal.

**Megan Nixon:** Think it over. I'll be back tomorrow.

<sub>L1 narrate/narrate/scene-talk/anxious/20w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/ask/scene-talk/calm/9w1s [scene-talk.state-ask.we-re-still-good-on-bill-right]; L4 reply/agree/scene-talk/calm/8w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/withdraw/scene-talk/contrite/14w2s [scene-talk.reply-withdraw.i-ve-thought-it-over-i-can-t-vote-for-bill-after-all]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L39 follow/refuse/scene-talk/guarded/5w1s [scene-talk.follow-refuse.i-can-t-make-that-deal]; L40 close/press/scene-talk/braced/7w2s [scene-talk.close-press.think-it-over-i-ll-be-back-tomorrow]</sub>

**Profile anxious** (outcome open)

**Megan Nixon:** Sorry to bother you.

**Megan Nixon:** We're still good on "Civilian oversight of police", right?

You could say:

1. Count me in.
2. I'm really worried about this vote. I can't do it.
3. I'll vote yes, but I'm going to need a favor from you.  *(the page follows this one)*
4. I haven't decided yet.
5. I'm still with you.

**Megan Nixon:** All right. We have a deal.

<sub>L1 narrate/narrate/scene-talk/anxious/20w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/ask/scene-talk/calm/9w1s [scene-talk.state-ask.we-re-still-good-on-bill-right]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L36 follow/accept/scene-talk/calm/6w2s [scene-talk.follow-accept.all-right-we-have-a-deal]</sub>

**Profile boastful** (outcome open)

**Megan Nixon:** Sorry to bother you.

**Megan Nixon:** We're still good on "Civilian oversight of police", right?

You could say:

1. I'm with you on "Civilian oversight of police".
2. I've thought it over. I can't vote for "Civilian oversight of police" after all.
3. This is a two-way street. I'll need your vote on mine.  *(the page follows this one)*
4. I'm still weighing it.
5. I'm still with you.

**Megan Nixon:** All right. We have a deal.

<sub>L1 narrate/narrate/scene-talk/anxious/20w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/ask/scene-talk/calm/9w1s [scene-talk.state-ask.we-re-still-good-on-bill-right]; L4 reply/agree/scene-talk/calm/8w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/withdraw/scene-talk/contrite/14w2s [scene-talk.reply-withdraw.i-ve-thought-it-over-i-can-t-vote-for-bill-after-all]; L6 reply/bargain/scene-talk/calm/11w2s [scene-talk.reply-bargain.this-is-a-two-way-street-i-ll-need-your-vote-on-mine]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L36 follow/accept/scene-talk/calm/6w2s [scene-talk.follow-accept.all-right-we-have-a-deal]</sub>

## Scene 13: bill-carry (favor-asked, ends in bill) — proof scene

*Purpose carry-bill. Records: bill:office:gus2025:101811:board:2027-03-26:person_9e002a561a4b29bc:58, person_9e002a561a4b29bc, person_9e002b561a4b2b6f, office:gus2025:101811:board.*

> Kelly Riggs has worked on "Inclusionary requirement" for months and needs someone to carry it.

**Profile warm** (outcome resolved)

**Kelly Riggs:** Do you have a minute?

**Kelly Riggs:** Would you put your name on "Inclusionary requirement"?

You could say:

1. I'll carry it.  *(the page follows this one)*
2. I wish I could, but I can't.
3. I'll carry it if you'll help me find the votes.
4. Let me sleep on it.
5. I'm already carrying two bills. I don't have room.

**Kelly Riggs:** I knew I could count on you.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, open, open, open, resolved, open, open, open, resolved, resolved, open, open, open, resolved, resolved, open, open, open, resolved, open, resolved, refused, open, open, resolved; ★ is the branch this profile's traits lean toward):

- You ★: I'll carry it.
  - Kelly Riggs: I knew I could count on you.
  - *Ends resolved*
- You: I wish I could, but I can't.
  - Kelly Riggs: I wouldn't ask if it didn't matter.
  - You: Fine. I'll do it, but this is the last time.
    - Kelly Riggs: Thank you. Really.
    - *Ends resolved*
  - You: I'm sorry. I just can't.
    - Kelly Riggs: I'm asking as a friend.
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: Thank you. Really.
      - *Ends resolved*
    - You: The answer is no.
      - Kelly Riggs: I could lose my primary over this.
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: Thank you. Really.
        - *Ends resolved*
      - You: I can't do that.
        - Kelly Riggs: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry. I just can't.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - Kelly Riggs: That I can live with.
        - Kelly Riggs: Deal. Let's start with the count. Who can we get?
        - You: Where are we now?
          - (the tree is cut here)
        - You: I can bring the members from my side.
          - (the tree is cut here)
        - You: Give me a list of everyone who's undecided.
          - (the tree is cut here)
      - You: I'm still weighing it.
        - Kelly Riggs: Please. Think about the people this helps.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - Kelly Riggs: That I can live with.
      - Kelly Riggs: Deal. So where do you think the votes are?
      - You: Where are we now?
        - Kelly Riggs: We have 5. We need 4.
        - *Ends open: Kelly Riggs: Don't take too long.*
      - You: I can bring the members from my side.
        - Kelly Riggs: Good. Start there, and I'll work the rest.
        - *Ends open*
      - You: Give me a list of everyone who's undecided.
        - *Ends open: Kelly Riggs: Think it over. I'll be back tomorrow.*
    - You: I'm still weighing it.
      - Kelly Riggs: You know what this means to me.
      - You: You've made your point. Count me in.
        - Kelly Riggs: Thank you. I won't forget it.
        - *Ends resolved*
      - You: I can't do that.
        - Kelly Riggs: I need this one. I promised my district I'd deliver.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - Kelly Riggs: That I can live with.
        - Kelly Riggs: Deal. So where do you think the votes are?
        - You: Where are we now?
          - (the tree is cut here)
        - You: I can bring the members from my side.
          - (the tree is cut here)
        - You: Give me a list of everyone who's undecided.
          - (the tree is cut here)
      - You: I need a few days to think it over.
        - Kelly Riggs: I need this one. I promised my district I'd deliver.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
  - You: I'll carry it if you'll help me find the votes.
    - Kelly Riggs: Deal.
    - Kelly Riggs: Deal. Let's start with the count. Who can we get?
    - You: Where are we now?
      - Kelly Riggs: We have 5. We need 4.
      - *Ends open: Kelly Riggs: I won't forget this.*
    - You: I can bring the members from my side.
      - Kelly Riggs: Good. Start there, and I'll work the rest.
      - *Ends open*
    - You: Give me a list of everyone who's undecided.
      - *Ends open: Kelly Riggs: I won't forget this.*
  - You: I haven't decided yet.
    - Kelly Riggs: Without this, I've got nothing to take home.
    - You: All right. You win. I'm in.
      - Kelly Riggs: Thank you. I won't forget it.
      - *Ends resolved*
    - You: I'm sorry. I just can't.
      - Kelly Riggs: I could lose my primary over this.
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: Thank you. Really.
        - *Ends resolved*
      - You: I can't do that.
        - Kelly Riggs: I need this one. I promised my district I'd deliver.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - Kelly Riggs: All right. We have a deal.
      - Kelly Riggs: Deal. Let's start with the count. Who can we get?
      - You: Where are we now?
        - (the tree is cut here)
      - You: I can bring the members from my side.
        - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
    - You: Let me sleep on it.
      - Kelly Riggs: I'm asking as a friend.
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: Let me think about it.
        - (the tree is cut here)
- You: I'll carry it if you'll help me find the votes.
  - Kelly Riggs: That I can live with.
  - Kelly Riggs: Deal. So where do you think the votes are?
  - You: Where are we now?
    - Kelly Riggs: We have 5. We need 4.
    - *Ends open: Kelly Riggs: I won't forget this.*
  - You: I can bring the members from my side.
    - Kelly Riggs: Good. Start there, and I'll work the rest.
    - *Ends open*
  - You: Give me a list of everyone who's undecided.
    - *Ends open: Kelly Riggs: Think it over. I'll be back tomorrow.*
- You: Let me sleep on it.
  - Kelly Riggs: Please. Think about the people this helps.
  - You: Okay. For you, I'll do it.
    - Kelly Riggs: I knew I could count on you.
    - *Ends resolved*
  - You: I'm sorry. I just can't.
    - Kelly Riggs: You know what this means to me.
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: Thank you. Really.
      - *Ends resolved*
    - You: I can't do that.
      - Kelly Riggs: I wouldn't ask if it didn't matter.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: The answer is no.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: Let me think about it.
        - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - Kelly Riggs: Deal.
      - Kelly Riggs: Deal. Let's start with the count. Who can we get?
      - You: Where are we now?
        - (the tree is cut here)
      - You: I can bring the members from my side.
        - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
    - You: I need a few days to think it over.
      - Kelly Riggs: I wouldn't ask if it didn't matter.
      - You: Fine. I'll do it, but this is the last time.
        - (the tree is cut here)
      - You: I can't do that.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: I haven't decided yet.
        - (the tree is cut here)
  - You: I'll carry it if you'll help me find the votes.
    - Kelly Riggs: That I can live with.
    - Kelly Riggs: Deal. So where do you think the votes are?
    - You: Where are we now?
      - Kelly Riggs: We have 5. We need 4.
      - *Ends open: Kelly Riggs: Don't take too long.*
    - You: I can bring the members from my side.
      - Kelly Riggs: Good. Start there, and I'll work the rest.
      - *Ends open*
    - You: Give me a list of everyone who's undecided.
      - *Ends open: Kelly Riggs: Think it over. I'll be back tomorrow.*
  - You: I need a few days to think it over.
    - Kelly Riggs: Without this, I've got nothing to take home.
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: Good. I'll hold you to that.
      - *Ends resolved*
    - You: I'm sorry. I just can't.
      - Kelly Riggs: I need this one. I promised my district I'd deliver.
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: I can't do that.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: I haven't decided yet.
        - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - Kelly Riggs: Deal.
      - Kelly Riggs: Deal. Let's start with the count. Who can we get?
      - You: Where are we now?
        - (the tree is cut here)
      - You: I can bring the members from my side.
        - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
    - You: Let me think about it.
      - Kelly Riggs: You know what this means to me.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
- You: I'm already carrying two bills. I don't have room.
  - *if Kelly Riggs knows:*
    - Kelly Riggs: Zachary Shepard says you have room for one more.
    - You: You're right. I shouldn't have said that.
      - Kelly Riggs: Thank you for telling me straight.
      - *Ends open*
    - You: People say a lot of things.
      - Kelly Riggs: Take your time, but I need an answer.
      - You: Okay. For you, I'll do it.
        - *Ends resolved*
      - You: I'm sorry. I just can't.
        - *Ends refused: Kelly Riggs: I won't forget this.*
      - You: I'll carry it if you'll help me find the votes.
        - *Ends open: Kelly Riggs: Think it over. I'll be back tomorrow.*
    - You: Then Zachary Shepard has it wrong.
      - *Ends open: Kelly Riggs: I won't forget this.*
  - *if not:*
    - Kelly Riggs: Thank you. Really.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/calm/15w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.would-you-put-your-name-on-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.i-ll-carry-it]; L5 reply/decline/scene-talk/tender/7w1s [scene-talk.reply-decline.i-wish-i-could-but-i-can-t]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L9 follow/thank/scene-talk/glad/7w1s [scene-talk.follow-thank.i-knew-i-could-count-on-you]</sub>

**Profile cold** (outcome resolved)

**Kelly Riggs:** Do you have a minute?

**Kelly Riggs:** Would you put your name on "Inclusionary requirement"?

You could say:

1. Of course. I'm glad you asked.  *(the page follows this one)*
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

1. Of course. I'm glad you asked.  *(the page follows this one)*
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

1. I'll carry it.  *(the page follows this one)*
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

1. I'll carry it.  *(the page follows this one)*
2. I wish I could, but I can't.
3. I'll carry it if you'll help me find the votes.
4. Let me think about it.
5. I'm already carrying two bills. I don't have room.

**Kelly Riggs:** You won't regret it.

<sub>L1 narrate/narrate/scene-talk/calm/15w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.would-you-put-your-name-on-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.i-ll-carry-it]; L5 reply/decline/scene-talk/tender/7w1s [scene-talk.reply-decline.i-wish-i-could-but-i-can-t]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L9 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

## Scene 14: bill-carry (favor-asked, ends in bill) — proof scene

*Purpose carry-bill. Records: bill:office:US-DE:legislature-upper:2027-02-10:official:term:seat:US-DE:upper:020:0:2026-10-12:33, official:term:seat:US-DE:upper:020:0:2026-10-12, official:term:seat:US-DE:upper:017:0:2026-10-12, office:US-DE:legislature-upper.*

> John Serrano comes in with a folder under one arm. It's "Legalize cannabis sales", and it needs a sponsor.

**Profile warm** (outcome resolved)

**John Serrano:** Sorry to bother you.

**John Serrano:** I want you to carry "Legalize cannabis sales".

You could say:

1. All right. I'll do it.  *(the page follows this one)*
2. I'm not the right person to carry it.
3. I'll carry it if you'll help me find the votes.
4. I haven't decided yet.
5. I'm already carrying two bills. I don't have room.

**John Serrano:** Thank you. Really.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, open, open, open, resolved, open, open, open, resolved, resolved, open, open, open, resolved, open, open, resolved, resolved, open, open, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You ★: All right. I'll do it.
  - John Serrano: Thank you. Really.
  - *Ends resolved*
- You: I'm not the right person to carry it.
  - John Serrano: I'm asking as a friend.
  - You: Okay. For you, I'll do it.
    - John Serrano: Thank you. Really.
    - *Ends resolved*
  - You: I'm sorry. I just can't.
    - John Serrano: I could lose my primary over this.
    - You: You've made your point. Count me in.
      - John Serrano: Thank you. I won't forget it.
      - *Ends resolved*
    - You: I can't do that.
      - John Serrano: I wouldn't ask if it didn't matter.
      - You: You've made your point. Count me in.
        - John Serrano: Thank you. I won't forget it.
        - *Ends resolved*
      - You: The answer is no.
        - John Serrano: Without this, I've got nothing to take home.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I'm sorry. I just can't.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - John Serrano: All right. We have a deal.
        - John Serrano: Deal. So where do you think the votes are?
        - You: Where are we now?
          - (the tree is cut here)
        - You: I can bring the members from my side.
          - (the tree is cut here)
        - You: Give me a list of everyone who's undecided.
          - (the tree is cut here)
      - You: I haven't decided yet.
        - John Serrano: Please. Think about the people this helps.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - John Serrano: That I can live with.
      - John Serrano: Deal. So where do you think the votes are?
      - You: Where are we now?
        - John Serrano: We're close, but not there yet.
        - *Ends open: John Serrano: I won't forget this.*
      - You: I can bring the members from my side.
        - John Serrano: Good. Start there, and I'll work the rest.
        - *Ends open*
      - You: Give me a list of everyone who's undecided.
        - *Ends open: John Serrano: Don't take too long.*
    - You: Let me sleep on it.
      - John Serrano: I wouldn't ask if it didn't matter.
      - You: All right. You win. I'm in.
        - John Serrano: I knew I could count on you.
        - *Ends resolved*
      - You: I can't do that.
        - John Serrano: Please. Think about the people this helps.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - John Serrano: Deal.
        - John Serrano: Deal. So where do you think the votes are?
        - You: Where are we now?
          - (the tree is cut here)
        - You: I can bring the members from my side.
          - (the tree is cut here)
        - You: Give me a list of everyone who's undecided.
          - (the tree is cut here)
      - You: I'm still weighing it.
        - John Serrano: Please. Think about the people this helps.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
  - You: I'll carry it if you'll help me find the votes.
    - John Serrano: Deal.
    - John Serrano: Deal. Let's start with the count. Who can we get?
    - You: Where are we now?
      - John Serrano: We're close, but not there yet.
      - *Ends open: John Serrano: I won't forget this.*
    - You: I can bring the members from my side.
      - John Serrano: Good. Start there, and I'll work the rest.
      - *Ends open*
    - You: Give me a list of everyone who's undecided.
      - *Ends open: John Serrano: I won't forget this.*
  - You: I haven't decided yet.
    - John Serrano: I need this one. I promised my district I'd deliver.
    - You: You've made your point. Count me in.
      - John Serrano: Thank you. I won't forget it.
      - *Ends resolved*
    - You: I'm sorry. I just can't.
      - John Serrano: You know what this means to me.
      - You: Okay. For you, I'll do it.
        - John Serrano: Thank you. Really.
        - *Ends resolved*
      - You: The answer is no.
        - John Serrano: Please. Think about the people this helps.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - John Serrano: Deal.
        - John Serrano: Deal. So where do you think the votes are?
        - You: Where are we now?
          - (the tree is cut here)
        - You: I can bring the members from my side.
          - (the tree is cut here)
        - You: Give me a list of everyone who's undecided.
          - (the tree is cut here)
      - You: I'm still weighing it.
        - John Serrano: Please. Think about the people this helps.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - John Serrano: All right. We have a deal.
      - John Serrano: Deal. Let's start with the count. Who can we get?
      - You: Where are we now?
        - John Serrano: We're close, but not there yet.
        - *Ends open: John Serrano: Don't take too long.*
      - You: I can bring the members from my side.
        - John Serrano: Good. Start there, and I'll work the rest.
        - *Ends open*
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
    - You: Let me sleep on it.
      - John Serrano: Without this, I've got nothing to take home.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: Let me think about it.
        - (the tree is cut here)
- You: I'll carry it if you'll help me find the votes.
  - John Serrano: That I can live with.
  - John Serrano: Deal. So where do you think the votes are?
  - You: Where are we now?
    - John Serrano: We're close, but not there yet.
    - *Ends open: John Serrano: I won't forget this.*
  - You: I can bring the members from my side.
    - John Serrano: Take your time, but I need an answer.
    - You: You've made your point. Count me in.
      - John Serrano: Thank you. I won't forget it.
      - *Ends resolved*
    - You: I'm sorry. I just can't.
      - John Serrano: I need this one. I promised my district I'd deliver.
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: I can't do that.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: Let me think about it.
        - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - John Serrano: All right. We have a deal.
      - *Ends open*
  - You: Give me a list of everyone who's undecided.
    - *Ends open: John Serrano: I won't forget this.*
- You: I haven't decided yet.
  - John Serrano: Without this, I've got nothing to take home.
  - You: Okay. For you, I'll do it.
    - John Serrano: Thank you. Really.
    - *Ends resolved*
  - You: I'm sorry. I just can't.
    - John Serrano: I'm asking as a friend.
    - You: Okay. For you, I'll do it.
      - John Serrano: Thank you. Really.
      - *Ends resolved*
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
      - John Serrano: Deal.
      - John Serrano: Deal. So where do you think the votes are?
      - You: Where are we now?
        - (the tree is cut here)
      - You: I can bring the members from my side.
        - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
    - You: I'm still weighing it.
      - John Serrano: I wouldn't ask if it didn't matter.
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: The answer is no.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: I need a few days to think it over.
        - (the tree is cut here)
  - You: I'll carry it if you'll help me find the votes.
    - John Serrano: All right. We have a deal.
    - John Serrano: Deal. So where do you think the votes are?
    - You: Where are we now?
      - John Serrano: We're close, but not there yet.
      - *Ends open: John Serrano: Don't take too long.*
    - You: I can bring the members from my side.
      - John Serrano: I need a yes or a no.
      - You: All right. You win. I'm in.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
    - You: Give me a list of everyone who's undecided.
      - *Ends open: John Serrano: Don't take too long.*
  - You: I'm still weighing it.
    - John Serrano: I need this one. I promised my district I'd deliver.
    - You: You've made your point. Count me in.
      - John Serrano: You won't regret it.
      - *Ends resolved*
    - You: I'm sorry. I just can't.
      - John Serrano: Please. Think about the people this helps.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: The answer is no.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: Let me think about it.
        - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - John Serrano: All right. We have a deal.
      - John Serrano: Deal. So where do you think the votes are?
      - You: Where are we now?
        - (the tree is cut here)
      - You: I can bring the members from my side.
        - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
    - You: Let me sleep on it.
      - John Serrano: I wouldn't ask if it didn't matter.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: Let me think about it.
        - (the tree is cut here)
- You: I'm already carrying two bills. I don't have room.
  - *if not:*
    - John Serrano: I understand. Maybe next session.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/curious/19w2s [scene-talk.narrate-narrate.name-comes-in-with-a-folder-under-one-arm-it-s-bill-and-it-needs-a-spo]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L5 reply/decline/scene-talk/guarded/8w1s [scene-talk.reply-decline.i-m-not-the-right-person-to-carry-it]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L9 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile cold** (outcome refused)

**John Serrano:** Sorry to bother you.

**John Serrano:** I want you to carry "Legalize cannabis sales".

You could say:

1. Of course. I'm glad you asked.
2. I can't take that on right now.  *(the page follows this one)*
3. I'll carry it if you'll help me find the votes.
4. I haven't decided yet.
5. I'm already carrying two bills. I don't have room.

**John Serrano:** Suit yourself.

<sub>L1 narrate/narrate/scene-talk/curious/19w2s [scene-talk.narrate-narrate.name-comes-in-with-a-folder-under-one-arm-it-s-bill-and-it-needs-a-spo]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L5 reply/decline/scene-talk/guarded/7w1s [scene-talk.reply-decline.i-can-t-take-that-on-right-now]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L10 follow/accept/scene-talk/guarded/2w1s [scene-talk.follow-accept.suit-yourself]</sub>

**Profile stubborn** (outcome refused)

**John Serrano:** Sorry to bother you.

**John Serrano:** I want you to carry "Legalize cannabis sales".

You could say:

1. Yes. You can count on me.
2. I wish I could, but I can't.  *(the page follows this one)*
3. I'll carry it if you'll help me find the votes.
4. Let me think about it.
5. I'm already carrying two bills. I don't have room.

**John Serrano:** I need a yes or a no.

You could say:

1. Okay. For you, I'll do it.
2. The answer is no.  *(the page follows this one)*
3. I'll carry it if you'll help me find the votes.

**John Serrano:** What would it take?

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't do that.  *(the page follows this one)*
3. I'll carry it if you'll help me find the votes.

**John Serrano:** Yes or no?

You could say:

1. All right. You win. I'm in.
2. I'm sorry. I just can't.  *(the page follows this one)*
3. I'll carry it if you'll help me find the votes.

**John Serrano:** Take your time, but I need an answer.

You could say:

1. Fine. I'll do it, but this is the last time.
2. The answer is no.  *(the page follows this one)*
3. I'll carry it if you'll help me find the votes.

**John Serrano:** I could lose my primary over this.

**John Serrano:** I won't forget this.

<sub>L1 narrate/narrate/scene-talk/curious/19w2s [scene-talk.narrate-narrate.name-comes-in-with-a-folder-under-one-arm-it-s-bill-and-it-needs-a-spo]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L5 reply/decline/scene-talk/tender/7w1s [scene-talk.reply-decline.i-wish-i-could-but-i-can-t]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L10 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-a-yes-or-a-no]; L11 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L12 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L13 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L15 follow/press/scene-talk/calm/4w1s [scene-talk.follow-press.what-would-it-take]; L16 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L17 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L18 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L20 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L21 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L22 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L23 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L25 follow/press/scene-talk/calm/8w1s [scene-talk.follow-press.take-your-time-but-i-need-an-answer]; L26 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L27 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L28 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L30 follow/plea/scene-talk/anxious/7w1s [scene-talk.follow-plea.i-could-lose-my-primary-over-this]; L31 close/warn/scene-talk/braced/4w1s [scene-talk.close-warn.i-won-t-forget-this]</sub>

**Profile anxious** (outcome open)

**John Serrano:** Sorry to bother you.

**John Serrano:** I want you to carry "Legalize cannabis sales".

You could say:

1. I'll carry it.
2. I can't take that on right now.
3. I'll carry it if you'll help me find the votes.
4. Let me think about it.  *(the page follows this one)*
5. I'm already carrying two bills. I don't have room.

**John Serrano:** I could lose my primary over this.

You could say:

1. Okay. For you, I'll do it.
2. I'm sorry. I just can't.
3. I'll carry it if you'll help me find the votes.
4. I need a few days to think it over.  *(the page follows this one)*

**John Serrano:** Without this, I've got nothing to take home.

You could say:

1. All right. You win. I'm in.
2. I'm sorry. I just can't.
3. I'll carry it if you'll help me find the votes.
4. I'm still weighing it.  *(the page follows this one)*

**John Serrano:** I wouldn't ask if it didn't matter.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry. I just can't.
3. I'll carry it if you'll help me find the votes.
4. I haven't decided yet.  *(the page follows this one)*

**John Serrano:** I'm asking as a friend.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't do that.
3. I'll carry it if you'll help me find the votes.
4. Let me sleep on it.  *(the page follows this one)*

**John Serrano:** I need this one. I promised my district I'd deliver.

**John Serrano:** Think it over. I'll be back tomorrow.

<sub>L1 narrate/narrate/scene-talk/curious/19w2s [scene-talk.narrate-narrate.name-comes-in-with-a-folder-under-one-arm-it-s-bill-and-it-needs-a-spo]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.i-ll-carry-it]; L5 reply/decline/scene-talk/guarded/7w1s [scene-talk.reply-decline.i-can-t-take-that-on-right-now]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L141 follow/plea/scene-talk/anxious/7w1s [scene-talk.follow-plea.i-could-lose-my-primary-over-this]; L142 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L143 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L144 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L145 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L180 follow/plea/scene-talk/anxious/8w1s [scene-talk.follow-plea.without-this-i-ve-got-nothing-to-take-home]; L181 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L182 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L183 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L184 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L196 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.i-wouldn-t-ask-if-it-didn-t-matter]; L197 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L198 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L199 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L200 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L201 follow/plea/scene-talk/tender/5w1s [scene-talk.follow-plea.i-m-asking-as-a-friend]; L202 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L203 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L204 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L205 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L206 follow/plea/scene-talk/anxious/10w2s [scene-talk.follow-plea.i-need-this-one-i-promised-my-district-i-d-deliver]; L207 close/press/scene-talk/braced/7w2s [scene-talk.close-press.think-it-over-i-ll-be-back-tomorrow]</sub>

**Profile boastful** (outcome open)

**John Serrano:** Sorry to bother you.

**John Serrano:** I want you to carry "Legalize cannabis sales".

You could say:

1. I'll carry it.
2. I wish I could, but I can't.
3. I'll carry it if you'll help me find the votes.  *(the page follows this one)*
4. I need a few days to think it over.
5. I'm already carrying two bills. I don't have room.

**John Serrano:** That I can live with.

**John Serrano:** Deal. So where do you think the votes are?

You could say:

1. Where are we now?  *(the page follows this one)*
2. I can bring the members from my side.
3. Give me a list of everyone who's undecided.

**John Serrano:** We're close, but not there yet.

**John Serrano:** I won't forget this.

<sub>L1 narrate/narrate/scene-talk/curious/19w2s [scene-talk.narrate-narrate.name-comes-in-with-a-folder-under-one-arm-it-s-bill-and-it-needs-a-spo]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.i-ll-carry-it]; L5 reply/decline/scene-talk/tender/7w1s [scene-talk.reply-decline.i-wish-i-could-but-i-can-t]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L11 follow/accept/scene-talk/calm/5w1s [scene-talk.follow-accept.that-i-can-live-with]; L12 follow/ask/scene-talk/calm/9w2s [scene-talk.follow-ask.deal-so-where-do-you-think-the-votes-are]; L13 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.where-are-we-now]; L14 reply/offer/scene-talk/calm/8w1s [scene-talk.reply-offer.i-can-bring-the-members-from-my-side]; L15 reply/request/scene-talk/calm/8w1s [scene-talk.reply-request.give-me-a-list-of-everyone-who-s-undecided]; L16 follow/answer/scene-talk/calm/6w1s [scene-talk.follow-answer.we-re-close-but-not-there-yet]; L17 close/warn/scene-talk/braced/4w1s [scene-talk.close-warn.i-won-t-forget-this]</sub>

## Scene 15: bill-carry (favor-asked, ends in bill) — proof scene

*Purpose carry-bill. Records: bill:office:US-DE:legislature-lower:2027-01-31:official:term:seat:US-DE:lower:008:0:2026-10-12:23, official:term:seat:US-DE:lower:008:0:2026-10-12, official:term:seat:US-DE:lower:013:0:2026-10-12, office:US-DE:legislature-lower.*

> Patricia Hubbard has worked on "Civilian oversight of police" for months and needs someone to carry it.

**Profile warm** (outcome resolved)

**Patricia Hubbard:** You got a minute?

**Patricia Hubbard:** "Civilian oversight of police" needs a sponsor, and I want it to be you.

You could say:

1. Yes. You can count on me.  *(the page follows this one)*
2. I can't take that on right now.
3. I'll carry it if you'll help me find the votes.
4. Let me sleep on it.
5. I'm already carrying two bills. I don't have room.

**Patricia Hubbard:** Thank you. Really.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, open, open, resolved, open, resolved, open, open, resolved, resolved, open, open, open, open, resolved, resolved, open, open, open, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You ★: Yes. You can count on me.
  - Patricia Hubbard: Thank you. Really.
  - *Ends resolved*
- You: I can't take that on right now.
  - Patricia Hubbard: I'm asking as a friend.
  - You: Okay. For you, I'll do it.
    - Patricia Hubbard: Thank you. Really.
    - *Ends resolved*
  - You: I'm sorry. I just can't.
    - Patricia Hubbard: I wouldn't ask if it didn't matter.
    - You: You've made your point. Count me in.
      - Patricia Hubbard: Thank you. I won't forget it.
      - *Ends resolved*
    - You: The answer is no.
      - Patricia Hubbard: Please. Think about the people this helps.
      - You: Okay. For you, I'll do it.
        - Patricia Hubbard: Thank you. I won't forget it.
        - *Ends resolved*
      - You: I can't do that.
        - Patricia Hubbard: You know what this means to me.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I'm sorry. I just can't.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - Patricia Hubbard: That I can live with.
        - Patricia Hubbard: Deal. Let's start with the count. Who can we get?
        - You: Where are we now?
          - (the tree is cut here)
        - You: I can bring the members from my side.
          - (the tree is cut here)
        - You: Give me a list of everyone who's undecided.
          - (the tree is cut here)
      - You: I'm still weighing it.
        - Patricia Hubbard: I need this one. I promised my district I'd deliver.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - Patricia Hubbard: All right. We have a deal.
      - Patricia Hubbard: Deal. So where do you think the votes are?
      - You: Where are we now?
        - Patricia Hubbard: We have 41. We need 21.
        - *Ends open: Patricia Hubbard: Don't take too long.*
      - You: I can bring the members from my side.
        - Patricia Hubbard: What would it take?
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - *Ends open: Patricia Hubbard: Don't take too long.*
    - You: I'm still weighing it.
      - Patricia Hubbard: I need this one. I promised my district I'd deliver.
      - You: Okay. For you, I'll do it.
        - Patricia Hubbard: Thank you. Really.
        - *Ends resolved*
      - You: The answer is no.
        - Patricia Hubbard: I could lose my primary over this.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - Patricia Hubbard: That I can live with.
        - Patricia Hubbard: Deal. So where do you think the votes are?
        - You: Where are we now?
          - (the tree is cut here)
        - You: I can bring the members from my side.
          - (the tree is cut here)
        - You: Give me a list of everyone who's undecided.
          - (the tree is cut here)
      - You: Let me think about it.
        - Patricia Hubbard: Please. Think about the people this helps.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
  - You: I'll carry it if you'll help me find the votes.
    - Patricia Hubbard: That I can live with.
    - Patricia Hubbard: Deal. Let's start with the count. Who can we get?
    - You: Where are we now?
      - Patricia Hubbard: We have 41. We need 21.
      - *Ends open: Patricia Hubbard: I won't forget this.*
    - You: I can bring the members from my side.
      - Patricia Hubbard: Take your time, but I need an answer.
      - You: All right. You win. I'm in.
        - Patricia Hubbard: I knew I could count on you.
        - *Ends resolved*
      - You: I'm sorry. I just can't.
        - Patricia Hubbard: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - Patricia Hubbard: Deal.
        - *Ends open*
    - You: Give me a list of everyone who's undecided.
      - *Ends open: Patricia Hubbard: I won't forget this.*
  - You: Let me think about it.
    - Patricia Hubbard: You know what this means to me.
    - You: All right. You win. I'm in.
      - Patricia Hubbard: I knew I could count on you.
      - *Ends resolved*
    - You: I'm sorry. I just can't.
      - Patricia Hubbard: Please. Think about the people this helps.
      - You: All right. You win. I'm in.
        - Patricia Hubbard: I knew I could count on you.
        - *Ends resolved*
      - You: I can't do that.
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
        - Patricia Hubbard: Deal.
        - Patricia Hubbard: Deal. So where do you think the votes are?
        - You: Where are we now?
          - (the tree is cut here)
        - You: I can bring the members from my side.
          - (the tree is cut here)
        - You: Give me a list of everyone who's undecided.
          - (the tree is cut here)
      - You: Let me sleep on it.
        - Patricia Hubbard: I wouldn't ask if it didn't matter.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - Patricia Hubbard: Deal.
      - Patricia Hubbard: Deal. So where do you think the votes are?
      - You: Where are we now?
        - Patricia Hubbard: We have 41. We need 21.
        - *Ends open: Patricia Hubbard: Don't take too long.*
      - You: I can bring the members from my side.
        - Patricia Hubbard: Take your time, but I need an answer.
        - You: Fine. I'll do it, but this is the last time.
          - (the tree is cut here)
        - You: I'm sorry. I just can't.
          - (the tree is cut here)
        - You: I'll carry it if you'll help me find the votes.
          - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
    - You: I haven't decided yet.
      - Patricia Hubbard: Please. Think about the people this helps.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: Let me sleep on it.
        - (the tree is cut here)
- You: I'll carry it if you'll help me find the votes.
  - Patricia Hubbard: Deal.
  - Patricia Hubbard: Deal. So where do you think the votes are?
  - You: Where are we now?
    - Patricia Hubbard: We have 41. We need 21.
    - *Ends open: Patricia Hubbard: I won't forget this.*
  - You: I can bring the members from my side.
    - Patricia Hubbard: Good. Start there, and I'll work the rest.
    - *Ends open*
  - You: Give me a list of everyone who's undecided.
    - *Ends open: Patricia Hubbard: Think it over. I'll be back tomorrow.*
- You: Let me sleep on it.
  - Patricia Hubbard: I need this one. I promised my district I'd deliver.
  - You: You've made your point. Count me in.
    - Patricia Hubbard: Thank you. Really.
    - *Ends resolved*
  - You: The answer is no.
    - Patricia Hubbard: Please. Think about the people this helps.
    - You: Fine. I'll do it, but this is the last time.
      - Patricia Hubbard: Thank you. Really.
      - *Ends resolved*
    - You: I'm sorry. I just can't.
      - Patricia Hubbard: I wouldn't ask if it didn't matter.
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: I can't do that.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - Patricia Hubbard: Deal.
      - Patricia Hubbard: Deal. So where do you think the votes are?
      - You: Where are we now?
        - (the tree is cut here)
      - You: I can bring the members from my side.
        - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
    - You: I need a few days to think it over.
      - Patricia Hubbard: I wouldn't ask if it didn't matter.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
  - You: I'll carry it if you'll help me find the votes.
    - Patricia Hubbard: That I can live with.
    - Patricia Hubbard: Deal. So where do you think the votes are?
    - You: Where are we now?
      - Patricia Hubbard: We have 41. We need 21.
      - *Ends open: Patricia Hubbard: I won't forget this.*
    - You: I can bring the members from my side.
      - Patricia Hubbard: Good. Start there, and I'll work the rest.
      - *Ends open*
    - You: Give me a list of everyone who's undecided.
      - *Ends open: Patricia Hubbard: I won't forget this.*
  - You: I haven't decided yet.
    - Patricia Hubbard: I wouldn't ask if it didn't matter.
    - You: Okay. For you, I'll do it.
      - Patricia Hubbard: Thank you. Really.
      - *Ends resolved*
    - You: I'm sorry. I just can't.
      - Patricia Hubbard: You know what this means to me.
      - You: All right. You win. I'm in.
        - (the tree is cut here)
      - You: I can't do that.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
    - You: I'll carry it if you'll help me find the votes.
      - Patricia Hubbard: That I can live with.
      - Patricia Hubbard: Deal. Let's start with the count. Who can we get?
      - You: Where are we now?
        - (the tree is cut here)
      - You: I can bring the members from my side.
        - (the tree is cut here)
      - You: Give me a list of everyone who's undecided.
        - (the tree is cut here)
    - You: Let me think about it.
      - Patricia Hubbard: Without this, I've got nothing to take home.
      - You: All right. You win. I'm in.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll carry it if you'll help me find the votes.
        - (the tree is cut here)
      - You: I need a few days to think it over.
        - (the tree is cut here)
- You: I'm already carrying two bills. I don't have room.
  - *if not:*
    - Patricia Hubbard: Thank you. Really.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/hopeful/14w1s [scene-talk.state-request.bill-needs-a-sponsor-and-i-want-it-to-be-you]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L5 reply/decline/scene-talk/guarded/7w1s [scene-talk.reply-decline.i-can-t-take-that-on-right-now]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L9 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile cold** (outcome refused)

**Patricia Hubbard:** Do you have a minute?

**Patricia Hubbard:** "Civilian oversight of police" needs a sponsor, and I want it to be you.

You could say:

1. I'll carry it.
2. I'm not the right person to carry it.  *(the page follows this one)*
3. I'll carry it if you'll help me find the votes.
4. Let me sleep on it.
5. I'm already carrying two bills. I don't have room.

**Patricia Hubbard:** Fair enough.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/14w1s [scene-talk.state-request.bill-needs-a-sponsor-and-i-want-it-to-be-you]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.i-ll-carry-it]; L5 reply/decline/scene-talk/guarded/8w1s [scene-talk.reply-decline.i-m-not-the-right-person-to-carry-it]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L10 follow/accept/scene-talk/calm/2w1s [scene-talk.follow-accept.fair-enough]</sub>

**Profile stubborn** (outcome refused)

**Patricia Hubbard:** Do you have a minute?

**Patricia Hubbard:** "Civilian oversight of police" needs a sponsor, and I want it to be you.

You could say:

1. Of course. I'm glad you asked.
2. I'm not the right person to carry it.  *(the page follows this one)*
3. I'll carry it if you'll help me find the votes.
4. I haven't decided yet.
5. I'm already carrying two bills. I don't have room.

**Patricia Hubbard:** Yes or no?

You could say:

1. All right. You win. I'm in.
2. I'm sorry. I just can't.  *(the page follows this one)*
3. I'll carry it if you'll help me find the votes.

**Patricia Hubbard:** I need a yes or a no.

You could say:

1. Fine. I'll do it, but this is the last time.
2. The answer is no.  *(the page follows this one)*
3. I'll carry it if you'll help me find the votes.

**Patricia Hubbard:** What would it take?

You could say:

1. All right. You win. I'm in.
2. I can't do that.  *(the page follows this one)*
3. I'll carry it if you'll help me find the votes.

**Patricia Hubbard:** Take your time, but I need an answer.

You could say:

1. Okay. For you, I'll do it.
2. I can't do that.  *(the page follows this one)*
3. I'll carry it if you'll help me find the votes.

**Patricia Hubbard:** I need a yes or a no.

**Patricia Hubbard:** I won't forget this.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/14w1s [scene-talk.state-request.bill-needs-a-sponsor-and-i-want-it-to-be-you]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L5 reply/decline/scene-talk/guarded/8w1s [scene-talk.reply-decline.i-m-not-the-right-person-to-carry-it]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L10 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L11 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L12 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L13 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L15 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-a-yes-or-a-no]; L16 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L17 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L18 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L20 follow/press/scene-talk/calm/4w1s [scene-talk.follow-press.what-would-it-take]; L21 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L22 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L23 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L25 follow/press/scene-talk/calm/8w1s [scene-talk.follow-press.take-your-time-but-i-need-an-answer]; L26 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L27 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L28 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L30 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-a-yes-or-a-no]; L31 close/warn/scene-talk/braced/4w1s [scene-talk.close-warn.i-won-t-forget-this]</sub>

**Profile anxious** (outcome open)

**Patricia Hubbard:** Is now a bad time?

**Patricia Hubbard:** "Civilian oversight of police" needs a sponsor, and I want it to be you.

You could say:

1. Yes. You can count on me.
2. I'm not the right person to carry it.
3. I'll carry it if you'll help me find the votes.
4. I haven't decided yet.  *(the page follows this one)*
5. I'm already carrying two bills. I don't have room.

**Patricia Hubbard:** I wouldn't ask if it didn't matter.

You could say:

1. You've made your point. Count me in.
2. I can't do that.
3. I'll carry it if you'll help me find the votes.
4. Let me think about it.  *(the page follows this one)*

**Patricia Hubbard:** You know what this means to me.

You could say:

1. You've made your point. Count me in.
2. I can't do that.
3. I'll carry it if you'll help me find the votes.
4. I need a few days to think it over.  *(the page follows this one)*

**Patricia Hubbard:** I could lose my primary over this.

You could say:

1. Fine. I'll do it, but this is the last time.
2. The answer is no.
3. I'll carry it if you'll help me find the votes.
4. I'm still weighing it.  *(the page follows this one)*

**Patricia Hubbard:** I'm asking as a friend.

You could say:

1. Okay. For you, I'll do it.
2. I'm sorry. I just can't.
3. I'll carry it if you'll help me find the votes.
4. Let me sleep on it.  *(the page follows this one)*

**Patricia Hubbard:** I need this one. I promised my district I'd deliver.

**Patricia Hubbard:** I won't forget this.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.is-now-a-bad-time]; L3 state/request/scene-talk/hopeful/14w1s [scene-talk.state-request.bill-needs-a-sponsor-and-i-want-it-to-be-you]; L4 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L5 reply/decline/scene-talk/guarded/8w1s [scene-talk.reply-decline.i-m-not-the-right-person-to-carry-it]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L147 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.i-wouldn-t-ask-if-it-didn-t-matter]; L148 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L149 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L150 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L151 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L183 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.you-know-what-this-means-to-me]; L184 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L185 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L186 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L187 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L199 follow/plea/scene-talk/anxious/7w1s [scene-talk.follow-plea.i-could-lose-my-primary-over-this]; L200 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L201 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L202 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L203 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L204 follow/plea/scene-talk/tender/5w1s [scene-talk.follow-plea.i-m-asking-as-a-friend]; L205 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L206 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L207 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L208 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L209 follow/plea/scene-talk/anxious/10w2s [scene-talk.follow-plea.i-need-this-one-i-promised-my-district-i-d-deliver]; L210 close/warn/scene-talk/braced/4w1s [scene-talk.close-warn.i-won-t-forget-this]</sub>

**Profile boastful** (outcome open)

**Patricia Hubbard:** Can I talk to you?

**Patricia Hubbard:** "Civilian oversight of police" needs a sponsor, and I want it to be you.

You could say:

1. All right. I'll do it.
2. I can't take that on right now.
3. I'll carry it if you'll help me find the votes.  *(the page follows this one)*
4. I haven't decided yet.
5. I'm already carrying two bills. I don't have room.

**Patricia Hubbard:** Deal.

**Patricia Hubbard:** Deal. So where do you think the votes are?

You could say:

1. Where are we now?
2. I can bring the members from my side.
3. Give me a list of everyone who's undecided.  *(the page follows this one)*

**Patricia Hubbard:** Think it over. I'll be back tomorrow.

<sub>L1 narrate/narrate/scene-talk/calm/17w1s [scene-talk.narrate-narrate.name-has-worked-on-bill-for-months-and-needs-someone-to-carry-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/request/scene-talk/hopeful/14w1s [scene-talk.state-request.bill-needs-a-sponsor-and-i-want-it-to-be-you]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L5 reply/decline/scene-talk/guarded/7w1s [scene-talk.reply-decline.i-can-t-take-that-on-right-now]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L11 follow/accept/scene-talk/calm/1w1s [scene-talk.follow-accept.deal]; L12 follow/ask/scene-talk/calm/9w2s [scene-talk.follow-ask.deal-so-where-do-you-think-the-votes-are]; L13 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.where-are-we-now]; L14 reply/offer/scene-talk/calm/8w1s [scene-talk.reply-offer.i-can-bring-the-members-from-my-side]; L15 reply/request/scene-talk/calm/8w1s [scene-talk.reply-request.give-me-a-list-of-everyone-who-s-undecided]; L19 close/press/scene-talk/braced/7w2s [scene-talk.close-press.think-it-over-i-ll-be-back-tomorrow]</sub>

## Scene 16: donor-ask (favor-asked, ends in money) — proof scene

*Purpose donor-ask. Records: filing:contest:seat:gus2025:101811:board:0:2026-11-03:person_9e002a561a4b29bc|person_9e002b561a4b2b6f, filing:contest:seat:gus2025:101811:board:0:2026-11-03:person_9e002a561a4b29bc, person_9e002b561a4b2b6f, person_9e002a561a4b29bc.*

> Simon Riggs gave $20 to your campaign, most of what you raised. Now Simon Riggs is on the line.

**Profile warm** (outcome resolved)

**Simon Riggs:** Thanks for taking my call.

**Simon Riggs:** You know how much I put into your campaign. I need you on "Ban discrimination in housing and work".

You could say:

1. All right. I'll do it.  *(the page follows this one)*
2. I'm sorry. I just can't.
3. I'll listen. I won't promise anything.
4. That's not a conversation for today.
5. I already pushed for that. It's moving.

**Simon Riggs:** You won't regret it.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- You ★: All right. I'll do it.
  - Simon Riggs: You won't regret it.
  - *Ends resolved*
- You: I'm sorry. I just can't.
  - Simon Riggs: Please. Think about the people this helps.
  - You: Okay. For you, I'll do it.
    - Simon Riggs: Thank you. Really.
    - *Ends resolved*
  - You: I can't do that.
    - Simon Riggs: I wouldn't ask if it didn't matter.
    - You: Okay. For you, I'll do it.
      - Simon Riggs: Thank you. Really.
      - *Ends resolved*
    - You: I can't do that, and you shouldn't ask me to.
      - Simon Riggs: You know what this means to me.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: The answer is no.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: Let me think about it.
        - (the tree is cut here)
    - You: I'll listen. I won't promise anything.
      - Simon Riggs: Meet me halfway, and we have a deal.
      - You: Of course. I'm glad you asked.
        - (the tree is cut here)
      - You: I can't do that, and you shouldn't ask me to.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: I haven't decided yet.
        - (the tree is cut here)
    - You: I need a few days to think it over.
      - Simon Riggs: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: The answer is no.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: Let's not get into that over the phone.
        - (the tree is cut here)
  - You: I'll listen. I won't promise anything.
    - Simon Riggs: I can give you that if you give me this.
    - You: All right. I'll do it.
      - Simon Riggs: I knew I could count on you.
      - *Ends resolved*
    - You: I can't do that, and you shouldn't ask me to.
      - Simon Riggs: I'm asking as a friend.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: The answer is no.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
    - You: I'll listen. I won't promise anything.
      - Simon Riggs: Meet me halfway, and we have a deal.
      - You: Of course. I'm glad you asked.
        - (the tree is cut here)
      - You: I can't do that, and you shouldn't ask me to.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: Let me think about it.
        - (the tree is cut here)
    - You: I haven't decided yet.
      - Simon Riggs: You can't stay on the fence forever.
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: The answer is no.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: That's not a conversation for today.
        - (the tree is cut here)
  - You: Let me think about it.
    - Simon Riggs: You can't stay on the fence forever.
    - You: All right. You win. I'm in.
      - Simon Riggs: Thank you. I won't forget it.
      - *Ends resolved*
    - You: The answer is no.
      - Simon Riggs: I'm asking as a friend.
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: I can't do that.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: I need a few days to think it over.
        - (the tree is cut here)
    - You: I'll listen. I won't promise anything.
      - Simon Riggs: I can give you that if you give me this.
      - You: All right. I'll look at it again.
        - (the tree is cut here)
      - You: I can't do that, and you shouldn't ask me to.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
    - You: That's not a conversation for today.
      - Simon Riggs: What would it take?
      - You: All right. You win. I'm in.
        - (the tree is cut here)
      - You: The answer is no.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: Let's not get into that over the phone.
        - (the tree is cut here)
- You: I'll listen. I won't promise anything.
  - Simon Riggs: Meet me halfway, and we have a deal.
  - You: Of course. I'm glad you asked.
    - Simon Riggs: Thank you. Really.
    - *Ends resolved*
  - You: I can't do that, and you shouldn't ask me to.
    - Simon Riggs: I need this one. I promised my district I'd deliver.
    - You: Fine. I'll do it, but this is the last time.
      - Simon Riggs: Thank you. I won't forget it.
      - *Ends resolved*
    - You: I'm sorry. I just can't.
      - Simon Riggs: Please. Think about the people this helps.
      - You: All right. You win. I'm in.
        - (the tree is cut here)
      - You: The answer is no.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: Let me sleep on it.
        - (the tree is cut here)
    - You: I'll listen. I won't promise anything.
      - Simon Riggs: I can give you that if you give me this.
      - You: All right. I'll do it.
        - (the tree is cut here)
      - You: The answer is no.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: I need a few days to think it over.
        - (the tree is cut here)
    - You: I need a few days to think it over.
      - Simon Riggs: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: Let's not get into that over the phone.
        - (the tree is cut here)
  - You: I'll listen. I won't promise anything.
    - Simon Riggs: I can give you that if you give me this.
    - You: All right. I'll do it.
      - Simon Riggs: Thank you. Really.
      - *Ends resolved*
    - You: I'm sorry. I just can't.
      - Simon Riggs: I need this one. I promised my district I'd deliver.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I can't do that, and you shouldn't ask me to.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: Let me sleep on it.
        - (the tree is cut here)
    - You: I'll listen. I won't promise anything.
      - Simon Riggs: Meet me halfway, and we have a deal.
      - You: All right. I'll do it.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: I haven't decided yet.
        - (the tree is cut here)
    - You: Let me think about it.
      - Simon Riggs: You can't stay on the fence forever.
      - You: All right. You win. I'm in.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: That's not a conversation for today.
        - (the tree is cut here)
  - You: I'm still weighing it.
    - Simon Riggs: You can't stay on the fence forever.
    - You: Okay. For you, I'll do it.
      - Simon Riggs: I knew I could count on you.
      - *Ends resolved*
    - You: I'm sorry. I just can't.
      - Simon Riggs: I'm asking as a friend.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I can't do that.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: Let me sleep on it.
        - (the tree is cut here)
    - You: I'll listen. I won't promise anything.
      - Simon Riggs: I can give you that if you give me this.
      - You: All right. I'll look at it again.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: I haven't decided yet.
        - (the tree is cut here)
    - You: That's not a conversation for today.
      - Simon Riggs: Take your time, but I need an answer.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: Let's not get into that over the phone.
        - (the tree is cut here)
- You: That's not a conversation for today.
  - Simon Riggs: Yes or no?
  - You: Okay. For you, I'll do it.
    - Simon Riggs: I knew I could count on you.
    - *Ends resolved*
  - You: I can't do that, and you shouldn't ask me to.
    - Simon Riggs: I wouldn't ask if it didn't matter.
    - You: You've made your point. Count me in.
      - Simon Riggs: I knew I could count on you.
      - *Ends resolved*
    - You: I'm sorry. I just can't.
      - Simon Riggs: I'm asking as a friend.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: The answer is no.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: Let me sleep on it.
        - (the tree is cut here)
    - You: I'll listen. I won't promise anything.
      - Simon Riggs: I can give you that if you give me this.
      - You: All right. I'll look at it again.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: Let me sleep on it.
        - (the tree is cut here)
    - You: I'm still weighing it.
      - Simon Riggs: You can't stay on the fence forever.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: Let's not get into that over the phone.
        - (the tree is cut here)
  - You: I'll listen. I won't promise anything.
    - Simon Riggs: I can give you that if you give me this.
    - You: Yes. You can count on me.
      - Simon Riggs: Thank you. Really.
      - *Ends resolved*
    - You: I'm sorry. I just can't.
      - Simon Riggs: You know what this means to me.
      - You: All right. You win. I'm in.
        - (the tree is cut here)
      - You: I can't do that, and you shouldn't ask me to.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: Let me think about it.
        - (the tree is cut here)
    - You: I'll listen. I won't promise anything.
      - Simon Riggs: Meet me halfway, and we have a deal.
      - You: All right. I'll do it.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
    - You: I'm still weighing it.
      - Simon Riggs: You can't stay on the fence forever.
      - You: All right. You win. I'm in.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: Let's not get into that over the phone.
        - (the tree is cut here)
  - You: Let's not get into that over the phone.
    - Simon Riggs: I need a yes or a no.
    - You: You've made your point. Count me in.
      - Simon Riggs: Thank you. I won't forget it.
      - *Ends resolved*
    - You: I'm sorry. I just can't.
      - Simon Riggs: You know what this means to me.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I can't do that, and you shouldn't ask me to.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
    - You: I'll listen. I won't promise anything.
      - Simon Riggs: Meet me halfway, and we have a deal.
      - You: Of course. I'm glad you asked.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: I need a few days to think it over.
        - (the tree is cut here)
    - You: Let's not get into that over the phone.
      - Simon Riggs: What would it take?
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: Let's not get into that over the phone.
        - (the tree is cut here)
- You: I already pushed for that. It's moving.
  - *if Simon Riggs knows:*
    - Simon Riggs: Zachary Shepard says it never left committee.
    - You: All right. Here's the truth.
      - Simon Riggs: Thank you for telling me straight.
      - *Ends open*
    - You: People say a lot of things.
      - Simon Riggs: What would it take?
      - You: All right. You win. I'm in.
        - *Ends resolved*
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: I'll listen. I won't promise anything.
        - (the tree is cut here)
      - You: That's not a conversation for today.
        - (the tree is cut here)
    - You: Then Zachary Shepard has it wrong.
      - *Ends open: Simon Riggs: Don't take too long.*
  - *if not:*
    - Simon Riggs: Good to hear. Keep me posted.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/guarded/19w2s [scene-talk.narrate-narrate.name-gave-money-to-your-campaign-share-what-you-raised-now-name-is-on-]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.thanks-for-taking-my-call]; L3 state/request/scene-talk/braced/19w2s [scene-talk.state-request.you-know-how-much-i-put-into-your-campaign-i-need-you-on-bill]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L5 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L6 reply/bargain/scene-talk/guarded/6w2s [scene-talk.reply-bargain.i-ll-listen-i-won-t-promise-anything]; L7 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.that-s-not-a-conversation-for-today]; L8 reply/lie/scene-talk/calm/7w2s [scene-talk.reply-lie.i-already-pushed-for-that-it-s-moving]; L9 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

**Profile cold** (outcome resolved)

**Simon Riggs:** Thanks for taking my call.

**Simon Riggs:** You know how much I put into your campaign. I need you on "Ban discrimination in housing and work".

You could say:

1. All right. I'll do it.  *(the page follows this one)*
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

1. Yes. You can count on me.  *(the page follows this one)*
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

1. Yes. You can count on me.  *(the page follows this one)*
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

1. All right. I'll look at it again.  *(the page follows this one)*
2. I'm sorry. I just can't.
3. I'll listen. I won't promise anything.
4. That's not a conversation for today.
5. I already pushed for that. It's moving.

**Simon Riggs:** Thank you. Really.

<sub>L1 narrate/narrate/scene-talk/guarded/19w2s [scene-talk.narrate-narrate.name-gave-money-to-your-campaign-share-what-you-raised-now-name-is-on-]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.thanks-for-taking-my-call]; L3 state/request/scene-talk/braced/19w2s [scene-talk.state-request.you-know-how-much-i-put-into-your-campaign-i-need-you-on-bill]; L4 reply/agree/scene-talk/calm/7w2s [scene-talk.reply-agree.all-right-i-ll-look-at-it-again]; L5 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L6 reply/bargain/scene-talk/guarded/6w2s [scene-talk.reply-bargain.i-ll-listen-i-won-t-promise-anything]; L7 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.that-s-not-a-conversation-for-today]; L8 reply/lie/scene-talk/calm/7w2s [scene-talk.reply-lie.i-already-pushed-for-that-it-s-moving]; L9 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

## Scene 17: party-ask (favor-asked, ends in political) — proof scene

*Purpose party-ask. Records: party:US-DE:democratic, filing:contest:seat:US-DE:attorney-general:2026-11-03:official:term:seat:US-DE:attorney-general:2026-10-12, contest:seat:US-DE:attorney-general:2026-11-03, person_a52334a2a50177be, official:term:seat:US-DE:attorney-general:2026-10-12.*

> The phone rings. It's Jamie Alexander, the Democratic party chair.

**Profile warm** (outcome resolved)

**Jamie Alexander:** Do you have a minute?

**Jamie Alexander:** The party needs you to run for Attorney General.

You could say:

1. Me? Why me?

**Jamie Alexander:** Because you can win it. We've looked at the numbers.

You could say:

1. All right. I'll do it.  *(the page follows this one)*
2. I'm sorry. I just can't.
3. If I run, I'll need the party behind me all the way.
4. Let me sleep on it.
5. I'm seriously thinking about it.

**Jamie Alexander:** You won't regret it.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, open, open, resolved, open, open, resolved, resolved, open, open, resolved, open, open, resolved, resolved, resolved, open, open, resolved, open, resolved, open, open, resolved, refused, open, open, resolved; ★ is the branch this profile's traits lean toward):

- Julie Villegas (without a choice): Me? Why me?
- Jamie Alexander: Because you can win it. We've looked at the numbers.
- You ★: All right. I'll do it.
  - Jamie Alexander: You won't regret it.
  - *Ends resolved*
- You: I'm sorry. I just can't.
  - Jamie Alexander: You know what this means to me.
  - You: You've made your point. Count me in.
    - Jamie Alexander: I knew I could count on you.
    - *Ends resolved*
  - You: The answer is no.
    - Jamie Alexander: Without this, I've got nothing to take home.
    - You: Fine. I'll do it, but this is the last time.
      - Jamie Alexander: I knew I could count on you.
      - *Ends resolved*
    - You: Not this time.
      - Jamie Alexander: Please. Think about the people this helps.
      - You: You've made your point. Count me in.
        - Jamie Alexander: Thank you. Really.
        - *Ends resolved*
      - You: I can't do that.
        - Jamie Alexander: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Jamie Alexander: That I can live with.
        - *Ends open*
      - You: Let me sleep on it.
        - Jamie Alexander: I'm asking as a friend.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
    - You: If I run, I'll need the party behind me all the way.
      - Jamie Alexander: That I can live with.
      - *Ends open*
    - You: I haven't decided yet.
      - Jamie Alexander: I'm asking as a friend.
      - You: Okay. For you, I'll do it.
        - Jamie Alexander: I knew I could count on you.
        - *Ends resolved*
      - You: Not this time.
        - Jamie Alexander: I wouldn't ask if it didn't matter.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Jamie Alexander: Deal.
        - *Ends open*
      - You: Let me think about it.
        - Jamie Alexander: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: Not this time.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
  - You: If I run, I'll need the party behind me all the way.
    - Jamie Alexander: Deal.
    - *Ends open*
  - You: I'm still weighing it.
    - Jamie Alexander: Please. Think about the people this helps.
    - You: You've made your point. Count me in.
      - Jamie Alexander: Thank you. Really.
      - *Ends resolved*
    - You: The answer is no.
      - Jamie Alexander: I wouldn't ask if it didn't matter.
      - You: Okay. For you, I'll do it.
        - Jamie Alexander: I knew I could count on you.
        - *Ends resolved*
      - You: Not this time.
        - Jamie Alexander: I'm asking as a friend.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Jamie Alexander: That I can live with.
        - *Ends open*
      - You: Let me think about it.
        - Jamie Alexander: I'm asking as a friend.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
    - You: If I run, I'll need the party behind me all the way.
      - Jamie Alexander: All right. We have a deal.
      - *Ends open*
    - You: Let me sleep on it.
      - Jamie Alexander: I'm asking as a friend.
      - You: All right. You win. I'm in.
        - Jamie Alexander: Thank you. Really.
        - *Ends resolved*
      - You: Not this time.
        - Jamie Alexander: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Jamie Alexander: That I can live with.
        - *Ends open*
      - You: I need a few days to think it over.
        - Jamie Alexander: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
- You: If I run, I'll need the party behind me all the way.
  - Jamie Alexander: That I can live with.
  - *Ends open*
- You: Let me sleep on it.
  - Jamie Alexander: I'm asking as a friend.
  - You: You've made your point. Count me in.
    - Jamie Alexander: Thank you. Really.
    - *Ends resolved*
  - You: I'm sorry. I just can't.
    - Jamie Alexander: I need this one. I promised my district I'd deliver.
    - You: All right. You win. I'm in.
      - Jamie Alexander: I knew I could count on you.
      - *Ends resolved*
    - You: Not this time.
      - Jamie Alexander: I could lose my primary over this.
      - You: You've made your point. Count me in.
        - Jamie Alexander: I knew I could count on you.
        - *Ends resolved*
      - You: I can't do that.
        - Jamie Alexander: Please. Think about the people this helps.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Jamie Alexander: All right. We have a deal.
        - *Ends open*
      - You: Let me think about it.
        - Jamie Alexander: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
    - You: If I run, I'll need the party behind me all the way.
      - Jamie Alexander: All right. We have a deal.
      - *Ends open*
    - You: I haven't decided yet.
      - Jamie Alexander: I wouldn't ask if it didn't matter.
      - You: All right. You win. I'm in.
        - Jamie Alexander: You won't regret it.
        - *Ends resolved*
      - You: Not this time.
        - Jamie Alexander: You know what this means to me.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - (the tree is cut here)
      - You: I need a few days to think it over.
        - (the tree is cut here)
  - You: If I run, I'll need the party behind me all the way.
    - Jamie Alexander: All right. We have a deal.
    - *Ends open*
  - You: Let me think about it.
    - Jamie Alexander: I wouldn't ask if it didn't matter.
    - You: Okay. For you, I'll do it.
      - Jamie Alexander: Thank you. Really.
      - *Ends resolved*
    - You: I'm sorry. I just can't.
      - Jamie Alexander: Please. Think about the people this helps.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: Not this time.
        - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
    - You: If I run, I'll need the party behind me all the way.
      - Jamie Alexander: All right. We have a deal.
      - *Ends open*
    - You: I'm still weighing it.
      - Jamie Alexander: Without this, I've got nothing to take home.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - (the tree is cut here)
      - You: I need a few days to think it over.
        - (the tree is cut here)
- You: I'm seriously thinking about it.
  - *if Jamie Alexander knows:*
    - Jamie Alexander: Zachary Shepard says you've already turned it down.
    - You: All right. Here's the truth.
      - Jamie Alexander: Thank you for telling me straight.
      - *Ends open*
    - You: People say a lot of things.
      - Jamie Alexander: Yes or no?
      - You: You've made your point. Count me in.
        - *Ends resolved*
      - You: I'm sorry. I just can't.
        - *Ends refused: Jamie Alexander: I won't forget this.*
      - You: If I run, I'll need the party behind me all the way.
        - *Ends open: Jamie Alexander: Don't take too long.*
    - You: Then Zachary Shepard has it wrong.
      - *Ends open: Jamie Alexander: I won't forget this.*
  - *if not:*
    - Jamie Alexander: All right. I had to ask.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/braced/10w2s [scene-talk.narrate-narrate.the-phone-rings-it-s-name-the-party-party-chair]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/3w2s [scene-talk.auto-ask.me-why-me]; L5 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.because-you-can-win-it-we-ve-looked-at-the-numbers]; L6 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L7 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L11 follow/thank/scene-talk/glad/4w1s [scene-talk.follow-thank.you-won-t-regret-it]</sub>

**Profile cold** (outcome refused)

**Jamie Alexander:** Do you have a minute?

**Jamie Alexander:** The party needs you to run for Attorney General.

You could say:

1. Attorney General? Why me?

**Jamie Alexander:** Because you can win it. We've looked at the numbers.

You could say:

1. All right. I'll do it.
2. Not this time.  *(the page follows this one)*
3. If I run, I'll need the party behind me all the way.
4. Let me sleep on it.
5. I'm seriously thinking about it.

**Jamie Alexander:** The party has a long memory.

You could say:

1. You've made your point. Count me in.
2. The answer is no.  *(the page follows this one)*
3. Don't try that with me.
4. If I run, I'll need the party behind me all the way.

**Jamie Alexander:** You know you can't win without the party.

You could say:

1. You've made your point. Count me in.
2. I can't do that.  *(the page follows this one)*
3. Don't try that with me.
4. If I run, I'll need the party behind me all the way.

**Jamie Alexander:** You shouldn't expect our help in your next race.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry. I just can't.  *(the page follows this one)*
3. Don't try that with me.
4. If I run, I'll need the party behind me all the way.

**Jamie Alexander:** The party has a long memory.

You could say:

1. You've made your point. Count me in.
2. Not this time.  *(the page follows this one)*
3. Are you threatening me?
4. If I run, I'll need the party behind me all the way.

**Jamie Alexander:** The party has a long memory.

**Jamie Alexander:** I won't forget this.

<sub>L1 narrate/narrate/scene-talk/braced/10w2s [scene-talk.narrate-narrate.the-phone-rings-it-s-name-the-party-party-chair]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/4w2s [scene-talk.auto-ask.office-why-me]; L5 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.because-you-can-win-it-we-ve-looked-at-the-numbers]; L6 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L7 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L12 follow/threaten/scene-talk/braced/6w1s [scene-talk.follow-threaten.the-party-has-a-long-memory]; L13 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L14 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L15 reply/confront/scene-talk/braced/5w1s [scene-talk.reply-confront.don-t-try-that-with-me]; L16 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L18 follow/threaten/scene-talk/braced/8w1s [scene-talk.follow-threaten.you-know-you-can-t-win-without-the-party]; L19 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L20 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L21 reply/confront/scene-talk/braced/5w1s [scene-talk.reply-confront.don-t-try-that-with-me]; L22 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L24 follow/threaten/scene-talk/guarded/9w1s [scene-talk.follow-threaten.you-shouldn-t-expect-our-help-in-your-next-race]; L25 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L26 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L27 reply/confront/scene-talk/braced/5w1s [scene-talk.reply-confront.don-t-try-that-with-me]; L28 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L30 follow/threaten/scene-talk/braced/6w1s [scene-talk.follow-threaten.the-party-has-a-long-memory]; L31 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L32 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L33 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L34 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L35 follow/threaten/scene-talk/braced/6w1s [scene-talk.follow-threaten.the-party-has-a-long-memory]; L36 close/warn/scene-talk/braced/4w1s [scene-talk.close-warn.i-won-t-forget-this]</sub>

**Profile stubborn** (outcome refused)

**Jamie Alexander:** Have you got a few minutes?

**Jamie Alexander:** The party needs you to run for Attorney General.

You could say:

1. Attorney General? Why me?

**Jamie Alexander:** People already know your name, and the party needs a fresh face.

You could say:

1. Of course. I'm glad you asked.
2. I'm sorry. I just can't.  *(the page follows this one)*
3. If I run, I'll need the party behind me all the way.
4. I need a few days to think it over.
5. I'm seriously thinking about it.

**Jamie Alexander:** Take your time, but I need an answer.

You could say:

1. Fine. I'll do it, but this is the last time.
2. Not this time.  *(the page follows this one)*
3. If I run, I'll need the party behind me all the way.

**Jamie Alexander:** I need a yes or a no.

You could say:

1. All right. You win. I'm in.
2. I can't do that.  *(the page follows this one)*
3. If I run, I'll need the party behind me all the way.

**Jamie Alexander:** Yes or no?

You could say:

1. Okay. For you, I'll do it.
2. The answer is no.  *(the page follows this one)*
3. If I run, I'll need the party behind me all the way.

**Jamie Alexander:** What would it take?

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't do that.  *(the page follows this one)*
3. If I run, I'll need the party behind me all the way.

**Jamie Alexander:** You know you can't win without the party.

**Jamie Alexander:** I won't forget this.

<sub>L1 narrate/narrate/scene-talk/braced/10w2s [scene-talk.narrate-narrate.the-phone-rings-it-s-name-the-party-party-chair]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/4w2s [scene-talk.auto-ask.office-why-me]; L5 follow/answer/scene-talk/calm/12w1s [scene-talk.follow-answer.people-already-know-your-name-and-the-party-needs-a-fresh-face]; L6 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L7 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L12 follow/press/scene-talk/calm/8w1s [scene-talk.follow-press.take-your-time-but-i-need-an-answer]; L13 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L14 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L15 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L17 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-a-yes-or-a-no]; L18 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L19 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L20 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L22 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L23 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L24 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L25 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L27 follow/press/scene-talk/calm/4w1s [scene-talk.follow-press.what-would-it-take]; L28 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L29 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L30 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L32 follow/threaten/scene-talk/braced/8w1s [scene-talk.follow-threaten.you-know-you-can-t-win-without-the-party]; L33 close/warn/scene-talk/braced/4w1s [scene-talk.close-warn.i-won-t-forget-this]</sub>

**Profile anxious** (outcome open)

**Jamie Alexander:** I won't take long.

**Jamie Alexander:** The party needs you to run for Attorney General.

You could say:

1. Me? Why me?

**Jamie Alexander:** Because you can win it. We've looked at the numbers.

You could say:

1. Of course. I'm glad you asked.
2. I'm sorry. I just can't.
3. If I run, I'll need the party behind me all the way.
4. I'm still weighing it.  *(the page follows this one)*
5. I'm seriously thinking about it.

**Jamie Alexander:** You know what this means to me.

You could say:

1. You've made your point. Count me in.
2. I can't do that.
3. If I run, I'll need the party behind me all the way.
4. I haven't decided yet.  *(the page follows this one)*

**Jamie Alexander:** I could lose my primary over this.

You could say:

1. Okay. For you, I'll do it.
2. Not this time.
3. If I run, I'll need the party behind me all the way.
4. I need a few days to think it over.  *(the page follows this one)*

**Jamie Alexander:** I'm asking as a friend.

You could say:

1. Fine. I'll do it, but this is the last time.
2. The answer is no.
3. If I run, I'll need the party behind me all the way.
4. Let me think about it.  *(the page follows this one)*

**Jamie Alexander:** Without this, I've got nothing to take home.

You could say:

1. All right. You win. I'm in.
2. I can't do that.
3. If I run, I'll need the party behind me all the way.
4. Let me sleep on it.  *(the page follows this one)*

**Jamie Alexander:** Please. Think about the people this helps.

**Jamie Alexander:** Don't take too long.

<sub>L1 narrate/narrate/scene-talk/braced/10w2s [scene-talk.narrate-narrate.the-phone-rings-it-s-name-the-party-party-chair]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.i-won-t-take-long]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/3w2s [scene-talk.auto-ask.me-why-me]; L5 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.because-you-can-win-it-we-ve-looked-at-the-numbers]; L6 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L7 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L128 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.you-know-what-this-means-to-me]; L129 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L130 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L131 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L132 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L168 follow/plea/scene-talk/anxious/7w1s [scene-talk.follow-plea.i-could-lose-my-primary-over-this]; L169 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L170 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L171 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L172 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L180 follow/plea/scene-talk/tender/5w1s [scene-talk.follow-plea.i-m-asking-as-a-friend]; L181 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L182 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L183 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L184 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L185 follow/plea/scene-talk/anxious/8w1s [scene-talk.follow-plea.without-this-i-ve-got-nothing-to-take-home]; L186 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L187 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L188 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L189 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L190 follow/plea/scene-talk/tender/7w2s [scene-talk.follow-plea.please-think-about-the-people-this-helps]; L191 close/press/scene-talk/braced/4w1s [scene-talk.close-press.don-t-take-too-long]</sub>

**Profile boastful** (outcome open)

**Jamie Alexander:** Do you have a minute?

**Jamie Alexander:** The party needs you to run for Attorney General.

You could say:

1. Me? Why me?

**Jamie Alexander:** Because you can win it. We've looked at the numbers.

You could say:

1. Yes. You can count on me.
2. The answer is no.
3. If I run, I'll need the party behind me all the way.  *(the page follows this one)*
4. I haven't decided yet.
5. I'm seriously thinking about it.

**Jamie Alexander:** That I can live with.

<sub>L1 narrate/narrate/scene-talk/braced/10w2s [scene-talk.narrate-narrate.the-phone-rings-it-s-name-the-party-party-chair]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.do-you-have-a-minute]; L3 state/request/scene-talk/hopeful/9w1s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/3w2s [scene-talk.auto-ask.me-why-me]; L5 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.because-you-can-win-it-we-ve-looked-at-the-numbers]; L6 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L7 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L116 follow/accept/scene-talk/calm/5w1s [scene-talk.follow-accept.that-i-can-live-with]</sub>

## Scene 18: party-ask (favor-asked, ends in political) — proof scene

*Purpose party-ask. Records: party:US-DE:republican, filing:contest:seat:US-DE:us-house:00:2026-11-03:official:term:seat:US-DE:upper:019:0:2026-10-12, contest:seat:US-DE:us-house:00:2026-11-03, person_9e002a561a4b29bc, official:term:seat:US-DE:upper:019:0:2026-10-12.*

> Kelly Riggs, who chairs the Republican party, has asked to see you.

**Profile warm** (outcome resolved)

**Kelly Riggs:** Is now a bad time?

**Kelly Riggs:** The party needs you to run for U.S. Representative.

You could say:

1. U.S. Representative? Why me?

**Kelly Riggs:** Because you can win it. We've looked at the numbers.

You could say:

1. Yes. You can count on me.  *(the page follows this one)*
2. I'm sorry. I just can't.
3. If I run, I'll need the party behind me all the way.
4. I haven't decided yet.
5. I'm seriously thinking about it.

**Kelly Riggs:** I knew I could count on you.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, open, open, resolved, open, open, resolved, resolved, open, open, resolved, open, open, resolved, resolved, resolved, open, open, resolved, open, resolved, open, open, resolved, refused, open, open, resolved; ★ is the branch this profile's traits lean toward):

- Holly Emerson (without a choice): U.S. Representative? Why me?
- Kelly Riggs: Because you can win it. We've looked at the numbers.
- You ★: Yes. You can count on me.
  - Kelly Riggs: I knew I could count on you.
  - *Ends resolved*
- You: I'm sorry. I just can't.
  - Kelly Riggs: Please. Think about the people this helps.
  - You: Okay. For you, I'll do it.
    - Kelly Riggs: Thank you. Really.
    - *Ends resolved*
  - You: The answer is no.
    - Kelly Riggs: I need this one. I promised my district I'd deliver.
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: Thank you. Really.
      - *Ends resolved*
    - You: Not this time.
      - Kelly Riggs: I could lose my primary over this.
      - You: You've made your point. Count me in.
        - Kelly Riggs: Thank you. Really.
        - *Ends resolved*
      - You: I can't do that.
        - Kelly Riggs: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Kelly Riggs: All right. We have a deal.
        - *Ends open*
      - You: Let me sleep on it.
        - Kelly Riggs: I'm asking as a friend.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
    - You: If I run, I'll need the party behind me all the way.
      - Kelly Riggs: That I can live with.
      - *Ends open*
    - You: Let me sleep on it.
      - Kelly Riggs: I wouldn't ask if it didn't matter.
      - You: You've made your point. Count me in.
        - Kelly Riggs: Thank you. Really.
        - *Ends resolved*
      - You: I can't do that.
        - Kelly Riggs: I'm asking as a friend.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: Not this time.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Kelly Riggs: That I can live with.
        - *Ends open*
      - You: Let me think about it.
        - Kelly Riggs: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: Not this time.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
  - You: If I run, I'll need the party behind me all the way.
    - Kelly Riggs: All right. We have a deal.
    - *Ends open*
  - You: Let me sleep on it.
    - Kelly Riggs: I'm asking as a friend.
    - You: You've made your point. Count me in.
      - Kelly Riggs: Thank you. I won't forget it.
      - *Ends resolved*
    - You: Not this time.
      - Kelly Riggs: I need this one. I promised my district I'd deliver.
      - You: Fine. I'll do it, but this is the last time.
        - Kelly Riggs: Thank you. Really.
        - *Ends resolved*
      - You: I can't do that.
        - Kelly Riggs: I wouldn't ask if it didn't matter.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Kelly Riggs: That I can live with.
        - *Ends open*
      - You: I'm still weighing it.
        - Kelly Riggs: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
    - You: If I run, I'll need the party behind me all the way.
      - Kelly Riggs: Deal.
      - *Ends open*
    - You: I need a few days to think it over.
      - Kelly Riggs: I could lose my primary over this.
      - You: All right. You win. I'm in.
        - Kelly Riggs: Thank you. I won't forget it.
        - *Ends resolved*
      - You: Not this time.
        - Kelly Riggs: I need this one. I promised my district I'd deliver.
        - You: Fine. I'll do it, but this is the last time.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Kelly Riggs: Deal.
        - *Ends open*
      - You: Let me think about it.
        - Kelly Riggs: I need this one. I promised my district I'd deliver.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: Not this time.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
- You: If I run, I'll need the party behind me all the way.
  - Kelly Riggs: That I can live with.
  - *Ends open*
- You: I haven't decided yet.
  - Kelly Riggs: I wouldn't ask if it didn't matter.
  - You: Okay. For you, I'll do it.
    - Kelly Riggs: Thank you. I won't forget it.
    - *Ends resolved*
  - You: I'm sorry. I just can't.
    - Kelly Riggs: Please. Think about the people this helps.
    - You: Okay. For you, I'll do it.
      - Kelly Riggs: Thank you. Really.
      - *Ends resolved*
    - You: Not this time.
      - Kelly Riggs: I could lose my primary over this.
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: Thank you. Really.
        - *Ends resolved*
      - You: The answer is no.
        - Kelly Riggs: I'm asking as a friend.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I can't do that.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - Kelly Riggs: All right. We have a deal.
        - *Ends open*
      - You: Let me think about it.
        - Kelly Riggs: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: The answer is no.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
    - You: If I run, I'll need the party behind me all the way.
      - Kelly Riggs: Deal.
      - *Ends open*
    - You: I'm still weighing it.
      - Kelly Riggs: I'm asking as a friend.
      - You: Okay. For you, I'll do it.
        - Kelly Riggs: Thank you. Really.
        - *Ends resolved*
      - You: I can't do that.
        - Kelly Riggs: I need this one. I promised my district I'd deliver.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: Not this time.
          - (the tree is cut here)
        - You: If I run, I'll need the party behind me all the way.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - (the tree is cut here)
      - You: Let me think about it.
        - (the tree is cut here)
  - You: If I run, I'll need the party behind me all the way.
    - Kelly Riggs: Deal.
    - *Ends open*
  - You: Let me sleep on it.
    - Kelly Riggs: You know what this means to me.
    - You: Fine. I'll do it, but this is the last time.
      - Kelly Riggs: Thank you. I won't forget it.
      - *Ends resolved*
    - You: I'm sorry. I just can't.
      - Kelly Riggs: Please. Think about the people this helps.
      - You: Okay. For you, I'll do it.
        - (the tree is cut here)
      - You: I can't do that.
        - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
    - You: If I run, I'll need the party behind me all the way.
      - Kelly Riggs: Deal.
      - *Ends open*
    - You: I need a few days to think it over.
      - Kelly Riggs: I'm asking as a friend.
      - You: You've made your point. Count me in.
        - (the tree is cut here)
      - You: I'm sorry. I just can't.
        - (the tree is cut here)
      - You: If I run, I'll need the party behind me all the way.
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
- You: I'm seriously thinking about it.
  - *if Kelly Riggs knows:*
    - Kelly Riggs: Zachary Shepard says you've already turned it down.
    - You: All right. Here's the truth.
      - Kelly Riggs: Thank you for telling me straight.
      - *Ends open*
    - You: People say a lot of things.
      - Kelly Riggs: Take your time, but I need an answer.
      - You: All right. You win. I'm in.
        - *Ends resolved*
      - You: I'm sorry. I just can't.
        - *Ends refused: Kelly Riggs: I won't forget this.*
      - You: If I run, I'll need the party behind me all the way.
        - *Ends open: Kelly Riggs: Think it over. I'll be back tomorrow.*
    - You: Then Zachary Shepard has it wrong.
      - *Ends open: Kelly Riggs: Think it over. I'll be back tomorrow.*
  - *if not:*
    - Kelly Riggs: Fair enough.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/braced/12w1s [scene-talk.narrate-narrate.name-who-chairs-the-party-party-has-asked-to-see-you]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.is-now-a-bad-time]; L3 state/request/scene-talk/hopeful/9w2s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/4w3s [scene-talk.auto-ask.office-why-me]; L5 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.because-you-can-win-it-we-ve-looked-at-the-numbers]; L6 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L7 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L11 follow/thank/scene-talk/glad/7w1s [scene-talk.follow-thank.i-knew-i-could-count-on-you]</sub>

**Profile cold** (outcome refused)

**Kelly Riggs:** Is now a bad time?

**Kelly Riggs:** The party needs you to run for U.S. Representative.

You could say:

1. Me? Why me?

**Kelly Riggs:** Because you can win it. We've looked at the numbers.

You could say:

1. All right. I'll do it.
2. Not this time.  *(the page follows this one)*
3. If I run, I'll need the party behind me all the way.
4. I haven't decided yet.
5. I'm seriously thinking about it.

**Kelly Riggs:** Fair enough.

<sub>L1 narrate/narrate/scene-talk/braced/12w1s [scene-talk.narrate-narrate.name-who-chairs-the-party-party-has-asked-to-see-you]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.is-now-a-bad-time]; L3 state/request/scene-talk/hopeful/9w2s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/3w2s [scene-talk.auto-ask.me-why-me]; L5 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.because-you-can-win-it-we-ve-looked-at-the-numbers]; L6 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L7 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L12 follow/accept/scene-talk/calm/2w1s [scene-talk.follow-accept.fair-enough]</sub>

**Profile stubborn** (outcome refused)

**Kelly Riggs:** Can I talk to you?

**Kelly Riggs:** The party needs you to run for U.S. Representative.

You could say:

1. Me? Why me?

**Kelly Riggs:** Because you can win it. We've looked at the numbers.

You could say:

1. Of course. I'm glad you asked.
2. Not this time.  *(the page follows this one)*
3. If I run, I'll need the party behind me all the way.
4. I need a few days to think it over.
5. I'm seriously thinking about it.

**Kelly Riggs:** I need a yes or a no.

You could say:

1. You've made your point. Count me in.
2. I can't do that.  *(the page follows this one)*
3. If I run, I'll need the party behind me all the way.

**Kelly Riggs:** Yes or no?

You could say:

1. You've made your point. Count me in.
2. The answer is no.  *(the page follows this one)*
3. If I run, I'll need the party behind me all the way.

**Kelly Riggs:** Take your time, but I need an answer.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry. I just can't.  *(the page follows this one)*
3. If I run, I'll need the party behind me all the way.

**Kelly Riggs:** What would it take?

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't do that.  *(the page follows this one)*
3. If I run, I'll need the party behind me all the way.

**Kelly Riggs:** That's all right. I understand.

<sub>L1 narrate/narrate/scene-talk/braced/12w1s [scene-talk.narrate-narrate.name-who-chairs-the-party-party-has-asked-to-see-you]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/request/scene-talk/hopeful/9w2s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/3w2s [scene-talk.auto-ask.me-why-me]; L5 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.because-you-can-win-it-we-ve-looked-at-the-numbers]; L6 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L7 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L12 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-a-yes-or-a-no]; L13 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L14 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L15 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L17 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L18 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L19 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L20 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L22 follow/press/scene-talk/calm/8w1s [scene-talk.follow-press.take-your-time-but-i-need-an-answer]; L23 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L24 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L25 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L27 follow/press/scene-talk/calm/4w1s [scene-talk.follow-press.what-would-it-take]; L28 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L29 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L30 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L32 follow/accept/scene-talk/tender/5w2s [scene-talk.follow-accept.that-s-all-right-i-understand]</sub>

**Profile anxious** (outcome open)

**Kelly Riggs:** Sorry to bother you.

**Kelly Riggs:** The party needs you to run for U.S. Representative.

You could say:

1. U.S. Representative? Why me?

**Kelly Riggs:** Because you can win it. We've looked at the numbers.

You could say:

1. Of course. I'm glad you asked.
2. Not this time.
3. If I run, I'll need the party behind me all the way.
4. I haven't decided yet.  *(the page follows this one)*
5. I'm seriously thinking about it.

**Kelly Riggs:** You know what this means to me.

You could say:

1. All right. You win. I'm in.
2. Not this time.
3. If I run, I'll need the party behind me all the way.
4. I need a few days to think it over.  *(the page follows this one)*

**Kelly Riggs:** I need this one. I promised my district I'd deliver.

You could say:

1. Okay. For you, I'll do it.
2. The answer is no.
3. If I run, I'll need the party behind me all the way.
4. Let me sleep on it.  *(the page follows this one)*

**Kelly Riggs:** I wouldn't ask if it didn't matter.

You could say:

1. Okay. For you, I'll do it.
2. I can't do that.
3. If I run, I'll need the party behind me all the way.
4. Let me think about it.  *(the page follows this one)*

**Kelly Riggs:** I'm asking as a friend.

You could say:

1. Okay. For you, I'll do it.
2. I'm sorry. I just can't.
3. If I run, I'll need the party behind me all the way.
4. I'm still weighing it.  *(the page follows this one)*

**Kelly Riggs:** Please. Think about the people this helps.

**Kelly Riggs:** I won't forget this.

<sub>L1 narrate/narrate/scene-talk/braced/12w1s [scene-talk.narrate-narrate.name-who-chairs-the-party-party-has-asked-to-see-you]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/request/scene-talk/hopeful/9w2s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/4w3s [scene-talk.auto-ask.office-why-me]; L5 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.because-you-can-win-it-we-ve-looked-at-the-numbers]; L6 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.of-course-i-m-glad-you-asked]; L7 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L38 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.you-know-what-this-means-to-me]; L39 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L40 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L41 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L42 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L65 follow/plea/scene-talk/anxious/10w2s [scene-talk.follow-plea.i-need-this-one-i-promised-my-district-i-d-deliver]; L66 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L67 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L68 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L69 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L86 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.i-wouldn-t-ask-if-it-didn-t-matter]; L87 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L88 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.i-can-t-do-that]; L89 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L90 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L100 follow/plea/scene-talk/tender/5w1s [scene-talk.follow-plea.i-m-asking-as-a-friend]; L101 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L102 reply/refuse/scene-talk/tender/5w2s [scene-talk.reply-refuse.i-m-sorry-i-just-can-t]; L103 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L104 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L108 follow/plea/scene-talk/tender/7w2s [scene-talk.follow-plea.please-think-about-the-people-this-helps]; L109 close/warn/scene-talk/braced/4w1s [scene-talk.close-warn.i-won-t-forget-this]</sub>

**Profile boastful** (outcome open)

**Kelly Riggs:** Have you got a few minutes?

**Kelly Riggs:** The party needs you to run for U.S. Representative.

You could say:

1. U.S. Representative? Why me?

**Kelly Riggs:** Because you can win it. We've looked at the numbers.

You could say:

1. All right. I'll do it.
2. The answer is no.
3. If I run, I'll need the party behind me all the way.  *(the page follows this one)*
4. I'm still weighing it.
5. I'm seriously thinking about it.

**Kelly Riggs:** That I can live with.

<sub>L1 narrate/narrate/scene-talk/braced/12w1s [scene-talk.narrate-narrate.name-who-chairs-the-party-party-has-asked-to-see-you]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/request/scene-talk/hopeful/9w2s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/4w3s [scene-talk.auto-ask.office-why-me]; L5 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.because-you-can-win-it-we-ve-looked-at-the-numbers]; L6 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L7 reply/refuse/scene-talk/guarded/4w1s [scene-talk.reply-refuse.the-answer-is-no]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L13 follow/accept/scene-talk/calm/5w1s [scene-talk.follow-accept.that-i-can-live-with]</sub>

## Scene 19: office-hours (favor-asked, ends in money) — proof scene

*Purpose constituent-help. Records: person_ad6661730b7a44c8:2027-07-01:work-relationship_44d65ba97bdb60b6, work-relationship_44d65ba97bdb60b6, person_ad6661730b7a44c8, person_9e002a561a4b29bc.*

> It's office hours, and Leslie Robbins is next in line.

**Profile warm** (outcome open)

**Leslie Robbins:** Thank you for seeing me.

**Leslie Robbins:** I lost my job, and I don't know where else to go.

You could say:

1. We'll get you an answer this week.
2. Have you talked to anyone else about it?  *(the page follows this one)*
3. That's not something the town handles. I'm sorry.
4. Let me have someone from my office call you tomorrow.
5. I already called them about it.

**Leslie Robbins:** Everyone sends me somewhere else.

You could say:

1. We'll get you an answer this week.
2. Let me have someone from my office call you tomorrow.  *(the page follows this one)*
3. I'm not sure my office can help with that.

**Leslie Robbins:** Thank you. That's more than anyone else has done.

**The whole exchange** (60 nodes; endings: resolved, open, open, open, open, resolved, open, open, open, open, resolved, open, open, open, resolved, open, open, resolved, open, refused, resolved, open, open, open, open, resolved, open, open, open, open, open, open, resolved; ★ is the branch this profile's traits lean toward):

- You: We'll get you an answer this week.
  - Leslie Robbins: Will you really call?
  - You: I will. You have my word.
    - Leslie Robbins: Will you really call?
    - You: I will. You have my word.
      - Leslie Robbins: Will you really call?
      - You: I will. You have my word.
        - Leslie Robbins: Will you really call?
        - You: I will. You have my word.
          - Leslie Robbins: Thank you. I didn't know where else to turn.
          - *Ends resolved*
        - You: Leave me your number. We'll follow up this week.
          - Leslie Robbins: Thank you. I didn't know where else to turn.
          - *Ends open*
      - You: Leave me your number. We'll follow up this week.
        - Leslie Robbins: Thank you. That's more than anyone else has done.
        - *Ends open*
    - You: Leave me your number. We'll follow up this week.
      - Leslie Robbins: Thank you. That's more than anyone else has done.
      - *Ends open*
  - You: Let me have someone from my office call you tomorrow.
    - Leslie Robbins: Thank you. That's more than anyone else has done.
    - *Ends open*
- You ★: Have you talked to anyone else about it?
  - Leslie Robbins: Everyone sends me somewhere else.
  - You: We'll get you an answer this week.
    - Leslie Robbins: Will you really call?
    - You: I will. You have my word.
      - Leslie Robbins: Will you really call?
      - You: I will. You have my word.
        - Leslie Robbins: Will you really call?
        - You: I will. You have my word.
          - Leslie Robbins: Thank you. I didn't know where else to turn.
          - *Ends resolved*
        - You: Let me have someone from my office call you tomorrow.
          - Leslie Robbins: Thank you. I didn't know where else to turn.
          - *Ends open*
      - You: Let me have someone from my office call you tomorrow.
        - Leslie Robbins: Thank you. That's more than anyone else has done.
        - *Ends open*
    - You: Let me have someone from my office call you tomorrow.
      - Leslie Robbins: Thank you. I didn't know where else to turn.
      - *Ends open*
  - You ★: Let me have someone from my office call you tomorrow.
    - Leslie Robbins: Thank you. That's more than anyone else has done.
    - *Ends open*
  - You: I'm not sure my office can help with that.
    - Leslie Robbins: Please. There has to be something.
    - You: We'll get you an answer this week.
      - Leslie Robbins: Will you really call?
      - You: I will. You have my word.
        - Leslie Robbins: Will you really call?
        - You: I will. You have my word.
          - Leslie Robbins: Thank you. That's more than anyone else has done.
          - *Ends resolved*
        - You: Leave me your number. We'll follow up this week.
          - Leslie Robbins: Thank you. I didn't know where else to turn.
          - *Ends open*
      - You: Let me have someone from my office call you tomorrow.
        - Leslie Robbins: Thank you. I didn't know where else to turn.
        - *Ends open*
    - You: Leave me your number. We'll follow up this week.
      - Leslie Robbins: Thank you. I didn't know where else to turn.
      - *Ends open*
    - You: That's not something the town handles. I'm sorry.
      - Leslie Robbins: I've got nowhere else to go.
      - You: I'll make some calls today.
        - Leslie Robbins: Will you really call?
        - You: I will. You have my word.
          - Leslie Robbins: Thank you. That's more than anyone else has done.
          - *Ends resolved*
        - You: Leave me your number. We'll follow up this week.
          - Leslie Robbins: Thank you. I didn't know where else to turn.
          - *Ends open*
      - You: Let me have someone from my office call you tomorrow.
        - Leslie Robbins: Thank you. I didn't know where else to turn.
        - *Ends open*
      - You: That's not something the town handles. I'm sorry.
        - Leslie Robbins: Please. There has to be something.
        - You: We'll get you an answer this week.
          - Leslie Robbins: Thank you. That's more than anyone else has done.
          - *Ends resolved*
        - You: Leave me your number. We'll follow up this week.
          - Leslie Robbins: Thank you. I didn't know where else to turn.
          - *Ends open*
        - You: That's not something the town handles. I'm sorry.
          - Leslie Robbins: I've got nowhere else to go.
          - *Ends refused*
- You: That's not something the town handles. I'm sorry.
  - Leslie Robbins: Please. There has to be something.
  - You: I'll make some calls today.
    - Leslie Robbins: Will you really call?
    - You: I will. You have my word.
      - Leslie Robbins: Will you really call?
      - You: I will. You have my word.
        - Leslie Robbins: Will you really call?
        - You: I will. You have my word.
          - Leslie Robbins: Thank you. I didn't know where else to turn.
          - *Ends resolved*
        - You: Let me have someone from my office call you tomorrow.
          - Leslie Robbins: Thank you. I didn't know where else to turn.
          - *Ends open*
      - You: Let me have someone from my office call you tomorrow.
        - Leslie Robbins: Thank you. That's more than anyone else has done.
        - *Ends open*
    - You: Let me have someone from my office call you tomorrow.
      - Leslie Robbins: Thank you. I didn't know where else to turn.
      - *Ends open*
  - You: Let me have someone from my office call you tomorrow.
    - Leslie Robbins: Thank you. I didn't know where else to turn.
    - *Ends open*
  - You: I'm not sure my office can help with that.
    - Leslie Robbins: I've got nowhere else to go.
    - You: I'll make some calls today.
      - Leslie Robbins: Will you really call?
      - You: I will. You have my word.
        - Leslie Robbins: Will you really call?
        - You: I will. You have my word.
          - Leslie Robbins: Thank you. I didn't know where else to turn.
          - *Ends resolved*
        - You: Let me have someone from my office call you tomorrow.
          - (the tree is cut here)
      - You: Let me have someone from my office call you tomorrow.
        - Leslie Robbins: Thank you. I didn't know where else to turn.
        - *Ends open*
    - You: Leave me your number. We'll follow up this week.
      - Leslie Robbins: Thank you. I didn't know where else to turn.
      - *Ends open*
    - You: I'm not sure my office can help with that.
      - Leslie Robbins: I've got nowhere else to go.
      - You: We'll get you an answer this week.
        - Leslie Robbins: Will you really call?
        - You: I will. You have my word.
          - (the tree is cut here)
        - You: Leave me your number. We'll follow up this week.
          - (the tree is cut here)
      - You: Let me have someone from my office call you tomorrow.
        - Leslie Robbins: Thank you. I didn't know where else to turn.
        - *Ends open*
      - You: I'm not sure my office can help with that.
        - Leslie Robbins: Please. There has to be something.
        - You: I'll make some calls today.
          - (the tree is cut here)
        - You: Let me have someone from my office call you tomorrow.
          - (the tree is cut here)
        - You: That's not something the town handles. I'm sorry.
          - (the tree is cut here)
- You: Let me have someone from my office call you tomorrow.
  - Leslie Robbins: Thank you. That's more than anyone else has done.
  - *Ends open*
- You: I already called them about it.
  - *if Leslie Robbins knows:*
    - Leslie Robbins: They told me nobody's called.
    - You: You're right. I shouldn't have said that.
      - Leslie Robbins: Thank you for telling me straight.
      - *Ends open*
    - You: I already called them about it.
      - *Ends open: Leslie Robbins: Please don't forget about us.*
  - *if not:*
    - Leslie Robbins: Thank you. I'll wait to hear from them.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.thank-you-for-seeing-me]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L26 follow/answer/scene-talk/anxious/5w1s [scene-talk.follow-answer.everyone-sends-me-somewhere-else]; L27 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L28 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L29 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L43 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

**Profile cold** (outcome resolved)

**Leslie Robbins:** Thank you for seeing me.

**Leslie Robbins:** I lost my job, and I don't know where else to go.

You could say:

1. I'll see what my office can do.
2. Have you talked to anyone else about it?  *(the page follows this one)*
3. That's not something the town handles. I'm sorry.
4. Leave me your number. We'll follow up this week.
5. I already called them about it.

**Leslie Robbins:** Everyone sends me somewhere else.

You could say:

1. We'll get you an answer this week.  *(the page follows this one)*
2. Let me have someone from my office call you tomorrow.
3. That's not something the town handles. I'm sorry.

**Leslie Robbins:** Will you really call?

You could say:

1. I will. You have my word.  *(the page follows this one)*
2. Leave me your number. We'll follow up this week.

**Leslie Robbins:** Will you really call?

You could say:

1. I will. You have my word.  *(the page follows this one)*
2. Leave me your number. We'll follow up this week.

**Leslie Robbins:** Will you really call?

You could say:

1. I will. You have my word.  *(the page follows this one)*
2. Leave me your number. We'll follow up this week.

**Leslie Robbins:** Thank you. I didn't know where else to turn.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.thank-you-for-seeing-me]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.i-ll-see-what-my-office-can-do]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L7 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L26 follow/answer/scene-talk/anxious/5w1s [scene-talk.follow-answer.everyone-sends-me-somewhere-else]; L27 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L28 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L29 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L30 follow/press/scene-talk/nervous/4w1s [scene-talk.follow-press.will-you-really-call]; L31 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.i-will-you-have-my-word]; L32 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L33 follow/press/scene-talk/nervous/4w1s [scene-talk.follow-press.will-you-really-call]; L34 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.i-will-you-have-my-word]; L35 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L36 follow/press/scene-talk/nervous/4w1s [scene-talk.follow-press.will-you-really-call]; L37 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.i-will-you-have-my-word]; L38 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L39 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-i-didn-t-know-where-else-to-turn]</sub>

**Profile stubborn** (outcome open)

**Leslie Robbins:** Thank you for seeing me.

**Leslie Robbins:** I lost my job, and I don't know where else to go.

You could say:

1. We'll get you an answer this week.
2. Have you talked to anyone else about it?  *(the page follows this one)*
3. That's not something the town handles. I'm sorry.
4. Let me have someone from my office call you tomorrow.
5. I already called them about it.

**Leslie Robbins:** Everyone sends me somewhere else.

You could say:

1. I'll make some calls today.
2. Let me have someone from my office call you tomorrow.  *(the page follows this one)*
3. That's not something the town handles. I'm sorry.

**Leslie Robbins:** Thank you. That's more than anyone else has done.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.thank-you-for-seeing-me]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L26 follow/answer/scene-talk/anxious/5w1s [scene-talk.follow-answer.everyone-sends-me-somewhere-else]; L27 reply/promise/scene-talk/tender/5w1s [scene-talk.reply-promise.i-ll-make-some-calls-today]; L28 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L29 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L43 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

**Profile anxious** (outcome open)

**Leslie Robbins:** Thank you for seeing me.

**Leslie Robbins:** I lost my job, and I don't know where else to go.

You could say:

1. We'll get you an answer this week.
2. When did this start?  *(the page follows this one)*
3. I'm not sure my office can help with that.
4. Let me have someone from my office call you tomorrow.
5. I already called them about it.

**Leslie Robbins:** A few months now. It's been hard to keep up.

You could say:

1. I'll see what my office can do.
2. Let me have someone from my office call you tomorrow.  *(the page follows this one)*
3. I'm not sure my office can help with that.

**Leslie Robbins:** Thank you. I didn't know where else to turn.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.thank-you-for-seeing-me]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L5 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.when-did-this-start]; L6 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L26 follow/answer/scene-talk/anxious/10w2s [scene-talk.follow-answer.a-few-months-now-it-s-been-hard-to-keep-up]; L27 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.i-ll-see-what-my-office-can-do]; L28 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L29 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L43 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-i-didn-t-know-where-else-to-turn]</sub>

**Profile boastful** (outcome open)

**Leslie Robbins:** Thank you for seeing me.

**Leslie Robbins:** I lost my job, and I don't know where else to go.

You could say:

1. I'll make some calls today.
2. When did this start?  *(the page follows this one)*
3. I'm not sure my office can help with that.
4. Leave me your number. We'll follow up this week.
5. I already called them about it.

**Leslie Robbins:** A few months now. It's been hard to keep up.

You could say:

1. I'll see what my office can do.
2. Let me have someone from my office call you tomorrow.  *(the page follows this one)*
3. I'm not sure my office can help with that.

**Leslie Robbins:** Thank you. That's more than anyone else has done.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.thank-you-for-seeing-me]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/tender/5w1s [scene-talk.reply-promise.i-ll-make-some-calls-today]; L5 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.when-did-this-start]; L6 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L7 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L26 follow/answer/scene-talk/anxious/10w2s [scene-talk.follow-answer.a-few-months-now-it-s-been-hard-to-keep-up]; L27 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.i-ll-see-what-my-office-can-do]; L28 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L29 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L43 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

## Scene 20: office-hours (favor-asked, ends in money) — proof scene

*Purpose constituent-help. Records: person_5df2739ae2587c09:2027-05-23:event:housing.eviction:eviction:lease:household_e3b7a1c2299a39ab:2027-05-06, event:housing.eviction:eviction:lease:household_e3b7a1c2299a39ab:2027-05-06, person_5df2739ae2587c09, person_d3c12275ee46b085.*

> Andrew Robbins lives in Brookside and has come to your office for help.

**Profile warm** (outcome resolved)

**Andrew Robbins:** I didn't know who else to go to.

**Andrew Robbins:** We're being evicted, and I need help.

You could say:

1. I'll see what my office can do.
2. When did this start?  *(the page follows this one)*
3. I'm not sure my office can help with that.
4. Let me have someone from my office call you tomorrow.
5. I already called them about it.

**Andrew Robbins:** A few months now. It's been hard to keep up.

You could say:

1. I'll make some calls today.  *(the page follows this one)*
2. Leave me your number. We'll follow up this week.
3. That's not something the town handles. I'm sorry.

**Andrew Robbins:** Thank you. I didn't know where else to turn.

**The whole exchange** (13 nodes; endings: resolved, resolved, open, refused, refused, open, open, open, resolved; ★ is the branch this profile's traits lean toward):

- You: I'll see what my office can do.
  - Andrew Robbins: Thank you. I didn't know where else to turn.
  - *Ends resolved*
- You ★: When did this start?
  - Andrew Robbins: A few months now. It's been hard to keep up.
  - You ★: I'll make some calls today.
    - Andrew Robbins: Thank you. I didn't know where else to turn.
    - *Ends resolved*
  - You: Leave me your number. We'll follow up this week.
    - Andrew Robbins: Thank you. That's more than anyone else has done.
    - *Ends open*
  - You: That's not something the town handles. I'm sorry.
    - Andrew Robbins: I understand. Thank you for listening.
    - *Ends refused*
- You: I'm not sure my office can help with that.
  - Andrew Robbins: I understand. Thank you for listening.
  - *Ends refused*
- You: Let me have someone from my office call you tomorrow.
  - Andrew Robbins: Thank you. I didn't know where else to turn.
  - *Ends open*
- You: I already called them about it.
  - *if Andrew Robbins knows:*
    - Andrew Robbins: They told me nobody's called.
    - You: All right. Here's the truth.
      - Andrew Robbins: Thank you for telling me straight.
      - *Ends open*
    - You: I already called them about it.
      - *Ends open: Andrew Robbins: Please don't forget about us.*
  - *if not:*
    - Andrew Robbins: Thank you. I'll wait to hear from them.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/calm/13w1s [scene-talk.narrate-narrate.name-lives-in-place-and-has-come-to-your-office-for-help]; L2 open/greet/scene-talk/anxious/8w1s [scene-talk.open-greet.i-didn-t-know-who-else-to-go-to]; L3 state/request/scene-talk/anxious/7w1s [scene-talk.state-request.we-re-being-evicted-and-i-need-help]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.i-ll-see-what-my-office-can-do]; L5 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.when-did-this-start]; L6 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L10 follow/answer/scene-talk/anxious/10w2s [scene-talk.follow-answer.a-few-months-now-it-s-been-hard-to-keep-up]; L11 reply/promise/scene-talk/tender/5w1s [scene-talk.reply-promise.i-ll-make-some-calls-today]; L12 reply/offer/scene-talk/calm/9w2s [scene-talk.reply-offer.leave-me-your-number-we-ll-follow-up-this-week]; L13 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L14 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-i-didn-t-know-where-else-to-turn]</sub>

**Profile cold** (outcome resolved)

**Andrew Robbins:** I didn't know who else to go to.

**Andrew Robbins:** We're being evicted, and I need help.

You could say:

1. We'll get you an answer this week.  *(the page follows this one)*
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

1. I'll make some calls today.  *(the page follows this one)*
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

1. I'll make some calls today.  *(the page follows this one)*
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

1. I'll see what my office can do.  *(the page follows this one)*
2. When did this start?
3. That's not something the town handles. I'm sorry.
4. Let me have someone from my office call you tomorrow.
5. I already called them about it.

**Andrew Robbins:** Thank you. I didn't know where else to turn.

<sub>L1 narrate/narrate/scene-talk/calm/13w1s [scene-talk.narrate-narrate.name-lives-in-place-and-has-come-to-your-office-for-help]; L2 open/greet/scene-talk/anxious/8w1s [scene-talk.open-greet.i-didn-t-know-who-else-to-go-to]; L3 state/request/scene-talk/anxious/7w1s [scene-talk.state-request.we-re-being-evicted-and-i-need-help]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.i-ll-see-what-my-office-can-do]; L5 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.when-did-this-start]; L6 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L9 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-i-didn-t-know-where-else-to-turn]</sub>

## Scene 21: office-hours (favor-asked, ends in money) — proof scene

*Purpose constituent-help. Records: person_b6f0d51289db799a:2027-07-01:job:position:organization_b74b9bd31243618a:2027-06-01:2:person_b6f0d61289db7b4d, job:position:organization_b74b9bd31243618a:2027-06-01:2:person_b6f0d61289db7b4d, person_b6f0d51289db799a, person_bc041df6bd9d1a47.*

> It's office hours, and Zachary Shepard is next in line.

**Profile warm** (outcome resolved)

**Zachary Shepard:** I won't take long.

**Zachary Shepard:** I lost my job, and I don't know where else to go.

You could say:

1. I'll make some calls today.
2. Have you talked to anyone else about it?  *(the page follows this one)*
3. I'm not sure my office can help with that.
4. Let me have someone from my office call you tomorrow.
5. I already called them about it.

**Zachary Shepard:** I've called everyone I can think of.

You could say:

1. I'll make some calls today.  *(the page follows this one)*
2. Let me have someone from my office call you tomorrow.
3. That's not something the town handles. I'm sorry.

**Zachary Shepard:** Thank you. That's more than anyone else has done.

**The whole exchange** (42 nodes; endings: resolved, resolved, resolved, resolved, open, resolved, open, resolved, open, resolved, open, refused, resolved, open, resolved, resolved, open, resolved, resolved, open, resolved, open, refused, open, open, open, resolved; ★ is the branch this profile's traits lean toward):

- You: I'll make some calls today.
  - Zachary Shepard: Thank you. That's more than anyone else has done.
  - *Ends resolved*
- You ★: Have you talked to anyone else about it?
  - Zachary Shepard: I've called everyone I can think of.
  - You ★: I'll make some calls today.
    - Zachary Shepard: Thank you. That's more than anyone else has done.
    - *Ends resolved*
  - You: Let me have someone from my office call you tomorrow.
    - Zachary Shepard: Will you really call?
    - You: I will. You have my word.
      - Zachary Shepard: Thank you. That's more than anyone else has done.
      - *Ends resolved*
    - You: Leave me your number. We'll follow up this week.
      - Zachary Shepard: Will you really call?
      - You: I will. You have my word.
        - Zachary Shepard: Thank you. I didn't know where else to turn.
        - *Ends resolved*
      - You: Let me have someone from my office call you tomorrow.
        - Zachary Shepard: Thank you. That's more than anyone else has done.
        - *Ends open*
  - You: That's not something the town handles. I'm sorry.
    - Zachary Shepard: Please. There has to be something.
    - You: I'll make some calls today.
      - Zachary Shepard: Thank you. That's more than anyone else has done.
      - *Ends resolved*
    - You: Leave me your number. We'll follow up this week.
      - Zachary Shepard: Thank you. I didn't know where else to turn.
      - *Ends open*
    - You: I'm not sure my office can help with that.
      - Zachary Shepard: I've got nowhere else to go.
      - You: I'll make some calls today.
        - Zachary Shepard: Thank you. I didn't know where else to turn.
        - *Ends resolved*
      - You: Let me have someone from my office call you tomorrow.
        - Zachary Shepard: Thank you. That's more than anyone else has done.
        - *Ends open*
      - You: That's not something the town handles. I'm sorry.
        - Zachary Shepard: I've got nowhere else to go.
        - You: I'll make some calls today.
          - Zachary Shepard: Thank you. That's more than anyone else has done.
          - *Ends resolved*
        - You: Leave me your number. We'll follow up this week.
          - Zachary Shepard: Thank you. That's more than anyone else has done.
          - *Ends open*
        - You: That's not something the town handles. I'm sorry.
          - Zachary Shepard: I've got nowhere else to go.
          - *Ends refused*
- You: I'm not sure my office can help with that.
  - Zachary Shepard: Please. There has to be something.
  - You: I'll see what my office can do.
    - Zachary Shepard: Thank you. I didn't know where else to turn.
    - *Ends resolved*
  - You: Let me have someone from my office call you tomorrow.
    - Zachary Shepard: Thank you. That's more than anyone else has done.
    - *Ends open*
  - You: That's not something the town handles. I'm sorry.
    - Zachary Shepard: I've got nowhere else to go.
    - You: I'll make some calls today.
      - Zachary Shepard: Thank you. I didn't know where else to turn.
      - *Ends resolved*
    - You: Let me have someone from my office call you tomorrow.
      - Zachary Shepard: Will you really call?
      - You: I will. You have my word.
        - Zachary Shepard: Thank you. That's more than anyone else has done.
        - *Ends resolved*
      - You: Leave me your number. We'll follow up this week.
        - Zachary Shepard: Thank you. That's more than anyone else has done.
        - *Ends open*
    - You: I'm not sure my office can help with that.
      - Zachary Shepard: I've got nowhere else to go.
      - You: We'll get you an answer this week.
        - Zachary Shepard: Thank you. I didn't know where else to turn.
        - *Ends resolved*
      - You: Let me have someone from my office call you tomorrow.
        - Zachary Shepard: Will you really call?
        - You: I will. You have my word.
          - Zachary Shepard: Thank you. That's more than anyone else has done.
          - *Ends resolved*
        - You: Leave me your number. We'll follow up this week.
          - Zachary Shepard: Thank you. That's more than anyone else has done.
          - *Ends open*
      - You: That's not something the town handles. I'm sorry.
        - Zachary Shepard: I've got nowhere else to go.
        - You: I'll make some calls today.
          - Zachary Shepard: Thank you. That's more than anyone else has done.
          - *Ends resolved*
        - You: Let me have someone from my office call you tomorrow.
          - Zachary Shepard: Thank you. That's more than anyone else has done.
          - *Ends open*
        - You: I'm not sure my office can help with that.
          - Zachary Shepard: Please. There has to be something.
          - *Ends refused*
- You: Let me have someone from my office call you tomorrow.
  - Zachary Shepard: Thank you. I didn't know where else to turn.
  - *Ends open*
- You: I already called them about it.
  - *if Zachary Shepard knows:*
    - Zachary Shepard: They told me nobody's called.
    - You: You're right. I shouldn't have said that.
      - Zachary Shepard: Thank you for telling me straight.
      - *Ends open*
    - You: I already called them about it.
      - *Ends open: Zachary Shepard: Please don't forget about us.*
  - *if not:*
    - Zachary Shepard: Thank you. I'll wait to hear from them.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.i-won-t-take-long]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/tender/5w1s [scene-talk.reply-promise.i-ll-make-some-calls-today]; L5 reply/ask/scene-talk/curious/8w1s [scene-talk.reply-ask.have-you-talked-to-anyone-else-about-it]; L6 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L10 follow/answer/scene-talk/anxious/7w1s [scene-talk.follow-answer.i-ve-called-everyone-i-can-think-of]; L11 reply/promise/scene-talk/tender/5w1s [scene-talk.reply-promise.i-ll-make-some-calls-today]; L12 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L13 reply/decline/scene-talk/guarded/8w2s [scene-talk.reply-decline.that-s-not-something-the-town-handles-i-m-sorry]; L14 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

**Profile cold** (outcome resolved)

**Zachary Shepard:** I won't take long.

**Zachary Shepard:** I lost my job, and I don't know where else to go.

You could say:

1. I'll see what my office can do.  *(the page follows this one)*
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

1. I'll see what my office can do.  *(the page follows this one)*
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

1. We'll get you an answer this week.  *(the page follows this one)*
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

1. We'll get you an answer this week.  *(the page follows this one)*
2. When did this start?
3. I'm not sure my office can help with that.
4. Let me have someone from my office call you tomorrow.
5. I already called them about it.

**Zachary Shepard:** Thank you. That's more than anyone else has done.

<sub>L1 narrate/narrate/scene-talk/calm/10w1s [scene-talk.narrate-narrate.it-s-office-hours-and-name-is-next-in-line]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.thank-you-for-seeing-me]; L3 state/request/scene-talk/anxious/12w1s [scene-talk.state-request.i-lost-my-job-and-i-don-t-know-where-else-to-go]; L4 reply/promise/scene-talk/calm/7w1s [scene-talk.reply-promise.we-ll-get-you-an-answer-this-week]; L5 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.when-did-this-start]; L6 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L9 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

## Scene 22: family-filing (news-received, ends in political) — proof scene

*Purpose family-filing. Records: filing:contest:seat:gus2025:101811:board:6:2026-11-03:person_d3c12275ee46b085, contest:seat:gus2025:101811:board:6:2026-11-03, person_d3c11e75ee46a9b9, person_d3c12275ee46b085.*

> Word that you filed for County Commissioner got home before you did. Bentley Rivas is waiting.

**Profile warm** (outcome resolved)

**Bentley Rivas:** There you are.

**Bentley Rivas:** Why didn't you tell me you were running?

You could say:

1. Who told you?

**Bentley Rivas:** Amanda Nixon told me.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it.  *(the page follows this one)*
2. Will you help me?
3. I was going to tell you tonight.
4. It'll be all right. We'll make it work.
5. I haven't decided anything yet.

**Bentley Rivas:** Then I'm with you.

You could say:

1. I won't let it take over our lives.  *(the page follows this one)*
2. Will you help me?

**Bentley Rivas:** Okay. Next time, tell me first.

**The whole exchange** (21 nodes; endings: resolved, open, open, resolved, open, resolved, resolved, resolved, open, resolved, resolved, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- Latoya Rivas (without a choice): Who told you?
- Bentley Rivas: Amanda Nixon told me.
- You ★: I didn't tell you because I wasn't sure I'd go through with it.
  - Bentley Rivas: Then I'm with you.
  - You ★: I won't let it take over our lives.
    - Bentley Rivas: Okay. Next time, tell me first.
    - *Ends resolved*
  - You: Will you help me?
    - Bentley Rivas: I'll be there.
    - *Ends open: Bentley Rivas: We're not done talking about this.*
- You: Will you help me?
  - Bentley Rivas: Of course I'll help.
  - *Ends open: Bentley Rivas: Talk to me tomorrow. Promise.*
- You: I was going to tell you tonight.
  - Bentley Rivas: No. We talk about it now.
  - You: I'm running because somebody has to.
    - Bentley Rivas: Then I'm with you.
    - You: I won't let it take over our lives.
      - Bentley Rivas: Okay. Next time, tell me first.
      - *Ends resolved*
    - You: Will you help me?
      - Bentley Rivas: Of course I'll help.
      - *Ends open: Bentley Rivas: Talk to me tomorrow. Promise.*
  - You: You're right. I should have told you first.
    - Bentley Rivas: Okay. I'm with you, then.
    - *Ends resolved*
  - You: I won't let it take over our lives.
    - Bentley Rivas: Okay. Next time, tell me first.
    - *Ends resolved*
- You: It'll be all right. We'll make it work.
  - Bentley Rivas: Okay. Next time, tell me first.
  - *Ends resolved*
- You: I haven't decided anything yet.
  - *if Bentley Rivas knows:*
    - Bentley Rivas: Amanda Nixon saw your name on the list.
    - You: You're right. I'm sorry.
      - Bentley Rivas: Okay. I'm with you, then.
      - *Ends open*
    - You: I was going to tell you tonight.
      - Bentley Rivas: No. We talk about it now.
      - You: I didn't tell you because I wasn't sure I'd go through with it.
        - *Ends resolved*
      - You: You're right. I should have told you first.
        - *Ends resolved*
      - You: I won't let it take over our lives.
        - *Ends resolved*
    - You: I haven't decided anything yet.
      - *Ends open: Bentley Rivas: We're not done talking about this.*
  - *if not:*
    - Bentley Rivas: Okay. Just tell me before you do.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 auto/ask/scene-talk/nervous/3w1s [scene-talk.auto-ask.who-told-you]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/nervous/7w1s [scene-talk.reply-deflect.i-was-going-to-tell-you-tonight]; L9 reply/comfort/scene-talk/tender/8w2s [scene-talk.reply-comfort.it-ll-be-all-right-we-ll-make-it-work]; L10 reply/lie/scene-talk/nervous/5w1s [scene-talk.reply-lie.i-haven-t-decided-anything-yet]; L11 follow/comfort/scene-talk/tender/4w1s [scene-talk.follow-comfort.then-i-m-with-you]; L12 reply/promise/scene-talk/tender/8w1s [scene-talk.reply-promise.i-won-t-let-it-take-over-our-lives]; L13 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L14 follow/thank/scene-talk/hurt/6w2s [scene-talk.follow-thank.okay-next-time-tell-me-first]</sub>

**Profile cold** (outcome resolved)

**Bentley Rivas:** There you are.

**Bentley Rivas:** Why didn't you tell me you were running?

You could say:

1. Who told you?

**Bentley Rivas:** Amanda Nixon told me.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it.
2. Will you help me?
3. It's been a long day.  *(the page follows this one)*
4. We'll figure it out together. I promise.
5. I haven't decided anything yet.

**Bentley Rivas:** No. We talk about it now.

You could say:

1. I'm running because somebody has to.
2. You're right. I should have told you first.
3. I won't let it take over our lives.  *(the page follows this one)*

**Bentley Rivas:** Okay. Next time, tell me first.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 auto/ask/scene-talk/nervous/3w1s [scene-talk.auto-ask.who-told-you]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L9 reply/comfort/scene-talk/tender/7w2s [scene-talk.reply-comfort.we-ll-figure-it-out-together-i-promise]; L10 reply/lie/scene-talk/nervous/5w1s [scene-talk.reply-lie.i-haven-t-decided-anything-yet]; L62 follow/press/scene-talk/hurt/6w2s [scene-talk.follow-press.no-we-talk-about-it-now]; L63 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L64 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L65 reply/promise/scene-talk/tender/8w1s [scene-talk.reply-promise.i-won-t-let-it-take-over-our-lives]; L101 follow/thank/scene-talk/hurt/6w2s [scene-talk.follow-thank.okay-next-time-tell-me-first]</sub>

**Profile stubborn** (outcome resolved)

**Bentley Rivas:** There you are.

**Bentley Rivas:** Why didn't you tell me you were running?

You could say:

1. Who told you?

**Bentley Rivas:** Amanda Nixon told me.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it.  *(the page follows this one)*
2. Will you help me?
3. It's been a long day.
4. It'll be all right. We'll make it work.
5. I haven't decided anything yet.

**Bentley Rivas:** Why does it have to be you?

You could say:

1. I'm running because somebody has to.  *(the page follows this one)*
2. You're right. I should have told you first.
3. Will you help me?

**Bentley Rivas:** Somebody else can do it.

You could say:

1. I want to do something for Brookside.  *(the page follows this one)*
2. You're right. I should have told you first.
3. Will you help me?

**Bentley Rivas:** Somebody else can do it.

You could say:

1. I'm running because somebody has to.  *(the page follows this one)*
2. You're right. I should have told you first.
3. Will you help me?

**Bentley Rivas:** Somebody else can do it.

You could say:

1. I want to do something for Brookside.  *(the page follows this one)*
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Bentley Rivas:** Then I'm with you.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 auto/ask/scene-talk/nervous/3w1s [scene-talk.auto-ask.who-told-you]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L9 reply/comfort/scene-talk/tender/8w2s [scene-talk.reply-comfort.it-ll-be-all-right-we-ll-make-it-work]; L10 reply/lie/scene-talk/nervous/5w1s [scene-talk.reply-lie.i-haven-t-decided-anything-yet]; L11 follow/disagree/scene-talk/hurt/7w1s [scene-talk.follow-disagree.why-does-it-have-to-be-you]; L12 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L13 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L14 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L15 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.somebody-else-can-do-it]; L16 reply/tell/scene-talk/eager/7w1s [scene-talk.reply-tell.i-want-to-do-something-for-place]; L17 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L18 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L19 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.somebody-else-can-do-it]; L20 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L21 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L22 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L23 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.somebody-else-can-do-it]; L24 reply/tell/scene-talk/eager/7w1s [scene-talk.reply-tell.i-want-to-do-something-for-place]; L25 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L26 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L27 follow/comfort/scene-talk/tender/4w1s [scene-talk.follow-comfort.then-i-m-with-you]</sub>

**Profile anxious** (outcome resolved)

**Bentley Rivas:** There you are.

**Bentley Rivas:** Why didn't you tell me you were running?

You could say:

1. Who told you?

**Bentley Rivas:** Amanda Nixon told me.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it.
2. Will you help me?
3. I was going to tell you tonight.  *(the page follows this one)*
4. We'll figure it out together. I promise.
5. I haven't decided anything yet.

**Bentley Rivas:** Just tell me the truth.

You could say:

1. I'm running because somebody has to.
2. You're right. I should have told you first.
3. I won't let it take over our lives.  *(the page follows this one)*

**Bentley Rivas:** Okay. Next time, tell me first.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 auto/ask/scene-talk/nervous/3w1s [scene-talk.auto-ask.who-told-you]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/nervous/7w1s [scene-talk.reply-deflect.i-was-going-to-tell-you-tonight]; L9 reply/comfort/scene-talk/tender/7w2s [scene-talk.reply-comfort.we-ll-figure-it-out-together-i-promise]; L10 reply/lie/scene-talk/nervous/5w1s [scene-talk.reply-lie.i-haven-t-decided-anything-yet]; L42 follow/plea/scene-talk/hurt/5w1s [scene-talk.follow-plea.just-tell-me-the-truth]; L43 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L44 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L45 reply/promise/scene-talk/tender/8w1s [scene-talk.reply-promise.i-won-t-let-it-take-over-our-lives]; L69 follow/thank/scene-talk/hurt/6w2s [scene-talk.follow-thank.okay-next-time-tell-me-first]</sub>

**Profile boastful** (outcome resolved)

**Bentley Rivas:** There you are.

**Bentley Rivas:** Why didn't you tell me you were running?

You could say:

1. Who told you?

**Bentley Rivas:** Amanda Nixon told me.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it.  *(the page follows this one)*
2. Will you help me?
3. It's been a long day.
4. It'll be all right. We'll make it work.
5. I haven't decided anything yet.

**Bentley Rivas:** Why this, and why now?

You could say:

1. I'm running because somebody has to.  *(the page follows this one)*
2. You're right. I should have told you first.
3. Will you help me?

**Bentley Rivas:** Then I'm with you.

You could say:

1. I won't let it take over our lives.  *(the page follows this one)*
2. Will you help me?

**Bentley Rivas:** Okay. Next time, tell me first.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 auto/ask/scene-talk/nervous/3w1s [scene-talk.auto-ask.who-told-you]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L9 reply/comfort/scene-talk/tender/8w2s [scene-talk.reply-comfort.it-ll-be-all-right-we-ll-make-it-work]; L10 reply/lie/scene-talk/nervous/5w1s [scene-talk.reply-lie.i-haven-t-decided-anything-yet]; L11 follow/ask/scene-talk/hurt/5w1s [scene-talk.follow-ask.why-this-and-why-now]; L12 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L13 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L14 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L15 follow/comfort/scene-talk/tender/4w1s [scene-talk.follow-comfort.then-i-m-with-you]; L16 reply/promise/scene-talk/tender/8w1s [scene-talk.reply-promise.i-won-t-let-it-take-over-our-lives]; L17 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L18 follow/thank/scene-talk/hurt/6w2s [scene-talk.follow-thank.okay-next-time-tell-me-first]</sub>

## Scene 23: family-filing (news-received, ends in political) — proof scene

*Purpose family-filing. Records: filing:contest:seat:gus2025:101811:assessor:0:2026-11-03:person_8875c9c2afd1ae76, contest:seat:gus2025:101811:assessor:0:2026-11-03, person_8875cac2afd1b029, person_8875c9c2afd1ae76.*

> You filed today to run for County assessor. Andrew Peters has been waiting for you at home.

**Profile warm** (outcome resolved)

**Andrew Peters:** So. You did it.

**Andrew Peters:** Are you sure about running for County assessor?

You could say:

1. How did you know?

**Andrew Peters:** Andrew Robbins told me.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it.  *(the page follows this one)*
2. Will you help me?
3. I was going to tell you tonight.
4. We'll figure it out together. I promise.
5. I haven't decided anything yet.

**Andrew Peters:** Why does it have to be you?

You could say:

1. I'm running because somebody has to.  *(the page follows this one)*
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Somebody else can do it.

You could say:

1. I want to do something for New Castle County.  *(the page follows this one)*
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Somebody else can do it.

You could say:

1. I'm running because somebody has to.  *(the page follows this one)*
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Somebody else can do it.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it.  *(the page follows this one)*
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Somebody else can do it.

**The whole exchange** (38 nodes; endings: resolved, resolved, open, resolved, open, resolved, open, resolved, open, open, resolved, resolved, open, resolved, open, resolved, open, resolved, resolved, resolved, open, resolved, resolved, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- Sharon Peters (without a choice): How did you know?
- Andrew Peters: Andrew Robbins told me.
- You ★: I didn't tell you because I wasn't sure I'd go through with it.
  - Andrew Peters: Why does it have to be you?
  - You ★: I'm running because somebody has to.
    - Andrew Peters: Somebody else can do it.
    - You ★: I want to do something for New Castle County.
      - Andrew Peters: Somebody else can do it.
      - You ★: I'm running because somebody has to.
        - Andrew Peters: Somebody else can do it.
        - You ★: I didn't tell you because I wasn't sure I'd go through with it.
          - Andrew Peters: Somebody else can do it.
          - *Ends resolved*
        - You: I'm sorry. I wanted to be sure first.
          - Andrew Peters: Okay. I'm with you, then.
          - *Ends resolved*
        - You: Will you help me?
          - Andrew Peters: Of course I'll help.
          - *Ends open: Andrew Peters: Talk to me tomorrow. Promise.*
      - You: I'm sorry. I wanted to be sure first.
        - Andrew Peters: Okay. I'm with you, then.
        - *Ends resolved*
      - You: Will you help me?
        - Andrew Peters: Of course I'll help.
        - *Ends open: Andrew Peters: Talk to me tomorrow. Promise.*
    - You: I'm sorry. I wanted to be sure first.
      - Andrew Peters: Okay. I'm with you, then.
      - *Ends resolved*
    - You: Will you help me?
      - Andrew Peters: Of course I'll help.
      - *Ends open: Andrew Peters: Talk to me tomorrow. Promise.*
  - You: I'm sorry. I wanted to be sure first.
    - Andrew Peters: Okay. I'm with you, then.
    - *Ends resolved*
  - You: Will you help me?
    - Andrew Peters: Of course I'll help.
    - *Ends open: Andrew Peters: We're not done talking about this.*
- You: Will you help me?
  - Andrew Peters: Of course I'll help.
  - *Ends open: Andrew Peters: Talk to me tomorrow. Promise.*
- You: I was going to tell you tonight.
  - Andrew Peters: Don't shut me out of this.
  - You: I'm running because somebody has to.
    - Andrew Peters: Somebody else can do it.
    - You: I want to do something for New Castle County.
      - Andrew Peters: Why does it have to be you?
      - You: I didn't tell you because I wasn't sure I'd go through with it.
        - Andrew Peters: Somebody else can do it.
        - You: I want to do something for New Castle County.
          - Andrew Peters: Then I'm with you.
          - *Ends resolved*
        - You: You're right. I should have told you first.
          - Andrew Peters: Okay. I'm with you, then.
          - *Ends resolved*
        - You: Will you help me?
          - Andrew Peters: I'll be there.
          - *Ends open: Andrew Peters: We're not done talking about this.*
      - You: You're right. I should have told you first.
        - Andrew Peters: Okay. I'm with you, then.
        - *Ends resolved*
      - You: Will you help me?
        - Andrew Peters: I'll be there.
        - *Ends open: Andrew Peters: We're not done talking about this.*
    - You: You're right. I should have told you first.
      - Andrew Peters: Okay. I'm with you, then.
      - *Ends resolved*
    - You: Will you help me?
      - Andrew Peters: I'll be there.
      - *Ends open: Andrew Peters: We're not done talking about this.*
  - You: I'm sorry. I wanted to be sure first.
    - Andrew Peters: Okay. I'm with you, then.
    - *Ends resolved*
  - You: I won't let it take over our lives.
    - Andrew Peters: Okay. Next time, tell me first.
    - *Ends resolved*
- You: We'll figure it out together. I promise.
  - Andrew Peters: Okay. Next time, tell me first.
  - *Ends resolved*
- You: I haven't decided anything yet.
  - *if Andrew Peters knows:*
    - Andrew Peters: Andrew Robbins saw your name on the list.
    - You: You're right. I'm sorry.
      - Andrew Peters: Okay. I'm with you, then.
      - *Ends open*
    - You: It's been a long day.
      - Andrew Peters: No. We talk about it now.
      - You: I'm running because somebody has to.
        - *Ends resolved*
      - You: I'm sorry. I wanted to be sure first.
        - *Ends resolved*
      - You: I won't let it take over our lives.
        - *Ends resolved*
    - You: I haven't decided anything yet.
      - *Ends open: Andrew Peters: Talk to me tomorrow. Promise.*
  - *if not:*
    - Andrew Peters: Okay. Next time, tell me first.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/anxious/17w2s [scene-talk.narrate-narrate.you-filed-today-to-run-for-office-name-has-been-waiting-for-you-at-hom]; L2 open/greet/scene-talk/hurt/4w2s [scene-talk.open-greet.so-you-did-it]; L3 state/ask/scene-talk/anxious/8w1s [scene-talk.state-ask.are-you-sure-about-running-for-office]; L4 auto/ask/scene-talk/nervous/4w1s [scene-talk.auto-ask.how-did-you-know]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/nervous/7w1s [scene-talk.reply-deflect.i-was-going-to-tell-you-tonight]; L9 reply/comfort/scene-talk/tender/7w2s [scene-talk.reply-comfort.we-ll-figure-it-out-together-i-promise]; L10 reply/lie/scene-talk/nervous/5w1s [scene-talk.reply-lie.i-haven-t-decided-anything-yet]; L11 follow/disagree/scene-talk/hurt/7w1s [scene-talk.follow-disagree.why-does-it-have-to-be-you]; L12 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L13 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L14 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L15 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.somebody-else-can-do-it]; L16 reply/tell/scene-talk/eager/9w1s [scene-talk.reply-tell.i-want-to-do-something-for-place]; L17 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L18 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L19 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.somebody-else-can-do-it]; L20 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L21 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L22 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L23 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.somebody-else-can-do-it]; L24 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L25 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L26 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L27 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.somebody-else-can-do-it]</sub>

**Profile cold** (outcome resolved)

**Andrew Peters:** So. You did it.

**Andrew Peters:** Are you sure about running for County assessor?

You could say:

1. How did you know?

**Andrew Peters:** Andrew Robbins told me.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it.  *(the page follows this one)*
2. Will you help me?
3. It's been a long day.
4. It'll be all right. We'll make it work.
5. I haven't decided anything yet.

**Andrew Peters:** Why does it have to be you?

You could say:

1. I'm running because somebody has to.  *(the page follows this one)*
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Somebody else can do it.

You could say:

1. I want to do something for New Castle County.  *(the page follows this one)*
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Somebody else can do it.

You could say:

1. I'm running because somebody has to.  *(the page follows this one)*
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Somebody else can do it.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it.  *(the page follows this one)*
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Somebody else can do it.

<sub>L1 narrate/narrate/scene-talk/anxious/17w2s [scene-talk.narrate-narrate.you-filed-today-to-run-for-office-name-has-been-waiting-for-you-at-hom]; L2 open/greet/scene-talk/hurt/4w2s [scene-talk.open-greet.so-you-did-it]; L3 state/ask/scene-talk/anxious/8w1s [scene-talk.state-ask.are-you-sure-about-running-for-office]; L4 auto/ask/scene-talk/nervous/4w1s [scene-talk.auto-ask.how-did-you-know]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L9 reply/comfort/scene-talk/tender/8w2s [scene-talk.reply-comfort.it-ll-be-all-right-we-ll-make-it-work]; L10 reply/lie/scene-talk/nervous/5w1s [scene-talk.reply-lie.i-haven-t-decided-anything-yet]; L11 follow/disagree/scene-talk/hurt/7w1s [scene-talk.follow-disagree.why-does-it-have-to-be-you]; L12 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L13 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L14 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L15 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.somebody-else-can-do-it]; L16 reply/tell/scene-talk/eager/9w1s [scene-talk.reply-tell.i-want-to-do-something-for-place]; L17 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L18 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L19 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.somebody-else-can-do-it]; L20 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L21 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L22 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L23 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.somebody-else-can-do-it]; L24 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L25 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L26 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L27 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.somebody-else-can-do-it]</sub>

**Profile anxious** (outcome resolved)

**Andrew Peters:** So. You did it.

**Andrew Peters:** Are you sure about running for County assessor?

You could say:

1. How did you know?

**Andrew Peters:** Andrew Robbins told me.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it.  *(the page follows this one)*
2. Will you help me?
3. I was going to tell you tonight.
4. We'll figure it out together. I promise.
5. I haven't decided anything yet.

**Andrew Peters:** Why this, and why now?

You could say:

1. I'm running because somebody has to.  *(the page follows this one)*
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Why this, and why now?

You could say:

1. I want to do something for New Castle County.  *(the page follows this one)*
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Why this, and why now?

You could say:

1. I'm running because somebody has to.  *(the page follows this one)*
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Why this, and why now?

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it.  *(the page follows this one)*
2. I'm sorry. I wanted to be sure first.
3. Will you help me?

**Andrew Peters:** Somebody else can do it.

<sub>L1 narrate/narrate/scene-talk/anxious/17w2s [scene-talk.narrate-narrate.you-filed-today-to-run-for-office-name-has-been-waiting-for-you-at-hom]; L2 open/greet/scene-talk/hurt/4w2s [scene-talk.open-greet.so-you-did-it]; L3 state/ask/scene-talk/anxious/8w1s [scene-talk.state-ask.are-you-sure-about-running-for-office]; L4 auto/ask/scene-talk/nervous/4w1s [scene-talk.auto-ask.how-did-you-know]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/nervous/7w1s [scene-talk.reply-deflect.i-was-going-to-tell-you-tonight]; L9 reply/comfort/scene-talk/tender/7w2s [scene-talk.reply-comfort.we-ll-figure-it-out-together-i-promise]; L10 reply/lie/scene-talk/nervous/5w1s [scene-talk.reply-lie.i-haven-t-decided-anything-yet]; L11 follow/ask/scene-talk/hurt/5w1s [scene-talk.follow-ask.why-this-and-why-now]; L12 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L13 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L14 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L15 follow/ask/scene-talk/hurt/5w1s [scene-talk.follow-ask.why-this-and-why-now]; L16 reply/tell/scene-talk/eager/9w1s [scene-talk.reply-tell.i-want-to-do-something-for-place]; L17 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L18 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L19 follow/ask/scene-talk/hurt/5w1s [scene-talk.follow-ask.why-this-and-why-now]; L20 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L21 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L22 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L23 follow/ask/scene-talk/hurt/5w1s [scene-talk.follow-ask.why-this-and-why-now]; L24 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L25 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-m-sorry-i-wanted-to-be-sure-first]; L26 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L27 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.somebody-else-can-do-it]</sub>

## Scene 24: family-filing (news-received, ends in political) — proof scene

*Purpose family-filing. Records: filing:contest:seat:gus2025:101811:board:0:2026-11-03:person_9e002a561a4b29bc, contest:seat:gus2025:101811:board:0:2026-11-03, person_9e002b561a4b2b6f, person_9e002a561a4b29bc.*

> Word that you filed for County Commissioner got home before you did. Simon Riggs is waiting.

**Profile warm** (outcome open)

**Simon Riggs:** There you are.

**Simon Riggs:** So you're really doing this?

You could say:

1. Who told you?

**Simon Riggs:** Zachary Shepard told me.

You could say:

1. I'm running because somebody has to.
2. Will you help me?  *(the page follows this one)*
3. I was going to tell you tonight.
4. We'll figure it out together. I promise.
5. I haven't decided anything yet.

**Simon Riggs:** I'll be there.

**Simon Riggs:** We're not done talking about this.

**The whole exchange** (27 nodes; endings: resolved, open, resolved, open, resolved, open, open, resolved, open, resolved, resolved, resolved, open, resolved, resolved, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- Kelly Riggs (without a choice): Who told you?
- Simon Riggs: Zachary Shepard told me.
- You: I'm running because somebody has to.
  - Simon Riggs: Why this, and why now?
  - You: I didn't tell you because I wasn't sure I'd go through with it.
    - Simon Riggs: Why this, and why now?
    - You: I want to do something for Brookside.
      - Simon Riggs: Then I'm with you.
      - You: I won't let it take over our lives.
        - Simon Riggs: Okay. Next time, tell me first.
        - *Ends resolved*
      - You: Will you help me?
        - Simon Riggs: I'll be there.
        - *Ends open: Simon Riggs: We're not done talking about this.*
    - You: I'm sorry. I wanted to be sure first.
      - Simon Riggs: Okay. I'm with you, then.
      - *Ends resolved*
    - You: Will you help me?
      - Simon Riggs: I'll be there.
      - *Ends open: Simon Riggs: Talk to me tomorrow. Promise.*
  - You: You're right. I should have told you first.
    - Simon Riggs: Okay. I'm with you, then.
    - *Ends resolved*
  - You: Will you help me?
    - Simon Riggs: I'll be there.
    - *Ends open: Simon Riggs: Talk to me tomorrow. Promise.*
- You ★: Will you help me?
  - Simon Riggs: I'll be there.
  - *Ends open: Simon Riggs: We're not done talking about this.*
- You: I was going to tell you tonight.
  - Simon Riggs: No. We talk about it now.
  - You: I didn't tell you because I wasn't sure I'd go through with it.
    - Simon Riggs: Then I'm with you.
    - You: I won't let it take over our lives.
      - Simon Riggs: Okay. Next time, tell me first.
      - *Ends resolved*
    - You: Will you help me?
      - Simon Riggs: Of course I'll help.
      - *Ends open: Simon Riggs: We're not done talking about this.*
  - You: You're right. I should have told you first.
    - Simon Riggs: Okay. I'm with you, then.
    - *Ends resolved*
  - You: I won't let it take over our lives.
    - Simon Riggs: Okay. Next time, tell me first.
    - *Ends resolved*
- You: We'll figure it out together. I promise.
  - Simon Riggs: Okay. Next time, tell me first.
  - *Ends resolved*
- You: I haven't decided anything yet.
  - *if Simon Riggs knows:*
    - Simon Riggs: Zachary Shepard saw your name on the list.
    - You: You're right. I'm sorry.
      - Simon Riggs: Okay. I'm with you, then.
      - *Ends open*
    - You: I was going to tell you tonight.
      - Simon Riggs: Don't shut me out of this.
      - You: I didn't tell you because I wasn't sure I'd go through with it.
        - *Ends resolved*
      - You: I'm sorry. I wanted to be sure first.
        - *Ends resolved*
      - You: I won't let it take over our lives.
        - *Ends resolved*
    - You: I haven't decided anything yet.
      - *Ends open: Simon Riggs: Talk to me tomorrow. Promise.*
  - *if not:*
    - Simon Riggs: Okay. Next time, tell me first.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/anxious/5w1s [scene-talk.state-ask.so-you-re-really-doing-this]; L4 auto/ask/scene-talk/nervous/3w1s [scene-talk.auto-ask.who-told-you]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/nervous/7w1s [scene-talk.reply-deflect.i-was-going-to-tell-you-tonight]; L9 reply/comfort/scene-talk/tender/7w2s [scene-talk.reply-comfort.we-ll-figure-it-out-together-i-promise]; L10 reply/lie/scene-talk/nervous/5w1s [scene-talk.reply-lie.i-haven-t-decided-anything-yet]; L31 follow/promise/scene-talk/tender/3w1s [scene-talk.follow-promise.i-ll-be-there]; L32 close/warn/scene-talk/hurt/6w1s [scene-talk.close-warn.we-re-not-done-talking-about-this]</sub>

**Profile cold** (outcome resolved)

**Simon Riggs:** There you are.

**Simon Riggs:** So you're really doing this?

You could say:

1. Who told you?

**Simon Riggs:** Zachary Shepard told me.

You could say:

1. I'm running because somebody has to.
2. Will you help me?  *(the page follows this one)*
3. It's been a long day.
4. It'll be all right. We'll make it work.
5. I haven't decided anything yet.

**Simon Riggs:** I can't promise that.

You could say:

1. Will you help me?
2. All right. I'll handle it myself.  *(the page follows this one)*

**Simon Riggs:** Okay. I'm with you, then.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/anxious/5w1s [scene-talk.state-ask.so-you-re-really-doing-this]; L4 auto/ask/scene-talk/nervous/3w1s [scene-talk.auto-ask.who-told-you]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L9 reply/comfort/scene-talk/tender/8w2s [scene-talk.reply-comfort.it-ll-be-all-right-we-ll-make-it-work]; L10 reply/lie/scene-talk/nervous/5w1s [scene-talk.reply-lie.i-haven-t-decided-anything-yet]; L64 follow/decline/scene-talk/guarded/4w1s [scene-talk.follow-decline.i-can-t-promise-that]; L65 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L66 reply/accept/scene-talk/guarded/6w2s [scene-talk.reply-accept.all-right-i-ll-handle-it-myself]; L81 follow/accept/scene-talk/tender/5w2s [scene-talk.follow-accept.okay-i-m-with-you-then]</sub>

**Profile stubborn** (outcome open)

**Simon Riggs:** There you are.

**Simon Riggs:** So you're really doing this?

You could say:

1. Who told you?

**Simon Riggs:** Zachary Shepard told me.

You could say:

1. I'm running because somebody has to.
2. Will you help me?  *(the page follows this one)*
3. I was going to tell you tonight.
4. We'll figure it out together. I promise.
5. I haven't decided anything yet.

**Simon Riggs:** I can't promise that.

You could say:

1. Will you help me?  *(the page follows this one)*
2. All right. I'll handle it myself.

**Simon Riggs:** I don't know if I can.

You could say:

1. Will you help me?  *(the page follows this one)*
2. All right. I'll handle it myself.

**Simon Riggs:** I don't know if I can.

You could say:

1. Will you help me?  *(the page follows this one)*
2. All right. I'll handle it myself.

**Simon Riggs:** I don't know if I can.

You could say:

1. Will you help me?  *(the page follows this one)*
2. All right. I'll handle it myself.

**Simon Riggs:** I can't promise that.

**Simon Riggs:** Talk to me tomorrow. Promise.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/anxious/5w1s [scene-talk.state-ask.so-you-re-really-doing-this]; L4 auto/ask/scene-talk/nervous/3w1s [scene-talk.auto-ask.who-told-you]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/nervous/7w1s [scene-talk.reply-deflect.i-was-going-to-tell-you-tonight]; L9 reply/comfort/scene-talk/tender/7w2s [scene-talk.reply-comfort.we-ll-figure-it-out-together-i-promise]; L10 reply/lie/scene-talk/nervous/5w1s [scene-talk.reply-lie.i-haven-t-decided-anything-yet]; L64 follow/decline/scene-talk/guarded/4w1s [scene-talk.follow-decline.i-can-t-promise-that]; L65 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L66 reply/accept/scene-talk/guarded/6w2s [scene-talk.reply-accept.all-right-i-ll-handle-it-myself]; L67 follow/decline/scene-talk/nervous/6w1s [scene-talk.follow-decline.i-don-t-know-if-i-can]; L68 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L69 reply/accept/scene-talk/guarded/6w2s [scene-talk.reply-accept.all-right-i-ll-handle-it-myself]; L70 follow/decline/scene-talk/nervous/6w1s [scene-talk.follow-decline.i-don-t-know-if-i-can]; L71 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L72 reply/accept/scene-talk/guarded/6w2s [scene-talk.reply-accept.all-right-i-ll-handle-it-myself]; L73 follow/decline/scene-talk/nervous/6w1s [scene-talk.follow-decline.i-don-t-know-if-i-can]; L74 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L75 reply/accept/scene-talk/guarded/6w2s [scene-talk.reply-accept.all-right-i-ll-handle-it-myself]; L76 follow/decline/scene-talk/guarded/4w1s [scene-talk.follow-decline.i-can-t-promise-that]; L77 close/press/scene-talk/hurt/5w2s [scene-talk.close-press.talk-to-me-tomorrow-promise]</sub>

**Profile anxious** (outcome resolved)

**Simon Riggs:** There you are.

**Simon Riggs:** So you're really doing this?

You could say:

1. Who told you?

**Simon Riggs:** Zachary Shepard told me.

You could say:

1. I'm running because somebody has to.
2. Will you help me?  *(the page follows this one)*
3. It's been a long day.
4. We'll figure it out together. I promise.
5. I haven't decided anything yet.

**Simon Riggs:** I don't know if I can.

You could say:

1. Will you help me?
2. All right. I'll handle it myself.  *(the page follows this one)*

**Simon Riggs:** Okay. I'm with you, then.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/anxious/5w1s [scene-talk.state-ask.so-you-re-really-doing-this]; L4 auto/ask/scene-talk/nervous/3w1s [scene-talk.auto-ask.who-told-you]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L9 reply/comfort/scene-talk/tender/7w2s [scene-talk.reply-comfort.we-ll-figure-it-out-together-i-promise]; L10 reply/lie/scene-talk/nervous/5w1s [scene-talk.reply-lie.i-haven-t-decided-anything-yet]; L64 follow/decline/scene-talk/nervous/6w1s [scene-talk.follow-decline.i-don-t-know-if-i-can]; L65 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L66 reply/accept/scene-talk/guarded/6w2s [scene-talk.reply-accept.all-right-i-ll-handle-it-myself]; L81 follow/accept/scene-talk/tender/5w2s [scene-talk.follow-accept.okay-i-m-with-you-then]</sub>

**Profile boastful** (outcome open)

**Simon Riggs:** There you are.

**Simon Riggs:** So you're really doing this?

You could say:

1. How did you know?

**Simon Riggs:** Zachary Shepard told me.

You could say:

1. I'm running because somebody has to.
2. Will you help me?  *(the page follows this one)*
3. It's been a long day.
4. We'll figure it out together. I promise.
5. I haven't decided anything yet.

**Simon Riggs:** I can't promise that.

You could say:

1. Will you help me?  *(the page follows this one)*
2. All right. I'll handle it myself.

**Simon Riggs:** I don't know if I can.

You could say:

1. Will you help me?  *(the page follows this one)*
2. All right. I'll handle it myself.

**Simon Riggs:** I don't know if I can.

You could say:

1. Will you help me?  *(the page follows this one)*
2. All right. I'll handle it myself.

**Simon Riggs:** I don't know if I can.

You could say:

1. Will you help me?  *(the page follows this one)*
2. All right. I'll handle it myself.

**Simon Riggs:** I can't promise that.

**Simon Riggs:** Talk to me tomorrow. Promise.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/anxious/5w1s [scene-talk.state-ask.so-you-re-really-doing-this]; L4 auto/ask/scene-talk/nervous/4w1s [scene-talk.auto-ask.how-did-you-know]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/proud/6w1s [scene-talk.reply-tell.i-m-running-because-somebody-has-to]; L7 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L8 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-been-a-long-day]; L9 reply/comfort/scene-talk/tender/7w2s [scene-talk.reply-comfort.we-ll-figure-it-out-together-i-promise]; L10 reply/lie/scene-talk/nervous/5w1s [scene-talk.reply-lie.i-haven-t-decided-anything-yet]; L64 follow/decline/scene-talk/guarded/4w1s [scene-talk.follow-decline.i-can-t-promise-that]; L65 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L66 reply/accept/scene-talk/guarded/6w2s [scene-talk.reply-accept.all-right-i-ll-handle-it-myself]; L67 follow/decline/scene-talk/nervous/6w1s [scene-talk.follow-decline.i-don-t-know-if-i-can]; L68 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L69 reply/accept/scene-talk/guarded/6w2s [scene-talk.reply-accept.all-right-i-ll-handle-it-myself]; L70 follow/decline/scene-talk/nervous/6w1s [scene-talk.follow-decline.i-don-t-know-if-i-can]; L71 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L72 reply/accept/scene-talk/guarded/6w2s [scene-talk.reply-accept.all-right-i-ll-handle-it-myself]; L73 follow/decline/scene-talk/nervous/6w1s [scene-talk.follow-decline.i-don-t-know-if-i-can]; L74 reply/request/scene-talk/hopeful/4w1s [scene-talk.reply-request.will-you-help-me]; L75 reply/accept/scene-talk/guarded/6w2s [scene-talk.reply-accept.all-right-i-ll-handle-it-myself]; L76 follow/decline/scene-talk/guarded/4w1s [scene-talk.follow-decline.i-can-t-promise-that]; L77 close/press/scene-talk/hurt/5w2s [scene-talk.close-press.talk-to-me-tomorrow-promise]</sub>

## Scene 25: family-win (honor, ends in political) — proof scene

*Purpose family-win. Records: result:contest:seat:gus2025:101811:board:0:2026-11-03, contest:seat:gus2025:101811:board:0:2026-11-03, person_9e002a561a4b29bc.*

> You won. Simon Riggs is waiting at the door when you get home.

**Profile warm** (outcome resolved)

**Simon Riggs:** Come here.

**Simon Riggs:** Congratulations. You earned it.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.
3. Not bad for a first run, right?
4. It hasn't sunk in yet.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. I'm going to make this count.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Simon Riggs:** You earned this.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You ★: I couldn't have done it without you.
  - Simon Riggs: You earned this.
  - You ★: I couldn't have done it without you.
    - Simon Riggs: You earned this.
    - You ★: I couldn't have done it without you.
      - Simon Riggs: You earned this.
      - You ★: I couldn't have done it without you.
        - Simon Riggs: You earned this.
        - You ★: I couldn't have done it without you.
          - Simon Riggs: You earned this.
          - *Ends resolved*
        - You: Things will settle down now. I promise.
          - Simon Riggs: Just don't forget about us.
          - *Ends resolved*
      - You: I'm going to make this count.
        - Simon Riggs: Go get some sleep. Big day tomorrow.
        - *Ends resolved*
    - You: Things will settle down now. I promise.
      - Simon Riggs: Go get some sleep. Big day tomorrow.
      - *Ends resolved*
  - You: Things will settle down now. I promise.
    - Simon Riggs: Just don't forget about us.
    - You: I'm going to make this count.
      - Simon Riggs: Go get some sleep. Big day tomorrow.
      - *Ends resolved*
    - You: I couldn't have done it without you.
      - Simon Riggs: You earned this.
      - You: I couldn't have done it without you.
        - Simon Riggs: You earned this.
        - You: I couldn't have done it without you.
          - Simon Riggs: You earned this.
          - *Ends resolved*
        - You: I'm going to make this count.
          - Simon Riggs: Just don't forget about us.
          - *Ends resolved*
      - You: I'm going to make this count.
        - Simon Riggs: Go get some sleep. Big day tomorrow.
        - *Ends resolved*
- You: Things will settle down now. I promise.
  - Simon Riggs: Go get some sleep. Big day tomorrow.
  - *Ends resolved*
- You: Not bad for a first run, right?
  - Simon Riggs: Okay, okay. You won. Come inside.
  - You: Okay, okay. I'll stay humble.
    - Simon Riggs: Go get some sleep. Big day tomorrow.
    - *Ends resolved*
  - You: I told you I'd win.
    - Simon Riggs: Don't let it go to your head.
    - You: Okay, okay. I'll stay humble.
      - Simon Riggs: Go get some sleep. Big day tomorrow.
      - *Ends resolved*
    - You: I told you I'd win.
      - Simon Riggs: Okay, okay. You won. Come inside.
      - You: Okay, okay. I'll stay humble.
        - Simon Riggs: Go get some sleep. Big day tomorrow.
        - *Ends resolved*
      - You: Not bad for a first run, right?
        - Simon Riggs: Okay, okay. You won. Come inside.
        - You: Okay, okay. I'll stay humble.
          - Simon Riggs: Go get some sleep. Big day tomorrow.
          - *Ends resolved*
        - You: I told you I'd win.
          - Simon Riggs: Don't let it go to your head.
          - *Ends open: Simon Riggs: Your phone is going to ring all night.*
        - You: I couldn't have done it without you.
          - Simon Riggs: You earned this.
          - *Ends resolved*
      - You: I couldn't have done it without you.
        - Simon Riggs: You earned this.
        - You: I couldn't have done it without you.
          - Simon Riggs: You earned this.
          - *Ends resolved*
        - You: Things will settle down now. I promise.
          - Simon Riggs: Just don't forget about us.
          - *Ends resolved*
    - You: I couldn't have done it without you.
      - Simon Riggs: You earned this.
      - You: I couldn't have done it without you.
        - Simon Riggs: You earned this.
        - You: I couldn't have done it without you.
          - Simon Riggs: You earned this.
          - *Ends resolved*
        - You: Things will settle down now. I promise.
          - Simon Riggs: Just don't forget about us.
          - *Ends resolved*
      - You: I'm going to make this count.
        - Simon Riggs: Go get some sleep. Big day tomorrow.
        - *Ends resolved*
  - You: I couldn't have done it without you.
    - Simon Riggs: You earned this.
    - You: I couldn't have done it without you.
      - Simon Riggs: You earned this.
      - You: I couldn't have done it without you.
        - Simon Riggs: You earned this.
        - You: I couldn't have done it without you.
          - Simon Riggs: You earned this.
          - *Ends resolved*
        - You: I'm going to make this count.
          - Simon Riggs: Go get some sleep. Big day tomorrow.
          - *Ends resolved*
      - You: Things will settle down now. I promise.
        - Simon Riggs: Just don't forget about us.
        - You: I'm going to make this count.
          - Simon Riggs: Go get some sleep. Big day tomorrow.
          - *Ends resolved*
        - You: I couldn't have done it without you.
          - Simon Riggs: You earned this.
          - *Ends resolved*
    - You: I'm going to make this count.
      - Simon Riggs: Just don't forget about us.
      - You: Things will settle down now. I promise.
        - Simon Riggs: Just don't forget about us.
        - You: Things will settle down now. I promise.
          - Simon Riggs: Go get some sleep. Big day tomorrow.
          - *Ends resolved*
        - You: I couldn't have done it without you.
          - (the tree is cut here)
      - You: I couldn't have done it without you.
        - Simon Riggs: You earned this.
        - You: I couldn't have done it without you.
          - (the tree is cut here)
        - You: Things will settle down now. I promise.
          - (the tree is cut here)
- You: It hasn't sunk in yet.
  - Simon Riggs: So what happens now?
  - You: I still can't believe it.
    - Simon Riggs: So what happens now?
    - You: I still can't believe it.
      - Simon Riggs: So what happens now?
      - You: I still can't believe it.
        - Simon Riggs: So what happens now?
        - You: I still can't believe it.
          - (the tree is cut here)
        - You: Things will settle down now. I promise.
          - (the tree is cut here)
      - You: Things will settle down now. I promise.
        - Simon Riggs: Go get some sleep. Big day tomorrow.
        - *Ends resolved*
    - You: I'm going to make this count.
      - Simon Riggs: Just don't forget about us.
      - You: Things will settle down now. I promise.
        - Simon Riggs: Go get some sleep. Big day tomorrow.
        - *Ends resolved*
      - You: I couldn't have done it without you.
        - Simon Riggs: You earned this.
        - You: I couldn't have done it without you.
          - (the tree is cut here)
        - You: Things will settle down now. I promise.
          - (the tree is cut here)
  - You: Things will settle down now. I promise.
    - Simon Riggs: Just don't forget about us.
    - You: I'm going to make this count.
      - Simon Riggs: Go get some sleep. Big day tomorrow.
      - *Ends resolved*
    - You: I couldn't have done it without you.
      - Simon Riggs: You earned this.
      - You: I couldn't have done it without you.
        - Simon Riggs: You earned this.
        - You: I couldn't have done it without you.
          - (the tree is cut here)
        - You: I'm going to make this count.
          - (the tree is cut here)
      - You: I'm going to make this count.
        - Simon Riggs: Just don't forget about us.
        - You: Things will settle down now. I promise.
          - (the tree is cut here)
        - You: I couldn't have done it without you.
          - (the tree is cut here)

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/4w2s [scene-talk.state-congratulate.congratulations-you-earned-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L8 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L9 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L10 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L11 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L12 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L13 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L14 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L15 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L16 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L17 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L18 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L19 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L20 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

**Profile cold** (outcome resolved)

**Simon Riggs:** Look who it is!

**Simon Riggs:** Congratulations. You earned it.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. I'm going to make this count.
3. Not bad for a first run, right?
4. It hasn't sunk in yet.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. I'm going to make this count.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. I'm going to make this count.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. I'm going to make this count.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. I'm going to make this count.

**Simon Riggs:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-it-is]; L3 state/congratulate/scene-talk/glad/4w2s [scene-talk.state-congratulate.congratulations-you-earned-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L8 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L9 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L10 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L11 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L12 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L13 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L14 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L15 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L16 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L17 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L18 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L19 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L20 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

**Profile stubborn** (outcome resolved)

**Simon Riggs:** Come here.

**Simon Riggs:** County Commissioner. You really did it.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. I'm going to make this count.
3. Not bad for a first run, right?
4. It hasn't sunk in yet.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. I'm going to make this count.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. I'm going to make this count.

**Simon Riggs:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L8 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L9 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L10 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L11 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L12 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L13 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L14 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L15 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L16 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L17 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L18 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L19 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L20 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

**Profile anxious** (outcome resolved)

**Simon Riggs:** Come here.

**Simon Riggs:** County Commissioner. You really did it.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.
3. Not bad for a first run, right?
4. I still can't believe it.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. I'm going to make this count.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Simon Riggs:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/glad/5w1s [scene-talk.reply-tell.i-still-can-t-believe-it]; L8 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L9 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L10 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L11 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L12 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L13 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L14 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L15 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L16 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L17 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L18 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L19 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L20 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

**Profile boastful** (outcome resolved)

**Simon Riggs:** Come here.

**Simon Riggs:** Congratulations. You earned it.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. I'm going to make this count.
3. Not bad for a first run, right?
4. I still can't believe it.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. I'm going to make this count.

**Simon Riggs:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. I'm going to make this count.

**Simon Riggs:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/4w2s [scene-talk.state-congratulate.congratulations-you-earned-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/glad/5w1s [scene-talk.reply-tell.i-still-can-t-believe-it]; L8 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L9 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L10 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L11 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L12 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L13 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L14 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L15 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L16 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L17 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L18 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L19 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L20 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

## Scene 26: family-win (honor, ends in political) — proof scene

*Purpose family-win. Records: result:contest:seat:gus2025:101811:sheriff:0:2026-11-03, contest:seat:gus2025:101811:sheriff:0:2026-11-03, person_f9be8ef45e5d143f.*

> The results are in: you won the race for County Sheriff. Erin McCarthy is the first to reach you.

**Profile warm** (outcome resolved)

**Erin McCarthy:** Look who it is!

**Erin McCarthy:** You did it!

You could say:

1. I couldn't have done it without you.
2. I'm going to make this count.
3. I told you I'd win.
4. I still can't believe it.  *(the page follows this one)*

**Erin McCarthy:** You earned this.

You could say:

1. I couldn't have done it without you.
2. Things will settle down now. I promise.  *(the page follows this one)*

**Erin McCarthy:** Go get some sleep. Big day tomorrow.

**The whole exchange** (45 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You: I couldn't have done it without you.
  - Erin McCarthy: You earned this.
  - You: I couldn't have done it without you.
    - Erin McCarthy: You earned this.
    - You: I couldn't have done it without you.
      - Erin McCarthy: You earned this.
      - You: I couldn't have done it without you.
        - Erin McCarthy: You earned this.
        - You: I couldn't have done it without you.
          - Erin McCarthy: You earned this.
          - *Ends resolved*
        - You: Things will settle down now. I promise.
          - Erin McCarthy: Go get some sleep. Big day tomorrow.
          - *Ends resolved*
      - You: Things will settle down now. I promise.
        - Erin McCarthy: Go get some sleep. Big day tomorrow.
        - *Ends resolved*
    - You: Things will settle down now. I promise.
      - Erin McCarthy: Go get some sleep. Big day tomorrow.
      - *Ends resolved*
  - You: Things will settle down now. I promise.
    - Erin McCarthy: Go get some sleep. Big day tomorrow.
    - *Ends resolved*
- You: I'm going to make this count.
  - Erin McCarthy: Go get some sleep. Big day tomorrow.
  - *Ends resolved*
- You: I told you I'd win.
  - Erin McCarthy: Okay, okay. You won. Come inside.
  - You: Okay, okay. I'll stay humble.
    - Erin McCarthy: Go get some sleep. Big day tomorrow.
    - *Ends resolved*
  - You: Not bad for a first run, right?
    - Erin McCarthy: Don't let it go to your head.
    - You: Okay, okay. I'll stay humble.
      - Erin McCarthy: Go get some sleep. Big day tomorrow.
      - *Ends resolved*
    - You: Not bad for a first run, right?
      - Erin McCarthy: Okay, okay. You won. Come inside.
      - You: Okay, okay. I'll stay humble.
        - Erin McCarthy: Go get some sleep. Big day tomorrow.
        - *Ends resolved*
      - You: Not bad for a first run, right?
        - Erin McCarthy: Okay, okay. You won. Come inside.
        - You: Okay, okay. I'll stay humble.
          - Erin McCarthy: Go get some sleep. Big day tomorrow.
          - *Ends resolved*
        - You: Not bad for a first run, right?
          - Erin McCarthy: Okay, okay. You won. Come inside.
          - *Ends open: Erin McCarthy: Your phone is going to ring all night.*
        - You: I couldn't have done it without you.
          - Erin McCarthy: You earned this.
          - *Ends resolved*
      - You: I couldn't have done it without you.
        - Erin McCarthy: You earned this.
        - You: I couldn't have done it without you.
          - Erin McCarthy: You earned this.
          - *Ends resolved*
        - You: Things will settle down now. I promise.
          - Erin McCarthy: Go get some sleep. Big day tomorrow.
          - *Ends resolved*
    - You: I couldn't have done it without you.
      - Erin McCarthy: You earned this.
      - You: I couldn't have done it without you.
        - Erin McCarthy: You earned this.
        - You: I couldn't have done it without you.
          - Erin McCarthy: You earned this.
          - *Ends resolved*
        - You: Things will settle down now. I promise.
          - Erin McCarthy: Go get some sleep. Big day tomorrow.
          - *Ends resolved*
      - You: I'm going to make this count.
        - Erin McCarthy: Go get some sleep. Big day tomorrow.
        - *Ends resolved*
  - You: I couldn't have done it without you.
    - Erin McCarthy: You earned this.
    - You: I couldn't have done it without you.
      - Erin McCarthy: You earned this.
      - You: I couldn't have done it without you.
        - Erin McCarthy: You earned this.
        - You: I couldn't have done it without you.
          - Erin McCarthy: You earned this.
          - *Ends resolved*
        - You: Things will settle down now. I promise.
          - Erin McCarthy: Go get some sleep. Big day tomorrow.
          - *Ends resolved*
      - You: I'm going to make this count.
        - Erin McCarthy: Go get some sleep. Big day tomorrow.
        - *Ends resolved*
    - You: I'm going to make this count.
      - Erin McCarthy: Go get some sleep. Big day tomorrow.
      - *Ends resolved*
- You ★: I still can't believe it.
  - Erin McCarthy: You earned this.
  - You: I couldn't have done it without you.
    - Erin McCarthy: You earned this.
    - You: I couldn't have done it without you.
      - Erin McCarthy: You earned this.
      - You: I couldn't have done it without you.
        - Erin McCarthy: You earned this.
        - You: I couldn't have done it without you.
          - Erin McCarthy: You earned this.
          - *Ends resolved*
        - You: Things will settle down now. I promise.
          - Erin McCarthy: Go get some sleep. Big day tomorrow.
          - *Ends resolved*
      - You: Things will settle down now. I promise.
        - Erin McCarthy: Go get some sleep. Big day tomorrow.
        - *Ends resolved*
    - You: I'm going to make this count.
      - Erin McCarthy: Go get some sleep. Big day tomorrow.
      - *Ends resolved*
  - You ★: Things will settle down now. I promise.
    - Erin McCarthy: Go get some sleep. Big day tomorrow.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/glad/19w2s [scene-talk.narrate-narrate.the-results-are-in-you-won-the-race-for-office-name-is-the-first-to-re]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-it-is]; L3 state/congratulate/scene-talk/glad/3w1s [scene-talk.state-congratulate.you-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/5w1s [scene-talk.reply-boast.i-told-you-i-d-win]; L7 reply/tell/scene-talk/glad/5w1s [scene-talk.reply-tell.i-still-can-t-believe-it]; L76 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L77 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L78 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L92 follow/thank/scene-talk/glad/7w2s [scene-talk.follow-thank.go-get-some-sleep-big-day-tomorrow]</sub>

**Profile cold** (outcome open)

**Erin McCarthy:** Look who it is!

**Erin McCarthy:** County Sheriff. You really did it.

You could say:

1. I couldn't have done it without you.
2. Things will settle down now. I promise.
3. I told you I'd win.  *(the page follows this one)*
4. It hasn't sunk in yet.

**Erin McCarthy:** Okay, okay. You won. Come inside.

You could say:

1. Okay, okay. I'll stay humble.
2. Not bad for a first run, right?  *(the page follows this one)*
3. I couldn't have done it without you.

**Erin McCarthy:** Don't let it go to your head.

You could say:

1. Okay, okay. I'll stay humble.
2. Not bad for a first run, right?  *(the page follows this one)*
3. I couldn't have done it without you.

**Erin McCarthy:** Don't let it go to your head.

You could say:

1. Okay, okay. I'll stay humble.
2. Not bad for a first run, right?  *(the page follows this one)*
3. I couldn't have done it without you.

**Erin McCarthy:** Don't let it go to your head.

You could say:

1. Okay, okay. I'll stay humble.
2. Not bad for a first run, right?  *(the page follows this one)*
3. I couldn't have done it without you.

**Erin McCarthy:** Okay, okay. You won. Come inside.

**Erin McCarthy:** Your phone is going to ring all night.

<sub>L1 narrate/narrate/scene-talk/glad/19w2s [scene-talk.narrate-narrate.the-results-are-in-you-won-the-race-for-office-name-is-the-first-to-re]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-it-is]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/5w1s [scene-talk.reply-boast.i-told-you-i-d-win]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L26 follow/confront/scene-talk/glad/6w3s [scene-talk.follow-confront.okay-okay-you-won-come-inside]; L27 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L28 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L29 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L31 follow/confront/scene-talk/glad/7w1s [scene-talk.follow-confront.don-t-let-it-go-to-your-head]; L32 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L33 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L34 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L36 follow/confront/scene-talk/glad/7w1s [scene-talk.follow-confront.don-t-let-it-go-to-your-head]; L37 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L38 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L39 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L41 follow/confront/scene-talk/glad/7w1s [scene-talk.follow-confront.don-t-let-it-go-to-your-head]; L42 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L43 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L44 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L46 follow/confront/scene-talk/glad/6w3s [scene-talk.follow-confront.okay-okay-you-won-come-inside]; L47 close/press/scene-talk/glad/8w1s [scene-talk.close-press.your-phone-is-going-to-ring-all-night]</sub>

**Profile stubborn** (outcome open)

**Erin McCarthy:** Look who it is!

**Erin McCarthy:** You did it!

You could say:

1. I couldn't have done it without you.
2. Things will settle down now. I promise.
3. I told you I'd win.  *(the page follows this one)*
4. It hasn't sunk in yet.

**Erin McCarthy:** Okay, okay. You won. Come inside.

You could say:

1. Okay, okay. I'll stay humble.
2. Not bad for a first run, right?  *(the page follows this one)*
3. I couldn't have done it without you.

**Erin McCarthy:** Don't let it go to your head.

You could say:

1. Okay, okay. I'll stay humble.
2. Not bad for a first run, right?  *(the page follows this one)*
3. I couldn't have done it without you.

**Erin McCarthy:** Okay, okay. You won. Come inside.

You could say:

1. Okay, okay. I'll stay humble.
2. Not bad for a first run, right?  *(the page follows this one)*
3. I couldn't have done it without you.

**Erin McCarthy:** Okay, okay. You won. Come inside.

You could say:

1. Okay, okay. I'll stay humble.
2. Not bad for a first run, right?  *(the page follows this one)*
3. I couldn't have done it without you.

**Erin McCarthy:** Don't let it go to your head.

**Erin McCarthy:** Your phone is going to ring all night.

<sub>L1 narrate/narrate/scene-talk/glad/19w2s [scene-talk.narrate-narrate.the-results-are-in-you-won-the-race-for-office-name-is-the-first-to-re]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-it-is]; L3 state/congratulate/scene-talk/glad/3w1s [scene-talk.state-congratulate.you-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/5w1s [scene-talk.reply-boast.i-told-you-i-d-win]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L26 follow/confront/scene-talk/glad/6w3s [scene-talk.follow-confront.okay-okay-you-won-come-inside]; L27 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L28 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L29 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L31 follow/confront/scene-talk/glad/7w1s [scene-talk.follow-confront.don-t-let-it-go-to-your-head]; L32 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L33 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L34 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L36 follow/confront/scene-talk/glad/6w3s [scene-talk.follow-confront.okay-okay-you-won-come-inside]; L37 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L38 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L39 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L41 follow/confront/scene-talk/glad/6w3s [scene-talk.follow-confront.okay-okay-you-won-come-inside]; L42 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L43 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L44 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L46 follow/confront/scene-talk/glad/7w1s [scene-talk.follow-confront.don-t-let-it-go-to-your-head]; L47 close/press/scene-talk/glad/8w1s [scene-talk.close-press.your-phone-is-going-to-ring-all-night]</sub>

**Profile boastful** (outcome open)

**Erin McCarthy:** Look who it is!

**Erin McCarthy:** You did it!

You could say:

1. I couldn't have done it without you.
2. Things will settle down now. I promise.
3. I told you I'd win.  *(the page follows this one)*
4. It hasn't sunk in yet.

**Erin McCarthy:** Okay, okay. You won. Come inside.

You could say:

1. Okay, okay. I'll stay humble.
2. Not bad for a first run, right?  *(the page follows this one)*
3. I couldn't have done it without you.

**Erin McCarthy:** Don't let it go to your head.

You could say:

1. Okay, okay. I'll stay humble.
2. Not bad for a first run, right?  *(the page follows this one)*
3. I couldn't have done it without you.

**Erin McCarthy:** Don't let it go to your head.

You could say:

1. Okay, okay. I'll stay humble.
2. Not bad for a first run, right?  *(the page follows this one)*
3. I couldn't have done it without you.

**Erin McCarthy:** Okay, okay. You won. Come inside.

You could say:

1. Okay, okay. I'll stay humble.
2. Not bad for a first run, right?  *(the page follows this one)*
3. I couldn't have done it without you.

**Erin McCarthy:** Okay, okay. You won. Come inside.

**Erin McCarthy:** Your phone is going to ring all night.

<sub>L1 narrate/narrate/scene-talk/glad/19w2s [scene-talk.narrate-narrate.the-results-are-in-you-won-the-race-for-office-name-is-the-first-to-re]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-it-is]; L3 state/congratulate/scene-talk/glad/3w1s [scene-talk.state-congratulate.you-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/5w1s [scene-talk.reply-boast.i-told-you-i-d-win]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L26 follow/confront/scene-talk/glad/6w3s [scene-talk.follow-confront.okay-okay-you-won-come-inside]; L27 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L28 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L29 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L31 follow/confront/scene-talk/glad/7w1s [scene-talk.follow-confront.don-t-let-it-go-to-your-head]; L32 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L33 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L34 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L36 follow/confront/scene-talk/glad/7w1s [scene-talk.follow-confront.don-t-let-it-go-to-your-head]; L37 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L38 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L39 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L41 follow/confront/scene-talk/glad/6w3s [scene-talk.follow-confront.okay-okay-you-won-come-inside]; L42 reply/apologize/scene-talk/glad/5w2s [scene-talk.reply-apologize.okay-okay-i-ll-stay-humble]; L43 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L44 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L46 follow/confront/scene-talk/glad/6w3s [scene-talk.follow-confront.okay-okay-you-won-come-inside]; L47 close/press/scene-talk/glad/8w1s [scene-talk.close-press.your-phone-is-going-to-ring-all-night]</sub>

## Scene 27: family-win (honor, ends in political) — proof scene

*Purpose family-win. Records: result:contest:seat:gus2025:101811:assessor:0:2026-11-03, contest:seat:gus2025:101811:assessor:0:2026-11-03, person_8875c9c2afd1ae76.*

> You won. Andrew Peters is waiting at the door when you get home.

**Profile warm** (outcome resolved)

**Andrew Peters:** Look who it is!

**Andrew Peters:** County assessor. You really did it.

You could say:

1. I couldn't have done it without you.
2. Things will settle down now. I promise.
3. Not bad for a first run, right?
4. I still can't believe it.  *(the page follows this one)*

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. I'm going to make this count.

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Andrew Peters:** You earned this.

**The whole exchange** (45 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You: I couldn't have done it without you.
  - Andrew Peters: You earned this.
  - You: I couldn't have done it without you.
    - Andrew Peters: You earned this.
    - You: I couldn't have done it without you.
      - Andrew Peters: You earned this.
      - You: I couldn't have done it without you.
        - Andrew Peters: You earned this.
        - You: I couldn't have done it without you.
          - Andrew Peters: You earned this.
          - *Ends resolved*
        - You: I'm going to make this count.
          - Andrew Peters: Go get some sleep. Big day tomorrow.
          - *Ends resolved*
      - You: I'm going to make this count.
        - Andrew Peters: Go get some sleep. Big day tomorrow.
        - *Ends resolved*
    - You: Things will settle down now. I promise.
      - Andrew Peters: Go get some sleep. Big day tomorrow.
      - *Ends resolved*
  - You: Things will settle down now. I promise.
    - Andrew Peters: Go get some sleep. Big day tomorrow.
    - *Ends resolved*
- You: Things will settle down now. I promise.
  - Andrew Peters: Go get some sleep. Big day tomorrow.
  - *Ends resolved*
- You: Not bad for a first run, right?
  - Andrew Peters: Don't let it go to your head.
  - You: Okay, okay. I'll stay humble.
    - Andrew Peters: Go get some sleep. Big day tomorrow.
    - *Ends resolved*
  - You: I told you I'd win.
    - Andrew Peters: Okay, okay. You won. Come inside.
    - You: Okay, okay. I'll stay humble.
      - Andrew Peters: Go get some sleep. Big day tomorrow.
      - *Ends resolved*
    - You: Not bad for a first run, right?
      - Andrew Peters: Don't let it go to your head.
      - You: Okay, okay. I'll stay humble.
        - Andrew Peters: Go get some sleep. Big day tomorrow.
        - *Ends resolved*
      - You: I told you I'd win.
        - Andrew Peters: Okay, okay. You won. Come inside.
        - You: Okay, okay. I'll stay humble.
          - Andrew Peters: Go get some sleep. Big day tomorrow.
          - *Ends resolved*
        - You: Not bad for a first run, right?
          - Andrew Peters: Don't let it go to your head.
          - *Ends open: Andrew Peters: Your phone is going to ring all night.*
        - You: I couldn't have done it without you.
          - Andrew Peters: You earned this.
          - *Ends resolved*
      - You: I couldn't have done it without you.
        - Andrew Peters: You earned this.
        - You: I couldn't have done it without you.
          - Andrew Peters: You earned this.
          - *Ends resolved*
        - You: Things will settle down now. I promise.
          - Andrew Peters: Go get some sleep. Big day tomorrow.
          - *Ends resolved*
    - You: I couldn't have done it without you.
      - Andrew Peters: You earned this.
      - You: I couldn't have done it without you.
        - Andrew Peters: You earned this.
        - You: I couldn't have done it without you.
          - Andrew Peters: You earned this.
          - *Ends resolved*
        - You: I'm going to make this count.
          - Andrew Peters: Go get some sleep. Big day tomorrow.
          - *Ends resolved*
      - You: Things will settle down now. I promise.
        - Andrew Peters: Go get some sleep. Big day tomorrow.
        - *Ends resolved*
  - You: I couldn't have done it without you.
    - Andrew Peters: You earned this.
    - You: I couldn't have done it without you.
      - Andrew Peters: You earned this.
      - You: I couldn't have done it without you.
        - Andrew Peters: You earned this.
        - You: I couldn't have done it without you.
          - Andrew Peters: You earned this.
          - *Ends resolved*
        - You: Things will settle down now. I promise.
          - Andrew Peters: Go get some sleep. Big day tomorrow.
          - *Ends resolved*
      - You: Things will settle down now. I promise.
        - Andrew Peters: Go get some sleep. Big day tomorrow.
        - *Ends resolved*
    - You: Things will settle down now. I promise.
      - Andrew Peters: Go get some sleep. Big day tomorrow.
      - *Ends resolved*
- You ★: I still can't believe it.
  - Andrew Peters: You earned this.
  - You ★: I couldn't have done it without you.
    - Andrew Peters: You earned this.
    - You ★: I couldn't have done it without you.
      - Andrew Peters: You earned this.
      - You ★: I couldn't have done it without you.
        - Andrew Peters: You earned this.
        - You ★: I couldn't have done it without you.
          - Andrew Peters: You earned this.
          - *Ends resolved*
        - You: Things will settle down now. I promise.
          - Andrew Peters: Go get some sleep. Big day tomorrow.
          - *Ends resolved*
      - You: I'm going to make this count.
        - Andrew Peters: Go get some sleep. Big day tomorrow.
        - *Ends resolved*
    - You: Things will settle down now. I promise.
      - Andrew Peters: Go get some sleep. Big day tomorrow.
      - *Ends resolved*
  - You: Things will settle down now. I promise.
    - Andrew Peters: Go get some sleep. Big day tomorrow.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-it-is]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/glad/5w1s [scene-talk.reply-tell.i-still-can-t-believe-it]; L76 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L77 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L78 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L79 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L80 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L81 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L82 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L83 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L84 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L85 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L86 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L87 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L88 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

**Profile cold** (outcome resolved)

**Andrew Peters:** Look who it is!

**Andrew Peters:** County assessor. You really did it.

You could say:

1. I couldn't have done it without you.
2. I'm going to make this count.
3. Not bad for a first run, right?
4. I still can't believe it.  *(the page follows this one)*

**Andrew Peters:** So what happens now?

You could say:

1. It hasn't sunk in yet.  *(the page follows this one)*
2. I'm going to make this count.

**Andrew Peters:** So what happens now?

You could say:

1. It hasn't sunk in yet.  *(the page follows this one)*
2. I'm going to make this count.

**Andrew Peters:** So what happens now?

You could say:

1. It hasn't sunk in yet.  *(the page follows this one)*
2. I'm going to make this count.

**Andrew Peters:** So what happens now?

You could say:

1. It hasn't sunk in yet.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Andrew Peters:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-it-is]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/glad/5w1s [scene-talk.reply-tell.i-still-can-t-believe-it]; L76 follow/ask/scene-talk/curious/4w1s [scene-talk.follow-ask.so-what-happens-now]; L77 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L78 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L79 follow/ask/scene-talk/curious/4w1s [scene-talk.follow-ask.so-what-happens-now]; L80 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L81 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L82 follow/ask/scene-talk/curious/4w1s [scene-talk.follow-ask.so-what-happens-now]; L83 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L84 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L85 follow/ask/scene-talk/curious/4w1s [scene-talk.follow-ask.so-what-happens-now]; L86 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L87 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L88 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

**Profile stubborn** (outcome resolved)

**Andrew Peters:** Come here.

**Andrew Peters:** County assessor. You really did it.

You could say:

1. I couldn't have done it without you.
2. Things will settle down now. I promise.
3. Not bad for a first run, right?
4. It hasn't sunk in yet.  *(the page follows this one)*

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. I'm going to make this count.

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Andrew Peters:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L76 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L77 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L78 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L79 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L80 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L81 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L82 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L83 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L84 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L85 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L86 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L87 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L88 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

**Profile anxious** (outcome resolved)

**Andrew Peters:** Look who it is!

**Andrew Peters:** County assessor. You really did it.

You could say:

1. I couldn't have done it without you.
2. I'm going to make this count.
3. Not bad for a first run, right?
4. It hasn't sunk in yet.  *(the page follows this one)*

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. I'm going to make this count.

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Andrew Peters:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/glad/4w1s [scene-talk.open-greet.look-who-it-is]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/nervous/5w1s [scene-talk.reply-tell.it-hasn-t-sunk-in-yet]; L150 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L151 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L152 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L153 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L154 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L155 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L156 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L157 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L158 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L159 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L160 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L161 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L162 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

**Profile boastful** (outcome resolved)

**Andrew Peters:** Come here.

**Andrew Peters:** County assessor. You really did it.

You could say:

1. I couldn't have done it without you.
2. Things will settle down now. I promise.
3. Not bad for a first run, right?
4. I still can't believe it.  *(the page follows this one)*

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. I'm going to make this count.

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.

**Andrew Peters:** You earned this.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. I'm going to make this count.

**Andrew Peters:** You earned this.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/glad/5w1s [scene-talk.reply-tell.i-still-can-t-believe-it]; L76 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L77 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L78 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L79 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L80 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L81 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L82 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L83 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L84 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L85 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]; L86 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L87 reply/promise/scene-talk/proud/6w1s [scene-talk.reply-promise.i-m-going-to-make-this-count]; L88 follow/promise/scene-talk/glad/3w1s [scene-talk.follow-promise.you-earned-this]</sub>

## Scene 28: family-loss (loss, ends in political) — proof scene

*Purpose family-loss. Records: result:contest:seat:US-DE:us-house:00:2026-11-03, contest:seat:US-DE:us-house:00:2026-11-03, person_11d13d68898d12e8, person_11d13e68898d149b, official:term:seat:US-DE:us-house:00:2026-10-12.*

> You lost the race for U.S. Representative. The house is quiet when you get home, and Justin McConnell is still up.

**Profile warm** (outcome resolved)

**Justin McConnell:** I saved you a plate.

**Justin McConnell:** I'm sorry about the race.

You could say:

1. Thank you. I needed that.
2. Julie Nolan ran a dirty race.
3. I'm fine. Really.
4. This isn't the end of it.  *(the page follows this one)*

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. It's hard to hear it was that close.
2. I'll run again.  *(the page follows this one)*

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. I really thought we had it.
2. This isn't the end of it.  *(the page follows this one)*

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. I really thought we had it.
2. This isn't the end of it.  *(the page follows this one)*

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. I really thought we had it.
2. I'll run again.  *(the page follows this one)*

**Justin McConnell:** We'll get through this.

**The whole exchange** (61 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You: Thank you. I needed that.
  - Justin McConnell: We'll get through this.
  - *Ends resolved*
- You: Julie Nolan ran a dirty race.
  - Justin McConnell: You did everything you could.
  - You: Thank you. I needed that.
    - Justin McConnell: We'll get through this.
    - *Ends resolved*
  - You: It's hard to hear it was that close.
    - Justin McConnell: It wasn't your fault.
    - You: Thanks for waiting up.
      - Justin McConnell: We'll get through this.
      - *Ends resolved*
    - You: I really thought we had it.
      - Justin McConnell: You did everything you could.
      - You: Thank you. I needed that.
        - Justin McConnell: We'll get through this.
        - *Ends resolved*
      - You: It's hard to hear it was that close.
        - Justin McConnell: You did everything you could.
        - You: Thank you. I needed that.
          - (the tree is cut here)
        - You: It's hard to hear it was that close.
          - (the tree is cut here)
        - You: I'll run again.
          - (the tree is cut here)
      - You: This isn't the end of it.
        - Justin McConnell: Are you sure that's what you want?
        - You: I really thought we had it.
          - (the tree is cut here)
        - You: I'll run again.
          - (the tree is cut here)
    - You: I'll run again.
      - Justin McConnell: Are you sure that's what you want?
      - You: I really thought we had it.
        - Justin McConnell: You did everything you could.
        - You: Thanks for waiting up.
          - (the tree is cut here)
        - You: I really thought we had it.
          - (the tree is cut here)
        - You: This isn't the end of it.
          - (the tree is cut here)
      - You: This isn't the end of it.
        - Justin McConnell: Are you sure that's what you want?
        - You: I really thought we had it.
          - (the tree is cut here)
        - You: I'll run again.
          - (the tree is cut here)
  - You: This isn't the end of it.
    - Justin McConnell: Are you sure that's what you want?
    - You: It's hard to hear it was that close.
      - Justin McConnell: It wasn't your fault.
      - You: Thanks for waiting up.
        - Justin McConnell: We'll get through this.
        - *Ends resolved*
      - You: I really thought we had it.
        - Justin McConnell: You did everything you could.
        - You: Thanks for waiting up.
          - (the tree is cut here)
        - You: I really thought we had it.
          - (the tree is cut here)
        - You: I'll run again.
          - (the tree is cut here)
      - You: I'll run again.
        - Justin McConnell: Are you sure that's what you want?
        - You: I really thought we had it.
          - (the tree is cut here)
        - You: This isn't the end of it.
          - (the tree is cut here)
    - You: I'll run again.
      - Justin McConnell: Are you sure that's what you want?
      - You: I really thought we had it.
        - Justin McConnell: It wasn't your fault.
        - You: Thank you. I needed that.
          - (the tree is cut here)
        - You: It's hard to hear it was that close.
          - (the tree is cut here)
        - You: I'll run again.
          - (the tree is cut here)
      - You: I'll run again.
        - Justin McConnell: Are you sure that's what you want?
        - You: I really thought we had it.
          - (the tree is cut here)
        - You: This isn't the end of it.
          - (the tree is cut here)
- You: I'm fine. Really.
  - Justin McConnell: Talk to me.
  - You: I really thought we had it.
    - Justin McConnell: It wasn't your fault.
    - You: Thank you. I needed that.
      - Justin McConnell: We'll get through this.
      - *Ends resolved*
    - You: It's hard to hear it was that close.
      - Justin McConnell: You did everything you could.
      - You: Thanks for waiting up.
        - Justin McConnell: We'll get through this.
        - *Ends resolved*
      - You: I really thought we had it.
        - Justin McConnell: You did everything you could.
        - You: Thank you. I needed that.
          - (the tree is cut here)
        - You: It's hard to hear it was that close.
          - (the tree is cut here)
        - You: I'll run again.
          - (the tree is cut here)
      - You: I'll run again.
        - Justin McConnell: Are you sure that's what you want?
        - You: It's hard to hear it was that close.
          - (the tree is cut here)
        - You: This isn't the end of it.
          - (the tree is cut here)
    - You: I'll run again.
      - Justin McConnell: Are you sure that's what you want?
      - You: It's hard to hear it was that close.
        - Justin McConnell: You did everything you could.
        - You: Thanks for waiting up.
          - (the tree is cut here)
        - You: It's hard to hear it was that close.
          - (the tree is cut here)
        - You: This isn't the end of it.
          - (the tree is cut here)
      - You: This isn't the end of it.
        - Justin McConnell: Are you sure that's what you want?
        - You: It's hard to hear it was that close.
          - (the tree is cut here)
        - You: This isn't the end of it.
          - (the tree is cut here)
  - You: Thank you. I needed that.
    - Justin McConnell: We'll get through this.
    - *Ends resolved*
  - You: I don't want to talk about it tonight.
    - Justin McConnell: Talk to me.
    - You: I really thought we had it.
      - Justin McConnell: You did everything you could.
      - You: Thank you. I needed that.
        - Justin McConnell: We'll get through this.
        - *Ends resolved*
      - You: It's hard to hear it was that close.
        - Justin McConnell: It wasn't your fault.
        - You: Thanks for waiting up.
          - (the tree is cut here)
        - You: It's hard to hear it was that close.
          - (the tree is cut here)
        - You: I'll run again.
          - (the tree is cut here)
      - You: This isn't the end of it.
        - Justin McConnell: Are you sure that's what you want?
        - You: It's hard to hear it was that close.
          - (the tree is cut here)
        - You: I'll run again.
          - (the tree is cut here)
    - You: Thanks for waiting up.
      - Justin McConnell: We'll get through this.
      - *Ends resolved*
    - You: I'm fine. Really.
      - Justin McConnell: Talk to me.
      - You: It's hard to hear it was that close.
        - Justin McConnell: You did everything you could.
        - You: Thanks for waiting up.
          - (the tree is cut here)
        - You: I really thought we had it.
          - (the tree is cut here)
        - You: I'll run again.
          - (the tree is cut here)
      - You: Thank you. I needed that.
        - Justin McConnell: We'll get through this.
        - *Ends resolved*
      - You: I'm fine. Really.
        - Justin McConnell: Talk to me.
        - You: I really thought we had it.
          - (the tree is cut here)
        - You: Thanks for waiting up.
          - (the tree is cut here)
        - You: I don't want to talk about it tonight.
          - (the tree is cut here)
- You ★: This isn't the end of it.
  - Justin McConnell: Are you sure that's what you want?
  - You: It's hard to hear it was that close.
    - Justin McConnell: It wasn't your fault.
    - You: Thank you. I needed that.
      - Justin McConnell: We'll get through this.
      - *Ends resolved*
    - You: I really thought we had it.
      - Justin McConnell: You did everything you could.
      - You: Thanks for waiting up.
        - Justin McConnell: We'll get through this.
        - *Ends resolved*
      - You: It's hard to hear it was that close.
        - Justin McConnell: You did everything you could.
        - You: Thank you. I needed that.
          - (the tree is cut here)
        - You: It's hard to hear it was that close.
          - (the tree is cut here)
        - You: I'll run again.
          - (the tree is cut here)
      - You: I'll run again.
        - Justin McConnell: Are you sure that's what you want?
        - You: It's hard to hear it was that close.
          - (the tree is cut here)
        - You: I'll run again.
          - (the tree is cut here)
    - You: I'll run again.
      - Justin McConnell: Are you sure that's what you want?
      - You: I really thought we had it.
        - Justin McConnell: You did everything you could.
        - You: Thanks for waiting up.
          - (the tree is cut here)
        - You: It's hard to hear it was that close.
          - (the tree is cut here)
        - You: This isn't the end of it.
          - (the tree is cut here)
      - You: I'll run again.
        - Justin McConnell: Are you sure that's what you want?
        - You: I really thought we had it.
          - (the tree is cut here)
        - You: I'll run again.
          - (the tree is cut here)
  - You ★: I'll run again.
    - Justin McConnell: Are you sure that's what you want?
    - You: I really thought we had it.
      - Justin McConnell: It wasn't your fault.
      - You: Thank you. I needed that.
        - Justin McConnell: We'll get through this.
        - *Ends resolved*
      - You: It's hard to hear it was that close.
        - Justin McConnell: You did everything you could.
        - You: Thanks for waiting up.
          - (the tree is cut here)
        - You: I really thought we had it.
          - (the tree is cut here)
        - You: I'll run again.
          - (the tree is cut here)
      - You: I'll run again.
        - Justin McConnell: Are you sure that's what you want?
        - You: It's hard to hear it was that close.
          - (the tree is cut here)
        - You: This isn't the end of it.
          - (the tree is cut here)
    - You ★: This isn't the end of it.
      - Justin McConnell: Are you sure that's what you want?
      - You: I really thought we had it.
        - Justin McConnell: It wasn't your fault.
        - You: Thanks for waiting up.
          - (the tree is cut here)
        - You: It's hard to hear it was that close.
          - (the tree is cut here)
        - You: This isn't the end of it.
          - (the tree is cut here)
      - You ★: This isn't the end of it.
        - Justin McConnell: Are you sure that's what you want?
        - You: I really thought we had it.
          - (the tree is cut here)
        - You ★: I'll run again.
          - Justin McConnell: We'll get through this.
          - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/solemn/21w3s [scene-talk.narrate-narrate.you-lost-the-race-for-office-the-house-is-quiet-when-you-get-home-and-]; L2 open/greet/scene-talk/tender/5w1s [scene-talk.open-greet.i-saved-you-a-plate]; L3 state/comfort/scene-talk/tender/5w1s [scene-talk.state-comfort.i-m-sorry-about-the-race]; L4 reply/thank/scene-talk/tender/5w2s [scene-talk.reply-thank.thank-you-i-needed-that]; L5 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.opponent-ran-a-dirty-race]; L6 reply/deflect/scene-talk/guarded/3w2s [scene-talk.reply-deflect.i-m-fine-really]; L7 reply/promise/scene-talk/braced/6w1s [scene-talk.reply-promise.this-isn-t-the-end-of-it]; L128 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L129 reply/tell/scene-talk/hurt/8w1s [scene-talk.reply-tell.it-s-hard-to-hear-it-was-that-close]; L130 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L158 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L159 reply/tell/scene-talk/hurt/6w1s [scene-talk.reply-tell.i-really-thought-we-had-it]; L160 reply/promise/scene-talk/braced/6w1s [scene-talk.reply-promise.this-isn-t-the-end-of-it]; L173 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L174 reply/tell/scene-talk/hurt/6w1s [scene-talk.reply-tell.i-really-thought-we-had-it]; L175 reply/promise/scene-talk/braced/6w1s [scene-talk.reply-promise.this-isn-t-the-end-of-it]; L180 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L181 reply/tell/scene-talk/hurt/6w1s [scene-talk.reply-tell.i-really-thought-we-had-it]; L182 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L183 follow/thank/scene-talk/tender/4w1s [scene-talk.follow-thank.we-ll-get-through-this]</sub>

**Profile cold** (outcome resolved)

**Justin McConnell:** Hey. Come sit down.

**Justin McConnell:** You don't have to talk about it.

You could say:

1. Thank you. I needed that.
2. Julie Nolan ran a dirty race.
3. I don't want to talk about it tonight.
4. I'll run again.  *(the page follows this one)*

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. It's hard to hear it was that close.
2. This isn't the end of it.  *(the page follows this one)*

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. I really thought we had it.
2. I'll run again.  *(the page follows this one)*

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. I really thought we had it.
2. I'll run again.  *(the page follows this one)*

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. I really thought we had it.
2. I'll run again.  *(the page follows this one)*

**Justin McConnell:** We'll get through this.

<sub>L1 narrate/narrate/scene-talk/solemn/21w3s [scene-talk.narrate-narrate.you-lost-the-race-for-office-the-house-is-quiet-when-you-get-home-and-]; L2 open/greet/scene-talk/tender/4w2s [scene-talk.open-greet.hey-come-sit-down]; L3 state/comfort/scene-talk/tender/7w1s [scene-talk.state-comfort.you-don-t-have-to-talk-about-it]; L4 reply/thank/scene-talk/tender/5w2s [scene-talk.reply-thank.thank-you-i-needed-that]; L5 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.opponent-ran-a-dirty-race]; L6 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-don-t-want-to-talk-about-it-tonight]; L7 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L110 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L111 reply/tell/scene-talk/hurt/8w1s [scene-talk.reply-tell.it-s-hard-to-hear-it-was-that-close]; L112 reply/promise/scene-talk/braced/6w1s [scene-talk.reply-promise.this-isn-t-the-end-of-it]; L140 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L141 reply/tell/scene-talk/hurt/6w1s [scene-talk.reply-tell.i-really-thought-we-had-it]; L142 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L155 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L156 reply/tell/scene-talk/hurt/6w1s [scene-talk.reply-tell.i-really-thought-we-had-it]; L157 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L162 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L163 reply/tell/scene-talk/hurt/6w1s [scene-talk.reply-tell.i-really-thought-we-had-it]; L164 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L165 follow/thank/scene-talk/tender/4w1s [scene-talk.follow-thank.we-ll-get-through-this]</sub>

**Profile stubborn** (outcome resolved)

**Justin McConnell:** Hey. Come sit down.

**Justin McConnell:** You don't have to talk about it.

You could say:

1. Thanks for waiting up.
2. Julie Nolan ran a dirty race.
3. I don't want to talk about it tonight.
4. This isn't the end of it.  *(the page follows this one)*

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. It's hard to hear it was that close.
2. I'll run again.  *(the page follows this one)*

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. I really thought we had it.
2. This isn't the end of it.  *(the page follows this one)*

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. I really thought we had it.
2. This isn't the end of it.  *(the page follows this one)*

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. I really thought we had it.
2. I'll run again.  *(the page follows this one)*

**Justin McConnell:** We'll get through this.

<sub>L1 narrate/narrate/scene-talk/solemn/21w3s [scene-talk.narrate-narrate.you-lost-the-race-for-office-the-house-is-quiet-when-you-get-home-and-]; L2 open/greet/scene-talk/tender/4w2s [scene-talk.open-greet.hey-come-sit-down]; L3 state/comfort/scene-talk/tender/7w1s [scene-talk.state-comfort.you-don-t-have-to-talk-about-it]; L4 reply/thank/scene-talk/tender/4w1s [scene-talk.reply-thank.thanks-for-waiting-up]; L5 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.opponent-ran-a-dirty-race]; L6 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-don-t-want-to-talk-about-it-tonight]; L7 reply/promise/scene-talk/braced/6w1s [scene-talk.reply-promise.this-isn-t-the-end-of-it]; L110 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L111 reply/tell/scene-talk/hurt/8w1s [scene-talk.reply-tell.it-s-hard-to-hear-it-was-that-close]; L112 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L140 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L141 reply/tell/scene-talk/hurt/6w1s [scene-talk.reply-tell.i-really-thought-we-had-it]; L142 reply/promise/scene-talk/braced/6w1s [scene-talk.reply-promise.this-isn-t-the-end-of-it]; L155 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L156 reply/tell/scene-talk/hurt/6w1s [scene-talk.reply-tell.i-really-thought-we-had-it]; L157 reply/promise/scene-talk/braced/6w1s [scene-talk.reply-promise.this-isn-t-the-end-of-it]; L162 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L163 reply/tell/scene-talk/hurt/6w1s [scene-talk.reply-tell.i-really-thought-we-had-it]; L164 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L165 follow/thank/scene-talk/tender/4w1s [scene-talk.follow-thank.we-ll-get-through-this]</sub>

**Profile anxious** (outcome resolved)

**Justin McConnell:** Hey. Come sit down.

**Justin McConnell:** I'm sorry about the race.

You could say:

1. Thanks for waiting up.
2. Julie Nolan ran a dirty race.
3. I don't want to talk about it tonight.
4. This isn't the end of it.  *(the page follows this one)*

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. It's hard to hear it was that close.
2. I'll run again.  *(the page follows this one)*

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. I really thought we had it.
2. This isn't the end of it.  *(the page follows this one)*

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. I really thought we had it.
2. This isn't the end of it.  *(the page follows this one)*

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. I really thought we had it.
2. I'll run again.  *(the page follows this one)*

**Justin McConnell:** We'll get through this.

<sub>L1 narrate/narrate/scene-talk/solemn/21w3s [scene-talk.narrate-narrate.you-lost-the-race-for-office-the-house-is-quiet-when-you-get-home-and-]; L2 open/greet/scene-talk/tender/4w2s [scene-talk.open-greet.hey-come-sit-down]; L3 state/comfort/scene-talk/tender/5w1s [scene-talk.state-comfort.i-m-sorry-about-the-race]; L4 reply/thank/scene-talk/tender/4w1s [scene-talk.reply-thank.thanks-for-waiting-up]; L5 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.opponent-ran-a-dirty-race]; L6 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-don-t-want-to-talk-about-it-tonight]; L7 reply/promise/scene-talk/braced/6w1s [scene-talk.reply-promise.this-isn-t-the-end-of-it]; L110 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L111 reply/tell/scene-talk/hurt/8w1s [scene-talk.reply-tell.it-s-hard-to-hear-it-was-that-close]; L112 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L140 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L141 reply/tell/scene-talk/hurt/6w1s [scene-talk.reply-tell.i-really-thought-we-had-it]; L142 reply/promise/scene-talk/braced/6w1s [scene-talk.reply-promise.this-isn-t-the-end-of-it]; L155 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L156 reply/tell/scene-talk/hurt/6w1s [scene-talk.reply-tell.i-really-thought-we-had-it]; L157 reply/promise/scene-talk/braced/6w1s [scene-talk.reply-promise.this-isn-t-the-end-of-it]; L162 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L163 reply/tell/scene-talk/hurt/6w1s [scene-talk.reply-tell.i-really-thought-we-had-it]; L164 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L165 follow/thank/scene-talk/tender/4w1s [scene-talk.follow-thank.we-ll-get-through-this]</sub>

**Profile boastful** (outcome resolved)

**Justin McConnell:** I saved you a plate.

**Justin McConnell:** I'm sorry about the race.

You could say:

1. Thank you. I needed that.
2. Julie Nolan ran a dirty race.
3. I don't want to talk about it tonight.
4. This isn't the end of it.  *(the page follows this one)*

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. It's hard to hear it was that close.  *(the page follows this one)*
2. I'll run again.

**Justin McConnell:** You did everything you could.

You could say:

1. Thank you. I needed that.
2. I really thought we had it.  *(the page follows this one)*
3. I'll run again.

**Justin McConnell:** It wasn't your fault.

You could say:

1. Thank you. I needed that.
2. It's hard to hear it was that close.  *(the page follows this one)*
3. I'll run again.

**Justin McConnell:** You did everything you could.

You could say:

1. Thank you. I needed that.
2. It's hard to hear it was that close.  *(the page follows this one)*
3. I'll run again.

**Justin McConnell:** It wasn't your fault.

<sub>L1 narrate/narrate/scene-talk/solemn/21w3s [scene-talk.narrate-narrate.you-lost-the-race-for-office-the-house-is-quiet-when-you-get-home-and-]; L2 open/greet/scene-talk/tender/5w1s [scene-talk.open-greet.i-saved-you-a-plate]; L3 state/comfort/scene-talk/tender/5w1s [scene-talk.state-comfort.i-m-sorry-about-the-race]; L4 reply/thank/scene-talk/tender/5w2s [scene-talk.reply-thank.thank-you-i-needed-that]; L5 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.opponent-ran-a-dirty-race]; L6 reply/deflect/scene-talk/guarded/8w1s [scene-talk.reply-deflect.i-don-t-want-to-talk-about-it-tonight]; L7 reply/promise/scene-talk/braced/6w1s [scene-talk.reply-promise.this-isn-t-the-end-of-it]; L110 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L111 reply/tell/scene-talk/hurt/8w1s [scene-talk.reply-tell.it-s-hard-to-hear-it-was-that-close]; L112 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L113 follow/comfort/scene-talk/tender/5w1s [scene-talk.follow-comfort.you-did-everything-you-could]; L114 reply/thank/scene-talk/tender/5w2s [scene-talk.reply-thank.thank-you-i-needed-that]; L115 reply/tell/scene-talk/hurt/6w1s [scene-talk.reply-tell.i-really-thought-we-had-it]; L116 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L118 follow/comfort/scene-talk/tender/4w1s [scene-talk.follow-comfort.it-wasn-t-your-fault]; L119 reply/thank/scene-talk/tender/5w2s [scene-talk.reply-thank.thank-you-i-needed-that]; L120 reply/tell/scene-talk/hurt/8w1s [scene-talk.reply-tell.it-s-hard-to-hear-it-was-that-close]; L121 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L123 follow/comfort/scene-talk/tender/5w1s [scene-talk.follow-comfort.you-did-everything-you-could]; L124 reply/thank/scene-talk/tender/5w2s [scene-talk.reply-thank.thank-you-i-needed-that]; L125 reply/tell/scene-talk/hurt/8w1s [scene-talk.reply-tell.it-s-hard-to-hear-it-was-that-close]; L126 reply/promise/scene-talk/braced/3w1s [scene-talk.reply-promise.i-ll-run-again]; L127 follow/comfort/scene-talk/tender/4w1s [scene-talk.follow-comfort.it-wasn-t-your-fault]</sub>

## Scene 29: family-absence (threat, ends in political) — proof scene

*Purpose family-absence. Records: term:seat:gus2025:101811:board:6:2027-01-01:elected, person_d3c11e75ee46a9b9, person_d3c12275ee46b085.*

> You've been at the office late every night this week. Bentley Rivas is waiting up for you.

**Profile warm** (outcome resolved)

**Bentley Rivas:** You're home.

**Bentley Rivas:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise.  *(the page follows this one)*
3. It's just a busy stretch.
4. I'm doing this for us, too.
5. This is the last late night. I promise.

**Bentley Rivas:** Thank you. That's all I wanted to hear.

**The whole exchange** (58 nodes; endings: resolved, resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, resolved, resolved, open, resolved, resolved, resolved, resolved, resolved, open, resolved, resolved, resolved, open, resolved, resolved, resolved, open, resolved, resolved, open, open, resolved; ★ is the branch this profile's traits lean toward):

- You: I've let things slide at home. I know.
  - Bentley Rivas: Thank you. That's all I wanted to hear.
  - *Ends resolved*
- You ★: I'll be home more. I promise.
  - Bentley Rivas: Thank you. That's all I wanted to hear.
  - *Ends resolved*
- You: It's just a busy stretch.
  - Bentley Rivas: Saying sorry isn't the same as being here.
  - You: This weekend is ours. No calls.
    - Bentley Rivas: Thank you. That's all I wanted to hear.
    - *Ends resolved*
  - You: I've let things slide at home. I know.
    - Bentley Rivas: Thank you. That's all I wanted to hear.
    - *Ends resolved*
  - You: I'm doing this for us, too.
    - Bentley Rivas: That's not fair, and you know it.
    - You: I've let things slide at home. I know.
      - Bentley Rivas: Thank you. That's all I wanted to hear.
      - *Ends resolved*
    - You: This job doesn't leave much time. You know that.
      - Bentley Rivas: Don't put this on me.
      - You: You're right. I'm sorry.
        - Bentley Rivas: Thank you. That's all I wanted to hear.
        - *Ends resolved*
      - You: I'm doing this for us, too.
        - Bentley Rivas: Don't put this on me.
        - You: You're right. I'm sorry.
          - Bentley Rivas: Thank you. That's all I wanted to hear.
          - *Ends resolved*
        - You: I'm doing this for us, too.
          - Bentley Rivas: That's not fair, and you know it.
          - *Ends open: Bentley Rivas: I'm going to bed. We'll talk tomorrow.*
        - You: I'll be home more. I promise.
          - Bentley Rivas: You said that last time.
          - *Ends resolved*
      - You: I'll be home more. I promise.
        - Bentley Rivas: Thank you. That's all I wanted to hear.
        - *Ends resolved*
    - You: I'll be home more. I promise.
      - Bentley Rivas: Thank you. That's all I wanted to hear.
      - *Ends resolved*
- You: I'm doing this for us, too.
  - Bentley Rivas: Don't put this on me.
  - You: I've let things slide at home. I know.
    - Bentley Rivas: Okay. I'm holding you to that.
    - *Ends resolved*
  - You: This job doesn't leave much time. You know that.
    - Bentley Rivas: That's not fair, and you know it.
    - You: You're right. I'm sorry.
      - Bentley Rivas: Thank you. That's all I wanted to hear.
      - *Ends resolved*
    - You: I'm doing this for us, too.
      - Bentley Rivas: That's not fair, and you know it.
      - You: You're right. I'm sorry.
        - Bentley Rivas: Thank you. That's all I wanted to hear.
        - *Ends resolved*
      - You: This job doesn't leave much time. You know that.
        - Bentley Rivas: That's not fair, and you know it.
        - You: You're right. I'm sorry.
          - Bentley Rivas: Thank you. That's all I wanted to hear.
          - *Ends resolved*
        - You: I'm doing this for us, too.
          - Bentley Rivas: Don't put this on me.
          - *Ends open: Bentley Rivas: We're not done talking about this.*
        - You: I'll be home more. I promise.
          - Bentley Rivas: Thank you. That's all I wanted to hear.
          - *Ends resolved*
      - You: I'll be home more. I promise.
        - Bentley Rivas: Saying sorry isn't the same as being here.
        - You: This weekend is ours. No calls.
          - Bentley Rivas: Thank you. That's all I wanted to hear.
          - *Ends resolved*
        - You: I've let things slide at home. I know.
          - Bentley Rivas: Okay. I'm holding you to that.
          - *Ends resolved*
        - You: I'm doing this for us, too.
          - Bentley Rivas: Don't put this on me.
          - *Ends open: Bentley Rivas: I'm going to bed. We'll talk tomorrow.*
    - You: I'll be home more. I promise.
      - Bentley Rivas: Thank you. That's all I wanted to hear.
      - *Ends resolved*
  - You: I'll be home more. I promise.
    - Bentley Rivas: Saying sorry isn't the same as being here.
    - You: This weekend is ours. No calls.
      - Bentley Rivas: Thank you. That's all I wanted to hear.
      - *Ends resolved*
    - You: I've let things slide at home. I know.
      - Bentley Rivas: Thank you. That's all I wanted to hear.
      - *Ends resolved*
    - You: This job doesn't leave much time. You know that.
      - Bentley Rivas: That's not fair, and you know it.
      - You: I've let things slide at home. I know.
        - Bentley Rivas: Thank you. That's all I wanted to hear.
        - *Ends resolved*
      - You: I'm doing this for us, too.
        - Bentley Rivas: That's not fair, and you know it.
        - You: You're right. I'm sorry.
          - Bentley Rivas: Thank you. That's all I wanted to hear.
          - *Ends resolved*
        - You: I'm doing this for us, too.
          - Bentley Rivas: Don't put this on me.
          - *Ends open: Bentley Rivas: I'm going to bed. We'll talk tomorrow.*
        - You: I'll be home more. I promise.
          - Bentley Rivas: You said that last time.
          - *Ends resolved*
      - You: I'll be home more. I promise.
        - Bentley Rivas: You said that last time.
        - You: This weekend is ours. No calls.
          - Bentley Rivas: Saying sorry isn't the same as being here.
          - *Ends resolved*
        - You: I've let things slide at home. I know.
          - Bentley Rivas: Thank you. That's all I wanted to hear.
          - *Ends resolved*
        - You: I'm doing this for us, too.
          - Bentley Rivas: Don't put this on me.
          - *Ends open: Bentley Rivas: I'm going to bed. We'll talk tomorrow.*
- You: This is the last late night. I promise.
  - *if Bentley Rivas knows:*
    - Bentley Rivas: I called the office. There was no meeting.
    - You: You're right. I'm sorry.
      - Bentley Rivas: Thank you for telling me.
      - You: I'll be home more. I promise.
        - *Ends resolved*
      - You: It's just a busy stretch.
        - Bentley Rivas: Saying sorry isn't the same as being here.
        - You: This weekend is ours. No calls.
          - *Ends resolved*
        - You: I've let things slide at home. I know.
          - *Ends resolved*
        - You: I'm doing this for us, too.
          - *Ends open: Bentley Rivas: I'm going to bed. We'll talk tomorrow.*
    - You: It's just a busy stretch.
      - Bentley Rivas: Saying sorry isn't the same as being here.
      - You: This weekend is ours. No calls.
        - *Ends resolved*
      - You: I've let things slide at home. I know.
        - *Ends resolved*
      - You: I'm doing this for us, too.
        - *Ends open: Bentley Rivas: We're not done talking about this.*
    - You: It was a late committee meeting. That's all.
      - *Ends open: Bentley Rivas: I'm going to bed. We'll talk tomorrow.*
  - *if not:*
    - Bentley Rivas: Okay. Come eat something.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/hurt/2w1s [scene-talk.open-greet.you-re-home]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-just-a-busy-stretch]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.this-is-the-last-late-night-i-promise]; L10 follow/accept/scene-talk/tender/8w2s [scene-talk.follow-accept.thank-you-that-s-all-i-wanted-to-hear]</sub>

**Profile cold** (outcome resolved)

**Bentley Rivas:** Oh. You're back.

**Bentley Rivas:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise.  *(the page follows this one)*
3. It's just a busy stretch.
4. This job doesn't leave much time. You know that.
5. This is the last late night. I promise.

**Bentley Rivas:** Okay. I'm holding you to that.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-just-a-busy-stretch]; L7 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.this-is-the-last-late-night-i-promise]; L10 follow/accept/scene-talk/guarded/6w2s [scene-talk.follow-accept.okay-i-m-holding-you-to-that]</sub>

**Profile stubborn** (outcome resolved)

**Bentley Rivas:** Oh. You're back.

**Bentley Rivas:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise.  *(the page follows this one)*
3. Can we not do this tonight?
4. I'm doing this for us, too.
5. This is the last late night. I promise.

**Bentley Rivas:** Saying sorry isn't the same as being here.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. I've let things slide at home. I know.
3. This job doesn't leave much time. You know that.

**Bentley Rivas:** You said that last time.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. You're right. I'm sorry.
3. I'm doing this for us, too.

**Bentley Rivas:** Saying sorry isn't the same as being here.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. You're right. I'm sorry.
3. I'm doing this for us, too.

**Bentley Rivas:** You said that last time.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. I've let things slide at home. I know.
3. This job doesn't leave much time. You know that.

**Bentley Rivas:** You said that last time.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.this-is-the-last-late-night-i-promise]; L61 follow/press/scene-talk/hurt/8w1s [scene-talk.follow-press.saying-sorry-isn-t-the-same-as-being-here]; L62 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L63 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L64 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L65 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]; L66 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L67 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L68 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L69 follow/press/scene-talk/hurt/8w1s [scene-talk.follow-press.saying-sorry-isn-t-the-same-as-being-here]; L70 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L71 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L72 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L73 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]; L74 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L75 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L76 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L77 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]</sub>

**Profile anxious** (outcome resolved)

**Bentley Rivas:** You're home.

**Bentley Rivas:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise.  *(the page follows this one)*
3. Can we not do this tonight?
4. This job doesn't leave much time. You know that.
5. This is the last late night. I promise.

**Bentley Rivas:** Thank you. That's all I wanted to hear.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/hurt/2w1s [scene-talk.open-greet.you-re-home]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.this-is-the-last-late-night-i-promise]; L10 follow/accept/scene-talk/tender/8w2s [scene-talk.follow-accept.thank-you-that-s-all-i-wanted-to-hear]</sub>

## Scene 30: family-absence (threat, ends in political) — proof scene

*Purpose family-absence. Records: term:seat:gus2025:101811:board:3:2026-10-12, person_bc041cf6bd9d1894, person_bc041df6bd9d1a47.*

> You've been at the office late every night this week. Olivia Keller is waiting up for you.

**Profile warm** (outcome resolved)

**Olivia Keller:** Oh. You're back.

**Olivia Keller:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise.  *(the page follows this one)*
3. Can we not do this tonight?
4. I'm doing this for us, too.
5. It was a late committee meeting. That's all.

**Olivia Keller:** Thank you. That's all I wanted to hear.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, open, resolved, resolved, resolved, open, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, open, resolved, resolved, open, open, resolved; ★ is the branch this profile's traits lean toward):

- You: I've let things slide at home. I know.
  - Olivia Keller: Thank you. That's all I wanted to hear.
  - *Ends resolved*
- You ★: I'll be home more. I promise.
  - Olivia Keller: Thank you. That's all I wanted to hear.
  - *Ends resolved*
- You: Can we not do this tonight?
  - Olivia Keller: We miss you. That's all.
  - You: This weekend is ours. No calls.
    - Olivia Keller: Saying sorry isn't the same as being here.
    - You: This weekend is ours. No calls.
      - Olivia Keller: You said that last time.
      - You: This weekend is ours. No calls.
        - Olivia Keller: You said that last time.
        - You: This weekend is ours. No calls.
          - Olivia Keller: You said that last time.
          - *Ends resolved*
        - You: I've let things slide at home. I know.
          - Olivia Keller: Thank you. That's all I wanted to hear.
          - *Ends resolved*
        - You: I'm doing this for us, too.
          - Olivia Keller: We miss you. That's all.
          - *Ends open: Olivia Keller: I'm going to bed. We'll talk tomorrow.*
      - You: I've let things slide at home. I know.
        - Olivia Keller: Thank you. That's all I wanted to hear.
        - *Ends resolved*
      - You: I'm doing this for us, too.
        - Olivia Keller: We miss you. That's all.
        - You: This weekend is ours. No calls.
          - Olivia Keller: Thank you. That's all I wanted to hear.
          - *Ends resolved*
        - You: I've let things slide at home. I know.
          - Olivia Keller: Thank you. That's all I wanted to hear.
          - *Ends resolved*
        - You: It's just a busy stretch.
          - Olivia Keller: We miss you. That's all.
          - *Ends open: Olivia Keller: We're not done talking about this.*
    - You: I've let things slide at home. I know.
      - Olivia Keller: Thank you. That's all I wanted to hear.
      - *Ends resolved*
    - You: I'm doing this for us, too.
      - Olivia Keller: We miss you. That's all.
      - You: This weekend is ours. No calls.
        - Olivia Keller: Thank you. That's all I wanted to hear.
        - *Ends resolved*
      - You: You're right. I'm sorry.
        - Olivia Keller: Thank you. That's all I wanted to hear.
        - *Ends resolved*
      - You: It's just a busy stretch.
        - Olivia Keller: We miss you. That's all.
        - You: This weekend is ours. No calls.
          - Olivia Keller: Thank you. That's all I wanted to hear.
          - *Ends resolved*
        - You: You're right. I'm sorry.
          - Olivia Keller: Thank you. That's all I wanted to hear.
          - *Ends resolved*
        - You: It's just a busy stretch.
          - (the tree is cut here)
  - You: You're right. I'm sorry.
    - Olivia Keller: Thank you. That's all I wanted to hear.
    - *Ends resolved*
  - You: It's just a busy stretch.
    - Olivia Keller: We miss you. That's all.
    - You: This weekend is ours. No calls.
      - Olivia Keller: Thank you. That's all I wanted to hear.
      - *Ends resolved*
    - You: I've let things slide at home. I know.
      - Olivia Keller: Thank you. That's all I wanted to hear.
      - *Ends resolved*
    - You: Can we not do this tonight?
      - Olivia Keller: We miss you. That's all.
      - You: This weekend is ours. No calls.
        - Olivia Keller: You said that last time.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: I've let things slide at home. I know.
          - (the tree is cut here)
        - You: I'm doing this for us, too.
          - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - Olivia Keller: Thank you. That's all I wanted to hear.
        - *Ends resolved*
      - You: It's just a busy stretch.
        - Olivia Keller: We miss you. That's all.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: You're right. I'm sorry.
          - (the tree is cut here)
        - You: Can we not do this tonight?
          - (the tree is cut here)
- You: I'm doing this for us, too.
  - Olivia Keller: We miss you. That's all.
  - You: This weekend is ours. No calls.
    - Olivia Keller: Saying sorry isn't the same as being here.
    - You: This weekend is ours. No calls.
      - Olivia Keller: Thank you. That's all I wanted to hear.
      - *Ends resolved*
    - You: You're right. I'm sorry.
      - Olivia Keller: Thank you. That's all I wanted to hear.
      - *Ends resolved*
    - You: This job doesn't leave much time. You know that.
      - Olivia Keller: We miss you. That's all.
      - You: This weekend is ours. No calls.
        - Olivia Keller: You said that last time.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: I've let things slide at home. I know.
          - (the tree is cut here)
        - You: I'm doing this for us, too.
          - (the tree is cut here)
      - You: You're right. I'm sorry.
        - Olivia Keller: Thank you. That's all I wanted to hear.
        - *Ends resolved*
      - You: Can we not do this tonight?
        - Olivia Keller: We miss you. That's all.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: You're right. I'm sorry.
          - (the tree is cut here)
        - You: It's just a busy stretch.
          - (the tree is cut here)
  - You: I've let things slide at home. I know.
    - Olivia Keller: Thank you. That's all I wanted to hear.
    - *Ends resolved*
  - You: Can we not do this tonight?
    - Olivia Keller: We miss you. That's all.
    - You: This weekend is ours. No calls.
      - Olivia Keller: Thank you. That's all I wanted to hear.
      - *Ends resolved*
    - You: I've let things slide at home. I know.
      - Olivia Keller: Thank you. That's all I wanted to hear.
      - *Ends resolved*
    - You: It's just a busy stretch.
      - Olivia Keller: We miss you. That's all.
      - You: This weekend is ours. No calls.
        - Olivia Keller: Saying sorry isn't the same as being here.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: You're right. I'm sorry.
          - (the tree is cut here)
        - You: This job doesn't leave much time. You know that.
          - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - Olivia Keller: Thank you. That's all I wanted to hear.
        - *Ends resolved*
      - You: It's just a busy stretch.
        - Olivia Keller: We miss you. That's all.
        - You: This weekend is ours. No calls.
          - (the tree is cut here)
        - You: I've let things slide at home. I know.
          - (the tree is cut here)
        - You: Can we not do this tonight?
          - (the tree is cut here)
- You: It was a late committee meeting. That's all.
  - *if Olivia Keller knows:*
    - Olivia Keller: I called the office. There was no meeting.
    - You: You're right. I'm sorry.
      - Olivia Keller: Thank you for telling me.
      - You: I'll be home more. I promise.
        - *Ends resolved*
      - You: It's just a busy stretch.
        - Olivia Keller: Saying sorry isn't the same as being here.
        - You: This weekend is ours. No calls.
          - *Ends resolved*
        - You: I've let things slide at home. I know.
          - *Ends resolved*
        - You: I'm doing this for us, too.
          - *Ends open: Olivia Keller: We're not done talking about this.*
    - You: Can we not do this tonight?
      - Olivia Keller: You said that last time.
      - You: This weekend is ours. No calls.
        - *Ends resolved*
      - You: I've let things slide at home. I know.
        - *Ends resolved*
      - You: I'm doing this for us, too.
        - *Ends open: Olivia Keller: We're not done talking about this.*
    - You: This is the last late night. I promise.
      - *Ends open: Olivia Keller: We're not done talking about this.*
  - *if not:*
    - Olivia Keller: Okay. Come eat something.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.it-was-a-late-committee-meeting-that-s-all]; L10 follow/accept/scene-talk/tender/8w2s [scene-talk.follow-accept.thank-you-that-s-all-i-wanted-to-hear]</sub>

**Profile cold** (outcome open)

**Olivia Keller:** Oh. You're back.

**Olivia Keller:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise.
3. Can we not do this tonight?
4. This job doesn't leave much time. You know that.  *(the page follows this one)*
5. It was a late committee meeting. That's all.

**Olivia Keller:** We miss you. That's all.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. I've let things slide at home. I know.
3. It's just a busy stretch.

**Olivia Keller:** Saying sorry isn't the same as being here.

You could say:

1. This weekend is ours. No calls.
2. You're right. I'm sorry.
3. I'm doing this for us, too.  *(the page follows this one)*

**Olivia Keller:** We miss you. That's all.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. You're right. I'm sorry.
3. Can we not do this tonight?

**Olivia Keller:** You said that last time.

You could say:

1. This weekend is ours. No calls.
2. I've let things slide at home. I know.
3. This job doesn't leave much time. You know that.  *(the page follows this one)*

**Olivia Keller:** We miss you. That's all.

**Olivia Keller:** We're not done talking about this.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.it-was-a-late-committee-meeting-that-s-all]; L73 follow/plea/scene-talk/tender/5w2s [scene-talk.follow-plea.we-miss-you-that-s-all]; L74 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L75 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L76 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-just-a-busy-stretch]; L77 follow/press/scene-talk/hurt/8w1s [scene-talk.follow-press.saying-sorry-isn-t-the-same-as-being-here]; L78 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L79 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L80 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L83 follow/plea/scene-talk/tender/5w2s [scene-talk.follow-plea.we-miss-you-that-s-all]; L84 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L85 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L86 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L87 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]; L88 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L89 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L90 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L91 follow/plea/scene-talk/tender/5w2s [scene-talk.follow-plea.we-miss-you-that-s-all]; L92 close/warn/scene-talk/hurt/6w1s [scene-talk.close-warn.we-re-not-done-talking-about-this]</sub>

**Profile stubborn** (outcome open)

**Olivia Keller:** Oh. You're back.

**Olivia Keller:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise.
3. Can we not do this tonight?
4. I'm doing this for us, too.  *(the page follows this one)*
5. It was a late committee meeting. That's all.

**Olivia Keller:** That's not fair, and you know it.

You could say:

1. I've let things slide at home. I know.
2. This job doesn't leave much time. You know that.  *(the page follows this one)*
3. I'll be home more. I promise.

**Olivia Keller:** Don't put this on me.

You could say:

1. I've let things slide at home. I know.
2. I'm doing this for us, too.  *(the page follows this one)*
3. I'll be home more. I promise.

**Olivia Keller:** That's not fair, and you know it.

You could say:

1. You're right. I'm sorry.
2. This job doesn't leave much time. You know that.  *(the page follows this one)*
3. I'll be home more. I promise.

**Olivia Keller:** Don't put this on me.

You could say:

1. I've let things slide at home. I know.
2. I'm doing this for us, too.  *(the page follows this one)*
3. I'll be home more. I promise.

**Olivia Keller:** That's not fair, and you know it.

**Olivia Keller:** We're not done talking about this.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.it-was-a-late-committee-meeting-that-s-all]; L165 follow/disagree/scene-talk/hurt/7w1s [scene-talk.follow-disagree.that-s-not-fair-and-you-know-it]; L166 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L167 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L168 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L185 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.don-t-put-this-on-me]; L186 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L187 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L188 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L193 follow/disagree/scene-talk/hurt/7w1s [scene-talk.follow-disagree.that-s-not-fair-and-you-know-it]; L194 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L195 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L196 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L197 follow/disagree/scene-talk/hurt/5w1s [scene-talk.follow-disagree.don-t-put-this-on-me]; L198 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L199 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L200 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L201 follow/disagree/scene-talk/hurt/7w1s [scene-talk.follow-disagree.that-s-not-fair-and-you-know-it]; L202 close/warn/scene-talk/hurt/6w1s [scene-talk.close-warn.we-re-not-done-talking-about-this]</sub>

**Profile anxious** (outcome open)

**Olivia Keller:** Oh. You're back.

**Olivia Keller:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise.
3. Can we not do this tonight?
4. I'm doing this for us, too.  *(the page follows this one)*
5. This is the last late night. I promise.

**Olivia Keller:** We miss you. That's all.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. I've let things slide at home. I know.
3. Can we not do this tonight?

**Olivia Keller:** Saying sorry isn't the same as being here.

You could say:

1. This weekend is ours. No calls.
2. You're right. I'm sorry.
3. This job doesn't leave much time. You know that.  *(the page follows this one)*

**Olivia Keller:** We miss you. That's all.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. You're right. I'm sorry.
3. It's just a busy stretch.

**Olivia Keller:** You said that last time.

You could say:

1. This weekend is ours. No calls.
2. I've let things slide at home. I know.
3. This job doesn't leave much time. You know that.  *(the page follows this one)*

**Olivia Keller:** We miss you. That's all.

**Olivia Keller:** We're not done talking about this.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.this-is-the-last-late-night-i-promise]; L73 follow/plea/scene-talk/tender/5w2s [scene-talk.follow-plea.we-miss-you-that-s-all]; L74 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L75 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L76 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L77 follow/press/scene-talk/hurt/8w1s [scene-talk.follow-press.saying-sorry-isn-t-the-same-as-being-here]; L78 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L79 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L80 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L83 follow/plea/scene-talk/tender/5w2s [scene-talk.follow-plea.we-miss-you-that-s-all]; L84 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L85 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L86 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-just-a-busy-stretch]; L87 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]; L88 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L89 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L90 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L91 follow/plea/scene-talk/tender/5w2s [scene-talk.follow-plea.we-miss-you-that-s-all]; L92 close/warn/scene-talk/hurt/6w1s [scene-talk.close-warn.we-re-not-done-talking-about-this]</sub>

**Profile boastful** (outcome open)

**Olivia Keller:** Oh. You're back.

**Olivia Keller:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise.
3. Can we not do this tonight?
4. I'm doing this for us, too.  *(the page follows this one)*
5. It was a late committee meeting. That's all.

**Olivia Keller:** We miss you. That's all.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. I've let things slide at home. I know.
3. Can we not do this tonight?

**Olivia Keller:** Saying sorry isn't the same as being here.

You could say:

1. This weekend is ours. No calls.
2. You're right. I'm sorry.
3. This job doesn't leave much time. You know that.  *(the page follows this one)*

**Olivia Keller:** We miss you. That's all.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. You're right. I'm sorry.
3. It's just a busy stretch.

**Olivia Keller:** You said that last time.

You could say:

1. This weekend is ours. No calls.
2. I've let things slide at home. I know.
3. This job doesn't leave much time. You know that.  *(the page follows this one)*

**Olivia Keller:** We miss you. That's all.

**Olivia Keller:** We're not done talking about this.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.it-was-a-late-committee-meeting-that-s-all]; L73 follow/plea/scene-talk/tender/5w2s [scene-talk.follow-plea.we-miss-you-that-s-all]; L74 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L75 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L76 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L77 follow/press/scene-talk/hurt/8w1s [scene-talk.follow-press.saying-sorry-isn-t-the-same-as-being-here]; L78 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L79 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L80 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L83 follow/plea/scene-talk/tender/5w2s [scene-talk.follow-plea.we-miss-you-that-s-all]; L84 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L85 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L86 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-just-a-busy-stretch]; L87 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]; L88 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L89 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L90 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L91 follow/plea/scene-talk/tender/5w2s [scene-talk.follow-plea.we-miss-you-that-s-all]; L92 close/warn/scene-talk/hurt/6w1s [scene-talk.close-warn.we-re-not-done-talking-about-this]</sub>

## Scene 31: family-absence (threat, ends in political) — proof scene

*Purpose family-absence. Records: term:seat:gus2025:101811:board:4:2027-01-01:elected, person_bf349dc8efe60e9c, person_bf349ec8efe6104f.*

> You've been at the office late every night this week. Robert Nixon is waiting up for you.

**Profile warm** (outcome resolved)

**Robert Nixon:** You're home.

**Robert Nixon:** We hardly see you since you took office.

You could say:

1. You're right. I'm sorry.
2. I'll be home more. I promise.  *(the page follows this one)*
3. Can we not do this tonight?
4. I'm doing this for us, too.
5. This is the last late night. I promise.

**Robert Nixon:** Saying sorry isn't the same as being here.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. You're right. I'm sorry.
3. This job doesn't leave much time. You know that.

**Robert Nixon:** You said that last time.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. You're right. I'm sorry.
3. I'm doing this for us, too.

**Robert Nixon:** Saying sorry isn't the same as being here.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. You're right. I'm sorry.
3. I'm doing this for us, too.

**Robert Nixon:** You said that last time.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. I've let things slide at home. I know.
3. I'm doing this for us, too.

**Robert Nixon:** You said that last time.

**The whole exchange** (62 nodes; endings: resolved, resolved, open, resolved; ★ is the branch this profile's traits lean toward):

- You: You're right. I'm sorry.
  - Robert Nixon: Saying sorry isn't the same as being here.
  - You: This weekend is ours. No calls.
    - Robert Nixon: You said that last time.
    - You: This weekend is ours. No calls.
      - Robert Nixon: You said that last time.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
    - You: I've let things slide at home. I know.
      - Robert Nixon: You said that last time.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
    - You: I'm doing this for us, too.
      - Robert Nixon: That's not fair, and you know it.
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: This job doesn't leave much time. You know that.
        - (the tree is cut here)
      - You: I'll be home more. I promise.
        - (the tree is cut here)
  - You: I've let things slide at home. I know.
    - Robert Nixon: You said that last time.
    - You: This weekend is ours. No calls.
      - Robert Nixon: You said that last time.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: You're right. I'm sorry.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
    - You: You're right. I'm sorry.
      - Robert Nixon: Saying sorry isn't the same as being here.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: This job doesn't leave much time. You know that.
        - (the tree is cut here)
    - You: This job doesn't leave much time. You know that.
      - Robert Nixon: That's not fair, and you know it.
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
      - You: I'll be home more. I promise.
        - (the tree is cut here)
  - You: I'm doing this for us, too.
    - Robert Nixon: Don't put this on me.
    - You: I've let things slide at home. I know.
      - Robert Nixon: You said that last time.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: This job doesn't leave much time. You know that.
        - (the tree is cut here)
    - You: This job doesn't leave much time. You know that.
      - Robert Nixon: That's not fair, and you know it.
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
      - You: I'll be home more. I promise.
        - (the tree is cut here)
    - You: I'll be home more. I promise.
      - Robert Nixon: You said that last time.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: This job doesn't leave much time. You know that.
        - (the tree is cut here)
- You ★: I'll be home more. I promise.
  - Robert Nixon: Saying sorry isn't the same as being here.
  - You ★: This weekend is ours. No calls.
    - Robert Nixon: You said that last time.
    - You ★: This weekend is ours. No calls.
      - Robert Nixon: Saying sorry isn't the same as being here.
      - You ★: This weekend is ours. No calls.
        - Robert Nixon: You said that last time.
        - You ★: This weekend is ours. No calls.
          - Robert Nixon: You said that last time.
          - *Ends resolved*
        - You: I've let things slide at home. I know.
          - (the tree is cut here)
        - You: I'm doing this for us, too.
          - (the tree is cut here)
      - You: You're right. I'm sorry.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
    - You: You're right. I'm sorry.
      - Robert Nixon: You said that last time.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
    - You: I'm doing this for us, too.
      - Robert Nixon: Don't put this on me.
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: This job doesn't leave much time. You know that.
        - (the tree is cut here)
      - You: I'll be home more. I promise.
        - (the tree is cut here)
  - You: You're right. I'm sorry.
    - Robert Nixon: You said that last time.
    - You: This weekend is ours. No calls.
      - Robert Nixon: You said that last time.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
    - You: I've let things slide at home. I know.
      - Robert Nixon: Saying sorry isn't the same as being here.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: You're right. I'm sorry.
        - (the tree is cut here)
      - You: This job doesn't leave much time. You know that.
        - (the tree is cut here)
    - You: I'm doing this for us, too.
      - Robert Nixon: Don't put this on me.
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: This job doesn't leave much time. You know that.
        - (the tree is cut here)
      - You: I'll be home more. I promise.
        - (the tree is cut here)
  - You: This job doesn't leave much time. You know that.
    - Robert Nixon: Don't put this on me.
    - You: I've let things slide at home. I know.
      - Robert Nixon: You said that last time.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: You're right. I'm sorry.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
    - You: I'm doing this for us, too.
      - Robert Nixon: That's not fair, and you know it.
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
      - You: I'll be home more. I promise.
        - (the tree is cut here)
    - You: I'll be home more. I promise.
      - Robert Nixon: You said that last time.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
- You: Can we not do this tonight?
  - Robert Nixon: We miss you. That's all.
  - You: This weekend is ours. No calls.
    - Robert Nixon: Saying sorry isn't the same as being here.
    - You: This weekend is ours. No calls.
      - Robert Nixon: You said that last time.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: You're right. I'm sorry.
        - (the tree is cut here)
      - You: This job doesn't leave much time. You know that.
        - (the tree is cut here)
    - You: You're right. I'm sorry.
      - Robert Nixon: You said that last time.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
    - You: I'm doing this for us, too.
      - Robert Nixon: That's not fair, and you know it.
      - You: You're right. I'm sorry.
        - (the tree is cut here)
      - You: This job doesn't leave much time. You know that.
        - (the tree is cut here)
      - You: I'll be home more. I promise.
        - (the tree is cut here)
  - You: You're right. I'm sorry.
    - Robert Nixon: You said that last time.
    - You: This weekend is ours. No calls.
      - Robert Nixon: Saying sorry isn't the same as being here.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
    - You: I've let things slide at home. I know.
      - Robert Nixon: Saying sorry isn't the same as being here.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
    - You: I'm doing this for us, too.
      - Robert Nixon: Don't put this on me.
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: This job doesn't leave much time. You know that.
        - (the tree is cut here)
      - You: I'll be home more. I promise.
        - (the tree is cut here)
  - You: It's just a busy stretch.
    - Robert Nixon: We miss you. That's all.
    - You: This weekend is ours. No calls.
      - Robert Nixon: You said that last time.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: You're right. I'm sorry.
        - (the tree is cut here)
      - You: This job doesn't leave much time. You know that.
        - (the tree is cut here)
    - You: I've let things slide at home. I know.
      - Robert Nixon: Saying sorry isn't the same as being here.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: You're right. I'm sorry.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
    - You: It's just a busy stretch.
      - Robert Nixon: We miss you. That's all.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: You're right. I'm sorry.
        - (the tree is cut here)
      - You: Can we not do this tonight?
        - (the tree is cut here)
- You: I'm doing this for us, too.
  - Robert Nixon: Don't put this on me.
  - You: You're right. I'm sorry.
    - Robert Nixon: You said that last time.
    - You: This weekend is ours. No calls.
      - Robert Nixon: Saying sorry isn't the same as being here.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: This job doesn't leave much time. You know that.
        - (the tree is cut here)
    - You: I've let things slide at home. I know.
      - Robert Nixon: Saying sorry isn't the same as being here.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: This job doesn't leave much time. You know that.
        - (the tree is cut here)
    - You: This job doesn't leave much time. You know that.
      - Robert Nixon: That's not fair, and you know it.
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
      - You: I'll be home more. I promise.
        - (the tree is cut here)
  - You: This job doesn't leave much time. You know that.
    - Robert Nixon: That's not fair, and you know it.
    - You: You're right. I'm sorry.
      - Robert Nixon: Saying sorry isn't the same as being here.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
    - You: I'm doing this for us, too.
      - Robert Nixon: That's not fair, and you know it.
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
      - You: I'll be home more. I promise.
        - (the tree is cut here)
    - You: I'll be home more. I promise.
      - Robert Nixon: Saying sorry isn't the same as being here.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
  - You: I'll be home more. I promise.
    - Robert Nixon: Saying sorry isn't the same as being here.
    - You: This weekend is ours. No calls.
      - Robert Nixon: You said that last time.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: You're right. I'm sorry.
        - (the tree is cut here)
      - You: This job doesn't leave much time. You know that.
        - (the tree is cut here)
    - You: You're right. I'm sorry.
      - Robert Nixon: You said that last time.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: This job doesn't leave much time. You know that.
        - (the tree is cut here)
    - You: This job doesn't leave much time. You know that.
      - Robert Nixon: That's not fair, and you know it.
      - You: You're right. I'm sorry.
        - (the tree is cut here)
      - You: I'm doing this for us, too.
        - (the tree is cut here)
      - You: I'll be home more. I promise.
        - (the tree is cut here)
- You: This is the last late night. I promise.
  - *if Robert Nixon knows:*
    - Robert Nixon: I called the office. There was no meeting.
    - You: You're right. I'm sorry.
      - Robert Nixon: Thank you for telling me.
      - You: I'll be home more. I promise.
        - *Ends resolved*
      - You: It's just a busy stretch.
        - (the tree is cut here)
    - You: It's just a busy stretch.
      - Robert Nixon: Saying sorry isn't the same as being here.
      - You: This weekend is ours. No calls.
        - (the tree is cut here)
      - You: I've let things slide at home. I know.
        - (the tree is cut here)
      - You: This job doesn't leave much time. You know that.
        - (the tree is cut here)
    - You: It was a late committee meeting. That's all.
      - *Ends open: Robert Nixon: We're not done talking about this.*
  - *if not:*
    - Robert Nixon: Okay. Come eat something.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/hurt/2w1s [scene-talk.open-greet.you-re-home]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.this-is-the-last-late-night-i-promise]; L61 follow/press/scene-talk/hurt/8w1s [scene-talk.follow-press.saying-sorry-isn-t-the-same-as-being-here]; L62 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L63 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L64 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L65 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]; L66 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L67 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L68 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L69 follow/press/scene-talk/hurt/8w1s [scene-talk.follow-press.saying-sorry-isn-t-the-same-as-being-here]; L70 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L71 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L72 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L73 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]; L74 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L75 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L76 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L77 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]</sub>

**Profile cold** (outcome resolved)

**Robert Nixon:** Oh. You're back.

**Robert Nixon:** We hardly see you since you took office.

You could say:

1. You're right. I'm sorry.
2. I'll be home more. I promise.  *(the page follows this one)*
3. Can we not do this tonight?
4. I'm doing this for us, too.
5. This is the last late night. I promise.

**Robert Nixon:** Saying sorry isn't the same as being here.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. You're right. I'm sorry.
3. I'm doing this for us, too.

**Robert Nixon:** You said that last time.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. You're right. I'm sorry.
3. This job doesn't leave much time. You know that.

**Robert Nixon:** Saying sorry isn't the same as being here.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. You're right. I'm sorry.
3. This job doesn't leave much time. You know that.

**Robert Nixon:** You said that last time.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. I've let things slide at home. I know.
3. This job doesn't leave much time. You know that.

**Robert Nixon:** You said that last time.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.this-is-the-last-late-night-i-promise]; L61 follow/press/scene-talk/hurt/8w1s [scene-talk.follow-press.saying-sorry-isn-t-the-same-as-being-here]; L62 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L63 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L64 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L65 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]; L66 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L67 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L68 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L69 follow/press/scene-talk/hurt/8w1s [scene-talk.follow-press.saying-sorry-isn-t-the-same-as-being-here]; L70 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L71 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L72 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L73 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]; L74 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L75 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L76 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L77 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]</sub>

**Profile stubborn** (outcome resolved)

**Robert Nixon:** Oh. You're back.

**Robert Nixon:** We hardly see you since you took office.

You could say:

1. You're right. I'm sorry.
2. I'll be home more. I promise.  *(the page follows this one)*
3. It's just a busy stretch.
4. I'm doing this for us, too.
5. This is the last late night. I promise.

**Robert Nixon:** Saying sorry isn't the same as being here.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. You're right. I'm sorry.
3. I'm doing this for us, too.

**Robert Nixon:** You said that last time.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. You're right. I'm sorry.
3. I'm doing this for us, too.

**Robert Nixon:** Saying sorry isn't the same as being here.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. You're right. I'm sorry.
3. This job doesn't leave much time. You know that.

**Robert Nixon:** You said that last time.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. I've let things slide at home. I know.
3. I'm doing this for us, too.

**Robert Nixon:** You said that last time.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/guarded/3w2s [scene-talk.open-greet.oh-you-re-back]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/5w1s [scene-talk.reply-deflect.it-s-just-a-busy-stretch]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.this-is-the-last-late-night-i-promise]; L61 follow/press/scene-talk/hurt/8w1s [scene-talk.follow-press.saying-sorry-isn-t-the-same-as-being-here]; L62 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L63 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L64 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L65 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]; L66 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L67 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L68 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L69 follow/press/scene-talk/hurt/8w1s [scene-talk.follow-press.saying-sorry-isn-t-the-same-as-being-here]; L70 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L71 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L72 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L73 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]; L74 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L75 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L76 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L77 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]</sub>

**Profile anxious** (outcome resolved)

**Robert Nixon:** You're home.

**Robert Nixon:** We hardly see you since you took office.

You could say:

1. You're right. I'm sorry.
2. I'll be home more. I promise.  *(the page follows this one)*
3. Can we not do this tonight?
4. I'm doing this for us, too.
5. It was a late committee meeting. That's all.

**Robert Nixon:** Saying sorry isn't the same as being here.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. You're right. I'm sorry.
3. I'm doing this for us, too.

**Robert Nixon:** You said that last time.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. You're right. I'm sorry.
3. I'm doing this for us, too.

**Robert Nixon:** Saying sorry isn't the same as being here.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. You're right. I'm sorry.
3. I'm doing this for us, too.

**Robert Nixon:** You said that last time.

You could say:

1. This weekend is ours. No calls.  *(the page follows this one)*
2. I've let things slide at home. I know.
3. I'm doing this for us, too.

**Robert Nixon:** You said that last time.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/hurt/2w1s [scene-talk.open-greet.you-re-home]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.it-was-a-late-committee-meeting-that-s-all]; L61 follow/press/scene-talk/hurt/8w1s [scene-talk.follow-press.saying-sorry-isn-t-the-same-as-being-here]; L62 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L63 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L64 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L65 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]; L66 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L67 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L68 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L69 follow/press/scene-talk/hurt/8w1s [scene-talk.follow-press.saying-sorry-isn-t-the-same-as-being-here]; L70 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L71 reply/apologize/scene-talk/contrite/4w2s [scene-talk.reply-apologize.you-re-right-i-m-sorry]; L72 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L73 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]; L74 reply/promise/scene-talk/tender/6w2s [scene-talk.reply-promise.this-weekend-is-ours-no-calls]; L75 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L76 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.i-m-doing-this-for-us-too]; L77 follow/press/scene-talk/hurt/5w1s [scene-talk.follow-press.you-said-that-last-time]</sub>

## Scene 32: rally-opponent (threat, ends in political) — proof scene

*Purpose rally-opponent. Records: filing:contest:seat:gus2025:101811:sheriff:0:2026-11-03:person_f9be8ef45e5d143f, official:term:seat:US-DE:treasurer:2026-10-12, person_f9be8ef45e5d143f.*

> Michael Norton is working the same crowd. Now Michael Norton is walking straight toward you.

**Profile warm** (outcome open)

**Michael Norton:** I didn't expect to see you here.

**Michael Norton:** Nice speech. Too bad none of it was true.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. People say a lot of things.
3. Say that on the debate stage.
4. Look at this crowd. People know where I stand.

**Michael Norton:** You'd better hope they don't look too closely.

You could say:

1. We'll let the voters decide that.  *(the page follows this one)*
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Michael Norton:** Say that to the voters.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. I've won tougher races than this one.
3. People say a lot of things.

**Michael Norton:** Keep telling yourself that.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. I've won tougher races than this one.
3. People say a lot of things.

**Michael Norton:** Say that to the voters.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Michael Norton:** Say that to the voters.

**Michael Norton:** See you on election day.

**The whole exchange** (61 nodes; endings: open; ★ is the branch this profile's traits lean toward):

- You ★: That's not true, and you know it.
  - Michael Norton: You'd better hope they don't look too closely.
  - You ★: We'll let the voters decide that.
    - Michael Norton: Say that to the voters.
    - You ★: That's not true, and you know it.
      - Michael Norton: Keep telling yourself that.
      - You ★: That's not true, and you know it.
        - Michael Norton: Say that to the voters.
        - You ★: That's not true, and you know it.
          - Michael Norton: Say that to the voters.
          - *Ends open: Michael Norton: See you on election day.*
        - You: Look at this crowd. People know where I stand.
          - (the tree is cut here)
        - You: People say a lot of things.
          - (the tree is cut here)
      - You: I've won tougher races than this one.
        - Michael Norton: Say that to the voters.
        - You: That's not true, and you know it.
          - (the tree is cut here)
        - You: Look at this crowd. People know where I stand.
          - (the tree is cut here)
        - You: People say a lot of things.
          - (the tree is cut here)
      - You: People say a lot of things.
        - Michael Norton: I've been here longer than you have.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: Say that on the debate stage.
          - (the tree is cut here)
        - You: I'm here to talk to voters, not to you.
          - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Michael Norton: Keep telling yourself that.
      - You: That's not true, and you know it.
        - Michael Norton: You'd better hope they don't look too closely.
        - You: That's not true, and you know it.
          - (the tree is cut here)
        - You: Look at this crowd. People know where I stand.
          - (the tree is cut here)
        - You: People say a lot of things.
          - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - Michael Norton: You'd better hope they don't look too closely.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: Look at this crowd. People know where I stand.
          - (the tree is cut here)
        - You: People say a lot of things.
          - (the tree is cut here)
      - You: People say a lot of things.
        - Michael Norton: I've been here longer than you have.
        - You: That's not true, and you know it.
          - (the tree is cut here)
        - You: You're the one who has to explain yourself.
          - (the tree is cut here)
        - You: I'm here to talk to voters, not to you.
          - (the tree is cut here)
    - You: People say a lot of things.
      - Michael Norton: Keep telling yourself that.
      - You: That's not true, and you know it.
        - Michael Norton: Say that to the voters.
        - You: That's not true, and you know it.
          - (the tree is cut here)
        - You: I've won tougher races than this one.
          - (the tree is cut here)
        - You: People say a lot of things.
          - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
  - You: Look at this crowd. People know where I stand.
    - Michael Norton: Say that to the voters.
    - You: We'll let the voters decide that.
      - Michael Norton: Keep telling yourself that.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Michael Norton: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
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
  - You: People say a lot of things.
    - Michael Norton: I've been here longer than you have.
    - You: We'll let the voters decide that.
      - Michael Norton: Say that to the voters.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: Say that on the debate stage.
      - Michael Norton: Say that to the voters.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: Enjoy the rally.
      - Michael Norton: Say that to the voters.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
- You: People say a lot of things.
  - Michael Norton: I've been here longer than you have.
  - You: That's not true, and you know it.
    - Michael Norton: Keep telling yourself that.
    - You: We'll let the voters decide that.
      - Michael Norton: You'd better hope they don't look too closely.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Michael Norton: You'd better hope they don't look too closely.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Michael Norton: Say that to the voters.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
  - You: You're the one who has to explain yourself.
    - Michael Norton: Say that to the voters.
    - You: That's not true, and you know it.
      - Michael Norton: You'd better hope they don't look too closely.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Michael Norton: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Michael Norton: I've been here longer than you have.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: Say that on the debate stage.
        - (the tree is cut here)
      - You: I'm here to talk to voters, not to you.
        - (the tree is cut here)
  - You: Enjoy the rally.
    - Michael Norton: Say that to the voters.
    - You: That's not true, and you know it.
      - Michael Norton: You'd better hope they don't look too closely.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: Look at this crowd. People know where I stand.
      - Michael Norton: You'd better hope they don't look too closely.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Michael Norton: I've been here longer than you have.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: Say that on the debate stage.
        - (the tree is cut here)
      - You: I'm here to talk to voters, not to you.
        - (the tree is cut here)
- You: Say that on the debate stage.
  - Michael Norton: I've been here longer than you have.
  - You: That's not true, and you know it.
    - Michael Norton: You'd better hope they don't look too closely.
    - You: We'll let the voters decide that.
      - Michael Norton: Say that to the voters.
      - You: That's not true, and you know it.
        - (the tree is cut here)
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
      - You: Say that on the debate stage.
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
      - You: Enjoy the rally.
        - (the tree is cut here)
- You: Look at this crowd. People know where I stand.
  - Michael Norton: Say that to the voters.
  - You: That's not true, and you know it.
    - Michael Norton: You'd better hope they don't look too closely.
    - You: We'll let the voters decide that.
      - Michael Norton: Keep telling yourself that.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Michael Norton: Keep telling yourself that.
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
  - You: I've won tougher races than this one.
    - Michael Norton: You'd better hope they don't look too closely.
    - You: That's not true, and you know it.
      - Michael Norton: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: Look at this crowd. People know where I stand.
      - Michael Norton: Keep telling yourself that.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Michael Norton: Keep telling yourself that.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
  - You: People say a lot of things.
    - Michael Norton: I've been here longer than you have.
    - You: That's not true, and you know it.
      - Michael Norton: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
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

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/9w2s [scene-talk.state-confront.nice-speech-too-bad-none-of-it-was-true]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L8 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L11 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L12 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L13 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L14 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L15 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L16 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L17 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L18 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L19 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L20 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L21 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L22 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L23 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L24 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L25 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

**Profile cold** (outcome open)

**Michael Norton:** Well, look who it is.

**Michael Norton:** People here know your record.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. People say a lot of things.
3. Say that on the debate stage.
4. Look at this crowd. People know where I stand.

**Michael Norton:** Keep telling yourself that.

You could say:

1. We'll let the voters decide that.  *(the page follows this one)*
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Michael Norton:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. I've won tougher races than this one.
3. People say a lot of things.

**Michael Norton:** Say that to the voters.

You could say:

1. We'll let the voters decide that.  *(the page follows this one)*
2. I've won tougher races than this one.
3. People say a lot of things.

**Michael Norton:** Keep telling yourself that.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Michael Norton:** Keep telling yourself that.

**Michael Norton:** This isn't over.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L8 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L11 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L12 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L13 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L14 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L15 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L16 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L17 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L18 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L19 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L20 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L21 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L22 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L23 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L24 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L25 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

**Profile stubborn** (outcome open)

**Michael Norton:** Well, look who it is.

**Michael Norton:** People here know your record.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. People say a lot of things.
3. You're the one who has to explain yourself.
4. Look at this crowd. People know where I stand.

**Michael Norton:** You'd better hope they don't look too closely.

You could say:

1. We'll let the voters decide that.  *(the page follows this one)*
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Michael Norton:** Say that to the voters.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. I've won tougher races than this one.
3. People say a lot of things.

**Michael Norton:** Keep telling yourself that.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. I've won tougher races than this one.
3. People say a lot of things.

**Michael Norton:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Michael Norton:** Say that to the voters.

**Michael Norton:** This isn't over.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L8 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L11 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L12 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L13 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L14 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L15 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L16 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L17 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L18 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L19 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L20 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L21 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L22 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L23 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L24 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L25 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

**Profile anxious** (outcome open)

**Michael Norton:** I didn't expect to see you here.

**Michael Norton:** Nice speech. Too bad none of it was true.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. People say a lot of things.
3. Say that on the debate stage.
4. Look at this crowd. People know where I stand.

**Michael Norton:** Say that to the voters.

You could say:

1. We'll let the voters decide that.  *(the page follows this one)*
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Michael Norton:** Keep telling yourself that.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. I've won tougher races than this one.
3. People say a lot of things.

**Michael Norton:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. I've won tougher races than this one.
3. People say a lot of things.

**Michael Norton:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Michael Norton:** Keep telling yourself that.

**Michael Norton:** See you on election day.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/9w2s [scene-talk.state-confront.nice-speech-too-bad-none-of-it-was-true]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L8 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L11 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L12 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L13 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L14 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L15 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L16 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L17 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L18 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L19 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L20 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L21 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L22 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L23 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L24 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L25 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

## Scene 33: rally-opponent (threat, ends in political) — proof scene

*Purpose rally-opponent. Records: filing:contest:seat:US-DE:attorney-general:2026-11-03:official:term:seat:US-DE:upper:021:0:2026-10-12, official:term:seat:US-DE:attorney-general:2026-10-12, official:term:seat:US-DE:upper:021:0:2026-10-12.*

> You're shaking hands by the stage when Julie Villegas cuts through the line.

**Profile warm** (outcome open)

**Julie Villegas:** Well, look who it is.

**Julie Villegas:** You can't win this, you know.

You could say:

1. We'll let the voters decide that.
2. People say a lot of things.
3. Say that on the debate stage.
4. Look at this crowd. People know where I stand.  *(the page follows this one)*

**Julie Villegas:** Say that to the voters.

You could say:

1. That's not true, and you know it.
2. I've won tougher races than this one.  *(the page follows this one)*
3. People say a lot of things.

**Julie Villegas:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it.
2. I've won tougher races than this one.  *(the page follows this one)*
3. People say a lot of things.

**Julie Villegas:** Keep telling yourself that.

You could say:

1. That's not true, and you know it.
2. I've won tougher races than this one.  *(the page follows this one)*
3. People say a lot of things.

**Julie Villegas:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it.
2. Look at this crowd. People know where I stand.  *(the page follows this one)*
3. People say a lot of things.

**Julie Villegas:** You'd better hope they don't look too closely.

**Julie Villegas:** This isn't over.

**The whole exchange** (62 nodes; endings: open; ★ is the branch this profile's traits lean toward):

- You: We'll let the voters decide that.
  - Julie Villegas: You'd better hope they don't look too closely.
  - You: That's not true, and you know it.
    - Julie Villegas: Say that to the voters.
    - You: We'll let the voters decide that.
      - Julie Villegas: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - Julie Villegas: You'd better hope they don't look too closely.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: I've won tougher races than this one.
          - (the tree is cut here)
        - You: People say a lot of things.
          - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - Julie Villegas: Keep telling yourself that.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: I've won tougher races than this one.
          - (the tree is cut here)
        - You: People say a lot of things.
          - (the tree is cut here)
      - You: People say a lot of things.
        - Julie Villegas: Say that to the voters.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: Look at this crowd. People know where I stand.
          - (the tree is cut here)
        - You: People say a lot of things.
          - (the tree is cut here)
    - You: Look at this crowd. People know where I stand.
      - Julie Villegas: Keep telling yourself that.
      - You: That's not true, and you know it.
        - Julie Villegas: You'd better hope they don't look too closely.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: I've won tougher races than this one.
          - (the tree is cut here)
        - You: People say a lot of things.
          - (the tree is cut here)
      - You: I've won tougher races than this one.
        - Julie Villegas: You'd better hope they don't look too closely.
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
    - You: People say a lot of things.
      - Julie Villegas: Keep telling yourself that.
      - You: That's not true, and you know it.
        - Julie Villegas: Say that to the voters.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: Look at this crowd. People know where I stand.
          - (the tree is cut here)
        - You: People say a lot of things.
          - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
  - You: I've won tougher races than this one.
    - Julie Villegas: Say that to the voters.
    - You: That's not true, and you know it.
      - Julie Villegas: Keep telling yourself that.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: Look at this crowd. People know where I stand.
      - Julie Villegas: Keep telling yourself that.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Julie Villegas: Keep telling yourself that.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
  - You: People say a lot of things.
    - Julie Villegas: Say that to the voters.
    - You: That's not true, and you know it.
      - Julie Villegas: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Julie Villegas: Keep telling yourself that.
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
      - You: I'm here to talk to voters, not to you.
        - (the tree is cut here)
- You: People say a lot of things.
  - Julie Villegas: You'd better hope they don't look too closely.
  - You: That's not true, and you know it.
    - Julie Villegas: Say that to the voters.
    - You: We'll let the voters decide that.
      - Julie Villegas: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Julie Villegas: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
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
  - You: I've won tougher races than this one.
    - Julie Villegas: Say that to the voters.
    - You: We'll let the voters decide that.
      - Julie Villegas: Keep telling yourself that.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: Look at this crowd. People know where I stand.
      - Julie Villegas: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
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
  - You: People say a lot of things.
    - Julie Villegas: Keep telling yourself that.
    - You: That's not true, and you know it.
      - Julie Villegas: Say that to the voters.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Julie Villegas: Say that to the voters.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Julie Villegas: I've been here longer than you have.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: Say that on the debate stage.
        - (the tree is cut here)
      - You: I'm here to talk to voters, not to you.
        - (the tree is cut here)
- You: Say that on the debate stage.
  - Julie Villegas: I've been here longer than you have.
  - You: We'll let the voters decide that.
    - Julie Villegas: You'd better hope they don't look too closely.
    - You: That's not true, and you know it.
      - Julie Villegas: Say that to the voters.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
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
      - You: Say that on the debate stage.
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
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Julie Villegas: You'd better hope they don't look too closely.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
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
    - You: That's not true, and you know it.
      - Julie Villegas: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You ★: I've won tougher races than this one.
      - Julie Villegas: Keep telling yourself that.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You ★: I've won tougher races than this one.
        - Julie Villegas: You'd better hope they don't look too closely.
        - You: That's not true, and you know it.
          - (the tree is cut here)
        - You ★: Look at this crowd. People know where I stand.
          - Julie Villegas: You'd better hope they don't look too closely.
          - *Ends open: Julie Villegas: This isn't over.*
        - You: People say a lot of things.
          - (the tree is cut here)
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
      - You: People say a lot of things.
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

<sub>L1 narrate/narrate/scene-talk/braced/13w1s [scene-talk.narrate-narrate.you-re-shaking-hands-by-the-stage-when-name-cuts-through-the-line]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/6w1s [scene-talk.state-confront.you-can-t-win-this-you-know]; L4 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L192 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L193 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L194 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L195 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L212 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L213 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L214 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L215 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L220 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L221 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L222 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L223 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L224 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L225 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L226 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L227 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L228 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L229 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

**Profile cold** (outcome open)

**Julie Villegas:** Well, look who it is.

**Julie Villegas:** You can't win this, you know.

You could say:

1. That's not true, and you know it.
2. People say a lot of things.
3. Say that on the debate stage.  *(the page follows this one)*
4. Look at this crowd. People know where I stand.

**Julie Villegas:** I've been here longer than you have.

You could say:

1. We'll let the voters decide that.
2. You're the one who has to explain yourself.  *(the page follows this one)*
3. I'm here to talk to voters, not to you.

**Julie Villegas:** Say that to the voters.

You could say:

1. We'll let the voters decide that.  *(the page follows this one)*
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Julie Villegas:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. I've won tougher races than this one.
3. People say a lot of things.

**Julie Villegas:** Keep telling yourself that.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. I've won tougher races than this one.
3. People say a lot of things.

**Julie Villegas:** Keep telling yourself that.

**Julie Villegas:** This isn't over.

<sub>L1 narrate/narrate/scene-talk/braced/13w1s [scene-talk.narrate-narrate.you-re-shaking-hands-by-the-stage-when-name-cuts-through-the-line]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/6w1s [scene-talk.state-confront.you-can-t-win-this-you-know]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L140 follow/boast/scene-talk/proud/7w1s [scene-talk.follow-boast.i-ve-been-here-longer-than-you-have]; L141 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L142 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L143 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L160 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L161 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L162 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L163 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L164 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L165 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L166 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L167 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L168 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L169 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L170 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L171 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L172 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L173 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

**Profile stubborn** (outcome open)

**Julie Villegas:** Well, look who it is.

**Julie Villegas:** People here know your record.

You could say:

1. That's not true, and you know it.
2. People say a lot of things.
3. Say that on the debate stage.  *(the page follows this one)*
4. Look at this crowd. People know where I stand.

**Julie Villegas:** I've been here longer than you have.

You could say:

1. That's not true, and you know it.
2. You're the one who has to explain yourself.  *(the page follows this one)*
3. I'm here to talk to voters, not to you.

**Julie Villegas:** Keep telling yourself that.

You could say:

1. We'll let the voters decide that.  *(the page follows this one)*
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Julie Villegas:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. I've won tougher races than this one.
3. People say a lot of things.

**Julie Villegas:** Say that to the voters.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. I've won tougher races than this one.
3. People say a lot of things.

**Julie Villegas:** You'd better hope they don't look too closely.

**Julie Villegas:** This isn't over.

<sub>L1 narrate/narrate/scene-talk/braced/13w1s [scene-talk.narrate-narrate.you-re-shaking-hands-by-the-stage-when-name-cuts-through-the-line]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L140 follow/boast/scene-talk/proud/7w1s [scene-talk.follow-boast.i-ve-been-here-longer-than-you-have]; L141 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L142 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L143 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L160 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L161 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L162 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L163 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L164 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L165 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L166 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L167 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L168 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L169 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L170 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L171 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L172 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L173 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

**Profile anxious** (outcome open)

**Julie Villegas:** Well, look who it is.

**Julie Villegas:** You can't win this, you know.

You could say:

1. That's not true, and you know it.
2. People say a lot of things.  *(the page follows this one)*
3. Say that on the debate stage.
4. Look at this crowd. People know where I stand.

**Julie Villegas:** Keep telling yourself that.

You could say:

1. That's not true, and you know it.
2. I've won tougher races than this one.
3. People say a lot of things.  *(the page follows this one)*

**Julie Villegas:** Say that to the voters.

You could say:

1. We'll let the voters decide that.
2. I've won tougher races than this one.
3. People say a lot of things.  *(the page follows this one)*

**Julie Villegas:** I've been here longer than you have.

You could say:

1. That's not true, and you know it.
2. Say that on the debate stage.
3. I'm here to talk to voters, not to you.  *(the page follows this one)*

**Julie Villegas:** I've been here longer than you have.

You could say:

1. That's not true, and you know it.
2. You're the one who has to explain yourself.
3. Enjoy the rally.  *(the page follows this one)*

**Julie Villegas:** I've been here longer than you have.

**Julie Villegas:** This isn't over.

<sub>L1 narrate/narrate/scene-talk/braced/13w1s [scene-talk.narrate-narrate.you-re-shaking-hands-by-the-stage-when-name-cuts-through-the-line]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/6w1s [scene-talk.state-confront.you-can-t-win-this-you-know]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L88 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L89 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L90 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L91 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L124 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L125 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L126 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L127 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L136 follow/boast/scene-talk/proud/7w1s [scene-talk.follow-boast.i-ve-been-here-longer-than-you-have]; L137 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L138 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L139 reply/deflect/scene-talk/guarded/9w1s [scene-talk.reply-deflect.i-m-here-to-talk-to-voters-not-to-you]; L140 follow/boast/scene-talk/proud/7w1s [scene-talk.follow-boast.i-ve-been-here-longer-than-you-have]; L141 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L142 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L143 reply/deflect/scene-talk/guarded/3w1s [scene-talk.reply-deflect.enjoy-the-rally]; L144 follow/boast/scene-talk/proud/7w1s [scene-talk.follow-boast.i-ve-been-here-longer-than-you-have]; L145 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

**Profile boastful** (outcome open)

**Julie Villegas:** Well, look who it is.

**Julie Villegas:** You can't win this, you know.

You could say:

1. We'll let the voters decide that.
2. People say a lot of things.
3. Say that on the debate stage.
4. Look at this crowd. People know where I stand.  *(the page follows this one)*

**Julie Villegas:** Keep telling yourself that.

You could say:

1. That's not true, and you know it.
2. I've won tougher races than this one.  *(the page follows this one)*
3. People say a lot of things.

**Julie Villegas:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it.
2. I've won tougher races than this one.  *(the page follows this one)*
3. People say a lot of things.

**Julie Villegas:** Say that to the voters.

You could say:

1. That's not true, and you know it.
2. I've won tougher races than this one.  *(the page follows this one)*
3. People say a lot of things.

**Julie Villegas:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it.
2. Look at this crowd. People know where I stand.  *(the page follows this one)*
3. People say a lot of things.

**Julie Villegas:** Say that to the voters.

**Julie Villegas:** This isn't over.

<sub>L1 narrate/narrate/scene-talk/braced/13w1s [scene-talk.narrate-narrate.you-re-shaking-hands-by-the-stage-when-name-cuts-through-the-line]; L2 open/greet/scene-talk/braced/5w1s [scene-talk.open-greet.well-look-who-it-is]; L3 state/confront/scene-talk/braced/6w1s [scene-talk.state-confront.you-can-t-win-this-you-know]; L4 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L192 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L193 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L194 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L195 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L212 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L213 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L214 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L215 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L220 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L221 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L222 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L223 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L224 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L225 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L226 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L227 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L228 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L229 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

## Scene 34: rally-opponent (threat, ends in political) — proof scene

*Purpose rally-opponent. Records: filing:contest:seat:US-DE:treasurer:2026-11-03:official:term:seat:US-DE:treasurer:2026-10-12, official:term:seat:US-DE:upper:015:0:2026-10-12, official:term:seat:US-DE:treasurer:2026-10-12.*

> Brittany Tucker is working the same crowd. Now Brittany Tucker is walking straight toward you.

**Profile warm** (outcome open)

**Brittany Tucker:** I didn't expect to see you here.

**Brittany Tucker:** People here know your record.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. People say a lot of things.
3. Say that on the debate stage.
4. I've won tougher races than this one.

**Brittany Tucker:** Say that to the voters.

You could say:

1. We'll let the voters decide that.  *(the page follows this one)*
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Brittany Tucker:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Brittany Tucker:** Keep telling yourself that.

You could say:

1. We'll let the voters decide that.  *(the page follows this one)*
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Brittany Tucker:** You'd better hope they don't look too closely.

You could say:

1. We'll let the voters decide that.  *(the page follows this one)*
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Brittany Tucker:** Say that to the voters.

**Brittany Tucker:** This isn't over.

**The whole exchange** (61 nodes; endings: open; ★ is the branch this profile's traits lean toward):

- You ★: That's not true, and you know it.
  - Brittany Tucker: Say that to the voters.
  - You ★: We'll let the voters decide that.
    - Brittany Tucker: You'd better hope they don't look too closely.
    - You ★: That's not true, and you know it.
      - Brittany Tucker: Keep telling yourself that.
      - You ★: We'll let the voters decide that.
        - Brittany Tucker: You'd better hope they don't look too closely.
        - You ★: We'll let the voters decide that.
          - Brittany Tucker: Say that to the voters.
          - *Ends open: Brittany Tucker: This isn't over.*
        - You: Look at this crowd. People know where I stand.
          - (the tree is cut here)
        - You: People say a lot of things.
          - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - Brittany Tucker: You'd better hope they don't look too closely.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: I've won tougher races than this one.
          - (the tree is cut here)
        - You: People say a lot of things.
          - (the tree is cut here)
      - You: People say a lot of things.
        - Brittany Tucker: You'd better hope they don't look too closely.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: I've won tougher races than this one.
          - (the tree is cut here)
        - You: People say a lot of things.
          - (the tree is cut here)
    - You: Look at this crowd. People know where I stand.
      - Brittany Tucker: Keep telling yourself that.
      - You: That's not true, and you know it.
        - Brittany Tucker: Say that to the voters.
        - You: That's not true, and you know it.
          - (the tree is cut here)
        - You: I've won tougher races than this one.
          - (the tree is cut here)
        - You: People say a lot of things.
          - (the tree is cut here)
      - You: I've won tougher races than this one.
        - Brittany Tucker: Say that to the voters.
        - You: That's not true, and you know it.
          - (the tree is cut here)
        - You: I've won tougher races than this one.
          - (the tree is cut here)
        - You: People say a lot of things.
          - (the tree is cut here)
      - You: People say a lot of things.
        - Brittany Tucker: Say that to the voters.
        - You: That's not true, and you know it.
          - (the tree is cut here)
        - You: I've won tougher races than this one.
          - (the tree is cut here)
        - You: People say a lot of things.
          - (the tree is cut here)
    - You: People say a lot of things.
      - Brittany Tucker: Keep telling yourself that.
      - You: That's not true, and you know it.
        - Brittany Tucker: Say that to the voters.
        - You: We'll let the voters decide that.
          - (the tree is cut here)
        - You: Look at this crowd. People know where I stand.
          - (the tree is cut here)
        - You: People say a lot of things.
          - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
  - You: Look at this crowd. People know where I stand.
    - Brittany Tucker: You'd better hope they don't look too closely.
    - You: We'll let the voters decide that.
      - Brittany Tucker: Keep telling yourself that.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Brittany Tucker: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Brittany Tucker: I've been here longer than you have.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: You're the one who has to explain yourself.
        - (the tree is cut here)
      - You: I'm here to talk to voters, not to you.
        - (the tree is cut here)
  - You: People say a lot of things.
    - Brittany Tucker: I've been here longer than you have.
    - You: We'll let the voters decide that.
      - Brittany Tucker: You'd better hope they don't look too closely.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: You're the one who has to explain yourself.
      - Brittany Tucker: I've been here longer than you have.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Say that on the debate stage.
        - (the tree is cut here)
      - You: Enjoy the rally.
        - (the tree is cut here)
    - You: I'm here to talk to voters, not to you.
      - Brittany Tucker: I've been here longer than you have.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: You're the one who has to explain yourself.
        - (the tree is cut here)
      - You: Enjoy the rally.
        - (the tree is cut here)
- You: People say a lot of things.
  - Brittany Tucker: Say that to the voters.
  - You: We'll let the voters decide that.
    - Brittany Tucker: Keep telling yourself that.
    - You: That's not true, and you know it.
      - Brittany Tucker: You'd better hope they don't look too closely.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Brittany Tucker: You'd better hope they don't look too closely.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Brittany Tucker: You'd better hope they don't look too closely.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
  - You: Look at this crowd. People know where I stand.
    - Brittany Tucker: You'd better hope they don't look too closely.
    - You: That's not true, and you know it.
      - Brittany Tucker: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Brittany Tucker: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Brittany Tucker: I've been here longer than you have.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: You're the one who has to explain yourself.
        - (the tree is cut here)
      - You: I'm here to talk to voters, not to you.
        - (the tree is cut here)
  - You: People say a lot of things.
    - Brittany Tucker: Keep telling yourself that.
    - You: We'll let the voters decide that.
      - Brittany Tucker: You'd better hope they don't look too closely.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: Look at this crowd. People know where I stand.
      - Brittany Tucker: You'd better hope they don't look too closely.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Brittany Tucker: You'd better hope they don't look too closely.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
- You: Say that on the debate stage.
  - Brittany Tucker: I've been here longer than you have.
  - You: That's not true, and you know it.
    - Brittany Tucker: You'd better hope they don't look too closely.
    - You: We'll let the voters decide that.
      - Brittany Tucker: Say that to the voters.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
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
      - You: People say a lot of things.
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
      - You: People say a lot of things.
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
      - You: People say a lot of things.
        - (the tree is cut here)
- You: I've won tougher races than this one.
  - Brittany Tucker: You'd better hope they don't look too closely.
  - You: That's not true, and you know it.
    - Brittany Tucker: Say that to the voters.
    - You: We'll let the voters decide that.
      - Brittany Tucker: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: Look at this crowd. People know where I stand.
      - Brittany Tucker: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Brittany Tucker: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
  - You: Look at this crowd. People know where I stand.
    - Brittany Tucker: Say that to the voters.
    - You: That's not true, and you know it.
      - Brittany Tucker: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: I've won tougher races than this one.
      - Brittany Tucker: Keep telling yourself that.
      - You: That's not true, and you know it.
        - (the tree is cut here)
      - You: I've won tougher races than this one.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: People say a lot of things.
      - Brittany Tucker: Keep telling yourself that.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
  - You: People say a lot of things.
    - Brittany Tucker: I've been here longer than you have.
    - You: That's not true, and you know it.
      - Brittany Tucker: Say that to the voters.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: You're the one who has to explain yourself.
      - Brittany Tucker: Say that to the voters.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)
    - You: Enjoy the rally.
      - Brittany Tucker: Say that to the voters.
      - You: We'll let the voters decide that.
        - (the tree is cut here)
      - You: Look at this crowd. People know where I stand.
        - (the tree is cut here)
      - You: People say a lot of things.
        - (the tree is cut here)

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L8 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L11 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L12 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L13 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L14 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L15 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L16 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L17 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L18 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L19 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L20 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L21 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L22 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L23 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L24 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L25 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

**Profile cold** (outcome open)

**Brittany Tucker:** I didn't expect to see you here.

**Brittany Tucker:** People here know your record.

You could say:

1. That's not true, and you know it.
2. People say a lot of things.  *(the page follows this one)*
3. Say that on the debate stage.
4. I've won tougher races than this one.

**Brittany Tucker:** You'd better hope they don't look too closely.

You could say:

1. We'll let the voters decide that.
2. Look at this crowd. People know where I stand.
3. People say a lot of things.  *(the page follows this one)*

**Brittany Tucker:** Keep telling yourself that.

You could say:

1. That's not true, and you know it.
2. Look at this crowd. People know where I stand.
3. People say a lot of things.  *(the page follows this one)*

**Brittany Tucker:** Say that to the voters.

You could say:

1. We'll let the voters decide that.
2. I've won tougher races than this one.
3. People say a lot of things.  *(the page follows this one)*

**Brittany Tucker:** Say that to the voters.

You could say:

1. That's not true, and you know it.
2. I've won tougher races than this one.
3. People say a lot of things.  *(the page follows this one)*

**Brittany Tucker:** Keep telling yourself that.

**Brittany Tucker:** See you on election day.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L88 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L89 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L90 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L91 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L124 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L125 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L126 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L127 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L136 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L137 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L138 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L139 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L140 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L141 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L142 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L143 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L144 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L145 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

**Profile stubborn** (outcome open)

**Brittany Tucker:** I didn't expect to see you here.

**Brittany Tucker:** People here know your record.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. People say a lot of things.
3. You're the one who has to explain yourself.
4. I've won tougher races than this one.

**Brittany Tucker:** You'd better hope they don't look too closely.

You could say:

1. We'll let the voters decide that.  *(the page follows this one)*
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Brittany Tucker:** Say that to the voters.

You could say:

1. We'll let the voters decide that.  *(the page follows this one)*
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Brittany Tucker:** Keep telling yourself that.

You could say:

1. We'll let the voters decide that.  *(the page follows this one)*
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Brittany Tucker:** Say that to the voters.

You could say:

1. That's not true, and you know it.  *(the page follows this one)*
2. Look at this crowd. People know where I stand.
3. People say a lot of things.

**Brittany Tucker:** You'd better hope they don't look too closely.

**Brittany Tucker:** This isn't over.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/8w1s [scene-talk.reply-confront.you-re-the-one-who-has-to-explain-yourself]; L7 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L8 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L9 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L10 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L11 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L12 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L13 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L14 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L15 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L16 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L17 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L18 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L19 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L20 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L21 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L22 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L23 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L24 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L25 close/warn/scene-talk/braced/3w1s [scene-talk.close-warn.this-isn-t-over]</sub>

**Profile anxious** (outcome open)

**Brittany Tucker:** I didn't expect to see you here.

**Brittany Tucker:** People here know your record.

You could say:

1. That's not true, and you know it.
2. People say a lot of things.  *(the page follows this one)*
3. Say that on the debate stage.
4. I've won tougher races than this one.

**Brittany Tucker:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it.
2. Look at this crowd. People know where I stand.
3. People say a lot of things.  *(the page follows this one)*

**Brittany Tucker:** Say that to the voters.

You could say:

1. That's not true, and you know it.
2. Look at this crowd. People know where I stand.
3. People say a lot of things.  *(the page follows this one)*

**Brittany Tucker:** Keep telling yourself that.

You could say:

1. That's not true, and you know it.
2. I've won tougher races than this one.
3. People say a lot of things.  *(the page follows this one)*

**Brittany Tucker:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it.
2. I've won tougher races than this one.
3. People say a lot of things.  *(the page follows this one)*

**Brittany Tucker:** Keep telling yourself that.

**Brittany Tucker:** See you on election day.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L88 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L89 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L90 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L91 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L124 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L125 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L126 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L127 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L136 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L137 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L138 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L139 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L140 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L141 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L142 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L143 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L144 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L145 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

**Profile boastful** (outcome open)

**Brittany Tucker:** I didn't expect to see you here.

**Brittany Tucker:** People here know your record.

You could say:

1. That's not true, and you know it.
2. People say a lot of things.
3. Say that on the debate stage.
4. I've won tougher races than this one.  *(the page follows this one)*

**Brittany Tucker:** Keep telling yourself that.

You could say:

1. That's not true, and you know it.
2. Look at this crowd. People know where I stand.  *(the page follows this one)*
3. People say a lot of things.

**Brittany Tucker:** You'd better hope they don't look too closely.

You could say:

1. That's not true, and you know it.
2. I've won tougher races than this one.  *(the page follows this one)*
3. People say a lot of things.

**Brittany Tucker:** Say that to the voters.

You could say:

1. That's not true, and you know it.
2. I've won tougher races than this one.  *(the page follows this one)*
3. People say a lot of things.

**Brittany Tucker:** You'd better hope they don't look too closely.

You could say:

1. We'll let the voters decide that.
2. Look at this crowd. People know where I stand.  *(the page follows this one)*
3. People say a lot of things.

**Brittany Tucker:** You'd better hope they don't look too closely.

**Brittany Tucker:** See you on election day.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/5w1s [scene-talk.state-confront.people-here-know-your-record]; L4 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L192 follow/confront/scene-talk/guarded/4w1s [scene-talk.follow-confront.keep-telling-yourself-that]; L193 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L194 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L195 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L212 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L213 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L214 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L215 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L220 follow/confront/scene-talk/braced/5w1s [scene-talk.follow-confront.say-that-to-the-voters]; L221 reply/disagree/scene-talk/braced/7w1s [scene-talk.reply-disagree.that-s-not-true-and-you-know-it]; L222 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.i-ve-won-tougher-races-than-this-one]; L223 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L224 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L225 reply/disagree/scene-talk/calm/6w1s [scene-talk.reply-disagree.we-ll-let-the-voters-decide-that]; L226 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L227 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L228 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L229 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

## Scene 35: desk-bill (vote-wanted, ends in bill) — proof scene

*Purpose desk-bill. Records: desk:bill:office:US-DE:legislature-upper:2027-01-12:official:term:seat:US-DE:upper:002:0:2026-10-12:5, bill:office:US-DE:legislature-upper:2027-01-12:official:term:seat:US-DE:upper:002:0:2026-10-12:5, staffer:official:term:seat:US-DE:governor:2026-10-12:person:aide:official:term:seat:US-DE:governor:2026-10-12:0, official:term:seat:US-DE:governor:2026-10-12.*

> Jamie Moreno sets "Right to counsel in eviction" on your desk. You can sign it or veto it.

**Profile warm** (outcome open)

**Jamie Moreno:** This one's waiting on you.

**Jamie Moreno:** "Right to counsel in eviction" passed. It needs your signature.

You could say:

1. It's a good bill. I'll sign it today.
2. I won't sign it as it is.
3. What's in it?  *(the page follows this one)*
4. I want to sleep on it.

**Jamie Moreno:** The file has everything. I'll leave it with you.

You could say:

1. It's a good bill. I'll sign it today.
2. I won't sign it as it is.
3. Who voted against it?  *(the page follows this one)*
4. I want to sleep on it.

**Jamie Moreno:** It's all in the vote record.

You could say:

1. I'll sign it.
2. I'm going to veto it.
3. What's in it?  *(the page follows this one)*
4. Let me read it tonight.

**Jamie Moreno:** The file has everything. I'll leave it with you.

You could say:

1. It's a good bill. I'll sign it today.
2. I'm going to veto it.
3. What's in it?  *(the page follows this one)*
4. I want to sleep on it.

**Jamie Moreno:** The file has everything. I'll leave it with you.

You could say:

1. I'll sign it.
2. I won't sign it as it is.
3. Who voted against it?  *(the page follows this one)*
4. I want to sleep on it.

**Jamie Moreno:** It's all in the vote record.

**Jamie Moreno:** Let me know when you've decided.

**The whole exchange** (29 nodes; endings: resolved, refused, resolved, refused, resolved, refused, resolved, refused, resolved, refused, open, open, resolved, refused, resolved, refused, resolved, refused, resolved, refused; ★ is the branch this profile's traits lean toward):

- You: It's a good bill. I'll sign it today.
  - Jamie Moreno: I'll send it to the clerk.
  - *Ends resolved*
- You: I won't sign it as it is.
  - Jamie Moreno: I'll send it to the clerk.
  - *Ends refused*
- You ★: What's in it?
  - Jamie Moreno: The file has everything. I'll leave it with you.
  - You: It's a good bill. I'll sign it today.
    - Jamie Moreno: I'll get the veto message drafted.
    - *Ends resolved*
  - You: I won't sign it as it is.
    - Jamie Moreno: I'll send it to the clerk.
    - *Ends refused*
  - You ★: Who voted against it?
    - Jamie Moreno: It's all in the vote record.
    - You: I'll sign it.
      - Jamie Moreno: I'll get the veto message drafted.
      - *Ends resolved*
    - You: I'm going to veto it.
      - Jamie Moreno: I'll send it to the clerk.
      - *Ends refused*
    - You ★: What's in it?
      - Jamie Moreno: The file has everything. I'll leave it with you.
      - You: It's a good bill. I'll sign it today.
        - Jamie Moreno: I'll send it to the clerk.
        - *Ends resolved*
      - You: I'm going to veto it.
        - Jamie Moreno: I'll send it to the clerk.
        - *Ends refused*
      - You ★: What's in it?
        - Jamie Moreno: The file has everything. I'll leave it with you.
        - You: I'll sign it.
          - Jamie Moreno: I'll send it to the clerk.
          - *Ends resolved*
        - You: I won't sign it as it is.
          - Jamie Moreno: I'll get the veto message drafted.
          - *Ends refused*
        - You ★: Who voted against it?
          - Jamie Moreno: It's all in the vote record.
          - *Ends open: Jamie Moreno: Let me know when you've decided.*
        - You: I want to sleep on it.
          - Jamie Moreno: The council's going to ask what you decided.
          - *Ends open*
      - You: I want to sleep on it.
        - Jamie Moreno: The council's going to ask what you decided.
        - You: It's a good bill. I'll sign it today.
          - Jamie Moreno: I'll send it to the clerk.
          - *Ends resolved*
        - You: I won't sign it as it is.
          - Jamie Moreno: I'll get the veto message drafted.
          - *Ends refused*
    - You: Let me read it tonight.
      - Jamie Moreno: The council's going to ask what you decided.
      - You: I'll sign it.
        - Jamie Moreno: I'll get the veto message drafted.
        - *Ends resolved*
      - You: I'm going to veto it.
        - Jamie Moreno: I'll send it to the clerk.
        - *Ends refused*
  - You: I want to sleep on it.
    - Jamie Moreno: I'll need your answer by the end of the week.
    - You: It's a good bill. I'll sign it today.
      - Jamie Moreno: I'll send it to the clerk.
      - *Ends resolved*
    - You: I won't sign it as it is.
      - Jamie Moreno: I'll send it to the clerk.
      - *Ends refused*
- You: I want to sleep on it.
  - Jamie Moreno: I'll need your answer by the end of the week.
  - You: It's a good bill. I'll sign it today.
    - Jamie Moreno: I'll get the veto message drafted.
    - *Ends resolved*
  - You: I'm going to veto it.
    - Jamie Moreno: I'll get the veto message drafted.
    - *Ends refused*

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.name-sets-bill-on-your-desk-you-can-sign-it-or-veto-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.this-one-s-waiting-on-you]; L3 state/deliver-news/scene-talk/calm/10w2s [scene-talk.state-deliver-news.bill-passed-it-needs-your-signature]; L4 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L5 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-won-t-sign-it-as-it-is]; L6 reply/ask/scene-talk/curious/3w1s [scene-talk.reply-ask.what-s-in-it]; L7 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L10 follow/answer/scene-talk/calm/9w2s [scene-talk.follow-answer.the-file-has-everything-i-ll-leave-it-with-you]; L11 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L12 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-won-t-sign-it-as-it-is]; L13 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.who-voted-against-it]; L14 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L17 follow/answer/scene-talk/calm/6w1s [scene-talk.follow-answer.it-s-all-in-the-vote-record]; L18 reply/agree/scene-talk/calm/3w1s [scene-talk.reply-agree.i-ll-sign-it]; L19 reply/refuse/scene-talk/braced/5w1s [scene-talk.reply-refuse.i-m-going-to-veto-it]; L20 reply/ask/scene-talk/curious/3w1s [scene-talk.reply-ask.what-s-in-it]; L21 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-read-it-tonight]; L24 follow/answer/scene-talk/calm/9w2s [scene-talk.follow-answer.the-file-has-everything-i-ll-leave-it-with-you]; L25 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L26 reply/refuse/scene-talk/braced/5w1s [scene-talk.reply-refuse.i-m-going-to-veto-it]; L27 reply/ask/scene-talk/curious/3w1s [scene-talk.reply-ask.what-s-in-it]; L28 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L31 follow/answer/scene-talk/calm/9w2s [scene-talk.follow-answer.the-file-has-everything-i-ll-leave-it-with-you]; L32 reply/agree/scene-talk/calm/3w1s [scene-talk.reply-agree.i-ll-sign-it]; L33 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-won-t-sign-it-as-it-is]; L34 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.who-voted-against-it]; L35 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L38 follow/answer/scene-talk/calm/6w1s [scene-talk.follow-answer.it-s-all-in-the-vote-record]; L39 close/press/scene-talk/calm/6w1s [scene-talk.close-press.let-me-know-when-you-ve-decided]</sub>

**Profile cold** (outcome refused)

**Jamie Moreno:** This one's waiting on you.

**Jamie Moreno:** "Right to counsel in eviction" passed. It needs your signature.

You could say:

1. It's a good bill. I'll sign it today.
2. I'm going to veto it.  *(the page follows this one)*
3. What's in it?
4. I want to sleep on it.

**Jamie Moreno:** I'll send it to the clerk.

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.name-sets-bill-on-your-desk-you-can-sign-it-or-veto-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.this-one-s-waiting-on-you]; L3 state/deliver-news/scene-talk/calm/10w2s [scene-talk.state-deliver-news.bill-passed-it-needs-your-signature]; L4 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L5 reply/refuse/scene-talk/braced/5w1s [scene-talk.reply-refuse.i-m-going-to-veto-it]; L6 reply/ask/scene-talk/curious/3w1s [scene-talk.reply-ask.what-s-in-it]; L7 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L9 follow/accept/scene-talk/calm/6w1s [scene-talk.follow-accept.i-ll-send-it-to-the-clerk]</sub>

**Profile stubborn** (outcome refused)

**Jamie Moreno:** This one's waiting on you.

**Jamie Moreno:** "Right to counsel in eviction" is on your desk. Sign it or veto it?

You could say:

1. It's a good bill. I'll sign it today.
2. I'm going to veto it.  *(the page follows this one)*
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
4. I want to sleep on it.  *(the page follows this one)*

**Jamie Moreno:** I'll need your answer by the end of the week.

You could say:

1. It's a good bill. I'll sign it today.  *(the page follows this one)*
2. I'm going to veto it.

**Jamie Moreno:** I'll send it to the clerk.

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.name-sets-bill-on-your-desk-you-can-sign-it-or-veto-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.this-one-s-waiting-on-you]; L3 state/deliver-news/scene-talk/calm/12w2s [scene-talk.state-deliver-news.the-council-sent-over-bill-it-s-yours-now]; L4 reply/agree/scene-talk/calm/3w1s [scene-talk.reply-agree.i-ll-sign-it]; L5 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-won-t-sign-it-as-it-is]; L6 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.who-voted-against-it]; L7 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L56 follow/press/scene-talk/calm/10w1s [scene-talk.follow-press.i-ll-need-your-answer-by-the-end-of-the-week]; L57 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L58 reply/refuse/scene-talk/braced/5w1s [scene-talk.reply-refuse.i-m-going-to-veto-it]; L59 follow/accept/scene-talk/calm/6w1s [scene-talk.follow-accept.i-ll-send-it-to-the-clerk]</sub>

**Profile boastful** (outcome open)

**Jamie Moreno:** This one's waiting on you.

**Jamie Moreno:** "Right to counsel in eviction" passed. It needs your signature.

You could say:

1. It's a good bill. I'll sign it today.
2. I won't sign it as it is.
3. Who voted against it?  *(the page follows this one)*
4. Let me read it tonight.

**Jamie Moreno:** It's all in the vote record.

You could say:

1. I'll sign it.
2. I won't sign it as it is.
3. What's in it?  *(the page follows this one)*
4. I want to sleep on it.

**Jamie Moreno:** The file has everything. I'll leave it with you.

You could say:

1. It's a good bill. I'll sign it today.
2. I'm going to veto it.
3. Who voted against it?  *(the page follows this one)*
4. I want to sleep on it.

**Jamie Moreno:** It's all in the vote record.

You could say:

1. It's a good bill. I'll sign it today.
2. I'm going to veto it.
3. Who voted against it?  *(the page follows this one)*
4. I want to sleep on it.

**Jamie Moreno:** It's all in the vote record.

You could say:

1. It's a good bill. I'll sign it today.
2. I won't sign it as it is.
3. Who voted against it?  *(the page follows this one)*
4. I want to sleep on it.

**Jamie Moreno:** It's all in the vote record.

**Jamie Moreno:** Let me know when you've decided.

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.name-sets-bill-on-your-desk-you-can-sign-it-or-veto-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.this-one-s-waiting-on-you]; L3 state/deliver-news/scene-talk/calm/10w2s [scene-talk.state-deliver-news.bill-passed-it-needs-your-signature]; L4 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L5 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-won-t-sign-it-as-it-is]; L6 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.who-voted-against-it]; L7 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-read-it-tonight]; L10 follow/answer/scene-talk/calm/6w1s [scene-talk.follow-answer.it-s-all-in-the-vote-record]; L11 reply/agree/scene-talk/calm/3w1s [scene-talk.reply-agree.i-ll-sign-it]; L12 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-won-t-sign-it-as-it-is]; L13 reply/ask/scene-talk/curious/3w1s [scene-talk.reply-ask.what-s-in-it]; L14 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L17 follow/answer/scene-talk/calm/9w2s [scene-talk.follow-answer.the-file-has-everything-i-ll-leave-it-with-you]; L18 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L19 reply/refuse/scene-talk/braced/5w1s [scene-talk.reply-refuse.i-m-going-to-veto-it]; L20 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.who-voted-against-it]; L21 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L24 follow/answer/scene-talk/calm/6w1s [scene-talk.follow-answer.it-s-all-in-the-vote-record]; L25 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L26 reply/refuse/scene-talk/braced/5w1s [scene-talk.reply-refuse.i-m-going-to-veto-it]; L27 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.who-voted-against-it]; L28 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L31 follow/answer/scene-talk/calm/6w1s [scene-talk.follow-answer.it-s-all-in-the-vote-record]; L32 reply/agree/scene-talk/glad/8w2s [scene-talk.reply-agree.it-s-a-good-bill-i-ll-sign-it-today]; L33 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-won-t-sign-it-as-it-is]; L34 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.who-voted-against-it]; L35 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L38 follow/answer/scene-talk/calm/6w1s [scene-talk.follow-answer.it-s-all-in-the-vote-record]; L39 close/press/scene-talk/calm/6w1s [scene-talk.close-press.let-me-know-when-you-ve-decided]</sub>

## Scene 36: staff-news (news-received, ends in political) — proof scene

*Purpose staff-news. Records: bill:federal:us-house:2026-10-13:official:seat:US-NJ:us-house:02:0, staffer:official:term:seat:US-DE:attorney-general:2026-10-12:person:aide:official:term:seat:US-DE:attorney-general:2026-10-12:0, official:seat:US-NJ:us-house:02, organization:press:newspaper:0:jurisdiction_59500182da2857ae.*

> Stephen Whitaker comes into your office and closes the door.

**Profile warm** (outcome open)

**Stephen Whitaker:** You're going to want to sit down for this.

**Stephen Whitaker:** We lost the vote on "Medicaid work requirement".

You could say:

1. Who changed their vote?  *(the page follows this one)*
2. How did we not see this coming?
3. All right. Tell me what we do now.
4. Not now. I need to think.
5. I already knew.

**Stephen Whitaker:** Give me an hour. I'll know who it was.

You could say:

1. Who changed their vote?  *(the page follows this one)*
2. Somebody leaked it. Find out who.
3. All right. Tell me what we do now.

**Stephen Whitaker:** I'm still finding out. I'll have names tonight.

You could say:

1. Who changed their vote?  *(the page follows this one)*
2. Somebody leaked it. Find out who.
3. All right. Tell me what we do now.

**Stephen Whitaker:** I'm still finding out. I'll have names tonight.

You could say:

1. Who changed their vote?  *(the page follows this one)*
2. How did we not see this coming?
3. All right. Tell me what we do now.

**Stephen Whitaker:** I'm still finding out. I'll have names tonight.

You could say:

1. Who changed their vote?  *(the page follows this one)*
2. How did we not see this coming?
3. It's done. Let's deal with it.

**Stephen Whitaker:** I'm still finding out. I'll have names tonight.

**Stephen Whitaker:** This isn't going away on its own.

**The whole exchange** (60 nodes; endings: open, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You ★: Who changed their vote?
  - Stephen Whitaker: Give me an hour. I'll know who it was.
  - You ★: Who changed their vote?
    - Stephen Whitaker: I'm still finding out. I'll have names tonight.
    - You ★: Who changed their vote?
      - Stephen Whitaker: I'm still finding out. I'll have names tonight.
      - You ★: Who changed their vote?
        - Stephen Whitaker: I'm still finding out. I'll have names tonight.
        - You ★: Who changed their vote?
          - Stephen Whitaker: I'm still finding out. I'll have names tonight.
          - *Ends open: Stephen Whitaker: This isn't going away on its own.*
        - You: How did we not see this coming?
          - (the tree is cut here)
        - You: It's done. Let's deal with it.
          - (the tree is cut here)
      - You: How did we not see this coming?
        - Stephen Whitaker: I'll find out who it was.
        - You: Thank you. Keep me posted.
          - (the tree is cut here)
        - You: It's done. Let's deal with it.
          - (the tree is cut here)
      - You: All right. Tell me what we do now.
        - Stephen Whitaker: We put out a statement before it runs.
        - You: Do it.
          - (the tree is cut here)
        - You: No. We say nothing for now.
          - (the tree is cut here)
    - You: Somebody leaked it. Find out who.
      - Stephen Whitaker: I'll find out who it was.
      - You: Thank you. Keep me posted.
        - Stephen Whitaker: I'll get started.
        - *Ends resolved*
      - You: All right. Tell me what we do now.
        - Stephen Whitaker: You call them first, and we tell it our way.
        - You: Do it.
          - (the tree is cut here)
        - You: No. We say nothing for now.
          - (the tree is cut here)
    - You: All right. Tell me what we do now.
      - Stephen Whitaker: We put out a statement before it runs.
      - You: All right. Let's go with that.
        - Stephen Whitaker: I'll get started.
        - *Ends resolved*
      - You: No. We say nothing for now.
        - Stephen Whitaker: We can't sit on this.
        - You: It's done. Let's deal with it.
          - (the tree is cut here)
        - You: Who changed their vote?
          - (the tree is cut here)
  - You: Somebody leaked it. Find out who.
    - Stephen Whitaker: I'll find out who it was.
    - You: Thank you. Keep me posted.
      - Stephen Whitaker: I'll get started.
      - *Ends resolved*
    - You: It's done. Let's deal with it.
      - Stephen Whitaker: We put out a statement before it runs.
      - You: Do it.
        - Stephen Whitaker: I'll get started.
        - *Ends resolved*
      - You: No. We say nothing for now.
        - Stephen Whitaker: We can't sit on this.
        - You: All right. Tell me what we do now.
          - (the tree is cut here)
        - You: Who changed their vote?
          - (the tree is cut here)
  - You: All right. Tell me what we do now.
    - Stephen Whitaker: We put out a statement before it runs.
    - You: All right. Let's go with that.
      - Stephen Whitaker: I'll get started.
      - *Ends resolved*
    - You: No. We say nothing for now.
      - Stephen Whitaker: We can't sit on this.
      - You: It's done. Let's deal with it.
        - Stephen Whitaker: You call them first, and we tell it our way.
        - You: Do it.
          - (the tree is cut here)
        - You: No. We say nothing for now.
          - (the tree is cut here)
      - You: Who changed their vote?
        - Stephen Whitaker: I'm still finding out. I'll have names tonight.
        - You: Who changed their vote?
          - (the tree is cut here)
        - You: How did we not see this coming?
          - (the tree is cut here)
        - You: It's done. Let's deal with it.
          - (the tree is cut here)
- You: How did we not see this coming?
  - Stephen Whitaker: I'll find out who it was.
  - You: Thank you. Keep me posted.
    - Stephen Whitaker: I'll get started.
    - *Ends resolved*
  - You: It's done. Let's deal with it.
    - Stephen Whitaker: We put out a statement before it runs.
    - You: All right. Let's go with that.
      - Stephen Whitaker: I'll get started.
      - *Ends resolved*
    - You: No. We say nothing for now.
      - Stephen Whitaker: We can't sit on this.
      - You: All right. Tell me what we do now.
        - Stephen Whitaker: You call them first, and we tell it our way.
        - You: All right. Let's go with that.
          - (the tree is cut here)
        - You: No. We say nothing for now.
          - (the tree is cut here)
      - You: Who changed their vote?
        - Stephen Whitaker: Give me an hour. I'll know who it was.
        - You: Who changed their vote?
          - (the tree is cut here)
        - You: Somebody leaked it. Find out who.
          - (the tree is cut here)
        - You: All right. Tell me what we do now.
          - (the tree is cut here)
- You: All right. Tell me what we do now.
  - Stephen Whitaker: We put out a statement before it runs.
  - You: Do it.
    - Stephen Whitaker: I'll get started.
    - *Ends resolved*
  - You: No. We say nothing for now.
    - Stephen Whitaker: We can't sit on this.
    - You: It's done. Let's deal with it.
      - Stephen Whitaker: You call them first, and we tell it our way.
      - You: Do it.
        - Stephen Whitaker: I'll get started.
        - *Ends resolved*
      - You: No. We say nothing for now.
        - Stephen Whitaker: We can't sit on this.
        - You: All right. Tell me what we do now.
          - (the tree is cut here)
        - You: Who changed their vote?
          - (the tree is cut here)
    - You: Who changed their vote?
      - Stephen Whitaker: I'm still finding out. I'll have names tonight.
      - You: Who changed their vote?
        - Stephen Whitaker: Give me an hour. I'll know who it was.
        - You: Who changed their vote?
          - (the tree is cut here)
        - You: How did we not see this coming?
          - (the tree is cut here)
        - You: It's done. Let's deal with it.
          - (the tree is cut here)
      - You: How did we not see this coming?
        - Stephen Whitaker: I'll find out who it was.
        - You: Thank you. Keep me posted.
          - (the tree is cut here)
        - You: It's done. Let's deal with it.
          - (the tree is cut here)
      - You: It's done. Let's deal with it.
        - Stephen Whitaker: You call them first, and we tell it our way.
        - You: All right. Let's go with that.
          - (the tree is cut here)
        - You: No. We say nothing for now.
          - (the tree is cut here)
- You: Not now. I need to think.
  - Stephen Whitaker: We can't sit on this.
  - You: All right. Tell me what we do now.
    - Stephen Whitaker: We put out a statement before it runs.
    - You: All right. Let's go with that.
      - Stephen Whitaker: I'll get started.
      - *Ends resolved*
    - You: No. We say nothing for now.
      - Stephen Whitaker: We can't sit on this.
      - You: It's done. Let's deal with it.
        - Stephen Whitaker: You call them first, and we tell it our way.
        - You: Do it.
          - (the tree is cut here)
        - You: No. We say nothing for now.
          - (the tree is cut here)
      - You: Who changed their vote?
        - Stephen Whitaker: Give me an hour. I'll know who it was.
        - You: Who changed their vote?
          - (the tree is cut here)
        - You: Somebody leaked it. Find out who.
          - (the tree is cut here)
        - You: It's done. Let's deal with it.
          - (the tree is cut here)
  - You: Who changed their vote?
    - Stephen Whitaker: Give me an hour. I'll know who it was.
    - You: Who changed their vote?
      - Stephen Whitaker: I'm still finding out. I'll have names tonight.
      - You: Who changed their vote?
        - Stephen Whitaker: Give me an hour. I'll know who it was.
        - You: Who changed their vote?
          - (the tree is cut here)
        - You: How did we not see this coming?
          - (the tree is cut here)
        - You: All right. Tell me what we do now.
          - (the tree is cut here)
      - You: How did we not see this coming?
        - Stephen Whitaker: I'll find out who it was.
        - You: Thank you. Keep me posted.
          - (the tree is cut here)
        - You: It's done. Let's deal with it.
          - (the tree is cut here)
      - You: All right. Tell me what we do now.
        - Stephen Whitaker: We put out a statement before it runs.
        - You: All right. Let's go with that.
          - (the tree is cut here)
        - You: No. We say nothing for now.
          - (the tree is cut here)
    - You: Somebody leaked it. Find out who.
      - Stephen Whitaker: I'll find out who it was.
      - You: Thank you. Keep me posted.
        - Stephen Whitaker: I'll get started.
        - *Ends resolved*
      - You: All right. Tell me what we do now.
        - Stephen Whitaker: You call them first, and we tell it our way.
        - You: Do it.
          - (the tree is cut here)
        - You: No. We say nothing for now.
          - (the tree is cut here)
    - You: It's done. Let's deal with it.
      - Stephen Whitaker: You call them first, and we tell it our way.
      - You: Do it.
        - Stephen Whitaker: I'll get started.
        - *Ends resolved*
      - You: No. We say nothing for now.
        - Stephen Whitaker: We can't sit on this.
        - You: All right. Tell me what we do now.
          - (the tree is cut here)
        - You: Who changed their vote?
          - (the tree is cut here)
- You: I already knew.
  - *if not:*
    - Stephen Whitaker: I'll get started.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/solemn/10w1s [scene-talk.narrate-narrate.name-comes-into-your-office-and-closes-the-door]; L2 open/greet/scene-talk/solemn/9w1s [scene-talk.open-greet.you-re-going-to-want-to-sit-down-for-this]; L3 state/deliver-news/scene-talk/solemn/8w1s [scene-talk.state-deliver-news.we-lost-the-vote-on-bill]; L4 reply/ask/scene-talk/braced/4w1s [scene-talk.reply-ask.who-changed-their-vote]; L5 reply/blame/scene-talk/braced/7w1s [scene-talk.reply-blame.how-did-we-not-see-this-coming]; L6 reply/accept/scene-talk/calm/8w2s [scene-talk.reply-accept.all-right-tell-me-what-we-do-now]; L7 reply/deflect/scene-talk/guarded/6w2s [scene-talk.reply-deflect.not-now-i-need-to-think]; L8 reply/lie/scene-talk/guarded/3w1s [scene-talk.reply-lie.i-already-knew]; L9 follow/answer/scene-talk/solemn/9w2s [scene-talk.follow-answer.give-me-an-hour-i-ll-know-who-it-was]; L10 reply/ask/scene-talk/braced/4w1s [scene-talk.reply-ask.who-changed-their-vote]; L11 reply/blame/scene-talk/braced/6w2s [scene-talk.reply-blame.somebody-leaked-it-find-out-who]; L12 reply/accept/scene-talk/calm/8w2s [scene-talk.reply-accept.all-right-tell-me-what-we-do-now]; L13 follow/answer/scene-talk/solemn/8w2s [scene-talk.follow-answer.i-m-still-finding-out-i-ll-have-names-tonight]; L14 reply/ask/scene-talk/braced/4w1s [scene-talk.reply-ask.who-changed-their-vote]; L15 reply/blame/scene-talk/braced/6w2s [scene-talk.reply-blame.somebody-leaked-it-find-out-who]; L16 reply/accept/scene-talk/calm/8w2s [scene-talk.reply-accept.all-right-tell-me-what-we-do-now]; L17 follow/answer/scene-talk/solemn/8w2s [scene-talk.follow-answer.i-m-still-finding-out-i-ll-have-names-tonight]; L18 reply/ask/scene-talk/braced/4w1s [scene-talk.reply-ask.who-changed-their-vote]; L19 reply/blame/scene-talk/braced/7w1s [scene-talk.reply-blame.how-did-we-not-see-this-coming]; L20 reply/accept/scene-talk/calm/8w2s [scene-talk.reply-accept.all-right-tell-me-what-we-do-now]; L21 follow/answer/scene-talk/solemn/8w2s [scene-talk.follow-answer.i-m-still-finding-out-i-ll-have-names-tonight]; L22 reply/ask/scene-talk/braced/4w1s [scene-talk.reply-ask.who-changed-their-vote]; L23 reply/blame/scene-talk/braced/7w1s [scene-talk.reply-blame.how-did-we-not-see-this-coming]; L24 reply/accept/scene-talk/calm/6w2s [scene-talk.reply-accept.it-s-done-let-s-deal-with-it]; L25 follow/answer/scene-talk/solemn/8w2s [scene-talk.follow-answer.i-m-still-finding-out-i-ll-have-names-tonight]; L26 close/warn/scene-talk/solemn/7w1s [scene-talk.close-warn.this-isn-t-going-away-on-its-own]</sub>

**Profile cold** (outcome resolved)

**Stephen Whitaker:** You're going to want to sit down for this.

**Stephen Whitaker:** We lost the vote on "Medicaid work requirement".

You could say:

1. Who changed their vote?
2. Somebody leaked it. Find out who.  *(the page follows this one)*
3. All right. Tell me what we do now.
4. Not now. I need to think.
5. I already knew.

**Stephen Whitaker:** I'll find out who it was.

You could say:

1. Thank you. Keep me posted.  *(the page follows this one)*
2. It's done. Let's deal with it.

**Stephen Whitaker:** I'll get started.

<sub>L1 narrate/narrate/scene-talk/solemn/10w1s [scene-talk.narrate-narrate.name-comes-into-your-office-and-closes-the-door]; L2 open/greet/scene-talk/solemn/9w1s [scene-talk.open-greet.you-re-going-to-want-to-sit-down-for-this]; L3 state/deliver-news/scene-talk/solemn/8w1s [scene-talk.state-deliver-news.we-lost-the-vote-on-bill]; L4 reply/ask/scene-talk/braced/4w1s [scene-talk.reply-ask.who-changed-their-vote]; L5 reply/blame/scene-talk/braced/6w2s [scene-talk.reply-blame.somebody-leaked-it-find-out-who]; L6 reply/accept/scene-talk/calm/8w2s [scene-talk.reply-accept.all-right-tell-me-what-we-do-now]; L7 reply/deflect/scene-talk/guarded/6w2s [scene-talk.reply-deflect.not-now-i-need-to-think]; L8 reply/lie/scene-talk/guarded/3w1s [scene-talk.reply-lie.i-already-knew]; L72 follow/promise/scene-talk/braced/6w1s [scene-talk.follow-promise.i-ll-find-out-who-it-was]; L73 reply/thank/scene-talk/calm/5w2s [scene-talk.reply-thank.thank-you-keep-me-posted]; L74 reply/accept/scene-talk/calm/6w2s [scene-talk.reply-accept.it-s-done-let-s-deal-with-it]; L75 follow/thank/scene-talk/calm/3w1s [scene-talk.follow-thank.i-ll-get-started]</sub>

**Profile stubborn** (outcome resolved)

**Stephen Whitaker:** You're going to want to sit down for this.

**Stephen Whitaker:** We lost the vote on "Medicaid work requirement".

You could say:

1. Who changed their vote?
2. Somebody leaked it. Find out who.  *(the page follows this one)*
3. It's done. Let's deal with it.
4. Not now. I need to think.
5. I already knew.

**Stephen Whitaker:** I'll find out who it was.

You could say:

1. Thank you. Keep me posted.  *(the page follows this one)*
2. All right. Tell me what we do now.

**Stephen Whitaker:** I'll get started.

<sub>L1 narrate/narrate/scene-talk/solemn/10w1s [scene-talk.narrate-narrate.name-comes-into-your-office-and-closes-the-door]; L2 open/greet/scene-talk/solemn/9w1s [scene-talk.open-greet.you-re-going-to-want-to-sit-down-for-this]; L3 state/deliver-news/scene-talk/solemn/8w1s [scene-talk.state-deliver-news.we-lost-the-vote-on-bill]; L4 reply/ask/scene-talk/braced/4w1s [scene-talk.reply-ask.who-changed-their-vote]; L5 reply/blame/scene-talk/braced/6w2s [scene-talk.reply-blame.somebody-leaked-it-find-out-who]; L6 reply/accept/scene-talk/calm/6w2s [scene-talk.reply-accept.it-s-done-let-s-deal-with-it]; L7 reply/deflect/scene-talk/guarded/6w2s [scene-talk.reply-deflect.not-now-i-need-to-think]; L8 reply/lie/scene-talk/guarded/3w1s [scene-talk.reply-lie.i-already-knew]; L72 follow/promise/scene-talk/braced/6w1s [scene-talk.follow-promise.i-ll-find-out-who-it-was]; L73 reply/thank/scene-talk/calm/5w2s [scene-talk.reply-thank.thank-you-keep-me-posted]; L74 reply/accept/scene-talk/calm/8w2s [scene-talk.reply-accept.all-right-tell-me-what-we-do-now]; L75 follow/thank/scene-talk/calm/3w1s [scene-talk.follow-thank.i-ll-get-started]</sub>

## Scene 37: section-bargain (vote-wanted, ends in bill) — proof scene

*Purpose section-bargain. Records: bill:office:US-DE:legislature-lower:2027-02-01:official:term:seat:US-DE:lower:001:0:2026-10-12:24, official:term:seat:US-DE:lower:041:0:2026-10-12, official:term:seat:US-DE:lower:030:0:2026-10-12, office:US-DE:legislature-lower.*

> The council is in recess. Ralph Morrow pulls you aside about "Universal preschool".

**Profile warm** (outcome resolved)

**Ralph Morrow:** Can I talk to you?

**Ralph Morrow:** Drop section 1, and you have my vote.

You could say:

1. Count me in.  *(the page follows this one)*
2. Section 1 stays.
3. What if we change section 1 instead of dropping it?
4. Let me think about it.
5. I never had a problem with section 1.

**Ralph Morrow:** Thank you. I won't forget it.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, open, open, resolved, open, open, resolved, resolved, open, open, resolved, open, open, resolved, resolved, resolved, open, open, resolved, open, open, resolved, resolved, open, open, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You ★: Count me in.
  - Ralph Morrow: Thank you. I won't forget it.
  - *Ends resolved*
- You: Section 1 stays.
  - Ralph Morrow: Please. Think about the people this helps.
  - You: You've made your point. Count me in.
    - Ralph Morrow: Thank you. Really.
    - *Ends resolved*
  - You: I've made up my mind. It's no.
    - Ralph Morrow: Without this, I've got nothing to take home.
    - You: Okay. For you, I'll do it.
      - Ralph Morrow: Thank you. Really.
      - *Ends resolved*
    - You: I'm sorry, but I'm a no on "Universal preschool".
      - Ralph Morrow: You know what this means to me.
      - You: Okay. For you, I'll do it.
        - Ralph Morrow: You won't regret it.
        - *Ends resolved*
      - You: I can't vote for "Universal preschool".
        - Ralph Morrow: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: Section 1 stays.
          - (the tree is cut here)
        - You: What if we change section 1 instead of dropping it?
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: I'll cut half of section 1. Not all of it.
        - Ralph Morrow: All right. We have a deal.
        - *Ends open*
      - You: I need a few days to think it over.
        - Ralph Morrow: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Universal preschool".
          - (the tree is cut here)
        - You: I'll cut half of section 1. Not all of it.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
    - You: What if we change section 1 instead of dropping it?
      - Ralph Morrow: That I can live with.
      - *Ends open*
    - You: I haven't decided yet.
      - Ralph Morrow: I'm asking as a friend.
      - You: Okay. For you, I'll do it.
        - Ralph Morrow: You won't regret it.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Universal preschool".
        - Ralph Morrow: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Universal preschool".
          - (the tree is cut here)
        - You: What if we change section 1 instead of dropping it?
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
      - You: I'll cut half of section 1. Not all of it.
        - Ralph Morrow: That I can live with.
        - *Ends open*
      - You: I'm still weighing it.
        - Ralph Morrow: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Universal preschool".
          - (the tree is cut here)
        - You: What if we change section 1 instead of dropping it?
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
  - You: What if we change section 1 instead of dropping it?
    - Ralph Morrow: Deal.
    - *Ends open*
  - You: I haven't decided yet.
    - Ralph Morrow: You know what this means to me.
    - You: All right. You win. I'm in.
      - Ralph Morrow: Thank you. Really.
      - *Ends resolved*
    - You: I've made up my mind. It's no.
      - Ralph Morrow: I'm asking as a friend.
      - You: You've made your point. Count me in.
        - Ralph Morrow: You won't regret it.
        - *Ends resolved*
      - You: I can't vote for "Universal preschool".
        - Ralph Morrow: I need this one. I promised my district I'd deliver.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Universal preschool".
          - (the tree is cut here)
        - You: What if we change section 1 instead of dropping it?
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: What if we change section 1 instead of dropping it?
        - Ralph Morrow: All right. We have a deal.
        - *Ends open*
      - You: I need a few days to think it over.
        - Ralph Morrow: I need this one. I promised my district I'd deliver.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Universal preschool".
          - (the tree is cut here)
        - You: I'll cut half of section 1. Not all of it.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
    - You: What if we change section 1 instead of dropping it?
      - Ralph Morrow: That I can live with.
      - *Ends open*
    - You: I'm still undecided. Give me until the vote.
      - Ralph Morrow: I'm asking as a friend.
      - You: You've made your point. Count me in.
        - Ralph Morrow: I knew I could count on you.
        - *Ends resolved*
      - You: I've made up my mind. It's no.
        - Ralph Morrow: Without this, I've got nothing to take home.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Universal preschool".
          - (the tree is cut here)
        - You: What if we change section 1 instead of dropping it?
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: I'll cut half of section 1. Not all of it.
        - Ralph Morrow: All right. We have a deal.
        - *Ends open*
      - You: Let me sleep on it.
        - Ralph Morrow: I need this one. I promised my district I'd deliver.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: What if we change section 1 instead of dropping it?
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
- You: What if we change section 1 instead of dropping it?
  - Ralph Morrow: Deal.
  - *Ends open*
- You: Let me think about it.
  - Ralph Morrow: I wouldn't ask if it didn't matter.
  - You: You've made your point. Count me in.
    - Ralph Morrow: I knew I could count on you.
    - *Ends resolved*
  - You: I've made up my mind. It's no.
    - Ralph Morrow: Please. Think about the people this helps.
    - You: You've made your point. Count me in.
      - Ralph Morrow: Thank you. Really.
      - *Ends resolved*
    - You: Section 1 stays.
      - Ralph Morrow: I'm asking as a friend.
      - You: All right. You win. I'm in.
        - Ralph Morrow: Thank you. Really.
        - *Ends resolved*
      - You: I can't vote for "Universal preschool".
        - Ralph Morrow: You know what this means to me.
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
        - *Ends open*
      - You: I'm still weighing it.
        - Ralph Morrow: Without this, I've got nothing to take home.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Universal preschool".
          - (the tree is cut here)
        - You: What if we change section 1 instead of dropping it?
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
    - You: What if we change section 1 instead of dropping it?
      - Ralph Morrow: All right. We have a deal.
      - *Ends open*
    - You: I'm still weighing it.
      - Ralph Morrow: Without this, I've got nothing to take home.
      - You: All right. You win. I'm in.
        - Ralph Morrow: Thank you. I won't forget it.
        - *Ends resolved*
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
        - *Ends open*
      - You: I'm still undecided. Give me until the vote.
        - Ralph Morrow: You know what this means to me.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Universal preschool".
          - (the tree is cut here)
        - You: What if we change section 1 instead of dropping it?
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
  - You: What if we change section 1 instead of dropping it?
    - Ralph Morrow: That I can live with.
    - *Ends open*
  - You: I need a few days to think it over.
    - Ralph Morrow: You know what this means to me.
    - You: Okay. For you, I'll do it.
      - Ralph Morrow: Thank you. Really.
      - *Ends resolved*
    - You: Section 1 stays.
      - Ralph Morrow: Please. Think about the people this helps.
      - You: All right. You win. I'm in.
        - Ralph Morrow: I knew I could count on you.
        - *Ends resolved*
      - You: I've made up my mind. It's no.
        - Ralph Morrow: I'm asking as a friend.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Universal preschool".
          - (the tree is cut here)
        - You: I'll cut half of section 1. Not all of it.
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
      - You: What if we change section 1 instead of dropping it?
        - Ralph Morrow: That I can live with.
        - *Ends open*
      - You: I'm still undecided. Give me until the vote.
        - Ralph Morrow: I'm asking as a friend.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: What if we change section 1 instead of dropping it?
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
    - You: I'll cut half of section 1. Not all of it.
      - Ralph Morrow: That I can live with.
      - *Ends open*
    - You: I'm still weighing it.
      - Ralph Morrow: Please. Think about the people this helps.
      - You: Okay. For you, I'll do it.
        - Ralph Morrow: Thank you. Really.
        - *Ends resolved*
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: What if we change section 1 instead of dropping it?
        - (the tree is cut here)
      - You: Let me sleep on it.
        - (the tree is cut here)
- You: I never had a problem with section 1.
  - *if not:*
    - Ralph Morrow: All right. I had to ask.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/braced/13w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/bargain/scene-talk/braced/8w1s [scene-talk.state-bargain.drop-section-section-and-you-have-my-vote]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L9 follow/thank/scene-talk/glad/6w2s [scene-talk.follow-thank.thank-you-i-won-t-forget-it]</sub>

**Profile cold** (outcome refused)

**Ralph Morrow:** Can I talk to you?

**Ralph Morrow:** Drop section 1, and you have my vote.

You could say:

1. Fine. You have it.
2. Section 1 stays.  *(the page follows this one)*
3. I'll cut half of section 1. Not all of it.
4. I'm still weighing it.
5. I never had a problem with section 1.

**Ralph Morrow:** It would be a shame if your next bill stalled.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't vote for "Universal preschool".  *(the page follows this one)*
3. Are you threatening me?
4. I'll cut half of section 1. Not all of it.

**Ralph Morrow:** You can't win without friends.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I've made up my mind. It's no.  *(the page follows this one)*
3. Are you threatening me?
4. I'll cut half of section 1. Not all of it.

**Ralph Morrow:** You know how this works.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry, but I'm a no on "Universal preschool".  *(the page follows this one)*
3. Are you threatening me?
4. I'll cut half of section 1. Not all of it.

**Ralph Morrow:** People will remember this at the next election.

You could say:

1. You've made your point. Count me in.
2. I'm sorry, but I'm a no on "Universal preschool".  *(the page follows this one)*
3. Are you threatening me?
4. I'll cut half of section 1. Not all of it.

**Ralph Morrow:** It would be a shame if your next bill stalled.

**Ralph Morrow:** You'll need friends after this vote. I won't be one.

<sub>L1 narrate/narrate/scene-talk/braced/13w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/bargain/scene-talk/braced/8w1s [scene-talk.state-bargain.drop-section-section-and-you-have-my-vote]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L10 follow/threaten/scene-talk/guarded/10w1s [scene-talk.follow-threaten.it-would-be-a-shame-if-your-next-bill-stalled]; L11 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L12 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L13 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L14 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L16 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-can-t-win-without-friends]; L17 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L18 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L19 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L20 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L22 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-know-how-this-works]; L23 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L24 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L25 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L26 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L28 follow/threaten/scene-talk/braced/8w1s [scene-talk.follow-threaten.people-will-remember-this-at-the-next-election]; L29 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L30 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L31 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L32 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L34 follow/threaten/scene-talk/guarded/10w1s [scene-talk.follow-threaten.it-would-be-a-shame-if-your-next-bill-stalled]; L35 close/warn/scene-talk/braced/10w2s [scene-talk.close-warn.you-ll-need-friends-after-this-vote-i-won-t-be-one]</sub>

**Profile stubborn** (outcome refused)

**Ralph Morrow:** Got a second?

**Ralph Morrow:** I can live with "Universal preschool". I can't live with section 1.

You could say:

1. Fine. You have it.
2. I've made up my mind. It's no.  *(the page follows this one)*
3. I'll cut half of section 1. Not all of it.
4. I haven't decided yet.
5. I never had a problem with section 1.

**Ralph Morrow:** I need a yes or a no.

You could say:

1. All right. You win. I'm in.
2. I'm sorry, but I'm a no on "Universal preschool".  *(the page follows this one)*
3. I'll cut half of section 1. Not all of it.

**Ralph Morrow:** I need to know before the vote.

You could say:

1. You've made your point. Count me in.
2. I can't vote for "Universal preschool".  *(the page follows this one)*
3. What if we change section 1 instead of dropping it?

**Ralph Morrow:** Yes or no?

You could say:

1. Okay. For you, I'll do it.
2. Section 1 stays.  *(the page follows this one)*
3. What if we change section 1 instead of dropping it?

**Ralph Morrow:** You can't sit this one out.

You could say:

1. Okay. For you, I'll do it.
2. I can't vote for "Universal preschool".  *(the page follows this one)*
3. I'll cut half of section 1. Not all of it.

**Ralph Morrow:** It would be a shame if your next bill stalled.

**Ralph Morrow:** You'll need friends after this vote. I won't be one.

<sub>L1 narrate/narrate/scene-talk/braced/13w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/bargain/scene-talk/braced/12w2s [scene-talk.state-bargain.i-can-live-with-bill-i-can-t-live-with-section-section]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L10 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-a-yes-or-a-no]; L11 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L12 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L13 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L15 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-to-know-before-the-vote]; L16 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L17 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L18 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L20 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L21 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L22 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L23 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L25 follow/press/scene-talk/guarded/6w1s [scene-talk.follow-press.you-can-t-sit-this-one-out]; L26 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L27 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L28 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L30 follow/threaten/scene-talk/guarded/10w1s [scene-talk.follow-threaten.it-would-be-a-shame-if-your-next-bill-stalled]; L31 close/warn/scene-talk/braced/10w2s [scene-talk.close-warn.you-ll-need-friends-after-this-vote-i-won-t-be-one]</sub>

**Profile anxious** (outcome open)

**Ralph Morrow:** Sorry to bother you.

**Ralph Morrow:** Drop section 1, and you have my vote.

You could say:

1. Fine. You have it.
2. I'm sorry, but I'm a no on "Universal preschool".
3. I'll cut half of section 1. Not all of it.
4. I haven't decided yet.  *(the page follows this one)*
5. I never had a problem with section 1.

**Ralph Morrow:** Without this, I've got nothing to take home.

You could say:

1. Okay. For you, I'll do it.
2. Section 1 stays.
3. What if we change section 1 instead of dropping it?
4. Let me think about it.  *(the page follows this one)*

**Ralph Morrow:** I could lose my primary over this.

You could say:

1. All right. You win. I'm in.
2. I'm sorry, but I'm a no on "Universal preschool".
3. What if we change section 1 instead of dropping it?
4. I need a few days to think it over.  *(the page follows this one)*

**Ralph Morrow:** I need this one. I promised my district I'd deliver.

You could say:

1. Okay. For you, I'll do it.
2. I can't vote for "Universal preschool".
3. I'll cut half of section 1. Not all of it.
4. I'm still undecided. Give me until the vote.  *(the page follows this one)*

**Ralph Morrow:** You know what this means to me.

You could say:

1. Okay. For you, I'll do it.
2. I'm sorry, but I'm a no on "Universal preschool".
3. I'll cut half of section 1. Not all of it.
4. Let me sleep on it.  *(the page follows this one)*

**Ralph Morrow:** I wouldn't ask if it didn't matter.

**Ralph Morrow:** Don't take too long.

<sub>L1 narrate/narrate/scene-talk/braced/13w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/bargain/scene-talk/braced/8w1s [scene-talk.state-bargain.drop-section-section-and-you-have-my-vote]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L166 follow/plea/scene-talk/anxious/8w1s [scene-talk.follow-plea.without-this-i-ve-got-nothing-to-take-home]; L167 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L168 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L169 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L170 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L195 follow/plea/scene-talk/anxious/7w1s [scene-talk.follow-plea.i-could-lose-my-primary-over-this]; L196 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L197 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L198 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L199 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L211 follow/plea/scene-talk/anxious/10w2s [scene-talk.follow-plea.i-need-this-one-i-promised-my-district-i-d-deliver]; L212 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L213 reply/refuse/scene-talk/guarded/6w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L214 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L215 reply/stall/scene-talk/guarded/8w2s [scene-talk.reply-stall.i-m-still-undecided-give-me-until-the-vote]; L216 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.you-know-what-this-means-to-me]; L217 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L218 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L219 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L220 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L221 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.i-wouldn-t-ask-if-it-didn-t-matter]; L222 close/press/scene-talk/braced/4w1s [scene-talk.close-press.don-t-take-too-long]</sub>

**Profile boastful** (outcome open)

**Ralph Morrow:** Have you got a few minutes?

**Ralph Morrow:** Drop section 1, and you have my vote.

You could say:

1. I'm with you on "Universal preschool".
2. I'm sorry, but I'm a no on "Universal preschool".
3. I'll cut half of section 1. Not all of it.  *(the page follows this one)*
4. Let me think about it.
5. I never had a problem with section 1.

**Ralph Morrow:** That's not on the table.

**Ralph Morrow:** I'll call you before the vote.

<sub>L1 narrate/narrate/scene-talk/braced/13w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/bargain/scene-talk/braced/8w1s [scene-talk.state-bargain.drop-section-section-and-you-have-my-vote]; L4 reply/agree/scene-talk/calm/6w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L84 follow/refuse/scene-talk/guarded/5w1s [scene-talk.follow-refuse.that-s-not-on-the-table]; L85 close/press/scene-talk/calm/6w1s [scene-talk.close-press.i-ll-call-you-before-the-vote]</sub>

## Scene 38: section-bargain (vote-wanted, ends in bill) — proof scene

*Purpose section-bargain. Records: bill:office:US-DE:legislature-upper:2027-01-18:official:term:seat:US-DE:upper:020:0:2026-10-12:11, official:term:seat:US-DE:upper:016:0:2026-10-12, official:term:seat:US-DE:upper:013:0:2026-10-12, office:US-DE:legislature-upper.*

> Jessica Murray has been holding out on "Public funds for private schooling". Now Jessica Murray wants to talk.

**Profile warm** (outcome resolved)

**Jessica Murray:** Have you got a few minutes?

**Jessica Murray:** I can live with "Public funds for private schooling". I can't live with section 2.

You could say:

1. Count me in.  *(the page follows this one)*
2. I've made up my mind. It's no.
3. What if we change section 2 instead of dropping it?
4. Let me think about it.
5. I never had a problem with section 2.

**Jessica Murray:** I knew I could count on you.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, open, open, resolved, open, open, resolved, resolved, open, open, resolved, open, open, resolved, resolved, resolved, open, open, resolved, open, open, resolved, resolved, open, open, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You ★: Count me in.
  - Jessica Murray: I knew I could count on you.
  - *Ends resolved*
- You: I've made up my mind. It's no.
  - Jessica Murray: You know what this means to me.
  - You: Okay. For you, I'll do it.
    - Jessica Murray: Thank you. I won't forget it.
    - *Ends resolved*
  - You: Section 2 stays.
    - Jessica Murray: I need this one. I promised my district I'd deliver.
    - You: Okay. For you, I'll do it.
      - Jessica Murray: I knew I could count on you.
      - *Ends resolved*
    - You: I can't vote for "Public funds for private schooling".
      - Jessica Murray: I wouldn't ask if it didn't matter.
      - You: Okay. For you, I'll do it.
        - Jessica Murray: I knew I could count on you.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Public funds for private schooling".
        - Jessica Murray: Please. Think about the people this helps.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Public funds for private schooling".
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: I'll cut half of section 2. Not all of it.
        - Jessica Murray: Deal.
        - *Ends open*
      - You: Let me think about it.
        - Jessica Murray: I'm asking as a friend.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Public funds for private schooling".
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
    - You: What if we change section 2 instead of dropping it?
      - Jessica Murray: All right. We have a deal.
      - *Ends open*
    - You: Let me sleep on it.
      - Jessica Murray: I'm asking as a friend.
      - You: Okay. For you, I'll do it.
        - Jessica Murray: I knew I could count on you.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Public funds for private schooling".
        - Jessica Murray: Please. Think about the people this helps.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't vote for "Public funds for private schooling".
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: What if we change section 2 instead of dropping it?
        - Jessica Murray: That I can live with.
        - *Ends open*
      - You: I'm still weighing it.
        - Jessica Murray: Please. Think about the people this helps.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Public funds for private schooling".
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
  - You: What if we change section 2 instead of dropping it?
    - Jessica Murray: Deal.
    - *Ends open*
  - You: I'm still weighing it.
    - Jessica Murray: I wouldn't ask if it didn't matter.
    - You: All right. You win. I'm in.
      - Jessica Murray: I knew I could count on you.
      - *Ends resolved*
    - You: I'm sorry, but I'm a no on "Public funds for private schooling".
      - Jessica Murray: I could lose my primary over this.
      - You: You've made your point. Count me in.
        - Jessica Murray: I knew I could count on you.
        - *Ends resolved*
      - You: Section 2 stays.
        - Jessica Murray: Please. Think about the people this helps.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I can't vote for "Public funds for private schooling".
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
      - You: What if we change section 2 instead of dropping it?
        - Jessica Murray: That I can live with.
        - *Ends open*
      - You: I need a few days to think it over.
        - Jessica Murray: I'm asking as a friend.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: Section 2 stays.
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
    - You: What if we change section 2 instead of dropping it?
      - Jessica Murray: All right. We have a deal.
      - *Ends open*
    - You: I haven't decided yet.
      - Jessica Murray: Please. Think about the people this helps.
      - You: Okay. For you, I'll do it.
        - Jessica Murray: I knew I could count on you.
        - *Ends resolved*
      - You: Section 2 stays.
        - Jessica Murray: Without this, I've got nothing to take home.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Public funds for private schooling".
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
      - You: What if we change section 2 instead of dropping it?
        - Jessica Murray: Deal.
        - *Ends open*
      - You: I need a few days to think it over.
        - Jessica Murray: I could lose my primary over this.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Public funds for private schooling".
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
- You: What if we change section 2 instead of dropping it?
  - Jessica Murray: That I can live with.
  - *Ends open*
- You: Let me think about it.
  - Jessica Murray: Without this, I've got nothing to take home.
  - You: Okay. For you, I'll do it.
    - Jessica Murray: You won't regret it.
    - *Ends resolved*
  - You: I've made up my mind. It's no.
    - Jessica Murray: You know what this means to me.
    - You: Okay. For you, I'll do it.
      - Jessica Murray: I knew I could count on you.
      - *Ends resolved*
    - You: Section 2 stays.
      - Jessica Murray: Please. Think about the people this helps.
      - You: Okay. For you, I'll do it.
        - Jessica Murray: Thank you. Really.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Public funds for private schooling".
        - Jessica Murray: I wouldn't ask if it didn't matter.
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
        - *Ends open*
      - You: I need a few days to think it over.
        - Jessica Murray: I'm asking as a friend.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Public funds for private schooling".
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
    - You: What if we change section 2 instead of dropping it?
      - Jessica Murray: That I can live with.
      - *Ends open*
    - You: I need a few days to think it over.
      - Jessica Murray: I'm asking as a friend.
      - You: You've made your point. Count me in.
        - Jessica Murray: I knew I could count on you.
        - *Ends resolved*
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
        - *Ends open*
      - You: I'm still weighing it.
        - Jessica Murray: I could lose my primary over this.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: Section 2 stays.
          - (the tree is cut here)
        - You: I'll cut half of section 2. Not all of it.
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
  - You: What if we change section 2 instead of dropping it?
    - Jessica Murray: All right. We have a deal.
    - *Ends open*
  - You: I'm still undecided. Give me until the vote.
    - Jessica Murray: Please. Think about the people this helps.
    - You: All right. You win. I'm in.
      - Jessica Murray: Thank you. Really.
      - *Ends resolved*
    - You: I've made up my mind. It's no.
      - Jessica Murray: I'm asking as a friend.
      - You: You've made your point. Count me in.
        - Jessica Murray: Thank you. Really.
        - *Ends resolved*
      - You: Section 2 stays.
        - Jessica Murray: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Public funds for private schooling".
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
      - You: What if we change section 2 instead of dropping it?
        - Jessica Murray: All right. We have a deal.
        - *Ends open*
      - You: I haven't decided yet.
        - Jessica Murray: I wouldn't ask if it didn't matter.
        - You: All right. You win. I'm in.
          - (the tree is cut here)
        - You: Section 2 stays.
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
    - You: What if we change section 2 instead of dropping it?
      - Jessica Murray: Deal.
      - *Ends open*
    - You: Let me sleep on it.
      - Jessica Murray: I could lose my primary over this.
      - You: Okay. For you, I'll do it.
        - Jessica Murray: Thank you. Really.
        - *Ends resolved*
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: What if we change section 2 instead of dropping it?
        - (the tree is cut here)
      - You: I'm still weighing it.
        - (the tree is cut here)
- You: I never had a problem with section 2.
  - *if not:*
    - Jessica Murray: I understand. No hard feelings.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-holding-out-on-bill-now-name-wants-to-talk]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/bargain/scene-talk/braced/15w2s [scene-talk.state-bargain.i-can-live-with-bill-i-can-t-live-with-section-section]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L9 follow/thank/scene-talk/glad/7w1s [scene-talk.follow-thank.i-knew-i-could-count-on-you]</sub>

**Profile cold** (outcome refused)

**Jessica Murray:** Have you got a few minutes?

**Jessica Murray:** I can live with "Public funds for private schooling". I can't live with section 2.

You could say:

1. Fine. You have it.
2. Section 2 stays.  *(the page follows this one)*
3. I'll cut half of section 2. Not all of it.
4. I'm still undecided. Give me until the vote.
5. I never had a problem with section 2.

**Jessica Murray:** You know how this works.

You could say:

1. You've made your point. Count me in.
2. I've made up my mind. It's no.  *(the page follows this one)*
3. Are you threatening me?
4. I'll cut half of section 2. Not all of it.

**Jessica Murray:** People will remember this at the next election.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't vote for "Public funds for private schooling".  *(the page follows this one)*
3. Don't try that with me.
4. What if we change section 2 instead of dropping it?

**Jessica Murray:** You can't win without friends.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I'm sorry, but I'm a no on "Public funds for private schooling".  *(the page follows this one)*
3. Are you threatening me?
4. What if we change section 2 instead of dropping it?

**Jessica Murray:** It would be a shame if your next bill stalled.

You could say:

1. All right. You win. I'm in.
2. Section 2 stays.  *(the page follows this one)*
3. Don't try that with me.
4. I'll cut half of section 2. Not all of it.

**Jessica Murray:** You can't win without friends.

**Jessica Murray:** I won't forget this.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-holding-out-on-bill-now-name-wants-to-talk]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/bargain/scene-talk/braced/15w2s [scene-talk.state-bargain.i-can-live-with-bill-i-can-t-live-with-section-section]; L4 reply/agree/scene-talk/guarded/4w2s [scene-talk.reply-agree.fine-you-have-it]; L5 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/guarded/8w2s [scene-talk.reply-stall.i-m-still-undecided-give-me-until-the-vote]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L10 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-know-how-this-works]; L11 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L12 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L13 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L14 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L16 follow/threaten/scene-talk/braced/8w1s [scene-talk.follow-threaten.people-will-remember-this-at-the-next-election]; L17 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L18 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L19 reply/confront/scene-talk/braced/5w1s [scene-talk.reply-confront.don-t-try-that-with-me]; L20 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L22 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-can-t-win-without-friends]; L23 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L24 reply/refuse/scene-talk/guarded/12w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L25 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L26 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L28 follow/threaten/scene-talk/guarded/10w1s [scene-talk.follow-threaten.it-would-be-a-shame-if-your-next-bill-stalled]; L29 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L30 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L31 reply/confront/scene-talk/braced/5w1s [scene-talk.reply-confront.don-t-try-that-with-me]; L32 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L34 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-can-t-win-without-friends]; L35 close/warn/scene-talk/braced/4w1s [scene-talk.close-warn.i-won-t-forget-this]</sub>

**Profile stubborn** (outcome refused)

**Jessica Murray:** Have you got a few minutes?

**Jessica Murray:** I can live with "Public funds for private schooling". I can't live with section 2.

You could say:

1. Fine. Section 2 comes out.
2. I'm sorry, but I'm a no on "Public funds for private schooling".  *(the page follows this one)*
3. I'll cut half of section 2. Not all of it.
4. I haven't decided yet.
5. I never had a problem with section 2.

**Jessica Murray:** Take your time, but I need an answer.

You could say:

1. Okay. For you, I'll do it.
2. I can't vote for "Public funds for private schooling".  *(the page follows this one)*
3. I'll cut half of section 2. Not all of it.

**Jessica Murray:** Yes or no?

You could say:

1. You've made your point. Count me in.
2. Section 2 stays.  *(the page follows this one)*
3. I'll cut half of section 2. Not all of it.

**Jessica Murray:** What would it take?

You could say:

1. You've made your point. Count me in.
2. I've made up my mind. It's no.  *(the page follows this one)*
3. I'll cut half of section 2. Not all of it.

**Jessica Murray:** You can't sit this one out.

You could say:

1. Okay. For you, I'll do it.
2. Section 2 stays.  *(the page follows this one)*
3. I'll cut half of section 2. Not all of it.

**Jessica Murray:** I need to know before the vote.

**Jessica Murray:** I won't forget this.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-holding-out-on-bill-now-name-wants-to-talk]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.have-you-got-a-few-minutes]; L3 state/bargain/scene-talk/braced/15w2s [scene-talk.state-bargain.i-can-live-with-bill-i-can-t-live-with-section-section]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.fine-section-section-comes-out]; L5 reply/refuse/scene-talk/guarded/12w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L10 follow/press/scene-talk/calm/8w1s [scene-talk.follow-press.take-your-time-but-i-need-an-answer]; L11 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L12 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L13 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L15 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L16 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L17 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L18 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L20 follow/press/scene-talk/calm/4w1s [scene-talk.follow-press.what-would-it-take]; L21 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L22 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L23 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L25 follow/press/scene-talk/guarded/6w1s [scene-talk.follow-press.you-can-t-sit-this-one-out]; L26 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L27 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L28 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L30 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-to-know-before-the-vote]; L31 close/warn/scene-talk/braced/4w1s [scene-talk.close-warn.i-won-t-forget-this]</sub>

**Profile anxious** (outcome open)

**Jessica Murray:** Sorry to bother you.

**Jessica Murray:** I can live with "Public funds for private schooling". I can't live with section 2.

You could say:

1. Count me in.
2. I've made up my mind. It's no.
3. What if we change section 2 instead of dropping it?
4. Let me think about it.  *(the page follows this one)*
5. I never had a problem with section 2.

**Jessica Murray:** You know what this means to me.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't vote for "Public funds for private schooling".
3. I'll cut half of section 2. Not all of it.
4. I need a few days to think it over.  *(the page follows this one)*

**Jessica Murray:** Without this, I've got nothing to take home.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I've made up my mind. It's no.
3. I'll cut half of section 2. Not all of it.
4. I haven't decided yet.  *(the page follows this one)*

**Jessica Murray:** I'm asking as a friend.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't vote for "Public funds for private schooling".
3. I'll cut half of section 2. Not all of it.
4. I'm still undecided. Give me until the vote.  *(the page follows this one)*

**Jessica Murray:** I could lose my primary over this.

You could say:

1. Okay. For you, I'll do it.
2. I can't vote for "Public funds for private schooling".
3. I'll cut half of section 2. Not all of it.
4. I'm still weighing it.  *(the page follows this one)*

**Jessica Murray:** I need this one. I promised my district I'd deliver.

**Jessica Murray:** Don't take too long.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-holding-out-on-bill-now-name-wants-to-talk]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/bargain/scene-talk/braced/15w2s [scene-talk.state-bargain.i-can-live-with-bill-i-can-t-live-with-section-section]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L100 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.you-know-what-this-means-to-me]; L101 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L102 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L103 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L104 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L148 follow/plea/scene-talk/anxious/8w1s [scene-talk.follow-plea.without-this-i-ve-got-nothing-to-take-home]; L149 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L150 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L151 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L152 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L172 follow/plea/scene-talk/tender/5w1s [scene-talk.follow-plea.i-m-asking-as-a-friend]; L173 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L174 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L175 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L176 reply/stall/scene-talk/guarded/8w2s [scene-talk.reply-stall.i-m-still-undecided-give-me-until-the-vote]; L178 follow/plea/scene-talk/anxious/7w1s [scene-talk.follow-plea.i-could-lose-my-primary-over-this]; L179 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L180 reply/refuse/scene-talk/guarded/9w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L181 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L182 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L183 follow/plea/scene-talk/anxious/10w2s [scene-talk.follow-plea.i-need-this-one-i-promised-my-district-i-d-deliver]; L184 close/press/scene-talk/braced/4w1s [scene-talk.close-press.don-t-take-too-long]</sub>

**Profile boastful** (outcome resolved)

**Jessica Murray:** Got a second?

**Jessica Murray:** I can live with "Public funds for private schooling". I can't live with section 2.

You could say:

1. Count me in.  *(the page follows this one)*
2. I've made up my mind. It's no.
3. What if we change section 2 instead of dropping it?
4. I'm still undecided. Give me until the vote.
5. I never had a problem with section 2.

**Jessica Murray:** Thank you. I won't forget it.

<sub>L1 narrate/narrate/scene-talk/braced/18w2s [scene-talk.narrate-narrate.name-has-been-holding-out-on-bill-now-name-wants-to-talk]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/bargain/scene-talk/braced/15w2s [scene-talk.state-bargain.i-can-live-with-bill-i-can-t-live-with-section-section]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/guarded/8w2s [scene-talk.reply-stall.i-m-still-undecided-give-me-until-the-vote]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L9 follow/thank/scene-talk/glad/6w2s [scene-talk.follow-thank.thank-you-i-won-t-forget-it]</sub>

## Scene 39: section-bargain (vote-wanted, ends in bill) — proof scene

*Purpose section-bargain. Records: bill:office:US-DE:legislature-lower:2027-02-02:official:term:seat:US-DE:lower:001:0:2026-10-12:25, official:term:seat:US-DE:lower:028:0:2026-10-12, official:term:seat:US-DE:lower:014:0:2026-10-12, office:US-DE:legislature-lower.*

> The council is in recess. Stephanie Clay pulls you aside about "Limit groundwater withdrawal".

**Profile warm** (outcome resolved)

**Stephanie Clay:** Sorry to bother you.

**Stephanie Clay:** I'll vote yes on "Limit groundwater withdrawal" if section 2 comes out.

You could say:

1. You have my vote.  *(the page follows this one)*
2. I can't vote for "Limit groundwater withdrawal".
3. What if we change section 2 instead of dropping it?
4. I haven't decided yet.
5. I never had a problem with section 2.

**Stephanie Clay:** Thank you. Really.

**The whole exchange** (60 nodes; endings: resolved, resolved, resolved, resolved, open, open, resolved, open, open, resolved, resolved, open, open, resolved, open, open, resolved, resolved, resolved, open, open, resolved, open, open, resolved, resolved, open, open, resolved, resolved; ★ is the branch this profile's traits lean toward):

- You ★: You have my vote.
  - Stephanie Clay: Thank you. Really.
  - *Ends resolved*
- You: I can't vote for "Limit groundwater withdrawal".
  - Stephanie Clay: Please. Think about the people this helps.
  - You: You've made your point. Count me in.
    - Stephanie Clay: Thank you. Really.
    - *Ends resolved*
  - You: I've made up my mind. It's no.
    - Stephanie Clay: I need this one. I promised my district I'd deliver.
    - You: You've made your point. Count me in.
      - Stephanie Clay: I knew I could count on you.
      - *Ends resolved*
    - You: Section 2 stays.
      - Stephanie Clay: I'm asking as a friend.
      - You: Okay. For you, I'll do it.
        - Stephanie Clay: You won't regret it.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Limit groundwater withdrawal".
        - Stephanie Clay: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: Section 2 stays.
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: I haven't decided yet.
          - (the tree is cut here)
      - You: What if we change section 2 instead of dropping it?
        - Stephanie Clay: Deal.
        - *Ends open*
      - You: Let me think about it.
        - Stephanie Clay: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Limit groundwater withdrawal".
          - (the tree is cut here)
        - You: I'll cut half of section 2. Not all of it.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
    - You: What if we change section 2 instead of dropping it?
      - Stephanie Clay: Deal.
      - *Ends open*
    - You: I haven't decided yet.
      - Stephanie Clay: I could lose my primary over this.
      - You: You've made your point. Count me in.
        - Stephanie Clay: You won't regret it.
        - *Ends resolved*
      - You: Section 2 stays.
        - Stephanie Clay: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Limit groundwater withdrawal".
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: Let me sleep on it.
          - (the tree is cut here)
      - You: What if we change section 2 instead of dropping it?
        - Stephanie Clay: Deal.
        - *Ends open*
      - You: Let me sleep on it.
        - Stephanie Clay: I'm asking as a friend.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: Section 2 stays.
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
  - You: What if we change section 2 instead of dropping it?
    - Stephanie Clay: Deal.
    - *Ends open*
  - You: Let me sleep on it.
    - Stephanie Clay: I wouldn't ask if it didn't matter.
    - You: Fine. I'll do it, but this is the last time.
      - Stephanie Clay: Thank you. Really.
      - *Ends resolved*
    - You: Section 2 stays.
      - Stephanie Clay: You know what this means to me.
      - You: Okay. For you, I'll do it.
        - Stephanie Clay: I knew I could count on you.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Limit groundwater withdrawal".
        - Stephanie Clay: I'm asking as a friend.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: I'll cut half of section 2. Not all of it.
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: What if we change section 2 instead of dropping it?
        - Stephanie Clay: All right. We have a deal.
        - *Ends open*
      - You: Let me think about it.
        - Stephanie Clay: I need this one. I promised my district I'd deliver.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
    - You: What if we change section 2 instead of dropping it?
      - Stephanie Clay: That I can live with.
      - *Ends open*
    - You: I haven't decided yet.
      - Stephanie Clay: Without this, I've got nothing to take home.
      - You: Okay. For you, I'll do it.
        - Stephanie Clay: Thank you. Really.
        - *Ends resolved*
      - You: I've made up my mind. It's no.
        - Stephanie Clay: I'm asking as a friend.
        - You: You've made your point. Count me in.
          - (the tree is cut here)
        - You: Section 2 stays.
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: I'm still weighing it.
          - (the tree is cut here)
      - You: What if we change section 2 instead of dropping it?
        - Stephanie Clay: Deal.
        - *Ends open*
      - You: I'm still weighing it.
        - Stephanie Clay: I'm asking as a friend.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: Section 2 stays.
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
- You: What if we change section 2 instead of dropping it?
  - Stephanie Clay: Deal.
  - *Ends open*
- You: I haven't decided yet.
  - Stephanie Clay: I'm asking as a friend.
  - You: Okay. For you, I'll do it.
    - Stephanie Clay: Thank you. Really.
    - *Ends resolved*
  - You: Section 2 stays.
    - Stephanie Clay: I wouldn't ask if it didn't matter.
    - You: All right. You win. I'm in.
      - Stephanie Clay: You won't regret it.
      - *Ends resolved*
    - You: I've made up my mind. It's no.
      - Stephanie Clay: I could lose my primary over this.
      - You: Okay. For you, I'll do it.
        - Stephanie Clay: Good. I'll hold you to that.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Limit groundwater withdrawal".
        - Stephanie Clay: I need this one. I promised my district I'd deliver.
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
        - *Ends open*
      - You: I'm still weighing it.
        - Stephanie Clay: You know what this means to me.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I can't vote for "Limit groundwater withdrawal".
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
    - You: What if we change section 2 instead of dropping it?
      - Stephanie Clay: That I can live with.
      - *Ends open*
    - You: Let me think about it.
      - Stephanie Clay: Please. Think about the people this helps.
      - You: You've made your point. Count me in.
        - Stephanie Clay: Thank you. I won't forget it.
        - *Ends resolved*
      - You: I've made up my mind. It's no.
        - Stephanie Clay: I need this one. I promised my district I'd deliver.
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
        - *Ends open*
      - You: I'm still weighing it.
        - Stephanie Clay: Without this, I've got nothing to take home.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I've made up my mind. It's no.
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
  - You: What if we change section 2 instead of dropping it?
    - Stephanie Clay: That I can live with.
    - *Ends open*
  - You: I'm still weighing it.
    - Stephanie Clay: Please. Think about the people this helps.
    - You: Okay. For you, I'll do it.
      - Stephanie Clay: I knew I could count on you.
      - *Ends resolved*
    - You: I've made up my mind. It's no.
      - Stephanie Clay: I need this one. I promised my district I'd deliver.
      - You: All right. You win. I'm in.
        - Stephanie Clay: I knew I could count on you.
        - *Ends resolved*
      - You: Section 2 stays.
        - Stephanie Clay: I could lose my primary over this.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: I'm sorry, but I'm a no on "Limit groundwater withdrawal".
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: Let me think about it.
          - (the tree is cut here)
      - You: What if we change section 2 instead of dropping it?
        - Stephanie Clay: That I can live with.
        - *Ends open*
      - You: Let me think about it.
        - Stephanie Clay: I wouldn't ask if it didn't matter.
        - You: Okay. For you, I'll do it.
          - (the tree is cut here)
        - You: Section 2 stays.
          - (the tree is cut here)
        - You: What if we change section 2 instead of dropping it?
          - (the tree is cut here)
        - You: I need a few days to think it over.
          - (the tree is cut here)
    - You: What if we change section 2 instead of dropping it?
      - Stephanie Clay: All right. We have a deal.
      - *Ends open*
    - You: Let me sleep on it.
      - Stephanie Clay: You know what this means to me.
      - You: Okay. For you, I'll do it.
        - Stephanie Clay: Thank you. Really.
        - *Ends resolved*
      - You: I've made up my mind. It's no.
        - (the tree is cut here)
      - You: What if we change section 2 instead of dropping it?
        - (the tree is cut here)
      - You: I need a few days to think it over.
        - (the tree is cut here)
- You: I never had a problem with section 2.
  - *if not:*
    - Stephanie Clay: I knew I could count on you.
    - *Ends resolved*

<sub>L1 narrate/narrate/scene-talk/braced/14w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/bargain/scene-talk/braced/12w1s [scene-talk.state-bargain.i-ll-vote-yes-on-bill-if-section-section-comes-out]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L9 follow/thank/scene-talk/tender/3w2s [scene-talk.follow-thank.thank-you-really]</sub>

**Profile cold** (outcome refused)

**Stephanie Clay:** Sorry to bother you.

**Stephanie Clay:** I'll vote yes on "Limit groundwater withdrawal" if section 2 comes out.

You could say:

1. You have my vote.
2. I can't vote for "Limit groundwater withdrawal".  *(the page follows this one)*
3. What if we change section 2 instead of dropping it?
4. I'm still weighing it.
5. I never had a problem with section 2.

**Stephanie Clay:** People will remember this at the next election.

You could say:

1. You've made your point. Count me in.
2. Section 2 stays.  *(the page follows this one)*
3. Don't try that with me.
4. I'll cut half of section 2. Not all of it.

**Stephanie Clay:** It would be a shame if your next bill stalled.

You could say:

1. Okay. For you, I'll do it.
2. I've made up my mind. It's no.  *(the page follows this one)*
3. Are you threatening me?
4. I'll cut half of section 2. Not all of it.

**Stephanie Clay:** You can't win without friends.

You could say:

1. You've made your point. Count me in.
2. I'm sorry, but I'm a no on "Limit groundwater withdrawal".  *(the page follows this one)*
3. Are you threatening me?
4. I'll cut half of section 2. Not all of it.

**Stephanie Clay:** You know how this works.

You could say:

1. All right. You win. I'm in.
2. I'm sorry, but I'm a no on "Limit groundwater withdrawal".  *(the page follows this one)*
3. Don't try that with me.
4. What if we change section 2 instead of dropping it?

**Stephanie Clay:** You can't win without friends.

**Stephanie Clay:** I won't forget this.

<sub>L1 narrate/narrate/scene-talk/braced/14w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/bargain/scene-talk/braced/12w1s [scene-talk.state-bargain.i-ll-vote-yes-on-bill-if-section-section-comes-out]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L10 follow/threaten/scene-talk/braced/8w1s [scene-talk.follow-threaten.people-will-remember-this-at-the-next-election]; L11 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L12 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L13 reply/confront/scene-talk/braced/5w1s [scene-talk.reply-confront.don-t-try-that-with-me]; L14 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L16 follow/threaten/scene-talk/guarded/10w1s [scene-talk.follow-threaten.it-would-be-a-shame-if-your-next-bill-stalled]; L17 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L18 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L19 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L20 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L22 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-can-t-win-without-friends]; L23 reply/relent/scene-talk/calm/7w2s [scene-talk.reply-relent.you-ve-made-your-point-count-me-in]; L24 reply/refuse/scene-talk/guarded/10w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L25 reply/confront/scene-talk/braced/4w1s [scene-talk.reply-confront.are-you-threatening-me]; L26 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L28 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-know-how-this-works]; L29 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L30 reply/refuse/scene-talk/guarded/10w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L31 reply/confront/scene-talk/braced/5w1s [scene-talk.reply-confront.don-t-try-that-with-me]; L32 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L33 follow/threaten/scene-talk/braced/5w1s [scene-talk.follow-threaten.you-can-t-win-without-friends]; L34 close/warn/scene-talk/braced/4w1s [scene-talk.close-warn.i-won-t-forget-this]</sub>

**Profile stubborn** (outcome refused)

**Stephanie Clay:** Got a second?

**Stephanie Clay:** I'll vote yes on "Limit groundwater withdrawal" if section 2 comes out.

You could say:

1. You have my vote.
2. I've made up my mind. It's no.  *(the page follows this one)*
3. I'll cut half of section 2. Not all of it.
4. Let me think about it.
5. I never had a problem with section 2.

**Stephanie Clay:** I need a yes or a no.

You could say:

1. All right. You win. I'm in.
2. Section 2 stays.  *(the page follows this one)*
3. I'll cut half of section 2. Not all of it.

**Stephanie Clay:** I need to know before the vote.

You could say:

1. Okay. For you, I'll do it.
2. I'm sorry, but I'm a no on "Limit groundwater withdrawal".  *(the page follows this one)*
3. What if we change section 2 instead of dropping it?

**Stephanie Clay:** Yes or no?

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't vote for "Limit groundwater withdrawal".  *(the page follows this one)*
3. I'll cut half of section 2. Not all of it.

**Stephanie Clay:** You can't sit this one out.

You could say:

1. Okay. For you, I'll do it.
2. Section 2 stays.  *(the page follows this one)*
3. What if we change section 2 instead of dropping it?

**Stephanie Clay:** Take your time, but I need an answer.

**Stephanie Clay:** I hope you know what this costs you.

<sub>L1 narrate/narrate/scene-talk/braced/14w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/bargain/scene-talk/braced/12w1s [scene-talk.state-bargain.i-ll-vote-yes-on-bill-if-section-section-comes-out]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L10 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-a-yes-or-a-no]; L11 reply/relent/scene-talk/calm/6w3s [scene-talk.reply-relent.all-right-you-win-i-m-in]; L12 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L13 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L15 follow/press/scene-talk/braced/7w1s [scene-talk.follow-press.i-need-to-know-before-the-vote]; L16 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L17 reply/refuse/scene-talk/guarded/10w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L18 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L20 follow/press/scene-talk/braced/3w1s [scene-talk.follow-press.yes-or-no]; L21 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L22 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L23 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L25 follow/press/scene-talk/guarded/6w1s [scene-talk.follow-press.you-can-t-sit-this-one-out]; L26 reply/relent/scene-talk/tender/6w2s [scene-talk.reply-relent.okay-for-you-i-ll-do-it]; L27 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L28 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L30 follow/press/scene-talk/calm/8w1s [scene-talk.follow-press.take-your-time-but-i-need-an-answer]; L31 close/warn/scene-talk/braced/8w1s [scene-talk.close-warn.i-hope-you-know-what-this-costs-you]</sub>

**Profile anxious** (outcome open)

**Stephanie Clay:** Sorry to bother you.

**Stephanie Clay:** I'll vote yes on "Limit groundwater withdrawal" if section 2 comes out.

You could say:

1. I'm with you on "Limit groundwater withdrawal".
2. I've made up my mind. It's no.
3. What if we change section 2 instead of dropping it?
4. I haven't decided yet.  *(the page follows this one)*
5. I never had a problem with section 2.

**Stephanie Clay:** I could lose my primary over this.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I can't vote for "Limit groundwater withdrawal".
3. I'll cut half of section 2. Not all of it.
4. I'm still undecided. Give me until the vote.  *(the page follows this one)*

**Stephanie Clay:** You know what this means to me.

You could say:

1. Fine. I'll do it, but this is the last time.
2. I've made up my mind. It's no.
3. I'll cut half of section 2. Not all of it.
4. I need a few days to think it over.  *(the page follows this one)*

**Stephanie Clay:** I wouldn't ask if it didn't matter.

You could say:

1. Fine. I'll do it, but this is the last time.
2. Section 2 stays.
3. I'll cut half of section 2. Not all of it.
4. I'm still weighing it.  *(the page follows this one)*

**Stephanie Clay:** Please. Think about the people this helps.

You could say:

1. Fine. I'll do it, but this is the last time.
2. Section 2 stays.
3. I'll cut half of section 2. Not all of it.
4. Let me think about it.  *(the page follows this one)*

**Stephanie Clay:** I need this one. I promised my district I'd deliver.

**Stephanie Clay:** I hope you know what this costs you.

<sub>L1 narrate/narrate/scene-talk/braced/14w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/nervous/4w1s [scene-talk.open-greet.sorry-to-bother-you]; L3 state/bargain/scene-talk/braced/12w1s [scene-talk.state-bargain.i-ll-vote-yes-on-bill-if-section-section-comes-out]; L4 reply/agree/scene-talk/calm/7w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/nervous/4w1s [scene-talk.reply-stall.i-haven-t-decided-yet]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L169 follow/plea/scene-talk/anxious/7w1s [scene-talk.follow-plea.i-could-lose-my-primary-over-this]; L170 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L171 reply/refuse/scene-talk/guarded/7w1s [scene-talk.reply-refuse.i-can-t-vote-for-bill]; L172 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L173 reply/stall/scene-talk/guarded/8w2s [scene-talk.reply-stall.i-m-still-undecided-give-me-until-the-vote]; L198 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.you-know-what-this-means-to-me]; L199 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L200 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L201 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L202 reply/stall/scene-talk/nervous/9w1s [scene-talk.reply-stall.i-need-a-few-days-to-think-it-over]; L214 follow/plea/scene-talk/tender/7w1s [scene-talk.follow-plea.i-wouldn-t-ask-if-it-didn-t-matter]; L215 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L216 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L217 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L218 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L219 follow/plea/scene-talk/tender/7w2s [scene-talk.follow-plea.please-think-about-the-people-this-helps]; L220 reply/relent/scene-talk/guarded/10w2s [scene-talk.reply-relent.fine-i-ll-do-it-but-this-is-the-last-time]; L221 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L222 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L223 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L224 follow/plea/scene-talk/anxious/10w2s [scene-talk.follow-plea.i-need-this-one-i-promised-my-district-i-d-deliver]; L225 close/warn/scene-talk/braced/8w1s [scene-talk.close-warn.i-hope-you-know-what-this-costs-you]</sub>

**Profile boastful** (outcome open)

**Stephanie Clay:** Got a second?

**Stephanie Clay:** I'll vote yes on "Limit groundwater withdrawal" if section 2 comes out.

You could say:

1. Count me in.
2. I've made up my mind. It's no.
3. I'll cut half of section 2. Not all of it.  *(the page follows this one)*
4. I'm still undecided. Give me until the vote.
5. I never had a problem with section 2.

**Stephanie Clay:** I can give you that if you give me this.

You could say:

1. I'm with you on "Limit groundwater withdrawal".
2. I've made up my mind. It's no.
3. What if we change section 2 instead of dropping it?  *(the page follows this one)*
4. Let me sleep on it.

**Stephanie Clay:** Meet me halfway, and we have a deal.

You could say:

1. You have my vote.
2. I'm sorry, but I'm a no on "Limit groundwater withdrawal".
3. What if we change section 2 instead of dropping it?  *(the page follows this one)*
4. Let me think about it.

**Stephanie Clay:** Meet me halfway, and we have a deal.

You could say:

1. Count me in.
2. I've made up my mind. It's no.
3. I'll cut half of section 2. Not all of it.  *(the page follows this one)*
4. I'm still weighing it.

**Stephanie Clay:** I can't make that deal.

**Stephanie Clay:** I hope you know what this costs you.

<sub>L1 narrate/narrate/scene-talk/braced/14w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/calm/3w1s [scene-talk.open-greet.got-a-second]; L3 state/bargain/scene-talk/braced/12w1s [scene-talk.state-bargain.i-ll-vote-yes-on-bill-if-section-section-comes-out]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L7 reply/stall/scene-talk/guarded/8w2s [scene-talk.reply-stall.i-m-still-undecided-give-me-until-the-vote]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L100 follow/bargain/scene-talk/calm/10w1s [scene-talk.follow-bargain.i-can-give-you-that-if-you-give-me-this]; L101 reply/agree/scene-talk/calm/7w1s [scene-talk.reply-agree.i-m-with-you-on-bill]; L102 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L103 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L104 reply/stall/scene-talk/calm/5w1s [scene-talk.reply-stall.let-me-sleep-on-it]; L107 follow/bargain/scene-talk/calm/8w1s [scene-talk.follow-bargain.meet-me-halfway-and-we-have-a-deal]; L108 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L109 reply/refuse/scene-talk/guarded/10w1s [scene-talk.reply-refuse.i-m-sorry-but-i-m-a-no-on-bill]; L110 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L111 reply/stall/scene-talk/nervous/5w1s [scene-talk.reply-stall.let-me-think-about-it]; L117 follow/bargain/scene-talk/calm/8w1s [scene-talk.follow-bargain.meet-me-halfway-and-we-have-a-deal]; L118 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L119 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L120 reply/bargain/scene-talk/guarded/10w2s [scene-talk.reply-bargain.i-ll-cut-half-of-section-section-not-all-of-it]; L121 reply/stall/scene-talk/calm/4w1s [scene-talk.reply-stall.i-m-still-weighing-it]; L122 follow/refuse/scene-talk/guarded/5w1s [scene-talk.follow-refuse.i-can-t-make-that-deal]; L123 close/warn/scene-talk/braced/8w1s [scene-talk.close-warn.i-hope-you-know-what-this-costs-you]</sub>

