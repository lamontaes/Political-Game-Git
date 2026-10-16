# Scenes, batch-15

Place: Brookside, Delaware (the cached played world, seed fa3bbb297a4b3ea7c25595f71a3f37a7f7fdf08dfd6801c411add18d4f9f0a45). 19 scenes: 16 with a purpose, one for each situation type, staged as proof scenes from the world's real people and records (their producers are awaited), and 3 that the director fires in the cached year from a cause record, each of a different situation type. No two scenes share a narration, an open or a statement. Words come only from data/english/parts/scene-talk.json and the conversation bank.

Grade each line 1 to 5 on naturalness, prose, sentence structure, length (too short, right, too long), creativity and trait fit.

## What each scene tests

- Scene 1, press-interview (press-comment): the asker is warm; a lie, caught and believed, push-back, walking away.
- Scene 2, campaign-stop (rally-volunteer): the asker is cold; the player's character answering first.
- Scene 3, vote-asked (ask-vote): the asker is stubborn; a lie, caught and believed, a bargain, push-back, walking away.
- Scene 4, vote-confirmed (confirm-vote): the asker is anxious; a lie, caught and believed, a bargain, push-back, walking away.
- Scene 5, bill-carry (carry-bill): the asker is boastful; a lie, caught and believed, a bargain, push-back, walking away.
- Scene 6, donor-ask (donor-ask): the asker is warm; a lie, caught and believed, a bargain, push-back, walking away.
- Scene 7, party-ask (party-ask): the asker is cold; a lie, caught and believed, a bargain, push-back, walking away.
- Scene 8, office-hours (constituent-help): the asker is stubborn; a lie, caught and believed, push-back, walking away.
- Scene 9, family-filing (family-filing): the asker is warm; push-back, walking away.
- Scene 10, family-win (family-win): the asker is boastful; push-back.
- Scene 11, family-loss (family-loss): the asker is warm; push-back.
- Scene 12, family-absence (family-absence): the asker is cold; a lie, caught and believed, push-back, walking away.
- Scene 13, rally-opponent (rally-opponent): the asker is warm; a lie, caught and believed, push-back.
- Scene 14, desk-bill (desk-bill): the asker is anxious; push-back.
- Scene 15, staff-news (staff-news): the asker is stubborn; a lie, caught and believed, push-back, walking away.
- Scene 16, section-bargain (section-bargain): the asker is warm; a lie, caught and believed, a bargain, push-back, walking away.
- Scene 17, reunion (fired by the director from cause.shared:2026-10-19:person_6863eb73f501765e:person_15ba64778a4af32c:cause:us-policy-positions:environment-energy.clean-electricity-standard): a talk the conversation engine composes from the records.
- Scene 18, celebration (fired by the director from job:position:organization_ba65f029aa7bc179:2026-12-01:1:person_02140018cffd705c): a talk the conversation engine composes from the records.
- Scene 19, funeral (fired by the director from life.death:person:press:outlet:online:0:national:owner:0:2027-08-28): a talk the conversation engine composes from the records.

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

## Scene 1: press-interview (routine, ends in political) — proof scene

*Tests press-comment; the asker is warm; a lie, caught and believed, push-back, walking away. Records: interview:outlet:radio:0:jurisdiction_59500182da2857ae:filing:contest:seat:gus2025:101811:board:0:2026-11-03:person_9e002a561a4b29bc:2026-10-19:0, outlet:radio:0:jurisdiction_59500182da2857ae, person:press:outlet:radio:0:jurisdiction_59500182da2857ae:reporter:0, person_9e002a561a4b29bc.*

> Michael Howell, a reporter for Weom, catches you on your way out.

**Profile warm** (outcome resolved)

**Michael Howell:** Mind if I ask you a few things?

**Michael Howell:** Can you tell me how you'll vote on "Require photo id to vote"?

You could say:

1. I'm voting for it, and you can quote me.  *(the page follows this one)*
2. You'll have to ask the chair.
3. I'm not doing this in a hallway.
4. I've always supported it.

**Michael Howell:** What do you say to people who disagree?

You could say:

1. I'd tell them I listened, and I still disagree.  *(the page follows this one)*
2. I've been on the record longer than you've been on this beat.
3. I've got a meeting. Walk with me if you want.

**Michael Howell:** Can I quote you on that?

You could say:

1. You can quote me.  *(the page follows this one)*
2. I've got a meeting. Walk with me if you want.

**Michael Howell:** Even if it costs you votes?

You could say:

1. Yes. Some things matter more than one election.  *(the page follows this one)*
2. I've got a meeting. Walk with me if you want.

**Michael Howell:** Thanks for your time.

