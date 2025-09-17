// Aguarda o carregamento completo do DOM antes de executar o script
document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÃO DO GITHUB ---
    const GITHUB_USER = 'geysivancampos'; // Seu nome de usuário no GitHub
    const GITHUB_REPO = 'coletor-de-precos'; // O nome do seu repositório
    const DATA_FILE_PATH = 'dados.json'; // O arquivo que guardará os dados

    // --- ELEMENTOS DO DOM ---
    const form = document.getElementById('price-form');
    const formButton = form.querySelector('button[type="submit"]');
    const tableBody = document.querySelector('#data-table tbody');
    const uploadBtn = document.getElementById('upload-btn');
    const githubTokenInput = document.getElementById('github-token');
    const statusDiv = document.getElementById('status'); // div para mensagens de status

    // --- VARIÁVEIS ---
    let collectedData = [];
    let editingIndex = null;

    // --- QUANTIDADES PADRÃO DOS PRODUTOS ---
    const productQuantities = {
        "Café": "300 g",
        "Óleo": "750 g",
        "Açucar": "3 kg",
        "Manteiga": "750 g",
        "Farinha": "3 kg",
        "Arroz": "3,6 kg",
        "Feijão": "4,5 kg",
        "Leite": "6 L",
        "Banana": "90 unid",
        "Tomate": "12 kg",
        "Pão": "6 kg",
        "Carne Bovina": "6 kg"
    };

    // --- FUNÇÕES DE ARMAZENAMENTO ---
    function loadDataFromStorage() {
        const savedData = localStorage.getItem('priceData');
        if (savedData) {
            collectedData = JSON.parse(savedData);
            renderTable();
        }
    }

    function saveDataToStorage() {
        localStorage.setItem('priceData', JSON.stringify(collectedData));
    }

    // --- FUNÇÃO PARA RENDERIZAR A TABELA ---
    function renderTable() {
        tableBody.innerHTML = '';

        collectedData.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.produto}</td>
                <td>${entry.quantidade}</td>
                <td>${entry.zona}</td>
                <td>${entry.questionario}</td>
                <td>${entry.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td class="action-buttons">
                    <button class="btn-edit" data-index="${index}">Editar</button>
                    <button class="btn-delete" data-index="${index}">Excluir</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // --- FORMULÁRIO (ADICIONAR / EDITAR) ---
    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const entry = {
            produto: formData.get('produto'),
            zona: formData.get('zona'),
            questionario: formData.get('questionario'),
            preco: parseFloat(formData.get('preco'))
        };

        if (!entry.produto || !entry.zona || !entry.questionario || isNaN(entry.preco) || entry.preco <= 0) {
            alert('Por favor, preencha todos os campos corretamente. O preço deve ser um número positivo.');
            return;
        }

        entry.quantidade = productQuantities[entry.produto] || 'N/A';

        if (editingIndex !== null) {
            collectedData[editingIndex] = entry;
            editingIndex = null;
            formButton.textContent = 'Adicionar Preço';
        } else {
            collectedData.push(entry);
        }

        saveDataToStorage();
        renderTable();
        form.reset();
        document.getElementById('produto').focus();
    });

    // --- EDITAR / EXCLUIR ---
    tableBody.addEventListener('click', (event) => {
        const target = event.target;
        const index = parseInt(target.dataset.index, 10);

        if (target.classList.contains('btn-delete')) {
            if (confirm('Tem certeza que deseja excluir este item?')) {
                collectedData.splice(index, 1);
                saveDataToStorage();
                renderTable();
            }
        }

        if (target.classList.contains('btn-edit')) {
            const itemToEdit = collectedData[index];
            form.elements.produto.value = itemToEdit.produto;
            form.elements.zona.value = itemToEdit.zona;
            form.elements.questionario.value = itemToEdit.questionario;
            form.elements.preco.value = itemToEdit.preco;

            editingIndex = index;
            formButton.textContent = 'Atualizar Preço';
            form.scrollIntoView({ behavior: 'smooth' });
        }
    });

    // --- UPLOAD PARA O GITHUB ---
    async function uploadToGitHub() {
        const token = githubTokenInput.value.trim();
        if (!token) {
            alert('Por favor, insira seu GitHub Personal Access Token.');
            return;
        }

        if (collectedData.length === 0) {
            alert('Não há dados para enviar. Adicione alguns preços primeiro.');
            return;
        }

        const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${DATA_FILE_PATH}`;
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(collectedData, null, 2))));

        uploadBtn.textContent = 'Enviando...';
        uploadBtn.disabled = true;
        statusDiv.textContent = 'Enviando dados para o GitHub...';

        try {
            let sha = undefined;
            try {
                const getFileResponse = await fetch(apiUrl, {
                    headers: { 'Authorization': `token ${token}` }
                });
                if (getFileResponse.ok) {
                    const fileData = await getFileResponse.json();
                    sha = fileData.sha;
                }
            } catch (e) {
                console.warn('Arquivo ainda não existe. Será criado novo.');
            }

            const body = {
                message: `Atualiza dados da cesta básica - ${new Date().toISOString()}`,
                content: content,
                sha: sha
            };

            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                const fileUrl = `https://github.com/${GITHUB_USER}/${GITHUB_REPO}/blob/main/${DATA_FILE_PATH}`;
                statusDiv.innerHTML = `✅ Dados enviados com sucesso! <a href="${fileUrl}" target="_blank">Ver no GitHub</a>`;
            } else {
                const errorData = await response.json();
                throw new Error(`Erro ${response.status}: ${errorData.message}`);
            }

        } catch (error) {
            console.error('Falha no upload para o GitHub:', error);
            statusDiv.textContent = `❌ Erro ao enviar dados: ${error.message}`;
        } finally {
            uploadBtn.textContent = 'Enviar para o Painel';
            uploadBtn.disabled = false;
        }
    }

    // --- EVENTOS ---
    uploadBtn.addEventListener('click', uploadToGitHub);

    // --- INICIALIZAÇÃO ---
    loadDataFromStorage();
});
