import React, { useState, useEffect, useRef } from 'react';
import '../styles/MessagesModal.css';
import api from '../services/api'; // Importação do serviço API para comunicação com o servidor

// Função auxiliar para formatar datas no formato português (DD/MM/AAAA)
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Componente principal do modal de mensagens
const MessagesModal = ({ onClose, utilizadorLogadoId, onMessagesRead, onArticleClick }) => {
  // Estado para controlar a conversa selecionada
  const [selectedConversation, setSelectedConversation] = useState(null);
  // Estado para controlar o texto da nova mensagem a ser enviada
  const [newMessage, setNewMessage] = useState('');
  // Estado para controlar a pesquisa de conversas
  const [searchQuery, setSearchQuery] = useState('');
  // Estado para armazenar todas as conversas do utilizador
  const [conversations, setConversations] = useState([]);
  // Estado para controlar o carregamento de dados
  const [loading, setLoading] = useState(true);
  // Estado para controlar mensagens de erro
  const [error, setError] = useState(null);

  // Referência para o contentor de mensagens (para scroll automático)
  const chatMessagesRef = useRef(null);

  // Efeito para selecionar automaticamente a primeira conversa quando os dados são carregados
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0]);
    }
  }, [conversations]);

  // Função para validar IDs e garantir que são valores numéricos válidos
  const validateIds = (...ids) => {
    ids.forEach(id => {
      if (id === null || id === undefined || id === '') {
        throw new Error('IDs inválidos: valor ausente');
      }
      const numericId = Number(id);
      if (isNaN(numericId)) {
        throw new Error(`ID inválido: ${id}`);
      }
    });
  };

  // Função para processar o clique no título de um artigo e abrir o artigo correspondente
  const handleArticleTitleClick = async (messageContent, messageId) => {
    try {
      // Extrair o título do artigo da mensagem
      const articleTitle = messageContent.split('|')[0].replace('Artigo:', '').trim();

      // Procurar o ID do artigo nas mensagens
      const response = await api.get(`/mensagens/${messageId}`);
      const mensagemData = response.data;

      // Verificar se a mensagem tem um ID de artigo associado
      if (mensagemData && mensagemData.artigo_id) {
        // Fechar o modal atual
        onClose();

        // Chamar a função para abrir o modal do artigo com o ID do artigo
        if (onArticleClick) {
          onArticleClick(mensagemData.artigo_id);
        }
      } else {
        // Se não houver ID do artigo, mostrar um erro
        setError('Não foi possível encontrar o artigo associado.');
      }
    } catch (error) {
      setError(`Erro ao processar o clique no artigo: ${error.message}`);
    }
  };

  // Efeito para fazer scroll automático para a última mensagem quando a conversa muda
  useEffect(() => {
    if (chatMessagesRef.current && selectedConversation) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [selectedConversation?.messages]);

  // Função para inserir divisores de data entre mensagens de dias diferentes
  const getMessagesWithDates = (messages) => {
    let lastDate = null;
    return messages.reduce((acc, message) => {
      const currentDate = formatDate(message.data);

      // Se a data mudou, adiciona um divisor de data
      if (currentDate !== lastDate) {
        acc.push({
          type: 'dateDivider',
          date: currentDate,
          id: `divider-${message.id}`
        });
        lastDate = currentDate;
      }

      // Adiciona a mensagem com tipo especificado
      acc.push({
        type: 'message',
        ...message
      });

      return acc;
    }, []);
  };

  // Efeito para marcar mensagens como lidas quando uma conversa é selecionada
  useEffect(() => {
    // Marca mensagens como lidas quando uma conversa é selecionada
    const markMessagesAsRead = async () => {
      if (!selectedConversation) return;

      try {
        // Comunica com a API para marcar mensagens como lidas
        await api.put(`/mensagens/marcar-lidas/${selectedConversation.user.id}`);

        // Atualiza o contador de mensagens não lidas para zero na conversa selecionada
        setConversations(prev => prev.map(conv => {
          if (conv.id === selectedConversation.id) {
            return { ...conv, unreadCount: 0 };
          }
          return conv;
        }));

        // Se a função onMessagesRead for fornecida, chame-a para atualizar o contador
        if (onMessagesRead) {
          onMessagesRead();
        }
      } catch (error) {
        console.error('Erro ao marcar mensagens como lidas:', error);
      }
    };

    markMessagesAsRead();
  }, [selectedConversation]);

  // Efeito para procurar as conversas do utilizador ao carregar o componente
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        // Obter todas as mensagens do utilizador através da API
        const response = await api.get('/mensagens');
        const mensagens = response.data;

        // Agrupa as mensagens por conversa (destinatário/remetente)
        const grouped = mensagens.reduce((acc, msg) => {
          try {
            validateIds(msg.remetente_id, msg.destinatario?.id);
            // Ignora mensagens enviadas para si mesmo
            if (msg.remetente_id === msg.destinatario.id) return acc;

            // Determina se a mensagem foi enviada pelo utilizador logado
            const isFromLoggedUser = Number(msg.remetente_id) === Number(utilizadorLogadoId);
            // Identifica o outro interveniente na conversa
            const partner = isFromLoggedUser ? msg.destinatario : msg.remetente;
            // Ignora mensagens para si mesmo (verificação adicional)
            if (partner.id === utilizadorLogadoId) return acc;

            const partnerId = partner.id;
            // Cria uma nova entrada para o parceiro se ainda não existir
            if (!acc[partnerId]) {
              acc[partnerId] = {
                id: partnerId,
                user: {
                  id: partner.id,
                  nome: partner.nome,
                  initials: partner.nome.substring(0, 2).toUpperCase(),
                },
                messages: []
              };
            }

            // Adiciona a mensagem à conversa correspondente
            acc[partnerId].messages.push({
              id: msg.id,
              content: msg.conteudo,
              data: msg.data,
              time: new Date(msg.data).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isSent: isFromLoggedUser,
              lida: msg.lida || false  // Adicionamos o status de leitura
            });

            // Contabiliza mensagens não lidas
            if (!isFromLoggedUser && !msg.lida) {
              acc[partnerId].unreadCount = (acc[partnerId].unreadCount || 0) + 1;
            }

            return acc;
          } catch (error) {
            console.error('Erro ao processar mensagem:', error);
            return acc;
          }
        }, {});

        // Organiza as conversas por data (mais recente primeiro) e ordena as mensagens cronologicamente
        const sortedConversations = Object.values(grouped)
          .map(conv => ({
            ...conv,
            messages: conv.messages.sort((a, b) => new Date(a.data) - new Date(b.data))
          }))
          .sort((a, b) => {
            const lastMsgA = a.messages[a.messages.length - 1]?.data || 0;
            const lastMsgB = b.messages[b.messages.length - 1]?.data || 0;
            return new Date(lastMsgB) - new Date(lastMsgA);
          });

        setConversations(sortedConversations);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [utilizadorLogadoId]);

  // Função para enviar uma nova mensagem
  const handleSendMessage = async () => {
    try {
      if (!newMessage.trim()) throw new Error('Digite uma mensagem');
      if (!selectedConversation) throw new Error('Selecione uma conversa');

      validateIds(utilizadorLogadoId, selectedConversation.user.id);

      // Envia a mensagem para a API
      const response = await api.post('/mensagens', {
        conteudo: newMessage.trim(),
        remetente_id: utilizadorLogadoId,
        destinatario_id: selectedConversation.user.id,
        lida: 0
      });

      const novaMensagem = response.data;

      // Atualiza a lista de conversas com a nova mensagem
      setConversations(prev => prev.map(conv => {
        if (conv.id === selectedConversation.id) {
          const updatedMessages = [
            ...conv.messages,
            {
              id: novaMensagem.id,
              content: novaMensagem.conteudo,
              data: novaMensagem.data,
              time: new Date(novaMensagem.data).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isSent: true
            }
          ].sort((a, b) => new Date(a.data) - new Date(b.data));

          return {
            ...conv,
            messages: updatedMessages
          };
        }
        return conv;
      }));

      // Limpa o campo de nova mensagem
      setNewMessage('');
      onClose(); // Fecha o modal após enviar a mensagem
    } catch (error) {
      setError(error.message);
    }
  };

  // Renderização do componente
  return (
    <div className="messages-modal-overlay">
      <div className="messages-modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Mensagens</h2>
          <button className="close-modal-button" onClick={onClose}></button>
        </div>

        {/* Exibe mensagens de erro quando ocorrem */}
        {error && <div className="error-message">{error}</div>}

        {loading ? (
          // Exibe indicador de carregamento
          <div className="loading-container">Carregando...</div>
        ) : (
          // Exibe o conteúdo principal quando os dados estão carregados
          <div className="messages-content-wrapper">
            {/* Lista de conversas (painel lateral esquerdo) */}
            <div className="conversations-list">
              <input
                type="text"
                placeholder="Procurar conversas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {/* Filtra e mapeia as conversas com base na pesquisa */}
              {conversations
                .filter(conv => conv.user.nome.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(conversation => (
                  <div
                    key={conversation.id}
                    className={`conversation-item ${selectedConversation?.id === conversation.id ? 'active' : ''}`}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="user-avatar">{conversation.user.initials}</div>
                    <div className="conversation-info">
                      <p>{conversation.user.nome}</p>
                      {/* Exibir o badge de mensagens não lidas se houver alguma */}
                      {conversation.unreadCount > 0 && (
                        <span className="unread-badge">{conversation.unreadCount}</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* Área de chat (painel direito) - exibida apenas quando há uma conversa selecionada */}
            {selectedConversation && (
              <div className="chat-area">
                {/* Cabeçalho do chat mostrando o interlocutor atual */}
                <div className="chat-header">
                  <div className="user-avatar">{selectedConversation.user.initials}</div>
                  <h3>{selectedConversation.user.nome}</h3>
                </div>

                {/* Área de mensagens com scroll automático */}
                <div className="chat-messages" ref={chatMessagesRef}>
                  {getMessagesWithDates(selectedConversation.messages).map((item) => {
                    // Renderiza separadores de data
                    if (item.type === 'dateDivider') {
                      return (
                        <div key={item.id} className="date-divider">
                          <span>{item.date}</span>
                        </div>
                      );
                    }

                    // Renderiza bolhas de mensagem
                    return (
                      <div
                        key={item.id}
                        className={`message-bubble ${item.isSent ? 'sent' : 'received'}`}
                      >
                        {item.content && (
                          <div className="message-content">
                            {item.content.includes('|') ? (
                              <>
                                {/* Título do artigo como elemento clicável */}
                                <div className="article-title"
                                  onClick={() => handleArticleTitleClick(item.content, item.id)}
                                  style={{ cursor: 'pointer' }} // Cursor pointer para indicar que é clicável                                
                                >{item.content.split('|')[0].trim()}</div>
                                <div className="message-spacer"></div>
                                {/* Conteúdo da mensagem após o separador */}
                                <div className="message-text">{item.content.split('|')[1].trim()}</div>
                              </>
                            ) : (
                              <p>{item.content}</p>
                            )}
                          </div>
                        )}
                        <span>{item.time}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Área de entrada para enviar novas mensagens */}
                <div className="chat-input">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Escreva uma mensagem..."
                  />
                  <button
                    className="send-button"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesModal;
