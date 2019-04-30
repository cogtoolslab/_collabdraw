## collabdraw games

This directory will contain subdirs containing different interactive sketching tasks ("games"), designed to be approachable for kids and enjoyable for all ages. 

### `collab` experiment log

#### `pilot0`: Test UI
- 2 participants.
- experimentDir: collab8
- Mostly fine, but found a few bugs with data saving and fixed.
#### `pilot1`: Explore prepost design
- N = 18+ participants.
- note: game '9053-d3a0c1d9-cb81-4bdd-a572-5e38b91b33e9' in pilot1 missing stroke data from the first sheep
- experimentDesign: prepost
- experimentDir: collab8
- Is there transfer from collab phase to solo drawing?*
- Each session contains 40 drawing trials.
- Same 8 categories used in all sessions: ['bear','cat','duck','lion','pig','rabbit','sheep','swan']
- 4 of these categories are assigned to the "collab" condition; the other 4 are assigned to the "solo" condition.
- Each category is drawn five times. The first and fifth time, the category is drawn solo. The second through fourth time, if the object belongs to the "collab" condition, participant takes turns drawing with robot. If the object instead belongs to the "solo" condition, participant again draws on their own.
- Every trial ends when human decides the drawing is sufficiently recognizable & clicks submit button.
- All categories are drawn across 5 repetition cycles, wherein all categories are drawn once in a randomized order, before proceeding to next repetition cycle.
#### `pilot2`: Baseline task (collab vs. solo)
- N = 95 participants.
- experimentDesign: baseline
- experimentDir: collab8
- Same 8 categories used in all sessions: ['bear','cat','duck','lion','pig','rabbit','sheep','swan']
- All 8 categories drawn both collaboratively & solo.
- Each category is drawn four times each, in a counterbalanced order.
#### `pilot3` : Classifier added + Baseline task (collab vs. solo) 
- N participants
- experimentDesign: baseline
- experimentDir: collab96
- 96 categories in play, a randomly sampled subset included in each session
```
const classList = ["alarm clock","ambulance","angel","ant","backpack","barn","basket","bear","bee","bicycle","bird","book","brain","bridge","bulldozer","bus","butterfly","cactus","calendar","castle","cat","chair","couch","crab","cruise ship","diving board","dog","dolphin","duck","elephant","eye","face","fan","fire hydrant","firetruck","flamingo","flower","frog","garden","hand","hedgehog","helicopter","kangaroo","key","lantern","lighthouse","lion","lobster","map","mermaid","monkey","mosquito","octopus","owl","paintbrush","palm tree","parrot","passport","peas","penguin","pig","pineapple","pool","postcard","power outlet","rabbit","radio","rain","rhinoceros","rifle","roller coaster","sandwich","scorpion","sea turtle","sheep","skull","snail","snowflake","speedboat","spider","squirrel","steak","stove","strawberry","swan","swing set","The Mona Lisa", "tiger", "toothbrush", "toothpaste", "tractor", "trombone", "truck", "whale", "windmill","yoga"];
```
- Each category drawn twice, once collaboratively and once solo. 
- Order of collab vs. solo is randomized for each object.
- Classifier results sent back to server with each finished stroke/sketch to make it easier to do timecourse analyses

#### `pilot4`: Hybrid drawing nudge task
- N participants
- experimentDesign: nudge
- "Nudge feedback": after first two strokes by human + sketch-rnn, suggested that they try to make it look like some other category for the rest of the trial.
- Still under development ...


