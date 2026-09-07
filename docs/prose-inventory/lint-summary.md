# Prose diagnostics — current main baseline

**0 hard errors. 321 review warnings.**

A hard error is objectively wrong: an ID collision, a slot the record's own
grounding cannot bind, a withheld record with no reason. A review warning is a
place worth an owner's eye and **nothing here is a ban** — a grounded character
may say "something", and a good sentence may contain "rather than". Style lint
that fails a build produces prose written to satisfy a regex, which is a worse
defect than the one it was aimed at.

## Warnings by family

| Family | Count |
| --- | --- |
| vague-referent | 192 |
| and-it-scaffold | 62 |
| rather-than-scaffold | 35 |
| slot-agreement | 12 |
| label-restated-in-description | 9 |
| third-person-player | 8 |
| interpretive-ending | 2 |
| which-x-which-y | 1 |

## Repetition

- 1872 templates, 1851 distinct texts.
- 17 exact duplicate groups.
- 23 normalized duplicate groups.
- 8 near-duplicate clusters (Jaccard ≥ 0.72).

Exact duplicate text at two semantic locations is not itself a defect: each
keeps its own ID, and two banks may legitimately both offer "Say nothing".

### Most frequent 3–6 word n-grams

| N-gram | Count | Banks |
| --- | --- | --- |
| `in front of` | 20 | 7 |
| `there is a` | 20 | 5 |
| `and it was` | 19 | 4 |
| `a long time` | 17 | 5 |
| `it is not` | 17 | 3 |
| `and it is` | 14 | 5 |
| `you took the` | 14 | 3 |
| `asked you to` | 13 | 4 |
| `the two of` | 13 | 4 |
| `out of the` | 12 | 4 |
| `proof of income` | 12 | 2 |
| `of income form` | 11 | 2 |
| `proof of income form` | 11 | 2 |
| `the end of` | 11 | 5 |
| `and did not` | 10 | 3 |
| `in the room` | 10 | 4 |
| `put your name` | 10 | 4 |
| `said you would` | 10 | 5 |
| `the bill is` | 10 | 1 |
| `the two of you` | 10 | 3 |
| `two of you` | 10 | 3 |
| `you did not` | 10 | 4 |
| `you said you` | 10 | 5 |
| `at the end` | 9 | 3 |
| `at the end of` | 9 | 3 |

### Most repeated sentence openings

| Opening | Count |
| --- | --- |
| `you took the` | 14 |
| `there is a` | 13 |
| `the bill is` | 10 |
| `say you will` | 8 |
| `the player asked` | 7 |
| `it is not` | 6 |
| `the bill has` | 6 |
| `you did it` | 6 |
| `you let it` | 6 |
| `you said you` | 6 |
| `you went and` | 6 |
| `ask about the` | 5 |
| `say nothing to` | 5 |
| `you asked for` | 5 |
| `you put it` | 5 |

Every finding with its exact semantic ID is in `lint-findings.json`.
