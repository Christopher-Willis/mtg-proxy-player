import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, remove, set, update, Database } from 'firebase/database';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithPopup, signOut as firebaseSignOut, GoogleAuthProvider, linkWithCredential, Auth, User } from 'firebase/auth';
import { FirebaseZoneWire, FirebaseGameCard, Deck } from '../types/card';

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
let auth: Auth | null = null;
let authReadyPromise: Promise<User | null> | null = null;

export function initFirebase() {
  if (!firebaseConfig.databaseURL) {
    console.warn('Firebase not configured. Multiplayer features disabled.');
    return null;
  }
  
  if (!app) {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    auth = getAuth(app);
  }
  return database;
}

export function getDb() {
  if (!database) {
    initFirebase();
  }
  return database;
}

export function ensureSignedIn(): Promise<User | null> {
  const db = getDb();
  if (!db || !auth) {
    return Promise.resolve(null);
  }

  if (authReadyPromise) return authReadyPromise;

  authReadyPromise = new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth as Auth, async (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
        return;
      }

      try {
        const creds = await signInAnonymously(auth as Auth);
        unsubscribe();
        resolve(creds.user);
      } catch (err) {
        console.warn('Anonymous sign-in failed. Multiplayer features may not work.', err);
        authReadyPromise = null;
        unsubscribe();
        resolve(null);
      }
    });
  });

  return authReadyPromise;
}

export function getCurrentUserId(): string | null {
  if (!auth) return null;
  return auth.currentUser?.uid ?? null;
}

export function getCurrentUser(): User | null {
  if (!auth) return null;
  return auth.currentUser;
}

export function isAnonymousUser(): boolean {
  return auth?.currentUser?.isAnonymous ?? true;
}

export type AuthState = {
  user: User | null;
  isAnonymous: boolean;
  isLoading: boolean;
};

export function subscribeToAuthState(callback: (state: AuthState) => void): () => void {
  if (!auth) {
    callback({ user: null, isAnonymous: true, isLoading: false });
    return () => {};
  }

  return onAuthStateChanged(auth, (user) => {
    callback({
      user,
      isAnonymous: user?.isAnonymous ?? true,
      isLoading: false,
    });
  });
}

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  if (!auth) {
    return { success: false, error: 'Auth not initialized' };
  }

  try {
    await signInWithPopup(auth, googleProvider);
    authReadyPromise = Promise.resolve(auth.currentUser);
    return { success: true };
  } catch (err) {
    const error = err as { code?: string; message?: string };
    if (error.code === 'auth/popup-closed-by-user') {
      return { success: false, error: 'Sign-in cancelled' };
    }
    return { success: false, error: error.message || 'Sign-in failed' };
  }
}

export async function signInAsGuest(): Promise<{ success: boolean; error?: string }> {
  if (!auth) {
    return { success: false, error: 'Auth not initialized' };
  }

  try {
    const creds = await signInAnonymously(auth);
    authReadyPromise = Promise.resolve(creds.user);
    return { success: true };
  } catch (err) {
    const error = err as { message?: string };
    return { success: false, error: error.message || 'Guest sign-in failed' };
  }
}

export async function signOut(): Promise<void> {
  if (!auth) return;
  await firebaseSignOut(auth);
  authReadyPromise = null;
}

export async function linkAnonymousToGoogle(): Promise<{ success: boolean; error?: string }> {
  if (!auth?.currentUser) {
    return { success: false, error: 'Not signed in' };
  }

  if (!auth.currentUser.isAnonymous) {
    return { success: false, error: 'Already linked to an account' };
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential && auth.currentUser) {
      await linkWithCredential(auth.currentUser, credential);
    }
    return { success: true };
  } catch (err) {
    const error = err as { code?: string; message?: string };
    if (error.code === 'auth/credential-already-in-use') {
      return { success: false, error: 'This Google account is already linked to another user' };
    }
    return { success: false, error: error.message || 'Failed to link account' };
  }
}

export type PlayerStateWire = {
  uid: string;
  playerName: string;
  deckName: string;
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
  createdByUid: string;
  players: Record<string, PlayerStateWire>;
  turnOrder?: string[];
  currentTurnIndex?: number;
};

export type PlayerSummary = {
  uid: string;
  playerName: string;
  deckName: string;
  isOnline: boolean;
};

