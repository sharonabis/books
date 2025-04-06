import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { fetchBookData } from '@/app/utils/bookDataServices'
import axios from 'axios'
import * as cheerio from 'cheerio'

// Function to fetch price data from sell4more.de
async function fetchPriceData(isbn) {
  try {
    console.log(`Fetching price data for ISBN: ${isbn}`)
    
    // Set a 3-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await axios.get(`https://app.sell4more.de/search/${isbn}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: controller.signal,
      timeout: 3000, // 3 second timeout
    })

    clearTimeout(timeoutId);

    if (response.status !== 200) {
      throw new Error(`Failed to fetch price data: ${response.status}`)
    }

    const html = response.data
    console.log('Response received, length:', html.length)
    
    // Load the HTML into cheerio
    const $ = cheerio.load(html)
    
    // Try to find the price using the specific selector
    let sellPrice = null
    let highestPrice = null
    
    // First, try to find the "Ankaufpreise" section
    let ankaufpreiseElement = null
    
    // Look for elements containing "Ankaufpreise"
    $('*').each((i, el) => {
      const text = $(el).text().trim()
      if (text.includes('Ankaufpreise')) {
        console.log('Found Ankaufpreise element:', text)
        ankaufpreiseElement = $(el)
        return false // Break the loop
      }
    })
    
    if (ankaufpreiseElement) {
      // Get the parent element to find the price
      const parentElement = ankaufpreiseElement.parent()
      const priceText = parentElement.text().trim()
      console.log('Price text from Ankaufpreise parent:', priceText)
      
      // Extract the price range (e.g., "0,84 € – 0,84 €")
      const priceRangeMatch = priceText.match(/(\d+[.,]\d{2})\s*€\s*–\s*(\d+[.,]\d{2})\s*€/i)
      if (priceRangeMatch) {
        console.log('Found price range:', priceRangeMatch[0])
        sellPrice = parseFloat(priceRangeMatch[1].replace(',', '.'))
        highestPrice = parseFloat(priceRangeMatch[2].replace(',', '.'))
        console.log('Extracted prices:', { sellPrice, highestPrice })
      } else {
        // Try to find a single price
        const singlePriceMatch = priceText.match(/(\d+[.,]\d{2})\s*€/i)
        if (singlePriceMatch) {
          console.log('Found single price:', singlePriceMatch[0])
          sellPrice = parseFloat(singlePriceMatch[1].replace(',', '.'))
          highestPrice = sellPrice
          console.log('Extracted price:', sellPrice)
        }
      }
    }
    
    // If we didn't find the price using the Ankaufpreise approach, try other methods
    if (sellPrice === null) {
      // Try to find any element containing a price in the format "X,XX €"
      $('*').each((i, el) => {
        const text = $(el).text().trim()
        const priceMatch = text.match(/(\d+[.,]\d{2})\s*€/i)
        if (priceMatch) {
          console.log('Found price in element:', text)
          sellPrice = parseFloat(priceMatch[1].replace(',', '.'))
          highestPrice = sellPrice
          console.log('Extracted price:', sellPrice)
          return false // Break the loop
        }
      })
    }
    
    // If we still don't have a price, try regex on the entire HTML
    if (sellPrice === null) {
      // Try to find any price in the format "X,XX €"
      const pricePattern = /(\d+[.,]\d{2})\s*€/i
      const priceMatch = html.match(pricePattern)
      
      if (priceMatch) {
        console.log('Found price with regex:', priceMatch[0])
        sellPrice = parseFloat(priceMatch[1].replace(',', '.'))
        highestPrice = sellPrice
        console.log('Extracted price:', sellPrice)
      }
    }
    
    if (!sellPrice) {
      console.log('No price found in HTML')
    }
    
    return {
      sellPrice,
      highestPrice,
      lastPriceCheck: new Date(),
    }
  } catch (error) {
    console.error('Error fetching price data:', error)
    return {
      sellPrice: null,
      highestPrice: null,
      lastPriceCheck: new Date(),
      error: error.message,
    }
  }
}

// GET /api/books - Get all books
export async function GET() {
  try {
    const books = await prisma.book.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })
    
    return NextResponse.json(books)
  } catch (error) {
    console.error('Error fetching books:', error)
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    )
  }
}

// POST /api/books - Create a new book
export async function POST(request) {
  try {
    const { isbn } = await request.json()

    if (!isbn) {
      return NextResponse.json(
        { error: 'ISBN is required' },
        { status: 400 }
      )
    }

    // Fetch book data from multiple sources
    const bookData = await fetchBookData(isbn)
    
    // Fetch price data from sell4more.de
    const priceData = await fetchPriceData(isbn)

    // Create book in database
    const book = await prisma.book.create({
      data: {
        isbn,
        title: bookData?.title || null,
        imageUrl: bookData?.imageUrl || null,
        description: bookData?.description || null,
        authors: JSON.stringify(bookData?.authors || []),
        publishedDate: bookData?.publishedDate || null,
        pageCount: bookData?.pageCount || null,
        categories: JSON.stringify(bookData?.categories || []),
        source: bookData?.source || null,
        sellPrice: priceData.sellPrice,
        highestPrice: priceData.highestPrice,
        lastPriceCheck: priceData.lastPriceCheck,
      },
    })

    return NextResponse.json(book)
  } catch (error) {
    console.error('Error creating book:', error)
    return NextResponse.json(
      { error: 'Failed to create book' },
      { status: 500 }
    )
  }
} 