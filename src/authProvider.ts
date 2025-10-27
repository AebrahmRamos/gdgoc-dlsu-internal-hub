import type { AuthProvider } from "@refinedev/core";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { app } from "./firebase";

const auth = getAuth(app);
const firestore = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export const authProvider: AuthProvider = {
  login: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user?.email) {
        await firebaseSignOut(auth);
        return { success: false, error: { name: "AuthError", message: "No email returned from provider" } };
      }

      // Verify user exists in `team` collection
      const teamRef = collection(firestore, "team");
      const q = query(teamRef, where("email", "==", user.email));
      const snap = await getDocs(q);
      if (snap.empty) {
        await firebaseSignOut(auth);
        return { success: false, error: { name: "Unauthorized", message: "User is not an authorized team member" } };
      }

      return { success: true, redirectTo: "/" };
    } catch (error: any) {
      console.error("Login error", error);
      return { success: false, error };
    }
  },

  logout: async () => {
    await firebaseSignOut(auth);
    return { success: true, redirectTo: "/login" };
  },

  check: async () => {
    return new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        unsub();
        if (user) {
          resolve({ authenticated: true });
        } else {
          resolve({ authenticated: false, redirectTo: "/login" });
        }
      });
    });
  },

  getPermissions: async () => null,

  getIdentity: async () => {
    const user = auth.currentUser;
    if (!user?.email) return null;

    const teamRef = collection(firestore, "team");
    const q = query(teamRef, where("email", "==", user.email));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { id: docSnap.id, ...(docSnap.data() as any) };
  },

  onError: async (error) => {
    console.error(error);
    return { error };
  },
};
