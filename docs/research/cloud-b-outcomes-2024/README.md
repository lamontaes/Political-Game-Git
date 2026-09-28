# Starting levels for air, drinking water, violent crime and homelessness (CLOUD B, September 28, 2026)

The game does not read anything in this folder. Claude CTO approved the design and link sizes at 2:18 p.m. on September 28, 2026, and the bases the game uses came from CLOUD I's primary tables (the 1:53 p.m. source check), not from the drafts here. This folder keeps the research trail.

## The search drafts, before the primary tables

| Measure                              | Key                             | Places with a value | Source                                                                                 |
| ------------------------------------ | ------------------------------- | ------------------- | -------------------------------------------------------------------------------------- |
| People homeless per 10,000           | `housing.homelessness`          | 54 of 56            | HUD's own 2024 state counts, over Census 2024 populations                              |
| Violent crimes per 100,000           | `crime.violent`                 | 51 of 56            | Search summaries of the FBI's 2024 state estimates; 24 checked against a second source |
| Fine particles in the air (PM2.5)    | `env.particulates`              | 4 of 56             | Search summaries of America's Health Rankings 2025                                     |
| Drinking-water violations per system | `env.drinking-water-violations` | 1 of 56             | Search summaries of America's Health Rankings 2025                                     |

Homelessness is the only measure from a primary table. American Samoa and the Northern Mariana Islands have no HUD count, so they stay unknown, never zero.

## Files

- `homelessness-hud-2024.json`: count, population and rate per 10,000 for each place, with sources.
- `violent-crime-search-draft.json`, `air-search-draft.json`, `water-search-draft.json`: search-based drafts. Each needs checking against the primary table before use.
- `link-sizes-proposed.json`: 15 proposed links into these measures, with research anchors. The summary is in the 03 PROJECT LANES entry dated 1:18 p.m.
- `crime-bases-and-links.patch`: the violent crime levels and two links, written into the game's data files and ready to apply once approved.

## What changed after approval

- All four measures now use CLOUD I's primary tables: HUD's published rates, the FBI Crime Data Explorer's reported rates, and America's Health Rankings for air and water. The search drafts here held up where they had values.
- The homelessness rates for Puerto Rico, Guam and the Virgin Islands are the computed ones in `homelessness-hud-2024.json`, since HUD publishes no rate for them.
- The patch file is superseded: the approved rows went in with the carry-permit link marked contested.
