import { NextResponse } from 'next/server'

/**
 * Fetches book information from Amazon using ISBN
 * This is a server-side API route to avoid CORS issues
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const isbn = searchParams.get('isbn')
    
    if (!isbn) {
      return NextResponse.json({ error: 'ISBN parameter is required' }, { status: 400 })
    }
    
    // In a real implementation, you would:
    // 1. Use a library like Puppeteer or Cheerio to scrape Amazon
    // 2. Or use a third-party API service that provides Amazon data
    // 3. Or implement a server-side proxy to Amazon's API
    
    // For now, we'll return a placeholder with the Amazon image URL pattern
    const imageId = generateImageId()
    const imageUrl = `https://m.media-amazon.com/images/I/${imageId}.jpg`
    
    // For the title, we'll use a placeholder that includes the ISBN
    const title = `Book (ISBN: ${isbn})`
    
    return NextResponse.json({ title, imageUrl })
  } catch (error) {
    console.error('Error fetching Amazon book info:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * Generates a random Amazon image ID
 * This is a placeholder function - in a real implementation,
 * you would extract the actual image ID from Amazon's search results
 */
function generateImageId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
} 