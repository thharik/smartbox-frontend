# Tvxbox — Guia completo de deploy
# Do zero até o app no ar com domínio próprio

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RESUMO DOS CUSTOS (1TB de vídeo/PDF)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Domínio (.com.br)      R$ 40/ano    (~R$ 3/mês)
  Backblaze B2 (1TB)     ~$6/mês      (~R$ 30/mês)
  Railway (backend)      $0–5/mês     (~R$ 0–25/mês)
  Vercel (frontend)      Grátis
  Cloudflare (CDN+DNS)   Grátis
  ─────────────────────────────────────────────
  TOTAL                  ~R$ 33–58/mês

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PASSO 1 — DOMÍNIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Acesse registro.br (para .com.br) ou namecheap.com (para .com)
2. Pesquise "tvxbox" ou o nome que quiser
3. Compre e anote os dados de acesso ao painel DNS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PASSO 2 — CLOUDFLARE (CDN + DNS grátis)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O Cloudflare fica "na frente" de tudo. Ele:
  - Serve os vídeos/PDFs do B2 SEM cobrar banda de saída
  - Protege contra ataques
  - Deixa o site mais rápido

1. Crie conta em cloudflare.com (grátis)
2. Clique "Add a Site" → digite seu domínio
3. Escolha plano "Free"
4. Cloudflare mostra 2 nameservers (ex: ada.ns.cloudflare.com)
5. No painel do registro.br/Namecheap, troque os nameservers
   para os do Cloudflare
6. Aguarde até 24h para propagar (geralmente 30 min)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PASSO 3 — BACKBLAZE B2 (storage dos vídeos e PDFs)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3.1 Criar conta e bucket
  1. Acesse backblaze.com → crie conta grátis
  2. Vá em "B2 Cloud Storage" → "Create a Bucket"
  3. Nome do bucket: tvxbox-videos
  4. Files in Bucket: Public  ← IMPORTANTE
  5. Clique "Create Bucket"

3.2 Obter chave de acesso
  1. Vá em "App Keys" → "Add a New Application Key"
  2. Nome: tvxbox-upload
  3. Bucket: tvxbox-videos
  4. Permissions: Read and Write
  5. SALVE o keyID e a applicationKey (aparecem uma única vez!)

3.3 Organização das pastas no bucket
  Sugerido:
    videos/        ← arquivos .mp4 (séries, filmes, animes, aulas)
    mangas/        ← arquivos .pdf dos capítulos de mangá

3.4 Subir vídeos
  # Instale o b2-tools:
  pip install b2

  # Autentique:
  b2 authorize-account SEU_KEY_ID SUA_APPLICATION_KEY

  # Suba uma pasta inteira:
  b2 sync ./videos  b2://tvxbox-videos/videos
  b2 sync ./mangas  b2://tvxbox-videos/mangas

  OU use o script incluído:
  node upload-videos.js ./videos

