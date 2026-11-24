# Words batch 22: the hand-written lines waiting for grades

141 lines in 90 moves across 7 banks. Each was written by hand for the English engine and is held out of play until you grade it. A grade carries to every scene that uses the line's move.

Grade each line good, bad or fix by its number. Curly braces mark what the game fills in from the records, with where each comes from underneath.

## bring it up (4)

### deliver news, news received (`change-news.read-read`)

- **0** · **I read in {subject} about {topic}.**
  - {subject}: The place or business that changed, from the event record.
  - {topic}: What the story was about: the catalog's name for the policy topic of the story, from the printed story record.
- **1** · **I saw {subject} ran a story on {topic}.**
  - {subject}: The place or business that changed, from the event record.
  - {topic}: What the story was about: the catalog's name for the policy topic of the story, from the printed story record.
- **2** · **{subject} had a story about {topic}.**
  - {subject}: The place or business that changed, from the event record.
  - {topic}: What the story was about: the catalog's name for the policy topic of the story, from the printed story record.
- **3** · **There was something in {subject} about {topic}.**
  - {subject}: The place or business that changed, from the event record.
  - {topic}: What the story was about: the catalog's name for the policy topic of the story, from the printed story record.

## conversation (2)

### answer (`school-answer-at`)

- **4** · **I went to school at {school}.**
  - {school}: A school, from the school record.
- **5** · **I'm a student at {school}.**
  - {school}: A school, from the school record.

## journal (28)

### tell (`election-other-result`)

- **6** · **{name} lost the race for {office}.**
  - {name}: A person, by name, from the records.
  - {office}: An office, from the candidate filing record.
- **7** · **{name} was elected to {office}.**
  - {name}: A person, by name, from the records.
  - {office}: An office, from the candidate filing record.
- **8** · **{name} won the race for {office}.**
  - {name}: A person, by name, from the records.
  - {office}: An office, from the candidate filing record.
- **9** · **{other} got elected to {office}.**
  - {other}: A person, by name, from the records.
  - {office}: An office, from the candidate filing record.
- **10** · **{other} lost the race for {office}.**
  - {other}: A person, by name, from the records.
  - {office}: An office, from the candidate filing record.
- **11** · **{other} was elected to {office}.**
  - {other}: A person, by name, from the records.
  - {office}: An office, from the candidate filing record.
- **12** · **{other} won the race for {office}.**
  - {other}: A person, by name, from the records.
  - {office}: An office, from the candidate filing record.

### tell (`home-line-met`)

- **13** · **I first met {other} in {place}.**
  - {other}: A person, by name, from the records.
  - {place}: A town, from the household or move record.
- **14** · **I met {other} in {place}.**
  - {other}: A person, by name, from the records.
  - {place}: A town, from the household or move record.
- **15** · **{other} and I met in {place}.**
  - {other}: A person, by name, from the records.
  - {place}: A town, from the household or move record.

### tell (`home-line-roots`)

- **16** · **My family came from {place}.**
  - {place}: A town, from the household or move record.
- **17** · **My people came from {place}.**
  - {place}: A town, from the household or move record.
- **18** · **Our family came from {place}.**
  - {place}: A town, from the household or move record.

### recall (`memoir-hook`)

- **19** · **Little did I know what {other} would do next.**
  - {other}: A person, by name, from the records.

### recall (`memoir-revise`)

- **20** · **I did not know then what {name} would mean to me.**
  - {name}: A person, by name, from the records.
- **21** · **I thought little of {name} then.**
  - {name}: A person, by name, from the records.
- **22** · **It began with {name}, though I did not see it then.**
  - {name}: A person, by name, from the records.
- **23** · **{name} mattered more than I knew.**
  - {name}: A person, by name, from the records.

### tell (`moved-other-away`)

- **24** · **{relation} moved away.**
  - {relation}: How the writer is related to someone, with the possessive, from the family record.

### tell (`office-line-interview`)

- **25** · **I gave an interview.**
- **26** · **I sat down with a reporter.**

### tell (`office-line-took-office`)

- **27** · **I took my seat as {office}.**
  - {office}: An office, from the candidate filing record.
- **28** · **I took office as {office}.**
  - {office}: An office, from the candidate filing record.

### tell (`office-line-town-hall`)

- **29** · **I held a town hall.**
- **30** · **I hosted a town hall.**

### tell (`work-line-parent-job`)

- **31** · **{other} got a new job.**
  - {other}: A person, by name, from the records.
- **32** · **{other} started a new job.**
  - {other}: A person, by name, from the records.
- **33** · **{other} went to work somewhere new.**
  - {other}: A person, by name, from the records.

## news (2)

### deliver news, news received (`law-took-effect`)

