import React from 'react';
import { Search } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-giro-text-muted px-10 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Search className="w-8 h-8 opacity-20" />
      </div>
      <p>Nenhum devedor encontrado. Comece adicionando um novo.</p>
    </div>
  );
}
