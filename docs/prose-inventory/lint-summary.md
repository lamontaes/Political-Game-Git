# Prose diagnostics — current main baseline

**0 hard errors. 384 review warnings.**

A hard error is objectively wrong: an ID collision, a slot the record's own
grounding cannot bind, a withheld record with no reason. A review warning is a
place worth an owner's eye and **nothing here is a ban** — a grounded character
may say "something", and a good sentence may contain "rather than". Style lint
that fails a build produces prose written to satisfy a regex, which is a worse
defect than the one it was aimed at.

## Warnings by family

| Family | Count |
| --- | --- |
| vague-referent | 189 |
| label-restated-in-description | 120 |
| and-it-scaffold | 40 |
| rather-than-scaffold | 24 |
| third-person-player | 10 |
| anonymous-actor | 1 |

## Repetition

- 3260 templates, 3041 distinct texts.
- 193 exact duplicate groups.
- 204 normalized duplicate groups.
- 29 near-duplicate clusters (Jaccard ≥ 0.72).

Exact duplicate text at two semantic locations is not itself a defect: each
keeps its own ID, and two banks may legitimately both offer "Say nothing".

### Most frequent 3–6 word n-grams

| N-gram | Count | Banks |
| --- | --- | --- |
| `you told you` | 25 | 2 |
| `in front of` | 24 | 7 |
| `no instrument read` | 22 | 1 |
| `the player asked` | 21 | 2 |
| `there is a` | 20 | 4 |
| `out of the` | 19 | 5 |
| `it is not` | 18 | 4 |
| `asked you to` | 17 | 6 |
| `you want to` | 16 | 4 |
| `at the end` | 15 | 4 |
| `at the end of` | 15 | 4 |
| `the end of` | 15 | 4 |
| `a long time` | 14 | 4 |
| `instrument read establishes` | 14 | 2 |
| `the two of` | 14 | 4 |
| `existing saves are` | 13 | 1 |
| `existing saves are unchanged` | 13 | 1 |
| `has asked you` | 13 | 5 |
| `saves are unchanged` | 13 | 1 |
| `and it is` | 12 | 5 |
| `is on the` | 12 | 6 |
| `no instrument read establishes` | 12 | 1 |
| `proof of income` | 12 | 2 |
| `the bill is` | 12 | 2 |
| `the two of you` | 12 | 4 |

### Most repeated sentence openings

| Opening | Count |
| --- | --- |
| `you told you` | 24 |
| `no instrument read` | 21 |
| `the player asked` | 21 |
| `there is a` | 12 |
| `the bill is` | 11 |
| `say you will` | 10 |
| `the player told` | 10 |
| `you asked to` | 10 |
| `you said you` | 10 |
| `ask for a` | 9 |
| `that file is` | 9 |
| `you put the` | 9 |
| `stay out of` | 8 |
| `you asked for` | 8 |
| `you told the` | 8 |

Every finding with its exact semantic ID is in `lint-findings.json`.
