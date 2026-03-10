import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import api from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, IndianRupee, AlertTriangle, Clock, Users } from 'lucide-react';

function KpiCard({ label, value, change, icon: Icon, color, prefix = '₹' }) {
  const isPositive = change >= 0;
  return (
    <div className="kpi-card" style={{ '--kpi-color': color }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</div>
      {change !== undefined && (
        <div className={`kpi-change ${isPositive ? 'up' : 'down'}`}>
          {isPositive ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
          {Math.abs(change)}% vs last month
        </div>
      )}
      <div className="kpi-icon" style={{ background: color + '18' }}>
        <Icon size={20} color={color} />
      </div>
    </div>
  );
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Dashboard() {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => { setData(r.data.data); setLoading(false); })
       .catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="Dashboard"><div className="loading-page"><div className="spinner" style={{width:32,height:32,borderWidth:3}} /></div></AppLayout>;
  if (!data) return <AppLayout title="Dashboard"><div className="empty-state"><div className="empty-icon">⚠️</div><div className="empty-title">Could not load dashboard</div><div className="empty-desc">Make sure the backend is running.</div></div></AppLayout>;

  const chartData = data.salesByMonth.map(m => ({
    name: MONTHS[parseInt(m.month.split('-')[1]) - 1],
    Revenue: m.revenue
  }));

  return (
    <AppLayout title="Dashboard">
      {/* KPI Grid */}
      <div className="kpi-grid">
        <KpiCard label="Revenue (This Month)"  value={data.kpis.revenue}      change={data.kpis.revenueGrowth}  icon={IndianRupee}  color="#16a34a" />
        <KpiCard label="Expenses (This Month)" value={data.kpis.expenses}     change={data.kpis.expenseGrowth}  icon={TrendingDown} color="#ef4444" />
        <KpiCard label="Net Profit"            value={data.kpis.profit}       icon={TrendingUp}  color="#3b82f6" />
        <KpiCard label="Outstanding Invoices"  value={data.kpis.outstanding}  icon={Clock}        color="#f97316" change={undefined} />
      </div>

      <div className="grid-2 mb-6">
        {/* Sales Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Revenue Trend</div>
              <div className="card-subtitle">Last 6 months</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} contentStyle={{ borderRadius:'8px', fontSize:'13px', border:'1px solid #e5e7eb' }} />
              <Bar dataKey="Revenue" fill="#16a34a" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Business Overview</div>
              <div className="card-subtitle">Current status</div>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <StatRow icon="🧾" label="Outstanding Invoices" value={data.kpis.outstandingCount + ' invoices'} color="#f97316" />
            <StatRow icon="👥" label="Total Customers"     value={data.kpis.customerCount} color="#3b82f6" />
            <StatRow icon="⚠️" label="Low Stock Items"     value={data.lowStockItems.length + ' products'} color="#ef4444" />
          </div>

          {data.lowStockItems.length > 0 && (
            <div style={{ marginTop:'16px', padding:'12px', background:'#fff7ed', borderRadius:'8px', border:'1px solid #fed7aa' }}>
              <div style={{ fontSize:'12px', fontWeight:'700', color:'#9a3412', marginBottom:'8px', display:'flex', alignItems:'center', gap:'6px' }}>
                <AlertTriangle size={13}/> Low Stock Alert
              </div>
              {data.lowStockItems.map(item => (
                <div key={item._id} style={{ display:'flex', justifyContent:'space-between', fontSize:'12.5px', color:'#92400e', padding:'4px 0', borderBottom:'1px solid #fde68a' }}>
                  <span>{item.name}</span>
                  <span style={{ fontWeight:'700' }}>{item.currentStock} {item.unit} left</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Tables */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Invoices</div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr>
                <th>Invoice</th><th>Customer</th><th>Amount</th><th>Status</th>
              </tr></thead>
              <tbody>
                {data.recentInvoices.length === 0
                  ? <tr><td colSpan={4} style={{ textAlign:'center', color:'var(--gray-400)', padding:'24px' }}>No invoices yet</td></tr>
                  : data.recentInvoices.map(inv => (
                  <tr key={inv._id}>
                    <td className="td-mono">{inv.invoiceNumber}</td>
                    <td>{inv.customerName}</td>
                    <td className="td-amount">₹{inv.totalAmount?.toLocaleString('en-IN')}</td>
                    <td><StatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Payments</div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr>
                <th>Payment</th><th>Party</th><th>Amount</th><th>Mode</th>
              </tr></thead>
              <tbody>
                {data.recentPayments.length === 0
                  ? <tr><td colSpan={4} style={{ textAlign:'center', color:'var(--gray-400)', padding:'24px' }}>No payments yet</td></tr>
                  : data.recentPayments.map(pay => (
                  <tr key={pay._id}>
                    <td className="td-mono">{pay.paymentNumber}</td>
                    <td>{pay.partyName}</td>
                    <td className="td-amount" style={{ color: pay.type==='receipt' ? 'var(--primary)' : 'var(--red)' }}>
                      {pay.type==='receipt' ? '+' : '-'}₹{pay.amount?.toLocaleString('en-IN')}
                    </td>
                    <td><span className="badge badge-gray" style={{ textTransform:'uppercase', fontSize:'11px' }}>{pay.mode}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatRow({ icon, label, value, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', background:'var(--gray-50)', borderRadius:'8px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <span style={{ fontSize:'18px' }}>{icon}</span>
        <span style={{ fontSize:'13.5px', color:'var(--gray-600)', fontWeight:'500' }}>{label}</span>
      </div>
      <span style={{ fontWeight:'700', color, fontSize:'14px' }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    draft: 'badge-gray', sent: 'badge-info', partial: 'badge-warning',
    paid: 'badge-success', overdue: 'badge-danger', cancelled: 'badge-gray'
  };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}
