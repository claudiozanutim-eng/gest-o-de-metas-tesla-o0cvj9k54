import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Bot, Send, Sparkles, User } from 'lucide-react'
import nicoImg from '@/assets/nico-5adbf.webp'
import { streamAgentChat } from '@/lib/skipAi'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function Assistant() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Olá! Sou o Nico IA, seu assistente inteligente da Tesla Mecatrônica. Posso analisar dados, apontar áreas de risco e sugerir ações de vendas. Como posso ajudar hoje?',
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isTyping) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    try {
      const abortController = new AbortController()
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/ask-assistant-stream`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token },
          body: JSON.stringify({ message: userMsg.content, conversation_id: conversationId }),
          signal: abortController.signal,
        },
      )

      const assistantId = (Date.now() + 1).toString()
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

      const result = await streamAgentChat(res, {
        onChunk: (_, full) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: full } : m)),
          )
        },
        signal: abortController.signal,
      })

      setConversationId(result.conversation_id)
    } catch (err) {
      console.error(err)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro de conexão.',
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] max-w-4xl mx-auto flex flex-col">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <img src={nicoImg} alt="Nico IA" className="w-8 h-8 object-contain" />
          Nico IA
        </h1>
        <p className="text-muted-foreground">Análise inteligente e insights sobre sua operação.</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-md border-primary/10">
        <CardHeader className="bg-muted/30 border-b py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              Nico IA - Contexto: {user?.role || 'Global'}
            </CardTitle>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-6 pb-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                <Avatar
                  className={`w-8 h-8 mt-1 border shadow-sm ${msg.role === 'assistant' ? 'bg-primary text-primary-foreground' : ''}`}
                >
                  {msg.role === 'assistant' ? (
                    <>
                      <AvatarImage src={nicoImg} alt="Nico IA" />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </>
                  ) : (
                    <>
                      <AvatarImage
                        src={`https://img.usecurling.com/ppl/thumbnail?gender=male&seed=${user?.id}`}
                      />
                      <AvatarFallback>
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>

                <div
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted rounded-tl-sm border'
                  }`}
                >
                  <div
                    dangerouslySetInnerHTML={{
                      __html: msg.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br />'),
                    }}
                  />
                </div>
              </div>
            ))}
            {isTyping && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-4 max-w-[85%]">
                <Avatar className="w-8 h-8 mt-1 border shadow-sm bg-primary text-primary-foreground">
                  <AvatarImage src={nicoImg} alt="Nico IA" />
                  <AvatarFallback>
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="rounded-2xl px-4 py-3 bg-muted rounded-tl-sm border flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <CardFooter className="p-3 bg-muted/30 border-t">
          <form onSubmit={handleSend} className="flex w-full items-center space-x-2">
            <Input
              type="text"
              placeholder="Pergunte sobre metas, mix ou performance..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-background"
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isTyping}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Enviar</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  )
}
