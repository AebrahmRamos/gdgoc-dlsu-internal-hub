/**
 * Type definitions for Team/RBAC system
 * 
 * Role hierarchy:
 * - CEO (top-level executive)
 * - CxO (C-suite: CTO, CRO, COO, CFO, CHRO, CCO)
 * - Committee Head (leads specific committees)
 * - Officer (general team members)
 */

// Import shared role type constants (SINGLE SOURCE OF TRUTH)
export { RoleType, ROLE_TYPE_MAP, getRoleType, isValidRoleType } from '../constants/roleTypes';

/**
 * Team member document structure in Firestore
 */
export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string; // Specific role title (e.g., 'CEO', 'CTO', 'SoftwareDevelopmentLead')
  roleType: import('../constants/roleTypes').RoleType; // Hierarchical classification
  department: string; // e.g., 'Executive', 'Technology', 'Relations', 'Operations', 'Human Resource', 'Communications', 'Finance'
  committee?: string; // e.g., 'software-development', 'curriculum-development'
  createdAt: Date;
  claimsUpdatedAt?: Date; // Timestamp of last custom claims update (for token refresh tracking)
}

/**
 * User identity object returned by authProvider.getIdentity()
 * Used throughout the app for permission checking
 */
export interface UserIdentity extends Omit<TeamMember, 'createdAt' | 'claimsUpdatedAt'> {}
