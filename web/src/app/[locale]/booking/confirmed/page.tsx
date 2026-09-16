import { Suspense } from "react";
import { ConfirmedContent } from "./ConfirmedContent";

export default function BookingConfirmedPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmedContent />
    </Suspense>
  );
}