export type RoomIndex = {
  id: string;
  name: string;
  createdAt: number;
  createdByUid: string;
  players: Record<string, PlayerSummary>;
};

export async function createGameRoom(roomName: string, createdByUid: string): Promise<string | null> {
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
    createdByUid,
    players: {},
    turnOrder: [],
    currentTurnIndex: 0,
  };

  const roomIndex: RoomIndex = {
    id: roomId,
    name: roomName,
    createdAt,
    createdByUid,
    players: {},
  };

  await Promise.all([
    set(ref(db, `rooms/${roomId}`), room),
    set(ref(db, `roomsIndex/${roomId}`), roomIndex),
  ]);
  return roomId;
}

export function addPlayerToTurnOrder(roomId: string, turnOrder: string[], uid: string, roomExists: boolean) {
  const db = getDb();
  if (!db || !roomExists) return;

  if (turnOrder.includes(uid)) return;

  const nextOrder = [...turnOrder, uid];
  update(ref(db, `rooms/${roomId}`), {
    turnOrder: nextOrder,
  });
}

export function advanceTurn(roomId: string, turnOrderLength: number, currentTurnIndex: number) {
  const db = getDb();
  if (!db) return;
  if (turnOrderLength <= 0) return;

  const nextIndex = (currentTurnIndex + 1) % turnOrderLength;
  update(ref(db, `rooms/${roomId}`), {
    currentTurnIndex: nextIndex,
  });
}

export function joinGameRoom(
  roomId: string,
  uid: string,
  playerName: string,
  deckName: string,
  initialState: Partial<PlayerStateWire>
) {
  const db = getDb();
  if (!db) return;

  const emptyZone: FirebaseZoneWire = { cardsById: {}, order: [] };

  const playerState: PlayerStateWire = {
    uid,
    playerName,
    deckName,
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
    uid,
    playerName,
    deckName,
    isOnline: true,
  };

  void Promise.all([
    set(ref(db, `rooms/${roomId}/players/${uid}`), playerState),
    set(ref(db, `roomsIndex/${roomId}/players/${uid}`), playerSummary),
  ]);
}

export function setPlayerOnlineStatus(roomId: string, uid: string, isOnline: boolean) {
  const db = getDb();
  if (!db) return;

  const lastUpdate = Date.now();
  void Promise.all([
    update(ref(db, `rooms/${roomId}/players/${uid}`), { isOnline, lastUpdate }),
    update(ref(db, `roomsIndex/${roomId}/players/${uid}`), { isOnline }),
  ]);
}

export function updatePlayerState(roomId: string, uid: string, updates: Partial<PlayerStateWire>) {
  const db = getDb();
  if (!db) return;

  const playerRef = ref(db, `rooms/${roomId}/players/${uid}`);
  update(playerRef, { ...updates, lastUpdate: Date.now() });
}

export type ZoneDiff = {
  addedCards: Record<string, FirebaseGameCard>;
  removedCardIds: string[];
  updatedCards: Record<string, Partial<FirebaseGameCard>>;
  newOrder: string[] | null;
};

export type PlayerStateDiff = {
  battlefield?: ZoneDiff;
  graveyard?: ZoneDiff;
  exile?: ZoneDiff;
  hand?: ZoneDiff;
  library?: ZoneDiff;
  handCount?: number;
  libraryCount?: number;
  life?: number;
};

