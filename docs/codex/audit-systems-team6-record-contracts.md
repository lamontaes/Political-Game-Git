# Payments exist; driver bills, road repairs and plant operations still need records

Team6 can reuse the shared appropriation, commitment and payment engine. Its saved transfers establish spending, while its default provider and maintenance capacity remain authored game profiles. Mileage charging currently changes an aggregate tax factor; clean-electricity rules change outcome projections. Builders need actual operators and service records before attributing driver bills, road repairs, generation or household purchases to these laws. The next integration should supply those records through the shared engine, with missing terms left unresolved.

## The shared payment contract

Measured source: `commitPublicProgram(world, input)` takes an appropriation ID, alternative, deciding person, office and recipient organization ID. It checks authority, availability and affordability before saving installments with dates, amounts and purposes. Positive spending requires an organization recipient. Source: src/simulation/governing/public-program.ts:819.

Measured source: `settleProgramInstallment(world, commitmentId, index)` checks actual account cash and the appropriation's expiration. A successful installment creates an organization-to-organization resource flow and completed transfer; a failed installment preserves its reason. Source: src/simulation/governing/public-program.ts:970.

Measured saved types: the existing join is appropriation → commitment → installment → resource flow → transfer. Commitment records retain the deciding person and recipient; installments retain their commitment ID and flow ID. Transfer records retain date, period, status, attempted money and transferred money. Money carries its currency and minor units. Sources: src/simulation/types.ts:3974 and src/simulation/types.ts:3161.

Measured payment attribution: the transit callback requires matching measure, program, appropriation, commitment, installment and completed transfer. It appends a law stamp to an already posted government outlay rather than adding the payment again. It expressly infers no purchased vehicle hours from the installment. Source: src/simulation/governing/public-program-transit.ts:22.

Measured preserved example: Mei Miranda's controlled opening is in Aberdeen, Ohio. Governor Jennifer Cabrera's three-payment schedule includes one payment before the law's operative date and two afterward. Those two transfers total $5,333,333.32 and have matching new-law stamps; this proves payments, without establishing any boarding or personal fare relief. Source: docs/codex/audit-systems-fare-producer.md:29.

## Mileage: aggregate revenue is not a driver's bill

Measured source: `roadChargeFactor(world, government, date, erodedOn)` returns a dimensionless multiplier for a state's selective sales taxes. It reads the motor-fuel share and operative law; nonstate governments receive a multiplier of 1. The monthly budget consumes that factor within its selective-sales-tax calculation. Sources: src/simulation/public-budgets/road-usage-charge.ts:56 and src/simulation/public-budgets/month.ts:322.

Measured assumptions: the reader spreads a projected 21% fuel-tax loss across 28 years and freezes erosion after a 24-month first-bill lag. These are aggregate timing and revenue assumptions, not saved odometer readings or collected assessments. Source: src/simulation/public-budgets/road-usage-charge.ts:12.

Inferred builder contract: a driver charge needs an existing person identity, a vehicle identity, a dated distance observation with explicit miles, applicable jurisdiction and enacted rate terms. It also needs assessment, payer, credit or exemption and actual collection lineage. The inspected reader takes none of those inputs; reusing its aggregate multiplier cannot supply them. Source: src/simulation/public-budgets/road-usage-charge.ts:56.

## Fix-it-first: a conditional profile can record modeled capacity

Measured source: the admitted local variant applies to municipalities and counties with an authored game-profile authority. It declares 1 generic road-maintenance unit, initially 0 operational units, $5,000 monthly operating need, $100,000 restoration cost per unit and a 60-day maintenance lead. Its basis explicitly says the unit is not a named road or measured repair. Source: src/simulation/legislation-local-fiscal-families.ts:35.

Measured source: the governing capacity selector admits matching transit, state game-profile or NPC program profiles. A profile is conditional on that enacted lineage; an arbitrary fix-it-first law does not establish actual road capacity. Source: src/simulation/governing/program-governing.ts:555.

