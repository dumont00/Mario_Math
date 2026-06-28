/* global Phaser, Reglages */

// Écran de lancement : choix du mode + accès aux Réglages parentaux.

const DOMAINES_DISPONIBLES = [
    'Arithmétique',
    'Géométrie',
    'Mesure',
    'Statistique',
    'Probabilité',
    'Français',
    'Géographie',
    'Histoire',
    'Grammaire',
    'Vocabulaire',
    'Logique'
];

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        // Décor de fond simple.
        this.cameras.main.setBackgroundColor('#5dc1ff');
        const w = this.scale.width, h = this.scale.height;
        for (let i = 0; i < 5; i++) {
            this.add.image(
                Phaser.Math.Between(40, w - 40),
                Phaser.Math.Between(40, h - 200),
                'cloud'
            ).setAlpha(0.9);
        }

        const overlay = document.getElementById('menu-screen');
        const btnAv   = document.getElementById('menu-btn-aventure');
        const btnMu   = document.getElementById('menu-btn-mult');
        const btnDf   = document.getElementById('menu-btn-defi');
        const btnOr   = document.getElementById('menu-btn-ortho');
        const btnRg   = document.getElementById('menu-btn-reglages');

        // Reset des écouteurs (clones).
        const av = btnAv.cloneNode(true); btnAv.parentNode.replaceChild(av, btnAv);
        const mu = btnMu.cloneNode(true); btnMu.parentNode.replaceChild(mu, btnMu);
        const df = btnDf.cloneNode(true); btnDf.parentNode.replaceChild(df, btnDf);
        const or = btnOr.cloneNode(true); btnOr.parentNode.replaceChild(or, btnOr);
        const rg = btnRg.cloneNode(true); btnRg.parentNode.replaceChild(rg, btnRg);

        av.addEventListener('click', () => {
            this._fermer(overlay);
            this.scene.start('LevelScene', { niveau: 1, mode: 'aventure' });
        });
        mu.addEventListener('click', () => {
            this._fermer(overlay);
            this.scene.start('LevelScene', { mode: 'mult' });
        });
        df.addEventListener('click', () => {
            this._fermer(overlay);
            this.scene.start('DefiScene', { defiLevel: 1 });
        });
        or.addEventListener('click', () => {
            this._fermer(overlay);
            this.scene.start('LevelScene', { mode: 'orthographe' });
        });
        rg.addEventListener('click', () => this._ouvrirReglages());

        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
    }

    _ouvrirReglages() {
        const reglagesOverlay = document.getElementById('reglages-screen');
        const elDomaines      = document.getElementById('reglages-domaines');
        const elAccents       = document.getElementById('reglages-accents');
        const elEpeler        = document.getElementById('reglages-epeler');
        const elTemps         = document.getElementById('reglages-temps');
        const elVersion       = document.getElementById('reglages-version');
        const btnAnnuler      = document.getElementById('reglages-annuler');
        const btnEnregistrer  = document.getElementById('reglages-enregistrer');

        // Construit la liste de cases à cocher.
        elDomaines.innerHTML = '';
        DOMAINES_DISPONIBLES.forEach(nom => {
            const label = document.createElement('label');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = nom;
            cb.checked = Reglages.domaineEstActif(nom);
            cb.dataset.domaine = nom;
            const span = document.createElement('span');
            span.textContent = nom;
            label.appendChild(cb);
            label.appendChild(span);
            elDomaines.appendChild(label);
        });

        elAccents.checked = !!Reglages.ignorerAccents;
        elEpeler.checked  = Reglages.epelerApresOrthographe !== false;
        elTemps.value     = String(Reglages.multiplicateurTemps || 1);

        // Version : on la lit depuis le cache JSON chargé par BootScene.
        try {
            const v = this.cache.json.get('version');
            if (v && (v.version || v.date || v.commit)) {
                const parts = [];
                if (v.version) parts.push('Version ' + v.version);
                if (v.date) {
                    let date = 'mis à jour le ' + v.date;
                    if (v.heure && v.heure !== '—') date += ' à ' + v.heure;
                    parts.push(date);
                }
                if (v.commit && v.commit !== '—') parts.push('commit ' + v.commit);
                elVersion.textContent = parts.join(' — ');
            } else {
                elVersion.textContent = '';
            }
        } catch (e) {
            elVersion.textContent = '';
        }

        // Reset des boutons (clones).
        const a = btnAnnuler.cloneNode(true); btnAnnuler.parentNode.replaceChild(a, btnAnnuler);
        const e = btnEnregistrer.cloneNode(true); btnEnregistrer.parentNode.replaceChild(e, btnEnregistrer);

        a.addEventListener('click', () => this._fermerReglages());
        e.addEventListener('click', () => {
            const choisis = Array.from(elDomaines.querySelectorAll('input[type="checkbox"]'))
                .filter(cb => cb.checked)
                .map(cb => cb.dataset.domaine);

            if (choisis.length === 0) {
                window.alert('Choisis au moins une discipline. Arithmétique sera activée par défaut.');
                Reglages.domainesActifs = ['Arithmétique'];
            } else {
                Reglages.domainesActifs = choisis;
            }
            Reglages.ignorerAccents         = elAccents.checked;
            Reglages.epelerApresOrthographe = elEpeler.checked;

            const mult = parseFloat(elTemps.value);
            Reglages.multiplicateurTemps = (mult > 0 && mult <= 4) ? mult : 1.0;

            Reglages.appliquer();
            Reglages.sauvegarder();

            this._fermerReglages();
        });

        reglagesOverlay.hidden = false;
        reglagesOverlay.setAttribute('aria-hidden', 'false');
    }

    _fermerReglages() {
        const reglagesOverlay = document.getElementById('reglages-screen');
        reglagesOverlay.hidden = true;
        reglagesOverlay.setAttribute('aria-hidden', 'true');
    }

    _fermer(overlay) {
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
    }
}

window.MenuScene = MenuScene;
