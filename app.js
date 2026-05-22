// ==========================================
// CLIENT-SIDE APPLICATION LOGIC - ALEMAOZINHOSYSTEM32 (INTEGRAÇÃO COMPLETA FIREBASE V10 COMPAT)
// Salvar em: c:\Users\Oficina\Documents\Alemaozinho sistem\app.js
// ==========================================

// Global state
let firebaseApp = null;
let db = null;
let auth = null;
let storage = null;

let projects = [];
let branches = [];
let profiles = [];
let userFiliais = [];
let solicitacoes = [];
let assets = []; // global inventory assets
let currentUser = null;
let currentProjectId = null; // For details modal interaction
let currentFilialId = null; // active filial for modal panel
let activeFilialPanelTab = 'credenciais'; // active tab in filial panel
let authMode = 'login'; // 'login' or 'signup'
let isSigningUp = false; // Flag to prevent race conditions between signup writing and Auth state change

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initFirebase();
    initModalClickOutside();
});

// Setup Firebase Connection
function initFirebase() {
    let apiKey = localStorage.getItem("fb_api_key");
    let authDomain = localStorage.getItem("fb_auth_domain");
    let projectId = localStorage.getItem("fb_project_id");
    let storageBucket = localStorage.getItem("fb_storage_bucket");
    let messagingSenderId = localStorage.getItem("fb_messaging_sender_id");
    let appId = localStorage.getItem("fb_app_id");
    
    // Pre-popula credenciais reais do usuário se estiver vazio no localStorage
    if (!apiKey || !authDomain || !projectId || !storageBucket || !appId) {
        apiKey = "AIzaSyB5qH8g-kcMv4yGqk7Krm5D_vbV26X-7XU";
        authDomain = "alemaozinho-system32.firebaseapp.com";
        projectId = "alemaozinho-system32";
        storageBucket = "alemaozinho-system32.firebasestorage.app";
        messagingSenderId = "816402135407";
        appId = "1:816402135407:web:ff9ee42560e2b8fef2109a";
        
        localStorage.setItem("fb_api_key", apiKey);
        localStorage.setItem("fb_auth_domain", authDomain);
        localStorage.setItem("fb_project_id", projectId);
        localStorage.setItem("fb_storage_bucket", storageBucket);
        localStorage.setItem("fb_messaging_sender_id", messagingSenderId);
        localStorage.setItem("fb_app_id", appId);
    }
    
    const statusBtn = document.getElementById("btn-status");
    const statusText = document.getElementById("status-text");

    if (apiKey && authDomain && projectId && storageBucket && appId) {
        try {
            const firebaseConfig = { 
                apiKey, 
                authDomain, 
                projectId, 
                storageBucket, 
                messagingSenderId: messagingSenderId || undefined, 
                appId 
            };
            
            if (!firebase.apps.length) {
                firebaseApp = firebase.initializeApp(firebaseConfig);
            } else {
                firebaseApp = firebase.app();
            }
            
            db = firebaseApp.firestore();
            auth = firebaseApp.auth();
            storage = firebaseApp.storage();

            if (statusBtn && statusText) {
                statusBtn.className = "hidden";
                statusText.textContent = "Conectado ao Firebase";
                statusBtn.classList.add("hidden");
            }

            // Populate settings inputs in modal
            const apiKeyInput = document.getElementById("fb-api-key");
            const authDomainInput = document.getElementById("fb-auth-domain");
            const projectIdInput = document.getElementById("fb-project-id");
            const storageBucketInput = document.getElementById("fb-storage-bucket");
            const senderIdInput = document.getElementById("fb-messaging-sender-id");
            const appIdInput = document.getElementById("fb-app-id");

            if (apiKeyInput) apiKeyInput.value = apiKey;
            if (authDomainInput) authDomainInput.value = authDomain;
            if (projectIdInput) projectIdInput.value = projectId;
            if (storageBucketInput) storageBucketInput.value = storageBucket;
            if (senderIdInput) senderIdInput.value = messagingSenderId || "";
            if (appIdInput) appIdInput.value = appId;

            // Escutar eventos de autenticação em tempo real do Firebase Auth
            auth.onAuthStateChanged(async (user) => {
                console.log("Firebase Auth State Changed:", user);
                await handleAuthSession(user);
            });

        } catch (e) {
            console.error("Falha ao inicializar Firebase:", e);
            showToast("Erro ao inicializar Firebase: " + e.message, "error");
            setDisconnectedUI();
        }
    } else {
        setDisconnectedUI();
    }
}

// Disconnected UI state
function setDisconnectedUI() {
    const statusBtn = document.getElementById("btn-status");
    const statusText = document.getElementById("status-text");
    if (statusBtn && statusText) {
        statusBtn.className = "hidden";
        statusText.textContent = "Sem Conexão";
        statusBtn.classList.add("hidden");
    }

    // Force hide system wrappers completely
    const header = document.querySelector("header");
    const nav = document.querySelector("nav");
    const main = document.querySelector("main");
    if (header) header.classList.add("hidden");
    if (nav) nav.classList.add("hidden");
    if (main) main.classList.add("hidden");

    // Force open settings modal
    openSettingsModal();
    showToast("Configure as credenciais do Firebase clicando em ⚙️ Configurações.", "warning");
}

function saveFirebaseSettings() {
    const apiKey = document.getElementById("fb-api-key").value.trim();
    const authDomain = document.getElementById("fb-auth-domain").value.trim();
    const projectId = document.getElementById("fb-project-id").value.trim();
    const storageBucket = document.getElementById("fb-storage-bucket").value.trim();
    const messagingSenderId = document.getElementById("fb-messaging-sender-id").value.trim();
    const appId = document.getElementById("fb-app-id").value.trim();

    if (!apiKey || !authDomain || !projectId || !storageBucket || !appId) {
        showToast("Por favor, preencha todos os campos obrigatórios (*).", "warning");
        return;
    }

    localStorage.setItem("fb_api_key", apiKey);
    localStorage.setItem("fb_auth_domain", authDomain);
    localStorage.setItem("fb_project_id", projectId);
    localStorage.setItem("fb_storage_bucket", storageBucket);
    localStorage.setItem("fb_messaging_sender_id", messagingSenderId);
    localStorage.setItem("fb_app_id", appId);

    closeSettingsModal();
    showToast("Configurações salvas! Conectando...", "info");
    
    setTimeout(() => {
        location.reload();
    }, 1000);
}

function disconnectFirebase() {
    if (confirm("Tem certeza que deseja desconectar e limpar as credenciais do Firebase?")) {
        localStorage.removeItem("fb_api_key");
        localStorage.removeItem("fb_auth_domain");
        localStorage.removeItem("fb_project_id");
        localStorage.removeItem("fb_storage_bucket");
        localStorage.removeItem("fb_messaging_sender_id");
        localStorage.removeItem("fb_app_id");
        
        sessionStorage.clear();
        
        closeSettingsModal();
        showToast("Firebase desconectado.", "info");
        
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
}

// Fetch branches and projects from Cloud Firestore
async function loadData() {
    try {
        if (!db) {
            setDisconnectedUI();
            return;
        }

        // Load branches
        const snapB = await db.collection("filiais").get();
        branches = [];
        snapB.forEach(doc => {
            branches.push({ id: doc.id, ...doc.data() });
        });
        branches.sort((a, b) => a.nome.localeCompare(b.nome));

        // Load profiles
        const snapProf = await db.collection("perfis").get();
        profiles = [];
        snapProf.forEach(doc => {
            profiles.push({ id: doc.id, ...doc.data() });
        });
        profiles.sort((a, b) => a.nome.localeCompare(b.nome));

        // Load user filiais
        const snapUF = await db.collection("usuario_filiais").get();
        userFiliais = [];
        snapUF.forEach(doc => {
            userFiliais.push({ id: doc.id, ...doc.data() });
        });

        // Load solicitacoes
        const snapSol = await db.collection("solicitacoes").get();
        solicitacoes = [];
        snapSol.forEach(doc => {
            const data = doc.data();
            const filialObj = branches.find(b => b.id === data.id_filial);
            solicitacoes.push({
                id: doc.id,
                ...data,
                filial_nome: filialObj ? filialObj.nome : "Filial Removida",
                filial_cidade: filialObj ? filialObj.cidade : "",
                filial_estado: filialObj ? filialObj.estado : ""
            });
        });
        solicitacoes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        // Load projects
        const snapProj = await db.collection("projetos").get();
        projects = [];
        snapProj.forEach(doc => {
            const data = doc.data();
            const filialObj = branches.find(b => b.id === data.id_filial);
            projects.push({
                id: doc.id,
                ...data,
                filial_nome: filialObj ? filialObj.nome : "Filial Removida",
                filial_cidade: filialObj ? filialObj.cidade : "",
                filial_estado: filialObj ? filialObj.estado : ""
            });
        });
        projects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        applyUserContext();
        await loadInventoryAssets();
        
        // Check deep-linking URL routing
        checkUrlParams();

    } catch (e) {
        showToast("Erro ao carregar dados: " + e.message, "error");
        console.error(e);
    }
}

// Populate search filters
function populateFilters() {
    const filterFilial = document.getElementById("filter-filial");
    const filterCidade = document.getElementById("filter-cidade");
    
    if (!filterFilial || !filterCidade) return;

    const selectedFilial = filterFilial.value;
    const selectedCidade = filterCidade.value;

    filterFilial.innerHTML = '<option value="">Filiais: Todas</option>';
    filterCidade.innerHTML = '<option value="">Cidades: Todas</option>';

    let allowedBranches = branches;
    if (currentUser && currentUser.role === 'Colaborador') {
        const allowedBranchIds = userFiliais
            .filter(uf => uf.id_usuario === currentUser.id)
            .map(uf => uf.id_filial);
        allowedBranches = branches.filter(b => allowedBranchIds.includes(b.id));
    }

    const citiesSet = new Set();

    allowedBranches.forEach(b => {
        const optF = document.createElement("option");
        optF.value = b.id;
        optF.textContent = b.nome;
        filterFilial.appendChild(optF);

        if (b.cidade) {
            citiesSet.add(`${b.cidade} - ${b.estado}`);
        }
    });

    citiesSet.forEach(city => {
        const optC = document.createElement("option");
        optC.value = city.split(" - ")[0];
        optC.textContent = city;
        filterCidade.appendChild(optC);
    });

    filterFilial.value = selectedFilial;
    filterCidade.value = selectedCidade;
}

// Populate branch selects in forms
function populateBranchDropdowns() {
    const projFilial = document.getElementById("proj-filial");
    if (!projFilial) return;

    projFilial.innerHTML = '<option value="">Selecione a Filial...</option>';

    let allowedBranches = branches;
    if (currentUser && currentUser.role === 'Colaborador') {
        const allowedBranchIds = userFiliais
            .filter(uf => uf.id_usuario === currentUser.id)
            .map(uf => uf.id_filial);
        allowedBranches = branches.filter(b => allowedBranchIds.includes(b.id));
    }

    allowedBranches.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b.id;
        opt.textContent = `${b.nome} (${b.cidade}/${b.estado})`;
        projFilial.appendChild(opt);
    });
}

function populateUserDropdowns() {
    const reqDesignado = document.getElementById("req-designado");
    const projDesignado = document.getElementById("proj-designado");

    if (reqDesignado) {
        reqDesignado.innerHTML = '<option value="">Sem designação (Não designado)</option>';
        profiles.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = `${p.nome} (${p.role})`;
            reqDesignado.appendChild(opt);
        });
    }

    if (projDesignado) {
        projDesignado.innerHTML = '<option value="">Sem designação (Não designado)</option>';
        profiles.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = `${p.nome} (${p.role})`;
            projDesignado.appendChild(opt);
        });
    }
}

// Update stats count in Header
function updateStats() {
    let visibleProjects = projects;
    if (currentUser && currentUser.role === 'Colaborador') {
        const allowedBranchIds = userFiliais
            .filter(uf => uf.id_usuario === currentUser.id)
            .map(uf => uf.id_filial);
        visibleProjects = projects.filter(p => allowedBranchIds.includes(p.id_filial));
    }

    const total = visibleProjects.length;
    const focus = visibleProjects.filter(p => p.status === "Em Andamento").length;
    const completed = visibleProjects.filter(p => p.status === "Concluído").length;
    
    // Stagnant condition: status 'Em Andamento', not blocked, and updated_at > 24 hours ago
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const stagnant = visibleProjects.filter(p => p.status === "Em Andamento" && !p.status_bloqueado && new Date(p.updated_at).getTime() < oneDayAgo).length;

    const elTotal = document.getElementById("stat-total");
    const elFocus = document.getElementById("stat-focus");
    const elStagnant = document.getElementById("stat-stagnant");
    const elCompleted = document.getElementById("stat-completed");

    if (elTotal) elTotal.textContent = total;
    if (elFocus) elFocus.textContent = focus;
    if (elStagnant) elStagnant.textContent = stagnant;
    if (elCompleted) elCompleted.textContent = completed;
}

