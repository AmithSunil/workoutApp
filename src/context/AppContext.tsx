/**
 * AppContext – global state for the WorkoutApp.
 * Provides mock data that mimics what a real API/trainer CMS would supply.
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MacroTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MacroLog {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  subtitle?: string;
  completed: boolean;
  type: 'workout' | 'nutrition' | 'hydration' | 'checkin';
}

export interface FrequentMeal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  emoji: string;
}

export interface LoggedMeal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: Date;
  imageUri?: string;
}

export interface ExerciseSet {
  setNumber: number;
  targetReps: number;
  actualReps: string;
  weight: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
  cues: string[];
  lastWeekNote: string;
  isEndurance?: boolean;
  distance?: string;
  duration?: string;
}

export interface WorkoutSession {
  title: string;
  trainerNotes: string;
  exercises: Exercise[];
  rpe: number;
  completed: boolean;
}

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface Message {
  id: string;
  sender: 'user' | 'trainer';
  text: string;
  timestamp: Date;
  audioUri?: string;
}

export interface AppState {
  // Nutrition
  macroTarget: MacroTarget;
  macroLog: MacroLog;
  frequentMeals: FrequentMeal[];
  loggedMeals: LoggedMeal[];

  // Daily tasks
  checklist: ChecklistItem[];

  // Trainer
  trainerNote: string;
  trainerName: string;
  trainerAvatar: string;

  // Workouts
  workout: WorkoutSession;

  // Progress
  weightHistory: WeightEntry[];
  adherenceHistory: { date: string; value: number }[];
  messages: Message[];
}

// ─── Defaults / Mock Data ────────────────────────────────────────────────────

const DEFAULT_STATE: AppState = {
  macroTarget: { calories: 2400, protein: 185, carbs: 260, fat: 80 },
  macroLog: { calories: 1340, protein: 94, carbs: 148, fat: 42 },

  frequentMeals: [
    { id: '1', name: 'Chicken & Rice', calories: 520, protein: 48, carbs: 52, fat: 12, emoji: '🍚' },
    { id: '2', name: 'Greek Yogurt', calories: 180, protein: 20, carbs: 14, fat: 4, emoji: '🫙' },
    { id: '3', name: 'Protein Shake', calories: 240, protein: 40, carbs: 8, fat: 5, emoji: '🥤' },
    { id: '4', name: 'Salmon & Veg', calories: 480, protein: 42, carbs: 18, fat: 22, emoji: '🐟' },
    { id: '5', name: 'Eggs & Toast', calories: 320, protein: 24, carbs: 28, fat: 14, emoji: '🍳' },
    { id: '6', name: 'Oatmeal', calories: 290, protein: 12, carbs: 48, fat: 6, emoji: '🥣' },
  ],
  loggedMeals: [],

  checklist: [
    { id: 'c1', label: 'Phase 2: Pull Day', subtitle: '5 exercises · ~55 min', completed: false, type: 'workout' },
    { id: 'c2', label: 'Log Breakfast', subtitle: 'Target 600 kcal', completed: true, type: 'nutrition' },
    { id: 'c3', label: 'Log Lunch', subtitle: 'Target 700 kcal', completed: false, type: 'nutrition' },
    { id: 'c4', label: 'Hydration Goal', subtitle: '3.5L water today', completed: false, type: 'hydration' },
    { id: 'c5', label: 'Log Dinner', subtitle: 'Target 650 kcal', completed: false, type: 'nutrition' },
    { id: 'c6', label: 'Weekly Check-In', subtitle: 'Sunday weigh-in', completed: false, type: 'checkin' },
  ],

  trainerNote: '🔥 Focus on mind-muscle connection this week. Control the eccentric on every rep — 3 seconds down. Quality over quantity always.',
  trainerName: 'Coach Marcus',
  trainerAvatar: '💪',

  workout: {
    title: 'Phase 2: Pull Day A',
    trainerNotes: 'Keep rest periods to 90 seconds between sets. If you hit all reps cleanly, add 2.5kg next session. Remember — scapular retraction before every pull.',
    exercises: [
      {
        id: 'e1',
        name: 'Barbell Deadlift',
        cues: ['Hinge at hips, neutral spine', 'Engage lats before you pull', 'Drive the floor away — don\'t pull up'],
        lastWeekNote: '4×5 @ 120kg',
        sets: [
          { setNumber: 1, targetReps: 5, actualReps: '', weight: '' },
          { setNumber: 2, targetReps: 5, actualReps: '', weight: '' },
          { setNumber: 3, targetReps: 5, actualReps: '', weight: '' },
          { setNumber: 4, targetReps: 3, actualReps: '', weight: '' },
        ],
      },
      {
        id: 'e2',
        name: 'Barbell Row',
        cues: ['Chest to bar, not chin', 'Elbows close to body', 'Full stretch at bottom'],
        lastWeekNote: '4×8 @ 80kg',
        sets: [
          { setNumber: 1, targetReps: 8, actualReps: '', weight: '' },
          { setNumber: 2, targetReps: 8, actualReps: '', weight: '' },
          { setNumber: 3, targetReps: 8, actualReps: '', weight: '' },
          { setNumber: 4, targetReps: 8, actualReps: '', weight: '' },
        ],
      },
      {
        id: 'e3',
        name: 'Pull-Ups',
        cues: ['Dead hang start', 'Depress scapulae first', 'Chin clears the bar'],
        lastWeekNote: '3×6 BW',
        sets: [
          { setNumber: 1, targetReps: 6, actualReps: '', weight: '' },
          { setNumber: 2, targetReps: 6, actualReps: '', weight: '' },
          { setNumber: 3, targetReps: 6, actualReps: '', weight: '' },
        ],
      },
      {
        id: 'e4',
        name: 'Face Pulls',
        cues: ['Rope to forehead level', 'External rotation at end range', 'Light weight, high reps'],
        lastWeekNote: '3×15 @ 25kg',
        sets: [
          { setNumber: 1, targetReps: 15, actualReps: '', weight: '' },
          { setNumber: 2, targetReps: 15, actualReps: '', weight: '' },
          { setNumber: 3, targetReps: 15, actualReps: '', weight: '' },
        ],
      },
      {
        id: 'e5',
        name: 'Zone 2 Cardio',
        cues: ['Keep HR 130-145 bpm', 'Conversational pace', 'Can add wattage data if available'],
        lastWeekNote: '35 min, 18km',
        isEndurance: true,
        distance: '',
        duration: '',
        sets: [],
      },
    ],
    rpe: 5,
    completed: false,
  },

  weightHistory: [
    { date: 'Jul 5', weight: 84.2 },
    { date: 'Jul 12', weight: 83.8 },
    { date: 'Jul 19', weight: 83.4 },
    { date: 'Jul 26', weight: 82.9 },
    { date: 'Aug 1', weight: 82.5 },
  ],
  adherenceHistory: [
    { date: 'Jul 5', value: 72 },
    { date: 'Jul 12', value: 80 },
    { date: 'Jul 19', value: 85 },
    { date: 'Jul 26', value: 91 },
    { date: 'Aug 1', value: 88 },
  ],

  messages: [
    { id: 'm1', sender: 'trainer', text: '💪 Great week last week! Really noticed the improvement in your deadlift form from the video.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) },
    { id: 'm2', sender: 'user', text: 'Thanks! The cue about driving the floor away finally clicked. Felt way more powerful.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23) },
    { id: 'm3', sender: 'trainer', text: 'Exactly! Keep that mental cue. This week, same approach on rows — think chest to bar, not chin. Let me know how pull day feels.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22) },
  ],
};

// ─── Context ─────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  toggleChecklistItem: (id: string) => void;
  logMeal: (meal: Omit<LoggedMeal, 'id' | 'timestamp'>) => void;
  logQuickMeal: (meal: FrequentMeal) => void;
  updateExerciseSet: (exerciseId: string, setIndex: number, field: 'actualReps' | 'weight', value: string) => void;
  updateEndurance: (exerciseId: string, field: 'distance' | 'duration', value: string) => void;
  setRpe: (value: number) => void;
  completeWorkout: () => void;
  sendMessage: (text: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);

  const toggleChecklistItem = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      checklist: prev.checklist.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      ),
    }));
  }, []);

  const logMeal = useCallback((meal: Omit<LoggedMeal, 'id' | 'timestamp'>) => {
    const newMeal: LoggedMeal = {
      ...meal,
      id: `meal-${Date.now()}`,
      timestamp: new Date(),
    };
    setState(prev => ({
      ...prev,
      loggedMeals: [newMeal, ...prev.loggedMeals],
      macroLog: {
        calories: prev.macroLog.calories + meal.calories,
        protein: prev.macroLog.protein + meal.protein,
        carbs: prev.macroLog.carbs + meal.carbs,
        fat: prev.macroLog.fat + meal.fat,
      },
    }));
  }, []);

  const logQuickMeal = useCallback((meal: FrequentMeal) => {
    logMeal({ name: meal.name, calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat });
  }, [logMeal]);

  const updateExerciseSet = useCallback((
    exerciseId: string,
    setIndex: number,
    field: 'actualReps' | 'weight',
    value: string
  ) => {
    setState(prev => ({
      ...prev,
      workout: {
        ...prev.workout,
        exercises: prev.workout.exercises.map(ex =>
          ex.id === exerciseId
            ? {
                ...ex,
                sets: ex.sets.map((s, i) =>
                  i === setIndex ? { ...s, [field]: value } : s
                ),
              }
            : ex
        ),
      },
    }));
  }, []);

  const updateEndurance = useCallback((exerciseId: string, field: 'distance' | 'duration', value: string) => {
    setState(prev => ({
      ...prev,
      workout: {
        ...prev.workout,
        exercises: prev.workout.exercises.map(ex =>
          ex.id === exerciseId ? { ...ex, [field]: value } : ex
        ),
      },
    }));
  }, []);

  const setRpe = useCallback((value: number) => {
    setState(prev => ({ ...prev, workout: { ...prev.workout, rpe: value } }));
  }, []);

  const completeWorkout = useCallback(() => {
    setState(prev => ({ ...prev, workout: { ...prev.workout, completed: true } }));
  }, []);

  const sendMessage = useCallback((text: string) => {
    const msg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    setState(prev => ({ ...prev, messages: [...prev.messages, msg] }));
  }, []);

  return (
    <AppContext.Provider value={{
      state,
      toggleChecklistItem,
      logMeal,
      logQuickMeal,
      updateExerciseSet,
      updateEndurance,
      setRpe,
      completeWorkout,
      sendMessage,
    }}>
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
