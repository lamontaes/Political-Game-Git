# probe: note-quote-elsewhere

expect: FAIL surface-drift

## PACKET

SURFACE: Staff-work task note.
CHARACTER: Rulemaking analyst.
RELATIONSHIPS: Division director Priscilla Nasser is the analyst's supervisor.
KNOWN WORLD FACTS:

- Nasser wants a two-page summary of the rule known as "the sunset clause" before the Friday filing.
  PURPOSE: Test that a stray packet quotation does not license staged dialogue on a note surface.
  OUTPUT REQUEST: Render the task in a compact staff-work register.

## OUTPUT

result: SAFE_RENDER
prose: Get me the two pages on the sunset clause before the Friday filing, Nasser says, dropping into the chair.
