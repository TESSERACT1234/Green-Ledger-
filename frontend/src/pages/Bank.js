import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, X, Edit2, RefreshCw, AlertTriangle } from 'lucide-react';

const emptyForm = {
  accountName:'', bankName:'', accountNumber:'', ifscCode:'',
  accountType:'current', openingBalance:0, currency:'INR', notes:''
};

const TYPE_ICON = { current:'🏦', savings:'💰', cash:'💵' };
const TYPE_COLOR = { current:'#3b82f6', savings:'#16a34a', cash:'#92400e' };

export default function Bank() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState(emptyForm);
  const [editing, setEditing]   = useState(null);
  const [saving, setSaving]     = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      // Always use recalculated balance — matches Reports page exactly
      const r = await api.get('/bank/recalculated');
      setAccounts(r.data.data || []);
    } catch {
      // Fallback to stored balance if recalculated fails
      try {
        const r = await api.get('/bank');
        setAccounts((r.data.data || []).map(a => ({ ...a, calculatedBalance: a.currentBalance })));
      } catch { toast.error('Failed to load bank accounts'); }
    } finally { setLoading(false); }
  };

  const syncBalances = async () => {
    setRecalcLoading(true);
    try {
      // Update each account's currentBalance in DB to match calculated
      await Promise.all(accounts.map(a =>
        api.put('/bank/' + a._id, { currentBalance: a.calculatedBalance })
      ));
      toast.success('All balances synced with transactions!');
      fetchAccounts();
    } catch { toast.error('Sync failed'); }
    finally { setRecalcLoading(false); }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const openAdd  = () => { setForm(emptyForm); setEditing(null); setModal(true); };
  const openEdit = (a) => { setForm({ ...emptyForm, ...a }); setEditing(a._id); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, currentBalance: editing ? undefined : +form.openingBalance };
      if (editing) await api.put('/bank/' + editing, payload);
      else         await api.post('/bank', payload);
      toast.success(editing ? 'Updated!' : 'Bank account added!');
      setModal(false); fetchAccounts();
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const sf = (k,v) => setForm(f => ({ ...f, [k]: v }));

  const total     = accounts.reduce((s,a) => s + (a.calculatedBalance || 0), 0);
  const hasMismatch = accounts.some(a => Math.abs((a.calculatedBalance||0) - (a.currentBalance||0)) > 1);

  return (
    <AppLayout title="Bank Accounts">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Bank Accounts</h1>
          <p>Total Balance: <strong style={{color:'var(--primary)'}}>₹{total.toLocaleString('en-IN')}</strong></p>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          {hasMismatch && (
            <button className="btn btn-secondary" onClick={syncBalances} disabled={recalcLoading}
              style={{background:'#fff8f0',border:'1px solid #fed7aa',color:'#92400e',display:'flex',alignItems:'center',gap:'6px'}}>
              <RefreshCw size={14}/>{recalcLoading ? 'Syncing…' : 'Sync Balances'}
            </button>
          )}
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15}/>Add Bank Account</button>
        </div>
      </div>

      {hasMismatch && (
        <div style={{background:'#fff8f0',border:'1px solid #fed7aa',borderRadius:'10px',padding:'12px 16px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'#92400e',fontWeight:600}}>
          <AlertTriangle size={16}/>
          Some balances don't match transactions. Click "Sync Balances" to fix them.
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'16px',marginBottom:'24px'}}>
        {loading
          ? <div style={{gridColumn:'1/-1',textAlign:'center',padding:'40px'}}><div className="spinner" style={{margin:'0 auto'}}/></div>
          : accounts.length === 0
          ? <div style={{gridColumn:'1/-1'}}><div className="empty-state"><div className="empty-icon">🏦</div><div className="empty-title">No bank accounts yet</div><div className="empty-desc">Add your HDFC, SBI, or other bank accounts to track balances.</div></div></div>
          : accounts.map(a => {
            const bal      = a.calculatedBalance ?? a.currentBalance ?? 0;
            const mismatch = Math.abs(bal - (a.currentBalance||0)) > 1;
            const color    = TYPE_COLOR[a.accountType] || '#3b82f6';
            return (
              <div key={a._id} style={{background:'white',border:`1px solid ${mismatch?'#fed7aa':'var(--gray-200)'}`,borderRadius:'14px',padding:'20px',boxShadow:'0 2px 8px rgba(0,0,0,0.04)',position:'relative'}}>
                {mismatch && (
                  <div style={{position:'absolute',top:'12px',right:'52px',background:'#fff8f0',border:'1px solid #fed7aa',borderRadius:'6px',padding:'2px 8px',fontSize:'10.5px',fontWeight:700,color:'#92400e',display:'flex',alignItems:'center',gap:'4px'}}>
                    <AlertTriangle size={10}/> Out of sync
                  </div>
                )}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px'}}>
                  <div style={{width:42,height:42,borderRadius:'10px',background:color+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px'}}>
                    {TYPE_ICON[a.accountType]||'🏦'}
                  </div>
                  <button className="btn btn-sm btn-secondary" onClick={()=>openEdit(a)}><Edit2 size={12}/></button>
                </div>
                <div style={{fontWeight:800,fontSize:'15px',color:'var(--gray-900)',marginBottom:'4px'}}>{a.accountName}</div>
                <div style={{fontSize:'12.5px',color:'var(--gray-500)',marginBottom:'2px'}}>{a.bankName}</div>
                <div style={{fontFamily:'monospace',fontSize:'13px',color:'var(--gray-600)',marginBottom:'4px',letterSpacing:'0.05em'}}>{a.accountNumber}</div>
                {a.ifscCode && <div style={{fontSize:'11.5px',color:'var(--gray-400)',marginBottom:'14px'}}>IFSC: {a.ifscCode}</div>}

                <div style={{borderTop:'1px solid var(--gray-100)',paddingTop:'12px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom: mismatch?'8px':0}}>
                    <div>
                      <div style={{fontSize:'11px',color:'var(--gray-400)',fontWeight:600,textTransform:'uppercase'}}>Balance (from transactions)</div>
                      <div style={{fontWeight:800,fontSize:'19px',color: bal >= 0 ? color : '#ef4444'}}>
                        ₹{Math.abs(bal).toLocaleString('en-IN')} <span style={{fontSize:'12px',fontWeight:600}}>{bal>=0?'CR':'DR'}</span>
                      </div>
                    </div>
                    <span className="badge badge-gray" style={{textTransform:'capitalize'}}>{a.accountType}</span>
                  </div>

                  {/* Show both if mismatch */}
                  {mismatch && (
                    <div style={{background:'#f9fafb',borderRadius:'6px',padding:'8px 10px',fontSize:'12px',color:'var(--gray-500)',display:'flex',justifyContent:'space-between'}}>
                      <span>Opening: <strong>₹{(a.openingBalance||0).toLocaleString('en-IN')}</strong></span>
                      <span>Stored: <strong style={{color:'#ef4444'}}>₹{(a.currentBalance||0).toLocaleString('en-IN')}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        }
      </div>

      {/* Total summary row */}
      {accounts.length > 1 && (
        <div style={{background:'white',border:'1px solid var(--gray-200)',borderRadius:'12px',padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
          <div style={{fontWeight:700,fontSize:'14px',color:'var(--gray-600)'}}>Total across all accounts</div>
          <div style={{fontWeight:900,fontSize:'20px',color: total>=0?'var(--primary)':'#ef4444'}}>
            ₹{Math.abs(total).toLocaleString('en-IN')} <span style={{fontSize:'13px',fontWeight:600}}>{total>=0?'CR':'DR'}</span>
          </div>
        </div>
      )}

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
                  <input required className="form-input" value={form.accountName} onChange={e=>sf('accountName',e.target.value)} placeholder="e.g. SBI Current Account"/>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bank Name <span className="req">*</span></label>
                    <input required className="form-input" value={form.bankName} onChange={e=>sf('bankName',e.target.value)} placeholder="SBI, HDFC, ICICI…"/>
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
                    <input className="form-input" value={form.ifscCode} onChange={e=>sf('ifscCode',e.target.value.toUpperCase())} placeholder="SBIN0001234"/>
                  </div>
                </div>
                {!editing && (
                  <div className="form-group">
                    <label className="form-label">Opening Balance (₹)</label>
                    <input type="number" className="form-input" value={form.openingBalance} onChange={e=>sf('openingBalance',+e.target.value)}/>
                    <div style={{fontSize:'12px',color:'var(--gray-400)',marginTop:'4px'}}>Balance in this account before you started using GreenLedger</div>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={2} value={form.notes} onChange={e=>sf('notes',e.target.value)}/>
                </div>
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