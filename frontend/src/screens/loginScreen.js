import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  Image, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginManual = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Aviso', 'Por favor, preenche todos os campos.');
      return;
    }

    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    console.log('[LOGIN] A tentar ligar a:', `${api.defaults.baseURL}/auth/login`);

    try {
      const response = await api.post('/auth/login', { 
        email: cleanEmail, 
        password: cleanPassword 
      });

      console.log('[LOGIN] Sucesso:', response.data);

      const { token, userId, userTypeId } = response.data;

      if (!token) {
        throw new Error('O servidor não devolveu um token válido.');
      }

      // 1. Guardar a sessão no armazenamento persistente
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('userId', (userId || response.data.id || '').toString());
      if (userTypeId) {
        await AsyncStorage.setItem('userTypeId', userTypeId.toString());
      }

      // 2. Injetar logo o token nas chamadas automáticas do Axios
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // 3. Atualizar o estado no App.js
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error) {
      console.error('[LOGIN] Erro capturado:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      // Extrai sempre texto simples para o alerta não falhar
      let errorText = 'Ocorreu um erro ao tentar entrar.';
      if (typeof error.response?.data === 'string') {
        errorText = error.response.data;
      } else if (error.response?.data?.message) {
        errorText = error.response.data.message;
      } else if (error.message.includes('Network Error')) {
        errorText = 'Não foi possível ligar ao servidor. Verifica o IP em services/api.js e se o backend está ligado.';
      } else if (error.message) {
        errorText = error.message;
      }

      Alert.alert('Erro no Login', errorText);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginMicrosoft = () => {
    Alert.alert('Microsoft OAuth2', 'A redirecionar para o login institucional do IPT...');
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.loginForm}>
        {/* Logotipo do IPT */}
        <Image 
          source={require('../ipt.png')} 
          style={styles.logo} 
          resizeMode="contain"
        />
        
        <Text style={styles.title}>Plataforma de Trocas IPT</Text>
        <Text style={styles.subtitle}>IPT Sustentável</Text>

        <View style={styles.formGroup}>
          <TextInput
            style={styles.searchInput}
            placeholder="Email"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <View style={styles.formGroup}>
          <TextInput
            style={styles.searchInput}
            placeholder="Password"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
        </View>

        <TouchableOpacity 
          style={[styles.viewDetails, loading && { opacity: 0.7 }]} 
          onPress={handleLoginManual}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity 
          style={styles.buttonMicrosoft} 
          onPress={handleLoginMicrosoft}
          disabled={loading}
        >
          <Text style={styles.buttonTextMS}>Entrar com Conta IPT</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa', 
    justifyContent: 'center', 
    padding: 16 
  },
  loginForm: { 
    backgroundColor: 'white', 
    borderRadius: 8, 
    padding: 32, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3, 
    alignItems: 'center' 
  },
  logo: { 
    width: 100, 
    height: 50, 
    marginBottom: 16 
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#111', 
    textAlign: 'center', 
    fontFamily: Platform.OS === 'ios' ? 'Arial' : 'sans-serif' 
  },
  subtitle: { 
    fontSize: 14,
    color: '#4CAF50', 
    marginBottom: 24, 
    fontWeight: '600' 
  },
  formGroup: { 
    width: '100%', 
    marginBottom: 20 
  },
  searchInput: { 
    width: '100%', 
    padding: 12, 
    borderWidth: 1,
    borderColor: '#ddd', 
    borderRadius: 4, 
    fontSize: 16, 
    color: '#000', 
    backgroundColor: '#fff', 
    minHeight: 44 
  },
  viewDetails: { 
    backgroundColor: '#4CAF50', 
    padding: 12, 
    borderRadius: 4, 
    width: '100%', 
    alignItems: 'center', 
    justifyContent: 'center', 
    minHeight: 44,
    marginTop: 8
  },
  buttonText: { 
    color: 'white', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  dividerContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginVertical: 20, 
    width: '100%' 
  },
  dividerLine: { 
    flex: 1, 
    height: 1, 
    backgroundColor: '#ddd' 
  },
  dividerText: { 
    marginHorizontal: 10, 
    color: '#666' 
  },
  buttonMicrosoft: { 
    width: '100%', 
    height: 44, 
    backgroundColor: '#2f2f2f', 
    borderRadius: 4, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  buttonTextMS: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: '600' 
  }
});