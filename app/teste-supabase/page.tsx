'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TesteSupabase() {
  const [resultado, setResultado] = useState('')

  async function testarConexao() {
    const { error } = await supabase
      .from('connection_test')
      .insert({ message: 'Conexão SEM TABACO funcionando!' })

    if (error) {
      setResultado('Erro: ' + error.message)
    } else {
      setResultado('Conexão funcionando! Registro salvo no Supabase.')
    }
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Teste de conexão SEM TABACO</h1>

      <button onClick={testarConexao}>
        Testar conexão
      </button>

      <p>{resultado}</p>
    </main>
  )
}