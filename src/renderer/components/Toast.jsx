import React from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';

const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  info:    Info,
};

export default function Toast({ items }) {
  if (!items.length) return null;

  return (
    <div className="toast-area">
      {items.map(t => {
        const Icon = ICONS[t.type] || ICONS.info;
        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Icon />
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
