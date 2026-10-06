import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// As páginas de texto moram em pages/, mas o endereço não leva "pages": /privacidade/, /termos/ etc.
const pages = ['privacidade', 'termos', 'excluir-conta']

function pagesFolder() {
  return {
    name: 'pages-folder',
    enforce: 'post',

    // No servidor local: /privacidade/ abre pages/privacidade/index.html.
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [, slug, query = ''] = req.url.match(/^\/([^/?#]+)\/?(\?.*)?$/) || []
        if (pages.includes(slug)) req.url = `/pages/${slug}/index.html${query}`
        next()
      })
    },

    // No build: o HTML sai em dist/privacidade/, sem a pasta pages no caminho.
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.fileName.startsWith('pages/')) file.fileName = file.fileName.slice('pages/'.length)
      }
    },
  }
}

export default defineConfig({
  plugins: [pagesFolder()],
  build: {
    rollupOptions: {
      input: ['index.html', ...pages.map((slug) => `pages/${slug}/index.html`)].map((path) =>
        resolve(import.meta.dirname, path),
      ),
    },
  },
})
