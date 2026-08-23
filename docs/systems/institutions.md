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

The current build contains only a basic Lexington-Fayette jurisdiction placeholder and stable generic Stage 5.1 organization identity. An organization may gain effective-dated profiles and progressive detail, but it does not thereby become a government body or acquire offices, powers, hierarchy, eligibility, procedure, authority, or law. Later schools, employers, parties, campaigns, agencies, courts, and governments must extend or reference the same organization IDs rather than create parallel name-based identity.

The Stage 4 decision engine can accept generic hard constraints and provenance-bearing institutional considerations supplied by a future domain adapter. Mutable institutional behavior must eventually resolve from the controlling effective-dated law rather than a permanent constant.
