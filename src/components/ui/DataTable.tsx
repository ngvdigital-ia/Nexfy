"use client";

import { useState } from "react";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField = "id",
  emptyMessage = "Nenhum registro encontrado",
  onRowClick,
  pageSize = 20,
}: Props<T>) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(data.length / pageSize);
  const paged = data.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div>
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left text-xs font-medium text-gray-400 uppercase tracking-wider py-3 px-4 ${col.className || ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center text-gray-500 py-8 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr
                  key={row[keyField]}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-gray-800/50 transition-colors ${
                    onRowClick ? "cursor-pointer hover:bg-gray-800/50" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`py-3 px-4 text-sm ${col.className || ""}`}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {paged.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">{emptyMessage}</p>
        ) : (
          paged.map((row) => (
            <div
              key={row[keyField]}
              onClick={() => onRowClick?.(row)}
              className={`bg-gray-800/50 rounded-lg p-3 space-y-1 ${onRowClick ? "cursor-pointer active:bg-gray-700/50" : ""}`}
            >
              {columns.map((col) => (
                <div key={col.key} className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">{col.label}</span>
                  <span className="text-sm text-white">
                    {col.render ? col.render(row) : row[col.key]}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-xs text-gray-500">
            {data.length} registro{data.length !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs rounded bg-gray-800 text-gray-300 disabled:opacity-30"
            >
              Anterior
            </button>
            <span className="px-3 py-1 text-xs text-gray-400">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-xs rounded bg-gray-800 text-gray-300 disabled:opacity-30"
            >
              Proximo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
