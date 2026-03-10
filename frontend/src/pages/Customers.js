import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, ToggleLeft, X } from 'lucide-react';

const INDIAN_STATES = [
  { code:'24',name:'Gujarat' },{ code:'27',name:'Maharashtra' },{ code:'07',name:'Delhi' },
  { code:'29',name:'Karnataka' },{ code:'33',name:'Tamil Nadu' },{ code:'06',name:'Haryana' },
  { code:'09',name:'Uttar Pradesh' },{ code:'19',name:'West Bengal' },{ code:'32',name:'Kerala' },
  { code:'08',name:'Rajasthan' },{ code:'28',name:'Andhra Pradesh' },{ code:'36',name:'Telangana' },
];

const emptyForm = {
  name:'', email:'', phone:'', gstin:'', stateCode:'24', stateName:'Gujarat',
  openingBalance:0, creditLimit:0, paymentTerms:30, notes:'',
  billingAddress:{ line1:'', city:'', state:'Gujarat', pincode:'' }
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [editing, setEditing]     = useState(null);
  const [saving, setSaving]       = useState(false);

  const fetchCustomers = async () => {
    try {
      const r = await api.get('/customers', { params: { search, limit: 100 } });
      setCustomers(r.data.data);
    } catch(e) { toast.error('Failed to load customers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, [search]);

  const openAdd  = () => { setForm(emptyForm); setEditing(null); setModal(true); };
  const openEdit = (c) => { setForm({ ...emptyForm, ...c, billingAddress: c.billingAddress || emptyForm.billingAddress }); setEditing(c._id); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const state = INDIAN_STATES.find(s => s.code === form.stateCode);
      const payload = { ...form, stateName: state?.name || form.stateName };
      if (editing) await api.put(`/customers/${editing}`, payload);
      else         await api.post('/customers', payload);
      toast.success(editing ? 'Customer updated!' : 'Customer added!');
      setModal(false);
      fetchCustomers();
    } catch(e) { toast.error(e.response?.data?.message || 'Error saving customer'); }
    finally { setSaving(false); }
  };

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setAddr  = (key, val) => setForm(f => ({ ...f, billingAddress: { ...f.billingAddress, [key]: val } }));

  return (
    <AppLayout title="Customers">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Customers</h1>
          <p>{customers.length} customers registered</p>
        </div>
        <div className="page-header-right">
          <div className="search-bar">
            <Search size={14} color="var(--gray-400)"/>
            <input placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15}/>Add Customer</button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr>
              <th>Name</th><th>GSTIN</th><th>Phone</th><th>State</th>
              <th>Opening Balance</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {loading
                ? <tr><td colSpan={7} style={{ textAlign:'center', padding:'32px' }}><div className="spinner" style={{ margin:'0 auto' }}/></td></tr>
                : customers.length === 0
                ? <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">👥</div><div className="empty-title">No customers found</div><div className="empty-desc">Add your first customer to get started.</div></div></td></tr>
                : customers.map(c => (
                <tr key={c._id}>
                  <td style={{ fontWeight:600, color:'var(--gray-900)' }}>{c.name}</td>
                  <td className="td-mono">{c.gstin || '—'}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.stateName || '—'}</td>
                  <td className="td-amount">₹{(c.openingBalance||0).toLocaleString('en-IN')}</td>
                  <td><span className={`badge ${c.isActive ? 'badge-success' : 'badge-gray'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(c)} style={{ gap:'4px' }}>
                      <Edit2 size={12}/>Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit Customer' : 'Add Customer'}</h3>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--gray-400)' }}><X size={18}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Customer Name <span className="req">*</span></label>
                    <input className="form-input" required value={form.name} onChange={e=>setField('name',e.target.value)} placeholder="Company or person name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={form.email} onChange={e=>setField('email',e.target.value)} placeholder="email@company.com" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={form.phone} onChange={e=>setField('phone',e.target.value)} placeholder="+91 98765 43210" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GSTIN</label>
                    <input className="form-input" value={form.gstin} onChange={e=>setField('gstin',e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">State <span className="req">*</span></label>
                    <select className="form-select" value={form.stateCode}
                      onChange={e => { const s = INDIAN_STATES.find(x=>x.code===e.target.value); setField('stateCode',e.target.value); setField('stateName',s?.name||''); }}>
                      {INDIAN_STATES.map(s => <option key={s.code} value={s.code}>{s.code} - {s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Terms (days)</label>
                    <input className="form-input" type="number" value={form.paymentTerms} onChange={e=>setField('paymentTerms',+e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Opening Balance (₹)</label>
                    <input className="form-input" type="number" value={form.openingBalance} onChange={e=>setField('openingBalance',+e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Credit Limit (₹)</label>
                    <input className="form-input" type="number" value={form.creditLimit} onChange={e=>setField('creditLimit',+e.target.value)} />
                  </div>
                </div>
                <div className="divider"/>
                <div style={{ fontWeight:700, fontSize:'13px', color:'var(--gray-600)', marginBottom:'12px' }}>Billing Address</div>
                <div className="form-group">
                  <label className="form-label">Address Line 1</label>
                  <input className="form-input" value={form.billingAddress.line1} onChange={e=>setAddr('line1',e.target.value)} placeholder="Street, Building No." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-input" value={form.billingAddress.city} onChange={e=>setAddr('city',e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Pincode</label>
                    <input className="form-input" value={form.billingAddress.pincode} onChange={e=>setAddr('pincode',e.target.value)} maxLength={6} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={2} value={form.notes} onChange={e=>setField('notes',e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner"/> : editing ? 'Update Customer' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
