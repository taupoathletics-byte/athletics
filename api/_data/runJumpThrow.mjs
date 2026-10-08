/**
 * Run Jump Throw — Term 4 2026 / Term 1 2027 circuit timetable.
 *
 * ── SOURCES ──────────────────────────────────────────────────────────────────
 * 1. Timetable + grade rotation: "Copy of Season Schedule Working Document
 *    26_27.docx" — the club co-ordinator's working document. Station labels and
 *    comments are reproduced as written there (including the co-ordinator's own
 *    question marks, which are flagged rather than silently "corrected").
 *
 * 2. RJT skill definitions + inclusion modifications: "7-0-017 Athletics NZ
 *    Adaptive Run Jump Throw Coaching Resource", Athletics New Zealand, 2023.
 *    Copyright 2023 Athletics New Zealand Inc — used under the club's
 *    resource-provider licence. NOT for public distribution, which is why this
 *    data is served only through the gated /api/rjt endpoint and deliberately
 *    does NOT live under public/ or src/.
 *
 * The Adaptive resource is a companion to the Run Jump Throw Coaching Manual.
 * It supplies the skill categories and the modifications; the individual
 * activity outlines live in the manual / activity cards (ARJT p.4: "ARJT does
 * not provide a detailed outline of activities... individuals must access the
 * Run Jump Throw Coaching Manual for this information").
 *
 * ── HOW THE PROGRAMME RUNS ───────────────────────────────────────────────────
 * Five stations a night, and a DIFFERENT circuit every week — unlike Get Set Go,
 * nothing repeats for two weeks. Grades rotate through the five stations weekly
 * (see `rotation`).
 */

