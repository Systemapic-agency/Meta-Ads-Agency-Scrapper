const express = require('express')
const dotenv = require('dotenv')
const { scrapeMetaAds } = require('./scraper')

dotenv.config()

const app = express()

app.use(express.json())

const PORT = process.env.PORT || 3000

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'running'
  })
})

app.post('/scrape', async (req, res) => {
  try {
    const { niche, country } = req.body

    console.log('RAW BODY:', req.body)
    console.log('NICHE RECEIVED:', niche)
    console.log('COUNTRY RECEIVED:', country)

    const results = await scrapeMetaAds({
      niche,
      country
    })

    return res.json({
      success: true,
      niche,
      country,
      count: results.length,
      results
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})