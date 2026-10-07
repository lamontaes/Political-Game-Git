# Mines Congressional Record day folders (unzipped CREC-YYYY-MM-DD.zip, House and Senate
# pages only) for sourced English parts. Usage: python3 -I mine-congressional-record.py <dir> [move]
# Day zips: https://www.govinfo.gov/content/pkg/CREC-YYYY-MM-DD.zip (public domain).
import re,glob,html,sys,json,collections
SPK=re.compile(r"^(?:Mr|Ms|Mrs)\. [A-Z][A-Z'-]+(?: of [A-Z][a-z]+(?: [A-Z][a-z]+)?)?\. (.+)$")
ADDR=re.compile(r"^(Madam|Mr\.) (Speaker|President|Chair|Chairman|Chairwoman), ")
def paras(t):
  t=re.sub(r'<[^>]+>','',html.unescape(t)); out=[]; cur=None
  for line in t.split('\n'):
    if re.match(r'^  \S',line):
      if cur: out.append(cur)
      cur=line.strip()
    elif line.strip() and cur is not None: cur+=' '+line.strip()
    else:
      if cur: out.append(cur); cur=None
  if cur: out.append(cur)
  return out
def first_sentence(s):
  m=re.search(r'(?<![A-Z][a-z])(?<!Mr)(?<!Ms)(?<!Mrs)(?<!Dr)[.?!](?=\s|$)',s)
  return s[:m.end()] if m else s
res=collections.OrderedDict()
for f in sorted(glob.glob(sys.argv[1]+'/**/*.htm',recursive=True)):
  gran=f.split('/')[-1][:-4]
  for p in paras(open(f,errors='ignore').read()):
    m=SPK.match(p)
    if not m: continue
    body=m.group(1); a=ADDR.match(body)
    if not a: continue
    rest=first_sentence(body[a.end():])
    words=rest.split()
    if len(words)>16 or len(words)<4: continue
    if re.search(r'\d|\(|"|;',rest): continue
    # drop proper nouns after first word
    if any(w[0].isupper() and w not in ('I',"I'm") for w in words[1:]): continue
    key=rest.lower()
    if key in res: continue
    res[key]={"text":"{chair}, "+rest,"source":{"document":"Congressional Record","granule":gran,"url":"https://www.govinfo.gov/app/details/"+gran.split('-Pg')[0][:15]+"/"+gran}}
OBJ=r"(?:this|the)(?: \w+)? (?:bill|resolution|legislation|amendment|motion|rule|nomination|measure|conference report)"
OPENERS=[r"I rise(?: today)? in(?: strong)? (?:support|opposition) (?:of|to) "+OBJ+r"\.",
 r"I rise(?: today)? (?:with a heavy heart|with a profound sense of loss)\.",
 r"I rise(?: today)? to (?:speak briefly|ask a point of parliamentary inquiry|be recognized)\.?(?: in gratitude today\.)?",
 r"I rise(?: today)? to (?:honor|recognize|celebrate|remember) (?:the life|a|an|my|our) [^.]{0,40}\.",
 r"I am here today because I (?:oppose|support) "+OBJ+r"\.",
 r"I thank (?:the|my) (?:gentleman|gentlemen|gentlewoman|chairman|chairwoman|chair|ranking member|vice chair of the committee|colleague|majority leader|minority leader)(?: from \w+)? for (?:yielding|the time|this time|yielding the time|yielding time|yielding me time)(?: to me)?(?: and for (?:his|her|your) (?:leadership|strong support))?\."]
MOVES={'opener':OPENERS,
 'closer':[r"I yield back(?: the balance of my time| all remaining time| all debate time)?\.",
  r"I yield the (?:floor|remainder of my time)\.",
  r"I yield myself the balance of my time(?: to close| for closing)?\.",
  r"I (?:am|reserve the balance of my time, and I am|reserve the balance of my time and am) prepared to close(?:, and I reserve the balance of my time| and continue to reserve the balance of my time)?\.",
  r"I have no (?:further|more|additional) (?:speakers|requests for time)(?:, and I (?:am ready|am prepared) to close|, and I reserve the balance of my time)?\.",
  r"I urge (?:my colleagues to (?:support|oppose) "+OBJ+r"|support for this (?:legislation|policy|bill)(?:, and I yield back the balance of my time)?)\.",
  r"I support this legislation, and I urge my colleagues to do so, as well\.",
  r"I hope my colleagues will join me in voting for the motion to recommit\.",
  r"I will be brief\.|I am going to be uncharacteristically brief\."],
 'procedural':[r"I yield myself such time as I may consume\.",r"I reserve the balance of my time\.",
  r"I ask (?:unanimous )?consent (?:that the (?:order for the quorum call be rescinded|previously scheduled (?:vote occur|recess begin) immediately|rollcall vote (?:begin|commence) immediately|reading of the names be waived)|to (?:use a prop(?: during my remarks)?|begin the next vote|resume legislative session))\.",
  r"I ask that the reading be dispensed with\.",r"I ask that we commence with the previously scheduled vote\.",
  r"I ask for the yeas and nays(?: on the amendment)?\.",r"on that I demand the yeas and nays\.",r"I demand a recorded vote\.",
  r"may I inquire (?:as to |about )?(?:how much time (?:I have remaining|is remaining|remains)|the time remaining|how much debate time remains)\.",
  r"how much time is remaining\?",r"may I ask for a clarification\?",r"a point of order\.",r"I have a parliamentary inquiry\.",
  r"I rise to ask a point of parliamentary inquiry\.",r"reserving the right to object\.",r"I reserve the right to object\.",
  r"I have (?:a|an|a second-degree) (?:motion|amendment|motion to recommit) at the desk\.",r"I send a cloture motion to the desk\.",
  r"I move to proceed to (?:legislative|executive) session\.",r"I withdraw my motion to proceed\.",r"I know of no further debate(?: on (?:the|this) (?:nomination|resolution|bill))?\.",
  r"I offer a privileged resolution and ask for its immediate consideration\.",r"I move to take the words down\.",
  r"I (?:was unavoidably (?:absent and unable to vote|detained)|was necessarily absent from votes today|was otherwise detained off the floor|missed a (?:vote today|series of votes)|could not make today's vote|was unable to be present for this vote|was absent from the chamber today)\."]}
mv=sys.argv[2] if len(sys.argv)>2 else None
for v in res.values():
  body=v['text'][len('{chair}, '):]
  if mv:
    if not any(re.fullmatch(r,body,re.I) for r in MOVES[mv]): continue
    v['move']=mv
  print(json.dumps(v))
