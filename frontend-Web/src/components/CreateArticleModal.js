import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import '../styles/CreateArticleModal.css';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Componente modal para criação de novos artigos
// Recebe como props a função para fechar o modal e o ID do utilizador
const CreateArticleModal = ({ onClose, userId, onArticleCreated }) => {
  // Estado para armazenar os dados do formulário
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    categoria_id: '',
    estado: 'Novo',
    fotos: []
  });

  // Estados para armazenar informações de imagens, categorias e gestão do modal
  const [currentImageIndex, setCurrentImageIndex] = useState(null);
  const [categories, setCategories] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [showLimitMessage, setShowLimitMessage] = useState(false);
  const fileInputRef = useRef(null);

  // Hook de efeito para carregar as categorias quando o componente é montado
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await api.get('/categorias');
        setCategories(response.data);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        alert('Erro ao carregar categorias');
      }
    };
    loadCategories();
  }, []);

  // Função para tratar a mudança de imagens
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    // Verifica se o número total de imagens não excede o limite de 5
    if (files.length + previewImages.length > 5) {
      alert('Máximo de 5 imagens permitido!');
      return;
    }

    if (files.length > 0) {
      const file = files[0];
      const imageUrl = URL.createObjectURL(file);
      setCurrentImage({ file, url: imageUrl });
      setCurrentImageIndex(previewImages.length);
      setShowCropModal(true); // Mostra o modal de corte imediatamente
    }
  };

  // Função para acionar o seletor de ficheiros ao clicar no botão de adicionar
  const handleAddButtonClick = (e) => {
    e.preventDefault(); // Importante para evitar comportamentos padrão
    
    if (previewImages.length >= 5) {
      setShowLimitMessage(true);
      setTimeout(() => setShowLimitMessage(false), 3000);
    } else {
      // Acionar o input file diretamente
      fileInputRef.current.click();
    }
  };

  // Função executada quando a imagem é carregada no componente de corte
  const onImageLoad = (e) => {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
      width,
      height
    );
    setCrop(crop);
  };

  // Função para cancelar a operação de corte da imagem
  const handleCancelCrop = () => {
    if (currentImage) URL.revokeObjectURL(currentImage.url);
    setShowCropModal(false);
    setCurrentImage(null);
    setCrop(undefined);
  };

  // Função para aplicar o corte selecionado na imagem
  const handleApplyCrop = async () => {
    if (!completedCrop || !imgRef.current || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    canvas.toBlob((blob) => {
      if (!blob) return;

      // Cria um novo ficheiro com a imagem cortada
      const croppedFile = new File([blob], currentImage.file.name, {
        type: currentImage.file.type,
        lastModified: Date.now(),
      });

      // Atualiza os estados com a nova imagem cortada
      const newPreview = { url: URL.createObjectURL(blob), file: croppedFile };
      setPreviewImages(prev => [...prev, newPreview]);
      setSelectedFiles(prev => [...prev, croppedFile]);

      URL.revokeObjectURL(currentImage.url);
      setShowCropModal(false);
      setCurrentImage(null);
      setCrop(undefined);
    }, currentImage.file.type);
  };

  // Função para remover uma imagem da lista
  const handleRemoveImage = (index) => {
    URL.revokeObjectURL(previewImages[index].url);
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Função para fazer upload das imagens para o servidor
  const uploadImages = async (artigoId) => {
    try {
      const formPayload = new FormData();
      selectedFiles.forEach((file) => formPayload.append('fotos', file));
      await api.post(`/artigos/${artigoId}/fotos`, formPayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (error) {
      console.error('Erro no upload da imagem:', error);
    }
  };

  // Função para processar o envio do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Verifica se os campos obrigatórios estão preenchidos
    if (!formData.titulo.trim() || !formData.categoria_id) {
      alert('Preencha todos os campos obrigatórios!');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/artigos', {
        ...formData,
        categoria_id: Number(formData.categoria_id),
        utilizador_id: userId,
        data_publicacao: new Date(),
        fotos: []
      });

      if (selectedFiles.length > 0) {
        await uploadImages(response.data.id);
      }

      onClose();
      if (onArticleCreated) onArticleCreated();
    } catch (error) {
      console.error('Erro ao criar artigo:', error);
      alert('Erro ao criar artigo: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Renderização do componente
  return (
    <div className="create-modal-overlay">
      <div className="create-article-modal">
        {/* Cabeçalho do modal com título e botão para fechar */}
        <div className="modal-header">
          <h2 className="modal-title">Criar Novo Artigo</h2>
          <button className="close-modal-button" onClick={onClose}></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-container">
            {/* Coluna Esquerda - Formulário */}
            <div className="left-column">
              <div className="form-grid">
                <div className="form-row">
                  {/* Campo de título com contador de caracteres restantes */}
                  <div className="form-group">
                    <label>Título* ({25 - formData.titulo.length} restantes)</label>
                    <input
                      type="text"
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value.slice(0, 25) })}
                      placeholder="Ex: Sofá em couro sintético"
                      className="article-input"
                      required
                      maxLength="25"
                    />
                  </div>

                  <div className="right-aligned-group">
                    {/* Dropdown para selecionar categoria */}
                    <div className="form-group category-group ">
                      <label>Categoria*</label>
                      <select
                        value={formData.categoria_id}
                        onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                        className="article-select"
                        required
                      >
                        <option value="">Selecione</option>
                        {categories.map(categoria => (
                          <option key={categoria.id} value={categoria.id}>
                            {categoria.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Dropdown para selecionar estado do artigo (novo/usado) */}
                    <div className="form-group state-group">
                      <label>Estado*</label>
                      <select
                        value={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        className="article-select"
                        required
                      >
                        <option value="Novo">Novo</option>
                        <option value="Usado">Usado</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Campo de descrição com contador de caracteres restantes */}
                  <label>Descrição ({100 - formData.descricao.length} restantes)</label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({
                      ...formData,
                      descricao: e.target.value.replace(/[\r\n]/g, ' ').slice(0, 100)
                    })}
                    className="article-textarea full-width"
                    placeholder="Descreva detalhes do artigo (máx. 100 caracteres)"
                    maxLength="100"
                    rows="5"
                  />
                  
                  {/* Botões de ação do formulário */}
                  <div className="modal-actions">
                    <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn-save" disabled={loading}>
                      {loading ? 'Publicando...' : 'Publicar Artigo'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Direita - Upload de Imagens + Corte */}
            <div className="right-column">
              <div className="form-group">
                <label>Adicionar imagem ({previewImages.length}/5)</label>

                {/* Área de corte da imagem - visível apenas quando necessário */}
                <div className="crop-modal-overlay">
                  {showCropModal && currentImage ? (
                    <div className="crop-modal">
                      <div className="crop-container">
                        <ReactCrop
                          crop={crop}
                          onChange={(c) => setCrop(c)}
                          onComplete={(c) => setCompletedCrop(c)}
                          aspect={1}
                          circularCrop={false}
                        >
                          <img
                            src={currentImage.url}
                            onLoad={onImageLoad}
                            style={{ maxHeight: '300px', maxWidth: '100%' }}
                            alt="Imagem para cortar"
                          />
                        </ReactCrop>
                        <canvas ref={previewCanvasRef} style={{ display: 'none' }} />
                      </div>

                      {/* Botões para cancelar ou aplicar o corte */}
                      <div className="crop-actions">
                        <button type="button" className="btn-cancel" onClick={handleCancelCrop}>
                          Cancelar
                        </button>
                        <button type="button" className="btn-save" onClick={handleApplyCrop}>
                          Aplicar
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Botão para adicionar nova imagem
                    <div className="add-image-centered">
                      <div 
                        className="add-button-centered"
                        onClick={handleAddButtonClick}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#007bff" strokeWidth="2">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        {showLimitMessage && (
                          <div className="limit-tooltip">Limite de 5 imagens atingido!</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Área de pré-visualização das miniaturas de imagens */}
                <div className="thumbnails-container">
                  {[...Array(5)].map((_, index) => (
                    <div key={index} className="thumbnail-wrapper">
                      <div className={`thumbnail ${index < previewImages.length ? 'filled' : 'empty'}`}>
                        {index < previewImages.length ? (
                          <>
                            <img
                              src={previewImages[index].url}
                              alt={`Preview ${index}`}
                            />
                            {/* Botão para remover imagem */}
                            <button
                              type="button"
                              className="remove-thumbnail"
                              onClick={() => handleRemoveImage(index)}
                              aria-label="Remover imagem"
                            >
                              ×
                            </button>
                          </>
                        ) : (
                          <div className="empty-thumbnail"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input de ficheiro oculto - acionado pelo botão de adicionar */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={previewImages.length >= 5}
                  style={{ display: 'none' }}
                  id="fileInput"
                  ref={fileInputRef}
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateArticleModal;