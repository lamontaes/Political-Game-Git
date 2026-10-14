# OPUS-GOV builder status

The pillar's own checklist and log stay in `gov.md`. This file holds the status of builders working under OPUS-GOV on separate branches.

## Justice

Branch `gov/justice-small`. Owner's order, October 14, 2026: "Courts, trials, prisons: build a small version. Conceptually get it working, especially for the background, and allow for the player."

### Checklist

- [x] A real bribe in the played world: an employers' group lobbyist weighs offering one to each member the group meets before a vote.
- [x] Prosecutors per county and state from the offices data, with a registered stand-in where the data has none.
- [x] Complaints: an official who refused a bribe, or someone told of one, decides whether to report it.
- [x] Investigation: the prosecutor weighs evidence, the corrupted office's prominence and their own party; complaints against the same person join one investigation; it follows the payments on the books.
- [x] Charge and plea: no charge, a plea or a trial, from evidence, the defendant's money and the prosecutor's record.
- [x] Trial on a date from the state's time to disposition; verdict from evidence against the defense.
- [x] Sentence from the state's range: fine to the treasury on the journal, probation or prison.
- [x] Prison: jobs end, seats vacated, no choices until release; release with the record, read by the candidacy inputs as a scandal.
- [x] The player: hearing and verdict scenes through the director's data; days run without choices in prison.
- [ ] A background year with a full chain: the only background bribe route is the employers' lobby on a minimum-wage bill, and no background body proposes one (see "Needs").

### What the owner can play now

On the bench, a player who offers bribes to council members can be reported by one who refuses, charged, and tried. The charge and the verdict open scenes in the player's story. A prison term then runs with the world going on and no choices for the player, and the player comes back with the conviction on record. A player on the council who proposes a minimum-wage raise draws the employers' lobby, whose lobbyist may now offer the members a bribe.

### Needs from other sessions

- OPUS-GOV pillar (legislature, interest groups): background bodies propose no bill with money at stake. Only the player's minimum-wage proposal creates an employers' lobby, so the background world offers no bribes. Background proposals of amounts (minimum wage where local authority allows, budget lines with vendors) would give corruption a cause in every place.
- OPUS-WORLD (jobs): skip people in custody when deciding who looks for work and whom an employer hires. Until then the justice engine clears a prisoner's new job before its first shift (SG-GOV-justice-prison-hiring).
- OPUS-CORE: a call for a module to take a person's own choices away for a time (custody), instead of the direct write in `justice-custody.ts` (SG-GOV-justice-custody-core-call).
- OPUS-PEOPLE (health): read the custody record (`inCustody` in `src/core2/modules/justice.ts`) for prison's effect on health; death in prison stays the health engine's call.
- OPUS-PEOPLE (words): mined-bank subjects for the `hearing` and `verdict` situation types and for the `justice.*` events.

### Sub-agents

One read-only Explore helper mapped the director's situations, the player stop and the bench's year runners. No sub-agent wrote code.
