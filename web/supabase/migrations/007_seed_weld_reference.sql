-- 007_seed_weld_reference.sql
-- 20 verified starter entries: filler metals, code criteria, preheat, defect guide.

insert into weld_reference (category, title, process, base_material, specification, content_json, source) values

-- Filler metals
('filler_metal', 'E6010 - Cellulosic stick electrode', 'SMAW', 'Carbon Steel', 'AWS A5.1',
 '{"summary": "Fast-freezing cellulosic electrode for deep penetration root passes on pipe and structural work. DCEP only. Burns through mild rust and surface contamination.","key_values":[{"label":"Tensile strength","value":"60,000 psi"},{"label":"Polarity","value":"DCEP (electrode positive)"},{"label":"Position","value":"All positions"},{"label":"Typical use","value":"Pipeline root passes, structural"}],"important_notes":["Stores and re-bakes are NOT required — keep dry","High hydrogen content — not for high-strength steels","Whip and pause technique on roots"]}'::jsonb,
 'verified'),

('filler_metal', 'E7018 - Low-hydrogen stick electrode', 'SMAW', 'Carbon Steel', 'AWS A5.1',
 '{"summary":"Low-hydrogen iron-powder electrode for code-quality structural welds. Smooth arc, low spatter, X-ray quality possible. Must be kept dry.","key_values":[{"label":"Tensile strength","value":"70,000 psi"},{"label":"Polarity","value":"DCEP or AC"},{"label":"Position","value":"All positions"},{"label":"Storage","value":"Hot box at 250-300°F after opening"}],"important_notes":["Re-bake at 700-800°F for 1-2 hours if exposed >4 hours","Drag technique — short arc length","Preheat critical on thick or restrained joints"]}'::jsonb,
 'verified'),

('filler_metal', 'E6011 - All-position cellulosic electrode', 'SMAW', 'Carbon Steel', 'AWS A5.1',
 '{"summary":"AC-capable version of E6010 for farm and field repair where DC machines are not available. Deep penetration, handles dirty/painted/rusty material.","key_values":[{"label":"Tensile strength","value":"60,000 psi"},{"label":"Polarity","value":"AC, DCEP, DCEN"},{"label":"Position","value":"All positions"}],"important_notes":["Forgiving on mill scale and rust","Not low-hydrogen — avoid on high-strength or restrained joints"]}'::jsonb,
 'verified'),

('filler_metal', 'E7024 - Iron powder flat/horizontal electrode', 'SMAW', 'Carbon Steel', 'AWS A5.1',
 '{"summary":"High-deposition iron powder electrode for flat (1F/1G) and horizontal fillet (2F) welds only. Drag technique, very smooth bead.","key_values":[{"label":"Tensile strength","value":"70,000 psi"},{"label":"Polarity","value":"AC, DCEP, DCEN"},{"label":"Position","value":"1F, 1G, 2F only"}],"important_notes":["Limited to flat and horizontal fillets — will not run vertical or overhead","Best for production fillet work"]}'::jsonb,
 'verified'),

('filler_metal', 'ER70S-6 - Carbon steel MIG/TIG wire', 'GMAW/GTAW', 'Carbon Steel', 'AWS A5.18',
 '{"summary":"Most common solid wire for MIG and TIG on mild and low-alloy steels. High deoxidizer content (manganese + silicon) handles mill scale and light rust.","key_values":[{"label":"Tensile strength","value":"70,000 psi"},{"label":"Shielding gas (MIG)","value":"75/25 Ar/CO2 or 100% CO2"},{"label":"Shielding gas (TIG)","value":"100% Argon"},{"label":"Polarity","value":"DCEP for MIG, DCEN for TIG"}],"important_notes":["Most forgiving wire for general fab work","Use 100% CO2 for deeper penetration on thicker material"]}'::jsonb,
 'verified'),

