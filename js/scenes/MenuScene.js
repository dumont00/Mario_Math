/* global Phaser, Reglages, Stats */

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
        const btnDf   = document.getElementById('menu-btn-defi');
        const btnSt   = document.getElementById('menu-btn-stats');
        const btnRg   = document.getElementById('menu-btn-reglages');

        // Reset des écouteurs (clones).
        const av = btnAv.cloneNode(true); btnAv.parentNode.replaceChild(av, btnAv);
        const df = btnDf.cloneNode(true); btnDf.parentNode.replaceChild(df, btnDf);
        const st = btnSt.cloneNode(true); btnSt.parentNode.replaceChild(st, btnSt);
        const rg = btnRg.cloneNode(true); btnRg.parentNode.replaceChild(rg, btnRg);

        av.addEventListener('click', () => {
            this._fermer(overlay);
            this.scene.start('LevelScene', { niveau: 1, mode: 'aventure' });
        });
        df.addEventListener('click', () => {
            this._fermer(overlay);
            this.scene.start('DefiScene', { defiLevel: 1 });
        });
        st.addEventListener('click', () => this._ouvrirStats());
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
        // 0 = sans chronomètre — il faut le préserver explicitement
        // (sinon `0 || 1` → 1 et l'option « sans chrono » est perdue).
        const m = Reglages.multiplicateurTemps;
        elTemps.value = String(typeof m === 'number' ? m : 1);

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
        const a = btnAnnuler.cloneNode(true);     btnAnnuler.parentNode.replaceChild(a, btnAnnuler);
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
            // 0 = sans chronomètre (cas spécial). Sinon on borne entre 0 et 4.
            Reglages.multiplicateurTemps = (mult === 0 || (mult > 0 && mult <= 4)) ? mult : 1.0;

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

    _ouvrirStats() {
        const overlay    = document.getElementById('stats-screen');
        const elApercu   = document.getElementById('stats-apercu');
        const elDom      = document.getElementById('stats-domaines');
        const elManq     = document.getElementById('stats-manquees');
        const elCpt      = document.getElementById('stats-manquees-compteur');
        const btnFermer  = document.getElementById('stats-fermer');
        const btnVoirManq = document.getElementById('stats-voir-manquees');
        const btnEffTout  = document.getElementById('stats-effacer-tout');

        const APERCU_MAX = 8;       // aperçu seulement — liste complète dans la fenêtre dédiée

        const refresh = () => {
            const ap = Stats.apercu();
            if (ap.total === 0) {
                elApercu.textContent = 'Aucune question répondue pour l\'instant. Joue une partie pour voir tes stats !';
            } else {
                elApercu.textContent =
                    ap.total + ' question' + (ap.total > 1 ? 's' : '') + ' répondue' + (ap.total > 1 ? 's' : '') +
                    ' — ' + ap.bonnes + ' bonne' + (ap.bonnes > 1 ? 's' : '') +
                    ' (' + ap.pourcentage + ' % de réussite).';
            }

            elDom.innerHTML = '';
            const doms = Stats.listeDomaines();
            if (doms.length === 0) {
                const p = document.createElement('p');
                p.className = 'reglages__hint';
                p.textContent = '—';
                elDom.appendChild(p);
            } else {
                doms.forEach(d => {
                    const row = document.createElement('div');
                    row.className = 'stats__dom';
                    const label = document.createElement('span');
                    label.textContent = d.domaine;
                    const val = document.createElement('strong');
                    val.textContent = d.bonnes + ' / ' + d.total + '  (' + d.pct + ' %)';
                    row.appendChild(label);
                    row.appendChild(val);
                    elDom.appendChild(row);
                });
            }

            const manq = Stats.listeManquees();
            elCpt.textContent = manq.length > 0 ? '(' + manq.length + ')' : '';
            elManq.innerHTML = '';
            if (manq.length === 0) {
                const p = document.createElement('p');
                p.className = 'reglages__hint';
                p.textContent = 'Aucune question manquée — bravo !';
                elManq.appendChild(p);
            } else {
                // Aperçu : on en montre quelques-unes seulement. Le bouton
                // « Voir toutes les questions manquées » plus bas ouvre la
                // liste complète avec filtre par domaine.
                manq.slice(0, APERCU_MAX).forEach(q => {
                    elManq.appendChild(this._creerCarteManquee(q));
                });
            }
        };

        refresh();

        // Reset des écouteurs (clones).
        const f = btnFermer.cloneNode(true);   btnFermer.parentNode.replaceChild(f, btnFermer);
        const v = btnVoirManq.cloneNode(true); btnVoirManq.parentNode.replaceChild(v, btnVoirManq);
        const x = btnEffTout.cloneNode(true);  btnEffTout.parentNode.replaceChild(x, btnEffTout);

        f.addEventListener('click', () => this._fermerStats());
        v.addEventListener('click', () => this._ouvrirManquees());
        x.addEventListener('click', () => {
            const ap = Stats.apercu();
            if (ap.total === 0 && Stats.listeManquees().length === 0) {
                window.alert('Aucune statistique à effacer.');
                return;
            }
            if (window.confirm(
                'Effacer toutes les statistiques ?\n\n' +
                'Cela supprime : le décompte par domaine et la liste complète des questions manquées. ' +
                'Cette action ne peut pas être annulée.'
            )) {
                Stats.effacerTout();
                refresh();
                window.alert('Statistiques effacées.');
            }
        });

        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');
    }

    /** Construit une carte DOM pour une question manquée. */
    _creerCarteManquee(q) {
        const card = document.createElement('div');
        card.className = 'stats__manq';

        const head = document.createElement('div');
        head.className = 'stats__manq-head';
        const dom = document.createElement('span');
        dom.className = 'stats__manq-dom';
        dom.textContent = q.domaine + (q.sousDomaine ? ' · ' + q.sousDomaine : '');
        head.appendChild(dom);

        const ques = document.createElement('p');
        ques.className = 'stats__manq-q';
        ques.textContent = q.question;

        const lignes = document.createElement('p');
        lignes.className = 'stats__manq-lignes';
        const choix = (q.choixJoueur || '').trim();
        lignes.innerHTML =
            '<span class="stats__manq-mauvais">Réponse donnée : ' +
            (choix ? this._escape(choix) : '<em>aucune</em>') + '</span><br>' +
            '<span class="stats__manq-bon">Bonne réponse : ' + this._escape(q.reponse) + '</span>';

        card.appendChild(head);
        card.appendChild(ques);
        card.appendChild(lignes);

        if (q.explication) {
            const ex = document.createElement('p');
            ex.className = 'stats__manq-ex';
            ex.textContent = q.explication;
            card.appendChild(ex);
        }
        return card;
    }

    /**
     * Fenêtre dédiée à toutes les questions manquées (accessible depuis
     * Stats & révision → Suivi des résultats). Affiche TOUT, avec filtre
     * par domaine pour cibler une matière.
     */
    _ouvrirManquees() {
        const overlay   = document.getElementById('manquees-screen');
        const elListe   = document.getElementById('manquees-liste');
        const elCpt     = document.getElementById('manquees-compteur');
        const elFiltre  = document.getElementById('manquees-filtre');
        const btnFermer = document.getElementById('manquees-fermer');
        const btnEff    = document.getElementById('manquees-effacer');
        const btnMenu   = document.getElementById('manquees-menu');

        const peupleFiltre = () => {
            const manq = Stats.listeManquees();
            const doms = Array.from(new Set(manq.map(q => q.domaine))).sort((a, b) => a.localeCompare(b, 'fr'));
            const courant = elFiltre.value;
            elFiltre.innerHTML = '';
            const optTous = document.createElement('option');
            optTous.value = '';
            optTous.textContent = 'Tous les domaines (' + manq.length + ')';
            elFiltre.appendChild(optTous);
            doms.forEach(d => {
                const n = manq.filter(q => q.domaine === d).length;
                const opt = document.createElement('option');
                opt.value = d;
                opt.textContent = d + ' (' + n + ')';
                elFiltre.appendChild(opt);
            });
            // On restaure la sélection courante si elle existe toujours.
            if (Array.from(elFiltre.options).some(o => o.value === courant)) {
                elFiltre.value = courant;
            }
        };

        const refresh = () => {
            const filtre = elFiltre.value;
            const tout = Stats.listeManquees();
            const manq = filtre ? tout.filter(q => q.domaine === filtre) : tout;
            elCpt.textContent = '(' + manq.length + (filtre && filtre !== '' ? ' sur ' + tout.length : '') + ')';
            elListe.innerHTML = '';
            if (manq.length === 0) {
                const p = document.createElement('p');
                p.className = 'reglages__hint';
                p.textContent = filtre
                    ? 'Aucune question manquée dans ce domaine.'
                    : 'Aucune question manquée — bravo !';
                elListe.appendChild(p);
                return;
            }
            manq.forEach(q => elListe.appendChild(this._creerCarteManquee(q)));
        };

        peupleFiltre();
        refresh();

        // Reset des écouteurs : on remplace les boutons par des clones, et
        // on utilise l'attribut onchange (idempotent) pour le select.
        const f = btnFermer.cloneNode(true); btnFermer.parentNode.replaceChild(f, btnFermer);
        const e = btnEff.cloneNode(true);    btnEff.parentNode.replaceChild(e, btnEff);
        const m = btnMenu.cloneNode(true);   btnMenu.parentNode.replaceChild(m, btnMenu);

        f.addEventListener('click', () => this._fermerManquees());
        e.addEventListener('click', () => {
            if (Stats.listeManquees().length === 0) return;
            if (window.confirm('Effacer la liste des questions manquées ?')) {
                Stats.effacerManquees();
                peupleFiltre();
                refresh();
            }
        });
        // Raccourci : ferme Manquees ET Stats d'un coup pour ressortir
        // directement sur le menu principal (sinon il faut traverser deux
        // niveaux de modales).
        m.addEventListener('click', () => {
            this._fermerManquees();
            this._fermerStats();
        });
        elFiltre.onchange = refresh;

        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');
    }

    _fermerManquees() {
        const overlay = document.getElementById('manquees-screen');
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
    }

    _fermerStats() {
        const overlay = document.getElementById('stats-screen');
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
    }

    _escape(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    _fermer(overlay) {
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
    }
}

window.MenuScene = MenuScene;
