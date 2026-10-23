import React, { useState, useEffect, useRef } from 'react';
import { FiTrash2, FiAlertTriangle, FiSend, FiCheckCircle, FiX, FiInfo, FiFilter, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import api from '../services/api';
import '../styles/backoffice/NotificationsManagement.css';

const NotificationsManagement = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNotification, setNewNotification] = useState({
    titulo: '',
    conteudo: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const notificationsPerPage = 10;
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

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notificacoes');
      setNotifications(response.data);
      // Calcular total de páginas
      setTotalPages(Math.ceil(response.data.length / notificationsPerPage));
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      setError('Erro ao carregar notificações');
      setLoading(false);
    }
  };

  // Fechar notificações
  const closeNotification = (type) => {
    if (type === 'error') {
      setError('');
    } else {
      setSuccess('');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewNotification({
      ...newNotification,
      [name]: value
    });
  };

  
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'auto'
    });
    
    setTimeout(() => {
      if (topRef.current) {
        topRef.current.scrollIntoView({
          behavior: 'auto',
          block: 'start'
        });
      }
      
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: 'auto'
        });
        
        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          document.body.scrollTop = 0; // Para Safari
          document.documentElement.scrollTop = 0; // Para Chrome, Firefox, IE e Opera
        });
      }, 50);
    }, 50);
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!newNotification.titulo.trim() || !newNotification.conteudo.trim()) {
      setError('Título e conteúdo são obrigatórios');
      setSuccess('');
      return;
    }
    
    try {
      await api.post('/notificacoes', newNotification);
      setNewNotification({ titulo: '', conteudo: '' });
      fetchNotifications();
      setSuccess('Notificação enviada com sucesso!');
      setError('');
      scrollToTop();
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      setError('Erro ao enviar notificação: ' + (error.response?.data?.message || error.message));
      setSuccess('');
      scrollToTop();
    }
  };

  const handleDeleteNotification = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta notificação?')) return;
    
    try {
      await api.delete(`/notificacoes/${id}`);
      setNotifications(notifications.filter(notif => notif.id !== id));
      setSuccess('Notificação excluída com sucesso!');
      setError('');
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
      setError('Erro ao excluir notificação: ' + (error.response?.data?.message || error.message));
      setSuccess('');
    }
  };

  const formatDate = (dateString) => {
    const options = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('pt-PT', options);
  };

  // Paginação
  const indexOfLastNotification = currentPage * notificationsPerPage;
  const indexOfFirstNotification = indexOfLastNotification - notificationsPerPage;
  const currentNotifications = notifications.slice(indexOfFirstNotification, indexOfLastNotification);
  
  // Mudar página
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <>
      {/* Elemento invisível para referência do topo - com posicionamento fixo */}
      <div ref={topRef} id="top-of-form" className="notif-top-anchor"></div>
      
      <div className="backoffice-content-header">
        <h2 className="backoffice-content-title">Gestão de Notificações</h2>
        <div className="actions">
          {/* Botões de ação se necessário */}
        </div>
      </div>
      
      {/* Notificações */}
      <div className="notif-notifications-container">
        {error && (
          <div className="notif-notification notif-notification-error">
            <div className="notif-notification-icon">
              <FiAlertTriangle />
            </div>
            <div className="notif-notification-content">{error}</div>
            <button 
              className="notif-notification-close"
              onClick={() => closeNotification('error')}
            >
              <FiX />
            </button>
          </div>
        )}
        
        {success && (
          <div className="notif-notification notif-notification-success">
            <div className="notif-notification-icon">
              <FiCheckCircle />
            </div>
            <div className="notif-notification-content">{success}</div>
            <button 
              className="notif-notification-close"
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
          onSubmit={handleSendNotification}
          className="notif-message-form"
        >
          <div className="notif-form-group">
            <label htmlFor="titulo">Título da Notificação*</label>
            <input
              id="titulo"
              type="text"
              name="titulo"
              placeholder="Título da notificação"
              value={newNotification.titulo}
              onChange={handleInputChange}
              maxLength={100}
            />
          </div>
          
          <div className="notif-form-group">
            <label htmlFor="conteudo">Conteúdo da Notificação*</label>
            <textarea
              id="conteudo"
              name="conteudo"
              placeholder="Escreva aqui o conteúdo da notificação..."
              value={newNotification.conteudo}
              onChange={handleInputChange}
              rows={5}
              maxLength={500}
            />
          </div>
          
          <div className="notif-notification-info">
            <FiAlertTriangle className="notif-info-icon" />
            <span>Esta notificação será enviada para todos os utilizadores do sistema.</span>
          </div>
          
          <div className="notif-form-actions">
            <button type="submit" className="backoffice-btn backoffice-btn-edit">
              <FiSend /> Enviar Notificação
            </button>
          </div>
        </form>
        
        <h3 className="notif-section-title">Notificações Enviadas</h3>
        
        {loading ? (
          <div className="notif-empty-state">Carregando notificações...</div>
        ) : currentNotifications.length === 0 ? (
          <div className="notif-empty-state">Nenhuma notificação encontrada</div>
        ) : (
          <div className="notif-messages-list">
            {currentNotifications.map(notification => (
              <div key={notification.id} className="notif-message-card">
                <div className="notif-message-header">
                  <div>
                    <h3>{notification.titulo}</h3>
                    <div className="notif-message-metadata">
                      <span>Data: {formatDate(notification.data)}</span>
                      <span>Enviado por: {notification.remetente?.nome || 'Sistema'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="notif-message-content-container">
                  <label className="notif-message-content-label">Conteúdo da Notificação:</label>
                  <div className="notif-message-content">
                    {notification.conteudo}
                  </div>
                </div>
                
                <div className="notif-message-actions">
                  <button 
                    className="backoffice-btn backoffice-btn-delete"
                    onClick={() => handleDeleteNotification(notification.id)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Paginação */}
        {notifications.length > notificationsPerPage && (
          <div className="notif-pagination">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <FiChevronLeft />
            </button>
            
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => paginate(i + 1)}
                className={currentPage === i + 1 ? 'active' : ''}
              >
                {i + 1}
              </button>
            ))}
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <FiChevronRight />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationsManagement;
