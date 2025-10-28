/**
 * Declarative Permission Configuration for RBAC
 * 
 * This file defines all permissions in a declarative, centralized manner.
 * Permissions are checked using OR logic by default (any matching condition grants access).
 * Set `requireAll: true` for AND logic (all conditions must match).
 * 
 * Permission Philosophy:
 * - CEO has full access to everything
 * - CxO have access to their domain + cross-domain visibility
 * - Committee Heads have access to their committee's resources
 * - Officers have read-only access to most resources
 */

import type { UserIdentity, RoleType } from '../types/team';

/**
 * Permission rule definition
 * Multiple conditions are combined with OR logic by default
 */
export interface PermissionRule {
  /** Specific roles that have this permission (e.g., ['CEO', 'CTO']) */
  roles?: string[];
  
  /** Role types that have this permission (e.g., ['ceo', 'cxo']) */
  roleTypes?: RoleType[];
  
  /** Departments that have this permission (e.g., ['Technology', 'Relations']) */
  departments?: string[];
  
  /** Committees that have this permission (e.g., ['software-development']) */
  committees?: string[];
  
  /** If true, ALL conditions must match (AND logic). Default: false (OR logic) */
  requireAll?: boolean;
  
  /** Custom validation function for complex permission logic */
  customCheck?: (identity: UserIdentity, params?: any) => boolean;
}

/**
 * Complete permission matrix
 * Structure: { resource: { action: PermissionRule } }
 */
export const PERMISSIONS: Record<string, Record<string, PermissionRule>> = {
  /**
   * TEAM MANAGEMENT
   * Viewing and managing team members
   */
  team: {
    // All authenticated users can view the team list
    list: {
      roleTypes: ['ceo', 'cxo', 'committee_head', 'officer'],
    },
    
    // All authenticated users can view individual team member details
    show: {
      roleTypes: ['ceo', 'cxo', 'committee_head', 'officer'],
    },
    
    // Only CEO can create new team members
    create: {
      roles: ['CEO', 'chapter-lead'],
    },
    
    // CEO and CHRO can edit team members
    // CHRO has field-level restrictions (enforced in accessControlProvider)
    edit: {
      roles: ['CEO', 'chapter-lead', 'CHRO'],
    },
    
    // Only CEO can delete team members
    delete: {
      roles: ['CEO', 'chapter-lead'],
    },
  },
  
  /**
   * PARTNERS CRM
   * Managing external partnerships
   */
  partners: {
    // CEO, CCO (Chief Communications Officer, who oversees Relations), CTO, and Relations team can view partners
    list: {
      roles: ['CEO', 'chapter-lead', 'CCO', 'CTO'],
      departments: ['Relations'],
    },
    
    // Same as list
    show: {
      roles: ['CEO', 'chapter-lead', 'CCO', 'CTO'],
      departments: ['Relations'],
    },
    
    // CEO and Relations can create partners
    create: {
      roles: ['CEO', 'chapter-lead'],
      departments: ['Relations'],
    },
    
    // CEO and Relations can edit partners
    // Ownership check for non-CEO/Relations users handled in accessControlProvider
    edit: {
      roles: ['CEO', 'chapter-lead'],
      departments: ['Relations'],
    },
    
    // CEO and Relations can delete partners
    // Ownership check for non-CEO/Relations users handled in accessControlProvider
    delete: {
      roles: ['CEO', 'chapter-lead'],
      departments: ['Relations'],
    },
  },
  
  /**
   * ASSETS/FILES MANAGEMENT
   * Uploaded files and media assets
   */
  assets: {
    // All users can view assets
    list: {
      roleTypes: ['ceo', 'cxo', 'committee_head', 'officer'],
    },
    
    // All users can view individual assets
    show: {
      roleTypes: ['ceo', 'cxo', 'committee_head', 'officer'],
    },
    
    // CEO, Technology (CTO + Tech team), and Communications (CCO + Comms team) can upload
    create: {
      roles: ['CEO', 'chapter-lead', 'CTO', 'CCO'],
      departments: ['Technology', 'Communications'],
    },
    
    // CEO, Technology, and Communications can delete
    // Uploader ownership check for others handled in accessControlProvider
    delete: {
      roles: ['CEO', 'chapter-lead', 'CTO', 'CCO'],
      departments: ['Technology', 'Communications'],
    },
  },
  
  /**
   * FILES (Alias for assets, for compatibility)
   */
  files: {
    list: {
      roleTypes: ['ceo', 'cxo', 'committee_head', 'officer'],
    },
    
    show: {
      roleTypes: ['ceo', 'cxo', 'committee_head', 'officer'],
    },
    
    create: {
      roles: ['CEO', 'chapter-lead', 'CTO', 'CCO'],
      departments: ['Technology', 'Communications'],
    },
    
    delete: {
      roles: ['CEO', 'chapter-lead', 'CTO', 'CCO'],
      departments: ['Technology', 'Communications'],
    },
  },
  
  /**
   * DASHBOARD
   * Analytics and overview
   */
  dashboard: {
    // All users can view the dashboard
    show: {
      roleTypes: ['ceo', 'cxo', 'committee_head', 'officer'],
    },
  },
  
  /**
   * BLOG POSTS (Future)
   * Internal announcements and updates
   */
  'blog-posts': {
    list: {
      roleTypes: ['ceo', 'cxo', 'committee_head', 'officer'],
    },
    
    show: {
      roleTypes: ['ceo', 'cxo', 'committee_head', 'officer'],
    },
    
    create: {
      roles: ['CEO', 'chapter-lead', 'CCO'],
      departments: ['Communications'],
    },
    
    edit: {
      roles: ['CEO', 'chapter-lead', 'CCO'],
      departments: ['Communications'],
    },
    
    delete: {
      roles: ['CEO', 'chapter-lead'],
    },
  },
  
  /**
   * CATEGORIES (Future)
   * Categorization for blog posts, events, etc.
   */
  categories: {
    list: {
      roleTypes: ['ceo', 'cxo', 'committee_head', 'officer'],
    },
    
    show: {
      roleTypes: ['ceo', 'cxo', 'committee_head', 'officer'],
    },
    
    create: {
      roles: ['CEO', 'chapter-lead', 'CCO'],
    },
    
    edit: {
      roles: ['CEO', 'chapter-lead', 'CCO'],
    },
    
    delete: {
      roles: ['CEO', 'chapter-lead'],
    },
  },
  
  /**
   * TASKS (Placeholder for future)
   * Task management and assignment
   */
  tasks: {
    list: {
      roleTypes: ['ceo', 'cxo', 'committee_head', 'officer'],
    },
    
    create: {
      roleTypes: ['ceo', 'cxo', 'committee_head'],
    },
    
    edit: {
      roleTypes: ['ceo', 'cxo', 'committee_head'],
    },
    
    delete: {
      roleTypes: ['ceo', 'cxo', 'committee_head'],
    },
  },
  
  /**
   * EVENTS (Placeholder for future)
   * Event planning and management
   */
  events: {
    list: {
      roleTypes: ['ceo', 'cxo', 'committee_head', 'officer'],
    },
    
    create: {
      roleTypes: ['ceo', 'cxo'],
      departments: ['Operations'],
    },
    
    edit: {
      roleTypes: ['ceo', 'cxo'],
      departments: ['Operations'],
    },
    
    delete: {
      roles: ['CEO', 'chapter-lead', 'COO'],
    },
  },
  
  /**
   * BUDGET (Placeholder for future)
   * Financial tracking and budget management
   */
  budget: {
    list: {
      roleTypes: ['ceo', 'cxo'],
      departments: ['Finance'],
    },
    
    show: {
      roleTypes: ['ceo', 'cxo'],
      departments: ['Finance'],
    },
    
    create: {
      roles: ['CEO', 'chapter-lead', 'CFO'],
    },
    
    edit: {
      roles: ['CEO', 'chapter-lead', 'CFO'],
    },
    
    delete: {
      roles: ['CEO', 'chapter-lead'],
    },
  },
};

