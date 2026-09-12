# Prose diagnostics — current main baseline

**0 hard errors. 256 review warnings.**

A hard error is objectively wrong: an ID collision, a slot the record's own
grounding cannot bind, a withheld record with no reason. A review warning is a
place worth an owner's eye and **nothing here is a ban** — a grounded character
may say "something", and a good sentence may contain "rather than". Style lint
that fails a build produces prose written to satisfy a regex, which is a worse
defect than the one it was aimed at.

## Warnings by family

| Family | Count |
| --- | --- |
| vague-referent | 171 |
| and-it-scaffold | 38 |
| rather-than-scaffold | 28 |
| third-person-player | 10 |
| label-restated-in-description | 9 |

## Repetition

- 2503 templates, 2368 distinct texts.
- 29 exact duplicate groups.
- 37 normalized duplicate groups.
- 17 near-duplicate clusters (Jaccard ≥ 0.72).

Exact duplicate text at two semantic locations is not itself a defect: each
keeps its own ID, and two banks may legitimately both offer "Say nothing".

### Most frequent 3–6 word n-grams

| N-gram | Count | Banks |
| --- | --- | --- |
| `in front of` | 24 | 8 |
| `no instrument read` | 21 | 1 |
| `there is a` | 19 | 5 |
| `it is not` | 16 | 3 |
| `asked you to` | 15 | 4 |
| `a long time` | 14 | 4 |
| `the player asked` | 14 | 1 |
| `instrument read establishes` | 13 | 2 |
| `out of the` | 13 | 5 |
| `and it is` | 12 | 5 |
| `has asked you` | 12 | 4 |
| `proof of income` | 12 | 2 |
| `the two of` | 12 | 3 |
| `is on the` | 11 | 6 |
| `no instrument read establishes` | 11 | 1 |
| `of income form` | 11 | 2 |
| `proof of income form` | 11 | 2 |
| `the bill is` | 11 | 2 |
| `the end of` | 10 | 4 |
| `the two of you` | 10 | 3 |
| `two of you` | 10 | 3 |
| `at the end` | 9 | 3 |
| `at the end of` | 9 | 3 |
| `in the room` | 9 | 5 |
| `on the floor` | 9 | 5 |

### Most repeated sentence openings

| Opening | Count |
| --- | --- |
| `no instrument read` | 20 |
| `the player asked` | 14 |
| `there is a` | 12 |
| `the bill is` | 10 |
| `say you will` | 9 |
| `you asked for` | 9 |
| `you tell you` | 9 |
| `you took the` | 9 |
| `you ask to` | 8 |
| `you put the` | 7 |
| `you told them` | 7 |
| `it is not` | 6 |
| `the bill has` | 6 |
| `you agreed to` | 6 |
| `you said you` | 6 |

Every finding with its exact semantic ID is in `lint-findings.json`.
