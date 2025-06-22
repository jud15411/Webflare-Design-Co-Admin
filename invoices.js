// Invoices Module
console.log('=== Invoices Module: Starting load ===');

// Create global Invoices object if it doesn't exist
if (typeof window.Invoices === 'undefined') {
    window.Invoices = {};
}

const Invoices = (function() {
    'use strict';
    
    console.log('Invoices module initializing...');
    
    // Private variables
    let db;
    let auth;
    let initialized = false;
    let invoices = [];
    let eventListeners = { addItem: null };
    
    // DOM Helpers
    const qs = (s, el = document) => el && el.querySelector(s);
    const qsa = (s, el = document) => el ? Array.from(el.querySelectorAll(s)) : [];
    
    // Format date
    function formatDate(dateString) {
        if (!dateString) return '';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    }
    
    // Format currency
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    }
    
    // Get status badge HTML
    function getStatusBadge(status) {
        const statusMap = {
            'paid': { class: 'bg-green-100 text-green-800', text: 'Paid' },
            'pending': { class: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
            'overdue': { class: 'bg-red-100 text-red-800', text: 'Overdue' },
            'draft': { class: 'bg-gray-100 text-gray-800', text: 'Draft' }
        };
        
        const statusInfo = statusMap[status.toLowerCase()] || { class: 'bg-gray-100 text-gray-800', text: status };
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.class}">
            ${statusInfo.text}
        </span>`;
    }
    
    // Initialize Firebase
    async function initializeFirebase() {
        console.log('Invoices: Initializing Firebase...');
        
        if (initialized) {
            console.log('Invoices: Firebase already initialized');
            return true;
        }
        
        try {
            if (typeof firebase === 'undefined' || !firebase.app()) {
                throw new Error('Firebase not initialized');
            }
            
            db = firebase.firestore();
            auth = firebase.auth();
            initialized = true;
            console.log('Invoices: Firebase initialized successfully');
            return true;
        } catch (error) {
            console.error('Invoices: Failed to initialize Firebase:', error);
            throw error;
        }
    }
    
    // Load invoices from Firestore
    async function loadInvoices(filters = {}) {
        try {
            console.log('Loading invoices...');
            const invoicesRef = db.collection('invoices');
            let query = invoicesRef;
            
            // Apply filters if any
            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }
            
            const snapshot = await query.get();
            invoices = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`Loaded ${invoices.length} invoices`);
            renderInvoices();
            return invoices;
            
        } catch (error) {
            console.error('Error loading invoices:', error);
            throw error;
        }
    }
    
    // Render invoices to the page with modern UI
    function renderInvoices(invoicesToRender = null) {
        const container = document.getElementById('invoices-container');
        if (!container) {
            console.error('Invoices container not found');
            return;
        }
        
        const invoicesList = invoicesToRender || invoices;
        
        if (invoicesList.length === 0) {
            container.innerHTML = `
                <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
                    <div class="mx-auto w-24 h-24 text-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 class="mt-4 text-2xl font-bold text-gray-900">No invoices yet</h3>
                    <p class="mt-2 text-gray-600 max-w-md mx-auto">Get started by creating your first invoice. It's quick and easy!</p>
                    <div class="mt-6">
                        <button type="button" 
                                onclick="window.Invoices.showNewInvoiceModal()" 
                                class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:-translate-y-0.5">
                            <svg class="-ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                            </svg>
                            Create New Invoice
                        </button>
                    </div>
                </div>`;
            return;
        }
        
        // Header with stats and action button
        let html = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                <div class="md:flex md:items-center md:justify-between mb-8">
                    <div class="flex-1 min-w-0">
                        <h2 class="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">Invoices</h2>
                        <div class="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
                            <div class="mt-2 flex items-center text-sm text-gray-500">
                                <svg class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                                </svg>
                                ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </div>
                            <div class="mt-2 flex items-center text-sm text-gray-500">
                                <svg class="flex-shrink-0 mr-1.5 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                </svg>
                                ${invoicesList.filter(i => i.status === 'paid').length} paid
                            </div>
                            <div class="mt-2 flex items-center text-sm text-gray-500">
                                <svg class="flex-shrink-0 mr-1.5 h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                                </svg>
                                ${invoicesList.filter(i => i.status === 'pending').length} pending
                            </div>
                        </div>
                    </div>
                    <div class="mt-4 flex md:mt-0 md:ml-4
                        <button type="button" 
                                onclick="window.Invoices.showNewInvoiceModal()" 
                                class="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:-translate-y-0.5">
                            <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                            </svg>
                            New Invoice
                        </button>
                    </div>
                </div>
                
                <!-- Invoice cards grid -->
                <div class="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        `;
        
        // Invoice cards
        invoicesList.forEach(invoice => {
            const statusColors = {
                paid: 'bg-green-100 text-green-800',
                pending: 'bg-yellow-100 text-yellow-800',
                overdue: 'bg-red-100 text-red-800',
                draft: 'bg-gray-100 text-gray-800'
            };
            
            const statusIcons = {
                paid: 'text-green-500',
                pending: 'text-yellow-500',
                overdue: 'text-red-500',
                draft: 'text-gray-500'
            };
            
            const status = (invoice.status || 'draft').toLowerCase();
            const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
            const isOverdue = status === 'pending' && dueDate && dueDate < new Date();
            const displayStatus = isOverdue ? 'overdue' : status;
            
            // Format dates
            const issueDate = invoice.invoiceDate ? formatDate(invoice.invoiceDate) : 'N/A';
            const dueDateFormatted = dueDate ? formatDate(invoice.dueDate) : 'N/A';
            
            // Calculate days remaining or overdue
            let daysInfo = '';
            if (dueDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const diffTime = dueDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0) {
                    daysInfo = 'Due today';
                } else if (diffDays < 0) {
                    daysInfo = `${Math.abs(diffDays)} days overdue`;
                } else {
                    daysInfo = `Due in ${diffDays} days`;
                }
            }
            
            html += `
                <div class="bg-white overflow-hidden shadow rounded-lg transition-all duration-200 hover:shadow-lg">
                    <div class="p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-lg leading-6 font-medium text-gray-900">
                                    #${invoice.invoiceNumber || 'N/A'}
                                </h3>
                                <p class="text-sm text-gray-500">${issueDate}</p>
                            </div>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[displayStatus] || 'bg-gray-100 text-gray-800'}">
                                ${displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                            </span>
                        </div>
                        
                        <div class="mt-3">
                            ${invoice.clientName || invoice.client?.name ? `
                                <p class="text-sm font-medium text-gray-900">
                                    ${invoice.clientName || invoice.client.name}
                                </p>
                            ` : '<p class="text-sm text-gray-500 italic">No client name</p>'}
                            ${(invoice.clientEmail || invoice.client?.email) ? `
                                <p class="text-sm text-gray-500">
                                    ${invoice.clientEmail || invoice.client.email}
                                </p>
                            ` : ''}
                            ${(invoice.clientPhone || invoice.client?.phone) ? `
                                <p class="text-sm text-gray-500">
                                    ${invoice.clientPhone || invoice.client.phone}
                                </p>
                            ` : ''}
                        </div>
                        
                        <div class="mt-4 pt-4 border-t border-gray-100">
                            <div class="flex items-center justify-between">
                                <div class="text-2xl font-bold text-gray-900">
                                    ${formatCurrency(invoice.total || 0)}
                                </div>
                                <div class="text-right">
                                    <div class="text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}">
                                        ${dueDateFormatted}
                                    </div>
                                    <div class="text-xs ${isOverdue ? 'text-red-500' : 'text-gray-500'}">
                                        ${daysInfo}
                                    </div>
                                </div>
                            </div>
                            
                            ${invoice.notes ? `
                                <div class="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                    <p class="truncate">${invoice.notes}</p>
                                </div>
                            ` : ''}
                            
                            <div class="mt-4 flex space-x-2">
                                <button type="button" 
                                        onclick="window.Invoices.showNewInvoiceModal('${invoice.id}')" 
                                        class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                    <svg class="-ml-0.5 mr-1.5 h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                    Edit
                                </button>
                                <button type="button" 
                                        onclick="window.Invoices.printInvoice('${invoice.id}')" 
                                        class="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                    <svg class="-ml-0.5 mr-1.5 h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Print
                                </button>
                                <button type="button" 
                                        onclick="window.Invoices.deleteInvoice('${invoice.id}', '${(invoice.invoiceNumber || '').replace(/'/g, "\\'")}')" 
                                        class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                                    <svg class="-ml-0.5 mr-1.5 h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
        });
        
        // Close grid and container
        html += `
                </div>
            </div>`;
            
        container.innerHTML = html;
    }
    
    // Add new invoice item
    function addNewInvoiceItem(itemData = {}) {
        console.log('Add new invoice item');
        const container = document.getElementById('invoice-items-container');
        if (!container) return;
        
        const itemId = Date.now();
        const quantity = itemData.quantity || 1;
        const rate = itemData.rate || 0;
        const amount = quantity * rate;
        
        const itemHtml = `
            <div class="invoice-item grid grid-cols-12 gap-4 mb-4" data-item-id="${itemId}">
                <div class="col-span-5">
                    <input type="text" name="itemDescription_${itemId}" 
                           class="item-description w-full px-3 py-2 border rounded" 
                           placeholder="Item description"
                           value="${itemData.description || ''}">
                </div>
                <div class="col-span-2">
                    <div class="relative rounded-md shadow-sm">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span class="text-gray-500 sm:text-sm">Qty</span>
                        </div>
                        <input type="number" name="itemQuantity_${itemId}" 
                               class="item-quantity block w-full pl-12 pr-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                               placeholder="1" min="1" value="${quantity}">
                    </div>
                </div>
                <div class="col-span-2">
                    <div class="relative rounded-md shadow-sm">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span class="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input type="number" step="0.01" name="itemRate_${itemId}" 
                               class="item-rate block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                               placeholder="0.00" min="0" value="${rate}">
                    </div>
                </div>
                <div class="col-span-2">
                    <input type="text" name="itemAmount_${itemId}" 
                           class="item-amount w-full px-3 py-2 border rounded bg-gray-50" 
                           placeholder="0.00" readonly
                           value="${amount.toFixed(2)}">
                </div>
                <div class="col-span-1 flex items-center justify-end">
                    <button type="button" class="remove-item text-red-500 hover:text-red-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', itemHtml);
        updateInvoiceTotal();
    }
    
    // Update invoice total
    function updateInvoiceTotal() {
        const items = document.querySelectorAll('.invoice-item');
        let subtotal = 0;
        
        items.forEach(item => {
            const quantity = parseFloat(item.querySelector('.item-quantity')?.value) || 0;
            const rate = parseFloat(item.querySelector('.item-rate')?.value) || 0;
            const amount = quantity * rate;
            
            const amountInput = item.querySelector('.item-amount');
            if (amountInput) {
                amountInput.value = amount.toFixed(2);
            }
            
            subtotal += amount;
        });
        
        const tax = 0; // Tax is set to 0 by default
        const total = subtotal + tax;
        
        const subtotalEl = document.getElementById('invoice-subtotal');
        const taxEl = document.getElementById('invoice-tax');
        const totalEl = document.getElementById('invoice-total');
        
        if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
        if (taxEl) taxEl.textContent = formatCurrency(tax);
        if (totalEl) totalEl.textContent = formatCurrency(total);
        
        // Return values for form submission
        return { subtotal, tax, total };
    }
    
    // Show new invoice modal
    function showNewInvoiceModal(invoiceId = null) {
        console.log('Show new invoice modal', { invoiceId });
        const modal = document.getElementById('new-invoice-modal');
        if (!modal) return;
        
        const form = modal.querySelector('form');
        if (!form) return;
        
        // Reset form and set mode
        form.reset();
        form.dataset.mode = invoiceId ? 'edit' : 'create';
        form.dataset.invoiceId = invoiceId || '';
        
        // Set modal title
        const modalTitle = modal.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = invoiceId ? 'Edit Invoice' : 'New Invoice';
        }
        
        // Clear existing items
        const itemsContainer = document.getElementById('invoice-items-container');
        if (itemsContainer) {
            itemsContainer.innerHTML = '';
            
            if (invoiceId) {
                // Load existing invoice data
                const invoice = invoices.find(i => i.id === invoiceId);
                if (invoice) {
                    // Populate form fields
                    const fields = [
                        { name: 'clientName', value: invoice.clientName || invoice.client?.name },
                        { name: 'clientEmail', value: invoice.clientEmail || invoice.client?.email },
                        { name: 'clientAddress', value: invoice.clientAddress || invoice.client?.address },
                        { name: 'invoiceDate', value: invoice.invoiceDate },
                        { name: 'dueDate', value: invoice.dueDate },
                        { name: 'notes', value: invoice.notes }
                    ];
                    
                    fields.forEach(({ name, value }) => {
                        const input = form.querySelector(`[name="${name}"]`);
                        if (input && value) {
                            input.value = value;
                        }
                    });
                    
                    // Set status if it exists
                    const statusSelect = form.querySelector('select[name="status"]');
                    if (statusSelect && invoice.status) {
                        statusSelect.value = invoice.status;
                    }
                    
                    // Add invoice items
                    if (Array.isArray(invoice.items)) {
                        invoice.items.forEach(item => {
                            addNewInvoiceItem(item);
                        });
                    }
                }
            } else {
                // Add one empty item for new invoice
                addNewInvoiceItem();
                
                // Set default due date (30 days from now)
                const dueDateInput = form.querySelector('input[name="dueDate"]');
                if (dueDateInput) {
                    const today = new Date();
                    const dueDate = new Date(today);
                    dueDate.setDate(today.getDate() + 30);
                    dueDateInput.valueAsDate = dueDate;
                }
            }
        }
        
        // Show the modal
        modal.classList.remove('hidden');
    }
    
    // Hide new invoice modal
    function hideNewInvoiceModal() {
        console.log('Hide new invoice modal');
        const modal = document.getElementById('new-invoice-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    // Handle new invoice form submission
    async function handleNewInvoiceSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        
        // Get all invoice items
        const items = [];
        document.querySelectorAll('.invoice-item').forEach((item) => {
            const description = item.querySelector('.item-description').value;
            const quantity = parseFloat(item.querySelector('.item-quantity').value) || 0;
            const rate = parseFloat(item.querySelector('.item-rate').value) || 0;
            const amount = quantity * rate;
            
            if (description) {
                items.push({
                    description,
                    quantity,
                    rate,
                    amount
                });
            }
        });
        
        if (items.length === 0) {
            alert('Please add at least one invoice item');
            return;
        }
        
        // Calculate totals
        const { subtotal, tax, total } = updateInvoiceTotal();
        
        // Get form mode (create or edit)
        const isEditMode = form.dataset.mode === 'edit';
        const invoiceId = form.dataset.invoiceId;
        
        // Create/Update invoice data
        const invoiceData = {
            clientName: formData.get('clientName') || 'Unnamed Client',
            clientEmail: formData.get('clientEmail') || '',
            clientAddress: formData.get('clientAddress') || '',
            invoiceDate: formData.get('invoiceDate') || new Date().toISOString(),
            dueDate: formData.get('dueDate') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: formData.get('status') || 'draft',
            items,
            subtotal,
            tax,
            total,
            notes: formData.get('notes') || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // For new invoices, add creation timestamp and invoice number
        if (!isEditMode) {
            invoiceData.invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
            invoiceData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        
        try {
            let docRef;
            
            if (isEditMode && invoiceId) {
                // Update existing invoice
                await db.collection('invoices').doc(invoiceId).update(invoiceData);
                docRef = { id: invoiceId };
                console.log('Invoice updated with ID: ', invoiceId);
            } else {
                // Create new invoice
                docRef = await db.collection('invoices').add(invoiceData);
                console.log('Invoice created with ID: ', docRef.id);
            }
            
            // Close modal and refresh the invoices list
            hideNewInvoiceModal();
            await loadInvoices();
            
            // Show success message
            showAlert(
                isEditMode ? 'Invoice updated successfully!' : 'Invoice created successfully!',
                'success'
            );
            
        } catch (error) {
            console.error(`Error ${isEditMode ? 'updating' : 'creating'} invoice:`, error);
            showAlert(
                `Failed to ${isEditMode ? 'update' : 'create'} invoice. Please try again.`,
                'error'
            );
        }
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Remove existing listeners to prevent duplicates
        cleanupEventListeners();
        
        // Handle new invoice form submission
        const newInvoiceForm = document.getElementById('new-invoice-form');
        if (newInvoiceForm) {
            newInvoiceForm.addEventListener('submit', handleNewInvoiceSubmit);
        }
        
        // Add item button
        const addItemBtn = document.getElementById('add-invoice-item');
        if (addItemBtn) {
            eventListeners.addItem = (e) => {
                e.preventDefault();
                addNewInvoiceItem();
            };
            addItemBtn.addEventListener('click', eventListeners.addItem);
        }
        
        // Remove item button
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-item')) {
                e.preventDefault();
                const item = e.target.closest('.invoice-item');
                if (item && document.querySelectorAll('.invoice-item').length > 1) {
                    item.remove();
                    updateInvoiceTotal();
                }
            }
        });
        
        // Quantity/rate changes
        document.addEventListener('input', (e) => {
            if (e.target.matches('.item-quantity, .item-rate')) {
                updateInvoiceTotal();
            }
        });
        
        // Close modal on cancel
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-dismiss="modal"]')) {
                hideNewInvoiceModal();
            }
        });
    }
    
    // Clean up event listeners
    function cleanupEventListeners() {
        if (eventListeners.addItem) {
            document.removeEventListener('click', eventListeners.addItem);
            eventListeners.addItem = null;
        }
    }
    
    // Delete invoice with two-step confirmation
    function deleteInvoice(invoiceId, invoiceNumber = '') {
        // Store the invoice ID for later use
        window.currentDeletingInvoiceId = invoiceId;
        
        // Update the confirmation message with the invoice number if available
        const messageElement = document.getElementById('delete-confirm-message');
        if (messageElement && invoiceNumber) {
            messageElement.textContent = `Are you sure you want to delete invoice #${invoiceNumber}? This action cannot be undone.`;
        }
        
        // Show the first confirmation modal
        document.getElementById('delete-confirm-modal').classList.remove('hidden');
    }
    
    // Handle the actual deletion from Firestore
    async function confirmDelete() {
        const invoiceId = window.currentDeletingInvoiceId;
        if (!invoiceId) return;
        
        const confirmBtn = document.getElementById('delete-confirm-btn');
        const originalText = confirmBtn ? confirmBtn.innerHTML : '';
        
        try {
            // Show loading state
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Deleting...';
            }
            
            // Delete the invoice from Firestore
            await db.collection('invoices').doc(invoiceId).delete();
            console.log('Invoice deleted successfully');
            
            // Hide the first confirmation modal
            document.getElementById('delete-confirm-modal').classList.add('hidden');
            document.getElementById('second-confirm-modal').classList.add('hidden');
            
            // Show success message
            showAlert('Invoice deleted successfully!', 'success');
            
            // Refresh the invoices list
            await loadInvoices();
            
        } catch (error) {
            console.error('Error deleting invoice:', error);
            showAlert('Failed to delete invoice. Please try again.', 'error');
        } finally {
            // Reset the button state
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = originalText;
            }
            
            // Clear the stored invoice ID
            delete window.currentDeletingInvoiceId;
        }
    }
    
    // Show alert message
    function showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `fixed top-4 right-4 p-4 rounded-md ${
            type === 'success' ? 'bg-green-50 text-green-800' : 
            type === 'error' ? 'bg-red-50 text-red-800' : 
            'bg-blue-50 text-blue-800'
        } shadow-lg z-50 max-w-md`;
        
        alertDiv.innerHTML = `
            <div class="flex">
                <div class="flex-shrink-0">
                    ${type === 'success' ? '<i class="fas fa-check-circle text-green-400"></i>' : 
                      type === 'error' ? '<i class="fas fa-exclamation-circle text-red-400"></i>' :
                      '<i class="fas fa-info-circle text-blue-400"></i>'}
                </div>
                <div class="flex space-x-2">
                    <button class="text-blue-600 hover:text-blue-900" onclick="window.Invoices.showEditInvoiceModal('${invoice.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-gray-600 hover:text-gray-900" onclick="window.Invoices.printInvoice('${invoice.id}')" title="Print">
                        <i class="fas fa-print"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-900" 
                            onclick="window.Invoices.deleteInvoice('${invoice.id}', '${invoice.invoiceNumber || ''}')"
                            title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Add close button functionality
        const closeBtn = alertDiv.querySelector('button');
        closeBtn.addEventListener('click', () => {
            alertDiv.remove();
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (document.body.contains(alertDiv)) {
                alertDiv.remove();
            }
        }, 5000);
        
        document.body.appendChild(alertDiv);
    }
    
    // Set up delete confirmation modals
    function setupDeleteConfirmations() {
        // First confirmation
        const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
        const deleteCancelBtn = document.getElementById('delete-cancel-btn');
        const secondConfirmBtn = document.getElementById('second-confirm-btn');
        const secondCancelBtn = document.getElementById('second-cancel-btn');
        
        if (deleteConfirmBtn) {
            deleteConfirmBtn.addEventListener('click', () => {
                // Hide first modal
                document.getElementById('delete-confirm-modal').classList.add('hidden');
                // Show second confirmation
                document.getElementById('second-confirm-modal').classList.remove('hidden');
            });
        }
        
        if (deleteCancelBtn) {
            deleteCancelBtn.addEventListener('click', () => {
                document.getElementById('delete-confirm-modal').classList.add('hidden');
                delete window.currentDeletingInvoiceId;
            });
        }
        
        if (secondConfirmBtn) {
            secondConfirmBtn.addEventListener('click', confirmDelete);
        }
        
        if (secondCancelBtn) {
            secondCancelBtn.addEventListener('click', () => {
                // Show first modal again
                document.getElementById('second-confirm-modal').classList.add('hidden');
                document.getElementById('delete-confirm-modal').classList.remove('hidden');
            });
        }
    }
    
    // Initialize the module
    async function init() {
        try {
            console.log('Invoices: Starting initialization...');
            cleanupEventListeners();
            await initializeFirebase();
            await loadInvoices();
            setupEventListeners();
            setupDeleteConfirmations();
            console.log('Invoices: Module initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing invoices module:', error);
            throw error;
        }
    }
    
    // Print invoice
    async function printInvoice(invoiceId) {
        try {
            // Show loading state
            const printBtn = document.querySelector(`button[onclick*="printInvoice('${invoiceId}')"]`);
            const originalContent = printBtn ? printBtn.innerHTML : '';
            
            if (printBtn) {
                printBtn.disabled = true;
                printBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Preparing...';
            }
            
            // Get the invoice data
            const invoiceDoc = await db.collection('invoices').doc(invoiceId).get();
            if (!invoiceDoc.exists) {
                throw new Error('Invoice not found');
            }
            
            const invoice = { id: invoiceDoc.id, ...invoiceDoc.data() };
            
            // Create a new window for printing
            const printWindow = window.open('', '_blank');
            
            // Format dates
            const formatDateForDisplay = (dateString) => {
                if (!dateString) return 'N/A';
                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                return new Date(dateString).toLocaleDateString(undefined, options);
            };

            // Generate the print content
            const printContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Invoice #${invoice.invoiceNumber || 'N/A'}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
                    <style>
                        @media print {
                            @page {
                                size: A4;
                                margin: 20mm;
                            }
                            body {
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                                font-size: 14px;
                                line-height: 1.5;
                            }
                            .no-print {
                                display: none !important;
                            }
                            .break-inside-avoid {
                                break-inside: avoid;
                            }
                        }
                        body {
                            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        }
                        .invoice-table th, .invoice-table td {
                            padding: 8px 12px;
                            vertical-align: top;
                        }
                        .invoice-table thead th {
                            border-bottom: 2px solid #e5e7eb;
                            text-transform: uppercase;
                            font-size: 0.75rem;
                            font-weight: 600;
                            color: #6b7280;
                        }
                        .invoice-table tbody tr:not(:last-child) {
                            border-bottom: 1px solid #e5e7eb;
                        }
                    </style>
                </head>
                <body class="bg-gray-50 p-8">
                    <div class="max-w-4xl mx-auto bg-white rounded-lg shadow overflow-hidden">
                        <!-- Invoice Header -->
                        <div class="p-8 border-b border-gray-200 break-inside-avoid">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h1 class="text-2xl font-bold text-gray-900">INVOICE</h1>
                                    <p class="text-gray-500">#${invoice.invoiceNumber || 'N/A'}</p>
                                </div>
                                <div class="text-right">
                                    <div class="text-2xl font-bold text-gray-900">${invoice.companyName || 'Webflare Design Co.'}</div>
                                    <p class="text-gray-600">${invoice.companyAddress || '807 Pickering Street, Ogdensburg, NY 16669'}</p>
                                    <p class="text-gray-600">${invoice.companyEmail || 'billing@webflaredesignco.com'}</p>
                                    <p class="text-gray-600">${invoice.companyPhone || '+1 (315) 590-2863'}</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Client & Invoice Info -->
                        <div class="p-8 border-b border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-8 break-inside-avoid">
                            <div>
                                <h2 class="text-lg font-medium text-gray-900 mb-2">Bill To:</h2>
                                <p class="font-medium">${invoice.clientName || 'Client Name'}</p>
                                ${invoice.clientEmail ? `<p class="text-gray-600">${invoice.clientEmail}</p>` : ''}
                                ${invoice.clientPhone ? `<p class="text-gray-600">${invoice.clientPhone}</p>` : ''}
                                ${invoice.clientAddress ? `<p class="text-gray-600 whitespace-pre-line">${invoice.clientAddress}</p>` : ''}
                            </div>
                            <div class="md:text-right">
                                <div class="grid grid-cols-2 gap-2">
                                    <div class="text-gray-600">Invoice Date:</div>
                                    <div class="font-medium">${formatDateForDisplay(invoice.invoiceDate)}</div>
                                    
                                    <div class="text-gray-600">Due Date:</div>
                                    <div class="font-medium">${formatDateForDisplay(invoice.dueDate)}</div>
                                    
                                    <div class="text-gray-600">Status:</div>
                                    <div>
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                            invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                        }">
                                            ${(invoice.status || 'draft').charAt(0).toUpperCase() + (invoice.status || 'draft').slice(1)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Invoice Items -->
                        <div class="p-6 break-inside-avoid">
                            <div class="overflow-x-auto">
                                <table class="w-full invoice-table">
                                    <thead>
                                        <tr>
                                            <th class="text-left">Item</th>
                                            <th class="text-right">Qty</th>
                                            <th class="text-right">Rate</th>
                                            <th class="text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(invoice.items || []).map(item => {
                                            const quantity = parseFloat(item.quantity) || 0;
                                            const rate = parseFloat(item.rate) || 0;
                                            const amount = quantity * rate;
                                            return `
                                                <tr>
                                                    <td class="text-gray-900">
                                                        <div class="font-medium">${item.description || 'Item'}</div>
                                                        ${item.details ? `<div class="text-gray-500 text-sm mt-1">${item.details}</div>` : ''}
                                                    </td>
                                                    <td class="text-right text-gray-600">
                                                        ${quantity.toFixed(2)}
                                                    </td>
                                                    <td class="text-right text-gray-600">
                                                        ${formatCurrency(rate)}
                                                    </td>
                                                    <td class="text-right font-medium text-gray-900">
                                                        ${formatCurrency(amount)}
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <!-- Invoice Totals -->
                        <div class="bg-gray-50 p-6 border-t border-gray-200 break-inside-avoid">
                            <div class="flex justify-end">
                                <div class="w-full max-w-xs">
                                    <div class="grid grid-cols-2 gap-2 text-sm">
                                        <!-- Subtotal -->
                                        <div class="text-right text-gray-600">Subtotal:</div>
                                        <div class="text-right text-gray-900">
                                            ${formatCurrency(invoice.subtotal || 0)}
                                        </div>
                                        
                                        <!-- Discount -->
                                        ${invoice.discount && parseFloat(invoice.discount) > 0 ? `
                                            <div class="text-right text-gray-600">
                                                Discount${invoice.discountType === 'percentage' ? ` (${invoice.discountValue || 0}%)` : ''}:
                                            </div>
                                            <div class="text-right text-gray-900">
                                                -${formatCurrency(parseFloat(invoice.discount) || 0)}
                                            </div>
                                        ` : ''}
                                        
                                        <!-- Tax -->
                                        ${invoice.tax && parseFloat(invoice.tax) > 0 ? `
                                            <div class="text-right text-gray-600">
                                                Tax${invoice.taxRate ? ` (${invoice.taxRate}%)` : ''}:
                                            </div>
                                            <div class="text-right text-gray-900">
                                                ${formatCurrency(parseFloat(invoice.tax) || 0)}
                                            </div>
                                        ` : ''}
                                        
                                        <!-- Shipping -->
                                        ${invoice.shipping && parseFloat(invoice.shipping) > 0 ? `
                                            <div class="text-right text-gray-600">
                                                Shipping & Handling:
                                            </div>
                                            <div class="text-right text-gray-900">
                                                ${formatCurrency(parseFloat(invoice.shipping) || 0)}
                                            </div>
                                        ` : ''}
                                        
                                        <!-- Total -->
                                        <div class="border-t border-gray-300 my-2 col-span-2"></div>
                                        <div class="text-right font-semibold text-gray-900">
                                            Total Amount Due:
                                        </div>
                                        <div class="text-right font-bold text-lg text-gray-900">
                                            ${formatCurrency(invoice.total || 0)}
                                        </div>
                                        
                                        <!-- Amount Paid & Balance Due -->
                                        ${invoice.amountPaid && parseFloat(invoice.amountPaid) > 0 ? `
                                            <div class="text-right text-gray-600 mt-2">
                                                Amount Paid:
                                            </div>
                                            <div class="text-right text-green-600 font-medium mt-2">
                                                -${formatCurrency(parseFloat(invoice.amountPaid) || 0)}
                                            </div>
                                            
                                            <div class="border-t border-gray-200 my-1 col-span-2"></div>
                                            
                                            <div class="text-right font-semibold text-gray-900">
                                                Balance Due:
                                            </div>
                                            <div class="text-right font-bold text-lg text-blue-600">
                                                ${formatCurrency((parseFloat(invoice.total) - parseFloat(invoice.amountPaid || 0)) || 0)}
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Invoice Footer -->
                        <div class="p-8 border-t border-gray-200 bg-white">
                            ${invoice.notes ? `
                                <div class="mb-6">
                                    <h3 class="text-sm font-medium text-gray-900 mb-2">Notes</h3>
                                    <p class="text-sm text-gray-600 whitespace-pre-line">${invoice.notes}</p>
                                </div>
                            ` : ''}
                            
                            <div class="flex flex-col sm:flex-row justify-between items-center text-center sm:text-left">
                                <div class="mb-4 sm:mb-0">
                                    <p class="text-xs text-gray-500">Thank you for your business!</p>
                                </div>
                                <div class="text-xs text-gray-500">
                                    <p>${invoice.companyName || 'Webflare Design Co.3h5y0wgm,,,,g,wgg2222222222    ,aAANMN-FFFnnnnn,naaa90099a9naaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-9-------------------------------------9avamb m,v&,MV7'}</p>
                                    <p>Generated on ${new Date().toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Print Buttons -->
                    <div class="mt-6 flex justify-center no-print">
                        <button onclick="window.print()" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3">
                            <i class="fas fa-print mr-2"></i> Print Invoice
                        </button>
                        <button onclick="window.close()" class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            <i class="fas fa-times mr-2"></i> Close
                        </button>
                    </div>
                    
                    <script>
                        // Auto-print when the window loads
                        window.onload = function() {
                            // Small delay to ensure all content is loaded
                            setTimeout(() => {
                                window.print();
                            }, 500);
                        };
                        
                        // Close the window after printing
                        window.onafterprint = function() {
                            // Small delay before closing to ensure print dialog is closed
                            setTimeout(() => {
                                window.close();
                            }, 500);
                        };
                    </script>
                </body>
                </html>
            `;
            
            // Write the content to the new window
            printWindow.document.open();
            printWindow.document.write(printContent);
            printWindow.document.close();
            
            // Focus the new window
            printWindow.focus();
            
        } catch (error) {
            console.error('Error generating invoice:', error);
            showAlert('Failed to generate invoice. Please try again.', 'error');
        } finally {
            // Reset the print button state
            if (printBtn) {
                printBtn.disabled = false;
                printBtn.innerHTML = originalContent;
            }
        }
    }
    
    // Public API
    return {
        init: init,
        refreshInvoices: loadInvoices,
        showNewInvoiceModal: showNewInvoiceModal,
        hideNewInvoiceModal: hideNewInvoiceModal,
        addNewInvoiceItem: addNewInvoiceItem,
        deleteInvoice: deleteInvoice,
        printInvoice: printInvoice,
        loadInvoicesSection: function() {
            console.log('Loading invoices section');
            // Implementation for loading invoices section
        }
    };
})();

// Export to global scope
window.Invoices = Invoices;

// Debug logging
console.log('=== Invoices Module: Load Complete ===');
console.log('Invoices module loaded with methods:', 
    Object.keys(Invoices).filter(k => typeof Invoices[k] === 'function'));

// Initialize the module when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded in invoices.js');
    if (window.Invoices && typeof window.Invoices.init === 'function') {
        console.log('Initializing Invoices module...');
        window.Invoices.init().then(() => {
            console.log('Invoices module initialized successfully');
        }).catch(error => {
            console.error('Failed to initialize Invoices module:', error);
        });
    } else {
        console.error('Invoices module not properly initialized');
    }
});

// Debug: Log module status
console.log('Invoices module status:', {
    isDefined: typeof window.Invoices !== 'undefined',
    hasInit: typeof window.Invoices?.init === 'function',
    methods: window.Invoices ? Object.keys(window.Invoices).filter(k => typeof window.Invoices[k] === 'function') : []
});

// For debugging - log when the script is executed
console.log('Invoices script executed');
