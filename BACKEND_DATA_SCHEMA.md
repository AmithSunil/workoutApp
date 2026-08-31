# WorkoutApp Backend Data Schema

## Overview
The WorkoutApp is a dual-role fitness platform (trainer & client) with comprehensive workout programming, nutrition tracking, progress monitoring, and communication features. All data is currently mocked in-memory but needs to be persisted to Supabase (or another backend).

---

## 1. User Management

### Users Table
Base user data shared by both roles.

```
users:
  - id: UUID/string (primary key)
  - role: 'trainer' | 'client'
  - name: string
  - email: string
  - avatarUrl: string
  - createdAt: ISO DateTime
  - updatedAt: ISO DateTime
```

### Trainer Profile
Extends base user data for trainers.

```
trainer_profiles:
  - id: UUID/string (primary key, foreign key → users.id)
  - headline: string (e.g., "Certified Strength Coach")
  - clientIds: string[] (denormalized list of assigned client IDs)
  - createdAt: ISO DateTime
  - updatedAt: ISO DateTime
```

### Client Profile
Extends base user data for clients with fitness context.

```
client_profiles:
  - id: UUID/string (primary key, foreign key → users.id)
  - trainerId: string (foreign key → trainer_profiles.id)
  - goal: 'cut' | 'recomp' | 'bulk' | 'performance'
  - heightCm: number
  - startWeightKg: number
  - targetWeightKg: number
  - macroTargets:
      - calories: number
      - protein: number
      - carbs: number
      - fat: number
  - joinedAt: ISO Date
  - complianceScore: number (0-100, calculated by backend)
  - complianceStatus: 'green' | 'yellow' | 'red' (calculated by backend)
  - lastLoggedAt: ISO DateTime | null
  - complianceStreakDays: number (calculated by backend)
  - createdAt: ISO DateTime
  - updatedAt: ISO DateTime

  Relationships:
  - Many nutrition logs
  - Many workout logs
  - Many body metrics
  - Many progress photos
  - Many habits
  - Many routine assignments
```

---

## 2. Training & Programming

### Exercises (Master Library)
Global exercise database.

```
exercises:
  - id: UUID/string (primary key)
  - name: string (e.g., "Barbell Bench Press")
  - muscleGroup: 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'full body' | 'conditioning'
  - equipment: string (e.g., "barbell", "dumbbell", "cable")
  - createdAt: ISO DateTime
  - updatedAt: ISO DateTime
```

### Routines (Trainer-Created Templates)
Reusable weekly training templates created by trainers. **Routines contain no dates** — they use weekday labels instead.

```
routines:
  - id: UUID/string (primary key)
  - trainerId: string (foreign key → trainer_profiles.id)
  - title: string (e.g., "Upper/Lower Split")
  - notes: string | null
  - days: RoutineDay[] (nested structure below)
  - assignedClientIds: string[] (denormalized from routine_assignments table)
  - createdAt: ISO DateTime
  - updatedAt: ISO DateTime

  RoutineDay (nested):
    - id: UUID/string
    - weekday: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
    - name: string | null (e.g., "Push" — optional, falls back to weekday)
    - focus: muscle group
    - notes: string | null
    - exercises: RoutineExercise[] (nested)

  RoutineExercise (nested):
    - id: UUID/string
    - exerciseId: string (foreign key → exercises.id)
    - name: string (denormalized from exercise)
    - muscleGroup: muscle group (denormalized)
    - sets: number (count of working sets)
    - repMin: number (e.g., 8)
    - repMax: number (e.g., 12)
    - restSeconds: number (e.g., 90)
    - targetRpe: number (1-10, Rate of Perceived Exertion)
    - notes: string | null (coaching cue)
```

### Routine Assignments
Links routines to clients. Supports copy-on-write customization per client.

