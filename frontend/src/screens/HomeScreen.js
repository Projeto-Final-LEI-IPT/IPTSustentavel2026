import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function HomeScreen({ navigation }) {
  const { t, language, setShowLanguageModal, translateCategory } = useLanguage();

  // Estados principais de dados
  const [artigos, setArtigos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Estados de filtros e pesquisa
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCondition, setSelectedCondition] = useState(null);

  // Controlo de paginação e carregamento
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Botão de seleção de Idioma com bandeira no canto superior direito
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setShowLanguageModal(true)}
          style={styles.languageButton}
          activeOpacity={0.7}
        >
          <Text style={styles.flagIcon}>{language === 'en' ? '🇬🇧' : '🇵🇹'}</Text>
          <Ionicons name="chevron-down" size={14} color="#ffffff" style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, language, setShowLanguageModal]);

  useEffect(() => {
    const getUserId = async () => {
      const id = await AsyncStorage.getItem('userId');
      if (id) setCurrentUserId(id.toString());
    };
    getUserId();
  }, []);

  const fetchCategorias = async () => {
    try {
      const response = await api.get('/categorias');
      setCategorias(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const fetchArtigos = useCallback(async (pageNumber = 1, shouldAppend = false) => {
    try {
      if (pageNumber === 1 && !shouldAppend) setLoading(true);

      const params = {
        include: ['fotos', 'categoria'],
        page: pageNumber,
        limit: 6,
        disponivel: true
      };

      if (searchTerm.trim()) params.titulo = searchTerm.trim();
      if (selectedCategory) params.categoria_id = selectedCategory;
      if (selectedCondition) params.estado = selectedCondition;

      const response = await api.get('/artigos', { params });

      const newArticles = response.data?.artigos || [];
      const totalP = response.data?.pagination?.totalPages || 1;

      setTotalPages(totalP);
      setPage(pageNumber);

      if (shouldAppend) {
        setArtigos(prev => [...prev, ...newArticles]);
      } else {
        setArtigos(newArticles);
      }
    } catch (error) {
      console.error('Erro ao carregar artigos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchTerm, selectedCategory, selectedCondition]);

  useEffect(() => {
    fetchCategorias();
    fetchArtigos(1, false);
  }, [fetchArtigos]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchArtigos(1, false);
  };

  const handleLoadMore = () => {
    if (!loading && page < totalPages) {
      fetchArtigos(page + 1, true);
    }
  };

  const toggleCondition = (cond) => {
    setSelectedCondition(prev => (prev === cond ? null : cond));
  };

  const toggleCategory = (catId) => {
    setSelectedCategory(prev => (prev === catId ? null : catId));
  };

  const handleInitiateChat = async (item) => {
    try {
      if (!currentUserId) {
        Alert.alert(t('warning'), t('articleRequiredMsg'));
        return;
      }

      const response = await api.get('/artigos', {
        params: { isBackoffice: 'true', limit: 100 }
      });
      const allArticles = response.data?.artigos || response.data || [];

      const userArticles = allArticles.filter(
        (art) => Number(art.utilizador_id) === Number(currentUserId)
      );

      if (userArticles.length === 0) {
        Alert.alert(
          t('articleRequiredTitle'),
          t('articleRequiredMsg'),
          [
            { text: t('notNow'), style: 'cancel' },
            {
              text: t('createAd'),
              onPress: () => navigation.navigate('CreateArticleScreen')
            }
          ]
        );
        return;
      }

      navigation.navigate('Chat', {
        recipientId: item.utilizador_id,
        recipientName: item.utilizador?.nome || 'Utilizador IPT',
        articleId: item.id,
        articleTitle: item.titulo
      });
    } catch (error) {
      console.error('Erro ao verificar artigos do utilizador:', error);
      Alert.alert(t('error'), 'Erro ao processar pedido.');
    }
  };

  const renderArticleCard = ({ item }) => {
    const isOwner = currentUserId && item.utilizador_id?.toString() === currentUserId;
    
    // Apenas a primeira foto para a capa
    const firstPhoto = item.fotos?.[0]?.caminho_foto;
    const totalPhotos = item.fotos?.length || 0;

    const imageUri = firstPhoto?.startsWith('http')
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
        {imageUri ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
            {totalPhotos > 1 && (
              <View style={styles.photoCountBadge}>
                <Ionicons name="images" size={12} color="#fff" style={{ marginRight: 3 }} />
                <Text style={styles.photoCountText}>1/{totalPhotos}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.cardImage, styles.noImageContainer]}>
            <Ionicons name="image-outline" size={40} color="#888" />
            <Text style={styles.noImageText}>{t('noImage')}</Text>
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.titulo}
            </Text>

            {/* Ações: Editar (Dono) ou Abrir Chat (Outros Utilizadores) */}
            {isOwner ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('EditArticleScreen', { article: item })}
                style={styles.actionIconBtn}
              >
                <Ionicons name="pencil" size={20} color="#007bff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionIconBtn}
                onPress={() => handleInitiateChat(item)}
              >
                <Ionicons name="chatbubbles" size={22} color="#2e7d32" />
              </TouchableOpacity>
            )}
          </View>

          {/* Tradução dinâmica da categoria no cartão do artigo */}
          <Text style={styles.cardCategory}>
            {translateCategory(item.categoria?.nome) || 'Sem categoria'}
          </Text>

          <View style={styles.badgesRow}>
            <View style={[styles.badge, item.estado === 'Novo' ? styles.badgeGreen : styles.badgeOrange]}>
              <Text style={styles.badgeText}>
                {item.estado === 'Novo' ? t('new') : t('used')}
              </Text>
            </View>
            <View style={[styles.badge, item.disponivel ? styles.badgeAvailable : styles.badgeUnavailable]}>
              <Text style={styles.badgeText}>
                {item.disponivel ? t('available') : t('unavailable')}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#2e7d32" />

      {/* 1. Barra de Pesquisa */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#777" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor="#888"
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={() => fetchArtigos(1, false)}
            returnKeyType="search"
            maxLength={30}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. Categorias - com tradução dinâmica */}
      <View style={styles.categoriesSection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categorias}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => {
            const isActive = selectedCategory === item.id;
            return (
              <TouchableOpacity
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => toggleCategory(item.id)}
              >
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {translateCategory(item.nome)}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* 3. Filtro Novo / Usado */}
      <View style={styles.conditionRow}>
        <TouchableOpacity
          style={[styles.conditionChip, selectedCondition === 'Novo' && styles.conditionChipActive]}
          onPress={() => toggleCondition('Novo')}
        >
          <Text style={[styles.conditionText, selectedCondition === 'Novo' && styles.conditionTextActive]}>
            {t('new')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.conditionChip, selectedCondition === 'Usado' && styles.conditionChipActive]}
          onPress={() => toggleCondition('Usado')}
        >
          <Text style={[styles.conditionText, selectedCondition === 'Usado' && styles.conditionTextActive]}>
            {t('used')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. Lista de Artigos */}
      {loading && page === 1 ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#2e7d32" />
        </View>
      ) : (
        <FlatList
          data={artigos}
          keyExtractor={item => item.id.toString()}
          renderItem={renderArticleCard}
          contentContainerStyle={styles.articlesList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#2e7d32']} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={60} color="#bbb" />
              <Text style={styles.emptyText}>{t('noArticlesFound')}</Text>
            </View>
          }
          ListFooterComponent={
            page < totalPages && loading ? (
              <ActivityIndicator size="small" color="#2e7d32" style={{ marginVertical: 12 }} />
            ) : null
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
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16
  },
  flagIcon: {
    fontSize: 18
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 44
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333'
  },
  clearButton: {
    padding: 4
  },
  categoriesSection: {
    marginVertical: 6
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 8
  },
  categoryChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20
  },
  categoryChipActive: {
    backgroundColor: '#2e7d32',
    borderColor: '#2e7d32'
  },
  categoryChipText: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '500'
  },
  categoryChipTextActive: {
    color: '#fff'
  },
  conditionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8
  },
  conditionChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#e9ecef'
  },
  conditionChipActive: {
    backgroundColor: '#343a40'
  },
  conditionText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '600'
  },
  conditionTextActive: {
    color: '#fff'
  },
  articlesList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#edf2f7',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 }
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
    backgroundColor: '#f1f3f5'
  },
  cardImage: {
    width: '100%',
    height: 180
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  photoCountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold'
  },
  noImageContainer: {
    backgroundColor: '#f1f3f5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  noImageText: {
    fontSize: 12,
    color: '#868e96',
    marginTop: 4
  },
  cardContent: {
    padding: 12
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    flex: 1,
    marginRight: 8
  },
  cardCategory: {
    fontSize: 13,
    color: '#6c757d',
    marginTop: 4
  },
  actionIconBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center'
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  badgeGreen: {
    backgroundColor: '#d4edda'
  },
  badgeOrange: {
    backgroundColor: '#fff3cd'
  },
  badgeAvailable: {
    backgroundColor: '#cce5ff'
  },
  badgeUnavailable: {
    backgroundColor: '#f8d7da'
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333'
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50
  },
  emptyText: {
    fontSize: 15,
    color: '#868e96',
    marginTop: 10
  }
});