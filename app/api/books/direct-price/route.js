import { NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const isbn = searchParams.get('isbn')

  if (!isbn) {
    return NextResponse.json(
      { error: 'ISBN is required' },
      { status: 400 }
    )
  }

  try {
    console.log(`Fetching direct price data for ISBN: ${isbn}`)
    
    // List of vendors to check
    const vendors = [
      'buchmaxe',
      'konsolenbude',
      'sellorado',
      'rebuy',
      'studibuch',
      'momox'
    ]
    
    // Array to store all price results
    const priceResults = []
    
    // Fetch prices from each vendor
    for (const vendor of vendors) {
      try {
        console.log(`Checking vendor: ${vendor}`)
        
        // Make request to Sell4More API
        const response = await axios.get(`https://api.sell4more.de:8443/api/product?ean=${isbn}&vendor=${vendor}`, {
          timeout: 5000, // 5 second timeout
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        })
        
        // If we got a successful response with price data
        if (response.status === 200 && response.data) {
          console.log(`Got response from ${vendor}:`, response.data)
          
          // Extract price information based on the Sell4More API format
          // The API returns different price fields based on condition
          const priceLikeNew = response.data.priceLikeNew !== undefined ? parseFloat(response.data.priceLikeNew) : null
          const priceVeryGood = response.data.priceVeryGood !== undefined ? parseFloat(response.data.priceVeryGood) : null
          const priceGood = response.data.priceGood !== undefined ? parseFloat(response.data.priceGood) : null
          const priceAcceptable = response.data.priceAcceptable !== undefined ? parseFloat(response.data.priceAcceptable) : null
          
          // Get the highest price available for this vendor
          const prices = [priceLikeNew, priceVeryGood, priceGood, priceAcceptable].filter(price => price !== null && !isNaN(price))
          
          if (prices.length > 0) {
            const highestPrice = Math.max(...prices)
            
            priceResults.push({
              price: highestPrice,
              company: response.data.vendorName || vendor,
              vendorName: response.data.vendorName || vendor,
              bookName: response.data.name || 'Unknown Book'
            })
          }
        }
      } catch (error) {
        // Log error but continue with other vendors
        console.log(`Error fetching from ${vendor}:`, error.message)
      }
    }
    
    // If we found any prices
    if (priceResults.length > 0) {
      // Sort by price (highest first)
      priceResults.sort((a, b) => b.price - a.price)
      
      // Get the highest price
      const highestPrice = priceResults[0].price
      const highestCompany = priceResults[0].vendorName
      
      // Get the lowest price (for sell price)
      const lowestPrice = priceResults[priceResults.length - 1].price
      
      return NextResponse.json({
        sellPrice: lowestPrice,
        highestPrice: highestPrice,
        highPayoutCompany: highestCompany,
        allPrices: priceResults
      })
    }
    
    // If no prices found
    return NextResponse.json({
      error: 'No price available',
      message: 'No price data found for this ISBN'
    })
    
  } catch (error) {
    console.error('Error fetching price data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price data', message: error.message },
      { status: 500 }
    )
  }
} 