('filler_metal', 'ER308L - Stainless steel filler', 'GMAW/GTAW', 'Stainless Steel', 'AWS A5.9',
 '{"summary":"Low-carbon austenitic stainless filler for welding 304 and 304L base metals. The L suffix indicates low carbon content (<0.03%) to prevent carbide precipitation and intergranular corrosion.","key_values":[{"label":"Carbon content","value":"<0.03%"},{"label":"Shielding gas (MIG)","value":"98/2 Ar/CO2 or 98/2 Ar/O2"},{"label":"Shielding gas (TIG)","value":"100% Argon (back purge required)"},{"label":"Use on","value":"304, 304L base metal"}],"important_notes":["Always back-purge TIG roots on stainless to prevent sugaring","Do NOT use straight CO2 — destroys corrosion resistance","Clean stainless with dedicated brushes only"]}'::jsonb,
 'verified'),

('filler_metal', 'ER4043 - Aluminum filler', 'GMAW/GTAW', 'Aluminum', 'AWS A5.10',
 '{"summary":"General-purpose aluminum filler with 5% silicon. Lower crack sensitivity than 5356. Used for casting repair and welding 6xxx series structural aluminum.","key_values":[{"label":"Composition","value":"Al-5%Si"},{"label":"Shielding gas","value":"100% Argon"},{"label":"Polarity (TIG)","value":"AC with high frequency"},{"label":"Best for","value":"6061, 6063, castings"}],"important_notes":["Always remove aluminum oxide with stainless brush before welding","Aluminum requires 3-5x more amperage than steel of same thickness","Pre-clean and weld within 24 hours"]}'::jsonb,
 'verified'),

-- Preheat
('preheat', 'A36 carbon steel preheat requirements', 'Any', 'A36', 'AWS D1.1:2020',
 '{"summary":"A36 mild steel rarely requires preheat for thicknesses under 3/4 inch using low-hydrogen electrodes. Preheat may still be required for ambient temperatures below 32°F or high-restraint joints.","key_values":[{"label":"Up to 3/4 in","value":"32°F (per AWS D1.1 Table 5.8)"},{"label":"3/4 to 1-1/2 in","value":"50°F"},{"label":"1-1/2 to 2-1/2 in","value":"150°F"},{"label":"Over 2-1/2 in","value":"225°F"}],"important_notes":["Always heat 3 inches in all directions from the joint","Use temperature-indicating crayons or contact pyrometer to verify","Higher preheat may be needed if hydrogen control is critical"]}'::jsonb,
 'verified'),

('preheat', 'A572 Gr 50 preheat requirements', 'Any', 'A572 Grade 50', 'AWS D1.1:2020',
 '{"summary":"High-strength low-alloy structural steel. Higher preheat than A36 due to higher carbon equivalent and crack sensitivity.","key_values":[{"label":"Up to 3/4 in","value":"50°F"},{"label":"3/4 to 1-1/2 in","value":"50°F"},{"label":"1-1/2 to 2-1/2 in","value":"150°F"},{"label":"Over 2-1/2 in","value":"225°F"}],"important_notes":["Calculate carbon equivalent for restrained joints","Use low-hydrogen electrodes only (E7018, E8018)","Maintain interpass temperature within preheat range"]}'::jsonb,
 'verified'),

-- Code requirements
('code_requirement', 'AWS D1.1 Visual Inspection - Undercut Limits', 'Any', 'Carbon Steel', 'AWS D1.1:2020',
 '{"summary":"Undercut acceptance criteria for statically and cyclically loaded structures. Stricter limits apply to cyclically loaded members and primary members.","key_values":[{"label":"Statically loaded - material thickness <1 in","value":"Max 1/32 in"},{"label":"Statically loaded - material thickness ≥1 in","value":"Max 1/16 in"},{"label":"Cyclically loaded - transverse to stress","value":"Max 0.01 in"},{"label":"Cyclically loaded - parallel to stress","value":"Max 1/32 in"}],"important_notes":["Section 6.9 (Tubular) and Table 6.1 (Statically/Cyclically loaded)","Undercut depth requires physical measurement — visual estimate not sufficient","Length limitations also apply — see code"]}'::jsonb,
 'verified'),

