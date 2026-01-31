export type AppRole = 'admin' | 'guard';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Checkpoint {
  id: string;
  name: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  distance: number | null;
  created_at: string;
  created_by: string | null;
}

export interface Scan {
  id: string;
  guard_id: string;
  guard_name: string;
  checkpoint_id: string;
  checkpoint_name: string;
  scanned_at: string;
  latitude: number | null;
  longitude: number | null;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile | null;
  roles: AppRole[];
}
