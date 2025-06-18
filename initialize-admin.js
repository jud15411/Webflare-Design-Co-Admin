// This script should be used only once to create the initial admin user
const email = prompt('Enter admin email:');
const password = prompt('Enter admin password:');

// Create admin user
auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
        const user = userCredential.user;
        
        // Create admin role in Firestore
        return db.collection('users').doc(user.uid).set({
            email: user.email,
            role: 'admin',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    })
    .then(() => {
        console.log('Admin user created successfully!');
        alert('Admin user created successfully! You can now log in.');
    })
    .catch((error) => {
        console.error('Error creating admin user:', error);
        alert('Error creating admin user: ' + error.message);
    });
