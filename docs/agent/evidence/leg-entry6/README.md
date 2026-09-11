# LEG-ENTRY6 — normal member filing

Source adapter: `be4d20f858359f3a8ffdab8afd61bb0b7074f450` on existing PR #137.
UI control: `1119e890c471fbf83b4cd592aabe6b28c5f075b2`.
Isolated proof composition: `284747a` (detached, not a new feature lane).

The original two UI tests select custom Legislative staff, then try member-only
filing. Their refusal is correct. The test patch preserves their original seeds
and ages and uses normal creation followed by the existing Day campaign route.
No World injection, result override, hidden support query, new campaign writer,
new root or developer URL is used. The original staff setup remains a negative
browser case with draft comparison available and filing disabled.

`resolveLegislativeFilingEntry(world, personId)` is a read-only projection of
controlled identity, existing office capability, reconciled election/result/work
membership, governing jurisdiction and action-time session availability.
`fileDraftFromOffice` recomputes it on submission. Staff may prepare drafts; an
employment label cannot supply membership. Existing filing/publication writers
and saved bill identity/text remain unchanged.

## Consumer handoff

UI owns the global root and already mounts Day → CampaignWorkspace. No new root
wiring is needed. Consume the LEG source delta, then apply `ui-tests.patch` to
the named UI control (or check its exact diff against a newer UI head). The patch
changes only the two named filing cases and adds a shared normal-entry/read-only
saved-record helper plus staff refusal coverage. News is selected by the actual
introduction event ID; exactly one publication must reference it. Repeated save,
reload, linked person/Back and whole-World read purity remain asserted.

## Validation at this checkpoint

- 27 focused tests pass across member-seat, composition, session-window and
  player-capability suites. Filing refusal probes cover staff, an actual lost
  candidacy, ended membership, and ambiguous active claims. The ambiguity probe
  deliberately supplies malformed duplicate claims; it is never success data.
- LEG and isolated UI typechecks pass; changed source and UI tests pass lint.
- Art validation, inventory and QA pass (329 inventory records).
- Prose regeneration/check passes from source `be4d20f8`: 1,884 templates,
  311 warnings, 4,737 unclassified; seven artifacts byte-identical and review
  packet identical except recorded commit. Counts are measured, not added.
- Both original UI seeds reached an actual recorded seat in a headless replay
  of the existing path. This is not yet browser proof.

## Remaining acceptance

Identified combined browser run is queued behind LAND's explicit heavy slot.
The frozen UI control lacks QUAL's newer `assessOfficeQualifications` candidacy
call. QUAL and UI are coordinating the exact owned donor; LEG does not duplicate
or bypass that adapter. Passing the frozen UI entry proof will not establish
acceptance of a later QUAL-composed tree. No sourced legal term expiry is inferred
from a work start; ended-record refusal and missing legal term data are distinct.
No independent/human expanded acceptance or merge is claimed.

LEARN: a staff-start success fixture cannot stand in for member authorization.
Keep the original seeds, drive the supported route, inspect the resulting
canonical chain, and retain the staff fixture as a negative control.
