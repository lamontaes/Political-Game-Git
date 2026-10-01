from pathlib import Path
import json,hashlib,collections,re
P=Path(__file__).resolve().parent
manifest={}
failures=[]
withheld={x['path']:x for x in json.loads((P/'publication-withheld.json').read_text())['artifacts']}
for f in sorted(P.glob('*manifest.json')):
 data=json.loads(f.read_text())
 captures=data['captures'] if isinstance(data,dict) else [dict(x,place=x['code'].upper()+'-broker',artifactId='a33-wage-authority-'+x['code']+'-broker-2026-10-01',path='raw/'+x['code']+'-broker.html',textPath='raw/'+x['code']+'-broker.txt') for x in data]
 for x in captures:
  if x.get('sha256'):
   if x['path'] in withheld:
    assert withheld[x['path']]['sha256']==x['sha256']
    x['publicationStatus']=withheld[x['path']]['publicationStatus']
   else:
    assert hashlib.sha256((P/x['path']).read_bytes()).hexdigest()==x['sha256'],x['path']
   manifest[x['place']]=x
  else: failures.append(dict(x,manifest=f.name))
# Each quote below is checked against the captured, whitespace-normalized source, never reconstructed.
choices={
'US':('US','Withhold federal income tax from each wage payment or supplemental unemployment compensation plan benefit payment according to the employee’s Form W-4 and the correct withholding table in Pub. 15-T.','Covered federal wage withholding only; federal FICA and territory-local income taxes are distinct.','2026-01-01','2026-12-31'),
'AL':('AL','Individuals who are domiciled in (or residents of) Alabama are subject to tax on their entire income whether earned within or without Alabama.','Resident income scope; nonresident, thresholds and exemptions must be read separately.'),
'CA':('CA-withholding','Withheld from Employee Wages State Disability Insurance (SDI) Personal Income Tax (PIT)','Only PIT is wage-income tax; SDI, UI and ETT remain distinct.'),
'DE':('DE','Your employer would be required to withhold Delaware taxes as long as you work in Delaware.','Quote is the New Jersey resident working in Delaware case; no universal residency/reciprocity rule.'),
'HI':('HI-evidence','If an employee does not furnish you with a Form HW-4, you are required to withhold tax as if the employee was single and had claimed no withholding allowance.','Hawaii HW-4 rules, exemptions and own state recipient; current Booklet A revision2024 says withholding January1,2025 and thereafter.'),
'ID':('ID-withholding','Idaho law requires employers to withhold income tax from their employees’ wages.','Apply employee/nexus/exemption conditions in the linked Idaho guidance; no numeric rate supplied.'),
'IL':('IL-authority','you must withhold Illinois Income Tax for your Illinois employee if you withhold federal income tax from your employee’s wages, or you and your employee enter into a voluntary withholding agreement.','HOUSEHOLD EMPLOYEE scope only, not all employers; federal-withholding or voluntary-agreement condition.'),
'IN':('IN-withholding','These are state and county taxes that are withheld from your employees’ wages.','Agency employer guide; state authority only in this packet, county power/rate is not admitted.'),
'IA':('IA-authority','Every employer who maintains an office or transacts business in Iowa and who is required to withhold federal income tax on any compensation paid to employees for services performed in Iowa is required to withhold Iowa individual income tax from that compensation.','Office/business nexus and federal-withholding condition; military-spouse exemptions and other sourced exclusions remain.'),
'KS':('KS-authority','A completed withholding allowance certificate will let your employer know how much Kansas income tax should be withheld from your pay on income you earn from Kansas sources.','Kansas-source wages, allowance certificate and employee-specific exemptions; no catalog rate.'),
'KY':('KY-withholding','Employers must withhold the income tax of the employees receiving "wages" as defined in Section 3401(a) of the Internal Revenue Code.','Residents/nonresidents unless exempted by law; KRS141.310 and103KAR18:150 named by the source.'),
'LA':('LA-withholding','Louisiana employers are responsible for withholding Louisiana income tax from employee wages, filing withholding tax returns, and remitting withheld taxes to the Louisiana Department of Revenue.','Resident/nonresident service-in-Louisiana and exemptions; other-state withholding can change resident coverage.'),
'ME':('ME-detail','Maine generally imposes an income tax on all individuals that have Maine-source income.','Maine-source individual income; exact withholding/exemptions and nonresident allocation remain separate.'),
'MI':('MI-evidence','Every employer in Michigan who is required to withhold federal income tax under the Internal Revenue Code, must also be registered for and withhold Michigan income tax.','Federal-withholding condition; reciprocal-state and employee exemption clauses must be preserved.'),
'MN':('MN-withholding','Minnesota Withholding Tax is state income tax you as an employer take out of your employees’ wages.','Deposit is to Minnesota Department of Revenue; exemptions and residency conditions are not defaults.'),
'MO':('MO-withholding','Withholding is the tax that an employer deducts and withholds from employees’ wages every pay period.','Missouri agency withholding guidance; exemptions and specific scope must be read before collection.'),
'MT':('MT-guide','If you are an employee, your employer is required to withhold income tax from your paycheck unless a federal or Montana tax exemption applies.','2026 Montana Publication1; applicable federal/Montana exemptions and Montana-source wage scope.','2026-01-01','2026-12-31'),
'NJ':('NJ-withholding',"As a New Jersey employer, you must withhold New Jersey Income Tax from: All New Jersey resident employees, unless they're already being taxed in another state at a higher rate. Nonresident employees working in New Jersey, or those who telework here for their convenience . Pennsylvania residents working in New Jersey are an exception, but they need to fill out a form Employee's Certificate of Nonresidence in New Jersey to qualify.",'Source immediately enumerates resident employees unless higher other-state tax and New Jersey-working nonresidents; retain those conditions.'),
'NM':('NM-withholding','Employers must withhold a part of the employee’s wages for payment of income tax.','New Mexico employer guidance; exemptions and worker-compensation obligations stay distinct.'),
'NY':('NY-withholding','Employers are required to withhold and pay personal income taxes on wages, salaries, bonuses, commissions, and other similar income paid to employees.','Read New York employee nexus/exemptions separately; city taxes are not this state authority row.'),
'NC':('NC-authority','An employee who is a resident of NC is subject to NC withholding on all of his wages, whether he works in NC or in another state.','Exception in same source: other work state requiring income withholding; nonresident/service conditions separate.'),
'ND':('ND-withholding','An employer paying wages to an employee if the employee performs services in North Dakota and the wages are subject to federal income tax withholding.','Who-must-register clause; farm/ranch wages not federally withheld have separate exclusion.'),
'OK':('OK-evidence',"Withholding tax is the amount that an employer withholds from employees' wages and pays directly to the state.",'Oklahoma employee income-tax credit; exemptions and interstate rules remain source-dependent.'),
'PA':('PA','Pennsylvania taxes eight classes of income: (1) compensation;','Agency PIT page plus compensation category; no wage rate/annualization inferred from this authority packet.'),
'SC':('SC','South Carolina taxes income earned here.','South Carolina resident/nonresident filing and source-income conditions; enacted tax questions are not starting-law IDs.'),
'VT':('VT-broker','Your employer withholds taxes from each paycheck and sends it to the Department of Taxes.','Vermont own Department of Taxes recipient; current observed guide, not2025-return filing-season rate or historical continuity.'),
'VA':('VA-authority','In general, an employer who pays wages to one or more employees in Virginia is required to deduct and withhold state income tax from those wages.','Virginia employer wage nexus; source explicitly qualifies general rule, preserve exceptions.'),
'WI':('WI-withholding','Every employer who meets both requirements "a" and "b", below, is required to withhold Wisconsin income taxes: Pays wages to: A Wisconsin resident (regardless of where the services were performed), or A nonresident (person domiciled outside of Wisconsin) for services performed in Wisconsin, unless:','Source employer two-condition test; Wisconsin resident wages or services in Wisconsin plus employer nexus, reciprocal IL/IN/KY/MI exclusions.'),
'VI':('VI-authority','Income tax withheld from wages paid for services performed in the Virgin Islands, whether by a V.I. employer, an U.S. employer, or an employer based elsewhere, are remitted to the BIR.','Virgin Islands own BIR recipient, mirror-code rules; IRS Forms941/809 not interchangeable and FICA is distinct.'),
'PR':('PR-guide','Tablas de Retención aplicables a salarios pagados después del 31 de diciembre de 2016:','Puerto Rico own wages/local withholding guidance; no federal recipient proxy or invented starting-law binding.'),
}
none={
'NV':('NV-none','No State Income Tax on Individuals: Nevada residents do not pay state tax on income earned from salaries, wages, or similar compensation.','Observed current collection absence, not a legal prohibition on future enactment.'),
'SD':('SD','South Dakota is one of seven states that does not impose a state income tax.','Observed state income-tax absence; guidance count is not a claim about the other six states.'),
'WA':('WA','Washington does not currently have an individual income tax.','Source also describes legislated January1,2028 high-income tax phase; current absence does not deny future authority.')}
# Sources with narrower/historical evidence are kept as evidence-only dispositions, never upgraded to current authority.
limited={
'AS':('AS-tax','American Samoa income tax withheld','2025 return workbook, not a2026 legal period; actual XLSX bytes retained with original .html filename.','raw/as-tax.xlsx-extract.txt'),
'GU':('GU-authority','Household employee wages not reported on Form(s) W-2','2025 Guam return; no2026 authority continuity or canonical starting mapping proved.'),
'MA':('MA-resident','For tax year 2025, Massachusetts has a 5.0% tax on both earned (salaries, wages, tips, commissions)','2025 guide does not establish a2026 legal authority interval.'),
'CT':('CT-authority','Compensation for services, including wages, fees, commissions, taxable fringe benefits, and similar items;','Resident2025 return income scope, not verified2026 employer authority.'),
'DC':('DC-individual','You must file a DC tax return if:','Resident general filing guidance, not yet direct wage authority with legal scope.'),
'NE':('NE-authority','State copies of 2026 Forms W-2','2026 reconciliation plus2027 tables; no2026 operative withholding duty clause selected.'),
'MP':('MP-authority','Chapter 2 (Earnings Tax)','Named Chapter2/1040CM allocation, not full wage/mirror recipient and operative scope; return capture exceeds bound.'),
'TN':('TN-root','The Hall income tax is imposed only on individuals and other entities receiving interest from bonds and notes and dividends from stock.','Hall tax scope/repeal is not an explicit statewide wage-tax absence proof.'),
'WV':('WV-guide','The withholding tax tables have been updated for the 2026 tax year.','Table update/law timing is verified but direct wage-scope authority quote remains needed.'),
'OH':('OH-source','Wages/Compensation:','2025 individual return booklet; historical scope only, not current2026 employer authority.')}
# Input capture lists every requested jurisdiction, including failed ones.
initial=json.loads((P/'capture-manifest.json').read_text())['captures'];places=sorted(r['place'] for r in initial)
records=[];rows=[];artifacts={}
def evidence(key,quote,text=None):
 m=manifest[key];text=text or m['textPath']
 if key in ['HI-evidence','MT-guide']:text='raw/'+key.lower()+'.raw-extract.txt'
 s=' '.join((P/text).read_text().split())
 assert quote in s,(key,quote)
 artifacts[m['artifactId']]=dict(m,textPath=text)
 return {'artifactId':m['artifactId'],'quote':quote,'quoteNormalization':'Unicode whitespace collapsed to single spaces; no word changes','textPath':text,'url':m['finalUrl'],'sha256':m['sha256'],'capturedAt':m['capturedAt'],'publicationStatus':m.get('publicationStatus','RAW_PUBLISHED')}
