# DC-IAPM Website

Official website for the Delhi Chapter of the Indian Association of Pathologists and Microbiologists (DC-IAPM). Built with React and Vite, it delivers public-facing content, membership flows, academic updates, and member services.

## Tech Stack

- React 19 + Vite 7
- React Router 7
- Tailwind CSS
- Framer Motion
- React Helmet Async (SEO)
- MUI (selected UI pieces)

## Getting Started

1. Install dependencies
	 - `npm install`
2. Start the dev server
	 - `npm run dev`
3. Production build
	 - `npm run build`
4. Preview production build
	 - `npm run preview`
5. Lint
	 - `npm run lint`

## Environment Variables

Create a `.env` file at the project root with:

```
VITE_API_URL=<your_google_apps_script_web_app_url>
```

`VITE_API_URL` powers events, publications, contact, membership, and directory data.

## Pages and Routes

All routes are defined in `App.jsx` with page-level SEO metadata.

- `/` Home
	- Hero banner with CTA
	- Event ticker marquee (latest updates)
	- Dynamic “Upcoming Event” countdown (uses session cache + API)
	- Mission, President, Secretary highlights
	- Quick Links cards

- `/about-us` About Us
	- Mission, roles, vision, constitution download
	- Vice President message panel

- `/governing-body` Governing Body
	- Office bearers with photos
	- Governing body member list

- `/president-message` President’s Message
	- Full message + profile section

- `/secretary-message` Secretary’s Message
	- Full message + profile section

- `/membership` Membership
	- Eligibility
	- Membership types and fees
	- Benefits list
	- CTA to join and receipt/certificate download

- `/join-membership` Membership Portal
	- New membership registration form
	- Payment details + QR
	- Validation with file checks for passport photo
	- Check status tab (receipt/certificate download after approval)
	- Promotional drive notice tab

- `/members-directory` Member Directory
	- Fetches member data via JSONP from Google Apps Script
	- Search by name/hospital/registration
	- Desktop table and mobile cards

- `/academics-events` Academics & Events
	- Fetches events from API
	- Cards with location/date, description, and countdown
	- Flyer download and registration links
	- Abstract guidelines download when present

- `/event-registration` Event Registration
	- Event picker (pre-selectable via route state)
	- Dynamic fee structure and categories
	- Payment details + QR
	- Validation and upload of payment screenshot

- `/publications` Publications
	- Fetches publications from API
	- Search by title/author
	- Download links (Google Drive links auto-converted)

- `/gallery` Gallery
	- Categorized albums with lightbox preview
	- Admin upload panel (stored in localStorage)

- `/contact-us` Contact Us
	- Contact form with honeypot protection
	- Success/error states
	- Registered office info + map embed

- `/journal-search` Journal Search (Coming Soon)
	- Placeholder page with CTA back to home

- `/case-of-the-month` Case of the Month (Coming Soon)
	- Placeholder page with CTA back to home

## Shared Features and Components

- Layout wrapper with header + footer
- Sticky navigation with desktop dropdowns and mobile slide-in menu
- Scroll-to-top on route change
- SEO metadata on every page (title, description, keywords)
- Animated sections and cards via Framer Motion
- Countdown timers with home-specific styling
- Event ticker marquee with API fallback content
- Coming Soon template for planned features

## Data Sources and API Expectations

The frontend expects a Google Apps Script Web App at `VITE_API_URL` that supports these actions:

- `get_events` (POST): list of upcoming events
- `get_publications` (POST): list of publications
- `submit_contact` (POST): contact form submissions
- `register_event` (POST): event registration payloads
- `check_status` (POST): membership application status by email
- `get_members` (GET or POST): member directory

Member Directory uses JSONP for cross-origin requests:

- GET `VITE_API_URL?action=get_members&page=1&limit=5000&callback=yourCallback`

The Apps Script starter for member directory lives under `src/docs/apps-script-member-directory/Code.gs`.

## Caching and Storage

- Events and publications are cached in `sessionStorage` to reduce API calls.
- Gallery admin uploads are stored in `localStorage`.

## Deployment

Vite build output is compatible with Vercel. A `vercel.json` is included for routing configuration.
