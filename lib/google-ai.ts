import { GoogleGenAI } from '@google/genai'

function getAI() {
  const apiKey = process.env.GOOGLE_AI_STUDIO_KEY
  if (!apiKey) {
    throw new Error(
      'GOOGLE_AI_STUDIO_KEY is not set. Add it to your .env to use PDF extraction.'
    )
  }
  return new GoogleGenAI({ apiKey })
}

// Database schema description for the AI
const DATABASE_SCHEMA = `
Database Schema for CCF (Federal Drug Testing Custody and Control Form):

CCFForm {
  // All fields are optional
  specimenId: String? (optional)
  collectionDate: DateTime? (optional, ISO format YYYY-MM-DDTHH:mm:ss.sssZ)
  typeOfTest: String? (optional)
  projectJobNumber: String? (optional)
  employerName: String? (optional)
  donorFirstName: String? (optional)
  donorLastName: String? (optional)
  donorLastFourSsn: String? (optional) - Last 4 digits of SSN
  donorDob: DateTime? (optional, ISO format YYYY-MM-DDTHH:mm:ss.sssZ)
  donorPhone: String? (optional)
  collectorFirstName: String? (optional)
  collectorLastName: String? (optional)
  instantOralTox: String? (optional)
}

Note: All fields are optional. Extract what you can find from the PDF and use "null" for fields you cannot determine.
For dates, use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ) or null.
`

export async function extractCCFDataFromPDF(
  pdfFile: File
): Promise<Record<string, unknown>> {
  try {
    console.log(
      `Starting PDF extraction for: ${pdfFile.name} (${pdfFile.size} bytes)`
    )

    // Convert PDF to base64
    const arrayBuffer = await pdfFile.arrayBuffer()
    // Use Buffer for base64 encoding (available in Node.js)
    const base64Data = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = pdfFile.type || 'application/pdf'

    console.log(
      `PDF converted to base64: ${base64Data.length} characters, MIME type: ${mimeType}`
    )

    console.log('Sending request to Google AI with gemini-2.5-flash...')

    // Create the prompt
    const prompt = `You are a data extraction assistant that reads text from scanned-in drug-testing collection forms and maps the information into our structured database schema.

Your goals: 

1. Extract key fields and values from the PDF
2. Match them to the provided database schema as accurately as possible
3. Return a single JSON object that exactly matches the required schema
4. Use "null" for any fields you cannot correctly determine
5. Do not invent data.

You may see inconsistent formatting, extra text, and OCR errors. Do your best to infer the correct values, but avoid guessing when the text is ambiguous.

${DATABASE_SCHEMA}

Please extract the data from the provided PDF and return ONLY a valid JSON object matching the CCFForm schema. 
For date fields, use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ) or null.
For boolean fields, use true/false or null.
For arrays, use JSON array format.
For related entities (MRO, Client, Collector), extract their information and include it in the response as separate objects or nested within the main form object.

Return ONLY the JSON object, no additional text or explanation.`

    // Process the PDF with the model using the new @google/genai SDK
    const ai = getAI()
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
          ],
        },
      ],
    })

    console.log('Request sent, waiting for response...')

    // Check for errors in the response
    if (!response) {
      throw new Error('No response received from Google AI')
    }

    // Get the text from the response
    // The new SDK structure: response.text is a property (getter), not a function
    let text: string
    try {
      // Based on the new SDK, response.text should be a property
      if (response.text && typeof response.text === 'string') {
        text = response.text
      } else if (
        response.candidates &&
        response.candidates[0]?.content?.parts
      ) {
        // Try to extract from candidates structure if text property doesn't exist
        text = response.candidates[0].content.parts
          .map((part: { text?: string }) => part.text || '')
          .join('')
      } else {
        console.error(
          'Unexpected response structure:',
          JSON.stringify(response, null, 2)
        )
        throw new Error('Unexpected response structure from Google AI')
      }
    } catch (textError: unknown) {
      console.error('Error getting text from response:', textError)
      console.error('Full response:', JSON.stringify(response, null, 2))
      const textErrorMessage =
        textError instanceof Error ? textError.message : String(textError)
      throw new Error(
        `Failed to extract text from AI response: ${textErrorMessage}`
      )
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Empty response received from Google AI')
    }

    console.log('Raw AI response:', text)

    // Try to extract JSON from the response
    // The AI might wrap the JSON in markdown code blocks or add extra text
    let jsonText = text.trim()

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\n?/, '').replace(/\n?```$/, '')
    }

    // Try to find JSON object in the text if it's not at the start
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    // Parse the JSON
    let extractedData: Record<string, unknown>
    try {
      extractedData = JSON.parse(jsonText) as Record<string, unknown>
    } catch (parseError: unknown) {
      console.error('JSON parse error:', parseError)
      console.error('Attempted to parse:', jsonText.substring(0, 500))
      const parseErrorMessage =
        parseError instanceof Error ? parseError.message : String(parseError)
      throw new Error(
        `Failed to parse JSON from AI response: ${parseErrorMessage}. Response preview: ${jsonText.substring(
          0,
          200
        )}`
      )
    }

    return extractedData
  } catch (error: unknown) {
    console.error('Error extracting data from PDF:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Error stack:', errorStack)

    // Provide more detailed error information
    if (errorMessage.includes('API key')) {
      throw new Error(
        'Invalid or missing Google AI Studio API key. Please check your GOOGLE_AI_STUDIO_KEY environment variable.'
      )
    } else if (
      errorMessage.includes('quota') ||
      errorMessage.includes('rate limit')
    ) {
      throw new Error(
        'Google AI API quota exceeded or rate limited. Please try again later.'
      )
    } else if (
      errorMessage.includes('size') ||
      errorMessage.includes('too large')
    ) {
      throw new Error('PDF file is too large. Please use a smaller file.')
    }

    throw new Error(
      `Failed to extract data from PDF: ${errorMessage || 'Unknown error'}`
    )
  }
}
