import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, radius, space, type } from '../theme';

/** A scrolling page on the app background, clear of the notch (and of the tab bar's edge when `edges` says so). */
export function Screen({ children, edges = ['top'], scroll = true }: { children: ReactNode; edges?: Edge[]; scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, accent }: { children: ReactNode; style?: StyleProp<ViewStyle>; accent?: string }) {
  return <View style={[styles.card, accent && { borderLeftWidth: 4, borderLeftColor: accent }, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={type.heading}>{children}</Text>
      {right}
    </View>
  );
}

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  kind = 'primary',
  big,
  icon,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
  big?: boolean;
  icon?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      role="button"
      aria-label={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        big && styles.buttonBig,
        styles[`button_${kind}`],
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.8 },
        style,
      ]}
    >
      {icon}
      <Text style={[styles.buttonText, big && { fontSize: 18 }, kind === 'primary' ? { color: colors.accentInk } : kind === 'danger' ? { color: colors.danger } : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({ label, selected, color = colors.accent, onPress }: { label: string; selected: boolean; color?: string; onPress: () => void }) {
  return (
    <Pressable
      role="checkbox"
      aria-checked={selected}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: `${color}26`, borderColor: color }]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.chipText, selected && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented} role="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            role="radio"
            aria-checked={on}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && styles.segmentOn]}
          >
            <Text style={[styles.segmentText, on && { color: colors.text }]}>{o.label}</Text>
            {o.hint && <Text style={styles.segmentHint}>{o.hint}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressBar({ value, color = colors.accent, height = 6 }: { value: number; color?: string; height?: number }) {
  return (
    <View style={[styles.track, { height }]}>
      <View style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, height, backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

/**
 * An on/off switch. React Native's Switch hands `aria-label` to the native view unconverted, so the phones never
 * read it: they get `accessibilityLabel` as well (react-native-web only reads `aria-label`).
 */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      trackColor={{ true: colors.accent, false: colors.surface3 }}
      thumbColor={colors.text}
      aria-label={label}
      {...(Platform.OS !== 'web' && { accessibilityLabel: label })}
    />
  );
}

export function Tag({ label, color = colors.text2 }: { label: string; color?: string }) {
  return (
    <View style={[styles.tag, { borderColor: `${color}55`, backgroundColor: `${color}1a` }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

/** A − value + control for logging sets, reps, seconds or weight. */
export function Stepper({ label, value, onChange, step = 1, min = 0, max = 999, unit }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
}) {
  const round = (v: number) => Math.round(v * 100) / 100;
  return (
    <View style={{ flex: 1, gap: space(1) }}>
      <Text style={type.eyebrow}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable role="button" aria-label={`Less ${label}`} style={styles.stepperBtn} onPress={() => onChange(Math.max(min, round(value - step)))}>
          <Text style={styles.stepperSign}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>
          {value}
          {unit && <Text style={type.small}> {unit}</Text>}
        </Text>
        <Pressable role="button" aria-label={`More ${label}`} style={styles.stepperBtn} onPress={() => onChange(Math.min(max, round(value + step)))}>
          <Text style={styles.stepperSign}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space(4), paddingBottom: space(10), gap: space(4) },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space(4),
    gap: space(2),
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space(2) },
  button: {
    flexDirection: 'row',
    gap: space(2),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space(3),
    paddingHorizontal: space(4),
    borderRadius: radius.md,
  },
  buttonBig: { paddingVertical: space(4), borderRadius: radius.lg },
  button_primary: { backgroundColor: colors.accent },
  button_secondary: { backgroundColor: colors.surface3, borderWidth: 1, borderColor: colors.borderStrong },
  button_ghost: { backgroundColor: 'transparent' },
  button_danger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: `${colors.danger}88` },
  buttonText: { fontSize: 16, fontWeight: '700', color: colors.text },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    paddingVertical: space(2),
    paddingHorizontal: space(3),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface2,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  segmented: { flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.md, padding: 4, gap: 4 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: space(2), borderRadius: radius.sm },
  segmentOn: { backgroundColor: colors.surface3 },
  segmentText: { fontSize: 14, fontWeight: '700', color: colors.text3 },
  segmentHint: { fontSize: 12, color: colors.text3, marginTop: 2 },
  track: { backgroundColor: colors.surface3, borderRadius: 999, overflow: 'hidden' },
  tag: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space(2), paddingVertical: 2 },
  tagText: { fontSize: 12, fontWeight: '700' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  stepperSign: { fontSize: 24, color: colors.text, fontWeight: '600' },
  stepperValue: { fontSize: 22, fontWeight: '800', color: colors.text },
});
