# M0-population: full people only where they matter

**Who:** the Claude engineering account, Opus at high (core design). A separate Claude session checks it.
**Branch:** stacked on SOL-1258's latest `pool/P8-part-1`, in commits for SOL-1258's review.

## Build

1. Full individual people only for the player, their household and circle, people they meet or click on, officials and other named people. Everyone else is the modeled wider population: counts by place, age, job and household, plus the core's voter groups.
2. Fill a person in when the player meets or clicks them, seeded from the world so the same person comes back every time.
3. A filled-in person matches the records already there: a business's employee count, a household's members, a job's pay, a voter group's size. Filling someone in moves them from the counts to the individuals; totals never change.
4. Nobody gets a full past or growing memory until they're filled in. People forget: keep what matters to them and summarize the rest.
5. Businesses, payroll and sales run on the wider population as counts where nobody individual is involved.

## Done when

The owner opens a random town, clicks around, meets people, and every person he finds fits the town's records; the town opens much faster than today and a game day takes well under a second. One run, one number.
