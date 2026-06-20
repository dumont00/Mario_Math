// Rendu SVG des visuels accompagnant certaines questions
// (voir CLAUDE.md §5 et Specifications §16).
// Chaque fonction renvoie un SVGElement à insérer dans la modale.

const SVG_NS = 'http://www.w3.org/2000/svg';
const COULEURS = {
    Rouge:  '#e63946',
    Bleu:   '#1976d2',
    Vert:   '#2a9d3a',
    Jaune:  '#f6c244',
    Noir:   '#222222',
    Blanc:  '#ffffff',
    Orange: '#f08a24',
    Violet: '#8e44ad',
    Rose:   '#e84393',
    Gris:   '#7f8c8d'
};

function $svg(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k of Object.keys(attrs)) el.setAttribute(k, attrs[k]);
    return el;
}

function couleur(nom) { return COULEURS[nom] || COULEURS[nom?.charAt(0).toUpperCase() + nom?.slice(1).toLowerCase()] || '#888'; }

const Visuels = {
    render(visuel) {
        if (!visuel || !visuel.type) return null;
        const fn = Visuels[visuel.type];
        if (typeof fn !== 'function') return null;
        try { return fn(visuel); } catch (e) { console.warn('Visuel ' + visuel.type + ' a échoué :', e); return null; }
    },

    horloge(v) {
        const W = 160, R = 70, cx = W / 2, cy = W / 2;
        const svg = $svg('svg', { width: W, height: W, viewBox: `0 0 ${W} ${W}` });
        svg.appendChild($svg('circle', { cx, cy, r: R, fill: '#fff', stroke: '#1d2746', 'stroke-width': 3 }));
        for (let i = 0; i < 12; i++) {
            const a = i * (Math.PI / 6) - Math.PI / 2;
            const x1 = cx + Math.cos(a) * (R - 4);
            const y1 = cy + Math.sin(a) * (R - 4);
            const x2 = cx + Math.cos(a) * (R - (i % 3 === 0 ? 12 : 6));
            const y2 = cy + Math.sin(a) * (R - (i % 3 === 0 ? 12 : 6));
            svg.appendChild($svg('line', { x1, y1, x2, y2, stroke: '#1d2746', 'stroke-width': i % 3 === 0 ? 3 : 1.5 }));
        }
        for (let i = 1; i <= 12; i++) {
            const a = i * (Math.PI / 6) - Math.PI / 2;
            const x = cx + Math.cos(a) * (R - 22);
            const y = cy + Math.sin(a) * (R - 22) + 5;
            const t = $svg('text', { x, y, 'text-anchor': 'middle', 'font-size': 14, fill: '#1d2746', 'font-weight': 600 });
            t.textContent = i;
            svg.appendChild(t);
        }

        const heures = ((v.heures % 12) + (v.minutes || 0) / 60);
        const ah = heures * (Math.PI / 6) - Math.PI / 2;
        const am = (v.minutes || 0) * (Math.PI / 30) - Math.PI / 2;

        svg.appendChild($svg('line', {
            x1: cx, y1: cy,
            x2: cx + Math.cos(ah) * (R - 32),
            y2: cy + Math.sin(ah) * (R - 32),
            stroke: '#1d2746', 'stroke-width': 5, 'stroke-linecap': 'round'
        }));
        svg.appendChild($svg('line', {
            x1: cx, y1: cy,
            x2: cx + Math.cos(am) * (R - 12),
            y2: cy + Math.sin(am) * (R - 12),
            stroke: '#e63946', 'stroke-width': 3, 'stroke-linecap': 'round'
        }));
        svg.appendChild($svg('circle', { cx, cy, r: 4, fill: '#1d2746' }));
        return svg;
    },

    grilleAire(v) {
        const cell = 24, marge = 6;
        const W = v.largeur * cell + marge * 2;
        const H = v.hauteur * cell + marge * 2;
        const svg = $svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
        for (let y = 0; y < v.hauteur; y++) {
            for (let x = 0; x < v.largeur; x++) {
                svg.appendChild($svg('rect', {
                    x: marge + x * cell, y: marge + y * cell,
                    width: cell, height: cell,
                    fill: '#a3d4ff', stroke: '#1d2746', 'stroke-width': 1.5
                }));
            }
        }
        return svg;
    },

    quadrillage(v) {
        const cell = 24, marge = 24;
        const taille = v.taille || 6;
        const W = taille * cell + marge * 2;
        const H = taille * cell + marge * 2;
        const svg = $svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });

        for (let i = 0; i <= taille; i++) {
            svg.appendChild($svg('line', {
                x1: marge, y1: marge + i * cell,
                x2: marge + taille * cell, y2: marge + i * cell,
                stroke: '#c2cbe3', 'stroke-width': 1
            }));
            svg.appendChild($svg('line', {
                x1: marge + i * cell, y1: marge,
                x2: marge + i * cell, y2: marge + taille * cell,
                stroke: '#c2cbe3', 'stroke-width': 1
            }));
        }
        // Axes (origine en bas à gauche).
        svg.appendChild($svg('line', {
            x1: marge, y1: marge + taille * cell, x2: marge + taille * cell, y2: marge + taille * cell,
            stroke: '#1d2746', 'stroke-width': 2
        }));
        svg.appendChild($svg('line', {
            x1: marge, y1: marge, x2: marge, y2: marge + taille * cell,
            stroke: '#1d2746', 'stroke-width': 2
        }));
        // Étiquettes 0..taille
        for (let i = 0; i <= taille; i++) {
            const tx = $svg('text', {
                x: marge + i * cell, y: marge + taille * cell + 14,
                'text-anchor': 'middle', 'font-size': 11, fill: '#4a5a8a'
            });
            tx.textContent = i;
            svg.appendChild(tx);
            const ty = $svg('text', {
                x: marge - 6, y: marge + (taille - i) * cell + 4,
                'text-anchor': 'end', 'font-size': 11, fill: '#4a5a8a'
            });
            ty.textContent = i;
            svg.appendChild(ty);
        }
        // Point(s)
        if (v.point) {
            Object.keys(v.point).forEach(label => {
                const [x, y] = v.point[label];
                const cx = marge + x * cell;
                const cy = marge + (taille - y) * cell;
                svg.appendChild($svg('circle', { cx, cy, r: 6, fill: '#e63946', stroke: '#1d2746', 'stroke-width': 1.5 }));
                const t = $svg('text', { x: cx + 8, y: cy - 6, 'font-size': 14, fill: '#1d2746', 'font-weight': 700 });
                t.textContent = label;
                svg.appendChild(t);
            });
        }
        return svg;
    },

    barres(v) {
        const labels = Object.keys(v.donnees);
        const valeurs = labels.map(l => v.donnees[l]);
        const maxV = Math.max(1, ...valeurs);
        const padG = 36, padD = 12, padHaut = 26, padBas = 28;
        const colW = 38, gap = 14;
        const W = padG + padD + labels.length * (colW + gap);
        const H = 180;
        const aireH = H - padHaut - padBas;
        const svg = $svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });

        if (v.titre) {
            const t = $svg('text', { x: W / 2, y: 16, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#1d2746' });
            t.textContent = v.titre;
            svg.appendChild(t);
        }
        // Grille horizontale.
        const pas = Math.max(1, Math.ceil(maxV / 5));
        for (let g = 0; g <= maxV; g += pas) {
            const y = padHaut + aireH - (g / maxV) * aireH;
            svg.appendChild($svg('line', { x1: padG, y1: y, x2: W - padD, y2: y, stroke: '#e6ebf7', 'stroke-width': 1 }));
            const t = $svg('text', { x: padG - 6, y: y + 4, 'text-anchor': 'end', 'font-size': 11, fill: '#4a5a8a' });
            t.textContent = g;
            svg.appendChild(t);
        }
        // Axes.
        svg.appendChild($svg('line', { x1: padG, y1: padHaut, x2: padG, y2: padHaut + aireH, stroke: '#1d2746', 'stroke-width': 2 }));
        svg.appendChild($svg('line', { x1: padG, y1: padHaut + aireH, x2: W - padD, y2: padHaut + aireH, stroke: '#1d2746', 'stroke-width': 2 }));

        labels.forEach((lab, i) => {
            const x = padG + 8 + i * (colW + gap);
            const h = (valeurs[i] / maxV) * aireH;
            svg.appendChild($svg('rect', {
                x, y: padHaut + aireH - h, width: colW, height: h,
                fill: '#4a90e2', stroke: '#1d2746', 'stroke-width': 1.5
            }));
            const tx = $svg('text', {
                x: x + colW / 2, y: padHaut + aireH + 16,
                'text-anchor': 'middle', 'font-size': 11, fill: '#1d2746'
            });
            tx.textContent = lab;
            svg.appendChild(tx);
            const tv = $svg('text', {
                x: x + colW / 2, y: padHaut + aireH - h - 4,
                'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#1d2746'
            });
            tv.textContent = valeurs[i];
            svg.appendChild(tv);
        });
        return svg;
    },

    pictogramme(v) {
        const labels = Object.keys(v.donnees);
        const max = Math.max(1, ...labels.map(l => v.donnees[l]));
        const sym = 22;
        const padG = 76, padHaut = 30, padBas = 12, rowH = 30;
        const W = padG + max * sym + 16;
        const H = padHaut + labels.length * rowH + padBas;
        const svg = $svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });

        if (v.titre) {
            const t = $svg('text', { x: W / 2, y: 16, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#1d2746' });
            t.textContent = v.titre;
            svg.appendChild(t);
        }
        labels.forEach((lab, i) => {
            const y = padHaut + i * rowH + rowH / 2;
            const t = $svg('text', { x: padG - 6, y: y + 4, 'text-anchor': 'end', 'font-size': 12, fill: '#1d2746' });
            t.textContent = lab;
            svg.appendChild(t);
            const n = v.donnees[lab];
            for (let k = 0; k < n; k++) {
                svg.appendChild($svg('circle', {
                    cx: padG + k * sym + sym / 2, cy: y, r: sym / 2 - 2,
                    fill: '#f6c244', stroke: '#1d2746', 'stroke-width': 1.5
                }));
            }
        });
        if (v.valeurParSymbole) {
            const lbl = $svg('text', { x: W / 2, y: H - 2, 'text-anchor': 'middle', 'font-size': 11, fill: '#4a5a8a' });
            lbl.textContent = 'Chaque symbole = ' + v.valeurParSymbole;
            svg.appendChild(lbl);
        }
        return svg;
    },

    ligne(v) {
        const padG = 36, padD = 12, padHaut = 26, padBas = 28;
        const W = Math.max(260, padG + padD + v.labels.length * 44);
        const H = 180;
        const aireH = H - padHaut - padBas;
        const aireW = W - padG - padD;
        const maxV = Math.max(1, ...v.valeurs);
        const minV = Math.min(0, ...v.valeurs);
        const span = Math.max(1, maxV - minV);
        const svg = $svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });

        if (v.titre) {
            const t = $svg('text', { x: W / 2, y: 16, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#1d2746' });
            t.textContent = v.titre;
            svg.appendChild(t);
        }
        const grad = 5;
        for (let i = 0; i <= grad; i++) {
            const val = minV + (i / grad) * span;
            const y = padHaut + aireH - ((val - minV) / span) * aireH;
            svg.appendChild($svg('line', { x1: padG, y1: y, x2: W - padD, y2: y, stroke: '#e6ebf7', 'stroke-width': 1 }));
            const t = $svg('text', { x: padG - 6, y: y + 4, 'text-anchor': 'end', 'font-size': 11, fill: '#4a5a8a' });
            t.textContent = Math.round(val);
            svg.appendChild(t);
        }
        svg.appendChild($svg('line', { x1: padG, y1: padHaut, x2: padG, y2: padHaut + aireH, stroke: '#1d2746', 'stroke-width': 2 }));
        svg.appendChild($svg('line', { x1: padG, y1: padHaut + aireH, x2: W - padD, y2: padHaut + aireH, stroke: '#1d2746', 'stroke-width': 2 }));

        const pts = v.valeurs.map((val, i) => {
            const x = padG + (v.valeurs.length === 1 ? aireW / 2 : (i / (v.valeurs.length - 1)) * aireW);
            const y = padHaut + aireH - ((val - minV) / span) * aireH;
            return { x, y };
        });

        let d = '';
        pts.forEach((p, i) => { d += (i === 0 ? 'M' : ' L') + p.x + ',' + p.y; });
        svg.appendChild($svg('path', { d, fill: 'none', stroke: '#4a90e2', 'stroke-width': 2.5 }));

        pts.forEach((p, i) => {
            svg.appendChild($svg('circle', { cx: p.x, cy: p.y, r: 4, fill: '#e63946', stroke: '#1d2746', 'stroke-width': 1.5 }));
            const tx = $svg('text', {
                x: p.x, y: padHaut + aireH + 16,
                'text-anchor': 'middle', 'font-size': 11, fill: '#1d2746'
            });
            tx.textContent = v.labels[i];
            svg.appendChild(tx);
        });
        return svg;
    },

    sac(v) {
        const noms = Object.keys(v.billes);
        const total = noms.reduce((s, n) => s + v.billes[n], 0);
        const W = 180, H = 200;
        const svg = $svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });

        // Cordon du sac.
        svg.appendChild($svg('path', {
            d: `M 40 30 Q 90 10 140 30 L 150 60 Q 90 80 30 60 Z`,
            fill: '#a56f23', stroke: '#1d2746', 'stroke-width': 2
        }));
        // Corps du sac.
        svg.appendChild($svg('path', {
            d: `M 30 60 Q 30 180 90 185 Q 150 180 150 60 Z`,
            fill: '#c98a3f', stroke: '#1d2746', 'stroke-width': 2
        }));

        // Disposition des billes.
        const r = 9;
        let placees = [];
        for (let i = 0; i < total; i++) {
            // Cercle ordonné en grille à l'intérieur du sac.
            const col = i % 5;
            const row = Math.floor(i / 5);
            const x = 45 + col * 22;
            const y = 100 + row * 22;
            placees.push({ x, y });
        }
        let idx = 0;
        noms.forEach(nom => {
            const c = couleur(nom);
            for (let k = 0; k < v.billes[nom]; k++) {
                const p = placees[idx++];
                svg.appendChild($svg('circle', {
                    cx: p.x, cy: p.y, r,
                    fill: c, stroke: '#1d2746', 'stroke-width': 1.2
                }));
            }
        });

        // Légende.
        let lx = 6, ly = H - 6;
        noms.forEach(nom => {
            svg.appendChild($svg('circle', { cx: lx + 6, cy: ly - 4, r: 5, fill: couleur(nom), stroke: '#1d2746', 'stroke-width': 1 }));
            const t = $svg('text', { x: lx + 14, y: ly, 'font-size': 11, fill: '#1d2746' });
            t.textContent = `${nom} (${v.billes[nom]})`;
            svg.appendChild(t);
            lx += 14 + nom.length * 7 + 28;
        });
        return svg;
    },

    roue(v) {
        const W = 180, R = 70, cx = W / 2, cy = R + 6;
        const H = W + 36;
        const svg = $svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });

        const noms = Object.keys(v.secteurs);
        const total = noms.reduce((s, n) => s + v.secteurs[n], 0) || 1;
        let angle = -Math.PI / 2;
        noms.forEach(nom => {
            const part = v.secteurs[nom] / total;
            const a2 = angle + part * Math.PI * 2;
            const x1 = cx + Math.cos(angle) * R;
            const y1 = cy + Math.sin(angle) * R;
            const x2 = cx + Math.cos(a2) * R;
            const y2 = cy + Math.sin(a2) * R;
            const largeArc = part > 0.5 ? 1 : 0;
            const d = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
            svg.appendChild($svg('path', { d, fill: couleur(nom), stroke: '#1d2746', 'stroke-width': 1.5 }));
            angle = a2;
        });

        // Légende.
        let ly = W + 6;
        noms.forEach((nom, i) => {
            const lx = 10 + i * 60;
            svg.appendChild($svg('circle', { cx: lx + 6, cy: ly + 6, r: 5, fill: couleur(nom), stroke: '#1d2746', 'stroke-width': 1 }));
            const t = $svg('text', { x: lx + 14, y: ly + 10, 'font-size': 11, fill: '#1d2746' });
            t.textContent = `${nom} (${v.secteurs[nom]})`;
            svg.appendChild(t);
        });
        return svg;
    }
};

window.Visuels = Visuels;
