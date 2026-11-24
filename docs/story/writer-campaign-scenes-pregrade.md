# Pre-grade: Writer W6, campaign scenes (scene-talk.json)

Pre-grader, 2026-11-24. Branch `story/w-campaign` at `2231bc5c`, every line authored by this writer at that head (332 lines). Verdicts carry over by exact text from earlier heads; lines not judged before were read new.

- **Result:** 298 of 332 pass (90%); 34 fail.
- **Calibration:** PA 8/8, SC1 8/8, SC2 8/8, SC3 8/8, SC4 8/8, SC5 8/8, SC6 8/8. Each reader's chunk had 8 of the owner's graded lines (4 passed, 4 rejected) planted unmarked; a chunk that missed one would have been rerun.
- **Read by:** one blind reader per chunk of about 150 lines (Opus, medium), then the Pre-grader read every verdict against `data/english/line-rules.json`, `notes-not-rules.json`, the owner's grades and `OWNER-DECISIONS.md`.
- **Played:** the six-place packet at this head is not in yet; lines were read as written.
- Fails quote the line and give his rule or words; no new wording is suggested.

## Batch 4 at `story/w-campaign` `8b87efdc` (newest): 4 of 19 pass

- The 19 lines new since `cbf536cb` (donor-ask narration and asks, offer-help, offer-to-run, ask-endorsement), read blind in chunk NK with W7's loading lines. Calibration 8/8; 17 of 30 earlier-graded lines got the same verdict again, the lowest agreement this evening, so a single verdict here is one reader's call.
- **The main cause is the {office} fill (8 of 15 fails).** The reader was told {office} fills as "mayor", "the Mutual Village Council", "selectboard member" or "state representative in District 38", the same as in W2's victory night. "a list of voters for {office}", "give {office}", "the first week of {office}" and "the weekly schedule for {office}" read as the office, not the campaign. "the race for {office}" and "my endorsement for {office}" read with every fill.
- Not played: the six-place packet at this head is not in.

### Passing lines

- `scene-talk.reply-decline.i-m-staying-neutral-in-the-race-for-office-i-m-saying-so-to-everyone-who-asks` (ask-endorsement (asked), reply-decline): "I'm staying neutral in the race for {office}. I'm saying so to everyone who asks."
- `scene-talk.reply-agree.you-have-my-endorsement-for-office-you-can-say-so` (ask-endorsement (asked), reply-agree): "You have my endorsement for {office}. You can say so."
- `scene-talk.state-request.my-gift-was-small-i-m-still-asking-you-to-read-bill-before-it-moves` (donor-ask (asker), state-request): "My gift was small. I'm still asking you to read {bill} before it moves."
- `scene-talk.state-request.we-talked-about-bill-before-has-your-answer-changed` (donor-ask (asker), state-request): "We talked about {bill} before. Has your answer changed?"

### Failing lines: the {office} fill (8)

- `scene-talk.reply-ask.what-would-you-do-in-the-first-week-of-office` (offer-to-run (asked), reply-ask): "What would you do in the first week of {office}?" — no-dangling-fragments / slot fill: With the office filled as a title it reads "the first week of mayor", and it sounds like the first week in office rather than of the campaign.
- `scene-talk.state-request.i-can-make-calls-from-home-for-office-what-day-should-i-start` (offer-help (asker), state-request): "I can make calls from home for {office}. What day should I start?" — slot fill / every-line-gives-its-context: "Make calls from home for mayor" is unclear about whose run it is; with a council fill it reads as calling for the council.
- `scene-talk.reply-ask.how-many-hours-a-week-can-you-give-office` (offer-help (asked), reply-ask): "How many hours a week can you give {office}?" — slot fill: "How many hours a week can you give mayor?" is broken with the office title fill.
- `scene-talk.state-request.i-ll-set-the-weekly-schedule-for-office-you-tell-me-what-you-can-t-do` (offer-to-run (asker), state-request): "I'll set the weekly schedule for {office}. You tell me what you can't do." — slot fill: "The weekly schedule for mayor" sounds like the mayor's own schedule, not the campaign's.
- `scene-talk.follow-answer.i-d-list-every-event-for-office-until-the-vote-then-i-d-ask-you-which-ones-matter` (offer-to-run (asker), follow-answer): "I'd list every event for {office} until the vote. Then I'd ask you which ones matter." — slot fill: "Every event for mayor" reads wrong with the office title fill and is unclear about whose events.
- `scene-talk.reply-agree.good-i-ll-send-you-a-list-and-a-script-for-office-this-week` (offer-help (asked), reply-agree): "Good. I'll send you a list and a script for {office} this week." — slot fill: "A list and a script for mayor" reads wrong with the office fill; the campaign is what gets the script.
- `scene-talk.follow-accept.thank-you-for-telling-me-plainly-about-office` (ask-endorsement (asker), follow-accept): "Thank you for telling me plainly about {office}." — slot fill / address-argues-not-announces: "Telling me plainly about mayor" is broken with the office fill, and "plainly" is a word he objected to.
- `scene-talk.state-request.i-have-saturdays-free-can-i-take-a-list-of-voters-for-office` (offer-help (asker), state-request): "I have Saturdays free. Can I take a list of voters for {office}?" — slot fill: "A list of voters for mayor" reads as people voting for mayor, not a list for the campaign.

### Failing lines: other rules (7)

- `scene-talk.narrate-narrate.name-gave-to-the-campaign-and-calls-about-bill-the-call-comes-near-the-end-of-th` (donor-ask (narrator), narrate-narrate): "{name} gave to the campaign and calls about {bill}. The call comes near the end of the day." — no-day-or-place-in-narration: The narration names the time of day ("near the end of the day"), and "gave to the campaign" should be your campaign.
- `scene-talk.state-request.i-care-about-about-what-are-you-doing-about-it` (donor-ask (asker), state-request): "I care about {about}. What are you doing about it?" — stance-is-plainly-for-or-against: The donor says they care about the question but never says which way they want it, so the ask has no stand.
- `scene-talk.state-request.my-check-came-in-last-month-where-do-you-stand-on-bill` (donor-ask (asker), state-request): "My check came in last month. Where do you stand on {bill}?" — request-needs-its-ground: "My check came in last month" claims a date the requires list does not hold, so it is false for many gifts.
- `scene-talk.state-request.i-m-calling-about-bill-i-d-like-you-to-vote-yes` (donor-ask (asker), state-request): "I'm calling about {bill}. I'd like you to vote yes." — line-fits-the-roles-in-its-situation: Nothing requires the player to hold a seat, so asking a candidate to vote yes on a bill offers what they cannot do.
- `scene-talk.state-request.i-gave-the-most-of-anyone-to-your-campaign-i-m-asking-about-bill-for-that-reason` (donor-ask (asker), state-request): "I gave the most of anyone to your campaign. I'm asking about {bill} for that reason." — no-literary-phrasing / stance-is-plainly-for-or-against: "I'm asking about {bill} for that reason" is stiff and AI-sounding, and it never says what the donor wants done.
- `scene-talk.narrate-narrate.name-left-a-message-about-bill-you-call-back-and-name-answers-on-the-first-ring` (donor-ask (narrator), narrate-narrate): "{name} left a message about {bill}. You call back and {name} answers on the first ring." — person-said-by-role-pronoun-or-relationship: It says {name} twice in two short sentences where a pronoun belongs.
- `scene-talk.state-request.people-at-employer-depend-on-bill-can-you-meet-with-us-this-week` (donor-ask (asker), state-request): "People at {employer} depend on {bill}. Can you meet with us this week?" — tense-of-the-record: People cannot depend on a bill that has not passed; they depend on what it would do, so the line is false for its record.

## Failing lines by rule (head `2231bc5c`)

### every-line-gives-its-context (6)

- `scene-talk.narrate-narrate.name-sees-who-it-is-and-opens-the-door-without-being-asked-twice`: "{name} sees who it is and opens the door without being asked twice." — 'Without being asked twice' misuses the idiom, since nobody asked once.
- `scene-talk.reply-decline.same-answer-as-before-on-office-nothing-has-changed-for-me`: "Same answer as before on {office}. Nothing has changed for me." — 'Same answer as before on {office}' never says what the answer was, and 'on' plus an office title reads oddly.
- `scene-talk.state-request.i-signed-up-before-and-never-got-a-job-give-me-a-street-for-office-and-i-ll-take`: "I signed up before and never got a job. Give me a street for {office} and I'll take it." — 'Never got a job' reads as employment, and 'a street for {office}' is shorthand.
- `scene-talk.state-request.i-showed-up-and-stood-around-last-time-this-time-tell-me-where-to-go-for-office`: "I showed up and stood around last time. This time tell me where to go for {office}." — 'Tell me where to go for {office}' reads as directions to an office.
- `scene-talk.state-request.i-ll-be-on-your-side-from-the-start-of-office-so-give-me-a-job-that-counts`: "I'll be on your side from the start of {office}, so give me a job that counts." — 'From the start of {office}' doesn't parse.
- `scene-talk.follow-thank.then-i-ll-be-ready-the-first-street-for-office-is-mine`: "Then I'll be ready. The first street for {office} is mine." — 'The first street for {office} is mine' is unclear.

