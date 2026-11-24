# Pre-grade: Writer W2, local and campaign speeches (opening-speech.json)

Pre-grader, 2026-11-24. Branch `story/w-stand-close` at `45b2f2b5`, `data/english/parts/outline-local.json`, every line authored by this writer at that head (119 lines). Verdicts carry over by exact text from earlier heads; lines not judged before were read new.

- **Result:** 76 of 119 pass (64%); 43 fail.
- **Calibration:** C4 8/8, E3 8/8, F1 8/8, L1 8/8, R1 8/8, S3 8/8, V1 8/8, W1 8/8. Each reader's chunk had 8 of the owner's graded lines (4 passed, 4 rejected) planted unmarked; a chunk that missed one would have been rerun.
- **Read by:** one blind reader per chunk of about 150 lines (Opus, medium), then the Pre-grader read every verdict against `data/english/line-rules.json`, `notes-not-rules.json`, the owner's grades and `OWNER-DECISIONS.md`.
- **Played:** at `45b2f2b5` through `scripts/words/speech-sheets.ts` (the local head's address and a town member's campaign speech in its three drawn places: Rainelle, Midway, Washington County): 30 of these lines played.
- Fails quote the line and give his rule or words; no new wording is suggested.

## Play findings (whole speeches, not one line)

- "If hard times matters to you, come to the next meeting..." (Rainelle address): the verb breaks when the theme's short name is plural.
- "Do we get families in need what they qualify for sooner, or do we leave things as they are? Yes, because ..." (Midway address): "Yes" answers an either-or question.
- "I'm sure that a call for help should be answered fast. I'll be against a bigger police budget every time it comes up." (Washington County address): the reason argues for the other side.
- "Thank you, the Washington County Board of Commissioners, and thank you, Washington County." (Washington County address): "the" inside a direct address.
- "God bless Rainelle. Thank you for hearing me out, Rainelle." (Rainelle campaign): the blessing comes before the thanks, and the place is said twice.
- The addresses now run three or four short parts; whether that is long enough is the speech-has-a-core rule ("A four-line rally is not a speech").

## Failing lines by rule

### vary-the-shape (20)

- `outline-local.greeting.neighbors-and-members-of-welcome`: "Neighbors, and members of {body-name}: welcome." — Another list-of-addressees greeting; the tacked-on 'welcome' is stiff.
- `outline-local.greeting.thank-you-for-coming-out-to-hear-me`: "Thank you for coming out to hear me, {realm-bare}." — Longer twin of W1-039 with a self-regarding 'to hear me'.
- `outline-local.pledge.i-ll-defend-at-every-meeting`: "I'll defend {law-name} at every meeting." — Does the same job as W1-078; 'defend at every meeting' assumes it is attacked every meeting.
- `outline-local.today.as-things-stand-in`: "As things stand in {realm-name}, {today-clause}" — Same frame as W1-054, with stiffer 'As things stand'.
- `outline-local.stand-reason.i-m-for-repealing`: "I'm for repealing {law-name}. {belief-sentence}" — Same shape as 'I'm for keeping {law-name}. {belief-sentence}'.
- `outline-local.send-off.meets-again-soon-and-i-hope-you-ll-come-and-say-what-you-think-about`: "{body-name} meets again soon, and I hope you'll come and say what you think about {theme-short}." — Third variant of the meeting send-off, with a vague 'meets again soon'.
- `outline-local.send-off.if-you-have-a-view-on-bring-it-to-the-next-meeting-of`: "If you have a view on {theme-short}, bring it to the next meeting of {body-name}." — Same 'If ..., come/bring it to the next meeting' shape as W1-001.
- `outline-local.send-off.i-d-be-glad-to-have-your-vote-and-thank-you-for-listening`: "I'd be glad to have your vote, {realm-bare}, and thank you for listening." — Same ask as W1-085 with thanks glued on after.
- `outline-local.send-off.i-d-be-proud-to-have-your-vote-for`: "I'd be proud to have your vote for {office-title}, {realm-bare}." — Twin of W1-085.
- `outline-local.send-off.thank-you-for-hearing-me-out-i-d-like-to-be-your`: "Thank you for hearing me out, {realm-bare}. I'd like to be your {office-title}." — Twin of W1-029.
- `outline-local.greeting.and-members-of-good-to-see-you`: "{realm-bare}, and members of {body-name}: good to see you." — Names the town twice ('Groton, and members of the Groton Select Board') in another list greeting.
- `outline-local.greeting.members-of-and-residents-of`: "Members of {body-name}, and residents of {realm-name}." — Twin of W1-028.
- `outline-local.greeting.to-the-people-of-and-to`: "To the people of {realm-name}, and to {body-name}:" — Same 'To the ..., and to ...:' shape as W1-011.
- `outline-local.greeting.neighbors-in-thanks-for-giving-me-your-time`: "Neighbors in {realm-bare}, thanks for giving me your time." — Same 'Neighbors in X, thanks for ...' shape as W1-043.
- `outline-local.greeting.thank-you-for-being-here-neighbors-of`: "Thank you for being here, neighbors of {realm-name}." — Twin of W1-026 reordered.
- `outline-local.report.for-this-year-was-the-main-thing`: "For {realm-name} this year, {theme-name} was the main thing." — Same report as W1-017 in a flatter shape ('the main thing').
- `outline-local.report.we-ended-the-year-ahead-on-the-budget-so-gets-my-attention-first`: "We ended the year ahead on the budget, so {theme-name} gets my attention first." — Same budget-ahead-so-theme shape as W1-006, with a weaker 'gets my attention'.
- `outline-local.running.the-job-i-m-asking-for-is-and-i-m-asking-because-of`: "The job I'm asking for is {office-title}, and I'm asking because of {theme-name}." — Stilted double 'asking' construction; the 'because of {theme}' frame reads simulated.
- `outline-local.send-off.please-come-to-a-meeting-of-and-tell-us-how-we-re-doing-on`: "Please come to a meeting of {body-name} and tell us how we're doing on {theme-short}." — Another twin of the come-to-a-meeting send-off (W1-061).
- `outline-local.send-off.the-next-meeting-of-is-a-good-place-to-tell-us-what-you-think`: "The next meeting of {body-name} is a good place to tell us what you think." — Another meeting send-off, and it drops the theme.

