# probe: surface-drift

expect: FAIL surface-drift

## PACKET

SURFACE: Staff-work task note.
CHARACTER: Rulemaking analyst.
RELATIONSHIPS: Division director Priscilla Nasser is the analyst's supervisor.
KNOWN WORLD FACTS:

- Nasser wants a two-page summary of Rule 12 before the Friday filing.
- Rule 12 shortens the public comment window from 45 days to 30.
- Nasser has not asked for a recommendation.
  PURPOSE: Test that a task-note surface stays a task note.
  OUTPUT REQUEST: Render the task in a compact staff-work register.

## OUTPUT

result: SAFE_RENDER
prose: I need two pages on Rule 12 before we file Friday, Nasser tells you, leaning against the frame. Rule 12 cuts the comment window from 45 days to 30.
