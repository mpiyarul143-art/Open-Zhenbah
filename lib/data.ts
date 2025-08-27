import { supabase } from '@/lib/supabase'
import type { ChatMessage, ChatThread } from '@/lib/types'

// Map DB rows to UI types
function mapChatRowToThread(row: any, messages: any[] = []): ChatThread {
  return {
    id: row.id,
    title: row.title || 'New Chat',
    createdAt: new Date(row.created_at).getTime(),
    projectId: row.project_id || undefined,
    pageType: row.page_type || 'home',
    messages: messages.map(mapMessageRowToChatMessage),
  }
}

function mapMessageRowToChatMessage(row: any): ChatMessage {
  return {
    role: row.role,
    content: row.content,
    ts: new Date(row.created_at).getTime(),
    modelId: row.model || undefined,
  }
}

export async function fetchThreads(userId: string): Promise<ChatThread[]> {
  // Fetch chats for owner, then fetch latest messages per chat (optional: join)
  const { data: chats, error } = await supabase
    .from('chats')
    .select('*')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  if (!chats || chats.length === 0) return []

  const chatIds = chats.map((c: { id: any }) => c.id)
  const { data: messages, error: msgErr } = await supabase
    .from('messages')
    .select('*')
    .in('chat_id', chatIds)
    .order('created_at', { ascending: true })

  if (msgErr) throw msgErr

  const messageMap = new Map<string, any[]>()
  for (const m of messages || []) {
    const list = messageMap.get(m.chat_id) || []
    list.push(m)
    messageMap.set(m.chat_id, list)
  }

  return chats.map((c: { id: string }) => mapChatRowToThread(c, messageMap.get(c.id) || []))
}

export async function createThread(params: {
  userId: string
  title?: string
  projectId?: string | null
  pageType?: 'home' | 'compare'
  initialMessage?: ChatMessage | null
}): Promise<ChatThread> {
  const { userId, title, projectId, pageType = 'home', initialMessage } = params

  const { data: chat, error } = await supabase
    .from('chats')
    .insert({
      owner_id: userId,
      project_id: projectId ?? null,
      title: title ?? 'New Chat',
      page_type: pageType,
    })
    .select('*')
    .single()

  if (error) throw error

  let messages: any[] = []
  if (initialMessage) {
    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .insert({
        chat_id: chat.id,
        owner_id: userId,
        role: initialMessage.role,
        content: initialMessage.content,
        model: initialMessage.modelId ?? null,
        content_json: null,
        metadata: null,
      })
      .select('*')
      .single()
    if (msgErr) throw msgErr
    messages = [msg]
  }

  return mapChatRowToThread(chat, messages)
}

export async function addMessage(params: {
  userId: string
  chatId: string
  message: ChatMessage
}): Promise<void> {
  const { userId, chatId, message } = params
  
  console.log('🔍 addMessage called:', { 
    userId: userId?.substring(0, 8) + '...', 
    chatId: chatId?.substring(0, 8) + '...', 
    role: message.role,
    content: message.content?.substring(0, 50) + '...',
    modelId: message.modelId 
  });
  
  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      owner_id: userId,
      role: message.role,
      content: message.content,
      model: message.modelId ?? null,
      content_json: null,
      metadata: null,
      created_at: message.ts ? new Date(message.ts).toISOString() : new Date().toISOString(),
    })
    .select()
  
  if (error) {
    console.error('❌ Database error inserting message:', error);
    throw error;
  }
  
  console.log('✅ Message inserted successfully:', data?.[0]?.id);

  // Touch chat updated_at
  const { error: updateError } = await supabase
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chatId)
    
  if (updateError) {
    console.error('⚠️ Failed to update chat timestamp:', updateError);
  }
}

export async function deleteThread(userId: string, chatId: string): Promise<void> {
  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', chatId)
    .eq('owner_id', userId)
  if (error) throw error
}

export async function updateThreadTitle(userId: string, chatId: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('chats')
    .update({ title })
    .eq('id', chatId)
    .eq('owner_id', userId)
  if (error) throw error
}
