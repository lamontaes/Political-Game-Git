---
id: words-county-board-named-the-national-average-in-38-states
title: 'A county board is named "Board of Commissioners" where the state calls it a Commissioners Court, a Board of Supervisors or a borough assembly'
area: words
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: Second words reader via the Account lead, Nov 14 (Hidalgo County, Texas "Board of Commissioners"; Kodiak Island Borough "Board of Commissioners"; Walworth County, Wisconsin "Board of Commissioners" with the office "Commissioner")
lead: words
standard: 2
model: sonnet
effort: medium
root: design-words-machine
after:
---

**What.** A county's governing body is said "Hidalgo County Board of Commissioners", but in Texas it is the Commissioners Court, led by the county judge. Kodiak Island Borough is said "Board of Commissioners" where Alaska has a borough assembly, and Walworth County, Wisconsin is said "Board of Commissioners" with members titled "Commissioner", where Wisconsin has a county board of supervisors. Seen: the paper, the meeting panel, the filing counter and the address, wherever the county board is named.

**Cause.** Found in code: `countyGoverningBodyRules` (`src/core2/gov-rules/county-governing-body-rules.ts`) reads the body's name from `states` in `data/research/local-government/county-governing-bodies.json`, which holds 12 states (AZ CA ID ME MN MO MT NV OH OR WA WV). The other 38 states fall to the national average, "Board of Commissioners" with "Commissioner" (`reading = AVERAGE`). The same file's `structure.states` already holds a sourced structure for them: `county-judge` (TX 254 counties, AR 75, KY 118), `borough-assembly` (AK 15), `board` (WI 72), `board-of-supervisors` (VA 95), `county-mayor` (TN 92), `council-executive` or `council` or `legislature` (DE 3, HI 3, SC 46, NY 57). That is 830 of the 3,031 counties named for a body their state does not have; the remaining fallback states are `commission`, where "Board of Commissioners" is the common name.

**Fix.** The body name and member title for each structure are data rows in `county-governing-bodies.json` (a name per structure with its citation, for example county-judge: "Commissioners Court" in Texas, "Quorum Court" in Arkansas, "Fiscal Court" in Kentucky, which are separate rows by state), read by `countyGoverningBodyRules` in place of the average. No county or state is named in logic.

**Time box.** 3 hours, Sonnet, with a researcher pass for the names.

**Rules.** One rule, all 56 places: each name is a data row read for any county, and no state or county is named in logic. Every name is tagged SOURCED or ESTIMATED with its citation.

**Done when.** In three drawn places of different structures (named with seeds) the office record, the paper and the meeting panel say the state's own body and member title; a test pins Hidalgo County, Texas, Kodiak Island Borough, Alaska and Walworth County, Wisconsin to their body names and fails on "Board of Commissioners" in a county-judge, borough-assembly or board state. A second session, on main, opens the office of a Texas county seat and sees "Commissioners Court".

**Waits on.** Nothing.

**Files.** src/core2/gov-rules/county-governing-body-rules.ts, data/research/local-government/county-governing-bodies.json, src/core2/offices-local.ts

**Notes.** Filed by builder S4, Nov 14. Counted from the generated government-units listing and the structure data in the repo. Not fixed by #9108.
