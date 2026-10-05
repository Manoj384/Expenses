import React, { useState, useMemo } from 'react'
import {
  BookOpen,
  Zap,
  Activity,
  Flame,
  BatteryCharging,
  Radio,
  Cpu,
  Layers,
  Search,
  Calculator,
  Sliders,
  Sparkles,
  FileText,
  Shield,
  Gauge,
  Workflow,
  Compass,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Boxes,
  Waves,
  Maximize2,
  GraduationCap,
  Image as ImageIcon,
  X,
  Eye,
  Ruler,
  ExternalLink,
} from 'lucide-react'


const SLIDES_MAP = {
  // Course 1: Theory of Electronics
  "th-01": [
    { src: "/learnings/th-01_p2.png", caption: "Slide 2: Current, Voltage and Power Foundations" },
    { src: "/learnings/th-01_p3.png", caption: "Slide 3: Electric Current & Charge Carriers" },
    { src: "/learnings/th-01_p4.png", caption: "Slide 4: Starting with Atoms (Protons, Neutrons, Electrons)" }
  ],
  "th-02": [
    { src: "/learnings/th-02_p5.png", caption: "Slide 5: Atomic Structure & Valency" },
    { src: "/learnings/th-02_p6.png", caption: "Slide 6: Electric Charge & Coulomb Interaction" },
    { src: "/learnings/th-02_p9.png", caption: "Slide 9: Organized Current Flow in Conductors" },
    { src: "/learnings/th-02_p12.png", caption: "Slide 12: Current in a Closed Circuit Loop" },
    { src: "/learnings/th-02_p14.png", caption: "Slide 14: Electromotive Force & Voltage Potential" }
  ],
  "th-03": [
    { src: "/learnings/th-03_p4.png", caption: "Slide 4: Direct Current (DC) Steady State" },
    { src: "/learnings/th-03_p5.png", caption: "Slide 5: DC Constant Voltage vs Time" },
    { src: "/learnings/th-03_p9.png", caption: "Slide 9: Alternating Current (AC) Sinusoidal Frequency" },
    { src: "/learnings/th-03_p13.png", caption: "Slide 13: Generating AC via Rotating Alternators" },
    { src: "/learnings/th-03_p15.png", caption: "Slide 15: AC RMS vs Peak Heating Power" }
  ],
  "th-04": [
    { src: "/learnings/th-04_p4.png", caption: "Slide 4: Resistance & Conductive Opposition" },
    { src: "/learnings/th-04_p5.png", caption: "Slide 5: Resistive Heating (Joule I²R Dissipation)" },
    { src: "/learnings/th-04_p8.png", caption: "Slide 8: Discrete Resistors & Symbols" },
    { src: "/learnings/th-04_p10.png", caption: "Slide 10: Resistor Parameters & Standard Color Code Bands" },
    { src: "/learnings/th-04_p14.png", caption: "Slide 14: Variable Resistors (Rheostats vs Potentiometers)" },
    { src: "/learnings/th-04_p15.png", caption: "Slide 15: Variable Rheostat Current Regulation" }
  ],
  "th-05": [
    { src: "/learnings/th-05_p4.png", caption: "Slide 4: Capacitors & Construction" },
    { src: "/learnings/th-05_p6.png", caption: "Slide 6: Storing Energy in an Electrostatic Field" },
    { src: "/learnings/th-05_p9.png", caption: "Slide 9: RC Charging Time Constant (τ = R·C)" },
    { src: "/learnings/th-05_p12.png", caption: "Slide 12: Exponential RC Charging & Discharging Curves" },
    { src: "/learnings/th-05_p16.png", caption: "Slide 16: Ceramic MLCC vs Electrolytic Capacitors" },
    { src: "/learnings/th-05_p18.png", caption: "Slide 18: Aluminum and Tantalum Polarized Electrolytic" }
  ],
  "th-06": [
    { src: "/learnings/th-06_p4.png", caption: "Slide 4: Magnetic Fields from Current Carrying Wires" },
    { src: "/learnings/th-06_p6.png", caption: "Slide 6: Electromagnetism & Solenoids" },
    { src: "/learnings/th-06_p9.png", caption: "Slide 9: Magnetic Flux Linkage & Coils" },
    { src: "/learnings/th-06_p12.png", caption: "Slide 12: Time-Varying Current & Back-EMF" },
    { src: "/learnings/th-06_p15.png", caption: "Slide 15: Inductors & Ferrite Cores" },
    { src: "/learnings/th-06_p17.png", caption: "Slide 17: RL Time Constant (τ = L/R)" }
  ],
  "th-07": [
    { src: "/learnings/th-07_p4.png", caption: "Slide 4: What are Semiconductors (Silicon & Germanium)?" },
    { src: "/learnings/th-07_p5.png", caption: "Slide 5: Doping Silicon: P-type and N-type Junctions" },
    { src: "/learnings/th-07_p8.png", caption: "Slide 8: Diodes: Anode, Cathode & One-Way Conduction" },
    { src: "/learnings/th-07_p11.png", caption: "Slide 11: Transistors: Amplification & Switching" },
    { src: "/learnings/th-07_p14.png", caption: "Slide 14: BJT NPN & PNP Terminal Configurations" },
    { src: "/learnings/th-07_p17.png", caption: "Slide 17: Transistor Operating Modes (Cutoff, Saturation, Active)" }
  ],
  "th-08": [
    { src: "/learnings/th-08_p4.png", caption: "Slide 4: Circuit Topology (Branch Definition)" },
    { src: "/learnings/th-08_p6.png", caption: "Slide 6: Circuit Topology (Node & Loop Definitions)" },
    { src: "/learnings/th-08_p7.png", caption: "Slide 7: Series vs Parallel Elements" },
    { src: "/learnings/th-08_p9.png", caption: "Slide 9: Resistors in Series and Parallel Combinations" },
    { src: "/learnings/th-08_p17.png", caption: "Slide 17: Ohm’s Law Relationship (V = I·R)" },
    { src: "/learnings/th-08_p22.png", caption: "Slide 22: Kirchhoff’s Current Law (KCL - Junction Rule)" },
    { src: "/learnings/th-08_p24.png", caption: "Slide 24: Kirchhoff’s Voltage Law (KVL - Closed Loop Rule)" }
  ],

  // Course 2: Microwave & RF Basics
  "rf-01": [
    { src: "/learnings/rf-01_p1.png", caption: "Slide 1: IEEE Microwave Frequency Bands (L to mm-Wave)" },
    { src: "/learnings/rf-01_p2.png", caption: "Slide 2: Advantages & Applications of Microwave Signals" }
  ],
  "rf-02": [
    { src: "/learnings/rf-02_p1.png", caption: "Slide 1: Microwave Transmission Lines Overview" },
    { src: "/learnings/rf-02_p2.png", caption: "Slide 2: Coaxial Transmission Line Cross Section" },
    { src: "/learnings/rf-02_p3.png", caption: "Slide 3: Microstrip & Stripline PCB Geometry" },
    { src: "/learnings/rf-02_p4.png", caption: "Slide 4: Distributed R-L-G-C Equivalent Circuit" },
    { src: "/learnings/rf-02_p6.png", caption: "Slide 6: Transmission Line Telegrapher Equations" }
  ],
  "rf-03": [
    { src: "/learnings/rf-03_p1.png", caption: "Slide 1: Scattering Parameters Matrix Definition" },
    { src: "/learnings/rf-03_p2.png", caption: "Slide 2: Why S-Parameters are Essential at Microwave Frequencies" },
    { src: "/learnings/rf-03_p3.png", caption: "Slide 3: S-Parameter Measurement & Incident/Reflected Waves" },
    { src: "/learnings/rf-03_p8.png", caption: "Slide 8: Multi-Port S-Parameters & Magic Tee Junction" }
  ],
  "rf-04": [
    { src: "/learnings/rf-04_p1.png", caption: "Slide 1: Mathematics of the Smith Chart" },
    { src: "/learnings/rf-04_p5.png", caption: "Slide 5: Smith Chart Boundary Case I: R & X Infinite" },
    { src: "/learnings/rf-04_p6.png", caption: "Slide 6: Smith Chart Boundary Case II: R = 0 (Pure Reactance)" },
    { src: "/learnings/rf-04_p7.png", caption: "Slide 7: Smith Chart Boundary Case III: X = 0 (Pure Resistance)" },
    { src: "/learnings/rf-04_p10.png", caption: "Slide 10: Calculating VSWR & Input Impedance on Smith Chart" }
  ],
  "rf-05": [
    { src: "/learnings/rf-05_p1.png", caption: "Slide 1: Transmission Lines vs Hollow Waveguides Comparison" },
    { src: "/learnings/rf-05_p2.png", caption: "Slide 2: Waveguide Modes (TE vs TM) & Propagation Limits" },
    { src: "/learnings/rf-05_p3.png", caption: "Slide 3: Fundamentals of Waveguide EM Wave Propagation" },
    { src: "/learnings/rf-05_p5.png", caption: "Slide 5: Standard Waveguide Types (Rectangular, Circular, Ridged)" },
    { src: "/learnings/rf-05_p6.png", caption: "Slide 6: Why TEM Mode Cannot Propagate in Single Conductors" }
  ],
  "rf-06": [
    { src: "/learnings/rf-06_p1.png", caption: "Slide 1: Varactor (Varicap) Diode Construction & Symbols" },
    { src: "/learnings/rf-06_p2.png", caption: "Slide 2: Varactor Voltage-Variable Capacitance Mechanism" },
    { src: "/learnings/rf-06_p6.png", caption: "Slide 6: Schottky Barrier Diode & Fast Switching" },
    { src: "/learnings/rf-06_p13.png", caption: "Slide 13: IMPATT Diode Avalanche Transit-Time Operation" }
  ],
  "rf-07": [
    { src: "/learnings/rf-07_p1.png", caption: "Slide 1: Velocity Modulation & Applegate Distance-Time Diagram" },
    { src: "/learnings/rf-07_p2.png", caption: "Slide 2: Two-Cavity Klystron Amplifier Construction" },
    { src: "/learnings/rf-07_p3.png", caption: "Slide 3: Reflex Klystron Oscillator & Repeller Operation" },
    { src: "/learnings/rf-07_p7.png", caption: "Slide 7: Cavity Magnetron Cross-Section & Magnetic Anode Hub" },
    { src: "/learnings/rf-07_p8.png", caption: "Slide 8: Traveling Wave Tube (TWT) Slow-Wave Helix Structure" }
  ],
  "rf-08": [
    { src: "/learnings/rf-08_p1.png", caption: "Slide 1: Precision Slotted Line Carriage & Probe Construction" },
    { src: "/learnings/rf-08_p3.png", caption: "Slide 3: Slotted Line VSWR Measurement Configuration" },
    { src: "/learnings/rf-08_p5.png", caption: "Slide 5: Bolometer & Thermistor Power Measurement Bridge" },
    { src: "/learnings/rf-08_p6.png", caption: "Slide 6: Wavemeter Resonant Cavity Frequency Meter" },
    { src: "/learnings/rf-08_p11.png", caption: "Slide 11: EMI Definition & Common Coupling Mechanisms" },
    { src: "/learnings/rf-08_p15.png", caption: "Slide 15: EMC Standards (CISPR & ISO Overview)" }
  ],

  // Course 3: Power Electronics & LTSpice
  "pe-01": [
    { src: "/learnings/pe_p1.png", caption: "Slide 1: Power Electronics Foundations & Energy Systems" },
    { src: "/learnings/pe_p4.png", caption: "Slide 4: DC/DC Converters, Motor Drives & EV Systems" }
  ],
  "pe-02": [
    { src: "/learnings/pe_p11.png", caption: "Slide 11: Switched Mode vs Linear Voltage Regulation" },
    { src: "/learnings/pe_p17.png", caption: "Slide 17: Average vs RMS Power Integration in LTSpice" }
  ],
  "pe-03": [
    { src: "/learnings/pe_p24.png", caption: "Slide 24: Thermal Management & Junction Temperature Tj" },
    { src: "/learnings/pe_p31.png", caption: "Slide 31: Switching Losses (P_sw = 0.5·Vin·Iout·(ton+toff)·fs)" }
  ],
  "pe-04": [
    { src: "/learnings/pe_p35.png", caption: "Slide 35: Power Diodes, Schottky SBDs & Reverse Recovery Qrr" }
  ],
  "pe-05": [
    { src: "/learnings/pe_p43.png", caption: "Slide 43: Power MOSFET Gate Charge & Miller Plateau" },
    { src: "/learnings/pe_p48.png", caption: "Slide 48: High-Side Driver Bootstrap Capacitor Design" }
  ],
  "pe-06": [
    { src: "/learnings/pe_p51.png", caption: "Slide 51: DC/AC Inverters & Sinusoidal PWM (SPWM)" }
  ],
  "pe-07": [
    { src: "/learnings/pe_p57.png", caption: "Slide 57: Volt-Second Balance & Inductor Current Dynamics" },
    { src: "/learnings/pe_p61.png", caption: "Slide 61: Buck Converter CCM vs Discontinuous Mode (DCM)" },
    { src: "/learnings/pe_p65.png", caption: "Slide 65: Inductor Core Selection & Output Capacitor ESR" }
  ],
  "pe-08": [
    { src: "/learnings/pe_p69.png", caption: "Slide 69: Boost Converter Step-Up (Vo = Vin / (1 - D))" },
    { src: "/learnings/pe_p73.png", caption: "Slide 73: Buck-Boost Topology & LTSpice Closed-Loop Lab" }
  ],

  // Course 4: RAHRF101 RF Fundamentals
  "rahrf-01": [
    { src: "/learnings/rahrf_01_p1.png", caption: "RAHRF101 1.1: What is Radio Frequency & EM Spectrum" },
    { src: "/learnings/rahrf_01_p2.png", caption: "RAHRF101 1.1: Wavelength vs Frequency Fundamentals" }
  ],
  "rahrf-02": [
    { src: "/learnings/rahrf_02_p1.png", caption: "RAHRF101 1.2: Thermal Noise & Noise Figure (NF)" }
  ],
  "rahrf-03": [
    { src: "/learnings/rahrf_03_p1.png", caption: "RAHRF101 1.3: RF V-I-F-Z-P (50 Ohm System & dBm)" }
  ],
  "rahrf-04": [
    { src: "/learnings/rahrf_04_p1.png", caption: "RAHRF101 1.4: RF Front-End Module & Transceiver Architecture" }
  ],
  "rahrf-05": [
    { src: "/learnings/rahrf_05_p1.png", caption: "RAHRF101 1.5: Antennas, Radiation Patterns & Gain" }
  ],
  "rahrf-06": [
    { src: "/learnings/rahrf_06_p1.png", caption: "RAHRF101 1.6: RF Filters (Low-pass, Band-pass, Chebyshev)" }
  ],
  "rahrf-07": [
    { src: "/learnings/rahrf_07_p1.png", caption: "RAHRF101 1.7: Active vs Passive RF Components" }
  ],
  "rahrf-08": [
    { src: "/learnings/rahrf_08_p1.png", caption: "RAHRF101 1.8: Low Noise Amplifiers (LNA Design & NFmin)" }
  ],
  "rahrf-09": [
    { src: "/learnings/rahrf_09_p1.png", caption: "RAHRF101 1.9: RF Mixers & Frequency Conversion (Up/Down)" }
  ],
  "rahrf-10": [
    { src: "/learnings/rahrf_10_p1.png", caption: "RAHRF101 1.10: RF Oscillators & Voltage Controlled Oscillators (VCO)" }
  ],
  "rahrf-11": [
    { src: "/learnings/rahrf_11_p1.png", caption: "RAHRF101 1.11: Phase Locked Loops (PLL Synthesizers)" }
  ],
  "rahrf-12": [
    { src: "/learnings/rahrf_12_p1.png", caption: "RAHRF101 1.12: Power Amplifiers (Classes A, AB, C, D, E, F)" }
  ],
  "rahrf-13": [
    { src: "/learnings/rahrf_13_p1.png", caption: "RAHRF101 1.13: Analog & Digital Modulation (QPSK, QAM)" }
  ],
  "rahrf-14": [
    { src: "/learnings/rahrf_14_p1.png", caption: "RAHRF101 1.14: Linearity, P1dB & Third-Order Intercept IP3" }
  ],
  "rahrf-15": [
    { src: "/learnings/rahrf_15_p1.png", caption: "RAHRF101 1.15: Phasor Analysis & Time-Harmonic Fields" }
  ],
  "rahrf-16": [
    { src: "/learnings/rahrf_16_p1.png", caption: "RAHRF101 1.16: Reflection, Transmission & Impedance Matching" }
  ],
  "rahrf-17": [
    { src: "/learnings/rahrf_17_p1.png", caption: "RAHRF101 1.17: RF Attenuators (Pi-pad & T-pad Synthesis)" }
  ],
  "rahrf-18": [
    { src: "/learnings/rahrf_18_p1.png", caption: "RAHRF101 1.18: S-Parameters & Multi-Port Matrix Analysis" }
  ],
  "rahrf-19": [
    { src: "/learnings/rahrf_19_p1.png", caption: "RAHRF101 1.19: Smith Chart & Stub Matching Networks" }
  ],
  "rahrf-20": [
    { src: "/learnings/rahrf_20_p1.png", caption: "RAHRF101 1.20: RF EDA & Simulation Tools (ADS, HFSS, AWR)" }
  ],
  "rahrf-21": [
    { src: "/learnings/rahrf_21_p1.png", caption: "RAHRF101 1.21: RF Measurement Devices (VNA, Spectrum Analyzer)" }
  ],
}

