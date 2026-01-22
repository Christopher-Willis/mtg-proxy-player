# MTG Proxy Player

A web-based Magic: The Gathering proxy playtesting application. Build decks, playtest solo, or play multiplayer games with friends using Firebase Realtime Database. This will not be a monetized product, and is still in active development. Really, this is being made so that my friend with a deck of over a thousand cards is to unwieldy to manage physically. This will allow for more speedy play. 

## Features

- **Card Search** - Search for MTG cards using the Scryfall API
- **Deck Builder** - Create and manage decks with local storage persistence (for now, likely move to DB later)
- **Solo Playtesting** - Test your decks with a full playspace (battlefield, hand, graveyard, exile, library). Play spaces are manually managed for now as rules engine is a huge task.
- **Multiplayer** - Create or join game rooms to play with others in real-time. No auth right now, so anyone can join any room. Totally insecure and anyone can mess everything up at any time. 
- **Observer Mode** - Watch ongoing multiplayer games

## Tech Stack

- **React 19** with TypeScript
- **Vite** for development and building
- **Tailwind CSS 4** for styling
- **React Router** for navigation
- **Firebase Realtime Database** for multiplayer functionality
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
    - Enables future “diff-style” updates (update only the touched card / order change) rather than rewriting entire arrays.

### TypeScript / Vite environment setup

- **Added `tsconfig.json`**
  - **Why:** Ensures Vite types (e.g. `import.meta.env`) are picked up and TypeScript tooling works reliably.

## Project Structure

```
src/
├── components/     # Reusable UI components
├── data/           # Static data and constants
├── hooks/          # Custom React hooks
├── pages/          # Route pages
│   ├── CardSearch.tsx
│   ├── DeckBuilder.tsx
│   ├── GameLobby.tsx
│   ├── MultiplayerGame.tsx
│   ├── ObserverView.tsx
│   └── PlaySpace.tsx
├── services/       # External service integrations
│   ├── deckStorage.ts   # Local storage for decks
│   ├── firebase.ts      # Firebase Realtime Database
│   └── scryfall.ts      # Scryfall API client
└── types/          # TypeScript type definitions
```

## Future Wins

- **Incremental (diff-based) Firebase writes**
  - Instead of syncing full zones, update only:
    - a single card (`.../cardsById/<instanceId>/tapped`)
    - and/or the relevant `order` list when cards move.

- **Security + abuse prevention**
  - Add Firebase Auth (anonymous is fine) + Realtime Database security rules.
  - Optional: App Check.

- **Presence + cleanup**
  - Automatically mark players offline with presence.
  - Optionally remove/disconnect players from turn order.

- **Observability**
  - Add lightweight logging / metrics around message sizes and update frequency.

## License

MIT
