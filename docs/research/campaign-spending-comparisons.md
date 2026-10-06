# Campaign spending comparison fallback

The campaign screen first looks at campaign purchase totals already recorded in the current game. It compares races with household estimates between half and twice the current place, then shows the median of those totals. A purchase total exists only after a campaign actually paid for the units.

Household counts use ACS 2020–2024 place populations where available, then the 2020 Census PL 94-171 population table in `data/research/money/place-population-census-2020.json`, compiled from the repository's place-to-district relations and deduplicated by place GEOID. Population is converted to households at an estimated 2.5 people per household. Only places missing from both sources fall back to household locations recorded in the current game.

Until the current world has a comparable recorded race, the screen uses $32,665 as an explicitly estimated reference. That figure is the Massachusetts 2022 average spending reported for state House candidates in the existing `data/research/campaign-reality/campaign-evidence.json` packet (`ma-ocpf-2022`). It is a single-state observation used as a temporary reference, not a local prediction or spending target. The estimate label disappears only when comparable recorded races in the current world are available.
