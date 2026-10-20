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
                continue
            keep[row['SCRAM']] = (row['EST_ST'], hm, pub + prv + hm)
            s = row['EST_ST']
            num[s] += w * hm; den[s] += w * (pub + prv + hm); n[s] += 1
    with z.open(rep) as f:
        for row in csv.DictReader(io.TextIOWrapper(f, encoding='utf-8')):
            k = keep.get(row['SCRAM'])
            if not k:
                continue
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
