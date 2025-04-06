'use client'

import { useState } from 'react'
import AddBook from './components/AddBook'
import BookList from './components/BookList'

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleBookAdded = () => {
    // Increment the key to force BookList to refresh
    setRefreshKey(prev => prev + 1)
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Book Management System</h1>
      <AddBook onBookAdded={handleBookAdded} />
      <BookList key={refreshKey} />
    </main>
  )
}
