# Pre-grade: W2's victory-night and race-lost lines (scene-talk.json)

Pre-grader, 2026-11-24. Fails quote the line and give the rule; no new wording is suggested.

## story/w-stand-close at `7dfd9789` (newest): 54 of 54 pass

- Since 0fe7025f: the 32 failed lines were cut (13 victory night, 19 concession call). Nothing was added or reworded, so no re-read is needed. Checked by key and text: every remaining line is one that passed below, and every cut line is one listed as failing.

## story/w-stand-close at `0fe7025f`: 54 of 86 pass

- Victory night: 31 of 44; Race lost (concession call): 23 of 42.
- Read blind in chunk NL (calibration 8/8; 22 of 30 earlier-graded lines got the same verdict again). Lines word for word the same as at `6dda0573` keep that read's verdict. The new reader failed 5 of those carried passes; they are listed below so you can see them, and they count as passes.
- **{office} is fixed.** It now appears only in "the race for {office}" and "run for {office}", and no line fails on the fill.
- **What fails now:**
  - repeated openings: "The count in the race for {office} is final" three times, "…before I call {opponent}" three times, and "The longer…, the…" twice;
  - concession lines that contradict a final count ("There's a chance", "Not until every ballot… is counted");
  - composed narration ("The coffee has gone cold", "Your room is quiet");
  - "call" puns and garbles ("It's your call about {opponent}", "We'll wait on {opponent}").

## As played

- `src/director/victory-night.test.ts` at `0fe7025f`, North Westminster, Vermont (5052375), world seed 18d0fb93…6b39: the room's question played "What do you think Michael Wise, a member of the Westminster Selectboard, is doing right now?" The reader fails this line: no record can answer it. In play, {opponent} also fills as the full name plus a role clause, which makes the question longer and stiffer.
- `src/bench/concession-close-call.test.ts` fails at this head, in Amherst, New Hampshire (3301220), world seed 2988b829…df4a9: the loss "offers no 'How close was it?'". That line is not in any bank at `0fe7025f` or at `6dda0573`, so the failure is not caused by W2's change. It was not run at `6dda0573` to confirm.

## Victory night: 31 of 44 pass

### Passing lines

