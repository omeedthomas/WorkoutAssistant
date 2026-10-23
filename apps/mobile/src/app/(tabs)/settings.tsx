import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';
import { exercises } from '@ascent/core/data';
import type { Units } from '@ascent/core/lib/units';
import { RemindersCard } from '../../components/RemindersCard';
import { SyncCard } from '../../components/SyncCard';
import { Button, Card, Screen, SectionTitle, Segmented, Toggle } from '../../components/ui';
import { confirm } from '../../lib/dialogs';
import { useActiveWorkout } from '../../state/ActiveWorkoutContext';
import { usePrefs } from '../../state/PrefsContext';
import { useProgress } from '../../state/ProgressContext';
import { colors, space, type } from '../../theme';

export default function SettingsScreen() {
  const { state, setUnits, reset } = useProgress();
  const { prefs, setPrefs } = usePrefs();
  const session = useActiveWorkout();
  const mastered = Object.keys(state.mastered).length;

  return (
    <Screen>
      <Text style={type.hero}>Me</Text>
      <Card>
        <Text style={type.title}>
          {mastered} <Text style={type.small}>of {exercises.length} skills mastered</Text>
        </Text>
        <Text style={type.small}>{state.goals.length ? `${state.goals.length} goal${state.goals.length === 1 ? '' : 's'} set` : 'No goals yet: set one from any skill.'}</Text>
      </Card>

      <SectionTitle>Preferences</SectionTitle>
      <Card>
        <Text style={type.eyebrow}>Weight units</Text>
        <Segmented<Units>
          value={state.units}
          onChange={setUnits}
          options={[
            { value: 'lb', label: 'Pounds (lb)' },
            { value: 'kg', label: 'Kilograms (kg)' },
          ]}
        />
      </Card>
      <Card style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={type.heading}>Voice coach</Text>
          <Text style={type.small}>Reads out each set, rest and countdown during workouts.</Text>
        </View>
        <Toggle label="Voice coach" value={prefs.voice} onChange={(voice) => setPrefs({ voice })} />
      </Card>

      <SectionTitle>Reminders</SectionTitle>
      <RemindersCard />

      <SectionTitle>Google Drive sync</SectionTitle>
      <SyncCard />

      <SectionTitle>Your data</SectionTitle>
      <Button
        label="Reset all progress"
        kind="danger"
        onPress={() =>
          confirm('Reset all progress?', 'This deletes your mastered skills, logs and workouts on this phone.', 'Reset', () => {
            session.end();
            reset();
          }, true)
        }
      />
      <Text style={[type.small, { textAlign: 'center', color: colors.text3 }]}>Ascent {Constants.expoConfig?.version ?? ''}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
});
