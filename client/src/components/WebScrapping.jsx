import React, { useEffect, useRef, useState } from "react";

/**
 * Ayush — Green Layout Items Page
 * - Shows full title/summary (no truncation)
 * - Moves isNew items to the top after fetching
 * - Highlights isNew items in orange and shows a "NEW" badge + a short banner after load
 *
 * Usage: import and render <AyushGreenPage /> anywhere in your app
 */

export default function AyushGreenPage() {
  const API = "https://web-scraping-for-ayush.onrender.com/api/items";
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  // ids (or fallback keys) of items that arrived as new in the most recent fetch;
  // used to show temporary badges/animations and the "new items arrived" banner.
  const [newArrivedKeys, setNewArrivedKeys] = useState([]);
  const clearTimerRef = useRef(null);

  useEffect(() => {
    fetchItems(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // cleanup any timer when component unmounts
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) {
        window.clearTimeout(clearTimerRef.current);
      }
    };
  }, []);

  async function fetchItems(currentPage = 1) {
    setLoading(true);
    setError(null);

    try {
      const url = new URL(API);
      url.searchParams.set("page", currentPage);
      url.searchParams.set("limit", limit);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();

      const incoming = Array.isArray(data.items) ? data.items : [];

      // stable key for each item (prefer _id, else url, else index)
      const keyed = incoming.map((it, idx) => ({
        __key: it._id ?? it.url ?? `${Date.now()}_${idx}`,
        ...it,
      }));

      // separate new and old so new items appear at top
      const newItems = keyed.filter((it) => it.isNew === true);
      const oldItems = keyed.filter((it) => it.isNew !== true);

      const merged = [...newItems, ...oldItems];

      setItems(merged);
      setTotal(
        typeof data.total === "number" ? data.total : incoming.length || 0
      );

      // show temporary highlight/banner for newly-arrived items
      const newKeys = newItems.map((it) => it.__key);
      if (newKeys.length > 0) {
        setNewArrivedKeys(newKeys);

        // clear previous timer if present
        if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);

        // clear highlight after 6 seconds
        clearTimerRef.current = window.setTimeout(() => {
          setNewArrivedKeys([]);
          clearTimerRef.current = null;
        }, 6000);
      } else {
        // if no new items, ensure any old highlight is removed
        setNewArrivedKeys([]);
      }
    } catch (err) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // client-side filter (search by title or summary or source)
  const filtered = items.filter((it) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (it.title || "").toLowerCase().includes(q) ||
      (it.summary || "").toLowerCase().includes(q) ||
      (it.source || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100 to-green-200 p-6">
      <header className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-green-600 to-emerald-500 shadow-lg flex items-center justify-center text-white font-bold">
              AY
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-green-900">
                Ayush: Latest Items
              </h1>
              <p className="text-sm text-green-800/70">
                Fetched from your backend — clean, readable green layout
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              aria-label="Search items"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="px-3 py-2 rounded-lg border border-green-200 bg-white/90 placeholder-green-600 text-green-900 shadow-sm"
              placeholder="Search by title, summary, or source..."
            />
            <button
              onClick={() => {
                // refresh page 1 and fetch it
                setPage(1);
                fetchItems(1);
              }}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Short banner shown if new items arrived in the last fetch */}
        {!loading && newArrivedKeys.length > 0 && (
          <div className="mt-4 max-w-3xl rounded-md border border-orange-100 bg-orange-50/90 px-4 py-2 text-orange-800 inline-flex items-center gap-3 shadow-sm">
            <span className="inline-block px-2 py-0.5 rounded-full bg-orange-100 text-xs font-semibold">
              NEW
            </span>
            <span className="text-sm">
              {newArrivedKeys.length} new item
              {newArrivedKeys.length > 1 ? "s" : ""} arrived
            </span>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto">
        {/* status */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <svg
              className="animate-spin h-10 w-10 text-emerald-600"
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                opacity="0.25"
              />
              <path
                d="M4 12a8 8 0 018-8"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-md bg-red-50 border border-red-100 p-4 text-red-800">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* items grid */}
        {!loading && !error && (
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.length === 0 ? (
                <div className="col-span-full rounded-lg border border-green-100 bg-white/80 p-8 text-center text-green-800">
                  No items found.
                </div>
              ) : (
                filtered.map((it, idx) => {
                  const key = it.__key ?? it._id ?? it.url ?? idx;
                  const isNew = !!it.isNew;
                  const justArrived = newArrivedKeys.includes(key);

                  return (
                    <article
                      key={key}
                      className={`relative overflow-visible rounded-2xl border border-green-100 bg-white shadow-sm transition-shadow ${
                        justArrived ? "ring-2 ring-orange-200" : ""
                      }`}
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h2
                              className={`text-lg font-semibold truncate-0 break-words whitespace-normal ${
                                isNew ? "text-orange-600" : "text-green-900"
                              }`}
                            >
                              {it.title || "Untitled"}
                            </h2>

                            {/* show a short new badge next to title for new items */}
                            <div className="mt-2">
                              <p className="text-sm text-green-700/90 break-words whitespace-normal">
                                {it.summary || "No summary available."}
                              </p>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-green-50 border border-green-100 text-sm text-green-800">
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden
                              >
                                <path
                                  d="M12 3v12"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M19 6v6"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  opacity="0.6"
                                />
                              </svg>
                              <span className="font-medium">
                                {it.score ?? "—"}
                              </span>
                            </div>

                            <div className="mt-2 text-xs text-green-600/80">
                              {it.source}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-sm text-green-700/80">
                          <time dateTime={it.publishedAt}>
                            {it.publishedAt
                              ? new Date(it.publishedAt).toLocaleString("en-IN")
                              : "—"}
                          </time>

                          <div className="flex items-center gap-2">
                            {it.investmentType && (
                              <span className="px-2 py-1 rounded-md bg-green-100 border border-green-200 text-xs">
                                {it.investmentType}
                              </span>
                            )}

                            <a
                              href={it.url}
                              target="_blank"
                              rel="noreferrer"
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium shadow-sm ${
                                isNew
                                  ? "bg-orange-500 text-white hover:bg-orange-600"
                                  : "bg-emerald-600 text-white hover:bg-emerald-700"
                              }`}
                              aria-label={`Open ${it.title} in new tab`}
                            >
                              Read
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* footer strip */}
                      <div
                        className={`h-1 ${
                          isNew ? "bg-gradient-to-r from-orange-200 to-orange-300" : "bg-gradient-to-r from-green-100 to-emerald-200"
                        }`}
                      />

                      {/* NEW badge floating top-right for newly-arrived items */}
                      {isNew && (
                        <div className="absolute top-3 right-3">
                          <span
                            className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              justArrived
                                ? "bg-orange-100 text-orange-700 animate-pulse"
                                : "bg-orange-50 text-orange-700"
                            }`}
                          >
                            <svg
                              className="h-3 w-3"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden
                            >
                              <path
                                d="M12 2l2.6 5.3L20 9l-4 3.9L17 20l-5-2.6L7 20l1-7.1L4 9l5.4-1.7L12 2z"
                                stroke="currentColor"
                                strokeWidth="0.2"
                                fill="currentColor"
                              />
                            </svg>
                            NEW
                          </span>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>

            {/* pagination */}
            <footer className="mt-8 flex items-center justify-between">
              <div className="text-sm text-green-800">
                Showing <span className="font-semibold">{items.length}</span> of{" "}
                <span className="font-semibold">{total}</span> items
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 rounded-md border border-green-200 bg-white text-green-800 disabled:opacity-50"
                >
                  Prev
                </button>
                <div className="px-3 py-1 rounded-md text-green-900 bg-green-50 border border-green-100">
                  Page {page} / {totalPages}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 rounded-md border border-green-200 bg-white text-green-800 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </footer>
          </section>
        )}
      </main>

      <footer className="max-w-6xl mx-auto mt-10 text-center text-sm text-green-700/70">
        Data provided from your backend API — {API}
      </footer>
    </div>
  );
}
