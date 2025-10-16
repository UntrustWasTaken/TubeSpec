let components = [];

fetch('data/components.json')
  .then(response => response.json())
  .then(data => {
    components = data;
    populateManufacturerFilter();
    updateCount(components.length, components.length);
    applyFilters(); // show everything initially
  });

document.getElementById('searchBox').addEventListener('input', applyFilters);
document.getElementById('manufacturerFilter')?.addEventListener('change', applyFilters);
document.getElementById('invertingFilter')?.addEventListener('change', applyFilters);

function populateManufacturerFilter() {
  const manufacturerSelect = document.getElementById('manufacturerFilter');
  if (!manufacturerSelect) return;

  const manufacturers = [...new Set(components.map(c => c.manufacturer).filter(Boolean))];
  manufacturers.sort();

  manufacturers.forEach(m => {
    const option = document.createElement('option');
    option.value = m;
    option.textContent = m;
    manufacturerSelect.appendChild(option);
  });
}

function applyFilters() {
  const query = document.getElementById('searchBox').value.toLowerCase();

  const gainMin = parseFloat(document.getElementById('gainMin').value) || -Infinity;
  const gainMax = parseFloat(document.getElementById('gainMax').value) || Infinity;
  const snrMin = parseFloat(document.getElementById('snrMin').value) || -Infinity;
  const snrMax = parseFloat(document.getElementById('snrMax').value) || Infinity;
  const resMin = parseFloat(document.getElementById('resMin').value) || -Infinity;
  const resMax = parseFloat(document.getElementById('resMax').value) || Infinity;
  const diaMin = parseFloat(document.getElementById('diaMin').value) || -Infinity;
  const diaMax = parseFloat(document.getElementById('diaMax').value) || Infinity;

  const genMin = parseFloat(document.getElementById('genMin')?.value);
  const genMax = parseFloat(document.getElementById('genMax')?.value);

  const manufacturerFilter = document.getElementById('manufacturerFilter')?.value || '';
  const invertingFilter = document.getElementById('invertingFilter')?.value || '';

  const filtered = components.filter(comp => {
    const name = comp.name || "";
    const matchesText = name.toLowerCase().includes(query);

    const gain = typeof comp.gain === 'number' ? comp.gain : 0;
    const snr = typeof comp.snr === 'number' ? comp.snr : 0;
    const res = typeof comp.res === 'number' ? comp.res : 0;
    const diameter = typeof comp.diameter === 'number' ? comp.diameter : 0;
    const generation = comp.generation;

    const inverting = comp.inverting || "";
    const manufacturer = comp.manufacturer || "";

    const withinGain = gain >= gainMin && gain <= gainMax;
    const withinSNR = snr >= snrMin && snr <= snrMax;
    const withinResolution = res >= resMin && res <= resMax;
    const withinDiameter = diameter >= diaMin && diameter <= diaMax;

    // Exclude entries where generation is missing/null
    let withinGeneration = true;
    if (!isNaN(genMin) || !isNaN(genMax)) {
      if (generation === null || generation === undefined || isNaN(generation)) {
        withinGeneration = false;
      } else {
        const minBound = isNaN(genMin) ? -Infinity : genMin;
        const maxBound = isNaN(genMax) ? Infinity : genMax;
        withinGeneration = generation >= minBound && generation <= maxBound;
      }
    }

    const matchesManufacturer = !manufacturerFilter || manufacturer === manufacturerFilter;
    const matchesInverting = !invertingFilter || inverting === invertingFilter;

    return matchesText &&
           withinGain && withinSNR &&
           withinResolution && withinDiameter &&
           withinGeneration &&
           matchesManufacturer && matchesInverting;
  });

  updateCount(filtered.length, components.length);
  displayResults(filtered);
}


function updateCount(filteredCount, totalCount) {
  const container = document.getElementById('countContainer');
  container.textContent = `Showing ${filteredCount} of ${totalCount} items`;
}

