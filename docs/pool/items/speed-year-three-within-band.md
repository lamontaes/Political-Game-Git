---
id: speed-year-three-within-band
title: "A town's third year runs within 20 percent of its first, on the same seed and machine"
area: core
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
---

**What.** A town's game year gets slower every year it is played. Bedford, Wyoming ran years one to three in 49, 88 to 96 and 125 to 134 seconds on Oct 20, and island territories grew far worse. Profiles put the growth in people's daily choices: offers per activation rose from 11 to 83, mostly people with causes weighing contact with everyone they know, plus records kept per person growing each year. This item brings year three within 20 percent of year one in a dense town and a sparse one, without changing who does what for the same causes beyond what the owner rules.

**Rules.** Speed: a town's year runs under two minutes and no change makes a year more than 20 percent slower than its base, measured before and after on the same base and machine, one process at a time. Speed also forbids scanning the whole world or a whole history every day: use indexes or act on the day something changed. No dice: who contacts whom follows drives and ties.

**Done when.** `npm run speed:year` on a fixed seed in a dense town and in a place drawn from all 56, three years each, one process, same machine, before and after on the same base, shows year three within 20 percent of year one, with the profile lines for `activate`, `availableActs` and `scoreOffers` and offers per activation in the PR body; the activism acts for the same causes stay the same in number, shown by drive record ids, or follow the owner's ruling on contacts.

**Files.** src/core2/modules/drives.ts, src/core2/life.ts, src/core2/choice.ts, scripts/speed-years/run.ts

**Notes.** Added Oct 24 by the CTO for the speed lead (order `docs/work-orders/lead-speed-2026-10-24.md`). Parts: `core-later-years-slower-drive-holders-offers` (activists' offers; the owner is asked whether people with causes contact only people they know, OWNER-DECISIONS.md Open: build the simplest version, register an owner-decision stopgap, never wait) and the kept records that grow per person each year. A PR names this item on line 1 and `Lead: speed` in its body.
