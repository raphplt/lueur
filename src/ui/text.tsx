import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from './theme';
import { type as typeScale, type ColorTokens, type TypeVariant } from './tokens';

type Tone = 'text' | 'textMuted' | 'textFaint' | 'lightText' | 'calmText' | 'lightOn';

export interface TxtProps extends TextProps {
  v?: TypeVariant;
  tone?: Tone;
  align?: TextStyle['textAlign'];
}

/** Large numerals must not break layouts: cap their scaling (DESIGN §4). */
const CAPPED: Partial<Record<TypeVariant, number>> = { display: 1.6, numeral: 1.6, title: 1.8 };

export function Txt({ v = 'body', tone = 'text', align, style, ...rest }: TxtProps) {
  const { c } = useTheme();
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={CAPPED[v]}
      {...rest}
      style={[
        typeScale[v] as TextStyle,
        { color: c[tone as keyof ColorTokens] as string, textAlign: align },
        style,
      ]}
    />
  );
}
