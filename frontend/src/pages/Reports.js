import React, { useState, useEffect, useRef } from 'react';
import logo from '../assets/logo.js';
import AppLayout from '../components/layout/AppLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { BarChart2, TrendingUp, Users, Package, IndianRupee, Printer, ChevronDown } from 'lucide-react';

const REPORTS = [
  { id: 'profit-loss', label: 'Profit & Loss', icon: TrendingUp, color: '#16a34a', desc: 'Income vs expenses for a period' },
  { id: 'customer-outstanding', label: 'Customer Outstanding', icon: Users, color: '#f97316', desc: 'Aged receivables from customers' },
  { id: 'gst-summary', label: 'GST Summary', icon: IndianRupee, color: '#8b5cf6', desc: 'Output tax vs input credit' },
  { id: 'stock-summary', label: 'Stock Summary', icon: Package, color: '#3b82f6', desc: 'Current inventory with values' },
  { id: 'trial-balance', label: 'Trial Balance', icon: BarChart2, color: '#ef4444', desc: 'All account balances' },
];

const STMT_TYPES = [
  { id: 'cash', label: 'Cash Statement', color: '#92400e', emoji: '💵', api: '/bank', txnApi: (id, p) => `/payments/bank-statement?bankAccountId=${id}&from=${p.from}&to=${p.to}` },
  { id: 'bank', label: 'Bank Statement', color: '#0369a1', emoji: '🏦', api: '/bank', txnApi: (id, p) => `/payments/bank-statement?bankAccountId=${id}&from=${p.from}&to=${p.to}` },
  { id: 'customer', label: 'Customer Statement', color: '#16a34a', emoji: '🏢', api: '/customers', txnApi: (id, p) => `/invoices?customerId=${id}&from=${p.from}&to=${p.to}&limit=200`, pmtApi: (id, p) => `/payments?partyId=${id}&from=${p.from}&to=${p.to}&limit=200` },
  { id: 'vendor', label: 'Vendor Statement', color: '#3b82f6', emoji: '🚚', api: '/vendors', txnApi: (id, p) => `/purchases?vendorId=${id}&from=${p.from}&to=${p.to}&limit=200`, pmtApi: (id, p) => `/payments?partyId=${id}&from=${p.from}&to=${p.to}&limit=200` },
  { id: 'director', label: 'Director Statement', color: '#8b5cf6', emoji: '👔', api: '/parties?type=director&limit=100', txnApi: (id, p) => `/parties/${id}/transactions?from=${p.from}&to=${p.to}&limit=200` },
  { id: 'director_loan', label: 'Director Loan Ledger', color: '#dc2626', emoji: '🏦', api: '/parties?type=director&limit=100', txnApi: (id, p) => `/parties/${id}/transactions?from=${p.from}&to=${p.to}&limit=200` },
  { id: 'employee', label: 'Employee Statement', color: '#0ea5e9', emoji: '👤', api: '/parties?type=employee&limit=100', txnApi: (id, p) => `/parties/${id}/transactions?from=${p.from}&to=${p.to}&limit=200` },
  { id: 'contractor', label: 'Contractor Statement', color: '#f97316', emoji: '🔧', api: '/parties?type=contractor&limit=100', txnApi: (id, p) => `/parties/${id}/transactions?from=${p.from}&to=${p.to}&limit=200` },
];

const TXN_LABELS = {
  receipt: 'Receipt', payment: 'Payment',
  capital_investment: 'Capital Investment', director_loan: 'Director Loan', loan_repayment: 'Loan Repayment',
  drawings: 'Drawings', profit_share: 'Profit Share',
  salary_payment: 'Salary', advance_given: 'Advance Given', advance_recovery: 'Advance Recovery',
  contractor_payment: 'Contractor Payment', expense_payment: 'Expense Payment',
  reimbursement: 'Reimbursement', tds_deduction: 'TDS Deduction', pf_contribution: 'PF Contribution',
};

const fmt = (n) => '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

