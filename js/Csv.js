// Petit parseur CSV pour la liste de mots d'orthographe.
// Gère les champs entre guillemets (utile si une phrase contient une virgule)
// et le BOM UTF-8 qu'Excel/Numbers ajoute parfois en tête de fichier.

window.Csv = {
    parse(texte) {
        if (!texte) return [];
        // Retire le BOM UTF-8 éventuel.
        if (texte.charCodeAt(0) === 0xFEFF) texte = texte.slice(1);

        const lignes = texte.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lignes.length === 0) return [];

        const entetes = this._splitLine(lignes[0]).map(s => s.trim());
        const out = [];
        for (let i = 1; i < lignes.length; i++) {
            const cells = this._splitLine(lignes[i]);
            if (cells.length === 0) continue;
            const obj = {};
            entetes.forEach((h, j) => { obj[h] = (cells[j] || '').trim(); });
            out.push(obj);
        }
        return out;
    },

    _splitLine(line) {
        const cells = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    cur += '"';
                    i += 1;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c === ',' && !inQuotes) {
                cells.push(cur);
                cur = '';
            } else {
                cur += c;
            }
        }
        cells.push(cur);
        return cells;
    }
};
