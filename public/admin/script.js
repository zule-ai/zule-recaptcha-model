const API_URL = '/api/admin';

async function fetchStats() {
    try {
        const res = await fetch(`${API_URL}/stats`);
        const data = await res.json();

        // Update Stats
        document.getElementById('stat-total').innerText = data.stats.total;
        document.getElementById('stat-accuracy').innerText = data.stats.accuracy + '%';
        document.getElementById('stat-correct').innerText = data.stats.correct;
        document.getElementById('stat-incorrect').innerText = data.stats.incorrect;

        // Update Logs
        const tbody = document.getElementById('logs-table');
        tbody.innerHTML = data.recent.map(log => `
            <tr>
                <td>${new Date(log.timestamp).toLocaleTimeString()}</td>
                <td>${log.filename}</td>
                <td>${log.score.toFixed(4)}</td>
                <td class="${log.classification === 'CORRECT' ? 'status-valid' : 'status-invalid'}">
                    ${log.classification}
                </td>
                <td>${log.ip || '-'}</td>
            </tr>
        `).join('');

        // Update Chart
        updateChart(data.graph);

    } catch (err) {
        console.error('Failed to fetch stats', err);
    }
}

let chart;
function updateChart(graphData) {
    const ctx = document.getElementById('accuracyChart').getContext('2d');

    // Process data: array of 24h keys
    const labels = graphData.map(d => `${d._id}:00`);
    const counts = graphData.map(d => d.count);
    const accuracy = graphData.map(d => d.count > 0 ? (d.correct / d.count) * 100 : 0);

    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = accuracy;
        chart.data.datasets[1].data = counts;
        chart.update();
        return;
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Accuracy (%)',
                data: accuracy,
                borderColor: '#fff',
                tension: 0.4,
                yAxisID: 'y'
            }, {
                label: 'Traffic (req)',
                data: counts,
                backgroundColor: 'rgba(255,255,255,0.1)',
                type: 'bar',
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { labels: { color: '#ccc' } } },
            scales: {
                x: { ticks: { color: '#666' }, grid: { color: '#333' } },
                y: {
                    type: 'linear', display: true, position: 'left',
                    ticks: { color: '#666' }, grid: { color: '#333' },
                    max: 100
                },
                y1: {
                    type: 'linear', display: true, position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#666' }
                }
            }
        }
    });
}

async function clearLogs() {
    if (confirm('Are you sure you want to clear all logs?')) {
        await fetch(`${API_URL}/logs`, { method: 'DELETE' });
        fetchStats();
    }
}

// Poll every 5 seconds
setInterval(fetchStats, 5000);
fetchStats();
