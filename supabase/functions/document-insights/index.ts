// @ts-ignore - Deno runtime import for Supabase Edge Functions.
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { Buffer } from 'node:buffer';
import pdfParse from 'npm:pdf-parse@1.1.1';

// Minimal Deno typing to satisfy TS checks in the app workspace.
declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

type PortfolioSnapshot = {
  accounts: Array<{
    id: string | number;
    balance: number | null;
    type: string | null;
    institution: string | null;
    propertyId: string | number | null;
    offsetAccountId: string | number | null;
    currency: string | null;
    interestRate: number | null;
  }>;
  properties: Array<{
    id: string | number;
    address: string | null;
    purchasePrice: number | null;
    currentValue: number | null;
    purchaseDate: string | null;
    category: string | null;
    type: string | null;
    status: string | null;
    saleDate: string | null;
  }>;
  transactions: Array<{
    id: string | number;
    date: string | null;
    description: string | null;
    amount: number | null;
    type: string | null;
    propertyId: string | number | null;
    propertyAddress: string | null;
    entityId: string | number | null;
    currency: string | null;
  }>;
  selectedEntityId: string;
};

type ChatContext = {
  userId: string;
  dataWarnings: string[];
};

type DocumentFile = {
  name: string;
  mimeType: string;
  base64: string;
};

type DocumentRequest = {
  file?: DocumentFile;
  portfolio?: PortfolioSnapshot;
  context?: ChatContext;
  category?: string;
};

type PropertyMatch = {
  property_id?: string | number | null;
  property_address?: string | null;
  confidence?: number | null;
  reason?: string | null;
};

