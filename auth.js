/*
  auth.js — cuida do login e cadastro
  Chama o backend (server.js) nas rotas /auth/login e /auth/register
*/

const loginForm    = document.getElementById("loginForm");
const cadastroForm = document.getElementById("cadastroForm");

// Login
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const senha = document.getElementById("loginSenha").value;
    const msg   = document.getElementById("loginMensagem");

    msg.textContent = "Entrando...";

    try {
      const r = await fetch("https://smartbox-backend.onrender.com/auth/login", {
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

      window.location.href = "index.html";
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
      const r = await fetch("https://smartbox-backend.onrender.com/auth/register", {
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
      if (dados.token) {
        localStorage.setItem("sb_token", JSON.stringify(dados.token));
        localStorage.setItem("usuarioEmail", dados.email);

        msg.textContent = "Conta criada! Redirecionando para assinatura...";
        setTimeout(() => { window.location.href = "planos.html"; }, 800);
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