// WeldPal training module definitions
// AWS welding certification path: CW → CAWI → CWI → CWS → CRAW

export const MODULES = [
  // ── CW (Certified Welder) ─────────────────────────────────
  {
    cert_level: 'CW', module_number: 1, title: 'Welding Processes Overview',
    estimated_minutes: 45, exam_domain_weight: 0.25,
    topic_list: ['SMAW basics', 'GMAW/MIG basics', 'GTAW/TIG basics', 'FCAW basics', 'SAW overview', 'Process selection', 'Joint types', 'Weld positions 1G-6G'],
  },
  {
    cert_level: 'CW', module_number: 2, title: 'Welding Safety',
    estimated_minutes: 40, exam_domain_weight: 0.20,
    topic_list: ['Arc flash hazards', 'Fume exposure', 'Eye protection shade numbers', 'Fire prevention', 'Electrical safety', 'Confined space', 'PPE requirements', 'OSHA 1910.252', 'Ventilation'],
  },
  {
    cert_level: 'CW', module_number: 3, title: 'Base Metals and Filler Metals',
    estimated_minutes: 50, exam_domain_weight: 0.20,
    topic_list: ['Carbon steel', 'Stainless steel', 'Aluminum', 'Electrode classification AWS A5.1/A5.18', 'Filler metal selection', 'Preheat requirements', 'Interpass temperature', 'Metal identification'],
  },
  {
    cert_level: 'CW', module_number: 4, title: 'Weld Quality and Visual Inspection',
    estimated_minutes: 45, exam_domain_weight: 0.20,
    topic_list: ['Weld discontinuities', 'Porosity', 'Undercut', 'Lack of fusion', 'Cracking types', 'Acceptable vs rejectable defects', 'Visual inspection criteria AWS D1.1', 'Weld profiles'],
  },
  {
    cert_level: 'CW', module_number: 5, title: 'Weld Symbols and Blueprint Reading',
    estimated_minutes: 40, exam_domain_weight: 0.15,
    topic_list: ['AWS A2.4 standard symbols', 'Reference line', 'Arrow side vs other side', 'Fillet weld symbols', 'Groove weld symbols', 'Supplementary symbols', 'Tail specifications', 'Reading weld callouts'],
  },

  // ── CAWI (Certified Associate Welding Inspector) ──────────
  {
    cert_level: 'CAWI', module_number: 1, title: 'Welding Inspection Fundamentals',
    estimated_minutes: 55, exam_domain_weight: 0.25,
    topic_list: ['Inspector responsibilities', 'Before/during/after inspection', 'Acceptance criteria', 'Inspection plans', 'Documentation requirements', 'AWS D1.1 Section 6', 'Workmanship standards'],
  },
  {
    cert_level: 'CAWI', module_number: 2, title: 'Codes and Standards Overview',
    estimated_minutes: 50, exam_domain_weight: 0.25,
    topic_list: ['AWS D1.1 Structural Steel', 'AWS D1.2 Aluminum', 'ASME Section IX', 'API 1104 Pipeline', 'Code vs standard vs specification', 'Jurisdictional requirements', 'Code compliance documentation'],
  },
  {
    cert_level: 'CAWI', module_number: 3, title: 'WPS, PQR, and Welder Qualification',
    estimated_minutes: 50, exam_domain_weight: 0.25,
    topic_list: ['Welding Procedure Specification', 'Procedure Qualification Record', 'Essential variables', 'Supplementary essential variables', 'Non-essential variables', 'Welder performance qualification', 'Qualification ranges', 'Requalification'],
  },
  {
    cert_level: 'CAWI', module_number: 4, title: 'Weld Discontinuities and Defects',
    estimated_minutes: 45, exam_domain_weight: 0.25,
    topic_list: ['Planar vs volumetric', 'Crack types — hot/cold/lamellar', 'Porosity types', 'Incomplete fusion', 'Incomplete penetration', 'Undercut', 'Overlap', 'Slag inclusion', 'Causes and remedies'],
  },

  // ── CWI (Certified Welding Inspector) ─────────────────────
  {
    cert_level: 'CWI', module_number: 1, title: 'Advanced Codes — AWS D1.1',
    estimated_minutes: 60, exam_domain_weight: 0.20,
    topic_list: ['D1.1 Part A General', 'Part B Design', 'Part C Prequalification', 'Part D Qualification', 'Part E Fabrication', 'Part F Inspection', 'Acceptance criteria tables', 'Commentary use'],
  },
  {
    cert_level: 'CWI', module_number: 2, title: 'Metallurgy for Inspectors',
    estimated_minutes: 55, exam_domain_weight: 0.15,
    topic_list: ['Iron-carbon phase diagram', 'Heat affected zone', 'Grain structure', 'Hardness and toughness', 'Heat treatment', 'Carbon equivalent', 'Hydrogen embrittlement', 'Stress relieving', 'Weldability'],
  },
  {
    cert_level: 'CWI', module_number: 3, title: 'Nondestructive Examination Methods',
    estimated_minutes: 55, exam_domain_weight: 0.20,
    topic_list: ['Visual testing VT', 'Liquid penetrant PT', 'Magnetic particle MT', 'Radiographic testing RT', 'Ultrasonic testing UT', 'Method selection', 'Sensitivity and limitations', 'NDE symbols on drawings'],
  },
  {
    cert_level: 'CWI', module_number: 4, title: 'Welding Cost Estimation',
    estimated_minutes: 40, exam_domain_weight: 0.10,
    topic_list: ['Deposition rates', 'Electrode efficiency', 'Operating factor', 'Labor and overhead', 'Joint design economics', 'Weld metal volume calculations', 'Process cost comparison'],
  },
  {
    cert_level: 'CWI', module_number: 5, title: 'Practical Application — Code Compliance',
    estimated_minutes: 50, exam_domain_weight: 0.20,
    topic_list: ['Reading and applying D1.1 tables', 'Fillet weld sizing', 'Groove weld requirements', 'Preheat determination', 'Interpass temperature', 'Repair procedures', 'NCR documentation', 'Disposition decisions'],
  },
  {
    cert_level: 'CWI', module_number: 6, title: 'Inspector Ethics and Responsibilities',
    estimated_minutes: 35, exam_domain_weight: 0.15,
    topic_list: ['AWS QC1 standard', 'Inspector duties', 'Authority and limitations', 'Conflict of interest', 'Documentation integrity', 'Reporting obligations', 'Liability', 'Continuing education'],
  },

  // ── CWS (Certified Welding Supervisor) ────────────────────
  {
    cert_level: 'CWS', module_number: 1, title: 'Welding Supervision and Management',
    estimated_minutes: 50, exam_domain_weight: 0.30,
    topic_list: ['Supervisor responsibilities', 'Production planning', 'Welder qualification management', 'WPS implementation', 'Quality systems', 'Communication', 'Problem solving', 'Safety culture'],
  },
  {
    cert_level: 'CWS', module_number: 2, title: 'Welding Process Control',
    estimated_minutes: 50, exam_domain_weight: 0.25,
    topic_list: ['Parameter monitoring', 'Heat input control', 'Distortion prevention', 'Fit-up verification', 'Tack welding', 'Sequence planning', 'Root pass quality', 'Interpass cleaning'],
  },
  {
    cert_level: 'CWS', module_number: 3, title: 'Quality Assurance and Documentation',
    estimated_minutes: 45, exam_domain_weight: 0.25,
    topic_list: ['QA vs QC', 'Quality manual', 'Inspection and test plans', 'Traveler documents', 'Traceability', 'Material certificates', 'NDE reports', 'As-built records'],
  },
  {
    cert_level: 'CWS', module_number: 4, title: 'Production Efficiency',
    estimated_minutes: 40, exam_domain_weight: 0.20,
    topic_list: ['Arc-on time improvement', 'Joint design optimization', 'Process selection for productivity', 'Automation opportunities', 'Consumable management', 'Waste reduction', 'Training program development'],
  },

  // ── CRAW (Certified Robotic Arc Welding) ──────────────────
  {
    cert_level: 'CRAW', module_number: 1, title: 'Robotic Welding Fundamentals',
    estimated_minutes: 55, exam_domain_weight: 0.30,
    topic_list: ['Robot types and axes', 'Teach pendant operation', 'Tool center point', 'Coordinate systems', 'Program structure', 'Motion types', 'Safety systems', 'Cell layout'],
  },
  {
    cert_level: 'CRAW', module_number: 2, title: 'Robotic Welding Parameters',
    estimated_minutes: 50, exam_domain_weight: 0.25,
    topic_list: ['Wire feed speed', 'Voltage', 'Travel speed', 'Work angle', 'Travel angle', 'CTWD', 'Arc start/end', 'Weaving patterns', 'Torch orientation'],
  },
  {
    cert_level: 'CRAW', module_number: 3, title: 'Programming and Path Planning',
    estimated_minutes: 50, exam_domain_weight: 0.25,
    topic_list: ['Online vs offline programming', 'Touch sensing', 'Through-arc seam tracking', 'Multi-pass programming', 'Coordinated motion', 'Program backup', 'Cycle time optimization'],
  },
  {
    cert_level: 'CRAW', module_number: 4, title: 'Troubleshooting and Maintenance',
    estimated_minutes: 45, exam_domain_weight: 0.20,
    topic_list: ['Common weld defects in robotic welding', 'TCP verification', 'Wire feed issues', 'Spatter management', 'Nozzle cleaning', 'Preventive maintenance schedules', 'Collision recovery', 'Production monitoring'],
  },
];
