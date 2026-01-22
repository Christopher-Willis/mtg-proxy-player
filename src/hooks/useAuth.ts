import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { subscribeToAuthState, initFirebase } from '../services/firebase';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface UseAuthResult {
  user: User | null;
  isAnonymous: boolean;
  isLoading: boolean;
  status: AuthStatus;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initFirebase();
    
    const unsubscribe = subscribeToAuthState((state) => {
      setUser(state.user);
      setIsAnonymous(state.isAnonymous);
      setIsLoading(state.isLoading);
    });

    return unsubscribe;
  }, []);

  const status: AuthStatus = isLoading 
    ? 'loading' 
    : user 
      ? 'authenticated' 
      : 'unauthenticated';

  return {
    user,
    isAnonymous,
    isLoading,
    status,
    displayName: user?.displayName ?? null,
    email: user?.email ?? null,
    photoURL: user?.photoURL ?? null,
  };
}
