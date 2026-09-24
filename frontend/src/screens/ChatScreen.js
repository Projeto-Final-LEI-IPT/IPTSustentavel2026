import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import api from '../services/api';

export default function ChatScreen({ route, navigation }) {
  const { recipientId, recipientName, articleId, articleTitle } = route.params;

  const [currentUserId, setCurrentUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const flatListRef = useRef(null);
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets(); // Obtém a altura da barra do Android

  useEffect(() => {
    navigation.setOptions({
      title: recipientName || 'Mensagens'
    });

    const initUser = async () => {
      try {
        const id = await AsyncStorage.getItem('userId');
        if (id) setCurrentUserId(Number(id));
      } catch (err) {
        console.error('Erro ao ler userId da sessão:', err);
      }
    };
    initUser();
  }, [navigation, recipientName]);

  const fetchMessages = useCallback(async (userId) => {
    try {
      const response = await api.get('/mensagens');
      const allMessages = response.data || [];

      // Filtra TODAS as mensagens trocadas com esta pessoa, independentemente do artigo_id
      const conversation = allMessages.filter(msg => {
        const isFromMeToPartner =
          Number(msg.remetente_id) === Number(userId) &&
          Number(msg.destinatario_id || msg.destinatario?.id) === Number(recipientId);

        const isFromPartnerToMe =
          Number(msg.remetente_id) === Number(recipientId) &&
          Number(msg.destinatario_id || msg.destinatario?.id) === Number(userId);

        return isFromMeToPartner || isFromPartnerToMe;
      });

      conversation.sort((a, b) => new Date(a.data) - new Date(b.data));
      setMessages(conversation);
    } catch (err) {
      console.error('Erro ao obter mensagens:', err);
    } finally {
      setLoading(false);
    }
  }, [recipientId]);

  const markAsRead = useCallback(async () => {
    try {
      await api.put(`/mensagens/marcar-lidas/${recipientId}`);
    } catch (err) {
      console.warn('Erro ao marcar mensagens como lidas:', err.message);
    }
  }, [recipientId]);

  useEffect(() => {
    if (currentUserId) {
      fetchMessages(currentUserId);
      markAsRead();

      const interval = setInterval(() => {
        fetchMessages(currentUserId);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [currentUserId, fetchMessages, markAsRead]);

  const handleSendMessage = async () => {
    const textToSend = inputText.trim();
    if (!textToSend || sending || !currentUserId) return;

    try {
      setSending(true);

      let finalContent = textToSend;
      if (messages.length === 0 && articleTitle) {
        finalContent = `Artigo: ${articleTitle} | ${textToSend}`;
      }

      const payload = {
        conteudo: finalContent,
        remetente_id: currentUserId,
        destinatario_id: Number(recipientId),
        artigo_id: articleId ? Number(articleId) : null,
        lida: 0
      };

      const response = await api.post('/mensagens', payload);

      const novaMensagem = response.data || {
        id: Date.now(),
        conteudo: finalContent,
        remetente_id: currentUserId,
        destinatario_id: Number(recipientId),
        data: new Date().toISOString(),
        lida: 0
      };

      setMessages(prev => [...prev, novaMensagem]);
      setInputText('');

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setSending(false);
    }
  };

  const renderMessageItem = ({ item }) => {
    const isMine = Number(item.remetente_id) === Number(currentUserId);

    const timeString = item.data
      ? new Date(item.data).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    const hasArticlePrefix = item.conteudo && item.conteudo.includes('|');
    const articlePart = hasArticlePrefix ? item.conteudo.split('|')[0].trim() : null;
    const textPart = hasArticlePrefix ? item.conteudo.split('|')[1].trim() : item.conteudo;

    return (
      <View style={[styles.bubbleRow, isMine ? styles.myBubbleRow : styles.theirBubbleRow]}>
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
          {hasArticlePrefix && (
            <View style={styles.articleBadgeInChat}>
              <Ionicons name="pricetag" size={11} color={isMine ? '#d4edda' : '#2e7d32'} style={{ marginRight: 4 }} />
              <Text style={[styles.articleBadgeText, isMine ? styles.articleBadgeTextMine : styles.articleBadgeTextTheir]}>
                {articlePart}
              </Text>
            </View>
          )}

          <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>
            {textPart}
          </Text>

          <View style={styles.timeRow}>
            <Text style={[styles.timeText, isMine ? styles.myTimeText : styles.theirTimeText]}>
              {timeString}
            </Text>
            {isMine && (
              <Ionicons
                name={item.lida ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={item.lida ? '#90caf9' : 'rgba(255,255,255,0.7)'}
                style={{ marginLeft: 3 }}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2e7d32" />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        {/* Banner do Artigo */}
        {articleTitle && (
          <View style={styles.articleBanner}>
            <Ionicons name="cube-outline" size={16} color="#2e7d32" />
            <Text style={styles.articleBannerText} numberOfLines={1}>
              Artigo em conversa: <Text style={styles.articleBannerBold}>{articleTitle}</Text>
            </Text>
          </View>
        )}

        {/* Lista de Mensagens */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2e7d32" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>Sem mensagens. Diz olá para iniciar a conversa!</Text>
              </View>
            }
          />
        )}

        {/* Caixa de Entrada com compensação da barra de navegação */}
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TextInput
            style={styles.textInput}
            placeholder="Escreve uma mensagem..."
            placeholderTextColor="#888"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onFocus={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 200);
            }}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={17} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  articleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#c8e6c9',
    gap: 6
  },
  articleBannerText: {
    fontSize: 13,
    color: '#2e7d32',
    flex: 1
  },
  articleBannerBold: {
    fontWeight: '700'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexGrow: 1
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80
  },
  emptyText: {
    fontSize: 14,
    color: '#868e96',
    marginTop: 8
  },
  bubbleRow: {
    marginVertical: 4,
    flexDirection: 'row'
  },
  myBubbleRow: {
    justifyContent: 'flex-end'
  },
  theirBubbleRow: {
    justifyContent: 'flex-start'
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  myBubble: {
    backgroundColor: '#2e7d32',
    borderBottomRightRadius: 2
  },
  theirBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  articleBadgeInChat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.3)'
  },
  articleBadgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  articleBadgeTextMine: {
    color: '#e8f5e9'
  },
  articleBadgeTextTheir: {
    color: '#2e7d32'
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20
  },
  myMessageText: {
    color: '#ffffff'
  },
  theirMessageText: {
    color: '#212529'
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4
  },
  timeText: {
    fontSize: 10
  },
  myTimeText: {
    color: 'rgba(255, 255, 255, 0.75)'
  },
  theirTimeText: {
    color: '#868e96'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#e9ecef',
    gap: 8
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f1f3f5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ced4da',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 100,
    fontSize: 15,
    color: '#212529'
  },
  sendButton: {
    backgroundColor: '#2e7d32',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2
  },
  sendButtonDisabled: {
    backgroundColor: '#a5d6a7'
  }
});