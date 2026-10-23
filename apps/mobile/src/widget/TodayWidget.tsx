'use no memo'; // widgets are plain functions turned into native views, so the React Compiler must leave them alone

import { FlexWidget, TextWidget, type HexColor, type WidgetInfo } from 'react-native-android-widget';
import { colors } from '../theme';
import type { TodayWidgetData } from './data';

/** The name in app.json's react-native-android-widget plugin config. */
export const TODAY_WIDGET = 'Today';

const hex = (c: string) => c as HexColor;

/**
 * The Android home screen widget. Only the library's widget components work here (they become native views), not
 * React Native ones. Below about 2×2 cells it drops the workout details.
 */
export function TodayWidget({ data, info }: { data: TodayWidgetData; info: Pick<WidgetInfo, 'width' | 'height'> }) {
  const compact = info.width < 200 || info.height < 110;
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: data.url }}
      accessibilityLabel={`${data.streakDays} day streak. ${data.eyebrow}: ${data.title}. ${data.detail}. ${data.streakNote}.`}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: hex(colors.surface),
        borderRadius: 24,
        padding: 16,
      }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget
          text={data.eyebrow.toUpperCase()}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.08, color: hex(colors.text3) }}
        />
        <FlexWidget
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: hex(colors.surface3), borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}
        >
          <TextWidget text="🔥" style={{ fontSize: 13 }} />
          <TextWidget text={` ${data.streakDays}`} style={{ fontSize: 15, fontWeight: '800', color: hex(data.streakDays ? colors.gold : colors.text3) }} />
        </FlexWidget>
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'column' }}>
        <TextWidget text={data.title} maxLines={1} truncate="END" style={{ fontSize: compact ? 18 : 22, fontWeight: '800', color: hex(colors.text) }} />
        {!compact && <TextWidget text={data.detail} maxLines={1} truncate="END" style={{ fontSize: 13, color: hex(colors.text2) }} />}
      </FlexWidget>
      <TextWidget
        text={data.streakNote}
        maxLines={compact ? 2 : 1}
        truncate="END"
        style={{ fontSize: 12, fontWeight: '600', color: hex(data.urgent ? colors.gold : colors.text3) }}
      />
    </FlexWidget>
  );
}
