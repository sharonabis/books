'use client'

import { useState, useEffect } from 'react'

export default function BookList() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteStatus, setDeleteStatus] = useState({ isbn: null, status: null })
  const [priceRefreshStatus, setPriceRefreshStatus] = useState({ id: null, status: null })
  const [showScanner, setShowScanner] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [scanning, setScanning] = useState(false)

  const fetchBooks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/books')
      if (!response.ok) {
        throw new Error('Failed to fetch books')
      }
      const data = await response.json()
      
      // Parse JSON strings into arrays and ensure all price-related fields are preserved
      const booksWithParsedArrays = data.map(book => ({
        ...book,
        authors: book.authors ? JSON.parse(book.authors) : [],
        categories: book.categories ? JSON.parse(book.categories) : [],
        // Ensure price-related fields are preserved
        sellPrice: book.sellPrice || null,
        highestPrice: book.highestPrice || null,
        highPayoutCompany: book.highPayoutCompany || null,
        lastPriceCheck: book.lastPriceCheck || null
      }))
      
      setBooks(booksWithParsedArrays)
      setLoading(false)
    } catch (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  const handleDelete = async (isbn) => {
    if (confirm('Are you sure you want to delete this book?')) {
      try {
        setDeleteStatus({ isbn, status: 'deleting' })
        
        const response = await fetch(`/api/books/${isbn}`, {
          method: 'DELETE',
        })
        
        if (response.ok) {
          setDeleteStatus({ isbn, status: 'success' })
          fetchBooks()
          setTimeout(() => {
            setDeleteStatus({ isbn: null, status: '' })
          }, 2000)
        } else {
          throw new Error('Failed to delete book')
        }
      } catch (error) {
        setDeleteStatus({ isbn, status: 'error' })
        setError(error.message)
        setTimeout(() => {
          setDeleteStatus({ isbn: null, status: '' })
          setError(null)
        }, 3000)
      }
    }
  }

  const handleRefreshPrice = async (isbn) => {
    try {
      setPriceRefreshStatus({ id: isbn, status: 'refreshing' })
      
      // Use the new direct-price API route
      const response = await fetch(`/api/books/direct-price?isbn=${isbn}`)
      const data = await response.json()
      
      if (response.ok && !data.error) {
        // Update the book in the database with the new price
        const updateResponse = await fetch(`/api/books/${isbn}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sellPrice: data.sellPrice,
            highestPrice: data.highestPrice,
            highPayoutCompany: data.highPayoutCompany,
            lastPriceCheck: new Date().toISOString(),
          }),
        })
        
        if (updateResponse.ok) {
          // Update the local state
          setBooks(books.map(book => 
            book.isbn === isbn 
              ? { 
                  ...book, 
                  sellPrice: data.sellPrice,
                  highestPrice: data.highestPrice,
                  highPayoutCompany: data.highPayoutCompany,
                  lastPriceCheck: new Date().toISOString(),
                } 
              : book
          ))
          
          setPriceRefreshStatus({ id: isbn, status: 'success' })
        } else {
          setPriceRefreshStatus({ id: isbn, status: 'error' })
        }
      } else {
        // If no price available, just update the last check time
        const updateResponse = await fetch(`/api/books/${isbn}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lastPriceCheck: new Date().toISOString(),
          }),
        })
        
        if (updateResponse.ok) {
          // Update the local state with just the last check time
          setBooks(books.map(book => 
            book.isbn === isbn 
              ? { 
                  ...book, 
                  lastPriceCheck: new Date().toISOString(),
                } 
              : book
          ))
          
          setPriceRefreshStatus({ id: isbn, status: 'no-price' })
        } else {
          setPriceRefreshStatus({ id: isbn, status: 'error' })
        }
      }
    } catch (error) {
      console.error('Error refreshing price:', error)
      setPriceRefreshStatus({ id: isbn, status: 'error' })
    }
  }

  const handleScanClick = () => {
    setShowScanner(true)
    setScanResult(null)
    setScanning(true)
  }

  const handleScanComplete = (result) => {
    setScanning(false)
    setScanResult(result)
    
    // If we got a valid ISBN, add it to the database
    if (result && result.isbn) {
      handleAddBookByISBN(result.isbn)
    }
  }

  const handleAddBookByISBN = async (isbn) => {
    try {
      setLoading(true)
      
      // Check if the book already exists
      const existingBook = books.find(book => book.isbn === isbn)
      if (existingBook) {
        alert(`Book with ISBN ${isbn} already exists in your list.`)
        setLoading(false)
        return
      }
      
      // Add the book to the database
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isbn: isbn,
          title: `Book ${isbn}`,
          authors: JSON.stringify([]),
          categories: JSON.stringify([]),
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to add book')
      }
      
      // Refresh the book list
      fetchBooks()
      
      // Close the scanner
      setShowScanner(false)
    } catch (error) {
      console.error('Error adding book:', error)
      alert(`Failed to add book: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBook = async (bookData) => {
    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookData),
      })

      if (!response.ok) {
        throw new Error('Failed to add book')
      }

      const newBook = await response.json()
      
      // Parse the JSON strings into arrays
      const parsedBook = {
        ...newBook,
        authors: newBook.authors ? JSON.parse(newBook.authors) : [],
        categories: newBook.categories ? JSON.parse(newBook.categories) : []
      }
      
      // Add the new book to the state
      setBooks(prevBooks => [...prevBooks, parsedBook])
      
      // Automatically refresh price for the new book
      await handleRefreshPrice(parsedBook.isbn)
      
      setShowScanner(false)
      setScanResult(null)
    } catch (error) {
      console.error('Error adding book:', error)
      alert('Failed to add book. Please try again.')
    }
  }

  useEffect(() => {
    fetchBooks()
  }, [])

  if (loading) return <div className="text-center p-4">Loading...</div>
  if (error) return <div className="text-red-500 p-4">Error: {error}</div>

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Books</h1>
        <div className="flex gap-4">
          <button
            onClick={handleScanClick}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Scan ISBN
          </button>
        </div>
      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Scan Book ISBN</h3>
              <button 
                onClick={() => setShowScanner(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {scanning ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Scanning for barcode...</p>
                <p className="text-sm text-gray-500 mt-2">Point your camera at a book barcode</p>
              </div>
            ) : scanResult ? (
              <div className="py-4">
                <div className="bg-green-50 p-4 rounded-md mb-4">
                  <p className="text-green-800 font-medium">ISBN Found: {scanResult.isbn}</p>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setShowScanner(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAddBookByISBN(scanResult.isbn)}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Add Book
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No barcode detected</p>
                <button
                  onClick={() => setScanning(true)}
                  className="mt-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {books.length === 0 ? (
        <p className="text-center text-gray-500">No books added yet.</p>
      ) : (
        <>
          {/* Books with prices */}
          {books.filter(book => book.sellPrice).length > 0 && (
            <div className="mt-6">
              <h3 className="text-l font-medium text-gray-900 mb-3 flex items-center">
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded mr-2">
                  {books.filter(book => book.sellPrice).length}
                </span>
                Books with Prices
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {books
                  .filter(book => book.sellPrice)
                  .sort((a, b) => b.sellPrice - a.sellPrice) // Sort by price (highest first)
                  .map((book) => (
                    <div key={book.id} className="border p-4 rounded shadow flex flex-col">
                      {/* Price Information - Moved to top */}
                      <div className="mb-2">
                        <div className="text-lg font-bold text-pink-600">
                          {book.sellPrice ? (book.sellPrice / 100).toFixed(2) : '0.00'}€ {book.highestPrice && book.highestPrice !== book.sellPrice ? `- ${(book.highestPrice / 100).toFixed(2)}€` : ''}
                        </div>
                      </div>
                      
                      <div className="flex items-center mb-2">
                        {book.imageUrl ? (
                          <div className="mr-4 relative h-24 w-16 overflow-hidden rounded shadow-md">
                            <img 
                              src={book.imageUrl} 
                              alt={book.title || 'Book cover'} 
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="mr-4 h-24 w-16 bg-gray-200 flex items-center justify-center rounded shadow-md">
                            <span className="text-gray-400 text-xs">No image</span>
                          </div>
                        )}
                        <div>
                          <p className="text-l font-semibold">{book.title || 'Unknown Title'}</p>
                          <p className="text-gray-600">{book.isbn}</p>
                        </div>
                      </div>
                      
                      {/* Additional Price Information */}
                      <div className="mt-2">
                        {book.highPayoutCompany && (
                          <div className="text-xs text-green-600">
                            Höchster Anbieter: {book.highPayoutCompany}
                          </div>
                        )}
                        {book.lastPriceCheck && (
                          <div className="text-xs text-gray-500">
                            Letzte Aktualisierung: {new Date(book.lastPriceCheck).toLocaleString()}
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-auto pt-2 flex justify-between items-center">
                        <button
                          onClick={() => handleRefreshPrice(book.isbn)}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            priceRefreshStatus.id === book.isbn && priceRefreshStatus.status === 'refreshing'
                              ? 'bg-gray-300 cursor-not-allowed'
                              : 'bg-blue-500 hover:bg-blue-700 text-white'
                          }`}
                          disabled={priceRefreshStatus.id === book.isbn && priceRefreshStatus.status === 'refreshing'}
                        >
                          {priceRefreshStatus.id === book.isbn && priceRefreshStatus.status === 'refreshing' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(book.isbn)}
                          className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline flex items-center"
                          disabled={deleteStatus.isbn === book.isbn}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {/* Books without prices */}
          {books.filter(book => !book.sellPrice).length > 0 && (
            <div className="mt-6">
              <h3 className="text-l font-medium text-gray-900 mb-3 flex items-center">
                <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded mr-2">
                  {books.filter(book => !book.sellPrice).length}
                </span>
                Books Without Prices
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {books
                  .filter(book => !book.sellPrice)
                  .map((book) => (
                    <div key={book.id} className="border p-4 rounded shadow flex flex-col">
                      {/* Price Information - Moved to top */}
                      <div className="mb-2">
                        <div className="text-sm text-gray-500">No price available</div>
                      </div>
                      
                      <div className="flex items-center mb-2">
                        {book.imageUrl ? (
                          <div className="mr-4 relative h-24 w-16 overflow-hidden rounded shadow-md">
                            <img 
                              src={book.imageUrl} 
                              alt={book.title || 'Book cover'} 
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="mr-4 h-24 w-16 bg-gray-200 flex items-center justify-center rounded shadow-md">
                            <span className="text-gray-400 text-xs">No image</span>
                          </div>
                        )} 
                        <div>
                          <p className="text-l font-semibold">{book.title || 'Unknown Title'}</p>
                          <p className="text-gray-500">{book.isbn}</p>
                        </div>
                      </div>
                      
                      {/* Last check time */}
                      {book.lastPriceCheck && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-500">
                            Letzte Aktualisierung: {new Date(book.lastPriceCheck).toLocaleString()}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-auto pt-2 flex justify-between items-center">
                        <button
                          onClick={() => handleRefreshPrice(book.isbn)}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            priceRefreshStatus.id === book.isbn && priceRefreshStatus.status === 'refreshing'
                              ? 'bg-gray-300 cursor-not-allowed'
                              : 'bg-blue-500 hover:bg-blue-700 text-white'
                          }`}
                          disabled={priceRefreshStatus.id === book.isbn && priceRefreshStatus.status === 'refreshing'}
                        >
                          {priceRefreshStatus.id === book.isbn && priceRefreshStatus.status === 'refreshing' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(book.isbn)}
                          className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline flex items-center"
                          disabled={deleteStatus.isbn === book.isbn}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
} 