import React, { useState, useEffect } from 'react';
import { FiX, FiCheck, FiInfo } from 'react-icons/fi';
import api from '../services/api';
import '../styles/NotificationsModal.css';

const NotificationsModal = ({ onClose, onNotificationsRead }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Validação consistente com MessagesModal
  const validateIds = (...ids) => {
    ids.forEach(id => {
      if (id === null || id === undefined || id === '') {
        throw new Error('ID de notificação inválido');
      }
      const numericId = Number(id);
      if (isNaN(numericId)) {
        throw new Error(`ID de notificação inválido: ${id}`);
      }
    });
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notificacoes');
      setNotifications(response.data);
    } catch (error) {
      setError(`Erro ao carregar notificações: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      validateIds(notificationId);
      
      await api.put(`/notificacoes/${notificationId}/marcar-lida`);
   
      // Atualização otimizada do estado
      setNotifications(prev => prev.map(notif => 
        notif.id === notificationId ? {
          ...notif,
          lida: true,
          data_leitura: new Date().toISOString()
        } : notif
      ));

      onNotificationsRead?.();
    } catch (error) {
      setError(`Erro ao marcar como lida: ${error.message}`);
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

  return (
    <div className="notif-modal-overlay">
      <div className="notif-modal">
        <div className="notif-modal-header">
          <h2>Notificações</h2>
          <FiX className="notif-close-icon" onClick={onClose} />
        </div>

        {error && <div className="notif-error-message">{error}</div>}

        <div className="notif-modal-content">
          {loading ? (
            <div className="notif-loading-spinner">Carregando...</div>
          ) : notifications.length === 0 ? (
            <div className="notif-message">
              <FiInfo size={24} />
              <p>Sem notificações</p>
            </div>
          ) : (
            notifications.map(notification => (
              <div 
                key={notification.id} 
                className={`notif-message ${notification.lida ? 'read' : 'unread'}`}
              >
                <div className="notif-message-header">
                  <h3 className="notif-message-title">{notification.titulo}</h3>
                  {!notification.lida && (
                    <button 
                      className="notif-mark-read-btn"
                      onClick={() => markAsRead(notification.id)}
                      title="Marcar como lida"
                    >
                      <FiCheck />
                    </button>
                  )}
                </div>
                <div className="notif-message-content">
                  <p>{notification.conteudo}</p>
                </div>
                <div className="notif-message-date">
                  {formatDate(notification.data)}
                  {notification.remetente && ` • Por ${notification.remetente.nome}`}
                  {notification.lida && ` • Lida em ${formatDate(notification.data_leitura)}`}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;
