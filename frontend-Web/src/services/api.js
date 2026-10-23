// Este código importa a biblioteca axios, que é utilizada para fazer pedidos HTTP
import axios from 'axios';

// Cria uma instância do axios com uma URL base definida para as chamadas à API
const api = axios.create({
  baseURL: 'http://localhost:3001/api',
});

// Adiciona um interceptor que atua em todos os pedidos antes de serem enviados
api.interceptors.request.use(config => {
  // Obtém o token de autenticação e guarda numa variavel local do browser
  const token = localStorage.getItem('token');
  // Se existir um token, adiciona-o aos cabeçalhos do pedido como um token Bearer
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Devolve a configuração atualizada para continuar com o pedido
  return config;
});

// Exporta a instância da API configurada para ser utilizada noutros ficheiros
export default api;
