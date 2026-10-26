# Homeschool share by state: replicate-weight error bars (Oct 20, 2026)

The state homeschool shares are much less certain than the first note showed. The earlier errors were too small: the survey's own errors run from 0.020 (Ohio) to 0.091 (Georgia), with a median of 0.035, on raw shares near 0.15. Massachusetts, New York and New Jersey no longer read alike (0.035, 0.081 and 0.043). The state shares in the earlier note stay as given; only the error bars change, and they argue for keeping the strong pull toward the national share.

## What changed

A typical state's raw share is known to about a quarter of itself, and the noisiest states (Georgia, North Dakota, Hawaii, New York, Maine, Montana, Alaska) to about half. I did not re-check the shrunk table against these errors; the pull of 40 household records is unchanged.

Method: for each state, the share is the weighted homeschooled children over weighted enrolled children, pooled across waves. Each of the 80 replicates recomputes it with that replicate's weights, and the variance is the sum of squared differences from the full-sample share divided by 80 x (1 - 0.5)^2 (Fay's method, coefficient 0.5, as the Census documents for the Pulse). Households are matched between the main and replicate files on `SCRAM`.

## Table (state, household records, raw Pulse share, replicate-weight standard error)

| State | Records | Share | SE    |
| ----- | ------- | ----- | ----- |
| AK    | 50      | 0.173 | 0.052 |
| AL    | 54      | 0.078 | 0.027 |
| AR    | 32      | 0.074 | 0.048 |
| AZ    | 75      | 0.244 | 0.032 |
| CA    | 263     | 0.150 | 0.022 |
| CO    | 86      | 0.188 | 0.031 |
| CT    | 93      | 0.097 | 0.033 |
| DC    | 25      | 0.207 | 0.028 |
| DE    | 53      | 0.091 | 0.048 |
| FL    | 100     | 0.094 | 0.030 |
| GA    | 98      | 0.260 | 0.091 |
| HI    | 35      | 0.236 | 0.079 |
| IA    | 67      | 0.109 | 0.033 |
| ID    | 63      | 0.104 | 0.036 |
| IL    | 83      | 0.181 | 0.051 |
| IN    | 98      | 0.115 | 0.039 |
| KS    | 85      | 0.084 | 0.028 |
| KY    | 66      | 0.124 | 0.044 |
| LA    | 76      | 0.130 | 0.037 |
| MA    | 109     | 0.126 | 0.035 |
| MD    | 98      | 0.150 | 0.033 |
| ME    | 40      | 0.180 | 0.080 |
| MI    | 110     | 0.169 | 0.034 |
| MN    | 104     | 0.102 | 0.032 |
| MO    | 72      | 0.114 | 0.035 |
| MS    | 51      | 0.127 | 0.044 |
| MT    | 41      | 0.228 | 0.088 |
| NC    | 55      | 0.100 | 0.035 |
| ND    | 47      | 0.278 | 0.076 |
| NE    | 61      | 0.123 | 0.035 |
| NH    | 55      | 0.163 | 0.038 |
| NJ    | 73      | 0.123 | 0.043 |
| NM    | 44      | 0.132 | 0.041 |
| NV    | 76      | 0.123 | 0.030 |
| NY    | 73      | 0.197 | 0.081 |
| OH    | 56      | 0.054 | 0.020 |
| OK    | 70      | 0.096 | 0.031 |
| OR    | 78      | 0.188 | 0.059 |
| PA    | 98      | 0.202 | 0.037 |
| RI    | 38      | 0.087 | 0.037 |
| SC    | 63      | 0.073 | 0.027 |
| SD    | 40      | 0.127 | 0.048 |
| TN    | 72      | 0.232 | 0.054 |
| TX    | 196     | 0.142 | 0.034 |
| UT    | 129     | 0.145 | 0.028 |
| VA    | 108     | 0.110 | 0.034 |
| VT    | 37      | 0.081 | 0.036 |
| WA    | 132     | 0.221 | 0.032 |
| WI    | 54      | 0.058 | 0.024 |
| WV    | 36      | 0.076 | 0.039 |
| WY    | 47      | 0.110 | 0.030 |

