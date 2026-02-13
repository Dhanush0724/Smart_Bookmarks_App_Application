'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { deleteBookmark } from '@/app/actions/bookmarks'

type Bookmark = {
  id: string
  url: string
  title: string
  created_at: string
  user_id: string
}

type Props = {
  initialBookmarks: Bookmark[]
  userId: string
}

export default function BookmarkList({ initialBookmarks, userId }: Props) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const realtimeUpdated = useRef(false)

  // Only sync from server if Realtime hasn't taken over yet
  // This prevents the server re-render (triggered by Server Action) from
  // wiping the optimistic Realtime state update
  useEffect(() => {
    if (!realtimeUpdated.current) {
      setBookmarks(initialBookmarks)
    }
  }, [initialBookmarks])

  useEffect(() => {
    const supabase = createClient()

    const setupChannel = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        console.log('No session found')
        return null
      }

      // Pass auth token so Realtime can broadcast authenticated changes
      supabase.realtime.setAuth(session.access_token)

      const channel = supabase
        .channel(`bookmarks-${Math.random()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookmarks',
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newBookmark = payload.new as Bookmark
              // Only show this user's bookmarks
              if (newBookmark.user_id !== userId) return
              // Mark that Realtime has taken over state management
              realtimeUpdated.current = true
              setBookmarks((prev) => {
                const exists = prev.some((b) => b.id === newBookmark.id)
                if (exists) return prev
                return [newBookmark, ...prev]
              })
            }
            if (payload.eventType === 'DELETE') {
              realtimeUpdated.current = true
              setBookmarks((prev) =>
                prev.filter((b) => b.id !== payload.old.id)
              )
            }
          }
        )
        .subscribe()

      return channel
    }

    let channelRef: any = null
    const supabaseRef = supabase

    setupChannel().then((channel) => {
      channelRef = channel
    })

    return () => {
      if (channelRef) {
        supabaseRef.removeChannel(channelRef)
      }
    }
  }, [userId])

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      await deleteBookmark(id)
      setDeletingId(null)
    })
  }

  function getDomain(url: string) {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (bookmarks.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        </div>
        <p className="text-sm text-gray-500">No bookmarks yet. Add your first one above.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {bookmarks.map((bookmark) => (
        <div
          key={bookmark.id}
          className="bg-white rounded-2xl border border-gray-200 px-5 py-4 flex items-center gap-4 group hover:border-gray-300 transition-colors"
        >
          {/* Favicon */}
          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
            <img
              src={`https://www.google.com/s2/favicons?domain=${getDomain(bookmark.url)}&sz=32`}
              alt=""
              className="w-4 h-4"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors truncate block"
            >
              {bookmark.title}
            </a>
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {getDomain(bookmark.url)} · {formatDate(bookmark.created_at)}
            </p>
          </div>

          {/* Delete button */}
          <button
            onClick={() => handleDelete(bookmark.id)}
            disabled={deletingId === bookmark.id && isPending}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all disabled:opacity-50"
            aria-label="Delete bookmark"
          >
            {deletingId === bookmark.id && isPending ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>
      ))}
    </div>
  )
}