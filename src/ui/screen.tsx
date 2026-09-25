import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Backdrop } from './backdrop';
import { useTheme } from './theme';
import { layout, space } from './tokens';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** Extra bottom padding (e.g. above a floating action). */
  bottomInset?: number;
  /** Rendered above the scroll view, pinned (e.g. a header). */
  header?: ReactNode;
  /** Rendered below the scroll view, pinned (e.g. a save button). */
  footer?: ReactNode;
  glow?: boolean;
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
  topInset?: boolean;
  testID?: string;
}

export function Screen({
  children,
  scroll = true,
  bottomInset = 0,
  header,
  footer,
  glow,
  keyboardShouldPersistTaps = 'handled',
  topInset = true,
  testID,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const content = {
    paddingHorizontal: layout.gutter,
    paddingTop: topInset ? insets.top + space.lg : space.lg,
    paddingBottom: (footer ? space.lg : insets.bottom + space.xxxl) + bottomInset,
  };
  return (
    <View style={styles.root} testID={testID}>
      <Backdrop glow={glow} />
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[content, styles.center]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inner}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.root, content, styles.center]}>
          <View style={[styles.inner, styles.root]}>{children}</View>
        </View>
      )}
      {topInset && (
        <View
          pointerEvents="none"
          style={[styles.statusScrim, { height: insets.top, backgroundColor: c.bg }]}
        />
      )}
      {footer && (
        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + space.md, paddingHorizontal: layout.gutter },
          ]}
        >
          <View style={styles.inner}>{footer}</View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center' },
  inner: { width: '100%', maxWidth: layout.maxWidth },
  footer: { alignItems: 'center', paddingTop: space.sm },
  statusScrim: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0.94 },
});
