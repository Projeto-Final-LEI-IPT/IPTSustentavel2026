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
  Platform,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function CreateArticleScreen({ visible, onClose, onArticleCreated }) {
  const { t, translateCategory } = useLanguage();

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
      Alert.alert(t('error'), 'Não foi possível carregar as categorias.');
    }
  };

  // Selecionar imagem da galeria com corte quadrado nativo (1:1) e validação robusta de permissões
  const pickImage = async () => {
    if (photos.length >= 5) {
      Alert.alert(t('warning'), t('photoLimit'));
      return;
    }

    try {
      // 1. Verificar estado atual da permissão
      const currentStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
      let isGranted = currentStatus.granted;

      // 2. Pedir permissão ao sistema se ainda não concedida
      if (!isGranted) {
        // Deteta se o utilizador já bloqueou permanentemente (comum no APK)
        if (!currentStatus.canAskAgain && currentStatus.status === 'denied') {
          Alert.alert(
            t('permissionRequired'),
            t('galleryPermissionMsg'),
            [
              { text: t('cancel'), style: 'cancel' },
              { text: t('ok'), onPress: () => Linking.openSettings() }
            ]
          );
          return;
        }

        const requestStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
        isGranted = requestStatus.granted;
      }

      // 3. Se o utilizador recusou o acesso
      if (!isGranted) {
        Alert.alert(
          t('permissionRequired'),
          t('galleryPermissionMsg')
        );
        return;
      }

      // 4. Abrir seletor da galeria
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotos(prev => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Erro ao selecionar foto:', error);
      Alert.alert(t('error'), 'Ocorreu um erro ao tentar aceder à galeria.');
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
      const extension = filename.split('.').pop()?.toLowerCase();

      // Normalização estrita do tipo MIME
      let mimeType = 'image/jpeg';
      if (extension === 'png') mimeType = 'image/png';
      else if (extension === 'webp') mimeType = 'image/webp';
      else if (extension === 'gif') mimeType = 'image/gif';

      formData.append('fotos', {
        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        name: filename,
        type: mimeType
      });
    });

    await api.post(`/artigos/${articleId}/fotos`, formData, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      transformRequest: (data) => data
    });
  };

  // Submeter o artigo com validação obrigatória de foto
  const handleSubmit = async () => {
    if (!titulo.trim()) {
      Alert.alert(t('warning'), t('titleRequired'));
      return;
    }
    if (!categoriaId) {
      Alert.alert(t('warning'), t('categoryRequired'));
      return;
    }
    // REGRA: Pelo menos uma imagem obrigatória
    if (photos.length === 0) {
      Alert.alert(
        t('warning'),
        t('photoRequired')
      );
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

      // 2. Fazer upload das fotos
      if (newArticleId && photos.length > 0) {
        await uploadPhotos(newArticleId, token);
      }

      Alert.alert(t('success'), t('listingPublishedSuccess'));
      resetForm();
      onClose();
      if (onArticleCreated) onArticleCreated();
    } catch (error) {
      console.error('Erro ao criar artigo:', error);
      Alert.alert(t('error'), error.response?.data?.message || t('failedPublishListing'));
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
            <Text style={styles.headerTitle}>{t('createListingTitle')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Título */}
            <Text style={styles.label}>{t('listingTitleLabel')} ({25 - titulo.length})</Text>
            <TextInput
              style={styles.input}
              placeholder={t('listingTitlePlaceholder')}
              placeholderTextColor="#888"
              value={titulo}
              onChangeText={text => setTitulo(text.slice(0, 25))}
              maxLength={25}
            />

            {/* Categoria */}
            <Text style={styles.label}>{t('categoryLabel')}</Text>
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
                      {translateCategory(cat.nome)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Estado / Condição */}
            <Text style={styles.label}>{t('conditionLabel')}</Text>
            <View style={styles.row}>
              {['Novo', 'Usado'].map(cond => (
                <TouchableOpacity
                  key={cond}
                  style={[styles.stateBtn, estado === cond && styles.stateBtnActive]}
                  onPress={() => setEstado(cond)}
                >
                  <Text style={[styles.stateText, estado === cond && styles.stateTextActive]}>
                    {cond === 'Novo' ? t('new') : t('used')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Descrição */}
            <Text style={styles.label}>{t('descriptionLabel')} ({100 - descricao.length})</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t('descriptionPlaceholder')}
              placeholderTextColor="#888"
              value={descricao}
              onChangeText={text => setDescricao(text.slice(0, 100))}
              maxLength={100}
              multiline
              numberOfLines={4}
            />

            {/* Upload de Fotos - com indicação visual de obrigatoriedade */}
            <Text style={styles.label}>{t('photosLabel')} ({photos.length}/5)</Text>
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
                  <Text style={styles.addPhotoText}>{t('addPhoto')}</Text>
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
                <Text style={styles.submitBtnText}>{t('publishListing')}</Text>
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