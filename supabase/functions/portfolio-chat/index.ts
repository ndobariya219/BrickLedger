// @ts-ignore - Deno runtime import for Supabase Edge Functions.
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';

// Minimal Deno typing to satisfy TS checks in the app workspace.
declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

type ChatRole = 'system' | 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
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

type ChatRequest = {
  message: string;
  messages?: ChatMessage[];
  portfolio?: PortfolioSnapshot;
  context?: ChatContext;
  mode?: 'requirements';
  stream?: boolean;
};

type RequiredData = {
  accounts: boolean;
  properties: boolean;
  transactions: boolean;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const streamHeaders = {
  ...corsHeaders,
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};

const formatSse = (event: string, data: unknown) =>
  `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;

const stripInternalMarkers = (text: string) => {
  const withoutAnalysis = text.replace(/<\/?analysis>/gi, '');
  const strippedBlocks = withoutAnalysis.replace(/\/start[\s\S]*?\/stop/gi, '');
  const strippedLines = strippedBlocks
    .split('\n')
    .filter(line => {
      const trimmed = line.trim().toLowerCase();
      return !trimmed.startsWith('/start') && !trimmed.startsWith('/stop');
    })
    .join('\n');
  return strippedLines.replace(/\n{3,}/g, '\n\n').trim();
};

type ResearchSource = {
  title: string;
  url: string;
  excerpt: string;
};

type ResearchResult = {
  sources: ResearchSource[];
  missingDomains: string[];
};

type ResearchPlan = {
  researchOutput: string;
  additionalQueries: string[];
};

const DEFAULT_ALLOWED_DOMAINS = [
  'property.com.au',
  'realestate.com.au',
  'domain.com.au'
];

const parseAllowedDomains = (): string[] => {
  const raw = Deno.env.get('PROPERTY_RESEARCH_ALLOWED_DOMAINS');
  if (!raw) {
    return DEFAULT_ALLOWED_DOMAINS;
  }

  return raw
    .split(',')
    .map(domain => domain.trim().toLowerCase())
    .filter(Boolean);
};

const isResearchRequest = (message: string) =>
  /(do\s+)?research\s+on|property\s+research|investor\s+assessment|analyse\s+address|analyze\s+address/i.test(
    message
  );

const extractResearchAddress = (message: string) => {
  const match = message.match(/research\s+on\s+(.+)/i);
  if (match?.[1]) {
    return match[1].trim();
  }

  const fallback = message.replace(/(do\s+)?research\s+on/i, '').trim();
  return fallback || message.trim();
};

const isAllowedDomain = (url: string, allowedDomains: string[]) => {
  try {
    const { hostname } = new URL(url);
    return allowedDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
};

const extractTextFromHtml = (html: string) => {
  const withoutScripts = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ');
  const stripped = withoutScripts.replace(/<[^>]+>/g, ' ');
  return stripped.replace(/\s+/g, ' ').trim();
};

const fetchWithTimeout = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
};

const runResearch = async (address: string): Promise<ResearchResult> => {
  const tavilyKey = Deno.env.get('TAVILY_API_KEY') ?? '';
  if (!tavilyKey) {
    throw new Error('Missing TAVILY_API_KEY.');
  }
  const allowedDomains = parseAllowedDomains();
  const domains = allowedDomains.slice(0, 8);
  const sources: ResearchSource[] = [];
  const missingDomains: string[] = [];
  const seenUrls = new Set<string>();
  let resolvedAddress = address;

  const resolveResponse = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tavilyKey}`,
    },
    body: JSON.stringify({
      query: `"${address}" address`,
      search_depth: 'basic',
      max_results: 3,
    }),
  });

  if (!resolveResponse.ok) {
    const errorText = await resolveResponse.text();
    throw new Error(`Tavily error: ${resolveResponse.status} ${errorText}`);
  }

  const resolveData = (await resolveResponse.json()) as {
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };

  const resolveTitle = resolveData.results?.[0]?.title ?? '';
  if (resolveTitle && resolveTitle.length <= 120) {
    resolvedAddress = resolveTitle;
  }

  const searchTasks = domains.map(async domain => {
    const query = `site:${domain} "${resolvedAddress}" property`;
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tavilyKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: 'basic',
        max_results: 2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };

    const matches = (data.results ?? []).filter(result =>
      result.url ? isAllowedDomain(result.url, [domain]) : false
    );

    const top = matches[0];
    if (!top?.url) {
      missingDomains.push(domain);
      return;
    }

    if (seenUrls.has(top.url)) {
      return;
    }

    seenUrls.add(top.url);

    try {
      const pageResponse = await fetchWithTimeout(top.url, 8000);
      if (!pageResponse.ok) {
        missingDomains.push(domain);
        return;
      }

      const html = await pageResponse.text();
      const text = extractTextFromHtml(html).slice(0, 1600);
      const excerpt = text || (top.content ?? '').slice(0, 800);

      if (excerpt) {
        sources.push({
          title: top.title ?? top.url,
          url: top.url,
          excerpt,
        });
      } else {
        missingDomains.push(domain);
      }
    } catch {
      missingDomains.push(domain);
    }
  });

  await Promise.all(searchTasks);

  return { sources, missingDomains };
};

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

