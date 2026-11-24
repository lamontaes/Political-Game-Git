# M1-macro government-source research

Enable the approved agency hosts in this chat’s running environment so research can continue. The cloud proxy denies the downloads. This draft contains source checks and preparation tools; the macro module and historical bands are still unbuilt.

The [owner/CTO ruling](https://github.com/lamontaes/Political-Game-Git/pull/3959#issuecomment-6104940010) replaces Freddie Mac with Federal Reserve H.15, public CFPB/FFIEC HMDA, and original FHFA statistics. The current work order on main carries that replacement. The earlier publisher-permission blocker is resolved.

## Sources, terms and frequency

Measured from `sources.json:7`: the registry records the publishing pages, checked terms, units, frequency limitations and acquisition status. BLS and BEA publish original government statistics. CFPB's copyright policy permits reuse of agency-created information. FHFA's policy permits reuse of original agency information, distinguishes third-party material, and requires this distribution notice: "This product uses FHFA data but is neither endorsed nor certified by FHFA." The notice must accompany the application before distributing a product that uses its data.

Use original FHFA MIRS table 26 (1990–2018) and table 4 (April 2018–April 2019) for 30-year fixed-rate observations. FHFA ended MIRS in 2019. Its later MIRS Transition Index is based on Freddie Mac and is excluded. Its separate national average contract series combines loan types, so it cannot be relabeled as a 30-year fixed rate.

Public HMDA has a reporting year and a note interest rate, but omits origination dates. The local tool aggregates actual originated first-lien, owner-occupied home-purchase loans by year, loan type and term, excluding exempt, missing and nonfinite rates and loans not established as fixed-rate. This produces annual origination-weighted means, never invented monthly or quarterly observations. Quarterly or monthly modern mortgage observations still need an actual government source; uncovered stretches can use a registered spread estimate under the ruling.

H.15's effective federal funds rate is an observed overnight rate, distinct from the FOMC target. Preserve that distinction in calibration and starting records. Z.1 stays quarterly; G.19 consumer credit is not all household debt. Raw source files need hashes, retrieval/release dates, units and adjustment metadata before runtime use.

## Research tooling

`research.py` uses Python's standard library. Its network acquisition honors the inherited proxy and TLS verification. The BLS command uses at most ten years per unregistered request, retains raw responses and hashes, preserves footnotes and excludes annual-average periods. It refuses conflicting raw vintages and existing output files.

From the repository root:

```sh
python3 -B data/research/macro/research.py bls --first-year 1989 --last-year 2026 --output data/research/macro/bls-observations.json
python3 -B data/research/macro/research.py hmda --input /path/to/original-public-lar.csv --output data/research/macro/hmda-annual.json
python3 -B data/research/macro/research.py bands --input /path/to/normalized-monthly.json --output data/research/macro/historical-bands.json
python3 -B data/research/macro/research.py output-band --input /path/to/normalized-quarterly.json --output data/research/macro/output-band.json
python3 -B data/research/macro/research.py passthrough --input /path/to/observed-monthly-rates.json --first-month 1990-01 --last-month 2007-12 --output data/research/macro/passthrough-1990-2007.json
```

Monthly input is an array of records with `month` (`YYYY-MM`) and supplied numerical fields: `unemploymentPct`, `priceIndex`, `payrollJobsThousands`, `policyRatePct`, `treasury10Pct`, `mortgage30Pct`. Quarterly output input uses `quarter` (`YYYY-Q1` through `YYYY-Q4`) and `realOutput`. These are preparation schemas, not shipped runtime records. Source-specific BEA/Fed/FHFA ingestion and vintage validation remain to be completed against actual files.

The bands use calendar-aligned 12-month changes from January 1990 onward (unemployment in percentage points, price/jobs indexes in percent), linearly interpolated 5th/95th percentiles, and the maximum absolute one-month movement. Quarterly output growth is annualized. Missing periods are never bridged as adjacent observations. Full-history coverage must be verified before those statistics are acceptance bands. The calculation is implemented in `research.py:174`.

The pass-through tool regresses the mortgage-rate change from the preceding month through twelve months later on a month's policy move, using observed monthly pairs only. It reports a coefficient and Bartlett/Newey-West standard error with twelve-month calendar lags. This is a descriptive association, not an identified causal effect; overlapping outcomes and the distinction between effective funds and target rates matter. Annual HMDA cannot answer that regression. No real coefficient is available yet. The estimator in `research.py:194` is preparation tooling; synthetic checks measure its math, not a real policy effect.

## What members weigh

The [Federal Reserve policy explanation](https://www.federalreserve.gov/monetarypolicy/monetary-policy-what-are-its-goals-how-does-it-work.htm) explains that long-term loan rates reflect expected future policy and broader conditions. The [September 2026 minutes](https://www.federalreserve.gov/monetarypolicy/fomcminutes20260916.htm) supply concerns about persistent inflation, expectations, employment, growth and uncertainty. These concerns will guide fictional members' calibration; no member weights have been calibrated.

The [FOMC structure](https://www.federalreserve.gov/monetarypolicy/fomc.htm) provides seven governors, the permanent reserve-bank voter and four rotating presidents. Terms, meeting dates and rotation rules still need retained data before module generation.

## Verification and current access limit

Measured: seven focused preparation tests pass (`test_research.py:9`), including independent regression and quarterly-growth checks, missing-period behavior, annual-data frequency and missing/exempt rates. These are synthetic edge/math tests, not a generated-world proof or calibration. No source histories or acceptance flags have been changed.

The initial shell's proxy connection failures were resolved by the command's supported network permission. GitHub and npm now work through the configured proxy; dependencies were installed in the existing registered workspace. Agency requests to FHFA and BLS return CONNECT 403 because their domains are outside the environment policy. No direct connection or alternate proxy was used. The owner has been asked to enable the approved agency hosts; the request remains pending.

The startup bench is absent until #3940 merges, per M1-common and the CTO ruling; that absence is expected and does not block development. No M1-02 year, rate pass-through or performance proof has run.

## Work log

CODEX-MACRO: Codex (GPT-6 family; exact deployment identifier unavailable), package effort high, no effort escalation. One bounded civic-report reviewer checks the handoff prose; no implementation helpers or finisher review. Resumed October 10 at 23:17:52 EDT. Finisher send-backs: 0. One CTO source-replacement ruling resolved the first research blocker. Usage unavailable. Full timing and later send-backs remain in draft PR #3959.

After the owner's “try now,” BLS and FHFA still returned proxy CONNECT HTTP 403. The running environment reported policy revision 9 after the current-environment edit, with no agency hosts allowed. The owner was asked to apply the host list to this chat's active environment.
