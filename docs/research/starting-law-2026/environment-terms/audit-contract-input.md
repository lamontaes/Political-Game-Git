# Environmental terms keep the amount and its denominator

Audit can use these cited values to implement the admitted starting category, tier, and quantity-unit contract. Domain row edits follow its schema/query publication. This is a concrete input packet, not a second schema or reader implementation. It extends the published source packet without changing any starting answer.

## Container deposit inputs

Question: `us-policy-positions:environment-energy.bottle-deposit`.

Required amount unit: `usd-per-container`. The basis is one refundable covered container, not all retail sales or the nonrefundable handling fee. Coverage is a closed list whose values describe beverage and packaging facts. The catalog validation must accept only the listed values; these are domain vocabulary inputs, not automatically assigned coverage for every state.

Proposed beverage vocabulary, from the cited statutes and agency definitions:

- `beer-malt-beverage`
- `carbonated-soft-drink`
- `carbonated-mineral-water`
- `noncarbonated-water`
- `sports-energy-drink`
- `juice-juice-drink`
- `tea-coffee`
- `kombucha`
- `hard-cider`
- `vegetable-juice`
- `plant-infused-drink`
- `wine`
- `distilled-spirit`
- `canned-cocktail`
- `mixed-wine-drink`
- `ready-to-drink-spirit`

Proposed packaging vocabulary:

- `glass-container`
- `metal-container`
- `plastic-container`
- `wine-spirit-box-bladder-pouch`
- `refillable-container`
- `nonrefillable-container`

Each beverage is qualified by its packaging and size restrictions. These are conjunctions, not permission for every combination of independently listed beverage and packaging values. Legal exclusions stay explicit. Unknown product composition must not become known eligibility.

### Exact schedules and bounds

| Starting row                         | Refund amount                                                                    | Quantity and scope                                                                        | Representation needed                                                                                                                                                                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-CT                                | 0.10 USD/container                                                               | Covered carbonated containers 150–3,000 ml; covered noncarbonated containers 150–2,500 ml | Constant amount plus separate eligibility size bounds. The coverage list is the official DEEP list in the source packet.                                                                                                                  |
| US-IA                                | 0.05 USD/container                                                               | Statutory beverage/container categories sold for consumption off premises                 | Constant amount plus category coverage and sale context.                                                                                                                                                                                  |
| US-HI                                | 0.05 USD/container                                                               | Eligible labeled HI-5 containers                                                          | Constant amount; complete category/size coverage still requires the source. Exclude the nonrefundable 0.01 USD fee.                                                                                                                       |
| US-CA ordinary covered containers    | 0.05 USD/container below 24 U.S. fluid ounces; 0.10 USD/container at or above 24 | Excludes refillables; statutory beverage/material coverage applies                        | Tier thresholds 0 and 24, threshold unit U.S. fluid ounces. Lower threshold is inclusive; the next threshold closes the previous tier. Existing research supplies current 5/10 values; acquired statute also has historical trigger text. |
| US-CA wine/spirit flexible packaging | 0.25 USD/container                                                               | Box, bladder, pouch, or similar wine/spirit container, operative January 1, 2024          | Category-specific constant schedule; it overrides the ordinary volume schedule for that category. Do not charge both schedules.                                                                                                           |
| US-MA                                | At least 0.05 USD/container                                                      | Statutory carbonated/mineral-water/beer categories and exemptions                         | Legal lower bound, not proof of the amount actually charged by a particular seller.                                                                                                                                                       |
| US-ME ordinary                       | At least 0.05 USD/container                                                      | Distinct refillable manufacturer / nonrefillable distributor setting                      | Legal lower bound.                                                                                                                                                                                                                        |
| US-ME wine/spirits ≤50 ml            | No more than 0.05 USD/container                                                  | Wine/spirits containers at or below 50 ml                                                 | Legal upper bound; do not turn it into an exact price.                                                                                                                                                                                    |
| US-ME wine/spirits >50 ml            | At least 0.15 USD/container                                                      | Wine/spirits containers above 50 ml                                                       | Legal lower bound; threshold at 50 ml is strict for this branch.                                                                                                                                                                          |
| US-VT ordinary                       | At least 0.05 USD/container                                                      | Statutory covered beverages other than liquor                                             | Legal lower bound.                                                                                                                                                                                                                        |
| US-VT liquor >50 ml                  | 0.15 USD/container                                                               | Liquor containers above 50 ml                                                             | Exact amount with a strict category/volume boundary; smaller liquor remains unresolved.                                                                                                                                                   |

