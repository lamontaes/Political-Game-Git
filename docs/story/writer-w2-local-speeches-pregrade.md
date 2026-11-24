# Pre-grade: Writer W2, local and campaign speeches (opening-speech.json)

Pre-grader, 2026-11-24. Branch `story/w-stand-close` at `debb4e2f`, `data/english/parts/outline-local.json`, every line authored by this writer at that head (185 lines). Verdicts carry over by exact text from earlier heads; lines not judged before were read new.

- **Result:** 133 of 185 pass (72%); 52 fail.
- **Calibration:** C4 8/8, E3 8/8, F1 8/8, MA 8/8, MB 8/8, NB 8/8, NC 8/8, R1 8/8, S3 8/8, V1 8/8, W1 8/8. Each reader's chunk had 8 of the owner's graded lines (4 passed, 4 rejected) planted unmarked; a chunk that missed one would have been rerun.
- **Read by:** one blind reader per chunk of about 150 lines (Opus, medium), then the Pre-grader read every verdict against `data/english/line-rules.json`, `notes-not-rules.json`, the owner's grades and `OWNER-DECISIONS.md`.
- **Played:** at `debb4e2f` through `scripts/words/speech-sheets.ts` (the local head's address and a town member's campaign speech in its three drawn places: Rainelle, Midway, Washington County): 30 of these lines played.
- Fails quote the line and give his rule or words; no new wording is suggested.

## Play findings (whole speeches, not one line)

- Fixed at this head: "the" inside a direct address is gone ("Good evening, members of the Rainelle City Council, and neighbors.").
- "For Rainelle, the hard part of the year was how we help people through hard times." (Rainelle address): "hard" twice when the theme is hard times.
- "...and our land and water is what I'd work on." (Rainelle campaign): a plural theme with "is", still.
- Two lines failed in the e5361fc3 read still play: "Stay in touch about hard times, Rainelle, and I'll do the same." and "Neighbors, I'm glad to see so many of you from Rainelle."

## Failing lines by rule

### awkward or AI-sounding (15)

- `outline-local.send-off.thank-you-don-t-let-this-election-go-by-without-voting`: "Thank you, {realm-bare}. Don't let this election go by without voting." — 'Don't let this election go by without voting' is clumsy.
- `outline-local.greeting.good-to-see-and-neighbors-in-one-room`: "Good to see {body-name} and neighbors in one room." — 'Good to see the Select Board and neighbors in one room' is a stiff greeting.
- `outline-local.greeting.to-everyone-in-who-works-with-thank-you-for-being-here`: "To everyone in {realm-name} who works with {body-name}, thank you for being here." — 'Everyone who works with the Select Board' is an odd audience to thank.
- `outline-local.greeting.friends-it-means-something-that-you-came-out-in`: "Friends, it means something that you came out in {realm-name}." — 'Came out in Groton' is awkward, and 'it means something' is vague.
- `outline-local.greeting.thanks-for-being-here-friends-is-why-i-m-here`: "Thanks for being here, friends. {realm-name} is why I'm here." — Repeats 'here' and is a slogan.
- `outline-local.report.most-of-the-year-in-was-spent-on`: "Most of the year in {realm-name} was spent on {theme-name}." — 'Spent on the cost of...' or 'spent on our schools' reads as money spent, not time.
- `outline-local.report.when-i-think-back-on-the-year-in-i-think-about`: "When I think back on the year in {realm-name}, I think about {theme-name}." — The repeated 'I think back... I think about' is a canned frame, and the report rows already share this shape.
- `outline-local.report.the-question-in-front-of-this-year-was`: "The question in front of {realm-name} this year was {theme-name}." — A question can't be 'the cost of a place to live', so the theme slot doesn't fit the frame.
- `outline-local.report.as-the-thing-i-heard-about-most-in-was`: "As {office-title}, the thing I heard about most in {realm-name} was {theme-name}." — Dangling modifier: 'As mayor, the thing I heard...'.
- `outline-local.report.didn-t-get-through-this-year-without-dealing-with`: "{realm-name} didn't get through this year without dealing with {theme-name}." — The double negative 'didn't get through ... without dealing with' is a roundabout way to name the year's issue.
- `outline-local.send-off.thank-you-whatever-happens-i-m-glad-i-asked-for`: "Thank you, {realm-bare}. Whatever happens, I'm glad I asked for {office-title}." — 'Asked for mayor' is not idiomatic.
- `outline-local.send-off.if-i-m-you-ll-hear-from-me-and-i-hope-you-ll-write-back`: "If I'm {office-title}, you'll hear from me, {realm-bare}, and I hope you'll write back." — 'Write back' is cutesy and odd for a mayor.
- `outline-local.send-off.i-hope-will-see-a-good-in-me`: "I hope {realm-bare} will see a good {office-title} in me." — 'See a good mayor in me' is an odd, unnatural way to ask for a vote.
- `outline-local.greeting.welcome-members-of-and-neighbors-from`: "Welcome, members of {body-name} and neighbors from {realm-name}." — 'Neighbors from Groton' repeats the town the board's name already gives, and a mayor doesn't 'welcome' their own board.
- `outline-local.send-off.see-you-at-the-next-meeting-of`: "See you at the next meeting of {body-name}, {realm-bare}." — '...of the Groton Select Board, Groton' says the town twice.

