# Session 23 — executive track

Working branch: `codex/session23-p3-player-appointments`, based on actual main
`f88508186b78f526ecf89a420b5fb584171e039a`.

Parts 1 and 2 landed as #2286 and #2360. Checked Parts 4, 5, and 6 are published
separately as #2448, #2458, and #2452. Their own proof bundles distinguish
authored executive seats from the still incomplete natural election journey.

Part 3 is in progress, not ready. The existing appointment chooser now exposes
its own shortlist and accepts a controlled executive's actual recorded matter
choice through the canonical decision engine. Matching trace replay reuses its
saved identity. Foreign, closed, and newly ineligible choices are refused.
Named post data adds Alaska's Personnel Board and its joint-legislature
confirmation rule. It does not infer a vacancy or a current incumbent from an
inventory row. Vacancy production requires an actual saved incumbent term and
expiry, death, or resignation cause. A one-item term-expiry handler is added
outside protected continuity and daily-turnover bodies. The governing matter
has no invented legal deadline or required-time blocker. Nomination records
retain the actual post, seat, vacancy, former term, matter, and decision trace.
Nomination does not seat the person or record an appointment favor.

Checked so far: 11 appointment/favor tests passed; three vacancy tests passed
with canonical save/reload. Explicit changed-root typechecking, including the
test roots, passed before the latest additional governor route test. Retained
failed logs identify duplicate trace replay, an incorrect test import, a wrong
save payload call, and an event-only introduction that did not establish an
acquaintance. Their assertions were preserved and the actual writers corrected.

Current run: `/tmp/session23-p3-governor-known-candidate-tests.log`. Inspect its
exit status and results before further source changes. Next command:

```sh
tail -30 /tmp/session23-p3-governor-known-candidate-tests.log
```

Next: finish the governor choice-to-nomination test and recheck types; publish
the exact producer head to Session 21. Its executive-appointment member-vote
input owns admission in `chamber-votes.ts`; this lane owns the confirmation
caller using actual House and Senate rosters and the sourced joint majority.
Do not disguise this as a judicial, clemency, or constitutional vote. Consume
Session 13's current citizenship reader when admitted; until then the existing
positive-birth legacy fallback is permitted only without canonical citizenship
status records, and status presence remains unverified. No citizenship
transition is written to qualify a nominee and no private read grants knowledge.

Still required for Part 3: generated opening incumbents with disclosed term
provenance, real vacancy-to-confirmation-to-seating proof, other appointment
domains, cabinet depth, additive scene packet, new-game desk screenshot and
saved IDs, changed tests/types/lint/format/release/zero-dice, and one ready PR.
AS39.05.053 supports March 1 expiration, not current expiration years or an
invented stagger. AS39.25.060 supports six-year terms and unexpired remainders.
Current live three-seat incumbency is not verified from inaccessible rosters.

Separate unfinished work: the natural mayor election journey stalled at the
January 31–February 1 scheduled navigation; its preserved compact trace receipt
is portable in #2458. The parks NPC's actual reasons choose no action when
capacity is unknown; the protected operate-three-months assertion remains red.
Approved installment conservation correction and actor assessment work remain
on `codex/session23-p4-budget-and-program-decisions`. No funding or fixture goal
workaround is permitted. The main three-year speed baseline failed before a
year receipt with heap exhaustion; it is unverified and must not be replaced by
a larger heap or reduced-world pass. b17 extends the same engine; its remaining
instrument, regulation, emergency, enforcement, successor, and pressure
consumers still need implementation. New played scene evidence depends on the
central scene owner, and is not established by domain tests or desk images.
