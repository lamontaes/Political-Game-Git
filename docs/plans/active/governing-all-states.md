# GOVERNING — all-fifty-state executive/legislative baseline and continuity

Owner: Claude (GOVERNING, PLAYTEST-PORK-01 section C and the retained GAMEPLAY
ROLE). Branch `claude/governing-all-states`, base `fed321f7`. LAND integrates.

## Increments

1. **Time** — one time command (`src/presentation/time-command.ts`) with a
   disclosed target, a quiet stretch capped at the next dated item, stale
   source refusal and receipts; a root World-change guard
   (`src/presentation/world-change-guard.ts`) so a change computed from an
   older World never replaces a newer one. StoryView and the corner Day/Week
   control use it.
2. **Campaign → office for all fifty governors** — per-state disposition
   registry; term rules (including weekday-relative starts) compiled into the
   rules resolver; an ordinary executive authority profile for states without
   an accepted pack, labelled as a game profile; filing uses the office's own
   cycle instead of a 28-day horizon; exact unsupported reasons.
3. **Institutional continuity** — Congress and state membership across term
   boundaries; pending successor, vacancy with cause and no-current-record kept
   distinct.
4. **Governing matters** — appointments, budget priorities, bills presented and
   implementation follow-through for the player and NPC offices; three-to-five
   item briefing projection for Your office.

## Rules

- Accepted facts, rejected matrices and authored game profiles stay separate.
- Missing law stays UNKNOWN; a versioned game profile is labelled as such.
- Old recorded victories are not rewritten; any recovery is an explicit,
  versioned option.

## Status (2026-09-16)

Delivered on the branch: increments 1, 2 and 3 (the Congress and governor
parts). Increment 4 (budget priorities and bills presented) is next.

### Game profiles to confirm (proposed values, versioned, labelled in play)

- `ocd-state-executive-game-profile/v1`: four-year governor terms, regular
  elections in the cycle containing 2026, general election on the Tuesday after
  the first Monday in November, term begins the first Monday of January.
- `ocd-governor-turnover-game-profile/v1`: candidate field closes 60 days before
  the election; incumbents step down after two recorded consecutive terms or at
  78; an eligible incumbent runs again 80% of the time.
- `ocd-congress-turnover-game-profile/v1`: incumbents return 85% (House) / 80%
  (Senate), retire at 82; an open seat stays with the prior party 75% of the time.

### Receiving map (filing checked with each state's test life on 2026-01-05)

| State | Calendar | Next election → term | Authority pack | Legislative pack | Filing today | Unfinished |
|---|---|---|---|---|---|---|
| AL | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| AK | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | us-ak-governor-v1 | us-ak-legislature-v1 | baseline route exercised | 2 items |
| AZ | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| AR | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| CA | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| CO | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| CT | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| DE | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| FL | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| GA | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| HI | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| ID | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| IL | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | us-il-governor-v1 | us-il-general-assembly-v1 | baseline route exercised | 2 items |
| IN | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| IA | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| KS | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| KY | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | us-ky-governor-v1 | us-ky-general-assembly-v1 | baseline route exercised | 2 items |
| LA | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| ME | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| MD | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | us-md-general-assembly-v1 | baseline route exercised | 3 items |
| MA | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| MI | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| MN | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | us-mn-governor-v1 | us-mn-legislature-v1 | REFUSED (unproved-sourced-qualification): Minn. Const. art. V, § 1 was observed in current source text on 2026-09-09; that later observation does not establish the rule on 2026-01-05. | 1 items |
| MS | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| MO | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | us-mo-general-assembly-v1 | REFUSED (unproved-sourced-qualification): Mo. Const. art. IV, § 3 requires 15. The game does not record that about a character, so it neither grants nor refuses on it. | 2 items |
| MT | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| NE | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | us-ne-governor-v1 | us-ne-legislature-v1 | REFUSED (unproved-sourced-qualification): Neb. Const. art. IV, § 2 was observed in current source text on 2026-09-09; that later observation does not establish the rule on 2026-01-05. | 1 items |
| NV | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | us-nv-legislature-v1 | baseline route exercised | 3 items |
| NH | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| NJ | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| NM | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| NY | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| NC | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| ND | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| OH | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | us-oh-general-assembly-v1 | REFUSED (unproved-sourced-qualification): Ohio Const. art. XV, § 4 requires true. The game does not record that about a character, so it neither grants nor refuses on it. | 2 items |
| OK | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| OR | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| PA | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| RI | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| SC | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| SD | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| TN | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| TX | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| UT | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| VT | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| VA | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| WA | verified | 2028-11-07 → 2029-01-10–2033-01-12 | — | — | baseline route exercised | 3 items |
| WV | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| WI | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |
| WY | game-profile | 2026-11-03 → 2027-01-04–2031-01-06 | — | — | baseline route exercised | 4 items |


Refused states are UNFINISHED, not passed: each needs a way for the game to
record the named qualification (elector status, citizenship years) or a RULES
decision about how an unrecorded requirement is treated at filing. The governor
offices in those states still continue for non-player holders.

## CRUNCH46 section 07 — next increments (gap map read 2026-09-16)

What exists: legislative record types and writers (refer, hearing, committee
disposition, floor vote, transmit, concurrence, enrol, presentment, executive
action, override, enactment, adjournment death), bill drafting with typed
instruments, 79F bargaining (Kentucky HB 214 only), vote instructions, public
payment writer (`settlePublicResourcePayment`), Alaska transit route.

Gaps to close, in order:

1. P10: chamber/actor check on every legislative step (authored route too).
2. P11: continuing intake — several bills per session, not one pinned measure.
3. P12: session calendar with convening and adjournment; production
   `recordAdjournmentDeath`; no bill resumes after adjournment.
4. P09/NPC progress: committee, other-chamber and executive steps run on the
   canonical clock for NPC actors; governor "bill" matters bind to real
   `legislativeMeasures` where a legislature exists.
5. P06: committee assignment records made by the chamber's actual appointing
   authority; staff hiring at seating.
6. P08: sponsor/stage labels from real ownership.
7. Drafting: add grant, appropriation transfer, rate/exemption instruments;
   bind amounts to accounts.
8. Fiscal: appropriation, commitment, installment and outturn records over the
   existing payment writer; transit fleet/capacity record (G3 fixture numbers
   are test inputs only).
9. Oversight/casework records.
10. Peer asks: PRESS `recordOutsideMandatePublicPayment` + `canInstitutionAct`;
    CRISIS K3 succession consuming `crisisOfficeContinuityNotices`;
    CHANGE read access to fiscal records.
