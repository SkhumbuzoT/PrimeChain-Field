import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Compass,
  X,
  RotateCcw,
  Monitor,
  Smartphone,
  ChevronDown,
  ChevronUp,
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
  const [expanded, setExpanded] = useState(false);
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
    <div className="bg-[#0B1120] text-slate-100 border-b border-slate-800/90 no-print shrink-0 shadow-sm z-30">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
        {/* Compact Single-Row Executive Bar */}
        <div className="h-11 flex items-center justify-between gap-3 text-xs">
          {/* Left: Stage Index & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-1.5 font-medium text-slate-300 shrink-0">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-mono text-blue-300 font-semibold">
                {currentStage.stageNumber} / {String(DEMO_STAGES.length).padStart(2, '0')}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <span className="text-slate-600" aria-hidden="true">|</span>
              <span className="font-semibold text-white truncate max-w-[260px] md:max-w-md">
                {currentStage.title}
              </span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 shrink-0">
                {isTechStep ? (
                  <>
                    <Smartphone className="w-3 h-3 text-emerald-400" />
                    <span>Mobile App</span>
                  </>
                ) : (
                  <>
                    <Monitor className="w-3 h-3 text-blue-400" />
                    <span>Admin View</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Right: Step Switcher + Navigation Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Step Buttons */}
            <div className="hidden lg:flex items-center gap-0.5 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
              {DEMO_STAGES.map((stage, idx) => {
                const isActive = idx === activeStageIndex;
                return (
                  <button
                    key={stage.stageNumber}
                    type="button"
                    onClick={() => onSelectStage(idx, stage.targetModule)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                    title={stage.title}
                  >
                    {stage.stageNumber}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handlePrev}
              className="p-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Previous Step"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
              title="Next Step"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="px-2 py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
            >
              <span>{expanded ? 'Hide Details' : 'Details'}</span>
              {expanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            <button
              type="button"
              onClick={onResetDemoData}
              title="Reset sample data to initial shift state"
              className="p-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Dismiss Walkthrough Guide"
              className="p-1 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Collapsible Guidance Panel (Only Shown when Details is Clicked) */}
        {expanded && (
          <div className="py-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
            <div className="md:col-span-6 space-y-0.5">
              <span className="font-semibold text-slate-200">Operational Target:</span>
              <p className="text-slate-400 leading-relaxed">
                {currentStage.problemStatement}
              </p>
            </div>
            <div className="md:col-span-6 space-y-0.5 bg-slate-900/80 border border-slate-800 rounded-lg p-2.5">
              <span className="font-semibold text-blue-300">Action in this view:</span>
              <p className="text-slate-300 leading-relaxed font-mono text-[11px]">
                {currentStage.demoActionHint}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
