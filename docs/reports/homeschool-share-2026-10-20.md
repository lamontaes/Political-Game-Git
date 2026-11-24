# Homeschool share by state, from the Household Pulse files (Oct 20, 2026)

A homeschool share for each state can be built from public Census files, and I have the numbers, but none of it is in the game yet. The school engine has no state-level reader to attach it to. This note gives the definition, the anchor, the state table and the script, so a researcher can finish the pool item for it.

## What I found

The Household Pulse public-use files download without a Census API key, from the Census Bureau's file server (weeks 41 to 48 of 2022). Each household says how many of its children are in public school, in private school, or homeschooled, meaning not enrolled in public or private school. The variables are `TENROLLPUB`, `TENROLLPRV` and `TENROLLHMSCH`, with household weight `HWEIGHT` and state `EST_ST`.

Weighted across eight waves in 2022, 14.4 percent of enrolled children are homeschooled by that definition (11.6 to 16.6 percent by wave). The National Center for Education Statistics' own count, from the National Household Education Survey, is 2.8 percent in 2019 (standard error 0.18; NCES Digest of Education Statistics 2022, Table 206.10, which also gives 1.7 in 1999, 3.4 in 2012 and 3.3 in 2016). The Pulse number is about five times larger because it asks parents in the middle of the pandemic and counts any child not enrolled in a school, with no limit on hours at school and no exclusion of a temporary illness.

## The definition I chose

The Pulse level cannot be used as the share of children who are homeschooled: it would take 14 percent of a town's children out of its schools. What it does carry is how states differ. So the state share is the NHES national share times how far the state's Pulse share sits from the nation's. Each state's Pulse share is first pulled toward the national one by its sample size. The pull is worth 40 household records, so a state with 25 records moves most of the way and one with 263 hardly at all:

state share = 0.028 x (n x state_pulse_share + 40 x national_pulse_share) / ((n + 40) x national_pulse_share)

The result runs from 1.8 percent to 4.4 percent, with a median of 2.6 percent, which sits inside the NHES range of 1.7 to 3.4 percent. The five territories (the Pulse has none) would take the median, marked ESTIMATED.

Limits: the state samples are small (25 to 263 household records over eight waves), the relative pattern is from 2022, and the NHES anchor is 2019. The share checks the band a played town's schools report. It never picks which family homeschools.

## Table

