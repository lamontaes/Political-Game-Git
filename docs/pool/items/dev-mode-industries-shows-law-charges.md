---
id: dev-mode-industries-shows-law-charges
title: "Dev mode's Industries page shows what each business paid under each law or tax, month by month, with the law behind it"
area: play
kind: feature
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: industries thread (Account lead)
pr:
after: dev-mode-industries-page
blocked-on:
root: none
lead: jobs
model: opus
effort: medium
source: "Owner, Nov 16 00:59Z (cmsg_01TQLdz583SA7sRfRB4dFowZ3UgS4n8K2932PQhmyxdRRh: what is traced must be traceable in dev mode) and 01:58Z (industries: payroll, taxes and law changes must reach them); the layoffs thread's #9629 records each month's charges"
---

**What.** Dev mode's Industries page showed one "Law duties" figure per business month (compliance only), so a payroll tax, property tax, energy law, health premium or profit tax a business paid could not be seen or traced to its law in the game. Seen: the Industries page on #9631's head, any town.

**Cause.** Found in code: src/bench/dev-industries.ts `industryBusiness` read only the trading row's `complianceMinor`; #9629 added the row's `charges` (kind, amount, law ids, weighed) and `staff`, which nothing on the page read.

**Fix.** `industryBusiness` reads the trading row's law and tax charges and its staff; the months table replaces "Law duties" with "Laws and taxes paid" (each kind, its amount, "not weighed" for profit tax, and each law id opening in Trace) and adds Staff. The player sees it in dev mode's Calendar, Industries panel, a business's months.

**Time box.** 2 hours; if not done, push what exists, open the draft PR and write the handoff in Notes.

**Rules.** Every effect can be triggered and traced in dev mode: each charge links to the law row that caused it. A view that computes its own version of a fact is a duplicate: the page reads the trading row's charges as kept.

**Done when.** In a played life, a business's months on the Industries page list what it paid under each law or tax with links that open the law in Trace, matching the trading record; a second session sees it in the running game at a drawn place.

**Waits on.** #9629 (accepted 37035bb8).

**Files.** src/bench/dev-industries.ts, src/bench/ui/dev-industries.mjs, src/bench/dev-views/industries.ts, src/bench/dev-industries.test.ts, src/bench/dev-industries.browser.mjs
