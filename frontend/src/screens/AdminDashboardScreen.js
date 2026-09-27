import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function AdminDashboardScreen({ navigation }) {
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState('articles'); // 'articles' ou 'users'
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentAdminId, setCurrentAdminId] = useState(null);

  // Obter o ID do admin atual guardado na sessão
  useEffect(() => {
    const fetchAdminId = async () => {
      const id = await AsyncStorage.getItem('userId');
      if (id) setCurrentAdminId(Number(id));
    };
    fetchAdminId();
  }, []);

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = activeTab === 'articles' ? '/artigos?isBackoffice=true&limit=100' : '/utilizadores';
      const response = await api.get(endpoint);
      setItems(response.data.artigos || response.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados de admin:', error);
      Alert.alert(t('error'), 'Não foi possível carregar os dados do painel.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, t]);

  // Atualizar sempre que o ecrã ganha foco
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadAdminData();
    });
    return unsubscribe;
  }, [navigation, loadAdminData]);

  useEffect(() => {
    setSearchQuery('');
    loadAdminData();
  }, [activeTab, loadAdminData]);

  // Função para apagar artigos
  const handleDeleteArticle = async (id) => {
    Alert.alert(
      t('delete'),
      t('deleteArticleConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/artigos/${id}`);
              setItems(prev => prev.filter(item => item.id !== id));
              Alert.alert(t('success'), t('articleDeletedSuccess'));
            } catch (error) {
              Alert.alert(t('error'), t('failedDeleteArticle'));
            }
          }
        }
      ]
    );
  };

  // Função para alternar o estado do utilizador com proteções de auto-desativação e logout
  const handleToggleUserStatus = async (user) => {
    const targetUserId = Number(user.id);

    // 1. Impedir que a conta se desative a si mesma
    if (currentAdminId && targetUserId === currentAdminId) {
      Alert.alert(t('warning'), t('selfActionError'));
      return;
    }

    const novoEstado = user.ativo === false ? true : false;
    
    try {
      // Atualiza o estado do utilizador na API
      await api.put(`/utilizadores/${user.id}`, {
        ...user,
        ativo: novoEstado
      });

      // Se a conta foi desativada, coloca todos os artigos dela como indisponíveis
      if (!novoEstado) {
        const articlesRes = await api.get('/artigos', { params: { isBackoffice: 'true', limit: 200 } });
        const allArticles = articlesRes.data.artigos || articlesRes.data || [];
        const userArticles = allArticles.filter(art => Number(art.utilizador_id) === targetUserId);

        for (const article of userArticles) {
          await api.put(`/artigos/${article.id}`, {
            ...article,
            disponivel: false
          });
        }
      }

      setItems(prev =>
        prev.map(item => (Number(item.id) === targetUserId ? { ...item, ativo: novoEstado } : item))
      );

      Alert.alert(
        t('success'), 
        `Utilizador ${novoEstado ? t('active').toLowerCase() : t('inactive').toLowerCase()} com sucesso.${!novoEstado ? ' Todos os seus anúncios foram colocados como indisponíveis.' : ''}`
      );
    } catch (error) {
      console.error('Erro ao alterar estado do utilizador:', error);
      Alert.alert(t('error'), 'Não foi possível alterar o estado do utilizador.');
    }
  };

  // Filtragem dinâmica baseada na barra de pesquisa
  const filteredItems = items.filter(item => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    if (activeTab === 'articles') {
      return item.titulo?.toLowerCase().includes(query);
    } else {
      const nome = item.nome?.toLowerCase() || '';
      const email = item.email?.toLowerCase() || '';
      return nome.includes(query) || email.includes(query);
    }
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#2e7d32" />

      {/* Abas de Navegação */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'articles' && styles.activeTab]}
          onPress={() => setActiveTab('articles')}
        >
          <Ionicons name="cube-outline" size={18} color={activeTab === 'articles' ? '#fff' : '#2e7d32'} />
          <Text style={[styles.tabText, activeTab === 'articles' && styles.activeTabText]}>{t('articlesTab')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons name="people-outline" size={18} color={activeTab === 'users' ? '#fff' : '#2e7d32'} />
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>{t('usersTab')}</Text>
        </TouchableOpacity>
      </View>

      {/* Barra de Pesquisa */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#777" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'articles' ? t('searchArticlesPlaceholder') : t('searchUsersPlaceholder')}
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

      {/* Conteúdo */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2e7d32" />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const isUser = activeTab === 'users';
            const isAtivo = isUser ? (item.ativo !== false) : true;
            const isSelf = isUser && Number(item.id) === currentAdminId;

            return (
              <View style={[styles.card, isSelf && styles.selfCard]}>
                <View style={styles.cardInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.titulo || item.nome} {isSelf && t('selfIndicator')}
                    </Text>
                    {isUser && (
                      <View style={[styles.statusBadge, isAtivo ? styles.badgeActive : styles.badgeInactive]}>
                        <Text style={styles.statusBadgeText}>
                          {isAtivo ? t('active') : t('inactive')}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>
                    {item.email || item.descricao || `${t('categoryLabelId')}: ${item.categoria_id}`}
                  </Text>
                </View>

                {/* Botões de Ação Dinâmicos */}
                {isUser ? (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      isAtivo ? styles.deactivateBtn : styles.activateBtn,
                      isSelf && { opacity: 0.5 }
                    ]}
                    onPress={() => handleToggleUserStatus(item)}
                    disabled={isSelf}
                  >
                    <Ionicons
                      name={isAtivo ? 'ban-outline' : 'checkmark-circle-outline'}
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.actionBtnText}>
                      {isAtivo ? t('deactivate') : t('activate')}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteArticle(item.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#dc3545" />
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>{t('noRecordsFound')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 8,
    borderBottomWidth: 1,
    borderColor: '#e9ecef'
  },

  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
    marginHorizontal: 4,
    gap: 6
  },

  activeTab: { 
    backgroundColor: '#2e7d32' 
  },

  tabText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#2e7d32' 
  },

  activeTabText: { 
    color: '#fff' 
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

  listContainer: { 
    padding: 16, 
    gap: 10 
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 1
  },

  selfCard: {
    borderColor: '#b2dfdb',
    backgroundColor: '#f4fbf7'
  },

  cardInfo: { 
    flex: 1, 
    marginRight: 10
  },

  titleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 2, 
    gap: 8 
  },

  cardTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#212529', 
    flex: 1 
  },

  cardSubtitle: { 
    fontSize: 13, 
    color: '#6c757d' 
  },

  statusBadge: { 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 6 
  },

  badgeActive: { 
    backgroundColor: '#d4edda' 
  },

  badgeInactive: { 
    backgroundColor: '#f8d7da' 
  },
  statusBadgeText: { 
    fontSize: 10, 
    fontWeight: '700', 
    color: '#333' 
  },
  deleteBtn: { 
    padding: 8, 
    backgroundColor: '#f8f7da', 
    borderRadius: 8 
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4
  },

  activateBtn: { 
    backgroundColor: '#2e7d32' 
  },

  deactivateBtn: { 
    backgroundColor: '#d9534f' 
  },

  actionBtnText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '700' 
  },

  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 40 
  },

  emptyText: {
    color: '#868e96', 
    fontSize: 14 
  }
  
});