---
id: industry-1c-neighbors-fill-the-plant-their-town-hosts
title: "A plant larger than its town is filled by neighbors who drive in, and the plant other towns drive to is one named business"
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: industry-1-largest-employers-sized-from-county-establishments
blocked-on:
root: none
lead: jobs
model: opus
effort: medium
source: "owner, Nov 15 21:09Z (a town where everyone works at the power plant and it closes); Account lead's ruling 21:19Z (PR B, its own item, the very next PR after industry-1)"
---

**What.** With industry-1 a county's mine or plant stands whole in one town, but the town's own working residents are all that can fill it: a 1,000-seat mine in a town of 1,800 opens with a few hundred staff, and in the next town over the residents who drive to that mine work for a nameless outside account in a county-mix role. Owner, Nov 15 21:09Z: "that power plant closes, and then that town" (21:09Z). Seen: the Jobs screen and the employer's card in the host town (staff near its seats), and a commuter's card in a neighboring town naming that same plant; dev mode's Trace of a closing reaching both towns.

**Cause.** Found in code: `fillTownJobs` (src/core2/opening-town-jobs.ts) and `openingEmploymentFromRecordedRoles` (src/core2/opening-employment.ts) hire only the town's residents, and no record brings a worker in from outside; `commuterRole` (src/core2/modules/jobs.ts:1210) gives an out-commuter a role of the county mix at the place's outside-market organization (`OUTSIDE_MARKET_KIND`, src/core2/modules/residents.ts:3878), never at a business that stands in another place.

**Fix.** One rule read by both sides, with no second engine: the county's large establishments (`countyLargeEstablishments`, src/core2/town-employment-mix.ts) are the county's shared employers. In the host town, the seats its residents leave empty are held by counted in-commuters (the residents engine's counted jobs, at the plant, paid by the plant's books). In any other town of the county, an out-commuter whose role is in a large establishment's sector works for that establishment's business record (made once, at its host place, by the same opening the host town uses), so a closing reaches both towns through one record.

**Time box.** 4 hours, Opus, medium.

**Rules.** One model, two tiers: an in-commuter is a counted worker read by every engine as a full one, times its count. Wire to the world: the plant's payroll is paid from its own books to people in more than one town. No dice: who commutes follows the seats and the county mix, never a roll.

**Done when.** A test pinned to Wright WY (5685015, seed industry-1-a) shows the mine's staff within its seats and above 90% of them, and a test pinned to a neighboring Campbell County place shows its commuters to mining work for that same business record, by id. Year 1 and time per record at three places with and without, twice a side, alternated. A second session sees at a drawn place it names with its seed that the largest employer's card counts staff from outside the town.

**Waits on.** industry-1.

**Files.** src/core2/opening-town-jobs.ts, src/core2/opening-employment.ts, src/core2/modules/jobs.ts, src/core2/modules/residents.ts, src/core2/town-employment-mix.ts and their tests.
