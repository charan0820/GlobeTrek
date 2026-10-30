# GlobeTrek domain vocabulary

Country: one supported destination country; each trip belongs to one country.

City: named geographic destination with its own IANA timezone and coordinates.

Attraction: sourced real place. Informational planning item; no ticket inventory.

Stay: fictional property with embedded room types and per-local-night inventory. Checkout is exclusive.

Tour: fictional guided experience. TourDeparture owns scheduled UTC instants, destination timezone and seat inventory.

Route: derived ordered stops on a map. Straight connections are not navigation or journey-time estimates.

Template: immutable published itinerary version copied into an independent editable Trip.

Package: immutable fixed itinerary version. PackageDeparture references the same room and tour inventory used by other booking flows and adds its own party capacity.

Trip: privately owned dated draft with one party, inclusive calendar days, ordered stops, selected stays and an optimistic-concurrency revision.

Quote: expiring server-priced snapshot. Does not reserve capacity. Destination currency is authoritative; dated INR estimates are informational.

Reservation: immutable item snapshot plus a lifecycle. Pending reserves held quantities; confirmation transfers them to booked; expiry or cancellation releases the appropriate counter exactly once.

Legacy booking: preserved hotel-foundation record with its original ID, request hash and historical cancellation behavior. New reservations use the unified lifecycle.

Inventory horizon: last calendar date through which capacity was generated. Historical holes fail closed and are never silently recreated.
