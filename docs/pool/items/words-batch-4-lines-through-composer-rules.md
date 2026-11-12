---
id: words-batch-4-lines-through-composer-rules
title: "Seventeen lines that read wrong in play are stopped by the composer's rules and checks, one per kind of fault, with no line rewritten"
area: words
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: design-words-machine
source: the CTO, Nov 12, 2026, on #7365 (comment 6825983162), from the item words-batch-4-reads-wrong in the closed pull request #8071 (batch 4 capture, Nov 9, 2026)
checked:
---

**What.** Playing twenty scenes through the game's own functions for batch 4 showed seventeen lines that read wrong once the game filled them. The CTO's call: they are fixed through the composer's rules (`docs/design/words-composer.md`), never as single rewritten lines. This item names each line as played, the shared part and rule that should have stopped it, and the check that keeps it stopped. The worlds were drawn from all 56 places: Flagler Beach, Florida (1222550, seed `batch-4-nov-9:0`), Oceanport, New Jersey (3454570, seed `batch-4-nov-9:1`) and New Albany, Ohio (3953970, seed `batch-4-nov-9:2`). The lines, by kind of fault (scene and line numbers are batch 4's, kept on the closed branch of #8071; the key is the bank piece that said it):

1. A reply that does not answer the move. Scene 1, Flagler Beach, line 1.12, `scene-talk.follow-refuse.that-s-not-mine-to-give`: "That's not mine to give." after "I'll need your vote on mine" (a trade).
2. A line that contradicts the room the scene is in. Scene 1, Flagler Beach, narration, `scene-talk.narrate-narrate.you-re-going-over-bill-at-your-desk-when-name-knocks-on-the-open-door`: "You're going over Ordinance 2025-10 at your desk when Danielle McClain knocks on the open door." (the arrival line has both people in the chamber). Scene 15, Flagler Beach, line 15.1, `scene-talk.open-greet.you-and-i-need-to-talk-and-i-d-rather-do-it-out-here`: "You and I need to talk, and I'd rather do it out here." and its narration, `scene-talk.narrate-narrate.after-the-meeting-name-waits-until-the-room-is-nearly-empty`: "After the meeting, Arjun Williamson waits until the room is nearly empty." (the arrival line says the other person comes to the house).
3. A crowd's beat in a talk of two. Scene 5, New Albany, office hours, `scene-talk.beat-beat.the-moderator-glances-at-the-clock-and-lets-it-run` (5.3), `scene-talk.beat-beat.somebody-in-the-back-says-answer-the-question-just-loud-enough` (5.16) and `scene-talk.beat-beat.the-microphone-squeals-and-the-whole-room-winces` (5.20 and 5.24): a heckler, a moderator and a microphone in a one-on-one.
4. A talk that is not about the scene's news. Scene 7, Flagler Beach, news of a death: 7.2 `conversation.news-ask-think.what-do-you-think` ("What do you think?"), 7.2.a and 7.3 `conversation.news-answer-opinion.i-d-want-more-than-a-headline-before-i-decide` ("I'd want more than a headline before I decide.") and 7.4 `scene-talk.follow-accept.uh-huh` ("Uh-huh."): the generic headline exchange, never naming the death. Scene 20, Oceanport, news of a birth, 20.1.c `conversation.news-answer-opinion.its-about-time` ("It's about time."), a reply drawn for news in general.
5. A slot that holds the wrong thing. Scene 12, New Albany, a letter, 12.2 `conversation.news-raise-heard.did-you-hear-about-topic`: "Did you hear about New Albany Times?"; scene 20, Oceanport, a birth, 20.1, the same key: "Did you hear about Wgdz?" The topic slot holds an outlet's or a station's name, not what happened, and the line asks about neither the letter nor the birth.
6. A promise of a reason the text never gives. Scene 10, Flagler Beach, the President's address, 10.6 `address`: "I trust Vice President James Johnson. You'll see why."
7. A greeting for the wrong medium. Scene 12, New Albany, a letter, 12.1 `conversation.greet-open-hello.good-to-see-you-name`: "Good to see you, Kimberly." (a greeting for meeting face to face, said in a letter).
8. An office with no article. Scene 18, Oceanport, a volunteer offer, 18.2 `scene-talk.state-request.i-heard-you-re-running-for-office-i-want-to-help-whatever-you-need`: "I heard you're running for Council member. I want to help, whatever you need." Scene 19, Flagler Beach, a swearing-in, 19.2 `scene-talk.state-request.raise-your-right-hand-do-you-swear-to-follow-the-law-and-to-do-the-work`: "Raise your right hand. Do you swear to follow the law and to do the work of commissioner honestly?"

That is seventeen, counted as the batch counted them: one per bank piece and filled text, a line that repeats in two places counting once. Seen: the talk and narration of a scene say the room it is in, ask about what happened, and name an office with its article; a letter does not greet like a meeting.

