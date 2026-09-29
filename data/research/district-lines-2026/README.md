# U.S. House lines for the 2026 elections

This folder holds the lines that replace the Census 119th Congress baseline for the states that redrew, as a dated set. Nothing here is shown to a player.

## Files

- `artifact-lock.json`: every source file, its address, size and SHA-256. The raw files are about 2 GB and stay in the ignored `.source-cache/district-lines-2026/`; the compiler refuses a file that does not match the lock.
- `lines-2026.json`: the compiled result. For each redrawn state, the district of each county and each Census place, or the districts a split place touches.

## Source

All files are from the U.S. Census Bureau (public domain):

1. The 120th Congress block equivalency files (`cd120.zip`, with its block split report). Census posted them on August 31, 2026 and lists the plan each state submitted for the 2026 elections.
2. The 2020 block-to-place assignment files, one per state (`BlockAssign_ST<fips>_<usps>.zip`).
3. The 2025 TIGER/Line 2020 block layers, one per state, read only for each block's land area.

## Method

`npm run compile:district-lines-2026` joins each block's district to its place and county. A place is whole when every block of it, water included, is in one district and none is unassigned. The compiler also keeps the districts that hold land, which is what the map inspector uses. Run on the 119th Congress file, the same method reproduces the shipped baseline exactly for Texas, California, Ohio and Florida (5,691 places, 0 differences).

## Which states

Comparing the 120th file with the 119th block by block, ten states differ: Alabama, California, Florida, Louisiana, Missouri, North Carolina, Ohio, Tennessee, Texas and Utah. Every other state, D.C. and Puerto Rico match. Missouri is held on its 2022 lines: its 2025 plan is blocked for 2026 (CTO ruling, September 28, 2026), so the file's Missouri rows are not compiled. Georgia is unchanged in the Census file.

## Start date

`effectiveFrom` is one shared PLACEHOLDER, January 1, 2026. Each state's plan took effect on its own enactment date, which is not sourced yet.

## Map outlines

The Census publishes no cartographic file for the 120th Congress. `scripts/maps/district-outlines-2026.ts` dissolves each district from the 2020 block file and the 120th Congress block equivalency, then clips it to the state outline. `scripts/maps/check-district-outlines-2026.ts` runs the same method on the 119th Congress file and compares it with the shipped outlines. Agreement is 99.907% to 99.996% of points, gaps are at most 0.072%, overlaps are 0, and nothing is drawn past the shoreline. The history slider draws these outlines for every date.
