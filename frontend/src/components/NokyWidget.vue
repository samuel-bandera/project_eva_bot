<template>
  <Teleport to="body">
    <div v-if="!isMobile" class="island-wrapper">
      <div id="island" :class="[isLight ? 'island--light' : 'island--dark', 'island--tone-' + ((notifBubbleVisible || notifDetail) ? notifTone : 'default'), { expanded: store.isOpen, 'has-peek': store.hasNew && !store.isOpen && !notifBubbleVisible, 'island--notif': notifBubbleVisible && !store.isOpen && !notifDetail }]" @click="handleIslandClick" :style="(!store.isOpen && notifBubbleVisible) ? { width: notchWidth + 'px', transition: 'width 0.3s ease' } : {}">

        <div class="island-glow"></div>

        <div id="island-clip">
          <div class="bot-side" @click.stop>
            <NokyPet
              @dizzy="handleDizzy"
              :expanded="store.isOpen"
              :state="nokyState"
              :hat="store.currentHat"
              :color="store.nokyColor"
              :emote="currentEmote"
            />
          </div>

          <div class="content-side">
            <div v-if="!store.isOpen" class="summary-view" :class="{ 'summary-view--notif': notifBubbleVisible }" @mouseenter="mostrarMensajeNoky('hover')">
              <template v-if="notifBubbleVisible && notifBubble">
                <div style="display: flex; align-items: center; gap: 10px; width: 100%; justify-content: center; overflow: hidden;">
                  <q-icon :name="getNotifIcon(notifBubble)" size="22px" style="color: var(--primary); flex-shrink: 0;" />
                  <div style="display: flex; flex-direction: column; text-align: center; overflow: hidden; white-space: nowrap; min-width: 0;">
                    <span style="font-size: 13px; font-weight: 700; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; color: var(--text);">{{ notifBubble.titulo }}</span>
                    <span style="font-size: 11px; opacity: 0.8; overflow: hidden; text-overflow: ellipsis;">{{ notifBubble.mensaje }}</span>
                  </div>
                </div>
              </template>
              <template v-else>
                <span class="title">Noky</span>
                <span v-if="nokyMessage" class="noky-message">{{ nokyMessage }}</span>

              </template>
            </div>

            <div v-if="store.isOpen && notifDetail" class="notif-detail-view" @click.stop>
              <div class="notif-detail-header">
                <span class="notif-detail-title">{{ notifDetail.titulo }}</span>
                <button class="icon-btn" @click="cerrarNotifDetalle" title="Cerrar">
                  <svg viewBox="0 0 24 24"><path d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5z" fill="currentColor"/></svg>
                </button>
              </div>
              <div class="notif-detail-body">{{ notifDetail.mensaje }}</div>
              <div v-if="notifDetail.esMensaje" class="notif-detail-reply">
                <textarea v-model="inputText" placeholder="Escribile a Noky..." rows="1" @keydown.enter.exact.prevent="handleSend"></textarea>
                <button class="send-btn" @click="handleSend" :disabled="!inputText.trim()">
                        <Send :size="16" />
                      </button>
              </div>
              <div v-else class="notif-detail-actions">
                <button class="notif-btn" @click="cerrarNotifDetalle">Entendido</button>
              </div>
            </div>
            <div v-else-if="store.isOpen" class="chat-view" @click.stop>

              <div class="chat-header">
                    <div class="header-title">
                      <Sparkles :size="16" class="header-icon" />
                      <span>Noky</span>
                    </div>
                    <div class="header-actions">
                      <button class="icon-btn" @click="handleLimpiar" title="Limpiar chat">
                        <Trash2 :size="16" />
                      </button>
                      <button class="icon-btn" @click="store.toggle" title="Cerrar">
                        <X :size="16" />
                      </button>
                    </div>
                  </div>

              <div class="chat-body" ref="chatBody">
                <div v-for="msg in store.messages" :key="msg.id" :class="['message', msg.sender]">
                  <div class="bubble">
                    <span v-if="msg.sender === 'bot'" v-html="renderMarkdown(msg.text)"></span><span v-else>{{ msg.text }}</span>
                  </div>
                </div>

                <div v-if="store.isThinking" class="message bot typing">
                  <div class="bubble loading-bubble">
                        <Loader2 :size="18" class="spinning" />
                      </div>
                </div>
              </div>

              <footer class="chat-footer">
                <div class="chat-bar">
                  <textarea v-model="inputText" placeholder="Escribile a Noky..." rows="1" @keydown.enter.exact.prevent="handleSend"></textarea>
                  <button class="send-btn" @click="handleSend">
                    <svg viewBox="0 0 24 24"><path d="M12 4.5 5.5 11l1.5 1.5 4-4V19.5h2V8.5l4 4L18.5 11 12 4.5z" fill="currentColor"/></svg>
                  </button>
                </div>
              </footer>
            </div>
          </div>
        </div>
      </div>

      <div v-if="store.isOpen" class="island-backdrop" @click="store.toggle"></div>

    </div>
    <div v-else class="fab-wrapper">
      <div v-if="store.isOpen" class="mobile-chat" :class="isLight ? 'mobile-chat--light' : 'mobile-chat--dark'">
        <div class="chat-view">
          <div class="chat-header">
            <div class="header-title">Noky</div>
            <button class="icon-btn" @click="store.toggle" title="Cerrar">
              <svg viewBox="0 0 24 24"><path d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5z" fill="currentColor"/></svg>
            </button>
          </div>
          <div class="chat-body" ref="chatBody">
            <div v-for="msg in store.messages" :key="msg.id" :class="['message', msg.sender]">
              <div class="bubble"><span v-if="msg.sender === 'bot'" v-html="renderMarkdown(msg.text)"></span><span v-else>{{ msg.text }}</span></div>
            </div>
            <div v-if="store.isThinking" class="message bot typing">
              <div class="bubble dots"><span></span><span></span><span></span></div>
            </div>
          </div>
          <footer class="chat-footer">
            <div class="chat-bar">
              <textarea v-model="inputText" placeholder="Escribile a Noky..." rows="1" @keydown.enter.exact.prevent="handleSend"></textarea>
              <button class="send-btn" @click="handleSend">
                <svg viewBox="0 0 24 24"><path d="M12 4.5 5.5 11l1.5 1.5 4-4V19.5h2V8.5l4 4L18.5 11 12 4.5z" fill="currentColor"/></svg>
              </button>
            </div>
          </footer>
        </div>
      </div>
      <div v-if="notifBubbleVisible && notifBubble && !store.isOpen" class="notif-bubble notif-bubble--mobile" :class="isLight ? 'notif-bubble--light' : 'notif-bubble--dark'" @click.stop="openChatFromBubble">
        <div class="notif-bubble__title">{{ notifBubble.titulo }}</div>
        <div class="notif-bubble__msg">{{ notifBubble.mensaje }}</div>
        <span class="notif-bubble__cta">Ver →</span>
      </div>
      <div
        class="mobile-fab"
        :class="[isLight ? 'mobile-fab--light' : 'mobile-fab--dark', { 'is-pressed': pressed }]"
        @mousedown="startPress"
        @mouseup="endPress"
        @mouseleave="cancelPress"
        @touchstart.prevent="startPress"
        @touchend="endPress"
        @touchcancel="cancelPress"
        @contextmenu.prevent
      >
        <NokyPet
          ref="mobileMochiRef"
          :expanded="false"
          :size="60"
          :state="store.isOpen ? 'working' : 'idle'"
          :hat="store.currentHat"
          :color="store.nokyColor"
        />
        <span v-if="pressed" class="press-ring" />
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { useNokyStore } from '../stores/noky.store.js'
import NokyPet from './NokyPet.vue'
import { Sound } from './noky/core/sound'
import { renderMarkdown } from '../utils/markdown.js';
import { Sparkles, Trash2, X, Send, Loader2 } from 'lucide-vue-next';