### no-literary-phrasing (8)

- `outline-local.report.the-year-s-work-in-comes-down-to`: "The year's work in {realm-name} comes down to {theme-name}." — 'comes down to' says nothing concrete about the year.
- `outline-local.report.over-the-year-in-took-most-of-our-attention`: "Over the year in {realm-name}, {theme-name} took most of our attention." — 'Over the year in Groton' is awkward and the line says nothing concrete.
- `outline-local.report.if-one-subject-ran-through-the-year-in-it-was`: "If one subject ran through the year in {realm-name}, it was {theme-name}." — 'If one subject ran through the year' is visibly composed.
- `outline-local.report.of-the-year-s-work-in-is-what-i-d-point-to`: "Of the year's work in {realm-name}, {theme-name} is what I'd point to." — Inverted 'Of the year's work ..., X is what I'd point to' reads composed.
- `outline-local.report.the-year-had-a-lot-in-it-for-and-was-near-the-middle-of-it`: "The year had a lot in it for {realm-name}, and {theme-name} was near the middle of it." — 'had a lot in it ... near the middle of it' is vague composed texture, saying nothing.
- `outline-local.running.if-you-ask-why-i-want-to-be-your-my-answer-is`: "If you ask why I want to be your {office-title}, my answer is {theme-name}." — 'If you ask why ..., my answer is {theme}' is a stilted setup with a noun-phrase answer.
- `outline-local.running.running-for-i-keep-coming-back-to`: "Running for {office-title}, I keep coming back to {theme-name}." — Dangling 'Running for X, I keep coming back to' is a composed construction.
- `outline-local.send-off.thank-you-i-hope-i-ve-earned-a-hearing-for`: "Thank you, {realm-bare}. I hope I've earned a hearing for {office-title}." — 'earned a hearing for mayor' is unclear and stiff.

### reply-follows-the-line-before (3)

- `outline-local.greeting.thank-you-all-for-coming-and-thank-you`: "Thank you all for coming, and thank you, {body-name}." — 'thank you, the Groton Select Board' puts an article in direct address; ungrammatical.
- `outline-local.greeting.welcome-everyone-and-thank-you`: "Welcome, everyone, and thank you, {body-name}." — 'thank you, the Groton Select Board' (article in direct address); same shape as W1-034.
- `outline-local.send-off.thank-you-and-thank-you`: "Thank you, {body-name}, and thank you, {realm-bare}." — 'Thank you, the Groton Select Board' puts an article in direct address.

### speech-has-a-core (2)

- `outline-local.creed.my-view-is-that`: "My view is that {belief}." — A bare 'My view is that' creed: the flavorless pattern he rejected.
- `outline-local.creed.i-m-sure-that`: "I'm sure that {belief}." — Same flavorless 'I am convinced' creed pattern he rejected on Nov 23.

### plain-american-reads-stiff (2)

