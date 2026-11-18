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

import i18n from "../lib/i18n";
import JobDetailScreen from "../app/job/[id]";

const job = {
  id: "job-1",
  title: "Clerk",
  department: "Revenue",
  post_date: "2026-01-01",
  deadline: "2099-01-01",
  salary: null,
  source_link: null,
  vacancies: null,
  qualification: "Graduate",
  advertisement_no: null,
  education_level: "Graduate",
  location: "Gandhinagar",
};

beforeEach(async () => {
  mockParams = { id: "job-1" };
  mockGetJobById.mockReset().mockResolvedValue(job);
  mockGetJobDetails.mockReset().mockResolvedValue([]);
  mockGetDocumentsRequired.mockReset().mockResolvedValue([]);
  mockGetJobLearningResources.mockReset().mockResolvedValue([]);
  await i18n.changeLanguage("en");
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

describe("Job detail screen", () => {
  it('shows a retry notice instead of "no info" when the detail request fails', async () => {
    mockGetJobDetails.mockRejectedValue(new Error("network down"));
    render(<JobDetailScreen />);

    await waitFor(() =>
      expect(screen.getByText("Could not load jobs")).toBeTruthy(),
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
    expect(screen.queryByText("Could not load jobs")).toBeNull();
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
      expect(screen.queryByText("Could not load jobs")).toBeNull(),
    );
    expect(mockGetJobById).toHaveBeenCalledTimes(2);
  });
});
