import { fireEvent, render, screen } from '@testing-library/react-native';

import { CourseColorList } from '../components/CourseColorList';

const mockUpdateCanvasCourse = jest.fn();

jest.mock('../../../repositories/canvasRepository', () => ({
  fetchCanvasCourses: async () => [
    { id: 'biol', name: 'BIOL 201: Cell Biology', code: 'BIOL 201', color: 'mint', syncEnabled: true },
    { id: 'engl', name: 'ENGL 220: Writing', code: 'ENGL 220', color: 'apricot', syncEnabled: false },
  ],
  updateCanvasCourse: (...args: unknown[]) => mockUpdateCanvasCourse(...args),
}));

describe('CourseColorList', () => {
  beforeEach(() => {
    mockUpdateCanvasCourse.mockReset().mockResolvedValue(undefined);
  });

  it('lists each class with its color and whether it syncs', async () => {
    await render(<CourseColorList />);

    expect(await screen.findByText('BIOL 201')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mint. Change the color for BIOL 201: Cell Biology' })).toBeOnTheScreen();
    expect(screen.getByRole('switch', { name: 'Sync ENGL 220: Writing' })).not.toBeChecked();
  });

  it('saves a new color picked from the palette', async () => {
    await render(<CourseColorList />);

    await fireEvent.press(
      await screen.findByRole('button', { name: 'Mint. Change the color for BIOL 201: Cell Biology' }),
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Coral' }));

    expect(mockUpdateCanvasCourse).toHaveBeenCalledWith('biol', { color: 'coral' });
    expect(screen.getByRole('button', { name: 'Coral. Change the color for BIOL 201: Cell Biology' })).toBeOnTheScreen();
  });

  it('turns syncing a class off', async () => {
    await render(<CourseColorList />);

    await fireEvent(await screen.findByRole('switch', { name: 'Sync BIOL 201: Cell Biology' }), 'valueChange', false);

    expect(mockUpdateCanvasCourse).toHaveBeenCalledWith('biol', { syncEnabled: false });
  });
});
