# Prose diagnostics — current main baseline

**0 hard errors. 273 review warnings.**

A hard error is objectively wrong: an ID collision, a slot the record's own
grounding cannot bind, a withheld record with no reason. A review warning is a
place worth an owner's eye and **nothing here is a ban** — a grounded character
may say "something", and a good sentence may contain "rather than". Style lint
that fails a build produces prose written to satisfy a regex, which is a worse
defect than the one it was aimed at.

## Warnings by family

| Family | Count |
| --- | --- |
| vague-referent | 190 |
| and-it-scaffold | 39 |
| rather-than-scaffold | 24 |
| third-person-player | 10 |
| label-restated-in-description | 9 |
| anonymous-actor | 1 |

## Repetition

- 3189 templates, 2972 distinct texts.
- 83 exact duplicate groups.
- 93 normalized duplicate groups.
- 35 near-duplicate clusters (Jaccard ≥ 0.72).

Exact duplicate text at two semantic locations is not itself a defect: each
keeps its own ID, and two banks may legitimately both offer "Say nothing".

### Most frequent 3–6 word n-grams

| N-gram | Count | Banks |
| --- | --- | --- |
| `no time passes` | 111 | 1 |
| `in front of` | 24 | 7 |
| `no instrument read` | 22 | 1 |
| `there is a` | 20 | 4 |
| `it is not` | 18 | 4 |
| `out of the` | 18 | 5 |
| `asked you to` | 17 | 5 |
| `the player asked` | 17 | 2 |
| `you want to` | 17 | 4 |
| `the end of` | 16 | 5 |
| `you tell you` | 16 | 1 |
| `at the end` | 15 | 4 |
| `at the end of` | 15 | 4 |
| `a long time` | 14 | 4 |
| `instrument read establishes` | 14 | 2 |
| `the two of` | 14 | 4 |
| `existing saves are` | 13 | 1 |
| `existing saves are unchanged` | 13 | 1 |
| `saves are unchanged` | 13 | 1 |
| `and it is` | 12 | 5 |
| `has asked you` | 12 | 4 |
| `no instrument read establishes` | 12 | 1 |
| `proof of income` | 12 | 2 |
| `the two of you` | 12 | 4 |
| `two of you` | 12 | 4 |

### Most repeated sentence openings

| Opening | Count |
| --- | --- |
| `no time passes` | 111 |
| `no instrument read` | 21 |
| `the player asked` | 17 |
| `you tell you` | 16 |
| `there is a` | 12 |
| `the bill is` | 10 |
| `that file is` | 9 |
| `the player told` | 9 |
| `you put the` | 9 |
| `you said you` | 9 |
| `say you will` | 8 |
| `you took the` | 8 |
| `ask about the` | 7 |
| `ask for a` | 7 |
| `stay out of` | 7 |

Every finding with its exact semantic ID is in `lint-findings.json`.
