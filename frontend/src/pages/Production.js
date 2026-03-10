import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../components/layout/AppLayout';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, X, CheckCircle, FlaskConical, ChevronRight, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

// ── Biodiesel production ratios (transesterification) ──────────
// Standard: per 1000L biodiesel output
const DEFAULT_BOM = {
  name: 'Standard Biodiesel Batch (35 KL)',
  batchSize: 35000,
  batchUnit: 'litres',
  inputs: [
    { itemName: 'Palm Stearin',  quantity: 36000, unit: 'litres', costPerUnit: 0 },
    { itemName: 'Methanol',      quantity: 4000,  unit: 'litres', costPerUnit: 0 },
    { itemName: 'KOH',           quantity: 250,   unit: 'kg',     costPerUnit: 0 },
  ],
  outputs: [
    { itemName: 'Biodiesel B100', quantity: 35000, unit: 'litres', isMainProduct: true },
    { itemName: 'Glycerine',      quantity: 3500,  unit: 'kg',     isMainProduct: false },
  ],
};

const STATUS_COLOR = { planned:'#3b82f6', in_progress:'#f97316', completed:'#16a34a', cancelled:'#6b7280' };
const STATUS_BG    = { planned:'#eff6ff', in_progress:'#fff7ed', completed:'#f0fdf4', cancelled:'#f9fafb' };

