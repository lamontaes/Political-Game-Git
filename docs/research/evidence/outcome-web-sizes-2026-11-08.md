# Outcome-web links with no size: what was fetched, Nov 8, 2026

Session: Laws and effects. Tool: `curl` through the session proxy (WebFetch refuses most research hosts; curl reaches nber.org, pmc.ncbi.nlm.nih.gov and census.gov). A size is SOURCED only where the fetched page states it.

## Fetched and stated on the page

| Link                   | Size                                                                                                                                                                            | Source (fetched Nov 8, 2026)                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `class-size-to-scores` | About 4 percentile points on standardized tests the first year in a small class (13 to 17 pupils) against a regular one (22 to 25), then about 1 percentile point more per year | Krueger 1999, "Experimental Estimates of Education Production Functions", NBER w6051, https://www.nber.org/papers/w6051: "on average, performance on standardized tests increases by about 4 percentile points the first year students are assigned to a small class" and "increases by about one percentile point per year" after |
| `daca-to-graduation`   | The citizen and noncitizen high school graduation gap closes by 40%                                                                                                             | Kuka, Shenhav and Shih 2020, NBER w24315, https://www.nber.org/papers/w24315: "reducing the citizen-noncitizen gap in graduation by 40%"                                                                                                                                                                                           |

## Fetched; the page gives direction, not a size in the link's unit

| Link                                     | Page                                        | What it says                                                                                                                                                               |
| ---------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `teacher-quality-to-earnings`            | NBER w19424, Chetty, Friedman and Rockoff   | Replacing a bottom 5% teacher with an average one raises a class's lifetime income by about $250,000; the 1.3% at age 28 per 1 SD is in the paper's text, not its abstract |
| `birth-year-pollution-to-adult-earnings` | NBER w19858, Isen, Rossin-Slater and Walker | Higher pollution in the birth year goes with lower earnings at age 30; the abstract states no figure                                                                       |
| `eviction-to-hospital-visits`            | NBER w30382, Collinson et al.               | An eviction order raises hospital visits and homelessness in two years; the abstract states no figure                                                                      |

## Not fetched (no page returned a figure)

Leads from search snippets only, to confirm when the paper is fetched: summer jobs and youth violence (Heller 2014, Science), newspaper closure and borrowing cost (Gao, Lee and Murphy 2020, JFE), broadband and employment (Atasoy 2013), student debt relief (Di Maggio, Kalda and Yao; Dinerstein et al.), preparedness and disaster damage (Healy and Malhotra 2009, $1 to $15, a ratio unlike the row's unit), incentive deals (Slattery and Zidar 2020).

## Why no link changes yet

A size makes the web able to run a link only when the web keeps the outcome measure or an engine decides it. For the two sourced rows, `school.test-scores` and `school.graduation-pct` are not produced by any engine as a rate a class size or deferred action could scale; wiring them means the school engine owning those outcomes first. They stay in `unwired.json` with their new sourced sizes recorded here.
