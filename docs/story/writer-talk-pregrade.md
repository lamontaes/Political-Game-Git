# Pre-grade: Writer Home (talk at home)

## story/w-talk at `56f20feb` (newest): the {said} lines, 54 of 130 pass

Pre-grader, 2026-11-24. Every line in outline-talk.json at this head that uses {said} (130 lines).

- **Calibration (new, Nov 24):** the reader's chunk planted 19 of the owner's own grades: 13 he graded bad today and on Nov 12 (the born, school and "usual problems" loading lines; "So the President wants a higher top income tax rate. I'm glad she said it out loud."; "I'd push back on her there."; the four work replies offered together; "Good. We'll watch what it does to…"; "Go on and enjoy what's left of tonight."; "What do you do?"; "I'll check on you again this morning.") and 6 he graded fine. This chunk (P1) failed all 13 bad lines and passed 5 of the 6 good ones. It counts only because it caught every bad one. Every line was read fresh, with nothing carried from earlier reads.
- **The reader was told how {said} fills,** from `data/english/question-names.json` at this head: a short spoken name per policy question, such as "gas hookups", "the retirement age", "the air", "trains", "rents", "immigration" or "bus fares".
- **Your question: does the topic name plus a for/against verb read like a person?** Mostly no. A bare topic does not say which side someone is on: "{president} came out against immigration", "is all in on the air", "is dead set against rents", "wants nothing to do with the retirement age". Each says the President took a side without saying what the side is: against more immigration or less, raising the retirement age or lowering it. 31 of the fails are this (stance-is-plainly-for-or-against). The lines that pass use the topic as a topic, not as a position: "You heard what {president} said about {said}.", "Where are you on {said}?", "I'm with {president-object} on {said}.", "{president} has {said} wrong.", "I work at {employer}, so I listened when {president} got to {said}."
- 32 more fails are twins: siblings in the same move that say the same thing ("came right out for", "is all in on", "went on about… for a while").
- Not played.

## Failing lines by rule

### variants-differ-in-what-they-say (32)

