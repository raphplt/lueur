import type { BottomTabBarProps } from 'expo-router/tabs';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from './icons';
import { Txt } from './text';
import { useTheme } from './theme';
import { layout, space } from './tokens';

const ICONS: Record<string, IconName> = {
  index: 'home',
  nights: 'nights',
  patterns: 'patterns',
  settings: 'settings',
};

/** Custom tab bar (DESIGN §12): drawn icons, a point of light under the active tab. */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: c.bg,
          borderTopColor: c.line,
          paddingBottom: Math.max(insets.bottom, space.xs),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key]!;
        const label = options.title ?? route.name;
        return (
          <Pressable
            key={route.key}
            testID={`tab-${route.name}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                void Haptics.selectionAsync();
                navigation.navigate(route.name, route.params);
              }
            }}
            style={styles.tab}
          >
            <Icon name={ICONS[route.name] ?? 'home'} color={focused ? c.text : c.textFaint} />
            <Txt
              v="label"
              tone={focused ? 'text' : 'textFaint'}
              style={styles.label}
              numberOfLines={1}
            >
              {label}
            </Txt>
            <View style={[styles.dot, { backgroundColor: focused ? c.light : 'transparent' }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingTop: space.xs,
  },
  tab: {
    flex: 1,
    minHeight: layout.touchPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: { fontSize: 11, letterSpacing: 0.8 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
