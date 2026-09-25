import '@/i18n';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { Segmented, Toggle } from '../controls';

describe('Segmented', () => {
  it('exposes a radio group and changes value', async () => {
    const onChange = jest.fn();
    await render(
      <Segmented
        label="Ambiance"
        value="auto"
        onChange={onChange}
        options={[
          { value: 'auto', label: 'Auto' },
          { value: 'ink', label: 'Nuit' },
        ]}
      />,
    );
    expect(screen.getByLabelText('Ambiance').props.accessibilityRole).toBe('radiogroup');
    expect(screen.getByRole('radio', { name: 'Auto' }).props.accessibilityState).toMatchObject({
      selected: true,
    });
    await fireEvent.press(screen.getByRole('radio', { name: 'Nuit' }));
    expect(onChange).toHaveBeenCalledWith('ink');
  });
});

describe('Toggle', () => {
  it('is an accessible switch', async () => {
    const onChange = jest.fn();
    await render(<Toggle label="Rappel du matin" value={false} onChange={onChange} />);
    const sw = screen.getByRole('switch', { name: 'Rappel du matin' });
    expect(sw.props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
