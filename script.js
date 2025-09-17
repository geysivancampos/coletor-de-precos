// Aguarda o carregamento completo do DOM antes de executar o script
document.addEventListener('DOMContentLoaded', () => {
    // Seleção dos elementos do DOM
    const form = document.getElementById('price-form');
    const formButton = form.querySelector('button[type="submit"]');
    const downloadBtn = document.getElementById('download-btn');
    const tableBody = document.querySelector('#data-table tbody');

    // Array para armazenar os dados coletados
    let collectedData = [];
    // Variável para rastrear se estamos editando um item e qual é o seu índice
    let editingIndex = null;

    // Mapeamento de produtos para suas quantidades padrão
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

    // Função para carregar dados do localStorage quando a página abre
    function loadDataFromStorage() {
        const savedData = localStorage.getItem('priceData');
        if (savedData) {
            collectedData = JSON.parse(savedData);
            renderTable();
        }
    }

    // Função para salvar os dados no localStorage
    function saveDataToStorage() {
        localStorage.setItem('priceData', JSON.stringify(collectedData));
    }

    // Função para renderizar (desenhar) a tabela na tela
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

    // Função para converter o array de objetos para CSV
    function convertToCSV(data) {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const headerRow = headers.join(',');

        const rows = data.map(row => {
            return headers.map(header => {
                let cell = row[header] === null || row[header] === undefined ? '' : row[header];
                cell = String(cell).replace(/"/g, '""'); // Escapa aspas duplas
                return `"${cell}"`;
            }).join(',');
        });

        return [headerRow, ...rows].join('\n');
    }

    // Manipulador do evento de submissão do formulário (Adicionar ou Atualizar)
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
            // Se estiver editando, atualiza o item existente
            collectedData[editingIndex] = entry;
            editingIndex = null; // Sai do modo de edição
            formButton.textContent = 'Adicionar Preço'; // Restaura o texto do botão
        } else {
            // Se não, adiciona um novo item
            collectedData.push(entry);
        }

        saveDataToStorage();
        renderTable();
        form.reset();
        document.getElementById('produto').focus();
    });

    // Manipulador para os cliques nos botões de Editar e Excluir
    tableBody.addEventListener('click', (event) => {
        const target = event.target;
        const index = parseInt(target.dataset.index, 10);

        if (target.classList.contains('btn-delete')) {
            // Ação de Excluir
            if (confirm('Tem certeza que deseja excluir este item?')) {
                collectedData.splice(index, 1); // Remove o item do array
                saveDataToStorage();
                renderTable();
            }
        }

        if (target.classList.contains('btn-edit')) {
            // Ação de Editar
            const itemToEdit = collectedData[index];
            form.elements.produto.value = itemToEdit.produto;
            form.elements.zona.value = itemToEdit.zona;
            form.elements.questionario.value = itemToEdit.questionario;
            form.elements.preco.value = itemToEdit.preco;

            editingIndex = index; // Entra no modo de edição
            formButton.textContent = 'Atualizar Preço'; // Muda o texto do botão
            form.scrollIntoView({ behavior: 'smooth' }); // Rola a tela para o formulário
        }
    });

    // Manipulador do botão de download
    downloadBtn.addEventListener('click', () => {
        if (collectedData.length === 0) {
            alert('Não há dados para descarregar. Por favor, adicione alguns preços primeiro.');
            return;
        }
        const csvString = convertToCSV(collectedData);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        const timestamp = new Date().toISOString().slice(0, 10);
        link.setAttribute('download', `cesta_basica_precos_${timestamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Carrega os dados salvos ao iniciar
    loadDataFromStorage();
});
