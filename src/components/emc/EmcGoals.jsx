import React, { useState, useEffect, useMemo } from 'react'
import {
  Target,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  BookOpen,
  Award,
  Layers,
  Cpu,
  Zap,
  Sliders,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Download,
  Plus,
  Trash2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Share2,
  FileSpreadsheet,
  FileText,
  Shield,
  Radio,
  ExternalLink,
  BookMarked,
  BatteryCharging,
  Flame,
  Activity,
} from 'lucide-react'

// Initial Goal Roadmap pre-populated from user's "Validation engineer & EMC Design Engineer" XMind & DOCX
const DEFAULT_EMC_GOALS = [
  {
    id: 'emc-g-01',
    date: '2026-10-01',
    time: '18:00',
    topic: 'CISPR 25 Ed. 5.0 — Conducted & Radiated Emissions Mastery',
    category: 'Validation Engineer',
    priority: 'High',
    progress: 'Completed',
    nextTopic: 'ISO 11452-2 ALSE Chamber Radiated Immunity',
    endDate: '2026-10-03',
    wordUpdated: 'YES',
    filePath: 'Learnings/Electronics/GOALS/DOC/Validation engineer.docx',
    notes: 'Mastered Table 6 (Voltage), Table 7 (Current probe), Table 8 (ALSE Radiated), Table H.1 (HV EV Shielded lines), and CISPR 16-1-1 Peak/QP/Avg detectors.',
  },
  {
    id: 'emc-g-02',
    date: '2026-10-02',
    time: '10:00',
    topic: 'ISO 11452 (Parts 2 to 11) — RF Immunity Standard Architecture',
    category: 'Validation Engineer',
    priority: 'High',
    progress: 'Completed',
    nextTopic: 'Common Mode vs. Differential Mode Noise Separation',
    endDate: '2026-10-04',
    wordUpdated: 'YES',
    filePath: 'Learnings/Electronics/ISO 11452-X',
    notes: 'Extracted ISO 11452-2:2019 (ALSE 80MHz-6GHz/18GHz), ISO 11452-4:2020 (BCI 100kHz-400MHz & TWC to 3GHz), TEM cell h<d/3 rule, and ISO Functional Status A/B/C/D.',
  },
  {
    id: 'emc-g-03',
    date: '2026-10-04',
    time: '14:00',
    topic: 'Noise Physics: Common Mode vs Differential Mode & Coupling Paths',
    category: 'Validation Engineer',
    priority: 'High',
    progress: 'In Progress',
    nextTopic: 'LISN 5µH Behavior & Antenna Calibration Factors',
    endDate: '2026-10-08',
    wordUpdated: 'YES',
    filePath: 'Learnings/Electronics/GOALS/DOC/Noise_Physics.docx',
    notes: 'Capacitive coupling (I = C dv/dt), Inductive coupling (V = M di/dt), and Radiated far-field (E/H wave impedance).',
  },
  {
    id: 'emc-g-04',
    date: '2026-10-06',
    time: '11:00',
    topic: 'LISN (5µH / 50Ω) Impedance Curve & Lab Metrology',
    category: 'Validation Engineer',
    priority: 'Medium',
    progress: 'In Progress',
    nextTopic: 'Antenna Factors & Anechoic Chamber Boundary Effects',
    endDate: '2026-10-10',
    wordUpdated: 'NO',
    filePath: 'Learnings/Electronics/LISN_Analysis.docx',
    notes: 'Understand 5µH Artificial Network impedance stabilization, high-voltage dual LISN for EVs, and calibration verification.',
  },
  {
    id: 'emc-g-05',
    date: '2026-10-08',
    time: '15:00',
    topic: 'High di/dt Switching Loop Area Reduction in SMPS (Buck/Boost)',
    category: 'Design Engineer',
    priority: 'Critical',
    progress: 'In Progress',
    nextTopic: 'Solid Ground Planes vs Split Ground (When NOT to Split)',
    endDate: '2026-10-14',
    wordUpdated: 'YES',
    filePath: 'Learnings/Electronics/GOALS/DOC/SMPS_EMC_Design.docx',
    notes: 'Minimize MOSFET-Diode-Capacitor switching loop area (< 25 mm²). Frequent #1 interview question at Continental & Bosch.',
  },
  {
    id: 'emc-g-06',
    date: '2026-10-10',
    time: '16:00',
    topic: 'PCB Layout: Return Current Paths & 4/6-Layer Stack-Up',
    category: 'Design Engineer',
    priority: 'Critical',
    progress: 'Not Started',
    nextTopic: 'EMI Filter Design (LC, Pi-Filter, Common Mode Choke)',
    endDate: '2026-10-18',
    wordUpdated: 'NO',
    filePath: 'Learnings/Electronics/Altium_KiCad_Stackup.docx',
    notes: 'High-frequency return currents follow path of least inductance directly under trace. Never cross splits in ground plane.',
  },
  {
    id: 'emc-g-07',
    date: '2026-10-12',
    time: '14:00',
    topic: 'EMI Filter Design: LC, Pi (π) Filters & Resonance Damping Math',
    category: 'Design Engineer',
    priority: 'Critical',
    progress: 'Not Started',
    nextTopic: 'Interview Question: "Why did your Pi-Filter Fail?"',
    endDate: '2026-10-22',
    wordUpdated: 'NO',
    filePath: 'Learnings/Electronics/Filter_Design_Calculations.docx',
    notes: 'Calculate cutoff fc = 1 / (2π√LC), calculate Q-damping factor, prevent inductor SRF resonance, and match source/load impedances.',
  },
  {
    id: 'emc-g-08',
    date: '2026-10-15',
    time: '18:00',
    topic: 'LTspice Simulation: SMPS Noise FFT & Filter Insertion Loss',
    category: 'Simulation Engineer',
    priority: 'High',
    progress: 'Not Started',
    nextTopic: 'Altium/KiCad PCB Implementation of Filtered Buck Converter',
    endDate: '2026-10-26',
    wordUpdated: 'NO',
    filePath: 'Learnings/Electronics/LTspice_Buck_Filter_Simulation.asc',
    notes: 'Compare no-filter vs LC vs π-filter FFT spectrum. Show > 40 dB conducted emission improvement below CISPR 25 Class 5 line.',
  },
  {
    id: 'emc-g-09',
    date: '2026-10-20',
    time: '11:00',
    topic: 'EV Power Electronics: Inverters, 800V DC-DC & 360° Shielding',
    category: 'EV / Power Electronics',
    priority: 'High',
    progress: 'Not Started',
    nextTopic: 'Showcase Project Dossier & Tier-1 Interview Prep',
    endDate: '2026-10-30',
    wordUpdated: 'NO',
    filePath: 'Learnings/Electronics/EV_EMC_Shielding.docx',
    notes: 'SiC/GaN dv/dt ringing (> 50 V/ns), motor phase cable common mode noise, 360° backshell harness termination, and dual HV-LISN.',
  },
  {
    id: 'emc-g-10',
    date: '2026-10-25',
    time: '10:00',
    topic: 'Capstone Portfolio Project: Buck Converter EMI Filter & PCB',
    category: 'Outcome Focus',
    priority: 'Critical',
    progress: 'Not Started',
    nextTopic: 'Apply to Continental, Valeo, ZF Friedrichshafen, Bosch',
    endDate: '2026-11-05',
    wordUpdated: 'NO',
    filePath: 'Learnings/Electronics/Projects/Buck_EMI_Filter_Showcase.pdf',
    notes: 'Complete end-to-end project: Before/after FFT graph + Filter calculation math + LTspice simulation + Altium layout = Guaranteed interview call.',
  },
]

