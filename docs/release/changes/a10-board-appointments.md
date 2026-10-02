---
id: a10-board-appointments
impact: feature
---

A10 / R16 first appointment stage: the opening calls the existing governor appointer decision over people the governor actually knows. A selected qualified person gets a saved public nomination pointing to the actual durable decision. A nomination does not seat anyone or supply a board vote. The shared Senate-confirmation binding is not yet available; all Senate-required nominations remain pending.

Louisiana's acquired official corrections page supplies five pardon seats, governor appointment and Senate confirmation, and five years of experience in the named fields. The two parole-only seats and nonvoting warden are excluded. Term and quorum fields remain missing. Connecticut and Texas appointment values remain unread and refuse nomination; approved statutory references are not treated as acquired text. Missing profiles in other places also produce no invented appointments.

Qualification binding is deliberately narrow: an explicit `profession:<statutory-field>` classification, one recorded continuous active work interval, and completed months meeting the sourced years. It does not infer a field from a title, office, age, assumed biography or a SOC proxy. Combining partial work periods and opening-person professional classification bindings remain gaps; current records without that evidence do not qualify automatically.

Replaces: the absent saved board nomination producer; reuses `chooseAppointee`, `appointmentCircle`, dated work readers, `createOrganization` and `recordWorldEvent`. No second choice engine. New exports: `CLEMENCY_BOARD_NOMINATED`, `clemencyBoardAppointmentProfiles`, `ensureOpeningClemencyBoardAppointments`.

Dependency: complete #1820 source03ee6f9a7499e310e950c3ab99ff2ee87dfc23dc, including dynamic district loader/shards and post-load abort. The opening adds only the nominee call after actual officeholders are established. Existing positive LA/TX/CT clemency assertions remain unchanged. Seating via `createOrganizationParticipation` and positive grant proof remain TODO until lawful confirmation and remaining appointment rules are available. No active participation, confirmation ballot or board decision is fabricated.

Validation pending on this source; this is not READY or completed board seating.
