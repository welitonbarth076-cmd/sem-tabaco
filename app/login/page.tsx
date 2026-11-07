'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [modo, setModo] = useState<'login' | 'cadastro'>('login')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function enviarFormulario(e: React.FormEvent) {
    e.preventDefault()
    setMensagem('')
    setCarregando(true)

    try {
      if (modo === 'cadastro') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: {
              display_name: nome,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        })

        if (error) throw error

        if (data.session) {
          router.push('/')
          router.refresh()
        } else {
          setMensagem('Cadastro realizado! Confira seu e-mail para confirmar a conta.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        })

        if (error) throw error

        router.push('/')
        router.refresh()
      }
    } catch (error) {
      setMensagem(
        error instanceof Error ? error.message : 'Ocorreu um erro inesperado.'
      )
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 px-5 py-10 text-white">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            SEM <span className="text-emerald-400">TABACO</span>
          </h1>
          <p className="mt-3 text-sm text-gray-400">
            {modo === 'login'
              ? 'Entre na sua conta para continuar.'
              : 'Crie sua conta para começar sua jornada.'}
          </p>
        </div>

        <form onSubmit={enviarFormulario} className="space-y-5">
          {modo === 'cadastro' && (
            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Nome
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 outline-none focus:border-emerald-400"
                placeholder="Seu nome"
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 outline-none focus:border-emerald-400"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={8}
              autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 outline-none focus:border-emerald-400"
              placeholder="Mínimo de 8 caracteres"
            />
          </div>

          {mensagem && (
            <div
              role="status"
              className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm text-gray-200"
            >
              {mensagem}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-gray-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {carregando
              ? 'Aguarde...'
              : modo === 'login'
                ? 'Entrar'
                : 'Criar conta'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          {modo === 'login' ? 'Ainda não tem conta?' : 'Já possui uma conta?'}
          <button
            type="button"
            onClick={() => {
              setModo(modo === 'login' ? 'cadastro' : 'login')
              setMensagem('')
            }}
            className="ml-2 font-semibold text-emerald-400 hover:text-emerald-300"
          >
            {modo === 'login' ? 'Cadastre-se' : 'Fazer login'}
          </button>
        </div>
      </div>
    </main>
  )
}