import { useState, useMemo, useCallback } from 'react';
import { useDebouncedValue } from '../hooks/debounce';
import { searchCards, getCardImageUrl } from '../services/scryfall';
import { saveDeck, loadDecks, deleteDeck, createNewDeck } from '../services/deckStorage';
import { ScryfallCard, Deck, DeckCard } from '../types/card';
import { CardDisplay } from '../components/CardDisplay';
import { DeckImport } from '../components/DeckImport';
import { useNavigate } from 'react-router-dom';

export function DeckBuilder() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ScryfallCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [decks, setDecks] = useState<Deck[]>(() => loadDecks());
  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);
  const [newDeckName, setNewDeckName] = useState('');

  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null);
  const [showImport, setShowImport] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 400);

  const doSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await searchCards(searchQuery);
      setSearchResults(results);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useMemo(() => {
    doSearch(debouncedQuery);
  }, [debouncedQuery, doSearch]);

  function handleCreateDeck() {
    if (!newDeckName.trim()) return;
    const deck = createNewDeck(newDeckName.trim());
    saveDeck(deck);
    setDecks(loadDecks());
    setCurrentDeck(deck);
    setNewDeckName('');
  }

  function handleSelectDeck(deck: Deck) {
    setCurrentDeck(deck);
  }

  function handleDeleteDeck(deckId: string) {
    deleteDeck(deckId);
    setDecks(loadDecks());
    if (currentDeck?.id === deckId) {
      setCurrentDeck(null);
    }
  }

  function handleAddCard(card: ScryfallCard) {
    if (!currentDeck) return;

    const existingIndex = currentDeck.cards.findIndex((dc) => dc.card.id === card.id);
    let updatedCards: DeckCard[];

    if (existingIndex >= 0) {
      updatedCards = currentDeck.cards.map((dc, i) =>
        i === existingIndex ? { ...dc, quantity: dc.quantity + 1 } : dc
      );
    } else {
      updatedCards = [...currentDeck.cards, { card, quantity: 1 }];
    }

    const updatedDeck = { ...currentDeck, cards: updatedCards };
    saveDeck(updatedDeck);
    setCurrentDeck(updatedDeck);
    setDecks(loadDecks());
  }

  function handleRemoveCard(cardId: string) {
    if (!currentDeck) return;

    const existingIndex = currentDeck.cards.findIndex((dc) => dc.card.id === cardId);
    if (existingIndex < 0) return;

    let updatedCards: DeckCard[];
    const existing = currentDeck.cards[existingIndex];

    if (existing.quantity > 1) {
      updatedCards = currentDeck.cards.map((dc, i) =>
        i === existingIndex ? { ...dc, quantity: dc.quantity - 1 } : dc
      );
    } else {
      updatedCards = currentDeck.cards.filter((dc) => dc.card.id !== cardId);
    }

    const updatedDeck = { ...currentDeck, cards: updatedCards };
    saveDeck(updatedDeck);
    setCurrentDeck(updatedDeck);
    setDecks(loadDecks());
  }

  const totalCards = currentDeck?.cards.reduce((sum, dc) => sum + dc.quantity, 0) || 0;

  function handlePlayDeck() {
    if (currentDeck) {
      navigate(`/play/${currentDeck.id}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">MTG Deck Builder</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold"
            >
              Import Deck
            </button>
            <button
              onClick={() => navigate('/lobby')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded font-semibold"
            >
              Multiplayer Lobby
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Deck List */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Your Decks</h2>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                placeholder="New deck name..."
                className="flex-1 px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateDeck()}
              />
              <button
                onClick={handleCreateDeck}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold"
              >
                Create
              </button>
            </div>

            <div className="space-y-2">
              {decks.map((deck) => (
                <div
                  key={deck.id}
                  className={`p-3 rounded cursor-pointer flex justify-between items-center ${
                    currentDeck?.id === deck.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  onClick={() => handleSelectDeck(deck)}
                >
                  <div>
                    <p className="font-medium">{deck.name}</p>
                    <p className="text-sm text-gray-400">
                      {deck.cards.reduce((sum, dc) => sum + dc.quantity, 0)} cards
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDeck(deck.id);
                    }}
                    className="text-red-400 hover:text-red-300 px-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {decks.length === 0 && (
                <p className="text-gray-500 text-center py-4">No decks yet</p>
              )}
            </div>
          </div>

          {/* Center: Search */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Search Cards</h2>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for cards..."
              className="w-full px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400 mb-4"
            />

            {isSearching && <p className="text-gray-400 mb-2">Searching...</p>}
            {searchError && <p className="text-red-400 mb-2">{searchError}</p>}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[600px] overflow-y-auto">
              {searchResults.slice(0, 30).map((card) => (
                <div key={card.id} className="relative group">
                  <img
                    src={getCardImageUrl(card, 'small')}
                    alt={card.name}
                    className="rounded cursor-pointer hover:ring-2 hover:ring-blue-500"
                    onClick={() => setSelectedCard(card)}
                    loading="lazy"
                  />
                  {currentDeck && (
                    <button
                      onClick={() => handleAddCard(card)}
                      className="absolute top-1 right-1 bg-green-600 hover:bg-green-700 text-white rounded-full w-6 h-6 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      +
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Current Deck */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {currentDeck ? currentDeck.name : 'Select a Deck'}
              </h2>
              {currentDeck && (
                <span className="text-gray-400">{totalCards} cards</span>
              )}
            </div>

            {currentDeck && (
              <>
                <button
                  onClick={handlePlayDeck}
                  disabled={totalCards === 0}
                  className="w-full mb-4 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold"
                >
                  Play This Deck
                </button>

                <div className="space-y-1 max-h-[500px] overflow-y-auto">
                  {currentDeck.cards.map((dc) => (
                    <div
                      key={dc.card.id}
                      className="flex items-center gap-2 p-2 bg-gray-700 rounded hover:bg-gray-600"
                    >
                      <span className="text-blue-400 font-mono w-6">{dc.quantity}x</span>
                      <span
                        className="flex-1 truncate cursor-pointer hover:text-blue-300"
                        onClick={() => setSelectedCard(dc.card)}
                      >
                        {dc.card.name}
                      </span>
                      <button
                        onClick={() => handleRemoveCard(dc.card.id)}
                        className="text-red-400 hover:text-red-300 px-2"
                      >
                        −
                      </button>
                      <button
                        onClick={() => handleAddCard(dc.card)}
                        className="text-green-400 hover:text-green-300 px-2"
                      >
                        +
                      </button>
                    </div>
                  ))}
                  {currentDeck.cards.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      Search and add cards to your deck
                    </p>
                  )}
                </div>
              </>
            )}

            {!currentDeck && (
              <p className="text-gray-500 text-center py-8">
                Create or select a deck to start building
              </p>
            )}
          </div>
        </div>

        {/* Card Preview Modal */}
        {selectedCard && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedCard(null)}
          >
            <div
              className="bg-gray-800 rounded-lg p-4 max-w-2xl flex gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <CardDisplay card={selectedCard} size="large" />
              <div className="flex-1 min-w-[200px]">
                <h3 className="text-xl font-bold mb-2">{selectedCard.name}</h3>
                {selectedCard.mana_cost && (
                  <p className="text-gray-300 mb-2">{selectedCard.mana_cost}</p>
                )}
                <p className="text-gray-400 mb-2">{selectedCard.type_line}</p>
                {selectedCard.oracle_text && (
                  <p className="text-gray-300 text-sm whitespace-pre-line mb-2">
                    {selectedCard.oracle_text}
                  </p>
                )}
                {selectedCard.power && selectedCard.toughness && (
                  <p className="text-gray-300">
                    {selectedCard.power}/{selectedCard.toughness}
                  </p>
                )}
                <p className="text-gray-500 text-sm mt-4">
                  {selectedCard.set_name} • {selectedCard.rarity}
                </p>
                {currentDeck && (
                  <button
                    onClick={() => {
                      handleAddCard(selectedCard);
                    }}
                    className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold"
                  >
                    Add to Deck
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {showImport && (
          <DeckImport
            onImportComplete={(deck) => {
              setDecks(loadDecks());
              setCurrentDeck(deck);
              setShowImport(false);
            }}
            onCancel={() => setShowImport(false)}
          />
        )}
      </div>
    </div>
  );
}
