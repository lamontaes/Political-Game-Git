# Future Simulation Adapter Integration Note: FEMA Disaster Declarations Corpus

## Purpose

This document provides architectural guidance for future simulation external-event adapters consuming the Official FEMA Disaster Declarations Corpus (`data/fema-disasters/compiled-fema-disasters.json`).

## Architecture & Epistemic Boundaries

1. **Historical Evidence Layer**:
   - The compiled corpus contains deterministic historical declaration records published by FEMA/OpenFEMA.
   - It serves as a source of historical evidence for timeline alignment and real-world disaster context.

2. **Separation of Physical Hazard vs. Administrative Declaration**:
   - The corpus explicitly distinguishes between:
     - `underlying_physical_hazard`: The physical event type (e.g., "Hurricane", "Severe Storm", "Flood", "Fire", "Winter Storm").
     - `administrative_declaration_or_response`: The government administrative declaration category (e.g., "Major Disaster Declaration (DR)", "Emergency Declaration (EM)", "Fire Management Assistance (FM)").
   - Adapters must preserve this epistemic distinction when projecting events into character or government awareness.

3. **Strict Prohibition on Synthetic Gameplay Probabilities**:
   - Adapters MUST NOT derive:
     - Synthetic arrival rates (e.g. "0.05 hurricanes per year per county")
     - Uncalibrated risk probabilities
     - Fabricated damage or casualty numbers
     - Omniscient severity meters
   - Event occurrences in simulation must be grounded in explicit empirical scenario dates or verified calibration models.

4. **Preservation of Missing Information (`missing != zero`)**:
   - Missing incident end dates (`incidentEndDate === null`) represent ongoing, unclosed, or unreported incidents. Adapters must project these as open/unresolved timeline intervals rather than closing them at date zero or current date.
   - Missing assistance program declarations (`ihProgramDeclared === null`) must be preserved as UNKNOWN state, never coerced to `false` or `0`.

5. **Deterministic Offline Consumption**:
   - Simulation runtimes must strictly read from the compiled offline artifact (`data/fema-disasters/compiled-fema-disasters.json`).
   - Adapters must never initiate network calls to OpenFEMA APIs during gameplay or test execution.
