# Metrics reads one register of numbers: before and after

Pull request #8966, pool item `metrics-output-numbers-registry`. Three places drawn by the game, each a new life started on the bench and run from January 20, 2025 to March 25, 2026 with dev mode's clock, then Politics, Metrics opened at 1440x900. Before is main at 3a7aa325. After is this branch. The same seed is used on both sides, so each pair is the same town on the same day.

## What it answers

The owner's rulings for this work, as the CTO passed them on issue #8928 on Nov 12, 2026 (comment 6838034924): "a small town shows its own count with the people behind it ("13 of 86 looking for work"), never a blend and never the county's figure; every figure is traceable in dev mode's Trace; no speed cost (`npm run speed:year` before and after, on the same machine and seed); each Metrics row shows a visible cue that it opens its timeline."

The CTO's review of the first attempt on the same issue named "another town's budget" among its eight faults; the heading over the books now names the government they were read from.

## The words that changed

Read and passed by Fable A on Nov 13, 2026 (issue #8928, comment 6841622105).

| Where                                      | Before           | After                                                             |
| ------------------------------------------ | ---------------- | ----------------------------------------------------------------- |
| The count beside "People looking for work" | the count alone  | the count of the people at work and looking, as in "258 of 1,831" |
| The heading over the town's books          | The town's books | the name of the government the figures were read from             |
| The evictions row                          | Evictions        | Eviction notices so far this year                                 |

"Your town" now sits in the wide middle column and "Your state" in the right one. In the narrow column the label "People looking for work" was cut short beside a count like "258 of 1,831".

## What else differs in the pairs, and why

- Typical monthly rent and typical home value move with the town and show last year beside them. Before, they were the first day's figures.
- Eviction notices and people claiming now count both kinds of household, so the figures are larger than before. Before, only fully simulated households were counted.
- The books' figures are the same on both sides in these three places.
- The rows for jobs, rentals and the state show no last year on either side. They wait on later build orders.
- A heading reads "City of Mccall". The name is written by the same function the Budgets tab already uses for its tabs on main, so the capital letter is not from this change. It is reported to Fable A, who owns that function.

## Makena, Hawaii (seed `ea78293d-d1f2-4383-ba9e-b7a1cac0b8f8`)

Before: [before-makena-hawaii.png](before-makena-hawaii.png)

After: [after-makena-hawaii.png](after-makena-hawaii.png), [after-makena-hawaii-2.png](after-makena-hawaii-2.png) (the second is the same screen scrolled to its end)

The lines as played, before (Wednesday, March 25, 2026, 8:30 PM):

```text
The country
Unemployment
6.0 %
Last year 4.6 % · up 1.4 since last year
Price growth
3.8 %
Last year 3.5 % · up 0.3 since last year
Average hourly pay
$37
Last year $36 · up $2 since last year
30-year mortgage rate
6.4 %
Last year 6.3 % · up 0.1 since last year
The central bank's rate
3.9 %
Last year 4.6 % · down 0.8 since last year
Homes
Rental homes
8
Rentals standing empty
1
Typical monthly rent
$1,840
Typical home value
$906,000
The town's books
Coming in
$413,000
Last year $413,000 · no change since last year
Going out
$277,000
Last year $276,000 · up $930 since last year
Your state
Unemployment
2.2 %
Average hourly pay
$39
Jobs
647,924
Evictions
Evictions
1
Last year 0 · up 1 since last year
Your town
People at work
81
People looking for work
6
Jobs open
6
Help for the unemployed
People claiming now
2
```

The lines as played, after (Wednesday, March 25, 2026, 8:30 PM):

```text
The country
Unemployment
6.0 %
Last year 4.6 % · up 1.4 since last year
Price growth
3.8 %
Last year 3.5 % · up 0.3 since last year
Average hourly pay
$37
Last year $36 · up $2 since last year
30-year mortgage rate
6.4 %
Last year 6.3 % · up 0.1 since last year
The central bank's rate
3.9 %
Last year 4.6 % · down 0.8 since last year
Homes
Rental homes
8
Rentals standing empty
1
Typical monthly rent
$1,890
Last year $1,890 · no change since last year
Typical home value
$919,000
Last year $913,000 · up $6,810 since last year
County of Maui
Coming in
$413,000
Last year $413,000 · no change since last year
Going out
$277,000
Last year $276,000 · up $930 since last year
Your town
People at work
81
People looking for work
6 of 87
Jobs open
6
Evictions
Eviction notices so far this year
0
Last year 3 · down 3 since last year
Your state
Unemployment
2.2 %
Average hourly pay
$39
Jobs
647,924
Help for the unemployed
People claiming now
3
Last year 1 · up 2 since last year
```

## Palo Seco, Puerto Rico (seed `7816ffb9-72c2-47ca-96a1-8aa35e7f47f9`)

Before: [before-palo-seco-puerto-rico.png](before-palo-seco-puerto-rico.png)

After: [after-palo-seco-puerto-rico.png](after-palo-seco-puerto-rico.png), [after-palo-seco-puerto-rico-2.png](after-palo-seco-puerto-rico-2.png) (the second is the same screen scrolled to its end)

The lines as played, before (Wednesday, March 25, 2026, 8:30 PM):

```text
The country
Unemployment
3.6 %
Last year 3.8 % · down 0.2 since last year
Price growth
3.1 %
Last year 1.9 % · up 1.2 since last year
Average hourly pay
$38
Last year $36 · up $2 since last year
30-year mortgage rate
6.6 %
Last year 6.8 % · down 0.3 since last year
The central bank's rate
3.1 %
Last year 4.4 % · down 1.3 since last year
Homes
Rental homes
158
Rentals standing empty
11
Typical monthly rent
$584
Typical home value
$120,000
The town's books
Coming in
$703,000
Last year $703,000 · no change since last year
Going out
$703,000
Last year $699,000 · up $3,390 since last year
Your state
Unemployment
7.0 %
Average hourly pay
$21
Jobs
919,993
Evictions
Evictions
3
Last year 0 · up 3 since last year
Your town
People at work
313
People looking for work
20
Jobs open
3
Help for the unemployed
People claiming now
1
```

The lines as played, after (Wednesday, March 25, 2026, 8:30 PM):

```text
The country
Unemployment
3.6 %
Last year 3.8 % · down 0.2 since last year
Price growth
3.1 %
Last year 1.9 % · up 1.2 since last year
Average hourly pay
$38
Last year $36 · up $2 since last year
30-year mortgage rate
6.6 %
Last year 6.8 % · down 0.3 since last year
The central bank's rate
3.1 %
Last year 4.4 % · down 1.3 since last year
Homes
Rental homes
158
Rentals standing empty
11
Typical monthly rent
$668
Last year $664 · up $4 since last year
Typical home value
$139,000
Last year $130,000 · up $8,500 since last year
Maunabo Municipio
Coming in
$703,000
Last year $703,000 · no change since last year
Going out
$703,000
Last year $699,000 · up $3,390 since last year
Your town
People at work
313
People looking for work
20 of 333
Jobs open
3
Evictions
Eviction notices so far this year
1
Last year 26 · down 25 since last year
Your state
Unemployment
7.0 %
Average hourly pay
$21
Jobs
919,993
Help for the unemployed
People claiming now
2
Last year 2 · no change since last year
```

## McCall, Idaho (seed `577dae68-726c-437f-a56b-b59d25e7648d`)

Before: [before-mccall-idaho.png](before-mccall-idaho.png), [before-mccall-idaho-2.png](before-mccall-idaho-2.png) (the second is the same screen scrolled to its end)

After: [after-mccall-idaho.png](after-mccall-idaho.png), [after-mccall-idaho-2.png](after-mccall-idaho-2.png) (the second is the same screen scrolled to its end)

The lines as played, before (Wednesday, March 25, 2026, 8:30 PM):

```text
The country
Unemployment
5.1 %
Last year 3.6 % · up 1.5 since last year
Price growth
3.3 %
Last year 3.3 % · no change since last year
Average hourly pay
$37
Last year $35 · up $2 since last year
30-year mortgage rate
6.9 %
Last year 7.1 % · down 0.2 since last year
The central bank's rate
3.6 %
Last year 4.1 % · down 0.5 since last year
Homes
Rental homes
657
Rentals standing empty
44
Typical monthly rent
$1,170
Typical home value
$664,000
The town's books
Coming in
$15.4 million
Last year $15.4 million · no change since last year
Going out
$13 million
Last year $13.1 million · down $53,600 since last year
Your state
Unemployment
4.1 %
Average hourly pay
$34
Jobs
884,918
Evictions
Evictions
0
Last year 1 · down 1 since last year
Your town
People at work
1,573
People looking for work
258
Jobs open
31
Help for the unemployed
People claiming now
1
```

The lines as played, after (Wednesday, March 25, 2026, 8:30 PM):

```text
The country
Unemployment
5.1 %
Last year 3.6 % · up 1.5 since last year
Price growth
3.3 %
Last year 3.3 % · no change since last year
Average hourly pay
$37
Last year $35 · up $2 since last year
30-year mortgage rate
6.9 %
Last year 7.1 % · down 0.2 since last year
The central bank's rate
3.6 %
Last year 4.1 % · down 0.5 since last year
Homes
Rental homes
657
Rentals standing empty
44
Typical monthly rent
$1,220
Last year $1,210 · up $5 since last year
Typical home value
$652,000
Last year $657,000 · down $4,750 since last year
City of Mccall
Coming in
$15.4 million
Last year $15.4 million · no change since last year
Going out
$13 million
Last year $13.1 million · down $53,600 since last year
Your town
People at work
1,573
People looking for work
258 of 1,831
Jobs open
31
Evictions
Eviction notices so far this year
0
Last year 2 · down 2 since last year
Your state
Unemployment
4.1 %
Average hourly pay
$34
Jobs
884,918
Help for the unemployed
People claiming now
43
Last year 43 · no change since last year
```