export function updatePlayerStateDiff(roomId: string, uid: string, diff: PlayerStateDiff) {
  const db = getDb();
  if (!db) return;

  const basePath = `rooms/${roomId}/players/${uid}`;
  const updates: Record<string, unknown> = {
    [`${basePath}/lastUpdate`]: Date.now(),
    [`${basePath}/isOnline`]: true,
  };

  const zones = ['battlefield', 'graveyard', 'exile', 'hand', 'library'] as const;
  for (const zoneName of zones) {
    const zoneDiff = diff[zoneName];
    if (!zoneDiff) continue;

    const zonePath = `${basePath}/${zoneName}`;

    for (const [instanceId, card] of Object.entries(zoneDiff.addedCards)) {
      updates[`${zonePath}/cardsById/${instanceId}`] = card;
    }

    for (const instanceId of zoneDiff.removedCardIds) {
      updates[`${zonePath}/cardsById/${instanceId}`] = null;
    }

    for (const [instanceId, cardUpdates] of Object.entries(zoneDiff.updatedCards)) {
      for (const [key, value] of Object.entries(cardUpdates)) {
        updates[`${zonePath}/cardsById/${instanceId}/${key}`] = value;
      }
    }

    if (zoneDiff.newOrder !== null) {
      updates[`${zonePath}/order`] = zoneDiff.newOrder;
    }
  }

  if (diff.handCount !== undefined) {
    updates[`${basePath}/handCount`] = diff.handCount;
  }
  if (diff.libraryCount !== undefined) {
    updates[`${basePath}/libraryCount`] = diff.libraryCount;
  }
  if (diff.life !== undefined) {
    updates[`${basePath}/life`] = diff.life;
  }

  update(ref(db), updates);
}

export function leaveGameRoom(roomId: string, uid: string) {
  const db = getDb();
  if (!db) return;

  const playerRef = ref(db, `rooms/${roomId}/players/${uid}`);
  remove(playerRef);

  const playerIndexRef = ref(db, `roomsIndex/${roomId}/players/${uid}`);
  remove(playerIndexRef);
}

export function deleteGameRoom(roomId: string) {
  const db = getDb();
  if (!db) return;

  const roomRef = ref(db, `rooms/${roomId}`);
  const roomIndexRef = ref(db, `roomsIndex/${roomId}`);

  return Promise.all([remove(roomRef), remove(roomIndexRef)]).then(() => undefined);
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

const MAX_CLOUD_DECKS = 5;

export type CloudDeck = Deck & {
  odId: string;
};

export async function loadCloudDecks(): Promise<CloudDeck[]> {
  const db = getDb();
  const user = await ensureSignedIn();
  if (!db || !user?.uid) return [];

  return new Promise((resolve) => {
    const decksRef = ref(db, `userDecks/${user.uid}`);
    onValue(decksRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        resolve([]);
        return;
      }
      const decks = Object.entries(data).map(([odId, deck]) => ({
        ...(deck as Deck),
        odId,
      }));
      resolve(decks);
    }, { onlyOnce: true });
  });
}

export function subscribeToCloudDecks(callback: (decks: CloudDeck[]) => void): () => void {
  const db = getDb();
  if (!db || !auth?.currentUser?.uid) {
    callback([]);
    return () => {};
  }

  const decksRef = ref(db, `userDecks/${auth.currentUser.uid}`);
  const unsubscribe = onValue(decksRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    const decks = Object.entries(data).map(([odId, deck]) => ({
      ...(deck as Deck),
      odId,
    }));
    callback(decks);
  });

  return unsubscribe;
}

export async function saveCloudDeck(deck: Deck): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  const user = await ensureSignedIn();
  if (!db || !user?.uid) {
    return { success: false, error: 'Not signed in' };
  }

  const existingDecks = await loadCloudDecks();
  const existingIndex = existingDecks.findIndex((d) => d.id === deck.id);

  if (existingIndex < 0 && existingDecks.length >= MAX_CLOUD_DECKS) {
    return { success: false, error: `Maximum ${MAX_CLOUD_DECKS} cloud decks allowed` };
  }

  const odId = existingIndex >= 0 ? existingDecks[existingIndex].odId : push(ref(db, `userDecks/${user.uid}`)).key;
  if (!odId) {
    return { success: false, error: 'Failed to generate deck ID' };
  }

  const deckData: Deck = {
    ...deck,
    updatedAt: Date.now(),
  };

  await set(ref(db, `userDecks/${user.uid}/${odId}`), deckData);
  return { success: true };
}

export async function deleteCloudDeck(deckId: string): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  const user = await ensureSignedIn();
  if (!db || !user?.uid) {
    return { success: false, error: 'Not signed in' };
  }

  const existingDecks = await loadCloudDecks();
  const deck = existingDecks.find((d) => d.id === deckId);
  if (!deck) {
    return { success: false, error: 'Deck not found' };
  }

  await remove(ref(db, `userDecks/${user.uid}/${deck.odId}`));
  return { success: true };
}

export function getCloudDeckCount(): Promise<number> {
  return loadCloudDecks().then((decks) => decks.length);
}
