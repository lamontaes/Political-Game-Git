---
id: art-tv-set-graphic-for-broadcasts
title: "A television set graphic for a speech heard on TV"
area: play
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play
model: sonnet
effort: medium
root: design-director-on-core2
source: carryover N16-27 (the Governor's address on TV: "this TV thing needs a graphic made for it")
checked: sonnet 2026-11-23
---

**What.** A speech heard on television draws the speaker's bust in a plain dark box with LIVE over it, and the owner wants a real TV graphic for it. The owner said so on Nov 17. The graphic is a picture, which this step does not make. Seen: on the LIVE corner at any broadcast part of an address.

**Cause.** Found in code: `tvSet` in `src/bench/ui/tv-set.mjs` and the `#tv` rule in `src/bench/play.css` draw the set as a bordered box; no TV frame picture exists in `art/` (wanted row address-2 in `docs/art/WANTED.md`).

**Fix.** When the frame is painted, `#tv` takes it as its background in the same CSS rule, with the bust on its clear glass. No code changes until then, and no second set is added.

**Time box.** 1 hour once the picture exists.

**Rules.** Replace, never layer: the frame replaces the box's border and fill in `#tv`. One rule, all 56 places: the set is national and names no place.

**Done when.** A second session sees, in the running game, in a drawn place from all 56, with a screenshot, the address's broadcast part with the speaker's bust inside the painted TV frame and the LIVE tag still readable.

**Waits on.** The picture, painted by the owner's art session.

**Files.** src/bench/ui/tv-set.mjs, src/bench/play.css
