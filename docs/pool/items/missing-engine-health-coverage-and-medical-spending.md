---
id: missing-engine-health-coverage-and-medical-spending
title: "Households pay health premiums and medical bills, and a person's coverage (employer, Medicaid, none) sets what they pay"
area: people
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after: people-coverage-record-monthly-pass,people-coverage-counted,world-medical-spending-categories,gov-medicaid-coverage-reader
source: added with npm run pool -- add
claimed-at:
lead: laws-effects
model: sonnet
effort: low
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
---

**What.** This is the roll-up for health spending in core2, which had none: living costs carried only drugs and medical supplies. It is built by four items: a coverage record for each person with a monthly premium flow (people-coverage-record-monthly-pass, done), the same coverage share for counted households (people-coverage-counted, done), the BLS Consumer Expenditure health insurance and medical services lines bound to household flows (world-medical-spending-categories, in a PR), and the Medicaid expansion reader that gives eligible adults a coverage record and a lower bill (gov-medicaid-coverage-reader, open). When the last two are done this item is closed by checking the whole chain once in the played world: law row, eligibility, coverage record, premium and out-of-pocket flow, and the household's cash. Seen: the premium and medical-bill lines in a household's budget.

**Cause.** Found in code: stopgap SG-GOV-REACH-B-medicaid-coverage is open in src/core2/data/stopgaps/gov.json (line 602), and the household medical flow in src/core2/modules/health.ts does not yet read the coverage record the law reach writes.

**Fix.** Do not build here. After gov-medicaid-coverage-reader and world-medical-spending-categories merge, check the chain once: a named low-income adult has a coverage record and a lower out-of-pocket line than an uncovered neighbor, and a counted group shows the same.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The chain is the acceptance: the roll-up closes only when one Medicaid law is followed to a named person's lower bill and cash. One model, two tiers: counted groups pay and are covered by the same rule as full people times their weight. An effect is a read: the household medical flow in src/core2/modules/health.ts must read the coverage record that the law reach wrote. No dice: coverage follows age, income, job, the law in force and the state.

**Done when.** A second session, not the builder, plays a one-year world (buildBenchWorld, a drawn place from all 56, a seed nobody chose) with a Medicaid expansion law in force and sees a named low-income adult and a counted group with a coverage record, a medical out-of-pocket line below an uncovered neighbor's by record id, and a balanced cash journal. A test in src/core2/health-own.test.ts or src/core2/health-web.test.ts proves it, and SG-GOV-REACH-B-medicaid-coverage is closed with the reader named.

**Waits on.** gov-medicaid-coverage-reader (open), world-medical-spending-categories (in a PR).

**Files.** src/core2/modules/health.ts, src/core2/reference/living-costs-data.ts, src/core2/law-reach/group-b.ts, src/core2/data/stopgaps/gov.json, src/core2/health-own.test.ts

**Notes.** Oct 20 (pool feeder): spec written as a roll-up; the four children already exist as pool items. laws-reach-b-medicaid-coverage looks like a duplicate of gov-medicaid-coverage-reader (same Medicaid reader) and is itself blocked on this item, so it is left out of after: to avoid a cycle; the lead should drop or re-point it.

Deferred Oct 25: nothing on screen reads it yet.

**Notes.** Split Oct 20 (claude, claude/fs11vb-health-coverage) into three items in this order: people-coverage-record-monthly-pass (coverage record and a monthly premium flow), world-medical-spending-categories (the BLS Consumer Expenditure health lines as an out-of-pocket flow; waits on the first) and gov-medicaid-coverage-reader (the Medicaid law reach reads and lowers the bill; waits on both). This item is done when all three are. Why it is not small: `living-costs-data.ts` says health premiums and medical services await separate bindings, and a premium needs a payee (an insurer in town or the outside account), a journal source and the same rule for counted groups, which runs through opening-customers.ts and the residents flows.

Sent back 2026-10-23 from PR #5450 (branch claude/health-split): The proposed people-health-coverage-reader duplicates existing gov-medicaid-coverage-reader in this roll-up; consolidate the same eligibility-to-lower-bill chain and reconcile spending with world-medical-spending-categories; both local gates passed but pinned merges hit fresh index conflicts; finish on that branch, merge main into it first.

**Notes (pool redo, Nov 10).** No part files were created: the brief's three "parts" are checks on the two open children, which already exist and are named in Waits on.
