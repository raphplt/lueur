import '@/i18n';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { NightsCard } from '../nights-card';

const w = (logged: number, restful: number, difficult: number) => ({
  from: '2026-08-27',
  to: '2026-09-25',
  days: 30,
  logged,
  restful,
  difficult,
  mixed: logged - restful - difficult,
});

describe('NightsCard', () => {
  it('shows restful, mixed and difficult nights, restful first', async () => {
    await render(
      <NightsCard
        freq={{ current: w(20, 12, 3), previous: w(20, 6, 6) }}
        days={Array(30).fill('restful')}
      />,
    );
    expect(screen.getByText('Vos 30 dernières nuits')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('reposantes')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('moyennes')).toBeTruthy();
    expect(screen.getByText('difficiles')).toBeTruthy();
    expect(screen.getByTestId('nights-trend').props.children).toBe(
      'Plus de nuits reposantes que le mois précédent (12 contre 6).',
    );
  });

  it('uses singular labels and waits before comparing', async () => {
    await render(<NightsCard freq={{ current: w(3, 1, 1), previous: w(0, 0, 0) }} days={[]} />);
    expect(screen.getByText('reposante')).toBeTruthy();
    expect(screen.getByText('difficile')).toBeTruthy();
    expect(screen.getByText(/La comparaison avec le mois précédent viendra/)).toBeTruthy();
  });

  it('has a calm empty state and explains the three tones', async () => {
    await render(<NightsCard freq={{ current: w(0, 0, 0), previous: w(0, 0, 0) }} days={[]} />);
    expect(screen.getByText(/Vos nuits apparaîtront ici/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Comment c’est compté'));
    expect(screen.getByText(/Reposante : ressentie comme plutôt bonne/)).toBeTruthy();
  });
});
