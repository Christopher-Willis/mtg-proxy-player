import { create } from 'zustand';
import { User } from 'firebase/auth';

export type AuthStatus = 'initializing' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthState {
  user: User | null;
  isAnonymous: boolean;
  status: AuthStatus;
  firebaseConfigured: boolean;
  error: string | null;
  
  setUser: (user: User | null) => void;
  setStatus: (status: AuthStatus) => void;
  setFirebaseConfigured: (configured: boolean) => void;
  setError: (error: string | null) => void;
  
  displayName: () => string | null;
  email: () => string | null;
  photoURL: () => string | null;
  isLoading: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAnonymous: true,
  status: 'initializing',
  firebaseConfigured: false,
  error: null,
  
  setUser: (user) => set({ 
    user, 
    isAnonymous: user?.isAnonymous ?? true,
    status: user ? 'authenticated' : 'unauthenticated'
  }),
  
  setStatus: (status) => set({ status }),
  
  setFirebaseConfigured: (configured) => set({ firebaseConfigured: configured }),
  
  setError: (error) => set({ error, status: error ? 'error' : get().status }),
  
  displayName: () => get().user?.displayName ?? null,
  email: () => get().user?.email ?? null,
  photoURL: () => get().user?.photoURL ?? null,
  isLoading: () => ['initializing', 'loading'].includes(get().status),
}));
