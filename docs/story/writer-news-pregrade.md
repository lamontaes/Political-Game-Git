# Pre-grade: Writer news

Pre-grader, 2026-11-24. Branch `story/w-news` at `1e56d9ed`, every line authored by this writer at that head (347 lines). Verdicts carry over by exact text from earlier heads; lines not judged before were read new.

- **Result:** 225 of 347 pass (65%); 122 fail.
- **Calibration:** C2 8/8, C3 8/8, D3 8/8, E2 8/8. Each reader's chunk had 8 of the owner's graded lines (4 passed, 4 rejected) planted unmarked; a chunk that missed one would have been rerun.
- **Read by:** one blind reader per chunk of about 150 lines (Opus, medium), then the Pre-grader read every verdict against `data/english/line-rules.json`, `notes-not-rules.json`, the owner's grades and `OWNER-DECISIONS.md`.
- **Played:** the six-place packet at this head is not in yet; lines were read as written.
- Fails quote the line and give his rule or words; no new wording is suggested.

## Failing lines by rule

### awkward (28)

- `outline-news.lede.news-roll-call-members-of-the-said-no-on-to`: "Members of the {body} said no on {date} to {law}, {count}." — 'Said no on June 4 to the ordinance' splits the verb from its object; no reporter orders it that way.
- `outline-news.lede.news-roll-call-with-the-count-at-on-failed-in-the`: "With the count at {count} on {date}, {law} failed in the {body}." — 'With the count at 3 to 2' reads like a running tally, not a finished vote.
- `outline-news.margin.news-roll-call-every-member-of-the-who-voted-voted-for`: "Every member of the {body} who voted, voted for {law}." — 'Who voted, voted for' puts a comma between subject and verb and reads clumsy.
- `outline-news.margin.news-roll-call-not-a-single-yes-vote-came-for-in-the`: "Not a single yes vote came for {law} in the {body}." — 'Not a single yes vote came for' is not how anyone says it.
- `outline-news.headline.news-roll-call-headline-vote-carries-in-the`: "Vote carries {law} in the {body}" — A vote does not 'carry' a bill; the bill carries.
- `outline-news.headline.news-roll-call-headline-in-the-carries-by-one-vote`: "In the {body}, {law} carries by one vote" — Fronting 'In the council' turns the headline backward.
- `outline-news.headline.news-roll-call-headline-in-the-loses-by-one-vote`: "In the {body}, {law} loses by one vote" — The same backward 'In the council,' opening as C3-041.
- `outline-news.lede.news-roll-call-a-no-for-came-from-the-on`: "A no for {law} came from the {body} on {date}, {count}." — 'A no for the ordinance came from the council' is roundabout and not how a reporter writes.
- `outline-news.margin.news-roll-call-a-result-leaves-the-no-room-to-spare`: "A {count} result leaves the {body} no room to spare." — After a finished vote, 'leaves the council no room to spare' makes no sense, and '3 to 2 result' needs to be '3-2'.
- `outline-news.margin.news-roll-call-just-one-of-the-members-of-the-did-not-go-along-with`: "Just one of the members of the {body} did not go along with {law}." — 'Just one of the members of the' is padded, and 'go along with' is loose for a vote.
- `outline-news.margin.news-roll-call-just-one-of-the-members-of-the-was-willing-to-go-along-with`: "Just one of the members of the {body} was willing to go along with {law}." — Padded 'just one of the members of the', the same fault as C3-058.
- `outline-news.margin.news-roll-call-there-was-no-vote-against-in-the-from-anyone`: "There was no vote against {law} in the {body}, from anyone." — The tacked-on 'from anyone' reads clumsy.
- `outline-news.margin.news-roll-call-there-was-no-vote-for-in-the-from-anyone`: "There was no vote for {law} in the {body}, from anyone." — The same clumsy 'from anyone' tail as C3-070.
- `outline-news.headline.news-roll-call-headline-wins-the`: "{law} wins the {body}" — A bill does not 'win the council'.
- `outline-news.headline.news-roll-call-headline-loses-the`: "{law} loses the {body}" — A bill does not 'lose the council'.
- `outline-news.lede.news-roll-call-a-majority-of-the-backed-on-by`: "A majority of the {body} backed {law} on {date}, by {count}." — 'A majority backed it by 3 to 2' is redundant and is not how an American paper gives a count.
- `outline-news.lede.news-address-took-office-on-as-an-opponent-of-and-said-so`: "{name} took office on {date} as an opponent of {about}, and said so." — The tacked-on 'and said so' after 'took office as an opponent' reads stiff and AI-built.
- `outline-news.lede.news-address-drew-a-no-from-on-the-day-of-the-oath`: "{about} drew a no from {name} on {date}, the day of the oath." — Opening on the subject 'drew a no from' is an unnatural, AI-sounding turn for a news lede.
- `outline-news.lede.news-address-backs-and-said-so-on-the-day-of-the-oath`: "{name} backs {about}, and said so on {date}, the day of the oath." — Present 'backs' then past 'said so' with a trailing 'the day of the oath' reads clumsy.
- `outline-news.lede.news-address-took-office-on-as-a-supporter-of-and-the-address-said-so`: "{name} took office on {date} as a supporter of {about}, and the address said so." — 'And the address said so' is a stiff tag that has the address speaking instead of the president.
- `outline-news.lede.news-address-is-what-wants-the-new-president-said-on-the-day-of-the-oath`: "{about} is what {name} wants, the new president said on {date}, the day of the oath." — Inverted '{about} is what {name} wants, the new president said' has him quoted about himself in the third person.
- `outline-news.headline.news-address-headline-meets-a-no-from`: "{about} meets a no from {surname}" — 'Meets a no from' is an unnatural, AI-sounding construction.
- `outline-news.headline.news-address-headline-no-from-the-new-president-on`: "No from the new president on {about}" — 'No from the new president on' is a stilted fragment.
- `outline-news.headline.news-address-headline-finds-a-backer-in-before-the-house-and-senate`: "{about} finds a backer in {surname} before the House and Senate" — 'Finds a backer in ... before the House and Senate' is stiff and literary.
- `outline-news.lede.news-roll-call-died-on-the-floor-of-the-on`: "{law} died on the floor of the {body} on {date}, {count}." — 'Died on the floor of the county board' misuses a legislature idiom for a local board.
- `outline-news.lede.news-roll-call-where-stood-on-was-with-the-behind-it`: "Where {law} stood on {date}, {count}, was with the {body} behind it." — Garbled 'Where {law} stood... was with the {body} behind it' does not read as English.
- `outline-news.lede.news-roll-call-where-stood-on-was-without-the-behind-it`: "Where {law} stood on {date}, {count}, was without the {body} behind it." — Garbled 'was without the {body} behind it', same broken shape as 089.
- `outline-news.headline.news-address-headline-gives-the-new-administration-s-support`: "{surname} gives {about} the new administration's support" — 'Gives {about} the new administration's support' is stiff and wordy for a headline.

