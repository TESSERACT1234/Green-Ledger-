import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, X, Edit2 } from 'lucide-react';

const emptyForm = {
  accountName:'', bankName:'', accountNumber:'', ifscCode:'',
  accountType:'current', openingBalance:0, currency:'INR', notes:''
};

export default function Bank() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(emptyForm);
  const [editing, setEditing]   = useState(null);
  const [saving, setSaving]     = useState(false);

  const fetch = async () => {
    try { const r = await api.get('/bank'); setAccounts(r.data.data); }
    catch { toast.error('Failed to load bank accounts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const openAdd  = () => { setForm(emptyForm); setEditing(null); setModal(true); };
  const openEdit = (a) => { setForm({ ...emptyForm, ...a }); setEditing(a._id); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, currentBalance: editing ? undefined : form.openingBalance };
      if (editing) await api.put('/bank/' + editing, payload);
      else         await api.post('/bank', payload);
      toast.success(editing ? 'Updated!' : 'Bank account added!');
      setModal(false); fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const sf = (k,v) => setForm(f => ({ ...f, [k]: v }));
  const total = accounts.reduce((s,a) => s + (a.currentBalance || 0), 0);

  return (
    <AppLayout title="Bank Accounts">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Bank Accounts</h1>
          <p>Total Balance: <strong style={{color:'var(--primary)'}}>₹{total.toLocaleString('en-IN')}</strong></p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15}/>Add Bank Account</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'16px',marginBottom:'24px'}}>
        {accounts.map(a => (
          <div key={a._id} style={{background:'white',border:'1px solid var(--gray-200)',borderRadius:'14px',padding:'20px',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px'}}>
              <div style={{width:42,height:42,borderRadius:'10px',background:'var(--primary-pale)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px'}}>🏦</div>
              <button className="btn btn-sm btn-secondary" onClick={()=>openEdit(a)}><Edit2 size={12}/></button>
            </div>
            <div style={{fontWeight:800,fontSize:'15px',color:'var(--gray-900)',marginBottom:'4px'}}>{a.accountName}</div>
            <div style={{fontSize:'12.5px',color:'var(--gray-500)',marginBottom:'2px'}}>{a.bankName}</div>
            <div style={{fontFamily:'monospace',fontSize:'13px',color:'var(--gray-600)',marginBottom:'4px',letterSpacing:'0.05em'}}>{a.accountNumber}</div>
            {a.ifscCode && <div style={{fontSize:'11.5px',color:'var(--gray-400)',marginBottom:'14px'}}>IFSC: {a.ifscCode}</div>}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:'1px solid var(--gray-100)',paddingTop:'12px'}}>
              <div>
                <div style={{fontSize:'11px',color:'var(--gray-400)',fontWeight:600,textTransform:'uppercase'}}>Current Balance</div>
                <div style={{fontWeight:800,fontSize:'17px',color: (a.currentBalance||0) >= 0 ? 'var(--primary)' : 'var(--red)'}}>
                  ₹{(a.currentBalance||0).toLocaleString('en-IN')}
                </div>
              </div>
              <span className="badge badge-gray" style={{textTransform:'capitalize'}}>{a.accountType}</span>
            </div>
          </div>
        ))}
        {!loading && accounts.length === 0 && (
          <div style={{gridColumn:'1/-1'}}>
            <div className="empty-state"><div className="empty-icon">🏦</div><div className="empty-title">No bank accounts yet</div><div className="empty-desc">Add your HDFC, SBI, or other bank accounts to track balances.</div></div>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal modal-md">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit Bank Account' : 'Add Bank Account'}</h3>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)'}}><X size={18}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Account Nickname <span className="req">*</span></label>
                  <input required className="form-input" value={form.accountName} onChange={e=>sf('accountName',e.target.value)} placeholder="e.g. HDFC Current Account"/>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bank Name <span className="req">*</span></label>
                    <input required className="form-input" value={form.bankName} onChange={e=>sf('bankName',e.target.value)} placeholder="HDFC, SBI, ICICI…"/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Type</label>
                    <select className="form-select" value={form.accountType} onChange={e=>sf('accountType',e.target.value)}>
                      <option value="current">Current</option>
                      <option value="savings">Savings</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Account Number <span className="req">*</span></label>
                    <input required className="form-input" value={form.accountNumber} onChange={e=>sf('accountNumber',e.target.value)} placeholder="12-digit account number"/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">IFSC Code</label>
                    <input className="form-input" value={form.ifscCode} onChange={e=>sf('ifscCode',e.target.value.toUpperCase())} placeholder="HDFC0001234"/>
                  </div>
                </div>
                {!editing && (
                  <div className="form-group">
                    <label className="form-label">Opening Balance (₹)</label>
                    <input type="number" className="form-input" value={form.openingBalance} onChange={e=>sf('openingBalance',+e.target.value)}/>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner"/> : editing ? 'Update' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}