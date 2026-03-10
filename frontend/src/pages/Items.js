import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, X, AlertTriangle } from 'lucide-react';

const empty = { sku:'', name:'', description:'', hsnCode:'', unit:'ltr', salePrice:0, purchasePrice:0, gstRate:5, reorderLevel:100, openingStock:0, type:'product', category:'Biodiesel' };

export default function Items() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    try { const r = await api.get('/items',{params:{search,limit:200}}); setItems(r.data.data); }
    catch(e){toast.error('Failed to load items');}
    finally{setLoading(false);}
  };
  useEffect(()=>{fetch();},[search]);

  const openAdd  = () => { setForm(empty); setEditing(null); setModal(true); };
  const openEdit = (i) => { setForm(i); setEditing(i._id); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if(editing) await api.put(`/items/${editing}`, form);
      else { await api.post('/items', form); }
      toast.success(editing?'Updated!':'Item added!');
      setModal(false); fetch();
    } catch(e){toast.error(e.response?.data?.message||'Error');}
    finally{setSaving(false);}
  };

  const sf = (k,v) => setForm(f=>({...f,[k]:v}));

  return (
    <AppLayout title="Products & Inventory">
      <div className="page-header">
        <div className="page-header-left"><h1>Products</h1><p>{items.length} products</p></div>
        <div className="page-header-right">
          <div className="search-bar"><Search size={14} color="var(--gray-400)"/><input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15}/>Add Product</button>
        </div>
      </div>
      <div className="card">
        <table className="data-table">
          <thead><tr><th>SKU</th><th>Name</th><th>HSN</th><th>Unit</th><th>Sale Price</th><th>Purchase Price</th><th>GST%</th><th>Stock</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={10} style={{textAlign:'center',padding:'32px'}}><div className="spinner" style={{margin:'0 auto'}}/></td></tr>
            : items.map(item=>(
              <tr key={item._id}>
                <td className="td-mono">{item.sku}</td>
                <td style={{fontWeight:600}}>{item.name}</td>
                <td className="td-mono">{item.hsnCode||'—'}</td>
                <td>{item.unit}</td>
                <td className="td-amount">₹{item.salePrice?.toLocaleString('en-IN')}</td>
                <td className="td-amount">₹{item.purchasePrice?.toLocaleString('en-IN')}</td>
                <td><span className="badge badge-primary">{item.gstRate}%</span></td>
                <td style={{fontWeight:700, color: item.currentStock<=item.reorderLevel?'var(--red)':'var(--primary)'}}>
                  {item.currentStock?.toLocaleString()} {item.unit}
                  {item.currentStock<=item.reorderLevel && <AlertTriangle size={12} style={{marginLeft:4,color:'var(--red)'}}/>}
                </td>
                <td><span className={`badge ${item.isActive?'badge-success':'badge-gray'}`}>{item.isActive?'Active':'Inactive'}</span></td>
                <td><button className="btn btn-sm btn-secondary" onClick={()=>openEdit(item)}><Edit2 size={12}/>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="modal-title">{editing?'Edit Product':'Add Product'}</h3>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)'}}><X size={18}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">SKU <span className="req">*</span></label><input className="form-input" required value={form.sku} onChange={e=>sf('sku',e.target.value.toUpperCase())} placeholder="BIO-001"/></div>
                  <div className="form-group"><label className="form-label">Name <span className="req">*</span></label><input className="form-input" required value={form.name} onChange={e=>sf('name',e.target.value)} placeholder="Biodiesel B100"/></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">HSN Code</label><input className="form-input" value={form.hsnCode} onChange={e=>sf('hsnCode',e.target.value)} placeholder="27102000"/></div>
                  <div className="form-group"><label className="form-label">Unit</label><select className="form-select" value={form.unit} onChange={e=>sf('unit',e.target.value)}><option value="ltr">Litre (ltr)</option><option value="kg">Kilogram (kg)</option><option value="pcs">Pieces (pcs)</option><option value="ton">Tonne (ton)</option><option value="box">Box</option></select></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Sale Price (₹)</label><input className="form-input" type="number" min="0" step="0.01" value={form.salePrice} onChange={e=>sf('salePrice',+e.target.value)}/></div>
                  <div className="form-group"><label className="form-label">Purchase Price (₹)</label><input className="form-input" type="number" min="0" step="0.01" value={form.purchasePrice} onChange={e=>sf('purchasePrice',+e.target.value)}/></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">GST Rate</label><select className="form-select" value={form.gstRate} onChange={e=>sf('gstRate',+e.target.value)}>{[0,5,12,18,28].map(r=><option key={r} value={r}>{r}%</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Reorder Level</label><input className="form-input" type="number" min="0" value={form.reorderLevel} onChange={e=>sf('reorderLevel',+e.target.value)}/></div>
                </div>
                <div className="form-group"><label className="form-label">Category</label><input className="form-input" value={form.category} onChange={e=>sf('category',e.target.value)} placeholder="Biodiesel, Raw Material, Services"/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?<span className="spinner"/>:editing?'Update':'Add Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
