'use client'

import { useState } from 'react'

export default function AddBook() {
  const [isbn, setIsbn] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setStatus({ type: '', message: '' })

    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isbn }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add book')
      }

      setStatus({
        type: 'success',
        message: 'Book added successfully!',
      })
      setIsbn('')
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mb-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="isbn" className="block text-sm font-medium text-gray-400">
            ISBN
          </label>
          <input
            type="text"
            id="isbn"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            placeholder="Enter ISBN"
            className="mt-1 block w-full rounded-md border  border-gray-800"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-m bold text-white ${
            isLoading
              ? 'bg-pink-400 cursor-not-allowed'
              : 'bg-pink-600 hover:bg-pink-700'
          } focus:outline-none focus:ring-2 focus:ring-offset-2`}
        >
          {isLoading ? 'Adding...' : 'Add Book'}
        </button>
      </form>

      {status.message && (
        <div
          className={`mt-4 p-4 rounded-md ${
            status.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {status.message}
        </div>
      )}
    </div>
  )
} 