export const EXAM_BLUEPRINTS = {
  CW: {
    totalQuestions: 50, timeMinutes: 75, passPercent: 70,
    domains: [
      { moduleNumber: 1, name: 'Welding Processes Overview', weight: 0.25, questions: 13 },
      { moduleNumber: 2, name: 'Welding Safety', weight: 0.20, questions: 10 },
      { moduleNumber: 3, name: 'Base Metals and Filler Metals', weight: 0.20, questions: 10 },
      { moduleNumber: 4, name: 'Weld Quality and Visual Inspection', weight: 0.20, questions: 10 },
      { moduleNumber: 5, name: 'Weld Symbols and Blueprint Reading', weight: 0.15, questions: 7 },
    ]
  },
  CAWI: {
    totalQuestions: 75, timeMinutes: 120, passPercent: 72,
    domains: [
      { moduleNumber: 1, name: 'Welding Inspection Fundamentals', weight: 0.25, questions: 19 },
      { moduleNumber: 2, name: 'Codes and Standards Overview', weight: 0.25, questions: 19 },
      { moduleNumber: 3, name: 'WPS, PQR, and Welder Qualification', weight: 0.25, questions: 19 },
      { moduleNumber: 4, name: 'Weld Discontinuities and Defects', weight: 0.25, questions: 18 },
    ]
  },
  CWI: {
    totalQuestions: 100, timeMinutes: 150, passPercent: 72,
    domains: [
      { moduleNumber: 1, name: 'Advanced Codes — AWS D1.1', weight: 0.20, questions: 20 },
      { moduleNumber: 2, name: 'Metallurgy for Inspectors', weight: 0.15, questions: 15 },
      { moduleNumber: 3, name: 'Nondestructive Examination Methods', weight: 0.20, questions: 20 },
      { moduleNumber: 4, name: 'Welding Cost Estimation', weight: 0.10, questions: 10 },
      { moduleNumber: 5, name: 'Practical Application — Code Compliance', weight: 0.20, questions: 20 },
      { moduleNumber: 6, name: 'Inspector Ethics and Responsibilities', weight: 0.15, questions: 15 },
    ]
  },
  CWS: {
    totalQuestions: 75, timeMinutes: 120, passPercent: 72,
    domains: [
      { moduleNumber: 1, name: 'Welding Supervision and Management', weight: 0.30, questions: 22 },
      { moduleNumber: 2, name: 'Welding Process Control', weight: 0.25, questions: 19 },
      { moduleNumber: 3, name: 'Quality Assurance and Documentation', weight: 0.25, questions: 19 },
      { moduleNumber: 4, name: 'Production Efficiency', weight: 0.20, questions: 15 },
    ]
  },
  CRAW: {
    totalQuestions: 75, timeMinutes: 120, passPercent: 72,
    domains: [
      { moduleNumber: 1, name: 'Robotic Welding Fundamentals', weight: 0.30, questions: 22 },
      { moduleNumber: 2, name: 'Robotic Welding Parameters', weight: 0.25, questions: 19 },
      { moduleNumber: 3, name: 'Programming and Path Planning', weight: 0.25, questions: 19 },
      { moduleNumber: 4, name: 'Troubleshooting and Maintenance', weight: 0.20, questions: 15 },
    ]
  },
};