**Cause.** Found in code: the shared parts the composer design names (`docs/design/words-composer.md`) do not yet cover these faults, and the composed checks in `src/english/composed-checks.ts` (registry near line 688) have no check for a room, a medium, a typed slot, an unanswered promise or a missing article. Each fault, by part: (1) the talk's reply is picked by the move's name in `data/english/parts/scene-talk.json` (`follow-refuse`), not by what the line before asked, so the outline of a talk does not type a reply by the move it answers; (2) and (3) the arrival line, the narration, the greeting and the beats are picked by `src/director/scene-talk.ts` without the telling holding the scene's room and occasion (the design's telling holds "the room: who is present" and no setting), so a beat meant for a town hall is offered to a one-on-one; (4) and (5) `src/director/conversation.ts` opens the news exchange from a generic headline piece, and the `{topic}` slot is filled from an outlet's name rather than from the news record's own subject, so there is no said-as type for "what happened"; (6) the address's point carries a promise piece that is not paired with a reason piece in the outline's three steps; (7) the greeting piece has no medium; (8) the office is spliced in as a bare title instead of through the said-as reader. #8068 gives letters a purpose and #7909 gives news a purpose: re-play kinds 4, 5 and 7 after they merge, and fix only what still reads wrong.

**Fix.** One rule or check per kind of fault; none of the seventeen lines is rewritten or pulled by hand. Each rule is added to `data/english/line-rules.json` with its owner quote where one exists (otherwise `from` names this item), implemented as a composed check in `src/english/composed-checks.ts` over drawn worlds, with its count in `tests/guards/english/composed-baseline.json`, and enforced in the part named:

1. Reply by move. Rules `reply-follows-the-line-before` and `no-non-replies`, the existing composed check `no-non-reply`; part: the outline (talk) types a reply by the move it answers, so a refusal of a trade is a different piece from a refusal of a vote.
2. and 3. Setting. A new rule `line-fits-the-room-it-is-in` (nearest existing: `every-line-gives-its-context`, `line-fits-the-roles-in-its-situation`). Part: the telling gains the scene's room, whether people are in it together, and its occasion (one-on-one, crowd, hearing); an arrival piece and a narration piece are offered only for the room the arrival set, and a beat only for the occasions it names. A composed check reads a scene's narration, arrival and talk together and breaks on a second room or a crowd beat in a talk of two.
3. News talk. Rules `question-names-its-subject`, `news-comes-from-a-record` and `reply-follows-the-line-before`; part: the outline (talk) for a news scene takes its subject from the news record, so a death or a birth is raised as one, and a reply is offered only for the kind of news. A composed check breaks on a news exchange that never names its record's subject.
4. Slot types. Rules `introduced-before-addressed` and `question-names-its-subject`; part: said-as gains the slot type "what happened", which refuses an outlet's or a station's name; the composed check `no-bare-full-name-unintroduced` is the model for the new check, `topic-slot-is-what-happened`.
5. Promise. Rules `commitment-names-who-what-why` and `every-line-gives-its-context`; part: the outline's point has the three steps (context, stand, ask) and the join refuses a promise piece without its reason piece in the same point. A composed check breaks on "you'll see why" and its kin with no reason following in the text.
6. Medium. A new rule `line-fits-the-medium` (nearest: `line-fits-the-roles-in-its-situation`); part: the telling holds how the text reaches the listener (face to face, letter, news), and a greeting piece names the medium it fits.
7. Office article. Rule `office-named-as-people-say-it`; part: said-as says every office, with its article, from the office record's own name. A composed check breaks on a bare office title after "for", "of" or "as".

**Time box.** 4 hours for one session; kinds 2, 3 and 7 share the telling's new fields, so build those together. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: a fix is a piece's gate (its setting, medium or role), a typed slot or a rule, never a typed sentence in code. Wire to the world: the topic slot reads the news record's own subject, and a beat reads the scene's room from the record that staged it. Replace, never layer: the detectors in #8071's `oddities` are not brought over (see `words-scene-tree-walker-one-tool`). Counts of breaks per rule only fall. The words of the owner are not copied into this item; a rule's `from` carries the dated quote where one exists.

**Done when.** A second session plays a new life in a drawn place, reads the scenes through the tree walker (`words-scene-tree-walker-one-tool`) or, if that has not merged, on screen through the play walks, in Flagler Beach, Oceanport and New Albany with the seeds above and in one place nobody chose, and finds none of the seventeen lines or their faults (a crowd beat in a one-on-one, a second room, an outlet's name for what happened, a promise with no reason, a meeting greeting in a letter, a bare office title). `npm run words:composed` names its places and seeds and shows each new check's count at or below its baseline, and the new rules are in `data/english/line-rules.json`.

**Waits on.** The telling and said-as units of the composer (`docs/design/words-composer.md`, units 1 and 5) for kinds 2, 3, 5, 7 and 8; kinds 1, 4 and 6 can start now. #8068 and #7909 for the re-play of kinds 4, 5 and 7.

**Files.** data/english/line-rules.json, src/english/composed-checks.ts, tests/guards/english/composed-baseline.json, data/english/parts/scene-talk.json, data/english/parts/conversation.json, src/director/scene-talk.ts, src/director/conversation.ts, docs/design/words-composer.md

**Notes.**

Added by the lead (Fable A) on Nov 12, 2026, on the CTO's call on #7365. It replaces the item `words-batch-4-reads-wrong` of the closed pull request #8071, which never reached main. The lines in the data/english/parts files are the Story session's alone to write, change or delete (owner, Nov 10): this item changes rules, checks, gates and slots, and lists any line it thinks should change for the Story session.