```
routine_assignments:
  - id: UUID/string (primary key)
  - routineId: string (foreign key → routines.id)
  - clientId: string (foreign key → client_profiles.id)
  - customDays: RoutineDay[] | null
      (null = client follows template verbatim)
      (populated = trainer customized for this client; template no longer applies)
  - assignedAt: ISO DateTime
  - updatedAt: ISO DateTime

  Constraints:
  - (routineId, clientId) should be unique to prevent duplicate assignments
```

### Workout Sessions (Dated, Scheduled)
Workouts scheduled for specific calendar dates.

```
workout_sessions:
  - id: UUID/string (primary key)
  - clientId: string (foreign key → client_profiles.id)
  - title: string
  - scheduledFor: ISO Date
  - estimatedMinutes: number
  - focus: muscle group
  - exercises: ProgrammedExercise[] (nested)
  - status: 'scheduled' | 'in-progress' | 'completed' | 'missed'
  - createdAt: ISO DateTime
  - updatedAt: ISO DateTime

  ProgrammedExercise (nested):
    - id: UUID/string
    - exerciseId: string (foreign key → exercises.id)
    - name: string (denormalized)
    - muscleGroup: muscle group (denormalized)
    - notes: string | null
    - sets: PrescribedSet[] (nested)

  PrescribedSet (nested):
    - reps: number (target reps)
    - targetWeightKg: number | null (optional target weight)
```

### Workout Logs (Completed Workouts)
Actual workout performance data logged after completion.

```
workout_logs:
  - id: UUID/string (primary key)
  - clientId: string (foreign key → client_profiles.id)
  - sessionId: string (foreign key → workout_sessions.id, optional)
  - title: string
  - date: ISO Date
  - durationMinutes: number
  - rpe: number (1-10, Rate of Perceived Exertion)
  - totalVolumeKg: number (sum of all reps × weights)
  - notes: string | null
  - exercises: LoggedExercise[] (nested)
  - completedAt: ISO DateTime
  - createdAt: ISO DateTime
  - updatedAt: ISO DateTime

  LoggedExercise (nested):
    - id: UUID/string
    - exerciseId: string (foreign key → exercises.id)
    - name: string (denormalized)
    - muscleGroup: muscle group (denormalized)
    - sets: LoggedSet[] (nested)

  LoggedSet (nested):
    - id: UUID/string
    - reps: number (actual reps performed)
    - weightKg: number (actual weight used)
    - completed: boolean (whether set was completed)
```

---

## 3. Nutrition Tracking

### Foods (Master Library)
Global database of food items with macro information.

```
foods:
  - id: UUID/string (primary key)
  - name: string (e.g., "Chicken Breast")
  - brand: string | null
  - servingLabel: string (e.g., "100g")
  - calories: number
  - protein: number
  - carbs: number
  - fat: number
  - emoji: string
  - frequent: boolean (shown in quick-add carousel if true)
  - createdAt: ISO DateTime
  - updatedAt: ISO DateTime
```

### Nutrition Days
Daily nutrition tracking aggregates.

```
nutrition_days:
  - id: UUID/string (primary key)
  - clientId: string (foreign key → client_profiles.id)
  - date: ISO Date (unique per client)
  - targets: MacroTargets (nested)
  - consumed: MacroTargets (nested, calculated from entries)
  - entries: FoodEntry[] (nested)
  - createdAt: ISO DateTime
  - updatedAt: ISO DateTime

  MacroTargets (nested):
    - calories: number
    - protein: number
    - carbs: number
    - fat: number

  FoodEntry (nested):
    - id: UUID/string
    - clientId: string (denormalized)
    - date: ISO Date (denormalized)
    - slot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    - foodId: string (foreign key → foods.id)
    - name: string (denormalized from food)
    - servings: number
    - calories: number (calculated: base × servings)
    - protein: number (calculated)
    - carbs: number (calculated)
    - fat: number (calculated)
    - source: 'search' | 'quick-add' | 'ai'
    - loggedAt: ISO DateTime
```

