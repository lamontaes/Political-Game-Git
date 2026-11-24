# Pre-grade: W2's victory-night lines (scene-talk.json, purpose victory-night)

Pre-grader, 2026-11-24. Story lead's PR #10390 at `6dda0573` (W2's `e1c25ca1` merged in). Fails quote the line and give the rule; no new wording is suggested.

## Result: 15 of 61 pass

- All 61 were read blind in chunk NJ, with 8 planted owner-graded lines (4 passed, 4 rejected) and 30 earlier-graded lines mixed in. The reader caught all 8 plants; 23 of the 30 earlier lines got the same verdict again.
- The reader was told how {office} fills in this scene, from the code (`officeSaid` in `src/director/cause-facts.ts`, through `seatSaid` in `src/english/journal-words.ts`, called without `asMember`):
  - a single office is its title in lower case ("mayor");
  - a seat on a town body with more than one seat is the whole body ("the Mutual Village Council");
  - a district seat is "state representative in District 38".
- **The main cause: 24 of the 46 fails are mainly the {office} fill, and several more fail on it in part.** Lines that use {office} as the thing won, earned, wanted, feared or started ("win {office}", "{office} is yours", "You earned {office}", "as {office}", "{office} starts tomorrow") read wrong with a title and are false with a body: the player won one seat, not the council. What reads with every fill is "run for {office}" and "the race for {office}". Those lines pass.

## As played

- `src/director/victory-night.test.ts` at `6dda0573` in North Westminster, Vermont (5052375), world seed 18d0fb93…6b39: the room's question played "How does it feel to win selectboard member?" (opponent person_2e3e271caeb3b4c3). The seat's office record gave the member title rather than the body, so this is a fourth fill form, and "win selectboard member" is the awkward case above, seen in play.
- I played this one pinned race only. The test prints the question line, not the whole talk.

## Passing lines

- `scene-talk.open-greet.there-you-are-first-congratulations` (open-greet): "There you are, {first}. Congratulations."
- `scene-talk.open-greet.over-here-first-everyone-s-been-waiting-for-you` (open-greet): "Over here, {first}. Everyone's been waiting for you."
- `scene-talk.open-greet.first-you-did-it` (open-greet): "{first}! You did it."
- `scene-talk.state-ask.what-do-you-say-to-the-people-who-voted-for-opponent` (state-ask): "What do you say to the people who voted for {opponent}?"
- `scene-talk.state-ask.will-you-call-opponent` (state-ask): "Will you call {opponent}?"
- `scene-talk.reply-apologize.i-shouldn-t-have-said-that-about-opponent-not-now` (reply-apologize): "I shouldn't have said that about {opponent}. Not now."
- `scene-talk.reply-ask.has-opponent-called-yet` (reply-ask): "Has {opponent} called yet?"
- `scene-talk.reply-boast.we-outworked-opponent-and-the-count-shows-it` (reply-boast): "We outworked {opponent}, and the count shows it."
- `scene-talk.reply-leave.i-m-going-to-find-my-family-first-thank-you` (reply-leave): "I'm going to find my family, {first}. Thank you."
- `scene-talk.reply-tell.i-couldn-t-have-run-for-office-without-every-one-of-you` (reply-tell): "I couldn't have run for {office} without every one of you."
- `scene-talk.reply-tell.opponent-ran-a-hard-race-and-i-respect-that` (reply-tell): "{opponent} ran a hard race, and I respect that."
- `scene-talk.follow-answer.opponent-hasn-t-called-yet-we-re-watching-the-phone` (follow-answer): "{opponent} hasn't called yet. We're watching the phone."
- `scene-talk.follow-answer.plenty-of-us-came-out-for-you-in-the-race-for-office-and-we-d-do-it-again` (follow-answer): "Plenty of us came out for you in the race for {office}, and we'd do it again."
- `scene-talk.follow-warn.careful-opponent-s-people-are-in-this-room-too` (follow-warn): "Careful. {opponent}'s people are in this room too."
- `scene-talk.close-thank.thank-you-first-for-running-for-office` (close-thank): "Thank you, {first}, for running for {office}."

## Failing lines: the {office} fill (24)

