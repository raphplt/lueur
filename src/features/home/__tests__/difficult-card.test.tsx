import '@/i18n';

import { fireEvent, render, screen } from '@testing-library/react-native';

import { DifficultCard } from '../difficult-card';

const freq = (difficult: number, logged: number, prevDifficult: number, prevLogged: number) => ({
  current: { from: '2026-08-27', to: '2026-09-25', days: 30, logged, difficult },
  previous: {
    from: '2026-07-28',
    to: '2026-08-26',
    days: 30,
    logged: prevLogged,
    difficult: prevDifficult,
  },
});

describe('DifficultCard', () => {
  it('answers the central question with the previous month for comparison', async () => {
    await render(<DifficultCard freq={freq(4, 20, 7, 25)} days={Array(30).fill('logged')} />);
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText(/4 nuits difficiles sur les 30 derniers jours/)).toBeTruthy();
    expect(screen.getByText('Le mois précédent : 7.')).toBeTruthy();
  });

  it('says "none" calmly and handles an empty previous month', async () => {
    await render(<DifficultCard freq={freq(0, 12, 0, 0)} days={Array(30).fill('logged')} />);
    expect(screen.getByText(/Aucune nuit difficile/)).toBeTruthy();
    expect(screen.getByText('Pas de nuit notée le mois précédent.')).toBeTruthy();
  });

  it('shows an encouraging empty state and explains how nights are counted', async () => {
    await render(<DifficultCard freq={freq(0, 0, 0, 0)} days={Array(30).fill('missing')} />);
    expect(screen.getByText(/Les nuits notées apparaîtront ici/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Comment c’est compté'));
    expect(screen.getByText(/plus de 30 minutes pour vous endormir/)).toBeTruthy();
  });
});
