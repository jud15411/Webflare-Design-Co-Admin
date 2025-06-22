const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ 
  origin: true,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});

// Set admin role for a user
exports.setAdminRole = functions.https.onRequest(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    cors(req, res, () => {
      res.status(204).send('');
    });
    return;
  }
  
  if (req.method !== 'POST') {
    return cors(req, res, () => {
      res.status(405).json({ error: 'Method Not Allowed' });
    });
  }
  
  // Handle CORS for the main request
  return cors(req, res, async () => {
    try {
      // Verify the request is authenticated
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // For development only - allow any authenticated user to make themselves admin
      // In production, you would want to restrict this to specific users
      const { uid, admin: isAdmin } = req.body;
      
      if (!uid) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      // Set custom claims
      await admin.auth().setCustomUserClaims(uid, { admin: isAdmin });
      
      // Update the user's document in Firestore
      await admin.firestore().collection('users').doc(uid).set(
        { isAdmin: isAdmin },
        { merge: true }
      );
      
      console.log(`Set admin=${isAdmin} for user ${uid}`);
      
      return res.status(200).json({ 
        success: true, 
        message: `Admin ${isAdmin ? 'granted' : 'revoked'} successfully`,
        uid,
        admin: isAdmin
      });
      
    } catch (error) {
      console.error('Error setting admin role:', error);
      return res.status(500).json({ 
        error: 'Failed to set admin role',
        details: error.message 
      });
    }
  });
});

// Function to initialize the first admin user
// This should be called manually after deployment
exports.initializeAdmin = functions.https.onRequest((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    cors(req, res, () => {
      res.status(204).send('');
    });
    return;
  }

  if (req.method !== 'POST') {
    return cors(req, res, () => {
      res.status(405).json({ error: 'Method Not Allowed' });
    });
  }

  // Handle CORS for the main request
  return cors(req, res, async () => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      // Find user by email
      const user = await admin.auth().getUserByEmail(email);
      
      // Set admin claim
      await admin.auth().setCustomUserClaims(user.uid, { admin: true });
      
      // Create/update user document
      await admin.firestore().collection('users').doc(user.uid).set(
        { 
          email: user.email,
          displayName: user.displayName || '',
          isAdmin: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
      
      return res.status(200).json({ 
        success: true, 
        message: `Admin privileges granted to ${email}`,
        uid: user.uid
      });
      
    } catch (error) {
      console.error('Error initializing admin:', error);
      if (error.code === 'auth/user-not-found') {
        return res.status(404).json({ 
          error: 'User not found',
          details: `No user found with email: ${req.body.email}`
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to initialize admin',
        details: error.message 
      });
    }
  });
});