const parseResearchPlan = (content: string): ResearchPlan => {
  const parsed = extractJsonObject(content) ?? {};
  const researchOutput =
    typeof parsed.research_output === 'string'
      ? parsed.research_output
      : typeof parsed.researchOutput === 'string'
        ? parsed.researchOutput
        : '';
  const rawQueries =
    Array.isArray(parsed.additional_queries)
      ? parsed.additional_queries
      : Array.isArray(parsed.additionalQueries)
        ? parsed.additionalQueries
        : [];
  const additionalQueries = rawQueries
    .filter(item => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean);

  return { researchOutput, additionalQueries };
};

const requestResearchPlan = async (
  baseUrl: string,
  apiKey: string,
  referer: string,
  title: string,
  model: string,
  address: string,
  sources: ResearchSource[],
  missingDomains: string[],
  mode: 'plan' | 'final'
) => {
  const systemMessage: ChatMessage = {
    role: 'system',
    content:
      'You are an expert research analyst for property investors. ' +
      'Return ONLY valid JSON. No markdown fences. No extra text.',
  };

  const userMessage: ChatMessage = {
    role: 'user',
    content:
      `Address: ${address}\n` +
      `Sources: ${JSON.stringify(sources)}\n` +
      `MissingDomains: ${JSON.stringify(missingDomains)}\n\n` +
      'Create a concise investor-ready summary in a uniform format. ' +
      'Use only the provided sources. If details are missing, say "Not available."\n\n' +
      'Return JSON with keys:\n' +
      '- research_output: markdown string with sections in this exact order:\n' +
      '  1) Research Output\n' +
      '  2) Property Snapshot\n' +
      '  3) Market Signals\n' +
      '  4) Rental Indicators\n' +
      '  5) Risks\n' +
      '  6) Due Diligence Checklist\n' +
      '  7) Sources\n' +
      '- additional_queries: array of up to 3 short search queries to fill gaps. ' +
      (mode === 'final'
        ? 'Use an empty array for additional_queries.'
        : 'If nothing else is needed, use an empty array.')
  };

  const content = await fetchOpenRouterReply(baseUrl, apiKey, referer, title, model, [
    systemMessage,
    userMessage,
  ]);

  return parseResearchPlan(content);
};

