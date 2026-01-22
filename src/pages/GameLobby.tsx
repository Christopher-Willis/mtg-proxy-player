import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadDecks } from '../services/deckStorage';
import { createGameRoom, subscribeToRoomList, RoomIndex, deleteGameRoom, ensureSignedIn } from '../services/firebase';
import { Deck } from '../types/card';
import { AuthButton } from '../components/AuthButton';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/Spinner';

export function GameLobby() {
  const navigate = useNavigate();
  const { isAnonymous, isLoading: isAuthLoading, firebaseConfigured, user } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [rooms, setRooms] = useState<RoomIndex[]>([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [cancellingRoomId, setCancellingRoomId] = useState<string | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<string>('');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('mtg-player-name') || '');
  const [newRoomName, setNewRoomName] = useState('');

  const currentUid = user?.uid ?? null;

  useEffect(() => {
    setDecks(loadDecks());
  }, []);

  useEffect(() => {
    if (!firebaseConfigured || isAuthLoading) return;

    let unsubscribe: (() => void) | undefined;
    void (async () => {
      await ensureSignedIn();
      unsubscribe = subscribeToRoomList((roomList) => {
        setRooms(roomList);
      });
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [firebaseConfigured, isAuthLoading]);

  useEffect(() => {
    if (playerName) {
      localStorage.setItem('mtg-player-name', playerName);
    }
  }, [playerName]);

  async function handleCreateRoom() {
    if (!newRoomName.trim() || !selectedDeck || !playerName.trim() || isCreatingRoom) return;
    setIsCreatingRoom(true);

    try {
      const user = await ensureSignedIn();
      if (!user?.uid) {
        alert('Unable to sign in. Please refresh and try again.');
        return;
      }

      const roomId = await createGameRoom(newRoomName.trim(), user.uid);
      if (roomId) {
        navigate(`/multiplayer/${roomId}?deck=${selectedDeck}&name=${encodeURIComponent(playerName)}`);
      }
    } catch (err) {
      console.warn('[GameLobby] createGameRoom failed', err);
      alert('Failed to create game room. Check Firebase rules/auth and try again.');
    } finally {
      setIsCreatingRoom(false);
    }
  }

  function handleJoinRoom(roomId: string) {
    if (!selectedDeck || !playerName.trim()) {
      alert('Please select a deck and enter your name first');
      return;
    }
    navigate(`/multiplayer/${roomId}?deck=${selectedDeck}&name=${encodeURIComponent(playerName)}`);
  }

  async function handleCancelRoom(roomId: string, roomName: string) {
    if (cancellingRoomId) return;
    setCancellingRoomId(roomId);
    const room = rooms.find((r) => r.id === roomId);
    try {
      const uid = currentUid ?? (await ensureSignedIn())?.uid ?? null;
      if (!uid || !room?.createdByUid || room.createdByUid !== uid) {
        alert('Only the room creator can cancel this game.');
        return;
      }
      if (confirm(`Are you sure you want to cancel the game "${roomName}"? All players will be removed.`)) {
        await deleteGameRoom(roomId);
      }
    } catch (err) {
      console.warn('[GameLobby] deleteGameRoom failed', err);
      alert('Failed to cancel game. This is usually a Firebase rules/permissions issue.');
    } finally {
      setCancellingRoomId(null);
    }
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!firebaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Multiplayer Setup Required</h1>
          
          <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-4 mb-6">
            <h2 className="text-xl font-semibold text-yellow-400 mb-2">Firebase Not Configured</h2>
            <p className="text-gray-300 mb-4">
              To enable multiplayer, you need to set up Firebase Realtime Database:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Firebase Console</a></li>
              <li>Create a new project (or use existing)</li>
              <li>Enable Realtime Database (start in test mode for now)</li>
              <li>Go to Project Settings → General → Your apps → Add web app</li>
              <li>Copy the config values to a <code className="bg-gray-800 px-1 rounded">.env</code> file</li>
            </ol>
            
            <div className="mt-4 bg-gray-800 p-3 rounded text-sm font-mono">
              <p className="text-gray-400"># .env file contents:</p>
              <p>VITE_FIREBASE_API_KEY=your-key</p>
              <p>VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com</p>
              <p>VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com</p>
              <p>VITE_FIREBASE_PROJECT_ID=your-project-id</p>
              <p>VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com</p>
              <p>VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id</p>
              <p>VITE_FIREBASE_APP_ID=your-app-id</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            ← Back to Deck Builder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Multiplayer Lobby</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              ← Back
            </button>
            <AuthButton />
          </div>
        </div>

        {/* Player Setup */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-4">Your Setup</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Select Deck</label>
              <select
                value={selectedDeck}
                onChange={(e) => setSelectedDeck(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              >
                <option value="">Choose a deck...</option>
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name} ({deck.cards.reduce((sum, dc) => sum + dc.quantity, 0)} cards)
                  </option>
                ))}
              </select>
            </div>
          </div>
          {decks.length === 0 && (
            <p className="text-yellow-400 mt-2">
              No decks found. <a href="/" className="underline">Create a deck first</a>.
            </p>
          )}
        </div>

        {/* Create Room */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold">Create New Game</h2>
            {isAnonymous && (
              <span className="text-xs bg-gray-600/30 text-gray-400 px-2 py-0.5 rounded">Sign in required</span>
            )}
          </div>
          {isAnonymous ? (
            <div className="bg-gray-700/50 rounded p-3 text-center">
              <p className="text-sm text-gray-400 mb-1">
                Sign in with Google to create games
              </p>
              <p className="text-xs text-gray-500">
                Guests can join existing games but cannot create new ones
              </p>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Game room name..."
                className="flex-1 px-3 py-2 bg-gray-700 rounded text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
              />
              <button
                onClick={handleCreateRoom}
                disabled={!newRoomName.trim() || !selectedDeck || !playerName.trim() || isCreatingRoom}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold"
              >
                Create & Join
              </button>
            </div>
          )}
        </div>

        {/* Room List */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Active Games</h2>
          {rooms.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No active games. Create one above!</p>
          ) : (
            <div className="space-y-2">
              {rooms.map((room) => {
                const mySession = room.players && currentUid
                  ? room.players[currentUid]
                  : null;

                return (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-3 bg-gray-700 rounded hover:bg-gray-600"
                  >
                    <div>
                      <p className="font-semibold">{room.name}</p>
                      <p className="text-sm text-gray-400">
                        {Object.keys(room.players || {}).length} player(s)
                        {room.players && Object.values(room.players).map((p) => (
                          <span
                            key={p.uid}
                            className={`ml-2 ${p.isOnline ? 'text-green-400' : 'text-gray-500'}`}
                          >
                            {p.playerName}
                            {!p.isOnline && ' (offline)'}
                          </span>
                        ))}
                      </p>
                      {mySession && (
                        <p className="text-sm text-yellow-400 mt-1">
                          You have an existing session with deck: {mySession.deckName}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/observe/${room.id}`)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
                      >
                        Observe
                      </button>
                      {mySession ? (
                        mySession.isOnline ? (
                          <button
                            disabled
                            className="px-4 py-2 bg-gray-600 cursor-not-allowed rounded"
                            title="You are already connected in another tab/window. Close it or leave the game to rejoin here."
                          >
                            Already Connected
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              const deckToUse = decks.find((d) => d.name === mySession.deckName);
                              if (deckToUse) {
                                navigate(`/multiplayer/${room.id}?deck=${deckToUse.id}&name=${encodeURIComponent(playerName)}`);
                              } else {
                                alert(`Deck "${mySession.deckName}" not found locally. You may need to re-import it.`);
                              }
                            }}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold"
                          >
                            Rejoin
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handleJoinRoom(room.id)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                        >
                          Join
                        </button>
                      )}
                      <button
                        onClick={() => handleCancelRoom(room.id, room.name)}
                        disabled={Boolean(currentUid) && room.createdByUid !== currentUid}
                        className={`px-4 py-2 rounded ${Boolean(currentUid) && room.createdByUid !== currentUid ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                        title={Boolean(currentUid) && room.createdByUid !== currentUid ? 'Only the room creator can cancel this game.' : undefined}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
