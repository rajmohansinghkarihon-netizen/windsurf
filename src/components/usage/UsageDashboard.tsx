import { BarChart3, DollarSign, Cpu } from 'lucide-react';
import { useAIStore } from '../../store/aiStore';

export default function UsageDashboard() {
  const usageSummary = useAIStore((s) => s.usageSummary);
  const usageRecords = useAIStore((s) => s.usageRecords);

  const recentRecords = usageRecords.slice(-20).reverse();

  const dayEntries = Object.entries(usageSummary.byDay).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);

  return (
    <div className="usage-dashboard">
      <div className="panel-header">
        <span>USAGE</span>
      </div>

      <div className="usage-stats">
        <div className="usage-stat-card">
          <Cpu size={16} />
          <div className="usage-stat-value">{usageSummary.totalTokens.toLocaleString()}</div>
          <div className="usage-stat-label">Total Tokens</div>
        </div>
        <div className="usage-stat-card">
          <DollarSign size={16} />
          <div className="usage-stat-value">${usageSummary.totalCost.toFixed(4)}</div>
          <div className="usage-stat-label">Estimated Cost</div>
        </div>
        <div className="usage-stat-card">
          <BarChart3 size={16} />
          <div className="usage-stat-value">{usageRecords.length}</div>
          <div className="usage-stat-label">Total Requests</div>
        </div>
      </div>

      <div className="usage-section">
        <h4>By Provider</h4>
        <div className="usage-breakdown">
          {Object.entries(usageSummary.byProvider).map(([provider, data]) => (
            <div key={provider} className="usage-breakdown-item">
              <span className="usage-provider">{provider}</span>
              <div className="usage-bar-container">
                <div
                  className="usage-bar"
                  style={{
                    width: `${usageSummary.totalTokens > 0 ? (data.tokens / usageSummary.totalTokens * 100) : 0}%`,
                  }}
                />
              </div>
              <span className="usage-tokens">{data.tokens.toLocaleString()}</span>
              <span className="usage-cost">${data.cost.toFixed(4)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="usage-section">
        <h4>Daily Usage (Last 7 Days)</h4>
        <div className="usage-daily">
          {dayEntries.map(([day, data]) => (
            <div key={day} className="usage-daily-item">
              <span className="usage-day">{day}</span>
              <span className="usage-tokens">{data.tokens.toLocaleString()} tokens</span>
              <span className="usage-cost">${data.cost.toFixed(4)}</span>
            </div>
          ))}
          {dayEntries.length === 0 && (
            <div className="usage-empty">No usage data yet</div>
          )}
        </div>
      </div>

      <div className="usage-section">
        <h4>Recent Requests</h4>
        <div className="usage-recent">
          {recentRecords.map((r) => (
            <div key={r.id} className="usage-recent-item">
              <div className="usage-recent-info">
                <span className="usage-recent-type">{r.type}</span>
                <span className="usage-recent-model">{r.model}</span>
              </div>
              <div className="usage-recent-meta">
                <span>{r.totalTokens} tokens</span>
                <span>${r.estimatedCost.toFixed(6)}</span>
                <span>{new Date(r.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
          {recentRecords.length === 0 && (
            <div className="usage-empty">No requests yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
