import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DeckBuilder } from './pages/DeckBuilder';
import { PlaySpace } from './pages/PlaySpace';
import { GameLobby } from './pages/GameLobby';
import { MultiplayerGame } from './pages/MultiplayerGame';
import { ObserverView } from './pages/ObserverView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DeckBuilder />} />
        <Route path="/play/:deckId" element={<PlaySpace />} />
        <Route path="/lobby" element={<GameLobby />} />
        <Route path="/multiplayer/:roomId" element={<MultiplayerGame />} />
        <Route path="/observe/:roomId" element={<ObserverView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
