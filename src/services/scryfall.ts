import { ScryfallCard } from '../types/card';

const API_BASE = 'https://api.scryfall.com';
const MIN_REQUEST_INTERVAL_MS = 100;

let lastRequestTime = 0;

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

  return response.json();
}

export async function getCardById(id: string): Promise<ScryfallCard | null> {
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

  return response.json();
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
