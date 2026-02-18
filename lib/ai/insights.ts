// lib/ai/insights.ts
// Utility to get AI-driven portfolio suggestions using Mistral AI API as a conversational chatbot

export async function getPortfolioAISuggestions(summaryMetrics: any, context: string = ""): Promise<string> {
  // Prompt for conversational chatbot style
  const prompt = `You are BrickLedger, an expert AI assistant for Australian property investors. The user will ask questions or provide portfolio details. Respond conversationally, as a helpful, friendly, and knowledgeable chatbot. Give clear, actionable, and specific advice tailored to the user's question or portfolio. If portfolio metrics are provided, use them to inform your answer. Avoid generic statements and do not output JSON or code blocks.\n\nPortfolio Metrics (if provided):\n${JSON.stringify(summaryMetrics, null, 2)}\n\nUser Context:\nAustralian property investment, cross-entity, multi-property, with a focus on maximizing after-tax returns and long-term growth.\n\nUser message: ${context}\n\nRespond as a chatbot, not as a list or JSON.`;

  // Use Mistral AI API
  // See: https://docs.mistral.ai/api/
  const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
  const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || '8DyTAOwOJ3eMo3QgILFBqY9kjYhG4zaj';
  if (!MISTRAL_API_KEY) {
    
    return 'AI suggestion unavailable: Missing Mistral API key.';
  }

  try {
    
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mistral-tiny', // or another available model
        messages: [
          { role: 'system', content: 'You are BrickLedger, an expert AI assistant for Australian property investors. Respond as a conversational chatbot.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 512,
        temperature: 0.7,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      
      throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    
    const suggestion = data.choices?.[0]?.message?.content || JSON.stringify(data);
    return suggestion.trim();
  } catch (err: any) {
    
    return `AI suggestion unavailable: ${err.message || String(err)}`;
  }
}