- `scene-talk.narrate-narrate.your-phone-starts-buzzing-the-moment-the-race-for-office-is-called` (narrate-narrate): "Your phone starts buzzing the moment the race for {office} is called."
- `scene-talk.open-greet.there-you-are-first-congratulations` (open-greet): "There you are, {first}. Congratulations."
- `scene-talk.open-greet.first-you-did-it` (open-greet): "{first}! You did it."
- `scene-talk.open-greet.over-here-first-everyone-s-been-waiting-for-you` (open-greet): "Over here, {first}. Everyone's been waiting for you."
- `scene-talk.state-ask.are-you-going-to-say-something-to-opponent-s-supporters` (state-ask): "Are you going to say something to {opponent}'s supporters?"
- `scene-talk.state-ask.what-do-you-say-to-the-people-who-voted-for-opponent` (state-ask): "What do you say to the people who voted for {opponent}?"
- `scene-talk.state-ask.how-does-it-feel-to-win-the-race-for-office` (state-ask): "How does it feel to win the race for {office}?"
- `scene-talk.state-ask.did-you-expect-to-win-the-race-for-office` (state-ask): "Did you expect to win the race for {office}?"
- `scene-talk.state-ask.will-you-call-opponent` (state-ask): "Will you call {opponent}?"
- `scene-talk.state-ask.what-s-the-first-thing-you-ll-do-now-that-the-race-for-office-is-over` (state-ask): "What's the first thing you'll do now that the race for {office} is over?"
- `scene-talk.reply-answer.i-want-to-thank-everyone-in-place-first-then-i-ll-think-about-what-s-next` (reply-answer): "I want to thank everyone in {place} first. Then I'll think about what's next."
- `scene-talk.reply-answer.i-ll-call-opponent-in-the-morning-once-things-are-quiet` (reply-answer): "I'll call {opponent} in the morning, once things are quiet."
- `scene-talk.reply-apologize.i-shouldn-t-have-said-that-about-opponent-not-now` (reply-apologize): "I shouldn't have said that about {opponent}. Not now." (carried from `6dda0573`; this reader failed it: He called 'You're right, I shouldn't have said that' AI responding.)
- `scene-talk.reply-ask.has-opponent-called-yet` (reply-ask): "Has {opponent} called yet?"
- `scene-talk.reply-ask.what-are-people-in-place-saying-out-there` (reply-ask): "What are people in {place} saying out there?"
- `scene-talk.reply-boast.nobody-gave-us-a-chance-against-opponent-look-at-us-now` (reply-boast): "Nobody gave us a chance against {opponent}. Look at us now."
- `scene-talk.reply-boast.we-outworked-opponent-and-the-count-shows-it` (reply-boast): "We outworked {opponent}, and the count shows it."
- `scene-talk.reply-leave.i-need-a-minute-with-my-family-then-i-ll-talk-to-everyone-in-place` (reply-leave): "I need a minute with my family. Then I'll talk to everyone in {place}."
- `scene-talk.reply-leave.i-m-going-to-find-my-family-first-thank-you` (reply-leave): "I'm going to find my family, {first}. Thank you."
- `scene-talk.reply-tell.i-couldn-t-have-run-for-office-without-every-one-of-you` (reply-tell): "I couldn't have run for {office} without every one of you." (carried from `6dda0573`; this reader failed it: You could run without them; the thanks belongs to winning, so 'couldn't have run' says the wrong thing.)
- `scene-talk.reply-tell.opponent-ran-a-hard-race-and-i-respect-that` (reply-tell): "{opponent} ran a hard race, and I respect that."
- `scene-talk.reply-tell.i-m-tired-and-happy-and-i-m-a-little-scared-of-letting-place-down` (reply-tell): "I'm tired and happy, and I'm a little scared of letting {place} down."
- `scene-talk.follow-accept.good-place-is-glad-it-s-you` (follow-accept): "Good. {place} is glad it's you."
- `scene-talk.follow-answer.people-in-place-came-out-for-you-and-they-d-do-it-again` (follow-answer): "People in {place} came out for you, and they'd do it again."
- `scene-talk.follow-answer.plenty-of-us-came-out-for-you-in-the-race-for-office-and-we-d-do-it-again` (follow-answer): "Plenty of us came out for you in the race for {office}, and we'd do it again." (carried from `6dda0573`; this reader failed it: The same line as NL-009, made clumsier with 'in the race for {office}'.)
- `scene-talk.follow-answer.opponent-hasn-t-called-yet-we-re-watching-the-phone` (follow-answer): "{opponent} hasn't called yet. We're watching the phone."
- `scene-talk.follow-press.that-s-not-an-answer-what-will-you-do-first-for-place` (follow-press): "That's not an answer. What will you do first for {place}?"
- `scene-talk.follow-press.come-on-give-us-one-thing-you-ll-do-for-place` (follow-press): "Come on. Give us one thing you'll do for {place}."
- `scene-talk.follow-warn.careful-opponent-s-people-are-in-this-room-too` (follow-warn): "Careful. {opponent}'s people are in this room too." (carried from `6dda0573`; this reader failed it: The opponent's people would not be in the winner's room on election night.)
- `scene-talk.close-thank.thank-you-first-for-running-for-office` (close-thank): "Thank you, {first}, for running for {office}." (carried from `6dda0573`; this reader failed it: The name wedged mid-sentence reads stiff, and it is the same line as NL-119.)
- `scene-talk.close-thank.thanks-for-running-for-office-first` (close-thank): "Thanks for running for {office}, {first}."

### Failing lines

- `scene-talk.narrate-narrate.the-count-is-final-and-opponent-is-second-behind-you` (narrate-narrate): "The count is final, and {opponent} is second behind you." — awkward or AI-sounding: 'Second behind you' is a clumsy, report-like way to say you won.
- `scene-talk.narrate-narrate.people-in-the-room-keep-asking-about-opponent` (narrate-narrate): "People in the room keep asking about {opponent}." — no-pointing-at-the-unnamed: It never says what people are asking about the opponent.
- `scene-talk.state-ask.what-do-you-think-opponent-is-doing-right-now` (state-ask): "What do you think {opponent} is doing right now?" — question-offered-only-when-a-record-answers: Nothing in the game can answer what the opponent is doing right now.
- `scene-talk.reply-answer.honestly-the-race-for-office-hasn-t-sunk-in-yet` (reply-answer): "Honestly, the race for {office} hasn't sunk in yet." — awkward or AI-sounding: It's the win that hasn't sunk in, not the race, and 'Honestly,' pads it.
- `scene-talk.reply-apologize.sorry-that-came-out-wrong-about-opponent` (reply-apologize): "Sorry, that came out wrong about {opponent}." — awkward or AI-sounding: 'That came out wrong about {opponent}' is not how people say it.
- `scene-talk.reply-ask.did-opponent-s-people-come-to-the-party` (reply-ask): "Did {opponent}'s people come to the party?" — false for its facts: The opponent's supporters would not come to the winner's party.
- `scene-talk.reply-tell.i-ran-this-race-for-people-in-place-and-i-won-t-forget-it` (reply-tell): "I ran this race for people in {place}, and I won't forget it." — no-pointing-at-the-unnamed: 'I won't forget it' has no clear 'it'.
- `scene-talk.follow-accept.that-s-what-place-needed-to-hear` (follow-accept): "That's what {place} needed to hear." — rejected-by-voice: He rejected 'That's all we need to hear' as making no sense.
- `scene-talk.follow-warn.easy-opponent-s-supporters-can-hear-you` (follow-warn): "Easy. {opponent}'s supporters can hear you." — vary-the-shape: Same warn shape as NL-017, and the opponent's supporters overhearing a victory party is unlikely.
- `scene-talk.close-accept.go-find-your-family-we-ll-talk-about-the-race-for-office-when-you-ve-slept` (close-accept): "Go find your family. We'll talk about the race for {office} when you've slept." — awkward or AI-sounding: 'When you've slept' is odd, and talking 'about the race' once it's over is padding.
- `scene-talk.close-accept.go-on-everyone-in-place-will-understand` (close-accept): "Go on. Everyone in {place} will understand." — fits-speaker-and-tie: A supporter can't speak for 'everyone in {place}'.
- `scene-talk.close-press.we-ll-be-asking-what-happens-next-for-place` (close-press): "We'll be asking what happens next for {place}." — fits-speaker-and-tie: It sounds like a reporter, not a supporter, and it is vague.
- `scene-talk.close-warn.enjoy-this-the-work-for-place-starts-soon` (close-warn): "Enjoy this. The work for {place} starts soon." — rejected-by-voice: 'The work starts soon' is the shape he called unnatural ('Today the work starts').

## Race lost (concession call): 23 of 42 pass

### Passing lines

- `scene-talk.state-request.the-count-for-office-is-final-it-s-time-to-call-opponent` (state-request): "The count in the race for {office} is final. It's time to call {opponent}."
- `scene-talk.state-request.the-numbers-for-office-aren-t-going-to-change-call-opponent` (state-request): "The numbers in the race for {office} aren't going to change. Call {opponent}."
- `scene-talk.state-request.opponent-is-waiting-to-hear-from-you-about-office` (state-request): "{opponent} is waiting to hear from you about the race for {office}."
- `scene-talk.state-request.will-you-call-opponent-and-concede-office` (state-request): "Will you call {opponent} and concede the race for {office}?"
- `scene-talk.state-request.people-are-asking-whether-you-ll-call-opponent` (state-request): "People are asking whether you'll call {opponent}."
- `scene-talk.reply-agree.i-ll-make-the-call-opponent-earned-office` (reply-agree): "I'll make the call. {opponent} ran a good race for {office}."
- `scene-talk.reply-agree.hand-me-the-phone-opponent-deserves-to-hear-it-from-me` (reply-agree): "Hand me the phone. {opponent} deserves to hear it from me."
- `scene-talk.reply-agree.you-re-right-i-ll-call-opponent` (reply-agree): "You're right. I'll call {opponent}."
- `scene-talk.reply-ask.did-opponent-win-it-clean` (reply-ask): "Did {opponent} win it clean?"
- `scene-talk.reply-ask.how-many-votes-are-still-out-for-office` (reply-ask): "How many votes are still out in the race for {office}?"
- `scene-talk.reply-ask.is-there-any-chance-left-for-office` (reply-ask): "Is there any chance left in the race for {office}?"
- `scene-talk.reply-leave.i-ll-find-you-after-i-ve-talked-to-opponent` (reply-leave): "I'll find you after I've talked to {opponent}."
- `scene-talk.reply-leave.i-need-some-air-before-i-call-opponent` (reply-leave): "I need some air before I call {opponent}."
- `scene-talk.reply-refuse.i-m-not-calling-opponent-yet` (reply-refuse): "I'm not calling {opponent} yet."
- `scene-talk.reply-refuse.i-m-not-ready-to-hand-office-over` (reply-refuse): "I'm not ready to give up the race for {office}."
- `scene-talk.reply-stall.not-yet-i-need-to-think-about-what-to-say-to-opponent` (reply-stall): "Not yet. I need to think about what to say to {opponent}."
- `scene-talk.reply-stall.let-me-tell-my-family-before-i-call-opponent` (reply-stall): "Let me tell my family before I call {opponent}."
- `scene-talk.follow-plea.i-know-it-hurts-please-call-opponent` (follow-plea): "I know it hurts. Please call {opponent}."
- `scene-talk.follow-plea.please-for-everyone-who-worked-on-office-make-the-call` (follow-plea): "Please, for everyone who worked on the race for {office}, make the call."
- `scene-talk.follow-thank.you-ran-a-good-race-for-office-thank-you` (follow-thank): "You ran a good race for {office}. Thank you."
- `scene-talk.close-press.i-ll-ask-again-once-the-count-for-office-is-certified` (close-press): "I'll ask again once the race for {office} is certified."
- `scene-talk.close-thank.thank-you-for-calling-opponent-it-was-a-gracious-thing-to-do` (close-thank): "Thank you for calling {opponent}. It was a gracious thing to do."
- `scene-talk.close-warn.the-longer-you-wait-on-opponent-the-harder-it-gets` (close-warn): "The longer you wait on {opponent}, the harder it gets."

### Failing lines

- `scene-talk.narrate-narrate.the-count-for-office-is-final-and-your-name-isn-t-first` (narrate-narrate): "The count in the race for {office} is final, and your name isn't first." — no-literary-phrasing: 'Your name isn't first' is a composed way to say you lost, and it repeats NL-001's opening clause.
- `scene-talk.narrate-narrate.opponent-s-people-are-cheering-somewhere-else-your-room-is-quiet` (narrate-narrate): "{opponent}'s people are cheering somewhere else. Your room is quiet." — no-literary-phrasing: 'Cheering somewhere else. Your room is quiet.' is composed contrast.
- `scene-talk.narrate-narrate.the-coffee-has-gone-cold-and-the-count-for-office-hasn-t-moved` (narrate-narrate): "The coffee has gone cold, and the count in the race for {office} hasn't moved." — no-literary-phrasing: 'The coffee has gone cold' is composed texture, and 'hasn't moved' fights a final count.
- `scene-talk.narrate-narrate.nobody-in-the-room-wants-to-be-the-first-to-say-opponent-s-name` (narrate-narrate): "Nobody in the room wants to be the first to say {opponent}'s name." — no-explaining: A literary narrator line that explains the room's mood.
- `scene-talk.reply-refuse.not-until-every-ballot-for-office-is-counted` (reply-refuse): "Not until every ballot in the race for {office} is counted." — false for its facts: The count is already final, so 'not until every ballot is counted' contradicts the scene.
- `scene-talk.reply-stall.give-me-a-few-minutes-before-i-call-opponent` (reply-stall): "Give me a few minutes before I call {opponent}." — vary-the-shape: A third '... before I call {opponent}' stall after NL-079 and NL-091.
- `scene-talk.follow-answer.the-count-for-office-is-final-opponent-won-it` (follow-answer): "The count in the race for {office} is final. {opponent} won it." — vary-the-shape: Opens with the same 'The count in the race for {office} is final' as NL-001 and NL-004.
- `scene-talk.follow-answer.it-s-cleaner-than-you-d-think-opponent-carried-office-fairly` (follow-answer): "It's cleaner than you'd think. {opponent} won the race for {office} fairly." — reply-follows-the-line-before: 'It's cleaner than you'd think' implies it was dirty and reads oddly.
- `scene-talk.follow-answer.there-s-a-chance-but-opponent-s-lead-for-office-is-holding` (follow-answer): "There's a chance, but {opponent}'s lead in the race for {office} is holding." — false for its facts: 'There's a chance' contradicts a final count.
- `scene-talk.follow-press.that-won-t-bring-office-back-it-only-makes-the-call-harder` (follow-press): "That won't change the race for {office}. It only makes the call harder." — awkward or AI-sounding: 'Won't change the race' is vague, and the second sentence explains the moment.
- `scene-talk.follow-press.the-longer-we-wait-on-opponent-the-worse-it-looks` (follow-press): "The longer we wait on {opponent}, the worse it looks." — vary-the-shape: The same 'The longer..., the...' shape as NL-024.
- `scene-talk.follow-press.waiting-won-t-change-the-count-for-office-call-opponent` (follow-press): "Waiting won't change the count in the race for {office}. Call {opponent}." — vary-the-shape: The same line as NL-003 with 'waiting' swapped in.
- `scene-talk.follow-thank.thank-you-calling-opponent-is-the-hardest-call-there-is` (follow-thank): "Thank you. Calling {opponent} is the hardest call there is." — no-stock-phrases: 'The hardest call there is' is a stock line that explains the moment instead of saying something.
- `scene-talk.follow-thank.thanks-for-doing-this-opponent-will-remember-how-you-handled-office` (follow-thank): "Thanks for doing this. {opponent} will remember how you handled the race for {office}." — vary-the-shape: Same shape as NL-065, and 'how you handled the race for {office}' is padded.
- `scene-talk.close-accept.all-right-we-ll-wait-on-opponent-until-you-re-ready` (close-accept): "All right. We'll wait on {opponent} until you're ready." — no-dangling-fragments: 'We'll wait on {opponent}' garbles the meaning; they're waiting on the player's call, not on the opponent.
- `scene-talk.close-accept.all-right-it-s-your-call-about-opponent-and-we-ll-back-it` (close-accept): "All right. It's your call about {opponent}, and we'll back it." — awkward or AI-sounding: 'It's your call about {opponent}' is a clumsy pun on the call.
- `scene-talk.close-press.we-ll-come-back-to-opponent-when-the-count-is-certified` (close-press): "We'll come back to {opponent} when the count is certified." — awkward or AI-sounding: 'Come back to {opponent}' garbles the call.
- `scene-talk.close-thank.thank-you-opponent-will-hear-that-you-meant-it` (close-thank): "Thank you. {opponent} will hear that you meant it." — awkward or AI-sounding: '{opponent} will hear that you meant it' makes no sense from a supporter.
- `scene-talk.close-warn.waiting-on-office-only-makes-the-next-day-longer` (close-warn): "Waiting only makes the next day longer, and {opponent} is still waiting." — no-literary-phrasing: 'Makes the next day longer' is composed, and it says {opponent} when it requires office.