const THEORY_ELECTRONICS_MODULES = [
  {
    id: 'th-01',
    num: '01',
    courseId: 'theory',
    title: 'Atoms, Electric Charge & Electromagnetism',
    sourcePdf: '02 - Current, Voltage and Power.pdf (Intro)',
    tags: ['Atoms', 'Electrons', 'Protons', 'Charge (e)', 'Electromagnetism', 'Drift Velocity'],
    summary: 'The physical nature of electric charge, Coulomb attraction/repulsion, and how random electron hopping converts into directed current under electromotive force.',
    equations: [
      { name: 'Elementary Charge', formula: 'e = 1.602 × 10⁻¹⁹ C', units: 'Coulombs' },
      { name: 'Coulomb’s Force Law', formula: 'F = k · (|q₁·q₂| / r²)', units: 'Newtons (N)' },
      { name: 'Drift Current', formula: 'I = n · q · A · v_d', units: 'Amperes (A)' },
    ],
    deepSections: [
      {
        heading: '1. Atomic Structure & Charge Equilibrium',
        content: `All physical matter consists of atoms comprising positively charged Protons, neutral Neutrons, and negatively charged Electrons. In neutral atoms, proton and electron counts balance. When external energy strips a valence electron, the atom becomes a positive ion and attracts adjacent electrons. In metallic conductors (like Copper or Aluminum), valence electrons form a free electron gas that continuously hops between lattice atoms in random thermal motion at speeds exceeding 10⁶ m/s with zero net directional drift until an electric field is applied.`,
      },
      {
        heading: '2. Electromagnetism as a Fundamental Force',
        content: `Electric and magnetic forces are two manifestations of the unified electromagnetic interaction. Stationary charges create electrostatic fields (E-field). Moving charges create magnetic fields (B-field). When an external potential is connected across a wire, electrons experience a Lorentz force, establishing an organized drift velocity (typically a fraction of a millimeter per second) that propagates the electrical signal through the conductor at near the speed of light (≈ 0.7c).`,
      },
    ],
    emcNote: 'Rapid acceleration of charges (high di/dt) creates propagating electromagnetic waves, which form the physical basis for both intended radio transmission and unintended EMI radiation.',
  },
  {
    id: 'th-02',
    num: '02',
    courseId: 'theory',
    title: 'Current, Voltage and Power (DC Fundamentals)',
    sourcePdf: '02 - Current, Voltage and Power.pdf',
    tags: ['Current (I)', 'Voltage (V)', 'Joule’s Law', 'Watt-Hours', 'Ampere-Hours', '2x Safety Rule'],
    summary: 'Conventional current vs. electron flow, electromotive force potential, Joule dissipation, energy capacity metrics, and engineering power safety deratings.',
    equations: [
      { name: 'Electric Current', formula: 'I = Q / t  (1 A = 1 C/s)', units: 'Amperes (A)' },
      { name: 'Joule’s Law of Electric Power', formula: 'P = V × I = I²·R = V² / R', units: 'Watts (W)' },
      { name: 'Energy Consumption', formula: 'E = P × t', units: 'Watt-Hours (Wh)' },
      { name: 'Component Safety Rating Rule', formula: 'P_rated > 2 × P_expected', units: 'Watts (W)' },
    ],
    deepSections: [
      {
        heading: '1. Conventional Current vs. Electron Flow',
        content: `Electric current (I) is defined as the net rate of electric charge flow through a conductor cross-section (I = dQ/dt). By historical convention (established by Benjamin Franklin), current is defined as flowing from Positive (+) to Negative (-). In metallic conductors, physical electrons actually drift in the opposite direction from Negative to Positive. All engineering circuit analysis strictly adheres to conventional current flow.`,
      },
      {
        heading: '2. Electromotive Force (EMF) & Potential Difference',
        content: `Voltage (V) is the work required per unit charge to move a test charge between two points (1 Volt = 1 Joule/Coulomb). Voltage represents potential energy—it can exist across open terminals without current flowing. Current cannot flow through a passive impedance without a corresponding voltage drop.`,
      },
      {
        heading: '3. Power Dissipation & Safe Thermal Derating',
        content: `Electrical power represents the rate of energy transfer. In purely resistive elements, all electrical power is converted into thermal heat (P = I²R). Crucial engineering rule: Never operate a component at its maximum power rating. Always apply the 2× safety rule: select a resistor or device with a power rating at least twice the maximum expected operating dissipation to prevent thermal failure.`,
      },
    ],
    emcNote: 'Large transient current loops (high di/dt) generate intense magnetic near-fields that induce cross-talk into adjacent high-impedance sensor lines.',
  },
  {
    id: 'th-03',
    num: '03',
    courseId: 'theory',
    title: 'DC and AC — Two Good Friends',
    sourcePdf: '03 - DC and AC - Two Good Friends.pdf',
    tags: ['Direct Current', 'Alternating Current', 'Sinusoid', 'RMS (0.707)', 'Peak-to-Peak', 'Live/Neutral/PE'],
    summary: 'Direct current characteristics, AC generator mechanics, 3-wire mains distribution, and RMS equivalent heating mathematics.',
    equations: [
      { name: 'RMS Voltage from Peak', formula: 'V_RMS = (1 / √2) × V_peak ≈ 0.707 × V_peak', units: 'Volts RMS' },
      { name: 'Peak-to-Peak Voltage', formula: 'V_p-p = 2 × V_peak = 2.828 × V_RMS', units: 'Volts (V)' },
      { name: 'Average AC Power (Resistive)', formula: 'P_AVG = V_RMS × I_RMS', units: 'Watts (W)' },
    ],
    deepSections: [
      {
        heading: '1. DC vs. AC Power Systems',
        content: `• Direct Current (DC): Unidirectional charge flow with constant polarity. Generated by chemical batteries, solar cells, and regulated DC-DC converters. Mandatory for microcontrollers, digital logic, and signal processing.
• Alternating Current (AC): Periodically reversing current following a sinusoidal waveform. Generated by rotating a coil inside magnetic fields (Alternators). Preferred for power grid transmission because transformers can step up voltage to hundreds of kilovolts, drastically reducing I²R line losses.`,
      },
      {
        heading: '2. 3-Wire Mains Delivery & Protective Earth (PE)',
        content: `AC power is delivered via 3 conductors:
1. Line / Phase (Hot): Live wire carrying alternating sinusoidal potential relative to ground.
2. Neutral: Return conductor bonded to Earth at the distribution transformer, providing a 0V reference.
3. Protective Earth Ground (PE): Safety conductor bonded to the metal chassis of appliances. If internal insulation breaks down, PE diverts fault current safely into Earth, tripping the circuit breaker and preventing user electrocution.`,
      },
      {
        heading: '3. Root Mean Square (RMS) Mathematics',
        content: `Because AC voltage swings symmetrically positive and negative, its mathematical average over a full cycle is zero. Root Mean Square (RMS) defines the effective DC voltage that delivers identical thermal dissipation into a resistive load. For a pure sine wave, V_RMS = V_peak / √2 ≈ 0.707 × V_peak. A standard 230V RMS grid swings to +325V peak and spans 650V peak-to-peak.`,
      },
    ],
    emcNote: 'AC mains lines act as large radiating antennas. Common-mode filters and line-to-ground Y-capacitors are required to prevent high-frequency inverter noise from polluting the grid.',
  },
  {
    id: 'th-04',
    num: '04',
    courseId: 'theory',
    title: 'Resistance — Join the Resistance !',
    sourcePdf: '04 - Resistance - Join the resistance !.pdf',
    tags: ['Resistor', 'Resistivity (ρ)', 'Color Code', 'Tolerances', 'Rheostat', 'Potentiometer', 'ESL Parasitics'],
    summary: 'Ohmic conduction, material resistivity, axial color code decoding, rheostats vs. potentiometers, and high-frequency parasitic ESL behavior.',
    equations: [
      { name: 'Physical Resistance', formula: 'R = ρ · (L / A)', units: 'Ohms (Ω)' },
      { name: 'Ohm’s Law', formula: 'V = I × R • I = V / R • R = V / I', units: 'V, A, Ω' },
      { name: 'Series Resistor Sum', formula: 'R_total = R₁ + R₂ + R₃ + ...', units: 'Ohms (Ω)' },
      { name: 'Parallel Resistor Sum', formula: '1 / R_total = (1 / R₁) + (1 / R₂) + ...', units: 'Ohms (Ω)' },
    ],
    deepSections: [
      {
        heading: '1. Material Resistivity & Geometry',
        content: `Resistance (R) quantifies opposition to current flow. It is governed by material resistivity (ρ in Ω·m), length (L), and cross-sectional area (A): R = ρ·(L/A). Copper and Silver exhibit low resistivity, while insulators (glass, PTFE) have high resistivity.`,
      },
      {
        heading: '2. Standard Color Coding & Variable Resistors',
        content: `Axial resistors use color bands (0: Black, 1: Brown, 2: Red, 3: Orange, 4: Yellow, 5: Green, 6: Blue, 7: Violet, 8: Gray, 9: White). Tolerance bands: Gold = ±5%, Silver = ±10%, Brown = ±1%.
• Rheostat: 2-terminal series current limiter.
• Potentiometer: 3-terminal adjustable voltage divider (V_out = V_in × (R_bottom / R_total)).`,
      },
      {
        heading: '3. High-Frequency Parasitics (The EMC View)',
        content: `Real-world through-hole resistors have Equivalent Series Inductance (ESL) from wire leads (≈ 1 nH/mm) and end-cap parasitic capacitance. Above 100 MHz, wirewound resistors behave inductively! For RF and EMC filters, compact SMD 0402/0603 thin-film resistors are required.`,
      },
    ],
    emcNote: 'Always use surface-mount (SMD) thin-film resistors in high-speed digital terminations to eliminate lead inductance and prevent signal reflections.',
  },
  {
    id: 'th-05',
    num: '05',
    courseId: 'theory',
    title: 'Capacitance — Storing Electrical Energy',
    sourcePdf: '05 - Capacitance - Storing electrical energy.pdf',
    tags: ['Capacitor', 'Farads (F)', 'Electric Field', 'RC Time Constant (τ)', 'Ceramic MLCC', 'Electrolytic', 'Decoupling'],
    summary: 'Electrostatic field storage, dielectric permittivity, RC charging curves (τ = RC), Ceramic MLCC vs. Electrolytic, and power decoupling.',
    equations: [
      { name: 'Capacitance & Charge', formula: 'C = Q / V = (ε_r · ε₀ · A) / d', units: 'Farads (F)' },
      { name: 'RC Charging Time Constant', formula: 'τ = R × C  (5τ = 99.3% charged)', units: 'Seconds (s)' },
      { name: 'Stored Electrostatic Energy', formula: 'E = ½ · C · V²', units: 'Joules (J)' },
      { name: 'Transient Charging Voltage', formula: 'v(t) = V_supply · (1 - e^(-t / τ))', units: 'Volts (V)' },
    ],
    deepSections: [
      {
        heading: '1. Electrostatic Field Storage',
        content: `A capacitor consists of two conductive plates separated by a dielectric insulator. When voltage is applied, equal and opposite charges accumulate on the plates, storing energy in the electric field (E = ½CV²). No DC current flows across the dielectric. Capacitors block DC while passing high-frequency AC.`,
      },
      {
        heading: '2. RC Transient Response (0 to 5τ)',
        content: `When charging a capacitor through resistance R, voltage rises exponentially:
• 1τ = 63.2% of supply voltage.
• 2τ = 86.5%.
• 3τ = 95.0%.
• 4τ = 98.2%.
• 5τ = 99.3% (Steady-state reached; transient period complete).`,
      },
      {
        heading: '3. Capacitor Types: MLCC vs. Electrolytic',
        content: `• Ceramic MLCC: Non-polarized, low ESR/ESL—ideal for high-frequency bypass and IC power pin decoupling.
• Electrolytic (Aluminum/Tantalum): Polarized (+ and - terminals). High capacitance density used for DC power supply smoothing and low-frequency ripple filtering. Reverse connection causes destruction!`,
      },
    ],
    emcNote: 'Capacitor lead inductance creates a Self-Resonant Frequency (SRF). Above its SRF, a capacitor behaves as an inductor, losing its noise shunting capability!',
  },
  {
    id: 'th-06',
    num: '06',
    courseId: 'theory',
    title: 'Inductance — The Magical Magnetic Field',
    sourcePdf: '06 - Inductance - The magical magnetic field.pdf',
    tags: ['Inductor', 'Henries (H)', 'Magnetic Field (B)', 'Back-EMF', 'RL Time Constant', 'Transformer', 'Common Mode Choke'],
    summary: 'Magnetic energy storage, Faraday & Lenz back-EMF, RL time constants, transformers, alternators, motors, and common mode chokes.',
    equations: [
      { name: 'Induced Back-EMF', formula: 'V_L = -L · (di / dt)', units: 'Volts (V)' },
      { name: 'Solenoid Inductance', formula: 'L = (μ · N² · A) / l', units: 'Henries (H)' },
      { name: 'RL Time Constant', formula: 'τ = L / R', units: 'Seconds (s)' },
      { name: 'Transformer Ratio', formula: 'V_s / V_p = N_s / N_p = I_p / I_s', units: 'Turns Ratio' },
    ],
    deepSections: [
      {
        heading: '1. Magnetic Field Storage & Self-Inductance',
        content: `Electric current produces a surrounding magnetic field. Winding a conductor into a coil (solenoid) concentrates the field. Adding a ferrite core increases inductance hundreds of times. Inductance (L in Henries) opposes any change in current by generating an opposing back-EMF (V = -L·di/dt).`,
      },
      {
        heading: '2. Mutual Inductance, Transformers & Motors',
        content: `• Mutual Inductance: Changing current in one coil induces EMF in a neighboring coil via magnetic coupling.
• Transformers: Step AC voltage up or down with high efficiency based on winding turns ratio (Vs/Vp = Ns/Np).
• Electric Motors: Lorentz force on current-carrying conductors in magnetic fields produces continuous rotational mechanical torque.`,
      },
      {
        heading: '3. Common Mode Chokes in Automotive EMC',
        content: `A Common Mode Choke (CMC) consists of dual windings on a single toroidal ferrite core. Differential signal currents produce opposing magnetic fluxes that cancel (zero impedance), while common-mode noise produces additive flux, creating high inductive impedance that attenuates radiated EMI.`,
      },
    ],
    emcNote: 'Disconnecting inductive loads (relays, solenoids) causes high-voltage flyback spikes (V = -L·di/dt) that can destroy semiconductor switches unless clamped with flyback diodes.',
  },
  {
    id: 'th-07',
    num: '07',
    courseId: 'theory',
    title: 'Semi-Conductors & Active Devices',
    sourcePdf: '07 - Semi-Conductors.pdf',
    tags: ['Silicon', 'P-N Doping', 'Diode', 'BJT', 'MOSFET', 'Saturation/Cutoff', 'Fast Switching'],
    summary: 'Silicon crystal lattices, P-N junction doping, diode rectification, BJT amplification, and MOSFET high-speed electronic switching.',
    equations: [
      { name: 'BJT Current Gain (Beta)', formula: 'β = I_C / I_B • I_C = β × I_B', units: 'Gain (> 100)' },
      { name: 'Emitter Current', formula: 'I_E = I_C + I_B = (β + 1) × I_B', units: 'Amperes (A)' },
      { name: 'Diode Shockley Formula', formula: 'I_D = I_S · (e^(V_D / (n·V_T)) - 1)', units: 'Amperes (A)' },
    ],
    deepSections: [
      {
        heading: '1. P-N Junction & Doping Physics',
        content: `Pure silicon is a poor conductor. Introducing trivalent impurities (Boron) creates P-type silicon with excess holes (positive charge vacancies). Introducing pentavalent impurities (Phosphorus) creates N-type silicon with free electrons. Joining them forms a P-N junction with a built-in 0.7V potential barrier (Silicon).`,
      },
      {
        heading: '2. Diodes: One-Way Electrical Valves',
        content: `Forward-biased diodes conduct when anode potential exceeds cathode by > 0.7V. Reverse-biased diodes block current. Applications include reverse polarity protection, AC-to-DC rectification, and flyback clamping. LEDs emit photons upon electron-hole recombination.`,
      },
      {
        heading: '3. Transistors: BJT vs. MOSFET Operations',
        content: `• BJTs (NPN/PNP): Current-controlled. Small base current controls large collector current (I_C = β·I_B).
• MOSFETs: Voltage-controlled gate insulated by silicon dioxide. Fast switching and low on-resistance (R_DS(on)).
• Operating Modes:
  1. Cut-off (OFF): Open switch.
  2. Saturation (ON): Closed switch with minimal voltage drop.
  3. Active Linear: Proportional amplification (used in analog RF/audio circuits).`,
      },
    ],
    emcNote: 'Fast MOSFET switching rise times (tr < 10 ns) in automotive power converters generate wideband harmonics up to 500 MHz.',
  },
  {
    id: 'th-08',
    num: '08',
    courseId: 'theory',
    title: 'Basic Laws of Electric Circuits (KCL & KVL)',
    sourcePdf: '08 - Basic Laws of Electric Circuits.pdf',
    tags: ['Circuit Topology', 'Branch', 'Node', 'Loop', 'KCL (Junction)', 'KVL (Mesh)', 'Ohm’s Law'],
    summary: 'Branch/Node/Loop topology, series and parallel equivalent combinations, Kirchhoff’s Current Law (KCL), and Kirchhoff’s Voltage Law (KVL) mesh analysis.',
    equations: [
      { name: 'Kirchhoff’s Current Law (KCL)', formula: '∑ I_in = ∑ I_out  (Charge Conservation)', units: 'Node Sum = 0' },
      { name: 'Kirchhoff’s Voltage Law (KVL)', formula: '∑ ΔV_loop = 0  (Energy Conservation)', units: 'Loop Sum = 0' },
      { name: 'Mesh Voltage Equation', formula: 'V_source - I·R₁ - I·R₂ - I·R₃ = 0', units: 'Volts (V)' },
    ],
    deepSections: [
      {
        heading: '1. Circuit Topologies: Branch, Node & Loop',
        content: `• Branch: A single electrical element (resistor, voltage source).
• Node: The point of connection between two or more branches.
• Loop: Any closed independent path in a circuit returning to the start node.
• Series: Elements connected sequentially, carrying the exact same current.
• Parallel: Elements connected across the same two nodes, sharing the exact same voltage.`,
      },
      {
        heading: '2. Kirchhoff’s Current Law (KCL — The Junction Rule)',
        content: `Derived from the Conservation of Electric Charge: Charge cannot accumulate at an infinitesimal node.
Rule: "The sum of all currents entering a node equals the sum of all currents leaving the node" (∑ I_in = ∑ I_out). If I₁ enters a node and splits into I₂ and I₃, then I₁ = I₂ + I₃.`,
      },
      {
        heading: '3. Kirchhoff’s Voltage Law (KVL — The Closed Loop Rule)',
        content: `Derived from the Conservation of Energy: Moving around a closed loop and returning to the same point results in zero net potential change.
Rule: "The algebraic sum of all voltages around any closed circuit loop is zero" (∑ V = 0).
Voltage rises across sources are treated as positive (+Vs), while voltage drops across passive resistors in the direction of current are treated as negative (-I·R).`,
      },
    ],
    emcNote: 'High-frequency return current follows the path of lowest loop inductance directly beneath the signal trace. Minimizing the loop area suppresses magnetic field radiation.',
  },
]