// Extracted Fundamental Electronics Theory Curriculum (From "The Theory Behind Electronics - A Beginners Guide")
const THEORY_MODULES = [
  {
    id: 'mod-02',
    num: '02',
    title: 'Current, Voltage & Power (DC Fundamentals)',
    icon: Zap,
    color: 'blue',
    summary: 'Atomic charges, electron random hopping vs directed drift, electromotive force, Joule’s law, and power ratings.',
    coreFormula: 'P = V × I = I²·R = V² / R',
    keyPoints: [
      'Current (I) in Amperes (A): Flow of free electron charge (1 A = 1 Coulomb/sec). Conventional flow is (+) to (-).',
      'Voltage (V) in Volts (V): Electromotive Force (EMF) potential difference providing the continuous push to charge carriers.',
      'Joule’s Law of Heating: Electrical energy converted to heat over time. Power consumption measured in Watt-Hours (Wh) & battery capacity in Ampere-Hours (Ah).',
      'Golden Component Safety Rule: Maximum Power Rating > 2 × Expected Operating Power to prevent thermal failure.',
    ],
  },
  {
    id: 'mod-03',
    num: '03',
    title: 'DC vs. AC Systems (Alternating Current & RMS)',
    icon: Activity,
    color: 'indigo',
    summary: 'Alternator rotating magnetic fields, 3-wire mains architecture (Live, Neutral, PE Ground), and RMS voltage math.',
    coreFormula: 'V_RMS = 0.707 × V_peak • P_AVG = V_RMS × I_RMS',
    keyPoints: [
      'AC Generation: Rotating a coil inside a stationary magnetic field (or rotating magnets in stator) generates sinusoidal EMF.',
      '3-Wire Delivery: Line/Phase (Hot conductor), Neutral (Earth-referenced return), and Protective Earth Ground (PE) for user chassis safety.',
      'RMS (Root Mean Square): The equivalent effective DC voltage producing the identical heating power in a pure resistive load.',
      'Peak-to-Peak: V_p-p = 2 × V_peak = 2 × √2 × V_RMS ≈ 2.828 × V_RMS (e.g. 230 V RMS = 650 V p-p).',
    ],
  },
  {
    id: 'mod-04',
    num: '04',
    title: 'Resistance & Resistors (Ohm’s Law & Dissipation)',
    icon: Flame,
    color: 'amber',
    summary: 'Material resistivity, thermal energy transfer, color code bands, tolerances, and rheostats vs. potentiometers.',
    coreFormula: 'R = ρ · (L / A) • V = I × R',
    keyPoints: [
      'Resistance (R) in Ohms (Ω): Measures difficulty of current flow based on material resistivity (ρ), length (L), and cross-section (A).',
      'Color Code Bands: Standard 4-band and 5-band color system. Gold tolerance = ±5%, Silver tolerance = ±10%.',
      'Variable Resistors: Rheostat (2-terminal series current regulator) vs. Potentiometer (3-terminal adjustable voltage divider).',
      'EMC Relevance: Parasitic series inductance (ESL) in wirewound resistors causes unwanted high-frequency impedance spikes.',
    ],
  },
  {
    id: 'mod-05',
    num: '05',
    title: 'Capacitance & Electrostatic Energy Storage',
    icon: BatteryCharging,
    color: 'emerald',
    summary: 'Dielectric storage, charging/discharging curves, RC transient time constants, and Ceramic MLCC vs Electrolytic.',
    coreFormula: 'C = Q / V = (ε · A) / d • τ = R × C',
    keyPoints: [
      'Capacitance (C) in Farads (F): Ability to store electrostatic charge between two conductive plates separated by a dielectric insulator.',
      'RC Time Constant (τ = R·C): Capacitor charges to 63.2% in 1τ and reaches full steady-state (99.3%) at 5τ (Transient Period).',
      'Ceramic MLCC: Non-polarized, extremely low ESR/ESL, compact size—critical for high-frequency RF bypass and ECU IC decoupling.',
      'Electrolytic (Aluminum/Tantalum): Polarized, high capacitance density—used for SMPS bulk power smoothing and ripple absorption.',
    ],
  },
  {
    id: 'mod-06',
    num: '06',
    title: 'Inductance & The Magnetic Field',
    icon: Radio,
    color: 'purple',
    summary: 'Solenoids, Faraday’s & Lenz’s laws, self & mutual inductance, RL time constant, transformers, and common mode chokes.',
    coreFormula: 'V_L = -L · (di / dt) • τ = L / R',
    keyPoints: [
      'Inductance (L) in Henries (H): Property where changing current induces a counter-electromotive force (back-EMF) opposing the change.',
      'Self-Inductance: Storing kinetic energy in a concentrated magnetic field (B-field) within a coiled conductor around a ferrite/iron core.',
      'Mutual Inductance: Magnetic coupling between adjacent coils—fundamental operating principle of Transformers and Common Mode Chokes.',
      'RL Time Constant (τ = L/R): Governs the energy charge/discharge rate of magnetic fields in power converters and inductive relays.',
    ],
  },
  {
    id: 'mod-07',
    num: '07',
    title: 'Semiconductors & Active Devices (Diodes & Transistors)',
    icon: Cpu,
    color: 'cyan',
    summary: 'Silicon/Germanium P-N junctions, P-type holes, N-type electrons, Diode rectification, and BJT / MOSFET switching modes.',
    coreFormula: 'I_C = β · I_B (BJT) • I_D = f(V_GS) (MOSFET)',
    keyPoints: [
      'P-N Junction: Formed by doping Silicon with trivalent acceptors (P-type) and pentavalent donors (N-type) to establish a depletion region.',
      'Diodes: Unidirectional conduction from Anode (+) to Cathode (-). Forward drop ≈ 0.7V (Si) / 0.3V (Schottky); essential for flyback suppression.',
      'Transistors (BJT & MOSFET): Three operational states: Saturation (Switch ON), Cut-off (Switch OFF), and Active (Linear Amplifier).',
      'High-Speed Switching: Fast MOSFET switching edges create steep dv/dt and di/dt transients, which are the primary root cause of automotive EMI.',
    ],
  },
  {
    id: 'mod-08',
    num: '08',
    title: 'Basic Laws of Electric Circuits (KCL & KVL)',
    icon: BookOpen,
    color: 'rose',
    summary: 'Kirchhoff’s Current Law (KCL), Kirchhoff’s Voltage Law (KVL), series/parallel impedance, and high-frequency parasitic loops.',
    coreFormula: '∑ I_in = ∑ I_out (KCL) • ∑ V_loop = 0 (KVL)',
    keyPoints: [
      'Kirchhoff’s Current Law (KCL): The algebraic sum of currents entering any circuit node must equal zero (charge conservation).',
      'Kirchhoff’s Voltage Law (KVL): The algebraic sum of all potential differences around any closed electrical loop equals zero.',
      'Series & Parallel Combinations: Resistors, capacitors, and inductors combine to synthesize tuned filters and impedance dividers.',
      'EMC Bridge: At RF frequencies (> 30 MHz), every wire possesses parasitic inductance (≈ 1 nH/mm) and stray capacitance to ground, altering circuit behavior.',
    ],
  },
]