// Render board with filtered items
function renderBoard() {
    const searchEl = document.getElementById("filter-search");
    const filialEl = document.getElementById("filter-filial");
    const cidadeEl = document.getElementById("filter-cidade");
    const urgenciaEl = document.getElementById("filter-urgencia");

    if (!searchEl || !filialEl || !cidadeEl || !urgenciaEl) return;

    const searchQuery = searchEl.value.toLowerCase();
    const filialFilter = filialEl.value;
    const cidadeFilter = cidadeEl.value;
    const urgenciaFilter = urgenciaEl.value;

    let allowedBranchIds = [];
    if (currentUser && currentUser.role === 'Colaborador') {
        allowedBranchIds = userFiliais
            .filter(uf => uf.id_usuario === currentUser.id)
            .map(uf => uf.id_filial);
    }

    const filteredProjects = projects.filter(p => {
        if (currentUser && currentUser.role === 'Colaborador' && !allowedBranchIds.includes(p.id_filial)) {
            return false;
        }

        const matchesSearch = p.titulo.toLowerCase().includes(searchQuery) || 
                              (p.descricao && p.descricao.toLowerCase().includes(searchQuery));
        
        const matchesFilial = filialFilter === "" || p.id_filial === filialFilter;
        
        const branch = branches.find(b => b.id === p.id_filial);
        const matchesCidade = cidadeFilter === "" || (branch && branch.cidade === cidadeFilter);
        
        const matchesUrgencia = urgenciaFilter === "" || p.urgencia === urgenciaFilter;

        return matchesSearch && matchesFilial && matchesCidade && matchesUrgencia;
    });

    const cols = {
        "Banco de Ideias": { el: document.getElementById("col-ideias"), countEl: document.getElementById("count-ideias"), items: [] },
        "Backlog de Implementação": { el: document.getElementById("col-backlog"), countEl: document.getElementById("count-backlog"), items: [] },
        "Em Andamento": { el: document.getElementById("col-andamento"), countEl: document.getElementById("count-andamento"), items: [] },
        "Concluído": { el: document.getElementById("col-concluido"), countEl: document.getElementById("count-concluido"), items: [] }
    };

    filteredProjects.forEach(p => {
        if (cols[p.status]) {
            cols[p.status].items.push(p);
        }
    });

    Object.keys(cols).forEach(status => {
        const col = cols[status];
        if (col.countEl) col.countEl.textContent = col.items.length;
        if (col.el) {
            col.el.innerHTML = "";

            if (col.items.length === 0) {
                col.el.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-8 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        <i data-lucide="inbox" class="h-6 w-6 mb-1 opacity-40"></i>
                        <span class="text-xs">Nenhum projeto</span>
                    </div>
                `;
            } else {
                col.items.forEach(proj => {
                    const card = createCardDOM(proj);
                    col.el.appendChild(card);
                });
            }
        }
    });

    lucide.createIcons();
}

// Generate Card DOM
function createCardDOM(proj) {
    const branch = branches.find(b => b.id === proj.id_filial);
    const branchName = branch ? branch.nome : "Filial não cadastrada";
    const branchCity = branch ? `${branch.cidade}/${branch.estado}` : "";

    let urgencyBadgeClass = "bg-slate-800/80 text-slate-400 border-slate-800";
    if (proj.urgencia === "Média") urgencyBadgeClass = "bg-sky-950/40 text-sky-400 border-sky-500/10";
    else if (proj.urgencia === "Alta") urgencyBadgeClass = "bg-amber-950/40 text-amber-400 border-amber-500/10";
    else if (proj.urgencia === "Crítica") urgencyBadgeClass = "bg-rose-950/40 text-rose-400 border-rose-500/10";

    const isStagnant = proj.status === "Em Andamento" && !proj.status_bloqueado && (Date.now() - new Date(proj.updated_at).getTime() > 24 * 60 * 60 * 1000);
    const isBlocked = proj.status_bloqueado === true;

    const card = document.createElement("div");
    
    let borderStyle = "border-white/5";
    if (isBlocked) borderStyle = "border-rose-500/60 shadow-lg shadow-rose-950/20";
    else if (isStagnant) borderStyle = "pulse-critical border-rose-500";

    card.className = `glass glass-hover rounded-xl p-4 cursor-pointer transition-all duration-300 flex flex-col gap-3 relative border select-none group ${borderStyle}`;
    card.setAttribute("draggable", "true");
    
    card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", proj.id);
        card.style.opacity = "0.4";
    });
    
    card.addEventListener("dragend", () => {
        card.style.opacity = "1";
    });

    card.addEventListener("click", () => {
        openDetails(proj.id);
    });

    card.innerHTML = `
        <!-- Card SOS / Status Header -->
        <div class="flex items-start justify-between gap-2">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded border ${urgencyBadgeClass}">
                ${proj.urgencia}
            </span>
            <div class="flex items-center gap-1.5">
                ${isBlocked ? `
                    <span class="flex items-center gap-1 text-[9px] font-extrabold text-white bg-rose-600 px-2 py-0.5 rounded shadow uppercase tracking-wider animate-pulse">
                        <i data-lucide="alert-octagon" class="h-3 w-3"></i> SOS Impedido
                    </span>
                ` : ""}
                ${isStagnant ? `
                    <span class="flex items-center gap-1 text-[9px] font-bold text-rose-400 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-500/20 uppercase tracking-wider">
                        <i data-lucide="clock" class="h-3 w-3"></i> Parado > 24h
                    </span>
                ` : ""}
            </div>
        </div>

        <!-- Content -->
        <div>
            <h4 class="font-outfit font-bold text-slate-100 group-hover:text-accent-purple transition duration-200">${proj.titulo}</h4>
            <p class="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                ${proj.descricao || "Sem descrição fornecida."}
            </p>
        </div>

        <!-- Image Preview -->
        ${proj.url_foto ? `
            <div class="w-full h-20 overflow-hidden rounded-lg border border-white/5 mt-1 bg-slate-950">
                <img src="${proj.url_foto}" alt="Foto da demanda" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-300">
            </div>
        ` : ""}

        <!-- Designated User Badge -->
        ${proj.id_usuario_designado ? (() => {
            const designatedUser = profiles.find(p => p.id === proj.id_usuario_designado);
            const designatedName = designatedUser ? designatedUser.nome : null;
            return designatedName ? `
                <div class="flex items-center gap-1.5 text-[10px] text-slate-300 bg-slate-950 border border-white/10 px-2.5 py-1 rounded-lg self-start mt-0.5 font-medium">
                    <i data-lucide="user" class="h-3 w-3 text-accent-purple"></i>
                    <span>${designatedName}</span>
                </div>
            ` : "";
        })() : ""}

        <!-- Footer / Branch info -->
        <div class="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-white/5 mt-1">
            <span onclick="event.stopPropagation(); openFilialPanel('${proj.id_filial}')" class="flex items-center gap-1 font-bold text-accent-purple/90 hover:text-accent-purple cursor-pointer transition duration-200">
                <i data-lucide="building" class="h-3 w-3 text-accent-purple animate-pulse"></i> <u>${branchName}</u>
            </span>
            <span class="text-slate-400 font-semibold">${branchCity}</span>
        </div>
    `;

    return card;
}

// Drag & Drop functions
function allowDrop(e) {
    e.preventDefault();
}

async function drop(e, newStatus) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;

    try {
        await db.collection("projetos").doc(id).update({
            status: newStatus,
            updated_at: new Date().toISOString()
        });

        showToast(`Projeto movido para '${newStatus}'!`, "success");
        await loadData();

    } catch (error) {
        showToast("Erro ao mover projeto: " + error.message, "error");
    }
}

// Apply quick filters
function applyFilters() {
    renderBoard();
}

function clearFilters() {
    const searchEl = document.getElementById("filter-search");
    const filialEl = document.getElementById("filter-filial");
    const cidadeEl = document.getElementById("filter-cidade");
    const urgenciaEl = document.getElementById("filter-urgencia");

    if (searchEl) searchEl.value = "";
    if (filialEl) filialEl.value = "";
    if (cidadeEl) cidadeEl.value = "";
    if (urgenciaEl) urgenciaEl.value = "";

    applyFilters();
    showToast("Filtros limpos!", "info");
}

// Modal Helpers
function openSettingsModal() {
    const modal = document.getElementById("modal-settings");
    if (modal) modal.classList.remove("hidden");
}

function closeSettingsModal() {
    const modal = document.getElementById("modal-settings");
    if (modal) modal.classList.add("hidden");
}

function openFilialModal() {
    const form = document.getElementById("filial-form");
    if (form) form.reset();
    const modal = document.getElementById("modal-filial");
    if (modal) modal.classList.remove("hidden");
}

function closeFilialModal() {
    const modal = document.getElementById("modal-filial");
    if (modal) modal.classList.add("hidden");
}

async function handleFilialSubmit(e) {
    e.preventDefault();
    const nome = document.getElementById("fil-nome").value.trim();
    const cidade = document.getElementById("fil-cidade").value.trim();
    const estado = document.getElementById("fil-estado").value.trim().toUpperCase();

    try {
        const newBranchRef = db.collection("filiais").doc();
        const payload = {
            id: newBranchRef.id,
            nome,
            cidade,
            estado,
            created_at: new Date().toISOString()
        };
        await newBranchRef.set(payload);

        showToast("Filial cadastrada com sucesso!", "success");
        closeFilialModal();
        await loadData();

    } catch (error) {
        showToast("Erro ao cadastrar filial: " + error.message, "error");
    }
}

// Control motives field on Project modal
function toggleMotivoField() {
    const blockedCheckbox = document.getElementById("proj-bloqueado");
    const container = document.getElementById("proj-container-motivo");
    const motivoTextarea = document.getElementById("proj-motivo");
    
    if (!blockedCheckbox || !container || !motivoTextarea) return;

    if (blockedCheckbox.checked) {
        container.classList.remove("hidden");
        motivoTextarea.required = true;
    } else {
        container.classList.add("hidden");
        motivoTextarea.required = false;
    }
}

function openProjectModal(editId = null) {
    const form = document.getElementById("project-form");
    if (form) form.reset();

    const fileLabel = document.getElementById("file-label");
    if (fileLabel) fileLabel.textContent = "Selecionar Imagem";

    const projIdInput = document.getElementById("proj-id");
    if (projIdInput) projIdInput.value = "";

    const motivoContainer = document.getElementById("proj-container-motivo");
    if (motivoContainer) motivoContainer.classList.add("hidden");

    if (editId) {
        const proj = projects.find(p => p.id === editId);
        if (proj) {
            document.getElementById("proj-id").value = proj.id;
            document.getElementById("proj-titulo").value = proj.titulo;
            document.getElementById("proj-filial").value = proj.id_filial;
            document.getElementById("proj-urgencia").value = proj.urgencia;
            document.getElementById("proj-status").value = proj.status;
            document.getElementById("proj-descricao").value = proj.descricao || "";
            
            const isBlocked = proj.status_bloqueado || false;
            document.getElementById("proj-bloqueado").checked = isBlocked;
            document.getElementById("proj-motivo").value = proj.motivo_bloqueio || "";
            if (isBlocked) {
                document.getElementById("proj-container-motivo").classList.remove("hidden");
                document.getElementById("proj-motivo").required = true;
            }

            document.getElementById("proj-designado").value = proj.id_usuario_designado || "";
            document.getElementById("modal-project-title").textContent = "Editar Projeto";
        }
    } else {
        document.getElementById("proj-designado").value = "";
        document.getElementById("modal-project-title").textContent = "Cadastrar Demanda";
    }

    const modal = document.getElementById("modal-project");
    if (modal) modal.classList.remove("hidden");
}

function closeProjectModal() {
    const modal = document.getElementById("modal-project");
    if (modal) modal.classList.add("hidden");
}

function updateFileLabel() {
    const fileInput = document.getElementById("proj-foto");
    const label = document.getElementById("file-label");
    if (fileInput && label) {
        if (fileInput.files.length > 0) {
            label.textContent = fileInput.files[0].name;
        } else {
            label.textContent = "Selecionar Imagem";
        }
    }
}

// Upload file to Firebase Storage
async function uploadToFirebase(file) {
    if (!storage) throw new Error("Firebase Storage não inicializado.");
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `fotos/${fileName}`;
    const ref = storage.ref().child(filePath);
    await ref.put(file);
    const downloadUrl = await ref.getDownloadURL();
    return downloadUrl;
}

async function handleProjectSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("proj-id").value;
    const titulo = document.getElementById("proj-titulo").value.trim();
    const id_filial = document.getElementById("proj-filial").value;
    const urgencia = document.getElementById("proj-urgencia").value;
    const status = document.getElementById("proj-status").value;
    const descricao = document.getElementById("proj-descricao").value.trim();
    const status_bloqueado = document.getElementById("proj-bloqueado").checked;
    const motivo_bloqueio = status_bloqueado ? document.getElementById("proj-motivo").value.trim() : null;
    const id_usuario_designado = document.getElementById("proj-designado").value || null;
    const fileInput = document.getElementById("proj-foto");

    try {
        let url_foto = null;

        if (id) {
            const currentProj = projects.find(p => p.id === id);
            if (currentProj) url_foto = currentProj.url_foto;
        }

        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            showToast("Fazendo upload da imagem...", "info");
            url_foto = await uploadToFirebase(file);
        }

        const projectPayload = {
            titulo,
            id_filial,
            urgencia,
            status,
            descricao,
            url_foto,
            status_bloqueado,
            motivo_bloqueio,
            id_usuario_designado,
            updated_at: new Date().toISOString()
        };

        if (id) {
            await db.collection("projetos").doc(id).update(projectPayload);
        } else {
            const newProjRef = db.collection("projetos").doc();
            await newProjRef.set({
                id: newProjRef.id,
                ...projectPayload,
                created_at: new Date().toISOString()
            });
        }

        showToast(id ? "Projeto atualizado!" : "Projeto cadastrado com sucesso!", "success");
        closeProjectModal();
        await loadData();

    } catch (error) {
        showToast("Erro ao salvar projeto: " + error.message, "error");
    }
}

// Details Modal Integration
async function openDetails(projectId) {
    currentProjectId = projectId;
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;

    const branch = branches.find(b => b.id === proj.id_filial);
    const branchName = branch ? branch.nome : "Filial não cadastrada";
    const branchLoc = branch ? `${branch.cidade}/${branch.estado}` : "";

    // Set texts
    document.getElementById("details-titulo").textContent = proj.titulo;
    const filialLink = document.getElementById("details-filial-link");
    if (filialLink) {
        filialLink.textContent = `${branchName} - ${branchLoc}`;
        filialLink.onclick = () => {
            closeDetailsModal();
            openFilialPanel(proj.id_filial);
        };
    }
    document.getElementById("details-descricao").textContent = proj.descricao || "Nenhuma descrição detalhada.";
    document.getElementById("details-created-at").textContent = new Date(proj.created_at).toLocaleString("pt-BR");
    document.getElementById("details-updated-at").textContent = new Date(proj.updated_at).toLocaleString("pt-BR");

    // Badges style
    const bStatus = document.getElementById("details-badge-status");
    bStatus.textContent = proj.status;
    
    let statusClass = "bg-slate-800 text-slate-400 border-slate-700";
    if (proj.status === "Backlog de Implementação") statusClass = "bg-amber-950/60 text-amber-400 border-amber-500/20";
    else if (proj.status === "Em Andamento") statusClass = "bg-purple-950/60 text-purple-400 border-purple-500/20";
    else if (proj.status === "Concluído") statusClass = "bg-emerald-950/60 text-emerald-400 border-emerald-500/20";
    bStatus.className = `text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${statusClass}`;

    const bUrgencia = document.getElementById("details-badge-urgencia");
    bUrgencia.textContent = `Urgência: ${proj.urgencia}`;
    let urgencyClass = "bg-slate-800 text-slate-400 border-slate-700";
    if (proj.urgencia === "Média") urgencyClass = "bg-sky-950/60 text-sky-400 border-sky-500/20";
    else if (proj.urgencia === "Alta") urgencyClass = "bg-amber-950/60 text-amber-400 border-amber-500/20";
    else if (proj.urgencia === "Crítica") urgencyClass = "bg-rose-950/60 text-rose-400 border-rose-500/20";
    bUrgencia.className = `text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${urgencyClass}`;

    // SOS / Impedimento UI setup
    const isBlocked = proj.status_bloqueado === true;
    const alertBlocked = document.getElementById("details-alert-blocked");
    const motivoText = document.getElementById("details-motivo-bloqueio");
    if (isBlocked) {
        alertBlocked.classList.remove("hidden");
        motivoText.textContent = proj.motivo_bloqueio || "Nenhum motivo fornecido.";
    } else {
        alertBlocked.classList.add("hidden");
    }

    const isStagnant = proj.status === "Em Andamento" && !proj.status_bloqueado && (Date.now() - new Date(proj.updated_at).getTime() > 24 * 60 * 60 * 1000);
    const alertStagnant = document.getElementById("details-alert-stagnant");
    if (isStagnant) {
        alertStagnant.classList.remove("hidden");
    } else {
        alertStagnant.classList.add("hidden");
    }

    // Photo settings
    const photoContainer = document.getElementById("details-container-foto");
    const photoEl = document.getElementById("details-foto");
    if (proj.url_foto) {
        photoEl.src = proj.url_foto;
        photoContainer.classList.remove("hidden");
    } else {
        photoContainer.classList.add("hidden");
        photoEl.src = "";
    }

    // Button actions
    document.getElementById("details-btn-edit").onclick = () => {
        closeDetailsModal();
        openProjectModal(proj.id);
    };

    document.getElementById("details-btn-share").onclick = () => {
        copyShareLink();
    };

    document.getElementById("details-btn-delete").onclick = () => {
        deleteProject(proj.id);
    };

    // Load comments associated with the project
    document.getElementById("comment-form").reset();
    await loadComments(proj.id);

    document.getElementById("modal-details").classList.remove("hidden");
    lucide.createIcons();
}

function closeDetailsModal() {
    const modal = document.getElementById("modal-details");
    if (modal) modal.classList.add("hidden");
    
    // Clear URL parameters to clean up sharing state
    const url = new URL(window.location);
    url.searchParams.delete("project");
    window.history.replaceState({}, document.title, url.toString());
}

async function moveCurrentProject(newStatus) {
    if (!currentProjectId) return;
    
    try {
        await db.collection("projetos").doc(currentProjectId).update({
            status: newStatus,
            updated_at: new Date().toISOString()
        });

        showToast(`Status alterado para '${newStatus}'!`, "success");
        closeDetailsModal();
        await loadData();
    } catch (e) {
        showToast("Erro ao mover status: " + e.message, "error");
    }
}

async function deleteProject(id) {
    if (!confirm("Tem certeza que deseja remover este projeto?")) return;

    try {
        await db.collection("projetos").doc(id).delete();

        showToast("Projeto deletado com sucesso!", "info");
        closeDetailsModal();
        await loadData();
    } catch (e) {
        showToast("Erro ao deletar: " + e.message, "error");
    }
}

// Comments implementation
async function loadComments(projectId) {
    const commentsList = document.getElementById("details-comments-list");
    if (!commentsList) return;
    commentsList.innerHTML = `<p class="text-xs text-slate-500 italic py-1">Carregando histórico...</p>`;

    try {
        const snap = await db.collection("comentarios").where("id_projeto", "==", projectId).get();
        let projectComments = [];
        snap.forEach(doc => {
            projectComments.push({ id: doc.id, ...doc.data() });
        });
        projectComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        commentsList.innerHTML = "";
        if (projectComments.length === 0) {
            commentsList.innerHTML = `<p class="text-xs text-slate-500 italic py-2">Nenhum comentário cadastrado ainda.</p>`;
        } else {
            projectComments.forEach(c => {
                const commentBox = document.createElement("div");
                commentBox.className = "p-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-xs space-y-1.5";
                commentBox.innerHTML = `
                    <div class="flex items-center justify-between text-[10px] text-slate-500">
                        <span class="font-bold text-accent-purple">${c.autor}</span>
                        <span>${new Date(c.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                    <p class="text-slate-300 leading-relaxed">${c.texto}</p>
                `;
                commentsList.appendChild(commentBox);
            });
        }
        
        commentsList.scrollTop = commentsList.scrollHeight;

    } catch (e) {
        commentsList.innerHTML = `<p class="text-xs text-rose-400">Falha ao buscar comentários: ${e.message}</p>`;
    }
}

async function handleCommentSubmit(e) {
    e.preventDefault();
    if (!currentProjectId) return;

    const authorInput = document.getElementById("comment-autor");
    const textInput = document.getElementById("comment-texto");
    const autor = authorInput.value.trim();
    const texto = textInput.value.trim();

    if (!autor || !texto) return;

    try {
        const newCommRef = db.collection("comentarios").doc();
        await newCommRef.set({
            id: newCommRef.id,
            id_projeto: currentProjectId,
            autor,
            texto,
            created_at: new Date().toISOString()
        });

        // Trigger updating the project's updated_at field as well
        await db.collection("projetos").doc(currentProjectId).update({
            updated_at: new Date().toISOString()
        });

        textInput.value = "";
        showToast("Comentário adicionado com sucesso!", "success");

        await loadComments(currentProjectId);
        await loadData(); // Reloads board

    } catch (err) {
        showToast("Erro ao enviar comentário: " + err.message, "error");
    }
}

// Copy Shareable Link
function copyShareLink() {
    if (!currentProjectId) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?project=${currentProjectId}`;

    navigator.clipboard.writeText(shareUrl).then(() => {
        showToast("Link do projeto copiado!", "success");
    }).catch(err => {
        console.error("Erro ao copiar link:", err);
        showToast("Não foi possível copiar o link automaticamente.", "error");
    });
}

// URL Params Deep Linking Routing
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get("project");
    if (projectId) {
        setTimeout(() => {
            const exists = projects.find(p => p.id === projectId);
            if (exists) {
                openDetails(projectId);
            }
        }, 500);
    }
}

// Beautiful Toast Notifications
function showToast(message, type = "info") {
    const toast = document.getElementById("toast");
    const icon = document.getElementById("toast-icon");
    const msgSpan = document.getElementById("toast-message");

    if (!toast || !icon || !msgSpan) return;

    msgSpan.textContent = message;
    toast.className = "fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-2xl transform transition-all duration-300 border text-white";
    
    if (type === "success") {
        toast.classList.add("bg-emerald-950", "border-emerald-500/20", "text-emerald-400");
        icon.className = "h-5 w-5 text-emerald-400";
        icon.setAttribute("data-lucide", "check-circle");
    } else if (type === "error") {
        toast.classList.add("bg-rose-950", "border-rose-500/20", "text-rose-400");
        icon.className = "h-5 w-5 text-rose-400";
        icon.setAttribute("data-lucide", "x-circle");
    } else if (type === "warning") {
        toast.classList.add("bg-amber-950", "border-amber-500/20", "text-amber-400");
        icon.className = "h-5 w-5 text-amber-400";
        icon.setAttribute("data-lucide", "alert-circle");
    } else {
        toast.classList.add("bg-slate-900", "border-slate-800", "text-slate-200");
        icon.className = "h-5 w-5 text-slate-400";
        icon.setAttribute("data-lucide", "info");
    }

    lucide.createIcons();

    toast.classList.remove("translate-y-20", "opacity-0");
    toast.classList.add("translate-y-0", "opacity-100");

    setTimeout(() => {
        toast.classList.remove("translate-y-0", "opacity-100");
        toast.classList.add("translate-y-20", "opacity-0");
    }, 3000);
}

// Aba Navigation
function switchTab(tabId) {
    const tabs = ['dashboard', 'solicitacoes', 'inventario', 'admin-panel'];
    
    tabs.forEach(t => {
        const tabBtn = document.getElementById(`tab-${t}`);
        const viewSection = document.getElementById(`view-${t}`);
        
        if (!tabBtn) return;
        
        if (t === tabId) {
            tabBtn.className = "flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition duration-200 bg-accent-purple/10 text-accent-purple border border-accent-purple/20";
            if (viewSection) viewSection.classList.remove("hidden");
        } else {
            tabBtn.className = "flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl text-slate-400 hover:text-white border border-transparent transition duration-200";
            if (viewSection) viewSection.classList.add("hidden");
        }
    });

    if (tabId === 'solicitacoes') {
        loadRequests();
    } else if (tabId === 'inventario') {
        loadInventoryAssets();
    } else if (tabId === 'admin-panel') {
        renderAdminPanel();
    }
}

// User role context enforcement
function applyUserContext() {
    const header = document.querySelector("header");
    const nav = document.querySelector("nav");
    const main = document.querySelector("main");

    if (!currentUser) {
        if (header) header.classList.add("hidden");
        if (nav) nav.classList.add("hidden");
        if (main) main.classList.add("hidden");
        return;
    }

    if (header) header.classList.remove("hidden");
    if (nav) nav.classList.remove("hidden");
    if (main) main.classList.remove("hidden");

    const isAdm = currentUser.role === 'Administrador';
    const tabAdmin = document.getElementById("tab-admin-panel");
    const btnFilial = document.getElementById("btn-create-filial");
    const btnProj = document.getElementById("btn-create-projeto");

    if (tabAdmin) {
        if (isAdm) tabAdmin.classList.remove("hidden");
        else tabAdmin.classList.add("hidden");
    }
    if (btnFilial) {
        if (isAdm) btnFilial.classList.remove("hidden");
        else btnFilial.classList.add("hidden");
    }
    if (btnProj) {
        if (isAdm) btnProj.classList.remove("hidden");
        else btnProj.classList.add("hidden");
    }

    const adminView = document.getElementById("view-admin-panel");
    if (adminView && !adminView.classList.contains("hidden") && !isAdm) {
        switchTab("dashboard");
    }

    // Perfil do operador
    const profileWidget = document.getElementById("user-profile-widget");
    const switcherContainer = document.getElementById("user-switcher-container");
    const loginTriggerBtn = document.getElementById("btn-login-trigger");

    if (switcherContainer) switcherContainer.classList.add("hidden");
    if (loginTriggerBtn) loginTriggerBtn.classList.add("hidden");
    if (profileWidget) {
        profileWidget.classList.remove("hidden");
        profileWidget.classList.add("flex");
        
        const initials = currentUser.nome
            ? currentUser.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
            : "U";
        
        const initialsEl = document.getElementById("user-avatar-initials");
        const nameEl = document.getElementById("user-profile-name");
        const roleEl = document.getElementById("user-profile-role");
        
        if (initialsEl) initialsEl.textContent = initials;
        if (nameEl) nameEl.textContent = currentUser.nome;
        if (roleEl) roleEl.textContent = `(${currentUser.role})`;
    }

    const statusBtn = document.getElementById("btn-status");
    if (statusBtn) {
        statusBtn.classList.add("hidden");
    }

    populateFilters();
    populateBranchDropdowns();
    populateUserDropdowns();
    renderBoard();
    updateStats();
    
    const solicitacoesView = document.getElementById("view-solicitacoes");
    if (solicitacoesView && !solicitacoesView.classList.contains("hidden")) {
        loadRequests();
    }
    
    if (adminView && !adminView.classList.contains("hidden")) {
        renderAdminPanel();
    }

    renderInventoryAssets();
    updateInventoryStats();
}

// Authentication Session State changes
async function handleAuthSession(user) {
    if (user) {
        try {
            const userId = user.uid;
            
            // Buscar perfil no Firestore
            let doc = await db.collection("perfis").doc(userId).get();
            let profile = null;

            if (doc.exists) {
                profile = doc.data();
                profile.id = doc.id;
            } else {
                // Se o fluxo for de cadastro, aguarda a gravação pelo handleAuthSubmit
                if (isSigningUp) {
                    console.log("Fluxo de cadastro detectado. Aguardando gravação do perfil no Firestore...");
                    for (let i = 0; i < 30; i++) {
                        await new Promise(r => setTimeout(r, 100));
                        doc = await db.collection("perfis").doc(userId).get();
                        if (doc.exists) {
                            profile = doc.data();
                            profile.id = doc.id;
                            break;
                        }
                    }
                }

                if (!profile) {
                    console.warn("Perfil não encontrado no Firestore. Criando perfil padrão...");
                    const userName = user.displayName || user.email.split('@')[0] || 'Novo Usuário';
                    
                    // Verificar se é o primeiro usuário cadastrado na coleção 'perfis'
                    const profilesSnap = await db.collection("perfis").limit(1).get();
                    const isFirst = profilesSnap.empty;
                    
                    profile = {
                        id: userId,
                        nome: userName,
                        role: isFirst ? 'Administrador' : 'Colaborador',
                        email: user.email || '',
                        aprovado: isFirst ? true : false,
                        created_at: new Date().toISOString()
                    };
                    await db.collection("perfis").doc(userId).set(profile);
                }
            }

            if (!profile.aprovado) {
                const errorBox = document.getElementById("auth-error-box");
                const errorMsg = document.getElementById("auth-error-message");
                if (errorBox && errorMsg) {
                    errorMsg.textContent = "Acesso Pendente: Sua conta foi criada com sucesso, mas precisa ser liberada por um Administrador antes do primeiro acesso.";
                    errorBox.classList.remove("hidden");
                }
                showToast("Sua conta está pendente de aprovação por um Administrador.", "warning");
                
                currentUser = null;
                await auth.signOut();
                return;
            }

            currentUser = profile;
            
            // Ocultar modal de auth
            const modalAuth = document.getElementById("modal-auth");
            if (modalAuth) modalAuth.classList.add("hidden");
            
            applyUserContext();
            await loadData();
            
            showToast(`Sessão ativa: ${currentUser.nome}`, "success");
        } catch (e) {
            console.error("Falha ao carregar perfil autenticado:", e);
            const modalAuth = document.getElementById("modal-auth");
            const errorBox = document.getElementById("auth-error-box");
            const errorMsg = document.getElementById("auth-error-message");
            if (modalAuth) modalAuth.classList.remove("hidden");
            if (errorBox) errorBox.classList.remove("hidden");
            if (errorMsg) errorMsg.textContent = e.message;
            showToast(e.message, "error");
        }
    } else {
        currentUser = null;
        applyUserContext();
        
        const modalAuth = document.getElementById("modal-auth");
        if (modalAuth) modalAuth.classList.remove("hidden");
        
        const profileWidget = document.getElementById("user-profile-widget");
        const switcherContainer = document.getElementById("user-switcher-container");
        if (profileWidget) {
            profileWidget.classList.add("hidden");
            profileWidget.classList.remove("flex");
        }
        if (switcherContainer) switcherContainer.classList.add("hidden");
        
        const statusBtn = document.getElementById("btn-status");
        if (statusBtn) statusBtn.classList.add("hidden");
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();

    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value;
    const nome = document.getElementById("auth-name").value.trim();
    
    const errorBox = document.getElementById("auth-error-box");
    const errorMessage = document.getElementById("auth-error-message");
    const submitBtn = document.getElementById("auth-submit-btn");
    const spinner = document.getElementById("auth-btn-spinner");
    const btnText = document.getElementById("auth-btn-text");

    if (!errorBox || !errorMessage || !submitBtn || !spinner || !btnText) return;

    errorBox.classList.add("hidden");
    
    submitBtn.disabled = true;
    spinner.classList.remove("hidden");
    btnText.textContent = authMode === 'login' ? "Conectando..." : "Registrando...";

    try {
        if (!auth) {
            throw new Error("Cliente Firebase Auth não inicializado. Verifique as configurações.");
        }

        if (authMode === 'login') {
            await auth.signInWithEmailAndPassword(email, password);
        } else {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            if (nome) {
                await user.updateProfile({ displayName: nome });
            }
            
            // Verificar se é o primeiro usuário cadastrado
            const profilesSnap = await db.collection("perfis").limit(1).get();
            const isFirst = profilesSnap.empty;
            
            const newProfile = {
                id: user.uid,
                nome: nome || email.split('@')[0],
                email: email,
                role: isFirst ? "Administrador" : "Colaborador",
                aprovado: isFirst ? true : false,
                created_at: new Date().toISOString()
            };
            
            await db.collection("perfis").doc(user.uid).set(newProfile);
            
            if (isFirst) {
                showToast("Conta de Administrador criada com sucesso!", "success");
            } else {
                showToast("Conta criada! Aguarde a liberação do Administrador.", "warning");
                errorMessage.textContent = "Cadastro concluído! Sua conta está pendente de liberação por um Administrador antes do primeiro acesso.";
                errorBox.classList.remove("hidden");
                await auth.signOut();
            }
        }
    } catch (error) {
        console.error("Erro na autenticação:", error);
        errorMessage.textContent = error.message || "Ocorreu um erro inesperado.";
        errorBox.classList.remove("hidden");
    } finally {
        submitBtn.disabled = false;
        spinner.classList.add("hidden");
        btnText.textContent = authMode === 'login' ? "Entrar no Sistema" : "Criar Conta e Acessar";
    }
}

async function handleLogout() {
    try {
        showToast("Encerrando sessão...", "info");
        await auth.signOut();
    } catch (e) {
        showToast("Falha ao desconectar: " + e.message, "error");
    }
}

function toggleAuthMode() {
    const title = document.getElementById("auth-title");
    const subtitle = document.getElementById("auth-subtitle");
    const fieldName = document.getElementById("auth-field-name");
    const submitBtnText = document.getElementById("auth-btn-text");
    const toggleBtn = document.getElementById("auth-toggle-btn");
    const nameInput = document.getElementById("auth-name");
    const errorBox = document.getElementById("auth-error-box");
    
    if (!title || !subtitle || !fieldName || !submitBtnText || !toggleBtn || !nameInput || !errorBox) return;
    
    errorBox.classList.add("hidden");

    if (authMode === 'login') {
        authMode = 'signup';
        title.textContent = "Criar Conta";
        subtitle.textContent = "Cadastre-se para acessar o pipeline de filiais";
        fieldName.classList.remove("hidden");
        nameInput.required = true;
        submitBtnText.textContent = "Criar Conta e Acessar";
        toggleBtn.textContent = "Já tem uma conta? Fazer Login";
    } else {
        authMode = 'login';
        title.textContent = "Entrar no AlemaozinhoSystem32";
        subtitle.textContent = "Faça login para acessar o pipeline de filiais";
        fieldName.classList.add("hidden");
        nameInput.required = false;
        nameInput.value = "";
        submitBtnText.textContent = "Entrar no Sistema";
        toggleBtn.textContent = "Não tem uma conta? Cadastre-se";
    }
    
    lucide.createIcons();
}

function toggleAuthPasswordVisibility(e) {
    if (e) e.preventDefault();
    const passwordInput = document.getElementById("auth-password");
    const eyeIcon = document.getElementById("auth-eye-icon");
    const eyeOffIcon = document.getElementById("auth-eye-off-icon");

    if (!passwordInput || !eyeIcon || !eyeOffIcon) return;

    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        eyeIcon.classList.add("hidden");
        eyeOffIcon.classList.remove("hidden");
    } else {
        passwordInput.type = "password";
        eyeIcon.classList.remove("hidden");
        eyeOffIcon.classList.add("hidden");
    }
}

// Service Requests Modules
function openRequestModal() {
    const form = document.getElementById("request-form");
    if (form) form.reset();

    const fileLabel = document.getElementById("req-file-label");
    if (fileLabel) fileLabel.textContent = "Selecionar Foto";
    
    const reqFilial = document.getElementById("req-filial");
    if (!reqFilial) return;
    reqFilial.innerHTML = '<option value="">Selecione a Filial...</option>';

    let allowedBranches = branches;
    if (currentUser && currentUser.role === 'Colaborador') {
        const allowedBranchIds = userFiliais
            .filter(uf => uf.id_usuario === currentUser.id)
            .map(uf => uf.id_filial);
        allowedBranches = branches.filter(b => allowedBranchIds.includes(b.id));
    }

    allowedBranches.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b.id;
        opt.textContent = `${b.nome} (${b.cidade}/${b.estado})`;
        reqFilial.appendChild(opt);
    });

    const modal = document.getElementById("modal-request");
    if (modal) modal.classList.remove("hidden");
}

function closeRequestModal() {
    const modal = document.getElementById("modal-request");
    if (modal) modal.classList.add("hidden");
}

function updateRequestFileLabel() {
    const fileInput = document.getElementById("req-foto");
    const label = document.getElementById("req-file-label");
    if (fileInput && label) {
        if (fileInput.files.length > 0) {
            label.textContent = fileInput.files[0].name;
        } else {
            label.textContent = "Selecionar Foto";
        }
    }
}

async function handleRequestSubmit(e) {
    e.preventDefault();
    const titulo = document.getElementById("req-titulo").value.trim();
    const id_filial = document.getElementById("req-filial").value;
    const urgencia = document.getElementById("req-urgencia").value;
    const id_usuario_designado = document.getElementById("req-designado").value || null;
    const descricao = document.getElementById("req-descricao").value.trim();
    const fileInput = document.getElementById("req-foto");

    try {
        let url_foto = null;
        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            showToast("Fazendo upload da foto...", "info");
            url_foto = await uploadToFirebase(file);
        }

        const requestPayload = {
            titulo,
            id_filial,
            urgencia,
            descricao,
            url_foto,
            status: "Aguardando Triagem",
            justificativa_rejeicao: null,
            id_usuario_designado,
            created_at: new Date().toISOString()
        };

        const newReqRef = db.collection("solicitacoes").doc();
        await newReqRef.set({
            id: newReqRef.id,
            ...requestPayload
        });

        showToast("Solicitação enviada para triagem!", "success");
        closeRequestModal();
        await loadData();
        
        switchTab("solicitacoes");

    } catch (error) {
        showToast("Erro ao enviar solicitação: " + error.message, "error");
    }
}

async function loadRequests() {
    const container = document.getElementById("solicitacoes-container");
    if (!container) return;
    container.innerHTML = `<p class="text-xs text-slate-500 italic py-4">Carregando solicitações...</p>`;

    try {
        const snapSol = await db.collection("solicitacoes").get();
        solicitacoes = [];
        snapSol.forEach(doc => {
            const data = doc.data();
            const filialObj = branches.find(b => b.id === data.id_filial);
            solicitacoes.push({
                id: doc.id,
                ...data,
                filial_nome: filialObj ? filialObj.nome : "Filial Removida",
                filial_cidade: filialObj ? filialObj.cidade : "",
                filial_estado: filialObj ? filialObj.estado : ""
            });
        });
        solicitacoes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        let visibleRequests = solicitacoes;
        let allowedBranchIds = [];
        if (currentUser && currentUser.role === 'Colaborador') {
            allowedBranchIds = userFiliais
                .filter(uf => uf.id_usuario === currentUser.id)
                .map(uf => uf.id_filial);
            visibleRequests = solicitacoes.filter(s => allowedBranchIds.includes(s.id_filial));
        }

        const pendingCount = visibleRequests.filter(s => s.status === "Aguardando Triagem").length;
        const badge = document.getElementById("badge-solicitacoes-count");
        if (badge) {
            if (pendingCount > 0) {
                badge.textContent = pendingCount;
                badge.classList.remove("hidden");
            } else {
                badge.classList.add("hidden");
            }
        }

        container.innerHTML = "";
        if (visibleRequests.length === 0) {
            container.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                    <i data-lucide="inbox" class="h-8 w-8 mb-2 opacity-40"></i>
                    <span class="text-sm font-semibold">Nenhuma solicitação cadastrada</span>
                </div>
            `;
            return;
        }

        visibleRequests.forEach(req => {
            const card = createRequestCardDOM(req);
            container.appendChild(card);
        });

        lucide.createIcons();

    } catch (e) {
        container.innerHTML = `<p class="text-xs text-rose-400">Erro ao carregar solicitações: ${e.message}</p>`;
        console.error(e);
    }
}

function createRequestCardDOM(req) {
    const branch = branches.find(b => b.id === req.id_filial);
    const branchName = branch ? branch.nome : "Filial não cadastrada";
    const branchLoc = branch ? `${branch.cidade}/${branch.estado}` : "";

    let urgencyBadgeClass = "bg-slate-800/80 text-slate-400 border-slate-800";
    if (req.urgencia === "Média") urgencyBadgeClass = "bg-sky-950/40 text-sky-400 border-sky-500/10";
    else if (req.urgencia === "Alta") urgencyBadgeClass = "bg-amber-950/40 text-amber-400 border-amber-500/10";
    else if (req.urgencia === "Crítica") urgencyBadgeClass = "bg-rose-950/40 text-rose-400 border-rose-500/10";

    let statusBadgeClass = "bg-slate-800 text-slate-400 border-slate-700";
    if (req.status === "Aguardando Triagem") statusBadgeClass = "bg-amber-950/60 text-amber-400 border-amber-500/20 animate-pulse";
    else if (req.status === "Aprovada") statusBadgeClass = "bg-emerald-950/60 text-emerald-400 border-emerald-500/20";
    else if (req.status === "Rejeitada") statusBadgeClass = "bg-rose-950/60 text-rose-400 border-rose-500/20";

    const card = document.createElement("div");
    card.className = "glass rounded-2xl p-5 border border-white/5 flex flex-col gap-4 relative shadow-lg";

    const isAdmin = currentUser && currentUser.role === 'Administrador';

    card.innerHTML = `
        <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded border ${urgencyBadgeClass}">
                Urgência: ${req.urgencia}
            </span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded border ${statusBadgeClass}">
                ${req.status}
            </span>
        </div>

        <div>
            <h4 class="font-outfit font-extrabold text-lg text-slate-100">${req.titulo}</h4>
            <p class="text-xs text-slate-400 mt-2 leading-relaxed whitespace-pre-line">${req.descricao}</p>
        </div>

        ${req.url_foto ? `
            <div class="w-full h-32 overflow-hidden rounded-xl border border-white/5 bg-slate-950">
                <img src="${req.url_foto}" alt="Foto evidência" class="w-full h-full object-cover opacity-90">
            </div>
        ` : ""}

        <!-- Designated User Info -->
        ${(() => {
            const designatedUser = profiles.find(p => p.id === req.id_usuario_designado);
            const designatedName = designatedUser ? designatedUser.nome : "Não designado";
            return `
                <div class="flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-950 border border-white/5 px-3 py-1.5 rounded-xl self-start font-medium">
                    <i data-lucide="user" class="h-3.5 w-3.5 text-indigo-400"></i>
                    <span>Designado para: <strong class="text-white">${designatedName}</strong></span>
                </div>
            `;
        })()}

        <div class="flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-white/5">
            <span class="flex items-center gap-1 font-medium">
                <i data-lucide="building" class="h-3.5 w-3.5 text-slate-400"></i> ${branchName}
            </span>
            <span class="text-slate-400 font-semibold">${branchLoc}</span>
        </div>

        ${req.status === "Rejeitada" && req.justificativa_rejeicao ? `
            <div class="p-3 bg-rose-950/20 border border-rose-500/10 text-rose-400 text-xs rounded-xl flex flex-col gap-1">
                <span class="font-bold uppercase tracking-wider text-[9px]">Justificativa do Admin:</span>
                <p class="italic">"${req.justificativa_rejeicao}"</p>
            </div>
        ` : ""}

        ${req.status === "Aguardando Triagem" && isAdmin ? `
            <div class="flex gap-2 pt-2 border-t border-white/5">
                <button onclick="approveRequest('${req.id}')" class="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow transition">
                    <i data-lucide="check" class="h-3.5 w-3.5"></i> Aprovar
                </button>
                <button onclick="openRejectModal('${req.id}')" class="flex-1 flex items-center justify-center gap-1 text-xs font-bold py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow transition">
                    <i data-lucide="x" class="h-3.5 w-3.5"></i> Rejeitar
                </button>
            </div>
        ` : ""}
    `;

    return card;
}

async function approveRequest(id) {
    const req = solicitacoes.find(s => s.id === id);
    if (!req) return;

    if (!confirm(`Deseja aprovar e converter a solicitação "${req.titulo}" em um projeto ativo no Banco de Ideias?`)) return;

    try {
        const projectPayload = {
            titulo: req.titulo,
            descricao: req.descricao,
            id_filial: req.id_filial,
            urgencia: req.urgencia,
            status: "Banco de Ideias",
            url_foto: req.url_foto,
            status_bloqueado: false,
            motivo_bloqueio: null,
            id_usuario_designado: req.id_usuario_designado || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        await db.collection("solicitacoes").doc(id).update({ status: "Aprovada" });

        const newProjRef = db.collection("projetos").doc();
        await newProjRef.set({
            id: newProjRef.id,
            ...projectPayload
        });

        showToast("Solicitação aprovada e convertida em projeto com sucesso!", "success");
        await loadData();
        await loadRequests();

    } catch (e) {
        showToast("Erro ao aprovar solicitação: " + e.message, "error");
        console.error(e);
    }
}

function openRejectModal(id) {
    const form = document.getElementById("reject-form");
    if (form) form.reset();
    
    const reqIdInput = document.getElementById("reject-req-id");
    if (reqIdInput) reqIdInput.value = id;

    const modal = document.getElementById("modal-reject");
    if (modal) modal.classList.remove("hidden");
}

function closeRejectModal() {
    const modal = document.getElementById("modal-reject");
    if (modal) modal.classList.add("hidden");
}

async function handleRejectSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("reject-req-id").value;
    const justificativa = document.getElementById("reject-justificativa").value.trim();

    if (!id || !justificativa) return;

    try {
        await db.collection("solicitacoes").doc(id).update({
            status: "Rejeitada",
            justificativa_rejeicao: justificativa
        });

        showToast("Solicitação rejeitada e arquivada com justificativa.", "info");
        closeRejectModal();
        await loadRequests();

    } catch (err) {
        showToast("Erro ao rejeitar solicitação: " + err.message, "error");
        console.error(err);
    }
}

// Unified RBAC and Admin Panel Mappings
function renderAdminPanel() {
    const listContainer = document.getElementById("admin-users-list");
    if (!listContainer) return;
    listContainer.innerHTML = "";

    if (profiles.length === 0) {
        listContainer.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-8 text-center text-slate-500 italic">Nenhum usuário cadastrado.</td>
            </tr>
        `;
        return;
    }

    profiles.forEach(p => {
        let branchesListText = "";
        let isPending = false;
        if (p.role === "Administrador") {
            branchesListText = `<span class="text-accent-emerald bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/10 font-medium">Todas (Acesso Global)</span>`;
        } else {
            const mappedBranchIds = userFiliais
                .filter(uf => uf.id_usuario === p.id)
                .map(uf => uf.id_filial);
            
            const mappedBranchNames = branches
                .filter(b => mappedBranchIds.includes(b.id))
                .map(b => b.nome);
            
            if (mappedBranchNames.length === 0) {
                branchesListText = `<span class="text-rose-400 bg-rose-950/20 px-2 py-0.5 rounded border border-rose-500/10 font-medium">Nenhuma - Bloqueado</span>`;
                isPending = true;
            } else {
                branchesListText = mappedBranchNames.map(name => `<span class="inline-block bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded border border-white/5 text-xs mr-1.5 mb-1">${name}</span>`).join("");
            }
        }

        const roleBadge = p.role === "Administrador" 
            ? `<span class="bg-purple-950/40 text-accent-purple border border-accent-purple/10 px-2 py-0.5 rounded font-extrabold text-xs uppercase">Admin</span>`
            : `<span class="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded font-bold text-xs uppercase">Colaborador</span>`;

        const tr = document.createElement("tr");
        tr.className = "hover:bg-white/[0.02] transition duration-150";
        tr.innerHTML = `
            <td class="px-6 py-4 font-semibold text-white">
                <div class="flex items-center gap-2">
                    <span>${p.nome}</span>
                    ${isPending ? `<span class="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-1.5 py-0.5 rounded-md animate-pulse" title="Novo cadastro aguardando liberação de acesso"><i data-lucide="shield-alert" class="h-3 w-3"></i> PENDENTE</span>` : ""}
                </div>
            </td>
            <td class="px-6 py-4">${roleBadge}</td>
            <td class="px-6 py-4 max-w-xs md:max-w-md lg:max-w-lg flex flex-wrap gap-1">${branchesListText}</td>
            <td class="px-6 py-4 text-right">
                ${isPending ? `
                <button onclick="quickReleaseUserAccess('${p.id}', '${p.nome.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')" class="inline-flex items-center gap-1.5 text-xs font-bold bg-accent-emerald/15 hover:bg-accent-emerald/25 text-accent-emerald border border-accent-emerald/20 px-3 py-1.5 rounded-xl transition duration-150 shadow-sm shadow-accent-emerald/5 mr-2">
                    <i data-lucide="unlock" class="h-3.5 w-3.5"></i>
                    <span>Liberar Acesso</span>
                </button>
                ` : ""}
                <button onclick="openPermissionsModal('${p.id}')" class="inline-flex items-center gap-1.5 text-xs font-bold bg-accent-purple/15 hover:bg-accent-purple/25 text-accent-purple border border-accent-purple/20 px-3 py-1.5 rounded-xl transition duration-150 shadow-sm shadow-accent-purple/5">
                    <i data-lucide="shield" class="h-3.5 w-3.5"></i>
                    <span>Permissões</span>
                </button>
            </td>
        `;
        listContainer.appendChild(tr);
    });

    lucide.createIcons();
    
    // Refresh Central de Senhas Admin
    loadAdminPasswordCentral().catch(err => {
        console.error("Erro ao carregar central de senhas admin:", err);
    });
}

function openPermissionsModal(userId) {
    const user = profiles.find(u => u.id === userId);
    if (!user) return;

    document.getElementById("permissions-user-id").value = user.id;
    document.getElementById("permissions-user-name").textContent = `Editar: ${user.nome}`;
    document.getElementById("permissions-role").value = user.role;

    const filiaisListContainer = document.getElementById("permissions-filiais-list");
    if (!filiaisListContainer) return;
    filiaisListContainer.innerHTML = "";

    const allowedIds = userFiliais
        .filter(uf => uf.id_usuario === user.id)
        .map(uf => uf.id_filial);

    branches.forEach(b => {
        const item = document.createElement("div");
        item.className = "flex items-center space-x-2 py-1 select-none";
        
        const isChecked = allowedIds.includes(b.id);
        
        item.innerHTML = `
            <input type="checkbox" id="perm-branch-${b.id}" value="${b.id}" ${isChecked ? 'checked' : ''} class="h-4 w-4 rounded border-slate-800 text-accent-purple bg-slate-950 focus:ring-accent-purple focus:ring-offset-slate-950 cursor-pointer">
            <label for="perm-branch-${b.id}" class="text-xs font-semibold text-slate-300 cursor-pointer">
                ${b.nome} (${b.cidade}/${b.estado})
            </label>
        `;
        filiaisListContainer.appendChild(item);
    });

    const modal = document.getElementById("modal-permissions");
    if (modal) modal.classList.remove("hidden");
}

function closePermissionsModal() {
    const modal = document.getElementById("modal-permissions");
    if (modal) modal.classList.add("hidden");
}

async function handlePermissionsSubmit(e) {
    e.preventDefault();
    const userId = document.getElementById("permissions-user-id").value;
    const role = document.getElementById("permissions-role").value;

    const checkedCheckboxes = document.querySelectorAll("#permissions-filiais-list input[type='checkbox']:checked");
    const selectedBranchIds = Array.from(checkedCheckboxes).map(cb => cb.value);

    try {
        await db.collection("perfis").doc(userId).update({ 
            role,
            aprovado: true
        });

        // Clean user filial mappings and insert new ones
        const snap = await db.collection("usuario_filiais").where("id_usuario", "==", userId).get();
        const batch = db.batch();
        snap.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        if (selectedBranchIds.length > 0) {
            const saveBatch = db.batch();
            selectedBranchIds.forEach(branchId => {
                const newRef = db.collection("usuario_filiais").doc();
                saveBatch.set(newRef, {
                    id: newRef.id,
                    id_usuario: userId,
                    id_filial: branchId
                });
            });
            await saveBatch.commit();
        }

        showToast("Permissões de acesso salvas com sucesso!", "success");
        closePermissionsModal();
        await loadData();

        if (currentUser && currentUser.id === userId) {
            const updatedProfile = profiles.find(p => p.id === userId);
            if (updatedProfile) {
                currentUser = updatedProfile;
                applyUserContext();
            }
        }

    } catch (err) {
        showToast("Erro ao salvar permissões: " + err.message, "error");
        console.error(err);
    }
}

async function quickReleaseUserAccess(userId, userName) {
    try {
        // Marcar usuário como aprovado no Firestore
        await db.collection("perfis").doc(userId).update({ aprovado: true });

        // Clear all mappings
        const snap = await db.collection("usuario_filiais").where("id_usuario", "==", userId).get();
        const batch = db.batch();
        snap.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        if (branches.length > 0) {
            const saveBatch = db.batch();
            branches.forEach(b => {
                const newRef = db.collection("usuario_filiais").doc();
                saveBatch.set(newRef, {
                    id: newRef.id,
                    id_usuario: userId,
                    id_filial: b.id
                });
            });
            await saveBatch.commit();
        }

        showToast(`Acesso liberado com sucesso para ${userName}!`, "success");
        await loadData();

        if (currentUser && currentUser.id === userId) {
            const updatedProfile = profiles.find(p => p.id === userId);
            if (updatedProfile) {
                currentUser = updatedProfile;
                applyUserContext();
            }
        }
    } catch (err) {
        showToast("Erro ao liberar acesso rápido: " + err.message, "error");
        console.error(err);
    }
}

// Theme Manager Logic
function initTheme() {
    const savedTheme = localStorage.getItem("theme");
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    
    if (savedTheme === "light" || (!savedTheme && prefersLight)) {
        document.documentElement.classList.add("light-theme");
    } else {
        document.documentElement.classList.remove("light-theme");
    }
}

function toggleTheme() {
    const isLight = document.documentElement.classList.toggle("light-theme");
    localStorage.setItem("theme", isLight ? "light" : "dark");
    showToast(isLight ? "Modo Claro Ativado!" : "Modo Escuro Ativado!", "success");
}

// Close modals on backdrop click
function initModalClickOutside() {
    const modals = [
        { id: "modal-settings", closeFn: closeSettingsModal },
        { id: "modal-project", closeFn: closeProjectModal },
        { id: "modal-filial", closeFn: closeFilialModal },
        { id: "modal-details", closeFn: closeDetailsModal },
        { id: "modal-request", closeFn: closeRequestModal },
        { id: "modal-reject", closeFn: closeRejectModal },
        { id: "modal-permissions", closeFn: closePermissionsModal },
        { id: "modal-filial-panel", closeFn: closeFilialPanelModal },
        { id: "modal-credential", closeFn: closeCredentialModal },
        { id: "modal-hardware", closeFn: closeHardwareAssetModal },
        { id: "modal-asset-history", closeFn: closeAssetHistoryModal }
    ];
    
    modals.forEach(({ id, closeFn }) => {
        const modalEl = document.getElementById(id);
        if (modalEl) {
            modalEl.addEventListener("click", (e) => {
                if (e.target === modalEl) {
                    closeFn();
                }
            });
        }
    });
}

// ==========================================
// TECHNICAL CREDENTIALS & ACCESS WORKFLOW
// ==========================================
function isUserAuthorizedForFilial(filialId) {
    if (!currentUser) return false;
    if (currentUser.role === 'Administrador') return true;
    return userFiliais.some(uf => uf.id_usuario === currentUser.id && uf.id_filial === filialId);
}

// Open Filial Panel Modal
function openFilialPanel(filialId) {
    currentFilialId = filialId;
    const branch = branches.find(b => b.id === filialId);
    if (!branch) {
        showToast("Filial não encontrada", "error");
        return;
    }

    // Set panel info
    document.getElementById("filial-panel-title").textContent = `Painel da Filial: ${branch.nome}`;
    document.getElementById("filial-panel-location").querySelector("span").textContent = `${branch.cidade}/${branch.estado}`;

    // Reset to first tab
    switchFilialPanelTab('credenciais');

    // Toggle Admin export controls
    const adminExportControls = document.getElementById("admin-export-controls");
    if (adminExportControls) {
        if (currentUser && currentUser.role === 'Administrador') {
            adminExportControls.classList.remove("hidden");
        } else {
            adminExportControls.classList.add("hidden");
        }
    }

    // Load branch assets
    loadFilialCredentials(filialId);
    loadFilialHardware(filialId);

    // Show modal
    const modal = document.getElementById("modal-filial-panel");
    if (modal) modal.classList.remove("hidden");
    lucide.createIcons();
}

function closeFilialPanelModal() {
    const modal = document.getElementById("modal-filial-panel");
    if (modal) modal.classList.add("hidden");
}

// Switch between tabs in filial panel
function switchFilialPanelTab(tabId) {
    activeFilialPanelTab = tabId;
    const tabs = ['credenciais', 'hardware'];
    
    tabs.forEach(t => {
        const tabBtn = document.getElementById(`tab-filial-${t}`);
        const tabContent = document.getElementById(`content-filial-${t}`);
        
        if (!tabBtn) return;
        
        if (t === tabId) {
            tabBtn.className = "flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 border-accent-purple text-accent-purple";
            if (tabContent) tabContent.classList.remove("hidden");
        } else {
            tabBtn.className = "flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 border-transparent text-slate-400 hover:text-white transition duration-200";
            if (tabContent) tabContent.classList.add("hidden");
        }
    });

    if (tabId === 'hardware' && currentFilialId) {
        loadFilialHardware(currentFilialId);
    }
}

// Fetch and Render Credentials for active filial
async function loadFilialCredentials(filialId) {
    const tableBody = document.getElementById("filial-credenciais-list");
    const btnAddCred = document.getElementById("btn-add-credential");
    
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const authorized = isUserAuthorizedForFilial(filialId);

    if (authorized) {
        if (btnAddCred) btnAddCred.classList.remove("hidden");
    } else {
        if (btnAddCred) btnAddCred.classList.add("hidden");
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="px-4 py-8 text-center text-rose-400 font-semibold bg-slate-900/10">
                    <div class="flex flex-col items-center gap-2">
                        <i data-lucide="shield-alert" class="h-8 w-8 text-rose-500 animate-bounce"></i>
                        <span>Acesso Restrito: Apenas Administradores ou técnicos designados têm permissão para visualizar dados técnicos desta filial.</span>
                    </div>
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }

    try {
        const snap = await db.collection("ativos_credenciais").where("id_filial", "==", filialId).get();
        let creds = [];
        snap.forEach(doc => {
            const data = doc.data();
            creds.push({
                id: doc.id,
                ...data,
                senha_limpa: data.senha_criptografada ? atob(data.senha_criptografada) : ""
            });
        });
        creds.sort((a, b) => a.nome_identificador.localeCompare(b.nome_identificador));

        if (creds.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-4 py-8 text-center text-slate-400 bg-slate-900/10">
                        Nenhuma credencial ou ativo técnico cadastrado para esta filial.
                    </td>
                </tr>
            `;
            return;
        }

        creds.forEach(c => {
            const row = document.createElement("tr");
            row.className = "border-b border-white/5 hover:bg-slate-950/20 transition duration-150";
            
            const pwdCellId = `pwd-cell-${c.id}`;
            const eyeIconId = `eye-icon-${c.id}`;
            
            row.innerHTML = `
                <td class="px-4 py-3 font-semibold text-slate-200">
                    <span class="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-bold uppercase tracking-wider">${c.tipo_ativo}</span>
                </td>
                <td class="px-4 py-3 font-bold text-white">${c.nome_identificador}</td>
                <td class="px-4 py-3 font-mono text-slate-300">${c.ip_local || "-"}</td>
                <td class="px-4 py-3 font-mono text-slate-300">${c.ip_publico || "-"}</td>
                <td class="px-4 py-3 font-semibold text-slate-200">
                    <div class="flex items-center gap-1.5">
                        <span class="font-mono">${c.usuario_acesso || "-"}</span>
                        ${c.usuario_acesso ? `
                            <button onclick="copyToClipboard('${c.usuario_acesso}', 'Usuário copiado!')" class="p-1 text-slate-400 hover:text-white transition" title="Copiar Usuário">
                                <i data-lucide="copy" class="h-3 w-3"></i>
                            </button>
                        ` : ""}
                    </div>
                </td>
                <td class="px-4 py-3">
                    <div class="flex items-center gap-1.5 font-mono">
                        <span id="${pwdCellId}" class="text-slate-400 tracking-widest">••••••••</span>
                        <button onclick="revealPassword('${c.id}', '${c.senha_limpa.replace(/'/g, "\\'")}')" class="p-1 text-slate-400 hover:text-white transition" title="Revelar Senha">
                            <i id="${eyeIconId}" data-lucide="eye" class="h-3.5 w-3.5"></i>
                        </button>
                        <button onclick="copyPasswordWithLog('${c.id}', '${c.senha_limpa.replace(/'/g, "\\'")}')" class="p-1 text-slate-400 hover:text-white transition" title="Copiar Senha">
                            <i data-lucide="copy" class="h-3.5 w-3.5"></i>
                        </button>
                    </div>
                </td>
                <td class="px-4 py-3 text-slate-400 max-w-[200px] truncate" title="${c.observacoes || ''}">${c.observacoes || "-"}</td>
                <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                        <button onclick="openCredentialModal('${c.id}')" class="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition" title="Editar">
                            <i data-lucide="edit" class="h-3.5 w-3.5"></i>
                        </button>
                        <button onclick="deleteCredential('${c.id}')" class="p-1.5 bg-rose-950/40 hover:bg-rose-900 border border-rose-500/10 text-rose-400 hover:text-white rounded-lg transition" title="Excluir">
                            <i data-lucide="trash-2" class="h-3.5 w-3.5"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        lucide.createIcons();

    } catch (err) {
        showToast("Erro ao carregar credenciais: " + err.message, "error");
        console.error(err);
    }
}

// Reveal Password and log access
async function revealPassword(credId, clearTextPwd) {
    const span = document.getElementById(`pwd-cell-${credId}`);
    const iconBtn = document.getElementById(`eye-icon-${credId}`);
    
    if (!span || !iconBtn) return;
    
    const isMasked = span.textContent === "••••••••";
    
    if (isMasked) {
        span.textContent = clearTextPwd;
        span.classList.remove("text-slate-400", "tracking-widest");
        span.classList.add("text-accent-fuchsia", "font-bold");
        
        iconBtn.setAttribute("data-lucide", "eye-off");
        lucide.createIcons();
        
        await logCredentialAccess(credId, "Visualização");
    } else {
        span.textContent = "••••••••";
        span.classList.remove("text-accent-fuchsia", "font-bold");
        span.classList.add("text-slate-400", "tracking-widest");
        
        iconBtn.setAttribute("data-lucide", "eye");
        lucide.createIcons();
    }
}

// Helper to copy standard texts
function copyToClipboard(text, successMsg) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg, "success");
    }).catch(err => {
        showToast("Falha ao copiar texto", "error");
    });
}

