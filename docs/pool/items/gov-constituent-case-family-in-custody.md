---
id: gov-constituent-case-family-in-custody
title: "A relative of someone in custody can bring a case, and the official's call reaches the jail"
area: gov
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/pool-gov-constituent-case-family-in-custody
pr: #8475
blocked-on:
lead: effects
source: added with npm run pool -- add
after:
standard: 2
model: sonnet
effort: medium
root: rc3-thin-life-record
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:21:55.841Z
branch: claude/pool-gov-constituent-case-family-in-custody
---

**What.** A relative of someone in custody cannot bring a case, and the official's call does not reach the jail. The constituent-cases module knows only two problems, a wage under the floor and being out of work, so no resident ever brings the office a relative in custody. The justice engine already writes `justice.charged`, `justice.bail-set` and `justice.imprisoned` for a named person. This item adds a family-in-custody problem for a living relative in the official's district, and a referral that reaches the justice engine on a later day. The scene packet is `docs/design/scenes/from-life/constituent-family-in-custody.md`.

**Cause.** Found in code: `src/core2/modules/constituent-cases.ts` `problemOf` (line 139) returns only below-floor wage and out-of-work; `src/core2/modules/justice.ts` writes `justice.imprisoned` (line 1281) and `justice.bail-set` (line 836).

**Fix.** Add a family-in-custody problem to `problemOf` for a living relative in the official's district, read from the justice custody and bail records, and a referral the justice engine reads on a later day (a visiting access or a bail review row).

**Time box.** 5 hours for one sonnet session.

**Rules.** No dice: a relative brings the case from their own reasons (the bring-case chooser), the official's act follows their traits. An effect is a read, not a record. One rule, all 56 places.

**Done when.** A second session plays a year in a drawn place and seed the builder did not choose and sees a `justice.imprisoned` or `justice.bail-set` record for a person with a living relative in the district produce an `office.approached` record with problem family-in-custody, named by record id; the official's referral is read by the justice engine on a later day (a visiting access or a bail review row, by id); a test fails when the custody record is absent.

**Waits on.** Nothing.

**Files.** src/core2/modules/constituent-cases.ts, src/core2/modules/justice.ts, docs/design/scenes/from-life/constituent-family-in-custody.md

**Notes.** Filed by Helper E. lead: effects. Packet: docs/design/scenes/from-life/constituent-family-in-custody.md.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:21 UTC) on branch claude/pool-gov-constituent-case-family-in-custody.
