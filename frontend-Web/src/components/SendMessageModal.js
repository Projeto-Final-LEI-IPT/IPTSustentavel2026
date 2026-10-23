// Componente de modal para envio de mensagens
// Importa React e useState para gerir o estado do componente
import React, { useState } from 'react';
// Importa a instância de API para comunicação com o servidor
import api from '../services/api';
// Importa os estilos CSS específicos para este componente
import '../styles/SendMessageModal.css';

// Componente funcional que recebe como props o ID do destinatário, o titulo do artigo, o ID do artigo e a função de fecho
const SendMessageModal = ({ recipientId, articleTitle, articleId, onClose }) => {
  // Estado para armazenar o conteúdo da mensagem
  const [message, setMessage] = useState('');
  // Constante que define o número máximo de caracteres permitidos
  const MAX_CHARS = 250;

  // Função para enviar a mensagem para o servidor
  const handleSend = async () => {
    try {
      // Formata a mensagem com o título do artigo seguido por "|" como separador
      const formattedMessage = articleTitle ? `Artigo: ${articleTitle} | ${message}` : message;

      // Chamada à API para guardar a mensagem na base de dados
      await api.post('/mensagens', {
        conteudo: formattedMessage, // Use a mensagem formatada
        remetente_id: localStorage.getItem('userId'), // ID do utilizador atual
        destinatario_id: recipientId, // ID do destinatário
        lida: false, // Inicialmente a mensagem não foi lida
        artigo_id: articleId // Identificador do artigo associado à mensagem
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } // Token de autenticação
      });
      onClose(); // Fecha o modal após envio bem-sucedido
    } catch (error) {
      // Mostra mensagem de erro caso o envio falhe
      alert('Erro ao enviar mensagem: ' + (error.response?.data?.message || error.message));
    }
  };

  // Função para atualizar o estado da mensagem, respeitando o limite de caracteres
  const handleMessageChange = (e) => {
    if (e.target.value.length <= MAX_CHARS) {
      setMessage(e.target.value);
    }
  };

  // Estrutura do modal
  return (
    <div className="modal-overlay">
      <div className="send-message-modal">
        <button
          className="close-modal"
          onClick={onClose}
          aria-label="Fechar modal" // Acessibilidade
        >
          &times;
        </button>
        <h2>Enviar Mensagem</h2>
        <div className="textarea-container">
          <textarea
            value={message}
            onChange={handleMessageChange}
            placeholder="Escreva sua mensagem..."
            maxLength={MAX_CHARS}
          />
          <div className="char-counter">
            {message.length}/{MAX_CHARS} {/* Contador de caracteres */}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn cancel" onClick={onClose}>Cancelar</button>
          <button className="btn send" onClick={handleSend}>Enviar</button>
        </div>
      </div>
    </div>
  );
};

export default SendMessageModal;