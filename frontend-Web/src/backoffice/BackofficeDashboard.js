import React, { useState, useEffect } from 'react';
import {
  FiUsers,
  FiBox,
  FiTag,
  FiLogOut,
  FiArrowLeft,
  FiMessageSquare
} from 'react-icons/fi';
import { useNavigate, Navigate } from 'react-router-dom';
import api from '../services/api';
import '../styles/backoffice/BackofficeDashboard.css';
import UsersManagement from '../backoffice/UsersManagement';
import ArticlesManagement from '../backoffice/ArticlesManagement';
import CategoriesManagement from '../backoffice/CategoriesManagement';
import MessagesManagement from '../backoffice/MessagesManagement';
import NotificationsManagement from '../backoffice/NotificationsManagement';
import { FiBell } from 'react-icons/fi';

const BackofficeDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('notifications');
  const [users, setUsers] = useState([]);
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  // Verificação de autenticação
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userTypeId');
    if (!token || userType != 2) {
      navigate('/');
    } else {
      setIsAuthenticated(true);
    }
  }, [navigate]);

  // Carregar dados após autenticação
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      try {
        const [
          usersRes,
          articlesRes,
          categoriesRes
        ] = await Promise.all([
          api.get('/utilizadores'),
          api.get('/artigos?include=fotos,categoria'),
          api.get('/categorias')
        ]);

        setUsers(usersRes.data);
        setArticles(articlesRes.data);
        setCategories(categoriesRes.data);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };
    loadData();
  }, [isAuthenticated]);

  const handleDelete = async (type, id) => {
    if (window.confirm('Tem certeza que deseja excluir este item?')) {
      try {
        await api.delete(`/${type}/${id}`);

        switch (type) {
          case 'utilizadores':
            setUsers(users.filter(user => user.id !== id));
            break;
          case 'artigos':
            setArticles(articles.filter(article => article.id !== id));
            break;
          case 'categorias':
            setCategories(categories.filter(cat => cat.id !== id));
            break;
          default:
            break;
        }
      } catch (error) {
        console.error('Erro ao excluir:', error);
      }
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'notifications':
        return <NotificationsManagement />;
      case 'users':
        return <UsersManagement />;
      case 'articles':
        return <ArticlesManagement />;
      case 'categories':
        return <CategoriesManagement />;
      case 'messages':
        return <MessagesManagement />;
      default:
        return <NotificationsManagement />;
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  if (isAuthenticated === null) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="backoffice-container">
      <div className="backoffice-dashboard-layout">
        <div className="backoffice-sidebar">
          <div className="backoffice-sidebar-header">
            <div className="backoffice-sidebar-title">
              <FiBox className="backoffice-logo-icon" />
              Admin IPT Sustentável
            </div>
          </div>

          <nav>
            <ul className="backoffice-nav-menu">
              {[
                { id: 'notifications', label: 'Notificações', icon: <FiBell /> },
                { id: 'users', label: 'Utilizadores', icon: <FiUsers /> },
                { id: 'articles', label: 'Artigos', icon: <FiBox /> },
                { id: 'categories', label: 'Categorias', icon: <FiTag /> },
                { id: 'messages', label: 'Mensagens', icon: <FiMessageSquare /> }
              ].map(item => (
                <li
                  key={item.id}
                  className={`backoffice-nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </nav>

          <div className="backoffice-sidebar-footer">
            <button
              className="backoffice-btn backoffice-btn-back backoffice-logout-btn"
              onClick={() => navigate('/')}
            >
              <FiArrowLeft />
              <span>Voltar</span>
            </button>
            <button
              className="backoffice-btn backoffice-btn-delete backoffice-logout-btn"
              onClick={handleLogout}
            >
              <FiLogOut />
              <span>Sair do Sistema</span>
            </button>
          </div>
        </div>

        <main className="backoffice-main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default BackofficeDashboard;
