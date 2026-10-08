# Birth-rate calibration stays out of personal decisions

The remaining aggregate birth-rate link is explicitly unsupported as a
personal cause. Births continue through recorded family plans. The landing
plan now distinguishes 100 person paths from one unsupported calibration
link, instead of treating the calibration as an unfinished personal reader.

## Evidence

Measured in the plan: 100 of 101 links are labeled person-linked and one is
unsupported at `data/research/outcome-web/landing-plan.json:1260`.

Measured in source: family planning excludes the aggregate birth-rate link at
`src/simulation/living-world/town-family-plans.ts:449`.

Measured in the rule: real rates check totals and do not decide an actor at
`.claude/skills/no-dice/SKILL.md:16`.

The boundary decision is recorded at
`data/research/outcome-web/landing-plan.json:791`.
It infers no birth, pregnancy, fertility choice, or political response from
the aggregate rate.

## Next steps

Review the unsupported boundary and the pending checkpoints before acceptance.
Person-level birth consequences require the canonical family records.

## Checks

Changed-file Prettier and ESLint pass.
No tests or generated-world runs were performed for this slice.
