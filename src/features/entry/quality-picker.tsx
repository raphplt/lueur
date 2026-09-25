import { BlurMask, Canvas, Circle } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { QUALITIES, type Quality } from '@/domain/types';
import { Txt } from '@/ui/text';
import { useTheme } from '@/ui/theme';
import { layout, space } from '@/ui/tokens';

const SIZE = 52;

/**
 * Five drawn glows of growing size and intensity (DESIGN §8): no stars, no faces.
 */
function Glow({ q, selected }: { q: Quality; selected: boolean }) {
  const { c } = useTheme();
  const k = (q - 1) / 4;
  const core = 3 + k * 6;
  const halo = 6 + k * 16;
  const dim = selected ? 1 : 0.55;
  return (
    <Canvas style={{ width: SIZE, height: SIZE }}>
      {q > 1 && (
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={halo}
          color={c.glow}
          opacity={(0.08 + k * 0.4) * dim}
        >
          <BlurMask blur={4 + k * 8} style="normal" />
        </Circle>
      )}
      <Circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={core}
        color={q === 1 ? c.textFaint : c.light}
        opacity={(0.5 + k * 0.5) * dim}
      />
      {selected && (
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={SIZE / 2 - 2}
          color={c.light}
          style="stroke"
          strokeWidth={1.2}
          opacity={0.7}
        />
      )}
    </Canvas>
  );
}

export function QualityPicker({
  value,
  onChange,
}: {
  value: Quality | null;
  onChange: (q: Quality) => void;
}) {
  const { t } = useTranslation();
  return (
    <View>
      <View
        style={styles.row}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('quality.title')}
      >
        {QUALITIES.map((q) => {
          const label = t(`quality.q${q}`);
          const selected = value === q;
          return (
            <Pressable
              key={q}
              testID={`quality-${q}`}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
              onPress={() => {
                void Haptics.selectionAsync();
                onChange(q);
              }}
              style={styles.item}
            >
              <Glow q={q} selected={selected} />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.labels}>
        <Txt v="caption" tone="textMuted">
          {t('quality.q1')}
        </Txt>
        <Txt
          v="bodyStrong"
          tone={value ? 'lightText' : 'textFaint'}
          align="center"
          style={styles.current}
        >
          {value ? t(`quality.q${value}`) : ' '}
        </Txt>
        <Txt v="caption" tone="textMuted" align="right">
          {t('quality.q5')}
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  item: {
    minWidth: layout.touch,
    minHeight: layout.touchPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labels: { flexDirection: 'row', alignItems: 'center', marginTop: space.xxs },
  current: { flex: 1 },
});
