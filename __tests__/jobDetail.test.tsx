import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

const mockBack = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: mockBack,
    replace: jest.fn(),
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => mockParams,
  // The ApplyTracker re-reads the applied record on focus; without focus events in a test the
  // effect body never runs, which is the behaviour we want here.
  useFocusEffect: jest.fn(),
}));

const mockGetJobById = jest.fn();
const mockGetJobDetails = jest.fn();
const mockGetDocumentsRequired = jest.fn();
const mockGetJobLearningResources = jest.fn();

jest.mock("../lib/supabase", () => ({
  getJobById: (...args: unknown[]) => mockGetJobById(...args),
  getJobDetails: (...args: unknown[]) => mockGetJobDetails(...args),
  getDocumentsRequired: (...args: unknown[]) =>
    mockGetDocumentsRequired(...args),
  getJobLearningResources: (...args: unknown[]) =>
    mockGetJobLearningResources(...args),
}));

// Sharing is an OS sheet; the contract under test is the message and the feedback state.
const mockShareNoticeText = jest.fn(async (_text: string, _title: string) => "copied");
jest.mock("../lib/share", () => ({
  buildNoticeShareText: jest.fn(() => "Clerk\nLast Date: 1 Jan 2099"),
  shareNoticeText: (text: string, title: string) => mockShareNoticeText(text, title),
}));

import i18n from "../lib/i18n";
import JobDetailScreen from "../app/job/[id]";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { readNotice, writeNotice } from "../lib/jobCache";

const job = {
  id: "job-1",
  title: "Clerk",
  department: "Revenue",
  post_date: "2026-01-01",
  deadline: "2099-01-01",
  salary: null,
  source_link: null,
  official_link: null,
  vacancies: null,
  qualification: "Graduate",
  advertisement_no: null,
  education_level: "Graduate",
  location: "Gandhinagar",
  created_at: "",
  updated_at: null,
};

