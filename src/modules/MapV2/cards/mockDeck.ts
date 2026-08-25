/**
 * The hider's card deck — mock, since no backend concept of a deck exists
 * yet (unlike facts/questions, there's no legacy API shape to convert
 * here, so this is hand-authored rather than converted). One flat list;
 * useCardModule.ts shuffles it into a draw pile per game session.
 */
export interface CardDto {
  card_id: string;
  name: string;
  description: string;
}

export const MOCK_CARD_DECK: CardDto[] = [
  { card_id: 'decoy', name: 'Decoy', description: "Force one seeker's next question about you to resolve as if you were somewhere else." },
  { card_id: 'extra-time', name: 'Extra Time', description: "Add 5 minutes to your team's hiding phase." },
  { card_id: 'shield', name: 'Shield', description: 'Block the next question a seeker asks about your location.' },
  { card_id: 'zone-swap', name: 'Zone Swap', description: 'Trade your current zone with another hider on your team.' },
  { card_id: 'seekers-curse', name: "Seeker's Curse", description: 'Force a random seeker to reveal their own current zone to you.' },
  { card_id: 'double-draw', name: 'Double Draw', description: 'Your next draw pulls two cards instead of one.' },
];
