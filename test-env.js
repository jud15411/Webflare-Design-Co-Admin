// Test script to verify environment variables
console.log('Testing environment configuration...\n');

// Try to load .env file if dotenv is available
try {
    require('dotenv').config({ path: '.env.local' });
    console.log('✅ Loaded .env.local file');
} catch (e) {
    console.log('ℹ️ dotenv not available, using system environment variables');
}

// Check for required environment variables
const requiredVars = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_APP_ID'
];

const optionalVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'AWS_S3_BUCKET',
    'NODE_ENV'
];

console.log('\n=== Required Variables ===');
let allRequiredPresent = true;
requiredVars.forEach(varName => {
    const value = process.env[varName] || '';
    const isPresent = !!value;
    if (!isPresent) allRequiredPresent = false;
    console.log(`${varName}: ${isPresent ? '✅' : '❌'} ${isPresent ? '[set]' : 'MISSING'}`);
});

console.log('\n=== Optional Variables ===');
optionalVars.forEach(varName => {
    const value = process.env[varName] || '';
    const isPresent = !!value;
    console.log(`${varName}: ${isPresent ? '✅' : '⚠️ '} ${isPresent ? '[set]' : 'Not set'}`);
});

console.log('\n=== Test Complete ===');
if (!allRequiredPresent) {
    console.error('❌ Error: Some required environment variables are missing');
    process.exit(1);
} else {
    console.log('✅ All required environment variables are present');}

// Don't log sensitive values in production
if (process.env.NODE_ENV !== 'production') {
    console.log('\n=== Current Environment ===');
    console.log(process.env);
}