### awkward (9)

- `outline-local.report.gave-plenty-of-work-on-this-year`: "{realm-name} gave {body-name} plenty of work on {theme-name} this year." — A town 'gave the council plenty of work' is an odd way to say what happened.
- `outline-local.report.looking-back-on-the-year-the-choices-that-mattered-most-in-were-about`: "Looking back on the year, the choices that mattered most in {realm-name} were about {theme-name}." — 'Looking back on the year, the choices that mattered most... were about' is wordy and AI-sounding.
- `outline-local.greeting.good-evening-neighbors-of`: "Good evening, neighbors of {realm-name}." — 'neighbors of {realm}' is not how people greet a crowd.
- `outline-local.running.on-the-ballot-for-my-first-concern-is`: "On the ballot for {office-title}, my first concern is {theme-name}." — 'On the ballot for X, my first concern' is a stiff dangling opener.
- `outline-local.running.i-m-after-for-one-reason`: "I'm after {office-title} for one reason: {theme-name}." — 'I'm after mayor' is not how people say running for an office.
- `outline-local.send-off.i-m-asking-for-and-i-m-grateful-for-the-hearing`: "I'm asking for {office-title}, {realm-bare}, and I'm grateful for the hearing." — 'asking for mayor' and 'grateful for the hearing' are stiff.
- `outline-local.send-off.stay-in-touch-about-and-i-ll-do-the-same`: "Stay in touch about {theme-short}, {realm-bare}, and I'll do the same." — 'I'll do the same' after 'stay in touch' makes no sense.
- `outline-local.greeting.neighbors-i-m-glad-to-see-so-many-of-you-from`: "Neighbors, I'm glad to see so many of you from {realm-name}." — 'so many of you from Springfield' is odd when the speech is in that town.
- `outline-local.greeting.friends-thank-you-for-giving-this-evening-to-me`: "Friends, thank you for giving this {realm-name} evening to me." — 'giving this Springfield evening to me' is unnatural.

### vary-the-shape (5)

- `outline-local.stand-reason.i-d-keep-and-here-s-why`: "I'd keep {law-name}, and here's why: {belief}." — Same 'I'd ___ X, and here's why:' frame as MA-019.
- `outline-local.stand-reason.i-d-say-yes-to-and-here-s-why`: "I'd say yes to {about}, and here's why: {belief}." — Same 'I'd ___ X, and here's why:' frame as MA-019.
- `outline-local.stand-reason.i-d-say-no-to-and-here-s-why`: "I'd say no to {about}, and here's why: {belief}." — Same 'I'd ___ X, and here's why:' frame as MA-019, the repeated pattern he complained about.
- `outline-local.greeting.members-of-and-neighbors-who-made-time-for-this`: "Members of {body-name}, and neighbors who made time for this." — The same 'Members of X, and...' shape as NC-057, and 'this' is vague.
- `outline-local.send-off.and-i-will-keep-working-and-we-ll-tell-you-how-it-goes`: "{body-name} and I will keep working, {realm-bare}, and we'll tell you how it goes." — A generic 'keep working and tell you how it goes', the same shape as NC-072 and NC-073.

### office-named-as-people-say-it (4)

- `outline-local.running.the-seat-i-m-after-has-a-say-on`: "The seat I'm after, {office-title}, has a say on {theme-name}." — The appositive 'The seat I'm after, mayor,' is stiff and calls an office title a seat.
- `outline-local.running.if-i-win-is-where-i-ll-begin`: "If I win {office-title}, {theme-name} is where I'll begin." — 'If I win council member' is ungrammatical with an office title as the object of win.
- `outline-local.running.give-me-and-i-ll-work-on`: "Give me {office-title} and I'll work on {theme-name}." — 'Give me mayor' is awkward with an office title.
- `outline-local.running.whoever-holds-next-will-decide-a-lot-about-and-i-d-like-that-to-be-me`: "Whoever holds {office-title} next will decide a lot about {theme-name}, and I'd like that to be me." — 'Whoever holds mayor' is awkward with an office title.

### address-argues-not-announces (3)

- `outline-local.send-off.now-we-get-back-to-work-on`: "Now we get back to work on {theme-short}." — A bare 'now we get back to work' close is the 'now I'll go do it' line he rejected.
- `outline-local.greeting.i-m-here-to-speak-to-and-to-everyone-in-listening`: "I'm here to speak to {body-name}, and to everyone in {realm-name} listening." — Announces that it's a speech and names Groton twice.
- `outline-local.send-off.we-ll-report-back-and-i-owe-you-that`: "We'll report back, {realm-bare}. {body-name} and I owe you that." — 'We'll report back' is the 'I'll be back to report' close he rejected.

