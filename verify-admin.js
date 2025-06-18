// This script helps verify and fix admin role issues

// Get the current user's email
const email = prompt('Enter your admin email:');

// Get the current user
auth.onAuthStateChanged(user => {
    if (user && user.email === email) {
        // Check if user exists in users collection
        db.collection('users').doc(user.uid).get().then(doc => {
            if (!doc.exists) {
                // Create user document with admin role
                db.collection('users').doc(user.uid).set({
                    email: user.email,
                    role: 'admin',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    console.log('Admin user document created successfully');
                    alert('Admin user document created successfully!');
                }).catch(error => {
                    console.error('Error creating admin user document:', error);
                    alert('Error creating admin user document: ' + error.message);
                });
            } else {
                // Check if role is admin
                if (doc.data().role === 'admin') {
                    console.log('User is already admin');
                    alert('User is already admin!');
                } else {
                    // Update role to admin
                    db.collection('users').doc(user.uid).update({
                        role: 'admin'
                    }).then(() => {
                        console.log('Role updated to admin');
                        alert('Role updated to admin successfully!');
                    }).catch(error => {
                        console.error('Error updating role:', error);
                        alert('Error updating role: ' + error.message);
                    });
                }
            }
        });
    } else {
        console.error('No user logged in or email mismatch');
        alert('Please log in with the correct admin account');
    }
});
