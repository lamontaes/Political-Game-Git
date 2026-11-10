---
id: labor-record-bias-private-employers
title: "Ban-the-box covers private employers where a state's law does, not only public ones"
area: core
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: jobs
standard: 2
model: sonnet
effort: medium
root: none
source: stand-in triage of labor.json, Nov 10, 2026 (SG-LABOR-record-bias-public-only)
---

**What.** The penalty an employer puts on an applicant with a conviction, and the ban-the-box law that lifts it, are read only for public employers in the player's town. In a state whose law also covers private employers (California, Connecticut, Colorado and others) a private employer there is still free to rank a person with a record last. Make the law reach private employers where the state's row says it does.

**Cause.** Found in code: `recordBiasAt` in src/core2/jobs-record-bias.ts (line 29 to 52) returns null unless `publicPayAuthority` is set on the employer, and reads only the one law key `labor-workforce.ban-the-box-public-hiring`. The researched file data/research/executive/ban-the-box-public-hiring-2025-01.json already holds `coversPrivate` for each of the 56 places, but nothing reads it.

**Fix.** Load `coversPrivate` per place into the law data as its own position key (private-employer ban-the-box) beside the public one, registered the way the public key is (src/core2/data/laws/reach-group-a.json). In `recordBiasAt`, for a private employer in the town read that key for the town's state and lift the penalty where it is in force. Leave counted seekers and the penalty-by-employer-type size as they are (they wait on the one crime system; the row keeps those two parts). Rewrite the stopgap row to say what is left.

**Time box.** 5 hours for one Sonnet session.

**Rules.** An effect is a read, not a record: the hire made under the ban is recorded with lawApplied for a private employer exactly as for a public one. One rule, all 56 places: coverage comes from the data row of the state, never a named state. Replace, never layer: the public-only wording is deleted where it was true only of public employers.

**Done when.** A second session, in a drawn place whose state row says `coversPrivate` and a seed nobody chose (both named), opens a private employer's ranking for an opening with a seeker who has a record and sees the ban applied with lawApplied recorded by record id, and in a drawn place whose row says it does not cover private employers sees the penalty still applied there. Dev mode shows the same hire in both twins.

**Waits on.** Nothing.

**Files.** src/core2/jobs-record-bias.ts, src/core2/jobs-record-bias.test.ts, src/core2/data/laws/reach-group-a.json, data/research/executive/ban-the-box-public-hiring-2025-01.json, src/core2/data/stopgaps/labor.json
