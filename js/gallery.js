/* ============================================================
   EM Zoo Hub — Gallery Module
   Renders card grid with EM field-themed thumbnails.
   Public API: EMZoo.gallery
   ============================================================ */
(function () {
    'use strict';

    var gridEl = null;
    var allItems = [];

    /* ---------- Category colours ---------- */

    var CATEGORY_COLORS = {
        'st-electrostatics':    '#58a6ff',
        'st-magnetostatics':    '#79c0ff',
        'dy-induction':         '#f0883e',
        'dy-maxwell-system':    '#d29922',
        'wv-wave-propagation':  '#3fb950',
        'wv-wave-interactions': '#56d364'
    };

    var CATEGORY_LABELS = {
        'electrostatics':    'Electrostatics',
        'magnetostatics':    'Magnetostatics',
        'induction':         'Induction',
        'maxwell-system':    'Maxwell System',
        'wave-propagation':  'Wave Propagation',
        'wave-interactions': 'Wave Interactions'
    };

    var GROUP_SHORTS = {
        'statics':  'ST',
        'dynamics': 'DY',
        'waves':    'WV'
    };

    var GROUP_LABELS = {
        'statics':  'Statics',
        'dynamics': 'Dynamics',
        'waves':    'Waves'
    };

    function getColor(item) {
        var groupShort = (GROUP_SHORTS[item.group] || 'st').toLowerCase();
        var key = groupShort + '-' + (item.category || 'default');
        return CATEGORY_COLORS[key] || item.color_accent || '#8b949e';
    }

    /* ---------- Complexity helpers ---------- */

    var COMPLEXITY_MAP = { beginner: 1, intermediate: 2, advanced: 3 };

    function complexityDots(level) {
        var n = COMPLEXITY_MAP[level] || 1;
        var html = '';
        for (var i = 0; i < 3; i++) {
            html += '<span class="zoo-card__complexity-dot' +
                (i < n ? ' zoo-card__complexity-dot--filled' : '') + '"></span>';
        }
        return html;
    }

    /* ---------- EM Field Thumbnail Generators ---------- */

    function svgWrap(inner) {
        return '<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">' +
            '<rect width="400" height="250" fill="none"/>' + inner + '</svg>';
    }

    /* Electrostatics: radial field lines from +/- charges */
    function generateCoulombThumbnail(color) {
        var lines = '';
        // Positive charge at (140, 125)
        for (var i = 0; i < 8; i++) {
            var angle = i * Math.PI / 4;
            var x2 = 140 + 80 * Math.cos(angle);
            var y2 = 125 + 80 * Math.sin(angle);
            lines += '<line class="em-field-line" x1="140" y1="125" x2="' + x2 + '" y2="' + y2 +
                '" stroke="' + color + '" stroke-width="1.5" stroke-dasharray="8 4" opacity="0.7"/>';
        }
        // Negative charge at (260, 125)
        for (var j = 0; j < 8; j++) {
            var a = j * Math.PI / 4;
            var nx2 = 260 + 80 * Math.cos(a);
            var ny2 = 125 + 80 * Math.sin(a);
            lines += '<line class="em-field-line" x1="' + nx2 + '" y1="' + ny2 + '" x2="260" y2="125"' +
                ' stroke="' + color + '" stroke-width="1.5" stroke-dasharray="8 4" opacity="0.7"/>';
        }
        // Charges
        var charges = '<circle class="em-charge" cx="140" cy="125" r="12" fill="#f85149" opacity="0.9"/>' +
            '<text x="140" y="130" text-anchor="middle" fill="#fff" font-size="16" font-weight="700">+</text>' +
            '<circle class="em-charge" cx="260" cy="125" r="12" fill="#58a6ff" opacity="0.9"/>' +
            '<text x="260" y="130" text-anchor="middle" fill="#fff" font-size="16" font-weight="700">&minus;</text>';
        return svgWrap(lines + charges);
    }

    /* Electric potential: equipotential contours */
    function generatePotentialThumbnail(color) {
        var contours = '';
        var radii = [25, 45, 65, 85, 105];
        for (var i = 0; i < radii.length; i++) {
            var opacity = 0.8 - i * 0.12;
            contours += '<ellipse cx="200" cy="125" rx="' + radii[i] + '" ry="' + (radii[i] * 0.7) +
                '" fill="none" stroke="' + color + '" stroke-width="1.5" opacity="' + opacity + '"/>';
        }
        var charge = '<circle class="em-charge" cx="200" cy="125" r="8" fill="' + color + '"/>' +
            '<text x="200" y="130" text-anchor="middle" fill="#fff" font-size="12" font-weight="700">+</text>';
        // Gradient arrows
        var arrows = '';
        var dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
        for (var j = 0; j < dirs.length; j++) {
            var ax = 200 + dirs[j][0] * 50;
            var ay = 125 + dirs[j][1] * 35;
            var dx = dirs[j][0] * 18;
            var dy = dirs[j][1] * 18;
            arrows += '<line class="em-arrow" x1="' + ax + '" y1="' + ay + '" x2="' + (ax + dx) + '" y2="' + (ay + dy) +
                '" stroke="' + color + '" stroke-width="2" marker-end="url(#em-arrowhead-' + color.replace('#', '') + ')" opacity="0.6"/>';
        }
        var defs = '<defs><marker id="em-arrowhead-' + color.replace('#', '') +
            '" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">' +
            '<path d="M0,0 L8,3 L0,6" fill="' + color + '"/></marker></defs>';
        return svgWrap(defs + contours + charge + arrows);
    }

    /* Gauss's law: Gaussian surface with flux arrows */
    function generateGaussThumbnail(color) {
        var surface = '<ellipse cx="200" cy="125" rx="90" ry="70" fill="none" stroke="' + color +
            '" stroke-width="2" stroke-dasharray="6 3" opacity="0.6"/>';
        var charge = '<circle class="em-charge" cx="200" cy="125" r="10" fill="' + color + '" opacity="0.9"/>' +
            '<text x="200" y="130" text-anchor="middle" fill="#fff" font-size="14" font-weight="700">Q</text>';
        var flux = '';
        for (var i = 0; i < 8; i++) {
            var angle = i * Math.PI / 4;
            var x1 = 200 + 90 * Math.cos(angle);
            var y1 = 125 + 70 * Math.sin(angle);
            var x2 = 200 + 115 * Math.cos(angle);
            var y2 = 125 + 90 * Math.sin(angle);
            flux += '<line class="em-arrow" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
                '" stroke="' + color + '" stroke-width="2" opacity="0.7"/>';
        }
        return svgWrap(surface + charge + flux);
    }

    /* Biot-Savart: B field loops around a wire */
    function generateBiotSavartThumbnail(color) {
        var wire = '<line x1="200" y1="30" x2="200" y2="220" stroke="#e3b341" stroke-width="4" opacity="0.8"/>' +
            '<text x="210" y="50" fill="#e3b341" font-size="12" font-weight="600">I</text>';
        var loops = '';
        var radii = [30, 55, 80];
        for (var i = 0; i < radii.length; i++) {
            loops += '<circle class="em-field-line" cx="200" cy="125" r="' + radii[i] +
                '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-dasharray="8 4" opacity="' + (0.8 - i * 0.15) + '"/>';
        }
        // Direction dots (into/out of page)
        var dot1 = '<circle cx="200" cy="125" r="3" fill="#e3b341"/>';
        return svgWrap(wire + loops + dot1);
    }

    /* Ampere's law: circulation path around wire */
    function generateAmpereThumbnail(color) {
        var wire = '<circle cx="200" cy="125" r="8" fill="#e3b341" opacity="0.9"/>' +
            '<circle cx="200" cy="125" r="3" fill="#1c2128"/>';
        var path = '<circle cx="200" cy="125" r="65" fill="none" stroke="' + color +
            '" stroke-width="2.5" stroke-dasharray="10 5" opacity="0.7"/>';
        // Circulation arrows
        var arrows = '';
        for (var i = 0; i < 4; i++) {
            var angle = i * Math.PI / 2 + Math.PI / 4;
            var x = 200 + 65 * Math.cos(angle);
            var y = 125 + 65 * Math.sin(angle);
            arrows += '<circle class="em-arrow" cx="' + x + '" cy="' + y +
                '" r="4" fill="' + color + '" opacity="0.8"/>';
        }
        var label = '<text x="200" y="220" text-anchor="middle" fill="' + color +
            '" font-size="11" opacity="0.6">B · dl</text>';
        return svgWrap(path + wire + arrows + label);
    }

    /* Faraday's law: changing B flux with induced E loop */
    function generateFaradayThumbnail(color) {
        // Magnetic field region
        var bRegion = '<rect x="140" y="60" width="120" height="130" rx="8" fill="' + color + '" opacity="0.1"/>';
        var bSymbols = '';
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 2; j++) {
                var cx = 165 + i * 35;
                var cy = 95 + j * 55;
                bSymbols += '<text x="' + cx + '" y="' + cy + '" text-anchor="middle" fill="' + color +
                    '" font-size="18" opacity="0.5">&times;</text>';
            }
        }
        // Induced E loop
        var loop = '<ellipse class="em-field-line" cx="200" cy="125" rx="100" ry="60" fill="none" stroke="' +
            color + '" stroke-width="2" stroke-dasharray="10 4" opacity="0.8"/>';
        var label = '<text x="320" y="100" fill="' + color + '" font-size="11" font-weight="600" opacity="0.7">E</text>';
        return svgWrap(bRegion + bSymbols + loop + label);
    }

    /* Displacement current: capacitor with E field in gap */
    function generateDisplacementThumbnail(color) {
        // Capacitor plates
        var plates = '<rect x="170" y="40" width="8" height="170" rx="2" fill="#8b949e" opacity="0.7"/>' +
            '<rect x="222" y="40" width="8" height="170" rx="2" fill="#8b949e" opacity="0.7"/>';
        // E field in gap
        var efield = '';
        for (var i = 0; i < 5; i++) {
            var y = 60 + i * 35;
            efield += '<line class="em-arrow" x1="182" y1="' + y + '" x2="218" y2="' + y +
                '" stroke="' + color + '" stroke-width="1.5" opacity="0.6"/>';
        }
        // B circulation in gap
        var bloop = '<circle class="em-field-line" cx="200" cy="125" r="50" fill="none" stroke="#e3b341"' +
            ' stroke-width="1.5" stroke-dasharray="6 3" opacity="0.5"/>';
        // Wire
        var wires = '<line x1="50" y1="125" x2="170" y2="125" stroke="#8b949e" stroke-width="2" opacity="0.6"/>' +
            '<line x1="230" y1="125" x2="350" y2="125" stroke="#8b949e" stroke-width="2" opacity="0.6"/>';
        return svgWrap(plates + efield + bloop + wires);
    }

    /* Maxwell system: coupled E and B curl arrows */
    function generateMaxwellThumbnail(color) {
        // E field curl (left)
        var eLoop = '<circle cx="140" cy="125" r="45" fill="none" stroke="' + color +
            '" stroke-width="2" stroke-dasharray="8 4" opacity="0.7"/>';
        var eLabel = '<text x="140" y="90" text-anchor="middle" fill="' + color +
            '" font-size="14" font-weight="700" opacity="0.8">E</text>';
        // B field curl (right)
        var bLoop = '<circle cx="260" cy="125" r="45" fill="none" stroke="#e3b341"' +
            ' stroke-width="2" stroke-dasharray="8 4" opacity="0.7"/>';
        var bLabel = '<text x="260" y="90" text-anchor="middle" fill="#e3b341"' +
            ' font-size="14" font-weight="700" opacity="0.8">B</text>';
        // Coupling arrows
        var coupling = '<path class="em-arrow" d="M190,110 Q200,95 210,110" fill="none" stroke="' +
            color + '" stroke-width="2" opacity="0.6"/>' +
            '<path class="em-arrow" d="M210,140 Q200,155 190,140" fill="none" stroke="#e3b341"' +
            ' stroke-width="2" opacity="0.6"/>';
        return svgWrap(eLoop + eLabel + bLoop + bLabel + coupling);
    }

    /* Lorentz force: particle trajectory in B field */
    function generateLorentzThumbnail(color) {
        // B field dots (into page)
        var bField = '';
        for (var i = 0; i < 5; i++) {
            for (var j = 0; j < 3; j++) {
                bField += '<text x="' + (60 + i * 70) + '" y="' + (55 + j * 70) +
                    '" text-anchor="middle" fill="' + color + '" font-size="14" opacity="0.3">&times;</text>';
            }
        }
        // Spiral trajectory
        var path = '<path class="em-particle" d="M80,200 Q100,160 130,140 Q160,120 180,100 Q200,80 230,90 ' +
            'Q260,100 270,130 Q280,160 260,180 Q240,200 210,190 Q180,180 175,150" ' +
            'fill="none" stroke="#f85149" stroke-width="2" stroke-dasharray="6 3" opacity="0.8"/>';
        var particle = '<circle cx="175" cy="150" r="6" fill="#f85149" opacity="0.9"/>';
        return svgWrap(bField + path + particle);
    }

    /* Wave equation: 1D wave propagation */
    function generateWaveEqThumbnail(color) {
        var wave = '<path class="em-wave" d="';
        for (var i = 0; i < 400; i += 2) {
            var y = 125 + 50 * Math.sin((i / 400) * 4 * Math.PI);
            wave += (i === 0 ? 'M' : 'L') + i + ',' + y;
        }
        wave += '" fill="none" stroke="' + color + '" stroke-width="2.5" opacity="0.8"/>';
        // Velocity arrow
        var arrow = '<line x1="300" y1="40" x2="360" y2="40" stroke="' + color +
            '" stroke-width="2" opacity="0.6"/>' +
            '<text x="330" y="32" text-anchor="middle" fill="' + color +
            '" font-size="11" opacity="0.6">v = 1/&radic;(&mu;&epsilon;)</text>';
        return svgWrap(wave + arrow);
    }

    /* Plane waves: E and H vectors with propagation */
    function generatePlaneWaveThumbnail(color) {
        // E wave (vertical oscillation)
        var eWave = '<path class="em-wave" d="';
        for (var i = 0; i < 380; i += 2) {
            var y = 125 + 60 * Math.sin((i / 380) * 3 * Math.PI);
            eWave += (i === 0 ? 'M' : 'L') + (i + 10) + ',' + y;
        }
        eWave += '" fill="none" stroke="' + color + '" stroke-width="2" opacity="0.8"/>';

        // H wave (offset, lighter)
        var hWave = '<path class="em-wave" d="';
        for (var j = 0; j < 380; j += 2) {
            var hy = 125 + 40 * Math.cos((j / 380) * 3 * Math.PI);
            hWave += (j === 0 ? 'M' : 'L') + (j + 10) + ',' + hy;
        }
        hWave += '" fill="none" stroke="#e3b341" stroke-width="1.5" opacity="0.6"/>';

        var labels = '<text x="370" y="70" fill="' + color + '" font-size="12" font-weight="600">E</text>' +
            '<text x="370" y="105" fill="#e3b341" font-size="12" font-weight="600">H</text>';
        return svgWrap(eWave + hWave + labels);
    }

    /* Poynting vector: energy flow arrows on wave */
    function generatePoyntingThumbnail(color) {
        var wave = '<path d="';
        for (var i = 0; i < 400; i += 2) {
            var y = 140 + 40 * Math.sin((i / 400) * 4 * Math.PI);
            wave += (i === 0 ? 'M' : 'L') + i + ',' + y;
        }
        wave += '" fill="none" stroke="' + color + '" stroke-width="1.5" opacity="0.5"/>';
        // S arrows (horizontal, showing energy flow direction)
        var arrows = '';
        for (var j = 0; j < 5; j++) {
            var ax = 50 + j * 75;
            arrows += '<line class="em-arrow" x1="' + ax + '" y1="80" x2="' + (ax + 35) + '" y2="80"' +
                ' stroke="' + color + '" stroke-width="2.5" opacity="0.7"/>' +
                '<polygon points="' + (ax + 35) + ',75 ' + (ax + 45) + ',80 ' + (ax + 35) + ',85"' +
                ' fill="' + color + '" opacity="0.7"/>';
        }
        var label = '<text x="200" y="55" text-anchor="middle" fill="' + color +
            '" font-size="13" font-weight="600" opacity="0.7">S = E x H</text>';
        return svgWrap(wave + arrows + label);
    }

    /* Boundary conditions: wave at interface */
    function generateBoundaryThumbnail(color) {
        // Interface line
        var iface = '<line x1="200" y1="20" x2="200" y2="230" stroke="#8b949e" stroke-width="2" opacity="0.5"/>';
        // Media labels
        var labels = '<text x="100" y="40" text-anchor="middle" fill="' + color +
            '" font-size="11" opacity="0.6">&epsilon;&#8321;</text>' +
            '<text x="300" y="40" text-anchor="middle" fill="#56d364"' +
            ' font-size="11" opacity="0.6">&epsilon;&#8322;</text>';
        // Incident wave
        var incident = '<line class="em-arrow" x1="50" y1="80" x2="195" y2="130"' +
            ' stroke="' + color + '" stroke-width="2" opacity="0.8"/>';
        // Reflected wave
        var reflected = '<line class="em-arrow" x1="195" y1="130" x2="50" y2="180"' +
            ' stroke="' + color + '" stroke-width="1.5" stroke-dasharray="6 3" opacity="0.6"/>';
        // Transmitted wave
        var transmitted = '<line class="em-arrow" x1="205" y1="130" x2="350" y2="170"' +
            ' stroke="#56d364" stroke-width="2" opacity="0.7"/>';
        return svgWrap(iface + labels + incident + reflected + transmitted);
    }

    /* Fresnel coefficients: reflection/transmission bars */
    function generateFresnelThumbnail(color) {
        // Interface
        var iface = '<line x1="200" y1="30" x2="200" y2="220" stroke="#8b949e" stroke-width="1.5" opacity="0.4"/>';
        // Incident ray
        var rays = '<line x1="60" y1="60" x2="198" y2="125" stroke="' + color + '" stroke-width="2" opacity="0.8"/>' +
            '<line x1="198" y1="125" x2="60" y2="190" stroke="' + color + '" stroke-width="1.5" opacity="0.5"/>' +
            '<line x1="202" y1="125" x2="340" y2="165" stroke="#56d364" stroke-width="2" opacity="0.7"/>';
        // Bars showing Gamma and Tau
        var bars = '<rect x="280" y="195" width="30" height="30" rx="3" fill="' + color + '" opacity="0.4"/>' +
            '<text x="295" y="215" text-anchor="middle" fill="' + color + '" font-size="11">&Gamma;</text>' +
            '<rect x="320" y="175" width="30" height="50" rx="3" fill="#56d364" opacity="0.4"/>' +
            '<text x="335" y="215" text-anchor="middle" fill="#56d364" font-size="11">&tau;</text>';
        return svgWrap(iface + rays + bars);
    }

    /* Lossy media: exponential decay */
    function generateLossyThumbnail(color) {
        // Decaying wave
        var wave = '<path class="em-wave" d="';
        for (var i = 0; i < 380; i += 2) {
            var decay = Math.exp(-i / 150);
            var y = 125 + 70 * decay * Math.sin((i / 380) * 6 * Math.PI);
            wave += (i === 0 ? 'M' : 'L') + (i + 10) + ',' + y;
        }
        wave += '" fill="none" stroke="' + color + '" stroke-width="2" opacity="0.8"/>';
        // Envelope
        var envTop = '<path d="';
        var envBot = '<path d="';
        for (var j = 0; j < 380; j += 4) {
            var d = Math.exp(-j / 150);
            var yt = 125 - 70 * d;
            var yb = 125 + 70 * d;
            envTop += (j === 0 ? 'M' : 'L') + (j + 10) + ',' + yt;
            envBot += (j === 0 ? 'M' : 'L') + (j + 10) + ',' + yb;
        }
        envTop += '" fill="none" stroke="' + color + '" stroke-width="1" stroke-dasharray="4 3" opacity="0.4"/>';
        envBot += '" fill="none" stroke="' + color + '" stroke-width="1" stroke-dasharray="4 3" opacity="0.4"/>';
        // Skin depth marker
        var delta = '<line x1="160" y1="35" x2="160" y2="215" stroke="#f85149" stroke-width="1" stroke-dasharray="4 2" opacity="0.5"/>' +
            '<text x="160" y="30" text-anchor="middle" fill="#f85149" font-size="10" opacity="0.7">&delta;</text>';
        return svgWrap(wave + envTop + envBot + delta);
    }

    /* Retarded potentials: light-cone delay rings */
    function generateRetardedThumbnail(color) {
        var rings = '';
        for (var i = 1; i <= 5; i++) {
            rings += '<circle class="em-field-line" cx="100" cy="200" r="' + (i * 35) +
                '" fill="none" stroke="' + color + '" stroke-width="1.5" opacity="' + (0.8 - i * 0.12) +
                '" stroke-dasharray="6 3"/>';
        }
        // Source
        var source = '<circle class="em-charge" cx="100" cy="200" r="6" fill="' + color + '"/>';
        // Observer
        var observer = '<circle cx="300" cy="80" r="5" fill="#e3b341" opacity="0.8"/>' +
            '<text x="315" y="85" fill="#e3b341" font-size="10" opacity="0.7">P</text>';
        // Delay line
        var delay = '<line x1="106" y1="195" x2="295" y2="85" stroke="' + color +
            '" stroke-width="1" stroke-dasharray="4 3" opacity="0.4"/>';
        var label = '<text x="200" y="130" text-anchor="middle" fill="' + color +
            '" font-size="10" opacity="0.5" transform="rotate(-30,200,130)">t_r = t - |r|/c</text>';
        return svgWrap(rings + source + observer + delay + label);
    }

    /* ---------- Thumbnail dispatch ---------- */

    var THUMBNAIL_MAP = {
        'coulomb-field':         generateCoulombThumbnail,
        'electric-potential':    generatePotentialThumbnail,
        'gauss-law':             generateGaussThumbnail,
        'biot-savart':           generateBiotSavartThumbnail,
        'ampere-law':            generateAmpereThumbnail,
        'faraday-law':           generateFaradayThumbnail,
        'displacement-current':  generateDisplacementThumbnail,
        'maxwell-equations':     generateMaxwellThumbnail,
        'lorentz-force':         generateLorentzThumbnail,
        'em-wave-equation':      generateWaveEqThumbnail,
        'plane-waves':           generatePlaneWaveThumbnail,
        'poynting-vector':       generatePoyntingThumbnail,
        'boundary-conditions':   generateBoundaryThumbnail,
        'fresnel-coefficients':  generateFresnelThumbnail,
        'lossy-media':           generateLossyThumbnail,
        'retarded-potentials':   generateRetardedThumbnail
    };

    function generateFallbackThumbnail(item) {
        var color = getColor(item);
        var generator = THUMBNAIL_MAP[item.id];
        if (generator) return generator(color);

        // Generic fallback: field lines pattern
        var lines = '';
        for (var i = 0; i < 6; i++) {
            var y = 40 + i * 35;
            lines += '<path class="em-field-line" d="M30,' + y + ' Q200,' + (y + 20 * Math.sin(i)) + ' 370,' + y +
                '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-dasharray="8 4" opacity="' + (0.3 + i * 0.08) + '"/>';
        }
        return svgWrap(lines);
    }

    /* ---------- Create a single card ---------- */

    function createCard(item) {
        var isComingSoon = item._coming_soon;
        var card = document.createElement('a');
        card.className = 'zoo-card' + (isComingSoon ? ' zoo-card--coming-soon' : '');
        card.target = '_blank';
        card.rel = 'noopener';

        if (!isComingSoon && item._item_page_url) {
            card.href = item._item_page_url;
        } else if (!isComingSoon && item._repo_url) {
            card.href = item._repo_url + '/';
        } else {
            card.href = '#';
            card.style.cursor = 'default';
        }

        var groupLabel = (GROUP_SHORTS[item.group] || 'EM').toUpperCase();
        var groupClass = item.group || 'default';
        var catLabel = CATEGORY_LABELS[item.category] || item.category || '';

        // Tags (first 3)
        var tagsHtml = '';
        var tags = item.tags || [];
        for (var i = 0; i < Math.min(3, tags.length); i++) {
            tagsHtml += '<span class="zoo-card__tag">' + tags[i] + '</span>';
        }

        // Year
        var yearHtml = item.year_introduced ?
            '<div class="zoo-card__year">Est. ' + item.year_introduced + '</div>' : '';

        card.innerHTML =
            '<div class="zoo-card__thumbnail" data-item-id="' + item.id + '">' +
                generateFallbackThumbnail(item) +
            '</div>' +
            '<div class="zoo-card__body">' +
                '<div class="zoo-card__title">' + item.name + '</div>' +
                yearHtml +
                '<div class="zoo-card__description">' + item.short_description + '</div>' +
            '</div>' +
            '<div class="zoo-card__meta">' +
                '<span class="zoo-card__task-badge zoo-card__task-badge--' + groupClass + '">' + groupLabel + '</span>' +
                '<span class="zoo-card__category-badge" style="color:' + getColor(item) + '">' + catLabel + '</span>' +
                tagsHtml +
                '<span class="zoo-card__complexity">' + complexityDots(item.complexity) + '</span>' +
            '</div>';

        return card;
    }

    /* ---------- Render cards ---------- */

    function renderCards(items) {
        if (!gridEl) return;
        gridEl.innerHTML = '';
        gridEl.classList.remove('zoo-grid--grouped');

        if (items.length === 0) {
            gridEl.innerHTML =
                '<div class="zoo-no-results">' +
                    '<div class="zoo-no-results__icon">?</div>' +
                    '<div class="zoo-no-results__text">No models match your filters</div>' +
                '</div>';
            return;
        }

        var frag = document.createDocumentFragment();
        items.forEach(function (m) {
            frag.appendChild(createCard(m));
        });
        gridEl.appendChild(frag);
    }

    /* ---------- Render grouped view ---------- */

    function renderGroupedCards(items) {
        if (!gridEl) return;
        gridEl.innerHTML = '';
        gridEl.classList.add('zoo-grid--grouped');

        var groups = {};
        items.forEach(function (m) {
            var group = m.group || 'other';
            var cat = m.category || 'other';
            var key = group + '|' + cat;
            if (!groups[key]) groups[key] = { group: group, category: cat, items: [] };
            groups[key].items.push(m);
        });

        var groupOrder = { 'statics': 0, 'dynamics': 1, 'waves': 2 };
        var catOrder = {
            'electrostatics': 0, 'magnetostatics': 1,
            'induction': 2, 'maxwell-system': 3,
            'wave-propagation': 4, 'wave-interactions': 5
        };

        var sortedKeys = Object.keys(groups).sort(function (a, b) {
            var ga = groups[a], gb = groups[b];
            var td = (groupOrder[ga.group] !== undefined ? groupOrder[ga.group] : 9) -
                     (groupOrder[gb.group] !== undefined ? groupOrder[gb.group] : 9);
            if (td !== 0) return td;
            return (catOrder[ga.category] !== undefined ? catOrder[ga.category] : 9) -
                   (catOrder[gb.category] !== undefined ? catOrder[gb.category] : 9);
        });

        var frag = document.createDocumentFragment();
        var lastGroup = '';

        sortedKeys.forEach(function (key) {
            var grp = groups[key];

            if (grp.group !== lastGroup) {
                lastGroup = grp.group;
                var header = document.createElement('div');
                header.className = 'zoo-section-header';
                var displayGroup = GROUP_LABELS[grp.group] || grp.group;
                header.innerHTML = '<h2 class="zoo-section-header__title">' +
                    displayGroup + '</h2>';
                frag.appendChild(header);
            }

            var catHeader = document.createElement('h3');
            catHeader.className = 'zoo-subsection-header';
            catHeader.textContent = (CATEGORY_LABELS[grp.category] || grp.category) +
                ' (' + grp.items.length + ')';
            frag.appendChild(catHeader);

            var subGrid = document.createElement('div');
            subGrid.className = 'zoo-grid';
            grp.items.forEach(function (m) {
                subGrid.appendChild(createCard(m));
            });
            frag.appendChild(subGrid);
        });

        gridEl.appendChild(frag);
    }

    /* ---------- Render skeleton loading ---------- */

    function renderSkeletons(count) {
        if (!gridEl) return;
        gridEl.innerHTML = '';
        var frag = document.createDocumentFragment();
        for (var i = 0; i < count; i++) {
            var skel = document.createElement('div');
            skel.className = 'zoo-skeleton';
            skel.innerHTML =
                '<div class="zoo-skeleton__thumb"></div>' +
                '<div class="zoo-skeleton__body">' +
                    '<div class="zoo-skeleton__line zoo-skeleton__line--short"></div>' +
                    '<div class="zoo-skeleton__line zoo-skeleton__line--medium"></div>' +
                    '<div class="zoo-skeleton__line"></div>' +
                '</div>';
            frag.appendChild(skel);
        }
        gridEl.appendChild(frag);
    }

    /* ---------- Try loading live thumbnails ---------- */

    function loadThumbnails(items) {
        items.forEach(function (m) {
            if (!m._repo_url || m._coming_soon) return;
            var thumbEl = document.querySelector('[data-item-id="' + m.id + '"]');
            if (!thumbEl) return;

            EMZoo.registry.fetchThumbnail(m._repo_url, m.id)
                .then(function (svg) {
                    if (svg && thumbEl) thumbEl.innerHTML = svg;
                });
        });
    }

    /* ---------- Init ---------- */

    function init(containerSelector) {
        gridEl = document.querySelector(containerSelector || '.zoo-grid');
    }

    /* ---------- Public API ---------- */

    window.EMZoo = window.EMZoo || {};
    window.EMZoo.gallery = {
        init: init,
        renderCards: renderCards,
        renderGroupedCards: renderGroupedCards,
        renderSkeletons: renderSkeletons,
        loadThumbnails: loadThumbnails,
        getColor: getColor,
        CATEGORY_COLORS: CATEGORY_COLORS,
        CATEGORY_LABELS: CATEGORY_LABELS
    };
})();
