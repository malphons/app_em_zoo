/* ============================================================
   EM Zoo Hub — Search, Filter & Sort Module
   Public API: EMZoo.search
   ============================================================ */
(function () {
    'use strict';

    var allItems = [];
    var searchIndex = [];
    var activeGroup = 'all';
    var activeCategory = 'all';
    var activeSort = 'name';
    var searchQuery = '';
    var debounceTimer = null;

    var COMPLEXITY_ORDER = { beginner: 1, intermediate: 2, advanced: 3 };

    /* ---------- Build search index ---------- */

    function buildSearchIndex(items) {
        allItems = items;
        searchIndex = items.map(function (m) {
            var parts = [
                m.name || '',
                m.short_description || '',
                (m.tags || []).join(' '),
                (m.use_cases || []).join(' '),
                m.key_equation || '',
                m.group || '',
                m.category || '',
                m.id || ''
            ];
            return parts.join(' ').toLowerCase();
        });
    }

    /* ---------- Filter ---------- */

    function filterItems() {
        var terms = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);

        var result = allItems.filter(function (m, idx) {
            if (activeGroup !== 'all' && m.group !== activeGroup) return false;
            if (activeCategory !== 'all' && m.category !== activeCategory) return false;

            if (terms.length > 0) {
                var text = searchIndex[idx];
                for (var i = 0; i < terms.length; i++) {
                    if (text.indexOf(terms[i]) === -1) return false;
                }
            }

            return true;
        });

        result.sort(function (a, b) {
            switch (activeSort) {
                case 'name':
                    return (a.name || '').localeCompare(b.name || '');
                case 'year-asc':
                    return (a.year_introduced || 9999) - (b.year_introduced || 9999);
                case 'year-desc':
                    return (b.year_introduced || 0) - (a.year_introduced || 0);
                case 'complexity':
                    return (COMPLEXITY_ORDER[a.complexity] || 0) - (COMPLEXITY_ORDER[b.complexity] || 0);
                default:
                    return 0;
            }
        });

        return result;
    }

    /* ---------- Get categories for current group filter ---------- */

    function getCategories() {
        var GROUP_SHORTS = { 'statics': 'st', 'dynamics': 'dy', 'waves': 'wv' };
        var seen = {};
        var cats = [];
        allItems.forEach(function (m) {
            if (activeGroup !== 'all' && m.group !== activeGroup) return;
            var groupShort = GROUP_SHORTS[m.group] || 'st';
            var key = groupShort + '-' + (m.category || 'default');
            if (!seen[key]) {
                seen[key] = true;
                cats.push({
                    id: m.category,
                    key: key,
                    label: EMZoo.gallery.CATEGORY_LABELS[m.category] || m.category,
                    color: EMZoo.gallery.CATEGORY_COLORS[key] || '#8b949e'
                });
            }
        });
        if (activeGroup === 'all') {
            var deduped = {};
            cats.forEach(function (c) {
                if (!deduped[c.id]) deduped[c.id] = c;
            });
            cats = Object.keys(deduped).map(function (k) { return deduped[k]; });
        }
        return cats;
    }

    /* ---------- Render filter pills ---------- */

    function renderFilterPills(containerSelector) {
        var container = document.querySelector(containerSelector);
        if (!container) return;

        var cats = getCategories();
        var html = '<span class="zoo-filters__label">Category:</span>' +
            '<button class="zoo-filter-pill' + (activeCategory === 'all' ? ' zoo-filter-pill--active' : '') +
            '" data-category="all">All</button>';

        cats.forEach(function (c) {
            var active = activeCategory === c.id;
            html += '<button class="zoo-filter-pill' + (active ? ' zoo-filter-pill--active' : '') +
                '" data-category="' + c.id + '"' +
                ' style="' + (active ? 'color:' + c.color + ';border-color:' + c.color : '') + '">' +
                c.label + '</button>';
        });

        container.innerHTML = html;

        container.querySelectorAll('.zoo-filter-pill').forEach(function (btn) {
            btn.addEventListener('click', function () {
                activeCategory = btn.getAttribute('data-category');
                renderFilterPills(containerSelector);
                triggerUpdate();
            });
        });
    }

    /* ---------- Bind group pills ---------- */

    function bindTaskPills(containerSelector, onChange) {
        var container = document.querySelector(containerSelector);
        if (!container) return;

        container.querySelectorAll('.zoo-task-pill').forEach(function (btn) {
            btn.addEventListener('click', function () {
                activeGroup = btn.getAttribute('data-task');
                activeCategory = 'all';
                container.querySelectorAll('.zoo-task-pill').forEach(function (b) {
                    b.classList.remove('zoo-task-pill--active');
                });
                btn.classList.add('zoo-task-pill--active');
                if (onChange) onChange();
            });
        });
    }

    /* ---------- Bind search input ---------- */

    function bindSearchInput(inputSelector, onChange) {
        var input = document.querySelector(inputSelector);
        if (!input) return;

        input.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                searchQuery = input.value;
                if (onChange) onChange();
            }, 200);
        });
    }

    /* ---------- Bind sort ---------- */

    function bindSort(selectSelector, onChange) {
        var sel = document.querySelector(selectSelector);
        if (!sel) return;

        sel.addEventListener('change', function () {
            activeSort = sel.value;
            if (onChange) onChange();
        });
    }

    /* ---------- Update callback ---------- */

    var _onUpdate = null;

    function triggerUpdate() {
        if (_onUpdate) _onUpdate();
    }

    /* ---------- Init ---------- */

    function init(items, onUpdate) {
        buildSearchIndex(items);
        _onUpdate = onUpdate;
    }

    /* ---------- Update count display ---------- */

    function updateCount(countSelector, filtered, total) {
        var el = document.querySelector(countSelector);
        if (el) {
            el.textContent = filtered + ' of ' + total + ' models';
        }
    }

    /* ---------- Public API ---------- */

    window.EMZoo = window.EMZoo || {};
    window.EMZoo.search = {
        init: init,
        filterModels: filterItems,
        renderFilterPills: renderFilterPills,
        bindTaskPills: bindTaskPills,
        bindSearchInput: bindSearchInput,
        bindSort: bindSort,
        updateCount: updateCount,
        getActiveTask: function () { return activeGroup; },
        getActiveSubcategory: function () { return activeCategory; }
    };
})();
