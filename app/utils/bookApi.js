/**
 * Fetches book information from Amazon using ISBN
 * @param {string} isbn - The ISBN of the book
 * @returns {Promise<{title: string|null, imageUrl: string|null}>} - Book information
 */
export async function fetchBookInfo(isbn) {
  try {
    // Use our server-side API endpoint to fetch Amazon data
    const response = await fetch(`/api/books/amazon?isbn=${isbn}`);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      title: data.title || null,
      imageUrl: data.imageUrl || null
    };
  } catch (error) {
    console.error('Error fetching book info:', error);
    return { title: null, imageUrl: null };
  }
}

/**
 * Generates a random Amazon image ID
 * This is a placeholder function - in a real implementation,
 * you would extract the actual image ID from Amazon's search results
 */
function getRandomImageId() {
  // This is a simplified version - in reality, you would need to
  // extract the actual image ID from Amazon's search results
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
} 