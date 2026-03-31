/*
  auth.js — cuida do login e cadastro
  Chama o backend (server.js) nas rotas /auth/login e /auth/register

  IMPORTANTE: se você estiver testando no PC, o backend precisa estar
  rodando com: node backend/server.js
  Se o site já estiver no ar (Railway), não precisa mudar nada.
*/

const loginForm   = document.getElementById("loginForm");
const cadastroForm= document.getElementById("cadastroForm");
const copyPixBtn  = document.getElementById("copyPixBtn");
const pixCode     = document.getElementById("pixCode");

// Botão copiar chave Pix
if (copyPixBtn && pixCode) {
  copyPixBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(pixCode.value);
      copyPixBtn.textContent = "Copiado!";
      setTimeout(() => { copyPixBtn.textContent = "Copiar Pix"; }, 1400);
    } catch {
      copyPixBtn.textContent = "Erro ao copiar";
      setTimeout(() => { copyPixBtn.textContent = "Copiar Pix"; }, 1400);
    }
  });
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
      const r = await fetch("https://tvxbox-backend-1.onrender.com/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const dados = await r.json();

      if (!r.ok) {
        msg.textContent = dados.mensagem || "Erro ao fazer login";
        return;
      }

      // Salva o token e e-mail no localStorage
      localStorage.setItem("sb_token", JSON.stringify(dados.token));
      localStorage.setItem("usuarioEmail", dados.email);

      // Vai para a página inicial
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
      const r = await fetch("https://tvxbox-backend-1.onrender.com/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const dados = await r.json();

      if (!r.ok) {
        msg.textContent = dados.mensagem || "Erro ao cadastrar";
        return;
      }

      msg.textContent = "Conta criada! Redirecionando...";
      setTimeout(() => { window.location.href = "login.html"; }, 800);
    } catch {
      msg.textContent = "Erro de conexão. Verifique se o servidor está rodando.";
    }
  });
}
