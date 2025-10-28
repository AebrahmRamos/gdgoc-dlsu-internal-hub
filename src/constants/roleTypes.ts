/**
 * Shared Role Type Constants
 * 
 * SINGLE SOURCE OF TRUTH for role type mappings.
 * This file is imported by:
 * - src/types/team.ts (frontend types)
 * - functions/src/authTriggers.ts (Cloud Function)
 * - scripts/addRoleTypeField.ts (backfill script)
 * - scripts/seedCustomClaims.ts (seed script)
 * 
 * ⚠️ DO NOT duplicate this mapping elsewhere!
 * ⚠️ Always import from this file to ensure consistency.
 */

/**
 * Role type classification for hierarchical permissions
 */
export type RoleType = 'ceo' | 'cxo' | 'committee_head' | 'officer';

/**
 * Role to RoleType mapping configuration
 * This defines the hierarchical classification of all possible roles
 * 
 * Role Hierarchy:
 * - CEO (Top Executive) - Full system access
 * - CxO (C-Suite Executives) - Cross-domain access
 * - Committee Head (Committee Leads/Coordinators) - Committee-specific access
 * - Officer (General team members) - Limited access
 */
export const ROLE_TYPE_MAP: Record<string, RoleType> = {
  // ============================================================
  // CEO (Top Executive)
  // ============================================================
  'CEO': 'ceo',
  'chapter-lead': 'ceo', // From CSV data
  
  // ============================================================
  // CxO (C-Suite Executives)
  // ============================================================
  'CTO': 'cxo',  // Chief Technology Officer
  'CRO': 'cxo',  // Chief Relations Officer
  'COO': 'cxo',  // Chief Operations Officer
  'CFO': 'cxo',  // Chief Finance Officer
  'CHRO': 'cxo', // Chief Human Resources Officer
  'CCO': 'cxo',  // Chief Communications Officer
  
  // ============================================================
  // Committee Heads (Committee Leads/Coordinators)
  // ============================================================
  // Relations Department
  'IndustryPartnershipsLead': 'committee_head',
  'AcademicCollaborationsLead': 'committee_head',
  
  // Operations Department
  'ProjectEventsPlanningLead': 'committee_head',
  'LogisticsLead': 'committee_head',
  
  // Finance Department
  'TreasuryLead': 'committee_head',
  'FundManagementLead': 'committee_head',
  
  // Human Resource Department
  'EngagementLead': 'committee_head',
  'FeedbackLead': 'committee_head',
  
  // Communications Department
  'MarketingPromotionsLead': 'committee_head',
  'MediaCreativesLead': 'committee_head',
  'MediaCoverageLead': 'committee_head',
  
  // Technology Department
  'CurriculumDevelopmentLead': 'committee_head',
  'curriculum-development-lead': 'committee_head', // From CSV (lowercase-hyphenated)
  'SessionDevelopmentLead': 'committee_head',
  'SoftwareDevelopmentLead': 'committee_head',
  
  // Generic
  'Committee Coordinator': 'committee_head', // From CSV
  
  // ============================================================
  // Officers (General team members)
  // ============================================================
  // These are explicitly listed for documentation purposes
  // All unlisted roles default to 'officer'
  
  // Technology - Curriculum Development
  'curriculum-quality-analyst': 'officer',
  'curriculum-designer': 'officer',
  
  // Technology - Session Development
  'session-facilitator': 'officer',
  
  // Technology - Software Development
  'Frontend Developer': 'officer',        // From CSV (capitalized)
  'frontend-developer': 'officer',        // Lowercase variant
  'backend-developer': 'officer',
  'technical-project-manager': 'officer',
  
  // Relations
  'partnership-negotiator': 'officer',
  'academic-coordinator': 'officer',
  'industry-coordinator': 'officer',
  
  // Operations
  'logistics-officer': 'officer',
  'project-coordinator': 'officer',
  
  // Human Resource
  'engagement-planner': 'officer',
  'feedback-coordinator': 'officer',
  
  // Communications
  'marketing-specialist': 'officer',
  'media-creator': 'officer',
  'media-coverage-officer': 'officer',
  
  // Finance
  'treasury-officer': 'officer',
  'fund-manager': 'officer',
};

/**
 * Get the roleType for a given role title
 * Defaults to 'officer' if role is not found in mapping
 * 
 * @param role - The role title (e.g., 'CEO', 'frontend-developer')
 * @returns The roleType classification
 */
export function getRoleType(role: string): RoleType {
  return ROLE_TYPE_MAP[role] || 'officer';
}

/**
 * Validate if a roleType is correct for a given role
 * 
 * @param role - The role title
 * @param roleType - The roleType to validate
 * @returns true if the roleType matches the expected classification
 */
export function isValidRoleType(role: string, roleType: RoleType): boolean {
  return getRoleType(role) === roleType;
}

/**
 * Get all roles for a given roleType
 * Useful for listing available roles by type
 * 
 * @param roleType - The roleType to filter by
 * @returns Array of role titles
 */
export function getRolesByType(roleType: RoleType): string[] {
  return Object.entries(ROLE_TYPE_MAP)
    .filter(([, type]) => type === roleType)
    .map(([role]) => role);
}

/**
 * Get total count of roles by type
 * Useful for validation and debugging
 * 
 * @returns Object with role type counts
 */
export function getRoleTypeCounts(): Record<RoleType, number> {
  const counts: Record<RoleType, number> = {
    ceo: 0,
    cxo: 0,
    committee_head: 0,
    officer: 0,
  };
  
  Object.values(ROLE_TYPE_MAP).forEach(roleType => {
    counts[roleType]++;
  });
  
  return counts;
}
