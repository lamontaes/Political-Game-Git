/**
 * Which BLS occupation (Standard Occupational Classification code) each town
 * job is paid as.
 *
 * GAME ASSUMPTION: the town's jobs are classified in the game's own words
 * (`town-employment.ts`), and this table names the published occupation each
 * one is paid as. Most are the occupation of the same name. Four are the
 * nearest one BLS publishes: a campaign manager and a party or campaign
 * field organizer are paid as "Business Operations Specialists, All Other"
 * (13-1199), a community organizer as "Community and Social Service
 * Specialists, All Other" (21-1099), and an emergency dispatcher as other
 * dispatchers (43-5032), because their jobs share one classification. A
 * county clerk is paid as a town's clerk is, "Court, Municipal, and License
 * Clerks" (43-4031). A job
 * whose classification is missing here has no pay on record, and none is
 * invented for it.
 */
export const TOWN_JOB_SOC: Readonly<Record<string, string>> = {
  "occupation:bank-teller": "43-3071",
  "occupation:bus-driver": "53-3052",
  "occupation:cashier": "41-2011",
  "occupation:construction-laborer": "47-2061",
  "occupation:cook": "35-2014",
  "occupation:customer-service": "43-4051",
  "occupation:dishwasher": "35-9021",
  "occupation:dispatcher": "43-5032",
  "occupation:extraction-laborer": "47-5081",
  "occupation:farm-manager": "11-9013",
  "occupation:farmworker": "45-2092",
  "occupation:fitness-trainer": "39-9031",
  "occupation:food-service-manager": "11-9051",
  "occupation:home-health-aide": "31-1120",
  "occupation:hotel-clerk": "43-4081",
  "occupation:housekeeper": "37-2012",
  "occupation:janitor": "37-2011",
  "occupation:landscaper": "37-3011",
  "occupation:mail-carrier": "43-5052",
  "occupation:medical-assistant": "31-9092",
  "occupation:medical-records": "29-2072",
  "occupation:nursing-assistant": "31-1131",
  "occupation:office-clerk": "43-9061",
  "occupation:office-manager": "43-1011",
  "occupation:postal-clerk": "43-5051",
  "occupation:production-supervisor": "51-1011",
  "occupation:production-worker": "51-2090",
  "occupation:receptionist": "43-4171",
  "occupation:recreation-attendant": "39-3091",
  "occupation:retail-manager": "41-1011",
  "occupation:retail-sales": "41-2031",
  "occupation:sales-representative": "41-4012",
  "occupation:security-guard": "33-9032",
  "occupation:stocker": "53-7065",
  "occupation:teacher-assistant": "25-9045",
  "occupation:truck-driver": "53-3032",
  "occupation:warehouse-worker": "53-7062",
  "profession:accountant": "13-2011",
  "profession:budget-analyst": "13-2031",
  "profession:business-analyst": "13-1111",
  "profession:campaign-manager": "13-1199",
  "profession:clergy": "21-2011",
  "profession:community-organizer": "21-1099",
  "profession:construction-manager": "11-9021",
  "profession:engineer": "17-2051",
  "profession:financial-manager": "11-3031",
  "profession:firefighter": "33-2011",
  "profession:insurance-agent": "41-3021",
  "profession:lawyer": "23-1011",
  "profession:legal-assistant": "23-2011",
  "profession:loan-officer": "13-2072",
  "profession:county-clerk": "43-4031",
  "profession:municipal-clerk": "43-4031",
  "profession:physician": "29-1215",
  "profession:police-officer": "33-3051",
  "profession:political-organizer": "13-1199",
  "profession:practical-nurse": "29-2061",
  "profession:property-manager": "11-9141",
  "profession:real-estate-agent": "41-9022",
  "profession:registered-nurse": "29-1141",
  "profession:school-principal": "11-9032",
  "profession:social-worker": "21-1021",
  "profession:teacher": "25-2021",
  "profession:union-representative": "13-1075",
  "profession:urban-planner": "19-3051",
  "service:barber": "39-5011",
  "service:food-server": "35-3031",
  "service:hairstylist": "39-5012",
  "trade:automotive-mechanic": "49-3023",
  "trade:carpenter": "47-2031",
  "trade:electrician": "47-2111",
  "trade:equipment-operator": "47-2073",
  "trade:line-worker": "49-9051",
  "trade:machinist": "51-4041",
  "trade:maintenance-worker": "49-9071",
  "trade:telecom-technician": "49-2022",
};
