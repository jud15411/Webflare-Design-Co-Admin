// Admin Panel Module
const AdminPanel = {
    // Store dashboard data
    dashboardData: {
        totalDevelopers: 0,
        activeDevelopers: 0,
        totalInvoices: 0,
        pendingInvoices: 0,
        totalRevenue: 0,
        revenueChange: 0,
        recentActivity: []
    },
    // Initialize the admin panel
    init: function() {
        console.log('Initializing admin panel...');
        
        // Initialize event listeners
        this.setupEventListeners();
        
        // Load data
        this.loadDashboardData();
    },
    
    // Set up event listeners
    setupEventListeners: function() {
        // Logout button
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', this.handleLogout.bind(this));
        }
        
        // Refresh dashboard button
        const refreshButton = document.getElementById('refreshDashboard');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.loadDashboardData();
                this.showNotification('Dashboard refreshed', 'success');
            });
        }
        
        // Create invoice button
        const createInvoiceBtn = document.getElementById('createInvoiceBtn');
        if (createInvoiceBtn) {
            createInvoiceBtn.addEventListener('click', () => {
                // Check if Invoices module is available
                if (typeof Invoices !== 'undefined' && typeof Invoices.showAddInvoiceModal === 'function') {
                    Invoices.showAddInvoiceModal();
                } else {
                    // Fallback to navigation
                    window.location.href = 'invoices.html?action=create';
                }
            });
        }
        
        // Add developer button
        const addDeveloperBtn = document.getElementById('addDeveloperBtn');
        if (addDeveloperBtn) {
            addDeveloperBtn.addEventListener('click', () => {
                // Check if Developers module is available
                if (typeof Developers !== 'undefined' && typeof Developers.showAddDeveloperModal === 'function') {
                    Developers.showAddDeveloperModal();
                } else {
                    // Fallback to navigation
                    window.location.href = 'developers.html?action=add';
                }
            });
        }
        
        // Add event delegation for any dynamically added elements
        document.addEventListener('click', (e) => {
            // Handle any dynamically added buttons or links here
        });
    },
    
    // Show loading state
    showLoading: function(show, message = 'Loading...') {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.innerHTML = `
                <div class="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p class="mt-4 text-gray-600">${message}</p>
                    </div>
                </div>
            `;
            loadingEl.style.display = show ? 'block' : 'none';
        }
    },
    
    // Show notification
    showNotification: function(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        // Map notification types to Tailwind classes
        const typeClasses = {
            success: 'bg-green-100 border-green-500 text-green-700',
            error: 'bg-red-100 border-red-500 text-red-700',
            warning: 'bg-yellow-100 border-yellow-500 text-yellow-700',
            info: 'bg-blue-100 border-blue-500 text-blue-700'
        };
        
        const notification = document.createElement('div');
        notification.className = `border-l-4 p-4 mb-2 rounded shadow-md ${typeClasses[type] || typeClasses.info} transition-all duration-300 transform translate-x-0 opacity-100`;
        notification.role = 'alert';
        
        const content = document.createElement('div');
        content.className = 'flex items-center';
        
        // Add icon based on type
        const iconMap = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        const icon = document.createElement('span');
        icon.className = 'mr-3 text-xl';
        icon.textContent = iconMap[type] || iconMap.info;
        content.appendChild(icon);
        
        const messageEl = document.createElement('p');
        messageEl.className = 'text-sm';
        messageEl.textContent = message;
        content.appendChild(messageEl);
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'ml-auto text-gray-500 hover:text-gray-700 focus:outline-none';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        });
        content.appendChild(closeBtn);
        
        notification.appendChild(content);
        container.appendChild(notification);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateX(100%)';
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);
        }
        
        return notification;
    },
    
    // Show error message (wraps showNotification for backward compatibility)
    showError: function(message, error = null) {
        console.error(message, error);
        const fullMessage = error ? `${message}: ${error.message || error}` : message;
        return this.showNotification(fullMessage, 'error');
    },
    
    // Load all dashboard data
    loadDashboardData: function() {
        this.showLoading(true, 'Loading dashboard data...');
        
        // Load all data in parallel
        Promise.all([
            this.loadDevelopers(),
            this.loadInvoices(),
            this.loadDashboardStats(),
            this.loadRecentActivity()
        ]).then(() => {
            this.showLoading(false);
            this.updateDashboardUI();
        }).catch(error => {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data. Please try again.');
            this.showLoading(false);
        });
    },
    
    // Load dashboard statistics
    loadDashboardStats: async function() {
        try {
            // Get developer stats
            const developersSnapshot = await firebase.firestore()
                .collection('developers')
                .get();
                
            const activeDevelopers = developersSnapshot.docs.filter(
                doc => doc.data().status === 'active'
            ).length;
            
            // Get invoice stats
            const invoicesSnapshot = await firebase.firestore()
                .collection('invoices')
                .get();
                
            const pendingInvoices = invoicesSnapshot.docs.filter(
                doc => doc.data().status === 'pending' || doc.data().status === 'sent'
            ).length;
            
            // Calculate total revenue (sum of all paid invoices)
            let totalRevenue = 0;
            invoicesSnapshot.forEach(doc => {
                const invoice = doc.data();
                if (invoice.status === 'paid' && invoice.totalAmount) {
                    totalRevenue += parseFloat(invoice.totalAmount) || 0;
                }
            });
            
            // Update dashboard data
            this.dashboardData = {
                ...this.dashboardData,
                totalDevelopers: developersSnapshot.size,
                activeDevelopers,
                totalInvoices: invoicesSnapshot.size,
                pendingInvoices,
                totalRevenue,
                // In a real app, you might calculate this based on previous period
                revenueChange: 12.5 // Example: 12.5% increase
            };
            
            return true;
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            throw error;
        }
    },
    
    // Load recent activity
    loadRecentActivity: async function() {
        try {
            // In a real app, you might have an 'activities' collection
            // For now, we'll combine recent developers and invoices
            const [developersSnapshot, invoicesSnapshot] = await Promise.all([
                firebase.firestore()
                    .collection('developers')
                    .orderBy('createdAt', 'desc')
                    .limit(3)
                    .get(),
                firebase.firestore()
                    .collection('invoices')
                    .orderBy('createdAt', 'desc')
                    .limit(3)
                    .get()
            ]);
            
            // Combine and sort activities
            const activities = [
                ...developersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    type: 'developer',
                    ...doc.data(),
                    timestamp: doc.data().createdAt
                })),
                ...invoicesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    type: 'invoice',
                    ...doc.data(),
                    timestamp: doc.data().createdAt
                }))
            ].sort((a, b) => b.timestamp - a.timestamp)
             .slice(0, 5); // Get top 5 most recent
            
            this.dashboardData.recentActivity = activities;
            return true;
        } catch (error) {
            console.error('Error loading recent activity:', error);
            throw error;
        }
    },
    
    // Update dashboard UI with loaded data
    updateDashboardUI: function() {
        // Update stats cards
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2
            }).format(amount);
        };
        
        // Update developer stats
        const totalDevEl = document.getElementById('totalDevelopers');
        const devChangeEl = document.getElementById('developerChange');
        if (totalDevEl) totalDevEl.textContent = this.dashboardData.totalDevelopers;
        if (devChangeEl) devChangeEl.textContent = `+${this.dashboardData.activeDevelopers} active`;
        
        // Update project stats (placeholder - would come from projects collection)
        const activeProjectsEl = document.getElementById('activeProjects');
        const projectsChangeEl = document.getElementById('projectsChange');
        if (activeProjectsEl) activeProjectsEl.textContent = '5'; // Placeholder
        if (projectsChangeEl) projectsChangeEl.textContent = '+2 this month';
        
        // Update invoice stats
        const pendingInvoicesEl = document.getElementById('pendingInvoices');
        const invoicesChangeEl = document.getElementById('invoicesChange');
        if (pendingInvoicesEl) pendingInvoicesEl.textContent = this.dashboardData.pendingInvoices;
        if (invoicesChangeEl) {
            const change = this.dashboardData.pendingInvoices > 0 ? '1.2%' : '0%';
            invoicesChangeEl.textContent = change;
        }
        
        // Update revenue stats
        const totalRevenueEl = document.getElementById('totalRevenue');
        const revenueChangeEl = document.getElementById('revenueChange');
        if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(this.dashboardData.totalRevenue);
        if (revenueChangeEl) revenueChangeEl.textContent = `${this.dashboardData.revenueChange}%`;
        
        // Update activity feed
        this.updateActivityFeed();
    },
    
    // Update activity feed
    updateActivityFeed: function() {
        const activityContainer = document.getElementById('activityContainer');
        if (!activityContainer || !this.dashboardData.recentActivity.length) return;
        
        const formatTimeAgo = (timestamp) => {
            if (!timestamp || !timestamp.seconds) return 'just now';
            
            const now = new Date();
            const date = new Date(timestamp.seconds * 1000);
            const seconds = Math.floor((now - date) / 1000);
            
            let interval = Math.floor(seconds / 31536000);
            if (interval > 1) return `${interval} years ago`;
            if (interval === 1) return '1 year ago';
            
            interval = Math.floor(seconds / 2592000);
            if (interval > 1) return `${interval} months ago`;
            if (interval === 1) return '1 month ago';
            
            interval = Math.floor(seconds / 86400);
            if (interval > 1) return `${interval} days ago`;
            if (interval === 1) return 'yesterday';
            
            interval = Math.floor(seconds / 3600);
            if (interval > 1) return `${interval} hours ago`;
            if (interval === 1) return '1 hour ago';
            
            interval = Math.floor(seconds / 60);
            if (interval > 1) return `${interval} minutes ago`;
            if (interval === 1) return '1 minute ago';
            
            return 'just now';
        };
        
        let html = '';
        
        this.dashboardData.recentActivity.forEach(activity => {
            let title = '';
            let description = '';
            let icon = '';
            
            if (activity.type === 'developer') {
                title = `New ${activity.status === 'active' ? 'active ' : ''}developer added`;
                description = `${activity.name || 'A new developer'} was ${activity.status === 'active' ? 'added' : 'deactivated'}`;
                icon = '👤';
            } else if (activity.type === 'invoice') {
                title = `New ${activity.status} invoice`;
                description = `Invoice #${activity.invoiceNumber || 'new'} for ${activity.clientName || 'a client'}`;
                icon = '📄';
            }
            
            if (title && description) {
                html += `
                    <div class="px-4 py-4 sm:px-6 hover:bg-gray-50">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl">
                                ${icon}
                            </div>
                            <div class="ml-4 flex-1">
                                <div class="flex items-center justify-between">
                                    <p class="text-sm font-medium text-gray-900 truncate">
                                        ${title}
                                    </p>
                                    <div class="ml-2 flex-shrink-0">
                                        <p class="text-xs text-gray-500">
                                            ${formatTimeAgo(activity.timestamp)}
                                        </p>
                                    </div>
                                </div>
                                <p class="mt-1 text-sm text-gray-500">
                                    ${description}
                                </p>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
        
        if (html) {
            activityContainer.innerHTML = html;
        } else {
            activityContainer.innerHTML = `
                <div class="px-4 py-4 sm:px-6 text-center text-gray-500">
                    No recent activity to display
                </div>
            `;
        }
    },
    
    // Load invoices from Firestore
    loadInvoices: function() {
        console.log('Loading invoices...');
        const invoicesContainer = document.getElementById('invoicesContainer');
        
        // Show loading state
        if (invoicesContainer) {
            invoicesContainer.innerHTML = `
                <div class="col-span-3 text-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p class="mt-2 text-gray-600">Loading invoices...</p>
                </div>
            `;
        }
        
        return firebase.firestore().collection('invoices')
            .orderBy('createdAt', 'desc')
            .limit(5) // Show only the 5 most recent invoices
            .get()
            .then(querySnapshot => {
                if (!querySnapshot.empty) {
                    const invoices = [];
                    querySnapshot.forEach(doc => {
                        invoices.push({ id: doc.id, ...doc.data() });
                    });
                    this.renderInvoices(invoices);
                } else {
                    this.renderNoInvoices();
                }
            })
            .catch(error => {
                console.error('Error loading invoices:', error);
                this.showError('Failed to load invoices');
                this.renderNoInvoices();
            });
    },
    
    // Render invoices list
    renderInvoices: function(invoices) {
        const invoicesContainer = document.getElementById('invoicesContainer');
        if (!invoicesContainer) return;
        
        if (invoices.length === 0) {
            this.renderNoInvoices();
            return;
        }
        
        let html = `
            <div class="overflow-hidden bg-white shadow sm:rounded-lg">
                <div class="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-medium leading-6 text-gray-900">Recent Invoices</h3>
                        <a href="invoices.html" class="text-sm font-medium text-blue-600 hover:text-blue-500">View All</a>
                    </div>
                </div>
                <div class="divide-y divide-gray-200">
        `;
        
        invoices.forEach(invoice => {
            const formattedDate = invoice.invoiceDate ? new Date(invoice.invoiceDate.seconds * 1000).toLocaleDateString() : 'N/A';
            const statusClass = this.getStatusClass(invoice.status || 'draft');
            
            html += `
                <div class="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <p class="text-sm font-medium text-blue-600 truncate">
                                ${invoice.clientName || 'Unnamed Invoice'}
                            </p>
                            <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                                ${invoice.status || 'draft'}
                            </span>
                        </div>
                        <div class="ml-2 flex-shrink-0 flex">
                            <p class="text-sm text-gray-900">
                                $${invoice.totalAmount ? invoice.totalAmount.toFixed(2) : '0.00'}
                            </p>
                        </div>
                    </div>
                    <div class="mt-2 sm:flex sm:justify-between">
                        <div class="sm:flex">
                            <p class="flex items-center text-sm text-gray-500">
                                #${invoice.invoiceNumber || 'N/A'}
                            </p>
                            <p class="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                <svg class="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                                </svg>
                                ${formattedDate}
                            </p>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        invoicesContainer.innerHTML = html;
    },
    
    // Render no invoices state
    renderNoInvoices: function() {
        const invoicesContainer = document.getElementById('invoicesContainer');
        if (invoicesContainer) {
            invoicesContainer.innerHTML = `
                <div class="text-center py-12">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 class="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
                    <p class="mt-1 text-sm text-gray-500">Get started by creating a new invoice.</p>
                    <div class="mt-6">
                        <button type="button" id="createInvoiceBtn" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                            </svg>
                            New Invoice
                        </button>
                    </div>
                </div>
            `;
            
            // Re-attach event listener to the new button
            const createInvoiceBtn = document.getElementById('createInvoiceBtn');
            if (createInvoiceBtn) {
                createInvoiceBtn.addEventListener('click', () => this.showCreateInvoiceModal());
            }
        }
    },
    
    // Load developers from Firestore
    loadDevelopers: function() {
        console.log('Loading developers...');
        const developersContainer = document.getElementById('developersContainer');
        
        // Show loading state
        if (developersContainer) {
            developersContainer.innerHTML = `
                <div class="col-span-3 text-center py-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p class="mt-2 text-gray-600">Loading developers...</p>
                </div>
            `;
        }
        
        return firebase.firestore().collection('developers')
            .orderBy('createdAt', 'desc')
            .limit(5) // Show only the 5 most recent developers
            .get()
            .then(querySnapshot => {
                if (!querySnapshot.empty) {
                    const developers = [];
                    querySnapshot.forEach(doc => {
                        developers.push({ id: doc.id, ...doc.data() });
                    });
                    this.renderDevelopers(developers);
                } else {
                    this.renderNoDevelopers();
                }
            })
            .catch(error => {
                console.error('Error loading developers:', error);
                this.showError('Failed to load developers');
                this.renderNoDevelopers();
            });
    },
    
    // Render developers list
    renderDevelopers: function(developers) {
        const developersContainer = document.getElementById('developersContainer');
        if (!developersContainer) return;
        
        if (developers.length === 0) {
            this.renderNoDevelopers();
            return;
        }
        
        let html = `
            <div class="overflow-hidden bg-white shadow sm:rounded-lg">
                <div class="px-4 py-5 sm:px-6 border-b border-gray-200">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-medium leading-6 text-gray-900">Recent Developers</h3>
                        <a href="developers.html" class="text-sm font-medium text-blue-600 hover:text-blue-500">View All</a>
                    </div>
                </div>
                <ul role="list" class="divide-y divide-gray-200">
        `;
        
        developers.forEach(developer => {
            const statusClass = developer.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800';
                
            html += `
                <li>
                    <div class="px-4 py-4 sm:px-6 hover:bg-gray-50">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center">
                                <div class="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                    <span class="text-lg font-medium">${developer.name ? developer.name.charAt(0).toUpperCase() : '?'}</span>
                                </div>
                                <div class="ml-4">
                                    <div class="text-sm font-medium text-gray-900">${developer.name || 'Unnamed Developer'}</div>
                                    <div class="text-sm text-gray-500">${developer.email || 'No email'}</div>
                                </div>
                            </div>
                            <div class="flex items-center">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                                    ${developer.status || 'inactive'}
                                </span>
                            </div>
                        </div>
                    </div>
                </li>
            `;
        });
        
        html += `
                </ul>
            </div>
        `;
        
        developersContainer.innerHTML = html;
    },
    
    // Render no developers state
    renderNoDevelopers: function() {
        const developersContainer = document.getElementById('developersContainer');
        if (developersContainer) {
            developersContainer.innerHTML = `
                <div class="text-center py-12">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0111.317-3.317M15 21v-3a6 6 0 00-12 0v3m0 0h12v3H3v-3z" />
                    </svg>
                    <h3 class="mt-2 text-sm font-medium text-gray-900">No developers</h3>
                    <p class="mt-1 text-sm text-gray-500">Get started by adding a new developer.</p>
                    <div class="mt-6">
                        <button type="button" id="addDeveloperBtn" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                            </svg>
                            Add Developer
                        </button>
                    </div>
                </div>
            `;
            
            // Re-attach event listener to the new button
            const addDeveloperBtn = document.getElementById('addDeveloperBtn');
            if (addDeveloperBtn) {
                addDeveloperBtn.addEventListener('click', () => {
                    if (window.Developers && typeof window.Developers.showAddDeveloperModal === 'function') {
                        window.Developers.showAddDeveloperModal();
                    }
                });
            }
        }
    },
    
    // Get status badge class
    getStatusClass: function(status) {
        const statusClasses = {
            'draft': 'bg-gray-100 text-gray-800',
            'sent': 'bg-blue-100 text-blue-800',
            'paid': 'bg-green-100 text-green-800',
            'overdue': 'bg-red-100 text-red-800',
            'cancelled': 'bg-yellow-100 text-yellow-800',
            'active': 'bg-green-100 text-green-800',
            'inactive': 'bg-gray-100 text-gray-800'
        };
        
        return statusClasses[status] || 'bg-gray-100 text-gray-800';
    },
    
    // Show create invoice modal
    showCreateInvoiceModal: function() {
        // Check if Invoices module is available
        if (window.Invoices && typeof window.Invoices.showNewInvoiceModal === 'function') {
            window.Invoices.showNewInvoiceModal();
        } else {
            // Fallback to default behavior
            window.location.href = 'invoices.html?new=true';
        }
    },
    
    // Show add developer modal
    showAddDeveloperModal: function() {
        // Check if Developers module is available
        if (window.Developers && typeof window.Developers.showAddDeveloperModal === 'function') {
            window.Developers.showAddDeveloperModal();
        } else {
            // Fallback to default behavior
            window.location.href = 'developers.html?new=true';
        }
    }
};

// Initialize the admin panel when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const appContent = document.querySelector('#app-content');
    if (appContent && !appContent.classList.contains('hidden')) {
        AdminPanel.init();
    } else if (document.getElementById('admin-panel')) {
        // If the admin panel container exists, initialize anyway
        AdminPanel.init();
    }
});
