'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function addBookmark(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const url = formData.get('url') as string
  const title = formData.get('title') as string

  if (!url || !title) return { error: 'Both fields are required' }

  try {
    new URL(url)
  } catch {
    return { error: 'Please enter a valid URL' }
  }

  const { error } = await supabase
    .from('bookmarks')
    .insert({ url, title, user_id: user.id })

  if (error) return { error: error.message }

  return { success: true }
}

export async function deleteBookmark(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}