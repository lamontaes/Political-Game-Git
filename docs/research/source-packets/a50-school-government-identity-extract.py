import json,csv,gzip,zipfile,io,openpyxl,collections
from pathlib import Path
base=Path(__file__).resolve().parents[3]
outdir=Path('/tmp/overflow2-a50')
outdir.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(base/'data/source/government-units/raw/gov_units_2025.zip') as z:
 w=openpyxl.load_workbook(io.BytesIO(z.read('Govt_Units_2025_Final.xlsx')),read_only=True,data_only=True)
 gus={};general={}
 for sheet in ['General Purpose','School District','DEP School Dist']:
  rows=iter(w[sheet].values);header=next(rows)
  for n,row in enumerate(rows,2):
   if not row[0]:continue
   d=dict(zip(header,row));d['sheet']=sheet;d['row']=n
   if sheet=='General Purpose':general[str(row[0])]=d
   else:gus.setdefault(str(row[0]),[]).append(d)
with gzip.open(base/'data/source/school-finances/raw/elsec24.txt.gz','rt') as f:
 finance=[dict(r,row=n) for n,r in enumerate(csv.DictReader(f),2)]
with zipfile.ZipFile(base/'data/source/education/raw/ccd-2024-25.zip') as z:
 m='ccd_lea_029_2425_w_0a_051425.csv'
 leas={r['LEAID']:dict(r,row=n) for n,r in enumerate(csv.DictReader(io.TextIOWrapper(z.open(m),encoding='utf-8-sig')),2)}
 m='ccd_sch_029_2425_w_0a_051425.csv'
 schools=[dict(r,row=n) for n,r in enumerate(csv.DictReader(io.TextIOWrapper(z.open(m),encoding='utf-8-sig')),2)]
 nces=collections.Counter(r['NCESID'] for r in finance)
 pid=collections.Counter(r['PID6'] for r in finance)
 columns=['nces_leaid','ccd_lea_row','ccd_status','ccd_status_effective_date','finance_row','finance_pid6','finance_unit_type','finance_yrdata','gus_sheet','gus_row','gus_active','gus_parent_pid6','parent_general_purpose_row','parent_unit_type','parent_active','relation','legal_employer','issue']
 output=[];counts=collections.Counter();covered=set()
 for r in finance:
  ident=r['NCESID'];lea=leas.get(ident);matches=gus.get(r['PID6'],[]);issues=[]
  if not lea:issues.append('no_ccd_2024_25_lea')
  if nces[ident]!=1:issues.append('ambiguous_ncesid')
  if pid[r['PID6']]!=1:issues.append('ambiguous_finance_pid6')
  if len(matches)!=1:issues.append('no_gus_school_row' if not matches else 'ambiguous_gus_pid6')
  g=matches[0] if len(matches)==1 else {}
  parent=str(g.get('PARENT_CENSUS_ID_PID6') or '')
  gp=general.get(parent,{})
  if parent and not gp:issues.append('parent_not_in_general_purpose')
  rel='dependent_parent' if parent else ('independent_school_government' if g.get('sheet')=='School District' else 'unmatched')
  counts[rel]+=1
  if lea and not issues:covered.add(ident);counts['unambiguous_complete_administrative_chain']+=1
  for x in issues:counts[x]+=1
  output.append(dict(zip(columns,[ident,lea.get('row','') if lea else '',lea.get('UPDATED_STATUS','') if lea else '',lea.get('EFFECTIVE_DATE','') if lea else '',r['row'],r['PID6'],r['UNIT_TYPE'],r['YRDATA'],g.get('sheet',''),g.get('row',''),g.get('ACTIVE',''),parent,gp.get('row',''),gp.get('UNIT_TYPE',''),gp.get('ACTIVE',''),rel,'NOT_ESTABLISHED',';'.join(issues)])))
with open(outdir/'a50-school-government-identity-joins.csv','w') as f:
 out=csv.DictWriter(f,fieldnames=columns);out.writeheader();out.writerows(output)
summary={'finance_rows':len(finance),'ccd_leas':len(leas),'ccd_schools':len(schools),'finance_unique_ncesids':len(nces),'finance_unique_pid6':len(pid),'counts':dict(counts),'schools_with_unambiguous_admin_chain':sum(r['LEAID'] in covered for r in schools),'school_state_coverage':dict(collections.Counter(r['ST'] for r in schools)),'chain_states':dict(collections.Counter(leas[x]['ST'] for x in covered)),'examples':[]}
for rel in ['dependent_parent','independent_school_government']:
 selected=[r for r in output if r['relation']==rel and not r['issue']]
 seen=set()
 for r in selected:
  st=leas[r['nces_leaid']]['ST']
  if st in seen:continue
  seen.add(st);summary['examples'].append({'state':st,**r})
  if len(seen)==3:break
(outdir/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k not in ('examples','school_state_coverage','chain_states')},indent=2));print(json.dumps(summary['examples'],indent=2))
