import React, { useState, useEffect, useRef } from 'react';
// Importação de ícones da biblioteca react-icons
import { FiX, FiTrash2, FiUpload } from 'react-icons/fi';
// Serviço para comunicação com a API
import api from '../services/api';
// Hook personalizado para carregar imagens
import useImageLoader from '../hooks/useImageLoader';
// Importação do ficheiro CSS para estilização
import '../styles/EditArticleModal.css';
// Importações necessárias para o componente de crop
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Componente para renderizar thumbnails com hook useImageLoader
const ThumbnailImage = ({ imagePath, onRemove, index }) => {
  // Utiliza hook para carregar a imagem
  const imageUrl = useImageLoader(imagePath);
  
  return (
    <>
      {imageUrl ? (
        <img src={imageUrl} alt={`Preview ${index}`} />
      ) : (
        <div className="loading-placeholder">Carregando...</div>
      )}
      <button
        type="button"
        className="remove-thumbnail"
        onClick={onRemove}
        aria-label="Remover imagem"
      >
        ×
      </button>
    </>
  );
};

// Componente principal EditArticleModal: Modal para edição de um artigo existente
// Recebe: o artigo a editar, categorias disponíveis, funções para fechar o modal e salvar alterações
const EditArticleModal = ({ article, categorias, onClose, onSave }) => {
  // Estado para os dados do formulário com valores predefinidos
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    estado: 'Novo',
    categoria_id: '',
    disponivel: true,
    validade_meses: 6
  });

  // Estados para gestão de imagens do modal
  const [previewImages, setPreviewImages] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showCropModal, setShowCropModal] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const [showLimitMessage, setShowLimitMessage] = useState(false);
  const fileInputRef = useRef(null);
  
  // Effect para inicializar o formulário com os dados do artigo quando este é carregado
  useEffect(() => {
    if (article) {
      setFormData({
        titulo: article.titulo,
        descricao: article.descricao,
        estado: article.estado,
        categoria_id: article.categoria?.id, // Operador opcional para evitar erro se categoria for null
        disponivel: article.disponivel,
        validade_meses: article.validade_meses
      });
      
      // Inicializar previews de imagens existentes
      if (article.fotos && article.fotos.length > 0) {
        const imagePreviews = article.fotos.map(foto => ({
          path: foto.caminho_foto, // Armazenar o caminho da imagem para o useImageLoader
          url: foto.caminho_foto.startsWith('blob:') ? foto.caminho_foto : null,
          file: null,
          id: foto.id // Armazenar ID para referência
        }));
        setPreviewImages(imagePreviews);
      }
    }
  }, [article]);

  // Função que gere a alteração da imagem, verificando limites e preparando para crop
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + previewImages.length > 5) {
      alert('Máximo de 5 imagens permitido!');
      return;
    }

    if (files.length > 0) {
      const file = files[0];
      const imageUrl = URL.createObjectURL(file);
      setCurrentImage({ file, url: imageUrl });
      setCurrentImageIndex(previewImages.length);
      setShowCropModal(true);
    }
  };

  // Função que gere o clique no botão de adicionar, verificando o limite de imagens
  const handleAddButtonClick = (e) => {
    e.preventDefault();
    
    if (previewImages.length >= 5) {
      setShowLimitMessage(true);
      setTimeout(() => setShowLimitMessage(false), 3000);
    } else {
      fileInputRef.current.click();
    }
  };

  // Função executada quando a imagem é carregada para definir o crop inicial
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

  // Cancelar operação de crop e limpar recursos
  const handleCancelCrop = () => {
    if (currentImage) URL.revokeObjectURL(currentImage.url);
    setShowCropModal(false);
    setCurrentImage(null);
    setCrop(undefined);
  };

  // Aplicar o crop selecionado e criar nova imagem recortada
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

    // Converter canvas para blob e adicionar à lista de imagens
    canvas.toBlob((blob) => {
      if (!blob) return;

      const croppedFile = new File([blob], currentImage.file.name, {
        type: currentImage.file.type,
        lastModified: Date.now(),
      });

      // Adicionar nova imagem aos previews e aos ficheiros selecionados
      const newPreview = { url: URL.createObjectURL(blob), file: croppedFile };
      setPreviewImages(prev => [...prev, newPreview]);
      setSelectedFiles(prev => [...prev, croppedFile]);

      // Limpar recursos e fechar modal
      URL.revokeObjectURL(currentImage.url);
      setShowCropModal(false);
      setCurrentImage(null);
      setCrop(undefined);
    }, currentImage.file.type);
  };

  // Função para remover uma imagem, seja nova ou existente
  const handleRemoveImage = (index) => {
    const imageToRemove = previewImages[index];
    
    // Para imagens geradas localmente, liberta os recursos
    if (imageToRemove.url && imageToRemove.url.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.url);
    }
    
    // Remove a imagem das listas
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Handle de submissão do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Atualizar dados básicos
      await api.put(`/artigos/${article.id}`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // Gerir exclusões de imagens existentes
      const existingPhotosToKeep = previewImages.filter(img => img.id);
      const photosToDelete = article.fotos ? article.fotos.filter(
        foto => !existingPhotosToKeep.find(img => img.id === foto.id)
      ) : [];
      
      // Excluir fotos marcadas para exclusão
      for (const foto of photosToDelete) {
        await api.delete(`/artigos/${article.id}/fotos/${foto.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }

      // Upload de novas imagens se houver
      if (selectedFiles.length > 0) {
        const formPayload = new FormData();
        selectedFiles.forEach((file) => formPayload.append('fotos', file));
        await api.post(`/artigos/${article.id}/fotos`, formPayload, {
          headers: { 
            'Content-Type': 'multipart/form-data', // Necessário para upload de ficheiros
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
        });
      }

      // Executa callbacks de sucesso e fecha modal
      onSave();
      onClose();
    } catch (error) {
      alert('Erro ao atualizar: ' + (error.response?.data?.message || error.message));
    }
  };

  // Renderização do componente
  return (
    <div className="edit-modal-overlay"> {/* Fundo escurecido do modal */}
      <div className="article-edit-modal"> {/* Conteúdo do modal */}
        <div className="modal-header">
          <h2 className="modal-title">Editar Artigo</h2>
          <button className="close-modal-button" onClick={onClose}>
          </button>
        </div>

        <div className="product-container">
          {/* Secção do formulário */}
          <div className="form-section">
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group required full-width">
                  <label>
                    Título
                    <span className="char-count">({formData.titulo.length}/25)</span> {/* Contador de caracteres */}
                  </label>
                  <input
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    maxLength="25"  // Limita a 25 caracteres
                    required // Campo obrigatório
                  />
                </div>

                <div className="form-group full-width">
                  <label>
                    Descrição
                    <span className="char-count">({formData.descricao.length}/100)</span> {/* Contador de caracteres */}
                  </label>
                  <div className="textarea-container">
                    <textarea
                    className="article-textarea"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      maxLength="100" // Limita a 100 caracteres
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Estado</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  >
                    <option value="Novo">Novo</option>
                    <option value="Usado">Usado</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Disponibilidade</label>
                  <select
                    value={formData.disponivel}
                    onChange={(e) => setFormData({ ...formData, disponivel: e.target.value === 'true' })}// Converte string para booleano
                  >
                    <option value={true}>Disponível</option>
                    <option value={false}>Indisponível</option>
                  </select>
                </div>

                <div className="form-group required">
                  <label>Categoria</label>
                  <select
                    value={formData.categoria_id}
                    onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                    required
                  >
                    {categorias.map(categoria => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Validade (meses)</label>
                  <input
                    type="number"
                    min="1" // Valor mínimo de 1 mês
                    value={formData.validade_meses}
                    onChange={(e) => setFormData({ ...formData, validade_meses: parseInt(e.target.value, 10) })} // Converte para inteiro
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={onClose}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save">
                  Guardar Alterações
                </button>
              </div>
            </form>
          </div>

          {/* Secção de gestão de imagens */}
          <div className="right-column">
            <div className="form-group">
              <label>Adicionar imagem ({previewImages.length}/5)</label>

              {/* Modal de recorte de imagem - visível apenas quando necessário */}
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
                  // Botão de adicionar centralizado quando não há imagem sendo cortada
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

              {/* Grelha de miniaturas - mostra até 5 imagens */}
              <div className="thumbnails-container">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="thumbnail-wrapper">
                    <div className={`thumbnail ${index < previewImages.length ? 'filled' : 'empty'}`}>
                      {index < previewImages.length ? (
                        previewImages[index].url ? (
                          // Para imagens novas (com blob URL)
                          <>
                            <img
                              src={previewImages[index].url}
                              alt={`Preview ${index}`}
                            />
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
                          // Para imagens existentes que precisam ser carregadas pelo hook
                          <ThumbnailImage
                            imagePath={previewImages[index].path}
                            onRemove={() => handleRemoveImage(index)}
                            index={index}
                          />
                        )
                      ) : (
                        <div className="empty-thumbnail"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

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
      </div>
    </div>
  );
};

export default EditArticleModal; // Exporta o componente para uso noutros ficheiros