// COURSE 2: MICROWAVE & RF ENGINEERING BASICS (UDEMY — 8 MODULES)

const MICROWAVE_RF_MODULES = [
  {
    id: 'rf-01',
    num: '01',
    courseId: 'microwave',
    title: 'Microwave Introduction & Frequency Bands',
    sourcePdf: 'Microwave+Introduction.pdf',
    tags: ['Microwave Bands', 'L, S, C, X, Ku, K, Ka, V, W, mm', 'Bandwidth', 'Directivity', 'RADAR'],
    summary: 'Standard IEEE microwave frequency bands (1 GHz to 300 GHz), short wavelength advantages, high data rate bandwidths, and radar applications.',
    equations: [
      { name: 'Wavelength in Free Space', formula: 'λ = c / f  (c = 3 × 10⁸ m/s)', units: 'Meters (m)' },
      { name: 'Antenna Beamwidth (Reflector)', formula: 'θ_3dB ≈ 70° · (λ / D)', units: 'Degrees' },
      { name: 'Free Space Path Loss', formula: 'FSPL = (4π·d / λ)²', units: 'Power Ratio' },
    ],
    deepSections: [
      {
        heading: '1. What are Microwaves?',
        content: `Microwaves span the electromagnetic spectrum from 1 GHz (λ = 30 cm) to 300 GHz (λ = 1 mm). Because frequency is high, wavelengths are on the order of centimeters down to millimeters. This enables compact, highly directive antennas with narrow beamwidths (θ ≈ 70λ/D) and provides huge absolute bandwidths for multi-gigabit wireless communications and high-resolution RADAR.`,
      },
      {
        heading: '2. Standard IEEE Microwave Frequency Bands',
        content: `• L-Band (1 – 2 GHz): GPS (1575.42 MHz / 1227.60 MHz), GSM/CDMA cellular, Satellite phones.
• S-Band (2 – 4 GHz): Wi-Fi (2.4 GHz), Bluetooth, ZigBee, Weather & Marine Radar.
• C-Band (4 – 8 GHz): Satellite communications, 5G mid-band, Long-range radar.
• X-Band (8 – 12 GHz): Military & Aerospace radar, Weather tracking, Remote sensing.
• Ku-Band (12 – 18 GHz): Direct-to-Home (DTH) Satellite TV, VSAT terminals.
• K-Band (18 – 27 GHz) & Ka-Band (27 – 40 GHz): Satellite broadband (Starlink), Short-range high-res radar.
• V-Band (40 – 75 GHz) & W-Band (75 – 110 GHz): 60 GHz WiGig, 77 GHz Automotive ADAS Radar.
• mm-Wave Band (110 – 300 GHz): High-capacity backhaul, Scientific radio astronomy.`,
      },
    ],
    emcNote: 'At microwave frequencies, circuit trace lengths become comparable to signal wavelengths (l > λ/10), requiring transmission line distributed circuit theory rather than lumped components.',
  },
  {
    id: 'rf-02',
    num: '02',
    courseId: 'microwave',
    title: 'Transmission Lines & Characteristic Impedance',
    sourcePdf: 'Transmission+Lines.pdf',
    tags: ['Transmission Line', 'Coaxial', 'Microstrip', 'Stripline', 'Z₀', 'Propagation (γ)', 'TEM Mode'],
    summary: 'Distributed R-L-G-C parameters, characteristic impedance (Z₀), lossless transmission lines, propagation constants (γ = α + jβ), and phase velocity.',
    equations: [
      { name: 'Characteristic Impedance', formula: 'Z₀ = √((R + jωL) / (G + jωC)) ≈ √(L / C)', units: 'Ohms (Ω)' },
      { name: 'Complex Propagation Constant', formula: 'γ = α + jβ = √((R + jωL)·(G + jωC))', units: 'Nepers/m + Rad/m' },
      { name: 'Phase Velocity & Wavelength', formula: 'v_p = ω / β = 1 / √(L·C)  •  λ = 2π / β', units: 'm/s, m' },
      { name: 'Lossless Microstrip Z₀', formula: 'Z₀ ≈ (87 / √(ε_r + 1.41)) · ln(5.98·h / (0.8·w + t))', units: 'Ohms (Ω)' },
    ],
    deepSections: [
      {
        heading: '1. Lumped vs. Distributed Circuit Theory',
        content: `When the physical length of a conductor exceeds 1/10th of the operating wavelength (l ≥ λ/10), voltages and currents vary along the length of the line. A transmission line must be modeled by distributed parameters per unit length: series resistance (R' in Ω/m), series inductance (L' in H/m), shunt conductance (G' in S/m), and shunt capacitance (C' in F/m).`,
      },
      {
        heading: '2. Characteristic Impedance (Z₀)',
        content: `Characteristic impedance (Z₀) is the ratio of the traveling voltage wave to current wave in a single direction on an infinitely long line. For a lossless line (R = 0, G = 0), Z₀ simplifies to √(L/C), which is purely real (typically 50 Ω for RF coax/microstrip, and 75 Ω for broadcast video).`,
      },
      {
        heading: '3. Common RF Transmission Line Structures',
        content: `• Coaxial Cable: Center conductor surrounded by tubular dielectric and outer shield. Pure TEM mode with zero external radiation.
• Microstrip Line: Conductor trace on top of PCB substrate with solid ground plane underneath. Quasi-TEM mode; widely used in RF PCB design.
• Stripline: Conductor trace sandwiched symmetrically between two ground planes. Pure TEM mode with excellent EMI shielding.`,
      },
    ],
    emcNote: 'Impedance mismatches between traces and load cause signal reflections, creating standing waves and ringing that elevate radiated emissions.',
  },
  {
    id: 'rf-03',
    num: '03',
    courseId: 'microwave',
    title: 'Scattering Parameters (S-Parameters)',
    sourcePdf: 'Scaterring+Parameters.pdf',
    tags: ['S-Parameters', 'S11', 'S21', 'S12', 'S22', 'Return Loss', 'Insertion Loss', 'Two-Port Network'],
    summary: 'Why H/Y/Z parameters fail at microwave frequencies, S-matrix definition, reciprocity, lossless conditions, and multi-port junctions (Magic Tee).',
    equations: [
      { name: '2-Port S-Matrix Definition', formula: '[b₁; b₂] = [S₁₁ S₁₂; S₂₁ S₂₂] × [a₁; a₂]', units: 'Wave Matrix' },
      { name: 'Input Reflection (S₁₁)', formula: 'S₁₁ = b₁ / a₁ | a₂=0  (Return Loss = -20·log|S₁₁|)', units: 'Ratio / dB' },
      { name: 'Forward Transmission (S₂₁)', formula: 'S₂₁ = b₂ / a₁ | a₂=0  (Insertion Loss = -20·log|S₂₁|)', units: 'Ratio / dB' },
      { name: 'Lossless Unitary Condition', formula: '[S]† · [S] = [I]  •  |S₁₁|² + |S₂₁|² = 1', units: 'Conservation' },
    ],
    deepSections: [
      {
        heading: '1. Why Use S-Parameters at High Frequencies?',
        content: `At microwave frequencies, classical Z, Y, and H parameters cannot be measured because creating perfect Open Circuits (which radiate and have stray capacitance) and perfect Short Circuits (which have lead inductance) is impossible. S-parameters solve this by terminating ports with matched 50 Ω loads, preventing reflections and measuring incident (a) and reflected (b) traveling power waves.`,
      },
      {
        heading: '2. The 2-Port S-Parameter Matrix',
        content: `• S₁₁ (Input Reflection Coefficient): Ratio of reflected wave to incident wave at Port 1 with Port 2 terminated in 50 Ω.
• S₂₁ (Forward Gain / Insertion Loss): Ratio of transmitted wave at Port 2 to incident wave at Port 1.
• S₁₂ (Reverse Isolation): Ratio of transmitted wave at Port 1 to incident wave at Port 2.
• S₂₂ (Output Reflection Coefficient): Ratio of reflected wave to incident wave at Port 2 with Port 1 matched.`,
      },
      {
        heading: '3. Reciprocal and Lossless S-Matrix Properties',
        content: `• Reciprocal Network: If passive, the S-matrix is symmetric (S₁₂ = S₂₁).
• Lossless Network: Total incident power equals total scattered power. The S-matrix is unitary ([S]†[S] = [I]), meaning |S₁₁|² + |S₂₁|² = 1 for a lossless 2-port network.`,
      },
    ],
    emcNote: 'Vector Network Analyzers (VNAs) measure S-parameters to verify EMI filter insertion loss (S₂₁) and shield attenuation across wide automotive frequency spans.',
  },
  {
    id: 'rf-04',
    num: '04',
    courseId: 'microwave',
    title: 'Smith Chart & Impedance Matching',
    sourcePdf: 'Smith+Chart.pdf',
    tags: ['Smith Chart', 'VSWR', 'Reflection Coefficient (Γ)', 'Impedance Matching', 'Stub Matching', 'Q-Factor'],
    summary: 'Graphical polar impedance mapping, constant-resistance and constant-reactance circles, VSWR calculations, and single-stub matching networks.',
    equations: [
      { name: 'Voltage Reflection Coefficient', formula: 'Γ = (Z_L - Z₀) / (Z_L + Z₀) = |Γ|·e^(jθ)', units: 'Complex Ratio' },
      { name: 'Voltage Standing Wave Ratio', formula: 'VSWR = (1 + |Γ|) / (1 - |Γ|)', units: 'Ratio (1 to ∞)' },
      { name: 'Return Loss (dB)', formula: 'RL = -20 · log₁₀(|Γ|)', units: 'Decibels (dB)' },
      { name: 'Normalized Impedance', formula: 'z = r + jx = Z_L / Z₀', units: 'Dimensionless' },
    ],
    deepSections: [
      {
        heading: '1. Smith Chart Coordinate System',
        content: `Invented by Phillip H. Smith in 1939, the Smith Chart is a polar plot of the complex reflection coefficient (Γ) mapped onto the normalized impedance plane (z = r + jx). The center of the chart represents perfect match (z = 1 + j0, Γ = 0, VSWR = 1.0). The left edge represents short circuit (z = 0, Γ = -1); the right edge represents open circuit (z = ∞, Γ = +1). Upper half is inductive (+jx); lower half is capacitive (-jx).`,
      },
      {
        heading: '2. VSWR & Return Loss Relationships',
        content: `When a transmission line is not matched to its load (Z_L ≠ Z₀), incident and reflected waves interfere, setting up a Standing Wave pattern. The ratio of maximum voltage to minimum voltage is the Voltage Standing Wave Ratio (VSWR). A VSWR of 1.0 indicates 0% reflection (Return Loss = ∞ dB). A VSWR of 2.0 corresponds to |Γ| = 0.333 (Return Loss = 9.54 dB, 11% power reflected).`,
      },
      {
        heading: '3. Impedance Matching Techniques',
        content: `To transfer maximum power without reflections, matching networks transform the load impedance to Z₀:
• Quarter-Wave Transformer: A λ/4 section with impedance Z_t = √(Z₀·R_L) matches real resistive loads.
• Single-Stub Tuner: An open or shorted transmission line stub placed in parallel cancels load reactance, achieving perfect 50 Ω match.`,
      },
    ],
    emcNote: 'Poor impedance matching at connector interfaces produces standing wave voltage peaks that increase RF harmonic emissions.',
  },
  {
    id: 'rf-05',
    num: '05',
    courseId: 'microwave',
    title: 'Waveguides & Mode Propagation (TE / TM)',
    sourcePdf: 'Waveguides.pdf',
    tags: ['Waveguide', 'Rectangular Waveguide', 'TE Mode', 'TM Mode', 'Cutoff Frequency', 'Phase/Group Velocity'],
    summary: 'Hollow metallic transmission conduits, why TEM mode cannot propagate in hollow tubes, cutoff frequency calculations, and TE₁₀ dominant mode.',
    equations: [
      { name: 'Cutoff Frequency (Rectangular)', formula: 'f_c(m,n) = (c / 2) · √((m / a)² + (n / b)²)', units: 'Hertz (Hz)' },
      { name: 'Dominant Mode TE₁₀ Cutoff', formula: 'f_c(1,0) = c / (2·a)', units: 'Hertz (Hz)' },
      { name: 'Guide Wavelength (λ_g)', formula: 'λ_g = λ₀ / √(1 - (f_c / f)²)', units: 'Meters (m)' },
      { name: 'Phase & Group Velocity', formula: 'v_p · v_g = c²  (v_p > c, v_g < c)', units: 'm/s' },
    ],
    deepSections: [
      {
        heading: '1. Why Waveguides Over Coaxial Cables?',
        content: `At frequencies above 10 GHz, coaxial cables suffer from severe dielectric absorption and skin-effect resistive losses. Waveguides are hollow metallic tubes that guide electromagnetic waves via total internal reflection from conductive walls, handling megawatts of peak power with low attenuation.`,
      },
      {
        heading: '2. Why TEM Mode Cannot Propagate in Single Conductors',
        content: `Transverse Electromagnetic (TEM) mode requires two isolated conductors (like coaxial center and shield) to support a non-zero static potential difference. In a hollow metallic pipe (single conductor), any electrostatic field would violate Laplace's equation (∇²Φ = 0). Therefore, hollow waveguides only support Transverse Electric (TE, Ez = 0) and Transverse Magnetic (TM, Hz = 0) modes.`,
      },
      {
        heading: '3. Dominant TE₁₀ Mode & Cutoff Frequency',
        content: `A waveguide acts as a high-pass filter: signals below the cutoff frequency (f < f_c) are exponentially attenuated (evanescent mode). The dominant mode with the lowest cutoff frequency in rectangular waveguide (broad dimension 'a', height 'b' where a > b) is the TE₁₀ mode: f_c = c / (2a). For standard WR-90 X-band waveguide (a = 22.86 mm), f_c = 6.56 GHz, operating from 8.2 to 12.4 GHz.`,
      },
    ],
    emcNote: 'Slot apertures and seam openings in shielded enclosures act as rectangular waveguides. If the slot length exceeds λ/2, high-frequency RF leaks out!',
  },
  {
    id: 'rf-06',
    num: '06',
    courseId: 'microwave',
    title: 'Microwave Diodes (Varactor, Gunn, IMPATT, PIN)',
    sourcePdf: 'Microwave+Diodes.pdf',
    tags: ['Varactor', 'Gunn Diode', 'IMPATT', 'PIN Diode', 'Schottky', 'Tunnel Diode', 'Negative Resistance'],
    summary: 'High-frequency solid-state diodes: voltage-variable capacitors (Varactor), transferred electron devices (Gunn), avalanche breakdown oscillators (IMPATT), and PIN RF switches.',
    equations: [
      { name: 'Varactor Junction Capacitance', formula: 'C_j(V) = C_j0 / (1 + V_R / V_bi)^γ', units: 'Farads (F)' },
      { name: 'Gunn Transit Frequency', formula: 'f ≈ v_drift / L_active', units: 'Hertz (Hz)' },
      { name: 'PIN Diode RF Resistance', formula: 'R_s ≈ (w_i)² / (2·μ·I_DC·τ)', units: 'Ohms (Ω)' },
    ],
    deepSections: [
      {
        heading: '1. Varactor (Varicap) Diodes',
        content: `Operating in reverse bias, a Varactor diode functions as a voltage-controlled variable capacitor. Increasing reverse voltage widens the depletion layer width (W), reducing junction capacitance (C = εA/W). Widely used in Voltage Controlled Oscillators (VCOs), Phase-Locked Loops (PLLs), and agile RF frequency synthesizers.`,
      },
      {
        heading: '2. Gunn Diodes & Transferred Electron Effect',
        content: `Fabricated from Gallium Arsenide (GaAs) or Indium Phosphide (InP), Gunn diodes operate via the Ridley-Watkins-Hilsum (RWH) transferred electron effect. At high electric fields, conduction electrons transfer from a high-mobility lower energy valley to a low-mobility higher energy valley, producing a Negative Differential Resistance (dI/dV < 0) that generates microwave oscillations directly from DC.`,
      },
      {
        heading: '3. PIN Diodes & RF Switching',
        content: `A PIN diode contains an undoped wide Intrinsic (I) semiconductor layer between P and N regions. At low frequencies, it behaves like a normal diode. At RF/microwave frequencies (> 10 MHz), the intrinsic layer stores charge carriers, causing the diode to act as a pure current-controlled RF resistor. Used in high-power RF switches, attenuators, and antenna phase shifters.`,
      },
    ],
    emcNote: 'Schottky barrier diodes have near-zero reverse recovery time (trr ≈ 0), making them essential for high-frequency RF power detection and low-noise clamping.',
  },
  {
    id: 'rf-07',
    num: '07',
    courseId: 'microwave',
    title: 'Microwave Vacuum Tubes & Sources',
    sourcePdf: 'Microwave+Sources.pdf',
    tags: ['Reflex Klystron', 'Magnetron', 'Traveling Wave Tube (TWT)', 'Velocity Modulation', 'Applegate Diagram'],
    summary: 'High-power microwave vacuum tubes: electron beam velocity modulation, Reflex Klystron oscillators, Cavity Magnetrons, Traveling Wave Tube (TWT) amplifiers, and Applegate bunching diagrams.',
    equations: [
      { name: 'Electron Velocity from Voltage', formula: 'v₀ = √(2·e·V₀ / m_e) ≈ 5.93 × 10⁵ · √V₀', units: 'm/s' },
      { name: 'Klystron Optimum Bunching Parameter', formula: 'X = (β_i·V_i / 2·V₀) · θ₀ = 1.84', units: 'Dimensionless' },
      { name: 'TWT Power Gain', formula: 'G_dB = -9.54 + 47.3 · C · N', units: 'Decibels (dB)' },
    ],
    deepSections: [
      {
        heading: '1. Velocity Modulation & Applegate Diagrams',
        content: `Conventional vacuum tubes fail at microwave frequencies due to electron transit-time delays and inter-electrode capacitance. Microwave tubes exploit electron transit time through velocity modulation: an electron gun accelerates electrons into an RF resonant cavity gap. The alternating RF gap voltage accelerates early electrons and decelerates late electrons. In the drift space, faster electrons catch up with slower electrons, forming tightly concentrated electron bunches.`,
      },
      {
        heading: '2. Reflex Klystron Oscillator',
        content: `A single-cavity tube with a negative Repeller electrode positioned after the cavity. The electron beam passes through the cavity, gets velocity modulated, is turned around by the negative repeller voltage (Vr), and drifts back into the cavity. If bunches return during the retarding RF cycle (Mode n + 3/4), they transfer kinetic energy to the RF field, sustaining microwave oscillations.`,
      },
      {
        heading: '3. Cavity Magnetron & Traveling Wave Tubes (TWT)',
        content: `• Cavity Magnetron: Cross-field tube where radial electric and axial magnetic fields force electrons into curved cycloidal trajectories past resonant anode cavities, generating kilowatts of microwave power (used in Radar and microwave ovens).
• Traveling Wave Tube (TWT): Broad-bandwidth microwave amplifier. An electron beam travels alongside a slow-wave helical structure at identical phase velocities, continuously transferring beam kinetic energy to amplify RF signals across octave bandwidths.`,
      },
    ],
    emcNote: 'Traveling Wave Tube Amplifiers (TWTAs) are used in high-power EMC laboratory radiated immunity testing (ISO 11452-2) to generate > 200 V/m test fields up to 18 GHz.',
  },
  {
    id: 'rf-08',
    num: '08',
    courseId: 'microwave',
    title: 'Microwave Measurements & EMI/EMC Fundamentals',
    sourcePdf: 'Microwave+Measurement.pdf',
    tags: ['Microwave Measurements', 'VSWR Slotted Line', 'Power Sensors', 'Spectrum Analyzer', 'EMI/EMC Classes'],
    summary: 'VSWR slotted-line measurements, bolometer power sensing, frequency meters, and fundamental EMI/EMC concepts (Conducted/Radiated emissions, Intra/Inter device coupling).',
    equations: [
      { name: 'VSWR from Max/Min Voltages', formula: 'VSWR = V_max / V_min = (1 + |Γ|) / (1 - |Γ|)', units: 'Ratio' },
      { name: 'Decibel Relative to 1 mW', formula: 'P_dBm = 10 · log₁₀(P_mW / 1 mW)', units: 'dBm' },
      { name: 'Bolometer Power Measurement', formula: 'P_RF = (V_bridge)² / (4 · R)', units: 'Watts (W)' },
    ],
    deepSections: [
      {
        heading: '1. Slotted Line VSWR & Impedance Measurement',
        content: `A slotted line consists of a precision waveguide or coaxial section with a narrow longitudinal slot that allows an electric field probe to sample standing wave voltages along the line without disturbing the field. Measuring V_max and V_min directly yields VSWR. The distance between adjacent voltage minima equals half the guide wavelength (λ_g / 2).`,
      },
      {
        heading: '2. RF Power & Frequency Measurement',
        content: `• Bolometers / Thermistors: Temperature-sensitive resistors whose resistance changes when absorbing RF power. Connected in a self-balancing Wheatstone bridge to measure true average power from µW to Watts.
• Cavity Wavemeters: Resonant cavity with calibrated micrometer plunger. When cavity frequency matches the input signal, RF power dips sharply, giving frequency accuracy to 0.1%.`,
      },
      {
        heading: '3. EMI & EMC Fundamentals',
        content: `• EMI (Electromagnetic Interference): Degradation of performance caused by an electromagnetic disturbance.
  - Natural Sources: Atmospheric lightning, solar flares.
  - Man-Made Sources: DC motor brushes, SMPS switches, microprocessors, wireless transmitters.
• Conducted EMI: Propagates directly along power cables and signal wiring.
• Radiated EMI: Propagates through free space as electromagnetic waves.
• EMC (Electromagnetic Compatibility): Ability of equipment to function satisfactorily in its electromagnetic environment without introducing intolerable electromagnetic disturbances to anything in that environment.`,
      },
    ],
    emcNote: 'Mastering microwave measurement instruments (Spectrum Analyzers, VNAs, Power Sensors) is essential for validating CISPR 25 and ISO 11452 compliance.',
  },
]

