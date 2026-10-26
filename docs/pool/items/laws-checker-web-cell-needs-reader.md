---
id: laws-checker-web-cell-needs-reader
title: "The law matrix grades a law's outcome-web link wired only when an engine reads the outcome it moves"
area: laws
lead: laws-effects
kind: wiring
priority: 2
size: S
status: blocked
claimed-by:
pr:
blocked-on: laws-matrix-unread-outcome-grades-wired
source: laws-effects lead, Oct 26 (Merger 2's send-back on #6026)
---

**What.** scripts/law-wiring/matrix.ts grades a law's web link wired when any of its outcome-web links fired in the run (webLink, the fired branch). It does not ask whether an engine reads the outcome the link moved. So snap-maximum grades wired from the web's monthly ledger rows for household.food-insecurity, which src/core2/data/outcome-web/unwired.json lists as read by no engine (SG-WEB-unread-household-food-insecurity). Merger 2 sent PR #6026 back for it on Oct 26. Other laws whose only fired links are listed in unwired.json are graded the same way, so main's count of laws wired is too high by an unknown number.

**Rules.** An effect is a read, not a record (owner, Oct 13): a web cell is wired only when a different engine reads the outcome at the moment it decides or pays. One checker for laws and effects (owner, Oct 26): the law matrix reads the effect matrix's own verdict, unwired.json, instead of judging reach a second way.

**Done when.** In scripts/law-wiring/matrix.ts, a fired or lagged web link whose link id is listed in src/core2/data/outcome-web/unwired.json no longer counts toward a wired web cell; a law whose every such link is listed grades its web cell stopgap, naming the listed stopgap id. A test in scripts/law-wiring (own-payments.test.ts or a new matrix test) fails without the change on a synthetic run where only an unread link fired. The matrix regenerated on main with node --import tsx scripts/law-wiring/matrix.ts docs/reports/law-wiring/US-*.json docs/reports/law-wiring/families/*.json lists, in the PR body, every law whose overall grade changed and the new count of laws wired of 89.

**Time box.** 3 hours, Sonnet, no helpers; it builds against nothing and waits only for #6011 to merge.

**Files.** scripts/law-wiring/matrix.ts, src/core2/data/outcome-web/unwired.json, docs/reports/law-wiring-matrix.json, docs/reports/law-wiring-table.md

**Notes.** Laws-effects lead, Oct 26. Built after the four laws family PRs (#5986, #6026, #5669, #6011) are on main, so it regrades every family once.

Laws-effects lead, Oct 26 19:05 UTC: a duplicate of laws-matrix-unread-outcome-grades-wired (PR #6173), filed the same hour by another session. Blocked on it; the CTO may drop this one.
