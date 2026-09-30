import React from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Compass,
  CheckCircle2,
  X,
  RotateCcw,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { DEMO_STAGES } from '../data/initialData';
import { ActiveModule } from '../types';

interface DemoWalkthroughBarProps {
  activeStageIndex: number;
  onSelectStage: (index: number, targetModule: ActiveModule) => void;
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
  const isTechStep = currentStage.targetModule === 'field-capture';

  const handlePrev = () => {
    const prevIdx =
      (activeStageIndex - 1 + DEMO_STAGES.length) % DEMO_STAGES.length;
    onSelectStage(prevIdx, DEMO_STAGES[prevIdx].targetModule);
  };

  const handleNext = () => {
    const nextIdx = (activeStageIndex + 1) % DEMO_STAGES.length;
    onSelectStage(nextIdx, DEMO_STAGES[nextIdx].targetModule);
  };

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-6 py-3.5 no-print shrink-0 shadow-md">
      <div className="max-w-[1440px] mx-auto space-y-3">
        {/* Top Row: Step Pills + Navigation Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600/20 border border-blue-500/40 text-blue-300 text-[11px] font-semibold uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              Interactive Walkthrough ({activeStageIndex + 1} of{' '}
              {DEMO_STAGES.length})
            </span>

            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider border ${
                isTechStep
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              {isTechStep ? (
                <>
                  <Smartphone className="w-3 h-3 text-emerald-400" />
                  Technician Mobile App
                </>
              ) : (
                <>
                  <Monitor className="w-3 h-3 text-blue-400" />
                  Admin Desktop Platform
                </>
              )}
            </span>

            {/* Stage Selector Pills */}
            <div className="hidden xl:flex items-center gap-1 ml-1">
              {DEMO_STAGES.map((stage, idx) => {
                const isActive = idx === activeStageIndex;
                return (
                  <button
                    key={stage.stageNumber}
                    type="button"
                    onClick={() => onSelectStage(idx, stage.targetModule)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span>{stage.stageNumber}</span>
                    <span className="font-sans text-[11px] hidden 2xl:inline truncate max-w-[145px]">
                      {stage.title.replace(/^(Admin:|Tech Mobile:)\s*/, '')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev Step
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
            >
              Next Step
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onResetDemoData}
              title="Reset sample data to initial shift state"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset Data</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Hide Guided Walkthrough"
              className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Row: Current Step Details & Try-It Prompt */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5 items-center">
          <div className="lg:col-span-4 space-y-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-blue-400">
              STEP {currentStage.stageNumber} — {currentStage.title}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentStage.problemStatement}
            </p>
          </div>

          <div className="lg:col-span-4 space-y-1 border-t lg:border-t-0 lg:border-l border-slate-800 pt-2 lg:pt-0 lg:pl-3.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              How PrimeChain Works
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              {currentStage.operationalMechanism}
            </p>
          </div>

          <div className="lg:col-span-4 bg-blue-950/40 border border-blue-800/50 rounded-lg p-2.5 flex items-start gap-2.5">
            <div className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-mono font-semibold uppercase tracking-wider shrink-0 mt-0.5">
              Action
            </div>
            <p className="text-xs text-blue-100 leading-relaxed">
              {currentStage.demoActionHint}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
