---
name: owner-report
description: >
  Report to Lamontae the way he likes: plain patch notes of what changed in the
  game, placeholders added, what's running, and real questions. Use for status
  updates, the morning report, and after merges.
---

# Reporting to Lamontae

- Lead with what changed for the player or the world, in plain words, like patch notes. Never a PR number alone.
- **Placeholders:** always say how many were added and what kind. Measure:
  `git grep -h -o 'PLACEHOLDER[^:]*' <rev> -- 'src/simulation/**/*.ts' 'src/presentation/**/*.ts' 'src/player/**/*.tsx' ':!*.test.ts' ':!*.test.tsx' | wc -l`,
  now versus 24 hours ago (`git rev-list -1 --before=... origin/main`). List the new ones by kind.
- **Running:** what each team or tab is on, with its finish line (cto-notes/TALLY.md).
- **Questions:** only real depth-of-realism or vision questions. Check the Register first and never ask the obvious (realism wins; it applies to everyone; anything said counts).
- **Big reviews** (designs, research he must decide on) go in an artifact. Combine teams that land together.
- Keep it short and scannable. He reads on his phone and interrupts when he has something to say.
