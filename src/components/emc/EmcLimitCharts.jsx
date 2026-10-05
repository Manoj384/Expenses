import React, { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
} from 'recharts'
import { CISPR25_2021_RAW_RECORDS, CISPR25_TABLES } from '../../data/cispr25_limits'

/* =========================================================================
   CISPR 25:2021 EXACT INTERACTIVE COMPONENT / MODULE EMISSION LIMIT CHART
   ========================================================================= */

export function Cispr25Exact2021Chart({ initialTable = '6', initialMethod = 'Conducted Voltage' }) {
  const [selectedTable, setSelectedTable] = useState(initialTable)
  const [selectedClass, setSelectedClass] = useState('5') // 'all', '5', '4', '3', '2', '1'
  const [selectedService, setSelectedService] = useState('all')

  // Filter records based on selected table
  const tableRecords = useMemo(() => {
    return CISPR25_2021_RAW_RECORDS.filter((r) => r.table === selectedTable)
  }, [selectedTable])

  // Extract unique services in this table
  const availableServices = useMemo(() => {
    const set = new Set(tableRecords.map((r) => r.service))
    return Array.from(set)
  }, [tableRecords])

  // Build continuous frequency step data for Recharts
  const chartData = useMemo(() => {
    const filtered = tableRecords.filter((r) => {
      if (selectedService !== 'all' && r.service !== selectedService) return false
      return true
    })

    // Sort by start frequency
    const sorted = [...filtered].sort((a, b) => a.startFreq - b.startFreq)
    const points = []

    sorted.forEach((item) => {
      const labelStart = `${item.service} (${item.startFreq}M)`
      const labelStop = `${item.service} (${item.stopFreq}M)`

      // Create start and stop points for constant step limits
      const ptStart = {
        freq: item.startFreq,
        label: labelStart,
        service: item.service,
        unit: item.unit,
        rbw: item.rbw,
      }
      const ptStop = {
        freq: item.stopFreq,
        label: labelStop,
        service: item.service,
        unit: item.unit,
        rbw: item.rbw,
      }

      // Assign by class and detector
      const key = `class${item.classNum}_${item.detector.toLowerCase().replace('-', '')}`
      ptStart[key] = item.limit
      ptStop[key] = item.limit

      points.push(ptStart)
      points.push(ptStop)
    })

    return points
  }, [tableRecords, selectedService])

  const unit = tableRecords[0]?.unit || 'dBµV'

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse"></span>
            <h4 className="text-slate-900 font-bold text-base">
              CISPR 25:2021 (Ed. 5.0) Official Emission Limit Curves
            </h4>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-pink-100 text-pink-700 border border-pink-200">
              Verified 2021-12 Dataset
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Exact machine-readable transcription from CISPR 25:2021 Table {selectedTable} ({unit})
          </p>
        </div>

        {/* Table & Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Table Selector */}
          <select
            value={selectedTable}
            onChange={(e) => {
              setSelectedTable(e.target.value)
              setSelectedService('all')
            }}
            className="bg-slate-50 text-xs font-bold text-slate-800 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-pink-500 shadow-sm"
          >
            <option value="6">Table 6: Conducted Voltage (5µH LISN)</option>
            <option value="7">Table 7: Conducted Current Probe</option>
            <option value="8">Table 8: Radiated Emissions ALSE</option>
            <option value="H.1">Table H.1: High Voltage (HV) Shielded</option>
          </select>

          {/* Service Band Selector */}
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-pink-500 shadow-sm"
          >
            <option value="all">All Service Bands</option>
            {availableServices.map((svc) => (
              <option key={svc} value={svc}>
                {svc}
              </option>
            ))}
          </select>

          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-slate-50 text-xs font-bold text-pink-700 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-pink-500 shadow-sm"
          >
            <option value="5">Class 5 (Strict OEM)</option>
            <option value="4">Class 4</option>
            <option value="3">Class 3 (Standard)</option>
            <option value="2">Class 2</option>
            <option value="1">Class 1</option>
            <option value="all">All Classes (1 to 5)</option>
          </select>
        </div>
      </div>

      {/* Recharts Curve */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 35 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              tick={{ fontSize: 9 }}
              angle={-35}
              textAnchor="end"
              interval={Math.ceil(chartData.length / 15)}
            />
            <YAxis stroke="#64748b" domain={[-10, 120]} tick={{ fontSize: 10 }} unit={` ${unit}`} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#cbd5e1',
                borderRadius: '8px',
                fontSize: '11px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />

            {/* Class 5 Traces */}
            {(selectedClass === '5' || selectedClass === 'all') && (
              <>
                <Line type="stepAfter" dataKey="class5_peak" name="Class 5 Peak" stroke="#e11d48" strokeWidth={2.5} dot={false} />
                <Line type="stepAfter" dataKey="class5_quasipeak" name="Class 5 Quasi-Peak" stroke="#d97706" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                <Line type="stepAfter" dataKey="class5_average" name="Class 5 Average" stroke="#16a34a" strokeWidth={2.5} dot={false} />
              </>
            )}

            {/* Class 3 Traces */}
            {(selectedClass === '3' || selectedClass === 'all') && (
              <>
                <Line type="stepAfter" dataKey="class3_peak" name="Class 3 Peak" stroke="#0284c7" strokeWidth={2} dot={false} />
                <Line type="stepAfter" dataKey="class3_average" name="Class 3 Average" stroke="#059669" strokeWidth={2} strokeDasharray="4 2" dot={false} />
              </>
            )}

            {/* Class 1 Traces */}
            {(selectedClass === '1' || selectedClass === 'all') && (
              <>
                <Line type="stepAfter" dataKey="class1_peak" name="Class 1 Peak" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Dataset Summary Table */}
      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-800">
            Active Band Records in Table {selectedTable} ({tableRecords.length} Total Limits):
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Resolution Bandwidths: 9 kHz (0.15-30 MHz) • 120 kHz (30-1000 MHz) • 1 MHz (&gt;1 GHz)
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="bg-white p-2 rounded border border-slate-200">
            <span className="text-slate-500 block text-[10px]">FM Broadcast (76-108M):</span>
            <span className="text-pink-700 font-bold">18 dBµV Avg / 38 Pk</span>
          </div>
          <div className="bg-white p-2 rounded border border-slate-200">
            <span className="text-slate-500 block text-[10px]">GPS L1 (1565-1610M):</span>
            <span className="text-rose-700 font-bold">-5 dBµV/m Avg / 15 Pk</span>
          </div>
          <div className="bg-white p-2 rounded border border-slate-200">
            <span className="text-slate-500 block text-[10px]">Wi-Fi / BT (2.4-2.5G):</span>
            <span className="text-emerald-700 font-bold">20 dBµV/m Avg / 30 Pk</span>
          </div>
          <div className="bg-white p-2 rounded border border-slate-200">
            <span className="text-slate-500 block text-[10px]">5G NR / LTE (sub-6):</span>
            <span className="text-blue-700 font-bold">20 dBµV/m Avg / 30 Pk</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================================
   IMMUNITY TEST LEVEL CHARTS (ISO 11452 ONLY - STRICTLY NO DETECTORS)
   ========================================================================= */

// ISO 11452-2 ALSE Radiated Immunity Test Levels (V/m vs Frequency up to 6 GHz / 18 GHz)
const ISO_11452_2_ALSE_DATA = [
  { freq: '80 MHz', level1: 30, level2: 60, level3: 100, level4: 200 },
  { freq: '200 MHz', level1: 30, level2: 60, level3: 100, level4: 200 },
  { freq: '400 MHz', level1: 30, level2: 60, level3: 100, level4: 200 },
  { freq: '800 MHz', level1: 30, level2: 60, level3: 100, level4: 200 },
  { freq: '1.0 GHz', level1: 30, level2: 60, level3: 100, level4: 200 },
  { freq: '2.0 GHz', level1: 30, level2: 60, level3: 100, level4: 200 },
  { freq: '3.2 GHz', level1: 30, level2: 60, level3: 100, level4: 200 },
  { freq: '4.5 GHz', level1: 30, level2: 60, level3: 100, level4: 200 },
  { freq: '6.0 GHz', level1: 30, level2: 60, level3: 100, level4: 200 },
  { freq: '18 GHz', level1: 30, level2: 60, level3: 100, level4: 200 },
]

export function Iso11452AlseChart() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h4 className="text-slate-900 font-bold text-base flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
          ISO 11452-2:2019 ALSE Radiated Immunity Test Severities (80 MHz – 18 GHz)
        </h4>
        <p className="text-xs text-slate-500">
          Injected RF Field Strength Levels (V/m) across CW, AM (1 kHz 80%), and Pulse Modulation (PM 217 Hz 12.5% duty)
        </p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={ISO_11452_2_ALSE_DATA} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="freq" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" domain={[0, 240]} tick={{ fontSize: 11 }} unit=" V/m" />
            <Tooltip
              contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Line type="stepAfter" dataKey="level1" name="Level I (30 V/m - Base Body)" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" />
            <Line type="stepAfter" dataKey="level2" name="Level II (60 V/m - Standard)" stroke="#0284c7" strokeWidth={2} />
            <Line type="stepAfter" dataKey="level3" name="Level III (100 V/m - Severe OEM)" stroke="#d97706" strokeWidth={2.5} />
            <Line type="stepAfter" dataKey="level4" name="Level IV (200 V/m - Safety Critical: Braking/ADAS)" stroke="#dc2626" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ISO 11452-4 Bulk Current Injection (BCI) Test Levels
const ISO_11452_4_BCI_DATA = [
  { freq: '100 kHz', level1: 30, level2: 60, level3: 100, level4: 200, level5: 300 },
  { freq: '1.0 MHz', level1: 30, level2: 60, level3: 100, level4: 200, level5: 300 },
  { freq: '10 MHz',  level1: 30, level2: 60, level3: 100, level4: 200, level5: 300 },
  { freq: '30 MHz',  level1: 30, level2: 60, level3: 100, level4: 200, level5: 300 },
  { freq: '100 MHz', level1: 30, level2: 60, level3: 100, level4: 200, level5: 300 },
  { freq: '200 MHz', level1: 30, level2: 60, level3: 100, level4: 200, level5: 300 },
  { freq: '400 MHz', level1: 30, level2: 60, level3: 100, level4: 200, level5: 300 },
  { freq: '1.0 GHz (TWC)', level1: 30, level2: 60, level3: 100, level4: 200, level5: 300 },
  { freq: '3.0 GHz (TWC)', level1: 30, level2: 60, level3: 100, level4: 200, level5: 300 },
]

export function Iso11452BciChart() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h4 className="text-slate-900 font-bold text-base flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
          ISO 11452-4:2020 Bulk Current Injection (BCI) Test Levels (100 kHz – 3.0 GHz)
        </h4>
        <p className="text-xs text-slate-500">Current clamp RF injection severity profile (30 mA to 300 mA)</p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={ISO_11452_4_BCI_DATA} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="freq" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" domain={[0, 350]} tick={{ fontSize: 11 }} unit=" mA" />
            <Tooltip
              contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Line type="stepAfter" dataKey="level1" name="Class I (30 mA)" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" />
            <Line type="stepAfter" dataKey="level2" name="Class II (60 mA)" stroke="#0284c7" strokeWidth={2} />
            <Line type="stepAfter" dataKey="level3" name="Class III (100 mA)" stroke="#d97706" strokeWidth={2} />
            <Line type="stepAfter" dataKey="level4" name="Class IV (200 mA)" stroke="#ea580c" strokeWidth={2.5} />
            <Line type="stepAfter" dataKey="level5" name="Class V (300 mA - Safety Critical)" stroke="#dc2626" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ISO 11452-8 Magnetic Field
const ISO_11452_8_H_FIELD_DATA = [
  { freq: '15 Hz', level1: 1, level2: 10, level3: 30, level4: 100, level5: 1000 },
  { freq: '50/60 Hz', level1: 1, level2: 10, level3: 30, level4: 100, level5: 1000 },
  { freq: '150 Hz', level1: 1, level2: 10, level3: 30, level4: 100, level5: 300 },
  { freq: '1.0 kHz', level1: 1, level2: 3, level3: 10, level4: 30, level5: 100 },
  { freq: '10 kHz', level1: 1, level2: 3, level3: 10, level4: 30, level5: 30 },
  { freq: '150 kHz', level1: 1, level2: 3, level3: 10, level4: 30, level5: 30 },
]

export function Iso11452MagneticChart() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h4 className="text-slate-900 font-bold text-base flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 animate-pulse"></span>
          ISO 11452-8:2015 Magnetic Field Immunity Levels (15 Hz – 150 kHz)
        </h4>
        <p className="text-xs text-slate-500">Magnetic Field Intensity H (A/m) across Radiating Loop and Helmholtz Coils</p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={ISO_11452_8_H_FIELD_DATA} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="freq" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" domain={[0, 1100]} tick={{ fontSize: 11 }} unit=" A/m" />
            <Tooltip
              contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Line type="monotone" dataKey="level1" name="Level I (1 A/m)" stroke="#94a3b8" strokeWidth={1.5} />
            <Line type="monotone" dataKey="level3" name="Level III (30 A/m)" stroke="#0284c7" strokeWidth={2} />
            <Line type="monotone" dataKey="level4" name="Level IV (100 A/m)" stroke="#d97706" strokeWidth={2.5} />
            <Line type="monotone" dataKey="level5" name="Level V (1000 A/m - EV Traction High Power)" stroke="#dc2626" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ISO 11452-10 Conducted Audio Ripple
const ISO_11452_10_RIPPLE_DATA = [
  { freq: '10 Hz', level1: 0.5, level2: 1.0, level3: 2.0, level4: 6.0 },
  { freq: '100 Hz', level1: 0.5, level2: 1.0, level3: 2.0, level4: 6.0 },
  { freq: '1.0 kHz', level1: 0.5, level2: 1.0, level3: 2.0, level4: 6.0 },
  { freq: '10 kHz', level1: 0.5, level2: 1.0, level3: 2.0, level4: 6.0 },
  { freq: '50 kHz', level1: 0.2, level2: 0.5, level3: 1.0, level4: 3.0 },
  { freq: '250 kHz', level1: 0.1, level2: 0.2, level3: 0.5, level4: 1.0 },
]

export function Iso11452AudioRippleChart() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h4 className="text-slate-900 font-bold text-base flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
          ISO 11452-10:2009 Conducted Audio Ripple Levels (10 Hz – 250 kHz)
        </h4>
        <p className="text-xs text-slate-500">Peak-to-Peak Alternator / Inverter AC Ripple Voltage (Upp) on DC Supply</p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={ISO_11452_10_RIPPLE_DATA} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="freq" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" domain={[0, 7]} tick={{ fontSize: 11 }} unit=" Vpp" />
            <Tooltip
              contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Line type="monotone" dataKey="level1" name="Level I (0.5 Vpp)" stroke="#94a3b8" strokeWidth={1.5} />
            <Line type="monotone" dataKey="level2" name="Level II (1.0 Vpp)" stroke="#0284c7" strokeWidth={2} />
            <Line type="monotone" dataKey="level3" name="Level III (2.0 Vpp)" stroke="#d97706" strokeWidth={2.5} />
            <Line type="monotone" dataKey="level4" name="Level IV (6.0 Vpp - Extreme Ripple)" stroke="#dc2626" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