// Course 3: Power Electronics & LTSpice (8 Modules)

const POWER_ELECTRONICS_MODULES = [
  {
    "id": "pe-01",
    "num": "01",
    "courseId": "power",
    "title": "Power Electronics Foundations & Energy Conversion",
    "sourcePdf": "Power_Electronics_AllSlides.pdf",
    "tags": [
      "Power Electronics",
      "SMPS",
      "Linear vs Switched",
      "EV Inverters",
      "Aerospace",
      "Efficiency"
    ],
    "summary": "Introduction to power semiconductor conversion, applications in aerospace, telecommunications, and electric vehicle powertrain, and why switched-mode converters achieve >90% efficiency.",
    "equations": [
      {
        "name": "Power Efficiency",
        "formula": "η = (P_out / P_in) · 100% = (P_out / (P_out + P_loss)) · 100%",
        "units": "Percentage (%)"
      },
      {
        "name": "Linear Regulator Dissipation",
        "formula": "P_loss = (V_in - V_out) · I_load",
        "units": "Watts (W)"
      },
      {
        "name": "Average Power Integral",
        "formula": "P_avg = (1 / T) · ∫₀ᵀ v(t) · i(t) dt",
        "units": "Watts (W)"
      },
      {
        "name": "RMS Voltage for Periodic Wave",
        "formula": "V_rms = √( (1 / T) · ∫₀ᵀ [v(t)]² dt )",
        "units": "Volts (V)"
      }
    ],
    "deepSections": [
      {
        "heading": "1. What is Power Electronics?",
        "content": "Power electronics is the technology associated with the efficient conversion, control, and conditioning of electric power by static means from an available input into the desired electrical output form (AC-DC rectifiers, DC-DC converters, DC-AC inverters, AC-AC cycloconverters)."
      },
      {
        "heading": "2. Linear vs Switched-Mode Operation",
        "content": "In a linear power supply, the series pass transistor acts as a variable resistor, dropping the excess voltage (Vin - Vout) and dissipating substantial heat, resulting in low efficiency (often < 40-50%). In switched-mode power supplies (SMPS), semiconductor switches operate only in saturation (ON with near-zero voltage drop) or cutoff (OFF with near-zero leakage current), achieving theoretical 100% efficiency and real-world efficiencies > 90-96%."
      },
      {
        "heading": "3. Critical Applications",
        "content": "• Electric Vehicles: Traction inverters (300-800V DC to 3-phase AC), On-Board Chargers (OBC), and High-Voltage to 12V DC-DC converters.\n• Renewable Energy: Grid-tied solar photovoltaic MPPT inverters and wind turbine generators.\n• Aerospace & Satellite: Radiation-hardened power buses and satellite power conditioning units."
      }
    ],
    "emcNote": "High di/dt and dv/dt switching transients in SMPS converters are the primary source of conducted and radiated EMI in automotive ECUs, requiring input common-mode filters."
  },
  {
    "id": "pe-02",
    "num": "02",
    "courseId": "power",
    "title": "Power Computation & LTSpice Simulation Lab",
    "sourcePdf": "Power_Electronics_AllSlides.pdf",
    "tags": [
      "LTSpice",
      "Transient Analysis",
      "AC Sweeps",
      "Average Power",
      "Harmonics",
      "Crest Factor"
    ],
    "summary": "Mastering LTSpice SPICE simulation for transient power circuits, calculating instantaneous vs average power, and analyzing non-sinusoidal waveforms.",
    "equations": [
      {
        "name": "Instantaneous Power",
        "formula": "p(t) = v(t) · i(t)",
        "units": "Watts (W)"
      },
      {
        "name": "Form Factor",
        "formula": "FF = V_rms / V_avg",
        "units": "Dimensionless"
      },
      {
        "name": "Crest Factor",
        "formula": "CF = V_peak / V_rms",
        "units": "Dimensionless"
      },
      {
        "name": "Total Harmonic Distortion",
        "formula": "THD = √( ∑ₙ₌₂^∞ Vₙ² ) / V₁",
        "units": "Ratio / %"
      }
    ],
    "deepSections": [
      {
        "heading": "1. LTSpice Transient & Operating Point Setup",
        "content": "LTSpice utilizes numerical integration algorithms (Trapezoidal, Gear, and modified Trap) to solve non-linear differential equations of switching circuits. Use '.tran 10m' with a maximum time-step constraint (e.g., '.tran 0 10m 0 10n') to capture fast switching edges and ringing oscillations."
      },
      {
        "heading": "2. Waveform Power Integration in LTSpice",
        "content": "Holding the Alt key and clicking on a component in LTSpice automatically plots instantaneous power dissipation. Ctrl + Left Click on the waveform label integrates the curve over the displayed time span, yielding Average Power (Watts) and Total Energy (Joules)."
      },
      {
        "heading": "3. Analyzing Distorted Switching Waveforms",
        "content": "Real-world power converters produce non-sinusoidal pulse trains. Accurate power factor (PF = P / (Vrms · Irms)) requires accounting for displacement power factor (cos φ) and distortion power factor (1 / √(1 + THD²))."
      }
    ],
    "emcNote": "Simulating high-frequency parasitic inductance and PCB trace capacitance in LTSpice allows pre-compliance prediction of voltage overshoot spikes."
  },
  {
    "id": "pe-03",
    "num": "03",
    "courseId": "power",
    "title": "Thermal Design & Heatsink Consideration",
    "sourcePdf": "Power_Electronics_AllSlides.pdf",
    "tags": [
      "Thermal Resistance",
      "Junction Temperature",
      "Heatsink",
      "Switching Losses",
      "Conduction Losses"
    ],
    "summary": "Thermal equivalent circuits, calculating semiconductor junction temperature, conduction vs switching loss breakdown, and heatsink dimensioning.",
    "equations": [
      {
        "name": "Junction Temperature",
        "formula": "T_j = T_a + P_D · (R_θjc + R_θcs + R_θsa)",
        "units": "Celsius (°C)"
      },
      {
        "name": "Conduction Loss (MOSFET)",
        "formula": "P_cond = I_rms² · R_DS(on)(T_j)",
        "units": "Watts (W)"
      },
      {
        "name": "Switching Loss (Turn-ON + Turn-OFF)",
        "formula": "P_sw = 0.5 · V_in · I_out · (t_on + t_off) · f_sw",
        "units": "Watts (W)"
      },
      {
        "name": "Maximum Thermal Resistance",
        "formula": "R_θsa(max) = [(T_j(max) - T_a) / P_D] - R_θjc - R_θcs",
        "units": "°C / Watt"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Thermal Equivalent Circuit Analogy",
        "content": "Thermal systems follow Ohm's Law analogy: Temperature Difference ΔT is analogous to Voltage (V), Heat Flow Power P_D is analogous to Current (I), and Thermal Resistance R_θ is analogous to Electrical Resistance (Ω). The total thermal path from semiconductor junction to ambient is: R_θja = R_θjc (junction-to-case) + R_θcs (case-to-sink thermal pad) + R_θsa (sink-to-ambient)."
      },
      {
        "heading": "2. Conduction vs Switching Loss Trade-off",
        "content": "• Conduction Loss depends on device on-state resistance R_DS(on) or saturation voltage V_CE(sat). It increases with current squared.\n• Switching Loss occurs during the finite transition intervals (t_on and t_off) when both voltage and current across the switch are simultaneously non-zero. Switching loss increases strictly linearly with switching frequency f_sw."
      },
      {
        "heading": "3. Thermal Derating & Safe Operating Area (SOA)",
        "content": "Silicon semiconductor maximum junction temperature is typically Tj(max) = 150°C (or 175°C for SiC/automotive grade). Operating above Tj(max) causes thermal runaway and dielectric breakdown of the gate oxide."
      }
    ],
    "emcNote": "Large heatsinks act as parasitic patch antennas that couple RF common-mode noise to the vehicle chassis unless grounded through low-inductance bonding straps."
  },
  {
    "id": "pe-04",
    "num": "04",
    "courseId": "power",
    "title": "Power Diodes & Reverse Recovery Dynamics",
    "sourcePdf": "Power_Electronics_AllSlides.pdf",
    "tags": [
      "Power Diode",
      "Schottky",
      "Reverse Recovery",
      "Qrr",
      "Snubber Circuit",
      "FRED"
    ],
    "summary": "P-N junction vs Schottky barrier power diodes, minority carrier reverse recovery charge (Qrr), voltage overshoot spikes, and RC snubber mitigation.",
    "equations": [
      {
        "name": "Reverse Recovery Charge",
        "formula": "Q_rr = 0.5 · I_rr · t_rr",
        "units": "Coulombs (C) / nC"
      },
      {
        "name": "Peak Reverse Recovery Current",
        "formula": "I_rr = (di/dt) · t_a",
        "units": "Amperes (A)"
      },
      {
        "name": "Reverse Recovery Power Loss",
        "formula": "P_rr = Q_rr · V_R · f_sw",
        "units": "Watts (W)"
      },
      {
        "name": "RC Snubber Resistor",
        "formula": "R_snub = √(L_parasitic / C_junction)",
        "units": "Ohms (Ω)"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Diode Reverse Recovery Physics",
        "content": "When a forward-conducting P-N diode is suddenly reverse-biased, stored minority charge in the drift region cannot disappear instantaneously. The diode continues conducting in the reverse direction for a time t_rr until minority carriers recombine or are swept out, reaching peak negative current I_rr before snapping OFF."
      },
      {
        "heading": "2. Schottky vs Silicon Fast Recovery Diodes",
        "content": "• Schottky Barrier Diodes (SBD): Metal-semiconductor majority carrier devices with zero minority carrier reverse recovery (virtually t_rr = 0). Ideal for low-voltage (< 100V) high-efficiency buck converters.\n• Silicon Carbide (SiC) Schottky: Handles up to 1200V with near-zero recovery losses, revolutionizing 800V EV powertrains."
      },
      {
        "heading": "3. Snubber Circuits for Diode Protection",
        "content": "The sharp snap-off (high di/dt) interacting with PCB trace parasitic inductance L_p creates massive voltage spikes V_spike = L_p · (di/dt). An RC snubber placed across the diode clamps the peak voltage and dampens RF ringing oscillations."
      }
    ],
    "emcNote": "Diode reverse recovery snap-off is a major generator of 30 MHz to 300 MHz conducted emissions in CISPR 25 test chambers."
  },
  {
    "id": "pe-05",
    "num": "05",
    "courseId": "power",
    "title": "Power MOSFETs, Gate Drivers & Bootstrap Design",
    "sourcePdf": "Power_Electronics_AllSlides.pdf",
    "tags": [
      "Power MOSFET",
      "Miller Effect",
      "Gate Driver",
      "Bootstrap Capacitor",
      "Dead-Time",
      "Shoot-Through"
    ],
    "summary": "MOSFET switching dynamics, Miller plateau capacitance, high-side gate driver architecture, bootstrap circuit dimensioning, and shoot-through protection.",
    "equations": [
      {
        "name": "Gate Driver Peak Current",
        "formula": "I_g(peak) = (V_drive - V_th) / (R_driver + R_gate_internal)",
        "units": "Amperes (A)"
      },
      {
        "name": "Bootstrap Capacitor Sizing",
        "formula": "C_boot ≥ (Q_gate + I_leak · t_on_max) / ΔV_boot_ripple",
        "units": "Farads (F) / µF"
      },
      {
        "name": "Gate Drive Power Dissipation",
        "formula": "P_gate = Q_gate · V_drive · f_sw",
        "units": "Watts (W)"
      },
      {
        "name": "Dead-Time Requirement",
        "formula": "t_dead > t_off(max) - t_on(min) + t_prop_delay_skew",
        "units": "Nanoseconds (ns)"
      }
    ],
    "deepSections": [
      {
        "heading": "1. MOSFET Switching Transitions & Miller Plateau",
        "content": "During turn-on, the gate voltage charges through three distinct phases: (1) charging C_gs up to V_th, (2) charging the drain-to-gate feedback capacitance C_gd during the Miller Plateau where V_ds collapses, and (3) charging C_gs and C_gd into full saturation. Gate driver peak current determines how fast the transistor traverses the high-loss Miller plateau."
      },
      {
        "heading": "2. High-Side Bootstrap Circuit Architecture",
        "content": "In N-channel half-bridge configurations, the high-side source terminal floats between 0V and Vin. A bootstrap circuit consisting of a fast high-voltage diode and capacitor C_boot charges when the low-side switch is ON (source grounded), providing floating gate voltage above Vin when the high-side switch turns ON."
      },
      {
        "heading": "3. Shoot-Through & Dead-Time Insertion",
        "content": "If both high-side and low-side transistors in a half-bridge turn ON simultaneously, a dead short-circuit across the DC bus occurs (shoot-through), instantly destroying the transistors. Hardware or microcontroller gate drivers insert a dead-time (50 ns to 500 ns) ensuring one switch turns OFF completely before the other turns ON."
      }
    ],
    "emcNote": "Placing gate driver ICs within millimeters of the MOSFET gate and minimizing gate loop area prevents high-frequency parasitic ringing and radiated emissions."
  },
  {
    "id": "pe-06",
    "num": "06",
    "courseId": "power",
    "title": "DC-AC Inverters & Sinusoidal PWM (SPWM)",
    "sourcePdf": "Power_Electronics_AllSlides.pdf",
    "tags": [
      "Inverters",
      "SPWM",
      "H-Bridge",
      "Harmonics",
      "Modulation Index",
      "Total Harmonic Distortion"
    ],
    "summary": "Single-phase and three-phase DC to AC inverters, H-bridge topology, Unipolar vs Bipolar Sinusoidal Pulse Width Modulation (SPWM), and harmonic spectrum control.",
    "equations": [
      {
        "name": "Amplitude Modulation Index",
        "formula": "m_a = V_control_peak / V_tri_peak",
        "units": "Ratio (0 to 1.0)"
      },
      {
        "name": "Frequency Modulation Ratio",
        "formula": "m_f = f_carrier / f_fundamental",
        "units": "Integer Ratio"
      },
      {
        "name": "Fundamental Output Voltage (Bipolar)",
        "formula": "V_o1(rms) = m_a · (V_in / √2)",
        "units": "Volts (V)"
      },
      {
        "name": "Fundamental Output Voltage (Unipolar)",
        "formula": "V_o1(peak) = m_a · V_in",
        "units": "Volts (V)"
      }
    ],
    "deepSections": [
      {
        "heading": "1. H-Bridge Inverter Topologies",
        "content": "An H-bridge inverter consists of four power switches arranged across a DC supply. By switching diagonal pairs (S1-S4 vs S2-S3), an alternating AC square wave or PWM pulse train is applied across the output load."
      },
      {
        "heading": "2. Sinusoidal PWM (SPWM) Synthesis",
        "content": "A low-frequency reference sinusoidal waveform (modulating signal) is continuously compared against a high-frequency triangular carrier wave. The comparator output generates PWM pulses whose duty cycle is proportional to the instantaneous sine amplitude, moving harmonic energy to high carrier frequencies where they are easily filtered by a small LC low-pass filter."
      },
      {
        "heading": "3. Unipolar vs Bipolar Switching",
        "content": "• Bipolar PWM: Output voltage switches between +Vin and -Vin. First harmonics appear at carrier frequency mf.\n• Unipolar PWM: Output switches between +Vin, 0, and -Vin. First harmonics appear at twice the carrier frequency (2·mf), reducing output ripple, filter size, and switching losses."
      }
    ],
    "emcNote": "Inverter output common-mode voltage creates high shaft currents in AC electric motors, requiring insulated bearings and shielded motor cables."
  },
  {
    "id": "pe-07",
    "num": "07",
    "courseId": "power",
    "title": "Buck Converter (Step-Down) Inductor & CCM/DCM Analysis",
    "sourcePdf": "Power_Electronics_AllSlides.pdf",
    "tags": [
      "Buck Converter",
      "Step-Down",
      "CCM",
      "DCM",
      "Volt-Second Balance",
      "Inductor Sizing"
    ],
    "summary": "Buck converter operation, Volt-Second balance theorem, inductor current ripple calculation, Continuous vs Discontinuous Conduction Modes (CCM/DCM), and output capacitor ESR selection.",
    "equations": [
      {
        "name": "Buck Voltage Conversion Ratio (CCM)",
        "formula": "V_o = D · V_in  (where Duty Cycle D = t_on / T_s)",
        "units": "Volts (V)"
      },
      {
        "name": "Inductor Current Ripple",
        "formula": "ΔI_L = [ (V_in - V_o) · D ] / (L · f_sw)",
        "units": "Amperes (A)"
      },
      {
        "name": "Critical Inductance (CCM/DCM boundary)",
        "formula": "L_crit = [ (1 - D) · R_load ] / (2 · f_sw)",
        "units": "Henries (H) / µH"
      },
      {
        "name": "Output Voltage Ripple",
        "formula": "ΔV_o = (ΔI_L) / (8 · C_out · f_sw) + ΔI_L · R_ESR",
        "units": "Volts (V) / mV"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Volt-Second Balance Principle",
        "content": "In steady-state periodic operation, the net change in inductor current over one complete switching period Ts must be zero: ΔI_L = (1/L) ∫₀ᵀ v_L(t) dt = 0. Therefore, the positive volt-seconds applied when the switch is ON ((Vin - Vo)·D·Ts) must exactly balance the negative volt-seconds when the diode conducts (-Vo·(1-D)·Ts), proving Vo = D·Vin in CCM."
      },
      {
        "heading": "2. Continuous (CCM) vs Discontinuous (DCM) Conduction",
        "content": "• CCM: Inductor current never reaches zero. Output voltage Vo is strictly linear and depends only on duty cycle D regardless of load current.\n• DCM: At light loads (R_load > R_crit), inductor current drops to zero before the cycle ends. Output voltage becomes load-dependent and rises toward Vin unless duty cycle is actively reduced."
      },
      {
        "heading": "3. Component Selection & Inductor Saturation",
        "content": "Inductors must be sized with saturation current Isat ≥ I_L(peak) = I_out + ΔI_L / 2 to prevent core saturation. Output capacitors must have ultra-low Equivalent Series Resistance (ESR) since ESR dominates high-frequency output ripple."
      }
    ],
    "emcNote": "The high di/dt loop formed by the input capacitor, high-side MOSFET, and freewheeling diode (hot loop) must have minimal enclosed loop area on the PCB."
  },
  {
    "id": "pe-08",
    "num": "08",
    "courseId": "power",
    "title": "Boost & Buck-Boost Converters & LTSpice Closed-Loop Lab",
    "sourcePdf": "Power_Electronics_AllSlides.pdf",
    "tags": [
      "Boost Converter",
      "Buck-Boost",
      "RHP Zero",
      "Closed-Loop Control",
      "LTSpice Simulation"
    ],
    "summary": "Step-up boost and inverting buck-boost converter topologies, Right-Half-Plane (RHP) zero stabilization challenges, and closed-loop feedback compensation in LTSpice.",
    "equations": [
      {
        "name": "Boost Voltage Conversion Ratio (CCM)",
        "formula": "V_o = V_in / (1 - D)",
        "units": "Volts (V)"
      },
      {
        "name": "Buck-Boost Conversion Ratio (Inverting)",
        "formula": "V_o = - [ D / (1 - D) ] · V_in",
        "units": "Volts (V)"
      },
      {
        "name": "Boost Right-Half-Plane Zero",
        "formula": "f_RHPZ = [ R_load · (1 - D)² ] / (2π · L)",
        "units": "Hertz (Hz)"
      },
      {
        "name": "Boost Inductor Sizing",
        "formula": "L = (V_in · D) / (ΔI_L · f_sw)",
        "units": "Henries (H) / µH"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Boost Converter Topology & Operation",
        "content": "When the switch is ON, energy from Vin is stored in the inductor while the output capacitor supplies the load. When the switch turns OFF, inductor flyback voltage adds in series with the input voltage, pushing energy through the diode into the load at a higher voltage Vo > Vin."
      },
      {
        "heading": "2. The Right-Half-Plane (RHP) Zero Challenge",
        "content": "Boost and buck-boost converters exhibit a dynamic Right-Half-Plane zero in their control-to-output transfer function. Increasing duty cycle momentarily drops output voltage before raising it because the switch diverts energy away from the load during the ON phase. Feedback loop crossover frequency must be limited to < f_RHPZ / 3 to ensure stability."
      },
      {
        "heading": "3. Closed-Loop Voltage Regulation in LTSpice",
        "content": "Closed-loop voltage mode and peak current mode control employ Type II or Type III error amplifiers with proportional-integral-derivative (PID) compensation networks to achieve high DC regulation accuracy and fast transient step-load response."
      }
    ],
    "emcNote": "Boost converter output capacitors handle discontinuous pulsating current, making output cabling vulnerable to high-frequency common-mode radiated EMI."
  }
]