for code in places:
 row={'place':code,'authorityKey':'US' if code=='US' else 'US-'+code,'jurisdictionKey':'US' if code=='US' else 'US-'+code,'level':'FEDERAL' if code=='US' else 'STATE','levyKey':'us-federal:income-tax-withholding' if code=='US' else 'us-'+code.lower()+':wage-income-tax','instrument':'INDIVIDUAL_INCOME_TAX','startingQuestionKey':None,'startingConsequenceRowId':None,'startingBindingStatus':'MISSING_CANONICAL_STARTING_LEVY_QUESTION_ROW_MAPPING','enactedQuestionRelationships':['us-federal-positions:tax.raise-top-income-tax-rate'] if code=='US' else ['us-policy-positions:fiscal.adopt-income-tax','us-policy-positions:fiscal.graduated-income-tax'],'questionRelationshipLimit':'Enacted reader relationship only; does not prove this starting levy has that question or row. Territory existence/authority is separate. FICA and excise are excluded.'}
 if code in choices:
  key,quote,scope,*dates=choices[code];ev=evidence(key,quote)
  start,end=dates or ['2026-10-01','2026-10-01'];mode='CONTINUOUS_INTERVAL' if dates else 'FOUNDATIONAL_AND_OBSERVED_POINTS'
  rec={'recordId':'a33-wage-income-authority-'+code.lower()+'-2026-10-01','stateUsps':code,'level':row['level'],'effectiveFrom':start,'effectiveThrough':end,'sourceAsOf':'2026-10-01','source':{'artifactId':ev['artifactId'],'citation':manifest[key]['finalUrl'],'url':ev['url'],'evidenceLocator':ev['textPath']+'; exact quoted paragraph in dispositions.json','enactedDate':None,'effectiveDate':start,'effectiveDateDerivation':'Publication explicitly for use in2026; this is guide applicability, not statute enactment.' if dates else 'Only observed source version on capture date is established; no historical continuity or enactment date inferred.','effectiveDateEvidenceArtifactIds':[ev['artifactId']],'lastAmendedDate':None,'observedDate':'2026-10-01','versionApplicability':mode},'constraints':[scope,'Authority evidence applies only within quoted source scope; terms, actual bases and exceptions remain necessary.','No rate, threshold, liability, recipient account or canonical starting-law consequence row is invented.'],'uncertainty':None,'kind':'TAX_INSTRUMENT','instrument':'INDIVIDUAL_INCOME_TAX','authorization':'AUTHORIZED'}
  if ev['publicationStatus']!='RAW_PUBLISHED': rec['uncertainty']='Original HTML is locally preserved but withheld from publication after push protection; receiving owner must verify original source bytes before admission.'
  records.append(rec);row.update(disposition='WAGE_AUTHORITY_SOURCE_VERIFIED' if rec['uncertainty'] is None else 'WAGE_SOURCE_VERIFIED_PUBLICATION_GAP',portableRecordId=rec['recordId'],effectiveFrom=start,effectiveThrough=end,intervalBasis=rec['source']['effectiveDateDerivation'],evidence=ev,scope=scope,remainingGaps=['ROOT_REGISTRY_ADMISSION','CANONICAL_STARTING_LEVY_QUESTION_ROW_MAPPING','EXACT_TERMS_AND_SAVED_RECIPIENT_FOR_COLLECTION'])
 elif code in none:
  key,quote,scope=none[code];row.update(disposition='NONE_SOURCED_CURRENT_COLLECTION_ONLY',portableRecordId=None,effectiveFrom='2026-10-01',effectiveThrough='2026-10-01',intervalBasis='Observed agency statement only; no historical continuity.',evidence=evidence(key,quote),scope=scope,remainingGaps=['LEGAL_POWER_TO_ENACT_NOT_INFERRED_FROM_CURRENT_ABSENCE','CANONICAL_STARTING_LEVY_QUESTION_ROW_MAPPING'])
 elif code in limited:
  key,quote,scope,*txt=limited[code];row.update(disposition='EVIDENCE_SCOPE_OR_PERIOD_GAP',portableRecordId=None,effectiveFrom=None,effectiveThrough=None,evidence=evidence(key,quote,txt[0] if txt else None),scope=scope,remainingGaps=['CURRENT_WAGE_AUTHORITY_SCOPE_OR_INTERVAL','CANONICAL_STARTING_LEVY_QUESTION_ROW_MAPPING'])
 else:
  blocked=code in ['AZ','CO','NH','RI'];row.update(disposition='OFFICIAL_SOURCE_HTTP_GAP' if blocked else 'OFFICIAL_BODY_OR_EXPLICIT_SCOPE_GAP',portableRecordId=None,effectiveFrom=None,effectiveThrough=None,evidence=None,scope='No authority or sourced-none admission from menu links, error pages, HTTP status, or another jurisdiction.',remainingGaps=['CAPTURED_OFFICIAL_BODY' if blocked else 'DIRECT_WAGE_AUTHORITY_OR_EXPLICIT_NONE_QUOTE','EFFECTIVE_INTERVAL','CANONICAL_STARTING_LEVY_QUESTION_ROW_MAPPING'])
 rows.append(row)
assert len(rows)==57 and len(set(r['place'] for r in rows))==57
for name,data in [('dispositions.json',{'scope':'Federal plus all56 state-level jurisdictions; research evidence, not runtime or registry admission','asOf':'2026-10-01','counts':dict(collections.Counter(r['disposition'] for r in rows)),'rows':rows}),('portable-records.json',records),('source-artifacts.json',{'artifacts':list(artifacts.values()),'digestByArtifactId':{k:v['sha256'] for k,v in artifacts.items()},'failedCaptures':failures})]:
 (P/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'places':len(rows),'portableRecords':len(records),'verifiedReferencedArtifacts':len(artifacts),'dispositions':dict(collections.Counter(r['disposition'] for r in rows))},indent=2))
