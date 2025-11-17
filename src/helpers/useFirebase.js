import { useEffect, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getAuth,onAuthStateChanged,signInAnonymously,signInWithCustomToken } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Pull configuration from globally injected variables (set by hosting environment)
const rawFirebaseConfig = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
const firebaseConfig = rawFirebaseConfig ? JSON.parse(rawFirebaseConfig) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

export const useFirebase = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
