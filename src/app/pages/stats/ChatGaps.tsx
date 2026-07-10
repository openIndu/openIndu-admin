import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { statsApi, type KnowledgeGapItem } from '@/api'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Select } from '../../components/ui/select'
import { Tabs } from '../../components/ui/tabs'
import { ThumbsDown, AlertTriangle, MessageSquare } from 'lucide-react'

const PAGE_SIZE_OPTIONS = [10, 20, 50]

function GapRow({ item, showSnippet }: { item: KnowledgeGapItem; showSnippet?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const date = new Date(item.created_at).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
  return (
    <div className="border-b border-gray-100 py-3 last:border-0">
      <div className="flex items-start gap-2">
        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 break-words">
            {item.question ?? <span className="text-gray-400 italic">（无上下文）</span>}
          </p>
          {showSnippet && item.answer_snippet && (
            <div className="mt-1">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-blue-500 hover:underline"
              >
                {expanded ? '收起答案' : '查看答案片段'}
              </button>
              {expanded && (
                <p className="mt-1 text-xs text-gray-500 bg-gray-50 rounded p-2 break-words">
                  {item.answer_snippet}…
                </p>
              )}
            </div>
          )}
        </div>
        <span className="shrink-0 text-xs text-gray-400">{date}</span>
      </div>
    </div>
  )
}

function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: {
  page: number
  pageSize: number
  total: number
  onPageChange: (p: number) => void
  onPageSizeChange: (s: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="flex items-center justify-end gap-3 text-sm text-muted-foreground mt-3">
      <span>共 {total} 条</span>
      <Select
        className="w-24"
        options={PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: `${n} 条/页` }))}
        value={String(pageSize)}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
      />
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>上一页</Button>
      <span>{page} / {totalPages}</span>
      <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>下一页</Button>
    </div>
  )
}

export function ChatGaps() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [activeTab, setActiveTab] = useState('disliked')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['chat-knowledge-gaps'],
    queryFn: () => statsApi.chatKnowledgeGaps(),
    staleTime: 60_000,
  })

  const disliked = data?.disliked ?? []
  const fallbacks = data?.fallbacks ?? []
  const activeItems = activeTab === 'disliked' ? disliked : fallbacks
  const pagedItems = activeItems.slice((page - 1) * pageSize, page * pageSize)

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setPage(1)
  }

  const handlePageSizeChange = (s: number) => {
    setPageSize(s)
    setPage(1)
  }

  const dislikedContent = (
    <div>
      <Card>
        <CardContent className="pt-4">
          {isLoading && <p className="py-8 text-center text-sm text-gray-400">加载中…</p>}
          {!isLoading && disliked.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">暂无负面反馈，继续保持！</p>
          )}
          {pagedItems.map((item) => (
            <GapRow key={item.message_id} item={item} showSnippet />
          ))}
        </CardContent>
      </Card>
      {disliked.length > 0 && (
        <Pagination page={page} pageSize={pageSize} total={disliked.length} onPageChange={setPage} onPageSizeChange={handlePageSizeChange} />
      )}
      <p className="mt-2 text-xs text-gray-400">
        建议：针对上述提问补充相关文档，上传至后台"文档管理"并同步向量库。
      </p>
    </div>
  )

  const fallbackContent = (
    <div>
      <Card>
        <CardContent className="pt-4">
          {isLoading && <p className="py-8 text-center text-sm text-gray-400">加载中…</p>}
          {!isLoading && fallbacks.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">所有提问均命中知识库！</p>
          )}
          {pagedItems.map((item) => (
            <GapRow key={item.message_id} item={item} />
          ))}
        </CardContent>
      </Card>
      {fallbacks.length > 0 && (
        <Pagination page={page} pageSize={pageSize} total={fallbacks.length} onPageChange={setPage} onPageSizeChange={handlePageSizeChange} />
      )}
      <p className="mt-2 text-xs text-gray-400">
        建议：这些提问在知识库中未找到匹配文档（相似度低于阈值），优先补充对应品牌/分类的手册。
      </p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">知识盲区分析</h1>
        <p className="mt-1 text-sm text-gray-500">
          收集用户标记为"无帮助"的回答和 AI 无法从知识库中检索到答案的提问，帮助识别文档覆盖不足的领域。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ThumbsDown className="h-5 w-5 text-red-500" />
              <CardTitle className="text-base">负面反馈</CardTitle>
            </div>
            <CardDescription>用户点击"无帮助"的回答数量</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {isLoading ? '—' : disliked.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base">知识库未命中</CardTitle>
            </div>
            <CardDescription>AI 退回通用知识、未检索到文档的提问数量</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">
              {isLoading ? '—' : fallbacks.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          加载失败：{String(error)}
          <button type="button" className="ml-2 underline" onClick={() => void refetch()}>重试</button>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        items={[
          {
            value: 'disliked',
            label: `负面反馈${disliked.length > 0 ? ` (${disliked.length})` : ''}`,
            content: dislikedContent,
          },
          {
            value: 'fallbacks',
            label: `知识库未命中${fallbacks.length > 0 ? ` (${fallbacks.length})` : ''}`,
            content: fallbackContent,
          },
        ]}
      />
    </div>
  )
}
