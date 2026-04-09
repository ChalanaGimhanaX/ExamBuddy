import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore'
import type { QuestionBank, AnalyticsStore, QuizProgress } from '../types'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "exambuddy-f343c.firebaseapp.com",
  projectId: "exambuddy-f343c",
  storageBucket: "exambuddy-f343c.firebasestorage.app",
  messagingSenderId: "620750408789",
  appId: "1:620750408789:web:01784027493d724da298dc",
  measurementId: "G-WKC45Y15S6"
};

export const app = initializeApp(firebaseConfig)
export const analytics = getAnalytics(app)
export const db = getFirestore(app)

// --- Live DB Listeners ---

export function listenToQuestionBank(callback: (bank: QuestionBank | null) => void) {
  const docRef = doc(db, 'examBuddy', 'globalQuestionBank')
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as QuestionBank)
    } else {
      callback(null)
    }
  })
}

export function listenToAnalytics(callback: (analytics: AnalyticsStore | null) => void) {
  const docRef = doc(db, 'examBuddy', 'globalAnalytics')
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as AnalyticsStore)
    } else {
      callback(null)
    }
  })
}

export function listenToQuizProgress(visitorId: string, callback: (progress: QuizProgress | null) => void) {
  const docRef = doc(db, 'examBuddy', `progress_${visitorId}`)
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as QuizProgress)
    } else {
      callback(null)
    }
  })
}

// --- Live DB Writers ---

export async function saveQuestionBankToDB(questionBank: QuestionBank) {
  const docRef = doc(db, 'examBuddy', 'globalQuestionBank')
  await setDoc(docRef, questionBank)
}

export async function saveAnalyticsToDB(analyticsStore: AnalyticsStore) {
  const docRef = doc(db, 'examBuddy', 'globalAnalytics')
  await setDoc(docRef, analyticsStore)
}

export async function saveQuizProgressToDB(visitorId: string, progress: QuizProgress) {
  const docRef = doc(db, 'examBuddy', `progress_${visitorId}`)
  await setDoc(docRef, progress)
}
