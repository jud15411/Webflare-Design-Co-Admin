// Contracts Module
console.log('contracts.js: Module loading...');

// Create global Contracts object if it doesn't exist
if (typeof window.Contracts === 'undefined') {
    window.Contracts = {
        __initialized: false,
        __error: null,
        __initializing: false,
        init: function() {
            return Promise.reject(new Error('Contracts module not properly loaded'));
        },
        loadContractsSection: function() {
            return Promise.reject(new Error('Contracts module not properly loaded'));
        }
    };
}

// Self-executing function to create the module
(function() {
    'use strict';
    
    console.log('Initializing Contracts module...');
    
    // Check if already initialized or initializing
    if (window.Contracts && (window.Contracts.__initialized || window.Contracts.__initializing)) {
        console.log('Contracts module already initialized or initializing');
        return;
    }
    
    // Module state
    let db = null;
    let auth = null;
    let initialized = false;
  
  // Initialize Firebase
  function initializeFirebase() {
    return new Promise((resolve, reject) => {
      try {
        console.log('Initializing Firebase...');
        
        if (typeof firebase === 'undefined' || !firebase.app) {
          throw new Error('Firebase SDK not loaded');
        }
        
        // Check if Firebase is already initialized
        if (firebase.apps.length > 0) {
          console.log('Firebase already initialized, using existing instance');
          db = firebase.firestore();
          auth = firebase.auth();
          initialized = true;
          return resolve();
        }
        
        // Initialize Firebase if not already initialized
        try {
          console.log('Initializing Firebase with config:', window.firebaseConfig ? 'config exists' : 'no config found');
          
          // Get config from window or use the one passed in
          const config = window.firebaseConfig || firebaseConfig;
          
          if (!config) {
            throw new Error('Firebase configuration not found');
          }
          
          // Initialize Firebase
          firebase.initializeApp(config);
          
          // Initialize services
          db = firebase.firestore();
          auth = firebase.auth();
          
          // Enable offline persistence
          db.enablePersistence({ synchronizeTabs: true })
            .catch(err => {
              if (err.code === 'failed-precondition') {
                console.warn('Offline persistence can only be enabled in one tab at a time.');
              } else if (err.code === 'unimplemented') {
                console.warn('The current browser does not support all of the features required to enable offline persistence');
              }
            });
            
          initialized = true;
          console.log('Firebase initialized successfully');
          resolve();
        } catch (error) {
          console.error('Error initializing Firebase:', error);
          reject(new Error('Failed to initialize Firebase: ' + (error.message || 'Unknown error')));
        }
      } catch (error) {
        console.error('Firebase initialization error:', error);
        reject(new Error('Firebase SDK not available: ' + (error.message || 'Unknown error')));
      }
    });
  }
  
  // Initialize function to be called after Firebase is ready
  async function init() {
    console.log('Contracts.init() called');
    
    if (initialized) {
      console.log('Contracts module already initialized');
      return true;
    }
    
    try {
      await initializeFirebase();
      
      if (!window.AWSUtils) {
        console.warn('[Contracts] AWSUtils not found. File upload features will be disabled.');
      }
      
      console.log('Contracts module initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Contracts module:', error);
      throw error;
    }
  }

  // DOM Helpers
  function qs(selector, scope = document) {
    return scope.querySelector(selector);
  }
  
  function qsa(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
  }

  // Show toast notification
  function showToast(message, type = 'info', duration = 3000) {
    try {
      const colors = { 
        info: 'bg-blue-500', 
        success: 'bg-green-600', 
        error: 'bg-red-600', 
        warning: 'bg-yellow-500' 
      };
      
      const icons = {
        info: 'info-circle',
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle'
      };
      
      const toast = document.createElement('div');
      toast.className = `fixed bottom-4 right-4 z-50 px-4 py-2 rounded shadow text-white ${
        colors[type] || colors.info
      } opacity-0 transition-opacity duration-300 flex items-center`;
      
      toast.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'} mr-2"></i>
        <span>${message}</span>
      `;
      
      document.body.appendChild(toast);
      
      // Animate in
      requestAnimationFrame(() => toast.classList.remove('opacity-0'));
      
      // Auto-dismiss
      if (duration > 0) {
        setTimeout(() => {
          toast.classList.add('opacity-0');
          setTimeout(() => {
            if (toast && toast.parentNode) {
              toast.parentNode.removeChild(toast);
            }
          }, 300);
        }, duration);
      }
      
      return toast;
    } catch (error) {
      console.error('Error showing toast:', error);
      return null;
    }
  }
  
  // Load and filter contracts
  async function loadAndFilterContracts() {
    try {
      if (!db) await init();
      
      console.log('Loading contracts from Firestore...');
      const contractsRef = db.collection('contracts');
      const snapshot = await contractsRef.get();
      
      if (snapshot.empty) {
        console.log('No contracts found in Firestore');
        return [];
      }
      
      const contracts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Loaded ${contracts.length} contracts:`, contracts);
      return contracts;
    } catch (error) {
      console.error('Error loading contracts:', error);
      showToast('Failed to load contracts', 'error');
      throw error;
    }
  }
  
  // Create contract card with modern design
  function createContractCard(contract) {
    console.log('Creating card for contract:', contract);
    if (!contract) {
      console.error('No contract data provided');
      return '';
    }
    
    // Extract contract data with defaults and handle different possible field names
    const { 
      id, 
      title = contract.name || contract.contractName || 'Untitled Contract', 
      status = 'draft', 
      clientName = 'No Client',
      amount = 0,
      createdAt, 
      updatedAt,
      // Add other contract fields as needed
    } = contract;
    
    console.log(`Contract ${id} title resolved as:`, title); // Debug log
    
    // Format date properly
    let formattedDate = 'No date';
    try {
      const dateToFormat = updatedAt || createdAt || new Date();
      let dateObj;
      
      // Handle Firestore Timestamp
      if (dateToFormat && typeof dateToFormat.toDate === 'function') {
        dateObj = dateToFormat.toDate();
      } 
      // Handle string dates
      else if (typeof dateToFormat === 'string') {
        dateObj = new Date(dateToFormat);
      } 
      // Handle timestamp numbers
      else if (typeof dateToFormat === 'number') {
        dateObj = new Date(dateToFormat);
      }
      // Handle Date objects
      else if (dateToFormat instanceof Date) {
        dateObj = dateToFormat;
      }
      
      if (dateObj && !isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      formattedDate = 'Invalid date';
    }
    
    // Format amount as currency if it exists
    const formattedAmount = amount !== undefined && amount !== null 
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
      : 'N/A';
    
    // Normalize status to lowercase for case-insensitive comparison
    const normalizedStatus = status ? status.toString().toLowerCase().trim() : 'draft';
    
    // Get status color and icon
    const statusConfig = {
      active: { 
        bg: 'bg-green-50', 
        text: 'text-green-700', 
        border: 'border-green-200',
        icon: 'check-circle',
        label: 'Active'
      },
      pending: { 
        bg: 'bg-blue-50', 
        text: 'text-blue-700', 
        border: 'border-blue-200',
        icon: 'clock',
        label: 'Pending'
      },
      draft: { 
        bg: 'bg-yellow-50', 
        text: 'text-yellow-700', 
        border: 'border-yellow-200',
        icon: 'file-edit',
        label: 'Draft'
      },
      expired: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        icon: 'calendar-times',
        label: 'Expired'
      },
      signed: {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        icon: 'file-signature',
        label: 'Signed'
      }
    };
    
    const statusInfo = statusConfig[normalizedStatus] || { 
      bg: 'bg-gray-50', 
      text: 'text-gray-700', 
      border: 'border-gray-200',
      icon: 'file-alt',
      label: normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)
    };
    
    return `
      <div class="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden h-full flex flex-col">
        <div class="p-5 flex-1 flex flex-col">
          <!-- Header with status -->
          <div class="flex justify-between items-start">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border} border">
              <i class="fas fa-${statusInfo.icon} mr-1.5"></i>
              ${statusInfo.label}
            </span>
            <div class="text-xs text-gray-500">
              #${id.substring(0, 6)}...
            </div>
          </div>
          
          <!-- Contract title -->
          <h3 class="mt-3 text-lg font-semibold text-gray-900 line-clamp-2">${title}</h3>
          
          <!-- Client info -->
          <div class="mt-2 flex items-center text-sm text-gray-600">
            <i class="far fa-user mr-2 text-gray-400"></i>
            <span class="truncate">${clientName}</span>
          </div>
          
          <!-- Contract amount -->
          ${formattedAmount !== 'N/A' ? `
          <div class="mt-2 flex items-center text-sm font-medium text-gray-900">
            <i class="far fa-dollar-sign mr-2 text-gray-400"></i>
            <span>${formattedAmount}</span>
          </div>
          ` : ''}
          
          <!-- Date and time -->
          <div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <div class="flex items-center">
              <i class="far fa-calendar-alt mr-2"></i>
              <span>${formattedDate}</span>
            </div>
          </div>
          
          <!-- Spacer to push actions to bottom -->
          <div class="flex-1"></div>
          
          <!-- Action buttons -->
          <div class="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div class="flex space-x-2">
              <button class="inline-flex items-center px-3 py-1.5 border border-gray-200 rounded-full text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors view-contract" data-id="${id}" title="View details">
                <i class="far fa-eye mr-1.5"></i> View
              </button>
              <button class="inline-flex items-center px-3 py-1.5 border border-gray-200 rounded-full text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors edit-contract" data-id="${id}" title="Edit contract">
                <i class="far fa-edit mr-1.5"></i> Edit
              </button>
            </div>
            <button class="inline-flex items-center p-1.5 text-gray-400 hover:text-red-500 transition-colors delete-contract" data-id="${id}" title="Delete contract">
              <i class="far fa-trash-alt"></i>
            </button>
          </div>
        </div>
        </div>
      </div>
    `;
  }
  
  // Setup event listeners
  function setupEventListeners() {
    // View contract
    document.addEventListener('click', function(e) {
      const viewBtn = e.target.closest('.view-contract');
      const editBtn = e.target.closest('.edit-contract');
      const deleteBtn = e.target.closest('.delete-contract');
      
      if (viewBtn) {
        e.preventDefault();
        e.stopPropagation();
        const contractId = viewBtn.dataset.id;
        if (contractId) viewContract(contractId);
        return;
      }
      
      if (editBtn) {
        e.preventDefault();
        e.stopPropagation();
        const contractId = editBtn.dataset.id;
        if (contractId) showEditContractModal(contractId);
        return;
      }
      
      if (deleteBtn) {
        e.preventDefault();
        e.stopPropagation();
        const contractId = deleteBtn.dataset.id;
        if (contractId) showDeleteConfirmation(contractId);
        return;
      }
    });
    
    // Upload contract button
    const uploadBtn = document.getElementById('uploadContractBtn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', showUploadContractModal);
    }
    
    // Upload contract button in empty state
    const uploadFirstBtn = document.getElementById('uploadFirstContractBtn');
    if (uploadFirstBtn) {
      uploadFirstBtn.addEventListener('click', showUploadContractModal);
    }
    
    // Cancel upload button
    const cancelUploadBtn = document.getElementById('cancel-upload-contract-btn');
    if (cancelUploadBtn) {
      cancelUploadBtn.addEventListener('click', closeUploadModal);
    }
    
    // Submit contract form
    const uploadForm = document.getElementById('upload-contract-form');
    if (uploadForm) {
      uploadForm.addEventListener('submit', handleContractUpload);
    }
    
    // Handle drag and drop for file upload
    const dropZone = document.querySelector('.border-dashed');
    if (dropZone) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
      });
      
      ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
      });
      
      ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
      });
      
      dropZone.addEventListener('drop', handleDrop, false);
    }
  }
  
  // Prevent default drag behaviors
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  // Highlight drop zone when dragging over it
  function highlight() {
    const dropZone = document.querySelector('.border-dashed');
    if (dropZone) dropZone.classList.add('border-blue-500', 'bg-blue-50');
  }
  
  // Remove highlight when leaving drop zone
  function unhighlight() {
    const dropZone = document.querySelector('.border-dashed');
    if (dropZone) dropZone.classList.remove('border-blue-500', 'bg-blue-50');
  }
  
  // Handle dropped files
  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    const fileInput = document.getElementById('contract-file');
    if (fileInput && files.length > 0) {
      fileInput.files = files;
      const fileNameDisplay = document.getElementById('file-name');
      if (fileNameDisplay) fileNameDisplay.textContent = files[0].name;
    }
  }
  
  // Close the upload modal
  function closeUploadModal() {
    const modal = document.getElementById('upload-contract-modal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
  }
  
  // Handle edit contract form submission
  async function handleEditContract(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const contractId = formData.get('id');
    
    if (!contractId) {
      showToast('Invalid contract ID', 'error');
      return;
    }
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
    
    try {
      if (!db) await init();
      
      const updates = {
        title: formData.get('title'),
        clientName: formData.get('clientName'),
        status: formData.get('status'),
        amount: parseFloat(formData.get('amount')) || 0,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: firebase.auth().currentUser?.uid || 'system'
      };
      
      // Update the contract in Firestore
      await db.collection('contracts').doc(contractId).update(updates);
      
      showToast('Contract updated successfully', 'success');
      
      // Close the modal
      const modal = document.getElementById('edit-contract-modal');
      if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }
      
      // Refresh the contracts list
      if (typeof publicAPI.loadContractsSection === 'function') {
        await publicAPI.loadContractsSection();
      }
      
    } catch (error) {
      console.error('Error updating contract:', error);
      showToast('Failed to update contract: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  }
  
  // Handle contract form submission
  async function handleContractUpload(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const submitBtn = document.getElementById('submit-contract-btn');
    const submitText = document.getElementById('submit-contract-text');
    const submitLoading = document.getElementById('submit-contract-loading');
    
    try {
      // Validate form
      const title = formData.get('title');
      const clientName = formData.get('clientName');
      const clientEmail = formData.get('clientEmail');
      const status = formData.get('status');
      const fileInput = document.getElementById('contract-file');
      const file = fileInput.files[0];
      
      if (!title || !clientName || !clientEmail || !status || !file) {
        showToast('Please fill in all required fields', 'error');
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientEmail)) {
        showToast('Please enter a valid email address', 'error');
        return;
      }
      
      // Validate file type
      const validFileTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (!validFileTypes.includes(file.type)) {
        showToast('Invalid file type. Please upload a PDF, DOC, DOCX, XLS, or XLSX file.', 'error');
        return;
      }
      
      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        showToast('File is too large. Maximum size is 10MB.', 'error');
        return;
      }
      
      // Show loading state
      submitBtn.disabled = true;
      submitText.textContent = 'Uploading...';
      submitLoading.classList.remove('hidden');
      
      // Upload file to Firebase Storage
      const storageRef = firebase.storage().ref();
      const fileExt = file.name.split('.').pop();
      const fileName = `contracts/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const fileRef = storageRef.child(fileName);
      
      // Upload the file
      const uploadTask = fileRef.put(file);
      
      // Wait for upload to complete
      const uploadSnapshot = await uploadTask;
      
      // Get the download URL
      const downloadURL = await uploadSnapshot.ref.getDownloadURL();
      
      // Get or create client
      const clientData = await getOrCreateClient(clientName, clientEmail);
      
      // Prepare contract data
      const contractData = {
        title: formData.get('title'),
        clientId: clientData.id,
        clientName: clientData.name,
        clientEmail: clientData.email,
        status: formData.get('status'),
        amount: formData.get('amount') ? parseFloat(formData.get('amount')) : null,
        startDate: formData.get('startDate') ? new Date(formData.get('startDate')) : null,
        endDate: formData.get('endDate') ? new Date(formData.get('endDate')) : null,
        fileUrl: downloadURL,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        notes: formData.get('notes') || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: firebase.auth().currentUser?.uid || 'system',
        updatedBy: firebase.auth().currentUser?.uid || 'system'
      };
      
      // Save contract data to Firestore
      await db.collection('contracts').add(contractData);
      
      // Show success message
      showToast('Contract uploaded successfully', 'success');
      
      // Close the modal
      closeUploadModal();
      
      // Refresh the contracts list
      if (typeof publicAPI.loadContractsSection === 'function') {
        await publicAPI.loadContractsSection();
      }
      
    } catch (error) {
      console.error('Error uploading contract:', error);
      showToast('Failed to upload contract. Please try again.', 'error');
    } finally {
      // Reset button state
      if (submitBtn) submitBtn.disabled = false;
      if (submitText) submitText.textContent = 'Upload Contract';
      if (submitLoading) submitLoading.classList.add('hidden');
    }
  }
  
  // View contract details
  async function viewContract(contractId) {
    try {
      if (!db) await init();
      
      const doc = await db.collection('contracts').doc(contractId).get();
      if (!doc.exists) {
        throw new Error('Contract not found');
      }
      
      const contract = { id: doc.id, ...doc.data() };
      showContractDetails(contract);
    } catch (error) {
      console.error('Error viewing contract:', error);
      showToast('Failed to load contract details', 'error');
    }
  }
  
  // Show contract details modal
  function showContractDetails(contract) {
    console.log('Showing contract details:', contract);
    
    // Format dates
    const formatDate = (dateValue) => {
      if (!dateValue) return 'Not specified';
      
      let dateObj;
      if (dateValue.toDate) {
        dateObj = dateValue.toDate();
      } else if (dateValue instanceof Date) {
        dateObj = dateValue;
      } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        dateObj = new Date(dateValue);
      } else {
        return 'Invalid date';
      }
      
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    
    // Format amount as currency
    const formatCurrency = (amount) => {
      if (amount === undefined || amount === null) return 'Not specified';
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD' 
      }).format(amount);
    };
    
    // Set status badge styles
    const statusConfig = {
      active: { 
        bg: 'bg-green-100', 
        text: 'text-green-800',
        icon: 'check-circle',
        iconColor: 'text-green-500'
      },
      pending: { 
        bg: 'bg-blue-100', 
        text: 'text-blue-800',
        icon: 'clock',
        iconColor: 'text-blue-500'
      },
      draft: { 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-800',
        icon: 'file-edit',
        iconColor: 'text-yellow-500'
      },
      expired: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: 'calendar-times',
        iconColor: 'text-red-500'
      },
      signed: {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        icon: 'file-signature',
        iconColor: 'text-purple-500'
      }
    };
    
    const normalizedStatus = contract.status ? contract.status.toLowerCase() : 'draft';
    const status = statusConfig[normalizedStatus] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      icon: 'file-alt',
      iconColor: 'text-gray-500',
      label: normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)
    };
    
    // Update modal content
    document.getElementById('contract-details-title-text').textContent = contract.title || 'Untitled Contract';
    
    // Status badge
    const statusBadge = document.getElementById('contract-status-badge');
    statusBadge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`;
    statusBadge.innerHTML = `
      <i class="fas fa-${status.icon} mr-1.5 ${status.iconColor}"></i>
      <span>${status.label || status.text}</span>
    `;
    
    // Contract ID and dates
    document.getElementById('contract-id').textContent = `#${contract.id.substring(0, 8).toUpperCase()}`;
    document.getElementById('contract-dates').innerHTML = `
      Created: ${formatDate(contract.createdAt)}<br>
      ${contract.updatedAt ? `Updated: ${formatDate(contract.updatedAt)}` : ''}
    `;
    
    // Client info
    document.getElementById('contract-client-info').innerHTML = `
      <div class="font-medium text-gray-900">${contract.clientName || 'No client'}</div>
      ${contract.clientEmail ? `
        <div class="text-sm text-gray-500 mt-1">
          <i class="far fa-envelope mr-1"></i>
          <a href="mailto:${contract.clientEmail}" class="text-blue-600 hover:underline">
            ${contract.clientEmail}
          </a>
        </div>` : ''}
      ${contract.clientPhone ? `
        <div class="text-sm text-gray-500 mt-1">
          <i class="fas fa-phone-alt mr-1"></i>
          <a href="tel:${contract.clientPhone}" class="text-blue-600 hover:underline">
            ${contract.clientPhone}
          </a>
        </div>` : ''}
    `;
    
    // Contract details
    document.getElementById('contract-amount').textContent = formatCurrency(contract.amount);
    document.getElementById('contract-start-date').textContent = formatDate(contract.startDate);
    document.getElementById('contract-end-date').textContent = formatDate(contract.endDate) || 'Not specified';
    document.getElementById('contract-description').textContent = contract.description || 'No description provided';
    document.getElementById('contract-terms').textContent = contract.terms || 'No terms specified';
    
    // File link
    const fileLink = document.getElementById('contract-file-link');
    if (contract.fileUrl) {
      fileLink.innerHTML = `
        <a href="${contract.fileUrl}" target="_blank" class="inline-flex items-center text-blue-600 hover:underline">
          <i class="far fa-file-pdf mr-1.5"></i>
          View Contract PDF
        </a>
      `;
      
      // Set up download button
      const downloadBtn = document.getElementById('download-contract-btn');
      downloadBtn.onclick = () => window.open(contract.fileUrl, '_blank');
      downloadBtn.classList.remove('hidden');
    } else {
      fileLink.textContent = 'No file attached';
      document.getElementById('download-contract-btn').classList.add('hidden');
    }
    
    // Timeline
    const timeline = document.getElementById('contract-timeline');
    timeline.innerHTML = '';
    
    // Add timeline items
    const timelineItems = [];
    
    // Created
    if (contract.createdAt) {
      timelineItems.push({
        icon: 'file-contract',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        title: 'Contract Created',
        date: contract.createdAt,
        description: 'Contract was created and saved to the system.'
      });
    }
    
    // Updated
    if (contract.updatedAt && contract.updatedAt !== contract.createdAt) {
      timelineItems.push({
        icon: 'edit',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
        title: 'Contract Updated',
        date: contract.updatedAt,
        description: 'Contract details were updated.'
      });
    }
    
    // Start date
    if (contract.startDate) {
      timelineItems.push({
        icon: 'calendar-alt',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        title: 'Contract Started',
        date: contract.startDate,
        description: 'Contract start date was reached.'
      });
    }
    
    // End date
    if (contract.endDate) {
      const isExpired = new Date(contract.endDate) < new Date();
      timelineItems.push({
        icon: isExpired ? 'calendar-times' : 'calendar-check',
        iconBg: isExpired ? 'bg-red-100' : 'bg-green-100',
        iconColor: isExpired ? 'text-red-600' : 'text-green-600',
        title: isExpired ? 'Contract Expired' : 'Contract End Date',
        date: contract.endDate,
        description: isExpired 
          ? 'Contract has expired.' 
          : 'Contract will expire on this date.'
      });
    }
    
    // Sort timeline by date
    timelineItems.sort((a, b) => {
      const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
      return dateA - dateB;
    });
    
    // Add timeline items to DOM
    timelineItems.forEach(item => {
      const timelineItem = document.createElement('li');
      timelineItem.className = 'relative pb-4';
      timelineItem.innerHTML = `
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <div class="h-8 w-8 rounded-full ${item.iconBg} flex items-center justify-center">
              <i class="fas fa-${item.icon} text-sm ${item.iconColor}"></i>
            </div>
          </div>
          <div class="ml-4">
            <h4 class="text-sm font-medium text-gray-900">${item.title}</h4>
            <p class="text-sm text-gray-500">${formatDate(item.date)}</p>
            <p class="mt-1 text-sm text-gray-500">${item.description}</p>
          </div>
        </div>
      `;
      timeline.appendChild(timelineItem);
    });
    
    // Show the modal
    const modal = document.getElementById('contract-details-modal');
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    
    // Add close handlers
    const closeModal = () => {
      modal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    };
    
    // Close when clicking outside content
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
    
    // Close with Escape key
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
    
    // Add hide function to public API
    window.Contracts = window.Contracts || {};
    window.Contracts.hideContractDetails = closeModal;
  }
  
  // Show delete confirmation modal
  function showDeleteConfirmation(contractId) {
    const modal = document.getElementById('delete-confirm-modal');
    const step1 = document.getElementById('delete-step-1');
    const step2 = document.getElementById('delete-step-2');
    const loadingSpinner = document.getElementById('delete-loading-spinner');
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const cancelBtn = document.getElementById('cancel-delete-btn');
    const finalDeleteBtn = document.getElementById('final-delete-btn');
    const backBtn = document.getElementById('back-to-step-1');
    const confirmInput = document.getElementById('delete-confirmation-input');
    const errorMessage = document.getElementById('delete-error-message');
    
    let currentContractId = contractId;
    let isDeleting = false;
    
    // Reset modal state
    function resetModal() {
      step1.classList.remove('hidden');
      step2.classList.add('hidden');
      if (loadingSpinner) loadingSpinner.classList.add('hidden');
      if (confirmInput) confirmInput.value = '';
      if (errorMessage) errorMessage.classList.add('hidden');
      if (finalDeleteBtn) {
        finalDeleteBtn.disabled = true;
        finalDeleteBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }
      isDeleting = false;
    }
    
    // Show modal
    function showModal() {
      // Stop event propagation to prevent immediate closing
      const modalContent = modal.querySelector('div[class*="align-bottom"]');
      if (modalContent) {
        modalContent.addEventListener('click', (e) => e.stopPropagation());
      }
      
      modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      resetModal();
    }
    
    // Close modal
    function closeModal() {
      if (isDeleting) return; // Prevent closing while deleting
      modal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
    
    // Initialize modal
    showModal();
    
    // Step 1: Initial confirmation
    confirmBtn.onclick = () => {
      step1.classList.add('hidden');
      step2.classList.remove('hidden');
      confirmInput.focus();
    };
    
    // Back to step 1
    backBtn.onclick = () => {
      step2.classList.add('hidden');
      step1.classList.remove('hidden');
    };
    
    // Cancel button
    cancelBtn.onclick = closeModal;
    
    // Handle DELETE confirmation input
    function handleInput() {
      const value = confirmInput.value.trim();
      if (value === 'DELETE') {
        finalDeleteBtn.disabled = false;
        finalDeleteBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        errorMessage.classList.add('hidden');
      } else {
        finalDeleteBtn.disabled = true;
        finalDeleteBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }
    }
    
    // Handle Enter key in confirmation input
    function handleKeyDown(e) {
      if (e.key === 'Enter' && confirmInput.value.trim() === 'DELETE') {
        handleDelete();
      }
    }
    
    confirmInput.addEventListener('input', handleInput);
    confirmInput.addEventListener('keydown', handleKeyDown);
    
    // Handle final delete
    async function handleDelete() {
      if (isDeleting) return;
      
      if (confirmInput.value.trim() !== 'DELETE') {
        errorMessage.classList.remove('hidden');
        return;
      }
      
      isDeleting = true;
      
      // Show loading state
      finalDeleteBtn.disabled = true;
      loadingSpinner.classList.remove('hidden');
      
      try {
        await deleteContract(currentContractId);
        closeModal();
      } catch (error) {
        console.error('Error deleting contract:', error);
        showToast('Failed to delete contract', 'error');
        // Don't close on error, allow retry
        finalDeleteBtn.disabled = false;
        loadingSpinner.classList.add('hidden');
      } finally {
        isDeleting = false;
      }
    }
    
    finalDeleteBtn.onclick = handleDelete;
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal && !isDeleting) {
        closeModal();
      }
    });
    
    // Close with Escape key
    function handleEsc(event) {
      if (event.key === 'Escape' && !isDeleting) {
        closeModal();
        document.removeEventListener('keydown', handleEsc);
      }
    }
    document.addEventListener('keydown', handleEsc);
  }
  
  // Delete contract
  async function deleteContract(contractId) {
    try {
      if (!db) await init();
      
      await db.collection('contracts').doc(contractId).delete();
      showToast('Contract deleted successfully', 'success');
      
      // Refresh the contracts list
      if (typeof publicAPI.loadContractsSection === 'function') {
        publicAPI.loadContractsSection();
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting contract:', error);
      throw error; // Re-throw to be caught by the caller
    }
  }
  
  // Show edit contract modal
  async function showEditContractModal(contractId) {
    try {
      if (!db) await init();
      
      // Get the contract data
      const doc = await db.collection('contracts').doc(contractId).get();
      if (!doc.exists) {
        showToast('Contract not found', 'error');
        return;
      }
      
      const contract = { id: doc.id, ...doc.data() };
      console.log('Editing contract:', contract);
      
      // Create the modal HTML if it doesn't exist
      let modal = document.getElementById('edit-contract-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'edit-contract-modal';
        modal.className = 'fixed z-50 inset-0 overflow-y-auto hidden';
        modal.setAttribute('aria-labelledby', 'edit-contract-title');
        modal.setAttribute('aria-modal', 'true');
        modal.role = 'dialog';
        
        modal.innerHTML = `
          <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div class="absolute top-0 right-0 pt-4 pr-4">
                <button type="button" class="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none close-edit-modal">
                  <span class="sr-only">Close</span>
                  <i class="fas fa-times"></i>
                </button>
              </div>
              <div>
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 class="text-lg leading-6 font-medium text-gray-900" id="edit-contract-title">
                    Edit Contract
                  </h3>
                  <div class="mt-5">
                    <form id="edit-contract-form">
                      <input type="hidden" id="edit-contract-id" name="id">
                      <div class="mb-4">
                        <label for="edit-contract-title" class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input type="text" id="edit-contract-title" name="title" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                      </div>
                      <div class="mb-4">
                        <label for="edit-contract-client" class="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                        <input type="text" id="edit-contract-client" name="clientName" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                      </div>
                      <div class="mb-4">
                        <label for="edit-contract-status" class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select id="edit-contract-status" name="status" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                          <option value="draft">Draft</option>
                          <option value="active">Active</option>
                          <option value="pending">Pending</option>
                          <option value="expired">Expired</option>
                          <option value="signed">Signed</option>
                        </select>
                      </div>
                      <div class="mb-4">
                        <label for="edit-contract-amount" class="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                        <input type="number" step="0.01" id="edit-contract-amount" name="amount" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                      </div>
                      <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                        <button type="submit" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm">
                          Save Changes
                        </button>
                        <button type="button" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm close-edit-modal">
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        
        // Add event listeners for the modal
        modal.querySelectorAll('.close-edit-modal').forEach(btn => {
          btn.addEventListener('click', () => {
            modal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
          });
        });
        
        // Handle form submission
        const form = modal.querySelector('#edit-contract-form');
        form.addEventListener('submit', handleEditContract);
      }
      
      // Populate the form with contract data
      document.getElementById('edit-contract-id').value = contract.id;
      document.getElementById('edit-contract-title').value = contract.title || contract.name || contract.contractName || '';
      document.getElementById('edit-contract-client').value = contract.clientName || '';
      document.getElementById('edit-contract-status').value = contract.status || 'draft';
      document.getElementById('edit-contract-amount').value = contract.amount || 0;
      
      // Show the modal
      modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      
      // Focus on the first input field
      const firstInput = modal.querySelector('input, select');
      if (firstInput) firstInput.focus();
      
    } catch (error) {
      console.error('Error showing edit modal:', error);
      showToast('Failed to load contract for editing', 'error');
    }
  }
  
  // Show upload contract modal
  async function showUploadContractModal() {
    try {
      // Initialize Firebase if needed
      if (!db) await init();
      
      // Reset form
      const form = document.getElementById('upload-contract-form');
      if (form) form.reset();
      
      // Reset file name display
      const fileNameDisplay = document.getElementById('file-name');
      if (fileNameDisplay) fileNameDisplay.textContent = '';
      
      // Show the modal
      const modal = document.getElementById('upload-contract-modal');
      if (modal) {
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
        
        // Focus on the first input field
        const firstInput = modal.querySelector('input, select');
        if (firstInput) firstInput.focus();
      }
      
      // Set up file input change handler
      const fileInput = document.getElementById('contract-file');
      if (fileInput) {
        fileInput.onchange = function(e) {
          const fileName = e.target.files[0]?.name || '';
          const fileNameDisplay = document.getElementById('file-name');
          if (fileNameDisplay) fileNameDisplay.textContent = fileName;
        };
      }
      
    } catch (error) {
      console.error('Error showing upload contract modal:', error);
      showToast('Failed to load upload form', 'error');
    }
  }
  
  // Create or get client by email
  async function getOrCreateClient(clientName, clientEmail) {
    try {
      if (!clientName || !clientEmail) {
        throw new Error('Client name and email are required');
      }
      
      // Check if client with this email already exists
      const clientsRef = db.collection('clients');
      const querySnapshot = await clientsRef.where('email', '==', clientEmail.trim().toLowerCase()).limit(1).get();
      
      let clientId;
      let clientData;
      
      if (!querySnapshot.empty) {
        // Client exists, return existing client
        const doc = querySnapshot.docs[0];
        clientId = doc.id;
        clientData = { id: clientId, ...doc.data() };
      } else {
        // Create new client
        const newClient = {
          name: clientName.trim(),
          email: clientEmail.trim().toLowerCase(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdBy: firebase.auth().currentUser?.uid || 'system',
          updatedBy: firebase.auth().currentUser?.uid || 'system'
        };
        
        const docRef = await clientsRef.add(newClient);
        clientId = docRef.id;
        clientData = { id: clientId, ...newClient };
        
        console.log('New client created:', clientId, clientData);
      }
      
      return clientData;
      
    } catch (error) {
      console.error('Error getting/creating client:', error);
      throw new Error('Failed to process client information');
    }
  }

  // Public API
  const publicAPI = {
    __initialized: false,
    __error: null,
    
    // Initialize the module
    init: async function() {
      try {
        await init();
        this.__initialized = true;
        this.__error = null;
        return true;
      } catch (error) {
        this.__error = error;
        console.error('Contracts.init() failed:', error);
        throw error;
      }
    },
    
    // Load the contracts section with modern UI
    loadContractsSection: async function() {
      try {
        if (!initialized) {
          await this.init();
        }
        
        const main = document.getElementById('main-content');
        if (!main) {
          throw new Error('Could not find main content element');
        }
        
        // Show loading state with skeleton loader
        main.innerHTML = `
          <div class="py-8 px-4 sm:px-6 lg:px-8">
            <div class="animate-pulse space-y-8">
              <!-- Header Skeleton -->
              <div class="space-y-4">
                <div class="h-8 bg-gray-200 rounded w-1/3"></div>
                <div class="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
              
              <!-- Stats Grid Skeleton -->
              <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                ${Array(4).fill(`
                  <div class="bg-white overflow-hidden shadow rounded-lg">
                    <div class="p-5">
                      <div class="flex items-center">
                        <div class="flex-shrink-0 h-12 w-12 rounded-full bg-gray-200"></div>
                        <div class="ml-5 w-0 flex-1">
                          <div class="text-sm font-medium text-gray-500 truncate">Loading...</div>
                          <div class="h-4 bg-gray-200 rounded w-3/4 mt-1"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
              
              <!-- Table Skeleton -->
              <div class="bg-white shadow overflow-hidden sm:rounded-lg">
                <div class="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <div class="h-6 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div class="bg-white divide-y divide-gray-200">
                  ${Array(5).fill(`
                    <div class="px-4 py-4 sm:px-6">
                      <div class="flex items-center justify-between">
                        <div class="flex-1 min-w-0">
                          <div class="h-5 bg-gray-200 rounded w-1/2"></div>
                          <div class="mt-1 h-4 bg-gray-200 rounded w-3/4"></div>
                        </div>
                        <div class="ml-4 flex-shrink-0 flex items-center space-x-4">
                          <div class="h-8 w-20 bg-gray-200 rounded-full"></div>
                          <div class="h-8 w-8 bg-gray-200 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>`;
        
        // Load contracts data
        const contracts = await loadAndFilterContracts();
        
        // Calculate stats
        const totalContracts = contracts.length;
        const activeContracts = contracts.filter(c => c.status === 'active').length;
        const pendingContracts = contracts.filter(c => c.status === 'pending').length;
        const draftContracts = contracts.filter(c => c.status === 'draft').length;
        
        // Format currency
        const formatCurrency = (amount) => {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(amount || 0);
        };
        
        // Calculate total contract value
        const totalValue = contracts.reduce((sum, contract) => sum + (parseFloat(contract.amount) || 0), 0);
        
        // Render modern UI
        main.innerHTML = `
          <div class="py-8 px-4 sm:px-6 lg:px-8">
            <!-- Header -->
            <div class="mb-8">
              <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                <div class="mb-4 md:mb-0">
                  <h1 class="text-2xl font-bold text-gray-900">Contracts</h1>
                  <p class="mt-1 text-sm text-gray-500">Manage all your contracts in one place</p>
                </div>
                <div class="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                  <div class="relative rounded-md shadow-sm">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i class="far fa-search text-gray-400"></i>
                    </div>
                    <input 
                      type="text" 
                      id="search-contracts" 
                      class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150" 
                      placeholder="Search contracts..."
                    >
                  </div>
                  <button 
                    id="uploadContractBtn" 
                    class="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                  >
                    <i class="fas fa-plus mr-2"></i>
                    New Contract
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Stats Grid -->
            <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <!-- Total Contracts -->
              <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="p-5">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 bg-blue-500 rounded-md p-3">
                      <i class="fas fa-file-contract text-white text-xl"></i>
                    </div>
                    <div class="ml-5 w-0 flex-1">
                      <dl>
                        <dt class="text-sm font-medium text-gray-500 truncate">Total Contracts</dt>
                        <dd class="flex items-baseline">
                          <div class="text-2xl font-semibold text-gray-900">${totalContracts}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Active Contracts -->
              <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="p-5">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 bg-green-500 rounded-md p-3">
                      <i class="fas fa-check-circle text-white text-xl"></i>
                    </div>
                    <div class="ml-5 w-0 flex-1">
                      <dl>
                        <dt class="text-sm font-medium text-gray-500 truncate">Active</dt>
                        <dd class="flex items-baseline">
                          <div class="text-2xl font-semibold text-gray-900">${activeContracts}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Pending Contracts -->
              <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="p-5">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                      <i class="fas fa-clock text-white text-xl"></i>
                    </div>
                    <div class="ml-5 w-0 flex-1">
                      <dl>
                        <dt class="text-sm font-medium text-gray-500 truncate">Pending</dt>
                        <dd class="flex items-baseline">
                          <div class="text-2xl font-semibold text-gray-900">${pendingContracts}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Total Value -->
              <div class="bg-white overflow-hidden shadow rounded-lg">
                <div class="p-5">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 bg-purple-500 rounded-md p-3">
                      <i class="fas fa-dollar-sign text-white text-xl"></i>
                    </div>
                    <div class="ml-5 w-0 flex-1">
                      <dl>
                        <dt class="text-sm font-medium text-gray-500 truncate">Total Value</dt>
                        <dd class="flex items-baseline">
                          <div class="text-2xl font-semibold text-gray-900">${formatCurrency(totalValue)}</div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Contracts Table -->
            <div class="bg-white shadow overflow-hidden sm:rounded-lg">
              <div class="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
                <h3 class="text-lg leading-6 font-medium text-gray-900">Recent Contracts</h3>
                <div class="flex space-x-2">
                  <div class="inline-flex rounded-md shadow-sm" role="group">
                    <button type="button" class="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-l-lg hover:bg-gray-50 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      All
                    </button>
                    <button type="button" class="px-3 py-2 text-xs font-medium text-gray-700 bg-white border-t border-b border-r border-gray-200 hover:bg-gray-50 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      Active
                    </button>
                    <button type="button" class="px-3 py-2 text-xs font-medium text-gray-700 bg-white border-t border-b border-gray-200 hover:bg-gray-50 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      Pending
                    </button>
                    <button type="button" class="px-3 py-2 text-xs font-medium text-gray-700 bg-white border-t border-b border-r border-gray-200 rounded-r-md hover:bg-gray-50 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      Draft
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Contracts List -->
              ${contracts.length > 0 
                ? `
                  <div id="contracts-list" class="divide-y divide-gray-200">
                    ${contracts.map(contract => createContractCard(contract)).join('')}
                  </div>
                `
                : `
                  <div class="text-center py-12 px-4">
                    <i class="fas fa-file-contract text-5xl text-gray-300 mb-4"></i>
                    <h3 class="mt-2 text-lg font-medium text-gray-900">No contracts found</h3>
                    <p class="mt-1 text-sm text-gray-500">Get started by creating a new contract.</p>
                    <div class="mt-6">
                      <button id="uploadFirstContractBtn" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <i class="fas fa-plus mr-2"></i>
                        New Contract
                      </button>
                    </div>
                  </div>
                `
              }
            </div>
          </div>`;
        
        // Setup event listeners
        setupEventListeners();
        
        // Add click handler for the upload button in the empty state
        const uploadFirstBtn = document.getElementById('uploadFirstContractBtn');
        if (uploadFirstBtn) {
          uploadFirstBtn.addEventListener('click', showUploadContractModal);
        }
        
        return true;
      } catch (error) {
        console.error('Error in loadContractsSection:', error);
        const main = document.getElementById('main-content');
        if (main) {
          main.innerHTML = `
            <div class="p-6 text-center text-red-600">
              <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
              <h3 class="text-lg font-medium">Failed to load contracts</h3>
              <p class="mt-2 text-sm text-gray-600">${error.message || 'An error occurred while loading contracts'}</p>
              <button onclick="window.location.reload()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Try Again
              </button>
            </div>`;
        }
        throw error;
      }
    },
    
    // Show toast notification
    showToast
  };
  
  // Assign the public API to the global Contracts object
  console.log('Contracts module loaded, assigning public API');
  Object.assign(window.Contracts, publicAPI);
  
  // Auto-initialize if window.Contracts.init is called directly
  if (typeof window.Contracts.init === 'function') {
    window.Contracts.init().catch(error => {
      console.error('Auto-initialization failed:', error);
      window.Contracts.__error = error;
    });
  }
  
  console.log('Contracts module setup complete');
  return window.Contracts;
})();

// Handle module exports for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.Contracts;
} else if (typeof define === 'function' && define.amd) {
  define([], function() { return window.Contracts; });
}
