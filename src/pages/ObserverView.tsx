import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { subscribeToRoom, GameRoom, PlayerState } from '../services/firebase';
import { getCardImageUrl, getCachedCardById, prefetchCardsById } from '../services/scryfall';
import { FirebaseGameCard, FirebaseZoneWire, GameCard, ScryfallCard } from '../types/card';

function createUnknownCard(id: string): ScryfallCard {
  return {
    id,
    name: 'Unknown Card',
    cmc: 0,
    type_line: '',
    color_identity: [],
    set: '',
    set_name: '',
    rarity: '',
  };
}

function hydrateZone(zone: FirebaseZoneWire | FirebaseGameCard[] | undefined): GameCard[] {
  if (!zone) return [];

  // Back-compat: older rooms stored zones as FirebaseGameCard[]
  const asArray = Array.isArray(zone) ? (zone as FirebaseGameCard[]) : null;
  const asWire = (!Array.isArray(zone) ? (zone as FirebaseZoneWire) : null) as FirebaseZoneWire | null;

  const wires: FirebaseGameCard[] = asArray
    ? asArray
    : (asWire?.order || [])
        .map((id) => asWire?.cardsById?.[id])
        .filter((c): c is FirebaseGameCard => Boolean(c));

  return wires.map((wire) => {
    const card = getCachedCardById(wire.cardId) || createUnknownCard(wire.cardId);
    return {
      instanceId: wire.instanceId,
      card,
      tapped: wire.tapped,
      faceDown: wire.faceDown,
    };
  });
}

function collectZoneCardIds(zone: FirebaseZoneWire | FirebaseGameCard[] | undefined): string[] {
  if (!zone) return [];
  if (Array.isArray(zone)) return (zone as FirebaseGameCard[]).map((c) => c.cardId);
  return Object.values((zone as FirebaseZoneWire).cardsById || {}).map((c) => c.cardId);
}

type HydratedPlayer = Omit<PlayerState, 'battlefield' | 'graveyard' | 'exile' | 'hand' | 'library'> & {
  battlefield: GameCard[];
  graveyard: GameCard[];
  exile: GameCard[];
  hand: GameCard[];
  library: GameCard[];
};

export function ObserverView() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<HydratedPlayer[]>([]);

  useEffect(() => {
    if (!roomId) {
      navigate('/lobby');
      return;
    }

    const unsubscribe = subscribeToRoom(roomId, (roomData) => {
      if (roomData === null) {
        alert('This game has been cancelled.');
        navigate('/lobby');
        return;
      }
      setRoom(roomData);
      if (!roomData?.players) {
        setPlayers([]);
        return;
      }

      const wirePlayers = Object.values(roomData.players);
      const idsToPrefetch = wirePlayers
        .flatMap((p) => [...collectZoneCardIds(p.battlefield), ...collectZoneCardIds(p.graveyard), ...collectZoneCardIds(p.exile)])
        .filter(Boolean);

      void (async () => {
        await prefetchCardsById(idsToPrefetch);
        const hydrated: HydratedPlayer[] = wirePlayers.map((p) => ({
          ...p,
          battlefield: hydrateZone(p.battlefield),
          graveyard: hydrateZone(p.graveyard),
          exile: hydrateZone(p.exile),
          hand: [],
          library: [],
        }));
        setPlayers(hydrated);
      })();
    });

    return unsubscribe;
  }, [roomId, navigate]);

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Loading game...</p>
          <button
            onClick={() => navigate('/lobby')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/lobby')}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold">{room.name}</h1>
          <span className="px-3 py-1 bg-purple-600 rounded text-sm font-semibold">
            Observer Mode
          </span>
        </div>
        <div className="text-gray-400">
          {players.length} player{players.length !== 1 ? 's' : ''} in game
        </div>
      </div>

      {/* Players Grid */}
      <div className="p-4">
        {players.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            <p className="text-xl mb-2">No players yet</p>
            <p>Waiting for players to join...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {players.map((player) => (
              <div
                key={player.odId}
                className="bg-gray-800 rounded-lg overflow-hidden"
              >
                {/* Player Header */}
                <div className="bg-gray-700 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-blue-400">
                      {player.playerName}
                    </span>
                    <span className="text-gray-400 text-sm">
                      ({player.odName})
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-red-400 font-bold text-lg">
                      ❤ {player.life}
                    </span>
                    <span className="text-gray-400">
                      Library: {player.libraryCount}
                    </span>
                    <span className="text-gray-400">
                      Hand: {player.handCount}
                    </span>
                  </div>
                </div>

                {/* Battlefield */}
                <div className="p-4 bg-green-900/20 min-h-[200px]">
                  <h3 className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
                    Battlefield
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {player.battlefield?.map((gameCard) => (
                      <div
                        key={gameCard.instanceId}
                        className={`transition-transform ${
                          gameCard.tapped ? 'rotate-90' : ''
                        }`}
                        title={gameCard.card.name}
                      >
                        <img
                          src={getCardImageUrl(gameCard.card, 'normal')}
                          alt={gameCard.card.name}
                          className="h-32 rounded shadow-lg"
                        />
                      </div>
                    ))}
                    {(!player.battlefield || player.battlefield.length === 0) && (
                      <span className="text-gray-600 text-sm italic">
                        No permanents on battlefield
                      </span>
                    )}
                  </div>
                </div>

                {/* Graveyard */}
                <div className="p-3 bg-gray-800/50 border-t border-gray-700">
                  <h3 className="text-xs text-gray-500 mb-2 uppercase tracking-wide">
                    Graveyard ({player.graveyard?.length || 0})
                  </h3>
                  <div className="flex gap-1 overflow-x-auto">
                    {player.graveyard?.map((gameCard) => (
                      <img
                        key={gameCard.instanceId}
                        src={getCardImageUrl(gameCard.card, 'small')}
                        alt={gameCard.card.name}
                        title={gameCard.card.name}
                        className="h-16 rounded opacity-70 hover:opacity-100 transition-opacity"
                      />
                    ))}
                    {(!player.graveyard || player.graveyard.length === 0) && (
                      <span className="text-gray-600 text-sm italic">Empty</span>
                    )}
                  </div>
                </div>

                {/* Exile */}
                <div className="p-3 bg-purple-900/20 border-t border-gray-700">
                  <h3 className="text-xs text-purple-400 mb-2 uppercase tracking-wide">
                    Exile ({player.exile?.length || 0})
                  </h3>
                  <div className="flex gap-1 overflow-x-auto">
                    {player.exile?.map((gameCard) => (
                      <div key={gameCard.instanceId} className="relative">
                        {gameCard.faceDown ? (
                          <div
                            className="h-16 w-12 bg-purple-900 rounded border border-purple-700 flex items-center justify-center"
                            title="Face-down exiled card"
                          >
                            <span className="text-purple-400 text-xs">?</span>
                          </div>
                        ) : (
                          <img
                            src={getCardImageUrl(gameCard.card, 'small')}
                            alt={gameCard.card.name}
                            title={gameCard.card.name}
                            className="h-16 rounded opacity-80 hover:opacity-100 transition-opacity"
                          />
                        )}
                      </div>
                    ))}
                    {(!player.exile || player.exile.length === 0) && (
                      <span className="text-gray-600 text-sm italic">Empty</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
