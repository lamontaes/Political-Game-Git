"""The source compiler preserves actual counts and rejects missing partitions."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "county_citizenship", Path(__file__).with_name("compile-county-citizenship.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def table(row):
    header = ["GEO_ID"]
    for index in range(1, 7):
        header += [f"B05001_E{index:03}", f"B05001_M{index:03}"]
    return ("|".join(header) + "\n" + row + "\n").encode()


class CompileCitizenshipTest(unittest.TestCase):
    def test_partition_and_source_values(self):
        rows = module.compile_rows(
            table("0500000US01001|100|-555555555|60|1|10|2|5|3|15|4|10|5"),
            "B05001",
        )
        self.assertEqual(rows["01001"]["citizenByBirth"], 75)
        self.assertEqual(rows["01001"]["naturalizedCitizen"], 15)
        self.assertEqual(rows["01001"]["noncitizen"], 10)
        self.assertEqual(rows["01001"]["marginsOfError"][0], -555555555)

    def test_missing_is_not_zero(self):
        with self.assertRaisesRegex(ValueError, "Missing"):
            module.compile_rows(
                table("0500000US01001|100|0|60|1|10|2|5|3|15|4|-666666666|5"),
                "B05001",
            )

    def test_bad_partition(self):
        with self.assertRaisesRegex(ValueError, "inconsistent"):
            module.compile_rows(
                table("0500000US01001|99|0|60|1|10|2|5|3|15|4|10|5"),
                "B05001",
            )

    def test_duplicate_county(self):
        line = "0500000US01001|100|0|60|1|10|2|5|3|15|4|10|5"
        with self.assertRaisesRegex(ValueError, "duplicated"):
            module.compile_rows(table(line + "\n" + line), "B05001")


if __name__ == "__main__":
    unittest.main()
