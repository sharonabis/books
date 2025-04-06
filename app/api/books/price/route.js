import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const isbn = searchParams.get('isbn')

  if (!isbn) {
    return NextResponse.json(
      { error: 'ISBN is required' },
      { status: 400 }
    )
  }

  let browser = null
  try {
    console.log(`Fetching price for ISBN: ${isbn}`)
    
    // Launch a headless browser with increased timeouts
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    })
    
    // Create a new page
    const page = await browser.newPage()
    
    // Set a timeout for navigation
    page.setDefaultNavigationTimeout(30000)
    
    // Navigate to the sell4more.de search page
    console.log('Navigating to page...')
    await page.goto(`https://app.sell4more.de/search/${isbn}`, {
      waitUntil: 'networkidle2',
      timeout: 30000
    })
    
    // Wait for the content to load
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Extract the price information
    console.log('Extracting price data...')
    const priceData = await page.evaluate(() => {
      // Function to extract price from text
      const extractPrice = (text) => {
        const priceMatch = text.match(/(\d+[.,]\d{2})\s*€/i)
        if (priceMatch) {
          return parseFloat(priceMatch[1].replace(',', '.'))
        }
        return null
      }
      
      // Try to find the price container first
      const priceContainer = document.querySelector('.MuiCardContent-root')
      if (priceContainer) {
        const priceText = priceContainer.textContent
        console.log('Found price container:', priceText)
        
        // Look for price range
        const rangeMatch = priceText.match(/(\d+[.,]\d{2})\s*€\s*–\s*(\d+[.,]\d{2})\s*€/i)
        if (rangeMatch) {
          return {
            price: parseFloat(rangeMatch[1].replace(',', '.')),
            highPayout: parseFloat(rangeMatch[2].replace(',', '.'))
          }
        }
        
        // Look for single price
        const singleMatch = priceText.match(/(\d+[.,]\d{2})\s*€/i)
        if (singleMatch) {
          const price = parseFloat(singleMatch[1].replace(',', '.'))
          return {
            price: price,
            highPayout: price
          }
        }
      }
      
      // If no price found in container, try finding any price in the page
      const allText = document.body.textContent
      const euroPattern = /(\d+[.,]\d{2})\s*€/i
      const matches = allText.match(new RegExp(euroPattern, 'g'))
      
      if (matches && matches.length > 0) {
        const firstMatch = matches[0].match(euroPattern)
        const price = parseFloat(firstMatch[1].replace(',', '.'))
        return {
          price: price,
          highPayout: price
        }
      }
      
      return null
    })
    
    console.log('Price data extracted:', priceData)
    
    // Close the browser
    await browser.close()
    
    if (priceData) {
      return NextResponse.json({
        price: priceData.price,
        highPayout: priceData.highPayout,
        lastChecked: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        error: 'No price found',
        lastChecked: new Date().toISOString()
      })
    }
  } catch (error) {
    console.error('Error scraping the price:', error)
    if (browser) {
      await browser.close()
    }
    return NextResponse.json(
      { error: 'Failed to fetch price data' },
      { status: 500 }
    )
  }
}