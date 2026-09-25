import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { withAlpha } from './backdrop';
import { Button } from './button';
import { Txt } from './text';
import { useTheme } from './theme';
import { layout, radius, space } from './tokens';

export interface DialogAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet';
  testID?: string;
}

/** Bottom sheet dialog in the app's own style (no system alert). */
export function Dialog({
  visible,
  title,
  message,
  actions,
  onDismiss,
  children,
}: {
  visible: boolean;
  title?: string;
  message?: string;
  actions: DialogAction[];
  onDismiss: () => void;
  children?: ReactNode;
}) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        style={[styles.scrim, { backgroundColor: withAlpha('#0B0A0C', 0.55) }]}
        onPress={onDismiss}
      />
      <View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          {
            backgroundColor: c.bgRaised,
            borderColor: c.line,
            paddingBottom: insets.bottom + space.lg,
          },
        ]}
      >
        <View style={[styles.grip, { backgroundColor: c.line }]} />
        {title && (
          <Txt v="heading" accessibilityRole="header">
            {title}
          </Txt>
        )}
        {message && (
          <Txt v="body" tone="textMuted">
            {message}
          </Txt>
        )}
        {children}
        <View style={styles.actions}>
          {actions.map((a) => (
            <Button
              key={a.label}
              label={a.label}
              onPress={a.onPress}
              variant={a.variant ?? 'secondary'}
              testID={a.testID}
            />
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: layout.gutter,
    paddingTop: space.sm,
    gap: space.md,
    alignItems: 'stretch',
  },
  grip: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: space.xs },
  actions: { gap: space.sm, marginTop: space.xs },
});
