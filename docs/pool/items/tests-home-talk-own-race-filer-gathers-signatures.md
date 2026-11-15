---
id: tests-home-talk-own-race-filer-gathers-signatures
title: "The home-talk test's filer canvasses for their petition, so the count names them"
area: director
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-p37c46
pr: #9490
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Account lead, Nov 15: home-talk-own-race-only red on the bare Train at Sherrodsville OH 3972242, seed scan-25, after the fold of #9473
---

**What.** The filer case of src/director/home-talk-own-race-only.test.ts files a housemate for office and waits for the house to bring up their race, but the housemate (made the controlled player in the test) never gathers signatures, the clerk's check marks the petition short, the count does not name them and the house says "You were up early." Seen: the filer case passes again at Sherrodsville OH (3972242, seed scan-25) and prints how many signatures the petition needed.

**Cause.** Found in code: src/core2/modules/campaigns.ts does not run the petition campaign for the controlled person (a candidate who is the player is skipped, and `askToSign` refuses the player), so a controlled filer gathers by their own act, which src/core2/campaign-petition-kit.ts `gatherSignatures` plays through the game's own day choice. The test filed through `fileForOffice` and gathered nothing; before the fold of #9473 (veterans' pay, which changes every world's money from month one) the world's first housemate with a race open reached the ballot without it, so the premise was a draw.

**Fix.** After `fileForOffice` the filer canvasses with `gatherSignatures`, the test continues from the day the clerk's check left the world on, and the assertions stay as they were. The test prints the signatures needed and gathered.

**Time box.** 1 hour.

**Rules.** No dice: the signatures come from people asked at a door or in the circle, answering for their own reasons. A pinned test names its place and seed. Nothing in the game changed.

**Done when.** A second session runs src/director/home-talk-own-race-only.test.ts at the Train head and both cases pass at Sherrodsville OH (3972242, seed scan-25).

**Waits on.** Nothing.

**Files.** src/director/home-talk-own-race-only.test.ts

**Notes.** Own PR on the Train head, thread "Build scenes after the race". Unattended filers do gather (Stoneham MA, three petitions with signers via circle, door and event); the opening day's filers at Sherrodsville sit on the ballot with none.
