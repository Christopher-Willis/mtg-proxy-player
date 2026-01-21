import { useState } from 'react';
import { getCardByName } from '../services/scryfall';
import { saveDeck, createNewDeck } from '../services/deckStorage';
import { ScryfallCard, DeckCard, Deck } from '../types/card';

type ParsedLine = {
  quantity: number;
  name: string;
  lineNumber: number;
};

type ValidationResult = {
  line: ParsedLine;
  card: ScryfallCard | null;
  error: string | null;
};

type DeckImportProps = {
  onImportComplete: (deck: Deck) => void;
  onCancel: () => void;
};

function parseDeckList(text: string): ParsedLine[] {
  const lines = text.split('\n');
  const parsed: ParsedLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const match = line.match(/^(\d+)\s+(.+)$/);
    if (match) {
      parsed.push({
        quantity: parseInt(match[1], 10),
        name: match[2].trim(),
        lineNumber: i + 1,
      });
    } else if (line.match(/^[a-zA-Z]/)) {
      parsed.push({
        quantity: 1,
        name: line,
        lineNumber: i + 1,
      });
    }
  }

  return parsed;
}

export function DeckImport({ onImportComplete, onCancel }: DeckImportProps) {
  const [deckName, setDeckName] = useState('');
  const [deckList, setDeckList] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[] | null>(null);
  const [validationProgress, setValidationProgress] = useState({ current: 0, total: 0 });

  const hasErrors = validationResults?.some((r) => r.error !== null) ?? false;
  const allValid = validationResults !== null && !hasErrors;

  async function handleValidate() {
    if (!deckList.trim()) return;

    const parsed = parseDeckList(deckList);
    if (parsed.length === 0) return;

    setIsValidating(true);
    setValidationResults(null);
    setValidationProgress({ current: 0, total: parsed.length });

    const results: ValidationResult[] = [];

    for (let i = 0; i < parsed.length; i++) {
      const line = parsed[i];
      setValidationProgress({ current: i + 1, total: parsed.length });

      try {
        const card = await getCardByName(line.name, true);

        if (card) {
          results.push({ line, card, error: null });
        } else {
          const fuzzyCard = await getCardByName(line.name, false);
          if (fuzzyCard) {
            results.push({
              line,
              card: fuzzyCard,
              error: `Did you mean "${fuzzyCard.name}"?`,
            });
          } else {
            results.push({ line, card: null, error: 'Card not found' });
          }
        }
      } catch (err) {
        results.push({ line, card: null, error: 'Card not found' });
      }
    }

    setValidationResults(results);
    setIsValidating(false);
  }

  function handleAcceptSuggestion(index: number) {
    if (!validationResults) return;

    const result = validationResults[index];
    if (result.card && result.error?.startsWith('Did you mean')) {
      const newResults = [...validationResults];
      newResults[index] = { ...result, error: null };
      setValidationResults(newResults);

      const lines = deckList.split('\n');
      const lineIndex = result.line.lineNumber - 1;
      if (lines[lineIndex]) {
        lines[lineIndex] = `${result.line.quantity} ${result.card.name}`;
        setDeckList(lines.join('\n'));
      }
    }
  }

  function handleImport() {
    if (!allValid || !validationResults || !deckName.trim()) return;

    const deck = createNewDeck(deckName.trim());
    const cards: DeckCard[] = [];

    for (const result of validationResults) {
      if (result.card) {
        const existing = cards.find((c) => c.card.id === result.card!.id);
        if (existing) {
          existing.quantity += result.line.quantity;
        } else {
          cards.push({ card: result.card, quantity: result.line.quantity });
        }
      }
    }

    deck.cards = cards;
    saveDeck(deck);
    onImportComplete(deck);
  }

  const totalCards = validationResults?.reduce((sum, r) => sum + r.line.quantity, 0) ?? 0;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <h2 className="text-2xl font-bold mb-4">Import Deck</h2>

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1">Deck Name</label>
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Enter deck name..."
            className="w-full px-3 py-2 bg-gray-700 rounded text-white"
          />
        </div>

        {!validationResults && (
          <div className="mb-4 flex-1 min-h-0 flex flex-col">
            <label className="block text-sm text-gray-400 mb-1">
              Deck List (format: "4 Card Name" per line)
            </label>
            <textarea
              value={deckList}
              onChange={(e) => {
                setDeckList(e.target.value);
                setValidationResults(null);
              }}
              placeholder={`4 Lightning Bolt\n4 Counterspell\n2 Black Lotus\n20 Island`}
              className="w-full flex-1 px-3 py-2 bg-gray-700 rounded text-white font-mono text-sm resize-none min-h-[200px]"
            />
          </div>
        )}

        {isValidating && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-gray-400">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              <span>
                Validating cards... ({validationProgress.current}/{validationProgress.total})
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-700 rounded overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{
                  width: `${(validationProgress.current / validationProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {validationResults && (
          <div className="mb-4 flex-1 min-h-0 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">
                Validation Results ({totalCards} cards)
              </span>
              {allValid && (
                <span className="text-green-400 text-sm">✓ All cards valid</span>
              )}
              {hasErrors && (
                <span className="text-red-400 text-sm">
                  {validationResults.filter((r) => r.error).length} error(s)
                </span>
              )}
            </div>

            <div className="space-y-1">
              {validationResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 px-2 py-1 rounded text-sm ${
                    result.error
                      ? result.error.startsWith('Did you mean')
                        ? 'bg-yellow-900/30'
                        : 'bg-red-900/30'
                      : 'bg-green-900/30'
                  }`}
                >
                  <span className="text-gray-400 w-6">{result.line.quantity}x</span>
                  <span className={result.error ? 'text-red-300' : 'text-green-300'}>
                    {result.line.name}
                  </span>
                  {result.error && (
                    <>
                      <span className="text-yellow-400 text-xs ml-auto">
                        {result.error}
                      </span>
                      {result.error.startsWith('Did you mean') && result.card && (
                        <button
                          onClick={() => handleAcceptSuggestion(index)}
                          className="px-2 py-0.5 bg-yellow-600 hover:bg-yellow-700 rounded text-xs"
                        >
                          Accept
                        </button>
                      )}
                    </>
                  )}
                  {!result.error && (
                    <span className="text-green-500 ml-auto">✓</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
          >
            Cancel
          </button>

          {!validationResults && (
            <button
              onClick={handleValidate}
              disabled={isValidating || !deckList.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-semibold"
            >
              Validate Cards
            </button>
          )}

          {validationResults && !allValid && (
            <button
              onClick={handleValidate}
              disabled={isValidating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-semibold"
            >
              Re-validate
            </button>
          )}

          {allValid && (
            <button
              onClick={handleImport}
              disabled={!deckName.trim()}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded font-semibold"
            >
              Import Deck
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
