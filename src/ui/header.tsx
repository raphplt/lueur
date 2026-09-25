import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon } from './icons';
import { Txt } from './text';
import { useTheme } from './theme';
import { layout, space } from './tokens';

/** Title block for stacked screens: back (or close), title, optional subtitle. */
export function Header({
  title,
  subtitle,
  close = false,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  close?: boolean;
  right?: ReactNode;
  onBack?: () => void;
}) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <Pressable
          testID="header-back"
          accessibilityRole="button"
          accessibilityLabel={close ? t('common.close') : t('common.back')}
          onPress={back}
          hitSlop={8}
          style={styles.back}
        >
          <Icon name={close ? 'close' : 'chevronLeft'} color={c.textMuted} />
        </Pressable>
        <View style={styles.flex} />
        {right}
      </View>
      <Txt v="title" accessibilityRole="header">
        {title}
      </Txt>
      {subtitle && (
        <Txt v="body" tone="textMuted">
          {subtitle}
        </Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xxs, marginBottom: space.xl },
  bar: { flexDirection: 'row', alignItems: 'center', marginBottom: space.xs, marginLeft: -10 },
  back: {
    width: layout.touch,
    height: layout.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
});
