import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SignInButton from '@/components/SignInButton'

export default async function HomePage() {
  // If already logged in, skip the landing page entirely
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center">

        {/* Logo / icon */}
        <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-7 h-7 text-white"
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

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Smart Bookmarks
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Save, organise, and access your bookmarks from anywhere.
          Sign in to get started.
        </p>

        <SignInButton />

        <p className="text-xs text-gray-400 mt-6">
          By signing in you agree to our terms of service.
        </p>
      </div>
    </main>
  )
}