### plain-american-reads-stiff (15)

- `news.law.the-rules-under-the-law-came-into-effect-in-place-on-date`: "The rules under the {law} came into effect in {place} on {date}." — 'The rules under the law came into effect' is stiff and roundabout; a paper says the law took effect.
- `news.law.what-the-law-requires-now-applies-in-place-as-of-date`: "What the {law} requires now applies in {place}, as of {date}." — 'What the law requires now applies..., as of {date}' is stiff, roundabout and AI-sounding.
- `news.conditions.the-share-of-place-workers-without-a-job-climbed-to-percent-`: "The share of {place} workers without a job climbed to {percent}, from {from}." — 'The share of workers without a job climbed' is a stiff paraphrase of the jobless rate and not quite what the rate measures.
- `news.conditions.the-share-of-place-workers-without-a-job-dropped-to-percent-`: "The share of {place} workers without a job dropped to {percent}, from {from}." — Same stiff 'share of workers without a job' paraphrase of the jobless rate.
- `news.crime.place-had-its-ordinal-burglary-this-month-on-date`: "{place} had its {ordinal} burglary this month on {date}." — 'had its third burglary this month on {date}' piles the date on the end and reads awkwardly.
- `news.crime.vandalism-in-place-on-date-was-the-ordinal-case-this-month`: "Vandalism in {place} on {date} was the {ordinal} case this month." — 'Vandalism in {place} on {date} was the third case this month' is clumsy, stacked-phrase wording.
- `news.organization.opened.subject-in-place-is-owner-s-new-business`: "{subject}, in {place}, is {owner}'s new business." — '{subject}, in {place}, is {owner}'s new business' is stiff and comma-chopped, not how a paper writes it.
- `news.organization.opened.in-place-owner-is-the-owner-of-a-new-business-subject`: "In {place}, {owner} is the owner of a new business, {subject}." — '{owner} is the owner of a new business' is roundabout and AI-sounding.
- `news.organization.opened.subject-opened-for-business-in-industry`: "{subject} opened for business in {industry}." — 'opened for business in {industry}' reads as if the industry were a place.
- `news.organization.opened.subject-is-a-new-business-in-industry`: "{subject} is a new business in {industry}." — 'a new business in {industry}' reads as if the industry were a place; a paper says what the business does.
- `headlines.law.law-is-now-the-rule-in-place`: "{law} is now the rule in {place}" — 'is now the rule in' is awkward headline wording for a named law.
- `headlines.law.law-in-effect-in-place`: "{law}: in effect in {place}" — '{law}: in effect in {place}' is a stiff colon construction no paper prints.
- `headlines.organization.opened.subject-sets-up-in-place`: "{subject} sets up in {place}" — 'sets up in' clips the idiom 'sets up shop' and reads off.
- `headlines.crime.person-robbed-in-place`: "Person robbed in {place}" — 'Person robbed' is police-report wording; a paper would not say 'Person'.
- `headlines.crime.person-attacked-in-place`: "Person attacked in {place}" — 'Person attacked' is police-report wording; a paper would not say 'Person'.

### no-literary-phrasing (12)

- `outline-news.lede.news-address-against-that-was-where-planted-a-flag-after-being-sworn-in-on`: "Against {about}: that was where {name} planted a flag after being sworn in on {date}." — "Planted a flag" plus the fronted "Against X:" is composed, literary texture.
- `outline-news.lede.news-address-got-a-friend-in-the-white-house-on-when-took-office`: "{about} got a friend in the White House on {date}, when {name} took office." — "Got a friend in the White House" personifies the policy, the same cute inverted shape as C2-050.
- `outline-news.margin.news-roll-call-had-a-single-friend-in-the`: "{law} had a single friend in the {body}." — Calling a council member the bill's 'friend' is a cute figure of speech, not news.
- `outline-news.margin.news-roll-call-had-no-friend-in-the`: "{law} had no friend in the {body}." — 'Had no friend' is the same cute figure as C3-020.
- `outline-news.margin.news-roll-call-only-one-voice-in-the-was-raised-against-and-it-was-outvoted`: "Only one voice in the {body} was raised against {law}, and it was outvoted." — 'Voice was raised' claims someone spoke, which the vote record does not show, and 'outvoted' only restates the result.
- `outline-news.margin.news-roll-call-only-one-voice-in-the-was-raised-for-and-it-was-outvoted`: "Only one voice in the {body} was raised for {law}, and it was outvoted." — 'Voice was raised' is the same unsupported figure as C3-057.
- `news.law.on-date-the-law-became-part-of-life-in-place`: "On {date}, the {law} became part of life in {place}." — 'became part of life in' is a composed, literary turn, not how a paper reports a law taking effect.
- `news.law.date-was-the-first-day-of-the-law-in-place`: "{date} was the first day of the {law} in {place}." — '{date} was the first day of the {law}' is an awkward framing; a law does not have a first day in plain news copy.
- `news.law.since-date-the-law-has-stood-in-place-of-the-old-rule-in-pla`: "Since {date}, the {law} has stood in place of the old rule in {place}." — 'has stood in place of the old rule' is literary and vague about what the old rule was.
- `headlines.law.law-takes-hold-in-place`: "{law} takes hold in {place}" — 'takes hold' is a literary turn and duplicates E2-089's meaning.
- `headlines.law.place-begins-life-under-law`: "{place} begins life under {law}" — 'begins life under' is literary and ominous for a law taking effect.
- `headlines.crime.burglars-strike-place`: "Burglars strike {place}" — 'Burglars strike {place}' dramatizes one break-in as a hit on the whole town, with burglars the record may not hold.

### vary-the-shape (10)

- `outline-news.lede.news-address-found-an-opponent-in-who-took-office-on`: "{about} found an opponent in {name}, who took office on {date}." — The inverted "X found an opponent in Smith" is a roundabout personification, the same shape as C2-050, C2-081 and C2-084.
- `outline-news.lede.news-address-wants-and-said-so-on-the-day-of-the-oath`: "{name} wants {about}, and said so on {date}, the day of the oath." — Same frame as C2-057 ("... on {date}, the day of the oath"), and "wants" reads as if the measure is not yet law.
- `outline-news.lede.news-address-has-a-backer-in-who-took-office-on`: "{about} has a backer in {name}, who took office on {date}." — The inverted "X has a backer in Smith" repeats C2-045 and C2-084 and puts the policy, not the president, as the subject.
- `outline-news.headline.news-address-headline-has-a-backer-in`: "{about} has a backer in {surname}" — The same inverted "X has a backer in Smith" shape as C2-050 and C2-081; roundabout for a headline.
- `outline-news.lede.news-roll-call-was-before-the-on-and-the-members-said-yes`: "{law} was before the {body} on {date}, and the members said yes, {count}." — Flat two-clause readout ("was before ..., and the members said yes"), the same shape as C2-096.
- `outline-news.next.news-address-the-law-on-is-already-on-the-books-and-the-new-president-said-it-stays`: "The law on {about} is already on the books, and the new president said it stays." — Just repeats the lede ('it stays') and uses the 'on the books' phrasing he rejected.
- `outline-news.headline.news-address-headline-in-the-address-sets-the-administration-against`: "In the address, {surname} sets the administration against {about}" — Same shape as 057 ('puts/sets the administration against').
- `outline-news.headline.news-address-headline-is-for-and-says-so-at-the-oath`: "{surname} is for {about}, and says so at the oath" — Repeats the 'and says so' tag seen in the ledes, and it is clunky in a headline.
- `news.organization.opened.there-is-a-new-business-in-place-subject`: "There is a new business in {place}: {subject}." — 'There is a new business in {place}: {subject}' is the same line as E2-081 with a stiff colon.
- `news.organization.opened.in-place-subject-opened-its-doors`: "In {place}, {subject} opened its doors." — 'In {place}, {subject} opened its doors' is E2-079 reordered, the same shape.

