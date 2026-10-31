'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Trash2,
  Check,
  Camera,
  Swords,
  Shield,
  Layers,
  GraduationCap,
  Save,
  Loader2,
} from 'lucide-react';
import { PlayerProfile, PlayingStyle, PlayingLevel, BHOSFaculty } from '../lib/data/types';
import { BHOSDataStore } from '../lib/data/store';
import { sanitizeTextInput, sanitizeSafeAvatarUrl } from '../lib/security/sanitize';
import { getSupabaseClient } from '../lib/supabase/client';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  onProfileUpdated: (updated: PlayerProfile) => void;
}

const PRESET_AVATARS = [
  {
    name: 'Topspin Pro',
    url: '/images/avatars/topspin-pro.jpg',
  },
  {
    name: 'Carbon Blade',
    url: '/images/avatars/carbon-blade.jpg',
  },
  {
    name: 'BHOS Varsity',
    url: '/images/avatars/bhos-varsity.jpg',
  },
  {
    name: 'Smash Master',
    url: '/images/avatars/smash-master.jpg',
  },
  {
    name: 'Match Point',
    url: '/images/avatars/match-point.jpg',
  },
  {
    name: 'Varsity Champion',
    url: '/images/avatars/varsity-champion.jpg',
  },
];

const BLADE_SUGGESTIONS = [
  'Butterfly Viscaria ALC',
  'Timo Boll ALC',
  'Stiga Clipper Wood',
  'Butterfly Primorac Carbon',
  'Yasaka Sweden Extra',
  'Donic Waldner Senso Carbon',
  'DHS Hurricane Long 5',
  'Xiom Hayabusa ZXi',
];

const FOREHAND_SUGGESTIONS = [
  'Butterfly Dignics 09C',
  'Butterfly Tenergy 05',
  'DHS Hurricane 3 Neo',
  'Tibhar Evolution MX-P',
  'Yasaka Rakza 7',
  'Xiom Vega Pro',
  'Donic Baracuda',
];

const BACKHAND_SUGGESTIONS = [
  'Butterfly Tenergy 05',
  'Butterfly Rozena',
  'Yasaka Rakza 7 Soft',
  'Donic Baracuda',
  'Tibhar Evolution EL-P',
  'Xiom Vega Europe',
];

const PLAYING_STYLES: PlayingStyle[] = [
  'Shakehand Offensive',
  'Shakehand All-round',
  'Shakehand Defensive',
  'Penhold Offensive',
  'Penhold All-round',
];

const PLAYING_LEVELS: PlayingLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

const FACULTIES: (BHOSFaculty | string)[] = [
  'Information Security',
  'Computer Engineering',
  'Computer Science',
  'Data Analytics',
  'Chemical Engineering',
  'Petroleum Engineering',
  'Process Automation',
  'Business Administration',
  'Finance',
  'İdman Klubu',
];