// Copy Password and log access
async function copyPasswordWithLog(credId, clearTextPwd) {
    navigator.clipboard.writeText(clearTextPwd).then(async () => {
        showToast("Senha copiada para a área de transferência!", "success");
        await logCredentialAccess(credId, "Cópia");
    }).catch(err => {
        showToast("Falha ao copiar senha", "error");
    });
}

// Log Technical Credential Access
async function logCredentialAccess(credId, actionType) {
    if (!currentUser) return;
    
    try {
        await db.collection("logs_visualizacao_credenciais").add({
            id_credencial: credId,
            id_usuario: currentUser.id,
            usuario_nome: currentUser.nome,
            tipo_acao: actionType,
            created_at: new Date().toISOString()
        });
        console.log(`Security Log: ${actionType} registrada para credencial ${credId} pelo operador ${currentUser.nome}`);
    } catch (err) {
        console.error("Falha ao registrar log de acesso de segurança:", err);
    }
}

// Open Credential Create/Edit Modal
async function openCredentialModal(credId = null) {
    const form = document.getElementById("credential-form");
    if (form) form.reset();

    document.getElementById("cred-filial-id").value = currentFilialId;
    document.getElementById("cred-id").value = credId || "";

    if (credId) {
        document.getElementById("modal-credential-title").textContent = "Editar Credencial";
        try {
            const doc = await db.collection("ativos_credenciais").doc(credId).get();
            if (doc.exists) {
                const cred = doc.data();
                cred.id = doc.id;
                cred.senha_limpa = cred.senha_criptografada ? atob(cred.senha_criptografada) : "";
                
                document.getElementById("cred-tipo").value = cred.tipo_ativo;
                document.getElementById("cred-nome").value = cred.nome_identificador;
                document.getElementById("cred-ip-local").value = cred.ip_local || "";
                document.getElementById("cred-ip-publico").value = cred.ip_publico || "";
                document.getElementById("cred-usuario").value = cred.usuario_acesso || "";
                document.getElementById("cred-senha").value = cred.senha_limpa || "";
                document.getElementById("cred-observacoes").value = cred.observacoes || "";
            }
        } catch (err) {
            showToast("Erro ao carregar dados da credencial: " + err.message, "error");
        }
    } else {
        document.getElementById("modal-credential-title").textContent = "Adicionar Credencial";
    }

    const modal = document.getElementById("modal-credential");
    if (modal) modal.classList.remove("hidden");
}

