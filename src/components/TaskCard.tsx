import React from 'react';
import { User, MapPin, Circle, ChevronRight, Navigation2, Map as MapIcon } from 'lucide-react';

interface TaskCardProps {
  passenger: string;
  pickup: string;
  drop: string;
  status: "assigned" | "in-progress" | "completed";
  onStart?: () => void;
  onComplete?: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ passenger, pickup, drop, status, onStart, onComplete }) => {
  const isAssigned = status === "assigned";
  const isInProgress = status === "in-progress";

  return (
    <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden mb-6">
      <div className="p-5">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <User size={20} className="text-slate-400" />
            <span className="font-bold text-slate-800 text-lg">{passenger}</span>
          </div>
          <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
            status === 'completed' ? 'bg-green-50 text-green-600' : 
            status === 'in-progress' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
          }`}>
            {status}
          </span>
        </div>

        <div className="h-px bg-slate-50 mb-4" />

        {/* Locations */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center py-1">
            <Circle size={14} className="text-blue-600" />
            <div className="w-px h-10 bg-slate-100 my-1" />
            <MapPin size={16} className="text-red-500" />
          </div>
          
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Pickup</p>
                <Navigation2 size={16} className="text-blue-600 cursor-pointer" />
              </div>
              <p className="text-slate-700 font-medium truncate">{pickup}</p>
            </div>
            <div>
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Drop</p>
                <MapIcon size={16} className="text-red-500 cursor-pointer" />
              </div>
              <p className="text-slate-700 font-medium truncate">{drop}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Integrated Action Buttons */}
      {isAssigned && (
        <button 
          onClick={onStart}
          className="w-full bg-blue-600 py-4 text-white font-bold text-sm tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <ChevronRight size={18} /> START JOURNEY
        </button>
      )}

      {isInProgress && (
        <button 
          onClick={onComplete}
          className="w-full bg-green-600 py-4 text-white font-bold text-sm tracking-widest flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
        >
          <ChevronRight size={18} /> COMPLETE JOURNEY
        </button>
      )}
    </div>
  );
};