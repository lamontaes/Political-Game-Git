# Source-Grounded National Crisis / External Event Routing Foundation

This system provides a standardized, source-grounded routing foundation for authoritative external events and national crises in Political Game.

It is **NOT** a random-event generator or card storyteller.

## Core Directives & Principles

1. **Empirical Grounding**: Events and physical hazards must be backed by authoritative federal/state provider datasets.
2. **Zero Inverted Probabilities**: Probability distributions and occurrence rates are never invented or guessed. If an annual occurrence rate can be defensibly derived from empirical data (e.g., 30-year NCEI historical record), the exact derivation formula and sample parameters are documented. Otherwise, calibration is explicitly marked `unresolved`.
3. **No Direct Disaster Scripting**: Single historical disaster observations (e.g., Hurricane Katrina or 1994 Northridge Earthquake) are preserved as empirical historical source records (`empirical_observation`). They are never converted into direct scripted future game events. Simulation-generated events (`simulation_sample`) are sampled from empirical distribution constraints.
4. **Separation from UI**: This foundation operates purely within the simulation and event-routing abstraction. It does not touch player UI or generate narrative prose.

## Supported Event Families & Authoritative Sources

| Event Family                 | Primary Authoritative Provider      | Granularity                 | Seasonal Constraints                     | Calibration Status             |
| :--------------------------- | :---------------------------------- | :-------------------------- | :--------------------------------------- | :----------------------------- |
| **Tropical Hurricane**       | NOAA / NCEI Storm Events            | County FIPS, State, Lat/Lon | Jun – Nov (Peak: Aug–Oct)                | Calibrated (30-yr NCEI)        |
| **Tornado & Severe Weather** | NOAA / NCEI Storm Events            | County FIPS, State          | Year-Round (Peak: Apr–Jun)               | Calibrated (75-yr NCEI/SPC)    |
| **Flooding (Flash & River)** | NOAA / NCEI Storm Events            | County FIPS, State          | Year-Round (Peak: Mar–Jun)               | Calibrated (30-yr NCEI)        |
| **Winter Storm & Ice**       | NOAA / NCEI Storm Events            | County FIPS, State          | Oct – Apr (Peak: Dec–Feb)                | Calibrated (30-yr NCEI)        |
| **Extreme Heat & Cold**      | NOAA / NCEI Storm Events            | County FIPS, State          | Year-Round (Peak: Jun–Aug / Dec–Feb)     | Calibrated (30-yr NCEI)        |
| **Drought**                  | NOAA / NCEI Storm Events            | County FIPS, State          | Year-Round                               | Calibrated (30-yr NCEI)        |
| **Wildfire**                 | NIFC Wildfire Data / MTBS           | Lat/Lon Box, County         | May – Nov (Peak: Jul–Sep)                | Calibrated (30-yr NIFC)        |
| **Earthquake**               | USGS Earthquake Hazards (ANSS)      | Point Radius, Lat/Lon Box   | Year-Round                               | Calibrated (50-yr ANSS M>=5.0) |
| **Major Power Disturbance**  | DOE Form OE-417 Electric Emergency  | NERC Region, State          | Year-Round (Peak: Summer/Winter Extreme) | Calibrated (25-yr DOE OE-417)  |
| **Public-Health Emergency**  | CDC / HHS Public Health Emergencies | State, National             | Year-Round (Peak: Winter Respiratory)    | **UNRESOLVED**                 |

## Calibration Derivations & Research Status

### Calibrated Sources

- **NOAA Hurricane/Storm/Flood/Winter/Heat-Cold**: Derived from NCEI 30-year normalized event counts across affected US county denominators (`count(events) / years / county_count`).
- **Tornado & Severe Convective**: Derived from SPC/NCEI 75-year record of EF1+ tornadoes per 10,000 sq miles.
- **USGS Earthquakes**: Derived from ANSS 50-year catalog of M >= 5.0 earthquakes across West Coast and regional seismic belts.
- **DOE-417 Power Disturbances**: Derived from 25-year DOE filings for major grid outages affecting >50,000 customers.
- **NIFC Wildfires**: Derived from 30-year interagency perimeter records of fires >1,000 acres in Western wildland-urban interface areas.

### Unresolved Research Areas

- **CDC / HHS Public Health Emergencies**: Novel pandemic pathogen emergence and epidemic spread dynamics have extremely low historical frequency and non-stationary transmission characteristics. Assigning an arbitrary annual occurrence percentage would violate project rules. Calibration status is explicitly `unresolved`.

## Geographic Eligibility Resolution

The `ExternalEventRouter` provides deterministic spatial and temporal eligibility checking:

- Checks State FIPS / Abbr eligibility (e.g., tropical hurricanes constrained to coastal/inland track states).
- Checks FIPS prefix matching for county-level precision.
- Checks seasonal applicability (e.g., winter storms inactive in summer months).
- Rejects ungrounded or out-of-season event sampling requests cleanly without throwing unexpected runtime errors.
