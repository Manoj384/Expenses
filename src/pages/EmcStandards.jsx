import { useState, useMemo } from 'react'
import Layout from '../components/Layout'
import {
  Radio,
  Zap,
  Activity,
  Shield,
  Layers,
  Search,
  BookOpen,
  Filter,
  Calculator,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Cpu,
  Waves,
  Gauge,
  Compass,
  ArrowRightLeft,
  Volume2,
  Boxes,
  Maximize2,
  TrendingUp,
  FileText,
  Printer,
  ShieldAlert,
  Target,
  GraduationCap,
} from 'lucide-react'
import EmcDetailModal from '../components/emc/EmcDetailModal'
import EmcGoals from '../components/emc/EmcGoals'
import ElectronicsLearnings from '../components/emc/ElectronicsLearnings'
import EmcAiAssistant from '../components/emc/EmcAiAssistant'
import EmcPdfViewerModal from '../components/emc/EmcPdfViewerModal'
import { Cispr25Exact2021Chart } from '../components/emc/EmcLimitCharts'

// Comprehensive Data for ISO 11452 Series (Parts 1 to 11) Extracted from Official ISO Standards
const ISO_11452_STANDARDS = [
  {
    id: 'iso-11452-2',
    part: 'ISO 11452-2:2019',
    title: 'Absorber-Lined Shielded Enclosure (ALSE)',
    type: 'Radiated Immunity (80 MHz – 18 GHz / 6 GHz Automotive Focus)',
    freqRange: '80 MHz to 18 GHz (Automotive Core: 80 MHz – 6.0 GHz)',
    severity: 'Level I: 30 V/m • Level II: 60 V/m • Level III: 100 V/m • Level IV: 200 V/m',
    modulation: 'CW, AM (1 kHz, 80%), Pulse Modulation (PM 217 Hz, 12.5% duty / 1 kHz 50%)',
    summary: 'The primary automotive radiated immunity standard (ISO 11452-2:2019). Uses an absorber-lined anechoic chamber to expose the ECU and wiring harness to uniform E-fields up to 6 GHz / 18 GHz (covering 5G NR, Wi-Fi 5.8 GHz, V2X, DSRC, and GNSS).',
    setupDetails: [
      'DUT and harness placed on an elevated non-conductive table 50 mm above a grounded metallic ground plane (Cu/Brass/Al, thickness ≥ 0.5 mm).',
      'Test harness length standardized to 1,000 mm (± 100 mm) running parallel to the ground plane edge.',
      'Artificial Networks (5 µH LISN / AN) connected to power supply lines; HV-AN used for shielded EV high-voltage systems (Annex A).',
      'Antennas: Biconical (80–200 MHz), Log-Periodic (200–1000 MHz), and Horn / DRG (1.0–18 GHz / 6.0 GHz) placed at 1.0 m calibrated distance.',
      'Field calibration performed via Substitution Method (ISO 11452-1 Clause 7) with isotropic E-field probe prior to test.',
      'Grounding: Remote grounding (return line through LISN) or Local grounding (chassis bond < 200 mm, bond resistance < 2.5 mΩ).',
    ],
    keyParameters: [
      { label: 'Official Edition', value: 'ISO 11452-2:2019' },
      { label: 'Standard Frequency Scope', value: '80 MHz to 18 GHz' },
      { label: 'Test Distance', value: '1.0 meter ± 10 mm' },
      { label: 'Harness Length', value: '1000 mm ± 100 mm' },
      { label: 'Table Height', value: '900 mm ± 100 mm' },
      { label: 'Normative Annexes', value: 'Annex A (Grounding), Annex B (FPSC Levels)' },
    ],
    oemApplications: 'All electronic control units (ECUs), ADAS radar, infotainment, telematics, 5G TCU, BMS, and powertrain controllers.',
    icon: Waves,
    color: 'emerald',
  },
  {
    id: 'iso-11452-3',
    part: 'ISO 11452-3:2024',
    title: 'Transverse Electromagnetic (TEM) Cell',
    type: 'Radiated Immunity (10 kHz – 200 MHz / up to 800 MHz)',
    freqRange: '0.01 MHz (10 kHz) to 200 MHz (Cutoff limit f_cutoff = c / 2w)',
    severity: 'Level I: 25 V/m • Level II: 50 V/m • Level III: 100 V/m • Level IV: 200 V/m',
    modulation: 'CW, AM (1 kHz, 80%), Pulse Modulation (PM)',
    summary: 'Standardized TEM transmission line cell (ISO/FDIS 11452-3:2024). Generates a pure, uniform transverse electromagnetic field (TEM mode) inside an enclosed 50Ω rectangular coaxial structure without external RF emissions or anechoic chambers.',
    setupDetails: [
      'DUT placed on an insulated support inside the active test region below the center septum.',
      'Strict physical constraint: Maximum DUT height must not exceed 1/3 of the septum-to-ground distance (h_DUT < d/3) to prevent field distortion and TE/TM higher-order mode resonance.',
      'Harness exits through shielded filter connectors on the outer cell wall (Annex C low-pass filter design).',
      'Field calculation is direct: E = V / d, where V is septum RF voltage and d is distance from septum to ground.',
      'Zero external RF emissions—fully self-shielded test environment.',
    ],
    keyParameters: [
      { label: 'Official Edition', value: 'ISO/FDIS 11452-3:2024' },
      { label: 'Impedance', value: '50 Ω characteristic line' },
      { label: 'DUT Height Limit', value: 'h < d/3 of active region' },
      { label: 'Field Uniformity', value: '± 1 dB within test volume' },
      { label: 'Normative Annexes', value: 'Annex A (Cell Dimensions), Annex E (Test Levels)' },
    ],
    oemApplications: 'Small sensors, microcontrollers, smart switches, key fobs, and compact sub-modules.',
    icon: Boxes,
    color: 'blue',
  },
  {
    id: 'iso-11452-4',
    part: 'ISO 11452-4:2020',
    title: 'Bulk Current Injection (BCI) & Tubular Wave Coupler (TWC)',
    type: 'Conducted / Induced RF Immunity (100 kHz – 3.0 GHz)',
    freqRange: 'BCI: 100 kHz – 400 MHz • TWC: 400 MHz – 3.0 GHz',
    severity: 'Class I: 30 mA • Class II: 60 mA • Class III: 100 mA • Class IV: 200 mA • Class V: 300 mA',
    modulation: 'CW, AM (1 kHz, 80%), Pulse Modulation (1 kHz 50% / PM 217 Hz)',
    summary: 'High-frequency current clamp induction and wave coupling standard (ISO 11452-4:2020). Simulates intense RF currents induced onto vehicle wire harnesses from broadcast stations, mobile transmitters, and radar.',
    setupDetails: [
      'Injection clamp placed around the entire wire harness at standardized distances: 150 mm, 450 mm, and 750 mm from DUT connector.',
      'Current monitor probe placed exactly 50 mm from DUT connector to measure induced RF current.',
      'Substitution Method: Forward RF power calibrated in a 50 Ω coaxial jig (Annex A) prior to DUT test.',
      'Closed-Loop Levelling Method: Injects power until target current or forward power limit is reached.',
      'Tubular Wave Coupler (TWC) replaces inductive clamps above 400 MHz for TEM wave coupling up to 3.0 GHz on long harnesses.',
      'Includes HV-AN (High Voltage Artificial Networks) for DUTs powered by shielded EV/HEV high-voltage lines.',
    ],
    keyParameters: [
      { label: 'Official Edition', value: 'ISO 11452-4:2020' },
      { label: 'BCI Frequency Span', value: '100 kHz to 400 MHz' },
      { label: 'TWC Frequency Span', value: '400 MHz to 3.0 GHz' },
      { label: 'Injection Positions', value: '150 mm, 450 mm, 750 mm' },
      { label: 'Monitor Probe Distance', value: '50 mm from DUT connector' },
      { label: 'Normative Annexes', value: 'Annex A (50Ω Calibration Fixture), Annex D (Levels)' },
    ],
    oemApplications: 'Essential for all automotive ECUs; safety-critical chassis, braking, steering, and gateway nodes.',
    icon: Activity,
    color: 'purple',
  },
  {
    id: 'iso-11452-5',
    part: 'ISO 11452-5:2002',
    title: 'Stripline Method',
    type: 'Radiated Immunity (Harness Focused, 10 kHz – 400 MHz)',
    freqRange: '0.01 MHz (10 kHz) to 400 MHz',
    severity: 'Level I: 25 V/m • Level II: 50 V/m • Level III: 100 V/m • Level IV: 200 V/m',
    modulation: 'CW, AM (1 kHz, 80%), Pulse Modulation (PM)',
    summary: 'Open transmission line conductor suspended over a metallic ground plane (ISO 11452-5:2002). Generates uniform transverse electromagnetic fields to evaluate immunity of long wire harnesses (L > 1000 mm).',
    setupDetails: [
      'Active stripline conductor suspended 150 mm above ground plane.',
      'Automotive wiring harness placed directly beneath the active line on a 50 mm insulating support.',
      'Stripline terminated at one end into matching non-inductive RF load (50 Ω or 90 Ω).',
      'DUT is located outside or at the edge of the stripline active region.',
      'Calculated field: E = V / h where h is stripline height.',
    ],
    keyParameters: [
      { label: 'Official Edition', value: 'ISO 11452-5:2002' },
      { label: 'Impedance Options', value: '50 Ω or 90 Ω' },
      { label: 'Conductor Height', value: '150 mm above ground plane' },
      { label: 'Harness Support', value: '50 mm elevation' },
      { label: 'Normative Annexes', value: 'Annex B (FPSC Test Levels), Annex C (AN Schematic)' },
    ],
    oemApplications: 'Long cable harnesses, door harnesses, lighting harnesses, and body electronics.',
    icon: Layers,
    color: 'amber',
  },
  {
    id: 'iso-11452-6',
    part: 'ISO 11452-6:1997',
    title: 'Parallel Plate (TEM Line)',
    type: 'Radiated Immunity (Low Frequency, 10 kHz – 200 MHz)',
    freqRange: '10 kHz to 200 MHz (Primary: 10 kHz – 20 MHz)',
    severity: 'Level I: 25 V/m • Level II: 50 V/m • Level III: 100 V/m',
    modulation: 'CW, AM (1 kHz, 80%), PM',
    summary: 'Low-frequency parallel plate antenna generating uniform vertical E-fields between two metallic plates for early-stage ECU module evaluation.',
    setupDetails: [
      'Two parallel conducting plates separated by dielectric or air space.',
      'DUT and short harness segment installed between the plates.',
      'Matched with resistive network at termination end.',
      'Monitored with small field probes and optical telemetry converters.',
    ],
    keyParameters: [
      { label: 'Official Edition', value: 'ISO 11452-6:1997' },
      { label: 'Frequency Scope', value: '10 kHz – 200 MHz' },
      { label: 'Field Mode', value: 'TEM Mode' },
      { label: 'Normative Annexes', value: 'Annex A (FPSC Levels), Annex B (Power vs Field)' },
    ],
    oemApplications: 'Early-stage low frequency ECU verification and sensors.',
    icon: Layers,
    color: 'slate',
  },
  {
    id: 'iso-11452-7',
    part: 'ISO 11452-7:2003',
    title: 'Direct Power Injection (DPI)',
    type: 'Conducted RF Pin-Level Immunity (250 kHz – 500 MHz / up to 1 GHz)',
    freqRange: '0.25 MHz (250 kHz) to 500 MHz (Extended up to 1.0 GHz)',
    severity: '20 dBm to 37 dBm forward power (Up to 5 Watts forward power)',
    modulation: 'CW, AM (1 kHz, 80%)',
    summary: 'Capacitive direct RF power coupling into individual ECU connector pins, I/O lines, and power supply pins via 50Ω directional coupler and DC-blocking capacitor (ISO 11452-7:2003 / IEC 62132 aligned).',
    setupDetails: [
      'RF signal generator + linear power amplifier feed RF power via 6.8 nF high-voltage RF blocking capacitor directly into pin under test.',
      'Broadband Artificial Network (BAN - Annex A) isolates the DC power supply while maintaining 50 Ω RF injection path.',
      'Directional coupler monitors forward and reflected RF power.',
      'Pin under test stressed while all other I/O pins terminate into representative vehicle loads.',
      'Pinpoints exact IC-level silicon susceptibility thresholds without harness shielding dependencies.',
    ],
    keyParameters: [
      { label: 'Official Edition', value: 'ISO 11452-7:2003' },
      { label: 'Coupling Capacitor', value: '6.8 nF (High-voltage RF)' },
      { label: 'Max Forward Power', value: '37 dBm (5 Watts)' },
      { label: 'Impedance Match', value: '50 Ω network' },
      { label: 'Normative Annexes', value: 'Annex A (BAN Design), Annex B (FPSC Levels)' },
    ],
    oemApplications: 'Microcontroller I/O pins, CAN/LIN transceivers, analogue sensor inputs, gate drivers.',
    icon: Zap,
    color: 'rose',
  },
  {
    id: 'iso-11452-8',
    part: 'ISO 11452-8:2015',
    title: 'Immunity to Magnetic Fields',
    type: 'Low-Frequency Magnetic Immunity (DC & 15 Hz – 150 kHz)',
    freqRange: 'd.c. and 15 Hz to 150 kHz',
    severity: 'Level I: 1 A/m • Level II: 10 A/m • Level III: 30 A/m • Level IV: 100 A/m • Level V: 1000 A/m (~1.25 mT)',
    modulation: 'CW sinusoidal, Square wave',
    summary: 'Exposes automotive electronic components to intense low-frequency magnetic fields (ISO 11452-8:2015). Critical for high-voltage EV traction inverters, AC on-board chargers, high-current busbars, and Hall sensors.',
    setupDetails: [
      'Radiating Loop Method: 120 mm diameter coil (20 turns AWG12 wire as per MIL-STD-461F) placed 50 mm from DUT surface, swept across all module faces.',
      'Helmholtz Coil Method: Pair of coaxial coils generating a uniform 3-axis magnetic volume for complete module immersion.',
      'Continuous exposure up to 1000 A/m (and DC magnetic fields up to 3000 A/m for EV battery contactors).',
      'Shielded chamber is NOT required for ISO 11452-8.',
    ],
    keyParameters: [
      { label: 'Official Edition', value: 'ISO 11452-8:2015' },
      { label: 'Radiating Loop Diameter', value: '120 mm (20 turns AWG12)' },
      { label: 'Test Distance', value: '50 mm from DUT surface' },
      { label: 'Helmholtz Uniformity', value: '± 1 dB within test volume' },
      { label: 'Max Field Strength', value: '1000 A/m (~1.25 mT / 3000 A/m DC)' },
      { label: 'Normative Annexes', value: 'Annex A (FPSC & Severity Levels)' },
    ],
    oemApplications: 'EV / HEV Inverters, Battery Management Systems (BMS), Hall current sensors, e-steering torque sensors.',
    icon: Compass,
    color: 'cyan',
  },
  {
    id: 'iso-11452-9',
    part: 'ISO 11452-9:2021',
    title: 'Immunity to Portable Transmitters',
    type: 'Close-Proximity Radiated Immunity (142 MHz – 6.0 GHz)',
    freqRange: '142 MHz to 6.0 GHz (Major 2021 Edition Update)',
    severity: '5 Watts to 25 Watts transmitter equivalent forward power (Up to 300 V/m localized)',
    modulation: 'CW, AM (1 kHz 80%), Pulse Modulation (TDMA, 217 Hz 12.5%, 50 Hz, GSM pulse trains)',
    summary: 'Evaluates localized RF immunity from hand-held walkie-talkies, cellular phones (4G/5G), and keyless entry transmitters operated in close proximity to vehicle modules (ISO 11452-9:2021).',
    setupDetails: [
      'Standardized dedicated antennas: Tuned dipoles, broadband biconical antennas, sleeve antennas, log-spirals, and horns.',
      'Antenna positioned at 50 mm and 100 mm distances directly facing ECU connectors and harness breakouts.',
      'Grid scan performed over all surfaces of the DUT enclosure and wiring harness.',
      'Forward power calibrated via directional coupler and net power characterization (Annex A).',
      'Incorporates High Voltage Artificial Networks (HV-AN) for shielded EV/HEV components.',
    ],
    keyParameters: [
      { label: 'Official Edition', value: 'ISO 11452-9:2021' },
      { label: 'Frequency Scope', value: '142 MHz to 6.0 GHz' },
      { label: 'Antenna Proximity', value: '50 mm & 100 mm distance' },
      { label: 'Test Frequencies', value: 'TETRA, GSM850/900/1800, LTE, 5G NR, ISM 2.4/5.8 GHz' },
      { label: 'Max Forward Power', value: 'Up to 25 Watts' },
      { label: 'Normative Annexes', value: 'Annex A (Net Power Characterization), Annex D (Levels)' },
    ],
    oemApplications: 'Cockpit displays, steering wheel switch clusters, keyless fobs, telematics control units (TCU), infotainment.',
    icon: Radio,
    color: 'orange',
  },
  {
    id: 'iso-11452-10',
    part: 'ISO 11452-10:2009',
    title: 'Conducted Audio-Frequency Disturbances',
    type: 'Conducted Low-Frequency Ripple ($U_{pp}$, 10 Hz – 250 kHz)',
    freqRange: '10 Hz to 250 kHz',
    severity: 'Level I: 0.5 Vpp • Level II: 1.0 Vpp • Level III: 2.0 Vpp • Level IV: 6.0 Vpp • Level V: 10 Vpp ($I_{rms} \\le 1\\text{ A}$)',
    modulation: 'Sinusoidal AC ripple superimposed on DC supply rail',
    summary: 'Evaluates susceptibility to alternator AC ripple, switching converter harmonics, and sub-harmonic audio frequencies superimposed on vehicle 12V/24V/48V supply lines (ISO 11452-10:2009).',
    setupDetails: [
      'Audio power amplifier connected via an isolation injection transformer in series with the positive DC supply rail.',
      'Source impedance maintained < 0.5 Ω (15 Hz to 50 kHz) and ≤ 2.0 Ω (50 kHz to 250 kHz) at transformer output.',
      'Oscilloscope monitors ripple amplitude (Upp) across the DUT supply terminals.',
      'Simultaneously monitors injected test current to ensure Irms ≤ 1.0 A limit.',
      'Ensures internal DC-DC converters, linear regulators, and audio circuits operate without reset or audible hum.',
    ],
    keyParameters: [
      { label: 'Official Edition', value: 'ISO 11452-10:2009' },
      { label: 'Coupling Mechanism', value: 'Series Audio Isolation Transformer' },
      { label: 'Source Impedance', value: '< 0.5 Ω (15–50 kHz) / ≤ 2.0 Ω (50–250 kHz)' },
      { label: 'Current Limit', value: 'Irms ≤ 1.0 A' },
      { label: 'Ripple Voltage', value: 'Up to 10 V peak-to-peak (Upp)' },
      { label: 'Normative Annexes', value: 'Annex A (FPSC Status & Levels)' },
    ],
    oemApplications: 'Infotainment audio amplifiers, microcontrollers, sensor power supplies, engine control units.',
    icon: Volume2,
    color: 'teal',
  },
  {
    id: 'iso-11452-11',
    part: 'ISO 11452-11:2010',
    title: 'Reverberation Chamber (RVC)',
    type: 'Mode-Stirred Radiated Immunity (LUF to 18 GHz)',
    freqRange: 'Lowest Usable Frequency (LUF: ~200 MHz) to 18 GHz',
    severity: 'Level I: 50 V/m • Level II: 100 V/m • Level III: 200 V/m • Level IV: 600 V/m • Level V: 1000 V/m',
    modulation: 'CW, AM (1 kHz, 80%), Radar Pulse',
    summary: 'High-Q shielded cavity with continuous or stepped rotating metallic stirrers generating a statistically uniform, isotropic, randomly polarized high-intensity electromagnetic field (ISO 11452-11:2010).',
    setupDetails: [
      'DUT and harness placed inside the working volume of the reverberation chamber.',
      'Tuner / stirrer paddle rotates 360° continuously (mode-stirred) or in discrete steps (mode-tuned, e.g. 50 to 200 tuner steps per frequency).',
      'Generates extreme field strengths (e.g. 600 V/m for automotive radar pulse immunity) with modest RF input power due to high chamber Q factor.',
      'Tests all angles of arrival and polarizations simultaneously without repositioning antennas.',
    ],
    keyParameters: [
      { label: 'Official Edition', value: 'ISO 11452-11:2010' },
      { label: 'Working Volume', value: 'Defined by chamber Lowest Usable Frequency (LUF)' },
      { label: 'Stirrer Operation', value: 'Mode-Tuned / Mode-Stirred (50–200 steps/rev)' },
      { label: 'Polarization', value: 'Statistically Isotropic / Random' },
      { label: 'Normative Annexes', value: 'Annex A (FPSC Levels), Annex B (Chamber Characterization)' },
    ],
    oemApplications: 'Automotive radar modules, airbag squib controllers, high-reliability autonomous driving domain controllers.',
    icon: Sliders,
    color: 'indigo',
  },
]

