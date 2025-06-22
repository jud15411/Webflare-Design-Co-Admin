const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json'); // Make sure to get this from Firebase Console > Project Settings > Service Accounts

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const userEmail = 'judsonwells100@gmail.com';

async function addAdmin() {
  try {
    // Get the user by email
    const user = await admin.auth().getUserByEmail(userEmail);
    
    // Set admin claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    
    // Update Firestore
    await admin.firestore().collection('users').doc(user.uid).set({
      email: user.email,
      isAdmin: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log(`Success! ${userEmail} is now an admin.`);
    process.exit(0);
  } catch (error) {
    console.error('Error adding admin:', error);
    process.exit(1);
  }
}

addAdmin();