function closeCredentialModal() {
    const modal = document.getElementById("modal-credential");
    if (modal) modal.classList.add("hidden");
}

// Handle Credential Form Submission
async function handleCredentialSubmit(e) {
    e.preventDefault();
    
    const credId = document.getElementById("cred-id").value;
    const filialId = document.getElementById("cred-filial-id").value;
    const tipo = document.getElementById("cred-tipo").value;
    const nome = document.getElementById("cred-nome").value;
    const ipLocal = document.getElementById("cred-ip-local").value;
    const ipPublico = document.getElementById("cred-ip-publico").value;
    const usuario = document.getElementById("cred-usuario").value;
    const senha = document.getElementById("cred-senha").value;
    const observacoes = document.getElementById("cred-observacoes").value;

    try {
        const payload = {
            id_filial: filialId,
            tipo_ativo: tipo,
            nome_identificador: nome,
            ip_local: ipLocal,
            ip_publico: ipPublico,
            usuario_acesso: usuario,
            senha_criptografada: btoa(senha),
            observacoes: observacoes,
            updated_at: new Date().toISOString()
        };

        if (credId) {
            await db.collection("ativos_credenciais").doc(credId).update(payload);
        } else {
            const newCredRef = db.collection("ativos_credenciais").doc();
            await newCredRef.set({
                id: newCredRef.id,
                ...payload
            });
        }

        showToast("Credencial técnica gravada com sucesso!", "success");
        closeCredentialModal();
        loadFilialCredentials(filialId);

    } catch (err) {
        showToast("Erro ao gravar credencial: " + err.message, "error");
        console.error(err);
    }
}

