# Research 2: observed world movement

This packet records six narrowly defined movements that may inform the default
prior-year world. It is **research evidence only**. It does not change world
state, install a default, prescribe a random draw, or supply a causal response
to a player action. Its main value is a sourced range with an explicit unknown
case for places the evidence does not cover.

## Observed samples

The source rows and measured differences are in
[`movement-evidence.json`](movement-evidence.json). The validator checks the
packet's arithmetic and references; it cannot certify an external source.

| Metric               | Named sample                                                                     |  Observed movement | Unit                                                          |
| -------------------- | -------------------------------------------------------------------------------- | -----------------: | ------------------------------------------------------------- |
| Unemployment         | U.S. annual averages, consecutive 2016–19 and 2022–24 transitions                |       −0.5 to +0.4 | percentage points per calendar year                           |
| Prices               | U.S. PCE index, 2024 and 2025                                                    |  +2.6 in each year | percent growth in price level                                 |
| Gasoline             | U.S. regular retail annual averages, consecutive 2016–19 and 2023–25 transitions | −$0.215 to +$0.304 | per gallon per calendar year                                  |
| President approval   | Gallup, Biden second through fourth presidential years                           |       −1.2 to −0.7 | percentage points per presidential year                       |
| Governor approval    | Berkeley IGS, California registered voters, February 2023–April 2025             |            −9 to 0 | percentage points across irregular 11- and 15-month intervals |
| State budget balance | California audited General Fund, FY2024 restated to FY2025                       |      −$6.5 billion | one fiscal-year change                                        |

These are the minimum and maximum **of the listed observations**, not estimated
normal limits. Selection intentionally avoids the 2020–21 pandemic period and
does not bridge gaps between nonconsecutive years. It is illustrative rather
than a representative statistical sample. The EIA table contains a 2022 fuel
spike that is outside the gasoline comparison set. The BLS 2025 annual row is
an 11-month average because October 2025 was not collected during the federal
shutdown, so it is outside the unemployment comparison set. The approval
series have different denominators and periods. The California General Fund
balance is an audited stock after transfers, including restricted dollars; it
is not a budget deficit or money available to spend.

## Receiver contract for A, E, and C

1. Match **measure, period, place, and denominator** before considering an
   observation. A national unemployment rate or gasoline price is not a local
   rate. The Berkeley poll describes Governor Newsom among California
   registered voters, and the audited fund balance describes California's
   General Fund only.
2. Treat `observedRange` as a cited historical envelope. It is not a probability
   distribution, clamping rule, universal yearly drift, or permission to roll a
   world value. Price movements are positive changes in the **price level**;
   equal 2024 and 2025 inflation rates do not mean flat prices.
3. If a jurisdiction-specific value, compatible time unit, or approved
   simulation rule is absent, preserve `UNKNOWN` with `value: null`. Do not
   substitute zero, a U.S. observation, a California observation, or an
   invented forecast. A consumer may display an explicitly labeled unknown
   or leave the prior-year value unresolved. Any gameplay producer needs a
   separate approved rule and its own save/history evidence.

The next research step is a compatible state-level unemployment and gasoline
series, additional governor poll series with matching populations, and multiple
audited General Fund years or states. Those additions are needed before a
general jurisdiction calibration can be proposed. The current packet is ready
to hand off as evidence and an UNKNOWN contract, with those gaps explicit.
