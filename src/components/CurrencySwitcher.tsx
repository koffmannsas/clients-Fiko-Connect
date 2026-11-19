import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown, Check, ArrowLeftRight } from 'lucide-react';
import { useCurrency, CURRENCIES, convertToXOF, formatCurrencyAmount, CurrencyCode } from '../lib/currency';

export default function CurrencySwitcher() {
  const { currency, currencyInfo, setCurrency, currencies, isBaseFcfa } = useCurrency();
  const [open, setOpen] = useState(false);
  const [calcAmount, setCalcAmount] = useState<string>('100000');
  const [calcSource, setCalcSource] = useState<CurrencyCode>('XOF');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const numericCalcAmount = parseFloat(calcAmount) || 0;
  const baseXofEquivalent = convertToXOF(numericCalcAmount, calcSource);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-bold transition cursor-pointer ${
          isBaseFcfa
            ? 'bg-zinc-900/60 border-gray-800 text-zinc-200 hover:border-gray-700'
            : 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300 hover:border-emerald-700'
        }`}
        title="Changer la devise d'affichage du tableau de bord (Base : FCFA / XOF)"
      >
        <Globe size={14} className={isBaseFcfa ? 'text-[#25D366]' : 'text-emerald-400'} />
        <span className="font-mono font-black">
          {currencyInfo.flag} {currencyInfo.shortLabel}
        </span>
        <ChevronDown size={13} className={`text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0a0a0f] border border-zinc-800 rounded-2xl shadow-2xl p-4 z-50 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
            <div>
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[#25D366] block">
                MODE MULTI-DEVISE
              </span>
              <h4 className="text-xs font-black text-white">Devise d'affichage du Cockpit</h4>
            </div>
            <span className="text-[9px] font-mono bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800">
              Base : FCFA (XOF)
            </span>
          </div>

          {/* Currency list */}
          <div className="grid grid-cols-1 gap-1.5 max-h-60 overflow-y-auto pr-1">
            {currencies.map((c) => {
              const active = c.code === currency;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setCurrency(c.code)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    active
                      ? 'bg-[#E10600]/15 border-[#E10600]/60 text-white'
                      : 'bg-black/50 border-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base leading-none">{c.flag}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white">{c.shortLabel}</span>
                        {c.isFixedParity && (
                          <span className="text-[8px] font-mono uppercase px-1.5 py-0.2 bg-emerald-950/60 text-emerald-400 border border-emerald-900/50 rounded">
                            Fixe
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate">{c.regionNote}</p>
                    </div>
                  </div>
                  {active && <Check size={14} className="text-[#E10600] shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Mini live multi-currency converter */}
          <div className="bg-black/70 border border-zinc-900 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span className="flex items-center gap-1.5 font-bold text-zinc-300">
                <ArrowLeftRight size={11} className="text-[#25D366]" />
                Convertisseur Rapide Multi-Devise
              </span>
              <span>Base XOF</span>
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#E10600]"
                placeholder="Montant..."
              />
              <select
                value={calcSource}
                onChange={(e) => setCalcSource(e.target.value as CurrencyCode)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-white focus:outline-none"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {(['XOF', 'EUR', 'USD', 'GHS', 'NGN', 'GBP'] as CurrencyCode[])
                .filter((code) => code !== calcSource)
                .slice(0, 4)
                .map((targetCode) => (
                  <div
                    key={targetCode}
                    className="bg-zinc-950/80 border border-zinc-900 rounded-lg px-2 py-1.5 flex items-center justify-between text-[10px] font-mono"
                  >
                    <span className="text-zinc-500">{CURRENCIES[targetCode].flag} {targetCode}</span>
                    <span className="text-white font-bold">
                      {formatCurrencyAmount(baseXofEquivalent, targetCode)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
