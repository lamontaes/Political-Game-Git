from pathlib import Path
import json, collections
root=Path(__file__).resolve().parent
packet=json.loads((root/'dispositions.json').read_text())
portable={r['recordId']:r for r in json.loads((root/'portable-records.json').read_text())}
personal_only={'AL','ME','PA','SC'}
guidance={'CA','IN','KS','MN','MO','NM','ND','PR','VT'}
rows=[]
for source in packet['rows']:
 record=portable.get(source.get('portableRecordId'))
 if not record: kind='NO_PORTABLE_WAGE_AUTHORITY_ADMISSION'
 elif source['place'] in personal_only:kind='PERSONAL_INCOME_TAX_SCOPE_NOT_EMPLOYER_DUTY'
 elif source['place'] in guidance:kind='WAGE_WITHHOLDING_DESCRIPTION_OR_GUIDANCE'
 else:kind='CONDITIONAL_EMPLOYER_WITHHOLDING_RULE'
 rows.append({
  'place':source['place'],'authorityKey':source['authorityKey'],'levyKey':source['levyKey'],
  'sourceDisposition':source['disposition'],'selectedQuoteUse':kind,
  'artifactId':source.get('evidence',{}).get('artifactId') if source.get('evidence') else None,
  'sha256':source.get('evidence',{}).get('sha256') if source.get('evidence') else None,
  'portableRecordId':source.get('portableRecordId'),
  'evidenceFrom':source.get('effectiveFrom'),'evidenceThrough':source.get('effectiveThrough'),
  'sourceUncertainty':record.get('uncertainty') if record else None,
  'blanketWithholdingPermission':False,
  'startingQuestionKey':source['startingQuestionKey'],'startingConsequenceRowId':source['startingConsequenceRowId'],
  'callerAdmission':'NOT_ADMITTED',
  'neededBeforeCallerAttribution':[
   'Exact canonical starting or enacted law/question/row identity for this saved levy',
   'Dated source applies at the saved occurrence, including visibility cutoff',
   'Saved person/employer/workplace/residency/exemption facts satisfy that source scope; absence is not permission',
   'Root-approved append-only attribution of the actual matching liability or payment; no new assessment or collection'],
  'sourceScope':source['scope']})
assert len(rows)==57 and len({r['place'] for r in rows})==57
assert all(r['blanketWithholdingPermission'] is False and r['callerAdmission']=='NOT_ADMITTED' for r in rows)
assert {r['place'] for r in rows if r['selectedQuoteUse']=='PERSONAL_INCOME_TAX_SCOPE_NOT_EMPLOYER_DUTY'}==personal_only
for row in rows:
 original=next(r for r in packet['rows'] if r['place']==row['place'])
 assert row['authorityKey']==original['authorityKey'] and row['levyKey']==original['levyKey']
 assert row['evidenceFrom']==original.get('effectiveFrom') and row['evidenceThrough']==original.get('effectiveThrough')
 assert row['startingQuestionKey'] is None and row['startingConsequenceRowId'] is None
out={'scope':'Research/caller preparation only, not a provider, new permission rule or runtime input',
 'sourcePacketHead':'62d39e4bd92e201177afd2f36edefaa9f6922d69',
 'currentMainInspected':'a010a4ce9405baa04cdaf944aecc6bd79b4a44e4',
 'counts':dict(collections.Counter(r['selectedQuoteUse'] for r in rows)), 'rows':rows}
(root/'withholding-scope.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'places':len(rows),'counts':out['counts'],'startingMappingsAdmitted':0,'blanketPermissions':0,'validation':'PASS: exact original levy, dates and nullable mappings preserved in all57 rows'},indent=2))
