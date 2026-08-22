require('dotenv').config();
const firebaseAdmin = require('./firebaseAdmin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { generatePassage } = require('./utils/geminiService');

async function runSmokeTests() {
  const results = [];
  
  // 1. Firebase Admin Init
  try {
    if (!firebaseAdmin) {
      throw new Error('firebaseAdmin export is null. Ensure FIREBASE_SERVICE_ACCOUNT or equivalents are set.');
    }
    results.push({ name: 'Firebase Admin Init', passed: true });
  } catch (e) {
    results.push({ name: 'Firebase Admin Init', passed: false, error: e.message });
  }
  
  // 2. Firestore R/W
  try {
    const db = getFirestore();
    const docRef = db.collection('_smoke_tests_').doc('test-doc');
    await docRef.set({ timestamp: Date.now(), test: true });
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      throw new Error('Document was not created properly');
    }
    await docRef.delete();
    results.push({ name: 'Firestore Read/Write', passed: true });
  } catch (e) {
    results.push({ name: 'Firestore Read/Write', passed: false, error: e.message });
  }

  // 3. Auth Token Verify
  try {
    const auth = getAuth();
    if (typeof auth.verifyIdToken !== 'function') {
      throw new Error('verifyIdToken is not a function (modular API mismatch?)');
    }
    
    try {
      await auth.verifyIdToken("invalid-test-token-123");
      throw new Error('Expected verifyIdToken to throw on invalid token, but it succeeded');
    } catch (authErr) {
      // We expect an auth-specific error, not a TypeError
      if (authErr instanceof TypeError || authErr.message.includes('not a function')) {
        throw authErr;
      }
      // If it complains about decoding the token, that means the API call successfully reached the auth logic
    }
    
    results.push({ name: 'Auth Token Verify', passed: true });
  } catch (e) {
    results.push({ name: 'Auth Token Verify', passed: false, error: e.message });
  }

  // 4. Gemini API
  try {
    const text = await generatePassage("Write exactly a 5 word sentence about typing.");
    if (!text || text.trim().length === 0) {
      throw new Error('Received empty response from Gemini');
    }
    results.push({ name: 'Gemini API Generation', passed: true });
  } catch (e) {
    results.push({ name: 'Gemini API Generation', passed: false, error: e.message });
  }

  console.log('\n--- Smoke Test Results ---');
  let allPassed = true;
  results.forEach(r => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | ${r.name}`);
    if (!r.passed) {
      console.log(`          Error: ${r.error}`);
      allPassed = false;
    }
  });
  console.log('--------------------------\n');

  if (!allPassed) {
    process.exitCode = 1;
  }
  
  // Clean up firebase so node can exit gracefully without Windows gRPC assertions
  try {
    if (firebaseAdmin && firebaseAdmin.app()) {
      await firebaseAdmin.app().delete();
    }
  } catch (e) {}
}

runSmokeTests().catch(err => {
  console.error("Unhandled error running smoke tests:", err);
  process.exitCode = 1;
});
