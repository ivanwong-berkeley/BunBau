const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardCharts.tsx', 'utf8');

if (!code.includes('CashManagerChart')) {
  const newCharts = `

export function CashManagerChart({ data }: { data: any[] }) {
  const cashPos = data.filter(p => p.category === 'Cash');
  const csps = data.filter(p => p.category === 'CSP');
  const cspReserve = csps.reduce((sum, p) => sum + (p.metadata?.strikePrice * 100 * Math.abs(p.quantity || 1)), 0);
  
  const rawCash = cashPos.reduce((sum, p) => sum + p.value, 0);
  const freeCash = rawCash - cspReserve;

  const chartData = {
    labels: ['Free Cash', 'CSP Reserves'],
    datasets: [
      {
        data: [Math.max(0, freeCash), Math.max(0, cspReserve)],
        backgroundColor: ['#10B981', '#F59E0B'],
        borderWidth: 0,
      }
    ]
  };
  
  return (
    <div className="h-64 flex items-center justify-center">
      <Doughnut data={chartData} options={{ cutout: '70%', plugins: { legend: { position: 'right' as const, labels: { usePointStyle: true } } } }} />
    </div>
  );
}

export function EquitiesChart({ data }: { data: any[] }) {
  const equities = data.filter(p => p.category === 'Stock' || p.category === 'ETF');
  // Sort by value and take top 5, group rest into 'Other'
  equities.sort((a, b) => b.value - a.value);
  
  const top = equities.slice(0, 5);
  const otherValue = equities.slice(5).reduce((sum, p) => sum + p.value, 0);
  
  const labels = top.map(p => p.symbol);
  const values = top.map(p => p.value);
  if (otherValue > 0) {
    labels.push('Other');
    values.push(otherValue);
  }

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: ['#8B5CF6', '#3B82F6', '#14B8A6', '#F43F5E', '#F59E0B', '#64748B'],
        borderWidth: 0,
      }
    ]
  };
  
  return (
    <div className="h-64 flex items-center justify-center">
      <Doughnut data={chartData} options={{ cutout: '60%', plugins: { legend: { position: 'right' as const, labels: { usePointStyle: true } } } }} />
    </div>
  );
}

export function OptionsChart({ data }: { data: any[] }) {
  const csps = data.filter(p => p.category === 'CSP');
  const ccs = data.filter(p => p.category === 'Covered Call');
  
  const labels = [...csps, ...ccs].map(p => p.symbol);
  const values = [...csps, ...ccs].map(p => Math.abs(p.value)); // Visualizing premium at risk/liability
  
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Option Premium Value',
        data: values,
        backgroundColor: [...csps.map(() => '#F59E0B'), ...ccs.map(() => '#F43F5E')],
        borderRadius: 4,
      }
    ]
  };
  
  return (
    <div className="h-64">
      <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { display: true } }, x: { grid: { display: false } } } }} />
    </div>
  );
}
`;
  
  fs.writeFileSync('src/components/DashboardCharts.tsx', code + newCharts);
  console.log("Charts added.");
}