export default function EditProfileModal({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}: EditProfileModalProps) {
  const store = BHOSDataStore.getInstance();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string>(profile.avatar_url || '');
  const [avatarTab, setAvatarTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [urlInput, setUrlInput] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const [playingStyle, setPlayingStyle] = useState<string>(profile.playing_style || 'Shakehand Offensive');
  const [bladeEquipment, setBladeEquipment] = useState<string>(profile.blade_equipment || '');
  const [forehandRubber, setForehandRubber] = useState<string>(profile.forehand_rubber || '');
  const [backhandRubber, setBackhandRubber] = useState<string>(profile.backhand_rubber || '');
  const [playingLevel, setPlayingLevel] = useState<string>(profile.playing_level || 'Intermediate');
  const [majorFaculty, setMajorFaculty] = useState<string>(profile.major_faculty || 'Computer Engineering');
  const [admissionYear, setAdmissionYear] = useState<number | null>(profile.admission_year ?? 2023);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const savingLockRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setAvatarUrl(profile.avatar_url || '');
      setPlayingStyle(profile.playing_style || 'Shakehand Offensive');
      setBladeEquipment(profile.blade_equipment || '');
      setForehandRubber(profile.forehand_rubber || '');
      setBackhandRubber(profile.backhand_rubber || '');
      setPlayingLevel(profile.playing_level || 'Intermediate');
      setMajorFaculty(profile.major_faculty || 'Computer Engineering');
      setAdmissionYear(profile.admission_year ?? 2023);
      setUrlInput('');
      setErrorMsg(null);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Zəhmət olmasa düzgün şəkil formatı seçin (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Şəkil həcmi 8 MB-dan çox ola bilməz.');
      return;
    }

    setIsProcessingImage(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        const targetSize = Math.min(size, 400);

        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          const offsetX = (img.width - size) / 2;
          const offsetY = (img.height - size) / 2;
          ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, targetSize, targetSize);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarUrl(compressedDataUrl);
          setIsProcessingImage(false);

          const supabase = getSupabaseClient();
          if (supabase) {
            try {
              canvas.toBlob(
                async (blob) => {
                  if (blob) {
                    const filePath = `avatars/${profile.id}_${Date.now()}.jpg`;
                    const { data: uploadData, error: uploadErr } = await supabase.storage
                      .from('avatars')
                      .upload(filePath, blob, { upsert: true });

                    if (!uploadErr && uploadData) {
                      const { data: publicUrlData } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(filePath);
                      if (publicUrlData?.publicUrl) {
                        setAvatarUrl(publicUrlData.publicUrl);
                      }
                    }
                  }
                },
                'image/jpeg',
                0.85
              );
            } catch {
            }
          }
        } else {
          setAvatarUrl(event.target?.result as string);
          setIsProcessingImage(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setIsProcessingImage(false);
      setErrorMsg('Şəkil oxunarkən xəta baş verdi.');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    const safeUrl = sanitizeSafeAvatarUrl(urlInput);
    if (!safeUrl) {
      setErrorMsg('Yalnız təhlükəsiz HTTPS/HTTP şəkil linkləri qəbul edilir.');
      return;
    }
    setErrorMsg(null);
    setAvatarUrl(safeUrl);
    setUrlInput('');
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || savingLockRef.current) return;
    savingLockRef.current = true;
    setSaving(true);
    setErrorMsg(null);

    try {
      const safeAvatar = avatarUrl ? sanitizeSafeAvatarUrl(avatarUrl) : undefined;
      if (avatarUrl && !safeAvatar) {
        throw new Error('Profil şəkli linki təhlükəsizlik tələblərinə uyğun deyil.');
      }

      const updates: Partial<PlayerProfile> = {
        avatar_url: safeAvatar || undefined,
        playing_style: sanitizeTextInput(playingStyle, 60) || 'Shakehand Offensive',
        blade_equipment: sanitizeTextInput(bladeEquipment, 80) || 'Standard Club Racket',
        forehand_rubber: sanitizeTextInput(forehandRubber, 80) || 'Standard Red',
        backhand_rubber: sanitizeTextInput(backhandRubber, 80) || 'Standard Black',
        playing_level: playingLevel,
        major_faculty: sanitizeTextInput(majorFaculty, 80) || 'Computer Engineering',
        admission_year: admissionYear,
      };

      const updated = store.updateProfile(profile.id, updates);
      onProfileUpdated(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Yadda saxlanarkən xəta baş verdi.');
    } finally {
      setSaving(false);
      savingLockRef.current = false;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-3 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-slate-950/85 animate-fadeIn overflow-y-auto overscroll-contain">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-lg overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-700/15 border border-blue-600/30 flex items-center justify-center text-blue-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-display font-black text-white tracking-tight">
                Profili Fərdiləşdir
              </h2>
              <p className="text-xs text-slate-400">
                Profil şəklinizi, raketinizi və oyun stilinizi yeniləyin
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-600/10 border border-rose-600/20 text-xs font-semibold text-rose-400">
              {errorMsg}
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                Profil Şəkli / Avatar
              </span>

              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex items-center gap-1.5 text-[11px] text-rose-400 hover:text-rose-300 font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Şəkli Sil</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative group shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={profile.full_name}
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-600/60 shadow-sm"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-blue-700 flex items-center justify-center text-white font-display font-black text-4xl shadow-sm border-2 border-slate-700">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </div>
                )}

                {isProcessingImage && (
                  <div className="absolute inset-0 bg-slate-950/75 rounded-2xl flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 w-full space-y-3">
                <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAvatarTab('upload')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                      avatarTab === 'upload'
                        ? 'bg-blue-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Yüklə</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAvatarTab('presets')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                      avatarTab === 'presets'
                        ? 'bg-blue-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Presetlər</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAvatarTab('url')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                      avatarTab === 'url'
                        ? 'bg-blue-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Link</span>
                  </button>
                </div>

                {avatarTab === 'upload' && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingImage}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-slate-700 bg-slate-900 hover:bg-slate-800 hover:border-blue-500 text-slate-300 text-xs font-semibold transition"
                    >
                      <Upload className="w-4 h-4 text-blue-400" />
                      <span>Cihazdan şəkil seçin (PNG, JPG, WebP)</span>
                    </button>
                  </div>
                )}

                {avatarTab === 'presets' && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {PRESET_AVATARS.map((preset) => {
                      const isSelected = avatarUrl === preset.url;
                      return (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() => setAvatarUrl(preset.url)}
                          className={`relative rounded-xl overflow-hidden aspect-square border-2 transition ${
                            isSelected
                              ? 'border-blue-500 shadow-sm scale-105'
                              : 'border-slate-800 hover:border-slate-600'
                          }`}
                          title={preset.name}
                        >
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-full h-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-blue-700/25 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {avatarTab === 'url' && (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com/photo.jpg"
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={handleApplyUrl}
                      className="px-3.5 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-semibold transition"
                    >
                      Tətbiq et
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2">
              <Swords className="w-4 h-4 text-blue-400" />
              Avadanlıq & Raket Spesifikasiyası
            </span>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Raket Taxtası (Blade)
                </label>
                <input
                  type="text"
                  value={bladeEquipment}
                  onChange={(e) => setBladeEquipment(e.target.value)}
                  placeholder="Məsələn: Butterfly Viscaria ALC"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {BLADE_SUGGESTIONS.slice(0, 4).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setBladeEquipment(item)}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Forehand Rezini (Qırmızı)
                  </label>
                  <input
                    type="text"
                    value={forehandRubber}
                    onChange={(e) => setForehandRubber(e.target.value)}
                    placeholder="Məsələn: Butterfly Dignics 09C"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {FOREHAND_SUGGESTIONS.slice(0, 3).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setForehandRubber(item)}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Backhand Rezini (Qara)
                  </label>
                  <input
                    type="text"
                    value={backhandRubber}
                    onChange={(e) => setBackhandRubber(e.target.value)}
                    placeholder="Məsələn: Butterfly Tenergy 05"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {BACKHAND_SUGGESTIONS.slice(0, 3).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setBackhandRubber(item)}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              Oyun Stili & Taktiki Parametrlər
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Oyun Stili
                </label>
                <select
                  value={playingStyle}
                  onChange={(e) => setPlayingStyle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition"
                >
                  {PLAYING_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Təcrübə Səviyyəsi
                </label>
                <select
                  value={playingLevel}
                  onChange={(e) => setPlayingLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition"
                >
                  {PLAYING_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level === 'Beginner' ? 'Başlanğıc' : level === 'Intermediate' ? 'Orta' : 'Qabaqcıl'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-400" />
              Təhsil & Fakültə
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Fakültə / Departament
                </label>
                <select
                  value={majorFaculty}
                  onChange={(e) => setMajorFaculty(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition"
                >
                  {FACULTIES.map((fac) => (
                    <option key={fac} value={fac}>
                      {fac}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Qəbul İli
                </label>
                <input
                  type="number"
                  min="2015"
                  max="2030"
                  value={admissionYear || ''}
                  onChange={(e) => setAdmissionYear(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="2024"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
            >
              Ləğv et
            </button>

            <button
              type="submit"
              disabled={saving || isProcessingImage}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saxlanılır...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Dəyişiklikləri Yadda Saxla</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

