import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from '@/lib/supabase';
import { Logger } from '@/lib/logger';

type ChatRole = 'system' | 'user' | 'assistant';
type ChatMode = 'requirements' | 'research' | 'chat' | 'chat-stream';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface PortfolioSnapshot {
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
}

export interface ChatContext {
  userId: string;
  dataWarnings: string[];
}

export interface RequiredData {
  accounts: boolean;
  properties: boolean;
  transactions: boolean;
}

export interface ChatStatusEvent {
  stage: string;
}

const EDGE_FUNCTION_NAME = 'portfolio-chat';

const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/${EDGE_FUNCTION_NAME}`;
const STREAM_CONTENT_TYPE = 'text/event-stream';
const DEFAULT_STAGE = 'Thinking';

const normalizeStage = (stage: string) => {
  const trimmed = stage.trim();
  if (!trimmed) return DEFAULT_STAGE;
  return trimmed.length > 64 ? `${trimmed.slice(0, 61)}...` : trimmed;
};

const scheduleStages = (
  stages: Array<{ stage: string; delayMs: number }>,
  onStatus?: (status: ChatStatusEvent) => void
) => {
  const timers: Array<ReturnType<typeof setTimeout>> = [];
  stages.forEach(({ stage, delayMs }) => {
    timers.push(
      setTimeout(() => {
        onStatus?.({ stage: normalizeStage(stage) });
      }, delayMs)
    );
  });

  return () => timers.forEach(timerId => clearTimeout(timerId));
};
export const isResearchRequest = (message: string) => {
  const trimmed = message.trim();
  const keywordMatch = /(do\s+)?research\s+on|property\s+research|investor\s+assessment|analyse\s+address|analyze\s+address/i.test(
    trimmed
  );
  if (!keywordMatch) {
    return false;
  }

  const addressMatch = trimmed.match(/research\s+on\s+(.+)/i);
  if (addressMatch?.[1]?.trim()) {
    return true;
  }

  const cleaned = trimmed.replace(/(do\s+)?research\s+on/i, '').trim();
  return cleaned.split(/\s+/).length >= 2;
};

export async function getRequiredPortfolioData(message: string, messages: ChatMessage[]) {
  const transactionId = Logger.createTransactionId();
  Logger.info('getRequiredPortfolioData called', { message }, 'portfolioChat.ts', transactionId);

  const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_NAME, {
    body: {
      message,
      messages,
      mode: 'requirements',
    },
  });

  if (error) {
    Logger.warn('Portfolio chat requirement check failed', { error }, 'portfolioChat.ts', transactionId);
    return { accounts: true, properties: true, transactions: false } as RequiredData;
  }

  return (data?.required ?? { accounts: true, properties: true, transactions: false }) as RequiredData;
}

export async function sendPortfolioChatMessage(
  message: string,
  messages: ChatMessage[],
  portfolio: PortfolioSnapshot,
  context: ChatContext,
  mode: ChatMode = 'chat'
) {
  const transactionId = Logger.createTransactionId();
  Logger.info('sendPortfolioChatMessage called', { message: message }, 'portfolioChat.ts', transactionId);

  const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_NAME, {
    body: {
      message,
      messages,
      portfolio,
      context,
      mode,
    },
  });

  if (error) {
    const contextResponse = (error as { context?: unknown })?.context as
      | { status?: number; statusText?: string; text?: () => Promise<string> }
      | undefined;
    let detailedMessage = error.message || 'Edge function error';

    if (contextResponse?.text) {
      try {
        const responseText = await contextResponse.text();
        if (responseText) {
          const parsed = JSON.parse(responseText) as { error?: string };
          detailedMessage = parsed?.error || responseText;
        }
      } catch {
        // Ignore parse errors and keep the default message.
      }
    }

    Logger.error(
      'Portfolio chat edge function failed',
      {
        error,
        status: contextResponse?.status,
        statusText: contextResponse?.statusText,
        detailedMessage,
      },
      'portfolioChat.ts',
      transactionId
    );
    throw new Error(detailedMessage);
  }

  const reply = data?.reply || data?.message || data?.content;
  if (!reply) {
    Logger.warn('Portfolio chat edge function returned empty reply', { data }, 'portfolioChat.ts', transactionId);
    return 'I could not generate a response right now. Please try again.';
  }

  return String(reply);
}

export async function sendPortfolioChatMessageStream(
  message: string,
  messages: ChatMessage[],
  portfolio: PortfolioSnapshot,
  context: ChatContext,
  handlers?: {
    onStatus?: (status: ChatStatusEvent) => void;
  }
) {
  const transactionId = Logger.createTransactionId();
  Logger.info('sendPortfolioChatMessageStream called', { message: message }, 'portfolioChat.ts', transactionId);

  const emitStatus = (stage: string) => {
    handlers?.onStatus?.({ stage: normalizeStage(stage) });
  };

  const wantsResearch = isResearchRequest(message);
  if (wantsResearch) {
    emitStatus('Analyzing request');
    const cancelStages = scheduleStages(
      [
        { stage: 'Running search', delayMs: 600 },
        { stage: 'Summarizing research', delayMs: 1800 },
        { stage: 'Finalizing research', delayMs: 2800 },
      ],
      handlers?.onStatus
    );

    try {
      const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_NAME, {
        body: {
          message,
          messages,
          portfolio,
          context,
          mode: 'research',
        },
      });

      if (error) {
        Logger.error('Portfolio research failed', { error }, 'portfolioChat.ts', transactionId);
        throw error;
      }

      const reply = data?.reply || data?.message || data?.content;
      if (!reply) {
        Logger.warn('Portfolio research returned empty reply', { data }, 'portfolioChat.ts', transactionId);
        return 'I could not generate a response right now. Please try again.';
      }

      return String(reply);
    } finally {
      cancelStages();
    }
  }

  Logger.info(
    'sendPortfolioChatMessageStream payload',
    {
      messageLength: message.length,
      messagesCount: messages.length,
      accountsCount: portfolio.accounts.length,
      propertiesCount: portfolio.properties.length,
      transactionsCount: portfolio.transactions.length,
      dataWarningsCount: context.dataWarnings.length,
    },
    'portfolioChat.ts',
    transactionId
  );

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: STREAM_CONTENT_TYPE,
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      message,
      messages,
      portfolio,
      context,
      stream: true,
      mode: 'chat-stream',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    Logger.error(
      'sendPortfolioChatMessageStream response error',
      { status: response.status, errorText },
      'portfolioChat.ts',
      transactionId
    );
    throw new Error(errorText || 'Edge function error');
  }

  const contentType = response.headers.get('content-type') ?? '';
  Logger.info(
    'sendPortfolioChatMessageStream response headers',
    { contentType },
    'portfolioChat.ts',
    transactionId
  );
  const hasStream =
    contentType.includes(STREAM_CONTENT_TYPE) &&
    response.body &&
    typeof response.body.getReader === 'function';
  Logger.info(
    'sendPortfolioChatMessageStream stream support',
    { hasStream },
    'portfolioChat.ts',
    transactionId
  );
  if (!hasStream) {
    const cancelStages = scheduleStages(
      [
        { stage: 'Analyzing request', delayMs: 0 },
        { stage: 'Defining strategies', delayMs: 900 },
        { stage: 'Drafting response', delayMs: 2400 },
      ],
      handlers?.onStatus
    );

    Logger.info(
      'sendPortfolioChatMessageStream fallback to non-stream',
      {},
      'portfolioChat.ts',
      transactionId
    );
    try {
      return await sendPortfolioChatMessage(message, messages, portfolio, context, 'chat');
    } finally {
      cancelStages();
    }
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let reply = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, '\n');
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const lines = part.split('\n');
      let eventName = 'message';
      const dataLines: string[] = [];

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith(':')) {
          continue;
        }
        if (line.startsWith('event:')) {
          eventName = line.replace('event:', '').trim();
          continue;
        }
        if (line.startsWith('data:')) {
          dataLines.push(line.replace('data:', '').trim());
        }
      }

      if (!dataLines.length) {
        continue;
      }

      const dataLine = dataLines.join('\n');
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(dataLine) as Record<string, unknown>;
      } catch {
        payload = { message: dataLine };
      }

      const inferredEvent = String(payload.event ?? eventName);
      Logger.info(
        'sendPortfolioChatMessageStream event',
        { inferredEvent, payloadKeys: Object.keys(payload) },
        'portfolioChat.ts',
        transactionId
      );

      if (inferredEvent === 'status') {
        const stage = String(payload.stage ?? payload.status ?? 'Thinking');
        Logger.info(
          'sendPortfolioChatMessageStream status',
          { stage },
          'portfolioChat.ts',
          transactionId
        );
        handlers?.onStatus?.({ stage: normalizeStage(stage) });
      }

      if (inferredEvent === 'delta') {
        const delta = String(payload.content ?? '');
        if (delta) {
          reply += delta;
        }
      }

      if (inferredEvent === 'done') {
        const finalReply = String(payload.reply ?? reply);
        Logger.info(
          'sendPortfolioChatMessageStream done',
          { replyLength: finalReply.length },
          'portfolioChat.ts',
          transactionId
        );
        return finalReply;
      }

      if (inferredEvent === 'error') {
        const messageText = String(payload.message ?? 'Edge function error');
        throw new Error(messageText);
      }
    }
  }

  if (reply) {
    return reply;
  }

  throw new Error('Edge function stream ended without reply.');
}
