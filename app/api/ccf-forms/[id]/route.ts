import { NextRequest, NextResponse } from 'next/server'
import { updateCCFForm, getCCFFormById, deleteCCFForm } from '@/lib/db-helpers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const form = await getCCFFormById(id)

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    return NextResponse.json({ form })
  } catch (error: unknown) {
    console.error('Error fetching CCF form:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Update the form
    const updatedForm = await updateCCFForm(id, body)

    return NextResponse.json({ success: true, form: updatedForm })
  } catch (error: unknown) {
    console.error('Error updating CCF form:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteCCFForm(id)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting CCF form:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
