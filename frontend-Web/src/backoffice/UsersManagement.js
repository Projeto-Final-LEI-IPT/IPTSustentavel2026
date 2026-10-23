import React, { useState, useEffect, useRef } from 'react';
import { FiEdit, FiTrash2, FiUserPlus, FiUser, FiChevronLeft, FiChevronRight, FiCheckCircle, FiAlertTriangle, FiX } from 'react-icons/fi';
import api from '../services/api';
import useImageLoader from '../hooks/useImageLoader';
import '../styles/backoffice/UsersManagement.css';

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [newUser, setNewUser] = useState({ 
    email: '', 
    nome: '', 
    password: '',
    tipo_utilizador_id: 1,
    data_registo: new Date().toISOString().split('T')[0],
    imagem: null
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); // Novo estado para mensagens de sucesso
  const [userTypes, setUserTypes] = useState([]);
  const formRef = useRef(null);
  const topRef = useRef(null);

  // Estados para paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const usersPerPage = 6;

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

  // Carregar utilizadores e implementar paginação no cliente
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const usersResponse = await api.get('/utilizadores');
        const loadedUsers = usersResponse.data;
        
        setAllUsers(loadedUsers);
        
        const totalItems = loadedUsers.length;
        const calculatedTotalPages = Math.ceil(totalItems / usersPerPage);
        setTotalPages(calculatedTotalPages);
        
        const startIndex = (page - 1) * usersPerPage;
        const selectedUsers = loadedUsers.slice(startIndex, startIndex + usersPerPage);
        setUsers(selectedUsers);
        
        if (loadedUsers.length > 0 && loadedUsers[0].tipo_utilizador) {
          const uniqueTypes = new Map();
          loadedUsers.forEach(user => {
            if (user.tipo_utilizador && !uniqueTypes.has(user.tipo_utilizador.id)) {
              uniqueTypes.set(user.tipo_utilizador.id, user.tipo_utilizador);
            }
          });
          const types = Array.from(uniqueTypes.values());
          setUserTypes(types);
        }
      } catch (err) {
        console.error("Erro ao carregar utilizadores:", err);
        setError('Erro ao carregar utilizadores. Por favor, tente novamente.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Atualizar paginação quando todos os utilizadores mudarem ou página mudar
  useEffect(() => {
    if (allUsers.length > 0) {
      const startIndex = (page - 1) * usersPerPage;
      setUsers(allUsers.slice(startIndex, startIndex + usersPerPage));
    }
  }, [page, allUsers]);

  // MÉTODO DE SCROLL - Scroll até o formulário
  const scrollToForm = () => {
    if (formRef.current) {
      // Usar o elemento do formulário como alvo do scroll
      const formPosition = formRef.current.offsetTop;
      const offset = 120; // Offset para dar espaço acima do formulário
      
      window.scrollTo({
        top: formPosition - offset,
        behavior: 'smooth'
      });
    }
  };

  // Iniciar edição do utilizador com scroll até o formulário
  const handleStartEdit = (user) => {
    // Definir o utilizador para edição
    setEditingUser({...user, password: ''});
    
    // Em seguida, fazemos scroll até o formulário
    setTimeout(() => {
      scrollToForm();
      
      // Focus no primeiro input após o DOM ser atualizado
      setTimeout(() => {
        if (formRef.current) {
          const firstInput = formRef.current.querySelector('input');
          if (firstInput) {
            firstInput.focus();
          }
        }
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

  // Lidar com upload de foto para novo utilizador
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      // Cria uma URL temporária para prévia da imagem
      const previewURL = URL.createObjectURL(file);
      setPreviewImage(previewURL);
    }
  };

  // Fazer upload da imagem para o servidor
  const uploadImage = async (file) => {
    if (!file) return null;

    const formData = new FormData();
    formData.append('foto', file);

    try {
      const response = await api.post('/pictures', formData);
      return response.data.caminho;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      throw new Error('Erro ao fazer upload da imagem');
    }
  };

  // Apagar foto do utilizador em edição
  const handleDeletePhoto = () => {
    if (editingUser) {
      setEditingUser({...editingUser, imagem: null});
    }
  };
  
  // Apagar foto temporária do novo utilizador
  const handleDeleteNewUserPhoto = () => {
    setSelectedFile(null);
    setPreviewImage(null);
    
    // Revoga URL de preview para liberar memória
    if (previewImage && previewImage.startsWith('blob:')) {
      URL.revokeObjectURL(previewImage);
    }
  };

  // Criar utilizador
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newUser.email || !newUser.nome || !newUser.password) {
      setError('Email, nome e password são obrigatórios');
      return;
    }

    try {
      // Primeiro faz upload da imagem, se houver
      let imagePath = null;
      if (selectedFile) {
        imagePath = await uploadImage(selectedFile);
      }
      
      // Cria o novo utilizador com o caminho da imagem (não a imagem em si)
      const userToCreate = {
        ...newUser,
        imagem: imagePath
      };
      
      const response = await api.post('/utilizadores', userToCreate);
      
      // Adicionar o tipo_utilizador ao utilizador criado se necessário
      let createdUser = response.data;
      if (!createdUser.tipo_utilizador && userTypes.length > 0) {
        const matchingType = userTypes.find(t => t.id === newUser.tipo_utilizador_id);
        if (matchingType) {
          createdUser = {...createdUser, tipo_utilizador: matchingType};
        }
      }
      
      // Atualizar a lista completa e recalcular a página atual
      setAllUsers([...allUsers, createdUser]);
      
      // Limpa o formulário
      setNewUser({ 
        email: '', 
        nome: '', 
        password: '',
        tipo_utilizador_id: newUser.tipo_utilizador_id,
        data_registo: new Date().toISOString().split('T')[0],
        imagem: null
      });
      setSelectedFile(null);
      setPreviewImage(null);
      setError('');
      setSuccess('Utilizador criado com sucesso!'); // Mensagem de sucesso
    } catch (err) {
      setError('Erro ao criar utilizador: ' + (err.message || err));
      console.error(err);
    }
  };

  // Atualizar utilizador
  const handleUpdate = async () => {
    if (!editingUser.email || !editingUser.nome) {
      setError('Email e nome são obrigatórios');
      return;
    }

    try {
      // Criar uma cópia sem a password se estiver vazia
      const userToUpdate = {...editingUser};
      if (!userToUpdate.password) {
        delete userToUpdate.password;
      }
      
      await api.put(`/utilizadores/${editingUser.id}`, userToUpdate);
      
      // Atualizar o utilizasor na lista completa
      const updatedAllUsers = allUsers.map(user => {
        if (user.id === editingUser.id) {
          let updatedUser = {...editingUser};
          if (userTypes.length > 0) {
            const matchingType = userTypes.find(t => t.id === editingUser.tipo_utilizador_id);
            if (matchingType) {
              updatedUser.tipo_utilizador = matchingType;
            }
          }
          return updatedUser;
        }
        return user;
      });
      
      setAllUsers(updatedAllUsers);
      setEditingUser(null);
      setError('');
      setSuccess('Utilizador atualizado com sucesso!'); // Mensagem de sucesso
    } catch (err) {
      setError('Erro ao atualizar utilizador');
      console.error(err);
    }
  };

  // Apagar utilizador
  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este utilizador?')) {
      try {
        await api.delete(`/utilizadores/${id}`);
        
        // Remover o utilizador da lista completa
        const filteredUsers = allUsers.filter(user => user.id !== id);
        setAllUsers(filteredUsers);
        
        // Ajustar página se necessário
        const newTotalPages = Math.ceil(filteredUsers.length / usersPerPage);
        if (page > newTotalPages && newTotalPages > 0) {
          setPage(newTotalPages);
        }
        
        setError('');
        setSuccess('Utilizador excluído com sucesso!'); // Mensagem de sucesso
      } catch (err) {
        setError('Erro ao excluir utilizador');
        console.error(err);
      }
    }
  };

  // Paginação
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Componente para renderizar imagem com useImageLoader
  const ProfileImage = ({ imageUrl }) => {
    const loadedImage = useImageLoader(imageUrl);
    
    if (loadedImage) {
      return (
        <img 
          src={loadedImage}
          alt="Foto de perfil" 
          className="bo-user-profile-photo"
        />
      );
    } else {
      return (
        <div className="bo-user-avatar-placeholder">
          <FiUser size={24} />
        </div>
      );
    }
  };

  // Renderizar foto de perfil ou avatar genérico
  const renderProfileImage = (user) => {
    if (user.imagem) {
      // Se a imagem for um caminho, usar o hook para carregar
      return <ProfileImage imageUrl={user.imagem} />;
    } else {
      // Se não houver imagem, mostrar avatar genérico
      return (
        <div className="bo-user-avatar-placeholder">
          <FiUser size={24} />
        </div>
      );
    }
  };

  return (
    <>
      <div className="backoffice-content-header">
        <h2 className="backoffice-content-title">Gestão de Utilizadores</h2>
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
          id="user-form"
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            if (editingUser) {
              handleUpdate();
            } else {
              handleCreate(e);
            }
          }} 
          className="bo-user-form"
        >
          {/* Área de upload/exibição de foto com label */}
          <div className="bo-form-group">
            <label htmlFor="photo-upload">Foto de Perfil</label>
            <div className="bo-photo-upload-area">
              {editingUser ? (
                // Modo de edição - apenas permitir excluir a foto
                <>
                  {editingUser.imagem ? (
                    <div className="bo-photo-container">
                      {renderProfileImage(editingUser)}
                      <div className="bo-photo-actions">
                        <button 
                          type="button" 
                          className="bo-btn-delete-photo"
                          onClick={handleDeletePhoto}
                        >
                          <FiTrash2 /> Apagar foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bo-photo-container">
                      <div className="bo-avatar-placeholder bo-photo-preview">
                        <FiUser size={40} />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // Modo de criação - permitir upload de nova foto e também remover
                <>
                  {previewImage ? (
                    <div className="bo-photo-container">
                      <img 
                        src={previewImage}
                        alt="Foto do perfil" 
                        className="bo-photo-preview" 
                      />
                      <div className="bo-photo-actions">
                        <button 
                          type="button" 
                          className="bo-btn-delete-photo"
                          onClick={handleDeleteNewUserPhoto}
                        >
                          <FiTrash2 /> Apagar foto
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bo-photo-upload">
                      <div className="bo-avatar-placeholder bo-photo-preview">
                        <FiUser size={40} />
                      </div>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        id="photo-upload"
                        className="bo-photo-upload-input"
                      />
                      <label htmlFor="photo-upload" className="bo-photo-upload-label">
                        Selecionar foto
                      </label>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="bo-form-group">
            <label htmlFor="user-email">Email*</label>
            <input
              id="user-email"
              type="email"
              placeholder="Digite o email do utilizador"
              value={editingUser ? editingUser.email : newUser.email}
              onChange={(e) => editingUser 
                ? setEditingUser({...editingUser, email: e.target.value})
                : setNewUser({...newUser, email: e.target.value})}
            />
          </div>
          
          <div className="bo-form-group">
            <label htmlFor="user-name">Nome*</label>
            <input
              id="user-name"
              type="text"
              placeholder="Digite o nome do utilizador"
              value={editingUser ? editingUser.nome : newUser.nome}
              onChange={(e) => editingUser 
                ? setEditingUser({...editingUser, nome: e.target.value})
                : setNewUser({...newUser, nome: e.target.value})}
            />
          </div>
          
          <div className="bo-form-group">
            <label htmlFor="user-password">
              {editingUser ? "Nova Password (deixe em branco para manter)" : "Password*"}
            </label>
            <input
              id="user-password"
              type="password"
              placeholder={editingUser ? "Digite a nova password" : "Digite a password"}
              value={editingUser ? editingUser.password || '' : newUser.password}
              onChange={(e) => editingUser 
                ? setEditingUser({...editingUser, password: e.target.value})
                : setNewUser({...newUser, password: e.target.value})}
            />
          </div>
          
          {userTypes.length > 0 && (
            <div className="bo-form-group">
              <label htmlFor="user-type">Tipo de Utilizador</label>
              <select
                id="user-type"
                value={editingUser ? editingUser.tipo_utilizador_id : newUser.tipo_utilizador_id}
                onChange={(e) => {
                  const typeId = Number(e.target.value);
                  if (editingUser) {
                    setEditingUser({...editingUser, tipo_utilizador_id: typeId});
                  } else {
                    setNewUser({...newUser, tipo_utilizador_id: typeId});
                  }
                }}
              >
                {userTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.tipo}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="bo-user-form-actions">
            {editingUser ? (
              <>
                <button type="submit" className="backoffice-btn backoffice-btn-edit">
                  <FiEdit /> Atualizar
                </button>
                <button 
                  type="button" 
                  className="backoffice-btn backoffice-btn-delete"
                  onClick={() => setEditingUser(null)}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button type="submit" className="backoffice-btn backoffice-btn-edit">
                <FiUserPlus /> Adicionar Utilizador
              </button>
            )}
          </div>
        </form>

        {/* Lista de utilizadores em cards */}
        <div className="bo-users-grid">
          {loading ? (
            <div className="bo-loading">Carregando...</div>
          ) : users.length > 0 ? (
            users.map(user => (
              <div 
                key={user.id} 
                className={`bo-user-card ${editingUser && editingUser.id === user.id ? 'editing' : ''}`}
              >
                <div className="bo-user-card-content">
                  <div className="bo-user-card-header">
                    {renderProfileImage(user)}
                    <h3>{user.nome}</h3>
                  </div>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Tipo:</strong> {user.tipo_utilizador ? user.tipo_utilizador.tipo : 'N/A'}</p>
                  <p><strong>Registo:</strong> {new Date(user.data_registo).toLocaleDateString()}</p>
                </div>
                
                <div className="bo-user-card-actions">
                  <button 
                    className="backoffice-btn backoffice-btn-edit"
                    onClick={() => handleStartEdit(user)}
                  >
                    <FiEdit />
                  </button>
                  
                  <button 
                    className="backoffice-btn backoffice-btn-delete"
                    onClick={() => handleDelete(user.id)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bo-no-users-message">Nenhum utilizador encontrado.</div>
          )}
        </div>
        
        {/* Paginação */}
        {totalPages > 1 && (
          <div className="bo-pagination">
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
        )}
      </div>
    </>
  );
};

export default UsersManagement;
