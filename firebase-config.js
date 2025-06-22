console.log('Loading firebase-config.js...');

// Get configuration from multiple possible sources
const getConfig = () => {
    // Try to get config from window.env (browser)
    if (typeof window !== 'undefined' && window.env) {
        return window.env;
    }
    // Try to get from window.config (legacy)
    if (typeof window !== 'undefined' && window.config) {
        console.warn('Using window.config is deprecated. Please use window.env instead.');
        return window.config;
    }
    // Try to get from process.env (Node.js/Webpack)
    if (typeof process !== 'undefined' && process.env) {
        return process.env;
    }
    
    console.error('No configuration source found');
    return {};
};

const configSource = getConfig();

// Set default Firebase configuration
const firebaseConfig = {
    apiKey: configSource.FIREBASE_API_KEY || '',
    authDomain: configSource.FIREBASE_AUTH_DOMAIN || '',
    projectId: configSource.FIREBASE_PROJECT_ID || '',
    storageBucket: configSource.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: configSource.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: configSource.FIREBASE_APP_ID || '',
    // Optional: Add measurementId if using Google Analytics
    measurementId: configSource.FIREBASE_MEASUREMENT_ID || ''
};

// Validate required fields
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (missingFields.length > 0) {
    const errorMsg = `Missing required Firebase configuration fields: ${missingFields.join(', ')}`;
    console.error(errorMsg);
    console.error('Current config:', JSON.stringify(firebaseConfig, null, 2));
    throw new Error(errorMsg);
}

// Log configuration status (without sensitive data)
console.log('Firebase Configuration Status:', {
    hasApiKey: !!firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain || 'MISSING',
    projectId: firebaseConfig.projectId || 'MISSING',
    storageBucket: firebaseConfig.storageBucket || 'MISSING',
    hasMessagingSenderId: !!firebaseConfig.messagingSenderId,
    hasAppId: !!firebaseConfig.appId
});

// Make firebaseConfig available globally
window.firebaseConfig = firebaseConfig;

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

// Make sure firebase is loaded
if (typeof firebase !== 'undefined') {
    try {
        // Initialize Firebase
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
        
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization error:', error);
        if (error.code === 'app/duplicate-app') {
            // If Firebase was already initialized, use the existing instance
            console.log('Using existing Firebase app instance');
            app = firebase.app();
            db = firebase.firestore();
            auth = firebase.auth();
        } else {
            console.error('Failed to initialize Firebase:', error);
            throw error;
        }
    }
} else {
    console.error('Firebase SDK not loaded');
}

// Export Firebase services
window.firebase = firebase;
window.db = db;
window.auth = auth;
