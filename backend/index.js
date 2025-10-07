const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Server-side constants
const MIN_AUTOMATION_HOURS_PER_INVOICE = 0.02;
const ERROR_RATE_AUTO = 0.0005; // 0.05%
const MIN_ROI_BOOST = 1.15;

// Simulation logic
function simulateROI(inputs) {
    const labor_cost_manual = inputs.num_ap_staff * inputs.hourly_wage * inputs.avg_hours_per_invoice * inputs.monthly_invoice_volume;
    const error_savings = (inputs.error_rate_manual / 100 - ERROR_RATE_AUTO) * inputs.monthly_invoice_volume * inputs.error_cost;
    const automated_cost_per_invoice = Math.max(inputs.avg_hours_per_invoice / 6, MIN_AUTOMATION_HOURS_PER_INVOICE) * inputs.hourly_wage * inputs.num_ap_staff;
    const auto_cost = inputs.monthly_invoice_volume * automated_cost_per_invoice + (inputs.one_time_implementation_cost || 0) / (inputs.time_horizon_months || 36);
    let monthly_savings = (labor_cost_manual + error_savings) - auto_cost;
    monthly_savings *= MIN_ROI_BOOST;

    const total_savings = monthly_savings * (inputs.time_horizon_months || 36);
    const payback_months = (inputs.one_time_implementation_cost || 0) / monthly_savings;
    const ROI_percent = ((total_savings - (inputs.one_time_implementation_cost || 0)) / (inputs.one_time_implementation_cost || 0)) * 100;

    return {
        labor_cost_manual: labor_cost_manual.toFixed(2),
        auto_cost: auto_cost.toFixed(2),
        monthly_savings: monthly_savings.toFixed(2),
        payback_months: payback_months.toFixed(1),
        ROI_percent: ROI_percent.toFixed(2)
    };
}

// Simulation endpoint
app.post('/simulate', (req, res) => {
    const result = simulateROI(req.body);
    res.json(result);
});

// Scenario CRUD
app.post('/scenarios', (req, res) => {
    const { name, data } = req.body;
    db.run(`INSERT OR REPLACE INTO scenarios (name, data) VALUES (?, ?)`, [name, JSON.stringify(data)], err => {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ message: 'Saved' });
    });
});

app.get('/scenarios', (req, res) => {
    db.all(`SELECT * FROM scenarios`, (err, rows) => {
        if (err) res.status(500).json({ error: err.message });
        else res.json(rows.map(r => ({ name: r.name, data: JSON.parse(r.data) })));
    });
});

app.delete('/scenarios/:name', (req, res) => {
    db.run(`DELETE FROM scenarios WHERE name = ?`, [req.params.name], err => {
        if (err) res.status(500).json({ error: err.message });
        else res.json({ message: 'Deleted' });
    });
});

// Start server
const PORT = 4000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
