# Institutions

Institutions define jurisdiction-specific authority, offices, procedures, and constraints through data rather than avoidable hard-coding.

## Rules

- Jurisdictions use stable IDs and may form geographic or governmental hierarchies.
- Definitions may describe bodies, offices, powers, selection methods, eligibility, terms, vacancies, committees, calendars, and procedures.
- Generic simulation code must not assume that every jurisdiction operates like Lexington-Fayette, Kentucky, or the federal government.
- Rules are versioned or effective-dated. Appropriate simulated legal or political mechanisms may change them during a save.
- Elected, executive, legislative, judicial, appointed, administrative, diplomatic, party, staff, and nonpolitical careers may interact with institutions without becoming separate character types.
- Institutional state and historical actions must be explainable.
- Real-world definitions carry snapshot provenance; simulated changes belong to the save.

The current build contains only a basic Lexington-Fayette jurisdiction placeholder and stable generic organization identity. Schools, employers, associations, and agencies may be referenced by education, work, participation, or child-authority history, and an organization may gain effective-dated profiles and progressive detail. None of that makes it a government body or grants offices, powers, hierarchy, procedure, or law. Later parties, campaigns, courts, and governments must extend or reference the same organization IDs rather than create parallel name-based identity.

The Stage 4 decision engine can accept generic hard constraints and provenance-bearing institutional considerations supplied by a future domain adapter. Runs A/B supply a pure typed life-eligibility consumer seam: a caller asks about an actor, open action key, date, stable jurisdiction, and structured context and receives allowed/blocked reasons from an injected provider. Run B teen-work content consumes it; the default embeds no age or jurisdiction-specific legal rule. Mutable institutional behavior must eventually resolve from the controlling effective-dated Stage 7 law rather than a permanent constant.

`Jurisdiction.kind` and referenced jurisdiction IDs remain open. The engine neither validates against a hard-coded 50-state list nor assumes one uniform sub-state hierarchy. This preserves future U.S.-territory compatibility without implementing territory politics, law, elections, institutions, or datasets in Run A.
