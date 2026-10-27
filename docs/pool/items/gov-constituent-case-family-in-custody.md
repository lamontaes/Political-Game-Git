---
id: gov-constituent-case-family-in-custody
title: "A relative of someone in custody can bring a case, and the official's call reaches the jail"
area: gov
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: effects
source: added with npm run pool -- add
---

**What.** constituent-cases.ts problemOf knows only two problems, a wage under the floor and being out of work, so no resident ever brings the office a relative in custody. The justice engine already writes justice.charged, justice.bail-set and justice.imprisoned for a named person. This item adds a family-in-custody problem for a living relative in the official's district, and a referral that reaches the justice engine.

**Rules.** No dice: a relative brings the case from their own reasons (the bring-case chooser), the official's act follows their traits. An effect is a read, not a record. One rule, all 56 places.

**Done when.** In a played year in a drawn place and seed the builder did not choose, a justice.imprisoned or justice.bail-set record for a person with a living relative in the district produces an office.approached record with problem family-in-custody, named by record id; the official's referral is read by the justice engine on a later day (a visiting access or a bail review row, by id); a test fails when the custody record is absent.

**Files.** src/core2/modules/constituent-cases.ts, src/core2/modules/justice.ts

**Notes.** Filed by Helper E. lead: effects. Packet: docs/design/scenes/from-life/constituent-family-in-custody.md.
