export interface LocationSettings {
  is_sharing_enabled: boolean;
  tracking_code: string;
}

export interface LocationPing {
  external_id: string;
  player_id?: string;
  player_name?: string;
  game_id: string | null;
  team_id: string | null;
  lat: string;
  lon: string;
  accuracy: string | null;
  timestamp: string;
  client: string | number;
}