### no-literary-phrasing (5)

- `scene-talk.follow-answer.it-s-me-self-and-the-people-i-ve-talked-to-on-these-streets-about-office`: "It's me, {self}, and the people I've talked to on these streets about {office}." — 'The people I've talked to on these streets' is composed texture and doesn't answer plainly.
- `scene-talk.narrate-narrate.it-s-the-same-street-the-same-door-name-keeps-one-hand-on-the-knob-this-time`: "It's the same street, the same door. {name} keeps one hand on the knob this time." — 'The same street, the same door' and the hand on the knob are literary staging.
- `scene-talk.reply-agree.be-at-my-place-when-it-s-quiet-and-i-ll-hand-you-everything-for-office`: "Be at my place when it's quiet and I'll hand you everything for {office}." — 'When it's quiet' is vague, and 'hand you everything for {office}' doesn't say what is handed over.
- `scene-talk.follow-press.a-small-job-today-beats-a-big-one-next-month-for-office-can-you-give-me-one`: "A small job today beats a big one next month for {office}. Can you give me one?" — 'A small job today beats a big one next month' is an epigram, not how a volunteer talks.
- `scene-talk.state-request.somebody-has-to-give-the-others-their-jobs-on-office-let-it-be-me-and-let-it-be`: "Somebody has to give the others their jobs on {office}. Let it be me and let it be early." — 'Let it be me and let it be early' is a composed turn.

### one-idea-to-a-sentence (4)

- `scene-talk.follow-answer.i-m-a-neighbor-with-a-stake-in-office-and-i-decided-to-ask-instead-of-wait`: "I'm a neighbor with a stake in {office}, and I decided to ask instead of wait." — 'Ask instead of wait' is ungrammatical, and 'a stake in {office}' is stiff.
- `scene-talk.state-request.i-can-do-evenings-i-d-rather-have-a-street-and-a-list-than-a-vague-thank-you-for`: "I can do evenings. I'd rather have a street and a list than a vague thank-you for {office}." — 'A vague thank-you for {office}' is muddled.
- `scene-talk.reply-agree.then-you-give-out-the-jobs-on-office-and-you-tell-me-when-one-is-missing`: "Then you give out the jobs on {office}, and you tell me when one is missing." — 'Jobs on {office}' and 'when one is missing' are unclear.
- `scene-talk.follow-answer.i-ll-give-everyone-who-offers-a-street-and-a-day-so-nobody-waits-around-on-offic`: "I'll give everyone who offers a street and a day, so nobody waits around on {office}." — Confusing: who gives out streets, and 'waits around on {office}' doesn't parse.

### vary-the-shape (3)

- `scene-talk.follow-accept.i-appreciate-you-saying-that-about-issue-people-should-hear-it-plainly`: "I appreciate you saying that about {issue}. People should hear it plainly." — The same accept move as row 102, and 'People should hear it plainly' is stiff.
- `scene-talk.reply-decline.i-don-t-have-a-job-for-you-on-office-right-now-and-i-d-rather-say-so-than-leave`: "I don't have a job for you on {office} right now, and I'd rather say so than leave you waiting." — It repeats row 032's 'I'd rather say so than...', and 'a job for you on {office}' is awkward.
- `scene-talk.follow-answer.help-with-the-filing-a-list-of-people-to-call-and-a-seat-at-the-table-for-office`: "Help with the filing, a list of people to call, and a seat at the table for {office}." — The same list answer as other rows, and 'a seat at the table for {office}' is unclear.

### pronoun-fits-the-person (2)

- `scene-talk.follow-answer.i-came-to-your-door-and-i-ll-answer-for-office-rival-can-answer-for-themself`: "I came to your door and I'll answer for {office}. {rival} can answer for themself." — 'Themself' for a named rival whose record holds a pronoun.
- `scene-talk.narrate-narrate.name-waits-at-the-edge-of-the-room-while-the-others-get-their-lists-nobody-has-h`: "{name} waits at the edge of the room while the others get their lists. Nobody has handed them one." — 'Them' for one named person whose record holds he or she.

### request-needs-its-ground (2)

- `scene-talk.state-request.i-said-i-d-be-around-where-do-you-stand-now-on-office`: "I said I'd be around. Where do you stand now on {office}?" — 'I said I'd be around' claims a promise the record doesn't hold.
- `scene-talk.state-request.you-told-me-to-ask-again-closer-to-the-vote-vote-day-is-near-and-i-m-asking`: "You told me to ask again closer to the vote. {vote-day} is near, and I'm asking." — It claims the voter asked to be asked again later; only knocked-before is required.

### no-insider-words (2)

- `scene-talk.state-request.i-d-like-to-be-one-of-the-first-on-office-before-it-s-a-crowd-what-do-you-need`: "I'd like to be one of the first on {office}, before it's a crowd. What do you need?" — 'One of the first on {office}' is campaign shorthand that reads as being first on the office itself.
- `scene-talk.reply-agree.phones-first-then-doors-on-the-weekend-that-s-your-start-on-office`: "Phones first, then doors on the weekend. That's your start on {office}." — 'Doors' is the insider word he rejected.

### reply-follows-the-line-before (1)

- `scene-talk.reply-deflect.i-don-t-sign-on-the-spot-leave-me-your-name-and-i-ll-think-about-office`: "I don't sign on the spot. Leave me your name, and I'll think about {office}." — The player asked for a signature, but the voter says they'll think about the office, not about signing.

### reply-second-move-follows-the-first (1)

- `scene-talk.follow-answer.mostly-my-own-time-so-far-i-m-self-and-i-m-still-introducing-myself-for-office`: "Mostly my own time so far. I'm {self}, and I'm still introducing myself for {office}." — The self-introduction comes mid-talk after an unrelated first move.

### tense-of-the-record (1)

- `scene-talk.state-request.last-time-you-cared-about-about-did-anything-change-your-mind-on-office`: "Last time you cared about {about}. Did anything change your mind on {office}?" — 'Last time you cared about' implies they've stopped caring, and 'change your mind on {office}' is awkward.

### no-quick-resolution (1)

- `scene-talk.reply-agree.you-came-back-so-you-re-serious-put-me-down-for-office`: "You came back, so you're serious. Put me down for {office}." — The voter gives in at once because the player came back, and 'Put me down for {office}' reads as signing up for the office.

### no-pointing-at-the-unnamed (1)

- `scene-talk.follow-thank.thank-you-for-thinking-it-over-i-ll-keep-earning-it-before-vote-day`: "Thank you for thinking it over. I'll keep earning it before {vote-day}." — 'Keep earning it': it, what is it?

### names-something-specific (1)

- `scene-talk.reply-agree.you-take-the-east-side-first-i-ll-get-you-a-list-and-a-pen-for-office-tomorrow`: "You take the east side first. I'll get you a list and a pen for {office} tomorrow." — It makes up an 'east side' the record doesn't hold, and 'a pen for {office}' is odd.

### plain-american-reads-stiff (1)

- `scene-talk.reply-stall.i-haven-t-sorted-who-does-what-for-office-yet-give-me-until-the-end-of-the-week`: "I haven't sorted who does what for {office} yet. Give me until the end of the week." — 'Sorted who does what' leans British.

### alright-in-dialogue (1)

- `scene-talk.follow-accept.all-right-i-ll-wait-call-me-when-office-has-something`: "All right, I'll wait. Call me when {office} has something." — He writes 'Alright', and 'when {office} has something' treats the office as a person.

### person-said-by-role-pronoun-or-relationship (1)

- `scene-talk.narrate-narrate.a-knock-at-the-door-it-s-name-and-the-filing-for-office-is-on-name-s-mind`: "A knock at the door. It's {name}, and the filing for {office} is on {name}'s mind." — The name is said twice in one line, and the narrator claims what is on the visitor's mind.

### no-filler (1)

- `scene-talk.follow-answer.honestly-a-place-on-the-ballot-for-office-and-people-who-want-you-to-win-it`: "Honestly, a place on the ballot for {office} and people who want you to win it." — It opens on the filler 'Honestly' and repeats the list shape of the other rows.

## Passing lines

