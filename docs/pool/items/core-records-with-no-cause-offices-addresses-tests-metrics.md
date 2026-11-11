---
id: core-records-with-no-cause-offices-addresses-tests-metrics
title: "Records with no cause kept, after the entry records: office rows, cabinet nominations and confirmations, public addresses, a school year's test results and a monthly metrics row"
area: core
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: Fable, Nov 10, 2026, measured with dev mode's Trace in five drawn places (src/bench/dev-trace-every-id.test.ts)
checked: fable 2026-11-10
---

**What.** Dev mode's Trace answers 'no cause kept' for a record that is not a decision, is dated after the start, and names nothing behind it. After the entry records (item core-entry-records-name-no-cause), the kinds seen on Nov 10 in three drawn places were: an office row such as a town board or council (offices engine), a cabinet nomination and its confirmation (they name only the nominee), a president's, governor's or mayor's address (it names only its speaker), a year's test results (school engine), an organization's owner-changed or founded event dated the first day, and one monthly row of world metrics. Each engine writes the record and knows why, and does not write the id. Example ids: office:gus2025:130731:board, tests:2024, metrics:jurisdiction_ed4f0f66a41c357f:2025-02-02 and event:organization.owner-changed:organization_3910ad604d105d62:2025-03-01. Seen: dev mode's Trace, which should give a cause for an office row, a nomination, an address and a test result where it now says no cause was kept.

**Cause.** Measured: dev mode Trace answers "no cause kept" for office:gus2025:130731:board, a cabinet nomination and confirmation and a president's address (Merrionette Park, Illinois, seed b8f2b0de6397b36c), tests:2024, metrics:jurisdiction_ed4f0f66a41c357f:2025-02-02 and event:organization.owner-changed:organization_3910ad604d105d62:2025-03-01, after 45 days in three drawn places (src/bench/dev-trace-every-id.test.ts).

**Fix.** In each writing engine (offices for office rows, nominations and confirmations; the school measures that write tests:<year>; world-metrics; executive and press for addresses; business for organization events) write the id of the record that caused it, or mark day-one records as opening. No lookup table in the tracer.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: every proof answers why, by record. One engine per mechanic: each fix is in the engine that writes the record, one small change each, never a lookup table in the tracer. Keep it simple: no new reasons are saved, only the id of the record that caused this one.

**Done when.** A second session, on main in a drawn place with a seed nobody chose, runs 45 days in dev mode and opens Trace on one record of each kind listed that the place has: each shows a cause that can be clicked, by record id, or the answer 'opening' where it was made on day one. The trace test in three drawn places, each named with its seed, counts fewer than ten 'no cause kept' answers in each place.

**Waits on.** core-entry-records-name-no-cause.

**Files.** src/core2/modules/offices.ts, src/core2/modules/school.ts, src/core2/school-measures.ts, src/core2/modules/world-metrics.ts, src/core2/modules/executive.ts, src/core2/modules/press.ts, src/core2/modules/business.ts, src/core2/state.ts, src/bench/dev-trace-every-id.test.ts

**Notes.** Example ids from the helper's runs: office:gus2025:130731:board, tests:2024, metrics:jurisdiction_ed4f0f66a41c357f:2025-02-02, event:organization.owner-changed:organization_3910ad604d105d62:2025-03-01. The cabinet and address kinds were counted in Merrionette Park, Illinois, seed b8f2b0de6397b36c.
