import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageSelectModal() {
  const { showLanguageModal, setLanguage, t } = useLanguage();

  if (!showLanguageModal) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={showLanguageModal}
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="globe-outline" size={32} color="#2e7d32" />
          </View>

          <Text style={styles.title}>{t('selectLanguageTitle')}</Text>
          <Text style={styles.subtitle}>{t('selectLanguageSubtitle')}</Text>

          <TouchableOpacity
            style={[styles.btn, styles.btnPt]}
            activeOpacity={0.8}
            onPress={() => setLanguage('pt')}
          >
            <Text style={styles.flag}>🇵🇹</Text>
            <Text style={styles.btnTextPt}>Português</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnEn]}
            activeOpacity={0.8}
            onPress={() => setLanguage('en')}
          >
            <Text style={styles.flag}>🇬🇧</Text>
            <Text style={styles.btnTextEn}>English</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 13,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    marginVertical: 6
  },
  btnPt: {
    backgroundColor: '#2e7d32'
  },
  btnEn: {
    backgroundColor: '#1976d2'
  },
  flag: {
    fontSize: 20,
    marginRight: 10
  },
  btnTextPt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
  btnTextEn: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  }
});