- **34** · **{measure} became law on {date}.**
  - {measure}: The measure, as its record names it.
  - {date}: A date from the event record, as people say it.
  - Said only when the record holds: enacted
- **35** · **{measure} took effect on {date}.**
  - {measure}: The measure, as its record names it.
  - {date}: A date from the event record, as people say it.
  - Said only when the record holds: effective

## newspaper ledes (6)

### deliver news, news received (`action-next-step`)

- **36** · **{actor} took up {record}, and the next step is {result}.**
  - {actor}: The public body or official named in the current record.
  - {record}: The ordinance, resolution, application, hearing, or other record item.
  - {result}: The recorded outcome or next step.

### deliver news, news received (`decision-impact`)

- **37** · **{actor} {action} {record}, a decision that affects {affected}.**
  - {actor}: The public body or official named in the current record.
  - {action}: The recorded action, stated in plain English.
  - {record}: The ordinance, resolution, application, hearing, or other record item.
  - {affected}: The residents, workers, or services affected, as recorded.

### deliver news, news received (`denial-consequence`)

- **38** · **{actor} rejected {record}, blocking a change to {issue}.**
  - {actor}: The public body or official named in the current record.
  - {record}: The ordinance, resolution, application, hearing, or other record item.
  - {issue}: The local issue the recorded action addresses.

### deliver news, news received (`grant-benefit`)

- **39** · **{actor} granted {record}, allowing {affected} to {result}.**
  - {actor}: The public body or official named in the current record.
  - {record}: The ordinance, resolution, application, hearing, or other record item.
  - {affected}: The residents, workers, or services affected, as recorded.
  - {result}: The recorded outcome or next step.

### deliver news, news received (`public-service-impact`)

- **40** · **{actor} granted {record} to {affected} and began reviewing {issue}.**
  - {actor}: The public body or official named in the current record.
  - {record}: The ordinance, resolution, application, hearing, or other record item.
  - {affected}: The residents, workers, or services affected, as recorded.
  - {issue}: The local issue the recorded action addresses.

### deliver news, news received (`vote-purpose`)

- **41** · **{actor} approved {record} to address {issue} in {place}.**
  - {actor}: The public body or official named in the current record.
  - {record}: The ordinance, resolution, application, hearing, or other record item.
  - {issue}: The local issue the recorded action addresses.
  - {place}: The jurisdiction or location named in the record.

## scene words (78)

### deliver news (`cause-acquitted-other`)

- **42** · **{other} has been acquitted.**
  - {other}: A person, by name, from the tie record.

### deliver news (`cause-acquitted-self`)

- **43** · **You have been acquitted.**

### deliver news (`cause-birth-other`)

- **44** · **{other} has been born.**
  - {other}: A person, by name, from the tie record.
- **45** · **{other} was born.**
  - {other}: A person, by name, from the tie record.

### deliver news (`cause-birth-self`)

- **46** · **You have a new baby.**
- **47** · **Your baby has been born.**

### deliver news (`cause-charged-other`)

- **48** · **{other} has been charged with a crime.**
  - {other}: A person, by name, from the tie record.

### deliver news (`cause-charged-self`)

- **49** · **You have been charged with a crime.**

### deliver news (`cause-convicted-other`)

- **50** · **{other} has been convicted.**
  - {other}: A person, by name, from the tie record.

### deliver news (`cause-convicted-self`)

- **51** · **You have been convicted.**

### deliver news (`cause-death-other`)

- **52** · **{other} has died.**
  - {other}: A person, by name, from the tie record.
- **53** · **{other} passed away.**
  - {other}: A person, by name, from the tie record.

### deliver news (`cause-eviction-self`)

- **54** · **Your household has to leave its home.**
- **55** · **Your household is being evicted.**

### deliver news (`cause-illness-other`)

- **56** · **{other} has fallen seriously ill.**
  - {other}: A person, by name, from the tie record.
- **57** · **{other} is seriously ill.**
  - {other}: A person, by name, from the tie record.

### deliver news (`cause-imprisoned-other`)

- **58** · **{other} has been sent to prison.**
  - {other}: A person, by name, from the tie record.

### deliver news (`cause-imprisoned-self`)

- **59** · **You have been sent to prison.**

### deliver news (`cause-job-ended-self`)

- **60** · **You lost your job at {employer}.**
  - {employer}: An employer, from the setting's record.
- **61** · **Your job at {employer} has ended.**
  - {employer}: An employer, from the setting's record.

### deliver news (`cause-job-started-self`)

- **62** · **You begin work at {employer}.**
  - {employer}: An employer, from the setting's record.
- **63** · **You start a new job at {employer}.**
  - {employer}: An employer, from the setting's record.

### deliver news (`cause-shared-other`)

