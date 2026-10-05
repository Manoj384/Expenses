import React, { useState } from 'react'
import {
  Maximize2,
  RotateCw,
  Compass,
  Layers,
  Box,
  Eye,
  Activity,
  Sliders,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Ruler,
} from 'lucide-react'

/**
 * 3D & Multi-Angle Interactive Automotive EMC Laboratory Test Bench Schematics.
 * Handcrafted vector graphics with true 3D Isometric, Top-Down Plan, Front Elevation, and Side Profile views.
 */

export function MultiAngleViewerWrapper({ title, children, isoStandard, planView, frontView, sideView }) {
  const [viewAngle, setViewAngle] = useState('3d') // '3d', 'top', 'front', 'side'
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [tiltAngle, setTiltAngle] = useState(0) // -15, 0, +15 deg
  const [showDimensions, setShowDimensions] = useState(true)

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* 3D Perspective Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 block">{title}</span>
            <span className="text-[11px] text-slate-500 font-mono">
              Mode: <strong className="text-blue-700 uppercase">{viewAngle === '3d' ? '3D Isometric Chamber' : `${viewAngle} Elevation`}</strong>
            </span>
          </div>
        </div>

        {/* View Mode Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs font-bold">
          <button
            onClick={() => { setViewAngle('3d'); setTiltAngle(0); }}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              viewAngle === '3d' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            3D Isometric
          </button>
          <button
            onClick={() => setViewAngle('top')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              viewAngle === 'top' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Top Plan
          </button>
          <button
            onClick={() => setViewAngle('front')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              viewAngle === 'front' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Front Elevation
          </button>
          <button
            onClick={() => setViewAngle('side')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              viewAngle === 'side' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Side Profile
          </button>
        </div>
      </div>

      {/* Interactive 3D Controls Bar (Zoom, Tilt & Dimension Overlay) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-1 bg-white/60 rounded-xl border border-slate-200/80 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold text-[11px]">Chamber Zoom:</span>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.8, +(z - 0.1).toFixed(1)))}
            className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded border border-slate-200"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono font-bold text-slate-800 text-[11px] w-12 text-center">
            {(zoomLevel * 100).toFixed(0)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.6, +(z + 0.1).toFixed(1)))}
            className="p-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded border border-slate-200"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setZoomLevel(1.0); setTiltAngle(0); }}
            className="text-[10px] text-slate-500 hover:text-slate-800 px-1.5 py-0.5 rounded border border-slate-200"
          >
            Reset
          </button>
        </div>

        {viewAngle === '3d' && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold text-[11px]">3D Tilt Angle:</span>
            {[-12, 0, 12].map((angle) => (
              <button
                key={angle}
                onClick={() => setTiltAngle(angle)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded border transition ${
                  tiltAngle === angle
                    ? 'bg-blue-600 text-white border-blue-600 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {angle > 0 ? `+${angle}°` : `${angle}°`}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowDimensions(!showDimensions)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border ${
            showDimensions
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          {showDimensions ? 'Dimensions ON' : 'Dimensions OFF'}
        </button>
      </div>

      {/* Render Active View Graphic with Zoom & Isometric Perspective Transform */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner p-2 relative">
        <div
          style={{
            transform: `scale(${zoomLevel}) ${viewAngle === '3d' && tiltAngle !== 0 ? `rotateX(${tiltAngle}deg)` : ''}`,
            transformOrigin: 'center center',
            transition: 'transform 0.25s ease-out',
          }}
        >
          {viewAngle === '3d' && children}
          {viewAngle === 'top' && (planView || children)}
          {viewAngle === 'front' && (frontView || children)}
          {viewAngle === 'side' && (sideView || children)}
        </div>
      </div>

      {/* Interactive Perspective Dimensions Legend */}
      {showDimensions && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-700 shadow-xs">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">X-Y Table Size:</span>
            <span className="font-mono font-bold text-blue-700">≥ 2500 mm × 1000 mm</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-700 shadow-xs">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Z Ground Height:</span>
            <span className="font-mono font-bold text-emerald-700">900 mm ± 100 mm</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-700 shadow-xs">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Harness Elevation:</span>
            <span className="font-mono font-bold text-amber-700">50 mm (εr ≤ 1.4)</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-slate-700 shadow-xs">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Ground Plane Bond:</span>
            <span className="font-mono font-bold text-purple-700">&lt; 2.5 mΩ (RF Strap)</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* =========================================================================
   1. ISO 11452-2: Absorber-Lined Shielded Enclosure (ALSE, 80 MHz – 18 GHz)
   ========================================================================= */
export function Iso11452Part2Diagram() {
  const isometric3d = (
    <svg viewBox="0 0 900 480" className="w-full h-auto bg-slate-50">
      <defs>
        <pattern id="absorberPyramid" width="24" height="24" patternUnits="userSpaceOnUse">
          <polygon points="0,0 12,24 24,0" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.8"/>
        </pattern>
        <linearGradient id="rfCone3d" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0284c7" stopOpacity="0.6"/>
          <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05"/>
        </linearGradient>
      </defs>

      {/* 3D Chamber Walls & Ferrite Tiles */}
      <polygon points="50,40 850,40 760,110 140,110" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.5" />
      <polygon points="50,40 140,110 140,430 50,450" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
      <rect x="50" y="40" width="800" height="20" fill="url(#absorberPyramid)" />

      {/* 3D Metallic Ground Plane Table */}
      <polygon points="340,250 820,220 860,310 380,340" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
      <polygon points="380,340 860,310 860,325 380,355" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
      {/* Table Legs */}
      <line x1="385" y1="355" x2="385" y2="440" stroke="#64748b" strokeWidth="6" strokeLinecap="round" />
      <line x1="855" y1="325" x2="855" y2="410" stroke="#64748b" strokeWidth="6" strokeLinecap="round" />
      <line x1="600" y1="345" x2="600" y2="430" stroke="#64748b" strokeWidth="6" strokeLinecap="round" />

      {/* Ground Plane Bond Strap to Wall (< 2.5 mOhm) */}
      <path d="M 340 270 L 140 310" stroke="#b45309" strokeWidth="5" strokeDasharray="4 2" />
      <text x="210" y="280" fill="#b45309" fontSize="10" fontWeight="bold">Ground Strap (&lt; 2.5 mΩ)</text>

      {/* 50 mm Insulating Stand */}
      <polygon points="410,290 770,265 790,285 430,310" fill="#f59e0b" opacity="0.9" stroke="#d97706" />

      {/* 1000 mm Wire Harness */}
      <path d="M 460 295 L 730 275" stroke="#db2777" strokeWidth="7" strokeLinecap="round" />
      <text x="590" y="268" fill="#be185d" fontSize="11" fontWeight="bold" textAnchor="middle">1000 mm ± 100 mm Wire Harness</text>

      {/* 3D DUT (ECU) at Right */}
      <g transform="translate(730, 200)">
        <polygon points="0,30 50,15 85,30 35,45" fill="#0284c7" stroke="#0369a1" />
        <polygon points="0,30 35,45 35,95 0,80" fill="#0369a1" stroke="#0284c7" />
        <polygon points="35,45 85,30 85,80 35,95" fill="#0ea5e9" stroke="#0369a1" />
        <text x="40" y="70" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">DUT (ECU)</text>
      </g>

      {/* 5 µH LISN / Artificial Network at Left */}
      <g transform="translate(420, 230)">
        <polygon points="0,25 40,10 65,22 25,37" fill="#7c3aed" stroke="#6d28d9" />
        <polygon points="0,25 25,37 25,75 0,63" fill="#6d28d9" stroke="#7c3aed" />
        <polygon points="25,37 65,22 65,60 25,75" fill="#8b5cf6" stroke="#6d28d9" />
        <text x="32" y="55" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">5 µH LISN</text>
      </g>

      {/* 3D Transmit Antenna (Horn / Log-Per) */}
      <g transform="translate(160, 160)">
        <polygon points="60,60 0,20 0,100" fill="#0284c7" stroke="#0369a1" strokeWidth="1.5" />
        <rect x="58" y="55" width="8" height="170" fill="#64748b" rx="2" />
        <text x="30" y="125" fill="#0369a1" fontSize="11" fontWeight="bold" textAnchor="middle">Transmit Antenna</text>
        <text x="30" y="140" fill="#475569" fontSize="10" fontWeight="bold" textAnchor="middle">(80 MHz – 18 GHz / 6 GHz)</text>
      </g>

      {/* 3D RF Field Propagation Cone */}
      <polygon points="220,220 460,160 800,210 780,330 450,320" fill="url(#rfCone3d)" />

      {/* 1.0 m Calibrated Distance */}
      <line x1="220" y1="380" x2="600" y2="380" stroke="#b45309" strokeWidth="2" />
      <circle cx="220" cy="380" r="4" fill="#b45309" />
      <circle cx="600" cy="380" r="4" fill="#b45309" />
      <rect x="360" y="368" width="110" height="24" rx="4" fill="#fef3c7" stroke="#d97706" />
      <text x="415" y="384" fill="#92400e" fontSize="11" fontWeight="bold" textAnchor="middle">1.0 m Distance</text>
    </svg>
  )

  const planView = (
    <div className="space-y-4">
      <svg viewBox="0 0 920 620" className="w-full h-auto bg-white font-sans">
        <defs>
          {/* Absorber Pyramid Pattern */}
          <pattern id="pyramidsH" width="20" height="28" patternUnits="userSpaceOnUse">
            <polygon points="0,0 10,28 20,0" fill="#94a3b8" stroke="#334155" strokeWidth="1" />
          </pattern>
          <pattern id="pyramidsHBottom" width="20" height="28" patternUnits="userSpaceOnUse">
            <polygon points="0,28 10,0 20,28" fill="#94a3b8" stroke="#334155" strokeWidth="1" />
          </pattern>
          <pattern id="pyramidsVLeft" width="28" height="20" patternUnits="userSpaceOnUse">
            <polygon points="0,0 28,10 0,20" fill="#94a3b8" stroke="#334155" strokeWidth="1" />
          </pattern>
          <pattern id="pyramidsVRight" width="28" height="20" patternUnits="userSpaceOnUse">
            <polygon points="28,0 0,10 28,20" fill="#94a3b8" stroke="#334155" strokeWidth="1" />
          </pattern>
          {/* Arrow markers */}
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#0f172a" />
          </marker>
        </defs>

        {/* Top Header */}
        <text x="900" y="24" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="end" fontFamily="monospace">
          Dimensions in millimetres
        </text>

        {/* Outer Shielded Enclosure Chamber Walls (Thick Black Border) */}
        <rect x="180" y="35" width="680" height="520" fill="#f8fafc" stroke="#0f172a" strokeWidth="6" />

        {/* RF Absorbers Lining All 4 Chamber Walls */}
        {/* Top wall absorbers */}
        <rect x="270" y="41" width="500" height="60" fill="#64748b" opacity="0.3" />
        <path d="M 270 41 L 285 101 L 300 41 L 315 101 L 330 41 L 345 101 L 360 41 L 375 101 L 390 41 L 405 101 L 420 41 L 435 101 L 450 41 L 465 101 L 480 41 L 495 101 L 510 41 L 525 101 L 540 41 L 555 101 L 570 41 L 585 101 L 600 41 L 615 101 L 630 41 L 645 101 L 660 41 L 675 101 L 690 41 L 705 101 L 720 41 L 735 101 L 750 41 L 765 101 L 770 41" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />

        {/* Bottom wall absorbers */}
        <path d="M 270 549 L 285 489 L 300 549 L 315 489 L 330 549 L 345 489 L 360 549 L 375 489 L 390 549 L 405 489 L 420 549 L 435 489 L 450 549 L 465 489 L 480 549 L 495 489 L 510 549 L 525 489 L 540 549 L 555 489 L 570 549 L 585 489 L 600 549 L 615 489 L 630 549 L 645 489 L 660 549 L 675 489 L 690 549 L 705 489 L 720 549" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />

        {/* Left wall absorbers */}
        <path d="M 186 60 L 246 75 L 186 90 L 246 105 L 186 120 L 246 135 L 186 150 L 246 165 L 186 180 L 246 195 L 186 210 L 246 225 L 186 240 L 246 255 L 186 270 L 246 285 L 186 300 L 246 315 L 186 330 L 246 345 L 186 360 L 246 375 L 186 390 L 246 405 L 186 420 L 246 435 L 186 450 L 246 465 L 186 480 L 246 495 L 186 510" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />

        {/* Right wall absorbers */}
        <path d="M 854 60 L 794 75 L 854 90 L 794 105 L 854 120 L 794 135 L 854 150 L 794 165 L 854 180 L 794 195 L 854 210 L 794 225 L 854 240 L 794 255 L 854 270 L 794 285 L 854 300 L 794 315 L 854 330 L 794 345 L 854 360 L 794 375 L 854 390 L 794 405 L 854 420 L 794 435 L 854 450 L 794 465 L 854 480" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />

        {/* Chamfered Door Absorbers (Bottom Right Corner) */}
        <g transform="rotate(35, 750, 520)">
          <polygon points="730,510 750,470 770,510 790,470 810,510" fill="#64748b" stroke="#334155" strokeWidth="1.5" />
          <rect x="730" y="510" width="80" height="8" fill="#334155" />
        </g>

        {/* Ground Plane Bonding Straps 14 to Left Wall (≤ 0.9 m spacing) */}
        {[195, 275, 355, 435].map((y, idx) => (
          <g key={idx}>
            <rect x="186" y={y - 4} width="114" height="8" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
            <line x1="186" y1={y} x2="300" y2={y} stroke="#334155" strokeWidth="1.5" />
          </g>
        ))}

        {/* Metallic Ground Reference Plane Bench 6 (2500 mm x 1000 mm) */}
        <rect x="300" y="150" width="210" height="340" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
        <text x="330" y="300" fill="#0f172a" fontSize="18" fontWeight="bold" fontFamily="monospace">
          6
        </text>

        {/* 50 mm Dielectric Insulating Support 7 */}
        <rect x="440" y="235" width="22" height="135" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" />
        <text x="425" y="225" fill="#0f172a" fontSize="16" fontWeight="bold">
          7
        </text>

        {/* 1: DUT (ECU) Top Center */}
        <rect x="385" y="180" width="60" height="50" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
        <circle cx="415" cy="170" r="4" fill="#60a5fa" stroke="#1d4ed8" />
        <circle cx="415" cy="190" r="4" fill="#60a5fa" stroke="#1d4ed8" />
        <line x1="415" y1="170" x2="415" y2="190" stroke="#1d4ed8" strokeWidth="1.5" strokeDasharray="2 2" />
        <text x="415" y="210" fill="#0f172a" fontSize="16" fontWeight="bold" textAnchor="middle">
          1
        </text>

        {/* 2: Wire Harness (Thick Black Line) */}
        <path d="M 445 205 L 452 205 L 452 385 L 420 385" fill="none" stroke="#0f172a" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter" />
        <text x="470" y="200" fill="#0f172a" fontSize="16" fontWeight="bold">
          2
        </text>

        {/* 3: Load Simulator */}
        <rect x="375" y="365" width="50" height="55" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
        <circle cx="400" cy="425" r="4" fill="#60a5fa" stroke="#1d4ed8" />
        <text x="400" y="398" fill="#0f172a" fontSize="16" fontWeight="bold" textAnchor="middle">
          3
        </text>

        {/* 5: Artificial Networks (LISN 5µH) */}
        <rect x="320" y="365" width="20" height="30" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
        <rect x="345" y="365" width="20" height="30" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
        <text x="312" y="375" fill="#0f172a" fontSize="14" fontWeight="bold">5</text>
        <text x="352" y="375" fill="#0f172a" fontSize="14" fontWeight="bold">5</text>

        {/* Wiring from LISN 5 to Load 3 */}
        <line x1="330" y1="365" x2="330" y2="350" stroke="#0f172a" strokeWidth="1" />
        <line x1="355" y1="365" x2="355" y2="350" stroke="#0f172a" strokeWidth="1" />
        <line x1="330" y1="350" x2="390" y2="350" stroke="#0f172a" strokeWidth="1" />
        <line x1="390" y1="350" x2="390" y2="365" stroke="#0f172a" strokeWidth="1" />

        {/* 4: Power Supply */}
        <rect x="330" y="415" width="30" height="25" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
        <text x="336" y="430" fill="#0f172a" fontSize="11" fontWeight="bold">+</text>
        <text x="348" y="430" fill="#0f172a" fontSize="11" fontWeight="bold">-</text>
        <line x1="335" y1="415" x2="335" y2="395" stroke="#0f172a" strokeWidth="1" />
        <line x1="350" y1="415" x2="350" y2="395" stroke="#0f172a" strokeWidth="1" />
        <text x="312" y="430" fill="#0f172a" fontSize="14" fontWeight="bold">4</text>

        {/* 8: Generating Antenna (Biconical / Log-Per Shape) */}
        <g transform="translate(640, 270)">
          {/* Biconical Antenna Element */}
          <polygon points="0,0 20,-35 40,0 20,-35" fill="none" stroke="#0f172a" strokeWidth="2" />
          <polygon points="0,0 20,35 40,0 20,35" fill="none" stroke="#0f172a" strokeWidth="2" />
          <line x1="20" y1="-35" x2="20" y2="35" stroke="#0f172a" strokeWidth="2" />
          <line x1="0" y1="0" x2="40" y2="0" stroke="#0f172a" strokeWidth="2" />
          <circle cx="20" cy="0" r="3" fill="#0f172a" />
        </g>
        <text x="635" y="240" fill="#0f172a" fontSize="16" fontWeight="bold">
          8
        </text>

        {/* 10: RF Coaxial Cable from Antenna to Bulkhead */}
        <path d="M 660 270 L 685 270 L 685 110 L 225 110" fill="none" stroke="#0f172a" strokeWidth="3" />
        <text x="645" y="145" fill="#0f172a" fontSize="16" fontWeight="bold">
          10
        </text>

        {/* 11: Bulkhead Feedthrough Panel */}
        <rect x="205" y="98" width="40" height="24" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
        <text x="225" y="115" fill="#0f172a" fontSize="14" fontWeight="bold" textAnchor="middle">
          11
        </text>

        {/* 12: External Signal Generator & RF Power Amp Rack */}
        <rect x="50" y="90" width="55" height="40" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
        <text x="77" y="115" fill="#0f172a" fontSize="16" fontWeight="bold" textAnchor="middle">
          12
        </text>
        <line x1="105" y1="110" x2="205" y2="110" stroke="#0f172a" strokeWidth="3" />

        {/* 9: Fiber Optic Monitoring Link (Dashed Lines) */}
        <path d="M 400 425 L 400 450 L 105 450" fill="none" stroke="#475569" strokeWidth="1.5" strokeDasharray="4 4" />
        <rect x="50" y="430" width="55" height="40" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
        <text x="77" y="455" fill="#0f172a" fontSize="16" fontWeight="bold" textAnchor="middle">
          9
        </text>

        {/* 13: Absorber callout */}
        <text x="750" y="420" fill="#0f172a" fontSize="16" fontWeight="bold">
          13
        </text>

        {/* 14: Ground strap callout */}
        <line x1="240" y1="275" x2="155" y2="285" stroke="#0f172a" strokeWidth="1.5" />
        <circle cx="240" cy="275" r="2.5" fill="#0f172a" />
        <text x="110" y="295" fill="#0f172a" fontSize="16" fontWeight="bold">
          14
        </text>

        {/* --- DIMENSION LINES & CALLOUTS (Matching Exact ISO 11452-2 Specs) --- */}

        {/* Table to back wall dimension: ≥ 1 000 */}
        <line x1="246" y1="160" x2="385" y2="160" stroke="#0f172a" strokeWidth="1.2" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
        <line x1="385" y1="150" x2="385" y2="175" stroke="#0f172a" strokeWidth="1" />
        <text x="315" y="155" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle">
          ≥ 1 000
        </text>

        {/* Harness to DUT offset: 200 ± 10 */}
        <line x1="415" y1="160" x2="452" y2="160" stroke="#0f172a" strokeWidth="1.2" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
        <line x1="452" y1="155" x2="452" y2="175" stroke="#0f172a" strokeWidth="1" />
        <text x="455" y="155" fill="#0f172a" fontSize="10" fontWeight="bold">
          200 ± 10
        </text>

        {/* Harness Length: 1 500 ± 75 */}
        <line x1="530" y1="205" x2="530" y2="385" stroke="#0f172a" strokeWidth="1.2" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
        <line x1="452" y1="205" x2="540" y2="205" stroke="#0f172a" strokeWidth="1" />
        <line x1="420" y1="385" x2="540" y2="385" stroke="#0f172a" strokeWidth="1" />
        <text x="545" y="300" fill="#0f172a" fontSize="11" fontWeight="bold" transform="rotate(-90, 545, 300)" textAnchor="middle">
          1 500 ± 75
        </text>

        {/* Harness to Front Ground Plane Edge: 100 ± 10 */}
        <line x1="452" y1="425" x2="510" y2="425" stroke="#0f172a" strokeWidth="1.2" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
        <line x1="510" y1="415" x2="510" y2="435" stroke="#0f172a" strokeWidth="1" />
        <text x="525" y="430" fill="#0f172a" fontSize="10" fontWeight="bold">
          100 ± 10
        </text>

        {/* Antenna to Harness Reference Distance: 1 000 ± 10 */}
        <line x1="452" y1="450" x2="660" y2="450" stroke="#0f172a" strokeWidth="1.2" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
        <line x1="660" y1="270" x2="660" y2="460" stroke="#0f172a" strokeWidth="1" />
        <text x="556" y="465" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle">
          1 000 ± 10
        </text>

        {/* Antenna to Right Wall Absorbers Clearance: ≥ 500 */}
        <line x1="660" y1="330" x2="794" y2="330" stroke="#0f172a" strokeWidth="1.2" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
        <line x1="794" y1="315" x2="794" y2="345" stroke="#0f172a" strokeWidth="1" />
        <text x="727" y="325" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle">
          ≥ 500
        </text>
      </svg>

      {/* Official Standard Callout Legend Table (ISO 11452-2:2019 Standard) */}
      <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 text-xs font-sans">
        <div className="font-bold text-slate-900 uppercase tracking-wider mb-2 border-b border-slate-300 pb-1">
          Key (Official ISO 11452-2 Test Setup Architecture):
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-slate-700">
          <div><strong className="text-slate-900 font-mono">1:</strong> DUT (Device Under Test)</div>
          <div><strong className="text-slate-900 font-mono">2:</strong> Test harness (1 500 mm ± 75 mm)</div>
          <div><strong className="text-slate-900 font-mono">3:</strong> Load simulator</div>
          <div><strong className="text-slate-900 font-mono">4:</strong> Power supply (+ / -)</div>
          <div><strong className="text-slate-900 font-mono">5:</strong> Artificial Network (AN / LISN 5 µH)</div>
          <div><strong className="text-slate-900 font-mono">6:</strong> Ground plane (metallic bench)</div>
          <div><strong className="text-slate-900 font-mono">7:</strong> Low relative permittivity support (50 mm)</div>
          <div><strong className="text-slate-900 font-mono">8:</strong> Transmitting antenna (Horn/Log-Per/Bicon)</div>
          <div><strong className="text-slate-900 font-mono">9:</strong> Optical fiber monitoring link</div>
          <div><strong className="text-slate-900 font-mono">10:</strong> High-frequency RF coaxial feed cable</div>
          <div><strong className="text-slate-900 font-mono">11:</strong> Bulkhead RF feedthrough connector</div>
          <div><strong className="text-slate-900 font-mono">12:</strong> RF signal generator &amp; power amplifier rack</div>
          <div><strong className="text-slate-900 font-mono">13:</strong> Absorbers (ferrite tiles + pyramid foam)</div>
          <div><strong className="text-slate-900 font-mono">14:</strong> Ground straps bonded to chamber wall (≤ 0.9 m)</div>
        </div>
      </div>
    </div>
  )

  return (
    <MultiAngleViewerWrapper title="ISO 11452-2 Absorber-Lined Shielded Enclosure (ALSE)" planView={planView}>
      {isometric3d}
    </MultiAngleViewerWrapper>
  )
}


/* =========================================================================
   2. ISO 11452-3: TEM Cell (10 kHz – 200 MHz / 800 MHz)
   ========================================================================= */
export function Iso11452Part3Diagram() {
  return (
    <MultiAngleViewerWrapper title="ISO 11452-3 Transverse Electromagnetic (TEM) Cell">
      <svg viewBox="0 0 900 440" className="w-full h-auto bg-slate-50">
        <rect x="15" y="15" width="870" height="410" rx="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5"/>
        <text x="35" y="42" fill="#0f172a" fontSize="14" fontWeight="bold" fontFamily="monospace">
          3D CUTAWAY & TEM MODE PROPAGATION — ISO 11452-3
        </text>

        {/* 3D TEM Enclosure */}
        <polygon points="90,220 220,100 680,100 810,220 680,340 220,340" fill="#f1f5f9" stroke="#475569" strokeWidth="3" />
        
        {/* Center Septum (Active 50 Ohm line) */}
        <line x1="90" y1="220" x2="810" y2="220" stroke="#d97706" strokeWidth="6" />
        <text x="450" y="210" fill="#92400e" fontSize="12" fontWeight="bold" textAnchor="middle">
          Center Septum (50 Ω Active Transmission Line)
        </text>

        {/* Uniform E-Field Vector Lines */}
        <g stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 3">
          <line x1="300" y1="225" x2="300" y2="335" />
          <line x1="400" y1="225" x2="400" y2="335" />
          <line x1="500" y1="225" x2="500" y2="335" />
          <line x1="600" y1="225" x2="600" y2="335" />
        </g>
        <text x="340" y="280" fill="#0369a1" fontSize="10" fontWeight="bold">E = V / d (Uniform TEM Field ± 1 dB)</text>

        {/* DUT under Septum (h < d/3) */}
        <g transform="translate(420, 275)">
          <rect width="65" height="48" rx="4" fill="#0284c7" stroke="#0369a1" strokeWidth="2" />
          <text x="32" y="26" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">DUT</text>
          <text x="32" y="40" fill="#e0f2fe" fontSize="8" textAnchor="middle">h &lt; d/3 Rule</text>
        </g>

        {/* 50 Ohm Feed & Load */}
        <rect x="50" y="195" width="50" height="50" rx="4" fill="#16a34a" />
        <text x="75" y="225" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">RF In 50Ω</text>

        <rect x="800" y="195" width="50" height="50" rx="4" fill="#dc2626" />
        <text x="825" y="225" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">50Ω Load</text>

        {/* Dimension Constraint Callout */}
        <rect x="230" y="360" width="440" height="45" rx="6" fill="#f8fafc" stroke="#cbd5e1" />
        <text x="450" y="378" fill="#b45309" fontSize="10" fontWeight="bold" textAnchor="middle">
          CRITICAL CONSTRAINT: DUT Height &lt; 1/3 Septum-to-Floor Distance
        </text>
        <text x="450" y="394" fill="#475569" fontSize="9" textAnchor="middle">
          Guarantees cutoff frequency f_cutoff = c / 2w and prevents higher-order TE/TM modes.
        </text>
      </svg>
    </MultiAngleViewerWrapper>
  )
}

/* =========================================================================
   3. ISO 11452-4: Bulk Current Injection (BCI) & Tubular Wave Coupler (TWC)
   ========================================================================= */
export function Iso11452Part4BciDiagram() {
  return (
    <MultiAngleViewerWrapper title="ISO 11452-4 Bulk Current Injection (BCI) & TWC Setup">
      <svg viewBox="0 0 900 460" className="w-full h-auto bg-slate-50">
        <rect x="15" y="15" width="870" height="430" rx="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5"/>
        <text x="35" y="42" fill="#0f172a" fontSize="14" fontWeight="bold" fontFamily="monospace">
          BCI & TWC PROBE PLACEMENT BENCH SETUP — ISO 11452-4:2020
        </text>

        {/* Ground Plane */}
        <rect x="50" y="260" width="800" height="16" fill="#94a3b8" rx="2" />
        <rect x="60" y="250" width="780" height="10" fill="#f59e0b" opacity="0.9" rx="1" />
        <text x="450" y="295" fill="#475569" fontSize="12" fontWeight="600" textAnchor="middle">
          Continuous Metallic Ground Plane (Bonded to Shielded Enclosure Wall)
        </text>

        {/* DUT at Right */}
        <g transform="translate(690, 140)">
          <rect width="130" height="110" rx="8" fill="#ffffff" stroke="#16a34a" strokeWidth="2.5" />
          <rect x="8" y="8" width="114" height="28" rx="4" fill="#16a34a" />
          <text x="65" y="26" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">DUT (ECU)</text>
          <text x="65" y="60" fill="#15803d" fontSize="11" fontWeight="600" textAnchor="middle">12V / 48V / HV Node</text>
          <text x="65" y="82" fill="#475569" fontSize="10" textAnchor="middle">Class I - V Monitoring</text>
        </g>

        {/* LISN / Load Simulator at Left */}
        <g transform="translate(60, 140)">
          <rect width="130" height="110" rx="8" fill="#ffffff" stroke="#7c3aed" strokeWidth="2" />
          <text x="65" y="32" fill="#6d28d9" fontSize="11" fontWeight="bold" textAnchor="middle">Load Simulator /</text>
          <text x="65" y="48" fill="#6d28d9" fontSize="11" fontWeight="bold" textAnchor="middle">Artificial Network</text>
          <text x="65" y="75" fill="#475569" fontSize="10" textAnchor="middle">(50 Ω / 5 µH LISN / HV-AN)</text>
        </g>

        {/* Standard 1000 mm Wire Harness */}
        <path d="M 190 235 L 690 235" stroke="#2563eb" strokeWidth="8" strokeLinecap="round" />
        <text x="440" y="222" fill="#1d4ed8" fontSize="11" fontWeight="bold" textAnchor="middle">
          1000 mm Wire Harness (50 mm Insulation Elevation)
        </text>

        {/* Monitor Probe at 50 mm */}
        <g transform="translate(630, 200)">
          <rect width="26" height="65" rx="4" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
          <text x="13" y="-10" fill="#b45309" fontSize="10" fontWeight="bold" textAnchor="middle">Monitor Probe</text>
          <text x="13" y="4" fill="#92400e" fontSize="9" textAnchor="middle">(d = 50 mm)</text>
          <line x1="13" y1="65" x2="13" y2="105" stroke="#d97706" strokeWidth="2" strokeDasharray="3 2" />
        </g>

        {/* Injection Clamp at 150 / 450 / 750 mm */}
        <g transform="translate(480, 190)">
          <rect width="44" height="80" rx="6" fill="#fee2e2" stroke="#dc2626" strokeWidth="2.5" />
          <circle cx="22" cy="40" r="8" fill="#dc2626" />
          <text x="22" y="-12" fill="#dc2626" fontSize="11" fontWeight="bold" textAnchor="middle">BCI Injection Clamp</text>
          <text x="22" y="2" fill="#991b1b" fontSize="9" textAnchor="middle">150 / 450 / 750 mm</text>
          <line x1="22" y1="80" x2="22" y2="125" stroke="#dc2626" strokeWidth="2.5" />
        </g>

        {/* RF Power Amp & Levelling */}
        <g transform="translate(370, 335)">
          <rect width="220" height="70" rx="8" fill="#f0fdf4" stroke="#16a34a" strokeWidth="2" />
          <text x="110" y="24" fill="#15803d" fontSize="11" fontWeight="bold" textAnchor="middle">RF Power Amp & Coupler</text>
          <text x="110" y="42" fill="#0369a1" fontSize="10" fontWeight="600" textAnchor="middle">100 kHz – 400 MHz (Up to 3 GHz TWC)</text>
          <text x="110" y="58" fill="#047857" fontSize="10" fontWeight="bold" textAnchor="middle">30 mA to 300 mA Levelling</text>
        </g>
      </svg>
    </MultiAngleViewerWrapper>
  )
}

/* =========================================================================
   4. ISO 11452-5: Stripline (10 kHz – 400 MHz)
   ========================================================================= */
export function Iso11452Part5StriplineDiagram() {
  return (
    <MultiAngleViewerWrapper title="ISO 11452-5 Stripline Test Method (10 kHz – 400 MHz)">
      <svg viewBox="0 0 900 440" className="w-full h-auto bg-slate-50">
        <rect x="15" y="15" width="870" height="410" rx="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5"/>
        <text x="35" y="42" fill="#0f172a" fontSize="14" fontWeight="bold" fontFamily="monospace">
          STRIPLINE TRANSMISSION LINE SETUP — ISO 11452-5 (50Ω / 90Ω)
        </text>

        {/* Ground Plane */}
        <rect x="60" y="270" width="780" height="16" fill="#94a3b8" rx="2" />
        <text x="450" y="305" fill="#475569" fontSize="11" fontWeight="bold" textAnchor="middle">
          Continuous Ground Plane (Length ≥ 2500 mm)
        </text>

        {/* Stripline Active Plate Conductor suspended at 150 mm */}
        <rect x="180" y="160" width="540" height="12" fill="#d97706" rx="2" stroke="#b45309" strokeWidth="1.5" />
        <text x="450" y="150" fill="#b45309" fontSize="11" fontWeight="bold" textAnchor="middle">
          Active Conductor Plate (Height h = 150 mm above ground plane)
        </text>

        {/* 50 mm Insulating Stand under Harness */}
        <rect x="220" y="260" width="460" height="10" fill="#f59e0b" opacity="0.9" rx="1" />
        <path d="M 200 252 L 700 252" stroke="#db2777" strokeWidth="6" strokeLinecap="round" />
        <text x="450" y="244" fill="#be185d" fontSize="11" fontWeight="bold" textAnchor="middle">
          Wiring Harness Exposed under Stripline (L ≥ 1000 mm)
        </text>

        {/* RF In & Matched Termination Load */}
        <g transform="translate(80, 150)">
          <rect width="80" height="70" rx="6" fill="#16a34a" />
          <text x="40" y="35" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">RF Generator</text>
          <text x="40" y="50" fill="#dcfce7" fontSize="9" textAnchor="middle">50Ω / 90Ω Feed</text>
        </g>

        <g transform="translate(740, 150)">
          <rect width="80" height="70" rx="6" fill="#dc2626" />
          <text x="40" y="35" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">Matching Load</text>
          <text x="40" y="50" fill="#fee2e2" fontSize="9" textAnchor="middle">50Ω / 90Ω RF Load</text>
        </g>
      </svg>
    </MultiAngleViewerWrapper>
  )
}

/* =========================================================================
   5. ISO 11452-7: Direct Power Injection (DPI, 250 kHz – 1 GHz)
   ========================================================================= */
export function Iso11452Part7DpiDiagram() {
  return (
    <MultiAngleViewerWrapper title="ISO 11452-7 Direct Power Injection (DPI) Pin-Level RF Setup">
      <svg viewBox="0 0 900 440" className="w-full h-auto bg-slate-50">
        <rect x="15" y="15" width="870" height="410" rx="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5"/>
        <text x="35" y="42" fill="#0f172a" fontSize="14" fontWeight="bold" fontFamily="monospace">
          PIN-LEVEL DIRECT POWER INJECTION CIRCUIT — ISO 11452-7 (250 kHz – 1.0 GHz)
        </text>

        {/* RF Chain */}
        <g transform="translate(60, 150)">
          <rect width="140" height="90" rx="8" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
          <text x="70" y="35" fill="#0284c7" fontSize="11" fontWeight="bold" textAnchor="middle">RF Generator & Amp</text>
          <text x="70" y="55" fill="#475569" fontSize="10" textAnchor="middle">Forward Power</text>
          <text x="70" y="70" fill="#16a34a" fontSize="10" fontWeight="bold" textAnchor="middle">Up to 37 dBm (5 W)</text>
        </g>

        {/* 50 Ohm Directional Coupler */}
        <g transform="translate(240, 150)">
          <rect width="120" height="90" rx="8" fill="#ffffff" stroke="#7c3aed" strokeWidth="2" />
          <text x="60" y="35" fill="#6d28d9" fontSize="11" fontWeight="bold" textAnchor="middle">Directional Coupler</text>
          <text x="60" y="55" fill="#475569" fontSize="9" textAnchor="middle">Forward / Reflected</text>
          <text x="60" y="72" fill="#475569" fontSize="9" textAnchor="middle">Power Sensor</text>
        </g>

        {/* 6.8 nF Coupling Capacitor */}
        <g transform="translate(410, 165)">
          <rect width="90" height="60" rx="6" fill="#fef3c7" stroke="#d97706" strokeWidth="2" />
          <text x="45" y="28" fill="#92400e" fontSize="11" fontWeight="bold" textAnchor="middle">6.8 nF</text>
          <text x="45" y="44" fill="#b45309" fontSize="9" textAnchor="middle">DC Block Cap</text>
        </g>

        {/* Broadband Artificial Network (BAN) */}
        <g transform="translate(540, 130)">
          <rect width="130" height="130" rx="8" fill="#f8fafc" stroke="#475569" strokeWidth="2" />
          <text x="65" y="30" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle">Broadband AN (BAN)</text>
          <text x="65" y="50" fill="#475569" fontSize="9" textAnchor="middle">Decoupling Network</text>
          <line x1="65" y1="70" x2="65" y2="120" stroke="#0284c7" strokeWidth="3" />
          <text x="65" y="105" fill="#0284c7" fontSize="9" fontWeight="bold" textAnchor="middle">50Ω Match</text>
        </g>

        {/* DUT IC Pin */}
        <g transform="translate(710, 140)">
          <rect width="130" height="110" rx="8" fill="#ffffff" stroke="#dc2626" strokeWidth="2.5" />
          <rect x="8" y="8" width="114" height="28" rx="4" fill="#dc2626" />
          <text x="65" y="26" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">DUT (Target IC)</text>
          <text x="65" y="60" fill="#991b1b" fontSize="10" fontWeight="bold" textAnchor="middle">Connector Pin Under Test</text>
          <text x="65" y="82" fill="#475569" fontSize="9" textAnchor="middle">Pin-level RF Susceptibility</text>
        </g>

        {/* Connecting RF lines */}
        <line x1="200" y1="195" x2="240" y2="195" stroke="#0284c7" strokeWidth="4" />
        <line x1="360" y1="195" x2="410" y2="195" stroke="#0284c7" strokeWidth="4" />
        <line x1="500" y1="195" x2="540" y2="195" stroke="#0284c7" strokeWidth="4" />
        <line x1="670" y1="195" x2="710" y2="195" stroke="#dc2626" strokeWidth="4" />
      </svg>
    </MultiAngleViewerWrapper>
  )
}

/* =========================================================================
   6. ISO 11452-8: Immunity to Magnetic Fields (DC & 15 Hz – 150 kHz)
   ========================================================================= */
export function Iso11452Part8MagneticDiagram() {
  return (
    <MultiAngleViewerWrapper title="ISO 11452-8 Low Frequency Magnetic Field Setup (15 Hz – 150 kHz)">
      <svg viewBox="0 0 900 440" className="w-full h-auto bg-slate-50">
        <rect x="15" y="15" width="870" height="410" rx="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5"/>
        <text x="35" y="42" fill="#0f172a" fontSize="14" fontWeight="bold" fontFamily="monospace">
          120 mm RADIATING LOOP & HELMHOLTZ COIL SETUP — ISO 11452-8
        </text>

        {/* Method 1: Radiating Loop at Left */}
        <g transform="translate(60, 100)">
          <rect width="360" height="290" rx="8" fill="#f8fafc" stroke="#cbd5e1" />
          <text x="180" y="28" fill="#0f172a" fontSize="12" fontWeight="bold" textAnchor="middle">
            Method A: 120 mm Radiating Loop
          </text>
          
          {/* 120 mm Loop Coil (20 turns AWG12) */}
          <circle cx="120" cy="140" r="55" fill="none" stroke="#d97706" strokeWidth="8" />
          <circle cx="120" cy="140" r="48" fill="none" stroke="#b45309" strokeWidth="2" strokeDasharray="3 2" />
          <text x="120" y="145" fill="#92400e" fontSize="10" fontWeight="bold" textAnchor="middle">120 mm Coil</text>
          <text x="120" y="210" fill="#b45309" fontSize="9" fontWeight="bold" textAnchor="middle">20 Turns AWG12</text>

          {/* DUT at 50 mm */}
          <rect x="230" y="100" width="90" height="80" rx="6" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
          <text x="275" y="135" fill="#0284c7" fontSize="10" fontWeight="bold" textAnchor="middle">DUT (BMS/ECU)</text>
          <text x="275" y="155" fill="#475569" fontSize="8" textAnchor="middle">Surface Scan</text>

          <line x1="175" y1="140" x2="230" y2="140" stroke="#dc2626" strokeWidth="2" />
          <text x="202" y="132" fill="#dc2626" fontSize="9" fontWeight="bold" textAnchor="middle">50 mm</text>
          <text x="180" y="260" fill="#047857" fontSize="11" fontWeight="bold" textAnchor="middle">Levels: 1 A/m to 1000 A/m</text>
        </g>

        {/* Method 2: Helmholtz Coils at Right */}
        <g transform="translate(460, 100)">
          <rect width="380" height="290" rx="8" fill="#f8fafc" stroke="#cbd5e1" />
          <text x="190" y="28" fill="#0f172a" fontSize="12" fontWeight="bold" textAnchor="middle">
            Method B: Helmholtz Coils (Immersion)
          </text>

          {/* Dual Coaxial Helmholtz Coils */}
          <ellipse cx="120" cy="140" rx="20" ry="70" fill="none" stroke="#7c3aed" strokeWidth="6" />
          <ellipse cx="260" cy="140" rx="20" ry="70" fill="none" stroke="#7c3aed" strokeWidth="6" />
          <text x="120" y="230" fill="#6d28d9" fontSize="9" fontWeight="bold" textAnchor="middle">Coil 1</text>
          <text x="260" y="230" fill="#6d28d9" fontSize="9" fontWeight="bold" textAnchor="middle">Coil 2</text>

          {/* DUT in center volume */}
          <rect x="155" y="105" width="70" height="70" rx="6" fill="#ffffff" stroke="#16a34a" strokeWidth="2" />
          <text x="190" y="145" fill="#16a34a" fontSize="10" fontWeight="bold" textAnchor="middle">DUT in Center</text>
          <text x="190" y="265" fill="#6d28d9" fontSize="11" fontWeight="bold" textAnchor="middle">Uniform 3-Axis Field Volume</text>
        </g>
      </svg>
    </MultiAngleViewerWrapper>
  )
}

/* =========================================================================
   7. ISO 11452-9: Portable Transmitters (142 MHz – 6.0 GHz)
   ========================================================================= */
export function Iso11452Part9PortableDiagram() {
  return (
    <MultiAngleViewerWrapper title="ISO 11452-9 Portable Transmitter Close Proximity Setup (142 MHz – 6.0 GHz)">
      <svg viewBox="0 0 900 440" className="w-full h-auto bg-slate-50">
        <rect x="15" y="15" width="870" height="410" rx="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5"/>
        <text x="35" y="42" fill="#0f172a" fontSize="14" fontWeight="bold" fontFamily="monospace">
          CLOSE PROXIMITY GRID SCAN SETUP — ISO 11452-9:2021 (142 MHz – 6.0 GHz)
        </text>

        {/* Ground Plane */}
        <rect x="60" y="280" width="780" height="16" fill="#94a3b8" rx="2" />

        {/* DUT Enclosure with Scan Grid */}
        <g transform="translate(480, 130)">
          <rect width="180" height="140" rx="8" fill="#ffffff" stroke="#0284c7" strokeWidth="2.5" />
          {/* Grid pattern on DUT surface */}
          <line x1="60" y1="0" x2="60" y2="140" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="120" y1="0" x2="120" y2="140" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="0" y1="45" x2="180" y2="45" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="0" y1="90" x2="180" y2="90" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
          <text x="90" y="25" fill="#0284c7" fontSize="11" fontWeight="bold" textAnchor="middle">DUT Front Panel</text>
          <text x="90" y="75" fill="#64748b" fontSize="9" textAnchor="middle">Surface Grid Scan</text>
          <text x="90" y="120" fill="#0369a1" fontSize="9" fontWeight="bold" textAnchor="middle">Connectors & Breakouts</text>
        </g>

        {/* Proximity Antenna (Dipole / Log-Spiral / Horn) at 50 mm / 100 mm */}
        <g transform="translate(320, 160)">
          <polygon points="40,30 0,0 0,60" fill="#dc2626" />
          <line x1="40" y1="30" x2="80" y2="30" stroke="#dc2626" strokeWidth="3" />
          <text x="40" y="-10" fill="#dc2626" fontSize="10" fontWeight="bold" textAnchor="middle">Proximity Antenna</text>
          <text x="40" y="80" fill="#991b1b" fontSize="9" textAnchor="middle">(Tuned Dipole / Horn)</text>
        </g>

        {/* Distance Callout */}
        <line x1="400" y1="190" x2="480" y2="190" stroke="#b45309" strokeWidth="2" />
        <rect x="415" y="175" width="50" height="20" rx="3" fill="#fef3c7" stroke="#d97706" />
        <text x="440" y="189" fill="#92400e" fontSize="9" fontWeight="bold" textAnchor="middle">50 mm</text>

        {/* RF Signal Generation Chain */}
        <g transform="translate(80, 140)">
          <rect width="180" height="90" rx="8" fill="#f0fdf4" stroke="#16a34a" strokeWidth="2" />
          <text x="90" y="30" fill="#15803d" fontSize="11" fontWeight="bold" textAnchor="middle">Calibrated RF Source</text>
          <text x="90" y="50" fill="#475569" fontSize="10" textAnchor="middle">Net Power Characterization</text>
          <text x="90" y="70" fill="#15803d" fontSize="10" fontWeight="bold" textAnchor="middle">Up to 25 Watts Forward Power</text>
        </g>
      </svg>
    </MultiAngleViewerWrapper>
  )
}

/* =========================================================================
   8. ISO 11452-10: Conducted Audio Frequency Disturbances (10 Hz – 250 kHz)
   ========================================================================= */
export function Iso11452Part10AudioRippleDiagram() {
  return (
    <MultiAngleViewerWrapper title="ISO 11452-10 Conducted Audio Frequency Ripple Setup (10 Hz – 250 kHz)">
      <svg viewBox="0 0 900 440" className="w-full h-auto bg-slate-50">
        <rect x="15" y="15" width="870" height="410" rx="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5"/>
        <text x="35" y="42" fill="#0f172a" fontSize="14" fontWeight="bold" fontFamily="monospace">
          SERIES TRANSFORMER RIPPLE INJECTION CIRCUIT — ISO 11452-10:2009
        </text>

        {/* DC Power Supply */}
        <g transform="translate(60, 150)">
          <rect width="130" height="90" rx="8" fill="#fefce8" stroke="#ca8a04" strokeWidth="2" />
          <text x="65" y="35" fill="#854d0e" fontSize="11" fontWeight="bold" textAnchor="middle">Vehicle DC Supply</text>
          <text x="65" y="55" fill="#713f12" fontSize="10" textAnchor="middle">12V / 24V / 48V DC</text>
          <text x="65" y="75" fill="#475569" fontSize="9" textAnchor="middle">Clean Battery Rail</text>
        </g>

        {/* Audio Power Amplifier */}
        <g transform="translate(260, 270)">
          <rect width="160" height="80" rx="8" fill="#eff6ff" stroke="#2563eb" strokeWidth="2" />
          <text x="80" y="30" fill="#1d4ed8" fontSize="11" fontWeight="bold" textAnchor="middle">Audio Power Amplifier</text>
          <text x="80" y="50" fill="#475569" fontSize="10" textAnchor="middle">10 Hz – 250 kHz Sweep</text>
          <text x="80" y="65" fill="#15803d" fontSize="9" fontWeight="bold" textAnchor="middle">Z_source &lt; 0.5Ω / 2Ω</text>
        </g>

        {/* Series Audio Isolation Transformer */}
        <g transform="translate(280, 130)">
          <rect width="120" height="110" rx="8" fill="#ffffff" stroke="#7c3aed" strokeWidth="2.5" />
          <circle cx="45" cy="55" r="22" fill="none" stroke="#7c3aed" strokeWidth="3" />
          <circle cx="75" cy="55" r="22" fill="none" stroke="#7c3aed" strokeWidth="3" />
          <text x="60" y="95" fill="#6d28d9" fontSize="10" fontWeight="bold" textAnchor="middle">Series Transformer</text>
        </g>

        {/* Oscilloscope Monitoring */}
        <g transform="translate(480, 270)">
          <rect width="140" height="80" rx="8" fill="#fdf2f8" stroke="#db2777" strokeWidth="2" />
          <text x="70" y="30" fill="#be185d" fontSize="11" fontWeight="bold" textAnchor="middle">Oscilloscope</text>
          <text x="70" y="50" fill="#475569" fontSize="10" textAnchor="middle">Monitors Upp (0.5-10V)</text>
          <text x="70" y="65" fill="#dc2626" fontSize="9" fontWeight="bold" textAnchor="middle">Monitors Irms ≤ 1.0 A</text>
        </g>

        {/* DUT at Right */}
        <g transform="translate(680, 140)">
          <rect width="140" height="110" rx="8" fill="#ffffff" stroke="#16a34a" strokeWidth="2.5" />
          <rect x="8" y="8" width="124" height="28" rx="4" fill="#16a34a" />
          <text x="70" y="26" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">DUT (ECU)</text>
          <text x="70" y="60" fill="#15803d" fontSize="10" fontWeight="bold" textAnchor="middle">Regulators & Audio</text>
          <text x="70" y="82" fill="#475569" fontSize="9" textAnchor="middle">Superimposed Ripple</text>
        </g>

        {/* Circuit Interconnects */}
        <path d="M 190 180 L 280 180" stroke="#dc2626" strokeWidth="4" />
        <path d="M 400 180 L 680 180" stroke="#dc2626" strokeWidth="4" />
        <line x1="340" y1="240" x2="340" y2="270" stroke="#2563eb" strokeWidth="3" />
        <line x1="550" y1="180" x2="550" y2="270" stroke="#db2777" strokeWidth="2" strokeDasharray="3 2" />
      </svg>
    </MultiAngleViewerWrapper>
  )
}

/* =========================================================================
   9. ISO 11452-11: Reverberation Chamber (RVC, LUF to 18 GHz)
   ========================================================================= */
export function Iso11452Part11RvcDiagram() {
  return (
    <MultiAngleViewerWrapper title="ISO 11452-11 Reverberation Chamber (RVC) Mode-Stirred Setup">
      <svg viewBox="0 0 900 440" className="w-full h-auto bg-slate-50">
        <rect x="15" y="15" width="870" height="410" rx="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5"/>
        <text x="35" y="42" fill="#0f172a" fontSize="14" fontWeight="bold" fontFamily="monospace">
          3D CAVITY & MECHANICAL ROTATING TUNER — ISO 11452-11 (LUF to 18 GHz)
        </text>

        {/* 3D Shielded Metallic Cavity */}
        <rect x="80" y="80" width="740" height="300" rx="8" fill="#f8fafc" stroke="#475569" strokeWidth="3" />
        <text x="450" y="105" fill="#475569" fontSize="11" fontWeight="bold" textAnchor="middle">
          High-Q Shielded Reverberation Cavity (All Angles of Arrival Tested Simultaneously)
        </text>

        {/* Rotating Mechanical Tuner / Stirrer */}
        <g transform="translate(180, 170)">
          <line x1="0" y1="0" x2="0" y2="140" stroke="#7c3aed" strokeWidth="6" />
          <polygon points="-30,30 30,30 50,70 -50,70" fill="#8b5cf6" opacity="0.85" />
          <polygon points="-40,80 40,80 60,120 -60,120" fill="#a78bfa" opacity="0.85" />
          <path d="M -25 15 A 25 25 0 0 1 25 15" fill="none" stroke="#7c3aed" strokeWidth="3" markerEnd="url(#arrow)" />
          <text x="0" y="160" fill="#6d28d9" fontSize="10" fontWeight="bold" textAnchor="middle">Rotating Tuner</text>
          <text x="0" y="175" fill="#7c3aed" fontSize="9" textAnchor="middle">(50-200 Steps/Rev)</text>
        </g>

        {/* Transmit Horn Antenna */}
        <g transform="translate(360, 150)">
          <polygon points="50,40 0,10 0,70" fill="#0284c7" />
          <text x="25" y="90" fill="#0369a1" fontSize="10" fontWeight="bold" textAnchor="middle">RF Tx Horn</text>
        </g>

        {/* DUT in Working Volume */}
        <g transform="translate(600, 160)">
          <rect width="140" height="110" rx="8" fill="#ffffff" stroke="#16a34a" strokeWidth="2.5" />
          <rect x="8" y="8" width="124" height="26" rx="4" fill="#16a34a" />
          <text x="70" y="25" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">DUT in Working Volume</text>
          <text x="70" y="55" fill="#15803d" fontSize="10" fontWeight="bold" textAnchor="middle">Isotropic Random E-Field</text>
          <text x="70" y="75" fill="#dc2626" fontSize="11" fontWeight="bold" textAnchor="middle">Up to 600–1000 V/m</text>
          <text x="70" y="95" fill="#475569" fontSize="9" textAnchor="middle">Radar Pulse Immunity</text>
        </g>
      </svg>
    </MultiAngleViewerWrapper>
  )
}

/* =========================================================================
   10. CISPR 25: Conducted Emissions (Voltage Method 150 kHz – 108 MHz)
   ========================================================================= */
export function Cispr25ConductedDiagram() {
  return (
    <MultiAngleViewerWrapper title="CISPR 25 Conducted Emissions — Voltage Method (5µH LISN)">
      <svg viewBox="0 0 900 460" className="w-full h-auto bg-slate-50">
        <rect x="12" y="12" width="876" height="436" rx="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5"/>
        <text x="35" y="42" fill="#be185d" fontSize="14" fontWeight="bold" fontFamily="monospace">
          CISPR 25 CONDUCTED EMISSIONS SETUP — VOLTAGE METHOD (150 kHz – 108 MHz)
        </text>

        {/* Ground Plane */}
        <rect x="50" y="250" width="800" height="16" fill="#94a3b8" rx="2" />
        <text x="450" y="285" fill="#475569" fontSize="12" fontWeight="600" textAnchor="middle">
          Reference Ground Plane (Bonded to Shielded Room Wall &lt; 2.5 mΩ)
        </text>

        {/* Power Supply */}
        <g transform="translate(60, 120)">
          <rect width="110" height="95" rx="6" fill="#fefce8" stroke="#ca8a04" strokeWidth="2" />
          <text x="55" y="35" fill="#854d0e" fontSize="11" fontWeight="bold" textAnchor="middle">Automotive</text>
          <text x="55" y="52" fill="#854d0e" fontSize="11" fontWeight="bold" textAnchor="middle">Power Supply</text>
          <text x="55" y="74" fill="#713f12" fontSize="9" textAnchor="middle">(12V/24V/48V/HV)</text>
        </g>

        {/* Dual 5µH LISN */}
        <g transform="translate(240, 100)">
          <rect width="150" height="135" rx="8" fill="#eef2ff" stroke="#4f46e5" strokeWidth="2" />
          <text x="75" y="30" fill="#3730a3" fontSize="11" fontWeight="bold" textAnchor="middle">Dual 5 µH LISN (AN)</text>
          
          <rect x="15" y="45" width="120" height="28" rx="4" fill="#ffffff" stroke="#6366f1" strokeWidth="1.5" />
          <text x="75" y="63" fill="#312e81" fontSize="10" fontWeight="bold" textAnchor="middle">AN (+ Line) / 50 Ω</text>

          <rect x="15" y="85" width="120" height="28" rx="4" fill="#ffffff" stroke="#6366f1" strokeWidth="1.5" />
          <text x="75" y="103" fill="#312e81" fontSize="10" fontWeight="bold" textAnchor="middle">AN (- Return) / 50 Ω</text>
        </g>

        {/* 50 Ohm RF Coax to EMI Receiver with Detectors */}
        <g transform="translate(245, 320)">
          <rect width="180" height="90" rx="8" fill="#fdf2f8" stroke="#db2777" strokeWidth="2" />
          <text x="90" y="26" fill="#be185d" fontSize="11" fontWeight="bold" textAnchor="middle">CISPR 16-1-1 EMI Receiver</text>
          <text x="90" y="46" fill="#475569" fontSize="10" textAnchor="middle">Detectors: Peak, QP, Average</text>
          <text x="90" y="68" fill="#15803d" fontSize="11" fontWeight="bold" textAnchor="middle">Class 1 to Class 5 Limits (dBµV)</text>
          <line x1="90" y1="0" x2="90" y2="-85" stroke="#db2777" strokeWidth="3" strokeDasharray="4 2" />
        </g>

        {/* Wire Harness */}
        <path d="M 390 150 L 650 150" stroke="#dc2626" strokeWidth="5" />
        <path d="M 390 180 L 650 180" stroke="#2563eb" strokeWidth="5" />
        <text x="520" y="135" fill="#dc2626" fontSize="11" fontWeight="bold" textAnchor="middle">Harness L = 200 mm</text>
        <text x="520" y="205" fill="#2563eb" fontSize="10" textAnchor="middle">50 mm Elevation Above Plane</text>

        {/* DUT (ECU) */}
        <g transform="translate(650, 110)">
          <rect width="150" height="120" rx="8" fill="#ffffff" stroke="#0891b2" strokeWidth="2.5" />
          <text x="75" y="32" fill="#0e7490" fontSize="12" fontWeight="bold" textAnchor="middle">DUT (ECU Node)</text>
          <text x="75" y="55" fill="#475569" fontSize="10" textAnchor="middle">Microcontroller / Inverter</text>
          <rect x="25" y="70" width="100" height="30" rx="4" fill="#0891b2" />
          <text x="75" y="90" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">Active Load / CAN</text>
        </g>
      </svg>
    </MultiAngleViewerWrapper>
  )
}

/* =========================================================================
   11. CISPR 25: Radiated Emissions ALSE (150 kHz – 6.0 GHz)
   ========================================================================= */
export function Cispr25RadiatedDiagram() {
  return (
    <MultiAngleViewerWrapper title="CISPR 25 Radiated Emissions — ALSE Method (1.0m Chamber)">
      <svg viewBox="0 0 900 480" className="w-full h-auto bg-slate-50">
        <rect x="12" y="12" width="876" height="456" rx="12" fill="#ffffff" stroke="#64748b" strokeWidth="2"/>
        <text x="40" y="40" fill="#be123c" fontSize="13" fontWeight="bold" fontFamily="monospace">
          CISPR 25 RADIATED EMISSIONS SETUP — ALSE 1.0 m (150 kHz – 6.0 GHz)
        </text>

        {/* Ground Plane Table */}
        <rect x="360" y="260" width="490" height="16" fill="#94a3b8" rx="2" />
        <rect x="390" y="276" width="14" height="145" fill="#64748b" />
        <rect x="800" y="276" width="14" height="145" fill="#64748b" />
        <text x="600" y="298" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle">
          Ground Plane Table (Height = 900 mm ± 100 mm)
        </text>

        {/* Long Harness (1700 mm) */}
        <rect x="380" y="248" width="450" height="10" fill="#f59e0b" opacity="0.9" rx="1" />
        <path d="M 400 242 L 770 242" stroke="#e11d48" strokeWidth="6" strokeLinecap="round" />
        <text x="585" y="232" fill="#be123c" fontSize="11" fontWeight="bold" textAnchor="middle">
          Harness Length = 1700 mm to 2000 mm
        </text>

        {/* LISN & DUT */}
        <g transform="translate(380, 170)">
          <rect width="65" height="65" rx="6" fill="#f8fafc" stroke="#4f46e5" strokeWidth="2" />
          <text x="32" y="28" fill="#3730a3" fontSize="9" fontWeight="bold" textAnchor="middle">5µH LISN</text>
          <text x="32" y="44" fill="#64748b" fontSize="8" textAnchor="middle">(Power Supply)</text>
        </g>
        <g transform="translate(750, 150)">
          <rect width="90" height="85" rx="8" fill="#ffffff" stroke="#0891b2" strokeWidth="2.5" />
          <text x="45" y="30" fill="#0e7490" fontSize="11" fontWeight="bold" textAnchor="middle">DUT / ECU</text>
          <text x="45" y="50" fill="#475569" fontSize="9" textAnchor="middle">Emission</text>
          <text x="45" y="66" fill="#475569" fontSize="9" textAnchor="middle">Source</text>
        </g>

        {/* Receiver Antennas */}
        <g transform="translate(130, 130)">
          <polygon points="60,60 0,20 0,100" fill="#0284c7" />
          <rect x="58" y="55" width="8" height="155" fill="#64748b" />
          <text x="30" y="125" fill="#0369a1" fontSize="10" fontWeight="bold" textAnchor="middle">Measuring Antenna</text>
          <text x="30" y="140" fill="#475569" fontSize="9" textAnchor="middle">(1.0 m Distance)</text>
        </g>

        {/* 1.0 m Distance Callout */}
        <line x1="190" y1="340" x2="480" y2="340" stroke="#b45309" strokeWidth="2" />
        <circle cx="190" cy="340" r="4" fill="#b45309" />
        <circle cx="480" cy="340" r="4" fill="#b45309" />
        <rect x="290" y="328" width="100" height="24" rx="4" fill="#fef3c7" stroke="#d97706" />
        <text x="340" y="344" fill="#92400e" fontSize="11" fontWeight="bold" textAnchor="middle">1.0 m ± 10 mm</text>
      </svg>
    </MultiAngleViewerWrapper>
  )
}

/* =========================================================================
   12. CISPR 25: EV / High Voltage (HV) Shielded Powertrain Setup
   ========================================================================= */
export function Cispr25HvEvDiagram() {
  return (
    <MultiAngleViewerWrapper title="CISPR 25 Annex I High Voltage (HV) EV / HEV Shielded Test Setup">
      <svg viewBox="0 0 900 440" className="w-full h-auto bg-slate-50">
        <rect x="15" y="15" width="870" height="410" rx="10" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5"/>
        <text x="35" y="42" fill="#0f172a" fontSize="14" fontWeight="bold" fontFamily="monospace">
          EV HIGH VOLTAGE (HV) DUAL-LISN & SHIELDED HARNESS SETUP — CISPR 25 ANNEX I
        </text>

        {/* Ground Plane */}
        <rect x="50" y="260" width="800" height="16" fill="#94a3b8" rx="2" />

        {/* High Voltage Battery / DC Source */}
        <g transform="translate(60, 130)">
          <rect width="130" height="100" rx="8" fill="#fef2f2" stroke="#dc2626" strokeWidth="2" />
          <text x="65" y="35" fill="#991b1b" fontSize="11" fontWeight="bold" textAnchor="middle">HV Battery / Source</text>
          <text x="65" y="55" fill="#dc2626" fontSize="11" fontWeight="bold" textAnchor="middle">400V / 800V DC</text>
          <text x="65" y="75" fill="#475569" fontSize="9" textAnchor="middle">High Voltage Traction</text>
        </g>

        {/* Dual HV-LISN (HV-AN) */}
        <g transform="translate(250, 110)">
          <rect width="150" height="135" rx="8" fill="#eff6ff" stroke="#2563eb" strokeWidth="2.5" />
          <text x="75" y="28" fill="#1d4ed8" fontSize="11" fontWeight="bold" textAnchor="middle">Dual HV-LISN (HV-AN)</text>
          <rect x="15" y="45" width="120" height="28" rx="4" fill="#ffffff" stroke="#3b82f6" />
          <text x="75" y="63" fill="#1e40af" fontSize="9" fontWeight="bold" textAnchor="middle">HV+ AN (50Ω / 5µH)</text>
          <rect x="15" y="85" width="120" height="28" rx="4" fill="#ffffff" stroke="#3b82f6" />
          <text x="75" y="103" fill="#1e40af" fontSize="9" fontWeight="bold" textAnchor="middle">HV- AN (50Ω / 5µH)</text>
        </g>

        {/* 360 Degree Shielded High Voltage Harness */}
        <path d="M 400 160 L 670 160" stroke="#f97316" strokeWidth="10" strokeLinecap="round" />
        <text x="535" y="145" fill="#ea580c" fontSize="11" fontWeight="bold" textAnchor="middle">
          360° Shielded HV Harness (L = 1000 mm)
        </text>
        <text x="535" y="185" fill="#c2410c" fontSize="9" fontWeight="bold" textAnchor="middle">
          Circumferential Shield Bond to Ground
        </text>

        {/* EV Inverter / Traction Motor Controller */}
        <g transform="translate(670, 110)">
          <rect width="160" height="130" rx="8" fill="#ffffff" stroke="#16a34a" strokeWidth="2.5" />
          <rect x="8" y="8" width="144" height="28" rx="4" fill="#16a34a" />
          <text x="80" y="26" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">EV Traction Inverter</text>
          <text x="80" y="58" fill="#15803d" fontSize="10" fontWeight="bold" textAnchor="middle">SiC / IGBT Switch Stage</text>
          <text x="80" y="78" fill="#475569" fontSize="9" textAnchor="middle">Fast dV/dt & dI/dt Noise</text>
          <rect x="25" y="90" width="110" height="22" rx="4" fill="#dcfce7" stroke="#16a34a" />
          <text x="80" y="105" fill="#14532d" fontSize="8" fontWeight="bold" textAnchor="middle">LV Auxiliary Interface</text>
        </g>
      </svg>
    </MultiAngleViewerWrapper>
  )
}
