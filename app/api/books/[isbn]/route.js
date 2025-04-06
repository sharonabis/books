import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// PATCH /api/books/[isbn] - Update a book by ISBN
export async function PATCH(request, { params }) {
  try {
    const { isbn } = params
    const body = await request.json()
    
    const { sellPrice, highestPrice, lastPriceCheck } = body
    
    // Update the book in the database
    const updatedBook = await prisma.book.update({
      where: { isbn },
      data: {
        sellPrice,
        highestPrice,
        lastPriceCheck: new Date(lastPriceCheck),
      },
    })
    
    return NextResponse.json(updatedBook)
  } catch (error) {
    console.error('Error updating book:', error)
    return NextResponse.json(
      { error: 'Failed to update book' },
      { status: 500 }
    )
  }
}

// DELETE /api/books/[isbn] - Delete a book by ISBN
export async function DELETE(request, { params }) {
  try {
    const { isbn } = params

    const book = await prisma.book.delete({
      where: {
        isbn,
      },
    })

    return NextResponse.json(book)
  } catch (error) {
    console.error('Error deleting book:', error)
    return NextResponse.json(
      { error: 'Failed to delete book' },
      { status: 500 }
    )
  }
} 