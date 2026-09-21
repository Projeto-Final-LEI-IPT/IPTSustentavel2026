import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function CreateArticleScreen({ visible, onClose, onArticleCreated }) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [estado, setEstado] = useState('Novo'); // 'Novo' | 'Usado'
  const [photos, setPhotos] = useState([]); // Array de URIs locais
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Carregar lista de categorias
  useEffect(() => {
    if (visible) {
      fetchCategories();
    }
  }, [visible]);

  const fetchCategories = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await api.get('/categorias', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data || []);
      if (response.data?.length > 0) {
        setCategoriaId(response.data[0].id.toString());
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      Alert.alert('Erro', 'Não foi possível carregar as categorias.');
    }
  };

  // Selecionar imagem da galeria com corte quadrado nativo (1:1)
  const pickImage = async () => {
    if (photos.length >= 5) {
      Alert.alert('Limite atingido', 'Podes adicionar no máximo 5 imagens.');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso às tuas fotos para adicionar imagens.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  // Remover foto da lista temporária
  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Enviar imagens para o backend
  const uploadPhotos = async (articleId, token) => {
    if (photos.length === 0) return;

    const formData = new FormData();
    photos.forEach((uri, index) => {
      const filename = uri.split('/').pop() || `foto_${index}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('fotos', {
        uri,
        name: filename,
        type
      });
    });

    await api.post(`/artigos/${articleId}/fotos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`
      }
    });
  };

  // Submeter o artigo
  const handleSubmit = async () => {
    if (!titulo.trim()) {
      Alert.alert('Atenção', 'O título é obrigatório.');
      return;
    }
    if (!categoriaId) {
      Alert.alert('Atenção', 'Seleciona uma categoria.');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('userId');

      // 1. Criar o registo do artigo
      const response = await api.post('/artigos', {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        categoria_id: Number(categoriaId),
        estado,
        disponivel: true,
        validade_meses: 6,
        utilizador_id: Number(userId),
        data_publicacao: new Date()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newArticleId = response.data?.id;

      // 2. Fazer upload das fotos caso existam
      if (newArticleId && photos.length > 0) {
        await uploadPhotos(newArticleId, token);
      }

      Alert.alert('Sucesso', 'Anúncio publicado com sucesso!');
      resetForm();
      onClose();
      if (onArticleCreated) onArticleCreated();
    } catch (error) {
      console.error('Erro ao criar artigo:', error);
      Alert.alert('Erro', error.response?.data?.message || 'Falha ao publicar o artigo.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitulo('');
    setDescricao('');
    setEstado('Novo');
    setPhotos([]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Criar Novo Anúncio</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Título */}
            <Text style={styles.label}>Título do Anúncio * ({25 - titulo.length} rest.)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Livro de Cálculo I"
              placeholderTextColor="#888"
              value={titulo}
              onChangeText={text => setTitulo(text.slice(0, 25))}
              maxLength={25}
            />

            {/* Categoria */}
            <Text style={styles.label}>Categoria *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map(cat => {
                const isSelected = categoriaId === cat.id.toString();
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setCategoriaId(cat.id.toString())}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {cat.nome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Estado / Condição */}
            <Text style={styles.label}>Estado do Item</Text>
            <View style={styles.row}>
              {['Novo', 'Usado'].map(cond => (
                <TouchableOpacity
                  key={cond}
                  style={[styles.stateBtn, estado === cond && styles.stateBtnActive]}
                  onPress={() => setEstado(cond)}
                >
                  <Text style={[styles.stateText, estado === cond && styles.stateTextActive]}>
                    {cond}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Descrição */}
            <Text style={styles.label}>Descrição ({100 - descricao.length} rest.)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descreve o estado, detalhes ou motivo da troca..."
              placeholderTextColor="#888"
              value={descricao}
              onChangeText={text => setDescricao(text.slice(0, 100))}
              maxLength={100}
              multiline
              numberOfLines={4}
            />

            {/* Upload de Fotos */}
            <Text style={styles.label}>Fotografias ({photos.length}/5)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
              {photos.map((uri, index) => (
                <View key={index} style={styles.photoWrapper}>
                  <Image source={{ uri }} style={styles.thumbnail} />
                  <TouchableOpacity style={styles.removeBadge} onPress={() => removePhoto(index)}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}

              {photos.length < 5 && (
                <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
                  <Ionicons name="camera-outline" size={28} color="#2e7d32" />
                  <Text style={styles.addPhotoText}>Adicionar</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Botão de Submissão */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Publicar Anúncio</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#e9ecef'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529'
  },
  closeBtn: {
    padding: 4
  },
  scrollContent: {
    padding: 20
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
    marginTop: 12
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ced4da',
    paddingHorizontal: 12,
    height: 44,
    fontSize: 15,
    color: '#212529'
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 10
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: 6
  },
  chip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8
  },
  chipActive: {
    backgroundColor: '#2e7d32',
    borderColor: '#2e7d32'
  },
  chipText: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '500'
  },
  chipTextActive: {
    color: '#fff'
  },
  row: {
    flexDirection: 'row',
    gap: 12
  },
  stateBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  stateBtnActive: {
    backgroundColor: '#2e7d32',
    borderColor: '#2e7d32'
  },
  stateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057'
  },
  stateTextActive: {
    color: '#fff'
  },
  photosScroll: {
    flexDirection: 'row',
    marginTop: 6,
    marginBottom: 16
  },
  photoWrapper: {
    position: 'relative',
    marginRight: 12
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8
  },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#dc3545',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#2e7d32',
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  addPhotoText: {
    fontSize: 11,
    color: '#2e7d32',
    fontWeight: '600',
    marginTop: 2
  },
  submitBtn: {
    backgroundColor: '#2e7d32',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40
  },
  submitBtnDisabled: {
    opacity: 0.7
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  }
});