/* ============================================================
   EM Zoo Hub — Registry Module
   Fetches spoke manifests, caches in sessionStorage, fallback.
   Public API: EMZoo.registry.loadRegistry, EMZoo.registry.fetchThumbnail
   ============================================================ */
(function () {
    'use strict';

    var REGISTRY_PATH   = 'data/registry.json';
    var FALLBACK_PATH   = 'data/fallback-cache.json';
    var CACHE_KEY       = 'emzoo_manifest_cache_v1';
    var CACHE_TS_KEY    = 'emzoo_manifest_ts_v1';
    var CACHE_TTL_MS    = 30 * 60 * 1000; // 30 minutes

    /* ---------- Session cache helpers ---------- */

    function getSessionCache() {
        try {
            var ts = sessionStorage.getItem(CACHE_TS_KEY);
            if (!ts || Date.now() - Number(ts) > CACHE_TTL_MS) return null;
            var data = sessionStorage.getItem(CACHE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) { return null; }
    }

    function setSessionCache(items) {
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(items));
            sessionStorage.setItem(CACHE_TS_KEY, String(Date.now()));
        } catch (e) { /* quota exceeded — ignore */ }
    }

    /* ---------- Load fallback cache ---------- */

    function loadFallback() {
        return fetch(FALLBACK_PATH)
            .then(function (r) { return r.json(); })
            .catch(function () { return []; });
    }

    /* ---------- Load registry + spoke manifests ---------- */

    function loadRegistry() {
        var cached = getSessionCache();
        if (cached && cached.length > 0) {
            return Promise.resolve(cached);
        }

        return fetch(REGISTRY_PATH)
            .then(function (r) { return r.json(); })
            .then(function (registry) {
                var baseUrl = registry.base_url_pattern
                    .replace('{github_user}', registry.github_user);
                var enabled = registry.spokes.filter(function (s) { return s.enabled; });

                var promises = enabled.map(function (spoke) {
                    var repoUrl = baseUrl.replace('{repo_name}', spoke.repo_name);
                    return fetch(repoUrl + '/manifest.json')
                        .then(function (r) {
                            if (!r.ok) throw new Error('HTTP ' + r.status);
                            return r.json();
                        })
                        .then(function (manifest) {
                            var items = manifest.items || [];
                            return items.map(function (m) {
                                m._repo_url = repoUrl;
                                m._repo_name = spoke.repo_name;
                                m._spoke_id = spoke.id;
                                m._item_page_url = repoUrl + '/items/' + m.id + '/';
                                return m;
                            });
                        })
                        .catch(function () { return []; });
                });

                return Promise.all(promises).then(function (results) {
                    var allItems = [];
                    results.forEach(function (arr) {
                        allItems = allItems.concat(arr);
                    });
                    return allItems;
                });
            })
            .then(function (liveItems) {
                if (liveItems.length > 0) {
                    setSessionCache(liveItems);
                }
                // Fill gaps from fallback
                return loadFallback().then(function (fallback) {
                    var loadedIds = {};
                    var hadLiveItems = liveItems.length > 0;
                    liveItems.forEach(function (m) { loadedIds[m.id] = true; });

                    fallback.forEach(function (fb) {
                        if (!loadedIds[fb.id]) {
                            fb._coming_soon = hadLiveItems;
                            liveItems.push(fb);
                        }
                    });

                    if (liveItems.length === 0) {
                        return fallback;
                    }
                    return liveItems;
                });
            })
            .catch(function () {
                return loadFallback();
            });
    }

    /* ---------- Fetch thumbnail SVG for an item ---------- */

    function fetchThumbnail(repoUrl, itemId) {
        var url = repoUrl + '/items/' + itemId + '/thumbnail.svg';
        return fetch(url)
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.text();
            })
            .catch(function () { return null; });
    }

    /* ---------- Public API ---------- */

    window.EMZoo = window.EMZoo || {};
    window.EMZoo.registry = {
        loadRegistry: loadRegistry,
        fetchThumbnail: fetchThumbnail
    };
})();
