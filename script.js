<!--
Fluxograma resumido (HTML CRM):
Entrada → usuário acessa a página no GitHub Pages
Validação → navegação pelas seções (cadastros, atendimento, resumo, listas)
Lógica → Bootstrap organiza o layout; JavaScript (script.js) integra com a API
Saída → interface para registrar e visualizar clientes, serviços, atendimentos, despesas e resumo financeiro
Versão 1.4 — 29/11/2025 / Mudança: inclusão de módulo de Despesas e Lista de Despesas
-->

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CRM Financeiro - La Belle Divas</title>

    <!-- Bootstrap 5 CSS -->
    <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
        rel="stylesheet"
    >

    <!-- Bootstrap Icons -->
    <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css"
    >

    <!-- CSS customizado -->
    <link rel="stylesheet" href="style.css">
</head>

<body class="bg-light">

    <!-- HEADER -->
    <header class="py-4 mb-5 shadow">
        <div class="container text-center text-md-start">
            <h1 class="h2 mb-1">
                <i class="bi bi-gem me-2"></i>
                La Belle Divas
            </h1>
            <p class="mb-0 opacity-75">
                CRM Financeiro &amp; Controle de Atendimentos
            </p>
        </div>
    </header>

    <!-- MAIN CONTENT -->
    <main class="container my-3">

        <!-- LINHA PRINCIPAL: Registrar Atendimento (principal) + Resumo -->
        <div class="row g-4 mb-4">
            <!-- Registrar Atendimento - SEMPRE VISÍVEL -->
            <div class="col-lg-7 col-md-12">
                <div class="card h-100 border-2 border-primary-subtle">
                    <div class="card-header bg-primary-subtle">
                        <h5 class="card-title text-dark mb-0">
                            <i class="bi bi-cash-coin fs-4 text-success"></i>
                            Registrar Atendimento
                        </h5>
                    </div>
                    <div class="card-body">
                        <form id="formAtendimento">
                            <div class="mb-3">
                                <label
                                    for="atData"
                                    class="form-label small text-muted text-uppercase fw-bold"
                                >
                                    Data *
                                </label>
                                <input
                                    type="date"
                                    class="form-control"
                                    id="atData"
                                    required
                                >
                            </div>

                            <div class="mb-3">
                                <label
                                    for="atCliente"
                                    class="form-label small text-muted text-uppercase fw-bold"
                                >
                                    Cliente *
                                </label>
                                <select
                                    class="form-select"
                                    id="atCliente"
                                    required
                                >
                                    <option value="">Selecione um cliente...</option>
                                </select>
                            </div>

                            <div class="mb-3">
                                <label
                                    for="atServico"
                                    class="form-label small text-muted text-uppercase fw-bold"
                                >
                                    Serviço *
                                </label>
                                <select
                                    class="form-select"
                                    id="atServico"
                                    required
                                >
                                    <option value="">Selecione um serviço...</option>
                                </select>
                            </div>

                            <div class="row">
                                <div class="col-6 mb-3">
                                    <label
                                        for="atValor"
                                        class="form-label small text-muted text-uppercase fw-bold"
                                    >
                                        Valor (R$) *
                                    </label>
                                    <input
                                        type="number"
                                        class="form-control"
                                        id="atValor"
                                        step="0.01"
                                        min="0"
                                        required
                                    >
                                </div>
                                <div class="col-6 mb-3">
                                    <label
                                        for="atFormaPgto"
                                        class="form-label small text-muted text-uppercase fw-bold"
                                    >
                                        Pagamento *
                                    </label>
                                    <select
                                        class="form-select"
                                        id="atFormaPgto"
                                        required
                                    >
                                        <option value="Dinheiro">Dinheiro</option>
                                        <option value="PIX">PIX</option>
                                        <option value="Débito">Débito</option>
                                        <option value="Crédito">Crédito</option>
                                    </select>
                                </div>
                            </div>

                            <div class="mb-3">
                                <label
                                    for="atObs"
                                    class="form-label small text-muted text-uppercase fw-bold"
                                >
                                    Observações
                                </label>
                                <textarea
                                    class="form-control"
                                    id="atObs"
                                    rows="1"
                                ></textarea>
                            </div>

                            <button type="submit" class="btn btn-success w-100 fw-bold">
                                <i class="bi bi-check-circle me-1"></i>
                                Finalizar Atendimento
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Resumo Financeiro ao lado -->
            <div class="col-lg-5 col-md-12">
                <div class="card mb-0 h-100">
                    <div class="card-header d-flex justify-content-between align-items-center bg-white">
                        <h5 class="mb-0 text-dark">
                            <i class="bi bi-graph-up-arrow me-2 text-primary"></i>
                            Resumo Financeiro
                        </h5>
                        <input
                            type="month"
                            id="mesResumo"
                            class="form-control form-control-sm w-auto border-primary-subtle text-primary fw-bold"
                        >
                    </div>
                    <div class="card-body">
                        <div class="row text-center g-3">
                            <div class="col-md-12">
                                <div class="p-3 rounded bg-success-subtle h-100">
                                    <span class="d-block text-success small text-uppercase fw-bold mb-1">
                                        Entradas
                                    </span>
                                    <strong id="resumoEntradas" class="fs-3 text-success">
                                        R$ 0,00
                                    </strong>
                                </div>
                            </div>

                            <div class="col-md-6">
                                <div class="p-3 rounded bg-danger-subtle h-100">
                                    <span class="d-block text-danger small text-uppercase fw-bold mb-1">
                                        Saídas
                                    </span>
                                    <strong id="resumoSaidas" class="fs-3 text-danger">
                                        R$ 0,00
                                    </strong>
                                </div>
                            </div>

                            <div class="col-md-6">
                                <div class="p-3 rounded bg-primary-subtle h-100">
                                    <span class="d-block text-primary small text-uppercase fw-bold mb-1">
                                        Resultado Líquido
                                    </span>
                                    <strong id="resumoResultado" class="fs-3 text-primary">
                                        R$ 0,00
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- BOTÕES: CADASTROS (Novo Cliente / Novo Serviço / Despesa) -->
        <section class="mb-3">
            <div class="d-flex flex-wrap gap-2">
                <button
                    class="btn btn-outline-primary"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#secNovoCliente"
                    aria-expanded="false"
                    aria-controls="secNovoCliente"
                >
                    <i class="bi bi-person-plus me-1"></i>
                    Novo Cliente
                </button>

                <button
                    class="btn btn-outline-danger"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#secNovoServico"
                    aria-expanded="false"
                    aria-controls="secNovoServico"
                >
                    <i class="bi bi-scissors me-1"></i>
                    Novo Serviço
                </button>

                <button
                    class="btn btn-outline-dark"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#secNovaDespesa"
                    aria-expanded="false"
                    aria-controls="secNovaDespesa"
                >
                    <i class="bi bi-wallet2 me-1"></i>
                    Registrar Despesa
                </button>
            </div>
        </section>

        <!-- FORMULÁRIO NOVO CLIENTE (collapse) -->
        <div id="secNovoCliente" class="collapse mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5 class="card-title text-primary-custom mb-0">
                        <i class="bi bi-person-plus fs-4"></i>
                        Novo Cliente
                    </h5>
                </div>
                <div class="card-body">
                    <form id="formCliente">
                        <div class="mb-3">
                            <label
                                for="clienteNome"
                                class="form-label small text-muted text-uppercase fw-bold"
                            >
                                Nome Completo *
                            </label>
                            <input
                                type="text"
                                class="form-control"
                                id="clienteNome"
                                required
                                placeholder="Ex: Maria Silva"
                            >
                        </div>

                        <div class="mb-3">
                            <label
                                for="clienteTelefone"
                                class="form-label small text-muted text-uppercase fw-bold"
                            >
                                Telefone
                            </label>
                            <input
                                type="text"
                                class="form-control"
                                id="clienteTelefone"
                                placeholder="(XX) XXXXX-XXXX"
                            >
                        </div>

                        <div class="mb-3">
                            <label
                                for="clienteObs"
                                class="form-label small text-muted text-uppercase fw-bold"
                            >
                                Observações
                            </label>
                            <textarea
                                class="form-control"
                                id="clienteObs"
                                rows="2"
                                placeholder="Preferências, alergias..."
                            ></textarea>
                        </div>

                        <button type="submit" class="btn btn-primary-custom w-100">
                            <i class="bi bi-save me-1"></i>
                            Salvar Cliente
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <!-- FORMULÁRIO NOVO SERVIÇO (collapse) -->
        <div id="secNovoServico" class="collapse mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5 class="card-title text-pink-custom mb-0">
                        <i class="bi bi-scissors fs-4"></i>
                        Novo Serviço
                    </h5>
                </div>
                <div class="card-body">
                    <form id="formServico">
                        <div class="mb-3">
                            <label
                                for="servicoNome"
                                class="form-label small text-muted text-uppercase fw-bold"
                            >
                                Nome do Serviço *
                            </label>
                            <input
                                type="text"
                                class="form-control"
                                id="servicoNome"
                                required
                                placeholder="Ex: Corte Bordado"
                            >
                        </div>

                        <div class="mb-3">
                            <label
                                for="servicoCategoria"
                                class="form-label small text-muted text-uppercase fw-bold"
                            >
                                Categoria
                            </label>
                            <input
                                type="text"
                                class="form-control"
                                id="servicoCategoria"
                                placeholder="Ex: Cabelo"
                            >
                        </div>

                        <div class="mb-3">
                            <label
                                for="servicoPreco"
                                class="form-label small text-muted text-uppercase fw-bold"
                            >
                                Preço Base (R$) *
                            </label>
                            <input
                                type="number"
                                class="form-control"
                                id="servicoPreco"
                                step="0.01"
                                min="0"
                                required
                                placeholder="0.00"
                            >
                        </div>

                        <button type="submit" class="btn btn-pink-custom w-100">
                            <i class="bi bi-save me-1"></i>
                            Salvar Serviço
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <!-- FORMULÁRIO NOVA DESPESA (collapse) -->
        <div id="secNovaDespesa" class="collapse mb-4">
            <div class="card h-100">
                <div class="card-header">
                    <h5 class="card-title mb-0 text-dark">
                        <i class="bi bi-wallet2 me-2"></i>
                        Registrar Despesa
                    </h5>
                </div>
                <div class="card-body">
                    <form id="formDespesa">
                        <div class="mb-3">
                            <label for="despData" class="form-label small text-muted text-uppercase fw-bold">
                                Data *
                            </label>
                            <input
                                type="date"
                                class="form-control"
                                id="despData"
                                required
                            >
                        </div>

                        <div class="mb-3">
                            <label for="despCategoria" class="form-label small text-muted text-uppercase fw-bold">
                                Categoria *
                            </label>
                            <input
                                type="text"
                                class="form-control"
                                id="despCategoria"
                                placeholder="Ex: Aluguel, Produtos, Luz..."
                                required
                            >
                        </div>

                        <div class="mb-3">
                            <label for="despDescricao" class="form-label small text-muted text-uppercase fw-bold">
                                Descrição
                            </label>
                            <input
                                type="text"
                                class="form-control"
                                id="despDescricao"
                                placeholder="Ex: Conta de luz, compra de produtos..."
                            >
                        </div>

                        <div class="row">
                            <div class="col-6 mb-3">
                                <label for="despValor" class="form-label small text-muted text-uppercase fw-bold">
                                    Valor (R$) *
                                </label>
                                <input
                                    type="number"
                                    class="form-control"
                                    id="despValor"
                                    step="0.01"
                                    min="0"
                                    required
                                >
                            </div>
                            <div class="col-6 mb-3">
                                <label for="despFormaPgto" class="form-label small text-muted text-uppercase fw-bold">
                                    Pagamento
                                </label>
                                <select
                                    class="form-select"
                                    id="despFormaPgto"
                                >
                                    <option value="Dinheiro">Dinheiro</option>
                                    <option value="PIX">PIX</option>
                                    <option value="Débito">Débito</option>
                                    <option value="Crédito">Crédito</option>
                                </select>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label for="despObs" class="form-label small text-muted text-uppercase fw-bold">
                                Observações
                            </label>
                            <textarea
                                class="form-control"
                                id="despObs"
                                rows="1"
                            ></textarea>
                        </div>

                        <button type="submit" class="btn btn-dark w-100">
                            <i class="bi bi-save me-1"></i>
                            Salvar Despesa
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <!-- BOTÕES: LISTAS E HISTÓRICO -->
        <section class="mb-3">
            <div class="d-flex flex-wrap gap-2">
                <button
                    class="btn btn-outline-secondary"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#secHistorico"
                    aria-expanded="false"
                    aria-controls="secHistorico"
                >
                    <i class="bi bi-clock-history me-1"></i>
                    Histórico de Atendimentos
                </button>

                <button
                    class="btn btn-outline-secondary"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#secListaClientes"
                    aria-expanded="false"
                    aria-controls="secListaClientes"
                >
                    <i class="bi bi-people me-1"></i>
                    Lista de Clientes
                </button>

                <button
                    class="btn btn-outline-secondary"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#secListaServicos"
                    aria-expanded="false"
                    aria-controls="secListaServicos"
                >
                    <i class="bi bi-list-stars me-1"></i>
                    Lista de Serviços
                </button>

                <button
                    class="btn btn-outline-secondary"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#secListaDespesas"
                    aria-expanded="false"
                    aria-controls="secListaDespesas"
                >
                    <i class="bi bi-wallet2 me-1"></i>
                    Lista de Despesas
                </button>
            </div>
        </section>

        <!-- LISTA DE CLIENTES (collapse) -->
        <div id="secListaClientes" class="collapse mb-4">
            <div class="card h-100">
                <div class="card-header bg-white d-flex justify-content-between align-items-center">
                    <h6 class="mb-0 fw-bold text-primary-custom">
                        <i class="bi bi-people me-2"></i>
                        Clientes
                    </h6>
                    <span class="badge bg-light text-dark border">
                        Lista Completa
                    </span>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive" style="max-height: 300px;">
                        <table class="table table-hover mb-0 align-middle">
                            <thead class="sticky-top">
                                <tr>
                                    <th>Nome</th>
                                    <th>Telefone</th>
                                    <th>Obs</th>
                                </tr>
                            </thead>
                            <tbody id="tabelaClientes">
                                <!-- Preenchido via JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- LISTA DE SERVIÇOS (collapse) -->
        <div id="secListaServicos" class="collapse mb-4">
            <div class="card h-100">
                <div class="card-header bg-white d-flex justify-content-between align-items-center">
                    <h6 class="mb-0 fw-bold text-pink-custom">
                        <i class="bi bi-list-stars me-2"></i>
                        Serviços
                    </h6>
                    <span class="badge bg-light text-dark border">
                        Catálogo
                    </span>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive" style="max-height: 300px;">
                        <table class="table table-hover mb-0 align-middle">
                            <thead class="sticky-top">
                                <tr>
                                    <th>Nome</th>
                                    <th>Categoria</th>
                                    <th>Preço</th>
                                    <th>Ativo</th>
                                </tr>
                            </thead>
                            <tbody id="tabelaServicos">
                                <!-- Preenchido via JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- LISTA DE DESPESAS (collapse) -->
        <div id="secListaDespesas" class="collapse mb-4">
            <div class="card h-100">
                <div class="card-header bg-white d-flex justify-content-between align-items-center">
                    <h6 class="mb-0 fw-bold text-dark">
                        <i class="bi bi-wallet2 me-2"></i>
                        Despesas
                    </h6>
                    <span class="badge bg-light text-dark border">
                        Lançamentos
                    </span>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive" style="max-height: 300px;">
                        <table class="table table-hover mb-0 align-middle">
                            <thead class="sticky-top">
                                <tr>
                                    <th>Data</th>
                                    <th>Categoria</th>
                                    <th>Descrição</th>
                                    <th>Valor</th>
                                    <th>Pagamento</th>
                                    <th>Obs</th>
                                </tr>
                            </thead>
                            <tbody id="tabelaDespesas">
                                <!-- Preenchido via JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- HISTÓRICO DE ATENDIMENTOS (collapse) -->
        <div id="secHistorico" class="collapse mb-4">
            <div class="card">
                <div class="card-header bg-white">
                    <h6 class="mb-0 fw-bold text-dark">
                        <i class="bi bi-clock-history me-2"></i>
                        Histórico de Atendimentos
                    </h6>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive" style="max-height: 400px;">
                        <table class="table table-hover mb-0 align-middle">
                            <thead class="sticky-top">
                                <tr>
                                    <th>Data</th>
                                    <th>Cliente</th>
                                    <th>Serviço</th>
                                    <th>Valor</th>
                                    <th>Pagamento</th>
                                    <th>Obs</th>
                                </tr>
                            </thead>
                            <tbody id="tabelaAtendimentos">
                                <!-- Preenchido via JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

    </main>

    <!-- FOOTER -->
    <footer class="py-4 mt-5 bg-white border-top">
        <div class="container text-center">
            <p class="text-muted small mb-0">
                © 2025 La Belle Divas - CRM Financeiro v1.4
            </p>
        </div>
    </footer>

    <!-- Bootstrap JS Bundle -->
    <script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
    ></script>

    <!-- Script principal -->
    <script src="script.js"></script>
</body>
</html>
