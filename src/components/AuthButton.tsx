import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { signInWithGoogle, signInAsGuest, signOut, linkAnonymousToGoogle } from '../services/firebase';

export function AuthButton() {
  const { user, isAnonymous, isLoading, displayName, email, photoURL } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSigningIn(true);
    const result = await signInWithGoogle();
    setIsSigningIn(false);
    if (!result.success && result.error !== 'Sign-in cancelled') {
      setError(result.error || 'Sign-in failed');
    }
    setShowMenu(false);
  };

  const handleGuestSignIn = async () => {
    setError(null);
    setIsSigningIn(true);
    const result = await signInAsGuest();
    setIsSigningIn(false);
    if (!result.success) {
      setError(result.error || 'Guest sign-in failed');
    }
    setShowMenu(false);
  };

  const handleLinkToGoogle = async () => {
    setError(null);
    setIsSigningIn(true);
    const result = await linkAnonymousToGoogle();
    setIsSigningIn(false);
    if (!result.success) {
      setError(result.error || 'Failed to link account');
    }
    setShowMenu(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setShowMenu(false);
  };

  if (isLoading) {
    return (
      <div className="px-3 py-1.5 bg-gray-700 rounded text-sm text-gray-400">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium"
        >
          Sign In
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
            <div className="p-4 space-y-3">
              <button
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-800 rounded font-medium hover:bg-gray-100 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-800 text-gray-400">or</span>
                </div>
              </div>

              <button
                onClick={handleGuestSignIn}
                disabled={isSigningIn}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded font-medium disabled:opacity-50"
              >
                Continue as Guest
              </button>

              <p className="text-xs text-yellow-500 text-center">
                Guest data may be lost after 30 days of inactivity or when browser data is cleared.
              </p>

              {error && (
                <p className="text-xs text-red-400 text-center">{error}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
      >
        {photoURL ? (
          <img src={photoURL} alt="" className="w-6 h-6 rounded-full" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-xs">
            {isAnonymous ? '?' : (displayName?.[0] || email?.[0] || 'U')}
          </div>
        )}
        <span className="max-w-[120px] truncate">
          {isAnonymous ? 'Guest' : (displayName || email || 'User')}
        </span>
        {isAnonymous && (
          <span className="text-xs bg-yellow-600/30 text-yellow-400 px-1.5 py-0.5 rounded">Guest</span>
        )}
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
          <div className="p-3 border-b border-gray-700">
            <p className="font-medium truncate">{displayName || 'Guest User'}</p>
            {email && <p className="text-sm text-gray-400 truncate">{email}</p>}
            {isAnonymous && (
              <p className="text-xs text-yellow-500 mt-1">
                Guest account - data may expire
              </p>
            )}
          </div>

          <div className="p-2 space-y-1">
            {isAnonymous && (
              <button
                onClick={handleLinkToGoogle}
                disabled={isSigningIn}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-700 rounded disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Upgrade to Google Account
              </button>
            )}

            <button
              onClick={handleSignOut}
              className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-700 rounded"
            >
              Sign Out
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center p-2 border-t border-gray-700">{error}</p>
          )}
        </div>
      )}

      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
