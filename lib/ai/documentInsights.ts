import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/supabase';
import { Logger } from '@/lib/logger';
import type { PortfolioSnapshot, ChatContext } from '@/lib/ai/portfolioChat';

type DocumentCategory = 'rental-statement';

type DocumentFile = {
  name: string;
  mimeType: string;
  base64: string;
};

type DocumentAnalysisResponse = {
  reply: string;
  propertyMatch?: {
    propertyId?: string | number | null;
    propertyAddress?: string | null;
    confidence?: number | null;
    reason?: string | null;
  };
  extractedFields?: Record<string, unknown> | null;
  warnings?: string[];
  transactionSuggestions?: Array<Record<string, unknown>>;
};

const EDGE_FUNCTION_NAME = 'document-insights';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/${EDGE_FUNCTION_NAME}`;

export async function analyzePortfolioDocument(
  file: DocumentFile,
  portfolio: PortfolioSnapshot,
  context: ChatContext,
  category: DocumentCategory
): Promise<DocumentAnalysisResponse> {
  const transactionId = Logger.createTransactionId();
  Logger.info('analyzePortfolioDocument called', { fileName: file.name }, 'documentInsights.ts', transactionId);

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      file,
      portfolio,
      context,
      category,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    Logger.error(
      'Document insights edge function error',
      { status: response.status, errorText },
      'documentInsights.ts',
      transactionId
    );
    throw new Error(errorText || 'Document analysis failed.');
  }

  const data = (await response.json()) as DocumentAnalysisResponse;
  if (!data?.reply) {
    Logger.warn('Document insights response missing reply', { data }, 'documentInsights.ts', transactionId);
    return { reply: 'I could not analyze that document right now. Please try again.' };
  }

  return data;
}
