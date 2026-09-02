import { redirect } from "next/navigation";

// Room booking is handled through a Google Calendar appointment schedule for
// now. Every visit to /student/booking is sent there. The previous in-app
// booking UI lives in git history (see the commit that added this redirect).
const GOOGLE_BOOKING_URL =
  "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0oQTAfqIeYa_sR9NhKPP_bUzJijB9M-rVsTwpH_FQc5SurAkliWVCsFENWKdNJM9J8-OptASbY";

export default function StudentBooking() {
  redirect(GOOGLE_BOOKING_URL);
}