export default function EmcGoals() {
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem('emc_learning_goals')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error('Error loading goals:', e)
      }
    }
    return DEFAULT_EMC_GOALS
  })

  const [activeTrack, setActiveTrack] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [isAddingGoal, setIsAddingGoal] = useState(false)
  const [selectedTheoryMod, setSelectedTheoryMod] = useState(null)
  const [copiedPath, setCopiedPath] = useState(null)

  // New goal form state
  const [newTopic, setNewTopic] = useState('')
  const [newCategory, setNewCategory] = useState('Validation Engineer')
  const [newPriority, setNewPriority] = useState('High')
  const [newNextTopic, setNewNextTopic] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newFilePath, setNewFilePath] = useState('')

  // Save to LocalStorage whenever goals change
  useEffect(() => {
    localStorage.setItem('emc_learning_goals', JSON.stringify(goals))
  }, [goals])

  // Progress metrics calculation
  const metrics = useMemo(() => {
    const total = goals.length
    const completed = goals.filter((g) => g.progress === 'Completed').length
    const inProgress = goals.filter((g) => g.progress === 'In Progress').length
    const notStarted = goals.filter((g) => g.progress === 'Not Started').length
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0

    return { total, completed, inProgress, notStarted, percent }
  }, [goals])

  // Filtered goals list
  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      const matchTrack =
        activeTrack === 'all' ||
        (activeTrack === 'validation' && g.category.includes('Validation')) ||
        (activeTrack === 'design' && g.category.includes('Design')) ||
        (activeTrack === 'simulation' && g.category.includes('Simulation')) ||
        (activeTrack === 'ev' && g.category.includes('EV')) ||
        (activeTrack === 'project' && g.category.includes('Outcome'))

      const matchStatus =
        filterStatus === 'all' ||
        g.progress.toLowerCase().replace(/\s+/g, '') === filterStatus.toLowerCase().replace(/\s+/g, '')

      return matchTrack && matchStatus
    })
  }, [goals, activeTrack, filterStatus])

  // Toggle goal progress
  const toggleGoalProgress = (id) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g
        const nextStatus =
          g.progress === 'Not Started'
            ? 'In Progress'
            : g.progress === 'In Progress'
            ? 'Completed'
            : 'Not Started'
        return { ...g, progress: nextStatus }
      })
    )
  }

  // Delete goal
  const handleDeleteGoal = (id) => {
    if (window.confirm('Are you sure you want to remove this goal?')) {
      setGoals((prev) => prev.filter((g) => g.id !== id))
    }
  }

  // Copy path helper
  const handleCopyPath = (path) => {
    navigator.clipboard.writeText(path)
    setCopiedPath(path)
    setTimeout(() => setCopiedPath(null), 2000)
  }

  // Add new goal
  const handleAddGoalSubmit = (e) => {
    e.preventDefault()
    if (!newTopic.trim()) return

    const newGoalItem = {
      id: `emc-g-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      topic: newTopic,
      category: newCategory,
      priority: newPriority,
      progress: 'Not Started',
      nextTopic: newNextTopic || 'TBD',
      endDate: newEndDate || '2026-11-30',
      wordUpdated: 'NO',
      filePath: newFilePath || 'Learnings/Electronics/GOALS/DOC',
      notes: newNotes,
    }

    setGoals((prev) => [newGoalItem, ...prev])
    setNewTopic('')
    setNewNextTopic('')
    setNewNotes('')
    setNewFilePath('')
    setIsAddingGoal(false)
  }

  // Export to CSV / Excel compatible format
  const exportToCsv = () => {
    const headers = ['DATE', 'TIME', 'TOPICS', 'CATEGORY', 'PRIORITY', 'Progress', 'Next Topic', 'End Time/Date', 'Word Updated', 'File PATH', 'NOTES']
    const rows = goals.map((g) => [
      `"${g.date}"`,
      `"${g.time}"`,
      `"${g.topic.replace(/"/g, '""')}"`,
      `"${g.category}"`,
      `"${g.priority}"`,
      `"${g.progress}"`,
      `"${(g.nextTopic || '').replace(/"/g, '""')}"`,
      `"${g.endDate}"`,
      `"${g.wordUpdated}"`,
      `"${(g.filePath || '').replace(/"/g, '""')}"`,
      `"${(g.notes || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `EMC_Goal_Tracking_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-8">
      {/* Hero Header & Learning Roadmap Pitch */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-wider text-blue-100">
            <Target className="w-3.5 h-3.5 text-amber-300" />
            EMC Validation &amp; Design Engineer Career Roadmap
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
            Master Automotive EMC — <span className="text-amber-300">From Physics to Tier-1 Hiring</span>
          </h1>
          <p className="text-blue-100 text-sm sm:text-base leading-relaxed max-w-3xl">
            A structured, outcome-driven learning plan based on your exact engineering documentation. Track your mastery across <strong>CISPR 25</strong>, <strong>ISO 11452</strong>, <strong>Filter Math</strong>, <strong>LTspice Simulation</strong>, and <strong>High di/dt PCB Layouts</strong> to target top automotive OEMs &amp; Tier-1 suppliers.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
              <span className="text-xs text-blue-200 block font-medium">Overall Progress</span>
              <span className="text-2xl font-black text-amber-300 font-mono">{metrics.percent}%</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
              <span className="text-xs text-blue-200 block font-medium">Completed Topics</span>
              <span className="text-2xl font-black text-emerald-300 font-mono">{metrics.completed} / {metrics.total}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
              <span className="text-xs text-blue-200 block font-medium">In Progress</span>
              <span className="text-2xl font-black text-cyan-300 font-mono">{metrics.inProgress}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15">
              <span className="text-xs text-blue-200 block font-medium">Target Companies</span>
              <span className="text-base font-bold text-white block mt-1">Continental, Valeo, ZF, Bosch</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex justify-between items-center text-xs sm:text-sm font-bold text-slate-800">
          <span className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Curriculum Completion Pace
          </span>
          <span className="font-mono text-blue-700 font-bold">{metrics.completed} of {metrics.total} Milestones Mastered ({metrics.percent}%)</span>
        </div>
        <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div
            className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${Math.max(5, metrics.percent)}%` }}
          />
        </div>
      </div>

      {/* SECTION: FOUNDATIONAL ELECTRONICS THEORY (FROM "THE THEORY BEHIND ELECTRONICS - A BEGINNERS GUIDE") */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1.5">
              <BookMarked className="w-3.5 h-3.5" />
              Foundational Physics &amp; Circuit Theory Hub
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              The Theory Behind Electronics — Core Foundation Modules
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Extracted directly from your Beginners Guide library (`02 Current/Voltage` to `08 Basic Laws`). Mastering these foundational concepts is mandatory for understanding EMC noise propagation.
            </p>
          </div>
        </div>

        {/* 8 Module Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {THEORY_MODULES.map((mod) => {
            const Icon = mod.icon
            const isSelected = selectedTheoryMod === mod.id

            return (
              <div
                key={mod.id}
                onClick={() => setSelectedTheoryMod(isSelected ? null : mod.id)}
                className={`border rounded-2xl p-4 cursor-pointer transition-all duration-200 space-y-3 ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs font-mono">
                      {mod.num}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Module</span>
                  </div>
                  <Icon className="w-4 h-4 text-indigo-600" />
                </div>

                <h3 className="font-bold text-slate-900 text-xs leading-snug">
                  {mod.title}
                </h3>

                <div className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono text-[11px] font-bold text-indigo-700 truncate">
                  {mod.coreFormula}
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                  {mod.summary}
                </p>

                <div className="text-[11px] font-bold text-indigo-600 flex items-center gap-1 pt-1">
                  {isSelected ? 'Collapse Details' : 'View Core Physics'}
                  {isSelected ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </div>
            )
          })}
        </div>

        {/* Expanded Theory Detail Drawer */}
        {selectedTheoryMod && (
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-indigo-400/30 space-y-4 animate-in fade-in duration-200">
            {(() => {
              const activeMod = THEORY_MODULES.find((m) => m.id === selectedTheoryMod)
              if (!activeMod) return null

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-400/30 pb-3">
                    <div className="space-y-1">
                      <span className="text-xs uppercase font-bold text-amber-300 font-mono tracking-wider">
                        Module {activeMod.num} • Deep Theory Breakdown
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        {activeMod.title}
                      </h3>
                    </div>
                    <div className="bg-indigo-800/80 px-3 py-1.5 rounded-xl border border-indigo-400/40 text-xs font-mono font-bold text-cyan-300">
                      {activeMod.coreFormula}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {activeMod.keyPoints.map((pt, idx) => (
                      <div key={idx} className="bg-white/10 rounded-xl p-3 border border-white/10 space-y-1">
                        <div className="flex items-start gap-2 text-slate-200 leading-relaxed">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{pt}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* 4 Core Pillars Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pillar 1 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 hover:border-blue-400 transition">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">1. Validation Engineer</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            CISPR 25 (Conducted &amp; Radiated), ISO 11452 (Parts 2-11), LISN behavior, Antenna factor calibration, and CM vs DM noise separation.
          </p>
          <div className="text-[11px] text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg inline-block">
            4 Core Standards Modules
          </div>
        </div>

        {/* Pillar 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 hover:border-indigo-400 transition">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">2. EMC Design Engineer</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            High di/dt switching loops, Solid vs Split ground planes, Return current paths, Decoupling placement, π-filters &amp; resonance damping.
          </p>
          <div className="text-[11px] text-indigo-700 font-semibold bg-indigo-50 px-2.5 py-1 rounded-lg inline-block">
            Altium &amp; KiCad Layout Rules
          </div>
        </div>

        {/* Pillar 3 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 hover:border-purple-400 transition">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">3. Simulation &amp; Filters</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            LTspice FFT noise spectrum simulation, Filter insertion loss, LC cutoff math, and answering "Why did your π-filter fail?".
          </p>
          <div className="text-[11px] text-purple-700 font-semibold bg-purple-50 px-2.5 py-1 rounded-lg inline-block">
            LTspice + CST Studio Suite
          </div>
        </div>

        {/* Pillar 4 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 hover:border-emerald-400 transition">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">4. Outcome &amp; Hiring</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Featured Capstone Project: Buck converter EMI filter before/after FFT proof + Altium PCB layout to guarantee interview callbacks.
          </p>
          <div className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg inline-block">
            Continental • Valeo • ZF • Bosch
          </div>
        </div>
      </div>

      {/* Featured Capstone Project Showcase Dossier */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-500/30 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-500/30 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              Featured Interview Showcase Project
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Buck Converter EMI Filter Design &amp; Validation
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm">
              "This single end-to-end project will carry your technical interview and get you shortlisted at Tier-1 automotive leaders."
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-xs font-bold">
              CISPR 25 Class 5 Compliant
            </span>
          </div>
        </div>

        {/* 5-Step Capstone Execution Flow */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
            <div className="w-6 h-6 rounded-lg bg-red-500/30 text-red-300 flex items-center justify-center font-bold font-mono">
              1
            </div>
            <h4 className="font-bold text-white text-sm">Baseline Noise</h4>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Measure raw switching noise (400 kHz) &amp; harmonics exceeding CISPR 25 Class 5 by +28 dBµV.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/30 text-amber-300 flex items-center justify-center font-bold font-mono">
              2
            </div>
            <h4 className="font-bold text-white text-sm">Filter Math</h4>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Calculate fc = 56 kHz, L = 10 µH, C = 4.7 µF, and damping resistor Rd = 1.46 Ω to prevent resonance.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500/30 text-blue-300 flex items-center justify-center font-bold font-mono">
              3
            </div>
            <h4 className="font-bold text-white text-sm">LTspice FFT</h4>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Simulate insertion loss &amp; FFT spectrum showing &gt; 42 dB attenuation across 150 kHz – 108 MHz.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
            <div className="w-6 h-6 rounded-lg bg-purple-500/30 text-purple-300 flex items-center justify-center font-bold font-mono">
              4
            </div>
            <h4 className="font-bold text-white text-sm">PCB Layout</h4>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Shrink di/dt loop to &lt; 25 mm², place input capacitor at MOSFET pin, solid L2 ground plane.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/30 text-emerald-300 flex items-center justify-center font-bold font-mono">
              5
            </div>
            <h4 className="font-bold text-white text-sm">Validation</h4>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Final conducted emissions scan passes all CISPR 25 Class 5 limits with 6 dB safe engineering margin.
            </p>
          </div>
        </div>

        {/* Interactive "Why Did Your Pi Filter Fail?" Interview Q&A Box */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-amber-300 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Crucial Interview Question: "Why did your Pi-Filter (π) fail in testing?"
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
              <strong className="text-white block mb-1">1. Capacitor Parasitic ESL:</strong>
              At high frequencies (&gt; 30 MHz), capacitor lead inductance turns the capacitor inductive, losing bypass shunt capability.
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
              <strong className="text-white block mb-1">2. Inductor Self-Resonant Frequency (SRF):</strong>
              Inter-winding capacitance causes the inductor to behave as a capacitor past its SRF, letting RF noise pass through.
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60">
              <strong className="text-white block mb-1">3. Magnetic Cross-Coupling on PCB:</strong>
              Input and output traces placed too close on PCB allow noise to inductively bypass the filter choke entirely.
            </div>
          </div>
        </div>
      </div>

      {/* Goal Tracking Management Section (Synced with Goal Tracking.xlsx) */}
      <div className="space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          {/* Category Track Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'all', label: 'All Topics' },
              { id: 'validation', label: 'Validation Engineer' },
              { id: 'design', label: 'Design Engineer' },
              { id: 'simulation', label: 'Simulation & LTspice' },
              { id: 'ev', label: 'EV Power Electronics' },
              { id: 'project', label: 'Capstone Project' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTrack(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTrack === t.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAddingGoal(!isAddingGoal)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Topic
            </button>
            <button
              onClick={exportToCsv}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition flex items-center gap-1.5 shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Export CSV / Excel
            </button>
          </div>
        </div>

        {/* Add New Goal Form */}
        {isAddingGoal && (
          <form
            onSubmit={handleAddGoalSubmit}
            className="bg-white border-2 border-blue-400/80 rounded-2xl p-5 shadow-md space-y-4 animate-in fade-in duration-200"
          >
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                Add Learning Milestone to Goal Tracking
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingGoal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">Topic Name &amp; Standard Ref:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ISO 11452-4 BCI Calibration Jig Math"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Category Track:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Validation Engineer</option>
                  <option>Design Engineer</option>
                  <option>Simulation Engineer</option>
                  <option>EV / Power Electronics</option>
                  <option>Outcome Focus</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Priority Level:</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Critical</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Next Follow-Up Topic:</label>
                <input
                  type="text"
                  placeholder="e.g. Decoupling capacitor placement"
                  value={newNextTopic}
                  onChange={(e) => setNewNextTopic(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target End Date:</label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-xs font-bold text-slate-700 block mb-1">Documentation File Path:</label>
                <input
                  type="text"
                  placeholder="Learnings/Electronics/GOALS/DOC/..."
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-xs font-bold text-slate-700 block mb-1">Key Formulas, Equations &amp; Study Notes:</label>
                <textarea
                  rows={2}
                  placeholder="Formulas, key setup constraints, or interview takeaways..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
              >
                Save Milestone
              </button>
            </div>
          </form>
        )}

        {/* Goals List / Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <th className="p-3.5 w-10">Status</th>
                  <th className="p-3.5">Topic &amp; Standard Reference</th>
                  <th className="p-3.5">Category Track</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Next Topic</th>
                  <th className="p-3.5">Target Date</th>
                  <th className="p-3.5">Doc Link / Path</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans text-slate-700">
                {filteredGoals.map((g) => {
                  const isDone = g.progress === 'Completed'
                  const isInProgress = g.progress === 'In Progress'

                  return (
                    <tr key={g.id} className="hover:bg-slate-50/80 transition">
                      {/* Checkbox / Toggle status */}
                      <td className="p-3.5">
                        <button
                          onClick={() => toggleGoalProgress(g.id)}
                          className="focus:outline-none"
                          title="Click to toggle status: Not Started -> In Progress -> Completed"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : isInProgress ? (
                            <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Topic Title & Notes */}
                      <td className="p-3.5 max-w-xs">
                        <div className={`font-bold text-slate-900 ${isDone ? 'line-through text-slate-400' : ''}`}>
                          {g.topic}
                        </div>
                        {g.notes && (
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                            {g.notes}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                          {g.category}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            g.priority === 'Critical'
                              ? 'bg-rose-100 text-rose-800'
                              : g.priority === 'High'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {g.priority}
                        </span>
                      </td>

                      {/* Next Topic */}
                      <td className="p-3.5 text-slate-600 font-medium">
                        {g.nextTopic || '—'}
                      </td>

                      {/* Target End Date */}
                      <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {g.endDate || g.date}
                      </td>

                      {/* File Path & Copy Action */}
                      <td className="p-3.5 font-mono text-[11px] text-slate-500 max-w-[170px]">
                        <button
                          onClick={() => handleCopyPath(g.filePath)}
                          className="flex items-center gap-1 hover:text-blue-600 transition truncate max-w-full text-left"
                          title={`Click to copy path:\n${g.filePath}`}
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{g.filePath ? g.filePath.split('/').pop() : 'DOC/Validation'}</span>
                        </button>
                        {copiedPath === g.filePath && (
                          <span className="text-[10px] text-emerald-600 font-bold block animate-fade-in">
                            Copied to clipboard!
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleDeleteGoal(g.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="Delete Milestone"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Target Companies & Tier-1 Hiring Guide */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-600" />
          Target Automotive Tier-1 Employers &amp; Hiring Requirements
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Top automotive engineering divisions seeking EMC Validation &amp; Design Engineers across ADAS, EV powertrain, and smart cockpits:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
              Continental
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">Tier 1</span>
            </h4>
            <p className="text-[11px] text-slate-600">
              Focus on ADAS radar, body controllers, ISO 11452-2 ALSE testing, and high-frequency stripline/microstrip stackup.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
              Valeo
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">Tier 1</span>
            </h4>
            <p className="text-[11px] text-slate-600">
              Focus on EV inverters, on-board chargers (OBC), 48V/800V DC-DC converters, and CISPR 25 Table H.1 HV shielded validation.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
              ZF Friedrichshafen
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">Tier 1</span>
            </h4>
            <p className="text-[11px] text-slate-600">
              Focus on electric drive units (e-axle), transmission ECUs, ISO 11452-4 BCI / TWC, and solid ground plane layout integrity.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
              Bosch &amp; EV Startups
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">OEM / Tier 1</span>
            </h4>
            <p className="text-[11px] text-slate-600">
              Focus on Battery Management Systems (BMS), high di/dt switching noise mitigation, π-filter design, and LTspice simulation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
