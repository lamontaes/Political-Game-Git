# Starting-law reversal audit: two missing routes

The new exhaustive drafting test finds real reversal drafts for the active starting laws except the local-sales-tax-average record and unemployment insurance. It deliberately fails until those gaps are repaired. It does not skip either record or treat a declaration as a bill route.

Redstone Arsenal, Alabama (`0163912`), replay `2ee24a776e9e4f03`, world seed `8f865de9038a34f11fdb41f9c093d2a7e25f7c0ff092f4a4d97786721f29bbe5`. [Records](records.json) list all 82 active records, the 80 actual authorized drafts, their bodies and bill IDs, and both failures. The active set comes from the shared law reader for every series in the opening game's law table; superseded phases, pending rows and rules set aside in this place are not laws in force there.

The two missing rows are:

- `law:US-AL:state:local-sales-tax-average:general:2025-01-01`. This is a statistical fallback, not a statute the Alabama legislature can repeal. Its producer and consumers must distinguish that calibration fact from actual law; the test must not skip a row left in the law table.
- `law:US-AL:state:unemployment-insurance:general:2026-01-01:from-start`. The state has power to repeal it but the catalog has no program-repeal control. The older wiring catalog claimed “every state must run the program (26 U.S.C. 3304).” That is not what the statute says: [26 U.S.C. §3304(a)(19)](https://www.law.cornell.edu/uscode/text/26/3304) requires approved state law to reserve legislative amendment and repeal: “all the rights, privileges, or immunities conferred by such law or by acts done pursuant thereto shall exist subject to the power of the legislature to amend or repeal such law at any time.” The unsupported exemption is removed. Cutting a maximum or tax rate is not a substitute for a program-repeal route.

The raw local-minimum-wage-authority series has an existing concrete route through `us-policy-positions:labor-workforce.local-minimum-wage-authority`: `group-a-wages.localWageAuthority` writes the authority series consumed by the wage resolver. The audit names that policy and drafts it through the actual state body; no state wage-bar implementation is changed.

For a yes/no question the test reverses the opening answer (enact when no, repeal when yes); for an amount it drafts the corresponding raise or lower. It asserts catalog authority and the actual draft's authority. These are drafting checks, not a claim that every vote passes or every downstream effect has been tested. The separate state and Congress played enactment/repeal proofs are on main in #7323 and #7326.

Reproduce the currently failing assertion:

```sh
OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" NODE_OPTIONS=--max-old-space-size=8192 GOLDEN_PATH_SEED=2ee24a776e9e4f03 npm exec -- vitest run src/core2/starting-law-repeal-routes.test.ts --reporter=verbose
```

Do not merge this draft while the assertion fails. Repair the missing routes in bounded changes, incorporate them here, then run ten fresh draws without weakening the assertion. Federal reach and exact authority/source work remain separate unfinished parts of the owner goal.