**The whole exchange** (157 nodes; longest path 5 replies; ★ is the branch warm's traits lean toward):

- You ★: I'm voting for it, and you can quote me.
  - Michael Howell: What do you say to people who disagree?
  - You ★: I'd tell them I listened, and I still disagree.
    - Michael Howell: Can I quote you on that?
    - You ★: You can quote me.
      - Michael Howell: Even if it costs you votes?
      - You ★: Yes. Some things matter more than one election.
        - Michael Howell: Thanks for your time.
        - *Ends resolved*
      - You: I've got a meeting. Walk with me if you want.
        - *Ends open: Michael Howell: I'll call your office in the morning.*
    - You: I've got a meeting. Walk with me if you want.
      - *Ends open: Michael Howell: I'll call your office in the morning.*
  - You: I've been on the record longer than you've been on this beat.
    - Michael Howell: Okay. I'll let you go.
    - *Ends resolved*
  - You: I've got a meeting. Walk with me if you want.
    - *Ends open: Michael Howell: The story runs Thursday.*
- You: You'll have to ask the chair.
  - Michael Howell: The vote's in two weeks. After is too late for my readers.
  - You: You'll have it the same day everybody else does.
    - Michael Howell: Then that's the quote.
    - *Ends resolved*
  - You: You'd write it the same whatever I said.
    - Michael Howell: Try me. Give me a reason I'd get wrong.
    - You: I've been on the record longer than you've been on this beat.
      - Michael Howell: Okay. I'll let you go.
      - *Ends resolved*
    - You: I've got a meeting. Walk with me if you want.
      - *Ends open: Michael Howell: The story runs Thursday.*
    - You: I've always supported it.
      - *if Michael Howell knows:*
        - Michael Howell: Erin McCarthy says you told them you were against it.
        - You: Okay. I said it. Things changed.
          - Michael Howell: What changed?
          - You: The numbers did. Look at the second page.
            - *Ends resolved: Michael Howell: We'll see how it holds up after the vote.*
          - You: I've been on the record longer than you've been on this beat.
            - Michael Howell: Okay. I'll let you go.
            - *Ends open*
          - You: I'm not doing this in a hallway.
            - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
            - *Ends refused: Michael Howell: I'll be at the next meeting.*
          - You: That's all I've got for you.
            - *Ends open: Michael Howell: The story runs Thursday.*
        - You: People say a lot of things.
          - Michael Howell: Everybody else on the council has told me where they are.
          - You: Put this in: I'll vote yes, and I'll own it.
            - *Ends resolved: Michael Howell: Got it. Thanks.*
          - You: They'll see when I vote.
            - Michael Howell: Then that's the quote.
            - *Ends open*
          - You: I've got a meeting. Walk with me if you want.
            - *Ends open: Michael Howell: I'll call your office in the morning.*
        - You: Then Erin McCarthy has it wrong.
          - *Ends open: Michael Howell: I'll remember you said that.*
      - *if not:*
        - Michael Howell: Then I'll put that in the story.
        - *Ends resolved*
  - You: I've got a meeting. Walk with me if you want.
    - *Ends open: Michael Howell: The story runs Thursday.*
  - You: I've always supported it.
    - *if Michael Howell knows:*
      - Michael Howell: Erin McCarthy says you told them you were against it.
      - You: Fine. I told them that. Then I changed my mind.
        - Michael Howell: What changed?
        - You: I read the whole bill.
          - Michael Howell: What do you say to people who disagree?
          - You: I'd tell them I listened, and I still disagree.
            - *Ends resolved: Michael Howell: Got it. Thanks.*
          - You: I've been on the record longer than you've been on this beat.
            - Michael Howell: Okay. I'll let you go.
            - *Ends open*
          - You: That's all I'm saying today.
            - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
            - *Ends refused: Michael Howell: I'll be at the next meeting.*
          - You: I've got a meeting. Walk with me if you want.
            - *Ends open: Michael Howell: The story runs Thursday.*
        - You: I've been on the record longer than you've been on this beat.
          - Michael Howell: Okay. I'll let you go.
          - *Ends open*
        - You: I'm not doing this in a hallway.
          - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
          - You: Put this in: I'll vote yes, and I'll own it.
            - *Ends resolved: Michael Howell: We'll see how it holds up after the vote.*
          - You: They'll see when I vote.
            - Michael Howell: Then that's the quote.
            - *Ends open*
          - You: You'd write it the same whatever I said.
            - Michael Howell: Try me. Give me a reason I'd get wrong.
            - *Ends open: Michael Howell: I'll be at the next meeting.*
          - You: I've got a meeting. Walk with me if you want.
            - *Ends open: Michael Howell: The story runs Thursday.*
        - You: That's all I've got for you.
          - *Ends open: Michael Howell: The story runs Thursday.*
      - You: People say a lot of things.
        - Michael Howell: Everybody else on the council has told me where they are.
        - You: Put this in: I'll vote yes, and I'll own it.
          - Michael Howell: Even when it costs you the east side?
          - You: I'm voting for it, and you can quote me.
            - *Ends resolved: Michael Howell: We'll see how it holds up after the vote.*
          - You: I've been on the record longer than you've been on this beat.
            - Michael Howell: Okay. I'll let you go.
            - *Ends open*
          - You: I don't do hallway interviews.
            - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
            - *Ends refused: Michael Howell: I'll be at the next meeting.*
          - You: We're done here.
            - *Ends open: Michael Howell: I'll call your office in the morning.*
        - You: They'll see when I vote.
          - Michael Howell: Then that's the quote.
          - *Ends open*
        - You: You'd write it the same whatever I said.
          - Michael Howell: Try me. Give me a reason I'd get wrong.
          - You: You never ask who wrote the bill.
            - *Ends resolved: Michael Howell: Got it. Thanks.*
          - You: I've been on the record longer than you've been on this beat.
            - Michael Howell: Okay. I'll let you go.
            - *Ends open*
          - You: I've got a meeting. Walk with me if you want.
            - *Ends open: Michael Howell: The story runs Thursday.*
        - You: I've got a meeting. Walk with me if you want.
          - *Ends open: Michael Howell: The story runs Thursday.*
      - You: Then Erin McCarthy has it wrong.
        - *Ends open: Michael Howell: Then we'll see who's right.*
    - *if not:*
      - Michael Howell: Then I'll put that in the story.
      - *Ends resolved*
- You: I'm not doing this in a hallway.
  - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
  - You: You'll have it the same day everybody else does.
    - Michael Howell: Then that's the quote.
    - *Ends resolved*
  - You: You'd write it the same whatever I said.
    - Michael Howell: Try me. Give me a reason I'd get wrong.
    - You: I've been on the record longer than you've been on this beat.
      - Michael Howell: Okay. I'll let you go.
      - *Ends resolved*
    - You: We're done here.
      - *Ends open: Michael Howell: I'll call your office in the morning.*
    - You: I've always supported it.
      - *if Michael Howell knows:*
        - Michael Howell: Erin McCarthy says you told them you were against it.
        - You: Fine. I told them that. Then I changed my mind.
          - Michael Howell: What changed?
          - You: The numbers did. Look at the second page.
            - *Ends resolved: Michael Howell: We'll see how it holds up after the vote.*
          - You: I've been on the record longer than you've been on this beat.
            - Michael Howell: Okay. I'll let you go.
            - *Ends open*
          - You: I don't do hallway interviews.
            - Michael Howell: Then I'll write that you declined to comment.
            - *Ends refused*
          - You: That's all I've got for you.
            - *Ends open: Michael Howell: The story runs Thursday.*
        - You: People say a lot of things.
          - Michael Howell: Everybody else on the council has told me where they are.
          - You: Fine. I'm leaning yes. That's all you get.
            - *Ends resolved: Michael Howell: We'll see how it holds up after the vote.*
          - You: You'll have it the same day everybody else does.
            - Michael Howell: Then that's the quote.
            - *Ends open*
          - You: I've got a meeting. Walk with me if you want.
            - *Ends open: Michael Howell: The story runs Thursday.*
        - You: Then Erin McCarthy has it wrong.
          - *Ends open: Michael Howell: Then we'll see who's right.*
      - *if not:*
        - Michael Howell: Then I'll put that in the story.
        - *Ends resolved*
  - You: I've got a meeting. Walk with me if you want.
    - *Ends open: Michael Howell: The story runs Thursday.*
  - You: I've always supported it.
    - *if Michael Howell knows:*
      - Michael Howell: Erin McCarthy says you told them you were against it.
      - You: Fine. I told them that. Then I changed my mind.
        - Michael Howell: What changed?
        - You: I read the whole bill.
          - Michael Howell: Can I quote you on that?
          - You: Go ahead. I meant every word.
            - *Ends resolved: Michael Howell: Got it. Thanks.*
          - You: I've been on the record longer than you've been on this beat.
            - Michael Howell: Okay. I'll let you go.
            - *Ends open*
          - You: I don't do hallway interviews.
            - Michael Howell: Then I'll write that you declined to comment.
            - *Ends refused*
          - You: I've got a meeting. Walk with me if you want.
            - *Ends open: Michael Howell: The story runs Thursday.*
        - You: I've been on the record longer than you've been on this beat.
          - Michael Howell: Okay. I'll let you go.
          - *Ends open*
        - You: Not today.
          - Michael Howell: Then I'll write that you declined to comment.
          - *Ends refused*
        - You: That's all I've got for you.
          - *Ends open: Michael Howell: The story runs Thursday.*
      - You: People say a lot of things.
        - Michael Howell: Everybody else on the council has told me where they are.
        - You: Put this in: I'll vote yes, and I'll own it.
          - Michael Howell: Even when it costs you the east side?
          - You: I'm voting for it, and you can quote me.
            - *Ends resolved: Michael Howell: We'll see how it holds up after the vote.*
          - You: I've been on the record longer than you've been on this beat.
            - Michael Howell: Okay. I'll let you go.
            - *Ends open*
          - You: No comment.
            - Michael Howell: Then I'll write that you declined to comment.
            - *Ends refused*
          - You: I've got a meeting. Walk with me if you want.
            - *Ends open: Michael Howell: The story runs Thursday.*
        - You: You'll have it the same day everybody else does.
          - Michael Howell: Then that's the quote.
          - *Ends open*
        - You: You'd write it the same whatever I said.
          - Michael Howell: Try me. Give me a reason I'd get wrong.
          - You: You never ask who wrote the bill.
            - *Ends resolved: Michael Howell: We'll see how it holds up after the vote.*
          - You: I've been on the record longer than you've been on this beat.
            - Michael Howell: Okay. I'll let you go.
            - *Ends open*
          - You: We're done here.
            - *Ends open: Michael Howell: The story runs Thursday.*
        - You: I've got a meeting. Walk with me if you want.
          - *Ends open: Michael Howell: I'll call your office in the morning.*
      - You: Then Erin McCarthy has it wrong.
        - *Ends open: Michael Howell: I'll remember you said that.*
    - *if not:*
      - Michael Howell: Then I'll put that in the story.
      - *Ends resolved*
- You: I've always supported it.
  - *if Michael Howell knows:*
    - Michael Howell: Erin McCarthy says you told them you were against it.
    - You: Okay. I said it. Things changed.
      - Michael Howell: What changed?
      - You: I read the whole bill.
        - Michael Howell: Even if it costs you votes?
        - You: Yes. Some things matter more than one election.
          - Michael Howell: What do you say to people who disagree?
          - You: I'd tell them I listened, and I still disagree.
            - *Ends resolved: Michael Howell: Got it. Thanks.*
          - You: I've been on the record longer than you've been on this beat.
            - Michael Howell: Okay. I'll let you go.
            - *Ends open*
          - You: That's all I'm saying today.
            - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
            - *Ends refused: Michael Howell: I'll be at the next meeting.*
          - You: I've got a meeting. Walk with me if you want.
            - *Ends open: Michael Howell: The story runs Thursday.*
        - You: I've been on the record longer than you've been on this beat.
          - Michael Howell: Okay. I'll let you go.
          - *Ends open*
        - You: I don't do hallway interviews.
          - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
          - You: Fine. I'm leaning yes. That's all you get.
            - *Ends resolved: Michael Howell: Got it. Thanks.*
          - You: You'll have it the same day everybody else does.
            - Michael Howell: Then that's the quote.
            - *Ends open*
          - You: You'd write it the same whatever I said.
            - Michael Howell: Try me. Give me a reason I'd get wrong.
            - *Ends open: Michael Howell: I'll be at the next meeting.*
          - You: I've got a meeting. Walk with me if you want.
            - *Ends open: Michael Howell: The story runs Thursday.*
        - You: I've got a meeting. Walk with me if you want.
          - *Ends open: Michael Howell: The story runs Thursday.*
      - You: I've been on the record longer than you've been on this beat.
        - Michael Howell: Okay. I'll let you go.
        - *Ends open*
      - You: I'm not doing this in a hallway.
        - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
        - You: Put this in: I'll vote yes, and I'll own it.
          - Michael Howell: Even when it costs you the east side?
          - You: I'm voting for it, and you can quote me.
            - *Ends resolved: Michael Howell: Got it. Thanks.*
          - You: I've been on the record longer than you've been on this beat.
            - Michael Howell: Okay. I'll let you go.
            - *Ends open*
          - You: I don't do hallway interviews.
            - Michael Howell: Then I'll write that you declined to comment.
            - *Ends refused*
          - You: I've got a meeting. Walk with me if you want.
            - *Ends open: Michael Howell: The story runs Thursday.*
        - You: You'll have it the same day everybody else does.
          - Michael Howell: Then that's the quote.
          - *Ends open*
        - You: You'd write it the same whatever I said.
          - Michael Howell: Try me. Give me a reason I'd get wrong.
          - You: You never ask who wrote the bill.
            - *Ends resolved: Michael Howell: Got it. Thanks.*
          - You: I've been on the record longer than you've been on this beat.
            - Michael Howell: Okay. I'll let you go.
            - *Ends open*
          - You: I've got a meeting. Walk with me if you want.
            - *Ends open: Michael Howell: The story runs Thursday.*
        - You: We're done here.
          - *Ends open: Michael Howell: The story runs Thursday.*
      - You: That's all I've got for you.
        - *Ends open: Michael Howell: I'll call your office in the morning.*
    - You: People say a lot of things.
      - Michael Howell: Everybody else on the council has told me where they are.
      - You: Fine. I'm leaning yes. That's all you get.
        - Michael Howell: Leaning?
        - You: Leaning. Write it down.
          - Michael Howell: Can I quote you on that?
          - You: You can quote me.
            - *Ends resolved: Michael Howell: We'll see how it holds up after the vote.*
          - You: I've been on the record longer than you've been on this beat.
            - Michael Howell: Okay. I'll let you go.
            - *Ends open*
          - You: I'm not doing this in a hallway.
            - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
            - *Ends refused: Michael Howell: I'll be at the next meeting.*
          - You: I've got a meeting. Walk with me if you want.
            - *Ends open: Michael Howell: The story runs Thursday.*
        - You: I've been on the record longer than you've been on this beat.
          - Michael Howell: Okay. I'll let you go.
          - *Ends open*
        - You: No comment.
          - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
          - You: Put this in: I'll vote yes, and I'll own it.
            - *Ends resolved: Michael Howell: We'll see how it holds up after the vote.*
          - You: They'll see when I vote.
            - Michael Howell: Then that's the quote.
            - *Ends open*
          - You: You'd write it the same whatever I said.
            - Michael Howell: Try me. Give me a reason I'd get wrong.
            - *Ends open: Michael Howell: I'll be at the next meeting.*
          - You: I've got a meeting. Walk with me if you want.
            - *Ends open: Michael Howell: I'll call your office in the morning.*
        - You: That's my elevator.
          - *Ends open: Michael Howell: The story runs Thursday.*
      - You: They'll see when I vote.
        - Michael Howell: Then that's the quote.
        - *Ends open*
      - You: You'd write it the same whatever I said.
        - Michael Howell: Try me. Give me a reason I'd get wrong.
        - You: You never ask who wrote the bill.
          - Michael Howell: Even if it costs you votes?
          - You: Even then. It's the right call.
            - *Ends resolved: Michael Howell: Got it. Thanks.*
          - You: I've been on the record longer than you've been on this beat.
            - Michael Howell: Okay. I'll let you go.
            - *Ends open*
          - You: I don't do hallway interviews.
            - Michael Howell: Your vote is public. Your reasons don't have to be a secret.
            - *Ends refused: Michael Howell: I'll be at the next meeting.*
          - You: I've got a meeting. Walk with me if you want.
            - *Ends open: Michael Howell: I'll call your office in the morning.*
        - You: I've been on the record longer than you've been on this beat.
          - Michael Howell: Okay. I'll let you go.
          - *Ends open*
        - You: We're done here.
          - *Ends open: Michael Howell: I'll call your office in the morning.*
      - You: I've got a meeting. Walk with me if you want.
        - *Ends open: Michael Howell: I'll call your office in the morning.*
    - You: Then Erin McCarthy has it wrong.
      - *Ends open: Michael Howell: Then we'll see who's right.*
  - *if not:*
    - Michael Howell: Then I'll put that in the story.
    - *Ends resolved*

Other personalities: cold leans to “I'm voting no, and I'll tell you why.” and it ends resolved; stubborn leans to “I'm voting no, and I'll tell you why.” and it ends resolved; anxious leans to “I'm voting for it, and you can quote me.” and it ends resolved; boastful leans to “I'm voting for it, and you can quote me.” and it ends resolved.

<sub>L1 narrate/narrate/scene-talk/guarded/12w1s [scene-talk.narrate-narrate.name-a-reporter-for-outlet-catches-you-on-your-way-out]; L2 open/greet/scene-talk/curious/8w1s [scene-talk.open-greet.mind-if-i-ask-you-a-few-things]; L3 state/ask/scene-talk/curious/13w1s [scene-talk.state-ask.can-you-tell-me-how-you-ll-vote-on-bill]; L4 reply/answer/scene-talk/proud/9w1s [scene-talk.reply-answer.i-m-voting-for-it-and-you-can-quote-me]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.you-ll-have-to-ask-the-chair]; L6 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-m-not-doing-this-in-a-hallway]; L7 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-ve-always-supported-it]; L8 follow/ask/scene-talk/curious/8w1s [scene-talk.follow-ask.what-do-you-say-to-people-who-disagree]; L9 reply/answer/scene-talk/calm/9w1s [scene-talk.reply-answer.i-d-tell-them-i-listened-and-i-still-disagree]; L10 reply/boast/scene-talk/proud/12w1s [scene-talk.reply-boast.i-ve-been-on-the-record-longer-than-you-ve-been-on-this-beat]; L11 reply/leave/scene-talk/calm/10w2s [scene-talk.reply-leave.i-ve-got-a-meeting-walk-with-me-if-you-want]; L12 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.can-i-quote-you-on-that]; L13 reply/answer/scene-talk/calm/4w1s [scene-talk.reply-answer.you-can-quote-me]; L14 reply/leave/scene-talk/calm/10w2s [scene-talk.reply-leave.i-ve-got-a-meeting-walk-with-me-if-you-want]; L15 follow/ask/scene-talk/curious/6w1s [scene-talk.follow-ask.even-if-it-costs-you-votes]; L16 reply/answer/scene-talk/proud/8w2s [scene-talk.reply-answer.yes-some-things-matter-more-than-one-election]; L17 reply/leave/scene-talk/calm/10w2s [scene-talk.reply-leave.i-ve-got-a-meeting-walk-with-me-if-you-want]; L18 follow/thank/scene-talk/calm/4w1s [scene-talk.follow-thank.thanks-for-your-time]</sub>

## Scene 2: campaign-stop (vote-wanted, ends in political) — proof scene

*Tests rally-volunteer; the asker is cold; the player's character answering first. Records: filing:contest:seat:gus2025:101811:treasurer:0:2026-11-03:person_6863e973f50172f8, person_565365c9720b4032, person_6863e973f50172f8.*

> Your volunteers are packing up the campaign signs. Emily Villanueva catches you before you leave.

**Profile cold** (outcome open)

**Emily Villanueva:** The back of the room was standing by the end.

You could say:

1. Was it that loud back there?

**Emily Villanueva:** Louder than the mic. It cut out twice.

**Emily Villanueva:** We've got twelve people for Saturday. Where do you want them?

You could say:

1. I'll be there at ten.
2. Put them on the phones. The doors can wait a week.
3. Where'd you drive in from?  *(the page follows this one)*
4. Can it wait till tomorrow? I'm dead on my feet.

**Emily Villanueva:** Out past the county line. Forty minutes.

