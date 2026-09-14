# EXEC-WORK2 handoff to UI-CORE-RELEASE

Frozen base: `1eb0b0d09be40e3e10bedd2a1d9fa301eae47f4b`.
The adjacent patch is the exact small Work registration change for this base;
apply serially in the UI-CORE-RELEASE tree, then reconcile its current layout.
No global UI files were edited by EXEC-WORK2.

Mount `ExecutiveWorkWorkspace` against the existing World owner. After canonical
legislative actions, `synchronizeExecutiveInbox` routes actual presentments and
responses into work without duplicating them. Compose existing calendar handlers
with `composeExecutiveWorkHandlers` wherever that owner advances time. Keep all
unrelated handlers; never replace the registry with just executive handlers.
The released shared workroom is compatible with the work panel; no new governor
art is required or promoted.

## Actual entry

Ordinary supported executive entry seats the recorded winner of a contest whose
office key matches an accepted executive-authority pack. The election outcome
event is the term identity. Custom Start
(`initializeExecutiveOfficePremiseForReview`) remains a separate authored
premise and is not an election.

`applyExecutivePlayTransition` is the A / FABLE-UI seam: it seats that winner,
routes presentment into the existing inbox, and publishes public sign/veto and
executive election results through NEWS. Bind incident inbox with
`executiveIncidentPorts()`; private events and unheld offices grant nothing.

Campaign candidacy packs still list legislative seats only. Adding a governor
to the ordinary ballot is N's missing producer, not a Custom Start shortcut.

Review fixture: `/tests/fixtures/executive-work.html`. It is not ordinary-player
reachability.

## Source producer contract

`receiveExecutiveWork` references an actual known event and current office term.
Known `executive-fact:<requiredFactKey>` evidence associated with that event feeds
the existing compiler. Only explicit discoveries are visible. No evidence is
manufactured from a title or from missing facts. The two jurisdiction-mandated
kernels remain blocked without their missing authority adapters. Existing
source producers must supply actual work/analysis evidence, not the synthetic
facts used by the review fixture. This handoff is awaiting integration, not a
claim that current main already offers full executive play.
