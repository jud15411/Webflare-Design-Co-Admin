// Firebase configuration from window.env
const firebaseConfig = {
    apiKey: window.env?.FIREBASE_API_KEY,
    authDomain: window.env?.FIREBASE_AUTH_DOMAIN,
    projectId: window.env?.FIREBASE_PROJECT_ID,
    storageBucket: window.env?.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: window.env?.FIREBASE_MESSAGING_SENDER_ID,
    appId: window.env?.FIREBASE_APP_ID
};

console.log('Firebase Config:', JSON.stringify({
    apiKey: firebaseConfig.apiKey ? '***' : 'MISSING',
    authDomain: firebaseConfig.authDomain || 'MISSING',
    projectId: firebaseConfig.projectId || 'MISSING',
    storageBucket: firebaseConfig.storageBucket || 'MISSING',
    messagingSenderId: firebaseConfig.messagingSenderId || 'MISSING',
    appId: firebaseConfig.appId ? '***' : 'MISSING'
}, null, 2));

// Validate Firebase configuration
const validateFirebaseConfig = () => {
    const required = ['apiKey', 'authDomain', 'projectId'];
    const missing = [];
    
    for (const key of required) {
        if (!firebaseConfig[key]) {
            missing.push(key);
        }
    }
    
    if (missing.length > 0) {
        const errorMsg = `Missing required Firebase configuration: ${missing.join(', ')}`;
        console.error(errorMsg);
        if (window.env?.NODE_ENV === 'production') {
            throw new Error(errorMsg);
        }
        return false;
    }
    return true;
};

// Validate the configuration when the script loads
validateFirebaseConfig();

// Initialize Firebase
let app;
let db;
let auth;

try {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    
    // Enable offline persistence
    db.enablePersistence().catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Offline persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.warn('The current browser does not support offline persistence.');
        }
    });
} catch (error) {
    console.error('Firebase initialization error:', error);
    if (error.code === 'app/duplicate-app') {
        // If Firebase was already initialized, use the existing instance
        app = firebase.app();
        db = firebase.firestore();
        auth = firebase.auth();
    } else {
        throw error;
    }
}
