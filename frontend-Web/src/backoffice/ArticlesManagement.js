import React, { useState, useEffect, useRef } from 'react';
import { FiEdit, FiTrash2, FiPlus, FiImage, FiX, FiChevronLeft, FiChevronRight, FiAlertTriangle, FiCheckCircle, FiFilter, FiSearch } from 'react-icons/fi';
import api from '../services/api';
import useImageLoader from '../hooks/useImageLoader';
import '../styles/backoffice/ArticlesManagement.css'

const ArticlesManagement = () => {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newArticle, setNewArticle] = useState({
    titulo: '',
    descricao: '',
    estado: 'Novo',
    categoria_id: '',
    disponivel: true,
    validade_meses: 6
  });
  const [editingArticle, setEditingArticle] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPhotos, setModalPhotos] = useState([]);
  const [filters, setFilters] = useState({
    titulo: '',
    categoria_id: 'all',
    estado: 'all',
    disponivel: 'all'
  });
  const [searchTimeout, setSearchTimeout] = useState(null);
  const formRef = useRef(null);
  const topRef = useRef(null);
  const [utilizadores, setUtilizadores] = useState([]);
  
  // Constantes
  const ITEMS_PER_PAGE = 3;
  const MAX_PHOTOS = 5;
  const MAX_TITLE_LENGTH = 25;
  const MAX_DESC_LENGTH = 100;

