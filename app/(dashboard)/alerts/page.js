'use client'

import { useState } from 'react'
import { MARKETS } from '../../../lib/markets'

function Badge({ children, color = 'gray' }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
    teal: 'bg-teal-100 text-teal-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}

function DeleteButton({ onDelete }) {
  const [confirming, setConfirming] = useState(false)
  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button onClick={onDelete} className="text-xs text-red-600 font-medium hover:underline">Confirm</button>
        <button onClick={() => setConfirming(false)} className="text-xs text-gray-400 hover:underline ml-1">Cancel</button>
      </span>
    )
  }
  return (
    <button onClick={() => setConfirming(true)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
      Remove
    </button>
  )
}

const SIGNAL_TYPES = [
  {
    id: 'new_entrant',
    label: 'New entrant detected',
    color: 'bg-orange-100 text-orange-700',
    description: 'Fires when an unknown domain breaks into the monitored detection zone for the first time.',
  },
  {
    id: 'high_confidence',
    label: 'High confidence signal',
    color: 'bg-teal-100 text-teal-700',
    description: 'Fires when a domain shows sustained presence across multiple sensor readings — strong indication of an established player.',
  },
]

const DUMMY_RULES = [
  {
    _id: 'dummy1',
    name: 'New entrant — SE cluster',
    signal: 'new_entrant',
    market: 'SE',
    sensor: '',
    depth: 10,
    notify_email: 'alerts@example.com',
    active: true,
    last_triggered: '2026-04-20T09:12:00Z',
  },
  {
    _id: 'dummy2',
    name: 'High confidence — DE cluster',
    signal: 'high_confidence',
    market: 'DE',
    sensor: '',
    depth: 5,
    notify_email: 'alerts@example.com',
    active: false,
    last_triggered: null,
  },
]

export default function AlertsPage() {
  const [rules, setRules] = useState(DUMMY_RULES)
  const [form, setForm] = useState({
    name: '',
    signal: 'new_entrant',
    market: '',
    sensor: '',
    depth: 10,
    notify_email: '',
  })

  function handleAdd(e) {
    e.preventDefault()
    setRules(r => [{ _id: `local_${Date.now()}`, ...form, active: true, last_triggered: null }, ...r])
    setForm({ name: '', signal: 'new_entrant', market: '', sensor: '', depth: 10, notify_email: '' })
  }

  function toggleActive(id) {
    setRules(r => r.map(rule => rule._id === id ? { ...rule, active: !rule.active } : rule))
  }

  function deleteRule(id) {
    setRules(r => r.filter(rule => rule._id !== id))
  }

  const selectedSignal = SIGNAL_TYPES.find(s => s.id === form.signal)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Alerts</h1>
        <p className="text-sm text-gray-500 mt-1">Define signal rules for detection events. Your n8n workflow reads these and fires email notifications when conditions are met.</p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex gap-3">
        <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-blue-800">Rules are evaluated by n8n after each sensor sweep</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Stored in <span className="font-mono">dcomp_alert_rules</span>. Configure your n8n flow to poll this collection post-sweep and trigger the email node when a rule condition is matched.
          </p>
        </div>
      </div>

      {/* Add rule form */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h3 className="font-semibold text-sm">Add alert rule</h3>
        <form onSubmit={handleAdd} className="space-y-4">

          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-gray-500 mb-1">Rule name</label>
              <input
                required
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. New entrant — SE cluster"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal"
              />
            </div>
            <div className="flex-1 min-w-52">
              <label className="block text-xs text-gray-500 mb-1">Signal type</label>
              <select
                value={form.signal}
                onChange={e => setForm(f => ({ ...f, signal: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal"
              >
                {SIGNAL_TYPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {selectedSignal && (
            <p className="text-xs text-gray-400 -mt-1">{selectedSignal.description}</p>
          )}

          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Market cluster <span className="text-gray-400">(optional)</span></label>
              <select
                value={form.market}
                onChange={e => setForm(f => ({ ...f, market: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal"
              >
                <option value="">All clusters</option>
                {MARKETS.map(m => <option key={m.code} value={m.code}>{m.code} — {m.label}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-40">
              <label className="block text-xs text-gray-500 mb-1">Sensor node <span className="text-gray-400">(optional)</span></label>
              <input
                value={form.sensor}
                onChange={e => setForm(f => ({ ...f, sensor: e.target.value }))}
                placeholder="Leave blank to monitor all sensors"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs text-gray-500 mb-1">Detection depth</label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.depth}
                onChange={e => setForm(f => ({ ...f, depth: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-56">
              <label className="block text-xs text-gray-500 mb-1">Notify email</label>
              <input
                required
                type="email"
                value={form.notify_email}
                onChange={e => setForm(f => ({ ...f, notify_email: e.target.value }))}
                placeholder="you@company.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-hubspotTeal/50 focus:border-hubspotTeal"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-hubspotTeal text-white rounded-lg text-sm font-medium hover:bg-hubspotTeal/90 transition-colors"
            >
              + Add rule
            </button>
          </div>
        </form>
      </div>

      {/* Rules list */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
          <span className="font-medium text-sm">{rules.length} alert rules</span>
          <span className="text-xs text-amber-600 font-medium">Layout preview — not yet connected to DB</span>
        </div>

        {rules.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No alert rules yet.</div>
        ) : (
          rules.map(rule => {
            const signal = SIGNAL_TYPES.find(s => s.id === rule.signal)
            return (
              <div
                key={rule._id}
                className={`px-5 py-4 border-b last:border-b-0 flex items-start justify-between gap-4 transition-opacity ${!rule.active ? 'opacity-40' : ''}`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={() => toggleActive(rule._id)}
                    className={`mt-0.5 w-9 h-5 rounded-full transition-colors shrink-0 relative ${rule.active ? 'bg-hubspotTeal' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rule.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{rule.name}</span>
                      {signal && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${signal.color}`}>
                          {signal.label}
                        </span>
                      )}
                      {rule.market && <Badge color="blue">{rule.market}</Badge>}
                      {rule.sensor && <Badge color="gray">{rule.sensor}</Badge>}
                    </div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      <span className="text-xs text-gray-400">Detection depth: {rule.depth}</span>
                      <span className="text-xs text-gray-400">→ {rule.notify_email}</span>
                      {rule.last_triggered ? (
                        <span className="text-xs text-gray-400">Last fired: {new Date(rule.last_triggered).toLocaleDateString()}</span>
                      ) : (
                        <span className="text-xs text-gray-300">Never fired</span>
                      )}
                    </div>
                  </div>
                </div>
                <DeleteButton onDelete={() => deleteRule(rule._id)} />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
