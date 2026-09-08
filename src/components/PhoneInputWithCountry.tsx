import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { Country, COUNTRIES, DEFAULT_COUNTRY } from '../lib/countries';

export function CountryFlag({ 
  code, 
  name, 
  className 
}: { 
  code: string; 
  name: string; 
  className?: string; 
}) {
  const [hasError, setHasError] = useState(false);
  const lowerCode = (code || '').toLowerCase();

  if (hasError || !lowerCode) {
    return (
      <span 
        className={cn(
          "w-5 h-3.5 bg-black/10 rounded-[2px] inline-flex items-center justify-center text-[8px] font-bold text-brand-black/70 border border-black/10 shrink-0 select-none",
          className
        )}
      >
        {code}
      </span>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${lowerCode}.png`}
      srcSet={`https://flagcdn.com/w40/${lowerCode}.png 1x, https://flagcdn.com/w80/${lowerCode}.png 2x`}
      width={20}
      height={14}
      alt={`${name} flag`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={cn(
        "w-5 h-3.5 object-cover rounded-[2px] shadow-xs border border-black/15 shrink-0 select-none bg-black/5",
        className
      )}
    />
  );
}

interface PhoneInputWithCountryProps {
  phone: string;
  onChangePhone: (value: string) => void;
  selectedCountry: Country;
  onChangeCountry: (country: Country) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function PhoneInputWithCountry({
  phone,
  onChangePhone,
  selectedCountry = DEFAULT_COUNTRY,
  onChangeCountry,
  error,
  placeholder,
  disabled = false,
  className,
  id
}: PhoneInputWithCountryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter countries by name or dial code
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return COUNTRIES;
    const q = searchQuery.toLowerCase().trim();
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.dialCode.includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus search when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelectCountry = (country: Country) => {
    onChangeCountry(country);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex gap-2 relative">
        {/* Country Code Selector */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(prev => !prev)}
            aria-label="Select Country Code"
            className={cn(
              "h-full flex items-center gap-2 bg-brand-offwhite hover:bg-white border rounded-xl px-3 py-2.5 text-xs font-bold text-brand-black transition-all cursor-pointer shadow-sm select-none",
              isOpen ? "border-brand-red ring-2 ring-brand-red/20 bg-white" : "border-black/10 hover:border-black/20",
              error && "border-brand-red"
            )}
          >
            <CountryFlag code={selectedCountry.code} name={selectedCountry.name} />
            <span className="text-xs text-brand-black/90 font-bold">{selectedCountry.dialCode}</span>
            <ChevronDown className={cn(
              "w-3.5 h-3.5 text-brand-black/40 transition-transform duration-200",
              isOpen && "rotate-180 text-brand-red"
            )} />
          </button>

          {/* Floating Country Dropdown */}
          {isOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white border border-black/10 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-72">
              {/* Search Header */}
              <div className="p-2.5 border-b border-black/5 bg-brand-offwhite/50">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-black/40 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search country or code..."
                    className="w-full bg-white border border-black/10 rounded-xl pl-8 pr-7 py-1.5 text-xs text-brand-black placeholder:text-brand-black/40 focus:outline-none focus:border-brand-red transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-black/40 hover:text-brand-black"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Country List */}
              <div className="overflow-y-auto flex-1 p-1 space-y-0.5 custom-scrollbar">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((country) => {
                    const isSelected = country.code === selectedCountry.code;

                    return (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => handleSelectCountry(country)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer",
                          isSelected 
                            ? "bg-brand-red/10 text-brand-red font-bold" 
                            : "hover:bg-black/5 text-brand-black"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CountryFlag code={country.code} name={country.name} />
                          <span className="truncate">{country.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-semibold text-brand-black/50 bg-black/[0.04] px-1.5 py-0.5 rounded-md">
                            {country.dialCode}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-brand-red stroke-[2.5]" />}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-xs text-brand-black/50">
                    No countries matching "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Telephone Input */}
        <input
          id={id}
          type="tel"
          disabled={disabled}
          value={phone}
          onChange={(e) => onChangePhone(e.target.value)}
          placeholder={placeholder || selectedCountry.placeholder}
          className={cn(
            "flex-1 bg-brand-offwhite border rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:bg-white transition-all",
            error 
              ? "border-brand-red ring-2 ring-brand-red/20" 
              : "border-black/10 focus:border-brand-red"
          )}
        />
      </div>

      {error && (
        <span className="text-[10px] text-brand-red font-semibold block mt-1">
          {error}
        </span>
      )}
    </div>
  );
}
