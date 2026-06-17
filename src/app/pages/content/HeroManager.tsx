import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { portalApi, type PortalHero } from '@/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'

const defaultHero: PortalHero = { title: '', subtitle: '', cta_text: '', cta_link: '', background: '' }

export function HeroManager() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['portal', 'hero'], queryFn: portalApi.getHero })
  const [form, setForm] = useState<PortalHero>(defaultHero)

  useEffect(() => {
    if (query.data) setForm(query.data)
  }, [query.data])

  const mutation = useMutation({
    mutationFn: portalApi.updateHero,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal', 'hero'] }),
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate(form)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero 配置</CardTitle>
        <CardDescription>编辑官网首页主标题、副标题、按钮和背景样式。</CardDescription>
      </CardHeader>
      <CardContent>
        {query.isLoading ? <div className="text-muted-foreground">正在加载配置...</div> : null}
        {query.isError ? <div className="text-destructive">Hero 配置加载失败，可直接保存覆盖。</div> : null}
        <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
          <label className="space-y-2">主标题<Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label className="space-y-2">副标题<Input value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} /></label>
          <label className="space-y-2">按钮文案<Input value={form.cta_text} onChange={(event) => setForm({ ...form, cta_text: event.target.value })} /></label>
          <label className="space-y-2">按钮链接<Input value={form.cta_link ?? ''} onChange={(event) => setForm({ ...form, cta_link: event.target.value })} /></label>
          <label className="space-y-2">背景样式<Input value={form.background ?? ''} onChange={(event) => setForm({ ...form, background: event.target.value })} /></label>
          {mutation.isError ? <div className="text-sm text-destructive">保存失败</div> : null}
          {mutation.isSuccess ? <div className="text-sm text-emerald-700">保存成功</div> : null}
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? '保存中...' : '保存配置'}</Button>
        </form>
      </CardContent>
    </Card>
  )
}
