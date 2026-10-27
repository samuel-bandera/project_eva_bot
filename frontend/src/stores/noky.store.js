import { z } from 'zod'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNokyStore = defineStore('assistant', () => {
  const isOpen = ref(false)
  const hasNew = ref(true)
  const currentView = ref('chat')
  const currentHat = ref('witchHat')
  const nokyColor = ref('default')
  const eyeTracking = ref(true)
  const soundEnabled = ref(true)
  const isThinking = ref(false)
  const pendingNotif = ref(null)
  const lastNotifData = ref(null)
  const lastNotifAt = ref(0)

  const messages = ref([
    { id: 1, sender: 'bot', text: '¡Hola! Soy Noky, tu compañero de estudio. ¿En qué te ayudo?' }
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
      console.warn('[Noky] notif inválida:', parsed.error.issues)
      titulo = noti?.titulo || noti?.title || 'Notificación'
      texto = noti?.mensaje || noti?.text || titulo
    }
    hasNew.value = true
    lastNotifAt.value = Date.now()
    pendingNotif.value = { ...noti, titulo, mensaje: texto, _at: lastNotifAt.value }
    lastNotifData.value = pendingNotif.value
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

  const sendMessage = async (mensaje) => {
    messages.value.push({ id: Date.now(), sender: 'user', text: mensaje })
    isThinking.value = true

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token')
      const respuesta = await fetch('/api/v1/noky/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ mensaje: mensaje })
      })

      if (!respuesta.ok) throw new Error('Error en el servidor')
      if (!respuesta.body) throw new Error('Sin stream')

      const reader = respuesta.body.getReader()
      const decoder = new TextDecoder()
      const mensajeBot = { id: Date.now() + 1, sender: 'bot', text: '' }
      messages.value.push(mensajeBot)
      isThinking.value = false
      let buffer = ''
      let actualizacionPendiente = false
      let acumulado = ''

      const aplicarActualizacion = () => {
        if (!actualizacionPendiente) return
        actualizacionPendiente = false
        mensajeBot.text = acumulado
        messages.value = [...messages.value]
      }

      const limitarActualizacion = () => {
        if (!actualizacionPendiente) {
          actualizacionPendiente = true
          requestAnimationFrame(aplicarActualizacion)
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split(/\n/)
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') continue
          try {
            const json = JSON.parse(payload)
            if (json.error) throw new Error(json.error)
            if (json.text) {
              acumulado += json.text
              limitarActualizacion()
            }
          } catch (e) {
            if (e.message !== 'Unexpected end of JSON input') throw e
          }
        }
      }
      mensajeBot.text = acumulado
      messages.value = [...messages.value]
    } catch (e) {
      console.error('Error Mochi:', e)
      isThinking.value = false
      messages.value.push({
        id: Date.now() + 1,
        sender: 'bot',
        text: 'Uy, tuve un problema al conectar con mi cerebro. 😵'
      })
    } finally {
      isThinking.value = false
    }
  }

  const clearChat = () => {
    messages.value = [
      { id: Date.now(), sender: 'bot', text: '¡Hola! He limpiado nuestra conversación.' }
    ]
  }

  return {
    isOpen, hasNew, currentView, currentHat, nokyColor, eyeTracking, soundEnabled, isThinking,
    messages, pushNotification, notify, clearPendingNotif,
    pendingNotif, lastNotifAt, lastNotifData,
    toggle, sendMessage, clearChat
  }
})
