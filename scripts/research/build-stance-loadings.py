#!/usr/bin/env python3
"""Opening-stance loadings from the Cooperative Election Study 2020 Common Content.

For each game policy question that has a survey item, fit a weighted logit of
supporting the item on three things a person carries into the game: where they
stand on the party-lean scale (pid7), how often and how much their faith matters
(church attendance and importance of religion), and whether they hold a
four-year degree. The loading is the average change in the stance (2 * P(support)
- 1, the game's -1 to 1 scale) for a move across the whole predictor, holding the
others, with a 95 percent interval. A question without a survey item carries no
loading and is left out (the engine starts it from the lean axis alone).

Usage: build-stance-loadings.py <CES20_Common_OUTPUT_vv.csv> <out.json>
Source: Schaffner, Ansolabehere and Luks, CES 2020 Common Content, Harvard
Dataverse, https://doi.org/10.7910/DVN/E9N6PH (weight: commonweight).
"""
import json
import sys

import numpy as np
import pandas as pd

# game question -> (CES item, support code, how the item matches the question)
ITEMS = {
    "civil-family-community.restrict-abortion": ("CC20_332c", "Prohibit all abortions after the 20th week", "direct"),
    "labor-workforce.raise-minimum-wage": ("CC20_350b", "Raise the minimum wage to $15 an hour", "direct"),
    "justice-public-safety.partner-with-federal-immigration-enforcement": ("CC20_331c", "Withhold federal funds from local police that do not report illegal immigrants", "close"),
    "civil-family-community.ban-discrimination-in-housing-and-work": ("CC20_350a", "Prohibit discrimination on gender identity and sexual orientation (federal)", "proxy"),
    "environment-energy.clean-electricity-standard": ("CC20_333b", "Each state must use a minimum amount of renewable fuels in electricity", "close"),
    "environment-energy.price-carbon": ("CC20_333a", "Give the EPA power to regulate carbon dioxide emissions", "proxy"),
    "environment-energy.clean-air-plan-for-polluted-counties": ("CC20_333c", "Strengthen EPA enforcement of the Clean Air Act and Clean Water Act", "close"),
    "justice-public-safety.civilian-oversight-of-police": ("CC20_334f", "Create a national registry of police investigated for misconduct", "proxy"),
}
PREDICTORS = ["lean", "faith", "college"]


def logit(X, y, w, iters=50):
    X1 = np.column_stack([np.ones(len(X)), X])
    beta = np.zeros(X1.shape[1])
    for _ in range(iters):
        p = 1 / (1 + np.exp(-X1 @ beta))
        W = w * p * (1 - p)
        H = X1.T @ (X1 * W[:, None])
        g = X1.T @ (w * (y - p))
        step = np.linalg.solve(H, g)
        beta += step
        if np.abs(step).max() < 1e-9:
            break
    p = 1 / (1 + np.exp(-X1 @ beta))
    W = w * p * (1 - p)
    # Weights are scaled to mean 1, so this is the model-based covariance.
    cov = np.linalg.inv(X1.T @ (X1 * W[:, None]))
    return beta, cov, p


def main(src, out):
    cols = ["pid7", "pew_churatd", "pew_religimp", "educ", "commonweight"] + [v[0] for v in ITEMS.values()]
    df = pd.read_csv(src, usecols=cols)
    df = df.dropna(subset=["pid7", "pew_churatd", "pew_religimp", "educ", "commonweight"])
    df = df[(df.pid7 <= 7) & (df.pew_churatd <= 6) & (df.pew_religimp <= 4)].copy()
    df["lean"] = (df.pid7 - 4) / 3  # -1 strong Democrat .. +1 strong Republican
    df["faith"] = ((6 - df.pew_churatd) / 5 + (4 - df.pew_religimp) / 3) / 2  # 0 never and unimportant .. 1 weekly and very important
    df["college"] = (df.educ >= 5).astype(float)
    result = {}
    for question, (item, text, match) in ITEMS.items():
        d = df[df[item].isin([1, 2])]
        y = (d[item] == 1).astype(float).to_numpy()
        w = (d.commonweight / d.commonweight.mean()).to_numpy()
        X = d[PREDICTORS].to_numpy()
        beta, cov, p = logit(X, y, w)
        # Kish design effect of the weights widens the model-based interval.
        deff = float(len(w) * (w**2).sum() / w.sum() ** 2)
        row = {"item": item, "itemText": text, "match": match, "n": int(len(d)), "designEffect": round(deff, 3), "loadings": {}}
        for i, name in enumerate(PREDICTORS, start=1):
            ame = float(np.average(2 * p * (1 - p) * beta[i], weights=w))
            se = float(abs(ame) * np.sqrt(cov[i, i] * deff) / abs(beta[i])) if beta[i] else 0.0
            row["loadings"][name] = {
                "value": round(ame, 4),
                "low": round(ame - 1.96 * se, 4),
                "high": round(ame + 1.96 * se, 4),
            }
        result[question] = row
    doc = {
        "id": "opening-stance-loadings",
        "about": "How a person's lean, faith and four-year degree move their stance on a policy question, from the Cooperative Election Study 2020. Each loading is the average change in the stance (2 * P(support) - 1, the game's -1 to 1 scale) for a move across the whole predictor, holding the other two; lean runs from strong Democrat (-1) to strong Republican (+1), faith from never attending and unimportant (0) to weekly and very important (1), college is a four-year degree or more. Intervals are 95 percent from the weighted logit's covariance widened by the Kish design effect of the weights, with the standard error of the marginal effect scaled from the coefficient's (a delta-method shortcut). Questions with no survey item have no row: the engine starts them from the lean axis alone (ESTIMATED, zero loading). The CES has no personality measure, so there is no trait loading.",
        "source": {
            "title": "Cooperative Election Study 2020, Common Content",
            "authors": "Schaffner, Ansolabehere, Luks",
            "publisher": "Harvard Dataverse",
            "url": "https://doi.org/10.7910/DVN/E9N6PH",
            "year": 2021,
            "weight": "commonweight",
            "respondents": int(len(df)),
        },
        "script": "scripts/research/build-stance-loadings.py",
        "questions": result,
    }
    with open(out, "w") as f:
        json.dump(doc, f, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
