# The Alaska fixture has willing members but none meets its sponsor threshold

The state-service check fails before filing because it demands more principle support than any seated Alaska member has in that opening. Eleven members lean toward the rural-service bill, but the highest score is below its threshold. The compiler was never invoked. Builders should keep compiler validation separate and choose a supported sponsor explicitly for a controlled service check, while retaining the actual selector result as a distinct failure. No principles or bill terms should be inflated to force passage.

## Exact measured reproduction

Measured execution: the audit-only probe reproduced the fixture's opening, incumbent setup, seated introducing chamber and officeholder principle formation. It advanced zero days and invoked no compiler, filing, enactment or payment. Fresh execution source is b0fb2464f682f72e6a970a87b353074fa530034f. The earlier fd4925e6 result is preserved separately as historical evidence. Entry point is docs/codex/audit-systems/sponsor-selector-probe.mts:1; complete saved numerical output is docs/codex/audit-systems-sponsor-selector.json:1.

Measured result: the selected place is Adak, Alaska, place 0200065, from setup seed member-agenda-US-AK. All 40 seated introducing-chamber members were evaluated. Eleven have positive support, 29 have zero, and none has negative support. The maximum is 1.575 raw principle-support points; the minimum is zero. Exactly zero of 40 satisfy the fixture's score >= 3 requirement at src/presentation/ordinary-state-service-cash.test.ts:135. Its sponsor assertion at line 136 therefore fails before introduceAutomaticLawMeasure at line 142.

Measured named example: Samir Weiss, person_a5c665cb3ea06c0c, has recorded collective-provision support of 0.4375. His rural-transit question bearing is 0.9. PrincipledLeaning computes 0.4375 × 4 × 0.9 = 1.575 at src/simulation/governing/officeholder-principles.ts:119. The saved principle record principle_a971989b2394ae71 cites his public-service work and coming of age after 2000. Its note labels the life-pull weights developer-authored stand-ins. Lily Gibson and Shannon Moran tie at the same score; they are not three distinct principle contributions.

Measured distinction: the weighted score is continuous support, not the old discrete moderate/strong label. The importance thresholds remain 3, 6 and 9 raw points at src/simulation/governing/officeholder-principles.ts:24. A positively grounded sponsor can remain below the moderate band. This opening is not evidence that the compiler, current-law lookup or source program contract failed.

## Actionable builder repair

Proposed fixture repair: separate a selector assertion from the supplied legislative/service fixture. For the latter, supply an actual seated member with positive saved support, preserving person ID, principle record IDs and numerical score. Label that sponsor choice controlled, just as the existing fixture labels its bill designation and votes controlled. Do not add principle records, raise their strength, change a law amount or search favorable seeds to meet the old threshold.

Required production boundary: if the intended behavior is ordinary agenda selection, preserve its own actual eligibility and selection rule. A fixture choosing a positive member does not certify that ordinary agenda would sponsor the bill. Compiler refusal still needs a separate call and exact result after a valid sponsor is supplied. This handoff repairs the fixture boundary; it makes no compiler pass claim.

## Method and limits

The fresh b0fb2464 bounded probe completed with exit code zero under the ordinary storage test guard, keeping the 25 GiB reserve and an additional 1 GiB hold. It created one opening fixture but ran no simulation days or second nationwide campaign. Production source and the ongoing campaign pin remained unchanged. Zero full tests, bill passages, payments, browser checks or save/reopen checks were executed. The reproduced sponsor failure is the only runtime claim here. The fresh result is unchanged from the historical opening, but current-head execution supplies its own evidence.
