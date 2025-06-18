(function(){
  const qs=(s,el=document)=>el.querySelector(s);
  const qsa=(s,el=document)=>Array.from(el.querySelectorAll(s));
  const { firebase } = window;
  if(!firebase){console.error('[Invoices] Firebase missing');return;}
  const db=firebase.firestore();
  const auth=firebase.auth();
  window.Invoices={};

  /* --------------------- Build Section DOM -------------------- */
  Invoices.loadInvoicesSection=async function(){
    const main=document.getElementById('main-content');
    if(!main)return;
    main.innerHTML=`
      <div class="p-4 space-y-4">
        <div class="flex flex-wrap gap-2 items-center">
          <select id="invoiceStatusFilter" class="p-2 border rounded">
            <option value="all">All Statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>
          <button id="refreshInvoices" class="px-3 py-1 bg-gray-200 rounded">Refresh</button>
        </div>
        <div id="invoicesGrid" class="grid grid-cols-1 md:grid-cols-3 gap-4"></div>
      </div>`;
  };

  /* ------------------ Initialisation ------------------- */
  Invoices.initializeInvoicesSection=async function(){
    qs('#invoiceStatusFilter').addEventListener('change',Invoices.loadAndFilterInvoices);
    qs('#refreshInvoices').addEventListener('click',Invoices.loadAndFilterInvoices);
    await Invoices.loadAndFilterInvoices();
  };

  /* ----------------- Load & Filter -------------------- */
  Invoices.loadAndFilterInvoices=async function(){
    const grid=qs('#invoicesGrid');
    if(!grid)return;
    grid.innerHTML='<div class="col-span-3 text-center py-4">Loading...</div>';
    try{
      let query=db.collection('invoices');
      const status=qs('#invoiceStatusFilter').value;
      if(status!=='all')query=query.where('status','==',status);
      const snap=await query.get();
      if(snap.empty){grid.innerHTML='<div class="col-span-3 text-center py-6">No invoices found</div>';return;}
      grid.innerHTML='';
      snap.forEach(doc=>{
        grid.appendChild(Invoices.createInvoiceCard(doc.id,doc.data()));
      });
    }catch(e){
      console.error('[Invoices] load',e);
      grid.innerHTML='<div class="col-span-3 text-center py-6 text-red-600">Failed to load invoices.</div>';
    }
  };

  /* ----------------- Card Builder -------------------- */
  Invoices.createInvoiceCard=function(id,data){
    const div=document.createElement('div');
    div.className='border rounded p-4 shadow-sm bg-white flex flex-col';
    div.innerHTML=`
      <h3 class="font-semibold text-lg mb-2 truncate">Invoice #${id.slice(0,6)}</h3>
      <p class="text-sm text-gray-600 mb-1">Contract: ${data.contractName||data.contractId}</p>
      <p class="text-sm text-gray-600 mb-1">Amount: $${(data.amount||0).toFixed(2)}</p>
      <p class="text-sm text-gray-600 mb-1">Status: <span class="font-medium">${data.status}</span></p>
      <p class="text-sm text-gray-600 mb-4">Due: ${data.dueDate?new Date(data.dueDate.seconds?data.dueDate.seconds*1000:data.dueDate).toLocaleDateString():''}</p>
      <div class="mt-auto space-x-2">
        <button class="markPaidBtn bg-green-600 text-white px-3 py-1 rounded text-sm" ${data.status==='paid'?'disabled':''}>Mark Paid</button>
      </div>`;
    qs('.markPaidBtn',div)?.addEventListener('click',()=>Invoices.markInvoicePaid(id));
    return div;
  };

  /* ----------------- Mark Paid -------------------- */
  Invoices.markInvoicePaid=async function(id){
    if(!confirm('Mark this invoice as paid?'))return;
    try{
      await db.collection('invoices').doc(id).update({status:'paid',paidAt:new Date()});
      await db.collection('contracts').doc(id).update({status:'done'});
      Invoices.loadAndFilterInvoices();
      if(window.Contracts)window.Contracts.loadAndFilterContracts();
    }catch(e){
      console.error('[Invoices] markPaid',e);
      alert('Failed to mark paid.');
    }
  };

})();
