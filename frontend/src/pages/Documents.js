import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Upload, X, FileText, Download, Trash2 } from 'lucide-react';

const CATEGORIES = ['Invoice','Purchase Bill','Contract','License','Certificate','Bank Statement','Tax Filing','Other'];

export default function Documents() {
  const [docs, setDocs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm]     = useState({ title:'', category:'Invoice', notes:'' });
  const [filterCat, setFilterCat] = useState('');

  const fetch = async () => {
    try { const r = await api.get('/documents'); setDocs(r.data.data); }
    catch { toast.error('Failed to load documents'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/documents', form);
      toast.success('Document record saved!');
      setModal(false); setForm({ title:'', category:'Invoice', notes:'' }); fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document record?')) return;
    try { await api.delete('/documents/' + id); toast.success('Deleted'); fetch(); }
    catch { toast.error('Failed to delete'); }
  };

  const sf = (k,v) => setForm(f => ({ ...f, [k]: v }));
  const filtered = filterCat ? docs.filter(d => d.category === filterCat) : docs;

  const ICONS = { Invoice:'🧾', 'Purchase Bill':'🛒', Contract:'📄', License:'🏅', Certificate:'📜', 'Bank Statement':'🏦', 'Tax Filing':'📊', Other:'📁' };

  return (
    <AppLayout title="Documents">
      <div className="page-header">
        <div className="page-header-left"><h1>Documents</h1><p>{docs.length} documents stored</p></div>
        <button className="btn btn-primary" onClick={()=>setModal(true)}><Upload size={15}/>Add Document</button>
      </div>

      <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
        <button onClick={()=>setFilterCat('')} className="btn btn-sm" style={{background:!filterCat?'var(--primary)':'var(--gray-100)',color:!filterCat?'white':'var(--gray-700)',border:'none'}}>All</button>
        {CATEGORIES.map(c=>(
          <button key={c} onClick={()=>setFilterCat(c)} className="btn btn-sm" style={{background:filterCat===c?'var(--primary)':'var(--gray-100)',color:filterCat===c?'white':'var(--gray-700)',border:'none'}}>{c}</button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Title</th><th>Category</th><th>Notes</th><th>Added</th><th>Actions</th></tr></thead>
            <tbody>
              {loading
                ? <tr><td colSpan={5} style={{textAlign:'center',padding:'32px'}}><div className="spinner" style={{margin:'0 auto'}}/></td></tr>
                : filtered.length === 0
                ? <tr><td colSpan={5}><div className="empty-state"><div className="empty-icon">📁</div><div className="empty-title">No documents yet</div><div className="empty-desc">Store references to important business documents, licenses, and tax filings.</div></div></td></tr>
                : filtered.map(d => (
                <tr key={d._id}>
                  <td style={{fontWeight:600,display:'flex',alignItems:'center',gap:'8px'}}><span style={{fontSize:'18px'}}>{ICONS[d.category]||'📄'}</span>{d.title}</td>
                  <td><span className="badge badge-gray">{d.category}</span></td>
                  <td style={{color:'var(--gray-500)',fontSize:'12.5px',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.notes||'—'}</td>
                  <td style={{color:'var(--gray-400)',fontSize:'12.5px'}}>{new Date(d.createdAt).toLocaleDateString('en-IN')}</td>
                  <td><button className="btn btn-sm btn-secondary" onClick={()=>handleDelete(d._id)} style={{color:'var(--red)'}}><Trash2 size={12}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal modal-md">
            <div className="modal-header">
              <h3 className="modal-title">Add Document Record</h3>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)'}}><X size={18}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Document Title <span className="req">*</span></label><input required className="form-input" value={form.title} onChange={e=>sf('title',e.target.value)} placeholder="e.g. GST Registration Certificate"/></div>
                <div className="form-group"><label className="form-label">Category</label>
                  <select className="form-select" value={form.category} onChange={e=>sf('category',e.target.value)}>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Notes / Reference</label><textarea className="form-textarea" rows={3} value={form.notes} onChange={e=>sf('notes',e.target.value)} placeholder="File location, expiry date, or other notes…"/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?<span className="spinner"/>:'Save Document'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}