- `outline-local.pledge.i-won-t-stop-pressing-to-be-rid-of`: "I won't stop pressing to be rid of {law-name}." — 'pressing to be rid of' is stiff and leans British.
- `outline-local.send-off.i-d-like-your-vote-for-and-i-thank-you-for-listening`: "I'd like your vote for {office-title}, {realm-bare}, and I thank you for listening." — 'and I thank you for listening' is stiff; also a twin of the vote ask.

### fits-speaker-and-tie (2)

- `outline-local.greeting.i-m-glad-to-see-you`: "I'm glad to see you, {realm-bare}." — 'I'm glad to see you, Groton' addresses a town as a person; odd.
- `outline-local.send-off.thank-you-for-the-year`: "Thank you for the year, {realm-bare}." — 'Thank you for the year' is an odd thing for a mayor to say to a town.

### no-pointing-at-the-unnamed (1)

- `outline-local.pledge.my-name-won-t-go-on`: "My name won't go on {about}." — Unclear what the name goes on; reads as a turn of phrase, and a mayor may not sign it.

### stance-is-plainly-for-or-against (1)

- `outline-local.stand.i-m-for-and-i-ll-back-it`: "I'm for {about}, and I'll back it." — Redundant 'I'm for it, and I'll back it' says the stand twice with no reason.

### never-offer-what-the-player-cannot-do (1)

- `outline-local.stand.i-m-against-and-i-d-vote-no`: "I'm against {about}, and I'd vote no." — A mayor often has no vote, and 'I'm ... I'd' mixes tenses.

### "Because I am convinced... reads like a shitty simulated sentence" (1)

- `outline-local.stand.i-disagree-with-that-because`: "I disagree with that, because {belief}." — 'because {belief}' glued onto a stock clause is the rejected slotted pattern.

### every-line-gives-its-context (1)

- `outline-local.contrast.others-would-rather`: "Others would rather {other-side}." — 'Others' with no 'some' before it leans on nothing.

### address-no-capital-after-comma (1)

- `outline-local.greeting.residents-and-guests-welcome`: "{body-name}, residents, and guests: welcome." — Opens 'The Groton Select Board, residents, and guests:' with a stray article; awkward list.

## As played

