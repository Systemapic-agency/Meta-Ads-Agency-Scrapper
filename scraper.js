const { chromium } = require('playwright')

function cleanUrl(rawUrl) {
  try {
    let url = rawUrl

    if (url.includes('l.facebook.com/l.php')) {
      const parsed = new URL(url)
      url = parsed.searchParams.get('u') || url
    }

    return decodeURIComponent(url)
  } catch {
    return rawUrl
  }
}

function getDomain(rawUrl) {
  try {
    const cleaned = cleanUrl(rawUrl)

    const parsed = new URL(cleaned)

    const hostname = parsed.hostname.replace(/^www\./, '')

    const blocked = [
      'facebook.com',
      'instagram.com',
      'meta.com',
      'google.com',
      'apple.com',
      'fb.me',
      'skool.com'
    ]

    if (
      blocked.some(
        domain =>
          hostname === domain ||
          hostname.endsWith('.' + domain)
      )
    ) {
      return null
    }

    return {
      domain: hostname,
      website: `${parsed.protocol}//${parsed.host}`
    }
  } catch {
    return null
  }
}

async function loadMoreAds(page) {
  let previousCount = 0
  let unchanged = 0

  const maxScrolls = 50

  for (let i = 0; i < maxScrolls; i++) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })

    await page.waitForTimeout(2500)

    const count = await page
      .getByText(/Library ID:/)
      .count()
      .catch(() => previousCount)

    console.log(
      `Ads: ${count} | Scroll: ${i + 1}`
    )

    if (count === previousCount) {
      unchanged++
    } else {
      unchanged = 0
    }

    if (unchanged >= 5) {
      break
    }

    previousCount = count
  }
}

async function scrapeMetaAds({ niche, country }) {
  console.log('SCRAPER NICHE:', niche)
  console.log('SCRAPER COUNTRY:', country)
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  })


  try {
    const page = await browser.newPage()

    const searchUrl =
      `https://www.facebook.com/ads/library/` +
      `?active_status=active` +
      `&ad_type=all` +
      `&country=${encodeURIComponent(country)}` +
      `&q=${encodeURIComponent(niche)}` +
      `&search_type=keyword_unordered`

    console.log('SEARCH URL:', searchUrl)

    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    })

    console.log('Current URL:', page.url())
    console.log('Page title:', await page.title())

    await page.waitForTimeout(5000)

    const bodyText = await page.locator('body').innerText()

    console.log(
      'Has Library ID:',
      bodyText.includes('Library ID:')
    )

    console.log(
      'BODY START:',
      bodyText.substring(0, 3000)
    )

    await page.screenshot({
      path: 'facebook-debug.png',
      fullPage: true
    })

    await loadMoreAds(page)

    const ads = await page.evaluate(() => {
      const libraryElements = [
        ...document.querySelectorAll('*')
      ].filter(
        element =>
          element.childElementCount === 0 &&
          element.textContent &&
          element.textContent
            .trim()
            .startsWith('Library ID:')
      )

      const results = []

      for (const libraryElement of libraryElements) {
        let current = libraryElement

        let bestCard = null

        for (let level = 0; level < 15; level++) {
          if (!current.parentElement) {
            break
          }

          current = current.parentElement

          const text = current.innerText || ''

          const ids =
            (text.match(/Library ID:/g) || []).length

          if (
            ids === 1 &&
            text.includes('Sponsored')
          ) {
            bestCard = current
          }

          if (ids > 1) {
            break
          }
        }

        if (!bestCard) {
          continue
        }

        results.push({
          text: bestCard.innerText || '',
          links: [
            ...bestCard.querySelectorAll('a')
          ]
            .map(a => a.href)
            .filter(Boolean)
        })
      }

      return results
    })

    const agencies = new Map()

    for (const item of ads) {
      const lines = item.text
        .split('\n')
        .map(x => x.trim())
        .filter(Boolean)

      const sponsoredIndex =
        lines.findIndex(x => x === 'Sponsored')

      if (sponsoredIndex <= 0) {
        continue
      }

      const advertiser =
        lines[sponsoredIndex - 1]

      const libraryLine =
        lines.find(
          line =>
            line.startsWith('Library ID:')
        ) || ''

      const libraryId =
        libraryLine
          .replace('Library ID:', '')
          .trim()

      let companyDomain = ''
      let companyWebsite = ''

      for (const link of item.links) {
        const domainData = getDomain(link)

        if (domainData) {
          companyDomain =
            domainData.domain

          companyWebsite =
            domainData.website

          break
        }
      }

      if (!advertiser) {
        continue
      }

      const key =
        advertiser
          .toLowerCase()
          .trim()

      if (!agencies.has(key)) {
        agencies.set(key, {
          agency: advertiser,
          domain:
            companyDomain ||
            'Domain not found',
          website:
            companyWebsite ||
            'Website not found',
          niche,
          country,
          libraryId,
          metaAdUrl:
            libraryId
              ? `https://www.facebook.com/ads/library/?id=${libraryId}`
              : ''
        })
      }
    }

    return [...agencies.values()]
  } finally {
    await browser.close()
  }
}

module.exports = {
  scrapeMetaAds
}