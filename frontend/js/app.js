import { api } from "./api.js";

// =====================================================
// REAPROVEITA — APLICAÇÃO PRINCIPAL
// =====================================================

const $ = (seletor) => document.querySelector(seletor);
const $$ = (seletor) => [...document.querySelectorAll(seletor)];

const estado = {
  products: [],
  lots: [],
  reservations: [],
  establishments: [],
  editing: null,
  formType: null,
};

const textosStatus = {
  regular: "Regular",
  expiring: "Próximo do vencimento",
  expired: "Vencido",
  empty: "Sem estoque",
  pending: "Pendente",
  confirmed: "Confirmada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const dataBR = (valor) =>
  valor
    ? new Date(`${String(valor).slice(0, 10)}T12:00:00`).toLocaleDateString(
        "pt-BR",
      )
    : "—";

const numeroBR = (valor) =>
  Number(valor || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  });

const escapar = (valor) =>
  String(valor ?? "").replace(
    /[&<>"']/g,
    (caractere) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[caractere],
  );

function dadosArray(resposta) {
  return Array.isArray(resposta?.data) ? resposta.data : [];
}

// =====================================================
// NOTIFICAÇÕES
// =====================================================

let temporizadorNotificacao;

function notificar(mensagem, erro = false) {
  const elemento = $("#toast");

  if (!elemento) {
    console[erro ? "error" : "log"](mensagem);
    return;
  }

  elemento.textContent = mensagem;
  elemento.classList.toggle("erro", erro);
  elemento.classList.add("visivel");

  clearTimeout(temporizadorNotificacao);

  temporizadorNotificacao = setTimeout(() => {
    elemento.classList.remove("visivel");
  }, 3500);
}

// =====================================================
// COMPONENTES REUTILIZÁVEIS
// =====================================================

function etiquetaStatus(status) {
  return `
    <span class="etiqueta-status ${escapar(status)}">
      ${escapar(textosStatus[status] || status || "—")}
    </span>
  `;
}

function tabela(colunas, linhas) {
  if (!linhas.length) {
    return `<div class="vazio">Nenhum registro encontrado.</div>`;
  }

  return `
    <table class="tabela-dados">
      <thead>
        <tr>${colunas.map((coluna) => `<th>${escapar(coluna)}</th>`).join("")}</tr>
      </thead>
      <tbody>${linhas.join("")}</tbody>
    </table>
  `;
}

function campoFormulario(nome, rotulo, tipo = "text", valor = "", opcoes = {}) {
  const {
    obrigatorio = false,
    completo = false,
    placeholder = "",
    minimo,
    passo,
  } = opcoes;

  return `
    <div class="campo-formulario ${completo ? "completo" : ""}">
      <label for="campo-${nome}">${rotulo}</label>
      <input
        id="campo-${nome}"
        name="${nome}"
        type="${tipo}"
        value="${escapar(valor)}"
        placeholder="${escapar(placeholder)}"
        ${obrigatorio ? "required" : ""}
        ${minimo !== undefined ? `min="${minimo}"` : ""}
        ${passo !== undefined ? `step="${passo}"` : ""}
      >
    </div>
  `;
}

function campoSelecao(
  nome,
  rotulo,
  opcoes,
  valor = "",
  completo = false,
  obrigatorio = true,
) {
  return `
    <div class="campo-formulario ${completo ? "completo" : ""}">
      <label for="campo-${nome}">${rotulo}</label>
      <select
        id="campo-${nome}"
        name="${nome}"
        ${obrigatorio ? "required" : ""}
      >
        <option value="">Selecione...</option>
        ${opcoes
          .map(
            (opcao) => `
          <option
            value="${escapar(opcao.value)}"
            ${String(opcao.value) === String(valor) ? "selected" : ""}
          >${escapar(opcao.label)}</option>
        `,
          )
          .join("")}
      </select>
    </div>
  `;
}

function campoTexto(nome, rotulo, valor = "", completo = false) {
  return `
    <div class="campo-formulario ${completo ? "completo" : ""}">
      <label for="campo-${nome}">${rotulo}</label>
      <textarea id="campo-${nome}" name="${nome}">${escapar(valor)}</textarea>
    </div>
  `;
}

// =====================================================
// NAVEGAÇÃO
// =====================================================

const titulos = {
  dashboard: "Dashboard",
  establishments: "Estabelecimentos",
  products: "Produtos",
  lots: "Lotes",
  reservations: "Reservas",
  reports: "Relatórios",
};

function navegar(pagina) {
  if (!titulos[pagina]) return;

  const paginaElemento = $(`#page-${pagina}`);

  if (!paginaElemento) {
    notificar(
      `A página "${titulos[pagina]}" não foi encontrada no HTML.`,
      true,
    );
    return;
  }

  $$(".pagina").forEach((elemento) => {
    elemento.classList.toggle("ativa", elemento.id === `page-${pagina}`);
  });

  $$(".item-navegacao").forEach((elemento) => {
    elemento.classList.toggle("ativo", elemento.dataset.page === pagina);
  });

  const titulo = $("#pageTitle");
  if (titulo) titulo.textContent = titulos[pagina];

  $("#sidebar")?.classList.remove("aberta");

  const botoes = {
    dashboard: null,
    establishments: "＋ Novo estabelecimento",
    products: "＋ Novo produto",
    lots: "＋ Novo lote",
    reservations: "＋ Nova reserva",
    reports: null,
  };

  const acao = $("#headerAction");

  if (acao) {
    acao.style.display = botoes[pagina] ? "" : "none";
    if (botoes[pagina]) acao.textContent = botoes[pagina];
  }

  const carregadores = {
    dashboard: carregarDashboard,
    establishments: carregarEstabelecimentos,
    products: carregarProdutos,
    lots: carregarLotes,
    reservations: carregarReservas,
    reports: carregarRelatorios,
  };

  carregadores[pagina]?.();
}

// =====================================================
// DASHBOARD
// =====================================================

async function carregarDashboard() {
  try {
    const resposta = await api.dashboard();
    const dados = resposta?.data || {};

    $("#metricProducts") &&
      ($("#metricProducts").textContent = numeroBR(dados.products));
    $("#metricLots") && ($("#metricLots").textContent = numeroBR(dados.lots));
    $("#metricExpiring") &&
      ($("#metricExpiring").textContent = numeroBR(dados.expiring));
    $("#metricReservations") &&
      ($("#metricReservations").textContent = numeroBR(dados.reservations));

    if ($("#savedKg")) {
      $("#savedKg").innerHTML = `${numeroBR(dados.saved_kg)} <small>kg</small>`;
    }

    // O backend pode retornar um objeto ou uma lista.
    const controle = dados.product_control;

    const produtos = Array.isArray(controle)
      ? controle
      : controle
        ? [controle]
        : [];

    const linhas = produtos.map((produto) => {
      const situacao = String(produto.situation || "").toLowerCase();

      let status = "regular";

      if (situacao.includes("venc")) status = "expired";
      else if (situacao.includes("próximo") || situacao.includes("proximo"))
        status = "expiring";
      else if (situacao.includes("sem estoque")) status = "empty";

      return `
        <tr>
          <td><strong class="nome-item">${escapar(produto.name)}</strong></td>
          <td>${numeroBR(produto.quantity)} ${escapar(produto.unit)}</td>
          <td>${dataBR(produto.next_expiry)}</td>
          <td>${etiquetaStatus(status)}</td>
        </tr>
      `;
    });

    if ($("#dashboardTable")) {
      $("#dashboardTable").innerHTML = tabela(
        ["Produto", "Quantidade disponível", "Próxima validade", "Situação"],
        linhas,
      );
    }

    const respostaLotes = await api.lots("", "expiring");
    const lotes = dadosArray(respostaLotes);

    if ($("#expiryNotice")) {
      $("#expiryNotice").innerHTML = lotes.length
        ? lotes
            .slice(0, 5)
            .map(
              (lote) => `
            <div class="item-alerta">
              <div>
                <strong>${escapar(lote.product_name)}</strong>
                <small>Lote ${escapar(lote.lot_code || "Sem código")}</small>
              </div>
              <span>${dataBR(lote.expiry_date)}</span>
            </div>
          `,
            )
            .join("")
        : `<div class="vazio">Nenhum lote próximo do vencimento.</div>`;
    }
  } catch (erro) {
    console.error("Erro ao carregar dashboard:", erro);
    notificar(`Erro ao carregar dashboard: ${erro.message}`, true);
  }
}

// =====================================================
// ESTABELECIMENTOS
// =====================================================

async function carregarEstabelecimentos() {
  try {
    const resposta = await api.establishments();
    estado.establishments = dadosArray(resposta);

    const campoBusca = $("#estSearch");
    const busca = (campoBusca?.value || "").toLowerCase();

    const lista = estado.establishments.filter((item) =>
      String(item.name || "")
        .toLowerCase()
        .includes(busca),
    );

    const container = $("#establishmentList");
    if (!container) return;

    container.innerHTML = lista.length
      ? lista
          .map(
            (item) => `
          <article class="cartao-estabelecimento">
            <div class="icone-estabelecimento">⌂</div>
            <h3>${escapar(item.name)}</h3>
            <p>${escapar(item.kind || "Estabelecimento")}</p>
            <div class="metadados-estabelecimento">
              <span>Cadastro nº ${numeroBR(item.id)}</span>
            </div>
          </article>
        `,
          )
          .join("")
      : `<div class="vazio">Nenhum estabelecimento encontrado.</div>`;
  } catch (erro) {
    notificar(`Erro ao carregar estabelecimentos: ${erro.message}`, true);
  }
}

// =====================================================
// PRODUTOS
// =====================================================

async function carregarProdutos() {
  try {
    const resposta = await api.products($("#productSearch")?.value || "");
    estado.products = dadosArray(resposta);

    const linhas = estado.products.map(
      (produto) => `
      <tr>
        <td>
          <strong class="nome-item">${escapar(produto.name)}</strong>
          <small class="texto-secundario">${escapar(produto.establishment_name || "Sem estabelecimento")}</small>
        </td>
        <td>${escapar(produto.category || "Outros")}</td>
        <td>${escapar(produto.unit || "unidade")}</td>
        <td>${numeroBR(produto.weight_kg)} kg</td>
        <td>${numeroBR(produto.lots_count)}</td>
        <td>
          <button class="botao-acao" data-edit="product" data-id="${produto.id}">Editar</button>
          <button class="botao-acao excluir" data-delete="product" data-id="${produto.id}">Excluir</button>
        </td>
      </tr>
    `,
    );

    if ($("#productsTable")) {
      $("#productsTable").innerHTML = tabela(
        ["Produto", "Categoria", "Unidade", "Peso unitário", "Lotes", "Ações"],
        linhas,
      );
    }
  } catch (erro) {
    notificar(`Erro ao carregar produtos: ${erro.message}`, true);
  }
}

// =====================================================
// LOTES
// =====================================================

async function carregarLotes() {
  try {
    const resposta = await api.lots(
      $("#lotSearch")?.value || "",
      $("#lotFilter")?.value || "all",
    );

    estado.lots = dadosArray(resposta);

    const linhas = estado.lots.map(
      (lote) => `
      <tr>
        <td>
          <strong class="nome-item">${escapar(lote.product_name)}</strong>
          <small class="texto-secundario">${escapar(lote.lot_code || "Sem código")}</small>
        </td>
        <td>${numeroBR(lote.quantity_initial)} ${escapar(lote.unit)}</td>
        <td>${numeroBR(lote.quantity_available)} ${escapar(lote.unit)}</td>
        <td>${dataBR(lote.expiry_date)}</td>
        <td>${etiquetaStatus(lote.situation)}</td>
        <td>
          <button class="botao-acao" data-edit="lot" data-id="${lote.id}">Editar</button>
          <button class="botao-acao excluir" data-delete="lot" data-id="${lote.id}">Excluir</button>
        </td>
      </tr>
    `,
    );

    if ($("#lotsTable")) {
      $("#lotsTable").innerHTML = tabela(
        [
          "Produto / lote",
          "Quantidade inicial",
          "Disponível",
          "Validade",
          "Situação",
          "Ações",
        ],
        linhas,
      );
    }
  } catch (erro) {
    notificar(`Erro ao carregar lotes: ${erro.message}`, true);
  }
}

// =====================================================
// RESERVAS
// =====================================================

async function carregarReservas() {
  try {
    const resposta = await api.reservations(
      $("#reservationSearch")?.value || "",
      $("#reservationFilter")?.value || "all",
    );

    estado.reservations = dadosArray(resposta);

    const linhas = estado.reservations.map((reserva) => {
      let acoes = "";

      if (reserva.status === "pending") {
        acoes += `<button class="botao-acao" data-status="confirmed" data-id="${reserva.id}">Confirmar</button>`;
      }

      if (["pending", "confirmed"].includes(reserva.status)) {
        acoes += `<button class="botao-acao" data-status="completed" data-id="${reserva.id}">Concluir</button>`;
        acoes += `<button class="botao-acao" data-status="cancelled" data-id="${reserva.id}">Cancelar</button>`;
      }

      acoes += `<button class="botao-acao excluir" data-delete="reservation" data-id="${reserva.id}">Excluir</button>`;

      return `
        <tr>
          <td>
            <strong class="nome-item">${escapar(reserva.reserver_name)}</strong>
            <small class="texto-secundario">${escapar(reserva.contact || "Sem contato")}</small>
          </td>
          <td>${escapar(reserva.product_name)}</td>
          <td>${escapar(reserva.lot_code || "—")}</td>
          <td>${numeroBR(reserva.quantity)} ${escapar(reserva.unit)}</td>
          <td>${dataBR(reserva.reserved_at)}</td>
          <td>${etiquetaStatus(reserva.status)}</td>
          <td>${acoes}</td>
        </tr>
      `;
    });

    if ($("#reservationsTable")) {
      $("#reservationsTable").innerHTML = tabela(
        [
          "Responsável",
          "Produto",
          "Lote",
          "Quantidade",
          "Data",
          "Status",
          "Ações",
        ],
        linhas,
      );
    }
  } catch (erro) {
    notificar(`Erro ao carregar reservas: ${erro.message}`, true);
  }
}

// =====================================================
// RELATÓRIOS
// =====================================================

async function carregarRelatorios() {
  try {
    const resposta = await api.reports();
    const dados = resposta?.data || {};
    const resumo = dados.summary || {};

    if ($("#reportSaved"))
      $("#reportSaved").textContent = `${numeroBR(resumo.saved_kg)} kg`;
    if ($("#reportCompleted"))
      $("#reportCompleted").textContent = numeroBR(
        resumo.completed_reservations,
      );
    if ($("#reportProducts"))
      $("#reportProducts").textContent = numeroBR(resumo.products);
    if ($("#reportLots")) $("#reportLots").textContent = numeroBR(resumo.lots);
    if ($("#reportEstablishments"))
      $("#reportEstablishments").textContent = numeroBR(resumo.establishments);

    const produtos = Array.isArray(dados.by_product) ? dados.by_product : [];
    const maior = Math.max(
      ...produtos.map((item) => Number(item.saved_kg) || 0),
      1,
    );

    if ($("#reportBars")) {
      $("#reportBars").innerHTML = produtos.length
        ? produtos
            .map((item) => {
              const percentual = Math.max(
                2,
                ((Number(item.saved_kg) || 0) / maior) * 100,
              );

              return `
              <div class="linha-barra">
                <span>${escapar(item.name)}</span>
                <div class="trilho-barra">
                  <div class="valor-barra" style="width:${percentual}%"></div>
                </div>
                <strong>${numeroBR(item.saved_kg)} kg</strong>
              </div>
            `;
            })
            .join("")
        : `<div class="vazio">Ainda não existem reservas concluídas.</div>`;
    }
  } catch (erro) {
    notificar(`Erro ao carregar relatórios: ${erro.message}`, true);
  }
}

// =====================================================
// ABRIR FORMULÁRIOS
// =====================================================

async function abrirFormulario(tipo, id = null) {
  estado.editing = id ? { tipo, id } : null;
  estado.formType = tipo;

  const campos = $("#modalFields");
  if (!campos) {
    notificar("O campo de formulários não foi encontrado no HTML.", true);
    return;
  }

  let titulo = "";
  let html = "";

  try {
    if (tipo === "establishment") {
      titulo = "Novo estabelecimento";

      html =
        campoFormulario("name", "Nome do estabelecimento", "text", "", {
          obrigatorio: true,
          completo: true,
        }) +
        campoSelecao("kind", "Tipo", [
          { value: "Mercado", label: "Mercado" },
          { value: "Padaria", label: "Padaria" },
          { value: "Restaurante", label: "Restaurante" },
          { value: "Supermercado", label: "Supermercado" },
          { value: "Outro", label: "Outro" },
        ]) +
        campoFormulario("contact_name", "Nome do responsável") +
        campoFormulario("phone", "Telefone", "tel") +
        campoFormulario("address", "Endereço", "text", "", { completo: true });
    }

    if (tipo === "product") {
      titulo = id ? "Editar produto" : "Novo produto";

      const respostaEstabelecimentos = await api.establishments();
      const estabelecimentos = dadosArray(respostaEstabelecimentos);

      let produto = {};

      if (id) {
        const respostaProdutos = await api.products();
        produto =
          dadosArray(respostaProdutos).find(
            (item) => Number(item.id) === Number(id),
          ) || {};
      }

      html =
        campoFormulario("name", "Nome do produto", "text", produto.name || "", {
          obrigatorio: true,
          completo: true,
        }) +
        campoFormulario(
          "category",
          "Categoria",
          "text",
          produto.category || "Outros",
        ) +
        campoFormulario("unit", "Unidade", "text", produto.unit || "unidade") +
        campoFormulario(
          "weight_kg",
          "Peso unitário em kg",
          "number",
          produto.weight_kg ?? 0,
          {
            minimo: 0,
            passo: "0.001",
          },
        ) +
        campoSelecao(
          "establishment_id",
          "Estabelecimento",
          [
            { value: "", label: "Sem estabelecimento" },
            ...estabelecimentos.map((item) => ({
              value: item.id,
              label: item.name,
            })),
          ],
          produto.establishment_id ?? "",
          false,
          false,
        ) +
        campoTexto("description", "Descrição", produto.description || "", true);
    }

    if (tipo === "lot") {
      titulo = id ? "Editar lote" : "Novo lote";

      const respostaProdutos = await api.products();
      const produtos = dadosArray(respostaProdutos);

      let lote = {};

      if (id) {
        const respostaLotes = await api.lots();
        lote =
          dadosArray(respostaLotes).find(
            (item) => Number(item.id) === Number(id),
          ) || {};
      }

      html =
        campoSelecao(
          "product_id",
          "Produto",
          produtos.map((item) => ({ value: item.id, label: item.name })),
          lote.product_id || "",
        ) +
        campoFormulario(
          "lot_code",
          "Código do lote",
          "text",
          lote.lot_code || "",
        ) +
        campoFormulario(
          "quantity_initial",
          "Quantidade inicial",
          "number",
          lote.quantity_initial ?? "",
          {
            obrigatorio: true,
            minimo: 0.001,
            passo: "0.001",
          },
        ) +
        campoFormulario(
          "received_at",
          "Data de recebimento",
          "date",
          lote.received_at
            ? String(lote.received_at).slice(0, 10)
            : new Date().toISOString().slice(0, 10),
        ) +
        campoFormulario(
          "expiry_date",
          "Data de validade",
          "date",
          lote.expiry_date ? String(lote.expiry_date).slice(0, 10) : "",
          { obrigatorio: true },
        ) +
        campoTexto("notes", "Observações", lote.notes || "", true);
    }

    if (tipo === "reservation") {
      titulo = "Nova reserva";

      const respostaLotes = await api.lots("", "available");
      const lotes = dadosArray(respostaLotes).filter(
        (item) => Number(item.quantity_available) > 0,
      );

      if (!lotes.length) {
        html = `<div class="vazio">Não existem lotes disponíveis para reserva.</div>`;
      } else {
        html =
          campoSelecao(
            "lot_id",
            "Produto / lote",
            lotes.map((item) => ({
              value: item.id,
              label: `${item.product_name} — ${item.lot_code || "Sem código"} — disponível: ${item.quantity_available} ${item.unit}`,
            })),
          ) +
          campoFormulario("reserver_name", "Nome do responsável", "text", "", {
            obrigatorio: true,
            completo: true,
          }) +
          campoFormulario("contact", "Telefone ou contato", "tel") +
          campoFormulario("quantity", "Quantidade reservada", "number", "", {
            obrigatorio: true,
            minimo: 0.001,
            passo: "0.001",
          }) +
          campoTexto("notes", "Observações", "", true);
      }
    }

    if (!["establishment", "product", "lot", "reservation"].includes(tipo)) {
      throw new Error("Tipo de formulário inválido.");
    }

    if ($("#modalTitle")) $("#modalTitle").textContent = titulo;
    campos.innerHTML = html;
    $("#modalBackdrop")?.classList.add("aberto");
  } catch (erro) {
    estado.formType = null;
    estado.editing = null;
    notificar(`Não foi possível abrir o formulário: ${erro.message}`, true);
  }
}

// =====================================================
// FECHAR FORMULÁRIO
// =====================================================

function fecharFormulario() {
  $("#modalBackdrop")?.classList.remove("aberto");
  $("#modalForm")?.reset();

  if ($("#modalFields")) $("#modalFields").innerHTML = "";

  estado.editing = null;
  estado.formType = null;
}

// =====================================================
// SALVAR FORMULÁRIOS
// =====================================================

async function salvarFormulario(evento) {
  evento.preventDefault();

  const formulario = new FormData(evento.currentTarget);
  const dados = Object.fromEntries(formulario.entries());

  try {
    const tipo = estado.formType;
    const edicao = estado.editing;

    if (tipo === "establishment") {
      await api.createEstablishment(dados);
      fecharFormulario();
      notificar("Estabelecimento cadastrado com sucesso!");
      await carregarEstabelecimentos();
    }

    if (tipo === "product") {
      dados.weight_kg = Number(dados.weight_kg || 0);
      dados.establishment_id = dados.establishment_id
        ? Number(dados.establishment_id)
        : null;

      if (edicao) {
        await api.updateProduct(edicao.id, dados);
      } else {
        await api.createProduct(dados);
      }

      fecharFormulario();
      notificar("Produto salvo com sucesso!");
      await carregarProdutos();
    }

    if (tipo === "lot") {
      dados.product_id = Number(dados.product_id);
      dados.quantity_initial = Number(dados.quantity_initial);

      if (edicao) {
        await api.updateLot(edicao.id, dados);
      } else {
        await api.createLot(dados);
      }

      fecharFormulario();
      notificar("Lote salvo com sucesso!");
      await carregarLotes();
    }

    if (tipo === "reservation") {
      dados.lot_id = Number(dados.lot_id);
      dados.quantity = Number(dados.quantity);

      await api.createReservation(dados);

      fecharFormulario();
      notificar("Reserva registrada com sucesso!");
      await carregarReservas();
    }

    await carregarDashboard();
  } catch (erro) {
    notificar(erro.message, true);
  }
}

// =====================================================
// EXCLUIR REGISTROS
// =====================================================

async function excluirRegistro(tipo, id) {
  if (!confirm("Tem certeza que deseja excluir este registro?")) return;

  try {
    if (tipo === "product") await api.deleteProduct(id);
    if (tipo === "lot") await api.deleteLot(id);
    if (tipo === "reservation") await api.deleteReservation(id);

    notificar("Registro excluído com sucesso!");

    if (tipo === "product") await carregarProdutos();
    if (tipo === "lot") await carregarLotes();
    if (tipo === "reservation") await carregarReservas();

    await carregarDashboard();
  } catch (erro) {
    notificar(erro.message, true);
  }
}

// =====================================================
// STATUS DAS RESERVAS
// =====================================================

async function alterarStatusReserva(id, status) {
  const nomeStatus = textosStatus[status] || status;

  if (!confirm(`Deseja realmente alterar o status para "${nomeStatus}"?`))
    return;

  try {
    await api.updateReservationStatus(id, status);
    notificar("Status da reserva atualizado!");

    await carregarReservas();
    await carregarDashboard();
  } catch (erro) {
    notificar(erro.message, true);
  }
}

// =====================================================
// EVENTOS DA INTERFACE
// =====================================================

document.addEventListener("click", async (evento) => {
  const alvo = evento.target;

  if (!(alvo instanceof Element)) return;

  const navegacao = alvo.closest("[data-page]");
  const atalho = alvo.closest("[data-go]");
  const editar = alvo.closest("[data-edit]");
  const excluir = alvo.closest("[data-delete]");
  const status = alvo.closest("[data-status]");

  if (navegacao) {
    navegar(navegacao.dataset.page);
    return;
  }

  if (atalho) {
    navegar(atalho.dataset.go);
    return;
  }

  if (editar) {
    await abrirFormulario(editar.dataset.edit, Number(editar.dataset.id));
    return;
  }

  if (excluir) {
    await excluirRegistro(excluir.dataset.delete, Number(excluir.dataset.id));
    return;
  }

  if (status) {
    await alterarStatusReserva(
      Number(status.dataset.id),
      status.dataset.status,
    );
  }
});

// Helper para registrar eventos somente quando o elemento existe.
function ao(seletor, evento, callback) {
  const elemento = $(seletor);
  if (elemento) elemento.addEventListener(evento, callback);
}

// Botão principal do cabeçalho
ao("#headerAction", "click", () => {
  const paginaAtiva = $(".pagina.ativa")?.id.replace("page-", "");

  const tipos = {
    establishments: "establishment",
    products: "product",
    lots: "lot",
    reservations: "reservation",
  };

  if (tipos[paginaAtiva]) {
    abrirFormulario(tipos[paginaAtiva]);
  } else {
    navegar("products");
    abrirFormulario("product");
  }
});

// Botões de cadastro
ao("#addEstablishment", "click", () => abrirFormulario("establishment"));
ao("#newProduct", "click", () => abrirFormulario("product"));
ao("#newLot", "click", () => abrirFormulario("lot"));
ao("#newReservation", "click", () => abrirFormulario("reservation"));

// Modal
ao("#closeModal", "click", fecharFormulario);
ao("#cancelModal", "click", fecharFormulario);

ao("#modalBackdrop", "click", (evento) => {
  if (evento.target.id === "modalBackdrop") fecharFormulario();
});

ao("#modalForm", "submit", salvarFormulario);

// Menu para celular
ao("#mobileMenu", "click", () => {
  $("#sidebar")?.classList.toggle("aberta");
});

// Buscas e filtros
let temporizadorBusca;

function buscarComAtraso(funcao) {
  clearTimeout(temporizadorBusca);
  temporizadorBusca = setTimeout(funcao, 300);
}

ao("#estSearch", "input", () => buscarComAtraso(carregarEstabelecimentos));
ao("#productSearch", "input", () => buscarComAtraso(carregarProdutos));
ao("#lotSearch", "input", () => buscarComAtraso(carregarLotes));
ao("#lotFilter", "change", carregarLotes);
ao("#reservationSearch", "input", () => buscarComAtraso(carregarReservas));
ao("#reservationFilter", "change", carregarReservas);

// Exportação CSV
ao("#exportReport", "click", () => {
  window.location.href = "/api/reports/export";
});

// Data do cabeçalho
if ($("#dateLabel")) {
  $("#dateLabel").textContent = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// =====================================================
// INICIALIZAÇÃO
// =====================================================

async function iniciarAplicacao() {
  try {
    await api.health();
    await carregarDashboard();
  } catch (erro) {
    console.error("Erro ao iniciar o Reaproveita:", erro);
    notificar(
      "Não foi possível conectar à API. Confira o servidor e o banco de dados.",
      true,
    );
  }
}

iniciarAplicacao();