const store = useNokyStore()
const $q = useQuasar()
const isLight = computed(() => !$q.dark.isActive)
const isMobile = ref(window.innerWidth <= 768)
const handleResize = () => { isMobile.value = window.innerWidth <= 768 }
Sound.preload()

const inputText = ref('')
const chatBody = ref(null)
const nokyState = ref('idle')
const currentEmote = ref('')

const mobileMochiRef = ref(null)
const notifBubble = ref(null)
const notifQueue = ref([]);
const isProcessingQueue = ref(false);

const _processQueue = async () => {
  if (isProcessingQueue.value) return;
  if (notifQueue.value.length === 0) return;

  isProcessingQueue.value = true;

  while (notifQueue.value.length > 0) {
    const notif = notifQueue.value.shift();
    notifTone.value = _analyzeTone(notif);
    _fireEmote(_chooseEmote(notif));
    showNotifBubble(notif);

    await new Promise(r => setTimeout(r, 13000));
  }

  await new Promise(r => setTimeout(r, 5000));

  isProcessingQueue.value = false;
};
const notifBubbleVisible = ref(false)
const notifTone = ref('default')

const notchWidth = computed(() => {
  if (!notifBubbleVisible.value || !notifBubble.value) return 340;
  const len = (notifBubble.value.titulo?.length || 0) + (notifBubble.value.mensaje?.length || 0);
  if (len < 40) return 420;
  if (len < 80) return 480;
  return 520;
});
let _notifBubbleTimer = null
const LONG_PRESS_MS = 600
const pressed = ref(false)
let pressTimer = null
let pressStartTime = 0
let longPressFired = false

const startPress = () => {
  if (pressTimer !== null) clearTimeout(pressTimer)
  pressStartTime = performance.now()
  longPressFired = false
  pressed.value = true
  pressTimer = setTimeout(() => {
    longPressFired = true
    pressed.value = false
    pressTimer = null
    if (!store.isOpen) store.toggle()
  }, LONG_PRESS_MS)
}

const endPress = () => {
  if (pressTimer !== null) { clearTimeout(pressTimer); pressTimer = null }
  const elapsed = performance.now() - pressStartTime
  pressed.value = false
  if (!longPressFired && elapsed < LONG_PRESS_MS) {
    mobileMochiRef.value?.makeAngry()
  }
  longPressFired = false
}

const cancelPress = () => {
  if (pressTimer !== null) { clearTimeout(pressTimer); pressTimer = null }
  pressed.value = false
  longPressFired = false
}

onMounted(() => {
  setTimeout(() => { mostrarMensajeNoky('mount'); _reiniciarIdleTimer(); }, 1500);
  window.addEventListener('resize', handleResize)
  const _unlock = () => { try { Sound.resume?.() } catch (e) {  } }
  window.addEventListener('pointerdown', _unlock, { once: true, capture: true })
  window.addEventListener('keydown', _unlock, { once: true, capture: true })
  window.addEventListener('touchstart', _unlock, { once: true, capture: true, passive: true })
})
onUnmounted(() => {
  if (nokyMessageTimer) clearTimeout(nokyMessageTimer);
  window.removeEventListener('resize', handleResize)
  cancelPress()
})
const typedMessages = ref({})
const activeTyping = new Set()

const typeMessage = (msg) => {
  if (typedMessages.value[msg.id] !== undefined || activeTyping.has(msg.id)) return;
  activeTyping.add(msg.id);
  let currentText = '';
  let i = 0;
  typedMessages.value = { ...typedMessages.value, [msg.id]: '' };

  const interval = setInterval(() => {
    if (i < msg.text.length) {
      currentText += msg.text.charAt(i);
      typedMessages.value = { ...typedMessages.value, [msg.id]: currentText };
      i++;
      if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight;
    } else {
      clearInterval(interval);
      activeTyping.delete(msg.id);
    }
  }, 25);
};

const handleDizzy = () => {
  nokyState.value = 'dizzy';
  store.isThinking = false;

  typedMessages.value = {};
  activeTyping.clear();

  store.messages.push({
    id: Date.now(),
    sender: 'bot',
    text: '¡Uy! Me mareaste con tantos golpes... 🌀 Dame un segundo.'
  });

  setTimeout(() => {
    if (nokyState.value === 'dizzy') {
      nokyState.value = store.isOpen ? 'working' : 'idle';
    }
  }, 4000);
};

const handleLimpiar = () => {
  store.clearChat();
};

const handleSend = async () => {
  if (!inputText.value.trim()) return;

  const mensaje = inputText.value;
  inputText.value = '';

  const textLower = mensaje.toLowerCase();
  if (textLower.includes('hola') || textLower.includes('buenas')) currentEmote.value = 'happy';
  else if (textLower.includes('gracias')) currentEmote.value = 'love';
  else if (textLower.includes('mal') || textLower.includes('error')) currentEmote.value = 'annoyed';
  else currentEmote.value = '';

  nokyState.value = 'thinking';
  Sound.play('send');

  await store.sendMessage(mensaje);
};

watch(() => store.messages.length, async () => {
  await nextTick();
  if (chatBody.value) chatBody.value.scrollTop = chatBody.value.scrollHeight;
});

