// Importação das dependências React, serviço de API e estilos CSS
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import '../styles/UserModal.css';

// Componente do modal para edição do perfil do utilizador
const UserModal = ({ userId, onClose, onUpdate }) => {
  // Estado para armazenar os dados do utilizador
  const [userData, setUserData] = useState({
    nome: '', // Nome do utilizador
    email: '', // Endereço de email
    imagem: '', // Caminho da imagem de perfil
    tipo_utilizador_id: '' // Identificador do tipo de utilizador
  });

  // Estado para guardar o ficheiro da imagem selecionada
  const [selectedFile, setSelectedFile] = useState(null);

  // Estado para guardar a pré-visualização da imagem
  const [preview, setPreview] = useState('');

  // Hook de efeito para carregar os dados do utilizador quando o modal é aberto
  useEffect(() => {
    let objectUrl = '';

    // Função assíncrona para procurar os dados do utilizador
    const fetchUserData = async () => {
      try {
        // Obter dados do utilizador através da API
        const response = await api.get(`/utilizadores/${userId}`);
        setUserData({
          ...response.data,
          // Converter o ID do tipo de utilizador para string
          tipo_utilizador_id: response.data.tipo_utilizador_id?.toString() || ''
        });

        // Se existir uma imagem, carregar a imagem de perfil
        if (response.data.imagem) {
          const imageResponse = await api.get(`/pictures/${response.data.imagem}`, {
            responseType: 'blob' // Obter a imagem como um objeto blob (Binary Large Object, um tipo de dado que representa um ficheiro binário)
          });
          objectUrl = URL.createObjectURL(imageResponse.data); // Criar URL para a imagem
          setPreview(objectUrl); // Definir a pré-visualização da imagem
        }
      } catch (error) {
        // Tratamento de erro ao carregar dados
        console.error('Erro ao carregar dados:', error);
        alert('Falha ao carregar perfil!');
      }
    };

    // Chamar a função de procura de dados se existir um ID de utilizador
    if (userId) fetchUserData();

    // Função de limpeza para libertar recursos
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [userId]);

  // Manipulador de alteração de ficheiro
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Definir o ficheiro selecionado e criar URL de pré-visualização
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // Função para fazer upload da imagem
  const uploadImage = async () => {
    // Se não foi selecionado nenhum ficheiro, devolver o caminho da imagem existente
    if (!selectedFile) return userData.imagem;

    // Criar formulário para upload de ficheiro
    const formData = new FormData();
    formData.append('foto', selectedFile);

    try {
      // Fazer upload da imagem através da API
      const response = await api.post('/pictures', formData);
      return response.data.caminho;
    } catch (error) {
      // Tratamento de erro no upload
      alert('Erro no upload da imagem: ' + error.message);
      return userData.imagem;
    }
  };

  // Manipulador de submissão do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Fazer upload da imagem (se aplicável)
      const novaImagem = await uploadImage();

      // Preparar dados atualizados
      const updatedData = {
        ...userData,
        imagem: novaImagem || userData.imagem,
        // Converter o ID do tipo de utilizador para número
        tipo_utilizador_id: Number(userData.tipo_utilizador_id)
      };

      // Atualizar dados do utilizador através da API
      await api.put(`/utilizadores/${userId}`, updatedData);
      // Chamar função de atualização do componente pai
      onUpdate(updatedData);
      // Fechar o modal
      onClose();
    } catch (error) {
      // Tratamento de erro na atualização
      alert('Erro na atualização: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    // Estrutura do modal de edição de perfil
    <div className="user-modal-overlay">
      <div className="user-modal">
        <div className="modal-header">
          <h2 className="modal-title" >Editar Perfil</h2>
          {/* Botão de fecho do modal */}
           <button className="close-modal-button" onClick={onClose}></button>
        </div>

        {/* Formulário de edição de perfil */}
        <form onSubmit={handleSubmit}>
          {/* Campo de nome */}
          <div className="form-group">
            <label>Nome:</label>
            <input
              type="text"
              value={userData.nome}
              onChange={(e) => setUserData({ ...userData, nome: e.target.value })}
              required
            />
          </div>

          {/* Campo de email (desativado) */}
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={userData.email}
              disabled
              className="disabled-input"
            />
          </div>

          {/* Campo de tipo de utilizador (somente leitura) */}
          <div className="form-group">
            <label>Tipo de Utilizador:</label>
            <input
              type="text"
              value={
                // Mapear o ID do tipo de utilizador para texto descritivo
                userData.tipo_utilizador_id === '1' ? 'Estudante' :
                  userData.tipo_utilizador_id === '2' ? 'Docente' :
                    userData.tipo_utilizador_id === '3' ? 'Funcionário' : ''
              }
              readOnly
              className="disabled-input"
            />
          </div>

          {/* Campo de upload de foto de perfil */}
          <div className="form-group">
            <label>Foto de Perfil:</label>
            <div className="file-input-container">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="custom-file-input"
                id="fileInput"
              />
              <label htmlFor="fileInput" className="file-input-label">
                Escolher Ficheiro
              </label>
            </div>
            {/* Pré-visualização da imagem */}
            {preview && (
              <img
                src={preview}
                alt="Pré-visualização"
                className="profile-preview"
              />
            )}
          </div>

          {/* Botões de ação do modal */}
          <div className="user-modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div >
  );
};

export default UserModal;