// Comprehensive Data for CISPR 25 (Radio Disturbance Emissions)
const CISPR_25_MODULES = [
  {
    id: 'cispr-25-ce',
    category: 'Conducted Emissions (CE)',
    title: 'Conducted Emissions — Voltage Method (5 µH LISN)',
    freqRange: '0.15 MHz (150 kHz) to 108 MHz',
    summary: 'Measures RF disturbance voltages conducted back onto vehicle DC power supply lines (12V / 24V / 48V / HV) using Artificial Networks and CISPR 16-1-1 receivers.',
    methods: [
      {
        name: '50 Ω / 5 µH Artificial Network (AN / LISN)',
        desc: 'Inserted on both Positive (+) and Return (-) supply leads to provide standardized 50 Ω impedance across the 150 kHz–108 MHz band.',
      },
      {
        name: 'Receiver Detectors',
        desc: 'Peak (PK), Quasi-Peak (QP), and Average (AVG) detectors evaluated against Class 1 to Class 5 limits in dBµV.',
      },
      {
        name: 'Harness Length',
        desc: 'Standardized to 200 mm between LISN and DUT connector (+ 1700 mm for radiated harness).',
      },
    ],
    icon: Zap,
    color: 'pink',
  },
  {
    id: 'cispr-25-current',
    category: 'Conducted Emissions (CE)',
    title: 'Conducted Emissions — Current Probe Method',
    freqRange: '0.15 MHz (150 kHz) to 245 MHz',
    summary: 'Measures high-frequency common-mode RF noise currents conducted on control, sensor, and communication signal harnesses without physical pin contact.',
    methods: [
      {
        name: 'HF Current Probe',
        desc: 'Clamped around entire wiring harness bundle at 50 mm and 750 mm from DUT connector.',
      },
      {
        name: 'Signal & Power Lines',
        desc: 'Particularly valuable for CAN-FD, LIN, Automotive Ethernet (100BASE-T1 / 1000BASE-T1), and sensor buses.',
      },
      {
        name: 'Limits in dBµA',
        desc: 'Evaluates common-mode currents in dBµA to prevent harness radiation in vehicle.',
      },
    ],
    icon: Activity,
    color: 'indigo',
  },
  {
    id: 'cispr-25-re',
    category: 'Radiated Emissions (RE)',
    title: 'Radiated Emissions — ALSE Method (1.0m Chamber)',
    freqRange: '0.15 MHz (150 kHz) to 5.925 GHz / 6.0 GHz',
    summary: 'Measures electromagnetic field radiation emitted from the ECU enclosure and harness inside an Absorber-Lined Shielded Enclosure at 1.0 meter distance across all protected radio bands.',
    methods: [
      {
        name: '0.15 – 30 MHz: 1.0 m Active Rod Monopole',
        desc: 'Vertically polarized rod antenna with 50 Ω impedance matching base unit mounted to counterpoise.',
      },
      {
        name: '30 – 200 MHz: Biconical Antenna',
        desc: 'Evaluated in both Vertical and Horizontal polarizations, centered at harness midpoint.',
      },
      {
        name: '200 – 1000 MHz: Log-Periodic Antenna',
        desc: 'Broadband directional antenna placed 1.0 m away from the harness reference edge.',
      },
      {
        name: '1.0 – 6.0 GHz: DRG Horn Antenna',
        desc: 'Dual-ridged waveguide horn antenna covering GNSS (GPS L1/L5), Cellular, Wi-Fi 2.4/5.8G, and 5G NR bands.',
      },
    ],
    icon: Radio,
    color: 'cyan',
  },
  {
    id: 'cispr-25-hv',
    category: 'EV / High Voltage (HV)',
    title: 'EV / HEV High-Voltage (HV) Shielded Component Testing',
    freqRange: '0.15 MHz to 108 MHz (Conducted) & up to 6.0 GHz (Radiated)',
    summary: 'Specialized CISPR 25 Ed. 4/5 Annex I requirements for electric vehicle traction inverters, on-board chargers (OBC), DC-DC converters, and battery systems.',
    methods: [
      {
        name: 'Dual High-Voltage LISNs (HV-AN)',
        desc: 'Dedicated 50 Ω / 5 µH HV-LISN network rated for 800V/1000V DC with shielded coaxial terminations.',
      },
      {
        name: 'Shielded Harness Testing',
        desc: '360° circumferential shield bonding to ground plane at both LISN and DUT bulkhead connectors.',
      },
      {
        name: 'Separate LV & HV Characterization',
        desc: 'Tests conducted noise on 12V low-voltage auxiliary bus and 400V/800V high-voltage bus simultaneously.',
      },
    ],
    icon: Cpu,
    color: 'emerald',
  },
]

