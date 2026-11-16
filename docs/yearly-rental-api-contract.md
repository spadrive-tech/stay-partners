# Yearly rental integration requirements

The portal UI and demo support yearly rental apartments. The external Kiataka server and tenant app must implement/confirm this contract before real tenant flows are available. No new managed backend is used.

- Existing partner application accepts `business_type: "house_agent"`.
- Existing listing create/update/read endpoints accept `type: "yearly_rental"`, `apartment_type`, `annual_rent` (NGN), `nightly_rate: 0`, and `rental_details` as defined in `src/lib/api.ts`. Annual rent must not be treated as nightly rent.
- Rental details contain status, available-from date, bathrooms, furnishing, agent contact, named fixed rental fees and booleans for applications, inspections and direct contact. Tenant app must enforce these booleans and occupied status. A listing approval is not a paid tenancy.
- Existing bookings read endpoint returns discriminated requests: `request_type: "rental_application" | "inspection"`, `listing_id`, `tenant_id`, tenant name, contact, message, and either proposed move-in (`check_in`) or `inspection_at`. For applications `amount` is annual rent, not payment received; inspections have no booking charge.
- Existing booking accept/decline endpoints review these requests. Accepting an application does not collect rent or automatically mark the apartment occupied; confirming an inspection does not create a lease.
- Provide a verified absolute HTTPS `public_url` per yearly listing. No rental deep-link format has been assumed.
- Tenant-facing browse, application submission, inspection scheduling and agent-contact controls live in the separate tenant app, not this partner portal. They have not been implemented here.
- Server ownership/agent authorisation must be enforced on listing and request reads/updates. Frontend type selection does not grant permissions.