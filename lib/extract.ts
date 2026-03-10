/**
 * Text extraction and chunking utilities.
 *
 * pdf-parse is used for PDF text extraction because it is pure JavaScript
 * (no native bindings), has a simple one-call API, and runs reliably inside
 * Next.js server actions without any native compilation step on Vercel.
 * It is loaded via dynamic import to avoid the package's test-file side effect
 * that runs at module initialisation time.
 */

/**
 * Remove characters that PostgreSQL's JSON parser rejects.
 * Specifically: null bytes (\u0000) and ASCII control chars except \t and \n.
 * pdf-parse sometimes produces null bytes from PDFs with non-standard encoding.
 */
export function sanitizeExtractedText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    // ASCII control chars 0x01-0x08, 0x0B-0x0C, 0x0E-0x1F (keep \t=0x09 \n=0x0A)
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Split text into sequential chunks of roughly `maxChars` characters.
 * Tries to split at paragraph boundaries first; falls back to sentence
 * boundaries when a single paragraph exceeds `maxChars`.
 */
export function chunkText(text: string, maxChars = 1000): string[] {
  const normalised = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalised) return [];

  const paragraphs = normalised
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (para.length > maxChars) {
      // Flush buffer before splitting this large paragraph
      if (current.trim()) {
        chunks.push(current.trim());
        current = "";
      }
      // Split oversized paragraph by sentence
      const sentences = para.match(/[^.!?]+[.!?]+[\s]*/g) ?? [para];
      for (const sentence of sentences) {
        if (
          current.length + sentence.length > maxChars &&
          current.length > 0
        ) {
          chunks.push(current.trim());
          current = sentence;
        } else {
          current += (current ? " " : "") + sentence;
        }
      }
    } else if (current.length + para.length + 2 > maxChars) {
      if (current.trim()) chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/**
 * Extract plain text from a PDF ArrayBuffer.
 * Returns an empty string if the PDF contains no selectable text (scanned).
 */
export async function extractTextFromPdf(
  buffer: ArrayBuffer
): Promise<string> {
  try {
    // Dynamic import sidesteps pdf-parse's test-file side effect at load time
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(Buffer.from(buffer));
    return data.text ?? "";
  } catch {
    return "";
  }
}

/**
 * Extract plain text from a DOCX ArrayBuffer using mammoth.
 * Returns an empty string on failure.
 */
export async function extractTextFromDocx(
  buffer: ArrayBuffer
): Promise<string> {
  try {
    const mod = await import("mammoth");
    // Mammoth is a CJS module. When loaded via dynamic import the named exports
    // may live on mod directly OR under mod.default depending on the bundler/
    // Node version. Resolve extractRawText from whichever side has it.
    const m = mod as ReturnType<typeof Object.create>;
    const extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string }> =
      m.default?.extractRawText ?? m.extractRawText;
    // Pass a Node.js Buffer (not ArrayBuffer) — more reliable across mammoth versions
    const result = await extractRawText({ buffer: Buffer.from(buffer) });
    const raw = result.value ?? "";
    return raw;
  } catch (err) {
    console.error("[DOCX] extractTextFromDocx threw:", err);
    return "";
  }
}

/**
 * Extract text from an image (or scanned PDF page) via OpenAI vision OCR.
 * mimeType should be "image/jpeg" or "image/png".
 * Returns an empty string on failure.
 */
export async function extractTextWithOCR(
  buffer: ArrayBuffer,
  mimeType: string
): Promise<string> {
  try {
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({ apiKey: process.env.AI_API_KEY });

    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
            {
              type: "text",
              text: "Extract all visible text from this image exactly as it appears.\nOutput plain text only - no summaries, no explanations, no markdown formatting.\nPreserve the original structure, line breaks, and any code snippets as written.",
            },
          ],
        },
      ],
    });

    return response.choices[0]?.message?.content ?? "";
  } catch {
    return "";
  }
}

/**
 * Extract plain text from a PPTX ArrayBuffer.
 * Unzips the file and reads DrawingML <a:t> text nodes from each slide XML.
 * Returns an empty string on failure.
 * NOTE: legacy binary .ppt is not supported — surface an error before calling.
 */
export async function extractTextFromPptx(
  buffer: ArrayBuffer
): Promise<string> {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);

    const slideNames = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] ?? "0", 10);
        const numB = parseInt(b.match(/\d+/)?.[0] ?? "0", 10);
        return numA - numB;
      });

    const slideTexts: string[] = [];
    for (const name of slideNames) {
      const xml = await zip.files[name].async("string");
      const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [];
      const text = matches
        .map((m) => m.replace(/<[^>]+>/g, "").trim())
        .filter(Boolean)
        .join(" ");
      if (text) slideTexts.push(text);
    }

    return slideTexts.join("\n\n");
  } catch {
    return "";
  }
}
