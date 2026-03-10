import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, X } from 'lucide-react';

const TYPES = ['asset','liability','equity','income','expense'];
const GROUPS = {
  asset:     ['Current Assets','Fixed Assets','Other Assets'],
  liability: ['Current Liabilities','Long-term Liabilities'],
  equity:    ['Equity'],
  income:    ['Revenue','Other Income'],
  expense:   ['Cost of Goods Sold','Operating Expenses','Other Expenses'],
};
const TYPE_COLORS = { asset:'badge-info', liability:'badge-warning', equity:'badge-primary', income:'badge-success', expense:'badge-danger' };

const emptyForm = { code:'', name:'', type:'asset', group:'Current Assets', description:'' };

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterType, setFilterType] = useState('');
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(emptyForm);
  const [editing, setEditing]   = useState(null);
  const [saving, setSaving]     = useState(false);

  const fetch = async () => {
    try {
      const r = await api.get('/accounts', { params: { search, limit: 300 } });
      setAccounts(r.data.data);
    } catch { toast.error('Failed to load accounts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [search]);

  const openAdd  = () => { setForm(emptyForm); setEditing(null); setModal(true); };
  const openEdit = (a) => { setForm(a); setEditing(a._id); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await api.put('/accounts/' + editing, form);
      else         await api.post('/accounts', form);
      toast.success(editing ? 'Account updated!' : 'Account created!');
      setModal(false); fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const filtered = accounts.filter(a => !filterType || a.type === filterType);
  const totals   = TYPES.reduce((acc, t) => ({ ...acc, [t]: accounts.filter(a=>a.type===t).length }), {});

  return (
    <AppLayout title="Chart of Accounts">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Chart of Accounts</h1>
          <p>{accounts.length} accounts total</p>
        </div>
        <div className="page-header-right">
          <div className="search-bar"><Search size={14} color="var(--gray-400)"/><input placeholder="Search accounts…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15}/>Add Account</button>
        </div>
      </div>

      <div style={{display:'flex',gap:'10px',marginBottom:'16px',flexWrap:'wrap'}}>
        <button onClick={()=>setFilterType('')} className="btn btn-sm" style={{background:!filterType?'var(--primary)':'var(--gray-100)',color:!filterType?'white':'var(--gray-700)',border:'none'}}>All ({accounts.length})</button>
        {TYPES.map(t => (
          <button key={t} onClick={()=>setFilterType(t)} className="btn btn-sm" style={{background:filterType===t?'var(--primary)':'var(--gray-100)',color:filterType===t?'white':'var(--gray-700)',border:'none',textTransform:'capitalize'}}>
            {t} ({totals[t]||0})
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Code</th><th>Account Name</th><th>Type</th><th>Group</th><th>System</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading
                ? <tr><td colSpan={7} style={{textAlign:'center',padding:'32px'}}><div className="spinner" style={{margin:'0 auto'}}/></td></tr>
                : filtered.length === 0
                ? <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">📒</div><div className="empty-title">No accounts found</div></div></td></tr>
                : filtered.map(a => (
                <tr key={a._id}>
                  <td><span className="td-mono" style={{fontWeight:700,color:'var(--primary)'}}>{a.code}</span></td>
                  <td style={{fontWeight:600}}>{a.name}</td>
                  <td><span className={`badge ${TYPE_COLORS[a.type]}`} style={{textTransform:'capitalize'}}>{a.type}</span></td>
                  <td style={{color:'var(--gray-500)',fontSize:'12.5px'}}>{a.group}</td>
                  <td>{a.isSystem ? <span className="badge badge-warning">System</span> : <span style={{color:'var(--gray-300)'}}>—</span>}</td>
                  <td><span className={`badge ${a.isActive?'badge-success':'badge-gray'}`}>{a.isActive?'Active':'Inactive'}</span></td>
                  <td>{!a.isSystem && <button className="btn btn-sm btn-secondary" onClick={()=>openEdit(a)}><Edit2 size={12}/>Edit</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal modal-md">
            <div className="modal-header">
              <h3 className="modal-title">{editing?'Edit Account':'Add Account'}</h3>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)'}}><X size={18}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Account Code <span className="req">*</span></label><input required className="form-input" value={form.code} onChange={e=>sf('code',e.target.value)} placeholder="e.g. 5080"/></div>
                  <div className="form-group"><label className="form-label">Account Name <span className="req">*</span></label><input required className="form-input" value={form.name} onChange={e=>sf('name',e.target.value)} placeholder="e.g. Vehicle Expenses"/></div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Type <span className="req">*</span></label>
                    <select className="form-select" value={form.type} onChange={e=>{sf('type',e.target.value);sf('group',GROUPS[e.target.value][0]);}}>
                      {TYPES.map(t=><option key={t} value={t} style={{textTransform:'capitalize'}}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Group <span className="req">*</span></label>
                    <select className="form-select" value={form.group} onChange={e=>sf('group',e.target.value)}>
                      {(GROUPS[form.type]||[]).map(g=><option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" rows={2} value={form.description||''} onChange={e=>sf('description',e.target.value)}/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?<span className="spinner"/>:editing?'Update':'Add Account'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}