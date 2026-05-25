import { useState } from 'react';
import { AlertTriangle, DollarSign, TrendingUp, Pause, Play } from 'lucide-react';
import { useAIStore } from '../../store/aiStore';

interface BudgetConfig {
  dailyLimit: number;
  monthlyLimit: number;
  warningThreshold: number;
  autoPause: boolean;
}

const DEFAULT_BUDGET: BudgetConfig = {
  dailyLimit: 5.00,
  monthlyLimit: 50.00,
  warningThreshold: 0.8,
  autoPause: true,
};

export default function CostGuardrails() {
  const usageSummary = useAIStore((s) => s.usageSummary);
  const [budget, setBudget] = useState<BudgetConfig>(DEFAULT_BUDGET);
  const [isPaused, setIsPaused] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todayCost = usageSummary.byDay[today]?.cost || 0;
  const todayTokens = usageSummary.byDay[today]?.tokens || 0;

  const thisMonth = today.slice(0, 7);
  let monthlyCost = 0;
  let monthlyTokens = 0;
  for (const [day, data] of Object.entries(usageSummary.byDay)) {
    if (day.startsWith(thisMonth)) {
      monthlyCost += data.cost;
      monthlyTokens += data.tokens;
    }
  }

  const dailyPct = budget.dailyLimit > 0 ? (todayCost / budget.dailyLimit) * 100 : 0;
  const monthlyPct = budget.monthlyLimit > 0 ? (monthlyCost / budget.monthlyLimit) * 100 : 0;

  const dailyWarning = dailyPct >= budget.warningThreshold * 100;
  const monthlyWarning = monthlyPct >= budget.warningThreshold * 100;
  const dailyExceeded = dailyPct >= 100;
  const monthlyExceeded = monthlyPct >= 100;

  const handleBudgetChange = (field: keyof BudgetConfig, value: number | boolean) => {
    setBudget((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="cost-guardrails">
      <div className="guardrails-header">
        <DollarSign size={16} />
        <h4>Cost Guardrails</h4>
        <button
          className={`btn-secondary small ${isPaused ? 'paused' : ''}`}
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? <><Play size={12} /> Resume AI</> : <><Pause size={12} /> Pause AI</>}
        </button>
      </div>

      {(dailyExceeded || monthlyExceeded) && (
        <div className="guardrail-alert">
          <AlertTriangle size={14} />
          <span>{dailyExceeded ? 'Daily' : 'Monthly'} budget exceeded!
            {budget.autoPause && ' AI requests paused.'}
          </span>
        </div>
      )}

      <div className="budget-bars">
        <div className="budget-bar-section">
          <div className="budget-label">
            <span>Today</span>
            <span>${todayCost.toFixed(4)} / ${budget.dailyLimit.toFixed(2)}</span>
          </div>
          <div className="budget-bar-track">
            <div
              className={`budget-bar-fill ${dailyWarning ? 'warning' : ''} ${dailyExceeded ? 'exceeded' : ''}`}
              style={{ width: `${Math.min(dailyPct, 100)}%` }}
            />
          </div>
          <div className="budget-tokens">{todayTokens.toLocaleString()} tokens</div>
        </div>

        <div className="budget-bar-section">
          <div className="budget-label">
            <span>This Month</span>
            <span>${monthlyCost.toFixed(4)} / ${budget.monthlyLimit.toFixed(2)}</span>
          </div>
          <div className="budget-bar-track">
            <div
              className={`budget-bar-fill ${monthlyWarning ? 'warning' : ''} ${monthlyExceeded ? 'exceeded' : ''}`}
              style={{ width: `${Math.min(monthlyPct, 100)}%` }}
            />
          </div>
          <div className="budget-tokens">{monthlyTokens.toLocaleString()} tokens</div>
        </div>
      </div>

      <div className="budget-settings">
        <h5><TrendingUp size={14} /> Budget Limits</h5>
        <div className="budget-input-row">
          <label>Daily limit ($)</label>
          <input
            type="number"
            step="0.50"
            min="0"
            value={budget.dailyLimit}
            onChange={(e) => handleBudgetChange('dailyLimit', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="budget-input-row">
          <label>Monthly limit ($)</label>
          <input
            type="number"
            step="5"
            min="0"
            value={budget.monthlyLimit}
            onChange={(e) => handleBudgetChange('monthlyLimit', parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="budget-input-row">
          <label>Warning at (%)</label>
          <input
            type="number"
            step="5"
            min="0"
            max="100"
            value={budget.warningThreshold * 100}
            onChange={(e) => handleBudgetChange('warningThreshold', (parseFloat(e.target.value) || 80) / 100)}
          />
        </div>
        <div className="budget-input-row">
          <label>Auto-pause when exceeded</label>
          <input
            type="checkbox"
            checked={budget.autoPause}
            onChange={(e) => handleBudgetChange('autoPause', e.target.checked)}
          />
        </div>
      </div>

      <div className="budget-provider-breakdown">
        <h5>By Provider</h5>
        {Object.entries(usageSummary.byProvider).map(([provider, data]) => (
          <div key={provider} className="provider-cost-row">
            <span className="provider-name">{provider}</span>
            <span className="provider-tokens">{data.tokens.toLocaleString()} tokens</span>
            <span className="provider-cost">${data.cost.toFixed(4)}</span>
          </div>
        ))}
        {Object.keys(usageSummary.byProvider).length === 0 && (
          <div className="no-usage">No usage recorded yet</div>
        )}
      </div>
    </div>
  );
}
