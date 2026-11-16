---
id: seeded-normals-from-near-identical-hash-keys
title: "Two more Box-Muller normals and several uniforms are made from the FNV hash of keys that differ only at the end, so they are not normal or not uniform"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: counted-saving-draw-not-normal
blocked-on:
root: none
lead: money
model: sonnet
effort: medium
source: "T54's search for the class of counted-saving-draw-not-normal, Nov 16 02:45Z (Account lead's order: every other place that makes a normal or a uniform from that hash of near-identical keys)"
---

**What.** The fault found in `savingWeight` (counted-saving-draw-not-normal) is in two more normals, and the same hash makes uniforms in seven more places. The normals set where voters stand before play and the officials' roster draws, so both can pile up at their ends. Seen: a script over 20,000 to 200,000 keys, below.

**Cause.** Found in code: `stableHash` (src/core2/kernel/ids.ts) is 64-bit FNV-1a, and a different last letter changes only its low digits. Two units from the same key ending ":a" and ":b" agreed to within 0.01 for all 50,000 keys tried, so Box-Muller on them is a function of one unit (213 of 20,000 above 3 against 27). A uniform from its first 8 hex digits over keys ending in a running number failed a 20-bin test (χ² 624 on 19 degrees of freedom, 510 below 0.001 against 200); over long random ids it passed (χ² 24).

The normals (same one-line fault, Box-Muller on ":a" and ":b"):

- `normalOf`, src/core2/campaign-views.ts:90: where each voter stands before play (campaign views).
- `seededNormal` with `uniform`, src/core2/officials-roster.ts:90 to 101: the officials' roster draws.

The uniforms to check (first or last digits of `stableHash`), by what their keys end in:

- src/core2/modules/views.ts:225; src/core2/opening-profile.ts:50; src/core2/places-elsewhere.ts:52; src/core2/places.ts:165; src/core2/office-day-state.ts:204; src/core2/opening-upbringing.ts:64 and 73 (last 8 digits).

**Fix.** The two normals: Box-Muller on `seededFineUnit` (src/core2/seeded.ts), as `savingWeight` now does. Each uniform: if its keys can differ only at the end (a running number, a suffix letter), read `seededUnit` or `seededFineUnit` instead; if its keys are long random ids, leave it and say so.

**Time box.** 2 hours, Sonnet, medium.

**Rules.** No dice: seeded generation of who exists, fixed by its key. Each change is checked at a pinned place with the run's before and after, since the world drawn changes.

**Done when.** Each normal above passes the tail check of `src/core2/saving-weight-draw.test.ts` (the normal's own four-standard-deviation range for 20,000 keys), each uniform is read or left with its reason, and a second session sees in dev mode at a drawn place it names with its seed that voters' standings and officials' draws spread without a pile at the ends.

**Waits on.** Nothing.

**Files.** src/core2/campaign-views.ts, src/core2/officials-roster.ts, src/core2/modules/views.ts, src/core2/opening-profile.ts, src/core2/places-elsewhere.ts, src/core2/places.ts, src/core2/office-day-state.ts, src/core2/opening-upbringing.ts.
