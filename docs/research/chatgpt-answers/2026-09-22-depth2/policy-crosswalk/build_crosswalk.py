from pathlib import Path
import json, hashlib, csv
ROOT=Path(__file__).parent
original=ROOT/'research-92-input.json'
research=json.loads(original.read_text())
# Exact keys manually transcribed from the connector-read source at the pinned head.
# This is a checked key inventory, not an executed/compiled copy of that TS module.
groups={
'fiscal':'operating-budget capital-budget appropriations income-tax sales-tax property-tax excise-taxes fees-and-charges debt-and-bonds public-pensions reserves revenue-sharing procurement',
'government-operations':'election-administration election-rules ethics-and-disclosure lobbying-regulation open-meetings-and-records civil-service agency-organization state-local-powers public-contracting legislative-procedure redistricting',
'education':'school-funding teacher-workforce curriculum-and-standards school-safety special-education school-choice early-childhood higher-education-tuition-and-aid higher-education-governance career-and-technical-education',
'health-human-services':'medicaid insurance-access hospitals-and-providers public-health behavioral-health substance-use child-and-family-services aging-and-disability food-and-income-assistance homelessness-services',
'justice-public-safety':'criminal-law-and-sentencing policing courts prosecution-and-defense corrections-and-prisons jails reentry juvenile-justice victim-services firearms emergency-response',
'housing-land-use':'zoning permitting housing-supply housing-affordability tenant-and-landlord-rules building-codes homelessness redevelopment neighborhood-planning state-housing-preemption',
'transportation-infrastructure':'roads-and-bridges transit rail airports-and-ports water-and-sewer stormwater broadband utility-regulation public-facilities capital-construction-and-maintenance',
'business-commerce':'occupational-licensing business-permits corporate-regulation consumer-protection insurance-regulation banking-and-credit alcohol-cannabis-gaming tourism development-incentives downtown-and-industrial-development',
'labor-workforce':'minimum-wage leave-policy unemployment-insurance workers-compensation workplace-standards collective-bargaining public-employment workforce-training',
'environment-energy':'air-quality water-quality waste-and-recycling contaminated-sites conservation energy-generation-and-grid energy-efficiency climate-mitigation climate-resilience disaster-mitigation environmental-permitting',
'agriculture-natural-resources':'farming-and-ranching forestry water-allocation fisheries-and-wildlife public-lands food-safety agricultural-markets rural-development',
'civil-family-community':'civil-rights-and-discrimination family-law reproductive-policy children-and-youth libraries arts-and-culture parks-and-recreation veterans community-institutions',
 'technology-privacy':'privacy-and-data-use artificial-intelligence cybersecurity platforms-and-social-media telecommunications digital-government',
}
keys=[f'{g}.{s}' for g,words in groups.items() for s in words.split()]
assert len(keys)==127 and len(set(keys))==127
M={}
def add(k,relationship,targets,note):
    assert k not in M
    ts=targets.split() if targets else []
    assert all(t in keys for t in ts), (k,set(ts)-set(keys))
    M[k]={'relationship':relationship,'shippedIssueKeys':ts,'note':note,'automaticRenameAllowed':False}
