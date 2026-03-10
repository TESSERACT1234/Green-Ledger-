import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, X, Edit2, Shield, User } from 'lucide-react';

const emptyForm = { name:'', email:'', password:'', role:'accountant' };

export default function Users() {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    try { const r = await api.get('/users'); setUsers(r.data.data); }
    catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const openAdd  = () => { setForm(emptyForm); setEditing(null); setModal(true); };
  const openEdit = (u) => { setForm({ ...u, password:'' }); setEditing(u._id); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password;
      if (editing) await api.put('/users/' + editing, payload);
      else         await api.post('/users', payload);
      toast.success(editing ? 'User updated!' : 'User created!');
      setModal(false); fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    try {
      await api.put('/users/' + u._id, { isActive: !u.isActive });
      toast.success(u.isActive ? 'User deactivated' : 'User activated');
      fetch();
    } catch { toast.error('Failed to update'); }
  };

  const sf = (k,v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <AppLayout title="User Management">
      <div className="page-header">
        <div className="page-header-left"><h1>Users</h1><p>{users.length} users in the system</p></div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15}/>Add User</button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
            <tbody>
              {loading
                ? <tr><td colSpan={6} style={{textAlign:'center',padding:'32px'}}><div className="spinner" style={{margin:'0 auto'}}/></td></tr>
                : users.map(u => (
                <tr key={u._id}>
                  <td style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <div style={{width:32,height:32,borderRadius:'50%',background:'var(--primary-pale)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'13px',color:'var(--primary)',flexShrink:0}}>
                      {u.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span style={{fontWeight:600,color:'var(--gray-900)'}}>{u.name}</span>
                  </td>
                  <td style={{fontFamily:'monospace',fontSize:'12.5px'}}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role==='admin'?'badge-purple':'badge-info'}`} style={{display:'inline-flex',alignItems:'center',gap:'4px'}}>
                      {u.role==='admin'?<Shield size={10}/>:<User size={10}/>}{u.role}
                    </span>
                  </td>
                  <td><span className={`badge ${u.isActive?'badge-success':'badge-gray'}`}>{u.isActive?'Active':'Inactive'}</span></td>
                  <td style={{color:'var(--gray-400)',fontSize:'12.5px'}}>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-IN') : 'Never'}</td>
                  <td style={{display:'flex',gap:'6px'}}>
                    <button className="btn btn-sm btn-secondary" onClick={()=>openEdit(u)}><Edit2 size={12}/>Edit</button>
                    <button className="btn btn-sm btn-secondary" onClick={()=>toggleActive(u)} style={{color:u.isActive?'var(--red)':'var(--primary)'}}>
                      {u.isActive?'Deactivate':'Activate'}
                    </button>
                  </td>
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
              <h3 className="modal-title">{editing?'Edit User':'Add User'}</h3>
              <button onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)'}}><X size={18}/></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Full Name <span className="req">*</span></label><input required className="form-input" value={form.name} onChange={e=>sf('name',e.target.value)} placeholder="e.g. Rahul Sharma"/></div>
                <div className="form-group"><label className="form-label">Email <span className="req">*</span></label><input required type="email" className="form-input" value={form.email} onChange={e=>sf('email',e.target.value)} placeholder="rahul@tesseractflexfuel.com"/></div>
                <div className="form-group">
                  <label className="form-label">{editing ? 'New Password (leave blank to keep)' : 'Password'} {!editing && <span className="req">*</span>}</label>
                  <input type="password" className="form-input" value={form.password} onChange={e=>sf('password',e.target.value)} required={!editing} minLength={6} placeholder="Min 6 characters"/>
                </div>
                <div className="form-group"><label className="form-label">Role</label>
                  <select className="form-select" value={form.role} onChange={e=>sf('role',e.target.value)}>
                    <option value="accountant">Accountant — Can create transactions, view reports</option>
                    <option value="admin">Admin — Full access including settings and users</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?<span className="spinner"/>:editing?'Update User':'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}