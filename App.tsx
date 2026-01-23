import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';

import AppNavigator from './src/navigation/AppNavigator';

const App = () => {
  console.log('🚀 App Root Mounted');

  return (
    <SafeAreaProvider>
      <PaperProvider theme={MD3DarkTheme}>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

export default App;
