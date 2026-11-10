/**
 * k6 HTML & JSON Test Reporting Utilities
 * Generates structured performance dashboards and exports metrics to /performance-testing/reports/
 */

export function generateHtmlReport(testName, data) {
  const metrics = data.metrics || {};
  const reqDuration = metrics.http_req_duration ? metrics.http_req_duration.values : {};
  const reqTotal = metrics.http_reqs ? metrics.http_reqs.values.count : 0;
  const reqRate = metrics.http_reqs ? metrics.http_reqs.values.rate.toFixed(2) : '0.00';
  const reqFailed = metrics.http_req_failed
    ? (metrics.http_req_failed.values.rate * 100).toFixed(2)
    : '0.00';
  const vusMax = metrics.vus_max
    ? metrics.vus_max.values.max
    : metrics.vus
      ? metrics.vus.values.value
      : 0;

  const avg = reqDuration.avg ? reqDuration.avg.toFixed(2) : '0.00';
  const med = reqDuration.med ? reqDuration.med.toFixed(2) : '0.00';
  const p90 = reqDuration['p(90)'] ? reqDuration['p(90)'].toFixed(2) : '0.00';
  const p95 = reqDuration['p(95)'] ? reqDuration['p(95)'].toFixed(2) : '0.00';
  const p99 = reqDuration['p(99)'] ? reqDuration['p(99)'].toFixed(2) : '0.00';
  const min = reqDuration.min ? reqDuration.min.toFixed(2) : '0.00';
  const max = reqDuration.max ? reqDuration.max.toFixed(2) : '0.00';

  const dataReceived = metrics.data_received
    ? (metrics.data_received.values.count / 1024 / 1024).toFixed(2)
    : '0.00';
  const dataSent = metrics.data_sent ? (metrics.data_sent.values.count / 1024).toFixed(2) : '0.00';

  const isFailedUnderThreshold = parseFloat(reqFailed) <= 1.0;
  const isP95UnderThreshold = parseFloat(p95) <= 500.0;
  const overallPassed = isFailedUnderThreshold && isP95UnderThreshold;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NAVRIX Performance Report - ${testName}</title>
  <style>
    :root {
      --bg: #070B14;
      --card-bg: #0D1424;
      --border: rgba(245, 184, 46, 0.24);
      --gold: #F5B82E;
      --gold-light: #FDE68A;
      --text: #F1F5F9;
      --text-muted: #94A3B8;
      --success: #10B981;
      --danger: #EF4444;
      --warning: #F59E0B;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      padding: 2rem 1.5rem;
      line-height: 1.5;
    }
    .container { max-width: 1100px; margin: 0 auto; }
    header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .brand-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--gold);
      letter-spacing: -0.02em;
    }
    .badge {
      display: inline-block;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-pass { background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.4); }
    .badge-fail { background: rgba(239, 68, 68, 0.15); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.4); }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 1.25rem;
      box-shadow: 0 8px 24px -6px rgba(0,0,0,0.5);
    }
    .card-label { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-bottom: 0.35rem; }
    .card-value { font-size: 1.85rem; font-weight: 800; color: var(--text); }
    .card-sub { font-size: 0.78rem; color: var(--text-muted); margin-top: 0.3rem; }
    .section-title { font-size: 1.2rem; font-weight: 700; color: var(--gold-light); margin-bottom: 1rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.88rem; }
    th { color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; }
    td:last-child, th:last-child { text-align: right; }
    .pill { padding: 0.2rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
    .pill-green { background: rgba(16, 185, 129, 0.2); color: var(--success); }
    .pill-red { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
    .footer { margin-top: 3rem; text-align: center; color: var(--text-muted); font-size: 0.8rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1.5rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <div class="brand-title">NAVRIX · Performance Engineering</div>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.25rem;">
          Scenario: <strong>${testName}</strong> · Generated at ${new Date().toISOString()}
        </p>
      </div>
      <div>
        <span class="badge ${overallPassed ? 'badge-pass' : 'badge-fail'}">
          ${overallPassed ? '✓ Meets Performance Targets' : '⚠ Threshold Exceeded'}
        </span>
      </div>
    </header>

    <div class="grid-4">
      <div class="card">
        <div class="card-label">Total Requests</div>
        <div class="card-value">${reqTotal.toLocaleString()}</div>
        <div class="card-sub">${reqRate} requests / sec</div>
      </div>
      <div class="card">
        <div class="card-label">Peak Concurrency</div>
        <div class="card-value">${vusMax} VUs</div>
        <div class="card-sub">Virtual user load</div>
      </div>
      <div class="card">
        <div class="card-label">P95 Response Time</div>
        <div class="card-value" style="color: ${parseFloat(p95) <= 500 ? 'var(--success)' : 'var(--warning)'};">${p95} ms</div>
        <div class="card-sub">Target: &lt; 500ms</div>
      </div>
      <div class="card">
        <div class="card-label">Failed Requests</div>
        <div class="card-value" style="color: ${parseFloat(reqFailed) <= 1.0 ? 'var(--success)' : 'var(--danger)'};">${reqFailed}%</div>
        <div class="card-sub">Target: &lt; 1.00%</div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 2rem;">
      <div class="section-title">Latency Percentiles &amp; Network Telemetry</div>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Measured Value</th>
            <th>Target SLA</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Average Latency</td>
            <td>${avg} ms</td>
            <td>&lt; 350 ms</td>
            <td><span class="pill ${parseFloat(avg) < 350 ? 'pill-green' : 'pill-red'}">${parseFloat(avg) < 350 ? 'PASSED' : 'CHECK'}</span></td>
          </tr>
          <tr>
            <td>Median Latency (P50)</td>
            <td>${med} ms</td>
            <td>&lt; 250 ms</td>
            <td><span class="pill ${parseFloat(med) < 250 ? 'pill-green' : 'pill-red'}">${parseFloat(med) < 250 ? 'PASSED' : 'CHECK'}</span></td>
          </tr>
          <tr>
            <td>90th Percentile (P90)</td>
            <td>${p90} ms</td>
            <td>&lt; 450 ms</td>
            <td><span class="pill ${parseFloat(p90) < 450 ? 'pill-green' : 'pill-red'}">${parseFloat(p90) < 450 ? 'PASSED' : 'CHECK'}</span></td>
          </tr>
          <tr>
            <td>95th Percentile (P95)</td>
            <td>${p95} ms</td>
            <td>&lt; 500 ms</td>
            <td><span class="pill ${parseFloat(p95) < 500 ? 'pill-green' : 'pill-red'}">${parseFloat(p95) < 500 ? 'PASSED' : 'CHECK'}</span></td>
          </tr>
          <tr>
            <td>99th Percentile (P99)</td>
            <td>${p99} ms</td>
            <td>&lt; 1000 ms</td>
            <td><span class="pill ${parseFloat(p99) < 1000 ? 'pill-green' : 'pill-red'}">${parseFloat(p99) < 1000 ? 'PASSED' : 'CHECK'}</span></td>
          </tr>
          <tr>
            <td>Min / Max Latency</td>
            <td>${min} ms / ${max} ms</td>
            <td>-</td>
            <td><span class="pill pill-green">RECORDED</span></td>
          </tr>
          <tr>
            <td>Network Bandwidth</td>
            <td>${dataReceived} MB Rx / ${dataSent} KB Tx</td>
            <td>-</td>
            <td><span class="pill pill-green">ACTIVE</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="footer">
      NAVRIX Enterprise Platform · Senior Performance Testing Suite · Generated by k6
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Standard k6 summary exporter hook
 */
export function createSummaryHandler(testName) {
  return function handleSummary(data) {
    const htmlReport = generateHtmlReport(testName, data);
    const jsonReport = JSON.stringify(data, null, 2);

    const safeName = testName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const htmlPath = `performance-testing/reports/${safeName}-report.html`;
    const jsonPath = `performance-testing/reports/${safeName}-summary.json`;

    const outputs = {};
    outputs[htmlPath] = htmlReport;
    outputs[jsonPath] = jsonReport;
    outputs['stdout'] = defaultTextSummary(data, testName);

    return outputs;
  };
}

function defaultTextSummary(data, testName) {
  const m = data.metrics || {};
  const reqTotal = m.http_reqs ? m.http_reqs.values.count : 0;
  const reqRate = m.http_reqs ? m.http_reqs.values.rate.toFixed(1) : 0;
  const failRate = m.http_req_failed ? (m.http_req_failed.values.rate * 100).toFixed(2) : 0;
  const d = m.http_req_duration ? m.http_req_duration.values : {};
  const p95 = d['p(95)'] ? d['p(95)'].toFixed(1) : 0;
  const p99 = d['p(99)'] ? d['p(99)'].toFixed(1) : 0;
  const avg = d.avg ? d.avg.toFixed(1) : 0;

  return `
================================================================================
  NAVRIX PERFORMANCE TEST SUMMARY: ${testName.toUpperCase()}
================================================================================
  Total Requests : ${reqTotal} (${reqRate} req/s)
  Failed Rate    : ${failRate}% (Target: < 1.00%)
  Average Latency: ${avg} ms
  P95 Latency    : ${p95} ms (Target: < 500 ms)
  P99 Latency    : ${p99} ms (Target: < 1000 ms)
================================================================================
`;
}
