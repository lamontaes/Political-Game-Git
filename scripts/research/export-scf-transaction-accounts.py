"""Read the median money families keep on hand, by income, from the SCF.

Federal Reserve Board, Survey of Consumer Finances 2022, historical tables in
current dollars, read from:

  https://www.federalreserve.gov/econres/files/scf2022_tables_public_nominal_historical.xlsx

Table 1 gives each income group's median before-tax family income. Table 6
("Family holdings of financial assets") gives the share of each group holding
transaction accounts (checking, savings, money market and call accounts) and
the median value held by those that hold them. Both are in thousands of 2022
dollars. It writes data/research/money/scf-transaction-accounts-2022.json,
which a new adult's opening balance reads (src/simulation/starting-money.ts).

Run: python3 scripts/research/export-scf-transaction-accounts.py <workbook.xlsx>
"""

import html
import json
import pathlib
import re
import sys
import zipfile

OUT = pathlib.Path(__file__).resolve().parents[2] / "data/research/money/scf-transaction-accounts-2022.json"
SRC = "https://www.federalreserve.gov/econres/files/scf2022_tables_public_nominal_historical.xlsx"
GROUPS = ["Less than 20", "20–39.9", "40–59.9", "60–79.9", "80–89.9", "90–100"]


def sheet_rows(book, name):
    strings = [
        html.unescape("".join(re.findall(r"<t[^>]*>([^<]*)</t>", s)))
        for s in re.findall(r"<si>(.*?)</si>", book.read("xl/sharedStrings.xml").decode(), re.S)
    ]
    rels = book.read("xl/_rels/workbook.xml.rels").decode()
    targets = {}
    for rel in re.findall(r"<Relationship [^>]*/>", rels):
        targets[re.search(r'Id="([^"]+)"', rel).group(1)] = re.search(r'Target="([^"]+)"', rel).group(1)
    sheets = {
        html.unescape(n): r
        for n, r in re.findall(r'<sheet name="([^"]+)"[^>]*r:id="(rId\d+)"', book.read("xl/workbook.xml").decode())
    }
    path = "xl/" + targets[sheets[name]].lstrip("/").replace("xl/", "")
    for row in re.findall(r"<row[^>]*>(.*?)</row>", book.read(path).decode(), re.S):
        cells = {}
        for attrs, body in re.findall(r"<c ([^>]*?)(?:/>|>(.*?)</c>)", row, re.S):
            value = re.search(r"<v>([^<]*)</v>", body or "")
            if not value:
                continue
            text = value.group(1)
            if 't="s"' in attrs:
                text = strings[int(text)]
            cells[re.search(r'r="([A-Z]+)\d+"', attrs).group(1)] = text
        yield cells


def income_rows(rows):
    """The rows under each "Percentile of income" heading; the net worth
    groups below reuse the same labels."""
    under_income = False
    for cells in rows:
        label = cells.get("A")
        if label == "Percentile of income":
            under_income = True
        elif label in GROUPS:
            if under_income:
                yield cells
        elif label:
            under_income = False


def main(workbook):
    book = zipfile.ZipFile(workbook)
    income = {}
    saved = {}
    for cells in income_rows(sheet_rows(book, "Table 1 01-22")):
        if cells["A"] not in income:
            income[cells["A"]] = float(cells["AD"]) * 1000
            saved[cells["A"]] = float(cells["AF"]) / 100
    holding = {}
    median = {}
    for cells in income_rows(sheet_rows(book, "Table 6 22 %s & medians")):
        label = cells["A"]
        # The first block is the share holding; the second the median held.
        if label not in holding:
            holding[label] = float(cells["B"]) / 100
        elif label not in median:
            median[label] = float(cells["B"]) * 1000
    groups = [
        {
            "incomePercentile": label,
            "medianFamilyIncome": round(income[label]),
            "shareHoldingTransactionAccounts": round(holding[label], 4),
            "medianTransactionAccounts": round(median[label]),
            "shareThatSaved": round(saved[label], 4),
        }
        for label in GROUPS
    ]
    OUT.write_text(
        json.dumps(
            {
                "id": "scf-transaction-accounts-2022",
                "source": "Federal Reserve Board, Survey of Consumer Finances 2022, historical tables (current dollars), Tables 1 and 6",
                "url": SRC,
                "readOn": "2026-09-29",
                "dollars": "2022",
                "unit": "families, not persons; the median value is among families that hold transaction accounts",
                "groups": groups,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n"
    )


if __name__ == "__main__":
    main(sys.argv[1])
