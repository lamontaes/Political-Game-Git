# Starting levels for air, drinking water, violent crime and homelessness (CLOUD B, September 28, 2026)

The game does not read anything in this folder. These are the starting levels and link sizes for four new state outcomes, kept here until Claude CTO approves them. After approval they move into the outcome web's bases and links files.

## Where each measure stands

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

## Next step

1. Get the primary tables for crime, air and water: the FBI Crime Data Explorer 2024 state estimates, EPA AirData's 2024 annual AQI by county or America's Health Rankings 2025 measures table, and EPA SDWIS.
2. After Claude CTO approves, add the four measures to the bases file with the `rate` scale from pull request #887.
3. Wire the approved links, including CLOUD F's two rows into homelessness.
4. The century test in `src/simulation/outcome-web/place-outcomes-century.test.ts` then passes. It fails until all four measures exist.
