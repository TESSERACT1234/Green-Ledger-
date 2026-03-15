import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../components/layout/AppLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, X, Search, Edit2, Eye, CreditCard, ChevronRight, Users, Briefcase, Wrench, Receipt, Pencil, Trash2 } from 'lucide-react';

// ── Type config ──────────────────────────────────────────────────
const TYPE_CONFIG = {
  director: {
    label: 'Directors',
    icon: Briefcase,
    color: '#8b5cf6',
    pale: '#f5f3ff',
    border: '#ddd6fe',
    badge: 'badge-purple',
    txnTypes: [
      { value: 'drawings',     label: 'Director Drawings' },
      { value: 'profit_share', label: 'Profit Share Distribution' },
      { value: 'reimbursement',label: 'Expense Reimbursement' },
    ]
  },
  employee: {
    label: 'Employees',
    icon: Users,
    color: '#3b82f6',
    pale: '#eff6ff',
    border: '#bfdbfe',
    badge: 'badge-info',
    txnTypes: [
      { value: 'salary_payment',  label: 'Salary Payment' },
      { value: 'advance_given',   label: 'Advance Given' },
      { value: 'advance_recovery',label: 'Advance Recovery' },
      { value: 'reimbursement',   label: 'Expense Reimbursement' },
    ]
  },
  contractor: {
    label: 'Contractors',
    icon: Wrench,
    color: '#f97316',
    pale: '#fff7ed',
    border: '#fed7aa',
    badge: 'badge-orange',
    txnTypes: [
      { value: 'contractor_payment', label: 'Contractor Payment' },
      { value: 'tds_deduction',      label: 'TDS Deduction' },
      { value: 'reimbursement',      label: 'Expense Reimbursement' },
    ]
  },
  expense_account: {
    label: 'Expense Accounts',
    icon: Receipt,
    color: '#ef4444',
    pale: '#fff1f2',
    border: '#fecdd3',
    badge: 'badge-danger',
    txnTypes: [
      { value: 'expense_payment', label: 'Expense Payment' },
      { value: 'reimbursement',   label: 'Reimbursement' },
    ]
  }
};

const EXPENSE_CATEGORIES = [
  'Electricity & Utilities', 'Fuel & Transportation', 'Equipment Maintenance',
  'Office Supplies', 'Rent', 'Insurance', 'Professional Fees',
  'Advertising & Marketing', 'Telephone & Internet', 'Miscellaneous'
];

const DEPARTMENTS = ['Management', 'Production', 'Quality Control', 'Logistics', 'Accounts', 'HR', 'IT', 'Sales'];

// ── Empty forms per type ─────────────────────────────────────────
const emptyForms = {
  director: { type:'director', name:'', email:'', phone:'', panNumber:'', designation:'Managing Director', dinNumber:'', shareholding:0, profitSharePercent:0, bankName:'', bankAccount:'', ifscCode:'', address:'', notes:'' },
  employee: { type:'employee', name:'', email:'', phone:'', panNumber:'', aadharNumber:'', employeeId:'', department:'Production', designation:'', basicSalary:0, hra:0, otherAllowances:0, pfApplicable:false, esiApplicable:false, tdsRate:0, joinDate:'', bankName:'', bankAccount:'', ifscCode:'', address:'', notes:'' },
  contractor: { type:'contractor', name:'', email:'', phone:'', panNumber:'', gstin:'', serviceType:'', tdsSection:'194C', tdsPercent:1, contractValue:0, contractStart:'', contractEnd:'', bankName:'', bankAccount:'', ifscCode:'', address:'', notes:'' },
  expense_account: { type:'expense_account', name:'', expenseCategory:'Electricity & Utilities', budgetMonthly:0, notes:'' }
};