export default function Production() {
  const [tab, setTab]           = useState('batches');    // batches | bom | calculator
  const [batches, setBatches]   = useState([]);
  const [boms, setBoms]         = useState([]);
  const [items, setItems]       = useState([]);
  const [summary, setSummary]   = useState({});
  const [loading, setLoading]   = useState(true);

  // Modals
  const [newBatchModal, setNewBatchModal]     = useState(false);
  const [completeModal, setCompleteModal]     = useState(null); // batch to complete
  const [newBomModal, setNewBomModal]         = useState(false);

  // Forms
  const [batchForm, setBatchForm] = useState({ bomId:'', batchMultiplier:1, date: new Date().toISOString().slice(0,10), notes:'' });
  const [completeForm, setCompleteForm] = useState({});  // { outputItemId: actualQty }
  const [bomForm, setBomForm]     = useState(DEFAULT_BOM);

  // Calculator (standalone — no batch needed)
  const [calcBomId, setCalcBomId]   = useState('');
  const [calcInputs, setCalcInputs] = useState({});  // { itemName: qty }
  const [calcResult, setCalcResult] = useState(null);

  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, bm, it, s] = await Promise.all([
        api.get('/production/batches'),
        api.get('/production/bom'),
        api.get('/items?limit=200'),
        api.get('/production/summary'),
      ]);
      setBatches(b.data.data);
      setBoms(bm.data.data);
      setItems(it.data.data);
      setSummary(s.data.data);
    } catch { toast.error('Failed to load production data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Calculator ───────────────────────────────────────────────
  const selectedBom = boms.find(b => b._id === calcBomId);

  const runCalculator = () => {
    if (!selectedBom) return;
    // For each input, see how many full batches we can make
    let minRatio = Infinity;
    selectedBom.inputs.forEach(inp => {
      const have  = parseFloat(calcInputs[inp.itemName] || 0);
      const ratio = have > 0 ? have / inp.quantity : 0;
      if (ratio < minRatio) minRatio = ratio;
    });
    if (minRatio === 0 || minRatio === Infinity) { toast.error('Enter at least one input quantity'); return; }

    const outputs = selectedBom.outputs.map(out => ({
      ...out,
      expectedQty: +(out.quantity * minRatio).toFixed(2),
    }));

    const inputs = selectedBom.inputs.map(inp => {
      const have     = parseFloat(calcInputs[inp.itemName] || 0);
      const required = +(inp.quantity * minRatio).toFixed(2);
      return { ...inp, have, required, surplus: +(have - required).toFixed(2) };
    });

    setCalcResult({ ratio: minRatio.toFixed(3), inputs, outputs });
  };

  // ── Create Batch ─────────────────────────────────────────────
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!batchForm.bomId) return toast.error('Select a recipe first');
    setSaving(true);
    try {
      await api.post('/production/batches', batchForm);
      toast.success('Production batch created!');
      setNewBatchModal(false);
      setBatchForm({ bomId:'', batchMultiplier:1, date: new Date().toISOString().slice(0,10), notes:'' });
      load();
    } catch(e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  // ── Complete Batch ───────────────────────────────────────────
  const openComplete = (batch) => {
    const init = {};
    batch.outputs.forEach(o => { init[o.itemId || o.itemName] = o.expectedQty; });
    setCompleteForm(init);
    setCompleteModal(batch);
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const actualOutputs = {};
      completeModal.outputs.forEach(o => {
        actualOutputs[o.itemId || o.itemName] = parseFloat(completeForm[o.itemId || o.itemName] || o.expectedQty);
      });
      await api.patch(`/production/batches/${completeModal._id}/complete`, { actualOutputs });
      toast.success('Batch completed! Stock updated.');
      setCompleteModal(null);
      load();
    } catch(e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  // ── Create BOM ───────────────────────────────────────────────
  const handleCreateBom = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/production/bom', bomForm);
      toast.success('Recipe saved!');
      setNewBomModal(false);
      setBomForm(DEFAULT_BOM);
      load();
    } catch(e) { toast.error(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const addBomInput  = () => setBomForm(f => ({ ...f, inputs:  [...f.inputs,  { itemName:'', quantity:0, unit:'kg',     costPerUnit:0 }] }));
  const addBomOutput = () => setBomForm(f => ({ ...f, outputs: [...f.outputs, { itemName:'', quantity:0, unit:'litres', isMainProduct:false }] }));

  // Preview for new batch
  const previewBom = boms.find(b => b._id === batchForm.bomId);

  return (
    <AppLayout title="Production">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Production</h1>
          <p>Biodiesel manufacturing — batches, recipes & yield tracking</p>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <button className="btn btn-secondary" onClick={()=>setNewBomModal(true)}><Plus size={14}/> New Recipe</button>
          <button className="btn btn-primary"   onClick={()=>setNewBatchModal(true)}><Plus size={14}/> New Batch</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',marginBottom:'20px'}}>
        {[
          { label:'Total Batches',    value: summary.total       || 0, icon:'🏭', color:'#3b82f6', bg:'#eff6ff' },
          { label:'Completed',        value: summary.completed   || 0, icon:'✅', color:'#16a34a', bg:'#f0fdf4' },
          { label:'In Progress / Planned', value: (summary.inProgress||0)+(summary.planned||0), icon:'⚙️', color:'#f97316', bg:'#fff7ed' },
          { label:'Avg Efficiency',   value: `${summary.avgEfficiency||0}%`, icon:'📊', color:'#8b5cf6', bg:'#f5f3ff' },
        ].map((k,i) => (
          <div key={i} style={{background:'white',border:'1px solid var(--gray-200)',borderRadius:'12px',padding:'16px',display:'flex',alignItems:'center',gap:'14px'}}>
            <div style={{width:42,height:42,borderRadius:'10px',background:k.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0}}>{k.icon}</div>
            <div>
              <div style={{fontSize:'11px',color:'var(--gray-400)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>{k.label}</div>
              <div style={{fontSize:'20px',fontWeight:800,color:k.color}}>{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:'4px',marginBottom:'16px',background:'var(--gray-100)',padding:'4px',borderRadius:'10px',width:'fit-content'}}>
        {[
          { id:'batches',    label:'🏭 Production Batches' },
          { id:'calculator', label:'🧮 Yield Calculator'   },
          { id:'bom',        label:'📋 Recipes (BOM)'      },
        ].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:'8px 18px',borderRadius:'7px',border:'none',fontFamily:'inherit',fontWeight:600,fontSize:'13px',cursor:'pointer',
              background:tab===t.id?'white':'transparent',color:tab===t.id?'var(--gray-900)':'var(--gray-500)',
              boxShadow:tab===t.id?'0 1px 4px rgba(0,0,0,0.1)':'none'}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ BATCHES TAB ══ */}
      {tab === 'batches' && (
        <div className="card">
          {loading
            ? <div style={{padding:'40px',textAlign:'center'}}><div className="spinner" style={{margin:'0 auto'}}/></div>
            : batches.length === 0
            ? <div className="empty-state">
                <div className="empty-icon">🏭</div>
                <div className="empty-title">No production batches yet</div>
                <div className="empty-desc">Click "New Batch" to start your first production run</div>
                <button className="btn btn-primary" style={{marginTop:'12px'}} onClick={()=>setNewBatchModal(true)}><Plus size={14}/> New Batch</button>
              </div>
            : <table className="data-table">
                <thead><tr>
                  <th>Batch #</th><th>Recipe</th><th>Date</th><th>Scale</th>
                  <th style={{textAlign:'right'}}>Input Cost</th><th style={{textAlign:'right'}}>Cost/Litre</th>
                  <th style={{textAlign:'right'}}>Efficiency</th><th>Status</th><th></th>
                </tr></thead>
                <tbody>
                  {batches.map(b => (
                    <tr key={b._id}>
                      <td style={{fontWeight:700,fontFamily:'monospace',color:'var(--primary)',fontSize:'12.5px'}}>{b.batchNumber}</td>
                      <td style={{fontWeight:600}}>{b.bomName}</td>
                      <td style={{fontSize:'12.5px',color:'var(--gray-500)'}}>{new Date(b.date).toLocaleDateString('en-IN')}</td>
                      <td style={{fontFamily:'monospace',fontSize:'13px'}}>×{b.batchMultiplier}</td>
                      <td style={{textAlign:'right',fontFamily:'monospace',fontWeight:600}}>₹{(b.totalInputCost||0).toLocaleString('en-IN')}</td>
                      <td style={{textAlign:'right',fontFamily:'monospace'}}>₹{b.costPerLitre||'—'}</td>
                      <td style={{textAlign:'right'}}>
                        {b.efficiency
                          ? <span style={{fontWeight:700,color: b.efficiency>=95?'#16a34a':b.efficiency>=85?'#f97316':'#ef4444'}}>
                              {b.efficiency}%
                            </span>
                          : '—'}
                      </td>
                      <td>
                        <span style={{fontSize:'11.5px',fontWeight:700,padding:'3px 10px',borderRadius:'20px',
                          background:STATUS_BG[b.status],color:STATUS_COLOR[b.status],textTransform:'capitalize'}}>
                          {b.status.replace('_',' ')}
                        </span>
                      </td>
                      <td>
                        {b.status !== 'completed' && b.status !== 'cancelled' && (
                          <button onClick={()=>openComplete(b)}
                            style={{padding:'5px 12px',background:'#16a34a',color:'white',border:'none',borderRadius:'6px',
                              fontFamily:'inherit',fontWeight:700,fontSize:'12px',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px'}}>
                            <CheckCircle size={12}/> Complete
                          </button>
                        )}
                        {b.status === 'completed' && (
                          <div style={{fontSize:'11px',color:'var(--gray-400)'}}>
                            {b.outputs?.map(o => (
                              <div key={o.itemName}>
                                {o.itemName}: <strong style={{color:o.variance>=0?'#16a34a':'#ef4444'}}>
                                  {o.actualQty} {o.unit}
                                  {o.variancePct != null && ` (${o.variancePct > 0 ? '+' : ''}${o.variancePct}%)`}
                                </strong>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      )}

      {/* ══ CALCULATOR TAB ══ */}
      {tab === 'calculator' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}}>
          {/* Left — inputs */}
          <div className="card">
            <h3 style={{fontSize:'15px',fontWeight:700,marginBottom:'16px',display:'flex',alignItems:'center',gap:'8px'}}>
              🧮 Yield Calculator
              <span style={{fontSize:'12px',fontWeight:400,color:'var(--gray-400)'}}>Enter what you have → see what you'll get</span>
            </h3>

            <div className="form-group">
              <label className="form-label">Select Recipe</label>
              <select className="form-select" value={calcBomId} onChange={e=>{setCalcBomId(e.target.value);setCalcInputs({});setCalcResult(null);}}>
                <option value="">Choose a recipe…</option>
                {boms.map(b=><option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>

            {selectedBom && (
              <>
                <div style={{background:'#f8fafc',borderRadius:'8px',padding:'14px',marginBottom:'16px',fontSize:'12.5px',color:'var(--gray-500)'}}>
                  Standard batch: <strong style={{color:'var(--gray-800)'}}>{selectedBom.batchSize} {selectedBom.batchUnit}</strong> of biodiesel
                </div>
                <div style={{fontWeight:700,fontSize:'12.5px',color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'10px'}}>
                  Enter quantities you have:
                </div>
                {selectedBom.inputs.map(inp => (
                  <div key={inp.itemName} className="form-group" style={{marginBottom:'10px'}}>
                    <label className="form-label" style={{display:'flex',justifyContent:'space-between'}}>
                      <span>{inp.itemName}</span>
                      <span style={{fontWeight:400,color:'var(--gray-400)'}}>Standard: {inp.quantity} {inp.unit}</span>
                    </label>
                    <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                      <input type="number" min="0" step="0.1" className="form-input"
                        value={calcInputs[inp.itemName]||''}
                        onChange={e=>setCalcInputs(p=>({...p,[inp.itemName]:e.target.value}))}
                        placeholder={`e.g. ${inp.quantity}`}/>
                      <span style={{fontSize:'13px',color:'var(--gray-400)',whiteSpace:'nowrap',minWidth:'40px'}}>{inp.unit}</span>
                    </div>
                  </div>
                ))}
                <button className="btn btn-primary" style={{width:'100%',marginTop:'8px'}} onClick={runCalculator}>
                  Calculate Yield →
                </button>
              </>
            )}

            {!selectedBom && boms.length === 0 && (
              <div style={{textAlign:'center',padding:'30px',color:'var(--gray-400)'}}>
                <div style={{fontSize:'32px',marginBottom:'8px'}}>📋</div>
                No recipes yet. <button className="btn btn-sm btn-secondary" style={{marginLeft:'6px'}} onClick={()=>{setTab('bom');setNewBomModal(true);}}>Create one</button>
              </div>
            )}
          </div>

          {/* Right — results */}
          <div>
            {calcResult ? (
              <>
                {/* Outputs */}
                <div className="card" style={{marginBottom:'16px'}}>
                  <h4 style={{fontSize:'14px',fontWeight:700,marginBottom:'14px',color:'#16a34a'}}>✅ Expected Output</h4>
                  {calcResult.outputs.map(out => (
                    <div key={out.itemName} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                      padding:'12px 14px',borderRadius:'10px',marginBottom:'8px',
                      background:out.isMainProduct?'#f0fdf4':'#f8fafc',
                      border:`1.5px solid ${out.isMainProduct?'#86efac':'var(--gray-200)'}`}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:'14px'}}>{out.itemName}</div>
                        {out.isMainProduct && <div style={{fontSize:'11px',color:'#16a34a',fontWeight:600}}>Main Product</div>}
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:'22px',fontWeight:900,color:out.isMainProduct?'#16a34a':'var(--gray-700)'}}>
                          {out.expectedQty.toLocaleString('en-IN')}
                        </div>
                        <div style={{fontSize:'12px',color:'var(--gray-400)'}}>{out.unit}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{fontSize:'12px',color:'var(--gray-400)',marginTop:'8px',textAlign:'center'}}>
                    Based on {parseFloat(calcResult.ratio).toFixed(2)}× the standard batch
                  </div>
                </div>

                {/* Input usage */}
                <div className="card">
                  <h4 style={{fontSize:'14px',fontWeight:700,marginBottom:'14px'}}>📦 Feedstock Usage</h4>
                  {calcResult.inputs.map(inp => (
                    <div key={inp.itemName} style={{marginBottom:'12px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                        <span style={{fontWeight:600,fontSize:'13px'}}>{inp.itemName}</span>
                        <span style={{fontSize:'12px',color: inp.surplus >= 0 ? '#16a34a' : '#ef4444',fontWeight:700}}>
                          {inp.surplus >= 0 ? `+${inp.surplus} surplus` : `${Math.abs(inp.surplus)} short`} {inp.unit}
                        </span>
                      </div>
                      <div style={{display:'flex',gap:'12px',fontSize:'12px',color:'var(--gray-500)'}}>
                        <span>You have: <strong>{inp.have} {inp.unit}</strong></span>
                        <span>Will use: <strong>{inp.required} {inp.unit}</strong></span>
                      </div>
                      {/* progress bar */}
                      <div style={{height:'6px',background:'var(--gray-100)',borderRadius:'3px',marginTop:'6px',overflow:'hidden'}}>
                        <div style={{height:'100%',borderRadius:'3px',
                          width:`${Math.min(100,(inp.required/inp.have)*100)}%`,
                          background: inp.surplus>=0?'#16a34a':'#ef4444'}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                background:'white',borderRadius:'12px',border:'1px solid var(--gray-200)',padding:'40px',textAlign:'center',color:'var(--gray-400)'}}>
                <div style={{fontSize:'48px',marginBottom:'12px'}}>⚗️</div>
                <div style={{fontWeight:600,fontSize:'14px',marginBottom:'6px'}}>Enter your feedstock quantities</div>
                <div style={{fontSize:'12.5px'}}>The calculator will show exactly how much biodiesel & glycerine you can produce</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ BOM TAB ══ */}
      {tab === 'bom' && (
        <div>
          {boms.length === 0
            ? <div className="card"><div className="empty-state">
                <div className="empty-icon">📋</div>
                <div className="empty-title">No recipes yet</div>
                <div className="empty-desc">Create your first Bill of Materials to define your production recipe</div>
                <button className="btn btn-primary" style={{marginTop:'12px'}} onClick={()=>setNewBomModal(true)}><Plus size={14}/> Create Recipe</button>
              </div></div>
            : boms.map(bom => (
              <div key={bom._id} className="card" style={{marginBottom:'16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px'}}>
                  <div>
                    <h3 style={{fontSize:'16px',fontWeight:700,margin:0}}>{bom.name}</h3>
                    <div style={{fontSize:'12px',color:'var(--gray-400)',marginTop:'3px'}}>
                      Per batch: <strong>{bom.batchSize} {bom.batchUnit}</strong> of main product
                    </div>
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={()=>{setCalcBomId(bom._id);setTab('calculator');}}>
                    🧮 Use in Calculator
                  </button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:'12px',color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'8px'}}>📥 Inputs (Feedstocks)</div>
                    {bom.inputs.map((inp,i) => (
                      <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:'#fff8f0',borderRadius:'7px',marginBottom:'6px',border:'1px solid #fed7aa'}}>
                        <span style={{fontWeight:600,fontSize:'13px'}}>{inp.itemName}</span>
                        <span style={{fontFamily:'monospace',fontSize:'13px',color:'#c2410c',fontWeight:700}}>{inp.quantity} {inp.unit}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{fontWeight:700,fontSize:'12px',color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'8px'}}>📤 Outputs (Products)</div>
                    {bom.outputs.map((out,i) => (
                      <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:out.isMainProduct?'#f0fdf4':'#f8fafc',borderRadius:'7px',marginBottom:'6px',border:`1px solid ${out.isMainProduct?'#86efac':'var(--gray-200)'}`}}>
                        <span style={{fontWeight:600,fontSize:'13px'}}>{out.itemName}{out.isMainProduct&&' ⭐'}</span>
                        <span style={{fontFamily:'monospace',fontSize:'13px',color:'#15803d',fontWeight:700}}>{out.quantity} {out.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          }
          <button className="btn btn-secondary" onClick={()=>setNewBomModal(true)}><Plus size={14}/> Add Another Recipe</button>
        </div>
      )}

      {/* ══ NEW BATCH MODAL ══ */}
      {newBatchModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setNewBatchModal(false)}>
          <div className="modal modal-md">
            <div className="modal-header">
              <h3 className="modal-title">🏭 Start Production Batch</h3>
              <button onClick={()=>setNewBatchModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)'}}><X size={18}/></button>
            </div>
            <form onSubmit={handleCreateBatch}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Recipe <span className="req">*</span></label>
                    <select required className="form-select" value={batchForm.bomId} onChange={e=>setBatchForm(f=>({...f,bomId:e.target.value}))}>
                      <option value="">Select recipe…</option>
                      {boms.map(b=><option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                    {boms.length === 0 && <div style={{fontSize:'12px',color:'#f97316',marginTop:'4px'}}>No recipes yet — <button type="button" className="btn btn-sm" onClick={()=>{setNewBatchModal(false);setNewBomModal(true);}}>create one first</button></div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Batch Scale (×) <span className="req">*</span></label>
                    <input type="number" min="0.1" step="0.1" className="form-input" value={batchForm.batchMultiplier}
                      onChange={e=>setBatchForm(f=>({...f,batchMultiplier:parseFloat(e.target.value)||1}))}/>
                    <div style={{fontSize:'11.5px',color:'var(--gray-400)',marginTop:'3px'}}>1 = standard batch, 2 = double batch, 0.5 = half batch</div>
                  </div>
                </div>

                {/* Preview */}
                {previewBom && (
                  <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:'10px',padding:'14px',marginBottom:'16px'}}>
                    <div style={{fontWeight:700,fontSize:'13px',color:'#14532d',marginBottom:'10px'}}>📊 Batch Preview (×{batchForm.batchMultiplier})</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',fontSize:'12.5px'}}>
                      <div>
                        <div style={{fontWeight:700,color:'var(--gray-500)',textTransform:'uppercase',fontSize:'11px',marginBottom:'6px'}}>Will Consume</div>
                        {previewBom.inputs.map((inp,i)=>(
                          <div key={i} style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                            <span>{inp.itemName}</span>
                            <strong style={{color:'#c2410c'}}>{+(inp.quantity*batchForm.batchMultiplier).toFixed(2)} {inp.unit}</strong>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{fontWeight:700,color:'var(--gray-500)',textTransform:'uppercase',fontSize:'11px',marginBottom:'6px'}}>Will Produce</div>
                        {previewBom.outputs.map((out,i)=>(
                          <div key={i} style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                            <span>{out.itemName}</span>
                            <strong style={{color:'#15803d'}}>{+(out.quantity*batchForm.batchMultiplier).toFixed(2)} {out.unit}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Production Date</label>
                    <input type="date" className="form-input" value={batchForm.date} onChange={e=>setBatchForm(f=>({...f,date:e.target.value}))}/>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={2} value={batchForm.notes} onChange={e=>setBatchForm(f=>({...f,notes:e.target.value}))} placeholder="Any notes about this batch…"/>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setNewBatchModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?<span className="spinner"/>:'Start Batch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ COMPLETE BATCH MODAL ══ */}
      {completeModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setCompleteModal(null)}>
          <div className="modal modal-md">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">✅ Complete Batch — {completeModal.batchNumber}</h3>
                <div style={{fontSize:'12px',color:'var(--gray-400)',marginTop:'3px'}}>Enter actual quantities produced</div>
              </div>
              <button onClick={()=>setCompleteModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)'}}><X size={18}/></button>
            </div>
            <form onSubmit={handleComplete}>
              <div className="modal-body">
                <div style={{background:'#f8fafc',border:'1px solid var(--gray-200)',borderRadius:'10px',padding:'14px',marginBottom:'16px'}}>
                  <div style={{fontWeight:700,fontSize:'12.5px',color:'var(--gray-500)',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Expected Output</div>
                  {completeModal.outputs.map((out,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:'13px',marginBottom:'4px'}}>
                      <span style={{fontWeight:600}}>{out.itemName}</span>
                      <span style={{fontFamily:'monospace',color:'var(--primary)',fontWeight:700}}>{out.expectedQty} {out.unit}</span>
                    </div>
                  ))}
                </div>

                <div style={{fontWeight:700,fontSize:'13px',marginBottom:'12px',color:'var(--gray-700)'}}>🎯 Enter Actual Quantities:</div>
                {completeModal.outputs.map(out => {
                  const key    = out.itemId || out.itemName;
                  const actual = parseFloat(completeForm[key] || out.expectedQty);
                  const diff   = +(actual - out.expectedQty).toFixed(2);
                  const pct    = out.expectedQty ? +((diff/out.expectedQty)*100).toFixed(1) : 0;
                  return (
                    <div key={key} className="form-group">
                      <label className="form-label" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span>{out.itemName} ({out.unit})</span>
                        {completeForm[key] && (
                          <span style={{fontWeight:700,fontSize:'12px',color:diff>=0?'#16a34a':'#ef4444',display:'flex',alignItems:'center',gap:'3px'}}>
                            {diff>=0?<TrendingUp size={12}/>:<TrendingDown size={12}/>}
                            {diff>=0?'+':''}{diff} ({pct>=0?'+':''}{pct}%)
                          </span>
                        )}
                      </label>
                      <input type="number" min="0" step="0.1" className="form-input"
                        value={completeForm[key]||''}
                        placeholder={`Expected: ${out.expectedQty}`}
                        onChange={e=>setCompleteForm(f=>({...f,[key]:e.target.value}))}/>
                    </div>
                  );
                })}
                <div style={{background:'#fff8f0',border:'1px solid #fed7aa',borderRadius:'8px',padding:'10px 14px',fontSize:'12.5px',color:'#92400e',display:'flex',gap:'8px',alignItems:'flex-start'}}>
                  <AlertTriangle size={14} style={{flexShrink:0,marginTop:'1px'}}/>
                  Completing this batch will update your product stock levels automatically.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setCompleteModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{background:'#16a34a'}} disabled={saving}>
                  {saving?<span className="spinner"/>:<><CheckCircle size={14}/> Confirm & Update Stock</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ NEW BOM MODAL ══ */}
      {newBomModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setNewBomModal(false)}>
          <div className="modal" style={{maxWidth:'680px',maxHeight:'90vh',overflowY:'auto'}}>
            <div className="modal-header">
              <h3 className="modal-title">📋 Create Recipe (Bill of Materials)</h3>
              <button onClick={()=>setNewBomModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--gray-400)'}}><X size={18}/></button>
            </div>
            <form onSubmit={handleCreateBom}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Recipe Name <span className="req">*</span></label>
                    <input required className="form-input" value={bomForm.name} onChange={e=>setBomForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Standard Biodiesel Batch"/>
                  </div>
                  <div className="form-row" style={{gap:'8px'}}>
                    <div className="form-group">
                      <label className="form-label">Batch Size <span className="req">*</span></label>
                      <input required type="number" className="form-input" value={bomForm.batchSize} onChange={e=>setBomForm(f=>({...f,batchSize:+e.target.value}))}/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Unit</label>
                      <input className="form-input" value={bomForm.batchUnit} onChange={e=>setBomForm(f=>({...f,batchUnit:e.target.value}))}/>
                    </div>
                  </div>
                </div>

                {/* Inputs */}
                <div style={{fontWeight:700,fontSize:'13px',color:'#c2410c',marginBottom:'8px',marginTop:'8px'}}>📥 Feedstock Inputs</div>
                {bomForm.inputs.map((inp,i)=>(
                  <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr auto',gap:'8px',marginBottom:'8px',alignItems:'end'}}>
                    <div className="form-group" style={{margin:0}}>
                      {i===0&&<label className="form-label">Material</label>}
                      <input required className="form-input" value={inp.itemName} onChange={e=>{const ins=[...bomForm.inputs];ins[i]={...ins[i],itemName:e.target.value};setBomForm(f=>({...f,inputs:ins}));}} placeholder="Palm Stearin, Methanol…"/>
                    </div>
                    <div className="form-group" style={{margin:0}}>
                      {i===0&&<label className="form-label">Quantity</label>}
                      <input required type="number" min="0" step="0.01" className="form-input" value={inp.quantity} onChange={e=>{const ins=[...bomForm.inputs];ins[i]={...ins[i],quantity:+e.target.value};setBomForm(f=>({...f,inputs:ins}));}}/>
                    </div>
                    <div className="form-group" style={{margin:0}}>
                      {i===0&&<label className="form-label">Unit</label>}
                      <input className="form-input" value={inp.unit} onChange={e=>{const ins=[...bomForm.inputs];ins[i]={...ins[i],unit:e.target.value};setBomForm(f=>({...f,inputs:ins}));}} placeholder="kg / litres"/>
                    </div>
                    <button type="button" onClick={()=>setBomForm(f=>({...f,inputs:f.inputs.filter((_,j)=>j!==i)}))}
                      style={{background:'#fee2e2',border:'none',borderRadius:'6px',padding:'8px',cursor:'pointer',color:'#ef4444',alignSelf:'flex-end'}}><X size={14}/></button>
                  </div>
                ))}
                <button type="button" className="btn btn-sm btn-secondary" onClick={addBomInput}><Plus size={12}/> Add Input</button>

                {/* Outputs */}
                <div style={{fontWeight:700,fontSize:'13px',color:'#15803d',marginBottom:'8px',marginTop:'16px'}}>📤 Outputs (Products)</div>
                {bomForm.outputs.map((out,i)=>(
                  <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr auto auto',gap:'8px',marginBottom:'8px',alignItems:'end'}}>
                    <div className="form-group" style={{margin:0}}>
                      {i===0&&<label className="form-label">Product</label>}
                      <input required className="form-input" value={out.itemName} onChange={e=>{const outs=[...bomForm.outputs];outs[i]={...outs[i],itemName:e.target.value};setBomForm(f=>({...f,outputs:outs}));}} placeholder="Biodiesel B100…"/>
                    </div>
                    <div className="form-group" style={{margin:0}}>
                      {i===0&&<label className="form-label">Quantity</label>}
                      <input required type="number" min="0" step="0.01" className="form-input" value={out.quantity} onChange={e=>{const outs=[...bomForm.outputs];outs[i]={...outs[i],quantity:+e.target.value};setBomForm(f=>({...f,outputs:outs}));}}/>
                    </div>
                    <div className="form-group" style={{margin:0}}>
                      {i===0&&<label className="form-label">Unit</label>}
                      <input className="form-input" value={out.unit} onChange={e=>{const outs=[...bomForm.outputs];outs[i]={...outs[i],unit:e.target.value};setBomForm(f=>({...f,outputs:outs}));}} placeholder="litres / kg"/>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
                      {i===0&&<label className="form-label" style={{fontSize:'10px'}}>Main?</label>}
                      <input type="checkbox" checked={out.isMainProduct} style={{width:'18px',height:'18px',cursor:'pointer',accentColor:'#16a34a'}}
                        onChange={e=>{const outs=[...bomForm.outputs];outs[i]={...outs[i],isMainProduct:e.target.checked};setBomForm(f=>({...f,outputs:outs}));}}/>
                    </div>
                    <button type="button" onClick={()=>setBomForm(f=>({...f,outputs:f.outputs.filter((_,j)=>j!==i)}))}
                      style={{background:'#fee2e2',border:'none',borderRadius:'6px',padding:'8px',cursor:'pointer',color:'#ef4444',alignSelf:'flex-end'}}><X size={14}/></button>
                  </div>
                ))}
                <button type="button" className="btn btn-sm btn-secondary" onClick={addBomOutput}><Plus size={12}/> Add Output</button>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setNewBomModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?<span className="spinner"/>:'Save Recipe'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}