// useEffect para carregar os utilizadores
useEffect(() => {
  const loadUtilizadores = async () => {
    try {
      const utilizadoresRes = await api.get('/utilizadores');
      setUtilizadores(utilizadoresRes.data);
    } catch (err) {
      console.error('Erro ao carregar utilizadores:', err);
    }
  };

  loadUtilizadores();
}, []);

  
  // Limpar notificações após um tempo
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000); // 5 segundos

      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const scrollToTop = () => {
    // Método 1: força o scroll para o topo absoluto (0,0) imediatamente
    window.scrollTo({
      top: 0,
      behavior: 'auto' // Scroll imediato em vez de smooth para garantir
    });

    // Método 2 após curto delay - usa o elemento de âncora
    setTimeout(() => {
      if (topRef.current) {
        topRef.current.scrollIntoView({
          behavior: 'auto',
          block: 'start'
        });
      }

      // Método 3 após outro delay - força novamente com scrollTo
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: 'auto'
        });

        // Método 4 - Usa requestAnimationFrame para garantir após renderização
        requestAnimationFrame(() => {
          window.scrollTo(0, 0);

          // Método 5 - Última tentativa para garantir
          document.body.scrollTop = 0; // Para Safari
          document.documentElement.scrollTop = 0; // Para Chrome, Firefox, IE e Opera
        });
      }, 50);
    }, 50);
  };

  // Iniciar edição com scroll para o topo e limpeza de formulário
  const handleStartEdit = async (article) => {
    // Primeiro limpa o formulário completamente
    setPhotos([]);
    setError('');
    setSuccess('');
    
    // Scroll para o topo
    scrollToTop();
    
    // Após um pequeno delay, procura dados atualizados e preenche o formulário
    setTimeout(async () => {
      try {
        setLoading(true);
        // Procurar dados atualizados do artigo para garantir a versão mais recente
        const response = await api.get(`/artigos/${article.id}`);
        const freshArticleData = response.data;
        
        // Define o artigo para edição
        setEditingArticle(freshArticleData);
        setLoading(false);
        
        // Focus no primeiro input após o DOM ser atualizado
        setTimeout(() => {
          if (formRef.current) {
            const input = formRef.current.querySelector('input');
            if (input) {
              input.focus();
            }
          }
          
          // Garantia extra de scroll
          window.scrollTo(0, 0);
        }, 300);
      } catch (err) {
        setError('Erro ao carregar dados do artigo');
        setLoading(false);
        console.error(err);
      }
    }, 100);
  };

  // Limpar filtros
  const handleClearFilters = () => {
    setFilters({
      titulo: '',
      categoria_id: 'all',
      estado: 'all',
      disponivel: 'all'
    });
    setPage(1);
  };

  // Carregar artigos com filtros
  useEffect(() => {
    const loadArticles = async () => {
      setLoading(true);
      try {
        // Construir query params baseado nos filtros
        let queryParams = `page=${page}&limit=${ITEMS_PER_PAGE}&isBackoffice=true`;
        
        if (filters.titulo) {
          queryParams += `&titulo=${encodeURIComponent(filters.titulo)}`;
        }
        
        if (filters.categoria_id !== 'all') {
          queryParams += `&categoria_id=${filters.categoria_id}`;
        }
        
        if (filters.estado !== 'all') {
          queryParams += `&estado=${filters.estado}`;
        }
        
        // Incluir disponivel como parâmetro de query (igual ao estado)
        if (filters.disponivel !== 'all') {
          queryParams += `&disponivel=${filters.disponivel}`;
        }

        const articlesRes = await api.get(`/artigos?${queryParams}`);
        
       
        setArticles(articlesRes.data.artigos || []);
        setTotalPages(articlesRes.data.pagination?.totalPages || 1);
        setTotalItems(articlesRes.data.pagination?.totalItems || 0);
      } catch (err) {
        setError('Erro ao carregar artigos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadArticles();
  }, [page, filters, ITEMS_PER_PAGE]);

  // Carregar categorias
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesRes = await api.get('/categorias');
        setCategories(categoriesRes.data);
      } catch (err) {
        console.error('Erro ao carregar categorias:', err);
      }
    };

    loadCategories();
  }, []);

  // Título change com contador
  const handleTitleChange = (e) => {
    const value = e.target.value.slice(0, MAX_TITLE_LENGTH);
    if (editingArticle) {
      setEditingArticle({ ...editingArticle, titulo: value });
    } else {
      setNewArticle({ ...newArticle, titulo: value });
    }
  };

  // Description change com contador
  const handleDescriptionChange = (e) => {
    const value = e.target.value.replace(/[\r\n]/g, ' ').slice(0, MAX_DESC_LENGTH);
    if (editingArticle) {
      setEditingArticle({ ...editingArticle, descricao: value });
    } else {
      setNewArticle({ ...newArticle, descricao: value });
    }
  };
  
  // Filtro de pesquisa com debounce
  const handleSearchChange = (e) => {
    const value = e.target.value;
    
    // Limpar o timeout anterior se existir
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Definir novo timeout de 500ms para aplicar o filtro
    const timeout = setTimeout(() => {
      setFilters({...filters, titulo: value});
      setPage(1); // Reset para a primeira página ao filtrar
    }, 500);
    
    setSearchTimeout(timeout);
    
    // Atualizar o campo visualmente imediatamente (para UX)
    setFilters(prev => ({...prev, titulo: value}));
  };

  // Fechar notificações
  const closeNotification = (type) => {
    if (type === 'error') {
      setError('');
    } else {
      setSuccess('');
    }
  };

  // Criar artigo
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newArticle.titulo || !newArticle.categoria_id || !newArticle.utilizador_id) {
      setError('Título, categoria e proprietário são obrigatórios');
      return;
    }

    try {
      const response = await api.post('/artigos', newArticle);

      // Se tiver fotos, fazer upload
      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach(photo => {
          formData.append('fotos', photo);
        });

        await api.post(`/artigos/${response.data.id}/fotos`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      // Atualizar a lista de artigos
      const articlesRes = await api.get(`/artigos?page=${page}&limit=${ITEMS_PER_PAGE}`);
      setArticles(articlesRes.data.artigos || []);
      setTotalItems(articlesRes.data.pagination.totalItems);

      // Resetar o formulário
      setNewArticle({
        titulo: '',
        descricao: '',
        estado: 'Novo',
        categoria_id: '',
        disponivel: true,
        validade_meses: 6,
        utilizador_id: ''
      });
      setPhotos([]);
      setError('');
      setSuccess('Artigo adicionado com sucesso!');
    } catch (err) {
      setError('Erro ao criar artigo');
      console.error(err);
    }
  };

  // Atualizar artigo
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingArticle.titulo || !editingArticle.categoria_id) {
      setError('Título e categoria são obrigatórios');
      return;
    }

    try {
      await api.put(`/artigos/${editingArticle.id}`, editingArticle);

      // Se tiver novas fotos, fazer upload
      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach(photo => {
          formData.append('fotos', photo);
        });

        await api.post(`/artigos/${editingArticle.id}/fotos`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      // Atualizar a lista de artigos
      const articlesRes = await api.get(`/artigos?page=${page}&limit=${ITEMS_PER_PAGE}`);
      setArticles(articlesRes.data.artigos || []);
      setTotalItems(articlesRes.data.pagination?.totalItems || 0);

      // Resetar estado de edição
      setEditingArticle(null);
      setPhotos([]);
      setError('');
      setSuccess('Artigo atualizado com sucesso!');
    } catch (err) {
      setError('Erro ao atualizar artigo');
      console.error(err);
    }
  };

  // Apagar artigo
  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este artigo?')) {
      try {
        await api.delete(`/artigos/${id}`);
        const articlesRes = await api.get(`/artigos?page=${page}&limit=${ITEMS_PER_PAGE}`);
        setArticles(articlesRes.data.artigos || []);
        setTotalItems(articlesRes.data.pagination?.totalItems || 0);
        setSuccess('Artigo excluído com sucesso!');
      } catch (err) {
        setError('Erro ao excluir artigo');
        console.error(err);
      }
    }
  };

  // Apagar foto
  const handleDeletePhoto = async (articleId, photoId) => {
    if (window.confirm('Tem certeza que deseja excluir esta foto?')) {
      try {
        await api.delete(`/artigos/${articleId}/fotos/${photoId}`);

        // Atualizar as fotos do artigo em edição
        if (editingArticle && editingArticle.id === articleId) {
          setEditingArticle({
            ...editingArticle,
            fotos: editingArticle.fotos.filter(foto => foto.id !== photoId)
          });
        }

        // Atualizar a lista de artigos
        setArticles(articles.map(article => {
          if (article.id === articleId) {
            return {
              ...article,
              fotos: article.fotos.filter(foto => foto.id !== photoId)
            };
          }
          return article;
        }));

        setSuccess('Foto excluída com sucesso!');
      } catch (err) {
        setError('Erro ao excluir foto');
        console.error(err);
      }
    }
  };

  // Selecionar fotos com limite de 5
  const handlePhotoSelect = (e) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files);
      const totalPhotos = photos.length + newPhotos.length;
      const existingPhotosCount = editingArticle?.fotos?.length || 0;

      if (totalPhotos + existingPhotosCount > MAX_PHOTOS) {
        setError(`Você só pode adicionar no máximo ${MAX_PHOTOS} fotos por artigo.`);
        // Adicionar apenas o número de fotos permitido
        const allowedNewPhotos = Math.max(0, MAX_PHOTOS - photos.length - existingPhotosCount);
        setPhotos([...photos, ...newPhotos.slice(0, allowedNewPhotos)]);
      } else {
        setPhotos([...photos, ...newPhotos]);
        setError('');

        // Verificar se chegou exatamente ao limite após adicionar as novas fotos
        const updatedTotalPhotos = photos.length + newPhotos.length + existingPhotosCount;
        if (updatedTotalPhotos === MAX_PHOTOS) {
          setSuccess(`Limite máximo de ${MAX_PHOTOS} fotos atingido!`);
        }
      }
    }
  };

  // Remover foto selecionada antes do upload
  const removeSelectedPhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setError(''); // Limpar erro caso esteja relacionado ao limite de fotos
  };

  // Paginação
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Abrir modal de fotos
  const openPhotoModal = (photos) => {
    setModalPhotos(photos);
    setModalOpen(true);
  };

  // Fechar modal de fotos
  const closePhotoModal = () => {
    setModalOpen(false);
  };

  const ArticlePhoto = ({ photo }) => {
    const imageUrl = useImageLoader(photo.caminho_foto);

    return (
      <div className="am-article-photo">
        {imageUrl ? (
          <img src={imageUrl} alt="Article" />
        ) : (
          <div className="am-photo-placeholder">Loading...</div>
        )}
      </div>
    );
  };

  // Componente Photo Modal
  const PhotoModal = ({ isOpen, photos, onClose }) => {
    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
      if (e.target.classList.contains('am-photo-modal-backdrop')) {
        onClose();
      }
    };

    return (
      <div className="am-photo-modal-backdrop" onClick={handleBackdropClick}>
        <div className="am-photo-modal-content">
          <button className="am-photo-modal-close" onClick={onClose}>
            <FiX />
          </button>
          <div className="am-photo-modal-grid">
            {photos.map((photo, index) => (
              <div key={index} className="am-photo-modal-item" onClick={onClose}>
                <ArticlePhoto photo={photo} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Elemento invisível para referência do topo - com posicionamento fixo */}
      <div ref={topRef} id="top-of-form" className="am-top-anchor"></div>

      <div className="backoffice-content-header">
        <h2 className="backoffice-content-title">Gestão de Artigos</h2>
        <div className="actions">
          {/* Botões de ação se necessário */}
        </div>
      </div>

      {/* Notificações */}
      <div className="am-notifications-container">
        {error && (
          <div className="am-notification am-notification-error">
            <div className="am-notification-icon">
              <FiAlertTriangle />
            </div>
            <div className="am-notification-content">{error}</div>
            <button
              className="am-notification-close"
              onClick={() => closeNotification('error')}
            >
              <FiX />
            </button>
          </div>
        )}

        {success && (
          <div className="am-notification am-notification-success">
            <div className="am-notification-icon">
              <FiCheckCircle />
            </div>
            <div className="am-notification-content">{success}</div>
            <button
              className="am-notification-close"
              onClick={() => closeNotification('success')}
            >
              <FiX />
            </button>
          </div>
        )}
      </div>

      <div className="backoffice-content-section">
        <form
          ref={formRef}
          onSubmit={editingArticle ? handleUpdate : handleCreate}
          className="am-article-form"
        >
          <div className="am-form-group">
            <label htmlFor="titulo">
              Título do Artigo* ({MAX_TITLE_LENGTH - (editingArticle ? editingArticle.titulo.length : newArticle.titulo.length)} restantes)
            </label>
            <input
              id="titulo"
              type="text"
              placeholder="Digite o título do artigo"
              value={editingArticle ? editingArticle.titulo : newArticle.titulo}
              onChange={handleTitleChange}
              maxLength={MAX_TITLE_LENGTH}
              required
            />
          </div>

          <div className="am-form-group">
            <label htmlFor="descricao">
              Descrição ({MAX_DESC_LENGTH - (editingArticle ? editingArticle.descricao.length : newArticle.descricao.length)} restantes)
            </label>
            <textarea
              id="descricao"
              placeholder="Digite a descrição do artigo"
              value={editingArticle ? editingArticle.descricao : newArticle.descricao}
              onChange={handleDescriptionChange}
              maxLength={MAX_DESC_LENGTH}
            />
          </div>

          <div className="am-form-group">
            <label htmlFor="categoria">Categoria*</label>
            <select
              id="categoria"
              value={editingArticle ? editingArticle.categoria_id : newArticle.categoria_id}
              onChange={(e) => editingArticle
                ? setEditingArticle({ ...editingArticle, categoria_id: e.target.value })
                : setNewArticle({ ...newArticle, categoria_id: e.target.value })}
              required
            >
              <option value="">Selecione uma categoria</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.nome}
                </option>
              ))}
            </select>
          </div>
                
      <div className="am-form-group">
        <label htmlFor="proprietario">Proprietário*</label>
        <select
          id="proprietario"
          value={editingArticle ? editingArticle.utilizador_id : newArticle.utilizador_id}
          onChange={(e) => editingArticle
            ? setEditingArticle({ ...editingArticle, utilizador_id: e.target.value })
            : setNewArticle({ ...newArticle, utilizador_id: e.target.value })}
          required
        >
          <option value="">Selecione um proprietário</option>
          {utilizadores.map(utilizador => (
            <option key={utilizador.id} value={utilizador.id}>
              {utilizador.nome} ({utilizador.email})
            </option>
          ))}
        </select>
      </div>
            
          <div className="am-form-group">
            <label htmlFor="estado">Estado</label>
            <select
              id="estado"
              value={editingArticle ? editingArticle.estado : newArticle.estado}
              onChange={(e) => editingArticle
                ? setEditingArticle({ ...editingArticle, estado: e.target.value })
                : setNewArticle({ ...newArticle, estado: e.target.value })}
            >
              <option value="Novo">Novo</option>
              <option value="Usado">Usado</option>
            </select>
          </div>

          <div className="am-form-row">
            <label>
              <input
                type="checkbox"
                checked={editingArticle ? editingArticle.disponivel : newArticle.disponivel}
                onChange={(e) => editingArticle
                  ? setEditingArticle({ ...editingArticle, disponivel: e.target.checked })
                  : setNewArticle({ ...newArticle, disponivel: e.target.checked })}
              />
              Disponível
            </label>

            <div className="am-validade-field">
              <label>Validade (meses):</label>
              <input
                type="number"
                min="1"
                max="24"
                value={editingArticle ? editingArticle.validade_meses : newArticle.validade_meses}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10) || 1;
                  editingArticle
                    ? setEditingArticle({ ...editingArticle, validade_meses: value })
                    : setNewArticle({ ...newArticle, validade_meses: value });
                }}
              />
            </div>
          </div>

          <div className="am-photo-upload-section">
            <label>
              Fotografias ({MAX_PHOTOS - photos.length - (editingArticle?.fotos?.length || 0)} restantes)
            </label>
            <label className="am-file-upload-label">
              <FiImage /> Adicionar fotos
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoSelect}
                style={{ display: 'none' }}
                disabled={photos.length + (editingArticle?.fotos?.length || 0) >= MAX_PHOTOS}
              />
            </label>

            <div className="am-selected-photos">
              {photos.map((photo, index) => (
                <div key={index} className="am-selected-photo">
                  <img src={URL.createObjectURL(photo)} alt="Selected" />
                  <button
                    type="button"
                    className="am-remove-photo-btn"
                    onClick={() => removeSelectedPhoto(index)}
                  >
                    <FiX />
                  </button>
                </div>
              ))}
            </div>

            {/* Mostrar fotos existentes quando estiver editando */}
            {editingArticle && editingArticle.fotos && (
              <div className="am-existing-photos">
                <h4>Fotos existentes:</h4>
                <div className="am-photos-grid">
                  {editingArticle.fotos.map(photo => (
                    <div key={photo.id} className="am-existing-photo">
                      <ArticlePhoto photo={photo} />
                      <button
                        type="button"
                        className="am-remove-photo-btn"
                        onClick={() => handleDeletePhoto(editingArticle.id, photo.id)}
                      >
                        <FiX />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="am-form-actions">
            {editingArticle ? (
              <>
                <button type="submit" className="backoffice-btn backoffice-btn-edit">
                  <FiEdit /> Atualizar
                </button>
                <button
                  type="button"
                  className="backoffice-btn backoffice-btn-delete"
                  onClick={() => {
                    setEditingArticle(null);
                    setPhotos([]);
                  }}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button type="submit" className="backoffice-btn backoffice-btn-edit">
                <FiPlus /> Adicionar Artigo
              </button>
            )}
          </div>
        </form>

        {/* Sistema de Filtros */}
        <div className="am-filters-section">
          <div className="am-filters-header">
            <h3><FiFilter /> Filtros</h3>
            <button 
              className="am-filters-reset"
              onClick={handleClearFilters}
              type="button"
            >
              Limpar filtros
            </button>
          </div>
          <div className="am-filters-grid">
            <div className="am-filter-item">
              <label htmlFor="filter-search">Pesquisar por título</label>
              <div className="am-search-container">
                <FiSearch className="am-search-icon" />
                <input 
                  type="text"
                  id="filter-search"
                  placeholder="Digite para pesquisar"
                  className="am-filter-input"
                  value={filters.titulo}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
            
            <div className="am-filter-item">
              <label htmlFor="filter-category">Categoria</label>
              <select 
                id="filter-category"
                className="am-filter-select"
                value={filters.categoria_id} 
                onChange={(e) => {
                  setFilters({...filters, categoria_id: e.target.value});
                  setPage(1); // Reset para a primeira página
                }}
              >
                <option value="all">Todas as categorias</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.nome}</option>
                ))}
              </select>
            </div>
            
            <div className="am-filter-item">
              <label htmlFor="filter-status">Estado</label>
              <select 
                id="filter-status"
                className="am-filter-select"
                value={filters.estado} 
                onChange={(e) => {
                  setFilters({...filters, estado: e.target.value});
                  setPage(1); // Reset para a primeira página
                }}
              >
                <option value="all">Todos os estados</option>
                <option value="Novo">Novo</option>
                <option value="Usado">Usado</option>
              </select>
            </div>
            
            <div className="am-filter-item">
              <label htmlFor="filter-availability">Disponibilidade</label>
              <select 
                id="filter-availability"
                className="am-filter-select"
                value={filters.disponivel} 
                onChange={(e) => {
                  setFilters({...filters, disponivel: e.target.value});
                  setPage(1); // Reset para a primeira página
                }}
              >
                <option value="all">Todas</option>
                <option value="true">Disponível</option>
                <option value="false">Indisponível</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de artigos */}
        <div className="am-articles-grid">
          {loading ? (
            <div className="am-loading">Carregando...</div>
          ) : articles.length === 0 ? (
            <div className="am-empty-state">
              Nenhum artigo encontrado com os filtros selecionados
            </div>
          ) : (
            articles.map(article => (
              <div
                key={article.id}
                className={`am-article-card ${editingArticle && editingArticle.id === article.id ? 'am-article-card-editing' : ''}`}
              >
                <div className="am-card-content">
                  <h3>{article.titulo}</h3>

                  <div className="am-card-meta-item">
                    <span className="am-meta-label">Estado:</span>
                    <span className={`am-article-status am-status-${article.estado.toLowerCase()}`}>
                      {article.estado}
                    </span>
                  </div>

                  <div className="am-card-meta-item">
                    <span className="am-meta-label">Categoria:</span>
                    <span className="am-article-category">
                      {article.categoria ? article.categoria.nome : 'N/A'}
                    </span>
                  </div>

                  <div className="am-card-meta-item">
                    <span className="am-meta-label">Disponibilidade:</span>
                    <span className={`am-article-availability ${article.disponivel ? 'am-available' : 'am-unavailable'}`}>
                      {article.disponivel ? 'Disponível' : 'Indisponível'}
                    </span>
                  </div>

                  {article.descricao && (
                    <div className="am-card-meta-item">
                      <span className="am-meta-label">Descrição:</span>
                      <p className="am-article-description">{article.descricao}</p>
                    </div>
                  )}

                  {article.fotos && article.fotos.length > 0 && (
                    <div
                      className="am-article-photos"
                      onClick={() => openPhotoModal(article.fotos)}
                    >
                      <ArticlePhoto photo={article.fotos[0]} />
                      {article.fotos.length > 1 && (
                        <div className="am-photos-count">+{article.fotos.length - 1}</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="am-card-actions">
                  <button
                    className="backoffice-btn backoffice-btn-edit"
                    onClick={() => handleStartEdit(article)}
                  >
                    <FiEdit />
                  </button>

                  <button
                    className="backoffice-btn backoffice-btn-delete"
                    onClick={() => handleDelete(article.id)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal de fotos */}
        <PhotoModal
          isOpen={modalOpen}
          photos={modalPhotos}
          onClose={closePhotoModal}
        />

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="am-pagination-container">
            <div className="am-pagination">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                <FiChevronLeft />
              </button>

              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  className={page === i + 1 ? 'active' : ''}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
              >
                <FiChevronRight />
              </button>
            </div>
            <div className="am-pagination-info">
              {Math.min(page * ITEMS_PER_PAGE, totalItems)} de {totalItems} item(s)
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ArticlesManagement;
