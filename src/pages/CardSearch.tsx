import { useMemo, useState } from 'react';
import { useDebouncedValue } from '../hooks/debounce';
import { cards } from '../data/cards';

export function CardSearch() {
  // 1. Immediate input state (updates on every keystroke)
  const [query, setQuery] = useState('');

  // 2. Debounced version of the input
  const debouncedQuery = useDebouncedValue(query, 300);

  // 3. Expensive filtering ONLY runs when debouncedQuery changes
  const filteredCards = useMemo(() => {
    if (!debouncedQuery) return cards;

    const lower = debouncedQuery.toLowerCase();

    return cards.filter(card =>
      card.name.toLowerCase().includes(lower)
    );
  }, [debouncedQuery]);

  // 4. Input handler (cheap, instant)
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Search Magic cards..."
      />

      <p>
        Showing {filteredCards.length} results for "
        <strong>{debouncedQuery}</strong>"
      </p>

      <ul>
        {filteredCards.slice(0, 20).map(card => (
          <li key={card.id}>{card.name}</li>
        ))}
      </ul>
    </div>
  );
}