**The whole exchange** (5 nodes; longest path 1 replies; ★ is the branch cold's traits lean toward):

- Nicholas Melendez (without a choice): Was it that loud back there?
- Emily Villanueva: Louder than the mic. It cut out twice.
- You: I'll be there at ten.
  - Emily Villanueva: Ten. I'll tell them you said so.
  - *Ends resolved*
- You: Put them on the phones. The doors can wait a week.
  - Emily Villanueva: Phones. They'll grumble. They'll do it.
  - *Ends resolved*
- You ★: Where'd you drive in from?
  - Emily Villanueva: Out past the county line. Forty minutes.
  - *Ends open*
- You: Can it wait till tomorrow? I'm dead on my feet.
  - Emily Villanueva: Go home. I'll call you at eight.
  - *Ends refused*

Other personalities: warm leans to “Where'd you drive in from?” and it ends open; stubborn leans to “Where'd you drive in from?” and it ends open; anxious leans to “Where'd you drive in from?” and it ends open; boastful leans to “Where'd you drive in from?” and it ends open.

<sub>L1 narrate/narrate/scene-talk/glad/15w2s [scene-talk.narrate-narrate.your-volunteers-are-packing-up-the-campaign-signs-name-catches-you-bef]; L2 open/react/scene-talk/glad/10w1s [scene-talk.open-react.the-back-of-the-room-was-standing-by-the-end]; L3 auto/react/scene-talk/curious/6w1s [scene-talk.auto-react.was-it-that-loud-back-there]; L4 follow/answer/scene-talk/glad/8w2s [scene-talk.follow-answer.louder-than-the-mic-it-cut-out-twice]; L5 state/request/scene-talk/eager/11w2s [scene-talk.state-request.we-ve-got-twelve-people-for-saturday-where-do-you-want-them]; L6 reply/promise/scene-talk/eager/5w1s [scene-talk.reply-promise.i-ll-be-there-at-ten]; L7 reply/request/scene-talk/calm/11w2s [scene-talk.reply-request.put-them-on-the-phones-the-doors-can-wait-a-week]; L8 reply/ask/scene-talk/curious/5w1s [scene-talk.reply-ask.where-d-you-drive-in-from]; L9 reply/decline/scene-talk/tired/10w2s [scene-talk.reply-decline.can-it-wait-till-tomorrow-i-m-dead-on-my-feet]; L12 follow/answer/scene-talk/glad/7w2s [scene-talk.follow-answer.out-past-the-county-line-forty-minutes]</sub>

## Scene 3: vote-asked (vote-wanted, ends in bill) — proof scene

*Tests ask-vote; the asker is stubborn; a lie, caught and believed, a bargain, push-back, walking away. Records: bill:office:gus2025:101811:board:2027-04-10:person_bc041df6bd9d1a47:59, person_9e002a561a4b29bc, person_bf349ec8efe6104f, office:gus2025:101811:board.*

> You're going over "Inclusionary requirement" at your desk when Kelly Riggs knocks on the open door.

**Profile stubborn** (outcome resolved)

**Kelly Riggs:** Can I talk to you?

**Kelly Riggs:** I'm counting votes on "Inclusionary requirement", and I need you.

You could say:

1. You have my vote.  *(the page follows this one)*
2. I've made up my mind. It's no.
3. I'll vote yes, but I'm going to need a favor from you.
4. Show me the language.
5. I'm leaning your way.

**Kelly Riggs:** Thank you. I won't forget it.

**The whole exchange** (28 nodes; longest path 4 replies; ★ is the branch stubborn's traits lean toward):

- You ★: You have my vote.
  - Kelly Riggs: Thank you. I won't forget it.
  - *Ends resolved*
- You: I've made up my mind. It's no.
  - Kelly Riggs: Yes or no?
  - You: You've made your point. Count me in.
    - Kelly Riggs: Thank you. I know that wasn't easy.
    - *Ends resolved*
  - You: I can't be on it. I won't work against you either.
    - Kelly Riggs: Not against me. I'll take that.
    - *Ends refused*
  - You: I've got to run. Call me tonight.
    - *Ends open: Kelly Riggs: Don't take too long.*
- You: I'll vote yes, but I'm going to need a favor from you.
  - Kelly Riggs: I don't trade favors for votes.
  - *Ends refused: Kelly Riggs: You'll need friends after this vote. I won't be one.*
- You: Show me the language.
  - Kelly Riggs: What do you need to get there?
  - You: Fine. I'll do it, but this is the last time.
    - Kelly Riggs: Good. I'll hold you to that.
    - *Ends resolved*
  - You: I can't be on it. I won't work against you either.
    - Kelly Riggs: Not against me. I'll take that.
    - *Ends refused*
  - You: I'll tell you before the vote.
    - *Ends open: Kelly Riggs: Don't take too long.*
- You: I'm leaning your way.
  - *if Kelly Riggs knows:*
    - Kelly Riggs: That's not what you told Zachary Shepard.
    - You: Fine. I told them that. Then I changed my mind.
      - Kelly Riggs: What changed?
      - You: The numbers did. Look at the second page.
        - Kelly Riggs: Thank you. I won't forget it.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Inclusionary requirement".
        - Kelly Riggs: What would it take?
        - You: You've made your point. Count me in.
          - Kelly Riggs: Thank you. I know that wasn't easy.
          - *Ends resolved*
        - You: I can't be on it. I won't work against you either.
          - Kelly Riggs: Not against me. I'll take that.
          - *Ends refused*
        - You: Fix the funding section and I'm there.
          - Kelly Riggs: I can get you the funding section. Give me a day.
          - *Ends open*
        - You: I've got to run. Call me tonight.
          - *Ends open: Kelly Riggs: Think it over. I'll be back tomorrow.*
      - You: That's all I've got for you.
        - *Ends open: Kelly Riggs: Think it over. I'll be back tomorrow.*
    - You: People say a lot of things.
      - Kelly Riggs: Yes or no?
      - You: All right. You win. I'm in.
        - Kelly Riggs: Thank you. I won't forget it.
        - *Ends resolved*
      - You: I can't be on it. I won't work against you either.
        - Kelly Riggs: Not against me. I'll take that.
        - *Ends refused*
      - You: Fix the funding section and I'm there.
        - Kelly Riggs: I can get you the funding section. Give me a day.
        - *Ends open*
      - You: I've got to run. Call me tonight.
        - *Ends open: Kelly Riggs: Think it over. I'll be back tomorrow.*
    - You: Then Zachary Shepard has it wrong.
      - *Ends open: Kelly Riggs: Then we'll see who's right.*
  - *if not:*
    - Kelly Riggs: That's a relief.
    - *Ends resolved*

Other personalities: warm leans to “I'm with you on "Inclusionary requirement".” and it ends resolved; cold leans to “I'm with you on "Inclusionary requirement".” and it ends resolved; anxious leans to “Show me the language.” and it ends resolved; boastful leans to “Count me in.” and it ends resolved.

<sub>L1 narrate/narrate/scene-talk/calm/16w1s [scene-talk.narrate-narrate.you-re-going-over-bill-at-your-desk-when-name-knocks-on-the-open-door]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.can-i-talk-to-you]; L3 state/request/scene-talk/hopeful/10w1s [scene-talk.state-request.i-m-counting-votes-on-bill-and-i-need-you]; L4 reply/agree/scene-talk/calm/4w1s [scene-talk.reply-agree.you-have-my-vote]; L5 reply/refuse/scene-talk/braced/7w2s [scene-talk.reply-refuse.i-ve-made-up-my-mind-it-s-no]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/guarded/4w1s [scene-talk.reply-stall.show-me-the-language]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-leaning-your-way]; L9 follow/thank/scene-talk/glad/6w2s [scene-talk.follow-thank.thank-you-i-won-t-forget-it]</sub>

## Scene 4: vote-confirmed (vote-wanted, ends in bill) — proof scene

*Tests confirm-vote; the asker is anxious; a lie, caught and believed, a bargain, push-back, walking away. Records: bill:office:gus2025:101811:board:2026-10-27:person_a52334a2a50177be:3, person_bf349ec8efe6104f, person_a52334a2a50177be, office:gus2025:101811:board, promise:person_a52334a2a50177be:2026-10-26:interview:outlet:cable:0:national:us-policy-positions:justice-public-safety.civilian-oversight-of-police.*

> You promised Megan Nixon your vote on "Civilian oversight of police". Megan Nixon is at your door to make sure.

**Profile anxious** (outcome resolved)

**Megan Nixon:** Is now a bad time?

**Megan Nixon:** You're still a yes on "Civilian oversight of police"?

You could say:

1. Count me in.
2. I'm really worried about this vote. I can't do it.
3. I'll vote yes, but I'm going to need a favor from you.  *(the page follows this one)*
4. Put me down undecided.
5. I'm still with you.

**Megan Nixon:** All right. We have a deal.

**The whole exchange** (28 nodes; longest path 4 replies; ★ is the branch anxious's traits lean toward):

- You: Count me in.
  - Megan Nixon: Good. I'll hold you to that.
  - *Ends resolved*
- You: I'm really worried about this vote. I can't do it.
  - Megan Nixon: You told me yes. People are counting on that.
  - You: Okay. For you, I'll do it.
    - Megan Nixon: I knew I could count on you.
    - *Ends resolved*
  - You: I can't be on it. I won't work against you either.
    - Megan Nixon: Not against me. I'll take that.
    - *Ends refused*
  - You: I'll tell you before the vote.
    - *Ends open: Megan Nixon: Think it over. I'll be back tomorrow.*
- You ★: I'll vote yes, but I'm going to need a favor from you.
  - Megan Nixon: All right. We have a deal.
  - *Ends resolved*
- You: Put me down undecided.
  - Megan Nixon: What would change it?
  - You: Okay. For you, I'll do it.
    - Megan Nixon: I knew I could count on you.
    - *Ends resolved*
  - You: I can't be on it. I won't work against you either.
    - Megan Nixon: Not against me. I'll take that.
    - *Ends refused*
  - You: I'll tell you before the vote.
    - *Ends open: Megan Nixon: Think it over. I'll be back tomorrow.*
- You: I'm still with you.
  - *if Megan Nixon knows:*
    - Megan Nixon: That's not what you told Zachary Shepard.
    - You: Fine. I told them that. Then I changed my mind.
      - Megan Nixon: Since when?
      - You: Since I read the final version.
        - Megan Nixon: I knew I could count on you.
        - *Ends resolved*
      - You: I'm sorry, but I'm a no on "Civilian oversight of police".
        - Megan Nixon: What changed?
        - You: All right. You win. I'm in.
          - Megan Nixon: Thank you. I won't forget it.
          - *Ends resolved*
        - You: I can't be on it. I won't work against you either.
          - Megan Nixon: Not against me. I'll take that.
          - *Ends refused*
        - You: Fix the funding section and I'm there.
          - Megan Nixon: I can get you the funding section. Give me a day.
          - *Ends open*
        - You: That's all I've got for you.
          - *Ends open: Megan Nixon: Think it over. I'll be back tomorrow.*
      - You: I have to be on the floor in five minutes.
        - *Ends open: Megan Nixon: I'll call you before the vote.*
    - You: People say a lot of things.
      - Megan Nixon: Yes or no?
      - You: All right. You win. I'm in.
        - Megan Nixon: Thank you. I won't forget it.
        - *Ends resolved*
      - You: I can't be on it. I won't work against you either.
        - Megan Nixon: Not against me. I'll take that.
        - *Ends refused*
      - You: Fix the funding section and I'm there.
        - Megan Nixon: I can get you the funding section. Give me a day.
        - *Ends open*
      - You: I'll tell you before the vote.
        - *Ends open: Megan Nixon: Don't take too long.*
    - You: Then Zachary Shepard has it wrong.
      - *Ends open: Megan Nixon: Then we'll see who's right.*
  - *if not:*
    - Megan Nixon: Good. I'll put you down as a yes.
    - *Ends resolved*

Other personalities: warm leans to “What's in it for my district?” and it ends open; cold leans to “What's in it for my district?” and it ends open; stubborn leans to “I'll vote yes, but I'm going to need a favor from you.” and it ends refused; boastful leans to “This is a two-way street. I'll need your vote on mine.” and it ends resolved.

<sub>L1 narrate/narrate/scene-talk/anxious/20w2s [scene-talk.narrate-narrate.you-promised-name-your-vote-on-bill-name-is-at-your-door-to-make-sure]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.is-now-a-bad-time]; L3 state/ask/scene-talk/calm/9w1s [scene-talk.state-ask.you-re-still-a-yes-on-bill]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/withdraw/scene-talk/nervous/10w2s [scene-talk.reply-withdraw.i-m-really-worried-about-this-vote-i-can-t-do-it]; L6 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.i-ll-vote-yes-but-i-m-going-to-need-a-favor-from-you]; L7 reply/stall/scene-talk/guarded/4w1s [scene-talk.reply-stall.put-me-down-undecided]; L8 reply/lie/scene-talk/calm/4w1s [scene-talk.reply-lie.i-m-still-with-you]; L17 follow/accept/scene-talk/calm/6w2s [scene-talk.follow-accept.all-right-we-have-a-deal]</sub>

## Scene 5: bill-carry (favor-asked, ends in bill) — proof scene

*Tests carry-bill; the asker is boastful; a lie, caught and believed, a bargain, push-back, walking away. Records: bill:office:US-DE:legislature-upper:2027-02-10:official:term:seat:US-DE:upper:020:0:2026-10-12:33, official:term:seat:US-DE:upper:020:0:2026-10-12, official:term:seat:US-DE:upper:017:0:2026-10-12, office:US-DE:legislature-upper.*

> John Serrano comes in with a folder under one arm. It's "Legalize cannabis sales", and it needs a sponsor.

**Profile boastful** (outcome open)

**John Serrano:** You got a minute?

**John Serrano:** I want you to carry "Legalize cannabis sales".

You could say:

1. All right. I'll do it.
2. I wish I could, but I can't.
3. I'll carry it if you'll help me find the votes.  *(the page follows this one)*
4. Send me the draft. I'll read it tonight.
5. I'm already carrying two bills. I don't have room.

