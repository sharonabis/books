import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET(request) {
  const url = new URL(request.url);
  const isbn = url.searchParams.get('isbn');

  if (!isbn) {
    return new Response(JSON.stringify({ error: 'ISBN is required' }), { status: 400 });
  }

  try {
    console.log(`Fetching price for ISBN: ${isbn}`);
    
    // Set a 10-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await axios.get(`https://app.sell4more.de/search/${isbn}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: controller.signal,
      timeout: 10000, // 10 second timeout
    });

    clearTimeout(timeoutId);

    if (response.status !== 200) {
      throw new Error(`Failed to fetch price data: ${response.status}`);
    }

    const html = response.data;
    console.log('Response received, length:', html.length);
    
    // Load the HTML into cheerio
    const $ = cheerio.load(html);
    
    // Try to find the price using the specific selector
    const priceElement = $('.MuiTypography-root.MuiCardHeader-subheader.MuiTypography-h5.MuiTypography-colorTextPrimary.MuiTypography-displayBlock');
    
    if (priceElement.length > 0) {
      const price = priceElement.text().trim();
      console.log('Found price:', price);
      return new Response(JSON.stringify({ price }), { status: 200 });
    } else {
      console.log('Price element not found with specific selector');
      
      // Try to find any element containing a price
      let priceText = null;
      
      // Look for elements containing "Ankaufpreise"
      $('*').each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('Ankaufpreise')) {
          console.log('Found Ankaufpreise element:', text);
          const parentElement = $(el).parent();
          priceText = parentElement.text().trim();
          return false; // Break the loop
        }
      });
      
      if (priceText) {
        console.log('Found price from Ankaufpreise parent:', priceText);
        return new Response(JSON.stringify({ price: priceText }), { status: 200 });
      }
      
      // If we still don't have a price, try a more aggressive approach
      const euroPattern = /(\d+[.,]\d{2}\s*€\s*–\s*\d+[.,]\d{2}\s*€)|(\d+[.,]\d{2}\s*€)/i;
      const matches = html.match(euroPattern);
      
      if (matches && matches.length > 0) {
        console.log('Found price with regex:', matches[0]);
        return new Response(JSON.stringify({ price: matches[0] }), { status: 200 });
      }
      
      throw new Error('Price not found on the page');
    }
  } catch (error) {
    console.error('Error scraping the price:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to fetch price';
    if (error.message.includes('timeout')) {
      errorMessage = 'Request timed out. Please try again.';
    } else if (error.message.includes('net::ERR')) {
      errorMessage = 'Network error. Please check your connection.';
    } else if (error.message.includes('Price not found')) {
      errorMessage = 'Price not found on the page.';
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
} 