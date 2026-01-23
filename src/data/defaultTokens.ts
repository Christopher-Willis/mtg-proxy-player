import { TokenDefinition, CounterDefinition } from '../types/card';

export const DEFAULT_TOKENS: TokenDefinition[] = [
  {
    id: 'treasure',
    name: 'Treasure',
    imageUrl: 'https://cards.scryfall.io/normal/front/a/3/a3a684b7-27e0-4d9e-a064-9e03c6e50c89.jpg?1641306255',
    isCustom: false,
  },
  {
    id: 'clue',
    name: 'Clue',
    imageUrl: 'https://cards.scryfall.io/normal/front/f/2/f2c859e1-181e-44d1-afbd-bbd6e52cf42a.jpg?1562086885',
    isCustom: false,
  },
  {
    id: 'food',
    name: 'Food',
    imageUrl: 'https://cards.scryfall.io/normal/front/b/f/bf36408d-ed85-497f-8e68-d3a922c388a0.jpg?1744533637',
    isCustom: false,
  },
];

export const DEFAULT_COUNTERS: CounterDefinition[] = [
  {
    id: 'plus1',
    name: '+1/+1',
    symbol: '+1',
    color: '#22c55e',
    isCustom: false,
  },
  {
    id: 'minus1',
    name: '-1/-1',
    symbol: '-1',
    color: '#ef4444',
    isCustom: false,
  },
  {
    id: 'charge',
    name: 'Charge',
    symbol: '⚡',
    color: '#3b82f6',
    isCustom: false,
  },
  {
    id: 'loyalty',
    name: 'Loyalty',
    symbol: '❖',
    color: '#a855f7',
    isCustom: false,
  },
];

export function getDefaultTokenBox() {
  return {
    tokens: [...DEFAULT_TOKENS],
    counters: [...DEFAULT_COUNTERS],
  };
}
