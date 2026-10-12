import { render, screen } from "@testing-library/react";
import { StatusPill } from "./StatusPill";

describe("StatusPill", () => {
  it("renders a readable label with the right tone", () => {
    render(<StatusPill status="IN_REVIEW" />);
    const pill = screen.getByText("IN REVIEW");
    expect(pill).toHaveAttribute("data-tone", "warn");
  });
  it("marks running work as busy", () => {
    render(<StatusPill status="PROCESSING" />);
    expect(screen.getByText("PROCESSING")).toHaveAttribute("data-tone", "busy");
  });
});
