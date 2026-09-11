# Canonical Public Information

Status: **NEWS-PRESS4 implementation contract; UI-core placement pending**

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

An unknown room jurisdiction stays `null` through that adapter. It selects only
unlocated publications; it does not become an omitted filter that can pull a
headline from an unrelated jurisdiction.

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

The same glossary now includes explicit `on-record`, `on-background`, and
`off-record` concepts. They describe agreed attribution and use, not truth,
accuracy, approval rights, or guaranteed treatment. The background definition
also states that terminology varies and that the saved agreement controls.
These neutral summaries follow the Associated Press's published interview
ground rules and anonymous-source explanation and Reuters' published standards:

- [What to expect when you're interviewed by AP](https://www.ap.org/the-definitive-source/announcements/what-to-expect-when-youre-interviewed-by-ap/)
- [AP: Telling the story](https://www.ap.org/about/news-values-and-principles/telling-the-story/)
- [Reuters Journalistic Standards](https://reutersagency.com/about/standards-values/)

## Arranged press exchanges

NEWS-PRESS4 adds no parallel press database. NEWS-PRODUCERS6 supplies the normal
writer in front of that accepted loop. `projectEligiblePressReporters` reads
existing people, current journalism work roles, and actual reporter knowledge
or a public, non-future basis a pitch may convey; it creates nothing. `recordPressRequest` appends the source's limited request,
exact pitch claim, direct knowledge and ordinary contact interaction. A public
basis the reporter did not already know is conveyed as fallible `told-by`
knowledge from that pitch; private and future facts stay closed. A
separate `producePressRequestResponse` makes and durably records the requested
reporter's own acceptance, deferral or refusal from that person's current role,
knowledge, assigned work and functional availability. The controlled source supplies neither
the decision nor the reporter's words. No response, a deferral or a refusal can arrange an
interview.

`projectEligiblePressAdvisers` reads only current colleagues who share the
source's actual organization. Family or household status grants no staff role
or willingness. A separate `producePressAdviserResponse` makes and durably
records that person's acceptance or refusal from current shared work and
functional availability. `arrangeAcceptedPressInterview` may proceed after
reporter acceptance without an adviser; preparation minutes and feedback still
require an accepted colleague. When both responses are accepted it
delegates to the existing arrangement writer,
which appends the limited arrangement event, fixed scheduled activity and one
preparation work item assigned to that adviser. Every question basis remains
an existing non-future event that the reporter learned or that was actually
published. The request retains the selected written/spoken channel, terms,
background attribution, exact pitch, question and basis IDs.

Preparation is recorded only after the assigned work item is ready for review.
Its fact list, likely follow-ups and response options are derived from named
`EventKnowledgeRecord` IDs owned by the assigned adviser, including each
record's fallible believed summary rather than an omniscient read of event
truth. The caller supplies no adviser prose. Interactive and condensed
presentation routes write
the same event shapes; condensed play is explicitly neither refusal nor an
outcome modifier.

The source chooses an intent and reviews consequential wording. A claim is
written only after the confirmed text exactly matches that displayed wording.
This confirmation governs what the source said; it never grants the outlet
prepublication review or approval of a later story.

`seekCivicPressContact` is the employment writer for a missing journalism role:
it prefers a living, available person who already holds `profession:journalism`,
otherwise it generates a new fictional reporter through the character-history
population writer and employs that person at an authored civic news desk. It
does not reassign an existing adult, create consent, private knowledge or an
adviser. `projectPressReachSnapshot` is a read-only gap trace.

Completion uses the existing scheduled-activity transition and clock. An
on-record or on-background story becomes public only through an explicit
`press.story-published` event followed by the existing `publishPublicEvent`
writer. On-background copy exposes only the negotiated attribution descriptor;
off-record material has no interview-publication path. Later adviser feedback
requires the actual saved publication. The explicit feedback producer first
records that the assigned adviser learned that story from its canonical
publication, derives the adviser's statement from that publication and the
saved confirmed answer, then stores the interpretation as an expressly
fallible claim. The caller supplies no interpretation, and the result is never
polling, sentiment, causal effect, or omniscient reception.

## Integration adapters

- **UI-core:** call `projectPublicInformationPanel(world, jurisdictionId)` and
  render `PublicInformationPanel`, providing `onClose` and an existing
  `onOpenPerson(personId)` route. UI-core chooses the global entry and final
  placement; NEWS-HELP2 does not edit `PlayerGame` or the permanent shell.
- **ENV:** continue passing `projectDynamicSurfaces(world, ...)` through
  `dynamicSurfacePayloads`. The NEWS-HELP2 headline owner now supplies only
  canonical published copy. Scene slots, access classes, rectangles, z-order,
  fallbacks, and anchors are unchanged.
- **UI-core press handoff:** call `projectPressInterview(world, activityId)`
  and render the feature-local `PressInterviewPanel` with the existing person
  route and canonical action callbacks. UI-core remains the only global root
  and placement owner.
- **UI-core producer handoff:** use `projectEligiblePressReporters` and
  `projectEligiblePressAdvisers` for choices; call `recordPressRequest`,
  `producePressRequestResponse`, `producePressAdviserResponse`,
  `arrangeAcceptedPressInterview`, `producePressPreparation`, and
  `producePressAdviserFeedback` only from explicit actions. The already-mounted
  panel consumes the resulting saved arrangement through the existing
  projection; NEWS adds no second panel or publisher.

## Deliberate limits

This is not a media ownership or bias system, advertising market, audience
model, live-news service, public-opinion model, favorable-coverage mechanic, or
automatic knowledge propagation path. A public record is not automatically a
broadcast; an external observation is not automatically published; a
correction does not rewrite the edition it corrects.