- `scene-talk.reply-disagree.you-and-i-see-this-differently-opponent-and-i-ll-say-so-plainly`: "You and I see this differently, {opponent}, and I'll say so plainly."
- `scene-talk.reply-deflect.this-isn-t-the-place-for-it-opponent-ask-me-after-the-crowd-leaves`: "This isn't the place for it, {opponent}. Ask me after the crowd leaves."
- `scene-talk.reply-confront.if-you-have-something-to-say-opponent-say-it-to-everyone`: "If you have something to say, {opponent}, say it to everyone."
- `scene-talk.reply-boast.people-came-here-to-hear-from-me-opponent-and-i-ll-keep-talking`: "People came here to hear from me, {opponent}, and I'll keep talking."
- `scene-talk.narrate-narrate.the-speeches-are-over-name-stays-behind-with-something-to-say-about-issue`: "The speeches are over. {name} stays behind with something to say about {issue}."
- `scene-talk.state-confront.i-heard-what-you-said-about-issue-people-deserve-a-different-answer`: "I heard what you said about {issue}. People deserve a different answer."
- `scene-talk.state-confront.you-talk-about-issue-like-you-ve-never-had-to-live-with-it`: "You talk about {issue} like you've never had to live with it."
- `scene-talk.reply-deflect.i-ll-talk-about-issue-when-the-crowd-isn-t-watching-come-see-me`: "I'll talk about {issue} when the crowd isn't watching. Come see me."
- `scene-talk.reply-confront.if-issue-matters-to-you-tell-people-what-you-d-do`: "If {issue} matters to you, tell people what you'd do."
- `scene-talk.follow-confront.a-crowd-isn-t-an-answer-on-issue-give-me-one`: "A crowd isn't an answer on {issue}. Give me one."
- `scene-talk.follow-boast.people-will-hear-from-me-on-issue-and-they-ll-remember-who-answered`: "People will hear from me on {issue}, and they'll remember who answered."
- `scene-talk.follow-confront.source-says-that-isn-t-what-happened-try-again`: "{source} says that isn't what happened. Try again."
- `scene-talk.follow-confront.i-asked-source-about-it-and-the-story-doesn-t-match-yours`: "I asked {source} about it, and the story doesn't match yours."
- `scene-talk.reply-confess.you-re-right-opponent-i-said-more-than-i-should-have`: "You're right, {opponent}. I said more than I should have."
- `scene-talk.reply-confess.alright-i-didn-t-have-it-straight-on-issue-and-i-ll-say-so`: "Alright. I didn't have it straight on {issue}, and I'll say so."
- `scene-talk.reply-confess.i-stretched-it-opponent-people-deserve-the-plain-version`: "I stretched it, {opponent}. People deserve the plain version."
- `scene-talk.reply-disagree.you-keep-saying-that-opponent-the-record-on-issue-says-otherwise`: "You keep saying that, {opponent}. The record on {issue} says otherwise."
- `scene-talk.reply-disagree.i-won-t-argue-it-twice-opponent-my-answer-stands`: "I won't argue it twice, {opponent}. My answer stands."
- `scene-talk.reply-boast.say-it-as-often-as-you-like-opponent-the-room-can-decide`: "Say it as often as you like, {opponent}. The room can decide."
- `scene-talk.reply-deflect.let-s-both-save-this-for-the-debate-opponent`: "Let's both save this for the debate, {opponent}."
- `scene-talk.reply-confront.is-that-all-you-ve-got-opponent`: "Is that all you've got, {opponent}?"
- `scene-talk.reply-leave.i-m-done-here-opponent-thank-you-all`: "I'm done here, {opponent}. Thank you all."
- `scene-talk.follow-accept.thank-you-for-saying-so-that-s-more-than-most-do-on-issue`: "Thank you for saying so. That's more than most do on {issue}."
- `scene-talk.state-request.i-m-running-for-office-and-i-d-like-to-have-your-name-beside-mine`: "I'm running for {office}, and I'd like to have your name beside mine."
- `scene-talk.state-request.say-a-word-for-me-for-office-that-s-all-i-m-asking`: "Say a word for me for {office}. That's all I'm asking."
- `scene-talk.state-request.you-ve-got-a-following-here-would-you-stand-up-for-me-in-the-race-for-office`: "You've got a following here. Would you stand up for me in the race for {office}?"
- `scene-talk.state-request.vote-day-is-coming-and-i-m-asking-for-your-endorsement-for-office`: "{vote-day} is coming, and I'm asking for your endorsement for {office}."
- `scene-talk.state-tell-reason.we-ve-been-around-each-other-a-long-time-i-d-be-proud-to-have-your-support-for-o`: "We've been around each other a long time. I'd be proud to have your support for {office}."
- `scene-talk.state-tell-reason.we-ve-never-been-close-but-i-ve-followed-your-work-i-m-running-for-office`: "We've never been close, but I've followed your work. I'm running for {office}."
- `scene-talk.state-tell-reason.you-stood-with-me-on-bill-i-m-hoping-that-carries-into-the-race-for-office`: "You stood with me on {bill}. I'm hoping that carries into the race for {office}."
- `scene-talk.reply-agree.you-ve-got-it-i-ll-say-your-name-for-office-wherever-i-can`: "You've got it. I'll say your name for {office} wherever I can."
- `scene-talk.reply-agree.put-my-name-beside-yours-for-office-i-ll-tell-people-why`: "Put my name beside yours for {office}. I'll tell people why."
- `scene-talk.reply-agree.i-ve-been-waiting-for-you-to-ask-count-me-in-for-office`: "I've been waiting for you to ask. Count me in for {office}."
- `scene-talk.reply-decline.i-m-staying-out-of-the-race-for-office-it-s-nothing-personal`: "I'm staying out of the race for {office}. It's nothing personal."
- `scene-talk.reply-decline.i-can-t-my-word-on-office-is-already-spoken-for`: "I can't. My word on {office} is already spoken for."
- `scene-talk.reply-decline.i-d-rather-not-put-a-name-on-office-this-early-ask-me-closer-to-vote-day`: "I'd rather not put a name on {office} this early. Ask me closer to {vote-day}."
- `scene-talk.reply-stall.let-me-hear-who-else-is-running-for-office-first`: "Let me hear who else is running for {office} first."
- `scene-talk.follow-thank.i-ll-remember-this-in-the-race-for-office`: "I'll remember this in the race for {office}."
- `scene-talk.follow-thank.this-helps-more-than-you-know-in-the-race-for-office-thank-you`: "This helps more than you know in the race for {office}. Thank you."
- `scene-talk.follow-accept.i-understand-i-ll-keep-working-for-office-either-way`: "I understand. I'll keep working for {office} either way."
- `scene-talk.follow-accept.thanks-for-being-direct-with-me-about-office`: "Thanks for being direct with me about {office}."
- `scene-talk.reply-ask.why-come-to-me-for-the-race-for-office-what-do-you-think-i-can-do`: "Why come to me for the race for {office}? What do you think I can do?"
- `scene-talk.reply-ask.who-else-have-you-asked-about-office`: "Who else have you asked about {office}?"
- `scene-talk.follow-answer.you-stood-by-me-before-i-d-like-to-have-you-again-for-office`: "You stood by me before. I'd like to have you again for {office}."
- `scene-talk.follow-answer.i-stood-with-you-on-bill-and-i-wouldn-t-ask-if-that-didn-t-count-for-something`: "I stood with you on {bill}, and I wouldn't ask if that didn't count for something."
- `scene-talk.follow-answer.a-few-and-some-said-yes-already-i-d-like-yours-too-for-office`: "A few, and some said yes already. I'd like yours too for {office}."
- `scene-talk.state-tell.opponent-is-telling-people-what-you-won-t-say-about-issue-i-thought-you-should-k`: "{opponent} is telling people what you won't say about {issue}. I thought you should know."
- `scene-talk.state-tell.on-issue-opponent-has-a-clear-position-i-m-waiting-to-hear-yours`: "On {issue}, {opponent} has a clear position. I'm waiting to hear yours."
- `scene-talk.reply-ask.what-did-they-actually-say-about-issue`: "What did they actually say about {issue}?"
- `scene-talk.reply-ask.did-it-change-your-mind-about-issue-or-about-me`: "Did it change your mind about {issue}, or about me?"
- `scene-talk.reply-promise.i-ll-answer-opponent-on-issue-in-my-own-words-starting-this-week`: "I'll answer {opponent} on {issue} in my own words, starting this week."
- `scene-talk.reply-leave.thanks-for-the-warning-on-issue-i-ve-got-somewhere-to-be`: "Thanks for the warning on {issue}. I've got somewhere to be."
- `scene-talk.follow-answer.it-didn-t-change-my-mind-on-issue-but-it-made-me-notice-who-isn-t-talking`: "It didn't change my mind on {issue}, but it made me notice who isn't talking."
- `scene-talk.follow-press.people-will-ask-you-about-issue-whether-you-bring-it-up-or-not`: "People will ask you about {issue} whether you bring it up or not."
- `scene-talk.follow-accept.i-figured-you-d-want-the-word-on-issue-that-s-all-it-was`: "I figured you'd want the word on {issue}. That's all it was."
- `scene-talk.narrate-narrate.name-waits-by-the-door-with-news-about-opponent-s-campaign`: "{name} waits by the door with news about {opponent}'s campaign."
- `scene-talk.narrate-narrate.somebody-has-passed-along-what-opponent-is-telling-people-about-issue`: "Somebody has passed along what {opponent} is telling people about {issue}."
- `scene-talk.narrate-narrate.name-looks-uneasy-opponent-s-people-have-been-making-the-rounds-on-issue`: "{name} looks uneasy. {opponent}'s people have been making the rounds on {issue}."
- `scene-talk.narrate-narrate.the-porch-light-is-on-at-name-s-place-you-knock-once-and-wait`: "The porch light is on at {name}'s place. You knock once and wait."
- `scene-talk.narrate-narrate.a-screen-door-creaks-name-looks-you-over-before-saying-a-word`: "A screen door creaks. {name} looks you over before saying a word."
- `scene-talk.narrate-narrate.you-hear-a-television-go-quiet-inside-then-footsteps-name-opens-up`: "You hear a television go quiet inside, then footsteps. {name} opens up."
- `scene-talk.narrate-narrate.name-answers-the-door-still-holding-a-coffee-cup`: "{name} answers the door still holding a coffee cup."
- `scene-talk.narrate-narrate.a-dog-barks-before-the-door-opens-name-holds-it-back-with-one-foot`: "A dog barks before the door opens. {name} holds it back with one foot."
- `scene-talk.narrate-narrate.you-ve-walked-this-block-before-name-recognizes-you-at-the-second-knock-and-open`: "You've walked this block before. {name} recognizes you at the second knock and opens the door wider."
- `scene-talk.narrate-narrate.name-remembers-the-last-visit-the-door-opens-before-you-finish-knocking`: "{name} remembers the last visit. The door opens before you finish knocking."
- `scene-talk.state-request.i-m-self-i-can-t-get-on-the-ballot-for-office-without-names-and-i-m-asking-for-y`: "I'm {self}. I can't get on the ballot for {office} without names, and I'm asking for yours."
- `scene-talk.state-request.my-petition-for-office-is-due-due-i-m-self-will-you-sign`: "My petition for {office} is due {due}. I'm {self}. Will you sign?"
- `scene-talk.state-request.i-m-self-neighbors-are-helping-me-get-on-the-ballot-for-office-could-i-have-your`: "I'm {self}. Neighbors are helping me get on the ballot for {office}. Could I have your signature?"
- `scene-talk.state-request.i-came-back-about-the-petition-for-office-it-s-due-due-would-you-put-your-name-o`: "I came back about the petition for {office}. It's due {due}. Would you put your name on it?"
- `scene-talk.reply-agree.hand-me-the-pen-i-d-like-to-see-your-name-on-the-ballot-for-office`: "Hand me the pen. I'd like to see your name on the ballot for {office}."
- `scene-talk.reply-agree.sure-people-here-should-get-to-choose-who-s-on-the-ballot-for-office-so-i-ll-sig`: "Sure. People here should get to choose who's on the ballot for {office}, so I'll sign."
- `scene-talk.reply-agree.i-ll-sign-for-office-it-doesn-t-mean-i-m-voting-for-you`: "I'll sign for {office}. It doesn't mean I'm voting for you."
- `scene-talk.reply-decline.i-don-t-sign-things-at-the-door-and-that-includes-a-petition-for-office`: "I don't sign things at the door, and that includes a petition for {office}."
- `scene-talk.reply-decline.i-m-not-signing-for-office-ask-someone-who-knows-you-better`: "I'm not signing for {office}. Ask someone who knows you better."
- `scene-talk.reply-decline.my-name-s-on-enough-lists-i-ll-pass-on-the-petition-for-office`: "My name's on enough lists. I'll pass on the petition for {office}."
- `scene-talk.reply-decline.i-m-backing-rival-for-office-so-i-can-t-put-my-name-on-yours`: "I'm backing {rival} for {office}, so I can't put my name on yours."
- `scene-talk.reply-ask.what-happens-to-my-name-once-i-sign-for-office-does-the-whole-town-see-it`: "What happens to my name once I sign for {office}? Does the whole town see it?"
- `scene-talk.follow-accept.i-understand-i-ll-find-the-rest-of-my-names-for-office-elsewhere`: "I understand. I'll find the rest of my names for {office} elsewhere."
- `scene-talk.follow-press.i-m-on-the-ballot-for-office-only-if-people-like-you-sign-what-s-holding-you-bac`: "I'm on the ballot for {office} only if people like you sign. What's holding you back?"
- `scene-talk.follow-answer.it-goes-on-the-sheet-that-puts-me-on-the-ballot-for-office-and-nowhere-else-i-kn`: "It goes on the sheet that puts me on the ballot for {office}, and nowhere else I know of."
- `scene-talk.follow-answer.it-s-a-name-on-a-petition-for-office-you-re-only-saying-i-should-get-a-chance-to`: "It's a name on a petition for {office}. You're only saying I should get a chance to run."
- `scene-talk.reply-deflect.i-d-like-to-think-about-office-first-come-back-another-day`: "I'd like to think about {office} first. Come back another day."
- `scene-talk.state-request.i-m-back-about-the-petition-for-office-would-you-sign-it-now`: "I'm back about the petition for {office}. Would you sign it now?"
- `scene-talk.reply-agree.alright-i-ll-sign-the-petition-for-office-you-ve-earned-it-by-coming-back`: "Alright, I'll sign the petition for {office}. You've earned it by coming back."
- `scene-talk.reply-decline.still-no-on-the-petition-for-office-i-told-you-last-time`: "Still no on the petition for {office}. I told you last time."
- `scene-talk.state-request.my-name-s-self-office-is-on-the-ballot-and-i-d-like-to-be-your-pick`: "My name's {self}. {office} is on the ballot, and I'd like to be your pick."
- `scene-talk.state-request.you-ll-see-my-name-on-the-ballot-for-office-i-m-self-i-wanted-you-to-put-a-face`: "You'll see my name on the ballot for {office}. I'm {self}. I wanted you to put a face to it first."
- `scene-talk.state-request.good-morning-i-m-self-and-i-m-out-early-asking-for-votes-for-office`: "Good morning. I'm {self}, and I'm out early asking for votes for {office}."
- `scene-talk.state-request.i-m-self-most-people-haven-t-heard-from-anyone-about-the-race-for-office-yet-so`: "I'm {self}. Most people haven't heard from anyone about the race for {office} yet, so I came to you."
- `scene-talk.state-request.i-m-self-and-i-m-up-against-rival-for-office-i-d-like-to-earn-your-vote-the-hard`: "I'm {self}, and I'm up against {rival} for {office}. I'd like to earn your vote the hard way, at your door."
- `scene-talk.state-request.rival-is-on-the-ballot-for-office-too-i-m-self-and-i-came-to-give-you-the-other`: "{rival} is on the ballot for {office} too. I'm {self}, and I came to give you the other choice."
- `scene-talk.state-request.self-running-for-office-if-about-matters-to-you-i-d-like-five-minutes-of-your-ti`: "{self}, running for {office}. If {about} matters to you, I'd like five minutes of your time."
- `scene-talk.state-request.we-talked-a-while-back-i-m-self-and-i-m-still-asking-for-your-vote-for-office`: "We talked a while back. I'm {self}, and I'm still asking for your vote for {office}."
- `scene-talk.state-request.i-said-i-d-come-back-so-here-i-am-has-anything-changed-in-the-race-for-office-si`: "I said I'd come back, so here I am. Has anything changed in the race for {office} since we last spoke?"
- `scene-talk.state-request.did-you-get-a-chance-to-think-over-office-i-m-self-the-one-who-stopped-by-before`: "Did you get a chance to think over {office}? I'm {self}, the one who stopped by before."
- `scene-talk.reply-agree.alright-if-you-re-out-knocking-for-office-you-ve-earned-my-vote`: "Alright. If you're out knocking for {office}, you've earned my vote."
- `scene-talk.reply-agree.put-me-down-for-you-on-vote-day`: "Put me down for you on {vote-day}."
- `scene-talk.reply-agree.you-ve-got-me-for-office-tell-the-others-on-this-street-i-said-so`: "You've got me for {office}. Tell the others on this street I said so."
- `scene-talk.reply-agree.somebody-who-asks-in-person-gets-my-vote-for-office-i-mean-it`: "Somebody who asks in person gets my vote for {office}. I mean it."
- `scene-talk.reply-agree.we-see-about-the-same-way-you-can-count-on-me-for-office`: "We see {about} the same way. You can count on me for {office}."
- `scene-talk.reply-agree.you-came-back-and-that-counts-i-m-voting-for-you-for-office`: "You came back, and that counts. I'm voting for you for {office}."
- `scene-talk.reply-decline.i-haven-t-picked-anyone-for-office-and-i-m-not-going-to-do-it-on-the-porch`: "I haven't picked anyone for {office}, and I'm not going to do it on the porch."
- `scene-talk.reply-decline.not-today-i-ll-read-up-on-office-before-vote-day`: "Not today. I'll read up on {office} before {vote-day}."
- `scene-talk.reply-decline.i-like-that-you-came-by-i-still-have-nothing-to-go-on-for-office`: "I like that you came by. I still have nothing to go on for {office}."
- `scene-talk.reply-decline.i-ve-heard-big-promises-on-about-before-show-me-yours-is-different`: "I've heard big promises on {about} before. Show me yours is different."
- `scene-talk.reply-decline.i-m-busy-and-the-race-for-office-isn-t-something-i-follow-maybe-closer-to-vote-d`: "I'm busy, and the race for {office} isn't something I follow. Maybe closer to {vote-day}."
- `scene-talk.reply-deflect.ask-me-about-office-another-day-when-i-ve-had-time-to-sit-down-with-it`: "Ask me about {office} another day, when I've had time to sit down with it."
- `scene-talk.reply-deflect.let-me-see-what-rival-has-to-say-first-then-ask-me-again`: "Let me see what {rival} has to say first. Then ask me again."
- `scene-talk.reply-deflect.let-me-think-about-office-first-i-ll-know-more-when-vote-day-is-closer`: "Let me think about {office} first. I'll know more when {vote-day} is closer."
- `scene-talk.reply-leave.i-have-to-get-back-inside-good-luck-on-vote-day`: "I have to get back inside. Good luck on {vote-day}."
- `scene-talk.reply-leave.i-ve-got-to-get-to-work-i-wish-you-luck-in-the-race-for-office`: "I've got to get to work. I wish you luck in the race for {office}."
- `scene-talk.reply-leave.i-can-t-stand-here-talking-the-race-for-office-isn-t-going-to-be-decided-on-my-p`: "I can't stand here talking. The race for {office} isn't going to be decided on my porch."
- `scene-talk.reply-ask.why-should-i-pick-you-over-rival-for-office`: "Why should I pick you over {rival} for {office}?"
- `scene-talk.reply-ask.what-did-you-do-before-you-decided-to-run-for-office`: "What did you do before you decided to run for {office}?"
- `scene-talk.reply-ask.who-s-behind-your-run-for-office-tell-me-that-and-i-ll-listen`: "Who's behind your run for {office}? Tell me that, and I'll listen."
- `scene-talk.follow-thank.i-ll-work-for-it-you-ll-hear-from-me-again-before-vote-day`: "I'll work for it. You'll hear from me again before {vote-day}."
- `scene-talk.follow-thank.that-s-one-more-reason-to-keep-at-the-race-for-office-thank-you`: "That's one more reason to keep at the race for {office}. Thank you."
- `scene-talk.follow-thank.thank-you-tell-rival-s-people-you-re-taken`: "Thank you. Tell {rival}'s people you're taken."
- `scene-talk.follow-accept.no-pressure-i-ll-be-on-this-block-again-before-vote-day`: "No pressure. I'll be on this block again before {vote-day}."
- `scene-talk.follow-press.is-it-me-or-is-it-the-race-for-office-you-re-unsure-of`: "Is it me, or is it the race for {office} you're unsure of?"
- `scene-talk.follow-press.what-has-rival-told-you-if-anything`: "What has {rival} told you, if anything?"
- `scene-talk.follow-press.i-d-stand-does-that-change-how-you-see-the-race-for-office`: "I'd {stand}. Does that change how you see the race for {office}?"
- `scene-talk.follow-promise.i-ll-bring-a-plain-answer-on-about-next-time-i-m-on-your-street`: "I'll bring a plain answer on {about} next time I'm on your street."
- `scene-talk.follow-answer.i-d-stand-that-s-where-i-d-begin-on-about`: "I'd {stand}. That's where I'd begin on {about}."
- `scene-talk.follow-answer.straight-answer-i-d-look-first-at-about-and-see-what-office-can-actually-do-abou`: "Straight answer: I'd look first at {about} and see what {office} can actually do about it."
- `scene-talk.follow-answer.the-short-version-is-i-want-to-work-on-about-and-the-race-for-office-is-where-th`: "The short version is I want to work on {about}, and the race for {office} is where that gets decided."
- `scene-talk.follow-answer.ask-us-both-about-about-and-see-whose-answer-sounds-like-yours`: "Ask us both about {about}, and see whose answer sounds like yours."
- `scene-talk.follow-answer.i-live-here-and-the-race-for-office-is-why-i-m-at-your-door`: "I live here, and the race for {office} is why I'm at your door."
- `scene-talk.state-request.back-again-have-you-had-time-to-think-about-the-race-for-office`: "Back again. Have you had time to think about the race for {office}?"
- `scene-talk.state-request.since-i-last-knocked-have-you-heard-anything-from-rival-about-office`: "Since I last knocked, have you heard anything from {rival} about {office}?"
- `scene-talk.reply-agree.i-thought-it-over-after-you-left-i-m-voting-for-you-for-office`: "I thought it over after you left. I'm voting for you for {office}."
- `scene-talk.reply-agree.i-asked-around-about-rival-and-about-you-you-get-my-vote-for-office`: "I asked around about {rival} and about you. You get my vote for {office}."
- `scene-talk.reply-decline.i-m-still-undecided-on-office-and-i-d-rather-say-so-than-promise`: "I'm still undecided on {office}, and I'd rather say so than promise."
- `scene-talk.reply-decline.i-decided-to-go-with-rival-for-office-i-wanted-you-to-hear-it-from-me`: "I decided to go with {rival} for {office}. I wanted you to hear it from me."
- `scene-talk.reply-deflect.ask-me-on-vote-day-itself-i-make-up-my-mind-late`: "Ask me on {vote-day} itself. I make up my mind late."
- `scene-talk.reply-leave.i-can-t-talk-long-good-luck-on-vote-day`: "I can't talk long. Good luck on {vote-day}."
- `scene-talk.follow-accept.fair-enough-i-ll-stop-troubling-you-about-office-after-today`: "Fair enough. I'll stop troubling you about {office} after today."
- `scene-talk.follow-press.what-would-make-the-difference-for-you-on-office-i-ll-listen`: "What would make the difference for you on {office}? I'll listen."
- `scene-talk.narrate-narrate.it-s-name-again-the-one-who-gave-to-your-campaign-and-has-asked-about-bill-befor`: "It's {name} again, the one who gave to your campaign and has asked about {bill} before."
- `scene-talk.state-request.you-ll-remember-what-i-put-toward-your-campaign-bill-is-why-i-did`: "You'll remember what I put toward your campaign. {bill} is why I did."
- `scene-talk.state-request.i-m-calling-about-bill-i-backed-you-and-i-d-like-to-know-where-you-stand-on-it`: "I'm calling about {bill}. I backed you, and I'd like to know where you stand on it."
- `scene-talk.state-request.money-didn-t-come-from-nowhere-i-need-you-to-look-hard-at-bill`: "{money} didn't come from nowhere. I need you to look hard at {bill}."
- `scene-talk.state-request.of-everyone-who-gave-i-gave-the-most-and-bill-is-my-one-ask`: "Of everyone who gave, I gave the most, and {bill} is my one ask."
- `scene-talk.state-request.i-didn-t-give-much-but-bill-matters-to-me-hear-me-out-for-a-minute`: "I didn't give much, but {bill} matters to me. Hear me out for a minute."
- `scene-talk.state-request.this-is-the-second-time-i-ve-called-about-bill-i-d-like-a-straight-answer-today`: "This is the second time I've called about {bill}. I'd like a straight answer today."
- `scene-talk.state-request.you-and-i-go-back-i-wouldn-t-ask-about-bill-if-it-weren-t-important`: "You and I go back. I wouldn't ask about {bill} if it weren't important."
- `scene-talk.state-request.people-at-employer-are-watching-bill-i-m-calling-for-all-of-them`: "People at {employer} are watching {bill}. I'm calling for all of them."
- `scene-talk.state-request.employer-made-a-case-for-bill-i-d-like-you-to-take-it-seriously`: "{employer} made a case for {bill}. I'd like you to take it seriously."
- `scene-talk.state-request.about-is-why-i-give-where-do-you-stand-on-it`: "{about} is why I give. Where do you stand on it?"
- `scene-talk.reply-decline.a-check-doesn-t-buy-a-vote-on-bill-i-ll-decide-it-on-what-i-learn`: "A check doesn't buy a vote on {bill}. I'll decide it on what I learn."
- `scene-talk.reply-decline.i-m-grateful-for-your-help-in-the-race-bill-still-has-to-earn-my-vote`: "I'm grateful for your help in the race. {bill} still has to earn my vote."
- `scene-talk.reply-stall.i-haven-t-read-all-of-bill-give-me-time-before-i-say-anything`: "I haven't read all of {bill}. Give me time before I say anything."
- `scene-talk.reply-stall.ask-me-after-the-committee-has-taken-up-bill-i-d-rather-not-say-before`: "Ask me after the committee has taken up {bill}. I'd rather not say before."
- `scene-talk.reply-relent.you-ve-given-me-a-reason-to-read-bill-more-closely-that-s-all-i-ll-promise`: "You've given me a reason to read {bill} more closely. That's all I'll promise."
- `scene-talk.reply-ask.what-would-bill-change-for-the-people-you-speak-for`: "What would {bill} change for the people you speak for?"
- `scene-talk.reply-ask.who-is-hurt-if-bill-fails-tell-me-about-them`: "Who is hurt if {bill} fails? Tell me about them."
- `scene-talk.follow-answer.the-people-who-live-with-bill-every-day-they-don-t-have-a-lobbyist`: "The people who live with {bill} every day. They don't have a lobbyist."
- `scene-talk.follow-thank.thank-you-for-hearing-me-out-on-bill`: "Thank you for hearing me out on {bill}."
- `scene-talk.follow-accept.alright-i-ll-take-that-i-ll-still-be-watching-bill`: "Alright, I'll take that. I'll still be watching {bill}."
- `scene-talk.close-accept.understood-i-ll-make-my-case-on-bill-somewhere-else`: "Understood. I'll make my case on {bill} somewhere else."
- `scene-talk.close-thank.i-appreciate-the-time-on-bill-that-s-more-than-most-give`: "I appreciate the time on {bill}. That's more than most give."
- `scene-talk.narrate-narrate.the-sheets-for-office-sit-open-on-the-counter-and-most-of-the-lines-are-still-em`: "The sheets for {office} sit open on the counter, and most of the lines are still empty."
- `scene-talk.state-tell.the-petition-for-office-is-due-due-and-right-now-it-won-t-pass-the-check`: "The petition for {office} is due {due}, and right now it won't pass the check."
- `scene-talk.state-tell.this-office-keeps-the-list-and-your-list-for-office-is-short-the-deadline-is-due`: "This office keeps the list, and your list for {office} is short. The deadline is {due}."
- `scene-talk.state-tell.nothing-has-come-in-for-office-i-m-telling-you-now-so-it-s-not-a-surprise-on-due`: "Nothing has come in for {office}. I'm telling you now so it's not a surprise on {due}."
- `scene-talk.state-tell.i-can-t-accept-the-petition-for-office-the-way-it-stands-more-names-before-due-a`: "I can't accept the petition for {office} the way it stands. More names, before {due}, and we can talk."
- `scene-talk.state-tell.we-haven-t-gotten-one-signature-for-office-i-thought-people-would-line-up-and-th`: "We haven't gotten one signature for {office}. I thought people would line up, and they haven't."
- `scene-talk.state-tell.i-ll-say-it-straight-the-sheets-for-office-won-t-make-due-at-this-pace`: "I'll say it straight: the sheets for {office} won't make {due} at this pace."
- `scene-talk.reply-ask.how-many-days-until-due-show-me-what-s-left`: "How many days until {due}? Show me what's left."
- `scene-talk.reply-ask.can-the-clerk-s-office-hold-the-sheets-for-office-while-i-look-for-more-names`: "Can the clerk's office hold the sheets for {office} while I look for more names?"
- `scene-talk.reply-promise.give-me-the-sheets-i-ll-work-the-neighborhoods-this-week-for-office`: "Give me the sheets. I'll work the neighborhoods this week for {office}."
- `scene-talk.reply-promise.i-ll-call-everyone-who-said-they-d-sign-for-office-starting-today`: "I'll call everyone who said they'd sign for {office}, starting today."
- `scene-talk.reply-deflect.i-m-not-sure-office-is-the-right-race-for-me-yet-hold-the-sheets-until-i-am`: "I'm not sure {office} is the right race for me yet. Hold the sheets until I am."
- `scene-talk.reply-deflect.let-me-see-how-the-next-few-days-go-before-due-and-then-i-ll-know`: "Let me see how the next few days go before {due}, and then I'll know."
- `scene-talk.follow-thank.that-s-what-i-hoped-get-the-sheets-for-office-full-and-bring-them-in`: "That's what I hoped. Get the sheets for {office} full and bring them in."
- `scene-talk.follow-press.think-about-office-then-tell-me-in-a-day-or-two-that-s-all-i-d-ask`: "Think about {office}, then tell me in a day or two. That's all I'd ask."
- `scene-talk.follow-accept.understood-i-ll-leave-the-sheets-with-you-until-due`: "Understood. I'll leave the sheets with you until {due}."
- `scene-talk.follow-accept.i-won-t-push-office-is-your-decision`: "I won't push. {office} is your decision."
- `scene-talk.narrate-narrate.a-stamp-comes-down-hard-on-the-first-page-your-filing-for-office-is-on-the-recor`: "A stamp comes down hard on the first page. Your filing for {office} is on the record now."
- `scene-talk.narrate-narrate.you-hand-over-the-folder-for-office-the-clerk-checks-every-page-before-saying-a`: "You hand over the folder for {office}. The clerk checks every page before saying a word."
- `scene-talk.state-tell.your-papers-for-office-are-in-order-the-petition-needs-signatures-names-and-they`: "Your papers for {office} are in order. The petition needs {signatures} names, and they're due {due}."
- `scene-talk.state-tell.you-re-on-file-for-office-next-is-the-petition-signatures-signatures-by-due`: "You're on file for {office}. Next is the petition: {signatures} signatures by {due}."
- `scene-talk.state-tell.for-office-it-comes-down-to-names-signatures-of-them-in-by-due-and-i-ll-check-ea`: "For {office}, it comes down to names. {signatures} of them, in by {due}, and I'll check each one."
- `scene-talk.state-tell.a-petition-for-office-takes-signatures-voters-names-i-need-them-by-due`: "A petition for {office} takes {signatures} voters' names. I need them by {due}."
- `scene-talk.state-tell.you-ll-need-one-signature-for-office-in-by-due-it-s-one-name-so-don-t-wait-for-t`: "You'll need one signature for {office}, in by {due}. It's one name, so don't wait for the last day."
- `scene-talk.state-tell.filing-for-office-is-done-no-signatures-are-asked-here-so-what-s-left-is-the-cam`: "Filing for {office} is done. No signatures are asked here, so what's left is the campaign before {vote-day}."
- `scene-talk.reply-agree.understood-i-ll-have-the-names-for-office-in-before-due`: "Understood. I'll have the names for {office} in before {due}."
- `scene-talk.reply-agree.thanks-i-ll-start-collecting-for-office-today`: "Thanks. I'll start collecting for {office} today."
- `scene-talk.reply-agree.that-s-clear-i-ll-bring-the-sheets-back-for-office`: "That's clear. I'll bring the sheets back for {office}."
- `scene-talk.reply-ask.who-counts-as-a-valid-signer-for-office-anyone-in-town`: "Who counts as a valid signer for {office}? Anyone in town?"
- `scene-talk.reply-ask.what-happens-if-i-m-a-few-names-short-for-office-on-due`: "What happens if I'm a few names short for {office} on {due}?"
- `scene-talk.reply-ask.can-the-sheets-for-office-be-turned-in-early-a-few-at-a-time`: "Can the sheets for {office} be turned in early, a few at a time?"
- `scene-talk.reply-ask.how-do-i-know-the-clerk-s-office-has-counted-every-signature-for-office`: "How do I know the clerk's office has counted every signature for {office}?"
- `scene-talk.reply-confront.that-s-a-lot-to-ask-for-office-who-decided-how-many-names-it-takes`: "That's a lot to ask for {office}. Who decided how many names it takes?"
- `scene-talk.reply-confront.is-this-really-how-a-regular-person-gets-on-the-ballot-for-office`: "Is this really how a regular person gets on the ballot for {office}?"
- `scene-talk.reply-leave.i-have-to-go-i-ll-bring-the-sheets-for-office-when-i-have-them`: "I have to go. I'll bring the sheets for {office} when I have them."
- `scene-talk.reply-leave.i-ve-got-what-i-need-for-office-thank-you`: "I've got what I need for {office}. Thank you."
- `scene-talk.follow-thank.good-luck-with-office-come-back-anytime-before-the-deadline`: "Good luck with {office}. Come back anytime before the deadline."
- `scene-talk.follow-thank.glad-to-have-your-papers-for-office-don-t-wait-on-the-names`: "Glad to have your papers for {office}. Don't wait on the names."
- `scene-talk.follow-answer.registered-voters-of-the-district-for-office-i-check-each-name-against-the-roll`: "Registered voters of the district for {office}. I check each name against the roll."
- `scene-talk.follow-answer.short-on-the-last-day-means-the-petition-for-office-doesn-t-count-i-can-t-bend-t`: "Short on the last day means the petition for {office} doesn't count. I can't bend that."
- `scene-talk.follow-answer.yes-you-can-bring-sheets-in-as-you-go-for-office-it-saves-a-rush-on-the-last-day`: "Yes, you can bring sheets in as you go for {office}. It saves a rush on the last day."
- `scene-talk.follow-refuse.the-rule-for-office-is-set-by-the-state-not-by-me-i-can-only-tell-you-what-it-is`: "The rule for {office} is set by the state, not by me. I can only tell you what it is."
- `scene-talk.follow-refuse.i-understand-it-s-a-lot-the-requirement-for-office-stays-as-it-is`: "I understand it's a lot. The requirement for {office} stays as it is."
- `scene-talk.reply-leave.that-answers-it-i-ll-bring-names-for-office-when-i-have-them`: "That answers it. I'll bring names for {office} when I have them."
- `scene-talk.reply-agree.fine-i-ll-gather-the-names-for-office-the-way-the-rule-says`: "Fine. I'll gather the names for {office} the way the rule says."
- `scene-talk.reply-agree.alright-the-rule-for-office-is-the-rule-i-ll-work-with-it`: "Alright, the rule for {office} is the rule. I'll work with it."
- `scene-talk.narrate-narrate.name-calls-from-the-newsroom-and-gets-to-the-point`: "{name} calls from the newsroom and gets to the point."
- `scene-talk.open-greet.this-is-first-i-m-calling-about-a-debate`: "This is {first}. I'm calling about a debate."
- `scene-talk.state-request.outlet-is-putting-on-a-debate-for-office-will-you-take-the-stage`: "{outlet} is putting on a debate for {office}. Will you take the stage?"
- `scene-talk.state-request.we-re-giving-the-candidates-for-office-an-hour-side-by-side-will-you-be-one-of-t`: "We're giving the candidates for {office} an hour, side by side. Will you be one of them?"
- `scene-talk.state-request.readers-of-outlet-want-to-hear-the-people-running-for-office-answer-in-the-same`: "Readers of {outlet} want to hear the people running for {office} answer in the same room."
- `scene-talk.state-request.we-ve-asked-everybody-on-the-ballot-for-office-you-re-the-one-we-re-still-waitin`: "We've asked everybody on the ballot for {office}. You're the one we're still waiting to hear from."
- `scene-talk.reply-ask.who-else-is-on-stage-for-office-and-who-picks-the-questions`: "Who else is on stage for {office}, and who picks the questions?"
- `scene-talk.reply-ask.what-does-outlet-want-out-of-a-debate-for-office`: "What does {outlet} want out of a debate for {office}?"
- `scene-talk.reply-decline.i-ll-pass-on-the-debate-for-office-i-d-rather-meet-voters-one-at-a-time`: "I'll pass on the debate for {office}. I'd rather meet voters one at a time."
- `scene-talk.reply-decline.outlet-can-run-its-debate-for-office-without-me`: "{outlet} can run its debate for {office} without me."
- `scene-talk.follow-answer.outlet-wants-a-straight-hour-for-office-nothing-staged`: "{outlet} wants a straight hour for {office}, nothing staged."
- `scene-talk.narrate-narrate.name-waits-until-the-others-have-gone-before-speaking`: "{name} waits until the others have gone before speaking."
- `scene-talk.narrate-narrate.someone-you-know-well-name-has-been-thinking-about-your-race`: "Someone you know well, {name}, has been thinking about your race."
- `scene-talk.open-greet.it-s-first-i-ll-come-right-to-the-point`: "It's {first}. I'll come right to the point."
- `scene-talk.state-request.i-saw-you-filed-for-office-i-can-give-you-my-evenings-and-i-d-like-to`: "I saw you filed for {office}. I can give you my evenings, and I'd like to."
- `scene-talk.state-request.put-me-to-work-on-the-race-for-office-i-ll-knock-i-ll-call-i-ll-do-whatever-you`: "Put me to work on the race for {office}. I'll knock, I'll call, I'll do whatever you need."
- `scene-talk.state-request.i-think-you-d-do-well-as-office-and-i-d-like-to-help-prove-it`: "I think you'd do well as {office}, and I'd like to help prove it."
- `scene-talk.state-request.whoever-else-you-ve-got-you-could-use-one-more-set-of-hands-in-the-race-for-offi`: "Whoever else you've got, you could use one more set of hands in the race for {office}."
- `scene-talk.state-request.we-haven-t-talked-much-but-i-heard-about-your-run-for-office-i-d-like-to-be-part`: "We haven't talked much, but I heard about your run for {office}. I'd like to be part of it."
- `scene-talk.reply-ask.what-can-you-do-and-how-much-time-do-you-have-for-the-race-for-office`: "What can you do, and how much time do you have for the race for {office}?"
- `scene-talk.reply-ask.why-now-what-made-you-want-in-on-the-race-for-office`: "Why now? What made you want in on the race for {office}?"
- `scene-talk.reply-agree.i-d-be-glad-to-have-you-on-the-campaign-for-office-come-by-when-you-re-free`: "I'd be glad to have you on the campaign for {office}. Come by when you're free."
- `scene-talk.reply-agree.yes-i-need-people-who-show-up-welcome-to-the-campaign-for-office`: "Yes. I need people who show up. Welcome to the campaign for {office}."
- `scene-talk.reply-decline.i-d-rather-keep-the-campaign-for-office-small-for-now-ask-me-again-later`: "I'd rather keep the campaign for {office} small for now. Ask me again later."
- `scene-talk.reply-stall.let-me-see-where-the-race-for-office-stands-by-the-end-of-the-week`: "Let me see where the race for {office} stands by the end of the week."
- `scene-talk.reply-leave.i-m-late-for-something-come-find-me-about-office-another-day`: "I'm late for something. Come find me about {office} another day."
- `scene-talk.follow-answer.i-can-give-evenings-and-a-couple-of-weekends-to-the-race-for-office`: "I can give evenings and a couple of weekends to the race for {office}."
- `scene-talk.state-request.whatever-s-open-for-office-i-ll-take-it-a-street-a-phone-list-a-table-at-the-mar`: "Whatever's open for {office}, I'll take it: a street, a phone list, a table at the market."
- `scene-talk.follow-thank.that-s-all-i-wanted-a-place-to-start-on-office-thank-you`: "That's all I wanted, a place to start on {office}. Thank you."
- `scene-talk.narrate-narrate.name-meets-you-at-the-door-of-the-party-meeting-and-shakes-your-hand`: "{name} meets you at the door of the party meeting and shakes your hand."
- `scene-talk.state-request.welcome-to-the-party-i-hope-you-ll-come-back-and-i-hope-you-ll-bring-someone`: "Welcome to the {party}. I hope you'll come back, and I hope you'll bring someone."
- `scene-talk.state-request.we-re-glad-the-party-has-you-would-you-join-a-committee-this-season`: "We're glad the {party} has you. Would you join a committee this season?"
- `scene-talk.state-request.now-that-you-ve-joined-the-party-would-you-help-at-our-next-meeting`: "Now that you've joined the {party}, would you help at our next meeting?"
- `scene-talk.reply-agree.yes-i-ll-help-the-party-where-i-can`: "Yes. I'll help the {party} where I can."
- `scene-talk.reply-ask.what-does-the-party-need-most-from-a-new-member`: "What does the {party} need most from a new member?"
- `scene-talk.reply-deflect.i-just-joined-the-party-let-me-see-how-things-work-first`: "I just joined the {party}. Let me see how things work first."
- `scene-talk.follow-answer.people-who-show-up-and-do-the-small-jobs-that-s-what-the-party-needs`: "People who show up and do the small jobs. That's what the {party} needs."
- `scene-talk.follow-press.there-s-no-hurry-the-party-meets-again-soon-and-we-d-like-to-see-you`: "There's no hurry. The {party} meets again soon, and we'd like to see you."
- `scene-talk.reply-leave.i-have-to-go-thanks-for-the-welcome-to-the-party`: "I have to go. Thanks for the welcome to the {party}."
- `scene-talk.reply-deflect.i-ll-think-about-what-i-can-offer-the-party-not-today`: "I'll think about what I can offer the {party}. Not today."
- `scene-talk.follow-thank.thank-you-the-party-is-glad-to-have-you`: "Thank you. The {party} is glad to have you."
- `scene-talk.reply-agree.that-sounds-fair-i-ll-come-to-the-next-meeting-of-the-party`: "That sounds fair. I'll come to the next meeting of the {party}."
- `scene-talk.state-request.i-want-to-run-your-campaign-for-office-not-help-with-it-run-it`: "I want to run your campaign for {office}. Not help with it. Run it."
- `scene-talk.state-request.i-know-how-you-work-let-me-manage-the-campaign-for-office-so-you-can-do-the-part`: "I know how you work. Let me manage the campaign for {office} so you can do the part only you can."
- `scene-talk.state-request.put-me-in-charge-of-the-schedule-for-office-i-can-say-no-to-people-for-you`: "Put me in charge of the schedule for {office}. I can say no to people for you."
- `scene-talk.state-request.i-m-offering-to-take-on-the-campaign-for-office-if-you-ll-trust-me-with-it`: "I'm offering to take on the campaign for {office}, if you'll trust me with it."
- `scene-talk.reply-ask.what-would-you-need-from-me-to-run-the-campaign-for-office`: "What would you need from me to run the campaign for {office}?"
- `scene-talk.reply-agree.you-re-the-one-i-d-want-run-the-campaign-for-office-with-me`: "You're the one I'd want. Run the campaign for {office} with me."
- `scene-talk.reply-decline.i-need-to-keep-the-race-for-office-close-to-me-that-s-not-about-you`: "I need to keep the race for {office} close to me. That's not about you."
- `scene-talk.reply-decline.i-think-we-d-argue-too-much-to-run-the-race-for-office-together-i-d-rather-keep`: "I think we'd argue too much to run the race for {office} together. I'd rather keep the friendship."
- `scene-talk.reply-stall.let-me-think-about-who-runs-the-campaign-for-office-i-ll-know-soon`: "Let me think about who runs the campaign for {office}. I'll know soon."
- `scene-talk.follow-press.the-longer-the-campaign-for-office-goes-without-somebody-in-charge-the-more-it-c`: "The longer the campaign for {office} goes without somebody in charge, the more it costs."
- `scene-talk.follow-accept.then-i-ll-help-from-outside-you-still-have-my-vote-for-office`: "Then I'll help from outside. You still have my vote for {office}."
- `scene-talk.state-request.you-wouldn-t-have-to-start-from-nothing-for-office-i-d-sit-with-you-and-build-th`: "You wouldn't have to start from nothing for {office}. I'd sit with you and build the list."
- `scene-talk.state-request.no-one-in-the-party-has-filed-for-office-i-want-it-to-be-you`: "No one in the {party} has filed for {office}. I want it to be you."
- `scene-talk.state-request.we-re-short-a-candidate-for-office-the-party-would-stand-behind-you`: "We're short a candidate for {office}. The {party} would stand behind you."
- `scene-talk.state-request.i-d-like-to-put-your-name-forward-for-office-under-the-party-think-about-it`: "I'd like to put your name forward for {office} under the {party}. Think about it."
- `scene-talk.state-request.the-party-needs-someone-on-the-ballot-for-office-and-you-came-to-mind-first`: "The {party} needs someone on the ballot for {office}, and you came to mind first."
- `scene-talk.state-request.you-d-carry-the-race-for-office-better-than-anyone-we-have-will-you-run`: "You'd carry the race for {office} better than anyone we have. Will you run?"
- `scene-talk.reply-ask.what-does-the-party-offer-someone-who-runs-for-office`: "What does the {party} offer someone who runs for {office}?"
- `scene-talk.reply-ask.who-else-has-been-asked-about-office-and-who-said-no`: "Who else has been asked about {office}, and who said no?"
- `scene-talk.reply-agree.yes-i-ll-run-for-office-under-the-party`: "Yes. I'll run for {office} under the {party}."
- `scene-talk.reply-agree.alright-put-me-down-for-office-i-ll-make-it-count`: "Alright, put me down for {office}. I'll make it count."
- `scene-talk.reply-decline.i-m-not-ready-to-run-for-office-ask-someone-else-in-the-party`: "I'm not ready to run for {office}. Ask someone else in the {party}."
- `scene-talk.follow-thank.that-s-good-news-for-the-party-we-ll-start-on-office-tomorrow`: "That's good news for the {party}. We'll start on {office} tomorrow."
- `scene-talk.follow-press.the-filing-for-office-closes-soon-can-you-tell-me-by-then`: "The filing for {office} closes soon. Can you tell me by then?"
- `scene-talk.follow-accept.i-understand-the-offer-for-office-stays-open-until-the-filing-closes`: "I understand. The offer for {office} stays open until the filing closes."
- `scene-talk.reply-decline.i-ve-thought-about-it-and-office-is-not-for-me-this-time`: "I've thought about it, and {office} is not for me this time."
- `scene-talk.reply-decline.i-m-sorry-i-can-t-take-on-the-race-for-office-now`: "I'm sorry. I can't take on the race for {office} now."
- `scene-talk.reply-leave.i-ll-call-you-about-office-when-i-ve-decided`: "I'll call you about {office} when I've decided."
- `scene-talk.narrate-narrate.name-sits-down-at-your-kitchen-table-and-puts-a-folder-in-front-of-you`: "{name} sits down at your kitchen table and puts a folder in front of you."
- `scene-talk.narrate-narrate.name-has-a-list-of-the-seats-still-open-and-has-come-to-talk-about-office`: "{name} has a list of the seats still open and has come to talk about {office}."
- `scene-talk.follow-answer.names-to-start-the-petition-for-office-and-a-few-people-who-will-knock-on-doors`: "Names to start the petition for {office}, and a few people who will knock on doors with you."
- `scene-talk.reply-stall.give-me-a-few-days-to-think-about-office-i-want-to-talk-it-over-at-home`: "Give me a few days to think about {office}. I want to talk it over at home."
- `scene-talk.reply-stall.let-me-find-out-what-office-would-take-before-i-answer`: "Let me find out what {office} would take before I answer."
- `scene-talk.narrate-narrate.the-run-for-office-is-out-in-the-open-now-child-has-already-asked-what-it-means`: "The run for {office} is out in the open now. {child} has already asked what it means."
- `scene-talk.narrate-narrate.nobody-says-anything-until-the-pans-are-put-away-then-the-talk-about-office-star`: "Nobody says anything until the pans are put away. Then the talk about {office} starts."
- `scene-talk.state-ask.i-m-not-against-you-running-for-office-i-m-asking-who-gets-child-to-school-on-th`: "I'm not against you running for {office}. I'm asking who gets {child} to school on the days you can't."
- `scene-talk.state-ask.walk-me-through-the-weeks-ahead-where-does-child-fit-when-you-re-out-campaigning`: "Walk me through the weeks ahead. Where does {child} fit when you're out campaigning?"
- `scene-talk.state-ask.before-this-goes-any-further-who-is-taking-child-when-the-evening-events-start`: "Before this goes any further, who is taking {child} when the evening events start?"
- `scene-talk.state-ask.we-never-agreed-on-you-running-for-office-i-m-trying-to-understand-what-we-re-si`: "We never agreed on you running for {office}. I'm trying to understand what we're signing up for, with {child} in the house."
- `scene-talk.state-ask.can-we-even-afford-a-run-for-office-tell-me-how-the-bills-get-paid-while-you-cam`: "Can we even afford a run for {office}? Tell me how the bills get paid while you campaign."
- `scene-talk.state-ask.you-didn-t-say-you-were-running-for-office-until-it-was-filed-i-d-like-to-know-w`: "You didn't say you were running for {office} until it was filed. I'd like to know why."
- `scene-talk.reply-tell.i-should-have-said-so-first-i-m-running-for-office-and-i-want-to-do-it-with-you`: "I should have said so first. I'm running for {office}, and I want to do it with you."
- `scene-talk.reply-tell.i-filed-because-the-race-for-office-won-t-change-if-people-like-us-stay-home`: "I filed because the race for {office} won't change if people like us stay home."
- `scene-talk.reply-tell.i-ll-tell-you-the-whole-schedule-for-office-and-you-tell-me-where-it-breaks`: "I'll tell you the whole schedule for {office}, and you tell me where it breaks."
- `scene-talk.reply-comfort.child-comes-first-if-a-meeting-for-office-conflicts-i-ll-miss-the-meeting`: "{child} comes first. If a meeting for {office} conflicts, I'll miss the meeting."
- `scene-talk.reply-deflect.let-s-talk-about-office-after-the-plates-are-cleared-and-child-is-asleep`: "Let's talk about {office} after the plates are cleared and {child} is asleep."
- `scene-talk.follow-promise.then-i-ll-take-child-on-the-nights-you-re-out-we-ll-make-a-calendar`: "Then I'll take {child} on the nights you're out. We'll make a calendar."
- `scene-talk.follow-press.that-isn-t-an-answer-about-child-i-d-like-to-hear-one`: "That isn't an answer about {child}. I'd like to hear one."
- `scene-talk.follow-accept.alright-i-ll-be-here-when-you-re-ready-to-talk-about-office`: "Alright. I'll be here when you're ready to talk about {office}."
