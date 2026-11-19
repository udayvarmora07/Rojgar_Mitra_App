import { supabase, getJobById } from '../lib/supabase';

/**
 * `getJobById` has to distinguish "this notice does not exist" from "the request failed":
 * the detail screen keeps a cached copy on failure and shows a not-found state only for the
 * first. These tests pin that contract, because swallowing the error was a real bug.
 */
function responseFor(result: unknown) {
  return {
    select: () => ({
      eq: () => ({
        single: async () => result,
      }),
    }),
  } as never;
}

describe('getJobById', () => {
  const from = jest.spyOn(supabase, 'from');

  afterEach(() => {
    from.mockReset();
  });

  it('returns null only when PostgREST reports no rows', async () => {
    from.mockReturnValue(
      responseFor({ data: null, error: { code: 'PGRST116', message: 'no rows' } })
    );
    await expect(getJobById('missing')).resolves.toBeNull();
  });

  it('throws a real failure so the offline cache can take over', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    from.mockReturnValue(
      responseFor({ data: null, error: { code: 'FETCH_ERROR', message: 'offline' } })
    );
    await expect(getJobById('job-1')).rejects.toMatchObject({ code: 'FETCH_ERROR' });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('normalizes scraped text on a successful read', async () => {
    from.mockReturnValue(
      responseFor({
        data: {
          id: 'job-1',
          title: 'Employer&#39;s Clerk',
          department: 'Revenue &amp; Registration',
          post_date: '2026-01-01',
          deadline: '2099-01-01',
          salary: null,
          source_link: null,
          official_link: null,
          vacancies: null,
          qualification: null,
          advertisement_no: null,
          education_level: null,
          location: null,
          created_at: '',
          updated_at: null,
        },
        error: null,
      })
    );

    await expect(getJobById('job-1')).resolves.toMatchObject({
      title: "Employer's Clerk",
      department: 'Revenue & Registration',
    });
  });
});
