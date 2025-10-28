import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

/**
 * Manual Security Rules Testing Script
 * 
 * This script allows you to test Firestore security rules by attempting
 * various operations with different user roles.
 * 
 * SETUP:
 * 1. Make sure you have test users in Firebase Auth with different roles
 * 2. Update the firebaseConfig below with your project details
 * 3. Set the credentials for the users you want to test
 * 
 * USAGE:
 * npm run script:test-rules
 */

// Your Firebase config (loaded from .env.local)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Validate config is loaded
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Firebase configuration not found!');
  console.error('Please ensure .env.local exists with VITE_FIREBASE_* variables');
  process.exit(1);
}

// Test user credentials - REPLACE WITH YOUR TEST USERS
// Set these via environment variables or hardcode them
const TEST_USERS = {
  chro: {
    email: process.env.TEST_CHRO_EMAIL || 'chro@test.com',
    password: process.env.TEST_CHRO_PASSWORD || 'test-password',
    expectedRole: 'chro',
  },
  ceo: {
    email: process.env.TEST_CEO_EMAIL || 'ceo@test.com',
    password: process.env.TEST_CEO_PASSWORD || 'test-password',
    expectedRole: 'chapter-lead',
  },
  developer: {
    email: process.env.TEST_DEV_EMAIL || 'dev@test.com',
    password: process.env.TEST_DEV_PASSWORD || 'test-password',
    expectedRole: 'developer',
  },
};

// Check if test users are configured
const isConfigured = TEST_USERS.chro.email !== 'chro@test.com' || 
                     process.env.TEST_CHRO_EMAIL;

