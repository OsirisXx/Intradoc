import type { FunctionalRole } from './index';

export interface AuthUser {
  USER_ID: number;
  EMAIL: string;
  NAME: string;
  FUNCTIONAL_ROLE: FunctionalRole;
  ORGANIZATIONAL_ROLE?: string;
  SECTION_ID: number;
  STATUS: string;
  PROFILE_IMAGE?: string;  // URL path to profile image
}
