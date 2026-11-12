---
id: laws-property-tax-billed-to-every-home-in-the-world
title: "A town's property tax is billed to every home in the world, so officials in other states pay most of it (Denver, Missouri; Marion, Mississippi; LaGrange, Wyoming)"
area: laws
kind: bug
priority: 1
size: M
status: merged
standard: 2
claimed-by: claude/pool-laws-property-tax-billed-to-every-home-in-the-world
pr: #8378
after:
blocked-on:
lead: laws-effects
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2, "What the code does" and "Every law in dev mode's list, tried at four bodies")
model: sonnet
effort: medium
root: rc9-place-facts-one-default
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:10:47.456Z
merged-at: 2026-11-12T20:16:44.749Z
---

**What.** The property tax lookup ignores where a home is. `billPropertyTax` asks for the terms of each home's own place, but the function the budgets engine registers, `propertyTaxTerms(api)`, takes no place and returns the played town's rate in force and the played county's tax collector for every home in the world (read in code). Officials across the country are kept as full people who own homes, so they pay the played town's tax, before a raise and after it. Measured in three towns of three, each against a twin world with no raise. In Denver, Missouri (the audit gives no seed), a raise from 0.817% to 2%, passed 4 to 1, took about $380,000 more out of people's accounts in 90 days: about $3,600 from the village itself ($3,000 from its full residents and $600 from its counted households), about $359,000 from officials elsewhere and $18,000 from other full people who live elsewhere. Members of Congress from California and Hawaii each paid about $1,800 extra, and the delegate from the District of Columbia paid $4,652. In Marion, Mississippi (seed 7df73e53cd67), a raise from 0.921% to 1.381% took $1,900 from full people in town, $31,100 from its counted households and $197,700 from officials elsewhere, the same to the dollar whether the town board or the county board passed it. In LaGrange, Wyoming (seed 63355aee286d), people paid $142,000 more: officials elsewhere $130,000, other full people elsewhere $6,300, the town's full people $1,000 and its counted households $4,500. Fix it at the cause: the lookup reads the home's own place, for every home in the world, so a home outside the played town is billed at its own place's rate (an estimate from its state's data where no law row is kept, marked as an estimate) and pays its own place's collector or outside account, never the played town's. Seen: the property tax bill on the player's own home and the town's revenue, which officials in other states pay today.

**Cause.** Found in code: src/core2/modules/budgets.ts propertyTaxTerms(api) (line 1123) takes no place and returns the played town's rate and county collector for every home; housing-property-tax.ts billPropertyTax calls the lookup with home.placeId.

**Fix.** Make propertyTaxTerms take the home's place and read that place's law row and collector, billing each home by its own place's terms (average with source where none).

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the rate and the collector come from the home's own place's data, for a home anywhere, with no place named in the logic. The chain is the acceptance: one tax dollar is followed from a named owner's account to the collector and on to the treasury that levied it. One model, two tiers: the counted households of a place are billed by the same lookup as its full people, times their count. Estimate, never UNKNOWN: a home in a place with no law row is billed from the real average with its source, not skipped and not billed the played town's rate. Owner, November 5, quoted by the audit: "why are you just doing it to Mississippi? It should be everywhere."

**Done when.** A second session, not the builder, runs this in the running game. Start the bench (`OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" npm run bench`, play at `/play`) with the Place field empty so the place is a drawn place, and write down the place and seed the title shows; redraw until the place has a town or county board that may set the property tax. In dev mode's Bills panel on the Government screen choose the Body, a Sponsor, the Law (property tax) and a Value half again above the rate in force, press Introduce, set the Margin to 3 and the Executive to Signs, and press Pass. The bill page must show one section (screenshot). Run 120 days in dev mode's Run panel. Start a second game on the same place and seed, pass nothing, and run the same 120 days. Compare the property tax paid in the two worlds by who paid it, from the payments' own labels. Every extra dollar must come from an owner whose home is in the place (its full residents and its counted households), by record id; an official or other full person whose home is elsewhere pays exactly what they pay in the twin, and in both worlds their bill names their own place's rate and payee. Then the same check as a named repro in Marion, Mississippi, seed 7df73e53cd67 (0.921% to 1.381%, 120 days): the $197,700 from officials elsewhere must be $0. A test bills a home in a second place of a drawn world and fails if it gets the played town's rate or collector. The owner plays it: he raises his town's property tax and the money comes from the people who own homes in his town, not from a senator two thousand miles away.

**Waits on.** Nothing.

**Files.** src/core2/modules/budgets.ts (`propertyTaxTerms`, line 1123, registered at line 1040 in `syncSalesTax`; `taxCollector`, line 1180), src/core2/housing-property-tax.ts (`registerPropertyTax`, line 55; `billPropertyTax`, line 122; `stateEffectiveRate`), src/core2/modules/housing.ts (the caller, line 1692)

**Notes.** From the Fable audit, Pillar 2. Measured: a property tax raise passed through the real board in Denver, Missouri, traced account by account against a twin world after 90 days; the law sweep in Marion, Mississippi (seed 7df73e53cd67), where each bill was introduced with dev mode's Introduce, passed with dev mode's vote at a margin of three, signed, run 120 days for local bodies and compared with a twin on every cash account; and the same law again in LaGrange, Wyoming (seed 63355aee286d). The audit does not restate the day count for LaGrange. Read, not measured: the cause in `propertyTaxTerms`. Confirmed on main, Nov 10: `TermsSource` is `(api, placeId)` and `billPropertyTax` calls it with `home.placeId`, but `propertyTaxTerms(api: CoreAPI)` drops the place, reads `lawInForce(api, "property-tax")` for the town and returns `taxCollector(api)`, which is the played county's collector. `propertyTaxRateInForce` in the same file already refuses any place but the housing town, so the display is guarded and the billing is not. Related: `money-town-tax-raise-leaves-its-own-treasury-no-richer` (where the collected money goes next), `world-home-sales-set-the-town-price` and `laws-property-tax-cap-statutes` (open, same lookup). The audit also found dev mode's reach control reported 0 people for a property tax raise in Bigelow, Arkansas; that belongs to the dev mode items, not this one. Not verified by the audit: what share of the pre-raise tax these officials were already paying, in dollars.
