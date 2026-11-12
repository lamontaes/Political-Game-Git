# Lane 1: Run and govern (85 items)

**What the player gets.** A new life in any town files for one race, runs a campaign that's a real contest, and can actually win. Then they take the seat, write a bill, bargain for votes, see it pass or fail, click a person it reached, and get judged on it at the next election. Mayor and up follow. Today a new life files, campaigns and usually loses; only two New Game wins exist, both on test branches, and both first bills failed 1 to 4.

**Finish line: 14 played paths**

1. **One race, one deadline.** Start: New Game, Haleyville; Johnson, Minnesota for the petition. See: one race offered, only while filing is open; an at-large council as one pooled race; the clerk and the panel give the same date; a petition smaller than the town.
2. **A real contest.** Start: New Game in all eight towns. See on election night: holders near the real 58% of a two-way vote, not 86%; holders losing some contested races; more open and contested seats. Real rates check totals and never pick a winner. A hard-working first-timer wins within three tries in most towns (owner, Nov 3).
3. **A yes becomes a vote.** Start: Murray, knock doors. See: your door count on Campaigns, and the race's record showing people who promised voted more than neighbors (today 17% against 19%).
4. **Campaign money.** Start: Storrs. See: named neighbors giving; press people near a tenth of the money, not 44.6%; press people still solvent after a year.
5. **Every act is a scene.** Start: Brookside, after filing. See: donor calls, volunteers, endorsement, ad, poll, mail and your own money each open a scene; a second Poll click gets an answer.
6. **Win and take the seat.** Start: Murray. See: the win, the swearing-in, Your office appearing, and months closing with no crash.
7. **Write a bill.** Start: seated, Meadow Lakes. See: a bill on paper, a true cost note, a banned option naming the state law, a raise in dated steps, citations that match.
8. **Bargain.** Start: seated, Brookside. See: asks only on bills that reach a vote; colleagues' two stakes; changing the bill to win a vote; a co-sponsor's promise, firm or vague; your aide's estimate; deals told in the Journal.
9. **A first bill can pass.** Start: seated from New Game in four towns. See: a floor vote, and at least one bill passing with bargaining. Nobody has measured this yet.
10. **A law on a card.** Start: after a pass. See: a person it reached shows it, and what it cost them.
11. **The next election uses the record.** Start: run again, Haleyville. See: your record on Campaigns, a rival's ad quoting a real vote, a voter's reason citing it, a favor called in.
12. **Mayor's year.** Start: as mayor, Meadow Lakes. See: the budget as your stop, speaking at the hearing, a signing, a veto, appointing someone you know, an emergency reaching you.
13. **Up the ladder.** Start: as a state legislator, then governor. See: no crash seating a governor, committee stops, a governor's budget and cabinet.
14. **The whole game (you can play this one).** Start: New Game, Haleyville and Murray, then a town you pick. See: steps 1 to 11 with no developer start and no crash.

**The work, in order** (all ids listed in the audit under these bundle names)

