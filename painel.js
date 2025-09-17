document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÃO DO GITHUB ---
    const GITHUB_USER = 'geysivancampos'; // Substitua pelo seu nome de usuário
    const GITHUB_REPO = 'coletor-de-precos'; // Substitua pelo nome do seu repositório
    const DATA_FILE_PATH = 'dados.json'; // O arquivo que guarda os dados

    // URL pública do arquivo de dados no GitHub Pages
    const dataUrl = `https://${GITHUB_USER}.github.io/${GITHUB_REPO}/${DATA_FILE_PATH}`;

    let allData = []; // Variável para guardar todos os dados

    // Função para buscar e processar os dados
    async function fetchDataAndBuildDashboard() {
        try {
            const response = await fetch(`${dataUrl}?cachebust=${new Date().getTime()}`);
            if (!response.ok) {
                throw new Error(`Não foi possível buscar os dados. Status: ${response.status}`);
            }
            allData = await response.json();

            // 1. Atualizar os KPIs
            updateKPIs(allData);

            // 2. Criar os gráficos
            createCompositionChart(allData);
            createZoneChart(allData);

        } catch (error) {
            console.error('Erro ao carregar o painel:', error);
            document.getElementById('total-cost').innerText = 'Erro ao carregar';
            document.getElementById('total-entries').innerText = 'Erro';
        }
    }

    // Função para atualizar os cards de destaque (KPIs)
    function updateKPIs(data) {
        const totalEntries = data.length;
        const totalCost = data.reduce((sum, item) => sum + item.preco, 0);

        document.getElementById('total-entries').innerText = totalEntries;
        document.getElementById('total-cost').innerText = totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // Função para criar o gráfico de composição de custos
    function createCompositionChart(data) {
        const costByProduct = data.reduce((acc, item) => {
            if (!acc[item.produto]) {
                acc[item.produto] = 0;
            }
            acc[item.produto] += item.preco;
            return acc;
        }, {});

        const ctx = document.getElementById('composition-chart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(costByProduct),
                datasets: [{
                    data: Object.values(costByProduct),
                    backgroundColor: [
                        '#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51',
                        '#6a4c93', '#ffb703', '#8ecae6', '#219ebc', '#023047'
                    ],
                    hoverOffset: 4
                }]
            }
        });
    }

    // Função para criar o gráfico de preço médio por zona
    function createZoneChart(data) {
        const priceByZone = data.reduce((acc, item) => {
            if (!acc[item.zona]) {
                acc[item.zona] = { total: 0, count: 0 };
            }
            acc[item.zona].total += item.preco;
            acc[item.zona].count++;
            return acc;
        }, {});

        const labels = Object.keys(priceByZone);
        const avgPrices = labels.map(zona => priceByZone[zona].total / priceByZone[zona].count);

        const ctx = document.getElementById('zone-chart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Preço Médio por Zona',
                    data: avgPrices,
                    backgroundColor: '#2a9d8f'
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Função para converter JSON para CSV e iniciar o download
    function downloadCSV() {
        if (allData.length === 0) {
            alert('Não há dados para descarregar.');
            return;
        }

        const headers = Object.keys(allData[0]); // pega as chaves do primeiro objeto
        const csvRows = [headers.join(',')]; // cabeçalho

        for (const row of allData) {
            const values = headers.map(header => {
                const escaped = ('' + row[header]).replace(/"/g, '\\"');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'dados_consolidados_cesta_basica.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Adiciona o evento de clique ao botão de download
    document.getElementById('download-csv-btn').addEventListener('click', downloadCSV);

    // Inicia tudo
    fetchDataAndBuildDashboard();
});
