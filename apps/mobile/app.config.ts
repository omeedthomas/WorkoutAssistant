import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json with settings that depend on apps/mobile/.env (see .env.example):
 * Google Sign-In on iOS needs a URL scheme made from the iOS OAuth client id. Android needs no plugin, so
 * without an iOS client id the plugin is left out (with no options it would expect Firebase files).
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  // "1234-abc.apps.googleusercontent.com" → "com.googleusercontent.apps.1234-abc"
  const iosUrlScheme = iosClientId && `com.googleusercontent.apps.${iosClientId.replace(/\.apps\.googleusercontent\.com$/, '')}`;
  return {
    ...config,
    name: config.name ?? 'Ascent',
    slug: config.slug ?? 'ascent',
    plugins: [...(config.plugins ?? []), ...(iosUrlScheme ? [['@react-native-google-signin/google-signin', { iosUrlScheme }] as [string, unknown]] : [])],
  };
};
