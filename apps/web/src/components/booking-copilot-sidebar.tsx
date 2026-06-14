"use client";

import { CopilotSidebar } from "@copilotkit/react-ui";
import { usePathname } from "next/navigation";

import {
  bookingCopilotInstructions,
  bookingCopilotLabels,
  shouldShowBookingCopilotSidebar
} from "@/lib/copilot-booking";

export function BookingCopilotSidebar() {
  const pathname = usePathname();

  if (!shouldShowBookingCopilotSidebar(pathname)) {
    return null;
  }

  return (
    <div className="booking-copilot-shell" data-testid="booking-copilot-sidebar">
      <CopilotSidebar
        className="booking-copilot-sidebar"
        clickOutsideToClose
        defaultOpen={false}
        hitEscapeToClose
        instructions={bookingCopilotInstructions}
        labels={bookingCopilotLabels}
        shortcut="k"
      />
    </div>
  );
}
