# Homelessness: losing a home is a state every engine reads

**Owner, Oct 14, 2026.** "If those people choose not to get jobs, that's fine. But they should become homeless. Homelessness needs to be a factor in the game. People should be motivated, for their own reasons; not being homeless is some people's motivation. Homelessness exposes you to drugs and violence. This needs to be wired correctly in the outcome web." Ruled earlier (Sept 26): "a person who runs out of money can lose their home and become homeless. Record it now."

## Why it does not happen today

- Stopgap `SG-WORLD-housing-unmodeled-renters` (`src/core2/data/stopgaps.json`): a renter with no recorded income is never charged rent and cannot be evicted; counted renters pay from a place pool with no arrears. The jobless 18-year-olds with $0 in the audits never reach eviction.
- Removal writes a dwelling row with tenure "removed" that nothing reads (`src/core2/modules/housing.ts` about lines 1403 to 1478; the only tenure reader is `moves.ts:269`, which tests for "own").
- No housing status exists on a person or a counted group; homelessness is a place measure in the outcome web (`src/core2/data/outcome-web/coverage.json`) with no person-side reader.
- The player's household always settles (open question in the Build 10 handoff).

## What to build

**WORLD (housing, credit, residents):**

1. Retire the stopgap: every renter, full or counted, with or without income, owes rent on the lease and runs the same arrears, case, notice and removal under the place's law (one model, two tiers). The player's household is evictable like any other (owner-decision stopgap `owner-decision` registered until he rules; default: yes).
2. A housing status on every person and counted group: housed, doubled up with kin, sheltered, unsheltered. Removal writes it; the move engine, kin and the place's shelter beds (data, from HUD's Housing Inventory Count, cited) decide where the household goes, by causes (a relative with room in town or elsewhere, a shelter with a bed, else unsheltered). Counted groups carry the counts.
3. Calibration: the place's homeless count per 10,000 is checked against `docs/research/cloud-b-outcomes-2024/homelessness-hud-2024.json` (HUD 2024 point-in-time), and the rent-burden curve in `docs/research/outcome-web-2026-09-28.md` (rises past 22 percent of income, faster past 32), as calibration tests, never as a draw.

**CORE (drives, health, jobs, views; PEOPLE's engines held by the core session while no PEOPLE session is live):** 4. Motivation: the drives engine reads cash runway and housing status. Keeping a home, feeding children and not sleeping outside are causes. They raise the pull to look for work, take a worse job, ask kin for help or apply for benefits, on a sliding scale by traits. Some people still will not, and that is theirs. 5. Exposure: the health engine reads housing status: unsheltered and sheltered people face higher rates of injury, assault, substance use, illness and death, from causes and the place's conditions (calibrated against the research, cited), never a monthly chance. An eviction lowers earnings and raises hospital visits for two years (Collinson et al. 2024) through the jobs and health engines reading the record. 6. Everyone reads it. The press covers a rise in the count. Views and voters read it. The director writes the scene. Constituent cases carry it to the officeholder. Benefits reach the person through the same eligibility read as any benefit: state unemployment at each state's real duration, SNAP, and housing assistance where the law funds it.

## How the owner plays it to know it works

A played year in a random town, seed not the builder's. Name one person who stopped working: the date rent went unpaid, the case, the removal, where they went and why. Say what they then did about it, or did not, and what it cost their health or their check, by record id. Give the town's count against HUD. The director's journal line for it is in the PR body.

## Model and effort

Opus, high, split between WORLD and CORE on their own branches; the chain is the acceptance.

## Owning: default, foreclosure, estates and the laws over them (owner, Oct 14, 2026, late morning)

"Not just rent: whatever happens if you don't pay your house. And inheritance: you should be able to pass inheritance laws and taxes, trust taxes. That system needs to be worked out."

**What exists.** Money passes at death to family or the state (#4191), with no will, no probate order and no tax. No foreclosure exists in `housing.ts` or `credit.ts`: an owner who stops paying the mortgage keeps the house. No estate or inheritance tax series exists in the law catalog; property tax is the only tax on a home.

**WORLD (credit, housing):** a missed mortgage payment runs the lender's path under the state's law from data, cited: delinquency, notice, the state's judicial or nonjudicial foreclosure timeline, sale, and the household's removal with the same housing status as an eviction. The bank's books carry the loss. Counted owners default at the same rule times their count.

**CORE (estates):** a will where the person's traits and kin produce one, with a share by kin and closeness, else the state's intestacy order from data, cited. Probate is a timeline, not a scene. The estate pays its debts, then the taxes in force, then the heirs. A trust is the simplest real version, assets that pass outside probate, behind an `owner-decision` stopgap on how far trusts go in 1.0.

**GOV (laws):** estate tax and inheritance tax as law series any legislature with the power can set. The federal estate tax carries its exemption and rate from data (2025: $13.99 million, 40 percent, cited). The twelve states and D.C. with an estate tax and the five with an inheritance tax carry their real thresholds and rates, cited. A bill in the real form changes the threshold or rate. The treasury reads the law when an estate settles. The chain is a death, the estate, the tax paid to the named treasury, the heir's smaller check, and the heir's view of the law that took it.

**Proof:** one played year, seed not the builder's: one owner who defaulted (notice, timeline, sale, where they went), one death with an estate (will or intestacy, debts, tax to which treasury, heirs by record id), and the journal lines for both.
