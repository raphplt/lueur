import Constants from 'expo-constants';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LogoMark } from '@/brand/logo';
import { Header } from '@/ui/header';
import { Screen } from '@/ui/screen';
import { Surface } from '@/ui/surface';
import { Txt } from '@/ui/text';
import { space } from '@/ui/tokens';

function Block({ title, children }: { title: string; children: string }) {
  return (
    <Surface style={styles.block}>
      <Txt v="heading" accessibilityRole="header">
        {title}
      </Txt>
      <Txt v="body" tone="textMuted">
        {children}
      </Txt>
    </Surface>
  );
}

export default function About() {
  const { t } = useTranslation();
  return (
    <Screen testID="about">
      <Header title={t('about.title')} />
      <View style={styles.brand}>
        <LogoMark size={96} animated />
      </View>
      <Block
        title={t('about.medicalTitle')}
      >{`${t('about.medical')}\n\n${t('about.inspiration')}`}</Block>
      <Block title={t('about.privacyTitle')}>{t('about.privacy')}</Block>
      <Block
        title={t('about.openSourceTitle')}
      >{`${t('about.openSource')}\n\n${t('about.fonts')}`}</Block>
      <Txt v="caption" tone="textFaint" align="center" style={styles.version}>
        {t('about.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', marginBottom: space.md },
  block: { marginTop: space.md, gap: space.xs },
  version: { marginTop: space.xxl },
});
