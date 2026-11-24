# Pre-grade: Writer W2, local and campaign speeches (opening-speech.json)

Pre-grader, 2026-11-24. Branch `story/w-stand-close` at `f8fb69bd`, every line authored by this writer at that head (48 lines). Verdicts carry over by exact text from earlier heads; lines not judged before were read new.

- **Result:** 20 of 48 pass (42%); 28 fail.
- **Calibration:** S3 8/8, V1 8/8. Each reader's chunk had 8 of the owner's graded lines (4 passed, 4 rejected) planted unmarked; a chunk that missed one would have been rerun.
- **Read by:** one blind reader per chunk of about 150 lines (Opus, medium), then the Pre-grader read every verdict against `data/english/line-rules.json`, `notes-not-rules.json`, the owner's grades and `OWNER-DECISIONS.md`.
- **Played:** the lines at `f8fb69bd`, played through scripts/words/speech-sheets.ts (the local head's address and a campaign speech in its three drawn places: Rainelle, Midway, Washington County): 6 of these lines played.
- Fails quote the line and give his rule or words; no new wording is suggested.

## Failing lines by rule

### fits-speaker-and-tie (6)

- `opening-speech.close.polished-town-address-thank-you-for-having-me-and-thank-you-to-for-the-work-this-y`: "{realm-bare}, thank you for having me, and thank you to {body-name} for the work this year." — A mayor thanking the town for 'having me' talks like a guest in their own town, and the close names nothing the speech said.
- `opening-speech.salutation.plain-campaign-speech-good-people-of-i-m-glad-you-re-here`: "Good people of {realm-name}, I'm glad you're here." — 'Good people of' is old-fashioned and speechy.
- `opening-speech.salutation.plain-campaign-speech-everybody-here-in-thanks-for-stopping`: "Everybody here in {realm-name}, thanks for stopping." — 'Everybody here in {realm-name}, thanks for stopping' is awkward with a state or town filled in.
- `opening-speech.salutation.polished-campaign-speech-fellow-residents-of-thank-you`: "Fellow residents of {realm-name}, thank you." — 'Fellow residents of {realm-name}' is stiff; people say 'fellow Ohioans' or just 'folks.'
- `opening-speech.close.polished-campaign-speech-send-me-to-be-your-and-thanks`: "Send me to be your {office-title}, and {first-after} Thanks, {realm-bare}." — 'Send me to be your mayor' is awkward, and it repeats row 030's close.
- `opening-speech.close.plain-floor-speech-i-ask-for-its-vote-and-i-yield`: "I ask {body-name} for its vote, {presiding}, and I yield." — 'ask the Groton Select Board for its vote... and I yield' is stiff, and it repeats row 081's close.

### vary-the-shape (4)

- `opening-speech.occasion.polished-town-address-of-everything-we-did-this-year-is-what-i-most-want-to-hear-a`: "Of everything we did this year, {theme-name} is what I most want {realm-name} to hear about." — Same announce-the-theme shape as V1-016, telling the town what it will hear about.
- `opening-speech.occasion.plain-campaign-speech-the-reason-i-want-to-be-your-comes-down-to`: "The reason I want to be your {office-title} comes down to {theme-name}." — The same 'reason I want to be your office' shape as row 071, with the stock 'comes down to'.
- `opening-speech.occasion.plain-campaign-speech-if-you-re-deciding-who-should-be-your-here-s-what-matters-to`: "If you're deciding who should be your {office-title}, here's what matters to me: {theme-name}." — The same 'before you decide on your office, here's my theme' shape as row 052, with the 'here's what matters to me:' colon pattern added.
- `opening-speech.close.plain-campaign-speech-give-me-the-chance-and-thank-you`: "Give me the chance, and {first-after} Thank you, {realm-bare}." — The same 'if you X me, {first-after} Thank you' close as row 030.

### address-argues-not-announces (3)

- `opening-speech.occasion.plain-town-address-a-lot-happened-in-this-year-and-is-where-i-want-to-spend-our`: "A lot happened in {realm-name} this year, and {theme-name} is where I want to spend our time." — 'Is where I want to spend our time' narrates the speech instead of arguing anything.
- `opening-speech.occasion.plain-town-address-i-ll-cover-the-year-in-by-way-of`: "I'll cover the year in {realm-name} by way of {theme-name}." — 'Cover the year by way of' is meta and stiff, narrating the speech.
- `opening-speech.occasion.plain-campaign-speech-let-me-be-plain-about-why-i-want-to-be-your`: "Let me be plain about why I want to be your {office-title}: {theme-name}." — 'Let me be plain' is the promise to speak plainly he rejected.

### no-pointing-at-the-unnamed (3)

- `opening-speech.close.plain-town-address-if-we-keep-at-this-thank-you-and-thanks-to`: "If we keep at this, {first-after} Thank you, {realm-bare}, and thanks to {body-name}." — 'Keep at this' points at nothing named, and the result clause and thanks are jammed into one close.
- `opening-speech.occasion.plain-campaign-speech-i-ll-keep-this-short-i-want-to-be-your-and-it-s-about`: "I'll keep this short, {realm-bare}: I want to be your {office-title}, and it's about {theme-name}." — 'it's about {theme-name}' leans on an unset 'it' ("It. What is it?").
- `opening-speech.close.polished-floor-speech-if-we-vote-this-way-i-yield`: "If we vote this way, {first-after} I yield, {presiding}." — 'vote this way' leaves the way unnamed.

### awkward (2)

- `opening-speech.salutation.polished-town-address-thank-you-and-thank-you-for-the-time`: "Thank you, {body-name}, and thank you, {realm-bare}, for the time." — Opening by thanking the board and town 'for the time' is stiff, and it repeats the thank-you shape of the closes.
- `opening-speech.close.plain-town-address-if-you-have-a-view-on-tell-me`: "If you have a view on {theme-short}, tell me, {realm-bare}." — Calling the town by name as 'tell me, Groton' at the end is unnatural.

### every-line-gives-its-context (2)

- `opening-speech.salutation.plain-campaign-speech-friends-thanks-for-giving-me-a-few-minutes-in`: "Friends, thanks for giving me a few minutes in {realm-name}." — Tacking 'in {realm-name}' onto 'giving me a few minutes' is awkward.
- `opening-speech.occasion.plain-campaign-speech-i-m-asking-to-make-me-its-and-i-ll-start-with`: "I'm asking {realm-name} to make me its {office-title}, and I'll start with {theme-name}." — 'I'll start with {theme-name}' is unclear, and 'make me its mayor' is stiff.

### "reads like a shitty simulated sentence" (2)

- `opening-speech.close.plain-campaign-speech-my-reason-is-and-i-d-be-proud-to-have-your-vote`: "My reason is {first-reason}, and I'd be proud to have your vote, {realm-bare}." — 'My reason is X, and I'd be proud to have your vote' glues a flat reason slot onto the ask, the same simulated pattern he rejected.
- `opening-speech.close.plain-floor-speech-colleagues-my-reason-is-i-yield`: "Colleagues, my reason is {first-reason}. I yield, {presiding}." — 'Colleagues, my reason is X. I yield' is a bare reason slot with no flavor.

### address-close-names-the-body (1)

- `opening-speech.close.polished-town-address-thanks-to-and-to-everyone-who-works-for`: "Thanks to {body-name} and to everyone who works for {realm-name}." — Bare thanks that names nothing the speech said, the same thank-you shape as V1-004 and V1-010.

### line-fits-the-hour (1)

- `opening-speech.salutation.polished-campaign-speech-thank-you-all-for-being-here-tonight-in`: "Thank you all for being here tonight in {realm-name}." — 'tonight' is fixed whatever the hour, and 'being here tonight in Ohio' is awkward.

### no-stock-phrases (1)

- `opening-speech.close.polished-campaign-speech-it-comes-down-to-this-i-d-be-glad-to-earn-your-vote`: "It comes down to this: {first-reason}. I'd be glad to earn your vote, {realm-bare}." — 'It comes down to this:' is a stock wind-up in front of a reason slot, the simulated pattern he keeps rejecting.

### tense-of-the-record (1)

- `opening-speech.close.plain-campaign-speech-thank-you-i-ll-keep-working-on-if-you-send-me`: "Thank you, {realm-bare}. I'll keep working on {theme-short} if you send me." — 'I'll keep working on' assumes the candidate already holds the office.

### speech-follows-its-kinds-order (1)

- `opening-speech.salutation.plain-floor-speech-colleagues-here-s-where-i-stand-on-this`: "Colleagues, {presiding}, here's where I stand on this {measure}." — Addressing the colleagues before the presiding officer gets the floor order backwards.

### no-literary-phrasing (1)

- `opening-speech.close.polished-floor-speech-that-is-all-i-have-i-yield-the-floor-with-my-thanks`: "That is all I have, {presiding}. I yield the floor with my thanks." — 'I yield the floor with my thanks' is a composed flourish where a member would just say 'I yield back.'

## As played

- fail: `opening-speech.close.polished-town-address-thanks-to-and-to-everyone-who-works-for` → **the local head's address, 4949820, seed af873500, part 3** Thanks to this council and to everyone who works for Midway.
- fail: `opening-speech.salutation.plain-campaign-speech-friends-thanks-for-giving-me-a-few-minutes-in` → **a town member's campaign speech, 4949820, seed af873500, part 1** Friends, thanks for giving me a few minutes in Midway. I want to be your council member, and I want to talk about the cost of a place to live.
- fail: `opening-speech.salutation.polished-campaign-speech-fellow-residents-of-thank-you` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 1** Fellow residents of Rainelle, thank you. Before you decide on your council member, hear me out on our land and water.
- pass: `opening-speech.occasion.plain-campaign-speech-i-want-to-be-your-and-i-want-to-talk-about` → **a town member's campaign speech, 4949820, seed af873500, part 1** Friends, thanks for giving me a few minutes in Midway. I want to be your council member, and I want to talk about the cost of a place to live.
- pass: `opening-speech.occasion.polished-campaign-speech-before-you-decide-on-your-hear-me-out-on` → **a town member's campaign speech, 5466652, seed 2f25fb7e, part 1** Fellow residents of Rainelle, thank you. Before you decide on your council member, hear me out on our land and water.
- fail: `opening-speech.close.plain-campaign-speech-thank-you-i-ll-keep-working-on-if-you-send-me` → **a town member's campaign speech, 4949820, seed af873500, part 4** Thank you, Midway. I'll keep working on housing if you send me.

## Passing lines

- `opening-speech.salutation.plain-town-address-members-of-department-heads-and-neighbors`: "Members of {body-name}, department heads and neighbors."
- `opening-speech.salutation.polished-town-address-to-and-to-everyone-in-who-came-out`: "To {body-name} and to everyone in {realm-name} who came out:"
- `opening-speech.salutation.plain-town-address-neighbors-across-and-members-of`: "Neighbors across {realm-name}, and members of {body-name}."
- `opening-speech.occasion.plain-town-address-this-year-s-work-in-comes-down-to`: "This year's work in {realm-name} comes down to {theme-name}."
- `opening-speech.close.plain-town-address-thank-you-come-to-the-next-meeting-of-and-tell-us-what-you-t`: "Thank you, {realm-bare}. Come to the next meeting of {body-name} and tell us what you think about {theme-short}."
- `opening-speech.salutation.plain-campaign-speech-neighbors-across-thank-you-for-coming-out`: "Neighbors across {realm-name}, thank you for coming out."
- `opening-speech.occasion.plain-campaign-speech-i-want-to-be-your-and-i-want-to-talk-about`: "I want to be your {office-title}, and I want to talk about {theme-name}."
- `opening-speech.occasion.polished-campaign-speech-before-you-decide-on-your-hear-me-out-on`: "Before you decide on your {office-title}, hear me out on {theme-name}."
- `opening-speech.occasion.plain-campaign-speech-what-brought-me-into-this-race-for-is`: "What brought me into this race for {office-title} is {theme-name}."
- `opening-speech.close.plain-campaign-speech-if-you-make-me-your-thank-you`: "If you make me your {office-title}, {first-after} Thank you, {realm-bare}."
- `opening-speech.close.plain-campaign-speech-thanks-for-listening-i-hope-to-earn-your-vote`: "Thanks for listening, {realm-bare}. I hope to earn your vote."
- `opening-speech.close.polished-campaign-speech-please-vote-and-thank-you-for-hearing-me-out`: "Please vote, {realm-bare}, and thank you for hearing me out."
- `opening-speech.close.polished-campaign-speech-i-d-be-proud-to-speak-for-as-your`: "I'd be proud to speak for {realm-name} as your {office-title}."
- `opening-speech.salutation.plain-floor-speech-thank-you-for-the-floor`: "{presiding}, thank you for the floor."
- `opening-speech.salutation.plain-floor-speech-i-rise-to-speak-on-this`: "{presiding}, I rise to speak on this {measure}."
- `opening-speech.salutation.plain-floor-speech-colleagues-i-ll-be-brief`: "{presiding}, colleagues, I'll be brief."
- `opening-speech.salutation.polished-floor-speech-thank-you-and-thank-you-colleagues`: "Thank you, {presiding}, and thank you, colleagues."
- `opening-speech.salutation.polished-floor-speech-i-ask-for-a-minute-on-this`: "{presiding}, I ask for a minute on this {measure}."
- `opening-speech.close.plain-floor-speech-i-ask-my-colleagues-to-vote-with-me-and-i-yield-the-floor`: "I ask my colleagues to vote with me, {presiding}, and I yield the floor."
- `opening-speech.close.plain-floor-speech-whichever-way-it-goes-i-wanted-to-hear-this-before-the-vote`: "Whichever way it goes, {presiding}, I wanted {body-name} to hear this before the vote."
