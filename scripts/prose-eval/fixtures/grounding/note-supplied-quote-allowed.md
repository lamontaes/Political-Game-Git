# probe: note-supplied-quote-allowed

expect: PASS

## PACKET

SURFACE: Staff-work task note.
CHARACTER: Rulemaking analyst.
KNOWN WORLD FACTS:

- The posted notice reads, in full: "Room 204 is closed for the Friday filing."
  PURPOSE: Test that a packet-supplied quotation may be logged verbatim on a note.
  OUTPUT REQUEST: Log the notice in a compact staff-work register.

## OUTPUT

result: SAFE_RENDER
prose: Notice to log: "Room 204 is closed for the Friday filing."
