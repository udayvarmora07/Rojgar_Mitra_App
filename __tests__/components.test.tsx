import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../lib/i18n';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { ChecklistItem } from '../components/ui/ChecklistItem';
import { YesNoQuestion } from '../components/ui/YesNoQuestion';
import { QuestionCard } from '../components/practice/QuestionCard';
import { JobCard } from '../components/jobs/JobCard';
import { DeadlineBadge } from '../components/jobs/DeadlineBadge';
import { FilterChips } from '../components/jobs/FilterChips';
import { LanguageOptions } from '../components/ui/LanguagePicker';
import { formatClock, useCountdown } from '../hooks/useCountdown';
import { useJobs } from '../hooks/useJobs';
import { STORAGE_KEYS } from '../lib/storage';
import type { Question } from '../constants/questionBank';
import type { Job } from '../lib/supabase';

beforeEach(async () => {
  await AsyncStorage.clear();
  await i18n.changeLanguage('en');
});

const question: Question = {
  question: 'Capital of Gujarat?',
  options: { A: 'Ahmedabad', B: 'Gandhinagar', C: 'Surat', D: 'Vadodara' },
  correct: 'B',
  explanation: 'Gandhinagar is the capital.',
};

describe('Button', () => {
  it('is an accessible button that fires onPress, and not when disabled', () => {
    const onPress = jest.fn();
    const { rerender } = render(<Button label="Apply" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Apply' }));
    expect(onPress).toHaveBeenCalledTimes(1);

    rerender(<Button label="Apply" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole('button', { name: 'Apply' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('ProgressBar', () => {
  it('exposes a clamped percentage to screen readers', () => {
    render(<ProgressBar ratio={1.7} label="Done" />);
    expect(screen.getByRole('progressbar').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 100, text: '100%' });
  });
});

describe('ChecklistItem', () => {
  it('shows Ready / Not Ready and toggles with a single tap', () => {
    const onToggle = jest.fn();
    const { rerender } = render(<ChecklistItem title="Aadhaar Card" ready={false} onToggle={onToggle} />);
    expect(screen.getByText('Not Ready')).toBeTruthy();
    fireEvent.press(screen.getByRole('checkbox', { name: 'Aadhaar Card' }));
    expect(onToggle).toHaveBeenCalled();

    rerender(<ChecklistItem title="Aadhaar Card" ready onToggle={onToggle} />);
    expect(screen.getByText('Ready')).toBeTruthy();
    expect(screen.getByRole('checkbox').props.accessibilityState).toEqual({ checked: true });
  });
});

describe('YesNoQuestion', () => {
  it('reports the chosen answer', () => {
    const onChange = jest.fn();
    render(<YesNoQuestion question="Age OK?" value={undefined} onChange={onChange} />);
    fireEvent.press(screen.getByRole('radio', { name: 'Age OK? No' }));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe('QuestionCard', () => {
  it('lets the user pick an option', () => {
    const onSelect = jest.fn();
    render(<QuestionCard question={question} index={0} total={10} onSelect={onSelect} />);
    expect(screen.getByText('Question 1 of 10')).toBeTruthy();
    fireEvent.press(screen.getByRole('radio', { name: 'C. Surat' }));
    expect(onSelect).toHaveBeenCalledWith('C');
  });

  it('reveals the correct answer and explanation after submit', () => {
    render(<QuestionCard question={question} index={0} total={1} selected="A" reveal />);
    expect(screen.getByText('Correct answer: B. Gandhinagar')).toBeTruthy();
    expect(screen.getByText('Explanation: Gandhinagar is the capital.')).toBeTruthy();
  });

  it('flags unanswered questions in review', () => {
    render(<QuestionCard question={question} index={0} total={1} reveal />);
    expect(screen.getByText('Not answered')).toBeTruthy();
  });

  it('states the verdict in words, not colour alone, in the review pass', () => {
    // The correct box used to be marked only by a green tint and a tick, which a screen
    // reader never announced and a colour-blind reader could not separate from the wrong box.
    render(<QuestionCard question={question} index={0} total={1} selected="A" reveal />);
    expect(screen.getByText('Correct')).toBeTruthy();
    expect(screen.getByText('Your answer')).toBeTruthy();
    // Both verdicts must also reach the accessible name of the option itself.
    expect(screen.getByRole('radio', { name: /B\. Gandhinagar\. Correct/ })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /A\. Ahmedabad\. Your answer/ })).toBeTruthy();
  });

  it('does not mark anything before submission', () => {
    render(<QuestionCard question={question} index={0} total={1} selected="A" onSelect={jest.fn()} />);
    expect(screen.queryByText('Correct')).toBeNull();
    expect(screen.queryByText('Your answer')).toBeNull();
  });
});

describe('JobCard', () => {
  const job: Job = {
    id: '1',
    title: 'Junior Clerk',
    department: 'Revenue',
    post_date: '2026-10-01',
    deadline: '2099-01-01',
    vacancies: null,
    qualification: null,
    advertisement_no: null,
    education_level: null,
    location: null,
    salary: '₹19,950',
    source_link: 'https://ojas.gujarat.gov.in/',
    official_link: null,
    created_at: '',
    updated_at: null,
  };

  it('shows title, department and salary and opens on tap', () => {
    const onPress = jest.fn();
    render(<JobCard job={job} onPress={onPress} />);
    // Pay sits on its own labelled line rather than the shared meta line, which truncated
    // it to "Rs. 56,..." on a real phone. Both the label and the value must be present.
    expect(screen.getByText('Salary:')).toBeTruthy();
    expect(screen.getByText('₹19,950')).toBeTruthy();
    // The accessible name carries the deadline as well as the post and department.
    fireEvent.press(screen.getByRole('button', { name: /Junior Clerk, Revenue/ }));
    expect(onPress).toHaveBeenCalled();
  });

  it('offers Apply as a separate control on the list, not a nested button', () => {
    const onPress = jest.fn();
    const onApply = jest.fn();
    render(<JobCard job={job} onPress={onPress} onApply={onApply} />);

    fireEvent.press(
      screen.getByRole('link', { name: 'Read the Full Notice: Junior Clerk' })
    );
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: /Junior Clerk, Revenue/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('never offers Apply on a closed notice', () => {
    render(
      <JobCard
        job={{ ...job, deadline: '2026-01-01' }}
        onPress={jest.fn()}
        onApply={jest.fn()}
      />
    );
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('marks an applied notice with a written stamp, not colour alone', () => {
    render(<JobCard job={job} onPress={jest.fn()} applied />);
    expect(screen.getByText('Applied')).toBeTruthy();
    // The stamp also has to reach the accessible name, because the pressable's label
    // overrides its children for screen readers.
    expect(
      screen.getByRole('button', { name: /Junior Clerk, Revenue.*Applied/ })
    ).toBeTruthy();
  });

  it('shows no applied stamp on an untouched notice', () => {
    render(<JobCard job={job} onPress={jest.fn()} />);
    expect(screen.queryByText('Applied')).toBeNull();
  });
});

describe('FilterChips', () => {
  type Deadline = 'open' | 'closingSoon' | null;
  const chips: { value: Deadline; label: string }[] = [
    { value: null, label: 'All' },
    { value: 'open', label: 'Still Open' },
    { value: 'closingSoon', label: 'Closing Soon' },
  ];

  it('selects a filter with one tap and exposes the selected state', () => {
    const onSelect = jest.fn();
    render(
      <FilterChips chips={chips} selected="open" onSelect={onSelect} accessibilityLabel="Deadline" />
    );
    expect(screen.getByRole('button', { name: 'Still Open' }).props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByRole('button', { name: 'All' }).props.accessibilityState).toEqual({
      selected: false,
    });
    fireEvent.press(screen.getByRole('button', { name: 'All' }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('is a segmented control, not a row of pills', () => {
    render(<FilterChips chips={chips} selected={null} onSelect={() => {}} accessibilityLabel="Deadline" />);
    for (const chip of chips) {
      const segment = screen.getByRole('button', { name: chip.label });
      // 8px inner radius inside the 12px track, so the radii stay concentric.
      expect(segment.props.className).toContain('rounded-[8px]');
      expect(segment.props.className).not.toContain('rounded-full'); // unslop-ignore: asserts the pill class is absent
    }
  });
});

describe('DeadlineBadge', () => {
  it('stamps the status as a rectangle and carries the countdown as text', () => {
    const now = new Date(2026, 10, 18);
    render(<DeadlineBadge deadline="2026-11-21" now={now} />);
    const countdown = screen.getByText('3 days left');
    expect(screen.getByText(/Last Date: 21 Nov 2026/)).toBeTruthy();

    // The stamp is a 6px rectangle, not a pill; the countdown sits inside it.
    let node = countdown.parent;
    while (node && !String(node.props?.className ?? '').includes('rounded-[6px]')) node = node.parent;
    expect(node).toBeTruthy(); // unslop-ignore: the status stamp is intentional
    expect(String(node?.props.className)).not.toContain('rounded-full'); // unslop-ignore: asserts the pill class is absent
  });

  it('marks an expired advertisement as Closed in words, not colour alone', () => {
    const now = new Date(2026, 10, 18);
    render(<DeadlineBadge deadline="2026-11-10" now={now} />);
    expect(screen.getByText('Closed')).toBeTruthy();
  });
});

describe('LanguageOptions', () => {
  it('switches the whole UI language and remembers it', async () => {
    render(<LanguageOptions />);
    await act(async () => {
      fireEvent.press(screen.getByRole('radio', { name: 'ગુજરાતી (Gujarati)' }));
    });
    expect(i18n.language).toBe('gu');
    expect(await AsyncStorage.getItem(STORAGE_KEYS.language)).toBe('gu');
  });
});

describe('useCountdown', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('counts down and fires onExpire exactly once', () => {
    const onExpire = jest.fn();
    const { result } = renderHook(() => useCountdown(3, true, onExpire));
    expect(result.current).toBe(3);
    act(() => jest.advanceTimersByTime(3000));
    expect(result.current).toBe(0);
    act(() => jest.advanceTimersByTime(5000));
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('formats mm:ss', () => {
    expect(formatClock(900)).toBe('15:00');
    expect(formatClock(65)).toBe('01:05');
  });
});

describe('useJobs', () => {
  const sample = [{ id: 'a', title: 'A', department: 'D', post_date: '', deadline: '2099-01-01' }] as Job[];

  it('fetches fresh jobs and caches them for offline use', async () => {
    const { result } = renderHook(() => useJobs(() => Promise.resolve(sample)));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.jobs).toEqual(sample);
    expect(result.current.offline).toBe(false);
    expect(JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.jobsCache)) ?? '{}').jobs).toEqual(sample);
  });

  it('shows cached jobs and an offline flag when the network fails', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.jobsCache, JSON.stringify({ jobs: sample, savedAt: 'x' }));
    const { result } = renderHook(() => useJobs(() => Promise.reject(new Error('offline'))));
    await waitFor(() => expect(result.current.offline).toBe(true));
    expect(result.current.jobs).toEqual(sample);
  });
});
