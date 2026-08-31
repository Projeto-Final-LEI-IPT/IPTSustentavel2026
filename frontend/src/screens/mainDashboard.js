import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MainDashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Dashboard Principal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  text: { fontSize: 18, fontWeight: 'bold', color: '#166534' }
});