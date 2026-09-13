# T — canonical legislative event-reference repair

Base: `68f661665ded130c0154edb408be2a11342b78c3`, isolated
`codex/systems30-t` in `/private/tmp/Political-Game-S30-T`.

`recordWorldEvent` and import validation now recognize the already canonical
provision, commitment and negotiation IDs returned by
`legislativePoliticsEntityExists`. A reference requires an existing record,
an earlier append sequence, and a record date no later than the event date.
Unknown IDs, later-appended references and backdated references still refuse.
This grants no legislative authority and adds no event type, schema, record,
control transfer or save migration.

Focused proof: `legislative-event-references.test.ts` accepts an existing prior
filed provision through serialize/import and proves unknown, backdated and
later-appended refusal. Existing event/provision histories remain byte-for-byte
unchanged before the appended referencing event.

Checks on this increment: four focused files / 40 tests passed, covering the new
reference tests, transit core, existing World and public-information behavior.
Fresh type checking and scoped formatting/lint must pass before publishing.

Architecture audit dispositions:

- Confirmed compatible: canonical append history, frozen Stage 6 simulation,
  private knowledge versus explicit publication, pure TypeScript simulation.
- Corrected now: the event writer/import domain registry omission, with date and
  sequence guards at both boundaries.
- Deferred through actual owners: F's collected-cash/payment seam; S's ordinary
  assignment and colon-containing institutional docket identity parser; A's
  feature-leaf root navigation, callbacks and composed clock consumer.
- No old save or historical record is rewritten, removed or grandfathered.

LEARN: test setup must author a sponsor through canonical writers. Changing a
fixture's controlled actor or removing staff work after creation breaks binding
or append integrity and is not a valid setup repair. The core fixture now uses
canonical measure/provision/lineage writers without altering prior history.

This is a tested registry increment, not completed transit gameplay or visual,
installed or human acceptance.
