---
id: play-party-welcome-counts-district-government
title: "The party leader's welcome counts the District of Columbia's own offices as local"
area: play
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: design-story-director
source: filed by hand by the cluster 29 builder
---

**What.** The party leader's welcome (the party-joined scene) answers "what does the party do here" from the local seats its members hold and the local races it has candidates in. It counts only offices at the city, township and county levels, so in Washington, DC, where the mayor and council are offices of the state level in the offices data, a party that holds the mayor's office says it holds nothing here. Seen: in Washington, DC, a party that holds the mayor's office has a leader who says the party holds no seat here when asked what it does.

**Cause.** Found in code: `LOCAL_GOVERNMENTS` in src/director/purpose-scene.ts is the three levels `city`, `township` and `county`, and DC's own government (mayor, council, attorney general) is read from state-level rows in src/core2/offices-state.ts, so `townSeats` returns them at level `state` and the filter drops them.

**Fix.** Read which offices are the place's own from one place fact (the government that serves the town, from the offices data), not from the level list, and use it in the welcome's holds-and-runs read. Then add Washington, DC to the test's pinned places with the party that holds the mayor's office, and check that the leader names it.

**Time box.** 1 hour

**Rules.** One rule, all 56 places: no place is named in logic; the territories and DC are read from data.

**Done when.** A second session joins the party that holds the mayor's office in Washington, DC (place and seed named in the test), asks what the party does, and the leader names the mayor's office, not "nothing"; seen in the running game at 1440 by 900.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, src/director/party-welcome.test.ts
