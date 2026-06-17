import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { softwareApi, type SoftwareItem } from '@/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { ConfirmDialog } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'

const brandOptions = [
  { value: 'siemens', label: '西门子' },
  { value: 'mitsubishi', label: '三菱' },
  { value: 'omron', label: '欧姆龙' },
  { value: 'keyence', label: '基恩士' },
  { value: 'inovance', label: '汇川' },
]

const categoryOptions = [
  { value: 'plc-ide', label: 'PLC 编程软件' },
  { value: 'hmi-ide', label: 'HMI 编程软件' },
  { value: 'plc-driver', label: '驱动软件' },
  { value: 'utility', label: '调试工具' },
  { value: 'firmware', label: '固件升级' },
  { value: 'other', label: '其他' },
]

const displayName = (item: SoftwareItem) => item.original_name ?? item.name ?? item.filename ?? `软件 #${item.id}`

export function SoftwareList() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [keyword, setKeyword] = useState('')
  const [deleting, setDeleting] = useState<SoftwareItem | null>(null)
  const params = useMemo(() => ({ page, size: 10, brand: brand || undefined, category: category || undefined, keyword: keyword || undefined }), [brand, category, keyword, page])
  const query = useQuery({ queryKey: ['software', params], queryFn: () => softwareApi.list(params) })
  const deleteMutation = useMutation({ mutationFn: softwareApi.delete, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['software'] }) })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div><CardTitle>软件管理</CardTitle><CardDescription>按品牌、分类和关键词筛选软件包，支持上传和删除。</CardDescription></div>
          <Button asChild><Link to="/software/upload">上传软件</Link></Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <Select placeholder="全部品牌" options={brandOptions} value={brand} onChange={(event) => { setBrand(event.target.value); setPage(1) }} />
            <Select placeholder="全部分类" options={categoryOptions} value={category} onChange={(event) => { setCategory(event.target.value); setPage(1) }} />
            <Input placeholder="关键词" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1) }} />
            <Button variant="outline" onClick={() => void query.refetch()}>查询</Button>
          </div>
          {query.isLoading ? <div className="text-muted-foreground">正在加载软件...</div> : null}
          {query.isError ? <div className="text-destructive">软件列表加载失败</div> : null}
          {!query.isLoading && !query.isError && query.data?.items.length === 0 ? <div className="text-muted-foreground">暂无软件</div> : null}
          {query.data && query.data.items.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>名称</TableHead><TableHead>品牌</TableHead><TableHead>分类</TableHead><TableHead>版本</TableHead><TableHead>下载次数</TableHead><TableHead>状态</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
              <TableBody>
                {query.data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{displayName(item)}</TableCell>
                    <TableCell>{item.brand}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.latest_version ?? item.version ?? '-'}</TableCell>
                    <TableCell>{item.download_count ?? 0}</TableCell>
                    <TableCell>{item.is_active === false ? '下架' : '上架'}</TableCell>
                    <TableCell><Button size="sm" variant="destructive" onClick={() => setDeleting(item)}>删除</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
          {query.data ? <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span>共 {query.data.total} 条</span><div className="space-x-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button><Button size="sm" variant="outline" disabled={page * 10 >= query.data.total} onClick={() => setPage(page + 1)}>下一页</Button></div></div> : null}
        </CardContent>
      </Card>
      <ConfirmDialog open={deleting !== null} title="确认删除软件？" description={deleting ? displayName(deleting) : undefined} onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) deleteMutation.mutate(deleting.id); setDeleting(null) }} />
    </div>
  )
}
