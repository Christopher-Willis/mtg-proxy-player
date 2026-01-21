import { Deck } from '../types/card';

const STORAGE_KEY = 'mtg-proxy-decks';

export function loadDecks(): Deck[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveDeck(deck: Deck): void {
  const decks = loadDecks();
  const existingIndex = decks.findIndex((d) => d.id === deck.id);

  if (existingIndex >= 0) {
    decks[existingIndex] = { ...deck, updatedAt: Date.now() };
  } else {
    decks.push({ ...deck, createdAt: Date.now(), updatedAt: Date.now() });
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

export function deleteDeck(deckId: string): void {
  const decks = loadDecks().filter((d) => d.id !== deckId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

export function getDeck(deckId: string): Deck | null {
  const decks = loadDecks();
  return decks.find((d) => d.id === deckId) || null;
}

export function createNewDeck(name: string): Deck {
  return {
    id: crypto.randomUUID(),
    name,
    cards: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
