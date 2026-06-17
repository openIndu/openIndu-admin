import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { portalApi } from '@/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'

interface FooterData {
  contact_info?: Record<string, string>
  links?: Array<{ label: string; url: string }>
  [key: string]: unknown
}

export function FooterManager() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['portal', 'footer'], queryFn: () => portalApi.getFooter() as Promise<FooterData> })
  const [form, setForm] = useState<FooterData>({ contact_info: {}, links: [] })
  const [loaded, setLoaded] = useState(false)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['portal', 'footer'] })
  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => portalApi.updateFooter(payload),
    onSuccess: invalidate,
  })

  if (query.data && !loaded) {
    setForm({
      contact_info: (query.data.contact_info as Record<string, string>) ?? {},
      links: (query.data.links as Array<{ label: string; url: string }>) ?? [],
    })
    setLoaded(true)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    saveMutation.mutate(form as Record<string, unknown>)
  }

  const updateContactField = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      contact_info: { ...(prev.contact_info ?? {}), [key]: value },
    }))
  }

  const addLink = () => {
    setForm((prev) => ({
      ...prev,
      links: [...(prev.links ?? []), { label: '', url: '' }],
    }))
  }

  const updateLink = (index: number, field: 'label' | 'url', value: string) => {
    setForm((prev) => {
      const links = [...(prev.links ?? [])]
      links[index] = { ...links[index], [field]: value }
      return { ...prev, links }
    })
  }

  const removeLink = (index: number) => {
    setForm((prev) => ({
      ...prev,
      links: (prev.links ?? []).filter((_, i) => i !== index),
    }))
  }

  if (query.isLoading) return <div className="text-muted-foreground">正在加载...</div>
  if (query.isError) return <div className="text-destructive">页脚配置加载失败</div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>页脚配置</CardTitle>
          <CardDescription>编辑官网页脚的联系信息和链接列表。</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <h3 className="font-medium">联系信息</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">公司名称</label>
                  <Input
                    placeholder="公司名称"
                    value={form.contact_info?.company_name ?? ''}
                    onChange={(event) => updateContactField('company_name', event.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">电话</label>
                  <Input
                    placeholder="电话"
                    value={form.contact_info?.phone ?? ''}
                    onChange={(event) => updateContactField('phone', event.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">邮箱</label>
                  <Input
                    placeholder="邮箱"
                    value={form.contact_info?.email ?? ''}
                    onChange={(event) => updateContactField('email', event.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">地址</label>
                  <Input
                    placeholder="地址"
                    value={form.contact_info?.address ?? ''}
                    onChange={(event) => updateContactField('address', event.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground">版权信息</label>
                  <Input
                    placeholder="版权信息"
                    value={form.contact_info?.copyright ?? ''}
                    onChange={(event) => updateContactField('copyright', event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">链接列表</h3>
                <Button type="button" variant="outline" size="sm" onClick={addLink}>添加链接</Button>
              </div>
              {(form.links ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无链接</div>
              ) : (
                <div className="space-y-3">
                  {(form.links ?? []).map((link, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Input
                        placeholder="链接名称"
                        value={link.label}
                        onChange={(event) => updateLink(index, 'label', event.target.value)}
                      />
                      <Input
                        placeholder="链接地址"
                        value={link.url}
                        onChange={(event) => updateLink(index, 'url', event.target.value)}
                      />
                      <Button type="button" variant="destructive" size="sm" onClick={() => removeLink(index)}>删除</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? '保存中...' : '保存页脚配置'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
