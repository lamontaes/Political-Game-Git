# County calendar literals move into sourced records

The calendar reader carried two county-specific comparisons that the portability guard rejected. This follow-up keeps the same bounded calendar facts in source records and makes the reader select them through actual county identity. It adds no county coverage or filing permission.

## Before

The merged calendar reader compared Louisiana and Tennessee county identifiers inside executable branches. The guard reported two new place-in-logic findings. Dates and qualifications for other counties remained unknown.

## After

The same DeSoto published dates and Loudon recurrence fields now live in county-election-calendar-profiles.json with their existing source links and read date. The reader matches actual county and state fields to a profile. Published-date and recurring-weekday profiles keep their existing bounds. Both refuse a missing, nonpositive or unsafe integer term length before reading dates or searching a cycle. It preserves unknown filing and qualification facts, inactive-government refusal and unknown later Louisiana cycles.

## Proof

On the named current-main parent, the changed calendar test file passes six cases. All four original assertions remain. The fifth case verifies that a consumer cannot change the recorded source list through a returned value. The sixth changes each profile to six invalid term lengths, verifies an unknown result, and restores the source record. Two strict roots contain 701 files and zero diagnostics. Both changed TypeScript files pass actual stdin lint. The accompanying proof and logs identify the exact parent and source hashes.

The same guard algorithm scans 1,085 exact Git-source files. Baseline has two new findings and five stale entries. The candidate has zero new findings and the same five stale entries in Congress lawmaking, officeholder principles and pressure events. The whole guard still exits one; the allowlist is untouched.

## Scope

This repairs source representation after the county PR merged. It does not prove natural county elections, district residence, filing, browser play, a year run or final-main acceptance. The calendar contains only the previously read DeSoto and Loudon facts. The wider county assignment remains unfinished.

## Next

CTO reviews the bounded record-reader repair. Audit retains the county district contract and clock-core import remedy. Team 7 continues the source matrix and the three released caller migrations without writing those core surfaces.

## Delivery

The candidate uses an isolated index and preserves the shared checkout and dirty work. No team merge, save mutation or art generation occurs. Report checks are mechanical; no reviewer pass is claimed under the existing helper limit.
