import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DEMO_STAGES } from '../data/initialData';
import { ActiveModule } from '../types';

interface DemoWalkthroughBarProps {
  activeStageIndex: number;
  onSelectStage: (index: number, module: ActiveModule) => void;
  onClose: () => void;
  onResetDemoData: () => void;
}

export const DemoWalkthroughBar: React.FC<DemoWalkthroughBarProps> = ({
  activeStageIndex,
  onSelectStage,
  onClose,
  onResetDemoData,
}) => {
  const currentStage = DEMO_STAGES[activeStageIndex] || DEMO_STAGES[0];

  const handlePrev = () => {
    const nextIdx =
      activeStageIndex > 0 ? activeStageIndex - 1 : DEMO_STAGES.length - 1;
    onSelectStage(nextIdx, DEMO_STAGES[nextIdx].targetModule);
  };

  const handleNext = () => {
    const nextIdx =
      activeStageIndex < DEMO_STAGES.length - 1 ? activeStageIndex + 1 : 0;
    onSelectStage(nextIdx, DEMO_STAGES[nextIdx].targetModule);
  };

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800 no-print">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Stage Stepper Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-xs font-mono text-slate-400 mr-2 whitespace-nowrap">
              CLIENT PRESENTATION SCRIPT:
            </span>
            {DEMO_STAGES.map((st, idx) => (
              <button
                key={st.stageNumber}
                type="button"
                onClick={() => onSelectStage(idx, st.targetModule)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition-colors whitespace-nowrap cursor-pointer ${
                  idx === activeStageIndex
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Stage {st.stageNumber}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={onResetDemoData}
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white underline whitespace-nowrap cursor-pointer"
            >
              Reset Demo State
            </button>
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 cursor-pointer"
              aria-label="Previous presentation stage"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-500 rounded text-white flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <span>Next Stage</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Close presentation bar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2 border-t border-slate-800 text-xs">
          <div className="lg:col-span-4 space-y-0.5">
            <div className="font-mono text-blue-400">
              STAGE {currentStage.stageNumber} OF 06
            </div>
            <div className="text-sm font-semibold text-white">
              {currentStage.title}
            </div>
            <div className="text-slate-400">
              Problem: {currentStage.problemStatement}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-0.5">
            <div className="font-mono text-emerald-400">
              PROPOSED SYSTEM MECHANISM
            </div>
            <div className="text-slate-200 leading-relaxed">
              {currentStage.operationalMechanism}
            </div>
          </div>

          <div className="lg:col-span-3 bg-slate-800/80 p-2.5 rounded border border-slate-700 space-y-0.5">
            <div className="font-mono text-amber-300">LIVE DEMO ACTION</div>
            <div className="text-slate-200">{currentStage.demoActionHint}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
