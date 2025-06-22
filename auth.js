// Auth Module
const Auth = (function() {
    // Initialize auth state
    let currentUser = null;
    let authInitialized = false;

    // Initialize Firebase Auth
    async function init() {
        if (authInitialized) return true;
        
        try {
            // Listen for auth state changes
            auth.onAuthStateChanged((user) => {
                if (user) {
                    // User is signed in
                    currentUser = user;
                    console.log('User signed in:', user.email);
                    // You can trigger any UI updates here
                } else {
                    // User is signed out
                    currentUser = null;
                    console.log('User signed out');
                    // Redirect to login or show login UI
                }
            });
            
            authInitialized = true;
            return true;
            
        } catch (error) {
            console.error('Auth initialization error:', error);
            return false;
        }
    }


    // Get current user
    function getCurrentUser() {
        return currentUser;
    }

    // Check if user is authenticated
    function isAuthenticated() {
        return currentUser !== null;
    }

    // Sign in with email and password
    async function signIn(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    // Sign out
    async function signOut() {
        try {
            await auth.signOut();
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }


    return {
        init,
        getCurrentUser,
        isAuthenticated,
        signIn,
        signOut
    };
})();

// Initialize auth when the script loads
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});
