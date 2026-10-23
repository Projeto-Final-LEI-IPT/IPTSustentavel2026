// Este componente representa um modal que mostra informações detalhadas sobre um artigo
import React, { useState } from 'react';
import { FiMessageCircle, FiX } from 'react-icons/fi'; // Ícones para interface
import useImageLoader from '../hooks/useImageLoader'; // Hook personalizado para carregamento de imagens
import '../styles/ArticleDetailModal.css'; // Estilos específicos do componente
import api from '../services/api'; // Serviço para comunicação com a api


const MAX_CHARS = 250; // Número máximo de caracteres permitidos na mensagem
const ArticleDetailModal = ({ article, onClose }) => {
  // Estado para controlar a imagem selecionada na galeria
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  // Estado para o conteúdo da mensagem a enviar ao proprietário
  const [messageContent, setMessageContent] = useState('');
  // Estados para controlar feedback durante o envio de mensagens
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Obtém URL da imagem principal utilizando o hook personalizado
  const mainImageUrl = useImageLoader(article.fotos?.[selectedImageIndex]?.caminho_foto);
  // Formata a data de publicação para o formato português
  const formattedDate = new Date(article.data_publicacao).toLocaleDateString('pt-PT');
  // Verifica se o utilizador logado é o proprietário do artigo
  const isOwner = article.utilizador?.id === parseInt(localStorage.getItem('userId'));

  // Função para enviar mensagem ao proprietário do artigo
  const handleSendMessage = async () => {
    // Validação básica da mensagem
    if (!messageContent.trim()) {
      setError('Por favor escreva uma mensagem');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Envia a mensagem para o backend através da API, incluindo referência ao artigo no conteúdo
      await api.post('/mensagens', {
        conteudo: `Artigo: ${article.titulo} | ${messageContent}`,
        destinatario_id: article.utilizador.id,
        remetente_id: localStorage.getItem('userId'),
        lida: false,
        artigo_id: article.id // Associa a mensagem ao artigo específico
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Limpa o campo de mensagem e mostra feedback de sucesso
      setMessageContent('');
      setSuccess('Mensagem enviada com sucesso!');
      setTimeout(() => setSuccess(null), 3000); // Remove a mensagem de sucesso após 3 segundos

    } catch (error) {
      // Trata erro na resposta da API
      setError(error.response?.data?.message || 'Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="article-detail-modal">
        {/* Cabeçalho do modal com título e botão para fechar */}
        <div className="modal-header">
          <h2 className="modal-title">Detalhes do Artigo</h2>
          <button className="close-modal-button" onClick={onClose}>
          </button>
        </div>
        <div className="product-container">
          {/* Secção da galeria de imagens */}
          <div className="gallery-section">
            <div className="main-image">
              {mainImageUrl ? (
                <img
                  src={mainImageUrl}
                  alt={article.titulo}
                  className="product-image"
                  loading="lazy" // Carregamento diferido para melhor performance
                />
              ) : (
                <div className="image-placeholder">Sem imagem principal</div>
              )}
            </div>

            {/* Miniaturas de todas as imagens do artigo */}
            <div className="thumbnail-grid">
              {article.fotos?.map((foto, index) => (
                <Thumbnail
                  key={index}
                  foto={foto}
                  onClick={() => setSelectedImageIndex(index)}
                  isSelected={index === selectedImageIndex}
                />
              ))}
            </div>
          </div>

          {/* Secção de informações do produto */}
          <div className="product-info">
            <h3>{article.titulo}</h3>

            {/* Metadados do artigo */}
            <div className="metadata">
              <span className="publication-date">Publicado em: {formattedDate}</span>
              <span className="category">Categoria: {article.categoria?.nome || 'Sem categoria'}</span>
              <span className="validity">Validade: {article.validade_meses} meses</span>
            </div>

            {/* Estado de disponibilidade do artigo */}
            <div className="status-container">
              <span className={`availability-tag ${article.disponivel ? 'available' : 'unavailable'}`}>
                {article.disponivel ? 'Disponível para troca' : 'Indisponível'}
              </span>
              <span className="condition">Estado: {article.estado || 'Não especificado'}</span>
            </div>

            {/* Secção de descrição do artigo */}
            <div className="desc-info"></div>
            <h3>Descrição</h3>
            <p className="product-description">
              {article.descricao || 'Nenhuma descrição fornecida pelo autor.'}
            </p>
            <div />

            {/* Informações sobre o proprietário e componente de mensagens */}
            <div className="seller-info">
              <h3>Proprietário</h3>
              <div className="seller-details">
                <span className="seller-name">{article.utilizador?.nome}</span>

                {/* Componente de mensagens visível apenas se não for proprietário */}
                {!isOwner && (
                  <div className="message-box-container">
                    <div className="textarea-container">
                      <textarea
                        value={messageContent}
                        onChange={(e) => {
                          if (e.target.value.length <= MAX_CHARS) {
                            setMessageContent(e.target.value);
                          }
                        }}
                        placeholder="Escreva sua mensagem ao proprietário..."
                        rows="3"
                        className="message-input"
                        maxLength={MAX_CHARS}
                      />
                      {/* Contador de caracteres */}
                      <div className="char-counter">
                        {messageContent.length}/{MAX_CHARS}
                      </div>
                    </div>
                    {/* Feedback de erro e sucesso */}
                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}

                    {/* Botão para enviar a mensagem */}
                    <button
                      className="contact-button"
                      onClick={handleSendMessage}
                      disabled={loading || !messageContent.trim()}
                    >
                      <FiMessageCircle className="icon" />
                      {loading ? 'Enviando...' : 'Enviar Mensagem'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente auxiliar para exibir miniaturas de imagens
const Thumbnail = ({ foto, onClick, isSelected }) => {
  const imageUrl = useImageLoader(foto?.caminho_foto);

  return (
    <div
      className={`thumbnail-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`Thumbnail ${foto.id}`}
          className="thumbnail-image"
          loading="lazy"
        />
      ) : (
        <div className="thumbnail-placeholder">Sem imagem</div>
      )}
    </div>
  );
};

export default ArticleDetailModal;
