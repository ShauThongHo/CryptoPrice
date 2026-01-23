import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PortfolioScreen = () => {
  useEffect(() => {
    console.log('[UI TEST] Portfolio Mounted');
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Portfolio Loaded</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#800080', // Purple
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF', // White
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default PortfolioScreen;
