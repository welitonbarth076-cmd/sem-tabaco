import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SEM TABACO',
    short_name: 'SEM TABACO',
    description: 'Seu assistente pessoal para parar de fumar.',
    start_url: '/',
    display: 'standalone', // Abre em tela cheia, sem barra de navegação
    orientation: 'portrait', // Trava na vertical
    background_color: '#020617', // Cor de fundo (slate-950)
    theme_color: '#10b981', // Cor do tema (emerald-500)
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any', // Ícone adaptável (não corta)
      },
    ],
  }
}