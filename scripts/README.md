# scripts/

## The live pipeline (use these)

```
Notion  ──pull:lessons──▶  scripts/data/lessons.json  ──build:sessions──▶  api/_data/sessions.mjs
                                                                                    │
                                                                    served only via   ▼
                                                              GET /api/sessions  (gated)
```

```bash
NOTION_TOKEN=... npm run pull:lessons    # scripts/notion_pull_lessons.mjs  (READ-ONLY)
npm run build:sessions                   # scripts/build_sessions.mjs
npm run dev                              # portal at /getsetgo/
```

| Script | What it does |
|---|---|
| `notion_pull_lessons.mjs` | Pulls the 19-week lesson programme from Notion into `data/lessons.json`. Read-only. |
| `build_sessions.mjs` | Turns `data/lessons.json` + `data/season-extras.json` into the gated `api/_data/sessions.mjs`. |

**Sources of truth**

- Per-week and per-rotation lesson content: **Notion** (the *Get Set Go — 19 Weekly Lessons (2026–27)*
  page, *Get Set Go 2026/27 — Season Plan*, and *Get Set Go — Series Rotations* boards).
- The warm-down and standing rules: **`data/season-extras.json`** — these are NOT in Notion, so they are
  edited by hand.
- `data/lessons.json` is committed on purpose. If a pull goes wrong, the fix is a revert, not a re-pull.

Run Run Jump Throw lives separately in `api/_data/runJumpThrow.mjs` + `api/_data/rjtActivities.mjs`
(hand-authored from the ANZ Adaptive RJT resource and the āhei card library), served through the gated
`GET /api/rjt`.

## Tests

```bash
node scripts/test_sessions.mjs        # run sheets: data integrity + renders every series/rotation
node scripts/test_rjt.mjs             # Run Jump Throw: station skills + activity categories resolve
node scripts/test_rjt_render.mjs      # Run Jump Throw: renders every skill, night and station
```

## ⚠️ Legacy scripts — superseded, and some are destructive

Everything below belongs to the **old hand-authored 9-series pipeline** (pre-Notion). They read the
stale `data/season_plan.json` and `data/games.json` (last updated 22 Sep 2026), which describe the
**old 9-series structure** — not the current 19-week programme.

**Do not run the ones marked PUSH.** They write to Notion, and would push the old 9-series structure
over the new 19-week lessons. They need `NOTION_TOKEN` set to do any damage, so make sure you are not
exporting it in a shell where you might run one of these by accident.

| Script | Risk |
|---|---|
| `notion_sync.mjs` | **PUSH** — resyncs boards from the stale plan |
| `notion_resync.mjs` | **PUSH** — rewrites all 36 Series Rotations rows from the stale plan |
| `notion_update_games.mjs` | **PUSH** |
| `notion_add_game_detail.mjs` | **PUSH** |
| `patch_game_rotations.mjs` | **PUSH** (edits the stale plan in place, then it gets pushed) |
| `refine_games.mjs` | **PUSH** — rewrites `games.json` and `season_plan.json` |
| `enrich_games.mjs`, `transform_season_plan.mjs` | Read/write the stale plan |
| `export_chart.mjs`, `export_coming_up.mjs` | Read-only exports from the stale plan |
| `generate_sessions_from_md.py`, `generate_sessions_json.py` | Disabled — exit with a message |
| `notion_dump.mjs`, `notion_query.mjs`, `notion_explore.mjs`, `notion_verify_rollup.mjs`, `notion_records_setup.mjs`, `notion_attendance_setup.mjs`, `notion_add_formula.mjs`, `notion_add_gender.mjs`, `notion_import_members.mjs`, `notion_fix_tables.mjs` | Historical one-offs |

Once you are happy the 19-week programme has replaced the old one, these can be deleted along with
`data/season_plan.json` and `data/games.json`. Until then they are left in place so nothing is lost.
