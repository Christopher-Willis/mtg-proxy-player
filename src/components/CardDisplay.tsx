import { ScryfallCard } from '../types/card';
import { getCardImageUrl } from '../services/scryfall';

type CardDisplayProps = {
  card: ScryfallCard;
  size?: 'small' | 'normal' | 'large';
  onClick?: () => void;
  showDetails?: boolean;
  className?: string;
};

export function CardDisplay({ card, size = 'normal', onClick, showDetails = false, className = '' }: CardDisplayProps) {
  const imageUrl = getCardImageUrl(card, size);

  return (
    <div
      className={`relative group cursor-pointer ${className}`}
      onClick={onClick}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={card.name}
          className="rounded-lg shadow-md hover:shadow-xl transition-shadow"
          loading="lazy"
        />
      ) : (
        <div className="w-48 h-64 bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">
          No Image
        </div>
      )}

      {showDetails && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-white text-sm font-semibold truncate">{card.name}</p>
          <p className="text-gray-300 text-xs truncate">{card.type_line}</p>
          {card.mana_cost && (
            <p className="text-gray-400 text-xs">{card.mana_cost}</p>
          )}
        </div>
      )}
    </div>
  );
}
