# Pre-grade: Writer W2, local and campaign speeches (opening-speech.json)

Pre-grader, 2026-11-24. Branch `story/w-stand-close` at `97544448`, `data/english/parts/outline-local.json`, every line authored by this writer at that head (159 lines). Verdicts carry over by exact text from earlier heads; lines not judged before were read new.

- **Result:** 155 of 159 pass (97%); 4 fail.
- **Calibration:** C4 8/8, E3 8/8, F1 8/8, MA 8/8, MB 8/8, NB 8/8, NC 8/8, ND 8/8, PA 8/8, R1 8/8, S3 8/8, V1 8/8, W1 8/8. Each reader's chunk had 8 of the owner's graded lines (4 passed, 4 rejected) planted unmarked; a chunk that missed one would have been rerun.
- **Read by:** one blind reader per chunk of about 150 lines (Opus, medium), then the Pre-grader read every verdict against `data/english/line-rules.json`, `notes-not-rules.json`, the owner's grades and `OWNER-DECISIONS.md`.
- **Played:** at `97544448` through `scripts/words/speech-sheets.ts` (the local head's address and a town member's campaign speech in its three drawn places: Rainelle, Midway, Washington County): 33 of these lines played.
- Fails quote the line and give his rule or words; no new wording is suggested.

## Play findings (whole speeches, not one line)

- "Thank you all. the Washington County Board of Commissioners and I have work to do on public safety." (Washington County address): {body-name} carries a lowercase "the" at the start of a sentence.
- "Thank you to the Rainelle City Council, ... Much of what the Rainelle City Council took up this year..." (Rainelle address): the body's full name twice in one paragraph.
- "Please vote." (Washington County campaign): the whole send-off; curt for a closing.

## A correction to this file's earlier reads

The Pre-grader's sheets for W2's outline-local lines (chunks V1, W1, NB, NC, PA, ND) described {realm-name} as "the state"; in outline-local it is the town or county. Only two verdicts cited it: ND-026 is overruled to pass (it failed on that alone), and PA-080 keeps its fail on its other reason (it announces skipping the formalities).

## Failing lines by rule

### one-idea-to-a-sentence (1)

- `outline-local.running.i-d-like-to-be-your-and-i-care-a-lot-about`: "I'd like to be your {office-title}, and I care a lot about {theme-name}." — Two clauses glued at a comma, and "I care a lot about" takes no stand; same shape as ND-007.

### awkward / vary-the-shape (1)

- `outline-local.running.i-think-deserves-more-from-your-and-i-d-give-it`: "I think {theme-name} deserves more from your {office-title}, and I'd give it." — "And I'd give it" is an awkward pronoun ending, and it repeats ND-036's knock on the sitting officeholder.

### awkward / false for its facts (1)

- `outline-local.running.your-should-be-paying-attention-to-i-would`: "Your {office-title} should be paying attention to {theme-name}. I would." — "I would." is a clipped tag, and it implies the sitting officeholder is not paying attention when the row does not require a challenger.

### no-stock-phrases (1)

- `outline-local.running.i-d-bring-to-the-table-as-your-and-i-d-keep-it-there`: "I'd bring {theme-name} to the table as your {office-title}, and I'd keep it there." — "Bring it to the table... keep it there" is a stock political turn that says nothing about what he would do.

## As played

