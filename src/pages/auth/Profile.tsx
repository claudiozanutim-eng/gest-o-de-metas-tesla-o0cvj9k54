import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage, extractFieldErrors } from '@/lib/pocketbase/errors'
import { Camera, Save, KeyRound, Shield, MapPin, Loader2, User } from 'lucide-react'

export default function Profile() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [profileData, setProfileData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [savingProfile, setSavingProfile] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    password: '',
    passwordConfirm: '',
  })
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return
      try {
        const data = await pb.collection('users').getOne(user.id, {
          expand: 'district_id,regional_id,area_id',
        })
        setProfileData(data)
        setName(data.name || '')
        if (data.avatar) {
          setAvatarPreview(pb.files.getUrl(data, data.avatar, { thumb: '100x100' }))
        }
      } catch (error) {
        toast({
          title: 'Erro ao carregar perfil',
          description: getErrorMessage(error),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [user?.id, toast])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      if (file.size > 5242880) {
        // 5MB limit
        toast({
          title: 'Erro',
          description: 'A imagem deve ter no máximo 5MB.',
          variant: 'destructive',
        })
        return
      }
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSaveProfile = async () => {
    if (!user?.id) return
    if (!name.trim()) {
      setFieldErrors({ name: 'O nome não pode estar vazio.' })
      return
    }

    setSavingProfile(true)
    setFieldErrors({})
    try {
      const formData = new FormData()
      formData.append('name', name)
      if (avatarFile) {
        formData.append('avatar', avatarFile)
      }

      const updated = await pb.collection('users').update(user.id, formData)
      setProfileData((prev: any) => ({ ...prev, name: updated.name, avatar: updated.avatar }))
      pb.authStore.save(pb.authStore.token, updated)
      toast({ title: 'Sucesso', description: 'Perfil atualizado com sucesso.' })
    } catch (error) {
      setFieldErrors(extractFieldErrors(error))
      toast({
        title: 'Erro ao salvar perfil',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSavePassword = async () => {
    if (!user?.id) return

    const errors: Record<string, string> = {}
    if (!passwordData.oldPassword) errors.oldPassword = 'A senha atual é obrigatória.'
    if (!passwordData.password) errors.password = 'A nova senha é obrigatória.'
    if (passwordData.password && passwordData.password.length < 8)
      errors.password = 'A senha deve ter no mínimo 8 caracteres.'
    if (passwordData.password !== passwordData.passwordConfirm)
      errors.passwordConfirm = 'As senhas não coincidem.'

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      return
    }

    setSavingPassword(true)
    setPasswordErrors({})
    try {
      await pb.collection('users').update(user.id, {
        oldPassword: passwordData.oldPassword,
        password: passwordData.password,
        passwordConfirm: passwordData.passwordConfirm,
      })
      setPasswordData({ oldPassword: '', password: '', passwordConfirm: '' })
      toast({ title: 'Sucesso', description: 'Senha atualizada com sucesso.' })
    } catch (error) {
      setPasswordErrors(extractFieldErrors(error))
      toast({
        title: 'Erro ao alterar senha',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Minha Conta</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize seu nome e foto de perfil.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-muted bg-muted flex items-center justify-center">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Camera className="w-4 h-4 mr-2" />
                    Alterar Foto
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                  {fieldErrors.avatar && (
                    <span className="text-xs text-red-500">{fieldErrors.avatar}</span>
                  )}
                </div>

                <div className="flex-1 space-y-4 w-full">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                    />
                    {fieldErrors.name && (
                      <span className="text-xs text-red-500">{fieldErrors.name}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profileData?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      O email de acesso não pode ser alterado.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end border-t pt-4">
                <Button onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Perfil
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Para sua segurança, informe a senha atual para alterá-la. A nova senha deve ter no
                mínimo 8 caracteres.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="oldPassword">Senha Atual</Label>
                <Input
                  id="oldPassword"
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, oldPassword: e.target.value })
                  }
                />
                {passwordErrors.oldPassword && (
                  <span className="text-xs text-red-500">{passwordErrors.oldPassword}</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nova Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={passwordData.password}
                    onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                  />
                  {passwordErrors.password && (
                    <span className="text-xs text-red-500">{passwordErrors.password}</span>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm">Confirmar Nova Senha</Label>
                  <Input
                    id="passwordConfirm"
                    type="password"
                    value={passwordData.passwordConfirm}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, passwordConfirm: e.target.value })
                    }
                  />
                  {passwordErrors.passwordConfirm && (
                    <span className="text-xs text-red-500">{passwordErrors.passwordConfirm}</span>
                  )}
                </div>
              </div>
              <div className="flex justify-end border-t pt-4 mt-2">
                <Button
                  variant="secondary"
                  onClick={handleSavePassword}
                  disabled={savingPassword || !passwordData.oldPassword || !passwordData.password}
                >
                  {savingPassword ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4 mr-2" />
                  )}
                  Atualizar Senha
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-primary" /> Nível de Acesso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-primary/10 rounded-md border border-primary/20">
                  <p className="text-sm font-semibold text-primary">{profileData?.role}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Para alterar seu cargo, entre em contato com o administrador do sistema.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5 text-primary" /> Escopo de Atuação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profileData?.expand?.district_id && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Distrito
                    </Label>
                    <p className="text-sm font-medium">{profileData.expand.district_id.name}</p>
                  </div>
                )}
                {profileData?.expand?.regional_id && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Regional
                    </Label>
                    <p className="text-sm font-medium">{profileData.expand.regional_id.name}</p>
                  </div>
                )}
                {profileData?.expand?.area_id && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Área
                    </Label>
                    <p className="text-sm font-medium">{profileData.expand.area_id.name}</p>
                  </div>
                )}
                {!profileData?.expand?.district_id &&
                  !profileData?.expand?.regional_id &&
                  !profileData?.expand?.area_id && (
                    <div className="p-3 bg-muted rounded-md border text-center">
                      <p className="text-sm text-muted-foreground italic">
                        Nenhum escopo específico atribuído (Nacional).
                      </p>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
