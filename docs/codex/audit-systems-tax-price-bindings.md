# Tax and price writers exist, but their legal term bindings differ

Team3 can reuse the exact tax-base, assessment and collection route, alongside the statutory paycheck assessor. Team4 can reuse loan-term revisions, lease renewals and accepted education terms. These writers already preserve numeric amounts and saved identities. They do not share one complete legal-term binding: some require enacted measures, some use fixed constants, and accepted tuition terms are immutable. The shared integration needs validated numeric terms and legal origins without replacing these existing writers or inventing a general accessor.

## Team3: exact tax terms and actual taxable occurrences

Measured signature: `adoptEnactedTaxPolicy(world, proposalId): World` requires an enacted measure and exact agreement between the proposal's levy provision ID, saved text and numeric terms. A changed tax text requires an explicitly supported revision. Source: src/simulation/tax-policy.ts:376.

Measured signature: `effectiveTaxPolicy(world, jurisdictionId, seriesKey, at): TaxPolicyRecord | null` selects a saved effective policy. `previewTax(terms, baseKey, amount)` subtracts the monetary allowance and applies the exact rate numerator/denominator with half-up rounding to currency minor units. Missing amount returns unavailable; it does not become zero. Sources: src/simulation/tax-policy.ts:473 and src/simulation/tax-policy.ts:492.

Measured writer: `recordTaxBase(world, input): World` requires an existing payer, jurisdiction and current canonical occurrence event. `assessTaxBase(world, baseId, seriesKey): World` freezes the policy effective on that occurrence and prevents retroactive collection. This supplies base-event, base-record and policy identities; an answer to a policy question alone supplies none of their numeric terms. Sources: src/simulation/tax-policy.ts:533 and src/simulation/tax-policy.ts:577.

Measured unit bound: `assertTaxTerms` admits USD and an exact integer rate fraction between 0 and 1. A per-weight or per-distance tax cannot reuse a monetary base by treating grams or miles as currency. Source: src/simulation/tax-policy.ts:1032.

Measured paycheck signatures: `assessPaycheckTaxes(world, outcomeId): World` and `assessPaychecksTaxes(world, outcomeIds): World` consume actual positive USD transfers with a work basis and person recipient. They preserve statutory liability separately from withholding and payment. A lawful zero and unknown unpriced liability remain distinct. Source: src/simulation/statutory-tax.ts:96.

Measured numeric authority gap: `federalIncomeTaxUnderLaw(world, status, paidAt)` reads January 1 of the pay year with enacted-only selection. A yes replaces the top bracket with the fixed 3,960 basis points, or 39.6%; a no retains the baseline. Starting schedules return no governing-law identity. Sources: src/simulation/federal-top-income-tax-law.ts:60 and src/simulation/federal-top-income-tax-law.ts:28.

Inferred Team3 boundary: retain existing occurrence IDs, filed proposal/provision identity, exact units, policy effective date and actual settlement. Admit supported starting and enacted numeric terms through the shared integration; do not manufacture a levy rate from a Boolean answer or reinterpret an unknown liability as zero. Sources: src/simulation/tax-policy.ts:392 and src/simulation/statutory-tax.ts:206.

## Team4: loans, rent and education charges

Measured loan signature: `reviseLoanTerms(world, resourceObligationId, change, stableKey, provenance): World` accepts changes to annual basis-point rate, rate basis, cap measure ID, repayment and late fee. It saves successor terms for the existing obligation, with effective date and superseded terms ID. Source: src/simulation/household-loans.ts:247.

Measured loan consumer: servicing selects the terms effective on the due date and saves an interest charge linked to that terms ID. The charge amount retains the debt currency and minor units. Annual interest uses basis points, where 100 basis points equals 1 percentage point. The revision accepts a cap measure ID, rather than a complete shared legal-origin identity. Source: src/simulation/household-loans.ts:462.

Measured rent signatures: `renewedMarketRent(oldMinor, homePrices, prices, stabilized)` computes the next amount. `renewTownLeases(world, dueOn): World` selects actual leases at their annual renewal and writes successor flow terms with the prior currency and terms ID. Sources: src/simulation/living-world/town-rent.ts:1570 and src/simulation/living-world/town-rent.ts:1603.

Measured rent binding: the cap uses fixed constants of 5 percentage points over price inflation and a maximum 10% increase. The renewal reads the governing rent-stabilization rule, but its numeric cap comes from those constants; provenance searches for an enactment event. These are not arbitrary numeric terms parsed from an operative provision. Sources: src/simulation/living-world/town-rent.ts:249 and src/simulation/living-world/town-rent.ts:1649.

Measured education signatures: `acceptedEducationTerms(world, enrollmentId)` resolves a unique saved agreement matching the enrollment and program. `recordAcceptedEducationTerms(world, enrollmentId, terms): World` requires that agreement, writes an evidence artifact and refuses replacing accepted terms. Existing source-evidence fields include artifact ID, hash, member and row. Source: src/simulation/education-study-terms.ts:50.

Measured tuition writer: `completeStudyPeriod(world, enrollmentId, path): World` uses the existing enrollment and checks available personal cash. A positive period cost creates a person-to-institution tuition flow and completed USD transfer. Those records save the actual charge and payment; this inspected hunk provides authored path provenance rather than a governing law's operative numeric-term identity. Source: src/simulation/education-study-progression.ts:556.

Inferred Team4 boundary: retain obligation/lease/enrollment IDs and the exact existing terms IDs, currency, effective date and actual transfers. A law-driven price revision needs supported numeric terms and eligibility linked to its governing authority. Preserve accepted tuition agreements; changing a current catalog or Boolean answer must not reprice an earlier accepted enrollment. Sources: src/simulation/household-loans.ts:267 and src/simulation/education-study-terms.ts:113.

## Preserved person evidence and scope

Measured historical example: Jennifer Conway in Appomattox, Virginia, has compensation increasing from 189,200 to 224,000 minor units per paycheck and three transfers of 224,000 minor units each. Those exported rows do not state currency. Their periods span July 4–17, July 18–31 and August 1–14, 2026. The preserved teacher-floor receipt demonstrates separate person, terms and payment evidence. It is not a tax, loan, lease or tuition execution receipt. Source: docs/codex/handbacks/team-5-teacher-five-state-receipt.json:18.

Measured scope: production reads are pinned to d9e4b8689b24470af29262d5b38affcc9dbb360a. No world, test or simulation was run; no production or Git state changed. This bounded contract trace verifies the named exports, not a registered new capability or a repository-wide absence. It does not certify any newer open handler draft.

Inferred handoff: Team3 owns tax occurrences and assessments; Team4 owns price terms and charges under the owner's parallel assignment. Both can call the existing narrow writers through the shared engine, while coordinator owns common term and origin integration. Missing supported units, rate terms or legal identity remain explicit blockers rather than guessed amounts.
