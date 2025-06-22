// Password Change Modal for First-Time Login
const PasswordChangeModal = (() => {
  let modal = null;
  let currentUser = null;
  let userData = null;

  // Initialize the password change modal
  function init() {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        // User is signed in
        currentUser = user;
        
        // Check if password change is required
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists && userDoc.data().requirePasswordChange) {
          userData = userDoc.data();
          showModal();
        }
      }
    });
  }

  // Show the password change modal
  function showModal() {
    if (modal) return; // Prevent multiple modals

    modal = document.createElement('div');
    modal.id = 'password-change-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('role', 'dialog');
    
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-900">Change Your Password</h2>
          <p class="mt-1 text-sm text-gray-600">For security reasons, please change your password.</p>
        </div>
        
        <form id="passwordChangeForm" class="p-6">
          <div class="space-y-4">
            <div>
              <label for="currentPassword" class="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <div class="relative">
                <input 
                  type="password" 
                  id="currentPassword" 
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your current password">
                <button 
                  type="button" 
                  onclick="togglePasswordVisibility('currentPassword', 'toggleCurrentPw')"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center"
                  id="toggleCurrentPw">
                  <i class="far fa-eye text-gray-500 hover:text-gray-700"></i>
                </button>
              </div>
            </div>
            
            <div>
              <label for="newPassword" class="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div class="relative">
                <input 
                  type="password" 
                  id="newPassword" 
                  required
                  minlength="8"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter a new password">
                <button 
                  type="button" 
                  onclick="togglePasswordVisibility('newPassword', 'toggleNewPw')"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center"
                  id="toggleNewPw">
                  <i class="far fa-eye text-gray-500 hover:text-gray-700"></i>
                </button>
              </div>
              <p class="mt-1 text-xs text-gray-500">Must be at least 8 characters long</p>
            </div>
            
            <div>
              <label for="confirmNewPassword" class="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div class="relative">
                <input 
                  type="password" 
                  id="confirmNewPassword" 
                  required
                  minlength="8"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm your new password">
                <button 
                  type="button" 
                  onclick="togglePasswordVisibility('confirmNewPassword', 'toggleConfirmNewPw')"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center"
                  id="toggleConfirmNewPw">
                  <i class="far fa-eye text-gray-500 hover:text-gray-700"></i>
                </button>
              </div>
            </div>
          </div>
          
          <div class="mt-6 flex justify-end space-x-3">
            <button 
              type="submit" 
              class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
              id="submitPasswordChange">
              <span>Update Password</span>
              <span class="ml-2 hidden" id="passwordChangeSpinner">
                <i class="fas fa-spinner fa-spin"></i>
              </span>
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.classList.add('overflow-hidden');
    
    // Add form submission handler
    const form = modal.querySelector('#passwordChangeForm');
    form.addEventListener('submit', handlePasswordChange);
    
    // Focus on the current password field
    const currentPasswordInput = modal.querySelector('#currentPassword');
    if (currentPasswordInput) currentPasswordInput.focus();
  }

  // Handle password change form submission
  async function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    const submitBtn = document.getElementById('submitPasswordChange');
    const spinner = document.getElementById('passwordChangeSpinner');
    
    // Validate form
    if (newPassword !== confirmNewPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    spinner.classList.remove('hidden');
    
    try {
      // Re-authenticate user with their current password
      const credential = firebase.auth.EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      
      await currentUser.reauthenticateWithCredential(credential);
      
      // Update password
      await currentUser.updatePassword(newPassword);
      
      // Update user document to mark password as changed
      const batch = db.batch();
      const userRef = db.collection('users').doc(currentUser.uid);
      const developerRef = db.collection('developers').doc(currentUser.uid);
      
      batch.update(userRef, {
        requirePasswordChange: false,
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      batch.update(developerRef, {
        requiresPasswordChange: false,
        lastPasswordChange: firebase.firestore.FieldValue.serverTimestamp(),
        temporaryPassword: firebase.firestore.FieldValue.delete()
      });
      
      await batch.commit();
      
      // Show success message and close modal
      showToast('Password updated successfully!', 'success');
      closeModal();
      
      // Redirect to dashboard or home page
      window.location.hash = 'dashboard';
      
    } catch (error) {
      console.error('Error changing password:', error);
      let errorMessage = 'Failed to update password';
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect current password';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, 'error');
    } finally {
      // Reset form
      if (submitBtn) {
        submitBtn.disabled = false;
        spinner.classList.add('hidden');
      }
    }
  }
  
  // Close the modal and clean up
  function closeModal() {
    if (modal) {
      document.body.removeChild(modal);
      document.body.classList.remove('overflow-hidden');
      modal = null;
    }
  }
  
  // Toggle password visibility
  window.togglePasswordVisibility = function(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    if (input && button) {
      const icon = button.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    }
  };
  
  // Public API
  return {
    init
  };
})();

// Initialize the password change modal when the script loads
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if we have the required Firebase services
  if (typeof auth !== 'undefined' && typeof db !== 'undefined') {
    PasswordChangeModal.init();
  } else {
    console.warn('Firebase auth or db not available. Password change modal not initialized.');
  }
});
