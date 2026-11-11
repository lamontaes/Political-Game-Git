---
id: parties-list-shows-ballot-lines-as-parties
title: "Politics, Parties lists Under Votes and Over Votes as parties"
area: gov
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: none
source: written by hand for pool/notes (opus-d23b, Nov 11, the play-stop-05 replay)
checked:
---

**What.** In Washington, District of Columbia (seed c94a4055-39c3-41f3-a99d-184ebca302fa, main ff69a6fd23e) Politics, then Parties lists five parties: Republican, Democratic, Independent, Under Votes and Over Votes. The last two are lines from the state's printed ballot count, not parties. Other states' 2024 ballot rows carry more such lines (Blank, Blanks, Blank Votes, Void, Scattering, Others, All Others, Miscellaneous, None of These Candidates), so the same list shows them where they are. Seen: the Parties tab's list of parties in Politics.

**Cause.** Found in code: `stateParties` in src/core2/modules/parties.ts (line 151) takes a state's parties from `presidentialByState[].rawLabels` in data/source/electoral-calibration-2024/corpus.json and drops only labels matching the hand-written `NOT_PARTIES` regex (line 102: write-in, independent, petition, unaffiliated, none, no party, nonpartisan, unknown). "Under Votes" and "Over Votes" match none of these. The corpus row already marks those lines in its own `nonCandidateLines` map (for D.C.: `over-votes`, `under-votes`), and the label's key (lowercase, dashes) is the same key.

**Fix.** In `stateParties`, also drop every label whose key is in that row's `nonCandidateLines`, reading the row's own record rather than adding words to the regex. Then check the remaining labels across all 56 places; any non-party line a row does not mark (Scattering, Others, Miscellaneous) is added to the regex with a comment naming the rows that carry it.

**Time box.** 1 hour for one Sonnet session.

**Rules.** One rule, all 56 places: the filter reads each row's own non-candidate lines, never a named state. No hand-written player text in code: the party names shown stay the ballot's own labels.

**Done when.** A new test in src/core2/modules/parties.test.ts calls `stateParties` for every state key in the corpus and finds no name that is a key of that row's `nonCandidateLines` and none matching blank, void, over votes, under votes, scattering or others; it fails with the old filter. A second session opens Politics, Parties at 1440x900 in a drawn place whose ballot row has non-candidate lines (Washington, District of Columbia is one) and sees only parties, place and seed named.

**Waits on.** Nothing.

**Files.** src/core2/modules/parties.ts, src/core2/modules/parties.test.ts (new)

**Notes.** Found by opus-d23b replaying play-stop-05-politics-lists-wrong-officials on main ff69a6fd23e in Washington, District of Columbia, seed c94a4055-39c3-41f3-a99d-184ebca302fa (the rest of that finish line held: mayor, 13-seat council, one Delegate, no senators). Screenshot taken at 1440x900.
