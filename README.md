# Meta Ads Agency Scraper

A Node.js application that searches the Meta Ads Library using Playwright, extracts advertiser and website information, and exposes the scraper through an Express API.

The project can also be connected to n8n so a user can submit a niche and country through an n8n form, send the request to the local scraper through ngrok, and save the returned results into Google Sheets.

## Features

- Search Meta Ads Library by niche and country
- Automatically scroll and load available ads
- Extract advertiser nameF
- Extract company domain
- Extract company website
- Extract Meta Ad Library ID
- Generate direct Meta Ad Library URLs
- Remove duplicate advertisers
- Expose the scraper through a REST API
- Connect the scraper with n8n
- Submit searches through an n8n form
- Save results into Google Sheets
- Update existing Google Sheets rows based on Domain

## Tech Stack

- Node.js
- Express.js
- Playwright
- Chromium
- dotenv
- ngrok
- n8n
- Google Sheets

## Project Structure

```text
Meta-Ads-Agency-Scrapper/
├── scraper.js
├── server.js
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

## Requirements

Before running the project, make sure the following are installed:

- Node.js
- npm
- ngrok
- An n8n instance if you want to use the automation workflow
- Google Sheets access if you want to save scraper results

Playwright in this project requires Node.js 20 or newer.

## Installation

Clone the GitHub repository:

```bash
git clone (https://github.com/Systemapic-agency/Meta-Ads-Agency-Scrapper.git)
```

Open the project folder:

```bash
cd Meta-Ads-Agency-Scrapper
```

Install Node.js dependencies:

```bash
npm install
```

Install the Playwright Chromium browser:

```bash
npx playwright install chromium
```

If Playwright reports missing system dependencies on Linux, run:

```bash
npx playwright install-deps chromium
```

## Run the Server Locally

Start the Express server:

```bash
npm start
```

By default, the server runs on:

```text
http://localhost:3000
```

The application also supports the `PORT` environment variable.

Example `.env` file:

```env
PORT=3000
```

The `.env` file should not be committed to GitHub.

## Health Check

To confirm the server is running, open:

```text
http://localhost:3000/health
```

Or send:

```http
GET /health
```

Expected response:

```json
{
  "success": true,
  "status": "running"
}
```

## Scrape Endpoint

The scraper is available through:

```http
POST /scrape
```

Request body:

```json
{
  "niche": "digital marketing agency",
  "country": "US"
}
```

Example response:

```json
{
  "success": true,
  "niche": "digital marketing agency",
  "country": "US",
  "count": 1,
  "results": [
    {
      "agency": "Example Agency",
      "domain": "example.com",
      "website": "https://example.com",
      "niche": "digital marketing agency",
      "country": "US",
      "libraryId": "123456789",
      "metaAdUrl": "https://www.facebook.com/ads/library/?id=123456789"
    }
  ]
}
```

## How the Scraper Works

The scraper opens Meta Ads Library using Playwright and builds a search URL using the submitted niche and country.

It then:

1. Opens the Meta Ads Library search page
2. Scrolls the page to load more ads
3. Finds ad cards containing a Meta Library ID
4. Reads the advertiser name
5. Extracts external links from the ad
6. Filters blocked domains such as Facebook, Instagram, Meta, Google, Apple, and Skool
7. Extracts the advertiser website and domain
8. Removes duplicate advertisers
9. Returns the final results through the API

The browser currently runs in headless mode.

## Using ngrok

The Express server runs locally, so n8n needs a public URL to call it if n8n is running outside your local machine.

Start the Node.js server first:

```bash
npm start
```

Then open another terminal and start ngrok:

```bash
ngrok http 3000
```

ngrok will provide a public HTTPS URL similar to:

```text
https://abc123.ngrok-free.app
```

Your scraper endpoint will then be:

```text
https://abc123.ngrok-free.app/scrape
```

## Important ngrok URL Requirement

The ngrok URL changes when a new temporary ngrok tunnel is created.

Because of this, every user running the project locally must update the URL inside the n8n HTTP Request node.

For example, if ngrok provides:

```text
https://new-example.ngrok-free.app
```

the n8n HTTP Request URL must be changed to:

```text
https://new-example.ngrok-free.app/scrape
```

Do not use another user's old ngrok URL.

## n8n Workflow

The current n8n workflow follows this sequence:

```text
n8n Form
   ↓
Country Code Conversion
   ↓
HTTP Request
   ↓
Convert API Results Into n8n Items
   ↓
Append or Update Google Sheets Rows
```

### 1. Form Trigger

The n8n form collects two values:

```text
Niche
Country
```

The current field name is `Niche`, so keep that exact field name unless you also update the expressions in the workflow.

Available country options include:

```text
Canada
Australia
US
United Kingdom
Netherlands
ALL
```

### 2. Country Code Conversion

The Code node converts selected country names into the country codes expected by Meta Ads Library.

Current mappings:

```text
United Kingdom → GB
Canada → CA
Australia → AU
Netherlands → NL
```

Values that are not in the map are passed through unchanged.

For example:

```text
US → US
ALL → ALL
```

### 3. HTTP Request Node

The HTTP Request node sends a POST request to the scraper.

Method:

```text
POST
```

URL:

```text
https://YOUR-NGROK-URL/scrape
```

Header:

```text
ngrok-skip-browser-warning: true
```

JSON body:

```json
{
  "niche": "{{ $json.Niche }}",
  "country": "{{ $json.Country }}"
}
```

When another user runs the project, they must replace `YOUR-NGROK-URL` with the URL generated by their own ngrok tunnel.

### 4. Convert API Results Into n8n Items

The scraper returns all agencies inside the `results` array.

The n8n Code node converts every result into a separate n8n item:

```javascript
const results = $json.results || []

return results.map(item => ({
  json: item
}))
```

This allows the Google Sheets node to process every agency separately.

### 5. Google Sheets

The Google Sheets node saves these fields:

```text
Agency
Domain
Website
Niche
Country
LibraryId
Meta Ad URL
```

Current field mappings are:

```text
Agency      → agency
Domain      → domain
Website     → website
Niche       → niche
Country     → country
LibraryId   → libraryId
Meta Ad URL → metaAdUrl
```

The workflow uses `Domain` as the matching column.

This means:

- If the domain does not already exist, a new row is added
- If the domain already exists, the existing row is updated

## n8n Setup for Another User

If another person imports or recreates the n8n workflow, they should update the following before running it:

1. Start the Node.js server
2. Start ngrok on port 3000
3. Copy their new ngrok HTTPS URL
4. Open the HTTP Request node in n8n
5. Replace the old ngrok URL with their own URL
6. Keep `/scrape` at the end of the URL
7. Configure their own Google Sheets credentials
8. Select their own Google Sheets document
9. Select the correct sheet
10. Confirm the sheet contains the required columns
11. Test the workflow with one niche and country first

## Recommended Google Sheet Columns

Create the following columns in the first row of the Google Sheet:

```text
Agency
Domain
Website
Niche
Country
LibraryId
Meta Ad URL
```

## Testing Without n8n

You can test the API directly using Postman, Insomnia, curl, or another HTTP client.

Example using curl:

```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"niche":"digital marketing agency","country":"US"}'
```

If you want to test through ngrok:

```bash
curl -X POST https://YOUR-NGROK-URL/scrape \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{"niche":"digital marketing agency","country":"US"}'
```

## Troubleshooting

### Server does not start

Run:

```bash
npm install
```

Then:

```bash
npm start
```

### Chromium is missing

Run:

```bash
npx playwright install chromium
```

### Playwright system dependencies are missing on Linux

Run:

```bash
npx playwright install-deps chromium
```

### n8n cannot reach the scraper

Confirm:

- The Node.js server is running
- ngrok is running
- ngrok is forwarding to port 3000
- The latest ngrok URL is being used
- `/scrape` is included at the end of the URL

### ngrok URL stopped working

Temporary ngrok URLs can change when the tunnel is restarted.

Run:

```bash
ngrok http 3000
```

Copy the newly generated HTTPS URL and update the n8n HTTP Request node.

### No data is added to Google Sheets

Check:

- Google Sheets credentials are connected
- The correct spreadsheet is selected
- The correct sheet is selected
- Column names match the workflow mapping
- The HTTP Request returned a `results` array

## Security and Repository Notes

Do not upload the following to GitHub:

```text
node_modules/
.env
facebook-debug.png
ngrok*
```

Do not commit private API keys, tokens, ngrok authentication credentials, or Google account credentials.

The n8n workflow should use each user's own Google Sheets credentials.

## Important Notes

- Meta can change the Ads Library page structure at any time
- Changes to the Meta Ads Library HTML can require updates to the scraper
- Scraping results depend on currently available ads for the selected niche and country
- Temporary ngrok URLs can change between sessions
- Each user should use their own ngrok tunnel and Google Sheets credentials
- The project currently uses Playwright with Chromium
- Use the scraper responsibly and in accordance with applicable platform terms and policies
