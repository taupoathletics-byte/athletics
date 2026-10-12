import type { EventScene } from '../Stage'
import { discus } from './discus'
import { distance } from './distance'
import { highJump } from './high-jump'
import { hurdles } from './hurdles'
import { longJump } from './long-jump'
import { relays } from './relays'
import { shotPut } from './shot-put'

/** The seven events, in the order the section tells them. */
export const scenes: EventScene[] = [hurdles, longJump, highJump, shotPut, discus, relays, distance]

export const sceneById = Object.fromEntries(scenes.map((s) => [s.id, s])) as Record<EventScene['id'], EventScene>
