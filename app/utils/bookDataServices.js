// Book data fetching services

// Google Books API
export async function fetchFromGoogleBooks(isbn) {
  try {
    // Add maxResults=1 to limit to one result and use exact ISBN match
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=1`
    );
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const book = data.items[0].volumeInfo;
      return {
        title: book.title,
        imageUrl: book.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
        source: 'google',
        description: book.description,
        authors: book.authors,
        publishedDate: book.publishedDate,
        pageCount: book.pageCount,
        categories: book.categories,
      };
    }
    return null;
  } catch (error) {
    console.error('Google Books API error:', error);
    return null;
  }
}

// OpenLibrary API
export async function fetchFromOpenLibrary(isbn) {
  try {
    const response = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
    );
    const data = await response.json();
    
    if (data[`ISBN:${isbn}`]) {
      const book = data[`ISBN:${isbn}`];
      return {
        title: book.title,
        imageUrl: book.cover?.large || book.cover?.medium || null,
        source: 'openlibrary',
        description: book.notes,
        authors: book.authors?.map(author => author.name),
        publishedDate: book.publish_date,
        pageCount: book.number_of_pages,
        subjects: book.subjects,
      };
    }
    return null;
  } catch (error) {
    console.error('OpenLibrary API error:', error);
    return null;
  }
}

// ISBNdb API (requires API key)
export async function fetchFromISBNdb(isbn, apiKey) {
  try {
    const response = await fetch(
      `https://api2.isbndb.com/book/${isbn}`,
      {
        headers: {
          'Authorization': apiKey
        }
      }
    );
    const data = await response.json();
    
    if (data.book) {
      return {
        title: data.book.title,
        imageUrl: data.book.image || null,
        source: 'isbndb',
        description: data.book.synopsis,
        authors: [data.book.author],
        publishedDate: data.book.published_date,
        pageCount: data.book.pages,
        categories: data.book.category,
      };
    }
    return null;
  } catch (error) {
    console.error('ISBNdb API error:', error);
    return null;
  }
}

// Main function to try all sources
export async function fetchBookData(isbn, options = {}) {
  const {
    useGoogle = true,
    useOpenLibrary = true,
  } = options;

  // Try Google Books first
  if (useGoogle) {
    const googleData = await fetchFromGoogleBooks(isbn);
    if (googleData) return googleData;
  }

  // Try OpenLibrary second
  if (useOpenLibrary) {
    const openLibraryData = await fetchFromOpenLibrary(isbn);
    if (openLibraryData) return openLibraryData;
  }

  // If all sources fail, return basic data
  return {
    title: null,
    imageUrl: null,
    source: null,
    description: null,
    authors: [],
    publishedDate: null,
    pageCount: null,
    categories: [],
  };
} 