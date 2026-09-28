// SkeletonLoader — reusable shimmer placeholder components
// Usage:
//   <SkeletonCard />            — a full card shimmer
//   <SkeletonRow />             — a table/list row shimmer
//   <SkeletonStats count={4} /> — KPI stat bar shimmer

function Shimmer({ className }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 bg-[length:200%_100%] rounded ${className}`}
      style={{ animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }}
    />
  )
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <Shimmer className="h-4 w-1/3" />
        <Shimmer className="h-8 w-8 rounded-xl" />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-800">
      <Shimmer className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-3 w-3/4" />
        <Shimmer className="h-2.5 w-1/2" />
      </div>
      <Shimmer className="h-5 w-16 rounded-full flex-shrink-0" />
    </div>
  )
}

export function SkeletonStats({ count = 4 }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 space-y-2">
          <Shimmer className="h-3 w-1/2" />
          <Shimmer className="h-7 w-3/4" />
          <Shimmer className="h-2.5 w-2/3" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 6 }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
      {/* header */}
      <div className="flex gap-4 px-4 py-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
        <Shimmer className="h-3 w-20" />
        <Shimmer className="h-3 w-32" />
        <Shimmer className="h-3 w-20 ml-auto" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}

export function SkeletonGoalCard() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-800 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Shimmer className="h-4 w-2/3" />
          <Shimmer className="h-3 w-1/2" />
        </div>
        <Shimmer className="h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <Shimmer className="h-3 w-20" />
          <Shimmer className="h-3 w-16" />
        </div>
        <Shimmer className="h-2 w-full rounded-full" />
      </div>
      <div className="flex gap-2">
        <Shimmer className="h-8 flex-1 rounded-xl" />
        <Shimmer className="h-8 w-8 rounded-xl" />
        <Shimmer className="h-8 w-8 rounded-xl" />
      </div>
    </div>
  )
}

// Default export: generic page-level skeleton
export default function SkeletonPage({ type = 'default' }) {
  if (type === 'table') {
    return (
      <div className="space-y-4">
        <SkeletonStats count={3} />
        <SkeletonTable rows={8} />
      </div>
    )
  }
  if (type === 'goals') {
    return (
      <div className="space-y-4">
        <SkeletonStats count={3} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <SkeletonGoalCard key={i} />)}
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <SkeletonStats count={4} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
      </div>
    </div>
  )
}