// ── Print styles injected once ─────────────────────────────────
const PRINT_CSS = `
@media print {
  /* Step 1: hide everything */
  body * { visibility: hidden !important; }

  /* Step 2: show printable and all its children */
  #printable, #printable * { visibility: visible !important; }

  /* Step 3: position printable at top, flowing normally (NOT fixed) */
  #printable {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    padding: 20px !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: white !important;
    font-size: 11px !important;
  }

  /* Multi-page table support */
  table  { width: 100% !important; border-collapse: collapse !important; }
  thead  { display: table-header-group !important; }
  tfoot  { display: table-footer-group !important; }
  tr     { page-break-inside: avoid !important; }

  /* Keep letterhead and summary together on one page */
  .print-header  { page-break-after: avoid !important; page-break-inside: avoid !important; }
  .print-summary { page-break-after: avoid !important; page-break-inside: avoid !important; }

  /* Page settings */
  @page { size: A4 portrait; margin: 1.2cm; }

  /* Hide buttons */
  button { display: none !important; }
}`;

export default function Reports() {
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  // Statement state
  const [stmtType, setStmtType] = useState(null);
  const [partyList, setPartyList] = useState([]);
  const [partyId, setPartyId] = useState('');
  const [stmtData, setStmtData] = useState(null);
  const [stmtLoading, setStmtLoading] = useState(false);

  useEffect(() => {
    // inject print CSS once
    if (!document.getElementById('gl-print-css')) {
      const s = document.createElement('style');
      s.id = 'gl-print-css'; s.textContent = PRINT_CSS;
      document.head.appendChild(s);
    }
  }, []);

  const runReport = async (id) => {
    setSelected(id); setLoading(true); setData(null);
    try {
      const r = await api.get(`/reports/${id}`, { params: { from, to } });
      setData(r.data.data);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  const selectStmtType = async (type) => {
    setStmtType(type); setPartyId(''); setStmtData(null);
    try {
      const r = await api.get(type.api);
      setPartyList(r.data.data || []);
    } catch { toast.error('Failed to load list'); }
  };

  const runStatement = async () => {
    if (!partyId) return toast.error('Please select a party first.');
    setStmtLoading(true); setStmtData(null);
    try {
      const party = partyList.find(p => p._id === partyId);
      const params = { from, to };
      const isCash = stmtType.id === 'cash' || stmtType.id === 'bank';
      const isPeople = ['director', 'director_loan', 'employee', 'contractor'].includes(stmtType.id);

      let transactions = [], payments = [];
      const txnRes = await api.get(stmtType.txnApi(partyId, params));
      transactions = txnRes.data.data || [];

      if (!isPeople) {
        try {
          const pmtRes = await api.get(stmtType.pmtApi(partyId, params));
          payments = pmtRes.data.data || [];
        } catch { /* payments optional */ }
      }

      // Build unified ledger
      const ledger = [];
      if (isCash) {
        // Bank/Cash statement — response already normalised by bank-statement endpoint
        transactions.forEach(t => {
          ledger.push({
            date: t.date,
            ref: t.ref || t._id?.slice(-6).toUpperCase(),
            description: t.description || t.type,
            partyName: t.partyName || '',
            debit: t.isIn ? t.amount || 0 : 0,   // money IN  → debit (increases balance)
            credit: !t.isIn ? t.amount || 0 : 0,   // money OUT → credit (decreases balance)
            mode: t.mode,
            raw: t,
          });
        });
      } else if (isPeople) {
        // For loan ledger — filter only loan transactions and assign DR/CR properly
        const isLoanLedger = stmtType.id === 'director_loan';
        const filtered = isLoanLedger
          ? transactions.filter(t => ['director_loan', 'loan_repayment'].includes(t.type))
          : transactions;

        filtered.forEach(t => {
          // Loan DR/CR logic:
          // director_loan = Director gives money to company → Loan increases → CR (liability goes up)
          // loan_repayment = Company pays back director → Loan decreases → DR (liability goes down)
          const isLoanIn = t.type === 'director_loan';
          const isLoanOut = t.type === 'loan_repayment';

          ledger.push({
            date: t.date,
            ref: t.reference || t._id?.slice(-6).toUpperCase(),
            description: TXN_LABELS[t.type] || t.type,
            debit: isLoanLedger ? (isLoanOut ? t.amount || 0 : 0) : 0,
            credit: isLoanLedger ? (isLoanIn ? t.amount || 0 : 0) : (t.amount || 0),
            mode: t.paymentMode,
            bankAccount: t.bankAccountName || '',
            raw: t,
          });
        });
      } else if (!isCash) {
        transactions.forEach(t => ledger.push({
          date: t.date || t.invoiceDate || t.billDate,
          ref: t.invoiceNumber || t.billNumber || t._id?.slice(-6).toUpperCase(),
          description: stmtType.id === 'customer' ? `Invoice ${t.invoiceNumber || ''}` : `Bill ${t.billNumber || ''}`,
          debit: t.totalAmount || t.total || 0, credit: 0, raw: t,
        }));
        payments.forEach(t => ledger.push({
          date: t.paymentDate || t.date,
          ref: t.paymentNumber || t._id?.slice(-6).toUpperCase(),
          description: t.type === 'receipt' ? 'Payment Received' : 'Payment Made',
          debit: 0, credit: t.amount || 0, raw: t,
        }));
      }
      ledger.sort((a, b) => new Date(a.date || a.paymentDate) - new Date(b.date || b.paymentDate));

      // Running balance — single source of truth
      // opening balance only applies to bank/cash accounts
      const openingBal = isCash ? (party?.openingBalance || 0) : 0;
      let bal = openingBal;
      const isLoanLedger = stmtType.id === 'director_loan';

      const rows = ledger.map(r => {
        if (isLoanLedger) {
          bal += (r.credit - r.debit);  // ✅ FIXED
        } else {
          bal += (r.debit - r.credit);  // existing logic
        }
        return { ...r, balance: bal };
      });
      // bal is now: openingBalance + all IN - all OUT = closing balance
      setStmtData({ party, rows, closingBalance: bal, openingBalance: openingBal, type: stmtType.id });
    } catch (e) { toast.error('Failed to load statement: ' + (e.response?.data?.message || e.message)); }
    finally { setStmtLoading(false); }
  };

  const handlePrint = () => window.print();

  return (
    <AppLayout title="Reports">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Financial Reports</h1>
          <p>Generate, view and print accounting statements</p>
        </div>
        <div className="page-header-right">
          <label style={{ fontSize: '13px', color: 'var(--gray-500)', fontWeight: 500 }}>From</label>
          <input className="form-input" type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width: '150px' }} />
          <label style={{ fontSize: '13px', color: 'var(--gray-500)', fontWeight: 500 }}>To</label>
          <input className="form-input" type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width: '150px' }} />
        </div>
      </div>

      {/* ── Financial Reports tiles ── */}
      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Financial Reports</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '14px', marginBottom: '28px' }}>
        {REPORTS.map(r => (
          <button key={r.id} onClick={() => { runReport(r.id); setStmtData(null); }}
            style={{ background: selected === r.id ? r.color : 'white', color: selected === r.id ? 'white' : 'var(--gray-800)', border: `1.5px solid ${selected === r.id ? r.color : 'var(--gray-200)'}`, borderRadius: '12px', padding: '20px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', boxShadow: selected === r.id ? `0 4px 14px ${r.color}44` : 'none' }}>
            <r.icon size={22} style={{ marginBottom: '10px', color: selected === r.id ? 'white' : r.color }} />
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{r.label}</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>{r.desc}</div>
          </button>
        ))}
      </div>

      {/* ── Party Statements section ── */}
      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>🖨️ Printable Party Statements</div>
      <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>

        {/* Step 1 — pick type */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Step 1 — Select Statement Type</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {STMT_TYPES.map(t => (
              <button key={t.id} onClick={() => selectStmtType(t)}
                style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${t.color}`, background: stmtType?.id === t.id ? t.color : 'white', color: stmtType?.id === t.id ? 'white' : t.color, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s' }}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2 — pick party + run */}
        {stmtType && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Step 2 — Select {stmtType.label.replace(' Statement', '')}</div>
              <select className="form-select" value={partyId} onChange={e => setPartyId(e.target.value)} style={{ borderColor: stmtType.color }}>
                <option value="">Choose…</option>
                {(stmtType.id === 'cash'
                  ? partyList.filter(p => p.accountType === 'cash' || p.accountName?.toLowerCase().includes('cash'))
                  : stmtType.id === 'bank'
                    ? partyList.filter(p => p.accountType !== 'cash')
                    : partyList
                ).map(p => <option key={p._id} value={p._id}>{p.accountName || p.name}{p.code ? ` (${p.code})` : ''}</option>)}
              </select>
            </div>
            <button onClick={runStatement} disabled={!partyId || stmtLoading}
              style={{ padding: '10px 24px', borderRadius: '8px', background: stmtType.color, color: 'white', border: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', opacity: !partyId ? 0.5 : 1 }}>
              {stmtLoading ? <span className="spinner" style={{ borderColor: 'white', borderTopColor: 'transparent' }} /> : '📄 Generate Statement'}
            </button>
          </div>
        )}
      </div>

      {/* ── Financial report results ── */}
      {loading && <div className="loading-page"><div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>}
      {!loading && data && selected === 'profit-loss' && <PLReport data={data} onPrint={handlePrint} />}
      {!loading && data && selected === 'customer-outstanding' && <CustomerOutstanding data={data} onPrint={handlePrint} />}
      {!loading && data && selected === 'gst-summary' && <GSTReport data={data} onPrint={handlePrint} />}
      {!loading && data && selected === 'stock-summary' && <StockReport data={data} onPrint={handlePrint} />}
      {!loading && data && selected === 'trial-balance' && <TrialBalance data={data} onPrint={handlePrint} />}

      {/* ── Party statement result ── */}
      {stmtData && <PartyStatement data={stmtData} from={from} to={to} onPrint={handlePrint} />}
    </AppLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTY STATEMENT
// ─────────────────────────────────────────────────────────────────────────────
function PartyStatement({ data, from, to, onPrint }) {
  const { party, rows, closingBalance, openingBalance, type } = data;

  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

  const TYPE_META = {
    customer: { label: 'Customer', color: '#16a34a', debitLabel: 'Invoice Amount', creditLabel: 'Payment Received' },
    vendor: { label: 'Vendor', color: '#3b82f6', debitLabel: 'Bill Amount', creditLabel: 'Payment Made' },
    director: { label: 'Director', color: '#8b5cf6', debitLabel: 'Amount', creditLabel: 'Amount' },
    director_loan: { label: 'Director Loan', color: '#dc2626', debitLabel: 'Repaid (DR)', creditLabel: 'Loan Given (CR)' },
    cash: { label: 'Cash in Hand', color: '#92400e', debitLabel: 'Cash In', creditLabel: 'Cash Out' },
    bank: { label: 'Bank Account', color: '#0369a1', debitLabel: 'Credit (IN)', creditLabel: 'Debit (OUT)' },
    employee: { label: 'Employee', color: '#0ea5e9', debitLabel: 'Amount', creditLabel: 'Amount' },
    contractor: { label: 'Contractor', color: '#f97316', debitLabel: 'Amount', creditLabel: 'Amount' },
  };
  const meta = TYPE_META[type] || TYPE_META.customer;

  return (
    <div>
      {/* Print button bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--gray-800)' }}>
          {meta.label} Statement — <span style={{ color: meta.color }}>{party.name}</span>
        </div>
        <button onClick={onPrint}
          style={{ padding: '10px 22px', background: meta.color, color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'inherit', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: `0 2px 12px ${meta.color}44` }}>
          <Printer size={15} /> Print Statement
        </button>
      </div>

      {/* ── PRINTABLE AREA ── */}
      <div id="printable" style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: '14px', padding: '32px', fontFamily: 'inherit' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
          <div>
            <img src={logo} alt="Tesseract Flex Fuel" style={{ width: '180px', marginBottom: '6px', display: 'block' }} />
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Sustainable Biodiesel Manufacturer</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>44B Suncity Industrial Park, Haripura</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Ta.Savli Dist. Vadodara, Gujarat</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>CIN : U46610GJ2023PTC144557</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{meta.label} Statement</div>
            <div style={{ fontSize: '13px', color: '#374151', marginTop: '4px', fontWeight: 600 }}>{party.name}</div>
            {party.gstin && <div style={{ fontSize: '12px', color: '#6b7280' }}>GSTIN: {party.gstin}</div>}
            {party.code && <div style={{ fontSize: '12px', color: '#6b7280' }}>Code: {party.code}</div>}
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Period: {new Date(from).toLocaleDateString('en-IN')} → {new Date(to).toLocaleDateString('en-IN')}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Printed: {new Date().toLocaleDateString('en-IN')}</div>
          </div>
        </div>

        {/* Summary KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: '#f9fafb', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', borderLeft: `4px solid ${meta.color}` }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>{meta.debitLabel}</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>{fmt(totalDebit)}</div>
          </div>
          <div style={{ background: '#f9fafb', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', borderLeft: '4px solid #16a34a' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>{meta.creditLabel}</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a' }}>{fmt(totalCredit)}</div>
          </div>
          <div style={{ background: (type === 'bank' || type === 'cash') ? (closingBalance >= 0 ? '#f0fdf4' : '#fff7ed') : (closingBalance > 0 ? '#fff7ed' : '#f0fdf4'), border: `1px solid ${(type === 'bank' || type === 'cash') ? (closingBalance >= 0 ? '#bbf7d0' : '#fed7aa') : (closingBalance > 0 ? '#fed7aa' : '#bbf7d0')}`, borderRadius: '8px', padding: '14px', borderLeft: `4px solid ${(type === 'bank' || type === 'cash') ? (closingBalance >= 0 ? '#16a34a' : '#f97316') : (closingBalance > 0 ? '#f97316' : '#16a34a')}` }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Closing Balance</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: (type === 'bank' || type === 'cash') ? (closingBalance >= 0 ? '#16a34a' : '#f97316') : (closingBalance > 0 ? '#f97316' : '#16a34a') }}>{fmt(Math.abs(closingBalance))} {(type === 'bank' || type === 'cash') ? (closingBalance >= 0 ? 'CR' : 'DR') : (closingBalance > 0 ? 'DR' : 'CR')}</div>
          </div>
        </div>

        {/* Director-specific balance cards */}
        {(type === 'cash' || type === 'bank') && (
          <div className="print-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', margin: '20px 0', padding: '16px', background: type === 'bank' ? '#eff6ff' : '#fffbeb', borderRadius: '10px', border: `1px solid ${type === 'bank' ? '#bfdbfe' : '#fde68a'}` }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>{type === 'bank' ? 'Opening Balance' : 'Opening Cash'}</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#374151', marginTop: '4px' }}>{fmt(data.party?.openingBalance || 0)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>{type === 'bank' ? 'Total Credits (IN)' : 'Total Cash In'}</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>{fmt(totalDebit)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>{type === 'bank' ? 'Total Debits (OUT)' : 'Total Cash Out'}</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>{fmt(totalCredit)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Closing Balance</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: type === 'bank' ? '#0369a1' : '#92400e', marginTop: '4px' }}>{fmt(Math.abs(closingBalance))} <span style={{ fontSize: '12px' }}>{closingBalance >= 0 ? 'CR' : 'DR'}</span></div>
            </div>
          </div>
        )}
        {type === 'director_loan' && (
          <div className="print-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', margin: '20px 0', padding: '16px', background: '#fff1f2', borderRadius: '10px', border: '1px solid #fecdd3' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Total Loan Given</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>{fmt(data.rows.reduce((s, r) => s + r.credit, 0))}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Total Repaid</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>{fmt(data.rows.reduce((s, r) => s + r.debit, 0))}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Outstanding Balance</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: data.party.loanOutstanding > 0 ? '#dc2626' : '#16a34a', marginTop: '4px' }}>{fmt(data.party.loanOutstanding)}</div>
            </div>
          </div>
        )}
        {type === 'director' && (
          <div className="print-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px', marginBottom: '20px', background: '#f9fafb', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Capital Invested</div><div style={{ fontSize: '16px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>{fmt(data.party.capitalContributed)}</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Loan Outstanding</div><div style={{ fontSize: '16px', fontWeight: 800, color: data.party.loanOutstanding > 0 ? '#ef4444' : '#6b7280', marginTop: '4px' }}>{fmt(data.party.loanOutstanding)}</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Total Drawings</div><div style={{ fontSize: '16px', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>{fmt(data.party.drawingsAccount)}</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Shareholding</div><div style={{ fontSize: '16px', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>{data.party.shareholding || 0}%</div></div>
          </div>
        )}

        {/* Employee-specific balance */}
        {type === 'employee' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '20px', background: '#f9fafb', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Monthly CTC</div><div style={{ fontSize: '16px', fontWeight: 800, color: '#0ea5e9', marginTop: '4px' }}>{fmt(data.party.grossSalary)}/mo</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Advance Outstanding</div><div style={{ fontSize: '16px', fontWeight: 800, color: data.party.advanceBalance > 0 ? '#f97316' : '#16a34a', marginTop: '4px' }}>{fmt(data.party.advanceBalance)}</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Department</div><div style={{ fontSize: '16px', fontWeight: 800, color: '#374151', marginTop: '4px' }}>{data.party.department || '—'}</div></div>
          </div>
        )}

        {/* Ledger table */}
        {rows.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '14px' }}>No transactions found in this period.</div>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0' }}>Date</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0' }}>Reference</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0' }}>Description</th>
                  {rows.some(r => r.partyName) && <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0' }}>Party</th>}
                  {rows.some(r => r.mode) && <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0' }}>Mode</th>}
                  {rows.some(r => r.bankAccount) && <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0' }}>Bank Account</th>}
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#374151', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0' }}>Debit (DR)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#374151', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0' }}>Credit (CR)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#374151', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e2e8f0' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '9px 12px', color: '#374151', whiteSpace: 'nowrap' }}>{new Date(r.date).toLocaleDateString('en-IN')}</td>
                    <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: '11.5px', color: '#6b7280', fontWeight: 600 }}>{r.ref || '—'}</td>
                    <td style={{ padding: '9px 12px', color: '#111827', fontWeight: 500 }}>{r.description}</td>
                    {rows.some(rx => rx.partyName) && <td style={{ padding: '9px 12px', color: '#374151', fontSize: '12px', fontWeight: 600 }}>{r.partyName || '—'}</td>}
                    {rows.some(rx => rx.mode) && <td style={{ padding: '9px 12px', color: '#6b7280', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600 }}>{r.mode || '—'}</td>}
                    {rows.some(rx => rx.bankAccount) && <td style={{ padding: '9px 12px', color: '#6b7280', fontSize: '12px' }}>{r.bankAccount || '—'}</td>}
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', color: r.debit > 0 ? '#111827' : '#d1d5db', fontWeight: r.debit > 0 ? 700 : 400 }}>{r.debit > 0 ? fmt(r.debit) : '—'}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', color: r.credit > 0 ? '#16a34a' : '#d1d5db', fontWeight: r.credit > 0 ? 700 : 400 }}>{r.credit > 0 ? fmt(r.credit) : '—'}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: r.balance > 0 ? '#f97316' : r.balance < 0 ? '#16a34a' : '#374151' }}>
                      {fmt(Math.abs(r.balance))} {(type === 'bank' || type === 'cash') ? (r.balance >= 0 ? 'CR' : 'DR') : (r.balance > 0 ? 'DR' : r.balance < 0 ? 'CR' : '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#1e293b', color: 'white' }}>
                  <td colSpan={rows.some(r => r.mode) ? 3 : 2} style={{ padding: '12px', fontWeight: 800, fontSize: '13px' }}>CLOSING BALANCE</td>
                  <td style={{ padding: '12px' }}></td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: '13px' }}>{fmt(totalDebit)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: '13px', color: '#86efac' }}>{fmt(totalCredit)}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, fontSize: '14px', color: (type === 'bank' || type === 'cash') ? '#0369a1' : closingBalance > 0 ? '#fbbf24' : '#86efac' }}>
                    {fmt(Math.abs(closingBalance))} {(type === 'bank' || type === 'cash') ? (closingBalance >= 0 ? 'CR' : 'DR') : (closingBalance > 0 ? 'DR' : 'CR')}
                  </td>
                </tr>
              </tfoot>
            </table>
          )
        }

        {/* Footer */}
        <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
          <div>Generated by GreenLedger · Tesseract Flex Fuel</div>
          <div>This is a computer-generated statement and does not require a signature.</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL REPORT COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function PrintBar({ title, color, onPrint }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--gray-800)' }}>{title}</div>
      <button onClick={onPrint} style={{ padding: '9px 18px', background: color, color: 'white', border: 'none', borderRadius: '8px', fontFamily: 'inherit', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Printer size={13} /> Print
      </button>
    </div>
  );
}

function PLReport({ data, onPrint }) {
  const margin = data.revenue > 0 ? ((data.netProfit / data.revenue) * 100).toFixed(1) : 0;
  return (
    <div id="printable" className="card">
      <PrintBar title="Profit & Loss Statement" color="#16a34a" onPrint={onPrint} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }}>
        <KPIBox label="Revenue" value={data.revenue} color="#16a34a" />
        <KPIBox label="Cost of Goods" value={data.cogs} color="#ef4444" />
        <KPIBox label="Net Profit" value={data.netProfit} color="#3b82f6" suffix={` (${margin}%)`} />
      </div>
      <table className="data-table"><tbody>
        <PLRow label="Gross Revenue" value={data.revenue} />
        <PLRow label="Cost of Goods Sold" value={data.cogs} neg />
        <PLRow label="Gross Profit" value={data.grossProfit} bold />
        <PLRow label="Operating Expenses" value={data.expenses} neg />
        <PLRow label="Net Profit" value={data.netProfit} bold />
      </tbody></table>
    </div>
  );
}
function PLRow({ label, value, neg, bold }) {
  return (
    <tr>
      <td style={{ fontWeight: bold ? 700 : 500, fontSize: bold ? '14px' : '13.5px' }}>{label}</td>
      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: bold ? 700 : 500, color: neg ? 'var(--red)' : bold ? 'var(--gray-900)' : 'var(--gray-700)', fontSize: bold ? '14px' : '13.5px' }}>
        {neg && value > 0 ? '(' : ''}₹{Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}{neg && value > 0 ? ')' : ''}
      </td>
    </tr>
  );
}
function KPIBox({ label, value, color, suffix = '' }) {
  return (
    <div style={{ background: 'var(--gray-50)', borderRadius: '10px', padding: '16px', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 800, color }}>₹{value?.toLocaleString('en-IN')}{suffix}</div>
    </div>
  );
}

function CustomerOutstanding({ data, onPrint }) {
  const total = data.reduce((s, r) => s + r.balance, 0);
  return (
    <div id="printable" className="card">
      <PrintBar title="Customer Outstanding" color="#f97316" onPrint={onPrint} />
      <div style={{ fontWeight: 800, color: 'var(--red)', fontSize: '16px', marginBottom: '14px' }}>Total Outstanding: ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
      <table className="data-table">
        <thead><tr><th>Customer</th><th style={{ textAlign: 'right' }}>Invoiced</th><th style={{ textAlign: 'right' }}>Paid</th><th style={{ textAlign: 'right' }}>Balance</th><th>Invoices</th></tr></thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 600 }}>{r.customerName}</td>
              <td className="td-amount">₹{r.totalAmount?.toLocaleString('en-IN')}</td>
              <td style={{ textAlign: 'right', color: 'var(--primary)', fontWeight: 600 }}>₹{r.paidAmount?.toLocaleString('en-IN')}</td>
              <td style={{ textAlign: 'right', color: 'var(--red)', fontWeight: 700 }}>₹{r.balance?.toLocaleString('en-IN')}</td>
              <td><span className="badge badge-gray">{r.invoiceCount}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GSTReport({ data, onPrint }) {
  return (
    <div id="printable" className="card">
      <PrintBar title="GST Summary" color="#8b5cf6" onPrint={onPrint} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--primary-pale)', borderRadius: '10px', padding: '16px', border: '1px solid var(--primary-light)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '8px' }}>OUTPUT TAX (Sales)</div>
          <div>CGST: <b>₹{(data.outputTax.cgstCollected || 0).toLocaleString('en-IN')}</b></div>
          <div>SGST: <b>₹{(data.outputTax.sgstCollected || 0).toLocaleString('en-IN')}</b></div>
          <div>IGST: <b>₹{(data.outputTax.igstCollected || 0).toLocaleString('en-IN')}</b></div>
          <div style={{ marginTop: '8px', fontWeight: 800, color: 'var(--primary)' }}>Total: ₹{(data.outputTax.totalTax || 0).toLocaleString('en-IN')}</div>
        </div>
        <div style={{ background: '#fff7ed', borderRadius: '10px', padding: '16px', border: '1px solid #fed7aa' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#9a3412', marginBottom: '8px' }}>INPUT CREDIT (Purchases)</div>
          <div>CGST: <b>₹{(data.inputCredit.cgstPaid || 0).toLocaleString('en-IN')}</b></div>
          <div>SGST: <b>₹{(data.inputCredit.sgstPaid || 0).toLocaleString('en-IN')}</b></div>
          <div>IGST: <b>₹{(data.inputCredit.igstPaid || 0).toLocaleString('en-IN')}</b></div>
          <div style={{ marginTop: '8px', fontWeight: 800, color: '#9a3412' }}>Total: ₹{(data.inputCredit.totalPaid || 0).toLocaleString('en-IN')}</div>
        </div>
        <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '16px', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', marginBottom: '8px' }}>NET LIABILITY</div>
          <div>CGST: <b>₹{(data.netLiability.cgst || 0).toLocaleString('en-IN')}</b></div>
          <div>SGST: <b>₹{(data.netLiability.sgst || 0).toLocaleString('en-IN')}</b></div>
          <div>IGST: <b>₹{(data.netLiability.igst || 0).toLocaleString('en-IN')}</b></div>
          <div style={{ marginTop: '8px', fontWeight: 800, color: '#1d4ed8' }}>Total: ₹{(data.netLiability.total || 0).toLocaleString('en-IN')}</div>
        </div>
      </div>
    </div>
  );
}

function StockReport({ data, onPrint }) {
  const totalValue = data.reduce((s, i) => s + i.stockValue, 0);
  return (
    <div id="printable" className="card">
      <PrintBar title="Stock Summary" color="#3b82f6" onPrint={onPrint} />
      <div style={{ fontWeight: 700, color: 'var(--gray-700)', marginBottom: '14px' }}>Total Value: ₹{totalValue.toLocaleString('en-IN')}</div>
      <table className="data-table">
        <thead><tr><th>SKU</th><th>Item</th><th>Unit</th><th style={{ textAlign: 'right' }}>Stock</th><th style={{ textAlign: 'right' }}>Reorder</th><th style={{ textAlign: 'right' }}>Value</th><th>Status</th></tr></thead>
        <tbody>
          {data.map(item => (
            <tr key={item._id}>
              <td className="td-mono">{item.sku}</td>
              <td style={{ fontWeight: 600 }}>{item.name}</td>
              <td>{item.unit}</td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{item.currentStock?.toLocaleString()}</td>
              <td style={{ textAlign: 'right', color: 'var(--gray-500)' }}>{item.reorderLevel?.toLocaleString()}</td>
              <td className="td-amount">₹{item.stockValue?.toLocaleString('en-IN')}</td>
              <td>{item.isLowStock ? <span className="badge badge-danger">⚠ Low</span> : <span className="badge badge-success">OK</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrialBalance({ data, onPrint }) {
  return (
    <div id="printable" className="card">
      <PrintBar title="Trial Balance" color="#ef4444" onPrint={onPrint} />
      <span className={`badge ${data.isBalanced ? 'badge-success' : 'badge-danger'}`} style={{ marginBottom: '14px', display: 'inline-block' }}>{data.isBalanced ? '✓ Balanced' : '⚠ Not Balanced'}</span>
      <table className="data-table">
        <thead><tr><th>Code</th><th>Account</th><th>Type</th><th style={{ textAlign: 'right' }}>Debit</th><th style={{ textAlign: 'right' }}>Credit</th></tr></thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i}>
              <td className="td-mono">{r.code}</td>
              <td style={{ fontWeight: 500 }}>{r.name}</td>
              <td><span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{r.type}</span></td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{r.debit > 0 ? `₹${r.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{r.credit > 0 ? `₹${r.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
            </tr>
          ))}
          <tr style={{ background: 'var(--gray-50)' }}>
            <td colSpan={3} style={{ fontWeight: 700 }}>TOTAL</td>
            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>₹{data.totalDebit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>₹{data.totalCredit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}