- `outline-talk.lead.talk-address-point-went-on-about-for-a-while` (lead): "{president} went on about {said} for a while." — variants-differ-in-what-they-say: Says the same as P1-004 (the President spent a while on the topic) in different words.
- `outline-talk.lead.talk-address-point-so-means-to-keep-said` (lead): "So {president} means to keep {said}." — variants-differ-in-what-they-say: Twin of P1-089 ('wants to keep'), opened with a filler 'So'.
- `outline-talk.lead.talk-address-point-wants-to-undo-said` (lead): "{president} wants to undo {said}." — variants-differ-in-what-they-say: 'Wants to undo' says the same as P1-090, P1-091 and P1-097 side by side.
- `outline-talk.verdict-cold.talk-address-point-on-i-side-with-said` (verdict-cold): "On {said}, I side with {president-object}." — variants-differ-in-what-they-say: Same as P1-006 ('I'm with the President on...') reworded.
- `outline-talk.ask.talk-address-point-where-do-you-come-down-on` (ask): "Where do you come down on {said}?" — variants-differ-in-what-they-say: Twin of P1-016 ('Where are you on...').
- `outline-talk.verdict-cold.talk-address-point-nothing-said-on-sat-right-with-me` (verdict-cold): "Nothing {president} said on {said} sat right with me." — variants-differ-in-what-they-say: Says the same as P1-042 ('not buying what the President said').
- `outline-talk.verdict-cold.talk-address-point-i-haven-t-made-up-my-mind-on` (verdict-cold): "I haven't made up my mind on {said}." — variants-differ-in-what-they-say: Twin of P1-008 ('can't tell yet where I am').
- `outline-talk.verdict.talk-address-point-on-said-i-m-right-there-with-president-object` (verdict): "On {said}, I'm right there with {president-object}." — variants-differ-in-what-they-say: Twin of P1-114 and P1-006 ('I'm with / side with the President on...').
- `outline-talk.verdict.talk-address-point-i-m-sorry-but-president-is-wrong-on-said` (verdict): "I'm sorry, but {president} is wrong on {said}." — variants-differ-in-what-they-say: Same as P1-007 and P1-108 (the President is wrong on it), with a stock 'I'm sorry, but'.
- `outline-talk.verdict-cold.talk-address-point-i-m-with-president-object-all-the-way-on-said` (verdict-cold): "I'm with {president-object} all the way on {said}." — variants-differ-in-what-they-say: Twin of P1-006 with 'all the way' added.
- `outline-talk.verdict-cold.talk-address-point-president-got-said-wrong-as-i-see-it` (verdict-cold): "{president} got {said} wrong, as I see it." — variants-differ-in-what-they-say: Twin of P1-007 ('has {said} wrong') with 'as I see it' padding.
- `outline-talk.why-first.talk-address-point-place-has-too-few-jobs-so-i-listened-close-to-said` (why-first): "{place} has too few jobs, so I listened close to {said}." — variants-differ-in-what-they-say: Says the same as P1-053 (too few jobs in town, so I paid attention).
- `outline-talk.verdict-after.talk-address-point-that-s-why-i-m-behind-president-object-on-said` (verdict-after): "That's why I'm behind {president-object} on {said}." — variants-differ-in-what-they-say: Twin of P1-054 ('Which is why I'd back the President').
- `outline-talk.why-first.talk-address-point-i-can-only-judge-said-by-how-place-has-been-going` (why-first): "I can only judge {said} by how {place} has been going." — variants-differ-in-what-they-say: Same as P1-071 (judging the topic by how the town is going).
- `outline-talk.ask.talk-address-point-how-did-said-sit-with-you` (ask): "How did {said} sit with you?" — variants-differ-in-what-they-say: Twin of P1-078 ('What did you make of...').
- `outline-talk.lead.talk-address-point-president-wants-to-end-said` (lead): "{president} wants to end {said}." — variants-differ-in-what-they-say: Twin of P1-091, P1-097 and P1-098 (end, roll back, repeal, put an end to).
- `outline-talk.lead.talk-address-point-president-wants-to-protect-said` (lead): "{president} wants to protect {said}." — variants-differ-in-what-they-say: Twin of P1-089 and P1-093 (keep, protect, defend).
- `outline-talk.lead.talk-address-point-president-plans-to-stand-behind-said` (lead): "{president} plans to stand behind {said}." — variants-differ-in-what-they-say: 'Plans to stand behind' is a stiff twin of P1-089 and P1-093.
- `outline-talk.lead.talk-address-point-president-made-a-point-of-backing-said` (lead): "{president} made a point of backing {said}." — variants-differ-in-what-they-say: Twin of P1-093 ('made a point of backing').
- `outline-talk.lead.talk-address-point-president-wants-to-put-an-end-to-said` (lead): "{president} wants to put an end to {said}." — variants-differ-in-what-they-say: Twin of P1-090 ('wants to put an end to' / 'wants to end').
- `outline-talk.lead.talk-address-point-president-made-a-point-of-attacking-said` (lead): "{president} made a point of attacking {said}." — variants-differ-in-what-they-say: Twin of the repeal leads, and 'made a point of attacking' reads stiff.
- `outline-talk.verdict.talk-address-point-i-m-against-what-president-said-on-said` (verdict): "I'm against what {president} said on {said}." — variants-differ-in-what-they-say: Twin of P1-042 and P1-134 ('against what the President said on').
- `outline-talk.verdict.talk-address-point-i-can-t-stand-behind-president-object-on-said` (verdict): "I can't stand behind {president-object} on {said}." — variants-differ-in-what-they-say: Twin of P1-038 ('can't get behind / stand behind').
- `outline-talk.ask.talk-address-point-what-was-your-take-on-said` (ask): "What was your take on {said}?" — variants-differ-in-what-they-say: Twin of P1-078 ('What did you make of...').
- `outline-talk.ask.talk-address-point-how-do-you-feel-about-what-president-said-on-said` (ask): "How do you feel about what {president} said on {said}?" — variants-differ-in-what-they-say: Twin of P1-078 and P1-118, and stiff.
- `outline-talk.lead.talk-address-point-you-listened-to-president-on-said-didn-t-you` (lead): "You listened to {president} on {said}, didn't you?" — variants-differ-in-what-they-say: Twin of P1-044 ('You were listening when...').
- `outline-talk.lead.talk-address-point-there-it-is-president-wants-to-keep-said` (lead): "There it is: {president} wants to keep {said}." — variants-differ-in-what-they-say: Twin of P1-089 with a 'There it is:' tag.
- `outline-talk.verdict.talk-address-point-here-s-where-president-and-i-split-said` (verdict): "Here's where {president} and I split: {said}." — variants-differ-in-what-they-say: Twin of P1-109 ('far apart' / 'split'), in a composed colon shape.
- `outline-talk.ask.talk-address-point-tell-me-if-i-m-pushing-i-only-want-to-know-where-you-land-on-said` (ask): "Tell me if I'm pushing. I only want to know where you land on {said}." — variants-differ-in-what-they-say: Says the same as P1-137 (am I pushing?) and P1-016.
- `outline-talk.verdict-after.talk-address-point-we-don-t-have-to-settle-said-to-get-through-supper` (verdict-after): "We don't have to settle {said} to get through supper." — variants-differ-in-what-they-say: Twin of P1-139 (we'll still get through supper).
- `outline-talk.why-first.talk-address-point-before-president-even-got-to-said-i-was-thinking-about-place` (why-first): "Before {president} even got to {said}, I was thinking about {place}." — variants-differ-in-what-they-say: Twin of P1-077 (thinking about the town while the President talked).
- `outline-talk.heard.talk-address-point-i-ll-admit-i-watched-your-face-when-said-came-up` (heard): "I'll admit I watched your face when {said} came up." — variants-differ-in-what-they-say: Twin of P1-045 (watching the listener react).

### stance-is-plainly-for-or-against (31)

- `outline-talk.lead.talk-address-point-sounds-like-is-going-to-push-said` (lead): "Sounds like {president} is going to push {said}." — stance-is-plainly-for-or-against: 'Push' plus a bare topic fill ('the retirement age', 'the air') never says what the President is pushing for, so the stand points at nothing named.
- `outline-talk.lead.talk-address-point-so-is-dead-set-against-said` (lead): "So {president} is dead set against {said}." — stance-is-plainly-for-or-against: 'Dead set against' a topic name like 'rents' or 'the retirement age' does not say what the President opposes.
- `outline-talk.lead.talk-address-point-wants-nothing-to-do-with-said` (lead): "{president} wants nothing to do with {said}." — stance-is-plainly-for-or-against: 'Wants nothing to do with' a topic fill leaves the President's actual position unnamed.
- `outline-talk.lead.talk-address-point-is-all-in-on-said` (lead): "{president} is all in on {said}." — stance-is-plainly-for-or-against: 'All in on' a topic fill like 'the air' or 'rents' does not say what the President is for.
- `outline-talk.lead.talk-address-point-came-right-out-for-said` (lead): "{president} came right out for {said}." — stance-is-plainly-for-or-against: 'Came right out for' a bare topic does not name the position, and it twins P1-081.
- `outline-talk.lead.talk-address-point-came-out-against-said` (lead): "{president} came out against {said}." — stance-is-plainly-for-or-against: 'Came out against' a topic such as 'immigration' or 'the retirement age' leaves the actual stand unclear.
- `outline-talk.verdict-cold.talk-address-point-good-on-for-saying-no-to-said` (verdict-cold): "Good on {president-object} for saying no to {said}." — stance-is-plainly-for-or-against: 'Saying no to' a topic fill does not say what was refused.
- `outline-talk.verdict-cold.talk-address-point-is-wrong-to-fight-said` (verdict-cold): "{president} is wrong to fight {said}." — stance-is-plainly-for-or-against: 'Wrong to fight' a bare topic leaves unclear what the President is fighting.
- `outline-talk.lead.talk-address-point-nobody-is-getting-out-of-said` (lead): "Nobody is getting {said} out of {president}." — stance-is-plainly-for-or-against: 'Nobody is getting {said} out of the President' is a quip that, with a topic fill, never says what the President refuses.
- `outline-talk.lead.talk-address-point-said-no-to-flat-out-said` (lead): "{president} said no to {said}, flat out." — stance-is-plainly-for-or-against: 'Said no to {said}, flat out' with a topic fill names no actual position.
- `outline-talk.lead.talk-address-point-you-catch-that-shut-the-door-on-said` (lead): "You catch that? {president} shut the door on {said}." — stance-is-plainly-for-or-against: 'Shut the door on' a topic fill is a stance that points at nothing named.
- `outline-talk.verdict-cold.talk-address-point-is-after-and-i-m-glad-somebody-is-said` (verdict-cold): "{president} is after {said}, and I'm glad somebody is." — stance-is-plainly-for-or-against: 'Is after {said}' with a topic fill does not say what the President is after.
- `outline-talk.lead.talk-address-point-president-came-out-in-favor-of-said` (lead): "{president} came out in favor of {said}." — stance-is-plainly-for-or-against: 'Came out in favor of' a topic fill names no position, and twins P1-018 and P1-101.
- `outline-talk.lead.talk-address-point-president-said-yes-to-said` (lead): "{president} said yes to {said}." — stance-is-plainly-for-or-against: 'Said yes to the retirement age' does not say what the President said yes to.
- `outline-talk.lead.talk-address-point-president-is-backing-said` (lead): "{president} is backing {said}." — stance-is-plainly-for-or-against: 'Is backing' a bare topic leaves the position unclear and twins P1-100.
- `outline-talk.lead.talk-address-point-president-is-firmly-for-said` (lead): "{president} is firmly for {said}." — stance-is-plainly-for-or-against: 'Firmly for' a topic fill names no position; twin of the other for-leads.
- `outline-talk.lead.talk-address-point-president-is-firmly-against-said` (lead): "{president} is firmly against {said}." — stance-is-plainly-for-or-against: 'Firmly against' a topic fill names no position; twin of P1-019.
- `outline-talk.lead.talk-address-point-president-is-opposed-to-said` (lead): "{president} is opposed to {said}." — stance-is-plainly-for-or-against: 'Is opposed to' a topic fill names no position; twin of P1-019 and P1-087.
- `outline-talk.lead.talk-address-point-president-backs-said` (lead): "{president} backs {said}." — stance-is-plainly-for-or-against: 'Backs' a topic fill names no position; twin of P1-083.
- `outline-talk.lead.talk-address-point-president-spoke-in-favor-of-said` (lead): "{president} spoke in favor of {said}." — stance-is-plainly-for-or-against: 'Spoke in favor of' a topic fill names no position; twin of P1-081.
- `outline-talk.lead.talk-address-point-president-argued-for-said` (lead): "{president} argued for {said}." — stance-is-plainly-for-or-against: 'Argued for' a topic fill names no position; twin of P1-103.
- `outline-talk.lead.talk-address-point-president-made-the-case-for-said` (lead): "{president} made the case for {said}." — stance-is-plainly-for-or-against: 'Made the case for' a topic fill names no position; twin of P1-102.
- `outline-talk.lead.talk-address-point-president-argued-against-said` (lead): "{president} argued against {said}." — stance-is-plainly-for-or-against: 'Argued against' a topic fill names no position; twin of P1-105 and P1-106.
- `outline-talk.lead.talk-address-point-president-spoke-against-said` (lead): "{president} spoke against {said}." — stance-is-plainly-for-or-against: 'Spoke against' a topic fill names no position; twin of P1-104.
- `outline-talk.lead.talk-address-point-president-made-the-case-against-said` (lead): "{president} made the case against {said}." — stance-is-plainly-for-or-against: 'Made the case against' a topic fill names no position; twin of P1-104.
- `outline-talk.lead.talk-address-point-president-rejected-said` (lead): "{president} rejected {said}." — stance-is-plainly-for-or-against: 'Rejected the air' or 'rejected rents' says nothing a player can tie to a position.
- `outline-talk.verdict.talk-address-point-that-s-a-no-from-me-on-said` (verdict): "That's a no from me on {said}." — stance-is-plainly-for-or-against: 'A no from me on the retirement age' does not say what the speaker is refusing.
- `outline-talk.lead.talk-address-point-did-you-hear-president-come-out-for-said` (lead): "Did you hear {president} come out for {said}?" — stance-is-plainly-for-or-against: 'Come out for' a topic fill names no position.
- `outline-talk.lead.talk-address-point-you-heard-president-back-said-right` (lead): "You heard {president} back {said}, right?" — stance-is-plainly-for-or-against: 'Back {said}' with a topic fill names no position.
- `outline-talk.lead.talk-address-point-did-president-really-just-say-no-to-said` (lead): "Did {president} really just say no to {said}?" — stance-is-plainly-for-or-against: 'Say no to' a topic fill names no position.
- `outline-talk.lead.talk-address-point-here-we-go-president-came-out-against-said` (lead): "Here we go: {president} came out against {said}." — stance-is-plainly-for-or-against: 'Came out against' a topic fill names no position, and 'Here we go:' is a tag.

### AI-sounding (4)

- `outline-talk.why-first.talk-address-point-what-president-said-on-said-fits-the-way-place-actually-is` (why-first): "What {president} said on {said} fits the way {place} actually is." — AI-sounding: 'Fits the way {place} actually is' is vague, composed phrasing with no concrete fact from the place.
- `outline-talk.why-first.talk-address-point-what-president-said-on-said-isn-t-how-place-works` (why-first): "What {president} said on {said} isn't how {place} works." — AI-sounding: 'Isn't how {place} works' is vague and says no concrete fact; twin of P1-067's shape.
- `outline-talk.lead.talk-address-point-president-sided-with-those-who-want-to-keep-said` (lead): "{president} sided with those who want to keep {said}." — AI-sounding: 'Sided with those who want to keep' is stiff and a twin of P1-089.
- `outline-talk.verdict.talk-address-point-i-d-be-lying-if-i-said-president-had-me-on-said` (verdict): "I'd be lying if I said {president} had me on {said}." — AI-sounding: 'I'd be lying if I said...had me on' is a stock, composed phrasing and twins P1-134.

### false for its facts (2)

- `outline-talk.lead.talk-address-point-of-everything-picked-to-lead-with-said` (lead): "Of everything, {president} picked {said} to lead with." — false for its facts: Claims the President led with the topic, which its requirements (president-for) do not establish.
- `outline-talk.lead.talk-address-point-out-of-the-whole-speech-gave-the-most-time` (lead): "Out of the whole speech, {president} gave {said} the most time." — false for its facts: Claims the topic got the most time in the speech, which its requirements do not record.

### It. What is it? (2)

- `outline-talk.verdict.talk-address-point-i-ve-been-waiting-for-somebody-to-say-that-said` (verdict): "I've been waiting for somebody to say that about {said}." — It. What is it?: 'Say that about {said}' points 'that' at the President's statement without saying what it was.
- `outline-talk.ask.talk-address-point-would-you-say-the-same-about-said` (ask): "Would you say the same about {said}?" — It. What is it?: 'The same' points at nothing named.

### no-filler (1)

- `outline-talk.lead.talk-address-point-funny-i-never-expected-to-bring-up-at-all-said` (lead): "Funny, I never expected {president} to bring up {said} at all." — no-filler: 'Funny,' opener and an invented surprise with no record behind it; a quip with no referent.

### no-pointing-at-the-unnamed (1)

- `outline-talk.verdict.talk-address-point-hard-to-nod-along-when-president-talks-said-about-like-that` (verdict): "Hard to nod along when {president} talks about {said} like that." — no-pointing-at-the-unnamed: 'Like that' points at a way of talking the line never names.

### quips that mean nothing (1)

- `outline-talk.verdict.talk-address-point-president-and-i-agree-on-said-for-a-change` (verdict): "{president} and I agree on {said}, for a change." — quips that mean nothing: 'For a change' implies a history of disagreement no record holds.

### line-fits-the-roles-in-its-situation (1)

- `outline-talk.lead.talk-address-point-anyone-else-hear-president-on-said-or-was-it-just-me` (lead): "Anyone else hear {president} on {said}, or was it just me?" — line-fits-the-roles-in-its-situation: 'Or was it just me?' makes no sense to a housemate who watched the same address.

### person-said-by-role-pronoun-or-relationship (1)

- `outline-talk.lead.talk-address-point-you-d-think-president-would-skip-said-but-president-came-out-against-it` (lead): "You'd think {president} would skip {said}, but {president} came out against it." — person-said-by-role-pronoun-or-relationship: Says the President twice, ends on an unclear 'it', and claims an expectation with no record.

## Passing lines

- `outline-talk.lead.talk-address-point-spent-a-good-while-on` (lead): "{president} spent a good while on {said}."
- `outline-talk.heard.talk-address-point-you-heard-what-said-about` (heard): "You heard what {president} said about {said}."
- `outline-talk.verdict-cold.talk-address-point-i-m-with-on` (verdict-cold): "I'm with {president-object} on {said}."
- `outline-talk.verdict-cold.talk-address-point-has-wrong` (verdict-cold): "{president} has {said} wrong."
- `outline-talk.verdict-cold.talk-address-point-i-can-t-tell-yet-where-i-am-on` (verdict-cold): "I can't tell yet where I am on {said}."
- `outline-talk.why-first.talk-address-point-i-work-at-so-i-listened-when-got-to` (why-first): "I work at {employer}, so I listened when {president} got to {said}."
- `outline-talk.why-first.talk-address-point-since-let-me-go-i-listened-hard-when-got-to` (why-first): "Since {employer} let me go, I listened hard when {president} got to {said}."
- `outline-talk.why-first.talk-address-point-money-s-tight-here-so-i-listened-when-got-to` (why-first): "Money's tight here, so I listened when {president} got to {said}."
- `outline-talk.ask.talk-address-point-where-are-you-on` (ask): "Where are you on {said}?"
- `outline-talk.verdict-cold.talk-address-point-ask-me-about-again-in-a-month` (verdict-cold): "Ask me about {said} again in a month."
- `outline-talk.verdict.talk-address-point-good-i-d-hate-to-lose-said` (verdict): "Good. I'd hate to lose {said}."
- `outline-talk.lead.talk-address-point-notice-how-fast-got-to-said` (lead): "Notice how fast {president} got to {said}."
- `outline-talk.verdict.talk-address-point-finally-somebody-who-sees-the-way-i-do-said` (verdict): "Finally, somebody who sees {said} the way I do."
- `outline-talk.verdict.talk-address-point-i-can-t-get-behind-on-said` (verdict): "I can't get behind {president-object} on {said}."
- `outline-talk.verdict.talk-address-point-can-sell-to-somebody-else-said` (verdict): "{president} can sell {said} to somebody else."
- `outline-talk.verdict-cold.talk-address-point-i-m-not-buying-what-said-on` (verdict-cold): "I'm not buying what {president} said on {said}."
- `outline-talk.heard.talk-address-point-you-were-listening-when-got-to-weren-t-you` (heard): "You were listening when {president} got to {said}, weren't you?"
- `outline-talk.heard.talk-address-point-i-saw-you-look-up-when-mentioned` (heard): "I saw you look up when {president} mentioned {said}."
- `outline-talk.heard.talk-address-point-caught-your-ear-right` (heard): "{said} caught your ear, right?"
- `outline-talk.verdict-cold.talk-address-point-i-like-where-landed-on` (verdict-cold): "I like where {president} landed on {said}."
- `outline-talk.verdict-cold.talk-address-point-is-where-loses-me` (verdict-cold): "{said} is where {president} loses me."
- `outline-talk.why-first.talk-address-point-rent-in-was-on-my-mind-when-got-to` (why-first): "Rent in {place} was on my mind when {president} got to {said}."
- `outline-talk.why-first.talk-address-point-work-is-thin-in-so-had-my-full-attention` (why-first): "Work is thin in {place}, so {said} had my full attention."
- `outline-talk.verdict-after.talk-address-point-which-is-why-i-d-back-on-said` (verdict-after): "Which is why I'd back {president-object} on {said}."
- `outline-talk.verdict-after.talk-address-point-i-m-still-sorting-out-where-i-land-on` (verdict-after): "I'm still sorting out where I land on {said}."
- `outline-talk.ask.talk-address-point-tell-me-i-m-not-the-only-one-thinking-about` (ask): "Tell me I'm not the only one thinking about {said}."
- `outline-talk.lead.talk-address-point-president-called-said-a-mistake-and-said-it-should-end` (lead): "{president} called {said} a mistake and said it should end."
- `outline-talk.verdict.talk-address-point-president-lost-me-on-said` (verdict): "{president} lost me on {said}."
- `outline-talk.verdict.talk-address-point-i-like-most-of-what-president-says-but-not-said` (verdict): "I like most of what {president} says, but not {said}."
- `outline-talk.verdict-cold.talk-address-point-where-president-won-me-over-was-said` (verdict-cold): "Where {president} won me over was {said}."
- `outline-talk.verdict-cold.talk-address-point-i-m-not-with-president-object-on-said` (verdict-cold): "I'm not with {president-object} on {said}."
- `outline-talk.why-first.talk-address-point-i-made-up-my-mind-about-said-just-from-looking-around-place` (why-first): "I made up my mind about {said} just from looking around {place}."
- `outline-talk.verdict-after.talk-address-point-that-s-why-i-can-t-back-president-object-on-said` (verdict-after): "That's why I can't back {president-object} on {said}."
- `outline-talk.why-first.talk-address-point-when-president-got-to-said-i-thought-about-the-people-i-know-in-place` (why-first): "When {president} got to {said}, I thought about the people I know in {place}."
- `outline-talk.ask.talk-address-point-what-did-you-make-of-said` (ask): "What did you make of {said}?"
- `outline-talk.ask.talk-address-point-did-president-lose-you-anywhere-on-said` (ask): "Did {president} lose you anywhere on {said}?"
- `outline-talk.lead.talk-address-point-president-wants-to-keep-said` (lead): "{president} wants to keep {said}."
- `outline-talk.lead.talk-address-point-president-wants-to-roll-back-said` (lead): "{president} wants to roll back {said}."
- `outline-talk.lead.talk-address-point-president-is-defending-said` (lead): "{president} is defending {said}."
- `outline-talk.lead.talk-address-point-president-wants-to-repeal-said` (lead): "{president} wants to repeal {said}."
- `outline-talk.verdict.talk-address-point-i-think-president-is-making-a-mistake-on-said` (verdict): "I think {president} is making a mistake on {said}."
- `outline-talk.verdict.talk-address-point-on-said-president-and-i-are-far-apart` (verdict): "On {said}, {president} and I are far apart."
- `outline-talk.verdict.talk-address-point-i-wish-president-saw-said-the-way-i-do` (verdict): "I wish {president} saw {said} the way I do."
- `outline-talk.verdict.talk-address-point-i-side-with-president-object-on-said` (verdict): "I side with {president-object} on {said}."
- `outline-talk.verdict.talk-address-point-i-m-glad-president-came-down-where-i-did-on-said` (verdict): "I'm glad {president} came down where I did on {said}."
- `outline-talk.ask.talk-address-point-did-you-catch-what-president-said-on-said` (ask): "Did you catch what {president} said on {said}?"
- `outline-talk.ask.talk-address-point-anything-president-said-on-said-change-your-mind` (ask): "Anything {president} said on {said} change your mind?"
- `outline-talk.verdict.talk-address-point-i-can-t-pretend-to-like-what-president-said-on-said` (verdict): "I can't pretend to like what {president} said on {said}."
- `outline-talk.verdict.talk-address-point-i-d-hoped-for-something-different-from-president-object-on-said` (verdict): "I'd hoped for something different from {president-object} on {said}."
- `outline-talk.ask.talk-address-point-do-you-mind-talking-about-said-or-should-i-drop-it` (ask): "Do you mind talking about {said}, or should I drop it?"
- `outline-talk.verdict-after.talk-address-point-you-can-disagree-with-me-said-about-and-we-ll-still-eat-supper` (verdict-after): "You can disagree with me about {said}, and we'll still eat supper."
- `outline-talk.verdict-after.talk-address-point-i-won-t-bring-up-said-again-if-it-bothers-you` (verdict-after): "I won't bring up {said} again if it bothers you."
- `outline-talk.verdict-after.talk-address-point-say-what-you-think-said-about-i-d-rather-hear-it-than-guess` (verdict-after): "Say what you think about {said}. I'd rather hear it than guess."
- `outline-talk.heard.talk-address-point-neither-of-us-missed-said-did-we` (heard): "Neither of us missed {said}, did we?"
