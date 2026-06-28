import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Bot, Send, Sparkles, User, Target, ListChecks } from 'lucide-react'
import { streamAgentChat } from '@/lib/skipAi'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

const mascotUrl = 'https://img.usecurling.com/p/200/200?q=professional%20robot%20assistant'

const STEPS = [
  'Identificação de Contexto',
  'Dados Hierárquicos',
  'Período e Métrica',
  'Dados Operacionais',
  'Metas Financeiras',
  'Validação Completa',
  'Confirmação Final',
]

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function GoalSkip() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Olá! Sou o **GoalSkip**, seu assistente especializado em lançamento de metas comerciais. Vou guiá-lo passo a passo para garantir que sua meta esteja completa e validada.\n\nEm qual nível hierárquico deseja lançar a meta? (**Brasil**, **Regional**, **Distrital**, **KAM** ou **Vendedor**)',
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
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/ask-goalskip-stream`,
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
          content: 'Desculpe, ocorreu um erro de conexão. Tente novamente.',
        },
      ])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] max-w-6xl mx-auto flex gap-4">
      <div className="hidden lg:flex flex-col w-64 shrink-0">
        <Card className="flex-1 shadow-sm border-primary/10">
          <CardHeader className="bg-muted/30 border-b py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-accent" />
              Fluxo de Lançamento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-1">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-muted/40 transition-colors"
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-xs text-muted-foreground leading-tight">{step}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-4">
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Target className="w-8 h-8 text-accent" />
            GoalSkip
          </h1>
          <p className="text-muted-foreground">
            Assistente especializado em lançamento e gestão de metas comerciais.
          </p>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden shadow-md border-primary/10">
          <CardHeader className="bg-muted/30 border-b py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              GoalSkip — Contexto: {user?.role || 'Global'}
            </CardTitle>
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
                    className={`w-8 h-8 mt-1 border shadow-sm shrink-0 ${msg.role === 'assistant' ? 'bg-primary text-primary-foreground' : ''}`}
                  >
                    {msg.role === 'assistant' ? (
                      <>
                        <AvatarImage src={mascotUrl} alt="GoalSkip" />
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
                          .replace(
                            /```([\s\S]*?)```/g,
                            '<pre class="bg-background/50 p-2 rounded text-xs overflow-x-auto mt-1">$1</pre>',
                          )
                          .replace(/\n/g, '<br />'),
                      }}
                    />
                  </div>
                </div>
              ))}
              {isTyping && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-4 max-w-[85%]">
                  <Avatar className="w-8 h-8 mt-1 border shadow-sm bg-primary text-primary-foreground shrink-0">
                    <AvatarImage src={mascotUrl} alt="GoalSkip" />
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
                placeholder="Digite sua resposta..."
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
    </div>
  )
}
