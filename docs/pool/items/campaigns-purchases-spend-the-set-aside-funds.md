---
id: campaigns-purchases-spend-the-set-aside-funds
title: "A campaign's ads, polls and mail spend the money it set aside for circulators, then the journal refuses the circulators' pay"
area: elections
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by:
pr: #9318
after:
blocked-on:
lead: elections
model: sonnet
effort: low
root: design-words-machine
source: Account lead, Nov 14 2026 (cause found at the speech-afterward seed)
claimed-at:
checked: account-lead 2026-11-14
branch:
---

**What.** A played year stops with "Invalid nonnegative integer journal amount: owner after": a campaign owes its circulators more than its account holds. At Tutu, U.S. Virgin Islands (key territory:VI:tutu, world seed e138064a9983ccabb695d23b1ff13dde8995ef6cf374d1edc2dfd5df3b133d47) on 2026-05-09 the US-VI at-large seat 13 official campaign held 573 minor and owed 1,430, having set aside 504 for an event, 221 for a poll and 6,435 for circulators; most of that money went to evenings out (fixed in campaign-event-ignores-set-aside-money), and the ad, mail and poll paths could take it the same way (shown at I Liyang, Northern Mariana Islands, in campaign-set-aside.test.ts: an ad and mail bought with all the campaign can left 0 in the account against an 8,195 fund). Seen: the played year stops; with the fix a player's rival campaigns keep paying their circulators and run on.

**Cause.** Found in code: src/core2/modules/campaigns.ts `freeMinor` is what a campaign holds and has not set aside (raised less spent less the event, poll and circulator funds), and `hireCirculators` and the day's turn budget from it, but `runAd`, `commissionPoll` and `sendMail` each budgeted from `raisedMinor - spentMinor`, so a purchase spent the circulators' fund and their pay later fell due with the cash gone.

**Fix.** Every purchase budgets from `freeMinor` (a poll adds its own fund); the evening out's offer was fixed separately in campaign-event-ignores-set-aside-money (`eveningMoneyMinor`); the circulators' pay needs no clamp because the account then always holds what the funds promise. Delete nothing else; add no new tracking.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Money moves only through the existing accounts and the journal, never clamped or skipped to hide an overdraw. One rule, all 56 places: no place is named in logic and the test pins a drawn place and seed. Wire to the world: every campaign purchase path reads the one figure.

**Done when.** A second session plays Tutu, U.S. Virgin Islands, from the seed above past 2026-05-09 in a drawn place's world and sees every rival campaign's circulators paid with no journal error; a test pinned to I Liyang, Northern Mariana Islands (seed 9a002270…) and about a minute long shows an ad and mail bought with everything leave the circulators' fund in the account, and fails on the Train head without the change; the PR body gives year 1 and time per record at three places with and without.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/bench/campaign.ts, src/core2/campaign-set-aside.test.ts

**Notes.** Filed Nov 14 by the Account lead. The speech-afterward test (src/director/speech-afterward.test.ts) hit it at its drawn seed ecd28aa5c524d71bea0b3b25208b3f7a3e316826, third place; the same fault shows at I Liyang MP per the filing-fee builder.