beforeEach(async () => {
  mockParams = { id: "job-1" };
  mockGetJobById.mockReset().mockResolvedValue(job);
  mockGetJobDetails.mockReset().mockResolvedValue([]);
  mockGetDocumentsRequired.mockReset().mockResolvedValue([]);
  mockGetJobLearningResources.mockReset().mockResolvedValue([]);
  await AsyncStorage.clear();
  await i18n.changeLanguage("en");
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

describe("Job detail screen", () => {
  it('shows a retry notice instead of "no info" when the detail request fails', async () => {
    mockGetJobDetails.mockRejectedValue(new Error("network down"));
    render(<JobDetailScreen />);

    await waitFor(() =>
      expect(screen.getByText("Some details could not refresh")).toBeTruthy(),
    );
    expect(screen.getByRole("button", { name: "Try Again" })).toBeTruthy();
    expect(
      screen.queryByText(
        "No eligibility information yet. Please read the official notification.",
      ),
    ).toBeNull();
  });

  it('shows the normal "no info" message when the request succeeds with no data', async () => {
    render(<JobDetailScreen />);

    await waitFor(() => expect(screen.getByText("Clerk")).toBeTruthy());
    expect(
      screen.getByText(
        "No eligibility information yet. Please read the official notification.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Location")).toBeTruthy();
    expect(screen.getByText("Gandhinagar")).toBeTruthy();
    expect(screen.getAllByText("Study material").length).toBeGreaterThan(0);
    expect(screen.queryByText("Some details could not refresh")).toBeNull();
  });

  it("shows the job's resource count when study material exists", async () => {
    mockGetJobLearningResources.mockResolvedValue([
      {
        id: "resource-1",
        job_id: "job-1",
        resource_type: "PDF",
        link_or_content: "https://example.com/syllabus.pdf",
        title: "Syllabus",
        description: null,
        language: null,
        topic: null,
        sort_order: 30,
        created_at: "",
      },
    ]);
    render(<JobDetailScreen />);

    await waitFor(() => expect(screen.getByText("1 resource for this job")).toBeTruthy());
  });

  it("retries the whole load when the user taps Try Again", async () => {
    mockGetJobDetails
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValue([]);
    render(<JobDetailScreen />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Try Again" })).toBeTruthy(),
    );
    fireEvent.press(screen.getByRole("button", { name: "Try Again" }));

    await waitFor(() =>
      expect(screen.queryByText("Some details could not refresh")).toBeNull(),
    );
    expect(mockGetJobById).toHaveBeenCalledTimes(2);
  });

  it("names the site the notice came from", async () => {
    mockGetJobById.mockResolvedValue({
      ...job,
      source_link: "https://www.freejobalert.com/gujarat-government-jobs/",
      official_link: null,
    });
    render(<JobDetailScreen />);

    await waitFor(() => expect(screen.getByText("Source: freejobalert.com")).toBeTruthy());
  });

  it("offers share and confirms when the browser copied the text", async () => {
    render(<JobDetailScreen />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Share this notice" })).toBeTruthy(),
    );
    fireEvent.press(screen.getByRole("button", { name: "Share this notice" }));

    await waitFor(() =>
      expect(
        screen.getByText("Link copied. You can paste it in WhatsApp."),
      ).toBeTruthy(),
    );
    expect(mockShareNoticeText).toHaveBeenCalledWith(
      "Clerk\nLast Date: 1 Jan 2099",
      "Clerk",
    );
  });

  it("opens the saved notice when the network is down", async () => {
    await writeNotice({
      job,
      details: [
        {
          id: "detail-1",
          job_id: "job-1",
          age_limit: "18 to 33 years",
          required_qualifications: "Graduate",
          application_fees: null,
          created_at: "",
        },
      ],
      documents: [
        {
          id: "doc-1",
          job_id: "job-1",
          document_name: "Aadhaar card",
          phase: "Application",
          created_at: "",
        },
      ],
      resources: [],
      savedAt: "2026-11-19T09:00:00.000Z",
    });
    mockGetJobById.mockRejectedValue(new Error("offline"));
    mockGetJobDetails.mockRejectedValue(new Error("offline"));
    mockGetDocumentsRequired.mockRejectedValue(new Error("offline"));
    mockGetJobLearningResources.mockRejectedValue(new Error("offline"));

    render(<JobDetailScreen />);

    await waitFor(() => expect(screen.getByText("Clerk")).toBeTruthy());
    expect(screen.getByText("No internet. Showing the saved notice.")).toBeTruthy();
    expect(screen.getByText("18 to 33 years")).toBeTruthy();
    expect(screen.getByText("Aadhaar card")).toBeTruthy();
    expect(screen.queryByText("Could not load jobs")).toBeNull();
  });

  it("saves the notice after a successful load", async () => {
    render(<JobDetailScreen />);

    await waitFor(() => expect(screen.getByText("Clerk")).toBeTruthy());
    await waitFor(async () => {
      const cached = await readNotice("job-1");
      expect(cached?.job.title).toBe("Clerk");
    });
  });

  it("keeps the cached eligibility when only the detail request fails", async () => {
    await writeNotice({
      job,
      details: [
        {
          id: "detail-1",
          job_id: "job-1",
          age_limit: "18 to 33 years",
          required_qualifications: "Graduate",
          application_fees: null,
          created_at: "",
        },
      ],
      documents: [],
      resources: [],
      savedAt: "2026-11-19T09:00:00.000Z",
    });
    mockGetJobDetails.mockRejectedValue(new Error("network down"));

    render(<JobDetailScreen />);

    await waitFor(() => expect(screen.getByText("18 to 33 years")).toBeTruthy());
    expect(screen.getByText("Some details could not refresh")).toBeTruthy();
  });

  it("does not invite an application to a notice that has closed", async () => {
    mockGetJobById.mockResolvedValue({
      ...job,
      deadline: "2020-01-01",
      source_link: "https://example.com/notice",
      official_link: null,
    });
    render(<JobDetailScreen />);

    await waitFor(() => expect(screen.getByText("Clerk")).toBeTruthy());
    expect(screen.getByText(/This notice has closed/)).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Apply on Official Website" }),
    ).toBeNull();
    // The official page stays reachable: it is where a call letter or corrigendum appears.
    expect(
      screen.getByRole("button", { name: "Open the official notice" }),
    ).toBeTruthy();
  });

  it("opens the official portal when the notice has one, and labels it honestly", async () => {
    mockGetJobById.mockResolvedValue({
      ...job,
      source_link: "https://www.freejobalert.com/articles/clerk-123",
      official_link: "https://ojas.gujarat.gov.in/AdvtDetails.aspx?sid=clerk",
    });
    render(<JobDetailScreen />);

    await waitFor(() => expect(screen.getByText("Clerk")).toBeTruthy());
    expect(
      screen.getByRole("button", { name: "Apply on Official Website" }),
    ).toBeTruthy();
    expect(screen.getByText("Official site: ojas.gujarat.gov.in")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Read the Full Notice" }),
    ).toBeNull();
  });

  it("does not call a third-party summary an official website", async () => {
    mockGetJobById.mockResolvedValue({
      ...job,
      source_link: "https://www.freejobalert.com/articles/clerk-123",
      official_link: null,
    });
    render(<JobDetailScreen />);

    await waitFor(() => expect(screen.getByText("Clerk")).toBeTruthy());
    expect(
      screen.getByRole("button", { name: "Read the Full Notice" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Apply on Official Website" }),
    ).toBeNull();
  });

  it("names an official notification PDF instead of calling it an application page", async () => {
    mockGetJobById.mockResolvedValue({
      ...job,
      source_link: "https://www.freejobalert.com/articles/baou-1",
      official_link: "https://baou.edu.in/assets/pdf/Envlope%2002-2026.pdf",
    });
    render(<JobDetailScreen />);

    await waitFor(() => expect(screen.getByText("Clerk")).toBeTruthy());
    expect(
      screen.getByRole("button", { name: "Open Official Notification" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Apply on Official Website" }),
    ).toBeNull();
  });

  it("names an application form instead of calling it a website", async () => {
    mockGetJobById.mockResolvedValue({
      ...job,
      source_link: "https://www.freejobalert.com/articles/niper-1",
      official_link: "https://forms.gle/2LL2aEJ4Db4psyL3A",
    });
    render(<JobDetailScreen />);

    await waitFor(() => expect(screen.getByText("Clerk")).toBeTruthy());
    expect(
      screen.getByRole("button", { name: "Open Application Form" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Apply on Official Website" }),
    ).toBeNull();
  });
});