const MENSAJES_NOKY = {
  saludo: [
    "¡Hola! ¿Arrancamos? 👋", "¡Buenas! ¿Qué hacemos? ✨",
    "¡Acá estoy! ¿Qué necesitás? 🙋", "¡Hola! ¿Estudiamos? 📚",
    "¡Bienvenido de vuelta! 👋", "¡Hola de nuevo! ¿Seguimos? 🔄",
    "¡Buen día! ¿Repasamos? ☀️", "¡Buenas tardes! ¿Qué toca? 🌤️",
    "¡Buenas noches! ¿Último repaso? 🌙", "¡Hola! Te estaba esperando 👀",
    "¡Buenas! ¿Arrancamos? 🔥", "¡Hey! ¿Cómo andás? 👋",
  ],
  estudiar: [
    "¿Le damos a los apuntes? 📖", "¿Repasamos juntos? ✨",
    "¿Estudiamos un toque? 📚", "¿Arrancamos con una tarea? 📝",
    "¿Practicamos SQL? 🗄️", "¿Una ronda de ejercicios? 💻",
    "¿Vemos ese tema que cuesta? 🎯", "¿Repasamos para el parcial? 📝",
    "¿Practicamos un poco? ✏️", "¿Resolvemos dudas? ❓",
    "¿Hacemos un resumen? 📝", "¿Armamos un plan de estudio? 🗓️",
  ],
  motivacion: [
    "¡Vamos que se puede! 💪", "¡Dale que falta poco! 🔥",
    "¡Un paso a la vez! 🚶", "¡Vos podés! ✨",
    "¡Casi lo tenés! 🎉", "¡Concentración total! 🎯",
    "¡Respirás y seguís! 🌬️", "¡Confío en vos! 🤗",
    "¡Dale que sí! 💪", "¡Lo estás logrando! 🌟",
    "¡Seguí así! 👏", "¡Estás on fire! 🔥",
    "¡Qué crack! 🌟", "¡Sos capaz! 💪",
  ],
  ayuda: [
    "¿Necesitás algo? 📚", "¿Te ayudo con algo? 🌟",
    "Estoy acá para ayudarte 🤗", "¿Te doy una mano? 🙋",
    "¿Te explico algo? 💡", "¿Te traigo apuntes? 📄",
    "¿Dudas? Preguntame 💭", "¿Te resumo algo? 📝",
    "¿Querés repasar juntos? 👥", "¿Necesitás una pista? 🧩",
    "¿Te ayudo a arrancar? 🚀",
  ],
  pausa: [
    "¿Un descansito? ☕", "Tomá agua 💧",
    "Estirá las piernas 🦵", "¿Paramos 5 min? 🌿",
    "Llevás mucho rato, ¿descansamos? 😴", "Respirá hondo 🌬️",
    "¿Un mate? 🧉", "¿Un cafecito? ☕",
    "Despegá la vista 👀", "Mirá algo lejos 👁️",
    "Date un mimo 🎁",
  ],
  cierre: [
    "¡Buen trabajo hoy! 🌟", "Andá a dormir 🌙",
    "Mañana seguimos 👋", "¡Descansá! 💤",
    "Nos vemos pronto ✨", "¡Hasta mañana! 🌙",
    "¡Chau! 👋", "Cuidate 🤗",
    "¡Buen descanso! 😴", "Que duermas bien 🌙",
  ],
  casual: [
    "¿Ya comiste? 🍽️", "¿Todo tranqui? ✨",
    "Modo siesta activado 😴", "¿Un mate? 🧉",
    "¿Cómo va el día? 🌤️", "¿Todo bien? 🙂",
    "¿Qué contás? 💬", "¿Novedades? 📰",
    "¿Todo piola? 😎", "¿Todo en calma? 🌿",
    "¿Todo joya? 💎", "¿Cómo andás? 🌟",
  ],
  cta: [
    "¿Empezamos? 🚀", "¿Le damos? 🔥",
    "¿Vamos? 💪", "Tocame para arrancar 👆",
    "¿Qué querés hacer hoy? 🎓", "¡Dale! 🔥",
    "¡Vamos! 💪", "¿Por dónde arrancamos? 🗺️",
    "¿Qué toca hoy? 📌", "¿Cuál es el plan? 🗓️",
    "Vos elegís 🎯",
  ],
  recordatorio: [
    "No te olvides del parcial 📅", "¿Ya entregaste el TP? 📄",
    "Mañana vence la tarea ⏰", "Tomá agua 💧",
    "Estirá la espalda 🧘", "Guardá los cambios 💾",
    "Hacé backup 🗂️", "Revisá el correo 📧",
    "Chequeá el aula virtual 📚", "Actualizá el calendario 📅",
    "Anotá las fechas 📝", "Revisá los apuntes 📖",
  ],
  animo_examen: [
    "¡Éxitos en el parcial! 🍀", "¡Vos podés! 💪",
    "Respirá hondo 🌬️", "Leé bien las consignas 📖",
    "Empezá por lo fácil 🌱", "Administrá el tiempo ⏰",
    "Confiá en vos 🧠", "Una pregunta a la vez 📝",
    "Revisá antes de entregar ✅", "Todo va a salir bien 🌟",
    "Mentalidad ganadora 🏆",
  ],
  error: [
    "No pasa nada 🤗", "Todos nos equivocamos 💙",
    "Es parte de aprender 📚", "Respirá y seguí 🌬️",
    "Se puede solucionar 🛠️", "Probá de nuevo 🔄",
    "Chequeá la conexión 🔌", "No te frustres 💙",
    "Es solo un bache 🕳️", "Cada fallo enseña 💡",
    "Todo tiene solución ✅",
  ],
  foco: [
    "Foco total 🎯", "Modo concentración 🧠",
    "Una cosa a la vez 📌", "Silenciá el celu 🔕",
    "Modo avión ✈️", "Pomodoro time 🍅",
    "25 minutos de foco ⏱️", "5 min de descanso ☕",
    "Enfocate en una tarea 🎯", "Modo monje 🧘",
  ],
  anti_procrastinacion: [
    "Empezá por 5 minutos ⏱️", "Lo difícil primero 🎯",
    "Hecho es mejor que perfecto ✅", "No esperes el momento ideal ⏰",
    "Ahora es el momento 🚀", "Dividí la tarea ✂️",
    "Empezá chico 🌱", "Un ejercicio a la vez 📝",
    "10 minutos y vemos ⏱️", "Sin excusas 🚫",
  ],
  hidratacion: [
    "Tomá agua 💧", "Hidratate 💦",
    "Un vaso de agua 🥛", "Sentate derecho 🪑",
    "Corregí la postura 🧘", "Hombros atrás 💆",
    "Estirá la espalda 🤸", "Mirá lejos 👀",
    "Regla 20-20-20 ⏰", "Abrí la ventana 🪟",
  ],
  organizacion: [
    "Armemos un plan 🗓️", "¿Qué es prioritario? 🎯",
    "Empezá por lo urgente ⏰", "Dividí en pasos 📋",
    "Hacé una lista 📝", "Tachá lo hecho ✅",
    "Bloqueá tiempo ⏰", "Agendá las fechas 📅",
    "Priorizá 📌", "Simplificá ✂️",
  ],
  vuelta: [
    "¡Volviste! 👋", "¡Te extrañé! 💙",
    "¿Todo piola? 😎", "¿Cómo te fue? 🌟",
    "¡Bienvenido! 🤗", "¿Retomamos? 🔄",
    "¿Seguimos donde dejamos? ➡️", "¿Descansaste? 😴",
    "¡Buen regreso! 👋", "¿Arrancamos de nuevo? 🚀",
  ],
  hora_dia: [
    "Buen día ☀️", "¡Arrancamos el día! 🌅",
    "Buenos días 🌞", "¿Un cafecito? ☕",
    "Buenas tardes 🌤️", "¿Cómo va la tarde? 🌇",
    "Buenas noches 🌙", "¿Último repaso? 🌜",
    "Hora de dormir 😴", "Buen finde 🎉",
  ],
  chistes: [
    "¿Sabías que el pulpo tiene 3 corazones? 🐙",
    "Los flamencos son rosados por lo que comen 🦩",
    "Las abejas reconocen caras 👀",
    "Los pulpos tienen sangre azul 💙",
    "Las jirafas duermen 2 horas 🦒",
    "Los delfines duermen con un ojo abierto 🐬",
    "Las mariposas saborean con las patas 🦋",
    "Las estrellas de mar no tienen cerebro ⭐",
    "Los tiburones son más viejos que los árboles 🦈",
    "Los pingüinos se enamoran 🐧",
  ],
  descanso: [
    "Hora de dormir 😴", "Andá a descansar 🌙",
    "Cerrá los ojos 😌", "Buenas noches 🌜",
    "Apagá las pantallas 📱", "A dormir 💤",
    "Descansá bien 🛏️", "Que sueñes lindo 🌟",
    "Recargá energías 🔋", "Modo sueño activado 🌙",
  ],
  animo_mal: [
    "No pasa nada 💙", "Es parte del camino 🌱",
    "Todo tiene solución ✅", "Respirá 🌬️",
    "Calma 😌", "No estás solo 🤝",
    "Seguimos 💪", "Un tropiezo no es caída 🚶",
    "Aprendemos y seguimos 📚", "Todo va a estar bien 🌟",
  ],
  repaso_sql: [
    "¿Repasamos SQL? 🗄️", "¿Vemos JOINs? 🔗",
    "¿Practicamos SELECT? 🔍", "¿Repasamos normalización? 📐",
    "¿Vemos índices? 📊", "¿Repasamos transacciones? 🔄",
    "¿Vemos triggers? ⚡", "¿Practicamos consultas? 💻",
    "¿Repasamos claves? 🔑", "¿Vemos integridad? ✅",
  ],
  graciosas: [
    "¿Otra vez vos? 😏", "No me dejes en visto 👀",
    "Estoy acá 🫶", "Modo siesta 😴",
    "Tengo sueño 😴", "Te vi distraído 👀",
    "No te duermas 😴", "Sos humano, no robot 🤖",
    "¿Me extrañaste? 👀", "Te estaba esperando 👋",
  ],
  tiernas: [
    "Te quiero mucho 💙", "Estoy orgulloso de vos 🌟",
    "Sos increíble ✨", "Valés mucho 💎",
    "Acá estoy para vos 🤗", "Contá conmigo 👥",
    "No estás solo 💙", "Te acompaño 🫶",
    "Cuidate mucho 🌿", "Date un mimo 🎁",
  ],
};

