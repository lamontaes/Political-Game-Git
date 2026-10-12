# Audit 2: running for office, as code (Oct 12, 9:15 a.m.; read-only helper; opus-gov 56ff364, opus-play 79b669f)

**The root fact:** /play builds the world two-level, so the full people are the player's family circle, officials and households filled in later. Every engine counting "named adults" works from a few dozen people.

## The CTO's known issues

- **`holdPrimary`: confirmed.** Named voters only, no group vote.
- **`groupVote`: partly.** Bands split in proportion to their named people's choices. A band with no named voters goes wholly to the "closest" platform. With about 2 named people per band, it's effectively winner-take-all.
- **`knockDoors`: confirmed in the engine.** The bench works around it by filling in households in ID order (a stand-in).

## Filing (step 3)

- **Reachable:**
  - calendars from data;
  - the filing office lookup;
  - structured eligibility checks;
  - the fee posted through the journal;
  - a clerk conversation with "pay fee" or "gather signatures";
  - signatures from people the player knows.
- **Risks:**
  - Independent filing terms are ignored (Texas: $0, 500 signatures, June 25).
  - Formula fees come out null in 44 place-and-office cells (California governor's 2% of salary becomes free).
  - No signature deadline.
  - Filing can start before it opens.
  - The `applicable:false` flag (12 cells) is ignored.
- **Gaps:**
  - The player files with no platform and no party.
  - **The office list remains:** the Politics sheet lists up to 6 contests with File buttons that skip the visit.
  - No overlay or tutorial.
  - Signatures aren't like canvassing; no rival or recognition moment.
  - You can file for several offices at once.

## Campaigning (step 4)

- **Reachable:** doors, volunteers, donations, endorsements, a fixed $50 ad, a 50-person poll, speeches.
- **Only when called directly:** volunteer canvassing, attack ads, rivals' campaign days (rivals do nothing in /play).
- **Risks:**
  - Nearly every door answers.
  - **Ads are 10–30× too expensive against their own source,** and always hit the same named adults.
  - Speeches have no venue or time cost; everyone who knows you attends, repeatable endlessly.
  - One click asks every acquaintance at once.
  - **Polls:**
    - named adults only, and everyone answers;
    - about half say "no opinion";
    - free;
    - an empty poll is still saved.
  - **A possible bug lets a same-day repeat donation slip past the limit.**
  - One cap per donor, with no primary/general split.
- **Missing:** staff, debates, party help, ad area, group endorsements, choosing a neighborhood.

## Elections (step 5)

- **Reachable:** the calendar (filing close, primary, election day, taking office) and a results sheet.
- **Risks:**
  - **The electorate mirrors the named sample:** family plus doors knocked.
  - Filled-in voters lean moderate, with no party tie.
  - **Unreached voters vote on platforms they never heard,** against the owner's rule.
  - **A winner can be crowned with 0 votes.**
  - **Turnout is presidential-year everywhere:** 0.46 of population even off-cycle (real turnout is usually under 25%), and 2024 totals in midterms.
  - Term-limited incumbents run again.
  - A primary tie keeps both candidates.
- **Missing:**
  - runoffs and ranked-choice;
  - municipal primaries;
  - real seating dates (everything starts 01-01, so Congress isn't seated Jan 3);
  - exit polls interview everyone named;
  - election night as a list, not a scene, with no concession call.

## Parties

- **Reachable:**
  - ballot parties;
  - ties by lean against Gallup and Pew;
  - independent ≠ no party;
  - loyalty counts in the vote.
- **Risks:**
  - The state's 2024 party shares are used, not the town's.
  - Leftover partisans get assigned to minor parties.
  - The no-party share shrinks, with a wrong label.
  - The state party leader lives in your town.
- **Missing:**
  - party views;
  - ties that change after the opening;
  - per-party rules;
  - independent and no-party labels on candidates.

## State and federal races

- **Works:** for seats covering the town.
- **The president is decided by your state's vote alone,** and the VP is a separate contest (they can differ in party).
- **Party alone decides these races;** the candidates are identities who never campaign.
- **Missing:**
  - races outside your town's seats;
  - fictional primaries;
  - an in-depth presidential race.

## The record (step 11)

- **Tests only.**
- **Blocker: each seat gets one contest, ever.** Contests are made once at the opening with a unique index, so there's no next election.
- **Other problems:**
  - every provision writes the same vote id;
  - the record has no cap;
  - voters weigh promises they never heard.
- **Missing:** "what changed" and "what surfaced".
- **Who runs:** the engine is registered, but `decideToRun` is never called from the bench. Local races are you against the incumbent.

## Questions

1. Who creates the next contest for a seat?
2. Why do unreached bands vote on platforms they never heard, and why does the town copy the player's family and doors?
3. A presidency with an Electoral College and a joint VP ticket: when?
4. Who fixes independent filing, formula fees and off-cycle turnout?
