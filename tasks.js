// Tasks Module
const Tasks = (function() {
    'use strict';
    
    // Reference to Firebase Firestore
    let db;
    let initialized = false;
    
    // Initialize function to be called after Firebase is ready
    function init() {
        if (initialized) return Promise.resolve(true);
        
        return new Promise((resolve, reject) => {
            try {
                if (typeof firebase === 'undefined' || !firebase.app()) {
                    throw new Error('Firebase not initialized');
                }
                db = firebase.firestore();
                initialized = true;
                console.log('Tasks module initialized');
                resolve(true);
            } catch (error) {
                console.error('Failed to initialize Tasks module:', error);
                reject(error);
            }
        });
    }

    // Cache for developers list
    let developersCache = [];
    
    // Function to fetch team members (both developers and admins)
    async function fetchTeamMembers() {
        try {
            if (developersCache.length > 0) return developersCache;
            
            console.log('Fetching all team members...');
            const teamMembersSnapshot = await db.collection('developers').get();
                
            console.log('All team members from Firestore:');
            teamMembersSnapshot.docs.forEach(doc => {
                const data = doc.data();
                console.log(`- ${doc.id}:`, {
                    ...data,
                    isAdmin: data.isAdmin === true,
                    status: data.status || 'unknown'
                });
            });
            
            // Process all team members
            const allTeamMembers = teamMembersSnapshot.docs.map(doc => {
                const data = doc.data();
                const isAdmin = data.isAdmin === true;
                return {
                    id: doc.id,
                    type: isAdmin ? 'admin' : 'developer',
                    ...data,
                    name: data.name || data.displayName || (isAdmin ? 'Admin' : 'Developer'),
                    email: data.email || '',
                    displayName: data.displayName || data.name || (isAdmin ? 'Admin' : 'Developer')
                };
            });
            
            const adminCount = allTeamMembers.filter(m => m.type === 'admin').length;
            const devCount = allTeamMembers.filter(m => m.type === 'developer').length;
            
            console.log(`Found ${allTeamMembers.length} team members (${adminCount} admins, ${devCount} developers)`);
            
            developersCache = allTeamMembers;
            return developersCache;
        } catch (error) {
            console.error('Error fetching team members:', error);
            showToast('Failed to load team members', 'error');
            return [];
        }
    }
    
    // Function to get developer name by ID
    function getDeveloperName(developerId) {
        if (!developerId) return null;
        const developer = developersCache.find(dev => dev.id === developerId);
        return developer ? (developer.displayName || developer.email) : null;
    }
    
    // --- TASK CARD CREATION ---
    function createTaskCard(taskId, task) {
        const card = document.createElement('div');
        card.className = 'task-card bg-white p-4 mb-4 rounded shadow cursor-move';
        card.draggable = true;
        card.dataset.taskId = taskId;
        card.dataset.approved = task.approved || 'false';
        card.dataset.status = task.status || 'backlog';
        
        // Status badges
        let statusBadge = '';
        if (task.status === 'review' && !task.approved) {
            statusBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">' +
                        '<i class="fas fa-clock mr-1"></i> Awaiting Review' +
                        '</span>';
        } else if (task.status === 'review' && task.approved) {
            statusBadge = '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">' +
                        '<i class="fas fa-check-circle mr-1"></i> Approved' +
                        '</span>';
        }
        
        // Action buttons
        let actionButtons = '';
        actionButtons += '<button class="edit-task-btn text-blue-500 hover:text-blue-700 transition-colors p-1" data-task-id="' + taskId + '" title="Edit Task">' +
                      '<i class="fas fa-edit text-sm"></i></button>';
        
        if (task.status === 'in-progress') {
            actionButtons += '<button class="review-task-btn text-purple-500 hover:text-purple-700 transition-colors p-1" ' +
                          'data-task-id="' + taskId + '" title="Mark as Ready for Review">' +
                          '<i class="fas fa-clipboard-check text-sm"></i></button>';
        }
        
        if (task.status === 'review' && !task.approved) {
            actionButtons += '<button class="approve-task-btn text-green-500 hover:text-green-700 transition-colors p-1" ' +
                          'data-task-id="' + taskId + '" title="Approve Task">' +
                          '<i class="fas fa-check text-sm"></i></button>';
        }
        
        actionButtons += '<button class="delete-task-btn text-red-500 hover:text-red-700 transition-colors p-1" data-task-id="' + taskId + '" title="Delete Task">' +
                       '<i class="fas fa-trash text-sm"></i></button>';
        
        // Assigned members
        let assignedMembers = '';
        if (task.assignedTeamMembers && task.assignedTeamMembers.length > 0) {
            assignedMembers = task.assignedTeamMembers.map(member => {
                const memberType = member.type === 'admin' ? 'purple' : 'blue';
                const memberIcon = member.type === 'admin' ? 'fa-user-shield' : 'fa-user-tag';
                const memberName = escapeHTML((member.name || member.email || 'Member').split(' ')[0]);
                const fullName = escapeHTML(member.name || member.email || 'Team member');
                
                return '<span class="bg-' + memberType + '-100 text-' + memberType + '-800 px-2 py-0.5 rounded-full flex items-center text-xs" ' +
                       'title="' + fullName + ' (' + member.type + ')">' +
                       '<i class="fas ' + memberIcon + ' mr-1"></i>' + memberName + '</span>';
            }).join('');
        } else {
            assignedMembers = '<span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">Unassigned</span>';
        }
        
        // Build card HTML
        card.innerHTML = '<div class="flex justify-between items-start mb-2">' +
            '<div class="flex-1 min-w-0">' +  // Added min-w-0 to prevent text overflow
                '<h4 class="font-semibold text-sm truncate">' + escapeHTML(task.title || 'Untitled Task') + '</h4>' +
                (statusBadge ? '<div class="mt-1">' + statusBadge + '</div>' : '') +
            '</div>' +
            '<div class="flex space-x-1">' + actionButtons + '</div>' +  // Reduced space between buttons
        '</div>' +
        (task.description ? '<p class="text-xs text-gray-600 mb-2 line-clamp-2 break-words">' + escapeHTML(task.description) + '</p>' : '') +
        '<div class="flex justify-between items-center text-xs text-gray-500">' +
            '<span class="truncate mr-2">' + (task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date') + '</span>' +
            '<div class="flex items-center space-x-1 flex-shrink-0">' +  // Prevent flex items from growing
                assignedMembers +
                '<span class="px-1.5 py-0.5 rounded ' + getPriorityClass(task.priority) + ' text-xxs">' +
                    (task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Medium') +
                '</span>' +
            '</div>' +
        '</div>';
        
        // Add event listeners for task actions
        card.querySelector('.edit-task-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            editTask(taskId);
        });
        
        card.querySelector('.delete-task-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            confirmDeleteTask(taskId);
        });
        
        const approveBtn = card.querySelector('.approve-task-btn');
        if (approveBtn) {
            approveBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const isApproving = !task.approved;
                try {
                    await db.collection('tasks').doc(taskId).update({
                        approved: isApproving,
                        approvedAt: isApproving ? new Date().toISOString() : null,
                        updatedAt: new Date().toISOString(),
                        ...(isApproving && { status: 'review' }) // Ensure status is review when approving
                    });
                    showToast(`Task ${isApproving ? 'approved' : 'unapproved'} successfully!`, 'success');
                    loadTasks();
                } catch (error) {
                    console.error('Error updating task approval:', error);
                    showToast(`Failed to ${isApproving ? 'approve' : 'unapprove'} task. Please try again.`, 'error');
                }
            });
        }
        
        const reviewBtn = card.querySelector('.review-task-btn');
        if (reviewBtn) {
            reviewBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    await db.collection('tasks').doc(taskId).update({
                        status: 'review',
                        approved: false,
                        updatedAt: new Date().toISOString()
                    });
                    showToast('Task marked as ready for review!', 'success');
                    loadTasks();
                } catch (error) {
                    console.error('Error updating task status:', error);
                    showToast('Failed to mark task for review. Please try again.', 'error');
                }
            });
        }
        
        return card;
    }

    // --- HELPER FUNCTIONS ---
    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getPriorityClass(priority) {
        const classes = {
            'high': 'bg-red-100 text-red-800',
            'medium': 'bg-yellow-100 text-yellow-800',
            'low': 'bg-green-100 text-green-800'
        };
        return classes[priority?.toLowerCase()] || 'bg-gray-100 text-gray-800';
    }

    // --- TASK APPROVAL ---
    async function approveTask(taskId) {
        try {
            await db.collection('tasks').doc(taskId).update({
                approved: true,
                approvedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            showToast('Task approved!', 'success');
            loadTasks();
        } catch (error) {
            console.error('Error approving task:', error);
            showToast('Failed to approve task. Please try again.', 'error');
        }
    }

    // --- MODAL MANAGEMENT ---
    function showModal(title, content, onSubmit, submitText = 'Save') {
        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        // Check if content is already wrapped in a form
        const formContent = content.trim().startsWith('<form') ? 
            content : 
            `<form id="task-form" class="space-y-4">${content}</form>`;
        
        // Modal content
        modal.innerHTML = `
            <div class="bg-white rounded-lg w-full max-w-md mx-4">
                <div class="p-6">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">${title}</h3>
                    ${formContent}
                    <div class="mt-6 flex justify-end space-x-3">
                        <button type="button" class="cancel-btn px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" form="task-form" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            ${submitText}
                        </button>
                    </div>
                </div>
            </div>`;

        // Add to document
        document.body.appendChild(modal);
        
        // Handle form submission
        const form = modal.querySelector('form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                // If the onSubmit function returns false, don't close the modal
                const shouldClose = await Promise.resolve(onSubmit());
                if (shouldClose !== false) {
                    modal.remove();
                }
            } catch (error) {
                console.error('Error in form submission:', error);
                showToast('An error occurred. Please try again.', 'error');
            }
        });

        // Handle cancel button
        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            modal.remove();
        });
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Focus first input when modal opens
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }


    // --- TASK MANAGEMENT FUNCTIONS ---
    async function addTask(status = 'backlog') {
        const teamMembers = await fetchTeamMembers();
        
        // Create team member options for the select dropdown
        const teamMemberOptions = teamMembers.map(member => `
            <div class="flex items-center p-2 hover:bg-gray-50 rounded">
                <input type="checkbox" id="member-${member.id}" 
                       name="assignedTeamMembers" 
                       value="${member.id}"
                       class="h-4 w-4 text-${member.type === 'admin' ? 'purple' : 'blue'}-600 focus:ring-${member.type === 'admin' ? 'purple' : 'blue'}-500 border-gray-300 rounded">
                <label for="member-${member.id}" class="ml-2 text-sm text-gray-700 flex items-center">
                    ${escapeHTML(member.displayName || member.email || `User ${member.id.substring(0, 6)}`)}
                    ${member.type === 'admin' ? 
                        '<span class="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800">Admin</span>' : 
                        ''
                    }
                </label>
            </div>`
        ).join('');
        
        const formContent = `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div class="col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input type="text" name="title" class="w-full p-2 border rounded" required>
                    </div>
                    <div class="col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea name="description" rows="3" class="w-full p-2 border rounded"></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select name="status" id="task-status" class="w-full p-2 border rounded text-sm" required>
                            <option value="backlog">Backlog</option>
                            <option value="in-progress">In Progress</option>
                            <option value="review">Review (Requires Approval)</option>
                            <option value="done" disabled>Done (Must be approved first)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select name="priority" class="w-full p-2 border rounded text-sm">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                        <input type="date" name="dueDate" class="w-full p-2 border rounded text-sm">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                        <div class="relative">
                            <div class="mt-1 border rounded-md p-2 max-h-40 overflow-y-auto">
                                ${teamMemberOptions.length > 0 ? teamMemberOptions : 
                                    '<p class="text-sm text-gray-500">No team members found</p>'
                                }
                            </div>
                            <p class="mt-1 text-xs text-gray-500">Select team members to assign</p>
                        </div>
                    </div>
                </div>
            </div>`;

        showModal('Add New Task', formContent, async (formData) => {
            try {
                // Process assigned team members
                const assignedTeamMembers = [];
                const formElements = document.forms['task-form'].elements['assignedTeamMembers'];
                const selectedMembers = Array.isArray(formElements) ? 
                    formElements.filter(el => el.checked).map(el => el.value) :
                    (formElements.checked ? [formElements.value] : []);
                
                // Get member details from cache
                const teamMembers = await fetchTeamMembers();
                selectedMembers.forEach(memberId => {
                    const member = teamMembers.find(m => m.id === memberId);
                    if (member) {
                        assignedTeamMembers.push({
                            id: member.id,
                            name: member.displayName || member.email,
                            email: member.email,
                            type: member.type
                        });
                    }
                });
                
                await db.collection('tasks').add({
                    ...formData,
                    assignedTeamMembers,
                    approved: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                showToast('Task added successfully!', 'success');
                loadTasks();
            } catch (error) {
                console.error('Error adding task:', error);
                showToast('Failed to add task. Please try again.', 'error');
            }
        }, 'Add Task');
    }

    async function editTask(taskId) {
        try {
            const [taskDoc, teamMembers] = await Promise.all([
                db.collection('tasks').doc(taskId).get(),
                fetchTeamMembers()
            ]);
            
            if (!taskDoc.exists) {
                throw new Error('Task not found');
            }

            const task = taskDoc.data();
            const isApproved = task.approved || false;
            const isReview = task.status === 'review';
            const isDone = task.status === 'done';
            
            // Create team member options for the select dropdown
            const teamMemberOptions = teamMembers.map(member => {
                const isAssigned = task.assignedTeamMembers?.some(m => m.id === member.id) || false;
                return `
                <div class="flex items-center p-2 hover:bg-gray-50 rounded">
                    <input type="checkbox" 
                           id="edit-member-${member.id}" 
                           name="assignedTeamMembers" 
                           value="${member.id}"
                           ${isAssigned ? 'checked' : ''}
                           class="h-4 w-4 text-${member.type === 'admin' ? 'purple' : 'blue'}-600 focus:ring-${member.type === 'admin' ? 'purple' : 'blue'}-500 border-gray-300 rounded">
                    <label for="edit-member-${member.id}" class="ml-2 text-sm text-gray-700 flex items-center">
                        ${escapeHTML(member.displayName || member.email || `User ${member.id.substring(0, 6)}`)}
                        ${member.type === 'admin' ? 
                            '<span class="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800">Admin</span>' : 
                            ''
                        }
                    </label>
                </div>`;
            }).join('');

            const formContent = `
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input type="text" name="title" value="${escapeHTML(task.title || '')}" class="w-full p-2 border rounded" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea name="description" rows="3" class="w-full p-2 border rounded">${escapeHTML(task.description || '')}</textarea>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select name="status" id="task-status" class="w-full p-2 border rounded" ${isDone ? 'disabled' : ''} required>
                                <option value="backlog" ${task.status === 'backlog' ? 'selected' : ''}>Backlog</option>
                                <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                                <option value="review" ${task.status === 'review' ? 'selected' : ''}>
                                    ${isReview && isApproved ? '✓ ' : ''}Review ${isReview && isApproved ? '(Approved)' : ''}
                                </option>
                                <option value="done" ${task.status === 'done' ? 'selected' : ''} ${!isApproved ? 'disabled' : ''}>
                                    ${isApproved ? '✓ ' : ''}Done ${!isApproved ? '(Needs Approval)' : ''}
                                </option>
                            </select>
                            ${isReview && !isApproved ? `
                                <p class="mt-1 text-xs text-yellow-600">
                                    <i class="fas fa-info-circle mr-1"></i> This task is awaiting admin approval
                                </p>
                            ` : ''}
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <select name="priority" class="w-full p-2 border rounded">
                                <option value="Low" ${task.priority === 'Low' ? 'selected' : ''}>Low</option>
                                <option value="Medium" ${!task.priority || task.priority === 'Medium' ? 'selected' : ''}>Medium</option>
                                <option value="High" ${task.priority === 'High' ? 'selected' : ''}>High</option>
                            </select>
                        </div>
                    </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                            <input type="date" name="dueDate" value="${task.dueDate || ''}" class="w-full p-2 border rounded">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                            <div class="mt-1">
                                <div class="border rounded-md p-2 max-h-40 overflow-y-auto">
                                    ${teamMemberOptions.length > 0 ? teamMemberOptions : 
                                        '<p class="text-sm text-gray-500">No team members found</p>'
                                    }
                                </div>
                                <p class="mt-1 text-xs text-gray-500">Select team members to assign</p>
                            </div>
                        </div>
                    </div>
                </div>`;

            // Create the form content with the form element
            const formHtml = `
                <form id="task-edit-form" class="space-y-4">
                    ${formContent}
                </form>`;
            
            // Show the modal with the form
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-lg w-full max-w-md mx-4">
                    <div class="p-6">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">Edit Task</h3>
                        ${formHtml}
                        <div class="mt-6 flex justify-end space-x-3">
                            <button type="button" class="cancel-btn px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                                Cancel
                            </button>
                            <button type="submit" form="task-edit-form" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                Update Task
                            </button>
                        </div>
                    </div>
                </div>`;

            // Add to document
            document.body.appendChild(modal);
            
            // Handle form submission
            const form = modal.querySelector('form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    // Get form data
                    const formData = Object.fromEntries(new FormData(form));
                    
                    // Process assigned team members
                    const assignedTeamMembers = [];
                    const checkboxes = form.querySelectorAll('input[name="assignedTeamMembers"]:checked');
                    const selectedMembers = Array.from(checkboxes).map(checkbox => checkbox.value);
                    
                    // Get member details from cache
                    const teamMembers = await fetchTeamMembers();
                    selectedMembers.forEach(memberId => {
                        const member = teamMembers.find(m => m.id === memberId);
                        if (member) {
                            assignedTeamMembers.push({
                                id: member.id,
                                name: member.displayName || member.email,
                                email: member.email,
                                type: member.type
                            });
                        }
                    });

                    const updateData = {
                        ...formData,
                        assignedTeamMembers,
                        updatedAt: new Date().toISOString()
                    };

                    // If status is being changed from review to done, ensure it's approved
                    if (task.status === 'review' && formData.status === 'done' && !task.approved) {
                        showToast('This task needs admin approval before it can be marked as done.', 'error');
                        return;
                    }

                    await db.collection('tasks').doc(taskId).update(updateData);
                    showToast('Task updated successfully!', 'success');
                    loadTasks();
                    modal.remove();
                } catch (error) {
                    console.error('Error updating task:', error);
                    showToast('Failed to update task. Please try again.', 'error');
                }
            });

            // Handle cancel button
            modal.querySelector('.cancel-btn').addEventListener('click', () => {
                modal.remove();
            });
            
            // Close on outside click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            // Focus first input when modal opens
            const firstInput = modal.querySelector('input, select, textarea');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        } catch (error) {
            console.error('Error editing task:', error);
            showToast('Failed to load task details. Please try again.', 'error');
        }
    }

    async function deleteTask(taskId) {
        try {
            await db.collection('tasks').doc(taskId).delete();
            showToast('Task deleted successfully!', 'success');
            loadTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
            showToast('Failed to delete task. Please try again.', 'error');
        }
    }

    function confirmDeleteTask(taskId) {
        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        // Modal content
        modal.innerHTML = `
            <div class="bg-white rounded-lg w-full max-w-md mx-4">
                <div class="p-6 text-center">
                    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                        <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Delete Task</h3>
                    <p class="text-sm text-gray-500 mb-6">
                        Are you sure you want to delete this task? This action cannot be undone.
                    </p>
                    <div class="flex justify-center space-x-4">
                        <button type="button" class="cancel-delete-btn px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Cancel
                        </button>
                        <button type="button" class="confirm-delete-btn px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                            Delete Task
                        </button>
                    </div>
                </div>
            </div>`;

        // Add to document
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.confirm-delete-btn').addEventListener('click', () => {
            deleteTask(taskId);
            modal.remove();
        });
        
        modal.querySelector('.cancel-delete-btn').addEventListener('click', () => {
            modal.remove();
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // --- DRAG AND DROP ---
    function initTaskDragAndDrop() {
        const containers = document.querySelectorAll('.tasks-container');
        let draggedItem = null;
        let draggedItemParent = null;
        let draggedItemNextSibling = null;

        // Make all task cards draggable and add event listeners
        document.querySelectorAll('.task-card').forEach(card => {
            card.draggable = true;
            
            card.addEventListener('dragstart', (e) => {
                draggedItem = e.target;
                draggedItemParent = e.target.parentNode;
                draggedItemNextSibling = e.target.nextSibling;
                
                // Add a class to the dragged item for styling
                e.target.classList.add('dragging');
                
                // Set the drag image to be the card itself
                setTimeout(() => {
                    e.target.style.opacity = '0.4';
                }, 0);
                
                // Set the drag effect
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
            });
            
            card.addEventListener('dragend', (e) => {
                e.target.style.opacity = '1';
                e.target.classList.remove('dragging');
                
                // Reset the background of all containers
                document.querySelectorAll('.tasks-container').forEach(container => {
                    container.style.background = '';
                });
            });
        });

        // Add event listeners to all task containers
        containers.forEach(container => {
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                container.style.background = 'rgba(0, 0, 0, 0.03)';
                
                // Get the task card we're hovering over
                const afterElement = getDragAfterElement(container, e.clientY);
                const draggable = document.querySelector('.dragging');
                
                if (afterElement) {
                    container.insertBefore(draggable, afterElement);
                } else {
                    container.appendChild(draggable);
                }
            });

            container.addEventListener('dragleave', (e) => {
                // Only reset background if we're leaving the container, not just moving between children
                if (!container.contains(e.relatedTarget) || e.relatedTarget === document.body) {
                    container.style.background = '';
                }
            });

            container.addEventListener('drop', async (e) => {
                e.preventDefault();
                container.style.background = '';
                
                if (!draggedItem) return;
                
                const taskId = draggedItem.dataset.taskId;
                const newStatus = container.dataset.status;
                const oldStatus = draggedItemParent?.dataset.status;
                const isApproved = draggedItem.dataset.approved === 'true';
                
                // Check if moving from review to done without approval
                if (oldStatus === 'review' && newStatus === 'done' && !isApproved) {
                    showToast('This task needs admin approval before it can be marked as done.', 'error');
                    // Reset position
                    if (draggedItemNextSibling) {
                        draggedItemParent.insertBefore(draggedItem, draggedItemNextSibling);
                    } else if (draggedItemParent) {
                        draggedItemParent.appendChild(draggedItem);
                    }
                    return;
                }
                
                // If dropped in the same container or invalid status, reset the position
                if (!taskId || !newStatus || newStatus === oldStatus) {
                    if (draggedItemNextSibling) {
                        draggedItemParent.insertBefore(draggedItem, draggedItemNextSibling);
                    } else if (draggedItemParent) {
                        draggedItemParent.appendChild(draggedItem);
                    }
                    return;
                }
                
                try {
                    // Prepare update data
                    const updateData = {
                        status: newStatus,
                        updatedAt: new Date().toISOString()
                    };
                    
                    // If moving to review, ensure approved is set to false
                    if (newStatus === 'review') {
                        updateData.approved = false;
                    }
                    
                    // If moving to done from review and not approved, prevent the move
                    if (oldStatus === 'review' && newStatus === 'done' && !isApproved) {
                        showToast('This task needs admin approval before it can be marked as done.', 'error');
                        if (draggedItemNextSibling) {
                            draggedItemParent.insertBefore(draggedItem, draggedItemNextSibling);
                        } else if (draggedItemParent) {
                            draggedItemParent.appendChild(draggedItem);
                        }
                        return;
                    }
                    
                    // Get the current task data first
                    const taskDoc = await db.collection('tasks').doc(taskId).get();
                    if (!taskDoc.exists) {
                        throw new Error('Task not found');
                    }
                    
                    // Update the task in Firestore
                    await db.collection('tasks').doc(taskId).update(updateData);
                    
                    // Update the dragged item's data attributes to reflect the new status
                    draggedItem.dataset.status = newStatus;
                    if (newStatus === 'review') {
                        draggedItem.dataset.approved = 'false';
                    } else if (newStatus === 'done') {
                        // If moving to done, ensure approved is true if coming from review
                        draggedItem.dataset.approved = 'true';
                    }
                    
                    // Update the task card UI to show/hide appropriate buttons
                    const taskData = { ...taskDoc.data(), id: taskDoc.id };
                    const updatedTask = { ...taskData, status: newStatus };
                    if (newStatus === 'review') {
                        updatedTask.approved = false;
                    }
                    
                    // Create a new card with updated status
                    const cardContent = createTaskCard(taskId, updatedTask);
                    
                    // Replace the card content while preserving the DOM element
                    while (draggedItem.firstChild) {
                        draggedItem.removeChild(draggedItem.firstChild);
                    }
                    while (cardContent.firstChild) {
                        draggedItem.appendChild(cardContent.firstChild);
                    }
                    
                    updateTaskCounts(oldStatus, newStatus);
                    showToast(`Task moved to ${newStatus.replace('-', ' ')}`, 'success');
                } catch (error) {
                    console.error('Error updating task status:', error);
                    showToast('Failed to update task status. Please try again.', 'error');
                    if (draggedItemParent) {
                        if (draggedItemNextSibling) {
                            draggedItemParent.insertBefore(draggedItem, draggedItemNextSibling);
                        } else {
                            draggedItemParent.appendChild(draggedItem);
                        }
                    }
                } finally {
                    draggedItem = null;
                    draggedItemParent = null;
                    draggedItemNextSibling = null;
                }
            });
        });
        
        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }
        
        function updateTaskCounts(oldStatus, newStatus) {
            const updateCount = (status, change) => {
                const container = document.querySelector(`.tasks-container[data-status="${status}"]`);
                if (!container) return;
                const countBadge = container.previousElementSibling?.querySelector('span');
                if (!countBadge) return;
                const currentCount = parseInt(countBadge.textContent) || 0;
                const newCount = Math.max(0, currentCount + change);
                countBadge.textContent = `${newCount} task${newCount !== 1 ? 's' : ''}`;
            };
            if (oldStatus) updateCount(oldStatus, -1);
            if (newStatus) updateCount(newStatus, 1);
        }
    }

    // --- MAIN TASKS FUNCTION ---
    async function loadTasks() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) {
            console.error('Main content element not found');
            return;
        }

        // Store the scroll position
        const scrollPosition = window.scrollY;
        
        // Clear existing content
        mainContent.innerHTML = `
            <div class="p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">Tasks</h2>
                    <button id="add-task-btn" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                        + Add Task
                    </button>
                </div>
                <div class="kanban-board grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div class="kanban-column bg-gray-50 p-4 rounded-lg border border-gray-200" data-status="backlog">
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="font-semibold text-gray-700">Backlog</h3>
                            <span class="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                                Loading...
                            </span>
                        </div>
                        <div class="tasks-container min-h-[400px] space-y-3" data-status="backlog"></div>
                    </div>
                    <div class="kanban-column bg-gray-50 p-4 rounded-lg border border-gray-200" data-status="in-progress">
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="font-semibold text-gray-700">In Progress</h3>
                            <span class="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                                Loading...
                            </span>
                        </div>
                        <div class="tasks-container min-h-[400px] space-y-3" data-status="in-progress"></div>
                    </div>
                    <div class="kanban-column bg-gray-50 p-4 rounded-lg border border-gray-200" data-status="review">
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="font-semibold text-gray-700">Review</h3>
                            <span class="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                                Loading...
                            </span>
                        </div>
                        <div class="tasks-container min-h-[400px] space-y-3" data-status="review"></div>
                    </div>
                    <div class="kanban-column bg-gray-50 p-4 rounded-lg border border-gray-200" data-status="done">
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="font-semibold text-gray-700">Done</h3>
                            <span class="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                                Loading...
                            </span>
                        </div>
                        <div class="tasks-container min-h-[400px] space-y-3" data-status="done"></div>
                    </div>
                </div>
            </div>
        `;

        try {
            // Load all tasks
            const tasksSnapshot = await db.collection('tasks').get();
            const tasksByStatus = {
                'backlog': [],
                'in-progress': [],
                'review': [],
                'done': []
            };

            // Group tasks by status
            tasksSnapshot.forEach(doc => {
                const task = { id: doc.id, ...doc.data() };
                const status = task.status || 'backlog';
                if (tasksByStatus[status]) {
                    tasksByStatus[status].push(task);
                }
            });

            // Render tasks in their respective columns
            Object.entries(tasksByStatus).forEach(([status, tasks]) => {
                const container = mainContent.querySelector(`.tasks-container[data-status="${status}"]`);
                if (container) {
                    // Update count
                    const countBadge = container.previousElementSibling.querySelector('span');
                    if (countBadge) {
                        countBadge.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;
                    }
                    
                    // Clear existing tasks
                    container.innerHTML = '';
                    
                    // Add tasks to container
                    tasks.forEach(task => {
                        container.appendChild(createTaskCard(task.id, task));
                    });
                }
            });

            // Initialize drag and drop after all tasks are rendered
            initTaskDragAndDrop();
            
            // Add event listener for the add task button
            const addTaskBtn = mainContent.querySelector('#add-task-btn');
            if (addTaskBtn) {
                addTaskBtn.addEventListener('click', () => addTask());
            }
            
            // Restore scroll position
            window.scrollTo(0, scrollPosition);
            
        } catch (error) {
            console.error('Error loading tasks:', error);
            showToast('Failed to load tasks. Please try again.', 'error');
        }
    }

    // --- TOAST NOTIFICATION ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const bgColor = type === 'error' ? 'bg-red-100 border-red-400 text-red-700' : 
                       type === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 
                       'bg-blue-100 border-blue-400 text-blue-700';
        
        toast.className = `fixed top-4 right-4 border-l-4 p-4 rounded shadow-lg ${bgColor} z-50`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Public API
    const publicAPI = {
        init: async function() {
            // Initialize drag and drop
            initTaskDragAndDrop();
        },
        loadTasks: async function() {
            try {
                await init();
                return loadTasks();
            } catch (error) {
                console.error('Error in loadTasks:', error);
                throw error;
            }
        },
        addTask: async function(status = 'backlog') {
            try {
                await init();
                return addTask(status);
            } catch (error) {
                console.error('Error in addTask:', error);
                throw error;
            }
        },
        editTask: async function(taskId) {
            try {
                await init();
                return editTask(taskId);
            } catch (error) {
                console.error('Error in editTask:', error);
                throw error;
            }
        },
        deleteTask: async function(taskId) {
            try {
                await init();
                return deleteTask(taskId);
            } catch (error) {
                console.error('Error in deleteTask:', error);
                throw error;
            }
        },
        approveTask: async function(taskId) {
            try {
                await init();
                return approveTask(taskId);
            } catch (error) {
                console.error('Error in approveTask:', error);
                throw error;
            }
        },
        showToast: function(message, type = 'info') {
            return showToast(message, type);
        }
    };

    // Make it available globally
    window.Tasks = publicAPI;
    
    return publicAPI;
})();
