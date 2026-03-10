import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../components/layout/AppLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, X, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle } from 'lucide-react';
import logo from '../assets/logo.js';

// ── Config ─────────────────────────────────────────────────────
const PARTY_TYPES = [
  { value:'customer',        label:'Customer',        emoji:'🏢', color:'#16a34a' },
  { value:'vendor',          label:'Vendor',          emoji:'🚚', color:'#3b82f6' },
  { value:'director',        label:'Director',        emoji:'👔', color:'#8b5cf6' },
  { value:'employee',        label:'Employee',        emoji:'👤', color:'#0ea5e9' },
  { value:'contractor',      label:'Contractor',      emoji:'🔧', color:'#f97316' },
  { value:'expense_account', label:'Expense Account', emoji:'💳', color:'#ef4444' },
];

const TXN_OPTIONS = {
  customer:        [{ v:'receipt', l:'Receipt — Customer paying you', dir:'in' }, { v:'payment', l:'Payment — Refund to customer', dir:'out' }],
  vendor:          [{ v:'payment', l:'Payment — You paying vendor', dir:'out' }, { v:'receipt', l:'Receipt — Vendor refund to you', dir:'in' }],
  director:        [
    { v:'capital_investment', l:'💰 Capital Investment — Director injecting equity', dir:'in' },
    { v:'director_loan',      l:'🏦 Director Loan — Loan given to company',         dir:'in' },
    { v:'loan_repayment',     l:'↩️ Loan Repayment — Company repaying director',    dir:'out' },
    { v:'drawings',           l:'📤 Drawings — Director taking personal funds out',  dir:'out' },
    { v:'profit_share',       l:'📊 Profit Share — Distributing profits',            dir:'out' },
    { v:'reimbursement',      l:'🧾 Reimbursement — Expense reimbursement',         dir:'out' },
  ],
  employee:        [
    { v:'salary_payment',   l:'💼 Salary Payment',    dir:'out' },
    { v:'advance_given',    l:'📤 Advance Given',     dir:'out' },
    { v:'advance_recovery', l:'↩️ Advance Recovery',  dir:'out' },
    { v:'reimbursement',    l:'🧾 Reimbursement',     dir:'out' },
  ],
  contractor:      [
    { v:'contractor_payment', l:'💼 Contractor Payment', dir:'out' },
    { v:'tds_deduction',      l:'🏛️ TDS Deduction',      dir:'out' },
    { v:'reimbursement',      l:'🧾 Reimbursement',      dir:'out' },
  ],
  expense_account: [
    { v:'expense_payment', l:'💳 Expense Payment', dir:'out' },
    { v:'reimbursement',   l:'🧾 Reimbursement',   dir:'out' },
  ],
};

const PEOPLE_TYPES = ['director','employee','contractor','expense_account'];
const TYPE_COLOR = (t) => PARTY_TYPES.find(p=>p.value===t)?.color || '#6b7280';

const TXN_LABEL = {
  receipt:'Receipt', payment:'Payment', capital_investment:'Capital Investment',
  director_loan:'Director Loan', loan_repayment:'Loan Repayment', drawings:'Drawings',
  profit_share:'Profit Share', salary_payment:'Salary', advance_given:'Advance Given',
  advance_recovery:'Advance Recovery', contractor_payment:'Contractor Pmt',
  expense_payment:'Expense', reimbursement:'Reimbursement', tds_deduction:'TDS',
};

const emptyForm = {
  partyType:'customer', partyId:'', txnType:'receipt',
  amount:'', tdsAmount:0, paymentDate:new Date().toISOString().slice(0,10),
  month:new Date().toISOString().slice(0,7), mode:'bank',
  reference:'', description:'', bankAccountId:'',
};

const isOverdue = (dueDate) => dueDate && new Date(dueDate) < new Date();
const daysDiff  = (d) => d ? Math.ceil((new Date() - new Date(d)) / 86400000) : null;

