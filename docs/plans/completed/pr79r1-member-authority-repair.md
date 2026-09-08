# 79R1 — PR #79 member authority and fabricated-history repair

Date: 2026-09-08. Owner: the PR #79 writer, one writer only.
Branch: `claude/legislative-bargaining-dialogue-realism` (PR #79), continued in
place — no rebase, no force-push, no new PR, no main merge.

## Exact heads

- Rejected 79F head (repair baseline): `0e4a4147ec69a277b7885a3569893fd34d4172d9`.
- Main at rejection: `b61abf26118e50be351c09db5b3d0823333fc9ec` (main has since
  moved; 79R1 deliberately does not merge it — reconciliation with current
  main is a landing-time step under the concurrency rules).
- Ending head: the final commit on this branch carrying this record.

## Superseded claims from the 79F record

Two claims in the 79F completion record and PR body were false and are
superseded by this repair:

- "A lost election never passes the first gate" was true only for the loss
  path. The first gate was the office capability, which any active
  `employment:legislative-*` work relationship satisfies: never-elected
  legislative staff — and a `legislative-janitor` label — passed it and were
  seated to bargain and vote. Employment near a legislature was treated as
  voting membership.
- "Derives everything from canonical state" understated one production write:
  entry recorded a fabricated prior co-sponsorship with the advocate and a
  fabricated committee acquaintance with the guardian — biography the member
  never lived, laundered from the fixture's authored setup into canonical
  state through stable-keyed idempotent insertion.

Both were reproduced before the repair with integrity-valid worlds built
through the canonical writers (`createOrganization`, `createWorkRelationship`,
the ordinary new-game and legislative-work routes): the staff entry returned
`available` with `playerSeated`, and first-win entry appended exactly the two
`legislative-work:kentucky:prior:*` relationship records.

## The repaired boundary

`resolveActiveMemberSeat` (`src/presentation/legislative-member-seat.ts`) is a
read-only projection over existing records — not a second seat store, not a
new authorization framework. It derives voting membership from the chain
`seatTheWinner` actually writes and reconciles every link:

controlled person → active `employment:legislative-member` work record →
provenance `simulated-event` outcome id → the campaign named by the seat's
`<campaign>:seat` stable key → that campaign's own candidate and recorded
`won` state → the contest result whose id, winner, and outcome event all match
→ the candidacy pack's governing state, required to equal the role's recorded
workplace (a missing governing location never borrows residence) → the contest
office's own `<rulePackId>:<chamberKey>` chamber, required to exist in the
accepted rule pack (no first-array-entry chamber).

Zero reconciled seats withhold with the first stated reason; more than one is
ambiguity, not permission to pick. `openLegislativeBargaining` now asks the
resolver instead of the office capability; staff keep the office and the bill
(`resolvePlayerCapabilities` is unchanged), and the sitting's chamber must be
the seat's own chamber — a bill before the other chamber, or with no chamber
position, withholds. Refused entries return the input world unchanged and seed
nothing. The production seat carries the member-seat stable key it was opened
on, and both floor actions re-run the same resolver before writing, so an
ended or contradicted membership refuses at the write boundary
("stale seat"). The developer fixture's synthetic seat carries no such key and
stays behind the unchanged import-graph firewall.

## No invented past

`ensurePriorWorkingHistory` is removed from production. Entry writes no
relationship records — proven across first entry, re-entry, and reload. The
advocate's dossier read is derived from the record: "You have worked together
before" only when a shared `relationshipInteractions` record exists, otherwise
"You have not worked with them before" (civic-prose register, separate
grounding review: PASS). Genuinely pre-existing history is read, never
rewritten; no legacy cleanup of stored saves was performed. The fixture keeps
its authored prior-session setup inside its own synthetic world, where it is
also true.

## Evidence

`src/presentation/legislative-member-seat.test.ts` — failing-before /
passing-after per finding:

- staff without a seat: entry was `available` at the rejected head, now
  withholds, world byte-identical before/after refusal;
- `legislative-janitor`: withholds;
- member label without provenance (canonical writers, integrity-valid):
  resolver `unseated`, entry withholds;
- lost campaign behind a `:seat` record: "did not record a win";
- another person's campaign behind the label: `unseated`;
- ended membership: resolver and entry withhold; the seat resolved before the
  ending refuses at both floor actions with no bytes written;
- the canonical first-win winner still resolves `seated` (house, Kentucky),
  reaches the floor, and bargains, amends, and votes;
- entry adds zero relationship records on first entry and re-entry, and the
  reads never claim unrecorded shared work.

All banked 79F/79C proofs run unchanged: win → govern → bargain replay from
the production route, exact-identity save/reload, loss withholding,
bill-absent/in-committee withholding, fixture import-graph isolation,
deterministic dialogue, ordinary-conversation containment, and the full
accepted commitment/amendment/vote semantics.

## Validation at the final head

Recorded in the PR body: full `npm run validate` (2,799 unit tests across 160
files, source validation/replay, build, deterministic demo, art validation),
the full Playwright suite including the production-floor proof, corpus counts
regenerated from live measurement (never arithmetic), `git diff --check`. No
assertion, timeout, or skip weakened; no fixture setup replaced honest
no-history behavior.

## Bounded limitations

- Appointment or succession paths that never existed in the simulation remain
  unsupported; the resolver accepts exactly the elected chain the game can
  produce today.
- The wrong-jurisdiction / wrong-chamber / missing-location resolver branches
  beyond those constructible through canonical writers are pinned by the
  resolver's own ordering and code; constructing every permutation would
  require handcrafted invalid worlds, which the packet forbids relying on.
- Legacy saves created at the rejected head may carry the two fabricated
  records; repairing stored player history requires separately authorized
  evidence-aware handling and was deliberately not done here.

PR #79 remains OPEN AND UNMERGED for the narrow independent 79R1 recheck.

---

## Superseded by 79R2 (historical)

The 79A2 independent recheck reproduced two defects this record did not close.
Two claims above are therefore superseded and are kept only as provenance:

1. **"Both floor actions re-resolve the seat before writing, so an ended or
   contradicted membership refuses at the write boundary."** True as far as it
   went, and incomplete: the re-check asked only whether the seat relationship
   still resolved, never where the bill was. A retained House context could
   still amend and vote after HB 214 had been transmitted to the Senate — 8 and
   5 history records respectively, both worlds still integrity-valid. Closed by
   79R2's `resolveActionAuthority`, which reconciles the re-resolved membership
   against the live measure's jurisdiction, rule pack and current chamber before
   any write.

2. **"The advocate's read is derived from the record — 'You have worked together
   before' only when a shared interaction record exists."** The predicate
   accepted any interaction naming both people, so `contact:met-socially`
   rendered as shared work. The persisted fabricated relationships are indeed
   gone and entry still writes zero relationship records — that part stands —
   but the classification was wrong. Closed by 79R2's evidence classifier, which
   holds acquaintance and shared work apart.

Current record: `docs/plans/completed/pr79r2-chamber-write-and-evidence-repair.md`.
