import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function ArticleDetailScreen({ route, navigation }) {
  const { article } = route.params;
  const [currentUserId, setCurrentUserId] = useState(null);

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

  // Resolve a imagem 
  const fotoUrl = article.fotos?.[0]?.caminho_foto;
  const imageUri = fotoUrl?.startsWith('http')
    ? fotoUrl
    : fotoUrl
    ? `${api.defaults.baseURL.replace('/api', '')}/pictures/${fotoUrl}`
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#2e7d32" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Imagem do Artigo */}
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.noImage]}>
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

      {/* Botão de Rodapé Dinâmico */}
      <View style={styles.footer}>
        {isOwner ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => navigation.navigate('EditArticleScreen', { article })}
          >
            <Ionicons name="pencil-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.actionButtonText}>Editar Anúncio</Text>
          </TouchableOpacity>
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
  scrollContent: { paddingBottom: 90 },
  image: { width: '100%', height: 260 },
  noImage: { backgroundColor: '#f1f3f5', justifyContent: 'center', alignItems: 'center' },
  noImageText: { color: '#888', marginTop: 6 },
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8
  },
  messageButton: { backgroundColor: '#2e7d32' },
  editButton: { backgroundColor: '#007bff' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});