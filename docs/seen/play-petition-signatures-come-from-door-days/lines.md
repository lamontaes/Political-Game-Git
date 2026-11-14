# Signatures at doors: lines as played

Owner, chat, Nov 14, 2026, 00:50Z: "It shouldn't say signatures the clerk would count at all. Like, that doesn't need to be known. All that should happen is when you're doing knocking on doors, you know, every now and then you might get 5 people or 20 people or no people, but there should be, you know, scenes every now and then, maybe sometimes no scenes. That's how gathering signatures work." 00:51Z: "None of those count lines or anything like that should pop up in dialogue. It should literally just be dialogue." Decision card 01:02Z: "Tab total and each outing".

Before: train at 31be7043. After: claude/project-thread-4w5ny3. Bench walk (.t47/walk.mjs pattern): new adult life, advance to an open race, file at the counter, Campaign tab, one Knock on doors outing. 1440x900.

## Place 1: Acosta, Pennsylvania, seed 4616f4a0-d9e4-4bc9-8680-9c78f8eed4b0

### Before

Counter after filing (screen `before-1-counter-after-filing.png`):

```
Erin Soto
PAT CANDIDATE
Let's do it. I'm running for the supervisors.
Good, that's it. You're on file for the supervisors in Acosta as of now.
SIGNATURES THE CLERK WILL COUNT: 3, HANDED IN BY MARCH 11, 2025
COLLECTING SIGNATURES
Continue
```

Doors outing strip (screen `before-1-doors-1-strip.png`): "Knock on doors · 45 doors · 11 reached"

### After

Counter after filing (screen `after-1-counter-after-filing.png`):

```
Erin Soto
PAT CANDIDATE
Let's do it. I'm running for the supervisors.
Good, that's it. You're on file for the supervisors in Acosta as of now.
Continue
```

Doors outing strip (screen `after-1-doors-1-strip.png`): "Knock on doors · 45 doors · 11 reached · 23 signed"

## Place 2: Empire, Colorado, seed df6f08d8-187a-4aa0-bffa-57d01a9329c8

### Before

Counter after filing (screen `before-2-counter-after-filing.png`):

```
Sydney Walsh
PAT CANDIDATE
Where do I sign for mayor?
Good, that's it. You're on file for mayor in Empire as of now.
SIGNATURES THE CLERK WILL COUNT: 10, HANDED IN BY AUGUST 25, 2025
COLLECTING SIGNATURES
Continue
```

Doors outing strip (screen `before-2-doors-1-strip.png`): "Knock on doors · 45 doors · 7 reached"

### After

Counter after filing (screen `after-2-counter-after-filing.png`):

```
Sydney Walsh
PAT CANDIDATE
Where do I sign for mayor?
Good, that's it. You're on file for mayor in Empire as of now.
Continue
```

Doors outing strip (screen `after-2-doors-1-strip.png`): "Knock on doors · 45 doors · 7 reached · 21 signed"

## Place 3: Edgar, Wisconsin, seed 4d8a2d61-6aea-48c7-8043-906d5c563aaa

### Before

Counter after filing (screen `before-3-counter-after-filing.png`):

```
Brandon Kelley
PAT CANDIDATE
Then I'll file for the senate.
That's it. Your name's in for the senate in Edgar.
SIGNATURES THE CLERK WILL COUNT: 1, HANDED IN BY OCTOBER 24, 2025
COLLECTING SIGNATURES
Continue
```

Doors outing strip (screen `before-3-doors-1-strip.png`): "Knock on doors · 49 doors · 2 reached"

### After

Counter after filing (screen `after-3-counter-after-filing.png`):

```
Brandon Kelley
PAT CANDIDATE
Then I'll file for the senate.
That's it. Your name's in for the senate in Edgar.
Continue
```

Doors outing strip (screen `after-3-doors-1-strip.png`): "Knock on doors · 49 doors · 2 reached · 34 signed"

## Porch scenes as played (measurement, Etowah, Arkansas, seed c7d7e202d63b5dce5a62bf75695426ce5a566161018b7f974abb1b6fb848f7e7, daily doors)

- 2025-09-16: 45 doors, 9 reached, 23 signed; DOOR SCENE (1 queued): Narrator: The porch light is on. Richard Gordon opens the door partway. / Anthony Ali: Hi, I'm Anthony. I'm collecting signatures so I can run for commissioner. Would you sign? / Richard Gordon: Everybody should get a shot. I'll sign. / [thank] Thanks. I'll make it count. ->

## Not replayed yet