### no-pointing-at-the-unnamed (3)

- `outline-local.greeting.thank-you-for-making-room-for-this-and-neighbors`: "Thank you for making room for this, {body-name} and neighbors." — 'making room for this' points at nothing named, and the address order is awkward.
- `outline-local.greeting.members-of-and-everyone-in-who-cares-how-this-goes`: "Members of {body-name}, and everyone in {realm-name} who cares how this goes." — 'How this goes' points at nothing named.
- `outline-local.send-off.thank-you-and-i-will-be-here-for-the-next-one`: "Thank you, {realm-bare}. {body-name} and I will be here for the next one." — 'The next one' names nothing.

### no-literary-phrasing (2)

- `outline-local.report.i-measure-this-year-in-by-what-we-did-on`: "I measure this year in {realm-name} by what we did on {theme-name}." — 'I measure this year by what we did on' is a composed line.
- `outline-local.report.people-in-don-t-ask-me-about-the-year-they-ask-me-about`: "People in {realm-name} don't ask me about the year. They ask me about {theme-name}." — The 'don't ask me about X. They ask me about Y' turn is a composed epigram.

### no-stock-phrases (2)

- `outline-local.creed.from-where-i-stand-in-i-think`: "From where I stand in {realm-name}, I think {belief}." — 'From where I stand' is a stock opener, and naming the town to its own residents is redundant.
- `outline-local.send-off.i-hope-i-ve-given-you-something-to-think-about-on`: "I hope I've given you something to think about on {theme-short}." — 'Given you something to think about' is a stock close that says nothing.

### names-something-specific (2)

- `outline-local.report.had-a-hopeful-year-and-is-part-of-why`: "{realm-name} had a hopeful year, and {theme-name} is part of why." — 'had a hopeful year' is a generic sentiment.
- `outline-local.send-off.i-d-work-hard-as-and-i-d-tell-you-how-it-s-going`: "I'd work hard as {office-title}, {realm-bare}, and I'd tell you how it's going." — A generic 'I'd work hard' with a vocative in the middle.

### literary (2)

- `outline-local.send-off.thank-you-for-your-time-and-for-the-time-you-give`: "Thank you for your time, and for the time you give {realm-name}." — The wordplay on 'time' is a literary turn.
- `outline-local.greeting.to-and-to-beyond-this-room-thank-you`: "To {body-name}, and to {realm-name} beyond this room: thank you." — 'To Groton beyond this room' is a literary turn.

### plain-american-no-jargon (1)

- `outline-local.report.with-the-budget-ahead-this-year-has-room-to-do-more-on`: "With the budget ahead this year, {realm-name} has room to do more on {theme-name}." — 'With the budget ahead' is an insider phrase a listener can't picture.

### address-close-names-the-body (1)

- `outline-local.send-off.that-s-the-year-in-thank-you`: "That's the year in {realm-name}. Thank you." — 'That's the year in X' is a bare sign-off that names nothing the speech said.

### one-idea-to-a-sentence (1)

- `outline-local.running.people-ask-what-i-d-do-as-start-with`: "People ask what I'd do as {office-title}. Start with {theme-name}." — The bare imperative 'Start with' answers his own question awkwardly; a person says 'I'd start with'.

### awkward or literary (1)

- `outline-local.send-off.test-what-i-said-on-against-what-you-see-in`: "Test what I said on {theme-short} against what you see in {realm-name}." — 'Test what I said against what you see' is a written, lecturing turn, not how a mayor signs off.

### false for its facts (1)

- `outline-local.send-off.i-ll-be-back-in-before-the-election-and-i-d-like-to-hear-what-you-thin`: "I'll be back in {realm-name} before the election, and I'd like to hear what you think then." — A town candidate lives in the town, so 'I'll be back in Groton' is false.

## As played