- **64** · **You and {other} are on the same side of an issue.**
  - {other}: A person, by name, from the tie record.

### narrate (`frame-day`)

- **65** · **It is a {weekday} in {month}.**
  - {weekday}: The day of the week, from the moment's date.
  - {month}: The month, from the moment's date.
- **66** · **It's a {weekday} in {month}.**
  - {weekday}: The day of the week, from the moment's date.
  - {month}: The month, from the moment's date.
- **67** · **This is a {weekday} in {month}.**
  - {weekday}: The day of the week, from the moment's date.
  - {month}: The month, from the moment's date.

### narrate (`lead-appointment-any`)

- **68** · **An appointment has been made.**

### narrate (`lead-argument-alone`)

- **69** · **There is a disagreement in the room.**

### narrate (`lead-argument-other`)

- **70** · **Things between you and {other} are not settled.**
  - {other}: A person, by name, from the tie record.

### narrate (`lead-arrival-alone`)

- **71** · **A new child has come into the household.**

### narrate (`lead-arrival-other`)

- **72** · **A child has been born, and {other} is there.**
  - {other}: A person, by name, from the tie record.

### narrate (`lead-becoming-friends-alone`)

- **73** · **You keep running into the same faces around town.**

### narrate (`lead-becoming-friends-other`)

- **74** · **You've been running into {other} around town.**
  - {other}: A person, by name, from the tie record.

### narrate (`lead-bill-signed-any`)

- **75** · **The bill has been signed.**

### narrate (`lead-breakup-alone`)

- **76** · **Your relationship has ended.**

### narrate (`lead-breakup-other`)

- **77** · **You and {other} are no longer together.**
  - {other}: A person, by name, from the tie record.

### narrate (`lead-campaign-stop-any`)

- **78** · **A campaign event is under way.**

### narrate (`lead-celebration-alone`)

- **79** · **There is something to mark today.**

### narrate (`lead-celebration-other`)

- **80** · **{other} is part of what is being marked today.**
  - {other}: A person, by name, from the tie record.

### narrate (`lead-eviction-notice-any`)

- **81** · **A notice has come that you must leave your home.**

### narrate (`lead-eviction-notice-other`)

- **82** · **A notice says you must leave, and {other} is there.**
  - {other}: A person, by name, from the tie record.

### narrate (`lead-first-day-alone`)

- **83** · **It's your first day, and you are expected.**

### narrate (`lead-first-day-other`)

- **84** · **It's your first day, and {other} is there when you arrive.**
  - {other}: A person, by name, from the tie record.

### narrate (`lead-first-meeting-alone`)

- **85** · **Someone new has come over to meet you.**

### narrate (`lead-first-meeting-other`)

- **86** · **You and {other} are just meeting.**
  - {other}: A person, by name, from the tie record.

### narrate (`lead-floor-vote-any`)

- **87** · **A vote has been called.**

### narrate (`lead-funeral-alone`)

- **88** · **People have gathered to say goodbye.**

### narrate (`lead-funeral-other`)

- **89** · **{other} is among the people who have come to say goodbye.**
  - {other}: A person, by name, from the tie record.

### narrate (`lead-hearing-any`)

- **90** · **The court is in session.**

### narrate (`lead-last-day-alone`)

- **91** · **It's your last day.**

### narrate (`lead-last-day-other`)

- **92** · **It's your last day, and {other} is there for it.**
  - {other}: A person, by name, from the tie record.

### narrate (`lead-law-takes-effect-any`)

- **93** · **A law that reaches you has taken effect.**

### narrate (`lead-layoff-alone`)

- **94** · **Your job has ended.**

### narrate (`lead-layoff-other`)

- **95** · **Your job has ended, and {other} is there.**
  - {other}: A person, by name, from the tie record.

### narrate (`lead-news-arrives-alone`)

- **96** · **News has reached you.**

### narrate (`lead-news-arrives-other`)

- **97** · **{other} has news for you.**
  - {other}: A person, by name, from the tie record.

### narrate (`lead-office-scene-any`)

- **98** · **{name} is the member you need to reach.**
  - {name}: The member the scene is about, by name, from the member's term.
- **99** · **This bill is about {issue}, and {name} is the one to reach.**
  - {issue}: The bill's question, named as the bill catalog records it.
  - {name}: The member the scene is about, by name, from the member's term.

### narrate (`lead-polling-place-any`)

- **100** · **It's election day, and the polls are open.**

### narrate (`lead-press-interview-any`)

- **101** · **A reporter is asking questions.**

### narrate (`lead-public-hearing-any`)

- **102** · **A public hearing is under way.**

### narrate (`lead-race-lost-any`)

- **103** · **The count is in, and you lost.**