Measured source: posted maintenance schedules delivery when a lead time exists. The delivery writer calculates restored units as the smaller of remaining capacity and the payment divided by declared restoration cost, rounded down. It saves commitment and installment IDs, place label and before-derived operational count. Sources: src/simulation/governing/public-program.ts:1090 and src/simulation/governing/public-program.ts:1146.

Inferred builder contract: actual road delivery requires a named road asset or work location, responsible operator, authorized work scope, dated work evidence and an accepted completion or inspection. The existing arithmetic capacity outturn can preserve modeled units, but cannot establish a repaired road, crew hours or materials consumed. Source: src/simulation/governing/public-program.ts:1166.

## Clean electricity: projected outcomes do not establish operation

Measured source: the two inspected clean-electricity links target electricity price and particulates. The price link declares a 0.11 relative increase with an 84-month lag; the particulate link declares a −0.01 relative change with a 60-month lag. These are link parameters, not measured purchases or plant emissions. Sources: data/research/outcome-web/links.json:2736 and data/research/outcome-web/links.json:3910.

Measured source: place outcome records carry prior aggregate levels, drift and outcome-web multipliers. This consumer does not take generator, meter, dispatch, fuel delivery or electricity purchase records as inputs. Source: src/simulation/outcome-web/place-outcomes.ts:154.

Inferred builder contract: actual operation needs identified generators and operators, dated generation and dispatch quantities with explicit energy units, fuel inputs where relevant, purchases and payments, and measured or declared emissions with explicit mass units. Eligibility and compliance must come from the enacted rule's own terms. The two inspected links cannot generate those identities or quantities. Source: data/research/outcome-web/links.json:2744.

## Replace the fictional provider at the existing caller

Measured source: the governing program decision calls `programOperatorOrganization` and passes its result to `commitPublicProgram`. The helper reuses a matching generated provider or creates a private-sector organization expressly labeled fictional, with a zero-balance USD position. Sources: src/simulation/governing/state-governing.ts:1748 and src/simulation/governing/program-governing.ts:1035.

Inferred ready integration boundary: resolve an existing eligible operator organization before this caller commits positive spending. Preserve that organization's identity and existing resource position, the office's authority and the agreed installment terms. If eligibility, operator or purchase terms are absent, preserve the missing-input decision instead of creating a provider that implies real delivery. Source: src/simulation/governing/state-governing.ts:1754.

Measured reusable labor records: `recordWorkRole(world, input)` writes a role linked to an existing work relationship, with validated person, effective date and provenance. Town payroll already creates resource flows and transfer outcomes. Its paid weekly hours use the midpoint of the role's expected range, which is not an observed service-hour log. Sources: src/simulation/life.ts:1247 and src/simulation/living-world/town-pay.ts:585, :794 and :1296.

Inferred integration requirements: link a real operator's existing employment relationships, agreed compensation and dated payroll transfers when labor is actually purchased. Vehicle use, fuel purchases, road inspection and generator operation require their own identifiable evidence. A program payment alone provides none of those facts; no dollar-per-hour rate, rider count or national coefficient is supplied here. Source: src/simulation/governing/public-program-transit.ts:168.

## Scope and handoff

Measured source scope: all production citations refer to d9e4b8689b24470af29262d5b38affcc9dbb360a. The preserved Ohio example belongs to the parent's controlled diagnostic, not a new run or nationwide service proof. This report adds no production code, simulation, per-law engine or metric key.

Measured path gap: the exact Git tree has no `src/simulation/governing/public-capacity.ts` and no root `src/simulation/public-capacity.ts`. The actual inspected capacity writer is `src/simulation/governing/public-program.ts:1146`. Team6 should target that consumer and the existing operator caller rather than an unverified module.

Inferred handoff: Team6 should integrate supported records through the same shared engine for the owner's eight kinds of effects. Distances, rates, assets, service acceptance and operator eligibility remain required inputs; these bounded source reads do not establish that such records are absent everywhere in the repository.
