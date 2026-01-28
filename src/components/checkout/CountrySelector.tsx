"use client";

import { useState, useEffect, useRef } from "react";
import { COUNTRIES, SUPPORTED_CURRENCIES, type CurrencyCode, getCurrencyFromCountry } from "@/lib/currencies";

interface Props {
  initialCountry?: string;
  initialCurrency?: CurrencyCode;
  onCountryChange: (country: string, currency: CurrencyCode) => void;
}

export function CountrySelector({ initialCountry, initialCurrency, onCountryChange }: Props) {
  const [country, setCountry] = useState(initialCountry || "US");
  const [currency, setCurrency] = useState<CurrencyCode>(initialCurrency || "USD");
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Carregar do cookie se não tiver inicial
    if (!initialCountry || !initialCurrency) {
      const savedCountry = document.cookie
        .split("; ")
        .find((row) => row.startsWith("user_country="))
        ?.split("=")[1];

      const savedCurrency = document.cookie
        .split("; ")
        .find((row) => row.startsWith("user_currency="))
        ?.split("=")[1] as CurrencyCode | undefined;

      if (savedCountry) setCountry(savedCountry);
      if (savedCurrency && savedCurrency in SUPPORTED_CURRENCIES) {
        setCurrency(savedCurrency);
      }
    }
  }, [initialCountry, initialCurrency]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCountryChange = (newCountry: string) => {
    const newCurrency = getCurrencyFromCountry(newCountry);

    setCountry(newCountry);
    setCurrency(newCurrency);
    setIsOpen(false);
    setSearch("");

    // Salvar nos cookies (1 ano)
    document.cookie = `user_country=${newCountry};path=/;max-age=31536000;SameSite=Lax`;
    document.cookie = `user_currency=${newCurrency};path=/;max-age=31536000;SameSite=Lax`;

    onCountryChange(newCountry, newCurrency);
  };

  const selectedCountry = COUNTRIES.find((c) => c.code === country);
  const currencyInfo = SUPPORTED_CURRENCIES[currency];

  // Filtrar países pela busca
  const filteredCountries = search
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[rgba(139,92,246,0.2)] bg-[#111118] text-white hover:border-[rgba(139,92,246,0.4)] transition-colors text-sm"
      >
        <span className="text-base">{currencyInfo?.flag || "🌍"}</span>
        <span className="hidden sm:inline">{selectedCountry?.name || "Select Country"}</span>
        <span className="text-gray-400">({currency})</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-72 rounded-lg border border-[rgba(139,92,246,0.2)] bg-[#0A0A0F] shadow-xl z-50">
          {/* Busca */}
          <div className="p-2 border-b border-[rgba(139,92,246,0.1)]">
            <input
              type="text"
              placeholder="Search country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-[#111118] border border-[rgba(139,92,246,0.2)] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[rgba(139,92,246,0.4)]"
              autoFocus
            />
          </div>

          {/* Lista de países */}
          <div className="max-h-64 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-500 text-sm">
                No countries found
              </div>
            ) : (
              filteredCountries.map((c) => {
                const countryCurrency = getCurrencyFromCountry(c.code);
                const currInfo = SUPPORTED_CURRENCIES[countryCurrency];

                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountryChange(c.code)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[rgba(139,92,246,0.1)] transition-colors text-sm ${
                      country === c.code ? "bg-[rgba(139,92,246,0.15)] text-white" : "text-gray-300"
                    }`}
                  >
                    <span className="text-base">{currInfo?.flag || "🌍"}</span>
                    <span className="flex-1">{c.name}</span>
                    <span className="text-gray-500 text-xs">{countryCurrency}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
