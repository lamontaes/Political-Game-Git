# INCIDENT-RESPONSE7 handoff

Recipients: UI-COMPLETE6 / UI144 (root integration), EXEC-WORK2 / LAND (EXEC140 inbox), NEWS-HELP2 (NEWS143 publisher). ENV-ALL1 retains scenes.

## Published interface pins

- Main/source base: `701e68ca2fab1aa8b5a69b06c8e7ada312ae2aa3`.
- UI patch target: `9f602f44e62ef04913a53515333dd03945c401f4`, PR144. Patch is not applied to its owner's workspace.
- EXEC: `d767b29102a3cd5e323631a6038946fa6e0b34d5`, PR140. `receiveExecutiveWork` is the optional inbox port; no copied implementation.
- NEWS: `5453926d68fe21aeb0193737f858d7fc21c9ac1a`, PR143. Actual `publishPublicEvent` and persisted publication records were tested in an isolated composition. This dependency is not merged into this branch.

## Integration

Apply `incident-response7-ui.patch` to the pinned UI after importing the feature files. It inserts `IncidentResponsePanel` within all existing Work branches, using the existing `onWorldChange`. It adds no navigation root, source registration or shared barrel export. Rebase the small patch deliberately if UI has moved.

`reportIncident(world, sourceEventId, recipientId, summary, ports)` is an explicit producer action. The source must be an existing incident onset, available at the present frontier and known to the reporting actor. A private report records the communication, not an eyewitness experience or the truth of every reported claim. For a controlled executive recipient, supply `{ receiveExecutiveWork }` from EXEC140. The callback must be bound only when `resolveExecutiveOffice` returns the actual controlled role. Other recipients acquire their own report knowledge without changing control. No projection calls the writer.

`publishIncidentEvent(world, eventId, { publishPublicEvent })` sends only an already-public event to NEWS143. `inspectPublishedIncident` checks the actual persisted NEWS publication date, recorded date and sequence. Internal reports/follow-ups cannot be published by this consumer. Existing disclosure writers remain responsible for any permitted disclosure.

`incidentResponseView` and `IncidentResponsePanel` read known reports and canonical private Work. The explicit actions commission/defer work, request information, arrange/attend a briefing, request/approve/decline an authored internal allocation, and deliver after real follow-up. Resource requests have no approval effect; approval changes expected flow terms and delivery settles money separately. Current supervisory role, organization, jurisdiction and dates are rechecked. There is no emergency-declaration or public aid approval power inferred from a label.

`femaResponseContext` is a browser-safe read-only administrative source adapter. Feed it the existing compiled FEMA records and exact state/county FIPS. No World crosswalk is inferred from a jurisdiction name: a verified World-to-FIPS mapping is still required before attaching these rows to a World jurisdiction. A statewide row is not county coverage; tribal/other geography requires its own exact crosswalk. Context reads do not initialize historical disasters in an alternate-history save.

## Tests and adoption

Feature browser route: `/tests/incident-response/index.html`, config `tests/incident-response/playwright.config.ts`; diagnostic only. It proves pointer and keyboard decision/briefing activation and exact snapshot reload. The attached NEWS composition patch is applied only in the pinned NEWS worktree and proves a physical occurrence/publication/knowledge/decision/work/time/follow-up/save chain with private and duplicate-publication controls.

Normal-player test for UI: create or encounter an actual represented incident through its canonical producer; report it to the controlled role; open Work through the existing navigation; commission available staff; advance the ordinary clock; arrange and attend the briefing; request a represented internal allocation, make the responsible actor's decision at its effective date, and deliver after follow-up; save/reload through normal Keep/Save; check the same event, Work, allocation and publication IDs. Repeat as a citizen and an unrelated/expired role to prove refusal. Do not substitute the diagnostic fixture or grant an office just to make this pass.

**Adoption state: unmounted here, root patch not applied; normal-player reachability and human visual acceptance remain outstanding with UI.** EXEC callback is supplied and typed but actual EXEC composition remains outstanding with its owner. The tested NEWS composition is feature evidence, not proof that UI144 adopted it.

## Scope and remaining limitations

The generic bridge accepts existing canonical incident families; semantic proofs cover a civic occurrence and synthetic physical hazard. Economic/outbreak generation is not newly calibrated or activated. No FEMA row becomes physical occurrence, damage, loss, casualty, eyewitness or forecast. Internal authored allocations are supported; real public assistance authorization/delivery requires its existing law/agency provider and is not claimed here. No general declaration writer was found on main; ordinary canonical events retain that boundary.

The baseline staff allocator can credit multiple pre-existing parallel tasks. This consumer refuses to assign an already-busy worker; it does not rewrite the frozen allocator or guarantee that a later external writer cannot create competing work. LAND/UI must compose the accepted LIFE/EXEC allocator before claiming shared-host normal-work capacity proof. The bridge does not alter ENV or teleport a character; a briefing's canonical attendance is recorded without new scene art or an automatic scene swap.

Future merge effect: adds an incident-response provider, private Work panel, administrative-context reader and tests; normal Work mounting remains the supplied UI patch, with no automatic incident recurrence or release activation.
