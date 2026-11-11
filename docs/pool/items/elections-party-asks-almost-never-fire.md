---
id: elections-party-asks-almost-never-fire
title: "A party almost never asks a member to run: both majors file in every opened partisan race, and minor parties have no chair or members"
area: elections
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: opus
effort: high
root: rc9-place-facts-one-default
source: Fable B helper, Nov 11, reds on main (party-recruit.test.ts, political-asks.test.ts advice)
---

**What.** The Pendergast approach (owner, Oct 14 and Oct 25: a party with no one filed for a partisan seat asks one of its members to run) almost never happens in a played world. The day a seat's filing opens, the counted runners of both major parties file first, so the party has someone and asks no one. The minor parties a state's ballot lists get no chair and no members, so they never ask either. Two drawn director tests are red because they cannot find an ask: `src/director/party-recruit.test.ts` and the advice test in `src/director/political-asks.test.ts`. Seen: the party chair's ask to run, a scene a player in a party should meet in a race the party left empty.

**Cause.** Measured: 24 months played in each of five drawn places with `buildBenchWorld` (Guernsey, Wyoming, place seed 5febb05fe88de949d14731ed73d1e7e99eb79782070bd75f2c3ac06fdc412830; Marpi, Northern Mariana Islands, 5d1e5ce3919479b4209f677e3847a773a2097391feed7d75d5714047d3042feb; Frederiksted Southeast, U.S. Virgin Islands, ddee87eab2e456d74f0a6e1a3dc4272605f11e3d6d97a26f00339a4ce73d22da; Inarajan, Guam, 041bba94951e39ef2e52c9603d916c26444e65afaaa00a926227addad89e103d; Washington, District of Columbia, 45cca800a6b7838effebac3fc2b7272231626383814645328f48b65cbefceef8). Each had 0 `party-asked` records. Every partisan contest whose filing had opened had both a Republican and a Democrat filed, including Guernsey's state senate and state house seats. `askForCandidates` and `partyProspects` in src/core2/modules/candidacy.ts skip a party that has anyone filed under its label, and `fileRunners` calls them only after the counted runners file. One draw had an ask: Fincastle, Kentucky, place seed 1115b04b61e212472b5b7e3861663fe0c085e7a1f39813e25016fef085bd1ed6, `party-asked:contest:seat:US-KY:us-house:03:2026-11-03:party:US-KY:republican:person_cf65ba8f419150f8`. Found in code: `stateParties` in src/core2/modules/parties.ts makes a party of every 2024 ballot label that `NOT_PARTIES` lets through, so "Under Votes" and "Over Votes" are parties in Wyoming and D.C. Those, and the Libertarian party in Wyoming, have no leader and no tied member (`leaderId` null, 0 ties), so `partyProspects` passes them over.

**Fix.** First, measure: draw 12 places, play 24 months each, and count partisan contests with no filer from a party that has a chair and members in town, beside Ballotpedia's share of state legislative seats with no major-party candidate (the figure in `benchmarks.json` that elections-out-party-fields-district-seats cites). If the share of uncontested district seats is far under the real one, the counted runners' weighing (`weighContest`) fields the out-party too often. Calibrate it through the weights' table, not a fixed share, so that a party with a seat to fill exists in the share of places real life has. Add "under votes" and "over votes" to `NOT_PARTIES`. Whether a minor party gets a chair and members is the parties engine's call: register it as a stopgap if it stays out.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No dice: who runs follows from each person's reasons, never a share that decides. One rule, all 56 places: no place named in logic, and "Under Votes" is removed by the label rule, not per state. Estimate, never UNKNOWN.

**Done when.** A second session runs `npx vitest run src/director/party-recruit.test.ts` on main on a fresh seed and it passes, naming the place where a party asked and the member who answered yes, and does the same for the advice test in `src/director/political-asks.test.ts`. In the running game, in a drawn place, the party list on the Politics screen shows no "Under Votes" or "Over Votes" party.

**Waits on.** Nothing.

**Files.** src/core2/modules/candidacy.ts, src/core2/modules/parties.ts, src/core2/candidate-pool.ts, src/director/party-recruit.test.ts, src/director/political-asks.test.ts

**Notes (Fable B helper, Nov 11).** Reported on issue 7365 with the failing lines: party-recruit seed fc05df1f01ced1a977b46ce3b808d796ab909bf5, line 234, "no party asked anyone in 24 months" in the first three places above; the advice test, seed a0232a9f25002e44, line 395, in Herriman, Utah, Yigo, Guam, Tabiona, Utah, Boulevard Gardens, Florida, San Roque, Northern Mariana Islands and Mountain View, New Mexico. Drawing more places in the tests is not a sure fix: each place costs 2 to 10 minutes and the tests' limit is 30 to 60.
