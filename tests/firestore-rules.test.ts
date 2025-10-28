import { 
  initializeTestEnvironment, 
  assertSucceeds, 
  assertFails,
  RulesTestEnvironment 
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Load the Firestore rules from your firestore.rules file
  const rules = readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8');
  
  try {
    testEnv = await initializeTestEnvironment({
      projectId: 'test-gdgoc-dlsu-hub',
      firestore: {
        rules,
        host: 'localhost',
        port: 8080,
      },
    });
  } catch (error: any) {
    if (error.message?.includes('fetch failed') || error.cause) {
      console.error('\n⚠️  Firestore emulator is not running!');
      console.error('Please start the emulator first:');
      console.error('  npm run emulators\n');
      console.error('Then run tests in another terminal:');
      console.error('  npm test\n');
      throw new Error('Emulator not running - tests cannot proceed');
    }
    throw error;
  }
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Team Collection Security Rules', () => {
  const teamDocPath = 'team/user123';

  describe('CHRO Role Tests', () => {
    it('should allow CHRO to update name, department, and committee', async () => {
      const chroContext = testEnv.authenticatedContext('chro-user', {
        role: 'chro',
        roleType: 'core',
        department: 'hr',
        committee: null,
      });

      // Create initial document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), teamDocPath), {
          id: 'user123',
          email: 'test@example.com',
          role: 'developer',
          roleType: 'technical',
          name: 'Old Name',
          department: 'tech',
          committee: null,
          createdAt: new Date(),
        });
      });

      // CHRO should be able to update allowed fields
      await assertSucceeds(
        updateDoc(doc(chroContext.firestore(), teamDocPath), {
          name: 'New Name',
          department: 'design',
          committee: 'events',
        })
      );
    });

    it('should prevent CHRO from updating role field', async () => {
      const chroContext = testEnv.authenticatedContext('chro-user', {
        role: 'chro',
        roleType: 'core',
        department: 'hr',
        committee: null,
      });

      // Create initial document
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), teamDocPath), {
          id: 'user123',
          email: 'test@example.com',
          role: 'developer',
          roleType: 'technical',
          name: 'Test User',
          department: 'tech',
          committee: null,
          createdAt: new Date(),
        });
      });

      // CHRO should NOT be able to update role
      await assertFails(
        updateDoc(doc(chroContext.firestore(), teamDocPath), {
          name: 'New Name',
          role: 'chapter-lead', // Attempting privilege escalation
        })
      );
    });

    it('should prevent CHRO from updating roleType field', async () => {
      const chroContext = testEnv.authenticatedContext('chro-user', {
        role: 'chro',
        roleType: 'core',
        department: 'hr',
        committee: null,
      });

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), teamDocPath), {
          id: 'user123',
          email: 'test@example.com',
          role: 'developer',
          roleType: 'technical',
          name: 'Test User',
          department: 'tech',
          committee: null,
          createdAt: new Date(),
        });
      });

      await assertFails(
        updateDoc(doc(chroContext.firestore(), teamDocPath), {
          name: 'New Name',
          roleType: 'core', // Attempting privilege escalation
        })
      );
    });

    it('should prevent CHRO from updating email field', async () => {
      const chroContext = testEnv.authenticatedContext('chro-user', {
        role: 'chro',
        roleType: 'core',
        department: 'hr',
        committee: null,
      });

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), teamDocPath), {
          id: 'user123',
          email: 'test@example.com',
          role: 'developer',
          roleType: 'technical',
          name: 'Test User',
          department: 'tech',
          committee: null,
          createdAt: new Date(),
        });
      });

      await assertFails(
        updateDoc(doc(chroContext.firestore(), teamDocPath), {
          name: 'New Name',
          email: 'newemail@example.com', // Should be immutable
        })
      );
    });
  });

  describe('CEO Role Tests', () => {
    it('should allow CEO to update any field including role', async () => {
      const ceoContext = testEnv.authenticatedContext('ceo-user', {
        role: 'chapter-lead',
        roleType: 'core',
        department: 'executive',
        committee: null,
      });

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), teamDocPath), {
          id: 'user123',
          email: 'test@example.com',
          role: 'developer',
          roleType: 'technical',
          name: 'Test User',
          department: 'tech',
          committee: null,
          createdAt: new Date(),
        });
      });

      // CEO should be able to update role
      await assertSucceeds(
        updateDoc(doc(ceoContext.firestore(), teamDocPath), {
          role: 'project-manager',
          roleType: 'technical',
          name: 'Updated Name',
        })
      );
    });
  });

  describe('Regular User Tests', () => {
    it('should allow users to read their own team document', async () => {
      const userContext = testEnv.authenticatedContext('user123', {
        role: 'developer',
        roleType: 'technical',
        department: 'tech',
        committee: null,
      });

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), teamDocPath), {
          id: 'user123',
          email: 'test@example.com',
          role: 'developer',
          roleType: 'technical',
          name: 'Test User',
          department: 'tech',
          committee: null,
          createdAt: new Date(),
        });
      });

      await assertSucceeds(
        getDoc(doc(userContext.firestore(), teamDocPath))
      );
    });

    it('should prevent regular users from updating their own role', async () => {
      const userContext = testEnv.authenticatedContext('user123', {
        role: 'developer',
        roleType: 'technical',
        department: 'tech',
        committee: null,
      });

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), teamDocPath), {
          id: 'user123',
          email: 'test@example.com',
          role: 'developer',
          roleType: 'technical',
          name: 'Test User',
          department: 'tech',
          committee: null,
          createdAt: new Date(),
        });
      });

      await assertFails(
        updateDoc(doc(userContext.firestore(), teamDocPath), {
          role: 'chapter-lead', // Privilege escalation attempt
        })
      );
    });
  });

  describe('Unauthenticated Access Tests', () => {
    it('should prevent unauthenticated read access', async () => {
      const unauthedContext = testEnv.unauthenticatedContext();

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), teamDocPath), {
          id: 'user123',
          email: 'test@example.com',
          role: 'developer',
          roleType: 'technical',
          name: 'Test User',
          department: 'tech',
          committee: null,
          createdAt: new Date(),
        });
      });

      await assertFails(
        getDoc(doc(unauthedContext.firestore(), teamDocPath))
      );
    });
  });
});
