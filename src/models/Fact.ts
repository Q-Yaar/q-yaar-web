export interface FactInfo {
  [key: string]: any;
}

export interface Fact {
  fact_id: string;
  fact_type: string;
  fact_info: FactInfo;
  created: string;
  modified: string;
}

export interface CreateFactRequest {
  game_id: string;
  team_id?: string;
  fact_type: string;
  fact_info: FactInfo;
}

export interface UpdateFactRequest {
  fact_id: string;
  fact_info: FactInfo;
}

export interface GetFactsRequest {
  game_id: string;
  team_id?: string;
  fact_type?: string;
}

export interface GetFactsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Fact[];
}
