import React, { useState, useEffect, useRef } from 'react';
import { FiEdit, FiTrash2, FiPlus, FiCheckCircle, FiX, FiAlertTriangle } from 'react-icons/fi';
import api from '../services/api';
import '../styles/backoffice/CategoriesManagement.css';

const CategoriesManagement = () => {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ nome: '', descricao: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const formRef = useRef(null);
  const topRef = useRef(null);

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
  
  // Carregar categorias
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await api.get('/categorias');
        setCategories(response.data);
      } catch (err) {
        setError('Erro ao carregar categorias');
        setSuccess('');
      }
    };
    loadCategories();
  }, []);

  
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

  // Iniciar edição de categoria com scroll forçado para o topo
  const handleStartEdit = (category) => {
    // Primeiro forçamos o scroll para o topo
    scrollToTop();
    
    // Depois definimos a categoria para edição com um pequeno atraso
    setTimeout(() => {
      setEditingCategory(category);
      
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
    }, 100);
  };

  // Fechar notificações
  const closeNotification = (type) => {
    if (type === 'error') {
      setError('');
    } else {
      setSuccess('');
    }
  };

  // Criar categoria
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newCategory.nome) {
      setError('Nome é obrigatório');
      setSuccess('');
      return;
    }

    try {
      const response = await api.post('/categorias', newCategory);
      setCategories([...categories, response.data]);
      setNewCategory({ nome: '', descricao: '' });
      setError('');
      setSuccess('Categoria criada com sucesso!');
    } catch (err) {
      setError('Erro ao criar categoria');
      setSuccess('');
    }
  };

  // Atualizar categoria
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingCategory.nome) {
      setError('Nome é obrigatório');
      setSuccess('');
      return;
    }

    try {
      await api.put(`/categorias/${editingCategory.id}`, editingCategory);
      setCategories(categories.map(cat => 
        cat.id === editingCategory.id ? editingCategory : cat
      ));
      setEditingCategory(null);
      setError('');
      setSuccess('Categoria atualizada com sucesso!');
    } catch (err) {
      setError('Erro ao atualizar categoria');
      setSuccess('');
    }
  };

  // Apagar categoria
  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      try {
        await api.delete(`/categorias/${id}`);
        setCategories(categories.filter(cat => cat.id !== id));
        setSuccess('Categoria excluída com sucesso!');
        setError('');
      } catch (err) {
        setError('Erro ao excluir categoria');
        setSuccess('');
      }
    }
  };

  return (
    <>
      {/* Elemento invisível para referência do topo - com posicionamento fixo */}
      <div ref={topRef} id="top-of-form" className="cat-top-anchor"></div>
      
      <div className="backoffice-content-header">
        <h2 className="backoffice-content-title">Gestão de Categorias</h2>
        <div className="actions">
          {/* Botões de ação se necessário */}
        </div>
      </div>
      
      {/* Notificações */}
      <div className="cat-notif-container">
        {error && (
          <div className="cat-notif cat-notif-error">
            <div className="cat-notif-icon">
              <FiAlertTriangle />
            </div>
            <div className="cat-notif-content">{error}</div>
            <button 
              className="cat-notif-close"
              onClick={() => closeNotification('error')}
            >
              <FiX />
            </button>
          </div>
        )}
        
        {success && (
          <div className="cat-notif cat-notif-success">
            <div className="cat-notif-icon">
              <FiCheckCircle />
            </div>
            <div className="cat-notif-content">{success}</div>
            <button 
              className="cat-notif-close"
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
          onSubmit={editingCategory ? handleUpdate : handleCreate} 
          className="cat-form"
        >
          <div className="cat-form-group">
            <label htmlFor="category-name">Nome da categoria*</label>
            <input
              id="category-name"
              type="text"
              placeholder="Digite o nome da categoria (obrigatório)"
              value={editingCategory ? editingCategory.nome : newCategory.nome}
              onChange={(e) => editingCategory 
                ? setEditingCategory({...editingCategory, nome: e.target.value})
                : setNewCategory({...newCategory, nome: e.target.value})}
            />
          </div>
          
          <div className="cat-form-group">
            <label htmlFor="category-description">Descrição</label>
            <textarea
              id="category-description"
              placeholder="Digite uma descrição detalhada para a categoria (opcional)"
              value={editingCategory ? editingCategory.descricao : newCategory.descricao}
              onChange={(e) => editingCategory 
                ? setEditingCategory({...editingCategory, descricao: e.target.value})
                : setNewCategory({...newCategory, descricao: e.target.value})}
            />
          </div>
          
          <div className="cat-form-actions">
            {editingCategory ? (
              <>
                <button type="submit" className="backoffice-btn backoffice-btn-edit">
                  <FiEdit /> Atualizar
                </button>
                <button 
                  type="button" 
                  className="backoffice-btn backoffice-btn-delete"
                  onClick={() => setEditingCategory(null)}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button type="submit" className="backoffice-btn backoffice-btn-edit">
                <FiPlus /> Adicionar Categoria
              </button>
            )}
          </div>
        </form>
        
        {/* Lista de categorias em cards */}
        <div className="cat-grid">
          {categories.map(category => (
            <div 
              key={category.id} 
              className={`cat-card ${editingCategory && editingCategory.id === category.id ? 'cat-card-editing' : ''}`}
            >
              <div className="cat-card-content">
                <h3>{category.nome}</h3>
                {category.descricao && <p>{category.descricao}</p>}
              </div>
              
              <div className="cat-card-actions">
                <button 
                  className="backoffice-btn backoffice-btn-edit"
                  onClick={() => handleStartEdit(category)}
                >
                  <FiEdit />
                </button>
                
                <button 
                  className="backoffice-btn backoffice-btn-delete"
                  onClick={() => handleDelete(category.id)}
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default CategoriesManagement;
