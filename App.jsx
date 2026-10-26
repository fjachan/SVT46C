import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  setDoc 
} from 'firebase/firestore';
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  Sun, 
  Moon, 
  BarChart3, 
  UserPlus, 
  AlertCircle 
} from 'lucide-react';

// Deine persönliche Firebase-Konfiguration für den SV Treptow 46
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "sv-treptow-...",
  projectId: "sv-treptow-...",
  storageBucket: "sv-treptow-...",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Hilfsfunktion zur Generierung eindeutiger IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

export default function App() {
  // Theme-State (Tag- / Nachtmodus)
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('svt46_theme') === 'dark';
  });

  // Haupt-App-State
  const [teams, setTeams] = useState([]);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [events, setEvents] = useState([]);
  const [attendances, setAttendances] = useState({});

  // UI Navigation & Formular-States
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'squad' | 'events' | 'stats'
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  // Formular-States
  const [newTeamName, setNewTeamName] = useState('');
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [playerForm, setPlayerForm] = useState({ name: '', number: '', position: 'Feldspieler', status: 'Fit' });
  const [eventForm, setEventForm] = useState({ title: '', type: 'Training', date: '', time: '', location: 'Heim' });
  
  const [selectedEventId, setSelectedEventId] = useState(null);

  // Theme umschalten und in localStorage speichern
  useEffect(() => {
    localStorage.setItem('svt46_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Firestore Echtzeit-Synchronisation
  useEffect(() => {
    const docRef = doc(db, 'artifacts', 'sv-treptow-46-app-data');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTeams(data.teams || []);
        setPlayers(data.players || []);
        setEvents(data.events || []);
        setAttendances(data.attendances || {});

        if (data.teams && data.teams.length > 0 && !activeTeamId) {
          setActiveTeamId(data.teams[0].id);
        }
      } else {
        // Initialer Zustand bei leerer Datenbank
        const initialData = {
          teams: [],
          players: [],
          events: [],
          attendances: {}
        };
        setDoc(docRef, initialData);
      }
    });

    return () => unsubscribe();
  }, []);

  // Daten in Firestore speichern
  const saveData = async (updatedData) => {
    const docRef = doc(db, 'artifacts', 'sv-treptow-46-app-data');
    try {
      await setDoc(docRef, {
        teams,
        players,
        events,
        attendances,
        ...updatedData
      }, { merge: true });
    } catch (e) {
      console.error("Fehler beim Speichern der Daten:", e);
    }
  };

  // --- TEAM VERWALTUNG ---
  const handleAddTeam = () => {
    if (!newTeamName.trim()) return;
    const newTeam = { id: generateId(), name: newTeamName.trim() };
    const updatedTeams = [...teams, newTeam];
    setTeams(updatedTeams);
    setActiveTeamId(newTeam.id);
    setNewTeamName('');
    setShowTeamModal(false);
    saveData({ teams: updatedTeams });
  };

  // --- SPIELER VERWALTUNG ---
  const handleSavePlayer = () => {
    if (!playerForm.name.trim() || !activeTeamId) return;

    let updatedPlayers;
    if (editingPlayer) {
      updatedPlayers = players.map(p => 
        p.id === editingPlayer.id ? { ...p, ...playerForm } : p
      );
    } else {
      const newPlayer = {
        id: generateId(),
        teamId: activeTeamId,
        ...playerForm
      };
      updatedPlayers = [...players, newPlayer];
    }

    setPlayers(updatedPlayers);
    setEditingPlayer(null);
    setPlayerForm({ name: '', number: '', position: 'Feldspieler', status: 'Fit' });
    setShowPlayerModal(false);
    saveData({ players: updatedPlayers });
  };

  const handleDeletePlayer = (playerId) => {
    if (!window.confirm("Spieler wirklich aus dem Kader entfernen?")) return;
    const updatedPlayers = players.filter(p => p.id !== playerId);
    setPlayers(updatedPlayers);
    saveData({ players: updatedPlayers });
  };

  // --- TERMIN VERWALTUNG ---
  const handleAddEvent = () => {
    if (!eventForm.title.trim() || !eventForm.date || !activeTeamId) return;
    const newEvent = {
      id: generateId(),
      teamId: activeTeamId,
      ...eventForm
    };
    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);
    setSelectedEventId(newEvent.id);
    setEventForm({ title: '', type: 'Training', date: '', time: '', location: 'Heim' });
    setShowEventModal(false);
    saveData({ events: updatedEvents });
  };

  const handleDeleteEvent = (eventId) => {
    if (!window.confirm("Termin wirklich löschen?")) return;
    const updatedEvents = events.filter(e => e.id !== eventId);
    setEvents(updatedEvents);
    if (selectedEventId === eventId) {
      setSelectedEventId(null);
    }
    saveData({ events: updatedEvents });
  };

  // --- ANWESENHEIT SCHREIBEN ---
  const handleAttendanceChange = (eventId, playerId, status) => {
    const updatedAttendances = {
      ...attendances,
      [`${eventId}_${playerId}`]: status
    };
    setAttendances(updatedAttendances);
    saveData({ attendances: updatedAttendances });
  };

  // Filter nach aktiver Mannschaft
  const activeTeam = teams.find(t => t.id === activeTeamId);
  const teamPlayers = players.filter(p => p.teamId === activeTeamId);
  const teamEvents = events.filter(e => e.teamId === activeTeamId);
  const selectedEvent = events.find(e => e.id === selectedEventId) || (teamEvents.length > 0 ? teamEvents[0] : null);

  // Statistiken berechnen
  const calculatePlayerStats = (playerId) => {
    const playerEvents = teamEvents;
    if (playerEvents.length === 0) return { present: 0, total: 0, percentage: 0 };

    let presentCount = 0;
    playerEvents.forEach(evt => {
      const status = attendances[`${evt.id}_${playerId}`];
      if (status === 'present' || status === 'late') {
        presentCount++;
      }
    });

    return {
      present: presentCount,
      total: playerEvents.length,
      percentage: Math.round((presentCount / playerEvents.length) * 100)
    };
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${
      darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      {/* HEADER / NAVIGATION */}
      <header className={`border-b sticky top-0 z-30 transition-colors ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-4">
          
          {/* Logo & Titel */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#D32F2F] text-white flex items-center justify-center font-bold text-lg shadow-md border-2 border-white">
              SVT
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
                SV Treptow 46
                <span className="text-xs bg-[#D32F2F] text-white px-2 py-0.5 rounded-full font-normal">
                  Kader & Anwesenheit
                </span>
              </h1>
              <p className="text-xs opacity-70">Offizielle Vereins-App</p>
            </div>
          </div>

          {/* Team-Auswahl & Theme Toggle */}
          <div className="flex items-center space-x-3">
            <select
              value={activeTeamId || ''}
              onChange={(e) => setActiveTeamId(e.target.value)}
              className={`text-sm rounded-lg px-3 py-1.5 border font-medium focus:ring-2 focus:ring-[#D32F2F] outline-none ${
                darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              {teams.length === 0 ? (
                <option value="">Keine Mannschaft angelegt</option>
              ) : (
                teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))
              )}
            </select>

            <button
              onClick={() => setShowTeamModal(true)}
              className="p-1.5 rounded-lg bg-[#D32F2F] text-white hover:bg-[#b71c1c] transition"
              title="Neue Mannschaft anlegen"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Tag- & Nachtmodus Schalter */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg border transition ${
                darkMode 
                  ? 'bg-slate-700 border-slate-600 text-amber-400 hover:bg-slate-600' 
                  : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
              }`}
              title={darkMode ? "Zum Tagmodus wechseln" : "Zum Nachtmodus wechseln"}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Tab-Navigation */}
        {activeTeamId && (
          <div className="max-w-6xl mx-auto px-4 flex space-x-1 border-t border-slate-200/10 mt-2">
            {[
              { id: 'attendance', label: 'Anwesenheit', icon: CheckCircle2 },
              { id: 'squad', label: 'Kader', icon: Users },
              { id: 'events', label: 'Termine', icon: Calendar },
              { id: 'stats', label: 'Statistik', icon: BarChart3 },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                    isActive
                      ? 'border-[#D32F2F] text-[#D32F2F]'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* HAUPTINHALT */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        
        {/* KEIN TEAM RANGELEGT */}
        {teams.length === 0 ? (
          <div className={`p-10 rounded-2xl text-center border ${
            darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <Users className="w-16 h-16 mx-auto mb-4 text-[#D32F2F] opacity-80" />
            <h2 className="text-xl font-bold mb-2">Willkommen beim SV Treptow 46</h2>
            <p className="text-sm opacity-70 mb-6 max-w-md mx-auto">
              Es sind noch keine Mannschaften angelegt. Erstelle deine erste Mannschaft, um mit der Pflege des Kaders und der Anwesenheitsliste zu starten.
            </p>
            <button
              onClick={() => setShowTeamModal(true)}
              className="bg-[#D32F2F] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#b71c1c] transition inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Erste Mannschaft anlegen</span>
            </button>
          </div>
        ) : (
          <>
            {/* TAB 1: ANWESENHEIT */}
            {activeTab === 'attendance' && (
              <div className="space-y-6">
                
                {/* Termin-Auswahlzeile */}
                <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-4 ${
                  darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div>
                    <label className="text-xs font-semibold uppercase opacity-60 block mb-1">
                      Termin auswählen
                    </label>
                    {teamEvents.length === 0 ? (
                      <p className="text-sm text-amber-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> Noch keine Termine erstellt
                      </p>
                    ) : (
                      <select
                        value={selectedEvent?.id || ''}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        className={`text-base font-bold rounded-lg px-3 py-1.5 border outline-none ${
                          darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                        }`}
                      >
                        {teamEvents.map(e => (
                          <option key={e.id} value={e.id}>
                            {e.type}: {e.title} ({e.date} {e.time && `- ${e.time}`})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <button
                    onClick={() => setShowEventModal(true)}
                    className="bg-[#D32F2F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#b71c1c] transition flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Neuer Termin</span>
                  </button>
                </div>

                {/* Anwesenheitsliste */}
                {selectedEvent ? (
                  <div className={`rounded-xl border overflow-hidden ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div className="p-4 border-b border-slate-200/10 flex justify-between items-center bg-slate-50/5">
                      <div>
                        <h3 className="font-bold text-lg">{selectedEvent.title}</h3>
                        <p className="text-xs opacity-70">
                          {selectedEvent.type} • {selectedEvent.date} {selectedEvent.time} • Ort: {selectedEvent.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs opacity-70 block">Kadergröße</span>
                        <span className="font-bold text-base">{teamPlayers.length} Spieler</span>
                      </div>
                    </div>

                    {teamPlayers.length === 0 ? (
                      <div className="p-8 text-center opacity-70 text-sm">
                        Noch keine Spieler im Kader dieser Mannschaft. Trage Spieler im Reiter "Kader" ein.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200/10">
                        {teamPlayers.map(player => {
                          const currentStatus = attendances[`${selectedEvent.id}_${player.id}`] || 'unmarked';
                          
                          return (
                            <div key={player.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/5 transition">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-slate-200/20 flex items-center justify-center text-sm font-bold">
                                  {player.number || '#'}
                                </div>
                                <div>
                                  <div className="font-semibold text-sm flex items-center gap-2">
                                    {player.name}
                                    {player.status !== 'Fit' && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-normal">
                                        {player.status}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs opacity-60">{player.position}</div>
                                </div>
                              </div>

                              {/* Tasten für Status */}
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleAttendanceChange(selectedEvent.id, player.id, 'present')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
                                    currentStatus === 'present'
                                      ? 'bg-emerald-600 text-white shadow-sm'
                                      : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Anwesend</span>
                                </button>

                                <button
                                  onClick={() => handleAttendanceChange(selectedEvent.id, player.id, 'late')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
                                    currentStatus === 'late'
                                      ? 'bg-amber-500 text-white shadow-sm'
                                      : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Verspätet</span>
                                </button>

                                <button
                                  onClick={() => handleAttendanceChange(selectedEvent.id, player.id, 'absent')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
                                    currentStatus === 'absent'
                                      ? 'bg-rose-600 text-white shadow-sm'
                                      : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Abwesend</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {/* TAB 2: KADER (SPIELER MANUELL PFLEGEN) */}
            {activeTab === 'squad' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold">Mannschaftskader</h2>
                    <p className="text-xs opacity-70">
                      Manuelle Verwaltung aller Spieler für {activeTeam?.name}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingPlayer(null);
                      setPlayerForm({ name: '', number: '', position: 'Feldspieler', status: 'Fit' });
                      setShowPlayerModal(true);
                    }}
                    className="bg-[#D32F2F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#b71c1c] transition flex items-center space-x-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Spieler hinzufügen</span>
                  </button>
                </div>

                {teamPlayers.length === 0 ? (
                  <div className={`p-8 text-center rounded-xl border ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}>
                    <p className="text-sm opacity-70">Noch keine Spieler manuell eingetragen.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teamPlayers.map(player => (
                      <div
                        key={player.id}
                        className={`p-4 rounded-xl border flex justify-between items-center ${
                          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-[#D32F2F]/10 text-[#D32F2F] font-bold flex items-center justify-center">
                            {player.number || '-'}
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{player.name}</div>
                            <div className="text-xs opacity-60">{player.position}</div>
                            <span className={`text-[10px] inline-block px-2 py-0.5 rounded mt-1 ${
                              player.status === 'Fit' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
                            }`}>
                              {player.status}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setEditingPlayer(player);
                              setPlayerForm({
                                name: player.name,
                                number: player.number,
                                position: player.position,
                                status: player.status
                              });
                              setShowPlayerModal(true);
                            }}
                            className="p-1.5 opacity-60 hover:opacity-100 transition"
                            title="Bearbeiten"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePlayer(player.id)}
                            className="p-1.5 text-rose-500 opacity-60 hover:opacity-100 transition"
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: TERMINE (TRAINING & SPIEL) */}
            {activeTab === 'events' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold">Terminplaner</h2>
                    <p className="text-xs opacity-70">
                      Trainings und Spiele eintragen und verwalten
                    </p>
                  </div>
                  <button
                    onClick={() => setShowEventModal(true)}
                    className="bg-[#D32F2F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#b71c1c] transition flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Neuer Termin</span>
                  </button>
                </div>

                {teamEvents.length === 0 ? (
                  <div className={`p-8 text-center rounded-xl border ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}>
                    <p className="text-sm opacity-70">Keine Termine vorhanden.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teamEvents.map(event => (
                      <div
                        key={event.id}
                        className={`p-4 rounded-xl border flex items-center justify-between ${
                          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xs ${
                            event.type === 'Spiel' ? 'bg-[#D32F2F] text-white' : 'bg-blue-600 text-white'
                          }`}>
                            {event.type}
                          </div>
                          <div>
                            <div className="font-bold text-sm">{event.title}</div>
                            <div className="text-xs opacity-70">
                              Datum: {event.date} {event.time && `| Zeit: ${event.time}`} | Ort: {event.location}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-2 text-rose-500 opacity-60 hover:opacity-100 transition"
                          title="Termin löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: STATISTIK */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold">Anwesenheitsstatistik</h2>
                  <p className="text-xs opacity-70">
                    Übersicht über die Trainings- und Spielbeteiligung der Mannschaft
                  </p>
                </div>

                <div className={`rounded-xl border overflow-hidden ${
                  darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className="divide-y divide-slate-200/10">
                    {teamPlayers.map(player => {
                      const stats = calculatePlayerStats(player.id);
                      return (
                        <div key={player.id} className="p-4 flex items-center justify-between gap-4">
                          <div className="flex items-center space-x-3 w-1/3">
                            <span className="font-bold text-sm opacity-60">#{player.number || '-'}</span>
                            <span className="font-semibold text-sm">{player.name}</span>
                          </div>

                          <div className="flex-1 max-w-xs">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Anwesenheit</span>
                              <span className="font-bold">{stats.percentage}%</span>
                            </div>
                            <div className="w-full bg-slate-200/20 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-[#D32F2F] h-full rounded-full transition-all duration-300"
                                style={{ width: `${stats.percentage}%` }}
                              />
                            </div>
                          </div>

                          <div className="text-xs opacity-70 text-right min-w-[80px]">
                            {stats.present} / {stats.total} Termine
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL: NEUE MANNSCHAFT ANLEGEN */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${
            darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'
          }`}>
            <h3 className="font-bold text-lg mb-4">Neue Mannschaft anlegen</h3>
            <input
              type="text"
              placeholder="z. B. Ü32 Altliga, C-Jugend..."
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              className={`w-full p-2.5 rounded-lg border text-sm mb-4 outline-none focus:ring-2 focus:ring-[#D32F2F] ${
                darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'
              }`}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowTeamModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium opacity-70 hover:opacity-100"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddTeam}
                className="bg-[#D32F2F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#b71c1c]"
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SPIELER HINZUFÜGEN / BEARBEITEN */}
      {showPlayerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${
            darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'
          }`}>
            <h3 className="font-bold text-lg mb-4">
              {editingPlayer ? 'Spieler bearbeiten' : 'Neuen Spieler eintragen'}
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Name des Spielers</label>
                <input
                  type="text"
                  placeholder="Max Mustermann"
                  value={playerForm.name}
                  onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                  className={`w-full p-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#D32F2F] ${
                    darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1">Rückennummer</label>
                  <input
                    type="text"
                    placeholder="10"
                    value={playerForm.number}
                    onChange={(e) => setPlayerForm({ ...playerForm, number: e.target.value })}
                    className={`w-full p-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#D32F2F] ${
                      darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">Position</label>
                  <select
                    value={playerForm.position}
                    onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value })}
                    className={`w-full p-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#D32F2F] ${
                      darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    <option value="Torwart">Torwart</option>
                    <option value="Abwehr">Abwehr</option>
                    <option value="Mittelfeld">Mittelfeld</option>
                    <option value="Angriff">Angriff</option>
                    <option value="Feldspieler">Feldspieler</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Status</label>
                <select
                  value={playerForm.status}
                  onChange={(e) => setPlayerForm({ ...playerForm, status: e.target.value })}
                  className={`w-full p-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#D32F2F] ${
                    darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="Fit">Fit / Einsatzbereit</option>
                  <option value="Verletzt">Verletzt</option>
                  <option value="Angeschlagen">Angeschlagen</option>
                  <option value="Urlaub">Urlaub</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowPlayerModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium opacity-70 hover:opacity-100"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSavePlayer}
                className="bg-[#D32F2F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#b71c1c]"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NEUER TERMIN */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${
            darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'
          }`}>
            <h3 className="font-bold text-lg mb-4">Neuen Termin anlegen</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Typ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEventForm({ ...eventForm, type: 'Training' })}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      eventForm.type === 'Training'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-300'
                    }`}
                  >
                    Training
                  </button>
                  <button
                    type="button"
                    onClick={() => setEventForm({ ...eventForm, type: 'Spiel' })}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      eventForm.type === 'Spiel'
                        ? 'bg-[#D32F2F] text-white border-[#D32F2F]'
                        : darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-300'
                    }`}
                  >
                    Spiel
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Bezeichnung</label>
                <input
                  type="text"
                  placeholder="z. B. Abschlusstraining oder SV Treptow 46 vs. Gegner"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className={`w-full p-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#D32F2F] ${
                    darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold block mb-1">Datum</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className={`w-full p-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#D32F2F] ${
                      darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1">Uhrzeit</label>
                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                    className={`w-full p-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#D32F2F] ${
                      darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Ort</label>
                <input
                  type="text"
                  placeholder="Heim / Auswärts / Sportplatz Name"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  className={`w-full p-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-[#D32F2F] ${
                    darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowEventModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium opacity-70 hover:opacity-100"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddEvent}
                className="bg-[#D32F2F] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#b71c1c]"
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// Automatischer Start für den direkten Vite-Build
import React from 'react';
import ReactDOM from 'react-dom/client';

if (typeof window !== 'undefined') {
  const rootElement = document.getElementById('root');
  if (rootElement && !rootElement._reactRootContainer) {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

