import React, { useState, useEffect, useRef } from 'react';
import { FiEdit, FiTrash2, FiMail, FiCheck, FiFilter, FiChevronLeft, FiChevronRight, FiMessageSquare, FiCheckCircle, FiX, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import api from '../services/api';
import '../styles/backoffice/MessagesManagement.css';

const MessagesManagement = () => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [newMessage, setNewMessage] = useState({ conteudo: '', destinatario_id: '', artigo_id: '' });
  const [editingMessage, setEditingMessage] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({ read: 'all', user: 'all' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const messagesPerPage = 10;
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

  // Carregar mensagens e utilizadores
  useEffect(() => {
    const loadData = async () => {
      try {
        const [messagesRes, usersRes] = await Promise.all([
          api.get('/mensagens'),
          api.get('/utilizadores')
        ]);
        
        setMessages(messagesRes.data);
        setUsers(usersRes.data);
        
        // Calcular total de páginas
        setTotalPages(Math.ceil(messagesRes.data.length / messagesPerPage));
      } catch (err) {
        setError('Erro ao carregar dados');
        console.error(err);
      }
    };
    loadData();
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

  // Iniciar edição de mensagem com scroll forçado para o topo
  const handleStartEdit = (message) => {
    // Primeiro forçamos o scroll para o topo
    scrollToTop();
    
    // Depois definimos a mensagem para edição com um pequeno atraso
    setTimeout(() => {
      setEditingMessage(message);
      
      // Focus no primeiro input após o DOM ser atualizado
      setTimeout(() => {
        if (formRef.current) {
          const textarea = formRef.current.querySelector('textarea');
          if (textarea) {
            textarea.focus();
          }
        }
        
        // Garantia extra de scroll
        window.scrollTo(0, 0);
      }, 300);
    }, 100);
  };

  // Filtrar mensagens
  const filteredMessages = messages.filter(message => {
    // Filtrar por status de leitura
    if (filters.read !== 'all') {
      const isRead = filters.read === 'read';
      if (message.lida !== isRead) return false;
    }
    
    // Filtrar por utilizador (remetente ou destinatário)
    if (filters.user !== 'all') {
      const userId = parseInt(filters.user);
      if (message.remetente_id !== userId && message.destinatario_id !== userId) return false;
    }
    
    return true;
  });

  // Paginação
  const indexOfLastMessage = currentPage * messagesPerPage;
  const indexOfFirstMessage = indexOfLastMessage - messagesPerPage;
  const currentMessages = filteredMessages.slice(indexOfFirstMessage, indexOfLastMessage);
  
  // Mudar página
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Fechar notificações
  const closeNotification = (type) => {
    if (type === 'error') {
      setError('');
    } else {
      setSuccess('');
    }
  };

  // Enviar mensagem
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.conteudo || !newMessage.destinatario_id) {
      setError('Conteúdo e destinatário são obrigatórios');
      setSuccess('');
      return;
    }

    try {
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        setError('Usuário não encontrado. Por favor, faça login novamente.');
        setSuccess('');
        return;
      }

      // Converte os IDs para números para garantir compatibilidade com o back-end
      const messageData = {
        conteudo: newMessage.conteudo,
        remetente_id: parseInt(userId),
        destinatario_id: parseInt(newMessage.destinatario_id),
        lida: false,
        // Trata artigo_id adequadamente: se vazio, envia null
        artigo_id: newMessage.artigo_id ? parseInt(newMessage.artigo_id) : null,
        data: new Date().toISOString()
      };
      
      console.log('Enviando mensagem:', messageData); // Log para depuração
      
      const response = await api.post('/mensagens', messageData);
      setMessages([response.data, ...messages]);
      setNewMessage({ conteudo: '', destinatario_id: '', artigo_id: '' });
      setError('');
      
      // Mostrar notificação de sucesso
      const recipient = users.find(user => user.id === parseInt(newMessage.destinatario_id));
      setSuccess(`Mensagem enviada com sucesso para ${recipient?.nome || 'o destinatário'}`);
    } catch (err) {
      console.error('Erro detalhado:', err);
      setError(`Erro ao enviar mensagem: ${err.response?.data?.message || err.message}`);
      setSuccess('');
    }
  };

  // Atualizar mensagem
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingMessage.conteudo) {
      setError('Conteúdo é obrigatório');
      setSuccess('');
      return;
    }

    try {
      // Garantir que os IDs sejam números
      const updatedMessage = {
        ...editingMessage,
        remetente_id: parseInt(editingMessage.remetente_id),
        destinatario_id: parseInt(editingMessage.destinatario_id),
        artigo_id: editingMessage.artigo_id ? parseInt(editingMessage.artigo_id) : null
      };

      await api.put(`/mensagens/${editingMessage.id}`, updatedMessage);
      setMessages(messages.map(msg => 
        msg.id === editingMessage.id ? updatedMessage : msg
      ));
      setEditingMessage(null);
      setError('');
      setSuccess('Mensagem atualizada com sucesso!');
    } catch (err) {
      console.error('Erro detalhado:', err);
      setError(`Erro ao atualizar mensagem: ${err.response?.data?.message || err.message}`);
      setSuccess('');
    }
  };

  // Apagar mensagem
  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta mensagem?')) {
      try {
        await api.delete(`/mensagens/${id}`);
        setMessages(messages.filter(msg => msg.id !== id));
        setSuccess('Mensagem excluída com sucesso!');
        setError('');
      } catch (err) {
        setError('Erro ao excluir mensagem');
        setSuccess('');
        console.error(err);
      }
    }
  };

  // Marcar como lida/não lida
  const toggleReadStatus = async (message) => {
    try {
      const updatedMessage = { 
        ...message, 
        lida: !message.lida,
        remetente_id: parseInt(message.remetente_id),
        destinatario_id: parseInt(message.destinatario_id),
        artigo_id: message.artigo_id ? parseInt(message.artigo_id) : null
      };
      
      await api.put(`/mensagens/${message.id}`, updatedMessage);
      setMessages(messages.map(msg => 
        msg.id === message.id ? updatedMessage : msg
      ));
      
      setSuccess(updatedMessage.lida 
        ? 'Mensagem marcada como lida!' 
        : 'Mensagem marcada como não lida!'
      );
      setError('');
    } catch (err) {
      setError('Erro ao atualizar status de leitura');
      setSuccess('');
      console.error(err);
    }
  };

  // Formatar data
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <>
      {/* Elemento invisível para referência do topo - com posicionamento fixo */}
      <div ref={topRef} id="top-of-form" className="bo-top-anchor"></div>
      
      <div className="backoffice-content-header">
        <h2 className="backoffice-content-title">Gestão de Mensagens</h2>
        <div className="actions">
          {/* Botões de ação se necessário */}
        </div>
      </div>
      
      {/* Notificações */}
      <div className="bo-notifications-container">
        {error && (
          <div className="bo-notification bo-notification-error">
            <div className="bo-notification-icon">
              <FiAlertTriangle />
            </div>
            <div className="bo-notification-content">{error}</div>
            <button 
              className="bo-notification-close"
              onClick={() => closeNotification('error')}
            >
              <FiX />
            </button>
          </div>
        )}
        
        {success && (
          <div className="bo-notification bo-notification-success">
            <div className="bo-notification-icon">
              <FiCheckCircle />
            </div>
            <div className="bo-notification-content">{success}</div>
            <button 
              className="bo-notification-close"
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
          onSubmit={editingMessage ? handleUpdate : handleSend}
          className="bo-message-form"
        >
          <div className="bo-form-group">
            <label htmlFor="message-content">Conteúdo da mensagem*</label>
            <textarea
              id="message-content"
              placeholder="Escreva aqui o conteúdo da sua mensagem..."
              value={editingMessage ? editingMessage.conteudo : newMessage.conteudo}
              onChange={(e) => editingMessage 
                ? setEditingMessage({...editingMessage, conteudo: e.target.value})
                : setNewMessage({...newMessage, conteudo: e.target.value})}
            />
          </div>
          
          {!editingMessage && (
            <div className="bo-form-group">
              <label htmlFor="message-recipient">Destinatário*</label>
              <select
                id="message-recipient"
                value={newMessage.destinatario_id}
                onChange={(e) => setNewMessage({...newMessage, destinatario_id: e.target.value})}
              >
                <option value="">Selecione um destinatário</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.nome}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="bo-form-group">
            <label htmlFor="message-article">ID do Artigo relacionado</label>
            <input
              id="message-article"
              type="text"
              placeholder="Deixe em branco se não estiver relacionado a um artigo"
              value={editingMessage ? editingMessage.artigo_id || '' : newMessage.artigo_id || ''}
              onChange={(e) => editingMessage 
                ? setEditingMessage({...editingMessage, artigo_id: e.target.value || null})
                : setNewMessage({...newMessage, artigo_id: e.target.value || null})}
            />
          </div>
          
          <div className="bo-form-actions">
            {editingMessage ? (
              <>
                <button type="submit" className="backoffice-btn backoffice-btn-edit">
                  <FiEdit /> Atualizar
                </button>
                <button 
                  type="button" 
                  className="backoffice-btn backoffice-btn-delete"
                  onClick={() => setEditingMessage(null)}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button type="submit" className="backoffice-btn backoffice-btn-edit">
                <FiMail /> Enviar Mensagem
              </button>
            )}
          </div>
        </form>
        
        {/* Filtros */}
        <div className="bo-filters-section">
          <div className="bo-filters-header">
            <h3><FiFilter /> Filtros</h3>
            <button 
              className="bo-filters-reset"
              onClick={() => setFilters({ read: 'all', user: 'all' })}
              type="button"
            >
              Limpar filtros
            </button>
          </div>
          <div className="bo-filters-grid">
            <div className="bo-filter-item">
              <label htmlFor="filter-read-status">Status de leitura</label>
              <select 
                id="filter-read-status"
                className="bo-filter-select"
                value={filters.read} 
                onChange={(e) => setFilters({...filters, read: e.target.value})}
              >
                <option value="all">Todos os status</option>
                <option value="read">Lidas</option>
                <option value="unread">Não lidas</option>
              </select>
            </div>
            
            <div className="bo-filter-item">
              <label htmlFor="filter-user">Utilizador</label>
              <select 
                id="filter-user"
                className="bo-filter-select"
                value={filters.user} 
                onChange={(e) => setFilters({...filters, user: e.target.value})}
              >
                <option value="all">Todos os utilizadores</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Lista de Mensagens */}
        <div className="bo-messages-list">
          {currentMessages.length === 0 ? (
            <div className="bo-empty-state">Nenhuma mensagem encontrada</div>
          ) : (
            currentMessages.map(message => {
              const sender = users.find(user => user.id === message.remetente_id);
              const recipient = users.find(user => user.id === message.destinatario_id);
              
              return (
                <div 
                  key={message.id} 
                  className={`bo-message-card ${editingMessage && editingMessage.id === message.id ? 'bo-message-card-editing' : ''}`}
                >
                  <div className="bo-message-header">
                    <div>
                      <h3>
                        De: {sender?.nome || 'Utilizador desconhecido'} 
                        → Para: {recipient?.nome || 'Utilizador desconhecido'}
                      </h3>
                      <div className="bo-message-metadata">
                        <span>Data: {formatDate(message.data)}</span>
                        <span className={`bo-message-status ${message.lida ? 'bo-status-read' : 'bo-status-unread'}`}>
                          {message.lida ? (
                            <><FiCheckCircle /> Lida</>
                          ) : (
                            <><FiMail /> Não lida</>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bo-message-content-container">
                    <label className="bo-message-content-label">Conteúdo da Mensagem:</label>
                    <div className="bo-message-content">
                      {message.conteudo}
                    </div>
                  </div>
                  
                  {message.artigo_id && (
                    <div className="bo-message-article">
                      <strong>Artigo relacionado:</strong> ID #{message.artigo_id}
                    </div>
                  )}
                  
                  <div className="bo-message-actions">
                    <button 
                      className="backoffice-btn backoffice-btn-edit"
                      onClick={() => toggleReadStatus(message)}
                    >
                      {message.lida ? <><FiMail /> Marcar como não lida</> : <><FiCheckCircle /> Marcar como lida</>}
                    </button>
                    
                    <button 
                      className="backoffice-btn backoffice-btn-edit"
                      onClick={() => handleStartEdit(message)}
                    >
                      <FiEdit />
                    </button>
                    
                    <button 
                      className="backoffice-btn backoffice-btn-delete"
                      onClick={() => handleDelete(message.id)}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Paginação */}
        {filteredMessages.length > messagesPerPage && (
          <div className="bo-pagination">
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

export default MessagesManagement;