('code_requirement', 'AWS D1.1 Porosity Acceptance Criteria', 'Any', 'Carbon Steel', 'AWS D1.1:2020',
 '{"summary":"Visible porosity acceptance limits per Table 6.1. Single piping porosity is rejected immediately. Cluster porosity has size and quantity limits.","key_values":[{"label":"Statically loaded fillet - max single pore","value":"3/32 in"},{"label":"Statically loaded fillet - sum of pores in 1 in","value":"3/8 in"},{"label":"Cyclically loaded - max single pore","value":"1/8 in or 1/3 throat"},{"label":"Pipe porosity (D1.1 §9)","value":"None permitted in tube-to-tube"}],"important_notes":["Visual inspection only catches surface porosity","Subsurface porosity requires RT or UT","Linear porosity is more serious than scattered"]}'::jsonb,
 'verified'),

('code_requirement', 'AWS D1.1 Reinforcement Limits', 'Any', 'Carbon Steel', 'AWS D1.1:2020',
 '{"summary":"Maximum face reinforcement on groove welds. Excessive reinforcement causes stress concentration and is rejected on cyclically loaded structures.","key_values":[{"label":"Width 1 in or less","value":"Max 3/32 in"},{"label":"Width over 1 in to 2 in","value":"Max 1/8 in"},{"label":"Width over 2 in","value":"Max 3/16 in"},{"label":"Underfill","value":"Not permitted"}],"important_notes":["Reinforcement must blend smoothly with base metal","Cyclically loaded structures may require grinding flush","See AWS D1.1 §6.9"]}'::jsonb,
 'verified'),

('code_requirement', 'AWS D1.1 Crack Acceptance', 'Any', 'Carbon Steel', 'AWS D1.1:2020',
 '{"summary":"NO CRACKS of any length or location are permitted in any AWS D1.1 weld. This is non-negotiable across all D1.x codes.","key_values":[{"label":"Visible cracks","value":"Reject — no exceptions"},{"label":"Suspect cracks","value":"Investigate with MT or PT"}],"important_notes":["Crater cracks are a common rejection — fill craters fully","Cracks under fillet toes may not be visible — MT recommended on critical joints","D1.1 §6.9 — zero tolerance for cracks"]}'::jsonb,
 'verified'),

-- Defect guide
('defect_guide', 'Porosity in MIG Welds — Causes and Fixes', 'GMAW', 'Carbon Steel', null,
 '{"summary":"Porosity in MIG welds is almost always a shielding gas problem or contamination issue. Diagnose by pattern: scattered = gas, linear = contamination, surface = moisture.","key_values":[{"label":"Most common cause","value":"Lost shielding gas coverage (wind, low flow, dirty nozzle)"},{"label":"Recommended gas flow","value":"30-45 CFH for short circuit, 35-50 CFH for spray"},{"label":"Wind threshold","value":"Above 5 mph kills MIG gas coverage"}],"important_notes":["Always check gas flow at the gun, not at the cylinder","Replace nozzle if spatter buildup is restricting gas flow","Use windscreen outdoors or switch to FCAW","Check for cracked gas hose, loose fittings, water in regulator"]}'::jsonb,
 'verified'),

('defect_guide', 'Cold Lap (Lack of Fusion) — Causes and Fixes', 'GMAW', 'Carbon Steel', null,
 '{"summary":"Cold lap looks like fusion but has no metallurgical bond. Caused by insufficient heat input, fast travel, or poor technique. Often rejected only after destructive testing or NDT.","key_values":[{"label":"Primary cause","value":"Voltage too low or travel too fast"},{"label":"Fix","value":"Increase voltage 1-2V, reduce travel speed, ensure short arc"}],"important_notes":["Visual inspection often misses cold lap — looks like normal fusion","Suspect if bead profile looks flat or rolled over","Always start with a clean, hot arc on the joint edge","Common on aluminum due to oxide layer"]}'::jsonb,
 'verified'),

