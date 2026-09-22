---
name: civic-reports
description: >
  Write or review any report, write-up or document meant for the owner:
  playtest and life reports, audits, investigation results, Drive documents,
  handoff summaries and pull request descriptions. Use before sending or
  publishing one; not for player-visible game text, which is civic-prose.
---

# Civic reports

The owner reads reports between other things, often on a phone, and acts on
them. A report is finished when a reader who was not there can say what
happened, why, and what they need to do, after one read. Passing the
mechanical check is the floor; it is not the standard.

## The shape

1. **Title.** Name what happened, in the owner's words: "The next generation
   inherits almost nothing", not "Multi-generation walk results".
2. **Lead**, under 120 words, before the first section. What happened and
   what it means for the game. If the owner has to decide or do something,
   that goes first. No commit hashes, pull request numbers, file paths, clock
   times, or how the test was run.
3. **The story** (playtest and life reports; the first section). The life as
   the player met it: which town, which character, what was pressed, what the
   screen said, in the order it happened. Quote the screen exactly. Nothing
   the player could not know: no code, no test machinery, no "I ran". Let the
   defect show itself the way the player meets it: the list calls his teacher
   "someone they taught", and the story says what that was.
4. **The why**, the third-person half. Why each thing happened or did not,
   what could have happened, and the numbers. One location per claim as
   evidence (`file:line` or a pull request link), written in a sentence that
   says what the code does. Mark every claim as measured or inferred.
5. **What happens next**: which defects went to which lane, what is fixed,
   what is open. Method (build, date, route, anything that went wrong with
   the tools) goes last, in a few lines.

Reports that are not about play (audits, investigations, pull request
descriptions) keep steps 1, 2, 4 and 5. A pull request description also
opens with "Before:" and "After:" paragraphs, per the project's rules.

## Sentences

- American English: labor, color, center, license, labeled, catalog, period,
  miles and pounds, and dates as September 22, 2026.
- One idea per sentence. Split anything over 45 words.
- Say the thing. No epigrams ("What was missing was a walk of it, not the
  feature"), no hedging preambles ("I am not reporting this as a defect"),
  no filler ("notably", "it is worth noting").
- Name defects after what was observed, never after the suspected cause.
- Do not narrate the investigation. The reader wants the result.
- Numbers are sentences with their unit and denominator: "40 names were
  offered; 1 was someone she knew."

## The check

1. Run `npm run report:check -- <file.md>` (add `--story` for a life or walk
   written outside a playtest folder). Every error is a required repair.
2. Have the `civic-report-reviewer` agent read the report against this skill.
   It returns PASS or the specific sentences that fail and why. Repair and
   ask again; do not argue a FAIL into a PASS.
3. Then publish. The session hook in `.claude/settings.json` runs step 1
   automatically on every owner-facing markdown file written under
   `/mnt/project-files/` or `docs/playtest/` and `docs/reports/`, and refuses
   a failing markdown upload to Drive. It cannot run step 2 for you.

`docs/writing/the-next-generation-rewrite.md` is the worked example: the
report that prompted this skill, and the same facts rewritten to the bar.

## Stop condition

Stop when the mechanical check passes and the reviewer returns PASS. This
skill never invents facts to make a story read better: if the walk did not
establish something, the report says it was not checked.
