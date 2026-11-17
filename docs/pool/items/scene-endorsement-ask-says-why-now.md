---
id: scene-endorsement-ask-says-why-now
title: "The person who asks the player to endorse them can say why they ask now, from their own records"
area: director
kind: feature
priority: 2
size: S
status: claimed
standard: 2
claimed-by: claude/story-k1-endorsement
claimed-at: 2026-11-17T06:30:00.000Z
pr:
blocked-on:
milestone:
source: 'Owner, Nov 14 9:23 PM ET (Story thread #9750, part 3): "someone says, you know, I''ve been working for you for a long time and, like, I want to get involved on my own. I''m asking you for an endorsement."'
lead: story
model: sonnet
effort: medium
root: none
after:
checked: sonnet 2026-11-17
---

**What.** A candidate's campaign asks the player to endorse them (`askPlayerForEndorsement`; the row says `asked` until the reply writes the yes or the no) and the `endorsement-ask` scene plays it. Until now its packet said only how close the two are and whether a favor is owed. A volunteer or staffer of a year or more, a person who carries a cause, someone who lost a job or ran before, someone in the player's party or against someone the player backs each have a record that says so; the packet now holds each as a fact, cited to that record. Seen: the ask for an endorsement opens on why this person asks now.

**Cause.** Found in code: `endorsement-ask` in src/director/purpose-scene.ts (composeBinding, the `reason-favor`, `reason-tie-close` and `reason-tie-distant` facts) is the only reason the packet carries, though src/core2/modules/campaigns.ts keeps `campaign-volunteer-joined` records, the candidacy decision (src/core2/modules/candidacy.ts `decisionOf`, `reasons.cause`), the jobs layoff rows and the filings table.

**Fix.** src/director/endorsement-ask-facts.ts reads those records into the facts `years-with-you`, `carries-cause`, `lost-job`, `ran-before`, `same-party` and `against-your-ally`, and purpose-scene.ts adds them to the packet. The Story lead writes the lines that use them; the facts that no line reads yet change nothing the player sees.

**Time box.** 5 hours.

**Rules.** No hand-written player text: the lines are the Story session's. Wire to the world: every fact is a read of another engine's record, named by id, and a fact whose record is absent is left out. No dice, no new records.

**Done when.** A second session, in a drawn place (name and seed recorded), sees someone who worked for the player a year or more file for a later race and their campaign ask the player to endorse them, with the packet's facts each cited to its record, the reply written on the one endorsement row, and a yes public as `campaign-endorsed`.

**Waits on.** Nothing. The lines for each fact wait on the Story lead (the spots list in the pull request).

**Files.** src/director/endorsement-ask-facts.ts (new), src/director/purpose-scene.ts, src/director/endorsement-ask-asker-facts.test.ts (new), docs/design/scenes/scene-catalog.md

**Notes.** The engine half of K1 was already on main when this was claimed: the campaign engine asks the player (`askPlayerForEndorsement`), the answer is kept on the endorsement row and `SG-GOV-player-favor-asked` has no marker or row left. Dev mode forcing is the recipe in `src/bench/dev-force-campaigns.ts` (PR #9809).
