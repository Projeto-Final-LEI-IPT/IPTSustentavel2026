import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen'; 
import CreateArticleScreen from './screens/CreateArticleScreen';
import ArticleDetailScreen from './screens/ArticleDetailScreen';
import EditArticleScreen from './screens/EditArticleScreen';
import ChatScreen from './screens/ChatScreen';
import ConversationsScreen from './screens/ConversationsScreen';
import api from './services/api';

function EmptyScreen() {
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
  const [unreadCount, setUnreadCount] = useState(0);
  const insets = useSafeAreaInsets(); // Obtém a barra de navegação inferior do dispositivo

  const fetchUnreadCount = useCallback(async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      const response = await api.get('/mensagens');
      const mensagens = response.data || [];

      const totalUnread = mensagens.filter(msg => {
        const destId = Number(msg.destinatario_id || msg.destinatario?.id);
        const remetId = Number(msg.remetente_id);
        const currentId = Number(userId);

        return destId === currentId && remetId !== currentId && !msg.lida;
      }).length;

      setUnreadCount(totalUnread);
    } catch (error) {
      console.warn('Erro ao atualizar contador de mensagens:', error.message);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 4000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

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
            // Altura flexível: 60px base + a barra do Android (se existir)
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
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
          component={ConversationsScreen}
          listeners={{
            tabPress: () => {
              setTimeout(fetchUnreadCount, 400);
            },
          }}
          options={{
            title: 'Conversas',
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarBadgeStyle: {
              backgroundColor: '#dc3545',
              color: '#ffffff',
              fontSize: 10,
              fontWeight: '700',
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              lineHeight: 18,
              textAlign: 'center',
            },
          }}
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
    <SafeAreaProvider>
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
              <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={({ route }) => ({
                  title: route.params?.recipientName || 'Conversa',
                  headerStyle: { backgroundColor: '#2e7d32' },
                  headerTintColor: '#fff',
                  headerTitleStyle: { fontWeight: '700' },
                })}
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
    </SafeAreaProvider>
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