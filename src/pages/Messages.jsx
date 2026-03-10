import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { MessageSquare, Send, User, Search, RefreshCw, Star, Loader2, Pencil, Trash2, Phone, Video, MoreVertical, Plus, Smile, Paperclip, Mic } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { messagesService, usersService } from '../services/api'
import Button from '../components/ui/Button'

export default function Messages() {
  const { user } = useAuthStore()
  const isDirector = ['directrice', 'admin'].includes((user?.role || '').toLowerCase())
  const [messages, setMessages] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({ recipientId: '', content: '' })
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('inbox')
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [threadMode, setThreadMode] = useState('all') // all | unread | favorites
  const [importantIds, setImportantIds] = useState(new Set())
  const [readIds, setReadIds] = useState(new Set())
  const [isTyping, setIsTyping] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [editingSaving, setEditingSaving] = useState(false)

  const typingTimeoutRef = useRef(null)
  const conversationEndRef = useRef(null)

  const participantsMap = useMemo(() => {
    const map = {}
    users.forEach((u) => {
      map[u.id] = u
    })
    messages.forEach((m) => {
      if (m.sender) map[m.sender.id] = m.sender
      if (m.recipient) map[m.recipient.id] = m.recipient
    })
    return map
  }, [users, messages])

  const userLabel = (userOrId) => {
    if (!userOrId) return ''
    const obj = typeof userOrId === 'object' ? userOrId : participantsMap[userOrId]
    if (obj) {
      const name = obj.name || obj.nom || obj.email || obj.id || ''
      const role = obj.role ? ` (${obj.role})` : ''
      return `${name}${role}`
    }
    return userOrId
  }

  const normalizeRole = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

  const isDirectorRole = (value) => {
    const role = normalizeRole(value)
    return role === 'directrice' || role === 'directeur' || role === 'admin'
  }

  useEffect(() => {
    load()
    loadUsers()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const data = await messagesService.list()
      setMessages(data)
    } catch (e) {
      setError(e.message || 'Erreur lors du chargement des messages')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const list = await usersService.getAll()
      setUsers(list)
    } catch (e) {
      // ignore for employé restreint
    }
  }

  const me = user?.id
  const inbox = messages.filter(m => m.recipient_id === me)
  const sent = messages.filter(m => m.sender_id === me)

  const director = useMemo(() => users.find((u) => isDirectorRole(u?.role)), [users])

  const fallbackDirectorId = useMemo(() => {
    if (isDirector) return ''

    const byParticipantRole = Object.values(participantsMap).find(
      (p) => p?.id && isDirectorRole(p?.role)
    )
    if (byParticipantRole?.id) return String(byParticipantRole.id)

    const latestSent = [...sent].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    if (latestSent?.recipient_id && latestSent.recipient_id !== me) return String(latestSent.recipient_id)

    const latestInbox = [...inbox].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    if (latestInbox?.sender_id && latestInbox.sender_id !== me) return String(latestInbox.sender_id)

    return ''
  }, [isDirector, participantsMap, sent, inbox, me])

  const resolvedDirectorId = director?.id ? String(director.id) : fallbackDirectorId

  useEffect(() => {
    if (!isDirector && resolvedDirectorId && !form.recipientId) {
      setForm((prev) => ({ ...prev, recipientId: resolvedDirectorId }))
    }
  }, [isDirector, resolvedDirectorId, form.recipientId])

  const sendMessage = async () => {
    const selectedConversationParticipantId = selectedMessage
      ? activeTab === 'inbox'
        ? (selectedMessage.sender?.id || selectedMessage.sender_id)
        : (selectedMessage.recipient?.id || selectedMessage.recipient_id)
      : ''
    const effectiveRecipientId = String(
      form.recipientId || (!isDirector ? (resolvedDirectorId || selectedConversationParticipantId || '') : '')
    )
    if (!effectiveRecipientId || !form.content.trim()) {
      setError('Choisissez un destinataire et un message.')
      return
    }
    setSending(true)
    setError(null)
    try {
      await messagesService.send({ recipientId: effectiveRecipientId, content: form.content })
      setForm({
        recipientId: isDirector ? '' : effectiveRecipientId, // l'employé reste sur la directrice
        content: '',
      })
      await load()
    } catch (e) {
      setError(e.message || 'Envoi impossible')
    } finally {
      setSending(false)
    }
  }

  const buildThreadsFromSource = useCallback((source, mode) => {
    const map = {}
    ;(source || []).forEach((m) => {
      const key = mode === 'inbox' ? (m.sender?.id || m.sender_id) : (m.recipient?.id || m.recipient_id)
      if (!key) return
      if (!map[key] || new Date(m.created_at) > new Date(map[key].created_at)) {
        map[key] = m
      }
    })
    return Object.values(map).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [])

  const inboxThreads = useMemo(() => buildThreadsFromSource(inbox, 'inbox'), [inbox, buildThreadsFromSource])
  const sentThreads = useMemo(() => buildThreadsFromSource(sent, 'sent'), [sent, buildThreadsFromSource])
  const threads = useMemo(() => (activeTab === 'inbox' ? inboxThreads : sentThreads), [activeTab, inboxThreads, sentThreads])

  const filteredThreads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return threads.filter((t) => {
      const label = activeTab === 'inbox' ? userLabel(t.sender || t.sender_id) : userLabel(t.recipient || t.recipient_id)
      const matchesSearch = !term || label.toLowerCase().includes(term) || (t.content || '').toLowerCase().includes(term)
      const isUnread = !readIds.has(t.id)
      const isFavorite = importantIds.has(t.id)
      const matchesMode =
        threadMode === 'all' ||
        (threadMode === 'unread' && activeTab === 'inbox' && isUnread) ||
        (threadMode === 'favorites' && isFavorite)
      return matchesSearch && matchesMode
    })
  }, [threads, searchTerm, activeTab, threadMode, readIds, importantIds, userLabel])

  useEffect(() => {
    if (filteredThreads.length > 0) {
      setSelectedMessage(filteredThreads[0])
    } else {
      setSelectedMessage(null)
    }
  }, [filteredThreads])

  const selectedParticipantId = useMemo(() => {
    if (!selectedMessage) return null
    return activeTab === 'inbox'
      ? (selectedMessage.sender?.id || selectedMessage.sender_id)
      : (selectedMessage.recipient?.id || selectedMessage.recipient_id)
  }, [selectedMessage, activeTab])

  useEffect(() => {
    if (isDirector && selectedParticipantId) {
      setForm((prev) => ({ ...prev, recipientId: String(selectedParticipantId) }))
    }
  }, [isDirector, selectedParticipantId])

  const conversation = useMemo(() => {
    if (!selectedParticipantId || !me) return []
    return messages
      .filter(
        (m) =>
          (m.sender_id === me && m.recipient_id === selectedParticipantId) ||
          (m.recipient_id === me && m.sender_id === selectedParticipantId)
      )
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }, [messages, selectedParticipantId, me])

  const lastOutgoing = useMemo(() => {
    const mine = conversation.filter((m) => m.sender_id === me)
    return mine[mine.length - 1]
  }, [conversation, me])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    // Marquer comme lus les messages reçus de cette conversation
    if (conversation.length > 0) {
      setReadIds((prev) => {
        const next = new Set(prev)
        conversation.forEach((m) => {
          if (m.recipient_id === me) next.add(m.id)
        })
        return next
      })
    }
  }, [conversation, me])

  useEffect(() => {
    const unreadIncoming = conversation.filter((m) => m.recipient_id === me && !m.is_read)
    if (unreadIncoming.length === 0) return
    unreadIncoming.forEach((m) => {
      messagesService.markRead(m.id).catch(() => {})
    })
  }, [conversation, me])

  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [conversation])

  const handleSelectThread = useCallback((m) => {
    setSelectedMessage(m)
  }, [])

  const toggleImportant = useCallback((id) => {
    setImportantIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleRetry = useCallback(() => {
    setError(null)
    load()
    loadUsers()
  }, [])

  const startEdit = useCallback((msg) => {
    setEditingId(msg.id)
    setEditingValue(msg.content)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditingValue('')
  }, [])

  const saveEdit = useCallback(async () => {
    if (!editingId || !editingValue.trim()) {
      cancelEdit()
      return
    }
    setEditingSaving(true)
    try {
      await messagesService.update({ id: editingId, content: editingValue.trim() })
      await load()
      cancelEdit()
    } catch (e) {
      setError(e.message || 'Édition impossible')
    } finally {
      setEditingSaving(false)
    }
  }, [editingId, editingValue, cancelEdit])

  const deleteMessage = useCallback(async (id) => {
    const confirmDelete = window.confirm('Supprimer ce message ?')
    if (!confirmDelete) return
    const snapshot = messages
    setMessages((prev) => prev.filter((m) => m.id !== id))
    setImportantIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setReadIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    if (editingId === id) {
      setEditingId(null)
      setEditingValue('')
    }
    try {
      await messagesService.remove(id)
    } catch (e) {
      setMessages(snapshot)
      setError(e.message || 'Suppression impossible')
    }
  }, [messages, editingId])

  const renderComposer = () => (
    <div className="px-3 py-2 bg-card/95 border-t border-border/40 space-y-2 mb-1">
      {!isDirector && (
        <div className="h-8 flex items-center gap-2 px-3 bg-success-soft rounded-md text-xs text-success">
          <User size={12} />
          <span className="truncate">
            {resolvedDirectorId ? `À : ${userLabel(resolvedDirectorId)}` : 'Responsable non trouvée'}
          </span>
        </div>
      )}
      {isDirector && (
        <select
          value={form.recipientId}
          onChange={(e) => setForm({ ...form, recipientId: e.target.value })}
          className="w-full h-9 px-3 bg-muted/60 rounded-md text-xs text-foreground focus:outline-none"
        >
          <option value="">Choisir un destinataire</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.nom || u.email} ({u.role})
            </option>
          ))}
        </select>
      )}
      <div className="flex items-end gap-2 bg-muted/50 rounded-xl p-2">
        <button className="h-9 w-9 rounded-full bg-card/90 text-muted-foreground inline-flex items-center justify-center">
          <Plus size={16} />
        </button>
        <button className="h-9 w-9 rounded-full bg-card/90 text-muted-foreground inline-flex items-center justify-center">
          <Paperclip size={15} />
        </button>
        <textarea
          value={form.content}
          onChange={(e) => {
            setForm({ ...form, content: e.target.value })
            setIsTyping(true)
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
            typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1500)
          }}
          rows={1}
          className="flex-1 min-h-[40px] max-h-24 px-3 py-2 bg-card rounded-lg text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none"
          placeholder="Entrez un message"
        />
        <button className="h-9 w-9 rounded-full bg-card/90 text-muted-foreground inline-flex items-center justify-center">
          <Smile size={15} />
        </button>
        <Button
          onClick={form.content.trim() ? sendMessage : undefined}
          disabled={sending || (!isDirector && !form.recipientId && !resolvedDirectorId && !selectedParticipantId)}
          className="h-9 w-9 p-0 inline-flex items-center justify-center bg-success hover:opacity-90 text-white rounded-full"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : form.content.trim() ? <Send size={14} /> : <Mic size={14} />}
        </Button>
      </div>
      {!isDirector && !resolvedDirectorId && (
        <p className="text-[11px] text-amber-600">Aucun compte directeur/directrice détecté. Contactez l’administrateur.</p>
      )}
      {isTyping && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Loader2 size={11} className="animate-spin" /> En train d'écrire...
        </p>
      )}
    </div>
  )

  return (
    <div className="h-[calc(100dvh-78px)] px-2 pt-2 pb-0 sm:px-3 sm:pt-3 sm:pb-0 bg-background text-foreground overflow-hidden">
      <div className="h-full rounded-2xl overflow-hidden bg-card grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="bg-card lg:border-r border-border/40 flex flex-col min-h-0">
          <div className="px-4 py-3 bg-muted/45">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-foreground">Discussions</h2>
              <button
                onClick={handleRetry}
                className="p-2 rounded-xl text-muted-foreground hover:bg-success-soft hover:text-success transition-colors"
                title="Rafraîchir"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2 bg-card/90 rounded-lg px-3 py-2">
              <Search size={15} className="text-muted-foreground" />
              <input
                aria-label="Rechercher un message ou un destinataire"
                placeholder="Rechercher ou démarrer une discussion"
                className="bg-transparent flex-1 text-sm text-foreground placeholder-muted-foreground focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <button
                onClick={() => {
                  setActiveTab('inbox')
                  setThreadMode('all')
                }}
                className={`px-3 py-1.5 rounded-full ${threadMode === 'all' && activeTab === 'inbox' ? 'bg-success-soft text-success' : 'bg-card text-muted-foreground'}`}
              >
                Toutes
              </button>
              <button
                onClick={() => {
                  setActiveTab('inbox')
                  setThreadMode('unread')
                }}
                className={`px-3 py-1.5 rounded-full ${threadMode === 'unread' && activeTab === 'inbox' ? 'bg-success-soft text-success' : 'bg-card text-muted-foreground'}`}
              >
                Non lus
              </button>
              <button
                onClick={() => {
                  setActiveTab('inbox')
                  setThreadMode('favorites')
                }}
                className={`px-3 py-1.5 rounded-full ${threadMode === 'favorites' && activeTab === 'inbox' ? 'bg-success-soft text-success' : 'bg-card text-muted-foreground'}`}
              >
                Favoris
              </button>
              <button
                onClick={() => {
                  setActiveTab('sent')
                  setThreadMode('all')
                }}
                className={`px-3 py-1.5 rounded-full ${activeTab === 'sent' ? 'bg-success-soft text-success' : 'bg-card text-muted-foreground'}`}
              >
                Groupes
              </button>
            </div>
          </div>

          {error && (
            <div className="mx-3 my-2 text-xs text-error bg-error-soft rounded-xl px-3 py-2 flex items-center justify-between gap-2">
              <span>{error}</span>
              <Button size="sm" onClick={handleRetry}>Réessayer</Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-muted/25">
            {loading ? (
              <div className="space-y-2 p-1">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredThreads.map((m) => {
              const name = activeTab === 'inbox' ? userLabel(m.sender || m.sender_id) : userLabel(m.recipient || m.recipient_id)
              const isUnread = activeTab === 'inbox' && !readIds.has(m.id)
              const isImportant = importantIds.has(m.id)
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelectThread(m)}
                className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                    selectedMessage?.id === m.id ? 'bg-card' : 'hover:bg-card'
                  } ${isUnread ? 'bg-success-soft/75' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-success-soft text-success flex items-center justify-center text-[12px] font-bold shrink-0">
                      {(name || '').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate">{name || 'Utilisateur'}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{m.content}</p>
                    </div>
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleImportant(m.id)
                      }}
                      className="text-muted-foreground hover:text-success transition-colors cursor-pointer pt-1"
                      aria-label="Marquer comme important"
                    >
                      <Star size={14} fill={isImportant ? 'var(--accent-success)' : 'none'} />
                    </span>
                  </div>
                </button>
              )
            })}
            {!loading && filteredThreads.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-3">
                {threads.length === 0 ? 'Aucune discussion' : 'Aucun résultat'}
              </p>
            )}
          </div>
        </aside>

        <section className="flex flex-col min-h-0">
          {selectedMessage ? (
            <>
              <div className="px-4 py-3 bg-card/95 border-b border-border/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success-soft text-success flex items-center justify-center text-xs font-bold">
                  {(activeTab === 'inbox'
                    ? userLabel(selectedMessage.sender || selectedMessage.sender_id)
                    : userLabel(selectedMessage.recipient || selectedMessage.recipient_id)
                  ).charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {activeTab === 'inbox'
                      ? userLabel(selectedMessage.sender || selectedMessage.sender_id)
                      : userLabel(selectedMessage.recipient || selectedMessage.recipient_id)}
                  </p>
                  <p className="text-xs text-muted-foreground">En ligne</p>
                </div>
                <div className="ml-auto flex items-center gap-1 text-muted-foreground">
                  <button className="p-2 rounded-lg hover:bg-muted/60"><Video size={16} /></button>
                  <button className="p-2 rounded-lg hover:bg-muted/60"><Phone size={16} /></button>
                  <button className="p-2 rounded-lg hover:bg-muted/60"><Search size={16} /></button>
                  <button className="p-2 rounded-lg hover:bg-muted/60"><MoreVertical size={16} /></button>
                </div>
              </div>

              <div
                className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-3 bg-muted/30"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 1px 1px, rgba(120,120,120,0.12) 1px, transparent 0)',
                  backgroundSize: '24px 24px',
                }}
              >
                <div className="mx-auto w-fit px-3 py-1 rounded-md text-[11px] text-muted-foreground bg-card/80">
                  {new Date(selectedMessage.created_at).toLocaleDateString('fr-FR')}
                </div>
                {conversation.map((msg) => {
                  const fromMe = msg.sender_id === me
                  const isLastMine = lastOutgoing && msg.id === lastOutgoing.id
                  const senderName = fromMe ? 'Vous' : userLabel(msg.sender || msg.sender_id) || 'Utilisateur'
                  return (
                    <div key={msg.id} className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[84%]">
                          <div
                            className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                              fromMe ? 'bg-success text-white rounded-br-md' : 'bg-card text-foreground rounded-bl-md'
                            }`}
                          >
                          <p className={`text-[11px] font-semibold mb-1 ${fromMe ? 'text-white/85' : 'text-muted-foreground'}`}>
                            {senderName}
                          </p>
                          {editingId === msg.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="w-full bg-card text-foreground rounded-lg p-2 text-sm"
                              />
                              <div className="flex gap-2 justify-end text-xs">
                                <Button size="sm" onClick={saveEdit} disabled={editingSaving}>
                                  {editingSaving ? '...' : 'Enregistrer'}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                  Annuler
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <span>{msg.content}</span>
                          )}
                        </div>
                        <div className={`mt-1 flex items-center gap-2 text-[11px] text-muted-foreground ${fromMe ? 'justify-end' : 'justify-start'}`}>
                          <span>{new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          {fromMe && isLastMine && <span className="text-success font-semibold">Vu ✓✓</span>}
                          {fromMe && editingId !== msg.id && (
                            <>
                              <button
                                onClick={() => startEdit(msg)}
                                className="p-0.5 rounded hover:bg-muted/60"
                                aria-label="Modifier le message"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => deleteMessage(msg.id)}
                                className="p-0.5 rounded hover:bg-muted/60"
                                aria-label="Supprimer le message"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={conversationEndRef} />
              </div>

              {renderComposer()}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center bg-muted/20">
              <div className="w-14 h-14 rounded-xl bg-success-soft text-success flex items-center justify-center mb-3">
                <MessageSquare size={24} />
              </div>
              <p className="text-base font-semibold text-foreground">Sélectionnez une discussion</p>
              <p className="text-sm text-muted-foreground mt-1">Choisissez un contact à gauche pour commencer.</p>
              <div className="w-full max-w-2xl mt-5">{renderComposer()}</div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

