-- Happy hour is an event, and we were the only ones who did not think so.
--
-- It has a day pattern (M-F), a start, an end, and an offer. That is precisely the shape of the
-- events table, which already had days_of_week, start_time AND end_time sitting unused for this.
-- Instead, happy hour lived as a free-text string on the restaurant row, scraped off websites by
-- an AI. So you could not ADD one: it was not in the composer's dropdown, because it was not in
-- this enum.
--
-- Adding it here makes a happy hour something a human can type: Mon-Fri, 15:00-18:00, "30% off
-- drinks and select appetizers". The old scraped string stays as the lowest-priority fallback for
-- the ~40 spots where a guess is better than nothing, but a real entered happy hour always wins.
--
-- NB: 'brunch' is in this enum and is filtered out of every query, because brunch is a service, not
-- an event. Happy hour is the opposite: it is genuinely a thing that starts and stops.

alter type event_type add value if not exists 'happy_hour';