### news-reads-as-a-story (9)

- `outline-news.headline.news-roll-call-headline-yes-on-in-the`: "Yes on {law} in the {body}" — A fragment with no verb; it reads as a label, not a headline.
- `outline-news.headline.news-roll-call-headline-approved-by-the`: "{law}: approved by the {body}" — A colon label like 'Ordinance: approved by the council' reads as a field list.
- `outline-news.headline.news-roll-call-headline-no-on-in-the`: "No on {law} in the {body}" — A verbless fragment, same fault as C3-030.
- `outline-news.headline.news-roll-call-headline-rejected-by-the`: "{law}: rejected by the {body}" — Colon label, same field-list fault as C3-034.
- `outline-news.headline.news-roll-call-headline-a-yes-from-the-for`: "A yes from the {body} for {law}" — A verbless fragment, not a headline.
- `outline-news.headline.news-roll-call-headline-a-yes-in-the-for`: "A yes in the {body} for {law}" — A verbless fragment, the same fault as C3-081.
- `outline-news.headline.news-roll-call-headline-a-no-from-the-for`: "A no from the {body} for {law}" — A verbless fragment, and 'a no for' reads wrong.
- `outline-news.headline.news-roll-call-headline-a-no-in-the-for`: "A no in the {body} for {law}" — A verbless fragment, the same fault as C3-087.
- `news.crime.vandals-hit-place-on-date`: "Vandals hit {place} on {date}." — 'Vandals hit {place}' overstates one case as the whole town and repeats headline E2-136 word for word as the lede.

### names-something-specific (9)

- `news.crime.a-property-crime-was-reported-in-place-on-date`: "A property crime was reported in {place} on {date}." — 'A property crime' is a record category, not what happened; a paper names what was taken or damaged.
- `news.crime.police-in-place-took-a-report-of-a-property-crime-on-date`: "Police in {place} took a report of a property crime on {date}." — 'a report of a property crime' prints the police category instead of a story.
- `news.crime.place-police-logged-a-property-crime-on-date`: "{place} police logged a property crime on {date}." — 'logged a property crime' is blotter category talk that tells the reader nothing that happened.
- `news.crime.place-police-recorded-the-ordinal-property-crime-this-month-`: "{place} police recorded the {ordinal} property crime this month on {date}." — 'recorded the third property crime' is a count of a category, not a story, and the date tacked on reads awkwardly.
- `news.crime.on-date-place-had-its-ordinal-property-crime-this-month`: "On {date}, {place} had its {ordinal} property crime this month." — 'its third property crime this month' prints a record category rather than what happened.
- `headlines.organization.opened.place-gets-a-new-business`: "{place} gets a new business" — The headline does not name the business the story is about.
- `headlines.crime.property-crime-reported-in-place`: "Property crime reported in {place}" — 'Property crime reported' prints a record category, not what happened.
- `headlines.crime.place-police-log-a-property-crime`: "{place} police log a property crime" — 'police log a property crime' is blotter category talk, not a headline.
- `headlines.crime.property-crime-hits-place`: "Property crime hits {place}" — 'Property crime hits {place}' dramatizes a bare category as a hit on the whole town.

### look-up-how-real-people-say-it (6)

- `outline-news.lede.news-address-the-new-president-spoke-against-when-the-oath-was-over-on`: "The new president, {name}, spoke against {about} when the oath was over on {date}." — "When the oath was over on January 20" is awkward; a reporter says "in the inaugural address."
- `outline-news.lede.news-address-spoke-for-when-the-oath-was-over-on`: "{name} spoke for {about} when the oath was over on {date}." — "Spoke for X when the oath was over" is awkward; a reporter says "in the inaugural address."
- `outline-news.lede.news-address-count-among-those-who-want-the-new-president-said-as-much-on`: "Count {name} among those who want {about}: the new president said as much on {date}." — "Count Smith among those who want" is a columnist's flourish, not a news lede about a new president.
- `outline-news.lede.news-address-on-stood-before-both-houses-and-turned-down`: "On {date}, {name} stood before both houses and turned down {about}." — A president in a speech doesn't "turn down" a policy; that verb is for rejecting an offer.
- `outline-news.lede.news-roll-call-yes-won-out-in-the-on-passed`: "Yes won out in the {body} on {date}: {law} passed, {count}." — "Yes won out in the council" isn't how a reporter writes a vote.
- `outline-news.lede.news-roll-call-on-the-sent-down`: "On {date} the {body} sent {law} down, {count}." — Bills are 'voted down', not 'sent down'; the idiom is wrong.

### false for its facts (6)

- `outline-news.lede.news-address-the-new-administration-will-fight-to-be-rid-of-said-on`: "The new administration will fight to be rid of {about}, {name} said on {date}." — 'Be rid of' is literary and is false on a proposal that is not yet law, which this line also plays on.
- `outline-news.next.news-address-the-president-can-speak-against-but-a-bill-would-still-need-both-chambers`: "The president can speak against {about}, but a bill would still need both chambers." — On a proposal he opposes, saying 'a bill would still need both chambers' muddles who needs what and reads as a non sequitur.
- `outline-news.voice.news-address-told-those-who-gathered-for-the-oath`: "“{quote},” {surname} told those who gathered for the oath." — It does not require the inaugural, so on a joint-session address the oath crowd is false.
- `outline-news.headline.news-address-headline-meets-a-no-from-in-the-house-and-senate`: "{about} meets a no from {surname} in the House and Senate" — 'Meets a no ... in the House and Senate' is awkward and reads as if Congress voted it down.
- `outline-news.lede.news-address-told-congress-on-that-the-new-administration-is-against`: "{name} told Congress on {date} that the new administration is against {about}." — At a joint session in a later year the administration is no longer new.
- `outline-news.lede.news-address-told-congress-on-that-the-new-administration-is-for`: "{name} told Congress on {date} that the new administration is for {about}." — At a joint session in a later year the administration is no longer new.

### one-idea-to-a-sentence (4)

