# Canonical Public Information

Status: **NEWS-HELP2 implementation contract; UI-core placement pending**

## Boundary

Public information is a consumer of canonical saved-world truth. It does not
create occurrences, infer votes, read private knowledge, or fetch real-world
headlines. One explicit `publishPublicEvent` transition appends a stable
`PublicationRecord` to the existing contiguous `HistoryStore`.

The record keeps four identities separate:

- the event that occurred (`sourceEventId` and its `occurredAt`);
- the canonical legislative records that substantiate that event, when any;
- the first publication and its `publishedAt`; and
- later corrected editions linked through `correctsPublicationId`.

`PublicationRecord` is optional on `HistoryStore`. Saves written before this
family existed therefore read as an empty publication history; no second save
payload, archive, or browser database is introduced.

## Eligible sources

A source must be an existing, earlier, public `HistoricalEvent` and cannot be
dated after publication. The publication resolver supports:

- a legislative action whose own `eventId` identifies the occurrence;
- a recorded vote only when that action has a canonical `voteId` and the
  referenced `LegislativeVoteRecord` exists; and
- another public civic/simulation outcome that is not setup, clock,
  evidence-discovery, or publication plumbing.

A `LegislativeCommitmentRecord` does not satisfy the recorded-vote path. A
future vote has no `LegislativeVoteRecord`, so no tally can enter publication
copy. Private and missing events are rejected before history changes.

## One projection, two consumers

`projectPublicInformationDigest` is the only public-information read model. It
groups the root edition with its append-only correction chain and exposes
event time, publication time, jurisdiction, accessible copy, typed person
references, and canonical source IDs.

- The feature-local `PublicInformationPanel` renders the digest as the
  newspaper/public-event archive.
- `projectPublicInformationHeadline` adapts the same leading digest item to
  the existing `headline` dynamic-surface class. The current surface binder
  still applies the scene's information-access declaration, so ENV retains all
  physical geometry and placement authority.

Reading either projection is pure. Opening, rendering, closing, focusing, or
reopening a digest or screen never calls the publication writer.

## Inline civic help and people

Articles carry explicit concept IDs selected from their canonical source kind;
there is no global word replacement or name matching. The existing
`committee-referral` identity is retained. The neutral referral and recorded
vote definitions are grounded in the
[U.S. Senate glossary](https://www.senate.gov/about/research-tools/glossary.htm)
and the
[U.S. House legislative-process explanation](https://www.house.gov/the-house-explained/the-legislative-process/house-floor).

Every glossary control is a semantic button usable by pointer, touch, Enter,
and Space. Help moves focus to its close control, Escape closes it, and focus
returns to the originating term. Reading changes only local component state;
it does not change World, time, or browser learning state.

The panel's close control receives focus on mount. UI-core owns the opener and
must restore focus to it when `onClose` removes the panel.

Person references are a separate typed shape containing canonical `personId`.
Activating one calls UI-core's person route callback. A person's name never
becomes a glossary key.

## Integration adapters

- **UI-core:** call `projectPublicInformationPanel(world, jurisdictionId)` and
  render `PublicInformationPanel`, providing `onClose` and an existing
  `onOpenPerson(personId)` route. UI-core chooses the global entry and final
  placement; NEWS-HELP2 does not edit `PlayerGame` or the permanent shell.
- **ENV:** continue passing `projectDynamicSurfaces(world, ...)` through
  `dynamicSurfacePayloads`. The NEWS-HELP2 headline owner now supplies only
  canonical published copy. Scene slots, access classes, rectangles, z-order,
  fallbacks, and anchors are unchanged.

## Deliberate limits

This is not a press simulation, media ownership or bias system, advertising
market, audience model, live-news service, public-opinion model, or automatic
knowledge propagation path. A public record is not automatically a broadcast;
an external observation is not automatically published; a correction does not
rewrite the edition it corrects.
