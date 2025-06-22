console.log('Loading config.js...');

// Create or extend the global config object
window.config = window.config || {};

// Get configuration from environment variables (for Node.js/Webpack)
const envConfig = typeof process !== 'undefined' && process.env ? process.env : {};

// Default configuration - these values are only used if not provided via environment variables
// or window.config
const defaultConfig = {
    // AWS Configuration
    AWS_REGION: envConfig.AWS_REGION || 'us-east-2',
    AWS_ACCESS_KEY_ID: envConfig.AWS_ACCESS_KEY_ID ,
    AWS_SECRET_ACCESS_KEY: envConfig.AWS_SECRET_ACCESS_KEY ,
    AWS_S3_BUCKET: envConfig.AWS_S3_BUCKET || 'webflare-admin-contracts',
    
    // Firebase Configuration
    FIREBASE_API_KEY: envConfig.VITE_FIREBASE_API_KEY ,
    FIREBASE_AUTH_DOMAIN: envConfig.VITE_FIREBASE_AUTH_DOMAIN ,
    FIREBASE_PROJECT_ID: envConfig.VITE_FIREBASE_PROJECT_ID ,
    FIREBASE_STORAGE_BUCKET: envConfig.VITE_FIREBASE_STORAGE_BUCKET ,
    FIREBASE_MESSAGING_SENDER_ID: envConfig.VITE_FIREBASE_MESSAGING_SENDER_ID ,
    FIREBASE_APP_ID: envConfig.VITE_FIREBASE_APP_ID ,
    
    // Environment
    NODE_ENV: envConfig.NODE_ENV || 'development'
};

// Merge with existing config (window.config takes highest priority, then env vars, then defaults)
const config = {
    ...defaultConfig,
    ...window.config
};

// Validate required configuration
const requiredConfig = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_APP_ID'
];

const missingConfig = requiredConfig.filter(key => !config[key]);
if (missingConfig.length > 0 && config.NODE_ENV !== 'test') {
    console.error('Missing required configuration:', missingConfig);
    if (config.NODE_ENV === 'production') {
        throw new Error(`Missing required configuration: ${missingConfig.join(', ')}`);
    }
}

// Make sure the config is available globally
window.config = config;

// Log configuration status
console.log('Configuration loaded:', {
    hasFirebaseConfig: !!config.FIREBASE_API_KEY,
    hasAwsConfig: !!config.AWS_ACCESS_KEY_ID,
    env: config.NODE_ENV
});

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}

// Make available in browser
if (typeof window !== 'undefined') {
    window.env = config;
}
