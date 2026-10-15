# Scheduled rent proof handback

The draft used `generateOpeningLife` to construct five full opening worlds. Its focused test did not produce a result within ten minutes on the available checkout. That remains a runtime-budget warning for full-opening simulation.

The replacement proof uses the shared `smallWorld` fixture and existing dwelling, tenancy, rent, and clock writers. It starts a real saved lease on January 31, schedules February 1 rent, advances through the admitted world-time handler, checks the saved transfer and next due date, then replays from a canonical save. The same path runs for all 56 state, district, and territory references.

This is one scheduled monthly rent collection per controlled fixture. It is not an anniversary renewal test, a full opening performance claim, or evidence for a production numeric rent cap.
