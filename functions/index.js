const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Set admin role for a user - Callable Function
exports.setAdminRole = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  // Check if user is admin
  const callerUid = context.auth.uid;
  const callerUser = await admin.auth().getUser(callerUid);
  
  if (!callerUser.customClaims || !callerUser.customClaims.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can modify admin status'
    );
  }

  const { userId, isAdmin } = data;

  try {
    // Set custom claims
    await admin.auth().setCustomUserClaims(userId, { admin: isAdmin });
    
    // Update Firestore
    await admin.firestore().collection('users').doc(userId).update({
      isAdmin: isAdmin,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Get updated user data to return
    const user = await admin.auth().getUser(userId);
    
    return {
      success: true,
      message: `User ${userId} admin status set to ${isAdmin}`,
      user: {
        uid: user.uid,
        email: user.email,
        customClaims: user.customClaims || {}
      }
    };
  } catch (error) {
    console.error('Error in setAdminRole:', error);
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while updating admin status',
      error.message
    );
  }
});