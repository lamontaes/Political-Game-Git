---
id: laws-abortion-restriction-no-journal-entry
title: "A restriction on abortion reaches women but posts no journal entry (law-wiring-rights-env.test.ts, Fivepointville, Pennsylvania, replay cto1)"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: "effects thread, Nov 16, 2026, running the rights wiring test beside the privacy size change"
model: opus
effort: medium
root: none
---

**What.** `src/core2/law-wiring-rights-env.test.ts` fails with GOLDEN_PATH_SEED=cto1 in Fivepointville, Pennsylvania (place 4226232) at "restriction on abortion journal entry: expected undefined to be truthy". It fails the same on Train head a62a2fda with no other change, so it is not the privacy size test. The checks before it in the same run (the duties, the consumer data privacy law among them) pass. Seen: dev mode's reach of an abortion restriction (who the law reached), which would name women reached with no dollar that moved.

**Cause.** Needs cause. Looked at: the test's assertion at the "restriction on abortion" note (about line 470); not followed into the engine that should post the entry.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: the fix names, by record, why the women the restriction reached have no journal entry, and never loosens the test.

**Done when.** The test passes at replay cto1, and a second session in a drawn place (named, with its seed) passes an abortion restriction through dev mode and sees its reach and the money it moved on the bill card.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-rights-env.test.ts

**Notes.** Effects thread, Nov 16, 2026: `GOLDEN_PATH_SEED=cto1 npx vitest run --dir . src/core2/law-wiring-rights-env.test.ts` on a62a2fda, red.
