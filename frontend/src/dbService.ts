import { doc, onSnapshot, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface SharedState {
  unit_study_dates: Record<string, string>;
  /** 按课本页码的课堂进度：每次课记一笔「上到第几页」 */
  page_progress?: Array<{
    id: string;
    date: string;
    bookId: string;
    upToPage: number;
    note?: string;
  }>;
  custom_vocab: any[];
  score: number;
  completed_date_modules: Record<string, string[]>;
  daily_rewards_awarded: Record<string, boolean>;
  alternative_translations?: Record<string, string[]>;
  user_feedback?: Array<{
    id: string;
    questionId: number;
    greek: string;
    expected: string;
    userTyped: string;
    date: string;
    status: 'pending' | 'approved' | 'rejected';
  }>;
}

export const getInitialLocalState = (): SharedState => {
  let unit_study_dates = {};
  let custom_vocab = [];
  let score = 0;
  let completed_date_modules = {};
  let daily_rewards_awarded = {};
  let alternative_translations = {};
  let user_feedback = [];
  let page_progress: SharedState['page_progress'] = [];

  try {
    const pp = localStorage.getItem("leon_page_progress");
    if (pp) page_progress = JSON.parse(pp);
  } catch (e) {}

  try {
    const dates = localStorage.getItem("leon_unit_study_dates");
    if (dates) unit_study_dates = JSON.parse(dates);
  } catch (e) {}

  try {
    const custom = localStorage.getItem("leon_custom_vocab");
    if (custom) custom_vocab = JSON.parse(custom);
  } catch (e) {}

  try {
    const s = localStorage.getItem("leon_score");
    if (s) score = parseInt(s, 10);
  } catch (e) {}

  try {
    const completed = localStorage.getItem("leon_completed_date_modules");
    if (completed) completed_date_modules = JSON.parse(completed);
  } catch (e) {}

  try {
    const rewards = localStorage.getItem("leon_daily_rewards_awarded");
    if (rewards) daily_rewards_awarded = JSON.parse(rewards);
  } catch (e) {}

  try {
    const alts = localStorage.getItem("leon_alternative_translations");
    if (alts) alternative_translations = JSON.parse(alts);
  } catch (e) {}

  try {
    const feed = localStorage.getItem("leon_user_feedback");
    if (feed) user_feedback = JSON.parse(feed);
  } catch (e) {}

  return {
    unit_study_dates,
    page_progress,
    custom_vocab,
    score,
    completed_date_modules,
    daily_rewards_awarded,
    alternative_translations,
    user_feedback,
  };
};

export type DbConnectionStatus = 'connecting' | 'connected-server' | 'connected-cache' | 'error';

export const subscribeToSharedState = (
  onUpdate: (state: SharedState) => void,
  onStatusChange?: (status: DbConnectionStatus, error?: Error) => void
) => {
  const docRef = doc(db, "leon_greek_coach", "shared_state");

  // Call onUpdate immediately with local state to avoid blank/zero UI during connection
  const localCache = getInitialLocalState();
  onUpdate(localCache);
  if (onStatusChange) onStatusChange('connecting');

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SharedState;
        // Sync back to localStorage as a cache/backup
        try {
          localStorage.setItem("leon_unit_study_dates", JSON.stringify(data.unit_study_dates || {}));
          localStorage.setItem("leon_page_progress", JSON.stringify(data.page_progress || []));
          localStorage.setItem("leon_custom_vocab", JSON.stringify(data.custom_vocab || []));
          localStorage.setItem("leon_score", (data.score || 0).toString());
          localStorage.setItem("leon_completed_date_modules", JSON.stringify(data.completed_date_modules || {}));
          localStorage.setItem("leon_daily_rewards_awarded", JSON.stringify(data.daily_rewards_awarded || {}));
          localStorage.setItem("leon_alternative_translations", JSON.stringify(data.alternative_translations || {}));
          localStorage.setItem("leon_user_feedback", JSON.stringify(data.user_feedback || []));
        } catch (e) {}
        
        onUpdate({
          unit_study_dates: data.unit_study_dates || {},
          page_progress: data.page_progress || [],
          custom_vocab: data.custom_vocab || [],
          score: data.score || 0,
          completed_date_modules: data.completed_date_modules || {},
          daily_rewards_awarded: data.daily_rewards_awarded || {},
          alternative_translations: data.alternative_translations || {},
          user_feedback: data.user_feedback || [],
        });

        if (onStatusChange) {
          onStatusChange(snapshot.metadata.fromCache ? 'connected-cache' : 'connected-server');
        }
      } else {
        // If Firestore document doesn't exist, we don't automatically create it from the iPad 
        // to avoid overwriting with empty/default state.
        // Instead, we just notify that we are connected but the document is empty.
        if (onStatusChange) {
          onStatusChange(snapshot.metadata.fromCache ? 'connected-cache' : 'connected-server');
        }
      }
    },
    (err) => {
      console.error("Firestore subscription error:", err);
      if (onStatusChange) {
        onStatusChange('error', err);
      }
    }
  );
};

export const saveSharedState = async (updates: Partial<SharedState>) => {
  const docRef = doc(db, "leon_greek_coach", "shared_state");
  try {
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) {
      const fullState = { ...getInitialLocalState(), ...updates };
      await setDoc(docRef, fullState);
    } else {
      await updateDoc(docRef, updates);
    }
  } catch (err) {
    console.error("Error updating Firestore:", err);
    // Fallback to updating localStorage directly in case database rules or connection fails
    try {
      if (updates.unit_study_dates) {
        localStorage.setItem("leon_unit_study_dates", JSON.stringify(updates.unit_study_dates));
      }
      if (updates.page_progress) {
        localStorage.setItem("leon_page_progress", JSON.stringify(updates.page_progress));
      }
      if (updates.custom_vocab) {
        localStorage.setItem("leon_custom_vocab", JSON.stringify(updates.custom_vocab));
      }
      if (updates.score !== undefined) {
        localStorage.setItem("leon_score", updates.score.toString());
      }
      if (updates.completed_date_modules) {
        localStorage.setItem("leon_completed_date_modules", JSON.stringify(updates.completed_date_modules));
      }
      if (updates.daily_rewards_awarded) {
        localStorage.setItem("leon_daily_rewards_awarded", JSON.stringify(updates.daily_rewards_awarded));
      }
      if (updates.alternative_translations) {
        localStorage.setItem("leon_alternative_translations", JSON.stringify(updates.alternative_translations));
      }
      if (updates.user_feedback) {
        localStorage.setItem("leon_user_feedback", JSON.stringify(updates.user_feedback));
      }
    } catch (e) {}
  }
};
