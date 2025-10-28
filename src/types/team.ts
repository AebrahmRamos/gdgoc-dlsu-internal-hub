/**
 * Type definitions for Team/RBAC system
 * 
 * Role hierarchy:
 * - CEO (top-level executive)
 * - CxO (C-suite: CTO, CRO, COO, CFO, CHRO, CCO)
 * - Committee Head (leads specific committees)
 * - Officer (general team members)
 */

/**
 * Role type classification for hierarchical permissions
 */
export type RoleType = 'ceo' | 'cxo' | 'committee_head' | 'officer';

/**
 * Team member document structure in Firestore
 */
export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string; // Specific role title (e.g., 'CEO', 'CTO', 'SoftwareDevelopmentLead')
  roleType: RoleType; // Hierarchical classification
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

/**
 * Role to RoleType mapping configuration
 * This defines the hierarchical classification of all possible roles
 */
export const ROLE_TYPE_MAP: Record<string, RoleType> = {
  // CEO (Top Executive)
  'CEO': 'ceo',
  'chapter-lead': 'ceo', // From CSV data
  
  // CxO (C-Suite Executives)
  'CTO': 'cxo',
  'CRO': 'cxo',
  'COO': 'cxo',
  'CFO': 'cxo',
  'CHRO': 'cxo',
  'CCO': 'cxo', // Chief Communications Officer
  
  // Committee Heads (Committee Leads/Coordinators)
  'IndustryPartnershipsLead': 'committee_head',
  'AcademicCollaborationsLead': 'committee_head',
  'ProjectEventsPlanningLead': 'committee_head',
  'LogisticsLead': 'committee_head',
  'TreasuryLead': 'committee_head',
  'FundManagementLead': 'committee_head',
  'EngagementLead': 'committee_head',
  'FeedbackLead': 'committee_head',
  'MarketingPromotionsLead': 'committee_head',
  'MediaCreativesLead': 'committee_head',
  'MediaCoverageLead': 'committee_head',
  'CurriculumDevelopmentLead': 'committee_head',
  'curriculum-development-lead': 'committee_head', // From CSV
  'SessionDevelopmentLead': 'committee_head',
  'SoftwareDevelopmentLead': 'committee_head',
  'Committee Coordinator': 'committee_head', // From CSV
  
  // All other positions default to 'officer'
  // These are explicitly listed for documentation purposes
  'curriculum-quality-analyst': 'officer',
  'curriculum-designer': 'officer',
  'session-facilitator': 'officer',
  'Frontend Developer': 'officer',
  'frontend-developer': 'officer',
  'backend-developer': 'officer',
  'technical-project-manager': 'officer',
  'partnership-negotiator': 'officer',
  'academic-coordinator': 'officer',
  'industry-coordinator': 'officer',
  'logistics-officer': 'officer',
  'project-coordinator': 'officer',
  'engagement-planner': 'officer',
  'feedback-coordinator': 'officer',
  'marketing-specialist': 'officer',
  'media-creator': 'officer',
  'media-coverage-officer': 'officer',
  'treasury-officer': 'officer',
  'fund-manager': 'officer',
};

/**
 * Get the roleType for a given role title
 * Defaults to 'officer' if role is not found in mapping
 */
export function getRoleType(role: string): RoleType {
  return ROLE_TYPE_MAP[role] || 'officer';
}

/**
 * Validate if a roleType is correct for a given role
 */
export function isValidRoleType(role: string, roleType: RoleType): boolean {
  return getRoleType(role) === roleType;
}
