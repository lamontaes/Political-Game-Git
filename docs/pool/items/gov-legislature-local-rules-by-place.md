---
id: gov-legislature-local-rules-by-place
title: "Town and county bills follow their own state's general law: who may bring an executive's bill, and how ordinances are numbered"
area: gov
kind: stopgap
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** proposalRight in src/core2/modules/legislature.ts gives every mayor and county executive one national rule (a member carries the executive's bill at the executive's request), and bodyNumbering in src/core2/legislature-bill-form.ts numbers every town's and county's ordinances by year and order with one national template. The research of Oct 23, 2026 holds each place's general-law default for all 56 places: data/research/gov/local-executive-introduction-2026.json gives a mode per place (by-request, member where the mayor sits on the council as a voting member, presides where a county executive presides over the board, none where general law has no elected executive), and data/research/gov/local-ordinance-style-2026.json gives the numbering a place's law or rules set. Read the drawn place's row by the postal code in lawChain(api).stateKey: proposalRight returns its mode (a member-mode mayor moves the bill as a member instead of asking one), and bodyNumbering uses the row's numbering template and period where it is SOURCED. Keep SG-GOV-local-executive-proposal and SG-GOV-local-bill-numbering open for charter places and ESTIMATED rows.

**Rules.** One rule, all 56 places: the mode and numbering come from the drawn place's row in data, keyed by postal code, never a state named in logic. No dice: the member mode changes who may move a bill, never a chance; the executive still decides from their own position on it. No hand-written player text: the enacting clause wording is the Words item words-local-enacting-clause-by-state, not typed into code.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body), a town body's ordinance carries the number its place's row gives (bill record id named), and tests in src/core2/legislature.test.ts show an executive in a member-mode place moving a bill as a member while one in a by-request place has a member carry it (carry record id), with the place read from the research row.

**Files.** src/core2/modules/legislature.ts, src/core2/legislature-bill-form.ts, src/core2/data/legislature/executive-proposal.json, data/research/gov/local-executive-introduction-2026.json, data/research/gov/local-ordinance-style-2026.json

**Notes.** TODO