const runSupplementalResearch = async (
  address: string,
  queries: string[],
  sources: ResearchSource[],
  missingDomains: string[]
): Promise<ResearchResult> => {
  const tavilyKey = Deno.env.get('TAVILY_API_KEY') ?? '';
  if (!tavilyKey) {
    throw new Error('Missing TAVILY_API_KEY.');
  }

  const domains = parseAllowedDomains().slice(0, 8);
  const seenUrls = new Set(sources.map(source => source.url));
  const missing = new Set(missingDomains);

  const tasks = queries.slice(0, 3).flatMap(query => {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    return domains.map(async domain => {
      const searchQuery = `site:${domain} "${address}" ${trimmed}`;
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tavilyKey}`,
        },
        body: JSON.stringify({
          query: searchQuery,
          search_depth: 'basic',
          max_results: 2,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tavily error: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as {
        results?: Array<{ title?: string; url?: string; content?: string }>;
      };

      const matches = (data.results ?? []).filter(result =>
        result.url ? isAllowedDomain(result.url, [domain]) : false
      );

      const top = matches[0];
      if (!top?.url) {
        missing.add(domain);
        return;
      }

      if (seenUrls.has(top.url)) {
        return;
      }

      seenUrls.add(top.url);

      try {
        const pageResponse = await fetchWithTimeout(top.url, 8000);
        if (!pageResponse.ok) {
          missing.add(domain);
          return;
        }

        const html = await pageResponse.text();
        const text = extractTextFromHtml(html).slice(0, 1600);
        const excerpt = text || (top.content ?? '').slice(0, 800);

        if (excerpt) {
          sources.push({
            title: top.title ?? top.url,
            url: top.url,
            excerpt,
          });
        } else {
          missing.add(domain);
        }
      } catch {
        missing.add(domain);
      }
    });
  });

  await Promise.all(tasks);
  return { sources, missingDomains: Array.from(missing) };
};

const buildResearchOutput = async (
  baseUrl: string,
  apiKey: string,
  referer: string,
  title: string,
  model: string,
  address: string,
  onStatus?: (stage: string) => void
) => {
  onStatus?.('Running search');
  const initial = await runResearch(address);
  let researchSources = initial.sources;
  let missingDomains = initial.missingDomains;

  onStatus?.('Summarizing research');
  const plan = await requestResearchPlan(
    baseUrl,
    apiKey,
    referer,
    title,
    model,
    address,
    researchSources,
    missingDomains,
    'plan'
  );

  if (plan.additionalQueries.length) {
    onStatus?.('Expanding search');
    const supplemental = await runSupplementalResearch(
      address,
      plan.additionalQueries,
      researchSources,
      missingDomains
    );
    researchSources = supplemental.sources;
    missingDomains = supplemental.missingDomains;

    onStatus?.('Finalizing research');
    const finalPlan = await requestResearchPlan(
      baseUrl,
      apiKey,
      referer,
      title,
      model,
      address,
      researchSources,
      missingDomains,
      'final'
    );
    return {
      researchOutput: finalPlan.researchOutput || plan.researchOutput,
      sources: researchSources,
      missingDomains,
    };
  }

  return {
    researchOutput: plan.researchOutput,
    sources: researchSources,
    missingDomains,
  };
};

const getRequiredData = (message: string): RequiredData => {
  const text = message.toLowerCase();
  if (isResearchRequest(message)) {
    return { accounts: false, properties: false, transactions: false };
  }
  const requiresTransactions =
    /(transaction|cashflow|expense|income|rent|repayment|statement|ledger)/.test(text);
  const requiresAccounts = /(account|loan|mortgage|offset|balance|rate|interest)/.test(text);
  const requiresProperties = /(property|properties|portfolio|value|equity|address|suburb|yield)/.test(text);

  if (!requiresAccounts && !requiresProperties && !requiresTransactions) {
    return { accounts: true, properties: true, transactions: false };
  }

  return {
    accounts: requiresAccounts,
    properties: requiresProperties,
    transactions: requiresTransactions,
  };
};

const fetchOpenRouterReply = async (
  baseUrl: string,
  apiKey: string,
  referer: string,
  title: string,
  model: string,
  requestMessages: ChatMessage[]
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

  const content = data?.choices?.[0]?.message?.content;
  return content ? stripInternalMarkers(String(content)) : '';
};

const streamOpenRouterReply = async (
  baseUrl: string,
  apiKey: string,
  referer: string,
  title: string,
  model: string,
  requestMessages: ChatMessage[],
  sendEvent: (event: string, data: unknown) => void
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
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter error: ${response.status} ${errorText}`);
  }

  if (!response.body) {
    return await fetchOpenRouterReply(baseUrl, apiKey, referer, title, model, requestMessages);
  }

  sendEvent('status', { stage: 'Drafting response' });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let reply = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const line = part.split('\n').find(item => item.startsWith('data:'));
      if (!line) {
        continue;
      }

      const data = line.replace('data:', '').trim();
      if (!data || data === '[DONE]') {
        continue;
      }

      try {
        const payload = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = payload?.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          reply += delta;
          sendEvent('delta', { content: delta });
        }
      } catch {
        // Ignore malformed data chunks.
      }
    }
  }

  return stripInternalMarkers(reply);
};

