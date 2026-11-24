# M1-drives-economy: losing a job, a home or a business can drive someone

**Contract:** M1-11 in `docs/roadmap/features.json`. Over a year, job losses, evictions and closures form drives at a researched rate, and a drive's target is a real person or institution involved in the event.

**Builder:** a new Codex session, CODEX-DRIVES-ECON, at **medium**: the drives engine exists; this work order adds rows, researched rates and checks.
**Finisher:** a new Claude session, **Sonnet at high**.
**Branch:** `pool/M1-drives-economy`, stacked on `pool/P10-part-1` with `pool/M1-jobs`, `pool/M1-housing` and `pool/M1-business` merged in locally. **Starts:** when those three emit their events (`work.job-lost`, `housing.eviction`, `organization.closed` with responsible persons).
**Owns:** the economic rows and parameters in `src/core2/data/drives.json`, `data/research/drives/` (new files), and their tests. Changes to `src/core2/modules/drives.ts` are shared core changes for the drives owner's review. Read `M1-common.md` first.

## What exists

- **Drives** (`src/core2/modules/drives.ts`, `src/core2/data/drives.json`, PR #3922): causes, grudges, protecting family, ambitions and callings, perceived through role, closeness and traits, fading over time, and acted on through the shared chooser (tell people, join or found a group, donate, volunteer, confront). Rows already exist for `work.job-lost` and `housing.eviction`; there's none for closures. A grudge's target is read from the event's responsible person. 12 drive stopgaps are open, and its parameters aren't calibrated.
- **Producers:** M1-jobs, M1-housing and M1-business emit the three events naming who was responsible (the person who decided the layoff, the landlord, the owner).
- **Data:** only bereavement research (`data/research/drives/bereavement-civic-response.json`), which found no population rate. Nothing on grudges, ambitions or causes after economic losses.

## Research first

How often, and in whom, an economic loss turns into lasting anger at someone, a new ambition (starting a business, running for office, retraining) or joining a cause: published panel studies of displaced workers, evicted households and failed business owners, and political-participation studies after plant closings. Record effect sizes and who is more likely (traits, age, money, prior engagement). If no population rate exists for one kind, say so and register a stopgap with the closest published estimate.

## Build

1. **Rows:** add the closure row, and calibrate the three events' rows (how strongly each kind of person perceives the loss, which drive kinds it can form, and how fast they fade) from the research.
2. **Targets are real:** a grudge targets the responsible person or the institution named on the event, never a random person; an ambition or cause forms around the kind of loss (a laid-off worker's cause about plant closings, an evicted tenant's about housing).
3. **People who weren't hit** form drives only through their own ties to someone who was (family, close friends), through the existing closeness weighting.
4. **No flood:** a town with many closures in a bad year forms drives at the researched rate per loss, not one per event per witness. Check this against the director's interrupt count (the story director test town once produced 970 interrupts from 22 closures).
5. **Bench:** the year's drives from economic losses, each with its event, target and the person's reasons.

## Out of scope

The drives engine's design, the producers themselves (their own work orders), and what people do with drives beyond the existing acts.

## Hand-off

The finisher runs a year in a random place: drives formed per job loss, eviction and closure inside the researched ranges; every grudge's target is the responsible person or institution on its event; and the director's interrupts stay proportionate.
