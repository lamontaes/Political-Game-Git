"""Turn raw agency downloads into the monthly and quarterly preparation files.

Inputs are the agency files themselves (BLS flat files, the Fed H.15 package,
BEA's NIPA quarterly flat file, FHFA MIRS table 26). Raw files are not kept in
the repository (NIPA alone is 35 MB); their SHA-256 and URLs are recorded.
"""
import hashlib
import json
import pathlib
import re
import sys

RAW = pathlib.Path(sys.argv[1])
OUT = pathlib.Path(sys.argv[2])
FIRST = "1990-01"

SOURCES = {
    "unrate.tsv": "https://download.bls.gov/pub/time.series/ln/ln.data.1.AllData (LNS14000000)",
    "cpi.tsv": "https://download.bls.gov/pub/time.series/cu/cu.data.1.AllItems (CUSR0000SA0)",
    "ces.tsv": "https://download.bls.gov/pub/time.series/ce/ce.data.00a.TotalNonfarm.Employment (CES0000000001)",
    "ahe.tsv": "https://download.bls.gov/pub/time.series/ce/ce.data.05b.TotalPrivate.AllEmployeeHoursAndEarnings (CES0500000003)",
    "H15_data.xml": "https://www.federalreserve.gov/datadownload/Output.aspx?rel=H15&filetype=zip (RIFSPFF_N.M, RIFLGFCY10_N.M)",
    "nipaq.txt": "https://apps.bea.gov/national/Release/TXT/NipaDataQ.txt (A191RX, real GDP, chained 2017 dollars)",
    "mirs30.json": "https://www.fhfa.gov/sites/default/files/Table26-2019-by-Month.xls (30-year rows; This product uses FHFA data but is neither endorsed nor certified by FHFA.)",
}


def bls(name):
    out = {}
    for line in (RAW / name).read_text().splitlines():
        parts = [p.strip() for p in line.split("\t")]
        if re.fullmatch(r"M(0[1-9]|1[0-2])", parts[2]) and parts[3] != "-":
            out[f"{parts[1]}-{parts[2][1:]}"] = float(parts[3])
    return out


def h15(series):
    text = (RAW / "H15_data.xml").read_text()
    start = text.find(f'SERIES_NAME="{series}"')
    segment = text[start:text.find("</kf:Series>", start)]
    return {period[:7]: float(value)
            for value, period in re.findall(r'OBS_VALUE="([^"]*)"\s+TIME_PERIOD="([^"]*)"', segment)
            if re.fullmatch(r"-?\d+(\.\d+)?", value)}


fields = {
    "unemploymentPct": bls("unrate.tsv"),
    "priceIndex": bls("cpi.tsv"),
    "payrollJobsThousands": bls("ces.tsv"),
    "hourlyEarnings": bls("ahe.tsv"),
    "policyRatePct": h15("RIFSPFF_N.M"),
    "treasury10Pct": h15("RIFLGFCY10_N.M"),
    "mortgage30Pct": {r["month"]: r["contractRatePct"]
                      for r in json.loads((RAW / "mirs30.json").read_text())},
}
months = sorted({m for series in fields.values() for m in series if m >= "1989-01"})
monthly = []
for month in months:
    row = {"month": month}
    row.update({k: v[month] for k, v in fields.items() if month in v})
    monthly.append(row)

quarterly = []
for line in (RAW / "nipaq.txt").read_text().splitlines():
    if line.startswith("A191RX,"):
        _, period, value = line.split(",", 2)
        if period >= "1989Q1":
            quarterly.append({"quarter": period[:4] + "-" + period[4:],
                              "realOutput": float(value.strip('"').replace(",", ""))})

receipts = [{"file": name, "source": url,
             "sha256": hashlib.sha256((RAW / name).read_bytes()).hexdigest()}
            for name, url in SOURCES.items()]
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "monthly.json").write_text(json.dumps(monthly, indent=0, separators=(",", ":")) + "\n")
(OUT / "quarterly.json").write_text(json.dumps(quarterly, indent=0, separators=(",", ":")) + "\n")
(OUT / "receipts.json").write_text(json.dumps({"retrieved": "2026-10-12", "files": receipts}, indent=2) + "\n")
print(len(monthly), monthly[0], monthly[-1], len(quarterly), quarterly[-1])
