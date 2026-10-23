// The app's entry point (package.json "main"): Expo Router, plus the home screen widget, which Android draws by
// running JavaScript in the background without opening the app.
import 'expo-router/entry';
import { registerWidgets } from './src/widget';

registerWidgets();
