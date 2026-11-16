---
id: world-medical-bills-outside-the-sellers-jurisdiction-go-outside
title: "Households in a town's other jurisdictions are billed to the outside account, not to the town's clinic"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: money
model: opus
effort: medium
root: none
source: traced by the Account lead from the clinic trace, Nov 16
claimed-at:
---

**What.** A town's households sit in several jurisdictions but its medical sellers sit in one, and a household is billed only to a seller in its own jurisdiction. The rest are billed to the outside account, so their care money leaves the town. Seen: Danville, Pennsylvania (4218136, seed ilt-danville): 13,068 households were billed at 40 days in three jurisdictions (6,835, 4,050 and 2,183), and the one clinic sits in the 2,183.

**Cause.** Found in code: `medicalSellers` in src/core2/medical-bills.ts keeps only organizations whose placeId equals the household's, and `billMedicalCare` falls back to `outsideAccountOf` when there is none. Measured: every one of the 13,068 bills at 40 days named the outside account as its seller before the clinic's line was held.

**Fix.** A household's seller is found through the town's place family (the jurisdictions of one town), by the same lookup other engines use, and the outside-patients sizing reads the same family so the two never count one household twice.

**Time box.** 4 hours for one session of the Opus model at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice. One rule for all 56 places. Unattended-world timing at three places, with and without, twice each side.

**Done when.** A second session builds Danville (place 4218136, seed ilt-danville) through buildBenchWorld in a played world and sees, by record id, the bills of all three jurisdictions' households paid to sellers in the town, not to the outside account.

**Waits on.** The outside-patients pull request.

**Files.** src/core2/medical-bills.ts

**Notes.** TODO
