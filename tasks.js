// Tasks Module
(function() {
    'use strict';
    
    // Reference to Firebase Firestore
    const db = firebase.firestore();

    // --- TASK CARD CREATION ---
    function createTaskCard(taskId, task) {
        const card = document.createElement('div');
        card.className = 'task-card bg-white p-4 mb-4 rounded shadow cursor-move';
        card.draggable = true;
        card.dataset.taskId = taskId;
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h4 class="font-semibold">${escapeHTML(task.title || 'Untitled Task')}</h4>
                <div class="flex space-x-2">
                    <button class="edit-task-btn text-blue-500 hover:text-blue-700" data-task-id="${taskId}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-task-btn text-red-500 hover:text-red-700" data-task-id="${taskId}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <p class="text-sm text-gray-600 mb-3">${escapeHTML(task.description || '')}</p>
            <div class="flex justify-between items-center text-xs text-gray-500">
                <span>${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span>
                <span class="px-2 py-1 rounded ${getPriorityClass(task.priority)}">${task.priority || 'Medium'}</span>
            </div>
        `;
        
        // Add event listeners for edit and delete buttons
        card.querySelector('.edit-task-btn')?.addEventListener('click', () => editTask(taskId));
        card.querySelector('.delete-task-btn')?.addEventListener('click', () => confirmDeleteTask(taskId));
        
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

    // --- TASK MANAGEMENT FUNCTIONS ---
    async function addTask(status = 'backlog') {
        const formContent = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input type="text" name="title" class="w-full p-2 border rounded" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea name="description" rows="3" class="w-full p-2 border rounded"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select name="status" class="w-full p-2 border rounded" required>
                            <option value="backlog">Backlog</option>
                            <option value="in-progress">In Progress</option>
                            <option value="review">Review</option>
                            <option value="done">Done</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                        <select name="priority" class="w-full p-2 border rounded">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input type="date" name="dueDate" class="w-full p-2 border rounded">
                </div>
            </div>
        `;

        showModal('Add New Task', formContent, async (formData) => {
            try {
                await db.collection('tasks').add({
                    ...formData,
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
            const taskDoc = await db.collection('tasks').doc(taskId).get();
            if (!taskDoc.exists) {
                throw new Error('Task not found');
            }

            const task = taskDoc.data();
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
                            <select name="status" class="w-full p-2 border rounded" required>
                                <option value="backlog" ${task.status === 'backlog' ? 'selected' : ''}>Backlog</option>
                                <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                                <option value="review" ${task.status === 'review' ? 'selected' : ''}>Review</option>
                                <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <select name="priority" class="w-full p-2 border rounded">
                                <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                                <option value="medium" ${!task.priority || task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                                <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                        <input type="date" name="dueDate" value="${task.dueDate || ''}" class="w-full p-2 border rounded">
                    </div>
                </div>
            `;

            showModal('Edit Task', formContent, async (formData) => {
                try {
                    await db.collection('tasks').doc(taskId).update({
                        ...formData,
                        updatedAt: new Date().toISOString()
                    });
                    showToast('Task updated successfully!', 'success');
                    loadTasks();
                } catch (error) {
                    console.error('Error updating task:', error);
                    showToast('Failed to update task. Please try again.', 'error');
                }
            }, 'Update Task');
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
        if (confirm('Are you sure you want to delete this task?')) {
            deleteTask(taskId);
        }
    }

    // --- DRAG AND DROP ---
    function initTaskDragAndDrop() {
        const containers = document.querySelectorAll('.tasks-container');
        let draggedItem = null;

        containers.forEach(container => {
            container.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('task-card')) {
                    draggedItem = e.target;
                    setTimeout(() => {
                        e.target.style.opacity = '0.4';
                    }, 0);
                }
            });

            container.addEventListener('dragend', (e) => {
                if (e.target.classList.contains('task-card')) {
                    e.target.style.opacity = '1';
                    draggedItem = null;
                }
            });

            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (e.target.classList.contains('tasks-container')) {
                    e.target.style.background = 'rgba(0, 0, 0, 0.05)';
                }
            });

            container.addEventListener('dragleave', (e) => {
                if (e.target.classList.contains('tasks-container')) {
                    e.target.style.background = '';
                }
            });

            container.addEventListener('drop', async (e) => {
                e.preventDefault();
                e.target.style.background = '';
                
                if (draggedItem && e.target.classList.contains('tasks-container')) {
                    const taskId = draggedItem.dataset.taskId;
                    const newStatus = e.target.closest('.kanban-column').dataset.status;
                    
                    try {
                        await db.collection('tasks').doc(taskId).update({
                            status: newStatus,
                            updatedAt: new Date().toISOString()
                        });
                        
                        // Move the card visually
                        e.target.appendChild(draggedItem);
                        showToast('Task status updated!', 'success');
                    } catch (error) {
                        console.error('Error updating task status:', error);
                        showToast('Failed to update task status. Please try again.', 'error');
                    }
                }
            });
        });
    }

    // --- MODAL FUNCTIONS ---
    function showModal(title, content, onSubmit, submitText = 'Save') {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        modal.innerHTML = `
            <div class="bg-white rounded-lg w-full max-w-md mx-4">
                <div class="p-6">
                    <h3 class="text-xl font-semibold mb-4">${title}</h3>
                    <form id="modal-form" class="space-y-4">
                        ${content}
                        <div class="flex justify-end space-x-3 mt-6">
                            <button type="button" class="px-4 py-2 text-gray-600 hover:text-gray-800 cancel-btn">
                                Cancel
                            </button>
                            <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                                ${submitText}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        const form = modal.querySelector('form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = {};
            Array.from(form.elements).forEach(element => {
                if (element.name) {
                    formData[element.name] = element.value;
                }
            });
            onSubmit(formData);
            modal.remove();
        });

        modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
    }

    // --- MAIN TASKS FUNCTION ---
    async function loadTasks() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold">Tasks</h2>
                    <button id="add-task-btn" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        + Add Task
                    </button>
                </div>
                <div class="kanban-board grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div class="kanban-column bg-gray-50 p-4 rounded-lg" data-status="backlog">
                        <h3 class="font-semibold mb-3 text-gray-700">Backlog</h3>
                        <div class="tasks-container min-h-[400px]"></div>
                    </div>
                    <div class="kanban-column bg-gray-50 p-4 rounded-lg" data-status="in-progress">
                        <h3 class="font-semibold mb-3 text-gray-700">In Progress</h3>
                        <div class="tasks-container min-h-[400px]"></div>
                    </div>
                    <div class="kanban-column bg-gray-50 p-4 rounded-lg" data-status="review">
                        <h3 class="font-semibold mb-3 text-gray-700">Review</h3>
                        <div class="tasks-container min-h-[400px]"></div>
                    </div>
                    <div class="kanban-column bg-gray-50 p-4 rounded-lg" data-status="done">
                        <h3 class="font-semibold mb-3 text-gray-700">Done</h3>
                        <div class="tasks-container min-h-[400px]"></div>
                    </div>
                </div>
            </div>
        `;

        try {
            // Load all tasks
            const tasksSnapshot = await db.collection('tasks').get();
            tasksSnapshot.forEach(doc => {
                const task = doc.data();
                const status = task.status || 'backlog';
                const container = mainContent.querySelector(`.kanban-column[data-status="${status}"] .tasks-container`);
                if (container) {
                    container.appendChild(createTaskCard(doc.id, task));
                }
            });

            // Initialize drag and drop
            initTaskDragAndDrop();
            
            // Add event listener for the add task button
            const addTaskBtn = mainContent.querySelector('#add-task-btn');
            if (addTaskBtn) {
                addTaskBtn.addEventListener('click', () => addTask());
            }
            
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
    
    // --- PUBLIC API ---
    window.Tasks = {
        loadTasks,
        addTask,
        editTask,
        deleteTask,
        confirmDeleteTask,
        initTaskDragAndDrop,
        showToast
    };
    
    // Make loadTasks available globally for backward compatibility
    window.loadTasks = loadTasks;
})();
