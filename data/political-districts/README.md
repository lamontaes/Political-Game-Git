# Official U.S. Census Bureau Political Districts Geography Corpus

## Overview

This corpus provides official, clean identity and geography metadata for U.S. Congressional Districts (119th Congress) and State Legislative Districts (Upper and Lower Chambers) derived directly from 2025 U.S. Census Bureau Gazetteer files.

It strictly provides geographic identity, area, and internal point coordinates published by the U.S. Census Bureau. It contains **no** election results, candidate identities, representative assignments, political party affiliations, or gameplay mechanics.

## Coverage & Record Counts

| Geography Type | Description                                                    | Source File                    | Record Count |
| -------------- | -------------------------------------------------------------- | ------------------------------ | ------------ |
| `cd`           | 119th Congressional Districts                                  | `2025_Gaz_119CDs_national.txt` | 440          |
| `sldl`         | State Legislative Districts (Lower Chamber / House / Assembly) | `2025_Gaz_sldl_national.txt`   | 4,879        |
| `sldu`         | State Legislative Districts (Upper Chamber / Senate / Council) | `2025_Gaz_sldu_national.txt`   | 1,964        |
| **Total**      |                                                                |                                | **7,283**    |

## Special Jurisdictional Notes

- **Nebraska Unicameral**: Nebraska operates a unicameral legislature (State Senate). Census Gazetteer publishes 49 SLDU records and 3 CD records for Nebraska, and **0** SLDL records.
- **District of Columbia**: DC has 1 Congressional Delegate District (`1198`) and 8 Council Wards (`11001` to `11008` under SLDU). It has **0** SLDL records.
- **Puerto Rico**: Puerto Rico has 1 Resident Commissioner District (`7298`), 41 SLDL records (40 districts + 1 unassigned water area `72ZZZ`), and 9 SLDU records (8 districts + 1 unassigned water area `72ZZZ`).
- **At-Large Congressional Districts**: Single-district states (AK, DE, ND, SD, VT, WY) are coded with district code `00` (e.g. GEOID `0200` for Alaska At Large).
- **Unassigned / Undefined Areas (`ZZ` / `ZZZ`)**: Areas in Census shapefiles not assigned to state legislative or congressional districts are preserved with code `ZZ` or `ZZZ` as published by Census.

## Data Schema

Each record in `compiled-political-districts.json` conforms to the `PoliticalDistrictRecord` interface:

```typescript
export interface PoliticalDistrictRecord {
  geographyType: "cd" | "sldl" | "sldu";
  usps: string; // USPS postal abbreviation (e.g., 'AL', 'CA', 'NE')
  stateFips: string; // 2-digit state FIPS code (e.g., '01', '06', '31')
  districtCode: string; // Official district code (e.g., '01', '00', '001', '00A', 'ZZZ')
  geoid: string; // Census GEOID (4 chars for CD, 5 chars for SLD)
  geoidfq: string; // Fully qualified GEOID (e.g., '5001900US0101', '620L900US01001')
  name: string; // Source display name
  aland: number; // Land area in square meters
  awater: number; // Water area in square meters
  alandSqmi: number; // Land area in square miles
  awaterSqmi: number; // Water area in square miles
  intptlat: number; // Internal point latitude
  intptlong: number; // Internal point longitude
  vintage: {
    censusYear: number;
    congress: string | null;
    gazetteerFile: string;
  };
}
```

## CLI Commands

- `npm run compile:political-districts`: Compiles raw Census Gazetteer text files into `compiled-political-districts.json` and updates `provenance.json`.
- `npm run validate:political-districts`: Runs comprehensive data integrity, row count, FIPS, and forbidden key checks.

## Future Crosswalk Integration Note

`GEOID` and `GEOIDFQ` serve as stable canonical keys across official Census geography products:

1. **Census Places & Counties**: Joining on 2-digit `stateFips` links districts to Census Places (`data/places/`) and Census Counties (`data/counties/`).
2. **ACS Demographic Baselines**: Census block groups and tract level ACS PUMS/baselines aggregate up to `GEOID` / `GEOIDFQ` political district geographies.
3. **FEC Candidate & Election Data**: Federal legislative candidates (U.S. House) link to 119th CD records via `(usps, 'cd', districtCode)`.
