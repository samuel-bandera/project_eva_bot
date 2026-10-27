import { z } from 'zod'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAssistantStore = defineStore('assistant', () => {
  const isOpen = ref(false)
  const hasNew = ref(true)
  const currentView = ref('chat')
  const currentHat = ref('witchHat')
  const mochiColor = ref('default')
  const eyeTracking = ref(true)
  const soundEnabled = ref(true)

  const isThinking = ref(false)
  const pendingNotif = ref(null)
  const lastNotifData = ref(null)
  const lastNotifAt = ref(0)

  const messages = ref([
    { id: 1, sender: 'bot', text: '¡Hola! Soy tu asistente de EvalBot. ¿En qué te puedo ayudar hoy?' }
  ])

  const NotifSchema = z.object({
    id: z.union([z.number(), z.string()]).optional(),
    titulo: z.string().min(1).max(120),
    mensaje: z.string().max(500).optional().default(''),
    esMensaje: z.boolean().optional().default(false),
    tipo: z.enum(['info', 'exito', 'alerta', 'urgente']).optional(),
  }).passthrough()

  const notify = (noti) => {
    const parsed = NotifSchema.safeParse(noti)
    let titulo, texto
    if (parsed.success) {
      titulo = parsed.data.titulo
      texto = parsed.data.mensaje || titulo
    } else {
      console.warn('[Mochi] notif inválida, usando fallback:', parsed.error.issues)
      titulo = noti?.titulo || noti?.title || 'Notificación'
      texto = noti?.mensaje || noti?.text || titulo
    }
    hasNew.value = true
    lastNotifAt.value = Date.now()
    pendingNotif.value = { ...noti, titulo, mensaje: texto, _at: lastNotifAt.value }
        messages.value.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      sender: 'bot',
      text: texto,
    })
  }

  const clearPendingNotif = () => { pendingNotif.value = null }

  const pushNotification = (text) => {
    notify({ titulo: text, mensaje: text })
  }

  const toggle = () => {
    isOpen.value = !isOpen.value
    if (isOpen.value) {
      hasNew.value = false
      currentView.value = 'chat'
    }
  }


  const sendMessage = async (text) => {
    messages.value.push({ id: Date.now(), sender: 'user', text })
    isThinking.value = true

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      const response = await fetch('/api/v1/mochi/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ mensaje: text })
      });

      if (!response.ok) throw new Error('Error en el servidor');

      const json = await response.json();

      messages.value.push({
        id: Date.now() + 1,
        sender: 'bot',
        text: json.data?.text || 'No entendí eso, ¿podés repetirlo?'
      });

    } catch (e) {
      console.error('Error Mochi:', e);
      messages.value.push({
        id: Date.now() + 1,
        sender: 'bot',
        text: 'Uy, tuve un problema al conectar con mi cerebro. 😵'
      });
    } finally {
      isThinking.value = false;
    }
  }

  const clearChat = () => {
    messages.value = [
      { id: Date.now(), sender: 'bot', text: '¡Hola! He limpiado nuestra conversación.' }
    ]
  }

  return {
    isOpen, hasNew, currentView, currentHat, mochiColor, eyeTracking, soundEnabled, isThinking,
    messages, pushNotification, notify, clearPendingNotif, pendingNotif, lastNotifAt, lastNotifData, toggle, sendMessage, clearChat
  }
})