// Course 4: RAHRF101 RF Fundamentals Concepts & Components (21 Modules)

const RAHRF101_MODULES = [
  {
    "id": "rahrf-01",
    "num": "01",
    "courseId": "rahrf",
    "title": "What is Radio Frequency & EM Spectrum",
    "sourcePdf": "RAHRF101_Module_01.pdf",
    "tags": [
      "Radio Frequency",
      "EM Spectrum",
      "Wavelength",
      "RF Frequencies",
      "High Frequency"
    ],
    "summary": "Fundamental definition of Radio Frequency (3 kHz to 300 GHz), electromagnetic wave propagation, frequency bands (VHF, UHF, SHF, EHF), and why high-frequency circuits require distributed transmission analysis.",
    "equations": [
      {
        "name": "Wave Relationship",
        "formula": "c = λ · f  (c ≈ 3 × 10⁸ m/s in vacuum)",
        "units": "m/s"
      },
      {
        "name": "Wavelength in Dielectric",
        "formula": "λ = c / (f · √ε_r)",
        "units": "Meters (m)"
      },
      {
        "name": "RF Component Boundary Criterion",
        "formula": "Length ≥ λ / 10  (Distributed behavior applies)",
        "units": "Meters (m)"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Radio Frequency & Electromagnetic Radiation",
        "content": "Radio Frequency refers to alternating electrical signals and electromagnetic waves with frequencies from 3 kHz up to 300 GHz. Unlike low-frequency DC/audio signals, RF waves radiate through space and exhibit distributed transmission effects."
      },
      {
        "heading": "2. Lumped vs Distributed Regimes",
        "content": "When circuit physical dimensions are much smaller than the wavelength (L < λ/10), traditional Kirchhoff laws (KCL/KVL) apply. When dimensions approach or exceed λ/10, propagation delay, standing waves, and distributed capacitance/inductance dominate."
      }
    ],
    "emcNote": "At RF frequencies, small PCB traces act as unintentional radiating antennas governed by λ/4 resonance."
  },
  {
    "id": "rahrf-02",
    "num": "02",
    "courseId": "rahrf",
    "title": "Noise in RF Circuits & Systems",
    "sourcePdf": "RAHRF101_Module_12.pdf",
    "tags": [
      "Thermal Noise",
      "Johnson Noise",
      "Noise Figure",
      "SNR",
      "Friis Formula",
      "Sensitivity"
    ],
    "summary": "Thermal Johnson-Nyquist noise, Signal-to-Noise Ratio (SNR), Noise Factor (F), Noise Figure (NF), and cascaded receiver noise using Friis formula.",
    "equations": [
      {
        "name": "Thermal Noise Power",
        "formula": "P_n = k · T · B  (k = 1.38 × 10⁻²³ J/K)",
        "units": "Watts (W) / dBm"
      },
      {
        "name": "Noise Power in 1 Hz (290 K)",
        "formula": "P_n = -174 dBm/Hz",
        "units": "dBm/Hz"
      },
      {
        "name": "Noise Figure",
        "formula": "NF = 10 · log₁₀(SNR_in / SNR_out) = 10 · log₁₀(F)",
        "units": "Decibels (dB)"
      },
      {
        "name": "Friis Cascaded Noise Formula",
        "formula": "F_total = F₁ + (F₂ - 1)/G₁ + (F₃ - 1)/(G₁·G₂) + ...",
        "units": "Linear Ratio"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Thermal Johnson Noise Physics",
        "content": "Thermal noise arises from the random thermal agitation of electrons inside any resistive conductive material at temperature T > 0 K. It has a flat spectral density (white noise) of -174 dBm/Hz at room temperature (290 K)."
      },
      {
        "heading": "2. Friis Cascaded Noise Formula Significance",
        "content": "In a receiver signal chain, the noise figure of the very first stage (the Low Noise Amplifier) dominates total system noise figure because the noise of subsequent stages is divided by the first stage gain G1."
      }
    ],
    "emcNote": "External electromagnetic interference raises the effective noise floor, degrading receiver sensitivity."
  },
  {
    "id": "rahrf-03",
    "num": "03",
    "courseId": "rahrf",
    "title": "RF V-I-F-Z-P (Voltage, Current, Frequency, 50Ω & dBm)",
    "sourcePdf": "RAHRF101_Module_15.pdf",
    "tags": [
      "V-I-F-Z-P",
      "50 Ohm",
      "dBm",
      "RF Power",
      "Characteristic Impedance"
    ],
    "summary": "Core RF parameters: Voltage, Current, Frequency, why 50 Ohm is the universal RF standard (compromise between power handling and attenuation), and dBm power conversion.",
    "equations": [
      {
        "name": "Power in dBm",
        "formula": "P_dBm = 10 · log₁₀(P_mW / 1 mW)",
        "units": "dBm"
      },
      {
        "name": "dBm to Watts",
        "formula": "P_Watts = 10^((P_dBm - 30) / 10)",
        "units": "Watts (W)"
      },
      {
        "name": "RMS Voltage into 50Ω",
        "formula": "V_rms = √(P_Watts · 50 Ω)",
        "units": "Volts (V)"
      },
      {
        "name": "dBµV into 50Ω",
        "formula": "dBµV = dBm + 107 dB",
        "units": "dBµV"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Why 50 Ohms is the Universal Standard",
        "content": "In coaxial cables, minimum RF attenuation occurs at Z₀ = 77 Ω (air dielectric), while maximum power handling occurs at Z₀ = 30 Ω. 50 Ω was selected as the optimal engineering compromise for coaxial transmission systems."
      },
      {
        "heading": "2. Decibel Power Relationships (dBm)",
        "content": "• 0 dBm = 1.0 mW (224 mV RMS into 50 Ω)\n• 30 dBm = 1.0 Watt (7.07 V RMS into 50 Ω)\n• -100 dBm = 0.1 pW (ultra-weak GPS/LTE received signal)"
      }
    ],
    "emcNote": "Automotive test receivers and CISPR 25 LISNs are calibrated with exact 50 Ω characteristic termination."
  },
  {
    "id": "rahrf-04",
    "num": "04",
    "courseId": "rahrf",
    "title": "RF Transceiver Modules & Architecture",
    "sourcePdf": "RAHRF101_Module_16.pdf",
    "tags": [
      "RF Transceiver",
      "Superheterodyne",
      "Direct Conversion",
      "Zero-IF",
      "Frontend"
    ],
    "summary": "Transceiver block diagrams, Superheterodyne vs Zero-IF Direct Conversion architectures, transmit/receive duplexers, and front-end module (FEM) integration.",
    "equations": [
      {
        "name": "Intermediate Frequency (Superhet)",
        "formula": "f_IF = |f_RF - f_LO|",
        "units": "Hertz (Hz)"
      },
      {
        "name": "Image Frequency",
        "formula": "f_Image = f_RF + 2 · f_IF  (for High-Side LO Injection)",
        "units": "Hertz (Hz)"
      },
      {
        "name": "Image Rejection Ratio",
        "formula": "IRR = 10 · log₁₀(P_RF / P_Image)",
        "units": "Decibels (dB)"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Superheterodyne Receiver",
        "content": "Converts incoming high-frequency RF to a fixed lower Intermediate Frequency (IF) using a mixer and local oscillator (LO). Provides superior selectivity and sensitivity, but requires image rejection filtering."
      },
      {
        "heading": "2. Direct Conversion (Zero-IF / Homodyne)",
        "content": "Mixes RF directly with an LO tuned to the RF carrier frequency (f_LO = f_RF), converting the signal directly to baseband (I/Q channels). Eliminates IF filters and image frequency, but suffers from DC offset and 1/f flicker noise."
      }
    ],
    "emcNote": "Local oscillator radiation from receiver mixers can cause self-interference and fail CISPR 25 radiated emissions."
  },
  {
    "id": "rahrf-05",
    "num": "05",
    "courseId": "rahrf",
    "title": "Antennas & Radiation Fundamentals",
    "sourcePdf": "RAHRF101_Module_17.pdf",
    "tags": [
      "Antenna",
      "Radiation Pattern",
      "Antenna Gain",
      "Directivity",
      "Dipole",
      "Polarization"
    ],
    "summary": "Antenna radiation physics, isotropic radiators, half-wave dipole, monopole, antenna gain (dBi), radiation resistance, and polarization matching.",
    "equations": [
      {
        "name": "Antenna Gain",
        "formula": "G = η_rad · D  (where D is Directivity, η is efficiency)",
        "units": "Linear / dBi"
      },
      {
        "name": "Half-Wave Dipole Impedance",
        "formula": "Z_in ≈ 73 + j42.5 Ω  (Resonant length ~ 0.48 λ)",
        "units": "Ohms (Ω)"
      },
      {
        "name": "Quarter-Wave Monopole",
        "formula": "Z_in ≈ 36.5 + j21.25 Ω  (Over ideal ground plane)",
        "units": "Ohms (Ω)"
      },
      {
        "name": "Friis Transmission Equation",
        "formula": "P_rx = P_tx · G_tx · G_rx · (λ / (4π·d))²",
        "units": "Watts (W)"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Antenna Radiation & Far-Field Boundary",
        "content": "Acceleration of electric charges along an antenna creates radiating electric and magnetic waves. The Fraunhofer far-field region begins at distance d ≥ 2·D² / λ, where wave impedance reaches free-space impedance η₀ = 377 Ω."
      },
      {
        "heading": "2. Antenna Polarization",
        "content": "Polarization is the orientation of the radiating E-field vector (Linear Vertical, Linear Horizontal, Circular LHCP/RHCP). A 90° polarization mismatch produces near-infinite signal loss (> 20-30 dB attenuation)."
      }
    ],
    "emcNote": "ISO 11452-2 and CISPR 25 test chambers test both vertical and horizontal antenna polarizations across all frequencies."
  },
  {
    "id": "rahrf-06",
    "num": "06",
    "courseId": "rahrf",
    "title": "RF Filters & Synthesis Topologies",
    "sourcePdf": "RAHRF101_Module_18.pdf",
    "tags": [
      "RF Filters",
      "Low-Pass",
      "Band-Pass",
      "Butterworth",
      "Chebyshev",
      "Insertion Loss"
    ],
    "summary": "RF filter classification, Low-Pass, High-Pass, Band-Pass, Band-Stop filters, Butterworth maximally-flat response vs Chebyshev steep roll-off, and insertion loss.",
    "equations": [
      {
        "name": "Filter Insertion Loss",
        "formula": "IL (dB) = -10 · log₁₀(P_out / P_in) = -20 · log₁₀(|S₂₁|)",
        "units": "Decibels (dB)"
      },
      {
        "name": "Butterworth Attenuation",
        "formula": "|H(jω)|² = 1 / [ 1 + (ω / ω_c)²ⁿ ]",
        "units": "Magnitude Ratio"
      },
      {
        "name": "Chebyshev Ripple Response",
        "formula": "|H(jω)|² = 1 / [ 1 + ε² · Tₙ²(ω / ω_c) ]",
        "units": "Magnitude Ratio"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Filter Transfer Response Types",
        "content": "• Butterworth: Maximally flat passband with no ripple, moderate roll-off rate.\n• Chebyshev Type I: Equiripple in the passband with much steeper transition band roll-off.\n• Bessel: Linear phase response (constant group delay), preserving pulse waveforms without dispersion."
      },
      {
        "heading": "2. Distributed Filter Realization",
        "content": "At microwave frequencies, lumped inductors and capacitors become self-resonant. Filters are synthesized using stepped-impedance microstrip stubs and coupled-line transmission resonators."
      }
    ],
    "emcNote": "EMC power line filters utilize multi-stage Pi (C-L-C) low-pass topologies to suppress SMPS harmonics up to GHz ranges."
  },
  {
    "id": "rahrf-07",
    "num": "07",
    "courseId": "rahrf",
    "title": "Active vs Passive RF Components",
    "sourcePdf": "RAHRF101_Module_19.pdf",
    "tags": [
      "Active vs Passive",
      "PIN Diode",
      "Directional Coupler",
      "Circulator",
      "Attenuator"
    ],
    "summary": "Differentiating active vs passive RF components, PIN diode RF switches, directional couplers (coupling factor, directivity), and ferrite circulators/isolators.",
    "equations": [
      {
        "name": "Coupling Factor",
        "formula": "C (dB) = -10 · log₁₀(P_coupled / P_in)",
        "units": "Decibels (dB)"
      },
      {
        "name": "Directivity",
        "formula": "D (dB) = 10 · log₁₀(P_coupled / P_isolated)",
        "units": "Decibels (dB)"
      },
      {
        "name": "Isolation",
        "formula": "I (dB) = C (dB) + D (dB)",
        "units": "Decibels (dB)"
      }
    ],
    "deepSections": [
      {
        "heading": "1. PIN Diode RF Switches",
        "content": "A PIN diode contains an undoped intrinsic (I) layer between P and N regions. Under forward DC bias, it acts as a low-resistance RF conductor (< 1 Ω); under reverse bias, it acts as a low-capacitance open circuit (< 0.1 pF)."
      },
      {
        "heading": "2. Directional Couplers & Power Monitoring",
        "content": "Directional couplers sample forward and reflected RF power without breaking the signal path. Essential for closed-loop leveling in ISO 11452 RF power amplifiers."
      }
    ],
    "emcNote": "Directional couplers monitor net forward power (P_fwd - P_refl) during ISO 11452 substitution calibration."
  },
  {
    "id": "rahrf-08",
    "num": "08",
    "courseId": "rahrf",
    "title": "Low Noise Amplifiers (LNA Design & NFmin)",
    "sourcePdf": "RAHRF101_Module_20.pdf",
    "tags": [
      "LNA",
      "Low Noise Amplifier",
      "NFmin",
      "Stability Factor",
      "Gain Circles"
    ],
    "summary": "LNA architecture, optimizing input matching for Minimum Noise Figure (Γ_opt) vs Maximum Gain (S11* conjugate match), and Rollett stability factor (k > 1).",
    "equations": [
      {
        "name": "Noise Figure with Source Reflection",
        "formula": "NF = NF_min + [ (4 · R_n / Z₀) · |Γ_s - Γ_opt|² ] / [ (1 - |Γ_s|²) · |1 + Γ_opt|² ]",
        "units": "Decibels (dB)"
      },
      {
        "name": "Rollett Stability Factor (k)",
        "formula": "k = [ 1 - |S₁₁|² - |S₂₂|² + |Δ|² ] / [ 2 · |S₁₂ · S₂₁| ]  (k > 1 for unconditional stability)",
        "units": "Ratio"
      },
      {
        "name": "Delta Determinant",
        "formula": "Δ = S₁₁ · S₂₂ - S₁₂ · S₂₁",
        "units": "Complex"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Noise vs Power Gain Trade-off",
        "content": "Maximum power gain occurs when source impedance matches S11* (conjugate match). However, minimum noise figure NFmin occurs at optimal source reflection Γ_opt. LNA designers trade off gain (1-2 dB) to achieve lowest noise."
      },
      {
        "heading": "2. Unconditional Stability Verification",
        "content": "An amplifier is unconditionally stable if k > 1 and |Δ| < 1 for all frequencies. If k < 1, source or load impedances in certain regions of the Smith chart will cause the amplifier to oscillate."
      }
    ],
    "emcNote": "High-gain LNAs are susceptible to out-of-band RF saturation from nearby cellular and broadcast transmitters."
  },
  {
    "id": "rahrf-09",
    "num": "09",
    "courseId": "rahrf",
    "title": "RF Mixers & Frequency Conversion",
    "sourcePdf": "RAHRF101_Module_21.pdf",
    "tags": [
      "RF Mixer",
      "Frequency Conversion",
      "Local Oscillator",
      "Conversion Loss",
      "Isolation"
    ],
    "summary": "Non-linear frequency translation, Down-conversion & Up-conversion, LO-RF / LO-IF port isolation, conversion loss, and double-balanced diode ring mixers.",
    "equations": [
      {
        "name": "Mixer Frequency Output",
        "formula": "f_out = |m · f_RF ± n · f_LO|  (Fundamental: f_IF = |f_RF ± f_LO|)",
        "units": "Hertz (Hz)"
      },
      {
        "name": "Conversion Loss (Passive Mixer)",
        "formula": "CL (dB) = 10 · log₁₀(P_RF_in / P_IF_out) ≈ 6 to 8 dB",
        "units": "Decibels (dB)"
      },
      {
        "name": "LO to RF Isolation",
        "formula": "Isolation = 10 · log₁₀(P_LO / P_LO_leak_at_RF)",
        "units": "Decibels (dB)"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Frequency Multiplication & Mixing Physics",
        "content": "Applying two sinusoidal signals to a non-linear element (e.g. diode I-V curve or Gilbert cell transistor pair) produces sum (f_RF + f_LO) and difference (f_RF - f_LO) cross-product frequencies via trigonometric identity."
      },
      {
        "heading": "2. Double-Balanced Ring Mixers",
        "content": "Employs four matched Schottky diodes in a ring with two center-tapped balun transformers, canceling LO leakage at both RF and IF ports (high isolation > 35-45 dB)."
      }
    ],
    "emcNote": "Mixer LO leakage radiated out the receiver antenna is strictly regulated under CISPR 25 limits."
  },
  {
    "id": "rahrf-10",
    "num": "10",
    "courseId": "rahrf",
    "title": "Oscillators & Voltage Controlled Oscillators (VCO)",
    "sourcePdf": "RAHRF101_Module_02.pdf",
    "tags": [
      "Oscillators",
      "VCO",
      "Barkhausen",
      "Phase Noise",
      "Varactor",
      "LC Tank"
    ],
    "summary": "RF signal generation, Barkhausen oscillation criterion, Colpitts and Hartley LC tank oscillators, varactor tuning voltage-controlled oscillators (VCO), and phase noise.",
    "equations": [
      {
        "name": "Barkhausen Criterion (Magnitude & Phase)",
        "formula": "|A · β| = 1  and  ∠(A · β) = 0° (or 360°)",
        "units": "Condition"
      },
      {
        "name": "Resonant LC Frequency",
        "formula": "f₀ = 1 / [ 2π · √(L · C_total) ]",
        "units": "Hertz (Hz)"
      },
      {
        "name": "VCO Tuning Sensitivity",
        "formula": "K_vco = Δf / ΔV_tune",
        "units": "MHz / Volt"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Barkhausen Stability & Start-Up",
        "content": "For sustained oscillation, closed-loop gain |A·β| must equal 1 with total phase shift of 360° around the feedback loop. At startup, small-signal gain |A·β| > 1 ensures thermal noise builds up into full-amplitude oscillation."
      },
      {
        "heading": "2. Phase Noise & Jitter",
        "content": "Phase noise represents rapid, short-term random phase fluctuations in the oscillator output, measured in dBc/Hz at an offset frequency Δf from the carrier. High tank Q-factor reduces phase noise."
      }
    ],
    "emcNote": "Clock oscillators with fast rise times generate harmonics up to hundreds of megahertz that couple into automotive sensor wiring."
  },
  {
    "id": "rahrf-11",
    "num": "11",
    "courseId": "rahrf",
    "title": "Phase Locked Loops (PLL Synthesizers)",
    "sourcePdf": "RAHRF101_Module_03.pdf",
    "tags": [
      "PLL",
      "Phase Locked Loop",
      "Synthesizer",
      "Phase Detector",
      "Charge Pump",
      "Loop Filter"
    ],
    "summary": "Frequency synthesis, PLL closed-loop control (Phase Detector, Charge Pump, Loop Filter, VCO, Frequency Divider N), and lock time dynamics.",
    "equations": [
      {
        "name": "Synthesized Output Frequency",
        "formula": "f_out = N · f_ref  (Integer-N PLL)",
        "units": "Hertz (Hz)"
      },
      {
        "name": "Fractional-N Frequency",
        "formula": "f_out = (N + K / M) · f_ref",
        "units": "Hertz (Hz)"
      },
      {
        "name": "Loop Filter Bandwidth",
        "formula": "f_BW ≈ (1 / 10) · (f_ref / N)",
        "units": "Hertz (Hz)"
      }
    ],
    "deepSections": [
      {
        "heading": "1. PLL Closed-Loop Operation",
        "content": "The Phase Frequency Detector compares the phase of a crystal reference signal with the divided VCO output (f_out / N). The error signal drives a charge pump and low-pass loop filter, generating a DC tuning voltage that forces the VCO to lock exactly to N · f_ref."
      },
      {
        "heading": "2. Integer-N vs Fractional-N Synthesis",
        "content": "Fractional-N PLLs use delta-sigma modulators to interpolate between integer division ratios, achieving sub-Hertz frequency resolution with much wider loop bandwidth and lower phase noise."
      }
    ],
    "emcNote": "PLL loop filter instability causes spurious sideband emissions that violate narrow-band emissions limits."
  },
  {
    "id": "rahrf-12",
    "num": "12",
    "courseId": "rahrf",
    "title": "RF Power Amplifiers (Classes A to F & PAE)",
    "sourcePdf": "RAHRF101_Module_04.pdf",
    "tags": [
      "Power Amplifier",
      "Class A",
      "Class AB",
      "Class C",
      "Class E",
      "Class F",
      "PAE"
    ],
    "summary": "RF transmitter power amplifiers, bias conduction angles (Class A, AB, B, C, D, E, F), drain efficiency, and Power Added Efficiency (PAE).",
    "equations": [
      {
        "name": "Drain / Collector Efficiency",
        "formula": "η = (P_RF_out / P_DC) · 100%",
        "units": "Percentage (%)"
      },
      {
        "name": "Power Added Efficiency (PAE)",
        "formula": "PAE = [ (P_RF_out - P_RF_in) / P_DC ] · 100%",
        "units": "Percentage (%)"
      },
      {
        "name": "Class A Max Theoretical Efficiency",
        "formula": "η_max = 50%  (Conduction angle θ = 360°)",
        "units": "Percentage (%)"
      },
      {
        "name": "Class B Max Theoretical Efficiency",
        "formula": "η_max = (π / 4) · 100% ≈ 78.5%  (θ = 180°)",
        "units": "Percentage (%)"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Linear vs Switched PA Classes",
        "content": "• Class A: Highest linearity, active device conducts for full 360°, poor efficiency (max 50%).\n• Class AB: Conduction angle 180° < θ < 360°, optimal compromise between linearity and efficiency (60-70%).\n• Class E/F: Switching mode PAs using harmonic resonant wave-shaping to achieve > 85-90% efficiency."
      },
      {
        "heading": "2. Power Added Efficiency (PAE)",
        "content": "When RF input power is significant (at high GHz frequencies), standard efficiency overstates performance. PAE correctly subtracts driver input power from total generated RF power."
      }
    ],
    "emcNote": "Power amplifier non-linearities generate strong harmonic distortion requiring output low-pass harmonic suppression filters."
  },
  {
    "id": "rahrf-13",
    "num": "13",
    "courseId": "rahrf",
    "title": "Analog & Digital Modulation Schemes",
    "sourcePdf": "RAHRF101_Module_05.pdf",
    "tags": [
      "Modulation",
      "AM",
      "FM",
      "QPSK",
      "16-QAM",
      "Constellation",
      "EVM"
    ],
    "summary": "Information transmission via RF carrier, Amplitude Modulation (AM), Frequency Modulation (FM), Phase Shift Keying (BPSK, QPSK), Quadrature Amplitude Modulation (QAM), and Error Vector Magnitude (EVM).",
    "equations": [
      {
        "name": "AM Modulation Index",
        "formula": "m = (V_max - V_min) / (V_max + V_min)",
        "units": "Ratio (0 to 1.0)"
      },
      {
        "name": "FM Carson Bandwidth Rule",
        "formula": "BW = 2 · (Δf + f_m)",
        "units": "Hertz (Hz)"
      },
      {
        "name": "Bit Rate for M-ary QAM",
        "formula": "R_b = R_symbol · log₂(M)",
        "units": "Bits per second (bps)"
      },
      {
        "name": "Error Vector Magnitude",
        "formula": "EVM (%) = ( |E_rms_error| / |V_ref_max| ) · 100%",
        "units": "Percentage (%)"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Analog Modulation: AM vs FM",
        "content": "AM modulates carrier amplitude (vulnerable to noise and amplitude fading), while FM modulates carrier instantaneous frequency, offering high noise immunity (capture effect) at the expense of wider RF bandwidth."
      },
      {
        "heading": "2. Digital I/Q Modulation & Constellation",
        "content": "Digital modulators decompose symbols into In-Phase (I) and Quadrature (Q, 90° shifted) components. Higher-order schemes like 64-QAM and 256-QAM transmit up to 6-8 bits per symbol."
      }
    ],
    "emcNote": "ISO 11452 standards mandate testing DUTs with 1 kHz 80% AM and Pulse Modulation (PM 217 Hz for TDMA cellular immunity)."
  },
  {
    "id": "rahrf-14",
    "num": "14",
    "courseId": "rahrf",
    "title": "RF Linearity & Intermodulation Distortion",
    "sourcePdf": "RAHRF101_Module_06.pdf",
    "tags": [
      "Linearity",
      "1dB Compression",
      "P1dB",
      "IP3",
      "IIP3",
      "OIP3",
      "Intermodulation"
    ],
    "summary": "Non-linear distortion in RF amplifiers, 1 dB Gain Compression Point (P1dB), Harmonic distortion, Two-tone third-order intermodulation products (IMD3), and Intercept Point (IP3).",
    "equations": [
      {
        "name": "Third-Order Intercept Output",
        "formula": "OIP₃ = P_out + (ΔP_IMD3 / 2)",
        "units": "dBm"
      },
      {
        "name": "Input Third-Order Intercept",
        "formula": "IIP₃ = OIP₃ - Gain (dB)",
        "units": "dBm"
      },
      {
        "name": "Rule-of-Thumb P1dB to IP3",
        "formula": "OIP₃ ≈ P₁dB + 10 to 12 dB",
        "units": "dBm"
      }
    ],
    "deepSections": [
      {
        "heading": "1. 1 dB Gain Compression Point (P1dB)",
        "content": "As input RF power increases, the amplifier output eventually saturates. P1dB is the output power level at which amplifier gain drops by 1 dB relative to small-signal linear gain."
      },
      {
        "heading": "2. Third-Order Intermodulation (IMD3)",
        "content": "When two strong signals at f1 and f2 pass through a non-linear stage, third-order intermodulation products appear at 2·f1 - f2 and 2·f2 - f1. Because these fall directly inside the desired passband, they cannot be filtered out."
      }
    ],
    "emcNote": "Strong out-of-band broadcast transmitters generate in-band IMD products that blind vehicle GNSS navigation receivers."
  },
  {
    "id": "rahrf-15",
    "num": "15",
    "courseId": "rahrf",
    "title": "Phasor Analysis & Time-Harmonic Fields",
    "sourcePdf": "RAHRF101_Module_07.pdf",
    "tags": [
      "Phasor",
      "Euler Identity",
      "Complex Impedance",
      "Time-Harmonic",
      "RF Analysis"
    ],
    "summary": "Phasor transformation of sinusoidal RF voltages and currents, Euler's formula, converting differential equations into algebraic complex impedance equations, and rotating vectors.",
    "equations": [
      {
        "name": "Euler Formula",
        "formula": "e^(jθ) = cos(θ) + j · sin(θ)",
        "units": "Identity"
      },
      {
        "name": "Sinusoid to Phasor",
        "formula": "v(t) = V_m · cos(ωt + φ)  ↔  V = V_m · e^(jφ)",
        "units": "Complex Vector"
      },
      {
        "name": "Capacitive Impedance",
        "formula": "Z_C = 1 / (j · ω · C) = -j / (ω · C)",
        "units": "Ohms (Ω)"
      },
      {
        "name": "Inductive Impedance",
        "formula": "Z_L = j · ω · L",
        "units": "Ohms (Ω)"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Why Phasors are Essential in RF",
        "content": "Phasors eliminate time dependence (t) from steady-state sinusoidal calculations. Time derivatives become algebraic multiplications (d/dt -> jω), simplifying complex impedance calculations across RF networks."
      }
    ],
    "emcNote": "Vector network analyzers measure magnitude and phase simultaneously to construct complex impedance plots."
  },
  {
    "id": "rahrf-16",
    "num": "16",
    "courseId": "rahrf",
    "title": "Wave Reflection, Transmission & Matching",
    "sourcePdf": "RAHRF101_Module_08.pdf",
    "tags": [
      "Reflection Coefficient",
      "Transmission",
      "VSWR",
      "Return Loss",
      "Matching"
    ],
    "summary": "Boundary conditions on transmission lines, Voltage Reflection Coefficient (Γ), Transmission Coefficient (T), Voltage Standing Wave Ratio (VSWR), and Return Loss (RL).",
    "equations": [
      {
        "name": "Voltage Reflection Coefficient",
        "formula": "Γ = (Z_L - Z₀) / (Z_L + Z₀) = |Γ| · e^(jθ)",
        "units": "Complex Ratio"
      },
      {
        "name": "Voltage Transmission Coefficient",
        "formula": "T = 1 + Γ = (2 · Z_L) / (Z_L + Z₀)",
        "units": "Complex Ratio"
      },
      {
        "name": "Voltage Standing Wave Ratio",
        "formula": "VSWR = (1 + |Γ|) / (1 - |Γ|)",
        "units": "Ratio (1.0 to ∞)"
      },
      {
        "name": "Return Loss in dB",
        "formula": "RL = -20 · log₁₀(|Γ|)",
        "units": "Decibels (dB)"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Standing Wave Interference",
        "content": "When load impedance ZL does not match line impedance Z0, reflected waves interfere with forward waves, creating stationary nodes (voltage minima) and antinodes (voltage maxima). VSWR measures this ratio."
      },
      {
        "heading": "2. Return Loss vs Reflected Power",
        "content": "• RL = ∞ dB (VSWR 1.0): 0% power reflected (perfect match)\n• RL = 20 dB (VSWR 1.22): 1% power reflected (excellent)\n• RL = 10 dB (VSWR 1.92): 10% power reflected (acceptable)\n• RL = 0 dB (VSWR ∞): 100% power reflected (total reflection)"
      }
    ],
    "emcNote": "Mismatched antenna cables generate standing waves that radiate high common-mode emissions."
  },
  {
    "id": "rahrf-17",
    "num": "17",
    "courseId": "rahrf",
    "title": "RF Attenuators (Pi-pad & T-pad Synthesis)",
    "sourcePdf": "RAHRF101_Module_09.pdf",
    "tags": [
      "RF Attenuator",
      "Pi-pad",
      "T-pad",
      "Insertion Loss",
      "Impedance Matching"
    ],
    "summary": "Resistive RF attenuators, fixed vs step attenuators, Pi-pad and T-pad resistor synthesis for 50 Ohm systems, and improving source/load isolation.",
    "equations": [
      {
        "name": "Voltage Attenuation Factor",
        "formula": "K = 10^(Atten_dB / 20) = V_in / V_out",
        "units": "Linear Ratio"
      },
      {
        "name": "T-Pad Resistors (50Ω)",
        "formula": "R₁ = R₂ = 50 · [ (K - 1) / (K + 1) ],  R₃ = 50 · [ (2·K) / (K² - 1) ]",
        "units": "Ohms (Ω)"
      },
      {
        "name": "Pi-Pad Resistors (50Ω)",
        "formula": "R₁ = R₂ = 50 · [ (K + 1) / (K - 1) ],  R₃ = 50 · [ (K² - 1) / (2·K) ]",
        "units": "Ohms (Ω)"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Attenuator Applications in Test Benches",
        "content": "Attenuators protect sensitive test instrument front-ends (Spectrum Analyzers and VNAs) from high-power damage and improve return loss (a 3 dB pad improves input return loss by 6 dB)."
      }
    ],
    "emcNote": "A 10 dB high-power attenuator is placed between RF power amplifiers and antennas to prevent amplifier instability."
  },
  {
    "id": "rahrf-18",
    "num": "18",
    "courseId": "rahrf",
    "title": "Scattering Parameters (S-Parameters) & Two-Port Networks",
    "sourcePdf": "RAHRF101_Module_10.pdf",
    "tags": [
      "S-Parameters",
      "S11",
      "S21",
      "S12",
      "S22",
      "Two-Port",
      "Insertion Loss"
    ],
    "summary": "Why S-parameters replace Z/Y/H matrices at high frequencies (measured with 50 Ohm matched terminations), S11 input return loss, S21 forward gain/loss, S12 isolation, and S22 output return loss.",
    "equations": [
      {
        "name": "Two-Port S-Matrix Equation",
        "formula": "[b₁; b₂] = [S₁₁ S₁₂; S₂₁ S₂₂] · [a₁; a₂]",
        "units": "Matrix"
      },
      {
        "name": "Input Reflection Coefficient",
        "formula": "S₁₁ = b₁ / a₁ |_(a₂ = 0)  (Port 2 Matched to 50Ω)",
        "units": "Complex Ratio"
      },
      {
        "name": "Forward Transmission Gain",
        "formula": "S₂₁ = b₂ / a₁ |_(a₂ = 0)  (Port 2 Matched to 50Ω)",
        "units": "Complex Ratio"
      }
    ],
    "deepSections": [
      {
        "heading": "1. S-Parameter Physical Meaning",
        "content": "• |S11| (dB) = Input Return Loss (-20 log |S11|)\n• |S21| (dB) = Forward Gain or Insertion Loss (+20 log |S21|)\n• |S12| (dB) = Reverse Isolation (-20 log |S12|)\n• |S22| (dB) = Output Return Loss (-20 log |S22|)"
      }
    ],
    "emcNote": "Touchstone (.s2p) files measured on VNAs are imported into EMC simulation tools to model harness filter performance."
  },
  {
    "id": "rahrf-19",
    "num": "19",
    "courseId": "rahrf",
    "title": "Smith Chart Mastery & Impedance Matching",
    "sourcePdf": "RAHRF101_Module_11.pdf",
    "tags": [
      "Smith Chart",
      "Impedance Matching",
      "Stub Matching",
      "VSWR Circle",
      "Admittance"
    ],
    "summary": "Navigating the Smith Chart, constant resistance and reactance circles, converting between impedance (Z) and admittance (Y), and designing single-stub matching networks.",
    "equations": [
      {
        "name": "Normalized Impedance",
        "formula": "z = r + jx = Z_L / Z₀",
        "units": "Dimensionless"
      },
      {
        "name": "Constant Resistance Circle",
        "formula": "(u - r / (r + 1))² + v² = (1 / (r + 1))²",
        "units": "Circle in Γ Plane"
      },
      {
        "name": "Constant Reactance Circle",
        "formula": "(u - 1)² + (v - 1 / x)² = (1 / x)²",
        "units": "Circle in Γ Plane"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Smith Chart Geometry",
        "content": "Center of chart = 1.0 (50 Ω matched).\nLeft apex = 0 (Short circuit).\nRight apex = ∞ (Open circuit).\nUpper half = Inductive (+jx).\nLower half = Capacitive (-jx)."
      }
    ],
    "emcNote": "Smith chart matching transforms complex antenna impedance to 50 Ω to prevent cable radiation."
  },
  {
    "id": "rahrf-20",
    "num": "20",
    "courseId": "rahrf",
    "title": "RF EDA & Simulation Software (ADS, HFSS, AWR)",
    "sourcePdf": "RAHRF101_Module_13.pdf",
    "tags": [
      "RF Software",
      "Keysight ADS",
      "Ansys HFSS",
      "AWR Microwave Office",
      "EM Simulation"
    ],
    "summary": "Industry-standard RF simulation tools: Keysight ADS (Harmonic Balance, S-parameter solver), Cadence AWR Microwave Office, and 3D Full-Wave EM field solvers (Ansys HFSS, CST Studio).",
    "equations": [
      {
        "name": "Harmonic Balance Criterion",
        "formula": "i_linear(t) + i_nonlinear(t) = 0  (Solved in frequency domain)",
        "units": "Algorithm"
      },
      {
        "name": "Finite Element Mesh Size",
        "formula": "Mesh Element Size ≤ λ / 10",
        "units": "Meters (m)"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Harmonic Balance Simulation",
        "content": "Harmonic Balance combines frequency-domain linear network analysis with time-domain non-linear device modeling, solving multi-tone mixer and power amplifier distortion in seconds."
      },
      {
        "heading": "2. 3D Full-Wave EM Solvers",
        "content": "Tools like Ansys HFSS solve Maxwell's equations in 3D using Finite Element Method (FEM), capturing parasitic coupling between PCB traces, vias, and enclosure shielding."
      }
    ],
    "emcNote": "3D EM simulation predicts resonance modes inside vehicle ECU metal enclosures prior to tooling."
  },
  {
    "id": "rahrf-21",
    "num": "21",
    "courseId": "rahrf",
    "title": "RF Measurement Devices (VNA, Spectrum Analyzer)",
    "sourcePdf": "RAHRF101_Module_14.pdf",
    "tags": [
      "RF Instruments",
      "Spectrum Analyzer",
      "VNA",
      "Power Meter",
      "Signal Generator"
    ],
    "summary": "Core RF laboratory instrumentation: Vector Network Analyzers (VNA calibration SOLT), Superheterodyne Spectrum Analyzers (RBW, VBW, detectors), and RF Power Sensors.",
    "equations": [
      {
        "name": "Spectrum Analyzer Resolution Bandwidth",
        "formula": "RBW = k · (Sweep Time) / (Span)  (Selectivity Filter)",
        "units": "Hertz (Hz)"
      },
      {
        "name": "VNA SOLT Calibration",
        "formula": "Short, Open, Load (50Ω), Thru Standards",
        "units": "12-Term Error Model"
      }
    ],
    "deepSections": [
      {
        "heading": "1. Spectrum Analyzer vs VNA",
        "content": "• Spectrum Analyzer: Measures signal power vs frequency (scalar amplitude only). Used for EMI emissions testing.\n• Vector Network Analyzer (VNA): Generates a known stimulus signal and measures both magnitude and phase of reflected and transmitted waves (vector S-parameters)."
      },
      {
        "heading": "2. CISPR 16-1-1 Detectors",
        "content": "Peak (PK), Quasi-Peak (QP), and Average (AVG) detectors. Quasi-peak uses defined charge/discharge time constants to evaluate subjective disturbance to human audio perception."
      }
    ],
    "emcNote": "Calibrated spectrum analyzers with CISPR compliant RBW filters (9 kHz for Band B, 120 kHz for Band C/D) are essential for automotive compliance."
  }
]

