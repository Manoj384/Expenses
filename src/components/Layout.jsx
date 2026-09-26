import { useState } from 'react'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import AdminLockModal from './AdminLockModal'
import { useAdmin } from '../context/AdminContext'
import { ShieldCheck, Shield, Unlock, Lock } from 'lucide-react'

export default function Layout({ children, title }) {
  const { isAdmin } = useAdmin()
  const [showAdminModal, setShowAdminModal] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3.5 sticky top-0 z-30 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          </div>

          {/* Header Admin status badge */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAdminModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                isAdmin
                  ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-sm'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
              title={isAdmin ? 'Admin Mode active - Click to lock' : 'Click to enter Admin PIN'}
            >
              {isAdmin ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                  <span>Admin Mode</span>
                </>
              ) : (
                <>
                  <Shield className="h-3.5 w-3.5 text-gray-400" />
                  <span>Admin Mode (Off)</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 px-4 md:px-6 py-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>

      <BottomNav />

      <AdminLockModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
      />
    </div>
  )
}
