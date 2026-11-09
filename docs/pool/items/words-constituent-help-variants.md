---
id: words-constituent-help-variants
title: "A constituent at office hours plays one of several arcs, picked from their own layoff, rent notice, wage case and health records"
area: words
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: story/constituent-help-variants
pr: pending
blocked-on:
lead: words
source: owner, Nov 9 ("a bunch of different scenes and scenarios and variants", from "people's lives and the world's records")
claimed-at: 2026-11-09T13:00:00.000Z
---

**What.** The constituent-help scene (a resident brings a problem to office hours) played one arc however the resident came. It now has four variants beside the plain one (lost-job, eviction, short-pay, sick), chosen by the one arc-variant engine from the resident's own records: a `work.job-lost` event naming them in the last half year, an open housing case on their household, the wage case's problem and severity, and the health engine's care need (their own, or the most any other member of their household needs). Each variant has its own arc (lost-job offers no `decline` at the table, eviction and sick offer no `lie`) and its own bank pieces under `constituent-help.<variant>`. Every variant keeps the plain arc's endings and what each keeps (promise, meeting-set, relationship-strained, trust-lost).

**Rules.** One engine for every kind of scene (`arc-variant.ts`). No dice, no thresholds: scores slide, and a variant with no read scores 0. Weights are TUNABLE under SG-STORY-arc-variant-weights. Facts the lines name (`employer`, `since`, `owed`, `deadline`, `pay`, `floor`, `relative`) come from `constituent-help-facts.ts`, each cited to the record it came from, and every line that names one is gated by `requiresFacts`.

**Done when.** src/director/constituent-help-variants.test.ts, in towns of drawn places and seeds, shows every office-hours visit playing the variant with the highest score with its reads equal to the records, and labeled probes moving lost-job by a layoff, eviction by a rent notice, short-pay by a wage case and sick by a serious illness (own, and a relative's) on separate residents, each composed whole with its own opening piece; src/director/arc-variant.test.ts composes every variant.

**Files.** src/director/arc-variant.ts, src/director/constituent-help-facts.ts, src/director/purpose-scene.ts, src/director/data/arc-variants.json, data/english/parts/scene-talk.json

**Notes.** Reads added to the engine: `household-case`, `care-need`, a `named: "asker"` history and a `when` gate on any read. Gaps: no record keeps a benefit denied (the jobs module's claims table keeps filed, paid and ended claims, not a refusal), so that story waits on one; the case module brings only two problems (looking for work, pay under the floor), so a rent notice or an illness reaches the office hours through the household's own records, not through the case the resident files; the health module's care need is a sliding scale over held conditions, so a moderate score names no illness, and the relative is named only where their need is the larger of the two.
