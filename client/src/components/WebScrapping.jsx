import React, { useEffect, useRef, useState } from "react";

/**
 * Live AYUSH Updates - News Scraping Dashboard
 * - Auto-refreshes every 15 minutes
 * - Red cards for newly scraped articles (not seen before)
 * - Green cards for previously shown articles
 * - Vertical feed sorted by time (most recent first)
 * - Filter, search, and view article sources
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
  const [lastUpdated, setLastUpdated] = useState(null);
  const [seenItems, setSeenItems] = useState(new Set()); // Track items that have been seen
  const [lastNewItemsCount, setLastNewItemsCount] = useState(0); // Track if new items were found in last fetch

  // ids (or fallback keys) of items that arrived as new in the most recent fetch;
  // used to show temporary badges/animations and the "new items arrived" banner.
  const [newArrivedKeys, setNewArrivedKeys] = useState([]);
  const clearTimerRef = useRef(null);
  const autoRefreshTimerRef = useRef(null);
  const shuffleTimerRef = useRef(null);
  const itemsRef = useRef([]); // Ref to access latest items without dependency
  const lastNewItemsCountRef = useRef(0); // Ref to access latest count without dependency

  useEffect(() => {
    fetchItems(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Auto-refresh every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setPage(1);
      fetchItems(1);
    }, 15 * 60 * 1000); // 15 minutes

    autoRefreshTimerRef.current = interval;

    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, []);

  // Shuffle data every 5 minutes if no update happened
  useEffect(() => {
    const shuffleInterval = setInterval(() => {
      // Use refs to get latest values without causing dependency issues
      const currentItems = itemsRef.current;
      const currentNewCount = lastNewItemsCountRef.current;
      
      // Only shuffle if no new items were found in the last fetch
      if (currentNewCount === 0 && currentItems.length > 0) {
        // Shuffle existing items
        const newItems = currentItems.filter((it) => it.isNew === true);
        const oldItems = currentItems.filter((it) => it.isNew !== true);
        
        // Fisher-Yates shuffle algorithm for old items only
        const shuffledOld = [...oldItems];
        for (let i = shuffledOld.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledOld[i], shuffledOld[j]] = [shuffledOld[j], shuffledOld[i]];
        }
        
        // Keep new items at top, shuffle old items below
        setItems([...newItems, ...shuffledOld]);
        setLastUpdated(new Date());
      } else {
        // If there were new items, fetch fresh data from API (which scrapes from 6 websites)
        setPage(1);
        fetchItems(1);
      }
    }, 5 * 60 * 1000); // 5 minutes

    shuffleTimerRef.current = shuffleInterval;

    return () => {
      if (shuffleTimerRef.current) {
        clearInterval(shuffleTimerRef.current);
      }
    };
  }, []); // Empty deps - using refs for latest values

  // cleanup any timer when component unmounts
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) {
        window.clearTimeout(clearTimerRef.current);
      }
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
      if (shuffleTimerRef.current) {
        clearInterval(shuffleTimerRef.current);
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

      // Sort each group by publishedAt (most recent first), then combine
      const sortByDate = (a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA; // Most recent first
      };
      
      const sortedNew = newItems.sort(sortByDate);
      const sortedOld = oldItems.sort(sortByDate);
      const sorted = [...sortedNew, ...sortedOld]; // New items always at top

      setItems(sorted);
      itemsRef.current = sorted; // Update ref with latest items
      setTotal(
        typeof data.total === "number" ? data.total : incoming.length || 0
      );
      setLastUpdated(new Date());

      // Track newly seen items
      const currentSeenItems = new Set(seenItems);
      const newKeys = newItems.map((it) => it.__key);
      
      // Track count of new items for shuffle logic
      setLastNewItemsCount(newKeys.length);
      lastNewItemsCountRef.current = newKeys.length; // Update ref
      
      // Mark new items as seen after they're displayed
      newKeys.forEach((key) => {
        if (!currentSeenItems.has(key)) {
          currentSeenItems.add(key);
        }
      });
      setSeenItems(currentSeenItems);

      // show temporary highlight/banner for newly-arrived items
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 p-6">
      {/* Header Bar */}
      <header className="max-w-5xl mx-auto mb-6 bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg flex items-center justify-center text-white font-bold text-lg">
              AY
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Live AYUSH Updates
              </h1>
              {lastUpdated && (
                <p className="text-sm text-gray-600 mt-1">
                  Last Updated: {lastUpdated.toLocaleTimeString("en-IN", { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                  <span className="ml-2 inline-flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Auto-refresh active
                  </span>
                  {lastNewItemsCount === 0 && items.length > 0 && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-blue-600">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                      </svg>
                      Shuffle active (5 min)
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              aria-label="Search articles"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white placeholder-gray-500 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search by title, summary, or source..."
            />
            <button
              onClick={() => {
                setPage(1);
                fetchItems(1);
              }}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              aria-label="Manual refresh"
            >
              <svg
                className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>
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

        {/* Vertical Feed of News Cards */}
        {!loading && !error && (
          <section className="max-w-5xl mx-auto">
            {/* New Items Banner */}
            {!loading && newArrivedKeys.length > 0 && (
              <div className="mb-4 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 flex items-center gap-3 shadow-md">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm font-semibold">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  NEW
                </span>
                <span className="text-sm font-medium text-red-900">
                  {newArrivedKeys.length} new article{newArrivedKeys.length > 1 ? "s" : ""} scraped
                </span>
              </div>
            )}

            {/* Vertical Feed */}
            <div className="space-y-4">
              {filtered.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-600">
                  No articles found. {query && "Try adjusting your search."}
                </div>
              ) : (
                filtered.map((it, idx) => {
                  const key = it.__key ?? it._id ?? it.url ?? idx;
                  // Item is "new" (red) if API marks it as new AND we haven't seen it in this session
                  const isNew = !!it.isNew && !seenItems.has(key);
                  const justArrived = newArrivedKeys.includes(key);

                  return (
                    <article
                      key={key}
                      className={`relative overflow-hidden rounded-xl shadow-lg transition-all duration-300 ${
                        isNew
                          ? "bg-red-50 border-2 border-red-300"
                          : "bg-green-50 border-2 border-green-300"
                      } ${justArrived && isNew ? "ring-4 ring-red-200" : ""}`}
                    >
                      {/* Left Color Indicator Strip */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          isNew ? "bg-red-500" : "bg-green-500"
                        }`}
                      />

                      <div className="p-5 pl-6">
                        {/* Header with Source Badge */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            {/* Article Title - Bold, Larger Font */}
                            <h2 className="text-xl font-bold text-gray-900 mb-2 break-words leading-tight">
                              {it.title || "Untitled Article"}
                            </h2>
                          </div>

                          {/* Source Badge - Top Right */}
                          <div className="flex-shrink-0">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                                isNew
                                  ? "bg-red-100 text-red-800 border border-red-200"
                                  : "bg-green-100 text-green-800 border border-green-200"
                              }`}
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                                />
                              </svg>
                              {it.source || "Unknown Source"}
                            </span>
                          </div>
                        </div>

                        {/* Short Summary - 2-3 lines */}
                        <div className="mb-4">
                          <p
                            className={`text-sm leading-relaxed break-words line-clamp-3 ${
                              isNew ? "text-gray-700" : "text-gray-700"
                            }`}
                          >
                            {it.summary || "No summary available for this article."}
                          </p>
                        </div>

                        {/* Footer with Date/Time and View Button */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                          {/* Date/Time of Extraction */}
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <time dateTime={it.publishedAt}>
                              {it.publishedAt
                                ? new Date(it.publishedAt).toLocaleString("en-IN", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Date not available"}
                            </time>
                          </div>

                          {/* View Full Article Button */}
                          <a
                            href={it.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition-all ${
                              isNew
                                ? "bg-red-600 text-white hover:bg-red-700 hover:shadow-lg"
                                : "bg-green-600 text-white hover:bg-green-700 hover:shadow-lg"
                            }`}
                            aria-label={`View full article: ${it.title}`}
                          >
                            <span>View Full Article</span>
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                        </div>
                      </div>
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

      <footer className="max-w-5xl mx-auto mt-10 text-center text-sm text-gray-600">
        <p>Data provided from your backend API — {API}</p>
        <p className="mt-2 text-xs text-gray-500">
          Auto-refreshing every 15 minutes • Shuffle every 5 minutes (if no updates) • Last sync: {lastUpdated ? lastUpdated.toLocaleString("en-IN") : "Never"}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Fetching data from 6 websites via API
        </p>
      </footer>
    </div>
  );
}