### AI Food Suggestions
Temporary, ephemeral suggestions from voice/text parser (not persisted long-term).

```
ai_food_suggestions:
  - id: UUID/string
  - transcript: string (what the user said)
  - confidence: number (0-1)
  - items: Array<{
      name: string
      servings: number
      servingLabel: string
      calories: number
      protein: number
      carbs: number
      fat: number
      emoji: string
    }>
  - createdAt: ISO DateTime (delete after short TTL, e.g., 24 hours)
```

---

## 4. Progress Tracking

### Body Metrics
Weight and body composition measurements over time.

```
body_metrics:
  - id: UUID/string (primary key)
  - clientId: string (foreign key → client_profiles.id)
  - date: ISO Date
  - weightKg: number
  - bodyFatPct: number | null
  - waistCm: number | null
  - createdAt: ISO DateTime
  - updatedAt: ISO DateTime

  Indexes:
  - (clientId, date) for time-series queries
```

### Progress Photos
Progress tracking photos with pose and weight context.

```
progress_photos:
  - id: UUID/string (primary key)
  - clientId: string (foreign key → client_profiles.id)
  - date: ISO Date
  - pose: 'front' | 'side' | 'back'
  - uri: string (cloud storage URL or base64)
  - weightKg: number (client's weight on that date)
  - createdAt: ISO DateTime
  - updatedAt: ISO DateTime

  Indexes:
  - (clientId, date)
```

### Habits
Daily habits (client or trainer-assigned).

```
habits:
  - id: UUID/string (primary key)
  - clientId: string (foreign key → client_profiles.id)
  - title: string (e.g., "Drink 3L water")
  - icon: string (emoji or icon name)
  - cadence: 'daily' (for future expansion)
  - completedDates: ISO Date[] (dates the habit was ticked)
  - createdBy: 'trainer' | 'client'
  - createdAt: ISO DateTime
  - updatedAt: ISO DateTime
```

---

## 5. Communication

### Threads
Conversations between trainer and one client.

```
threads:
  - id: UUID/string (primary key)
  - clientId: string (foreign key → client_profiles.id)
  - trainerId: string (foreign key → trainer_profiles.id)
  - lastMessagePreview: string (denormalized from latest message)
  - lastMessageAt: ISO DateTime (denormalized)
  - unreadForTrainer: number (message count)
  - unreadForClient: number (message count)
  - createdAt: ISO DateTime
  - updatedAt: ISO DateTime

  Constraints:
  - (clientId, trainerId) should be unique
```

### Messages
Individual messages in a thread, optionally with attachments.

```
messages:
  - id: UUID/string (primary key)
  - threadId: string (foreign key → threads.id)
  - senderId: string (foreign key → users.id)
  - body: string
  - attachment: MessageAttachment | null (nested)
  - sentAt: ISO DateTime
  - readAt: ISO DateTime | null
  - createdAt: ISO DateTime
  - updatedAt: ISO DateTime

  MessageAttachment (nested):
    Type unions (only one applies):
    - { kind: 'workout', logId: string }
    - { kind: 'nutrition', date: ISO Date }
    - { kind: 'photo', uri: string }

  Indexes:
  - (threadId, sentAt) for message ordering
```

---

## 6. Trainer Triage & Alerts

### Red Flag Alerts
Auto-generated alerts for trainer attention (e.g., missed logs, high RPE).

```
red_flag_alerts:
  - id: UUID/string (primary key)
  - clientId: string (foreign key → client_profiles.id)
  - kind: AlertKind
      'missed-logs'        (client hasn't logged workouts)
      'high-rpe'           (perceived exertion too high)
      'weight-stall'       (weight not changing as expected)
      'calorie-deficit-miss' (not hitting calorie targets)
      'check-in-due'       (weekly check-in overdue)
  - severity: 'critical' | 'warning' | 'info'
  - title: string
  - detail: string
  - raisedAt: ISO DateTime
  - resolved: boolean
  - resolvedAt: ISO DateTime | null
  - createdAt: ISO DateTime
  - updatedAt: ISO DateTime

  Indexes:
  - (clientId, resolved) for filtering unresolved alerts
```

