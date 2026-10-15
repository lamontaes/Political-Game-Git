# Later milestones: specs M2 to M7 (all owner-approved Oct 12, 2026)

The owner approved every spec here on Oct 12, 2026, piece by piece. Each spec says which work order in `docs/packages/` to build from:

- **M2:** M2-filing, M2-campaigns, M2-elections, M2-candidates-news.
- **M3:** M3-legislating, M3-laws-and-executive, M3-world-of-governing.
- **M4:** M4-words.
- **M5:** M5-careers.
- **M6:** M6-screens.
- **M7:** M7-early-access.

The specs and their tests are in `docs/roadmap/features.json`. **Where a work order and a draft line below differ, the work order wins.** The draft text below is the Oct 10 original, kept as the index.

**Systems model** (owner, Oct 12): _The Political Process_, plus our people, scenes and visuals. Every test runs in a place drawn at random from all 56, and every word comes from the English engine.

## M2 · Running for office: Offices and the rules of running

### M2-01 · Offices and seats, every level

- **Approved (owner, Oct 10):** built in M1 from the work order `docs/packages/M1-officials.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV
- **Does:** Every office from council and mayor to governor, Congress and president exists from day one, with real numbered seats and districts, fictional holders with full records, terms, term limits and vacancies.
- **Passes when:** In a random place, every seat that covers the player has a holder with a record and a term; a vacancy is filled the way that office's real rules say.

### M2-02 · Election calendars and filing rules

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M2-filing.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV
- **Does:** Real election dates, filing deadlines, qualifications, petitions and fees, from each place's records; primaries, runoffs and ballot rules (including top-two or ranked-choice where a place really uses them).
- **Passes when:** In a random place, the next local, state and federal elections have real dates, and filing requires exactly what that place's rules require.

### M2-03 · Filing in person (step 3)

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M2-filing.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV (screen: OPUS-PLAY)
- **Does:** You go to that place's filing office (clerk, registrar or board of elections) and talk to the person there. The conversation teaches how campaigns work, and filing becomes a record. Menus only record what you did.
- **Passes when:** In a random place, the player files with the right office, and the filing, fee and petition (if required) become records that the election reads.

### M2-04 · Other candidates choose to run

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M2-candidates-news.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-PEOPLE
- **Does:** People decide to run, or not, from their drives, views, standing and circumstances, through the same choices as the player. Incumbents decide to run again or retire.
- **Passes when:** In one election season, every candidate on the ballot filed through those choices, with recorded reasons; no one is placed on the ballot by script.

## M2 · Running for office: Campaigns and elections

### M2-05 · Campaigning (step 4)

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M2-campaigns.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV
- **Does:** Win support through the people you actually reach: meeting people, door to door, speeches, a front porch, endorsements, news, ads and party. Raise and spend money under real contribution limits. Staff and volunteers whose results depend on who they are. Debate preparation as designed.
- **Passes when:** In a random place, each campaign act changes what specific voters know and think, and support never moves without a recorded cause.

### M2-06 · Polls

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M2-campaigns.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV
- **Does:** A poll is a real sample of the people it actually contacted, with a computed margin of error. No contacts means no poll.
- **Passes when:** A poll's reading equals the support among the people it sampled, and its margin follows the sample size.

### M2-07 · Elections (step 5)

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M2-elections.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV
- **Does:** Real voters in your area cast ballots from what they know and think; voter groups count everywhere else; turnout follows each person's circumstances. Primaries, runoffs, counting, automatic recounts where the law requires them, and the winner seated at the start of the term.
- **Passes when:** In a random place, the result is the sum of individual ballots in the focus area plus voter groups elsewhere; the winner takes the seat on the right date and replaces the right person.

### M2-08 · Parties

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M2-elections.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV
- **Does:** Party organizations, registration and primaries by each place's party rules; party leaders are people who act. Party posts aren't playable until after early access.
- **Passes when:** In a random place, primaries run by that party's real rules, and party leaders are named people with records.

### M2-09 · Basic news

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M2-candidates-news.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-PEOPLE
- **Does:** Local outlets report results, laws and big events; news spreads by word of mouth through people's relationships, at each person's own news habits. The full press engine comes after early access.
- **Passes when:** An election result reaches residents through outlets and people, with natural delays, and people who never hear it don't know it.

### M2-10 · State and federal races in the world

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M2-elections.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV
- **Does:** Legislature, governor, Congress and president races run with fictional candidates; presidential races are simulated in depth.
- **Passes when:** In one election year, every state and federal race resolves from its candidates and voters, and the winners are seated on the right dates.

## M3 · Governing, and laws that change things (steps 6–9)

### M3-01 · Writing a bill (step 6)

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M3-legislating.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV
- **Does:** Pick a subject from the 18-subject bill catalog and draft on paper with the shared sections (current rules and programs, coverage, benefit or rate, funding, administration, enforcement, reporting, timing). A bill carries real amounts written from current law, and only what your level of government is allowed to do.
- **Passes when:** In a random place, a council member drafts an ordinance with real amounts, inside the city's authority; a city can't pass what only a state can.

### M3-02 · Negotiating (step 7)

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M3-legislating.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV
- **Does:** Members' positions come from their lives and personal stakes. You learn a stake only the way your character could (a conversation, a staffer, the news, research, the voting record) and can then use it. Political favors and deals are remembered and come due.
- **Passes when:** In a random place, a member's vote changes because of a stake the player learned and used, and a favor owed is called in later.

### M3-03 · Legislatures, one engine (step 8)

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M3-legislating.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV
- **Does:** Council, state legislature and Congress on one engine: sessions, committees, floor votes, amendments, leadership, quorum and required votes, veto and override windows; members vote from their own reasons.
- **Passes when:** In a random place, the ordinance moves through that body's real procedure and passes or fails on each member's recorded reasons.

### M3-04 · Laws change the world (step 9)

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M3-laws-and-executive.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV
- **Does:** An enacted law changes records first. Funded work gets paid for, can be delayed or fail, gets delivered, and reaches named people, so the town visibly changes.
- **Passes when:** In a random place, the passed ordinance changes a record, money moves, and named residents feel the effect at the right time.

### M3-05 · Executive offices, one engine

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M3-laws-and-executive.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV
- **Does:** Mayor, county executive, governor and president desks on one engine: sign or veto, orders, appointments, budget priorities with staff advice. Officeholding is a sandbox of choices, not a task list.
- **Passes when:** In a random place, the mayor acts on the passed ordinance through that place's real powers, with the reasons recorded.

### M3-06 · Staff

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M3-world-of-governing.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV, or anyone free
- **Does:** Staff whose results depend on skill, potential, personality and passion; they improve over time. Hire people you know or take applicants; delegate work to them.
- **Passes when:** A staffer's work quality follows their record and improves with experience; a delegated task's result traces to who did it.

### M3-07 · Interest groups

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M3-world-of-governing.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV, or anyone free
- **Does:** Groups form from whoever loses money under a bill's fiscal note; they lobby, donate, advertise and back opponents.
- **Passes when:** When a bill would cost an industry money, groups from that industry organize and act, with recorded reasons and money that balances.

### M3-08 · Constituent cases (simple)

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M3-world-of-governing.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV, or anyone free
- **Does:** Residents bring real problems from their own records to their official, who can help or not.
- **Passes when:** A resident with a real problem contacts the player's office, and the outcome changes that resident's view of the player.

### M3-09 · Basic corruption

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M3-world-of-governing.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-PEOPLE
- **Does:** People can offer or take bribes and favors because of their own traits, money and circumstances. It leaves records that can surface later through people or news. Investigations and prosecutions come after early access.
- **Passes when:** Over a year, a corrupt act happens only where traits and circumstances support it, leaves a record, and can be learned by others through real routes.

### M3-10 · Other governments legislate

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M3-world-of-governing.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV, or anyone free
- **Does:** State legislatures and Congress pass laws; other councils meet on their schedules; ballot measures and recalls happen where a place really allows them. At early access they run in the world only; after early access the player can start, sign and campaign on them.
- **Passes when:** In one year, a state law and a federal law take effect and change named residents' lives; a ballot measure runs where the law allows one.

## M4 · Stories and words (steps 10–11)

### M4-01 · Stories from every engine

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M4-words.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-PEOPLE
- **Does:** The director turns campaigns, votes, laws and money into moments: big ones interrupt, smaller ones wait or become journal lines, and callbacks come through people.
- **Passes when:** In a random place, a campaign, a vote and a law each produce moments for the people they touched, sized by impact.

### M4-02 · Conversations

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M4-words.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-PEOPLE
- **Does:** Every choice names something real, there's a Lie button beside the replies, and every line comes from the English engine, graded by the owner in batches.
- **Passes when:** Every conversation choice names a real subject, no line is hand-written, and the owner has graded a batch.

### M4-03 · Scenes and the journal

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M4-words.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-PEOPLE
- **Does:** Scene narration in second person; "My life" in first person, selective, never inventing a feeling.
- **Passes when:** A year's journal reads as a story, and every statement traces to a record.

### M4-04 · Speeches at any moment

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M4-words.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-PEOPLE
- **Does:** Give a speech anytime; each listener reacts by who they are, and it gets retold to family and friends. Movements come after early access.
- **Passes when:** A speech changes specific listeners' views, and some retell it.

### M4-05 · People bring it up (step 10)

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M4-words.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-PEOPLE
- **Does:** People mention what changed and who did it, in their own words.
- **Passes when:** After the ordinance, affected people raise it in conversation and know who was responsible.

### M4-06 · The record follows you (step 11)

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M2-elections.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV
- **Does:** The next election reads your votes, promises kept or broken, what changed, and anything that surfaced.
- **Passes when:** An opponent and voters cite the player's real record in the next campaign.

## M5 · State and federal careers, and the executive role

### M5-01 · State legislator career

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M5-careers.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV (screens: OPUS-PLAY)
- **Does:** Pick a real numbered seat, file, campaign against the actual holder, take the seat, and pass bills with colleagues.
- **Passes when:** In a random state, the player replaces the right member at the start of the term and passes a bill.

### M5-02 · Governor and mayor play

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M5-careers.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV (screens: OPUS-PLAY)
- **Does:** Set budget priorities with staff advice, appoint a cabinet, sign or veto, and live with the results. Line-by-line budgets are optional depth.
- **Passes when:** In a random state, the governor's priorities change real spending and outcomes.

### M5-03 · Keep playing as someone else

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M5-careers.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-PLAY
- **Does:** When your character dies, or when you choose to, continue as a connected existing person (your son, a protégé, anyone eligible) with their own life. Inheriting a movement comes after early access.
- **Passes when:** After the player's death, the handoff offers connected people, and the save continues.

### M5-04 · Member of Congress and president (parallel)

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M5-careers.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-GOV, or anyone free
- **Does:** The same engines at federal level, including foreign policy for the president. Early access doesn't wait for it.
- **Passes when:** A random life reaches Congress or the presidency and governs.

## M6 · The real game screens

### M6-01 · The opening

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M6-screens.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-PLAY
- **Does:** The owner's approved cinematic opening: letterbox bars and the President's speech (inaugural or State of the Union), with cutaways to your representatives, state, town, family and you. Numbers live in an openable ledger.
- **Passes when:** A new game in a random place opens with that place's officials and family, and the speech's words come from the engine.

### M6-02 · Every screen, one at a time

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M6-screens.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-PLAY
- **Does:** In the owner's order, after the opening: panel frame and style, person card (only what you could know), family (the owner's family-screen reference), conversation box (lower third, Lie button), government map, campaigns (no office list; you go to the filing office), calendar and time, journal, news, ledger, bill drafting on paper, desk and budget.
- **Passes when:** Each screen gets the owner's design approval, then a play-through in a random place.

### M6-03 · Art fixes

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M6-screens.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-PLAY, with the CTO's art pipeline
- **Does:** Seated poses that sit, formal clothes by role and place, frame corners, and the rest of the owner's October 8 list.
- **Passes when:** The owner's October 8 defect list is cleared, judged by him side by side.

### M6-04 · Custom world (added Oct 12)

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M6-screens.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-PLAY (the new-game screen), with OPUS-CORE (world generation)
- **Does:** A new game starts from real data in a random place, or from a customized world (place, demographics, ideology, turnout, party strength, economy and more), like _The Political Process_'s advanced options.
- **Passes when:** World generation honors every setting, and the world then runs by the same rules.

## M7 · Early-access ready

### M7-01 · Speed and memory

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M7-early-access.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-CORE
- **Does:** A town's year in under 2 minutes; the new-game load (including the opening) fits a short loading screen; it runs on a minimum PC.
- **Passes when:** Measured on a reference minimum-spec machine, with targets set from Steam's hardware survey.

### M7-02 · Saves that last

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M7-early-access.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-CORE
- **Does:** A versioned save format; a save can always continue, and updates don't break it.
- **Passes when:** An old save loads and plays after an update.

### M7-03 · Zero placeholders

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M7-early-access.md`; the spec and its test are in `features.json`.
- **Owner:** Every session, in its own area
- **Does:** Every registered shortcut replaced, or turned into a sourced or marked estimate.
- **Passes when:** The release build passes with zero open stopgaps.

### M7-04 · Updates and bug reports

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M7-early-access.md`; the spec and its test are in `features.json`.
- **Owner:** Anyone free
- **Does:** Automatic updates, content updates without a reinstall, in-game bug reports with logs, crash reports.
- **Passes when:** A test update installs itself, and a bug report arrives with its log.

### M7-05 · Legal check

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M7-early-access.md`; the spec and its test are in `features.json`.
- **Owner:** Anyone free
- **Does:** Confirm no real politicians appear (the owner's Sept 26 ruling), and clear real places, schools and institutions, data licenses and photo and art licenses. A research review by the team. There is no attorney (owner, Oct 12); a one-time outside legal review is optional and blocks nothing.
- **Passes when:** The review is done and its fixes are made.

### M7-06 · Steam

- **Approved (owner, Oct 12):** build from the work order `docs/packages/M7-early-access.md`; the spec and its test are in `features.json`.
- **Owner:** OPUS-PLAY, with the CTO
- **Does:** Store page, trailer, early-access FAQ, minimum specs, price.
- **Passes when:** The owner signs off.
