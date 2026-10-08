/**
 * The āhei activity + event card library for Run Jump Throw.
 *
 * SOURCE: screenshots of the club's āhei resource-provider account
 * (Athletics New Zealand — Run Jump Throw activity and event cards).
 * Cards are listed alphabetically on āhei; they are grouped here by the skill
 * category printed on each card, which is what a station needs.
 *
 * Copyright Athletics New Zealand. Used under the club's resource-provider
 * licence. GATED: served only through /api/rjt — never as a static public file.
 *
 * WHAT THESE CARDS CONTAIN: the card face gives a name, a one-line description
 * and its skill category. The full activity outline (set-up, how to play,
 * equipment) sits behind each card on āhei, along with a video. So this is an
 * index of what to run, not a substitute for the card itself.
 *
 * GAPS: on some screenshots the bottom row's category tag fell below the
 * viewport, so those activities could not be filed under a category. They are
 * kept in `uncategorised` rather than guessed at.
 */

export default {
  source: 'āhei (Athletics New Zealand) Run Jump Throw activity and event cards.',

  /**
   * Game activities, grouped by the skill category on the card.
   * These map directly onto the timetable's station names.
   */
  activities: {
    'Endurance Running': [
      { name: 'Aerobic Relay Fun', description: 'Collect objects, relay run, return them.' },
      { name: 'Against the Clock', description: 'Count laps within set time, compete against clock.' },
      { name: 'Chain Run', description: 'Sprint to front in line, alternating positions.' },
      { name: 'Changing Gear', description: "Gradually adjust running speeds based on coach's pace calls." },
      { name: 'Circular Relay', description: 'Relay race with batons on a circular track.' },
      { name: 'Colour or Number', description: 'Run in marked areas, grouped by card colors.' },
      { name: 'Follow the Leader', description: "Follow leader's speed and direction changes." },
      { name: 'Hares and Hounds', description: 'Hares start ahead; hounds count overtakes.' },
      { name: 'Heart Beat', description: 'Complete laps collecting tokens while maintaining a comfortable pace.' },
      { name: 'Intervals', description: 'Fast intervals, alternating running and slow sections.' },
      { name: 'Jog and Go', description: 'Jog to boundary and back, recover, repeat.' },
      { name: 'Lap It Up', description: 'Run laps while stopping to hit a target.' },
      { name: 'Leader of the Pack', description: 'Groups run as a pack, supporting each other.' },
      { name: 'Opposites', description: "Alternate running movements, following leader's calls." },
      { name: 'Slaloms', description: 'Zigzag relay through cones, varying running styles.' },
      { name: 'Speed Up – Slow Down', description: 'Set pace changes within group runs.' },
      { name: 'Treasure Hunt', description: 'Collect or find objects while continuously moving.' },
      { name: '5 Minute Timed Run', description: 'Run, roll or walk laps for five minutes.', benchmark: true },
    ],

    'Running for speed': [
      { name: 'Formula One', description: 'Navigate an obstacle course while passing a baton in a relay race.' },
      { name: 'Here There Where', description: "Respond to coach's calls by running or skipping in specific directions." },
      { name: 'Noughts and Crosses (running strategy)', description: 'Play a running strategy game by forming patterns in hoops.' },
      { name: 'Rounding Up the Sheep', description: 'Tag sheep as the dog or re-enter paddock through gates.' },
      { name: 'Ship Wreck', description: 'Avoid sharks while sprinting between islands in a designated grid.' },
      { name: '50m Sprint', description: 'Measured, short distance sprint race for speed.', benchmark: true },
    ],

    'Running Starts': [
      { name: 'Out and Back', description: 'Partner running game.' },
      { name: 'Quick Reactions', description: 'Quick starts from various positions, racing to finish line on signal.' },
      { name: 'Quick Starts', description: 'Start from standing line or staggered positions, racing forward.' },
      { name: 'Snatchers and Taggers', description: 'Sprint to retrieve objects and return to base without being tagged.' },
    ],

    'Relay Running': [
      { name: 'Catch Me If You Can', description: 'Partner chase game involving grabbing a flag.' },
      { name: 'Round the Markers', description: 'Relay race running around two cones before passing baton.' },
      { name: 'The Middle', description: 'Relay race with baton exchanges at midpoint.' },
      { name: 'Wheel Relay', description: 'Teams run clockwise, passing baton to next runner.' },
    ],

    'Obstacle Running': [
      { name: 'Hurdles for Gold', description: 'Gather bean bags while running hurdles, competing for team points.' },
      { name: 'Over the Legs', description: "Jump over teammates' legs in a race around cones and back." },
      { name: 'Shuttle Relay', description: 'Relay with alternating flat and hurdle runs for team members.' },
    ],

    'Jumping for Distance': [
      { name: 'Jump Wars', description: "Teams jump alternately to push marker onto opponent's side." },
      { name: 'Jumping for Distance', description: "Jump for points based on landing zones' distances." },
      { name: 'Precision Long Jump', description: 'Perform long jump into marked zones focusing on technique.' },
      { name: 'River Jump', description: "Jump over increasing distances to cross a 'river'." },
      { name: 'Team Jump for Distance', description: 'Teams jump consecutively aiming for greatest combined distance.' },
      { name: 'Squat Jump', description: 'Jump from squat for maximum distance.', benchmark: true },
      { name: 'Standing Jump', description: 'Measured jump for distance.', benchmark: true },
    ],

    'Jumping for height': [
      { name: 'Continuous High Jump', description: 'Alternating scissor jumps over progressively higher hurdles.' },
      { name: "High 10's", description: 'Run and jump to high-five partners multiple times.' },
      { name: 'High Jump Relay', description: 'Relay race with jumping hurdles and dodging poles.' },
      { name: 'The Electric Fence', description: 'Jump over rope "electric fence" using scissor technique.' },
      { name: 'Vertical Jump', description: 'Measure vertical jump using wall markings.', benchmark: true },
    ],

    'Jumping Combinations': [
      { name: 'Frogs and Flies', description: 'Frogs leap, flies run; frogs tag flies on signal.' },
      { name: 'Hop Run Hop', description: 'Relay combining hopping, running, and tagging teammates.' },
      { name: 'Leap the Gap', description: 'Leap over markers to earn points based on distance.' },
      { name: 'Traffic Light Commands', description: "Move based on coach's traffic light commands." },
      { name: 'Triple Trouble', description: 'Practice hop-step-jump sequence with adapted spacing for skill levels.' },
      { name: 'Pole Flying', description: 'Pole vaulting into a soft landing area.' },
    ],

    'Throwing-Pushing': [
      { name: 'Beat the Ball', description: 'Relay combining passing, running, and chest passes.' },
      { name: 'Over the Back Fence', description: "Push-throw objects over a fence into opponent's area." },
      { name: 'Target Shot', description: 'Throw objects to targets for cumulative team points.' },
      { name: 'Team Put for Distance', description: 'Relay putting objects for the farthest combined distance.' },
      { name: 'Three Little Piggies', description: 'Piggy intercepts ball while others pass it.' },
    ],

    'Throwing-Slinging': [
      { name: 'Hoop It', description: 'Sling rings to land on cones as targets.' },
      { name: 'Low to High Watch', description: 'Side-on discus throw for distance, emphasising form.' },
      { name: 'Rollin', description: 'Grip and roll discus through cones, practicing technique.' },
      { name: 'Run the Gauntlet', description: 'Roll discus to hit runners feet and switch roles.' },
      { name: 'The Swing', description: 'Throw discus-like objects to score in zones.' },
      { name: 'Throlf', description: 'Throw to targets/obstacles, fewest throws wins.' },
    ],

    'Throwing-Pulling': [
      { name: 'Football Throw Ins', description: 'Overhead throws for distance using large balls.' },
      { name: 'Force Back', description: 'Throw objects to push partner back with increasing distance.' },
      { name: 'Team Scatter Ball', description: 'Throw, retrieve, and score points while switching roles.' },
      { name: 'Turbo Throw', description: 'Use run-up to increase throwing distance with precision.' },
      { name: 'Volleyball', description: 'Overhead ball passing game similar to volleyball.' },
      { name: 'Bombs Away', description: 'Overarm throw to hit target over barrier.', benchmark: true },
      { name: 'Vortex Throw', description: 'Throw a vortex for maximum distance.', benchmark: true },
    ],

    'Throwing-Heaving': [
      { name: 'Let It Go High', description: 'Throw hammer-like object overhead into zones.' },
      { name: 'Shoot the Hoop', description: 'Overhead throw aiming to pass through held hoops.' },
    ],

    'Warm Up': [
      { name: 'Bench Ball', description: 'Pass, move and build your bench.' },
      { name: 'Cone Grab', description: 'React quickly and grab the cone.' },
      { name: 'Cone Up, Cone Down', description: 'Fast-moving reaction game with teamwork.' },
      { name: 'Frisbee Flop', description: 'Protect your implement while attacking others.' },
      { name: 'King of the Ring', description: 'Dodge, react and stay in play.' },
      { name: 'Relays', description: 'Fast-paced races with simple obstacles.' },
      { name: 'Shark-infested Waters', description: 'Jump, move and cross safely.' },
      { name: 'Who Let the Dogs Out', description: 'Chase, dodge and protect your tail.' },
    ],
  },

  /**
   * Cards whose category tag fell below the screenshot viewport. Listed rather
   * than guessed — most are strongly implied by their description, but filing
   * one wrongly would send a coach to the wrong station.
   */
  uncategorised: [
    { name: 'Bin It', description: 'Throw objects into bins or hoops to score points.' },
    { name: 'Boulder Heave', description: 'Backwards throw medicine ball for maximum distance.' },
    { name: 'Break the Code', description: 'Collect letters by running to stations and unscrambling a word.' },
    { name: 'Bucket Ball', description: 'Throw large balls into hoops for points.' },
    { name: 'Event: Fun Team Event', description: 'Add teamwork, laughter and choice to your day.' },
    { name: 'Fast Feet Speed Ladder', description: 'Sprint through ladder and back for time.', benchmark: true },
    { name: 'Hurdle Shuttle Sprint', description: 'Sprint and hurdle for time.', benchmark: true },
    { name: 'Medicine Ball Push', description: 'Push a medicine ball for distance.', benchmark: true },
    { name: 'Noughts and Crosses (card flip)', description: 'Flip cards for team symbols; Jokers add challenges.' },
    { name: 'Numbers', description: 'Listen, remember and react quickly.' },
    { name: 'Opposite Pair Runs', description: 'Partner running with variable lap lengths.' },
    { name: 'Opposite Pairs Run', description: 'Run opposing directions on a circuit, meeting halfway and racing back.' },
    { name: 'Paper Scissors Rock', description: 'Hop to meet opponents, play game and continue.' },
    { name: 'Partner Challenges', description: 'Partner strength, balance and control challenges.' },
    { name: 'Partner Touch', description: 'Partners jog, touch hands, swap sides.' },
    { name: 'Point to Point', description: 'Partner runs between landmarks, switching roles.' },
    { name: 'Rope Skipping', description: 'Skip continuously for 15 seconds.', benchmark: true },
  ],

  /**
   * Event cards — the track, field and adaptive event guides, each of which
   * pairs with a timetable station.
   */
  events: {
    'Sprint Running Event': [
      { name: 'Event: 60m Sprint', description: 'Athletics event card for 60m sprint running races.' },
      { name: 'Event: 100m Sprint', description: '100m sprint running event.' },
      { name: 'Event: 200m Sprint', description: '200m sprint running event.' },
    ],
    'Middle Distance Running Event': [
      { name: 'Event: 800m', description: 'Athletics event card for middle distance and distance running.' },
    ],
    'Cross Country Event': [
      { name: 'Event: Cross Country', description: 'Cross country alternative: station based colour run.' },
      { name: 'Event: Cross Country', description: 'Long course cross country option.' },
      { name: 'Event: Cross Country', description: 'Engagement option: obstacle / adventure course.' },
      { name: 'Event: Cross Country', description: 'Course to engage younger runners and those less confident in running a long way.' },
    ],
    'Relay Running Event': [
      { name: 'Event: Relay', description: 'Athletics event card for relay races.' },
    ],
    'Race Walking Event': [
      { name: 'Event: Race Walking', description: 'Athletics event card for race walking.' },
    ],
    'Hurdle Event Guide': [
      { name: 'Event: Hurdles', description: 'Athletics event card for hurdles station.' },
    ],
    'High Jump Event': [
      { name: 'Event: High Jump', description: 'Athletics event card for high jump events.' },
      { name: 'Event: High Jump', description: 'Perform a high jump over a low bar or elastic.' },
      { name: 'Event: High Jump', description: 'Build confidence and practise scissor jump skills.' },
    ],
    'Long Jump Event': [
      { name: 'Event: Long Jump', description: 'Athletics event card for long jump.' },
      { name: 'Event: Long Jump', description: 'Perform a long jump for distance.' },
      { name: 'Event: Long Jump', description: 'Build speed, take-off and landing confidence.' },
    ],
    'Triple Jump Event': [
      { name: 'Event: Triple Jump', description: 'Athletics event card for triple jump.' },
    ],
    'Shot Put Event Guide': [
      { name: 'Event: Shot Put', description: 'Athletics event card for shot put station.' },
    ],
    'Discus Event Guide': [
      { name: 'Event: Discus', description: 'Athletics event card for discus station.' },
    ],
    'Hammer Event Guide': [
      { name: 'Event: Hammer Throw', description: 'Athletics event card for hammer throw.' },
    ],
    'Javelin Event Guide': [
      { name: 'Event: Javelin', description: 'Athletics event card for javelin station.' },
    ],

  },

  /**
   * Adaptive / seated event cards (from the ANZ Adaptive RJT resource). Kept as
   * their own group rather than attached to stations: these are the inclusion
   * alternatives a coach reaches for when a station needs adapting.
   */
  adaptiveEvents: {
    'Seated Discus': [
      { name: 'Event: Seated Discus', description: 'Sling a soft discus side-on for maximum distance.' },
    ],
    'Seated Long Push': [
      { name: 'Event: Seated Long Jump', description: 'From a stationary start, execute one powerful push.' },
    ],
    'Seated Shot Put': [
      { name: 'Event: Seated Shot Put', description: 'Push a shot for maximum distance while seated.' },
    ],
    'Seated Vortex Throw': [
      { name: 'Event: Seated Vortex Throw', description: 'Throw a soft Vortex Howler forward overarm.' },
    ],
    'Club Throw': [
      { name: 'Event: Seated Club Throw', description: 'Propel a wooden club as far as possible into a throwing sector.' },
    ],
    'Medicine Ball Push': [
      { name: 'Event: Seated Medicine Ball', description: 'Push a weighted ball vertically against a wall scale for maximum height.' },
    ],
    'Powerchair Sprints': [
      { name: 'Event: Powerchair Sprint', description: 'Accelerate a powerchair down a straight lane.' },
    ],
    'Precision Power Slalom': [
      { name: 'Event: Precision Power Slalom', description: 'Weave a powerchair through slalom cones.' },
    ],
    'Precision Target Drive': [
      { name: 'Event: Precision Target Drive', description: 'Drive and position a lightweight ball into scoring rings using a ramp.' },
    ],
    'Wheelchair Obstacle Navigation': [
      { name: 'Event: Wheelchair Obstacle Navigation', description: 'Navigate a wheelchair through a series of slalom cones.' },
    ],
    'Wheelchair Sprints': [
      { name: 'Event: Wheelchair Sprint', description: 'Push a wheelchair as fast as possible in a straight lane.' },
    ],
  },

  /**
   * Which library category belongs to each timetable skill, so a station can
   * look up its own activities. `events` keys are matched the same way.
   */
  skillCategories: {
    'run-speed': ['Running for speed'],
    'run-starts': ['Running Starts'],
    'run-relays': ['Relay Running', 'Relay Running Event'],
    'jump-distance': ['Jumping for Distance', 'Long Jump Event'],
    'jump-height': ['Jumping for height', 'High Jump Event'],
    'jump-combination': ['Jumping Combinations', 'Triple Jump Event'],
    'throw-pushing': ['Throwing-Pushing', 'Shot Put Event Guide'],
    'throw-slinging': ['Throwing-Slinging', 'Discus Event Guide'],
    'throw-pulling': ['Throwing-Pulling', 'Javelin Event Guide'],
    'throw-heaving': ['Throwing-Heaving', 'Hammer Event Guide'],
    /* 400m is run as a sprint. āhei's sprint event cards cover 60/100/200m —
       there is no 400m-specific card, so the sprint cards are the closest fit. */
    'sprints': ['Sprint Running Event'],
    'sprint-60': ['Sprint Running Event'],
    'sprint-100': ['Sprint Running Event'],
    'sprint-200': ['Sprint Running Event'],
    'sprint-400': ['Sprint Running Event'],
    'track-60-blocks': ['Sprint Running Event'],
    'track-100-blocks': ['Sprint Running Event'],
    'track-200-blocks': ['Sprint Running Event'],
    'distance-800': ['Middle Distance Running Event', 'Race Walking Event'],
    'distance-1500': ['Middle Distance Running Event', 'Cross Country Event', 'Race Walking Event'],
    'distance-1500-60': ['Middle Distance Running Event', 'Sprint Running Event'],
    'run-endurance': ['Endurance Running', 'Race Walking Event'],
    'run-obstacles': ['Obstacle Running', 'Hurdle Event Guide'],
    'long-jump': ['Long Jump Event'],
    'high-jump': ['High Jump Event'],
    'shot-put': ['Shot Put Event Guide'],
    'discus': ['Discus Event Guide'],
  },
};