E='equivalent-topic'; B='research-umbrella'; N='research-specialization'; P='partial-overlap'; X='no-explicit-counterpart'; U='underspecified'
add('budget-and-appropriations',B,'fiscal.operating-budget fiscal.capital-budget fiscal.appropriations','Keep operating budget, capital plan and appropriation separate. One umbrella is not one executable operation.')
add('taxes-and-revenue',B,'fiscal.income-tax fiscal.sales-tax fiscal.property-tax fiscal.excise-taxes fiscal.fees-and-charges','Keep independent instruments, bases, liabilities and accounts; fees are not silently converted to taxes. This map does not correct or broaden level authority.')
add('debt-and-capital-finance',B,'fiscal.debt-and-bonds fiscal.capital-budget','Borrowing authority and a capital spending plan are related but different records.')
add('public-workforce-and-pensions',P,'fiscal.public-pensions labor-workforce.public-employment government-operations.civil-service','Research row focuses on financing; civil service also contains selection and discipline not covered by that financial label.')
add('procurement-and-contracting',B,'fiscal.procurement government-operations.public-contracting','Fiscal controls and award/contract terms remain distinguishable; do not duplicate a procurement.')
add('intergovernmental-aid',P,'fiscal.revenue-sharing','Revenue sharing overlaps transfers, but this label alone does not specify categorical grants, conditions or receiving/awarding powers.')
add('government-organization',N,'government-operations.agency-organization','Administrative organization, not authority to alter electoral or constitutional structure.')
add('school-finance',E,'education.school-funding','Topic equivalent; retain school-district scope as vocabulary without activating deferred school-board gameplay.')
add('teachers-and-school-workforce',E,'education.teacher-workforce','Retain pay, preparation and licensure distinctions within the existing key.')
add('curriculum-accountability-and-school-governance',P,'education.curriculum-and-standards education.school-choice','Standards and accountability overlap; school choice is only part of governance, not a synonym for all school governance.')
add('early-childhood',E,'education.early-childhood','Existing description explicitly includes pre-kindergarten and child care.')
add('postsecondary-finance-and-governance',B,'education.higher-education-tuition-and-aid education.higher-education-governance','Combines two real topics without merging their rules or decision owners.')
add('student-aid',N,'education.higher-education-tuition-and-aid','Aid is narrower than all college costs; do not discard tuition and fee policy.')
add('workforce-training',B,'labor-workforce.workforce-training education.career-and-technical-education','Training and career/technical education can share a learning view without duplicating participation or qualifications.')
add('medicaid-and-coverage',B,'health-human-services.medicaid health-human-services.insurance-access','Medicaid and general insurance access remain distinct instruments, programs and beneficiaries.')
add('health-costs-and-provider-regulation',B,'health-human-services.hospitals-and-providers health-human-services.insurance-access','Provider capacity/licensing and coverage/cost rules overlap; the map supplies no payment formula.')
add('public-health',E,'health-human-services.public-health','Equivalent topic only; concrete emergency powers require the relevant profile.')
add('behavioral-health-and-substance-use',B,'health-human-services.behavioral-health health-human-services.substance-use','Do not erase the difference between mental health care and substance-use policy.')
add('maternal-child-health',P,'health-human-services.public-health health-human-services.hospitals-and-providers','No explicit maternal/child clinical issue in shipped keys. These are neighboring service subjects, not a complete substitute. Child protection is not maternal health.')
add('disability-and-aging',E,'health-human-services.aging-and-disability','Equivalent topic; individual disability does not infer incapacity or a legal adjudication.')
add('child-welfare-and-family-assistance',B,'health-human-services.child-and-family-services health-human-services.food-and-income-assistance','Child protection and household financial assistance remain separate actions.')
add('policing',E,'justice-public-safety.policing','Equivalent topic.')
add('courts-and-pretrial',B,'justice-public-safety.courts justice-public-safety.prosecution-and-defense justice-public-safety.jails','Court capacity, counsel, charging and pretrial detention are separate; retain prosecution and defense as more than a court-label alias.')
add('sentencing-corrections-and-reentry',B,'justice-public-safety.criminal-law-and-sentencing justice-public-safety.corrections-and-prisons justice-public-safety.reentry','The researched label does not fully describe defining crimes; preserve that extra shipped meaning.')
add('juvenile-justice',E,'justice-public-safety.juvenile-justice','Equivalent topic.')
add('emergency-medical-and-911',N,'justice-public-safety.emergency-response','Ambulance and dispatch specialize the shared fire/ambulance/911 topic; no duplicated incident.')
add('fire-and-emergency-response',N,'justice-public-safety.emergency-response','Fire response specializes the same existing topic rather than being another copy of a response event.')
add('firearm-safety-and-carry',N,'justice-public-safety.firearms','Shipped topic also covers purchase, removal and prohibited possession; do not narrow it to carry alone.')
add('roads-and-bridges',E,'transportation-infrastructure.roads-and-bridges','Equivalent topic.')
add('transportation-funding',P,'fiscal.appropriations fiscal.capital-budget transportation-infrastructure.capital-construction-and-maintenance','No dedicated funding issue key; bind a fiscal operation to the transportation target rather than invent a second payment.')
add('traffic-safety',X,'','No explicit traffic/road-user safety issue in the shipped vocabulary. Roads-and-bridges is adjacent infrastructure, not equivalent substantive safety policy.')
add('transit-and-mobility',N,'transportation-infrastructure.transit','Existing transit covers routes, frequency and fares; broader mobility/access modes may require explicit future additions.')
add('airports-ports-and-freight',B,'transportation-infrastructure.airports-and-ports transportation-infrastructure.rail','Freight links to rail and ports; do not erase intercity passenger rail or infer every freight mode is covered.')
add('water-wastewater-and-public-works',B,'transportation-infrastructure.water-and-sewer transportation-infrastructure.stormwater transportation-infrastructure.capital-construction-and-maintenance','Water, sewer, drainage and works delivery remain distinct facilities and obligations.')
add('housing-supply-and-affordability',B,'housing-land-use.housing-supply housing-land-use.housing-affordability','Sufficient total supply can coexist with an individual affordability problem.')
add('zoning-and-land-use',B,'housing-land-use.zoning housing-land-use.permitting housing-land-use.neighborhood-planning','Permission, process and planning are not interchangeable legal acts.')
add('homelessness',P,'housing-land-use.homelessness health-human-services.homelessness-services','Condition and services are separate existing keys; maintain both.')
add('building-and-safety-codes',E,'housing-land-use.building-codes','Equivalent building-code subject; not all public-safety laws.')
add('redevelopment-and-neighborhood-investment',B,'housing-land-use.redevelopment housing-land-use.neighborhood-planning business-commerce.downtown-and-industrial-development','Related place investment themes; preserve industrial development and actual project identities.')
add('property-maintenance',P,'housing-land-use.building-codes housing-land-use.tenant-and-landlord-rules','Habitability/maintenance overlaps these, but leases, deposits and eviction are not merely property maintenance.')
add('business-attraction-and-incentives',E,'business-commerce.development-incentives','Equivalent attraction/retention incentive topic.')
add('occupational-licensing',E,'business-commerce.occupational-licensing','Equivalent topic.')
add('professional-scope',P,'business-commerce.occupational-licensing','Permission to enter a profession and permitted work within it differ. No explicit scope-of-practice row; do not claim a complete synonym.')
add('small-business-and-commerce',B,'business-commerce.business-permits business-commerce.corporate-regulation','Operating permits and formation/reporting/governance remain distinguishable.')
add('tourism',E,'business-commerce.tourism','Equivalent topic.')
add('regulated-markets',N,'business-commerce.alcohol-cannabis-gaming','Existing special-market key covers these named markets only; research label is not a blanket adapter for every regulated market.')
add('minimum-wage-and-hours',B,'labor-workforce.minimum-wage labor-workforce.workplace-standards','Pay floor and hours/scheduling have separate units and effects.')
add('leave-and-workplace-standards',B,'labor-workforce.leave-policy labor-workforce.workplace-standards','Leave and safety/classification/hours remain distinguishable; shared standards key is not a duplicate.')
add('unemployment-insurance',E,'labor-workforce.unemployment-insurance','Equivalent topic, not an unemployment-rate variable.')
add('workers-compensation',E,'labor-workforce.workers-compensation','Equivalent topic.')
add('collective-bargaining',E,'labor-workforce.collective-bargaining','Equivalent topic.')
add('public-employment',E,'labor-workforce.public-employment','Equivalent employer topic; not automatically civil-service adjudication or pension funding.')
add('utility-rates-and-grid-reliability',P,'transportation-infrastructure.utility-regulation environment-energy.energy-generation-and-grid','Utility rates/obligations include electricity, gas and water; grid operation is a specific connected system.')
add('generation-and-energy-mix',N,'environment-energy.energy-generation-and-grid','Generation/mix is narrower than all grid infrastructure and transmission.')
add('water-resources',N,'agriculture-natural-resources.water-allocation','Allocation of rights overlaps water resources; water quality, utility service and infrastructure remain separate.')
add('air-and-water-pollution',B,'environment-energy.air-quality environment-energy.water-quality environment-energy.contaminated-sites','Pollution media and site cleanup are distinct; retain liability and land remediation from the site issue.')
add('waste-and-recycling',E,'environment-energy.waste-and-recycling','Equivalent topic.')
add('climate-and-disaster-resilience',B,'environment-energy.climate-resilience environment-energy.disaster-mitigation','Adaptation/preparation is not mitigation of greenhouse-gas emissions; preserve the separate emissions issue.')
add('parks-lands-wildlife-and-forestry',B,'environment-energy.conservation agriculture-natural-resources.fisheries-and-wildlife agriculture-natural-resources.public-lands agriculture-natural-resources.forestry','Ecological stewardship umbrella; commercial forestry, fishing rules and recreation retain their narrower identities.')
add('election-administration',E,'government-operations.election-administration','Topic map only, not real voter guidance or an eligibility change.')
add('voting-rules-and-access',N,'government-operations.election-rules','Voting rules are one part; preserve candidacy and campaign-finance meaning in the broader existing key.')
add('redistricting',E,'government-operations.redistricting','Equivalent topic; no new geography or boundaries supplied.')
add('campaign-finance',N,'government-operations.election-rules','Current broader description includes campaign finance. Do not equate financing with voting eligibility.')
add('ethics-and-lobbying',B,'government-operations.ethics-and-disclosure government-operations.lobbying-regulation','Two related but different enforcement/registration topics.')
add('open-records-and-open-meetings',E,'government-operations.open-meetings-and-records','Equivalent topic.')
add('local-government-structure',P,'government-operations.state-local-powers government-operations.agency-organization','Power allocation and administrative structure overlap, but neither key alone enumerates all local government forms or selection rules.')
add('artificial-intelligence',E,'technology-privacy.artificial-intelligence','Equivalent topic.')
add('privacy-and-data-governance',E,'technology-privacy.privacy-and-data-use','Equivalent topic.')
add('government-cybersecurity',E,'technology-privacy.cybersecurity','Equivalent public-system security topic; no operational attack details.')
add('broadband-and-digital-access',N,'transportation-infrastructure.broadband','Network/service access overlaps; do not treat it as all platform regulation or telecommunications law.')
add('government-technology-and-digital-services',E,'technology-privacy.digital-government','Equivalent topic.')
add('agriculture-and-farm-policy',B,'agriculture-natural-resources.farming-and-ranching agriculture-natural-resources.agricultural-markets','Production/support and markets/contracts/prices remain separate.')
add('food-systems-and-safety',P,'agriculture-natural-resources.food-safety agriculture-natural-resources.agricultural-markets','Safety is not all food production/distribution; keep the actual operation explicit.')
add('rural-development',E,'agriculture-natural-resources.rural-development','Equivalent topic.')
add('forestry-and-working-lands',N,'agriculture-natural-resources.forestry','Productive forestry emphasis; preserve forest health/fire management too.')
add('conservation',P,'agriculture-natural-resources.farming-and-ranching environment-energy.conservation','Research row expressly means agricultural practices; broad habitat/easement conservation does not automatically specify farm programs.')
add('family-law-and-child-support',E,'civil-family-community.family-law','Equivalent family-law umbrella; exact rights/duties still need relevant rules.')
add('civil-rights-and-discrimination',E,'civil-family-community.civil-rights-and-discrimination','Equivalent topic.')
add('reproductive-health',N,'civil-family-community.reproductive-policy','Research definition is rights/access/family-law emphasis, not equivalent to all clinical maternal care.')
add('immigration-related',X,'','No explicit immigration-related issue among the 127. Federal immigration/naturalization is distinct from supported state/local services and civil policy.')
add('insurance-and-financial-consumer',P,'business-commerce.consumer-protection business-commerce.insurance-regulation business-commerce.banking-and-credit','Consumer-facing slice of broader market/solvency/chartering and lending rules; do not absorb those broader functions.')
add('general',U,'','The returned label and description identify no substantive operation. Do not use as a catch-all to claim unmatched shipped subjects are covered.')
add('parks-and-recreation',E,'civil-family-community.parks-and-recreation','Equivalent topic; not all public-land stewardship.')
add('libraries',E,'civil-family-community.libraries','Equivalent topic.')
add('arts-and-cultural-services',N,'civil-family-community.arts-and-culture','Cultural-service slice; preserve historic preservation included in the existing broader description.')
add('historic-preservation',N,'civil-family-community.arts-and-culture','Explicitly present in existing arts-and-culture description; not missing merely for lack of separate key.')
add('community-events-and-public-space',P,'civil-family-community.community-institutions civil-family-community.parks-and-recreation transportation-infrastructure.public-facilities','Events, spaces, facilities and institutions overlap but do not make every public facility a social event.')
add('insurance-market-regulation',E,'business-commerce.insurance-regulation','Equivalent market-regulation topic; preserve separate health-coverage subjects.')
add('banking-and-credit-regulation',E,'business-commerce.banking-and-credit','Equivalent state-market topic, not monetary policy.')
add('veterans-services',E,'civil-family-community.veterans','Equivalent subject moved to a health/services research grouping; same identity should survive.')
add('child-care-access',N,'education.early-childhood','Existing description explicitly includes access/providers/funding of child care; appears in a second research grouping without duplicate service demand.')
add('intergovernmental-powers-and-preemption',B,'government-operations.state-local-powers housing-land-use.state-housing-preemption','General power allocation and its explicit housing specialization remain separate; no declaration that a concrete policy is preempted.')
assert set(M)=={x['key'] for x in research['issues']}, (set(M)^ {x['key'] for x in research['issues']})
forward=[]
for i in research['issues']:
    forward.append({'researchIssueKey':i['key'],'researchName':i['name'],'researchDomain':i['domain'],**M[i['key']]})