function displayResults(results) {
  const container = document.getElementById('results');
  container.innerHTML = '';
  if (results.length === 0) {
    container.innerHTML = '<p>No results found.</p>';
    return;
  }

  results.forEach(comp => {
    const item = document.createElement('details');
    item.className = 'result';
    item.innerHTML = `
      <summary style="display: flex; justify-content: space-between; align-items: center;">
        <strong>${comp.name}</strong>
        <a href="specs.html?id=${encodeURIComponent(comp.id || comp.name)}" 
           title="View full specifications" 
           target="_blank" 
           rel="noopener noreferrer"
           style="text-decoration: none; margin-left: 10px; font-size: 1.2em;">
          ↗
        </a>
      </summary>
      <p>FOM: ${comp.fom ?? 'N/A'}</p>
      <p>SNR: ${comp.snr ?? 'N/A'}</p>
      <p>Resolution: ${comp.res ?? 'N/A'}</p>
      <p>Format: ${comp.format ?? 'N/A'}</p>
      <p>Diameter: ${comp.diameter ?? 'N/A'}</p>
      <p>Generation: ${comp.generation ?? 'N/A'}</p>
      <p>Inverting: ${comp.inverting ?? 'N/A'}</p>
      <p>Manufacturer: ${comp.manufacturer ?? 'N/A'}</p>
      <p>Comment: ${comp.comments ?? 'N/A'}</p>
    `;
    container.appendChild(item);
  });
}

function clearFilters() {
  const ids = [
    'searchBox', 'gainMin', 'gainMax', 'snrMin', 'snrMax',
    'resMin', 'resMax', 'diaMin', 'diaMax', 'genMin', 'genMax',
    'manufacturerFilter', 'invertingFilter'
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'SELECT') el.value = '';
    else el.value = '';
  });

  applyFilters();
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

let chartInstance = null;

function generateGraph() {
  const xVar = document.getElementById('xAxisSelect').value;
  const yVar = document.getElementById('yAxisSelect').value;

  if (!xVar || !yVar) {
    alert("Please select both X and Y axes.");
    return;
  }

  // Get currently filtered dataset
  const filtered = getFilteredComponents();

  const dataPoints = filtered
    .filter(c => typeof c[xVar] === 'number' && typeof c[yVar] === 'number')
    .map(c => ({
      x: c[xVar],
      y: c[yVar],
      label: c.name || c.id
    }));

  if (dataPoints.length === 0) {
    alert("No numeric data available for the selected axes.");
    return;
  }

  const ctx = document.getElementById('dataChart').getContext('2d');

  // Destroy previous chart
  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: `${xVar} vs ${yVar}`,
        data: dataPoints,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      scales: {
        x: { title: { display: true, text: xVar } },
        y: { title: { display: true, text: yVar } }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: context => {
              const p = context.raw;
              return `${p.label}: ${xVar}=${p.x}, ${yVar}=${p.y}`;
            }
          }
        },
        legend: { display: false }
      }
    }
  });
}

// Helper: returns the same filtered dataset that applyFilters uses
function getFilteredComponents() {
  const query = document.getElementById('searchBox').value.toLowerCase();

  const gainMin = parseFloat(document.getElementById('gainMin').value) || -Infinity;
  const gainMax = parseFloat(document.getElementById('gainMax').value) || Infinity;
  const snrMin = parseFloat(document.getElementById('snrMin').value) || -Infinity;
  const snrMax = parseFloat(document.getElementById('snrMax').value) || Infinity;
  const resMin = parseFloat(document.getElementById('resMin').value) || -Infinity;
  const resMax = parseFloat(document.getElementById('resMax').value) || Infinity;
  const diaMin = parseFloat(document.getElementById('diaMin').value) || -Infinity;
  const diaMax = parseFloat(document.getElementById('diaMax').value) || Infinity;
  const manufacturerFilter = document.getElementById('manufacturerFilter')?.value || '';
  const invertingFilter = document.getElementById('invertingFilter')?.value || '';

  return components.filter(comp => {
    const name = comp.name || "";
    const matchesText = name.toLowerCase().includes(query);

    const gain = typeof comp.gain === 'number' ? comp.gain : 0;
    const snr = typeof comp.snr === 'number' ? comp.snr : 0;
    const res = typeof comp.res === 'number' ? comp.res : 0;
    const diameter = typeof comp.diameter === 'number' ? comp.diameter : 0;
    const inverting = comp.inverting || "";
    const manufacturer = comp.manufacturer || "";

    const withinGain = gain >= gainMin && gain <= gainMax;
    const withinSNR = snr >= snrMin && snr <= snrMax;
    const withinResolution = res >= resMin && res <= resMax;
    const withinDiameter = diameter >= diaMin && diameter <= diaMax;
    const matchesManufacturer = !manufacturerFilter || manufacturer === manufacturerFilter;
    const matchesInverting = !invertingFilter || inverting === invertingFilter;

    return matchesText && withinGain && withinSNR &&
           withinResolution && withinDiameter &&
           matchesManufacturer && matchesInverting;
  });
}

