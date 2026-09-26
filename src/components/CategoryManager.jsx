import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useAdmin } from '../context/AdminContext'
import { DEFAULT_CATEGORIES } from '../utils/defaultData'
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, Lock, Unlock,
  Sparkles, Check, Search
} from 'lucide-react'
import LoadingSpinner from './LoadingSpinner'
import ConfirmDialog from './ConfirmDialog'

const CATEGORY_TYPES = ['expense', 'income', 'sip', 'debt']

export default function CategoryManager({ onAdminRequest }) {
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [newCat, setNewCat] = useState({ name: '', type: 'expense' })
  const [editCat, setEditCat] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [expanded, setExpanded] = useState({ expense: true, income: true, sip: true, debt: true })

  const fetchCategories = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('type')
      .order('name')
    setCategories(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchCategories()
  }, [user])

  const flash = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!isAdmin) {
      setError('Admin Mode required to add categories.')
      return
    }
    setError('')
    if (!newCat.name.trim()) {
      setError('Category name is required.')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.from('categories').insert({
        user_id: user.id,
        name: newCat.name.trim(),
        type: newCat.type,
      })
      if (error) {
        if (error.code === '23505') setError('This category already exists.')
        else throw error
      } else {
        setNewCat((prev) => ({ ...prev, name: '' }))
        flash('Category added successfully.')
        await fetchCategories()
      }
    } catch {
      setError('Unable to add category.')
    } finally {
      setSaving(false)
    }
  }

  const handleRename = async (e) => {
    e.preventDefault()
    if (!isAdmin) return
    if (!editCat?.name.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: editCat.name.trim() })
        .eq('id', editCat.id)
      if (error) throw error
      setEditCat(null)
      flash('Category renamed.')
      await fetchCategories()
    } catch {
      setError('Unable to rename category.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!isAdmin) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('categories').delete().eq('id', deleteTarget.id)
      if (error) throw error
      setDeleteTarget(null)
      flash('Category deleted. Existing transactions remain unaffected.')
      await fetchCategories()
    } catch {
      setError('Unable to delete category.')
    } finally {
      setDeleting(false)
    }
  }

  const handleAddComprehensiveDefaults = async () => {
    if (!isAdmin) {
      setError('Admin Mode required.')
      return
    }
    setSaving(true)
    try {
      const rows = []
      CATEGORY_TYPES.forEach((type) => {
        const list = DEFAULT_CATEGORIES[type] || []
        list.forEach((item) => {
          rows.push({
            user_id: user.id,
            name: item.name,
            type: type,
          })
        })
      })

      await supabase.from('categories').upsert(rows, {
        onConflict: 'user_id,name,type',
        ignoreDuplicates: true,
      })
      flash('All comprehensive categories added (Shopping, Travel, Fuel, Food, Bills, OTT, etc.)!')
      await fetchCategories()
    } catch {
      setError('Unable to add default categories.')
    } finally {
      setSaving(false)
    }
  }

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const grouped = CATEGORY_TYPES.reduce((acc, type) => {
    acc[type] = filteredCategories.filter((c) => c.type === type)
    return acc
  }, {})

  if (loading) return <LoadingSpinner text="Loading categories..." />

  return (
    <div className="space-y-6">
      {/* Admin Status Banner */}
      {!isAdmin ? (
        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Lock className="h-4.5 w-4.5 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              <strong>Admin Mode Required:</strong> Only Admin can create, edit, or delete categories.
            </p>
          </div>
          <button
            type="button"
            onClick={onAdminRequest}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 whitespace-nowrap"
          >
            <Unlock className="h-3.5 w-3.5" /> Unlock Admin
          </button>
        </div>
      ) : (
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
          <span className="flex items-center gap-1.5 font-medium">
            <Check className="h-4 w-4 text-emerald-600" /> Admin Mode Active — Category Management Enabled
          </span>
          <button
            type="button"
            onClick={handleAddComprehensiveDefaults}
            disabled={saving}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline flex items-center gap-1"
          >
            <Sparkles className="h-3.5 w-3.5" /> Load All Major App Categories (50+)
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-lg">{success}</div>
      )}

      {/* Add New Category Form (Admin Only) */}
      {isAdmin && (
        <form onSubmit={handleAddCategory} className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h4 className="font-semibold text-xs text-gray-700 uppercase tracking-wide">Add Custom Category</h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={newCat.type}
              onChange={(e) => setNewCat((prev) => ({ ...prev, type: e.target.value }))}
              className="input-field sm:w-36 text-sm"
            >
              {CATEGORY_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="input-field flex-1 text-sm"
              placeholder="e.g. Amazon Shopping, Fuel, Blinkit, House Rent"
              value={newCat.name}
              onChange={(e) => setNewCat((prev) => ({ ...prev, name: e.target.value }))}
              maxLength={60}
            />
            <button type="submit" className="btn-primary flex items-center gap-2 whitespace-nowrap text-sm" disabled={saving}>
              <Plus className="h-4 w-4" /> Add Category
            </button>
          </div>
        </form>
      )}

      {/* Search Filter */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          className="input-field pl-9 text-sm"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Category Groups */}
      <div className="space-y-4">
        {CATEGORY_TYPES.map((type) => {
          const items = grouped[type] || []
          return (
            <div key={type} className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded((prev) => ({ ...prev, [type]: !prev[type] }))}
                className="flex items-center justify-between w-full px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 hover:bg-gray-100/70 transition-colors text-left font-semibold text-sm text-gray-800 capitalize"
              >
                <div className="flex items-center gap-2">
                  {expanded[type] ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                  <span>{type} Categories</span>
                </div>
                <span className="text-xs font-normal text-gray-500 bg-gray-200/70 px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </button>

              {expanded[type] && (
                <div className="p-3 divide-y divide-gray-50 max-h-60 overflow-y-auto">
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-400 py-1.5 px-2">No categories found.</p>
                  ) : (
                    items.map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50/60 rounded-lg transition-colors">
                        {editCat?.id === cat.id && isAdmin ? (
                          <form onSubmit={handleRename} className="flex gap-2 flex-1 items-center">
                            <input
                              autoFocus
                              className="input-field flex-1 py-1 text-sm"
                              value={editCat.name}
                              onChange={(e) => setEditCat((prev) => ({ ...prev, name: e.target.value }))}
                              maxLength={60}
                            />
                            <button type="submit" className="btn-primary text-xs py-1 px-3" disabled={saving}>Save</button>
                            <button type="button" className="btn-secondary text-xs py-1 px-3" onClick={() => setEditCat(null)}>Cancel</button>
                          </form>
                        ) : (
                          <>
                            <span className="text-sm text-gray-700">{cat.name}</span>
                            {isAdmin && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setEditCat(cat)}
                                  className="p-1 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                                  aria-label={`Rename ${cat.name}`}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(cat)}
                                  className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                                  aria-label={`Delete ${cat.name}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Category"
        message={`Delete "${deleteTarget?.name}"? Existing transactions will lose this category reference but will not be deleted.`}
        confirmText="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
