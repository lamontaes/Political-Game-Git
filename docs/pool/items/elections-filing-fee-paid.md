---
id: elections-filing-fee-paid
title: "Filing pays the office's filing fee from the candidate's account, from the place's filing rules"
area: elections
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: added with npm run pool -- add
lead: wire-elections
---

**What.** The owner's Oct 28 ruling (OWNER-DECISIONS line 16) reverses 'Filing: no fee or petition mechanic', and the Oct 24 'simulate it, don't ask' ruling names a fee as a mechanic to build from research. The petition line (PR #6724) built the signatures and the clerk's check; nothing charges the fee. filing-requirements.json already lists each place's fee by office family (gov-filing-fee-and-file-line, done). Filing should pay that fee from the candidate's account to the filing office's treasury through the money journal, for the player and for world candidates alike, and a candidate who cannot pay is refused at the counter with the reason on record.

**Cause.** Found in code: `src/core2/modules/candidacy.ts` line 828 ("File for a runner: no fee; the filing's petition circulates until the clerk's check") and the header of `src/core2/modules/elections.ts` (line 12) show no fee is charged; the fee data by office family is in `data/research/elections/filing-requirements.json`. Design: the owner's Oct 28 ruling in docs/coordination/OWNER-DECISIONS.md reversing "no fee or petition".

**Fix.** Post the place's filing fee from the candidate's account to the filing office's treasury through the money journal, for the player and world candidates alike. A candidate short of the fee is refused with the reason, and a place with no fee posts nothing. Update the 'files once, at no charge' test in `src/core2/elections-filing.test.ts`.

**Time box.** 4 hours for one Sonnet session.

**Rules.** No dice: whether a world candidate files with the fee due is their money and traits, never a roll. One rule, all 56 places: the fee is data per place and office; a place with no fee charges nothing. An effect is a read: the treasury's journal and the candidate's balance both read the payment. Every number in a parameter table or the filing data with its source.

**Done when.** A second session plays two drawn places with different fees (names and seeds written down) and finds the player's filing and a world candidate's filing each posting a journal entry from the candidate's account to the filing office's treasury, by record id, with the candidate's balance falling by the fee. A test shows a candidate short of the fee refused with the reason, and a place whose law sets no fee posts nothing.

**Waits on.** Nothing.

**Files.** src/core2/modules/elections.ts, src/core2/modules/candidacy.ts, data/research/elections/filing-requirements.json, src/core2/elections-filing.test.ts

**Notes.** TODO
