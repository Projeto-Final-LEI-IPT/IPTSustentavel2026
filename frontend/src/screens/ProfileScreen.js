import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function ProfileScreen({ route, navigation, onLogout }) {
  // Se route.params trouxer userId, estamos a ver o perfil de outro utilizador
  const targetUserId = route?.params?.userId;
  const { t, translateCategory } = useLanguage();

  const [currentLoggedUserId, setCurrentLoggedUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isOwnProfile = !targetUserId || Number(targetUserId) === Number(currentLoggedUserId);

  const loadProfileData = useCallback(async () => {
    try {
      const loggedId = await AsyncStorage.getItem('userId');
      if (loggedId) setCurrentLoggedUserId(Number(loggedId));

      const effectiveUserId = targetUserId || loggedId;
      if (!effectiveUserId) return;

      // 1. Obter dados do utilizador (dono do perfil)
      const userRes = await api.get(`/utilizadores/${effectiveUserId}`);
      setUser(userRes.data);

      // 2. Obter os artigos deste utilizador
      const articlesRes = await api.get('/artigos', {
        params: {
          isBackoffice: 'true',
          limit: 100
        }
      });

      const allArticles = articlesRes.data.artigos || articlesRes.data || [];
      const userArticles = allArticles.filter(
        (art) => Number(art.utilizador_id) === Number(effectiveUserId)
      );

      setArticles(userArticles);
    } catch (error) {
      console.error('Erro ao carregar dados do perfil:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    loadProfileData();

    const unsubscribe = navigation.addListener('focus', () => {
      loadProfileData();
    });
    return unsubscribe;
  }, [navigation, loadProfileData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadProfileData();
  };

  const handleLogout = () => {
    Alert.alert(t('logout'), t('logoutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('logout'),
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['token', 'userId', 'userTypeId']);
          if (onLogout) onLogout();
        }
      }
    ]);
  };

  const handleDeleteArticle = (articleId) => {
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
              await api.delete(`/artigos/${articleId}`);
              setArticles((prev) => prev.filter((item) => item.id !== articleId));
            } catch (err) {
              Alert.alert(t('error'), t('failedDeleteArticle'));
            }
          }
        }
      ]
    );
  };

  const renderHeader = () => {
    const initials = user?.nome ? user.nome.substring(0, 2).toUpperCase() : 'U';

    const avatarUrl = user?.foto_perfil
      ? user.foto_perfil.startsWith('http')
        ? user.foto_perfil
        : `${api.defaults.baseURL.replace('/api', '')}/pictures/${user.foto_perfil}`
      : null;

    return (
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
        </View>

        <Text style={styles.userName}>{user?.nome || t('iptUser')}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{articles.length}</Text>
            <Text style={styles.statLabel}>{t('publishedArticles')}</Text>
          </View>
        </View>

        {/* Botão de Terminar Sessão apenas visível no perfil do próprio */}
        {isOwnProfile && onLogout && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#dc3545" style={{ marginRight: 6 }} />
              <Text style={styles.logoutButtonText}>{t('logout')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.myArticlesTitle}>
          {isOwnProfile ? t('myAds') : t('userAds')}
        </Text>
      </View>
    );
  };

  const renderArticleItem = ({ item }) => {
    const firstPhoto = item.fotos?.[0]?.caminho_foto;
    const imageUrl = firstPhoto?.startsWith('http')
      ? firstPhoto
      : firstPhoto
      ? `${api.defaults.baseURL.replace('/api', '')}/pictures/${firstPhoto}`
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ArticleDetail', { article: item })}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.noImage]}>
            <Ionicons name="image-outline" size={28} color="#aaa" />
          </View>
        )}

        <View style={styles.cardInfo}>
          <Text style={styles.articleTitle} numberOfLines={1}>
            {item.titulo}
          </Text>
          <Text style={styles.articleCategory}>{translateCategory(item.categoria?.nome) || 'Sem categoria'}</Text>

          <View style={styles.statusRow}>
            <View style={[styles.badge, item.disponivel ? styles.badgeAvailable : styles.badgeUnavailable]}>
              <Text style={styles.badgeText}>{item.disponivel ? t('available') : t('unavailable')}</Text>
            </View>
            <View style={[styles.badge, item.estado === 'Novo' ? styles.badgeGreen : styles.badgeOrange]}>
              <Text style={styles.badgeText}>{item.estado === 'Novo' ? t('new') : t('used')}</Text>
            </View>
          </View>
        </View>

        {/* Botões de Ação rápida só surgem se o anúncio for do próprio */}
        {isOwnProfile && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('EditArticleScreen', { article: item })}
            >
              <Ionicons name="pencil" size={18} color="#007bff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDeleteArticle(item.id)}
            >
              <Ionicons name="trash" size={18} color="#dc3545" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#2e7d32" />

      <FlatList
        data={articles}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderArticleItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#2e7d32']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="file-tray-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>{t('noArticlesPublished')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 24 },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 12
  },
  avatarContainer: { marginBottom: 12 },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#2e7d32',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: { color: '#ffffff', fontSize: 32, fontWeight: 'bold' },
  userName: { fontSize: 20, fontWeight: '700', color: '#212529', marginBottom: 4 },
  userEmail: { fontSize: 14, color: '#6c757d', marginBottom: 16 },
  statsRow: { flexDirection: 'row', marginBottom: 16 },
  statBox: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e8f5e9'
  },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#2e7d32' },
  statLabel: { fontSize: 12, color: '#388e3c' },
  actionRow: { width: '100%', alignItems: 'center' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f5c6cb',
    backgroundColor: '#f8d7da'
  },
  logoutButtonText: { color: '#dc3545', fontSize: 13, fontWeight: '700' },
  myArticlesTitle: {
    alignSelf: 'flex-start',
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    marginTop: 20
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center'
  },
  cardImage: { width: 75, height: 75, borderRadius: 8 },
  noImage: { backgroundColor: '#f1f3f5', justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  articleTitle: { fontSize: 15, fontWeight: '700', color: '#212529', marginBottom: 2 },
  articleCategory: { fontSize: 12, color: '#6c757d', marginBottom: 6 },
  statusRow: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeGreen: { backgroundColor: '#d4edda' },
  badgeOrange: { backgroundColor: '#fff3cd' },
  badgeAvailable: { backgroundColor: '#cce5ff' },
  badgeUnavailable: { backgroundColor: '#f8d7da' },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#333' },
  cardActions: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    marginLeft: 8,
    gap: 10
  },
  actionBtn: { padding: 6 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { color: '#868e96', fontSize: 14, marginTop: 8 }
});