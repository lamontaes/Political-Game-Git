---
id: world-accounts-api
title: "World engines move money through the accounts API"
area: world
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/world-accounts-api
pr: #5176
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at: 2026-10-19T21:58:11.349Z
---

**What.** Business, credit and housing money flows still bypass `api.accounts()` (credit reads only `bankDepositLiability`; business uses only `accounts().main`; housing, jobs, macro and regional never touch it). Open named funds with `accounts.open`, move money with `accounts.transfer`, schedule payments with `accounts.addObligation`, and report in the PR anything the API lacks. The API's missing pieces are reported in the PR so the core session can add them.

**Rules.** Wire to the world; every dollar balances; an effect is a read.

**Done when.** A one-year run of the played world (buildBenchWorld, a drawn place from all 56) shows funds opened and transfers made by WORLD modules on the ledger by journal record id, and the M0-09 test passes without patching the core.

**Files.** src/core2/modules/business.ts, credit.ts, housing.ts

**Notes.** core.md line 178; GOV already uses the API (budgets, official-pay, law-reach, retirement-claims). Checked Oct 15.