const ANIMACIONES_NOKY = {
  saludo: 'noky-msg-wave', estudiar: 'noky-msg-bounce',
  motivacion: 'noky-msg-pulse', ayuda: 'noky-msg-fade',
  pausa: 'noky-msg-breathe', cierre: 'noky-msg-fade',
  casual: 'noky-msg-wiggle', cta: 'noky-msg-bounce',
  recordatorio: 'noky-msg-slide', animo_examen: 'noky-msg-pulse',
  error: 'noky-msg-shake', foco: 'noky-msg-fade',
  anti_procrastinacion: 'noky-msg-bounce', hidratacion: 'noky-msg-breathe',
  organizacion: 'noky-msg-fade', vuelta: 'noky-msg-wave',
  hora_dia: 'noky-msg-fade', chistes: 'noky-msg-wiggle',
  descanso: 'noky-msg-breathe', animo_mal: 'noky-msg-breathe',
  repaso_sql: 'noky-msg-bounce', graciosas: 'noky-msg-wiggle',
  tiernas: 'noky-msg-fade',
};

const nokyMessage = ref('');
const nokyMessageAnim = ref('');
let nokyMessageTimer = null;
let _idleTimer = null;
const _nokySessionStart = Date.now();
let _nokyMsgsMostrados = 0;
let _ultimoMensajeTs = 0;
let _ultimaCategoria = '';
const _historialReciente = [];
const COOLDOWN_MS = 20000;
const IDLE_TIMEOUT_MS = 60000;
const DURACION_MENSAJE_MS = 4500;

function detectarContexto() {
  const ahora = new Date();
  const hora = ahora.getHours();
  const dia = ahora.getDay();
  const minutos = (Date.now() - _nokySessionStart) / 60000;
  return {
    hora, dia, minutos,
    esManana: hora >= 6 && hora < 12,
    esTarde: hora >= 12 && hora < 19,
    esNoche: hora >= 19 && hora < 22,
    esMadrugada: hora >= 22 || hora < 6,
    esLunes: dia === 1, esViernes: dia === 5, esFinde: dia === 0 || dia === 6,
    sesionLarga: minutos > 45, sesionMedia: minutos > 20 && minutos <= 45,
    primeraVez: _nokyMsgsMostrados === 0,
  };
}

function construirCandidatos(trigger, ctx) {
  const c = [];
  if (trigger === 'mount') {
    if (ctx.esManana) c.push(['saludo', 10], ['hora_dia', 5]);
    else if (ctx.esTarde) c.push(['saludo', 8], ['hora_dia', 5]);
    else if (ctx.esNoche) c.push(['saludo', 5], ['cierre', 4]);
    else c.push(['cierre', 8], ['descanso', 4]);
  }
  if (trigger === 'hover') {
    if (ctx.primeraVez) c.push(['saludo', 10]);
    else c.push(['casual', 5], ['ayuda', 4], ['saludo', 3], ['cta', 2]);
  }
  if (trigger === 'idle') c.push(['pausa', 8], ['hidratacion', 5], ['descanso', 4]);
  if (ctx.sesionLarga) c.push(['pausa', 8], ['hidratacion', 5], ['descanso', 4]);
  if (ctx.sesionMedia) c.push(['pausa', 3], ['motivacion', 2]);
  if (ctx.esLunes) c.push(['motivacion', 3]);
  if (ctx.esViernes) c.push(['cierre', 3], ['casual', 2]);
  if (ctx.esFinde) c.push(['casual', 3], ['pausa', 2]);
  c.push(['motivacion', 2], ['casual', 2], ['estudiar', 2], ['ayuda', 2],
          ['chistes', 1], ['graciosas', 1], ['repaso_sql', 1], ['foco', 1],
          ['anti_procrastinacion', 1], ['tiernas', 1]);
  return c;
}

