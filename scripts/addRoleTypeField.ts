/**
 * Script to backfill roleType field for all existing team members
 * 
 * This script:
 * 1. Reads all documents from the 'team' collection
 * 2. Determines the appropriate roleType based on the role field
 * 3. Updates each document with the roleType field
 * 4. Logs progress and any errors
 * 
 * Run with: npm run script:add-role-type
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getRoleType } from '../src/constants/roleTypes';
import * as fs from 'fs';
import * as path from 'path';

// Load service account from file
const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

/**
 * Main backfill function
 */
async function backfillRoleTypes() {
  console.log('[RBAC] Starting roleType backfill...\n');
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  
  try {
    // Get all team documents
    const teamRef = db.collection('team');
    const snapshot = await teamRef.get();
    
    console.log(`[RBAC] Found ${snapshot.size} team members to process\n`);
    
    if (snapshot.empty) {
      console.log('[RBAC] No team members found. Exiting.');
      return;
    }
    
    // Process each document
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const docId = doc.id;
      
      try {
        // Check if roleType already exists
        if (data.roleType) {
          console.log(`[RBAC] ⏭️  Skipping ${data.email || docId}: roleType already exists (${data.roleType})`);
          skippedCount++;
          continue;
        }
        
        // Get role from document
        // MIGRATION: Production Firestore uses 'position' field (from CSV import)
        // We're migrating to 'role' field to match TypeScript interface
        const position = data.position;
        const existingRole = data.role;
        
        if (!position && !existingRole) {
          console.error(`[RBAC] ❌ Error: ${data.email || docId}: No position or role field found`);
          errorCount++;
          continue;
        }
        
        // Prefer existing 'role' field, fallback to 'position'
        const role = existingRole || position;
        
        // Determine roleType
        const roleType = getRoleType(role);
        
        // Prepare update object
        const updateData: any = {
          roleType,
          role, // Ensure 'role' field exists with correct value
        };
        
        // If we're migrating from 'position' to 'role', delete the old field
        if (!existingRole && position) {
          console.log(`[RBAC] 🔄 Migrating ${data.email || docId}: position="${position}" → role="${role}"`);
          updateData.position = FieldValue.delete();
        }
        
        // Update document
        await teamRef.doc(docId).update(updateData);
        
        console.log(`[RBAC] ✅ Updated ${data.email || docId}: role="${role}" → roleType="${roleType}"`);
        successCount++;
        
      } catch (error) {
        console.error(`[RBAC] ❌ Error updating ${data.email || docId}:`, error);
        errorCount++;
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('[RBAC] Backfill Summary:');
    console.log(`  ✅ Successfully updated: ${successCount}`);
    console.log(`  ⏭️  Skipped (already had roleType): ${skippedCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📊 Total processed: ${snapshot.size}`);
    console.log('='.repeat(60) + '\n');
    
    // Show role type distribution
    console.log('[RBAC] Role Type Distribution:');
    const roleTypeCounts: Record<string, number> = {};
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const role = data.role || data.position;
      if (role) {
        const roleType = getRoleType(role);
        roleTypeCounts[roleType] = (roleTypeCounts[roleType] || 0) + 1;
      }
    }
    
    Object.entries(roleTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([roleType, count]) => {
        console.log(`  ${roleType}: ${count}`);
      });
    
    console.log();
    
  } catch (error) {
    console.error('[RBAC] Fatal error during backfill:', error);
    process.exit(1);
  }
  
  if (errorCount > 0) {
    console.log('[RBAC] ⚠️  Backfill completed with errors. Please review the logs above.');
    process.exit(1);
  } else {
    console.log('[RBAC] 🎉 Backfill completed successfully!');
    process.exit(0);
  }
}

// Run the backfill
backfillRoleTypes();
