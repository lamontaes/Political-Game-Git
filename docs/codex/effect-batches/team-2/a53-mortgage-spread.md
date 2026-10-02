# A53 thirty-year mortgage spread

The opening calibration uses one same-day observed difference. On December 31,
2025, Freddie Mac's Primary Mortgage Market Survey reported a 6.15% thirty-year
fixed mortgage average. The Federal Reserve's federal funds target range was
3.50–3.75%. The difference from that target's 3.625% midpoint is 2.525 percentage
points, or 252.5 basis points.

Official observations, retrieved October 2, 2026:

- [Freddie Mac PMMS, distributed by FRED: MORTGAGE30US](https://fred.stlouisfed.org/data/MORTGAGE30US.txt), `2025-12-31 | 6.15`.
- [Federal Reserve target lower limit: DFEDTARL](https://fred.stlouisfed.org/data/DFEDTARL.txt), `2025-12-31 | 3.50`.
- [Federal Reserve target upper limit: DFEDTARU](https://fred.stlouisfed.org/data/DFEDTARU.txt), `2025-12-31 | 3.75`.

The game adds this cited spread to its current recorded policy-rate midpoint,
then applies an actual loan cap when supplied and uses the existing amortization
formula over the owner-approved thirty-year term. The initial game policy
midpoint of 3.625% therefore yields a 6.15% mortgage quote. The quoted payment
still derives from the actual purchase principal; no payment level is drawn.

This is a single opening calibration authorized by the CTO. It does not establish
a constant empirical pass-through from monetary policy to mortgages, a real bank
offer, borrower-specific underwriting, mortgage fees, or default terms. The
existing pass-through research request remains unresolved. Missing servicing
terms do not prevent a payment quote, and fictional test terms are not production
defaults.