/**
 * Check if a user has a specific permission
 * Uses OR logic by default: any matching condition grants access
 * Set requireAll: true in the rule for AND logic
 * 
 * @param identity - User identity with role information
 * @param rule - Permission rule to check
 * @param params - Optional parameters for custom checks
 * @returns true if user has permission, false otherwise
 */
export function checkPermission(
  identity: UserIdentity,
  rule: PermissionRule,
  params?: any
): boolean {
  // If custom check is defined, use it
  if (rule.customCheck) {
    return rule.customCheck(identity, params);
  }
  
  const checks: boolean[] = [];
  
  // Check roles
  if (rule.roles) {
    checks.push(rule.roles.includes(identity.role));
  }
  
  // Check role types
  if (rule.roleTypes) {
    checks.push(rule.roleTypes.includes(identity.roleType));
  }
  
  // Check departments
  if (rule.departments) {
    checks.push(rule.departments.includes(identity.department));
  }
  
  // Check committees
  if (rule.committees && identity.committee) {
    checks.push(rule.committees.includes(identity.committee));
  }
  
  // If no checks were added, deny by default
  if (checks.length === 0) {
    return false;
  }
  
  // Apply AND/OR logic
  if (rule.requireAll) {
    // AND logic: all checks must pass
    return checks.every(check => check === true);
  } else {
    // OR logic: at least one check must pass
    return checks.some(check => check === true);
  }
}

/**
 * Get permission rule for a resource and action
 * Returns undefined if no rule is defined (deny by default)
 */
export function getPermissionRule(
  resource: string,
  action: string
): PermissionRule | undefined {
  return PERMISSIONS[resource]?.[action];
}

/**
 * Check if a user can perform an action on a resource
 * Convenience wrapper around checkPermission
 */
export function can(
  identity: UserIdentity,
  resource: string,
  action: string,
  params?: any
): boolean {
  const rule = getPermissionRule(resource, action);
  
  if (!rule) {
    // No rule defined = deny by default
    return false;
  }
  
  return checkPermission(identity, rule, params);
}
