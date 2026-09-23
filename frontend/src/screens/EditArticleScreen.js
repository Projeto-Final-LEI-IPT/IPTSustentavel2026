import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';

export default function EditArticlescreen({ route, navigation }) {
  // Parâmetros recebidos da navegação
  const { article } = route.params;

  // Estados dos campos do formulário
  const [titulo, setTitulo] = useState(article.titulo || '');
  const [descricao, setDescricao] = useState(article.descricao || '');
  const [estado, setEstado] = useState(article.estado || 'Usado');
  const [categoriaId, setCategoriaId] = useState(article.categoria_id?.toString() || '');
  const [disponivel, setDisponivel] = useState(article.disponivel ?? true);
  const [categorias, setCategorias] = useState([]);
  
  // Imagem selecionada localmente e estado de carregamento
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Carregar categorias disponíveis da API
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const response = await api.get('/categorias');
        setCategorias(response.data || []);
      } catch (error) {
        console.error('Erro ao obter categorias:', error);
      }
    };
    fetchCategorias();
  }, []);

  // Selecionar nova imagem da galeria
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permissão necessária', 'É preciso permitir acesso à galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // Submeter as alterações
  const handleUpdate = async () => {
    if (!titulo.trim() || !categoriaId) {
      Alert.alert('Erro', 'O título e a categoria são obrigatórios.');
      return;
    }

    try {
      setLoading(true);

      // 1. Atualizar campos de texto via JSON através da rota PUT /api/artigos/:id
      await api.put(`/artigos/${article.id}`, {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        estado,
        categoria_id: Number(categoriaId),
        disponivel
      });

      // 2. Se foi selecionada uma nova foto, envia para a rota POST /api/artigos/:id/fotos
      if (selectedImage) {
        const formData = new FormData();
        const filename = selectedImage.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('fotos', {
          uri: selectedImage,
          name: filename,
          type
        });

        await api.post(`/artigos/${article.id}/fotos`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      Alert.alert('Sucesso', 'Artigo atualizado com sucesso!', [
        { text: 'OK', onPress: () => navigation.navigate('Main') }
      ]);
    } catch (error) {
      console.error('Erro ao atualizar artigo:', error);
      Alert.alert('Erro', error.response?.data?.message || 'Falha ao atualizar o artigo.');
    } finally {
      setLoading(false);
    }
  };

  // Resolve a imagem atual vinda da pasta pictures do backend
  const fotoAtual = article.fotos?.[0]?.caminho_foto;
  const initialImageUri = fotoAtual?.startsWith('http')
    ? fotoAtual
    : fotoAtual
    ? `${api.defaults.baseURL.replace('/api', '')}/pictures/${fotoAtual}`
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#2e7d32" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Pré-visualização e seleção da imagem */}
        <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage} activeOpacity={0.8}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          ) : initialImageUri ? (
            <Image source={{ uri: initialImageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="camera-outline" size={40} color="#888" />
              <Text style={styles.placeholderText}>Alterar Fotografia</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Título */}
        <Text style={styles.label}>Título do Anúncio *</Text>
        <TextInput
          style={styles.input}
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Ex: Livro de Cálculo"
        />

        {/* Categoria */}
        <Text style={styles.label}>Categoria *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {categorias.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, categoriaId === cat.id.toString() && styles.chipActive]}
              onPress={() => setCategoriaId(cat.id.toString())}
            >
              <Text style={[styles.chipText, categoriaId === cat.id.toString() && styles.chipTextActive]}>
                {cat.nome}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Condição */}
        <Text style={styles.label}>Condição</Text>
        <View style={styles.conditionRow}>
          {['Novo', 'Usado'].map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.conditionBtn, estado === item && styles.conditionBtnActive]}
              onPress={() => setEstado(item)}
            >
              <Text style={[styles.conditionText, estado === item && styles.conditionTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Disponibilidade */}
        <View style={styles.switchRow}>
          <Text style={styles.label}>Disponível para troca/doação</Text>
          <Switch
            value={disponivel}
            onValueChange={setDisponivel}
            trackColor={{ false: '#767577', true: '#81c784' }}
            thumbColor={disponivel ? '#2e7d32' : '#f4f3f4'}
          />
        </View>

        {/* Descrição */}
        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Detalhes sobre o estado do artigo, etc."
          multiline
          numberOfLines={4}
        />

        {/* Botão de Guardar Alterações */}
        <TouchableOpacity style={styles.saveButton} onPress={handleUpdate} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar Alterações</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 16 },
  imagePicker: {
    height: 190,
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderImage: { alignItems: 'center' },
  placeholderText: { marginTop: 6, color: '#666', fontSize: 13 },
  label: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    padding: 10,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: '#fff'
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', marginBottom: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    marginRight: 8
  },
  chipActive: { backgroundColor: '#2e7d32' },
  chipText: { fontSize: 13, color: '#495057' },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  conditionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  conditionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#e9ecef'
  },
  conditionBtnActive: { backgroundColor: '#2e7d32' },
  conditionText: { fontSize: 14, color: '#495057', fontWeight: '600' },
  conditionTextActive: { color: '#fff' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  saveButton: {
    backgroundColor: '#2e7d32',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});