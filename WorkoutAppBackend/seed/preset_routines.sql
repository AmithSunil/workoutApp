/**
 * Preset routine templates for the trainer's library.
 *
 * Three classic splits so a new trainer opens the app with something to assign
 * and edit rather than an empty library. They are ordinary routines -- no
 * "preset" flag, nothing special about them -- so the trainer can rename,
 * retune or delete any of them, and `duplicate` makes a variant.
 *
 * Idempotent by title: re-running adds only the ones that are missing, so this
 * is safe to replay after a reseed. Exercise ids are the seeded catalogue
 * (`e-001`..`e-032`); check them before running against a different catalogue.
 *
 *   psql "$DATABASE_URL" -f seed/preset_routines.sql
 */
do $$
declare
  v_presets jsonb := $json$[
    {
      "title": "Full Body 3x",
      "notes": "Three full-body days with a rest day between each. The default starting point for a new client.",
      "days": [
        {"weekday": "mon", "name": "Full Body A", "focus": "full body", "exercises": [
          {"exerciseId": "e-001", "name": "Barbell Back Squat", "muscleGroup": "legs", "sets": 3, "repMin": 5, "repMax": 8, "restSeconds": 150},
          {"exerciseId": "e-009", "name": "Barbell Bench Press", "muscleGroup": "chest", "sets": 3, "repMin": 5, "repMax": 8, "restSeconds": 150},
          {"exerciseId": "e-016", "name": "Barbell Row", "muscleGroup": "back", "sets": 3, "repMin": 8, "repMax": 10, "restSeconds": 120},
          {"exerciseId": "e-026", "name": "Hanging Leg Raise", "muscleGroup": "core", "sets": 3, "repMin": 8, "repMax": 12, "restSeconds": 60}
        ]},
        {"weekday": "wed", "name": "Full Body B", "focus": "full body", "exercises": [
          {"exerciseId": "e-003", "name": "Romanian Deadlift", "muscleGroup": "legs", "sets": 3, "repMin": 8, "repMax": 10, "restSeconds": 150},
          {"exerciseId": "e-018", "name": "Overhead Press", "muscleGroup": "shoulders", "sets": 3, "repMin": 6, "repMax": 8, "restSeconds": 120},
          {"exerciseId": "e-015", "name": "Lat Pulldown", "muscleGroup": "back", "sets": 3, "repMin": 10, "repMax": 12, "restSeconds": 90},
          {"exerciseId": "e-027", "name": "Cable Crunch", "muscleGroup": "core", "sets": 3, "repMin": 12, "repMax": 15, "restSeconds": 60}
        ]},
        {"weekday": "fri", "name": "Full Body C", "focus": "full body", "exercises": [
          {"exerciseId": "e-006", "name": "Leg Press", "muscleGroup": "legs", "sets": 3, "repMin": 10, "repMax": 12, "restSeconds": 120},
          {"exerciseId": "e-010", "name": "Incline Dumbbell Press", "muscleGroup": "chest", "sets": 3, "repMin": 8, "repMax": 12, "restSeconds": 120},
          {"exerciseId": "e-017", "name": "Seated Cable Row", "muscleGroup": "back", "sets": 3, "repMin": 10, "repMax": 12, "restSeconds": 90},
          {"exerciseId": "e-019", "name": "Lateral Raise", "muscleGroup": "shoulders", "sets": 3, "repMin": 12, "repMax": 15, "restSeconds": 60}
        ]}
      ]
    },
    {
      "title": "Upper / Lower 4x",
      "notes": "Two upper and two lower days, Monday-Tuesday and Thursday-Friday. The usual step up from full body.",
      "days": [
        {"weekday": "mon", "name": "Upper (Push focus)", "focus": "chest", "exercises": [
          {"exerciseId": "e-009", "name": "Barbell Bench Press", "muscleGroup": "chest", "sets": 4, "repMin": 6, "repMax": 8, "restSeconds": 150},
          {"exerciseId": "e-016", "name": "Barbell Row", "muscleGroup": "back", "sets": 4, "repMin": 8, "repMax": 10, "restSeconds": 120},
          {"exerciseId": "e-018", "name": "Overhead Press", "muscleGroup": "shoulders", "sets": 3, "repMin": 8, "repMax": 10, "restSeconds": 120},
          {"exerciseId": "e-015", "name": "Lat Pulldown", "muscleGroup": "back", "sets": 3, "repMin": 10, "repMax": 12, "restSeconds": 90},
          {"exerciseId": "e-024", "name": "Rope Pushdown", "muscleGroup": "arms", "sets": 3, "repMin": 10, "repMax": 12, "restSeconds": 60}
        ]},
        {"weekday": "tue", "name": "Lower", "focus": "legs", "exercises": [
          {"exerciseId": "e-001", "name": "Barbell Back Squat", "muscleGroup": "legs", "sets": 4, "repMin": 5, "repMax": 8, "restSeconds": 180},
          {"exerciseId": "e-003", "name": "Romanian Deadlift", "muscleGroup": "legs", "sets": 3, "repMin": 8, "repMax": 10, "restSeconds": 150},
          {"exerciseId": "e-005", "name": "Bulgarian Split Squat", "muscleGroup": "legs", "sets": 3, "repMin": 10, "repMax": 12, "restSeconds": 90},
          {"exerciseId": "e-008", "name": "Leg Curl", "muscleGroup": "legs", "sets": 3, "repMin": 12, "repMax": 15, "restSeconds": 60},
          {"exerciseId": "e-026", "name": "Hanging Leg Raise", "muscleGroup": "core", "sets": 3, "repMin": 10, "repMax": 15, "restSeconds": 60}
        ]},
        {"weekday": "thu", "name": "Upper (Pull focus)", "focus": "back", "exercises": [
          {"exerciseId": "e-013", "name": "Pull-up", "muscleGroup": "back", "sets": 4, "repMin": 6, "repMax": 10, "restSeconds": 120},
          {"exerciseId": "e-010", "name": "Incline Dumbbell Press", "muscleGroup": "chest", "sets": 4, "repMin": 8, "repMax": 12, "restSeconds": 120},
          {"exerciseId": "e-017", "name": "Seated Cable Row", "muscleGroup": "back", "sets": 3, "repMin": 10, "repMax": 12, "restSeconds": 90},
          {"exerciseId": "e-019", "name": "Lateral Raise", "muscleGroup": "shoulders", "sets": 3, "repMin": 12, "repMax": 15, "restSeconds": 45},
          {"exerciseId": "e-022", "name": "Barbell Curl", "muscleGroup": "arms", "sets": 3, "repMin": 10, "repMax": 12, "restSeconds": 60}
        ]},
        {"weekday": "fri", "name": "Lower (Hinge focus)", "focus": "legs", "exercises": [
          {"exerciseId": "e-004", "name": "Conventional Deadlift", "muscleGroup": "back", "sets": 3, "repMin": 3, "repMax": 5, "restSeconds": 180},
          {"exerciseId": "e-006", "name": "Leg Press", "muscleGroup": "legs", "sets": 4, "repMin": 10, "repMax": 12, "restSeconds": 120},
          {"exerciseId": "e-007", "name": "Walking Lunge", "muscleGroup": "legs", "sets": 3, "repMin": 10, "repMax": 12, "restSeconds": 90},
          {"exerciseId": "e-027", "name": "Cable Crunch", "muscleGroup": "core", "sets": 3, "repMin": 12, "repMax": 15, "restSeconds": 60}
        ]}
      ]
    },
    {
      "title": "Push / Pull / Legs 6x",
      "notes": "Six training days, Monday to Saturday, Sunday off. For a client who is already training consistently.",
      "days": [
        {"weekday": "mon", "name": "Push", "focus": "chest", "exercises": [
          {"exerciseId": "e-009", "name": "Barbell Bench Press", "muscleGroup": "chest", "sets": 4, "repMin": 6, "repMax": 8, "restSeconds": 150},
          {"exerciseId": "e-018", "name": "Overhead Press", "muscleGroup": "shoulders", "sets": 3, "repMin": 8, "repMax": 10, "restSeconds": 120},
          {"exerciseId": "e-010", "name": "Incline Dumbbell Press", "muscleGroup": "chest", "sets": 3, "repMin": 8, "repMax": 12, "restSeconds": 120},
          {"exerciseId": "e-019", "name": "Lateral Raise", "muscleGroup": "shoulders", "sets": 3, "repMin": 12, "repMax": 15, "restSeconds": 45},
          {"exerciseId": "e-024", "name": "Rope Pushdown", "muscleGroup": "arms", "sets": 3, "repMin": 10, "repMax": 12, "restSeconds": 60}
        ]},
        {"weekday": "tue", "name": "Pull", "focus": "back", "exercises": [
          {"exerciseId": "e-013", "name": "Pull-up", "muscleGroup": "back", "sets": 4, "repMin": 6, "repMax": 10, "restSeconds": 120},
          {"exerciseId": "e-016", "name": "Barbell Row", "muscleGroup": "back", "sets": 4, "repMin": 8, "repMax": 10, "restSeconds": 120},
          {"exerciseId": "e-017", "name": "Seated Cable Row", "muscleGroup": "back", "sets": 3, "repMin": 10, "repMax": 12, "restSeconds": 90},
          {"exerciseId": "e-021", "name": "Rear Delt Fly", "muscleGroup": "shoulders", "sets": 3, "repMin": 12, "repMax": 15, "restSeconds": 45},
          {"exerciseId": "e-022", "name": "Barbell Curl", "muscleGroup": "arms", "sets": 3, "repMin": 10, "repMax": 12, "restSeconds": 60}
        ]},
        {"weekday": "wed", "name": "Legs", "focus": "legs", "exercises": [
          {"exerciseId": "e-001", "name": "Barbell Back Squat", "muscleGroup": "legs", "sets": 4, "repMin": 5, "repMax": 8, "restSeconds": 180},
          {"exerciseId": "e-003", "name": "Romanian Deadlift", "muscleGroup": "legs", "sets": 3, "repMin": 8, "repMax": 10, "restSeconds": 150},
          {"exerciseId": "e-006", "name": "Leg Press", "muscleGroup": "legs", "sets": 3, "repMin": 10, "repMax": 12, "restSeconds": 120},
          {"exerciseId": "e-008", "name": "Leg Curl", "muscleGroup": "legs", "sets": 3, "repMin": 12, "repMax": 15, "restSeconds": 60},
          {"exerciseId": "e-026", "name": "Hanging Leg Raise", "muscleGroup": "core", "sets": 3, "repMin": 10, "repMax": 15, "restSeconds": 60}
        ]},
        {"weekday": "thu", "name": "Push", "focus": "chest", "exercises": [
          {"exerciseId": "e-012", "name": "Weighted Dip", "muscleGroup": "chest", "sets": 4, "repMin": 6, "repMax": 10, "restSeconds": 150},
          {"exerciseId": "e-010", "name": "Incline Dumbbell Press", "muscleGroup": "chest", "sets": 4, "repMin": 8, "repMax": 12, "restSeconds": 120},
          {"exerciseId": "e-011", "name": "Cable Fly", "muscleGroup": "chest", "sets": 3, "repMin": 12, "repMax": 15, "restSeconds": 60},
          {"exerciseId": "e-019", "name": "Lateral Raise", "muscleGroup": "shoulders", "sets": 4, "repMin": 12, "repMax": 20, "restSeconds": 45},
          {"exerciseId": "e-025", "name": "Skull Crusher", "muscleGroup": "arms", "sets": 3, "repMin": 8, "repMax": 12, "restSeconds": 60}
        ]},
        {"weekday": "fri", "name": "Pull", "focus": "back", "exercises": [
          {"exerciseId": "e-004", "name": "Conventional Deadlift", "muscleGroup": "back", "sets": 3, "repMin": 3, "repMax": 5, "restSeconds": 180},
          {"exerciseId": "e-015", "name": "Lat Pulldown", "muscleGroup": "back", "sets": 4, "repMin": 8, "repMax": 12, "restSeconds": 90},
          {"exerciseId": "e-014", "name": "Chest-Supported Row", "muscleGroup": "back", "sets": 3, "repMin": 10, "repMax": 12, "restSeconds": 90},
          {"exerciseId": "e-020", "name": "Face Pull", "muscleGroup": "shoulders", "sets": 3, "repMin": 15, "repMax": 20, "restSeconds": 45},
          {"exerciseId": "e-023", "name": "Incline Dumbbell Curl", "muscleGroup": "arms", "sets": 3, "repMin": 10, "repMax": 12, "restSeconds": 60}
        ]},
        {"weekday": "sat", "name": "Legs", "focus": "legs", "exercises": [
          {"exerciseId": "e-002", "name": "Front Squat", "muscleGroup": "legs", "sets": 4, "repMin": 5, "repMax": 8, "restSeconds": 180},
          {"exerciseId": "e-005", "name": "Bulgarian Split Squat", "muscleGroup": "legs", "sets": 3, "repMin": 10, "repMax": 12, "restSeconds": 90},
          {"exerciseId": "e-007", "name": "Walking Lunge", "muscleGroup": "legs", "sets": 3, "repMin": 10, "repMax": 12, "restSeconds": 90},
          {"exerciseId": "e-008", "name": "Leg Curl", "muscleGroup": "legs", "sets": 3, "repMin": 12, "repMax": 15, "restSeconds": 60},
          {"exerciseId": "e-027", "name": "Cable Crunch", "muscleGroup": "core", "sets": 3, "repMin": 12, "repMax": 15, "restSeconds": 60}
        ]}
      ]
    }
  ]$json$::jsonb;
  p jsonb;
begin
  for p in select * from jsonb_array_elements(v_presets) loop
    if not exists (select 1 from public.routines where title = p->>'title') then
      perform public.create_routine(p);
      raise notice 'preset created: %', p->>'title';
    end if;
  end loop;
end $$;
