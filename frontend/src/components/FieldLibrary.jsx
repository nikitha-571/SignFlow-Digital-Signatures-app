import { useState } from 'react';

function FieldLibrary({ onAddField, disabled = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedField, setDraggedField] = useState(null);

  const fieldTypes = [
    { 
      type: 'signature', 
      icon: '✍️', 
      label: 'Signature', 
      color: 'emerald',
      description: 'Required signature field',
      required: true
    },
    { 
      type: 'initials', 
      icon: '🔤', 
      label: 'Initials', 
      color: 'blue',
      description: 'Auto-filled from name',
      required: false
    },
    { 
      type: 'name', 
      icon: '👤', 
      label: 'Full Name', 
      color: 'purple',
      description: 'Auto-filled',
      required: false
    },
    { 
      type: 'date', 
      icon: '📅', 
      label: 'Date', 
      color: 'amber',
      description: "Today's date",
      required: false
    },
    { 
      type: 'text', 
      icon: '📝', 
      label: 'Text', 
      color: 'slate',
      description: 'Custom text field',
      required: false
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      emerald: 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200',
      blue: 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200',
      amber: 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200',
      slate: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
    };
    return colors[color] || colors.slate;
  };

  const handleDragStart = (e, field) => {
    setDraggedField(field);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('fieldType', field.type);
    
    const dragImage = e.currentTarget.cloneNode(true);
    dragImage.style.opacity = '0.8';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragEnd = () => {
    setDraggedField(null);
    setIsDragging(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <h3 className="font-semibold text-slate-800">Drag Fields to Document</h3>
      </div>

      <div className="space-y-2">
        {fieldTypes.map((field) => (
          <div
            key={field.type}
            draggable={!disabled}
            onDragStart={(e) => handleDragStart(e, field)}
            onDragEnd={handleDragEnd}
            className={`
              flex items-center gap-3 p-3 rounded-lg border-2 transition-all
              ${getColorClasses(field.color)}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
              ${draggedField?.type === field.type ? 'opacity-50 scale-95' : ''}
              ${field.required ? 'border-l-4' : ''}
            `}
          >
            <div className="flex items-center gap-2 flex-shrink-0">
              <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
              </svg>
              <span className="text-2xl">{field.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">{field.label}</p>
                {field.required && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Required</span>
                )}
              </div>
              <p className="text-xs opacity-80 truncate">{field.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FieldLibrary;