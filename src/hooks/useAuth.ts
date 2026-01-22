import { User } from 'firebase/auth';
import { useAuthStore, AuthStatus } from '../stores/authStore';
import { subscribeToAuthState, initFirebase } from '../services/firebase';

export type { AuthStatus };

export interface UseAuthResult {
  user: User | null;
  isAnonymous: boolean;
  isLoading: boolean;
  status: AuthStatus;
  firebaseConfigured: boolean;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

let authInitialized = false;

export function initializeAuth(): void {
  if (authInitialized) return;
  authInitialized = true;
  
  const store = useAuthStore.getState();
  const db = initFirebase();
  store.setFirebaseConfigured(!!db);
  
  if (!db) {
    store.setStatus('error');
    store.setError('Firebase not configured');
    return;
  }
  
  store.setStatus('loading');
  
  subscribeToAuthState((state) => {
    useAuthStore.getState().setUser(state.user);
  });
}

export function useAuth(): UseAuthResult {
  const store = useAuthStore();

  return {
    user: store.user,
    isAnonymous: store.isAnonymous,
    isLoading: store.isLoading(),
    status: store.status,
    firebaseConfigured: store.firebaseConfigured,
    displayName: store.displayName(),
    email: store.email(),
    photoURL: store.photoURL(),
  };
}
