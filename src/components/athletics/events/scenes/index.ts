import type { EventId, EventScene } from '../Stage'
import { discus } from './discus'
import { distance } from './distance'
import { highJump } from './high-jump'
import { hurdles } from './hurdles'
import { javelin } from './javelin'
import { longJump } from './long-jump'
import { relays } from './relays'
import { shotPut } from './shot-put'

/** The club's seven events. */
export const scenes: EventScene[] = [hurdles, longJump, highJump, shotPut, discus, relays, distance]

/** Every scene, including the javelin thrower in the home page header. */
export const allScenes: EventScene[] = [...scenes, javelin]

export const sceneById = Object.fromEntries(allScenes.map((s) => [s.id, s])) as Record<EventId, EventScene>
