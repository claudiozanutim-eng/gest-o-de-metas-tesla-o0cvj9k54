import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Bot, Send, Sparkles, User } from 'lucide-react'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function Assistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Olá! Sou o assistente de IA da Tesla Mecatrônica. Posso analisar os dados da sua regional, apontar áreas de risco ou sugerir ações para melhorar o mix de produtos. Como posso ajudar hoje?',
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim()) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    // Mock AI response
    setTimeout(() => {
      setIsTyping(false)
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Analisando os dados da **Regional Paraná**, notei que a **Área Ponta Grossa** está com 75% da meta (Categoria Base). Sugiro focar no mix da Família F2 (Robótica) nesta região, que apresenta a maior margem de crescimento histórico neste trimestre. Deseja que eu gere um relatório detalhado dessa área?`,
      }
      setMessages((prev) => [...prev, aiMsg])
    }, 1500)
  }

  return (
    <div className="h-[calc(100vh-8rem)] max-w-4xl mx-auto flex flex-col">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Bot className="w-8 h-8 text-accent" />
          Assistente IA
        </h1>
        <p className="text-muted-foreground">Análise inteligente e insights sobre sua operação.</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden shadow-md border-primary/10">
        <CardHeader className="bg-muted/30 border-b py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              Tesla IA - Contexto: Regional Paraná
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
                    <Bot className="w-4 h-4" />
                  ) : (
                    <>
                      <AvatarImage src="https://img.usecurling.com/ppl/thumbnail?gender=male&seed=1" />
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
                  {/* Basic markdown rendering simulation */}
                  <div
                    dangerouslySetInnerHTML={{
                      __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                    }}
                  />
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-4 max-w-[85%]">
                <Avatar className="w-8 h-8 mt-1 border shadow-sm bg-primary text-primary-foreground">
                  <Bot className="w-4 h-4" />
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
