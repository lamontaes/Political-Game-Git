---
id: health-dev-mode-shows-no-business-receipts
title: "Dev mode can open a clinic's receipts by id but no screen lists a business's receipts by payer"
area: play
kind: gap
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: play
model: sonnet
effort: medium
root: none
source: traced by the Account lead while adding receipts by payer, Nov 16
claimed-at:
---

**What.** Each medical seller's latest month of receipts by payer is kept as a record and dev mode's trace opens it by its id, but no dev mode card for a business lists it. A tester has to know the id. Seen: Danville, Pennsylvania (4218136, seed ilt-danville): the trace opens clinic-receipts:organization_fe028cab4df7401d, and the business card in dev mode does not name it.

**Cause.** Found in code: `traceNode` in src/bench/dev-trace.ts finds a record by id in any module table, and dev-records.mjs lists only a person's records. Measured: the Danville clinic's receipts record opened through the trace and appeared on no card.

**Fix.** A dev mode section on a business's card lists its latest receipts-by-payer record and the outside patients' record for its town, each id opening the trace, with worded control names and no raw ids on the page.

**Time box.** 3 hours for one session of the Sonnet model at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Control names and record data only. Reads only; spends no game time.

**Done when.** A second session opens dev mode on the Danville clinic's card in a played world and reads its receipts by payer for the latest month, then follows the id to the outside patients' record.

**Waits on.** The outside-patients pull request.

**Files.** src/bench/ui/dev-records.mjs, src/bench/dev-api.ts, src/bench/data/controls.json

**Notes.** TODO
