import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/books/check?isbn=1234567890 - Check if an ISBN exists
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const isbn = searchParams.get('isbn')
    
    if (!isbn) {
      return Response.json({ error: 'ISBN parameter is required' }, { status: 400 })
    }
    
    // Check if ISBN exists in the database
    const existingBook = await prisma.book.findUnique({
      where: { isbn }
    })
    
    return Response.json({ exists: !!existingBook })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
} 