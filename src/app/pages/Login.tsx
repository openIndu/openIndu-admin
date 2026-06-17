import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { ShieldCheck } from 'lucide-react'
import { authApi } from '@/api'
import { useAuth } from '@/store/auth'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'

export function Login() {
  const navigate = useNavigate()
  const { loginWithResponse, isAuthenticated } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (countdown <= 0) return undefined
    const timer = window.setInterval(() => setCountdown((value) => Math.max(value - 1, 0)), 1_000)
    return () => window.clearInterval(timer)
  }, [countdown])

  const isValidPhone = /^1\d{10}$/.test(phone)
  const isValidCode = /^\d{6}$/.test(code)

  const handleSendCode = async () => {
    if (!isValidPhone) {
      setError('请输入 11 位中国大陆手机号')
      return
    }
    setIsSending(true)
    setError(null)
    setMessage(null)
    try {
      await authApi.sendCode(phone)
      setCountdown(60)
      setMessage('验证码已发送，请查收短信')
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证码发送失败')
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isValidPhone || !isValidCode) {
      setError('请输入正确的手机号和 6 位验证码')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const response = mode === 'login' ? await authApi.login(phone, code) : await authApi.register(phone, code)
      await loginWithResponse(response)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请检查验证码')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle>openIndu 社区管理平台</CardTitle>
          <CardDescription>{mode === 'login' ? '手机号验证码登录' : '手机号验证码注册'}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="phone">手机号</label>
              <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={11} placeholder="请输入 11 位手机号" inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <label htmlFor="code">验证码</label>
              <div className="flex gap-2">
                <Input id="code" value={code} onChange={(event) => setCode(event.target.value)} maxLength={6} placeholder="6 位验证码" inputMode="numeric" />
                <Button type="button" variant="outline" className="shrink-0" disabled={countdown > 0 || isSending} onClick={() => void handleSendCode()}>
                  {countdown > 0 ? `${countdown}s` : '发送验证码'}
                </Button>
              </div>
            </div>
            {error ? <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}
            {message ? <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? '处理中...' : mode === 'login' ? '登录' : '注册'}</Button>
          </form>
          <Button type="button" variant="link" className="mt-4 w-full" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? '没有账号？切换到注册' : '已有账号？切换到登录'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