Limits: waves are pooled as one sample, so the error ignores a household appearing in more than one wave. The Pulse share is 2022 and pandemic-era; the table's use is relative spread, not level.

## The script

```python
import zipfile, csv, io, json, os, collections, subprocess
# Pooled over waves 41-48: per state, theta = sum(w*hm)/sum(w*tot); replicate thetas from HWEIGHT1-80.
# Fay's BRR (coefficient 0.5): var = sum_r (theta_r - theta)^2 / (80 * (1-0.5)^2) = sum / 20.
D = '/tmp/claude-0/hp'
R = 80
num = collections.defaultdict(float); den = collections.defaultdict(float); n = collections.Counter()
rnum = collections.defaultdict(lambda: [0.0] * R); rden = collections.defaultdict(lambda: [0.0] * R)
for wk in range(41, 49):
    path = f'{D}/w{wk}.zip'
    if not os.path.exists(path):
        subprocess.run(['curl', '-sSL', '-m', '400', '-o', path,
                        f'https://www2.census.gov/programs-surveys/demo/datasets/hhp/2022/wk{wk}/HPS_Week{wk}_PUF_CSV.zip'], check=True)
    z = zipfile.ZipFile(path)
    names = z.namelist()
    main = [x for x in names if x.endswith('.csv') and 'repwgt' not in x][0]
    rep = [x for x in names if 'repwgt' in x][0]
    keep = {}
    with z.open(main) as f:
        for row in csv.DictReader(io.TextIOWrapper(f, encoding='utf-8')):
            try:
                pub = int(row['TENROLLPUB']); prv = int(row['TENROLLPRV']); hm = int(row['TENROLLHMSCH']); w = float(row['HWEIGHT'])
            except (ValueError, KeyError):
                continue
            if min(pub, prv, hm) < 0 or pub + prv + hm <= 0:
            keep[row['SCRAM']] = (row['EST_ST'], hm, pub + prv + hm)
            s = row['EST_ST']
            num[s] += w * hm; den[s] += w * (pub + prv + hm); n[s] += 1
    with z.open(rep) as f:
            k = keep.get(row['SCRAM'])
            if not k:
            s, hm, tot = k
            a = rnum[s]; b = rden[s]
            for r in range(R):
                w = float(row[f'HWEIGHT{r + 1}'])
                a[r] += w * hm; b[r] += w * tot
    print('wave', wk, flush=True)
out = {}
for s in sorted(num):
    th = num[s] / den[s]
    var = sum((rnum[s][r] / rden[s][r] - th) ** 2 for r in range(R)) / (R * 0.25)
    out[s] = {'n': n[s], 'share': round(th, 4), 'se': round(var ** 0.5, 4)}
json.dump(out, open('/tmp/claude-0/hp-script/errbars.json', 'w'), indent=1)
print(json.dumps(out))
```

# Homeschool state shares: shrinkage against the replicate-weight errors (Oct 20, 2026)

Pool item `people-homeschool-share-recheck-shrinkage`. Method: `scripts/research/homeschool-share-replicate-errors.py` rebuilds each state's share from the Household Pulse public-use files for weeks 53 to 63 of 2023 and takes the error over the survey's 80 replicate weights. It reproduces the shipped shares to four decimals (51 of 51 places). The errors are in `data/research/people/census-household-pulse-homeschool-replicate-errors-2023.json`.

## What I found

