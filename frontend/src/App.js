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
import ProfileScreen from './screens/ProfileScreen';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import LanguageSelectModal from './components/LanguageSelectModal';
import api from './services/api';

function EmptyScreen() {
  return <View style={styles.center} />;
}

// Wrapper para permitir que CreateArticleScreen funcione na Stack navigation
function CreateArticleScreenWrapper({ navigation }) {
  return (
    <CreateArticleScreen
      visible={true}
      onClose={() => navigation.goBack()}
      onArticleCreated={() => navigation.goBack()}
    />
  );
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
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();

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
        key={`tab-${language}`}
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
          options={{ 
            title: 'IPT Sustentável',
            tabBarLabel: t('home') 
          }}
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
          options={{ 
            title: t('createAd'),
            tabBarLabel: t('create')
          }}
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
            title: t('conversations'),
            tabBarLabel: t('messages'),
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
          options={{ 
            title: t('myProfile'),
            tabBarLabel: t('profile')
          }}
        >
          {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>

      <CreateArticleScreen
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onArticleCreated={() => setShowCreateModal(false)}
      />
    </>
  );
}

function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();

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
    <NavigationContainer key={`nav-${language}`}>
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
                title: t('articleDetails') || 'Detalhes',
                headerStyle: { backgroundColor: '#2e7d32' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: '700' },
              }}
            />
            <Stack.Screen
              name="EditArticleScreen"
              component={EditArticleScreen}
              options={{
                title: t('editArticle') || 'Editar',
                headerStyle: { backgroundColor: '#2e7d32' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: '700' },
              }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={({ route }) => ({
                title: route.params?.recipientName || t('conversations'),
                headerStyle: { backgroundColor: '#2e7d32' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: '700' },
              })}
            />
            <Stack.Screen
              name="UserProfile"
              component={ProfileScreen}
              options={{
                title: t('userProfile') || 'Perfil',
                headerStyle: { backgroundColor: '#2e7d32' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: '700' },
              }}
            />
            <Stack.Screen
              name="CreateArticleScreen"
              component={CreateArticleScreenWrapper}
              options={{
                headerShown: false,
                presentation: 'modal'
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

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AppNavigator />
        <LanguageSelectModal />
      </LanguageProvider>
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