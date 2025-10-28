/**
 * Auth Context with Token Refresh Listener
 * 
 * This context:
 * 1. Listens to Firestore claimsUpdatedAt changes
 * 2. Forces token refresh when claims are updated
 * 3. Triggers identity re-fetch or page reload
 * 
 * This ensures that permission changes propagate immediately to the UI.
 */

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { app } from '../firebase';
import { authProvider } from '../authProvider';

const auth = getAuth(app);
const db = getFirestore(app);

interface AuthContextValue {
  // Can be extended with additional auth state if needed
}

const AuthContext = createContext<AuthContextValue>({});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthContextProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const lastCheckedRef = useRef<Date>(new Date());
  const userIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Listen to auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        userIdRef.current = user.uid;
        setupClaimsListener(user.uid);
      } else {
        userIdRef.current = null;
      }
    });
    
    return () => {
      unsubscribeAuth();
    };
  }, []);
  
  const setupClaimsListener = (userId: string) => {
    console.log('[Auth] Setting up claims listener for user:', userId);
    
    // Listen to the user's team document for claimsUpdatedAt changes
    const userDocRef = doc(db, 'team', userId);
    
    const unsubscribeSnapshot = onSnapshot(
      userDocRef,
      async (docSnapshot) => {
        if (!docSnapshot.exists()) {
          console.warn('[Auth] User document not found');
          return;
        }
        
        const data = docSnapshot.data();
        const claimsUpdatedAt = data?.claimsUpdatedAt?.toDate();
        
        if (!claimsUpdatedAt) {
          // Claims haven't been set yet
          return;
        }
        
        // Check if claims were updated after our last check
        if (claimsUpdatedAt > lastCheckedRef.current) {
          console.log('[Auth] Claims updated, refreshing token...', {
            claimsUpdatedAt,
            lastChecked: lastCheckedRef.current,
          });
          
          try {
            // Force token refresh
            const user = auth.currentUser;
            if (user) {
              await user.getIdToken(true);
              console.log('[Auth] Token refreshed successfully');
              
              // Update last checked timestamp
              lastCheckedRef.current = new Date();
              
              // Option 1: Soft refresh - re-fetch identity (preferred for better UX)
              try {
                await authProvider.getIdentity?.();
                console.log('[Auth] Identity refreshed');
                
                // Notify user about permission changes
                console.log('[Auth] Your permissions have been updated. Some features may now be available or restricted.');
                
                // Force a re-render by reloading the page
                // This ensures all permission checks are re-evaluated
                window.location.reload();
              } catch (error) {
                console.error('[Auth] Error refreshing identity:', error);
              }
              
              // Option 2: Hard refresh (simpler but less smooth UX)
              // Uncomment if you prefer a full page reload
              // window.location.reload();
            }
          } catch (error) {
            console.error('[Auth] Error refreshing token:', error);
          }
        }
      },
      (error) => {
        console.error('[Auth] Error listening to claims updates:', error);
      }
    );
    
    // Cleanup function would be called on unmount
    // But since this is a per-user listener, it's recreated when user changes
  };
  
  return (
    <AuthContext.Provider value={{}}>
      {children}
    </AuthContext.Provider>
  );
};
