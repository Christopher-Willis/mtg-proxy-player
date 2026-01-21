import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, push, remove, update, Database } from 'firebase/database';
import { GameCard } from '../types/card';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: ReturnType<typeof initializeApp> | null = null;
let database: Database | null = null;

export function initFirebase() {
  if (!firebaseConfig.databaseURL) {
    console.warn('Firebase not configured. Multiplayer features disabled.');
    return null;
  }
  
  if (!app) {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
  }
  return database;
}

export function getDb() {
  if (!database) {
    initFirebase();
  }
  return database;
}

export type PlayerState = {
  odId: string;
  playerName: string;
  odName: string;
  battlefield: GameCard[];
  graveyard: GameCard[];
  exile: GameCard[];
  hand: GameCard[];
  library: GameCard[];
  handCount: number;
  libraryCount: number;
  life: number;
  lastUpdate: number;
  isOnline: boolean;
};

export type GameRoom = {
  id: string;
  name: string;
  createdAt: number;
  players: Record<string, PlayerState>;
};

export function createGameRoom(roomName: string): string | null {
  const db = getDb();
  if (!db) return null;

  const roomsRef = ref(db, 'rooms');
  const newRoomRef = push(roomsRef);
  const roomId = newRoomRef.key;

  if (!roomId) return null;

  const room: Omit<GameRoom, 'players'> & { players: Record<string, never> } = {
    id: roomId,
    name: roomName,
    createdAt: Date.now(),
    players: {},
  };

  set(newRoomRef, room);
  return roomId;
}

export function joinGameRoom(
  roomId: string,
  odId: string,
  playerName: string,
  deckName: string,
  initialState: Partial<PlayerState>
) {
  const db = getDb();
  if (!db) return;

  const playerRef = ref(db, `rooms/${roomId}/players/${odId}`);
  const playerState: PlayerState = {
    odId,
    playerName,
    odName: deckName,
    battlefield: initialState.battlefield || [],
    graveyard: initialState.graveyard || [],
    exile: initialState.exile || [],
    hand: initialState.hand || [],
    library: initialState.library || [],
    handCount: initialState.handCount || 0,
    libraryCount: initialState.libraryCount || 0,
    life: initialState.life || 20,
    lastUpdate: Date.now(),
    isOnline: true,
  };

  set(playerRef, playerState);
}

export function setPlayerOnlineStatus(roomId: string, odId: string, isOnline: boolean) {
  const db = getDb();
  if (!db) return;

  const playerRef = ref(db, `rooms/${roomId}/players/${odId}`);
  update(playerRef, { isOnline, lastUpdate: Date.now() });
}

export function updatePlayerState(roomId: string, odId: string, updates: Partial<PlayerState>) {
  const db = getDb();
  if (!db) return;

  const playerRef = ref(db, `rooms/${roomId}/players/${odId}`);
  update(playerRef, { ...updates, lastUpdate: Date.now() });
}

export function leaveGameRoom(roomId: string, odId: string) {
  const db = getDb();
  if (!db) return;

  const playerRef = ref(db, `rooms/${roomId}/players/${odId}`);
  remove(playerRef);
}

export function deleteGameRoom(roomId: string) {
  const db = getDb();
  if (!db) return;

  const roomRef = ref(db, `rooms/${roomId}`);
  remove(roomRef);
}

export function subscribeToRoom(
  roomId: string,
  callback: (room: GameRoom | null) => void
): () => void {
  const db = getDb();
  if (!db) {
    callback(null);
    return () => {};
  }

  const roomRef = ref(db, `rooms/${roomId}`);
  const unsubscribe = onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    callback(data as GameRoom | null);
  });

  return unsubscribe;
}

export function subscribeToRoomList(callback: (rooms: GameRoom[]) => void): () => void {
  const db = getDb();
  if (!db) {
    callback([]);
    return () => {};
  }

  const roomsRef = ref(db, 'rooms');
  const unsubscribe = onValue(roomsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    const rooms = Object.values(data) as GameRoom[];
    callback(rooms);
  });

  return unsubscribe;
}
