/**
 * Get Set Go run sheets — the coach and helper lesson plans.
 *
 * GATED: served only through /api/sessions behind the admin passcode.
 * This file lives in api/_data/ deliberately — it used to be a static file at
 * public/getsetgo/sessions.json, which meant anyone could download the run
 * sheets without signing in. Files here are never served statically and are not
 * routed as functions (the "_" prefix).
 *
 * Regenerate with: npm run build:sessions
 */

export default {
  "season": {
    "title": "Get Set Go",
    "subtitle": "Taupō Athletics — 3 to 6 year olds",
    "time": "Thursdays · 5:30–6:30 pm",
    "term4": "Term 4 2026 · Thu 15 Oct – Thu 17 Dec",
    "term1": "Term 1 2027 · Thu 4 Feb – Thu 1 Apr",
    "finalNight": "Thu 1 Apr 2027 — Mini meet + prizegiving (no normal rotations)",
    "warmdown": {
      "name": "Warm-down — Sprints in age groups (8 min, every week)",
      "setup": "Lanes marked with cones. Distance by age: 3-4yrs 15m, 5yrs 20m, 6yrs 25-30m.",
      "how": "Children run in their age group, three or four at a time, two runs each. Every child is named and cheered as they cross. Run THROUGH the line, not to it. This is the same every week and that is the point — they get to feel themselves getting faster.",
      "adaptation": "15m, running toward a coach with open arms. Two runs, not three.",
      "watchFor": "Slowing down before the line. Put a cone 3m past the finish and ask them to run to that one.",
      "equipment": "30 cones"
    },
    "rules": [
      "No separate warm-up — the Game rotation IS the warm-up. Go straight in.",
      "Each series runs two weeks: the same four rotations both weeks, a fresh game the second week.",
      "Warm-down is the same every week: sprints in age groups, two runs each, every child named and cheered.",
      "Never rank children against each other. Each child beats their own cone.",
      "Beanbags before balls. Foam before real. No rigid hurdles, no real discus, no high jump mats at this age.",
      "3-4 year olds: success first — make the task small enough that they succeed, then grow it."
    ]
  },
  "series": [
    {
      "series": 1,
      "name": "Finding our feet",
      "term": "Term 4",
      "dates": [
        "Thu 15 Oct",
        "Thu 22 Oct"
      ],
      "weeksLabel": "Weeks 1–2 · Thu 15 & 22 Oct 2026",
      "athleticsEvent": "Long jump",
      "coachNote": "First series — names before anything else. Walk the boundary cones with them on day one, then keep the same boundaries for both weeks so week two feels familiar.",
      "rotations": [
        {
          "order": 1,
          "category": "Game",
          "skill": "Running",
          "ledBy": "Parent helper",
          "cues": [
            "Run tall — head still, eyes forward",
            "Arms bent at 90 degrees, swinging front to back not across",
            "Knees lift forward",
            "Land on the ball of the foot, light and quiet",
            "Run THROUGH the finish line, not to it"
          ],
          "equipment": "20 cones",
          "adaptation": "Walk and jog only. Stay near a coach. Two calls maximum — green and red.",
          "watchFor": "Children watching the floor instead of the space. Cue 'eyes up'.",
          "game": {
            "name": "Traffic Lights",
            "setup": "Mark a wide playing area with cones. Everyone spreads out inside it.",
            "how": "Call GREEN and everyone jogs, ORANGE and they walk, RED and they freeze. Add CROSSING (walk sideways) and ROUNDABOUT (turn on the spot). Nobody is ever out — if a child moves on red they simply do a big star jump and carry on.",
            "equipment": "20 cones"
          },
          "backup": "Fast Cars — run laps, change gear on call"
        },
        {
          "order": 2,
          "category": "Manipulative",
          "skill": "Underarm throwing",
          "ledBy": "Coach",
          "cues": [
            "Face the target",
            "Step forward with the OPPOSITE foot",
            "Swing the arm low and straight, like a pendulum",
            "Let go at the front",
            "Point at the target after you let go"
          ],
          "equipment": "8 hula hoops, soft toys",
          "adaptation": "Throw from 1m into a hoop on the floor, two hands. Success first.",
          "watchFor": "Throwing with the same foot forward as the throwing arm. Chalk a footprint.",
          "game": {
            "name": "Target Toys",
            "setup": "A row of hula hoops on the ground at three distances — close, middle, far.",
            "how": "Children throw soft toys underarm into the hoops, choosing which one to aim at. Three throws each, cheer every attempt. Move the close hoop closer for anyone struggling.",
            "equipment": "8 hula hoops, soft toys"
          },
          "backup": "Toy Basketball — throw into the high hoop"
        },
        {
          "order": 3,
          "category": "Fitness Circuit",
          "skill": "Fitness & balance",
          "ledBy": "Parent helper",
          "course": "Animal Trail",
          "stations": [
            {
              "move": "Bear crawl from cone A to cone B",
              "how": "Hands and feet on the floor, bottom up, walk like a bear."
            },
            {
              "move": "Frog jump over 3 flat markers",
              "how": "Two-foot jump, land quiet with bent knees."
            },
            {
              "move": "Walk along the balance blocks",
              "how": "Arms out, one foot in front of the other."
            },
            {
              "move": "Step over 3 low foam hurdles",
              "how": "Slow and steady, no knocking them over."
            },
            {
              "move": "Flamingo balance — stand on one foot for a slow count of 3",
              "how": "Hold a coach's finger if wobbly. Try the other foot too."
            },
            {
              "move": "Crab walk back to the start",
              "how": "Hands behind, bottom up, walk backwards."
            }
          ],
          "cues": [
            "Eyes up and forward",
            "Arms out for balance",
            "Small controlled steps",
            "Bend the knees a little"
          ],
          "equipment": "10 cones, 3 flat markers, balance blocks, 3 foam hurdles",
          "adaptation": "Hold a hand for the tightrope and flamingo. Bear crawl is the star — let them be bears.",
          "watchFor": "Queueing. Run the loop so everyone starts at a different station."
        },
        {
          "order": 4,
          "category": "Athletics",
          "skill": "Jumping for distance",
          "ledBy": "Coach",
          "event": "Long jump",
          "cues": [
            "Bend the knees into a crouch",
            "Swing both arms back, then forward and up",
            "Push off hard with both feet",
            "Reach forward with the arms",
            "Land on two feet with knees bent, and freeze"
          ],
          "equipment": "30 cones, long jump mat or sandpit",
          "adaptation": "Standing two-foot jump from a line. No measuring — just 'land quietly'.",
          "watchFor": "Comparing with each other. Redirect: 'beat your own cone'.",
          "game": {
            "name": "Measure Your Hop",
            "setup": "A start line and a long open run.",
            "how": "Each child jumps or hops from the line and places their own cone where they landed. Next turn they try to beat their own cone. Nobody compares to anybody else — that is the whole design.",
            "equipment": "30 cones, long jump mat or sandpit"
          },
          "backup": "Frog Jump Freeze — two-foot jump, freeze the landing"
        }
      ]
    },
    {
      "series": 2,
      "name": "Catch and jump",
      "term": "Term 4",
      "dates": [
        "Thu 29 Oct",
        "Thu 5 Nov"
      ],
      "weeksLabel": "Weeks 3–4 · Thu 29 Oct & 5 Nov 2026",
      "athleticsEvent": "High jump",
      "coachNote": "Never rank the jumps. Each child marks their own landing with their own cone, and in week two they try to beat the cone they set in week one.",
      "rotations": [
        {
          "order": 1,
          "category": "Game",
          "skill": "Jumping for height",
          "ledBy": "Parent helper",
          "cues": [
            "Bend knees into a crouch",
            "Explode upwards",
            "Swing arms upwards quickly",
            "Stretch, reach and focus on the target",
            "Land with knees bent to absorb the shock"
          ],
          "equipment": "None",
          "adaptation": "Jump up to touch a coach’s hand held just above their reach.",
          "watchFor": "No arm swing. Cue ‘swing your arms up’.",
          "game": {
            "name": "Jumping Beans",
            "setup": "Open space, everyone spread out.",
            "how": "Call a bean and the children do the action. Jelly bean — wobble. Runner bean — run on the spot. String bean — stretch tall. Baked bean — curl up small. Jumping bean — two-foot jumps. Frozen bean — freeze. Add a new bean each week and let a child invent one.",
            "equipment": "None"
          },
          "backup": "Jump and Reach — jump up to touch a held target"
        },
        {
          "order": 2,
          "category": "Manipulative",
          "skill": "Catching",
          "ledBy": "Coach",
          "cues": [
            "Watch the ball all the way in",
            "Hands up and ready, fingers spread like a cup",
            "Move your feet to get behind it",
            "Catch it out in front of you",
            "Pull it in to your chest"
          ],
          "equipment": "20 soft balls, 20 scarves",
          "adaptation": "Scarves only, dropped from just above their hands. They will catch these.",
          "watchFor": "Closing eyes as the ball arrives. Use a bigger, softer, slower ball.",
          "game": {
            "name": "Clever Catchers",
            "setup": "Partners about 2m apart, or a child and an adult.",
            "how": "Progression, in this order: roll the ball, bounce and catch, throw and catch with a bounce, throw and catch in the air. Only move up when the child is catching most of them. Scarves first for the youngest — they float and can actually be caught.",
            "equipment": "20 soft balls, 20 scarves"
          },
          "backup": "Scarf Pop — toss a scarf high, clap once, catch"
        },
        {
          "order": 3,
          "category": "Fitness Circuit",
          "skill": "Fitness & balance",
          "ledBy": "Parent helper",
          "course": "Jungle Jaunt",
          "stations": [
            {
              "move": "Snake slither along the ground from A to B",
              "how": "On the tummy, arms and legs push you along."
            },
            {
              "move": "Frog jump from hoop to hoop (lily pads)",
              "how": "Two-foot take-off, two-foot landing."
            },
            {
              "move": "Bear crawl over 2 low boxes",
              "how": "Hands on the box, walk over on all fours."
            },
            {
              "move": "Walk along the balance blocks",
              "how": "Arms out, one foot in front of the other."
            },
            {
              "move": "Log roll in a straight line from A to B",
              "how": "Lie down, arms up over head, roll like a log."
            },
            {
              "move": "Flamingo balance — one foot for a slow count of 3",
              "how": "Arms out, look at one spot."
            }
          ],
          "cues": [
            "Eyes up and forward",
            "Arms out wide",
            "Small controlled steps",
            "Bend the knees a little"
          ],
          "equipment": "10 cones, 6 hoops, 2 low boxes, balance blocks",
          "adaptation": "Bear crawl and frog jump only. Skip the flamingo.",
          "watchFor": "Landing on straight legs. Demonstrate the ninja landing yourself."
        },
        {
          "order": 4,
          "category": "Athletics",
          "skill": "Jumping for height",
          "ledBy": "Coach",
          "event": "High jump",
          "cues": [
            "Bend knees into a crouch",
            "Explode upwards",
            "Swing arms upwards quickly",
            "Stretch, reach and focus on the target",
            "Land with knees bent to absorb the shock"
          ],
          "equipment": "1 low elastic, 2 cones, flat markers",
          "adaptation": "Step over an elastic at ANKLE height holding a hand. That is the whole activity.",
          "watchFor": "Trying to land on the back. Stop immediately and reset the technique.",
          "game": {
            "name": "Scissor Jump",
            "setup": "Stretch a low elastic (never rope) between two cones at ankle-to-knee height, with a clear run-up of flat markers.",
            "how": "The child runs (or walks) in, scissors one leg over the elastic, then the other, and lands on two feet with knees bent. SAFETY: land on feet only — never on the back, no Fosbury flop, no high jump mats at this age.",
            "equipment": "1 low elastic, 2 cones, flat markers"
          },
          "backup": "Elastic Step-Over — walk in and step over the elastic"
        }
      ]
    },
    {
      "series": 3,
      "name": "Throw it far",
      "term": "Term 4",
      "dates": [
        "Thu 12 Nov",
        "Thu 19 Nov"
      ],
      "weeksLabel": "Weeks 5–6 · Thu 12 & 19 Nov 2026",
      "athleticsEvent": "Hurdles",
      "coachNote": "The opposite-foot step is the hardest part of an overarm throw. Chalk a footprint in week one and leave it down for week two.",
      "rotations": [
        {
          "order": 1,
          "category": "Game",
          "skill": "Dodging",
          "ledBy": "Parent helper",
          "cues": [
            "Small, quick steps",
            "Bend the knees and stay low",
            "Look where you are going, not at the ground",
            "Push off the outside foot to change direction"
          ],
          "equipment": "6 dodgeballs, 20 cones",
          "adaptation": "Roll the dodgeball gently along the ground, underarm, below the knees.",
          "watchFor": "Throwing too hard. Cue ‘below the knees, gentle’.",
          "game": {
            "name": "Dodgeball",
            "setup": "A marked area with a line down the middle; soft dodgeballs ready.",
            "how": "Roll or gently throw dodgeballs (underarm, below the knees) to tag the other side. Tagged children run to the sideline, do five star jumps, and rejoin. Soft balls only, nobody is out for long.",
            "equipment": "6 dodgeballs, 20 cones"
          },
          "backup": "Dodgeball Roll — roll the ball to tag feet"
        },
        {
          "order": 2,
          "category": "Manipulative",
          "skill": "Overarm throwing",
          "ledBy": "Coach",
          "cues": [
            "Stand side-on to the target",
            "Point at the target with the non-throwing hand",
            "Take the throwing arm back, elbow high",
            "Step forward with the opposite foot",
            "Throw over the top and follow through across the body"
          ],
          "equipment": "40 beanbags, 20 cones",
          "adaptation": "Beanbags only, from 2m, with no side-on stance taught yet.",
          "watchFor": "Throwing from the elbow with no step. Model it exaggeratedly.",
          "game": {
            "name": "Force Back",
            "setup": "Two lines of cones about 8m apart. Partners face each other, one on each line.",
            "how": "Throw the beanbag to your partner. Wherever it lands, they throw from there. The aim is to push your partner backwards. Beanbags first, tennis balls only for the confident. Everybody throws every turn.",
            "equipment": "20 beanbags, 20 cones"
          },
          "backup": "Knock the Witch’s Hat — step back and knock them again"
        },
        {
          "order": 3,
          "category": "Fitness Circuit",
          "skill": "Fitness & balance",
          "ledBy": "Parent helper",
          "course": "Superhero Training",
          "stations": [
            {
              "move": "Superman fly — run with arms out wide from A to B",
              "how": "Arms straight out like flying, look where you're going."
            },
            {
              "move": "Spider crawl (crab walk) backwards from B to C",
              "how": "Hands behind, bottom up, walk backwards."
            },
            {
              "move": "Leap the buildings — jump over 3 foam hurdles",
              "how": "Two feet, bend the knees to land."
            },
            {
              "move": "Walk the balance blocks between the skyscrapers",
              "how": "Arms out, slow steps."
            },
            {
              "move": "Balance a beanbag on your head and walk 5 steps",
              "how": "Look straight ahead, not at the beanbag."
            },
            {
              "move": "Super star jump — jump out wide, land quiet",
              "how": "Arms and legs out like a star."
            }
          ],
          "cues": [
            "Eyes up and forward, not down at your feet",
            "Arms out wide",
            "Small controlled steps",
            "Bend the knees a little"
          ],
          "equipment": "10 cones, 3 foam hurdles, balance blocks, 10 beanbags",
          "adaptation": "Walk the lines holding a hand. No beanbag on the head yet.",
          "watchFor": "Running instead of walking. Make the lines curvy to slow them down."
        },
        {
          "order": 4,
          "category": "Athletics",
          "skill": "Hurdling",
          "ledBy": "Coach",
          "event": "Hurdles",
          "cues": [
            "Run tall — head still, eyes forward",
            "Knees lift forward",
            "Step over each hurdle without stopping",
            "Land light and run on",
            "Run THROUGH the finish line"
          ],
          "equipment": "8 foam hurdles, 20 cones",
          "adaptation": "Step over flat markers on the ground and run on.",
          "watchFor": "Stopping before each hurdle. Space them closer together.",
          "game": {
            "name": "Step and Run",
            "setup": "A line of foam hurdles (the kind that collapse if clipped) at shin height, spaced close together.",
            "how": "Run toward the hurdles and step over each one without stopping, then run through the finish cone. If they stop, move the hurdles closer together. Never use rigid hurdles.",
            "equipment": "8 foam hurdles, 20 cones"
          },
          "backup": "Hurdle Hop — two-foot hop over each hurdle"
        }
      ]
    },
    {
      "series": 4,
      "name": "Kick it up",
      "term": "Term 4",
      "dates": [
        "Thu 26 Nov",
        "Thu 3 Dec"
      ],
      "weeksLabel": "Weeks 7–8 · Thu 26 Nov & 3 Dec 2026",
      "athleticsEvent": "Relays",
      "coachNote": "Mix the teams so no team is all sixes. Announce when every team has finished, not who finished first. Keep the same teams across both weeks.",
      "rotations": [
        {
          "order": 1,
          "category": "Game",
          "skill": "Running",
          "ledBy": "Parent helper",
          "cues": [
            "Run tall — head still, eyes forward",
            "Arms bent at 90 degrees, swinging front to back not across",
            "Knees lift forward",
            "Land on the ball of the foot, light and quiet",
            "Run THROUGH the finish line, not to it"
          ],
          "equipment": "Bibs, 20 cones",
          "adaptation": "Walking pace with a coach as the only tagger.",
          "watchFor": "Collisions — keep the area wide.",
          "game": {
            "name": "Dead Ants",
            "setup": "Wide area with clear boundaries.",
            "how": "Two taggers chase. When tagged, lie on your back with arms and legs in the air like a dead ant. A free friend tags your hand to bring you back to life. Swap the taggers often.",
            "equipment": "Bibs, 20 cones"
          },
          "backup": "Chain Tag — one long chain chases"
        },
        {
          "order": 2,
          "category": "Manipulative",
          "skill": "Kicking",
          "ledBy": "Coach",
          "cues": [
            "Place the non-kicking foot beside the ball",
            "Look at the ball, not the target",
            "Swing the kicking leg back",
            "Strike with the inside of the foot or the laces",
            "Follow through toward where you want it to go"
          ],
          "equipment": "20 soft footballs, 30 cones",
          "adaptation": "Kick a stationary large soft ball from standing, to a coach 2m away.",
          "watchFor": "Toe-poking. Cue 'inside of the foot, like passing'.",
          "game": {
            "name": "Partner Kicking",
            "setup": "Partners about 3m apart with a cone goal each.",
            "how": "Kick a stationary ball to your partner, who traps it with a foot before kicking back. Widen the gap only when they are consistently connecting.",
            "equipment": "20 soft footballs, 30 cones"
          },
          "backup": "Kick and Chase — kick far, chase it, dribble back"
        },
        {
          "order": 3,
          "category": "Fitness Circuit",
          "skill": "Fitness & balance",
          "ledBy": "Parent helper",
          "course": "Pirate Island",
          "stations": [
            {
              "move": "Walk the plank — balance blocks from A to B",
              "how": "Arms out, heel-to-toe, don't fall in the sea."
            },
            {
              "move": "Hop from island to island (hoops on the floor)",
              "how": "Two feet together, land inside each hoop."
            },
            {
              "move": "Bear crawl under the rigging — a balance block laid across two cones",
              "how": "Stay low, crawl under without touching the rope."
            },
            {
              "move": "Step over the cannonballs (foam hurdles)",
              "how": "Lift the knees, step over each one."
            },
            {
              "move": "Balance a beanbag on your shoulder while walking 5 steps",
              "how": "Look ahead, walk steady."
            },
            {
              "move": "Treasure star jump to finish",
              "how": "Arms and legs out wide, land quiet."
            }
          ],
          "cues": [
            "Eyes up and forward",
            "Arms out for balance",
            "Small controlled steps",
            "Bend the knees a little"
          ],
          "equipment": "balance blocks, 8 hoops, 6 cones, 3 foam hurdles, 10 beanbags",
          "adaptation": "Carry the beanbag in two hands rather than balancing it.",
          "watchFor": "Rushing the plank. Ask them to do it slowly once."
        },
        {
          "order": 4,
          "category": "Athletics",
          "skill": "Relay changeover",
          "ledBy": "Coach",
          "event": "Relays",
          "cues": [
            "Look at the person coming in",
            "Hand it over, do not throw it",
            "Start moving as they get close",
            "Take it with the hand nearest them",
            "Cheer your team, all of them"
          ],
          "equipment": "12 beanbags, 20 cones, bibs",
          "adaptation": "Walk the changeover in pairs with a coach in the middle.",
          "watchFor": "Throwing the baton. Cue 'place it in the hand'.",
          "game": {
            "name": "Half and Half Relay",
            "setup": "Teams of three, split either end of a 15m run.",
            "how": "Run to the other end, hand the beanbag over, join the back of that line. Everyone runs multiple times. Do not announce a winner — announce when every team has finished.",
            "equipment": "12 beanbags, 20 cones, bibs"
          },
          "backup": "Shuttle Relay — run out, touch the cone, run back"
        }
      ]
    },
    {
      "series": 5,
      "name": "Swing and hit",
      "term": "Term 4",
      "dates": [
        "Thu 10 Dec",
        "Thu 17 Dec"
      ],
      "weeksLabel": "Weeks 9–10 · Thu 10 & 17 Dec 2026",
      "athleticsEvent": "Long jump",
      "coachNote": "Last series before the summer break. Keep it light and fun — it's the end of term. Certificates wait for the mini meet in April.",
      "rotations": [
        {
          "order": 1,
          "category": "Game",
          "skill": "Jumping for distance",
          "ledBy": "Parent helper",
          "cues": [
            "Bend the knees into a crouch",
            "Swing both arms back, then forward and up",
            "Push off hard with both feet",
            "Reach forward with the arms",
            "Land on two feet with knees bent, and freeze"
          ],
          "equipment": "12 hoops or flat markers, 2 soft balls",
          "adaptation": "Two-foot jumps on the spot and over flat markers only.",
          "watchFor": "Landing stiff-legged. Cue ‘land quiet, bend your knees’.",
          "game": {
            "name": "Frogs and Flies",
            "setup": "Lay hoops or flat markers as lily pads, roughly a small jump apart.",
            "how": "Children are frogs jumping from lily pad to lily pad with two-foot take-offs and two-foot landings. Coach walks around waving a soft ball as a fly; frogs jump up to catch it. The point is a quiet, bent-knee landing.",
            "equipment": "12 hoops or flat markers, 2 soft balls"
          },
          "backup": "Lily Pad Dash — hop hoop-to-hoop, quick feet"
        },
        {
          "order": 2,
          "category": "Manipulative",
          "skill": "Striking",
          "ledBy": "Coach",
          "cues": [
            "Stand side-on",
            "Two hands on the bat, hands together",
            "Watch the ball right onto the bat",
            "Swing level, not down",
            "Follow through around the body"
          ],
          "equipment": "T-ball set (bat, tee, 8 soft balls), 20 cones",
          "adaptation": "Large ball on a low tee, big soft bat, very close. Multiple goes each.",
          "watchFor": "Two-handed grip separating. Tape the hand position on the bat.",
          "game": {
            "name": "T-ball Strike",
            "setup": "A batting tee with a large soft ball on top; a fielding area marked with cones.",
            "how": "Strike the ball off the tee with the bat, then run to a cone and back. Set up two or three tees so several children hit at once and nobody queues. Everyone bats every round.",
            "equipment": "T-ball set (bat, tee, 8 soft balls), 20 cones"
          },
          "backup": "T-ball Bases — hit and run to a cone"
        },
        {
          "order": 3,
          "category": "Fitness Circuit",
          "skill": "Fitness & balance",
          "ledBy": "Parent helper",
          "course": "Frosty's Winter Trail",
          "stations": [
            {
              "move": "Penguin waddle from A to B",
              "how": "Heels together, small shuffling steps."
            },
            {
              "move": "Ice skate — side-step along the balance blocks",
              "how": "Step side to side, like skating on ice."
            },
            {
              "move": "Jump over the snow mounds (foam hurdles)",
              "how": "Two feet, bend the knees to land."
            },
            {
              "move": "Snowflake balance — stand on one foot, arms out, count of 3",
              "how": "Look at one spot, arms out wide."
            },
            {
              "move": "Bear crawl through the snow tunnel (between two lines of cones)",
              "how": "All fours, stay between the cone lines."
            },
            {
              "move": "Bunny hop to the finish",
              "how": "Two feet together, small hops."
            }
          ],
          "cues": [
            "Eyes up and forward",
            "Arms out wide",
            "Small controlled steps",
            "Bend the knees a little"
          ],
          "equipment": "10 cones, balance blocks, 3 foam hurdles",
          "adaptation": "Walk and jump only. Skip the sideways skate if it's too tricky.",
          "watchFor": "Jumping off one foot. Cue 'two feet to land'."
        },
        {
          "order": 4,
          "category": "Athletics",
          "skill": "Jumping for distance",
          "ledBy": "Coach",
          "event": "Long jump",
          "cues": [
            "Bend the knees into a crouch",
            "Swing both arms back, then forward and up",
            "Push off hard with both feet",
            "Reach forward with the arms",
            "Land on two feet with knees bent, and freeze"
          ],
          "equipment": "30 cones, long jump mat or sandpit",
          "adaptation": "Standing two-foot jump from a line. No measuring — just 'land quietly'.",
          "watchFor": "Comparing with each other. Redirect: 'beat your own cone'.",
          "game": {
            "name": "Measure Your Hop",
            "setup": "A start line and a long open run.",
            "how": "Each child jumps or hops from the line and places their own cone where they landed. Next turn they try to beat their own cone. Nobody compares to anybody else — that is the whole design.",
            "equipment": "30 cones, long jump mat or sandpit"
          },
          "backup": "Frog Jump Freeze — two-foot jump, freeze the landing"
        }
      ]
    },
    {
      "series": 6,
      "name": "Catch it again",
      "term": "Term 1",
      "dates": [
        "Thu 4 Feb",
        "Thu 11 Feb"
      ],
      "weeksLabel": "Weeks 11–12 · Thu 4 & 11 Feb 2027",
      "athleticsEvent": "High jump",
      "coachNote": "First series back — names again, and a gentle re-run of the boundaries. Pick up where you left off; no need to re-teach everything.",
      "rotations": [
        {
          "order": 1,
          "category": "Game",
          "skill": "Running",
          "ledBy": "Parent helper",
          "cues": [
            "Run tall — head still, eyes forward",
            "Arms bent at 90 degrees, swinging front to back not across",
            "Knees lift forward",
            "Land on the ball of the foot, light and quiet",
            "Run THROUGH the finish line, not to it"
          ],
          "equipment": "Bibs, 20 cones, 4 hoops",
          "adaptation": "Walking pace, coach as the first cat.",
          "watchFor": "Collisions — keep the area wide and cap the number of cats.",
          "game": {
            "name": "Cat & Mouse",
            "setup": "A wide area with one or two \"mouse holes\" (hoops or a square of cones) as safe zones.",
            "how": "The cat chases the mice. Mice are safe inside a mouse hole, but only for a slow count of five, then they must run again. When tagged, a mouse becomes a cat too. Swap the first cat often so everyone gets a turn chasing.",
            "equipment": "Bibs, 20 cones, 4 hoops"
          },
          "backup": "Chase Tag — a simple game of tag"
        },
        {
          "order": 2,
          "category": "Manipulative",
          "skill": "Catching",
          "ledBy": "Coach",
          "cues": [
            "Watch the ball all the way in",
            "Hands up and ready, fingers spread like a cup",
            "Move your feet to get behind it",
            "Catch it out in front of you",
            "Pull it in to your chest"
          ],
          "equipment": "20 soft balls, 20 scarves",
          "adaptation": "Bounce and catch with a large soft ball from 1m.",
          "watchFor": "Catching against the body. Cue 'catch it out in front'.",
          "game": {
            "name": "Clever Catchers",
            "setup": "Partners about 2m apart, or a child and an adult.",
            "how": "Progression, in this order: roll the ball, bounce and catch, throw and catch with a bounce, throw and catch in the air. Only move up when the child is catching most of them. Scarves first for the youngest — they float and can actually be caught.",
            "equipment": "20 soft balls, 20 scarves"
          },
          "backup": "Ball Roll Catch — roll the soft ball, catch it"
        },
        {
          "order": 3,
          "category": "Fitness Circuit",
          "skill": "Fitness & balance",
          "ledBy": "Parent helper",
          "course": "Space Station",
          "stations": [
            {
              "move": "Moon walk — big slow steps (lunge walks) from A to B",
              "how": "Big steps, bend the front knee."
            },
            {
              "move": "Rocket launch — squat low, jump up high, land quiet",
              "how": "Squat down, explode up, bend knees to land."
            },
            {
              "move": "Walk the balance blocks between the asteroids",
              "how": "Arms out, slow steps along the rope."
            },
            {
              "move": "Crawl under the solar panel (a balance block laid across two cones)",
              "how": "Stay low, crawl under without touching it."
            },
            {
              "move": "Balance on one foot and reach up to touch a star",
              "how": "Arms up, look up, hold steady."
            },
            {
              "move": "Crab walk back to base",
              "how": "Hands behind, bottom up, walk backwards."
            }
          ],
          "cues": [
            "Eyes up and forward",
            "Arms out wide",
            "Small controlled steps",
            "Bend the knees a little"
          ],
          "equipment": "10 cones, balance blocks, 3 foam hurdles",
          "adaptation": "Hold a hand for the one-foot reach. Moon walk can just be big steps.",
          "watchFor": "Landing hard on the rocket launch. Cue 'bend your knees'."
        },
        {
          "order": 4,
          "category": "Athletics",
          "skill": "Jumping for height",
          "ledBy": "Coach",
          "event": "High jump",
          "cues": [
            "Bend knees into a crouch",
            "Explode upwards",
            "Swing arms upwards quickly",
            "Stretch, reach and focus on the target",
            "Land with knees bent to absorb the shock"
          ],
          "equipment": "1 low elastic, 2 cones, flat markers",
          "adaptation": "Step over an elastic at ANKLE height holding a hand. That is the whole activity.",
          "watchFor": "Trying to land on the back. Stop immediately and reset the technique.",
          "game": {
            "name": "Scissor Jump",
            "setup": "Stretch a low elastic (never rope) between two cones at ankle-to-knee height, with a clear run-up of flat markers.",
            "how": "The child runs (or walks) in, scissors one leg over the elastic, then the other, and lands on two feet with knees bent. SAFETY: land on feet only — never on the back, no Fosbury flop, no high jump mats at this age.",
            "equipment": "1 low elastic, 2 cones, flat markers"
          },
          "backup": "Elastic Step-Over — walk in and step over the elastic"
        }
      ]
    },
    {
      "series": 7,
      "name": "Kick and chase",
      "term": "Term 1",
      "dates": [
        "Thu 18 Feb",
        "Thu 25 Feb"
      ],
      "weeksLabel": "Weeks 13–14 · Thu 18 & 25 Feb 2027",
      "athleticsEvent": "Hurdles",
      "coachNote": "The opposite-foot step returns. Bring back the chalk footprint from series 3 for anyone who needs it.",
      "rotations": [
        {
          "order": 1,
          "category": "Game",
          "skill": "Running",
          "ledBy": "Parent helper",
          "cues": [
            "Run tall — head still, eyes forward",
            "Arms bent at 90 degrees, swinging front to back not across",
            "Knees lift forward",
            "Land on the ball of the foot, light and quiet",
            "Run THROUGH the finish line, not to it"
          ],
          "equipment": "20 cones, bibs",
          "adaptation": "Shorter run, walking pace to start.",
          "watchFor": "Collisions in the middle. Keep the run wide.",
          "game": {
            "name": "Ballrush",
            "setup": "A start line and a finish line about 20m apart.",
            "how": "Everyone lines up on one side. Two or three taggers stand in the middle. On GO everyone runs to the other side without being tagged. Tagged children join the taggers in the middle. Repeat until only a few are left, then start again.",
            "equipment": "20 cones, bibs"
          },
          "backup": "Octopus — tagged kids become seaweed"
        },
        {
          "order": 2,
          "category": "Manipulative",
          "skill": "Kicking",
          "ledBy": "Coach",
          "cues": [
            "Place the non-kicking foot beside the ball",
            "Look at the ball, not the target",
            "Swing the kicking leg back",
            "Strike with the inside of the foot or the laces",
            "Follow through toward where you want it to go"
          ],
          "equipment": "20 soft footballs, 30 cones",
          "adaptation": "Dribble with small touches around 3 cones, then kick into a wide goal.",
          "watchFor": "Kicking too hard and chasing. Cue 'small touches'.",
          "game": {
            "name": "Crazy Kickers",
            "setup": "A course of cones to dribble around, ending at a goal made of two cones.",
            "how": "Dribble through the cones with small touches, then kick into the goal. Two or three courses running at once so the queue never builds.",
            "equipment": "20 soft footballs, 30 cones"
          },
          "backup": "Kick and Chase — kick far, chase it, dribble back"
        },
        {
          "order": 3,
          "category": "Fitness Circuit",
          "skill": "Fitness & balance",
          "ledBy": "Parent helper",
          "course": "Farmyard Fitness",
          "stations": [
            {
              "move": "Duck waddle from A to B",
              "how": "Squat a little, heels together, waddle."
            },
            {
              "move": "Horse gallop from B to C (step-hop)",
              "how": "Step then hop, same foot leading."
            },
            {
              "move": "Frog jump over 3 puddles (flat markers)",
              "how": "Two feet, bend the knees to land."
            },
            {
              "move": "Walk the fence line (balance blocks) balancing",
              "how": "Arms out, heel-to-toe."
            },
            {
              "move": "Chicken balance — one foot, flap your wings (arms) for a count of 3",
              "how": "Look at one spot, flap the arms."
            },
            {
              "move": "Bear crawl back to the barn",
              "how": "All fours, bottom up."
            }
          ],
          "cues": [
            "Eyes up and forward",
            "Arms out wide",
            "Small controlled steps",
            "Bend the knees a little"
          ],
          "equipment": "10 cones, 3 flat markers, balance blocks",
          "adaptation": "Duck waddle and frog jump only. Skip the gallop if needed.",
          "watchFor": "Losing balance on the fence. Hold a hand to start."
        },
        {
          "order": 4,
          "category": "Athletics",
          "skill": "Hurdling",
          "ledBy": "Coach",
          "event": "Hurdles",
          "cues": [
            "Run tall — head still, eyes forward",
            "Knees lift forward",
            "Step over each hurdle without stopping",
            "Land light and run on",
            "Run THROUGH the finish line"
          ],
          "equipment": "8 foam hurdles, 20 cones",
          "adaptation": "Step over flat markers on the ground and run on.",
          "watchFor": "Stopping before each hurdle. Space them closer together.",
          "game": {
            "name": "Step and Run",
            "setup": "A line of foam hurdles (the kind that collapse if clipped) at shin height, spaced close together.",
            "how": "Run toward the hurdles and step over each one without stopping, then run through the finish cone. If they stop, move the hurdles closer together. Never use rigid hurdles.",
            "equipment": "8 foam hurdles, 20 cones"
          },
          "backup": "Hurdle Hop — two-foot hop over each hurdle"
        }
      ]
    },
    {
      "series": 8,
      "name": "Strike again",
      "term": "Term 1",
      "dates": [
        "Thu 4 Mar",
        "Thu 11 Mar"
      ],
      "weeksLabel": "Weeks 15–16 · Thu 4 & 11 Mar 2027",
      "athleticsEvent": "Relays",
      "coachNote": "Review block. Ask each child one thing they can do now that they could not in series one — the answers feed the mini meet certificates.",
      "rotations": [
        {
          "order": 1,
          "category": "Game",
          "skill": "Running",
          "ledBy": "Parent helper",
          "cues": [
            "Run tall — head still, eyes forward",
            "Arms bent at 90 degrees, swinging front to back not across",
            "Knees lift forward",
            "Land on the ball of the foot, light and quiet",
            "Run THROUGH the finish line, not to it"
          ],
          "equipment": "20 rippa belts & tags (or team bands), 20 cones",
          "adaptation": "Gentle rips — a coach demonstrates the two-hand tag.",
          "watchFor": "Grabbing instead of ripping. Cue ‘rip the tag, not the shirt’.",
          "game": {
            "name": "Rippa Tag",
            "setup": "Wide area. Everyone wearing a rippa belt with two tags (or a team band).",
            "how": "Everyone runs and everyone rips. When both tags are gone, put them straight back on and rejoin. No teams, no score, no sitting out — two minutes on, one minute off.",
            "equipment": "20 rippa belts & tags (or team bands), 20 cones"
          },
          "backup": "Rush Hour — everyone rips, everyone runs"
        },
        {
          "order": 2,
          "category": "Manipulative",
          "skill": "Striking",
          "ledBy": "Coach",
          "cues": [
            "Stand side-on",
            "Two hands on the bat, hands together",
            "Watch the ball right onto the bat",
            "Swing level, not down",
            "Follow through around the body"
          ],
          "equipment": "Cricket set (bat, ball, stumps), 20 cones",
          "adaptation": "Large ball on a low tee, big soft bat, very close. Multiple goes each.",
          "watchFor": "Two-handed grip separating. Tape the hand position on the bat.",
          "game": {
            "name": "Cricket Hit",
            "setup": "A cricket bat, a ball on a low tee (or a gently rolled ball), and a target area marked with cones.",
            "how": "Hit the ball off the tee with the cricket bat (or hit a gently rolled ball), then run to a cone and back. Keep it gentle and close — this is about the swing, not power.",
            "equipment": "Cricket set (bat, ball, stumps), 20 cones"
          },
          "backup": "Cricket Roll and Hit — hit a gently rolled ball"
        },
        {
          "order": 3,
          "category": "Fitness Circuit",
          "skill": "Fitness & balance",
          "ledBy": "Parent helper",
          "course": "Power Circuit",
          "stations": [
            {
              "move": "Bear crawl from A to B",
              "how": "Hands and feet, bottom up."
            },
            {
              "move": "Crab walk backwards from B to C",
              "how": "Hands behind, bottom up."
            },
            {
              "move": "Leap over 3 foam hurdles (one big jump each)",
              "how": "Two feet, bend the knees to land."
            },
            {
              "move": "Balance a beanbag on your head across the balance blocks",
              "how": "Look straight ahead, walk the rope."
            },
            {
              "move": "Squat jumps — jump from a squat, land in a squat ×3",
              "how": "Bend the knees, spring up, land soft."
            },
            {
              "move": "Star jump finish",
              "how": "Arms and legs out wide, land quiet."
            }
          ],
          "cues": [
            "Eyes up and forward",
            "Arms out wide",
            "Small controlled steps",
            "Bend the knees a little"
          ],
          "equipment": "10 cones, 3 foam hurdles, 10 beanbags, balance blocks",
          "adaptation": "Carry the beanbag in two hands instead of on the head.",
          "watchFor": "Rushing. Ask them to do the whole circuit slowly once."
        },
        {
          "order": 4,
          "category": "Athletics",
          "skill": "Relay changeover",
          "ledBy": "Coach",
          "event": "Relays",
          "cues": [
            "Look at the person coming in",
            "Hand it over, do not throw it",
            "Start moving as they get close",
            "Take it with the hand nearest them",
            "Cheer your team, all of them"
          ],
          "equipment": "12 beanbags, 20 cones, bibs",
          "adaptation": "Walk the changeover in pairs with a coach in the middle.",
          "watchFor": "Throwing the baton. Cue 'place it in the hand'.",
          "game": {
            "name": "Half and Half Relay",
            "setup": "Teams of three, split either end of a 15m run.",
            "how": "Run to the other end, hand the beanbag over, join the back of that line. Everyone runs multiple times. Do not announce a winner — announce when every team has finished.",
            "equipment": "12 beanbags, 20 cones, bibs"
          },
          "backup": "Shuttle Relay — run out, touch the cone, run back"
        }
      ]
    },
    {
      "series": 9,
      "name": "Beat your best",
      "term": "Term 1",
      "dates": [
        "Thu 18 Mar",
        "Thu 25 Mar"
      ],
      "weeksLabel": "Weeks 17–18 · Thu 18 & 25 Mar 2027",
      "athleticsEvent": "Long jump",
      "coachNote": "Get ready for the mini meet. This series revisits the season's core skills. Encourage 'beat your own best', never each other.",
      "rotations": [
        {
          "order": 1,
          "category": "Game",
          "skill": "Running",
          "ledBy": "Parent helper",
          "cues": [
            "Run tall — head still, eyes forward",
            "Arms bent at 90 degrees, swinging front to back not across",
            "Knees lift forward",
            "Land on the ball of the foot, light and quiet",
            "Run THROUGH the finish line, not to it"
          ],
          "equipment": "20 cones, bibs",
          "adaptation": "Shorter run, walking pace to start.",
          "watchFor": "One side always chasing — swap which animal chases each round.",
          "game": {
            "name": "Tigers and Cheetahs",
            "setup": "Two lines about 20m apart. Half the children are tigers on one line, half are cheetahs on the other.",
            "how": "On GO, one animal chases the other across to the opposite line. Tagged children swap sides and join the other animal. Swap which animal chases each round so everyone runs and everyone chases.",
            "equipment": "20 cones, bibs"
          },
          "backup": "Farmers and Chickens — run the whole width, tagged chickens become farmers"
        },
        {
          "order": 2,
          "category": "Manipulative",
          "skill": "Underarm throwing",
          "ledBy": "Coach",
          "cues": [
            "Face the target",
            "Step forward with the OPPOSITE foot",
            "Swing the arm low and straight, like a pendulum",
            "Let go at the front",
            "Point at the target after you let go"
          ],
          "equipment": "8 hula hoops, soft toys",
          "adaptation": "Throw from 1m into a hoop on the floor, two hands. Success first.",
          "watchFor": "Throwing with the same foot forward as the throwing arm. Chalk a footprint.",
          "game": {
            "name": "Target Toys",
            "setup": "A row of hula hoops on the ground at three distances — close, middle, far.",
            "how": "Children throw soft toys underarm into the hoops, choosing which one to aim at. Three throws each, cheer every attempt. Move the close hoop closer for anyone struggling.",
            "equipment": "8 hula hoops, soft toys"
          },
          "backup": "Toy Basketball — throw into the high hoop"
        },
        {
          "order": 3,
          "category": "Fitness Circuit",
          "skill": "Fitness & balance",
          "ledBy": "Parent helper",
          "course": "Challenge Trail",
          "stations": [
            {
              "move": "Bear crawl from A to B — time yourself, match it next lap",
              "how": "All fours, steady pace."
            },
            {
              "move": "Frog jump over 4 flat markers",
              "how": "Two feet, bend the knees to land."
            },
            {
              "move": "Walk the whole balance blocks without stepping off",
              "how": "Arms out, heel-to-toe, slow."
            },
            {
              "move": "One-foot balance for a slow count of 5 (both feet)",
              "how": "Look at one spot, arms out."
            },
            {
              "move": "Step over 4 foam hurdles",
              "how": "Lift the knees, keep moving."
            },
            {
              "move": "Crab walk backwards to the finish",
              "how": "Hands behind, bottom up."
            }
          ],
          "cues": [
            "Eyes up and forward",
            "Arms out wide",
            "Small controlled steps",
            "Bend the knees a little"
          ],
          "equipment": "10 cones, 4 flat markers, balance blocks, 4 foam hurdles",
          "adaptation": "Hold a hand for the balance. Count to 3, not 5.",
          "watchFor": "Frustration if they step off the rope. Reassure: 'stepping off is part of learning'."
        },
        {
          "order": 4,
          "category": "Athletics",
          "skill": "Jumping for distance",
          "ledBy": "Coach",
          "event": "Long jump",
          "cues": [
            "Bend the knees into a crouch",
            "Swing both arms back, then forward and up",
            "Push off hard with both feet",
            "Reach forward with the arms",
            "Land on two feet with knees bent, and freeze"
          ],
          "equipment": "30 cones, long jump mat or sandpit",
          "adaptation": "Standing two-foot jump from a line. No measuring — just 'land quietly'.",
          "watchFor": "Comparing with each other. Redirect: 'beat your own cone'.",
          "game": {
            "name": "Measure Your Hop",
            "setup": "A start line and a long open run.",
            "how": "Each child jumps or hops from the line and places their own cone where they landed. Next turn they try to beat their own cone. Nobody compares to anybody else — that is the whole design.",
            "equipment": "30 cones, long jump mat or sandpit"
          },
          "backup": "Frog Jump Freeze — two-foot jump, freeze the landing"
        }
      ]
    }
  ],
  "finalNight": {
    "name": "Mini meet + prizegiving",
    "date": "Thu 1 Apr 2027",
    "description": "No normal rotations. Children visit each of the four stations as a fun 'meet' — long jump (beat your own cone), high jump (scissor over a low elastic), hurdles (foam, step and run) and relays (everyone runs, no winner). Parents are invited for the last twenty minutes. Every child is named, cheered and handed a certificate individually. Finish with Parachute Games.",
    "stations": [
      "Long jump — beat your own cone from the season",
      "High jump — scissor over a low elastic (never rope)",
      "Hurdles — foam hurdles, step and run",
      "Relays — everyone runs, announce when every team finishes"
    ],
    "equipment": "30 cones, long jump mat or sandpit, 1 low elastic, 8 foam hurdles, 12 beanbags, bibs, Parachute, 10 soft balls, certificates"
  }
};