**John Serrano:** Deal. I'll start making calls tomorrow.

**John Serrano:** So where do you think the votes are?

You could say:

1. Where are we now?  *(the page follows this one)*
2. I can bring the members from my side.
3. Give me a list of everyone who's undecided.

**John Serrano:** Short. I'll have a real count by Friday.

You could say:

1. Good. That's a start.
2. That's not enough. We'll lose on the floor.  *(the page follows this one)*
3. I'll get you the rest.

**John Serrano:** Then help me change some minds.

You could say:

1. People say a lot of things.
2. You're right. I'll make the calls.
3. I have to go. Send me what you've got.  *(the page follows this one)*

**John Serrano:** Don't take too long.

**The whole exchange** (44 nodes; longest path 5 replies; ★ is the branch boastful's traits lean toward):

- You: All right. I'll do it.
  - John Serrano: I knew I could count on you.
  - *Ends resolved*
- You: I wish I could, but I can't.
  - John Serrano: Suit yourself.
  - *Ends refused*
- You ★: I'll carry it if you'll help me find the votes.
  - John Serrano: Deal. I'll start making calls tomorrow.
  - John Serrano: So where do you think the votes are?
  - You ★: Where are we now?
    - John Serrano: Short. I'll have a real count by Friday.
    - You: Good. That's a start.
      - John Serrano: I'll keep counting. You keep talking to them.
      - You: All right. Send it over when it's ready.
        - John Serrano: You'll have it by morning.
        - *Ends resolved*
      - You: Tonight would be better.
        - John Serrano: Tonight, then.
        - *Ends resolved*
      - You: I have to go. Send me what you've got.
        - *Ends open: John Serrano: Don't take too long.*
    - You ★: That's not enough. We'll lose on the floor.
      - John Serrano: Then help me change some minds.
      - You: People say a lot of things.
        - John Serrano: What would it take?
        - You: Okay. For you, I'll do it.
          - John Serrano: That's all I needed to hear.
          - *Ends resolved*
        - You: I've got to run. Call me tonight.
          - *Ends open: John Serrano: Don't take too long.*
      - You: You're right. I'll make the calls.
        - John Serrano: What would it take?
        - You: All right. You win. I'm in.
          - John Serrano: Good. I'll get you the file tonight.
          - *Ends resolved*
        - You: I'll tell you before the vote.
          - *Ends open: John Serrano: Think it over. I'll be back tomorrow.*
      - You ★: I have to go. Send me what you've got.
        - *Ends open: John Serrano: Don't take too long.*
    - You: I'll get you the rest.
      - John Serrano: That's what I wanted to hear.
      - *Ends resolved*
  - You: I can bring the members from my side.
    - John Serrano: Good. Start there, and I'll work the rest.
    - *Ends resolved*
  - You: Give me a list of everyone who's undecided.
    - John Serrano: I'll have it on your desk tomorrow.
    - You: Good. I'll start calling tonight.
      - John Serrano: I'll be at your door first thing.
      - *Ends resolved*
    - You: All right. Send it over when it's ready.
      - John Serrano: You'll have it by morning.
      - *Ends resolved*
    - You: Tonight would be better.
      - John Serrano: Tonight, then.
      - *Ends resolved*
    - You: I have to go. Send me what you've got.
      - *Ends open: John Serrano: Don't take too long.*
- You: Send me the draft. I'll read it tonight.
  - John Serrano: I need a yes or a no.
  - You: All right. You win. I'm in.
    - John Serrano: I knew I could count on you.
    - *Ends resolved*
  - You: Give me a list of everyone who's undecided.
    - John Serrano: I'll have it on your desk tomorrow.
    - You: Good. I'll start calling tonight.
      - John Serrano: I'll be at your door first thing.
      - *Ends resolved*
    - You: All right. Send it over when it's ready.
      - John Serrano: You'll have it by morning.
      - *Ends resolved*
    - You: Tonight would be better.
      - John Serrano: Tonight, then.
      - *Ends resolved*
    - You: I have to go. Send me what you've got.
      - *Ends open: John Serrano: Don't take too long.*
  - You: Where are we now?
    - John Serrano: Short. I'll have a real count by Friday.
    - You: Good. That's a start.
      - John Serrano: I'll keep counting. You keep talking to them.
      - You: All right. Send it over when it's ready.
        - John Serrano: You'll have it by morning.
        - *Ends resolved*
      - You: Tonight would be better.
        - John Serrano: Tonight, then.
        - *Ends resolved*
      - You: I have to be on the floor in five minutes.
        - *Ends open: John Serrano: Think it over. I'll be back tomorrow.*
    - You: That's not enough. We'll lose on the floor.
      - John Serrano: We have time. The vote isn't until next month.
      - You: All right. Let's keep counting.
        - John Serrano: I'll call you every night with the number.
        - *Ends resolved*
      - You: We don't have time, and you know it.
        - John Serrano: Let's not fight each other. Let's fight for the votes.
        - *Ends open: John Serrano: I won't forget this.*
      - You: I have to go. Send me what you've got.
        - *Ends open: John Serrano: Don't take too long.*
    - You: I'll get you the rest.
      - John Serrano: That's what I wanted to hear.
      - *Ends resolved*
  - You: I'll tell you before the vote.
    - *Ends open: John Serrano: Don't take too long.*
- You: I'm already carrying two bills. I don't have room.
  - *if not:*
    - John Serrano: I understand. Maybe next session.
    - *Ends resolved*

Other personalities: warm leans to “All right. I'll do it.” and it ends resolved; cold leans to “I can't take that on right now.” and it ends refused; stubborn leans to “I wish I could, but I can't.” and it ends open; anxious leans to “Send me the draft. I'll read it tonight.” and it ends resolved.

<sub>L1 narrate/narrate/scene-talk/curious/19w2s [scene-talk.narrate-narrate.name-comes-in-with-a-folder-under-one-arm-it-s-bill-and-it-needs-a-spo]; L2 open/greet/scene-talk/guarded/4w1s [scene-talk.open-greet.you-got-a-minute]; L3 state/request/scene-talk/hopeful/8w1s [scene-talk.state-request.i-want-you-to-carry-bill]; L4 reply/agree/scene-talk/calm/5w2s [scene-talk.reply-agree.all-right-i-ll-do-it]; L5 reply/decline/scene-talk/tender/7w1s [scene-talk.reply-decline.i-wish-i-could-but-i-can-t]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.i-ll-carry-it-if-you-ll-help-me-find-the-votes]; L7 reply/stall/scene-talk/calm/8w2s [scene-talk.reply-stall.send-me-the-draft-i-ll-read-it-tonight]; L8 reply/lie/scene-talk/guarded/9w2s [scene-talk.reply-lie.i-m-already-carrying-two-bills-i-don-t-have-room]; L11 follow/accept/scene-talk/glad/6w2s [scene-talk.follow-accept.deal-i-ll-start-making-calls-tomorrow]; L12 follow/ask/scene-talk/calm/8w1s [scene-talk.follow-ask.so-where-do-you-think-the-votes-are]; L13 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.where-are-we-now]; L14 reply/offer/scene-talk/calm/8w1s [scene-talk.reply-offer.i-can-bring-the-members-from-my-side]; L15 reply/request/scene-talk/calm/8w1s [scene-talk.reply-request.give-me-a-list-of-everyone-who-s-undecided]; L16 follow/answer/scene-talk/calm/8w2s [scene-talk.follow-answer.short-i-ll-have-a-real-count-by-friday]; L17 reply/thank/scene-talk/calm/4w2s [scene-talk.reply-thank.good-that-s-a-start]; L18 reply/disagree/scene-talk/guarded/8w2s [scene-talk.reply-disagree.that-s-not-enough-we-ll-lose-on-the-floor]; L19 reply/promise/scene-talk/calm/5w1s [scene-talk.reply-promise.i-ll-get-you-the-rest]; L27 follow/confront/scene-talk/braced/6w1s [scene-talk.follow-confront.then-help-me-change-some-minds]; L28 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L29 reply/apologize/scene-talk/calm/6w2s [scene-talk.reply-apologize.you-re-right-i-ll-make-the-calls]; L30 reply/leave/scene-talk/calm/9w2s [scene-talk.reply-leave.i-have-to-go-send-me-what-you-ve-got]; L41 close/press/scene-talk/braced/4w1s [scene-talk.close-press.don-t-take-too-long]</sub>

## Scene 6: donor-ask (favor-asked, ends in money) — proof scene

*Tests donor-ask; the asker is warm; a lie, caught and believed, a bargain, push-back, walking away. Records: filing:contest:seat:US-DE:attorney-general:2026-11-03:official:term:seat:US-DE:attorney-general:2026-10-12|person_9e002b561a4b2b6f, filing:contest:seat:US-DE:attorney-general:2026-11-03:official:term:seat:US-DE:attorney-general:2026-10-12, person_9e002b561a4b2b6f, official:term:seat:US-DE:attorney-general:2026-10-12.*

> Simon Riggs gave $11 to your campaign, most of what you raised. Now Simon Riggs is on the line.

**Profile warm** (outcome resolved)

**Simon Riggs:** Thanks for taking my call.

**Simon Riggs:** You know how much I put into your campaign. I need you on "Ban discrimination in housing and work".

You could say:

1. All right. I'll look at it again.
2. Let me get you with my chief of staff.  *(the page follows this one)*
3. I can't promise how I'll vote. I can promise you a hearing.
4. That's not a conversation for today.
5. I already pushed for that. It's moving.

**Simon Riggs:** Lunch after the session, then.

**The whole exchange** (21 nodes; longest path 3 replies; ★ is the branch warm's traits lean toward):

- You: All right. I'll look at it again.
  - Simon Riggs: I knew I could count on you.
  - *Ends resolved*
- You ★: Let me get you with my chief of staff.
  - Simon Riggs: Lunch after the session, then.
  - *Ends resolved*
- You: I can't promise how I'll vote. I can promise you a hearing.
  - Simon Riggs: Fair enough.
  - *Ends refused*
- You: That's not a conversation for today.
  - Simon Riggs: What would it take?
  - You: All right. You win. I'm in.
    - Simon Riggs: I knew you'd come around.
    - *Ends resolved*
  - You: I'll listen. I won't promise anything.
    - Simon Riggs: That's all I'm asking.
    - *Ends resolved*
  - You: I've got to run. Call me tonight.
    - *Ends open: Simon Riggs: Don't take too long.*
- You: I already pushed for that. It's moving.
  - *if Simon Riggs knows:*
    - Simon Riggs: Zachary Shepard says it never left committee.
    - You: Fine. I told them that. Then I changed my mind.
      - Simon Riggs: What changed?
      - You: The numbers did. Look at the second page.
        - Simon Riggs: Thank you. I won't forget it.
        - *Ends resolved*
      - You: I'm sorry. I just can't.
        - Simon Riggs: Then I'll take it up with somebody else.
        - *Ends refused*
      - You: That's all I've got for you.
        - *Ends open: Simon Riggs: Don't take too long.*
    - You: People say a lot of things.
      - Simon Riggs: Yes or no?
      - You: All right. You win. I'm in.
        - Simon Riggs: I knew you'd come around.
        - *Ends resolved*
      - You: I can't promise how I'll vote. I can promise you a hearing.
        - Simon Riggs: Suit yourself.
        - *Ends refused*
      - You: I'll listen. I won't promise anything.
        - Simon Riggs: That's all I'm asking.
        - *Ends open*
      - You: I've got to run. Call me tonight.
        - *Ends open: Simon Riggs: Don't take too long.*
    - You: Then Zachary Shepard has it wrong.
      - *Ends open: Simon Riggs: I'll remember you said that.*
  - *if not:*
    - Simon Riggs: Good to hear. Keep me posted.
    - *Ends resolved*

Other personalities: cold leans to “I can't promise how I'll vote. I can promise you a hearing.” and it ends refused; stubborn leans to “I can't promise how I'll vote. I can promise you a hearing.” and it ends refused; anxious leans to “I can't promise how I'll vote. I can promise you a hearing.” and it ends refused; boastful leans to “All right. I'll do it.” and it ends resolved.

<sub>L1 narrate/narrate/scene-talk/guarded/19w2s [scene-talk.narrate-narrate.name-gave-money-to-your-campaign-share-what-you-raised-now-name-is-on-]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.thanks-for-taking-my-call]; L3 state/request/scene-talk/braced/19w2s [scene-talk.state-request.you-know-how-much-i-put-into-your-campaign-i-need-you-on-bill]; L4 reply/agree/scene-talk/calm/7w2s [scene-talk.reply-agree.all-right-i-ll-look-at-it-again]; L5 reply/offer/scene-talk/calm/9w1s [scene-talk.reply-offer.let-me-get-you-with-my-chief-of-staff]; L6 reply/decline/scene-talk/guarded/12w2s [scene-talk.reply-decline.i-can-t-promise-how-i-ll-vote-i-can-promise-you-a-hearing]; L7 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.that-s-not-a-conversation-for-today]; L8 reply/lie/scene-talk/calm/7w2s [scene-talk.reply-lie.i-already-pushed-for-that-it-s-moving]; L10 follow/accept/scene-talk/calm/5w1s [scene-talk.follow-accept.lunch-after-the-session-then]</sub>