inverse=[]
for k in keys:
    refs=[{'researchIssueKey':r['researchIssueKey'],'researchDomain':r['researchDomain'],'relationship':r['relationship']} for r in forward if k in r['shippedIssueKeys']]
    inverse.append({'shippedIssueKey':k,'qualifiedKey':'us-state-and-local:'+k,'shippedDomain':k.split('.')[0],'researchLinks':refs,'hasDirectResearchCounterpart':any(r['relationship']==E for r in refs),'preserve':True,'disposition':'retained-without-research-counterpart' if not refs else 'retained-current-key'})
# All domain links are derived from reviewed issue links, not a wholesale domain rename.
domain_rows=[]
for dom in research['domains']:
    sub=[r for r in forward if r['researchDomain']==dom['key']]
    sources=sorted({k.split('.')[0] for r in sub for k in r['shippedIssueKeys']})
    domain_rows.append({'researchDomain':dom['key'],'researchName':dom['name'],'shippedDomains':sources,'relationship':'many-to-many-view' if len(sources)>1 else 'view-over-subset-or-equivalent-domain','issueRows':[r['researchIssueKey'] for r in sub],'changesCanonicalDomainIds':False,'createsGameplayOccurrence':False})
sourcebase='https://github.com/lamontaes/Political-Game-Git/blob/d10dd525731bcd7bded20d165d74b9e0bae38ad8/'
out={'format':'research-policy-crosswalk/v1','status':'director-classification-delivery; not runtime-loaded',
'sourceHead':'d10dd525731bcd7bded20d165d74b9e0bae38ad8','shippedSourceBlob':'a51034f630acb7f30bd8259dcc486480c1ec181e',
'sourcePaths':[sourcebase+'src/simulation/policy-pack-us-state-and-local.ts',sourcebase+'src/simulation/policy-pack-us-policy-positions.ts'],
'researchInput':{'pack':research['pack'],'sha256':hashlib.sha256(original.read_bytes()).hexdigest(),'origin':'recovered Policy_and_Bargaining_Research.zip, not a newly invented taxonomy'},
'method':'Exact shipped issue keys manually transcribed from connector-read source; relationships individually classified from names/descriptions. Structural checks below do not constitute a repository loader test.',
'relationshipDefinitions':{E:'Same policy topic under another research label; no claim of identical power or effect.',B:'Research umbrella spans separate shipped topics; do not merge their records.',N:'Research label specializes a broader shipped subject; do not remove its remaining meaning.',P:'Overlap or adjacent existing machinery with incomplete equivalence; requires operation-specific binding.',X:'No explicit substantive counterpart supplied by these keys.',U:'Insufficient semantic definition for a valid mapping.'},
'canonicalKeyMigration':{},'preserveAllCurrentIssueKeys':True,'preserveAllDependentPropositionKeys':True,'runtimeTestsExecuted':False,
'domainMappings':domain_rows,'researchToShipped':forward,'shippedToResearch':inverse,
'researchWithoutAnyTarget':[r for r in forward if not r['shippedIssueKeys']],
'shippedWithoutAnyResearchTarget':[r for r in inverse if not r['researchLinks']],
'acceptanceTestsForOwner':['Load current sourced pack and dependent us-policy-positions pack before/after view registration; same proposition/issue IDs and rejection report, not merely unchanged total count.','Verify all 127 current keys survive; reported 66 proposition count must be measured at actual receiving head, not assumed unchanged.','Load/save a held belief and a filed provision referencing current qualified issue keys; references retain meaning and reach the same proposal.','One issue shown under two research headings creates no extra docket occurrence, effect, participant or probability weight.','Unknown/underspecified research rows remain explicit gaps; no general catch-all claims full coverage.','Level permissions and instruments are unchanged by this classification; separate authority validation still applies.']}
(ROOT/'policy-92-to-127-crosswalk.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
with (ROOT/'policy-92-to-127-crosswalk.csv').open('w',newline='') as f:
    w=csv.writer(f);w.writerow(['research_issue','research_domain','relationship','shipped_issue_keys','note'])
    for r in forward:w.writerow([r['researchIssueKey'],r['researchDomain'],r['relationship'],';'.join(r['shippedIssueKeys']),r['note']])
(ROOT/'shipped-127-key-inventory.json').write_text(json.dumps({'sourceHead':out['sourceHead'],'blob':out['shippedSourceBlob'],'keys':keys,'method':out['method']},indent=2)+'\n')
checks={
'92_research_rows':len(forward)==92,'14_research_domains':len(domain_rows)==14,'127_unique_shipped_keys':len(keys)==len(set(keys))==127,
'13_shipped_domains':len(groups)==13,'every_research_id_exactly_once':len(M)==len(forward)==len(set(r['researchIssueKey'] for r in forward)),
'all_links_resolve':all(k in keys for r in forward for k in r['shippedIssueKeys']),
'127_inverse_rows':len(inverse)==127,'all_current_keys_preserved':all(r['preserve'] for r in inverse),
'no_migration_or_automatic_rename':not out['canonicalKeyMigration'] and all(not r['automaticRenameAllowed'] for r in forward),
'general_is_not_catchall':M['general']['relationship']==U and not M['general']['shippedIssueKeys'],
'all_inverse_links_consistent':all(r['shippedIssueKey'] in M[x['researchIssueKey']]['shippedIssueKeys'] for r in inverse for x in r['researchLinks']),
'every_domain_covered':all(r['issueRows'] for r in domain_rows),
}
assert all(checks.values())
(ROOT/'validation.json').write_text(json.dumps({'checks':checks,'passed':sum(checks.values()),'failed':sum(not x for x in checks.values()),'scope':'Research-data consistency only. No production/source/loader/playtest execution.','unmatchedResearch':[r['researchIssueKey'] for r in out['researchWithoutAnyTarget']],'unmatchedShipped':[r['shippedIssueKey'] for r in out['shippedWithoutAnyResearchTarget']]},indent=2)+'\n')
print(json.dumps({'rows':len(forward),'inverse':len(inverse),'checks':checks,'unmatchedResearch':[r['researchIssueKey'] for r in out['researchWithoutAnyTarget']],'unmatchedShipped':[r['shippedIssueKey'] for r in out['shippedWithoutAnyResearchTarget']]},indent=2))
