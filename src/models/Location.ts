export interface LocationPlayer {
  profile_name: string;
  user_profile: {
    user_id: string;
    email: string;
    phone: string;
    is_active: boolean;
  };
  profile_pic: object;
  created: string;
  modified: string;
  is_suspended: boolean;
}

export interface LocationSettings {
  tracking_id: string;
  player: LocationPlayer;
  is_sharing_enabled: boolean;
  tracking_endpoint: string;
  created: string;
  modified: string;
}

export interface LocationPing {
  player: LocationPlayer;
  client: string;
  accuracy: number;
  location_pnt: {
    lat: number;
    lng: number;
  };
  created: string;
  modified: string;
}
