---
id: elections-filing-fee-paid
title: "Filing pays the office's filing fee from the candidate's account, from the place's filing rules"
area: elections
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: wire-elections
---

**What.** The owner's Oct 28 ruling (OWNER-DECISIONS line 16) reverses 'Filing: no fee or petition mechanic', and the Oct 24 'simulate it, don't ask' ruling names a fee as a mechanic to build from research. The petition line (PR #6724) built the signatures and the clerk's check; nothing charges the fee. filing-requirements.json already lists each place's fee by office family (gov-filing-fee-and-file-line, done). Filing should pay that fee from the candidate's account to the filing office's treasury through the money journal, for the player and for world candidates alike, and a candidate who cannot pay is refused at the counter with the reason on record.

**Rules.** No dice: whether a world candidate files with the fee due is their money and traits, never a roll. One rule, all 56 places: the fee is data per place and office; a place with no fee charges nothing. An effect is a read: the treasury's journal and the candidate's balance both read the payment. Every number in a parameter table or the filing data with its source.

**Done when.** In two drawn places with different fees (named with seeds), the player's filing and a world candidate's filing each post a journal entry from the candidate's account to the filing office's treasury by record id, the candidate's balance falls by the fee, a test shows a candidate short of the fee refused with the reason, and a place whose law sets no fee posts nothing.

**Time box.** 4 hours; if not done, push what exists, open the PR, write the handoff.

**Files.** src/core2/modules/elections.ts, src/core2/modules/candidacy.ts, src/core2/data/elections/filing-requirements.json

**Notes.** TODO