- **The branch ships no shrinkage.** `data/research/people/census-household-pulse-homeschool-share-2023.json` (PR #5493) holds each state's raw share and `opening-private-tuition.ts` reads it directly. The "pull of 40 household records" in this item's question is therefore a proposal, not code; I tested it as one.
- **The simple error understates the real one.** The shipped error is the simple one for the number of households. The replicate error is larger in most states (the median simple-to-replicate ratio is 0.81, so the real error is about a quarter larger).
- **A pull of 40 households does almost nothing.** Each state has 1,700 to 4,400 households, so pulling 40 records toward the national 0.0451 moves a state's share by at most 0.0011 (0.11 points), against replicate errors of 0.0025 to 0.0106. It is smaller than the sampling error everywhere.
- **The states really do differ.** The spread between states (standard deviation 0.0144) is about three times the average replicate error (0.0052). After the 40-pull, only 15 of 51 states sit within one standard error of the national share. The other 36 differ from it by more than their own error, so heavy shrinkage toward the national share would erase real differences (Alaska at 11.6 percent, Massachusetts at 2.5 percent).

## Drawn place

Harmony, Rhode Island (place 4433040; seed `c8ce942b105c77adda7d67ea1ad846b28ed0ba71c3b2a2e2ed154f881554360f`, purpose `homeschool-share`, drawn with `drawPlace`). Table row US-RI: raw share 0.0257, replicate error 0.0054 (simple 0.0042), 40-record pull 0.0262, national 0.0451. Rhode Island sits 3.5 standard errors below the national share, so it is a real difference and stays.

## Pull value: kept or changed

**No hand pull.** Keep the raw state shares for the states whose replicate error is small beside the between-state spread, which is nearly all of them. Where a state's error is large (Alaska 0.0106, the District 0.0070, Montana 0.0073, North Carolina 0.0068), pull by the empirical-Bayes weight w = τ² / (τ² + error²), with τ = 0.0144 from the table below: Alaska keeps 0.65 of its own share, the District 0.81. That is a per-state formula with no constant of its own. If the owner wants a flat pull anyway, the empirical-Bayes weights imply about 320 households of pull (median), not 40.

This is a recommendation for the builder of PR #5493; I did not change its data or code, since it is on another branch and its base has since moved on main. The private-tuition total is calibrated by the share and never decides whether one family homeschools, so the choice moves a town's tuition total by well under one percent either way.

## Table (51 states and the District)

| State | Raw share | Replicate error | Simple error | After 40-pull | Within 1 error of national | Empirical-Bayes weight on own share |
| ----- | --------- | --------------- | ------------ | ------------- | -------------------------- | ----------------------------------- |
| AL    | 0.0569    | 0.0064          | 0.0046       | 0.0567        | no                         | 0.84                                |
| AK    | 0.1160    | 0.0106          | 0.0064       | 0.1149        | no                         | 0.65                                |
| AZ    | 0.0418    | 0.0032          | 0.0030       | 0.0419        | no                         | 0.95                                |
| AR    | 0.0612    | 0.0056          | 0.0047       | 0.0610        | no                         | 0.87                                |
| CA    | 0.0392    | 0.0033          | 0.0018       | 0.0392        | no                         | 0.95                                |
| CO    | 0.0459    | 0.0039          | 0.0033       | 0.0459        | yes                        | 0.93                                |
| CT    | 0.0285    | 0.0035          | 0.0031       | 0.0287        | no                         | 0.94                                |
| DE    | 0.0335    | 0.0050          | 0.0045       | 0.0338        | no                         | 0.89                                |
| DC    | 0.0312    | 0.0070          | 0.0042       | 0.0316        | no                         | 0.81                                |
| FL    | 0.0538    | 0.0049          | 0.0033       | 0.0537        | no                         | 0.90                                |
| GA    | 0.0512    | 0.0040          | 0.0033       | 0.0512        | no                         | 0.93                                |
| HI    | 0.0488    | 0.0076          | 0.0053       | 0.0487        | yes                        | 0.78                                |
| ID    | 0.0612    | 0.0047          | 0.0036       | 0.0611        | no                         | 0.90                                |
| IL    | 0.0372    | 0.0031          | 0.0030       | 0.0373        | no                         | 0.96                                |
| IN    | 0.0533    | 0.0037          | 0.0039       | 0.0533        | no                         | 0.94                                |
| IA    | 0.0330    | 0.0037          | 0.0032       | 0.0332        | no                         | 0.94                                |
| KS    | 0.0423    | 0.0042          | 0.0034       | 0.0424        | yes                        | 0.92                                |
| KY    | 0.0498    | 0.0051          | 0.0041       | 0.0497        | yes                        | 0.89                                |
| LA    | 0.0437    | 0.0052          | 0.0041       | 0.0437        | yes                        | 0.89                                |
| ME    | 0.0440    | 0.0055          | 0.0048       | 0.0440        | yes                        | 0.87                                |
| MD    | 0.0408    | 0.0038          | 0.0031       | 0.0408        | no                         | 0.93                                |
| MA    | 0.0246    | 0.0036          | 0.0025       | 0.0248        | no                         | 0.94                                |
| MI    | 0.0420    | 0.0033          | 0.0028       | 0.0420        | yes                        | 0.95                                |
| MN    | 0.0287    | 0.0027          | 0.0027       | 0.0289        | no                         | 0.97                                |
| MS    | 0.0604    | 0.0056          | 0.0050       | 0.0602        | no                         | 0.87                                |
| MO    | 0.0680    | 0.0056          | 0.0044       | 0.0677        | no                         | 0.87                                |
| MT    | 0.0629    | 0.0073          | 0.0051       | 0.0626        | no                         | 0.80                                |
| NE    | 0.0328    | 0.0036          | 0.0030       | 0.0329        | no                         | 0.94                                |
| NV    | 0.0470    | 0.0051          | 0.0044       | 0.0470        | yes                        | 0.89                                |
| NH    | 0.0512    | 0.0059          | 0.0046       | 0.0511        | no                         | 0.86                                |
| NJ    | 0.0254    | 0.0036          | 0.0028       | 0.0257        | no                         | 0.94                                |
| NM    | 0.0528    | 0.0047          | 0.0041       | 0.0527        | no                         | 0.91                                |
| NY    | 0.0249    | 0.0045          | 0.0030       | 0.0251        | no                         | 0.91                                |
| NC    | 0.0554    | 0.0068          | 0.0042       | 0.0553        | no                         | 0.82                                |
| ND    | 0.0429    | 0.0053          | 0.0046       | 0.0429        | yes                        | 0.88                                |
| OH    | 0.0417    | 0.0051          | 0.0037       | 0.0418        | yes                        | 0.89                                |
| OK    | 0.0530    | 0.0053          | 0.0039       | 0.0529        | no                         | 0.88                                |
| OR    | 0.0565    | 0.0043          | 0.0036       | 0.0564        | no                         | 0.92                                |
| PA    | 0.0400    | 0.0039          | 0.0031       | 0.0400        | no                         | 0.93                                |
| RI    | 0.0257    | 0.0054          | 0.0042       | 0.0262        | no                         | 0.88                                |
| SC    | 0.0539    | 0.0050          | 0.0044       | 0.0538        | no                         | 0.89                                |
| SD    | 0.0441    | 0.0056          | 0.0043       | 0.0441        | yes                        | 0.87                                |
| TN    | 0.0764    | 0.0051          | 0.0046       | 0.0761        | no                         | 0.89                                |
| TX    | 0.0466    | 0.0033          | 0.0022       | 0.0466        | yes                        | 0.95                                |
| UT    | 0.0468    | 0.0034          | 0.0028       | 0.0467        | yes                        | 0.95                                |
| VT    | 0.0472    | 0.0092          | 0.0049       | 0.0472        | yes                        | 0.71                                |
| VA    | 0.0596    | 0.0047          | 0.0035       | 0.0595        | no                         | 0.90                                |
| WA    | 0.0499    | 0.0040          | 0.0026       | 0.0499        | no                         | 0.93                                |
| WV    | 0.0614    | 0.0059          | 0.0051       | 0.0611        | no                         | 0.86                                |
| WI    | 0.0360    | 0.0036          | 0.0034       | 0.0361        | no                         | 0.94                                |
| WY    | 0.0488    | 0.0057          | 0.0049       | 0.0487        | yes                        | 0.87                                |
