import Modal from './Modal'
import { Download, ExternalLink, FileText, Image as ImageIcon, X } from 'lucide-react'

export default function ReceiptPreviewModal({ isOpen, onClose, receiptUrl, title = 'Attached Bill / Receipt' }) {
  if (!isOpen || !receiptUrl) return null

  const isPdf =
    receiptUrl.toLowerCase().includes('.pdf') ||
    receiptUrl.startsWith('data:application/pdf') ||
    receiptUrl.includes('application/pdf')

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = receiptUrl
    a.download = isPdf ? 'Invoice_Receipt.pdf' : 'Bill_Receipt.png'
    a.target = '_blank'
    a.click()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Preview Container */}
        <div className="bg-gray-100 dark:bg-slate-950 rounded-2xl p-2 sm:p-4 flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-auto border border-gray-200 dark:border-slate-800">
          {isPdf ? (
            <div className="w-full h-[60vh] flex flex-col items-center justify-center gap-3">
              <iframe
                src={receiptUrl}
                title="PDF Document Preview"
                className="w-full h-full rounded-xl border border-gray-200 dark:border-slate-800 hidden sm:block"
              />
              <div className="sm:hidden text-center p-6 space-y-3">
                <div className="inline-flex p-4 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-full">
                  <FileText className="h-8 w-8" />
                </div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white">PDF Bill Document</h4>
                <p className="text-xs text-gray-500">Tap below to view or download the full PDF.</p>
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="h-4 w-4" /> Open Full PDF
                </a>
              </div>
            </div>
          ) : (
            <img
              src={receiptUrl}
              alt="Attached Bill / Invoice"
              className="max-h-[65vh] w-auto object-contain rounded-xl shadow-md"
            />
          )}
        </div>

        {/* Modal Toolbar */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
          <span className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
            {isPdf ? <FileText className="h-4 w-4 text-rose-500" /> : <ImageIcon className="h-4 w-4 text-blue-500" />}
            <span>{isPdf ? 'PDF Invoice / Document' : 'Image Receipt'}</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              <span>Download File</span>
            </button>
            <button
              onClick={onClose}
              className="btn-primary text-xs py-2 px-4"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
