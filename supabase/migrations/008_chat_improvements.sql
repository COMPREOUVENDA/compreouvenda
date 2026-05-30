-- Migration 008: Chat improvements
-- Add columns to existing tables and create attachments table

-- Check and add columns to conversations if they exist
DO $$ BEGIN
  -- Add typing columns
  ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS typing_user_id UUID;
  ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS typing_at TIMESTAMPTZ;
  ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
EXCEPTION WHEN undefined_table THEN
  -- Create conversations table if not exists
  CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID,
    buyer_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    unread_buyer INT DEFAULT 0,
    unread_seller INT DEFAULT 0,
    typing_user_id UUID,
    typing_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
END $$;

-- Check and add columns to messages
DO $$ BEGIN
  ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS offer_amount DECIMAL;
  ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS offer_status TEXT;
  ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS metadata JSONB;
EXCEPTION WHEN undefined_table THEN
  CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content TEXT,
    type TEXT DEFAULT 'text',
    offer_amount DECIMAL,
    offer_status TEXT,
    metadata JSONB,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
END $$;

-- Chat attachments table
CREATE TABLE IF NOT EXISTS public.chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON public.conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller ON public.conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_msg ON public.chat_attachments(message_id);

-- RLS
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "chat_attachments_select" ON public.chat_attachments FOR SELECT USING (true);
  CREATE POLICY "chat_attachments_insert" ON public.chat_attachments FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enable realtime for messages
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
