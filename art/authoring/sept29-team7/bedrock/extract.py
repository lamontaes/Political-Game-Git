import ast,csv,hashlib,json,re,collections
from pathlib import Path
b=Path(__file__).resolve().parents[4];root=b/'art/authoring/sept29-team7';out=root/'bedrock';out.mkdir(exist_ok=True);rows=[];manifest=[]
effects={'geometry-coordinate':('source-raster candidate measurement; no runtime acceptance','Foot, seat, clip or drawable-face image position if admitted.'),'artistic-scale':('artistic assumption; not research calibration','Character height/perspective guide if admitted.'),'draw-order':('artistic layer convention','Relative overlap order if admitted.'),'newspaper-layout':('editorial design setting','Column geometry, font hierarchy or sample rendering only.'),'age-label':('assignment age label; silhouette correction pending','Candidate selection by depicted age; does not change a person age.'),'metadata':('nonbehavioral record or derived measurement','Lineage, schema, counts or QA reporting; no simulation effect.'),'render-literal':('local review renderer constant; no game import','Raster/SVG dimensions, type, rules, arrangement or loop mechanics.'),'painted-object-assumption':('explicit artistic furniture/scene assumption; not survey','Justifies candidate scale inference; not real-world dimensional proof.')}
def classify(file,parts):
 key=parts[-1]if parts else''
 if 'measuredFrom'in parts:return'painted-object-assumption'
 if key=='age_group':return'age-label'
 if file.name in ['staging.json','inherited-staging.json']:
  if key in ['horizonY','metersPercent']or'floors'in parts:return'artistic-scale'
  if key=='depth':return'draw-order'
  if key in ['x','y','seatY','clipBelowY']:return'geometry-coordinate'
 if file.name=='surfaces.json'and'quad'in parts:return'geometry-coordinate'
 if file.parent.name=='newspaper-kit'and file.name in ['kit.json','layouts.json']:return'newspaper-layout'
 return'metadata'
def walk(file,v,parts=()):
 if isinstance(v,bool):return
 pointer='/'+ '/'.join(str(p).replace('~','~0').replace('/','~1')for p in parts)
 if isinstance(v,(int,float)):
  c=classify(file,parts);rows.append([str(file.relative_to(b)),pointer,str(v),c,*effects[c]])
 elif isinstance(v,str)and parts and parts[-1]in ['measuredFrom','age_group']:
  for i,x in enumerate(re.findall(r'(?<![A-Za-z0-9])[0-9]+(?:\.[0-9]+)?',v)):
   c=classify(file,parts);rows.append([str(file.relative_to(b)),pointer+f'#text-number-{i+1}',x,c,*effects[c]])
 elif isinstance(v,dict):
  for k,x in v.items():walk(file,x,parts+(k,))
 elif isinstance(v,list):
  for i,x in enumerate(v):walk(file,x,parts+(str(i),))
for p in sorted(root.rglob('*')):
 if not p.is_file()or out in p.parents or p.suffix not in ['.json','.py']:continue
 raw=p.read_bytes();before=len(rows)
 if p.suffix=='.json':walk(p,json.loads(raw))
 else:
  for n in ast.walk(ast.parse(raw)):
   if isinstance(n,ast.Constant)and isinstance(n.value,(int,float))and not isinstance(n.value,bool):rows.append([str(p.relative_to(b)),f'line:{n.lineno}:column:{n.col_offset}',str(n.value),'render-literal',*effects['render-literal']])
 manifest.append(dict(file=str(p.relative_to(b)),sha256=hashlib.sha256(raw).hexdigest(),numericOccurrences=len(rows)-before))
with (out/'numbers.csv').open('w',newline='')as f:
 w=csv.writer(f,lineterminator="\n");w.writerow(['file','location','value','classification','provenance','downstreamEffect']);w.writerows(rows)
counts=dict(collections.Counter(r[3]for r in rows));ranges={c:dict(minimum=min(float(r[2])for r in rows if r[3]==c),maximum=max(float(r[2])for r in rows if r[3]==c))for c in counts}
data=dict(schema='team7-art-numeric-inventory/v1',scope='Every numeric JSON leaf and numeric Python literal in Team7 candidate files; additionally numeric age labels and measuredFrom text. No simulation source ownership.',sourceFiles=manifest,occurrences=len(rows),classCounts=counts,classRanges=ranges,csvSha256=hashlib.sha256((out/'numbers.csv').read_bytes()).hexdigest(),limits=['Repeated receipt copies remain separately counted; counts are literal occurrences, not distinct behavior rules.','Numbers embedded in publication prose are recorded game facts, not art coefficients; packet is retained without rewriting.','Numeric filenames, IDs, hashes, schema text and color strings are identities/encoding, not behavior-setting coefficients.','Imported consumer behavior and runtime rendering NOT RUN.','The 1.7 m overlay adult reference is inherited and artistic; overlays are guides, not character fit proof.'])
(out/'source-manifest.json').write_text(json.dumps(data,indent=2)+'\n');print(json.dumps(dict(files=len(manifest),occurrences=len(rows),counts=counts,ranges=ranges),indent=2))
