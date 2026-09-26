# Prose diagnostics — current main baseline

**0 hard errors. 39 review warnings.**

A hard error is objectively wrong: an ID collision, a slot the record's own
grounding cannot bind, a withheld record with no reason. A review warning is a
place worth an owner's eye and **nothing here is a ban** — a grounded character
may say "something", and a good sentence may contain "rather than". Style lint
that fails a build produces prose written to satisfy a regex, which is a worse
defect than the one it was aimed at.

## Warnings by family

| Family | Count |
| --- | --- |
| vague-referent | 18 |
| third-person-player | 10 |
| and-it-scaffold | 8 |
| rather-than-scaffold | 3 |

## Repetition

- 838 templates, 816 distinct texts.
- 15 exact duplicate groups.
- 22 normalized duplicate groups.
- 8 near-duplicate clusters (Jaccard ≥ 0.72).

Exact duplicate text at two semantic locations is not itself a defect: each
keeps its own ID, and two banks may legitimately both offer "Say nothing".

### Most frequent 3–6 word n-grams

| N-gram | Count | Banks |
| --- | --- | --- |
| `no instrument read` | 22 | 1 |
| `the player asked` | 15 | 1 |
| `instrument read establishes` | 14 | 2 |
| `existing saves are` | 13 | 1 |
| `existing saves are unchanged` | 13 | 1 |
| `saves are unchanged` | 13 | 1 |
| `no instrument read establishes` | 12 | 1 |
| `proof of income` | 12 | 2 |
| `the bill is` | 12 | 2 |
| `of income form` | 11 | 2 |
| `proof of income form` | 11 | 2 |
| `a saved life` | 9 | 1 |
| `could not be` | 9 | 1 |
| `is not a` | 9 | 3 |
| `that file is` | 9 | 1 |
| `the proof of` | 9 | 2 |
| `the proof of income` | 9 | 2 |
| `the proof of income form` | 9 | 2 |
| `a long time` | 8 | 1 |
| `in a long` | 8 | 1 |
| `the third referral` | 8 | 2 |
| `file is not` | 7 | 1 |
| `file is not a` | 7 | 1 |
| `file is not a saved` | 7 | 1 |
| `file is not a saved life` | 7 | 1 |

### Most repeated sentence openings

| Opening | Count |
| --- | --- |
| `no instrument read` | 21 |
| `the player asked` | 15 |
| `the bill is` | 11 |
| `that file is` | 9 |
| `the bill has` | 6 |
| `can hear you` | 4 |
| `the player offered` | 4 |
| `what you said` | 4 |

Every finding with its exact semantic ID is in `lint-findings.json`.
