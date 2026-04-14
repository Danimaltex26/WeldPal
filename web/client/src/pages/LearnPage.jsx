import { useState } from 'react';

var TOPICS = [
  {
    title: 'Weld Inspection & Visual Testing',
    items: ['Surface defect identification', 'Fillet weld sizing & profile', 'Groove weld acceptance criteria', 'Weld discontinuity types', 'AWS D1.1 visual inspection', 'Measurement tools & gauges'],
  },
  {
    title: 'Welding Processes',
    items: ['SMAW electrode selection', 'GMAW wire & gas setup', 'FCAW shielding types', 'GTAW tungsten & filler', 'SAW flux & wire combinations', 'Process selection by application'],
  },
  {
    title: 'Codes & Standards',
    items: ['AWS D1.1 Structural Steel', 'API 1104 Pipeline', 'ASME Section IX Boilers', 'AWS D1.2 Aluminum', 'WPS/PQR requirements', 'Welder qualification testing'],
  },
  {
    title: 'Metallurgy & Materials',
    items: ['Carbon steel classifications', 'Stainless steel types', 'Aluminum alloys', 'Preheat & interpass temp', 'Heat affected zone (HAZ)', 'Hydrogen cracking prevention'],
  },
  {
    title: 'NDT Methods',
    items: ['Visual testing (VT)', 'Magnetic particle (MT)', 'Liquid penetrant (PT)', 'Ultrasonic testing (UT)', 'Radiographic testing (RT)', 'NDT method selection'],
  },
];

export default function LearnPage() {
  var [expanded, setExpanded] = useState(null);

  return (
    <div className="page stack">
      <h1>Learn</h1>
      <div className="info-box">Training modules are coming soon. Browse topic previews below.</div>

      <div className="stack-sm">
        {TOPICS.map(function (topic, i) {
          var isOpen = expanded === i;
          return (
            <div key={i} className="card">
              <div className="expandable-header" onClick={function () { setExpanded(isOpen ? null : i); }}>
                <h3>{topic.title}</h3>
                <span style={{ color: '#6B6B73', fontSize: '1.25rem' }}>{isOpen ? '\u2212' : '+'}</span>
              </div>
              {isOpen && (
                <div style={{ marginTop: '0.75rem' }}>
                  {topic.items.map(function (item, j) {
                    return (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid #2A2A2E' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span className="text-secondary" style={{ fontSize: '0.875rem' }}>{item}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
