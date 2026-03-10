import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, X, Trash2, CheckCircle, Eye } from 'lucide-react';

const STATUS_BADGE = { draft:'badge-gray', pending_approval:'badge-warning', approved:'badge-info', posted:'badge-success' };

export default function Journal() {
  const [entries, setEntries]   = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({
    entryDate: new Date().toISOString().slice(0,10),
    description: '',
    lines: [
      { account:'', accountName:'', debit:0, credit:0, description:'' },
      { account:'', accountName:'', debit:0, credit:0, description:'' },
    ]
  });

  useEffect(() => {
    Promise.all([
      api.get('/journal'),
      api.get('/accounts', { params: { limit:300 } })
    ]).then(([j, a]) => {
      setEntries(j.data.data);
      setAccounts(a.data.data);
      setLoading(false);
    });
  }, []);

  const refresh = async () => {
    const r = await api.get('/journal');
    setEntries(r.data.data);
  };

  const setLine = (idx, key, val) => {
    const updated = [...form.lines];
    updated[idx] = { ...updated[idx], [key]: val };
    if (key === 'account') {
      const acc = accounts.find(a => a._id === val);
      if (acc) updated[idx].accountName = acc.name;
    }
    setForm(f => ({ ...f, lines: updated }));
  };

  const addLine    = () => setForm(f => ({ ...f, lines: [...f.lines, { account:'', accountName:'', debit:0, credit:0, description:'' }] }));
  const removeLine = (idx) => setForm(f => ({ ...f, lines: f.lines.filter((_,i) => i!==idx) }));

  const totalDebit  = form.lines.reduce((s,l) => s + (+l.debit||0), 0);
  const totalCredit = form.lines.reduce((s,l) => s + (+l.credit||0), 0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isBalanced) return toast.error('Entry not balanced! Debit must equal Credit.');
    setSaving(true);
    try {
      await api.post('/journal', { ...form, lines: form.lines.filter(l => l.account) });
      toast.success('Journal entry saved!');
      setModal(false); refresh();
      setForm({ entryDate:new Date().toISOString().slice(0,10), description:'', lines:[{account:'',accountName:'',debit:0,credit:0,description:''},{account:'',accountName:'',debit:0,credit:0,description:''}] });
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id) => {
    try {
      await api.post('/journal/' + id + '/approve');
      toast.success('Entry approved!'); refresh();
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
  };

  return (
    <AppLayout title="Journal Entries">
      <div className="page-header">
        <div className="page-header-left"><h1>Journal Entries</h1><p>Double-entry bookkeeping — Debit must equal Credit</p></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={15}/>New Entry</button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Entry #</th><th>Date</th><th>Description</th><th>Debit</th><th>Credit</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading
                ? <tr><td colSpan={7} style={{textAlign:'center',padding:'32px'}}><div className="spinner" style={{margin:'0 auto'}}/></td></tr>
                : entries.length === 0
                ? <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">📒</div><div className="empty-title">No journal entries yet</div><div className="empty-desc">Create entries for depreciation, adjustments, and corrections.</div></div></td></tr>
                : entries.map(e => (
                <tr key={e._id}>
                  <td className="td-mono" style={{fontWeight:700,color:'var(--primary)'}}>{e.entryNumber}</td>
                  <td>{new Date(e.entryDate).toLocaleDateString('en-IN')}</td>
                  <td style={{maxWidth:240,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.description}</td>
                  <td className="td-amount">Rs.{(e.totalDebit||0).toLocaleString('en-IN')}</td>
                  <td className="td-amount">Rs.{(e.totalCredit||0).toLocaleString('en-IN')}</td>
                  <td><span className={`badge ${STATUS_BADGE[e.status]||'badge-gray'}`}>{e.status?.replace('_',' ')}</span></td>
                  <td style={{display:'flex',gap:'6px'}}>
                    <button className="btn btn-sm btn-secondary" onClick={()=>setViewModal(e)}><Eye size={12}/></button>
                    {(e.status==='draft'||e.status==='pending_approval') && (
                      <button className="btn btn-sm" style={{background:'var(--primary-pale)',color:'var(--primary)',border:'1px solid var(--primary-light)',borderRadius:'6px',padding:'5px 10px',fontSize:'12px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'}} onClick={()=>handleApprove(e._id)}>
                        <CheckCircle size={12}/>Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal modal-xl">
            <div className="modal-header">
              <h3 className="modal-title">New Journal Entry</h3>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)'}}><X size={18}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={form.entryDate} onChange={e=>setForm(f=>({...f,entryDate:e.target.value}))}/></div>
                  <div className="form-group"><label className="form-label">Description <span className="req">*</span></label><input required className="form-input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="e.g. Monthly depreciation - April 2024"/></div>
                </div>

                <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'8px'}}>
                  <thead><tr style={{background:'var(--gray-50)'}}>
                    {['Account','Description','Debit (Rs.)','Credit (Rs.)',''].map(h=>(
                      <th key={h} style={{padding:'8px 10px',fontSize:'11px',fontWeight:700,textTransform:'uppercase',color:'var(--gray-500)',borderBottom:'1px solid var(--gray-200)',textAlign:['Debit (Rs.)','Credit (Rs.)'].includes(h)?'right':'left'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {form.lines.map((line, idx) => (
                      <tr key={idx} style={{borderBottom:'1px solid var(--gray-100)'}}>
                        <td style={{padding:'6px 8px',minWidth:'200px'}}>
                          <select style={{border:'1px solid var(--gray-200)',borderRadius:'6px',padding:'7px 8px',fontSize:'13px',width:'100%'}} value={line.account} onChange={e=>setLine(idx,'account',e.target.value)}>
                            <option value="">Select account…</option>
                            {accounts.map(a=><option key={a._id} value={a._id}>{a.code} - {a.name}</option>)}
                          </select>
                        </td>
                        <td style={{padding:'6px 6px'}}>
                          <input style={{border:'1px solid var(--gray-200)',borderRadius:'6px',padding:'7px 8px',fontSize:'13px',width:'100%'}} value={line.description} onChange={e=>setLine(idx,'description',e.target.value)} placeholder="Optional note"/>
                        </td>
                        <td style={{padding:'6px 6px'}}>
                          <input type="number" min="0" step="0.01" style={{border:'1px solid var(--gray-200)',borderRadius:'6px',padding:'7px 8px',fontSize:'13px',width:'110px',textAlign:'right'}} value={line.debit||''} onChange={e=>setLine(idx,'debit',e.target.value)} placeholder="0.00"/>
                        </td>
                        <td style={{padding:'6px 6px'}}>
                          <input type="number" min="0" step="0.01" style={{border:'1px solid var(--gray-200)',borderRadius:'6px',padding:'7px 8px',fontSize:'13px',width:'110px',textAlign:'right'}} value={line.credit||''} onChange={e=>setLine(idx,'credit',e.target.value)} placeholder="0.00"/>
                        </td>
                        <td style={{padding:'6px 4px'}}>
                          {form.lines.length > 2 && <button type="button" onClick={()=>removeLine(idx)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--red)',padding:'2px'}}><Trash2 size={13}/></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{background:'var(--gray-50)',borderTop:'2px solid var(--gray-200)'}}>
                      <td colSpan={2} style={{padding:'10px 10px',fontWeight:700,fontSize:'13px'}}>Total</td>
                      <td style={{padding:'10px 10px',textAlign:'right',fontFamily:'monospace',fontWeight:700,color:isBalanced?'var(--primary)':'var(--red)'}}>Rs.{totalDebit.toFixed(2)}</td>
                      <td style={{padding:'10px 10px',textAlign:'right',fontFamily:'monospace',fontWeight:700,color:isBalanced?'var(--primary)':'var(--red)'}}>Rs.{totalCredit.toFixed(2)}</td>
                      <td/>
                    </tr>
                  </tfoot>
                </table>

                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}><Plus size={13}/>Add Line</button>
                  <div style={{fontSize:'13px',fontWeight:600,color:isBalanced?'var(--primary)':'var(--red)'}}>
                    {isBalanced ? '✓ Balanced' : `Difference: Rs.${Math.abs(totalDebit-totalCredit).toFixed(2)}`}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving||!isBalanced}>{saving?<span className="spinner"/>:'Save Entry'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setViewModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div><h3 className="modal-title">{viewModal.entryNumber}</h3><div style={{fontSize:'12px',color:'var(--gray-400)',marginTop:'2px'}}>{viewModal.description}</div></div>
              <button onClick={()=>setViewModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)'}}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <table className="data-table">
                <thead><tr><th>Account</th><th>Description</th><th style={{textAlign:'right'}}>Debit</th><th style={{textAlign:'right'}}>Credit</th></tr></thead>
                <tbody>
                  {viewModal.lines?.map((l,i)=>(
                    <tr key={i}>
                      <td style={{fontWeight:600}}>{l.accountName}</td>
                      <td style={{color:'var(--gray-500)',fontSize:'12.5px'}}>{l.description||'—'}</td>
                      <td style={{textAlign:'right',fontFamily:'monospace',color:'var(--primary)',fontWeight:600}}>{l.debit>0?'Rs.'+l.debit.toLocaleString('en-IN'):'—'}</td>
                      <td style={{textAlign:'right',fontFamily:'monospace',color:'var(--red)',fontWeight:600}}>{l.credit>0?'Rs.'+l.credit.toLocaleString('en-IN'):'—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background:'var(--gray-50)',borderTop:'2px solid var(--gray-200)'}}>
                    <td colSpan={2} style={{fontWeight:700,padding:'10px 14px'}}>Total</td>
                    <td style={{textAlign:'right',fontFamily:'monospace',fontWeight:800,padding:'10px 14px'}}>Rs.{(viewModal.totalDebit||0).toLocaleString('en-IN')}</td>
                    <td style={{textAlign:'right',fontFamily:'monospace',fontWeight:800,padding:'10px 14px'}}>Rs.{(viewModal.totalCredit||0).toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}