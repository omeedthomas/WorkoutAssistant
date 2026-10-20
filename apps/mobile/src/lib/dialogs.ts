import { Alert, Platform } from 'react-native';

/** A yes/no dialog. React Native's Alert does nothing in a browser, so the web preview uses the browser's own. */
export function confirm(
  title: string,
  message: string,
  action: string,
  onConfirm: () => void,
  destructive = false,
  onCancel?: () => void,
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    else onCancel?.();
    return;
  }
  Alert.alert(
    title,
    message,
    [
      { text: 'Cancel', style: 'cancel', onPress: onCancel },
      { text: action, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
    ],
    { cancelable: true, onDismiss: onCancel },
  );
}

/** The same as confirm(), as a promise of the answer. */
export const ask = (title: string, message: string, action: string, destructive = false) =>
  new Promise<boolean>((resolve) => confirm(title, message, action, () => resolve(true), destructive, () => resolve(false)));

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') window.alert(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}