| State | Household records | Pulse share (raw) | Relative to nation (shrunk) | State share used |
| ----- | ----------------- | ----------------- | --------------------------- | ---------------- |
| AL    | 54                | 0.078             | 0.74                        | 0.0207           |
| AK    | 50                | 0.173             | 1.12                        | 0.0312           |
| AZ    | 75                | 0.245             | 1.46                        | 0.0409           |
| AR    | 32                | 0.074             | 0.78                        | 0.0220           |
| CA    | 263               | 0.150             | 1.04                        | 0.0291           |
| CO    | 86                | 0.188             | 1.21                        | 0.0340           |
| CT    | 93                | 0.097             | 0.77                        | 0.0216           |
| DE    | 53                | 0.091             | 0.79                        | 0.0222           |
| DC    | 25                | 0.207             | 1.17                        | 0.0328           |
| FL    | 100               | 0.094             | 0.75                        | 0.0211           |
| GA    | 98                | 0.260             | 1.58                        | 0.0442           |
| HI    | 35                | 0.236             | 1.30                        | 0.0364           |
| ID    | 63                | 0.104             | 0.83                        | 0.0233           |
| IL    | 83                | 0.181             | 1.18                        | 0.0329           |
| IN    | 98                | 0.115             | 0.86                        | 0.0241           |
| IA    | 67                | 0.109             | 0.85                        | 0.0238           |
| KS    | 85                | 0.084             | 0.72                        | 0.0201           |
| KY    | 66                | 0.124             | 0.91                        | 0.0256           |
| LA    | 76                | 0.130             | 0.94                        | 0.0263           |
| ME    | 40                | 0.180             | 1.13                        | 0.0316           |
| MD    | 98                | 0.150             | 1.03                        | 0.0289           |
| MA    | 109               | 0.126             | 0.91                        | 0.0255           |
| MI    | 110               | 0.169             | 1.13                        | 0.0316           |
| MN    | 104               | 0.102             | 0.79                        | 0.0221           |
| MS    | 51                | 0.127             | 0.94                        | 0.0262           |
| MO    | 72                | 0.114             | 0.87                        | 0.0243           |
| MT    | 41                | 0.228             | 1.30                        | 0.0363           |
| NE    | 61                | 0.123             | 0.91                        | 0.0256           |
| NV    | 76                | 0.123             | 0.91                        | 0.0254           |
| NH    | 55                | 0.163             | 1.08                        | 0.0302           |
| NJ    | 73                | 0.123             | 0.91                        | 0.0255           |
| NM    | 44                | 0.132             | 0.96                        | 0.0268           |
| NY    | 73                | 0.197             | 1.24                        | 0.0348           |
| NC    | 55                | 0.100             | 0.83                        | 0.0231           |
| ND    | 47                | 0.278             | 1.51                        | 0.0422           |
| OH    | 56                | 0.054             | 0.64                        | 0.0178           |
| OK    | 70                | 0.096             | 0.79                        | 0.0221           |
| OR    | 78                | 0.188             | 1.20                        | 0.0337           |
| PA    | 98                | 0.202             | 1.29                        | 0.0361           |
| RI    | 38                | 0.087             | 0.81                        | 0.0226           |
| SC    | 63                | 0.073             | 0.70                        | 0.0196           |
| SD    | 40                | 0.127             | 0.94                        | 0.0264           |
| TN    | 72                | 0.232             | 1.40                        | 0.0391           |
| TX    | 196               | 0.142             | 0.99                        | 0.0277           |
| UT    | 129               | 0.145             | 1.01                        | 0.0283           |
| VT    | 37                | 0.081             | 0.79                        | 0.0221           |
| VA    | 108               | 0.110             | 0.83                        | 0.0233           |
| WA    | 132               | 0.221             | 1.41                        | 0.0396           |
| WV    | 36                | 0.076             | 0.78                        | 0.0217           |
| WI    | 54                | 0.058             | 0.66                        | 0.0184           |
| WY    | 47                | 0.110             | 0.87                        | 0.0245           |

## The script

```python
import zipfile,csv,io,json,sys,urllib.request,collections,os
waves=range(41,49)
agg=collections.defaultdict(lambda: collections.defaultdict(lambda:[0.0,0.0,0]))  # wave -> state -> [hm, total, n]
for wk in waves:
    path=f'w{wk}.zip'
    if not os.path.exists(path):
        os.system(f'curl -sSL -m 400 -o {path} https://www2.census.gov/programs-surveys/demo/datasets/hhp/2022/wk{wk}/HPS_Week{wk}_PUF_CSV.zip')
    z=zipfile.ZipFile(path)
    name=[n for n in z.namelist() if n.endswith('.csv') and 'repwgt' not in n][0]
    with z.open(name) as f:
        r=csv.DictReader(io.TextIOWrapper(f,encoding='utf-8'))
        for row in r:
            try:
                pub=int(row['TENROLLPUB']); prv=int(row['TENROLLPRV']); hm=int(row['TENROLLHMSCH']); w=float(row['HWEIGHT'])
            except (ValueError,KeyError): continue
            if min(pub,prv,hm)<0: continue
            tot=pub+prv+hm
            if tot<=0: continue
            a=agg[wk][row['EST_ST']]
            a[0]+=w*hm; a[1]+=w*tot; a[2]+=1
    os.remove(path)
    print('wave',wk,'done',flush=True)
json.dump({str(k):{s:v for s,v in d.items()} for k,d in agg.items()},open('agg.json','w'))
```

## Why it is not in the game

The guard `research-data-has-reader` fails for a data file nothing reads. Today the school engine reads one national private share (`openingPrivateSchoolShare` in `opening-private-tuition.ts`), not a state-level one. The state-level private share the pool item names came from `research-school-assignment-sources`, which is not on main. Once a state-level reader exists, this table goes into `data/research/people/` as `homeschool-share-2019-2022.json` with `id`, `publisher`, `vintage`, `table`, `universe`, `geography`, `sourceUrl`, `retrievedOn`, `limits` and these rows, tagged ESTIMATED with the spread across waves, and the territories take the median.
