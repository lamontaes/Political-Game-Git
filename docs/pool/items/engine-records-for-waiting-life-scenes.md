---
id: engine-records-for-waiting-life-scenes
title: "The life records eleven situation types wait on: courtship, a homecoming, word from someone away, a gathering, a mentor, a school stage"
area: people
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
lead: laws-effects
source: added with npm run pool -- add
---

**What.** The director stages a scene the day a record of its cause exists (director-scenes-from-circumstance, owner Oct 27). Twelve situation types wait on records no engine writes in a played year (measured over a year in Mineral Ridge, Ohio, seed 7b4d5aceade0dfbb713c3f2783a281d20702487d0f6661bc222c23c508aafc09, every record kind tallied): date, proposal and breakup (no courtship or separation record), return (no release from custody or homecoming record), letter (no contact from someone away), gathering-missing (no birthday or holiday gathering), advice (no mentorship record), apology (no record of a decision to concede after an argument), first-day and last-day at school (no school stage start or end in the new core). The engine that owns each life writes the record from its own causes (no monthly chance), and the director lead adds the match the same day. Split into one S item per record before building.

**Time box.** 2 hours per record once split, Sonnet worker or the laws-effects lead.

**Rules.** Simulate it, don't ask (owner, Oct 24). No dice: a courtship or a homecoming follows from people's ties, traits and the law, never a roll. Sliding scales and causes. One rule, all 56 places. An effect is a read: the director's scene is the reader.

**Done when.** For each record: a one-year buildBenchWorld run in a drawn place (place and seed printed) writes at least one, named by record id, and the director stages the waiting type from it (the reach report in src/director/reach.ts shows the type fired, citing that record).

**Files.** src/core2 (the owning engines), src/director/data/situation-types.json (the director lead adds each match)

**Notes.** TODO

Lane 3 (Nov 4): of the plan's waiting producers (situation-types.json `awaitingProducer`), only `separated` and `election-day` have a core event today. The breakup type's `separated` cause is wired on branch `lane3/separated-producer` (cause rows on `family.separated`, selfNamed, with `breakup-separated.test.ts`), but it can't fire in a played town yet. `src/core2/modules/partnerships.ts` partners and parts only people living elsewhere; in-town partnering is `SG-LIVES-partner-town`. In four drawn towns (seed a73b529bcddc05f2: Westbrook, Maine; Norfolk, Virginia; Kernersville, North Carolina; Poland, Ohio), no watched couple out of 160 separated in a year. The branch opens as a PR when in-town separations are recorded. `married`, `school-started`, `started-dating`, `broke-up`, `next-step`, mentorship formed and `bribe-offer` have no event yet.
