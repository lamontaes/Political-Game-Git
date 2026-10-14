import sys; sys.path.insert(0,'/Users/lamontae/political-game-play/cto-notes/tools/docket')
import audit_progress as ap, json, math, os
os.chdir('/Users/lamontae/political-game-play/cto-notes/tools/docket')
res = ap.scan(); d = {"slices": json.load(open('slices.json'))}; ap.slice_progress(d, res)
S=d['slices']['slices']
tot=pas=0
for s in S:
    c=s['checks']; p=s['passed']; tot+=c; pas+=p
    print(f"{s['name']:26} {p}/{c} need {max(0,math.ceil(0.8*c)-p)}")
print('TOTAL',pas,tot,round(100*pas/tot,1),'need80',max(0,math.ceil(0.8*tot)-pas))
