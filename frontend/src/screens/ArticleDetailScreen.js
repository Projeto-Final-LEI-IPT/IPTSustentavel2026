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
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_HEIGHT = 280;

export default function ArticleDetailScreen({ route, navigation }) {
  const { article } = route.params;
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

  // Função para apagar o artigo
  const handleDeleteArticle = () => {
    Alert.alert(
      'Eliminar Artigo',
      'Tens a certeza de que queres eliminar este artigo? Esta ação não pode ser revertida.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await api.delete(`/artigos/${article.id}`);
              Alert.alert('Sucesso', 'Artigo eliminado com sucesso!', [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('Main')
                }
              ]);
            } catch (error) {
              console.error('Erro ao eliminar artigo:', error);
              Alert.alert('Erro', error.response?.data?.message || 'Falha ao eliminar o artigo.');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#2e7d32" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Carrossel de Imagens com suporte a Arrastar e Zoom */}
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

            {/* Badge com a página atual ex: 1/3 */}
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
            <Text style={styles.noImageText}>Sem imagem</Text>
          </View>
        )}

        <View style={styles.content}>
          {/* Título e Categoria */}
          <Text style={styles.title}>{article.titulo}</Text>
          <Text style={styles.category}>{article.categoria?.nome || 'Sem categoria'}</Text>

          {/* Badges de Estado e Disponibilidade */}
          <View style={styles.badgesRow}>
            <View style={[styles.badge, article.estado === 'Novo' ? styles.badgeGreen : styles.badgeOrange]}>
              <Text style={styles.badgeText}>{article.estado || 'Usado'}</Text>
            </View>
            <View style={[styles.badge, article.disponivel ? styles.badgeAvailable : styles.badgeUnavailable]}>
              <Text style={styles.badgeText}>{article.disponivel ? 'Disponível' : 'Indisponível'}</Text>
            </View>
          </View>

          {/* Secção do Dono / Publicador */}
          <View style={styles.ownerCard}>
            <Ionicons name="person-circle-outline" size={40} color="#2e7d32" />
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerName}>{article.utilizador?.nome || 'Utilizador IPT'}</Text>
              <Text style={styles.ownerEmail}>{article.utilizador?.email || ''}</Text>
            </View>
          </View>

          {/* Descrição */}
          <Text style={styles.sectionTitle}>Descrição</Text>
          <Text style={styles.description}>
            {article.descricao || 'Nenhuma descrição fornecida para este artigo.'}
          </Text>
        </View>
      </ScrollView>

      {/* Rodapé Dinâmico: Ações para Dono vs Outros Utilizadores */}
      <View style={styles.footer}>
        {isOwner ? (
          <View style={styles.ownerButtonsRow}>
            {/* Botão de Editar */}
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => navigation.navigate('EditArticleScreen', { article })}
              disabled={isDeleting}
            >
              <Ionicons name="pencil-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.actionButtonText}>Editar</Text>
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
                  <Text style={styles.actionButtonText}>Eliminar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.messageButton]}
            onPress={() =>
              navigation.navigate('Chat', {
                recipientId: article.utilizador_id,
                recipientName: article.utilizador?.nome || 'Utilizador IPT',
                articleId: article.id,
                articleTitle: article.titulo
              })
            }
          >
            <Ionicons name="chatbubbles-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>Enviar Mensagem ao Dono</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
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
  counterText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  content: { padding: 18 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#212529', marginBottom: 4 },
  category: { fontSize: 14, color: '#6c757d', marginBottom: 12 },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeGreen: { backgroundColor: '#d4edda' },
  badgeOrange: { backgroundColor: '#fff3cd' },
  badgeAvailable: { backgroundColor: '#cce5ff' },
  badgeUnavailable: { backgroundColor: '#f8d7da' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#333' },
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
  ownerInfo: { marginLeft: 12 },
  ownerName: { fontSize: 15, fontWeight: '700', color: '#333' },
  ownerEmail: { fontSize: 13, color: '#6c757d' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  description: { fontSize: 15, lineHeight: 22, color: '#495057' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
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