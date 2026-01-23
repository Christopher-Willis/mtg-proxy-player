# MTG Proxy Player

A web-based Magic: The Gathering proxy playtesting application. Build decks, playtest solo, or play multiplayer games with friends using Firebase Realtime Database. This will not be a monetized product, and is still in active development. Really, this is being made so that my friend with a deck of over a thousand cards is to unwieldy to manage physically. This will allow for more speedy play. 

## Features

- **Card Search** - Search for MTG cards using the Scryfall API
- **Deck Builder** - Create and manage decks with dual storage options:
  - **Local Storage** - Browser-based storage (fragile, cleared with browser data)
  - **Cloud Storage** - Firebase-backed storage (max 5 decks, persists across devices, user-owned)
- **Authentication** - Sign in with Google for persistent cloud storage, or continue as guest (data expires after 30 days of inactivity)
- **Solo Playtesting** - Test your decks with a full playspace (battlefield, hand, graveyard, exile, library). Play spaces are manually managed for now as rules engine is a huge task.
- **Multiplayer** - Create or join game rooms to play with others in real-time. Uses Firebase Anonymous Auth with ownership-based security rules (room creators control their rooms, players control their own state). 
- **Observer Mode** - Watch ongoing multiplayer games

## Tech Stack

- **React 19** with TypeScript
- **Vite** for development and building
- **Tailwind CSS 4** for styling
- **React Router** for navigation
- **Zustand** for global state management
- **Firebase Realtime Database** for multiplayer functionality
- **Firebase Authentication** (Google + Anonymous)
- **Scryfall API** for card data and images

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd mtg-proxy-player
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root with your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> **Note:** Firebase is optional. The app will work without it, but multiplayer features will be disabled.

### 4. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Available Scripts

- **`npm run dev`** - Start development server with hot reload
- **`npm run build`** - Build for production
- **`npm run preview`** - Preview production build locally
- **`npm run lint`** - Run ESLint

## Recent Enhancements (and why)

### Player identification (UID-based)

- **What:** Players in multiplayer games are now identified by their Firebase Authentication UID, not by deck name or any other identifier.
- **Why:** Prevents a single authenticated user from joining the same game multiple times. Player names are now purely for display purposes. Simplifies state restoration when rejoining games.

### Global auth state with Zustand

- **What:** Authentication state is now managed globally using Zustand and initialized at app startup.
- **Why:** Prevents UI flicker when navigating between pages (e.g., seeing "Firebase Not Configured" briefly before the actual content loads). Auth state persists across route changes without re-initialization.

### UX improvements

- **Loading spinners** - Contextual loading indicators for async operations (cloud deck copy/move) prevent double-clicks and provide feedback.
- **Cursor feedback** - All interactive elements (buttons, clickable icons) now show pointer cursor. Disabled buttons show not-allowed cursor.
- **Guest mode restrictions** - Guests cannot create games or save to cloud storage, with clear UI indicators explaining why.

### Multiplayer traffic optimizations

- **Lobby index (`roomsIndex/`)**
  - **What:** The lobby subscribes to a lightweight `roomsIndex` tree instead of the full `rooms/` tree.
  - **Why:** Subscribing to `rooms/` causes the lobby to receive *all* game-state updates for *all* rooms. `roomsIndex` only stores room metadata + player summaries.

- **Turn tracking (`turnOrder`, `currentTurnIndex`)**
  - **What:** Each room tracks a join-order `turnOrder` and a `currentTurnIndex`, and the UI shows whose turn it is with an **End Turn** button.
  - **Why:** Helps keep multiplayer games organized without restricting off-turn interaction (Magic allows responses at any time).

- **Minified multiplayer card payloads**
  - **What:** Firebase no longer stores full Scryfall card objects. It stores only card identifiers and per-instance state.
  - **Why:** Dramatically reduces bandwidth/storage while letting clients hydrate full card details from local deck data + a Scryfall cache.

- **Zones stored as map + order (`{ cardsById, order }`)**
  - **What:** Every zone in multiplayer (`library`, `hand`, `battlefield`, `graveyard`, `exile`) is stored as:
    - `cardsById: Record<instanceId, { cardId, tapped, faceDown }>`
    - `order: string[]` (ordered `instanceId`s)
  - **Why:**
    - Preserves ordering for zones where order matters.
    - Enables diff-based updates (see below).

