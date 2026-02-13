'use client'

import { useRef, useState, useTransition } from 'react'
import { addBookmark } from '@/app/actions/bookmarks'

export default function AddBookmarkForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await addBookmark(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        formRef.current?.reset()
      }
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">
        Add a bookmark
      </h2>
      <form ref={formRef} action={handleSubmit} className="space-y-3">
        <div>
          <input
            name="title"
            type="text"
            placeholder="Title"
            required
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
          />
        </div>
        <div>
          <input
            name="url"
            type="url"
            placeholder="https://example.com"
            required
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving...' : 'Save bookmark'}
        </button>
      </form>
    </div>
  )
}