import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from './theme';
import { radius, space } from './tokens';

/** Tonal surface: a slightly different tone and a hairline, never a drop shadow. */
export function Surface({
  children,
  style,
  padded = true,
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  testID?: string;
}) {
  const { c } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        styles.surface,
        { backgroundColor: c.bgRaised, borderColor: c.line },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  padded: { padding: space.lg },
});
