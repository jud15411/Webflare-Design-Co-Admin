// contracts-remake.js – clean rebuild of Contracts module
// --------------------------------------------------------
(function () {
  // Prevent duplicate initialization
  if (window.Contracts && window.Contracts.__initialized) return;

  // Dependencies ----------------------------------------------------------------
  if (!window.firebase || !window.firebase.firestore) {
    console.error('[Contracts] Firebase SDK not found. Ensure firebase-config.js is loaded first.');
    return;
  }
  const db   = firebase.firestore();
  const auth = firebase.auth();

  if (!window.AWSUtils) {
    console.warn('[Contracts] AWSUtils not found. File upload features disabled.');
  }

  // Helper ----------------------------------------------------------------------
  const qs = (sel, scp = document) => scp.querySelector(sel);
  const qsa = (sel, scp = document) => Array.from(scp.querySelectorAll(sel));

  function showToast(msg, type = 'info', ms = 3000) {
    const colors = { info: 'bg-blue-500', success: 'bg-green-600', error: 'bg-red-600' };
    const t = document.createElement('div');
    t.className = `fixed bottom-4 right-4 z-50 px-4 py-2 rounded shadow text-white ${colors[type]||colors.info} opacity-0 transition-opacity`;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(()=>t.classList.remove('opacity-0'));
    if (ms>0) setTimeout(()=>{t.classList.add('opacity-0'); setTimeout(()=>t.remove(),300);},ms);
    return t;
  }

  // Core Namespace --------------------------------------------------------------
  const Contracts = (window.Contracts = { __initialized: true });

  /* ----------------------------- Section scaffold ---------------------------- */
  Contracts.loadContractsSection = () => {
    const main = qs('#main-content');
    if (!main) { console.error('[Contracts] #main-content not found'); return; }

    main.innerHTML = `
      <div class="p-6 space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold">Contracts</h2>
          <button id="uploadContractBtn" class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Upload Contract</button>
        </div>
        <div class="flex gap-4">
          <select id="projectFilter" class="w-64 p-2 border rounded"><option value="">All Projects</option></select>
          <select id="statusFilter"  class="w-40 p-2 border rounded">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div class="contracts-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
      </div>`;

    qs('#uploadContractBtn').addEventListener('click', Contracts.showUploadContractModal);
  };

  /* ----------------------------- Initialization ----------------------------- */
  Contracts.initializeContractsSection = async () => {
    await Contracts.loadProjectOptions();
    Contracts.setupFilterListeners();
    return Contracts.loadAndFilterContracts();
  };

  /* ----------------------------- Project Options ---------------------------- */
  Contracts.loadProjectOptions = async () => {
    const sel = qs('#projectFilter');
    if (!sel) return;
    sel.innerHTML = '<option value="">All Projects</option>';
    try {
      const snap = await db.collection('projects').orderBy('title','asc').get();
      snap.forEach(doc=>{
        const data = doc.data();
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = data.title || data.name || doc.id;
        sel.appendChild(opt);
      });
    } catch(e){ console.error('[Contracts] loadProjectOptions',e); }
  };

  Contracts.setupFilterListeners = () => {
    ['projectFilter','statusFilter'].forEach(id=>{
      const el = qs(`#${id}`);
      if (el) el.addEventListener('change', Contracts.loadAndFilterContracts);
    });
  };

  /* ----------------------------- Data Fetch --------------------------------- */
  Contracts.loadAndFilterContracts = async () => {
    const grid = qs('.contracts-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="col-span-3 text-center py-6">Loading...</div>';

    try {
      let query = db.collection('contracts');
      const proj = qs('#projectFilter').value;
      const stat = qs('#statusFilter').value;
      if (proj) query = query.where('projectId','==',proj);
      if (stat) query = query.where('status','==',stat);

      const snap = await query.orderBy('uploadedAt','desc').get();
      grid.innerHTML = '';
      if (snap.empty) {
        grid.innerHTML = '<div class="col-span-3 text-center py-6 text-gray-500">No contracts found.</div>';
        return;
      }
      snap.forEach(doc=>{
        const card = Contracts.createContractCard(doc.id, doc.data());
        grid.appendChild(card);
      });
    } catch(e){
      console.error('[Contracts] loadAndFilterContracts',e);
      grid.innerHTML = '<div class="col-span-3 text-center py-6 text-red-600">Failed to load contracts.</div>';
    }
  };

  /* ----------------------------- Card Builder ------------------------------ */
  Contracts.createContractCard = (id, data) => {
    const div = document.createElement('div');
    div.className = 'border rounded p-4 shadow-sm bg-white flex flex-col';
    div.innerHTML = `
      <h3 class="font-semibold text-lg mb-2 truncate">${data.name || 'Untitled'}</h3>
      <p class="text-sm text-gray-600 mb-1">Project: ${data.projectName || data.projectId}</p>
      <p class="text-sm text-gray-600 mb-1">Status: <span class="font-medium">${data.status}</span></p>
      <p class="text-sm text-gray-600 mb-1">Price: $${data.price?.toFixed ? data.price.toFixed(2) : (data.price || '0')}</p>
      <p class="text-sm text-gray-600 mb-4">Uploaded: ${data.uploadedAt ? new Date(data.uploadedAt.seconds*1000).toLocaleDateString(): ''}</p>
      <div class="mt-auto space-x-2">
        <button class="viewBtn bg-blue-500 text-white px-3 py-1 rounded text-sm">View</button>
        <button class="editBtn bg-yellow-500 text-white px-3 py-1 rounded text-sm">Edit</button>
        <button class="delBtn  bg-red-500 text-white px-3 py-1 rounded text-sm">Delete</button>
      </div>`;

    qs('.viewBtn', div)?.addEventListener('click',()=>Contracts.viewContract(id, data));
    qs('.editBtn', div)?.addEventListener('click',()=>Contracts.showEditContractModal(id, data));
    qs('.delBtn',  div)?.addEventListener('click',()=>Contracts.deleteContract(id, data));
    return div;
  };

  /* ----------------------------- View Modal -------------------------------- */
  Contracts.viewContract = async (id, data) => {
    const url = data.fileUrl || (window.AWSUtils && await window.AWSUtils.getSignedUrl(data.filePath));
    if (!url) { showToast('Unable to retrieve file', 'error'); return; }
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white w-11/12 md:w-3/4 h-5/6 rounded-lg shadow-lg flex flex-col">
        <div class="p-4 flex justify-between items-center border-b"><h3 class="font-semibold">${data.name}</h3><button class="text-xl" id="closeModal">×</button></div>
        <iframe src="${url}" class="flex-1 w-full"></iframe>
      </div>`;
    modal.querySelector('#closeModal').onclick = ()=>modal.remove();
    modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });
    document.body.appendChild(modal);
  };

  /* ----------------------------- Delete ------------------------------------ */
  Contracts.showDeleteConfirmation = (id, data) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 class="text-xl font-semibold mb-4">Delete Contract</h3>
        <p class="mb-6">Are you sure you want to delete this contract? This action cannot be undone.</p>
        <div class="flex justify-end space-x-3">
          <button id="cancelDelete" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
          <button id="confirmDelete" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            Delete Contract
          </button>
        </div>
      </div>
    `;

    modal.querySelector('#cancelDelete').onclick = () => modal.remove();
    modal.querySelector('#confirmDelete').onclick = async () => {
      modal.remove();
      try {
      if (data.filePath && window.AWSUtils) {
        await window.AWSUtils.deleteFile(data.filePath);
      }
      await db.collection('contracts').doc(id).delete();
      showToast('Contract deleted','success');
      Contracts.loadAndFilterContracts();
      } catch(e) {
        console.error('[Contracts] deleteContract', e);
        showToast('Failed to delete', 'error');
      }
    };

    document.body.appendChild(modal);
  };

  Contracts.deleteContract = async (id, data) => {
    Contracts.showDeleteConfirmation(id, data);
  };

  /* ----------------------------- Edit Modal ------------------------------ */
  Contracts.showEditContractModal = (id, data) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white w-11/12 md:w-1/2 p-6 rounded-lg shadow-lg">
        <h3 class="text-xl font-semibold mb-4">Edit Contract</h3>
        <form id="editForm" class="space-y-4">
          <input id="eName" type="text" value="${data.name}" class="w-full p-2 border rounded" required />
          <input id="ePrice" type="number" min="0" step="0.01" value="${data.price || 0}" class="w-full p-2 border rounded" required />
          <select id="eStatus" class="w-full p-2 border rounded">
            <option value="pending" ${data.status==='pending'?'selected':''}>Pending</option>
            <option value="active" ${data.status==='active'?'selected':''}>Active</option>
            <option value="done" ${data.status==='done'?'selected':''}>Done</option>
            <option value="expired" ${data.status==='expired'?'selected':''}>Expired</option>
          </select>
          <div class="text-right space-x-2">
            <button type="button" id="cancelEdit" class="px-4 py-2 rounded bg-gray-300">Cancel</button>
            <button type="submit" class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
          </div>
        </form>
      </div>`;
    modal.querySelector('#cancelEdit').onclick = ()=>modal.remove();
    modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });

    modal.querySelector('#editForm').addEventListener('submit', async e=>{
      e.preventDefault();
      const name = modal.querySelector('#eName').value.trim();
      const price = parseFloat(modal.querySelector('#ePrice').value);
      const status = modal.querySelector('#eStatus').value;
      if(!name || isNaN(price)) { showToast('Complete all fields','error'); return; }
      try {
        await db.collection('contracts').doc(id).update({ name, price, status, updatedAt:new Date() });
      // Sync invoice
      try {
        await db.collection('invoices').doc(id).set({
          contractId: id,
          amount: price,
          status: status==='done'?'paid':'unpaid',
          updatedAt: new Date()
        }, { merge: true });
      } catch(invErr){ console.error('[Contracts] invoice sync',invErr);}
        showToast('Updated','success');
        modal.remove();
        Contracts.loadAndFilterContracts();
      } catch(err){
        console.error('[Contracts] edit',err);
        showToast('Failed to update','error');
      }
    });

    document.body.appendChild(modal);
  };

  /* ----------------------------- Upload Modal ----------------------------- */
  Contracts.showUploadContractModal = () => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white w-11/12 md:w-1/2 p-6 rounded-lg shadow-lg">
        <h3 class="text-xl font-semibold mb-4">Upload Contract</h3>
        <form id="uploadForm" class="space-y-4">
          <input id="cName" type="text" placeholder="Contract name" class="w-full p-2 border rounded bg-gray-100" readonly />
          <select id="cProject" class="w-full p-2 border rounded" required><option value="">Select Project</option></select>
          <input id="cPrice" type="number" min="0" step="0.01" placeholder="Price" class="w-full p-2 border rounded" required />
          <select id="cStatus" class="w-full p-2 border rounded">
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="done">Done</option>
            <option value="expired">Expired</option>
          </select>
          <input id="cFile" type="file" accept=".pdf,.doc,.docx" class="w-full" required />
          <div class="text-right space-x-2">
            <button type="button" id="cancelBtn" class="px-4 py-2 rounded bg-gray-300">Cancel</button>
            <button type="submit" class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Upload</button>
          </div>
        </form>
      </div>`;
    modal.querySelector('#cancelBtn').onclick = ()=>modal.remove();
    modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });

    // generate next contract name
    (async ()=>{
      try {
        const latest=await db.collection('contracts').orderBy('index','desc').limit(1).get();
        const nextIndex=latest.empty?0:( (latest.docs[0].data().index||0)+1 );
        const contractName=`CN-${nextIndex.toString().padStart(4,'0')}`;
        modal.querySelector('#cName').value=contractName;
        modal.dataset.nextIndex=nextIndex;
      } catch(err){ console.error('[Contracts] gen name',err); }
    })();

    // populate projects
    db.collection('projects').get().then(snap=>{
      const sel = modal.querySelector('#cProject');
      snap.forEach(doc=>{
        const opt=document.createElement('option');
        opt.value=doc.id;
        opt.textContent=doc.data().title||doc.data().name||doc.id;
        sel.appendChild(opt);
      });
    });

    modal.querySelector('#uploadForm').addEventListener('submit', async e=>{
      e.preventDefault();
      if (!window.AWSUtils){ showToast('Upload disabled','error'); return; }
      const file = modal.querySelector('#cFile').files[0];
      const name = modal.querySelector('#cName').value.trim();
      const index=parseInt(modal.dataset.nextIndex||0,10);
      const proj = modal.querySelector('#cProject').value;
      const price = parseFloat(modal.querySelector('#cPrice').value);
      const status = modal.querySelector('#cStatus').value;
      if(!file||!name||!proj||isNaN(price)){ showToast('Complete all fields','error'); return; }
      const path = `contracts/${Date.now()}_${file.name}`;
      try {
        await window.AWSUtils.uploadFile(file,path);
        const url = await window.AWSUtils.getSignedUrl(path);
        const contractRef = await db.collection('contracts').add({
          name,
          index,
          projectId: proj,
          projectName: name,
          price,
          status,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          filePath: path,
          fileUrl: url,
          uploadedAt: new Date(),
          uploadedBy: { uid: auth.currentUser.uid, email: auth.currentUser.email }
        });
        // Create matching invoice (unpaid)
        try {
          await db.collection('invoices').doc(contractRef.id).set({
          contractId: contractRef.id,
          projectId: proj,
            contractId: contractRef.id,
            projectId: proj,
            amount: price,
            status: 'unpaid',
            issuedAt: new Date(),
            dueDate: new Date(Date.now() + 30*24*60*60*1000), // 30 days
            contractName: name
          });
        } catch(invErr){ console.error('[Contracts] invoice create',invErr);} 
        showToast('Uploaded','success');
        modal.remove();
        Contracts.loadAndFilterContracts();
      } catch(err){
        console.error('[Contracts] upload',err);
        showToast(err.message||'Upload failed','error');
      }
    });

    document.body.appendChild(modal);
  };

})();
