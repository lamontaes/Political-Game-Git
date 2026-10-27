# Builds the one-scene-at-a-time review page from a batch file (development tooling):
#   python3 scripts/dialogue-batch/review-page/build.py data/english/batches/<batch>.json <out.html> scripts/dialogue-batch/review-page/template.html
import json,sys
src,out,tpl=sys.argv[1:4]
d=json.load(open(src))
def line(l):
    out={"speaker":l.get("speaker",""),"text":l["text"],"move":l.get("move",""),"auto":bool(l.get("auto"))}
    if l.get("tag"): out["tag"]=l["tag"]
    return out
def node(n):
    reps=[]
    for r in n.get("replies",[]):
        nx=r.get("next") or {"lines":[],"replies":[]}
        if nx.get("branches"):
            for b in nx["branches"]:
                reps.append({"line":line(r["line"]),"knows":b.get("knows",False),"source":b.get("source"),"next":node(b["node"])})
        else:
            reps.append({"line":line(r["line"]),"next":node(nx)})
    return {"lines":[line(l) for l in n.get("lines",[])],"replies":reps,"end":n.get("end")}
first={}
for it in d["items"]: first.setdefault((it.get("purpose"),it.get("profile")),it)
scenes=[]
for k,s in enumerate([x for x in d["scenes"] if x.get("root")],1):
    it=first.get((s.get("purpose"),(s.get("tests") or {}).get("profile")),{}) or next((v for (pp,_),v in first.items() if pp==s.get("purpose")),{})
    opening=[]
    for l in it.get("lines",[]):
        if l["role"]=="narrator": continue
        if l["role"]=="reply" and not (l.get("auto") or l.get("step")=="auto"): break
        x=line(l)
        if l["role"]=="reply": x["auto"]=True
        opening.append(x)
    root=node(s["root"])
    have={x["text"] for x in opening}
    root["lines"]=opening+[x for x in root["lines"] if x["text"] not in have]
    asker=opening[0]["speaker"] if opening else "they"
    scenes.append({"id":s["id"],"n":k,"purpose":s.get("purpose",""),"type":s.get("type",""),"key":it.get("key",""),"endpoint":it.get("endpoint",""),
      "asker":asker,"who":"","context":s.get("context"),"narration":s.get("narration",[]),"root":root})
data={"id":d.get("id","batch-14"),"place":d.get("place",""),"scenes":scenes}
import re
payload=json.dumps(data,ensure_ascii=False).replace("</","<\\/")
open(out,'w').write(re.sub(r"/\*DATA\*/\s*null",lambda m: payload,open(tpl).read(),count=1))
json.dump(data,open(out+".json","w"),ensure_ascii=False)
print(len(scenes),"scenes")
