import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const DashboardScreen = () => {
  useEffect(() => {
    console.log('[UI TEST] Dashboard Mounted');
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Dashboard Loaded</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0000FF', // Blue
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF', // White
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default DashboardScreen;
