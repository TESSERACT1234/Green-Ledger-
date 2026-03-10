import React, { useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user } = useAuth();
  const [pwForm, setPwForm] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('New passwords do not match!');
    if (pwForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully!');
      setPwForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to change password'); }
    finally { setSaving(false); }
  };

  const Row = ({ label, value }) => (
    <div style={{display:'flex',justifyContent:'space-between',padding:'13px 0',borderBottom:'1px solid var(--gray-100)'}}>
      <span style={{fontSize:'13.5px',color:'var(--gray-500)',fontWeight:500}}>{label}</span>
      <span style={{fontSize:'13.5px',color:'var(--gray-900)',fontWeight:600}}>{value}</span>
    </div>
  );

  return (
    <AppLayout title="Settings">
      <div className="page-header">
        <div className="page-header-left"><h1>Settings</h1><p>Your account and company preferences</p></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',maxWidth:'900px'}}>

        <div className="card">
          <div className="card-header"><div className="card-title">Company Information</div></div>
          <div style={{padding:'0 20px 16px'}}>
            <Row label="Company Name"    value="Tesseract Flex Fuel Private Limited"/>
            <Row label="Business Type"   value="Sustainable Biodiesel Manufacturer"/>
            <Row label="GSTIN"           value="24AAKCT4104F1ZO"/>
            {/* <Row label="State"           value="Gujarat (Code 24)"/> */}
            {/* <Row label="GST Registered"  value="Yes — Regular Taxpayer"/> */}
            {/* <Row label="Financial Year"  value="April to March"/> */}
            {/* <Row label="Base Currency"   value="INR (Indian Rupee)"/> */}
          </div>
          <div style={{padding:'0 20px 20px'}}>
            <div style={{background:'var(--primary-pale)',border:'1px solid var(--primary-light)',borderRadius:'8px',padding:'12px 14px',fontSize:'13px',color:'var(--primary)'}}>
              <strong>To update company details</strong>, contact your system administrator or modify the <code style={{fontSize:'11px'}}>ORG_STATE_CODE</code> and company constants in the backend config.
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">My Account</div></div>
          <div style={{padding:'0 20px 16px'}}>
            <Row label="Name"  value={user?.name || '—'}/>
            <Row label="Email" value={user?.email || '—'}/>
            <Row label="Role"  value={user?.role || '—'}/>
          </div>
          <div style={{padding:'0 20px 20px'}}>
            <div style={{fontWeight:700,fontSize:'13px',color:'var(--gray-700)',marginBottom:'12px'}}>Change Password</div>
            <form onSubmit={handlePasswordChange}>
              <div className="form-group"><label className="form-label">Current Password</label><input required type="password" className="form-input" value={pwForm.currentPassword} onChange={e=>setPwForm(f=>({...f,currentPassword:e.target.value}))} placeholder="Enter current password"/></div>
              <div className="form-group"><label className="form-label">New Password</label><input required type="password" className="form-input" value={pwForm.newPassword} onChange={e=>setPwForm(f=>({...f,newPassword:e.target.value}))} placeholder="Min 6 characters"/></div>
              <div className="form-group"><label className="form-label">Confirm New Password</label><input required type="password" className="form-input" value={pwForm.confirmPassword} onChange={e=>setPwForm(f=>({...f,confirmPassword:e.target.value}))} placeholder="Repeat new password"/></div>
              <button type="submit" className="btn btn-primary" style={{width:'100%'}} disabled={saving}>
                {saving ? <span className="spinner"/> : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}