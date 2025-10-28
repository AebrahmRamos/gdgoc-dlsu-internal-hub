/**
 * Seed Custom Claims Script
 * 
 * This script sets custom claims for all existing team members
 * Run this AFTER deploying the Cloud Function and AFTER the roleType backfill
 * 
 * What it does:
 * 1. Queries all documents from 'team' collection
 * 2. Validates required fields (role/roleType, department)
 * 3. Sets custom claims for each user in Firebase Auth
 * 4. Revokes refresh tokens to force immediate token refresh
 * 5. Updates claimsUpdatedAt timestamp
 * 
 * Run with: npm run script:seed-claims
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Load service account
const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth();
const db = getFirestore();

/**
 * Role type mapping (must match authTriggers.ts)
 */
const ROLE_TYPE_MAP: Record<string, string> = {
  'CEO': 'ceo',
  'chapter-lead': 'ceo',
  'CTO': 'cxo',
  'CRO': 'cxo',
  'COO': 'cxo',
  'CFO': 'cxo',
  'CHRO': 'cxo',
  'CCO': 'cxo',
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
 * Main seed function
 */
async function seedCustomClaims() {
  console.log('[Claims] Starting custom claims seed...\n');
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  const errors: Array<{ userId: string; email: string; error: string }> = [];
  
  try {
    // Get all team documents
    const teamSnapshot = await db.collection('team').get();
    
    console.log(`[Claims] Found ${teamSnapshot.size} team members\n`);
    
    if (teamSnapshot.empty) {
      console.log('[Claims] No team members found. Exiting.');
      process.exit(0);
    }
    
    // Process each team member
    for (const doc of teamSnapshot.docs) {
      const data = doc.data();
      const userId = doc.id;
      const email = data.email;
      
      try {
        // Validate required fields
        const role = data.role || data.position;
        const department = data.department;
        
        if (!role || !department) {
          console.log(`[Claims] ⏭️  Skipping ${email}: Missing role or department`);
          skippedCount++;
          errors.push({
            userId,
            email,
            error: 'Missing required fields (role or department)',
          });
          continue;
        }
        
        // Validate roleType exists (should be set by backfill script)
        if (!data.roleType) {
          console.log(`[Claims] ⚠️  Warning: ${email}: Missing roleType field (should run backfill first)`);
          // Continue anyway, we'll auto-fix it
        }
        
        // Get or calculate roleType
        const roleType = data.roleType || getRoleType(role);
        
        // Prepare custom claims
        const customClaims = {
          role,
          roleType,
          department,
          committee: data.committee || null,
        };
        
        // Check if user exists in Firebase Auth
        let authUser;
        try {
          authUser = await auth.getUserByEmail(email);
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            console.log(`[Claims] ⏭️  Skipping ${email}: User not found in Firebase Auth`);
            skippedCount++;
            errors.push({
              userId,
              email,
              error: 'User not found in Firebase Auth',
            });
            continue;
          }
          throw error; // Re-throw other errors
        }
        
        // Set custom claims
        await auth.setCustomUserClaims(authUser.uid, customClaims);
        
        // Revoke refresh tokens to force immediate refresh
        await auth.revokeRefreshTokens(authUser.uid);
        
        // Update claimsUpdatedAt in Firestore
        await db.collection('team').doc(userId).update({
          claimsUpdatedAt: FieldValue.serverTimestamp(),
        });
        
        console.log(`[Claims] ✅ Set claims for ${email}:`, customClaims);
        successCount++;
        
      } catch (error: any) {
        console.error(`[Claims] ❌ Error processing ${email}:`, error.message);
        errorCount++;
        errors.push({
          userId,
          email,
          error: error.message,
        });
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('[Claims] Seed Summary:');
    console.log(`  ✅ Successfully seeded: ${successCount}`);
    console.log(`  ⏭️  Skipped: ${skippedCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📊 Total processed: ${teamSnapshot.size}`);
    console.log('='.repeat(60) + '\n');
    
    // Show errors if any
    if (errors.length > 0) {
      console.log('[Claims] Errors/Skipped Details:');
      errors.forEach(({ email, error }) => {
        console.log(`  - ${email}: ${error}`);
      });
      console.log();
    }
    
    // Show next steps
    console.log('[Claims] Next Steps:');
    console.log('  1. Deploy the Cloud Function: cd functions && npm run deploy');
    console.log('  2. Users will automatically get updated claims on their next login');
    console.log('  3. For immediate effect, users should sign out and sign back in');
    console.log();
    
  } catch (error) {
    console.error('[Claims] Fatal error during seed:', error);
    process.exit(1);
  }
  
  if (errorCount > 0) {
    console.log('[Claims] ⚠️  Seed completed with errors. Please review above.');
    process.exit(1);
  } else {
    console.log('[Claims] 🎉 Seed completed successfully!');
    process.exit(0);
  }
}

// Run the seed
seedCustomClaims();