### Check-Ins
Weekly check-in questionnaires from clients.

```
check_ins:
  - id: UUID/string (primary key)
  - clientId: string (foreign key → client_profiles.id)
  - weekOf: ISO Date (Monday of that week)
  - submittedAt: ISO DateTime
  - status: 'pending' | 'reviewed'
  - weightChangeKg: number (delta from previous week)
  - avgCalories: number (average daily calories that week)
  - targetCalories: number
  - sessionsCompleted: number
  - sessionsPlanned: number
  - avgRpe: number (average RPE across sessions)
  - clientNote: string (free-form feedback)
  - createdAt: ISO DateTime
  - updatedAt: ISO DateTime

  Indexes:
  - (clientId, weekOf)
  - (status) for trainer's pending queue
```

### Trainer Summary (Denormalized Dashboard Data)
Pre-calculated summary stats for the trainer dashboard.

```
trainer_summaries:
  - id: UUID/string (primary key)
  - trainerId: string (foreign key → trainer_profiles.id)
  - activeClients: number
  - pendingCheckIns: number
  - unreadMessages: number
  - criticalAlerts: number
  - weeklyComplianceAvg: number (0-100)
  - lastUpdatedAt: ISO DateTime (cache invalidation timestamp)

  Note: Can be denormalized/calculated on-demand or cached with periodic refresh.
```

---

## 7. Computed / Denormalized Fields

The backend should compute or denormalize these fields to avoid expensive queries:

1. **Client Compliance Score & Status**
   - 7-day rolling calculation based on:
     - Did they log workouts on scheduled days?
     - Did they hit nutrition targets?
     - Frequency of check-ins
   - Result: `complianceScore` (0-100) and `complianceStatus` ('green'|'yellow'|'red')

2. **Trainer's Assigned Client List**
   - Denormalized in `trainer_profiles.clientIds`
   - Source of truth: `routine_assignments` table
   - Fallback: query clients where trainer_id matches

3. **Thread Unread Counts**
   - `threads.unreadForTrainer` / `unreadForClient`
   - Updated when messages are sent
   - Reset when marked as read

4. **Message Preview & Timestamp**
   - `threads.lastMessagePreview`
   - `threads.lastMessageAt`
   - Denormalized from latest message for fast list retrieval

5. **Nutrition Day Macros**
   - `nutrition_days.consumed` calculated as sum of `entries[]`
   - May be cached/denormalized for performance

---

## 8. Row-Level Security (RLS) Requirements

Since this uses Supabase with public/anon keys, all tables need RLS policies:

- **Users**: Can read own profile, trainer can read assigned clients
- **Clients**: Client can read own profile, trainer can read assigned clients
- **Routines**: Trainer can read/write own; clients can read assigned ones
- **Workout Sessions/Logs**: Client reads own, trainer reads assigned clients'
- **Nutrition Days/Foods**: Client reads own, trainer reads assigned clients' (foods are public)
- **Messages/Threads**: Both parties can read/write their own threads
- **Alerts/CheckIns**: Trainer reads own clients', clients read own
- **Habits**: Client reads own, trainer reads assigned clients'
- **Body Metrics/Photos**: Client reads own, trainer reads assigned clients'

---

## 9. Indexes & Performance Considerations

Key indexes for common queries:

```
nutrition_days:
  - (clientId, date DESC) for daily view
  - (clientId, date >= last7days) for week summaries

workout_logs:
  - (clientId, date DESC) for history
  - (sessionId) for session details

body_metrics:
  - (clientId, date DESC) for progress tracking

messages:
  - (threadId, sentAt ASC) for message list
  - (threadId, readAt IS NULL) for unread count

routines:
  - (trainerId) for trainer's routine list

routine_assignments:
  - (routineId) for "which clients"
  - (clientId) for "which routines"
  - (routineId, clientId) unique constraint

threads:
  - (clientId, trainerId) unique
  - (lastMessageAt DESC) for sorting
```

