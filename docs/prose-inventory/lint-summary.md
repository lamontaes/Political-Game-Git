# Prose diagnostics — current main baseline

**0 hard errors. 267 review warnings.**

A hard error is objectively wrong: an ID collision, a slot the record's own
grounding cannot bind, a withheld record with no reason. A review warning is a
place worth an owner's eye and **nothing here is a ban** — a grounded character
may say "something", and a good sentence may contain "rather than". Style lint
that fails a build produces prose written to satisfy a regex, which is a worse
defect than the one it was aimed at.

## Warnings by family

| Family | Count |
| --- | --- |
| vague-referent | 172 |
| and-it-scaffold | 39 |
| rather-than-scaffold | 27 |
| slot-agreement | 12 |
| label-restated-in-description | 9 |
| third-person-player | 8 |

## Repetition

- 2141 templates, 2048 distinct texts.
- 34 exact duplicate groups.
- 39 normalized duplicate groups.
- 14 near-duplicate clusters (Jaccard ≥ 0.72).

Exact duplicate text at two semantic locations is not itself a defect: each
keeps its own ID, and two banks may legitimately both offer "Say nothing".

### Most frequent 3–6 word n-grams

| N-gram | Count | Banks |
| --- | --- | --- |
| `in front of` | 23 | 8 |
| `there is a` | 19 | 5 |
| `it is not` | 16 | 3 |
| `asked you to` | 15 | 4 |
| `a long time` | 14 | 4 |
| `and it is` | 13 | 5 |
| `out of the` | 13 | 5 |
| `proof of income` | 12 | 2 |
| `the two of` | 12 | 3 |
| `has asked you` | 11 | 4 |
| `is on the` | 11 | 6 |
| `of income form` | 11 | 2 |
| `proof of income form` | 11 | 2 |
| `the bill is` | 11 | 2 |
| `the end of` | 10 | 4 |
| `the player asked` | 10 | 1 |
| `the two of you` | 10 | 3 |
| `two of you` | 10 | 3 |
| `you did not` | 10 | 4 |
| `at the end` | 9 | 3 |
| `at the end of` | 9 | 3 |
| `put your name` | 9 | 4 |
| `the proof of` | 9 | 2 |
| `the proof of income` | 9 | 2 |
| `the proof of income form` | 9 | 2 |

### Most repeated sentence openings

| Opening | Count |
| --- | --- |
| `there is a` | 12 |
| `the bill is` | 10 |
| `the player asked` | 10 |
| `you took the` | 9 |
| `say you will` | 8 |
| `you put the` | 7 |
| `you told them` | 7 |
| `it is not` | 6 |
| `the bill has` | 6 |
| `you agreed to` | 6 |
| `you asked for` | 6 |
| `ask about the` | 5 |
| `ask for a` | 5 |
| `say nothing to` | 5 |
| `they said they` | 5 |

Every finding with its exact semantic ID is in `lint-findings.json`.
