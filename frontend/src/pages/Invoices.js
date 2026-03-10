import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Search, Eye, X, Trash2 } from 'lucide-react';

const STATUS_BADGE = { draft:'badge-gray', sent:'badge-info', partial:'badge-warning', paid:'badge-success', overdue:'badge-danger', cancelled:'badge-gray' };
const ORG_STATE = '24'; // Gujarat

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [search, setSearch]     = useState('');

  const [form, setForm] = useState({
    customer: null, invoiceDate: new Date().toISOString().slice(0,10),
    dueDate: '', notes: '', terms: 'Payment due within 30 days.',
    lineItems: [{ item:'', itemName:'', hsnCode:'', qty:1, rate:0, gstRate:18, discount:0 }]
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/invoices', { params: { limit:100 } }),
      api.get('/customers', { params: { limit:200 } }),
      api.get('/items', { params: { limit:200 } })
    ]).then(([inv, cust, itm]) => {
      setInvoices(inv.data.data);
      setCustomers(cust.data.data);
      setItems(itm.data.data);
      setLoading(false);
    });
  }, []);

  const refresh = async () => {
    const r = await api.get('/invoices', { params: { limit:100 } });
    setInvoices(r.data.data);
  };

  // GST calculation
  const calcLine = (li) => {
    const taxableAmt = (li.qty * li.rate) - (li.discount || 0);
    const isIGST = form.customer?.stateCode && form.customer.stateCode !== ORG_STATE;
    const cgstAmt = isIGST ? 0 : (taxableAmt * (li.gstRate / 2) / 100);
    const sgstAmt = isIGST ? 0 : (taxableAmt * (li.gstRate / 2) / 100);
    const igstAmt = isIGST ? (taxableAmt * li.gstRate / 100) : 0;
    return { taxableAmt, cgstAmt, sgstAmt, igstAmt, total: taxableAmt + cgstAmt + sgstAmt + igstAmt };
  };

  const totals = form.lineItems.reduce((acc, li) => {
    if (!li.rate) return acc;
    const c = calcLine(li);
    return { subtotal: acc.subtotal + li.qty*li.rate, taxable: acc.taxable + c.taxableAmt,
             cgst: acc.cgst + c.cgstAmt, sgst: acc.sgst + c.sgstAmt, igst: acc.igst + c.igstAmt,
             total: acc.total + c.total };
  }, { subtotal:0, taxable:0, cgst:0, sgst:0, igst:0, total:0 });

  const setLine = (idx, key, val) => {
    const updated = [...form.lineItems];
    updated[idx] = { ...updated[idx], [key]: key==='item' ? val : (isNaN(val) ? val : +val) };
    if (key === 'item') {
      const itm = items.find(i => i._id === val);
      if (itm) updated[idx] = { ...updated[idx], itemName: itm.name, hsnCode: itm.hsnCode, rate: itm.salePrice, gstRate: itm.gstRate };
    }
    setForm(f => ({ ...f, lineItems: updated }));
  };

  const addLine = () => setForm(f => ({ ...f, lineItems: [...f.lineItems, { item:'', itemName:'', hsnCode:'', qty:1, rate:0, gstRate:18, discount:0 }] }));
  const removeLine = (idx) => setForm(f => ({ ...f, lineItems: f.lineItems.filter((_,i) => i!==idx) }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.customer) return toast.error('Select a customer');
    if (!form.lineItems.some(l => l.item && l.qty > 0)) return toast.error('Add at least one item');
    setSaving(true);
    try {
      await api.post('/invoices', form);
      toast.success('Invoice created!');
      setModal(false);
      refresh();
      setForm({ customer:null, invoiceDate:new Date().toISOString().slice(0,10), dueDate:'', notes:'', terms:'Payment due within 30 days.', lineItems:[{ item:'', itemName:'', hsnCode:'', qty:1, rate:0, gstRate:18, discount:0 }] });
    } catch(e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const filtered = invoices.filter(i => !search || i.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) || i.customerName?.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout title="Sales Invoices">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Sales Invoices</h1>
          <p>{invoices.length} total invoices</p>
        </div>
        <div className="page-header-right">
          <div className="search-bar"><Search size={14} color="var(--gray-400)"/><input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={15}/>New Invoice</button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr>
              <th>Invoice #</th><th>Customer</th><th>Date</th><th>Due Date</th>
              <th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={9} style={{ textAlign:'center', padding:'32px' }}><div className="spinner" style={{ margin:'0 auto' }}/></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={9}><div className="empty-state"><div className="empty-icon">🧾</div><div className="empty-title">No invoices yet</div><div className="empty-desc">Create your first GST invoice.</div></div></td></tr>
              : filtered.map(inv => (
                <tr key={inv._id}>
                  <td className="td-mono" style={{ fontWeight:700, color:'var(--primary)' }}>{inv.invoiceNumber}</td>
                  <td style={{ fontWeight:600 }}>{inv.customerName}</td>
                  <td>{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                  <td>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="td-amount">₹{inv.totalAmount?.toLocaleString('en-IN')}</td>
                  <td style={{ textAlign:'right', color:'var(--primary)', fontWeight:600 }}>₹{inv.paidAmount?.toLocaleString('en-IN')}</td>
                  <td style={{ textAlign:'right', color:'var(--red)', fontWeight:600 }}>₹{inv.balanceDue?.toLocaleString('en-IN')}</td>
                  <td><span className={`badge ${STATUS_BADGE[inv.status]}`}>{inv.status}</span></td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => setViewModal(inv)}><Eye size={12}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {modal && (
        <div className="modal-overlay">
          <div className="modal modal-xl">
            <div className="modal-header">
              <h3 className="modal-title">Create GST Invoice</h3>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--gray-400)' }}><X size={18}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {/* Header Fields */}
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Customer <span className="req">*</span></label>
                    <select className="form-select" value={form.customer?._id||''} onChange={e => {
                      const c = customers.find(x => x._id === e.target.value);
                      setForm(f => ({ ...f, customer: c }));
                    }}>
                      <option value="">Select customer…</option>
                      {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    {form.customer && <div style={{ fontSize:'11.5px', color:'var(--gray-400)', marginTop:'4px' }}>GSTIN: {form.customer.gstin || 'Not set'} · State: {form.customer.stateName} ({form.customer.stateCode === ORG_STATE ? 'Intra-state → CGST+SGST' : 'Inter-state → IGST'})</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Invoice Date</label>
                    <input className="form-input" type="date" value={form.invoiceDate} onChange={e=>setForm(f=>({...f,invoiceDate:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input className="form-input" type="date" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}/>
                  </div>
                </div>

                {/* Line Items */}
                <div style={{ fontWeight:700, fontSize:'13px', color:'var(--gray-700)', margin:'8px 0 12px' }}>Line Items</div>
                <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'8px' }}>
                  <thead>
                    <tr style={{ background:'var(--gray-50)' }}>
                      {['Item','HSN','Qty','Rate (₹)','Discount','GST%','Taxable','Tax Amt','Total',''].map(h=>(
                        <th key={h} style={{ padding:'8px 10px', fontSize:'11px', fontWeight:'700', textTransform:'uppercase', color:'var(--gray-500)', textAlign: ['Taxable','Tax Amt','Total'].includes(h) ? 'right' : 'left', borderBottom:'1px solid var(--gray-200)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.lineItems.map((li, idx) => {
                      const c = li.rate ? calcLine(li) : { taxableAmt:0, cgstAmt:0, sgstAmt:0, igstAmt:0, total:0 };
                      return (
                        <tr key={idx} style={{ borderBottom:'1px solid var(--gray-100)' }}>
                          <td style={{ padding:'6px 8px', minWidth:'160px' }}>
                            <select style={{ border:'1px solid var(--gray-200)', borderRadius:'6px', padding:'6px 8px', fontSize:'13px', width:'100%' }}
                              value={li.item} onChange={e=>setLine(idx,'item',e.target.value)}>
                              <option value="">Select…</option>
                              {items.map(i=><option key={i._id} value={i._id}>{i.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding:'6px 4px' }}>
                            <input style={{ border:'1px solid var(--gray-200)', borderRadius:'6px', padding:'6px 6px', fontSize:'12px', width:'72px' }} value={li.hsnCode} onChange={e=>setLine(idx,'hsnCode',e.target.value)} placeholder="HSN"/>
                          </td>
                          <td style={{ padding:'6px 4px' }}>
                            <input type="number" min="0.01" style={{ border:'1px solid var(--gray-200)', borderRadius:'6px', padding:'6px 6px', fontSize:'13px', width:'64px' }} value={li.qty} onChange={e=>setLine(idx,'qty',e.target.value)}/>
                          </td>
                          <td style={{ padding:'6px 4px' }}>
                            <input type="number" min="0" style={{ border:'1px solid var(--gray-200)', borderRadius:'6px', padding:'6px 6px', fontSize:'13px', width:'80px' }} value={li.rate} onChange={e=>setLine(idx,'rate',e.target.value)}/>
                          </td>
                          <td style={{ padding:'6px 4px' }}>
                            <input type="number" min="0" style={{ border:'1px solid var(--gray-200)', borderRadius:'6px', padding:'6px 6px', fontSize:'13px', width:'64px' }} value={li.discount} onChange={e=>setLine(idx,'discount',e.target.value)}/>
                          </td>
                          <td style={{ padding:'6px 4px' }}>
                            <select style={{ border:'1px solid var(--gray-200)', borderRadius:'6px', padding:'6px 6px', fontSize:'13px', width:'60px' }} value={li.gstRate} onChange={e=>setLine(idx,'gstRate',e.target.value)}>
                              {[0,5,12,18,28].map(r=><option key={r} value={r}>{r}%</option>)}
                            </select>
                          </td>
                          <td style={{ padding:'6px 8px', fontFamily:'monospace', fontSize:'12px', textAlign:'right' }}>₹{c.taxableAmt.toFixed(2)}</td>
                          <td style={{ padding:'6px 8px', fontFamily:'monospace', fontSize:'12px', textAlign:'right', color:'var(--gray-500)' }}>₹{(c.cgstAmt+c.sgstAmt+c.igstAmt).toFixed(2)}</td>
                          <td style={{ padding:'6px 8px', fontFamily:'monospace', fontSize:'12.5px', textAlign:'right', fontWeight:700 }}>₹{c.total.toFixed(2)}</td>
                          <td style={{ padding:'6px 4px' }}>
                            {form.lineItems.length > 1 && <button type="button" onClick={()=>removeLine(idx)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--red)', padding:'2px' }}><Trash2 size={13}/></button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}><Plus size={13}/>Add Line</button>

                {/* Totals */}
                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'16px' }}>
                  <div style={{ width:'300px', background:'var(--gray-50)', borderRadius:'10px', padding:'16px', border:'1px solid var(--gray-200)' }}>
                    <TotalRow label="Subtotal"    value={totals.subtotal} />
                    {totals.cgst > 0 && <TotalRow label="CGST" value={totals.cgst} />}
                    {totals.sgst > 0 && <TotalRow label="SGST" value={totals.sgst} />}
                    {totals.igst > 0 && <TotalRow label="IGST" value={totals.igst} />}
                    <div style={{ height:'1px', background:'var(--gray-300)', margin:'8px 0' }}/>
                    <TotalRow label="Total Amount" value={totals.total} bold />
                  </div>
                </div>

                <div className="form-row" style={{ marginTop:'16px' }}>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea className="form-textarea" rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Additional notes…"/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Terms & Conditions</label>
                    <textarea className="form-textarea" rows={2} value={form.terms} onChange={e=>setForm(f=>({...f,terms:e.target.value}))}/>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner"/> : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="modal-title">{viewModal.invoiceNumber}</h3>
              <button onClick={()=>setViewModal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--gray-400)' }}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div><div style={{ fontSize:'12px', color:'var(--gray-400)', fontWeight:600 }}>CUSTOMER</div><div style={{ fontWeight:700, marginTop:'4px' }}>{viewModal.customerName}</div><div style={{ fontSize:'12px', color:'var(--gray-500)' }}>{viewModal.customerGstin || 'No GSTIN'}</div></div>
                <div style={{ textAlign:'right' }}>
                  <span className={`badge ${STATUS_BADGE[viewModal.status]}`} style={{ fontSize:'13px', padding:'5px 14px' }}>{viewModal.status?.toUpperCase()}</span>
                  <div style={{ fontSize:'13px', color:'var(--gray-500)', marginTop:'8px' }}>Date: {new Date(viewModal.invoiceDate).toLocaleDateString('en-IN')}</div>
                </div>
              </div>
              <div className="divider"/>
              <table className="data-table">
                <thead><tr><th>Item</th><th>HSN</th><th style={{textAlign:'right'}}>Qty</th><th style={{textAlign:'right'}}>Rate</th><th style={{textAlign:'right'}}>Taxable</th><th style={{textAlign:'right'}}>Tax</th><th style={{textAlign:'right'}}>Total</th></tr></thead>
                <tbody>
                  {viewModal.lineItems?.map((li,i)=>(
                    <tr key={i}>
                      <td>{li.itemName}</td>
                      <td className="td-mono">{li.hsnCode||'—'}</td>
                      <td style={{textAlign:'right'}}>{li.qty}</td>
                      <td style={{textAlign:'right'}}>₹{li.rate?.toLocaleString('en-IN')}</td>
                      <td style={{textAlign:'right'}}>₹{li.taxableAmt?.toLocaleString('en-IN')}</td>
                      <td style={{textAlign:'right',color:'var(--gray-500)',fontSize:'12px'}}>{li.cgstAmt>0?`C:₹${li.cgstAmt.toFixed(0)} S:₹${li.sgstAmt.toFixed(0)}`:`I:₹${li.igstAmt?.toFixed(0)}`}</td>
                      <td style={{textAlign:'right',fontWeight:700}}>₹{li.totalAmt?.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'16px' }}>
                <div style={{ width:'260px' }}>
                  <TotalRow label="Taxable Amount" value={viewModal.taxableAmount}/>
                  {viewModal.cgstAmount>0 && <TotalRow label="CGST" value={viewModal.cgstAmount}/>}
                  {viewModal.sgstAmount>0 && <TotalRow label="SGST" value={viewModal.sgstAmount}/>}
                  {viewModal.igstAmount>0 && <TotalRow label="IGST" value={viewModal.igstAmount}/>}
                  <div className="divider"/>
                  <TotalRow label="Total" value={viewModal.totalAmount} bold/>
                  <TotalRow label="Paid" value={viewModal.paidAmount}/>
                  <TotalRow label="Balance Due" value={viewModal.balanceDue} bold red/>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function TotalRow({ label, value, bold, red }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize: bold?'14px':'13px', fontWeight: bold?700:500, color: red?'var(--red)':bold?'var(--gray-900)':'var(--gray-600)' }}>
      <span>{label}</span>
      <span style={{ fontFamily:'monospace' }}>₹{(value||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
    </div>
  );
}
