export interface CardMetadata {
  casting_cost?: string;
  [key: string]: any;
}

export interface Card {
  card_id: string;
  title: string;
  description: string;
  card_type: string; // e.g., "CURSE"
  image: string | null;
  tags: string[]; // Array of strings
  reward: string | null;
  metadata: CardMetadata;
  created: string;
  modified: string;
}

export interface DeckStats {
  total_cards: number;
  deck_cards: number;
  hand_cards: number;
  discard_cards: number;
}