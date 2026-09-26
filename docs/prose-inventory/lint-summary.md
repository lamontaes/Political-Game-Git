# Prose diagnostics — current main baseline

**0 hard errors. 76 review warnings.**

A hard error is objectively wrong: an ID collision, a slot the record's own
grounding cannot bind, a withheld record with no reason. A review warning is a
place worth an owner's eye and **nothing here is a ban** — a grounded character
may say "something", and a good sentence may contain "rather than". Style lint
that fails a build produces prose written to satisfy a regex, which is a worse
defect than the one it was aimed at.

## Warnings by family

| Family | Count |
| --- | --- |
| vague-referent | 47 |
| and-it-scaffold | 13 |
| third-person-player | 10 |
| rather-than-scaffold | 6 |

## Repetition

- 1700 templates, 1631 distinct texts.
- 60 exact duplicate groups.
- 67 normalized duplicate groups.
- 18 near-duplicate clusters (Jaccard ≥ 0.72).

Exact duplicate text at two semantic locations is not itself a defect: each
keeps its own ID, and two banks may legitimately both offer "Say nothing".

### Most frequent 3–6 word n-grams

| N-gram | Count | Banks |
| --- | --- | --- |
| `no instrument read` | 22 | 1 |
| `the player asked` | 21 | 2 |
| `instrument read establishes` | 14 | 2 |
| `existing saves are` | 13 | 1 |
| `existing saves are unchanged` | 13 | 1 |
| `saves are unchanged` | 13 | 1 |
| `no instrument read establishes` | 12 | 1 |
| `proof of income` | 12 | 2 |
| `the bill is` | 12 | 2 |
| `of income form` | 11 | 2 |
| `proof of income form` | 11 | 2 |
| `at the end` | 10 | 2 |
| `at the end of` | 10 | 2 |
| `is not a` | 10 | 4 |
| `is on the` | 10 | 5 |
| `on your street` | 10 | 1 |
| `the end of` | 10 | 2 |
| `the player told` | 10 | 1 |
| `a saved life` | 9 | 1 |
| `could not be` | 9 | 1 |
| `that file is` | 9 | 1 |
| `the proof of` | 9 | 2 |
| `the proof of income` | 9 | 2 |
| `the proof of income form` | 9 | 2 |
| `a long time` | 8 | 1 |

### Most repeated sentence openings

| Opening | Count |
| --- | --- |
| `no instrument read` | 21 |
| `the player asked` | 21 |
| `the bill is` | 11 |
| `the player told` | 10 |
| `that file is` | 9 |
| `the bill has` | 6 |
| `what you said` | 6 |
| `the player offered` | 5 |
| `ask ms ruiz` | 4 |
| `ask to check` | 4 |
| `can hear you` | 4 |
| `say you will` | 4 |
| `stay out of` | 4 |
| `the player left` | 4 |
| `the player said` | 4 |

Every finding with its exact semantic ID is in `lint-findings.json`.