---

## 10. Data Relationships Summary

```
User (trainer/client base)
├── TrainerProfile
│   ├── Routines[]
│   │   └── RoutineAssignments[]
│   │       └── ClientProfile (assigned to)
│   └── Alerts[] (for assigned clients)
│
└── ClientProfile
    ├── WorkoutSessions[]
    ├── WorkoutLogs[]
    ├── NutritionDays[]
    ├── BodyMetrics[]
    ├── ProgressPhotos[]
    ├── Habits[]
    ├── RoutineAssignments[] (assigned routines)
    └── Threads[] (with trainer)
        └── Messages[]
```

---

## 11. API Endpoints (Based on Current Implementation)

These operations need backend support:

**Training:**
- `GET /routines` — Trainer's routine library
- `POST /routines` — Create new routine
- `PATCH /routines/:id` — Update routine
- `DELETE /routines/:id` — Delete routine
- `GET /assignments` — Client's assigned routines (resolved view)
- `POST /assignments/:routineId/assign/:clientId` — Assign routine to client
- `PATCH /assignments/:id` — Customize routine for client
- `POST /assignments/:id/reset` — Revert customization to template
- `GET /sessions` — Scheduled sessions
- `POST /sessions` — Create session
- `PATCH /sessions/:id` — Update session status
- `GET /logs` — Workout logs
- `POST /logs` — Log completed workout

**Nutrition:**
- `GET /nutrition/:date` — Daily nutrition view
- `POST /nutrition/:date/foods` — Add food entry
- `DELETE /nutrition/:date/foods/:id` — Remove food entry
- `GET /foods` — Search master food database

**Progress:**
- `GET /metrics` — Body metrics history
- `POST /metrics` — Log weight/measurements
- `POST /photos` — Upload progress photo
- `GET /habits` — Habit list
- `POST /habits` — Create habit
- `PATCH /habits/:id/:date` — Toggle habit completion

**Messaging:**
- `GET /threads` — List conversations
- `GET /threads/:id/messages` — Get thread messages
- `POST /threads/:id/messages` — Send message
- `POST /threads/:id/read` — Mark as read

**Trainer Dashboard:**
- `GET /trainer/summary` — Dashboard summary
- `GET /trainer/alerts` — Unresolved alerts
- `POST /trainer/alerts/:id/resolve` — Resolve alert
- `GET /trainer/checkins` — Weekly check-ins
- `POST /trainer/checkins/:id/review` — Review check-in
- `GET /trainer/clients/:id/overview` — Client overview
- `GET /trainer/clients/:id/compliance` — Compliance history

---

## Notes

1. **Dates**: 
   - `ISODate` format: `YYYY-MM-DD` (e.g., `2026-08-31`)
   - `ISODateTime` format: Full ISO 8601 with timezone (e.g., `2026-08-31T14:30:00.000Z`)

2. **IDs**: 
   - Currently using string IDs with prefixes (e.g., `u-123`, `c-456`, `rd-789`)
   - Can migrate to UUIDs; prefixes help with debugging

3. **Copy-on-Write Pattern**: 
   - Routine customization uses `customDays: null | RoutineDay[]`
   - Null = follow template; populated array = custom version
   - This prevents template changes from affecting customized clients

4. **No Date Fields on Routines**: 
   - Routines use `weekday` labels, not calendar dates
   - Dates appear only on Sessions, Logs, and metrics
   - This allows trainers to design once, reuse for all clients

5. **Denormalization Strategy**: 
   - Some fields are denormalized (e.g., exercise names in logs) for query performance
   - Backend should validate and sync these during writes
