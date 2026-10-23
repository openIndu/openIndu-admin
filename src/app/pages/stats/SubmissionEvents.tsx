import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'

const pageSize = 10
const actionLabels: Record<string, string> = {
  submitted: '上传投稿',
  version_added: '补传版本',
  withdrawn: '撤回投稿',
}

export function SubmissionEvents() {
  const [page, setPage] = useState(1)
  const [actorKeyword, setActorKeyword] = useState('')
  const [resourceType, setResourceType] = useState('')
  const [action, setAction] = useState('')
  const [filters, setFilters] = useState({ actorKeyword: '', resourceType: '', action: '' })
  const query = useQuery({
    queryKey: ['submission-events', page, filters],
    queryFn: () => adminApi.submissionEvents({
      page,
      page_size: pageSize,
      actor_keyword: filters.actorKeyword || undefined,
      resource_type: filters.resourceType || undefined,
      action: filters.action || undefined,
    }),
    retry: false,
  })
  const events = query.data?.items ?? []
  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const search = () => { setFilters({ actorKeyword, resourceType, action }); setPage(1) }

  return (
    <Card>
      <CardHeader>
        <CardTitle>投稿记录</CardTitle>
        <CardDescription>软件和文档的上传、补传版本与撤回记录。上线前的操作不会出现在此处。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-3">
          <Input
            placeholder="投稿人手机号"
            value={actorKeyword}
            onChange={(event) => setActorKeyword(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') search() }}
            className="w-44"
          />
          <Select
            options={[{ value: '', label: '全部类型' }, { value: 'software', label: '软件' }, { value: 'document', label: '文档' }]}
            value={resourceType}
            onChange={(event) => setResourceType(event.target.value)}
            className="w-32"
          />
          <Select
            options={[{ value: '', label: '全部操作' }, ...Object.entries(actionLabels).map(([value, label]) => ({ value, label }))]}
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className="w-36"
          />
          <Button variant="outline" onClick={search}>搜索</Button>
          <Button variant="outline" className="ml-auto" onClick={() => void query.refetch()}>刷新</Button>
        </div>
        {query.isLoading && <div className="py-4 text-muted-foreground">正在加载投稿记录...</div>}
        {query.isError && <div className="py-4 text-destructive">投稿记录加载失败，请检查后端服务。</div>}
        {query.isSuccess && events.length === 0 && <div className="py-8 text-center text-muted-foreground">暂无投稿记录</div>}
        {events.length > 0 && (
          <>
            <Table className="[&_td]:whitespace-nowrap">
              <TableHeader>
                <TableRow>
                  <TableHead>投稿人</TableHead>
                  <TableHead>资源类型</TableHead>
                  <TableHead>资源 ID</TableHead>
                  <TableHead>文件名</TableHead>
                  <TableHead>操作</TableHead>
                  <TableHead>版本</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{event.actor}</TableCell>
                    <TableCell>{event.resource_type === 'software' ? '软件' : '文档'}</TableCell>
                    <TableCell>{event.resource_id}</TableCell>
                    <TableCell className="max-w-xs truncate" title={event.resource_name}>{event.resource_name}</TableCell>
                    <TableCell>{actionLabels[event.action] ?? event.action}</TableCell>
                    <TableCell>{event.version || '-'}</TableCell>
                    <TableCell>{new Date(event.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>共 {total} 条，第 {page} / {totalPages} 页</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
