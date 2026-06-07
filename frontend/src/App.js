import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Substitui o localStorage

// Importação dos ecrãs 
import LoginScreen from './src/screens/LoginScreen';
import MainDashboard from './src/screens/MainDashboard';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTypeId, setUserTypeId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Verifica o estado da sessão ao abrir a App
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const storedUserTypeId = await AsyncStorage.getItem('userTypeId');
        
        if (token && storedUserTypeId) {
          setUserTypeId(storedUserTypeId.toString());
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Erro ao ler sessão local:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Ecrã de Loading enquanto lê o AsyncStorage
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Rota Não Autenticada
          <Stack.Screen name="Login">
            {(props) => (
              <LoginScreen 
                {...props} 
                setIsAuthenticated={setIsAuthenticated} 
                setUserTypeId={setUserTypeId} 
              />
            )}
          </Stack.Screen>
        ) : (
          // Rota Autenticada
          <Stack.Screen name="Dashboard">
            {(props) => (
              <MainDashboard 
                {...props} 
                setIsAuthenticated={setIsAuthenticated} 
                userTypeId={userTypeId} 
              />
            )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
