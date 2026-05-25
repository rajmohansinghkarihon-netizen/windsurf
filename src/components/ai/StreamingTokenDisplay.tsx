import { useState, useEffect } from 'react';
import { Zap, DollarSign, Clock } from 'lucide-react';
import { useAIStore } from '../../store/aiStore';
import { useSettingsStore } from '../../store/settingsStore';
import { estimateCost } from '../../services/ai/providers';
import type { AIProvider } from '../../types';

interface Props {
  tokenCount: number;
  isStreaming: boolean;
  startTime?: number;
}

export default function StreamingTokenDisplay({ tokenCount, isStreaming, startTime }: Props) {
  const config = useSettingsStore((s) => s.config);
  const usageSummary = useAIStore((s) => s.usageSummary);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const estimatedPromptTokens = Math.floor(tokenCount * 0.3);
  const estimatedCompletionTokens = tokenCount - estimatedPromptTokens;
  const currentCost = estimateCost(
    config.provider as AIProvider,
    config.model,
    estimatedPromptTokens,
    estimatedCompletionTokens
  );

  const elapsed = startTime ? ((now - startTime) / 1000).toFixed(1) : '0.0';
  const tokensPerSecond = startTime && tokenCount > 0
    ? (tokenCount / ((now - startTime) / 1000)).toFixed(1)
    : '0.0';

  const today = new Date(now).toISOString().split('T')[0];
  const todayCost = usageSummary.byDay[today]?.cost || 0;

  return (
    <div className={`streaming-token-display ${isStreaming ? 'active' : ''}`}>
      <div className="token-stat">
        <Zap size={12} />
        <span className="token-value">{tokenCount.toLocaleString()}</span>
        <span className="token-label">tokens</span>
      </div>

      {isStreaming && (
        <div className="token-stat">
          <Clock size={12} />
          <span className="token-value">{elapsed}s</span>
          <span className="token-label">({tokensPerSecond} t/s)</span>
        </div>
      )}

      <div className="token-stat cost">
        <DollarSign size={12} />
        <span className="token-value">${currentCost.toFixed(6)}</span>
        <span className="token-label">est.</span>
      </div>

      <div className="token-stat daily">
        <span className="token-label">Today: ${todayCost.toFixed(4)}</span>
      </div>
    </div>
  );
}
