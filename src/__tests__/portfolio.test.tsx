import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";
import {
  PROFILE,
  PROJECTS,
  getProjectById,
  getTotalAutomatedTests,
} from "@/data/portfolio";

const FORBIDDEN_STRINGS = [
  "datinguinoo",
  "paul andrei",
  "batangas",
  "datinguinoopaulg",
  "+63",
  "cgi",
  "laguna",
  "national university",
  "microsoft student",
  "formcheck",
] as const;

describe("portfolio domain model", () => {
  it("contains zero personal identifying information or excluded background references", () => {
    const serialized = JSON.stringify({
      PROFILE,
      PROJECTS,
    }).toLowerCase();

    for (const forbidden of FORBIDDEN_STRINGS) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(PROFILE.handle).toBe("Exeryze");
    expect(PROJECTS).toHaveLength(2);
  });

  it("exposes verified metrics for helpdesk-agent and docextract", () => {
    const helpdesk = getProjectById("helpdesk-agent");
    const docextract = getProjectById("docextract");

    expect(helpdesk).toBeDefined();
    expect(helpdesk?.testCount).toBe(89);
    expect(docextract).toBeDefined();
    expect(docextract?.testCount).toBe(46);
    expect(getTotalAutomatedTests()).toBe(135);
    expect(getProjectById("unknown")).toBeUndefined();
  });
});

describe("HomePage", () => {
  it("renders project titles, benchmark metrics, and GitHub links with zero excluded copy", () => {
    const { container } = render(<HomePage />);
    const renderedText = (container.textContent ?? "").toLowerCase();

    for (const forbidden of FORBIDDEN_STRINGS) {
      expect(renderedText).not.toContain(forbidden);
    }

    expect(screen.getByText(/135 automated tests across RAG, MCP & Document AI/i)).toBeInTheDocument();
    expect(screen.getAllByText("helpdesk-agent").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("docextract").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("99.1%").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("0.966").length).toBeGreaterThanOrEqual(1);

    const links = screen.getAllByRole("link").map((el) => el.getAttribute("href"));
    expect(links).toContain("https://github.com/Exryz");
    expect(links).toContain("https://github.com/Exryz/helpdesk-agent");
    expect(links).toContain("https://github.com/Exryz/docextract");
  });

  it("supports interactive scenario switching, repair patch toggle, and bbox review toggle", () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: /INV-2026-0419\.pdf/i }));
    expect(screen.getByText(/Decimal Validation: 7\/7 rules passed/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Pass 1: Fault/i }));
    expect(
      screen.getByText(/Fault Injected: subtotal_math discrepancy caught deterministically/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /REC-2026-0891\.png/i }));
    expect(screen.getByText("REC-2026-0891.png")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Apply repair patch/i }));
    expect(screen.getByRole("button", { name: /Applied · 100% F1/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Approve extraction/i }));
    expect(screen.getByRole("button", { name: /Flagged for review/i })).toBeInTheDocument();
  });
});
