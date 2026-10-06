# Campaign unit prices

The simulation reads the switchable price table at `data/research/campaign-reality/campaign-unit-prices.json`. All prices are estimates because the one permitted market-price search did not return a usable yard-sign, palm-card, or local print-ad rate card. Replace estimates by editing data rows only when sourced local prices become available.

| Item                          |  Estimated unit price | Basis                                                                                             |
| ----------------------------- | --------------------: | ------------------------------------------------------------------------------------------------- |
| Yard sign                     |       $15.00 per sign | Twenty times the project's $0.73 2024 USPS one-ounce stamp rate                                   |
| Palm card                     |        $0.15 per card | One fifth of the project's $0.73 2024 stamp rate                                                  |
| Postage                       |       $0.73 per piece | USPS retail one-ounce letter rate effective July 14, 2024                                         |
| Local print ad                | $365.00 per placement | Five hundred times the $0.73 2024 stamp rate                                                      |
| Candidate filing fee fallback |     $75.00 per filing | B01's Provo city-council example; the applicable local filing terms take precedence when recorded |

The postage reference is `data/research/campaign-reality/campaign-calibration.json` and its USPS source record in `campaign-evidence.json` (`usps-letter-rates`). The filing-fee example is from B01. None of the derived prices is presented as a vendor quote. Place household counts use ACS 2020–2024 five-year estimates where available, then 2020 Census PL 94-171 place population from `data/research/money/place-population-census-2020.json`; both population counts convert to households at an estimated 2.5 residents per household. Places outside both compiled sources use household locations recorded in the current world.
