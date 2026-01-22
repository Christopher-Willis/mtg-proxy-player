import { ScryfallCard } from '../types/card';

const API_BASE = 'https://api.scryfall.com';
const MIN_REQUEST_INTERVAL_MS = 100;

let lastRequestTime = 0;

const cardCache = new Map<string, ScryfallCard>();

async function rateLimitedFetch(url: string, options?: RequestInit): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
    const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
  return fetch(url, options);
}

type ScryfallSearchResponse = {
  object: 'list';
  total_cards: number;
  has_more: boolean;
  next_page?: string;
  data: ScryfallCard[];
};

export async function searchCards(query: string): Promise<ScryfallCard[]> {
  if (!query.trim()) return [];

  const url = `${API_BASE}/cards/search?q=${encodeURIComponent(query)}`;

  const response = await rateLimitedFetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error(`Scryfall API error: ${response.status}`);
  }

  const data: ScryfallSearchResponse = await response.json();
  return data.data;
}

export async function getCardByName(name: string, exact = false): Promise<ScryfallCard | null> {
  const param = exact ? 'exact' : 'fuzzy';
  const url = `${API_BASE}/cards/named?${param}=${encodeURIComponent(name)}`;

  const response = await rateLimitedFetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Scryfall API error: ${response.status}`);
  }

  const card: ScryfallCard = await response.json();
  cardCache.set(card.id, card);
  return card;
}

export function getCachedCardById(id: string): ScryfallCard | undefined {
  return cardCache.get(id);
}

export async function prefetchCardsById(ids: string[]): Promise<void> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  const missing = unique.filter((id) => !cardCache.has(id));
  for (const id of missing) {
    try {
      await getCardById(id);
    } catch {
      // ignore
    }
  }
}

export async function getCardById(id: string): Promise<ScryfallCard | null> {
  const cached = cardCache.get(id);
  if (cached) return cached;

  const url = `${API_BASE}/cards/${id}`;

  const response = await rateLimitedFetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Scryfall API error: ${response.status}`);
  }

  const card: ScryfallCard = await response.json();
  cardCache.set(card.id, card);
  return card;
}

export function getCardImageUrl(card: ScryfallCard, size: 'small' | 'normal' | 'large' = 'normal'): string {
  if (card.image_uris) {
    return card.image_uris[size];
  }
  if (card.card_faces && card.card_faces[0]?.image_uris) {
    return card.card_faces[0].image_uris[size];
  }
  return '';
}
