# Prose diagnostics — current main baseline

**0 hard errors. 265 review warnings.**

A hard error is objectively wrong: an ID collision, a slot the record's own
grounding cannot bind, a withheld record with no reason. A review warning is a
place worth an owner's eye and **nothing here is a ban** — a grounded character
may say "something", and a good sentence may contain "rather than". Style lint
that fails a build produces prose written to satisfy a regex, which is a worse
defect than the one it was aimed at.

## Warnings by family

| Family | Count |
| --- | --- |
| vague-referent | 179 |
| and-it-scaffold | 38 |
| rather-than-scaffold | 28 |
| third-person-player | 10 |
| label-restated-in-description | 9 |
| anonymous-actor | 1 |

## Repetition

- 2607 templates, 2448 distinct texts.
- 32 exact duplicate groups.
- 40 normalized duplicate groups.
- 20 near-duplicate clusters (Jaccard ≥ 0.72).

Exact duplicate text at two semantic locations is not itself a defect: each
keeps its own ID, and two banks may legitimately both offer "Say nothing".

### Most frequent 3–6 word n-grams

| N-gram | Count | Banks |
| --- | --- | --- |
| `in front of` | 24 | 8 |
| `no instrument read` | 21 | 1 |
| `there is a` | 19 | 5 |
| `it is not` | 16 | 3 |
| `out of the` | 16 | 5 |
| `you tell you` | 16 | 1 |
| `asked you to` | 15 | 4 |
| `a long time` | 14 | 4 |
| `the player asked` | 14 | 1 |
| `instrument read establishes` | 13 | 2 |
| `the two of` | 13 | 3 |
| `and it is` | 12 | 5 |
| `has asked you` | 12 | 4 |
| `proof of income` | 12 | 2 |
| `no instrument read establishes` | 11 | 1 |
| `of income form` | 11 | 2 |
| `proof of income form` | 11 | 2 |
| `the bill is` | 11 | 2 |
| `the two of you` | 11 | 3 |
| `two of you` | 11 | 3 |
| `is on the` | 10 | 6 |
| `say you will` | 10 | 4 |
| `the end of` | 10 | 4 |
| `you have not` | 10 | 4 |
| `you want to` | 10 | 4 |

### Most repeated sentence openings

| Opening | Count |
| --- | --- |
| `no instrument read` | 20 |
| `you tell you` | 16 |
| `the player asked` | 14 |
| `there is a` | 12 |
| `say you will` | 10 |
| `the bill is` | 10 |
| `you asked for` | 9 |
| `you put the` | 8 |
| `you took the` | 8 |
| `you said you` | 7 |
| `you told them` | 7 |
| `you told you` | 7 |
| `ask for a` | 6 |
| `it is not` | 6 |
| `the bill has` | 6 |

Every finding with its exact semantic ID is in `lint-findings.json`.