('defect_guide', 'Burn-Through on Thin Material', 'GMAW', 'Carbon Steel', null,
 '{"summary":"Burn-through on sheet metal is a result of too much heat for the material thickness. Fix by reducing amperage, increasing travel speed, or using stitch welds.","key_values":[{"label":"Primary cause","value":"Amperage too high for thickness, travel too slow"},{"label":"Sheet metal threshold","value":"Below 1/8 in requires reduced parameters"},{"label":"Fix techniques","value":"Reduce amps 10-20%, speed up travel, use stitch welds, add backing"}],"important_notes":["Use a chill block on thin material to absorb heat","For gap-laden joints, use weave or stitch technique","Avoid TIG fusion on burn-through — add filler"]}'::jsonb,
 'verified'),

('defect_guide', 'Tungsten Inclusion in TIG', 'GTAW', 'Any', null,
 '{"summary":"Tungsten inclusions occur when the tungsten electrode touches the weld pool or filler rod. Visible as bright spots in the weld; rejectable per most codes.","key_values":[{"label":"Cause","value":"Tungsten contact with pool, filler, or base metal"},{"label":"Fix","value":"Re-grind tungsten, increase arc length slightly, dab filler cleanly"}],"important_notes":["Use 2% lanthanated or ceriated tungsten for most steels","Grind tungsten longitudinally, not radially","Replace immediately if contaminated — do not weld through it"]}'::jsonb,
 'verified'),

-- WPS guidance
('wps_guidance', 'When You Need a Qualified WPS', 'Any', 'Any', 'AWS D1.1:2020',
 '{"summary":"Per AWS D1.1, a qualified WPS is required for any code-governed welding unless using a Pre-Qualified Joint per Section 5. Contractors must have qualified WPS records on file before production welding.","key_values":[{"label":"Pre-qualified joints","value":"AWS D1.1 §5"},{"label":"Required for","value":"All non-prequalified joints, base metal/process combos outside §5"},{"label":"Qualification testing","value":"Per §6.13 — bend, tensile, and visual"}],"important_notes":["A welder qualification (WPQ) is separate from WPS qualification","Contractor records must include PQR, WPS, and WPQ for each welder/process","Code edition matters — verify current AWS D1.1 edition with project spec"]}'::jsonb,
 'verified'),

-- Weld symbols
('weld_symbol', 'Reading AWS Weld Symbols', 'Any', 'Any', 'AWS A2.4',
 '{"summary":"AWS A2.4 weld symbol structure: reference line, arrow, weld symbol, dimensions, supplementary symbols, and tail. Symbols below the reference line indicate the arrow side; above indicates the other side.","key_values":[{"label":"Below line","value":"Arrow side of joint"},{"label":"Above line","value":"Other side of joint"},{"label":"Both sides","value":"Symbol on both sides of reference line"},{"label":"Field weld","value":"Flag at reference line/arrow junction"}],"important_notes":["Tail contains specifications, process, or notes — read it","Dimensions: size always to the LEFT of the symbol","Length and pitch (for intermittent welds) to the RIGHT of the symbol"]}'::jsonb,
 'verified'),

-- Safety
('safety', 'Welding Fume Hazards by Material', 'Any', 'Any', 'OSHA 29 CFR 1910.252',
 '{"summary":"Welding fumes contain metal oxides and gases that can cause acute and chronic illness. Stainless and galvanized steel are particularly hazardous. Local exhaust ventilation is required for most production welding.","key_values":[{"label":"Stainless steel","value":"Hexavalent chromium — OSHA PEL 5 µg/m³"},{"label":"Galvanized","value":"Zinc oxide — causes metal fume fever"},{"label":"Cadmium-coated","value":"Acutely toxic — fatalities documented"},{"label":"Aluminum","value":"Aluminum oxide — neurological concerns long-term"}],"important_notes":["Always use local exhaust on stainless and galvanized","Confined spaces require continuous ventilation and air monitoring","Half-mask respirator (P100) is minimum for stainless without LEV"]}'::jsonb,
 'verified');
