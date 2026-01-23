import { useState } from 'react';
import { TokenDefinition, CounterDefinition, DeckTokenBox } from '../types/card';
import { DEFAULT_TOKENS, DEFAULT_COUNTERS } from '../data/defaultTokens';

interface TokenDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  tokenBox: DeckTokenBox;
  onTokenBoxChange: (tokenBox: DeckTokenBox) => void;
  onDragStart: (type: 'token' | 'counter', item: TokenDefinition | CounterDefinition) => void;
  onTokenAdd?: (token: TokenDefinition) => void;
}

export function TokenDrawer({ 
  isOpen, 
  onToggle, 
  tokenBox, 
  onTokenBoxChange,
  onDragStart,
  onTokenAdd 
}: TokenDrawerProps) {
  const [activeTab, setActiveTab] = useState<'tokens' | 'counters'>('tokens');
  const [isAddingToken, setIsAddingToken] = useState(false);
  const [isAddingCounter, setIsAddingCounter] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenPower, setNewTokenPower] = useState('');
  const [newTokenToughness, setNewTokenToughness] = useState('');
  const [newCounterName, setNewCounterName] = useState('');
  const [newCounterSymbol, setNewCounterSymbol] = useState('');
  const [newCounterColor, setNewCounterColor] = useState('#ffffff');

  function handleAddToken() {
    if (!newTokenName.trim()) return;
    
    const newToken: TokenDefinition = {
      id: `custom-token-${Date.now()}`,
      name: newTokenName.trim(),
      power: newTokenPower || undefined,
      toughness: newTokenToughness || undefined,
      isCustom: true,
    };
    
    onTokenBoxChange({
      ...tokenBox,
      tokens: [...tokenBox.tokens, newToken],
    });
    
    setNewTokenName('');
    setNewTokenPower('');
    setNewTokenToughness('');
    setIsAddingToken(false);
  }

  function handleAddCounter() {
    if (!newCounterName.trim()) return;
    
    const newCounter: CounterDefinition = {
      id: `custom-counter-${Date.now()}`,
      name: newCounterName.trim(),
      symbol: newCounterSymbol || newCounterName.charAt(0).toUpperCase(),
      color: newCounterColor,
      isCustom: true,
    };
    
    onTokenBoxChange({
      ...tokenBox,
      counters: [...tokenBox.counters, newCounter],
    });
    
    setNewCounterName('');
    setNewCounterSymbol('');
    setNewCounterColor('#ffffff');
    setIsAddingCounter(false);
  }

  function handleRemoveToken(tokenId: string) {
    onTokenBoxChange({
      ...tokenBox,
      tokens: tokenBox.tokens.filter(t => t.id !== tokenId),
    });
  }

  function handleRemoveCounter(counterId: string) {
    onTokenBoxChange({
      ...tokenBox,
      counters: tokenBox.counters.filter(c => c.id !== counterId),
    });
  }

  function handleResetToDefaults() {
    onTokenBoxChange({
      tokens: [...DEFAULT_TOKENS],
      counters: [...DEFAULT_COUNTERS],
    });
  }

  return (
    <>
      {/* Collapsed tab on right edge */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-gray-800/70 hover:bg-gray-700 text-white px-1 py-8 rounded-l-lg z-40 transition-all"
          title="Open Token Drawer"
        >
          <span className="writing-mode-vertical text-sm">◀ Tokens</span>
        </button>
      )}

      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 h-full bg-gray-800 border-l border-gray-700 shadow-xl z-50 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '280px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-700">
          <h3 className="font-semibold text-white">Token Box</h3>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white p-1"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('tokens')}
            className={`flex-1 py-2 text-sm font-medium ${
              activeTab === 'tokens'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Tokens ({tokenBox.tokens.length})
          </button>
          <button
            onClick={() => setActiveTab('counters')}
            className={`flex-1 py-2 text-sm font-medium ${
              activeTab === 'counters'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Counters ({tokenBox.counters.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-3 overflow-y-auto" style={{ height: 'calc(100% - 140px)' }}>
          {activeTab === 'tokens' && (
            <div className="space-y-2">
              {tokenBox.tokens.map((token) => (
                <div
                  key={token.id}
                  draggable
                  onDragStart={() => onDragStart('token', token)}
                  onDoubleClick={() => onTokenAdd?.(token)}
                  className="flex items-center gap-2 p-2 bg-gray-700 rounded hover:bg-gray-600 cursor-grab active:cursor-grabbing"
                  title="Drag to battlefield or double-click to add"
                >
                  {token.imageUrl ? (
                    <img
                      src={token.imageUrl}
                      alt={token.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-600 rounded flex items-center justify-center text-xs text-gray-400">
                      {token.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{token.name}</p>
                    {token.power && token.toughness && (
                      <p className="text-xs text-gray-400">{token.power}/{token.toughness}</p>
                    )}
                  </div>
                  {token.isCustom && (
                    <button
                      onClick={() => handleRemoveToken(token.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              {/* Add Token Form */}
              {isAddingToken ? (
                <div className="p-2 bg-gray-700 rounded space-y-2">
                  <input
                    type="text"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    placeholder="Token name..."
                    className="w-full px-2 py-1 bg-gray-600 rounded text-sm text-white placeholder-gray-400"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTokenPower}
                      onChange={(e) => setNewTokenPower(e.target.value)}
                      placeholder="P"
                      className="w-12 px-2 py-1 bg-gray-600 rounded text-sm text-white placeholder-gray-400 text-center"
                    />
                    <span className="text-gray-400">/</span>
                    <input
                      type="text"
                      value={newTokenToughness}
                      onChange={(e) => setNewTokenToughness(e.target.value)}
                      placeholder="T"
                      className="w-12 px-2 py-1 bg-gray-600 rounded text-sm text-white placeholder-gray-400 text-center"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddToken}
                      className="flex-1 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setIsAddingToken(false)}
                      className="flex-1 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingToken(true)}
                  className="w-full py-2 border-2 border-dashed border-gray-600 rounded text-gray-400 hover:border-gray-500 hover:text-gray-300 text-sm"
                >
                  + Add Custom Token
                </button>
              )}
            </div>
          )}

          {activeTab === 'counters' && (
            <div className="space-y-2">
              {tokenBox.counters.map((counter) => (
                <div
                  key={counter.id}
                  draggable
                  onDragStart={() => onDragStart('counter', counter)}
                  className="flex items-center gap-2 p-2 bg-gray-700 rounded hover:bg-gray-600 cursor-grab active:cursor-grabbing"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: counter.color + '40', color: counter.color }}
                  >
                    {counter.symbol}
                  </div>
                  <span className="flex-1 text-sm text-white">{counter.name}</span>
                  {counter.isCustom && (
                    <button
                      onClick={() => handleRemoveCounter(counter.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              {/* Add Counter Form */}
              {isAddingCounter ? (
                <div className="p-2 bg-gray-700 rounded space-y-2">
                  <input
                    type="text"
                    value={newCounterName}
                    onChange={(e) => setNewCounterName(e.target.value)}
                    placeholder="Counter name..."
                    className="w-full px-2 py-1 bg-gray-600 rounded text-sm text-white placeholder-gray-400"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCounterSymbol}
                      onChange={(e) => setNewCounterSymbol(e.target.value)}
                      placeholder="Symbol"
                      className="flex-1 px-2 py-1 bg-gray-600 rounded text-sm text-white placeholder-gray-400"
                      maxLength={3}
                    />
                    <input
                      type="color"
                      value={newCounterColor}
                      onChange={(e) => setNewCounterColor(e.target.value)}
                      className="w-10 h-8 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddCounter}
                      className="flex-1 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setIsAddingCounter(false)}
                      className="flex-1 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingCounter(true)}
                  className="w-full py-2 border-2 border-dashed border-gray-600 rounded text-gray-400 hover:border-gray-500 hover:text-gray-300 text-sm"
                >
                  + Add Custom Counter
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-700 bg-gray-800">
          <p className="text-xs text-gray-500 mb-2">Drag tokens to zones, counters to cards</p>
          <button
            onClick={handleResetToDefaults}
            className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </>
  );
}