if (!isConfigured) {
  console.log('\n⚠️  TEST USERS NOT CONFIGURED');
  console.log('\nTo run these tests, you need to:');
  console.log('1. Create test users in Firebase Auth Console');
  console.log('2. Add these to your .env.local file:');
  console.log('');
  console.log('   TEST_CHRO_EMAIL=your-chro@test.com');
  console.log('   TEST_CHRO_PASSWORD=password');
  console.log('   TEST_CEO_EMAIL=your-ceo@test.com');
  console.log('   TEST_CEO_PASSWORD=password');
  console.log('   TEST_DEV_EMAIL=your-dev@test.com');
  console.log('   TEST_DEV_PASSWORD=password');
  console.log('');
  console.log('OR edit scripts/testSecurityRules.ts and hardcode the credentials');
  console.log('\nSkipping tests...\n');
  process.exit(0);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function logResult(test: string, passed: boolean, error?: string, details?: string) {
  results.push({ test, passed, error, details });
  const emoji = passed ? '✅' : '❌';
  console.log(`${emoji} ${test}`);
  if (details) console.log(`   ${details}`);
  if (error) console.log(`   Error: ${error}`);
}

async function testCHROPrivilegeEscalation() {
  console.log('\n🧪 Testing CHRO Privilege Escalation Prevention\n');
  
  try {
    // Sign in as CHRO
    const userCred = await signInWithEmailAndPassword(
      auth,
      TEST_USERS.chro.email,
      TEST_USERS.chro.password
    );
    const userId = userCred.user.uid;
    
    // Get ID token to verify claims
    const token = await userCred.user.getIdToken();
    const decodedToken = JSON.parse(atob(token.split('.')[1]));
    
    console.log('CHRO Custom Claims:', {
      role: decodedToken.role,
      roleType: decodedToken.roleType,
      department: decodedToken.department,
    });

    // Test 1: CHRO should be able to update allowed fields
    try {
      const testDocRef = doc(db, 'team', userId);
      await updateDoc(testDocRef, {
        name: 'Updated Name ' + Date.now(),
        department: 'hr',
        committee: 'events',
      });
      logResult(
        'CHRO can update allowed fields (name, department, committee)',
        true,
        undefined,
        'Successfully updated allowed fields'
      );
    } catch (error: any) {
      logResult(
        'CHRO can update allowed fields (name, department, committee)',
        false,
        error.message
      );
    }

    // Test 2: CHRO should NOT be able to update role field
    try {
      const testDocRef = doc(db, 'team', userId);
      await updateDoc(testDocRef, {
        name: 'Test Name',
        role: 'chapter-lead', // Attempting privilege escalation
      });
      logResult(
        'CHRO CANNOT update role field (privilege escalation)',
        false,
        undefined,
        '⚠️  SECURITY ISSUE: CHRO was able to change role!'
      );
    } catch (error: any) {
      logResult(
        'CHRO CANNOT update role field (privilege escalation)',
        true,
        undefined,
        'Correctly blocked: ' + error.message
      );
    }

    // Test 3: CHRO should NOT be able to update roleType field
    try {
      const testDocRef = doc(db, 'team', userId);
      await updateDoc(testDocRef, {
        name: 'Test Name',
        roleType: 'core', // Attempting privilege escalation
      });
      logResult(
        'CHRO CANNOT update roleType field (privilege escalation)',
        false,
        undefined,
        '⚠️  SECURITY ISSUE: CHRO was able to change roleType!'
      );
    } catch (error: any) {
      logResult(
        'CHRO CANNOT update roleType field (privilege escalation)',
        true,
        undefined,
        'Correctly blocked: ' + error.message
      );
    }

    // Test 4: CHRO should NOT be able to update email field
    try {
      const testDocRef = doc(db, 'team', userId);
      await updateDoc(testDocRef, {
        name: 'Test Name',
        email: 'newemail@test.com',
      });
      logResult(
        'CHRO CANNOT update email field (immutable)',
        false,
        undefined,
        '⚠️  SECURITY ISSUE: CHRO was able to change email!'
      );
    } catch (error: any) {
      logResult(
        'CHRO CANNOT update email field (immutable)',
        true,
        undefined,
        'Correctly blocked: ' + error.message
      );
    }

    await auth.signOut();
  } catch (error: any) {
    logResult('CHRO authentication', false, error.message);
  }
}

async function testCEOPermissions() {
  console.log('\n🧪 Testing CEO/Chapter Lead Permissions\n');
  
  try {
    // Sign in as CEO
    const userCred = await signInWithEmailAndPassword(
      auth,
      TEST_USERS.ceo.email,
      TEST_USERS.ceo.password
    );
    const userId = userCred.user.uid;
    
    // Get ID token to verify claims
    const token = await userCred.user.getIdToken();
    const decodedToken = JSON.parse(atob(token.split('.')[1]));
    
    console.log('CEO Custom Claims:', {
      role: decodedToken.role,
      roleType: decodedToken.roleType,
      department: decodedToken.department,
    });

    // Test 1: CEO should be able to update role fields
    try {
      const testDocRef = doc(db, 'team', userId);
      await updateDoc(testDocRef, {
        name: 'CEO Updated ' + Date.now(),
        role: 'chapter-lead', // Should be allowed
        roleType: 'core',
      });
      logResult(
        'CEO can update role and roleType fields',
        true,
        undefined,
        'CEO has full update permissions'
      );
    } catch (error: any) {
      logResult(
        'CEO can update role and roleType fields',
        false,
        error.message
      );
    }

    await auth.signOut();
  } catch (error: any) {
    logResult('CEO authentication', false, error.message);
  }
}

async function testDeveloperPermissions() {
  console.log('\n🧪 Testing Regular Developer Permissions\n');
  
  try {
    // Sign in as Developer
    const userCred = await signInWithEmailAndPassword(
      auth,
      TEST_USERS.developer.email,
      TEST_USERS.developer.password
    );
    const userId = userCred.user.uid;
    
    // Get ID token to verify claims
    const token = await userCred.user.getIdToken();
    const decodedToken = JSON.parse(atob(token.split('.')[1]));
    
    console.log('Developer Custom Claims:', {
      role: decodedToken.role,
      roleType: decodedToken.roleType,
      department: decodedToken.department,
    });

    // Test 1: Developer should be able to read their own document
    try {
      const testDocRef = doc(db, 'team', userId);
      const docSnap = await getDoc(testDocRef);
      if (docSnap.exists()) {
        logResult(
          'Developer can read their own team document',
          true,
          undefined,
          'Document data retrieved successfully'
        );
      } else {
        logResult(
          'Developer can read their own team document',
          false,
          'Document does not exist'
        );
      }
    } catch (error: any) {
      logResult(
        'Developer can read their own team document',
        false,
        error.message
      );
    }

    // Test 2: Developer should NOT be able to update their role
    try {
      const testDocRef = doc(db, 'team', userId);
      await updateDoc(testDocRef, {
        role: 'chapter-lead', // Privilege escalation attempt
      });
      logResult(
        'Developer CANNOT update their own role',
        false,
        undefined,
        '⚠️  SECURITY ISSUE: Developer was able to change their role!'
      );
    } catch (error: any) {
      logResult(
        'Developer CANNOT update their own role',
        true,
        undefined,
        'Correctly blocked: ' + error.message
      );
    }

    await auth.signOut();
  } catch (error: any) {
    logResult('Developer authentication', false, error.message);
  }
}

async function runAllTests() {
  console.log('🔒 Firebase Security Rules Testing\n');
  console.log('='.repeat(60));
  
  await testCHROPrivilegeEscalation();
  await testCEOPermissions();
  await testDeveloperPermissions();
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n⚠️  FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.test}`);
      if (r.error) console.log(`    Error: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

runAllTests();