// Delete Credential
async function deleteCredential(credId) {
    if (!confirm("Tem certeza de que deseja excluir permanentemente esta credencial técnica? Esta ação não pode ser desfeita.")) return;

    try {
        await db.collection("ativos_credenciais").doc(credId).delete();

        showToast("Credencial técnica excluída com sucesso!", "success");
        loadFilialCredentials(currentFilialId);

    } catch (err) {
        showToast("Erro ao excluir credencial: " + err.message, "error");
        console.error(err);
    }
}

// Admin-Only PDF and CSV Exports
async function exportTechnicalData(format) {
    if (!currentUser || currentUser.role !== 'Administrador') {
        showToast("Apenas Administradores podem exportar dados técnicos.", "error");
        return;
    }

    const branch = branches.find(b => b.id === currentFilialId);
    const branchName = branch ? branch.nome : "Filial";

    try {
        const snap = await db.collection("ativos_credenciais").where("id_filial", "==", currentFilialId).get();
        let creds = [];
        snap.forEach(doc => {
            const data = doc.data();
            creds.push({
                id: doc.id,
                ...data,
                senha_limpa: data.senha_criptografada ? atob(data.senha_criptografada) : ""
            });
        });
        creds.sort((a, b) => a.nome_identificador.localeCompare(b.nome_identificador));

        if (creds.length === 0) {
            showToast("Nenhum dado cadastrado para exportar.", "info");
            return;
        }

        if (format === 'csv') {
            let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
            csvContent += "Tipo;Identificador;IP Local;IP Público;Usuário;Senha;Observações;Última Atualização\n";
            
            creds.forEach(c => {
                const obs = (c.observacoes || "").replace(/;/g, ",").replace(/\n/g, " ");
                const updated = new Date(c.updated_at).toLocaleString("pt-BR");
                csvContent += `"${c.tipo_ativo}";"${c.nome_identificador}";"${c.ip_local || ""}";"${c.ip_publico || ""}";"${c.usuario_acesso || ""}";"${c.senha_limpa || ""}";"${obs}";"${updated}"\n`;
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Inventario_Tecnico_${branchName.replace(/\s+/g, '_')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast("Exportação CSV concluída!", "success");
            
            await logCredentialAccess("export-csv", "Exportação CSV");

        } else if (format === 'pdf') {
            const printWindow = window.open("", "_blank");
            
            const rowsHtml = creds.map(c => `
                <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                    <td style="padding: 8px; font-weight: bold; color: #475569;">${c.tipo_ativo}</td>
                    <td style="padding: 8px; font-weight: bold;">${c.nome_identificador}</td>
                    <td style="padding: 8px; font-family: monospace;">${c.ip_local || "-"}</td>
                    <td style="padding: 8px; font-family: monospace;">${c.ip_publico || "-"}</td>
                    <td style="padding: 8px; font-family: monospace;">${c.usuario_acesso || "-"}</td>
                    <td style="padding: 8px; font-family: monospace; font-weight: bold; color: #6d28d9;">${c.senha_limpa || "-"}</td>
                    <td style="padding: 8px; color: #64748b;">${c.observacoes || "-"}</td>
                </tr>
            `).join("");

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Relatório de Ativos Técnicos - ${branchName}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; }
                        h1 { font-size: 20px; font-weight: bold; margin-bottom: 5px; color: #0f172a; }
                        p { font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 25px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                        th { background-color: #f1f5f9; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
                        .footer { margin-top: 40px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; justify-content: space-between; }
                    </style>
                </head>
                <body>
                    <h1>Relatório Geral de Ativos Técnicos, IPs e Acessos</h1>
                    <p>Filial: <strong>${branchName}</strong> | Gerado em: ${new Date().toLocaleString("pt-BR")} | Confidencial - Uso Exclusivo da Administração</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Identificador</th>
                                <th>IP Local</th>
                                <th>IP Público</th>
                                <th>Usuário</th>
                                <th>Senha</th>
                                <th>Observações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                    <div class="footer">
                        <span>Alemaozinho Sistem - Gestão Tecnológica Homologada</span>
                        <span>Operador Responsável: ${currentUser.nome}</span>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            window.onafterprint = function() { window.close(); }
                        }
                    </script>
                </body>
                </html>
            `;
            printWindow.document.write(html);
            printWindow.document.close();
            
            await logCredentialAccess("export-pdf", "Exportação PDF");
        }
    } catch (err) {
        showToast("Erro ao exportar dados técnicos: " + err.message, "error");
        console.error(err);
    }
}

// ==========================================
// INVENTÁRIO GLOBAL DE HARDWARE MAPPING
// ==========================================
async function loadInventoryAssets() {
    try {
        if (!db) return;
        const snap = await db.collection("inventario_ativos").get();
        assets = [];
        snap.forEach(doc => {
            const data = doc.data();
            const hasAccess = currentUser && (currentUser.role === 'Administrador' || data.id_usuario_instalador === currentUser.id);
            assets.push({
                id: doc.id,
                ...data,
                senha_limpa: hasAccess ? (data.senha_criptografada ? atob(data.senha_criptografada) : "") : null
            });
        });
        assets.sort((a, b) => a.marca_modelo.localeCompare(b.marca_modelo));

        const btnCreateHW = document.getElementById("btn-create-hardware");
        if (btnCreateHW) {
            if (currentUser) btnCreateHW.classList.remove("hidden");
            else btnCreateHW.classList.add("hidden");
        }

        updateInventoryStats();
        populateInventoryFilters();
        renderInventoryAssets();

    } catch (err) {
        showToast("Erro ao carregar inventário de hardware: " + err.message, "error");
        console.error(err);
    }
}

function updateInventoryStats() {
    const total = assets.length;
    const disponivel = assets.filter(a => a.status === 'Disponível').length;
    const uso = assets.filter(a => a.status === 'Em Uso').length;
    const manutencao = assets.filter(a => a.status === 'Manutenção').length;
    const sucata = assets.filter(a => a.status === 'Sucata').length;

    const elTotal = document.getElementById("inv-stat-total");
    const elDisp = document.getElementById("inv-stat-disponivel");
    const elUso = document.getElementById("inv-stat-uso");
    const elManut = document.getElementById("inv-stat-manutencao");
    const elSuc = document.getElementById("inv-stat-sucata");

    if (elTotal) elTotal.textContent = total;
    if (elDisp) elDisp.textContent = disponivel;
    if (elUso) elUso.textContent = uso;
    if (elManut) elManut.textContent = manutencao;
    if (elSuc) elSuc.textContent = sucata;
}

function populateInventoryFilters() {
    const selectFilter = document.getElementById("inv-filter-filial");
    if (!selectFilter) return;

    selectFilter.innerHTML = `
        <option value="">Localização: Todas</option>
        <option value="central">Estoque Central (Livre)</option>
    `;

    branches.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b.id;
        opt.textContent = `${b.nome} (${b.cidade}/${b.estado})`;
        selectFilter.appendChild(opt);
    });
}

function renderInventoryAssets() {
    const container = document.getElementById("inv-assets-container");
    if (!container) return;

    container.innerHTML = "";

    const searchEl = document.getElementById("inv-filter-search");
    const catEl = document.getElementById("inv-filter-categoria");
    const statusEl = document.getElementById("inv-filter-status");
    const filialEl = document.getElementById("inv-filter-filial");

    if (!searchEl || !catEl || !statusEl || !filialEl) return;

    const searchVal = searchEl.value.toLowerCase().trim();
    const catVal = catEl.value;
    const statusVal = statusEl.value;
    const filialVal = filialEl.value;

    let filtered = [...assets];

    if (searchVal) {
        filtered = filtered.filter(a => 
            (a.codigo_patrimonio_ou_tag && a.codigo_patrimonio_ou_tag.toLowerCase().includes(searchVal)) ||
            (a.marca_modelo && a.marca_modelo.toLowerCase().includes(searchVal)) ||
            (a.numero_serie && a.numero_serie.toLowerCase().includes(searchVal))
        );
    }

    if (catVal) {
        filtered = filtered.filter(a => a.categoria === catVal);
    }

    if (statusVal) {
        filtered = filtered.filter(a => a.status === statusVal);
    }

    if (filialVal) {
        if (filialVal === "central") {
            filtered = filtered.filter(a => !a.id_filial_atual);
        } else {
            filtered = filtered.filter(a => a.id_filial_atual === filialVal);
        }
    }

    if (filtered.length === 0) {
        container.className = "flex justify-center items-center py-12 col-span-full";
        container.innerHTML = `
            <div class="glass rounded-xl p-8 border border-white/5 text-center max-w-sm">
                <i data-lucide="monitor-off" class="h-10 w-10 text-slate-500 mx-auto mb-3 animate-bounce"></i>
                <h4 class="font-outfit font-bold text-slate-300">Nenhum Ativo Encontrado</h4>
                <p class="text-xs text-slate-500 mt-1">Refine seus filtros de busca ou cadastre novos ativos.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    container.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";

    const isAdm = currentUser && currentUser.role === 'Administrador';

    filtered.forEach(a => {
        const branchObj = branches.find(b => b.id === a.id_filial_atual);
        const locationName = branchObj ? branchObj.nome : "Estoque Central";
        const hasPasswordAccess = isAdm || (currentUser && a.id_usuario_instalador === currentUser.id);
        const canEdit = isAdm || (currentUser && a.id_usuario_instalador === currentUser.id);
        
        let badgeColor = "bg-slate-800 text-slate-400 border-slate-700";
        if (a.status === 'Disponível') badgeColor = "bg-emerald-950/40 text-emerald-400 border-emerald-500/10";
        else if (a.status === 'Em Uso') badgeColor = "bg-purple-950/40 text-purple-400 border-purple-500/10";
        else if (a.status === 'Manutenção') badgeColor = "bg-amber-950/40 text-amber-400 border-amber-500/10";
        else if (a.status === 'Sucata') badgeColor = "bg-rose-950/40 text-rose-400 border-rose-500/10";

        const card = document.createElement("div");
        card.className = "glass glass-hover rounded-xl p-5 border border-white/5 flex flex-col justify-between transition-all duration-300 relative group";

        card.innerHTML = `
            <div>
                <!-- Status & Tag header -->
                <div class="flex items-center justify-between gap-2 mb-3">
                    <span class="text-[9px] font-extrabold px-2 py-0.5 rounded border ${badgeColor} uppercase tracking-wider">
                        ${a.status}
                    </span>
                    <span class="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wide bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg shadow-sm">
                        🏷️ ${a.codigo_patrimonio_ou_tag}
                    </span>
                </div>

                <!-- Asset Title -->
                <h4 class="font-outfit font-extrabold text-base text-white group-hover:text-accent-fuchsia transition duration-200">${a.marca_modelo}</h4>
                <p class="text-xs text-slate-400 mt-1 font-semibold flex items-center gap-1">
                    <i data-lucide="tag" class="h-3 w-3 text-slate-500"></i> Categoria: <span class="text-slate-300 font-bold">${a.categoria}</span>
                </p>

                <!-- Technical Details -->
                <div class="mt-4 pt-3 border-t border-white/5 space-y-1.5 text-xs text-slate-300">
                    <div class="flex justify-between font-mono">
                        <span class="text-slate-500 font-semibold">Série:</span>
                        <span class="text-slate-300 font-bold">${a.numero_serie || "-"}</span>
                    </div>
                    <div class="flex justify-between font-mono">
                        <span class="text-slate-500 font-semibold">Login / Usuário:</span>
                        <span class="text-slate-300 font-bold">${a.usuario_acesso || "-"}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-500 font-semibold">Local:</span>
                        <span class="text-slate-200 font-bold flex items-center gap-1">
                            <i data-lucide="building" class="h-3 w-3 text-accent-purple"></i> ${locationName}
                        </span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-500 font-semibold">Valor Estimado:</span>
                        <span class="text-slate-300 font-bold">R$ ${(a.valor_estimado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    
                    <!-- Password Field Row -->
                    ${hasPasswordAccess ? `
                        <div class="flex justify-between items-center font-mono mt-1.5 pt-1.5 border-t border-white/5">
                            <span class="text-slate-500 font-semibold text-xs">Senha:</span>
                            ${a.senha_limpa ? `
                                <div class="flex items-center gap-1.5">
                                    <span id="hard-pwd-cell-${a.id}" class="text-slate-400 tracking-widest text-xs">••••••••</span>
                                    <button onclick="revealHardwarePassword('${a.id}', '${a.senha_limpa.replace(/'/g, "\\'")}')" class="p-1 text-slate-400 hover:text-white transition" title="Revelar Senha">
                                        <i id="hard-eye-icon-${a.id}" data-lucide="eye" class="h-3.5 w-3.5"></i>
                                    </button>
                                    <button onclick="copyHardwarePasswordWithLog('${a.id}', '${a.senha_limpa.replace(/'/g, "\\'")}')" class="p-1 text-slate-400 hover:text-white transition" title="Copiar Senha">
                                        <i data-lucide="copy" class="h-3.5 w-3.5"></i>
                                    </button>
                                </div>
                            ` : `
                                <span class="text-slate-500 italic text-[11px]">Não cadastrada</span>
                            `}
                        </div>
                    ` : `
                        <div class="flex justify-between items-center font-mono mt-1.5 pt-1.5 border-t border-white/5">
                            <span class="text-slate-500 font-semibold text-xs">Senha:</span>
                            <span class="text-rose-400 text-[10px] font-bold flex items-center gap-1 bg-rose-950/20 border border-rose-500/10 px-1.5 py-0.5 rounded" title="Apenas Administradores ou o Instalador deste equipamento podem visualizar esta senha.">
                                <i data-lucide="lock" class="h-3 w-3"></i> Acesso Restrito
                            </span>
                        </div>
                    `}
                </div>

                <!-- Extra Notes -->
                ${a.notas ? `
                    <div class="mt-3.5 p-2 bg-slate-900/50 rounded-lg border border-white/5 text-[11px] text-slate-400 leading-relaxed italic">
                        ${a.notas}
                    </div>
                ` : ""}
            </div>

            <!-- Footer Action Controls -->
            <div class="flex items-center justify-between border-t border-white/5 mt-5 pt-3.5 gap-2">
                <button onclick="openAssetHistoryModal('${a.id}')" class="flex items-center space-x-1.5 text-[11px] font-bold px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg transition" title="Ver Histórico de Movimentação">
                    <i data-lucide="history" class="h-3.5 w-3.5"></i>
                    <span>Histórico</span>
                </button>

                <div class="flex gap-1.5">
                    ${canEdit ? `
                        <button onclick="openHardwareAssetModal('${a.id}')" class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition" title="Editar Ativo">
                            <i data-lucide="edit" class="h-3.5 w-3.5"></i>
                        </button>
                    ` : ""}
                    ${isAdm ? `
                        <button onclick="deleteHardwareAsset('${a.id}')" class="p-2 bg-rose-950/40 hover:bg-rose-900 border border-rose-500/10 text-rose-400 hover:text-white rounded-lg transition" title="Excluir Ativo">
                            <i data-lucide="trash-2" class="h-3.5 w-3.5"></i>
                        </button>
                    ` : ""}
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    lucide.createIcons();
}

function openHardwareAssetModal(assetId = null) {
    const form = document.getElementById("hardware-form");
    if (form) form.reset();

    const branchSelect = document.getElementById("hard-filial");
    if (branchSelect) {
        branchSelect.innerHTML = `<option value="">Estoque Central (Livre)</option>`;
        branches.forEach(b => {
            const opt = document.createElement("option");
            opt.value = b.id;
            opt.textContent = `${b.nome} (${b.cidade}/${b.estado})`;
            branchSelect.appendChild(opt);
        });
    }

    document.getElementById("hard-id").value = assetId || "";

    const asset = assetId ? assets.find(a => a.id === assetId) : null;
    const isInstaller = asset ? asset.id_usuario_instalador === (currentUser ? currentUser.id : null) : true;
    const hasPasswordAccess = !assetId || (currentUser && (currentUser.role === 'Administrador' || isInstaller));
    const senhaInput = document.getElementById("hard-senha");

    if (senhaInput) {
        if (hasPasswordAccess) {
            senhaInput.disabled = false;
            senhaInput.placeholder = "Senha de acesso ao equipamento...";
            senhaInput.value = (asset && asset.senha_limpa) ? asset.senha_limpa : "";
        } else {
            senhaInput.disabled = true;
            senhaInput.placeholder = "🔒 Acesso Restrito (Instalador ou Admin)";
            senhaInput.value = "";
        }
    }

    if (assetId) {
        document.getElementById("modal-hardware-title").textContent = "Editar Ativo de Hardware";
        if (asset) {
            document.getElementById("hard-tag").value = asset.codigo_patrimonio_ou_tag;
            document.getElementById("hard-categoria").value = asset.categoria;
            document.getElementById("hard-marca-modelo").value = asset.marca_modelo;
            document.getElementById("hard-serial").value = asset.numero_serie || "";
            document.getElementById("hard-status").value = asset.status;
            document.getElementById("hard-filial").value = asset.id_filial_atual || "";
            document.getElementById("hard-data-aquisicao").value = asset.data_aquisicao || "";
            document.getElementById("hard-valor").value = asset.valor_estimado || "";
            document.getElementById("hard-notas").value = asset.notas || "";
            const loginInput = document.getElementById("hard-login");
            if (loginInput) loginInput.value = asset.usuario_acesso || "";
        }
    } else {
        document.getElementById("modal-hardware-title").textContent = "Cadastrar Ativo de Hardware";
    }

    const modal = document.getElementById("modal-hardware");
    if (modal) modal.classList.remove("hidden");
}

function closeHardwareAssetModal() {
    const modal = document.getElementById("modal-hardware");
    if (modal) modal.classList.add("hidden");
}

async function handleHardwareSubmit(e) {
    e.preventDefault();

    const assetId = document.getElementById("hard-id").value;
    const tag = document.getElementById("hard-tag").value;
    const categoria = document.getElementById("hard-categoria").value;
    const marcaModelo = document.getElementById("hard-marca-modelo").value;
    const serial = document.getElementById("hard-serial").value;
    const status = document.getElementById("hard-status").value;
    const filial = document.getElementById("hard-filial").value || null;
    const dataAquisicao = document.getElementById("hard-data-aquisicao").value || null;
    const valor = parseFloat(document.getElementById("hard-valor").value) || 0;
    const notas = document.getElementById("hard-notas").value;
    const senha = document.getElementById("hard-senha").value;
    const login = document.getElementById("hard-login") ? document.getElementById("hard-login").value.trim() : "";

    try {
        let oldAsset = assetId ? assets.find(a => a.id === assetId) : null;
        let isMovement = false;
        let statusOrigem = "Disponível";
        let statusDestino = status;
        let filialOrigemId = null;
        let filialDestinoId = filial;

        if (oldAsset) {
            statusOrigem = oldAsset.status;
            filialOrigemId = oldAsset.id_filial_atual;
            
            if (oldAsset.status !== status || oldAsset.id_filial_atual !== filial) {
                isMovement = true;
            }
        } else {
            isMovement = true;
            statusOrigem = "Inexistente (Cadastro)";
        }

        let savedAssetId = assetId;

        const isInstaller = oldAsset ? oldAsset.id_usuario_instalador === (currentUser ? currentUser.id : null) : true;
        const hasPasswordAccess = !assetId || (currentUser && (currentUser.role === 'Administrador' || isInstaller));
        
        let finalSenhaCrip = oldAsset ? oldAsset.senha_criptografada : null;
        if (hasPasswordAccess) {
            finalSenhaCrip = senha ? btoa(senha) : null;
        }

        const payload = {
            codigo_patrimonio_ou_tag: tag,
            categoria: categoria,
            marca_modelo: marcaModelo,
            numero_serie: serial,
            status: status,
            id_filial_atual: filial,
            data_aquisicao: dataAquisicao,
            valor_estimado: valor,
            notas: notas,
            usuario_acesso: login,
            senha_criptografada: finalSenhaCrip
        };

        if (assetId) {
            await db.collection("inventario_ativos").doc(assetId).update(payload);
        } else {
            const newRef = db.collection("inventario_ativos").doc();
            savedAssetId = newRef.id;
            await newRef.set({
                id: savedAssetId,
                ...payload,
                id_usuario_instalador: currentUser ? currentUser.id : "unknown",
                usuario_instalador_nome: currentUser ? currentUser.nome : "Operador",
                created_at: new Date().toISOString()
            });
        }

        // Write movement log to Firestore
        if (isMovement) {
            const origName = filialOrigemId ? (branches.find(b => b.id === filialOrigemId)?.nome || "Filial") : "Estoque Central";
            const destName = filialDestinoId ? (branches.find(b => b.id === filialDestinoId)?.nome || "Filial") : "Estoque Central";
            
            let desc = `Equipamento cadastrado com status inicial '${statusDestino}' no ${destName}.`;
            if (oldAsset) {
                desc = `Movimentação: Status alterado de '${statusOrigem}' para '${statusDestino}'. Localização: de '${origName}' para '${destName}'.`;
            }

            await db.collection("historico_ativos").add({
                id_ativo: savedAssetId,
                data_movimentacao: new Date().toISOString(),
                id_usuario: currentUser ? currentUser.id : "unknown",
                usuario_nome: currentUser ? currentUser.nome : "Operador",
                status_origem: statusOrigem,
                status_destino: statusDestino,
                filial_origem_id: filialOrigemId,
                filial_destino_id: filialDestinoId,
                descricao_acao: desc
            });
        }

        showToast("Ativo de hardware gravado com sucesso!", "success");
        closeHardwareAssetModal();
        await loadInventoryAssets();

    } catch (err) {
        showToast("Erro ao gravar ativo de hardware: " + err.message, "error");
        console.error(err);
    }
}

async function revealHardwarePassword(assetId, clearTextPwd) {
    const span = document.getElementById(`hard-pwd-cell-${assetId}`);
    const iconBtn = document.getElementById(`hard-eye-icon-${assetId}`);
    
    if (!span || !iconBtn) return;
    
    const isMasked = span.textContent === "••••••••";
    
    if (isMasked) {
        span.textContent = clearTextPwd;
        span.classList.remove("text-slate-400", "tracking-widest");
        span.classList.add("text-accent-fuchsia", "font-bold");
        
        iconBtn.setAttribute("data-lucide", "eye-off");
        lucide.createIcons();
        
        await logCredentialAccess(assetId, "Visualização Hardware");
    } else {
        span.textContent = "••••••••";
        span.classList.remove("text-accent-fuchsia", "font-bold");
        span.classList.add("text-slate-400", "tracking-widest");
        
        iconBtn.setAttribute("data-lucide", "eye");
        lucide.createIcons();
    }
}

async function copyHardwarePasswordWithLog(assetId, clearTextPwd) {
    navigator.clipboard.writeText(clearTextPwd).then(async () => {
        showToast("Senha do equipamento copiada!", "success");
        await logCredentialAccess(assetId, "Cópia Hardware");
    }).catch(err => {
        showToast("Falha ao copiar senha", "error");
    });
}

// Load Admin unified password central data
async function loadAdminPasswordCentral() {
    const listContainer = document.getElementById("admin-passwords-list");
    if (!listContainer) return;
    
    listContainer.innerHTML = `
        <tr>
            <td colspan="6" class="px-6 py-8 text-center text-slate-400">
                <span class="inline-block animate-spin mr-2">⏳</span> Carregando central de senhas...
            </td>
        </tr>
    `;
    
    try {
        let mappedCreds = [];
        let mappedAssets = [];
        
        const snapCreds = await db.collection("ativos_credenciais").get();
        snapCreds.forEach(doc => {
            const c = doc.data();
            const branch = branches.find(b => b.id === c.id_filial);
            const filialNome = branch ? branch.nome : "Filial";
            const clearPwd = c.senha_criptografada ? atob(c.senha_criptografada) : "";
            mappedCreds.push({
                id: doc.id,
                tipo: c.tipo_ativo,
                identificador: c.nome_identificador,
                local: filialNome,
                usuario: c.usuario_acesso || "-",
                senha_limpa: clearPwd,
                origem: "Credencial Técnica",
                isHardware: false
            });
        });
        
        const snapAssets = await db.collection("inventario_ativos").get();
        snapAssets.forEach(doc => {
            const a = doc.data();
            const branch = branches.find(b => b.id === a.id_filial_atual);
            const filialNome = branch ? branch.nome : "Estoque Central";
            const clearPwd = a.senha_criptografada ? atob(a.senha_criptografada) : "";
            mappedAssets.push({
                id: doc.id,
                tipo: a.categoria,
                identificador: `${a.marca_modelo} (${a.codigo_patrimonio_ou_tag})`,
                local: filialNome,
                usuario: a.usuario_acesso || "-",
                senha_limpa: clearPwd,
                origem: "Equipamento/Hardware",
                isHardware: true
            });
        });
        
        window.adminPasswordsList = [...mappedCreds, ...mappedAssets];
        
        const searchInput = document.getElementById("admin-pwd-search");
        if (searchInput && searchInput.value.trim()) {
            filterAdminPasswords();
        } else {
            renderAdminPasswordsTable(window.adminPasswordsList);
        }
        
    } catch (err) {
        listContainer.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-rose-500 font-semibold">
                    ❌ Erro ao carregar central de senhas: ${err.message}
                </td>
            </tr>
        `;
        console.error(err);
    }
}

// Render Admin unified passwords table rows
function renderAdminPasswordsTable(list) {
    const listContainer = document.getElementById("admin-passwords-list");
    if (!listContainer) return;
    
    listContainer.innerHTML = "";
    
    if (list.length === 0) {
        listContainer.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-slate-500 italic">Nenhuma senha ou acesso técnico encontrado.</td>
            </tr>
        `;
        return;
    }
    
    list.forEach((item, index) => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-white/[0.02] transition duration-150 border-b border-white/5";
        
        let typeBadgeColor = "bg-slate-800 text-slate-400 border-slate-700";
        if (item.tipo === "Servidor" || item.tipo === "Câmera/DVR" || item.tipo === "DVR/Câmeras") {
            typeBadgeColor = "bg-purple-950/40 text-accent-purple border-accent-purple/10";
        } else if (item.tipo === "Computador" || item.tipo === "Monitor") {
            typeBadgeColor = "bg-emerald-950/40 text-accent-emerald border-emerald-500/10";
        } else if (item.tipo === "Equipamento de Rede" || item.tipo === "Switch/Roteador") {
            typeBadgeColor = "bg-amber-950/40 text-amber-400 border-amber-500/10";
        }
        
        let originBadgeColor = "bg-indigo-950/40 text-indigo-400 border-indigo-500/10";
        if (item.isHardware) {
            originBadgeColor = "bg-fuchsia-950/40 text-accent-fuchsia border-accent-fuchsia/10";
        }
        
        tr.innerHTML = `
            <td class="px-6 py-4">
                <span class="text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${typeBadgeColor}">
                    ${item.tipo}
                </span>
            </td>
            <td class="px-6 py-4 font-semibold text-white">${item.identificador}</td>
            <td class="px-6 py-4">
                <span class="flex items-center gap-1.5 text-slate-300">
                    <i data-lucide="${item.isHardware && item.local === 'Estoque Central' ? 'archive' : 'building'}" class="h-3.5 w-3.5 text-slate-500"></i>
                    ${item.local}
                </span>
            </td>
            <td class="px-6 py-4 font-mono text-slate-300 text-xs">${item.usuario}</td>
            <td class="px-6 py-4">
                ${item.senha_limpa ? `
                    <div class="flex items-center gap-1.5 font-mono">
                        <span id="admin-pwd-cell-${index}" class="text-slate-400 tracking-widest text-xs">••••••••</span>
                        <button onclick="revealAdminCentralPassword('${item.id}', ${index}, '${item.senha_limpa.replace(/'/g, "\\'")}', ${item.isHardware})" class="p-1 text-slate-400 hover:text-white transition" title="Revelar Senha">
                            <i id="admin-eye-icon-${index}" data-lucide="eye" class="h-3.5 w-3.5"></i>
                        </button>
                        <button onclick="copyAdminCentralPassword('${item.id}', '${item.senha_limpa.replace(/'/g, "\\'")}', ${item.isHardware})" class="p-1 text-slate-400 hover:text-white transition" title="Copiar Senha">
                            <i data-lucide="copy" class="h-3.5 w-3.5"></i>
                        </button>
                    </div>
                ` : `
                    <span class="text-slate-500 italic text-[11px]">Sem senha</span>
                `}
            </td>
            <td class="px-6 py-4">
                <span class="text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${originBadgeColor}">
                    ${item.origem}
                </span>
            </td>
        `;
        listContainer.appendChild(tr);
    });
    
    lucide.createIcons();
}

async function revealAdminCentralPassword(id, idx, clearTextPwd, isHardware) {
    const span = document.getElementById(`admin-pwd-cell-${idx}`);
    const iconBtn = document.getElementById("admin-eye-icon-" + idx);
    
    if (!span || !iconBtn) return;
    
    const isMasked = span.textContent === "••••••••";
    
    if (isMasked) {
        span.textContent = clearTextPwd;
        span.classList.remove("text-slate-400", "tracking-widest");
        span.classList.add("text-accent-fuchsia", "font-bold");
        
        iconBtn.setAttribute("data-lucide", "eye-off");
        lucide.createIcons();
        
        if (isHardware) {
            await logCredentialAccess(id, "Visualização Central Admin (Hardware)");
        } else {
            await logCredentialAccess(id, "Visualização Central Admin (Credencial)");
        }
    } else {
        span.textContent = "••••••••";
        span.classList.remove("text-accent-fuchsia", "font-bold");
        span.classList.add("text-slate-400", "tracking-widest");
        
        iconBtn.setAttribute("data-lucide", "eye");
        lucide.createIcons();
    }
}

async function copyAdminCentralPassword(id, clearTextPwd, isHardware) {
    navigator.clipboard.writeText(clearTextPwd).then(async () => {
        showToast("Senha copiada!", "success");
        if (isHardware) {
            await logCredentialAccess(id, "Cópia Central Admin (Hardware)");
        } else {
            await logCredentialAccess(id, "Cópia Central Admin (Credencial)");
        }
    }).catch(err => {
        showToast("Falha ao copiar senha", "error");
    });
}

function filterAdminPasswords() {
    const query = document.getElementById("admin-pwd-search").value.toLowerCase().trim();
    if (!window.adminPasswordsList) return;
    
    if (!query) {
        renderAdminPasswordsTable(window.adminPasswordsList);
        return;
    }
    
    const filtered = window.adminPasswordsList.filter(item => 
        (item.tipo && item.tipo.toLowerCase().includes(query)) ||
        (item.identificador && item.identificador.toLowerCase().includes(query)) ||
        (item.local && item.local.toLowerCase().includes(query)) ||
        (item.usuario && item.usuario.toLowerCase().includes(query)) ||
        (item.origem && item.origem.toLowerCase().includes(query))
    );
    
    renderAdminPasswordsTable(filtered);
}

async function deleteHardwareAsset(assetId) {
    if (!confirm("Tem certeza de que deseja remover permanentemente este ativo de hardware do inventário? Esta ação excluirá também todo o histórico de movimentações.")) return;

    try {
        const snap = await db.collection("historico_ativos").where("id_ativo", "==", assetId).get();
        const batch = db.batch();
        snap.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        await db.collection("inventario_ativos").doc(assetId).delete();

        showToast("Ativo de hardware excluído com sucesso!", "success");
        await loadInventoryAssets();

    } catch (err) {
        showToast("Erro ao excluir ativo de hardware: " + err.message, "error");
        console.error(err);
    }
}

// Local Hardware Linkage Modules
async function loadFilialHardware(filialId) {
    const listContainer = document.getElementById("filial-hardware-list");
    const dropdownSelect = document.getElementById("filial-link-asset-dropdown");

    if (!listContainer || !dropdownSelect) return;

    listContainer.innerHTML = "";
    dropdownSelect.innerHTML = `<option value="">Selecione um ativo...</option>`;

    try {
        const snap = await db.collection("inventario_ativos").get();
        assets = [];
        snap.forEach(doc => {
            const data = doc.data();
            assets.push({ id: doc.id, ...data });
        });

        const branchAssets = assets.filter(a => a.id_filial_atual === filialId);
        const availableAssets = assets.filter(a => a.status === 'Disponível');

        if (branchAssets.length === 0) {
            listContainer.innerHTML = `
                <div class="col-span-2 glass rounded-xl p-6 border border-white/5 text-center text-slate-400">
                    Nenhum ativo de hardware alocado nesta filial.
                </div>
            `;
        } else {
            branchAssets.forEach(a => {
                const card = document.createElement("div");
                card.className = "glass rounded-xl p-4 border border-white/5 flex flex-col justify-between";
                
                let badgeColor = "bg-slate-800 text-slate-400 border-slate-700";
                if (a.status === 'Disponível') badgeColor = "bg-emerald-950/40 text-emerald-400 border-emerald-500/10";
                else if (a.status === 'Em Uso') badgeColor = "bg-purple-950/40 text-purple-400 border-purple-500/10";
                else if (a.status === 'Manutenção') badgeColor = "bg-amber-950/40 text-amber-400 border-amber-500/10";
                else if (a.status === 'Sucata') badgeColor = "bg-rose-950/40 text-rose-400 border-rose-500/10";

                card.innerHTML = `
                    <div>
                        <div class="flex items-center justify-between gap-1 mb-2">
                            <span class="text-[9px] font-bold px-2 py-0.5 rounded border ${badgeColor} uppercase tracking-wider">${a.status}</span>
                            <span class="text-[9px] font-mono text-slate-400 font-bold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg shadow-sm">🏷️ ${a.codigo_patrimonio_ou_tag}</span>
                        </div>
                        <h5 class="font-outfit font-bold text-sm text-white">${a.marca_modelo}</h5>
                        <p class="text-[11px] text-slate-400 mt-1">Categoria: <span class="font-semibold text-slate-300">${a.categoria}</span></p>
                        <p class="text-[11px] text-slate-400">Série: <span class="font-semibold text-slate-300">${a.numero_serie || "-"}</span></p>
                    </div>
                    <div class="mt-4 pt-2 border-t border-white/5 flex justify-end">
                        <button onclick="unlinkAssetFromFilial('${a.id}')" class="flex items-center space-x-1 text-[10px] font-bold px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900 border border-rose-500/10 text-rose-400 hover:text-white rounded-lg transition">
                            <i data-lucide="unlink" class="h-3 w-3"></i>
                            <span>Desvincular</span>
                        </button>
                    </div>
                `;
                listContainer.appendChild(card);
            });
        }

        availableAssets.forEach(a => {
            const opt = document.createElement("option");
            opt.value = a.id;
            opt.textContent = `[${a.codigo_patrimonio_ou_tag}] ${a.marca_modelo} (Série: ${a.numero_serie || "-"})`;
            dropdownSelect.appendChild(opt);
        });

        lucide.createIcons();
    } catch (err) {
        console.error(err);
    }
}

async function linkAssetToFilial() {
    const dropdownSelect = document.getElementById("filial-link-asset-dropdown");
    if (!dropdownSelect || !currentFilialId) return;

    const assetId = dropdownSelect.value;
    if (!assetId) {
        showToast("Por favor, selecione um ativo para vincular.", "warning");
        return;
    }

    const branch = branches.find(b => b.id === currentFilialId);
    const branchName = branch ? branch.nome : "Filial";

    try {
        const assetObj = assets.find(a => a.id === assetId);
        const oldStatus = assetObj ? assetObj.status : "Disponível";

        await db.collection("inventario_ativos").doc(assetId).update({
            id_filial_atual: currentFilialId,
            status: "Em Uso"
        });

        await db.collection("historico_ativos").add({
            id_ativo: assetId,
            data_movimentacao: new Date().toISOString(),
            id_usuario: currentUser ? currentUser.id : "unknown",
            usuario_nome: currentUser ? currentUser.nome : "Operador",
            status_origem: oldStatus,
            status_destino: "Em Uso",
            filial_origem_id: null,
            filial_destino_id: currentFilialId,
            descricao_acao: `Alocação de ativo: Equipamento vinculado à filial '${branchName}' e alterado status para 'Em Uso'.`
        });

        showToast("Equipamento vinculado com sucesso!", "success");
        await loadInventoryAssets();
        loadFilialHardware(currentFilialId);

    } catch (err) {
        showToast("Erro ao vincular equipamento: " + err.message, "error");
        console.error(err);
    }
}

async function unlinkAssetFromFilial(assetId) {
    if (!confirm("Deseja realmente desvincular este ativo desta filial? O equipamento será devolvido ao Estoque Central com status 'Disponível'.")) return;

    const branch = branches.find(b => b.id === currentFilialId);
    const branchName = branch ? branch.nome : "Filial";

    try {
        await db.collection("inventario_ativos").doc(assetId).update({
            id_filial_atual: null,
            status: "Disponível"
        });

        await db.collection("historico_ativos").add({
            id_ativo: assetId,
            data_movimentacao: new Date().toISOString(),
            id_usuario: currentUser ? currentUser.id : "unknown",
            usuario_nome: currentUser ? currentUser.nome : "Operador",
            status_origem: "Em Uso",
            status_destino: "Disponível",
            filial_origem_id: currentFilialId,
            filial_destino_id: null,
            descricao_acao: `Desalocação de ativo: Equipamento desvinculado da filial '${branchName}' e retornado ao Estoque Central como 'Disponível'.`
        });

        showToast("Equipamento desvinculado com sucesso!", "success");
        await loadInventoryAssets();
        loadFilialHardware(currentFilialId);

    } catch (err) {
        showToast("Erro ao desvincular equipamento: " + err.message, "error");
        console.error(err);
    }
}

// Hardware movements log timeline
async function openAssetHistoryModal(assetId) {
    const timelineContainer = document.getElementById("asset-history-timeline");
    const titleText = document.getElementById("modal-history-title");
    const subtitleText = document.getElementById("modal-history-subtitle");

    if (!timelineContainer || !titleText || !subtitleText) return;
    timelineContainer.innerHTML = "";

    const asset = assets.find(a => a.id === assetId);
    if (!asset) {
        showToast("Ativo de hardware não encontrado", "error");
        return;
    }

    titleText.textContent = `Histórico de Movimentação`;
    subtitleText.textContent = `[${asset.codigo_patrimonio_ou_tag}] ${asset.marca_modelo} (Série: ${asset.numero_serie || "-"})`;

    try {
        const snap = await db.collection("historico_ativos").where("id_ativo", "==", assetId).get();
        let history = [];
        snap.forEach(doc => {
            history.push({ id: doc.id, ...doc.data() });
        });

        history.sort((a, b) => new Date(b.data_movimentacao).getTime() - new Date(a.data_movimentacao).getTime());

        if (history.length === 0) {
            timelineContainer.innerHTML = `
                <div class="text-xs text-slate-500 italic py-4 pl-2">
                    Nenhum registro de movimentação encontrado para este ativo técnico.
                </div>
            `;
        } else {
            history.forEach(h => {
                const dateFormatted = new Date(h.data_movimentacao).toLocaleString("pt-BR");
                
                const item = document.createElement("div");
                item.className = "relative mb-6";
                
                item.innerHTML = `
                    <span class="absolute -left-10 top-1.5 h-3.5 w-3.5 rounded-full bg-accent-purple border-4 border-slate-950 flex items-center justify-center"></span>
                    <div class="bg-slate-900/50 border border-white/5 rounded-xl p-3 shadow-sm">
                        <div class="flex items-center justify-between gap-2 mb-1.5">
                            <span class="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                <i data-lucide="calendar" class="h-3 w-3 text-slate-500"></i> ${dateFormatted}
                            </span>
                            <span class="text-[10px] text-accent-purple font-extrabold flex items-center gap-1">
                                <i data-lucide="user" class="h-3 w-3"></i> ${h.usuario_nome}
                            </span>
                        </div>
                        <p class="text-xs text-slate-200 font-medium leading-relaxed">${h.descricao_acao}</p>
                        
                        <!-- Transição de Status Badge -->
                        <div class="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 text-[9px] text-slate-500 uppercase tracking-wide">
                            <span>Status:</span>
                            <span class="font-mono text-slate-400 font-bold">${h.status_origem}</span>
                            <i data-lucide="arrow-right" class="h-3 w-3 text-slate-600"></i>
                            <span class="font-mono text-white font-extrabold">${h.status_destino}</span>
                        </div>
                    </div>
                `;
                timelineContainer.appendChild(item);
            });
        }

        const modal = document.getElementById("modal-asset-history");
        if (modal) modal.classList.remove("hidden");
        lucide.createIcons();

    } catch (err) {
        showToast("Erro ao carregar histórico: " + err.message, "error");
        console.error(err);
    }
}

function closeAssetHistoryModal() {
    const modal = document.getElementById("modal-asset-history");
    if (modal) modal.classList.add("hidden");
}

function applyInventoryFilters() {
    renderInventoryAssets();
}