function elegirPonderado(candidatos) {
  const boosted = candidatos.map(([cat, p]) => cat === _ultimaCategoria ? [cat, p * 1.3] : [cat, p]);
  const total = boosted.reduce((sum, [, p]) => sum + p, 0);
  let rand = Math.random() * total;
  for (const [cat, p] of boosted) {
    rand -= p;
    if (rand <= 0) return cat;
  }
  return boosted[0][0];
}

function elegirMensajeDeCategoria(cat) {
  const lista = MENSAJES_NOKY[cat];
  if (!lista || !lista.length) return null;
  const disponibles = lista.filter(m => !_historialReciente.includes(m));
  const pool = disponibles.length > 0 ? disponibles : lista;
  return pool[Math.floor(Math.random() * pool.length)];
}

function mostrarMensajeNoky(trigger) {
  const tipoTrigger = trigger || 'hover';
  if (notifBubbleVisible.value) return;
  if (store.isOpen && tipoTrigger !== 'mount') return;
  const ahora = Date.now();
  if (tipoTrigger === 'hover' && ahora - _ultimoMensajeTs < COOLDOWN_MS) return;
  const ctx = detectarContexto();
  const candidatos = construirCandidatos(tipoTrigger, ctx);
  const cat = elegirPonderado(candidatos);
  const texto = elegirMensajeDeCategoria(cat);
  if (!texto) return;
  nokyMessage.value = texto;
  nokyMessageAnim.value = ANIMACIONES_NOKY[cat] || 'noky-msg-fade';
  _nokyMsgsMostrados++;
  _ultimoMensajeTs = ahora;
  _ultimaCategoria = cat;
  _historialReciente.push(texto);
  if (_historialReciente.length > 15) _historialReciente.shift();
  if (nokyMessageTimer) clearTimeout(nokyMessageTimer);
  nokyMessageTimer = setTimeout(() => { nokyMessage.value = ''; }, DURACION_MENSAJE_MS);
  _reiniciarIdleTimer();
}

function _reiniciarIdleTimer() {
  if (_idleTimer) clearTimeout(_idleTimer);
  _idleTimer = setTimeout(() => {
    if (!notifBubbleVisible.value && !store.isOpen) {
      mostrarMensajeNoky('idle');
    }
  }, IDLE_TIMEOUT_MS);
}

const _chooseEmote = (n) => {
  const t = ((n?.titulo || '') + ' ' + (n?.mensaje || '')).toLowerCase()
  if (/examen|urgente|vencid|error|alerta/.test(t)) return 'annoyed'
  if (/nota|calificaci|exito|aprob|logro/.test(t)) return 'love'
  if (/tarea|asignaci|nueva|recordatorio/.test(t)) return 'surprised'
  return 'happy'
}
const _fireEmote = (name) => {
  if (currentEmote.value === name) {
    currentEmote.value = ''
    setTimeout(() => { currentEmote.value = name }, 30)
  } else { currentEmote.value = name }
}
const getNotifIcon = (n) => {
  const t = ((n?.titulo || '') + ' ' + (n?.mensaje || '')).toLowerCase();
  if (/examen|evaluaci[oó]n|parcial/.test(t)) return 'quiz';
  if (/tarea|asignaci[oó]n|entrega/.test(t)) return 'assignment';
  if (/nota|calificaci[oó]n/.test(t)) return 'grade';
  if (/comunicado|aviso|anuncio|semestre/.test(t)) return 'campaign';
  if (/error|urgente/.test(t)) return 'error_outline';
  if (/exito|aprob/.test(t)) return 'check_circle_outline';
  return 'notifications';
};

const _analyzeTone = (n) => {
  const t = ((n?.titulo || '') + ' ' + (n?.mensaje || '')).toLowerCase()
  if (/error|urgente|vencid|fallo|alerta|examen|rechaz/.test(t)) return 'error'
  if (/nota|calificaci|aprob|logro|exito|felicit|complet/.test(t)) return 'success'
  if (/tarea|asignaci|nueva|recordatorio|aviso|info/.test(t)) return 'info'
  return 'default'
}

const showNotifBubble = (n) => {
  notifBubble.value = n
  notifBubbleVisible.value = true
  if (_notifBubbleTimer) clearTimeout(_notifBubbleTimer)
  _notifBubbleTimer = setTimeout(() => { notifBubbleVisible.value = false }, 5000)
}
const hideNotifBubble = () => {
  if (_notifBubbleTimer) { clearTimeout(_notifBubbleTimer); _notifBubbleTimer = null }
  notifBubbleVisible.value = false
}
const openChatFromBubble = () => {
  hideNotifBubble()
  if (!store.isOpen) store.toggle()
}

const notifDetail = ref(null)

const abrirNotifDetalle = () => {
  if (!notifBubble.value) return
  notifDetail.value = notifBubble.value
  notifBubbleVisible.value = false
  if (!store.isOpen) store.toggle()
}

const cerrarNotifDetalle = () => {
  notifDetail.value = null
  if (store.isOpen) store.toggle()
}

const responderNotif = () => {
  if (!inputText.value.trim()) return
  handleSend()
  cerrarNotifDetalle()
}

const handleIslandClick = () => {
  if (store.isOpen) return
  if (notifBubbleVisible.value && notifBubble.value) {
    abrirNotifDetalle()
  } else {
    store.toggle()
  }
}

watch(() => store.isOpen, (isOpen) => {
  nokyState.value = isOpen ? 'working' : 'idle';
  if (isOpen) hideNotifBubble();
});
watch(() => store.pendingNotif, (n) => {
  if (!n) return;
  notifQueue.value.push(n);
  store.clearPendingNotif();
  _processQueue();
});

watch(() => store.messages.length, (newLen, oldLen) => {
  if (nokyState.value === 'dizzy') return;

  if (newLen > oldLen) {
    const lastMsg = store.messages[newLen - 1];
    if (lastMsg.sender === 'user') {
      nokyState.value = 'thinking';
    } else if (lastMsg.sender === 'bot') {
      store.isThinking = false;
      nokyState.value = 'finished';
      Sound.play('finish');
            setTimeout(() => {
        if (nokyState.value === 'finished') nokyState.value = store.isOpen ? 'working' : 'idle';
      }, 3000);
    }
  }
});
</script>

