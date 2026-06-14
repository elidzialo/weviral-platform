import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function verifyProofScreenshot(imageUrl: string, targetViews: number) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are verifying a WhatsApp Status screenshot for an influencer marketing platform.
Analyse this screenshot and return a JSON object with EXACTLY these fields:
{
  "views": <number — the view count shown, or 0 if not visible>,
  "is_whatsapp_status": <boolean — is this genuinely a WhatsApp Status screen?>,
  "has_creative": <boolean — is there visible ad/promotional content?>,
  "confidence": <number 0-100 — your overall confidence this is a legitimate submission>,
  "target_met": <boolean — does the view count meet or exceed ${targetViews}?>,
  "notes": "<brief explanation of your assessment>"
}
Return ONLY valid JSON, no other text.`,
          },
          {
            type: 'image_url',
            image_url: { url: imageUrl, detail: 'high' },
          },
        ],
      },
    ],
  })

  const text = response.choices[0]?.message?.content || '{}'
  try {
    return JSON.parse(text)
  } catch {
    return { views: 0, is_whatsapp_status: false, has_creative: false, confidence: 0, target_met: false, notes: 'Parse error' }
  }
}
