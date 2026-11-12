---
id: gov-legislature-local-rules-by-place
title: "Town and county bills follow their own state's general law: who may bring an executive's bill, and how ordinances are numbered"
area: gov
kind: stopgap
priority: 3
size: M
status: dropped
claimed-by:
pr:
blocked-on:
standard: 2
model: sonnet
effort: medium
lead: governing
root: rc9-place-facts-one-default
source: added with npm run pool -- add
after:
checked: fable 2026-11-10
---

**What.** proposalRight in src/core2/modules/legislature.ts gives every mayor and county executive one national rule (a member carries the executive's bill at the executive's request), and bodyNumbering in src/core2/legislature-bill-form.ts numbers every town's and county's ordinances by year and order with one national template. The research of Oct 23, 2026 holds each place's general-law default for all 56 places: data/research/gov/local-executive-introduction-2026.json gives a mode per place (by-request, member where the mayor sits on the council as a voting member, presides where a county executive presides over the board, none where general law has no elected executive), and data/research/gov/local-ordinance-style-2026.json gives the numbering a place's law or rules set. Read the drawn place's row by the postal code in lawChain(api).stateKey: proposalRight returns its mode (a member-mode mayor moves the bill as a member instead of asking one), and bodyNumbering uses the row's numbering template and period where it is SOURCED. Keep SG-GOV-local-executive-proposal and SG-GOV-local-bill-numbering open for charter places and ESTIMATED rows.

**Cause.** Found in code: src/core2/modules/legislature.ts function proposalRight (line 3409) and src/core2/legislature-bill-form.ts function bodyNumbering (line 52) apply one national rule; data/research/gov/local-executive-introduction-2026.json and data/research/gov/local-ordinance-style-2026.json exist and no source file reads them; stopgaps SG-GOV-local-executive-proposal and SG-GOV-local-bill-numbering are open.

**Fix.** Read the drawn place's row by postal code (lawChain(api).stateKey): proposalRight returns the row's mode and bodyNumbering uses the row's template and period where SOURCED. Keep both stopgaps open for charter places and ESTIMATED rows. Also take from the dropped gov-standin-legislature-committees its two local rows.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the mode and numbering come from the drawn place's row in data, keyed by postal code, never a state named in logic. No dice: the member mode changes who may move a bill, never a chance; the executive still decides from their own position on it. No hand-written player text: the enacting clause wording is the Words item words-local-enacting-clause-by-state, not typed into code.

**Done when.** A second session, in a played world (buildBenchWorld) in a drawn place from all 56 with a seed the builder did not choose, finds a town body's ordinance carrying the number its place's row gives (bill record id named), and the tests in src/core2/legislature.test.ts show an executive in a member-mode place moving a bill as a member while one in a by-request place has a member carry it (carry record id).

**Waits on.** Nothing. words-local-enacting-clause-by-state changes the local branch of the same function, `bodyNumbering` (the enacting clause by place): merge main in before pushing, and if it has merged, read the place's row once for both the clause and the numbering.

**Files.** src/core2/modules/legislature.ts, src/core2/legislature-bill-form.ts, src/core2/data/legislature/executive-proposal.json, data/research/gov/local-executive-introduction-2026.json, data/research/gov/local-ordinance-style-2026.json

**Notes.** TODO

Deferred Oct 25: nothing on screen reads it yet. Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). Each place's rule for who carries a mayor's bill and how ordinances are numbered; the national rule already plays.