- pass: `outline-local.greeting.to-the-members-of-and-to-everyone-from-who-came-out` → **the local head's address, 4949820, seed af873500, part 1** To the members of the Midway City Council, and to everyone from Midway who came out: Most of the year in Midway was spent on how we help people through hard times.
- pass: `outline-local.running.i-filed-for-because-of` → **a town member's campaign speech, 4949820, seed af873500, part 1** Neighbors in Midway, thank you for making time. I filed for council member because of the cost of a place to live.
- pass: `outline-local.creed.i-think-i-always-have` → **a town member's campaign speech, 2409400, seed eb7bf596, part 2** I think builders build more homes when the rules don't make them lose money. I always have. I'll be against an affordable-housing requirement for new buildings every time it comes up.
- pass: `outline-local.creed.i-ve-held-the-view-for-years-that` → **the local head's address, 2409400, seed eb7bf596, part 3** I've held the view for years that a call for help should be answered fast. I'll work to give the police department more to work with, and I won't quit at the first no.
- pass: `outline-local.pledge.i-ll-work-to-and-i-won-t-quit-at-the-first-no` → **the local head's address, 2409400, seed eb7bf596, part 3** I've held the view for years that a call for help should be answered fast. I'll work to give the police department more to work with, and I won't quit at the first no.
- pass: `outline-local.pledge.i-ll-be-against-every-time-it-comes-up` → **a town member's campaign speech, 2409400, seed eb7bf596, part 2** I think builders build more homes when the rules don't make them lose money. I always have. I'll be against an affordable-housing requirement for new buildings every time it comes up.
- pass: `outline-local.question.is-it-time-to` → **the local head's address, 4949820, seed af873500, part 2** Is it time to get families in need what they qualify for sooner? Yes, because a family in trouble shouldn't wait weeks for aid it qualifies for.
- pass: `outline-local.question.is-this-the-year-we` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 2** Is this the year we do more to care for our creeks and woods? Yes, because clean water is cheaper to keep than to win back.
- pass: `outline-local.answer.no-because` → **the local head's address, 2409400, seed eb7bf596, part 2** Is it time to give civilians oversight of the police? No, because an officer should be judged by people who have done the job.
- pass: `outline-local.answer.i-wouldn-t-since` → **a town member's campaign speech, 4949820, seed af873500, part 3** Is it time to allow apartments in single-family zones? I wouldn't, since the people who bought into a neighborhood should shape it.
- pass: `outline-local.answer.yes-because` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 2** Is this the year we do more to care for our creeks and woods? Yes, because clean water is cheaper to keep than to win back.
- pass: `outline-local.stand-reason.to-me-comes-down-to-this` → **the local head's address, 5466652, seed 2f25fb7e, part 2** To me, more assistance spending comes down to this: a family in trouble shouldn't wait weeks for aid it qualifies for.
- pass: `outline-local.greeting.residents-of-and-members-of-thank-you-for-being-here` → **the local head's address, 2409400, seed eb7bf596, part 1** Residents of Washington County, and members of the Washington County Board of Commissioners, thank you for being here. As chair, I spent a good part of this year on how we keep people safe and treat them fairly.
- pass: `outline-local.greeting.thank-you-for-being-here` → **the local head's address, 2409400, seed eb7bf596, part 1** Residents of Washington County, and members of the Washington County Board of Commissioners, thank you for being here. As chair, I spent a good part of this year on how we keep people safe and treat them fairly.
- pass: `outline-local.greeting.friends-and-neighbors-of-thank-you` → **a town member's campaign speech, 2409400, seed eb7bf596, part 1** Friends and neighbors of Washington County, thank you. The seat I'm after, commissioner, has a say on the cost of a place to live.
- pass: `outline-local.running.i-m-asking-for-your-vote-for-and-is-what-i-d-work-on` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 1** Neighbors, I'm glad to see so many of you from Rainelle. I'm asking for your vote for council member, and our land and water is what I'd work on.
- pass: `outline-local.send-off.thank-you-i-ll-see-you-at-the-next-meeting-of` → **the local head's address, 4949820, seed af873500, part 3** Thank you, Midway. I'll see you at the next meeting of the Midway City Council.
- pass: `outline-local.send-off.if-you-vote-for-me-i-ll-work-for-you-as-your` → **a town member's campaign speech, 2409400, seed eb7bf596, part 3** If you vote for me, Washington County, I'll work for you as your commissioner.
- pass: `outline-local.report.as-i-spent-a-good-part-of-this-year-on` → **the local head's address, 2409400, seed eb7bf596, part 1** Residents of Washington County, and members of the Washington County Board of Commissioners, thank you for being here. As chair, I spent a good part of this year on how we keep people safe and treat them fairly.
- pass: `outline-local.stand.i-m-against` → **a town member's campaign speech, 4949820, seed af873500, part 2** Today, eviction court works the way it always has, between the two sides. I'm against a lawyer for tenants facing eviction.
- pass: `outline-local.today.today` → **a town member's campaign speech, 4949820, seed af873500, part 2** Today, eviction court works the way it always has, between the two sides. I'm against a lawyer for tenants facing eviction.
- pass: `outline-local.greeting.good-evening-members-of-and-neighbors` → **the local head's address, 5466652, seed 2f25fb7e, part 1** Good evening, members of the Rainelle City Council, and neighbors. For Rainelle, the hard part of the year was how we help people through hard times.
- fail: `outline-local.running.the-seat-i-m-after-has-a-say-on` → **a town member's campaign speech, 2409400, seed eb7bf596, part 1** Friends and neighbors of Washington County, thank you. The seat I'm after, commissioner, has a say on the cost of a place to live.
- fail: `outline-local.send-off.stay-in-touch-about-and-i-ll-do-the-same` → **the local head's address, 5466652, seed 2f25fb7e, part 3** Stay in touch about hard times, Rainelle, and I'll do the same.
- fail: `outline-local.greeting.neighbors-i-m-glad-to-see-so-many-of-you-from` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 1** Neighbors, I'm glad to see so many of you from Rainelle. I'm asking for your vote for council member, and our land and water is what I'd work on.
- pass: `outline-local.greeting.neighbors-in-thank-you-for-making-time` → **a town member's campaign speech, 4949820, seed af873500, part 1** Neighbors in Midway, thank you for making time. I filed for council member because of the cost of a place to live.
- fail: `outline-local.report.most-of-the-year-in-was-spent-on` → **the local head's address, 4949820, seed af873500, part 1** To the members of the Midway City Council, and to everyone from Midway who came out: Most of the year in Midway was spent on how we help people through hard times.
- pass: `outline-local.report.for-the-hard-part-of-the-year-was` → **the local head's address, 5466652, seed 2f25fb7e, part 1** Good evening, members of the Rainelle City Council, and neighbors. For Rainelle, the hard part of the year was how we help people through hard times.
- pass: `outline-local.send-off.you-ll-have-a-choice-for-and-i-hope-you-ll-think-of-me` → **a town member's campaign speech, 4949820, seed af873500, part 4** You'll have a choice for council member, Midway, and I hope you'll think of me.
- pass: `outline-local.send-off.i-d-like-to-be-the-you-can-call-when-something-goes-wrong` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 3** I'd like to be the council member you can call when something goes wrong, Rainelle.