3.5 Conectar Cloudflare ao B2 (elimina custo de banda)
  1. No Cloudflare, vá em DNS → Add Record
  2. Type: CNAME
     Name: videos
     Target: f005.backblazeb2.com   ← substitua pelo endpoint do seu bucket
     Proxy: Ligado (nuvem laranja)
  3. Salvar

  Agora seus vídeos e PDFs ficam acessíveis em:
  https://videos.tvxbox.com.br/file/tvxbox-videos/videos/mario.mp4
  https://videos.tvxbox.com.br/file/tvxbox-videos/mangas/one-piece/001.pdf

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PASSO 4 — RAILWAY (backend + PostgreSQL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4.1 Criar projeto
  1. Acesse railway.app → faça login com GitHub
  2. "New Project" → "Empty Project"
  3. Clique "+" → "Database" → "PostgreSQL"
  4. Clique "+" → "GitHub Repo" → selecione seu repositório

4.2 Configurar variáveis de ambiente
  No Railway, clique no serviço Node.js → "Variables":

  DB_HOST         = (copie do PostgreSQL do Railway)
  DB_PORT         = 5432
  DB_USER         = (copie do PostgreSQL do Railway)
  DB_PASSWORD     = (copie do PostgreSQL do Railway)
  DB_NAME         = (copie do PostgreSQL do Railway)
  JWT_SECRET      = (gere com: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
  NODE_ENV        = production
  FRONTEND_URL    = https://tvxbox.com.br
  B2_KEY_ID       = (sua chave do Backblaze)
  B2_APPLICATION_KEY = (sua chave do Backblaze)
  B2_BUCKET_NAME  = tvxbox-videos

4.3 Inicializar o banco (primeira vez)
  No seu terminal local, com as variáveis preenchidas no .env:

  node initDb.js             ← banco novo (cria tudo)
  node initDb.js --migrar    ← banco existente (só adiciona o que falta)

4.4 Cadastrar conteúdos
  Edite cadastrar-conteudo.js com seus filmes/séries/animes/aulas
  e então rode:

  node cadastrar-conteudo.js

4.5 Deploy
  Railway detecta o package.json e faz deploy automático.
  Cada push no GitHub redeploya sozinho.

  Seu backend ficará em: https://tvxbox-XXXXX.up.railway.app

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PASSO 5 — VERCEL (frontend)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5.1 Deploy
  1. Acesse vercel.com → login com GitHub
  2. "New Project" → selecione seu repositório
  3. Root Directory: frontend
  4. Framework: Other
  5. "Deploy"

5.2 Domínio personalizado
  Settings → Domains → Add: tvxbox.com.br

  No Cloudflare, DNS:
  Type: CNAME | Name: @ | Target: cname.vercel-dns.com | Proxy: OFF
  Type: CNAME | Name: www | Target: cname.vercel-dns.com | Proxy: OFF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PASSO 6 — ATUALIZAR script.js PARA PRODUÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No frontend/script.js, linha do const API:

  // Produção:
  const API = "https://api.tvxbox.com.br";
  // ou diretamente o Railway:
  const API = "https://tvxbox-XXXXX.up.railway.app";

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 PASSO 7 — ADICIONAR MANGÁS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Suba os PDFs para o B2 na pasta mangas/:
   b2 sync ./mangas b2://tvxbox-videos/mangas

2. Cadastre o mangá no banco:
   No cadastrar-conteudo.js, adicione um item com tipo: "Manga"
   e sem episódios (episodios: [])

3. Cadastre os capítulos usando a rota do back-end:
   POST /mangas/capitulo
   {
     "id": "one-piece-cap-1",
     "conteudoId": "one-piece-manga",
     "numero": 1,
     "titulo": "Romance Dawn",
     "pdfUrl": "mangas/one-piece/001.pdf",
     "paginas": 53
   }

   O front-end monta a URL completa como: /video/pdf/mangas/one-piece/001.pdf

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ESTRUTURA FINAL DE ARQUIVOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

tvxbox/
├── server.js
├── package.json
├── initDb.js              ← inicializa o banco
├── cadastrar-conteudo.js  ← cadastra filmes, séries, animes, aulas
├── upload-videos.js       ← faz upload de vídeos e PDFs pro B2
├── .env                   ← NÃO suba pro GitHub!
├── .gitignore
├── backend/
│   ├── db/
│   │   ├── pool.js
│   │   └── schema.sql
│   ├── middleware/
│   │   └── auth.js
│   └── routes/
│       ├── auth.js
│       ├── perfis.js
│       ├── catalogo.js    ← tipos: Filme|Série|Anime|AoVivo|Manga|Aula
│       ├── progresso.js
│       ├── favoritos.js
│       ├── mangas.js      ← NOVO: capítulos + progresso de leitura
│       └── video.js       ← serve vídeos e PDFs do B2
└── frontend/
    ├── index.html
    ├── assistir.html      ← tela cheia automática ao dar play
    ├── detalhe.html
    ├── ao-vivo.html
    ├── mangas.html        ← NOVO: página de mangás com leitor PDF
    ├── aulas.html         ← NOVO: página de cursos/aulas
    ├── login.html         ← preview animada de posters no fundo
    ├── cadastro.html
    ├── script.js
    ├── style.css
    ├── data.js
    └── pwa/
        ├── manifest.json
        ├── service-worker.js
        ├── register-sw.js
        ├── icon-192.png
        └── icon-512.png

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 CHECKLIST ANTES DE LANÇAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] Domínio registrado e apontando pro Cloudflare
[ ] Bucket B2 criado como Public
[ ] Vídeos enviados pro B2 (pasta videos/)
[ ] PDFs de mangá enviados pro B2 (pasta mangas/)
[ ] CNAME "videos" configurado no Cloudflare → B2
[ ] Railway com PostgreSQL criado
[ ] Variáveis de ambiente preenchidas no Railway
[ ] node initDb.js rodado (tabelas criadas)
[ ] node cadastrar-conteudo.js rodado (conteúdos inseridos)
[ ] const API no script.js apontando pro Railway/domínio
[ ] Testar login, favoritos e "continuar assistindo"
[ ] Testar leitor de mangá (PDF abrindo no overlay)
[ ] Testar tela cheia automática no player de vídeo
[ ] Ícones icon-192.png e icon-512.png criados
[ ] Testar instalação como PWA no celular e na TV
