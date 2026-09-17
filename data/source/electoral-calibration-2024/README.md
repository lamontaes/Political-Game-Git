# Electoral calibration reference observations (as of 2026-01-05)

Reference observations for WORLD46 setup calibration (CRUNCH46 section 06 W2,
research inputs R4). This domain holds what the named public sources print. It
is not authored calibration and not simulated history; a consumer that needs a
value this corpus marks missing or ambiguous must use its own explicitly
authored fallback and must not label that fallback as certified data.

## Files

| Path | What it is |
| --- | --- |
| `raw/statistics2024.pdf` | Clerk of the U.S. House, _Statistics of the Presidential and Congressional Election of November 5, 2024_ |
| `raw/statistics2020.pdf` | Same series, November 3, 2020 (Senate class II) |
| `raw/statistics2022.pdf` | Same series, November 8, 2022 (Senate class III; Oklahoma class II special) |
| `raw/nga/<state>.html` | National Governors Association state governor pages (printed Terms and Party) |
| `raw/nga/governor_phil-murphy.html`, `raw/nga/governor_glenn-youngkin.html` | NGA pages for the New Jersey and Virginia governors in office on 2026-01-05 |
| `raw/nga/governors-index.html` | NGA current-governors index (used only to find the state pages) |
| `artifact-lock.json` | URL, retrieval time, SHA-256 and byte length of every raw file |
| `corpus.json` | Normalized corpus; byte-identical to `src/simulation/world-setup/electoral-calibration.generated.json` |
| `corpus-manifest.json` | SHA-256 of `corpus.json`, compiler version, tool versions and coverage counts |

Raw files are publisher bytes exactly as served. Do not reformat them.

## Acquisition (already done; the compiler never touches the network)

```sh
curl -sSL -A "Mozilla/5.0" -o raw/statistics2024.pdf https://clerk.house.gov/member_info/electionInfo/2024/statistics2024.pdf
curl -sSL -A "Mozilla/5.0" -o raw/statistics2020.pdf https://clerk.house.gov/member_info/electionInfo/2020/statistics2020.pdf
curl -sSL -A "Mozilla/5.0" -o raw/statistics2022.pdf https://clerk.house.gov/member_info/electionInfo/2022/statistics2022.pdf
# index of the series: https://clerk.house.gov/Members/ViewElectionInformation
curl -sSL -A "Mozilla/5.0" -o raw/nga/governors-index.html https://www.nga.org/governors/
curl -sSL -A "Mozilla/5.0" -o raw/nga/<slug>.html https://www.nga.org/governors/<slug>/      # 50 states
curl -sSL -A "Mozilla/5.0" -o raw/nga/governor_phil-murphy.html https://www.nga.org/governor/phil-murphy/
curl -sSL -A "Mozilla/5.0" -o raw/nga/governor_glenn-youngkin.html https://www.nga.org/governor/glenn-youngkin/
```

The 2024 PDF was downloaded again on 2026-09-17 (UTC) and matched the
earlier scratch copy byte for byte
(`d4ba800fc17135b616ae556c92861080ab962d95916ace34b546c5aac824aec4`). NGA pages
include per-request nonces, so a fresh download will not match the pinned
hashes. Re-acquiring them is a new capture that needs a new lock.

## Compile

```sh
node scripts/world/compile-electoral-calibration.mjs          # write outputs
node scripts/world/compile-electoral-calibration.mjs --check  # fail if outputs would change
```

The compiler reads PDF text with `pdfjs-dist` (the version is recorded in the
manifest), and it reads House district identities from
`src/districts/identities.generated.json` (the Census 119th Congress Gazetteer,
vintage `census-gazetteer-2025`). It then writes `corpus.json`, the runtime
copy, `artifact-lock.json` and `corpus-manifest.json`. Output JSON has sorted
keys and is formatted with the repository's pinned Prettier. Extracting all
three PDFs takes about two minutes. For development only, setting
`ECAL_PDF_CACHE=<dir>` caches the extracted text items by PDF SHA-256 outside
the repository.