- `outline-news.lede.news-address-the-new-president-is-on-the-side-of-as-the-address-on-made-clear`: "The new president, {name}, is on the side of {about}, as the address on {date} made clear." — Wordy and stiff ("is on the side of ..., as the address on ... made clear"); not how a lede reads.
- `outline-news.lede.news-roll-call-was-the-tally-when-the-took-up-on-and-it-carried`: "{count} was the tally when the {body} took up {law} on {date}, and it carried." — Backward: it leads with the tally and leaves "and it carried" to the end.
- `outline-news.lede.news-roll-call-the-had-in-front-of-it-on-and-it-did-not-pass`: "The {body} had {law} in front of it on {date}, and it did not pass, {count}." — Wordy setup with a vague 'it'; the count dangles after 'did not pass'.
- `outline-news.lede.news-roll-call-could-not-carry-the-on-and-the-vote-was`: "{law} could not carry the {body} on {date}, and the vote was {count}." — Two clauses tacked together, and 'could not carry the council' is a misused idiom.

### stance-is-plainly-for-or-against (4)

- `outline-news.lede.news-address-whoever-hoped-would-go-easy-on-heard-otherwise-on-at-the-oath`: "Whoever hoped {name} would go easy on {about} heard otherwise on {date}, at the oath." — The 'whoever hoped... heard otherwise' construction is literary and makes the reader work out the stand.
- `outline-news.lede.news-address-sworn-in-on-came-down-on-the-side-of-those-against`: "Sworn in on {date}, {name} came down on the side of those against {about}." — 'Came down on the side of those against' is roundabout where 'opposed' says it plainly.
- `outline-news.lede.news-address-supporters-of-heard-what-they-wanted-from-on`: "Supporters of {about} heard what they wanted from {name} on {date}." — Says supporters were pleased instead of saying plainly that he is for it.
- `outline-news.next.news-address-is-already-law-and-the-address-gave-no-sign-the-new-administration-would-change-that`: "{about} is already law, and the address gave no sign the new administration would change that." — Hedges with 'gave no sign' after a lede that already said he backs it, muddying the stand.

### news-comes-from-a-record (3)

- `outline-news.headline.news-address-headline-opens-the-term-with-a-push-for`: "{surname} opens the term with a push for {about}" — "A push for" a measure that is already law and that he means to keep is false; nothing is being pushed.
- `outline-news.lede.news-address-congress-heard-say-on-that-should-not-go-ahead`: "Congress heard {name} say on {date} that {about} should not go ahead." — "Should not go ahead" is false when the measure is already law; it has already gone ahead.
- `outline-news.lede.news-address-congress-heard-say-on-that-should-go-ahead`: "Congress heard {name} say on {date} that {about} should go ahead." — "Should go ahead" is false for a measure already law that he means to keep.

### literary (3)

- `outline-news.lede.news-address-taking-the-oath-on-made-plain-that-has-no-friend-in-the-new-administration`: "Taking the oath on {date}, {name} made plain that {about} has no friend in the new administration." — 'Has no friend in the new administration' is a literary turn instead of saying he opposes it.
- `outline-news.headline.news-address-headline-has-no-friend-in`: "{about} has no friend in {surname}" — 'Has no friend in' is the literary idiom instead of the plain stand.
- `outline-news.headline.news-address-headline-for-a-supporter-takes-the-oath`: "For {about}, a supporter takes the oath: {surname}" — The inverted 'For X, a supporter takes the oath: Y' is a literary turn.

### tense-of-the-record (3)

- `news.law.starting-date-the-law-is-the-rule-in-place`: "Starting {date}, the {law} is the rule in {place}." — 'Starting {date}... is the rule' mixes a future frame with a past date and 'is the rule' is awkward for a named law.
- `news.law.people-in-place-have-been-living-under-the-law-since-date`: "People in {place} have been living under the {law} since {date}." — 'have been living under' implies a stretch of time and a grim tone the effective-date record does not hold.
- `headlines.law.law-reaches-place`: "{law} reaches {place}" — 'reaches {place}' implies the law came from elsewhere, false for a law the town's own body passed.

### no-stock-phrases (2)

- `outline-news.lede.news-address-with-the-oath-taken-on-put-the-weight-of-the-office-behind`: "With the oath taken on {date}, {name} put the weight of the office behind {about}." — "Put the weight of the office behind" is a stock phrase, and "With the oath taken" is stiff.
- `outline-news.margin.news-roll-call-one-vote-separated-winners-from-losers-in-the`: "One vote separated winners from losers in the {body}." — 'Separated winners from losers' is a stock phrase and nobody 'wins' a council vote.

### false-for-facts (2)

- `outline-news.margin.news-roll-call-those-watching-the-saw-it-go-down-to-the-last-vote`: "Those watching the {body} saw it go down to the last vote, {count}." — 'Go down to the last vote' wrongly implies the deciding vote was cast last, and 'go down' misleads when the bill passed.
- `outline-news.margin.news-roll-call-it-took-every-vote-in-the-to-get-that-result`: "It took every vote in the {body} to get that result." — 'Every vote' takes in the losing side, so it does not hold together.

### every-line-gives-its-context (1)

- `outline-news.lede.news-address-used-the-oath-on-as-the-start-of-a-case-against`: "{name} used the oath on {date} as the start of a case against {about}." — He didn't use "the oath" to make a case; the address did, so the line is muddled.

### no-developer-words (1)

- `outline-news.lede.news-roll-call-when-the-voted-on-was-the-item-and-the-answer-was-yes`: "When the {body} voted on {date}, {law} was the item, and the answer was yes, {count}." — "Was the item, and the answer was yes" reads like an agenda readout, not a story.

### no-explaining (1)

- `outline-news.margin.news-roll-call-the-one-vote-against-came-from-within-the-itself`: "The one vote against {law} came from within the {body} itself." — Of course the vote came from within the body; the sentence says nothing.

### no-pointing-at-the-unnamed (1)

- `outline-news.margin.news-roll-call-all-but-one-member-of-the-went-the-other-way-on`: "All but one member of the {body} went the other way on {law}." — 'Went the other way' does not say which way.

### plain-american-spelling-and-phrasing (1)

- `news.law.the-law-came-into-force-in-place-on-date`: "The {law} came into force in {place} on {date}." — 'came into force' is British phrasing; an American paper says 'took effect'.

### no-filler (1)

- `news.organization.opened.owner-opened-subject-in-place-and-it-is-now-taking-customers`: "{owner} opened {subject} in {place}, and it is now taking customers." — 'and it is now taking customers' pads the lede with a clause that adds nothing to 'opened'.

## Passing lines

