# School system finances, fiscal year 2024 (Census Bureau)

`raw/elsec24.txt.gz` is the Census Bureau's Annual Survey of School System
Finances file for fiscal year 2024: one row for each of 14,077 public school
systems, with enrollment (V33), revenue by source (TFEDREV federal, TSTREV
state, TLOCREV local, T06 property tax and the rest), and spending
(TOTALEXP, TCURELSC current spending, TCURINST instruction and the rest).
The columns are defined in the Census Bureau's technical documentation for
the survey. NCESID joins each row to the NCES district directory.

- Source: https://www2.census.gov/programs-surveys/school-finances/tables/2024/secondary-education-finance/elsec24.txt
- Retrieved: 2026-09-28, on the Mac for Lane M, whose cloud session can't reach census.gov
- SHA-256 of the file as published: 89757cb6955ccce1224acefcec46fd3e7e02c8f5d5bdae7127516e0299baf211
- SHA-256 of the gzip here: 34fbe848a0086ed428788bdba803ab250b3a95b477e848e48c419aef6dbe0578

It calibrates each generated school district's money per student and revenue
shares (04 SYSTEM SPECS, section 4a). The game generates its own districts'
values; this file never sets them directly.
