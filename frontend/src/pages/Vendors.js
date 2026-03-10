import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, X } from 'lucide-react';

const INDIAN_STATES = [
  { code:'24',name:'Gujarat' },{ code:'27',name:'Maharashtra' },{ code:'07',name:'Delhi' },
  { code:'29',name:'Karnataka' },{ code:'33',name:'Tamil Nadu' },{ code:'06',name:'Haryana' },
  { code:'09',name:'Uttar Pradesh' },{ code:'19',name:'West Bengal' },{ code:'32',name:'Kerala' },
  { code:'08',name:'Rajasthan' },{ code:'28',name:'Andhra Pradesh' },{ code:'36',name:'Telangana' },
];

const emptyForm = {
  name:'', email:'', phone:'', gstin:'', stateCode:'24', stateName:'Gujarat',
  openingBalance:0, paymentTerms:30, notes:'',
  billingAddress:{ line1:'', city:'', state:'Gujarat', pincode:'' }
};

export default function Vendors() {
  const [vendors, setVendors]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(emptyForm);
  const [editing, setEditing]   = useState(null);
  const [saving, setSaving]     = useState(false);

  const fetchVendors = async () => {
    try {
      const r = await api.get('/vendors', { params: { search, limit: 200 } });
      setVendors(r.data.data);
    } catch { toast.error('Failed to load vendors'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVendors(); }, [search]);

  const openAdd  = () => { setForm(emptyForm); setEditing(null); setModal(true); };
  const openEdit = (v) => { setForm({ ...emptyForm, ...v, billingAddress: v.billingAddress || emptyForm.billingAddress }); setEditing(v._id); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const state = INDIAN_STATES.find(s => s.code === form.stateCode);
      const payload = { ...form, stateName: state?.name || form.stateName };
      if (editing) await api.put('/vendors/' + editing, payload);
      else         await api.post('/vendors', payload);
      toast.success(editing ? 'Vendor updated!' : 'Vendor added!');
      setModal(false); fetchVendors();
    } catch (e) { toast.error(e.response?.data?.message || 'Error saving vendor'); }
    finally { setSaving(false); }
  };

  const sf      = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setAddr = (k, v) => setForm(f => ({ ...f, billingAddress: { ...f.billingAddress, [k]: v } }));

  return (
    <AppLayout title="Vendors">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Vendors</h1>
          <p>{vendors.length} vendors registered</p>
        </div>
        <div className="page-header-right">
          <div className="search-bar">
            <Search size={14} color="var(--gray-400)"/>
            <input placeholder="Search vendors…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15}/>Add Vendor</button>
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
                ? <tr><td colSpan={7} style={{textAlign:'center',padding:'32px'}}><div className="spinner" style={{margin:'0 auto'}}/></td></tr>
                : vendors.length === 0
                ? <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">🚚</div><div className="empty-title">No vendors yet</div><div className="empty-desc">Add your raw material suppliers to get started.</div></div></td></tr>
                : vendors.map(v => (
                <tr key={v._id}>
                  <td style={{fontWeight:600,color:'var(--gray-900)'}}>{v.name}</td>
                  <td className="td-mono">{v.gstin || '—'}</td>
                  <td>{v.phone || '—'}</td>
                  <td>{v.stateName || '—'}</td>
                  <td className="td-amount">Rs.{(v.openingBalance||0).toLocaleString('en-IN')}</td>
                  <td><span className={`badge ${v.isActive?'badge-success':'badge-gray'}`}>{v.isActive?'Active':'Inactive'}</span></td>
                  <td><button className="btn btn-sm btn-secondary" onClick={() => openEdit(v)}><Edit2 size={12}/>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit Vendor' : 'Add Vendor'}</h3>
              <button onClick={() => setModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)'}}><X size={18}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Vendor Name <span className="req">*</span></label><input className="form-input" required value={form.name} onChange={e=>sf('name',e.target.value)} placeholder="Supplier company name"/></div>
                  <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e=>sf('email',e.target.value)}/></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e=>sf('phone',e.target.value)}/></div>
                  <div className="form-group"><label className="form-label">GSTIN</label><input className="form-input" value={form.gstin} onChange={e=>sf('gstin',e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15}/></div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <select className="form-select" value={form.stateCode} onChange={e => { const s=INDIAN_STATES.find(x=>x.code===e.target.value); sf('stateCode',e.target.value); sf('stateName',s?.name||''); }}>
                      {INDIAN_STATES.map(s=><option key={s.code} value={s.code}>{s.code} - {s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Payment Terms (days)</label><input className="form-input" type="number" value={form.paymentTerms} onChange={e=>sf('paymentTerms',+e.target.value)}/></div>
                </div>
                <div className="form-group"><label className="form-label">Opening Balance (Rs.)</label><input className="form-input" type="number" value={form.openingBalance} onChange={e=>sf('openingBalance',+e.target.value)}/></div>
                <div className="divider"/>
                <div style={{fontWeight:700,fontSize:'13px',color:'var(--gray-600)',marginBottom:'12px'}}>Billing Address</div>
                <div className="form-group"><label className="form-label">Address Line 1</label><input className="form-input" value={form.billingAddress.line1} onChange={e=>setAddr('line1',e.target.value)}/></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">City</label><input className="form-input" value={form.billingAddress.city} onChange={e=>setAddr('city',e.target.value)}/></div>
                  <div className="form-group"><label className="form-label">Pincode</label><input className="form-input" value={form.billingAddress.pincode} onChange={e=>setAddr('pincode',e.target.value)} maxLength={6}/></div>
                </div>
                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" rows={2} value={form.notes} onChange={e=>sf('notes',e.target.value)}/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner"/> : editing ? 'Update Vendor' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}