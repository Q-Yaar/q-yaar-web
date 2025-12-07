export interface UserData {
  user_id: string;
  email: string;
  phone: string | null;
  is_active: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface UserSession extends AuthTokens {
  data: UserData;
}

export interface ProfileDetails {
  profile_name: string;
  user_profile: UserData;
  profile_pic: Record<string, any>; // Empty object in JSON, likely dynamic
  created: string;
  modified: string;
  is_suspended: boolean;
}

export interface ProfileSession extends AuthTokens {
  data: ProfileDetails;
}

export interface LoginResponse {
  user: UserSession;
  // Using Record<string, ...> handles "PLAYER" or any other future roles
  profiles: Record<string, ProfileSession>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  confirm_password: string;
  role: string;         // e.g., "PLAYER"
  profile_name: string; // This maps to "name" in your form
}