For California, the generic tier entries need threshold, threshold unit, and amount with its per-container unit. They also need the existing categorical query to select one applicable schedule. For Maine, a tier list alone must not erase lower/upper-bound meaning. Audit should expose the admitted representation for that distinction; no new contract price is fabricated here.

Michigan, New York, and Oregon retain the acquired values and fresh-fetch limitations in the source packet. Their complete category definitions are not closed by this handoff.

## Remaining environmental quantities

| Question                                                          | Keys and exact quantity basis                                                                                                                       | Coverage vocabulary input                                                                                                 | Unresolved input                                                                                                                                                                                                                               |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `environment-energy.price-carbon`                                 | `price`: USD per metric tonne CO2-equivalent                                                                                                        | `fossil-fueled-power-plant-at-least-25-mw` for the cited RGGI rows; other carbon programs require their own sourced scope | Actual dated auction/allowance price or admitted in-game peer estimate. RGGI short tons are not metric tonnes; preserve the source mass unit and an explicit conversion.                                                                       |
| `environment-energy.clean-electricity-standard`                   | `target`: Class I renewable-resource share of covered suppliers’ retail load supplied per calendar compliance year, represented as a dated schedule | `class-i-renewable-generation` for the cited CT target                                                                    | Existing CT row cites 0.25 in 2026 and 0.29 in 2030. Its separate all-class total is not interchangeable with Class I. Supplier obligation and eligible generation remain distinct. Other utility classes and states need their own schedules. |
| `agriculture-natural-resources.limit-groundwater-withdrawal`      | `cap`: actual permitted volume per permit period                                                                                                    | Coverage references the actual aquifer, well, user, and permit                                                            | Existing CT note says withdrawals above 50,000 U.S. gallons/day require a permit. That threshold is not the permit's authorized volume. No universal withdrawal cap is supplied.                                                               |
| `agriculture-natural-resources.protect-farmland-from-development` | `appropriation`: USD per actual budget year                                                                                                         | `agricultural-conservation-easement` for the cited PACE program type                                                      | Actual program award/appropriation, government account, eligible parcel, and dated easement or award record. Program existence is not an annual amount.                                                                                        |

Question keys in the table have the `us-policy-positions:` prefix. Existing yes rows remain the source of their dated answers and citations. Gas-hookup bans have no yes rows in the current data. Flood-zone restrictions and public-land access lack starting question rows; their missing laws and parcel scope are not filled from unrelated programs.

## Farm cap boundary

The source packet's 2026 ARC/PLC limit is 164,000 USD per attributed person/legal entity per program year. Peanuts and other commodities have separate buckets. A catalog vocabulary can name `arc-co`, `arc-ic`, and `plc`, but actual enrolled interests and attribution determine eligibility. The statutory cap increase does not supply a yes answer to the missing “cut farm subsidies” question. No starting cap row or new payment is authorized by this input alone.

## Row preconditions and ownership

Source lineage: the prior published packet at `2b1aa7be8ae606e2a945079befe401c6d87b0571`. Exact starting-row preconditions below use SHA-256 of UTF-8 JSON, sorted keys, compact separators, and unescaped Unicode. Recompute before applying a row patch; a changed row needs additive composition, not replacement.

| Question suffix                                                 | Place | Original-row SHA-256                                             |
| --------------------------------------------------------------- | ----- | ---------------------------------------------------------------- |
| environment-energy.bottle-deposit                               | US-CA | 1457eb5e661de4faa06c7a732774044969d0ca10f390ae7a256e03d6d86fa9e4 |
| environment-energy.bottle-deposit                               | US-CT | a297167e4b6abc9f4abbd9c446eda641961336d28d0dbdfa16df6e71ebe5cb3f |
| environment-energy.bottle-deposit                               | US-IA | c794017c2c78b6280663a65c2912fe17a6ccbce0e7872db9136551dab925a59f |
| environment-energy.price-carbon                                 | US-CT | 74c68dd9d2073e8f8ececd2aea6a3247c646caa757cd712727c51d77c7538cfb |
| environment-energy.clean-electricity-standard                   | US-CT | 1d9e90657267b7659db73b725106939a8e58ae0ac4d90871d7b0df57d6ddcd4c |
| agriculture-natural-resources.limit-groundwater-withdrawal      | US-CT | 0036cdab289287ad693e9f7511ee5d3e3c76707f26ec260c89b2501acd88d32b |
| agriculture-natural-resources.protect-farmland-from-development | US-CT | 83d02f277ac6f0549e955aafab499d24e98b3dbb01514707fe5385555798c6a4 |

Audit alone implements the schema/query contract. Team6 alone implements the shared guard. O4 retains these environmental question-row patches and their eventual changed-file proof. No schema, query, guard, starting-law JSON, production calculator, or runtime test is changed by this handoff.