const handleStreamingRequest = async (
  message: string,
  messages: ChatMessage[],
  portfolio: PortfolioSnapshot | undefined,
  context: ChatContext | undefined
) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const streamTag = `stream-${Date.now()}`;
      let eventCount = 0;
      let lastStage = '';
      const sendEvent = (event: string, data: unknown) => {
        eventCount += 1;
        if (event === 'status' && typeof data === 'object' && data && 'stage' in data) {
          lastStage = String((data as { stage?: string }).stage ?? '');
        }
        controller.enqueue(encoder.encode(formatSse(event, data)));
        if (event === 'status' || event === 'done' || event === 'error') {
          console.log('Portfolio chat stream event', {
            streamTag,
            event,
            lastStage,
            eventCount,
          });
        }
      };

      try {
        console.log('Portfolio chat stream start', {
          streamTag,
          messageLength: message.length,
          messagesCount: messages.length,
          hasPortfolio: !!portfolio,
          hasContext: !!context,
        });
        sendEvent('status', { stage: 'Analyzing request' });

        const apiKey = Deno.env.get('OPENROUTER_API_KEY') ?? '';
        const baseUrl = Deno.env.get('OPENROUTER_BASE_URL') ?? 'https://openrouter.ai/api/v1';
        const model = Deno.env.get('OPENROUTER_MODEL') ?? 'arcee-ai/trinity-large-preview:free';
        const referer = Deno.env.get('OPENROUTER_REFERER') ?? 'BrickLedgerApp/1.0';
        const title = Deno.env.get('OPENROUTER_TITLE') ?? 'BrickLedger App Portfolio Chat';

        if (!apiKey) {
          console.error('Portfolio chat missing OpenRouter key', { streamTag });
          sendEvent('error', { message: 'Missing OPENROUTER_API_KEY.' });
          controller.close();
          return;
        }

        const wantsResearch = isResearchRequest(message);
        const researchAddress = wantsResearch ? extractResearchAddress(message) : '';
        let researchSources: ResearchSource[] = [];
        let missingDomains: string[] = [];
        let researchOutput = '';

        if (wantsResearch) {
          console.log('Portfolio chat stream research start', { streamTag, researchAddress });
          try {
            const researchResult = await buildResearchOutput(
              baseUrl,
              apiKey,
              referer,
              title,
              model,
              researchAddress,
              stage => sendEvent('status', { stage })
            );
            researchSources = researchResult.sources;
            missingDomains = researchResult.missingDomains;
            researchOutput = researchResult.researchOutput;
            console.log('Portfolio chat stream research done', {
              streamTag,
              sourcesCount: researchSources.length,
              missingDomainsCount: missingDomains.length,
            });
          } catch (error: any) {
            console.error('Portfolio chat stream research failed', {
              streamTag,
              error: error?.message || error,
            });
            sendEvent('error', { message: error?.message || 'Research failed.' });
            controller.close();
            return;
          }
        }

        const portfolioContext = portfolio
          ? `Portfolio Snapshot:\n${JSON.stringify(portfolio)}\n\nData Warnings:\n${JSON.stringify(context?.dataWarnings ?? [])}`
          : 'Portfolio Snapshot: not provided.';

        const researchContext = wantsResearch
          ? `Research Output (summary):\n${researchOutput}\n\nRaw Sources:\n${JSON.stringify({ sources: researchSources, missingDomains })}`
          : '';

        sendEvent('status', { stage: 'Defining strategies' });

        const systemMessage: ChatMessage = {
          role: 'system',
          content:
            'You are PropPilot, an assistant for property investors. ' +
            'Use only the portfolio snapshot provided in the context. ' +
            'If information is missing, explain what is missing and suggest next steps. ' +
            'Respond all money values in AUD (after conversion at current market rate as required) unless the user explicitly asks for another currency in their prompt. ' +
            'Never fabricate transactions or values that are not in the snapshot. ' +
            (wantsResearch
              ? 'Use only the web research snippets provided and cite sources in a Sources section with links. ' +
                'Focus on estimated price, estimated rent, land size, last sold price, build year, and any comparable sales or yield indicators when available. ' +
                'Provide a detailed investor assessment covering location context, market signals, rental indicators, risks, and a due-diligence checklist. ' +
                'If a requested detail is not in the sources, say it is not available.\n\n'
              : '\n\n') +
            portfolioContext +
            (researchContext ? `\n\n${researchContext}` : ''),
        };

        if (wantsResearch) {
          if (!researchOutput) {
            sendEvent('error', { message: 'Research summary unavailable.' });
            controller.close();
            return;
          }
          sendEvent('done', { reply: stripInternalMarkers(researchOutput) });
          return;
        }

        const requestMessages: ChatMessage[] = [
          systemMessage,
          ...messages,
          { role: 'user', content: message },
        ];

        console.log('Portfolio chat stream OpenRouter request', {
          streamTag,
          model,
          requestMessagesCount: requestMessages.length,
          wantsResearch,
        });

        const reply = await streamOpenRouterReply(
          baseUrl,
          apiKey,
          referer,
          title,
          model,
          requestMessages,
          sendEvent
        );

        console.log('Portfolio chat stream OpenRouter done', {
          streamTag,
          replyLength: reply.length,
        });

        sendEvent('done', { reply: stripInternalMarkers(reply) });
      } catch (error: any) {
        console.error('Portfolio chat stream failed', {
          streamTag,
          error: error?.message || error,
          lastStage,
          eventCount,
        });
        sendEvent('error', { message: error?.message || 'Unexpected error.' });
      } finally {
        console.log('Portfolio chat stream closed', {
          streamTag,
          lastStage,
          eventCount,
        });
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: streamHeaders });
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ChatRequest;
    const { message, messages = [], portfolio, context, mode, stream } = body || {};

    console.log('Portfolio chat request', {
      hasMessage: !!message,
      messageLength: message?.length ?? 0,
      messagesCount: messages.length,
      mode,
      stream,
      hasPortfolio: !!portfolio,
      hasContext: !!context,
    });

    if (!message) {
      return new Response(JSON.stringify({ error: 'Missing message.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'requirements') {
      console.log('Portfolio chat requirements mode');
      const required = getRequiredData(message);
      console.log('Portfolio chat requirements result', required);
      return new Response(JSON.stringify({ required }), {
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (stream) {
      console.log('Portfolio chat streaming mode enabled');
      return await handleStreamingRequest(message, messages, portfolio, context);
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY') ?? '';
    const baseUrl = Deno.env.get('OPENROUTER_BASE_URL') ?? 'https://openrouter.ai/api/v1';
    const model = Deno.env.get('OPENROUTER_MODEL') ?? 'arcee-ai/trinity-large-preview:free';
    const referer = Deno.env.get('OPENROUTER_REFERER') ?? 'BrickLedgerApp/1.0';
    const title = Deno.env.get('OPENROUTER_TITLE') ?? 'BrickLedger App Portfolio Chat';


    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing OPENROUTER_API_KEY.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const wantsResearch = isResearchRequest(message);
    console.log('Portfolio chat research check', { wantsResearch });
    const researchAddress = wantsResearch ? extractResearchAddress(message) : '';
    let researchSources: ResearchSource[] = [];
    let missingDomains: string[] = [];

    let researchOutput = '';

    if (wantsResearch) {
      console.log('Portfolio chat research started');
      try {
        const researchResult = await buildResearchOutput(
          baseUrl,
          apiKey,
          referer,
          title,
          model,
          researchAddress
        );
        researchSources = researchResult.sources;
        missingDomains = researchResult.missingDomains;
        researchOutput = researchResult.researchOutput;
        console.log('Portfolio chat research completed', {
          sourcesCount: researchSources.length,
          missingDomainsCount: missingDomains.length,
        });
      } catch (error: any) {
        console.error('Portfolio chat research failed', { error: error?.message || error });
        return new Response(JSON.stringify({ error: error?.message || 'Research failed.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const portfolioContext = portfolio
      ? `Portfolio Snapshot:\n${JSON.stringify(portfolio)}\n\nData Warnings:\n${JSON.stringify(context?.dataWarnings ?? [])}`
      : 'Portfolio Snapshot: not provided.';

    const researchContext = wantsResearch
      ? `Research Output (summary):\n${researchOutput}\n\nRaw Sources:\n${JSON.stringify({ sources: researchSources, missingDomains })}`
      : '';

    const systemMessage: ChatMessage = {
      role: 'system',
      content:
        'You are PropPilot, an assistant for property investors. ' +
        'Use only the portfolio snapshot provided in the context. ' +
        'If information is missing, explain what is missing and suggest next steps. ' +
        'Respond all money values in AUD (after conversion at current market rate as required) unless the user explicitly asks for another currency in their prompt. ' +
        'Never fabricate transactions or values that are not in the snapshot. ' +
        (wantsResearch
          ? 'Use only the web research snippets provided and cite sources in a Sources section with links. ' +
            'Focus on estimated price, estimated rent, land size, last sold price, build year, and any comparable sales or yield indicators when available. ' +
            'Provide a detailed investor assessment covering location context, market signals, rental indicators, risks, and a due-diligence checklist. ' +
            'If a requested detail is not in the sources, say it is not available.\n\n'
          : '\n\n') +
        portfolioContext +
        (researchContext ? `\n\n${researchContext}` : ''),
    };

    if (wantsResearch) {
      if (!researchOutput) {
        return new Response(JSON.stringify({ error: 'Research summary unavailable.' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ reply: stripInternalMarkers(researchOutput) }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestMessages: ChatMessage[] = [
      systemMessage,
      ...messages,
      { role: 'user', content: message },
    ];

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
        messages: requestMessages
      }),
    });
    // log raw response for debugging
    console.log('OpenRouter response', {
      status: response.status,
      statusText: response.statusText,
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter error', {
        status: response.status,
        statusText: response.statusText,
        errorText,
      });
      return new Response(JSON.stringify({ error: errorText || 'OpenRouter request failed.' }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    const cleanedReply = reply ? stripInternalMarkers(reply) : '';

    if (!cleanedReply) {
      return new Response(JSON.stringify({ error: 'Empty response from model.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ reply: cleanedReply }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    const errorMessage = error?.message || String(error) || 'Unexpected error.';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
