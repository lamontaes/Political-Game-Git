# Back at the filing counter, a week after filing (Words builder W3, Nov 13, 2026)

Played on the bench at 1440x900 by a scratch script that follows `src/bench/filing.browser.mjs`: a new life, a grown resident, the first race at the first filing office in Travel, filed, a week on with dev mode, then back through Travel. Before is main at 9ed6e438b7; after is `claude/words-w3-counter-return`. Seeds are `SEED=w3-return-N`.

## w3-return-1

**before**

```
Place: Miracle Valley, Arizona
Replies: Let's do it. I'm running for the seat. | Is anyone else from Miracle Valley on the list? | March 23 for the papers. And the vote? | I'll come back to the Secretary of State when I've decided.
Filed: petitioning filing:contest:seat:US-AZ:us-house:07:2026-11-03:person_232de428a32c1cf6
Jeffrey Smith
Jeffrey Smith
First thing on March 2nd. You come back to Jeffrey Smith at the Secretary of State's counter with your petition in a folder.
Jeffrey Smith
Jeffrey Smith
Hello. I'm Jeffrey Smith. I keep the candidate list for Miracle Valley. Need the papers?
I want to run for U.S. representative in District 7. November 3, 2026 · Held by James Collier
I want to run for governor. November 3, 2026 · Held by Michael Barnett
I want to run for state senator in District 21. November 3, 2026 · Held by Laura Li
I want to run for state representative in District 21. Seat 1 · November 3, 2026 · Held by Shirley Singh
Leave
```

**after**

```
Place: Miracle Valley, Arizona
Replies: I'm in. Give me the papers for the seat. | Am I the first one from Miracle Valley in here? | Did Brandon Velazquez say anything about me? | Thanks, Jeffrey. I need to think it over.
Filed: petitioning filing:contest:seat:US-AZ:us-house:07:2026-11-03:person_232de428a32c1cf6
Jeffrey Smith
Jeffrey Smith
First thing on March 2nd, you head to the Secretary of State's office to ask about running. Jeffrey Smith comes over to the counter.
Jeffrey Smith
Jeffrey Smith
Hello. I'm Jeffrey Smith. I keep the candidate list for Miracle Valley. Need the papers?
I want to run for governor. November 3, 2026 · Held by Michael Barnett
I want to run for state senator in District 21. November 3, 2026 · Held by Laura Li
I want to run for state representative in District 21. Seat 1 · November 3, 2026 · Held by Shirley Singh
I want to run for state representative in District 21. Seat 2 · November 3, 2026 · Held by Carolyn McLeod
Leave
```

## w3-return-2

**before**

```
Place: West Wareham, Massachusetts
Replies: Let's get me on the ballot for the board. | Did anybody in West Wareham beat me to it? | September 30, got it. When do people vote? | I need a few days before I file with the city or town clerk.
Filed: petitioning filing:contest:seat:gus2025:106159:board:0:2025-11-04:person_a08772d1be54486f
Brenda Raymond
Brenda Raymond
Around noon on August 28th. You come back to Brenda Raymond at the City Clerk's counter with your petition in a folder.
Brenda Raymond
Brenda Raymond
Hello. I'm Brenda Raymond. Anyone running in West Wareham comes through me. Need the papers?
I want to run for the Town of Wareham Select Board. November 4, 2025 · Held by Dakota Pittman
Leave
```

**after**

```
Place: West Wareham, Massachusetts
Replies: Where do I sign for the board? | Did anybody in West Wareham beat me to it? | Did Dakota Pittman say anything about me? | Not today. I'll be back at the city or town clerk soon.
Filed: petitioning filing:contest:seat:gus2025:106159:board:0:2025-11-04:person_a08772d1be54486f
Brenda Raymond
Brenda Raymond
Nothing's come in yet. I need 20 signatures by September 30.
Then I'd better get back out there before September 30.
```

## w3-return-4

**before**

```
Place: Karns, Tennessee
Replies: Where do I sign for the senate? | Am I the first one from Karns in here? | Run the dates by me again. Papers by March 10? | Give me a few days, Robert.
Filed: petitioning filing:contest:seat:US-TN:us-senate:1:2026-11-03:person_cd2a0690bdf3d932
Robert Rich
Robert Rich
Around noon on January 28th, you take your petition back to the State Election Commission (original) and Coordinator of Elections (duplicate)'s office. Robert Rich holds out a hand for it.
Robert Rich
Robert Rich
Hi there. This is the State Election Commission, and I'm Robert Rich. Here to file?
I want to run for the United States Senate. November 3, 2026 · Held by Michael Davenport
I want to run for governor. November 3, 2026 · Held by Jeremy Potts
Leave
```

**after**

```
Place: Karns, Tennessee
Replies: Then I'll file for the senate. | Is anyone else from Karns on the list? | Did Jessica Sharpe say anything about me? | Not today, Robert. Maybe soon.
Filed: petitioning filing:contest:seat:US-TN:us-senate:1:2026-11-03:person_cd2a0690bdf3d932
Robert Rich
Robert Rich
Around noon on January 28th, you head to the State Election Commission and Coordinator of Elections's office to pick up the papers for governor. Robert Rich pulls them from a drawer.
Robert Rich
Robert Rich
Hi there. This is the State Election Commission and Coordinator of Elections, and I'm Robert Rich. Here to file?
I want to run for governor. November 3, 2026 · Held by Jeremy Potts
Leave
```

The after picture for w3-return-4 was taken before a later fix. It greets with "the State Election Commission and Coordinator of Elections". The research note reads "State Election Commission (original) and Coordinator of Elections (duplicate)", and the aside rule now stops before "and" or "or", so the greeting is "This is the State Election Commission" again (`spokenOffice`, tested in `filing-visit.test.ts`).

## After Fable A's read (Nov 13, 08:51Z), at e351391a

These replace the after pictures for w3-return-1 and w3-return-2.

**w3-return-1, Miracle Valley, Arizona**

```
First thing on March 2nd. You're back at the Secretary of State's counter, and Jeffrey Smith waves you over.
Jeffrey Smith: Back again? Your papers for U.S. representative in District 7 are in.
I want to run for governor. November 3, 2026 · Held by Michael Barnett
I want to run for state senator in District 21. November 3, 2026 · Held by Laura Li
I want to run for state representative in District 21. Seat 1 · November 3, 2026 · Held by Shirley Singh
I want to run for state representative in District 21. Seat 2 · November 3, 2026 · Held by Carolyn McLeod
Leave
```

**w3-return-2, West Wareham, Massachusetts**

```
Travel card: Town clerk, West Wareham
First visit's replies: Where do I sign for the board? | Did anybody in West Wareham beat me to it? | Did Dakota Pittman say anything about me? | Not today. I'll be back at the town clerk soon.
A week on, Brenda Raymond: Nothing's come in yet. I need 20 signatures by September 30.
Then I'd better get back out there before September 30.
```
