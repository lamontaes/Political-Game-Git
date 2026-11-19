---
id: laws-ban-the-box-reaches-the-employers-it-binds
title: "A ban-the-box law writes no record of the public employers it binds, so it reaches nobody until a hire changes"
area: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: sonnet
effort: low
root: none
source: Laws and effects (Sonnet), Nov 17, 2026, from the law-wiring regrade (row us-policy-positions:labor-workforce.ban-the-box-public-hiring, reach missing)
---

**What.** When a state or town enacts a ban on asking public job applicants about a conviction, the law is read where the jobs engine ranks applicants, and a row is written only when the ban changes who is hired. On the day the law takes effect it reaches no one on record, so the law-wiring check reads "reach missing" for the state row and the owner's bill card shows no one reached until a hire happens. Seen: the bill card's line for who the law reached, naming the public employers the ban binds.

**Cause.** Found in code: the policy row in src/core2/data/laws/reach-group-a.json has `"reaches": []`, and `MECHANICS["hiring-record"]` in src/core2/law-reach/group-a.ts is an empty list, so `applyRecords` (src/core2/law-reach/group-a-records.ts) has nothing to write when the law takes effect.

**Fix.** Give the policy one reach spec over the public employers that employ people (the same selector the public-sector bargaining row uses, `group: publicEmployers`, `employing: true`), kind compliance, and put the shared `records` handler on the `hiring-record` mechanic. The hire-time read in src/core2/jobs-record-bias.ts stays as it is. The twin-world test src/core2/jobs-record-bias.test.ts asserts the employer is on the open reach rows where the ban is in force and that no row is open where it is not.

**Time box.** 1 hour.

**Rules.** An effect is a read, not a record: the reach rows name the employers the jobs engine's hiring weigh reads, and that read is unchanged. One rule, all 56 places: the selector is the data's group, and no state or town is named. Replace, never layer: the handler is the existing records handler, not a second one.

**Done when.** A second session starts the bench at a drawn place and writes down its name and seed, opens dev mode's Bills panel, enacts the ban-the-box law at the state in force for the town, and reads the bill card: it names the town's public employers the ban binds, and repealing the law ends those rows. src/core2/jobs-record-bias.test.ts passes at a drawn place and fails at the same place with the new reach spec taken out.

**Waits on.** Nothing.

**Files.** src/core2/data/laws/reach-group-a.json; src/core2/law-reach/group-a.ts; src/core2/law-reach/group-a-records.ts (read only); src/core2/jobs-record-bias.test.ts

**Notes.** Nov 17: `jobs-record-bias.test.ts` fails with "Drive requires a learned source event and a finite strength" (drives.ts `reinforce` through speech `retellAmong`) at seed `aa11` on the clean train as well as with this change; it passes at seed `bb22` with it. The drives error is not this item's; a Red main item for it is separate. The local power rows for this law still have no starting row in any state.