export default function Parties() {
  const [activeTab, setActiveTab]     = useState('director');
  const [parties, setParties]         = useState([]);
  const [summary, setSummary]         = useState({});
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [modal, setModal]             = useState(false);         // add/edit
  const [detailModal, setDetailModal] = useState(null);         // view detail + transactions
  const [txnModal, setTxnModal]       = useState(null);         // record transaction
  const [form, setForm]               = useState(emptyForms.director);
  const [editing, setEditing]         = useState(null);
  const [saving, setSaving]           = useState(false);
  const [editTxnModal, setEditTxnModal]     = useState(null);   // transaction to edit
  const [deleteTxnConfirm, setDeleteTxnConfirm] = useState(null); // transaction to delete
  const [editTxnForm, setEditTxnForm]       = useState({});
  const [txnForm, setTxnForm]         = useState({ type:'', amount:0, date:new Date().toISOString().slice(0,10), month:new Date().toISOString().slice(0,7), description:'', paymentMode:'bank', reference:'', tdsAmount:0 });

  const cfg = TYPE_CONFIG[activeTab];

  const fetchParties = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        api.get('/parties', { params: { type: activeTab, search, limit: 200 } }),
        api.get('/parties/summary')
      ]);
      setParties(pRes.data.data);
      const countMap = {};
      sRes.data.data.counts?.forEach(c => { countMap[c._id] = c; });
      setSummary({ ...sRes.data.data, counts: countMap });
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [activeTab, search]);

  useEffect(() => { fetchParties(); }, [fetchParties]);

  const openAdd  = () => { setForm({ ...emptyForms[activeTab] }); setEditing(null); setModal(true); };
  const openEdit = (p) => { setForm({ ...p }); setEditing(p._id); setModal(true); };
  const openDetail = async (p) => {
    try {
      const r = await api.get(`/parties/${p._id}`);
      setDetailModal(r.data);
    } catch { toast.error('Failed to load details'); }
  };

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await api.put(`/parties/${editing}`, form);
      else         await api.post('/parties', form);
      toast.success(editing ? 'Updated!' : 'Added!');
      setModal(false); fetchParties();
    } catch (e) { toast.error(e.response?.data?.message || 'Error saving'); }
    finally { setSaving(false); }
  };

  const handleTxn = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/parties/${txnModal._id}/transactions`, txnForm);
      toast.success('Transaction recorded!');
      setTxnModal(null);
      fetchParties();
      if (detailModal) {
        const r = await api.get(`/parties/${txnModal._id}`);
        setDetailModal(r.data);
      }
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  // ── Edit transaction ────────────────────────────────────────
  const openEditTxn = (txn, partyId) => {
    setEditTxnForm({
      partyId,
      amount:      txn.amount,
      date:        txn.date?.slice(0,10) || new Date().toISOString().slice(0,10),
      paymentMode: txn.paymentMode || 'bank',
      reference:   txn.reference || '',
      description: txn.description || '',
      tdsAmount:   txn.tdsAmount || 0,
    });
    setEditTxnModal(txn);
  };

  const handleEditTxn = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put(`/parties/${editTxnForm.partyId}/transactions/${editTxnModal._id}`, editTxnForm);
      toast.success('Transaction updated!');
      setEditTxnModal(null);
      fetchParties();
      if (detailModal) {
        const r = await api.get(`/parties/${editTxnForm.partyId}`);
        setDetailModal(r.data);
      }
    } catch(e) { toast.error(e.response?.data?.message || 'Error updating'); }
    finally { setSaving(false); }
  };

  const handleDeleteTxn = async () => {
    try {
      const { partyId, _id } = deleteTxnConfirm;
      await api.delete(`/parties/${partyId}/transactions/${_id}`);
      toast.success('Transaction deleted and balances reversed.');
      setDeleteTxnConfirm(null);
      fetchParties();
      if (detailModal) {
        const r = await api.get(`/parties/${partyId}`);
        setDetailModal(r.data);
      }
    } catch(e) { toast.error(e.response?.data?.message || 'Error deleting'); }
  };

  const TXN_LABELS = {
    salary_payment:'Salary', advance_given:'Advance Given', advance_recovery:'Advance Recovery',
    drawings:'Drawings', profit_share:'Profit Share', contractor_payment:'Payment',
    expense_payment:'Expense', reimbursement:'Reimbursement', tds_deduction:'TDS', pf_contribution:'PF'
  };

  return (
    <AppLayout title="Parties">
      {/* ── Header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Parties</h1>
          <p>Directors, Employees, Contractors & Expense Accounts</p>
        </div>
        <div className="page-header-right">
          <div className="search-bar">
            <Search size={14} color="var(--gray-400)" />
            <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={openAdd} style={{ background: cfg.color }}>
            <Plus size={15} /> Add {cfg.label.slice(0, -1)}
          </button>
        </div>
      </div>

      {/* ── Summary KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '20px' }}>
        {Object.entries(TYPE_CONFIG).map(([key, c]) => {
          const count = summary.counts?.[key];
          return (
            <button key={key} onClick={() => setActiveTab(key)}
              style={{ background: activeTab===key ? c.color : 'white', color: activeTab===key ? 'white' : 'var(--gray-800)', border: `1.5px solid ${activeTab===key ? c.color : 'var(--gray-200)'}`, borderRadius: '12px', padding: '16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', boxShadow: activeTab===key ? `0 4px 14px ${c.color}44` : 'none' }}>
              <c.icon size={18} style={{ marginBottom: '8px', color: activeTab===key ? 'white' : c.color }} />
              <div style={{ fontWeight: 800, fontSize: '13px' }}>{c.label}</div>
              <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px' }}>{count?.active || 0}</div>
              <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>active</div>
            </button>
          );
        })}
      </div>

      {/* ── Extra stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '20px' }}>
        <StatCard icon="💰" label="Director Capital Invested" value={`₹${(summary.totalCapital||0).toLocaleString('en-IN')}`} color="#16a34a" />
        <StatCard icon="🏦" label="Director Loans Outstanding" value={`₹${(summary.totalLoanOutstanding||0).toLocaleString('en-IN')}`} color="#ef4444" />
        <StatCard icon="🧾" label="Expenses This Month" value={`₹${(summary.expenseThisMonth||0).toLocaleString('en-IN')}`} color="#ef4444" />
      </div>

      {/* ── Table ── */}
      <div className="card">
        <div className="card-header">
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background: cfg.color }} />
            <div className="card-title">{cfg.label}</div>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                {activeTab === 'director'       && <><th>Designation</th><th>Share %</th><th style={{color:'#16a34a'}}>💰 Capital</th><th style={{color:'#ef4444'}}>🏦 Loan Outstanding</th><th style={{color:'#8b5cf6'}}>📤 Drawings</th></>}
                {activeTab === 'employee'       && <><th>Employee ID</th><th>Department</th><th>Gross Salary</th><th>Advance</th></>}
                {activeTab === 'contractor'     && <><th>Service Type</th><th>TDS %</th><th>Contract Value</th></>}
                {activeTab === 'expense_account'&& <><th>Category</th><th>Monthly Budget</th></>}
                <th>Total Paid</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={9} style={{ textAlign:'center', padding:'32px' }}><div className="spinner" style={{ margin:'0 auto' }}/></td></tr>
                : parties.length === 0
                ? <tr><td colSpan={9}><div className="empty-state"><div className="empty-icon">{activeTab==='director'?'👔':activeTab==='employee'?'👤':activeTab==='contractor'?'🔧':'💳'}</div><div className="empty-title">No {cfg.label} yet</div><div className="empty-desc">Click "Add" to get started.</div></div></td></tr>
                : parties.map(p => (
                  <tr key={p._id}>
                    <td><span className="td-mono" style={{ color: cfg.color, fontWeight:700 }}>{p.code}</span></td>
                    <td style={{ fontWeight:600, color:'var(--gray-900)' }}>{p.name}</td>

                    {activeTab === 'director' && <>
                      <td>{p.designation || '—'}</td>
                      <td>{p.shareholding ? `${p.shareholding}%` : '—'}</td>
                      <td style={{ color:'#16a34a', fontWeight:700 }}>₹{(p.capitalContributed||0).toLocaleString('en-IN')}</td>
                      <td>
                        {(p.loanOutstanding||0) > 0
                          ? <span style={{background:'#fff1f2',color:'#ef4444',fontWeight:700,padding:'3px 10px',borderRadius:'6px',fontSize:'12.5px'}}>₹{(p.loanOutstanding||0).toLocaleString('en-IN')}</span>
                          : <span style={{color:'var(--gray-300)'}}>—</span>}
                      </td>
                      <td style={{ color:'#8b5cf6', fontWeight:600 }}>₹{(p.drawingsAccount||0).toLocaleString('en-IN')}</td>
                    </>}
                    {activeTab === 'employee' && <>
                      <td className="td-mono">{p.employeeId || '—'}</td>
                      <td>{p.department || '—'}</td>
                      <td className="td-amount">₹{(p.grossSalary||0).toLocaleString('en-IN')}</td>
                      <td style={{ color: p.advanceBalance>0 ? 'var(--orange)':'var(--gray-400)', fontWeight:600 }}>₹{(p.advanceBalance||0).toLocaleString('en-IN')}</td>
                    </>}
                    {activeTab === 'contractor' && <>
                      <td>{p.serviceType || '—'}</td>
                      <td>{p.tdsPercent ? `${p.tdsPercent}%` : '—'}</td>
                      <td className="td-amount">₹{(p.contractValue||0).toLocaleString('en-IN')}</td>
                    </>}
                    {activeTab === 'expense_account' && <>
                      <td>{p.expenseCategory || '—'}</td>
                      <td className="td-amount">₹{(p.budgetMonthly||0).toLocaleString('en-IN')}/mo</td>
                    </>}

                    <td style={{ textAlign:'right', fontWeight:700, color:'var(--gray-900)' }}>₹{(p.totalPaid||0).toLocaleString('en-IN')}</td>
                    <td><span className={`badge ${p.isActive ? 'badge-success':'badge-gray'}`}>{p.isActive?'Active':'Inactive'}</span></td>
                    <td>
                      <div style={{ display:'flex', gap:'6px' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => openDetail(p)} title="View"><Eye size={12}/></button>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)} title="Edit"><Edit2 size={12}/></button>
                        <button className="btn btn-sm" style={{ background: cfg.color+'18', color: cfg.color, border:`1px solid ${cfg.color}44`, borderRadius:'6px', padding:'5px 10px', fontSize:'12px', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:'4px' }}
                          onClick={() => { setTxnModal(p); setTxnForm({ type: cfg.txnTypes[0].value, amount:0, date:new Date().toISOString().slice(0,10), month:new Date().toISOString().slice(0,7), description:'', paymentMode:'bank', reference:'', tdsAmount:0 }); }}>
                          <CreditCard size={12}/>Pay
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ ADD/EDIT MODAL ═══ */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: cfg.color }}>{editing ? 'Edit' : 'Add'} {cfg.label.slice(0,-1)}</h3>
              <button onClick={()=>setModal(false)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)' }}><X size={18}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {/* ── Common fields ── */}
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Full Name <span className="req">*</span></label><input required className="form-input" value={form.name} onChange={e=>sf('name',e.target.value)} placeholder="Full name"/></div>
                  <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email||''} onChange={e=>sf('email',e.target.value)}/></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone||''} onChange={e=>sf('phone',e.target.value)}/></div>
                  <div className="form-group"><label className="form-label">PAN Number</label><input className="form-input" value={form.panNumber||''} onChange={e=>sf('panNumber',e.target.value.toUpperCase())} maxLength={10} placeholder="ABCDE1234F"/></div>
                </div>

                {/* ── Director specific ── */}
                {activeTab==='director' && <>
                  <div className="divider"/>
                  <div style={{ fontWeight:700, fontSize:'13px', color:'#8b5cf6', marginBottom:'12px' }}>Director Details</div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Designation</label><input className="form-input" value={form.designation||''} onChange={e=>sf('designation',e.target.value)} placeholder="Managing Director"/></div>
                    <div className="form-group"><label className="form-label">DIN Number</label><input className="form-input" value={form.dinNumber||''} onChange={e=>sf('dinNumber',e.target.value)} placeholder="Director Identification No."/></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Shareholding %</label><input type="number" min="0" max="100" className="form-input" value={form.shareholding||0} onChange={e=>sf('shareholding',+e.target.value)}/></div>
                    <div className="form-group"><label className="form-label">Profit Share %</label><input type="number" min="0" max="100" className="form-input" value={form.profitSharePercent||0} onChange={e=>sf('profitSharePercent',+e.target.value)}/></div>
                  </div>
                </>}

                {/* ── Employee specific ── */}
                {activeTab==='employee' && <>
                  <div className="divider"/>
                  <div style={{ fontWeight:700, fontSize:'13px', color:'#3b82f6', marginBottom:'12px' }}>Employee Details</div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Employee ID</label><input className="form-input" value={form.employeeId||''} onChange={e=>sf('employeeId',e.target.value.toUpperCase())} placeholder="EMP-001"/></div>
                    <div className="form-group"><label className="form-label">Department</label><select className="form-select" value={form.department||''} onChange={e=>sf('department',e.target.value)}>{DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Designation</label><input className="form-input" value={form.designation||''} onChange={e=>sf('designation',e.target.value)} placeholder="Plant Operator"/></div>
                    <div className="form-group"><label className="form-label">Join Date</label><input type="date" className="form-input" value={form.joinDate?form.joinDate.slice(0,10):''} onChange={e=>sf('joinDate',e.target.value)}/></div>
                  </div>
                  <div className="form-row-3">
                    <div className="form-group"><label className="form-label">Basic Salary (₹)</label><input type="number" min="0" className="form-input" value={form.basicSalary||0} onChange={e=>sf('basicSalary',+e.target.value)}/></div>
                    <div className="form-group"><label className="form-label">HRA (₹)</label><input type="number" min="0" className="form-input" value={form.hra||0} onChange={e=>sf('hra',+e.target.value)}/></div>
                    <div className="form-group"><label className="form-label">Other Allowances (₹)</label><input type="number" min="0" className="form-input" value={form.otherAllowances||0} onChange={e=>sf('otherAllowances',+e.target.value)}/></div>
                  </div>
                  <div style={{ background:'var(--primary-pale)', borderRadius:'8px', padding:'10px 14px', marginBottom:'12px', fontSize:'13px', fontWeight:600, color:'var(--primary)' }}>
                    Gross Salary: ₹{((form.basicSalary||0)+(form.hra||0)+(form.otherAllowances||0)).toLocaleString('en-IN')} / month
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Aadhar Number</label><input className="form-input" value={form.aadharNumber||''} onChange={e=>sf('aadharNumber',e.target.value)} maxLength={12}/></div>
                    <div className="form-group"><label className="form-label">TDS Rate %</label><input type="number" min="0" className="form-input" value={form.tdsRate||0} onChange={e=>sf('tdsRate',+e.target.value)}/></div>
                  </div>
                  <div style={{ display:'flex', gap:'24px', marginBottom:'12px' }}>
                    <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'13.5px', fontWeight:500 }}>
                      <input type="checkbox" checked={form.pfApplicable||false} onChange={e=>sf('pfApplicable',e.target.checked)} style={{ width:16, height:16 }}/>PF Applicable
                    </label>
                    <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontSize:'13.5px', fontWeight:500 }}>
                      <input type="checkbox" checked={form.esiApplicable||false} onChange={e=>sf('esiApplicable',e.target.checked)} style={{ width:16, height:16 }}/>ESI Applicable
                    </label>
                  </div>
                </>}

                {/* ── Contractor specific ── */}
                {activeTab==='contractor' && <>
                  <div className="divider"/>
                  <div style={{ fontWeight:700, fontSize:'13px', color:'#f97316', marginBottom:'12px' }}>Contractor Details</div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Service Type</label><input className="form-input" value={form.serviceType||''} onChange={e=>sf('serviceType',e.target.value)} placeholder="Civil Work, Transport, etc."/></div>
                    <div className="form-group"><label className="form-label">GSTIN</label><input className="form-input" value={form.gstin||''} onChange={e=>sf('gstin',e.target.value.toUpperCase())} maxLength={15}/></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">TDS Section</label><select className="form-select" value={form.tdsSection||'194C'} onChange={e=>sf('tdsSection',e.target.value)}><option value="194C">194C - Contractor</option><option value="194J">194J - Professional</option><option value="194H">194H - Commission</option><option value="194I">194I - Rent</option></select></div>
                    <div className="form-group"><label className="form-label">TDS %</label><input type="number" min="0" className="form-input" value={form.tdsPercent||0} onChange={e=>sf('tdsPercent',+e.target.value)}/></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Contract Value (₹)</label><input type="number" min="0" className="form-input" value={form.contractValue||0} onChange={e=>sf('contractValue',+e.target.value)}/></div>
                    <div className="form-group"><label className="form-label">Contract Start</label><input type="date" className="form-input" value={form.contractStart?form.contractStart.slice(0,10):''} onChange={e=>sf('contractStart',e.target.value)}/></div>
                  </div>
                </>}

                {/* ── Expense Account specific ── */}
                {activeTab==='expense_account' && <>
                  <div className="divider"/>
                  <div style={{ fontWeight:700, fontSize:'13px', color:'#ef4444', marginBottom:'12px' }}>Expense Account Details</div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={form.expenseCategory||''} onChange={e=>sf('expenseCategory',e.target.value)}>{EXPENSE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                    <div className="form-group"><label className="form-label">Monthly Budget (₹)</label><input type="number" min="0" className="form-input" value={form.budgetMonthly||0} onChange={e=>sf('budgetMonthly',+e.target.value)}/></div>
                  </div>
                </>}

                {/* ── Bank details (all types except expense_account) ── */}
                {activeTab !== 'expense_account' && <>
                  <div className="divider"/>
                  <div style={{ fontWeight:700, fontSize:'13px', color:'var(--gray-600)', marginBottom:'12px' }}>Bank Details</div>
                  <div className="form-row-3">
                    <div className="form-group"><label className="form-label">Bank Name</label><input className="form-input" value={form.bankName||''} onChange={e=>sf('bankName',e.target.value)} placeholder="HDFC, SBI, etc."/></div>
                    <div className="form-group"><label className="form-label">Account Number</label><input className="form-input" value={form.bankAccount||''} onChange={e=>sf('bankAccount',e.target.value)}/></div>
                    <div className="form-group"><label className="form-label">IFSC Code</label><input className="form-input" value={form.ifscCode||''} onChange={e=>sf('ifscCode',e.target.value.toUpperCase())} placeholder="HDFC0001234"/></div>
                  </div>
                </>}

                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" rows={2} value={form.notes||''} onChange={e=>sf('notes',e.target.value)}/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: cfg.color }} disabled={saving}>
                  {saving ? <span className="spinner"/> : editing ? `Update` : `Add ${cfg.label.slice(0,-1)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ RECORD TRANSACTION MODAL ═══ */}
      {txnModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setTxnModal(null)}>
          <div className="modal modal-md">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Record Transaction</h3>
                <div style={{ fontSize:'13px', color: cfg.color, fontWeight:600, marginTop:'2px' }}>{txnModal.name} · {txnModal.code}</div>
              </div>
              <button onClick={()=>setTxnModal(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)' }}><X size={18}/></button>
            </div>
            <form onSubmit={handleTxn}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Transaction Type <span className="req">*</span></label>
                  <select required className="form-select" value={txnForm.type} onChange={e=>setTxnForm(f=>({...f,type:e.target.value}))}>
                    <option value="">Select type…</option>
                    {cfg.txnTypes.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Amount (₹) <span className="req">*</span></label><input required type="number" min="0.01" step="0.01" className="form-input" value={txnForm.amount} onChange={e=>setTxnForm(f=>({...f,amount:+e.target.value}))}/></div>
                  <div className="form-group"><label className="form-label">Date</label><input type="date" className="form-input" value={txnForm.date} onChange={e=>setTxnForm(f=>({...f,date:e.target.value}))}/></div>
                </div>
                {(activeTab==='employee') && (
                  <div className="form-group"><label className="form-label">Salary Month</label><input type="month" className="form-input" value={txnForm.month} onChange={e=>setTxnForm(f=>({...f,month:e.target.value}))}/></div>
                )}
                {(activeTab==='contractor') && (
                  <div className="form-group"><label className="form-label">TDS Deducted (₹)</label><input type="number" min="0" step="0.01" className="form-input" value={txnForm.tdsAmount} onChange={e=>setTxnForm(f=>({...f,tdsAmount:+e.target.value}))} placeholder="TDS amount"/>
                    {txnForm.tdsAmount>0 && <div style={{ fontSize:'12px', color:'var(--primary)', marginTop:'4px' }}>Net payable: ₹{(txnForm.amount-txnForm.tdsAmount).toLocaleString('en-IN')}</div>}
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Payment Mode</label><select className="form-select" value={txnForm.paymentMode} onChange={e=>setTxnForm(f=>({...f,paymentMode:e.target.value}))}><option value="bank">Bank Transfer</option><option value="cash">Cash</option><option value="upi">UPI</option><option value="cheque">Cheque</option><option value="neft">NEFT</option><option value="rtgs">RTGS</option></select></div>
                  <div className="form-group"><label className="form-label">Reference / UTR</label><input className="form-input" value={txnForm.reference} onChange={e=>setTxnForm(f=>({...f,reference:e.target.value}))} placeholder="UTR, cheque no…"/></div>
                </div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" rows={2} value={txnForm.description} onChange={e=>setTxnForm(f=>({...f,description:e.target.value}))}/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setTxnModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: cfg.color }} disabled={saving}>
                  {saving ? <span className="spinner"/> : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ DETAIL MODAL ═══ */}
      {detailModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setDetailModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{detailModal.data.name}</h3>
                <div style={{ fontSize:'12px', color:'var(--gray-400)', marginTop:'2px' }}>{detailModal.data.code} · {TYPE_CONFIG[detailModal.data.type]?.label.slice(0,-1)}</div>
              </div>
              <button onClick={()=>setDetailModal(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)' }}><X size={18}/></button>
            </div>
            <div className="modal-body">
              {/* Director financial summary card */}
              {detailModal.data.type === 'director' && (
                <div style={{ marginBottom:'20px' }}>
                  <div style={{ fontWeight:700, fontSize:'13px', color:'var(--gray-500)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>Financial Position</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'12px' }}>
                    <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'10px', padding:'14px' }}>
                      <div style={{ fontSize:'11px', fontWeight:700, color:'#15803d', textTransform:'uppercase', marginBottom:'6px' }}>💰 Capital Invested</div>
                      <div style={{ fontSize:'18px', fontWeight:800, color:'#15803d' }}>₹{(detailModal.data.capitalContributed||0).toLocaleString('en-IN')}</div>
                      <div style={{ fontSize:'11px', color:'#16a34a', marginTop:'3px' }}>Equity contribution</div>
                    </div>
                    <div style={{ background: (detailModal.data.loanOutstanding||0)>0 ? '#fff1f2':'#f9fafb', border:`1px solid ${(detailModal.data.loanOutstanding||0)>0?'#fecdd3':'var(--gray-200)'}`, borderRadius:'10px', padding:'14px' }}>
                      <div style={{ fontSize:'11px', fontWeight:700, color:(detailModal.data.loanOutstanding||0)>0?'#b91c1c':'var(--gray-400)', textTransform:'uppercase', marginBottom:'6px' }}>🏦 Loan Outstanding</div>
                      <div style={{ fontSize:'18px', fontWeight:800, color:(detailModal.data.loanOutstanding||0)>0?'#ef4444':'var(--gray-300)' }}>₹{(detailModal.data.loanOutstanding||0).toLocaleString('en-IN')}</div>
                      <div style={{ fontSize:'11px', color:'var(--gray-400)', marginTop:'3px' }}>Given: ₹{(detailModal.data.loanGiven||0).toLocaleString('en-IN')} · Repaid: ₹{(detailModal.data.loanRepaid||0).toLocaleString('en-IN')}</div>
                    </div>
                    <div style={{ background:'#faf5ff', border:'1px solid #e9d5ff', borderRadius:'10px', padding:'14px' }}>
                      <div style={{ fontSize:'11px', fontWeight:700, color:'#7c3aed', textTransform:'uppercase', marginBottom:'6px' }}>📤 Total Drawings</div>
                      <div style={{ fontSize:'18px', fontWeight:800, color:'#8b5cf6' }}>₹{(detailModal.data.drawingsAccount||0).toLocaleString('en-IN')}</div>
                      <div style={{ fontSize:'11px', color:'#8b5cf6', marginTop:'3px' }}>Withdrawn by director</div>
                    </div>
                    <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'10px', padding:'14px' }}>
                      <div style={{ fontSize:'11px', fontWeight:700, color:'#1d4ed8', textTransform:'uppercase', marginBottom:'6px' }}>📊 Shareholding</div>
                      <div style={{ fontSize:'18px', fontWeight:800, color:'#3b82f6' }}>{detailModal.data.shareholding||0}%</div>
                      <div style={{ fontSize:'11px', color:'#3b82f6', marginTop:'3px' }}>Profit share: {detailModal.data.profitSharePercent||0}%</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Info grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'20px' }}>
                {detailModal.data.email && <InfoBox label="Email" value={detailModal.data.email}/>}
                {detailModal.data.phone && <InfoBox label="Phone" value={detailModal.data.phone}/>}
                {detailModal.data.panNumber && <InfoBox label="PAN" value={detailModal.data.panNumber}/>}
                {detailModal.data.designation && <InfoBox label="Designation" value={detailModal.data.designation}/>}
                {detailModal.data.department && <InfoBox label="Department" value={detailModal.data.department}/>}
                {detailModal.data.grossSalary>0 && <InfoBox label="Gross Salary" value={`₹${detailModal.data.grossSalary.toLocaleString('en-IN')}/mo`}/>}
                {detailModal.data.advanceBalance>0 && <InfoBox label="Advance Outstanding" value={`₹${detailModal.data.advanceBalance.toLocaleString('en-IN')}`} highlight/>}
                {detailModal.data.tdsPercent>0 && <InfoBox label="TDS %" value={`${detailModal.data.tdsPercent}% (${detailModal.data.tdsSection})`}/>}
                {detailModal.data.bankAccount && <InfoBox label="Bank A/c" value={`${detailModal.data.bankName} · ${detailModal.data.bankAccount}`}/>}
              </div>

              {/* Transactions */}
              <div style={{ fontWeight:700, fontSize:'14px', color:'var(--gray-800)', marginBottom:'12px' }}>Recent Transactions</div>
              {detailModal.transactions?.length === 0
                ? <div style={{ textAlign:'center', padding:'24px', color:'var(--gray-400)', fontSize:'13px' }}>No transactions yet</div>
                : <table className="data-table">
                    <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>TDS</th><th>Net</th><th>Mode</th><th>Reference</th><th></th></tr></thead>
                    <tbody>
                      {detailModal.transactions.map(t=>(
                        <tr key={t._id}>
                          <td>{new Date(t.date).toLocaleDateString('en-IN')}</td>
                          <td><span className="badge badge-gray" style={{ fontSize:'11px' }}>{TXN_LABELS[t.type]||t.type}</span></td>
                          <td className="td-amount">₹{t.amount?.toLocaleString('en-IN')}</td>
                          <td style={{ textAlign:'right', color:'var(--red)', fontSize:'12px' }}>{t.tdsAmount>0?`₹${t.tdsAmount.toLocaleString('en-IN')}`:'—'}</td>
                          <td style={{ textAlign:'right', fontWeight:700, color:'var(--primary)' }}>₹{(t.netAmount||t.amount)?.toLocaleString('en-IN')}</td>
                          <td><span className="badge badge-gray" style={{ textTransform:'uppercase', fontSize:'10px' }}>{t.paymentMode}</span></td>
                          <td className="td-mono" style={{ color:'var(--gray-500)', fontSize:'12px' }}>{t.reference||'—'}</td>
                          <td>
                            <div style={{display:'flex',gap:'5px'}}>
                              <button onClick={()=>openEditTxn(t, detailModal.data._id)} title="Edit"
                                style={{padding:'4px 7px',background:'#eff6ff',border:'none',borderRadius:'5px',cursor:'pointer',color:'#3b82f6',display:'flex',alignItems:'center'}}>
                                <Pencil size={12}/>
                              </button>
                              <button onClick={()=>setDeleteTxnConfirm({...t, partyId: detailModal.data._id})} title="Delete"
                                style={{padding:'4px 7px',background:'#fff1f2',border:'none',borderRadius:'5px',cursor:'pointer',color:'#ef4444',display:'flex',alignItems:'center'}}>
                                <Trash2 size={12}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              }
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

      {/* ══ EDIT TRANSACTION MODAL ══ */}
      {editTxnModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setEditTxnModal(null)}>
          <div className="modal modal-md">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">✏️ Edit Transaction</h3>
                <div style={{fontSize:'12px',color:'var(--gray-400)',marginTop:'3px'}}>
                  {TXN_LABELS[editTxnModal.type]||editTxnModal.type}
                </div>
              </div>
              <button onClick={()=>setEditTxnModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)'}}><X size={18}/></button>
            </div>
            <form onSubmit={handleEditTxn}>
              <div className="modal-body">
                <div style={{background:'#fff8f0',border:'1px solid #fed7aa',borderRadius:'8px',padding:'10px 14px',marginBottom:'16px',fontSize:'12.5px',color:'#92400e',fontWeight:600}}>
                  ⚠️ Editing will reverse old bank & party balances and apply new values automatically.
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Amount (₹) <span className="req">*</span></label>
                    <input required type="number" min="0.01" step="0.01" className="form-input"
                      value={editTxnForm.amount} onChange={e=>setEditTxnForm(f=>({...f,amount:e.target.value}))}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-input"
                      value={editTxnForm.date} onChange={e=>setEditTxnForm(f=>({...f,date:e.target.value}))}/>
                  </div>
                </div>
                {parseFloat(editTxnForm.tdsAmount) > 0 && (
                  <div className="form-group">
                    <label className="form-label">TDS Amount (₹)</label>
                    <input type="number" min="0" step="0.01" className="form-input"
                      value={editTxnForm.tdsAmount} onChange={e=>setEditTxnForm(f=>({...f,tdsAmount:e.target.value}))}/>
                  </div>
                )}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select className="form-select" value={editTxnForm.paymentMode} onChange={e=>setEditTxnForm(f=>({...f,paymentMode:e.target.value}))}>
                      <option value="bank">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="cheque">Cheque</option>
                      <option value="neft">NEFT</option>
                      <option value="rtgs">RTGS</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reference</label>
                    <input className="form-input" value={editTxnForm.reference}
                      onChange={e=>setEditTxnForm(f=>({...f,reference:e.target.value}))}/>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" rows={2} value={editTxnForm.description}
                    onChange={e=>setEditTxnForm(f=>({...f,description:e.target.value}))}/>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setEditTxnModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving?<span className="spinner"/>:<><Pencil size={13}/> Save Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ DELETE TRANSACTION CONFIRM ══ */}
      {deleteTxnConfirm && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setDeleteTxnConfirm(null)}>
          <div className="modal" style={{maxWidth:'420px'}}>
            <div className="modal-header">
              <h3 className="modal-title" style={{color:'#ef4444'}}>🗑️ Delete Transaction</h3>
              <button onClick={()=>setDeleteTxnConfirm(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)'}}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <p style={{fontSize:'14px',color:'var(--gray-700)',marginBottom:'12px'}}>
                Delete <strong>{TXN_LABELS[deleteTxnConfirm.type]||deleteTxnConfirm.type}</strong> of <strong>₹{deleteTxnConfirm.amount?.toLocaleString('en-IN')}</strong>?
              </p>
              <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:'8px',padding:'12px',fontSize:'13px',color:'#14532d',fontWeight:600}}>
                ✅ Party balances and bank balance will be automatically reversed.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setDeleteTxnConfirm(null)}>Cancel</button>
              <button onClick={handleDeleteTxn}
                style={{background:'#ef4444',color:'white',border:'none',padding:'8px 20px',borderRadius:'8px',fontFamily:'inherit',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ background:'white', border:'1px solid var(--gray-200)', borderRadius:'12px', padding:'16px', display:'flex', alignItems:'center', gap:'14px' }}>
      <div style={{ fontSize:'24px' }}>{icon}</div>
      <div>
        <div style={{ fontSize:'11.5px', color:'var(--gray-500)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>
        <div style={{ fontSize:'18px', fontWeight:800, color, marginTop:'4px' }}>{value}</div>
      </div>
    </div>
  );
}

function InfoBox({ label, value, highlight }) {
  return (
    <div style={{ background: highlight ? 'var(--primary-pale)' : 'var(--gray-50)', borderRadius:'8px', padding:'10px 12px', border:`1px solid ${highlight?'var(--primary-light)':'var(--gray-200)'}` }}>
      <div style={{ fontSize:'11px', color:'var(--gray-400)', fontWeight:700, textTransform:'uppercase', marginBottom:'4px' }}>{label}</div>
      <div style={{ fontSize:'13.5px', fontWeight:600, color: highlight?'var(--primary)':'var(--gray-800)' }}>{value}</div>
    </div>
  );
}