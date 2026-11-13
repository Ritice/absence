import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const TYPES_ABSENCE = {
  CONGE_PAYE: 'Congé payé',
  MALADIE: 'Maladie',
  PERMISSION: 'Permission exceptionnelle',
  MATERNITE: 'Maternité / Paternité',
  SANS_SOLDE: 'Congé sans solde'
};

const STATUTS = {
  EN_ATTENTE: {
    label: 'En attente',
    className: 'badge-status-warning',
    dotClass: 'dot-warning'
  },
  APPROUVEE: {
    label: 'Acceptée',
    className: 'badge-status-success',
    dotClass: 'dot-success'
  },
  REFUSEE: {
    label: 'Refusée',
    className: 'badge-status-danger',
    dotClass: 'dot-danger'
  }
};

export default function App() {
  // État d'authentification
  const [token, setToken] = useState(() => localStorage.getItem('sp_token') || '');
  const [utilisateur, setUtilisateur] = useState(() => {
    const saved = localStorage.getItem('sp_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [modeAuth, setModeAuth] = useState('login');
  const [erreurAuth, setErreurAuth] = useState('');

  // Formulaire Connexion / Création de compte
  const [formAuth, setFormAuth] = useState({
    nom: '',
    prenom: '',
    email: '',
    motDePasse: '',
    poste: '',
    departement: 'Technologie',
    role: 'EMPLOYE'
  });

  // États de l'application
  const [onglet, setOnglet] = useState('absences');
  const [employes, setEmployes] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [mesAbsences, setMesAbsences] = useState([]);
  const [statsAdmin, setStatsAdmin] = useState({
    total: 0,
    enAttente: 0,
    approuvees: 0,
    refusees: 0
  });
  const [filtreStatut, setFiltreStatut] = useState('TOUS');
  const [recherche, setRecherche] = useState('');
  const [erreurApi, setErreurApi] = useState('');
  const [chargement, setChargement] = useState(false);

  // Pop-up Modale de Confirmation (remplace window.confirm)
  const [modaleConfirmation, setModaleConfirmation] = useState({
    ouverte: false,
    titre: '',
    message: '',
    variante: 'primary',
    texteBouton: 'Confirmer',
    onConfirm: null
  });

  // Pop-up Notification / Feedback (remplace window.alert)
  const [popupNotification, setPopupNotification] = useState({
    ouverte: false,
    type: 'success',
    titre: '',
    message: ''
  });

  // Formulaire nouvelle absence
  const [formAbsence, setFormAbsence] = useState({
    employeId: '',
    typeAbsence: 'CONGE_PAYE',
    dateDebut: '',
    dateFin: '',
    motif: ''
  });

  // Formulaire nouvel employé (Admin)
  const [formEmploye, setFormEmploye] = useState({
    nom: '',
    prenom: '',
    email: '',
    motDePasse: '',
    poste: '',
    departement: 'Technologie',
    role: 'EMPLOYE'
  });

  const estAdmin = utilisateur?.role === 'ADMIN';

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  // Ouvrir une pop-up d'information/succès/erreur
  const afficherPopup = (type, titre, message) => {
    setPopupNotification({
      ouverte: true,
      type,
      titre,
      message
    });
  };

  const fermerPopup = () => {
    setPopupNotification((prev) => ({ ...prev, ouverte: false }));
  };

  // Ouvrir une pop-up de confirmation avant une action
  const demanderConfirmation = ({ titre, message, variante = 'primary', texteBouton = 'Confirmer', onConfirm }) => {
    setModaleConfirmation({
      ouverte: true,
      titre,
      message,
      variante,
      texteBouton,
      onConfirm
    });
  };

  const fermerConfirmation = () => {
    setModaleConfirmation((prev) => ({ ...prev, ouverte: false, onConfirm: null }));
  };

  const executerConfirmation = async () => {
    const action = modaleConfirmation.onConfirm;
    fermerConfirmation();
    if (action) {
      await action();
    }
  };

  const obtenirInitiales = (prenom = '', nom = '') => {
    return `${prenom.charAt(0) || ''}${nom.charAt(0) || ''}`.toUpperCase() || 'SP';
  };

  // Formatage d'une date (YYYY-MM-DD) au format jj/MM/aaaa
  const formaterDate = (dateIso) => {
    if (!dateIso) return '—';
    const parties = String(dateIso).split('T')[0].split('-');
    if (parties.length === 3) {
      return `${parties[2]}/${parties[1]}/${parties[0]}`;
    }
    return dateIso;
  };

  // Connexion ou Création de compte
  const soumettreAuth = async (e) => {
    e.preventDefault();
    setErreurAuth('');
    const endpoint = modeAuth === 'login' ? '/auth/login' : '/auth/register';

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formAuth)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErreurAuth(data.message || "Erreur lors de l'authentification.");
        return;
      }

      localStorage.setItem('sp_token', data.token);
      localStorage.setItem('sp_user', JSON.stringify(data.user));
      setToken(data.token);
      setUtilisateur(data.user);
      setOnglet('absences');
      setFormAbsence((prev) => ({ ...prev, employeId: data.user.id }));
    } catch (err) {
      setErreurAuth(
        'Impossible de joindre le serveur backend Spring Boot. Vérifiez que MySQL et le backend sont démarrés.'
      );
    }
  };

  // Déconnexion avec pop-up de confirmation
  const confirmerDeconnexion = () => {
    demanderConfirmation({
      titre: 'Déconnexion',
      message: 'Souhaitez-vous fermer votre session actuelle ?',
      variante: 'danger',
      texteBouton: 'Se déconnecter',
      onConfirm: seDeconnecter
    });
  };

  const seDeconnecter = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: authHeaders
      });
    } catch (err) {
      // Ignorer si le serveur est arrêté
    }
    localStorage.removeItem('sp_token');
    localStorage.removeItem('sp_user');
    setToken('');
    setUtilisateur(null);
    setEmployes([]);
    setAbsences([]);
    setMesAbsences([]);
  };

  const chargerDonnees = async () => {
    if (!token || !utilisateur) return;
    setChargement(true);
    try {
      const requetes = [
        fetch(`${API_URL}/absences`, { headers: authHeaders }),
        fetch(`${API_URL}/absences/me`, { headers: authHeaders })
      ];

      if (utilisateur.role === 'ADMIN') {
        requetes.push(fetch(`${API_URL}/employes`, { headers: authHeaders }));
        requetes.push(fetch(`${API_URL}/absences/stats`, { headers: authHeaders }));
      }

      const reponses = await Promise.all(requetes);
      if (reponses.some((r) => r.status === 401)) {
        seDeconnecter();
        return;
      }

      const dataAbs = await reponses[0].json();
      const dataMesAbs = await reponses[1].json();
      setAbsences(Array.isArray(dataAbs) ? dataAbs : []);
      setMesAbsences(Array.isArray(dataMesAbs) ? dataMesAbs : []);

      if (utilisateur.role === 'ADMIN' && reponses[2] && reponses[3]) {
        const dataEmp = await reponses[2].json();
        const dataStats = await reponses[3].json();
        setEmployes(Array.isArray(dataEmp) ? dataEmp : []);
        setStatsAdmin(dataStats);
        if (dataEmp.length > 0 && !formAbsence.employeId) {
          setFormAbsence((prev) => ({ ...prev, employeId: dataEmp[0].id }));
        }
      } else {
        setFormAbsence((prev) => ({ ...prev, employeId: utilisateur.id }));
      }

      setErreurApi('');
    } catch (err) {
      setErreurApi(
        'Impossible de joindre le serveur backend Spring Boot.'
      );
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    if (token && utilisateur) {
      chargerDonnees();
    }
  }, [token, utilisateur?.id]);

  // Calcul du nombre de jours entre deux dates
  const calculerJours = (debut, fin) => {
    if (!debut || !fin) return 0;
    const d1 = new Date(debut);
    const d2 = new Date(fin);
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  };

  // Soumission d'une demande d'absence
  const ajouterAbsence = async (e) => {
    e.preventDefault();
    if (!formAbsence.dateDebut || !formAbsence.dateFin) {
      afficherPopup(
        'warning',
        'Champs requis',
        'Veuillez renseigner la date de début et la date de fin.'
      );
      return;
    }
    if (new Date(formAbsence.dateFin) < new Date(formAbsence.dateDebut)) {
      afficherPopup(
        'error',
        'Dates invalides',
        'La date de fin ne peut pas être antérieure à la date de début.'
      );
      return;
    }

    try {
      const payload = {
        ...formAbsence,
        employeId: estAdmin ? formAbsence.employeId : utilisateur.id
      };
      const res = await fetch(`${API_URL}/absences`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setFormAbsence((prev) => ({
          ...prev,
          dateDebut: '',
          dateFin: '',
          motif: ''
        }));
        chargerDonnees();
        afficherPopup(
          'success',
          'Demande enregistrée',
          "Votre demande d'absence a été enregistrée et est en attente de validation."
        );
      } else {
        afficherPopup('error', 'Erreur', "Impossible d'enregistrer la demande d'absence.");
      }
    } catch (err) {
      afficherPopup('error', 'Erreur réseau', "Erreur lors de l'enregistrement de l'absence.");
    }
  };

  // Accepter ou Refuser une absence avec Pop-up de confirmation (Réservé à l'ADMIN)
  const demanderChangementStatut = (abs, nouveauStatut) => {
    if (!estAdmin) return;
    const estAcceptation = nouveauStatut === 'APPROUVEE';
    const nomCollaborateur = `${abs.employe?.prenom || ''} ${abs.employe?.nom || ''}`.trim();

    demanderConfirmation({
      titre: estAcceptation ? "Accepter la demande d'absence" : "Refuser la demande d'absence",
      message: estAcceptation
        ? `Confirmez-vous l'acceptation de la demande de ${nomCollaborateur} (${formaterDate(abs.dateDebut)} au ${formaterDate(abs.dateFin)}) ?`
        : `Confirmez-vous le refus de la demande de ${nomCollaborateur} (${formaterDate(abs.dateDebut)} au ${formaterDate(abs.dateFin)}) ?`,
      variante: estAcceptation ? 'success' : 'danger',
      texteBouton: estAcceptation ? 'Accepter' : 'Refuser',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_URL}/absences/${abs.id}/statut`, {
            method: 'PATCH',
            headers: authHeaders,
            body: JSON.stringify({ statut: nouveauStatut })
          });
          if (res.ok) {
            chargerDonnees();
            afficherPopup(
              'success',
              'Statut mis à jour',
              `La demande de ${nomCollaborateur} a été ${estAcceptation ? 'acceptée' : 'refusée'}.`
            );
          }
        } catch (err) {
          afficherPopup('error', 'Erreur', 'Erreur lors de la mise à jour du statut.');
        }
      }
    });
  };

  // Supprimer une absence avec Pop-up de confirmation (Réservé à l'ADMIN)
  const demanderSuppressionAbsence = (abs) => {
    if (!estAdmin) return;
    const nomCollaborateur = `${abs.employe?.prenom || ''} ${abs.employe?.nom || ''}`.trim();

    demanderConfirmation({
      titre: "Supprimer la demande d'absence",
      message: `Voulez-vous supprimer définitivement l'absence de ${nomCollaborateur} du ${formaterDate(abs.dateDebut)} au ${formaterDate(abs.dateFin)} ?`,
      variante: 'danger',
      texteBouton: 'Supprimer',
      onConfirm: async () => {
        try {
          await fetch(`${API_URL}/absences/${abs.id}`, {
            method: 'DELETE',
            headers: authHeaders
          });
          chargerDonnees();
          afficherPopup('success', 'Demande supprimée', "La demande d'absence a été supprimée.");
        } catch (err) {
          afficherPopup('error', 'Erreur', 'Erreur lors de la suppression.');
        }
      }
    });
  };

  // Ajouter un employé (Réservé à l'ADMIN)
  const ajouterEmploye = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/employes`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(formEmploye)
      });
      if (res.ok) {
        const nomCree = `${formEmploye.prenom} ${formEmploye.nom}`;
        setFormEmploye({
          nom: '',
          prenom: '',
          email: '',
          motDePasse: '',
          poste: '',
          departement: 'Technologie',
          role: 'EMPLOYE'
        });
        chargerDonnees();
        afficherPopup(
          'success',
          'Collaborateur ajouté',
          `Le compte de ${nomCree} a été enregistré.`
        );
      } else {
        afficherPopup('error', 'Erreur', "Impossible d'ajouter ce collaborateur.");
      }
    } catch (err) {
      afficherPopup('error', 'Erreur', "Erreur lors de l'ajout de l'employé.");
    }
  };

  // Supprimer un employé avec Pop-up de confirmation (Réservé à l'ADMIN)
  const demanderSuppressionEmploye = (emp) => {
    demanderConfirmation({
      titre: 'Supprimer ce collaborateur',
      message: `Voulez-vous supprimer ${emp.prenom} ${emp.nom} ainsi que l'ensemble de ses absences ?`,
      variante: 'danger',
      texteBouton: 'Supprimer',
      onConfirm: async () => {
        try {
          await fetch(`${API_URL}/employes/${emp.id}`, {
            method: 'DELETE',
            headers: authHeaders
          });
          chargerDonnees();
          afficherPopup(
            'success',
            'Collaborateur supprimé',
            `${emp.prenom} ${emp.nom} a été retiré de la liste des collaborateurs.`
          );
        } catch (err) {
          afficherPopup('error', 'Erreur', "Erreur lors de la suppression de l'employé.");
        }
      }
    });
  };

  // Composant Pop-up Modale de Confirmation & Notification
  const rendrePopups = () => (
    <>
      {modaleConfirmation.ouverte && (
        <div className="modal-backdrop" onClick={fermerConfirmation}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{modaleConfirmation.titre}</h3>
            <p className="modal-desc">{modaleConfirmation.message}</p>
            <div className="modal-actions">
              <button type="button" className="btn-modal-cancel" onClick={fermerConfirmation}>
                Annuler
              </button>
              <button
                type="button"
                className={`btn-modal-confirm ${modaleConfirmation.variante}`}
                onClick={executerConfirmation}
              >
                {modaleConfirmation.texteBouton}
              </button>
            </div>
          </div>
        </div>
      )}

      {popupNotification.ouverte && (
        <div className="modal-backdrop" onClick={fermerPopup}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{popupNotification.titre}</h3>
            <p className="modal-desc">{popupNotification.message}</p>
            <div className="modal-actions single">
              <button type="button" className="btn-primary full-width" onClick={fermerPopup}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ÉCRAN DE CONNEXION / CRÉATION DE COMPTE
  if (!token || !utilisateur) {
    return (
      <div className="auth-wrapper">
        {rendrePopups()}

        <div className="auth-card">
          <div className="auth-header">
            <div className="brand-logo large">SP</div>
            <h1>Sprint Pay</h1>
            <p>Portail de gestion des absences</p>
          </div>

          <div className="auth-switch">
            <button
              type="button"
              className={modeAuth === 'login' ? 'switch-btn active' : 'switch-btn'}
              onClick={() => {
                setModeAuth('login');
                setErreurAuth('');
              }}
            >
              Connexion
            </button>
            <button
              type="button"
              className={modeAuth === 'register' ? 'switch-btn active' : 'switch-btn'}
              onClick={() => {
                setModeAuth('register');
                setErreurAuth('');
              }}
            >
              Créer un compte
            </button>
          </div>

          {erreurAuth && <div className="alert-error auth-alert">{erreurAuth}</div>}

          <form onSubmit={soumettreAuth} className="auth-form">
            {modeAuth === 'register' && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Prénom *</label>
                    <input
                      type="text"
                      placeholder="Ex: Jordan"
                      value={formAuth.prenom}
                      onChange={(e) => setFormAuth({ ...formAuth, prenom: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Nom *</label>
                    <input
                      type="text"
                      placeholder="Ex: Tchoua"
                      value={formAuth.nom}
                      onChange={(e) => setFormAuth({ ...formAuth, nom: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Poste *</label>
                    <input
                      type="text"
                      placeholder="Ex: Développeur"
                      value={formAuth.poste}
                      onChange={(e) => setFormAuth({ ...formAuth, poste: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Département *</label>
                    <select
                      value={formAuth.departement}
                      onChange={(e) =>
                        setFormAuth({ ...formAuth, departement: e.target.value })
                      }
                    >
                      <option value="Technologie">Technologie</option>
                      <option value="Produit">Produit</option>
                      <option value="Finance & Opérations">Finance & Opérations</option>
                      <option value="Ressources Humaines">Ressources Humaines</option>
                      <option value="Commercial & Partenariats">Commercial & Partenariats</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Rôle du compte</label>
                  <select
                    value={formAuth.role}
                    onChange={(e) => setFormAuth({ ...formAuth, role: e.target.value })}
                  >
                    <option value="EMPLOYE">Collaborateur</option>
                    <option value="ADMIN">Administrateur</option>
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label>Email professionnel *</label>
              <input
                type="email"
                placeholder="nom@sprint-pay.com"
                value={formAuth.email}
                onChange={(e) => setFormAuth({ ...formAuth, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Mot de passe *</label>
              <input
                type="password"
                placeholder="••••••••"
                value={formAuth.motDePasse}
                onChange={(e) => setFormAuth({ ...formAuth, motDePasse: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn-primary full-width">
              {modeAuth === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>

          {modeAuth === 'login' && (
            <div className="demo-box">
              <div className="demo-box-title">Comptes de démonstration</div>
              <div className="demo-buttons">
                <button
                  type="button"
                  className="demo-pill"
                  onClick={() =>
                    setFormAuth((prev) => ({
                      ...prev,
                      email: 'admin@sprint-pay.com',
                      motDePasse: 'admin123'
                    }))
                  }
                >
                  Compte Admin
                </button>
                <button
                  type="button"
                  className="demo-pill"
                  onClick={() =>
                    setFormAuth((prev) => ({
                      ...prev,
                      email: 'samuel.ngono@sprint-pay.com',
                      motDePasse: 'employe123'
                    }))
                  }
                >
                  Compte Collaborateur
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Filtrage des absences
  const absencesFiltrees = absences.filter((a) => {
    const matchStatut = filtreStatut === 'TOUS' || a.statut === filtreStatut;
    const nomComplet = `${a.employe?.prenom || ''} ${a.employe?.nom || ''}`.toLowerCase();
    const matchRecherche = nomComplet.includes(recherche.toLowerCase());
    return matchStatut && matchRecherche;
  });

  const dureeSaisie = calculerJours(formAbsence.dateDebut, formAbsence.dateFin);

  return (
    <div className="app-container">
      {rendrePopups()}

      {/* En-tête Sprint Pay */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">SP</div>
          <div>
            <div className="brand-title-row">
              <h1>Sprint Pay</h1>
              <span className="badge-role-header">
                {estAdmin ? 'Administration' : 'Espace Collaborateur'}
              </span>
            </div>
            <p>Gestion des absences et des congés</p>
          </div>
        </div>

        <nav className="nav-tabs">
          <button
            className={onglet === 'absences' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setOnglet('absences')}
          >
            <span>{estAdmin ? "Demandes d'absence" : 'Absences'}</span>
            {estAdmin && <span className="tab-counter">{statsAdmin.total}</span>}
          </button>

          <button
            className={onglet === 'historique' ? 'tab-btn active' : 'tab-btn'}
            onClick={() => setOnglet('historique')}
          >
            <span>Mon historique</span>
            <span className="tab-counter">{mesAbsences.length}</span>
          </button>

          {estAdmin && (
            <button
              className={onglet === 'employes' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setOnglet('employes')}
            >
              <span>Collaborateurs</span>
              <span className="tab-counter">{employes.length}</span>
            </button>
          )}
        </nav>

        <div className="user-bar">
          <a
            href="/Rapport_de_Stage_BTS_Sprint_Pay.docx"
            download="Rapport_de_Stage_BTS_Sprint_Pay.docx"
            className="btn-report-download"
          >
            Rapport Word (.docx)
          </a>
          <a
            href="/Rapport_de_Stage_BTS_Sprint_Pay.pdf"
            download="Rapport_de_Stage_BTS_Sprint_Pay.pdf"
            className="btn-report-download"
          >
            Rapport PDF
          </a>
          <div className="user-avatar">
            {obtenirInitiales(utilisateur.prenom, utilisateur.nom)}
          </div>
          <div className="user-info">
            <span className="user-name">
              {utilisateur.prenom} {utilisateur.nom}
            </span>
            <span className="user-role">
              {estAdmin ? 'Administrateur RH' : utilisateur.poste}
            </span>
          </div>
          <button onClick={confirmerDeconnexion} className="btn-logout">
            Déconnexion
          </button>
        </div>
      </header>

      <main className="main-content">
        {erreurApi && (
          <div className="alert-error">
            <span>{erreurApi}</span>
            <button onClick={chargerDonnees} className="btn-retry">
              Réessayer
            </button>
          </div>
        )}

        {/* SEUL L'ADMIN PEUT VOIR LE NOMBRE D'ABSENCES DEMANDÉES */}
        {estAdmin && (
          <section className="stats-grid">
            <div className="stat-card primary">
              <span className="stat-label">Absences demandées</span>
              <strong className="stat-value">{statsAdmin.total}</strong>
              <span className="stat-sub">Total enregistré</span>
            </div>

            <div className="stat-card warning">
              <span className="stat-label">En attente</span>
              <strong className="stat-value">{statsAdmin.enAttente}</strong>
              <span className="stat-sub">À traiter</span>
            </div>

            <div className="stat-card success">
              <span className="stat-label">Acceptées</span>
              <strong className="stat-value">{statsAdmin.approuvees}</strong>
              <span className="stat-sub">Demandes validées</span>
            </div>

            <div className="stat-card danger">
              <span className="stat-label">Refusées</span>
              <strong className="stat-value">{statsAdmin.refusees}</strong>
              <span className="stat-sub">Demandes non retenues</span>
            </div>
          </section>
        )}

        {/* ONGLET 1 : VOIR LES ABSENCES & DEMANDER UNE ABSENCE */}
        {onglet === 'absences' && (
          <div className="content-grid">
            {/* Formulaire de demande d'absence */}
            <aside className="card form-card">
              <div className="card-header-block">
                <h2>Demander une absence</h2>
                <p>Renseignez les dates et le motif de votre demande.</p>
              </div>

              <form onSubmit={ajouterAbsence}>
                {estAdmin ? (
                  <div className="form-group">
                    <label>Collaborateur *</label>
                    <select
                      value={formAbsence.employeId}
                      onChange={(e) =>
                        setFormAbsence({ ...formAbsence, employeId: e.target.value })
                      }
                      required
                    >
                      <option value="">-- Sélectionner un employé --</option>
                      {employes.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.prenom} {emp.nom} ({emp.departement})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Collaborateur</label>
                    <div className="readonly-user-chip">
                      <span className="mini-avatar">
                        {obtenirInitiales(utilisateur.prenom, utilisateur.nom)}
                      </span>
                      <div>
                        <strong>
                          {utilisateur.prenom} {utilisateur.nom}
                        </strong>
                        <small>{utilisateur.departement}</small>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Type d'absence *</label>
                  <select
                    value={formAbsence.typeAbsence}
                    onChange={(e) =>
                      setFormAbsence({ ...formAbsence, typeAbsence: e.target.value })
                    }
                  >
                    {Object.entries(TYPES_ABSENCE).map(([code, libelle]) => (
                      <option key={code} value={code}>
                        {libelle}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Date de début *</label>
                    <input
                      type="date"
                      value={formAbsence.dateDebut}
                      onChange={(e) =>
                        setFormAbsence({ ...formAbsence, dateDebut: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Date de fin *</label>
                    <input
                      type="date"
                      value={formAbsence.dateFin}
                      onChange={(e) =>
                        setFormAbsence({ ...formAbsence, dateFin: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                {dureeSaisie > 0 && (
                  <div className="duration-preview">
                    <span>
                      Du {formaterDate(formAbsence.dateDebut)} au {formaterDate(formAbsence.dateFin)}
                    </span>
                    <span className="badge-neutral">
                      {dureeSaisie} jour{dureeSaisie > 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                <div className="form-group">
                  <label>Motif</label>
                  <textarea
                    rows="3"
                    placeholder="Précisez le motif de votre absence..."
                    value={formAbsence.motif}
                    onChange={(e) =>
                      setFormAbsence({ ...formAbsence, motif: e.target.value })
                    }
                  />
                </div>

                <button type="submit" className="btn-primary full-width">
                  Envoyer la demande
                </button>
              </form>
            </aside>

            {/* Liste des absences */}
            <section className="card list-card">
              <div className="list-header">
                <div>
                  <h2>
                    {estAdmin ? 'Demandes d’absence' : 'Liste des absences'}
                  </h2>
                  <p className="list-subtitle">
                    {estAdmin
                      ? 'Gérez et validez les demandes soumises par les collaborateurs.'
                      : 'Consultez les absences enregistrées.'}
                  </p>
                </div>

                <div className="filters">
                  <input
                    type="text"
                    placeholder="Rechercher un nom..."
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    className="search-input"
                  />
                  <select
                    value={filtreStatut}
                    onChange={(e) => setFiltreStatut(e.target.value)}
                    className="filter-select"
                  >
                    <option value="TOUS">Tous les statuts</option>
                    <option value="EN_ATTENTE">En attente</option>
                    <option value="APPROUVEE">Acceptées</option>
                    <option value="REFUSEE">Refusées</option>
                  </select>
                </div>
              </div>

              {chargement ? (
                <div className="empty-state">Chargement des données...</div>
              ) : absencesFiltrees.length === 0 ? (
                <div className="empty-state">
                  Aucune absence trouvée.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Collaborateur</th>
                        <th>Type</th>
                        <th>Période</th>
                        <th>Durée</th>
                        <th>Motif</th>
                        <th>Statut</th>
                        {estAdmin && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {absencesFiltrees.map((abs) => {
                        const statutInfo = STATUTS[abs.statut] || STATUTS.EN_ATTENTE;
                        const nbJours = calculerJours(abs.dateDebut, abs.dateFin);

                        return (
                          <tr key={abs.id} className="table-row-hover">
                            <td>
                              <div className="emp-cell">
                                <div className="emp-avatar">
                                  {obtenirInitiales(abs.employe?.prenom, abs.employe?.nom)}
                                </div>
                                <div>
                                  <div className="emp-name">
                                    {abs.employe?.prenom} {abs.employe?.nom}
                                  </div>
                                  <div className="emp-sub">
                                    {abs.employe?.poste} · {abs.employe?.departement}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="badge-type">
                                {TYPES_ABSENCE[abs.typeAbsence] || abs.typeAbsence}
                              </span>
                            </td>
                            <td>
                              <div className="date-range">
                                <span className="date-main">Du {formaterDate(abs.dateDebut)}</span>
                                <span className="date-sub">Au {formaterDate(abs.dateFin)}</span>
                              </div>
                            </td>
                            <td>
                              <span className="badge-duration">
                                {nbJours} jour{nbJours > 1 ? 's' : ''}
                              </span>
                            </td>
                            <td className="motif-cell">{abs.motif || '—'}</td>
                            <td>
                              <span className={`badge-status ${statutInfo.className}`}>
                                <span className={`status-dot ${statutInfo.dotClass}`} />
                                {statutInfo.label}
                              </span>
                            </td>
                            {estAdmin && (
                              <td>
                                <div className="action-buttons">
                                  {abs.statut !== 'APPROUVEE' && (
                                    <button
                                      onClick={() =>
                                        demanderChangementStatut(abs, 'APPROUVEE')
                                      }
                                      className="btn-action approve"
                                    >
                                      Accepter
                                    </button>
                                  )}
                                  {abs.statut !== 'REFUSEE' && (
                                    <button
                                      onClick={() =>
                                        demanderChangementStatut(abs, 'REFUSEE')
                                      }
                                      className="btn-action reject"
                                    >
                                      Refuser
                                    </button>
                                  )}
                                  <button
                                    onClick={() => demanderSuppressionAbsence(abs)}
                                    className="btn-action delete"
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ONGLET 2 : HISTORIQUE DE MES ABSENCES */}
        {onglet === 'historique' && (
          <section className="card list-card">
            <div className="list-header">
              <div>
                <h2>
                  Historique de mes absences
                </h2>
                <p className="list-subtitle">
                  Suivi des demandes soumises par {utilisateur.prenom} {utilisateur.nom}.
                </p>
              </div>
              <span className="badge-neutral">
                {mesAbsences.length} demande{mesAbsences.length > 1 ? 's' : ''}
              </span>
            </div>

            {chargement ? (
              <div className="empty-state">Chargement de votre historique...</div>
            ) : mesAbsences.length === 0 ? (
              <div className="empty-state">
                Vous n'avez encore effectué aucune demande d'absence.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date de demande</th>
                      <th>Type</th>
                      <th>Date de début</th>
                      <th>Date de fin</th>
                      <th>Durée</th>
                      <th>Motif</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mesAbsences.map((abs) => {
                      const statutInfo = STATUTS[abs.statut] || STATUTS.EN_ATTENTE;
                      const nbJours = calculerJours(abs.dateDebut, abs.dateFin);
                      return (
                        <tr key={abs.id} className="table-row-hover">
                          <td className="date-main">{formaterDate(abs.dateCreation)}</td>
                          <td>
                            <span className="badge-type">
                              {TYPES_ABSENCE[abs.typeAbsence] || abs.typeAbsence}
                            </span>
                          </td>
                          <td className="date-main">{formaterDate(abs.dateDebut)}</td>
                          <td className="date-main">{formaterDate(abs.dateFin)}</td>
                          <td>
                            <span className="badge-duration">
                              {nbJours} jour{nbJours > 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="motif-cell">{abs.motif || '—'}</td>
                          <td>
                            <span className={`badge-status ${statutInfo.className}`}>
                              <span className={`status-dot ${statutInfo.dotClass}`} />
                              {statutInfo.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ONGLET 3 : GESTION DES COLLABORATEURS (RÉSERVÉ À L'ADMIN) */}
        {estAdmin && onglet === 'employes' && (
          <div className="content-grid">
            <aside className="card form-card">
              <div className="card-header-block">
                <h2>Nouveau collaborateur</h2>
                <p>Ajoutez un collaborateur à l'effectif Sprint Pay.</p>
              </div>
              <form onSubmit={ajouterEmploye}>
                <div className="form-group">
                  <label>Prénom *</label>
                  <input
                    type="text"
                    placeholder="Ex: Amina"
                    value={formEmploye.prenom}
                    onChange={(e) =>
                      setFormEmploye({ ...formEmploye, prenom: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Nom *</label>
                  <input
                    type="text"
                    placeholder="Ex: Kamga"
                    value={formEmploye.nom}
                    onChange={(e) =>
                      setFormEmploye({ ...formEmploye, nom: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email professionnel *</label>
                  <input
                    type="email"
                    placeholder="prenom.nom@sprint-pay.com"
                    value={formEmploye.email}
                    onChange={(e) =>
                      setFormEmploye({ ...formEmploye, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Mot de passe initial *</label>
                  <input
                    type="password"
                    placeholder="Ex: sprintpay123"
                    value={formEmploye.motDePasse}
                    onChange={(e) =>
                      setFormEmploye({ ...formEmploye, motDePasse: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Poste *</label>
                  <input
                    type="text"
                    placeholder="Ex: Développeur Fullstack"
                    value={formEmploye.poste}
                    onChange={(e) =>
                      setFormEmploye({ ...formEmploye, poste: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Département *</label>
                  <select
                    value={formEmploye.departement}
                    onChange={(e) =>
                      setFormEmploye({ ...formEmploye, departement: e.target.value })
                    }
                  >
                    <option value="Technologie">Technologie</option>
                    <option value="Produit">Produit</option>
                    <option value="Finance & Opérations">Finance & Opérations</option>
                    <option value="Commercial & Partenariats">Commercial & Partenariats</option>
                    <option value="Ressources Humaines">Ressources Humaines</option>
                    <option value="Support Client">Support Client</option>
                  </select>
                </div>

                <button type="submit" className="btn-primary full-width">
                  Ajouter le collaborateur
                </button>
              </form>
            </aside>

            <section className="card list-card">
              <div className="list-header">
                <div>
                  <h2>Effectif Sprint Pay</h2>
                  <p className="list-subtitle">
                    Collaborateurs inscrits sur la plateforme.
                  </p>
                </div>
                <span className="badge-neutral">{employes.length} membres</span>
              </div>
              {employes.length === 0 ? (
                <div className="empty-state">Aucun employé enregistré.</div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Collaborateur</th>
                        <th>Email</th>
                        <th>Poste</th>
                        <th>Département</th>
                        <th>Rôle</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employes.map((emp) => (
                        <tr key={emp.id} className="table-row-hover">
                          <td>
                            <div className="emp-cell">
                              <div className="emp-avatar">
                                {obtenirInitiales(emp.prenom, emp.nom)}
                              </div>
                              <div className="emp-name">
                                {emp.prenom} {emp.nom}
                              </div>
                            </div>
                          </td>
                          <td>{emp.email}</td>
                          <td>{emp.poste}</td>
                          <td>
                            <span className="badge-type">{emp.departement}</span>
                          </td>
                          <td>
                            <span
                              className={
                                emp.role === 'ADMIN'
                                  ? 'badge-status badge-status-warning'
                                  : 'badge-duration'
                              }
                            >
                              {emp.role === 'ADMIN' ? 'Administrateur' : 'Collaborateur'}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => demanderSuppressionEmploye(emp)}
                              className="btn-action delete"
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
