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
}));

const mockGetJobById = jest.fn();
const mockGetJobDetails = jest.fn();
const mockGetDocumentsRequired = jest.fn();

jest.mock("../lib/supabase", () => ({
  getJobById: (...args: unknown[]) => mockGetJobById(...args),
  getJobDetails: (...args: unknown[]) => mockGetJobDetails(...args),
  getDocumentsRequired: (...args: unknown[]) =>
    mockGetDocumentsRequired(...args),
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
};

beforeEach(async () => {
  mockParams = { id: "job-1" };
  mockGetJobById.mockReset().mockResolvedValue(job);
  mockGetJobDetails.mockReset().mockResolvedValue([]);
  mockGetDocumentsRequired.mockReset().mockResolvedValue([]);
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
    expect(screen.queryByText("Could not load jobs")).toBeNull();
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
