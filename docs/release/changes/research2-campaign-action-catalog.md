# Campaign actions have concrete settings and people

Before: Team F had no sourced menu of things a candidate could do with a campaign day.

After: The research lane has 42 concrete campaign actions with people, places, purposes, and sources. A separate evidence packet gives bounded time, contact, fundraising, staffing, spending, school board district-size, and postage observations with office-level gaps. Exact action values remain unknown until measured or explicitly calibrated for play.

## Player route

There are no app clicks yet. This PR supplies research data for Team F and does not change a player screen.

## Evidence and checks

Both JSON files parse. All 42 action IDs are unique. Every action source reference resolves to one of 10 source records, and every office-level evidence reference resolves. Federal fundraising examples require compliance review before implementation. No unit or browser tests apply to this data-only change. The overnight wave forbids the full suite and browser suite on this Mac; neither was run.

## Placeholders

There are no placeholders in player code. The packet has one historical volunteer contact-rate range and one retail letter-postage unit price, but universal action duration, total cash cost, contact outcomes, and effects remain open evidence or calibration gaps. The catalog represents them as unknown values.