export default function ElectronicsLearnings({ onViewPdf }) {
  const [activeCourseTrack, setActiveCourseTrack] = useState('theory') // 'theory' | 'microwave' | 'power' | 'rahrf'
  const [selectedLessonId, setSelectedLessonId] = useState('th-02')
  const [searchQuery, setSearchQuery] = useState('')
  const [lightboxImage, setLightboxImage] = useState(null)

  // Interactive Live Circuit Calculator State
  const [calcV, setCalcV] = useState(12)
  const [calcR, setCalcR] = useState(100)
  const [calcTauR, setCalcTauR] = useState(1000) // 1k ohm
  const [calcTauC, setCalcTauC] = useState(100) // 100 uF
  const [calcVpeak, setCalcVpeak] = useState(325.27) // 230V RMS
  const [calcVswrGamma, setCalcVswrGamma] = useState(0.2) // Reflection coeff

  // Combined master list of all 45 modules across the 4 distinct courses
  const allModules = useMemo(() => {
    return [
      ...THEORY_ELECTRONICS_MODULES,
      ...MICROWAVE_RF_MODULES,
      ...POWER_ELECTRONICS_MODULES,
      ...RAHRF101_MODULES,
    ]
  }, [])

  // Filter lessons based on active course track and search query
  const filteredLessons = useMemo(() => {
    return allModules.filter((m) => {
      const matchTrack = m.courseId === activeCourseTrack
      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
      return matchTrack && matchSearch
    })
  }, [allModules, activeCourseTrack, searchQuery])

  // Active lesson object
  const activeLesson = useMemo(() => {
    return allModules.find((m) => m.id === selectedLessonId) || allModules[0]
  }, [allModules, selectedLessonId])

  // Slide images for active lesson
  const activeSlides = useMemo(() => {
    return SLIDES_MAP[activeLesson.id] || []
  }, [activeLesson])

  // Ohm's Law Calculator output
  const ohmsCalc = useMemo(() => {
    const v = parseFloat(calcV) || 0
    const r = parseFloat(calcR) || 1
    const i = v / r
    const p = v * i
    return {
      currentA: i.toFixed(4),
      currentMa: (i * 1000).toFixed(2),
      powerW: p.toFixed(4),
      powerMw: (p * 1000).toFixed(1),
      safeRatingW: (p * 2).toFixed(3),
    }
  }, [calcV, calcR])

  // RC Time Constant output
  const rcCalc = useMemo(() => {
    const r = parseFloat(calcTauR) || 1000
    const cUf = parseFloat(calcTauC) || 100
    const cF = cUf * 1e-6
    const tauSec = r * cF
    const tauMs = tauSec * 1000
    const fullChargeMs = tauMs * 5
    return {
      tauMs: tauMs.toFixed(2),
      fullChargeMs: fullChargeMs.toFixed(2),
    }
  }, [calcTauR, calcTauC])

  // AC RMS output
  const acCalc = useMemo(() => {
    const vp = parseFloat(calcVpeak) || 0
    const vrms = vp * 0.707106
    const vpp = vp * 2
    return {
      vrms: vrms.toFixed(2),
      vpp: vpp.toFixed(2),
    }
  }, [calcVpeak])

  // VSWR / Return Loss output
  const vswrCalc = useMemo(() => {
    const gamma = Math.min(0.999, Math.max(0, parseFloat(calcVswrGamma) || 0))
    const vswr = (1 + gamma) / (1 - gamma)
    const returnLossDb = -20 * Math.log10(gamma || 0.0001)
    const reflectedPowerPct = Math.pow(gamma, 2) * 100
    return {
      vswr: vswr.toFixed(2),
      returnLossDb: returnLossDb.toFixed(2),
      reflectedPowerPct: reflectedPowerPct.toFixed(1),
    }
  }, [calcVswrGamma])

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-indigo-500/20 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold uppercase tracking-wider">
              <GraduationCap className="w-3.5 h-3.5" />
              Electronics &amp; RF Microwave Engineering Academy
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Electronics, Power &amp; RF Engineering Hub
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Clean 4-course curriculum covering foundational electronics theory, microwave RF, power electronics simulation, and RF design concepts extracted directly from your course library.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-center">
              <span className="text-base font-bold text-amber-300 block font-mono">8</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Theory</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-center">
              <span className="text-base font-bold text-cyan-300 block font-mono">8</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Microwave</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-center">
              <span className="text-base font-bold text-emerald-300 block font-mono">8</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Power Elec</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-center">
              <span className="text-base font-bold text-purple-300 block font-mono">21</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">RAHRF101</span>
            </div>
          </div>
        </div>
      </div>

      {/* Course Track Selector Bar & Global Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        {/* Track Pills for the 4 distinct courses */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {[
            { id: 'theory', label: '📘 Theory of Electronics (8)', defaultId: 'th-02' },
            { id: 'microwave', label: '📡 Microwave & RF Basics (8)', defaultId: 'rf-01' },
            { id: 'power', label: '⚡ Power Electronics & LTSpice (8)', defaultId: 'pe-01' },
            { id: 'rahrf', label: '📻 RF Fundamentals RAHRF101 (21)', defaultId: 'rahrf-01' },
          ].map((track) => (
            <button
              key={track.id}
              onClick={() => {
                setActiveCourseTrack(track.id)
                setSelectedLessonId(track.defaultId)
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeCourseTrack === track.id
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/40'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{track.label}</span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search modules, KCL, Buck, S-params, LNA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Master-Detail Layout: Left Module Index (4 cols) + Right Lesson Reader (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Module Index List & Interactive Tools (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Module List with clean heading only */}
          <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredLessons.map((m) => {
              const isActive = selectedLessonId === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedLessonId(m.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between gap-2.5 cursor-pointer ${
                    isActive
                      ? 'bg-blue-50/90 border-blue-500 text-blue-900 font-bold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-extrabold shrink-0 ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {m.num}
                    </span>
                    <span className="text-xs truncate">{m.title}</span>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 transition ${
                      isActive ? 'text-blue-600 translate-x-0.5' : 'text-slate-400'
                    }`}
                  />
                </button>
              )
            })}

            {filteredLessons.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                No matching lessons found for &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>

          {/* Quick Interactive Engineering Mini-Tool */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-blue-600" />
                Live Engineering Formulas
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded">
                Interactive
              </span>
            </div>

            {/* Quick Ohm's Law Calculator */}
            <div className="space-y-2 text-xs">
              <span className="text-[11px] font-bold text-slate-700 block">Ohm&apos;s Law (V = I · R, P = V · I)</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Voltage V (Volts):</label>
                  <input
                    type="number"
                    value={calcV}
                    onChange={(e) => setCalcV(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Resistance R (Ω):</label>
                  <input
                    type="number"
                    value={calcR}
                    onChange={(e) => setCalcR(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">Current I:</span>
                  <span className="text-blue-700 font-bold">{ohmsCalc.currentA} A ({ohmsCalc.currentMa} mA)</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Power P:</span>
                  <span className="text-emerald-700 font-bold">{ohmsCalc.powerW} W ({ohmsCalc.powerMw} mW)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Lesson Viewer (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-6">
            
            {/* Lesson Header with Direct PDF Action */}
            <div className="border-b border-slate-200 pb-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-700 font-mono text-xs font-extrabold rounded-lg">
                    Module {activeLesson.num}
                  </span>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    {activeLesson.courseId === 'theory'
                      ? 'Theory Behind Electronics'
                      : activeLesson.courseId === 'microwave'
                      ? 'Microwave & RF Engineering'
                      : activeLesson.courseId === 'power'
                      ? 'Power Electronics & LTSpice'
                      : 'RF Fundamentals (RAHRF101)'}
                  </span>
                </div>

                {onViewPdf && activeLesson.sourcePdf && (
                  <button
                    onClick={() =>
                      onViewPdf(
                        `/pdfs/${activeLesson.sourcePdf}`,
                        `${activeLesson.num}. ${activeLesson.title}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Open Course PDF</span>
                    <ExternalLink className="w-3 h-3 text-blue-500" />
                  </button>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {activeLesson.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {activeLesson.summary}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeLesson.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Extracted Authentic Slide Illustrations */}
            {activeSlides.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    Authentic Course Slides &amp; Diagrams ({activeSlides.length} Visuals)
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Click any slide to enlarge
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {activeSlides.map((slide, idx) => (
                    <div
                      key={idx}
                      onClick={() => setLightboxImage(slide)}
                      className="group cursor-pointer bg-slate-50 rounded-xl border border-slate-200 overflow-hidden hover:border-blue-400 hover:shadow-md transition flex flex-col"
                    >
                      <div className="relative aspect-4/3 overflow-hidden bg-slate-100 flex items-center justify-center">
                        <img
                          src={slide.src}
                          alt={slide.caption}
                          className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                          <Eye className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="p-2 text-[11px] text-slate-700 font-medium line-clamp-2 bg-white border-t border-slate-100">
                        {slide.caption}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Governing Equations */}
            {activeLesson.equations && activeLesson.equations.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  Key Governing Formulas &amp; Equations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {activeLesson.equations.map((eq, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>{eq.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          [{eq.units}]
                        </span>
                      </div>
                      <div className="font-mono text-xs sm:text-sm text-blue-700 bg-white p-2 rounded-lg border border-slate-200 overflow-x-auto font-bold">
                        {eq.formula}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deep Technical Explanations */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Comprehensive Technical Explanations
              </h3>

              <div className="space-y-4">
                {activeLesson.deepSections.map((sec, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      {sec.heading}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                      {sec.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Automotive EMC & System Context Note */}
            {activeLesson.emcNote && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
                <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block mb-0.5">
                    Automotive EMC &amp; High-Frequency Engineering Relevance:
                  </strong>
                  <span>{activeLesson.emcNote}</span>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Lightbox Modal for Enlarging Slide Images */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full p-4 space-y-3 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900">
                {lightboxImage.caption}
              </span>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-auto flex items-center justify-center bg-slate-50 rounded-xl p-2">
              <img
                src={lightboxImage.src}
                alt={lightboxImage.caption}
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
