import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Maximize2,
  Minimize2,
  BookOpen,
  Activity,
  Layers,
  Cpu,
  Shield,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Info,
  Radio,
  Zap,
  Gauge,
  HelpCircle,
} from 'lucide-react'
import {
  Iso11452Part2Diagram,
  Iso11452Part3Diagram,
  Iso11452Part4BciDiagram,
  Iso11452Part5StriplineDiagram,
  Iso11452Part7DpiDiagram,
  Iso11452Part8MagneticDiagram,
  Iso11452Part9PortableDiagram,
  Iso11452Part10AudioRippleDiagram,
  Iso11452Part11RvcDiagram,
  Cispr25ConductedDiagram,
  Cispr25RadiatedDiagram,
  Cispr25HvEvDiagram,
} from './EmcDiagrams'
import {
  Cispr25Exact2021Chart,
  Iso11452BciChart,
  Iso11452AlseChart,
  Iso11452MagneticChart,
  Iso11452AudioRippleChart,
} from './EmcLimitCharts'

export default function EmcDetailModal({ standard, isOpen, onClose, onViewPdf }) {
  const [activeTab, setActiveTab] = useState('setup')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const modalRef = useRef(null)

  const isImmunity = standard?.id?.includes('iso') || standard?.type?.toLowerCase().includes('immunity')

  // Reset tab whenever standard changes
  useEffect(() => {
    setActiveTab('setup')
  }, [standard?.id])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false)
        } else {
          onClose()
        }
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, isFullscreen, onClose])

  if (!isOpen || !standard) return null

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handlePrint = () => {
    window.print()
  }

  // 100% Unique Dedicated Diagram per Standard ID
  const renderDiagram = () => {
    switch (standard.id) {
      case 'iso-11452-2':
        return <Iso11452Part2Diagram />
      case 'iso-11452-3':
        return <Iso11452Part3Diagram />
      case 'iso-11452-4':
        return <Iso11452Part4BciDiagram />
      case 'iso-11452-5':
      case 'iso-11452-6':
        return <Iso11452Part5StriplineDiagram />
      case 'iso-11452-7':
        return <Iso11452Part7DpiDiagram />
      case 'iso-11452-8':
        return <Iso11452Part8MagneticDiagram />
      case 'iso-11452-9':
        return <Iso11452Part9PortableDiagram />
      case 'iso-11452-10':
        return <Iso11452Part10AudioRippleDiagram />
      case 'iso-11452-11':
        return <Iso11452Part11RvcDiagram />
      case 'cispr-25-ce':
      case 'cispr-25-current':
        return <Cispr25ConductedDiagram />
      case 'cispr-25-re':
        return <Cispr25RadiatedDiagram />
      case 'cispr-25-hv':
        return <Cispr25HvEvDiagram />
      default:
        return <Iso11452Part2Diagram />
    }
  }

  // Render chart tailored to standard
  const renderChart = () => {
    if (standard.id === 'cispr-25-ce') return <Cispr25Exact2021Chart initialTable="6" />
    if (standard.id === 'cispr-25-current') return <Cispr25Exact2021Chart initialTable="7" />
    if (standard.id === 'cispr-25-re') return <Cispr25Exact2021Chart initialTable="8" />
    if (standard.id === 'cispr-25-hv') return <Cispr25Exact2021Chart initialTable="H.1" />
    if (standard.id === 'iso-11452-4') return <Iso11452BciChart />
    if (standard.id === 'iso-11452-2' || standard.id === 'iso-11452-3' || standard.id === 'iso-11452-5' || standard.id === 'iso-11452-6' || standard.id === 'iso-11452-9' || standard.id === 'iso-11452-11') {
      return <Iso11452AlseChart />
    }
    if (standard.id === 'iso-11452-8') return <Iso11452MagneticChart />
    if (standard.id === 'iso-11452-10') return <Iso11452AudioRippleChart />
    return <Cispr25Exact2021Chart initialTable="8" />
  }

  // Dynamic Tabs strictly separated for Immunity vs Emissions
  const tabs = isImmunity
    ? [
        { id: 'setup', label: '🔬 3D Test Setup & Physics', icon: Activity },
        { id: 'levels', label: '⚡ Test Severity Levels & Modulations', icon: Zap },
        { id: 'status', label: '🎯 ISO Functional Status Matrix (A/B/C/D)', icon: Sliders },
        { id: 'procedure', label: '⚙️ Calibration & Sweep Protocol', icon: CheckCircle2 },
        { id: 'mitigation', label: '🛡️ Immunity Hardening & PCB Solutions', icon: Shield },
        { id: 'oem', label: '🌐 OEM Immunity Equivalents', icon: ExternalLink },
      ]
    : [
        { id: 'setup', label: '🔬 3D Test Setup & LISN Geometry', icon: Activity },
        { id: 'curves', label: '📈 CISPR 25:2021 Exact Limit Curves', icon: Layers },
        { id: 'bands', label: '📻 Protected Radio Service Bands', icon: Sliders },
        { id: 'procedure', label: '⚙️ Receiver Bandwidths & Scan Protocol', icon: CheckCircle2 },
        { id: 'mitigation', label: '🛡️ Noise Suppression & Filter Design', icon: Shield },
        { id: 'oem', label: '🌐 OEM Emission Limits Cross-Ref', icon: ExternalLink },
      ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div
        ref={modalRef}
        className={`bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
          isFullscreen
            ? 'fixed inset-0 w-screen h-screen rounded-none z-50'
            : 'w-full max-w-6xl max-h-[92vh]'
        }`}
      >
        {/* Modal Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-xl border ${isImmunity ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-pink-50 text-pink-600 border-pink-200'}`}>
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
                  isImmunity ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-pink-100 text-pink-700 border-pink-300'
                }`}>
                  {standard.part || standard.category || 'EMC Standard'}
                </span>
                <span className="text-xs text-slate-500 font-mono font-semibold">{standard.freqRange}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-200 text-slate-700">
                  {isImmunity ? 'RF Immunity Standard' : 'RF Emissions Standard'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 truncate">
                {standard.title}
              </h2>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {onViewPdf && standard?.id && (
              <button
                onClick={() => {
                  const isoMap = {
                    'iso-11452-1': '/pdfs/iso/ISO-11452-1-2015.pdf',
                    'iso-11452-2': '/pdfs/iso/ISO-11452-2-2019.pdf',
                    'iso-11452-3': '/pdfs/iso/ISO-FDIS-11452-3.pdf',
                    'iso-11452-4': '/pdfs/iso/ISO-11452-4-2020.pdf',
                    'iso-11452-5': '/pdfs/iso/ISO-11452-5-2002.pdf',
                    'iso-11452-6': '/pdfs/iso/ISO-11452-6-1997.pdf',
                    'iso-11452-7': '/pdfs/iso/ISO-11452-7-2003.pdf',
                    'iso-11452-8': '/pdfs/iso/ISO-11452-8-2015.pdf',
                    'iso-11452-9': '/pdfs/iso/ISO-11452-9-2021.pdf',
                    'iso-11452-10': '/pdfs/iso/ISO-11452-10-2009.pdf',
                    'iso-11452-11': '/pdfs/iso/ISO-11452-11-2010.pdf',
                  }
                  const pdfUrl = isoMap[standard.id] || '/pdfs/iso/ISO-11452-2-2019.pdf'
                  onViewPdf(pdfUrl, `${standard.part || standard.title}`)
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer"
                title="Open Official Standard PDF Document"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open PDF</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              title="Print Engineering Datasheet"
              className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen Mode'}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition shadow-sm"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-lg border border-slate-300 transition shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100/80 border-b border-slate-200 px-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? isImmunity
                      ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                      : 'border-pink-600 text-pink-700 bg-white shadow-sm'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-700 bg-white">
          
          {/* TAB: SETUP & 3D SCHEMATICS */}
          {activeTab === 'setup' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Executive Summary Card */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-slate-900 font-bold text-sm">Authoritative Scope & Technical Overview</h4>
                  <p className="text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed">
                    {standard.summary || standard.description}
                  </p>
                </div>
              </div>

              {/* 3D & Multi-Angle Visualizer */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-900 font-bold text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    Interactive 3D Laboratory Bench & Multi-Angle Layout
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">Use buttons above graphic to rotate view angle</span>
                </div>
                {renderDiagram()}
              </div>

              {/* Physical Geometry & Rigging Specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="text-slate-900 font-bold text-sm flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-600" />
                    Normative Geometry & Setup Guidelines
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {standard.setupDetails?.map((detail, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0"></span>
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="text-slate-900 font-bold text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-600" />
                    Key Parameters & Official Edition
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {standard.keyParameters?.map((param, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">{param.label}:</span>
                        <span className="text-slate-900 font-bold font-mono text-[11px] truncate block">{param.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: IMMUNITY TEST SEVERITY LEVELS (ISO 11452 ONLY - STRICTLY NO DETECTORS) */}
          {isImmunity && activeTab === 'levels' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-slate-900 font-bold text-base flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  RF Immunity Injected Test Severity Levels & Modulation Profiles
                </h3>
                <p className="text-xs text-slate-500">
                  Target stress levels injected by RF power amplifiers into the DUT and harness. Note: In immunity testing, no receiver detectors are used.
                </p>
              </div>

              {renderChart()}

              {/* Modulation Guide */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                <h4 className="text-slate-900 font-bold text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  Standardized RF Modulation Types (ISO 11452-1)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-blue-700 font-bold block mb-1">Continuous Wave (CW):</span>
                    <span className="text-slate-600">Unmodulated pure sinusoidal carrier simulating baseband continuous RF carrier exposure.</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-emerald-700 font-bold block mb-1">Amplitude Modulation (AM):</span>
                    <span className="text-slate-600">1 kHz sinusoidal modulation with 80% modulation depth. Stresses analog and sensor demodulation circuits.</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-purple-700 font-bold block mb-1">Pulse Modulation (PM):</span>
                    <span className="text-slate-600">217 Hz pulse with 12.5% duty cycle (GSM frame rate) or 1 kHz 50% duty. Simulates TDMA/5G pulse trains.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ISO FUNCTIONAL STATUS CRITERIA (ISO 11452 ONLY) */}
          {isImmunity && activeTab === 'status' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-slate-900 font-bold text-base">ISO 11452-1 Normative Annex A: Functional Status Classification</h3>
                <p className="text-xs text-slate-500">Standardized criteria for defining pass/fail performance of automotive electronics during and after RF exposure.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-700 bg-slate-100/80 font-bold uppercase">
                      <th className="p-3.5">Status Class</th>
                      <th className="p-3.5">Behavior During RF Exposure</th>
                      <th className="p-3.5">Behavior After RF Disturbance Ends</th>
                      <th className="p-3.5">Target Vehicle Subsystems</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    <tr className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-emerald-700 bg-emerald-50/50">Status A</td>
                      <td className="p-3.5 font-medium">All functions perform within specified design tolerances without any deviation.</td>
                      <td className="p-3.5">Continues normal operation without memory alteration or DTC fault logging.</td>
                      <td className="p-3.5 font-bold text-blue-700">Safety Critical: Braking, Steering, ADAS, Airbags</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-amber-700 bg-amber-50/50">Status B</td>
                      <td className="p-3.5">One or more functions exceed tolerances but automatically self-recover.</td>
                      <td className="p-3.5">Returns to normal operation automatically without driver action.</td>
                      <td className="p-3.5 text-slate-600">Comfort: Wipers, Climate Control, Power Windows</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-orange-700 bg-orange-50/50">Status C</td>
                      <td className="p-3.5">One or more functions cease to operate or freeze.</td>
                      <td className="p-3.5">Requires simple operator reset (ignition cycle / switch toggle).</td>
                      <td className="p-3.5 text-slate-600">Non-Critical: Infotainment, Display Navigation</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-rose-700 bg-rose-50/50">Status D</td>
                      <td className="p-3.5 text-rose-700 font-semibold">Permanent hardware damage, silicon latch-up, or memory corruption.</td>
                      <td className="p-3.5 text-rose-700 font-semibold">Unrecoverable without module repair or factory replacement.</td>
                      <td className="p-3.5 font-bold text-rose-700">STRICT UNACCEPTABLE FAILURE</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: EXACT CISPR 25:2021 EMISSION LIMITS & DETECTORS (CISPR 25 ONLY) */}
          {!isImmunity && activeTab === 'curves' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-slate-900 font-bold text-base flex items-center gap-2">
                  <Layers className="w-5 h-5 text-pink-600" />
                  CISPR 25:2021 Official Component / Module Limit Curves
                </h3>
                <p className="text-xs text-slate-500">
                  Receiver measurements evaluating Peak (PK), Quasi-Peak (QP), and Average (AVG) detectors across Class 1 to Class 5 limits from Tables 6, 7, 8, and H.1.
                </p>
              </div>

              {renderChart()}
            </div>
          )}

          {/* TAB: PROTECTED RADIO SERVICE BANDS (CISPR 25 ONLY) */}
          {!isImmunity && activeTab === 'bands' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-slate-900 font-bold text-base">CISPR 25 Protected Radio Service Frequency Bands</h3>
                <p className="text-xs text-slate-500">Mandatory protected frequency allocations to prevent on-board wireless receiver desensitization.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-700 bg-slate-100/80 font-bold uppercase">
                      <th className="p-3.5">Radio Service</th>
                      <th className="p-3.5">Frequency Range</th>
                      <th className="p-3.5">Class 5 Conducted (Avg)</th>
                      <th className="p-3.5">Class 5 Radiated (Avg)</th>
                      <th className="p-3.5">Receiver Bandwidth (RBW)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700 font-mono">
                    <tr className="hover:bg-slate-50">
                      <td className="p-3.5 font-sans font-bold text-slate-900">FM Broadcast (VHF)</td>
                      <td className="p-3.5">76 – 108 MHz</td>
                      <td className="p-3.5 text-emerald-700 font-bold">18 dBµV</td>
                      <td className="p-3.5 text-cyan-700 font-bold">2 dBµV/m</td>
                      <td className="p-3.5 text-slate-600">120 kHz</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3.5 font-sans font-bold text-slate-900">GPS L1 / GLONASS</td>
                      <td className="p-3.5">1565 – 1610 MHz</td>
                      <td className="p-3.5 text-slate-400">—</td>
                      <td className="p-3.5 text-rose-700 font-bold">-5 dBµV/m (Ultra-Strict)</td>
                      <td className="p-3.5 text-slate-600">9 kHz / 120 kHz</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3.5 font-sans font-bold text-slate-900">DAB (Band III)</td>
                      <td className="p-3.5">174 – 230 MHz</td>
                      <td className="p-3.5 text-emerald-700 font-bold">22 dBµV</td>
                      <td className="p-3.5 text-cyan-700 font-bold">4 dBµV/m</td>
                      <td className="p-3.5 text-slate-600">120 kHz</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3.5 font-sans font-bold text-slate-900">Wi-Fi 2.4G / Bluetooth</td>
                      <td className="p-3.5">2400 – 2483.5 MHz</td>
                      <td className="p-3.5 text-slate-400">—</td>
                      <td className="p-3.5 text-cyan-700 font-bold">20 dBµV/m</td>
                      <td className="p-3.5 text-slate-600">1 MHz</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3.5 font-sans font-bold text-slate-900">5G NR / LTE (Sub-6)</td>
                      <td className="p-3.5">1800 – 5925 MHz</td>
                      <td className="p-3.5 text-slate-400">—</td>
                      <td className="p-3.5 text-cyan-700 font-bold">20 – 25 dBµV/m</td>
                      <td className="p-3.5 text-slate-600">1 MHz</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: TEST PROCEDURE & CALIBRATION */}
          {activeTab === 'procedure' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-slate-900 font-bold text-base">
                  {isImmunity ? 'ISO 11452 Calibration & Test Procedure' : 'CISPR 25 Measurement Scan Procedure'}
                </h3>
                <p className="text-xs text-slate-500">Standardized laboratory steps to execute repeatable compliance testing.</p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    step: '01',
                    title: isImmunity ? 'Chamber & Ground Plane Bonding Check' : 'Chamber Noise Floor Verification',
                    desc: isImmunity
                      ? 'Verify DC ground bond resistance < 2.5 mΩ between table and chamber wall. Verify antenna distance at 1.0 m.'
                      : 'Scan ambient noise floor inside shielded ALSE with all equipment powered on. Verify noise floor is at least 6 dB below Class 5 limit.',
                  },
                  {
                    step: '02',
                    title: isImmunity ? 'Substitution Method Pre-Calibration' : 'Receiver Calibration & Transducer Factor (TF)',
                    desc: isImmunity
                      ? 'Place isotropic E-field probe at DUT coordinate. Sweep frequencies (1% step) recording forward power for target field (30/60/100/200 V/m).'
                      : 'Load antenna factor (AF), cable loss, and LISN impedance correction curves into the EMI receiver.',
                  },
                  {
                    step: '03',
                    title: isImmunity ? 'DUT Exposure & Bus Telemetry Monitoring' : 'Peak Pre-Scan & Quasi-Peak / Average Re-measurement',
                    desc: isImmunity
                      ? 'Inject calibrated forward power with AM/PM modulations (minimum 2.0 second dwell time). Monitor CAN-FD/LIN/Ethernet buses for anomalies.'
                      : 'Perform fast Peak pre-scan across entire band. For any peaks approaching the limit, re-measure with Quasi-Peak and Average detectors at exact frequencies.',
                  },
                ].map((item) => (
                  <div key={item.step} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-4">
                    <span className={`text-base font-mono font-extrabold px-3 py-1.5 rounded-lg shrink-0 border ${
                      isImmunity ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-pink-100 text-pink-800 border-pink-200'
                    }`}>
                      {item.step}
                    </span>
                    <div>
                      <h4 className="text-slate-900 font-bold text-sm">{item.title}</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: HARDENING & PCB SOLUTIONS */}
          {activeTab === 'mitigation' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-slate-900 font-bold text-base">
                  {isImmunity ? 'Immunity Hardening & Circuit Countermeasures' : 'Emission Suppression & Filter Topologies'}
                </h3>
                <p className="text-xs text-slate-500">Proven automotive hardware design rules to ensure compliance on first spin.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="text-rose-700 font-bold text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Common Root Causes of Failures
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="text-rose-600 font-bold">•</span>
                      <span><strong>Harness Common-Mode RF Current:</strong> Long cable bundles act as quarter-wave resonant monopole antennas radiating/absorbing RF energy.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-600 font-bold">•</span>
                      <span><strong>Discontinuous Reference Planes:</strong> High-speed signal traces crossing splits in ground plane creating large inductive loop antennas.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-rose-600 font-bold">•</span>
                      <span><strong>Unfiltered Connector Pins:</strong> Direct RF penetration into microcontroller pins without shunt capacitors.</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="text-emerald-700 font-bold text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Hardware Countermeasures & PCB Rules
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span><strong>Common-Mode Chokes (CMC):</strong> Place automotive-qualified CMCs right at connector boundary on CAN-FD, Ethernet, and DC lines.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span><strong>Solid Layer 2 Ground Plane:</strong> Maintain unbroken ground plane directly beneath high-speed signals with edge ground via stitching.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span><strong>Pi-Filter (C-L-C) at Power Inlet:</strong> 100 nF ceramic + 600Ω @ 100MHz ferrite bead + 10 µF electrolytic at battery inlet.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB: OEM EQUIVALENTS */}
          {activeTab === 'oem' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-slate-900 font-bold text-base">Global OEM Equivalents & Standards Matrix</h3>
                <p className="text-xs text-slate-500">Direct cross-reference mapping to Tier-1 carmaker specifications.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-700 bg-slate-100/80 font-bold uppercase">
                      <th className="p-3.5">OEM / Organization</th>
                      <th className="p-3.5">Corporate Standard</th>
                      <th className="p-3.5">Method Description</th>
                      <th className="p-3.5">OEM Severity / Limit Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    <tr className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-slate-900">Ford Motor Company</td>
                      <td className="p-3.5 text-blue-700 font-mono font-semibold">FMC1278 (CI 220 / RI 114)</td>
                      <td className="p-3.5">Conducted / Radiated Immunity</td>
                      <td className="p-3.5 font-bold text-emerald-700">Level 1 (100 V/m) to Level 4 (200 V/m)</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-slate-900">General Motors</td>
                      <td className="p-3.5 text-blue-700 font-mono font-semibold">GMW3097</td>
                      <td className="p-3.5">EMC Component Specifications</td>
                      <td className="p-3.5 font-bold text-emerald-700">Category A, B, C (Up to 300 mA BCI)</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-slate-900">Volkswagen AG / Audi</td>
                      <td className="p-3.5 text-blue-700 font-mono font-semibold">VW TL 81000</td>
                      <td className="p-3.5">Automotive Electronic Components</td>
                      <td className="p-3.5 font-bold text-emerald-700">Class 5 Limits / 200 V/m ALSE (up to 18 GHz)</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-slate-900">BMW Group</td>
                      <td className="p-3.5 text-blue-700 font-mono font-semibold">GS 95002 / GS 95024</td>
                      <td className="p-3.5">EMC Requirements for Components</td>
                      <td className="p-3.5 font-bold text-emerald-700">Class 5 Narrowband & Wideband</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-slate-700">Automotive EMC Engineering Reference (CISPR 25:2021 & ISO 11452)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition shadow-sm"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  )
}
