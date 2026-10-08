# Builds data/english/parts/debt-notice.json from two federal model forms (public
# domain), copied word for word; only the particulars (names, dates, amounts) become
# slots. Usage: python3 -I build-debt-notice.py > data/english/parts/debt-notice.json
# The forms are images, so their lines are typed here exactly as printed:
#   Regulation F Model Form B-1: https://files.consumerfinance.gov/f/images/cfpb_regulations_1006-B-1.original.png
#   Regulation Z Form H-30(B): https://files.consumerfinance.gov/eregulations/ER14FE13.009-1.png
import json, re, sys
B1 = {"document": "Regulation F Model Form B-1, Model Form for Validation Notice (12 CFR part 1006, appendix B)", "date": "2020-11-30", "url": "https://files.consumerfinance.gov/f/images/cfpb_regulations_1006-B-1.original.png"}
H30 = {"document": "Regulation Z Form H-30(B), Sample Form of Periodic Statement with Delinquency Box, in 12 CFR part 1026, appendix H, as in force on January 1, 2025", "date": "2025-01-01", "url": "https://www.govinfo.gov/app/details/CFR-2025-title12-vol9/CFR-2025-title12-vol9-part1026-appH"}
ROWS = [
  ("collector", "{collector} is a debt collector.", B1),
  ("collector", "We are trying to collect a debt that you owe to {creditor}.", B1),
  ("collector", "We will use any information you give us to help collect the debt.", B1),
  ("heading", "Our information shows:", B1),
  ("heading", "How can you dispute the debt?", B1),
  ("heading", "What else can you do?", B1),
  ("heading", "How do you want to respond?", B1),
  ("debt", "You had a {product} from {creditor} with account number {account}.", B1),
  ("debt", "As of {date}, you owed: {amount}", B1),
  ("debt", "Between {date} and today:", B1),
  ("itemization", "You were charged this amount in interest: {amount}", B1),
  ("itemization", "You were charged this amount in fees: {amount}", B1),
  ("itemization", "You paid or were credited this amount toward the debt: {amount}", B1),
  ("itemization", "Total amount of the debt now: {amount}", B1),
  ("dispute", "Call or write to us by {deadline}, to dispute all or part of the debt.", B1),
  ("dispute", "If you do not, we will assume that our information is correct.", B1),
  ("dispute", "If you write to us by {deadline}, we must stop collection on any amount you dispute until we send you information that shows you owe the debt.", B1),
  ("dispute", "You may use the form below or write to us without the form.", B1),
  ("dispute", "You may also include supporting documents.", B1),
  ("rights", "Write to ask for the name and address of the original creditor, if different from the current creditor.", B1),
  ("rights", "If you write by {deadline}, we must stop collection until we send you that information.", B1),
  ("rights", "Contact us about your payment options.", B1),
  ("response", "Check all that apply:", B1),
  ("response", "I want to dispute the debt because I think:", B1),
  ("response", "This is not my debt.", B1),
  ("response", "The amount is wrong.", B1),
  ("response", "I want you to send me the name and address of the original creditor.", B1),
  ("response", "I enclosed this amount: {amount}", B1),
  ("response", "Make your check payable to {collector}.", B1),
  ("delinquency", "You are late on your {loan} payments.", H30),
  ("delinquency", "As of {date}, you are {days} days delinquent on your {loan} loan.", H30),
  ("delinquency", "Total: {amount} due. You must pay this amount to bring your loan current.", H30),
  ("foreclosure-warning", "Failure to bring your loan current may result in fees and foreclosure—the loss of your home.", H30),
  ("payment-history", "Payment due {date}: Fully paid on time", H30),
  ("payment-history", "Payment due {date}: Fully paid on {paidDate}", H30),
  ("payment-history", "Payment due {date}: Unpaid balance of {amount}", H30),
  ("late-fee", "If payment is received after {date}, {amount} late fee will be charged.", H30),
  ("late-fee", "Late Fee (charged because full payment not received by {date})", H30),
  ("label", "Payment Due Date", H30),
  ("label", "Amount Due", H30),
  ("label", "Overdue Payment", H30),
  ("label", "Total Fees and Charges", H30),
  ("label", "Total Amount Due", H30),
  ("label", "Regular Monthly Payment", H30),
  ("label", "Outstanding Principal", H30),
  ("label", "Interest Rate", H30),
  ("label", "Partial Payment Received", H30),
  ("label", "Recent Account History", H30),
]
def slug(text):
    words = re.sub(r"\{(\w+)\}", lambda m: m.group(1), text).lower()
    words = re.sub(r"[^a-z]+", "-", words).strip("-")
    return "-".join(words.split("-")[:8])
parts = []
for move, text, src in ROWS:
    parts.append({"key": f"debt-notice.{move}.{slug(text)}", "move": move, "kind": "written", "text": text, "shippable": True, "source": src})
bank = {
  "schema": "english-parts/1",
  "register": "debt-notice",
  "description": "What a debt collector's validation notice and a lender's late-payment statement say, copied word for word from two federal model forms (public domain): Regulation F Model Form B-1, which most collection letters follow, and Regulation Z Form H-30(B), the sample mortgage statement with its delinquency box. Only names, dates and amounts are slots, filled from a loan's records. The foreclosure warning is its own move, said only of a loan secured by a home.",
  "slots": {
    "collector": "The name of the debt collector recorded as collecting the debt.",
    "creditor": "The name of the lender the debt is owed to, from the loan's records.",
    "product": "What the loan was for, such as a car loan, from the loan's records.",
    "account": "The loan's account number, when the records hold one.",
    "date": "A date from the loan's records, spoken in full, such as January 2, 2027.",
    "paidDate": "The date a payment was made, from the loan's records.",
    "deadline": "The last day to dispute the debt, from the notice's records.",
    "amount": "A dollar amount from the loan's records, such as $2,234.56.",
    "days": "How many days the payment is late, from the loan's records.",
    "loan": "The kind of loan as one word before 'loan' or 'payments', such as mortgage or car."
  },
  "maxWords": 30,
  "mining": {
    "tool": "scripts/english-mining/build-debt-notice.py",
    "read": "Regulation F Model Form B-1 (12 CFR part 1006, appendix B) and Regulation Z Form H-30(B) (12 CFR part 1026, appendix H), as published by the Consumer Financial Protection Bureau. Both apply in every state, the District of Columbia and the territories. Spanish-language lines and web addresses on the forms are left out.",
    "sources": [B1, H30, {"document": "Regulation Z Form H-30(B) image, as shown on the Bureau's current Regulation Z page", "date": "2025-01-01", "url": "https://files.consumerfinance.gov/eregulations/ER14FE13.009-1.png"}]
  },
  "parts": parts,
}
json.dump(bank, sys.stdout, indent=2, ensure_ascii=False)
print()
