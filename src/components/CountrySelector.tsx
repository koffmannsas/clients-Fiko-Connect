import { useMemo } from 'react';
import { Search } from 'lucide-react';
import { COUNTRIES, Country } from '../config/countries';

interface Props {
  search: string;
  onSearchChange: (val: string) => void;
  onSelect: (country: Country) => void;
}

export default function CountrySelector({ search, onSearchChange, onSelect }: Props) {
  const filtered = useMemo(() => {
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dialCode.includes(search)
    );
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-4 top-4 text-gray-500" size={18} />
        <input
          type="text"
          placeholder="Rechercher un pays..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 p-4 pl-12 rounded-2xl text-white outline-none focus:border-[#E10600]"
        />
      </div>
      <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {filtered.map(c => (
          <button
            key={c.code}
            onClick={() => onSelect(c)}
            className="w-full flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-[#E10600] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{c.flag}</span>
              <span className="font-bold text-sm">{c.name}</span>
            </div>
            <span className="text-gray-500 font-mono text-xs group-hover:text-[#E10600]">{c.dialCode}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