export default function Payments() {
  const [tab, setTab]               = useState('pending'); // 'pending' | 'history'
  const [payments, setPayments]     = useState([]);
  const [pending, setPending]       = useState([]);
  const [partyLists, setPartyLists] = useState({});
  const [bankAccounts, setBankAccounts] = useState([]);
  const [modal, setModal]           = useState(false);
  const [settleModal, setSettleModal] = useState(null); // holds the pending item
  const [form, setForm]             = useState(emptyForm);
  const [settleForm, setSettleForm] = useState({ amount:'', bankAccountId:'', mode:'bank', reference:'' });
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(true);
  const [filterType, setFilterType] = useState('');

  const fetchPayments = async () => {
    try {
      const r = await api.get('/payments', { params: { limit: 200 } });
      setPayments(r.data.data);
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  };

  const fetchPending = async () => {
    try {
      const r = await api.get('/payments/pending');
      setPending(r.data.data);
    } catch { toast.error('Failed to load pending'); }
  };

  const fetchPartyList = useCallback(async (partyType) => {
    if (partyLists[partyType]) return;
    try {
      const isPeople = PEOPLE_TYPES.includes(partyType);
      const url = isPeople ? `/parties?type=${partyType}&limit=100` : `/${partyType}s?limit=200`;
      const r = await api.get(url);
      setPartyLists(prev => ({ ...prev, [partyType]: r.data.data }));
    } catch { toast.error('Failed to load ' + partyType + ' list'); }
  }, [partyLists]);

  useEffect(() => {
    fetchPayments();
    fetchPending();
    fetchPartyList('customer');
    fetchPartyList('vendor');
    api.get('/bank').then(r => setBankAccounts(r.data.data || []));
  }, []);

  const handlePartyTypeChange = (newType) => {
    const firstTxn = TXN_OPTIONS[newType]?.[0]?.v || '';
    setForm(f => ({ ...f, partyType: newType, partyId: '', txnType: firstTxn, bankAccountId:'' }));
    fetchPartyList(newType);
  };

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const isPeople      = PEOPLE_TYPES.includes(form.partyType);
  const currentTxnOpt = TXN_OPTIONS[form.partyType]?.find(t => t.v === form.txnType);
  const isMoneyIn     = currentTxnOpt?.dir === 'in';
  const currentParties= partyLists[form.partyType] || [];

  // ── Settle a pending invoice/bill ────────────────────────────
  const openSettle = (item) => {
    setSettleModal(item);
    setSettleForm({ amount: item.balanceDue.toFixed(2), bankAccountId:'', mode:'bank', reference:'' });
  };

  const handleSettle = async (e) => {
    e.preventDefault();
    if (!settleForm.bankAccountId) return toast.error('Please select a bank account.');
    setSaving(true);
    try {
      await api.post('/payments/settle', {
        sourceId:      settleModal._id,
        source:        settleModal.source,
        amount:        +settleForm.amount,
        bankAccountId: settleForm.bankAccountId,
        mode:          settleForm.mode,
        reference:     settleForm.reference,
        date:          new Date().toISOString(),
        partyName:     settleModal.partyName,
        partyId:       settleModal.partyId,
        partyType:     settleModal.partyType,
      });
      toast.success('Payment confirmed! Bank balance updated.');
      setSettleModal(null);
      fetchPending();
      fetchPayments();
    } catch(e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  // ── Manual payment ────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.partyId)        return toast.error('Please select a party.');
    if (!form.bankAccountId)  return toast.error('Please select a bank account.');
    setSaving(true);
    try {
      const selectedParty = currentParties.find(p => p._id === form.partyId);
      if (isPeople) {
        await api.post('/parties/' + form.partyId + '/transactions', {
          type:            form.txnType,
          amount:          +form.amount,
          tdsAmount:       +form.tdsAmount || 0,
          date:            form.paymentDate,
          month:           form.month,
          paymentMode:     form.mode,
          reference:       form.reference,
          description:     form.description,
          bankAccountId:   form.bankAccountId || undefined,
          bankAccountName: bankAccounts.find(b=>b._id===form.bankAccountId)?.accountName,
        });
      } else {
        await api.post('/payments', {
          type:          form.txnType,
          partyType:     form.partyType,
          partyId:       form.partyId,
          partyName:     selectedParty?.name || '',
          partyModel:    form.partyType === 'customer' ? 'Customer' : 'Vendor',
          amount:        +form.amount,
          paymentDate:   form.paymentDate,
          mode:          form.mode,
          reference:     form.reference,
          description:   form.description,
          bankAccountId: form.bankAccountId || undefined,
        });
      }
      toast.success('Payment recorded!');
      setModal(false);
      setForm(emptyForm);
      fetchPayments();
      fetchPending();
    } catch(e) { toast.error(e.response?.data?.message || 'Error recording payment'); }
    finally { setSaving(false); }
  };

  const totalIn  = payments.filter(p=>p.type==='receipt').reduce((s,p)=>s+(p.amount||0),0);
  const totalOut = payments.filter(p=>p.type==='payment').reduce((s,p)=>s+(p.amount||0),0);
  const pendingIn  = pending.filter(p=>p.direction==='in').reduce((s,p)=>s+(p.balanceDue||0),0);
  const pendingOut = pending.filter(p=>p.direction==='out').reduce((s,p)=>s+(p.balanceDue||0),0);

  const filtered = filterType ? payments.filter(p=>p.partyType===filterType||p.type===filterType) : payments;

  return (
    <AppLayout title="Payments">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Payments & Receipts</h1>
          <p>{pending.length} awaiting · {payments.length} completed</p>
        </div>
        <button className="btn btn-primary" onClick={()=>{setForm(emptyForm);fetchPartyList('customer');setModal(true);}}>
          <Plus size={15}/>Record Manual Payment
        </button>
      </div>

      {/* KPI Row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',marginBottom:'20px'}}>
        {[
          { icon:'⏳', label:'To Collect',    value:`₹${pendingIn.toLocaleString('en-IN')}`,  color:'#16a34a', bg:'#f0fdf4', sub:`${pending.filter(p=>p.direction==='in').length} invoices` },
          { icon:'⏳', label:'To Pay',         value:`₹${pendingOut.toLocaleString('en-IN')}`, color:'#ef4444', bg:'#fff1f2', sub:`${pending.filter(p=>p.direction==='out').length} bills` },
          { icon:'✅', label:'Total Received', value:`₹${totalIn.toLocaleString('en-IN')}`,   color:'#16a34a', bg:'#f0fdf4', sub:'all time' },
          { icon:'✅', label:'Total Paid Out', value:`₹${totalOut.toLocaleString('en-IN')}`,  color:'#3b82f6', bg:'#eff6ff', sub:'all time' },
        ].map((k,i)=>(
          <div key={i} style={{background:'white',border:'1px solid var(--gray-200)',borderRadius:'12px',padding:'16px',display:'flex',alignItems:'center',gap:'14px'}}>
            <div style={{width:42,height:42,borderRadius:'10px',background:k.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0}}>{k.icon}</div>
            <div>
              <div style={{fontSize:'11px',color:'var(--gray-400)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>{k.label}</div>
              <div style={{fontSize:'17px',fontWeight:800,color:k.color}}>{k.value}</div>
              <div style={{fontSize:'11px',color:'var(--gray-400)',marginTop:'1px'}}>{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:'4px',marginBottom:'16px',background:'var(--gray-100)',padding:'4px',borderRadius:'10px',width:'fit-content'}}>
        {[
          { id:'pending', label:`⏳ Awaiting Payment`, badge: pending.length },
          { id:'history', label:'✅ Payment History' },
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:'8px 20px',borderRadius:'7px',border:'none',fontFamily:'inherit',fontWeight:600,fontSize:'13px',cursor:'pointer',
              background:tab===t.id?'white':'transparent', color:tab===t.id?'var(--gray-900)':'var(--gray-500)',
              boxShadow:tab===t.id?'0 1px 4px rgba(0,0,0,0.1)':'none', display:'flex',alignItems:'center',gap:'7px'}}>
            {t.label}
            {t.badge>0 && <span style={{background:'#ef4444',color:'white',borderRadius:'10px',padding:'1px 7px',fontSize:'11px',fontWeight:700}}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ══ PENDING TAB ══ */}
      {tab === 'pending' && (
        <div className="card">
          {pending.length === 0
            ? <div className="empty-state"><div className="empty-icon">🎉</div><div className="empty-title">All caught up!</div><div className="empty-desc">No pending invoices or bills to settle.</div></div>
            : (
              <table className="data-table">
                <thead><tr>
                  <th>Type</th><th>Reference</th><th>Party</th><th>Date</th><th>Due Date</th>
                  <th style={{textAlign:'right'}}>Total</th><th style={{textAlign:'right'}}>Paid</th>
                  <th style={{textAlign:'right'}}>Balance Due</th><th>Status</th><th></th>
                </tr></thead>
                <tbody>
                  {pending.map(item => {
                    const overdue = isOverdue(item.dueDate);
                    const days    = daysDiff(item.dueDate);
                    return (
                      <tr key={item._id+item.source} style={{background: overdue ? '#fff8f8':'white'}}>
                        <td>
                          <span style={{fontSize:'11.5px',fontWeight:700,padding:'3px 10px',borderRadius:'20px',
                            background: item.direction==='in'?'#f0fdf4':'#fff1f2',
                            color: item.direction==='in'?'#16a34a':'#ef4444'}}>
                            {item.direction==='in' ? '📥 Invoice' : '📤 Bill'}
                          </span>
                        </td>
                        <td style={{fontWeight:700,fontFamily:'monospace',fontSize:'12.5px',color:'var(--primary)'}}>{item.ref}</td>
                        <td style={{fontWeight:600}}>{item.partyName}</td>
                        <td style={{fontSize:'12.5px',color:'var(--gray-500)'}}>{new Date(item.date).toLocaleDateString('en-IN')}</td>
                        <td>
                          {item.dueDate
                            ? <span style={{fontSize:'12px',fontWeight:600,color: overdue?'#ef4444':'var(--gray-600)'}}>
                                {new Date(item.dueDate).toLocaleDateString('en-IN')}
                                {overdue && <span style={{fontSize:'11px',marginLeft:'4px',color:'#ef4444'}}>({days}d overdue)</span>}
                              </span>
                            : '—'}
                        </td>
                        <td style={{textAlign:'right',fontFamily:'monospace'}}>₹{item.totalAmount?.toLocaleString('en-IN')}</td>
                        <td style={{textAlign:'right',fontFamily:'monospace',color:'#16a34a'}}>₹{item.paidAmount?.toLocaleString('en-IN')}</td>
                        <td style={{textAlign:'right',fontWeight:800,fontSize:'14px',color: item.direction==='in'?'#16a34a':'#ef4444'}}>
                          ₹{item.balanceDue?.toLocaleString('en-IN')}
                        </td>
                        <td>
                          <span className={`badge ${item.status==='partial'?'badge-warning':overdue?'badge-danger':'badge-gray'}`}
                            style={{textTransform:'capitalize'}}>{item.status}</span>
                        </td>
                        <td>
                          <button onClick={()=>openSettle(item)}
                            style={{padding:'6px 14px',background: item.direction==='in'?'#16a34a':'#3b82f6',color:'white',border:'none',
                              borderRadius:'6px',fontFamily:'inherit',fontWeight:700,fontSize:'12px',cursor:'pointer',
                              display:'flex',alignItems:'center',gap:'5px',whiteSpace:'nowrap'}}>
                            <CheckCircle size={12}/> Confirm Payment
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          }
        </div>
      )}

      {/* ══ HISTORY TAB ══ */}
      {tab === 'history' && (
        <>
          <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
            {[{v:'',l:'All'},{v:'receipt',l:'Receipts'},{v:'payment',l:'Payments'},{v:'director',l:'Director'},{v:'employee',l:'Employee'},{v:'contractor',l:'Contractor'},{v:'expense_account',l:'Expenses'}].map(f=>(
              <button key={f.v} onClick={()=>setFilterType(f.v)} className="btn btn-sm"
                style={{background:filterType===f.v?'var(--primary)':'var(--gray-100)',color:filterType===f.v?'white':'var(--gray-700)',border:'none'}}>
                {f.l}
              </button>
            ))}
          </div>
          <div className="card">
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr>
                  <th>Ref</th><th>Type</th><th>Party</th><th>Category</th>
                  <th>Date</th><th>Amount</th><th>Mode</th><th>Reference</th>
                </tr></thead>
                <tbody>
                  {loading
                    ? <tr><td colSpan={8} style={{textAlign:'center',padding:'32px'}}><div className="spinner" style={{margin:'0 auto'}}/></td></tr>
                    : filtered.length === 0
                    ? <tr><td colSpan={8}><div className="empty-state"><div className="empty-icon">💳</div><div className="empty-title">No payments yet</div></div></td></tr>
                    : filtered.map(p => {
                      const isIn = p.type === 'receipt';
                      return (
                        <tr key={p._id}>
                          <td className="td-mono" style={{fontWeight:700,color:'var(--primary)',fontSize:'12px'}}>{p.paymentNumber||('PMT-'+p._id?.slice(-5).toUpperCase())}</td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                              {isIn?<ArrowDownLeft size={13} color="var(--primary)"/>:<ArrowUpRight size={13} color="var(--red)"/>}
                              <span style={{fontSize:'12.5px',fontWeight:600}}>{TXN_LABEL[p.type]||p.type}</span>
                            </div>
                          </td>
                          <td style={{fontWeight:600}}>{p.partyName}</td>
                          <td><span style={{fontSize:'11px',fontWeight:700,padding:'3px 8px',borderRadius:'20px',background:TYPE_COLOR(p.partyType)+'18',color:TYPE_COLOR(p.partyType),textTransform:'capitalize',whiteSpace:'nowrap'}}>{p.partyType?.replace('_',' ')||'—'}</span></td>
                          <td style={{fontSize:'12.5px',color:'var(--gray-500)'}}>{new Date(p.paymentDate||p.date).toLocaleDateString('en-IN')}</td>
                          <td style={{textAlign:'right',fontWeight:800,fontSize:'14px',color:isIn?'var(--primary)':'var(--red)'}}>
                            {isIn?'+':'−'}₹{(p.amount||0).toLocaleString('en-IN')}
                          </td>
                          <td><span className="badge badge-gray" style={{textTransform:'uppercase',fontSize:'10px'}}>{p.mode||p.paymentMode||'—'}</span></td>
                          <td className="td-mono" style={{color:'var(--gray-400)',fontSize:'11.5px'}}>{p.reference||'—'}</td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══ SETTLE MODAL ══ */}
      {settleModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setSettleModal(null)}>
          <div className="modal modal-md">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Confirm Payment</h3>
                <div style={{fontSize:'12px',color:'var(--gray-400)',marginTop:'3px'}}>
                  {settleModal.ref} · {settleModal.partyName}
                </div>
              </div>
              <button onClick={()=>setSettleModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)'}}><X size={18}/></button>
            </div>
            <form onSubmit={handleSettle}>
              <div className="modal-body">

                {/* Summary strip */}
                <div style={{background: settleModal.direction==='in'?'#f0fdf4':'#fff1f2', border:`1px solid ${settleModal.direction==='in'?'#bbf7d0':'#fecdd3'}`, borderRadius:'10px', padding:'14px', marginBottom:'18px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px'}}>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:'11px',fontWeight:700,color:'var(--gray-500)',textTransform:'uppercase',marginBottom:'4px'}}>Invoice Total</div>
                    <div style={{fontWeight:800,fontSize:'15px'}}>₹{settleModal.totalAmount?.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:'11px',fontWeight:700,color:'var(--gray-500)',textTransform:'uppercase',marginBottom:'4px'}}>Already Paid</div>
                    <div style={{fontWeight:800,fontSize:'15px',color:'#16a34a'}}>₹{settleModal.paidAmount?.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:'11px',fontWeight:700,color:'var(--gray-500)',textTransform:'uppercase',marginBottom:'4px'}}>Balance Due</div>
                    <div style={{fontWeight:900,fontSize:'17px',color: settleModal.direction==='in'?'#16a34a':'#ef4444'}}>₹{settleModal.balanceDue?.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                <div style={{background: settleModal.direction==='in'?'#f0fdf4':'#eff6ff', border:`1px solid ${settleModal.direction==='in'?'#bbf7d0':'#bfdbfe'}`, borderRadius:'8px', padding:'10px 14px', marginBottom:'16px', fontSize:'13px', fontWeight:600, color: settleModal.direction==='in'?'#14532d':'#1e40af', display:'flex', alignItems:'center', gap:'8px'}}>
                  {settleModal.direction==='in' ? <ArrowDownLeft size={14}/> : <ArrowUpRight size={14}/>}
                  {settleModal.direction==='in' ? 'Money coming IN — bank balance will increase' : 'Money going OUT — bank balance will decrease'}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Amount to Settle (₹) <span className="req">*</span></label>
                    <input required type="number" min="0.01" step="0.01" className="form-input"
                      value={settleForm.amount} onChange={e=>setSettleForm(f=>({...f,amount:e.target.value}))}/>
                    <div style={{fontSize:'11.5px',color:'var(--gray-400)',marginTop:'3px'}}>Can be partial — enter less than balance due for partial payment</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select className="form-select" value={settleForm.mode} onChange={e=>setSettleForm(f=>({...f,mode:e.target.value}))}>
                      <option value="bank">Bank Transfer</option>
                      <option value="upi">UPI</option>
                      <option value="cheque">Cheque</option>
                      <option value="cash">Cash</option>
                      <option value="neft">NEFT</option>
                      <option value="rtgs">RTGS</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {settleModal.direction==='in' ? '🏦 Deposit into Bank Account' : '🏦 Pay from Bank Account'} <span className="req">*</span>
                  </label>
                  <select required className="form-select" value={settleForm.bankAccountId} onChange={e=>setSettleForm(f=>({...f,bankAccountId:e.target.value}))}>
                    <option value="">Select bank account…</option>
                    {bankAccounts.map(b=><option key={b._id} value={b._id}>{b.accountName} — {b.bankName}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Reference / UTR No.</label>
                  <input className="form-input" value={settleForm.reference} onChange={e=>setSettleForm(f=>({...f,reference:e.target.value}))} placeholder="UTR, cheque number, transaction ID…"/>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setSettleModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"
                  style={{background: settleModal.direction==='in'?'#16a34a':'#3b82f6'}}
                  disabled={saving}>
                  {saving ? <span className="spinner"/> : <><CheckCircle size={14}/> Confirm & Settle</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MANUAL PAYMENT MODAL ══ */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal modal-md">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Record Manual Payment</h3>
                {currentTxnOpt && (
                  <div style={{fontSize:'12px',marginTop:'3px',color:isMoneyIn?'var(--primary)':'var(--red)',fontWeight:600,display:'flex',alignItems:'center',gap:'4px'}}>
                    {isMoneyIn?<ArrowDownLeft size={12}/>:<ArrowUpRight size={12}/>}
                    {isMoneyIn?'Money coming IN to company':'Money going OUT of company'}
                  </div>
                )}
              </div>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)'}}><X size={18}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Who is this payment for?</label>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginTop:'6px'}}>
                    {PARTY_TYPES.map(pt=>(
                      <button key={pt.value} type="button" onClick={()=>handlePartyTypeChange(pt.value)}
                        style={{padding:'7px 13px',borderRadius:'20px',fontSize:'12.5px',fontWeight:600,cursor:'pointer',
                          border:`1.5px solid ${pt.color}`, background:form.partyType===pt.value?pt.color:'white',
                          color:form.partyType===pt.value?'white':pt.color, display:'flex',alignItems:'center',gap:'5px'}}>
                        {pt.emoji} {pt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Select {PARTY_TYPES.find(p=>p.value===form.partyType)?.label} <span className="req">*</span></label>
                  <select required className="form-select" value={form.partyId} onChange={e=>sf('partyId',e.target.value)}>
                    <option value="">Choose…</option>
                    {currentParties.map(p=><option key={p._id} value={p._id}>{p.name}{p.code?` (${p.code})`:''}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Transaction Type <span className="req">*</span></label>
                  <div style={{display:'flex',flexDirection:'column',gap:'6px',marginTop:'4px'}}>
                    {TXN_OPTIONS[form.partyType]?.map(opt=>(
                      <label key={opt.v} style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',borderRadius:'8px',cursor:'pointer',
                        border:`1.5px solid ${form.txnType===opt.v?TYPE_COLOR(form.partyType):'var(--gray-200)'}`,
                        background:form.txnType===opt.v?TYPE_COLOR(form.partyType)+'0d':'white'}}>
                        <input type="radio" name="txnType" value={opt.v} checked={form.txnType===opt.v} onChange={()=>sf('txnType',opt.v)} style={{accentColor:TYPE_COLOR(form.partyType)}}/>
                        <span style={{fontSize:'13px',fontWeight:600,color:'var(--gray-800)',flex:1}}>{opt.l}</span>
                        <span style={{fontSize:'11px',fontWeight:700,color:opt.dir==='in'?'var(--primary)':'var(--red)',padding:'2px 8px',background:opt.dir==='in'?'#f0fdf4':'#fff1f2',borderRadius:'4px'}}>
                          {opt.dir==='in'?'IN':'OUT'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Amount (₹) <span className="req">*</span></label>
                    <input required type="number" min="0.01" step="0.01" className="form-input" value={form.amount} onChange={e=>sf('amount',e.target.value)} placeholder="0.00"/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-input" value={form.paymentDate} onChange={e=>sf('paymentDate',e.target.value)}/>
                  </div>
                </div>
                {form.partyType==='contractor' && (
                  <div className="form-group">
                    <label className="form-label">TDS Deducted (₹)</label>
                    <input type="number" min="0" step="0.01" className="form-input" value={form.tdsAmount} onChange={e=>sf('tdsAmount',e.target.value)} placeholder="0.00"/>
                    {+form.tdsAmount>0&&+form.amount>0&&<div style={{fontSize:'12px',color:'var(--primary)',marginTop:'4px',fontWeight:600}}>Net payable: ₹{(+form.amount-+form.tdsAmount).toLocaleString('en-IN')}</div>}
                  </div>
                )}
                {form.partyType==='employee'&&form.txnType==='salary_payment'&&(
                  <div className="form-group">
                    <label className="form-label">Salary Month</label>
                    <input type="month" className="form-input" value={form.month} onChange={e=>sf('month',e.target.value)}/>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">{isMoneyIn?'🏦 Deposit into Bank Account':'🏦 Pay from Bank Account'} <span className="req">*</span></label>
                  <select required className="form-select" value={form.bankAccountId} onChange={e=>sf('bankAccountId',e.target.value)}>
                    <option value="">Select bank account…</option>
                    {bankAccounts.map(b=><option key={b._id} value={b._id}>{b.accountName} — {b.bankName}</option>)}
                  </select>
                  <div style={{marginTop:'6px',background:isMoneyIn?'#f0fdf4':'#fff8f0',border:`1px solid ${isMoneyIn?'#bbf7d0':'#fed7aa'}`,borderRadius:'6px',padding:'8px 12px',fontSize:'12px',color:isMoneyIn?'#14532d':'#7c2d12',fontWeight:600}}>
                    {isMoneyIn?'💡 Bank balance will increase':'💡 Bank balance will decrease'} by ₹{(+form.amount||0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select className="form-select" value={form.mode} onChange={e=>sf('mode',e.target.value)}>
                      <option value="bank">Bank Transfer</option><option value="cash">Cash</option>
                      <option value="upi">UPI</option><option value="cheque">Cheque</option>
                      <option value="neft">NEFT</option><option value="rtgs">RTGS</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reference / UTR</label>
                    <input className="form-input" value={form.reference} onChange={e=>sf('reference',e.target.value)} placeholder="Cheque no., UTR, etc."/>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" rows={2} value={form.description} onChange={e=>sf('description',e.target.value)}/>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{background:TYPE_COLOR(form.partyType)}} disabled={saving}>
                  {saving?<span className="spinner"/>:'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}