A refused filing with each new state-rule line, and a petition visit with a confront reply answered by the reworded clerk lines (the Words lead's ask).

## Replayed: refused visits and the clerk's petition scene, as played (Nov 14)

Script `.t47/replay.ts` (not committed): drawn places, real `openBenchFilingVisit` and `chooseAtCounter`, the director's `purposeScene` for the filing scene. The last three lines of each refused visit, then the replies offered.

**already-filed**, Marysville KS, seed 448c075a4e213c0bf1b91ddeb2bd7bb8513fa53c2d53e74d738502cee146c051, Council member:

- Player: I want to run for the Marysville City Council.
- Clerk: Alright, then. Another one for the council. It's 4 years if you win. No primary, just the one election, November 4. You'd have a seat on the Marysville City Council, voting on the budget and every ordinance that comes before it. The papers are due back June 1.
- Clerk: Your name's already in for the Marysville City Council. There's nothing more to file.
- Replies: Thank you.

**residency**, Brookhaven WV, seed cf3f7396c28d3f08a06fb91eb43a60540afadf5cfcea9fbe6545450294372e32, County Commissioner:

- Player: I want to run for county commissioner in District 1.
- Clerk: Okay then. Another one for the seat. You'd serve 6 years. First comes the primary, May 12, and then the general, November 3. You've got until January 31 to get it all back to me.
- Clerk: You can only file for county commissioner in District 1 if you live in Brookhaven, West Virginia, and your address has you in lives elsewhere.
- Replies: Understood. I'll sort it out and come back for the seat.

The residency line ("your address has you in lives elsewhere") is an existing piece with a broken slot fill, not one of the ten new lines; reported to the Words lead.

**minimum-age**, Ocean Pointe HI, seed a5ffa8d5734a07a0348ee2ee0d80a252bf4c3fc16dae156babfdfc81b968b35c, Mayor:

- Player: I want to run for mayor.
- Clerk: Okay then. Another one for mayor. It's a 2-year term. The primary is August 9, and if you get through that, the general is November 4. It's a county office. You'd answer to everyone in the county, not just Ocean Pointe. It all has to be back to me by June 3.
- Clerk: You have to be at least 18.
- Replies: Then running for mayor will have to wait.

**The clerk's petition scene with every reply**, Brookhaven WV, seed cf3f7396…, County Commissioner, needs 2:

- Narrator: Back at the counter, Rebekah Gallagher finds your papers for County Commissioner and pulls one sheet out.
- Rebekah Gallagher: Next you collect 2 signatures, and I need them by January 31. Have you done this before?
- (agree) You: I have. I'll have them back before January 31. / Rebekah Gallagher: Good. Go over them before January 31. I only take the ones that hold up.
- (ask) You: Not really. Can you walk me through a run for County Commissioner? / Rebekah Gallagher: Signatures first. Doors are slow but they work, and a table outside the grocery on a Saturday works faster. Once you're on, it's money and the press. Raise what you can, buy ads in the Brookhaven Enterprise or send mailers, and get to know whoever covers the town there.
- (confront) You: Who decided County Commissioner takes that many? / Rebekah Gallagher: That's the law's number, not mine, and so is the January 31 deadline.
- (leave) You: I'll go start knocking on doors in Brookhaven.

## The doors strip says the doors answered (Words lead's go, Nov 14 03:04Z)

"Reached" counted only the full people met; a counted resident who opens is asked to sign too and stays a count, so the strip could show more signed than reached. A petition outing now shows the doors that opened (the people met plus the counted openers), and "reached" stays on vote-asking outings. Pinned in `src/bench/campaign-doors-answered.test.ts` at Otisville, New York (seed 580915c55b122496eedbb4aef26193e639a89d50e6df380c1a1073abc59559a5): six outings, signed never more than answered, answered never fewer than reached.

As played, train merged at 5f9e3ba8 (pictures `answered-1/2/3-doors-strip.png`):

- Acosta, Pennsylvania (4616f4a0-d9e4-4bc9-8680-9c78f8eed4b0): "Knock on doors · 45 doors · 26 answered · 23 signed"
- Empire, Colorado (df6f08d8-187a-4aa0-bffa-57d01a9329c8): "Knock on doors · 45 doors · 22 answered · 21 signed"
- Edgar, Wisconsin (4d8a2d61-6aea-48c7-8043-906d5c563aaa): "Knock on doors · 49 doors · 34 answered · 33 signed"

The clerk's residency refusal no longer reads a broken slot: "You have to live in {required} to run for {office}, and my records have you somewhere else." ({required} is the town's or state's name as the place records give it, such as "Brookhaven, West Virginia"; only a place with no record falls back to the research note's text.) The porch thank-you "Thank you. That's one closer." is now "Thank you. That helps." (rule 50: no progress said aloud).
