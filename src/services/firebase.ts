import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, remove, update, Database } from 'firebase/database';
import { FirebaseZoneWire } from '../types/card';

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

export type PlayerStateWire = {
  odId: string;
  playerName: string;
  odName: string;
  battlefield: FirebaseZoneWire;
  graveyard: FirebaseZoneWire;
  exile: FirebaseZoneWire;
  hand: FirebaseZoneWire;
  library: FirebaseZoneWire;
  handCount: number;
  libraryCount: number;
  life: number;
  lastUpdate: number;
  isOnline: boolean;
};

export type PlayerState = PlayerStateWire;

export type GameRoom = {
  id: string;
  name: string;
  createdAt: number;
  players: Record<string, PlayerStateWire>;
  turnOrder?: string[];
  currentTurnIndex?: number;
};

export type PlayerSummary = {
  odId: string;
  playerName: string;
  odName: string;
  isOnline: boolean;
};

export type RoomIndex = {
  id: string;
  name: string;
  createdAt: number;
  players: Record<string, PlayerSummary>;
};

export function createGameRoom(roomName: string): string | null {
  const db = getDb();
  if (!db) return null;

  const roomsRef = ref(db, 'rooms');
  const newRoomRef = push(roomsRef);
  const roomId = newRoomRef.key;

  if (!roomId) return null;

  const createdAt = Date.now();
  const room: Omit<GameRoom, 'players'> & { players: Record<string, never> } = {
    id: roomId,
    name: roomName,
    createdAt,
    players: {},
    turnOrder: [],
    currentTurnIndex: 0,
  };

  const roomIndex: RoomIndex = {
    id: roomId,
    name: roomName,
    createdAt,
    players: {},
  };

  update(ref(db), {
    [`rooms/${roomId}`]: room,
    [`roomsIndex/${roomId}`]: roomIndex,
  });
  return roomId;
}

export function addPlayerToTurnOrder(roomId: string, turnOrder: string[], odId: string) {
  const db = getDb();
  if (!db) return;

  if (turnOrder.includes(odId)) return;

  const nextOrder = [...turnOrder, odId];
  update(ref(db), {
    [`rooms/${roomId}/turnOrder`]: nextOrder,
  });
}

export function advanceTurn(roomId: string, turnOrderLength: number, currentTurnIndex: number) {
  const db = getDb();
  if (!db) return;
  if (turnOrderLength <= 0) return;

  const nextIndex = (currentTurnIndex + 1) % turnOrderLength;
  update(ref(db), {
    [`rooms/${roomId}/currentTurnIndex`]: nextIndex,
  });
}

export function joinGameRoom(
  roomId: string,
  odId: string,
  playerName: string,
  deckName: string,
  initialState: Partial<PlayerStateWire>
) {
  const db = getDb();
  if (!db) return;

  const emptyZone: FirebaseZoneWire = { cardsById: {}, order: [] };

  const playerState: PlayerStateWire = {
    odId,
    playerName,
    odName: deckName,
    battlefield: initialState.battlefield ?? emptyZone,
    graveyard: initialState.graveyard ?? emptyZone,
    exile: initialState.exile ?? emptyZone,
    hand: initialState.hand ?? emptyZone,
    library: initialState.library ?? emptyZone,
    handCount: initialState.handCount || 0,
    libraryCount: initialState.libraryCount || 0,
    life: initialState.life || 20,
    lastUpdate: Date.now(),
    isOnline: true,
  };

  const playerSummary: PlayerSummary = {
    odId,
    playerName,
    odName: deckName,
    isOnline: true,
  };

  update(ref(db), {
    [`rooms/${roomId}/players/${odId}`]: playerState,
    [`roomsIndex/${roomId}/players/${odId}`]: playerSummary,
  });
}

export function setPlayerOnlineStatus(roomId: string, odId: string, isOnline: boolean) {
  const db = getDb();
  if (!db) return;

  update(ref(db), {
    [`rooms/${roomId}/players/${odId}/isOnline`]: isOnline,
    [`rooms/${roomId}/players/${odId}/lastUpdate`]: Date.now(),
    [`roomsIndex/${roomId}/players/${odId}/isOnline`]: isOnline,
  });
}

export function updatePlayerState(roomId: string, odId: string, updates: Partial<PlayerStateWire>) {
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

  const playerIndexRef = ref(db, `roomsIndex/${roomId}/players/${odId}`);
  remove(playerIndexRef);
}

export function deleteGameRoom(roomId: string) {
  const db = getDb();
  if (!db) return;

  const roomRef = ref(db, `rooms/${roomId}`);
  remove(roomRef);

  const roomIndexRef = ref(db, `roomsIndex/${roomId}`);
  remove(roomIndexRef);
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

export function subscribeToRoomList(callback: (rooms: RoomIndex[]) => void): () => void {
  const db = getDb();
  if (!db) {
    callback([]);
    return () => {};
  }

  const roomsRef = ref(db, 'roomsIndex');
  const unsubscribe = onValue(roomsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    const rooms = Object.values(data) as RoomIndex[];
    callback(rooms);
  });

  return unsubscribe;
}
