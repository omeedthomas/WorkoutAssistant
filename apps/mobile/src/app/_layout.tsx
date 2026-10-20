import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActiveWorkoutProvider } from '../state/ActiveWorkoutContext';
import { CloudProvider } from '../state/CloudContext';
import { PrefsProvider } from '../state/PrefsContext';
import { ProgressProvider } from '../state/ProgressContext';
import { colors } from '../theme';

const loading = (
  <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator color={colors.accent} />
  </View>
);

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ProgressProvider fallback={loading}>
        <ActiveWorkoutProvider>
          <CloudProvider>
            <PrefsProvider>
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: colors.bg },
                  headerTintColor: colors.text,
                  headerShadowVisible: false,
                  contentStyle: { backgroundColor: colors.bg },
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="tree/[id]" options={{ title: '' }} />
                <Stack.Screen name="exercise/[id]" options={{ title: '' }} />
                <Stack.Screen name="workout" options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }} />
              </Stack>
            </PrefsProvider>
          </CloudProvider>
        </ActiveWorkoutProvider>
      </ProgressProvider>
    </SafeAreaProvider>
  );
}
