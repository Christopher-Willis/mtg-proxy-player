import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDeck, saveDeck } from '../services/deckStorage';
import { getCardImageUrl } from '../services/scryfall';
import { Deck, GameCard, DeckTokenBox, TokenDefinition, CounterDefinition, GameToken } from '../types/card';
import { TokenDrawer } from '../components/TokenDrawer';
import { getDefaultTokenBox } from '../data/defaultTokens';

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createGameCards(deck: Deck): GameCard[] {
  const cards: GameCard[] = [];
  for (const deckCard of deck.cards) {
    for (let i = 0; i < deckCard.quantity; i++) {
      cards.push({
        instanceId: crypto.randomUUID(),
        card: deckCard.card,
        tapped: false,
        faceDown: false,
      });
    }
  }
  return shuffleArray(cards);
}

export function PlaySpace() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [library, setLibrary] = useState<GameCard[]>([]);
  const [hand, setHand] = useState<GameCard[]>([]);
  const [battlefield, setBattlefield] = useState<GameCard[]>([]);
  const [graveyard, setGraveyard] = useState<GameCard[]>([]);
  const [exile, setExile] = useState<GameCard[]>([]);
  const [life, setLife] = useState(20);

  const [selectedCard, setSelectedCard] = useState<GameCard | null>(null);
  const [selectedToken, setSelectedToken] = useState<GameToken | null>(null);
  const [draggedCard, setDraggedCard] = useState<{ card: GameCard; from: string } | null>(null);
  const [draggedBattlefieldToken, setDraggedBattlefieldToken] = useState<GameToken | null>(null);
  const [tokens, setTokens] = useState<GameToken[]>([]);
  const [isTokenDrawerOpen, setIsTokenDrawerOpen] = useState(false);
  const [tokenBox, setTokenBox] = useState<DeckTokenBox>(getDefaultTokenBox());
  const [draggedTokenItem, setDraggedTokenItem] = useState<{ type: 'token' | 'counter'; item: TokenDefinition | CounterDefinition } | null>(null);
  const [showLibrarySearch, setShowLibrarySearch] = useState(false);
  const [librarySearchName, setLibrarySearchName] = useState('');
  const [librarySearchType, setLibrarySearchType] = useState('');
  const [selectedLibraryCard, setSelectedLibraryCard] = useState<GameCard | null>(null);

  useEffect(() => {
    if (!deckId) {
      navigate('/');
      return;
    }

    const loadedDeck = getDeck(deckId);
    if (!loadedDeck) {
      navigate('/');
      return;
    }

    setDeck(loadedDeck);
    const gameCards = createGameCards(loadedDeck);
    setLibrary(gameCards);
    
    if (loadedDeck.tokenBox) {
      setTokenBox(loadedDeck.tokenBox);
    }
  }, [deckId, navigate]);

  const handleTokenBoxChange = useCallback((newTokenBox: DeckTokenBox) => {
    setTokenBox(newTokenBox);
    if (deck) {
      const updatedDeck = { ...deck, tokenBox: newTokenBox, updatedAt: Date.now() };
      setDeck(updatedDeck);
      saveDeck(updatedDeck);
    }
  }, [deck]);

  const handleTokenDragStart = useCallback((type: 'token' | 'counter', item: TokenDefinition | CounterDefinition) => {
    setDraggedTokenItem({ type, item });
  }, []);

  const handleTokenDrop = useCallback((zone: string) => {
    if (!draggedTokenItem || draggedTokenItem.type !== 'token') return;
    
    const token = draggedTokenItem.item as TokenDefinition;
    const newGameToken: GameToken = {
      instanceId: crypto.randomUUID(),
      token,
      tapped: false,
    };
    
    if (zone === 'battlefield') {
      setTokens(prev => [...prev, newGameToken]);
    }
    
    setDraggedTokenItem(null);
  }, [draggedTokenItem]);

  const removeToken = useCallback((instanceId: string) => {
    setTokens(prev => prev.filter(t => t.instanceId !== instanceId));
  }, []);

  const addToken = useCallback((token: TokenDefinition) => {
    const newGameToken: GameToken = {
      instanceId: crypto.randomUUID(),
      token,
      tapped: false,
    };
    setTokens(prev => [...prev, newGameToken]);
  }, []);

  const toggleTokenTapped = useCallback((instanceId: string) => {
    setTokens(prev => prev.map(t => 
      t.instanceId === instanceId ? { ...t, tapped: !t.tapped } : t
    ));
  }, []);

  const drawCard = useCallback(() => {
    if (library.length === 0) return;
    const [drawnCard, ...remainingLibrary] = library;
    setLibrary(remainingLibrary);
    setHand((prev) => [...prev, drawnCard]);
  }, [library]);

  const drawOpeningHand = useCallback(() => {
    if (library.length < 7) return;
    const drawnCards = library.slice(0, 7);
    const remainingLibrary = library.slice(7);
    setLibrary(remainingLibrary);
    setHand(drawnCards);
  }, [library]);

  const shuffleLibrary = useCallback(() => {
    setLibrary((prev) => shuffleArray(prev));
  }, []);

  const moveFromLibrary = useCallback((card: GameCard, to: 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'top', faceDown = false) => {
    setLibrary((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
    if (to === 'hand') {
      setHand((prev) => [...prev, { ...card, tapped: false, faceDown: false }]);
    } else if (to === 'battlefield') {
      setBattlefield((prev) => [...prev, { ...card, tapped: false, faceDown: false }]);
    } else if (to === 'graveyard') {
      setGraveyard((prev) => [...prev, card]);
    } else if (to === 'exile') {
      setExile((prev) => [...prev, { ...card, faceDown, tapped: false }]);
    } else if (to === 'top') {
      setLibrary((prev) => [card, ...prev]);
    }
  }, []);

  const getFilteredLibrary = useCallback(() => {
    return library.filter((gameCard) => {
      const nameMatch = !librarySearchName || 
        gameCard.card.name.toLowerCase().includes(librarySearchName.toLowerCase());
      const typeMatch = !librarySearchType || 
        gameCard.card.type_line.toLowerCase().includes(librarySearchType.toLowerCase());
      return nameMatch && typeMatch;
    });
  }, [library, librarySearchName, librarySearchType]);

  const getLibraryCardTypes = useCallback(() => {
    const types = new Set<string>();
    library.forEach((gameCard) => {
      const typeLine = gameCard.card.type_line;
      const mainTypes = typeLine.split('—')[0].trim();
      mainTypes.split(' ').forEach((type) => {
        if (type && !['Legendary', 'Basic', 'Snow', 'World'].includes(type)) {
          types.add(type);
        }
      });
    });
    return Array.from(types).sort();
  }, [library]);

  const clearLibraryFilters = useCallback(() => {
    setLibrarySearchName('');
    setLibrarySearchType('');
  }, []);

  const resetGame = useCallback(() => {
    if (!deck) return;
    const gameCards = createGameCards(deck);
    setLibrary(gameCards);
    setHand([]);
    setBattlefield([]);
    setGraveyard([]);
    setExile([]);
    setLife(20);
  }, [deck]);

  const playCard = useCallback((card: GameCard) => {
    setHand((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
    setBattlefield((prev) => [...prev, card]);
  }, []);

  const returnToHand = useCallback((card: GameCard) => {
    setBattlefield((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
    setHand((prev) => [...prev, card]);
  }, []);

  const sendToGraveyard = useCallback((card: GameCard, from: 'hand' | 'battlefield') => {
    if (from === 'hand') {
      setHand((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
    } else {
      setBattlefield((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
    }
    setGraveyard((prev) => [...prev, card]);
  }, []);

  const returnFromGraveyard = useCallback((card: GameCard, to: 'hand' | 'battlefield') => {
    setGraveyard((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
    if (to === 'hand') {
      setHand((prev) => [...prev, { ...card, tapped: false }]);
    } else {
      setBattlefield((prev) => [...prev, { ...card, tapped: false }]);
    }
  }, []);

  const exileCard = useCallback((card: GameCard, from: 'hand' | 'battlefield' | 'graveyard', faceDown = false) => {
    if (from === 'hand') {
      setHand((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
    } else if (from === 'battlefield') {
      setBattlefield((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
    } else {
      setGraveyard((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
    }
    setExile((prev) => [...prev, { ...card, faceDown, tapped: false }]);
  }, []);

  const returnFromExile = useCallback((card: GameCard, to: 'hand' | 'battlefield') => {
    setExile((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
    if (to === 'hand') {
      setHand((prev) => [...prev, { ...card, tapped: false, faceDown: false }]);
    } else {
      setBattlefield((prev) => [...prev, { ...card, tapped: false, faceDown: false }]);
    }
  }, []);

  const toggleExileFaceDown = useCallback((card: GameCard) => {
    setExile((prev) =>
      prev.map((c) =>
        c.instanceId === card.instanceId ? { ...c, faceDown: !c.faceDown } : c
      )
    );
  }, []);

  const toggleTapped = useCallback((card: GameCard) => {
    setBattlefield((prev) =>
      prev.map((c) =>
        c.instanceId === card.instanceId ? { ...c, tapped: !c.tapped } : c
      )
    );
  }, []);

  const untapAll = useCallback(() => {
    setBattlefield((prev) => prev.map((c) => ({ ...c, tapped: false })));
  }, []);

  const handleDragStart = (card: GameCard, from: string) => {
    setDraggedCard({ card, from });
  };

  const handleDrop = (to: string) => {
    // Handle battlefield token being dragged to graveyard (removes the token)
    if (draggedBattlefieldToken && to === 'graveyard') {
      removeToken(draggedBattlefieldToken.instanceId);
      setDraggedBattlefieldToken(null);
      return;
    }

    if (!draggedCard) return;

    const { card, from } = draggedCard;

    if (from === to) {
      setDraggedCard(null);
      return;
    }

    if (from === 'hand') {
      setHand((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
    } else if (from === 'battlefield') {
      setBattlefield((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
    } else if (from === 'graveyard') {
      setGraveyard((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
    } else if (from === 'exile') {
      setExile((prev) => prev.filter((c) => c.instanceId !== card.instanceId));
    }

    if (to === 'hand') {
      setHand((prev) => [...prev, { ...card, tapped: false, faceDown: false }]);
    } else if (to === 'battlefield') {
      setBattlefield((prev) => [...prev, { ...card, tapped: false, faceDown: false }]);
    } else if (to === 'graveyard') {
      setGraveyard((prev) => [...prev, card]);
    } else if (to === 'exile') {
      setExile((prev) => [...prev, { ...card, faceDown: false }]);
    }

    setDraggedCard(null);
  };

  if (!deck) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Top Bar */}
      <div className="bg-gray-800 p-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold">{deck.name}</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLife((l) => l - 1)}
              className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded"
            >
              −
            </button>
            <span className="text-2xl font-bold w-12 text-center">{life}</span>
            <button
              onClick={() => setLife((l) => l + 1)}
              className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded"
            >
              +
            </button>
          </div>

          <button
            onClick={drawCard}
            disabled={library.length === 0}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded"
          >
            Draw ({library.length})
          </button>

          <button
            onClick={drawOpeningHand}
            disabled={hand.length > 0 || library.length < 7}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded"
          >
            Draw 7
          </button>

          <button
            onClick={untapAll}
            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded"
          >
            Untap All
          </button>

          <button
            onClick={shuffleLibrary}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded"
          >
            Shuffle
          </button>

          <button
            onClick={resetGame}
            className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded"
          >
            Reset
          </button>

          <button
            onClick={() => setIsTokenDrawerOpen(true)}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded"
          >
            🎴 Tokens
          </button>
        </div>
      </div>

      {/* Battlefield - Creatures Row */}
      <div
        className="flex-1 p-4 bg-green-900/30 min-h-[180px]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => { handleDrop('battlefield'); handleTokenDrop('battlefield'); }}
      >
        <h2 className="text-sm text-gray-400 mb-2">Creatures & Other Permanents</h2>
        <div className="flex flex-wrap gap-2">
          {battlefield
            .filter((gc) => !gc.card.type_line.toLowerCase().includes('land'))
            .map((gameCard) => (
              <div
                key={gameCard.instanceId}
                draggable
                onDragStart={() => handleDragStart(gameCard, 'battlefield')}
                onClick={() => toggleTapped(gameCard)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelectedCard(gameCard);
                }}
                className={`cursor-pointer transition-transform ${
                  gameCard.tapped ? 'rotate-90' : ''
                }`}
              >
                <img
                  src={getCardImageUrl(gameCard.card, 'normal')}
                  alt={gameCard.card.name}
                  className="h-40 rounded shadow-lg hover:ring-2 hover:ring-yellow-500"
                />
              </div>
            ))}
          {/* Tokens */}
          {tokens.map((gameToken) => (
            <div
              key={gameToken.instanceId}
              draggable
              onDragStart={() => setDraggedBattlefieldToken(gameToken)}
              onDragEnd={() => setDraggedBattlefieldToken(null)}
              onClick={() => toggleTokenTapped(gameToken.instanceId)}
              onContextMenu={(e) => {
                e.preventDefault();
                setSelectedToken(gameToken);
              }}
              className={`cursor-grab active:cursor-grabbing transition-transform relative ${
                gameToken.tapped ? 'rotate-90' : ''
              }`}
              title="Click to tap, drag to graveyard to remove, right-click for options"
            >
              {gameToken.token.imageUrl ? (
                <img
                  src={gameToken.token.imageUrl}
                  alt={gameToken.token.name}
                  className="h-40 rounded shadow-lg hover:ring-2 hover:ring-purple-500"
                />
              ) : (
                <div className="h-40 w-28 bg-gray-700 rounded shadow-lg hover:ring-2 hover:ring-purple-500 flex flex-col items-center justify-center p-2">
                  <span className="text-lg font-bold text-center">{gameToken.token.name}</span>
                  {gameToken.token.power && gameToken.token.toughness && (
                    <span className="text-sm text-gray-400">{gameToken.token.power}/{gameToken.token.toughness}</span>
                  )}
                  <span className="text-xs text-purple-400 mt-1">TOKEN</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Battlefield - Lands Row */}
      <div
        className="p-3 bg-amber-900/20 border-t border-gray-700"
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleDrop('battlefield')}
      >
        <h2 className="text-sm text-amber-400 mb-2">Lands</h2>
        <div className="flex flex-wrap gap-2">
          {battlefield
            .filter((gc) => gc.card.type_line.toLowerCase().includes('land'))
            .map((gameCard) => (
              <div
                key={gameCard.instanceId}
                draggable
                onDragStart={() => handleDragStart(gameCard, 'battlefield')}
                onClick={() => toggleTapped(gameCard)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelectedCard(gameCard);
                }}
                className={`cursor-pointer transition-transform ${
                  gameCard.tapped ? 'rotate-90' : ''
                }`}
              >
                <img
                  src={getCardImageUrl(gameCard.card, 'normal')}
                  alt={gameCard.card.name}
                  className="h-32 rounded shadow-lg hover:ring-2 hover:ring-amber-500"
                />
              </div>
            ))}
        </div>
      </div>

      {/* Graveyard & Exile Row */}
      <div className="flex border-t border-gray-700">
        {/* Graveyard Zone */}
        <div
          className="flex-1 bg-gray-800/50 p-2 border-r border-gray-700"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop('graveyard')}
        >
          <h2 className="text-sm text-gray-400 mb-1">
            Graveyard ({graveyard.length})
          </h2>
          <div className="flex gap-1 overflow-x-auto">
            {graveyard.map((gameCard) => (
              <div
                key={gameCard.instanceId}
                draggable
                onDragStart={() => handleDragStart(gameCard, 'graveyard')}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelectedCard(gameCard);
                }}
                className="flex-shrink-0 cursor-pointer hover:opacity-100 transition-opacity"
              >
                <img
                  src={getCardImageUrl(gameCard.card, 'small')}
                  alt={gameCard.card.name}
                  className="h-20 rounded opacity-70 hover:ring-2 hover:ring-purple-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Exile Zone */}
        <div
          className="flex-1 bg-orange-900/20 p-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop('exile')}
        >
          <h2 className="text-sm text-orange-400 mb-1">
            Exile ({exile.length})
          </h2>
          <div className="flex gap-1 overflow-x-auto">
            {exile.map((gameCard) => (
              <div
                key={gameCard.instanceId}
                draggable
                onDragStart={() => handleDragStart(gameCard, 'exile')}
                onClick={() => toggleExileFaceDown(gameCard)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelectedCard(gameCard);
                }}
                className="flex-shrink-0 cursor-pointer hover:opacity-100 transition-opacity relative"
              >
                {gameCard.faceDown ? (
                  <div className="h-20 w-14 bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400 border-2 border-orange-500">
                    Face Down
                  </div>
                ) : (
                  <img
                    src={getCardImageUrl(gameCard.card, 'small')}
                    alt={gameCard.card.name}
                    className="h-20 rounded opacity-80 hover:ring-2 hover:ring-orange-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hand and Library */}
      <div className="bg-gray-800 p-4 border-t border-gray-700 flex gap-4">
        {/* Hand */}
        <div
          className="flex-1 min-w-0"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop('hand')}
        >
          <h2 className="text-sm text-gray-400 mb-2">Hand ({hand.length})</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {hand.map((gameCard) => (
              <div
                key={gameCard.instanceId}
                draggable
                onDragStart={() => handleDragStart(gameCard, 'hand')}
                onDoubleClick={() => playCard(gameCard)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelectedCard(gameCard);
                }}
                className="flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
              >
                <img
                  src={getCardImageUrl(gameCard.card, 'normal')}
                  alt={gameCard.card.name}
                  className="h-56 rounded shadow-lg hover:ring-2 hover:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Library Stack */}
        <div className="flex-shrink-0 w-40">
          <h2 className="text-sm text-gray-400 mb-2">Library ({library.length})</h2>
          <div
            className="relative h-48 cursor-pointer group"
            onClick={() => setShowLibrarySearch(true)}
          >
            {library.length > 0 ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900 to-blue-950 rounded-lg border-2 border-blue-700 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-300">{library.length}</div>
                    <div className="text-xs text-blue-400 mt-1">cards</div>
                  </div>
                </div>
                <div className="absolute inset-0 bg-blue-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white font-semibold bg-blue-600 px-3 py-1 rounded">
                    Search Library
                  </span>
                </div>
              </>
            ) : (
              <div className="h-full bg-gray-700 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center">
                <span className="text-gray-500 text-sm">Empty</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Context Menu / Details */}
      {selectedCard && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-gray-800 rounded-lg p-4 max-w-2xl flex gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getCardImageUrl(selectedCard.card, 'large')}
              alt={selectedCard.card.name}
              className="rounded-lg max-h-[500px]"
            />
            <div className="flex flex-col gap-2 min-w-[150px]">
              <h3 className="text-xl font-bold">{selectedCard.card.name}</h3>
              {selectedCard.card.oracle_text && (
                <p className="text-gray-300 text-sm whitespace-pre-line">
                  {selectedCard.card.oracle_text}
                </p>
              )}
              <div className="flex-1" />
              <div className="space-y-2">
                {hand.some((c) => c.instanceId === selectedCard.instanceId) && (
                  <>
                    <button
                      onClick={() => {
                        playCard(selectedCard);
                        setSelectedCard(null);
                      }}
                      className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 rounded"
                    >
                      Play to Battlefield
                    </button>
                    <button
                      onClick={() => {
                        sendToGraveyard(selectedCard, 'hand');
                        setSelectedCard(null);
                      }}
                      className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded"
                    >
                      Discard
                    </button>
                    <button
                      onClick={() => {
                        exileCard(selectedCard, 'hand', false);
                        setSelectedCard(null);
                      }}
                      className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded"
                    >
                      Exile
                    </button>
                    <button
                      onClick={() => {
                        exileCard(selectedCard, 'hand', true);
                        setSelectedCard(null);
                      }}
                      className="w-full px-3 py-2 bg-orange-800 hover:bg-orange-900 rounded"
                    >
                      Exile Face Down
                    </button>
                  </>
                )}
                {battlefield.some((c) => c.instanceId === selectedCard.instanceId) && (
                  <>
                    <button
                      onClick={() => {
                        toggleTapped(selectedCard);
                        setSelectedCard(null);
                      }}
                      className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded"
                    >
                      {selectedCard.tapped ? 'Untap' : 'Tap'}
                    </button>
                    <button
                      onClick={() => {
                        returnToHand(selectedCard);
                        setSelectedCard(null);
                      }}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                    >
                      Return to Hand
                    </button>
                    <button
                      onClick={() => {
                        sendToGraveyard(selectedCard, 'battlefield');
                        setSelectedCard(null);
                      }}
                      className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded"
                    >
                      Send to Graveyard
                    </button>
                    <button
                      onClick={() => {
                        exileCard(selectedCard, 'battlefield', false);
                        setSelectedCard(null);
                      }}
                      className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded"
                    >
                      Exile
                    </button>
                    <button
                      onClick={() => {
                        exileCard(selectedCard, 'battlefield', true);
                        setSelectedCard(null);
                      }}
                      className="w-full px-3 py-2 bg-orange-800 hover:bg-orange-900 rounded"
                    >
                      Exile Face Down
                    </button>
                  </>
                )}
                {graveyard.some((c) => c.instanceId === selectedCard.instanceId) && (
                  <>
                    <button
                      onClick={() => {
                        returnFromGraveyard(selectedCard, 'hand');
                        setSelectedCard(null);
                      }}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                    >
                      Return to Hand
                    </button>
                    <button
                      onClick={() => {
                        returnFromGraveyard(selectedCard, 'battlefield');
                        setSelectedCard(null);
                      }}
                      className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 rounded"
                    >
                      Return to Battlefield
                    </button>
                    <button
                      onClick={() => {
                        exileCard(selectedCard, 'graveyard', false);
                        setSelectedCard(null);
                      }}
                      className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded"
                    >
                      Exile
                    </button>
                    <button
                      onClick={() => {
                        exileCard(selectedCard, 'graveyard', true);
                        setSelectedCard(null);
                      }}
                      className="w-full px-3 py-2 bg-orange-800 hover:bg-orange-900 rounded"
                    >
                      Exile Face Down
                    </button>
                  </>
                )}
                {exile.some((c) => c.instanceId === selectedCard.instanceId) && (
                  <>
                    <button
                      onClick={() => {
                        toggleExileFaceDown(selectedCard);
                        setSelectedCard(null);
                      }}
                      className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded"
                    >
                      {selectedCard.faceDown ? 'Turn Face Up' : 'Turn Face Down'}
                    </button>
                    <button
                      onClick={() => {
                        returnFromExile(selectedCard, 'hand');
                        setSelectedCard(null);
                      }}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                    >
                      Return to Hand
                    </button>
                    <button
                      onClick={() => {
                        returnFromExile(selectedCard, 'battlefield');
                        setSelectedCard(null);
                      }}
                      className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 rounded"
                    >
                      Return to Battlefield
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Token Preview Modal */}
      {selectedToken && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setSelectedToken(null)}
        >
          <div
            className="bg-gray-800 rounded-lg p-4 max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center gap-4">
              {selectedToken.token.imageUrl ? (
                <img
                  src={selectedToken.token.imageUrl}
                  alt={selectedToken.token.name}
                  className="max-h-[70vh] rounded-lg"
                />
              ) : (
                <div className="h-64 w-48 bg-gray-700 rounded-lg flex flex-col items-center justify-center p-4">
                  <span className="text-2xl font-bold text-center">{selectedToken.token.name}</span>
                  {selectedToken.token.power && selectedToken.token.toughness && (
                    <span className="text-xl text-gray-400 mt-2">{selectedToken.token.power}/{selectedToken.token.toughness}</span>
                  )}
                  <span className="text-sm text-purple-400 mt-2">TOKEN</span>
                </div>
              )}
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => {
                    toggleTokenTapped(selectedToken.instanceId);
                    setSelectedToken(null);
                  }}
                  className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded"
                >
                  {selectedToken.tapped ? 'Untap' : 'Tap'}
                </button>
                <button
                  onClick={() => {
                    removeToken(selectedToken.instanceId);
                    setSelectedToken(null);
                  }}
                  className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded"
                >
                  Remove Token
                </button>
              </div>
              <button
                onClick={() => setSelectedToken(null)}
                className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Library Search Modal */}
      {showLibrarySearch && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowLibrarySearch(false);
            setSelectedLibraryCard(null);
            clearLibraryFilters();
          }}
        >
          <div
            className="bg-gray-800 rounded-lg p-4 max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Search Library ({library.length} cards)</h2>
              <button
                onClick={() => {
                  setShowLibrarySearch(false);
                  setSelectedLibraryCard(null);
                  clearLibraryFilters();
                }}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Close
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-400 mb-1">Card Name</label>
                <input
                  type="text"
                  value={librarySearchName}
                  onChange={(e) => setLibrarySearchName(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-400 mb-1">Card Type</label>
                <select
                  value={librarySearchType}
                  onChange={(e) => setLibrarySearchType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">All Types</option>
                  {getLibraryCardTypes().map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearLibraryFilters}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-400 mb-2">
              Showing {getFilteredLibrary().length} of {library.length} cards
              {(librarySearchName || librarySearchType) && ' (filtered)'}
            </div>

            {/* Card Grid and Selected Card */}
            <div className="flex gap-4 flex-1 min-h-0">
              {/* Card Grid */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {getFilteredLibrary().map((gameCard) => (
                    <div
                      key={gameCard.instanceId}
                      onClick={() => setSelectedLibraryCard(gameCard)}
                      className={`cursor-pointer transition-all ${
                        selectedLibraryCard?.instanceId === gameCard.instanceId
                          ? 'ring-2 ring-blue-500 scale-105'
                          : 'hover:scale-105'
                      }`}
                    >
                      <img
                        src={getCardImageUrl(gameCard.card, 'small')}
                        alt={gameCard.card.name}
                        title={gameCard.card.name}
                        className="rounded shadow"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Card Actions */}
              {selectedLibraryCard && (
                <div className="w-72 flex-shrink-0 bg-gray-700 rounded-lg p-3 overflow-y-auto">
                  <div className="flex gap-3 mb-3">
                    <img
                      src={getCardImageUrl(selectedLibraryCard.card, 'small')}
                      alt={selectedLibraryCard.card.name}
                      className="rounded h-24 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm truncate">{selectedLibraryCard.card.name}</h3>
                      <p className="text-xs text-gray-400 truncate">{selectedLibraryCard.card.type_line}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        moveFromLibrary(selectedLibraryCard, 'hand');
                        setSelectedLibraryCard(null);
                        shuffleLibrary();
                      }}
                      className="px-2 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                    >
                      To Hand
                    </button>
                    <button
                      onClick={() => {
                        moveFromLibrary(selectedLibraryCard, 'battlefield');
                        setSelectedLibraryCard(null);
                        shuffleLibrary();
                      }}
                      className="px-2 py-2 bg-green-600 hover:bg-green-700 rounded text-sm"
                    >
                      To Battlefield
                    </button>
                    <button
                      onClick={() => {
                        moveFromLibrary(selectedLibraryCard, 'graveyard');
                        setSelectedLibraryCard(null);
                        shuffleLibrary();
                      }}
                      className="px-2 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
                    >
                      To Graveyard
                    </button>
                    <button
                      onClick={() => {
                        moveFromLibrary(selectedLibraryCard, 'exile');
                        setSelectedLibraryCard(null);
                        shuffleLibrary();
                      }}
                      className="px-2 py-2 bg-orange-600 hover:bg-orange-700 rounded text-sm"
                    >
                      To Exile
                    </button>
                    <button
                      onClick={() => {
                        setLibrary((prev) => {
                          const filtered = prev.filter((c) => c.instanceId !== selectedLibraryCard.instanceId);
                          return [selectedLibraryCard, ...filtered];
                        });
                        setSelectedLibraryCard(null);
                      }}
                      className="px-2 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                    >
                      Put on Top
                    </button>
                    <button
                      onClick={() => {
                        setLibrary((prev) => {
                          const filtered = prev.filter((c) => c.instanceId !== selectedLibraryCard.instanceId);
                          return [...filtered, selectedLibraryCard];
                        });
                        setSelectedLibraryCard(null);
                      }}
                      className="px-2 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                    >
                      Put on Bottom
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Shuffle reminder */}
            <div className="mt-4 text-center text-sm text-gray-500">
              Note: Moving a card to hand, battlefield, graveyard, or exile will automatically shuffle the library.
            </div>
          </div>
        </div>
      )}

      {/* Token Drawer */}
      <TokenDrawer
        isOpen={isTokenDrawerOpen}
        onToggle={() => setIsTokenDrawerOpen(!isTokenDrawerOpen)}
        tokenBox={tokenBox}
        onTokenBoxChange={handleTokenBoxChange}
        onDragStart={handleTokenDragStart}
        onTokenAdd={addToken}
      />
    </div>
  );
}
