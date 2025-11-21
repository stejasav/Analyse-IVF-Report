export function buildPrompt(fileNames) {
  // We create a list string to tell Gemini exactly what files we are sending
  const fileList = fileNames.map((name, i) => `${i + 1}. "${name}"`).join("\n");

  return `You are an expert medical report analyzer.

  I have attached ${fileNames.length} files in the following order:
  ${fileList}
  
  YOUR TASKS:
  1. **Transcribe**: Read every file. 
  2. **Analyze**: Generate insights based on the text.

  IMPORTANT: Respond with ONLY a valid JSON object.

  Your JSON MUST follow this structure exactly:

  {
    "summary": "Overview of findings",
    "key_findings": ["Finding 1", "Finding 2"],
    "possible_red_flags": ["Red flags"],
    "recommended_followups": ["Next steps"],
    "questions_for_doctor": ["Questions"],
    "transcriptions": {
      "${fileNames[0]}": "Full extracted text...",
      "${fileNames[1] || "filename2"}": "Full extracted text..."
    }
  }

  TRANSCRIPTION RULES:
  - The "transcriptions" object MUST contain exactly ${fileNames.length} keys.
  - The keys MUST match the exact filenames listed above (${fileNames.join(
    ", "
  )}).
  - **For PDFs:** Combine ALL pages into a single string for that filename. Do not create separate keys for pages. Mark page boundaries like this: "\\n--- Page 1 ---\\n [Text] \\n--- Page 2 ---\\n [Text]".
  - **For Images:** Extract all visible text.
  - If a file appears empty or is just a logo, return "No readable text found".
  `;
}