- **Incremental (diff-based) Firebase writes**
  - **What:** Instead of syncing full zone state on every change, the client tracks previous state and computes diffs:
    - Card property changes (tap/untap) → writes only `.../cardsById/<instanceId>/tapped`
    - Card additions → writes only the new card entry
    - Card removals → deletes only the removed card entry
    - Order changes → updates only the `order` array when cards actually move
  - **Results:** ~75x reduction in transfer size for common actions:
    - Initial sync: ~3.3 KB (full state, unavoidable)
    - Tapping a card: **44 bytes** (previously ~3.3 KB)
    - Moving cards between zones: 800–1300 bytes (just affected cards + order)
  - **Why:** Dramatically reduces Firebase bandwidth, improves sync latency, and keeps costs low.

### TypeScript / Vite environment setup

- **Added `tsconfig.json`**
  - **Why:** Ensures Vite types (e.g. `import.meta.env`) are picked up and TypeScript tooling works reliably.

## Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── AuthButton.tsx   # Login/logout dropdown
│   ├── Spinner.tsx      # Loading indicator
│   └── ...
├── data/           # Static data and constants
├── hooks/          # Custom React hooks
│   └── useAuth.ts       # Auth hook (uses Zustand store)
├── pages/          # Route pages
│   ├── CardSearch.tsx
│   ├── DeckBuilder.tsx
│   ├── GameLobby.tsx
│   ├── MultiplayerGame.tsx
│   ├── ObserverView.tsx
│   └── PlaySpace.tsx
├── services/       # External service integrations
│   ├── deckStorage.ts   # Local storage for decks
│   ├── firebase.ts      # Firebase Realtime Database + Auth
│   └── scryfall.ts      # Scryfall API client
├── stores/         # Zustand state stores
│   └── authStore.ts     # Global auth state
└── types/          # TypeScript type definitions
```

## Future Wins

- **Token/counter auto-detection**
  - Scan deck card text for token and counter mentions (e.g., "create a 1/1 white Soldier creature token", "put a +1/+1 counter")
  - Auto-populate the token drawer with relevant tokens and counters based on the deck's cards
  - Use Scryfall's token relations API to fetch actual token images

- **Presence + cleanup**
  - Automatically mark players offline with Firebase `onDisconnect()` presence.
  - Optionally remove/disconnect players from turn order after extended absence.

- **Observability**
  - Add lightweight logging / metrics around message sizes and update frequency.

- **App Check**
  - Add Firebase App Check for additional abuse prevention.

## Firebase Security Notes (recommended for public deployments)

If you deploy this publicly, treat Firebase as public infrastructure. The Firebase web config is intentionally visible to clients, so access control should be enforced via **Firebase Auth** and **Realtime Database Rules**.

### Current implementation: ownership-based rules

The app uses **Firebase Auth** (Anonymous + Google Sign-In) and stores ownership information (`createdByUid` on rooms, `uid` on player nodes) to enforce:
- Only the room creator can delete/cancel a room
- Players can only modify their own player state
- Users can only access their own cloud decks

### Enabling Authentication

1. Go to Firebase Console → Authentication → Sign-in method
2. Enable **Anonymous** (for guest users)
3. Enable **Google** (for persistent accounts)
4. Add your deployment domain to **Authorized domains** (e.g., `your-app.vercel.app`)

After enabling authentication, use these rules:

```json
{
  "rules": {
    "roomsIndex": {
      ".read": "auth != null",
      "$roomId": {
        ".write": "auth != null && ((!data.exists() && newData.child('createdByUid').val() === auth.uid) || (data.exists() && data.child('createdByUid').val() === auth.uid))",
        "players": {
          "$odId": {
            ".write": "auth != null && (data.child('uid').val() === auth.uid || (!data.exists() && newData.child('uid').val() === auth.uid))"
          }
        }
      }
    },
    "rooms": {
      ".read": "auth != null",
      "$roomId": {
        ".write": "auth != null && ((!data.exists() && newData.child('createdByUid').val() === auth.uid) || (data.exists() && data.child('createdByUid').val() === auth.uid))",
        "players": {
          "$odId": {
            ".write": "auth != null && (data.child('uid').val() === auth.uid || (!data.exists() && newData.child('uid').val() === auth.uid))"
          }
        },
        "turnOrder": {
          ".write": "auth != null"
        },
        "currentTurnIndex": {
          ".write": "auth != null"
        }
      }
    },
    "userDecks": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

This provides marginal grief prevention for public deployments while keeping the game functional.

## License

MIT