### narrate (`lead-race-won-any`)

- **104** · **The count is in, and you won.**

### narrate (`lead-recall-any`)

- **105** · **A petition to recall an official has gone around.**

### narrate (`lead-reunion-alone`)

- **106** · **Someone you know has turned up.**

### narrate (`lead-reunion-other`)

- **107** · **You and {other} are together again.**
  - {other}: A person, by name, from the tie record.

### narrate (`lead-scandal-any`)

- **108** · **A story about a scandal has reached you.**

### narrate (`lead-verdict-any`)

- **109** · **The verdict has come in.**

### narrate (`lead-veto-any`)

- **110** · **The bill has been vetoed.**

### narrate (`setting-home-home`)

- **111** · **You are home in {place}.**
  - {place}: A town, from the household or setting record.
- **112** · **You're at home.**
- **113** · **You're at home in {place}.**
  - {place}: A town, from the household or setting record.

### narrate (`setting-letter-letter`)

- **114** · **A letter has come for you.**
- **115** · **A letter is in your hands.**

### narrate (`setting-other-home`)

- **116** · **You are at {host} house.**
  - {host}: The host's name with its possessive, from the household record.
- **117** · **You're at {host} home.**
  - {host}: The host's name with its possessive, from the household record.

### narrate (`setting-venue-out`)

- **118** · **You are out in {place}.**
  - {place}: A town, from the household or setting record.
- **119** · **You're out in {place}.**
  - {place}: A town, from the household or setting record.

## speech stages (21)

### tell (`stage-children`)

- **120** · **I'm raising {number} children here in {place}. Every choice we make now is one they'll live with.**
  - {number}: The count of children in the speaker's household, from the household record.
  - {place}: The speaker's town, from the household record.

### close (`stage-closer`)

- **121** · **God bless you, and God bless America.**
- **122** · **Let's get to work.**
- **123** · **Thank you all.**
- **124** · **Thank you, and God bless you.**
- **125** · **Thank you very much.**
- **126** · **That's all I have to say.**

### tell (`stage-home`)

- **127** · **I live in {place}. I know these streets, and I know the people who live on them.**
  - {place}: The speaker's town, from the household record.

### greet (`stage-opener`)

- **128** · **Good to see you all.**
- **129** · **I'm glad to be here.**
- **130** · **It's good to be in {place}.**
  - {place}: The speaker's town, from the household record.
- **131** · **It's great to be here.**
- **132** · **Thank you all for coming.**

### tell (`stage-school`)

- **133** · **I went to {school}. What we teach our kids there is what we leave behind.**
  - {school}: The speaker's school, from the school record.

### promise (`stage-stance-enact`)

- **134** · **I want to talk about {issue}. {goal}? I'm for it, and I'd like you to hold me to that.**
  - {issue}: The subject of a stand, as the bill catalog names its topic.
  - {goal}: What the speaker's recorded stand is about, as the bill catalog names the policy; said as a question, then answered.
- **135** · **Let me talk about {issue}. {goal}? I'm for it, and I'm saying so here in {place}.**
  - {issue}: The subject of a stand, as the bill catalog names its topic.
  - {goal}: What the speaker's recorded stand is about, as the bill catalog names the policy; said as a question, then answered.
  - {place}: The speaker's town, from the household record.
- **136** · **On {issue}, I'll be plain. {goal}? I'm for it. Ask me why, and I'll tell you.**
  - {issue}: The subject of a stand, as the bill catalog names its topic.
  - {goal}: What the speaker's recorded stand is about, as the bill catalog names the policy; said as a question, then answered.

### promise (`stage-stance-repeal`)

- **137** · **Let me talk about {issue}. {goal}? I'm against it, and I'm saying so here in {place}.**
  - {issue}: The subject of a stand, as the bill catalog names its topic.
  - {goal}: What the speaker's recorded stand is about, as the bill catalog names the policy; said as a question, then answered.
  - {place}: The speaker's town, from the household record.
- **138** · **On {issue}, I'll be plain. {goal}? I'm against it. Ask me why, and I'll tell you.**
  - {issue}: The subject of a stand, as the bill catalog names its topic.
  - {goal}: What the speaker's recorded stand is about, as the bill catalog names the policy; said as a question, then answered.

### tell (`stage-work`)

- **139** · **I work at {employer}. I know what a paycheck means in {place}, because I earn mine here.**
  - {employer}: The speaker's employer, from the job record.
  - {place}: The speaker's town, from the household record.
- **140** · **I worked at {employer} for {years} years. I know what a paycheck means in {place}.**
  - {employer}: The speaker's employer, from the job record.
  - {years}: Years at that employer, computed from the dated tenure record.
  - {place}: The speaker's town, from the household record.
