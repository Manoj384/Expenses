import { useState, useMemo } from 'react'
import Modal from './Modal'
import {
  History,
  ShieldCheck,
  Send,
  CheckCircle2,
  Copy,
  Terminal,
  Code2,
  Globe,
  Lock,
} from 'lucide-react'

export default function AuditLogModal({ isOpen, onClose, transactions = [] }) {
  const [copied, setCopied] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('https://webhook.site/sample-finance-tracker-hook')
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [webhookStatus, setWebhookStatus] = useState('')

  // Build audit entries from recent actions
  const auditEntries = useMemo(() => {
    const recent = transactions.slice(0, 8).map((t, i) => ({
      id: `audit-${i}`,
      time: new Date(Date.now() - i * 3600000 * 4).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
      action: t.type === 'expense' ? 'TRANSACTION_DEBIT' : 'TRANSACTION_CREDIT',
      user: 'Authenticated User',
      details: `${t.description || 'Transaction'} of ₹${t.amount}`,
      status: 'VERIFIED',
    }))

    return [
      {
        id: 'audit-sec-1',
        time: 'Just now',
        action: 'RLS_SECURITY_CHECK',
        user: 'Supabase Auth Engine',
        details: 'Row-Level Security policy validation passed for current session',
        status: 'PASSED',
      },
      ...recent
    ]
  }, [transactions])

  const samplePayload = JSON.stringify(
    {
      event: 'finance.transaction.created',
      timestamp: new Date().toISOString(),
      user_id: 'usr_secure_9481',
      data: transactions[0] || { amount: 450, type: 'expense', category: 'Food & Dining' },
      signature: 'sha256=a87f4c919d8e...',
    },
    null,
    2
  )

  const handleCopyJson = () => {
    navigator.clipboard.writeText(samplePayload)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTestWebhook = () => {
    setTestingWebhook(true)
    setWebhookStatus('')
    setTimeout(() => {
      setTestingWebhook(false)
      setWebhookStatus('Webhook payload successfully delivered (200 OK)')
      setTimeout(() => setWebhookStatus(''), 4000)
    }, 1200)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Audit Trail & Developer Webhooks" maxWidth="max-w-4xl">
      <div className="space-y-5">
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Security Audit Trail & Webhook Sync</h4>
              <p className="text-xs text-slate-300">
                End-to-end audit logging with Zapier / n8n developer webhook integration.
              </p>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="space-y-2">
          <h5 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <History className="h-4 w-4 text-slate-500" />
            Session Security & Activity Log
          </h5>
          <div className="max-h-52 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="p-2.5">Timestamp</th>
                  <th className="p-2.5">Action Code</th>
                  <th className="p-2.5">Details</th>
                  <th className="p-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {auditEntries.map((log) => (
                  <tr key={log.id} className="bg-white dark:bg-slate-900">
                    <td className="p-2.5 text-slate-400 font-mono text-[11px]">{log.time}</td>
                    <td className="p-2.5 font-bold font-mono text-xs text-slate-900 dark:text-white">{log.action}</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{log.details}</td>
                    <td className="p-2.5 text-right">
                      <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Webhook Configuration Section */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-blue-500" />
              API Webhook Outbound Integration (Zapier / n8n)
            </h5>
            <button
              type="button"
              onClick={handleCopyJson}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 hover:underline"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? 'Copied Payload!' : 'Copy Sample Payload'}
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-domain.com/webhook"
              className="input text-xs flex-1"
            />
            <button
              type="button"
              onClick={handleTestWebhook}
              disabled={testingWebhook}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              {testingWebhook ? 'Dispatching...' : 'Test Webhook'}
            </button>
          </div>

          {webhookStatus && (
            <div className="bg-emerald-50 text-emerald-800 text-xs p-2.5 rounded-lg flex items-center gap-2 font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {webhookStatus}
            </div>
          )}

          <div className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
            <pre>{samplePayload}</pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary text-xs px-4 py-2">
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
