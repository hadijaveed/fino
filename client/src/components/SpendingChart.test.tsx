import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonthlyBarChart } from './SpendingChart';

// Recharts uses ResizeObserver internally
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

describe('MonthlyBarChart', () => {
  it('shows empty message when no data', () => {
    render(<MonthlyBarChart data={[]} />);
    expect(screen.getByText('No monthly data')).toBeInTheDocument();
  });

  it('renders without crashing with data', () => {
    const data = [
      { month: '2024-01', spending: 3000, income: 5000, net: 2000 },
      { month: '2024-02', spending: 3500, income: 5000, net: 1500 },
    ];
    expect(() => render(<MonthlyBarChart data={data} />)).not.toThrow();
  });
});
