// Importa a biblioteca axios para fazer os pedidos HTTP
import axios from 'axios';
// Importa o AsyncStorage para substituir o localStorage da Web
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cria a instância do Axios com o endereço do teu servidor
const api = axios.create({
  baseURL: 'http://IP do computador:3001/api', 
  timeout: 10000, // Tempo limite de 10 segundos
});

// Interceptor que adiciona o Token automaticamente antes de cada pedido
api.interceptors.request.use(
  async (config) => {
    try {
      // Procura o token de autenticação guardado no armazenamento do telemóvel
      const token = await AsyncStorage.getItem('token'); 
      // Se o token existir, adiciona-o ao cabeçalho Authorization como Bearer
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Erro ao ir buscar o token no AsyncStorage:', error);
    }
    
    // Devolve a configuração para o Axios avançar com o pedido
    return config;
  },
  (error) => {
    // Caso ocorra algum erro no envio do pedido
    return Promise.reject(error);
  }
);

export default api;
