import React, { useEffect, useState } from 'react'
import { superAdminAPI, rbacAPI } from '../../services/api'

const DEFAULT_ACTIONS = ['view','create','update','delete','approve','process','manage']

export default function UserModuleAccess(){
  const [userId, setUserId] = useState('')
  const [modules, setModules] = useState([])
  const [selectedModule, setSelectedModule] = useState('')
  const [actions, setActions] = useState([])
  const [current, setCurrent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(()=>{
    let mounted = true
    async function load(){
      try{
        const res = await superAdminAPI.getModules()
        if(mounted){
          setModules(Array.isArray(res) ? res : [])
        }
      }catch(e){
        // fallback list
        if(mounted) setModules([
          'timesheet','payroll','employees','recruitment','admin','settings','learning','engagement','compliance','documents'
        ])
      }
    }
    load()
    return ()=>{ mounted=false }
  },[])

  const loadCurrent = async () =>{
    if(!userId || !selectedModule) return
    setLoading(true)
    setMessage(null)
    try{
      const res = await rbacAPI.getUserModuleAccess(userId, selectedModule)
      setCurrent(res || null)
      setActions((res && res.actions) || [])
    }catch(err){
      setCurrent(null)
      setActions([])
    }finally{ setLoading(false) }
  }

  const toggleAction = (act)=>{
    setActions(prev=> prev.includes(act) ? prev.filter(a=>a!==act) : [...prev, act])
  }

  const handleSave = async ()=>{
    if(!userId || !selectedModule) { setMessage('Provide user id and module'); return }
    setLoading(true)
    setMessage(null)
    try{
      const payload = { user_id: parseInt(userId,10), module: selectedModule, actions }
      const res = await rbacAPI.assignUserModuleAccess(payload)
      setCurrent(res)
      setMessage('Saved')
    }catch(err){
      setMessage(err.response?.data?.detail || 'Failed to save')
    }finally{ setLoading(false) }
  }

  const handleRevoke = async ()=>{
    if(!userId || !selectedModule) { setMessage('Provide user id and module'); return }
    setLoading(true)
    setMessage(null)
    try{
      await rbacAPI.revokeUserModuleAccess({ user_id: parseInt(userId,10), module: selectedModule })
      setCurrent(null)
      setActions([])
      setMessage('Revoked')
    }catch(err){
      setMessage(err.response?.data?.detail || 'Failed to revoke')
    }finally{ setLoading(false) }
  }

  return (
    <div className="bg-white rounded-md shadow p-4">
      <h3 className="text-lg font-semibold mb-3">User Module Access</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <input className="border p-2 rounded" placeholder="User ID" value={userId} onChange={e=>setUserId(e.target.value)} />
        <select className="border p-2 rounded" value={selectedModule} onChange={e=>setSelectedModule(e.target.value)}>
          <option value="">-- Select module --</option>
          {modules.map(m=> <option key={m} value={typeof m === 'string' ? m : m.key || m.title}>{typeof m === 'string' ? m : (m.key || m.title)}</option>)}
        </select>
        <div className="flex items-center space-x-2">
          <button onClick={loadCurrent} className="px-3 py-2 bg-gray-200 rounded">Load</button>
          <button onClick={handleSave} className="px-3 py-2 bg-blue-600 text-white rounded" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
          <button onClick={handleRevoke} className="px-3 py-2 bg-red-600 text-white rounded" disabled={loading}>Revoke</button>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-sm text-gray-600 mb-2">Actions</div>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_ACTIONS.map(a=> (
            <label key={a} className={`inline-flex items-center px-3 py-1 border rounded ${actions.includes(a) ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}>
              <input type="checkbox" checked={actions.includes(a)} onChange={()=>toggleAction(a)} className="mr-2" />
              <span className="text-sm">{a}</span>
            </label>
          ))}
        </div>
      </div>

      {message && <div className="text-sm mt-2 text-gray-700">{message}</div>}

      <div className="mt-4 text-sm text-gray-600">
        <div><strong>Current Grant:</strong></div>
        <pre className="mt-2 bg-gray-50 p-2 rounded text-xs">{current ? JSON.stringify(current, null, 2) : '—'}</pre>
      </div>
    </div>
  )
}
