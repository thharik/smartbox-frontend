/*
  auth.js — cuida do login e cadastro
  Chama o backend (server.js) nas rotas /auth/login e /auth/register
*/

const loginForm    = document.getElementById("loginForm");
const cadastroForm = document.getElementById("cadastroForm");

const API = "https://smartbox-backend.onrender.com";

// Depois de logar (ou cadastrar), verifica se a conta já tem assinatura
// ativa — se tiver, entra direto no app; se não, manda pra tela de
// especificações + pagamento (planos.html), sem passar pelo catálogo
// primeiro (evita o "vai pro index e volta com erro 402").
async function irParaDestinoCerto(token) {
  try {
    const r = await fetch(`${API}/assinatura/status`, {
      headers: { "Authorization": "Bearer " + token },
    });
    const dados = await r.json();
    window.location.href = dados.ativa ? "index.html" : "planos.html";
  } catch {
    // Se a checagem falhar por qualquer motivo, não trava a pessoa —
    // manda pro index.html normalmente (o catálogo mesmo cuida do bloqueio).
    window.location.href = "index.html";
  }
}

// Login
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const senha = document.getElementById("loginSenha").value;
    const msg   = document.getElementById("loginMensagem");

    msg.textContent = "Entrando...";

    try {
      const r = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const dados = await r.json();

      if (!r.ok) {
        msg.textContent = dados.mensagem || "Erro ao fazer login";
        return;
      }

      localStorage.setItem("sb_token", JSON.stringify(dados.token));
      localStorage.setItem("usuarioEmail", dados.email);

      msg.textContent = "Entrando...";
      await irParaDestinoCerto(dados.token);
    } catch {
      msg.textContent = "Erro de conexão. Verifique se o servidor está rodando.";
    }
  });
}

// Cadastro
if (cadastroForm) {
  cadastroForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("cadastroEmail").value;
    const senha = document.getElementById("cadastroSenha").value;
    const msg   = document.getElementById("cadastroMensagem");

    msg.textContent = "Criando conta...";

    try {
      const r = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const dados = await r.json();

      if (!r.ok) {
        msg.textContent = dados.mensagem || "Erro ao cadastrar";
        return;
      }

      // ✅ O /register agora já devolve um token — loga automaticamente,
      // sem pedir pra pessoa digitar a senha de novo numa segunda tela.
      // Conta recém-criada nunca tem assinatura ainda, mas mantém a mesma
      // função de roteamento por consistência (e por segurança, caso o
      // e-mail já tivesse assinatura de uma conta duplicada no passado).
      if (dados.token) {
        localStorage.setItem("sb_token", JSON.stringify(dados.token));
        localStorage.setItem("usuarioEmail", dados.email);

        msg.textContent = "Conta criada! Redirecionando...";
        await irParaDestinoCerto(dados.token);
      } else {
        // fallback, caso o backend antigo (sem token) ainda esteja no ar
        msg.textContent = "Conta criada! Redirecionando...";
        setTimeout(() => { window.location.href = "login.html"; }, 800);
      }
    } catch {
      msg.textContent = "Erro de conexão. Verifique se o servidor está rodando.";
    }
  });
}