import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen'; 
import CreateArticleScreen from './screens/CreateArticleScreen';
import ArticleDetailScreen from './screens/ArticleDetailScreen';
import EditArticleScreen from './screens/EditArticleScreen';

function EmptyScreen() {
  return <View style={styles.center} />;
}
function MessagesPlaceholder() {
  return <View style={styles.center} />;
}
function ProfilePlaceholder() {
  return <View style={styles.center} />;
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Função para validar se o token JWT expirou através do campo 'exp' do payload
function isTokenExpired(token) {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return true;

    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);

    if (!decoded.exp) return false;

    // exp vem em segundos; Date.now() em milissegundos
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTimeInSeconds;
  } catch (error) {
    return true;
  }
}

function MainTabNavigator({ onLogout }) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: {
            backgroundColor: '#2e7d32',
          },
          headerTintColor: '#ffffff',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontWeight: '700',
          },
          tabBarActiveTintColor: '#ffffff',
          tabBarInactiveTintColor: '#a5d6a7',
          tabBarStyle: {
            backgroundColor: '#2e7d32',
            borderTopWidth: 0,
            elevation: 10,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: -2 },
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
          tabBarIcon: ({ color, size, focused }) => {
            let iconName;

            if (route.name === 'Início') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Criar') {
              iconName = focused ? 'add-circle' : 'add-circle-outline';
              size = 28;
            } else if (route.name === 'Mensagens') {
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            } else if (route.name === 'Perfil') {
              iconName = focused ? 'person' : 'person-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen
          name="Início"
          options={{ title: 'IPT Sustentável' }}
        >
          {(props) => <HomeScreen {...props} onLogout={onLogout} />}
        </Tab.Screen>
        <Tab.Screen
          name="Criar"
          component={EmptyScreen}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setShowCreateModal(true);
            },
          }}
          options={{ title: 'Criar Anúncio' }}
        />
        <Tab.Screen
          name="Mensagens"
          component={MessagesPlaceholder}
          options={{ title: 'Conversas' }}
        />
        <Tab.Screen
          name="Perfil"
          component={ProfilePlaceholder}
          options={{ title: 'O Meu Perfil' }}
        />
      </Tab.Navigator>

      <CreateArticleScreen
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onArticleCreated={() => setShowCreateModal(false)}
      />
    </>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('token');

        if (!token) {
          setIsAuthenticated(false);
          return;
        }

        // Se o token existir mas já tiver expirado:
        if (isTokenExpired(token)) {
          await AsyncStorage.multiRemove(['token', 'userId', 'userTypeId']);
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
       {isAuthenticated ? (
         <>
           <Stack.Screen name="Main" options={{ headerShown: false }}>
             {(props) => (
                <MainTabNavigator
                  {...props}
                  onLogout={() => setIsAuthenticated(false)}
               />
             )}
            </Stack.Screen>
            <Stack.Screen
             name="ArticleDetail"
             component={ArticleDetailScreen}
             options={{
                title: 'Detalhe do Artigo',
                headerStyle: { backgroundColor: '#2e7d32' },
                headerTintColor: '#fff',
               headerTitleStyle: { fontWeight: '700' },
              }}
            />
            <Stack.Screen
              name="EditArticleScreen"
              component={EditArticleScreen}
              options={{
                title: 'Editar Artigo',
                headerStyle: { backgroundColor: '#2e7d32' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: '700' },
              }}
            />
         </>
       ) : (
         <Stack.Screen name="Login" options={{ headerShown: false }}>
            {(props) => (
              <LoginScreen
                {...props}
               onLoginSuccess={() => setIsAuthenticated(true)}
             />
           )}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});