# Pre-grade: Writer Home (talk at home)

Pre-grader, 2026-11-24. Branch `story/w-talk` at `6799ca02`, every line authored by this writer at that head (138 lines). Verdicts carry over by exact text from earlier heads; lines not judged before were read new.

- **Result:** 120 of 138 pass (87%); 18 fail.
- **Calibration:** C4 8/8, D1 8/8, M1 8/8, O1 8/8. Each reader's chunk had 8 of the owner's graded lines (4 passed, 4 rejected) planted unmarked; a chunk that missed one would have been rerun.
- **Read by:** one blind reader per chunk of about 150 lines (Opus, medium), then the Pre-grader read every verdict against `data/english/line-rules.json`, `notes-not-rules.json`, the owner's grades and `OWNER-DECISIONS.md`.
- **Played:** the packet script at `104bd27d` (the writer's previous head; lines changed since then show only as read) on six places (Meadow UT aecea4, Chipley FL 66265b, Bethel ME bd3806, Whitmore Village HI 2d2283, Roberts ID 3c42e6, Oakton VA d8e52e): {len(pl)} of these lines played.
- Fails quote the line and give his rule or words; no new wording is suggested.

## Failing lines by rule

### awkward / AI-sounding (9)

- `outline-talk.lead.talk-address-point-on-about-president-is-on-the-yes-side`: "On {about}, {president} is on the yes side." — 'On the yes side' is stilted ballot talk for a President's stand and doesn't sound like a person.
- `outline-talk.lead.talk-address-point-on-about-president-is-on-the-no-side`: "On {about}, {president} is on the no side." — 'On the no side' is stilted, not how someone retells a speech.
- `outline-talk.lead.talk-address-point-president-spoke-up-to-defend-about`: "{president} spoke up to defend {about}." — 'Spoke up to defend' is a clunky, padded construction; people would say 'defended'.
- `outline-talk.lead.talk-address-point-president-wants-no-changes-to-about`: "{president} wants no changes to {about}." — 'Wants no changes to' reads oddly with the noun fills ('no changes to expanding Medicaid') and is stiff.
- `outline-talk.lead.talk-address-point-president-said-to-leave-about-as-is`: "{president} said to leave {about} as is." — 'Said to leave X as is' sounds like an order relayed, not a stand, and is awkward with fills like 'shifting highway money to transit'.
- `outline-talk.lead.talk-address-point-the-word-on-about-from-president-was-to-keep-it`: "The word on {about} from {president} was to keep it." — 'The word on X from Y was to keep it' is a contorted, simulated-sounding sentence with a vague 'it'.
- `outline-talk.lead.talk-address-point-president-spoke-up-to-end-about`: "{president} spoke up to end {about}." — 'Spoke up to end' is clunky; you don't end a law by speaking up.
- `outline-talk.lead.talk-address-point-president-plans-to-take-apart-about`: "{president} plans to take apart {about}." — 'Take apart' with policy fills ('take apart free fares on public transit') is odd and loaded.
- `outline-talk.lead.talk-address-point-the-word-on-about-from-president-was-to-end-it`: "The word on {about} from {president} was to end it." — The same contorted 'The word on X from Y was to end it' shape, with a vague 'it'.

### stance-is-plainly-for-or-against (8)

- `outline-talk.lead.talk-address-point-where-about-is-concerned-president-is-for-it`: "Where {about} is concerned, {president} is for it." — 'Where X is concerned... is for it' is stiff, report-like phrasing nobody says at the kitchen table, and the trailing 'it' is the vague pronoun he objects to.
- `outline-talk.lead.talk-address-point-president-wants-us-to-say-yes-to-about`: "{president} wants us to say yes to {about}." — 'Wants us to say yes' is false to the facts: the household doesn't vote on it, Congress decides, so it puts the ask on the wrong people.
- `outline-talk.lead.talk-address-point-where-about-is-concerned-president-is-against-it`: "Where {about} is concerned, {president} is against it." — The same stiff 'Where X is concerned... against it' frame, ending on a vague 'it'.
- `outline-talk.lead.talk-address-point-president-wants-us-to-say-no-to-about`: "{president} wants us to say no to {about}." — 'Wants us to say no' asks the household, who can't act, instead of the level of government that decides.
- `outline-talk.lead.talk-address-point-on-about-president-wants-things-left-as-they-are`: "On {about}, {president} wants things left as they are." — 'Wants things left as they are' is vague. With an action-shaped fill ('On expanding Medicaid') it can read as being against the change, so the stand is unclear.
- `outline-talk.lead.talk-address-point-where-about-is-concerned-president-wants-it-ended`: "Where {about} is concerned, {president} wants it ended." — Stiff 'Where X is concerned' frame with a dangling 'it'; awkward and AI-sounding.
- `outline-talk.lead.talk-address-point-on-about-president-wants-a-change`: "On {about}, {president} wants a change." — 'Wants a change' doesn't say whether he'd end it, cut it or expand it, so the stand isn't plain.
- `outline-talk.lead.talk-address-point-president-wants-to-change-about-for-good`: "{president} wants to change {about} for good." — 'Change for good' could mean improve it or change it permanently; it doesn't say he's against it.

### false for its facts (1)

- `outline-talk.lead.talk-address-point-president-is-campaigning-to-end-about`: "{president} is campaigning to end {about}." — The President just took office in an inaugural address, so 'campaigning' is false to the moment.

## As played

- pass: `outline-talk.ask.talk-address-point-where-do-you-come-down-on` → **6.16**   says: The President says a higher federal minimum wage stays right where it is. If you ask me, he chose the right fight. Where do you come down on the minimum wage?
- pass: `outline-talk.verdict-cold.talk-address-point-nothing-said-on-sat-right-with-me` → **3.17**   says: Nothing the President said on the minimum wage sat right with me. Spend a day in Bethel and you'd see the problem.
- pass: `outline-talk.why-first.talk-address-point-what-president-said-on-said-fits-the-way-place-actually-is` → **1.16**   says: What the President said on taxes on the rich fits the way Meadow actually is. And I think she has it right.
- pass: `outline-talk.verdict-after.talk-address-point-that-s-why-i-m-behind-president-object-on-about` → **2.30**   says: I can only judge interest rates on loans by how Chipley has been going. That's why I'm behind the President on a cap on consumer loan interest.
- pass: `outline-talk.why.talk-address-point-spend-a-day-in-place-and-you-d-see-the-problem` → **3.17**   says: Nothing the President said on the minimum wage sat right with me. Spend a day in Bethel and you'd see the problem.
- pass: `outline-talk.why-first.talk-address-point-i-can-only-judge-said-by-how-place-has-been-going` → **2.30**   says: I can only judge interest rates on loans by how Chipley has been going. That's why I'm behind the President on a cap on consumer loan interest.
- pass: `outline-talk.verdict.talk-address-point-if-you-ask-me-president-chose-the-right-fight` → **6.16**   says: The President says a higher federal minimum wage stays right where it is. If you ask me, he chose the right fight. Where do you come down on the minimum wage?
- pass: `conversation.own-view-answer-disagree.honestly-bothers-me-more-than-i-let-on` → **2.25**   reply 2: Honestly, it bothers me more than I let on.

## Passing lines

- `outline-talk.lead.talk-address-point-notice-how-fast-got-to`: "Notice how fast {president} got to {about}."
- `outline-talk.lead.talk-address-point-of-everything-picked-to-lead-with`: "Of everything, {president} picked {about} to lead with."
- `outline-talk.lead.talk-address-point-funny-i-never-expected-to-bring-up-at-all`: "Funny, I never expected {president} to bring up {about} at all."
- `outline-talk.lead.talk-address-point-nobody-is-getting-out-of`: "Nobody is getting {about} out of {president}."
- `outline-talk.lead.talk-address-point-said-no-to-flat-out`: "{president} said no to {about}, flat out."
- `outline-talk.lead.talk-address-point-you-catch-that-shut-the-door-on`: "You catch that? {president} shut the door on {about}."
- `outline-talk.lead.talk-address-point-if-gets-a-say-is-on-its-way-out`: "If {president} gets a say, {about} is on its way out."
- `outline-talk.lead.talk-address-point-out-of-the-whole-speech-gave-the-most-time`: "Out of the whole speech, {president} gave {said} the most time."
- `outline-talk.verdict.talk-address-point-i-ve-been-waiting-for-somebody-to-say-that-about`: "I've been waiting for somebody to say that about {about}."
- `outline-talk.verdict.talk-address-point-finally-somebody-who-sees-the-way-i-do`: "Finally, somebody who sees {about} the way I do."
- `outline-talk.verdict.talk-address-point-i-can-t-get-behind-on`: "I can't get behind {president-object} on {about}."
- `outline-talk.verdict.talk-address-point-can-sell-to-somebody-else`: "{president} can sell {about} to somebody else."
- `outline-talk.verdict.talk-address-point-half-of-me-nods-along-with-and-half-of-me-doesn-t`: "Half of me nods along with {president-object}, and half of me doesn't."
- `outline-talk.verdict-cold.talk-address-point-on-i-side-with`: "On {about}, I side with {president-object}."
- `outline-talk.verdict-cold.talk-address-point-i-m-not-buying-what-said-on`: "I'm not buying what {president} said on {said}."
- `outline-talk.why.talk-address-point-ask-anybody-at-and-they-d-tell-you-the-same`: "Ask anybody at {employer} and they'd tell you the same."
- `outline-talk.ask.talk-address-point-where-do-you-come-down-on`: "Where do you come down on {said}?"
- `outline-talk.heard.talk-address-point-you-were-listening-when-got-to-weren-t-you`: "You were listening when {president} got to {said}, weren't you?"
- `outline-talk.heard.talk-address-point-i-saw-you-look-up-when-mentioned`: "I saw you look up when {president} mentioned {said}."
- `outline-talk.heard.talk-address-point-caught-your-ear-right`: "{said} caught your ear, right?"
- `outline-talk.verdict-cold.talk-address-point-is-after-and-i-m-glad-somebody-is`: "{president} is after {about}, and I'm glad somebody is."
- `outline-talk.verdict-cold.talk-address-point-i-like-where-landed-on`: "I like where {president} landed on {said}."
- `outline-talk.verdict-cold.talk-address-point-is-where-loses-me`: "{said} is where {president} loses me."
- `outline-talk.verdict-cold.talk-address-point-nothing-said-on-sat-right-with-me`: "Nothing {president} said on {said} sat right with me."
- `outline-talk.verdict-cold.talk-address-point-i-haven-t-made-up-my-mind-on`: "I haven't made up my mind on {said}."
- `outline-talk.why-first.talk-address-point-rent-in-was-on-my-mind-when-got-to`: "Rent in {place} was on my mind when {president} got to {said}."
- `outline-talk.why-first.talk-address-point-work-is-thin-in-so-had-my-full-attention`: "Work is thin in {place}, so {said} had my full attention."
- `outline-talk.verdict-after.talk-address-point-so-i-m-with`: "So I'm with {president-object}."
- `outline-talk.verdict-after.talk-address-point-which-is-why-i-d-back-on`: "Which is why I'd back {president-object} on {about}."
- `outline-talk.verdict-after.talk-address-point-didn-t-win-me-over-though`: "{president} didn't win me over, though."
- `outline-talk.verdict-after.talk-address-point-i-m-still-sorting-out-where-i-land-on`: "I'm still sorting out where I land on {said}."
- `outline-talk.verdict-after.talk-address-point-maybe-wins-me-over-but-not-tonight`: "Maybe {president-object} wins me over, but not tonight."
- `outline-talk.ask.talk-address-point-tell-me-i-m-not-the-only-one-thinking-about`: "Tell me I'm not the only one thinking about {said}."
- `outline-talk.lead.talk-address-point-president-wants-about-badly-enough-to-say-so-on-live-television`: "{president} wants {about} badly enough to say so on live television."
- `outline-talk.lead.talk-address-point-about-got-a-flat-no-from-president`: "{about} got a flat no from {president}."
- `outline-talk.lead.talk-address-point-president-called-about-a-mistake-and-said-it-should-end`: "{president} called {about} a mistake and said it should end."
- `outline-talk.verdict.talk-address-point-i-d-have-said-the-same-if-i-were-president-object`: "I'd have said the same, if I were {president-object}."
- `outline-talk.verdict.talk-address-point-for-once-i-agree-with-president-object`: "For once, I agree with {president-object}."
- `outline-talk.verdict.talk-address-point-president-had-me-nodding-i-ll-admit`: "{president} had me nodding, I'll admit."
- `outline-talk.verdict.talk-address-point-i-don-t-always-like-what-president-says-but-that-was-fair`: "I don't always like what {president} says, but that was fair."
- `outline-talk.verdict.talk-address-point-you-won-t-hear-me-complain-about-president-object-on-that`: "You won't hear me complain about {president-object} on that."
- `outline-talk.verdict.talk-address-point-president-has-my-support-on-that-one`: "{president} has my support on that one."
- `outline-talk.verdict.talk-address-point-on-about-i-m-right-there-with-president-object`: "On {about}, I'm right there with {president-object}."
- `outline-talk.verdict.talk-address-point-president-lost-me-on-about`: "{president} lost me on {about}."
- `outline-talk.verdict.talk-address-point-i-can-t-agree-with-president-object-on-that`: "I can't agree with {president-object} on that."
- `outline-talk.verdict.talk-address-point-i-like-most-of-what-president-says-but-not-about`: "I like most of what {president} says, but not {about}."
- `outline-talk.verdict.talk-address-point-i-m-sorry-but-president-is-wrong-on-about`: "I'm sorry, but {president} is wrong on {about}."
- `outline-talk.verdict.talk-address-point-i-d-push-back-on-president-object-about-about`: "I'd push back on {president-object} about {about}."
- `outline-talk.verdict.talk-address-point-hard-to-nod-along-when-president-talks-about-about-like-that`: "Hard to nod along when {president} talks about {about} like that."
- `outline-talk.verdict.talk-address-point-president-wants-about-and-i-just-don-t`: "{president} wants {about}, and I just don't."
- `outline-talk.verdict-cold.talk-address-point-where-president-won-me-over-was-said`: "Where {president} won me over was {said}."
- `outline-talk.verdict-cold.talk-address-point-i-m-with-president-object-all-the-way-on-said`: "I'm with {president-object} all the way on {said}."
- `outline-talk.verdict-cold.talk-address-point-i-m-not-with-president-object-on-said`: "I'm not with {president-object} on {said}."
- `outline-talk.verdict-cold.talk-address-point-president-got-said-wrong-as-i-see-it`: "{president} got {said} wrong, as I see it."
- `outline-talk.why-first.talk-address-point-what-president-said-on-said-fits-the-way-place-actually-is`: "What {president} said on {said} fits the way {place} actually is."
- `outline-talk.why-first.talk-address-point-what-president-said-on-said-isn-t-how-place-works`: "What {president} said on {said} isn't how {place} works."
- `outline-talk.why-first.talk-address-point-i-made-up-my-mind-about-said-just-from-looking-around-place`: "I made up my mind about {said} just from looking around {place}."
- `outline-talk.why-first.talk-address-point-place-has-too-few-jobs-so-i-listened-close-to-said`: "{place} has too few jobs, so I listened close to {said}."
- `outline-talk.verdict-after.talk-address-point-that-s-why-i-m-behind-president-object-on-about`: "That's why I'm behind {president-object} on {about}."
- `outline-talk.verdict-after.talk-address-point-that-puts-me-on-president-s-side`: "That puts me on {president}'s side."
- `outline-talk.verdict-after.talk-address-point-hard-to-argue-with-president-object-after-that`: "Hard to argue with {president-object} after that."
- `outline-talk.verdict-after.talk-address-point-that-s-why-i-can-t-back-president-object-on-about`: "That's why I can't back {president-object} on {about}."
- `outline-talk.verdict-after.talk-address-point-president-hasn-t-settled-it-for-me-yet`: "{president} hasn't settled it for me yet."
- `outline-talk.why.talk-address-point-look-around-place-and-tell-me-it-s-wrong`: "Look around {place} and tell me it's wrong."
- `outline-talk.why.talk-address-point-folks-in-place-would-back-it-i-think`: "Folks in {place} would back it, I think."
- `outline-talk.why.talk-address-point-spend-a-day-in-place-and-you-d-see-it-too`: "Spend a day in {place} and you'd see it too."
- `outline-talk.why.talk-address-point-look-around-place-and-tell-me-it-s-right`: "Look around {place} and tell me it's right."
- `outline-talk.why.talk-address-point-folks-in-place-wouldn-t-stand-for-it-i-think`: "Folks in {place} wouldn't stand for it, I think."
- `outline-talk.why.talk-address-point-spend-a-day-in-place-and-you-d-see-the-problem`: "Spend a day in {place} and you'd see the problem."
- `outline-talk.why.talk-address-point-money-is-the-first-thing-i-think-about-and-place-isn-t-cheap`: "Money is the first thing I think about, and {place} isn't cheap."
- `outline-talk.verdict.talk-address-point-credit-to-president-object-that-took-some-nerve`: "Credit to {president-object}: that took some nerve."
- `outline-talk.verdict.talk-address-point-i-ll-give-president-object-that-one-without-arguing`: "I'll give {president-object} that one without arguing."
- `outline-talk.verdict.talk-address-point-that-sounded-like-president-meant-it-and-i-m-with-president-object`: "That sounded like {president} meant it, and I'm with {president-object}."
- `outline-talk.verdict.talk-address-point-somebody-had-to-say-it-and-president-said-it-well`: "Somebody had to say it, and {president} said it well."
- `outline-talk.verdict.talk-address-point-what-president-wants-and-what-i-want-are-two-different-things`: "What {president} wants and what I want are two different things."
- `outline-talk.why-first.talk-address-point-i-can-only-judge-said-by-how-place-has-been-going`: "I can only judge {said} by how {place} has been going."
- `outline-talk.why-first.talk-address-point-when-president-got-to-said-i-thought-about-the-people-i-know-in-place`: "When {president} got to {said}, I thought about the people I know in {place}."
- `outline-talk.why.talk-address-point-i-m-thinking-about-the-people-here-in-place-mostly`: "I'm thinking about the people here in {place}, mostly."
- `outline-talk.why.talk-address-point-it-comes-down-to-what-i-see-in-place-every-day`: "It comes down to what I see in {place} every day."
- `outline-talk.why.talk-address-point-that-s-how-it-looks-from-place-anyway`: "That's how it looks from {place}, anyway."
- `outline-talk.why.talk-address-point-i-d-say-it-differently-if-i-lived-anywhere-but-place`: "I'd say it differently if I lived anywhere but {place}."
- `outline-talk.why.talk-address-point-ask-around-place-you-ll-hear-it-too`: "Ask around {place}. You'll hear it too."
- `outline-talk.ask.talk-address-point-what-did-you-make-of-said`: "What did you make of {said}?"
- `outline-talk.ask.talk-address-point-how-did-said-sit-with-you`: "How did {said} sit with you?"
- `outline-talk.ask.talk-address-point-did-president-lose-you-anywhere-on-said`: "Did {president} lose you anywhere on {said}?"
- `outline-talk.verdict.talk-address-point-if-president-keeps-talking-like-that-i-m-in`: "If {president} keeps talking like that, I'm in."
- `outline-talk.verdict.talk-address-point-i-m-relieved-president-said-it-honestly`: "I'm relieved {president} said it, honestly."
- `outline-talk.verdict.talk-address-point-put-me-down-as-agreeing-with-president-object`: "Put me down as agreeing with {president-object}."
- `outline-talk.verdict.talk-address-point-if-you-ask-me-president-chose-the-right-fight`: "If you ask me, {president} chose the right fight."
- `outline-talk.verdict.talk-address-point-that-s-not-how-i-d-have-put-it-but-president-is-right`: "That's not how I'd have put it, but {president} is right."
- `outline-talk.verdict.talk-address-point-i-m-not-fooled-by-president-object-on-that-one`: "I'm not fooled by {president-object} on that one."
- `outline-talk.verdict.talk-address-point-i-heard-president-out-and-it-doesn-t-change-my-mind`: "I heard {president} out, and it doesn't change my mind."
- `outline-talk.verdict.talk-address-point-i-d-rather-president-had-stayed-quiet-on-that`: "I'd rather {president} had stayed quiet on that."
- `outline-talk.verdict.talk-address-point-the-other-side-has-the-better-argument-and-president-knows-it`: "The other side has the better argument, and {president} knows it."
- `outline-talk.lead.talk-address-point-president-came-out-in-favor-of-about`: "{president} came out in favor of {about}."
- `outline-talk.lead.talk-address-point-president-said-yes-to-about`: "{president} said yes to {about}."
- `outline-talk.lead.talk-address-point-president-is-backing-about`: "{president} is backing {about}."
- `outline-talk.lead.talk-address-point-president-is-firmly-for-about`: "{president} is firmly for {about}."
- `outline-talk.lead.talk-address-point-president-is-firmly-against-about`: "{president} is firmly against {about}."
- `outline-talk.lead.talk-address-point-president-is-opposed-to-about`: "{president} is opposed to {about}."
- `outline-talk.lead.talk-address-point-president-wants-to-keep-about`: "{president} wants to keep {about}."
- `outline-talk.lead.talk-address-point-president-wants-to-end-about`: "{president} wants to end {about}."
- `outline-talk.lead.talk-address-point-president-wants-to-roll-back-about`: "{president} wants to roll back {about}."
- `outline-talk.lead.talk-address-point-president-wants-to-protect-about`: "{president} wants to protect {about}."
- `outline-talk.lead.talk-address-point-president-is-defending-about`: "{president} is defending {about}."
- `outline-talk.lead.talk-address-point-president-sided-with-those-who-want-to-keep-about`: "{president} sided with those who want to keep {about}."
- `outline-talk.lead.talk-address-point-president-plans-to-stand-behind-about`: "{president} plans to stand behind {about}."
- `outline-talk.lead.talk-address-point-president-made-a-point-of-backing-about`: "{president} made a point of backing {about}."
- `outline-talk.lead.talk-address-point-president-wants-to-repeal-about`: "{president} wants to repeal {about}."
- `outline-talk.lead.talk-address-point-president-wants-to-put-an-end-to-about`: "{president} wants to put an end to {about}."
- `outline-talk.lead.talk-address-point-president-made-a-point-of-attacking-about`: "{president} made a point of attacking {about}."
- `conversation.own-view-answer-disagree.i-ve-gone-back-and-forth-on-myself`: "I've gone back and forth on {about} myself."
- `conversation.own-view-answer-disagree.honestly-bothers-me-more-than-i-let-on`: "Honestly, {about} bothers me more than I let on."
- `conversation.own-view-answer-agree.maybe-i-ve-been-too-quick-on`: "Maybe I've been too quick on {about}."
- `conversation.own-view-answer-agree.i-hadn-t-looked-at-that-way-before`: "I hadn't looked at {about} that way before."
- `conversation.own-view-answer-disagree.i-m-on-the-other-side-of`: "I'm on the other side of {about}."
- `conversation.own-view-answer-agree.we-see-eye-to-eye-on`: "We see eye to eye on {about}."
- `conversation.own-view-answer-agree.i-d-have-said-the-same-about`: "I'd have said the same about {about}."
- `conversation.own-view-answer-private.we-don-t-need-to-get-into`: "We don't need to get into {about}."
- `conversation.own-view-answer-why.what-got-you-there-on`: "What got you there on {about}?"
