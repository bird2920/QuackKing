import { useEffect, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Prefer build-time env vars; fall back to runtime globals if provided by hosting
const ENV = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
const envFirebaseConfig = {
  apiKey: ENV.VITE_FIREBASE_API_KEY,
  authDomain: ENV.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: ENV.VITE_FIREBASE_PROJECT_ID,
  storageBucket: ENV.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: ENV.VITE_FIREBASE_APP_ID,
};

const rawFirebaseConfig = typeof __firebase_config !== "undefined" ? __firebase_config : null;
let runtimeFirebaseConfig = {};

if (rawFirebaseConfig) {
  try {
    runtimeFirebaseConfig =
      typeof rawFirebaseConfig === "string" ? JSON.parse(rawFirebaseConfig) : rawFirebaseConfig;
  } catch (err) {
    console.error("Invalid runtime Firebase config; falling back to env vars.", err);
    runtimeFirebaseConfig = {};
  }
}

const firebaseConfig = {
  apiKey: envFirebaseConfig.apiKey || runtimeFirebaseConfig.apiKey || "",
  authDomain: envFirebaseConfig.authDomain || runtimeFirebaseConfig.authDomain || "",
  projectId: envFirebaseConfig.projectId || runtimeFirebaseConfig.projectId || "",
  storageBucket: envFirebaseConfig.storageBucket || runtimeFirebaseConfig.storageBucket || "",
  messagingSenderId: envFirebaseConfig.messagingSenderId || runtimeFirebaseConfig.messagingSenderId || "",
  appId: envFirebaseConfig.appId || runtimeFirebaseConfig.appId || "",
};

const hasValidFirebaseConfig = ["apiKey", "authDomain", "projectId", "appId"].every(
  (key) => firebaseConfig[key]
);

const initialAuthToken = typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;

export const useFirebase = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!hasValidFirebaseConfig) {
      console.error("Firebase configuration is missing. Check your .env.local VITE_FIREBASE_* values.");
      setIsLoading(false);
      return;
    }

    // Avoid initializing Firebase more than once (Hot Reload safety)
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const authInstance = getAuth(app);

    setDb(firestore);
    setAuth(authInstance);

    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      if (user) {
        setAuthUser(user);
        setUserId(user.uid);
      } else {
        setAuthUser(null);
        setUserId(null);
        try {
          if (initialAuthToken) {
            const cred = await signInWithCustomToken(authInstance, initialAuthToken);
            setAuthUser(cred.user);
            setUserId(cred.user.uid);
          } else {
            const cred = await signInAnonymously(authInstance);
            setAuthUser(cred.user);
            setUserId(cred.user.uid);
          }
        } catch (err) {
          console.error("Auth failed:", err);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { db, auth, authUser, userId, isLoading };
};
