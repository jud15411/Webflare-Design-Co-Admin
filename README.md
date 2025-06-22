# 🚀 Webflare Design Co. Admin Panel

A secure admin panel for managing Webflare Design Co. resources, built with Firebase and modern web technologies.

## ✨ Features

- 🔐 Secure authentication with Firebase Auth
- 🔥 Real-time data with Firestore
- 📱 Responsive design for all devices
- ⚡ Optimized for performance
- 🔒 Security best practices
- 📊 Analytics

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm 8+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with Firestore and Authentication enabled
- (Optional) AWS account for S3 storage

### Firebase Configuration

1. Create a `.env.local` file in the root directory with your Firebase configuration:
   ```bash
   cp env.template .env.local
   ```

2. Edit `.env.local` and add your Firebase project details:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

3. The Firebase configuration will be automatically generated in `public/firebase-config.js` during the build process.

### Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. For production build:
   ```bash
   npm run build
   firebase deploy
   ```

### Environment Variables

- The app uses environment variables from `.env.local` (not committed to version control)
- A template file `env.template` is provided as a reference
- The Firebase config is generated during build and served as a static file

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/webflare-admin-panel.git
cd webflare-admin-panel
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
Copy the example environment file and update with your credentials:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Firebase and AWS credentials.

### 4. Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🚀 Production Deployment

### Option 1: Using Deployment Script (Recommended)

1. Make sure you have PowerShell installed
2. Run the deployment script:
   ```powershell
   .\deploy-production.ps1
   ```

### Option 2: Manual Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy to Firebase:
   ```bash
   # Deploy everything
   firebase deploy
   
   # Or deploy specific components
   # firebase deploy --only hosting
   # firebase deploy --only firestore:rules
   # firebase deploy --only functions
   ```

## 🔧 Project Structure

```
.
├── public/               # Static files
├── src/                  # Source files
│   ├── assets/          # Images, fonts, etc.
│   ├── components/      # Reusable UI components
│   ├── config/          # Configuration files
│   ├── firebase/        # Firebase setup and utilities
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   ├── services/        # API and service layers
│   ├── store/           # State management
│   ├── styles/          # Global styles
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── .env.example         # Example environment variables
├── .gitignore           # Git ignore file
├── firebase.json        # Firebase configuration
├── firestore.rules      # Firestore security rules
├── package.json         # Project dependencies and scripts
└── README.md            # This file
```

## 🔒 Security

- All sensitive data is stored in environment variables
- Firestore security rules are strictly enforced
- HTTPS is enforced for all connections
- Security headers are set
- CSRF protection is enabled
- Rate limiting is implemented

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Firebase
- Tailwind CSS
- Vite
- All contributors

## 📝 Notes

- Make sure to set up proper CORS rules if using external APIs
- Regularly update dependencies for security patches
- Monitor Firebase usage and set up billing alerts
- Keep your Firebase service account keys secure and never commit them to version control
     firebase init
     ```
   - Deploy Firebase rules and functions:
     ```bash
     firebase deploy --only firestore:rules,functions
     ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789012
FIREBASE_APP_ID=1:123456789012:web:abc123def456

# AWS Configuration (if needed)
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_BUCKET=your-s3-bucket-name

# Environment
NODE_ENV=development
```

## Security

- Never commit sensitive information to version control
- Always use environment variables for configuration
- Keep your Firebase and AWS credentials secure
- Regularly rotate your API keys and credentials

## License

[Your License Here]
