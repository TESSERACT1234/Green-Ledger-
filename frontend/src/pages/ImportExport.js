import React, { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Download, Upload, FileText } from 'lucide-react';

const EXPORTS = [
  { key:'customers',  label:'Customers',      icon:'👥', desc:'All customer records with GSTIN and address' },
  { key:'vendors',    label:'Vendors',        icon:'🚚', desc:'All vendor/supplier records' },
  { key:'items',      label:'Products',       icon:'📦', desc:'Product catalog with HSN codes and GST rates' },
  { key:'invoices',   label:'Sales Invoices', icon:'🧾', desc:'All invoices with GST breakdown' },
  { key:'purchases',  label:'Purchase Bills', icon:'🛒', desc:'All purchase bills with vendor details' },
  { key:'payments',   label:'Payments',       icon:'💳', desc:'All receipts and payments' },
];

export default function ImportExport() {
  const [exporting, setExporting] = useState('');
  const [dateFrom, setDateFrom]   = useState(new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10));
  const [dateTo, setDateTo]       = useState(new Date().toISOString().slice(0,10));

  const handleExport = async (key) => {
    setExporting(key);
    try {
      const r = await api.get('/reports/export/' + key, {
        params: { from: dateFrom, to: dateTo },
        responseType: 'blob'
      });
      const url  = window.URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `${key}-export-${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${key} exported!`);
    } catch {
      // Fallback: export from local state as CSV placeholder
      toast.error('Export endpoint not available. Contact developer.');
    }
    finally { setExporting(''); }
  };

  return (
    <AppLayout title="Import / Export">
      <div className="page-header">
        <div className="page-header-left"><h1>Import / Export</h1><p>Download your data as CSV for Excel or backup</p></div>
      </div>

      <div style={{background:'white',border:'1px solid var(--gray-200)',borderRadius:'12px',padding:'20px',marginBottom:'20px'}}>
        <div style={{fontWeight:700,fontSize:'14px',marginBottom:'12px',color:'var(--gray-700)'}}>Date Range for Export</div>
        <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
          <div><label style={{fontSize:'12px',fontWeight:600,color:'var(--gray-500)',display:'block',marginBottom:'4px'}}>From</label><input type="date" className="form-input" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{width:'160px'}}/></div>
          <div><label style={{fontSize:'12px',fontWeight:600,color:'var(--gray-500)',display:'block',marginBottom:'4px'}}>To</label><input type="date" className="form-input" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{width:'160px'}}/></div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'14px'}}>
        {EXPORTS.map(ex => (
          <div key={ex.key} style={{background:'white',border:'1px solid var(--gray-200)',borderRadius:'12px',padding:'18px',display:'flex',flexDirection:'column',gap:'10px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <span style={{fontSize:'24px'}}>{ex.icon}</span>
              <div>
                <div style={{fontWeight:700,fontSize:'14px',color:'var(--gray-900)'}}>{ex.label}</div>
                <div style={{fontSize:'12px',color:'var(--gray-400)'}}>{ex.desc}</div>
              </div>
            </div>
            <button
              className="btn btn-secondary"
              style={{display:'flex',alignItems:'center',gap:'6px',justifyContent:'center'}}
              onClick={()=>handleExport(ex.key)}
              disabled={exporting===ex.key}
            >
              {exporting===ex.key ? <span className="spinner"/> : <><Download size={14}/>Export CSV</>}
            </button>
          </div>
        ))}
      </div>

      <div style={{background:'var(--gray-50)',border:'1px solid var(--gray-200)',borderRadius:'12px',padding:'20px',marginTop:'20px'}}>
        <div style={{fontWeight:700,fontSize:'14px',marginBottom:'8px',color:'var(--gray-700)',display:'flex',alignItems:'center',gap:'8px'}}><Upload size={16}/>Import Data</div>
        <div style={{fontSize:'13.5px',color:'var(--gray-500)',lineHeight:'1.6'}}>
          Bulk import from CSV is available via the backend API. To import customers, vendors, or items in bulk, use the API endpoint <code style={{background:'var(--gray-200)',padding:'2px 6px',borderRadius:'4px',fontSize:'12px'}}>/api/v1/[resource]/import</code> with a CSV file. Contact your developer for the template format.
        </div>
      </div>
    </AppLayout>
  );
}