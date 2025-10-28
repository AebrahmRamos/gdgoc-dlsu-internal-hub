/**
 * Access Control Provider for Refine
 * 
 * Implements fine-grained permission checking using custom claims and permission config.
 * Integrates with Refine's access control system to enable/disable UI elements.
 */

import type { AccessControlProvider, CanParams, CanReturnType } from '@refinedev/core';
import type { UserIdentity } from '../types/team';
import { checkPermission, getPermissionRule } from '../config/permissionsConfig';
import { authProvider } from '../authProvider';

/**
 * Access Control Provider implementation
 * 
 * This provider:
 * 1. Fetches user identity (with custom claims)
 * 2. Looks up permission rules from declarative config
 * 3. Applies basic + granular permission checks
 * 4. Returns structured permission result
 */
export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action, params }: CanParams): Promise<CanReturnType> => {
    // Log for debugging (can be removed in production)
    console.log('[RBAC] Checking permission:', { resource, action, params });
    
    try {
      // 1. Fetch user identity
      const identity = await authProvider.getIdentity?.();
      
      if (!identity) {
        console.warn('[RBAC] No identity found, denying access');
        return {
          can: false,
          reason: 'User not authenticated',
        };
      }
      
      // 2. Validate identity completeness
      const userIdentity = identity as UserIdentity;
      
      if (!userIdentity.role || !userIdentity.roleType || !userIdentity.department) {
        console.warn('[RBAC] Incomplete user identity:', userIdentity);
        return {
          can: false,
          reason: 'Incomplete user profile. Please contact an administrator.',
        };
      }
      
      // 3. Find permission rule from config
      if (!resource) {
        console.warn('[RBAC] No resource specified');
        return {
          can: false,
          reason: 'No resource specified',
        };
      }
      
      const permissionRule = getPermissionRule(resource, action);
      
      if (!permissionRule) {
        console.warn('[RBAC] No permission rule defined:', { resource, action });
        return {
          can: false,
          reason: `No permission rule defined for ${resource}.${action}`,
        };
      }
      
      // 4. Check basic permission using declarative config
      const hasBasicPermission = checkPermission(userIdentity, permissionRule, params);
      
      if (!hasBasicPermission) {
        console.log('[RBAC] Basic permission check failed:', {
          identity: userIdentity,
          resource,
          action,
        });
        return {
          can: false,
          reason: 'You do not have permission to perform this action',
        };
      }
      
      // 5. Apply granular/conditional checks for specific resources
      
      // PARTNERS: ownership check for edit/delete (unless CEO or Relations)
      if (resource === 'partners' && (action === 'edit' || action === 'delete')) {
        const isCEO = userIdentity.role === 'CEO' || userIdentity.role === 'chapter-lead';
        const isRelations = userIdentity.department === 'Relations';
        
        if (!isCEO && !isRelations) {
          // Check ownership: user must be the creator
          // params contains the record data
          const record = params as any;
          const recordCreatorId = record?.createdBy || record?.resource?.createdBy;
          const isOwner = recordCreatorId === userIdentity.id;
          
          if (!isOwner && recordCreatorId) {
            console.log('[RBAC] Ownership check failed for partner:', {
              userId: userIdentity.id,
              creatorId: recordCreatorId,
            });
            return {
              can: false,
              reason: 'You can only modify partners you created',
            };
          }
        }
      }
      
      // FILES/ASSETS: uploader check for delete (unless CEO, Tech, or Comms)
      if ((resource === 'files' || resource === 'assets') && action === 'delete') {
        const isCEO = userIdentity.role === 'CEO' || userIdentity.role === 'chapter-lead';
        const isTech = userIdentity.department === 'Technology' || userIdentity.role === 'CTO';
        const isComms = userIdentity.department === 'Communications' || userIdentity.role === 'CCO';
        
        if (!isCEO && !isTech && !isComms) {
          // Check uploader ownership
          const record = params as any;
          const uploaderId = record?.uploadedBy || record?.resource?.uploadedBy;
          const isUploader = uploaderId === userIdentity.id;
          
          if (!isUploader && uploaderId) {
            console.log('[RBAC] Uploader check failed for file:', {
              userId: userIdentity.id,
              uploaderId,
            });
            return {
              can: false,
              reason: 'You can only delete files you uploaded',
            };
          }
        }
      }
      
      // TEAM: CHRO field-level restrictions for edit
      // (Field-level validation should also be enforced in the form/backend)
      if (resource === 'team' && action === 'edit') {
        const isHRO = userIdentity.role === 'CHRO';
        const isCEO = userIdentity.role === 'CEO' || userIdentity.role === 'chapter-lead';
        
        if (isHRO && !isCEO) {
          // CHRO can edit, but frontend should restrict which fields are editable
          // This is documented here for clarity; actual field restriction is in the form component
          console.log('[RBAC] CHRO editing team member (field restrictions apply)');
        }
      }
      
      // Future granular checks can be added here:
      // - Budget limits
      // - Time-based restrictions
      // - Approval workflows
      // - Department-specific data access
      
      // 6. Return success
      console.log('[RBAC] Permission granted:', { resource, action, identity: userIdentity.email });
      
      return {
        can: true,
      };
      
    } catch (error) {
      console.error('[RBAC] Error checking permission:', error);
      return {
        can: false,
        reason: 'An error occurred while checking permissions',
      };
    }
  },
  
  /**
   * Configuration options for access control
   */
  options: {
    buttons: {
      // Enable access control for action buttons
      enableAccessControl: true,
      
      // Automatically hide unauthorized buttons (recommended)
      hideIfUnauthorized: true,
    },
  },
};
