---
id: director-civic-roles-clerk-red-guaynabo
title: "The civic-roles test finds no clerk at Guaynabo, Puerto Rico: expected 0 to be greater than 0"
area: director
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: thread cluster 29 part 3
pr: 9397
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

**Cause.** Found in code: in `src/director/civic-roles.test.ts` the failing line is the test's own premise, `expect(contests.length).toBeGreaterThan(0)` on `openContests(api)` a year into play, not the clerk. Guaynabo's 47 contest records (`contest:seat:US-PR:...:2028-11-07`, `contest:seat:municipio:72061:board:0:2028-11-07` and the rest) all belong to Puerto Rico's four-yearly general election of November 7, 2028, with filing windows from 2028-06-15 to 2028-08-14, so on 2026-01-20 no window is open and the list is empty. The world is right; the test assumed every place has a race open for filing in any year.

**Fix.** The clerk check reads the races a filing is taken for: those open now, else those whose filing window opens next (`filingWindowOpens`, the one rule for when filing opens). A clerk is named by the filing office's records whether or not the window is open (`filingClerkFor`). The check also runs at three pinned places on the day the game starts: Guaynabo PR (7232522), Edgar WI (5522550) and Denver PA (4218888).

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the test draws a place from the 56 and prints its place and seed. Never loosen a test to get green; pin it to a named place and seed as `pinned-tests` says. Wire to the world: the clerk is read from the filing office's own records.

**Done when.** A second session runs the command above on main in the drawn place (Guaynabo, Puerto Rico, place key 7232522, seed c6144eded094d3de) and the clerk test passes there and at two other named places pinned in the test file, and the cause is named in Notes by record id.

**Waits on.** Nothing.

**Files.** src/director/civic-roles.test.ts, src/core2/modules/filing-clerk.ts

**Notes.** Found while gating the voter registration record.
