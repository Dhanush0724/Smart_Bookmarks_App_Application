'use client'

import { signOut } from '@/app/actions/bookmarks'

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
    >
      Sign out
    </button>
  )
}