// Protected Frequency Bands Table Data
const PROTECTED_BANDS = [
  { service: 'Long Wave (LW)', freq: '150 – 280 kHz', class5_pk: '70 dBµV', class5_avg: '60 dBµV', re_pk: '50 dBµV/m', re_avg: '40 dBµV/m' },
  { service: 'Medium Wave (MW / AM)', freq: '530 – 1700 kHz', class5_pk: '54 dBµV', class5_avg: '30 dBµV', re_pk: '34 dBµV/m', re_avg: '10 dBµV/m' },
  { service: 'Short Wave (SW)', freq: '5.9 – 26.1 MHz', class5_pk: '40 dBµV', class5_avg: '30 dBµV', re_pk: '20 dBµV/m', re_avg: '10 dBµV/m' },
  { service: 'CB Radio', freq: '26 – 28 MHz', class5_pk: '38 dBµV', class5_avg: '28 dBµV', re_pk: '22 dBµV/m', re_avg: '12 dBµV/m' },
  { service: 'FM Broadcast (VHF)', freq: '87.5 – 108 MHz', class5_pk: '30 dBµV', class5_avg: '20 dBµV', re_pk: '12 dBµV/m', re_avg: '2 dBµV/m' },
  { service: 'DAB (Band III)', freq: '174 – 230 MHz', class5_pk: '32 dBµV', class5_avg: '22 dBµV', re_pk: '14 dBµV/m', re_avg: '4 dBµV/m' },
  { service: 'TETRA / Emergency Radio', freq: '380 – 400 MHz', class5_pk: '36 dBµV', class5_avg: '26 dBµV', re_pk: '18 dBµV/m', re_avg: '8 dBµV/m' },
  { service: 'GSM 850 / 900 MHz', freq: '824 – 960 MHz', class5_pk: '—', class5_avg: '—', re_pk: '27 dBµV/m', re_avg: '17 dBµV/m' },
  { service: 'GPS L1 / GLONASS', freq: '1565 – 1610 MHz', class5_pk: '—', class5_avg: '—', re_pk: '15 dBµV/m', re_avg: '-5 dBµV/m (Ultra-Strict)' },
  { service: '4G LTE / 5G NR (Mid-Band)', freq: '1800 – 2690 MHz', class5_pk: '—', class5_avg: '—', re_pk: '30 dBµV/m', re_avg: '20 dBµV/m' },
  { service: 'Wi-Fi 2.4 GHz / Bluetooth', freq: '2400 – 2483.5 MHz', class5_pk: '—', class5_avg: '—', re_pk: '30 dBµV/m', re_avg: '20 dBµV/m' },
  { service: 'DSRC / Wi-Fi 5.8 GHz', freq: '5725 – 5875 MHz', class5_pk: '—', class5_avg: '—', re_pk: '35 dBµV/m', re_avg: '25 dBµV/m' },
]

