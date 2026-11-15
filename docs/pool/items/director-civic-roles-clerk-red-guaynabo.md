---
id: director-civic-roles-clerk-red-guaynabo
title: "The civic-roles test finds no clerk at Guaynabo, Puerto Rico: expected 0 to be greater than 0"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: design-story-director
lead: director
source: Account lead thread "Voter registration as a record", Nov 14
claimed-at:
---

**What.** `GOLDEN_PATH_SEED=c6144eded094d3de npx vitest run src/director/civic-roles.test.ts` draws Guaynabo, Puerto Rico (place key 7232522) and fails `fills the clerk with the person the filing office's records name` with `expected 0 to be greater than 0`. It fails the same way on the clean train head 5fe71dec7a and on the voter registration branch. Seen: in the clerk a filing scene is cast with.

**Cause.** Needs cause. Measured: the seed above in that drawn place, red on the clean train; the test finds zero clerks.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the test draws a place from the 56 and prints its place and seed. Never loosen a test to get green; pin it to a named place and seed as `pinned-tests` says. Wire to the world: the clerk is read from the filing office's own records.

**Done when.** A second session runs the command above on main in the drawn place (Guaynabo, Puerto Rico, place key 7232522, seed c6144eded094d3de) and the clerk test passes there and at two other named places pinned in the test file, and the cause is named in Notes by record id.

**Waits on.** Nothing.

**Files.** src/director/civic-roles.test.ts, src/core2/modules/filing-clerk.ts

**Notes.** Found while gating the voter registration record.
