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
  doc,
  getDoc,
} from "firebase/firestore";
import { app } from "./firebase";
import type { UserIdentity, RoleType } from "./types/team";

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
      console.error("[Auth] Login error:", error);
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

  getIdentity: async (): Promise<UserIdentity | null> => {
    const user = auth.currentUser;
    if (!user?.email) {
      console.warn("[Auth] No current user");
      return null;
    }

    try {
      // Get ID token with custom claims (preferred source)
      const tokenResult = await user.getIdTokenResult(false);
      
      // Get additional data from Firestore (for name and other fields not in claims)
      const teamRef = collection(firestore, "team");
      const q = query(teamRef, where("email", "==", user.email));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        console.warn("[Auth] User not found in team collection:", user.email);
        return null;
      }
      
      const docSnap = snap.docs[0];
      const userData = docSnap.data();
      
      // Prefer custom claims, fallback to Firestore if claims not set yet
      const role = (tokenResult.claims.role as string) || userData.role || userData.position;
      const roleType = (tokenResult.claims.roleType as RoleType) || userData.roleType;
      const department = (tokenResult.claims.department as string) || userData.department;
      const committee = (tokenResult.claims.committee as string) || userData.committee;
      
      // Warn if claims are missing (they should be set by the Cloud Function)
      if (!tokenResult.claims.role || !tokenResult.claims.roleType) {
        console.warn("[Auth] Custom claims not set yet for user:", user.email);
        console.warn("[Auth] Using Firestore fallback. Claims should be set soon.");
      }
      
      const identity: UserIdentity = {
        id: docSnap.id,
        email: user.email,
        name: userData.name || user.displayName || '',
        role,
        roleType,
        department,
        committee,
      };
      
      console.log("[Auth] User identity:", {
        email: identity.email,
        role: identity.role,
        roleType: identity.roleType,
        department: identity.department,
        fromClaims: !!tokenResult.claims.role,
      });
      
      return identity;
      
    } catch (error) {
      console.error("[Auth] Error getting identity:", error);
      return null;
    }
  },

  onError: async (error) => {
    console.error("[Auth] Error:", error);
    return { error };
  },
};
