import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_HEIGHT = 280;

export default function ArticleDetailScreen({ route, navigation }) {
  const { article } = route.params;
  const insets = useSafeAreaInsets();
  const { t, translateCategory } = useLanguage();

  const [currentUserId, setCurrentUserId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Carrega o id do utilizador autenticado
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const id = await AsyncStorage.getItem('userId');
        if (id) setCurrentUserId(id.toString());
      } catch (error) {
        console.error('Erro ao ler userId da sessão:', error);
      }
    };
    fetchUserId();
  }, []);

  const isOwner = currentUserId && article.utilizador_id?.toString() === currentUserId;
  const photos = article.fotos || [];

  const getImageUrl = (caminho) => {
    if (!caminho) return null;
    return caminho.startsWith('http')
      ? caminho
      : `${api.defaults.baseURL.replace('/api', '')}/pictures/${caminho}`;
  };

  const handleScroll = (event) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (slide !== activePhotoIndex) {
      setActivePhotoIndex(slide);
    }
  };

  // Verificação de regra: Requer pelo menos 1 artigo publicado antes de contactar
  const handleInitiateChat = async () => {
    try {
      if (!currentUserId) {
        Alert.alert(t('warning'), t('sessionRequired'));
        return;
      }

      const response = await api.get('/artigos', {
        params: { isBackoffice: 'true', limit: 100 }
      });
      const allArticles = response.data.artigos || response.data || [];

      // Filtra artigos pertencentes ao utilizador autenticado
      const userArticles = allArticles.filter(
        (art) => Number(art.utilizador_id) === Number(currentUserId)
      );

      // REGRA: Pelo menos 1 artigo publicado
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
        recipientId: article.utilizador_id,
        recipientName: article.utilizador?.nome || t('iptUser'),
        articleId: article.id,
        articleTitle: article.titulo
      });
    } catch (error) {
      console.error('Erro ao verificar artigos do utilizador:', error);
      Alert.alert(t('error'), 'Erro ao processar.');
    }
  };

  // Função para apagar o artigo
  const handleDeleteArticle = () => {
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
              setIsDeleting(true);
              await api.delete(`/artigos/${article.id}`);
              Alert.alert(t('success'), t('articleDeletedSuccess'), [
                {
                  text: t('ok'),
                  onPress: () => navigation.navigate('Main')
                }
              ]);
            } catch (error) {
              console.error('Erro ao eliminar artigo:', error);
              Alert.alert(t('error'), error.response?.data?.message || t('failedDeleteArticle'));
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2e7d32" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 100 + insets.bottom }
        ]}
      >
        {/* Carrossel de Imagens */}
        {photos.length > 0 ? (
          <View style={styles.carouselContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
            >
              {photos.map((item, index) => (
                <ScrollView
                  key={item.id || index}
                  style={styles.zoomScroll}
                  maximumZoomScale={3}
                  minimumZoomScale={1}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  centerContent
                >
                  <Image
                    source={{ uri: getImageUrl(item.caminho_foto) }}
                    style={styles.carouselImage}
                    resizeMode="contain"
                  />
                </ScrollView>
              ))}
            </ScrollView>
            {photos.length > 1 && (
              <View style={styles.counterBadge}>
                <Text style={styles.counterText}>
                  {activePhotoIndex + 1} / {photos.length}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.carouselContainer, styles.noImage]}>
            <Ionicons name="image-outline" size={60} color="#888" />
            <Text style={styles.noImageText}>{t('noImage')}</Text>
          </View>
        )}

        <View style={styles.content}>
          {/* Título e Categoria */}
          <Text style={styles.title}>{article.titulo}</Text>
          <Text style={styles.category}>{translateCategory(article.categoria?.nome) || 'Sem categoria'}</Text>

          {/* Badges de Estado e Disponibilidade */}
          <View style={styles.badgesRow}>
            <View style={[styles.badge, article.estado === 'Novo' ? styles.badgeGreen : styles.badgeOrange]}>
              <Text style={styles.badgeText}>{article.estado === 'Novo' ? t('new') : t('used')}</Text>
            </View>
            <View style={[styles.badge, article.disponivel ? styles.badgeAvailable : styles.badgeUnavailable]}>
              <Text style={styles.badgeText}>{article.disponivel ? t('available') : t('unavailable')}</Text>
            </View>
          </View>

          {/* Secção do Dono / Publicador (Clicável para abrir o Perfil) */}
          <TouchableOpacity
            style={styles.ownerCard}
            activeOpacity={0.7}
            onPress={() => {
              if (article.utilizador_id) {
                navigation.navigate('UserProfile', { userId: article.utilizador_id });
              }
            }}
          >
            <Ionicons name="person-circle-outline" size={42} color="#2e7d32" />
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerName}>{article.utilizador?.nome || t('iptUser')}</Text>
              <Text style={styles.ownerEmail}>{article.utilizador?.email || ''}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#bbb" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          {/* Descrição */}
          <Text style={styles.sectionTitle}>{t('description')}</Text>
          <Text style={styles.description}>
            {article.descricao || t('noDescription')}
          </Text>
        </View>
      </ScrollView>

      {/* Rodapé Dinâmico com compensação da barra do sistema */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16
          }
        ]}
      >
        {isOwner ? (
          <View style={styles.ownerButtonsRow}>
            {/* Botão de Editar */}
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => navigation.navigate('EditArticleScreen', { article })}
              disabled={isDeleting}
            >
              <Ionicons name="pencil-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.actionButtonText}>{t('edit')}</Text>
            </TouchableOpacity>

            {/* Botão de Apagar */}
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeleteArticle}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.actionButtonText}>{t('delete')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* Botão visível para os outros utilizadores */
          <TouchableOpacity
            style={[styles.actionButton, styles.messageButton]}
            onPress={handleInitiateChat}
          >
            <Ionicons name="chatbubbles-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>{t('sendMessage')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 100 },
  carouselContainer: {
    width: SCREEN_WIDTH,
    height: CAROUSEL_HEIGHT,
    backgroundColor: '#000',
    position: 'relative'
  },
  zoomScroll: {
    width: SCREEN_WIDTH,
    height: CAROUSEL_HEIGHT
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: CAROUSEL_HEIGHT
  },
  noImage: {
    backgroundColor: '#f1f3f5',
    justifyContent: 'center',
    alignItems: 'center'
  },
  noImageText: { color: '#888', marginTop: 6 },
  counterBadge: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14
  },
  counterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  content: {
    padding: 18
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4
  },
  category: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 12
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
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
    fontSize: 12,
    fontWeight: '600',
    color: '#333'
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 20
  },
  ownerInfo: {
    marginLeft: 12
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333'
  },
  ownerEmail: {
    fontSize: 13,
    color: '#6c757d'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#495057'
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#e9ecef'
  },
  ownerButtonsRow: {
    flexDirection: 'row',
    gap: 12
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8
  },
  messageButton: {
    backgroundColor: '#2e7d32'
  },
  editButton: {
    flex: 1,
    backgroundColor: '#007bff'
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#dc3545'
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold'
  }
});