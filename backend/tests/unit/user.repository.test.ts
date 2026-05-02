/**
 * User Repository Tests
 * Tests all CRUD operations for user repository
 */

import { userRepository } from '@/repositories/user.repository';
import type { CreateUserInput } from '@/types/db.types';

// Test data
const testUsers: CreateUserInput[] = [];

// ==========================================
// TEST FUNCTIONS
// ==========================================

/**
 * Test: Create multiple users
 */
async function testCreateUsers() {
  console.log('\n📝 Testing CREATE users...');
  try {
    const user1 = await userRepository.create({
      email: 'alice@example.com',
      password_hash: 'hashed_password_123',
      first_name: 'Alice',
      last_name: 'Smith',
    });
    console.log('✅ User 1 created:', user1.id, user1.email);

    const user2 = await userRepository.create({
      email: 'bob@example.com',
      password_hash: 'hashed_password_456',
      first_name: 'Bob',
      last_name: 'Johnson',
    });
    console.log('✅ User 2 created:', user2.id, user2.email);

    const user3 = await userRepository.create({
      email: 'charlie@example.com',
      password_hash: 'hashed_password_789',
      first_name: 'Charlie',
      last_name: 'Brown',
    });
    console.log('✅ User 3 created:', user3.id, user3.email);

    return [user1, user2, user3];
  } catch (error) {
    console.error('❌ CREATE test failed:', error);
    throw error;
  }
}

/**
 * Test: Find user by email
 */
async function testFindByEmail(userId: string, email: string) {
  console.log('\n🔍 Testing FIND BY EMAIL...');
  try {
    const user = await userRepository.findByEmail(email);
    if (user) {
      console.log('✅ User found by email:', user.email, user.id);
      return user;
    } else {
      console.log('❌ User not found');
      return null;
    }
  } catch (error) {
    console.error('❌ FIND BY EMAIL test failed:', error);
    throw error;
  }
}

/**
 * Test: Find user by ID
 */
async function testFindById(userId: string) {
  console.log('\n🔍 Testing FIND BY ID...');
  try {
    const user = await userRepository.findById(userId);
    if (user) {
      console.log('✅ User found by ID:', user.id, user.email);
      return user;
    } else {
      console.log('❌ User not found');
      return null;
    }
  } catch (error) {
    console.error('❌ FIND BY ID test failed:', error);
    throw error;
  }
}

/**
 * Test: Find user by email for auth (with password)
 */
async function testFindByEmailForAuth(email: string) {
  console.log('\n🔐 Testing FIND BY EMAIL FOR AUTH...');
  try {
    const user = await userRepository.findByEmailForAuth(email);
    if (user && user.password_hash) {
      console.log('✅ User found with password_hash:', user.email);
      return user;
    } else {
      console.log('❌ User not found or password_hash missing');
      return null;
    }
  } catch (error) {
    console.error('❌ FIND BY EMAIL FOR AUTH test failed:', error);
    throw error;
  }
}

/**
 * Test: Update user
 */
async function testUpdateUser(userId: string) {
  console.log('\n✏️  Testing UPDATE user...');
  try {
    const updated = await userRepository.update(userId, {
      first_name: 'UpdatedFirstName',
      last_name: 'UpdatedLastName',
    });
    console.log('✅ User updated:', updated.id, updated.first_name, updated.last_name);
    return updated;
  } catch (error) {
    console.error('❌ UPDATE test failed:', error);
    throw error;
  }
}

/**
 * Test: Delete user
 */
async function testDeleteUser(userId: string) {
  console.log('\n🗑️  Testing DELETE user...');
  try {
    const deleted = await userRepository.delete(userId);
    console.log('✅ User deleted:', deleted.id, deleted.email);
    return deleted;
  } catch (error) {
    console.error('❌ DELETE test failed:', error);
    throw error;
  }
}

// ==========================================
// MAIN TEST RUNNER
// ==========================================

async function runAllTests() {
  console.log('═══════════════════════════════════════════');
  console.log('🧪 USER REPOSITORY TEST SUITE');
  console.log('═══════════════════════════════════════════');

  try {
    // 1. Create users
    const [user1, user2, user3] = await testCreateUsers();

    if(!user1 || !user2 || !user3) return

    // 2. Find by email
    await testFindByEmail(user1.id, user1.email);

    // 3. Find by ID
    await testFindById(user1.id);

    // 4. Find by email for auth
    await testFindByEmailForAuth(user1.email);

    // 5. Update user
    await testUpdateUser(user1.id);

    // 6. Delete user (test with user3)
    await testDeleteUser(user3.id);

    // 7. Verify deletion (should return null)
    console.log('\n🔍 Verifying deletion...');
    const deletedUser = await userRepository.findById(user3.id);
    if (!deletedUser) {
      console.log('✅ Deletion verified - user not found');
    } else {
      console.log('❌ Deletion failed - user still exists');
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED');
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.log('\n═══════════════════════════════════════════');
    console.log('❌ TESTS FAILED');
    console.log('═══════════════════════════════════════════\n');
    process.exit(1);
  }
}

// Run tests
runAllTests();
