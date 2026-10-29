# Episode: the win, marked at home (election night and the next day)

Slug `win-night-at-home`. Season: election day and night. Types: `family-win`, `celebration`. Calibration only: nothing here ships as player text; no real name or quoted line is in any bank.

## Sources read (for calibration)

Opened in full (fetched and read):

1. Monterey County Now, Nov. 9, 2022, Salinas council race (https://www.montereycountynow.com/blogs/news_blog/in-their-second-faceoff-andrew-sandoval-ousts-christie-cromeenes-shaking-up-salinas-city-council/article_95495086-600f-11ed-bfef-e3a9cce82be6.html). Election night, Nov. 8, at the candidate's home: four children, family and friends in the living room, a TV on mute. A 118-vote lead over the incumbent, so the mood was "cautious." He said the voters "believe in the message" and the kids were "very excited." He hoped the lead would grow, as the other way ran in 2018.
2. Patch Watertown, Nov. 7, 2013, a winning council candidate's thank-you post (https://patch.com/massachusetts/watertown/thank-you-watertown). He thanks volunteers and family for their faith, notes that many had young children or were single parents and some gave money or opened their homes, thanks rivals and voters, and promises to keep to his goals and "listen to opposing points of view."

Search summaries only (page not opened; the fetch was refused with a 403): 3. Greenfield (Ind.) Reporter, mayor-elect's night, per the search summary: he credited "my wife Kathy and my daughters"; she said he had talked about running for about 15 years and had campaigned beside him for the past year (https://greenfieldreporter.com/?p=385458). 4. Community Impact, Magnolia (Texas), May 2023 mayoral win, per the search summary: the winner thanked his wife and family and said "We worked hard during this campaign" (https://communityimpact.com/tomball-magnolia/election/update-incumbent-magnolia-mayor-todd-kana-loses-re-election-bid/).

## Fact packet (what happens, in substance)

- **Who and why:** the winner, the spouse and children at home, and friends and volunteers who worked the race. Ties: partner, child, campaign helper.
- **Trigger:** the count comes in (night of, sometimes still preliminary) and the winner is named.
- **Spouse/partner:** credits the winner's long wish to run and their own year of work beside them; asks what happens to the house now (time, the phone, the evenings).
- **Children:** excited, mostly about the night itself; the small ones want the winner there, not on the phone.
- **Volunteers:** want to be named. Many of them spent scarce time (young children, one income) and some gave money; thanks is what they came for.
- **Winner:** thanks family first, then helpers by name; says the work was shared; promises to hear the other side; admits the margin is not yet safe if the count is close.
- **The unsaid worry:** the office itself. The winner does not yet know what the job is; the family knows it will take more of them.
- **Choice:** how to spend the night: stay with the household, go to the helpers' party, or take the calls.
- **What changes after:** a promise is on record (time back, a call to every helper), helpers feel credited or passed over, and later talks can cite "what you said that night."

## Ask the engine

| Packet line                                       | Record and type                                                                                                                                                                                                  | Status                                            |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Winner named                                      | `election-result` with `winnerId` = subject; `family-win` fires on it (4 times in the played year; first: `person_03633b9ade5b15f9:2025-11-04:election-result:contest:seat:gus2025:161442:council:0:2025-11-04`) | exists, fires                                     |
| Spouse/children at home                           | `household` fill for `relative`; `celebration` hosts from `household`                                                                                                                                            | exists, fires                                     |
| Spouse credits the long wish and the year of work | volunteer list on the campaign exists; no record that this person worked the race is read for the cast                                                                                                           | exists, nothing fires on it                       |
| Spouse asks about time, phone, evenings           | `family-win` has `ask` and `promise` moves; the household stake (savings runway, children, work hours) is a record                                                                                               | exists, nothing fires (no stake read in the cast) |
| Volunteers want to be named                       | campaign `volunteerIds` exist; `celebration` guests fill `present`                                                                                                                                               | exists, unclear who is "present"                  |
| Thanks by name, promise to call helpers           | `promise` move exists; nothing writes a promise record                                                                                                                                                           | no record                                         |
| Count still preliminary                           | the result is final when written                                                                                                                                                                                 | no record                                         |
| Winner has no idea what the job is                | no record of what the winner knows of the office                                                                                                                                                                 | no record                                         |
| Later talk cites that night                       | `scene.reply` records exist                                                                                                                                                                                      | exists, nothing fires                             |

## Gaps

1. Cast: `family-win` takes any household member; it ignores who worked the race and who pays for it. Producer (lead director): a stake fill like the one for `family-filing`.
2. Lines: today's bank has 26 `family-win` pieces (about a dozen replies). Almost all are glad and generic. None name credit, a specific time asked back, or worry about what comes next. Lines (words lead).
3. `celebration` lead lines for the win are the generic "There is something to mark today." Lines (words lead).
4. Guests: whether `present` means the people who volunteered is not known; if it means anyone present, helpers are not cast. Producer (lead director) to confirm and fix.
5. A promise made that night is not recorded, so no later scene can hold the winner to it. Engine (campaigns, effects lead).
6. A close count: no preliminary-result record. Engine (elections). Low priority; the game may skip it.
7. The household's stated limit is read by nothing (see `spouse-stake-after-filing`, pool `campaigns-household-limit-read`). Engine (effects).

## Lines the bank needs (substance only)

Speakers: spouse (patient, anxious, guarded), child, volunteer, winner.

- Spouse by trait: patient credits the work and asks for one evening a week; anxious asks how long until things calm down and whether the phone will keep ringing; guarded says "we will see how you handle it." Tie variants: partner, grown child, parent.
- Child (small): wants the winner at the table; (teen): asks if it means a move or a new school.
- Volunteer: wants thanks by name; one says the hours cost them; one asks what the winner will do first.
- Winner's four reply stances to the spouse's ask: share the credit and promise a limit; say it is decided and the work starts tomorrow; deflect to the helpers' party; admit not knowing what the job is.
- Celebration host: marks the night by what the household actually did (the yard signs, the door-knocking), not by a toast.

## Other lives the same scene covers

- A mayor-elect crediting his wife and daughters and her own year of campaigning (source 3).
- A volunteer-heavy council win where the winner thanks helpers with young children or one income (source 2); a small-town mayor thanking family and "the work we did together" (source 4).