## Rules the compiler applies

- **House (2024).** Each district contest is joined to its Census identity by
  state and district code (`00` for at-large). The seat list is the 50 states
  only. Delegates and the Resident Commissioner are not parsed as seats.
- **Party totals.** Printed vote lines are summed per party label. Democrat,
  Democratic, Democratic-Farmer-Labor and Democratic-Nonpartisan League map to
  `democratic`, and Republican maps to `republican`. Every other label becomes
  lower-kebab case. `Write-in` and `Write-in (Party)` lines map to `write-in`.
  Scattering, All Others, Others and Miscellaneous keep their own keys. Blank,
  void, over/under votes, "None of these candidates" and ranked-choice
  continuing/exhausted-ballot lines go to `nonCandidateLines` and are not
  counted in `totalVotes`.
- **Fusion (NY, CT).** An indented party line belongs to the candidate above it
  and is summed under its own party label. The winner is the candidate with the
  highest combined total, and the winning party is that candidate's name-line
  party.
- **Winner basis.** `winnerBasis` records how each winner was derived:
  - `plurality-of-printed-totals`: the candidate with the most printed votes.
  - `unopposed-no-tally`: FL-20 and OK-03. These candidates are printed without
    a vote figure under the state's footnoted no-opposition rule, so their
    totals are `null`, not zero.
  - `printed-runoff-count`: the Georgia Senate class II (2020) and class III
    (2022) seats. The Clerk prints the runoff count and gives the November
    figures in a footnote. `candidateTotalsByParty` holds the November figures,
    and `decidingCount` holds the runoff figures.
  - `printed-rcv-final-round`: ME-02 (2024), which is printed with
    continuing/exhausted-ballot lines.
  - `rcv-finalists-share-party`: Alaska Senate class III (2022). There was no
    first-choice majority, but the two leaders are both Republicans and cannot
    be overtaken.
  - `residual-of-clerk-political-divisions`: AK-AL (2024). Begich did not have a
    first-choice majority, and the document prints no ranked-choice round. The
    seat stays `ambiguous: true`. Its party is the single seat left after
    matching the document's own "Political Divisions" row for the 119th
    Congress (215 D / 220 R).
- **Majority rules (GA, LA; ranked choice in AK, ME).** A leader without a
  majority and without a printed deciding round is ambiguous.
- **Senate classes.** Classes follow `SENATE_CLASSES_BY_STATE` (senate.gov).
  - Class I uses the 2024 regular elections.
  - Class II uses the 2020 regular elections, with two exceptions: Nebraska uses
    its 2024 special and Oklahoma uses its 2022 special.
  - Class III uses the 2022 regular elections.
  - The 2020 Arizona and Georgia class III specials are superseded by the 2022
    regular elections.
  - California printed a special and a regular contest on the same ballot in
    2022 (class III) and in 2024 (class I). The full-term contest is used both
    times.
  - A Clerk term note maps to a class through the six-year term rotation.
- **Governors.** A governor row is compiled only when an NGA page prints a term
  that covers 2026-01-05. New Jersey's and Virginia's current NGA pages show
  terms beginning January 20 and January 17, 2026, so their rows come from
  their predecessors' NGA pages, and each of those pages must name the state.
  `termStart` is the start of the term as NGA prints it. For Mississippi and
  Tennessee, NGA prints a single span longer than one four-year term, which
  the rows note.
- **Two-party share.** `democraticTwoPartyShare` is D/(D+R), rounded to 1e-6.
  It is set only when both parties have printed votes above zero.

## Reconciliation performed

The compiler records these checks in `reconciliation.checks` and fails if a
control does not match:

- House winners by seat against the Clerk's Political Divisions row for the
  119th Congress.
- Senate winners by seat against the same row.
- Every district's `totalVotes` against the Total column of the state
  recapitulation tables, both horizontal and rotated.
- Senate line sums against the recapitulation "Senator" rows.
- Presidential elector lines against the recapitulation and section Total rows.