- pass: `outline-local.running.before-you-decide-on-your-hear-me-out-on` → **a town member's campaign speech, 2409400, seed eb7bf596, part 1** Friends and neighbors of Washington County, thank you. Before you decide on your commissioner, hear me out on the cost of a place to live.
- pass: `outline-local.running.i-m-running-for-to-do-something-about` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 1** Rainelle, thank you for being here. I'm running for council member to do something about our land and water.
- pass: `outline-local.creed.i-ve-held-the-view-for-years-that` → **the local head's address, 2409400, seed eb7bf596, part 3** I've held the view for years that a call for help should be answered fast. I'll work to give the police department more to work with, and I won't quit at the first no.
- pass: `outline-local.pledge.i-ll-work-to-and-i-won-t-quit-at-the-first-no` → **the local head's address, 2409400, seed eb7bf596, part 3** I've held the view for years that a call for help should be answered fast. I'll work to give the police department more to work with, and I won't quit at the first no.
- pass: `outline-local.pledge.i-ll-be-against-every-time-it-comes-up` → **a town member's campaign speech, 2409400, seed eb7bf596, part 2** I've held the view for years that builders build more homes when the rules don't make them lose money. I'll be against an affordable-housing requirement for new buildings every time it comes up.
- pass: `outline-local.stand.i-m-for-and-that-doesn-t-change` → **the governor's address, 5466652, seed 2f25fb7e, part 2** At the moment, the minimum wage has gone up, and so have paychecks. I'm for the higher minimum wage, and that doesn't change.
- pass: `outline-local.stand.i-see-it-the-other-way` → **the governor's address, 4949820, seed af873500, part 3** Not everyone agrees. Some would build public broadband. I see it the other way. Government shouldn't compete with the companies already building internet lines.
- pass: `outline-local.question.is-it-time-to` → **the local head's address, 4949820, seed af873500, part 2** Is it time to get families in need what they qualify for sooner? Yes, because a family in trouble shouldn't wait weeks for aid it qualifies for.
- pass: `outline-local.question.is-this-the-year-we` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 2** Is this the year we do more to care for our creeks and woods? Yes, because clean water is cheaper to keep than to win back.
- pass: `outline-local.answer.no-because` → **the local head's address, 2409400, seed eb7bf596, part 2** Is it time to give civilians oversight of the police? No, because an officer should be judged by people who have done the job.
- pass: `outline-local.answer.i-wouldn-t-since` → **a town member's campaign speech, 4949820, seed af873500, part 3** Is it time to allow apartments in single-family zones? I wouldn't, since the people who bought into a neighborhood should shape it.
- pass: `outline-local.answer.yes-because` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 2** Is this the year we do more to care for our creeks and woods? Yes, because clean water is cheaper to keep than to win back.
- pass: `outline-local.stand-reason.to-me-comes-down-to-this` → **the local head's address, 5466652, seed 2f25fb7e, part 2** To me, more assistance spending comes down to this: a family in trouble shouldn't wait weeks for aid it qualifies for.
- pass: `outline-local.stand-reason.i-m-for-keeping` → **the governor's address, 2409400, seed eb7bf596, part 4** I'm for keeping the photo ID law. No citizen should be turned away from the polls for lacking the right card.
- pass: `outline-local.send-off.i-d-be-proud-to-speak-for-as-your` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 3** I'd be proud to speak for Rainelle as your council member.
- pass: `outline-local.greeting.thank-you-for-being-here` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 1** Rainelle, thank you for being here. I'm running for council member to do something about our land and water.
- pass: `outline-local.greeting.friends-and-neighbors-of-thank-you` → **a town member's campaign speech, 2409400, seed eb7bf596, part 1** Friends and neighbors of Washington County, thank you. Before you decide on your commissioner, hear me out on the cost of a place to live.
- pass: `outline-local.report.as-i-spent-a-good-part-of-this-year-on` → **the local head's address, 4949820, seed af873500, part 1** Good evening, members of the Midway City Council, and neighbors. As mayor, I spent a good part of this year on how we help people through hard times.
- pass: `outline-local.send-off.thank-you-for-the-work-you-do-for-all-of-you` → **the local head's address, 5466652, seed 2f25fb7e, part 3** Thank you for the work you do for Rainelle, all of you.
- pass: `outline-local.stand.i-m-for` → **the governor's address, 5466652, seed 2f25fb7e, part 2** At the moment, the minimum wage has gone up, and so have paychecks. I'm for the higher minimum wage, and that doesn't change.
- pass: `outline-local.stand.i-m-against` → **a town member's campaign speech, 4949820, seed af873500, part 2** Today, eviction court works the way it always has, between the two sides. I'm against a lawyer for tenants facing eviction.
- pass: `outline-local.today.today` → **a town member's campaign speech, 4949820, seed af873500, part 2** Today, eviction court works the way it always has, between the two sides. I'm against a lawyer for tenants facing eviction.
- pass: `outline-local.greeting.good-evening-members-of-and-neighbors` → **the local head's address, 4949820, seed af873500, part 1** Good evening, members of the Midway City Council, and neighbors. As mayor, I spent a good part of this year on how we help people through hard times.
- pass: `outline-local.send-off.thank-you-all-and-i-have-work-to-do-on` → **the local head's address, 2409400, seed eb7bf596, part 4** Thank you all. the Washington County Board of Commissioners and I have work to do on public safety.
- pass: `outline-local.greeting.thank-you-to-to-the-staff-and-to-everyone-from` → **the local head's address, 5466652, seed 2f25fb7e, part 1** Thank you to the Rainelle City Council, to the staff, and to everyone from Rainelle. Much of what the Rainelle City Council took up this year had to do with how we help people through hard times.
- pass: `outline-local.greeting.the-people-of-and-members-of-thank-you-for-coming` → **the local head's address, 2409400, seed eb7bf596, part 1** The people of Washington County, and members of the Washington County Board of Commissioners: thank you for coming. The Washington County Board of Commissioners and I spent a lot of the year on how we keep people safe and treat them fairly
- pass: `outline-local.send-off.please-vote` → **a town member's campaign speech, 2409400, seed eb7bf596, part 3** Please vote.
- pass: `outline-local.send-off.will-you-vote-for-me-i-d-be-grateful` → **a town member's campaign speech, 4949820, seed af873500, part 4** Will you vote for me, Midway? I'd be grateful.
- pass: `outline-local.send-off.thank-you-all` → **the local head's address, 2409400, seed eb7bf596, part 4** Thank you all. the Washington County Board of Commissioners and I have work to do on public safety.
- pass: `outline-local.greeting.hello-neighbors` → **a town member's campaign speech, 4949820, seed af873500, part 1** Hello, neighbors. Your council member should be paying attention to the cost of a place to live. I would.
- fail: `outline-local.running.your-should-be-paying-attention-to-i-would` → **a town member's campaign speech, 4949820, seed af873500, part 1** Hello, neighbors. Your council member should be paying attention to the cost of a place to live. I would.
- pass: `outline-local.report.and-i-spent-a-lot-of-the-year-on` → **the local head's address, 2409400, seed eb7bf596, part 1** The people of Washington County, and members of the Washington County Board of Commissioners: thank you for coming. The Washington County Board of Commissioners and I spent a lot of the year on how we keep people safe and treat them fairly
- pass: `outline-local.report.much-of-what-took-up-this-year-had-to-do-with` → **the local head's address, 5466652, seed 2f25fb7e, part 1** Thank you to the Rainelle City Council, to the staff, and to everyone from Rainelle. Much of what the Rainelle City Council took up this year had to do with how we help people through hard times.

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
- `outline-local.send-off.you-ll-have-a-choice-for-and-i-hope-you-ll-think-of-me`: "You'll have a choice for {office-title}, {realm-bare}, and I hope you'll think of me."
- `outline-local.send-off.i-d-like-to-be-the-you-can-call-when-something-goes-wrong`: "I'd like to be the {office-title} you can call when something goes wrong, {realm-bare}."
- `outline-local.send-off.as-i-d-answer-to-you-first`: "As {office-title}, I'd answer to you first, {realm-bare}."
- `outline-local.greeting.members-of-and-the-people-of-they-serve`: "Members of {body-name}, and the people of {realm-name} they serve."
- `outline-local.greeting.the-people-of-and-members-of-thank-you-for-coming`: "The people of {realm-name}, and members of {body-name}: thank you for coming."
- `outline-local.send-off.thanks-for-letting-me-speak-on`: "Thanks for letting me speak on {theme-short}, {realm-bare}."
- `outline-local.send-off.ask-around-about-me-and-decide-for-yourself`: "Ask around about me, {realm-bare}, and decide for yourself."
- `outline-local.send-off.you-ve-heard-a-lot-from-me-now-i-d-like-to-hear-from-you`: "You've heard a lot from me, {realm-bare}; now I'd like to hear from you."
- `outline-local.greeting.you-didn-t-have-to-come-out-for-this-and-i-m-glad-you-did`: "You didn't have to come out for this, {realm-bare}, and I'm glad you did."
- `outline-local.greeting.thank-you-members-of-and-thank-you-to-everyone-from`: "Thank you, members of {body-name}, and thank you to everyone from {realm-name}."
- `outline-local.greeting.i-m-glad-to-be-asking-for-your-vote-in-person`: "{realm-name}, I'm glad to be asking for your vote in person."
- `outline-local.send-off.please-vote`: "Please vote."
- `outline-local.send-off.will-you-vote-for-me-i-d-be-grateful`: "Will you vote for me, {realm-bare}? I'd be grateful."
- `outline-local.send-off.thank-you-all`: "Thank you all."
- `outline-local.send-off.you-know-where-to-find-me`: "You know where to find me, {realm-bare}."
- `outline-local.greeting.welcome-everyone`: "Welcome, everyone."
- `outline-local.greeting.hello-everyone`: "Hello, everyone."
- `outline-local.greeting.hello-neighbors`: "Hello, neighbors."
- `outline-local.greeting.hi-everyone`: "Hi, everyone."
- `outline-local.running.as-i-d-start-by-working-on`: "As {office-title}, I'd start by working on {theme-name}."
- `outline-local.running.as-i-d-make-a-priority`: "As {office-title}, I'd make {theme-name} a priority."
- `outline-local.running.i-m-running-so-that-gets-a-fair-hearing-from-your`: "I'm running so that {theme-name} gets a fair hearing from your {office-title}."
- `outline-local.running.ask-yourself-what-your-has-done-on-i-d-do-more`: "Ask yourself what your {office-title} has done on {theme-name}. I'd do more."
- `outline-local.running.as-your-i-ve-worked-on-and-i-want-to-finish-the-job`: "As your {office-title}, I've worked on {theme-name}, and I want to finish the job."
- `outline-local.report.spent-a-good-part-of-the-year-working-on`: "{realm-name} spent a good part of the year working on {theme-name}."
- `outline-local.report.as-i-saw-come-up-again-and-again-this-year`: "As {office-title}, I saw {theme-name} come up again and again this year."
- `outline-local.report.the-subject-that-kept-coming-up-at-this-year-was`: "The subject that kept coming up at {body-name} this year was {theme-name}."
- `outline-local.report.and-i-spent-a-lot-of-the-year-on`: "{body-name} and I spent a lot of the year on {theme-name}."
- `outline-local.report.much-of-what-took-up-this-year-had-to-do-with`: "Much of what {body-name} took up this year had to do with {theme-name}."