- `scene-talk.narrate-narrate.the-room-goes-quiet-for-the-last-numbers-then-loud-again-office-is-yours` (narrate-narrate): "The room goes quiet for the last numbers, then loud again. {office} is yours." — office fill / no-literary-phrasing: '{office} is yours' is false with a council fill ('The Mutual Village Council is yours') and awkward with 'mayor', and 'then loud again' is composed texture.
- `scene-talk.state-ask.what-happens-tomorrow-now-that-you-ve-won-office` (state-ask): "What happens tomorrow, now that you've won {office}?" — office fill: 'now that you've won mayor' is awkward and 'won the Mutual Village Council' is false.
- `scene-talk.state-ask.did-you-think-you-d-win-office` (state-ask): "Did you think you'd win {office}?" — office fill: 'Did you think you'd win mayor?' is awkward and 'win the Mutual Village Council' is false.
- `scene-talk.state-ask.how-does-it-feel-to-win-office` (state-ask): "How does it feel to win {office}?" — office fill: 'to win mayor' is awkward and 'to win the Mutual Village Council' is false.
- `scene-talk.state-ask.what-s-the-first-thing-you-ll-do-as-office` (state-ask): "What's the first thing you'll do as {office}?" — office fill: 'as the Mutual Village Council' does not read with a council-seat fill.
- `scene-talk.reply-answer.right-now-i-want-to-thank-everyone-in-this-room-office-can-wait-until-morning` (reply-answer): "Right now I want to thank everyone in this room. {office} can wait until morning." — office fill: 'Mayor can wait until morning' or 'state representative in District 38 can wait' does not read; the office is not a thing that waits.
- `scene-talk.reply-answer.i-ll-start-by-listening-and-then-i-ll-get-to-work-on-office` (reply-answer): "I'll start by listening, and then I'll get to work on {office}." — no-stock-phrases / office fill: 'I'll start by listening' is stock, and 'get to work on mayor' does not read.
- `scene-talk.reply-answer.honestly-office-hasn-t-sunk-in-yet-ask-me-tomorrow` (reply-answer): "Honestly, {office} hasn't sunk in yet. Ask me tomorrow." — office fill: 'Mayor hasn't sunk in yet' does not read; the win is what hasn't sunk in.
- `scene-talk.reply-answer.i-wanted-office-and-i-ll-try-to-deserve-it` (reply-answer): "I wanted {office}, and I'll try to deserve it." — office fill: 'I wanted mayor' is awkward, and 'try to deserve it' reads composed.
- `scene-talk.reply-answer.ask-me-again-once-i-ve-slept-office-is-still-new` (reply-answer): "Ask me again once I've slept. {office} is still new." — vary-the-shape / office fill: Same move as NJ-057 ('Ask me tomorrow'), and 'mayor is still new' does not read.
- `scene-talk.reply-apologize.sorry-first-i-got-carried-away-about-office` (reply-apologize): "Sorry, {first}. I got carried away about {office}." — office fill: 'carried away about mayor' does not read, and it is not clear what the apology is for.
- `scene-talk.reply-ask.who-do-i-need-to-call-first-about-office` (reply-ask): "Who do I need to call first about {office}?" — office fill: 'call first about mayor' or 'about the Mutual Village Council' is awkward; the question needs a subject people would say.
- `scene-talk.reply-boast.nobody-believed-we-d-win-office-look-at-us` (reply-boast): "Nobody believed we'd win {office}. Look at us." — office fill ("win the Mutual Village Council"): 'win {office}' breaks with the fills: nobody 'wins mayor', and a council seat fill says they won the whole council.
- `scene-talk.reply-boast.i-told-you-we-d-win-office-and-we-did` (reply-boast): "I told you we'd win {office}, and we did." — office fill: 'we'd win mayor' and 'we'd win the Mutual Village Council' do not read.
- `scene-talk.reply-leave.i-need-some-air-i-ll-be-back-for-office-s-first-morning` (reply-leave): "I need some air. I'll be back for {office}'s first morning." — office fill: '{office}'s first morning' is an odd phrase that reads wrong with every fill.
- `scene-talk.reply-tell.i-m-tired-i-m-happy-and-i-m-a-little-scared-of-office` (reply-tell): "I'm tired, I'm happy, and I'm a little scared of {office}." — speech-craft-is-earned / office fill: A neat list of three, and 'scared of mayor' does not read.
- `scene-talk.follow-accept.you-earned-office` (follow-accept): "You earned {office}." — office fill: 'You earned mayor' is awkward and 'You earned the Mutual Village Council' is false; he liked 'You earned this.'
- `scene-talk.follow-answer.people-expect-you-to-deliver-on-office-that-s-all` (follow-answer): "People expect you to deliver on {office}. That's all." — office fill / no-offer-tags: 'deliver on mayor' does not read, and 'That's all.' is a dead tag.
- `scene-talk.follow-press.come-on-give-us-one-thing-you-ll-do-for-office` (follow-press): "Come on. Give us one thing you'll do for {office}." — office fill: 'one thing you'll do for mayor' does not read; people say 'as mayor'.
- `scene-talk.follow-press.be-specific-what-changes-first-with-office` (follow-press): "Be specific: what changes first with {office}?" — office fill: 'what changes first with mayor' does not read, and the colon makes it stiff.
- `scene-talk.follow-warn.don-t-gloat-office-is-a-long-job` (follow-warn): "Don't gloat. {office} is a long job." — office fill: 'The Mutual Village Council is a long job' is wrong, and 'state representative in District 38 is a long job' does not read.
- `scene-talk.close-accept.go-enjoy-it-you-ve-earned-office` (close-accept): "Go enjoy it. You've earned {office}." — office fill / vary-the-shape: 'You've earned mayor' does not read and repeats NJ-020.
- `scene-talk.close-promise.count-on-us-for-office-we-ll-show-up` (close-promise): "Count on us for {office}. We'll show up." — office fill / no-quick-resolution: 'Count on us for mayor' does not read, and 'We'll show up' is the quick resolution he rejected.
- `scene-talk.close-warn.enjoy-it-because-office-won-t-be-this-easy` (close-warn): "Enjoy it, because {office} won't be this easy." — office fill: 'mayor won't be this easy' does not read; the job is what won't be easy, not the office's name.

