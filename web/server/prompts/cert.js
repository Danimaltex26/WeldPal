// System prompt for AI-generated cert prep questions.

export const CERT_GENERATE_SYSTEM_PROMPT = `Generate welding certification exam questions for AWS certification exams.

Return ONLY a valid JSON array of question objects, no additional text or markdown:

[
  {
    "cert_level": "CW | CAWI | CWI",
    "category": "visual_inspection | codes_standards | weld_symbols | metallurgy | processes | safety | ndt",
    "question": "string — clear, unambiguous exam-style question",
    "option_a": "string",
    "option_b": "string",
    "option_c": "string",
    "option_d": "string",
    "correct_answer": "A | B | C | D",
    "explanation": "string — explains why correct answer is right and why others are wrong",
    "code_reference": "string — specific AWS/ASME/API reference or null",
    "difficulty": "easy | medium | hard"
  }
]

RULES:
- Questions must reflect actual AWS exam style and difficulty
- Code references must use current editions (AWS D1.1:2025, etc.)
- Distractors (wrong answers) must be plausible — no obviously wrong options
- CWI questions should test code interpretation, not just memorization
- Visual inspection questions should describe what the inspector would physically see
- Never repeat questions already in the bank (assume bank has many existing questions)
`;
