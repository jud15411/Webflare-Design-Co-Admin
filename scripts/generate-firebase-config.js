const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load environment variables from .env file
const config = `// Auto-generated file - Do not edit directly
window.firebaseConfig = {
  apiKey: "${process.env.VITE_FIREBASE_API_KEY}",
  authDomain: "${process.env.VITE_FIREBASE_AUTH_DOMAIN}",
  projectId: "${process.env.VITE_FIREBASE_PROJECT_ID}",
  storageBucket: "${process.env.VITE_FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${process.env.VITE_FIREBASE_APP_ID}",
  measurementId: "${process.env.VITE_FIREBASE_MEASUREMENT_ID}"
};
`;

// Ensure the public directory exists
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write the config file
fs.writeFileSync(path.join(publicDir, 'firebase-config.js'), config);

console.log('Firebase config generated successfully!');