## Failing lines: other rules (22)

- `scene-talk.narrate-narrate.people-keep-asking-about-opponent-and-the-count-for-office-is-final` (narrate-narrate): "People keep asking about {opponent}, and the count for {office} is final." — every-line-gives-its-context: Two unrelated clauses: what people are asking about the opponent is never said, and it reads like a non-sequitur in the narration.
- `scene-talk.narrate-narrate.your-phone-is-full-of-messages-and-the-count-for-office-is-final` (narrate-narrate): "Your phone is full of messages, and the count for {office} is final." — vary-the-shape: Same tail as NJ-005 ('..., and the count for {office} is final'), so the narration repeats its shape.
- `scene-talk.narrate-narrate.someone-has-already-hung-a-banner-for-office-you-didn-t-ask-for-it` (narrate-narrate): "Someone has already hung a banner for {office}. You didn't ask for it." — narration-assumes-no-reason: 'You didn't ask for it' gives the player a feeling and a history, and 'a banner for the Mutual Village Council' reads wrong.
- `scene-talk.narrate-narrate.folding-chairs-paper-cups-and-a-count-for-office-that-came-out-your-way` (narrate-narrate): "Folding chairs, paper cups, and a count for {office} that came out your way." — no-literary-phrasing: A composed list fragment of props with no verb is visibly written texture.
- `scene-talk.reply-ask.what-do-people-expect-from-office-now` (reply-ask): "What do people expect from {office} now?" — no-reply-asks-what-the-listener-cannot-know: 'expect from mayor' does not read, and the supporter holds no record of what people expect.
- `scene-talk.reply-ask.what-did-you-hear-out-there-about-opponent-s-side` (reply-ask): "What did you hear out there about {opponent}'s side?" — question-names-its-subject: 'about {opponent}'s side' is vague; what side, and what would the supporter have heard out there?
- `scene-talk.reply-leave.let-me-get-through-this-crowd-first-then-i-ll-answer-everything-about-office` (reply-leave): "Let me get through this crowd first. Then I'll answer everything about {office}." — no-non-replies: Defers everything to later, and 'everything about mayor' does not read.
- `scene-talk.reply-tell.i-thought-about-quitting-twice-on-this-race-for-office-i-m-glad-i-didn-t` (reply-tell): "I thought about quitting twice on this race for {office}. I'm glad I didn't." — childhood-lines-claim-no-outcomes / false fact: It claims the player thought about quitting twice, which no record holds.
- `scene-talk.follow-accept.that-s-honest-we-needed-to-hear-it-from-whoever-won-office` (follow-accept): "That's honest. We needed to hear it from whoever won {office}." — fits-speaker-and-tie: 'whoever won {office}' talks about the winner standing there as if a stranger.
- `scene-talk.follow-accept.that-s-what-we-wanted-to-hear-about-office` (follow-accept): "That's what we wanted to hear about {office}." — rejected-by-voice: Echoes the rejected 'That's all we need to hear', and 'hear about mayor' does not read.
- `scene-talk.follow-accept.good-we-ll-be-with-you-for-office` (follow-accept): "Good. We'll be with you for {office}." — vary-the-shape: The same sentence as NJ-045 with 'Good.' in front.
- `scene-talk.follow-press.that-s-not-an-answer-what-will-you-do-first-as-office` (follow-press): "That's not an answer. What will you do first as {office}?" — vary-the-shape: Asks NJ-094's question again in a follow-up, which is the rehash he rejected.
- `scene-talk.follow-warn.easy-win-it-first-then-brag-about-office` (follow-warn): "Easy. Win it first, then brag about {office}." — tense-of-the-record: 'Win it first' on the night the player has already won is false.
- `scene-talk.close-accept.go-on-we-ll-talk-about-office-when-you-ve-slept` (close-accept): "Go on. We'll talk about {office} when you've slept." — no-non-replies: Closes on a promise to talk later, and 'talk about mayor' is awkward.
- `scene-talk.close-accept.go-find-your-family-office-starts-tomorrow` (close-accept): "Go find your family. {office} starts tomorrow." — false fact: '{office} starts tomorrow' is false; a term starts on its record's date, not the morning after the count.
- `scene-talk.close-press.don-t-forget-what-you-said-about-office` (close-press): "Don't forget what you said about {office}." — no-pointing-at-the-unnamed: 'what you said about {office}' points at something never said; a press needs the promise named.
- `scene-talk.close-press.we-ll-be-asking-about-office` (close-press): "We'll be asking about {office}." — no-pointing-at-the-unnamed: 'We'll be asking about mayor' is vague, sounds like a reporter rather than a supporter, and closes on checking in later.
- `scene-talk.close-promise.we-ll-be-there-when-office-gets-hard` (close-promise): "We'll be there when {office} gets hard." — no-quick-resolution ("We'll be there" graded bad): Echoes the rejected 'We'll be there', and 'when mayor gets hard' does not read with the office fills.
- `scene-talk.close-promise.we-ll-be-with-you-for-office` (close-promise): "We'll be with you for {office}." — vary-the-shape / no-quick-resolution: Same sentence as NJ-079, a bare 'We'll be with you' that says nothing, and 'for mayor' reads wrong.
- `scene-talk.close-thank.thanks-for-all-of-it-first-this-belongs-to-you` (close-thank): "Thanks for all of it, {first}. This belongs to you." — fits-speaker-and-tie: A supporter telling the winner 'This belongs to you' and thanking them 'for all of it' is the candidate's line turned around, vague and stock.
- `scene-talk.close-thank.thank-you-first-we-needed-someone-to-run-for-office` (close-thank): "Thank you, {first}. We needed someone to run for {office}." — vary-the-shape / false fact: Same shape as NJ-058, and 'We needed someone to run' implies nobody else ran when there was an opponent.
- `scene-talk.close-warn.enjoy-this-soon-office-is-real` (close-warn): "Enjoy this. Soon, {office} is real." — no-literary-phrasing: 'Soon, mayor is real' is awkward and literary.

## Notes

- Verdicts are one blind reader's call; the calibration says the reader hears the owner, but a single borderline verdict is still one reader's.
- Several fails are the same sentence twice ("We'll be with you for {office}." under follow-accept and close-promise) or the same tail ("…, and the count for {office} is final." twice in the narration).