<style scoped>
.island-wrapper { position: fixed; top: 0; left: 50%; transform: translateX(-50%); z-index: 99990; display: flex; justify-content: center; }
#island { position: relative; z-index: 99990; transform: translateZ(0); border-radius: 0 0 16px 16px; overflow: hidden; cursor: pointer; backdrop-filter: blur(24px) saturate(1.25); -webkit-backdrop-filter: blur(24px) saturate(1.25); width: 340px; height: 55px; transition: width 0.55s cubic-bezier(0.34, 1.45, 0.5, 1), height 0.5s cubic-bezier(0.34, 1.3, 0.55, 1), border-radius 0.55s cubic-bezier(0.34, 1.45, 0.5, 1), background 0.35s ease, border-color 0.35s ease, box-shadow 0.3s ease; isolation: isolate; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12); }
#island.expanded { width: 850px; height: 400px; cursor: default; border-radius: 0 0 24px 24px; }
#island.island--light { background: linear-gradient(180deg, rgba(205, 185, 155, 0.12), rgba(205, 185, 155, 0.04)), rgba(238, 224, 200, 0.82); border: 1px solid rgba(74, 7, 18, 0.22); border-top: none; color: #2a1a14; }
#island.island--dark { background: rgba(15, 15, 20, 0.4); border: 1px solid rgba(255, 255, 255, 0.08); border-top: none; color: #f5f6f8; }
#island.has-peek {  }
@keyframes peekPulse { 0% { height: 55px; } 100% { height: 71px; } }
#island.expanded.has-peek { animation: none; }

