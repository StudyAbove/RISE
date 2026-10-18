import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { DatePickerPanel } from '../components/addEvent/DatePickerPanel';
import { DropdownField } from '../components/addEvent/DropdownField';
import { EventTypePicker } from '../components/addEvent/EventTypePicker';
import { FormField } from '../components/addEvent/FormField';
import { FormTextInput } from '../components/addEvent/FormTextInput';
import { OptionList } from '../components/addEvent/OptionList';
import { FloatingDropdown } from '../components/addEvent/FloatingDropdown';
import { ReminderField } from '../components/addEvent/ReminderField';

// Pin "today" to Friday, November 13, 2026.
beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 10, 13, 9, 30) });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('FormField and FormTextInput', () => {
  it('passes typed text to the form', async () => {
    const onChangeText = jest.fn();
    await render(
      <FormField label="Title">
        <FormTextInput label="Title" placeholder="Add a title" value="" onChangeText={onChangeText} />
      </FormField>
    );

    await fireEvent.changeText(screen.getByLabelText('Title'), 'Chem Lab');

    expect(onChangeText).toHaveBeenCalledWith('Chem Lab');
  });

  it('shows the error message under the field', async () => {
    await render(
      <FormField label="Title" error="Add a title">
        <FormTextInput label="Title" placeholder="Add a title" value="" onChangeText={jest.fn()} hasError />
      </FormField>
    );

    // getByText ignores the placeholder, so this finds the error message.
    expect(screen.getByText('Add a title')).toBeOnTheScreen();
  });
});

