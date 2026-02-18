import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import Markdown from 'react-native-markdown-display';
import { getColors } from '@/styles/GlobalStyles';
import { Logger } from '@/lib/logger';
import { getCurrentUser } from '@/lib/supabase/auth';
import {
  ChatMessage,
  PortfolioSnapshot,
  sendPortfolioChatMessageStream,
} from '@/lib/ai/portfolioChat';
import { analyzePortfolioDocument } from '@/lib/ai/documentInsights';

type DisplayMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

interface AskAIChatProps {
  loadPortfolioForPrompt: (
    message: string,
    history: ChatMessage[]
  ) => Promise<{ portfolio: PortfolioSnapshot; warnings: string[]; userId: string }>;
}

const MAX_HISTORY = 10;
const MAX_FILE_BYTES = 6 * 1024 * 1024;

export function AskAIChat({ loadPortfolioForPrompt }: AskAIChatProps) {
  const colors = getColors('light');
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I am PropPilot. I can answer portfolio questions, analyze accounts/properties/transactions, run property research, and review uploaded documents (statements, notices) to map them to your portfolio.',
      createdAt: new Date().toISOString(),
    },
  ]);
  const loadingMessageId = useRef<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputOffset = useRef(new Animated.Value(0)).current;
  const [dataWarnings, setDataWarnings] = useState<string[]>([]);
  const thinkingPulse = useRef(new Animated.Value(0)).current;
  const [thinkingStage, setThinkingStage] = useState('Thinking');
  const [thinkingDots, setThinkingDots] = useState('');
  const debugTag = useRef(`AskAIChat-${Date.now()}`).current;
  const [userInitials, setUserInitials] = useState('ME');
  const isBusy = sending || uploading;

  const normalizeStage = (stage: string) => {
    const trimmed = stage.trim();
    if (!trimmed) return 'Thinking';
    return trimmed.length > 64 ? `${trimmed.slice(0, 61)}...` : trimmed;
  };

  const thinkingEmoji = useMemo(() => {
    const stage = thinkingStage.toLowerCase();
    if (stage.includes('gather') || stage.includes('portfolio')) return '🧾';
    if (stage.includes('analy') || stage.includes('understand')) return '🔎';
    if (stage.includes('search') || stage.includes('research')) return '🧭';
    if (stage.includes('strateg')) return '🧠';
    if (stage.includes('draft') || stage.includes('write')) return '✍️';
    return '🤖';
  }, [thinkingStage]);

  const getUserInitials = () => userInitials;

  const handleLinkPress = (url: string) => {
    Linking.openURL(url).catch(error => {
      Logger.warn('AskAIChat link open failed', { url, error }, 'AskAIChat.tsx');
    });
    return true;
  };

  const resetChat = () => {
    Logger.info('AskAIChat reset', { debugTag }, 'AskAIChat.tsx');
    loadingMessageId.current = null;
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hi! I am PropPilot. Ask me anything about your portfolio, and I will use your accounts, properties, and transactions data to help.',
        createdAt: new Date().toISOString(),
      },
    ]);
    setInput('');
    setDataWarnings([]);
  };

  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        const username = user?.user_metadata?.username || user?.user_metadata?.full_name || user?.email || '';
        const trimmed = username.trim();
        const parts = trimmed.split(/\s+/).filter(Boolean);
        let initials = '';
        if (parts.length >= 2) {
          initials = `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`;
        } else if (trimmed.length >= 2) {
          initials = trimmed.slice(0, 2);
        } else {
          initials = trimmed;
        }
        const normalized = initials.toUpperCase() || 'ME';
        setUserInitials(normalized);
      } catch (error) {
        Logger.warn('AskAIChat user initials fetch failed', { error }, 'AskAIChat.tsx');
      }
    })();
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, event => {
      const height = event.endCoordinates?.height ?? 0;
      Animated.timing(inputOffset, {
        toValue: -height + 8,
        duration: event.duration ?? 250,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, event => {
      Animated.timing(inputOffset, {
        toValue: 0,
        duration: event.duration ?? 200,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [inputOffset]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(thinkingPulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(thinkingPulse, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [thinkingPulse]);

  useEffect(() => {
    if (!isBusy) {
      setThinkingStage('Thinking');
      setThinkingDots('');
      return;
    }

    const interval = setInterval(() => {
      setThinkingDots(prev => (prev.length >= 3 ? '' : `${prev}.`));
    }, 350);

    return () => clearInterval(interval);
  }, [isBusy]);

  const dataBanner = dataWarnings.length ? dataWarnings.join(' ') : '';

  const buildHistory = () =>
    messages
      .filter(msg => msg.id !== 'welcome')
      .slice(-MAX_HISTORY)
      .map<ChatMessage>(msg => ({ role: msg.role, content: msg.content }));

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isBusy) {
      Logger.info(
        'AskAIChat send blocked',
        { debugTag, hasText: !!trimmed, sending, uploading },
        'AskAIChat.tsx'
      );
      return;
    }

    const transactionId = Logger.createTransactionId();
    const newUserMessage: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    const loadingId = `assistant-loading-${Date.now()}`;
    loadingMessageId.current = loadingId;
    Logger.info(
      'AskAIChat send started',
      { debugTag, loadingId, messageLength: trimmed.length },
      'AskAIChat.tsx',
      transactionId
    );
    const loadingMessage: DisplayMessage = {
      id: loadingId,
      role: 'assistant',
      content: 'Thinking...',
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newUserMessage, loadingMessage]);
    setInput('');
    setSending(true);
    setThinkingStage('Gathering required portfolio data');
    Logger.info('AskAIChat stage', { debugTag, stage: 'Gathering required portfolio data' }, 'AskAIChat.tsx', transactionId);

    try {
      const history = buildHistory();
      Logger.info(
        'AskAIChat history ready',
        { debugTag, historyCount: history.length },
        'AskAIChat.tsx',
        transactionId
      );

      const { portfolio, warnings, userId } = await loadPortfolioForPrompt(trimmed, history);
      setDataWarnings(warnings);
      Logger.info(
        'AskAIChat portfolio loaded',
        {
          debugTag,
          warningsCount: warnings.length,
          userIdPresent: !!userId,
          accountsCount: portfolio.accounts.length,
          propertiesCount: portfolio.properties.length,
          transactionsCount: portfolio.transactions.length,
        },
        'AskAIChat.tsx',
        transactionId
      );

      setThinkingStage('Understanding the ask');
      Logger.info('AskAIChat stage', { debugTag, stage: 'Understanding the ask' }, 'AskAIChat.tsx', transactionId);

      const reply = await sendPortfolioChatMessageStream(
        trimmed,
        [...history, { role: 'user', content: trimmed }],
        portfolio,
        { userId, dataWarnings: warnings },
        {
          onStatus: ({ stage }) => {
            Logger.info('AskAIChat status event', { debugTag, stage }, 'AskAIChat.tsx', transactionId);
            setThinkingStage(normalizeStage(stage));
          },
        }
      );

      setThinkingStage('Drafting response');
      Logger.info('AskAIChat stage', { debugTag, stage: 'Drafting response' }, 'AskAIChat.tsx', transactionId);

      setMessages(prev => {
        const filtered = prev.filter(message => message.id !== loadingId);
        return [
          ...filtered,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: reply,
            createdAt: new Date().toISOString(),
          },
        ];
      });
      Logger.info(
        'AskAIChat reply stored',
        { debugTag, replyLength: reply.length },
        'AskAIChat.tsx',
        transactionId
      );
      setThinkingStage('Thinking');
    } catch (error: any) {
      Logger.error('AskAIChat send failed', { error }, 'AskAIChat.tsx', transactionId);
      setMessages(prev => {
        const filtered = prev.filter(message => message.id !== loadingId);
        return [
          ...filtered,
          {
            id: `assistant-error-${Date.now()}`,
            role: 'assistant',
            content: 'I had trouble reaching the AI service. Please try again in a moment.',
            createdAt: new Date().toISOString(),
          },
        ];
      });
      setThinkingStage('Thinking');
    } finally {
      Logger.info('AskAIChat send finished', { debugTag }, 'AskAIChat.tsx', transactionId);
      setSending(false);
      loadingMessageId.current = null;
    }
  };

  const handleDocumentUpload = async () => {
    if (isBusy) {
      return;
    }

    const transactionId = Logger.createTransactionId();
    Logger.info('AskAIChat document upload started', { debugTag }, 'AskAIChat.tsx', transactionId);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) {
        Logger.info('AskAIChat document upload canceled', { debugTag }, 'AskAIChat.tsx', transactionId);
        return;
      }

      const asset = result.assets[0];
      if (asset.size && asset.size > MAX_FILE_BYTES) {
        setMessages(prev => [
          ...prev,
          {
            id: `assistant-upload-error-${Date.now()}`,
            role: 'assistant',
            content: 'That file is too large for analysis right now. Please upload a file under 6MB.',
            createdAt: new Date().toISOString(),
          },
        ]);
        return;
      }

      setUploading(true);
      const base64Encoding = FileSystem.EncodingType?.Base64 ?? 'base64';
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: base64Encoding,
      });

      const uploadMessage: DisplayMessage = {
        id: `user-upload-${Date.now()}`,
        role: 'user',
        content: `Uploaded document: ${asset.name ?? 'document'}`,
        createdAt: new Date().toISOString(),
      };
      const loadingId = `assistant-upload-loading-${Date.now()}`;
      loadingMessageId.current = loadingId;
      const loadingMessage: DisplayMessage = {
        id: loadingId,
        role: 'assistant',
        content: 'Analyzing document...',
        createdAt: new Date().toISOString(),
      };

      setMessages(prev => [...prev, uploadMessage, loadingMessage]);
      setThinkingStage('Analyzing document');

      const history = buildHistory();
      const { portfolio, warnings, userId } = await loadPortfolioForPrompt(
        'Analyze uploaded rental statement document and map it to the portfolio.',
        history
      );
      setDataWarnings(warnings);

      const analysis = await analyzePortfolioDocument(
        {
          name: asset.name ?? 'document',
          mimeType: asset.mimeType ?? 'application/octet-stream',
          base64,
        },
        portfolio,
        { userId, dataWarnings: warnings },
        'rental-statement'
      );

      setMessages(prev => {
        const filtered = prev.filter(message => message.id !== loadingId);
        return [
          ...filtered,
          {
            id: `assistant-upload-${Date.now()}`,
            role: 'assistant',
            content: analysis.reply,
            createdAt: new Date().toISOString(),
          },
        ];
      });
      setThinkingStage('Thinking');
    } catch (error: any) {
      Logger.error(
        'AskAIChat document upload failed',
        { errorMessage: error?.message || String(error) },
        'AskAIChat.tsx',
        transactionId
      );
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-upload-error-${Date.now()}`,
          role: 'assistant',
          content: error?.message
            ? `I could not analyze that document right now: ${error.message}`
            : 'I could not analyze that document right now. Please try again.',
          createdAt: new Date().toISOString(),
        },
      ]);
      setThinkingStage('Thinking');
    } finally {
      Logger.info('AskAIChat document upload finished', { debugTag }, 'AskAIChat.tsx', transactionId);
      setUploading(false);
      loadingMessageId.current = null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
    >
      {!!dataBanner && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{dataBanner}</Text>
        </View>
      )}
      <View style={styles.actionsRow}>
        <Pressable style={styles.newChatButton} onPress={resetChat} disabled={isBusy}>
          <Text style={styles.newChatText}>New chat</Text>
        </Pressable>
        <Pressable style={styles.uploadButton} onPress={handleDocumentUpload} disabled={isBusy}>
          <Text style={styles.uploadText}>{uploading ? 'Uploading...' : 'Upload'}</Text>
        </Pressable>
      </View>
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const isLoading =
            item.id.startsWith('assistant-loading-') || item.id.startsWith('assistant-upload-loading-');
          return (
            <View style={[styles.messageRow, item.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant]}>
              {item.role === 'assistant' && (
                <View style={[styles.avatar, styles.avatarAssistant]}>
                  <Text style={styles.avatarText}>🤖</Text>
                </View>
              )}
              <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
                {isLoading ? (
                  <View style={styles.thinkingRow}>
                    <Animated.Text
                      style={[
                        styles.thinkingEmoji,
                        {
                          opacity: thinkingPulse.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.4, 1],
                          }),
                          transform: [
                            {
                              scale: thinkingPulse.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.9, 1.1],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      {thinkingEmoji}
                    </Animated.Text>
                    <Text style={styles.bubbleText}>{`${thinkingStage}${thinkingDots}`}</Text>
                  </View>
                ) : (
                  item.role === 'assistant' ? (
                    <Markdown style={styles.markdown} onLinkPress={handleLinkPress}>
                      {item.content}
                    </Markdown>
                  ) : (
                    <Text style={[styles.bubbleText, styles.bubbleTextUser]}>{item.content}</Text>
                  )
                )}
              </View>
              {item.role === 'user' && (
                <View style={[styles.avatar, styles.avatarUser]}>
                  <Text style={[styles.avatarText, styles.avatarTextUser]}>{getUserInitials()}</Text>
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
      />
      <Animated.View style={[styles.inputRow, { transform: [{ translateY: inputOffset }] }]}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your portfolio"
          placeholderTextColor={colors.disabledText}
          style={styles.input}
          multiline
        />
        <Pressable style={[styles.sendButton, isBusy && styles.sendButtonDisabled]} onPress={sendMessage} disabled={isBusy}>
          {sending ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.sendText}>Send</Text>}
        </Pressable>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    banner: {
      backgroundColor: colors.secondaryContainer,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
    },
    bannerText: {
      color: colors.onSecondaryContainer,
      fontSize: 13,
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 8,
      gap: 8,
    },
    newChatButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.surfaceVariant,
      backgroundColor: colors.surface,
    },
    newChatText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '600',
    },
    uploadButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.outline,
      backgroundColor: colors.surface,
    },
    uploadText: {
      color: colors.onSurface,
      fontSize: 12,
      fontWeight: '600',
    },
    listContent: {
      paddingBottom: 16,
    },
    messageRow: {
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    messageRowUser: {
      justifyContent: 'flex-end',
    },
    messageRowAssistant: {
      justifyContent: 'flex-start',
    },
    bubble: {
      maxWidth: '90%',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 16,
    },
    bubbleUser: {
      backgroundColor: colors.primary,
    },
    bubbleAssistant: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceVariant,
    },
    bubbleText: {
      color: colors.onSurface,
      fontSize: 15,
      lineHeight: 20,
    },
    bubbleTextUser: {
      color: colors.onPrimary,
    },
    avatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.surfaceVariant,
      backgroundColor: colors.surface,
    },
    avatarUser: {
      borderColor: colors.surfaceVariant,
      backgroundColor: colors.surface,
    },
    avatarAssistant: {
      borderColor: colors.surfaceVariant,
      backgroundColor: colors.surface,
    },
    avatarText: {
      fontSize: 13,
      color: colors.onSurface,
      fontWeight: '700',
    },
    avatarTextUser: {
      color: colors.onSurface,
    },
    markdown: {
      body: {
        color: colors.onSurface,
        fontSize: 15,
        lineHeight: 20,
      },
      heading1: {
        fontSize: 20,
        lineHeight: 26,
        marginTop: 10,
        marginBottom: 6,
        fontWeight: '700',
      },
      heading2: {
        fontSize: 18,
        lineHeight: 24,
        marginTop: 10,
        marginBottom: 6,
        fontWeight: '700',
      },
      heading3: {
        fontSize: 16,
        lineHeight: 22,
        marginTop: 8,
        marginBottom: 4,
        fontWeight: '700',
      },
      heading4: {
        fontSize: 15,
        lineHeight: 21,
        marginTop: 8,
        marginBottom: 4,
        fontWeight: '700',
      },
      heading5: {
        fontSize: 15,
        lineHeight: 21,
        marginTop: 6,
        marginBottom: 4,
        fontWeight: '700',
      },
      heading6: {
        fontSize: 14,
        lineHeight: 20,
        marginTop: 6,
        marginBottom: 4,
        fontWeight: '700',
      },
      strong: {
        fontWeight: '700',
      },
      em: {
        fontStyle: 'italic',
      },
      link: {
        color: colors.primary,
        textDecorationLine: 'underline',
      },
      paragraph: {
        marginTop: 0,
        marginBottom: 8,
      },
      bullet_list: {
        marginBottom: 6,
      },
      ordered_list: {
        marginBottom: 6,
      },
      list_item: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
      },
      bullet_list_icon: {
        marginRight: 6,
        lineHeight: 20,
      },
      bullet_list_content: {
        flex: 1,
      },
      blockquote: {
        borderLeftWidth: 3,
        borderLeftColor: colors.outlineVariant ?? colors.outline,
        paddingLeft: 10,
        marginVertical: 6,
      },
    },
    thinkingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    thinkingEmoji: {
      fontSize: 16,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: 14,
      padding: 12,
      minHeight: 44,
      maxHeight: 120,
      backgroundColor: colors.surface,
      color: colors.onSurface,
    },
    sendButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    sendText: {
      color: colors.onPrimary,
      fontWeight: '700',
    },
  });