export default {
  programme: {
    title: 'Run Jump Throw',
    subtitle: 'Taupō Athletics Club — grades 7 to 11+',
    ages: '6–11 years (ANZ Run Jump Throw target age group)',
    structure: 'Five stations a night. A different circuit every week — no two-week repeat.',
    about:
      'Run Jump Throw is Athletics New Zealand\u2019s foundation programme for teaching ' +
      'athletics-specific skills. The emphasis is on developing fundamental movement ' +
      'patterns in a fun, participant-centred environment rather than on results.',
    howItRuns: [
      'Five stations run at once, each led by a helper. Grades rotate one station to the right each week.',
      'Every week is a fresh combination of stations — check the night you are running.',
      'Every station is built around a Run Jump Throw fundamental: run, jump or throw.',
      'Running stays short, fast and fun. Every child is named and cheered — never ranked against each other.',
      'Measure nights (see the night\u2019s note) are for recording personal bests, not for competition placings.',
    ],
    phases: {
      jumping:
        'Jumping is explosive and has three phases: preparation, propulsion, and follow-through (landing). ' +
        'Teach and watch all three.',
      throwing:
        'Throwing is explosive and has three phases: preparation, propulsion, and follow-through. ' +
        'Work the fundamental patterns — pulling, pushing, slinging, heaving — with modified equipment ' +
        'before any event-specific technique.',
      running:
        'Running is a continuous skill — observe it as a whole, working from the ground up: ' +
        'feet and legs, then torso, arms, and head.',
    },
    /** The STEP model from the ANZ resource, for modifying any station. */
    step: {
      title: 'STEP — modifying any station',
      items: [
        { letter: 'S', label: 'Space', detail: 'Shrink or grow the area, shorten distances, move the start line up the field.' },
        { letter: 'T', label: 'Task', detail: 'Simplify the action, reduce the number of steps or calls, allow more time.' },
        { letter: 'E', label: 'Equipment', detail: 'Lighter, smaller, softer, brighter or easier-to-grip implements. Cones instead of hurdles.' },
        { letter: 'P', label: 'People', detail: 'Pair with a guide or support person. Never rank children against each other.' },
      ],
    },
    /** Broad inclusion guidance drawn from the ANZ Adaptive resource. */
    inclusionNotes: [
      'Guides can run beside an athlete with a tether, or stand ahead and guide with sound (clapping, calling).',
      'Give clear, minimal instructions and demonstrate visually — many athletes do better seeing it than hearing it.',
      'For wheelchair users, running becomes pushing: a short push (12\u20132 o\u2019clock on the wheel) for acceleration, a long push (12\u20133) for momentum.',
      'In relay activities, a tap on the shoulder can replace passing a baton.',
      'If an athlete cannot jump, substitute a throw for distance or height over the same obstacle.',
      'Use an elastic crossbar rather than a hard bar for high jump.',
      'Start jumping with no obstacle at all, then low objects, then higher — perception of the obstacle is often the hard part.',
      'Check surfaces: flat and even lowers tripping risk, and some athletes strongly prefer grass over sand.',
      'Extra space is usually needed for athletes with a visual impairment — allow for it.',
    ],
    source: {
      timetable: 'Club season schedule working document 2026/27 (co-ordinator).',
      skills: 'Athletics NZ Adaptive Run Jump Throw Coaching Resource, 2023 (ARJT).',
      manualNote:
        'Individual activity outlines are in the ANZ Run Jump Throw Coaching Manual and activity cards — ' +
        'this timetable gives the skill, the set-up and the coaching points for each station.',
    },
  },

  /**
   * Station content. Keyed by the skill id used in the night listings.
   * `what` / `cues` are the coaching content; `modify` is the inclusion guidance
   * drawn from the ANZ Adaptive resource.
   */
  skills: {
    /* ── RUNNING ───────────────────────────────────────────────────────────── */
    'run-speed': {
      name: 'Running for Speed',
      station: 'RJT run speed',
      category: 'Running',
      icon: 'bolt',
      what: 'Short, fast efforts — acceleration over a short distance, with full recovery between runs. Speed work is quality work: keep it brief and stop while they are still enjoying it.',
      cues: [
        'Run tall — head still, eyes up and forward',
        'Arms bent at about 90°, swinging front to back, not across the body',
        'Knees lift forward and up',
        'Land light on the ball of the foot',
        'Run THROUGH the finish line, not to it',
      ],
      setup: 'Two cones, 15–30m apart depending on age. Run in small groups, three or four at a time.',
      equipment: 'Cones. Nothing else needed.',
      modify: [
        'Shorten the distance, or start further up the field.',
        'Wheelchair users push for speed — short push for acceleration.',
        'Replace "walk / jog / run" with "quarter / half / full effort".',
        'Guide runs alongside with a tether, or calls from the finish line.',
      ],
      watchFor: 'Slowing down before the line. Put a cone 3m past the finish and ask them to run to that one.',
    },
    'run-endurance': {
      name: 'Running for Endurance',
      station: 'RJT run endurance',
      category: 'Running',
      icon: 'directions_run',
      what: 'Sustained running at a comfortable pace — laps, or a continuous relay, where the goal is keeping going rather than going fast.',
      cues: [
        'Find a pace you can hold and keep talking at',
        'Relaxed shoulders, steady breathing',
        'Same speed all the way round — no sprinting off the start',
        'Finish strong, not spent',
      ],
      setup: 'A marked loop or lap course. Time the effort rather than the distance (e.g. 3–5 minutes).',
      equipment: 'Cones to mark the loop.',
      modify: [
        'Reduce the number of laps or shorten the loop.',
        'Wheelchair users push for endurance — long push for momentum.',
        'Surfaces must allow easy rolling and changes of direction.',
        'Allow rest breaks; build the duration over the season.',
      ],
      watchFor: 'Going out too hard on lap one. Start the group together and let the pace settle.',
    },
    'run-starts': {
      name: 'Starts (Standing Start)',
      station: 'RJT run starts',
      category: 'Running',
      icon: 'play_arrow',
      what: 'Reaction and first-step acceleration from a standing start. This is the beginning of every race, so it is worth teaching properly and keeping it simple.',
      cues: [
        'Feet hip-width, one foot slightly forward',
        'Weight slightly forward, knees soft',
        'On "Set" — still and quiet',
        'On "Go" — drive out low for the first few steps, then rise',
        'React to the sound, do not watch for it',
      ],
      setup: 'A start line, and a "Go" signal that is the same every time — a clap, a whistle or a call.',
      equipment: 'Cones for the start line.',
      modify: [
        'Guide can physically guide the athlete to the line and show where feet and hands go, if they are comfortable with it.',
        'Guide stands behind and calls "Go" for athletes with a visual impairment.',
        'Standing start only — this is not a block session for this age group.',
      ],
      watchFor: 'Standing up too early out of the start. Cue "stay low, then grow tall".',
    },
    'run-relays': {
      name: 'Relays',
      station: 'RJT run relays',
      category: 'Running',
      icon: 'sync_alt',
      what: 'Teams of four, each running a leg and passing on. The skill is the changeover — and the fun is the team.',
      cues: [
        'Look after the pass before you worry about speed',
        'Run through the changeover, do not stop',
        'Call clearly to your partner',
        'Keep to your lane or your marked channel',
      ],
      setup: 'Four legs per team, marked channels. Changeover zones marked with cones.',
      equipment: 'Batons — or beanbags, which are easier to grip.',
      modify: [
        'A tap on the shoulder can replace passing a baton.',
        'A beanbag or other easily-gripped object can replace the baton.',
        'For wheelchair users, runners tap the shoulder and pass to the side to avoid collision.',
      ],
      watchFor: 'A baton dropped in the changeover becoming a drama. Practise the pass on its own first.',
    },
    'run-obstacles': {
      name: 'Running Over Obstacles',
      station: 'RJT run over obstacles',
      category: 'Running',
      icon: 'fence',
      what: 'Running while negotiating low obstacles — keeping rhythm and posture rather than breaking stride and climbing over things.',
      cues: [
        'Eyes up — look past the obstacle, not at it',
        'Keep your rhythm through the obstacle',
        'Land and keep running — no walking in between',
        'Arms help you balance',
      ],
      setup: 'A short course of low, soft obstacles. Nothing rigid, nothing high.',
      equipment: 'Cones, low soft hurdles, flat markers.',
      modify: [
        'Lower the obstacles, or use cones to run around instead.',
        'Athletes can complete a circle around the obstacle and continue.',
        'Avoid rigid hurdles. Soft or elastic obstacles only.',
        'Remove obstacles entirely for athletes where tripping is a risk.',
      ],
      watchFor: 'Children watching the obstacle instead of the space beyond it. Cue "eyes up".',
    },

    /* ── JUMPING ───────────────────────────────────────────────────────────── */
    'jump-distance': {
      name: 'Jumping for Distance',
      station: 'RJT jump distance',
      category: 'Jumping',
      icon: 'straighten',
      what: 'Two-footed jumping for distance — the foundation of long jump. Preparation, propulsion, landing.',
      cues: [
        'Swing the arms back on preparation, then up and forward on take-off',
        'Both feet take off together',
        'Reach forward with the feet on landing',
        'Land on both feet, knees soft, and hold the landing',
      ],
      setup: 'A take-off line and a safe landing area (sand pit, mats or marked grass).',
      equipment: 'Take-off marker, landing area. Chalk or sand for a 1m x 1m take-off area for athletes with a visual impairment.',
      modify: [
        'Allow a larger take-off area (1m x 1m of chalk or sand) for athletes with a visual impairment.',
        'Wheelchair users can push for distance; measure from the take-off zone to where they stop after the last push.',
        'Consider the surface — some athletes prefer grass to sand.',
        'Take care around joints, particularly hips and spine, for athletes with short stature.',
      ],
      watchFor: 'A one-footed take-off creeping in. Go back to standing two-footed jumps.',
    },
    'jump-combination': {
      name: 'Combination Jumps',
      station: 'RJT jump combination',
      category: 'Jumping',
      icon: 'multiple_stop',
      what: 'Linked jumps — a sequence of hops, steps and jumps, or jumps between markers. Develops rhythm, coordination and elastic strength.',
      cues: [
        'Land and go again straight away — do not stop between jumps',
        'Same foot to same foot for hops, alternating for steps',
        'Arms drive each jump',
        'Eyes up and forward down the line',
      ],
      setup: 'A line of flat markers or low cones set at a distance the children can actually reach.',
      equipment: 'Flat markers or low cones, 5–8 in a line.',
      modify: [
        'Shorten the gaps, or reduce the number of jumps.',
        'Lower any obstacles; encourage a decrease in speed approaching them.',
        'Athletes with a limb impairment may find one side harder — use lower or closer markers on that side.',
        'Start with the jumps on flat ground and no obstacle at all.',
      ],
      watchFor: 'The sequence falling apart into single jumps. Shorten the gaps until the rhythm returns.',
    },
    'jump-height': {
      name: 'Jumping for Height',
      station: 'RJT jump height',
      category: 'Jumping',
      icon: 'height',
      what: 'Jumping up — vertically, or over a low obstacle. The foundation of high jump, taught here as a scissor or a simple two-footed jump.',
      cues: [
        'Bend the knees on preparation, then drive up',
        'Swing both arms up to help you lift',
        'Land on both feet, knees soft',
        'Look up and forward, not down at the bar',
      ],
      setup: 'A soft landing area, and a low elastic crossbar or a line to jump over.',
      equipment: 'Elastic crossbar (never a rigid bar at this age), mats, cones.',
      modify: [
        'Use an elastic crossbar instead of a hard bar.',
        'Wheelchair users can throw an object over the bar and keep raising it until they knock it off.',
        'Start by jumping onto a mat with nothing in front, then graduate to jumping over something.',
        'Encourage athletes to try jumping forwards, sideways or backwards over an obstacle — let them explore.',
      ],
      watchFor: 'Jumping onto a hard surface. Mats or sand every time.',
    },

    /* ── THROWING ──────────────────────────────────────────────────────────── */
    'throw-pushing': {
      name: 'Throwing — Pushing',
      station: 'RJT throw pushing',
      category: 'Throwing',
      icon: 'sports_handball',
      what: 'The push — the fundamental behind shot put. The implement leaves the hand from the shoulder, pushed rather than slung.',
      cues: [
        'Implement at the neck or shoulder, elbow up',
        'Push away from the shoulder, fast and straight',
        'Follow through, then stay behind the line',
        'Keep the wrist firm',
      ],
      setup: 'A throwing line, a clear landing area, everyone behind the line and facing the same way.',
      equipment: 'Light medicine balls, beanbags or soft shot. Nothing heavy.',
      modify: [
        'Offer different sizes and shapes of implement — lighter is almost always better.',
        'Athletes with short stature may not reach overhead safely; check before any overhead push.',
        'Seated throwers should be positioned facing the throwing direction, with the wheelchair secured or held.',
        'Wheelchair users need extra space, and can tip if weight is added — always secure or support.',
      ],
      watchFor: 'Children wandering into the landing area. One straight throwing line, everyone behind it.',
    },
    'throw-slinging': {
      name: 'Throwing — Slinging',
      station: 'RJT throw slinging',
      category: 'Throwing',
      icon: 'rotate_right',
      what: 'The sling — the fundamental behind discus. A long, swinging arm action that lets the implement fly out sideways.',
      cues: [
        'Long arm, wide swing',
        'Let the implement swing out, do not force it',
        'Turn the shoulders with the swing',
        'Finish tall and balanced, facing the throw',
      ],
      setup: 'A throwing line with a wide, clear landing sector. Never throw towards other children.',
      equipment: 'Quoits, rings, frisbees or soft discs.',
      modify: [
        'Care with twisting for athletes with short stature — check comfort first.',
        'Different coloured implements help partially-sighted athletes see the implement.',
        'Reduce the arm swing range if balance is an issue.',
      ],
      watchFor: 'Throwing across the line. Mark a clear sector and stand the group behind it.',
    },
    'throw-pulling': {
      name: 'Throwing — Pulling',
      station: 'RJT throw pulling',
      category: 'Throwing',
      icon: 'south',
      what: 'The pull — a downward or backward pulling action, developing the arm and torso strength that throwing needs.',
      cues: [
        'Reach up and back first',
        'Pull down and through, hard',
        'Use the whole body, not just the arm',
        'Finish with the hands low and the body balanced',
      ],
      setup: 'A clear throwing line. Pairs or small groups with plenty of space between them.',
      equipment: 'Beanbags, light balls, ropes or pull-along equipment.',
      modify: [
        'Any implement that can be gripped works — the movement pattern matters, not the object.',
        'Single-handed if double-handed grip is difficult, encouraging the other arm where possible.',
        'Provide varied equipment for athletes with limited grip.',
      ],
      watchFor: 'Arms only, no body. Cue "reach, then pull with your whole body".',
    },
    'throw-heaving': {
      name: 'Throwing — Heaving',
      station: 'RJT throw heaving',
      category: 'Throwing',
      icon: 'north',
      what: 'The heave — an overhead throw for height or distance. Big, whole-body action and a favourite at this age.',
      cues: [
        'Both hands on the implement, up behind the head',
        'Bend the knees, then drive up and forward',
        'Release up and out, not down',
        'Follow through — do not stop dead',
      ],
      setup: 'A line to throw from, with a wide clear area. Everyone facing the same direction.',
      equipment: 'Light medicine balls, heavy-ish beanbags, soft balls.',
      modify: [
        'Safety first with overhead throws for athletes with short stature or restricted arm movement — go lighter or change the activity.',
        'Seated throwers can heave from a secured seated position.',
        'Varied implement sizes help with grip problems.',
      ],
      watchFor: 'Heaving the ball straight up and onto their own head. Cue "up and AWAY, not up".',
    },

    /* ── TRACK EVENTS ──────────────────────────────────────────────────────── */
    'sprints': {
      name: 'Sprints',
      station: 'Sprints',
      category: 'Track',
      icon: 'speed',
      what: 'Short track races — a sprint over 60–100m, run as a race or in heats. Full effort over a short distance with proper recovery.',
      cues: [
        'Standing start: on your marks, set, go',
        'Drive out low, then rise and run tall',
        'Arms front to back, not across',
        'Run through the finish, do not ease off before it',
      ],
      setup: 'A straight with marked lanes or a clear channel. Races in small groups.',
      equipment: 'Cones for lanes and finish. Stopwatch if timing.',
      modify: [
        'Shorten the distance for younger grades or where needed.',
        'Guide runners alongside with a tether.',
        'Replace walk/jog/run with quarter/half/full effort.',
      ],
      watchFor: 'False starts becoming a habit — recall the race and start again, as the RJT rules do.',
    },
    'sprint-60': {
      name: '60m',
      station: '60m',
      category: 'Track',
      icon: 'speed',
      what: 'Short sprint over 60m — the standard short sprint for this age group.',
      cues: [
        'Explode out of the start, then relax into top speed',
        'Stay in your lane all the way through the line',
        'Run tall, arms driving front to back',
      ],
      setup: '60m marked straight, lanes or a clear channel, finish line clearly marked.',
      equipment: 'Cones, stopwatch.',
      modify: ['Shorten the distance if needed.', 'Guide alongside with a tether where required.'],
      watchFor: 'Wandering lanes. Mark channels with cones.',
    },
    'sprint-100': {
      name: '100m',
      station: '100m',
      category: 'Track',
      icon: 'speed',
      what: 'The classic 100m sprint — acceleration, top speed, and holding form to the line.',
      cues: [
        'Drive phase first 15–20m, then run tall',
        'Relax the shoulders at top speed',
        'Hold your form right through the finish line',
      ],
      setup: 'A 100m straight with lanes or clear channels.',
      equipment: 'Cones, stopwatch, finish line marker.',
      modify: ['Shorten the distance if needed.', 'Guide alongside with a tether where required.'],
      watchFor: 'Slowing down before the line. Run to a cone 5m past the finish.',
    },
    'sprint-200': {
      name: '200m',
      station: '200m',
      category: 'Track',
      icon: 'speed',
      what: '200m — a sprint that also tests the bend and pacing. Often run as a timed effort.',
      cues: [
        'Fast out of the start, but leave something for the last 50m',
        'Lean into the bend, do not fight it',
        'Drive through the finish',
      ],
      setup: 'A 200m course with a marked bend and finish.',
      equipment: 'Cones, stopwatch.',
      modify: ['Shorten the distance or run a straight instead of the bend where needed.'],
      watchFor: 'Going out too hard and fading badly. Teach even pacing.',
    },
    'sprint-400': {
      name: '400m',
      station: '400m',
      category: 'Track',
      icon: 'speed',
      what: '400m — one lap, and the hardest sprint at this age. Pacing matters more than raw speed.',
      cues: [
        'Strong start, but settle — do not sprint the first 100m',
        'Relax and hold form through the back straight',
        'Everything you have left down the home straight',
      ],
      setup: 'A full lap, marked and marshalled.',
      equipment: 'Cones, stopwatch.',
      modify: ['Run a shorter lap, or split into a relay where a full lap is too much.'],
      watchFor: 'Children going off far too fast and walking the last 100m. Teach the split.',
    },
    'distance-800': {
      name: '800m',
      station: '800m',
      category: 'Track',
      icon: 'timer',
      what: '800m — two laps, run at a controlled pace with a strong finish.',
      cues: [
        'Even pace is the whole race',
        'Relaxed shoulders, steady breathing',
        'Start the push with 200m to go',
      ],
      setup: 'Two laps, marshalled, with a finish funnel.',
      equipment: 'Cones, stopwatch.',
      modify: ['Reduce to a single lap where needed.', 'Allow walking recovery between laps if appropriate.'],
      watchFor: 'It turning into a jog. Give them a pace target.',
    },
    'distance-1500': {
      name: '1500m',
      station: '1500m',
      category: 'Track',
      icon: 'timer',
      what: '1500m — the long track race of the night. Pacing, patience and finishing.',
      cues: [
        'Settle into a pace you can hold',
        'Do not chase the leaders early',
        'Last lap: lift',
      ],
      setup: 'Marked course with lap counters or a caller.',
      equipment: 'Cones, stopwatch, lap caller.',
      modify: ['Shorten the distance, or run it as a team relay.'],
      watchFor: 'Losing count of laps. Have a helper call each lap.',
    },
    /* 1500m/60m on 3 Dec is a shared station — oldest grades run 1500m, others 60m. */
    'distance-1500-60': {
      name: '1500m / 60m',
      station: '1500m/60m',
      category: 'Track',
      icon: 'timer',
      what: 'Split station: the older grades run 1500m while the younger grades run 60m sprints. Run as two groups at the same station.',
      cues: [
        '1500m group: even pace, patience, finish strong',
        '60m group: explode out, run tall, through the line',
      ],
      setup: 'Two adjacent setups — a marked 1500m course and a 60m straight. One helper per group.',
      equipment: 'Cones, stopwatch, finish markers.',
      modify: ['Match the distance to the athlete, not the grade, where it matters.'],
      watchFor: 'The two groups colliding. Keep the sprint straight well clear of the distance course.',
    },
    'track-60-blocks': {
      name: '60m timed (with blocks)',
      station: 'Track 60m timed',
      category: 'Track',
      icon: 'timer',
      what: 'Timed 60m for grade 10+ who are ready to start from blocks. A measured effort to record personal bests.',
      cues: [
        'Blocks set up for your own start, not someone else\u2019s',
        'On your marks, set, go — react to the sound',
        'Drive out low, then rise',
        'Run through the line — the clock is at the line, not before it',
      ],
      setup: 'A 60m straight with lanes, blocks for the older grades, and a timekeeper at the finish.',
      equipment: 'Starting blocks, cones, stopwatch.',
      modify: [
        'Standing start if blocks are not appropriate or comfortable.',
        'Blocks are for grade 10+ only; younger grades run a standing start.',
      ],
      watchFor: 'Blocks set too far back or too close. Check each athlete\u2019s set-up before they go.',
    },
    'track-100-blocks': {
      name: '100m timed (with blocks)',
      station: 'Track 100m blocks',
      category: 'Track',
      icon: 'timer',
      what: 'Timed 100m for grade 10+, from blocks. Record the time for personal bests.',
      cues: [
        'Set your blocks, then rehearse the start once',
        'React to the gun, do not anticipate it',
        'Drive phase, then run tall and relaxed',
        'Hold form through the line',
      ],
      setup: 'A 100m straight with lanes, blocks for grade 10+, timekeeper at the finish.',
      equipment: 'Starting blocks, cones, stopwatch.',
      modify: [
        'Standing start where blocks are not suitable.',
        'Blocks are for grade 10+ only.',
      ],
      watchFor: 'Anticipating the start. Vary the pause between "set" and "go".',
    },
    'track-200-blocks': {
      name: '200m timed (with blocks)',
      station: 'Track 200m blocks',
      category: 'Track',
      icon: 'timer',
      what: 'Timed 200m for grade 10+, from blocks, including the bend.',
      cues: [
        'Blocks set for the bend',
        'Fast out, but save something for the straight',
        'Lean into the bend rather than fighting it',
        'Through the line',
      ],
      setup: 'A 200m course with the bend marked, blocks for grade 10+, timekeeper at the finish.',
      equipment: 'Starting blocks, cones, stopwatch.',
      modify: ['Standing start where blocks are not suitable.', 'Run the straight instead of the bend if needed.'],
      watchFor: 'Cutting the bend. Mark the lane clearly.',
    },

    /* ── FIELD EVENTS ──────────────────────────────────────────────────────── */
    'long-jump': {
      name: 'Long Jump',
      station: 'Long Jump',
      category: 'Field',
      icon: 'straighten',
      what: 'Run up, take off from one foot, and land in the pit. At this age it is about a consistent run-up and a confident take-off — not about the distance.',
      cues: [
        'Same run-up every time — count your steps',
        'Accelerate through the run-up, do not slow down at the board',
        'Take off from ONE foot, driving up and forward',
        'Both feet together on landing, then stand up out of the pit',
      ],
      setup: 'A marked run-up, a take-off board or marked line, and a raked sand pit.',
      equipment: 'Sand pit and rake, take-off board or marker, cones for the run-up.',
      modify: [
        'A 1m x 1m take-off area marked in chalk or sand for athletes with a visual impairment.',
        'Wheelchair users can push for distance — measure from the take-off zone to where they stop.',
        'Shorten the run-up for athletes with short stature.',
        'Hopping into the jump can suit athletes with a leg impairment.',
      ],
      watchFor: 'Stepping over the board because the run-up is too long. Count steps and mark the start.',
    },
    'high-jump': {
      name: 'High Jump',
      station: 'High Jump',
      category: 'Field',
      icon: 'height',
      what: 'Scissor high jump — approach from the side, lead leg over, land on the feet. Safe, simple, and the correct technique for this age group.',
      cues: [
        'Curved approach — come in from the side at an angle',
        'Take off from the foot furthest from the bar',
        'Lead leg swings up and over, then the trailing leg follows',
        'Sit up as you land — land on your feet or seat, never your head',
      ],
      setup: 'An elastic crossbar or a soft bar, with a proper landing mat. Never a rigid bar over a hard surface.',
      equipment: 'High jump mats, elastic crossbar and uprights.',
      modify: [
        'Use an elastic crossbar instead of a hard bar.',
        'Start with no bar at all — just jump and land on the mat — then add the bar low.',
        'If an athlete cannot jump, substitute a throw over the bar and keep raising it.',
        'Athletes may jump forwards, sideways or backwards over the bar — let them explore.',
      ],
      watchFor: 'Landing on the feet with locked knees, or head-first landings. Mats and a sit-down landing every time.',
    },
    'shot-put': {
      name: 'Shot Put',
      station: 'Shot Put',
      category: 'Field',
      icon: 'sports_handball',
      what: 'The push from the shoulder — the same fundamental as RJT throwing-pushing, now with the shot. Technique first, distance second.',
      cues: [
        'Shot held at the neck, elbow up and out',
        'Push it away from the shoulder — never throw it like a ball',
        'Turn the shoulders and push, follow through',
        'Stay behind the line',
      ],
      setup: 'A throwing circle or marked line, with a clear landing sector and NOBODY in it.',
      equipment: 'Age-appropriate shot (light), or light medicine balls for younger grades.',
      modify: [
        'Lighter implements for younger or smaller athletes.',
        'Seated throwers face the throwing direction, with the chair secured.',
        'Athletes with a limb impairment may need a seated or supported option.',
      ],
      watchFor: 'A ball throw instead of a push. Go back to pushing from the chest against a wall or partner.',
    },
    'discus': {
      name: 'Discus',
      station: 'Discus',
      category: 'Field',
      icon: 'rotate_right',
      what: 'The sling and release — the same fundamental as RJT throwing-slinging. Standing throw first; no full turns at this age.',
      cues: [
        'Long arm, wide swing back',
        'Let the discus swing out and away',
        'Release flat and let it fly — do not force it',
        'Stay balanced and behind the line',
      ],
      setup: 'A marked circle or line with a wide, clear, coned-off landing sector.',
      equipment: 'Age-appropriate discus, or quoits and soft discs for younger grades.',
      modify: [
        'Care with twisting; check comfort before a full swing.',
        'Different coloured discs help partially-sighted athletes.',
        'Everything must be thrown in one direction, into a cleared sector.',
      ],
      watchFor: 'Children retrieving discs while others are still throwing. Retrieve only on a call.',
    },
  },

  /**
   * Weekly grade rotation across the five stations.
   * Each grade moves one station to the right every week and wraps around,
   * so a full cycle takes five weeks.
   *
   * Rows 1–4 are transcribed from the co-ordinator's rotation table.
   * Row 5 is DERIVED to complete the cycle and needs confirming — see `derivedNote`.
   */
  rotation: {
    stations: ['Station 1', 'Station 2', 'Station 3', 'Station 4', 'Station 5'],
    note: 'Each grade moves one station to the right each week; after Station 5 it wraps back to Station 1.',
    derivedNote:
      'Only four rotation rows appear in the co-ordinator\u2019s table. Because every grade shifts one station right per week, a complete cycle needs a fifth row — shown here as week 5 and marked "derived". Please confirm with the co-ordinator.',
    weeks: [
      { week: 1, grades: ['Grade 10', 'Grade 11+', 'Grade 7', 'Grade 9', 'Grade 8'] },
      { week: 2, grades: ['Grade 8', 'Grade 10', 'Grade 11+', 'Grade 7', 'Grade 9'] },
      { week: 3, grades: ['Grade 9', 'Grade 8', 'Grade 10', 'Grade 11+', 'Grade 7'] },
      { week: 4, grades: ['Grade 7', 'Grade 9', 'Grade 8', 'Grade 10', 'Grade 11+'] },
      { week: 5, grades: ['Grade 11+', 'Grade 7', 'Grade 9', 'Grade 8', 'Grade 10'], derived: true },
    ],
  },

  /**
   * The nights. `stations` is a 5-slot array; an empty slot means the
   * co-ordinator left that station blank for that night (fewer than five
   * stations running), and `blank: true` nights have no circuit at all
   * (BBQ, prizegiving).
   */
  terms: [
    {
      term: 'Term 4 2026',
      weeksLabel: 'Thursdays · 15 Oct – 10 Dec 2026',
      nights: [
        {
          date: '15 October', label: 'Thu 15 Oct 2026', note: 'First night BBQ',
          stations: [
            { slot: 1, station: 'RJT jump distance', skill: 'jump-distance' },
            { slot: 2, station: 'Long Jump', skill: 'long-jump' },
            { slot: 3, station: 'RJT run speed', skill: 'run-speed' },
            { slot: 4, station: 'Shot Put', skill: 'shot-put' },
            { slot: 5, station: 'RJT throw pushing', skill: 'throw-pushing' },
          ],
        },
        {
          date: '22 October', label: 'Thu 22 Oct 2026', note: '',
          stations: [
            { slot: 1, station: 'RJT throw slinging', skill: 'throw-slinging' },
            { slot: 2, station: 'Sprints', skill: 'sprints' },
            { slot: 3, station: 'RJT jump height', skill: 'jump-height' },
            { slot: 4, station: 'Discus', skill: 'discus' },
            { slot: 5, station: 'RJT run endurance', skill: 'run-endurance' },
          ],
        },
        {
          date: '29 October', label: 'Thu 29 Oct 2026', note: '',
          stations: [
            { slot: 1, station: 'RJT run starts', skill: 'run-starts' },
            { slot: 2, station: 'Shot Put', skill: 'shot-put' },
            { slot: 3, station: 'RJT throw pulling', skill: 'throw-pulling' },
            { slot: 4, station: 'Long Jump', skill: 'long-jump' },
            { slot: 5, station: 'RJT jump combination', skill: 'jump-combination' },
          ],
        },
        {
          date: '5 November', label: 'Thu 5 Nov 2026', note: '7 Nov — Whakatane Ribbon Day',
          stations: [
            { slot: 1, station: 'RJT run speed', skill: 'run-speed' },
            { slot: 2, station: 'Discus', skill: 'discus' },
            { slot: 3, station: 'RJT throw heaving', skill: 'throw-heaving' },
            { slot: 4, station: 'High Jump', skill: 'high-jump' },
            { slot: 5, station: 'RJT jump distance', skill: 'jump-distance' },
          ],
        },
        {
          date: '12 November', label: 'Thu 12 Nov 2026', note: 'Measure night',
          measure: true,
          stations: [
            { slot: 1, station: '400m', skill: 'sprint-400' },
            { slot: 2, station: 'Long Jump', skill: 'long-jump' },
            { slot: 3, station: '100m', skill: 'sprint-100' },
            { slot: 4, station: 'Shot Put', skill: 'shot-put' },
            { slot: 5, station: '', skill: null },
          ],
        },
        {
          date: '19 November', label: 'Thu 19 Nov 2026', note: '21 Nov — Te Awamutu Ribbon Day',
          stations: [
            { slot: 1, station: 'RJT jump height', skill: 'jump-height' },
            { slot: 2, station: 'High Jump', skill: 'high-jump' },
            { slot: 3, station: 'RJT run relays', skill: 'run-relays' },
            { slot: 4, station: 'Discus', skill: 'discus' },
            { slot: 5, station: 'RJT throw slinging', skill: 'throw-slinging' },
          ],
        },
        {
          date: '26 November', label: 'Thu 26 Nov 2026', note: '28 Nov — Bellevue Greerton Ribbon Day',
          stations: [
            { slot: 1, station: 'RJT throw pushing', skill: 'throw-pushing' },
            { slot: 2, station: 'Shot Put', skill: 'shot-put' },
            { slot: 3, station: 'RJT jump combination', skill: 'jump-combination' },
            { slot: 4, station: 'Sprints', skill: 'sprints' },
            { slot: 5, station: 'RJT run speed', skill: 'run-speed' },
          ],
        },
        {
          date: '3 December', label: 'Thu 3 Dec 2026', note: 'Measure night · 5 Dec — Paeroa Ribbon Day',
          measure: true,
          stations: [
            { slot: 1, station: 'High Jump', skill: 'high-jump' },
            { slot: 2, station: 'High Jump', skill: 'high-jump' },
            { slot: 3, station: '1500m/60m', skill: 'distance-1500-60' },
            { slot: 4, station: 'Discus', skill: 'discus' },
            { slot: 5, station: '', skill: null },
          ],
        },
        {
          date: '10 December', label: 'Thu 10 Dec 2026', note: 'Xmas BBQ', blank: true, stations: [],
        },
      ],
    },
    {
      term: 'Term 1 2027',
      weeksLabel: 'Thursdays · 4 Feb – 1 Apr 2027',
      nights: [
        {
          date: '4 February', label: 'Thu 4 Feb 2027', note: '200m timed',
          measure: true,
          stations: [
            { slot: 1, station: 'RJT throw pushing', skill: 'throw-pushing' },
            { slot: 2, station: 'High Jump', skill: 'high-jump' },
            { slot: 3, station: 'Track 200m blocks (grade 10+)', skill: 'track-200-blocks' },
            { slot: 4, station: 'Discus', skill: 'discus' },
            { slot: 5, station: 'RJT jump distance', skill: 'jump-distance' },
          ],
        },
        {
          date: '11 February', label: 'Thu 11 Feb 2027', note: '100m timed · Fri 12 Feb — Te Aroha Short & Sweet',
          measure: true,
          stations: [
            { slot: 1, station: 'RJT jump height', skill: 'jump-height' },
            { slot: 2, station: 'Long Jump', skill: 'long-jump' },
            { slot: 3, station: 'Track 100m blocks (grade 10+)', skill: 'track-100-blocks' },
            { slot: 4, station: 'Shot Put', skill: 'shot-put' },
            { slot: 5, station: 'RJT throw slinging', skill: 'throw-slinging' },
          ],
        },
        {
          date: '18 February', label: 'Thu 18 Feb 2027', note: '20 Feb — Cambridge Pentathlon',
          stations: [
            { slot: 1, station: 'RJT jump combination', skill: 'jump-combination' },
            { slot: 2, station: 'Discus', skill: 'discus' },
            { slot: 3, station: 'RJT run starts', skill: 'run-starts' },
            { slot: 4, station: 'Long Jump', skill: 'long-jump' },
            { slot: 5, station: 'RJT throw pulling', skill: 'throw-pulling' },
          ],
        },
        {
          date: '25 February', label: 'Thu 25 Feb 2027', note: 'Measure night · 27 Feb — Fairfield Ribbon Day',
          measure: true,
          stations: [
            { slot: 1, station: '800m', skill: 'distance-800' },
            { slot: 2, station: 'Long Jump', skill: 'long-jump' },
            { slot: 3, station: '', skill: null },
            { slot: 4, station: 'Discus', skill: 'discus' },
            { slot: 5, station: 'RJT run relays', skill: 'run-relays' },
          ],
        },
        {
          date: '4 March', label: 'Thu 4 Mar 2027', note: '6 & 7 March — WBOP Children\u2019s Champs',
          stations: [
            { slot: 1, station: 'RJT jump distance', skill: 'jump-distance' },
            { slot: 2, station: 'Shot Put', skill: 'shot-put' },
            { slot: 3, station: 'RJT run over obstacles', skill: 'run-obstacles' },
            { slot: 4, station: 'High Jump', skill: 'high-jump' },
            { slot: 5, station: 'RJT throw pushing', skill: 'throw-pushing' },
          ],
        },
        {
          date: '11 March', label: 'Thu 11 Mar 2027', note: 'WBOP Champs 14/15th · U20 rugby (unconfirmed)',
          stations: [
            { slot: 1, station: 'Discus', skill: 'discus' },
            { slot: 2, station: 'Long Jump', skill: 'long-jump' },
            { slot: 3, station: 'RJT run relays', skill: 'run-relays' },
            { slot: 4, station: 'Track 60m timed (grade 10+, with blocks)', skill: 'track-60-blocks' },
            { slot: 5, station: 'High Jump', skill: 'high-jump' },
          ],
        },
        {
          date: '18 March', label: 'Thu 18 Mar 2027',
          note: 'U20 rugby (unconfirmed) · source note on station 2: "Sprints? timed track — anything missing"',
          needsAttention: 'Station 2 was left as a question in the source document ("Sprints? timed track anything missing"). Confirm what runs there.',
          stations: [
            { slot: 1, station: 'RJT run speed', skill: 'run-speed' },
            { slot: 2, station: 'Sprints / timed track (to confirm)', skill: 'sprints', unconfirmed: true },
            { slot: 3, station: 'RJT throw slinging', skill: 'throw-slinging' },
            { slot: 4, station: 'Discus', skill: 'discus' },
            { slot: 5, station: 'RJT jump combination', skill: 'jump-combination' },
          ],
        },
        {
          date: '25 March', label: 'Thu 25 Mar 2027', note: 'No circuit listed in the source document',
          blank: true, stations: [],
        },
        {
          date: '1 April', label: 'Thu 1 Apr 2027', note: 'Prizegiving', blank: true, stations: [],
        },
      ],
    },
  ],

  /** Reference: the five RJT Pentathlon events (ANZ Run Jump Throw Coaching Manual p.101). */
  pentathlon: {
    title: 'RJT Pentathlon',
    about:
      'A five-event multi-event competition designed so more children can take part while measuring ' +
      'their own progress. No traditional track needed. Any event can be swapped for one that suits ' +
      'the athlete better.',
    events: [
      '50m Sprint',
      '5 Minute Timed Run',
      'Medicine Ball Push',
      'Vortex Throw',
      'Standing Jump',
    ],
  },
}
