import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDeck } from '../services/deckStorage';
import { getCardImageUrl } from '../services/scryfall';
import { Deck, GameCard, ScryfallCard } from '../types/card';

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
  const [draggedCard, setDraggedCard] = useState<{ card: GameCard; from: string } | null>(null);

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
  }, [deckId, navigate]);

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
        </div>
      </div>

      {/* Battlefield - Creatures Row */}
      <div
        className="flex-1 p-4 bg-green-900/30 min-h-[180px]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleDrop('battlefield')}
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

      {/* Hand */}
      <div
        className="bg-gray-800 p-4 border-t border-gray-700"
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
    </div>
  );
}
