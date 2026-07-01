'use client';

import { useState, useEffect } from 'react';
import CompteNav from '@/components/public/CompteNav';
import { useAuth } from '@/lib/auth-context';
import { validatePassword, PASSWORD_RULES_LABEL } from '@/lib/password';
import { User, Edit3, Save, Loader2, Lock, Eye, EyeOff } from 'lucide-react';

type UserData = {
  prenom: string; nom: string; email: string; telephone: string;
};

export default function InformationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data,    setData]    = useState<UserData | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [draft,   setDraft]   = useState<UserData | null>(null);

  // Changement de mot de passe
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [currentPwd,  setCurrentPwd]  = useState('');
  const [newPwd,      setNewPwd]      = useState('');
  const [confirmPwd,  setConfirmPwd]  = useState('');
  const [pwdLoading,  setPwdLoading]  = useState(false);
  const [pwdMsg,      setPwdMsg]      = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [loadError,   setLoadError]   = useState('');
  const [saveError,   setSaveError]   = useState('');

  // Charge le profil complet depuis l'API (attend que la session soit prête)
  useEffect(() => {
    if (authLoading || !user) return;
    setLoadError('');
    fetch('/api/me')
      .then(async r => {
        if (!r.ok) throw new Error(`Erreur ${r.status}`);
        return r.json();
      })
      .then((d: UserData) => {
        const safe: UserData = {
          prenom:          d?.prenom          ?? '',
          nom:             d?.nom             ?? '',
          email:           d?.email           ?? '',
          telephone:       d?.telephone       ?? '',
        };
        setData(safe);
        setDraft(safe);
      })
      .catch(() => setLoadError('Impossible de charger votre profil. Réessayez plus tard.'));
  }, [authLoading, user?.id]);

  const handleField = (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft(d => d ? { ...d, [e.target.name]: e.target.value } : d);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/me', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(draft),
      });
      if (res.ok) {
        const updated = await res.json();
        setData(updated);
        setDraft(updated);
        setEditing(false);
      } else {
        const err = await res.json().catch(() => null);
        setSaveError(err?.error || 'Échec de l\'enregistrement. Réessayez.');
      }
    } catch {
      setSaveError('Erreur réseau. Vérifiez votre connexion.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setPwdMsg(null);
    if (!currentPwd || !newPwd) {
      setPwdMsg({ type: 'err', text: 'Veuillez remplir tous les champs.' });
      return;
    }
    const pwdError = validatePassword(newPwd);
    if (pwdError) {
      setPwdMsg({ type: 'err', text: pwdError });
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: 'err', text: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    setPwdLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdMsg({ type: 'err', text: data.error || 'Erreur.' });
      } else {
        setPwdMsg({ type: 'ok', text: 'Mot de passe modifié avec succès.' });
        setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
        setTimeout(() => setShowPwdForm(false), 2000);
      }
    } catch {
      setPwdMsg({ type: 'err', text: 'Erreur réseau.' });
    } finally {
      setPwdLoading(false);
    }
  };

  if (loadError) {
    return (
      <div>
        <CompteNav />
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="font-body text-sm text-red-600">{loadError}</p>
        </div>
      </div>
    );
  }

  if (authLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-48 gap-2 text-white/60">
        <Loader2 size={18} className="animate-spin" /> Chargement...
      </div>
    );
  }

  const display = editing ? draft! : data;

  return (
    <div>
      <CompteNav />
      <h1 className="font-display text-2xl font-bold tracking-[0.15em] uppercase text-white mb-6">Mes informations</h1>

      {/* Infos principales */}
      <div className="bg-white rounded-lg p-8 mb-6">
        <div className="flex items-start gap-6">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <User size={22} className="text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                { key: 'prenom',    label: 'Prénom' },
                { key: 'nom',       label: 'Nom' },
                { key: 'email',     label: 'Email' },
                { key: 'telephone', label: 'Téléphone' },
              ] as const).map(({ key: field, label }) => (
                <div key={field}>
                  <label className="font-body text-xs font-semibold text-gray-700 block mb-1">
                    {label} :
                  </label>
                  {editing ? (
                    <input name={field} value={(display as any)[field]} onChange={handleField}
                      disabled={field === 'email'}
                      className="block w-full border-b border-gray-300 pb-1 font-body text-sm text-gray-900 outline-none focus:border-yellow-500 disabled:opacity-50" />
                  ) : (
                    <p className="font-body text-sm text-gray-700">{(display as any)[field] || '—'}</p>
                  )}
                </div>
              ))}
            </div>
            {saveError && (
              <p className="font-body text-xs text-red-600 bg-red-50 rounded px-3 py-2 mt-4">{saveError}</p>
            )}
            <div className="flex gap-3 mt-6">
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="btn-gold-outline text-xs px-5 py-2 flex items-center gap-2">
                  <Edit3 size={13} /> Modifier
                </button>
              ) : (
                <>
                  <button onClick={save} disabled={saving}
                    className="btn-gold text-xs px-5 py-2 flex items-center gap-2 disabled:opacity-60">
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Enregistrer
                  </button>
                  <button onClick={() => { setEditing(false); setDraft(data); setSaveError(''); }}
                    className="btn-gold-outline text-xs px-5 py-2">
                    Annuler
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mot de passe */}
      <div className="bg-white rounded-lg p-8 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock size={18} className="text-gray-500" />
            <h2 className="font-body text-base font-semibold text-gray-900">Mot de passe</h2>
          </div>
          {!showPwdForm && (
            <button onClick={() => { setShowPwdForm(true); setPwdMsg(null); }}
              className="btn-gold-outline text-xs px-5 py-2 flex items-center gap-2">
              <Edit3 size={13} /> Modifier
            </button>
          )}
        </div>

        {showPwdForm && (
          <div className="mt-6 max-w-sm space-y-4">
            <div className="relative">
              <label className="font-body text-xs font-semibold text-gray-700 block mb-1">Mot de passe actuel</label>
              <input type={showCurrent ? 'text' : 'password'} value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                className="block w-full border-b border-gray-300 pb-1 pr-8 font-body text-sm text-gray-900 outline-none focus:border-yellow-500" />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-0 bottom-1 text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className="relative">
              <label className="font-body text-xs font-semibold text-gray-700 block mb-1">Nouveau mot de passe</label>
              <input type={showNew ? 'text' : 'password'} value={newPwd}
                onChange={e => setNewPwd(e.target.value)} minLength={10}
                className="block w-full border-b border-gray-300 pb-1 pr-8 font-body text-sm text-gray-900 outline-none focus:border-yellow-500" />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-0 bottom-1 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <p className="font-body text-[11px] text-gray-400 mt-1">{PASSWORD_RULES_LABEL}</p>
            </div>
            <div>
              <label className="font-body text-xs font-semibold text-gray-700 block mb-1">Confirmer le nouveau mot de passe</label>
              <input type="password" value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)} minLength={10}
                className="block w-full border-b border-gray-300 pb-1 font-body text-sm text-gray-900 outline-none focus:border-yellow-500" />
            </div>

            {pwdMsg && (
              <p className={`text-xs font-body rounded px-3 py-2 ${
                pwdMsg.type === 'ok' ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'
              }`}>
                {pwdMsg.text}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={changePassword} disabled={pwdLoading}
                className="btn-gold text-xs px-5 py-2 flex items-center gap-2 disabled:opacity-60">
                {pwdLoading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Enregistrer
              </button>
              <button onClick={() => {
                setShowPwdForm(false); setPwdMsg(null);
                setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
              }} className="btn-gold-outline text-xs px-5 py-2">
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