1. **Beatable incumbents** (3 items, 6-9 h; two branches save 6-9). A small edge moves a few points. `elections-counted-vote-splits-by-share`, `campaign-incumbency-calibrated`, `elections-candidate-draws-zero-votes-diaz`. Branches `governing/counted-vote-share` and `governing/incumbency-calibration`. "827 commits behind" overstates it; only 3 main commits touched the files.
2. **Right race** (6 items, 8-10 h). `campaign-player-files-for-one-council-race` (#7085, two tests), `elections-filing-window-opens`, `elections-petition-larger-than-the-town`, `filing-clerk-deadline-differs-from-rules`, `gov-filing-counter-clerk-at-county-board`. `campaign-platform-follows-agreement` is at the desk (#7104).
3. **Money finish** (4 items, 4-5 h now, 6-8 later). `people-press-staff-households` (#7135) ships with `people-press-out-of-town-staff-paid`. Later: `campaign-donor-reasons-refit`. Also the donor call list, which has no item.
4. **Yes becomes a vote** (1 item, 3-4 h). `campaign-door-pledge-turnout-total`.
5. **Seats open up** (2 items, 5-9 h; test on `claude/local-races-closeout` saves 1). `elections-local-races-too-uncontested`. File the missing item on holders rerunning (94% against 58 to 80%), and the counted voters' turnout gap of 0.15 from Report E.
6. **Year keeps running** (1 item, 3 h). `gov-treasury-close-journal-amount-invalid`.
7. **Last campaign acts** (1 item, about 6 h; `play-first/play-campaign-poll-scene` saves 1.5). `play-campaign-acts-as-scenes`.
8. **Measure** the fixed towns (machine time). Then again after each big change.
9. **First bill** (12 items, 21-26 h; `governing/ask-skips-held-bills` saves 3). `legislature-ask-skips-bills-the-committee-will-hold`, `gov-m3-02-two-stakes-in-a-played-world`, `gov-m3-02-amend-and-endorsement-deals`, `gov-fiscal-note-every-step`, `play-officeholder-hires-aide`, `play-draft-phase-in-steps`, `words-blocked-bill-names-the-state-law`.
10. **Law you can click** (1 item, 3 h). `gov-m3-04-person-card-law-effects`.
11. **Running on your record** (no items exist, about 8-12 h, my estimate). Attack ads run, Campaigns shows the record, favors get called in. This is step 11 of your path, and nobody has filed it.
12. **Real race** (5 items, 3-6 h; two branches save 5-6). `campaign-like-real-races`, `campaign-incumbent-hears-the-race`, `groups-exist-before-any-vote`. It makes winning harder, so re-measure after.
13. **Mayor's year and the executive's desk** (14 items, 22-30 h). `office-the-budget-season`, `gov-m3-05-player-signs-one-vetoes-another`, `world-governor-declares-emergency-in-play`, `corruption-bribe-offer-reaches-player-seat`. Don't revive `claude/budget-held-send`; it is the auto-send you objected to.
14. **Small truths** (7 items, 8-10 h). `campaign-standing-reads-only-this-contest`, `elections-past-race-names-the-district`.
15. **Up the ladder** (3 items, 22-32 h). `gov-seated-governor-appointment-job-ends` first.
16. **Recalls, filing fee, orientation, leftovers** (6 items, 14-20 h). `elections-recall-counted-whole-weight`, `elections-filing-fee-paid`, `research-new-member-orientation-distilled`.

**Not in the pool, file at claim:** co-sponsor promises, aide's estimate, asking a colleague whenever you choose, close-vote stops and the booked calendar, everyone voting in each district seat's race. Most of the Oct 29 Phase B plan's 26 units were never filed.

**Close:** 1, `gov-next`, a roll-up whose parts closed. **Drop 3:** who sold the mailer (nobody sees it), research for one calendar date, a developer-start-only fix. **Later 14:** recounts, a platform statistics band, prison-town voters, polling places by building, territories' past results, 3 research items, 3 presidency items, the player's plea, wider-race candidates. **Slim 4:** keep the volunteer join record; one command instead of the five-place ceremony; keep only the stop at the hearing; drop the city-staff proof that failed about eight times.

**Out of scope:** playing president (after; AGENTS.md), courts, writing a ballot measure, starting a business (1.0), other governments passing laws (Lane 2), the lines themselves (Lane 3).

**Owned files:** `src/core2/modules/{campaigns,voting,candidacy,elections,legislature,executive,office-day,offices,filing-clerk,staff,recalls}.ts`, `src/core2/electorate.ts`, `scripts/core2-year/incumbency-totals.ts`.

**Handoffs** (each in `docs/lanes/agreements/`, written before touching shared files):

- **Lane 2,** `1-2.md`, owner Lane 1. How bills move and how the crowd votes. Check: a council, a state and a Congress bill each reach a vote through one engine.
- **Lane 3,** `1-3.md`, owner Lane 1. Records Lane 3 reads. Stand-in: records in test files. Check: a scene fires in a played race.
- **Lane 4,** `1-4.md`, owner Lane 4. Controls added in the game screen. Check: the filing and office browser checks.
- **Lane 5,** `1-5.md`, owner Lane 5. What may be folded. Check: a re-election still finds folded races, and the year stays within 20%.

**Open-work limit:** 3 to 5 open pull requests; untouched for 48 hours means merged, sent back or closed.
**Stop rule:** all 14 paths pass on main, confirmed by a non-builder, nothing critical set aside, even if Later items remain. Then take other lanes' open items and invent nothing.
**Status line:** "0 of 14 played paths confirmed. Furthest New Game step: 8. Oldest open PR N days."

**First card: counted voters split their votes** (`elections-counted-vote-splits-by-share`)

- **Finish line:** in a contested two-way council race, a small lead moves a few points, not every group.
- **Proof:** the totals script (`scripts/core2-year/incumbency-totals.ts`) over at least 12 places drawn from all 56, names and replay numbers printed, both and neither bonuses, quartiles shown. A test: an entry with a 0.1-unit lead gives a share, not the whole; pledged households keep their whole vote; named voters keep first place. Before: holder's typical share 0.744 with both bonuses in a small sample. Speed within 20% of base (the branch read +3.2%).
- **Hands off:** the pledge rule, any bonus for the player, the tests.
- **Known cheats:** tuning so the player wins, a per-town number, a roll, proving on a sample of four.
- **Size:** 3-4 hours; the branch holds the build. Merge main in, then add the 51-state check.
- **Save:** push each step; update `docs/lanes/state/lane-1.md`.
- **If stuck:** same failure three times, write it down and take the next. A crash in Santa Cruz, California in the cash code goes to Lane 5.
- **Hand-in:** line 1 `Pool item:`, the numbers attached, marked Built. **Checked by:** a fresh session replaying election night in Haleyville.

**Every later unit gets the same card.** Before starting a unit, write its card in `docs/lanes/state/lane-1.md` from this page and the unit's pool items: finish line, proof, hands off, known cheats, size, checked by. Split it if it grows past about 400 changed lines. A unit with no card isn't started.
