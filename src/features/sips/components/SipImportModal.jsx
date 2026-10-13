import Modal from '../../../components/Modal'
import { formatCurrency } from '../../../utils/formatCurrency'
import { FileSpreadsheet, Upload, CheckCircle2 } from 'lucide-react'

export default function SipImportModal({
  isOpen,
  onClose,
  handleFileUpload,
  parsedPreview,
  handleExecuteImport,
  importing,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Groww / Broker Excel Report (.xlsx / .csv)"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
          <p className="font-semibold mb-1 flex items-center gap-1.5">
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            Upload Downloaded Groww Excel Report:
          </p>
          <p className="text-emerald-800 leading-relaxed">
            Select your downloaded <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono font-bold">Mutual_Funds_*.xlsx</code> or CSV file. All your schemes, folios, units, and invested amounts will be automatically parsed and synced into both your <strong>Portfolio</strong> and <strong>SIP Tracking Cards</strong>!
          </p>
        </div>

        {/* File input drop zone */}
        <div className="p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 text-center hover:bg-gray-100/80 transition-colors">
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-gray-700 mb-1">Click to select Groww .xlsx or .csv file</p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            onChange={handleFileUpload}
            className="block w-full text-xs text-gray-500 mx-auto file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
          />
        </div>

        {/* Parsed Preview */}
        {parsedPreview.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-800 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Found {parsedPreview.length} Folios in Report:
            </p>
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl p-2 bg-white">
              {parsedPreview.map((item, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-gray-800">{item.scheme_name}</p>
                    <p className="text-[10px] text-gray-400">{item.category} • Folio: {item.folio_number || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(item.invested_amount)}</p>
                    <p className="text-[10px] text-gray-400">{item.units.toFixed(3)} units</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleExecuteImport}
            disabled={importing || parsedPreview.length === 0}
            className="btn-primary flex-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-xs py-2.5"
          >
            {importing ? 'Importing & Syncing SIPs...' : `⚡ Sync ${parsedPreview.length} Folios to Portfolio & SIPs`}
          </button>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}