- `outline-news.headline.news-address-headline-opens-the-term-by-taking-on`: "{surname} opens the term by taking on {about}"
- `outline-news.lede.news-address-taking-office-on-told-the-country-the-new-administration-is-against`: "Taking office on {date}, {name} told the country the new administration is against {about}."
- `outline-news.lede.news-address-stood-before-congress-on-to-argue-against`: "{name} stood before Congress on {date} to argue against {about}."
- `outline-news.headline.news-roll-call-headline-falls-in-the`: "{law} falls in the {body}"
- `outline-news.headline.news-roll-call-headline-squeaks-through-the`: "{law} squeaks through the {body}"
- `outline-news.headline.news-roll-call-headline-falls-a-vote-short-in-the`: "{law} falls a vote short in the {body}"
- `outline-news.margin.news-roll-call-a-single-member-made-the-difference-in-the`: "A single member made the difference in the {body}."
- `outline-news.margin.news-roll-call-a-lone-yes-vote-was-all-could-muster-in-the`: "A lone yes vote was all {law} could muster in the {body}."
- `outline-news.margin.news-roll-call-drew-no-opposition-at-all-in-the`: "{law} drew no opposition at all in the {body}."
- `outline-news.margin.news-roll-call-no-member-of-the-cast-a-vote-for`: "No member of the {body} cast a vote for {law}."
- `outline-news.lede.news-address-the-new-administration-wants-no-part-of-made-clear-on`: "The new administration wants no part of {about}, {name} made clear on {date}."
- `outline-news.lede.news-address-there-will-be-no-help-from-the-white-house-for-said-on`: "There will be no help from the White House for {about}, {name} said on {date}."
- `outline-news.lede.news-address-is-against-and-said-so-on-the-day-of-the-oath`: "{name} is against {about}, and said so on {date}, the day of the oath."
- `outline-news.lede.news-address-sworn-in-on-had-one-thing-to-say-about-no`: "Sworn in on {date}, {name} had one thing to say about {about}: no."
- `outline-news.lede.news-address-came-out-for-on-the-day-of-the-oath`: "{name} came out for {about} on {date}, the day of the oath."
- `outline-news.lede.news-address-told-congress-on-that-is-the-wrong-course`: "{name} told Congress on {date} that {about} is the wrong course."
- `outline-news.lede.news-address-told-congress-on-that-is-the-right-course`: "{name} told Congress on {date} that {about} is the right course."
- `outline-news.lede.news-address-on-stood-before-both-houses-and-lined-up-behind`: "On {date}, {name} stood before both houses and lined up behind {about}."
- `outline-news.headline.news-address-headline-says-no-to`: "{surname} says no to {about}"
- `outline-news.headline.news-address-headline-sworn-in-warns-against`: "Sworn in, {surname} warns against {about}"
- `outline-news.headline.news-address-headline-says-yes-to`: "{surname} says yes to {about}"
- `outline-news.lede.news-roll-call-members-of-the-voted-on-and-came-out-ahead`: "Members of the {body} voted on {date}, and {law} came out ahead, {count}."
- `outline-news.lede.news-roll-call-carried-the-when-it-came-up-on`: "{law} carried the {body}, {count}, when it came up on {date}."
- `outline-news.lede.news-roll-call-will-go-forward-after-the-backed-it-on`: "{law} will go forward after the {body} backed it, {count}, on {date}."
- `outline-news.lede.news-roll-call-did-not-get-the-votes-in-the-on-the-count-was`: "{law} did not get the votes in the {body} on {date}; the count was {count}."
- `outline-news.lede.news-roll-call-when-the-members-of-the-voted-on-came-up-short`: "When the members of the {body} voted on {date}, {law} came up short, {count}."
- `outline-news.lede.news-roll-call-lost-in-the-on`: "{law} lost, {count}, in the {body} on {date}."
- `outline-news.margin.news-roll-call-it-was-as-close-as-a-vote-gets`: "It was as close as a vote gets: {count}."
- `outline-news.margin.news-roll-call-had-one-member-of-the-voted-otherwise-the-result-would-have-gone-the-other-way`: "Had one member of the {body} voted otherwise, the result would have gone the other way."
- `outline-news.margin.news-roll-call-had-a-single-opponent-in-the`: "{law} had a single opponent in the {body}."
- `outline-news.margin.news-roll-call-everyone-in-the-but-one-voted-for`: "Everyone in the {body} but one voted for {law}."
- `outline-news.margin.news-roll-call-everyone-in-the-but-one-voted-against`: "Everyone in the {body} but one voted against {law}."
- `outline-news.margin.news-roll-call-one-member-of-the-voted-yes-on-the-rest-did-not`: "One member of the {body} voted yes on {law}; the rest did not."
- `outline-news.margin.news-roll-call-had-no-opponent-in-the`: "{law} had no opponent in the {body}."
- `outline-news.margin.news-roll-call-the-was-of-one-mind-on`: "The {body} was of one mind on {law}."
- `outline-news.margin.news-roll-call-the-was-of-one-mind-against`: "The {body} was of one mind against {law}."
- `outline-news.headline.news-roll-call-headline-gets-a-yes-from-the`: "{law} gets a yes from the {body}"
- `outline-news.headline.news-roll-call-headline-the-says-yes-to`: "The {body} says yes to {law}"
- `outline-news.headline.news-roll-call-headline-gets-a-no-from-the`: "{law} gets a no from the {body}"
- `outline-news.headline.news-roll-call-headline-the-says-no-to`: "The {body} says no to {law}"
- `outline-news.headline.news-roll-call-headline-vote-sinks-in-the`: "Vote sinks {law} in the {body}"
- `outline-news.headline.news-roll-call-headline-wins-by-a-vote-in-the`: "{law} wins by a vote in the {body}"
- `outline-news.headline.news-roll-call-headline-by-one-vote-fails-in-the`: "By one vote, {law} fails in the {body}"
- `outline-news.margin.news-roll-call-one-more-vote-the-other-way-and-the-would-have-decided-differently`: "One more vote the other way, and the {body} would have decided differently."
- `outline-news.margin.news-roll-call-the-result-in-the-hung-on-a-single-member`: "The result in the {body} hung on a single member."
- `outline-news.margin.news-roll-call-with-the-vote-at-a-single-change-of-mind-would-have-flipped-it`: "With the vote at {count}, a single change of mind would have flipped it."
- `outline-news.margin.news-roll-call-nobody-in-the-could-call-that-one-a-landslide-it-was`: "Nobody in the {body} could call that one a landslide: it was {count}."
- `outline-news.margin.news-roll-call-the-split-almost-evenly-and-one-vote-decided-it`: "The {body} split almost evenly, and one vote decided it."
- `outline-news.margin.news-roll-call-drew-a-single-no-from-the`: "{law} drew a single no from the {body}."
- `outline-news.margin.news-roll-call-all-but-one-member-of-the-went-along-with`: "All but one member of the {body} went along with {law}."
- `outline-news.margin.news-roll-call-the-lone-no-on-was-not-enough-to-stop-it-in-the`: "The lone no on {law} was not enough to stop it in the {body}."
- `outline-news.margin.news-roll-call-the-lone-yes-on-was-not-enough-to-carry-it-in-the`: "The lone yes on {law} was not enough to carry it in the {body}."
- `outline-news.margin.news-roll-call-drew-a-single-yes-from-the`: "{law} drew a single yes from the {body}."
- `outline-news.margin.news-roll-call-nobody-in-the-voted-against-it`: "Nobody in the {body} voted against it."
- `outline-news.margin.news-roll-call-not-one-no-vote-was-cast-on-in-the`: "Not one no vote was cast on {law} in the {body}."
- `outline-news.margin.news-roll-call-went-through-the-without-a-single-no`: "{law} went through the {body} without a single no."
- `outline-news.margin.news-roll-call-all-the-members-who-voted-in-the-were-for`: "All the members who voted in the {body} were for {law}."
- `outline-news.margin.news-roll-call-nobody-in-the-voted-for-it`: "Nobody in the {body} voted for it."
- `outline-news.margin.news-roll-call-not-one-yes-vote-was-cast-on-in-the`: "Not one yes vote was cast on {law} in the {body}."
- `outline-news.margin.news-roll-call-went-down-in-the-without-a-single-yes`: "{law} went down in the {body} without a single yes."
- `outline-news.margin.news-roll-call-all-the-members-who-voted-in-the-were-against`: "All the members who voted in the {body} were against {law}."
- `outline-news.headline.news-roll-call-headline-approves`: "{body} approves {law}"
- `outline-news.headline.news-roll-call-headline-goes-through-the`: "{law} goes through the {body}"
- `outline-news.headline.news-roll-call-headline-adopts`: "{body} adopts {law}"
- `outline-news.headline.news-roll-call-headline-rejects`: "{body} rejects {law}"
- `outline-news.headline.news-roll-call-headline-is-turned-back-in-the`: "{law} is turned back in the {body}"
- `outline-news.headline.news-roll-call-headline-kills`: "{body} kills {law}"
- `outline-news.lede.news-address-sworn-in-on-used-the-address-to-oppose`: "Sworn in on {date}, {name} used the address to oppose {about}."
- `outline-news.lede.news-address-on-with-the-oath-barely-taken-said-the-new-administration-stands-against`: "On {date}, with the oath barely taken, {name} said the new administration stands against {about}."
- `outline-news.lede.news-address-was-sworn-in-on-and-said-the-new-administration-is-opposed-to`: "{name} was sworn in on {date} and said the new administration is opposed to {about}."
- `outline-news.lede.news-address-chose-the-day-of-the-oath-to-speak-out-against`: "{name} chose the day of the oath, {date}, to speak out against {about}."
- `outline-news.lede.news-address-on-with-the-oath-barely-taken-said-the-new-administration-stands-behind`: "On {date}, with the oath barely taken, {name} said the new administration stands behind {about}."
- `outline-news.lede.news-address-sworn-in-on-told-the-country-the-new-administration-supports`: "Sworn in on {date}, {name} told the country the new administration supports {about}."
- `outline-news.lede.news-address-in-the-address-that-followed-the-oath-on-stood-on-the-side-of`: "In the address that followed the oath on {date}, {name} stood on the side of {about}."
- `outline-news.lede.news-address-used-the-day-of-the-oath-to-speak-in-favor-of`: "{name} used the day of the oath, {date}, to speak in favor of {about}."
- `outline-news.lede.news-address-was-sworn-in-on-and-said-the-new-administration-is-for`: "{name} was sworn in on {date} and said the new administration is for {about}."
- `outline-news.lede.news-address-taking-office-on-lined-up-behind`: "Taking office on {date}, {name} lined up behind {about}."
- `outline-news.lede.news-address-took-the-oath-on-and-called-for`: "{name} took the oath on {date} and called for {about}."
- `outline-news.lede.news-address-opened-the-term-on-by-calling-for`: "{name} opened the term on {date} by calling for {about}."
- `outline-news.lede.news-address-sworn-in-on-said-the-new-administration-wants-and-will-work-for-it`: "Sworn in on {date}, {name} said the new administration wants {about} and will work for it."
- `outline-news.lede.news-address-took-the-oath-on-and-said-the-new-administration-will-keep-in-place`: "{name} took the oath on {date} and said the new administration will keep {about} in place."
- `outline-news.lede.news-address-sworn-in-on-said-will-stay-the-law-under-the-new-administration`: "Sworn in on {date}, {name} said {about} will stay the law under the new administration."
- `outline-news.lede.news-address-the-new-president-took-office-on-and-promised-to-defend`: "The new president, {name}, took office on {date} and promised to defend {about}."
- `outline-news.lede.news-address-took-the-oath-on-and-vowed-not-to-undo`: "{name} took the oath on {date} and vowed not to undo {about}."
- `outline-news.lede.news-address-stays-said-on-the-day-of-the-oath`: "{about} stays, {name} said on {date}, the day of the oath."
- `outline-news.lede.news-address-with-the-oath-taken-on-said-no-one-should-expect-the-new-administration-to-touch`: "With the oath taken on {date}, {name} said no one should expect the new administration to touch {about}."
- `outline-news.next.news-address-passing-would-take-both-chambers-of-congress-and-the-address-did-not-say-how-the-president-would-get-there`: "Passing {about} would take both chambers of Congress, and the address did not say how the president would get there."
- `outline-news.next.news-address-congress-not-the-president-alone-would-have-to-act-before-could-become-law`: "Congress, not the president alone, would have to act before {about} could become law."
- `outline-news.next.news-address-the-new-president-can-ask-for-but-only-congress-can-pass-it`: "The new president can ask for {about}, but only Congress can pass it."
- `outline-news.next.news-address-undoing-would-take-an-act-of-congress`: "Undoing {about} would take an act of Congress."
- `outline-news.next.news-address-the-president-alone-cannot-repeal-congress-would-have-to-act`: "The president alone cannot repeal {about}; Congress would have to act."
- `outline-news.next.news-address-congress-would-have-to-vote-before-could-be-undone`: "Congress would have to vote before {about} could be undone."
- `outline-news.next.news-address-nothing-in-the-address-would-change-which-is-already-law`: "Nothing in the address would change {about}, which is already law."
- `outline-news.next.news-address-stopping-would-take-more-than-the-president-s-word-congress-would-have-to-go-along`: "Stopping {about} would take more than the president's word; Congress would have to go along."
- `outline-news.voice.news-address-said-news-writer`: "“{quote},” said {surname}."
- `outline-news.voice.news-address-said-during-the-address`: "“{quote},” {surname} said during the address."
- `outline-news.voice.news-address-in-the-address-said`: "In the address, {surname} said: “{quote}”"
- `outline-news.headline.news-address-headline-takes-office-against`: "{surname} takes office against {about}"
- `outline-news.headline.news-address-headline-new-president-is-against`: "New president is against {about}"
- `outline-news.headline.news-address-headline-on-no`: "{surname} on {about}: no"
- `outline-news.headline.news-address-headline-sworn-in-speaks-against`: "Sworn in, {surname} speaks against {about}"
- `outline-news.headline.news-address-headline-opposes-in-first-address`: "{surname} opposes {about} in first address"
- `outline-news.headline.news-address-headline-puts-the-new-administration-against`: "{surname} puts the new administration against {about}"
- `outline-news.headline.news-address-headline-sworn-in-stands-behind`: "Sworn in, {surname} stands behind {about}"
- `outline-news.headline.news-address-headline-new-president-is-for`: "New president is for {about}"
- `outline-news.headline.news-address-headline-backs-in-first-address`: "{surname} backs {about} in first address"
- `outline-news.headline.news-address-headline-in-the-address-sides-with`: "In the address, {surname} sides with {about}"
- `outline-news.headline.news-address-headline-takes-office-as-a-backer-of`: "{surname} takes office as a backer of {about}"
- `outline-news.headline.news-address-headline-calls-for-on-day-one-of-the-term`: "{surname} calls for {about} on day one of the term"
- `outline-news.headline.news-address-headline-new-president-calls-for`: "New president calls for {about}"
- `outline-news.headline.news-address-headline-sworn-in-will-keep`: "{surname} sworn in, will keep {about}"
- `outline-news.headline.news-address-headline-under-stays`: "Under {surname}, {about} stays"
- `outline-news.headline.news-address-headline-before-both-houses-opposes`: "Before both houses, {surname} opposes {about}"
- `outline-news.headline.news-address-headline-tells-congress-no-on`: "{surname} tells Congress no on {about}"
- `outline-news.headline.news-address-headline-before-both-houses-backs`: "Before both houses, {surname} backs {about}"
- `outline-news.headline.news-address-headline-tells-congress-yes-on`: "{surname} tells Congress yes on {about}"
- `outline-news.lede.news-address-spoke-to-the-house-and-senate-on-as-an-opponent-of`: "{name} spoke to the House and Senate on {date} as an opponent of {about}."
- `outline-news.lede.news-address-spoke-to-the-house-and-senate-on-as-a-supporter-of`: "{name} spoke to the House and Senate on {date} as a supporter of {about}."
- `outline-news.lede.news-roll-call-passed-the-on`: "{law} passed the {body} on {date}, {count}."
- `outline-news.lede.news-roll-call-by-a-vote-of-on-the-adopted`: "By a vote of {count} on {date}, the {body} adopted {law}."
- `outline-news.lede.news-roll-call-got-through-the-on`: "{law} got through the {body} on {date}, {count}."
- `outline-news.lede.news-roll-call-failed-in-the-on`: "{law} failed in the {body} on {date}, {count}."
- `outline-news.lede.news-roll-call-by-a-vote-of-on-the-rejected`: "By a vote of {count} on {date}, the {body} rejected {law}."
- `outline-news.lede.news-roll-call-the-did-not-approve-on-the-vote-was`: "The {body} did not approve {law} on {date}; the vote was {count}."
- `outline-news.lede.news-roll-call-was-voted-down-in-the-on`: "{law} was voted down in the {body} on {date}, {count}."
- `outline-news.headline.news-address-headline-throws-support-behind`: "{surname} throws support behind {about}"
- `outline-news.headline.news-address-headline-at-the-oath-gets-behind`: "At the oath, {surname} gets behind {about}"
- `outline-news.headline.news-address-headline-gets-the-new-president-s-support`: "{about} gets the new president's support"
- `news.law.the-law-took-effect-in-place-on-date`: "The {law} took effect in {place} on {date}."
- `news.law.place-has-been-under-the-law-since-date`: "{place} has been under the {law} since {date}."
- `news.law.in-place-the-law-has-been-the-rule-since-date`: "In {place}, the {law} has been the rule since {date}."
- `news.law.the-law-took-effect-on-date-in-place-and-the-rule-it-replace`: "The {law} took effect on {date} in {place}, and the rule it replaced no longer applies."
- `news.conditions.the-jobless-rate-in-place-rose-to-percent-from-from`: "The jobless rate in {place} rose to {percent} from {from}."
- `news.conditions.more-people-in-place-are-out-of-work-the-rate-is-percent-up-`: "More people in {place} are out of work: the rate is {percent}, up from {from}."
- `news.conditions.place-is-at-percent-unemployment-up-from-from`: "{place} is at {percent} unemployment, up from {from}."
- `news.conditions.the-jobless-rate-in-place-fell-to-percent-from-from`: "The jobless rate in {place} fell to {percent} from {from}."
- `news.conditions.fewer-people-in-place-are-out-of-work-the-rate-is-percent-do`: "Fewer people in {place} are out of work: the rate is {percent}, down from {from}."
- `news.conditions.place-is-at-percent-unemployment-down-from-from`: "{place} is at {percent} unemployment, down from {from}."
- `news.conditions.break-ins-rose-in-place-this-month`: "Break-ins rose in {place} this month."
- `news.conditions.police-in-place-saw-more-break-ins-this-month-than-the-month`: "Police in {place} saw more break-ins this month than the month before."
- `news.conditions.there-were-more-burglaries-in-place-this-month`: "There were more burglaries in {place} this month."
- `news.conditions.break-ins-fell-in-place-this-month`: "Break-ins fell in {place} this month."
- `news.conditions.police-in-place-saw-fewer-break-ins-this-month-than-the-mont`: "Police in {place} saw fewer break-ins this month than the month before."
- `news.conditions.there-were-fewer-burglaries-in-place-this-month`: "There were fewer burglaries in {place} this month."
- `news.conditions.robberies-rose-in-place-this-month`: "Robberies rose in {place} this month."
- `news.conditions.place-police-saw-more-robberies-this-month-than-last`: "{place} police saw more robberies this month than last."
- `news.conditions.more-people-in-place-were-robbed-this-month`: "More people in {place} were robbed this month."
- `news.conditions.robberies-fell-in-place-this-month`: "Robberies fell in {place} this month."
- `news.conditions.place-police-saw-fewer-robberies-this-month-than-last`: "{place} police saw fewer robberies this month than last."
- `news.conditions.fewer-people-in-place-were-robbed-this-month`: "Fewer people in {place} were robbed this month."
- `news.conditions.assaults-rose-in-place-this-month`: "Assaults rose in {place} this month."
- `news.conditions.more-assaults-were-reported-in-place-this-month-than-last`: "More assaults were reported in {place} this month than last."
- `news.conditions.place-police-saw-a-rise-in-assaults-this-month`: "{place} police saw a rise in assaults this month."
- `news.conditions.assaults-fell-in-place-this-month`: "Assaults fell in {place} this month."
- `news.conditions.fewer-assaults-were-reported-in-place-this-month-than-last`: "Fewer assaults were reported in {place} this month than last."
- `news.conditions.place-police-saw-a-drop-in-assaults-this-month`: "{place} police saw a drop in assaults this month."
- `news.conditions.vandalism-rose-in-place-this-month`: "Vandalism rose in {place} this month."
- `news.conditions.more-cases-of-vandalism-were-reported-in-place-than-last-mon`: "More cases of vandalism were reported in {place} than last month."
- `news.conditions.place-police-saw-a-rise-in-vandalism-this-month`: "{place} police saw a rise in vandalism this month."
- `news.conditions.vandalism-fell-in-place-this-month`: "Vandalism fell in {place} this month."
- `news.conditions.fewer-cases-of-vandalism-were-reported-in-place-than-last-mo`: "Fewer cases of vandalism were reported in {place} than last month."
- `news.conditions.place-police-saw-a-drop-in-vandalism-this-month`: "{place} police saw a drop in vandalism this month."
- `news.crime.burglars-broke-into-a-house-in-place-on-date`: "Burglars broke into a house in {place} on {date}."
- `news.crime.a-home-in-place-was-broken-into-on-date`: "A home in {place} was broken into on {date}."
- `news.crime.a-burglary-was-reported-in-place-on-date`: "A burglary was reported in {place} on {date}."
- `news.crime.someone-broke-into-a-house-in-place-on-date`: "Someone broke into a house in {place} on {date}."
- `news.crime.on-date-a-house-in-place-was-broken-into-the-ordinal-burglar`: "On {date}, a house in {place} was broken into, the {ordinal} burglary this month."
- `news.crime.someone-vandalized-property-in-place-on-date`: "Someone vandalized property in {place} on {date}."
- `news.crime.property-in-place-was-damaged-on-date`: "Property in {place} was damaged on {date}."
- `news.crime.on-date-place-had-its-ordinal-case-of-vandalism-this-month`: "On {date}, {place} had its {ordinal} case of vandalism this month."
- `news.crime.a-robbery-was-reported-in-place-on-date`: "A robbery was reported in {place} on {date}."
- `news.crime.someone-in-place-was-robbed-on-date`: "Someone in {place} was robbed on {date}."
- `news.crime.place-police-took-a-report-of-a-robbery-on-date`: "{place} police took a report of a robbery on {date}."
- `news.crime.on-date-place-had-its-ordinal-robbery-this-month`: "On {date}, {place} had its {ordinal} robbery this month."
- `news.crime.the-robbery-in-place-on-date-was-the-ordinal-this-month`: "The robbery in {place} on {date} was the {ordinal} this month."
- `news.crime.an-assault-was-reported-in-place-on-date`: "An assault was reported in {place} on {date}."
- `news.crime.someone-in-place-was-attacked-on-date`: "Someone in {place} was attacked on {date}."
- `news.crime.place-police-took-a-report-of-an-assault-on-date`: "{place} police took a report of an assault on {date}."
- `news.crime.on-date-place-had-its-ordinal-assault-this-month`: "On {date}, {place} had its {ordinal} assault this month."
- `news.crime.the-assault-in-place-on-date-was-the-ordinal-this-month`: "The assault in {place} on {date} was the {ordinal} this month."
- `news.organization.opened.subject-opened-its-doors`: "{subject} opened its doors."
- `news.organization.opened.subject-is-open-for-business`: "{subject} is open for business."
- `news.organization.opened.subject-started-taking-customers`: "{subject} started taking customers."
- `news.organization.opened.subject-opened-its-doors-in-place`: "{subject} opened its doors in {place}."
- `news.organization.opened.place-has-a-new-business-subject`: "{place} has a new business, {subject}."
- `news.organization.opened.subject-set-up-shop-in-place`: "{subject} set up shop in {place}."
- `headlines.law.law-takes-effect-in-place`: "{law} takes effect in {place}"
- `headlines.law.place-gets-law`: "{place} gets {law}"
- `headlines.law.place-now-under-law`: "{place} now under {law}"
- `headlines.law.first-day-for-law-in-place`: "First day for {law} in {place}"
- `headlines.conditions.jobless-rate-climbs-in-place-percent`: "Jobless rate climbs in {place}: {percent}"
- `headlines.conditions.place-unemployment-up-to-percent`: "{place} unemployment up to {percent}"
- `headlines.conditions.place-unemployment-up-from-from-to-percent`: "{place} unemployment up from {from} to {percent}"
- `headlines.conditions.jobless-rate-drops-in-place-percent`: "Jobless rate drops in {place}: {percent}"
- `headlines.conditions.place-unemployment-down-to-percent`: "{place} unemployment down to {percent}"
- `headlines.conditions.place-unemployment-down-from-from-to-percent`: "{place} unemployment down from {from} to {percent}"
- `headlines.conditions.break-ins-rise-in-place`: "Break-ins rise in {place}"
- `headlines.conditions.place-sees-more-burglaries`: "{place} sees more burglaries"
- `headlines.conditions.break-ins-drop-in-place`: "Break-ins drop in {place}"
- `headlines.conditions.place-sees-fewer-burglaries`: "{place} sees fewer burglaries"
- `headlines.conditions.robberies-rise-in-place`: "Robberies rise in {place}"
- `headlines.conditions.place-sees-more-robberies`: "{place} sees more robberies"
- `headlines.conditions.robberies-drop-in-place`: "Robberies drop in {place}"
- `headlines.conditions.place-sees-fewer-robberies`: "{place} sees fewer robberies"
- `headlines.conditions.assaults-rise-in-place`: "Assaults rise in {place}"
- `headlines.conditions.place-sees-more-assaults`: "{place} sees more assaults"
- `headlines.conditions.assaults-drop-in-place`: "Assaults drop in {place}"
- `headlines.conditions.place-sees-fewer-assaults`: "{place} sees fewer assaults"
- `headlines.conditions.vandalism-rises-in-place`: "Vandalism rises in {place}"
- `headlines.conditions.place-sees-more-vandalism`: "{place} sees more vandalism"
- `headlines.conditions.vandalism-drops-in-place`: "Vandalism drops in {place}"
- `headlines.conditions.place-sees-less-vandalism`: "{place} sees less vandalism"
- `headlines.organization.opened.subject-opens-in-place`: "{subject} opens in {place}"
- `headlines.organization.opened.new-in-place-subject`: "New in {place}: {subject}"
- `headlines.organization.opened.subject-opens-its-doors`: "{subject} opens its doors"
- `headlines.organization.opened.open-for-business-subject`: "Open for business: {subject}"
- `headlines.crime.break-in-reported-in-place`: "Break-in reported in {place}"
- `headlines.crime.place-home-broken-into`: "{place} home broken into"
- `headlines.crime.place-vandalism-reported`: "{place} vandalism reported"
- `headlines.crime.vandals-hit-place`: "Vandals hit {place}"
- `headlines.crime.property-damaged-in-place`: "Property damaged in {place}"
- `headlines.crime.robbery-reported-in-place`: "Robbery reported in {place}"
- `headlines.crime.place-robbery-reported`: "{place} robbery reported"
- `headlines.crime.assault-reported-in-place`: "Assault reported in {place}"
- `headlines.crime.place-assault-reported`: "{place} assault reported"
