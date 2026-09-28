# County housing costs and commute time have sourced observations

The source lane now holds 2020–2024 American Community Survey (ACS) five-year observations for all 3,222 U.S. county and county-equivalent IDs in the existing regional corpus, including Puerto Rico. These are published estimates with margins of error. They do not set a game's housing bill, home price, travel distance, or travel time.

## Source and units

The [Census 2024 ACS table-based summary file](https://www.census.gov/programs-surveys/acs/data/summary-file.2024.html) provides the original 5-year detailed-table files. The import locks the publisher's [B25077 median home value](https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/acsdt5y2024-b25077.dat), [B25064 median gross rent](https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/acsdt5y2024-b25064.dat), and [B08303 travel time to work](https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/acsdt5y2024-b08303.dat) files, plus the [official table shells](https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/documentation/ACS20245YR_Table_Shells.txt). The lock lists source URLs, byte lengths and SHA-256 hashes. The compiler retains each estimate and margin of error as both raw text and a parsed number where valid, with source line numbers and published labels.

| ACS table | Published universe                                 | Observation retained                                     |
| --------- | -------------------------------------------------- | -------------------------------------------------------- |
| B25077    | Owner-occupied housing units                       | Median value, U.S. dollars                               |
| B25064    | Renter-occupied housing units paying cash rent     | Median gross rent, U.S. dollars per month                |
| B08303    | Workers age 16 and over who did not work from home | Total and 12 one-way travel-time bins, counts of workers |

The B08303 bins measure **minutes**, not miles. A future commute-distance rule cannot treat them as distances. The period is the 2020–2024 five-year estimate, not a current monthly price or a 2024-only change. A county median does not establish a particular household's rent, home value, tenure, or commute.

## Checked source cells

| County equivalent                          | B25077 median value | B25064 median gross rent | B08303 non-home commuters | B08303 45–59 minutes |
| ------------------------------------------ | ------------------: | -----------------------: | ------------------------: | -------------------: |
| Bolivar County, Mississippi (`28011`)      |            $130,000 |               $685/month |                     9,963 |                  353 |
| Franklin County, Ohio (`39049`)            |            $288,400 |             $1,302/month |                   554,131 |               15,399 |
| San Francisco County, California (`06075`) |          $1,394,500 |             $2,476/month |                   321,804 |               32,887 |
| Adjuntas Municipio, Puerto Rico (`72001`)  |             $94,300 |               $425/month |                     4,657 |                  295 |

The validator checks these raw source cells, input hashes, the 3,222 distinct geography IDs, their exact match to the prior regional county set, all 13 commute cells per county, and each published commute-bin sum. This is source-file validation, not a player route or visual acceptance.

## Missing values and handoff

Five county home-value estimates and seven county rent estimates contain the ACS `-666666666` jam value. Twelve corresponding margin-of-error cells contain `-222222222`. Their raw marks remain in the corpus with parsed `null` values; none becomes zero. The [ACS table-based summary-file handbook](https://www2.census.gov/programs-surveys/acs/summary_file/handbooks/acs_table_based_summary_file_handbook.pdf) describes jam values used when an estimate cannot be computed. The source does not justify filling those gaps from a neighboring county or turning an absent median into permission for a purchase or lease.

The deterministic compiler emits one compressed source corpus and a lock/manifest pair; originals remain once in the owned source directory. No simulation formula, player consumer, source registry, or saved game changed. Future design must choose how published county estimates, margins of error, and unmatched individual circumstances enter play. No browser/player acceptance was run for this source-only checkpoint.