describe('DropdownField', () => {
  it('shows the placeholder until a value is chosen, then the value', async () => {
    const { rerender } = await render(
      <DropdownField label="Date" placeholder="Select a date" open={false} onToggle={jest.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Date, Select a date' })).toBeOnTheScreen();

    await rerender(
      <DropdownField label="Date" placeholder="Select a date" valueText="Friday, Nov 13" open={false} onToggle={jest.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Date, Friday, Nov 13' })).toBeOnTheScreen();
  });

  it('asks the form to open or close it, and shows when it is open', async () => {
    const onToggle = jest.fn();
    const { rerender } = await render(
      <DropdownField label="Date" placeholder="Select a date" open={false} onToggle={onToggle} />
    );
    expect(screen.getByRole('button', { name: /Date/ })).not.toBeExpanded();

    await fireEvent.press(screen.getByRole('button', { name: /Date/ }));
    expect(onToggle).toHaveBeenCalledTimes(1);

    await rerender(<DropdownField label="Date" placeholder="Select a date" open onToggle={onToggle} />);
    expect(screen.getByRole('button', { name: /Date/ })).toBeExpanded();
  });

  it('can be disabled', async () => {
    await render(
      <DropdownField label="Reminder" placeholder="Coming soon" open={false} onToggle={jest.fn()} disabled />
    );

    expect(screen.getByRole('button', { name: /Reminder/ })).toBeDisabled();
  });
});

describe('DatePickerPanel', () => {
  it('opens on this month with today marked when no date is chosen', async () => {
    await render(<DatePickerPanel selectedDate={null} onSelect={jest.fn()} />);

    expect(screen.getByRole('header', { name: 'November 2026' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Today, Friday, November 13' })).toBeOnTheScreen();
    // December 1 shares the last row but stays blank.
    expect(screen.queryByRole('button', { name: /December 1$/ })).not.toBeOnTheScreen();
  });

  it('opens on the chosen date and shows it as selected', async () => {
    await render(<DatePickerPanel selectedDate={new Date(2027, 0, 20)} onSelect={jest.fn()} />);

    expect(screen.getByRole('header', { name: 'January 2027' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Wednesday, January 20' })).toBeSelected();
  });

  it('returns the tapped day', async () => {
    const onSelect = jest.fn();
    await render(<DatePickerPanel selectedDate={null} onSelect={onSelect} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Wednesday, November 18' }));

    expect(onSelect).toHaveBeenCalledWith(new Date(2026, 10, 18));
  });

  it('moves between months, across the year boundary', async () => {
    await render(<DatePickerPanel selectedDate={null} onSelect={jest.fn()} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('header', { name: 'January 2027' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('header', { name: 'December 2026' })).toBeOnTheScreen();
  });
});

describe('OptionList', () => {
  const options = [
    { value: 540, label: '9:00 AM' },
    { value: 570, label: '9:30 AM' },
    { value: 600, label: '10:00 AM' },
  ];

  it('returns the tapped option', async () => {
    const onSelect = jest.fn();
    await render(<OptionList options={options} selectedValue={null} onSelect={onSelect} />);

    await fireEvent.press(screen.getByRole('button', { name: '9:30 AM' }));

    expect(onSelect).toHaveBeenCalledWith(570);
  });

  it('marks the chosen option as selected', async () => {
    await render(<OptionList options={options} selectedValue={600} onSelect={jest.fn()} />);

    expect(screen.getByRole('button', { name: '10:00 AM' })).toBeSelected();
    expect(screen.getByRole('button', { name: '9:00 AM' })).not.toBeSelected();
    expect(screen.getAllByText('Selected')).toHaveLength(1);
  });
});

describe('EventTypePicker', () => {
  it('shows the five Figma types in order, none chosen at first', async () => {
    await render(<EventTypePicker selectedType={null} onChange={jest.fn()} />);

    const types = screen.getAllByRole('radio');
    expect(types.map((type) => type.props.accessibilityLabel)).toEqual([
      'Class',
      'Assignment',
      'Study',
      'Personal',
      'Wellness',
    ]);
    types.forEach((type) => expect(type).not.toBeChecked());
  });

  it('keeps every label on one line, shrinking it instead of wrapping', async () => {
    await render(<EventTypePicker selectedType={null} onChange={jest.fn()} />);

    for (const label of ['Class', 'Assignment', 'Study', 'Personal', 'Wellness']) {
      const text = screen.getByText(label);
      expect(text).toHaveProp('numberOfLines', 1);
      expect(text).toHaveProp('adjustsFontSizeToFit', true);
    }
  });

  it('chooses a type when tapped', async () => {
    const onChange = jest.fn();
    await render(<EventTypePicker selectedType={null} onChange={onChange} />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Study' }));

    expect(onChange).toHaveBeenCalledWith('study');
  });

  it('marks only the chosen type, and clears it when tapped again', async () => {
    const onChange = jest.fn();
    await render(<EventTypePicker selectedType="personal" onChange={onChange} />);

    expect(screen.getByRole('radio', { name: 'Personal' })).toBeChecked();
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1);

    await fireEvent.press(screen.getByRole('radio', { name: 'Personal' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe('ReminderField', () => {
  it('opens its choices when tapped', async () => {
    const onToggle = jest.fn();
    await render(<ReminderField reminderMinutes={null} open={false} onToggle={onToggle} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Reminder, Select a reminder' }));

    expect(onToggle).toHaveBeenCalled();
  });

  it('shows the chosen reminder and explains it is not sent yet', async () => {
    await render(<ReminderField reminderMinutes={180} open={false} onToggle={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Reminder, 3 hours before' })).toBeOnTheScreen();
    expect(screen.getByText('Reminders will be sent once notifications are available.')).toBeOnTheScreen();
  });
});

describe('FloatingDropdown', () => {
  it('shows its choices', async () => {
    await render(
      <FloatingDropdown label="Reminder" anchor={{ left: 19, width: 354, top: 400 }} onClose={jest.fn()}>
        <Text>1 day before</Text>
      </FloatingDropdown>
    );

    expect(screen.getByText('1 day before')).toBeOnTheScreen();
  });

  it('closes when anywhere outside it is tapped', async () => {
    const onClose = jest.fn();
    await render(
      <FloatingDropdown label="Reminder" anchor={{ left: 19, width: 354, bottom: 120 }} onClose={onClose}>
        <Text>1 day before</Text>
      </FloatingDropdown>
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Close Reminder' }));

    expect(onClose).toHaveBeenCalled();
  });
});