.island-glow { position: absolute; top: 0; left: 0; width: 300px; height: 100%; background: radial-gradient(circle at 10% 50%, rgba(74, 7, 18, 0.15) 0%, transparent 60%); pointer-events: none; opacity: 0; transition: opacity 0.5s; z-index: 0; }
#island.expanded .island-glow { opacity: 1; }
#island-clip { position: absolute; inset: 0; display: flex; flex-direction: row; z-index: 1; }
.bot-side { width: 80px; height: 100%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.4s; z-index: 2; }
#island.expanded .bot-side { width: 180px; }
.content-side { flex: 1; display: flex; flex-direction: column; position: relative; height: 100%; min-width: 0; }
.content-side > .summary-view,
.content-side > .chat-view,
.content-side > .notif-detail-view {
  animation: contentFade 0.35s ease-out both;
}
@keyframes contentFade {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.summary-view { display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 0 15px 0 0; height: 100%; width: 100%; text-align: center; }
.summary-view .title { font-size: 14px; font-weight: 600; color: #4A0712; }
.island--dark .summary-view .title { color: #F5F6F8; }
.summary-view .subtitle { font-size: 11px; color: #4ade80; margin-top: 2px; }

.chat-view { display: flex; flex-direction: column; height: 100%; width: 100%; z-index: 10; background: transparent; }
.chat-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid rgba(74, 7, 18, 0.15); }
.island--dark .chat-header { border-bottom-color: rgba(255, 255, 255, 0.08); }
.header-title { font-size: 14px; font-weight: 500; color: #4A0712; }
.island--dark .header-title { color: #F5F6F8; }
.icon-btn { background: none; border: none; color: inherit; opacity: 0.6; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: opacity 0.15s; }
.icon-btn:hover { opacity: 1; background: rgba(74, 7, 18, 0.1); }

.chat-body { flex: 1; overflow-y: auto; padding: 24px 20px; display: flex; flex-direction: column; gap: 18px; }
.message { display: flex; max-width: 85%; }
.message.bot { align-self: flex-start; }
.message.user { align-self: flex-end; }
.bubble { padding: 11px 15px; border-radius: 16px; font-size: 13.5px; line-height: 1.55; word-wrap: break-word; letter-spacing: 0.005em; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
.message.bot .bubble { background: rgba(74, 7, 18, 0.06); color: var(--text); border-top-left-radius: 4px; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; border-top-right-radius: 16px; }
.island--dark .message.bot .bubble { background: rgba(255, 255, 255, 0.08); color: #E2E4E9; }
.message.user .bubble { background: #4A0712; color: white; border-top-right-radius: 4px; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; border-top-left-radius: 16px; }

.typing .bubble.dots { display: flex; align-items: center; gap: 4px; padding: 14px 18px; }
.typing .bubble.dots span { width: 6px; height: 6px; background-color: currentColor; opacity: 0.6; border-radius: 50%; animation: bounce-dot 1.2s infinite ease-in-out both; }
.typing .bubble.dots span:nth-child(1) { animation-delay: -0.32s; }
.typing .bubble.dots span:nth-child(2) { animation-delay: -0.16s; }
@keyframes bounce-dot { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

.chat-footer { padding: 14px 20px 18px; border-top: 1px solid rgba(0, 0, 0, 0.08); }
.island--dark .chat-footer { border-top-color: rgba(255, 255, 255, 0.08); }
.chat-bar { display: flex; align-items: flex-end; gap: 8px; background: var(--bg-hover); border: 1px solid var(--border); border-radius: 24px; padding: 8px 8px 8px 18px; transition: border-color 0.2s, box-shadow 0.2s; }
.island--dark .chat-bar { background: rgba(0, 0, 0, 0.3); border-color: rgba(255, 255, 255, 0.15); }
.chat-bar:focus-within { border-color: #4A0712; box-shadow: 0 0 0 3px rgba(74, 7, 18, 0.08); }
.chat-bar textarea { flex: 1; background: none; border: none; color: inherit; font-size: 14px; line-height: 1.5; outline: none; padding: 8px 0; min-height: 22px; max-height: 120px; resize: none; font-family: inherit; overflow-y: auto; }
.chat-bar textarea::placeholder { color: currentColor; opacity: 0.5; }
.send-btn { background: #4A0712; border: none; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #fff; flex-shrink: 0; transition: transform 0.15s; }
.send-btn:hover { transform: scale(1.05); }
.island-backdrop { position: fixed; inset: 0; background: transparent; z-index: 9999999 !important; }

.fab-wrapper { position: fixed; inset: 0; pointer-events: none; z-index: 99990; }
.mobile-fab { position: fixed; bottom: 24px; right: 24px; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; pointer-events: auto; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; touch-action: manipulation; transition: transform 0.15s, box-shadow 0.2s; box-shadow: 0 10px 30px rgba(74, 7, 18, 0.35); overflow: visible; }
.mobile-fab--light { background: rgba(238, 224, 200, 0.85); border: 1px solid rgba(74, 7, 18, 0.15); }
.mobile-fab--dark { background: rgba(15, 15, 20, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); }
.mobile-fab.is-pressed { transform: scale(0.94); }
.press-ring { position: absolute; inset: -6px; border-radius: 50%; border: 2px solid #4A0712; opacity: 0.7; animation: ringPulse 600ms linear forwards; pointer-events: none; }
@keyframes ringPulse { from { transform: scale(1); opacity: 0.85; } to { transform: scale(1.2); opacity: 0; } }
.mobile-chat { position: fixed; inset: 0; display: flex; flex-direction: column; pointer-events: auto; z-index: 999998; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
.mobile-chat--light { background: rgba(238, 224, 200, 0.95); color: #2a1a14; }
.mobile-chat--dark { background: rgba(15, 15, 20, 0.85); color: #f5f6f8; }
.mobile-chat .chat-view { height: 100%; }

.notif-bubble {
  position: absolute;
  min-width: 180px; max-width: 260px;
  padding: 10px 14px;
  border-radius: 14px;
  cursor: pointer;
  pointer-events: auto;
  font-size: 13px; line-height: 1.35;
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  z-index: 999997;
  transition: transform 0.15s;
}
.notif-bubble:hover { transform: translateY(-1px); }
.notif-bubble--light { background: rgba(238,224,200,0.95); color: #2a1a14; border: 1px solid rgba(74,7,18,0.2); }
.notif-bubble--dark  { background: rgba(15,15,20,0.92); color: #f5f6f8; border: 1px solid rgba(255,255,255,0.1); }

.notif-detail-view { display: flex; flex-direction: column; height: 100%; width: 100%; padding: 20px 24px; gap: 14px; color: inherit; }
.notif-detail-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid rgba(74, 7, 18, 0.15); }
.island--dark .notif-detail-header { border-bottom-color: rgba(255, 255, 255, 0.1); }
.notif-detail-title { font-size: 16px; font-weight: 600; }
.notif-detail-body { flex: 1; font-size: 14px; line-height: 1.6; opacity: 0.9; overflow-y: auto; }
.notif-detail-actions { display: flex; justify-content: flex-end; }
.notif-btn { padding: 10px 20px; background: #4A0712; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; transition: transform 0.15s; }
.notif-btn:hover { transform: scale(1.02); }
.notif-detail-reply { display: flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.5); border: 1px solid rgba(74, 7, 18, 0.2); border-radius: 20px; padding: 4px 4px 4px 16px; }
.island--dark .notif-detail-reply { background: rgba(0, 0, 0, 0.3); border-color: rgba(255, 255, 255, 0.15); }
.notif-detail-reply:focus-within { border-color: #4A0712; }
.notif-detail-reply input { flex: 1; background: none; border: none; color: inherit; font-size: 14px; outline: none; padding: 8px 0; }
.notif-detail-reply input::placeholder { color: currentColor; opacity: 0.5; }
.notif-bubble--mobile {
  bottom: 112px; right: 24px;
  animation: notifIn 0.35s ease-out;
}
.notif-bubble__title { font-weight: 600; margin-bottom: 2px; }
.notif-bubble__msg { font-size: 12px; opacity: 0.85; }
.notif-bubble__cta { display: inline-block; margin-top: 4px; font-size: 11px; font-weight: 600; color: #4A0712; }
.notif-bubble--dark .notif-bubble__cta { color: #f5b8c4; }
@keyframes notifIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes notifInD {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

#island { font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }

#island.island--tone-default { --tone-color: #4A0712; }
#island.island--tone-error   { --tone-color: #a01838; }
#island.island--tone-success { --tone-color: #1a7a44; }
#island.island--tone-info    { --tone-color: #1d5aa8; }
#island.island--dark.island--tone-default { --tone-color: #f5b8c4; }
#island.island--dark.island--tone-error   { --tone-color: #ff8fa3; }
#island.island--dark.island--tone-success { --tone-color: #7fe0a0; }
#island.island--dark.island--tone-info    { --tone-color: #8fc4ff; }

#island.island--notif.island--light.island--tone-error {
  background: linear-gradient(180deg, rgba(255,180,180,0.45), rgba(255,210,210,0.15)), rgba(238,224,200,0.85) !important;
  border-color: rgba(160,24,56,0.4) !important;
}
#island.island--notif.island--light.island--tone-success {
  background: linear-gradient(180deg, rgba(180,235,200,0.45), rgba(210,245,220,0.15)), rgba(238,224,200,0.85) !important;
  border-color: rgba(26,122,68,0.35) !important;
}
#island.island--notif.island--light.island--tone-info {
  background: linear-gradient(180deg, rgba(180,215,250,0.45), rgba(210,230,255,0.15)), rgba(238,224,200,0.85) !important;
  border-color: rgba(29,90,168,0.35) !important;
}
#island.island--notif.island--dark.island--tone-error {
  background: linear-gradient(180deg, rgba(160,30,60,0.4), rgba(40,5,15,0.2)), rgba(20,10,15,0.55) !important;
  border-color: rgba(255,80,100,0.42) !important;
}
#island.island--notif.island--dark.island--tone-success {
  background: linear-gradient(180deg, rgba(30,140,80,0.35), rgba(10,40,25,0.2)), rgba(10,20,15,0.55) !important;
  border-color: rgba(80,220,140,0.38) !important;
}
#island.island--notif.island--dark.island--tone-info {
  background: linear-gradient(180deg, rgba(40,110,200,0.36), rgba(10,25,60,0.2)), rgba(10,18,30,0.55) !important;
  border-color: rgba(100,180,255,0.42) !important;
}

.summary-view .title {
  font-size: 15px; font-weight: 700; letter-spacing: -0.015em; line-height: 1.2;
}
.summary-view .subtitle {
  font-size: 12px; font-weight: 500; letter-spacing: 0.005em; line-height: 1.3; margin-top: 3px;
}
#island .summary-view--notif .title {
  font-size: 15px; font-weight: 700; color: var(--tone-color, #4A0712); letter-spacing: -0.015em;
}

.notif-detail-title {
  font-size: 18px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.25;
  color: var(--tone-color, currentColor);
}
.notif-detail-body {
  font-size: 14.5px; font-weight: 400; line-height: 1.7; letter-spacing: 0.005em; opacity: 0.92;
}

.header-title { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
.bubble { font-size: 14px; line-height: 1.55; letter-spacing: 0.005em; padding: 11px 15px; }

.notif-bubble__title { font-size: 14px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.25; }
.notif-bubble__msg   { font-size: 12.5px; font-weight: 400; line-height: 1.45; letter-spacing: 0.005em; }

.island-wrapper {
  pointer-events: none !important;
}
#island {
  pointer-events: auto !important;
  z-index: 9999999 !important;
}
.chat-view, .chat-body, .chat-footer {
  pointer-events: auto !important;
  z-index: 100 !important;
}
.chat-bar input {
  pointer-events: auto !important;
  position: relative;
  z-index: 9999 !important;
  user-select: text !important;
}
.island-backdrop {
  z-index: 999990 !important;
  pointer-events: auto !important;
}

#island .content-side,
#island .chat-view,
#island .chat-footer,
#island .chat-bar {
  pointer-events: auto !important;
  position: relative;
  z-index: 100 !important;
}

#island .chat-bar input {
  pointer-events: auto !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  position: relative;
  z-index: 200 !important;
  cursor: text !important;
}

#island .chat-bar .send-btn {
  pointer-events: auto !important;
  position: relative;
  z-index: 200 !important;
  cursor: pointer !important;
}

#island .chat-bar::before,
#island .chat-bar::after {
  pointer-events: none !important;
}

.chat-body::-webkit-scrollbar { width: 6px; }
.chat-body::-webkit-scrollbar-track { background: transparent; }
.chat-body::-webkit-scrollbar-thumb { background: rgba(74, 7, 18, 0.15); border-radius: 3px; }
.chat-body::-webkit-scrollbar-thumb:hover { background: rgba(74, 7, 18, 0.3); }

.message { animation: msgFadeIn 0.25s ease-out both; }
@keyframes msgFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.message.bot .bubble code {
  background: rgba(0, 0, 0, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 12.5px;
}
.island--dark .message.bot .bubble code {
  background: rgba(255, 255, 255, 0.1);
}
.message.bot .bubble pre {
  background: rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  padding: 10px 12px;
  margin: 8px 0;
  overflow-x: auto;
  font-size: 12.5px;
  line-height: 1.4;
}
.island--dark .message.bot .bubble pre {
  background: rgba(255, 255, 255, 0.06);
}
.message.bot .bubble pre code {
  background: none;
  padding: 0;
  font-size: inherit;
}
.message.bot .bubble strong { font-weight: 700; }
.message.bot .bubble em { font-style: italic; }
.message.bot .bubble ul, .message.bot .bubble ol { margin: 6px 0; padding-left: 20px; }
.message.bot .bubble li { margin: 2px 0; }
.message.bot .bubble p { margin: 4px 0; }
.message.bot .bubble a { color: var(--primary); text-decoration: underline; }

#island:not(.expanded) .bot-side {
  position: absolute !important;
  left: 12px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  width: 44px !important;
  height: 44px !important;
  z-index: 2 !important;
}

#island:not(.expanded) .content-side {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  padding: 0 60px !important;
  z-index: 1 !important;
}

#island:not(.expanded) .summary-view {
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  align-items: center !important;
  width: 100% !important;
  height: 100% !important;
  text-align: center !important;
}

.noky-message {
  font-size: 10px;
  font-weight: 500;
  color: var(--text-muted);
  margin-top: 1px;
  animation: fadeInNokyMsg 0.3s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
@keyframes fadeInNokyMsg {
  from { opacity: 0; transform: translateY(-3px); }
  to { opacity: 1; transform: translateY(0); }
}

.noky-msg-slide {
  animation: nokySlide 0.5s ease-out;
}
@keyframes nokySlide {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}
.noky-msg-shake {
  animation: nokyShake 0.5s ease-in-out;
}
@keyframes nokyShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  50% { transform: translateX(2px); }
  75% { transform: translateX(-2px); }
}

.bubble :deep(p) {
  margin: 0 0 6px 0;
}
.bubble :deep(p:last-child) {
  margin-bottom: 0;
}
.bubble :deep(strong) {
  font-weight: 700;
}
.bubble :deep(em) {
  font-style: italic;
}
.bubble :deep(code) {
  background: rgba(0, 0, 0, 0.12);
  padding: 1px 5px;
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.9em;
}
.bubble :deep(pre) {
  background: #0d1117;
  color: #e6edf3;
  padding: 10px 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
  font-size: 12px;
  line-height: 1.45;
}
.bubble :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
  font-size: inherit;
}
.bubble :deep(ul),
.bubble :deep(ol) {
  margin: 4px 0;
  padding-left: 20px;
}
.bubble :deep(li) {
  margin: 2px 0;
}
.bubble :deep(a) {
  color: #4a90e2;
  text-decoration: underline;
}
.bubble :deep(blockquote) {
  border-left: 3px solid rgba(0, 0, 0, 0.2);
  padding-left: 10px;
  margin: 6px 0;
  opacity: 0.85;
}
.bubble :deep(h1),
.bubble :deep(h2),
.bubble :deep(h3) {
  font-size: 14px;
  font-weight: 700;
  margin: 8px 0 4px;
}
.bubble :deep(hr) {
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.15);
  margin: 8px 0;
}
.bubble :deep(table) {
  border-collapse: collapse;
  margin: 6px 0;
  font-size: 12px;
}
.bubble :deep(th),
.bubble :deep(td) {
  border: 1px solid rgba(0, 0, 0, 0.15);
  padding: 4px 8px;
}

.bubble {
  transition: min-height 0.15s ease-out;
  will-change: contents;
}
.bubble > span:only-child:empty::after {
  content: '▋';
  color: var(--text-muted);
  animation: cursorBlink 1s ease-in-out infinite;
  margin-left: 2px;
}
@keyframes cursorBlink {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

.header-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-icon {
  color: #4A0712;
  opacity: 0.9;
}

.island--dark .header-icon {
  color: #f5b8c4;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-btn {
  background: none;
  border: none;
  color: inherit;
  opacity: 0.6;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
}

.icon-btn:hover {
  opacity: 1;
  background: rgba(74, 7, 18, 0.08);
}

.icon-btn[title="Limpiar chat"]:hover {
  color: #c62828;
  background: rgba(198, 40, 40, 0.1);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.send-btn:not(:disabled):hover {
  transform: scale(1.05);
}

.header-icon {
}
@keyframes sparklePulse {
  0%, 100% { opacity: 0.85; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.08); }
}

.loading-bubble {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 18px !important;
  min-width: 60px;
}
.spinning {
  animation: spinLoader 1s linear infinite;
  color: var(--text-muted);
}
@keyframes spinLoader {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.send-btn {
  background: linear-gradient(135deg, #4A0712 0%, #8B1A2B 100%) !important;
  box-shadow: 0 2px 8px rgba(74, 7, 18, 0.3);
  transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.15s;
}
.send-btn:not(:disabled):hover {
  transform: scale(1.08);
  box-shadow: 0 4px 14px rgba(74, 7, 18, 0.45);
}
.send-btn:not(:disabled):active {
  transform: scale(0.96);
}
.send-btn:disabled {
  background: rgba(74, 7, 18, 0.3) !important;
  box-shadow: none;
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-btn svg,
.send-btn svg,
.header-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.icon-btn {
  transition: opacity 0.15s, background 0.15s, color 0.15s, transform 0.1s;
}
.icon-btn:active {
  transform: scale(0.92);
}

</style>
