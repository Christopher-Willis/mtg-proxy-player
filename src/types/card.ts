export type ScryfallCard = {
  id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  colors?: string[];
  color_identity: string[];
  set: string;
  set_name: string;
  rarity: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
  card_faces?: {
    name: string;
    mana_cost?: string;
    type_line: string;
    oracle_text?: string;
    image_uris?: {
      small: string;
      normal: string;
      large: string;
      png: string;
      art_crop: string;
      border_crop: string;
    };
  }[];
};

export type DeckCard = {
  card: ScryfallCard;
  quantity: number;
};

export type TokenDefinition = {
  id: string;
  name: string;
  imageUrl?: string;
  power?: string;
  toughness?: string;
  colors?: string[];
  isCustom: boolean;
};

export type CounterDefinition = {
  id: string;
  name: string;
  symbol: string;
  color: string;
  isCustom: boolean;
};

export type DeckTokenBox = {
  tokens: TokenDefinition[];
  counters: CounterDefinition[];
};

export type Deck = {
  id: string;
  name: string;
  cards: DeckCard[];
  tokenBox?: DeckTokenBox;
  createdAt: number;
  updatedAt: number;
};

export type CardCounter = {
  counterId: string;
  name: string;
  symbol: string;
  color: string;
  count: number;
};

export type GameCard = {
  instanceId: string;
  card: ScryfallCard;
  tapped: boolean;
  faceDown: boolean;
  counters?: CardCounter[];
};

export type GameToken = {
  instanceId: string;
  token: TokenDefinition;
  tapped: boolean;
  counters?: CardCounter[];
};

export type FirebaseGameCard = {
  instanceId: string;
  cardId: string;
  tapped: boolean;
  faceDown: boolean;
};

export type FirebaseZoneWire = {
  cardsById: Record<string, FirebaseGameCard>;
  order: string[];
};

export type GameZone = 'library' | 'hand' | 'battlefield' | 'graveyard' | 'exile';

export type GameState = {
  odId: string;
  odName: string;
  library: GameCard[];
  hand: GameCard[];
  battlefield: GameCard[];
  graveyard: GameCard[];
  exile: GameCard[];
  life: number;
};
