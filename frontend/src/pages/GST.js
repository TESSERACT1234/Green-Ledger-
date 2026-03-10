import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function GST() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom]     = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10));
  const [to, setTo]         = useState(new Date().toISOString().slice(0,10));

  const run = async () => {
    setLoading(true);
    try {
      const r = await api.get('/reports/gst-summary', { params: { from, to } });
      setData(r.data.data);
    } catch { toast.error('Failed to fetch GST data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { run(); }, []);

  const Card = ({ label, value, color, sub }) => (
    <div style={{background:'white',border:'1px solid var(--gray-200)',borderRadius:'12px',padding:'20px',flex:1}}>
      <div style={{fontSize:'11.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--gray-400)',marginBottom:'8px'}}>{label}</div>
      <div style={{fontSize:'24px',fontWeight:800,color: color || 'var(--gray-900)'}}>{value}</div>
      {sub && <div style={{fontSize:'12px',color:'var(--gray-400)',marginTop:'4px'}}>{sub}</div>}
    </div>
  );

  return (
    <AppLayout title="GST">
      <div className="page-header">
        <div className="page-header-left"><h1>GST Summary</h1><p>Output tax, input credit, and net liability</p></div>
        <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
          <input type="date" className="form-input" value={from} onChange={e=>setFrom(e.target.value)} style={{width:'150px'}}/>
          <span style={{color:'var(--gray-400)',fontSize:'13px'}}>to</span>
          <input type="date" className="form-input" value={to}   onChange={e=>setTo(e.target.value)}   style={{width:'150px'}}/>
          <button className="btn btn-primary" onClick={run} disabled={loading}>{loading?<span className="spinner"/>:'Generate'}</button>
        </div>
      </div>

      {data ? (<>
        <div style={{display:'flex',gap:'14px',marginBottom:'24px',flexWrap:'wrap'}}>
          <Card label="Output Tax (Sales)" value={`Rs.${(data.outputTax||0).toLocaleString('en-IN')}`} color="var(--primary)" sub="GST collected from customers"/>
          <Card label="Input Tax Credit (Purchases)" value={`Rs.${(data.inputTax||0).toLocaleString('en-IN')}`} color="var(--blue)" sub="GST paid to vendors"/>
          <Card label="Net GST Liability" value={`Rs.${((data.outputTax||0)-(data.inputTax||0)).toLocaleString('en-IN')}`} color={(data.outputTax||0)-(data.inputTax||0) > 0 ? 'var(--red)':'var(--primary)'} sub="Pay this to the government"/>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
          <div className="card">
            <div className="card-header"><div className="card-title">Sales (Output Tax)</div></div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>Tax Type</th><th style={{textAlign:'right'}}>Taxable Amount</th><th style={{textAlign:'right'}}>Tax Amount</th></tr></thead>
                <tbody>
                  {(data.outputBreakdown||[]).map((row,i) => (
                    <tr key={i}>
                      <td><span className="badge badge-success">{row._id||'N/A'}</span></td>
                      <td className="td-amount">Rs.{(row.taxableAmount||0).toLocaleString('en-IN')}</td>
                      <td className="td-amount" style={{fontWeight:700}}>Rs.{(row.taxAmount||0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  {(!data.outputBreakdown||data.outputBreakdown.length===0) && (
                    <tr><td colSpan={3} style={{textAlign:'center',color:'var(--gray-400)',padding:'20px'}}>No sales tax in this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Purchases (Input Credit)</div></div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>Tax Type</th><th style={{textAlign:'right'}}>Taxable Amount</th><th style={{textAlign:'right'}}>Tax Amount</th></tr></thead>
                <tbody>
                  {(data.inputBreakdown||[]).map((row,i) => (
                    <tr key={i}>
                      <td><span className="badge badge-info">{row._id||'N/A'}</span></td>
                      <td className="td-amount">Rs.{(row.taxableAmount||0).toLocaleString('en-IN')}</td>
                      <td className="td-amount" style={{fontWeight:700}}>Rs.{(row.taxAmount||0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  {(!data.inputBreakdown||data.inputBreakdown.length===0) && (
                    <tr><td colSpan={3} style={{textAlign:'center',color:'var(--gray-400)',padding:'20px'}}>No purchase tax in this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card" style={{marginTop:'16px'}}>
          <div className="card-header"><div className="card-title">Filing Summary</div></div>
          <div style={{padding:'20px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
            {[
              { label:'CGST Output',  value: data.cgstOutput  || 0 },
              { label:'SGST Output',  value: data.sgstOutput  || 0 },
              { label:'IGST Output',  value: data.igstOutput  || 0 },
              { label:'CGST Input',   value: data.cgstInput   || 0 },
              { label:'SGST Input',   value: data.sgstInput   || 0 },
              { label:'IGST Input',   value: data.igstInput   || 0 },
            ].map(item => (
              <div key={item.label} style={{background:'var(--gray-50)',borderRadius:'8px',padding:'12px 14px'}}>
                <div style={{fontSize:'11px',fontWeight:700,textTransform:'uppercase',color:'var(--gray-400)',marginBottom:'6px'}}>{item.label}</div>
                <div style={{fontWeight:800,fontSize:'15px',color:'var(--gray-900)'}}>Rs.{item.value.toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>
        </div>
      </>) : (
        <div className="empty-state" style={{background:'white',borderRadius:'12px',border:'1px solid var(--gray-200)',padding:'48px'}}>
          <div className="empty-icon">🧾</div>
          <div className="empty-title">Click Generate to load GST summary</div>
          <div className="empty-desc">Select a date range above and click Generate to view output tax, input credit, and net liability.</div>
        </div>
      )}
    </AppLayout>
  );
}