- pass: `outline-local.greeting.members-of-department-heads-and-neighbors` → **the local head's address, 2409400, seed eb7bf596, part 1** Members of the Washington County Board of Commissioners, department heads and neighbors. If one subject ran through the year in Washington County, it was how we keep people safe and treat them fairly.
- pass: `outline-local.greeting.neighbors-across-and-members-of` → **the local head's address, 5466652, seed 2f25fb7e, part 1** Neighbors across Rainelle, and members of the Rainelle City Council. The year's work in Rainelle comes down to how we help people through hard times.
- pass: `outline-local.greeting.neighbors-across-thank-you-for-coming-out` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 1** Neighbors across Rainelle, thank you for coming out. What brought me into this race for council member is our land and water.
- pass: `outline-local.greeting.neighbors-in-thanks-for-coming` → **a town member's campaign speech, 2409400, seed eb7bf596, part 1** Neighbors in Washington County, thanks for coming. I'm asking for your vote for commissioner, and the cost of a place to live is what I'd work on.
- fail: `outline-local.report.the-year-s-work-in-comes-down-to` → **the local head's address, 5466652, seed 2f25fb7e, part 1** Neighbors across Rainelle, and members of the Rainelle City Council. The year's work in Rainelle comes down to how we help people through hard times.
- pass: `outline-local.running.what-brought-me-into-this-race-for-is` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 1** Neighbors across Rainelle, thank you for coming out. What brought me into this race for council member is our land and water.
- fail: `outline-local.creed.my-view-is-that` → **a town member's campaign speech, 2409400, seed eb7bf596, part 2** My view is that builders build more homes when the rules don't make them lose money. My name won't go on an affordable-housing requirement for new buildings.
- fail: `outline-local.creed.i-m-sure-that` → **the local head's address, 2409400, seed eb7bf596, part 3** I'm sure that a call for help should be answered fast. I'll be against a bigger police budget every time it comes up.
- fail: `outline-local.pledge.my-name-won-t-go-on` → **a town member's campaign speech, 2409400, seed eb7bf596, part 2** My view is that builders build more homes when the rules don't make them lose money. My name won't go on an affordable-housing requirement for new buildings.
- pass: `outline-local.pledge.i-ll-be-against-every-time-it-comes-up` → **the local head's address, 2409400, seed eb7bf596, part 3** I'm sure that a call for help should be answered fast. I'll be against a bigger police budget every time it comes up.
- pass: `outline-local.today.here-in` → **a town member's campaign speech, 4949820, seed af873500, part 2** Here in Midway, eviction court works the way it always has, between the two sides. I'm against a lawyer for tenants facing eviction, and I'd vote no.
- fail: `outline-local.stand.i-m-against-and-i-d-vote-no` → **a town member's campaign speech, 4949820, seed af873500, part 2** Here in Midway, eviction court works the way it always has, between the two sides. I'm against a lawyer for tenants facing eviction, and I'd vote no.
- pass: `outline-local.question.do-we-or-do-we-leave-things-as-they-are` → **the local head's address, 4949820, seed af873500, part 2** Do we get families in need what they qualify for sooner, or do we leave things as they are? Yes, because a family in trouble shouldn't wait weeks for aid it qualifies for.
- pass: `outline-local.question.is-it-time-to` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 2** Is it time to do more to care for our creeks and woods? Yes, because clean water is cheaper to keep than to win back.
- pass: `outline-local.answer.no-because` → **the local head's address, 2409400, seed eb7bf596, part 2** Is it time to give civilians oversight of the police? No, because an officer should be judged by people who have done the job.
- pass: `outline-local.answer.i-wouldn-t-since` → **a town member's campaign speech, 4949820, seed af873500, part 3** Is it time to allow apartments in single-family zones? I wouldn't, since the people who bought into a neighborhood should shape it.
- pass: `outline-local.answer.yes-because` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 2** Is it time to do more to care for our creeks and woods? Yes, because clean water is cheaper to keep than to win back.
- pass: `outline-local.stand-reason.to-me-comes-down-to-this` → **the local head's address, 5466652, seed 2f25fb7e, part 2** To me, more assistance spending comes down to this: a family in trouble shouldn't wait weeks for aid it qualifies for.
- fail: `outline-local.send-off.thank-you-for-hearing-me-out-i-d-like-to-be-your` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 3** God bless Rainelle. Thank you for hearing me out, Rainelle. I'd like to be your council member.
- pass: `outline-local.blessing.thank-you` → **the governor's address, 4949820, seed af873500, part 3** Thank you.
- pass: `outline-local.blessing.thank-you-all` → **the local head's address, 4949820, seed af873500, part 3** Thank you all.
- pass: `outline-local.blessing.god-bless` → **the governor's address, 5466652, seed 2f25fb7e, part 3** God bless West Virginia.
- fail: `outline-local.greeting.residents-and-guests-welcome` → **the local head's address, 4949820, seed af873500, part 1** The Midway City Council, residents, and guests: welcome. We ended the year ahead on the budget, so how we help people through hard times gets my attention first.
- fail: `outline-local.report.if-one-subject-ran-through-the-year-in-it-was` → **the local head's address, 2409400, seed eb7bf596, part 1** Members of the Washington County Board of Commissioners, department heads and neighbors. If one subject ran through the year in Washington County, it was how we keep people safe and treat them fairly.
- fail: `outline-local.report.we-ended-the-year-ahead-on-the-budget-so-gets-my-attention-first` → **the local head's address, 4949820, seed af873500, part 1** The Midway City Council, residents, and guests: welcome. We ended the year ahead on the budget, so how we help people through hard times gets my attention first.
- fail: `outline-local.running.the-job-i-m-asking-for-is-and-i-m-asking-because-of` → **a town member's campaign speech, 4949820, seed af873500, part 1** Neighbors across Midway, thank you for coming out. The job I'm asking for is council member, and I'm asking because of the cost of a place to live.
- pass: `outline-local.running.i-m-asking-for-your-vote-for-and-is-what-i-d-work-on` → **a town member's campaign speech, 2409400, seed eb7bf596, part 1** Neighbors in Washington County, thanks for coming. I'm asking for your vote for commissioner, and the cost of a place to live is what I'd work on.
- pass: `outline-local.send-off.if-matters-to-you-come-to-the-next-meeting-of` → **the local head's address, 5466652, seed 2f25fb7e, part 3** If hard times matters to you, come to the next meeting of the Rainelle City Council. God bless Rainelle.
- fail: `outline-local.send-off.thank-you-and-thank-you` → **the local head's address, 2409400, seed eb7bf596, part 4** Thank you all. Thank you, the Washington County Board of Commissioners, and thank you, Washington County.
- pass: `outline-local.send-off.if-you-vote-for-me-i-ll-work-for-you-as-your` → **a town member's campaign speech, 4949820, seed af873500, part 4** If you vote for me, Midway, I'll work for you as your council member.

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
- `outline-local.question.do-we-or-do-we-leave-things-as-they-are`: "Do we {to}, or do we leave things as they are?"
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
- `outline-local.blessing.thank-you`: "Thank you."
- `outline-local.blessing.thank-you-all`: "Thank you all."
- `outline-local.blessing.god-bless`: "God bless {realm-name}."
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
