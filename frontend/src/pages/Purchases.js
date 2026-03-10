import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Search, X, Trash2 } from 'lucide-react';

const STATUS_BADGE = { draft:'badge-gray', received:'badge-info', partial:'badge-warning', paid:'badge-success', cancelled:'badge-gray' };

export default function Purchases() {
  const [bills, setBills]     = useState([]);
  const [vendors, setVendors] = useState([]);
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ vendor:null, billDate: new Date().toISOString().slice(0,10), refNumber:'', notes:'', lineItems:[{item:'',itemName:'',qty:1,rate:0,gstRate:5}] });

  useEffect(()=>{
    Promise.all([
      api.get('/purchases',{params:{limit:100}}),
      api.get('/vendors',{params:{limit:200}}),
      api.get('/items',{params:{limit:200}})
    ]).then(([b,v,i])=>{ setBills(b.data.data); setVendors(v.data.data); setItems(i.data.data); setLoading(false); });
  },[]);

  const setLine=(idx,key,val)=>{
    const updated=[...form.lineItems]; updated[idx]={...updated[idx],[key]:isNaN(val)?val:+val};
    if(key==='item'){const it=items.find(i=>i._id===val); if(it) updated[idx]={...updated[idx],itemName:it.name,rate:it.purchasePrice,gstRate:it.gstRate};}
    setForm(f=>({...f,lineItems:updated}));
  };
  const addLine=()=>setForm(f=>({...f,lineItems:[...f.lineItems,{item:'',itemName:'',qty:1,rate:0,gstRate:5}]}));
  const removeLine=(idx)=>setForm(f=>({...f,lineItems:f.lineItems.filter((_,i)=>i!==idx)}));

  const calcLine=(li)=>{ const tax=(li.qty*li.rate*li.gstRate/2)/100; return { taxableAmt:li.qty*li.rate, tax: tax*2, total: li.qty*li.rate + tax*2 }; };
  const totals = form.lineItems.reduce((a,li)=>{ const c=calcLine(li); return {taxable:a.taxable+c.taxableAmt, tax:a.tax+c.tax, total:a.total+c.total}; },{taxable:0,tax:0,total:0});

  const handleSave=async(e)=>{
    e.preventDefault(); setSaving(true);
    try {
      const vendor=vendors.find(v=>v._id===form.vendor);
      const payload={...form, vendorName:vendor?.name||'', vendorGstin:vendor?.gstin||'', subtotal:totals.taxable, taxableAmount:totals.taxable, totalTax:totals.tax, totalAmount:totals.total,
        lineItems:form.lineItems.map(li=>({...li,taxableAmt:li.qty*li.rate,cgstAmt:(li.qty*li.rate*li.gstRate/2)/100,sgstAmt:(li.qty*li.rate*li.gstRate/2)/100,totalAmt:li.qty*li.rate+(li.qty*li.rate*li.gstRate)/100}))};
      await api.post('/purchases', payload);
      toast.success('Purchase bill created!'); setModal(false);
      const r=await api.get('/purchases',{params:{limit:100}}); setBills(r.data.data);
    }catch(e){toast.error(e.response?.data?.message||'Error');}
    finally{setSaving(false);}
  };

  return (
    <AppLayout title="Purchase Bills">
      <div className="page-header">
        <div className="page-header-left"><h1>Purchase Bills</h1><p>{bills.length} bills</p></div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={()=>setModal(true)}><Plus size={15}/>New Bill</button>
        </div>
      </div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>Bill #</th><th>Vendor</th><th>Date</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
          <tbody>
            {loading?<tr><td colSpan={7} style={{textAlign:'center',padding:'32px'}}><div className="spinner" style={{margin:'0 auto'}}/></td></tr>
            :bills.length===0?<tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">🛒</div><div className="empty-title">No purchase bills yet</div></div></td></tr>
            :bills.map(b=>(
              <tr key={b._id}>
                <td className="td-mono" style={{fontWeight:700,color:'var(--primary)'}}>{b.billNumber}</td>
                <td style={{fontWeight:600}}>{b.vendorName}</td>
                <td>{new Date(b.billDate).toLocaleDateString('en-IN')}</td>
                <td className="td-amount">₹{b.totalAmount?.toLocaleString('en-IN')}</td>
                <td style={{textAlign:'right',color:'var(--primary)',fontWeight:600}}>₹{b.paidAmount?.toLocaleString('en-IN')}</td>
                <td style={{textAlign:'right',color:'var(--red)',fontWeight:600}}>₹{b.balanceDue?.toLocaleString('en-IN')}</td>
                <td><span className={`badge ${STATUS_BADGE[b.status]}`}>{b.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal&&(
        <div className="modal-overlay">
          <div className="modal modal-xl">
            <div className="modal-header"><h3 className="modal-title">New Purchase Bill</h3><button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)'}}><X size={18}/></button></div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row-3">
                  <div className="form-group"><label className="form-label">Vendor <span className="req">*</span></label><select required className="form-select" value={form.vendor||''} onChange={e=>setForm(f=>({...f,vendor:e.target.value}))}><option value="">Select vendor…</option>{vendors.map(v=><option key={v._id} value={v._id}>{v.name}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Bill Date</label><input type="date" className="form-input" value={form.billDate} onChange={e=>setForm(f=>({...f,billDate:e.target.value}))}/></div>
                  <div className="form-group"><label className="form-label">Vendor's Invoice Ref.</label><input className="form-input" value={form.refNumber} onChange={e=>setForm(f=>({...f,refNumber:e.target.value}))} placeholder="Vendor invoice number"/></div>
                </div>
                <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'8px'}}>
                  <thead><tr style={{background:'var(--gray-50)'}}>
                    {['Item','Qty','Rate (₹)','GST%','Taxable','Tax','Total',''].map(h=><th key={h} style={{padding:'8px 10px',fontSize:'11px',fontWeight:700,textTransform:'uppercase',color:'var(--gray-500)',textAlign:['Taxable','Tax','Total'].includes(h)?'right':'left',borderBottom:'1px solid var(--gray-200)'}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {form.lineItems.map((li,idx)=>{
                      const c=calcLine(li);
                      return <tr key={idx} style={{borderBottom:'1px solid var(--gray-100)'}}>
                        <td style={{padding:'6px 8px',minWidth:'160px'}}><select style={{border:'1px solid var(--gray-200)',borderRadius:'6px',padding:'6px 8px',fontSize:'13px',width:'100%'}} value={li.item} onChange={e=>setLine(idx,'item',e.target.value)}><option value="">Select…</option>{items.map(i=><option key={i._id} value={i._id}>{i.name}</option>)}</select></td>
                        <td style={{padding:'6px 4px'}}><input type="number" min="0.01" style={{border:'1px solid var(--gray-200)',borderRadius:'6px',padding:'6px',fontSize:'13px',width:'64px'}} value={li.qty} onChange={e=>setLine(idx,'qty',e.target.value)}/></td>
                        <td style={{padding:'6px 4px'}}><input type="number" min="0" style={{border:'1px solid var(--gray-200)',borderRadius:'6px',padding:'6px',fontSize:'13px',width:'80px'}} value={li.rate} onChange={e=>setLine(idx,'rate',e.target.value)}/></td>
                        <td style={{padding:'6px 4px'}}><select style={{border:'1px solid var(--gray-200)',borderRadius:'6px',padding:'6px',fontSize:'13px',width:'60px'}} value={li.gstRate} onChange={e=>setLine(idx,'gstRate',e.target.value)}>{[0,5,12,18,28].map(r=><option key={r} value={r}>{r}%</option>)}</select></td>
                        <td style={{padding:'6px 8px',fontFamily:'monospace',fontSize:'12px',textAlign:'right'}}>₹{c.taxableAmt.toFixed(2)}</td>
                        <td style={{padding:'6px 8px',fontFamily:'monospace',fontSize:'12px',textAlign:'right',color:'var(--gray-500)'}}>₹{c.tax.toFixed(2)}</td>
                        <td style={{padding:'6px 8px',fontFamily:'monospace',fontSize:'12.5px',textAlign:'right',fontWeight:700}}>₹{c.total.toFixed(2)}</td>
                        <td style={{padding:'6px 4px'}}>{form.lineItems.length>1&&<button type="button" onClick={()=>removeLine(idx)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--red)',padding:'2px'}}><Trash2 size={13}/></button>}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}><Plus size={13}/>Add Line</button>
                <div style={{display:'flex',justifyContent:'flex-end',marginTop:'16px'}}>
                  <div style={{width:'280px',background:'var(--gray-50)',borderRadius:'10px',padding:'16px',border:'1px solid var(--gray-200)'}}>
                    {[['Taxable Amount',totals.taxable],['Total Tax',totals.tax],['Total Amount',totals.total,true]].map(([l,v,b])=>(
                      <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:b?'14px':'13px',fontWeight:b?700:500,color:b?'var(--gray-900)':'var(--gray-600)'}}>
                        <span>{l}</span><span style={{fontFamily:'monospace'}}>₹{v.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?<span className="spinner"/>:'Create Bill'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
