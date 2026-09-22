---
id: declaration-bodies-carry-no-headings
impact: none
---

Release tooling only. A declaration body may no longer carry a Markdown
heading, because the renderer folds a body into a bullet and a heading inside
one makes the generated patch notes fail the formatter, which is the first step
of the release job's own validation. One existing declaration carried a heading
that duplicated its title; the heading is gone and the prose is unchanged. No
player-visible effect.
