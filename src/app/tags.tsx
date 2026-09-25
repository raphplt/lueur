import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Tag } from '@/domain/types';
import { tagLabel } from '@/features/insights/describe';
import { useData } from '@/store/data';
import { Button } from '@/ui/button';
import { Divider, Row, SectionTitle, Toggle } from '@/ui/controls';
import { Dialog } from '@/ui/dialog';
import { Header } from '@/ui/header';
import { Screen } from '@/ui/screen';
import { Surface } from '@/ui/surface';
import { Txt } from '@/ui/text';
import { useTheme } from '@/ui/theme';
import { layout, radius, space, type } from '@/ui/tokens';

export default function Tags() {
  const { t } = useTranslation();
  const { c } = useTheme();
  const tags = useData((s) => s.tags);
  const addTag = useData((s) => s.addTag);
  const updateTag = useData((s) => s.updateTag);
  const deleteTag = useData((s) => s.deleteTag);
  const [label, setLabel] = useState('');
  const [editing, setEditing] = useState<{ tag: Tag; label: string } | null>(null);
  const [deleting, setDeleting] = useState<Tag | null>(null);

  const builtIn = tags.filter((x) => x.key !== null);
  const custom = tags.filter((x) => x.key === null);
  const inputStyle = [
    styles.input,
    { color: c.text, backgroundColor: c.bgSunken, borderColor: c.line },
  ];

  const add = () => {
    const l = label.trim();
    if (!l) return;
    addTag(l);
    setLabel('');
  };

  return (
    <Screen testID="tags">
      <Header title={t('tagsScreen.title')} subtitle={t('tagsScreen.intro')} />

      <SectionTitle>{t('tagsScreen.custom')}</SectionTitle>
      <Surface padded={false}>
        {custom.length === 0 && (
          <Txt v="caption" tone="textMuted" style={styles.empty}>
            {t('tagsScreen.emptyCustom')}
          </Txt>
        )}
        {custom.map((tag) => (
          <View key={tag.id}>
            <Row
              label={tag.label ?? ''}
              onPress={() => setEditing({ tag, label: tag.label ?? '' })}
              chevron={false}
              right={
                <Toggle
                  label={tag.label ?? ''}
                  value={tag.enabled}
                  onChange={(enabled) => updateTag(tag.id, { enabled })}
                />
              }
            />
            <Divider />
          </View>
        ))}
        <View style={styles.addRow}>
          <TextInput
            testID="tag-input"
            value={label}
            onChangeText={setLabel}
            placeholder={t('tagsScreen.addPlaceholder')}
            placeholderTextColor={c.textFaint}
            accessibilityLabel={t('tagsScreen.addPlaceholder')}
            onSubmitEditing={add}
            returnKeyType="done"
            maxLength={40}
            style={[inputStyle, styles.flex]}
          />
          <Button
            testID="tag-add"
            label={t('tagsScreen.add')}
            onPress={add}
            disabled={!label.trim()}
          />
        </View>
      </Surface>

      <SectionTitle>{t('tagsScreen.builtIn')}</SectionTitle>
      <Surface padded={false}>
        {builtIn.map((tag, i) => (
          <View key={tag.id}>
            {i > 0 && <Divider />}
            <Row
              testID={`builtin-${tag.key}`}
              label={tagLabel(tag, t)}
              chevron={false}
              right={
                <Toggle
                  testID={`toggle-tag-${tag.key}`}
                  label={tagLabel(tag, t)}
                  value={tag.enabled}
                  onChange={(enabled) => updateTag(tag.id, { enabled })}
                />
              }
            />
          </View>
        ))}
      </Surface>

      <Dialog
        visible={editing !== null}
        title={t('tagsScreen.rename')}
        onDismiss={() => setEditing(null)}
        actions={[
          {
            label: t('common.save'),
            variant: 'primary',
            onPress: () => {
              if (editing && editing.label.trim())
                updateTag(editing.tag.id, { label: editing.label.trim() });
              setEditing(null);
            },
          },
          {
            label: t('common.delete'),
            variant: 'quiet',
            onPress: () => {
              setDeleting(editing?.tag ?? null);
              setEditing(null);
            },
          },
        ]}
      >
        {editing && (
          <TextInput
            value={editing.label}
            onChangeText={(l) => setEditing({ ...editing, label: l })}
            accessibilityLabel={t('tagsScreen.rename')}
            maxLength={40}
            autoFocus
            style={inputStyle}
          />
        )}
      </Dialog>

      <Dialog
        visible={deleting !== null}
        message={
          deleting ? t('tagsScreen.deleteConfirm', { label: deleting.label ?? '' }) : undefined
        }
        onDismiss={() => setDeleting(null)}
        actions={[
          {
            label: t('common.delete'),
            variant: 'primary',
            onPress: () => {
              if (deleting) deleteTag(deleting.id);
              setDeleting(null);
            },
          },
          { label: t('common.cancel'), onPress: () => setDeleting(null) },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { padding: space.lg },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md },
  flex: { flex: 1 },
  input: {
    ...type.body,
    minHeight: layout.touch,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: space.md,
  },
});
