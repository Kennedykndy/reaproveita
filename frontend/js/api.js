// =====================================================
// REAPROVEITA — COMUNICAÇÃO COM A API
// =====================================================

const API_BASE = "/api";

// Função padrão para realizar requisições
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}`);
    }

    return response;
  }

  const payload = await response.json();

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || "Não foi possível concluir a operação.");
  }

  return payload;
}

// Funções disponíveis para o frontend
export const api = {
  // Conexão e dashboard
  health: () => request("/health"),
  dashboard: () => request("/dashboard"),

  // Estabelecimentos
  establishments: () => request("/establishments"),
  createEstablishment: (data) =>
    request("/establishments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createEstablishment: (data) =>
    request("/establishments", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Produtos
  products: (search = "") =>
    request(`/products?search=${encodeURIComponent(search)}`),

  createProduct: (data) =>
    request("/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateProduct: (id, data) =>
    request(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteProduct: (id) =>
    request(`/products/${id}`, {
      method: "DELETE",
    }),

  // Lotes
  lots: (search = "", status = "all") =>
    request(
      `/lots?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`,
    ),

  createLot: (data) =>
    request("/lots", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateLot: (id, data) =>
    request(`/lots/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteLot: (id) =>
    request(`/lots/${id}`, {
      method: "DELETE",
    }),

  // Reservas
  reservations: (search = "", status = "all") =>
    request(
      `/reservations?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`,
    ),

  createReservation: (data) =>
    request("/reservations", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateReservationStatus: (id, status) =>
    request(`/reservations/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  deleteReservation: (id) =>
    request(`/reservations/${id}`, {
      method: "DELETE",
    }),

  // Relatórios
  reports: () => request("/reports"),
};
