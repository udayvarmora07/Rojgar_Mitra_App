import {
  applyActionCopy,
  applyDestination,
  closedNoticeCopy,
  destinationKind,
  isAggregatorUrl,
} from '../lib/officialLink';

describe('apply destination', () => {
  it('prefers the official portal over the summary article', () => {
    expect(
      applyDestination({
        official_link: 'https://ojas.gujarat.gov.in/AdvtDetails.aspx?sid=1',
        source_link: 'https://www.freejobalert.com/articles/clerk-1',
      })
    ).toEqual({
      url: 'https://ojas.gujarat.gov.in/AdvtDetails.aspx?sid=1',
      official: true,
      kind: 'officialSite',
    });
  });

  it('treats an official source link as official without a stored official link', () => {
    expect(
      applyDestination({
        official_link: null,
        source_link: 'https://gpsc.gujarat.gov.in/RecruitmentOpen',
      })
    ).toEqual({
      url: 'https://gpsc.gujarat.gov.in/RecruitmentOpen',
      official: true,
      kind: 'officialSite',
    });
  });

  it('never labels a FreeJobAlert article official', () => {
    expect(
      applyDestination({
        official_link: null,
        source_link: 'https://www.freejobalert.com/articles/clerk-1',
      })
    ).toEqual({
      url: 'https://www.freejobalert.com/articles/clerk-1',
      official: false,
      kind: 'summary',
    });
    expect(isAggregatorUrl('https://img2.freejobalert.com/news/x.pdf')).toBe(true);
  });

  it('ignores an official link that points back at an aggregator', () => {
    expect(
      applyDestination({
        official_link: 'https://www.freejobalert.com/articles/clerk-1',
        source_link: 'https://www.freejobalert.com/articles/clerk-1',
      })
    ).toEqual({
      url: 'https://www.freejobalert.com/articles/clerk-1',
      official: false,
      kind: 'summary',
    });
  });

  it('names a notification PDF and an application form separately', () => {
    expect(
      applyDestination({
        official_link: 'https://baou.edu.in/assets/pdf/Envlope%2002-2026.pdf',
        source_link: 'https://www.freejobalert.com/articles/baou-1',
      })
    ).toEqual({
      url: 'https://baou.edu.in/assets/pdf/Envlope%2002-2026.pdf',
      official: true,
      kind: 'notificationPdf',
    });

    expect(
      applyDestination({
        official_link: 'https://forms.gle/2LL2aEJ4Db4psyL3A',
        source_link: 'https://www.freejobalert.com/articles/niper-1',
      })
    ).toEqual({
      url: 'https://forms.gle/2LL2aEJ4Db4psyL3A',
      official: true,
      kind: 'applicationForm',
    });
  });

  it('classifies a single stored link the same way', () => {
    expect(destinationKind('https://docs.google.com/forms/d/e/x/viewform')).toBe(
      'applicationForm'
    );
    expect(destinationKind('https://docs.google.com/document/d/x/edit')).toBe(
      'notificationPdf'
    );
    expect(destinationKind('https://example.com/notice')).toBe('officialSite');
    expect(destinationKind(null)).toBeNull();
  });

  it('returns null when nothing safe can be opened', () => {
    expect(applyDestination({ official_link: null, source_link: null })).toBeNull();
    expect(
      applyDestination({ official_link: 'javascript:alert(1)', source_link: 'not a url' })
    ).toBeNull();
  });

  it('uses an apply label for open notices and an open label for closed ones', () => {
    expect(applyActionCopy('officialSite').label).toBe('applyOfficial');
    expect(applyActionCopy('notificationPdf').label).toBe('openOfficialNotification');
    expect(applyActionCopy('applicationForm').label).toBe('openApplicationForm');
    expect(applyActionCopy('summary').label).toBe('readFullNotice');

    expect(closedNoticeCopy('officialSite').label).toBe('openNotice');
    expect(closedNoticeCopy('notificationPdf').label).toBe('openOfficialNotification');
    expect(closedNoticeCopy('summary').label).toBe('readFullNotice');
  });
});
