import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function ConversationsScreen({ navigation }) {
  const { t, language } = useLanguage();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const getUserId = async () => {
      try {
        const id = await AsyncStorage.getItem('userId');
        if (id) setCurrentUserId(Number(id));
      } catch (err) {
        console.error('Erro ao ler userId da sessão:', err);
      }
    };
    getUserId();
  }, []);

  // Procura todas as mensagens e agrupa por interlocutor
  const fetchConversations = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const response = await api.get('/mensagens');
      const mensagens = response.data || [];

      const grouped = mensagens.reduce((acc, msg) => {
        const remetenteId = Number(msg.remetente_id);
        const destinatarioId = Number(msg.destinatario_id || msg.destinatario?.id);

        if (!remetenteId || !destinatarioId || remetenteId === destinatarioId) return acc;

        const isFromLoggedUser = remetenteId === userId;
        const partner = isFromLoggedUser ? msg.destinatario : msg.remetente;

        if (!partner || !partner.id || Number(partner.id) === userId) return acc;

        const partnerId = Number(partner.id);

        if (!acc[partnerId]) {
          acc[partnerId] = {
            id: partnerId,
            user: {
              id: partnerId,
              nome: partner.nome || t('iptUser'),
              initials: (partner.nome || 'U').substring(0, 2).toUpperCase()
            },
            articleId: msg.artigo_id || null,
            messages: []
          };
        }

        acc[partnerId].messages.push({
          id: msg.id,
          content: msg.conteudo,
          data: msg.data,
          isSent: isFromLoggedUser,
          lida: msg.lida || false
        });

        if (!isFromLoggedUser && !msg.lida) {
          acc[partnerId].unreadCount = (acc[partnerId].unreadCount || 0) + 1;
        }

        return acc;
      }, {});

      // Ordena as conversas pela mensagem mais recente
      const sortedConversations = Object.values(grouped)
        .map(conv => ({
          ...conv,
          messages: conv.messages.sort((a, b) => new Date(a.data) - new Date(b.data))
        }))
        .sort((a, b) => {
          const lastA = new Date(a.messages[a.messages.length - 1]?.data || 0);
          const lastB = new Date(b.messages[b.messages.length - 1]?.data || 0);
          return lastB - lastA;
        });

      setConversations(sortedConversations);
    } catch (error) {
      console.error('Erro ao carregar lista de conversas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (currentUserId) fetchConversations(currentUserId);
    });
    return unsubscribe;
  }, [navigation, currentUserId, fetchConversations]);

  useEffect(() => {
    if (currentUserId) {
      fetchConversations(currentUserId);
      const interval = setInterval(() => fetchConversations(currentUserId), 4000);
      return () => clearInterval(interval);
    }
  }, [currentUserId, fetchConversations]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations(currentUserId);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.user.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderConversationItem = ({ item }) => {
    const lastMsg = item.messages[item.messages.length - 1];
    
    // Tratar mensagens com prefixo "Artigo: Nome | texto"
    let displayContent = lastMsg?.content || '';
    if (displayContent.includes('|')) {
      displayContent = displayContent.split('|')[1].trim();
    }

    const timeString = lastMsg?.data
      ? new Date(lastMsg.data).toLocaleDateString([], { day: '2-digit', month: '2-digit' }) ===
        new Date().toLocaleDateString([], { day: '2-digit', month: '2-digit' })
        ? new Date(lastMsg.data).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date(lastMsg.data).toLocaleDateString([], { day: '2-digit', month: '2-digit' })
      : '';

    const youPrefix = language === 'en' ? 'You: ' : 'Tu: ';

    return (
      <TouchableOpacity
        style={styles.chatCard}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('Chat', {
            recipientId: item.user.id,
            recipientName: item.user.nome,
            articleId: item.articleId
          })
        }
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.user.initials}</Text>
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.topRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.user.nome}
            </Text>
            <Text style={styles.timeText}>{timeString}</Text>
          </View>

          <View style={styles.bottomRow}>
            <Text style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]} numberOfLines={1}>
              {lastMsg?.isSent ? youPrefix : ''}{displayContent}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#2e7d32" />

      {/* Caixa de Pesquisa */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#777" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={language === 'en' ? 'Search conversations...' : 'Procurar conversas...'}
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2e7d32" />
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#2e7d32']} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={54} color="#ccc" />
              <Text style={styles.emptyText}>{t('noConversations')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#e9ecef'
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#212529'
  },
  listContent: {
    flexGrow: 1
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80
  },
  emptyText: {
    color: '#868e96',
    fontSize: 14,
    marginTop: 10
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#f1f3f5'
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2e7d32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  chatInfo: {
    flex: 1
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212529',
    flex: 1,
    marginRight: 8
  },
  timeText: {
    fontSize: 12,
    color: '#868e96'
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  lastMessage: {
    fontSize: 13,
    color: '#6c757d',
    flex: 1,
    marginRight: 8
  },
  lastMessageUnread: {
    color: '#212529',
    fontWeight: '700'
  },
  unreadBadge: {
    backgroundColor: '#2e7d32',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold'
  }
});