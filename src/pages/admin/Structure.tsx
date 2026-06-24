import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FolderTree, ChevronRight, MapPin, Users as UsersIcon } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'

export default function Structure() {
  const [distritos, setDistritos] = useState<any[]>([])
  const [regionais, setRegionais] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [vendedores, setVendedores] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      pb.collection('districts').getFullList(),
      pb.collection('regionals').getFullList(),
      pb.collection('areas').getFullList(),
      pb.collection('users').getFullList({ filter: 'role = "Seller"' }),
    ])
      .then(([d, r, a, v]) => {
        setDistritos(d)
        setRegionais(r)
        setAreas(a)
        setVendedores(v)
      })
      .catch(console.error)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Estrutura Hierárquica</h1>
          <p className="text-muted-foreground">
            Gerencie Distritos, Regionais, Áreas e Vendedores.
          </p>
        </div>
        <Button variant="outline">Adicionar Nível</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="w-5 h-5" />
              Árvore da Organização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {distritos.map((distrito) => {
                const regs = regionais.filter((r) => r.district_id === distrito.id)
                return (
                  <AccordionItem value={distrito.id} key={distrito.id} className="border-b-0 mb-2">
                    <AccordionTrigger className="hover:bg-muted/50 rounded-lg px-4 border">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{distrito.name}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {regs.length} Regionais
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-0 pl-6">
                      <Accordion type="multiple" className="w-full border-l-2 ml-2 pl-4">
                        {regs.map((regional) => {
                          const ars = areas.filter((a) => a.regional_id === regional.id)
                          return (
                            <AccordionItem
                              value={regional.id}
                              key={regional.id}
                              className="border-b-0 mb-1"
                            >
                              <AccordionTrigger className="hover:bg-muted/50 rounded-lg px-3 py-2 border border-dashed">
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium">{regional.name}</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2 pb-2 pl-6">
                                <div className="space-y-2 border-l ml-2 pl-4">
                                  {ars.map((area) => {
                                    const vends = vendedores.filter((v) => v.area_id === area.id)
                                    return (
                                      <div
                                        key={area.id}
                                        className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30"
                                      >
                                        <div className="flex items-center gap-2">
                                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                          <span>{area.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <UsersIcon className="w-3 h-3" />
                                          {vends.length} Vendedor(es)
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )
                        })}
                      </Accordion>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Nível</CardTitle>
            <CardDescription>Selecione um item na árvore para ver detalhes.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-center text-muted-foreground py-12">
            Nenhum item selecionado.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
