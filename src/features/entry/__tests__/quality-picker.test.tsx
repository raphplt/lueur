import '@/i18n';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { QualityPicker } from '../quality-picker';

describe('QualityPicker', () => {
  it('offers five drawn levels as radio buttons', async () => {
    await render(<QualityPicker value={null} onChange={() => {}} />);
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByLabelText('Très difficile')).toBeTruthy();
    expect(screen.getByLabelText('Reposante')).toBeTruthy();
  });

  it('reports the chosen level and shows its label', async () => {
    const onChange = jest.fn();
    const { rerender } = await render(<QualityPicker value={null} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('quality-4'));
    expect(onChange).toHaveBeenCalledWith(4);
    await rerender(<QualityPicker value={4} onChange={onChange} />);
    expect(screen.getByTestId('quality-4').props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(screen.getAllByText('Plutôt bonne').length).toBeGreaterThan(0);
  });
});
