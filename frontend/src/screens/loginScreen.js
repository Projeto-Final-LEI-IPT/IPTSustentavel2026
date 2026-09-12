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
  Platform 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function LoginScreen({ setIsAuthenticated, setUserTypeId }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLoginManual = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, userId, userTypeId } = response.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('userId', userId.toString());
      await AsyncStorage.setItem('userTypeId', userTypeId.toString());

      setUserTypeId(userTypeId.toString());
      setIsAuthenticated(true);
    } catch (error) {
      Alert.alert('Erro no Login', error.response?.data?.message || 'Credenciais inválidas.');
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
            placeholder="Email institucional"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
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
          />
        </View>

        <TouchableOpacity style={styles.viewDetails} onPress={handleLoginManual}>
          <Text style={styles.buttonText}>Entrar</Text>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.buttonMicrosoft} onPress={handleLoginMicrosoft}>
          <Image 
            source={{ uri: 'METER ICON DA MICROSOFT!!!' }} 
            style={styles.msIcon}
          />
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
    fontFamily: 
    Platform.OS === 'ios' ? 'Arial' : 'sans-serif' 
    },
  
  subtitle: { 
    fontSize: 14,
    color: '#4CAF50', 
    marginBottom: 24, 
    fontWeight: '600' 
    },
  
  formGroup: { 
    width: '100%', 
    marginBottom: 24 
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
    minHeight: 44 
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
  
  msIcon: {
    width: 16, 
    height: 16, 
    marginRight: 12 
    },
  
  buttonTextMS: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: '600' 
    }
});