## Passing lines

- `outline-local.greeting.members-of-department-heads-and-neighbors`: "Members of {body-name}, department heads and neighbors."
- `outline-local.greeting.to-the-members-of-and-to-everyone-from-who-came-out`: "To the members of {body-name}, and to everyone from {realm-name} who came out:"
- `outline-local.greeting.neighbors-across-and-members-of`: "Neighbors across {realm-name}, and members of {body-name}."
- `outline-local.greeting.neighbors-across-thank-you-for-coming-out`: "Neighbors across {realm-name}, thank you for coming out."
- `outline-local.greeting.neighbors-in-thanks-for-coming`: "Neighbors in {realm-name}, thanks for coming."
- `outline-local.report.the-budget-came-in-ahead-this-year-in-and-is-where-i-d-put-the-differe`: "The budget came in ahead this year in {realm-name}, and {theme-name} is where I'd put the difference."
- `outline-local.running.i-want-to-be-your-and-i-want-to-talk-about`: "I want to be your {office-title}, and I want to talk about {theme-name}."
- `outline-local.running.before-you-decide-on-your-hear-me-out-on`: "Before you decide on your {office-title}, hear me out on {theme-name}."
- `outline-local.running.what-brought-me-into-this-race-for-is`: "What brought me into this race for {office-title} is {theme-name}."
- `outline-local.running.i-filed-for-because-of`: "I filed for {office-title} because of {theme-name}."
- `outline-local.running.i-m-running-for-to-do-something-about`: "I'm running for {office-title} to do something about {theme-name}."
- `outline-local.creed.i-think-i-always-have`: "I think {belief}. I always have."
- `outline-local.creed.i-ve-held-the-view-for-years-that`: "I've held the view for years that {belief}."
- `outline-local.pledge.i-ll-put-my-name-behind`: "I'll put my name behind {about}."
- `outline-local.pledge.i-ll-push-for-at-every-meeting`: "I'll push for {about} at every meeting."
- `outline-local.pledge.i-ll-work-to-and-i-won-t-quit-at-the-first-no`: "I'll work to {to}, and I won't quit at the first no."
- `outline-local.pledge.i-ll-be-against-every-time-it-comes-up`: "I'll be against {about} every time it comes up."
- `outline-local.pledge.i-ll-stand-up-for-every-time-it-s-challenged`: "I'll stand up for {law-name} every time it's challenged."
- `outline-local.pledge.anyone-who-wants-to-weaken-will-have-to-get-through-me-first`: "Anyone who wants to weaken {law-name} will have to get through me first."
- `outline-local.pledge.i-ll-work-to-repeal`: "I'll work to repeal {law-name}."
- `outline-local.pledge.repealing-is-where-i-ll-start`: "Repealing {law-name} is where I'll start."
- `outline-local.today.`: "{today}"
- `outline-local.today.right-now`: "Right now, {today-clause}"
- `outline-local.today.here-in`: "Here in {realm-name}, {today-clause}"
- `outline-local.stand.i-m-for-and-that-doesn-t-change`: "I'm for {law-name}, and that doesn't change."
- `outline-local.stand.i-d-keep-just-as-it-is`: "I'd keep {law-name} just as it is."
- `outline-local.stand.i-m-against-and-i-want-it-repealed`: "I'm against {law-name}, and I want it repealed."
- `outline-local.stand.i-d-back-a-repeal-of-tomorrow`: "I'd back a repeal of {law-name} tomorrow."
- `outline-local.stand.i-d-back-the-day-it-comes-up`: "I'd back {about} the day it comes up."
- `outline-local.stand.i-d-say-no-to-if-it-came-up`: "I'd say no to {about} if it came up."
- `outline-local.stand.i-don-t-agree`: "I don't agree. {belief-sentence}"
- `outline-local.stand.i-see-it-the-other-way`: "I see it the other way. {belief-sentence}"
- `outline-local.contrast.some-people-argue-that-we-should`: "Some people argue that we should {other-side}."
- `outline-local.contrast.some-want-to-and-i-disagree`: "Some want to {other-side}, and I disagree."
- `outline-local.contrast.plenty-of-people-around-here-want-to`: "Plenty of people around here want to {other-side}."
- `outline-local.question.is-it-time-to`: "Is it time to {to}?"
- `outline-local.question.is-this-the-year-we`: "Is this the year we {to}?"
- `outline-local.question.is-worth-keeping`: "Is {law-name} worth keeping?"
- `outline-local.question.have-we-gotten-right`: "Have we gotten {law-name} right?"
- `outline-local.question.does-still-want`: "Does {realm-name} still want {law-name}?"
- `outline-local.answer.no-because`: "No, because {belief}."
- `outline-local.answer.i-wouldn-t-since`: "I wouldn't, since {belief}."
- `outline-local.answer.no`: "No. {belief-sentence}"
- `outline-local.answer.put-me-down-as-a-no`: "Put me down as a no. {belief-sentence}"
- `outline-local.answer.yes-because`: "Yes, because {belief}."
- `outline-local.answer.i-would-since`: "I would, since {belief}."
- `outline-local.answer.yes`: "Yes. {belief-sentence}"
- `outline-local.answer.put-me-down-as-a-yes`: "Put me down as a yes. {belief-sentence}"
- `outline-local.stand-reason.to-me-comes-down-to-this`: "To me, {about} comes down to this: {belief}."
- `outline-local.stand-reason.i-can-t-back-since`: "I can't back {about}, since {belief}."
- `outline-local.stand-reason.i-m-for-keeping`: "I'm for keeping {law-name}. {belief-sentence}"
- `outline-local.send-off.thank-you-for-coming-out`: "Thank you for coming out, {realm-bare}."
- `outline-local.send-off.please-vote-and-thank-you-for-hearing-me-out`: "Please vote, {realm-bare}, and thank you for hearing me out."
- `outline-local.send-off.i-d-be-proud-to-speak-for-as-your`: "I'd be proud to speak for {realm-name} as your {office-title}."
- `outline-local.greeting.residents-of-and-members-of-thank-you-for-being-here`: "Residents of {realm-name}, and members of {body-name}, thank you for being here."
- `outline-local.greeting.members-of-neighbors-friends`: "Members of {body-name}, neighbors, friends."
- `outline-local.greeting.thanks-for-coming-out`: "Thanks for coming out, {realm-bare}."
- `outline-local.greeting.thank-you-for-being-here`: "{realm-bare}, thank you for being here."
- `outline-local.greeting.friends-and-neighbors-of-thank-you`: "Friends and neighbors of {realm-name}, thank you."
- `outline-local.report.the-thing-kept-coming-back-to-this-year-was`: "The thing {realm-name} kept coming back to this year was {theme-name}."
- `outline-local.report.the-budget-held-up-this-year-and-is-where-should-look-next`: "The budget held up this year, and {theme-name} is where {realm-name} should look next."
- `outline-local.running.i-m-asking-for-your-vote-for-and-is-what-i-d-work-on`: "I'm asking for your vote for {office-title}, and {theme-name} is what I'd work on."
- `outline-local.running.when-i-decided-to-run-for-was-on-my-mind`: "When I decided to run for {office-title}, {theme-name} was on my mind."
- `outline-local.running.my-campaign-for-is-about`: "My campaign for {office-title} is about {theme-name}."
- `outline-local.running.i-want-to-be-your-so-we-can-do-better-on`: "I want to be your {office-title} so we can do better on {theme-name}."
- `outline-local.send-off.and-i-would-like-to-hear-from-you-on`: "{body-name} and I would like to hear from you on {theme-short}."
- `outline-local.send-off.if-matters-to-you-come-to-the-next-meeting-of`: "If {theme-short} matters to you, come to the next meeting of {body-name}."
- `outline-local.send-off.thank-you-i-ll-see-you-at-the-next-meeting-of`: "Thank you, {realm-bare}. I'll see you at the next meeting of {body-name}."
- `outline-local.send-off.come-tell-what-you-think-about`: "Come tell {body-name} what you think about {theme-short}."
- `outline-local.send-off.i-d-be-proud-to-have-your-vote`: "I'd be proud to have your vote, {realm-bare}."
- `outline-local.send-off.if-you-vote-for-me-i-ll-work-for-you-as-your`: "If you vote for me, {realm-bare}, I'll work for you as your {office-title}."
- `outline-local.send-off.thanks-for-listening-i-d-be-glad-to-be-your`: "Thanks for listening, {realm-bare}. I'd be glad to be your {office-title}."
- `outline-local.report.as-i-spent-a-good-part-of-this-year-on`: "As {office-title}, I spent a good part of this year on {theme-name}."
- `outline-local.report.nothing-took-more-of-my-time-this-year-than`: "Nothing took more of my time this year than {theme-name}."
- `outline-local.report.the-budget-stayed-steady-this-year-and-that-let-us-keep-working-on`: "The budget stayed steady this year, and that let us keep working on {theme-name}."
- `outline-local.running.i-m-running-because-needs-somebody-s-full-attention`: "I'm running because {theme-name} needs somebody's full attention."
- `outline-local.running.most-of-what-i-d-do-as-comes-back-to`: "Most of what I'd do as {office-title} comes back to {theme-name}."
- `outline-local.greeting.good-to-be-with-you-all-here-in`: "Good to be with you all here in {realm-name}."
- `outline-local.greeting.friends-from-across-thank-you-for-coming`: "Friends from across {realm-name}, thank you for coming."
- `outline-local.send-off.i-ll-stay-a-while-after-this-if-you-d-like-to-talk-about`: "I'll stay a while after this, if you'd like to talk about {theme-short}."
- `outline-local.send-off.thank-you-for-the-work-you-do-for-all-of-you`: "Thank you for the work you do for {realm-name}, all of you."
- `outline-local.send-off.if-you-d-like-to-talk-about-i-ll-be-right-here`: "If you'd like to talk about {theme-short}, I'll be right here."
- `outline-local.send-off.whoever-you-vote-for-please-vote`: "Whoever you vote for, please vote, {realm-bare}."
- `outline-local.send-off.thank-you-for-listening-i-hope-to-see-you-at-the-polls`: "Thank you for listening. I hope to see you at the polls, {realm-bare}."
- `outline-local.stand.i-m-for`: "I'm for {about}."
- `outline-local.stand.i-m-against`: "I'm against {about}."
- `outline-local.stand.i-disagree-and-here-s-why`: "I disagree, and here's why: {belief}."
- `outline-local.contrast.some-of-you-will-want-to-and-i-understand-why`: "Some of you will want to {other-side}, and I understand why."
- `outline-local.contrast.some-people-around-here-would`: "Some people around here would {other-side}."
- `outline-local.stand-reason.i-d-repeal-and-here-s-why`: "I'd repeal {law-name}, and here's why: {belief}."
- `outline-local.today.today`: "Today, {today-clause}"
- `outline-local.greeting.good-evening-members-of-and-neighbors`: "Good evening, members of {body-name}, and neighbors."
- `outline-local.send-off.good-night-and-thank-you-for-coming-out`: "Good night, {realm-bare}, and thank you for coming out."
- `outline-local.send-off.good-night-i-hope-to-earn-your-vote`: "Good night, {realm-bare}. I hope to earn your vote."
- `outline-local.report.the-budget-came-up-short-this-year-in-and-is-where-we-felt-it`: "The budget came up short this year in {realm-name}, and {theme-name} is where we felt it."
- `outline-local.send-off.i-have-left-in-this-office-and-i-plan-to-use-the-time-on`: "I have {term-left} left in this office, and I plan to use the time on {theme-short}."
- `outline-local.running.i-ve-held-this-seat-and-the-work-on-isn-t-finished`: "I've held this seat, and the work on {theme-name} isn't finished."
- `outline-local.running.i-think-we-can-do-better-on-than-we-have-and-i-d-like-the-chance-as`: "I think we can do better on {theme-name} than we have, and I'd like the chance as {office-title}."
- `outline-local.running.the-person-in-this-seat-hasn-t-done-enough-on-and-i-d-do-more`: "The person in this seat hasn't done enough on {theme-name}, and I'd do more."
- `outline-local.send-off.i-ve-asked-for-your-trust-before-i-m-asking-for-it-again`: "I've asked for your trust before. I'm asking for it again, {realm-bare}."
- `outline-local.send-off.if-matter-to-you-come-to-the-next-meeting-of`: "If {theme-short} matter to you, come to the next meeting of {body-name}."
- `outline-local.running.as-i-d-give-the-attention-it-hasn-t-had`: "As {office-title}, I'd give {theme-name} the attention it hasn't had."
- `outline-local.running.i-put-my-name-in-for-to-work-on`: "I put my name in for {office-title} to work on {theme-name}."
- `outline-local.running.nothing-changes-on-unless-someone-pushes-and-i-m-running-for-to-push`: "Nothing changes on {theme-name} unless someone pushes, and I'm running for {office-title} to push."
- `outline-local.running.i-ve-been-so-i-know-what-s-been-done-on-and-what-hasn-t`: "I've been {office-title}, so I know what's been done on {theme-name} and what hasn't."
- `outline-local.send-off.vote-the-way-you-think-is-best-that-s-all-i-ask`: "Vote the way you think is best, {realm-bare}. That's all I ask."
- `outline-local.send-off.come-find-me-after-this-and-tell-me-what-i-missed`: "Come find me after this, {realm-bare}, and tell me what I missed."
- `outline-local.send-off.i-m-easy-to-find-tell-me-what-you-think-about`: "I'm easy to find, {realm-bare}. Tell me what you think about {theme-short}."
- `outline-local.send-off.thanks-for-your-time-i-d-be-honored-to-serve-as`: "Thanks for your time, {realm-bare}. I'd be honored to serve as {office-title}."
- `outline-local.send-off.thanks-for-coming-if-you-want-to-talk-about-the-door-is-open`: "Thanks for coming, {realm-bare}. If you want to talk about {theme-short}, the door is open."
- `outline-local.send-off.questions-on-are-welcome-and-so-are-complaints`: "Questions on {theme-short} are welcome, and so are complaints."
- `outline-local.send-off.i-ll-take-your-questions-on-now`: "I'll take your questions on {theme-short} now."
- `outline-local.send-off.thank-you-all-and-i-have-work-to-do-on`: "Thank you all. {body-name} and I have work to do on {theme-short}."
- `outline-local.greeting.i-m-glad-to-be-here-with-and-the-people-of`: "I'm glad to be here with {body-name} and the people of {realm-name}."
- `outline-local.greeting.neighbors-department-heads-and-members-of-thank-you`: "Neighbors, department heads, and members of {body-name}: thank you."
- `outline-local.greeting.neighbors-of-i-appreciate-you-being-here`: "Neighbors of {realm-name}, I appreciate you being here."
- `outline-local.send-off.if-something-i-said-about-doesn-t-sit-right-with-you-tell-me`: "If something I said about {theme-short} doesn't sit right with you, tell me."
- `outline-local.send-off.i-d-rather-hear-from-on-than-guess`: "I'd rather hear from {realm-name} on {theme-short} than guess."
- `outline-local.send-off.my-office-is-open-to-anyone-in-who-wants-to-talk-about`: "My office is open to anyone in {realm-name} who wants to talk about {theme-short}."
- `outline-local.send-off.anyone-who-wants-to-help-with-knows-where-to-find`: "Anyone who wants to help with {theme-short} knows where to find {body-name}."
- `outline-local.send-off.have-a-good-rest-of-the-day`: "Have a good rest of the day, {realm-bare}."
- `outline-local.send-off.get-home-safe-and-thank-you`: "Get home safe, {realm-bare}, and thank you."
- `outline-local.send-off.i-m-out-here-because-i-want-the-job-thanks-for-hearing-why`: "I'm out here because I want the job, {realm-bare}. Thanks for hearing why."
- `outline-local.send-off.tell-a-neighbor-what-you-heard-today-and-tell-me-if-i-got-it-wrong`: "Tell a neighbor what you heard today, {realm-bare}, and tell me if I got it wrong."
- `outline-local.send-off.if-you-ve-got-a-question-on-i-ll-stay-and-answer-it`: "If you've got a question on {theme-short}, I'll stay and answer it."
- `outline-local.greeting.thank-you-to-to-the-staff-and-to-everyone-from`: "Thank you to {body-name}, to the staff, and to everyone from {realm-name}."
- `outline-local.greeting.neighbors-in-thank-you-for-making-time`: "Neighbors in {realm-name}, thank you for making time."
- `outline-local.report.for-the-hard-part-of-the-year-was`: "For {realm-name}, the hard part of the year was {theme-name}."
- `outline-local.send-off.you-ll-have-a-choice-for-and-i-hope-you-ll-think-of-me`: "You'll have a choice for {office-title}, {realm-bare}, and I hope you'll think of me."
- `outline-local.send-off.i-d-like-to-be-the-you-can-call-when-something-goes-wrong`: "I'd like to be the {office-title} you can call when something goes wrong, {realm-bare}."
- `outline-local.send-off.as-i-d-answer-to-you-first`: "As {office-title}, I'd answer to you first, {realm-bare}."
- `outline-local.greeting.members-of-and-the-people-of-they-serve`: "Members of {body-name}, and the people of {realm-name} they serve."
- `outline-local.greeting.the-people-of-and-members-of-thank-you-for-coming`: "The people of {realm-name}, and members of {body-name}: thank you for coming."