export default function EmcStandards() {
  const [activeTab, setActiveTab] = useState('iso') // iso, cispr, ai, calculators, goals, learnings
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStandard, setSelectedStandard] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Interactive Engineering Calculators State
  const [calcMode, setCalcMode] = useState('dbuv_to_dbm')
  const [inputVal, setInputVal] = useState('60')
  const [impedance, setImpedance] = useState('50')
  
  const [rfPowerWatts, setRfPowerWatts] = useState('100')
  const [antennaGainDbi, setAntennaGainDbi] = useState('6')
  const [calcDistance, setCalcDistance] = useState('1.0')

  const [frequencyMhz, setFrequencyMhz] = useState('100')

  // Calculator Math
  const conversionResults = useMemo(() => {
    const val = parseFloat(inputVal) || 0
    const z = parseFloat(impedance) || 50

    if (calcMode === 'dbuv_to_dbm') {
      const dbm = val - 90 - 10 * Math.log10(z)
      const v_uv = Math.pow(10, val / 20)
      const v_mv = v_uv / 1000
      const v_volts = v_uv / 1000000
      const p_watts = Math.pow(10, dbm / 10) / 1000
      return {
        dbm: dbm.toFixed(2),
        v_uv: v_uv.toFixed(2),
        v_mv: v_mv.toFixed(4),
        v_volts: v_volts.toFixed(6),
        p_watts: p_watts < 0.001 ? p_watts.toExponential(3) : p_watts.toFixed(4),
      }
    } else {
      const dbuv = val + 90 + 10 * Math.log10(z)
      const p_watts = Math.pow(10, val / 10) / 1000
      const v_volts = Math.sqrt(p_watts * z)
      const v_mv = v_volts * 1000
      const v_uv = v_volts * 1000000
      return {
        dbuv: dbuv.toFixed(2),
        v_uv: v_uv.toFixed(2),
        v_mv: v_mv.toFixed(4),
        v_volts: v_volts.toFixed(6),
        p_watts: p_watts < 0.001 ? p_watts.toExponential(3) : p_watts.toFixed(4),
      }
    }
  }, [calcMode, inputVal, impedance])

  const eFieldResult = useMemo(() => {
    const p = parseFloat(rfPowerWatts) || 1
    const gDbi = parseFloat(antennaGainDbi) || 0
    const d = parseFloat(calcDistance) || 1
    const gLinear = Math.pow(10, gDbi / 10)
    
    // E = sqrt(30 * P * G) / d
    const eField = Math.sqrt(30 * p * gLinear) / d
    const eFieldDbuV = 20 * Math.log10(eField * 1e6)

    return {
      vPerM: eField.toFixed(2),
      dbuVPerM: eFieldDbuV.toFixed(2),
    }
  }, [rfPowerWatts, antennaGainDbi, calcDistance])

  const wavelengthResult = useMemo(() => {
    const fMhz = parseFloat(frequencyMhz) || 100
    const fHz = fMhz * 1e6
    const c = 299792458
    const lambdaM = c / fHz
    const lambdaMm = lambdaM * 1000
    const quarterLambdaMm = lambdaMm / 4
    const halfLambdaMm = lambdaMm / 2

    return {
      lambdaM: lambdaM.toFixed(3),
      lambdaMm: lambdaMm.toFixed(1),
      quarterLambdaMm: quarterLambdaMm.toFixed(1),
      halfLambdaMm: halfLambdaMm.toFixed(1),
    }
  }, [frequencyMhz])

  // PDF Viewer Modal State
  const [viewerPdfUrl, setViewerPdfUrl] = useState('')
  const [viewerPdfTitle, setViewerPdfTitle] = useState('')
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)

  const handleViewPdf = (url, title) => {
    setViewerPdfUrl(url)
    setViewerPdfTitle(title)
    setIsPdfModalOpen(true)
  }

  // Open full-screen deep dive modal
  const handleOpenStandard = (std) => {
    setSelectedStandard(std)
    setIsModalOpen(true)
  }

  // Filtered ISO standards
  const filteredIso = useMemo(() => {
    return ISO_11452_STANDARDS.filter((s) => {
      const q = searchTerm.toLowerCase()
      return (
        s.part.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q) ||
        s.freqRange.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q)
      )
    })
  }, [searchTerm])

  // Filtered CISPR modules
  const filteredCispr = useMemo(() => {
    return CISPR_25_MODULES.filter((m) => {
      const q = searchTerm.toLowerCase()
      return (
        m.category.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        m.freqRange.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q)
      )
    })
  }, [searchTerm])

  return (
    <Layout>
      <div className="space-y-8 pb-16 bg-slate-50 min-h-screen">
        
        {/* Header Hero Banner (Light Theme) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-blue-50/50 to-indigo-50/70 border border-blue-200/80 p-6 sm:p-8 shadow-sm">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 border border-blue-200 text-blue-800 text-xs font-bold tracking-wide uppercase">
                <Radio className="w-3.5 h-3.5 animate-pulse text-blue-600" />
                Automotive Electromagnetic Compatibility Engineering Suite
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                EMC Standards — <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700">ISO 11452 & CISPR 25</span>
              </h1>
              <p className="text-slate-600 text-sm sm:text-base max-w-3xl leading-relaxed">
                Full compliance portal with light-theme technical schematics, frequency limit curves, setup geometries, class matrices, and RF calculators for Tier-1 ECUs, EV battery systems, and connected vehicle nodes.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
                <span className="text-2xl font-extrabold text-blue-600 block font-mono">10</span>
                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">ISO 11452 Parts (2-11)</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
                <span className="text-2xl font-extrabold text-pink-600 block font-mono">Class 1-5</span>
                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">CISPR 25 Limits</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Search & Nav Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'iso', label: 'ISO 11452 Immunity (Parts 2-11)', icon: Waves },
              { id: 'cispr', label: 'CISPR 25 Emissions', icon: Zap },
              { id: 'ai', label: '🤖 EMC AI Copilot & PDF Brain', icon: Sparkles },
              { id: 'calculators', label: '🧮 EMC Calculators', icon: Calculator },
              { id: 'goals', label: '🎯 Goals & Roadmap', icon: Target },
              { id: 'learnings', label: '📖 Learnings', icon: GraduationCap },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 whitespace-nowrap shadow-sm ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-blue-500/25 ring-2 ring-blue-500/50'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search standards, BCI, ALSE 6GHz, 5G..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm"
            />
          </div>
        </div>

        {/* SECTION 0: DEDICATED EMC AI COPILOT & AUTONOMOUS PDF INGESTION */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            <EmcAiAssistant onViewPdf={handleViewPdf} />
          </div>
        )}

        {/* SECTION 1: ISO 11452 SERIES (Parts 2 to 11) */}
        {activeTab === 'iso' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Waves className="w-5 h-5 text-blue-600" />
                  ISO 11452 Series — Road Vehicles Component Immunity to Electrical Disturbances
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any standard card to open the <strong className="text-blue-600">Full Screen Deep Dive Window</strong> with test schematics, severity levels, substitution calibration protocols, and PCB mitigation rules.
                </p>
              </div>
              <span className="text-xs font-mono bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200 font-bold">
                {filteredIso.length} Standard Methods
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredIso.map((std) => {
                const Icon = std.icon
                const partNum = std.part.split(':')[0].trim()
                const freq = std.freqRange.split('(')[0].trim()
                return (
                  <div
                    key={std.id}
                    onClick={() => handleOpenStandard(std)}
                    className="group cursor-pointer bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-400 rounded-xl p-3.5 transition duration-200 shadow-sm hover:shadow flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg group-hover:bg-blue-100 transition shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-700 transition truncate">
                          <span className="text-blue-700 font-mono font-extrabold">{partNum}</span>{' '}
                          <span className="text-slate-500 font-medium font-mono text-[11px] sm:text-xs">({freq})</span>{' '}
                          <span className="text-slate-800 font-semibold">{std.title}</span>
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 shrink-0 opacity-80 group-hover:opacity-100 transition">
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* SECTION 2: CISPR 25 EMISSIONS */}
        {activeTab === 'cispr' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-pink-600" />
                  CISPR 25 — Radio Disturbance Characteristics for the Protection of On-Board Receivers
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automotive emissions test methods, Class 1 to Class 5 severity thresholds, and Electric Vehicle (EV) high-voltage test setups.
                </p>
              </div>
              <span className="text-xs font-mono bg-pink-100 text-pink-700 px-3 py-1 rounded-full border border-pink-200 font-bold">
                CISPR 25 Ed. 4 / 5
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCispr.map((mod) => {
                const Icon = mod.icon
                const freq = mod.freqRange.split('(')[0].trim()
                return (
                  <div
                    key={mod.id}
                    onClick={() => handleOpenStandard(mod)}
                    className="group cursor-pointer bg-white hover:bg-pink-50/50 border border-slate-200 hover:border-pink-400 rounded-xl p-3.5 transition duration-200 shadow-sm hover:shadow flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-pink-50 border border-pink-200 text-pink-600 rounded-lg group-hover:bg-pink-100 transition shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-pink-700 transition truncate">
                          <span className="text-pink-700 font-mono font-extrabold">CISPR 25</span>{' '}
                          <span className="text-slate-500 font-medium font-mono text-[11px] sm:text-xs">({freq})</span>{' '}
                          <span className="text-slate-800 font-semibold">{mod.title}</span>
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-pink-600 shrink-0 opacity-80 group-hover:opacity-100 transition">
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Official CISPR 25:2021 Interactive Limit Curve Viewer */}
            <div className="pt-2">
              <Cispr25Exact2021Chart initialTable="8" />
            </div>
          </div>
        )}

        {/* SECTION 3: INTERACTIVE EMC ENGINEERING CALCULATORS */}
        {activeTab === 'calculators' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600" />
                Automotive EMC RF Engineering Calculators
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Precision RF formulas used in compliance test laboratories for calibration, field generation, and harness resonance estimation.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
              {/* Tool 1: dBµV <-> dBm <-> Voltage Converter */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                    dBµV ↔ dBm & Voltage Converter
                  </h3>
                  <select
                    value={calcMode}
                    onChange={(e) => setCalcMode(e.target.value)}
                    className="bg-slate-50 text-xs text-blue-700 font-bold border border-slate-300 rounded-lg px-2 py-1 focus:outline-none"
                  >
                    <option value="dbuv_to_dbm">dBµV → dBm</option>
                    <option value="dbm_to_dbuv">dBm → dBµV</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-600 font-medium block mb-1">
                      Input Value ({calcMode === 'dbuv_to_dbm' ? 'dBµV' : 'dBm'}):
                    </label>
                    <input
                      type="number"
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 font-medium block mb-1">System Impedance (Z):</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['50', '75', '90'].map((z) => (
                        <button
                          key={z}
                          onClick={() => setImpedance(z)}
                          className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition ${
                            impedance === z
                              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {z} Ω
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Results */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center text-slate-700">
                      <span>{calcMode === 'dbuv_to_dbm' ? 'Power (dBm):' : 'Emission (dBµV):'}</span>
                      <span className="text-blue-700 font-bold text-sm">
                        {calcMode === 'dbuv_to_dbm' ? `${conversionResults.dbm} dBm` : `${conversionResults.dbuv} dBµV`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-700">
                      <span>Voltage (µV):</span>
                      <span className="text-emerald-700 font-bold">{conversionResults.v_uv} µV</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-700">
                      <span>Voltage (mV / V):</span>
                      <span className="text-amber-700 font-bold">{conversionResults.v_mv} mV ({conversionResults.v_volts} V)</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-700">
                      <span>Calculated Power:</span>
                      <span className="text-pink-700 font-bold">{conversionResults.p_watts} W</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tool 2: Radiated Immunity E-Field Strength Generator */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Waves className="w-4 h-4 text-emerald-600" />
                  Radiated E-Field Strength Estimator
                </h3>
                <p className="text-xs text-slate-500">
                  Calculates theoretical E-field in anechoic chamber: <span className="font-mono text-emerald-700 font-bold">E = √(30·P·G) / d</span>
                </p>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-600 font-medium block mb-1">RF Power (Watts):</label>
                      <input
                        type="number"
                        value={rfPowerWatts}
                        onChange={(e) => setRfPowerWatts(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 font-medium block mb-1">Antenna Gain (dBi):</label>
                      <input
                        type="number"
                        value={antennaGainDbi}
                        onChange={(e) => setAntennaGainDbi(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 font-medium block mb-1">Test Distance (meters):</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['1.0', '2.0', '3.0'].map((d) => (
                        <button
                          key={d}
                          onClick={() => setCalcDistance(d)}
                          className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition ${
                            calcDistance === d
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {d} m
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* E-Field Output */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center text-slate-700">
                      <span>Electric Field Strength:</span>
                      <span className="text-emerald-700 font-bold text-base">{eFieldResult.vPerM} V/m</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-700">
                      <span>Field in dBµV/m:</span>
                      <span className="text-cyan-700 font-bold">{eFieldResult.dbuVPerM} dBµV/m</span>
                    </div>
                    <div className="text-[11px] text-slate-500 pt-1 font-sans">
                      Target ISO 11452-2 Severities: 30 / 60 / 100 / 200 V/m
                    </div>
                  </div>
                </div>
              </div>

              {/* Tool 3: Resonant Harness & Wavelength Calculator */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-purple-600" />
                  Wavelength & Harness Resonances
                </h3>
                <p className="text-xs text-slate-500">
                  Calculates $\lambda$, $\lambda/2$, and $\lambda/4$ quarter-wave monopole antenna cable resonance.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-600 font-medium block mb-1">Frequency (MHz):</label>
                    <input
                      type="number"
                      value={frequencyMhz}
                      onChange={(e) => setFrequencyMhz(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { l: 'FM 100M', v: '100' },
                      { l: 'TETRA', v: '390' },
                      { l: 'GSM 900', v: '900' },
                      { l: 'GPS L1', v: '1575.42' },
                    ].map((btn) => (
                      <button
                        key={btn.l}
                        onClick={() => setFrequencyMhz(btn.v)}
                        className="py-1 text-[10px] font-mono font-bold bg-slate-50 text-purple-700 border border-slate-300 rounded hover:bg-slate-100"
                      >
                        {btn.l}
                      </button>
                    ))}
                  </div>

                  {/* Resonances Output */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center text-slate-700">
                      <span>Full Wavelength (λ):</span>
                      <span className="text-purple-700 font-bold">{wavelengthResult.lambdaM} m ({wavelengthResult.lambdaMm} mm)</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-700">
                      <span>Quarter-Wave (λ/4) Resonance:</span>
                      <span className="text-rose-700 font-bold">{wavelengthResult.quarterLambdaMm} mm</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-700">
                      <span>Half-Wave (λ/2) Resonance:</span>
                      <span className="text-amber-700 font-bold">{wavelengthResult.halfLambdaMm} mm</span>
                    </div>
                    <div className="text-[10px] text-slate-500 pt-1 font-sans">
                      ⚠️ If wiring harness length matches λ/4, it radiates maximum RF energy as a monopole antenna.
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* SECTION 4: EMC CAREER & ENGINEERING GOALS (SYNCED WITH GOALS/DOC) */}
        {activeTab === 'goals' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  EMC Engineering Goals, Capstone Projects &amp; Tier-1 Career Roadmap
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Synchronized with your official documentation (`Validation engineer &amp; EMC Design Engineer.xmind` &amp; `Goal Tracking.xlsx`).
                </p>
              </div>
            </div>

            <EmcGoals />
          </div>
        )}

        {/* SECTION 5: ELECTRONICS THEORY LEARNINGS (FROM BEGINNERS GUIDE 143-PAGE CURRICULUM) */}
        {activeTab === 'learnings' && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  Electronics Learnings &amp; Theory Hub
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comprehensive 7-module theory encyclopedia extracted directly from `The Theory Behind Electronics - A Beginners Guide`.
                </p>
              </div>
            </div>

            <ElectronicsLearnings onViewPdf={handleViewPdf} />
          </div>
        )}

      </div>

      {/* Full-Screen Deep Dive Modal */}
      <EmcDetailModal
        standard={selectedStandard}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onViewPdf={handleViewPdf}
      />

      {/* Embedded PDF Viewer Modal */}
      <EmcPdfViewerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        pdfUrl={viewerPdfUrl}
        title={viewerPdfTitle}
        onAnalyzeWithAi={(url, title) => {
          setActiveTab('ai')
        }}
      />
    </Layout>
  )
}
