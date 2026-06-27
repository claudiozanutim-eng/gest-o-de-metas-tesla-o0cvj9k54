import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage, extractFieldErrors } from '@/lib/pocketbase/errors'
import logoUrl from '@/assets/image-247cf.png'

export default function ForcePasswordChange() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [oldPassword, setOldPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPassword) {
      toast({ title: 'Erro', description: 'A senha atual é obrigatória.', variant: 'destructive' })
      return
    }
    if (password !== confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' })
      return
    }
    if (password.length < 8) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter no mínimo 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      if (!user) throw new Error('Usuário não autenticado.')

      const updated = await pb.collection('users').update(user.id, {
        oldPassword: oldPassword,
        password: password,
        passwordConfirm: confirmPassword,
        force_password_change: false,
      })

      pb.authStore.save(pb.authStore.token, updated)

      toast({ title: 'Sucesso', description: 'Senha atualizada com sucesso!' })
      navigate('/', { replace: true })
    } catch (err: any) {
      const fieldErrors = extractFieldErrors(err)
      if (Object.keys(fieldErrors).length > 0) {
        const errorMessages = Object.entries(fieldErrors)
          .map(([field, msg]) => `${field} (${msg})`)
          .join(', ')

        toast({
          title: 'Erro de validação',
          description: `Ocorreu um erro com os campos: ${errorMessages}. Verifique os dados e tente novamente.`,
          variant: 'destructive',
        })
      } else {
        toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={logoUrl} alt="Tesla Mecatrônica" className="h-12 w-auto object-contain" />
          </div>
          <CardTitle className="text-xl font-bold">Definir Nova Senha</CardTitle>
          <CardDescription>
            Por motivos de segurança, você precisa definir uma nova senha antes de acessar o
            sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Senha Atual (Padrão)</Label>
              <Input
                id="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 pt-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar e Continuar'}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => signOut()}>
                Sair da Conta
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