type DocumentAnalysis = {
  summary_markdown?: string;
  property_match?: PropertyMatch;
  extracted_fields?: Record<string, unknown>;
  transaction_suggestions?: Array<Record<string, unknown>>;
  warnings?: string[];
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_FILE_BYTES = 6 * 1024 * 1024;
const MAX_TEXT_CHARS = 12000;

const base64ToBytes = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const truncateText = (value: string, maxChars: number) =>
  value.length > maxChars ? `${value.slice(0, maxChars - 3)}...` : value;

const extractJsonObject = (value: string): Record<string, unknown> | null => {
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(value.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const formatDisplayValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return 'Not available';
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return String(value);
};

const buildStructuredReply = (
  analysis: DocumentAnalysis | null,
  fallback: string,
  categoryLabel: string
) => {
  if (!analysis) {
    return fallback;
  }

  const summary = analysis.summary_markdown?.trim() || fallback;
  const match = analysis.property_match;
  const confidence = typeof match?.confidence === 'number'
    ? `${Math.round(match.confidence * 100)}%`
    : 'Not available';
  const fields = analysis.extracted_fields ?? {};
  const warnings = analysis.warnings ?? [];
  const suggestions = analysis.transaction_suggestions ?? [];

  const lines: string[] = [];
  lines.push(`## Document Summary`);
  lines.push(`Category: ${categoryLabel}`);
  lines.push('');
  lines.push(summary);
  lines.push('');
  lines.push('## Matched Property');
  lines.push(`- Property ID: ${formatDisplayValue(match?.property_id ?? null)}`);
  lines.push(`- Address: ${formatDisplayValue(match?.property_address ?? null)}`);
  lines.push(`- Confidence: ${confidence}`);
  lines.push(`- Reason: ${formatDisplayValue(match?.reason ?? null)}`);
  lines.push('');
  lines.push('## Extracted Fields');
  if (Object.keys(fields).length === 0) {
    lines.push('- Not available');
  } else {
    Object.entries(fields).forEach(([key, value]) => {
      lines.push(`- ${key.replace(/_/g, ' ')}: ${formatDisplayValue(value)}`);
    });
  }
  lines.push('');
  lines.push('## Suggested Transactions');
  if (!suggestions.length) {
    lines.push('- Not available');
  } else {
    suggestions.slice(0, 6).forEach(item => {
      const type = formatDisplayValue(item.type);
      const amount = formatDisplayValue(item.amount);
      const date = formatDisplayValue(item.date);
      const description = formatDisplayValue(item.description);
      lines.push(`- ${type} | ${amount} | ${date} | ${description}`);
    });
  }
  lines.push('');
  lines.push('## Warnings');
  if (!warnings.length) {
    lines.push('- None');
  } else {
    warnings.forEach(warning => lines.push(`- ${warning}`));
  }

  return lines.join('\n');
};

const formatPortfolioContext = (portfolio?: PortfolioSnapshot) => {
  if (!portfolio) {
    return 'Portfolio Snapshot: not provided.';
  }

  const properties = portfolio.properties.slice(0, 80).map(property => ({
    id: property.id,
    address: property.address,
    status: property.status,
    category: property.category,
    type: property.type,
  }));

  const accounts = portfolio.accounts.slice(0, 80).map(account => ({
    id: account.id,
    type: account.type,
    institution: account.institution,
    propertyId: account.propertyId,
    interestRate: account.interestRate,
  }));

  const transactions = portfolio.transactions.slice(0, 120).map(transaction => ({
    id: transaction.id,
    date: transaction.date,
    description: transaction.description,
    amount: transaction.amount,
    type: transaction.type,
    propertyId: transaction.propertyId,
    propertyAddress: transaction.propertyAddress,
  }));

  return `Portfolio Snapshot:\n${JSON.stringify({
    selectedEntityId: portfolio.selectedEntityId,
    properties,
    accounts,
    transactions,
  })}`;
};

const fetchOpenRouterReply = async (
  baseUrl: string,
  apiKey: string,
  referer: string,
  title: string,
  model: string,
  requestMessages: Array<Record<string, unknown>>
) => {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(referer ? { 'HTTP-Referer': referer } : {}),
      ...(title ? { 'X-Title': title } : {}),
    },
    body: JSON.stringify({
      model,
      messages: requestMessages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data?.choices?.[0]?.message?.content ?? '';
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as DocumentRequest;
    const { file, portfolio, context, category } = body || {};

    if (!file?.base64 || !file?.mimeType) {
      return new Response(JSON.stringify({ error: 'Missing file payload.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const approxBytes = Math.floor((file.base64.length * 3) / 4);
    if (approxBytes > MAX_FILE_BYTES) {
      return new Response(JSON.stringify({ error: 'File exceeds size limit.' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY') ?? '';
    const baseUrl = Deno.env.get('OPENROUTER_BASE_URL') ?? 'https://openrouter.ai/api/v1';
    const model =
      Deno.env.get('OPENROUTER_DOC_MODEL') ??
      Deno.env.get('OPENROUTER_MODEL') ??
      'arcee-ai/trinity-large-preview:free';
    const referer = Deno.env.get('OPENROUTER_REFERER') ?? 'BrickLedgerApp/1.0';
    const title = Deno.env.get('OPENROUTER_TITLE') ?? 'BrickLedger App Document Insights';

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing OPENROUTER_API_KEY.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isPdf = file.mimeType === 'application/pdf';
    const isImage = file.mimeType.startsWith('image/');

    if (!isPdf && !isImage) {
      return new Response(JSON.stringify({ error: 'Unsupported file type.' }), {
        status: 415,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let documentText = '';
    let imageDataUrl = '';

    if (isPdf) {
      const bytes = base64ToBytes(file.base64);
      const parsed = await pdfParse(Buffer.from(bytes));
      documentText = truncateText(parsed.text ?? '', MAX_TEXT_CHARS);
    } else {
      imageDataUrl = `data:${file.mimeType};base64,${file.base64}`;
    }

    const portfolioContext = formatPortfolioContext(portfolio);
    const warningsContext = JSON.stringify(context?.dataWarnings ?? []);
    const docCategory = category ?? 'document';

    const prompt =
      `Document Category: ${docCategory}\n` +
      `${portfolioContext}\n` +
      `Data Warnings: ${warningsContext}\n` +
      (documentText ? `Document Text:\n${documentText}\n` : '') +
      '\nAnalyze the document and map it to the portfolio. ' +
      'Return ONLY valid JSON, no markdown fences, using this schema:\n' +
      '{\n' +
      '  "summary_markdown": "string",\n' +
      '  "property_match": {\n' +
      '    "property_id": "string|number|null",\n' +
      '    "property_address": "string|null",\n' +
      '    "confidence": 0.0,\n' +
      '    "reason": "string"\n' +
      '  },\n' +
      '  "extracted_fields": {\n' +
      '    "statement_period": "string|null",\n' +
      '    "gross_rent": "number|null",\n' +
      '    "fees": "number|null",\n' +
      '    "net_rent": "number|null",\n' +
      '    "management_fees": "number|null",\n' +
      '    "other_income": "number|null",\n' +
      '    "arrears": "number|null"\n' +
      '  },\n' +
      '  "transaction_suggestions": [\n' +
      '    {"type":"string","amount":"number","date":"string","description":"string","property_id":"string|number|null"}\n' +
      '  ],\n' +
      '  "warnings": ["string"]\n' +
      '}\n' +
      'Write summary_markdown with these sections in order: Summary, Key Figures, Portfolio Match, Notes. ' +
      'Use only the portfolio snapshot for matching. If unsure, set confidence under 0.6 and explain.';

    const systemMessage = {
      role: 'system',
      content: 'You are PropPilot, an assistant for property investors. Return only JSON.'
    };

    const userMessage = isImage
      ? {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        }
      : { role: 'user', content: prompt };

    const content = await fetchOpenRouterReply(baseUrl, apiKey, referer, title, model, [
      systemMessage,
      userMessage,
    ]);

    const parsed = extractJsonObject(content) as DocumentAnalysis | null;
    const fallback = content.trim() || 'Document analysis completed.';
    const reply = buildStructuredReply(parsed, fallback, docCategory);

    return new Response(
      JSON.stringify({
        reply,
        propertyMatch: parsed?.property_match ?? null,
        extractedFields: parsed?.extracted_fields ?? null,
        transactionSuggestions: parsed?.transaction_suggestions ?? [],
        warnings: parsed?.warnings ?? [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Document analysis failed.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