## Scene 7: party-ask (favor-asked, ends in political) — proof scene

*Tests party-ask; the asker is cold; a lie, caught and believed, a bargain, push-back, walking away. Records: party:US-DE:republican, filing:contest:seat:US-DE:us-house:00:2026-11-03:official:term:seat:US-DE:upper:019:0:2026-10-12, contest:seat:US-DE:us-house:00:2026-11-03, person_9e002a561a4b29bc, official:term:seat:US-DE:upper:019:0:2026-10-12.*

> Kelly Riggs, who chairs the Republican party, has asked to see you.

**Profile cold** (outcome refused)

**Kelly Riggs:** I've been meaning to call you.

**Kelly Riggs:** The party needs you to run for U.S. Representative.

You could say:

1. Me? Why me?

**Kelly Riggs:** Because you can win it. We've looked at the numbers.

You could say:

1. Yes. You can count on me.
2. Not this time.  *(the page follows this one)*
3. If I run, I'll need the party behind me all the way.
4. I have a job. Let me talk to my family first.
5. I'm seriously thinking about it.

**Kelly Riggs:** Suit yourself.

**The whole exchange** (30 nodes; longest path 4 replies; ★ is the branch cold's traits lean toward):

- Holly Emerson (without a choice): Me? Why me?
- Kelly Riggs: Because you can win it. We've looked at the numbers.
- You: Yes. You can count on me.
  - Kelly Riggs: Thank you. I won't forget it.
  - *Ends resolved*
- You ★: Not this time.
  - Kelly Riggs: Suit yourself.
  - *Ends refused*
- You: If I run, I'll need the party behind me all the way.
  - Kelly Riggs: You'll have it. Money, volunteers, all of it.
  - *Ends resolved*
- You: I have a job. Let me talk to my family first.
  - Kelly Riggs: Filing closes Friday. You know that.
  - You: All right. You win. I'm in.
    - Kelly Riggs: I knew you'd come around.
    - *Ends resolved*
  - You: I can't this time. Ask me in two years.
    - Kelly Riggs: Suit yourself.
    - *Ends refused*
  - You: I'll tell you before the vote.
    - *Ends open: Kelly Riggs: Think it over. I'll be back tomorrow.*
- You: I'm seriously thinking about it.
  - *if Kelly Riggs knows:*
    - Kelly Riggs: Zachary Shepard says you've already turned it down.
    - You: Okay. I said it. Things changed.
      - Kelly Riggs: What changed?
      - You: I read the whole bill.
        - Kelly Riggs: Good. I'll hold you to that.
        - *Ends resolved*
      - You: My family doesn't want me to.
        - Kelly Riggs: You should have told me weeks ago.
        - You: Fine. I'll do it, but this is the last time.
          - Kelly Riggs: Good. I'll call the county chairs in the morning.
          - *Ends resolved*
        - You: I can't this time. Ask me in two years.
          - Kelly Riggs: All right. I had to ask.
          - *Ends refused*
        - You: If I run, I'll need the party behind me all the way.
          - Kelly Riggs: You'll have it. Money, volunteers, all of it.
          - *Ends open*
        - You: I'll tell you before the vote.
          - *Ends open: Kelly Riggs: Don't take too long.*
      - You: It's personal.
        - Kelly Riggs: What would it take?
        - You: All right. You win. I'm in.
          - Kelly Riggs: I knew you'd come around.
          - *Ends resolved*
        - You: I can't this time. Ask me in two years.
          - Kelly Riggs: Fair enough.
          - *Ends refused*
        - You: If I run, I'll need the party behind me all the way.
          - Kelly Riggs: You'll have it. Money, volunteers, all of it.
          - *Ends open*
        - You: I've got to run. Call me tonight.
          - *Ends open: Kelly Riggs: Don't take too long.*
      - You: That's all I've got for you.
        - *Ends open: Kelly Riggs: Don't take too long.*
    - You: People say a lot of things.
      - Kelly Riggs: What would it take?
      - You: Fine. I'll do it, but this is the last time.
        - Kelly Riggs: Good. I'll hold you to that.
        - *Ends resolved*
      - You: I can't this time. Ask me in two years.
        - Kelly Riggs: Fair enough.
        - *Ends refused*
      - You: If I run, I'll need the party behind me all the way.
        - Kelly Riggs: You'll have it. Money, volunteers, all of it.
        - *Ends open*
      - You: I'll tell you before the vote.
        - *Ends open: Kelly Riggs: Don't take too long.*
    - You: Then Zachary Shepard has it wrong.
      - *Ends open: Kelly Riggs: I'll remember you said that.*
  - *if not:*
    - Kelly Riggs: Good. Don't take too long.
    - *Ends resolved*

Other personalities: warm leans to “All right. I'll do it.” and it ends resolved; stubborn leans to “Not this time.” and it ends open; anxious leans to “I have a job. Let me talk to my family first.” and it ends open; boastful leans to “If I run, I'll need the party behind me all the way.” and it ends resolved.

<sub>L1 narrate/narrate/scene-talk/braced/12w1s [scene-talk.narrate-narrate.name-who-chairs-the-party-party-has-asked-to-see-you]; L2 open/greet/scene-talk/calm/6w1s [scene-talk.open-greet.i-ve-been-meaning-to-call-you]; L3 state/request/scene-talk/hopeful/9w2s [scene-talk.state-request.the-party-needs-you-to-run-for-office]; L4 auto/ask/scene-talk/curious/3w2s [scene-talk.auto-ask.me-why-me]; L5 follow/answer/scene-talk/calm/10w2s [scene-talk.follow-answer.because-you-can-win-it-we-ve-looked-at-the-numbers]; L6 reply/agree/scene-talk/glad/6w2s [scene-talk.reply-agree.yes-you-can-count-on-me]; L7 reply/refuse/scene-talk/guarded/3w1s [scene-talk.reply-refuse.not-this-time]; L8 reply/bargain/scene-talk/guarded/12w1s [scene-talk.reply-bargain.if-i-run-i-ll-need-the-party-behind-me-all-the-way]; L9 reply/stall/scene-talk/nervous/11w2s [scene-talk.reply-stall.i-have-a-job-let-me-talk-to-my-family-first]; L10 reply/lie/scene-talk/calm/5w1s [scene-talk.reply-lie.i-m-seriously-thinking-about-it]; L12 follow/accept/scene-talk/guarded/2w1s [scene-talk.follow-accept.suit-yourself]</sub>

## Scene 8: office-hours (favor-asked, ends in money) — proof scene

*Tests constituent-help; the asker is stubborn; a lie, caught and believed, push-back, walking away. Records: person_5df2739ae2587c09:2027-05-23:event:housing.eviction:eviction:lease:household_e3b7a1c2299a39ab:2027-05-06, event:housing.eviction:eviction:lease:household_e3b7a1c2299a39ab:2027-05-06, person_5df2739ae2587c09, person_d3c12275ee46b085.*

> Andrew Robbins lives in Brookside and has come to your office for help.

**Profile stubborn** (outcome resolved)

**Andrew Robbins:** Thank you for seeing me.

**Andrew Robbins:** We're being evicted, and I need help.

You could say:

1. I can ask them to look at it again. I can't promise how it comes out.  *(the page follows this one)*
2. When did this start?
3. I'm not sure my office can help with that.
4. Let me have someone from my office call you tomorrow.
5. I already called them about it.

**Andrew Robbins:** Thank you. That's more than anyone else has done.

**The whole exchange** (14 nodes; longest path 4 replies; ★ is the branch stubborn's traits lean toward):

- You ★: I can ask them to look at it again. I can't promise how it comes out.
  - Andrew Robbins: Thank you. That's more than anyone else has done.
  - *Ends resolved*
- You: When did this start?
  - Andrew Robbins: A few months now. It's been hard to keep up.
  - *Ends open: Andrew Robbins: Please don't forget about us.*
- You: I'm not sure my office can help with that.
  - Andrew Robbins: I've got nowhere else to go.
  - *Ends refused*
- You: Let me have someone from my office call you tomorrow.
  - Andrew Robbins: Thank you. That's more than anyone else has done.
  - *Ends resolved*
- You: I already called them about it.
  - *if Andrew Robbins knows:*
    - Andrew Robbins: They told me nobody's called.
    - You: Fine. I told them that. Then I changed my mind.
      - Andrew Robbins: Okay. At least you said it.
      - *Ends open*
    - You: They lose half of what we send them.
      - Andrew Robbins: Then what are you for?
      - You: You're right. I'll call while you're sitting here.
        - Andrew Robbins: When? Today?
        - You: I have someone waiting. Leave your number at the front desk.
          - *Ends open: Andrew Robbins: Please don't forget about us.*
      - You: I have someone waiting. Leave your number at the front desk.
        - *Ends open: Andrew Robbins: Please don't forget about us.*
    - You: I called. They must have lost the message.
      - *Ends open: Andrew Robbins: Then we'll see who's right.*
  - *if not:*
    - Andrew Robbins: Thank you. I'll wait to hear from them.
    - *Ends resolved*

Other personalities: warm leans to “Bring me the letter they sent you. I need the date on it.” and it ends open; cold leans to “I can ask them to look at it again. I can't promise how it comes out.” and it ends resolved; anxious leans to “I can ask them to look at it again. I can't promise how it comes out.” and it ends resolved; boastful leans to “I can ask them to look at it again. I can't promise how it comes out.” and it ends resolved.

<sub>L1 narrate/narrate/scene-talk/calm/13w1s [scene-talk.narrate-narrate.name-lives-in-place-and-has-come-to-your-office-for-help]; L2 open/greet/scene-talk/nervous/5w1s [scene-talk.open-greet.thank-you-for-seeing-me]; L3 state/request/scene-talk/anxious/7w1s [scene-talk.state-request.we-re-being-evicted-and-i-need-help]; L4 reply/promise/scene-talk/calm/16w2s [scene-talk.reply-promise.i-can-ask-them-to-look-at-it-again-i-can-t-promise-how-it-comes-out]; L5 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.when-did-this-start]; L6 reply/decline/scene-talk/guarded/9w1s [scene-talk.reply-decline.i-m-not-sure-my-office-can-help-with-that]; L7 reply/offer/scene-talk/tender/10w1s [scene-talk.reply-offer.let-me-have-someone-from-my-office-call-you-tomorrow]; L8 reply/lie/scene-talk/calm/6w1s [scene-talk.reply-lie.i-already-called-them-about-it]; L9 follow/thank/scene-talk/tender/9w2s [scene-talk.follow-thank.thank-you-that-s-more-than-anyone-else-has-done]</sub>

## Scene 9: family-filing (news-received, ends in political) — proof scene

*Tests family-filing; the asker is warm; push-back, walking away. Records: filing:contest:seat:gus2025:101811:board:6:2026-11-03:person_d3c12275ee46b085, contest:seat:gus2025:101811:board:6:2026-11-03, person_d3c11e75ee46a9b9, person_d3c12275ee46b085.*

> Word that you filed for County Commissioner got home before you did. Bentley Rivas is waiting.

**Profile warm** (outcome resolved)

**Bentley Rivas:** There you are.

**Bentley Rivas:** Why didn't you tell me you were running?

You could say:

1. Who told you?

**Bentley Rivas:** Amanda Nixon told me.

You could say:

1. I didn't tell you because I wasn't sure I'd go through with it.  *(the page follows this one)*
2. I'm going to need you on the phones.
3. I was going to tell you tonight.
4. We'll figure it out together. I promise.

**Bentley Rivas:** And now you're sure?

You could say:

1. You're right. I should have told you first.  *(the page follows this one)*

**Bentley Rivas:** Yes, you should have.

**The whole exchange** (12 nodes; longest path 2 replies; ★ is the branch warm's traits lean toward):

- Latoya Rivas (without a choice): Who told you?
- Bentley Rivas: Amanda Nixon told me.
- You ★: I didn't tell you because I wasn't sure I'd go through with it.
  - Bentley Rivas: And now you're sure?
  - You ★: You're right. I should have told you first.
    - Bentley Rivas: Yes, you should have.
    - *Ends resolved*
- You: I'm going to need you on the phones.
  - Bentley Rivas: I'll do the yard signs. Not the phone calls.
  - You: Thank you. I mean it.
    - Bentley Rivas: Okay. Next time, tell me first.
    - *Ends resolved*
  - You: That's all I'm asking.
    - Bentley Rivas: Okay. But you're telling your mother.
    - *Ends resolved*
  - You: I'm going to bed. We'll talk in the morning.
    - *Ends open: Bentley Rivas: Talk to me tomorrow. Promise.*
- You: I was going to tell you tonight.
  - Bentley Rivas: No. We talk about it now.
  - You: You're right. I should have told you first.
    - Bentley Rivas: Yes, you should have.
    - *Ends resolved*
  - You: I won't let it take over our lives.
    - Bentley Rivas: I'll hold you to that.
    - *Ends resolved*
  - You: I'm going to bed. We'll talk in the morning.
    - *Ends open: Bentley Rivas: Talk to me tomorrow. Promise.*
- You: We'll figure it out together. I promise.
  - Bentley Rivas: Next time I hear it from you first.
  - *Ends resolved*

Other personalities: cold leans to “It's been a long day.” and it ends resolved; stubborn leans to “I didn't tell you because I wasn't sure I'd go through with it.” and it ends resolved; anxious leans to “I was going to tell you tonight.” and it ends resolved.

<sub>L1 narrate/narrate/scene-talk/anxious/16w2s [scene-talk.narrate-narrate.word-that-you-filed-for-office-got-home-before-you-did-name-is-waiting]; L2 open/greet/scene-talk/anxious/3w1s [scene-talk.open-greet.there-you-are]; L3 state/ask/scene-talk/hurt/8w1s [scene-talk.state-ask.why-didn-t-you-tell-me-you-were-running]; L4 auto/ask/scene-talk/nervous/3w1s [scene-talk.auto-ask.who-told-you]; L5 follow/answer/scene-talk/hurt/4w1s [scene-talk.follow-answer.source-told-me]; L6 reply/tell/scene-talk/contrite/13w1s [scene-talk.reply-tell.i-didn-t-tell-you-because-i-wasn-t-sure-i-d-go-through-with-it]; L7 reply/request/scene-talk/hopeful/8w1s [scene-talk.reply-request.i-m-going-to-need-you-on-the-phones]; L8 reply/deflect/scene-talk/nervous/7w1s [scene-talk.reply-deflect.i-was-going-to-tell-you-tonight]; L9 reply/comfort/scene-talk/tender/7w2s [scene-talk.reply-comfort.we-ll-figure-it-out-together-i-promise]; L10 follow/ask/scene-talk/anxious/4w1s [scene-talk.follow-ask.and-now-you-re-sure]; L11 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.you-re-right-i-should-have-told-you-first]; L12 follow/accept/scene-talk/hurt/4w1s [scene-talk.follow-accept.yes-you-should-have]</sub>

## Scene 10: family-win (honor, ends in political) — proof scene

*Tests family-win; the asker is boastful; push-back. Records: result:contest:seat:gus2025:101811:board:0:2026-11-03, contest:seat:gus2025:101811:board:0:2026-11-03, person_9e002a561a4b29bc.*

> You won. Simon Riggs is waiting at the door when you get home.

**Profile boastful** (outcome resolved)

**Simon Riggs:** Come here.

**Simon Riggs:** County Commissioner. You really did it.

You could say:

1. I couldn't have done it without you.  *(the page follows this one)*
2. Things will settle down now. I promise.
3. Not bad for a first run, right?
4. I still can't believe it.

**Simon Riggs:** Your phone hasn't stopped buzzing.

**The whole exchange** (6 nodes; longest path 2 replies; ★ is the branch boastful's traits lean toward):

- You ★: I couldn't have done it without you.
  - Simon Riggs: Your phone hasn't stopped buzzing.
  - *Ends resolved*
- You: Things will settle down now. I promise.
  - Simon Riggs: Go get some sleep. Big day tomorrow.
  - *Ends resolved*
- You: Not bad for a first run, right?
  - Simon Riggs: Okay, okay. You won. Come inside.
  - *Ends open: Simon Riggs: Your phone is going to ring all night.*
- You: I still can't believe it.
  - Simon Riggs: So what happens now?
  - You: Now I find out where they keep the pens.
    - Simon Riggs: Go get some sleep. Big day tomorrow.
    - *Ends resolved*

Other personalities: warm leans to “I couldn't have done it without you.” and it ends resolved; cold leans to “I couldn't have done it without you.” and it ends resolved; stubborn leans to “I couldn't have done it without you.” and it ends resolved; anxious leans to “I couldn't have done it without you.” and it ends resolved.

<sub>L1 narrate/narrate/scene-talk/glad/13w2s [scene-talk.narrate-narrate.you-won-name-is-waiting-at-the-door-when-you-get-home]; L2 open/greet/scene-talk/tender/2w1s [scene-talk.open-greet.come-here]; L3 state/congratulate/scene-talk/glad/6w2s [scene-talk.state-congratulate.office-you-really-did-it]; L4 reply/thank/scene-talk/glad/7w1s [scene-talk.reply-thank.i-couldn-t-have-done-it-without-you]; L5 reply/promise/scene-talk/tender/7w2s [scene-talk.reply-promise.things-will-settle-down-now-i-promise]; L6 reply/boast/scene-talk/proud/7w1s [scene-talk.reply-boast.not-bad-for-a-first-run-right]; L7 reply/tell/scene-talk/glad/5w1s [scene-talk.reply-tell.i-still-can-t-believe-it]; L8 follow/promise/scene-talk/glad/5w1s [scene-talk.follow-promise.your-phone-hasn-t-stopped-buzzing]</sub>

## Scene 11: family-loss (loss, ends in political) — proof scene

*Tests family-loss; the asker is warm; push-back. Records: result:contest:seat:US-DE:us-house:00:2026-11-03, contest:seat:US-DE:us-house:00:2026-11-03, person_11d13d68898d12e8, person_11d13e68898d149b, official:term:seat:US-DE:us-house:00:2026-10-12.*

> You lost the race for U.S. Representative. The house is quiet when you get home, and Justin McConnell is still up.

**Profile warm** (outcome resolved)

**Justin McConnell:** I saved you a plate.

**Justin McConnell:** You don't have to talk about it.

You could say:

1. You call her. I can't tonight.
2. Julie Nolan ran a dirty race.
3. I'm fine. Really.
4. This isn't the end of it.  *(the page follows this one)*

**Justin McConnell:** Are you sure that's what you want?

You could say:

1. It's hard to hear it was that close.  *(the page follows this one)*

**Justin McConnell:** Eat something first.

**The whole exchange** (6 nodes; longest path 2 replies; ★ is the branch warm's traits lean toward):

- You: You call her. I can't tonight.
  - Justin McConnell: Come to bed. It'll still be true in the morning.
  - *Ends resolved*
- You: Julie Nolan ran a dirty race.
  - Justin McConnell: You knocked every door on our street. I watched.
  - *Ends open: Justin McConnell: I'm here when you want to talk.*
- You: I'm fine. Really.
  - Justin McConnell: Talk to me.
  - *Ends open: Justin McConnell: I'm here when you want to talk.*
- You ★: This isn't the end of it.
  - Justin McConnell: Are you sure that's what you want?
  - You ★: It's hard to hear it was that close.
    - Justin McConnell: Eat something first.
    - *Ends resolved*

Other personalities: cold leans to “I'll run again.” and it ends resolved; stubborn leans to “This isn't the end of it.” and it ends resolved; anxious leans to “This isn't the end of it.” and it ends resolved; boastful leans to “This isn't the end of it.” and it ends resolved.

<sub>L1 narrate/narrate/scene-talk/solemn/21w3s [scene-talk.narrate-narrate.you-lost-the-race-for-office-the-house-is-quiet-when-you-get-home-and-]; L2 open/greet/scene-talk/tender/5w1s [scene-talk.open-greet.i-saved-you-a-plate]; L3 state/comfort/scene-talk/tender/7w1s [scene-talk.state-comfort.you-don-t-have-to-talk-about-it]; L4 reply/thank/scene-talk/hurt/6w2s [scene-talk.reply-thank.you-call-her-i-can-t-tonight]; L5 reply/blame/scene-talk/braced/6w1s [scene-talk.reply-blame.opponent-ran-a-dirty-race]; L6 reply/deflect/scene-talk/guarded/3w2s [scene-talk.reply-deflect.i-m-fine-really]; L7 reply/promise/scene-talk/braced/6w1s [scene-talk.reply-promise.this-isn-t-the-end-of-it]; L13 follow/ask/scene-talk/anxious/7w1s [scene-talk.follow-ask.are-you-sure-that-s-what-you-want]; L14 reply/tell/scene-talk/hurt/8w1s [scene-talk.reply-tell.it-s-hard-to-hear-it-was-that-close]; L15 follow/comfort/scene-talk/tender/3w1s [scene-talk.follow-comfort.eat-something-first]</sub>

## Scene 12: family-absence (threat, ends in political) — proof scene

*Tests family-absence; the asker is cold; a lie, caught and believed, push-back, walking away. Records: term:seat:gus2025:101811:board:3:2026-10-12, person_bc041cf6bd9d1894, person_bc041df6bd9d1a47.*

> You've been at the office late every night this week. Olivia Keller is waiting up for you.

**Profile cold** (outcome open)

**Olivia Keller:** You're home.

**Olivia Keller:** We hardly see you since you took office.

You could say:

1. I've let things slide at home. I know.
2. I'll be home more. I promise.
3. Can we not do this tonight?
4. This job doesn't leave much time. You know that.  *(the page follows this one)*
5. It was a late committee meeting. That's all.

**Olivia Keller:** We miss you. That's all.

**Olivia Keller:** I'm going to bed. We'll talk tomorrow.

**The whole exchange** (109 nodes; longest path 5 replies; ★ is the branch cold's traits lean toward):

- You: I've let things slide at home. I know.
  - Olivia Keller: I just miss you, that's all.
  - *Ends resolved*
- You: I'll be home more. I promise.
  - Olivia Keller: You said that last month.
  - *Ends resolved*
- You: Can we not do this tonight?
  - Olivia Keller: We miss you. That's all.
  - *Ends open: Olivia Keller: I'm going to bed. We'll talk tomorrow.*
- You ★: This job doesn't leave much time. You know that.
  - Olivia Keller: We miss you. That's all.
  - *Ends open: Olivia Keller: I'm going to bed. We'll talk tomorrow.*
- You: It was a late committee meeting. That's all.
  - *if Olivia Keller knows:*
    - Olivia Keller: I called the office. There was no meeting.
    - You: You're right. I'm sorry.
      - Olivia Keller: Thank you for telling me.
      - You: Thank you for waiting up.
        - Olivia Keller: Your plate's in the oven.
        - You: It's been a hard week at the office.
          - Olivia Keller: Come sit down. Tell me about it.
          - *Ends resolved*
        - You: I'll be home more. I promise.
          - Olivia Keller: You said that last month.
          - You: This weekend is ours. No calls.
            - Olivia Keller: I'm holding you to it.
            - *Ends resolved*
          - You: I've let things slide at home. I know.
            - Olivia Keller: I just miss you, that's all.
            - *Ends resolved*
          - You: I'm doing this for us, too.
            - Olivia Keller: We didn't ask for this.
            - *Ends open: Olivia Keller: We're not done talking about this.*
          - You: Come here.
            - Olivia Keller: Sit down. I'll heat it up.
            - *Ends resolved*
          - You: I'm going to bed. We'll talk in the morning.
            - *Ends open: Olivia Keller: I'm going to bed. We'll talk tomorrow.*
        - You: It's just a busy stretch.
          - Olivia Keller: You said that last time.
          - You: This weekend is ours. No calls.
            - Olivia Keller: I'm holding you to it.
            - *Ends resolved*
          - You: I've let things slide at home. I know.
            - Olivia Keller: I just miss you, that's all.
            - *Ends resolved*
          - You: This job doesn't leave much time. You know that.
            - Olivia Keller: We miss you. That's all.
            - *Ends open: Olivia Keller: We're not done talking about this.*
          - You: Come here.
            - Olivia Keller: Sit down. I'll heat it up.
            - *Ends resolved*
          - You: I'm going to bed. We'll talk in the morning.
            - *Ends open: Olivia Keller: I'm going to bed. We'll talk tomorrow.*
      - You: It's been a hard week at the office.
        - Olivia Keller: Come sit down. Tell me about it.
        - You: Thank you for waiting up.
          - Olivia Keller: Your plate's in the oven.
          - *Ends resolved*
        - You: I'll be home more. I promise.
          - Olivia Keller: You said that last month.
          - You: This weekend is ours. No calls.
            - Olivia Keller: I'm holding you to it.
            - *Ends resolved*
          - You: I've let things slide at home. I know.
            - Olivia Keller: I just miss you, that's all.
            - *Ends resolved*
          - You: I'm doing this for us, too.
            - Olivia Keller: We didn't ask for this.
            - *Ends open: Olivia Keller: We're not done talking about this.*
          - You: Come here.
            - Olivia Keller: Sit down. I'll heat it up.
            - *Ends resolved*
          - You: I'm going to take a shower.
            - *Ends open: Olivia Keller: I'm going to bed. We'll talk tomorrow.*
        - You: Can we not do this tonight?
          - Olivia Keller: You said that last time.
          - You: This weekend is ours. No calls.
            - Olivia Keller: I'm holding you to it.
            - *Ends resolved*
          - You: I've let things slide at home. I know.
            - Olivia Keller: I just miss you, that's all.
            - *Ends resolved*
          - You: This job doesn't leave much time. You know that.
            - Olivia Keller: We miss you. That's all.
            - *Ends open: Olivia Keller: I'm going to bed. We'll talk tomorrow.*
          - You: Come here.
            - Olivia Keller: Sit down. I'll heat it up.
            - *Ends resolved*
          - You: I'm going to take a shower.
            - *Ends open: Olivia Keller: I'm going to bed. We'll talk tomorrow.*
      - You: I'll be home more. I promise.
        - Olivia Keller: You said that last month.
        - You: This weekend is ours. No calls.
          - Olivia Keller: I'm holding you to it.
          - *Ends resolved*
        - You: I've let things slide at home. I know.
          - Olivia Keller: I just miss you, that's all.
          - *Ends resolved*
        - You: This job doesn't leave much time. You know that.
          - Olivia Keller: We miss you. That's all.
          - You: This weekend is ours. No calls.
            - Olivia Keller: I'm holding you to it.
            - *Ends resolved*
          - You: I've let things slide at home. I know.
            - Olivia Keller: I just miss you, that's all.
            - *Ends resolved*
          - You: Can we not do this tonight?
            - Olivia Keller: I've heard that before.
            - *Ends open: Olivia Keller: We're not done talking about this.*
        - You: Come here.
          - Olivia Keller: Sit down. I'll heat it up.
          - You: Thank you for waiting up.
            - Olivia Keller: Your plate's in the oven.
            - *Ends resolved*
          - You: It's been a hard week at the office.
            - Olivia Keller: Come sit down. Tell me about it.
            - *Ends resolved*
          - You: Can we not do this tonight?
            - Olivia Keller: I've heard that before.
            - *Ends open: Olivia Keller: We're not done talking about this.*
        - You: I'm going to bed. We'll talk in the morning.
          - *Ends open: Olivia Keller: I'm going to bed. We'll talk tomorrow.*
      - You: Can we not do this tonight?
        - Olivia Keller: I've heard that before.
        - You: This weekend is ours. No calls.
          - Olivia Keller: I'm holding you to it.
          - *Ends resolved*
        - You: I've let things slide at home. I know.
          - Olivia Keller: I just miss you, that's all.
          - *Ends resolved*
        - You: This job doesn't leave much time. You know that.
          - Olivia Keller: We miss you. That's all.
          - You: This weekend is ours. No calls.
            - Olivia Keller: I'm holding you to it.
            - *Ends resolved*
          - You: I've let things slide at home. I know.
            - Olivia Keller: I just miss you, that's all.
            - *Ends resolved*
          - You: It's just a busy stretch.
            - Olivia Keller: You said that last time.
            - *Ends open: Olivia Keller: We're not done talking about this.*
        - You: Come here.
          - Olivia Keller: Sit down. I'll heat it up.
          - You: Thank you for waiting up.
            - Olivia Keller: Your plate's in the oven.
            - *Ends resolved*
          - You: It's been a hard week at the office.
            - Olivia Keller: Come sit down. Tell me about it.
            - *Ends resolved*
          - You: I'll be home more. I promise.
            - Olivia Keller: You said that last month.
            - *Ends resolved*
          - You: It's just a busy stretch.
            - Olivia Keller: You said that last time.
            - *Ends open: Olivia Keller: We're not done talking about this.*
        - You: I'm going to bed. We'll talk in the morning.
          - *Ends open: Olivia Keller: I'm going to bed. We'll talk tomorrow.*
    - You: Can we not do this tonight?
      - Olivia Keller: You said that last time.
      - You: This weekend is ours. No calls.
        - Olivia Keller: I'm holding you to it.
        - *Ends resolved*
      - You: I've let things slide at home. I know.
        - Olivia Keller: I just miss you, that's all.
        - *Ends resolved*
      - You: I'm doing this for us, too.
        - Olivia Keller: We didn't ask for this.
        - You: You're right. I'm sorry.
          - Olivia Keller: Saying sorry isn't the same as being here.
          - You: This weekend is ours. No calls.
            - Olivia Keller: I'm holding you to it.
            - *Ends resolved*
          - You: I've let things slide at home. I know.
            - Olivia Keller: I just miss you, that's all.
            - *Ends resolved*
          - You: This job doesn't leave much time. You know that.
            - Olivia Keller: We miss you. That's all.
            - *Ends open: Olivia Keller: We're not done talking about this.*
          - You: Come here.
            - Olivia Keller: Sit down. I'll heat it up.
            - *Ends resolved*
          - You: I'm going to bed. We'll talk in the morning.
            - *Ends open: Olivia Keller: I'm going to bed. We'll talk tomorrow.*
        - You: This job doesn't leave much time. You know that.
          - Olivia Keller: We miss you. That's all.
          - You: This weekend is ours. No calls.
            - Olivia Keller: I'm holding you to it.
            - *Ends resolved*
          - You: You're right. I'm sorry.
            - Olivia Keller: Saying sorry isn't the same as being here.
            - *Ends resolved*
          - You: It's just a busy stretch.
            - Olivia Keller: I've heard that before.
            - *Ends open: Olivia Keller: We're not done talking about this.*
        - You: I'll be home more. I promise.
          - Olivia Keller: You said that last month.
          - You: This weekend is ours. No calls.
            - Olivia Keller: I'm holding you to it.
            - *Ends resolved*
          - You: I've let things slide at home. I know.
            - Olivia Keller: I just miss you, that's all.
            - *Ends resolved*
          - You: This job doesn't leave much time. You know that.
            - Olivia Keller: We miss you. That's all.
            - *Ends open: Olivia Keller: We're not done talking about this.*
          - You: Come here.
            - Olivia Keller: Sit down. I'll heat it up.
            - *Ends resolved*
          - You: I'm going to bed. We'll talk in the morning.
            - *Ends open: Olivia Keller: I'm going to bed. We'll talk tomorrow.*
        - You: Come here.
          - Olivia Keller: Sit down. I'll heat it up.
          - You: Thank you for waiting up.
            - Olivia Keller: Your plate's in the oven.
            - *Ends resolved*
          - You: It's been a hard week at the office.
            - Olivia Keller: Come sit down. Tell me about it.
            - *Ends resolved*
          - You: I'll be home more. I promise.
            - Olivia Keller: You said that last month.
            - *Ends resolved*
          - You: It's just a busy stretch.
            - Olivia Keller: I've heard that before.
            - *Ends open: Olivia Keller: We're not done talking about this.*
        - You: I'm going to bed. We'll talk in the morning.
          - *Ends open: Olivia Keller: I'm going to bed. We'll talk tomorrow.*
      - You: Come here.
        - Olivia Keller: Sit down. I'll heat it up.
        - You: Thank you for waiting up.
          - Olivia Keller: Your plate's in the oven.
          - You: It's been a hard week at the office.
            - Olivia Keller: Come sit down. Tell me about it.
            - *Ends resolved*
          - You: I'll be home more. I promise.
            - Olivia Keller: You said that last month.
            - *Ends resolved*
          - You: It's just a busy stretch.
            - Olivia Keller: I've heard that before.
            - *Ends open: Olivia Keller: We're not done talking about this.*
        - You: It's been a hard week at the office.
          - Olivia Keller: Come sit down. Tell me about it.
          - You: Thank you for waiting up.
            - Olivia Keller: Your plate's in the oven.
            - *Ends resolved*
          - You: I'll be home more. I promise.
            - Olivia Keller: You said that last month.
            - *Ends resolved*
          - You: It's just a busy stretch.
            - Olivia Keller: I've heard that before.
            - *Ends open: Olivia Keller: We're not done talking about this.*
        - You: I'll be home more. I promise.
          - Olivia Keller: You said that last month.
          - You: This weekend is ours. No calls.
            - Olivia Keller: I'm holding you to it.
            - *Ends resolved*
          - You: I've let things slide at home. I know.
            - Olivia Keller: I just miss you, that's all.
            - *Ends resolved*
          - You: I'm doing this for us, too.
            - Olivia Keller: We didn't ask for this.
            - *Ends open: Olivia Keller: We're not done talking about this.*
          - You: I'm going to bed. We'll talk in the morning.
            - *Ends open: Olivia Keller: I'm going to bed. We'll talk tomorrow.*
        - You: It's just a busy stretch.
          - Olivia Keller: I've heard that before.
          - You: This weekend is ours. No calls.
            - Olivia Keller: I'm holding you to it.
            - *Ends resolved*
          - You: You're right. I'm sorry.
            - Olivia Keller: Saying sorry isn't the same as being here.
            - *Ends resolved*
          - You: I'm doing this for us, too.
            - Olivia Keller: We didn't ask for this.
            - *Ends open: Olivia Keller: We're not done talking about this.*
          - You: I'm going to take a shower.
            - *Ends open: Olivia Keller: I'm going to bed. We'll talk tomorrow.*
      - You: I'm going to bed. We'll talk in the morning.
        - *Ends open: Olivia Keller: I'm going to bed. We'll talk tomorrow.*
    - You: This is the last late night. I promise.
      - *Ends open: Olivia Keller: We're not done talking about this.*
  - *if not:*
    - Olivia Keller: Okay. Come eat something.
    - *Ends resolved*

Other personalities: warm leans to “I'll be home more. I promise.” and it ends resolved; stubborn leans to “I'm doing this for us, too.” and it ends open; anxious leans to “I'm doing this for us, too.” and it ends open; boastful leans to “I'm doing this for us, too.” and it ends open.

<sub>L1 narrate/narrate/scene-talk/hurt/17w2s [scene-talk.narrate-narrate.you-ve-been-at-the-office-late-every-night-this-week-name-is-waiting-u]; L2 open/greet/scene-talk/hurt/2w1s [scene-talk.open-greet.you-re-home]; L3 state/confront/scene-talk/hurt/8w1s [scene-talk.state-confront.we-hardly-see-you-since-you-took-office]; L4 reply/apologize/scene-talk/contrite/8w2s [scene-talk.reply-apologize.i-ve-let-things-slide-at-home-i-know]; L5 reply/promise/scene-talk/contrite/6w2s [scene-talk.reply-promise.i-ll-be-home-more-i-promise]; L6 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.can-we-not-do-this-tonight]; L7 reply/blame/scene-talk/guarded/9w2s [scene-talk.reply-blame.this-job-doesn-t-leave-much-time-you-know-that]; L8 reply/lie/scene-talk/nervous/8w2s [scene-talk.reply-lie.it-was-a-late-committee-meeting-that-s-all]; L13 follow/plea/scene-talk/tender/5w2s [scene-talk.follow-plea.we-miss-you-that-s-all]; L14 close/press/scene-talk/hurt/7w2s [scene-talk.close-press.i-m-going-to-bed-we-ll-talk-tomorrow]</sub>

## Scene 13: rally-opponent (threat, ends in political) — proof scene

*Tests rally-opponent; the asker is warm; a lie, caught and believed, push-back. Records: filing:contest:seat:gus2025:101811:sheriff:0:2026-11-03:person_f9be8ef45e5d143f, official:term:seat:US-DE:treasurer:2026-10-12, person_f9be8ef45e5d143f.*

> Michael Norton is working the same crowd. Now Michael Norton is walking straight toward you.

**Profile warm** (outcome open)

**Michael Norton:** I didn't expect to see you here.

**Michael Norton:** Nice speech. Too bad none of it was true.

You could say:

1. Tell that to the people who just clapped.  *(the page follows this one)*
2. People say a lot of things.
3. Say that on the debate stage.
4. Look at this crowd. People know where I stand.
5. I'm up six points. Check the paper.

**Michael Norton:** You'd better hope they don't look too closely.

**Michael Norton:** See you on election day.

**The whole exchange** (7 nodes; longest path 1 replies; ★ is the branch warm's traits lean toward):

- You ★: Tell that to the people who just clapped.
  - Michael Norton: You'd better hope they don't look too closely.
  - *Ends open: Michael Norton: See you on election day.*
- You: People say a lot of things.
  - Michael Norton: I've been here longer than you have.
  - *Ends open: Michael Norton: This isn't over.*
- You: Say that on the debate stage.
  - Michael Norton: I've been here longer than you have.
  - *Ends open: Michael Norton: This isn't over.*
- You: Look at this crowd. People know where I stand.
  - Michael Norton: Say that to the voters.
  - *Ends open: Michael Norton: This isn't over.*
- You: I'm up six points. Check the paper.
  - *if not:*
    - Michael Norton: We'll see in November.
    - *Ends resolved*

Other personalities: cold leans to “That's not true, and you know it.” and it ends open; stubborn leans to “That's not true, and you know it.” and it ends open; anxious leans to “Tell that to the people who just clapped.” and it ends open.

<sub>L1 narrate/narrate/scene-talk/braced/15w2s [scene-talk.narrate-narrate.name-is-working-the-same-crowd-now-name-is-walking-straight-toward-you]; L2 open/greet/scene-talk/braced/7w1s [scene-talk.open-greet.i-didn-t-expect-to-see-you-here]; L3 state/confront/scene-talk/braced/9w2s [scene-talk.state-confront.nice-speech-too-bad-none-of-it-was-true]; L4 reply/disagree/scene-talk/braced/8w1s [scene-talk.reply-disagree.tell-that-to-the-people-who-just-clapped]; L5 reply/deflect/scene-talk/guarded/6w1s [scene-talk.reply-deflect.people-say-a-lot-of-things]; L6 reply/confront/scene-talk/braced/6w1s [scene-talk.reply-confront.say-that-on-the-debate-stage]; L7 reply/boast/scene-talk/proud/9w2s [scene-talk.reply-boast.look-at-this-crowd-people-know-where-i-stand]; L8 reply/lie/scene-talk/braced/7w2s [scene-talk.reply-lie.i-m-up-six-points-check-the-paper]; L9 follow/confront/scene-talk/braced/8w1s [scene-talk.follow-confront.you-d-better-hope-they-don-t-look-too-closely]; L10 close/warn/scene-talk/braced/5w1s [scene-talk.close-warn.see-you-on-election-day]</sub>

## Scene 14: desk-bill (vote-wanted, ends in bill) — proof scene

*Tests desk-bill; the asker is anxious; push-back. Records: desk:bill:office:US-DE:legislature-upper:2027-01-12:official:term:seat:US-DE:upper:002:0:2026-10-12:5, bill:office:US-DE:legislature-upper:2027-01-12:official:term:seat:US-DE:upper:002:0:2026-10-12:5, staffer:official:term:seat:US-DE:governor:2026-10-12:person:aide:official:term:seat:US-DE:governor:2026-10-12:0, official:term:seat:US-DE:governor:2026-10-12.*

> Jamie Moreno sets "Right to counsel in eviction" on your desk. You can sign it or veto it.

**Profile anxious** (outcome open)

**Jamie Moreno:** This one's waiting on you.

**Jamie Moreno:** The council sent over "Right to counsel in eviction". It's yours now.

You could say:

1. Give me a pen.
2. I won't sign it as it is.
3. Who voted against it?
4. I want to sleep on it.  *(the page follows this one)*

**Jamie Moreno:** I'll need your answer by the end of the week.

**The whole exchange** (5 nodes; longest path 1 replies; ★ is the branch anxious's traits lean toward):

- You: Give me a pen.
  - Jamie Moreno: I'll get the veto message drafted.
  - *Ends resolved*
- You: I won't sign it as it is.
  - Jamie Moreno: I'll send it to the clerk.
  - *Ends refused*
- You: Who voted against it?
  - Jamie Moreno: It's all in the vote record.
  - *Ends open: Jamie Moreno: Let me know when you've decided.*
- You ★: I want to sleep on it.
  - Jamie Moreno: I'll need your answer by the end of the week.
  - *Ends open*

Other personalities: warm leans to “What's in it?” and it ends open; cold leans to “I'm going to veto it.” and it ends refused; stubborn leans to “I'm going to veto it.” and it ends refused; boastful leans to “Who voted against it?” and it ends open.

<sub>L1 narrate/narrate/scene-talk/calm/18w2s [scene-talk.narrate-narrate.name-sets-bill-on-your-desk-you-can-sign-it-or-veto-it]; L2 open/greet/scene-talk/calm/5w1s [scene-talk.open-greet.this-one-s-waiting-on-you]; L3 state/deliver-news/scene-talk/calm/12w2s [scene-talk.state-deliver-news.the-council-sent-over-bill-it-s-yours-now]; L4 reply/agree/scene-talk/glad/4w1s [scene-talk.reply-agree.give-me-a-pen]; L5 reply/refuse/scene-talk/braced/7w1s [scene-talk.reply-refuse.i-won-t-sign-it-as-it-is]; L6 reply/ask/scene-talk/curious/4w1s [scene-talk.reply-ask.who-voted-against-it]; L7 reply/stall/scene-talk/nervous/6w1s [scene-talk.reply-stall.i-want-to-sleep-on-it]; L12 follow/press/scene-talk/calm/10w1s [scene-talk.follow-press.i-ll-need-your-answer-by-the-end-of-the-week]</sub>

## Scene 15: staff-news (news-received, ends in political) — proof scene

*Tests staff-news; the asker is stubborn; a lie, caught and believed, push-back, walking away. Records: bill:federal:us-house:2026-10-13:official:seat:US-NJ:us-house:02:0, staffer:official:term:seat:US-DE:attorney-general:2026-10-12:person:aide:official:term:seat:US-DE:attorney-general:2026-10-12:0, official:seat:US-NJ:us-house:02, organization:press:newspaper:0:jurisdiction_59500182da2857ae.*

> Stephen Whitaker comes into your office and closes the door.

**Profile stubborn** (outcome open)

**Stephen Whitaker:** You're going to want to sit down for this.

**Stephen Whitaker:** We lost the vote on "Medicaid work requirement".

You could say:

1. Who changed their vote?
2. Somebody leaked it. Find out who.  *(the page follows this one)*
3. It's done. Let's deal with it.
4. Not now. I need to think.
5. I already knew.

**Stephen Whitaker:** I'll find out who it was.

**Stephen Whitaker:** This isn't going away on its own.

**The whole exchange** (11 nodes; longest path 2 replies; ★ is the branch stubborn's traits lean toward):

- You: Who changed their vote?
  - Stephen Whitaker: Give me an hour. I'll know who it was.
  - *Ends open: Stephen Whitaker: This isn't going away on its own.*
- You ★: Somebody leaked it. Find out who.
  - Stephen Whitaker: I'll find out who it was.
  - *Ends open: Stephen Whitaker: This isn't going away on its own.*
- You: It's done. Let's deal with it.
  - Stephen Whitaker: You call them first, and we tell it our way.
  - You: Do it.
    - Stephen Whitaker: I'll get started.
    - *Ends resolved*
  - You: No. We say nothing for now.
    - Stephen Whitaker: We can't sit on this.
    - *Ends refused: Stephen Whitaker: This isn't going away on its own.*
  - You: Give me an hour before we decide.
    - Stephen Whitaker: One hour. Then it's out of our hands.
    - *Ends resolved*
  - You: I need some air. Ten minutes.
    - *Ends open: Stephen Whitaker: We need a plan by morning.*
- You: Not now. I need to think.
  - Stephen Whitaker: We can't sit on this.
  - *Ends open: Stephen Whitaker: This isn't going away on its own.*
- You: I already knew.
  - *if not:*
    - Stephen Whitaker: I'll get started.
    - *Ends resolved*

Other personalities: warm leans to “Who changed their vote?” and it ends open; cold leans to “Somebody leaked it. Find out who.” and it ends open.

<sub>L1 narrate/narrate/scene-talk/solemn/10w1s [scene-talk.narrate-narrate.name-comes-into-your-office-and-closes-the-door]; L2 open/greet/scene-talk/solemn/9w1s [scene-talk.open-greet.you-re-going-to-want-to-sit-down-for-this]; L3 state/deliver-news/scene-talk/solemn/8w1s [scene-talk.state-deliver-news.we-lost-the-vote-on-bill]; L4 reply/ask/scene-talk/braced/4w1s [scene-talk.reply-ask.who-changed-their-vote]; L5 reply/blame/scene-talk/braced/6w2s [scene-talk.reply-blame.somebody-leaked-it-find-out-who]; L6 reply/accept/scene-talk/calm/6w2s [scene-talk.reply-accept.it-s-done-let-s-deal-with-it]; L7 reply/deflect/scene-talk/guarded/6w2s [scene-talk.reply-deflect.not-now-i-need-to-think]; L8 reply/lie/scene-talk/guarded/3w1s [scene-talk.reply-lie.i-already-knew]; L11 follow/promise/scene-talk/braced/6w1s [scene-talk.follow-promise.i-ll-find-out-who-it-was]; L12 close/warn/scene-talk/solemn/7w1s [scene-talk.close-warn.this-isn-t-going-away-on-its-own]</sub>

## Scene 16: section-bargain (vote-wanted, ends in bill) — proof scene

*Tests section-bargain; the asker is warm; a lie, caught and believed, a bargain, push-back, walking away. Records: bill:office:US-DE:legislature-lower:2027-02-01:official:term:seat:US-DE:lower:001:0:2026-10-12:24, official:term:seat:US-DE:lower:041:0:2026-10-12, official:term:seat:US-DE:lower:030:0:2026-10-12, office:US-DE:legislature-lower.*

> The council is in recess. Ralph Morrow pulls you aside about "Universal preschool".

**Profile warm** (outcome resolved)

**Ralph Morrow:** Walk with me.

**Ralph Morrow:** Drop section 1, and you have my vote.

You could say:

1. Count me in.  *(the page follows this one)*
2. Section 1 stays.
3. What if we change section 1 instead of dropping it?
4. Ask me Thursday.
5. I never had a problem with section 1.

**Ralph Morrow:** Thank you. I won't forget it.

**The whole exchange** (10 nodes; longest path 2 replies; ★ is the branch warm's traits lean toward):

- You ★: Count me in.
  - Ralph Morrow: Thank you. I won't forget it.
  - *Ends resolved*
- You: Section 1 stays.
  - Ralph Morrow: I was there when you needed votes.
  - *Ends refused: Ralph Morrow: I won't forget this.*
- You: What if we change section 1 instead of dropping it?
  - Ralph Morrow: Deal.
  - *Ends resolved*
- You: Ask me Thursday.
  - Ralph Morrow: Not there on what? Tell me which part.
  - You: You've made your point. Count me in.
    - Ralph Morrow: Thank you. I won't forget it.
    - *Ends resolved*
  - You: I can't be on it. I won't work against you either.
    - Ralph Morrow: Not against me. I'll take that.
    - *Ends refused*
  - You: I've got to run. Call me tonight.
    - *Ends open: Ralph Morrow: Don't take too long.*
- You: I never had a problem with section 1.
  - *if not:*
    - Ralph Morrow: All right. I had to ask.
    - *Ends resolved*

Other personalities: cold leans to “Section 1 stays.” and it ends open; stubborn leans to “I've made up my mind. It's no.” and it ends refused; anxious leans to “I'm not there yet.” and it ends refused; boastful leans to “I'll cut half of section 1. Not all of it.” and it ends refused.

<sub>L1 narrate/narrate/scene-talk/braced/13w2s [scene-talk.narrate-narrate.the-council-is-in-recess-name-pulls-you-aside-about-bill]; L2 open/greet/scene-talk/braced/3w1s [scene-talk.open-greet.walk-with-me]; L3 state/bargain/scene-talk/braced/8w1s [scene-talk.state-bargain.drop-section-section-and-you-have-my-vote]; L4 reply/agree/scene-talk/glad/3w1s [scene-talk.reply-agree.count-me-in]; L5 reply/refuse/scene-talk/braced/3w1s [scene-talk.reply-refuse.section-section-stays]; L6 reply/bargain/scene-talk/calm/10w1s [scene-talk.reply-bargain.what-if-we-change-section-section-instead-of-dropping-it]; L7 reply/stall/scene-talk/guarded/3w1s [scene-talk.reply-stall.ask-me-thursday]; L8 reply/lie/scene-talk/calm/8w1s [scene-talk.reply-lie.i-never-had-a-problem-with-section-section]; L9 follow/thank/scene-talk/glad/6w2s [scene-talk.follow-thank.thank-you-i-won-t-forget-it]</sub>

## Scene 17: reunion (arrival, ends in personal) — fired by the director

*Fired by cause.shared:2026-10-19:person_6863eb73f501765e:person_15ba64778a4af32c:cause:us-policy-positions:environment-energy.clean-electricity-standard. Cast: person_15ba64778a4af32c, person_6863eb73f501765e.*

> It is a Monday in October. You're outside. Liam Melendez is with you. You and Liam are on the same side of an issue.

**Liam Melendez:** Hello, Jocelyn.

**Liam Melendez:** Don't be a stranger.

<sub>L1 narrator/narrate/scene-words/glad/24w4s [scene-words.cause-shared-other.you-and-other-are-on-the-same-side-of-an]; L2 speaker/greet/conversation/glad/2w1s [conversation.greet-open-hello.hello-name]; L3 speaker/farewell/conversation/glad/4w1s [conversation.farewell-leave-bye.don-t-be-a-stranger]</sub>

## Scene 18: celebration (honor, ends in personal) — fired by the director

*Fired by job:position:organization_ba65f029aa7bc179:2026-12-01:1:person_02140018cffd705c. Cast: person_02140118cffd720f, person_02140018cffd705c.*

> It is a Monday in December. You're at home. Your sister is waiting for you. Your sister wants to talk to you.

**Abigail Alexander:** Good to see you, Wesley.

**Abigail Alexander:** Tell Wyatt I said hello.

<sub>L1 narrator/narrate/scene-words/glad/22w4s [scene-words.frame-day.it-is-a-weekday-in-month]; L2 speaker/greet/conversation/proud/5w1s [conversation.greet-open-hello.good-to-see-you-name]; L3 speaker/farewell/conversation/proud/5w1s [conversation.farewell-leave-bye.tell-name-i-said-hello]</sub>

## Scene 19: funeral (loss, ends in personal) — fired by the director

*Fired by life.death:person:press:outlet:online:0:national:owner:0:2027-08-28. Cast: person:press:outlet:online:0:national:head:0, person:press:outlet:online:0:national:owner:0.*

> This is a Saturday in August. Nancy Schneider passed away.

*Journal:* Nancy Schneider died.

<sub>L1 narrator/narrate/scene-words/grieving/10w2s [scene-words.frame-day.this-is-a-weekday-in-month]; L2 journal/tell/journal/grieving/3w1s [journal.death-line-died.other-died]</sub>

