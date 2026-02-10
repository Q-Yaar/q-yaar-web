export interface DieConfig {
  id: string; // Unique ID for the die slot (e.g., 'die-0', 'die-1')
  type: string; // 'd4', 'd6', etc. (derived from max)
  label: string; // Display label
  max: number;
  color: string;
  rings: string;
}

export interface RollResult {
  id: string; // Unique ID for key
  dieType: string;
  value: number;
  timestamp: number;
}
