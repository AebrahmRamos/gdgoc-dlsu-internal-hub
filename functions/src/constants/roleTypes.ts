/**
 * Shared Role Type Constants (Functions Copy)
 * 
 * ⚠️ THIS FILE IS A COPY of src/constants/roleTypes.ts
 * ⚠️ Keep in sync with the main file in src/constants/
 * 
 * Why separate copy:
 * - Cloud Functions have separate build context
 * - Cannot import from ../src/ directory
 * - Alternative: use workspace/monorepo setup (future improvement)
 * 
 * SINGLE SOURCE OF TRUTH for role type mappings.
 * This file is imported by:
 * - functions/src/authTriggers.ts (Cloud Function)
 * - scripts/seedCustomClaims.ts (seed script - via this copy)
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
