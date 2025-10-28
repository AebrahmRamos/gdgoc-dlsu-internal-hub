/**
 * Firebase Cloud Function: Auth Triggers
 * 
 * Automatically sync custom claims when team member data changes
 * This ensures role-based permissions are always up-to-date
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

// Import role type mapping for validation
const ROLE_TYPE_MAP: Record<string, string> = {
  // CEO (Top Executive)
  'CEO': 'ceo',
  'chapter-lead': 'ceo',
  
  // CxO (C-Suite Executives)
  'CTO': 'cxo',
  'CRO': 'cxo',
  'COO': 'cxo',
  'CFO': 'cxo',
  'CHRO': 'cxo',
  'CCO': 'cxo',
  
  // Committee Heads
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
  'curriculum-development-lead': 'committee_head',
  'SessionDevelopmentLead': 'committee_head',
  'SoftwareDevelopmentLead': 'committee_head',
  'Committee Coordinator': 'committee_head',
};

function getRoleType(role: string): string {
  return ROLE_TYPE_MAP[role] || 'officer';
}

/**
 * Sync custom claims when team document is created or updated
 * 
 * Listens to: team/{userId}
 * Updates: Firebase Auth custom claims
 * Triggers: Token refresh for immediate propagation
 */
export const updateAuthClaims = onDocumentWritten(
  'team/{userId}',
  async (event) => {
    const userId = event.params.userId;
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();
    
    // Handle document deletion
    if (!afterData) {
      logger.info('[Claims] Document deleted, clearing claims', { userId });
      try {
        await getAuth().setCustomUserClaims(userId, {
          role: null,
          roleType: null,
          department: null,
          committee: null,
        });
        await getAuth().revokeRefreshTokens(userId);
        logger.info('[Claims] Successfully cleared claims for deleted user', { userId });
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          logger.warn('[Claims] User not found in Auth, skipping claim clear', { userId });
        } else {
          logger.error('[Claims] Error clearing claims', { userId, error });
          throw error;
        }
      }
      return;
    }
    
    // Check if relevant fields changed (optimization)
    if (beforeData) {
      const relevantFieldsChanged = 
        beforeData.role !== afterData.role ||
        beforeData.roleType !== afterData.roleType ||
        beforeData.department !== afterData.department ||
        beforeData.committee !== afterData.committee;
      
      if (!relevantFieldsChanged) {
        logger.debug('[Claims] No relevant fields changed, skipping', { userId });
        return;
      }
    }
    
    const role = afterData.role || afterData.position; // Support legacy 'position' field
    const department = afterData.department;
    const committee = afterData.committee;
    
    if (!role || !department) {
      logger.warn('[Claims] Missing required fields (role or department), skipping', {
        userId,
        email: afterData.email,
        role,
        department,
      });
      return;
    }
    
    // Auto-fix roleType if it doesn't match the role
    let roleType = afterData.roleType;
    const expectedRoleType = getRoleType(role);
    
    if (roleType !== expectedRoleType) {
      logger.warn('[Claims] RoleType mismatch, auto-fixing', {
        userId,
        email: afterData.email,
        role,
        oldRoleType: roleType,
        newRoleType: expectedRoleType,
      });
      
      roleType = expectedRoleType;
      
      // Update Firestore with corrected roleType
      try {
        await getFirestore()
          .collection('team')
          .doc(userId)
          .update({ roleType });
      } catch (error) {
        logger.error('[Claims] Error updating roleType in Firestore', { userId, error });
        // Continue with claim update even if Firestore update fails
      }
    }
    
    // Prepare custom claims
    const customClaims = {
      role,
      roleType,
      department,
      committee: committee || null,
    };
    
    logger.info('[Claims] Setting custom claims', {
      userId,
      email: afterData.email,
      claims: customClaims,
    });
    
    try {
      // Set custom claims
      await getAuth().setCustomUserClaims(userId, customClaims);
      
      // CRITICAL: Revoke refresh tokens to force immediate token refresh
      await getAuth().revokeRefreshTokens(userId);
      
      // Update claimsUpdatedAt timestamp in Firestore
      await getFirestore()
        .collection('team')
        .doc(userId)
        .update({
          claimsUpdatedAt: FieldValue.serverTimestamp(),
        });
      
      logger.info('[Claims] Successfully updated claims and revoked tokens', {
        userId,
        email: afterData.email,
      });
      
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        logger.warn('[Claims] Auth user not found yet, will retry on next update', {
          userId,
          email: afterData.email,
        });
        // Don't throw - user might be created later
      } else {
        logger.error('[Claims] Error setting custom claims', {
          userId,
          email: afterData.email,
          error,
        });
        throw error;
      }
    }
  }
);
