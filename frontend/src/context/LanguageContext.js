import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const translations = {
  pt: {
    // Geral e Tabs
    home: 'Início',
    create: 'Criar',
    messages: 'Conversas',
    profile: 'Perfil',
    createAd: 'Criar Anúncio',
    myProfile: 'O Meu Perfil',
    conversations: 'Conversas',
    loading: 'A carregar...',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    save: 'Guardar',
    success: 'Sucesso',
    error: 'Erro',
    warning: 'Aviso',
    ok: 'OK',

    // Modal de Idioma
    selectLanguageTitle: 'Escolha o Idioma / Select Language',
    selectLanguageSubtitle: 'Selecione o idioma de preferência para a aplicação:',
    portuguese: 'Português',
    english: 'English',

    // Home e Artigos
    searchPlaceholder: 'Pesquisar artigos...',
    noArticlesFound: 'Nenhum artigo encontrado.',
    new: 'Novo',
    used: 'Usado',
    available: 'Disponível',
    unavailable: 'Indisponível',
    sendMessage: 'Enviar Mensagem',
    sendOwnerMessage: 'Enviar Mensagem ao Dono',
    noImage: 'Sem imagem',
    publishedArticles: 'Artigos Publicados',
    myAds: 'Os Meus Anúncios',
    userAds: 'Anúncios Deste Utilizador',
    logout: 'Terminar Sessão',
    logoutConfirm: 'Tem a certeza de que deseja sair?',
    articleDetails: 'Detalhe do Artigo',
    editArticle: 'Editar Artigo',
    userProfile: 'Perfil do Utilizador',
    description: 'Descrição',
    noDescription: 'Nenhuma descrição fornecida para este artigo.',
    deleteArticleConfirm: 'Tens a certeza de que queres eliminar este artigo? Esta ação não pode ser revertida.',
    articleDeletedSuccess: 'Artigo eliminado com sucesso!',
    failedDeleteArticle: 'Falha ao eliminar o artigo.',
    iptUser: 'Utilizador IPT',
    noArticlesPublished: 'Nenhum artigo publicado.',

    // Formulário de Criação / Edição
    createListingTitle: 'Criar Novo Anúncio',
    listingTitleLabel: 'Título do Anúncio *',
    listingTitlePlaceholder: 'Ex: Livro de Cálculo I',
    titleRequired: 'O título é obrigatório.',
    categoryRequired: 'Seleciona uma categoria.',
    categoryLabel: 'Categoria *',
    conditionLabel: 'Estado do Item',
    descriptionLabel: 'Descrição',
    descriptionPlaceholder: 'Descreve o estado, detalhes ou motivo da troca...',
    photosLabel: 'Fotografias *',
    addPhoto: 'Adicionar',
    photoRequired: 'Por favor, adiciona pelo menos uma fotografia ao teu anúncio antes de publicar.',
    photoLimit: 'Podes adicionar no máximo 5 imagens.',
    permissionRequired: 'Permissão Necessária',
    galleryPermissionMsg: 'Precisamos de autorização de acesso às fotos para adicionar imagens ao teu anúncio.',
    publishListing: 'Publicar Anúncio',
    listingPublishedSuccess: 'Anúncio publicado com sucesso!',
    failedPublishListing: 'Falha ao publicar o artigo.',

    // Chat e Conversas
    chatPlaceholder: 'Escreve uma mensagem...',
    noConversations: 'Sem conversas ainda.',
    noMessagesPrompt: 'Sem mensagens. Diz olá para iniciar a conversa!',
    articleInChat: 'Artigo em conversa',
    sessionRequired: 'Precisas de iniciar sessão para aceder às mensagens.',

    // Regras
    articleRequiredTitle: 'Artigo Necessário',
    articleRequiredMsg: 'Para incentivar as trocas na plataforma, precisas de ter pelo menos 1 artigo publicado antes de contactares outros utilizadores.',
    notNow: 'Agora não',

    // Categorias da Base de Dados
    categories: {
      'Livros': 'Livros',
      'Material Escolar': 'Material Escolar',
      'Eletrónica': 'Eletrónica',
      'Vestuário': 'Vestuário',
      'Mobiliário': 'Mobiliário',
      'Outros': 'Outros'
    }
  },
  en: {
    // Geral e Tabs
    home: 'Home',
    create: 'Create',
    messages: 'Messages',
    profile: 'Profile',
    createAd: 'Create Listing',
    myProfile: 'My Profile',
    conversations: 'Conversations',
    loading: 'Loading...',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    save: 'Save',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    ok: 'OK',

    // Modal de Idioma
    selectLanguageTitle: 'Select Language / Escolha o Idioma',
    selectLanguageSubtitle: 'Select your preferred language for the app:',
    portuguese: 'Português',
    english: 'English',

    // Home e Artigos
    searchPlaceholder: 'Search items...',
    noArticlesFound: 'No items found.',
    new: 'New',
    used: 'Used',
    available: 'Available',
    unavailable: 'Unavailable',
    sendMessage: 'Send Message',
    sendOwnerMessage: 'Send Message to Owner',
    noImage: 'No image',
    publishedArticles: 'Published Items',
    myAds: 'My Listings',
    userAds: 'User Listings',
    logout: 'Log Out',
    logoutConfirm: 'Are you sure you want to log out?',
    articleDetails: 'Item Details',
    editArticle: 'Edit Listing',
    userProfile: 'User Profile',
    description: 'Description',
    noDescription: 'No description provided for this item.',
    deleteArticleConfirm: 'Are you sure you want to delete this item? This action cannot be undone.',
    articleDeletedSuccess: 'Item deleted successfully!',
    failedDeleteArticle: 'Failed to delete item.',
    iptUser: 'IPT User',
    noArticlesPublished: 'No items published yet.',

    // Formulário de Criação / Edição
    createListingTitle: 'Create New Listing',
    listingTitleLabel: 'Listing Title *',
    listingTitlePlaceholder: 'E.g.: Calculus I Book',
    titleRequired: 'Title is required.',
    categoryRequired: 'Please select a category.',
    categoryLabel: 'Category *',
    conditionLabel: 'Item Condition',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'Describe the condition, details or reason for exchange...',
    photosLabel: 'Photos *',
    addPhoto: 'Add',
    photoRequired: 'Please add at least one photo before publishing your listing.',
    photoLimit: 'You can add up to 5 photos.',
    permissionRequired: 'Permission Required',
    galleryPermissionMsg: 'We need permission to access your gallery to add photos to your listing.',
    publishListing: 'Publish Listing',
    listingPublishedSuccess: 'Listing published successfully!',
    failedPublishListing: 'Failed to publish listing.',

    // Chat e Conversas
    chatPlaceholder: 'Type a message...',
    noConversations: 'No conversations yet.',
    noMessagesPrompt: 'No messages. Say hello to start the conversation!',
    articleInChat: 'Item in conversation',
    sessionRequired: 'You must log in to access messages.',

    // Regras
    articleRequiredTitle: 'Listing Required',
    articleRequiredMsg: 'To encourage community exchanges, you must have at least 1 published listing before contacting other users.',
    notNow: 'Not now',

    // Categorias da Base de Dados
    categories: {
      'Livros': 'Books',
      'Material Escolar': 'School Supplies',
      'Eletrónica': 'Electronics',
      'Vestuário': 'Clothing',
      'Mobiliário': 'Furniture',
      'Outros': 'Other'
    }
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('pt');
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  useEffect(() => {
    const checkLanguageSelection = async () => {
      try {
        const storedLang = await AsyncStorage.getItem('appLanguage');
        if (storedLang) {
          setLanguage(storedLang);
        } else {
          setShowLanguageModal(true);
        }
      } catch (err) {
        console.error('Erro ao ler idioma local:', err);
      }
    };
    checkLanguageSelection();
  }, []);

  const changeLanguage = async (newLang) => {
    try {
      await AsyncStorage.setItem('appLanguage', newLang);
      setLanguage(newLang);
      setShowLanguageModal(false);
    } catch (err) {
      console.error('Erro ao guardar idioma:', err);
    }
  };

  const t = (key) => translations[language]?.[key] || key;

  const translateCategory = (catName) => {
    if (!catName) return '';
    return translations[language]?.categories?.[catName] || catName;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: changeLanguage,
        t,
        translateCategory,
        showLanguageModal,
        setShowLanguageModal
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}